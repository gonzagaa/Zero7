// CLS no carregamento e ao rolar, por largura (padrão: 375 e 1474). Abaixo
// de 1080 o contexto é de toque (isMobile + hasTouch). Lista as mudanças de
// layout acima de 0,0005 com os nós que se mexeram.
//   node scripts/cls.mjs [largura…] [--pagina home|regulamento]
//
// Páginas (regra 27): sem --pagina, mede a home e /regulamento/.
//
// A rede é a do harness (lib/pagina.mjs): só a origem e as dependências da
// página; PAGINA_TERCEIROS=1 libera os terceiros. Aqui o contexto é novo a
// cada largura, de propósito: o CLS mede a carga, e reaproveitar o contexto
// esquentaria o cache — as fontes e as imagens chegariam prontas e o CLS que
// elas causam sumiria da medida.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { prepararContexto } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const iPag = args.indexOf('--pagina');
const soPagina = iPag >= 0 ? args.splice(iPag, 2)[1] : null;
const larguras = args.length ? args.map(Number) : [375, 1474];

const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const PAGINAS = [
  { nome: 'home', url: servidor.url },
  { nome: 'regulamento', url: new URL('/regulamento/index.html', servidor.url).href },
].filter((p) => !soPagina || p.nome === soPagina);
try {
  for (const pagina of PAGINAS) {
  for (const largura of larguras) {
    const extra = largura < 1080 ? { isMobile: true, hasTouch: true } : {};
    const ctx = await nav.newContext({
      viewport: { width: largura, height: largura < 700 ? 740 : 800 },
      deviceScaleFactor: 1, locale: 'pt-BR', ...extra,
    });
    await prepararContexto(ctx);
    await ctx.addInitScript(() => {
      window.__cls = { carga: 0, rolagem: 0, fontes: [] };
      window.__fase = 'carga';
      new PerformanceObserver((lista) => {
        for (const e of lista.getEntries()) {
          // SEM filtro de hadRecentInput: o Chrome marca a flag em shifts
          // de carga sem input nenhum (lote D — foi assim que 0,10 de CLS
          // ficou invisível por quatro lotes) e o Lighthouse a ignora no
          // laboratório. Esta sonda não gera input real; filtrar aqui é
          // medir outra régua.
          window.__cls[window.__fase] += e.value;
          if (e.value < 0.0005) continue;
          const nos = (e.sources || []).map((s) => {
            const n = s.node;
            if (!n || !n.nodeName) return '?';
            if (n.id) return `#${n.id}`;
            const c = typeof n.className === 'string' ? n.className.split(' ').slice(0, 2).join('.') : '';
            return n.nodeName.toLowerCase() + (c ? `.${c}` : '');
          });
          window.__cls.fontes.push({ fase: window.__fase, valor: +e.value.toFixed(4), nos: nos.slice(0, 3) });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await ctx.newPage();
    for (let t = 1; ; t++) {
      try { await page.goto(pagina.url, { waitUntil: 'domcontentloaded', timeout: 30_000 }); break; } catch (e) { if (t >= 3) throw e; }
    }
    // espera fixa no lugar do 'load': sem os terceiros, 3s bastam para a
    // carga assentar
    await page.waitForTimeout(3000);
    await page.evaluate(async () => {
      window.__fase = 'rolagem';
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.5) {
        window.scrollTo(0, y);
        await espera(250);
      }
    });
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => window.__cls);
    console.log(`${pagina.nome === 'home' ? '' : pagina.nome + ' '}${largura}px  CLS carga=${r.carga.toFixed(4)}  rolagem=${r.rolagem.toFixed(4)}`);
    for (const f of r.fontes) console.log(`    ${f.fase} ${f.valor}  ${f.nos.join(' | ')}`);
    await ctx.close();
  }
  }
} finally {
  await nav.close();
  await servidor.fechar();
}
