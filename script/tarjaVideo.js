/* /script/tarjaVideo.js — a tarja promocional em vídeo (out/2026).

   O pôster (<picture> dentro de .tarjaMidia) É a tarja: nasce no HTML, entra
   no CSS crítico e é ele que conta no LCP. O <video> fica por cima,
   transparente, SEM src e SEM autoplay. Este script só dá src a ele depois do
   load + idle — o mesmo portão das animações (requestIdleCallback com timeout
   de 2000ms; sem ele — Safari —, setTimeout de 800ms) — e só se a visita
   aguenta: sem movimento reduzido e sem a Network Information API dizendo
   saveData ou rede 2g/3g. API ausente (Safari, Firefox) = desconhecido =
   LIBERA: antes o celular exigia effectiveType === '4g', e o iPhone, que não
   tem navigator.connection, nunca saía do pôster. Começou a tocar
   ('playing'), a classe .is-tocando faz o fade de 300ms por cima do pôster.
   Qualquer falha (autoplay bloqueado — Low Power Mode no iOS —, rede,
   formato) deixa o pôster, em silêncio.

   Formato: webm (VP9) só onde canPlayType diz 'probably' E o motor é Blink
   ou Gecko; no resto, mp4 (H.264). O Safari do iOS 17.4+ responde webm com
   'maybe'/'probably' e pode falhar no decode depois — e todo navegador do
   iOS é WebKit (CriOS e FxiOS não trazem 'Chrome/' nem 'Firefox/' na UA).

   Pausa quando a tarja sai da tela ou some (campanha expirada esconde o bloco;
   aba em segundo plano) e retoma quando volta. Atravessou 1080 com a página
   aberta: troca o src pela variante certa — ou volta ao pôster, se a nova
   variante não pode tocar. Nada aqui toca no contador (regra 5) nem no
   tracking.

   Depuração no celular, sem DevTools: ?tarjaDebug=1 na URL abre um quadro
   fixo no canto com a variante, cada condição do portão, o src, o
   readyState e o resultado do play() (motivo da rejeição ou 'playing').
   Sem o parâmetro, nada disso existe: nenhum nó, nenhum timer. */
(function () {
  var midia = document.querySelector('.tarjaImage .tarjaMidia');
  var video = midia && midia.querySelector('video');
  if (!video) return;

  var debug = /[?&]tarjaDebug=1(?:&|$)/.test(location.search);
  var mqDesk = matchMedia('(min-width: 1080px)');
  var mqCalmo = matchMedia('(prefers-reduced-motion: reduce)');
  var blinkGecko = /(?:Chrome|Chromium|Firefox)\//.test(navigator.userAgent);
  var webmDiz = video.canPlayType ? video.canPlayType('video/webm; codecs="vp9"') : '';
  var webm = blinkGecko && webmDiz === 'probably';

  var armado = false;
  var visivel = false;
  var est = { play: '—', eventos: [] };

  function portaoDiz() {
    var c = navigator.connection;
    if (mqCalmo.matches) return 'bloqueado: movimento reduzido';
    if (c && c.saveData) return 'bloqueado: saveData';
    if (c && /^(?:slow-2g|2g|3g)$/.test(c.effectiveType)) return 'bloqueado: rede ' + c.effectiveType;
    return 'liberado';
  }

  function podeTocar() { return portaoDiz() === 'liberado'; }

  function arquivo() {
    var d = video.dataset;
    if (mqDesk.matches) return webm ? d.deskWebm : d.deskMp4;
    return webm ? d.mobWebm : d.mobMp4;
  }

  function tocar() {
    if (!armado || !visivel || document.hidden || !video.getAttribute('src')) return;
    var p = video.play();
    est.play = 'pedido';
    if (p && typeof p.then === 'function') {
      p.then(function () { est.play = 'ok'; quadro(); }, function (e) {
        // autoplay bloqueado (Low Power Mode etc.): fica o pôster, em silêncio
        est.play = 'rejeitado: ' + (e && e.name) + ': ' + (e && e.message);
        quadro();
      });
    }
    quadro();
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
    quadro();
    if (armado || !podeTocar() || !('IntersectionObserver' in window)) return;
    armado = true;

    new IntersectionObserver(function (entradas) {
      visivel = entradas[entradas.length - 1].isIntersecting;
      quadro();
      if (!visivel) { video.pause(); return; }
      if (!podeTocar()) return;
      if (!video.getAttribute('src')) carregar(); else tocar();
    }).observe(midia);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) video.pause(); else tocar();
    });

    var trocou = function () {
      if (!podeTocar()) { voltarAoPoster(); quadro(); return; }
      if (visivel) carregar();
    };
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', trocou);
    else if (mqDesk.addListener) mqDesk.addListener(trocou);
  }

  // ── ?tarjaDebug=1 ────────────────────────────────────────────────────
  var painel = null;
  function quadro() {
    if (!debug) return;
    if (!painel) {
      painel = document.createElement('pre');
      painel.id = 'tarjaDebug';
      painel.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483647;margin:0;' +
        'max-width:calc(100vw - 16px);padding:8px 10px;background:rgba(0,0,0,.88);color:#7CFC9A;' +
        'font:11px/1.4 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all;' +
        'border-radius:6px;pointer-events:none';
      document.body.appendChild(painel);
      ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'playing', 'pause', 'waiting',
        'stalled', 'suspend', 'error', 'abort', 'emptied'].forEach(function (n) {
        video.addEventListener(n, function () {
          est.eventos.push(n + (n === 'error' && video.error ? ' (code ' + video.error.code + ')' : ''));
          if (est.eventos.length > 8) est.eventos.shift();
          quadro();
        });
      });
      setInterval(quadro, 500);
    }
    var c = navigator.connection;
    painel.textContent = [
      'tarjaDebug',
      'variante: ' + (mqDesk.matches ? 'desk (≥1080)' : 'mob (<1080)'),
      'motor: ' + (blinkGecko ? 'blink/gecko' : 'webkit/outro') + ' | webm vp9: "' + webmDiz + '" → ' + (webm ? 'webm' : 'mp4'),
      'portão:',
      '  movimento reduzido: ' + (mqCalmo.matches ? 'SIM' : 'não'),
      '  navigator.connection: ' + (c ? 'presente' : 'ausente (= liberado)'),
      '  saveData: ' + (c ? String(!!c.saveData) : 'n/d'),
      '  effectiveType: ' + (c && c.effectiveType ? c.effectiveType : 'n/d'),
      '  IntersectionObserver: ' + ('IntersectionObserver' in window ? 'sim' : 'NÃO'),
      '  → ' + portaoDiz() + (armado ? ' (armado)' : ''),
      'visível: ' + visivel,
      'src: ' + (video.getAttribute('src') || '—'),
      'readyState: ' + video.readyState + ' | networkState: ' + video.networkState +
        ' | paused: ' + video.paused + ' | t: ' + video.currentTime.toFixed(2),
      'play(): ' + est.play,
      'eventos: ' + (est.eventos.join(' › ') || '—')
    ].join('\n');
  }

  function portao() {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(armar, { timeout: 2000 });
    else setTimeout(armar, 800);
  }

  if (document.readyState === 'complete') portao();
  else window.addEventListener('load', portao, { once: true });
})();
