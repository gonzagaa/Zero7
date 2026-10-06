// Subconjunto do herói (lote E, E1): as faces que pintam no primeiro
// frame ganham um .hero.woff2 minúsculo com SÓ os caracteres da primeira
// viewport, gerado NO BUILD a partir do texto real do index.html — a copy
// muda toda semana e o subconjunto acompanha sozinho; ninguém edita os
// .hero à mão (regra no AUDITORIA). As faces completas (.sub) saem da
// fila crítica e entram por JS depois do load (build.mjs).
//
// Extração: o trecho do HTML do <body até o fim do </header> do herói
// cobre tarja, nav e herói — tudo que pinta na primeira viewport nas duas
// larguras. Scripts/styles saem, tags saem, entidades voltam a texto. O
// conjunto ganha as duas caixas (o CSS usa text-transform: uppercase, e
// glifo de caixa alta precisa existir), os dígitos e a pontuação do
// contador, e as palavras rotativas do h1 (vivem no global.js).
//
// Medido no lote D (d1-variantes.json): este desenho dá +7/+8 no mobile
// com a marca no primeiro frame. O charset é ÚNICO para as 7 faces (a
// variante por-face do B4 mediu a MESMA mediana, 88 — cada arquivo TT tem
// ~10KB de overhead fixo e o corte de caracteres rende pouco; o charset
// único é determinístico sem navegador, e o build pode gerar sozinho).
import subsetFont from 'subset-font';
import * as fontkit from 'fontkit';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// As 7 faces pintam o frame 1 (medido no lote D: o "NCS 500/700" das
// sondas é peso sintetizado da única face 400).
export const FACES_HERO = [
  { nome: 'NCS Radhiumz', familia: 'NCS Radhiumz', peso: 400 },
  { nome: 'TT Fors Trial Light', familia: 'TT Fors Trial', peso: 300 },
  { nome: 'TT Fors Trial Regular', familia: 'TT Fors Trial', peso: 400 },
  { nome: 'TT Fors Trial Medium', familia: 'TT Fors Trial', peso: 500 },
  { nome: 'TT Fors Trial DemiBold', familia: 'TT Fors Trial', peso: 600 },
  { nome: 'TT Fors Trial Bold', familia: 'TT Fors Trial', peso: 700 },
  { nome: 'TT Fors Trial ExtraBold', familia: 'TT Fors Trial', peso: 800 },
];

// (Medido no E1: estender a fatia ao </body> — cobrir com o hero também
// os caracteres que só existem abaixo da dobra — custa +20KB de preload,
// derruba 1 ponto do LH e NÃO muda o CLS de 1474. A fatia fica no herói.)
export function extrairTextoDaDobra(html) {
  const ini = html.indexOf('<body');
  const fim = html.indexOf('</header>');
  if (ini < 0 || fim < 0) throw new Error('fatia do herói não encontrada');
  let t = html.slice(ini, fim);
  t = t.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  // as palavras rotativas do h1 vivem no global.js; entram fixas aqui
  t += ' acessível seguro lucrativo';
  // contador e moeda
  t += ' 0123456789:dhms%+R$.,–—-';
  const chars = new Set();
  for (const c of (t.toUpperCase() + t.toLowerCase())) {
    if (!/\s/.test(c) || c === ' ') chars.add(c);
  }
  chars.add(' ');
  return [...chars].sort().join('');
}

export function faixasUnicode(texto) {
  const pontos = [...new Set([...texto].map((c) => c.codePointAt(0)))].sort((a, b) => a - b);
  const faixas = [];
  let ini = pontos[0], fim = pontos[0];
  for (const p of pontos.slice(1)) {
    if (p === fim + 1) { fim = p; continue; }
    faixas.push([ini, fim]); ini = fim = p;
  }
  faixas.push([ini, fim]);
  return faixas.map(([a, b]) => a === b ? 'U+' + a.toString(16).toUpperCase() : 'U+' + a.toString(16).toUpperCase() + '-' + b.toString(16).toUpperCase()).join(', ');
}

// Gera css/fonts/<face>.hero.woff2 para cada face do frame 1, a partir da
// COMPLETA (.sub — mesmos glifos e métricas; a troca hero→completa depois
// do load não mexe em nada acima da dobra). Determinístico: mesma
// entrada, mesmos bytes — o git diff do npm run check acusa subconjunto
// desatualizado. Valida que TODO caractere do charset coberto pela
// completa está no hero: faltou, lança (é o "check falha se um caractere
// do hero não estiver no subset").
export async function gerarSubsetsHero(RAIZ, texto) {
  const saidas = [];
  for (const face of FACES_HERO) {
    const origem = path.join(RAIZ, 'css', 'fonts', face.nome + '.sub.woff2');
    const destino = path.join(RAIZ, 'css', 'fonts', face.nome + '.hero.woff2');
    const bytesOrigem = fs.readFileSync(origem);
    const sub = await subsetFont(bytesOrigem, texto, { targetFormat: 'woff2' });
    fs.writeFileSync(destino, sub);

    const fonteOrigem = fontkit.create(bytesOrigem);
    const fonteHero = fontkit.create(sub);
    const faltam = [...texto].filter((c) => {
      const cp = c.codePointAt(0);
      return fonteOrigem.hasGlyphForCodePoint(cp) && !fonteHero.hasGlyphForCodePoint(cp);
    });
    if (faltam.length) {
      throw new Error(`hero de ${face.nome} sem os caracteres: ${faltam.join(' ')} — o subconjunto não cobre a primeira viewport`);
    }
    saidas.push({ ...face, bytes: sub.length, hash: crypto.createHash('sha256').update(sub).digest('hex').slice(0, 8) });
  }
  return saidas;
}
