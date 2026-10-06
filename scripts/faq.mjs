// Card da central de ajuda (fase 10): a grade de categorias do #faq.
//
//   node scripts/faq.mjs [rótulo]     # medidas/faq.md, ou medidas/faq-<rótulo>.md
//
// Com a página preparada pelo harness (a API da central vem do cache,
// shots/_cache) e movimento reduzido, em cada largura:
//  - grade: quantos cards, colunas e fileiras, e se todos têm a mesma altura;
//  - nada estourando: card fora da grade, conteúdo fora do card, rolagem
//    lateral;
//  - elementos focáveis por card, contando os de dentro de shadow root (o
//    ion-icon) — tem de ser um só, o próprio card;
//  - corpo do título, da descrição e da contagem, e em quantas linhas a
//    descrição fica (o line-clamp de duas);
//  - o card como alvo de toque;
//  - a seta do rodapé contra o centro dos algarismos da contagem.
// Em 390 e 1474: a forma (canto, fundo, borda, sombra, e o que saiu: trilho,
// pílula, chevron) do card, da busca, do CTA e do modal; o teclado, do campo
// de busca até sair da seção (a ordem dos cards contra a visual, o anel em
// cada parada, travamento); a busca (digitar, esperar resultados, abrir um,
// fechar); e o caminho do card ao modal do artigo. Em 1474, o hover, com e
// sem movimento reduzido. O CLS sai do cls.mjs.

import { chromium } from 'playwright';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROTULO = process.argv[2] || '';
// As seis do pedido da fase, mais os iPhones (375, 430), as bordas das
// colunas (767/768 e 1199/1200) e 1280.
const LARGURAS = [320, 375, 390, 430, 767, 768, 1024, 1199, 1200, 1280, 1474, 1920];
const COLUNAS = (w) => (w >= 1200 ? 4 : w >= 768 ? 2 : 1);
const CARD = '#faqCategories .card-ajuda';

function medirGrade() {
  const FOCAVEL = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  const r1 = (v) => Math.round(v * 10) / 10;
  const faq = document.getElementById('faq');
  const grade = document.getElementById('faqCategories');
  // só os cards na tela: com a expansão progressiva (fase 12) os que sobram
  // saem por display: none
  const todos = [...grade.querySelectorAll('.card-ajuda')];
  const cards = todos.filter((c) => getComputedStyle(c).display !== 'none');
  const g = grade.getBoundingClientRect();
  const rects = cards.map((c) => c.getBoundingClientRect());

  const focaveis = (raiz) => {
    let n = raiz.matches(FOCAVEL) ? 1 : 0;
    const visitar = (no) => {
      for (const el of no.querySelectorAll('*')) {
        if (el.matches(FOCAVEL)) n++;
        if (el.shadowRoot) visitar(el.shadowRoot);
      }
    };
    visitar(raiz);
    return n;
  };

  // linhas de texto: as caixas de linha do Range; "visíveis" são as que
  // começam dentro da caixa do elemento (o line-clamp esconde o resto)
  const linhas = (el, soVisiveis) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const tops = [...rg.getClientRects()]
      .filter((r) => r.width > 0 && (!soVisiveis || r.top < b.bottom - 2))
      .map((r) => Math.round(r.top));
    return new Set(tops).size;
  };

  const estouro = [];
  cards.forEach((c, i) => {
    const cr = rects[i];
    if (cr.left < g.left - 0.5 || cr.right > g.right + 0.5) estouro.push(`card ${i + 1} fora da grade`);
    for (const el of c.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.left < cr.left - 0.5 || r.right > cr.right + 0.5 || r.bottom > cr.bottom + 0.5) {
        estouro.push(`card ${i + 1}: ${String(el.className || el.tagName).split(' ')[0]} passa da borda`);
      }
    }
  });

  const fs = (sel) => {
    const v = cards.map((c) => c.querySelector(sel)).filter(Boolean).map((el) => parseFloat(getComputedStyle(el).fontSize));
    return v.length ? { min: r1(Math.min(...v)), max: r1(Math.max(...v)) } : null;
  };

  // centro da seta contra o centro dos algarismos da contagem: a linha de
  // base vem de um marcador de altura zero no fim do texto, a altura dos
  // algarismos do canvas, na mesma fonte
  const seta = cards.map((c) => {
    const s = c.querySelector('.card-ajuda__seta');
    const k = c.querySelector('.faq__category-count');
    if (!s || !k) return null;
    const m = document.createElement('span');
    m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    k.appendChild(m);
    const base = m.getBoundingClientRect().top;
    m.remove();
    const ks = getComputedStyle(k);
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = `${ks.fontWeight} ${ks.fontSize} ${ks.fontFamily}`;
    const alt = cv.measureText('0123456789').actualBoundingBoxAscent;
    const sr = s.getBoundingClientRect();
    return r1(sr.top + sr.height / 2 - (base - alt / 2));
  }).filter((v) => v != null);

  const alturas = rects.map((r) => r.height);
  const desc = cards.map((c) => c.querySelector('.faq__category-desc'));
  return {
    n: cards.length,
    total: todos.length,
    colunas: new Set(rects.map((r) => Math.round(r.left))).size,
    fileiras: new Set(rects.map((r) => Math.round(r.top))).size,
    altMin: r1(Math.min(...alturas)),
    altMax: r1(Math.max(...alturas)),
    focaveis: Math.max(...cards.map(focaveis)),
    alvo: r1(Math.min(...rects.map((r) => Math.min(r.width, r.height)))),
    titulo: fs('.faq__category-name'),
    descricao: fs('.faq__category-desc'),
    contagem: fs('.faq__category-count'),
    linhasTitulo: Math.max(...cards.map((c) => linhas(c.querySelector('.faq__category-name'), true))),
    linhasDesc: Math.max(...desc.map((d) => linhas(d, true))),
    linhasDescTexto: Math.max(...desc.map((d) => linhas(d, false))),
    cortadas: desc.filter((d) => d && d.scrollHeight > d.clientHeight + 1).length,
    seta: seta.length ? { min: Math.min(...seta), max: Math.max(...seta) } : null,
    estouro,
    rolagemLateral: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    paginacao: (() => {
      const p = document.getElementById('faqPagination');
      return p ? (p.hidden ? 'escondida' : 'na tela') : 'ausente';
    })(),
    alturaFaq: Math.round(faq.getBoundingClientRect().height),
    alturaPagina: document.documentElement.scrollHeight,
  };
}

function medirForma() {
  const card = document.querySelector('#faqCategories .card-ajuda');
  const raio = (cs) => [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(' ');
  const fundo = (cs) => (cs.backgroundImage !== 'none' ? `gradiente (${cs.backgroundImage.slice(0, 40)}…)` : cs.backgroundColor);
  const c = getComputedStyle(card);
  const cont = card.querySelector('.faq__category-count');
  const kc = getComputedStyle(cont);
  const busca = document.getElementById('faqSearch');
  const bc = getComputedStyle(busca);
  const cta = document.querySelector('#faq .faq__cta-link');
  const painel = document.querySelector('#faq .faq__modal-panel');
  const cor = (sel) => { const el = card.querySelector(sel); return el ? getComputedStyle(el).color : null; };
  return {
    card: {
      raio: raio(c),
      fundo: fundo(c),
      borda: `${c.borderTopWidth} ${c.borderTopColor}`,
      sombra: c.boxShadow,
      padding: c.paddingTop,
      trilho: getComputedStyle(card, '::before').content !== 'none' ? `sim (${getComputedStyle(card, '::before').width})` : 'não',
      pilula: kc.backgroundColor !== 'rgba(0, 0, 0, 0)' ? `sim (${kc.backgroundColor}, borda ${kc.borderTopWidth})` : 'não',
      chevron: card.querySelector('ion-icon[name^="chevron"]') ? 'sim' : 'não',
      seta: card.querySelector('.card-ajuda__seta')?.getAttribute('name') ?? 'não',
      corTitulo: cor('.faq__category-name'),
      corDescricao: cor('.faq__category-desc'),
      corContagem: kc.color,
      numeros: kc.fontVariantNumeric,
      pesoTitulo: getComputedStyle(card.querySelector('.faq__category-name')).fontWeight,
      ariaExpanded: card.getAttribute('aria-expanded'),
    },
    busca: {
      raio: raio(bc),
      fundo: fundo(bc),
      borda: `${bc.borderTopWidth} ${bc.borderTopColor}`,
      altura: Math.round(busca.getBoundingClientRect().height * 10) / 10,
      placeholder: busca.getAttribute('placeholder'),
    },
    cta: cta && {
      classes: [...cta.classList].filter((k) => k.startsWith('btn')).join(' '),
      raio: raio(getComputedStyle(cta)),
      altura: Math.round(cta.getBoundingClientRect().height * 10) / 10,
    },
    modal: painel && { raio: raio(getComputedStyle(painel)) },
  };
}

async function teclado(page) {
  await page.evaluate(() => {
    const s = document.getElementById('faqSearch');
    s.scrollIntoView({ block: 'center' });
    s.focus();
  });
  const paradas = [];
  let saiuPara = null;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const p = await page.evaluate((sel) => {
      const a = document.activeElement;
      if (!a || a === document.body) return { dentro: false, rotulo: 'body' };
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      const cards = [...document.querySelectorAll(sel)];
      const nome = a.querySelector?.('.faq__category-name')?.textContent.trim();
      return {
        dentro: document.getElementById('faq').contains(a),
        rotulo: nome || a.getAttribute('aria-label') || a.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) || a.tagName.toLowerCase(),
        indice: cards.indexOf(a),
        topo: Math.round(r.top + scrollY),
        esquerda: Math.round(r.left),
        anel: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 ? `${cs.outlineWidth} ${cs.outlineColor}` : null,
        naTela: r.bottom > 0 && r.top < innerHeight,
        chave: `${a.tagName}#${a.id}.${a.className}|${r.top + scrollY}|${r.left}`,
      };
    }, CARD);
    if (!p.dentro) { saiuPara = p.rotulo; break; }
    paradas.push(p);
  }
  const cards = paradas.filter((p) => p.indice >= 0);
  const visual = [...cards].sort((a, b) => a.topo - b.topo || a.esquerda - b.esquerda);
  const chaves = paradas.map((p) => p.chave);
  return {
    paradas: paradas.length,
    cards: cards.length,
    ordemVisual: cards.every((c, i) => c.indice === visual[i].indice),
    ordemDom: cards.every((c, i) => c.indice === i),
    semAnel: paradas.filter((p) => !p.anel).map((p) => p.rotulo),
    foraDaTela: paradas.filter((p) => !p.naTela).map((p) => p.rotulo),
    repetidas: chaves.length - new Set(chaves).size,
    saiuPara,
    anel: cards[0]?.anel ?? null,
    sequencia: paradas.map((p) => p.rotulo),
  };
}

async function busca(page) {
  await page.evaluate(() => document.getElementById('faqSearch').scrollIntoView({ block: 'center' }));
  await page.focus('#faqSearch');
  await page.keyboard.type('saque', { delay: 40 });
  let chegou = true;
  await page.waitForSelector('#faqResultsList .faq__result-item', { timeout: 10_000 }).catch(() => { chegou = false; });
  const r = await page.evaluate(() => ({
    resultados: document.querySelectorAll('#faqResultsList .faq__result-item').length,
    contagem: document.getElementById('faqResultsCount')?.textContent.trim(),
    categoriasEscondidas: getComputedStyle(document.getElementById('faqCategories')).display === 'none',
  }));
  r.chegou = chegou;
  if (chegou) {
    await page.click('#faqResultsList .faq__result-item');
    await page.waitForSelector('#faqModal.is-open', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    Object.assign(r, await page.evaluate(() => ({
      modalAbriu: !document.getElementById('faqModal').hidden,
      tituloModal: document.getElementById('faqModalTitle').textContent.trim(),
      corpoModal: document.getElementById('faqModalBody').textContent.trim().length,
    })));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    r.modalFechou = await page.evaluate(() => document.getElementById('faqModal').hidden);
    await page.click('#faqClearSearch');
    await page.waitForTimeout(300);
    r.limpou = await page.evaluate(() => document.getElementById('faqResults').hidden
      && getComputedStyle(document.getElementById('faqCategories')).display !== 'none');
  }
  return r;
}

async function painelEModal(page) {
  await page.click(CARD);
  await page.waitForSelector('#faqExpandedPanel.is-open', { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
  const aberto = await page.evaluate((sel) => {
    const p = document.getElementById('faqExpandedPanel');
    const card = document.querySelector(sel);
    return {
      painel: Boolean(p && !p.hidden && p.classList.contains('is-open')),
      posicaoPainel: p ? getComputedStyle(p).position : null,
      depoisDe: p?.previousElementSibling?.id ?? null,
      fecharNoPainel: Boolean(p?.querySelector('.faq__expanded-close')),
      artigos: p ? p.querySelectorAll('.faq__expanded-article').length : 0,
      ariaExpanded: card.getAttribute('aria-expanded'),
      cardAceso: card.classList.contains('is-active') ? getComputedStyle(card).borderTopColor : null,
    };
  }, CARD);
  await page.click('#faqExpandedPanel .faq__expanded-article');
  await page.waitForSelector('#faqModal.is-open', { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  const comModal = await page.evaluate(() => {
    const m = document.getElementById('faqModal');
    const p = document.getElementById('faqExpandedPanel');
    const abertos = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')]
      .filter((d) => !d.hidden && getComputedStyle(d).display !== 'none');
    return {
      modal: !m.hidden && m.classList.contains('is-open'),
      posicaoModal: getComputedStyle(m).position,
      painelPorBaixo: Boolean(p && !p.hidden && p.classList.contains('is-open')),
      dialogos: abertos.length,
      foco: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName,
    };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const depois = await page.evaluate(() => ({
    modalFechou: document.getElementById('faqModal').hidden,
    focoNoArtigo: document.activeElement?.classList.contains('faq__expanded-article') ?? false,
    painelContinua: document.getElementById('faqExpandedPanel')?.classList.contains('is-open') ?? false,
  }));
  await page.click(CARD);
  await page.waitForTimeout(500);
  const fechado = await page.evaluate((sel) => ({
    ariaExpanded: document.querySelector(sel).getAttribute('aria-expanded'),
    painelFechou: !document.getElementById('faqExpandedPanel')?.classList.contains('is-open'),
  }), CARD);
  return { aberto, comModal, depois, fechado };
}

async function hover(page) {
  await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), CARD);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
  const ler = () => page.evaluate((sel) => {
    const c = document.querySelector(sel);
    const cs = getComputedStyle(c);
    const s = c.querySelector('.card-ajuda__seta');
    const ss = s ? getComputedStyle(s) : null;
    return {
      topo: c.getBoundingClientRect().top,
      setaX: s ? s.getBoundingClientRect().left : null,
      borda: cs.borderTopColor,
      translate: cs.translate,
      transform: cs.transform,
      sombra: cs.boxShadow,
      duracoes: cs.transitionDuration,
      propriedades: cs.transitionProperty,
      setaCor: ss?.color ?? null,
      setaTranslate: ss?.translate ?? null,
    };
  }, CARD);
  const repouso = await ler();
  await page.hover(CARD);
  await page.waitForTimeout(450);
  const acesa = await ler();
  const r1 = (v) => Math.round(v * 100) / 100;
  return {
    repouso,
    acesa,
    subiu: r1(repouso.topo - acesa.topo),
    setaAndou: repouso.setaX == null ? null : r1(acesa.setaX - repouso.setaX),
  };
}

// Expansão progressiva (fase 12): mede a seção fechada, abre pelo controle,
// mede aberta e fecha de novo. Devolve também o estado do botão, o
// esmaecido, o foco ao alternar e se a troca de altura foi animada.
async function expansao(page) {
  const ler = () => page.evaluate(() => {
    const grade = document.getElementById('faqCategories');
    const botao = document.getElementById('faqMais');
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const n = (v) => (v == null ? null : Math.round(v * 10) / 10);
    const cards = [...grade.querySelectorAll('.faq__category-card')];
    const naTela = cards.filter((c) => getComputedStyle(c).display !== 'none');
    const cs = botao ? getComputedStyle(botao) : null;
    const icone = botao ? botao.querySelector('ion-icon') : null;
    const esm = getComputedStyle(grade, '::after');
    const rb = r(botao);
    return {
      cards: cards.length,
      visiveis: naTela.length,
      fileiras: new Set(naTela.map((c) => Math.round(r(c).top))).size,
      alturaFaq: Math.round(r(document.getElementById('faq')).height),
      alturaGrade: Math.round(r(grade).height),
      recolhida: grade.classList.contains('is-recolhida'),
      botao: botao && !botao.hidden && cs.display !== 'none' ? {
        alvo: n(Math.min(rb.width, rb.height)),
        raio: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(' '),
        expandido: botao.getAttribute('aria-expanded'),
        controla: botao.getAttribute('aria-controls'),
        nome: botao.getAttribute('aria-label'),
        texto: botao.textContent.trim(),
        giro: icone ? getComputedStyle(icone).transform : null,
        duracao: icone ? getComputedStyle(icone).transitionDuration : null,
      } : null,
      esmaecido: esm.content !== 'none' ? { altura: esm.height, fundo: esm.backgroundImage.slice(0, 48), toque: esm.pointerEvents } : null,
      lateral: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  const fechada = await ler();
  if (!fechada.botao) return { fechada, aberta: null, focoNoBotao: null, voltou: null, animou: null };

  await page.evaluate(() => document.getElementById('faqMais').scrollIntoView({ block: 'center' }));
  await page.click('#faqMais');
  // com movimento reduzido a troca é seca: o JS nem arma a altura em linha
  const animou = await page.evaluate(() => document.getElementById('faqCategories').style.height !== '');
  await page.waitForTimeout(700);
  const aberta = await ler();
  const focoNoBotao = await page.evaluate(() => Boolean(document.activeElement) && document.activeElement.id === 'faqMais');
  await page.click('#faqMais');
  await page.waitForTimeout(700);
  const volta = await ler();
  return { fechada, aberta, focoNoBotao, animou, voltou: volta.recolhida && volta.visiveis === fechada.visiveis };
}

const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const saida = { data: new Date().toISOString().slice(0, 10), larguras: {}, expansao: {}, forma: {}, teclado: {}, busca: {}, painel: {}, hover: {} };
const base = { deviceScaleFactor: 1, locale: 'pt-BR', reducedMotion: 'reduce' };
const toque = await nav.newContext({ ...base, viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true });
const mesa = await nav.newContext({ ...base, viewport: { width: 1474, height: 900 } });
try {
  const pToque = await toque.newPage();
  const pMesa = await mesa.newPage();
  for (const w of LARGURAS) {
    const page = w < 1080 ? pToque : pMesa;
    await page.setViewportSize({ width: w, height: 900 });
    await prepararPagina(page, servidor.url);
    await page.waitForSelector(CARD, { timeout: 10_000 }).catch(() => {});
    const m = await page.evaluate(medirGrade);
    saida.larguras[w] = m;
    saida.expansao[w] = await expansao(page);
    const ex = saida.expansao[w];
    console.log('        expansão: ' + ex.fechada.visiveis + '/' + ex.fechada.cards + ' em '
      + ex.fechada.fileiras + ' fileiras · #faq ' + ex.fechada.alturaFaq + ' → '
      + (ex.aberta ? ex.aberta.alturaFaq : '—') + ' · controle '
      + (ex.fechada.botao ? ex.fechada.botao.alvo + 'px' : 'ausente') + ' · esmaecido '
      + (ex.fechada.esmaecido ? ex.fechada.esmaecido.altura : 'não') + ' · volta ' + ex.voltou);
    console.log(`  ${String(w).padStart(4)}: ${m.n} cards · ${m.colunas} col (fase 10: ${COLUNAS(w)}) × ${m.fileiras} · altura ${m.altMin}–${m.altMax} · focáveis ${m.focaveis} · título ${m.titulo?.min} · desc ${m.descricao?.min} (${m.linhasDesc}/${m.linhasDescTexto} linhas) · contagem ${m.contagem?.min} · estouro ${m.estouro.length} · lateral ${m.rolagemLateral} · #faq ${m.alturaFaq}px`);

    if (w === 390 || w === 1474) {
      saida.forma[w] = await page.evaluate(medirForma);
      saida.teclado[w] = await teclado(page);
      if (saida.expansao[w].fechada.botao) {
        await page.click('#faqMais');
        await page.waitForTimeout(700);
        saida.teclado[w + ' aberta'] = await teclado(page);
        await page.click('#faqMais');
        await page.waitForTimeout(700);
      }
      console.log(`        teclado: ${saida.teclado[w].paradas} paradas, ${saida.teclado[w].cards} cards, ordem ${saida.teclado[w].ordemVisual ? 'ok' : 'FORA'}, sem anel ${saida.teclado[w].semAnel.length}, repetidas ${saida.teclado[w].repetidas}, saiu para ${saida.teclado[w].saiuPara}`);
      saida.busca[w] = await busca(page);
      console.log(`        busca: ${saida.busca[w].chegou ? `${saida.busca[w].resultados} resultados` : 'NADA'} · modal ${saida.busca[w].modalAbriu ? 'abriu' : '—'}`);
      saida.painel[w] = await painelEModal(page);
      console.log(`        painel: ${saida.painel[w].aberto.painel ? 'abriu' : 'não abriu'} · modal por cima: ${saida.painel[w].comModal.modal ? 'sim' : 'não'} · painel por baixo: ${saida.painel[w].comModal.painelPorBaixo ? 'sim' : 'não'}`);
    }
    if (w === 1474) saida.hover.reduzido = await hover(page);
  }

  const mov = await nav.newContext({ ...base, reducedMotion: 'no-preference', viewport: { width: 1474, height: 900 } });
  const pMov = await mov.newPage();
  await prepararPagina(pMov, servidor.url);
  await pMov.waitForSelector(CARD, { timeout: 10_000 }).catch(() => {});
  saida.hover.movimento = await hover(pMov);
  await mov.close();
  console.log(`  hover 1474: sobe ${saida.hover.movimento.subiu}px, seta ${saida.hover.movimento.setaAndou}px; reduzido: sobe ${saida.hover.reduzido.subiu}px, translate ${saida.hover.reduzido.acesa.translate}`);
} finally {
  await toque.close();
  await mesa.close();
  await nav.close();
  await servidor.fechar();
}

const n = (v) => (v == null ? '—' : String(v).replace('.', ','));
const faixa = (o) => (o ? (o.min === o.max ? `${n(o.min)}` : `${n(o.min)}–${n(o.max)}`) : '—');
const L = [];
L.push(`# Card da central de ajuda — verificação${ROTULO ? ` (${ROTULO})` : ''}`, '');
L.push(`Gerado por \`node scripts/faq.mjs${ROTULO ? ` ${ROTULO}` : ''}\` em ${saida.data.split('-').reverse().join('/')}. Página preparada pelo harness, movimento reduzido, tela de 900px de altura, contexto de toque abaixo de 1080. As categorias vêm da API da central pelo cache do harness.`, '');
L.push('## Grade', '');
L.push('"Colunas": as posições distintas de card na horizontal; "fase 10" é o que a grade pede (4 de 1200 em diante, 2 de 768 a 1199, 1 abaixo). "Focáveis": o maior número de elementos focáveis num card, contando o próprio card e o que estiver em shadow root. "Alvo": o menor lado do menor card. "Estouro": card fora da grade ou conteúdo fora do card.', '');
L.push('| Largura | Cards | Colunas (fase 10) | Fileiras | Altura dos cards | Focáveis | Alvo | Estouro | Rolagem lateral | Paginação | #faq | Página |', '|---:|---:|---|---:|---|---:|---:|---:|---:|---|---:|---:|');
for (const [w, m] of Object.entries(saida.larguras)) {
  L.push(`| ${w} | ${m.n} | ${m.colunas} (${COLUNAS(Number(w))}) | ${m.fileiras} | ${m.altMin === m.altMax ? `${n(m.altMin)}px, todas` : `${n(m.altMin)}–${n(m.altMax)}px`} | ${m.focaveis} | ${n(m.alvo)}px | ${m.estouro.length} | ${m.rolagemLateral} | ${m.paginacao} | ${m.alturaFaq} | ${m.alturaPagina} |`);
}
const estouros = Object.entries(saida.larguras).flatMap(([w, m]) => m.estouro.map((e) => `${w}: ${e}`));
if (estouros.length) L.push('', ...estouros.slice(0, 20).map((e) => `- ${e}`));
L.push('', '## Expansão progressiva', '');
L.push('"Visíveis": cards na tela em repouso, do total. "Fileiras": fileiras na tela em repouso. "#faq": altura da seção fechada → aberta. "Controle": o menor lado do botão do chevron, que é o alvo de toque. "Volta": fechar pelo mesmo botão devolve o estado de repouso.', '');
L.push('| Largura | Visíveis | Fileiras | #faq fechada | #faq aberta | Controle | Canto | aria-expanded | Esmaecido | Foco no botão | Volta | Lateral |', '|---:|---:|---:|---:|---:|---:|---|---|---|:--:|:--:|---:|');
for (const [w, e] of Object.entries(saida.expansao)) {
  const b = e.fechada.botao;
  L.push('| ' + w + ' | ' + e.fechada.visiveis + ' de ' + e.fechada.cards + ' | ' + e.fechada.fileiras
    + ' | ' + e.fechada.alturaFaq + ' | ' + (e.aberta ? e.aberta.alturaFaq : '—')
    + ' | ' + (b ? n(b.alvo) + 'px' : 'ausente')
    + ' | ' + (b ? '`' + b.raio + '`' : '—')
    + ' | ' + (b ? b.expandido + ' → ' + e.aberta.botao.expandido : '—')
    + ' | ' + (e.fechada.esmaecido ? e.fechada.esmaecido.altura + ', ' + e.fechada.esmaecido.toque : 'não')
    + ' | ' + (e.focoNoBotao == null ? '—' : (e.focoNoBotao ? 'sim' : '**não**'))
    + ' | ' + (e.voltou == null ? '—' : (e.voltou ? 'sim' : '**não**'))
    + ' | ' + e.fechada.lateral + ' |');
}
const comControle = Object.entries(saida.expansao).filter(([, e]) => e.fechada.botao);
if (comControle.length) {
  const [w0, e0] = comControle[0];
  L.push('', 'Controle em ' + w0 + ': `aria-controls` ' + e0.fechada.botao.controla
    + ' · nome acessível "' + e0.fechada.botao.nome + '" · texto visível "' + e0.fechada.botao.texto
    + '" · chevron ' + e0.fechada.botao.giro + ' → ' + e0.aberta.botao.giro
    + ', transição ' + e0.aberta.botao.duracao
    + ' · altura animada ao alternar: ' + (e0.animou ? 'sim' : 'não (movimento reduzido)') + '.');
}

L.push('', '## Texto', '');
L.push('Corpo em px. "Linhas da descrição": as visíveis / as do texto inteiro, no card que mais tem — com o line-clamp, as visíveis param em 2 e o resto fica nas reticências. "Seta × algarismos": centro da seta menos o centro dos algarismos da contagem (positivo = seta mais baixa).', '');
L.push('| Largura | Título | Linhas do título | Descrição | Linhas da descrição | Cortadas | Contagem | Seta × algarismos |', '|---:|---:|---:|---:|---|---:|---:|---|');
for (const [w, m] of Object.entries(saida.larguras)) {
  L.push(`| ${w} | ${faixa(m.titulo)} | ${m.linhasTitulo} | ${faixa(m.descricao)} | ${m.linhasDesc} / ${m.linhasDescTexto} | ${m.cortadas} de ${m.n} | ${faixa(m.contagem)} | ${m.seta ? `${n(m.seta.min)} a ${n(m.seta.max)}px` : '—'} |`);
}
L.push('', '## Forma e superfície', '');
for (const [w, f] of Object.entries(saida.forma)) {
  L.push(`**${w}px**`, '');
  L.push(`- Card: canto \`${f.card.raio}\` · fundo ${f.card.fundo} · borda ${f.card.borda} · sombra \`${f.card.sombra}\` · padding ${f.card.padding}.`);
  L.push(`- Saiu? trilho: ${f.card.trilho} · pílula da contagem: ${f.card.pilula} · chevron: ${f.card.chevron}. Seta: ${f.card.seta}. \`aria-expanded\`: ${f.card.ariaExpanded ?? '—'}.`);
  L.push(`- Tinta: título ${f.card.corTitulo} (peso ${f.card.pesoTitulo}) · descrição ${f.card.corDescricao} · contagem ${f.card.corContagem}, \`${f.card.numeros}\`.`);
  L.push(`- Busca: canto \`${f.busca.raio}\` · fundo ${f.busca.fundo} · borda ${f.busca.borda} · altura ${n(f.busca.altura)}px · placeholder "${f.busca.placeholder}".`);
  if (f.cta) L.push(`- CTA: \`${f.cta.classes}\` · canto \`${f.cta.raio}\` · altura ${n(f.cta.altura)}px.`);
  if (f.modal) L.push(`- Modal: canto \`${f.modal.raio}\`.`);
  L.push('');
}
L.push('## Teclado', '');
L.push('Do campo de busca, Tab até o foco sair do #faq. "Ordem": os cards na sequência do Tab contra a ordem visual (fileira, depois coluna). "Repetidas": a mesma parada duas vezes — travamento.', '');
L.push('| Largura | Paradas na seção | Cards | Ordem visual | Sem anel | Fora da tela | Repetidas | Saiu para | Anel |', '|---:|---:|---:|:--:|---:|---:|---:|---|---|');
for (const [w, t] of Object.entries(saida.teclado)) {
  L.push(`| ${w} | ${t.paradas} | ${t.cards} | ${t.ordemVisual ? 'sim' : '**não**'} | ${t.semAnel.length} | ${t.foraDaTela.length} | ${t.repetidas} | ${t.saiuPara ?? '**não saiu**'} | ${t.anel ?? '—'} |`);
}
for (const [w, t] of Object.entries(saida.teclado)) L.push('', `Sequência em ${w}: ${t.sequencia.join(' → ')} → (${t.saiuPara})`);
L.push('', '## Hover (1474)', '');
for (const [modo, h] of Object.entries(saida.hover)) {
  L.push(`- ${modo === 'movimento' ? 'Sem preferência de movimento' : 'Movimento reduzido'}: borda ${h.repouso.borda} → ${h.acesa.borda}; o card sobe ${n(h.subiu)}px (\`translate: ${h.acesa.translate}\`, \`transform: ${h.acesa.transform}\`); a seta anda ${n(h.setaAndou)}px e vai de ${h.repouso.setaCor} para ${h.acesa.setaCor}; sombra \`${h.acesa.sombra}\`; transições \`${h.acesa.propriedades}\` em \`${h.acesa.duracoes}\`.`);
}
L.push('', '## Busca', '');
for (const [w, b] of Object.entries(saida.busca)) {
  L.push(`- ${w}: digitando "saque", ${b.chegou ? `${b.resultados} resultados ("${b.contagem}"), com a grade escondida: ${b.categoriasEscondidas ? 'sim' : 'não'}; o primeiro abre o modal: ${b.modalAbriu ? `sim ("${b.tituloModal}", ${b.corpoModal} caracteres)` : 'não'}; Esc fecha: ${b.modalFechou ? 'sim' : 'não'}; "Limpar busca" volta à grade: ${b.limpou ? 'sim' : 'não'}` : 'nenhum resultado em 10s'}.`);
}
L.push('', '## Do card ao artigo', '');
for (const [w, p] of Object.entries(saida.painel)) {
  L.push(`- ${w}: o card abre o painel: ${p.aberto.painel ? 'sim' : 'não'} (\`position: ${p.aberto.posicaoPainel}\`, depois de #${p.aberto.depoisDe}, com X próprio: ${p.aberto.fecharNoPainel ? 'sim' : 'não'}, ${p.aberto.artigos} artigos; \`aria-expanded\` ${p.aberto.ariaExpanded ?? '—'}; borda do card ${p.aberto.cardAceso ?? '—'}). Um artigo abre o modal: ${p.comModal.modal ? 'sim' : 'não'} (\`position: ${p.comModal.posicaoModal}\`), com o painel aberto por baixo: ${p.comModal.painelPorBaixo ? 'sim' : 'não'}; diálogos abertos: ${p.comModal.dialogos}; foco em ${p.comModal.foco}. Esc fecha o modal: ${p.depois.modalFechou ? 'sim' : 'não'}, o foco volta ao artigo: ${p.depois.focoNoArtigo ? 'sim' : 'não'}, o painel continua: ${p.depois.painelContinua ? 'sim' : 'não'}. O mesmo card fecha o painel: ${p.fechado.painelFechou ? 'sim' : 'não'} (\`aria-expanded\` ${p.fechado.ariaExpanded ?? '—'}).`);
}
L.push('');
const nome = ROTULO ? `faq-${ROTULO}.md` : 'faq.md';
await writeFile(path.join(RAIZ, 'medidas', nome), L.join('\n'));
console.log(`\nSalvo medidas/${nome}`);
