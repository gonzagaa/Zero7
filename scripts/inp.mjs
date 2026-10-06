// INP com interação de verdade, sob CPU 4x.
//   node scripts/inp.mjs <largura> <repetições>
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

const sensorEventos = () => {
  window.__ev = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (!e.interactionId) continue;
      window.__ev.push({ nome: e.name, dur: Math.round(e.duration), alvo: (e.target && (e.target.id || e.target.className || e.target.tagName)) || '?' });
    }
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
};

const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const resultados = {};
const anota = (nome, ms, detalhe) => {
  resultados[nome] = resultados[nome] || [];
  resultados[nome].push({ ms, detalhe });
};

try {
  const ctx = await nav.newContext({ viewport: { width: largura, height: MOVEL ? 844 : 900 }, deviceScaleFactor: MOVEL ? 3 : 1, isMobile: MOVEL, hasTouch: MOVEL, locale: 'pt-BR' });
  await ctx.addInitScript(sensorEventos);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(servidor.url, { waitUntil: 'load', timeout: 120_000 });
  await p.waitForTimeout(4000);
  await conferirCarga(p, largura);

  const limpar = () => p.evaluate(() => { window.__ev = []; });

  // Clique por COORDENADA, com entrada real do mouse: o clique do Playwright
  // esbarra na rolagem do Lenis, e o .click() do DOM não conta para o Event
  // Timing — interactionId só é atribuído a evento confiável.
  const clicar = async (sel) => {
    const caixa = await p.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      e.scrollIntoView({ behavior: "instant", block: "center" });
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, ok: r.top > 0 && r.bottom < innerHeight };
    }, sel);
    if (!caixa) return false;
    await p.waitForTimeout(250);
    const c2 = await p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
    if (!c2) return false;
    await p.mouse.click(c2.x, c2.y);
    return true;
  };
  const colher = async (nome, detalhe) => {
    await p.waitForTimeout(700);
    const evs = await p.evaluate(() => window.__ev);
    const pior = evs.reduce((m, e) => Math.max(m, e.dur), 0);
    anota(nome, pior, detalhe + (evs.length ? ` (${evs.map((e) => e.nome + ':' + e.dur).join(', ')})` : ' (sem evento medido)'));
    await limpar();
  };

  for (let r = 0; r < repeticoes; r++) {
    // 1) abrir um card da Central (acordeão)
    await p.evaluate(() => document.getElementById('faq').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await p.waitForTimeout(600);
    await limpar();
    if (await clicar('#faqCategories .faq__category-card:not(.is-escondido)')) await colher('acordeão: abrir card', 'clique no card');
    await p.waitForTimeout(600);

    // 2) trocar de página no paginador (só de 1200 em diante)
    await limpar();
    if (await clicar('#faq .faq__seta--proxima:not([aria-disabled="true"])')) await colher('paginador: próxima', 'clique na seta');

    // 3) digitar na busca
    await limpar();
    await clicar('#faqSearch');
    await p.keyboard.type('conta', { delay: 120 });
    await colher('busca: digitar', '5 teclas');
    await p.fill('#faqSearch', '');
    await p.waitForTimeout(1500);

    // 4) abrir e fechar o artigo (dialog)
    await p.evaluate(() => document.querySelector('#faqCategories .faq__category-card:not(.is-escondido)')?.click());
    await p.waitForTimeout(1200);
    await limpar();
    if (await clicar('.faq__expanded-article')) {
      await colher('artigo: abrir dialog', 'clique na linha');
      await limpar();
      if (await clicar('.faq__modal-close')) await colher('artigo: fechar dialog', 'clique no X');
    }

    // 5) trocar de plano no carrossel
    await p.evaluate(() => document.getElementById('plan').scrollIntoView({ behavior: 'instant', block: 'center' }));
    await p.waitForTimeout(800);
    await limpar();
    if (await clicar('#plan .swiper-pagination-bullet:not(.swiper-pagination-bullet-active)')) await colher('carrossel: trocar plano', 'clique na bolinha');

    // 6) abrir e fechar o menu (só no celular)
    if (MOVEL) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(600);
      await limpar();
      if (await clicar('#navigation .open-menu')) await colher('menu: abrir', 'clique no hambúrguer');
      await limpar();
      if (await clicar('#navigation .close-menu')) await colher('menu: fechar', 'clique no X');
    }
  }
  await ctx.close();
} finally {
  await nav.close();
  await servidor.fechar();
}

const p75 = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.ceil(a.length * 0.75) - 1)]; };
console.log(`\nINP em ${largura}px, CPU 4x, ${repeticoes} repetições:`);
const tabela = [];
for (const [nome, xs] of Object.entries(resultados)) {
  const ms = xs.map((x) => x.ms).filter((v) => v > 0);
  if (!ms.length) { console.log(`  ${nome.padEnd(26)} sem evento medido`); continue; }
  const pior = Math.max(...ms);
  const oPior = xs.find((x) => x.ms === pior);
  console.log(`  ${nome.padEnd(26)} P75 ${String(p75(ms)).padStart(4)}ms | pior ${String(pior).padStart(4)}ms  ${oPior.detalhe.slice(0, 70)}`);
  tabela.push({ nome, p75: p75(ms), pior, n: ms.length, oPior: oPior.detalhe });
}
fs.writeFileSync(`${SAIDA}/inp-${largura}.json`, JSON.stringify(tabela, null, 1));
