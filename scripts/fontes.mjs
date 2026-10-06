// Subconjunto pt-BR das webfonts + métricas para o fallback (lote B, B3).
//
//   node scripts/fontes.mjs
//
// Reprodutível: mesmos originais, mesmos parâmetros, mesmos bytes. Gera
// css/fonts/<nome>.sub.woff2 AO LADO dos originais (que ficam no repo) e
// imprime as métricas de cada face para o @font-face de fallback.
//
// A cobertura NÃO é "os caracteres presentes hoje" — a copy muda toda
// semana, e um glifo faltante cairia no fallback sem ninguém notar. Vai
// bloco inteiro:
//   Basic Latin            U+0020–007E
//   Latin-1 Supplement     U+00A0–00FF   (á é í ó ú â ê ô ã õ ç à ü º ª …)
//   Latin Extended-A       U+0100–017F
//   General Punctuation    U+2000–206F   (aspas curvas, travessão, reticências)
// mais os símbolos que o site usa fora deles, achados por varredura do
// index, dos satélites e das strings dos JS: U+2192 (→, a seta dos CTAs) e
// U+2265 (≥). R$ já vive no Basic Latin. Os emoji de console.log não
// renderizam da webfont; ficam de fora.
import subsetFont from 'subset-font';
import * as fontkit from 'fontkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(RAIZ, 'css', 'fonts');

let texto = '';
const faixa = (a, b) => { for (let k = a; k <= b; k++) texto += String.fromCodePoint(k); };
faixa(0x20, 0x7e);
faixa(0xa0, 0xff);
faixa(0x100, 0x17f);
faixa(0x2000, 0x206f);
texto += '→≥';

const ARQUIVOS = [
  'NCS Radhiumz.woff2',
  'TT Fors Trial Light.woff2',
  'TT Fors Trial Regular.woff2',
  'TT Fors Trial Medium.woff2',
  'TT Fors Trial DemiBold.woff2',
  'TT Fors Trial Bold.woff2',
  'TT Fors Trial ExtraBold.woff2',
];

console.log('face'.padEnd(30), 'antes', ' depois', '  upm  ascent descent lineGap avgW');
for (const nome of ARQUIVOS) {
  const abs = path.join(PASTA, nome);
  const original = fs.readFileSync(abs);
  const sub = await subsetFont(original, texto, { targetFormat: 'woff2' });
  const saida = abs.replace(/\.woff2$/, '.sub.woff2');
  fs.writeFileSync(saida, sub);

  // métricas do ORIGINAL (o subconjunto preserva hhea/OS2, mas medimos a
  // fonte de verdade por princípio)
  const f = fontkit.create(original);
  const upm = f.unitsPerEm;
  console.log(
    nome.replace('.woff2', '').padEnd(30),
    String((original.length / 1024).toFixed(0) + 'KB').padStart(5),
    String((sub.length / 1024).toFixed(0) + 'KB').padStart(7),
    String(upm).padStart(5),
    String(f.ascent).padStart(7),
    String(f.descent).padStart(8),
    String(f.lineGap).padStart(7),
    String(f['OS/2'] ? f['OS/2'].xAvgCharWidth : '?').padStart(5),
  );
}

// Valores prontos para o @font-face de fallback (Arial: upm 2048,
// xAvgCharWidth 904). size-adjust = avgW(web)/upm(web) ÷ 904/2048.
console.log('\npara o fallback (Arial):');
for (const nome of ['TT Fors Trial Regular.woff2', 'NCS Radhiumz.woff2']) {
  const f = fontkit.create(fs.readFileSync(path.join(PASTA, nome)));
  const upm = f.unitsPerEm;
  const avg = f['OS/2'] ? f['OS/2'].xAvgCharWidth : NaN;
  const sizeAdjust = ((avg / upm) / (904 / 2048)) * 100;
  console.log(`  ${nome}: size-adjust ${sizeAdjust.toFixed(2)}% | ascent-override ${(100 * f.ascent / upm).toFixed(2)}% | descent-override ${(100 * Math.abs(f.descent) / upm).toFixed(2)}% | line-gap-override ${(100 * f.lineGap / upm).toFixed(2)}%`);
}
