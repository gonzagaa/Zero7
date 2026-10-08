// Sonda da tarja em vídeo (troca imagem → vídeo, out/2026).
//
//   node scripts/tarja-video-prova.mjs <rótulo> [rede|cenarios|visual|tudo] [cargas=9]
//
// rede      — protocolo do perf.mjs (cache frio, terceiros liberados, rede
//             `lento` + CPU 4×, asserção de carga, N cargas) em 390 e 1474,
//             separando o que sai ANTES DO LCP OBSERVADO e antes do load:
//             bytes, requisições e qualquer .webm/.mp4. Depois do load
//             espera o portão idle disparar e conta o vídeo que veio.
// cenarios  — o que o script da tarja faz em cada condição: desktop normal
//             (toca), movimento reduzido e saveData (nenhuma requisição de
//             vídeo), celular 4g (toca) e 3g (fica o pôster), campanha
//             expirada com Date mockada (tarja some, nada baixa) e tarja
//             escondida com o vídeo rodando (pausa; voltou, retoma).
// visual    — em 390/1079/1366/1920: pôster (camada do vídeo escondida na
//             captura), vídeo rodando (opacidade 1) e o quadro 0 pintado
//             por cima do pôster. Caixa idêntica e diff pôster × quadro 0
//             no instante da troca (régua: ≤ 1%).
//
// Saída: medidas/tarja-video-<rótulo>-<modo>.json + resumo no console.
import { chromium } from 'playwright';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { conferirCarga } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [rotulo, modo = 'tudo', cargasArg] = process.argv.slice(2);
if (!rotulo) { console.error('uso: node scripts/tarja-video-prova.mjs <rótulo> [rede|cenarios|visual|tudo] [cargas]'); process.exit(1); }
const CARGAS = Number(cargasArg || 9);
const SAIDA = 'medidas';
fs.mkdirSync(SAIDA, { recursive: true });

const UA_MOVEL = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const VIDEO = /\.(webm|mp4)(\?|$)/i;
const VIDEO_TARJA = /tarjapopup\/tarja-[^/]*\.(webm|mp4)/i;

const med = (xs) => { const a = [...xs].sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
const faixa = (xs) => xs.length ? `${med(xs)} (${Math.min(...xs)}–${Math.max(...xs)})` : '—';

function contextoDe(nav, largura, extra = {}) {
  const movel = largura < 1080;
  return nav.newContext({
    viewport: { width: largura, height: movel ? 844 : largura >= 1920 ? 1080 : 900 },
    deviceScaleFactor: movel ? 3 : 1,
    isMobile: movel, hasTouch: movel, locale: 'pt-BR',
    ...(movel ? { userAgent: UA_MOVEL } : {}),
    ...extra,
  });
}

// LCP observado, igual ao perf.mjs
const sensores = () => {
  window.__m = { lcp: null, lcpEl: null };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__m.lcp = e.startTime;
      const el = e.element;
      window.__m.lcpEl = el ? el.tagName.toLowerCase() + (el.currentSrc ? ' [' + el.currentSrc.split('/').pop().slice(0, 40) + ']' : '') : null;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
};

// navigator.connection controlado (saveData / effectiveType) — é o que o
// script da tarja lê; o Chromium headless não deixa escolher pelo CDP
const conexao = (cfg) => {
  Object.defineProperty(Navigator.prototype, 'connection', {
    configurable: true,
    get: () => ({ saveData: cfg.saveData, effectiveType: cfg.effectiveType, addEventListener() {}, removeEventListener() {} }),
  });
};

// Date deslocada para depois do último prazo da campanha (31/out)
const dataMockada = (alvoMs) => {
  const Real = Date;
  const desloc = alvoMs - Real.now();
  class Falsa extends Real {
    constructor(...a) { if (a.length === 0) super(Real.now() + desloc); else super(...a); }
    static now() { return Real.now() + desloc; }
  }
  window.Date = Falsa;
};

async function rastrear(ctx, p, { lento }) {
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (lento) {
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const reqs = new Map();
  let t0 = null;
  cdp.on('Network.requestWillBeSent', (e) => {
    if (t0 === null && e.type === 'Document') t0 = e.timestamp;
    if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, inicio: e.timestamp, bytes: 0 });
  });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength || 0; });
  return { reqs, t0: () => t0 };
}

/* ================================ REDE ================================ */
async function modoRede(nav, url) {
  const saida = {};
  for (const largura of [390, 1474]) {
    const linhas = [];
    let abortos = 0;
    for (let i = 0; i < CARGAS; i++) {
      const ctx = await contextoDe(nav, largura);
      await ctx.addInitScript(sensores);
      const p = await ctx.newPage();
      const { reqs, t0 } = await rastrear(ctx, p, { lento: true });
      await p.goto(url, { waitUntil: 'load', timeout: 120_000 });
      await p.waitForTimeout(6000); // mesma espera do perf.mjs no lento
      try { await conferirCarga(p, largura); } catch (e) { abortos++; console.error('  asserção falhou, carga descartada:', e.message); await ctx.close(); continue; }
      const m = await p.evaluate(() => ({ lcp: window.__m.lcp, lcpEl: window.__m.lcpEl, load: performance.getEntriesByType('navigation')[0].loadEventEnd }));
      await p.waitForTimeout(6000); // portão idle pós-load + download do vídeo
      const base = t0();
      const rel = (r) => (r.inicio - base) * 1000;
      const lista = [...reqs.values()];
      const antesLcp = lista.filter((r) => rel(r) < m.lcp);
      const videos = lista.filter((r) => VIDEO.test(r.url));
      linhas.push({
        carga: i + 1, lcp: Math.round(m.lcp), lcpEl: m.lcpEl, load: Math.round(m.load),
        reqAntesLcp: antesLcp.length,
        kbAntesLcp: Math.round(antesLcp.reduce((s, r) => s + r.bytes, 0) / 1024 * 10) / 10,
        videoAntesLcp: videos.filter((r) => rel(r) < m.lcp).length,
        videoAntesLoad: videos.filter((r) => rel(r) < m.load).length,
        videoTarja: videos.filter((r) => VIDEO_TARJA.test(r.url)).map((r) => ({ arquivo: decodeURIComponent(r.url.split('/').pop()), msAposLoad: Math.round(rel(r) - m.load), kb: Math.round(r.bytes / 1024) })),
      });
      process.stderr.write(`  ${rotulo} rede ${largura} ${i + 1}/${CARGAS}: LCP ${Math.round(m.lcp)}ms, ${linhas.at(-1).kbAntesLcp}KB em ${linhas.at(-1).reqAntesLcp} req antes do LCP\n`);
      await ctx.close();
    }
    saida[largura] = { abortos, linhas };
    const L = linhas;
    console.log(`\n${rotulo} rede ${largura}px lento (n=${L.length}, abortos=${abortos})`);
    console.log(`  LCP ${faixa(L.map((l) => l.lcp))} ms | load ${faixa(L.map((l) => l.load))} ms`);
    console.log(`  antes do LCP: ${faixa(L.map((l) => l.kbAntesLcp))} KB em ${faixa(L.map((l) => l.reqAntesLcp))} req`);
    console.log(`  vídeo antes do LCP: ${Math.max(0, ...L.map((l) => l.videoAntesLcp))} | antes do load: ${Math.max(0, ...L.map((l) => l.videoAntesLoad))}`);
    const tarja = L.flatMap((l) => l.videoTarja);
    console.log(`  vídeo da tarja depois do load: ${tarja.length ? [...new Set(tarja.map((t) => t.arquivo))].join(', ') + ` (+${faixa(tarja.map((t) => t.msAposLoad))} ms após o load)` : 'nenhum'}`);
  }
  return saida;
}

/* ============================== CENÁRIOS ============================== */
async function estadoTarja(p) {
  return p.evaluate(() => {
    const t = document.querySelector('.tarjaImage');
    const v = document.querySelector('.tarjaImage video');
    const nav = document.getElementById('navigation');
    return {
      tarjaVisivel: !!t && getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().height > 0,
      navComTarja: !!nav && nav.classList.contains('activeCountdown'),
      video: v ? { src: v.currentSrc ? decodeURIComponent(v.currentSrc.split('/').pop()) : '', paused: v.paused, readyState: v.readyState, opacidade: getComputedStyle(v).opacity, classe: v.className } : null,
    };
  });
}

async function cenario(nav, url, nome, largura, { contexto = {}, init = [], depois } = {}) {
  const ctx = await contextoDe(nav, largura, contexto);
  for (const [fn, arg] of init) await ctx.addInitScript(fn, arg);
  const p = await ctx.newPage();
  const erros = [];
  p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 160)));
  const { reqs } = await rastrear(ctx, p, { lento: false });
  await p.goto(url, { waitUntil: 'load', timeout: 120_000 });
  await p.waitForTimeout(5000);
  const estado = await estadoTarja(p);
  const extra = depois ? await depois(p) : null;
  const videos = [...reqs.values()].filter((r) => VIDEO_TARJA.test(r.url)).map((r) => decodeURIComponent(r.url.split('/').pop()));
  await ctx.close();
  const r = { nome, largura, reqVideo: [...new Set(videos)], ...estado, extra, erros };
  console.log(`  ${nome.padEnd(34)} vídeo baixado: ${r.reqVideo.join(', ') || 'nenhum'} | ${r.video ? `paused=${r.video.paused} readyState=${r.video.readyState} opacidade=${r.video.opacidade}` : 'sem <video>'} | tarja ${r.tarjaVisivel ? 'visível' : 'oculta'}${extra ? ' | ' + JSON.stringify(extra) : ''}${erros.length ? ' | ERROS: ' + erros.join(' / ') : ''}`);
  return r;
}

async function modoCenarios(nav, url) {
  console.log(`\n${rotulo} cenários`);
  const pos31out = Date.parse('2026-11-02T12:00:00-03:00');
  return [
    await cenario(nav, url, 'desktop 1474 (deve tocar)', 1474),
    await cenario(nav, url, 'desktop movimento reduzido', 1474, { contexto: { reducedMotion: 'reduce' } }),
    await cenario(nav, url, 'desktop saveData', 1474, { init: [[conexao, { saveData: true, effectiveType: '4g' }]] }),
    await cenario(nav, url, 'celular 390 4g (deve tocar)', 390, { init: [[conexao, { saveData: false, effectiveType: '4g' }]] }),
    await cenario(nav, url, 'celular 390 3g (fica o pôster)', 390, { init: [[conexao, { saveData: false, effectiveType: '3g' }]] }),
    await cenario(nav, url, 'campanha expirada (Date mockada)', 1474, { init: [[dataMockada, pos31out]] }),
    await cenario(nav, url, 'tarja escondida com vídeo rodando', 1474, {
      depois: async (p) => {
        const antes = await p.evaluate(() => document.querySelector('.tarjaImage video')?.paused);
        await p.evaluate(() => { document.querySelector('.tarjaImage').style.display = 'none'; });
        await p.waitForTimeout(800);
        const escondida = await p.evaluate(() => document.querySelector('.tarjaImage video')?.paused);
        await p.evaluate(() => { document.querySelector('.tarjaImage').style.display = ''; });
        await p.waitForTimeout(1200);
        const voltou = await p.evaluate(() => document.querySelector('.tarjaImage video')?.paused);
        return { pausadoAntes: antes, pausadoEscondida: escondida, pausadoAoVoltar: voltou };
      },
    }),
  ];
}

/* =============================== VISUAL =============================== */
async function diffPct(a, b) {
  const [ra, rb] = await Promise.all([sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true }), sharp(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })]);
  if (ra.info.width !== rb.info.width || ra.info.height !== rb.info.height) return { erro: `tamanhos diferentes ${ra.info.width}x${ra.info.height} × ${rb.info.width}x${rb.info.height}` };
  let soma = 0, fora = 0;
  for (let i = 0; i < ra.data.length; i += 3) {
    const d = (Math.abs(ra.data[i] - rb.data[i]) + Math.abs(ra.data[i + 1] - rb.data[i + 1]) + Math.abs(ra.data[i + 2] - rb.data[i + 2])) / 3;
    soma += d;
    if (d > 16) fora++;
  }
  const px = ra.data.length / 3;
  // a mesma comparação com as duas imagens reduzidas à metade: tira o
  // serrilhado do grão (que cada escalador do navegador — <img> × <video> —
  // desenha do seu jeito) e sobra a diferença de CONTEÚDO
  const meia = async (f, i) => sharp(f).resize(Math.round(i.width / 2), Math.round(i.height / 2), { kernel: 'cubic' }).removeAlpha().raw().toBuffer();
  const [ma, mb] = await Promise.all([meia(a, ra.info), meia(b, rb.info)]);
  let somaM = 0;
  for (let i = 0; i < ma.length; i++) somaM += Math.abs(ma[i] - mb[i]);
  return { maePct: +(soma / px / 255 * 100).toFixed(3), pxForaPct: +(fora / px * 100).toFixed(3), maeMeiaEscalaPct: +(somaM / ma.length / 255 * 100).toFixed(3) };
}

async function modoVisual(nav, url) {
  console.log(`\n${rotulo} visual`);
  const pasta = path.join(RAIZ, 'shots', `tarja-video-${rotulo}`);
  fs.mkdirSync(pasta, { recursive: true });
  const saida = [];
  for (const largura of [390, 1079, 1366, 1920]) {
    const movel = largura < 1080;
    const ctx = await contextoDe(nav, largura);
    await ctx.addInitScript(conexao, { saveData: false, effectiveType: '4g' });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    // pôster: com 4g simulado o portão pode abrir antes desta captura, e o
    // vídeo já estaria por cima (foi o que fez o diff oscilar entre 0,8% e
    // 3,2% — a captura do "pôster" pegava o texto da arte entrando). A
    // camada do vídeo fica escondida só durante a captura.
    await p.waitForFunction(() => { const i = document.querySelector('.tarjaImage img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 30_000 });
    await p.evaluate(() => document.fonts.ready);
    const caixa = await p.evaluate(() => { const c = document.querySelector('.tarjaImage .tarjaMidia') || document.querySelector('.tarjaImage img'); const r = c.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; });
    const tarjaRect = await p.evaluate(() => { const r = document.querySelector('.tarjaImage').getBoundingClientRect(); return { y: +r.y.toFixed(2), h: +r.height.toFixed(2) }; });
    const alvo = p.locator('.tarjaImage .tarjaMidia, .tarjaImage picture img').first();
    const fPoster = path.join(pasta, `${largura}-poster.png`);
    const videoJaTinhaSrc = await p.evaluate(() => { const v = document.querySelector('.tarjaImage video'); if (!v) return false; v.style.visibility = 'hidden'; return !!v.getAttribute('src'); });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await alvo.screenshot({ path: fPoster });
    await p.evaluate(() => { const v = document.querySelector('.tarjaImage video'); if (v) v.style.visibility = ''; });
    const linha = { largura, caixa, tarja: tarjaRect, poster: path.relative(RAIZ, fPoster), videoJaTinhaSrc };

    {
      // vídeo rodando: espera o 'playing' e a classe da transição
      const tocou = await p.waitForFunction(() => { const v = document.querySelector('.tarjaImage video'); return v && !v.paused && v.readyState >= 3 && getComputedStyle(v).opacity === '1'; }, null, { timeout: 20_000 }).then(() => true).catch(() => false);
      linha.tocou = tocou;
      if (tocou) {
        const caixaVideo = await p.evaluate(() => { const v = document.querySelector('.tarjaImage video'); const r = v.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; });
        linha.caixaVideo = caixaVideo;
        const fRodando = path.join(pasta, `${largura}-video-rodando.png`);
        await alvo.screenshot({ path: fRodando });
        linha.rodando = path.relative(RAIZ, fRodando);
        // instante da troca: quadro 0 do vídeo, opacidade 1 sem transição.
        // requestVideoFrameCallback, não 'seeked': com o vídeo pausado o
        // headless pode terminar o seek sem PINTAR o quadro novo, e a captura
        // pegava o quadro de antes da pausa (medido: 1,04% numa execução,
        // 1,54% na outra, o texto da arte em fases diferentes).
        linha.mediaTimeTroca = await p.evaluate(async () => {
          const v = document.querySelector('.tarjaImage video');
          v.pause();
          v.style.transition = 'none';
          v.style.opacity = '1';
          const t = await new Promise((r) => { v.requestVideoFrameCallback((agora, meta) => r(meta.mediaTime)); v.currentTime = 0; });
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          return t;
        });
        const fTroca = path.join(pasta, `${largura}-video-quadro0.png`);
        await alvo.screenshot({ path: fTroca });
        linha.diffTroca = await diffPct(fPoster, fTroca);
      }
    }
    saida.push(linha);
    console.log(`  ${largura}px caixa ${JSON.stringify(caixa)}${linha.caixaVideo ? ' | vídeo ' + JSON.stringify(linha.caixaVideo) : ''}${'tocou' in linha ? ' | tocou=' + linha.tocou : ''}${linha.diffTroca ? ` | quadro em ${linha.mediaTimeTroca}s | diff pôster×quadro0 ` + JSON.stringify(linha.diffTroca) : ''}`);
    await ctx.close();
  }
  return saida;
}

/* ================================ MAIN ================================ */
const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
try {
  const modos = modo === 'tudo' ? ['rede', 'cenarios', 'visual'] : [modo];
  for (const m of modos) {
    const r = m === 'rede' ? await modoRede(nav, servidor.url) : m === 'cenarios' ? await modoCenarios(nav, servidor.url) : await modoVisual(nav, servidor.url);
    fs.writeFileSync(path.join(SAIDA, `tarja-video-${rotulo}-${m}.json`), JSON.stringify(r, null, 1));
  }
} finally {
  await nav.close();
  await servidor.fechar();
}
