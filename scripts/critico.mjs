// Extrai o CSS crítico (acima da dobra) nas DUAS viewports do protocolo e
// grava dist/critico.css + o hash do bundle contra o qual ele nasceu.
//
//   node scripts/critico.mjs
//
// A extração é própria (Playwright), não o pacote critical: roda no mesmo
// Chromium do harness, sem puppeteer paralelo. O método: carrega a página
// JÁ CONSTRUÍDA (bundle em dist/), e para cada regra do bundle pergunta ao
// navegador se algum elemento que ela alcança está acima da dobra. A regra
// que casou em QUALQUER uma das duas viewports entra, NA ORDEM original do
// bundle — a ordem é o cascade; reordenar mudaria o resultado.
//
// Vai junto: todo @font-face, todo @keyframes, e as regras de :root/html/
// body (variáveis e chão da página). @media entram avaliadas dentro da
// viewport que as satisfaz, embrulhadas de volta na sua condição.
import { chromium } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(RAIZ, 'dist/manifest.json'), 'utf8'));
if (!manifest.css) { console.error('rode o build antes: não há bundle no manifest'); process.exit(1); }

const servidor = await iniciarServidor(RAIZ);
const nav = await chromium.launch();

// mapa rule-index -> manter, preenchido pelas duas viewports
let mantidas = null;

/* F3a: 1920×1080 entrou na extração. Só 390 e 1474 deixavam TODA a faixa
   ≥1600 fora do crítico: a 1920 o wrapper do herói crescia 579→725px e o
   #divisa nascia com altura 0 quando o bundle chegava — CLS 0,36 medido.
   Regra no AUDITORIA: toda faixa de breakpoint que muda o herói precisa
   de uma viewport na extração. */
for (const vp of [{ w: 390, h: 844 }, { w: 1280, h: 900 }, { w: 1474, h: 900 }, { w: 1920, h: 1080 }]) {
  const ctx = await nav.newContext({ viewport: { width: vp.w, height: vp.h }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(servidor.url, { waitUntil: 'load', timeout: 120_000 });
  await p.waitForTimeout(2500);
  const escolha = await p.evaluate((nomeBundle) => {
    const folha = [...document.styleSheets].find((s) => s.href && s.href.includes(nomeBundle));
    if (!folha) return null;
    const dobra = window.innerHeight + 40; // 40px de folga: meia linha a mais não dói
    const ancorasHint = new Set(); // offsetParents exigidos pelo hint-largo (2ª passada)
    // tira pseudo-elementos e pseudo-classes de interação para o matches()
    const limpar = (sel) => sel.replace(/::?[a-zA-Z-]+(\([^)]*\))?/g, (m) => (/^::?(not|is|where|has|nth|first|last|only)/.test(m) ? m : ''));
    const acima = (sel, regraEsconde) => {
      const limpo = limpar(sel);
      let els;
      try { els = document.querySelectorAll(limpo || sel); } catch (e) { return true; } // seletor que não parseia limpo: manter, na dúvida
      for (const el of els) {
        // Regra que ESCONDE um alvo que existe: fica, mesmo sem caixa — a
        // caixa não existe JUSTAMENTE porque a regra esconde. Sem isto, os
        // dois logos da nav apareciam empilhados na página só-com-crítico.
        if (regraEsconde) return true;
        const r = el.getBoundingClientRect();
        if (!(r.top < dobra && r.bottom > -40 && (r.width || r.height))) continue;
        // Absoluto/fixo só conta se a ÂNCORA também está na dobra: o blob
        // decorativo do #ba (69rem, blur de 100px, top -20%) vaza
        // fisicamente para dentro da dobra em 1474, mas o pai não — e sem o
        // position:relative do pai (descartado), o blob re-ancorava no body
        // e manchava o herói inteiro de azul na página só-com-crítico.
        const cs = getComputedStyle(el);
        if (cs.position === 'absolute' || cs.position === 'fixed') {
          const anc = el.offsetParent || document.documentElement;
          const ra = anc.getBoundingClientRect();
          if (!(ra.top < dobra && ra.bottom > -40)) continue;
        }
        return true;
      }
      return false;
    };
    const decidir = (regra) => {
      if (regra.type === CSSRule.FONT_FACE_RULE) return true;
      if (regra.type === CSSRule.KEYFRAMES_RULE) return true;
      // @property registra custom properties (--mx, --my, --spin…). SEM o
      // registro, um var() delas em declaração composta invalida a
      // declaração INTEIRA no computed-value time — o fundo dos CTAs saía
      // background:none na página só-com-crítico. São minúsculas; ficam.
      if (typeof CSSPropertyRule !== 'undefined' && regra instanceof CSSPropertyRule) return true;
      if (regra.cssText && regra.cssText.trimStart().startsWith('@property')) return true;
      if (regra.type === CSSRule.STYLE_RULE) {
        const sel = regra.selectorText;
        // Regra que ESCONDE: a caixa do alvo não existe justamente porque a
        // regra esconde — sem esta exceção, os dois logos da nav apareciam
        // empilhados na página só-com-crítico.
        /* display:contents entra na mesma exceção do display:none: o alvo
           NÃO gera caixa (getBoundingClientRect dá 0×0) justamente por
           causa da regra — sem ela no crítico, o <picture> da tarja
           virava caixa inline na fase inicial e DOBRAVA de largura quando
           o bundle chegava (shift de 0,086 em 1474, lote E). */
        const esconde = /display:\s*(none|contents)|visibility:\s*hidden|content:\s*none/i.test(regra.style.cssText);
        if (/(^|,)\s*(:root|html|body)\b/.test(sel)) return true;
        /* E2: regra que SEGURA um alvo com hint de largura maior que a
           viewport é crítica em QUALQUER dobra. O cupom (width="4138" no
           markup, lá embaixo em #plan) rendia 4138px na fase só-crítico:
           o body ia a ~4157px, o Chrome mobile TRAVAVA o zoom em 0,25
           para caber, o ICB dos elementos fixos expandia — e a tarja e a
           nav nasciam com ~1082px, colapsando quando o bundle chegava.
           Era ESTE o grosso do "shift da tarja" do Lighthouse. O fouc.mjs
           não via porque não emula mobile (sem auto-zoom, sem sintoma). */
        if (regra.style.width || regra.style.maxWidth || regra.style.height) {
          try {
            for (const el of document.querySelectorAll(limpar(sel) || sel)) {
              const hint = Number(el.getAttribute && el.getAttribute('width'));
              if (hint > window.innerWidth) {
                /* Se a regra mantida POSICIONA o alvo (absolute/fixed), a
                   ÂNCORA precisa vir junto: sem o position do pai, o
                   ba-card__bg (absolute, inset:0) reancorava no viewport
                   inteiro e virava moldura de imagem quebrada na fase
                   só-crítico — a segunda passada abaixo mantém a regra de
                   position do offsetParent. */
                const cs = getComputedStyle(el);
                if ((cs.position === 'absolute' || cs.position === 'fixed') && el.offsetParent) ancorasHint.add(el.offsetParent);
                return true;
              }
            }
          } catch (e) { /* seletor que não parseia: o acima() decide */ }
        }
        // D2: seletor que EXIGE interação não pinta o frame 1 — o estado
        // :hover/:focus/:active não existe antes do primeiro input, e o
        // bundle chega antes de qualquer interação plausível. (:visited e
        // afins pintam o frame 1 e continuam contando.)
        const exigeInteracao = (s) => /:(hover|focus|focus-visible|focus-within|active)\b/.test(s);
        return sel.split(',').some((s) => !exigeInteracao(s) && acima(s.trim(), esconde));
      }
      if (regra.type === CSSRule.MEDIA_RULE) {
        if (!matchMedia(regra.conditionText).matches) return null; // a outra viewport decide
        return [...regra.cssRules].map(decidir);
      }
      if (regra.type === CSSRule.SUPPORTS_RULE) return [...regra.cssRules].map(decidir);
      return false;
    };
    const primeira = [...folha.cssRules].map(decidir);
    // 2ª passada: mantém a regra de POSITION das âncoras que o hint-largo
    // exigiu (o pai pode aparecer em regra processada antes do filho)
    const decidirAncora = (regra) => {
      if (regra.type === CSSRule.STYLE_RULE) {
        if (!regra.style.position) return false;
        try {
          for (const el of document.querySelectorAll(limpar(regra.selectorText) || regra.selectorText)) if (ancorasHint.has(el)) return true;
        } catch (e) {}
        return false;
      }
      if (regra.type === CSSRule.MEDIA_RULE) {
        if (!matchMedia(regra.conditionText).matches) return null;
        return [...regra.cssRules].map(decidirAncora);
      }
      if (regra.type === CSSRule.SUPPORTS_RULE) return [...regra.cssRules].map(decidirAncora);
      return false;
    };
    const segunda = ancorasHint.size ? [...folha.cssRules].map(decidirAncora) : null;
    const fundirLocal = (a, b) => {
      if (b === null || b === undefined) return a;
      if (Array.isArray(b)) { const base = Array.isArray(a) ? a : []; return b.map((x, i) => fundirLocal(base[i], x)); }
      if (Array.isArray(a)) return a; // decisão em árvore vence booleano da 2ª passada
      return a === true || b === true;
    };
    return segunda ? primeira.map((x, i) => fundirLocal(x, segunda[i])) : primeira;
  }, manifest.css.split('/').pop());
  if (!escolha) { console.error('bundle não encontrado na página em ' + vp.w); process.exit(1); }

  // funde: true vence null/false; arrays fundem posição a posição
  const fundir = (a, b) => {
    if (b === null || b === undefined) return a;
    if (Array.isArray(b)) { const base = Array.isArray(a) ? a : []; return b.map((x, i) => fundir(base[i], x)); }
    return a === true || b === true;
  };
  mantidas = mantidas === null ? escolha : escolha.map((x, i) => fundir(mantidas[i], x));
  await ctx.close();
}
await nav.close();

// segunda passada: reconstrói o texto na ordem do bundle
const bundle = fs.readFileSync(path.join(RAIZ, manifest.css), 'utf8');
const nav2 = await chromium.launch();
const ctx2 = await nav2.newContext();
const p2 = await ctx2.newPage();
await p2.setContent('<!doctype html><meta charset="utf-8">');
const resultado = await p2.evaluate(({ css, mantidas }) => {
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
  // D2: um @keyframes só fica se alguma regra MANTIDA o referencia — os
  // outros são peso morto no frame 1 (o bundle os traz para depois).
  const usados = new Set();
  const coletar = (regra, decisao) => {
    if (decisao === true && regra.style && regra.style.animationName) {
      for (const n of regra.style.animationName.split(',')) {
        const nome = n.trim();
        if (nome && nome !== 'none') usados.add(nome);
      }
    }
    if (Array.isArray(decisao) && regra.cssRules) {
      [...regra.cssRules].forEach((r, i) => coletar(r, decisao[i]));
    }
  };
  [...st.sheet.cssRules].forEach((r, i) => coletar(r, mantidas[i]));

  /* E2: shorthand com var() é "pending substitution" no Chromium — o
     cssText imprime os LONGHANDS VAZIOS ("background-image: ;") e o valor
     não sai por NENHUMA API do CSSOM (nem getPropertyValue). O crítico
     saía com o gradiente do "2023" (#divisa) e o fundo do botão da nav em
     BRANCO, e o -webkit-text-fill-color: transparent órfão apagava o
     texto na fase só-crítico (o fouc pegou). A saída é emitir o TEXTO-
     FONTE do bundle: um scanner de chaves próprio produz a mesma árvore
     de regras, ALINHADA ao CSSOM por contagem em cada nível; alinhou, a
     regra mantida sai como está escrita no bundle; desalinhou (CSSOM
     descarta regra que não parseia), aquele nível cai de volta no
     cssText e avisa. */
  const escanear = (css) => {
    const regras = [];
    let i = 0;
    const n = css.length;
    while (i < n) {
      while (i < n && /\s/.test(css[i])) i++;
      if (i >= n) break;
      if (css.startsWith('/*', i)) { const f = css.indexOf('*/', i + 2); if (f < 0) break; i = f + 2; continue; }
      const ini = i;
      let profundidade = 0, fim = -1, aspas = null;
      for (let j = i; j < n; j++) {
        const c = css[j];
        if (aspas) { if (c === '\\') j++; else if (c === aspas) aspas = null; continue; }
        if (c === '"' || c === "'") { aspas = c; continue; }
        if (c === '{') profundidade++;
        else if (c === '}') { profundidade--; if (profundidade === 0) { fim = j; break; } }
        else if (c === ';' && profundidade === 0) { fim = j; break; }
      }
      if (fim < 0) break;
      const bloco = css.slice(ini, fim + 1);
      const abre = bloco.indexOf('{');
      if (abre >= 0 && /^@(media|supports)\b/.test(bloco.trimStart())) {
        regras.push({ cabeca: bloco.slice(0, abre).trim(), filhos: escanear(bloco.slice(abre + 1, bloco.length - 1)), texto: bloco });
      } else {
        regras.push({ texto: bloco });
      }
      i = fim + 1;
    }
    return regras;
  };
  const fonteArvore = escanear(css);
  let desalinhados = 0;

  const emitir = (regra, decisao, fonte) => {
    if (regra.type === CSSRule.KEYFRAMES_RULE && !usados.has(regra.name)) return '';
    if (decisao === true) return (fonte && fonte.texto) ? fonte.texto : (desalinhados++, regra.cssText);
    if (Array.isArray(decisao)) {
      const filhosCssom = [...regra.cssRules];
      const filhosFonte = (fonte && fonte.filhos && fonte.filhos.length === filhosCssom.length) ? fonte.filhos : null;
      const dentro = filhosCssom.map((r, i) => emitir(r, decisao[i], filhosFonte ? filhosFonte[i] : null)).filter(Boolean).join('\n');
      if (!dentro) return '';
      if (regra.type === CSSRule.MEDIA_RULE) return `@media ${regra.conditionText}{${dentro}}`;
      if (regra.type === CSSRule.SUPPORTS_RULE) return `@supports ${regra.conditionText}{${dentro}}`;
      return dentro;
    }
    return '';
  };
  const topoCssom = [...st.sheet.cssRules];
  const topoFonte = fonteArvore.length === topoCssom.length ? fonteArvore : null;
  const saida = topoCssom.map((r, i) => emitir(r, mantidas[i], topoFonte ? topoFonte[i] : null)).filter(Boolean).join('\n');
  return { saida, desalinhados, topoAlinhado: !!topoFonte, contagem: [fonteArvore.length, topoCssom.length] };
}, { css: bundle, mantidas });
await nav2.close();
await servidor.fechar();

if (!resultado.topoAlinhado) console.warn(`AVISO: scanner (${resultado.contagem[0]}) e CSSOM (${resultado.contagem[1]}) desalinhados no topo — emitindo pelo cssText (shorthand com var() pode sair vazio)`);
else if (resultado.desalinhados) console.warn(`AVISO: ${resultado.desalinhados} regras emitidas pelo cssText por desalinhamento em nível interno`);
const texto = resultado.saida;

fs.writeFileSync(path.join(RAIZ, 'dist/critico.css'), texto);
const meta = { bundle: manifest.css, hashDoBundle: crypto.createHash('sha256').update(bundle).digest('hex').slice(0, 8), bytes: texto.length };
fs.writeFileSync(path.join(RAIZ, 'dist/critico.meta.json'), JSON.stringify(meta, null, 1) + '\n');
console.log(`critico.css: ${(texto.length / 1024).toFixed(1)}KB (bundle ${(bundle.length / 1024).toFixed(1)}KB), para o bundle ${meta.bundle}`);
