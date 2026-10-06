// Gera as variantes de imagem do lote A — reprodutível: rodar de novo
// produz os mesmos arquivos (sharp é determinístico para a mesma entrada e
// os mesmos parâmetros).
//
//   node scripts/img.mjs
//
// Regras do lote: os arquivos novos nascem AO LADO dos originais, com sufixo
// de largura; nenhum original é apagado. Quem liga os novos ao HTML é o
// commit do item 6, com srcset/sizes — este script só fabrica.
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Cada trabalho: origem, larguras a gerar e qualidade. A largura é a do
// arquivo de saída em px; uma largura maior ou igual à original é pulada
// (não existe upscale aqui). O formato de saída é o da origem.
const TRABALHOS = [
  // ba-card (1856x1347 servida para ~360 CSS px no celular e ~650 no desktop)
  { origem: 'assets/o4rijghi4rugh4riuhjg.avif', larguras: [400, 800, 1200], qualidade: 55 },
  // os outros dois cards do #ba, mesmo papel e mesma caixa
  { origem: 'assets/magnific_photo-a-30yearold-black-m_WMnzkqhcXe.avif', larguras: [400, 800], qualidade: 55 }, // a 1200 saía MAIOR que a original (73KB x 53KB)
  { origem: 'assets/magnific_photo-a-man-wearing-a-blu_brHFYEu5Y2.avif', larguras: [400], qualidade: 55 }, // a 800 saía maior que a original (17KB x 16KB)
  // tarja mobile (4053x327): 2x do exibido no celular (374 -> 750) e degraus
  // para tablet, onde a mesma arte estica até ~1079 CSS px
  { origem: 'assets/tarjapopup/TARJA MOBILE MARGEM TAMANHO REDUZIDO.avif', larguras: [750, 1500, 2160], qualidade: 60 },
  // bg2.webp (1920x1080, 122KB): o Lighthouse pede compressão, não resize.
  // Reexporta na largura original com qualidade menor.
  { origem: 'assets/bg2.webp', larguras: [1920], qualidade: 64 },
  // tarja DESK: a arte tem 14.012 px de largura (!) exibida a ~1150-1580 CSS.
  // Degraus até 2x do exibido máximo com DPR 2.
  { origem: 'assets/tarjapopup/TARJA DESK REINICIO.avif', larguras: [1600, 2400, 3200], qualidade: 60 },
  // fundo do #topicos: o Lighthouse pede compressão (17KB), não resize
  { origem: 'assets/bgsection v2.avif', larguras: [1920], qualidade: 55 },
  // card do #ba de 1920x1080 exibido a <=650 CSS (precisa para o aceite de <=50KB no mobile)
  { origem: 'assets/PROCESSODEAVALIACAO.avif', larguras: [1300], qualidade: 55 },
  // posters dos vídeos do #ba: 560 cobre o celular real (163 CSS x DPR3 = 489)
  // e o cálculo do Lighthouse (313 CSS x DPR 1,75 = 548) — 640 deixava 27KB
  // de "waste" na régua do aceite
  { origem: 'assets/poster-academy-1.avif', larguras: [560], qualidade: 55 },
  { origem: 'assets/poster-academy-2.avif', larguras: [560], qualidade: 55 },
];

for (const t of TRABALHOS) {
  const abs = path.join(RAIZ, t.origem);
  if (!fs.existsSync(abs)) { console.error('NÃO EXISTE: ' + t.origem); process.exitCode = 1; continue; }
  const meta = await sharp(abs).metadata();
  const ext = path.extname(abs);
  const base = abs.slice(0, -ext.length);
  const original = fs.statSync(abs).size;
  console.log(`\n${t.origem}  ${meta.width}x${meta.height}  ${(original / 1024).toFixed(0)}KB`);

  for (const w of t.larguras) {
    if (w > meta.width) { console.log(`  ${w}w: pulado (maior que a original)`); continue; }
    const saida = `${base}-${w}${ext}`;
    let cadeia = sharp(abs);
    if (w < meta.width) cadeia = cadeia.resize({ width: w });
    if (ext === '.avif') cadeia = cadeia.avif({ quality: t.qualidade, effort: 6 });
    else if (ext === '.webp') cadeia = cadeia.webp({ quality: t.qualidade, effort: 6 });
    await cadeia.toFile(saida);
    const kb = fs.statSync(saida).size / 1024;
    console.log(`  -> ${path.basename(saida)}  ${kb.toFixed(0)}KB`);
  }
}
console.log('\nfeito.');
