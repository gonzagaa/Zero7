// Aceites do E1 (fontes: hero no frame 1, completas pós-load).
//
//   node scripts/e1-prova.mjs [raiz]
//
// Nas duas viewports do protocolo, rede lenta (150ms/1,6Mbps/CPU 4×),
// cache frio, TRÊS cargas por passada:
//
// Passada 1 (sem scroll):
//   a) o h1 pinta na fonte da marca no FCP (família computada +
//      document.fonts.check com o texto real, num rAF após o FCP);
//   b) NENHUMA requisição de .sub.woff2 começa antes do LCP observado
//      (Resource Timing × última entrada de LCP);
//   c) depois do load + injeção: TODO caractere visível renderiza da
//      webfont (fonts.check por elemento com texto, família própria);
//   d) CLS de carga (soma de layout-shift, SEM filtrar hadRecentInput —
//      o Chrome marca a flag sem input nenhum e o Lighthouse a ignora).
//
// Passada 2 (a régua da troca abaixo da dobra): scroll programático até
// #depoimentos no DOMContentLoaded — ANTES do load, com as completas
// ainda por chegar — e o CLS soma até load+4s. É o pior caso do swap
// fallback→completa acontecendo DENTRO do viewport.
//
// Compare com a mesma sonda rodada na raiz do commit anterior (aceite:
// CLS ≤ baseline nas duas viewports).
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';

const RAIZ = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORTS = [
  { w: 390, h: 844, dpr: 3, mob: true },
  { w: 1474, h: 900, dpr: 1, mob: false },
];
const N = 3;

const sensores = () => {
  window.__p = { fcpH1: null, lcpT: null, shifts: [], subs: [] };
  new PerformanceObserver((l) => {
    if (!l.getEntries().some((e) => e.name === 'first-contentful-paint')) return;
    requestAnimationFrame(() => {
      const h1 = document.querySelector('h1');
      if (!h1) { window.__p.fcpH1 = { erro: 'sem h1' }; return; }
      const cs = getComputedStyle(h1);
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      window.__p.fcpH1 = {
        fam,
        checa: document.fonts.check(`${cs.fontWeight} ${cs.fontSize} "${fam}"`, h1.textContent.trim().slice(0, 20)),
      };
    });
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__p.lcpT = e.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__p.shifts.push({ t: Math.round(e.startTime), v: e.value, input: e.hadRecentInput });
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (/sub\.woff2/.test(e.name)) window.__p.subs.push({ url: decodeURIComponent(e.name.split('/').pop().split('?')[0]), inicio: Math.round(e.startTime) });
  }).observe({ type: 'resource', buffered: true });
};

const todoCaractereWebfont = () => {
  const falhas = [];
  for (const el of document.querySelectorAll('body *')) {
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!texto) continue;
    const cs = getComputedStyle(el);
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (!/NCS Radhiumz|TT Fors Trial/.test(fam)) continue; // ícones de vendor etc.
    // uppercase: o CSS aplica text-transform e o glifo renderizado é o da
    // caixa alta — o check precisa cobrir as duas
    const amostra = (texto + texto.toUpperCase()).slice(0, 400);
    if (!document.fonts.check(`${cs.fontWeight} 16px "${fam}"`, amostra)) {
      falhas.push({ el: el.tagName + '.' + String(el.className || '').split(' ')[0], fam, peso: cs.fontWeight, texto: texto.slice(0, 40) });
      if (falhas.length >= 5) break;
    }
  }
  return falhas;
};

async function carga(nav, vp, { rolar }) {
  const ctx = await nav.newContext({
    viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: vp.dpr,
    isMobile: vp.mob, hasTouch: vp.mob,
  });
  await ctx.addInitScript(sensores);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (rolar) {
    p.on('domcontentloaded', () => {
      p.evaluate(() => document.getElementById('depoimentos')?.scrollIntoView()).catch(() => {});
    });
  }
  await p.goto(servidor.url, { waitUntil: 'load', timeout: 180_000 });
  await p.waitForTimeout(4000); // injeção no load + download das completas no lento
  const dados = await p.evaluate(() => window.__p);
  const falhasFonte = rolar ? [] : await p.evaluate(todoCaractereWebfont);
  await ctx.close();
  return { ...dados, falhasFonte, cls: dados.shifts.reduce((a, s) => a + s.v, 0) };
}

const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

for (const vp of VIEWPORTS) {
  for (const rolar of [false, true]) {
    const cargas = [];
    for (let i = 0; i < N; i++) cargas.push(await carga(nav, vp, { rolar }));
    const rotulo = `${vp.w}px ${rolar ? 'COM scroll pré-load' : 'sem scroll'}`;
    const clsMed = med(cargas.map((c) => c.cls));
    console.log(`\n== ${rotulo}: CLS ${clsMed.toFixed(4)} (${Math.min(...cargas.map((c) => c.cls)).toFixed(4)}–${Math.max(...cargas.map((c) => c.cls)).toFixed(4)})`);
    if (!rolar) {
      const c0 = cargas[0];
      console.log('   h1 no FCP:', JSON.stringify(c0.fcpH1));
      for (const c of cargas) {
        const antesDoLcp = c.subs.filter((s) => c.lcpT !== null && s.inicio < c.lcpT);
        console.log(`   LCP ${Math.round(c.lcpT)}ms | .sub iniciadas: ${c.subs.length} (primeira: ${c.subs[0] ? c.subs[0].inicio + 'ms' : '—'}) | ANTES do LCP: ${antesDoLcp.length}${antesDoLcp.length ? '  ✗ ' + JSON.stringify(antesDoLcp) : '  ✓'}`);
      }
      const falhas = cargas.flatMap((c) => c.falhasFonte);
      console.log('   caracteres fora da webfont após o load:', falhas.length ? JSON.stringify(falhas.slice(0, 5)) : 'nenhum ✓');
    }
  }
}
await nav.close();
await servidor.fechar();
