// Alvos de toque, navegação por teclado e movimento reduzido da home.
//
//   node scripts/a11y.mjs <rótulo>              → medidas/<rótulo>-a11y.md
//   A11Y_FOLHA=<pasta> node scripts/a11y.mjs …  → também fotografa cada
//                                                 parada do teclado e monta
//                                                 uma folha de contato
//
// Toque — 375 e 320, contexto de celular (isMobile + hasTouch, portanto
// pointer: coarse e hover: none, como num telefone). Para cada clicável
// visível, varre com elementFromPoint a horizontal e a vertical que passam
// pelo centro e mede até onde um toque ainda cai no próprio elemento. É a
// área efetiva: conta padding e pseudo-elemento que estendem o alvo e
// desconta vizinho que fica por cima. Passa quem mede 44 × 44 assim, com
// tolerância de um quarto de pixel.
//
// Teclado — 1280 e 375, página real (Lenis, AOS e GSAP ligados, sem o
// preparo do harness). Tab do topo até o foco dar a volta, anotando cada
// parada: seção, se aparece na tela, e se o foco muda o desenho do elemento
// (outline, sombra, fundo, borda, cor — nele ou nos pseudo) em relação a ele
// mesmo sem foco. O mesmo elemento em 5 Tabs seguidos, ou um elemento que
// volta antes do fim, é foco preso.
//
// Movimento — 1280 e 375 com prefers-reduced-motion: reduce. Rola do topo
// ao fim e, a cada passo, lista o que ainda se mexe: animações e transições
// CSS, tweens do GSAP, vídeos tocando, Lenis, scroll suave, contadores e
// elementos do AOS que só aparecem depois da rolagem.

import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { prepararContexto, prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const rotulo = process.argv[2];
if (!rotulo) {
  console.error('Uso: node scripts/a11y.mjs <rótulo>   (ex: fase5)');
  process.exit(1);
}
const FOLHA = process.env.A11Y_FOLHA ? path.resolve(process.env.A11Y_FOLHA) : null;

const ALVO = 44;
const LARGURAS_TOQUE = [375, 320, 390, 430]; // 390 e 430: iPhones em uso (fase 8)
const LARGURAS_TECLADO = [1280, 768, 375];
const LARGURAS_MOVIMENTO = [1280, 375];
const MAX_TABS = 300;

// A11Y_SO=toque (ou teclado, movimento, separados por vírgula) roda só essas
// sondas; as outras seções do relatório são copiadas do anterior.
const SO = (process.env.A11Y_SO || 'toque,teclado,movimento').split(',').map((s) => s.trim());

// O que conta como clicável. .depoimento é <div> com clique (abre o vídeo).
const CLICAVEIS = [
  'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea',
  'summary', '[role="button"]', '[role="radio"]', '[role="tab"]',
  '[tabindex]:not([tabindex="-1"])', '[onclick]', '.depoimento',
  '.swiper-pagination-bullet',
].join(', ');

// A página como ela carrega, sem o preparo do harness (sem varredura nem
// congelamento), mas com a mesma rede: só a origem e as dependências da
// página, e uma espera fixa curta no lugar do 'load'.
async function abrirReal(page, url) {
  await prepararContexto(page.context());
  for (let tentativa = 1; ; tentativa++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      break;
    } catch (erro) {
      if (tentativa >= 3) throw erro;
      console.error(`    (aviso: goto estourou o tempo na tentativa ${tentativa}; repetindo)`);
    }
  }
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(1500);
}

// ------------------------------------------------------------------ toque

function medirToque(page) {
  return page.evaluate(async ({ CLICAVEIS, ALVO }) => {
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;

    // O AOS reesconde — e desloca 100px, com transição de 1,2s — os blocos
    // que saem da vista. A sonda rola de alvo em alvo e pegava blocos no meio
    // do caminho, sobrepostos ao vizinho estático (fase 5: dois indicadores
    // do carrossel "cobertos" pelo parágrafo de baixo). Para medir o layout
    // final, os data-aos saem: é o estado do movimento reduzido.
    document.querySelectorAll('[data-aos]').forEach((el) => el.removeAttribute('data-aos'));

    const todos = [...new Set(document.querySelectorAll(CLICAVEIS))];
    // clicável dentro de clicável (ícone dentro de link etc.) é um alvo só
    const alvos = todos.filter((el) => !todos.some((o) => o !== el && o.contains(el)));

    const descrever = (el) => ((el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ')
      || el.querySelector('img')?.alt
      || el.querySelector('ion-icon')?.getAttribute('name')
      || `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`).slice(0, 48);

    const saida = [];
    for (const el of alvos) {
      const item = {
        nome: descrever(el),
        secao: el.closest('section[id], footer[id], nav[id], header[id]')?.id ?? '',
      };
      saida.push(item);

      if (el.closest('#ra-verified-seal')) { item.estado = 'terceiro'; continue; }
      // desabilitado não é alvo (e o pointer-events: none dele engana a sonda)
      if (el.matches(':disabled, [aria-disabled="true"], .swiper-button-disabled')) { item.estado = 'desabilitado'; continue; }
      // inert (os slides do carrossel fora da tela) não recebe toque nem foco
      if (el.closest('[inert]')) { item.estado = 'inerte'; continue; }

      // Opacidade não conta: o AOS zera a dos blocos fora da vista, e a sonda
      // passa por eles antes de rolar até lá. Alvo com opacity 0 continua
      // recebendo toque; o que tira da tela é display, visibility e [hidden].
      const visivel = el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true });
      if (!visivel || !el.getClientRects().length) { item.estado = 'oculto'; continue; }

      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      await espera(40);
      const r = el.getBoundingClientRect();
      item.visual = [Math.round(r.width), Math.round(r.height)];
      if (!r.width || !r.height) { item.estado = 'oculto'; continue; }

      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (cx < 0 || cx >= vw || cy < 0 || cy >= vh) { item.estado = 'fora da tela'; continue; }

      const acerta = (x, y) => {
        if (x < 0 || y < 0 || x >= vw || y >= vh) return false;
        const h = document.elementFromPoint(x, y);
        return !!h && (h === el || el.contains(h));
      };
      if (!acerta(cx, cy)) {
        const h = document.elementFromPoint(cx, cy);
        item.estado = 'coberto';
        item.por = h ? `${h.tagName.toLowerCase()}${h.id ? '#' + h.id : ''}` : '?';
        continue;
      }

      // Largura e altura do alvo pelas duas retas que passam pelo centro, em
      // quartos de pixel. Sem grade nos cantos: canto arredondado e vizinho
      // encostado (alvos de 44 empilhados sem gap) reprovavam alvos de 44
      // cheios, porque o hit test do Chrome tem ~0,4px de folga numa borda.
      const LIM = 400;
      const alcance = (dx, dy) => {
        let n = 0;
        while (n < LIM && acerta(cx + dx * (n + 1), cy + dy * (n + 1))) n++;
        let f = n;
        for (const q of [0.25, 0.5, 0.75]) {
          if (!acerta(cx + dx * (n + q), cy + dy * (n + q))) break;
          f = n + q;
        }
        return f;
      };
      const larg = alcance(-1, 0) + alcance(1, 0);
      const alt = alcance(0, -1) + alcance(0, 1);
      item.efetivo = [larg, alt];
      item.estado = larg >= ALVO - 0.25 && alt >= ALVO - 0.25 ? 'ok' : 'pequeno';
    }
    return saida;
  }, { CLICAVEIS, ALVO });
}

// ---------------------------------------------------------------- teclado

// Instala no documento as funções que descrevem a parada de foco.
function instalarSonda(page) {
  return page.evaluate(() => {
    const PROPS = ['outline-style', 'outline-width', 'outline-color', 'box-shadow',
      'background-color', 'background-image', 'border-top-color', 'color',
      'text-decoration-line'];
    window.__a11ySeq = 0;
    window.__a11yEstilo = (el) => {
      const o = {};
      for (const ps of ['', '::before', '::after']) {
        const cs = getComputedStyle(el, ps || null);
        for (const p of PROPS) o[ps + p] = cs.getPropertyValue(p);
      }
      return o;
    };
    window.__a11yParada = () => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (!el.dataset.a11y) el.dataset.a11y = String(++window.__a11ySeq);
      const r = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      let opac = 1;
      for (let n = el; n instanceof Element; n = n.parentElement) opac *= Number(getComputedStyle(n).opacity);
      const nome = ((el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ')
        || el.querySelector?.('img')?.alt
        || el.querySelector?.('ion-icon')?.getAttribute('name')
        || el.getAttribute('title')
        || `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`).slice(0, 48);
      return {
        id: el.dataset.a11y,
        tag: el.tagName.toLowerCase(),
        nome,
        secao: el.closest('section[id], footer[id], nav[id], header[id]')?.id ?? '',
        naTela: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw,
        opac: Math.round(opac * 100) / 100,
        rect: [r.left, r.top, r.width, r.height].map(Math.round),
        estilo: window.__a11yEstilo(el),
      };
    };
  });
}

function indicador(foc, sem) {
  if (!sem) return '?';
  const mudou = Object.keys(foc).filter((k) => foc[k] !== sem[k]);
  const contorno = ['', '::before', '::after'].some((ps) =>
    foc[ps + 'outline-style'] !== 'none' && parseFloat(foc[ps + 'outline-width']) > 0
    && ['outline-style', 'outline-width', 'outline-color'].some((p) => foc[ps + p] !== sem[ps + p]));
  if (contorno) return 'contorno';
  if (mudou.some((k) => k.endsWith('box-shadow'))) return 'sombra';
  if (mudou.length) {
    const props = [...new Set(mudou.map((k) => k.replace(/^::(before|after)/, '')))];
    return `sutil (${props.join(', ')})`;
  }
  return 'nenhum';
}

async function andarTeclado(page, largura) {
  await instalarSonda(page);
  const paradas = [];
  const vistos = new Set();
  const ocorrencias = [];
  let ultima = null;
  let repetidas = 0;

  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(120);
    let p = await page.evaluate(() => window.__a11yParada());
    if (!p) {
      if (paradas.length) break; // saiu do documento: fim da volta
      continue;
    }
    // o foco rola a página; com scroll suave e entrada do AOS isso leva um tempo
    for (let t = 0; t < 10 && (!p.naTela || p.opac < 0.9); t++) {
      await page.waitForTimeout(150);
      p = await page.evaluate(() => window.__a11yParada());
    }

    if (ultima && p.id === ultima.id) {
      const limite = p.tag === 'iframe' ? 15 : 5;
      if (++repetidas >= limite) {
        ocorrencias.push({ tipo: 'preso', parada: p });
        break;
      }
      continue;
    }
    repetidas = 0;
    if (vistos.has(p.id)) {
      if (p.id !== paradas[0].id) ocorrencias.push({ tipo: 'ciclo', parada: p, depoisDe: ultima });
      break;
    }
    vistos.add(p.id);
    p.n = paradas.length + 1;
    paradas.push(p);
    ultima = p;

    if (FOLHA && p.naTela) {
      const m = 14;
      const vw = page.viewportSize().width;
      const vh = page.viewportSize().height;
      const x = Math.max(0, p.rect[0] - m);
      const y = Math.max(0, p.rect[1] - m);
      const w = Math.min(vw, p.rect[0] + p.rect[2] + m) - x;
      const h = Math.min(vh, p.rect[1] + p.rect[3] + m) - y;
      if (w > 4 && h > 4) {
        p.foto = path.join(FOLHA, `${largura}-${String(p.n).padStart(3, '0')}.png`);
        await page.screenshot({ path: p.foto, clip: { x, y, width: w, height: h } });
      }
    }
  }

  const semFoco = await page.evaluate((ids) => {
    document.activeElement?.blur?.();
    const out = {};
    for (const id of ids) {
      const el = document.querySelector(`[data-a11y="${id}"]`);
      if (el) out[id] = window.__a11yEstilo(el);
    }
    return out;
  }, paradas.map((p) => p.id));

  for (const p of paradas) p.indicador = indicador(p.estilo, semFoco[p.id]);
  return { paradas, ocorrencias };
}

async function montarFolha(navegador, largura, paradas) {
  const fotos = paradas.filter((p) => p.foto);
  if (!fotos.length) return null;
  const figuras = await Promise.all(fotos.map(async (p) => {
    const b64 = (await readFile(p.foto)).toString('base64');
    const legenda = `${p.n} · ${p.secao || '—'} · ${p.nome} · ${p.indicador}`
      .replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${legenda}</figcaption></figure>`;
  }));
  const html = `<style>
    body{margin:0;padding:12px;background:#777;font:11px system-ui;color:#fff;
      display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
    figure{margin:0;background:#333;padding:6px}
    img{display:block;max-width:100%;max-height:150px;object-fit:contain;margin:auto}
    figcaption{margin-top:4px;line-height:1.3}
  </style>${figuras.join('')}`;
  const pg = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  await pg.setContent(html);
  const destino = path.join(FOLHA, `folha-${largura}.png`);
  await pg.screenshot({ path: destino, fullPage: true });
  await pg.close();
  return destino;
}

// -------------------------------------------------------------- movimento

function sondarMovimento(page) {
  return page.evaluate(async () => {
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const achados = new Map();
    const anotar = (tipo, alvo, detalhe = '') => {
      const k = `${tipo}|${alvo}|${detalhe}`;
      achados.set(k, (achados.get(k) || 0) + 1);
    };
    const nomeEl = (el) => {
      if (!(el instanceof Element)) return '?';
      const id = el.id ? `#${el.id}` : '';
      const cls = [...el.classList].filter((c) => !c.startsWith('aos-') && !c.startsWith('swiper-slide-')).slice(0, 2);
      return `${el.tagName.toLowerCase()}${id}${cls.length ? '.' + cls.join('.') : ''}`;
    };
    const naTela = (el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.width > 0;
    };
    const FINAIS = { ano: '2023', traders: '+30', pagamentos: '+20' };

    const olhar = () => {
      for (const a of document.getAnimations()) {
        if (a.playState !== 'running') continue;
        const t = a.effect?.getTiming?.() ?? {};
        const dur = typeof t.duration === 'number' ? t.duration : 0;
        if (dur <= 50) continue; // o "quase zero" que o reduce usa
        const tipo = a.constructor?.name === 'CSSTransition' ? 'transição CSS'
          : a.constructor?.name === 'CSSAnimation' ? 'animação CSS' : 'WAAPI';
        const nome = a.transitionProperty || a.animationName || '';
        const alvo = nomeEl(a.effect?.target) + (a.effect?.pseudoElement || '');
        anotar(tipo, alvo, `${nome} ${Math.round(dur)}ms${t.iterations === Infinity ? ' ∞' : ''}`);
      }
      const g = window.gsap;
      if (g) {
        for (const tw of g.globalTimeline.getChildren(true, true, false)) {
          if (!tw.isActive() || !tw.duration()) continue;
          const alvos = (tw.targets?.() ?? []).filter((x) => x instanceof Element);
          anotar('GSAP', alvos.slice(0, 2).map(nomeEl).join(', ') || '(sem alvo)', `${tw.duration()}s`);
        }
      }
      for (const v of document.querySelectorAll('video')) {
        if (!v.paused) anotar('vídeo tocando', nomeEl(v.closest('.ba-card') ?? v));
      }
      for (const el of document.querySelectorAll('[data-aos]')) {
        if (naTela(el) && Number(getComputedStyle(el).opacity) < 0.99) anotar('AOS invisível na tela', nomeEl(el));
      }
      // Texto coberto: com o AOS desligado some o transform que ele deixa nos
      // blocos, e o que dependia disso para ficar acima de uma imagem de
      // fundo afunda atrás dela (fase 6: o cabeçalho de #depoimentos).
      // Longe das faixas fixas do topo (tarja, nav) e do rodapé (Zendesk).
      for (const el of document.querySelectorAll('h1, h2, h3, p')) {
        if (!naTela(el) || !el.textContent.trim()) continue;
        const r = el.getBoundingClientRect();
        if (r.top < 140 || r.top > innerHeight - 160) continue;
        const h = document.elementFromPoint(r.left + Math.min(r.width / 2, 40), r.top + Math.min(r.height / 2, 8));
        if (h && !el.contains(h) && !h.contains(el) && !h.closest('iframe, #navigation, .tarjaImage')) {
          anotar('texto coberto', nomeEl(el), `por ${nomeEl(h)}`);
        }
      }
      for (const [id, fim] of Object.entries(FINAIS)) {
        const el = document.getElementById(id);
        if (el && naTela(el) && el.textContent.trim() !== fim) anotar('contador animando', `#${id}`, el.textContent.trim());
      }
    };

    if (window.lenis || document.documentElement.classList.contains('lenis')) anotar('Lenis', 'html', 'ativo');
    if (getComputedStyle(document.documentElement).scrollBehavior === 'smooth') anotar('scroll suave', 'html', 'scroll-behavior: smooth');
    for (const nome of ['swiper4', 'swiper11']) {
      const sw = window[nome];
      if (sw?.params?.speed) anotar('Swiper', nome, `speed ${sw.params.speed}ms`);
    }

    // topo: herói (palavra rotativa) por 3s
    for (let i = 0; i < 10; i++) { olhar(); await espera(300); }

    const passo = Math.round(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += passo) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await espera(120);
      olhar();
      await espera(350);
      olhar();
    }

    return [...achados.entries()].map(([k, n]) => {
      const [tipo, alvo, detalhe] = k.split('|');
      return { tipo, alvo, detalhe, n };
    });
  });
}

// ------------------------------------------------------------------ roda

const servidor = await iniciarServidor(RAIZ);
const navegador = await chromium.launch();
const resultado = { toque: {}, teclado: {}, movimento: {} };
if (FOLHA) await mkdir(FOLHA, { recursive: true });

try {
  // Um contexto por sonda, não um por largura: a largura muda pelo viewport
  // e a página recarrega.
  if (SO.includes('toque')) {
    const ctx = await navegador.newContext({
      viewport: { width: LARGURAS_TOQUE[0], height: 800 }, isMobile: true, hasTouch: true,
      deviceScaleFactor: 1, reducedMotion: 'no-preference', locale: 'pt-BR',
    });
    const page = await ctx.newPage();
    for (const largura of LARGURAS_TOQUE) {
      await page.setViewportSize({ width: largura, height: 800 });
      await prepararPagina(page, servidor.url);
      resultado.toque[largura] = await medirToque(page);
      const na = resultado.toque[largura].filter((i) => i.estado === 'ok' || i.estado === 'pequeno');
      console.log(`toque ${largura}px: ${na.filter((i) => i.estado === 'pequeno').length} de ${na.length} abaixo de ${ALVO}×${ALVO}`);
    }
    await ctx.close();
  }

  if (SO.includes('teclado')) {
    const ctx = await navegador.newContext({
      viewport: { width: LARGURAS_TECLADO[0], height: 800 }, deviceScaleFactor: 1,
      reducedMotion: 'no-preference', locale: 'pt-BR',
    });
    const page = await ctx.newPage();
    for (const largura of LARGURAS_TECLADO) {
      await page.setViewportSize({ width: largura, height: 800 });
      await abrirReal(page, servidor.url);
      const r = await andarTeclado(page, largura);
      r.folha = FOLHA ? await montarFolha(navegador, largura, r.paradas) : null;
      resultado.teclado[largura] = r;
      const sem = r.paradas.filter((p) => p.indicador === 'nenhum').length;
      const fora = r.paradas.filter((p) => !p.naTela || p.opac < 0.5).length;
      console.log(`teclado ${largura}px: ${r.paradas.length} paradas · ${sem} sem indicador · ${fora} fora da vista · ${r.ocorrencias.length} travamento(s)`);
    }
    await ctx.close();
  }

  if (SO.includes('movimento')) {
    const ctx = await navegador.newContext({
      viewport: { width: LARGURAS_MOVIMENTO[0], height: 800 }, deviceScaleFactor: 1,
      reducedMotion: 'reduce', locale: 'pt-BR',
    });
    const page = await ctx.newPage();
    for (const largura of LARGURAS_MOVIMENTO) {
      await page.setViewportSize({ width: largura, height: 800 });
      await abrirReal(page, servidor.url);
      resultado.movimento[largura] = await sondarMovimento(page);
      console.log(`movimento ${largura}px (reduce): ${resultado.movimento[largura].length} fonte(s) de movimento`);
    }
    await ctx.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}

// --------------------------------------------------------------- relatório

const arquivo = path.join(RAIZ, 'medidas', `${rotulo}-a11y.md`);
const anterior = await readFile(arquivo, 'utf8').catch(() => '');

const linhas = [];
const L = (s = '') => linhas.push(s);
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');

// seção que não rodou nesta execução (A11Y_SO): vem do relatório anterior
function secaoAnterior(titulo) {
  L();
  const i = anterior.indexOf(`\n${titulo}`);
  if (i < 0) {
    L(titulo);
    L();
    L('Não medido nesta execução.');
    return;
  }
  const j = anterior.indexOf('\n## ', i + 1);
  L(anterior.slice(i + 1, j < 0 ? undefined : j).trimEnd());
}

function secaoToque() {
  L();
  L(`## Alvos de toque (${ALVO}×${ALVO})`);
  L();
  L('| Largura | clicáveis na tela | ≥ 44×44 | abaixo | fora da tela | inertes | ocultos | cobertos | terceiros |');
  L('|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const largura of LARGURAS_TOQUE) {
    const itens = resultado.toque[largura];
    const c = (e) => itens.filter((i) => i.estado === e).length;
    L(`| ${largura} | ${c('ok') + c('pequeno')} | ${c('ok')} | ${c('pequeno')} | ${c('fora da tela')} | ${c('inerte')} | ${c('oculto')} | ${c('coberto')} | ${c('terceiro')} |`);
  }
  for (const largura of LARGURAS_TOQUE) {
    const itens = resultado.toque[largura];
    const pequenos = itens.filter((i) => i.estado === 'pequeno')
      .sort((a, b) => Math.min(...a.efetivo) - Math.min(...b.efetivo));
    const cobertos = itens.filter((i) => i.estado === 'coberto');
    L();
    L(`### ${largura}px — abaixo de ${ALVO}×${ALVO}`);
    L();
    if (!pequenos.length) L('Nenhum.');
    else {
      L('| Seção | Alvo | Caixa visual | Área efetiva |');
      L('|---|---|---:|---:|');
      for (const i of pequenos) L(`| ${esc(i.secao)} | ${esc(i.nome)} | ${i.visual.join('×')} | ${i.efetivo.map((v) => String(v).replace('.', ',')).join('×')} |`);
    }
    if (cobertos.length) {
      L();
      L('Cobertos (o centro do alvo cai em outro elemento):');
      for (const i of cobertos) L(`- ${esc(i.secao)} · ${esc(i.nome)} — por \`${i.por}\``);
    }
  }
}

function secaoTeclado() {
  L();
  L('## Teclado');
  for (const largura of LARGURAS_TECLADO) {
    const r = resultado.teclado[largura];
    const sem = r.paradas.filter((p) => p.indicador === 'nenhum');
    const sutil = r.paradas.filter((p) => p.indicador.startsWith('sutil'));
    const fora = r.paradas.filter((p) => !p.naTela || p.opac < 0.5);
    L();
    L(`### ${largura}px`);
    L();
    L(`${r.paradas.length} paradas · ${sem.length} sem indicador · ${sutil.length} só com mudança sutil · ${fora.length} fora da vista`);
    for (const o of r.ocorrencias) {
      L();
      if (o.tipo === 'preso') L(`**Foco preso** em ${esc(o.parada.secao)} · ${esc(o.parada.nome)} (${o.parada.tag}).`);
      else L(`**Foco volta** para ${esc(o.parada.secao)} · ${esc(o.parada.nome)} depois de ${esc(o.depoisDe?.nome)} — ciclo antes do fim da página.`);
    }
    if (r.folha) {
      L();
      L(`Folha de contato: \`${path.relative(RAIZ, r.folha).replace(/\\/g, '/')}\``);
    }
    L();
    L('| # | Seção | Elemento | Indicador de foco | Na vista |');
    L('|---:|---|---|---|:--:|');
    for (const p of r.paradas) {
      const vista = !p.naTela ? 'não' : p.opac < 0.5 ? `opac ${p.opac}` : 'sim';
      L(`| ${p.n} | ${esc(p.secao)} | ${esc(p.tag)} · ${esc(p.nome)} | ${esc(p.indicador)} | ${vista} |`);
    }
  }
}

function secaoMovimento() {
  L();
  L('## Movimento com prefers-reduced-motion: reduce');
  for (const largura of LARGURAS_MOVIMENTO) {
    const achados = resultado.movimento[largura];
    L();
    L(`### ${largura}px`);
    L();
    if (!achados.length) { L('Nada se mexe.'); continue; }
    L('| Fonte | Alvo | Detalhe | Amostras |');
    L('|---|---|---|---:|');
    for (const a of achados.sort((x, y) => x.tipo.localeCompare(y.tipo) || y.n - x.n)) {
      L(`| ${esc(a.tipo)} | ${esc(a.alvo)} | ${esc(a.detalhe)} | ${a.n} |`);
    }
  }
}

L(`# Acessibilidade de interação — ${rotulo}`);
L();
L('Gerado por `scripts/a11y.mjs`. Toque em contexto de celular (isMobile + hasTouch);');
L('teclado e movimento na página real, sem o preparo do harness.');
if (SO.includes('toque')) secaoToque(); else secaoAnterior(`## Alvos de toque (${ALVO}×${ALVO})`);
if (SO.includes('teclado')) secaoTeclado(); else secaoAnterior('## Teclado');
if (SO.includes('movimento')) secaoMovimento(); else secaoAnterior('## Movimento com prefers-reduced-motion: reduce');

await mkdir(path.dirname(arquivo), { recursive: true });
await writeFile(arquivo, linhas.join('\n') + '\n');
console.log(`\nSalvo em ${path.relative(RAIZ, arquivo)}`);
