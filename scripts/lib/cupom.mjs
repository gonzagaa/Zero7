// Cupom da seção #plan em HTML/CSS (nov/2026). Uma fonte só para o markup:
// o bloco que está no index.html sai desta função, e o npm run tarja usa a
// mesma para injetar o "cupom" do campanha.json.
//
//   "cupom": {
//     "titulo": "Evolua no seu ritmo.",
//     "subtitulo": "==Sem prazo== para provar seu potencial\ne com ==75% OFF== em todos os planos.",
//     "cor": "#36DCC4"            (opcional; sem ela fica a paleta Água do CSS)
//   }
//
// Marcação no subtítulo: ==destaque== (cor + brilho, no máximo 2, porque o
// loop tem um tempo para cada), **negrito** (só peso), \n quebra a linha no
// desktop (no celular estreito o texto quebra sozinho). Texto, nunca HTML:
// < > & " são escapados.
//
// No index.html o componente fica entre <!-- cupom:inicio --> e
// <!-- cupom:fim -->; trocarCupom mexe só ali.

export const MARCA_INICIO = '<!-- cupom:inicio -->';
export const MARCA_FIM = '<!-- cupom:fim -->';
export const MAX_DESTAQUES = 2;

// Fundos medidos na área do cupom (bg2-1920.webp e "bg planos white.webp",
// faixa do topo central): escuro rgb(2,7,14), claro rgb(236,244,253).
// O alvo no claro é 5,5:1 sobre a MÉDIA, para sobrar folga até o pior pixel
// (medido: a média passa o pior pixel por ~0,2).
export const FUNDO_ESCURO = [2, 7, 14];
export const FUNDO_CLARO = [236, 244, 253];
export const CONTRASTE_MIN = 4.5;
const ALVO_CLARO = 5.5;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------------- cor ---------------- */
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mistura = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
export const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

// Paleta dos dois temas a partir de uma cor. Devolve as variáveis que o
// css/cupom.css lê (--cze-* no escuro, --czc-* no claro) e os contrastes.
export function paletaDaCor(cor) {
  const c = hexRgb(cor);
  const branco = [255, 255, 255], preto = [0, 0, 0];
  const e = { d1: mistura(c, branco, 0.45), d2: c, f0: mistura(c, preto, 0.15), f1: c, f2: mistura(c, branco, 0.45) };
  // claro: escurece até passar o alvo; o d2 vem um degrau abaixo
  let t = 0, d1 = c;
  while (contraste(d1, FUNDO_CLARO) < ALVO_CLARO && t < 1) { t += 0.01; d1 = mistura(c, preto, t); }
  const k = { d1, d2: mistura(c, preto, Math.min(1, t + 0.08)), f0: mistura(c, preto, 0.3), f1: mistura(c, preto, 0.12), f2: mistura(c, branco, 0.35) };
  const contrastes = {
    escuro: Math.min(contraste(e.d1, FUNDO_ESCURO), contraste(e.d2, FUNDO_ESCURO)),
    claro: Math.min(contraste(k.d1, FUNDO_CLARO), contraste(k.d2, FUNDO_CLARO)),
  };
  const rgba = (v, a) => `rgb(${v.map(Math.round).join(' ')} / ${a})`;
  const vars = {
    '--cze-d1': rgbHex(e.d1), '--cze-d2': rgbHex(e.d2), '--cze-f0': rgbHex(e.f0), '--cze-f1': rgbHex(e.f1), '--cze-f2': rgbHex(e.f2),
    '--cze-glow': rgba(c, 0.55), '--cze-glow2': rgba(c, 0.25),
    '--czc-d1': rgbHex(k.d1), '--czc-d2': rgbHex(k.d2), '--czc-f0': rgbHex(k.f0), '--czc-f1': rgbHex(k.f1), '--czc-f2': rgbHex(k.f2),
    '--czc-glow': rgba(k.f1, 0.45), '--czc-glow2': rgba(k.f1, 0.18),
  };
  return { vars, contrastes };
}

/* ---------------- texto com **negrito** e ==destaque== ---------------- */
// Devolve as linhas como listas de pedaços { tipo: 'texto'|'negrito'|'destaque', texto }.
export function lerMarcacao(s) {
  const linhas = [];
  let destaques = 0;
  for (const bruta of s.split('\n')) {
    const linha = bruta.trim();
    if (!linha) continue;
    const pedacos = [];
    const re = /(\*\*|==)([\s\S]*?)\1/g;
    let ult = 0, m;
    while ((m = re.exec(linha))) {
      if (m.index > ult) pedacos.push({ tipo: 'texto', texto: linha.slice(ult, m.index) });
      if (!m[2].trim()) return { erro: `marcação vazia em "${linha}"` };
      if (/\*\*|==/.test(m[2])) return { erro: `marcação dentro de marcação em "${linha}"` };
      pedacos.push({ tipo: m[1] === '==' ? 'destaque' : 'negrito', texto: m[2] });
      if (m[1] === '==') destaques++;
      ult = re.lastIndex;
    }
    if (ult < linha.length) pedacos.push({ tipo: 'texto', texto: linha.slice(ult) });
    if (pedacos.some((p) => p.tipo === 'texto' && /\*\*|==/.test(p.texto))) return { erro: `** ou == sem fechar em "${linha}"` };
    linhas.push(pedacos);
  }
  if (!linhas.length) return { erro: 'subtítulo vazio' };
  if (destaques > MAX_DESTAQUES) return { erro: `${destaques} destaques (==...==); o máximo é ${MAX_DESTAQUES}`, dica: 'o loop do brilho tem um tempo para cada destaque (0,9 s e 1,25 s, como no vídeo)' };
  return { linhas, destaques };
}

/* ---------------- campanha.json ---------------- */
// null quando não há bloco (nada muda); { erro } quando o bloco é inválido.
export function cupomDaCampanha(campanha) {
  const c = campanha ? campanha.cupom : undefined;
  if (c === undefined || c === null) return null;
  if (typeof c !== 'object' || Array.isArray(c)) return { erro: '"cupom" no campanha.json tem que ser um objeto { "titulo", "subtitulo", "cor" }' };
  const extras = Object.keys(c).filter((k) => !['titulo', 'subtitulo', 'cor'].includes(k));
  if (extras.length) return { erro: `"cupom" com campo desconhecido: ${extras.join(', ')}`, dica: 'campos aceitos: titulo, subtitulo, cor' };
  if (typeof c.titulo !== 'string' || !c.titulo.trim()) return { erro: '"cupom.titulo" tem que ser um texto não vazio' };
  if (/\n|\*\*|==/.test(c.titulo)) return { erro: '"cupom.titulo" é uma linha de texto puro (sem \\n, ** ou ==)' };
  if (typeof c.subtitulo !== 'string' || !c.subtitulo.trim()) return { erro: '"cupom.subtitulo" tem que ser um texto não vazio' };
  const sub = lerMarcacao(c.subtitulo);
  if (sub.erro) return { erro: `"cupom.subtitulo": ${sub.erro}`, dica: sub.dica };
  let paleta = null;
  if (c.cor !== undefined && c.cor !== null) {
    if (typeof c.cor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(c.cor)) return { erro: `"cupom.cor" tem que ser #RRGGBB (veio ${JSON.stringify(c.cor)})` };
    paleta = paletaDaCor(c.cor);
    if (paleta.contrastes.escuro < CONTRASTE_MIN) return { erro: `"cupom.cor" ${c.cor} é escura demais para o tema escuro (contraste ${paleta.contrastes.escuro.toFixed(2)}:1, mínimo ${CONTRASTE_MIN})`, dica: 'use uma cor mais clara; o tema claro é escurecido automaticamente' };
    if (paleta.contrastes.claro < CONTRASTE_MIN) return { erro: `"cupom.cor" ${c.cor} não chega a ${CONTRASTE_MIN}:1 no tema claro` };
  }
  return { titulo: c.titulo.trim(), linhas: sub.linhas, cor: c.cor || null, paleta };
}

/* ---------------- markup ---------------- */
export function markupCupom(cupom, indent = '          ') {
  let n = 0;
  const pedaco = (p) => {
    const t = esc(p.texto);
    if (p.tipo === 'texto') return t;
    if (p.tipo === 'negrito') return `<b class="cupom-z7__b">${t}</b>`;
    n++;
    return `<strong class="cupom-z7__d cupom-z7__d--${n}"><span class="cupom-z7__dt">${t}</span><span class="cupom-z7__br" aria-hidden="true"><span class="cupom-z7__brt">${t}</span></span></strong>`;
  };
  const estilo = cupom.paleta ? ` style="${Object.entries(cupom.paleta.vars).map(([k, v]) => `${k}:${v}`).join(';')}"` : '';
  const i = indent;
  return [
    `${i}<div class="cupom-z7" data-cupom${estilo}>`,
    `${i}  <p class="cupom-z7__titulo"><span class="cupom-z7__mask"><span class="cupom-z7__mi">${esc(cupom.titulo)}</span></span></p>`,
    `${i}  <span class="cupom-z7__filete" aria-hidden="true"><span class="cupom-z7__luz"></span></span>`,
    `${i}  <p class="cupom-z7__sub">`,
    ...cupom.linhas.map((l) => `${i}    <span class="cupom-z7__linha">${l.map(pedaco).join('')}</span>`),
    `${i}  </p>`,
    // marcado antes da primeira pintura (quem chega por /home/#plan veria o
    // cupom pronto sumir para entrar); com movimento reduzido nada fica pendente
    `${i}  <script>(function(c){if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window)c.setAttribute('data-anim','pendente')})(document.currentScript.parentNode)</script>`,
    `${i}</div>`,
  ].join('\n');
}

// Troca o que está entre as marcas. Lança se não houver exatamente um par.
export function trocarCupom(html, markup) {
  const ini = html.indexOf(MARCA_INICIO);
  const fim = html.indexOf(MARCA_FIM);
  if (ini < 0 || fim < 0 || fim < ini) throw new Error(`não achei ${MARCA_INICIO} … ${MARCA_FIM} no index.html`);
  if (html.indexOf(MARCA_INICIO, ini + 1) >= 0 || html.indexOf(MARCA_FIM, fim + 1) >= 0) throw new Error('mais de um par de marcas do cupom no index.html');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const antes = html.slice(ini + MARCA_INICIO.length, fim);
  const depois = eol + markup.replace(/\r?\n/g, eol) + eol + html.slice(html.lastIndexOf('\n', fim) + 1, fim);
  return { html: html.slice(0, ini + MARCA_INICIO.length) + depois + html.slice(fim), mudou: antes !== depois };
}

// O cupom aprovado em 23/11 (página de teste): é o que está no index.html.
export const CUPOM_APROVADO = {
  titulo: 'Evolua no seu ritmo.',
  subtitulo: '==Sem prazo== para provar seu potencial\ne com ==75% OFF== em todos os planos.',
};
