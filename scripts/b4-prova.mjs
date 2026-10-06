// B4: os quatro aceites.
import { chromium } from 'playwright';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();

// 1) celular/tablet: nenhuma requisição de lib + nenhum nó visível com opacity 0
for (const L of [390, 768]) {
  const ctx = await nav.newContext({ viewport: { width: L, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const libs = [];
  p.on('request', (r) => { if (/gsap|ScrollTrigger|aos\.js/i.test(r.url())) libs.push(r.url().split('/').pop()); });
  await p.goto(servidor.url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(3500);
  const invisiveis = await p.evaluate(() => {
    const ruins = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const cs = getComputedStyle(el);
      if (Number(cs.opacity) === 0 && cs.display !== 'none' && el.textContent.trim() && !el.closest('#faqModal, dialog, .popupOverlay, iframe')) {
        ruins.push(el.tagName + '.' + String(el.className).split(' ')[0]);
      }
    }
    return [...new Set(ruins)].slice(0, 10);
  });
  console.log(`${L}: libs pedidas: ${libs.length ? libs.join(',') : 'NENHUMA'} | nós com opacity 0: ${invisiveis.length ? invisiveis.join(' ') : 'ZERO'}`);
  await ctx.close();
}

// 2) desktop: reveals abaixo da dobra funcionam + primeira tela não muda
//    quando a classe .anim entra (frame antes x depois, acima da dobra)
for (const L of [1474, 1920]) {
  const ctx = await nav.newContext({ viewport: { width: L, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(servidor.url, { waitUntil: 'load', timeout: 120000 });
  // frame ANTES da classe (as libs entram pós-LCP; corremos para capturar antes)
  const temAnim = await p.evaluate(() => document.documentElement.classList.contains('anim'));
  const antes = await p.screenshot();
  await p.waitForFunction(() => document.documentElement.classList.contains('anim'), null, { timeout: 15000 });
  await p.waitForTimeout(1600); // AOS/entradas do que estivesse animando
  const depois = await p.screenshot();
  const A = await sharp(antes).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(depois).raw().toBuffer({ resolveWithObject: true });
  let dif = 0; const px = A.info.width * A.info.height;
  for (let j = 0; j < px; j++) {
    const k = j * A.info.channels;
    const d = Math.abs(A.data[k] - B.data[k]) + Math.abs(A.data[k + 1] - B.data[k + 1]) + Math.abs(A.data[k + 2] - B.data[k + 2]);
    if (d > 24) dif++;
  }
  console.log(`${L}: .anim antes do shot inicial? ${temAnim} | diff primeira tela antes x depois da classe: ${(100 * dif / px).toFixed(2)}%`);
  await sharp(antes).toFile(`shots/b4-${L}-antes-anim.png`);
  await sharp(depois).toFile(`shots/b4-${L}-depois-anim.png`);

  // reveal abaixo da dobra: #topicos entra escondido e aparece ao rolar
  await p.evaluate(() => document.querySelector('#ba')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await p.waitForTimeout(300);
  const baEscondido = await p.evaluate(() => {
    const h = document.querySelector('.ba-header');
    return h ? getComputedStyle(h).opacity : '?';
  });
  await p.waitForTimeout(2200);
  const baVisivel = await p.evaluate(() => {
    const h = document.querySelector('.ba-header');
    return h ? getComputedStyle(h).opacity : '?';
  });
  console.log(`${L}: .ba-header ao chegar: opacity ${baEscondido} -> depois da entrada: ${baVisivel} (reveal ${baEscondido !== baVisivel && baVisivel === '1' ? 'FUNCIONA' : baVisivel === '1' && baEscondido === '1' ? 'sem animação?' : 'QUEBRADO'})`);
  await ctx.close();
}
await nav.close();
await servidor.fechar();
