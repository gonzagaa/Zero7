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

// Escala de COBERTURA do master até o tamanho de saída: reduz mantendo a
// proporção até cobrir w×h; o que sobra sai num crop centrado. Devolve o
// tamanho escalado e quantos px o crop tira em cada eixo.
export function cobertura(mw, mh, w, h) {
  let sw, sh;
  if (w / mw >= h / mh) { sw = w; sh = Math.ceil(mh * w / mw - 1e-9); }
  else { sh = h; sw = Math.ceil(mw * h / mh - 1e-9); }
  return { sw, sh, cortaX: sw - w, cortaY: sh - h };
}
