// Terceiros: bytes, main thread por domínio e por arquivo, quem bloqueia a
// pintura, e os custos nomeados (contador, pixels, arte da tarja).
//   node scripts/terceiros.mjs <largura>
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { conferirCarga } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const largura = Number(process.argv[2] || 390);
const MOVEL = largura < 1080;
const SAIDA = process.env.SAIDA || 'medidas/perf';
fs.mkdirSync(SAIDA, { recursive: true });
const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();

try {
  const ctx = await nav.newContext({ viewport: { width: largura, height: MOVEL ? 844 : 900 }, deviceScaleFactor: MOVEL ? 3 : 1, isMobile: MOVEL, hasTouch: MOVEL, locale: 'pt-BR' });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Page.enable');
  if (MOVEL) {
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }

  const pedidos = new Map();
  let t0 = 0;
  cdp.on('Network.requestWillBeSent', (e) => {
    if (!t0) t0 = e.timestamp;
    pedidos.set(e.requestId, {
      url: e.request.url, quando: Math.round((e.timestamp - t0) * 1000),
      iniciador: e.initiator?.type || '?', bytes: 0, bloqueia: null, tipo: e.type,
    });
  });
  cdp.on('Network.responseReceived', (e) => {
    const r = pedidos.get(e.requestId);
    if (r) { r.bloqueia = e.response.renderBlockingStatus || 'desconhecido'; r.tipo = e.type; }
  });
  cdp.on('Network.loadingFinished', (e) => {
    const r = pedidos.get(e.requestId);
    if (r) r.bytes = e.encodedDataLength || 0;
  });

  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await p.goto(servidor.url, { waitUntil: 'load', timeout: 120_000 });
  await p.waitForTimeout(MOVEL ? 6000 : 3500);
  await conferirCarga(p, largura);
  const perfil = await cdp.send('Profiler.stop');

  // main thread por domínio, do perfil de CPU
  const porNo = new Map();
  for (const n of perfil.profile.nodes) porNo.set(n.id, n);
  const tempoPorNo = new Map();
  const dt = perfil.profile.timeDeltas || [];
  const samples = perfil.profile.samples || [];
  for (let i = 0; i < samples.length; i++) {
    tempoPorNo.set(samples[i], (tempoPorNo.get(samples[i]) || 0) + (dt[i] || 0) / 1000);
  }
  const porDominio = {};
  const porArquivo = {};
  for (const [id, ms] of tempoPorNo) {
    const n = porNo.get(id);
    if (!n) continue;
    const url = n.callFrame.url || '(sem url)';
    let d = '(motor/sem url)';
    try { d = url ? new URL(url).host : d; } catch {}
    porDominio[d] = (porDominio[d] || 0) + ms;
    const nome = (url ? url.split('/').pop().split('?')[0] : '') || '(inline)';
    porArquivo[nome] = (porArquivo[nome] || 0) + ms;
  }

  // o contador: quanto de main thread por minuto
  await cdp.send('Profiler.start');
  await p.waitForTimeout(10_000);
  const parado = await cdp.send('Profiler.stop');
  let msContador = 0, msTotalOcioso = 0;
  {
    const nos = new Map(parado.profile.nodes.map((n) => [n.id, n]));
    const d2 = parado.profile.timeDeltas || [], s2 = parado.profile.samples || [];
    for (let i = 0; i < s2.length; i++) {
      const n = nos.get(s2[i]);
      const ms = (d2[i] || 0) / 1000;
      if (!n) continue;
      const cf = n.callFrame;
      if (cf.functionName !== '(idle)' && cf.functionName !== '(program)') msTotalOcioso += ms;
      if (/index\.html/.test(cf.url || '') || /tickPromo|syncNavigationOffset/.test(cf.functionName || '')) msContador += ms;
    }
  }

  const dominios = {};
  for (const r of pedidos.values()) {
    let d; try { d = new URL(r.url).host; } catch { d = '?'; }
    dominios[d] = dominios[d] || { bytes: 0, req: 0, primeira: Infinity, porParser: 0, porScript: 0, bloqueantes: [] };
    dominios[d].bytes += r.bytes; dominios[d].req++;
    dominios[d].primeira = Math.min(dominios[d].primeira, r.quando);
    if (r.iniciador === 'parser') dominios[d].porParser++; else dominios[d].porScript++;
    if (r.bloqueia && r.bloqueia !== 'non_blocking' && r.bloqueia !== 'potentially_blocking' && r.bloqueia !== 'desconhecido') dominios[d].bloqueantes.push(r.url.split('/').pop().slice(0, 40) + ' [' + r.bloqueia + ']');
  }

  const tarja = [...pedidos.values()].filter((r) => /tarjapopup/i.test(r.url));
  const pixels = [...pedidos.values()].filter((r) => /facebook|fbevents|connect\.facebook/i.test(r.url));

  const ordenado = Object.entries(dominios).sort((a, b) => b[1].bytes - a[1].bytes);
  console.log(`\n=== ${largura}px — terceiros, bloqueio e custos nomeados ===`);
  console.log('domínio'.padEnd(34) + 'KB'.padStart(8) + 'req'.padStart(5) + '  1ª req'.padStart(9) + '  main thread'.padStart(13) + '  descoberto por');
  for (const [d, v] of ordenado) {
    if (v.bytes < 1024 && v.req < 2) continue;
    const mt = porDominio[d] ? porDominio[d].toFixed(0) + 'ms' : '—';
    console.log(`${d.padEnd(34)}${(v.bytes / 1024).toFixed(0).padStart(8)}${String(v.req).padStart(5)}${(v.primeira + 'ms').padStart(9)}${mt.padStart(13)}  ${v.porParser ? 'parser' : 'JS'}${v.bloqueantes.length ? '  BLOQUEIA: ' + v.bloqueantes.join(' ') : ''}`);
  }
  const bloqueantes = ordenado.flatMap(([d, v]) => v.bloqueantes.map((b) => d + ' ' + b));
  console.log('\nbloqueiam a pintura:', bloqueantes.length ? bloqueantes.join(' | ') : 'NENHUM');
  console.log('main thread por arquivo (top 8):', Object.entries(porArquivo).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v.toFixed(0)}ms`).join(' | '));
  console.log(`contador: ${msContador.toFixed(0)}ms em 10s de página parada -> ~${(msContador * 6).toFixed(0)}ms por minuto (main thread ocupado no mesmo período: ${msTotalOcioso.toFixed(0)}ms)`);
  console.log('arte da tarja:', tarja.map((t) => `${t.url.split('/').pop().slice(0, 42)} ${(t.bytes / 1024).toFixed(0)}KB aos ${t.quando}ms (${t.iniciador})`).join(' | ') || 'não pedida');
  console.log('pixels Meta:', pixels.map((t) => `${t.url.split('/').pop().slice(0, 30)} ${(t.bytes / 1024).toFixed(0)}KB aos ${t.quando}ms`).join(' | ') || 'nenhum');
  fs.writeFileSync(`${SAIDA}/terceiros-${largura}.json`, JSON.stringify({ dominios, porDominio, porArquivo, msContador, tarja, pixels }, null, 1));
  await ctx.close();
} finally {
  await nav.close();
  await servidor.fechar();
}
