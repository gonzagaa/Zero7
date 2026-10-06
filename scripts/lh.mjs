// Lighthouse programático contra o servidor local, nos dois presets.
//   node scripts/lh.mjs <rótulo> [execuções=5]
// Mediana + intervalo de score, FCP, LCP, TBT, CLS, SI e o elemento LCP.
// Sem extensões (Chromium headless limpo), cache frio (padrão do Lighthouse).
// Salva em medidas/lh-<rótulo>-<mobile|desktop>.json.
//
// O Chrome é o Chromium do Playwright — nada de depender do Chrome instalado
// na máquina, que muda de versão sozinho e leva extensões junto.
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { conferirCarga } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// F3b: --dir serve QUALQUER pasta com os mesmos headers e brotli do
// harness — é o que permite medir o espelho do ar e o HEAD lado a lado,
// mesma régua. Ex.: node scripts/lh.mjs ar 5 --dir deploy/backup-ar
const argv = process.argv.slice(2);
const iDir = argv.indexOf('--dir');
const RAIZ_SERVIDA = iDir >= 0 ? path.resolve(argv.splice(iDir, 2)[1]) : RAIZ;
const rotulo = argv[0];
const execucoes = Number(argv[1] || 5);
if (!rotulo) { console.error('uso: node scripts/lh.mjs <rótulo> [execuções] [--dir <pasta>]'); process.exit(1); }
fs.mkdirSync('medidas', { recursive: true });

const servidor = await iniciarServidor(RAIZ_SERVIDA);

// Asserção de carga ANTES de medir (protocolo): uma carga com Playwright em
// cada largura do preset. Falhou, aborta e nada é registrado.
async function preflight(largura) {
  const nav = await chromium.launch();
  try {
    const ctx = await nav.newContext({ viewport: { width: largura, height: largura >= 1080 ? 900 : 844 } });
    const p = await ctx.newPage();
    await p.goto(servidor.url, { waitUntil: 'load', timeout: 120_000 });
    await p.waitForTimeout(3000);
    if (RAIZ_SERVIDA === RAIZ) await conferirCarga(p, largura);
    else if (!(await p.evaluate(() => !!document.querySelector('h1')))) throw new Error('página servida de --dir sem h1');
  } finally {
    await nav.close();
  }
}

// O Lighthouse conecta por CDP num Chromium que o Playwright lança — sem
// chrome-launcher, que não achava a porta no Windows. A porta é fixa por
// processo; se estiver ocupada, o launch falha e a rodada aborta (melhor que
// medir outro Chrome).
const PORTA_CDP = 9777;
const navLH = await chromium.launch({
  args: [`--remote-debugging-port=${PORTA_CDP}`, '--disable-extensions', '--no-first-run'],
});
const chrome = { port: PORTA_CDP, kill: () => navLH.close() };

const pega = (lhr, id) => lhr.audits[id]?.numericValue ?? null;
// No Lighthouse 13 os audits viraram "insights": o elemento e as fases do LCP
// estão no lcp-breakdown-insight (uma tabela de fases + um nó), a economia de
// imagem no image-delivery-insight e o render-blocking no
// render-blocking-insight.
const quebraLCP = (lhr) => {
  const itens = lhr.audits['lcp-breakdown-insight']?.details?.items ?? [];
  const no = itens.find((i) => i.type === 'node');
  const fases = itens.find((i) => i.type === 'table')?.items ?? [];
  const fase = (nome) => fases.find((f) => f.subpart === nome)?.duration ?? null;
  return {
    elemento: no ? no.selector + '  ' + (no.snippet || '').slice(0, 140) : '?',
    ttfb: fase('timeToFirstByte'),
    atrasoRecurso: fase('resourceLoadDelay'),
    cargaRecurso: fase('resourceLoadDuration'),
    atrasoRender: fase('elementRenderDelay'),
  };
};
const mediana = (xs) => { const a = [...xs].filter((v) => v !== null).sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
const resumo = (xs, casas = 0) => {
  const a = xs.filter((v) => v !== null);
  if (!a.length) return null;
  const f = (v) => Number(v.toFixed(casas));
  return { mediana: f(mediana(a)), min: f(Math.min(...a)), max: f(Math.max(...a)), n: a.length };
};

try {
  /* F3a: o desktop roda DUAS vezes — no preset padrão do LH (1350×940) e
     a 1920×1080, porque o CLS de 0,36 da faixa ≥1600 era invisível nas
     duas viewports antigas. O config de 1920 é o desktopConfig com a
     emulação de tela trocada. */
  const desktop1920 = JSON.parse(JSON.stringify(desktopConfig));
  desktop1920.settings = desktop1920.settings || {};
  desktop1920.settings.screenEmulation = { mobile: false, width: 1920, height: 1080, deviceScaleFactor: 1, disabled: false };

  for (const preset of ['mobile', 'desktop', 'desktop-1920']) {
    const largura = preset === 'mobile' ? 390 : preset === 'desktop' ? 1474 : 1920;
    await preflight(largura);

    const linhas = [];
    for (let i = 0; i < execucoes; i++) {
      const opts = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] };
      const r = preset === 'desktop-1920'
        ? await lighthouse(servidor.url, opts, desktop1920)
        : preset === 'desktop'
          ? await lighthouse(servidor.url, opts, desktopConfig)
          : await lighthouse(servidor.url, opts);
      const lhr = r.lhr;
      if (lhr.runtimeError) { console.error(`  ${preset} ${i + 1}: runtimeError ${lhr.runtimeError.message} — descartada`); continue; }
      const lcpq = quebraLCP(lhr);
      linhas.push({
        score: Math.round((lhr.categories.performance.score ?? 0) * 100),
        fcp: pega(lhr, 'first-contentful-paint'),
        lcp: pega(lhr, 'largest-contentful-paint'),
        tbt: pega(lhr, 'total-blocking-time'),
        cls: pega(lhr, 'cumulative-layout-shift'),
        si: pega(lhr, 'speed-index'),
        lcpEl: lcpq.elemento,
        lcpAtrasoRender: lcpq.atrasoRender,
        lcpFases: lcpq,
        // auditorias que o lote usa como aceite
        naoCompostas: lhr.audits['non-composited-animations']?.details?.items?.length ?? 0,
        imgDeliveryKB: Math.round((lhr.audits['image-delivery-insight']?.details?.items ?? [])
          .reduce((s, it) => s + (it.wastedBytes || 0), 0) / 1024),
        renderBlocking: (lhr.audits['render-blocking-insight']?.details?.items ?? []).length,
      });
      process.stderr.write(`  ${rotulo} ${preset} ${i + 1}/${execucoes}: score ${linhas.at(-1).score}, LCP ${Math.round(linhas.at(-1).lcp)}ms\n`);
    }

    const saida = {
      rotulo, preset, execucoes: linhas.length,
      score: resumo(linhas.map((l) => l.score)),
      fcp: resumo(linhas.map((l) => l.fcp)),
      lcp: resumo(linhas.map((l) => l.lcp)),
      tbt: resumo(linhas.map((l) => l.tbt)),
      cls: resumo(linhas.map((l) => l.cls), 4),
      si: resumo(linhas.map((l) => l.si)),
      naoCompostas: resumo(linhas.map((l) => l.naoCompostas)),
      imgDeliveryKB: resumo(linhas.map((l) => l.imgDeliveryKB)),
      renderBlocking: resumo(linhas.map((l) => l.renderBlocking)),
      lcpAtrasoRender: resumo(linhas.map((l) => l.lcpAtrasoRender), 1),
      elementoLCP: [...new Set(linhas.map((l) => l.lcpEl))],
      linhas,
    };
    fs.writeFileSync(`medidas/lh-${rotulo}-${preset}.json`, JSON.stringify(saida, null, 1));
    console.log(`\n${rotulo} ${preset}: score ${saida.score.mediana} (${saida.score.min}–${saida.score.max})`);
    console.log(`  FCP ${Math.round(saida.fcp.mediana)}ms | LCP ${Math.round(saida.lcp.mediana)}ms | TBT ${Math.round(saida.tbt.mediana)}ms | CLS ${saida.cls.mediana} | SI ${Math.round(saida.si.mediana)}ms`);
    console.log(`  não compostas ${saida.naoCompostas.mediana} | image-delivery ${saida.imgDeliveryKB.mediana}KB | render-blocking ${saida.renderBlocking.mediana} | render delay do LCP ${saida.lcpAtrasoRender?.mediana}ms`);
    console.log(`  LCP: ${saida.elementoLCP.join(' | ').slice(0, 220)}`);
  }
} finally {
  await chrome.kill();
  await servidor.fechar();
}
