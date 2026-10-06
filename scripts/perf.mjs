// Carga: LCP, CLS, FCP, TTFB, TBT, bytes e requisições, baseline x HEAD.
//   node scripts/perf.mjs <raiz> <rótulo> <largura> <rede> <cargas>
// O protocolo (viewports, rede, cache, terceiros, nº de cargas) está no
// README, seção "Protocolo de medição de performance". RAIZ_ESPERADA muda a
// expectativa do :root para medir versões antigas.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { conferirCarga } from './lib/pagina.mjs';

const [raiz, rotulo, larguraArg, rede, cargasArg] = process.argv.slice(2);
const largura = Number(larguraArg);
const cargas = Number(cargasArg || 9);
const SAIDA = process.env.SAIDA || 'medidas/perf';
fs.mkdirSync(SAIDA, { recursive: true });

const MOVEL = largura < 1080;
const ua = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const sensores = () => {
  window.__m = { lcp: null, lcpEl: null, cls: 0, clsEntradas: [], fcp: null, longtasks: [], eventos: [] };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__m.lcp = e.startTime;
      const el = e.element;
      window.__m.lcpEl = el ? (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
        (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '') +
        (el.currentSrc ? ' [' + el.currentSrc.split('/').pop().slice(0, 40) + ']' : '')) : null;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    // sem filtro de hadRecentInput: a flag vem marcada em shifts de carga
    // sem input nenhum e o Lighthouse a ignora no laboratório (lote D);
    // esta sonda não gera input real durante a fase medida
    for (const e of l.getEntries()) { window.__m.cls += e.value; window.__m.clsEntradas.push({ v: e.value, t: e.startTime }); }
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = e.startTime;
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      const at = (e.attribution || []).map((a) => a.containerSrc || a.containerName || a.name).filter(Boolean);
      window.__m.longtasks.push({ dur: Math.round(e.duration), t: Math.round(e.startTime), de: at.join(',') || '—' });
    }
  }).observe({ type: 'longtask', buffered: true });
};

const servidor = await iniciarServidor(path.resolve(raiz));
const nav = await chromium.launch();
const linhas = [];
let abortos = 0, repeticoes = 0;

try {
  for (let i = 0; i < cargas; i++) {
    const ctx = await nav.newContext({
      viewport: { width: largura, height: MOVEL ? 844 : 900 },
      deviceScaleFactor: MOVEL ? 3 : 1,
      isMobile: MOVEL, hasTouch: MOVEL, locale: 'pt-BR',
      ...(MOVEL ? { userAgent: ua } : {}),
    });
    await ctx.addInitScript(sensores);
    const p = await ctx.newPage();

    // rede e CPU pelo CDP, antes de qualquer requisição
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (rede === 'lento') {
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false, latency: 150,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }

    // bytes e requisições por domínio, pelo CDP (o Resource Timing zera
    // tamanho de terceiro sem Timing-Allow-Origin)
    const req = new Map();
    const porUrl = new Map();
    cdp.on('Network.requestWillBeSent', (e) => {
      porUrl.set(e.requestId, { url: e.request.url, inicio: e.timestamp * 1000, iniciador: e.initiator?.type || '?', bytes: 0 });
    });
    cdp.on('Network.loadingFinished', (e) => {
      const r = porUrl.get(e.requestId);
      if (r) r.bytes = e.encodedDataLength || 0;
    });
    cdp.on('Network.responseReceived', (e) => {
      const r = porUrl.get(e.requestId);
      if (r) r.tipo = e.type;
    });

    const t0 = Date.now();
    await p.goto(servidor.url, { waitUntil: 'load', timeout: 120_000 });
    await p.waitForTimeout(rede === 'lento' ? 6000 : 3000);

    let conferencia;
    try {
      conferencia = await conferirCarga(p, largura, process.env.RAIZ_ESPERADA ? { raizEsperada: Number(process.env.RAIZ_ESPERADA) } : {});
      if (conferencia.tentativas > 1) repeticoes++;
    } catch (erro) {
      abortos++;
      console.error('  ASSERÇÃO FALHOU, carga descartada:', erro.message);
      await ctx.close();
      continue;
    }

    const inicial = await p.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      return { ttfb: Math.round(nav.responseStart || 0), load: Math.round(nav.loadEventEnd || 0), ...window.__m };
    });
    const bytesIniciais = [...porUrl.values()].reduce((s, r) => s + r.bytes, 0);
    const reqIniciais = porUrl.size;

    // rola até o rodapé: vídeos e imagens lazy entram aqui
    await p.evaluate(async () => {
      const passo = innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += passo) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await p.waitForTimeout(rede === 'lento' ? 5000 : 2500);

    const fim = await p.evaluate(() => ({ ...window.__m }));
    const bytesFinais = [...porUrl.values()].reduce((s, r) => s + r.bytes, 0);

    const porDominio = {};
    for (const r of porUrl.values()) {
      let d;
      try { d = new URL(r.url).host; } catch { d = '?'; }
      porDominio[d] = porDominio[d] || { bytes: 0, req: 0, primeira: Infinity, iniciador: r.iniciador };
      porDominio[d].bytes += r.bytes;
      porDominio[d].req++;
      porDominio[d].primeira = Math.min(porDominio[d].primeira, r.inicio - t0);
    }

    linhas.push({
      carga: i + 1,
      lcp: Math.round(inicial.lcp || 0), lcpEl: inicial.lcpEl,
      fcp: Math.round(inicial.fcp || 0), ttfb: inicial.ttfb, load: inicial.load,
      clsCarga: Number((inicial.cls || 0).toFixed(4)),
      clsTotal: Number((fim.cls || 0).toFixed(4)),
      tbt: inicial.longtasks.filter((t) => t.t >= (inicial.fcp || 0)).reduce((s, t) => s + Math.max(0, t.dur - 50), 0),
      mainThread: fim.longtasks.reduce((s, t) => s + t.dur, 0),
      longtasks: fim.longtasks.filter((t) => t.dur >= 50).sort((a, b) => b.dur - a.dur).slice(0, 6),
      bytesIniciais, reqIniciais, bytesFinais, reqFinais: porUrl.size,
      porDominio,
    });
    process.stderr.write(`  ${rotulo} ${largura} ${rede} carga ${i + 1}/${cargas}: LCP ${Math.round(inicial.lcp || 0)}ms, ${(bytesIniciais / 1024).toFixed(0)}KB\n`);
    await ctx.close();
  }
} finally {
  await nav.close();
  await servidor.fechar();
}

const arquivo = `${SAIDA}/${rotulo}-${largura}-${rede}.json`;
fs.writeFileSync(arquivo, JSON.stringify({ rotulo, largura, rede, cargas, abortos, repeticoes, linhas }, null, 1));
const med = (xs) => { const a = [...xs].sort((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };
const resumo = (campo) => { const xs = linhas.map((l) => l[campo]); return xs.length ? `${med(xs)} (${Math.min(...xs)}–${Math.max(...xs)})` : '—'; };
console.log(`${rotulo} ${largura}px ${rede}: n=${linhas.length} abortos=${abortos} repetições=${repeticoes}`);
console.log(`  LCP ${resumo('lcp')} | FCP ${resumo('fcp')} | TTFB ${resumo('ttfb')} | TBT ${resumo('tbt')}`);
console.log(`  CLS carga ${resumo('clsCarga')} | CLS total ${resumo('clsTotal')} | main thread ${resumo('mainThread')}ms`);
console.log(`  bytes inicial ${(med(linhas.map((l) => l.bytesIniciais)) / 1024).toFixed(0)}KB em ${med(linhas.map((l) => l.reqIniciais))} req | após rolar ${(med(linhas.map((l) => l.bytesFinais)) / 1024).toFixed(0)}KB em ${med(linhas.map((l) => l.reqFinais))} req`);
console.log(`  elemento do LCP: ${[...new Set(linhas.map((l) => l.lcpEl))].join(' / ')}`);
