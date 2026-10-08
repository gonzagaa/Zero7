/* /script/tarjaVideo.js — a tarja promocional em vídeo (out/2026).

   O pôster (<picture> dentro de .tarjaMidia) É a tarja: nasce no HTML, entra
   no CSS crítico e é ele que conta no LCP. O <video> fica por cima,
   transparente, SEM src e SEM autoplay. Este script só dá src a ele depois do
   load + idle — o mesmo portão das animações (requestIdleCallback com timeout
   de 2000ms; sem ele, setTimeout de 800ms) — e só se a visita aguenta: sem
   movimento reduzido, sem saveData e (desktop ≥1080 OU conexão 4g). Começou a
   tocar ('playing'), a classe .is-tocando faz o fade de 300ms por cima do
   pôster. Qualquer falha (autoplay bloqueado, rede, formato) deixa o pôster,
   em silêncio.

   Pausa quando a tarja sai da tela ou some (campanha expirada esconde o bloco;
   aba em segundo plano) e retoma quando volta. Atravessou 1080 com a página
   aberta: troca o src pela variante certa — ou volta ao pôster, se a nova
   variante não pode tocar. Nada aqui toca no contador (regra 5) nem no
   tracking. */
(function () {
  var midia = document.querySelector('.tarjaImage .tarjaMidia');
  var video = midia && midia.querySelector('video');
  if (!video || !('IntersectionObserver' in window)) return;

  var mqDesk = matchMedia('(min-width: 1080px)');
  var mqCalmo = matchMedia('(prefers-reduced-motion: reduce)');
  var webm = !!video.canPlayType && video.canPlayType('video/webm; codecs="vp9"') !== '';

  var armado = false;
  var visivel = false;

  function podeTocar() {
    var c = navigator.connection;
    if (mqCalmo.matches) return false;
    if (c && c.saveData) return false;
    return mqDesk.matches || (!!c && c.effectiveType === '4g');
  }

  function arquivo() {
    var d = video.dataset;
    if (mqDesk.matches) return webm ? d.deskWebm : d.deskMp4;
    return webm ? d.mobWebm : d.mobMp4;
  }

  function tocar() {
    if (!armado || !visivel || document.hidden || !video.getAttribute('src')) return;
    var p = video.play();
    if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay bloqueado: fica o pôster */ });
  }

  function voltarAoPoster() {
    video.pause();
    video.classList.remove('is-tocando');
    video.removeAttribute('src');
    video.load(); // solta o buffer da variante anterior
  }

  function carregar() {
    var src = arquivo();
    if (!src) return;
    if (video.getAttribute('src') === src) { tocar(); return; }
    video.classList.remove('is-tocando');
    video.muted = true; // o atributo já diz; a política de autoplay olha a propriedade
    video.setAttribute('src', src);
    tocar();
  }

  video.addEventListener('playing', function () { video.classList.add('is-tocando'); });

  function armar() {
    if (armado || !podeTocar()) return;
    armado = true;

    new IntersectionObserver(function (entradas) {
      visivel = entradas[entradas.length - 1].isIntersecting;
      if (!visivel) { video.pause(); return; }
      if (!podeTocar()) return;
      if (!video.getAttribute('src')) carregar(); else tocar();
    }).observe(midia);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) video.pause(); else tocar();
    });

    var trocou = function () {
      if (!podeTocar()) { voltarAoPoster(); return; }
      if (visivel) carregar();
    };
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', trocou);
    else if (mqDesk.addListener) mqDesk.addListener(trocou);
  }

  function portao() {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(armar, { timeout: 2000 });
    else setTimeout(armar, 800);
  }

  if (document.readyState === 'complete') portao();
  else window.addEventListener('load', portao, { once: true });
})();
