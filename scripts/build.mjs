// Build do lote A: bundle + minify com hash de conteúdo.
//
//   node scripts/build.mjs            # constrói dist/ e reescreve o index.html
//   node scripts/build.mjs --watch    # reconstrói a cada mudança em css/ e script/
//
// PREMISSA INEGOCIÁVEL: css/ e script/ continuam sendo a fonte. Ninguém edita
// dist/. Este script é determinístico: com as mesmas fontes, produz os mesmos
// bytes e os mesmos hashes — por isso o `npm run check` pode exigir
// `git diff --exit-code`.
//
// CSS  -> UM arquivo dist/home.<hash8>.css: o swiper (vendor) + o index.css
//         com os @import resolvidos NA ORDEM, minificado. Os url() são
//         reescritos por arquivo (resolvidos contra a pasta do arquivo e
//         re-relativizados contra dist/), então as fontes continuam em
//         css/fonts/ e as imagens em assets/.
// JS   -> ARQUIVO POR ARQUIVO para dist/script/<nome>.<hash8>.js. NÃO
//         concatena: os escopos de topo colidiriam, e 4selet.js/blackPlanos.js
//         têm lógica protegida (regra 4). vendor/ e CDN não entram.
// HTML -> o index.html tem as referências trocadas; a página secundária
//         regulamento/index.html é montada pelos marcadores (ver
//         construirRegulamento, regra 27); cert/ e pedido-registrado/*
//         ficam como estão.
import { transform } from 'esbuild';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extrairTextoDaDobra, faixasUnicode, gerarSubsetsHero } from './lib/fontes-hero.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(RAIZ, 'dist');
const hash8 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// Reescreve todo url(...) relativo de um CSS para valer a partir de dist/.
// Absolutos (http, /, data:) ficam como estão. A query (?v=) é preservada:
// nas fontes ela precisa continuar batendo byte a byte com os <link
// rel="preload"> do <head>.
function reescreverUrls(css, pastaDoArquivo) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (tudo, aspa, alvo) => {
    if (/^(data:|https?:|\/)/.test(alvo)) return tudo;
    const [caminho, query = ''] = alvo.split(/(?=[?#])/, 2);
    const absoluto = path.resolve(path.join(RAIZ, pastaDoArquivo), caminho);
    let novo = path.relative(DIST, absoluto).split(path.sep).join('/');
    return `url(${aspa}${novo}${query}${aspa})`;
  });
}

async function construir() {
  fs.mkdirSync(path.join(DIST, 'script'), { recursive: true });
  let html = ler('index.html');
  const manifest = { gerado_por: 'scripts/build.mjs', fontes: {} };

  /* ── Fontes do herói (lote E, E1 — a variante B do lote D medida) ─────
     Os .hero.woff2 nascem AQUI, dos caracteres reais da primeira viewport
     (tarja, nav, h1, subtítulo, CTA — a fatia <body…</header> nas duas
     larguras), e são precarregados; as faces COMPLETAS (.sub) saem do CSS
     da fila crítica e entram por JS depois do load — física do Lantern:
     fonte que começa antes do LCP observado entra no grafo simulado do
     LCP, e os ~205KB na frente da imagem custavam ~8 pontos no mobile.
     Acima da dobra o hero (mesmos glifos e métricas) segura a marca no
     primeiro frame; a chegada da completa não repinta nada visível.
     Ninguém edita um .hero à mão: mudou a copy da dobra, o build refaz e
     o npm run check acusa arquivo desatualizado (git diff em css/fonts)
     ou caractere fora do subconjunto (gerarSubsetsHero lança). */
  const textoHero = extrairTextoDaDobra(html);
  const faixasHero = faixasUnicode(textoHero);
  const heroes = await gerarSubsetsHero(RAIZ, textoHero);
  const urlHero = (h, prefixo) => `${prefixo}${encodeURIComponent(h.nome)}.hero.woff2?v=${h.hash}`;
  const faceHero = (h, prefixo) =>
    `@font-face{font-family:'${h.familia}';font-style:normal;font-weight:${h.peso};font-display:swap;` +
    `src:url("${urlHero(h, prefixo)}") format("woff2");unicode-range:${faixasHero};}`;
  manifest.fontesHero = Object.fromEntries(heroes.map((h) => [h.nome, { bytes: h.bytes, hash: h.hash }]));

  /* ── CSS: um bundle na ordem dos <link> ─────────────────────────────── */
  const pedacos = [];
  // 0) as faces do herói, ANTES de tudo: a completa injetada em runtime
  //    entra DEPOIS na cascata e vence o intervalo do hero quando chegar
  //    (mesma fonte, mesmos glifos — troca invisível).
  pedacos.push(heroes.map((h) => faceHero(h, '../css/fonts/')).join('\n'));
  // 1) swiper, como o primeiro <link> carrega
  pedacos.push(reescreverUrls(ler('vendor/swiper-11.2.10/swiper-bundle.min.css'), 'vendor/swiper-11.2.10'));
  // 2) index.css com os @import resolvidos na ordem em que aparecem
  const indexCss = ler('css/index.css');
  const imports = [];
  const resto = indexCss.replace(/@import\s+url\(\s*(['"]?)([^'")]+)\1\s*\)\s*;/g, (_, __, alvo) => {
    imports.push(alvo.split('?')[0]);
    return '';
  });
  for (const imp of imports) {
    const rel = path.join('css', imp).split(path.sep).join('/');
    pedacos.push(`/* ${rel} */\n` + reescreverUrls(ler(rel), 'css'));
  }
  // 3) o que sobra no próprio index.css (lenis + @font-face). As faces
  //    COMPLETAS (.sub) saem do bundle — capturadas para o injetor
  //    pós-load, com URL relativa ao documento. Os fallbacks métricos
  //    (src: local) ficam onde estão.
  const facesCompletas = [];
  const restoSemSub = resto.replace(/@font-face\s*{[^}]*?\.sub\.woff2[^}]*?}/g, (m) => {
    facesCompletas.push(m.replace(/url\(\s*(['"]?)fonts\//g, 'url($1./css/fonts/').replace(/\s+/g, ' ').trim());
    return '';
  });
  if (facesCompletas.length !== heroes.length) {
    throw new Error(`esperava ${heroes.length} faces .sub no css/index.css, achei ${facesCompletas.length}`);
  }
  pedacos.push(reescreverUrls(restoSemSub, 'css'));
  // 4) aos.css, que era um <link> no fim do body e seguia render-blocking
  //    (26KB, o 2º da lista do Lighthouse depois do bundle). Entra POR
  //    ÚLTIMO, que é a posição dele na cascata do documento.
  pedacos.push(reescreverUrls(ler('vendor/aos-2.3.1/aos.css'), 'vendor/aos-2.3.1'));

  const cssMin = (await transform(pedacos.join('\n'), { loader: 'css', minify: true })).code;
  const hCss = hash8(cssMin);
  const nomeCss = `dist/home.${hCss}.css`;
  // limpa hashes velhos do mesmo artefato antes de gravar o novo
  for (const f of fs.readdirSync(DIST)) if (/^home\.[0-9a-f]{8}\.css$/.test(f) && f !== `home.${hCss}.css`) fs.rmSync(path.join(DIST, f));
  fs.writeFileSync(path.join(RAIZ, nomeCss), cssMin);
  manifest.css = nomeCss;
  manifest.fontes['css (36 arquivos)'] = nomeCss;

  // troca os <link> por um só. O do swiper e o do aos saem; o do index.css
  // vira o bundle.
  html = html.replace(/[ \t]*<link rel="stylesheet" href="\.\/vendor\/swiper-11\.2\.10\/swiper-bundle\.min\.css"\s*\/?>\r?\n/, '');
  // a tag do aos vem com os atributos invertidos (href antes de rel), por
  // isso o casamento é pelo caminho, não pela forma da tag
  html = html.replace(/[ \t]*<link[^>]*aos-2\.3\.1\/aos\.css[^>]*>\r?\n/, '');
  html = html.replace(/<link rel="stylesheet" href="\.\/(?:css\/index\.css|dist\/home\.[0-9a-f]{8}\.css)[^"]*">/, `<link rel="stylesheet" href="./${nomeCss}">`);
  /* ── CSS crítico inline (item 5): o que está acima da dobra pinta sem
     esperar rede; o bundle inteiro vira preload+onload com <noscript> de
     reserva. O critico.css NÃO é gerado aqui (precisa de navegador —
     scripts/critico.mjs); o build só o embute e confere que ele nasceu do
     bundle ATUAL. Desatualizado, avisa, marca no manifest, e o npm run
     check falha por causa da marca. Dois estados possíveis do HTML: link
     bloqueante (primeiro build) ou bloco async (reconstrução) — cada um
     tem seu replace, NUNCA os dois, senão o link do <noscript> viraria
     alvo e o bloco se aninharia. */
  const criticoPath = path.join(DIST, 'critico.css');
  if (fs.existsSync(criticoPath)) {
    const criticoCss = fs.readFileSync(criticoPath, 'utf8').replace(/<\/style/gi, '<\\/style');
    const metaCritico = JSON.parse(ler('dist/critico.meta.json'));
    manifest.criticoDesatualizado = metaCritico.hashDoBundle !== crypto.createHash('sha256').update(cssMin).digest('hex').slice(0, 8);
    if (manifest.criticoDesatualizado) console.warn('AVISO: dist/critico.css nasceu de outro bundle — rode node scripts/critico.mjs e depois npm run build');
    /* C1: SEM rel=preload. O preload as=style entrava no grafo do Lantern
       como dependência de alta prioridade da pintura, e o FCP simulado
       ficava preso em ~4,3s mesmo com o CSS assíncrono de verdade (a
       ablação g provou: bloquear o bundle dava FCP ~2,5s). O padrão
       media=print baixa com prioridade Low e sem bloquear render; o
       onload troca para all. No navegador real muda pouco — o crítico
       cobre a dobra e o fouc.mjs é o juiz —; na conta do simulador muda
       tudo. Quem mexer no head MANTÉM este padrão (regra no AUDITORIA). */
    const blocoAsync = [
      `<style id="css-critico">${criticoCss}</style>`,
      `  <link rel="stylesheet" href="./${nomeCss}" media="print" onload="this.media='all';this.onload=null">`,
      `  <noscript><link rel="stylesheet" href="./${nomeCss}"></noscript>`,
    ].join('\n');
    /* Reconstrução por posição, não por regex: o bloco vai do
       <style id="css-critico"> até o fim da cadeia de </noscript> — a
       cadeia, porque uma âncora anterior chegou a deixar um fechamento
       órfão e o splice engole (auto-cura). Sem bloco ainda (primeiro
       build), o alvo é o link bloqueante puro. */
    const iniBloco = html.indexOf('<style id="css-critico">');
    if (iniBloco >= 0) {
      const FIM = '</noscript>';
      let fimBloco = html.indexOf(FIM, iniBloco);
      if (fimBloco < 0) throw new Error('bloco crítico sem </noscript> — index.html corrompido');
      fimBloco += FIM.length;
      while (html.startsWith(FIM, fimBloco)) fimBloco += FIM.length;
      html = html.slice(0, iniBloco) + blocoAsync + html.slice(fimBloco);
    } else {
      html = html.replace(`<link rel="stylesheet" href="./${nomeCss}">`, blocoAsync);
    }
  }

  /* ── Preloads de fonte: só os .hero (E1). Os antigos (qualquer fonte de
     css/fonts) saem; a query ?v= é o hash do arquivo, então o preload
     continua batendo byte a byte com o url() do bundle. */
  html = html.replace(/[ \t]*<link rel="preload" href="\.\/css\/fonts\/[^"]*" as="font"[^>]*>\r?\n/g, '');
  const preloadsHero = heroes.map((h) => `  <link rel="preload" href="${urlHero(h, './css/fonts/')}" as="font" type="font/woff2" crossorigin>`).join('\n') + '\n';
  if (!/[ \t]*<link rel="preconnect"/.test(html)) throw new Error('âncora dos preloads (preconnect) não encontrada no head');
  // replacer por função: as URLs têm caracteres que o padrão $ interpretaria
  html = html.replace(/[ \t]*<link rel="preconnect"/, (m) => preloadsHero + m);

  /* ── Injetor das faces completas depois do load (E1): mesmo padrão do
     GSAP pós-LCP. Antes do load, texto fora do intervalo do hero fica nos
     fallbacks métricos; depois, todo caractere renderiza da webfont. */
  const injetor = `<script id="fontes-completas">(function(){var c=${JSON.stringify(facesCompletas.join('\n'))};function go(){requestAnimationFrame(function(){var s=document.createElement('style');s.textContent=c;document.head.appendChild(s)})}if(document.readyState==='complete'){go()}else{addEventListener('load',go)}})();</script>`;
  if (/<script id="fontes-completas">[\s\S]*?<\/script>/.test(html)) {
    html = html.replace(/<script id="fontes-completas">[\s\S]*?<\/script>/, () => injetor);
  } else {
    html = html.replace('</body>', injetor + '\n</body>');
  }

  /* ── JS: minifica arquivo por arquivo, mantendo posição e atributos ────
     A tag pode estar apontando para a fonte (primeiro build) OU para um
     dist/ de build anterior (reconstrução) — nos dois casos a FONTE é
     script/<nome>.js, e é dela que o novo arquivo sai. Sem isso, a
     reconstrução não reconstruía nada. */
  const tagsJs = [...html.matchAll(/<script([^>]*)\ssrc="\.\/(?:script\/([\w-]+)\.js[^"]*|dist\/script\/([\w-]+)\.[0-9a-f]{8}\.js)"([^>]*)><\/script>/g)];
  for (const m of tagsJs) {
    const nome = m[2] || m[3];
    const rel = `script/${nome}.js`;
    const jsMin = (await transform(ler(rel), { loader: 'js', minify: true })).code;
    const h = hash8(jsMin);
    const novoRel = `dist/script/${nome}.${h}.js`;
    for (const f of fs.readdirSync(path.join(DIST, 'script'))) {
      if (new RegExp(`^${nome}\\.[0-9a-f]{8}\\.js$`).test(f) && f !== `${nome}.${h}.js`) fs.rmSync(path.join(DIST, 'script', f));
    }
    fs.writeFileSync(path.join(RAIZ, novoRel), jsMin);
    manifest.fontes[rel] = novoRel;
    html = html.replace(m[0], `<script${m[1]} src="./${novoRel}"${m[4]}></script>`);
  }

  fs.writeFileSync(path.join(RAIZ, 'index.html'), html);
  const reg = await construirRegulamento({ manifest, nomeCssHome: nomeCss, facesCompletas, htmlHome: html });

  fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.log(`build ok: ${nomeCss} + ${tagsJs.length} js${reg ? ` | regulamento: ${reg}` : ''}`);
  return manifest;
}

/* ── Páginas secundárias: /regulamento/ (regra 27) ──────────────────────
   Mesmo build, mesmas réguas. O regulamento/index.html é o LAYOUT (editado
   à mão, fora dos marcadores <!-- build:x --> … <!-- /build:x -->); o build
   preenche os marcadores a cada execução:
     css      crítico DESTA página (dist/critico-regulamento.css, gerado
              pelo critico.mjs) + o bundle da home + dist/regulamento.<h>.css
              (ambos assíncronos, padrão da regra 18) + as faces .sub
              (completas, as mesmas da home) com preload das que pintam a
              primeira tela: NCS (h1) e TT Fors Regular (corpo). Os .hero
              da home cobrem "REGULAMENTO" (U+41–56), mas não o corpo (é,
              ã, ê, ó, õ, J, W…): seriam dois mecanismos para economizar
              5,6KB. Nenhum subset novo.
     nav      o <nav> da home, ADAPTADO: sem data-aos, sem a classe da
              tarja, com .scroll fixa (fundo sólido — o topo aqui é branco),
              âncoras e assets com ../, aria-current em "Regulamento".
     rodape   o <footer> da home, com o mesmo ajuste de caminhos.
     sumario  a lista das seções, gerada dos h2 do conteúdo.
     conteudo regulamento/conteudo.html (FONTE do texto — só muda junto com
              a sonda de fidelidade), mais a interface que não é texto do
              regulamento: tempo de leitura, sumário do celular e as
              âncoras das seções — tudo marcado data-chrome, que a sonda
              ignora.
   Os <script src="../script/x.js"> viram dist/script/x.<hash>.js como na
   home. A data do conteúdo (<time datetime>) alimenta o JSON-LD
   (dateModified) e o cabeçalho de impressão. */
async function construirRegulamento({ manifest, nomeCssHome, facesCompletas, htmlHome }) {
  const PASTA = 'regulamento';
  if (!fs.existsSync(path.join(RAIZ, PASTA, 'index.html'))) return null;
  let pag = ler(`${PASTA}/index.html`);
  const fonte = ler(`${PASTA}/conteudo.html`).replace(/<!--[\s\S]*?-->/g, '').trim();
  const texto = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

  /* 1) o conteúdo tem a forma que o layout espera — senão, LANÇA */
  if ((fonte.match(/<h1[\s>]/g) || []).length !== 1) throw new Error('regulamento/conteudo.html: precisa de exatamente um <h1>');
  const h2s = [...fonte.matchAll(/<h2 id="(regulamento-(\d{2})-[a-z0-9-]+)">([\s\S]*?)<\/h2>/g)];
  if ((fonte.match(/<h2[\s>]/g) || []).length !== h2s.length) throw new Error('regulamento/conteudo.html: todo <h2> precisa de id="regulamento-NN-slug"');
  h2s.forEach((m, i) => { if (Number(m[2]) !== i + 1) throw new Error(`regulamento/conteudo.html: seções fora de ordem (${m[1]} na posição ${i + 1})`); });
  if (new Set(h2s.map((m) => m[1])).size !== h2s.length) throw new Error('regulamento/conteudo.html: id de seção repetido');
  const data = fonte.match(/<time datetime="(\d{4})-(\d{2})-(\d{2})">/);
  if (!data) throw new Error('regulamento/conteudo.html: falta <time datetime="AAAA-MM-DD"> da última atualização');
  const [, aaaa, mm, dd] = data;

  /* 2) compõe o artigo */
  const itens = h2s.map(([, id, num, inner]) => ({ id, num: Number(num), titulo: texto(inner.replace(/<span class="reg-num">[^<]*<\/span>/, '')) }));
  const lista = (ind) => [
    `${ind}<ol class="reg-sumario-lista">`,
    ...itens.map((i) => `${ind}  <li><a href="#${i.id}"><span class="reg-sumario-num">${i.num}.</span> <span>${i.titulo}</span></a></li>`),
    `${ind}</ol>`,
  ].join('\n');
  const palavras = texto(fonte).split(' ').filter(Boolean).length;
  const minutos = Math.max(1, Math.round(palavras / 200));
  const icone = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  let art = fonte
    .replace(/(<p class="reg-atualizacao">[\s\S]*?<\/p>)/, (m) => `<div class="reg-meta">\n      ${m}\n      <p class="reg-tempo" data-chrome><span aria-hidden="true">·</span>${minutos} min de leitura</p>\n    </div>`)
    .replace('</header>', () => `</header>\n\n  <details class="reg-sumario-movel" data-chrome>\n    <summary>Neste regulamento</summary>\n    <nav aria-label="Neste regulamento">\n${lista('      ')}\n    </nav>\n  </details>`)
    .replace(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g, (m, id, inner) =>
      `<div class="reg-titulo">\n      ${m}\n      <a class="reg-ancora" href="#${id}" data-chrome aria-label="Copiar o link da seção ${texto(inner)}">${icone}</a>\n    </div>`);
  if (!art.includes('class="reg-meta"') || !art.includes('reg-sumario-movel')) throw new Error('regulamento/conteudo.html: falta <header class="reg-cabeca"> com <p class="reg-atualizacao">');

  /* 3) nav e rodapé: os da home, adaptados para ../ */
  const navHome = (htmlHome.match(/<nav\b[^>]*\bid="navigation"[^>]*>[\s\S]*?<\/nav>/) || [])[0];
  const rodapeHome = (htmlHome.match(/<footer id="footer">[\s\S]*?<\/footer>/) || [])[0];
  if (!navHome || !rodapeHome) throw new Error('não achei o <nav id="navigation"> ou o <footer id="footer"> no index.html');
  const adaptar = (h) => h
    .replace(/\s+data-aos(?:-[a-z-]+)?="[^"]*"/g, '')
    .replace(/ aria-current="page"/g, '')
    .replace(/href="#home"/g, 'href="../"')
    .replace(/href="#([^"]+)"/g, 'href="../#$1"')
    .replace(/(src|href)="\.\/assets\//g, '$1="../assets/')
    .replace(/<a ([^>]*?)href="https:\/\/zero7\.com\.br\/regulamento\/"/g, '<a $1href="./" aria-current="page"');
  const nav = adaptar(navHome).replace(/^<nav\b[^>]*>/, (tag) => {
    const classes = ((tag.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/).filter((c) => c && !/^active/.test(c));
    classes.push('scroll');
    const semClasse = tag.replace(/\s+class="[^"]*"/, '');
    return semClasse.replace(/>$/, ` class="${classes.join(' ')}">`);
  });
  const rodape = adaptar(rodapeHome);

  /* 4) CSS da página, mesmo esquema de hash */
  const cssReg = (await transform(reescreverUrls(ler('css/regulamento.css'), 'css'), { loader: 'css', minify: true })).code;
  const hReg = hash8(cssReg);
  const nomeCssReg = `dist/regulamento.${hReg}.css`;
  for (const f of fs.readdirSync(DIST)) if (/^regulamento\.[0-9a-f]{8}\.css$/.test(f) && f !== `regulamento.${hReg}.css`) fs.rmSync(path.join(DIST, f));
  fs.writeFileSync(path.join(RAIZ, nomeCssReg), cssReg);

  /* 5) faces .sub (as completas da home, com caminho ../) + preloads */
  const faces = facesCompletas.map((f) => f.replace(/url\(\s*(['"]?)\.\/css\/fonts\//g, 'url($1../css/fonts/'));
  const urlDe = (f) => (f.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/) || [])[1];
  const preloadar = faces.filter((f) => /font-family:\s*'NCS Radhiumz'/.test(f) || (/font-family:\s*'TT Fors Trial'/.test(f) && /font-weight:\s*400\b/.test(f))).map(urlDe);
  if (preloadar.length !== 2) throw new Error(`regulamento: esperava 2 faces para preload (NCS, TT Regular), achei ${preloadar.length}`);

  /* 6) bloco de CSS: crítico (se houver e for deste par de bundles) */
  const metaCritico = fs.existsSync(path.join(DIST, 'critico-regulamento.meta.json')) ? JSON.parse(ler('dist/critico-regulamento.meta.json')) : null;
  const hashDe = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(RAIZ, rel), 'utf8')).digest('hex').slice(0, 8);
  const linhas = [];
  for (const u of preloadar) linhas.push(`  <link rel="preload" href="${u}" as="font" type="font/woff2" crossorigin>`);
  if (metaCritico && fs.existsSync(path.join(DIST, 'critico-regulamento.css'))) {
    manifest.criticoRegulamentoDesatualizado = metaCritico.hashes?.home !== hashDe(nomeCssHome) || metaCritico.hashes?.regulamento !== hashDe(nomeCssReg);
    if (manifest.criticoRegulamentoDesatualizado) console.warn('AVISO: dist/critico-regulamento.css nasceu de outros bundles — rode node scripts/critico.mjs e depois npm run build');
    const critico = fs.readFileSync(path.join(DIST, 'critico-regulamento.css'), 'utf8').replace(/<\/style/gi, '<\\/style');
    linhas.push(`  <style id="css-critico">${critico}</style>`);
    for (const n of [nomeCssHome, nomeCssReg]) linhas.push(`  <link rel="stylesheet" href="../${n}" media="print" onload="this.media='all';this.onload=null">`);
    linhas.push(`  <noscript><link rel="stylesheet" href="../${nomeCssHome}"><link rel="stylesheet" href="../${nomeCssReg}"></noscript>`);
  } else {
    // primeiro build: bloqueante, até o critico.mjs gerar o crítico desta página
    manifest.criticoRegulamentoDesatualizado = true;
    for (const n of [nomeCssHome, nomeCssReg]) linhas.push(`  <link rel="stylesheet" href="../${n}">`);
  }
  // as .sub DEPOIS dos links: na cascata vencem as faces .hero que o bundle
  // da home declara para as mesmas famílias
  linhas.push(`  <style id="fontes-regulamento">${faces.join('\n')}</style>`);

  /* 7) preenche os marcadores */
  const entre = (h, nome, novo) => {
    const ini = `<!-- build:${nome} -->`, fim = `<!-- /build:${nome} -->`;
    const a = h.indexOf(ini), b = h.indexOf(fim);
    if (a < 0 || b < a) throw new Error(`regulamento/index.html: marcador build:${nome} ausente`);
    const recuo = (h.slice(0, a).match(/[ \t]*$/) || [''])[0];
    return h.slice(0, a + ini.length) + '\n' + novo + '\n' + recuo + h.slice(b);
  };
  pag = entre(pag, 'css', linhas.join('\n'));
  pag = entre(pag, 'nav', '  ' + nav);
  pag = entre(pag, 'sumario', lista('          '));
  pag = entre(pag, 'conteudo', art);
  pag = entre(pag, 'rodape', '  ' + rodape);
  pag = pag.replace(/"dateModified": "\d{4}-\d{2}-\d{2}"/, `"dateModified": "${aaaa}-${mm}-${dd}"`);
  pag = pag.replace(/(<p class="reg-impressao"[^>]*>)[^<]*(<\/p>)/, `$1Regulamento Zero7 — atualizado em ${dd}/${mm}/${aaaa}$2`);

  /* 8) JS da página: mesmo minify com hash da home */
  const tags = [...pag.matchAll(/<script([^>]*)\ssrc="\.\.\/(?:script\/([\w-]+)\.js[^"]*|dist\/script\/([\w-]+)\.[0-9a-f]{8}\.js)"([^>]*)><\/script>/g)];
  const js = {};
  for (const m of tags) {
    const nome = m[2] || m[3];
    const jsMin = (await transform(ler(`script/${nome}.js`), { loader: 'js', minify: true })).code;
    const h = hash8(jsMin);
    const novoRel = `dist/script/${nome}.${h}.js`;
    for (const f of fs.readdirSync(path.join(DIST, 'script'))) {
      if (new RegExp(`^${nome}\\.[0-9a-f]{8}\\.js$`).test(f) && f !== `${nome}.${h}.js`) fs.rmSync(path.join(DIST, 'script', f));
    }
    fs.writeFileSync(path.join(RAIZ, novoRel), jsMin);
    js[`script/${nome}.js`] = novoRel;
    pag = pag.replace(m[0], `<script${m[1]} src="../${novoRel}"${m[4]}></script>`);
  }

  fs.writeFileSync(path.join(RAIZ, PASTA, 'index.html'), pag);
  manifest.regulamento = { css: nomeCssReg, js, palavras, minutosDeLeitura: minutos, secoes: itens.length, preload: preloadar };
  return `${nomeCssReg} + ${tags.length} js, ${itens.length} seções, ${palavras} palavras (${minutos} min)`;
}

await construir();

if (process.argv.includes('--watch')) {
  console.log('observando css/ e script/…');
  let agendado = null;
  const disparar = () => {
    clearTimeout(agendado);
    agendado = setTimeout(() => construir().catch((e) => console.error(e.message)), 120);
  };
  fs.watch(path.join(RAIZ, 'css'), { recursive: true }, disparar);
  fs.watch(path.join(RAIZ, 'script'), disparar);
  // o texto do regulamento também — só o arquivo-fonte: a pasta tem o
  // index.html que o próprio build reescreve
  if (fs.existsSync(path.join(RAIZ, 'regulamento', 'conteudo.html'))) fs.watch(path.join(RAIZ, 'regulamento', 'conteudo.html'), disparar);
}
