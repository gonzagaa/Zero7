// GTM só na interação (C5): o contrato que este juiz cobra.
//   node scripts/b5-prova.mjs
// 1) SEM interação: ZERO requisições de tag (googletagmanager, GA, Meta,
//    hotjar, rdstation) em 6s de página parada, nas duas larguras.
// 2) COM interação (um toque): as tags entram; o push feito ANTES no
//    dataLayer aparece processado no container; ?gclid=teste123 vira
//    cookie _gcl_aw; a ordem do dataLayer preserva o push antes dos gtm.*.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const TAGS = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|connect\.facebook\.net|hotjar|rdstation|d335luupugsy2/;
let falhou = false;

for (const L of [390, 1474]) {
  const ctx = await nav.newContext({ viewport: { width: L, height: L >= 1080 ? 900 : 844 }, isMobile: L < 1080, hasTouch: L < 1080 });
  await ctx.addInitScript(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'teste_c5_antes', origem: 'sonda' });
  });
  const p = await ctx.newPage();
  const tags = [];
  p.on('request', (r) => { if (TAGS.test(r.url())) tags.push(r.url().split('/')[2]); });
  await p.goto(servidor.url + '?gclid=teste123', { waitUntil: 'load', timeout: 120_000 });
  await p.waitForTimeout(6000);
  const semInteracao = tags.length;
  // interação: um toque/clique neutro no herói
  if (L < 1080) await p.touchscreen.tap(30, 300); else await p.mouse.click(30, 300);
  await p.waitForTimeout(5000);
  const d = await p.evaluate(() => ({
    processado: (() => { try { return window.google_tag_manager['GTM-KCJQPMC'].dataLayer.get('origem'); } catch (e) { return 'ERRO'; } })(),
    eventos: (window.dataLayer || []).map((x) => x.event || Object.keys(x)[0]).slice(0, 8),
    gcl: document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter((n) => /^_gcl/.test(n)),
  }));
  const ok = semInteracao === 0 && tags.length > 0 && d.processado === 'sonda' && d.gcl.includes('_gcl_aw') && d.eventos[0] === 'teste_c5_antes';
  if (!ok) falhou = true;
  console.log(`${L}: sem interação ${semInteracao} reqs | pós-toque ${[...new Set(tags)].join(',')} | push processado: ${d.processado} | gcl: ${d.gcl.join(',')} | ordem: ${d.eventos.join('->')}  ${ok ? 'OK' : 'FALHOU'}`);
  await ctx.close();
}
await nav.close();
await servidor.fechar();
process.exitCode = falhou ? 1 : 0;
