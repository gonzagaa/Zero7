// Divisor de seção candles (fase 9): a transição #divisa → #ba.
//
//   node scripts/divisor.mjs     # medidas/divisor.md
//
// Em cada largura do harness, com a página preparada e a faixa do topo do #ba
// fotografada só para as contas (nada é salvo):
//  - folga real: do card mais baixo do #divisa ao pico da fita — a linha mais
//    alta da faixa com pixel de barra, fora das pontas;
//  - folga até o título: da base da fita ao título do #ba;
//  - pontas: o quanto a barra aparece nas 3 colunas de cada ponta (o degradê
//    de 24px tem de apagar a meia barra), contra o miolo da fita;
//  - fita visível: a fração do miolo com barra e o contraste do topo aceso;
//  - nenhuma faixa chapada: o que vem antes do #ba, se a imagem de fundo dele
//    começa no topo e a costura na base da fita, imagem contra imagem;
//  - altura da página e rolagem lateral.
// E o seletor do laboratório, que saiu: ausente mesmo com ?divisor= e ?dev=1,
// sem nenhum pedido do divisor.js. O CLS sai do cls.mjs.

import { chromium } from 'playwright';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { LARGURAS, prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNDO = [0, 2, 5]; // --sup-fundo: o que o #divisa mostra no recorte
const MARGEM = 4;        // px acima do topo do #ba, na captura
const PONTAS = 24;       // o degradê das pontas, em divisor.css

async function abrir(nav, largura, url, pedidos) {
  const ctx = await nav.newContext({
    viewport: { width: largura, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'pt-BR',
    ...(largura < 1080 ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await ctx.newPage();
  if (pedidos) page.on('request', (r) => pedidos.push(r.url()));
  await prepararPagina(page, url);
  return { ctx, page };
}

function medir() {
  const ba = document.getElementById('ba');
  const r = ba.getBoundingClientRect();
  const cs = getComputedStyle(ba);
  const img = ba.querySelector('img.bgsection')?.getBoundingClientRect();
  const cards = [...document.querySelectorAll('#divisa .borderCard')].map((c) => c.getBoundingClientRect().bottom);
  const titulo = ba.querySelector('header h2')?.getBoundingClientRect();
  const antes = ba.previousElementSibling;
  return {
    classes: [...ba.classList].join(' '),
    topo: r.top + scrollY,
    altura: -parseFloat(cs.marginTop),
    pico: parseFloat(cs.getPropertyValue('--candles-pico')),
    paddingDivisa: parseFloat(getComputedStyle(document.getElementById('divisa')).paddingBottom),
    cardsBase: Math.max(...cards) + scrollY,
    tituloTopo: titulo ? titulo.top + scrollY : null,
    antes: antes ? (antes.id ? `#${antes.id}` : antes.tagName.toLowerCase()) : null,
    imagemNoTopo: Boolean(img && Math.abs(img.top - r.top) < 0.5 && img.bottom >= r.bottom - 0.5),
    alturaPagina: document.documentElement.scrollHeight,
    rolagemLateral: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    seletor: Boolean(document.querySelector('.divisor-seletor')),
  };
}

async function analisar({ b64, fundo, margem, altura, pontas }) {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const { data } = g.getImageData(0, 0, c.width, c.height);
  const W = c.width;
  const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const dif = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  const lin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, gg, b]) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
  const lf = lum(fundo);
  const contraste = (p) => { const l = lum(p); return (Math.max(l, lf) + 0.05) / (Math.min(l, lf) + 0.05); };
  const eBarra = (p) => dif(p, fundo) > 2;

  const topo = margem;
  const base = margem + Math.round(altura); // onde a fita encosta no resto do #ba
  // A última linha da faixa já é o resto do #ba (a camada de baixo sobrepõe
  // 1px, para não abrir fresta) e a fronteira cai em fração de pixel: as
  // contas da fita param 2 linhas antes da base.
  const ultima = base - 2;
  // pico: a linha mais alta da faixa com barra, no miolo (fora das pontas)
  let pico = base; let comBarra = 0; let miolo = 0; let maxMiolo = 0; let maxPontas = 0; let aceso = 1;
  const tons = [];
  for (let x = 0; x < W; x++) {
    const naPonta = x < 3 || x >= W - 3;
    const noMiolo = x >= pontas && x < W - pontas;
    let temBarra = false;
    for (let y = topo; y < ultima; y++) {
      const p = px(x, y);
      const d = dif(p, fundo);
      if (naPonta) maxPontas = Math.max(maxPontas, d);
      if (noMiolo) {
        maxMiolo = Math.max(maxMiolo, d);
        const k = contraste(p);
        aceso = Math.max(aceso, k);
        if (eBarra(p)) {
          temBarra = true;
          if (y < pico) pico = y;
          if (k < 1.5) tons.push(d); // o corpo da barra, sem o topo aceso
        }
      }
    }
    if (noMiolo) { miolo++; if (temBarra) comBarra++; }
  }
  // costura: na base da fita, só dentro das barras (6 linhas acima da base já
  // é barra), imagem contra imagem, fora do azul
  const costura = []; const referencia = [];
  for (let x = pontas; x < W - pontas; x += 3) {
    const dentro = px(x, base - 6); const cima = px(x, base - 2); const baixo = px(x, base + 1);
    const imagem = [dentro, cima, baixo].every((p) => contraste(p) < 1.5);
    if (imagem && eBarra(dentro) && eBarra(cima)) costura.push(dif(cima, baixo));
    referencia.push(dif(px(x, base + 3), px(x, base + 6)));
  }
  tons.sort((a, b) => a - b);
  const media = (a) => (a.length ? Math.round((a.reduce((s, v) => s + v, 0) / a.length) * 10) / 10 : null);
  return {
    picoNaFaixa: pico - topo, // px do topo do #ba até o pico desenhado
    comBarra: Math.round((comBarra / miolo) * 1000) / 10,
    tomBarra: tons.length ? tons[Math.floor(tons.length / 2)] : null,
    maxPontas,
    maxMiolo,
    aceso: Math.round(aceso * 100) / 100,
    costura: { maxima: costura.length ? Math.max(...costura) : null, media: media(costura) },
    referencia: { maxima: Math.max(...referencia), media: media(referencia) },
  };
}

const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const saida = { data: new Date().toISOString().slice(0, 10), larguras: {}, seletor: {} };
try {
  for (const w of LARGURAS) {
    const { ctx, page } = await abrir(nav, w, servidor.url);
    const m = await page.evaluate(medir);
    await page.evaluate((y) => window.scrollTo(0, y), m.topo - 300);
    await page.waitForTimeout(600);
    const topoNaTela = await page.evaluate(() => document.getElementById('ba').getBoundingClientRect().top);
    const png = await page.screenshot({
      clip: { x: 0, y: Math.round(topoNaTela) - MARGEM, width: w, height: MARGEM + Math.ceil(m.altura) + 10 },
      timeout: 60_000,
    });
    Object.assign(m, await page.evaluate(analisar, { b64: png.toString('base64'), fundo: FUNDO, margem: MARGEM, altura: m.altura, pontas: PONTAS }));
    m.folgaReal = Math.round((m.topo + m.picoNaFaixa - m.cardsBase) * 10) / 10;
    m.folgaCss = Math.round((m.paddingDivisa - m.pico) * 10) / 10;
    m.baseAoTitulo = m.tituloTopo == null ? null : Math.round((m.tituloTopo - (m.topo + m.altura)) * 10) / 10;
    m.picoAoTitulo = m.tituloTopo == null ? null : Math.round((m.tituloTopo - (m.topo + m.picoNaFaixa)) * 10) / 10;
    saida.larguras[w] = m;
    console.log(`  ${String(w).padStart(4)}: folga ${m.folgaReal}px (CSS ${m.folgaCss}) · pico ${m.altura - m.picoNaFaixa}px · base→título ${m.baseAoTitulo} · pontas ${m.maxPontas} x miolo ${m.maxMiolo} · barra em ${m.comBarra}% · aceso ${m.aceso}:1 · costura ${m.costura.maxima} (ref ${m.referencia.maxima})`);
    await ctx.close();
  }

  for (const q of ['?divisor=chanfro', '?dev=1', '']) {
    const pedidos = [];
    const { ctx, page } = await abrir(nav, 375, `${servidor.url}${q}`, pedidos);
    const m = await page.evaluate(medir);
    saida.seletor[q || 'sem parâmetro'] = { seletor: m.seletor, classes: m.classes, divisorJs: pedidos.some((u) => /divisor\.js/.test(u)) };
    await ctx.close();
  }
} finally {
  await nav.close();
  await servidor.fechar();
}

const n = (v) => String(v).replace('.', ',');
const L = [];
L.push('# Divisor de seção candles — verificação', '');
L.push(`Gerado por \`node scripts/divisor.mjs\` em ${saida.data.split('-').reverse().join('/')}. Página preparada pelo harness, movimento reduzido, tela de 900px de altura, contexto de toque abaixo de 1080. A faixa do topo do #ba é fotografada só para as contas.`, '');
L.push('## Folgas e fita', '');
L.push('"Folga real": do card mais baixo do #divisa ao pico desenhado da fita. "No CSS": o padding-bottom do #divisa menos a barra mais alta — o que a folga deveria dar. "Base → título": da base da fita ao título do #ba. "Pontas": a maior diferença de cor contra o fundo de cima (0–255) nas 3 colunas de cada ponta da faixa, acima da base, contra a do miolo — sem meia barra, a das pontas fica perto de 0. "Barra": a fração do miolo com barra. "Tom": a diferença de cor típica do corpo da barra (sem o azul) contra o fundo de cima — as duas seções são quase a mesma cor, então é pequena. "Aceso": o contraste do pixel mais claro da faixa (o topo da barra mais alta) contra o fundo de cima.', '');
L.push('| Largura | Folga real | No CSS | Barra mais alta | Base → título | Pontas x miolo | Barra | Tom | Aceso |', '|---:|---:|---:|---:|---:|---|---:|---:|---:|');
for (const [w, m] of Object.entries(saida.larguras)) {
  L.push(`| ${w} | ${n(m.folgaReal)}px | ${n(m.folgaCss)}px | ${m.altura - m.picoNaFaixa}px | ${n(m.baseAoTitulo)}px | ${m.maxPontas} x ${m.maxMiolo} | ${n(m.comBarra)}% | ${m.tomBarra ?? '—'} | ${n(m.aceso)}:1 |`);
}
L.push('', '## Recorte, costura e layout', '');
L.push('"Antes do #ba": o elemento anterior a ele — tem de ser o #divisa, sem tira no meio. "Imagem no topo": a imagem de fundo do #ba começa no topo dele, então é ela que aparece nas barras. "Costura": a maior diferença de cor entre a linha logo acima e a logo abaixo da base da fita, só dentro das barras, imagem contra imagem; "referência": a mesma conta entre duas linhas quaisquer da imagem.', '');
L.push('| Largura | Antes do #ba | Imagem no topo | Costura (máx. / média) | Referência (máx. / média) | Página | Rolagem lateral |', '|---:|---|:--:|---|---|---:|---:|');
for (const [w, m] of Object.entries(saida.larguras)) {
  L.push(`| ${w} | \`${m.antes}\` | ${m.imagemNoTopo ? 'sim' : 'não'} | ${m.costura.maxima ?? '—'} / ${n(m.costura.media ?? '—')} | ${m.referencia.maxima} / ${n(m.referencia.media)} | ${m.alturaPagina} | ${m.rolagemLateral} |`);
}
L.push('', '## O seletor do laboratório saiu', '');
for (const [q, s] of Object.entries(saida.seletor)) {
  L.push(`- ${q}, 375: seletor ${s.seletor ? '**na tela**' : 'ausente'} · classes do #ba \`${s.classes}\` · pedido do divisor.js: ${s.divisorJs ? '**sim**' : 'nenhum'}.`);
}
L.push('');
await writeFile(path.join(RAIZ, 'medidas', 'divisor.md'), L.join('\n'));
console.log('\nSalvo medidas/divisor.md');
