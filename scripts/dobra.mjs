// A dobra no navegador do Instagram: o que aparece sem rolar, no celular.
// O navegador do app tem barras próprias em cima e embaixo, então a área
// visível é menor que a tela. As alturas abaixo são estimativas dessa área
// por aparelho (tela menos as barras do app), não medições no aparelho.
//
//   node scripts/dobra.mjs fase8
//
// Salva medidas/<rótulo>-dobra.md; com CAPTURAS=1, também
// shots/<rótulo>-dobra/<aparelho>.png. Um contexto de toque só: o aparelho
// muda pelo viewport e a página recarrega.

import { chromium } from 'playwright';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rotulo = process.argv[2];
if (!rotulo) {
  console.error('Uso: node scripts/dobra.mjs <rótulo>   (ex: fase8)');
  process.exit(1);
}

const APARELHOS = [
  { nome: 'iPhone 12/13 mini', arquivo: '375x640', w: 375, h: 640 },
  { nome: 'iPhone 13/14/15', arquivo: '390x672', w: 390, h: 672 },
  { nome: 'iPhone Plus/Pro Max', arquivo: '430x760', w: 430, h: 760 },
  { nome: 'iPhone SE (2ª/3ª)', arquivo: '375x550', w: 375, h: 550 },
  { nome: 'iPhone SE (1ª)', arquivo: '320x460', w: 320, h: 460 },
];

const CAPTURAS = process.env.CAPTURAS === '1';
const destino = path.join(RAIZ, 'shots', `${rotulo}-dobra`);
if (CAPTURAS) await mkdir(destino, { recursive: true });
await mkdir(path.join(RAIZ, 'medidas'), { recursive: true });

const linhas = [];
const servidor = await iniciarServidor(RAIZ);
const navegador = await chromium.launch();
try {
  const contexto = await navegador.newContext({
    viewport: { width: APARELHOS[0].w, height: APARELHOS[0].h },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
    locale: 'pt-BR',
  });
  const page = await contexto.newPage();
  for (const a of APARELHOS) {
    await page.setViewportSize({ width: a.w, height: a.h });
    await prepararPagina(page, servidor.url);
    await page.waitForTimeout(800);

    const m = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      return {
        nav: Math.round(r('#navigation').bottom),
        foto: Math.round(r('#home .image img.mobile').top),
        h1: Math.round(r('#home h1').top),
        botao: Math.round(r('#home .btn').bottom),
      };
    });
    if (CAPTURAS) {
      try {
        await page.screenshot({ path: path.join(destino, `${a.arquivo}.png`), timeout: 60_000 });
      } catch {
        console.error(`    (aviso: sem captura em ${a.arquivo})`);
      }
    }

    const folga = a.h - m.botao;
    linhas.push(`| ${a.nome} | ${a.w} × ${a.h} | ${m.nav} | ${m.foto} | ${m.h1} | ${m.botao} | ${folga} | ${folga >= 0 ? 'sim' : 'não'} |`);
    console.log(`  ${a.arquivo}: base do botão ${m.botao} de ${a.h} (${folga >= 0 ? 'visível' : 'abaixo da dobra'})`);
  }
  await contexto.close();
} finally {
  await navegador.close();
  await servidor.fechar();
}

const md = `# Dobra no navegador do Instagram — ${rotulo}

Área visível estimada: a tela do aparelho menos as barras do navegador do
app. Posições em px a partir do topo da área visível, com a página parada no
topo. "Folga" é quanto sobra entre a base do botão do herói e a dobra —
negativa, o botão só aparece rolando.

| Aparelho | Área visível | Base da nav | Topo da foto | Topo do H1 | Base do botão | Folga | Botão sem rolar |
|---|---|---|---|---|---|---|---|
${linhas.join('\n')}
`;
await writeFile(path.join(RAIZ, 'medidas', `${rotulo}-dobra.md`), md);
console.log(`\nSalvo medidas/${rotulo}-dobra.md`);
