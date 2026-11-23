// Teste da ingestão da tarja (npm run teste:tarja): a parte que não depende
// de vídeo — o "link" e o "cupom" do campanha.json, a troca do href da
// tarja e a do cupom no index.html.
//
//   node scripts/tarja-ingestao.teste.mjs
//
// Roda contra o index.html de verdade, só em memória (nada é gravado).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HREF_PADRAO, hrefDaCampanha, trocarHrefTarja } from './lib/tarja.mjs';
import { CUPOM_APROVADO, FUNDO_CLARO, contraste, cupomDaCampanha, markupCupom, trocarCupom } from './lib/cupom.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// base: o index.html de hoje com a tarja no padrão (vale com qualquer campanha no ar)
const lido = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const html = trocarHrefTarja(lido, HREF_PADRAO).html;
let ok = 0;
const caso = (nome, fn) => { fn(); ok++; console.log('  ✓ ' + nome); };
const href = (c) => hrefDaCampanha(c);

console.log('link do campanha.json');
caso('sem "link": volta ao padrão de hoje (#plan)', () => {
  assert.equal(HREF_PADRAO, '#plan');
  assert.deepEqual(href({ slug: 'x' }), { href: '#plan', origem: 'padrão' });
  assert.deepEqual(href({ slug: 'x', link: null }), { href: '#plan', origem: 'padrão' });
});
caso('link interno https vira o href, como veio', () => {
  assert.deepEqual(href({ link: 'https://zero7.com.br/a-maior-black/' }), { href: 'https://zero7.com.br/a-maior-black/', origem: 'campanha.json' });
  assert.equal(href({ link: 'https://www.zero7.com.br/home/#plan' }).href, 'https://www.zero7.com.br/home/#plan');
  assert.equal(href({ link: '  https://zero7.com.br/x/  ' }).href, 'https://zero7.com.br/x/');
});
caso('âncora da própria página', () => {
  assert.deepEqual(href({ link: '#faq' }), { href: '#faq', origem: 'campanha.json' });
});
caso('com UTM: recusa (GA4 abriria sessão nova)', () => {
  const r = href({ link: 'https://zero7.com.br/a-maior-black/?utm_source=site&utm_medium=tarja' });
  assert.ok(r.erro && /UTM/.test(r.erro) && /utm_source/.test(r.erro), r.erro);
  assert.ok(href({ link: 'https://zero7.com.br/x/?UTM_Campaign=a' }).erro, 'UTM em maiúscula também');
  assert.equal(href({ link: 'https://zero7.com.br/x/?ref=tarja' }).erro, undefined, 'outro parâmetro passa');
});
caso('externo, http, vazio ou inválido: recusa', () => {
  assert.ok(/interno/.test(href({ link: 'https://outro-site.com/promo' }).erro));
  assert.ok(/interno/.test(href({ link: 'https://zero7.com.br.golpe.com/' }).erro));
  assert.ok(/https/.test(href({ link: 'http://zero7.com.br/x/' }).erro));
  assert.ok(href({ link: '' }).erro);
  assert.ok(href({ link: 42 }).erro);
  assert.ok(href({ link: 'zero7.com.br/x' }).erro);
});
caso('o campanha.json da a-maior-black', () => {
  const pasta = 'C:/Users/gusta/Videos/zero7-tarjas/a-maior-black/campanha.json';
  if (!fs.existsSync(pasta)) return;
  assert.deepEqual(href(JSON.parse(fs.readFileSync(pasta, 'utf8'))), { href: 'https://zero7.com.br/a-maior-black/', origem: 'campanha.json' });
});

console.log('troca do href no index.html');
const linhasDiferentes = (a, b) => { const x = a.split('\n'), y = b.split('\n'); assert.equal(x.length, y.length); return x.map((l, i) => [l, y[i]]).filter(([l, m]) => l !== m); };
caso('troca só o <a> da tarja (o "Planos" da nav, também #plan, fica)', () => {
  const navAntes = (html.match(/href="#plan"/g) || []).length;
  const r = trocarHrefTarja(html, 'https://zero7.com.br/a-maior-black/');
  const dif = linhasDiferentes(html, r.html);
  assert.equal(dif.length, 1, 'uma linha só');
  assert.match(dif[0][0], /^\s*<a href="#plan">\s*$/);
  assert.match(dif[0][1], /^\s*<a href="https:\/\/zero7\.com\.br\/a-maior-black\/">\s*$/);
  assert.equal((r.html.match(/href="#plan"/g) || []).length, navAntes - 1);
  assert.equal(r.antes, '#plan');
});
caso('sem "link": só o href da tarja volta a #plan, o resto do index.html fica igual', () => {
  assert.ok(linhasDiferentes(lido, html).length <= 1);
  const r = trocarHrefTarja(html, HREF_PADRAO);
  assert.equal(r.html, html);
});
caso('volta: de um link para o padrão restaura o original byte a byte', () => {
  const ida = trocarHrefTarja(html, 'https://zero7.com.br/a-maior-black/').html;
  assert.equal(trocarHrefTarja(ida, HREF_PADRAO).html, html);
});
caso('href com aspas, espaço ou < > é recusado', () => {
  for (const ruim of ['https://zero7.com.br/"x', 'https://zero7.com.br/a b', '#plan"><script>']) assert.throws(() => trocarHrefTarja(html, ruim));
});
caso('sem o bloco da tarja, lança em vez de mexer em outro <a>', () => {
  assert.throws(() => trocarHrefTarja('<html><a href="#plan">x</a></html>', '#faq'));
});
console.log('\ncupom do campanha.json');
const cup = (c) => cupomDaCampanha({ slug: 'x', cupom: c });
caso('sem "cupom": null (nada muda), e o index.html não é tocado', () => {
  assert.equal(cupomDaCampanha({ slug: 'x' }), null);
  assert.equal(cupomDaCampanha({ slug: 'x', cupom: null }), null);
  assert.equal(cupomDaCampanha(null), null);
});
caso('o cupom aprovado gera EXATAMENTE o bloco que está no index.html', () => {
  const c = cupomDaCampanha({ cupom: CUPOM_APROVADO });
  assert.ok(c && !c.erro);
  const r = trocarCupom(lido, markupCupom(c));
  assert.equal(r.mudou, false, 'o markup entre as marcas difere do gerado — alguém editou à mão?');
  assert.equal(r.html, lido);
});
caso('**negrito**, ==destaque== e \\n viram o markup certo', () => {
  const c = cup({ titulo: 'Título', subtitulo: '==Sem prazo== e **forte**\nlinha ==dois==' });
  assert.equal(c.linhas.length, 2);
  const m = markupCupom(c);
  assert.equal((m.match(/class="cupom-z7__linha"/g) || []).length, 2);
  assert.match(m, /<strong class="cupom-z7__d cupom-z7__d--1"><span class="cupom-z7__dt">Sem prazo<\/span><span class="cupom-z7__br" aria-hidden="true">/);
  assert.match(m, /cupom-z7__d--2"><span class="cupom-z7__dt">dois</);
  assert.match(m, /<b class="cupom-z7__b">forte<\/b>/);
  assert.ok(!/style=/.test(m), 'sem "cor": sem style (vale a paleta do CSS)');
});
caso('texto nunca vira HTML: < > & " escapados', () => {
  const m = markupCupom(cup({ titulo: 'A <b>&</b> "x"', subtitulo: '==<script>== ok' }));
  assert.ok(!m.includes('<b>&</b>'), 'tag do título não passa');
  assert.ok(!m.replace(/<script>\(function\(c\)/, '').includes('<script>'), 'só o <script> do próprio componente');
  assert.match(m, /A &lt;b&gt;&amp;&lt;\/b&gt; &quot;x&quot;/);
  assert.match(m, /cupom-z7__dt">&lt;script&gt;</);
});
caso('"cor" gera as variáveis dos dois temas com contraste ≥ 4,5:1', () => {
  for (const cor of ['#36DCC4', '#FF6A1A', '#FFD34E', '#7CC4FF']) {
    const c = cup({ titulo: 'T', subtitulo: '==a==', cor });
    assert.ok(!c.erro, `${cor}: ${c.erro}`);
    assert.ok(c.paleta.contrastes.escuro >= 4.5 && c.paleta.contrastes.claro >= 4.5, `${cor}: ${JSON.stringify(c.paleta.contrastes)}`);
    const m = markupCupom(c);
    assert.match(m, /style="--cze-d1:#[0-9A-F]{6};[^"]*--czc-d1:#[0-9A-F]{6}/);
    assert.ok(contraste([...[1, 3, 5].map((i) => parseInt(c.paleta.vars['--czc-d1'].slice(i, i + 2), 16))], FUNDO_CLARO) >= 4.5);
  }
});
caso('erros: campos, marcação e cor', () => {
  assert.ok(cup('texto').erro);
  assert.ok(cup({ subtitulo: 'x' }).erro, 'sem título');
  assert.ok(cup({ titulo: ' ', subtitulo: 'x' }).erro, 'título vazio');
  assert.ok(cup({ titulo: 'a\nb', subtitulo: 'x' }).erro, 'título com quebra');
  assert.ok(cup({ titulo: '==a==', subtitulo: 'x' }).erro, 'título com marcação');
  assert.ok(cup({ titulo: 'T' }).erro, 'sem subtítulo');
  assert.ok(cup({ titulo: 'T', subtitulo: '==a== ==b== ==c==' }).erro, 'três destaques');
  assert.ok(cup({ titulo: 'T', subtitulo: '==aberto' }).erro, '== sem fechar');
  assert.ok(cup({ titulo: 'T', subtitulo: '**aberto' }).erro, '** sem fechar');
  assert.ok(cup({ titulo: 'T', subtitulo: '====' }).erro, 'marcação vazia');
  assert.ok(cup({ titulo: 'T', subtitulo: 'x', cor: 'teal' }).erro, 'cor não hex');
  assert.ok(cup({ titulo: 'T', subtitulo: 'x', cor: '#123' }).erro, 'hex curto');
  assert.ok(/escura demais/.test(cup({ titulo: 'T', subtitulo: 'x', cor: '#1A1A40' }).erro), 'cor escura demais para o tema escuro');
  assert.ok(/desconhecido/.test(cup({ titulo: 'T', subtitulo: 'x', link: '#a' }).erro), 'campo a mais');
});
caso('troca só entre as marcas; sem as marcas, lança', () => {
  const novo = markupCupom(cup({ titulo: 'Outro', subtitulo: '==Novo== texto' }));
  const r = trocarCupom(lido, novo);
  assert.equal(r.mudou, true);
  const [a, b] = [lido.indexOf('<!-- cupom:inicio -->'), r.html.indexOf('<!-- cupom:inicio -->')];
  assert.equal(r.html.slice(0, b), lido.slice(0, a), 'nada antes das marcas muda');
  assert.equal(r.html.slice(r.html.indexOf('<!-- cupom:fim -->')), lido.slice(lido.indexOf('<!-- cupom:fim -->')), 'nada depois das marcas muda');
  const volta = trocarCupom(r.html, markupCupom(cupomDaCampanha({ cupom: CUPOM_APROVADO })));
  assert.equal(volta.html, lido, 'volta byte a byte');
  assert.throws(() => trocarCupom('<html></html>', novo));
  assert.throws(() => trocarCupom('<!-- cupom:inicio --><!-- cupom:fim --><!-- cupom:inicio --><!-- cupom:fim -->', novo));
});

console.log(`\n${ok} casos ok`);
