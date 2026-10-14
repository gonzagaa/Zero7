// Sonda de fidelidade do regulamento: o texto da página nova tem que ser o
// MESMO do aprovado, palavra por palavra (regra 27).
//
//   node scripts/regulamento-fidelidade.mjs                 # WP no ar × página nova (+ referência salva)
//   node scripts/regulamento-fidelidade.mjs --referencia    # só referência salva × página nova
//   node scripts/regulamento-fidelidade.mjs --gravar-referencia   # WP no ar → medidas/regulamento-referencia.txt
//   node scripts/regulamento-fidelidade.mjs --gravar-referencia --da-pagina   # texto da página → referência
//   node scripts/regulamento-fidelidade.mjs --pagina regulamento/conteudo.html   # outra página local
//   node scripts/regulamento-fidelidade.mjs --doc <export.html>   # documento novo × corpo da página
//
// --doc: o regulamento novo chega como export HTML do Google Docs. O texto
// dele sai pelo MESMO extrator (estilo computado; links do Google
// desembrulhados de google.com/url?q=) e é comparado com o corpo da página
// — sem o cabeçalho (título e "Última atualização"), que o documento não
// traz. Zero divergência aí = o texto novo entrou fiel; só então grave a
// referência com --gravar-referencia --da-pagina.
//
// QUEM MANDA é a referência aprovada (medidas/regulamento-referencia.txt):
// o texto que o Gustavo aprovou. Existindo, ela decide o código de saída e
// o WP vira comparação INFORMATIVA (lista o que mudou desde o WordPress).
// Sem referência, o WP decide. Texto novo aprovado (ex.: a data de
// 14/10/2026, ou um regulamento novo): edita o conteudo.html, roda a sonda,
// confere que a divergência com a referência é EXATAMENTE a aprovada, e só
// então grava a referência nova com --gravar-referencia --da-pagina.
//
// O texto é extraído dos DOIS lados pelo mesmo caminho: texto visível
// (display:none/visibility:hidden saem), SEM text-transform (caixa alta de
// CSS não conta — é o texto-fonte que vale), elemento de bloco vira espaço.
// Normalização: SÓ espaços (\s e nbsp colapsam em um). Nada de caixa,
// pontuação ou acento: vírgula a mais é divergência.
//
// Do lado do WP sai o botão "VOLTAR PRA HOME" (é navegação, não regulamento).
// Do lado novo, só o <article class="regulamento">, menos o que é interface
// ([data-chrome]: tempo de leitura, botões de âncora, cabeçalho de
// impressão).
//
// Além do texto, compara os DESTINOS dos links (na ordem) e os trechos em
// negrito. Sai com código 1 se houver qualquer divergência de texto ou de link.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opc = (n, p) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : p; };
const SO_REFERENCIA = argv.includes('--referencia');
const GRAVAR = argv.includes('--gravar-referencia');
const DA_PAGINA = argv.includes('--da-pagina');
const PAGINA = opc('--pagina', 'regulamento/index.html');
const URL_WP = opc('--wp', 'https://zero7.com.br/regulamento/');
const DOC = opc('--doc', null);
const ARQ_REF = path.join(RAIZ, 'medidas', 'regulamento-referencia.txt');

/* roda no navegador: devolve { texto, links, negritos } da raiz */
function extrair({ seletorRaiz, porTexto, excluir }) {
  let raiz = seletorRaiz ? document.querySelector(seletorRaiz) : null;
  if (!raiz && porTexto) {
    raiz = document.body;
    for (;;) {
      const f = [...raiz.children].find((c) => porTexto.every((t) => c.textContent.includes(t)));
      if (!f) break;
      raiz = f;
    }
  }
  if (!raiz) return null;
  const pedacos = [];
  const links = [];
  const negritos = [];
  const visitar = (n) => {
    if (n.nodeType === 3) {
      pedacos.push(n.textContent);
      // negrito VISUAL (peso computado ≥ 600), dos dois lados igual: título
      // de seção do WP é <b>, o da página nova é h2 — os dois contam
      if (n.textContent.trim() && Number(getComputedStyle(n.parentElement).fontWeight) >= 600) negritos.push(n.textContent);
      return;
    }
    if (n.nodeType !== 1) return;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg)$/i.test(n.tagName)) return;
    if (excluir && n.matches(excluir)) return;
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const bloco = !cs.display.startsWith('inline') || n.tagName === 'BR';
    if (n.tagName === 'A' && n.getAttribute('href')) {
      let href = n.getAttribute('href');
      try { const u = new URL(href, location.href); if (/google\.com$/.test(u.hostname) && u.pathname === '/url') href = u.searchParams.get('q'); } catch (e) {}
      links.push({ href, texto: n.textContent.replace(/\s+/g, ' ').trim() });
    }
    if (bloco) pedacos.push(' ');
    for (const c of n.childNodes) visitar(c);
    if (bloco) pedacos.push(' ');
  };
  visitar(raiz);
  return { texto: pedacos.join(''), links, negritos };
}

const norm = (s) => s.replace(/[\s ]+/g, ' ').trim();
const palavras = (s) => norm(s).split(' ').filter(Boolean);

// Myers O(ND) em palavras: devolve a lista de trechos divergentes
function diff(a, b) {
  const n = a.length, m = b.length, max = n + m;
  const v = new Int32Array(2 * max + 2);
  const trilha = [];
  let fim = -1;
  for (let d = 0; d <= max; d++) {
    trilha.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && v[max + k - 1] < v[max + k + 1])) ? v[max + k + 1] : v[max + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[max + k] = x;
      if (x >= n && y >= m) { fim = d; break; }
    }
    if (fim >= 0) break;
    if (d > 4000) return [{ erro: 'divergência grande demais para listar (> 4000 edições)' }];
  }
  // volta pela trilha
  const ops = [];
  let x = n, y = m;
  for (let d = fim; d > 0; d--) {
    const vv = trilha[d];
    const k = x - y;
    const kAnt = (k === -d || (k !== d && vv[max + k - 1] < vv[max + k + 1])) ? k + 1 : k - 1;
    const xAnt = vv[max + kAnt], yAnt = xAnt - kAnt;
    while (x > xAnt && y > yAnt) { x--; y--; }
    if (x === xAnt) ops.push({ tipo: '+', i: x, j: yAnt }); else ops.push({ tipo: '-', i: xAnt, j: y });
    x = xAnt; y = yAnt;
  }
  ops.reverse();
  // agrupa edições vizinhas em trechos com contexto
  const trechos = [];
  for (const o of ops) {
    const ult = trechos[trechos.length - 1];
    if (ult && o.i <= ult.ai + ult.del.length + 1 && Math.abs(o.j - (ult.bj + ult.add.length)) <= 1) {
      if (o.tipo === '-') ult.del.push(a[o.i]); else ult.add.push(b[o.j]);
    } else trechos.push({ ai: o.i, bj: o.j, del: o.tipo === '-' ? [a[o.i]] : [], add: o.tipo === '+' ? [b[o.j]] : [] });
  }
  return trechos.map((t) => ({
    contexto: a.slice(Math.max(0, t.ai - 8), t.ai).join(' '),
    no_aprovado: t.del.join(' '),
    na_pagina: t.add.join(' '),
    depois: a.slice(t.ai + t.del.length, t.ai + t.del.length + 8).join(' '),
  }));
}

const nav = await chromium.launch();
const ler = async (url, cfg) => {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
  const r = await p.evaluate(extrair, cfg);
  await ctx.close();
  return r;
};

const CFG_WP = { porTexto: ['O presente regulamento estabelece', 'atualização'], excluir: 'a.elementor-button' };
const CFG_NOVA = { seletorRaiz: 'article.regulamento', excluir: '[data-chrome]' };

let wp = null;
if (!SO_REFERENCIA && !DOC) {
  try { wp = await ler(URL_WP, CFG_WP); } catch (e) { console.log(`WP fora do ar (${String(e.message).split('\n')[0]}) — comparando só com a referência salva`); }
}
if (GRAVAR && !DA_PAGINA) {
  if (!wp) { console.error('não consegui ler o WP para gravar a referência'); process.exit(1); }
  fs.writeFileSync(ARQ_REF, norm(wp.texto) + '\n');
  console.log(`referência gravada: ${path.relative(RAIZ, ARQ_REF)} (${palavras(wp.texto).length} palavras)`);
  await nav.close();
  process.exit(0);
}

const servidor = await iniciarServidor(RAIZ);
const nova = await ler(new URL('/' + PAGINA.replace(/\\/g, '/'), servidor.url).href, CFG_NOVA);
await servidor.fechar();
await nav.close();
if (!nova) { console.error(`não achei article.regulamento em ${PAGINA}`); process.exit(1); }
if (GRAVAR && DA_PAGINA) {
  fs.writeFileSync(ARQ_REF, norm(nova.texto) + '\n');
  console.log(`referência gravada a partir da página: ${path.relative(RAIZ, ARQ_REF)} (${palavras(nova.texto).length} palavras)`);
  process.exit(0);
}
const temReferencia = fs.existsSync(ARQ_REF) && !DOC;

const relatorio = { pagina: PAGINA, quando: new Date().toISOString(), comparacoes: {} };
let falhou = false;
const comparar = (nome, aprovado, linksAprovados, negritosAprovados, decide) => {
  const a = palavras(aprovado), b = palavras(nova.texto);
  const trechos = a.join(' ') === b.join(' ') ? [] : diff(a, b);
  const la = (linksAprovados || []).map((l) => l.href);
  const lb = nova.links.map((l) => l.href);
  const linksIguais = !linksAprovados || JSON.stringify(la) === JSON.stringify(lb);
  const nA = negritosAprovados ? norm(negritosAprovados.join(' ')) : null;
  const nB = norm(nova.negritos.join(' '));
  const difNegrito = nA === null || nA === nB ? [] : diff(palavras(nA), palavras(nB));
  relatorio.comparacoes[nome] = {
    palavras: { aprovado: a.length, pagina: b.length }, divergencias: trechos.length, trechos,
    links: linksAprovados ? { iguais: linksIguais, aprovado: la, pagina: lb } : 'sem referência de links',
    negritos: nA === null ? 'sem referência' : { iguais: nA === nB, diferencas: difNegrito },
  };
  console.log(`\n${nome}: ${a.length} palavras no aprovado × ${b.length} na página → ${trechos.length} divergência(s)`);
  for (const t of trechos.slice(0, decide ? 40 : 6)) console.log(`  …${t.contexto} [aprovado: "${t.no_aprovado}" | página: "${t.na_pagina}"] ${t.depois}…`);
  if (linksAprovados) console.log(`  links: ${la.length} × ${lb.length} — ${linksIguais ? 'mesmos destinos, mesma ordem' : 'DIFEREM'}`);
  if (nA !== null) {
    console.log(`  negrito visual: ${nA === nB ? 'mesmos trechos' : difNegrito.length + ' diferença(s) (informativo — estrutura, não texto)'}`);
    for (const t of difNegrito.slice(0, 30)) console.log(`    só no aprovado: "${t.no_aprovado}" | só na página: "${t.na_pagina}"   (…${t.contexto.split(' ').slice(-4).join(' ')})`);
  }
  if (!decide) { if (trechos.length) console.log(`  (informativo${trechos.length > 6 ? ', ' + (trechos.length - 6) + ' trechos a mais no JSON' : ''}: a referência aprovada é quem decide)`); return; }
  if (trechos.length || !linksIguais) falhou = true;
};
if (DOC) {
  const nav2 = await chromium.launch();
  const ctx = await nav2.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(new URL('file:///' + path.resolve(DOC).replace(/\\/g, '/')).href, { waitUntil: 'load' });
  const doc = await p.evaluate(extrair, { seletorRaiz: 'body' });
  await nav2.close();
  // o corpo da página: o artigo sem o cabeçalho
  const nav3 = await chromium.launch();
  const servidor2 = await iniciarServidor(RAIZ);
  const ctx3 = await nav3.newContext({ viewport: { width: 1366, height: 900 } });
  const p3 = await ctx3.newPage();
  await p3.goto(new URL('/' + PAGINA.replace(/\\/g, '/'), servidor2.url).href, { waitUntil: 'networkidle' });
  const corpo = await p3.evaluate(extrair, { seletorRaiz: 'article.regulamento', excluir: '[data-chrome], .reg-cabeca' });
  await nav3.close();
  await servidor2.fechar();
  nova.texto = corpo.texto; nova.links = corpo.links; nova.negritos = corpo.negritos;
  comparar(`documento (${path.basename(DOC)}) × corpo da página`, doc.texto, doc.links, doc.negritos, true);
}
if (wp) comparar(temReferencia ? 'WP no ar × página (informativo)' : 'WP no ar × página', wp.texto, wp.links, wp.negritos, !temReferencia);
if (temReferencia) comparar('referência aprovada × página', fs.readFileSync(ARQ_REF, 'utf8'), null, null, true);
else if (!wp && !DOC) { console.error('sem WP e sem referência salva: nada para comparar'); process.exit(1); }

fs.mkdirSync(path.join(RAIZ, 'medidas'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'medidas', 'regulamento-fidelidade.json'), JSON.stringify(relatorio, null, 1));
console.log(falhou ? '\nFIDELIDADE: DIVERGE' : '\nFIDELIDADE: 0 divergências');
process.exitCode = falhou ? 1 : 0;
