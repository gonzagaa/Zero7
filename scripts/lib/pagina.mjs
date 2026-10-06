// Preparo da home para captura/medição determinística.
//
// A home usa AOS, GSAP/ScrollTrigger e Lenis. Sem preparo, um screenshot de
// página inteira sai com metade das seções invisíveis:
//  - AOS.init roda sem `once`, então volta a esconder o que sai do viewport;
//  - os ScrollTriggers de #ba usam `toggleActions: play none none reverse`,
//    ou seja, voltar ao topo desfaz a entrada dos cards;
//  - Lenis intercepta o scroll;
//  - `html { scroll-behavior: smooth }` anima o scrollTo programático.
//
// A receita: destruir o Lenis, varrer a página até o fim (tudo entra), matar
// os ScrollTriggers no fim da varredura (para nada reverter), voltar ao topo,
// reafirmar as classes do AOS e congelar vídeos e a palavra rotativa do herói.
//
// Rede. O contexto só fala com a própria origem e com o que vem de fora mas
// compõe a página — bibliotecas, fontes, a API da central de ajuda e o selo
// do Reclame Aqui —, servido de um cache local. O resto é rastreamento,
// anúncio e chat (GTM, Google Ads e Analytics, Meta, RD Station, Hotjar, o
// send-event próprio, o Zendesk: 28 hosts numa carga, vários com requisição
// periódica), e é abortado. Era esperar por eles que deixava cada carga
// lenta — o 'load' levava até 25s — e cada medição um pouco diferente da
// anterior. Quem precisa de um terceiro abre com { terceiros: true };
// PAGINA_TERCEIROS=1 libera em qualquer script.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// O que vem de fora mas faz parte da página, por prefixo de endereço — sem
// isso, a página medida não é a página. As bibliotecas (sem elas o global.js
// para no AOS.init e o carrossel não monta); as fontes; a API da central de
// ajuda, de onde vêm as perguntas do #faq (sem ela a seção fica vazia e a
// página encolhe 1.000 a 1.500px no celular); e o selo do Reclame Aqui no
// rodapé. O conteúdo do #faq e do selo fica congelado no cache: apague
// shots/_cache para renovar.
const CONTEUDO = [
  'https://fonts.cdnfonts.com/', 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/',
  'https://code.jquery.com/', 'https://cdnjs.cloudflare.com/', 'https://cdn.jsdelivr.net/', 'https://unpkg.com/',
  'https://ajuda.zero7.com.br/api/',
  'https://s3.amazonaws.com/raichu-beta/', 'https://api.reclameaqui.com.br/',
];
const LOCAL = new Set(['127.0.0.1', 'localhost']);

// Cache das dependências em shots/_cache, fora do git (são arquivos de
// terceiros). Se preenche na primeira carga que consegue baixar cada arquivo;
// dali em diante a rede não entra mais na medição.
const CACHE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'shots', '_cache');

async function servirDoCache(route) {
  const url = route.request().url();
  const base = path.join(CACHE, createHash('sha1').update(url).digest('hex'));
  try {
    const [corpo, tipo] = await Promise.all([readFile(base), readFile(`${base}.tipo`, 'utf8')]);
    return await route.fulfill({ status: 200, body: corpo, headers: { 'content-type': tipo, 'access-control-allow-origin': '*' } });
  } catch {}
  try {
    const resposta = await route.fetch({ timeout: 20_000 });
    const corpo = await resposta.body();
    if (resposta.ok()) {
      await mkdir(CACHE, { recursive: true });
      await writeFile(base, corpo);
      await writeFile(`${base}.tipo`, resposta.headers()['content-type'] || 'application/octet-stream');
    }
    return await route.fulfill({ response: resposta, body: corpo });
  } catch {
    console.error(`    (aviso: dependência fora do cache e sem rede: ${url})`);
    return route.abort().catch(() => {});
  }
}

const PREPARADOS = new WeakSet();

// Uma vez por contexto: vale para todas as páginas e cargas dele, então o
// mesmo contexto serve a todas as larguras.
export async function prepararContexto(contexto, { terceiros = process.env.PAGINA_TERCEIROS === '1' } = {}) {
  if (PREPARADOS.has(contexto)) return;
  PREPARADOS.add(contexto);
  await contexto.route('**/*', (route) => {
    const url = route.request().url();
    let host = '';
    try { host = new URL(url).hostname; } catch {}
    if (LOCAL.has(host)) return route.continue();
    if (CONTEUDO.some((prefixo) => url.startsWith(prefixo))) return servirDoCache(route);
    return terceiros ? route.continue() : route.abort();
  });
}

// 390 e 430 entraram na fase 8: são as larguras dos iPhones em uso (13/14/15
// e os Pro Max). Com só 320 e 375, os problemas que apareceram no aparelho
// real não apareciam aqui.
export const LARGURAS = [320, 375, 390, 430, 768, 1024, 1280, 1474, 1920];

// Depois do DOMContentLoaded, uma espera fixa curta no lugar do 'load'. Sem
// os terceiros, o que ainda chega são imagens e fontes, e as duas têm espera
// própria mais abaixo.
const ESPERA_CURTA = 800;

export async function prepararPagina(page, url, opcoes = {}) {
  await prepararContexto(page.context(), opcoes);

  for (let tentativa = 1; ; tentativa++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      break;
    } catch (erro) {
      if (tentativa >= 3) throw erro;
      console.error(`    (aviso: goto estourou o tempo na tentativa ${tentativa}; repetindo)`);
    }
  }

  // Guarda a palavra que veio no HTML já no DOMContentLoaded: o GSAP gira a
  // palavra a cada 2s, e o harness chegou a "restaurar" uma palavra já girada
  // (a fase 4 comparou "ACESSÍVEL" com "LUCRATIVO" por isso).
  await page.evaluate(() => {
    window.__palavraHeroi =
      document.querySelector('.reveal-word')?.textContent ?? null;
  });
  await page.waitForTimeout(ESPERA_CURTA);

  // 1. Desarma o scroll suave (Lenis + scroll-behavior) para poder varrer. O
  //    popup promocional (hoje comentado no HTML) abre sozinho 4s depois da
  //    carga, no meio da medição: se voltar, fica escondido aqui.
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.id = 'harness-scroll';
    s.textContent = 'html{scroll-behavior:auto !important} #popupOverlay{display:none !important}';
    document.head.appendChild(s);

    if (window.lenis?.destroy) window.lenis.destroy();
    document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
  });

  // As duas famílias vinham do fonts.cdnfonts.com até a fase 20; hoje saem de
  // css/fonts/, pela própria origem. A espera fica: sem ela, se o
  // @font-face não carregar, o document.fonts.ready resolve na hora e a página
  // sairia medida na fonte de fallback — letra mais larga, linha mais alta —
  // e a comparação entre versões acusaria diferença onde não há (fase 8: 85
  // "mudanças" no retrato de 1474 que eram só a fonte). Da própria origem,
  // chegam na hora; a espera, de no máximo 10s, só avisa se algo der errado.
  const semFonte = await page.evaluate(async () => {
    const FAMILIAS = ['NCS Radhiumz', 'TT Fors Trial'];
    const faltam = () => FAMILIAS.filter((f) => ![...document.fonts]
      .some((face) => face.family.replace(/["']/g, '') === f && face.status === 'loaded'));
    const fim = Date.now() + 10_000;
    while (faltam().length && Date.now() < fim) {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 200));
    }
    return faltam();
  });
  if (semFonte.length) console.error(`    (aviso: fonte não carregou em 10s: ${semFonte.join(', ')})`);

  // 2. Varredura até o fim: dispara AOS, ScrollTrigger e as imagens lazy.
  await page.evaluate(async () => {
    const passo = Math.round(window.innerHeight * 0.8);
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += passo) {
      window.scrollTo(0, y);
      await espera(90);
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await espera(700);
  });

  // 3. No fim da página tudo já entrou. Mata os ScrollTriggers preservando o
  //    estado atual, para que a volta ao topo não reverta nada.
  await page.evaluate(() => {
    window.ScrollTrigger?.getAll?.().forEach((t) => t.kill(false));
  });

  // 4. Volta ao topo (estado canônico da nav) e reafirma o AOS.
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
    document.querySelectorAll('[data-aos]').forEach((el) => {
      el.classList.add('aos-animate');
    });
  });

  // 5. Congela o que varia entre execuções: vídeos em loop e a palavra do herói.
  await page.evaluate(async () => {
    document.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {}
    });

    window.gsap?.globalTimeline?.pause();

    const frente = document.querySelector('.reveal-word.is-front')
      || document.querySelector('.reveal-word');
    const tras = document.querySelector('.reveal-word.is-back');
    if (frente) {
      if (window.__palavraHeroi) frente.textContent = window.__palavraHeroi;
      frente.style.cssText += ';opacity:1;transform:none;filter:none;';
    }
    if (tras) tras.style.cssText += ';opacity:0;';

    // Espera as imagens que a varredura acabou de pedir.
    await Promise.all(
      [...document.images]
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', r, { once: true });
          setTimeout(r, 5000);
        }))
    );
  });

  await page.waitForTimeout(600);
}

/* ── Asserção da carga ─────────────────────────────────────────────────────
   Duas vezes o harness gravou número de uma página que não era a página: um
   baseline sem a fonte (o h1 media a caixa do fallback) e, em 1079, uma
   carga em que o CSS não tinha sido aplicado. Nos dois casos o número entrou
   no relatório sem ninguém desconfiar.

   Antes de CADA carga medida:
     a) as fontes carregaram E o h1 está na fonte pretendida, não no fallback;
     b) o :root está no corpo esperado para a largura (8px abaixo de 1080, 10
        de 1080 em diante) E o .wrapper tem recuo, ou seja, o CSS pegou.

   Falhou, tenta de novo uma vez. Falhou de novo, LANÇA — e quem chamou não
   grava nada. */
/* Depois do build (lote A, item 4): se a página carregou um bundle de hash
   diferente do que o build atual declara no manifest, o número medido seria
   de um site que não é o do working tree. Recusa e lança. */
const __RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
async function conferirBundle(page) {
  const manifesto = path.join(__RAIZ, "dist", "manifest.json");
  if (!fs.existsSync(manifesto)) return; // antes do build existir, nada a conferir
  const esperado = JSON.parse(fs.readFileSync(manifesto, "utf8")).css;
  if (!esperado) return;
  const carregado = await page.evaluate(() =>
    [...document.querySelectorAll("link[rel=stylesheet]")].map((l) => l.href).find((h) => h.includes("dist/home.")) || null);
  if (!carregado) return; // página sem bundle (satélite, versão antiga medida de propósito)
  const nome = carregado.split("/").pop();
  if (nome !== esperado.split("/").pop()) {
    throw new Error("bundle carregado (" + nome + ") não é o do build atual (" + esperado + ") — rode npm run build antes de medir");
  }
}

export async function conferirCarga(page, largura, { tentativa = 1, raizEsperada } = {}) {
  await conferirBundle(page);
  // O corpo da raiz é do DESENHO, não da carga: no baseline (630eb1f) a regra
  // de 62,5% acima de 1080 ainda não existia, e lá a raiz é 8px em qualquer
  // largura. Medir o baseline com a expectativa do HEAD reprovava carga boa —
  // por isso a expectativa entra por parâmetro. O que NÃO é negociável e vale
  // para qualquer versão: fonte carregada, h1 fora do fallback e .wrapper com
  // recuo, que é o que prova que o CSS pegou.
  const esperado = raizEsperada ?? (largura >= 1080 ? 10 : 8);
  const r = await page.evaluate((px) => {
    const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const h1 = document.querySelector('h1');
    const famH1 = h1 ? getComputedStyle(h1).fontFamily : '';
    const w = document.querySelector('.wrapper');
    const cw = w ? getComputedStyle(w) : null;
    return {
      fontesProntas: document.fonts.status === 'loaded',
      famH1,
      h1NaFontePretendida: /NCS Radhiumz/i.test(famH1),
      raiz,
      raizOk: Math.abs(raiz - px) < 0.5,
      wrapper: w ? Math.round(w.getBoundingClientRect().width) : null,
      cssAplicado: !!cw && cw.paddingLeft !== '0px',
    };
  }, esperado);

  const falhas = [];
  if (!r.fontesProntas) falhas.push('document.fonts.status não é "loaded"');
  if (!r.h1NaFontePretendida) falhas.push('h1 no fallback: ' + r.famH1);
  if (!r.raizOk) falhas.push(':root em ' + r.raiz + 'px, esperado ' + esperado + 'px');
  if (!r.cssAplicado) falhas.push('o .wrapper está sem recuo — CSS não aplicado');

  if (!falhas.length) return { ...r, tentativas: tentativa };
  if (tentativa >= 2) {
    const e = new Error('carga inválida em ' + largura + 'px (2 tentativas): ' + falhas.join(' | '));
    e.assercao = falhas;
    throw e;
  }
  await page.waitForTimeout(1500);
  return conferirCarga(page, largura, { tentativa: tentativa + 1, raizEsperada });
}
