/* Dobra de Halloween das páginas de obrigado (out/2026).

   A roleta NÃO mora aqui: ela é do app (app.zero7.com.br) e abre num iframe
   por cima da página, pelo roleta-obrigado.js colado antes do </body>, que
   carrega sempre. Este arquivo só decide qual primeira dobra aparece.

   Dobra de Halloween SÓ quando as duas coisas valem:
     1. a URL traz ?roleta= com token no formato que o script do app aceita
        (sem isso o script não abre nada, e a dobra prometeria uma roleta
        que não vem);
     2. ainda não deu PROMO_END. A data leva o fuso explícito e vira um
        instante absoluto: o fuso do aparelho não muda a virada.
   Em qualquer outro caso fica a dobra original, intacta. Depois do fim,
   quem abrir o link do e-mail ainda vê o prêmio na roleta do app (o
   script continua carregando), só que sobre a dobra original.

   Carrega no <head>, SEM defer: a decisão sai antes da primeira pintura,
   sem troca visível de dobra. A classe hw-on no <html> é o que o
   dobra.css usa para trocar uma seção pela outra.

   O link "Abrir de novo" recarrega a mesma URL (com o token): a roleta
   do app reabre mostrando o mesmo prêmio. */
(function () {
  'use strict';

  var PROMO_END = '2026-10-29T17:00:00-03:00';
  // o mesmo formato que o roleta-obrigado.js aceita
  var FORMATO_TOKEN = /^[0-9a-fA-F-]{36}\.[0-9]+\.[0-9a-f]{32}$/;

  var params = new URLSearchParams(window.location.search);
  var agora = Date.now();

  // ---- modo de teste (desenvolvimento) -------------------------------------
  // ?roleta_now=AAAA-MM-DDTHH:mm simula o relógio (hora de São Paulo). Só
  // vale em localhost/127.0.0.1; em produção é ignorado.
  if (/^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(window.location.hostname)) {
    var simulado = params.get('roleta_now');
    if (simulado && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(simulado)) {
      var ms = Date.parse(simulado + (simulado.length === 16 ? ':00' : '') + '-03:00');
      if (!isNaN(ms)) agora = ms;
    }
  }
  // ---------------------------------------------------------------------------

  var token = params.get('roleta');
  if (token && FORMATO_TOKEN.test(token) && agora < Date.parse(PROMO_END)) {
    document.documentElement.classList.add('hw-on');
  }

  document.addEventListener('click', function (e) {
    var alvo = e.target && e.target.closest ? e.target.closest('[data-hw-reabrir]') : null;
    if (!alvo) return;
    e.preventDefault();
    window.location.reload();
  });
})();
