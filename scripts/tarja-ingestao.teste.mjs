// Teste da ingestão da tarja (npm run teste:tarja): a parte que não depende
// de vídeo — o "link" do campanha.json e a troca do href no index.html.
//
//   node scripts/tarja-ingestao.teste.mjs
//
// Roda contra o index.html de verdade, só em memória (nada é gravado).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HREF_PADRAO, hrefDaCampanha, trocarHrefTarja } from './lib/tarja.mjs';

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
console.log(`\n${ok} casos ok`);
