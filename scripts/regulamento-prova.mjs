// Prova de aceite de /regulamento/ (regra 27) — o que o lh/fouc/cls/console
// não cobrem:
//
//   node scripts/regulamento-prova.mjs [rotulo] [--sem-wp]
//
// 1. axe-core (node_modules/axe-core) em 390, 1366 e 1366 a 200% de zoom
//    (viewport 683 com DPR 2): zero violações.
// 2. Terceiros ANTES DE INTERAÇÃO: carga em 390 e 1474 SEM bloquear nada,
//    8s parada, sem input. Rastreador (GTM, Meta, Zendesk, Hotjar, RD,
//    Reclame Aqui) = reprova. Biblioteca de CDN (unpkg/ionicons, que a home
//    carrega do mesmo jeito) é listada à parte.
// 3. Teclado: o skip link é o primeiro Tab e aparece; sumário, âncoras e
//    links do texto têm foco visível (outline computado no :focus-visible).
// 4. prefers-reduced-motion (rolagem não suave) e prefers-contrast: more
//    (bordas reforçadas).
// 5. Impressão: PDF A4 em shots/regulamento-<rotulo>/regulamento.pdf;
//    nav/rodapé/sumário somem, o cabeçalho de impressão aparece, link
//    externo leva a URL entre parênteses.
// 6. Shots nas 7 larguras (320, 390, 768, 1079, 1280, 1366, 1920) — topo e
//    a Tabela 01 — e em 1366 a 200%; e, sem --sem-wp, o lado a lado
//    WordPress × página nova em 390, 1366 e 1920 (topo e Tabela 01).
//
// Saída: medidas/regulamento-prova-<rotulo>.json + shots/regulamento-<rotulo>/.
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const SEM_WP = argv.includes('--sem-wp');
const rotulo = argv.find((a) => !a.startsWith('--')) || 'atual';
const PASTA = path.join(RAIZ, 'shots', `regulamento-${rotulo}`);
fs.mkdirSync(PASTA, { recursive: true });
const AXE = fs.readFileSync(path.join(RAIZ, 'node_modules/axe-core/axe.min.js'), 'utf8');
const URL_WP = 'https://zero7.com.br/regulamento/';
const RASTREADORES = /googletagmanager|google-analytics|doubleclick|facebook\.net|connect\.facebook|fbcdn|hotjar|rdstation|zdassets|zendesk|reclameaqui|raichu/i;
const LARGURAS = [320, 390, 768, 1079, 1280, 1366, 1920];

const servidor = await iniciarServidor(RAIZ);
const URL_PAG = new URL('/regulamento/index.html', servidor.url).href;
const ORIGEM = new URL(servidor.url).origin;
const nav = await chromium.launch();
const r = { rotulo, quando: new Date().toISOString() };
const reprova = [];
const ctxDe = (w, extra = {}) => {
  const movel = w < 1080;
  return nav.newContext({ viewport: { width: w, height: movel ? 844 : 900 }, deviceScaleFactor: movel ? 2 : 1, isMobile: movel, hasTouch: movel, locale: 'pt-BR', ...extra });
};
const bloquearTerceiros = (ctx) => ctx.route((u) => !u.href.startsWith(ORIGEM) && !/unpkg\.com\/ionicons/.test(u.href), (rt) => rt.abort());

/* 1. axe */
r.axe = {};
for (const [nome, w, extra] of [['390', 390, {}], ['1366', 1366, {}], ['1366-zoom200', 683, { viewport: { width: 683, height: 450 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false }]]) {
  const ctx = await ctxDe(w, extra);
  await bloquearTerceiros(ctx);
  const p = await ctx.newPage();
  await p.goto(URL_PAG, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.addScriptTag({ content: AXE });
  const v = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((x) => ({ id: x.id, impacto: x.impact, nos: x.nodes.map((n) => n.target.join(' ')).slice(0, 4) })));
  r.axe[nome] = v;
  if (v.length) reprova.push(`axe ${nome}: ${v.map((x) => x.id).join(', ')}`);
  console.log(`axe ${nome}: ${v.length ? v.map((x) => `${x.id} (${x.nos.length})`).join(', ') : '0 violações'}`);
  await ctx.close();
}

/* 2. terceiros antes de interação */
r.terceiros = {};
for (const w of [390, 1474]) {
  const ctx = await ctxDe(w);
  const p = await ctx.newPage();
  const fora = [];
  p.on('request', (q) => { if (!q.url().startsWith(ORIGEM) && !q.url().startsWith('data:')) fora.push(q.url()); });
  await p.goto(URL_PAG, { waitUntil: 'load' });
  await p.waitForTimeout(8000);
  const rastreio = fora.filter((u) => RASTREADORES.test(u));
  const cdn = [...new Set(fora.filter((u) => !RASTREADORES.test(u)).map((u) => new URL(u).host + new URL(u).pathname.split('/').slice(0, 3).join('/')))];
  r.terceiros[w] = { rastreadores: rastreio, outros: fora.filter((u) => !RASTREADORES.test(u)) };
  if (rastreio.length) reprova.push(`rastreador antes de interação em ${w}: ${rastreio[0]}`);
  console.log(`terceiros ${w} (8s sem interação): rastreadores ${rastreio.length} | outros ${fora.length - rastreio.length} req (${cdn.join(', ') || '—'})`);
  await ctx.close();
}

/* 3. teclado e foco visível */
{
  const ctx = await ctxDe(1366);
  await bloquearTerceiros(ctx);
  const p = await ctx.newPage();
  await p.goto(URL_PAG, { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await p.keyboard.press('Tab');
  const pular = await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { classe: a.className, visivel: r.width > 20 && r.height > 20 }; });
  const focoDe = async (sel) => {
    await p.evaluate((s) => { const el = document.querySelector(s); el.scrollIntoView({ block: 'center' }); }, sel);
    await p.focus(sel);
    await p.keyboard.press('Shift+Tab');
    await p.keyboard.press('Tab');
    return p.evaluate((s) => { const el = document.querySelector(s); const cs = getComputedStyle(el); return { focado: document.activeElement === el, outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }; }, sel);
  };
  r.teclado = {
    pular,
    sumario: await focoDe('.reg-sumario-lista a[href="#regulamento-03-inscricao-e-pagamento"]'),
    ancora: await focoDe('.reg-ancora[href="#regulamento-04-processo-de-avaliacao"]'),
    linkTexto: await focoDe('.regulamento p a'),
    tabela: await focoDe('#tabela-01'),
  };
  for (const [k, v] of Object.entries(r.teclado)) {
    const ok = k === 'pular' ? (v.classe === 'reg-pular' && v.visivel) : (v.focado && v.outline);
    if (!ok) reprova.push(`teclado: ${k} ${JSON.stringify(v)}`);
  }
  console.log(`teclado: ${Object.entries(r.teclado).map(([k, v]) => `${k} ${k === 'pular' ? (v.visivel ? 'aparece no 1º Tab' : 'NÃO aparece') : (v.focado && v.outline ? 'foco visível' : 'SEM foco visível')}`).join(' | ')}`);
  await ctx.close();
}

/* 4. preferências do sistema */
{
  const ctx = await ctxDe(1366, { reducedMotion: 'reduce' });
  await bloquearTerceiros(ctx);
  const p = await ctx.newPage();
  await p.goto(URL_PAG, { waitUntil: 'load' });
  const reduzido = await p.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  const normal = await p.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  let contraste = null;
  try {
    const antes = await p.evaluate(() => getComputedStyle(document.querySelector('.reg-tabela')).borderTopColor);
    await p.emulateMedia({ contrast: 'more' });
    const depois = await p.evaluate(() => getComputedStyle(document.querySelector('.reg-tabela')).borderTopColor);
    contraste = { antes, depois, reforcou: antes !== depois };
  } catch (e) { contraste = { erro: String(e.message).slice(0, 80) }; }
  r.preferencias = { rolagemComReducao: reduzido, rolagemSem: normal, contraste };
  if (reduzido !== 'auto' || normal !== 'smooth') reprova.push(`reduced-motion: ${reduzido}/${normal}`);
  if (contraste && contraste.reforcou === false) reprova.push('prefers-contrast: more não reforçou as bordas');
  console.log(`movimento reduzido: rolagem ${reduzido} (sem preferência: ${normal}) | contraste reforçado: ${contraste?.reforcou ? `borda ${contraste.antes} → ${contraste.depois}` : JSON.stringify(contraste)}`);
  await ctx.close();
}

/* 5. impressão */
{
  const ctx = await ctxDe(1366);
  await bloquearTerceiros(ctx);
  const p = await ctx.newPage();
  await p.goto(URL_PAG, { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await p.emulateMedia({ media: 'print' });
  const imp = await p.evaluate(() => {
    const vis = (s) => { const el = document.querySelector(s); return !!el && getComputedStyle(el).display !== 'none'; };
    const a = document.querySelector('.regulamento a[href^="http"]');
    return {
      nav: vis('#navigation'), rodape: vis('#footer'), sumario: vis('.reg-sumario'), sumarioMovel: vis('.reg-sumario-movel'),
      cabecalho: vis('.reg-impressao') ? document.querySelector('.reg-impressao').textContent : null,
      urlNoLink: getComputedStyle(a, '::after').content,
    };
  });
  await p.pdf({ path: path.join(PASTA, 'regulamento.pdf'), format: 'A4', printBackground: true });
  await p.screenshot({ path: path.join(PASTA, 'impressao-topo.png') });
  r.impressao = imp;
  const okImp = !imp.nav && !imp.rodape && !imp.sumario && !imp.sumarioMovel && /atualizado em/.test(imp.cabecalho || '') && /attr|http/.test(imp.urlNoLink);
  if (!okImp) reprova.push(`impressão: ${JSON.stringify(imp)}`);
  const pdfKB = Math.round(fs.statSync(path.join(PASTA, 'regulamento.pdf')).size / 1024);
  console.log(`impressão: nav/rodapé/sumário ${imp.nav || imp.rodape || imp.sumario || imp.sumarioMovel ? 'APARECEM' : 'somem'} | cabeçalho "${imp.cabecalho}" | link ${imp.urlNoLink.slice(0, 40)} | PDF ${pdfKB}KB`);
  await ctx.close();
}

/* 6. shots: 7 larguras + 200% e o lado a lado com o WP */
const fotografar = async (url, w, saida, { extra = {}, wp = false } = {}) => {
  const ctx = await ctxDe(w, { reducedMotion: 'reduce', ...extra });
  if (!wp) await bloquearTerceiros(ctx);
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: wp ? 'networkidle' : 'load', timeout: 90_000 }).catch(() => {});
  await p.waitForTimeout(wp ? 2500 : 1200);
  await p.screenshot({ path: `${saida}-topo.png` });
  // a Tabela 01 (na nova: #tabela-01; no WP: a tabela depois do "Tabela 01")
  const alvo = wp
    ? await p.evaluateHandle(() => { const b = [...document.querySelectorAll('b,strong')].find((x) => x.textContent.trim() === 'Tabela 01'); let el = b; while (el && !el.nextElementSibling?.matches?.('table') && el.parentElement) { const t = el.parentElement.querySelector('table'); if (t) return t; el = el.parentElement; } return document.querySelector('table'); })
    : await p.$('#tabela-01');
  if (alvo) {
    await p.evaluate((el) => { el.scrollIntoView({ block: 'center' }); }, alvo);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${saida}-tabela.png` });
  }
  await ctx.close();
};
for (const w of LARGURAS) await fotografar(URL_PAG, w, path.join(PASTA, `nova-${w}`));
await fotografar(URL_PAG, 683, path.join(PASTA, 'nova-1366-zoom200'), { extra: { viewport: { width: 683, height: 450 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false } });
console.log(`shots: ${LARGURAS.join(', ')} e 1366 a 200% (topo + Tabela 01) em ${path.relative(RAIZ, PASTA)}`);

if (!SEM_WP) {
  const ladoALado = async (a, b, saida) => {
    const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
    const h = Math.max(ma.height, mb.height);
    const rotuloSvg = (txt, w) => Buffer.from(`<svg width="${w}" height="44" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><text x="16" y="29" font-family="Arial" font-size="20" fill="#fff">${txt}</text></svg>`);
    await sharp({ create: { width: ma.width + mb.width + 24, height: h + 44, channels: 3, background: '#666' } })
      .composite([
        { input: rotuloSvg('WordPress (zero7.com.br/regulamento)', ma.width), left: 0, top: 0 }, { input: a, left: 0, top: 44 },
        { input: rotuloSvg('Nova (/home/regulamento/)', mb.width), left: ma.width + 24, top: 0 }, { input: b, left: ma.width + 24, top: 44 },
      ]).png().toFile(saida);
  };
  for (const w of [390, 1366, 1920]) {
    if (!LARGURAS.includes(w)) await fotografar(URL_PAG, w, path.join(PASTA, `nova-${w}`));
    await fotografar(URL_WP, w, path.join(PASTA, `wp-${w}`), { wp: true });
    for (const parte of ['topo', 'tabela']) {
      const a = path.join(PASTA, `wp-${w}-${parte}.png`), b = path.join(PASTA, `nova-${w}-${parte}.png`);
      if (fs.existsSync(a) && fs.existsSync(b)) await ladoALado(a, b, path.join(PASTA, `wp-x-nova-${w}-${parte}.png`));
    }
  }
  console.log(`lado a lado WP × nova: ${path.relative(RAIZ, PASTA)}/wp-x-nova-{390,1366,1920}-{topo,tabela}.png`);
}

await nav.close();
await servidor.fechar();
r.reprova = reprova;
fs.writeFileSync(path.join(RAIZ, 'medidas', `regulamento-prova-${rotulo}.json`), JSON.stringify(r, null, 1));
console.log(reprova.length ? `\nREPROVADO (${reprova.length}): ${reprova.join(' | ')}` : '\nprova do regulamento: tudo dentro da régua');
process.exitCode = reprova.length ? 1 : 0;
