// Capturas da home. OPCIONAIS: rode só quando pedirem. A verificação de cada
// fase é numérica (medir, movel, retrato, cls, a11y); captura é para olhar,
// e custa tempo e disco.
//
//   node scripts/shots.mjs <rótulo>                          # página inteira
//   node scripts/shots.mjs <rótulo> --regiao "#ba"           # só o trecho, com 160px de margem
//   node scripts/shots.mjs <rótulo> --regiao "#ba" --margem 80 --larguras 375,1474
//
// Salva shots/<rótulo>/<largura>.png, nas larguras do harness (ou nas de
// --larguras). Um navegador e um contexto só: a largura muda pelo viewport e
// a página é recarregada em cada uma. Com --regiao, a captura é o retângulo
// do primeiro elemento que casa com o seletor, mais a margem em cima e
// embaixo, na largura toda da tela.
//
// Não altera nada do site: sobe um servidor estático temporário sobre a raiz
// do projeto, abre a página e fotografa.

import { chromium } from 'playwright';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { LARGURAS, prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const [rotulo, ...resto] = process.argv.slice(2);
const opcao = (nome) => {
  const i = resto.indexOf(`--${nome}`);
  return i >= 0 ? resto[i + 1] : undefined;
};
if (!rotulo || rotulo.startsWith('--')) {
  console.error('Uso: node scripts/shots.mjs <rótulo> [--regiao <seletor>] [--margem <px>] [--larguras 375,1474]');
  process.exit(1);
}
const regiao = opcao('regiao');
const margem = Number(opcao('margem') ?? 160);
const larguras = opcao('larguras') ? opcao('larguras').split(',').map(Number) : LARGURAS;

const destino = path.join(RAIZ, 'shots', rotulo);
await mkdir(destino, { recursive: true });

const servidor = await iniciarServidor(RAIZ);
const navegador = await chromium.launch();

console.log(`Rótulo: ${rotulo} → shots/${rotulo}/ · ${regiao ? `região ${regiao} (±${margem}px)` : 'página inteira'}\n`);

try {
  const contexto = await navegador.newContext({
    viewport: { width: larguras[0], height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    locale: 'pt-BR',
  });
  const page = await contexto.newPage();

  for (const largura of larguras) {
    await page.setViewportSize({ width: largura, height: 900 });
    await prepararPagina(page, servidor.url);
    const arquivo = path.join(destino, `${largura}.png`);

    if (!regiao) {
      await page.screenshot({ path: arquivo, fullPage: true });
      const altura = await page.evaluate(() => document.documentElement.scrollHeight);
      console.log(`  ${String(largura).padStart(4)}px  →  ${largura}.png  (página de ${altura}px)`);
      continue;
    }

    const caixa = await page.evaluate((seletor) => {
      const el = document.querySelector(seletor);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { y: r.top + scrollY, h: r.height, pagina: document.documentElement.scrollHeight };
    }, regiao);
    if (!caixa) {
      console.error(`  ${String(largura).padStart(4)}px  →  "${regiao}" não existe na página`);
      continue;
    }
    const y = Math.max(0, Math.floor(caixa.y - margem));
    const h = Math.min(caixa.pagina - y, Math.ceil(caixa.h + 2 * margem));
    await page.screenshot({ path: arquivo, fullPage: true, clip: { x: 0, y, width: largura, height: h } });
    console.log(`  ${String(largura).padStart(4)}px  →  ${largura}.png  (${h}px em volta de ${regiao})`);
  }

  await contexto.close();
} finally {
  await navegador.close();
  await servidor.fechar();
}

const saiu = (await readdir(destino)).filter((f) => f.endsWith('.png')).sort();
console.log(`\n${saiu.length}/${larguras.length} imagens em shots/${rotulo}/`);
if (saiu.length < larguras.length) process.exitCode = 1;
