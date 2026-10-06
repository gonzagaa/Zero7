// INP decomposto nas três etapas, com interação de verdade, sob CPU 4x.
//
//   node scripts/inp-etapas.mjs <largura> <repetições>
//
// Um número de INP sozinho não diz o que consertar. A decomposição diz:
//   atraso de entrada  = quanto a mão esperou a thread principal vagar
//                        (processingStart - startTime do primeiro evento)
//   processamento      = quanto o NOSSO handler rodou
//                        (processingEnd do último - processingStart do primeiro)
//   apresentação       = do fim do handler até o pixel na tela
//                        (maior startTime+duration - processingEnd do último)
// Cada uma aponta para um conserto diferente: fila, código, ou layout/paint.
//
// Junto vai o LoAF (long-animation-frame), que abre o quadro em execução de
// script x estilo-e-layout x render — e o log de fetch, para separar o que é
// fila de terceiro do que é processamento nosso.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { conferirCarga } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const largura = Number(process.argv[2] || 390);
const repeticoes = Number(process.argv[3] || 5);
const SAIDA = process.env.SAIDA || 'medidas/perf';
fs.mkdirSync(SAIDA, { recursive: true });
const MOVEL = largura < 1080;

const sensores = () => {
  window.__ev = [];
  window.__loaf = [];
  window.__rede = [];

  // Event Timing cru: guardo os campos originais, não o duration arredondado.
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (!e.interactionId) continue;
      window.__ev.push({
        id: e.interactionId,
        nome: e.name,
        inicio: e.startTime,
        procIni: e.processingStart,
        procFim: e.processingEnd,
        dur: e.duration,
        alvo: (e.target && (e.target.id || e.target.className || e.target.tagName)) || '?',
      });
    }
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });

  // LoAF: onde o quadro longo gastou o tempo.
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__loaf.push({
          inicio: e.startTime,
          dur: e.duration,
          bloqueio: e.blockingDuration,
          renderIni: e.renderStart,
          estiloIni: e.styleAndLayoutStart,
          scripts: (e.scripts || []).map((s) => ({
            fonte: s.sourceURL || s.invoker || '?',
            fn: s.sourceFunctionName || '',
            exec: s.executionStart - s.startTime,
            dur: s.duration,
            reflowForcado: s.forcedStyleAndLayoutDuration,
          })),
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch (_) { /* navegador sem LoAF */ }

  // Toda ida à rede, com começo e fim: se o dialog esperasse o Zendesk,
  // apareceria aqui um fetch começando DEPOIS do clique.
  const fetchOriginal = window.fetch;
  window.fetch = function (...args) {
    const url = String(args[0] && args[0].url ? args[0].url : args[0]);
    const t0 = performance.now();
    return fetchOriginal.apply(this, args).then(
      (r) => { window.__rede.push({ url, t0, t1: performance.now(), ok: r.ok }); return r; },
      (e) => { window.__rede.push({ url, t0, t1: performance.now(), erro: String(e) }); throw e; },
    );
  };
};

const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const amostras = {};
const loafs = {};
let redeFinal = [];

try {
  const ctx = await nav.newContext({
    viewport: { width: largura, height: MOVEL ? 844 : 900 },
    deviceScaleFactor: MOVEL ? 3 : 1,
    isMobile: MOVEL, hasTouch: MOVEL, locale: 'pt-BR',
  });
  await ctx.addInitScript(sensores);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(servidor.url, { waitUntil: 'load', timeout: 120_000 });
  await p.waitForTimeout(4000);
  await conferirCarga(p, largura);

  const limpar = () => p.evaluate(() => { window.__ev = []; window.__loaf = []; });

  // Clique por COORDENADA, com entrada real do mouse: o .click() do DOM não
  // conta para o Event Timing — interactionId só vai em evento confiável.
  const clicar = async (sel) => {
    const ok = await p.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return false;
      e.scrollIntoView({ behavior: 'instant', block: 'center' });
      return true;
    }, sel);
    if (!ok) return false;
    await p.waitForTimeout(250);
    const c = await p.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, sel);
    if (!c) return false;
    await p.mouse.click(c.x, c.y);
    return true;
  };

  // Agrupa por interactionId: uma interação é o conjunto de eventos que o
  // navegador amarrou no mesmo gesto (pointerdown, pointerup, click).
  const colher = async (nome, tClique) => {
    await p.waitForTimeout(900);
    const { evs, loaf, rede } = await p.evaluate(() => ({ evs: window.__ev, loaf: window.__loaf, rede: window.__rede }));
    const porId = new Map();
    for (const e of evs) {
      if (!porId.has(e.id)) porId.set(e.id, []);
      porId.get(e.id).push(e);
    }
    for (const [, grupo] of porId) {
      grupo.sort((a, b) => a.inicio - b.inicio);
      const primeiro = grupo[0];
      const ultimo = grupo.reduce((m, e) => (e.procFim > m.procFim ? e : m), grupo[0]);
      const fim = Math.max(...grupo.map((e) => e.inicio + e.dur));
      const total = fim - primeiro.inicio;
      const entrada = primeiro.procIni - primeiro.inicio;
      const processamento = ultimo.procFim - primeiro.procIni;
      const apresentacao = fim - ultimo.procFim;
      amostras[nome] = amostras[nome] || [];
      amostras[nome].push({
        total, entrada, processamento, apresentacao,
        eventos: grupo.map((e) => e.nome).join('+'),
        alvo: primeiro.alvo,
        // rede que COMEÇOU depois do clique: é isso que diz se o modal
        // espera terceiro
        redeDepois: rede.filter((r) => r.t0 >= tClique).map((r) => ({
          url: r.url.slice(0, 90), t0: Math.round(r.t0 - tClique), ms: Math.round(r.t1 - r.t0),
        })),
      });
    }
    // O LoAF mais longo da janela é o quadro que segurou a interação.
    if (loaf.length) {
      const pior = loaf.reduce((m, e) => (e.dur > m.dur ? e : m), loaf[0]);
      loafs[nome] = loafs[nome] || [];
      loafs[nome].push(pior);
    }
    await limpar();
  };

  const marcar = () => p.evaluate(() => performance.now());

  for (let r = 0; r < repeticoes; r++) {
    // 1) abrir um card da Central (acordeão)
    await p.evaluate(() => document.getElementById('faq').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await p.waitForTimeout(600);
    await limpar();
    let t = await marcar();
    if (await clicar('#faqCategories .faq__category-card:not(.is-escondido)')) await colher('acordeão: abrir card', t);
    await p.waitForTimeout(600);

    // 2) trocar de página no paginador (só de 1200 em diante)
    await limpar();
    t = await marcar();
    if (await clicar('#faq .faq__seta--proxima:not([aria-disabled="true"])')) await colher('paginador: próxima', t);

    // 3) digitar na busca
    await limpar();
    await clicar('#faqSearch');
    await limpar();
    t = await marcar();
    await p.keyboard.type('conta', { delay: 120 });
    await colher('busca: digitar', t);
    await p.fill('#faqSearch', '');
    await p.waitForTimeout(1500);

    // 4) abrir e fechar o artigo (dialog)
    await p.evaluate(() => document.querySelector('#faqCategories .faq__category-card:not(.is-escondido)')?.click());
    await p.waitForTimeout(1200);
    await limpar();
    t = await marcar();
    if (await clicar('.faq__expanded-article')) {
      await colher('artigo: abrir dialog', t);
      await limpar();
      t = await marcar();
      if (await clicar('.faq__modal-close')) await colher('artigo: fechar dialog', t);
    }

    // 5) trocar de plano no carrossel
    await p.evaluate(() => document.getElementById('plan').scrollIntoView({ behavior: 'instant', block: 'center' }));
    await p.waitForTimeout(800);
    await limpar();
    t = await marcar();
    if (await clicar('#plan .swiper-pagination-bullet:not(.swiper-pagination-bullet-active)')) await colher('carrossel: trocar plano', t);

    // 6) abrir e fechar o menu (só no celular)
    if (MOVEL) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(600);
      await limpar();
      t = await marcar();
      if (await clicar('#navigation .open-menu')) await colher('menu: abrir', t);
      await limpar();
      t = await marcar();
      if (await clicar('#navigation .close-menu')) await colher('menu: fechar', t);
    }
  }

  redeFinal = await p.evaluate(() => window.__rede.map((r) => ({ url: r.url, t0: Math.round(r.t0), ms: Math.round(r.t1 - r.t0) })));
  await ctx.close();
} finally {
  await nav.close();
  await servidor.fechar();
}

const p75 = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.ceil(a.length * 0.75) - 1)]; };
const r1 = (v) => Math.round(v * 10) / 10;

console.log(`\nINP decomposto em ${largura}px, CPU 4x, ${repeticoes} repetições\n`);
console.log('  interação                   n   total(P75)  entrada  processamento  apresentação');
const tabela = [];
for (const [nome, xs] of Object.entries(amostras)) {
  const tot = xs.map((x) => x.total);
  const i = xs.indexOf(xs.reduce((m, x) => (x.total > m.total ? x : m), xs[0]));
  const linha = {
    nome, n: xs.length,
    totalP75: r1(p75(tot)), totalPior: r1(Math.max(...tot)),
    entradaP75: r1(p75(xs.map((x) => x.entrada))),
    procP75: r1(p75(xs.map((x) => x.processamento))),
    apresP75: r1(p75(xs.map((x) => x.apresentacao))),
    piorEntrada: r1(xs[i].entrada), piorProc: r1(xs[i].processamento), piorApres: r1(xs[i].apresentacao),
    eventos: xs[i].eventos,
    redeDepoisDoClique: xs.flatMap((x) => x.redeDepois),
  };
  tabela.push(linha);
  console.log(
    '  ' + nome.padEnd(26) + String(linha.n).padStart(2) +
    String(linha.totalP75).padStart(12) +
    String(linha.entradaP75).padStart(9) +
    String(linha.procP75).padStart(15) +
    String(linha.apresP75).padStart(14),
  );
}

console.log('\n  rede iniciada DEPOIS do clique, por interação:');
for (const l of tabela) {
  console.log('    ' + l.nome.padEnd(26) + (l.redeDepoisDoClique.length ? JSON.stringify(l.redeDepoisDoClique.slice(0, 3)) : 'nenhuma'));
}

console.log('\n  quadro longo (LoAF) mais pesado por interação:');
const loafTab = {};
for (const [nome, xs] of Object.entries(loafs)) {
  const pior = xs.reduce((m, e) => (e.dur > m.dur ? e : m), xs[0]);
  const script = pior.dur - (pior.renderIni ? pior.renderIni - pior.inicio : 0);
  loafTab[nome] = pior;
  const antesDoRender = pior.renderIni ? r1(pior.renderIni - pior.inicio) : null;
  const render = pior.renderIni ? r1(pior.inicio + pior.dur - pior.renderIni) : null;
  console.log(`    ${nome.padEnd(26)} dur ${String(r1(pior.dur)).padStart(6)}ms | script+tarefas ${String(antesDoRender).padStart(6)}ms | render ${String(render).padStart(6)}ms | bloqueio ${r1(pior.bloqueio)}ms`);
  for (const s of (pior.scripts || []).slice(0, 3)) {
    console.log(`        ${String(r1(s.dur)).padStart(6)}ms  ${s.fn || '(anônimo)'}  ${String(s.fonte).slice(-60)}  reflow forçado ${r1(s.reflowForcado || 0)}ms`);
  }
}

console.log('\n  fetch da página inteira (t0 = ms desde a navegação):');
for (const r of redeFinal) console.log(`    t0 ${String(r.t0).padStart(6)}ms  dur ${String(r.ms).padStart(5)}ms  ${r.url.slice(0, 100)}`);

fs.writeFileSync(`${SAIDA}/inp-etapas-${largura}.json`, JSON.stringify({ largura, repeticoes, tabela, loaf: loafTab, rede: redeFinal }, null, 1));
console.log(`\n  -> ${SAIDA}/inp-etapas-${largura}.json`);
