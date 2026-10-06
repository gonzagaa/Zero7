// Sonda do celular (fase 8), nas larguras de iPhone (320, 375, 390, 430) e em
// 768 e 1474. Seis leituras:
//  1. texto abaixo de 16px, por categoria (conteúdo, rótulo, controle…);
//  2. elementos que passam da viewport, ou que ficam cortados por um ancestral;
//  3. o menu mobile aberto: painel, botões, scrim, e fechar tocando no scrim;
//  4. a nav sobre a seção clara (#topicos): fundo e backdrop-filter;
//  5. os cards de benefício do #ba: corte, e se abrem ao roçar ou no toque;
//  6. medidas pontuais: herói, títulos, CTAs, nota dos planos, vão até o
//     rodapé, rodapé e barra legal.
//   node scripts/movel.mjs <rótulo>   # medidas/<rótulo>-movel.md
//                                      # + shots/<rótulo>/{menu,nav-topicos}-<largura>.png
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rotulo = process.argv[2];
if (!rotulo) {
  console.error('uso: node scripts/movel.mjs <rótulo>');
  process.exit(1);
}

const LARGURAS = [320, 375, 390, 430, 768, 1474];
const CELULAR = [320, 375, 390, 430];
// alturas de tela: iPhone SE (1ª geração), 13 mini, 13/14/15, Pro Max; iPad; desktop
const ALTURA = { 320: 568, 375: 812, 390: 844, 430: 932, 768: 1024, 1474: 900 };
const toque = (w) => w < 1080;

// ── coleta, dentro da página ────────────────────────────────────────────────
function coletar() {
  const W = innerWidth;
  const q = (s) => document.querySelector(s);
  const px = (v) => Math.round(v * 10) / 10;
  const visivel = (el) => !!el && el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })
    && el.getClientRects().length > 0 && !el.closest('[inert]');
  const textoProprio = (el) => [...el.childNodes].filter((n) => n.nodeType === 3)
    .map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const secao = (el) => {
    const s = el.closest('section[id], header[id], footer[id], nav[id]');
    return s ? `#${s.id}` : '—';
  };
  const nome = (el) => el.tagName.toLowerCase()
    + (typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const fs = (el) => px(parseFloat(getComputedStyle(el).fontSize));
  const conteudo = (el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { esq: r.left + parseFloat(cs.paddingLeft), dir: r.right - parseFloat(cs.paddingRight) };
  };

  // texto de cada linha, em ordem de leitura (só o que está visível)
  const linhas = (el) => {
    const out = [];
    let atual = null;
    const rg = document.createRange();
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!visivel(n.parentElement)) continue;
      const t = n.textContent;
      const tol = parseFloat(getComputedStyle(n.parentElement).fontSize) * 0.45;
      for (let i = 0; i < t.length; i++) {
        rg.setStart(n, i);
        rg.setEnd(n, i + 1);
        const r = rg.getClientRects()[0];
        if (!r || r.width === 0) continue;
        const cy = r.top + r.height / 2;
        if (!atual || Math.abs(cy - atual.cy) > tol) {
          atual = { cy, s: '' };
          out.push(atual);
        }
        atual.s += t[i];
      }
    }
    return out.map((l) => l.s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  };

  // contraste WCAG, com a cor da frente composta sobre o fundo
  const rgb = (s) => {
    const m = (s.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
    return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const fundo = (el) => {
    for (let a = el; a; a = a.parentElement) {
      const c = rgb(getComputedStyle(a).backgroundColor);
      if (c.a > 0.5) return c;
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  };
  const contraste = (el) => {
    const F = rgb(getComputedStyle(el).color), B = fundo(el);
    const mix = { r: F.r * F.a + B.r * (1 - F.a), g: F.g * F.a + B.g * (1 - F.a), b: F.b * F.a + B.b * (1 - F.a) };
    const l1 = lum(mix), l2 = lum(B);
    return px((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
  };

  const categoria = (el) => {
    if (el.closest('.tarjaImage, .tarjaTimerNav, .tarjaTimer, .countdown')) return 'tarja (regra 5)';
    if (el.closest('#ra-verified-seal')) return 'terceiro';
    if (el.closest('.chip__rotulo')) return 'rótulo de chip';
    // Exceções pedidas pelo cliente na fase 8: dentro do card de plano os
    // tamanhos ficam os de antes (em 16px os chips quebravam e o card
    // crescia), e o texto dos cards do #topicos fica em 14px
    if (el.closest('.planos .card, #topicos .cards .card .text')) return 'exceção do cliente';
    if (el.closest('#author .disclaimer')) return 'aviso legal';
    if (el.closest('#author, #footer .rodape__cnpj')) return 'barra legal';
    // pílulas e contagens: rótulo, mesmo sem caixa alta
    if (el.closest('.faq__category-count, #suporte .whatsapp > span, #suporte .ajuda > span, .card-tarja')) return 'rótulo';
    // os cards da central de ajuda são <button> por fora, mas o que está
    // dentro é título e descrição de card: conteúdo
    if (el.closest('.card-ajuda')) return 'conteúdo';
    if (el.closest('button, .btn, [role="button"], [role="radio"], input, .swiper-pagination, .faq__pagination-info, #navigation')) return 'controle';
    if (el.closest('#footer .navigation a, #footer .redes-sociais')) return 'navegação';
    const cs = getComputedStyle(el);
    if (cs.textTransform === 'uppercase' && parseFloat(cs.letterSpacing) > 0.3) return 'rótulo';
    return 'conteúdo';
  };

  // 1. texto abaixo de 16px
  const pequenos = {};
  for (const el of document.body.querySelectorAll('*')) {
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
    const t = textoProprio(el);
    if (!t || !visivel(el)) continue;
    const f = fs(el);
    if (f >= 15.95) continue;
    const cat = categoria(el);
    const k = `${cat}|${secao(el)}|${nome(el)}|${f}`;
    pequenos[k] ??= { cat, secao: secao(el), el: nome(el), fs: f, n: 0, texto: t.slice(0, 36) };
    pequenos[k].n++;
  }

  // 2. estouro: além da viewport (visível) ou cortado por um ancestral
  const estouros = [];
  const cortes = (el) => {
    const r = el.getBoundingClientRect();
    let x0 = r.left, x1 = r.right;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) {
        const ra = a.getBoundingClientRect();
        x0 = Math.max(x0, ra.left);
        x1 = Math.min(x1, ra.right);
      }
    }
    return { r, x0, x1 };
  };
  for (const el of document.body.querySelectorAll('*')) {
    if (!visivel(el)) continue;
    if (el.matches('img[alt=""], [aria-hidden="true"], [aria-hidden="true"] *')) continue;
    const t = textoProprio(el);
    if (!t && !el.matches('img, video, button, a, input, ion-icon, .btn')) continue;
    const { r, x0, x1 } = cortes(el);
    if (r.width === 0 || (r.left >= -0.5 && r.right <= W + 0.5)) continue;
    if (x1 - x0 <= 0.5) continue; // inteiro fora de vista, cortado: não aparece
    const passa = x0 < -0.5 || x1 > W + 0.5;
    estouros.push({
      secao: secao(el), el: nome(el), esq: px(r.left), dir: px(r.right),
      tipo: passa ? 'passa da viewport' : 'cortado por ancestral',
      texto: (t || el.getAttribute('aria-label') || el.getAttribute('alt') || '').slice(0, 30),
    });
  }

  // 6. pontuais
  const h1 = q('#home h1'), hp = q('#home p'), txt = q('#home .text');
  const nav = q('#navigation')?.getBoundingClientRect();
  const imgM = q('#home .image img.mobile');
  const hero = h1 && {
    h1: fs(h1), h1Linhas: linhas(h1),
    h1Esq: px(h1.getBoundingClientRect().left), h1Dir: px(W - h1.getBoundingClientRect().right),
    blocoEsq: px(txt.getBoundingClientRect().left), blocoDir: px(W - txt.getBoundingClientRect().right),
    p: hp ? fs(hp) : null, pLinhas: hp ? linhas(hp).length : null,
    navBase: nav ? px(nav.bottom) : null,
    img: visivel(imgM) ? {
      topo: px(imgM.getBoundingClientRect().top), altura: px(imgM.getBoundingClientRect().height),
      objectPosition: getComputedStyle(imgM).objectPosition,
    } : null,
  };

  const titulo = (s) => {
    const e = q(s);
    return visivel(e) ? { fs: fs(e), linhas: linhas(e) } : null;
  };
  const titulos = {
    ba: titulo('#ba .ba-header h2'), topicos: titulo('#topicos header h2'),
    depoimentos: titulo('#depoimentos header h2'), topicosP: q('#topicos .cards .card .text p') ? fs(q('#topicos .cards .card .text p')) : null,
  };

  const dh = q('#depoimentos header'), dp = q('#depoimentos header p'), dcta = q('#depoimentos header .btn');
  const dw = q('#depoimentos .wrapper');
  const depo = dh && {
    colunaWrapper: px(conteudo(dw).dir - conteudo(dw).esq), cabecalho: px(dh.getBoundingClientRect().width),
    p: px(dp.getBoundingClientRect().width), pFs: fs(dp), pMaxWidth: getComputedStyle(dp).maxWidth,
    cta: dcta ? px(dcta.getBoundingClientRect().width) : null,
  };

  const obs = [...document.querySelectorAll('#plan p.obs')].find(visivel);
  const ref = q('#plan .plano-asset--indice .swiper') || q('#plan .wrapper');
  const nota = obs && {
    esq: px(obs.getBoundingClientRect().left), dir: px(W - obs.getBoundingClientRect().right),
    fs: fs(obs), refEsq: ref ? px(ref.getBoundingClientRect().left) : null,
    refDir: ref ? px(W - ref.getBoundingClientRect().right) : null,
    colunaEsq: px(conteudo(q('#plan .wrapper') || document.body).esq),
  };

  const aj = q('#suporte .ajuda'), ajBtn = q('#suporte .ajuda .btn');
  const ajuda = aj && ajBtn && {
    colunaCard: px(conteudo(aj).dir - conteudo(aj).esq), botao: px(ajBtn.getBoundingClientRect().width),
    alturaBotao: px(ajBtn.getBoundingClientRect().height), classe: ajBtn.className,
  };

  const baseContato = q('#suporte')?.getBoundingClientRect().bottom;
  const topoRodape = [...document.querySelectorAll('#footer .content *')].find(visivel)?.getBoundingClientRect().top;
  const baseFaq = (q('#faq .faq__cta') || q('#faq .wrapper'))?.getBoundingClientRect().bottom;
  const topoContato = q('#contato header')?.getBoundingClientRect().top;
  const vaos = {
    contatoRodape: baseContato != null && topoRodape != null ? px(topoRodape - baseContato) : null,
    faqContato: baseFaq != null && topoContato != null ? px(topoContato - baseFaq) : null,
  };

  const ft = q('#footer');
  const links = [...document.querySelectorAll('#footer .navigation a')].filter(visivel);
  const tops = links.map((a) => a.getBoundingClientRect().top).sort((a, b) => a - b);
  const passos = tops.slice(1).map((t, i) => t - tops[i]).sort((a, b) => a - b);
  const socialA = [...document.querySelectorAll('#footer .redes-sociais a')].filter(visivel);
  const socialH = q('#footer .redes-sociais h3');
  const imgsPag = [...document.querySelectorAll('#pagamento img')].filter(visivel).map((i) => i.getBoundingClientRect());
  const selo = q('#ra-verified-seal');
  const rodape = ft && {
    altura: px(ft.getBoundingClientRect().height),
    colunas: getComputedStyle(q('#footer .content')).display === 'grid'
      ? getComputedStyle(q('#footer .content')).gridTemplateColumns : 'uma coluna (flex)',
    passoLinks: passos.length ? px(passos[Math.floor(passos.length / 2)]) : null,
    alvoLink: links[0] ? `${px(links[0].getBoundingClientRect().width)}×${px(links[0].getBoundingClientRect().height)}` : null,
    corLink: links[0] ? getComputedStyle(links[0]).color : null,
    contrasteLink: links[0] ? contraste(links[0]) : null,
    enderecoHorario: [...ft.querySelectorAll('p')].filter((p) => visivel(p) && /Jamel|Segunda a sexta/.test(p.textContent)).length,
    social: socialA.map((a) => `${px(a.getBoundingClientRect().width)}×${px(a.getBoundingClientRect().height)}`).join(' '),
    socialDesvioEsq: socialA[0] && socialH ? px(socialA[0].getBoundingClientRect().left - socialH.getBoundingClientRect().left) : null,
    pagamentoAltura: imgsPag.length ? px(Math.max(...imgsPag.map((r) => r.height))) : null,
    pagamentoDesalinho: imgsPag.length ? px(Math.max(...imgsPag.map((r) => r.top)) - Math.min(...imgsPag.map((r) => r.top))) : null,
    pagamentoLinhas: new Set(imgsPag.map((r) => Math.round(r.top / 8))).size,
    seloBase: selo ? px(ft.getBoundingClientRect().bottom - selo.getBoundingClientRect().bottom) : null,
    seloAltura: selo ? px(selo.getBoundingClientRect().height) : null,
    seloConteudo: selo ? px(Math.max(0, ...[...selo.querySelectorAll('*')].map((e) => e.getBoundingClientRect().bottom)) - selo.getBoundingClientRect().bottom) : null,
  };

  const au = q('#author');
  const la = [...document.querySelectorAll('#author .content a')].filter(visivel).map((a) => a.getBoundingClientRect());
  const disc = q('#author .disclaimer');
  const autor = au && {
    ano: (q('#author .content')?.textContent.match(/©\s*(\d{4})/) || [])[1] || null,
    linksEmLinha: la.length > 1 ? Math.max(...la.map((r) => r.top)) - Math.min(...la.map((r) => r.top)) < 4 : null,
    passoLinks: la.length > 1 ? px(la[1].top - la[0].top) : null,
    avisoFs: disc ? fs(disc) : null, avisoAlinhamento: disc ? getComputedStyle(disc).textAlign : null,
    avisoContraste: disc ? contraste(disc) : null,
  };

  return {
    scrollX: document.documentElement.scrollWidth > W + 0.5, larguraDoc: document.documentElement.scrollWidth,
    pequenos: Object.values(pequenos), estouros, hero, titulos, depo, nota, ajuda, vaos, rodape, autor,
  };
}

// ── menu aberto ─────────────────────────────────────────────────────────────
function lerMenu() {
  const W = innerWidth, H = innerHeight;
  const painel = document.querySelector('#navigation .menu');
  const rp = painel.getBoundingClientRect();
  const limite = Math.min(rp.right, W);
  const itens = [...painel.querySelectorAll('a')].map((a) => {
    const r = a.getBoundingClientRect();
    const cap = a.querySelector('.btn__cap')?.getBoundingClientRect();
    return {
      texto: (a.textContent || '').replace(/\s+/g, ' ').trim() || a.getAttribute('aria-label'),
      dir: Math.round(r.right * 10) / 10,
      passa: r.right > limite + 0.5 || (cap ? cap.right > limite + 0.5 : false),
    };
  });
  // o que está sob um ponto da página fora do painel
  const x = Math.max(6, Math.min(rp.left - 16, W * 0.12));
  const y = Math.round(H * 0.72);
  const h = document.elementFromPoint(x, y);
  const scrim = h?.closest('.menu-scrim') || null;
  return {
    W,
    painel: { esq: Math.round(rp.left), dir: Math.round(rp.right), largura: Math.round(rp.width), altura: Math.round(rp.height) },
    itens, ponto: { x, y },
    sob: h ? h.tagName.toLowerCase() + (typeof h.className === 'string' && h.className ? '.' + h.className.split(/\s+/)[0] : '') : null,
    scrim: scrim ? { fundo: getComputedStyle(scrim).backgroundColor, transicao: getComputedStyle(scrim).transitionDuration } : null,
  };
}

// ── cards de benefício: roçar (mouseenter sintético) ─────────────────────────
async function rocarCards() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  for (const c of document.querySelectorAll('#ba .ba-card--info')) {
    const d = c.querySelector('.card-beneficio__descricao');
    const cs = getComputedStyle(d);
    const h0 = d.getBoundingClientRect().height;
    c.dispatchEvent(new MouseEvent('mouseenter'));
    await espera(900);
    const h1 = d.getBoundingClientRect().height;
    c.dispatchEvent(new MouseEvent('mouseleave'));
    await espera(900);
    out.push({
      titulo: c.querySelector('.card-beneficio__titulo')?.textContent.trim(),
      clamp: cs.webkitLineClamp || 'none', reticencias: cs.textOverflow,
      altura: Math.round(h0), abreAoRocar: h1 > h0 + 4,
    });
  }
  return { hoverNone: matchMedia('(hover: none)').matches, cards: out };
}

function estadoCard(i) {
  const c = document.querySelectorAll('#ba .ba-card--info')[i];
  const d = c.querySelector('.card-beneficio__descricao');
  const seta = c.querySelector('.card-beneficio__seta');
  return {
    altura: Math.round(d.getBoundingClientRect().height),
    aberto: c.classList.contains('is-open'),
    ariaExpanded: c.getAttribute('aria-expanded'),
    seta: getComputedStyle(seta).transform,
  };
}

// ── execução ────────────────────────────────────────────────────────────────
const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
// Capturas do menu e da nav só com CAPTURAS=1: a sonda é numérica. Pasta
// própria: na de shots.mjs as capturas extras entrariam na contagem.
const CAPTURAS = process.env.CAPTURAS === '1';
const pastaShots = path.join(RAIZ, 'shots', `${rotulo}-movel`);
if (CAPTURAS) await mkdir(pastaShots, { recursive: true });
const res = {};
try {
  // Dois contextos, não um por largura: o de toque (abaixo de 1080) e o de
  // mesa. A largura muda pelo viewport e a página recarrega.
  const paginas = {};
  const paginaPara = async (w) => {
    const modo = toque(w) ? 'toque' : 'mesa';
    if (!paginas[modo]) {
      const ctx = await nav.newContext({
        viewport: { width: w, height: ALTURA[w] }, deviceScaleFactor: 1, locale: 'pt-BR',
        reducedMotion: 'no-preference', ...(toque(w) ? { isMobile: true, hasTouch: true } : {}),
      });
      paginas[modo] = await ctx.newPage();
    }
    await paginas[modo].setViewportSize({ width: w, height: ALTURA[w] });
    return paginas[modo];
  };
  for (const w of LARGURAS) {
    const page = await paginaPara(w);
    await prepararPagina(page, servidor.url);
    await page.evaluate(() => document.querySelectorAll('[data-aos]').forEach((el) => el.removeAttribute('data-aos')));
    await page.waitForTimeout(300);
    const r = await page.evaluate(coletar);

    if (toque(w)) {
      // menu aberto
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.evaluate(() => window.openMenu?.());
      await page.waitForTimeout(700);
      r.menu = await page.evaluate(lerMenu);
      if (CAPTURAS) await page.screenshot({ path: path.join(pastaShots, `menu-${w}.png`) });
      if (r.menu.scrim) {
        await page.touchscreen.tap(r.menu.ponto.x, r.menu.ponto.y);
        await page.waitForTimeout(600);
        r.menu.fechaNoScrim = await page.evaluate(() => !document.body.classList.contains('menu-expanded'));
      }
      await page.evaluate(() => window.closeMenu?.());
      await page.waitForTimeout(500);

      // nav sobre o #topicos
      await page.evaluate(() => {
        const t = document.getElementById('topicos');
        window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 30);
      });
      await page.waitForTimeout(700);
      r.nav = await page.evaluate(() => {
        const n = document.getElementById('navigation');
        const cs = getComputedStyle(n);
        const rr = n.getBoundingClientRect();
        return { fundo: cs.backgroundColor, filtro: cs.backdropFilter || cs.webkitBackdropFilter || 'none', base: Math.round(rr.bottom) };
      });
      if (CAPTURAS) await page.screenshot({ path: path.join(pastaShots, `nav-topicos-${w}.png`), clip: { x: 0, y: 0, width: w, height: Math.min(ALTURA[w], r.nav.base + 60) } });

      // cards de benefício: roçar e tocar
      r.ba = await page.evaluate(rocarCards);
      const card = page.locator('#ba .ba-card--info').first();
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await card.tap();
      await page.waitForTimeout(1000);
      r.ba.aposToque = await page.evaluate(estadoCard, 0);
      await card.tap();
      await page.waitForTimeout(1000);
      r.ba.aposSegundoToque = await page.evaluate(estadoCard, 0);
    }
    res[w] = r;
    console.error(`  medido: ${w}px`);
  }
} finally {
  await nav.close();
  await servidor.fechar();
}

// ── relatório ───────────────────────────────────────────────────────────────
const lin = [];
const L = (s = '') => lin.push(s);
const esc = (s) => String(s ?? '—').replace(/\|/g, '\\|');
const sim = (v) => (v == null ? '—' : v ? 'sim' : 'não');
const TOQUE = LARGURAS.filter(toque);

L(`# Sonda do celular — \`${rotulo}\``);
L();
L(`Gerado por \`node scripts/movel.mjs ${rotulo}\` em ${new Date().toISOString().slice(0, 10)}. Contexto de toque (\`isMobile\` + \`hasTouch\`) abaixo de 1080; alturas de tela dos aparelhos (${LARGURAS.map((w) => `${w}×${ALTURA[w]}`).join(', ')}). Os \`data-aos\` saem antes de medir.`);
L();

// 1. texto abaixo de 16px
const CATS = ['conteúdo', 'exceção do cliente', 'rótulo', 'controle', 'navegação', 'rótulo de chip', 'aviso legal', 'barra legal', 'tarja (regra 5)', 'terceiro'];
L('## Texto abaixo de 16px');
L();
L('Elementos visíveis com texto próprio, por categoria. **Conteúdo** tem de chegar a 16px; rótulo de chip e aviso legal têm piso de 12px; a tarja (regra 5) e o selo do Reclame Aqui (terceiro) ficam fora. Rótulo = caixa alta com espaçamento; controle = botão, campo, seletor e indicador; navegação = links e ícones do rodapé.');
L();
L(`| Largura | ${CATS.join(' | ')} |`);
L(`|---:|${CATS.map(() => '---:').join('|')}|`);
for (const w of CELULAR) {
  const n = Object.fromEntries(CATS.map((c) => [c, 0]));
  for (const p of res[w].pequenos) n[p.cat] = (n[p.cat] || 0) + p.n;
  L(`| ${w} | ${CATS.map((c) => n[c]).join(' | ')} |`);
}
L();
for (const w of CELULAR) {
  const lista = res[w].pequenos
    .filter((p) => p.cat === 'conteúdo' || (['rótulo de chip', 'aviso legal', 'barra legal', 'rótulo'].includes(p.cat) && p.fs < 12))
    .sort((x, y) => x.secao.localeCompare(y.secao) || x.fs - y.fs);
  L(`### ${w}px — conteúdo abaixo de 16px, e chip ou aviso abaixo de 12px`);
  L();
  if (!lista.length) { L('Nenhum.'); L(); continue; }
  L('| Categoria | Seção | Elemento | Corpo | Ocorrências | Amostra |');
  L('|---|---|---|---:|---:|---|');
  for (const p of lista) L(`| ${p.cat} | ${p.secao} | \`${esc(p.el)}\` | ${p.fs}px | ${p.n} | ${esc(p.texto)} |`);
  L();
}
L('### 375px — rótulos, controles e navegação abaixo de 16px (fora do piso)');
L();
L('| Categoria | Seção | Elemento | Corpo | Ocorrências | Amostra |');
L('|---|---|---|---:|---:|---|');
for (const p of res[375].pequenos.filter((p) => ['rótulo', 'controle', 'navegação'].includes(p.cat))
  .sort((x, y) => x.cat.localeCompare(y.cat) || x.secao.localeCompare(y.secao))) {
  L(`| ${p.cat} | ${p.secao} | \`${esc(p.el)}\` | ${p.fs}px | ${p.n} | ${esc(p.texto)} |`);
}
L();

// 2. estouro
L('## Estouro da viewport');
L();
L('"Passa da viewport": a parte visível do elemento sai da tela. "Cortado por ancestral": o elemento sai da tela, mas um ancestral com overflow o corta — o que aparece fica dentro, com o resto amputado. Imagens decorativas (`alt=""`, `aria-hidden`) ficam fora.');
L();
L('| Largura | scroll horizontal | passa da viewport | cortado por ancestral |');
L('|---:|:--:|---:|---:|');
for (const w of LARGURAS) {
  const e = res[w].estouros;
  L(`| ${w} | ${sim(res[w].scrollX)} | ${e.filter((x) => x.tipo === 'passa da viewport').length} | ${e.filter((x) => x.tipo !== 'passa da viewport').length} |`);
}
L();
for (const w of LARGURAS) {
  if (!res[w].estouros.length) continue;
  L(`### ${w}px`);
  L();
  L('| Tipo | Seção | Elemento | Esquerda | Direita | Texto |');
  L('|---|---|---|---:|---:|---|');
  for (const e of res[w].estouros.slice(0, 20)) L(`| ${e.tipo} | ${e.secao} | \`${esc(e.el)}\` | ${e.esq} | ${e.dir} | ${esc(e.texto)} |`);
  L();
}

// 3. menu
L('## Menu mobile aberto');
L();
L('Painel e itens em px da viewport. "Sob o ponto" é o elemento que o `elementFromPoint` acha num ponto da página fora do painel — sem scrim, é o conteúdo de trás.');
L();
L('| Largura | painel (esq → dir, largura) | itens que passam do painel ou da tela | sob o ponto | scrim | fecha tocando no scrim |');
L('|---:|---|---|---|---|:--:|');
for (const w of TOQUE) {
  const m = res[w].menu;
  const passa = m.itens.filter((i) => i.passa).map((i) => i.texto);
  L(`| ${w} | ${m.painel.esq} → ${m.painel.dir} (${m.painel.largura}) | ${passa.length ? esc(passa.join(', ')) : 'nenhum'} | \`${esc(m.sob)}\` | ${m.scrim ? `${m.scrim.fundo}, ${m.scrim.transicao}` : 'não há'} | ${sim(m.fechaNoScrim)} |`);
}
L();

// 4. nav sobre o #topicos
L('## Nav sobre a seção clara (#topicos)');
L();
L('| Largura | fundo da nav | backdrop-filter |');
L('|---:|---|---|');
for (const w of TOQUE) L(`| ${w} | ${res[w].nav.fundo} | ${esc(res[w].nav.filtro)} |`);
L();

// 5. cards de benefício
L('## Cards de benefício do #ba');
L();
L('"Abre ao roçar" = um `mouseenter` sintético, o que o dedo rolando dispara, abre o texto. O toque é um `tap` de verdade do Playwright.');
L();
L('| Largura | hover: none | abre ao roçar | line-clamp | reticências | 1º toque: altura, aberto, aria-expanded, seta | 2º toque: altura, aberto |');
L('|---:|:--:|---|---|---|---|---|');
for (const w of TOQUE) {
  const b = res[w].ba;
  const t1 = b.aposToque, t2 = b.aposSegundoToque;
  L(`| ${w} | ${sim(b.hoverNone)} | ${b.cards.map((c) => sim(c.abreAoRocar)).join(' / ')} | ${b.cards[0]?.clamp} | ${b.cards[0]?.reticencias} | ${t1.altura}px, ${sim(t1.aberto)}, ${t1.ariaExpanded ?? '—'}, ${esc(t1.seta)} | ${t2.altura}px, ${sim(t2.aberto)} |`);
}
L();

// 6. pontuais
L('## Herói');
L();
L('| Largura | H1 | linhas do H1 | bloco: margem esq / dir | parágrafo | linhas | base da nav | imagem: topo, object-position |');
L('|---:|---:|---|---|---:|---:|---:|---|');
for (const w of LARGURAS) {
  const h = res[w].hero;
  if (!h) continue;
  L(`| ${w} | ${h.h1}px | ${esc(h.h1Linhas.join(' / '))} | ${h.blocoEsq} / ${h.blocoDir} | ${h.p}px | ${h.pLinhas} | ${h.navBase} | ${h.img ? `${h.img.topo}, ${h.img.objectPosition}` : '—'} |`);
}
L();
L('## Títulos e texto das seções');
L();
L('| Largura | #ba: corpo, linhas | #depoimentos: corpo, linhas | texto dos cards do #topicos |');
L('|---:|---|---|---:|');
for (const w of LARGURAS) {
  const t = res[w].titulos;
  const f = (x) => (x ? `${x.fs}px — ${esc(x.linhas.join(' / '))}` : '—');
  L(`| ${w} | ${f(t.ba)} | ${f(t.depoimentos)} | ${t.topicosP ?? '—'}px |`);
}
L();
L('## #depoimentos, nota dos planos e "Precisa de ajuda?"');
L();
L('| Largura | depoimentos: coluna / cabeçalho / parágrafo (corpo, max-width) / CTA | nota: margem esq / dir, corpo | referência (carrossel): esq / dir | ajuda: coluna do card / botão (altura) |');
L('|---:|---|---|---|---|');
for (const w of LARGURAS) {
  const d = res[w].depo, n = res[w].nota, a = res[w].ajuda;
  L(`| ${w} | ${d ? `${d.colunaWrapper} / ${d.cabecalho} / ${d.p} (${d.pFs}px, ${d.pMaxWidth}) / ${d.cta}` : '—'} | ${n ? `${n.esq} / ${n.dir}, ${n.fs}px` : '—'} | ${n ? `${n.refEsq} / ${n.refDir}` : '—'} | ${a ? `${a.colunaCard} / ${a.botao} (${a.alturaBotao})` : '—'} |`);
}
L();
L('## Vão entre seções');
L();
L('Do fim do conteúdo de uma seção ao começo do conteúdo da seguinte.');
L();
L('| Largura | #contato → rodapé | #faq → #contato |');
L('|---:|---:|---:|');
for (const w of LARGURAS) L(`| ${w} | ${res[w].vaos.contatoRodape}px | ${res[w].vaos.faqContato}px |`);
L();
L('## Rodapé, pagamento e barra legal');
L();
L('| Largura | altura | colunas | passo dos links | alvo do link | cor do link (contraste) | endereço/horário visíveis | social: alvos; desvio do rótulo | pagamento: altura, linhas, desalinho | selo: folga até a base do rodapé |');
L('|---:|---:|---|---:|---|---|---:|---|---|---:|');
for (const w of LARGURAS) {
  const r = res[w].rodape;
  if (!r) continue;
  L(`| ${w} | ${r.altura} | ${esc(r.colunas)} | ${r.passoLinks} | ${r.alvoLink} | ${r.corLink} (${r.contrasteLink}:1) | ${r.enderecoHorario} | ${r.social}; ${r.socialDesvioEsq} | ${r.pagamentoAltura}, ${r.pagamentoLinhas}, ${r.pagamentoDesalinho} | ${r.seloBase} |`);
}
L();
L('| Largura | ano do © | links de política em linha | passo entre links | aviso legal: corpo, alinhamento, contraste |');
L('|---:|---:|:--:|---:|---|');
for (const w of LARGURAS) {
  const a = res[w].autor;
  if (!a) continue;
  L(`| ${w} | ${a.ano} | ${sim(a.linksEmLinha)} | ${a.passoLinks} | ${a.avisoFs}px, ${a.avisoAlinhamento}, ${a.avisoContraste}:1 |`);
}
L();

await mkdir(path.join(RAIZ, 'medidas'), { recursive: true });
await writeFile(path.join(RAIZ, 'medidas', `${rotulo}-movel.md`), lin.join('\n'));
console.log(`Salvo em medidas/${rotulo}-movel.md`);
