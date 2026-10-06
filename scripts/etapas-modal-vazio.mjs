// Onde exatamente o abrir/fechar do artigo gasta o tempo.
// Não altera o site: intercepta o sectionFaq.js na rede e serve uma cópia
// com marcas entre as linhas. O arquivo do repositório não é tocado.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const largura = Number(process.argv[2] || 390);
const repeticoes = Number(process.argv[3] || 5);
const MOVEL = largura < 1080;

const original = fs.readFileSync(path.join(RAIZ, 'script/sectionFaq.js'), 'utf8');
const marca = (r) => `window.__t.push(['${r}',performance.now()]);`;

let inst = original;
const trocas = [
  ["el.modalBody.innerHTML = article.body || '';",
   `window.__t=[['clique',performance.now()]];el.modalBody.innerHTML = '';${marca('innerHTML VAZIO')}`],
  ["quemAbriuOModal = document.activeElement;",
   `${marca('reescrever links')}quemAbriuOModal = document.activeElement;`],
  ["el.modal.showModal();",
   `el.modal.showModal();${marca('showModal')}`],
  ["void el.modal.offsetHeight;",
   `void el.modal.offsetHeight;${marca('void offsetHeight (reflow forcado)')}`],
  ["el.modal.classList.add('is-open');",
   `el.modal.classList.add('is-open');${marca('classe is-open')}`],
  ["lockBodyScroll();",
   `lockBodyScroll();${marca('lockBodyScroll')}`],
  ["el.modalClose?.focus();",
   `el.modalClose?.focus();${marca('focus no X')}`],
  // fechar
  ["if (el.modal.open) el.modal.close();",
   `window.__tf=[['clique',performance.now()]];if (el.modal.open) el.modal.close();window.__tf.push(['dialog.close',performance.now()]);`],
  ["el.modal.classList.remove('is-open');",
   `el.modal.classList.remove('is-open');window.__tf.push(['tira is-open',performance.now()]);`],
  ["unlockBodyScroll();",
   `unlockBodyScroll();window.__tf.push(['unlockBodyScroll',performance.now()]);`],
  ["quemAbriuOModal?.focus();",
   `quemAbriuOModal?.focus();window.__tf.push(['focus de volta',performance.now()]);`],
];
for (const [de, para] of trocas) {
  if (!inst.includes(de)) { console.error('NÃO ACHEI: ' + de); process.exit(1); }
  inst = inst.replace(de, para);
}

const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const abrir = [];
const fechar = [];
try {
  const ctx = await nav.newContext({
    viewport: { width: largura, height: MOVEL ? 844 : 900 },
    deviceScaleFactor: MOVEL ? 3 : 1, isMobile: MOVEL, hasTouch: MOVEL, locale: 'pt-BR',
  });
  await ctx.addInitScript(() => { window.__t = []; window.__tf = []; window.__pintou = null; });
  const p = await ctx.newPage();
  await p.route('**/script/sectionFaq.js*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: inst }));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(servidor.url, { waitUntil: 'load', timeout: 120_000 });
  await p.waitForTimeout(5000);

  const clicar = async (sel) => {
    const ok = await p.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return false;
      e.scrollIntoView({ behavior: 'instant', block: 'center' });
      return true;
    }, sel);
    if (!ok) return false;
    await p.waitForTimeout(300);
    const c = await p.evaluate((s) => {
      const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, sel);
    if (!c) return false;
    await p.mouse.click(c.x, c.y);
    return true;
  };

  for (let r = 0; r < repeticoes; r++) {
    await p.evaluate(() => document.getElementById('faq').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await p.waitForTimeout(600);
    await clicar('#faqCategories .faq__category-card:not(.is-escondido)');
    await p.waitForTimeout(900);

    // o pixel na tela: duplo rAF depois do handler = primeiro quadro pintado
    await p.evaluate(() => {
      window.__pintou = null;
      const alvo = document.querySelector('.faq__expanded-article');
      if (!alvo) return;
      alvo.addEventListener('click', () => {
        requestAnimationFrame(() => requestAnimationFrame(() => { window.__pintou = performance.now(); }));
      }, { once: true, capture: true });
    });
    if (await clicar('.faq__expanded-article')) {
      await p.waitForTimeout(900);
      const d = await p.evaluate(() => ({ t: window.__t, pintou: window.__pintou }));
      if (d.t && d.t.length > 3) abrir.push(d);

      await p.evaluate(() => {
        window.__pintou = null;
        document.querySelector('.faq__modal-close')?.addEventListener('click', () => {
          requestAnimationFrame(() => requestAnimationFrame(() => { window.__pintou = performance.now(); }));
        }, { once: true, capture: true });
      });
      if (await clicar('.faq__modal-close')) {
        await p.waitForTimeout(900);
        const f = await p.evaluate(() => ({ t: window.__tf, pintou: window.__pintou }));
        if (f.t && f.t.length > 2) fechar.push(f);
      }
    }
    await p.evaluate(() => document.querySelector('#faqCategories .faq__category-card.is-open, #faqCategories .faq__category-card')?.click());
    await p.waitForTimeout(500);
  }
  await ctx.close();
} finally {
  await nav.close();
  await servidor.fechar();
}

const r1 = (v) => Math.round(v * 10) / 10;
const mediana = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };

const relatar = (titulo, amostras) => {
  console.log(`\n${titulo}  (${amostras.length} amostras, ${largura}px, CPU 4x)`);
  if (!amostras.length) return;
  const rotulos = amostras[0].t.slice(1).map((x) => x[0]);
  console.log('    etapa                                mediana     min     max');
  rotulos.forEach((rot, i) => {
    const ds = amostras.map((a) => a.t[i + 1][1] - a.t[i][1]);
    console.log('    ' + rot.padEnd(36) + String(r1(mediana(ds))).padStart(7) + String(r1(Math.min(...ds))).padStart(8) + String(r1(Math.max(...ds))).padStart(8));
  });
  const totais = amostras.map((a) => a.t[a.t.length - 1][1] - a.t[0][1]);
  console.log('    ' + '— handler inteiro —'.padEnd(36) + String(r1(mediana(totais))).padStart(7) + String(r1(Math.min(...totais))).padStart(8) + String(r1(Math.max(...totais))).padStart(8));
  const pinta = amostras.filter((a) => a.pintou).map((a) => a.pintou - a.t[a.t.length - 1][1]);
  if (pinta.length) console.log('    ' + '— do fim do handler ao pixel —'.padEnd(36) + String(r1(mediana(pinta))).padStart(7) + String(r1(Math.min(...pinta))).padStart(8) + String(r1(Math.max(...pinta))).padStart(8));
};

relatar('ABRIR o artigo', abrir);
relatar('FECHAR o artigo', fechar);
