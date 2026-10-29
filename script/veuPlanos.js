/* Véu de campanha para a seção #plan — Black Friday 2026 (brief do CEO,
   out/2026). Marcas: section#plan tem data-veu="black" e
   data-veu-fim="AAAA-MM-DDTHH:mm:ss±zz:zz" (hora exata do fim, ISO 8601).
   Enquanto o atributo existe:
   • o veuPlanos.css borra os filhos de #plan e desenha o véu;
   • AQUI o inert + aria-hidden é ligado em cada filho (exceto o próprio
     véu), e o Swiper é mantido fora da inicialização (ver guarda em
     script/global.js — armarCarrosseis).
   Quando data-veu-fim passa:
   • o atributo é retirado (todas as regras do CSS do véu caem com ele),
     o inert sai dos filhos, e o Swiper é inicializado em idle.
   • O setTimeout do fim também cobre a virada DENTRO da sessão, se o
     usuário ficar na página na hora de desligar — comum na Black.

   Para o harness mockar a data: window.__veuNow = Date.parse(...)
   antes do veuPlanos.js rodar. Default é Date.now(). */

(function () {
  'use strict';

  const AGORA = () => (typeof window.__veuNow === 'number' ? window.__veuNow : Date.now());

  function obterFim(secao) {
    const bruto = secao.getAttribute('data-veu-fim');
    if (!bruto) return null;
    const t = Date.parse(bruto);
    return Number.isFinite(t) ? t : null;
  }

  function ligarVeu(secao) {
    for (const filho of secao.children) {
      if (filho.matches('[data-veu-camada]')) continue;
      filho.setAttribute('inert', '');
      filho.setAttribute('aria-hidden', 'true');
    }
  }

  function desligarVeu(secao) {
    for (const filho of secao.children) {
      if (filho.matches('[data-veu-camada]')) continue;
      filho.removeAttribute('inert');
      filho.removeAttribute('aria-hidden');
    }
    secao.removeAttribute('data-veu');
    secao.removeAttribute('data-veu-fim');
    const camada = secao.querySelector('[data-veu-camada]');
    if (camada) camada.remove();
  }

  function processar(secao) {
    const fim = obterFim(secao);
    if (fim === null) return;
    const agora = AGORA();
    if (agora >= fim) {
      desligarVeu(secao);
      return;
    }
    ligarVeu(secao);
    /* Agenda o desligamento para a hora exata, SE couber num setTimeout
       de 32 bits (24 dias). Além disso ignora: o setTimeout satura e
       uma recarga da página pega a virada. */
    const resta = fim - agora;
    const TETO_SETTIMEOUT = 2_147_483_647;
    if (resta <= TETO_SETTIMEOUT) {
      setTimeout(() => desligarVeu(secao), resta);
    }
  }

  function iniciar() {
    const secoes = document.querySelectorAll('section[data-veu]');
    for (const secao of secoes) processar(secao);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }
})();
