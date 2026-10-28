// Parâmetros APROVADOS da tarja em vídeo (LIBERDADE, out/2026 — ver
// medidas/tarja-video.md). Um lugar só: o encoder (scripts/tarja-video.mjs)
// e a ingestão (scripts/tarja-ingestao.mjs) leem daqui.
//
//  - desk 2370×94 (1,5× a faixa de 62 px): a 3160×126 do master dava 502 KB
//    em CRF 38 e emenda de 1,29%; a 1,5× dá ~246 KB e 0,98%. Na tela de 1920
//    (DPR 1) a tarja aparece com ≤ 1580 px — sobra resolução.
//  - mob 1040×142 (alvo revisado para ≤ 200 KB): a 728×100 cabia mais perto
//    dos 100 KB, mas borra o texto num iPhone (390 px a 3×).
//  - VP9 em CRF 38 FIXO nos dois; H.264 de reserva escolhe o menor CRF de
//    26–30 que caiba no alvo.
//  - `entrega` é o tamanho em que o designer exporta (pasta da campanha:
//    desktop.mp4 / mobile.mp4); `masters` são os nomes aceitos na pasta.
export const FPS = 24;
export const DURACAO = 15;
export const VARIANTES = {
  desk: { masters: ['desktop.mp4', 'tarja-desktop-master.mp4'], entrega: [3160, 126], w: 2370, h: 94, alvoKB: 250, crfs: [38] },
  mob: { masters: ['mobile.mp4', 'tarja-mobile-master.mp4'], entrega: [2080, 284], w: 1040, h: 142, alvoKB: 200, crfs: [38] },
};

// Link da tarja (campanha.json, campo "link" — opcional). É o href do ÚNICO
// <a> da tarja, que envolve o pôster das duas viewports e o <video>.
//  - sem "link": volta ao padrão de sempre, a âncora dos planos;
//  - com "link": só link INTERNO (https em zero7.com.br/www, ou âncora "#…"),
//    e SEM UTM — utm_* num link interno abre sessão nova no GA4 e a visita
//    perde a origem de verdade. O link entra como veio (normalizado pela URL).
export const HREF_PADRAO = '#plan';
const HOSTS_INTERNOS = new Set(['zero7.com.br', 'www.zero7.com.br']);

export function hrefDaCampanha(campanha) {
  const link = campanha ? campanha.link : undefined;
  if (link === undefined || link === null) return { href: HREF_PADRAO, origem: 'padrão' };
  if (typeof link !== 'string' || !link.trim()) return { erro: '"link" no campanha.json tem que ser um texto não vazio (ou ficar de fora)' };
  const v = link.trim();
  if (/^#[A-Za-z][\w-]*$/.test(v)) return { href: v, origem: 'campanha.json' };
  let u;
  try { u = new URL(v); } catch { return { erro: `"link" não é uma URL válida: "${v}"` }; }
  if (u.protocol !== 'https:') return { erro: `"link" tem que ser https (veio ${u.protocol.replace(':', '')})` };
  if (!HOSTS_INTERNOS.has(u.hostname)) return { erro: `"link" tem que ser interno (zero7.com.br); veio ${u.hostname}`, dica: 'a tarja só leva para páginas do próprio site' };
  const utm = [...u.searchParams.keys()].filter((k) => /^utm_/i.test(k));
  if (utm.length) return { erro: `"link" não pode ter UTM (${utm.join(', ')})`, dica: 'link interno: UTM abre sessão nova no GA4 e apaga a origem real da visita. Tire os utm_* do campanha.json.' };
  return { href: u.href, origem: 'campanha.json' };
}

// Troca o href do <a> da tarja: o <a> imediatamente antes de
// <span class="tarjaMidia">, dentro do .tarjaImage. Lança se não achar
// exatamente esse <a> — nenhum outro href da página é tocado.
export function trocarHrefTarja(html, href) {
  if (/["<>\s]/.test(href)) throw new Error(`href com caractere inválido: ${href}`);
  const caixa = html.indexOf('class="tarjaImage"');
  const midia = html.indexOf('<span class="tarjaMidia">');
  if (caixa < 0 || midia < 0 || midia < caixa) throw new Error('não achei o bloco .tarjaImage com <span class="tarjaMidia"> no index.html');
  if (html.indexOf('<span class="tarjaMidia">', midia + 1) >= 0) throw new Error('mais de um <span class="tarjaMidia"> no index.html');
  const aIni = html.lastIndexOf('<a ', midia);
  if (aIni < caixa || html.slice(aIni, midia).includes('</a>')) throw new Error('não achei o <a> que envolve a .tarjaMidia');
  const aFim = html.indexOf('>', aIni);
  const tag = html.slice(aIni, aFim + 1);
  const m = /\shref="([^"]*)"/.exec(tag);
  if (!m) throw new Error(`o <a> da tarja não tem href: ${tag}`);
  const novaTag = tag.replace(m[0], ` href="${href}"`);
  return { html: html.slice(0, aIni) + novaTag + html.slice(aFim + 1), antes: m[1], depois: href };
}

// Escala de COBERTURA do master até o tamanho de saída: reduz mantendo a
// proporção até cobrir w×h; o que sobra sai num crop centrado. Devolve o
// tamanho escalado e quantos px o crop tira em cada eixo.
export function cobertura(mw, mh, w, h) {
  let sw, sh;
  if (w / mw >= h / mh) { sw = w; sh = Math.ceil(mh * w / mw - 1e-9); }
  else { sh = h; sw = Math.ceil(mw * h / mh - 1e-9); }
  return { sw, sh, cortaX: sw - w, cortaY: sh - h };
}
