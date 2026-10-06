// Retrato de layout e estilo (fase 8): para cada elemento da página com caixa,
// a posição e os estilos que pintam. Serve para afirmar "idêntico" entre duas
// versões sem depender de pixel — as capturas variam entre execuções (ver
// Harness). Roda com movimento reduzido, que deixa a página determinística:
// sem AOS, sem entradas do GSAP, vídeos parados, contadores no número final.
// Ficam fora a tarja e o contador (mudam a cada segundo), a palavra rotativa
// do herói e o selo do Reclame Aqui (terceiro).
//   node scripts/retrato.mjs tirar <rótulo> [largura=1474]      # shots/<rótulo>/retrato-<largura>.json
//   node scripts/retrato.mjs comparar <a> <b> [largura=1474]   # medidas/retrato-<a>-x-<b>-<largura>.md
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [modo, a, b, c] = process.argv.slice(2);

const PROPS = ['display', 'visibility', 'opacity', 'color', 'backgroundColor', 'backgroundImage',
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopColor',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
  'boxShadow', 'transform', 'filter', 'backdropFilter', 'objectPosition', 'webkitLineClamp', 'textOverflow', 'zIndex'];
const PSEUDO = ['content', 'backgroundColor', 'backgroundImage', 'opacity', 'transform', 'width', 'height'];

function retratar([props, pseudo]) {
  const EXCLUI = '.tarjaImage, .tarjaTimerNav, .tarjaTimer, .countdown, #ra-verified-seal, .reveal-wrapper';
  // Chave estável entre cargas: um id encerra o caminho, menos os que o Swiper
  // sorteia a cada carga (swiper-wrapper-<hex>); o índice conta só irmãos da
  // mesma tag e da mesma primeira classe, para um irmão novo (ou escondido)
  // não renumerar os outros.
  const primeira = (x) => (typeof x.className === 'string' && x.className.trim() ? x.className.trim().split(/\s+/)[0] : '');
  const caminho = (el) => {
    const partes = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e.id && !/[0-9a-f]{10,}/.test(e.id)) { partes.unshift(`#${e.id}`); break; }
      const cls = primeira(e);
      const iguais = [...e.parentElement.children].filter((x) => x.tagName === e.tagName && primeira(x) === cls);
      partes.unshift(e.tagName.toLowerCase() + (cls ? `.${cls}` : '') + (iguais.length > 1 ? `:${iguais.indexOf(e) + 1}` : ''));
    }
    return partes.join(' > ');
  };
  const meio = (v) => Math.round(v * 2) / 2;
  const trunc = (s) => (s.length > 90 ? `${s.slice(0, 90)}…` : s);
  const out = {};
  for (const raiz of document.querySelectorAll('nav#navigation, header#home, section[id], footer#footer')) {
    for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
      if (el.closest(EXCLUI)) continue;
      if (!el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const s = {};
      for (const p of props) s[p] = trunc(String(cs[p] ?? ''));
      const ps = {};
      for (const tipo of ['::before', '::after']) {
        const cp = getComputedStyle(el, tipo);
        if (!cp.content || cp.content === 'none' || cp.content === 'normal') continue;
        ps[tipo] = Object.fromEntries(pseudo.map((p) => [p, trunc(String(cp[p] ?? ''))]));
      }
      const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
      out[caminho(el)] = { r: [meio(r.left), meio(r.top + scrollY), meio(r.width), meio(r.height)], t: t.slice(0, 60), s, p: ps };
    }
  }
  return out;
}

if (modo === 'tirar') {
  const rotulo = a;
  const largura = Number(b || 1474);
  const servidor = await iniciarServidor(RAIZ);
  const nav = await chromium.launch();
  try {
    const ctx = await nav.newContext({ viewport: { width: largura, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'pt-BR' });
    const page = await ctx.newPage();
    await prepararPagina(page, servidor.url);
    await page.waitForTimeout(1500);
    const dados = await page.evaluate(retratar, [PROPS, PSEUDO]);
    // As faces de fonte carregadas entram no retrato: na fonte de fallback
    // todo texto muda de largura e altura, e a comparação acusaria isso.
    const fontes = await page.evaluate(() => [...new Set([...document.fonts]
      .filter((f) => f.status === 'loaded')
      .map((f) => `${f.family.replace(/["']/g, '')} ${f.weight}`))].sort());
    await mkdir(path.join(RAIZ, 'shots', rotulo), { recursive: true });
    await writeFile(path.join(RAIZ, 'shots', rotulo, `retrato-${largura}.json`), JSON.stringify({ fontes, elementos: dados }));
    console.log(`retrato: ${Object.keys(dados).length} elementos em shots/${rotulo}/retrato-${largura}.json · fontes: ${fontes.join(', ') || 'nenhuma'}`);
  } finally {
    await nav.close();
    await servidor.fechar();
  }
} else if (modo === 'comparar') {
  const largura = c || '1474';
  // Retratos tirados antes de as fontes entrarem no arquivo eram só o mapa
  // de elementos.
  const ler = async (r) => {
    const j = JSON.parse(await readFile(path.join(RAIZ, 'shots', r, `retrato-${largura}.json`), 'utf8'));
    return j.elementos ? j : { fontes: null, elementos: j };
  };
  const RA = await ler(a);
  const RB = await ler(b);
  const A = RA.elementos;
  const B = RB.elementos;
  const fontesA = RA.fontes ? RA.fontes.join(', ') || 'nenhuma' : 'não registradas';
  const fontesB = RB.fontes ? RB.fontes.join(', ') || 'nenhuma' : 'não registradas';
  const fontesDiferem = fontesA !== fontesB;
  const EIXOS = ['x', 'y', 'largura', 'altura'];
  const novos = [], sumiram = [], mudaram = [], deslocados = [];
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const x = A[k], y = B[k];
    if (!x) { novos.push(k); continue; }
    if (!y) { sumiram.push(k); continue; }
    const dif = [];
    x.r.forEach((v, i) => { if (Math.abs(v - y.r[i]) > 0.5) dif.push(`${EIXOS[i]} ${v} → ${y.r[i]}`); });
    const soY = dif.length === 1 && dif[0].startsWith('y ');
    if (x.t !== y.t) dif.push(`texto "${x.t}" → "${y.t}"`);
    for (const p of Object.keys(x.s)) if (x.s[p] !== y.s[p]) dif.push(`${p}: ${x.s[p]} → ${y.s[p]}`);
    for (const ps of new Set([...Object.keys(x.p), ...Object.keys(y.p)])) {
      for (const p of PSEUDO) {
        const va = x.p[ps]?.[p], vb = y.p[ps]?.[p];
        if (va !== vb) dif.push(`${ps} ${p}: ${va ?? '—'} → ${vb ?? '—'}`);
      }
    }
    if (!dif.length) continue;
    if (soY && dif.length === 1) deslocados.push(k);
    else mudaram.push({ k, dif });
  }
  const L = [];
  L.push(`# Retrato ${largura}px — \`${a}\` × \`${b}\``, '');
  L.push(`Gerado por \`node scripts/retrato.mjs comparar ${a} ${b} ${largura}\`. Elementos com caixa em nav, herói, seções e rodapé, com movimento reduzido; posição em múltiplos de 0,5px. Fora: tarja e contador, palavra rotativa, selo do Reclame Aqui.`, '');
  L.push('| | elementos |', '|---|---:|');
  L.push(`| em \`${a}\` | ${Object.keys(A).length} |`, `| em \`${b}\` | ${Object.keys(B).length} |`);
  L.push(`| iguais | ${Object.keys(A).length - sumiram.length - mudaram.length - deslocados.length} |`);
  L.push(`| mudaram (estilo, tamanho ou texto) | ${mudaram.length} |`, `| só deslocados na vertical | ${deslocados.length} |`);
  L.push(`| novos | ${novos.length} |`, `| sumiram | ${sumiram.length} |`, '');
  L.push(`Fontes carregadas — \`${a}\`: ${fontesA}; \`${b}\`: ${fontesB}.`, '');
  if (fontesDiferem) {
    L.push('**Atenção: as fontes carregadas diferem entre os dois retratos.** Na fonte de fallback todo texto muda de largura e altura, então as diferenças de texto abaixo podem ser só isso. Tire os dois de novo.', '');
  }
  if (mudaram.length) {
    L.push('## Mudaram', '');
    for (const m of mudaram.slice(0, 120)) L.push(`- \`${m.k}\``, ...m.dif.map((d) => `  - ${d}`));
    L.push('');
  }
  for (const [titulo, lista] of [['Só deslocados na vertical', deslocados], ['Novos', novos], ['Sumiram', sumiram]]) {
    if (!lista.length) continue;
    L.push(`## ${titulo}`, '', ...lista.slice(0, 60).map((k) => `- \`${k}\``), '');
  }
  await mkdir(path.join(RAIZ, 'medidas'), { recursive: true });
  const saida = path.join(RAIZ, 'medidas', `retrato-${a}-x-${b}-${largura}.md`);
  await writeFile(saida, L.join('\n'));
  console.log(`iguais ${Object.keys(A).length - sumiram.length - mudaram.length - deslocados.length} · mudaram ${mudaram.length} · deslocados ${deslocados.length} · novos ${novos.length} · sumiram ${sumiram.length}`);
  if (fontesDiferem) console.log(`ATENÇÃO: fontes diferem — ${a}: ${fontesA} · ${b}: ${fontesB}`);
  console.log(`Salvo em medidas/retrato-${a}-x-${b}-${largura}.md`);
} else {
  console.error('uso: node scripts/retrato.mjs tirar <rótulo> [largura] | comparar <a> <b> [largura]');
  process.exit(1);
}
