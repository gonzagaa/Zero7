// Raiz tipográfica (fase 11): o que a raiz controla, nas 13 larguras.
//
//   node scripts/raiz.mjs <rótulo>     # medidas/raiz-<rótulo>.md
//
// Com a página preparada pelo harness e movimento reduzido, em cada largura:
//  - `:root` computado, o h1, o corpo do herói, o título e o subtítulo de
//    seção e os três tamanhos do card da central de ajuda;
//  - o container (#home .wrapper), a altura da página e a rolagem lateral;
//  - quantos textos visíveis ficam abaixo de 16px (o piso da fase 8 vale
//    abaixo de 1080; no desktop o corpo aprovado é menor).
// As larguras são as treze do portão desta fase: as nove do harness mais as
// bordas 1079/1080 e 1599/1600.

import { chromium } from 'playwright';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROTULO = process.argv[2] || 'raiz';
const LARGURAS = [320, 375, 390, 430, 768, 1024, 1079, 1080, 1280, 1474, 1599, 1600, 1920];

function medir() {
  const px = (el) => (el ? Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100 : null);
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const q = (s) => document.querySelector(s);
  const h1 = [...document.querySelectorAll('h1')].find(visivel);
  const heroi = [...document.querySelectorAll('p')].find((p) => visivel(p) && p.textContent.trim().length >= 80);
  const wrap = q('#home .wrapper');

  // textos visíveis com corpo abaixo de 16px
  let abaixo16 = 0;
  let textos = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    if (![...el.childNodes].some((k) => k.nodeType === 3 && k.textContent.trim())) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    textos++;
    if (parseFloat(getComputedStyle(el).fontSize) < 16) abaixo16++;
  }

  return {
    raiz: px(document.documentElement),
    h1: px(h1),
    heroi: px(heroi),
    tituloSecao: px(q('#faq header h2')),
    subtituloFaq: px(q('#faq .faq__subtitle')),
    cardTitulo: px(q('.faq__category-name')),
    cardDesc: px(q('.faq__category-desc')),
    cardCont: px(q('.faq__category-count')),
    container: wrap ? Math.round(wrap.getBoundingClientRect().width * 10) / 10 : null,
    pagina: document.documentElement.scrollHeight,
    lateral: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    textos,
    abaixo16,
  };
}

const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const base = { deviceScaleFactor: 1, locale: 'pt-BR', reducedMotion: 'reduce' };
const toque = await nav.newContext({ ...base, viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true });
const mesa = await nav.newContext({ ...base, viewport: { width: 1474, height: 900 } });
const saida = { data: new Date().toISOString().slice(0, 10), larguras: {} };
try {
  const pToque = await toque.newPage();
  const pMesa = await mesa.newPage();
  for (const w of LARGURAS) {
    const page = w < 1080 ? pToque : pMesa;
    await page.setViewportSize({ width: w, height: 900 });
    await prepararPagina(page, servidor.url);
    await page.waitForSelector('.faq__category-name', { timeout: 10_000 }).catch(() => {});
    const m = await page.evaluate(medir);
    saida.larguras[w] = m;
    console.log(`${String(w).padStart(4)} | raiz ${m.raiz} | h1 ${m.h1} | herói ${m.heroi} | título ${m.tituloSecao} | subtítulo ${m.subtituloFaq} | card ${m.cardTitulo}/${m.cardDesc}/${m.cardCont} | container ${m.container} | página ${m.pagina} | lateral ${m.lateral} | <16px ${m.abaixo16} de ${m.textos}`);
  }
} finally {
  await toque.close();
  await mesa.close();
  await nav.close();
  await servidor.fechar();
}

const n = (v) => (v == null ? '—' : String(v).replace('.', ','));
const L = [];
L.push(`# Raiz tipográfica — ${ROTULO}`, '');
L.push(`Gerado por \`node scripts/raiz.mjs ${ROTULO}\` em ${saida.data.split('-').reverse().join('/')}. Página preparada pelo harness, movimento reduzido, tela de 900px de altura, contexto de toque abaixo de 1080. Corpo em px.`, '');
L.push('"Corpo": o primeiro parágrafo longo, o do herói. "Card": título / descrição / contagem do card da central de ajuda. "<16px": textos visíveis com corpo abaixo de 16px, do total de textos visíveis.', '');
L.push('| Largura | `:root` | h1 | Corpo | Título de seção | Subtítulo | Card | Container | Página | Lateral | <16px |',
  '|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|');
for (const [w, m] of Object.entries(saida.larguras)) {
  L.push(`| ${w} | ${n(m.raiz)} | ${n(m.h1)} | ${n(m.heroi)} | ${n(m.tituloSecao)} | ${n(m.subtituloFaq)} | ${n(m.cardTitulo)} / ${n(m.cardDesc)} / ${n(m.cardCont)} | ${n(m.container)} | ${m.pagina} | ${m.lateral} | ${m.abaixo16} de ${m.textos} |`);
}
L.push('');
await writeFile(path.join(RAIZ, 'medidas', `raiz-${ROTULO}.md`), L.join('\n'));
console.log(`\nSalvo medidas/raiz-${ROTULO}.md`);
