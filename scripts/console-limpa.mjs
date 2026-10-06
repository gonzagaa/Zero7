// Erro de console em carga REPROVA (lote F, F1).
//
//   node scripts/console-limpa.mjs
//
// A lição que criou esta sonda: um ponto-e-vírgula faltando no global.js
// (cbd4352, lote B) virou `window.zero7ArmarAnimacoes()(() => {…})` — o
// retorno undefined chamado como função — e o TypeError matou TODO o
// resto do arquivo: rotator do h1, os `new Swiper` e o modal de
// depoimentos ficaram mortos por QUATRO LOTES sem nenhuma sonda acusar,
// porque cada bloco morto falha em silêncio e os retratos comparavam
// dois estados igualmente quebrados.
//
// Aqui: carga nas duas viewports do protocolo + rolagem até o rodapé +
// um clique num .depoimento (o modal era um dos mortos). QUALQUER
// pageerror (TypeError, ReferenceError, o que for) reprova, na carga ou
// na interação. Terceiros ficam bloqueados como no resto do harness —
// erro de script de terceiro não é nosso para consertar nem para
// mascarar os nossos.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { prepararContexto } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
let falhou = false;

for (const vp of [{ w: 390, h: 844, mob: true }, { w: 1474, h: 900, mob: false }]) {
  const ctx = await nav.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.mob ? 3 : 1, isMobile: vp.mob, hasTouch: vp.mob,
  });
  await prepararContexto(ctx);
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(String(e).split('\n')[0].slice(0, 160)));
  await p.goto(servidor.url, { waitUntil: 'load', timeout: 120_000 });
  await p.waitForTimeout(2500);

  // rolagem até o rodapé: dispara observers, lazies e handlers de scroll
  await p.evaluate(async () => {
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.8)) {
      window.scrollTo(0, y);
      await espera(80);
    }
    window.scrollTo(0, 0);
    await espera(300);
  });

  // interação de amostra: o modal de depoimentos (um dos mortos do cbd4352)
  const depo = p.locator('.depoimento').first();
  if (await depo.count()) {
    await depo.scrollIntoViewIfNeeded().catch(() => {});
    await depo.click({ timeout: 5000 }).catch((e) => erros.push('clique no .depoimento falhou: ' + String(e).split('\n')[0].slice(0, 100)));
    await p.waitForTimeout(500);
    const abriu = await p.evaluate(() => {
      const m = document.getElementById('modalDepoimentos');
      return !!m && getComputedStyle(m).display !== 'none';
    });
    if (!abriu) erros.push('modal de depoimentos não abriu no clique');
    await p.keyboard.press('Escape').catch(() => {});
  }

  await p.waitForTimeout(500);
  const ok = erros.length === 0;
  if (!ok) falhou = true;
  console.log(`${vp.w}px: ${ok ? 'console limpo, modal ok' : 'REPROVADO'}${erros.length ? '\n  - ' + erros.join('\n  - ') : ''}`);
  await ctx.close();
}

await nav.close();
await servidor.fechar();
process.exitCode = falhou ? 1 : 0;
