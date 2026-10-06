// Acabamento da home: medida de linha, ritmo dentro das seções, elevação por
// bloco, rótulos em caixa alta, números tabulares e alinhamento de ícone com
// o texto ao lado.
//
//   node scripts/acabamento.mjs <rótulo>      → medidas/<rótulo>-acabamento.md
//
// Usa o preparo do harness (lib/pagina.mjs) e lê o layout já assentado.
//
// Medida de linha — caracteres por linha de cada parágrafo de 80+ caracteres,
// contados por Range: cada caractere com caixa própria entra na linha em que
// cai (espaços inclusive, como na conta tipográfica de CPL).
//
// Ritmo — distância vertical entre os blocos da pilha de cada seção (título,
// subtítulo, conteúdo) e se ela cai num degrau da escala de espaço (--esp-*).
//
// Elevação — blocos de 40×40px ou mais com sombra, borda ou raio, por seção.
//
// Caixa alta — letter-spacing, em em, de todo texto próprio em maiúsculas.
//
// Números — font-variant-numeric de todo texto com dígito nas colunas de
// números (specs e preços dos planos, valores do #divisa).
//
// Ícones — distância entre o centro do ícone e o centro óptico da linha de
// texto vizinha (baseline menos metade da altura das maiúsculas).

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { LARGURAS, prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const rotulo = process.argv[2];
if (!rotulo) {
  console.error('Uso: node scripts/acabamento.mjs <rótulo>   (ex: fase6)');
  process.exit(1);
}

// A pilha de cada seção, na ordem em que aparece. O primeiro elemento visível
// de cada seletor entra; a distância é topo do próximo menos base do anterior.
const PILHAS = [
  ['#home', ['#home h1', '#home .text > p', '#home .text > .btn']],
  ['#divisa · card', ['#divisa .borderCard.um h3', '#divisa .borderCard.um p']],
  ['#ba', ['#ba .ba-header h2', '#ba .ba-bento', '#ba .ba-trio']],
  ['#ba · hero', ['#ba .ba-hero__title', '#ba .ba-hero__desc']],
  ['#ba · benefício', ['#ba .card-beneficio__cabeca', '#ba .card-beneficio__descricao']],
  ['#topicos', ['#topicos header h2', '#topicos .cards']],
  ['#topicos · card', ['#topicos .card img', '#topicos .card .text p', '#topicos .card .btn']],
  ['#depoimentos', ['#depoimentos header h2', '#depoimentos header p', '#depoimentos header .btn']],
  ['#plan', ['#plan .seg', '#plan .js-plan-title', '#plan .plano-asset--indice .swiper']],
  ['#faq', ['#faq header h2', '#faq .faq__subtitle', '#faq .faq__search', '#faq .faq__categories']],
  ['#contato', ['#contato header h2', '#contato header p', '#contato .cards']],
];

function coletar(PILHAS) {
  const SECOES = 'section[id], header#home, footer#footer';
  const secao = (el) => el.closest(SECOES)?.id ?? '';
  const visivel = (el) => el.checkVisibility?.({ visibilityProperty: true }) && el.getClientRects().length > 0;
  const textoProprio = (el) => [...el.childNodes]
    .filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize);

  // ── medida de linha ──────────────────────────────────────────────────────
  const tamanhoCh = (el) => {
    const s = document.createElement('span');
    s.textContent = '0';
    s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    el.appendChild(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return w;
  };
  const range = document.createRange();
  const linhasDe = (el) => {
    const porLinha = new Map();
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const t = n.textContent;
      for (let i = 0; i < t.length; i++) {
        range.setStart(n, i);
        range.setEnd(n, i + 1);
        const r = range.getClientRects()[0];
        if (!r || r.width === 0) continue;
        const k = Math.round((r.top + r.height / 2) / 6);
        porLinha.set(k, (porLinha.get(k) || 0) + 1);
      }
    }
    return [...porLinha.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  };
  const medida = [];
  for (const p of document.querySelectorAll('p')) {
    if (!visivel(p) || p.closest('#author, .faq__modal, [hidden]')) continue;
    if (p.textContent.replace(/\s+/g, ' ').trim().length < 80) continue;
    const linhas = linhasDe(p);
    if (!linhas.length) continue;
    const cheias = linhas.length > 1 ? linhas.slice(0, -1) : linhas; // a última linha não conta
    const r = p.getBoundingClientRect();
    medida.push({
      secao: secao(p),
      amostra: p.textContent.replace(/\s+/g, ' ').trim().slice(0, 38),
      linhas: linhas.length,
      max: Math.max(...cheias),
      media: Math.round(cheias.reduce((a, b) => a + b, 0) / cheias.length),
      largura: Math.round(r.width),
      emCh: Math.round(r.width / tamanhoCh(p)),
    });
  }

  // ── ritmo ─────────────────────────────────────────────────────────────────
  const DEGRAUS = [['esp-1', 0.5], ['esp-2', 1], ['esp-3', 1.5], ['esp-4', 2], ['esp-5', 3], ['esp-6', 4], ['esp-7', 6], ['esp-8', 8]];
  const degrau = (px) => {
    for (const [nome, rem] of DEGRAUS) if (Math.abs(px - rem * raiz) <= 1) return nome;
    return null;
  };
  const ritmo = PILHAS.map(([nome, seletores]) => {
    const els = seletores.map((s) => [...document.querySelectorAll(s)].find(visivel) || null);
    const passos = [];
    for (let i = 1; i < els.length; i++) {
      const a = els[i - 1];
      const b = els[i];
      if (!a || !b) { passos.push({ de: seletores[i - 1], para: seletores[i], px: null }); continue; }
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const px = rb.top - ra.bottom;
      passos.push({
        de: seletores[i - 1].replace(/^#\S+ /, ''),
        para: seletores[i].replace(/^#\S+ /, ''),
        px: Math.round(px * 10) / 10,
        lado: rb.top < ra.top,
        degrau: degrau(px),
      });
    }
    return { nome, passos };
  });

  // ── elevação ──────────────────────────────────────────────────────────────
  const elevacao = {};
  for (const el of document.querySelectorAll('header#home *, section[id] *, footer#footer *')) {
    if (!visivel(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) continue;
    if (el.closest('.btn, .z7-btnx, ion-icon, svg, .swiper-pagination, .faq__modal')) continue;
    const cs = getComputedStyle(el);
    // sombra de queda: com deslocamento ou desfoque, fora do inset. Anel
    // (0 0 0 Npx) conta como borda, e realce inset não é elevação.
    const partes = cs.boxShadow === 'none' ? [] : cs.boxShadow.split(/,(?![^(]*\))/);
    const sombra = partes.some((p) => {
      if (/inset/.test(p)) return false;
      const [x = 0, y = 0, blur = 0] = p.replace(/[a-z]+\([^)]*\)/gi, '').trim().split(/\s+/).map(parseFloat).filter((n) => !Number.isNaN(n));
      return blur > 0 || x !== 0 || y !== 0;
    });
    const lados = ['Top', 'Right', 'Bottom', 'Left'];
    const borda = lados.some((l) => parseFloat(cs[`border${l}Width`]) > 0 && !/rgba\([^)]*,\s*0\)$/.test(cs[`border${l}Color`]));
    const raio = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].some((c) => parseFloat(cs[`border${c}Radius`]) > 0);
    if (!sombra && !borda) continue;
    const s = secao(el) || '—';
    const e = (elevacao[s] ??= { blocos: 0, sombra: 0, borda: 0, raio: 0, classes: {} });
    e.blocos++;
    if (sombra) e.sombra++;
    if (borda) e.borda++;
    if (raio) e.raio++;
    const cls = el.classList[0] ? `.${el.classList[0]}` : el.tagName.toLowerCase();
    const receita = `${sombra ? 'S' : ''}${borda ? 'B' : ''}${raio ? 'R' : ''}`;
    e.classes[`${cls} ${receita}`] = (e.classes[`${cls} ${receita}`] || 0) + 1;
  }

  // ── caixa alta ────────────────────────────────────────────────────────────
  const caixaAlta = {};
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('script, style, svg, ion-icon, .faq__modal') || !visivel(el)) continue;
    const t = textoProprio(el);
    const letras = t.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
    if (letras.length < 3) continue;
    const cs = getComputedStyle(el);
    if (!(cs.textTransform === 'uppercase' || letras === letras.toUpperCase())) continue;
    const fs = parseFloat(cs.fontSize);
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const familia = cs.fontFamily.split(',')[0].replace(/["']/g, '');
    const papel = fs >= 24 ? 'título' : fs >= 14 ? 'intermediário' : 'rótulo';
    const k = `${papel} · ${familia} · ${(ls / fs).toFixed(3)}em`;
    const g = (caixaAlta[k] ??= { n: 0, amostras: new Set(), tamanhos: new Set() });
    g.n++;
    if (g.amostras.size < 3) g.amostras.add(t.slice(0, 26));
    g.tamanhos.add(`${Math.round(fs * 10) / 10}px`);
  }

  // ── números ───────────────────────────────────────────────────────────────
  const numeros = { total: 0, tabulares: 0, exemplos: [] };
  for (const el of document.querySelectorAll('#divisa .card h3, #divisa .card h3 *, #plan .chip *, #plan .price *, #plan .oldPrice *')) {
    if (!visivel(el) || !/\d/.test(textoProprio(el))) continue;
    numeros.total++;
    const fvn = getComputedStyle(el).fontVariantNumeric;
    if (fvn.includes('tabular-nums')) numeros.tabulares++;
    else if (numeros.exemplos.length < 4) numeros.exemplos.push(`${secao(el)} · ${textoProprio(el).slice(0, 18)} (${fvn})`);
  }

  // ── ícones ────────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas').getContext('2d');
  const icones = [];
  for (const ic of document.querySelectorAll('ion-icon')) {
    if (!visivel(ic) || ic.closest('.faq__modal, footer .redes-sociais')) continue;
    const pai = ic.parentElement;
    const vizinhos = [...pai.childNodes].filter((n) => n !== ic && (n.nodeType === 3
      ? n.textContent.trim()
      : n.nodeType === 1 && n.textContent.trim() && !n.querySelector('ion-icon') && visivel(n)));
    if (!vizinhos.length) continue;
    const ib = ic.getBoundingClientRect();
    const cy = ib.top + ib.height / 2;
    // linha de texto mais perto do ícone, no vizinho mais perto
    let melhor = null;
    for (const v of vizinhos) {
      range.selectNodeContents(v);
      for (const r of range.getClientRects()) {
        if (!r.width) continue;
        const d = Math.abs(r.top + r.height / 2 - cy);
        if (!melhor || d < melhor.d) melhor = { d, v, r };
      }
    }
    if (!melhor) continue;
    const elTexto = melhor.v.nodeType === 3 ? melhor.v.parentElement : melhor.v;
    const cs = getComputedStyle(elTexto);
    // baseline: um marcador inline-block de altura zero alinhado na baseline
    const marca = document.createElement('span');
    marca.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    const alvoNo = melhor.v.nodeType === 3 ? melhor.v : melhor.v.firstChild;
    if (!alvoNo) continue;
    alvoNo.parentNode.insertBefore(marca, alvoNo);
    const base = marca.getBoundingClientRect().bottom;
    marca.remove();
    canvas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const cap = canvas.measureText('H').actualBoundingBoxAscent;
    const xh = canvas.measureText('x').actualBoundingBoxAscent;
    const centroCap = base - cap / 2;
    const centroX = base - xh / 2;
    // ícone com mais de duas linhas de altura é pictograma de bloco: alinha
    // pelo centro do bloco de texto vizinho, não por uma linha dele
    const rb = ib.height > 2 * melhor.r.height ? elTexto.getBoundingClientRect() : null;
    icones.push({
      secao: secao(ic),
      icone: ic.getAttribute('name') || ic.className,
      texto: (melhor.v.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24),
      referencia: rb ? 'bloco' : 'linha',
      desvioCap: Math.round((cy - (rb ? rb.top + rb.height / 2 : centroCap)) * 10) / 10,
      desvioX: rb ? null : Math.round((cy - centroX) * 10) / 10,
      tamanho: Math.round(ib.height),
    });
  }

  const g = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, amostras: [...(v.amostras || [])], tamanhos: [...(v.tamanhos || [])] }]));
  return { raiz, medida, ritmo, elevacao, caixaAlta: g(caixaAlta), numeros, icones };
}

const servidor = await iniciarServidor(RAIZ);
const navegador = await chromium.launch();
const resultado = {};
try {
  // um contexto só: a largura muda pelo viewport e a página recarrega
  const ctx = await navegador.newContext({
    viewport: { width: LARGURAS[0], height: 900 }, deviceScaleFactor: 1,
    reducedMotion: 'no-preference', locale: 'pt-BR',
  });
  const page = await ctx.newPage();
  for (const largura of LARGURAS) {
    await page.setViewportSize({ width: largura, height: 900 });
    await prepararPagina(page, servidor.url);
    // o AOS desloca blocos fora da vista: mede o layout final, sem ele
    await page.evaluate(() => document.querySelectorAll('[data-aos]').forEach((el) => el.removeAttribute('data-aos')));
    await page.waitForTimeout(200);
    resultado[largura] = await page.evaluate(coletar, PILHAS);
    console.error(`  medido: ${largura}px`);
  }
  await ctx.close();
} finally {
  await navegador.close();
  await servidor.fechar();
}

// ── relatório ───────────────────────────────────────────────────────────────
const linhas = [];
const L = (s = '') => linhas.push(s);
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
const DETALHE = [375, 1474];

L(`# Acabamento da home — ${rotulo}`);
L();
L('Gerado por `scripts/acabamento.mjs`, com o preparo do harness e sem o AOS.');
L();
L('## Medida de linha (caracteres por linha)');
L();
L('Linha mais longa entre as cheias (a última linha de cada parágrafo fica fora). `ch` é a largura da caixa em zeros da fonte do parágrafo.');
for (const largura of LARGURAS) {
  const m = resultado[largura].medida;
  L();
  L(`### ${largura}px`);
  L();
  L('| Seção | Parágrafo | Linhas | CPL máx. | CPL médio | Largura | Largura em ch |');
  L('|---|---|---:|---:|---:|---:|---:|');
  for (const p of m) L(`| ${esc(p.secao)} | ${esc(p.amostra)}… | ${p.linhas} | ${p.max} | ${p.media} | ${p.largura}px | ${p.emCh} |`);
}

L();
L('## Ritmo dentro das seções');
L();
L('Distância do fim de um bloco ao começo do próximo. ✓ = cai num degrau da escala (±1px); "lado a lado" = o próximo começa acima (layout em colunas).');
for (const largura of [375, 768, 1474, 1920]) {
  L();
  L(`### ${largura}px (raiz ${resultado[largura].raiz}px)`);
  L();
  L('| Pilha | Passo | Distância | Degrau |');
  L('|---|---|---:|---|');
  for (const { nome, passos } of resultado[largura].ritmo) {
    for (const p of passos) {
      const d = p.px === null ? '—' : p.lado ? 'lado a lado' : `${p.px}px`;
      const g = p.px === null || p.lado ? '' : p.degrau ? `✓ ${p.degrau}` : '✗';
      L(`| ${esc(nome)} | ${esc(p.de)} → ${esc(p.para)} | ${d} | ${g} |`);
    }
  }
}

L();
L('## Elevação — blocos com sombra ou borda');
L();
L('S = sombra, B = borda, R = raio. Blocos de 40×40px ou mais; botões, ícones e a paginação ficam fora.');
for (const largura of DETALHE) {
  L();
  L(`### ${largura}px`);
  L();
  L('| Seção | Blocos | Com sombra | Com borda | Com raio | Receitas (classe · receita × n) |');
  L('|---|---:|---:|---:|---:|---|');
  for (const [s, e] of Object.entries(resultado[largura].elevacao)) {
    const receitas = Object.entries(e.classes).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([k, n]) => `${k} ×${n}`).join(' · ');
    L(`| ${esc(s)} | ${e.blocos} | ${e.sombra} | ${e.borda} | ${e.raio} | ${esc(receitas)} |`);
  }
}

L();
L('## Caixa alta — letter-spacing');
L();
L('Agrupado por papel (título ≥24px, intermediário ≥14px, rótulo <14px), família e letter-spacing em em.');
for (const largura of DETALHE) {
  L();
  L(`### ${largura}px`);
  L();
  L('| Grupo | Ocorrências | Tamanhos | Amostras |');
  L('|---|---:|---|---|');
  for (const [k, g] of Object.entries(resultado[largura].caixaAlta).sort()) {
    L(`| ${esc(k)} | ${g.n} | ${g.tamanhos.join(', ')} | ${esc(g.amostras.join(' · '))} |`);
  }
}

L();
L('## Números tabulares');
L();
L('| Largura | Textos com dígito | Com tabular-nums | Exemplos sem |');
L('|---:|---:|---:|---|');
for (const largura of DETALHE) {
  const n = resultado[largura].numeros;
  L(`| ${largura} | ${n.total} | ${n.tabulares} | ${esc(n.exemplos.join(' · '))} |`);
}

L();
L('## Ícones ao lado de texto');
L();
L('Desvio do centro do ícone em relação ao centro das maiúsculas (e da altura-x) da linha vizinha. Positivo = ícone abaixo.');
for (const largura of DETALHE) {
  L();
  L(`### ${largura}px`);
  L();
  L('| Seção | Ícone | Texto vizinho | Tamanho | Referência | Desvio (maiúsculas ou bloco) | Desvio (altura-x) |');
  L('|---|---|---|---:|---|---:|---:|');
  for (const i of resultado[largura].icones) {
    L(`| ${esc(i.secao)} | ${esc(i.icone)} | ${esc(i.texto)} | ${i.tamanho}px | ${i.referencia} | ${i.desvioCap}px | ${i.desvioX === null ? '—' : `${i.desvioX}px`} |`);
  }
}

const arquivo = path.join(RAIZ, 'medidas', `${rotulo}-acabamento.md`);
await mkdir(path.dirname(arquivo), { recursive: true });
await writeFile(arquivo, linhas.join('\n') + '\n');
console.log(`Salvo em ${path.relative(RAIZ, arquivo)}`);
