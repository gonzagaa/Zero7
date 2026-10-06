// Ablação medida: quanto cada categoria de recurso custa na nota mobile.
//
//   node scripts/ablacao.mjs [execuções=3]
//
// NADA no site muda: cada categoria é removida POR REQUISIÇÃO, via
// settings.blockedUrlPatterns do próprio Lighthouse (preset mobile, o mesmo
// do PageSpeed). A exceção é a categoria do herói (j), que precisa SERVIR
// uma arte diferente: uma raiz temporária descartável em %TEMP%, com
// junctions para css/script/dist/vendor, cópia do index.html e cópia de
// assets com a arte do herói reexportada a ~20KB. O branch não é tocado.
//
// Fase 0 (inventário): uma carga instrumentada por CDP coleta, para cada
// requisição antes do load: URL, bytes, iniciador, prioridade — e, para
// imagens, se o elemento está na primeira viewport de 390x844. É desse
// inventário que saem a lista da categoria (c) e a contabilidade de bytes
// por categoria. Saída: medidas/ablacao.json + tabela no stdout.
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXECUCOES = Number(process.argv[2] || 3);
const PORTA_CDP = 9779;

/* ── Fase 0: inventário da janela inicial (390x844, terceiros liberados) ── */
async function inventariar(urlBase) {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', (e) => {
    reqs.set(e.requestId, {
      url: e.request.url,
      iniciador: e.initiator.type + (e.initiator.url ? ' ' + e.initiator.url.split('/').slice(-1)[0].split('?')[0] : ''),
      prioridade: e.request.initialPriority,
      bytes: 0,
      antesDoLoad: true,
    });
  });
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) r.tipo = e.type; });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });
  let carregou = false;
  p.on('load', () => { carregou = true; for (const r of reqs.values()) if (r.bytes === 0 && !r._pos) r._pos = !carregou; });
  await p.goto(urlBase, { waitUntil: 'load', timeout: 180_000 });
  const tLoad = Date.now();
  await p.waitForTimeout(6000);
  // o que chegou depois do load não é "janela inicial"
  const marcaLoad = new Set();
  // imagens: na primeira viewport?
  const imgs = await p.evaluate(() => {
    const dentro = new Set();
    const fora = new Set();
    for (const el of document.querySelectorAll('img, video')) {
      const r = el.getBoundingClientRect();
      const src = el.currentSrc || el.src || el.poster || '';
      if (!src) continue;
      (r.top < 844 && r.bottom > 0 ? dentro : fora).add(src);
      if (el.poster) (r.top < 844 && r.bottom > 0 ? dentro : fora).add(el.poster);
    }
    return { dentro: [...dentro], fora: [...fora] };
  });
  await nav.close();
  return { reqs: [...reqs.values()].filter((r) => r.bytes > 0), imgs };
}

/* ── raiz temporária com o herói de ~20KB ───────────────────────────────── */
function montarRaizHeroi() {
  const tmp = path.join(os.tmpdir(), 'zero7-ablacao-heroi');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  for (const dir of ['css', 'script', 'dist', 'vendor']) {
    execSync(`mklink /J "${path.join(tmp, dir)}" "${path.join(RAIZ, dir)}"`, { shell: 'cmd.exe' });
  }
  fs.cpSync(path.join(RAIZ, 'assets'), path.join(tmp, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(RAIZ, 'index.html'), path.join(tmp, 'index.html'));
  return tmp;
}
async function heroiPlaceholder(tmp) {
  const alvo = path.join(tmp, 'assets', 'bg mobile.avif');
  // mesmo tamanho de tela, qualidade no chão: mede o custo de BYTES+DECODE
  // da arte real, não o de existir uma imagem
  await sharp(path.join(RAIZ, 'assets', 'bg mobile.avif')).avif({ quality: 28, effort: 4 }).toFile(alvo + '.tmp');
  fs.renameSync(alvo + '.tmp', alvo);
  return fs.statSync(alvo).size;
}

/* ── categorias ─────────────────────────────────────────────────────────── */
const FAMILIA_GTM = ['*googletagmanager*', '*google-analytics*', '*analytics.google*', '*doubleclick*',
  '*googleadservices*', '*google.com/ccm*', '*google.com/pagead*', '*google.com/rmkt*', '*google.com.br*',
  '*facebook*', '*hotjar*', '*rdstation*', '*d335luupugsy2*', '*capi-automation*', '*d1sag09*', '*backend-api-zero7*'];
const TERCEIROS = [...FAMILIA_GTM, '*zdassets*', '*zendesk*', '*unpkg.com*', '*cdnjs.cloudflare*',
  '*code.jquery*', '*s3.amazonaws*', '*reclameaqui*', '*fonts.googleapis*', '*fonts.gstatic*'];

function categorias(inv) {
  const imgsFora = inv.imgs.fora.filter((u) => u.startsWith('http://127.0.0.1')).map((u) => '*' + decodeURIComponent(new URL(u).pathname).replace(/\*/g, '') + '*');
  return [
    { id: 'baseline', padroes: [] },
    { id: 'a-terceiros-todos', padroes: TERCEIROS },
    { id: 'b-gtm-e-injetados', padroes: FAMILIA_GTM },
    { id: 'c-imgs-abaixo-da-dobra', padroes: imgsFora },
    { id: 'd-videos-e-posters', padroes: ['*.mp4*', '*.webm*', '*poster-*'] },
    { id: 'e-fontes-todas', padroes: ['*.woff2*', '*fonts.googleapis*', '*fonts.gstatic*'] },
    { id: 'f-google-fonts-do-selo-ra', padroes: ['*fonts.googleapis*', '*fonts.gstatic*'] },
    { id: 'g-css-alem-do-critico', padroes: ['*dist/home.*'] },
    { id: 'h-js-proprio', padroes: ['*dist/script/*'] },
    { id: 'i-swiper-e-lenis', padroes: ['*swiper*', '*lenis*'] },
    { id: 'j-heroi-20kb', padroes: [], raizHeroi: true },
    { id: 'k-tudo-junto', padroes: [...new Set([...TERCEIROS, ...imgsFora, '*.mp4*', '*.webm*', '*poster-*', '*.woff2*', '*dist/home.*', '*dist/script/*', '*swiper*', '*lenis*'])], raizHeroi: true },
  ];
}

/* v2 (pós-GTM): fontes POR ARQUIVO, Swiper/jQuery/Lenis isolados, cada
   imagem da primeira viewport mobile individualmente, o crítico inline
   pela metade (raiz descartável) e o teto novo com tudo removível junto.
   Uso: node scripts/ablacao.mjs 3 v2 */
function montarRaizCriticoMetade(RAIZ) {
  const tmp = path.join(os.tmpdir(), 'zero7-ablacao-critico');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  for (const dir of ['css', 'script', 'dist', 'vendor', 'assets']) {
    execSync(`mklink /J "${path.join(tmp, dir)}" "${path.join(RAIZ, dir)}"`, { shell: 'cmd.exe' });
  }
  let h = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const ini = h.indexOf('<style id="css-critico">');
  const fim = h.indexOf('</style>', ini);
  const css = h.slice(ini + '<style id="css-critico">'.length, fim);
  // metade por regras: corta no fechamento de chave mais próximo do meio
  let corte = css.indexOf('}', Math.floor(css.length / 2)) + 1;
  h = h.slice(0, ini) + '<style id="css-critico">' + css.slice(0, corte) + h.slice(fim);
  fs.writeFileSync(path.join(tmp, 'index.html'), h);
  return tmp;
}

function categoriasV2(inv) {
  const dentro = inv.imgs.dentro.filter((u) => u.startsWith('http://127.0.0.1'))
    .map((u) => decodeURIComponent(new URL(u).pathname));
  const porImagem = dentro.map((p) => ({ id: 'img ' + p.split('/').pop().slice(0, 34), padroes: ['*' + p + '*'] }));
  const FONTES = ['NCS Radhiumz', 'TT Fors Trial Light', 'TT Fors Trial Regular', 'TT Fors Trial Medium',
    'TT Fors Trial DemiBold', 'TT Fors Trial Bold', 'TT Fors Trial ExtraBold'];
  const porFonte = FONTES.map((f) => ({ id: 'fonte ' + f.replace('TT Fors Trial ', 'TT '), padroes: ['*' + f + '.sub.woff2*'] }));
  const imgsFora = inv.imgs.fora.filter((u) => u.startsWith('http://127.0.0.1')).map((u) => '*' + decodeURIComponent(new URL(u).pathname) + '*');
  return [
    { id: 'baseline', padroes: [] },
    ...porFonte,
    { id: 'fontes todas', padroes: ['*.sub.woff2*'] },
    { id: 'swiper', padroes: ['*swiper*'] },
    { id: 'jquery', padroes: ['*jquery*'] },
    { id: 'lenis', padroes: ['*lenis*'] },
    ...porImagem,
    { id: 'critico pela metade', raizCriticoMetade: true, padroes: [] },
    { id: 'teto v2 (tudo removível)', raizHeroi: true, padroes: [...new Set([
      '*zdassets*', '*zendesk*', '*unpkg.com*', '*cdnjs.cloudflare*', '*code.jquery*',
      '*s3.amazonaws*', '*reclameaqui*', '*fonts.googleapis*', '*fonts.gstatic*',
      ...imgsFora, '*.mp4*', '*.webm*', '*poster-*', '*.woff2*', '*dist/home.*', '*dist/script/*', '*swiper*', '*lenis*'])] },
  ];
}

function casa(url, padroes) {
  const u = decodeURIComponent(url);
  return padroes.some((p) => {
    const partes = p.split('*').filter(Boolean);
    let i = 0;
    for (const parte of partes) { const k = u.indexOf(parte, i); if (k < 0) return false; i = k + parte.length; }
    return true;
  });
}

/* ── medição ────────────────────────────────────────────────────────────── */
const mediana = (xs) => { const a = [...xs].sort((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };

async function rodarLH(url, padroes, n) {
  const linhas = [];
  for (let i = 0; i < n; i++) {
    const r = await lighthouse(url, {
      port: PORTA_CDP, output: 'json', logLevel: 'error', onlyCategories: ['performance'],
      blockedUrlPatterns: padroes.length ? padroes : undefined,
    });
    const a = r.lhr.audits;
    if (r.lhr.runtimeError) { console.error('    runtimeError, descartada:', r.lhr.runtimeError.code); continue; }
    linhas.push({
      score: Math.round((r.lhr.categories.performance.score ?? 0) * 100),
      fcp: a['first-contentful-paint'].numericValue,
      lcp: a['largest-contentful-paint'].numericValue,
      tbt: a['total-blocking-time'].numericValue,
      si: a['speed-index'].numericValue,
      rede: (a['network-requests']?.details?.items ?? []).map((it) => ({ url: it.url, bytes: it.transferSize || 0, tipo: it.resourceType, prioridade: it.priority })),
    });
  }
  const m = (k) => Math.round(mediana(linhas.map((l) => l[k])));
  return { n: linhas.length, score: m('score'), fcp: m('fcp'), lcp: m('lcp'), tbt: m('tbt'), si: m('si'), rede: linhas[0]?.rede ?? [] };
}

/* ── programa ───────────────────────────────────────────────────────────── */
const V2 = process.argv[3] === 'v2';
const servidor = await iniciarServidor(RAIZ);
console.log('fase 0: inventário…');
const inv = await inventariar(servidor.url);
const cats = V2 ? categoriasV2(inv) : categorias(inv);

const navLH = await chromium.launch({ args: [`--remote-debugging-port=${PORTA_CDP}`, '--disable-extensions'] });
const saida = { geradoEm: new Date().toISOString(), execucoes: EXECUCOES, inventario: inv, linhas: [] };
let base = null;
let raizHeroiUrl = null;
let servidorHeroi = null;
let bytesHeroi = null;

let servidorCritico = null;
for (const c of cats) {
  let url = servidor.url;
  if (c.raizCriticoMetade) {
    if (!servidorCritico) servidorCritico = await iniciarServidor(montarRaizCriticoMetade(RAIZ));
    url = servidorCritico.url;
  }
  if (c.raizHeroi) {
    if (!servidorHeroi) {
      const tmp = montarRaizHeroi();
      bytesHeroi = await heroiPlaceholder(tmp);
      servidorHeroi = await iniciarServidor(tmp);
      raizHeroiUrl = servidorHeroi.url;
      console.log(`  raiz do herói: placeholder de ${(bytesHeroi / 1024).toFixed(0)}KB`);
    }
    url = raizHeroiUrl;
  }
  process.stdout.write(`ablação ${c.id} … `);
  const r = await rodarLH(url, c.padroes, EXECUCOES);
  // bytes retirados: o que a BASELINE gastou nas URLs que esta categoria corta
  let bytesFora = 0;
  if (base) bytesFora = base.rede.filter((x) => casa(x.url, c.padroes)).reduce((s, x) => s + x.bytes, 0);
  if (c.raizHeroi && base) {
    const arte = base.rede.find((x) => /bg%20mobile\.avif|bg mobile\.avif/.test(x.url));
    if (arte) bytesFora += Math.max(0, arte.bytes - (bytesHeroi ?? 0));
  }
  if (c.id === 'baseline') base = r;
  const linha = { id: c.id, n: r.n, bytesForaKB: Math.round(bytesFora / 1024), score: r.score, fcp: r.fcp, lcp: r.lcp, tbt: r.tbt, si: r.si };
  saida.linhas.push(linha);
  console.log(`score ${linha.score} | FCP ${linha.fcp} | LCP ${linha.lcp} | TBT ${linha.tbt} | SI ${linha.si} | -${linha.bytesForaKB}KB`);
}

await navLH.close();
await servidor.fechar();
if (servidorHeroi) await servidorHeroi.fechar();
if (servidorCritico) await servidorCritico.fechar();

saida.baselineRede = base.rede;
fs.writeFileSync(path.join(RAIZ, 'medidas', V2 ? 'ablacao-v2.json' : 'ablacao.json'), JSON.stringify(saida, null, 1));
console.log('\ncategoria                     -KB   score   FCP    LCP    TBT   SI');
for (const l of saida.linhas) {
  console.log(l.id.padEnd(28), String(l.bytesForaKB).padStart(5), String(l.score).padStart(6), String(l.fcp).padStart(6), String(l.lcp).padStart(6), String(l.tbt).padStart(6), String(l.si).padStart(5));
}
console.log('\n-> medidas/ablacao.json');
