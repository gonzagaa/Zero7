// Verificação pós-deploy contra a URL REAL. Só GETs de leitura; NUNCA
// abre pedido-registrado/* (dispararia conversão de verdade no Meta).
//
//   node scripts/producao.mjs https://zero7.com.br/home/
//
// Confere, nesta ordem:
//   1. brotli em HTML/CSS/JS (Content-Encoding: br);
//   2. Cache-Control immutable em dist/ e nas fontes, no-store ausente
//      onde não deve (o HTML pode vir no-store DA ORIGEM — vem de cima
//      do /home/, registrado no manifesto — só reporta);
//   3. cada woff2 baixado UMA vez na carga (CDP, sem cache);
//   4. h1 na fonte da marca no FCP (família computada + fonts.check);
//   5. ZERO requisições de GTM/Meta/Zendesk antes de qualquer interação
//      (6s parado) e Zendesk aparecendo depois de rolar além do herói;
//   6. nenhum erro de console;
//   7. PSI API, mobile e desktop, 3 execuções com MEDIANA (a API pública
//      do PageSpeed, sem chave; se estourar cota, roda de novo depois).
import { chromium } from 'playwright';

const URL_ALVO = process.argv[2];
if (!URL_ALVO || !/^https:\/\//.test(URL_ALVO)) {
  console.error('uso: node scripts/producao.mjs https://zero7.com.br/home/');
  process.exit(1);
}
if (/pedido-registrado/.test(URL_ALVO)) {
  console.error('NUNCA aponte esta sonda para pedido-registrado/* (conversão real).');
  process.exit(1);
}

const RASTREADORES = /googletagmanager|google-analytics|doubleclick|facebook|connect\.facebook|hotjar|rdstation|zdassets|zendesk/i;
const ZENDESK = /zdassets|zendesk/i;
let falhas = 0;
const ok = (cond, rotulo, extra = '') => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${rotulo}${extra ? ' — ' + extra : ''}`);
  if (!cond) falhas++;
};

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  window.__fcpH1 = null;
  new PerformanceObserver((l) => {
    if (!l.getEntries().some((e) => e.name === 'first-contentful-paint')) return;
    requestAnimationFrame(() => {
      const h1 = document.querySelector('h1');
      if (!h1) { window.__fcpH1 = { erro: 'sem h1' }; return; }
      const cs = getComputedStyle(h1);
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      window.__fcpH1 = { fam, checa: document.fonts.check(`${cs.fontWeight} ${cs.fontSize} "${fam}"`, h1.textContent.trim().slice(0, 20)) };
    });
  }).observe({ type: 'paint', buffered: true });
});
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

const respostas = [];   // { url, status, enc, cache, tipo }
const woff2 = new Map(); // url -> vezes na rede
const rastreadores = []; // { url, t }
const erros = [];
let t0 = Date.now();
cdp.on('Network.responseReceived', (e) => {
  const r = e.response;
  respostas.push({ url: r.url, status: r.status, enc: (r.headers['content-encoding'] || r.headers['Content-Encoding'] || ''), cache: (r.headers['cache-control'] || r.headers['Cache-Control'] || ''), tipo: e.type });
  if (/\.woff2/.test(r.url) && !r.fromDiskCache) woff2.set(r.url, (woff2.get(r.url) || 0) + 1);
});
cdp.on('Network.requestWillBeSent', (e) => {
  if (RASTREADORES.test(e.request.url)) rastreadores.push({ url: e.request.url, t: Date.now() - t0 });
});
p.on('pageerror', (e) => erros.push(String(e).split('\n')[0].slice(0, 140)));

console.log('carregando ' + URL_ALVO + ' (390, cache frio, SEM interação)…');
t0 = Date.now();
await p.goto(URL_ALVO, { waitUntil: 'load', timeout: 120_000 });

/* 5a: seis segundos PARADO — nada de rastreador pode aparecer */
await p.waitForTimeout(6000);
const antesDeInteragir = rastreadores.length;
ok(antesDeInteragir === 0, 'zero GTM/Meta/Zendesk antes de interação',
  antesDeInteragir ? rastreadores.slice(0, 3).map((r) => new URL(r.url).hostname + '@' + r.t + 'ms').join(', ') : '6s parado');

/* 1: brotli no que é texto */
const html = respostas.find((r) => r.url.replace(/\/$/, '') === URL_ALVO.replace(/\/$/, '') || r.tipo === 'Document');
const css = respostas.find((r) => /dist\/home\..*\.css/.test(r.url));
const js = respostas.find((r) => /dist\/script\/.*\.js/.test(r.url));
ok(html && html.enc === 'br', 'HTML em brotli', html ? (html.enc || 'sem encoding') : 'não visto');
ok(css && css.enc === 'br', 'CSS (bundle) em brotli', css ? (css.enc || 'sem encoding') : 'não visto');
ok(js && js.enc === 'br', 'JS (dist) em brotli', js ? (js.enc || 'sem encoding') : 'não visto');

/* 2: cache immutable em dist/ e fontes; HTML reportado */
const semImmutable = respostas.filter((r) => (/\/dist\//.test(r.url) || /\.woff2/.test(r.url)) && r.status === 200 && !/immutable/.test(r.cache));
ok(semImmutable.length === 0, 'Cache-Control immutable em dist/ e fontes',
  semImmutable.slice(0, 3).map((r) => r.url.split('/').pop().split('?')[0] + ' [' + (r.cache || 'vazio') + ']').join(', '));
console.log('  · HTML Cache-Control: "' + (html ? html.cache : '?') + '" (o no-store vem de cima do /home/ — manifesto)');

/* 3: cada woff2 uma vez */
const repetidos = [...woff2.entries()].filter(([, n]) => n > 1);
ok(woff2.size > 0 && repetidos.length === 0, `cada woff2 na rede uma vez (${woff2.size} fontes)`,
  repetidos.map(([u, n]) => decodeURIComponent(u.split('/').pop().split('?')[0]) + '×' + n).join(', '));

/* 4: marca no FCP */
const fcpH1 = await p.evaluate(() => window.__fcpH1);
ok(!!fcpH1 && fcpH1.checa === true && /NCS/i.test(fcpH1.fam || ''), 'h1 na fonte da marca no FCP', JSON.stringify(fcpH1));

/* 6: console limpo (antes da interação) */
ok(erros.length === 0, 'sem erro de console', erros.slice(0, 3).join(' | '));

/* 5b: interage (toque + rolagem até depois do herói) — GTM pode entrar
   agora; Zendesk quando o #ba se aproxima */
await p.touchscreen.tap(200, 400);
await p.evaluate(async () => {
  const ba = document.getElementById('ba');
  const alvo = ba ? ba.getBoundingClientRect().top + scrollY : innerHeight * 4;
  for (let y = 0; y <= alvo; y += Math.round(innerHeight * 0.7)) {
    scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
});
await p.waitForTimeout(5000);
const zendeskDepois = rastreadores.some((r) => ZENDESK.test(r.url));
ok(zendeskDepois, 'Zendesk aparece depois de rolar além do herói', zendeskDepois ? '' : 'nenhuma requisição zdassets/zendesk');
ok(erros.length === 0, 'console segue limpo após interação', erros.slice(0, 3).join(' | '));

await nav.close();

/* 7: PSI API, 3× cada, mediana. Sem chave a cota pública estoura fácil
   (medido); crie uma em console.cloud.google.com (PageSpeed Insights
   API) e rode com PSI_KEY=... na frente. */
const CHAVE = process.env.PSI_KEY ? '&key=' + process.env.PSI_KEY : '';
if (!CHAVE) console.log('  · sem PSI_KEY no ambiente — a cota anônima da API costuma estourar');
const mediana = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const strategy of ['mobile', 'desktop']) {
  const notas = [];
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + encodeURIComponent(URL_ALVO) + '&strategy=' + strategy + '&category=performance' + CHAVE);
      const j = await r.json();
      const nota = j.lighthouseResult && Math.round(j.lighthouseResult.categories.performance.score * 100);
      if (typeof nota === 'number') notas.push(nota);
      else console.log('  · PSI ' + strategy + ' ' + (i + 1) + ': sem nota (' + (j.error ? j.error.message.slice(0, 60) : '?') + ')');
    } catch (e) { console.log('  · PSI ' + strategy + ' ' + (i + 1) + ': ' + String(e).slice(0, 60)); }
  }
  if (notas.length) console.log(`  PSI ${strategy}: mediana ${mediana(notas)} (${notas.join(', ')})`);
  else { console.log(`  ✗ PSI ${strategy}: nenhuma execução completou`); falhas++; }
}

console.log(falhas ? `\nREPROVADO: ${falhas} item(ns) acima.` : '\nTudo verde.');
process.exitCode = falhas ? 1 : 0;
