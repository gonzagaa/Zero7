// FOUC é a falha do item 5, e este é o juiz — medindo ESTILO, não conteúdo.
//
//   node scripts/fouc.mjs
//
// Régua A (a pergunta certa): a MESMA página duas vezes, imagens e
// terceiros bloqueados, animações congeladas — uma carga só com o crítico
// (o bundle é abortado na rede) e uma com o CSS completo. O diff acima da
// dobra é exatamente o que o crítico deixou de cobrir. <= 0,5% passa.
//
// Régua B (a literal do prompt): screenshot no FCP x no load, sem bloquear
// nada. Vai junto no relatório, com a ressalva: ela mede também a CHEGADA
// de imagem, terceiro e a troca da palavra do h1 — coisas que já diferiam
// antes do item 5.
import { chromium } from 'playwright';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const TERCEIROS = /googletagmanager|zdassets|zendesk|facebook|hotjar|reclameaqui|rdstation|cloudfront|doubleclick|google\.com|unpkg\.com\/ionicons/i;

const diffPct = async (a, b, altura) => {
  const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).resize({ width: A.info.width, height: A.info.height }).raw().toBuffer({ resolveWithObject: true });
  const linhas = Math.min(altura, A.info.height);
  const px = A.info.width * linhas;
  let dif = 0;
  for (let j = 0; j < px; j++) {
    const k = j * A.info.channels;
    const d = Math.abs(A.data[k] - B.data[k]) + Math.abs(A.data[k + 1] - B.data[k + 1]) + Math.abs(A.data[k + 2] - B.data[k + 2]);
    if (d > 24) dif++;
  }
  return 100 * dif / px;
};

let falhou = false;
// F3a: 1280 e 1920 entraram — o crítico agora é extraído também a 1920.
// Container fluido (out/2026): 1366 e 1536 entraram — são as larguras de
// notebook que o clamp do --container-max passou a diferenciar.
for (const vp of [{ w: 390, h: 844 }, { w: 1280, h: 900 }, { w: 1366, h: 900 }, { w: 1474, h: 900 }, { w: 1536, h: 900 }, { w: 1920, h: 1080 }]) {
  const capturar = async (soCritico) => {
    const ctx = await nav.newContext({ viewport: { width: vp.w, height: vp.h }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.route('**/*', (rota) => {
      const url = rota.request().url();
      const tipo = rota.request().resourceType();
      if (tipo === 'image' || tipo === 'media' || TERCEIROS.test(url)) return rota.abort();
      if (soCritico && /dist\/home\.[0-9a-f]{8}\.css/.test(url)) return rota.abort();
      return rota.continue();
    });
    await p.goto(servidor.url, { waitUntil: 'load', timeout: 120_000 }).catch(() => {});
    await p.waitForTimeout(2500);
    await p.evaluate(() => { for (const a of document.getAnimations({ subtree: true })) { try { a.pause(); a.currentTime = 0; } catch (e) {} } }).catch(() => {});
    // congela os dígitos do contador: as duas capturas são tiradas com
    // segundos de diferença e o relógio virava ~0,4% de "diff" que não é
    // FOUC — o retrato exclui a tarja pelo mesmo motivo
    await p.evaluate(() => { document.querySelectorAll('#countdownPromo span:not(.label)').forEach((el) => { el.textContent = '00'; }); }).catch(() => {});
    await p.waitForTimeout(150);
    const shot = await p.screenshot();
    await ctx.close();
    return shot;
  };

  const difs = [];
  for (let i = 0; i < 5; i++) {
    const so = await capturar(true);
    const cheio = await capturar(false);
    await sharp(so).toFile(`shots/fouc-A-${vp.w}-c${i}-critico.png`);
    await sharp(cheio).toFile(`shots/fouc-A-${vp.w}-c${i}-cheio.png`);
    difs.push(await diffPct(`shots/fouc-A-${vp.w}-c${i}-critico.png`, `shots/fouc-A-${vp.w}-c${i}-cheio.png`, vp.h));
  }
  const ok = difs.every((d) => d <= 0.5);
  if (!ok) falhou = true;
  console.log(`A ${vp.w}: só-crítico x completo: ${difs.map((d) => d.toFixed(2)).join(' | ')}%  ${ok ? 'OK' : 'ESTOUROU'}`);
}
await nav.close();
await servidor.fechar();
process.exitCode = falhou ? 1 : 0;
