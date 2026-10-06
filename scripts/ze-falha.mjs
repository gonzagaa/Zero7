// E se o zero7LigarZendesk sumir? O botão tem que ficar ESCONDIDO.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const largura = Number(process.argv[2] || 390);
const modo = process.argv[3] || 'normal';
const quebrar = modo === 'quebrar';
const MOVEL = largura < 1080;
const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: largura, height: MOVEL ? 844 : 900 }, isMobile: MOVEL, hasTouch: MOVEL, locale: 'pt-BR' });
const p = await ctx.newPage();
if (quebrar) {
  // simula o acoplamento quebrado: o global.js entra sem a função
  await p.route('**/script/global.js*', async (rota) => {
    const r = await rota.fetch();
    let corpo = await r.text();
    corpo = corpo.replace('window.zero7LigarZendesk = ligarBotaoDoZendesk', 'window.zero7LigarZendesk = undefined');
    await rota.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: corpo });
  });
}
await p.goto(servidor.url, { waitUntil: 'load', timeout: 120000 });
await p.waitForFunction(() => typeof window.zE === 'function', null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(7000);
if (modo === 'mostra') {
  // passa da dobra do #ba e FICA: o botão tem que aparecer.
  await p.evaluate(() => { const ba = document.getElementById('ba'); if (ba) scrollTo({ top: ba.getBoundingClientRect().top + scrollY + ba.offsetHeight + 400, behavior: 'instant' }); });
  await p.waitForTimeout(3000);
}
if (modo === 'volta') {
  // passa da dobra do #ba e VOLTA ao topo: com a dobra só mostrando, o botão
  // fica na tela. Era o que a fase 8 escondia.
  await p.evaluate(() => { const ba = document.getElementById('ba'); if (ba) scrollTo({ top: ba.getBoundingClientRect().top + scrollY + ba.offsetHeight + 400, behavior: 'instant' }); });
  await p.waitForTimeout(2500);
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await p.waitForTimeout(2500);
}
const r = await p.evaluate(() => ({
  temFuncao: typeof window.zero7LigarZendesk,
  rolagem: Math.round(scrollY),
  lancador: [...document.querySelectorAll('iframe')].filter(f => /Botão para abrir/i.test(f.title)).map(f => {
    const b = f.getBoundingClientRect(); const cs = getComputedStyle(f);
    return { caixa: Math.round(b.width) + 'x' + Math.round(b.height), visivel: cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0 && b.width > 0 };
  }),
}));
console.log((quebrar ? 'ACOPLAMENTO QUEBRADO' : modo).padEnd(22), '@' + largura, '| zero7LigarZendesk:', r.temFuncao, '| rolagem', r.rolagem + 'px');
for (const l of r.lancador) console.log('   lançador:', l.visivel ? 'VISÍVEL  <-- ruim se no topo' : 'escondido', l.caixa);
if (!r.lancador.length) console.log('   lançador: nenhum iframe de lançador');
await nav.close();
await servidor.fechar();
