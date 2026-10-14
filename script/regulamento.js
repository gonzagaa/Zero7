/* /script/regulamento.js — comportamento da página /home/regulamento/.

   1. Menu do celular. O global.js da home NÃO roda aqui (ele arma os
      carrosséis com Swiper e o modal de depoimentos sem guarda — lançaria
      na carga), então o bloco de navegação dele vem espelhado abaixo, com
      o MESMO comportamento: abrir leva o foco ao primeiro link, Esc fecha,
      sair do menu com Tab fecha, o scrim fecha no toque. Mudou o menu no
      global.js, muda aqui. A barra NÃO alterna a classe .scroll: nesta
      página ela nasce com .scroll (fundo sólido) porque o topo é branco.
   2. Sumário: o item da seção que está sendo lida fica marcado
      (aria-current), por IntersectionObserver — sem ouvir scroll.
   3. Âncora de cada seção: clicar copia a URL com o #id e anuncia "Link
      copiado" (role=status). Sem a API de área de transferência, o link
      funciona como link comum.
   4. "Voltar ao topo" (abaixo de 1080): aparece depois da primeira tela.
   A rolagem suave é do CSS e respeita prefers-reduced-motion. */
(function () {
  var nav = document.getElementById('navigation');

  /* ── 1. menu (espelho do global.js) ───────────────────────────────── */
  window.openMenu = function () {
    document.body.classList.add('menu-expanded');
    var primeiro = document.querySelector('#navigation .menu a');
    if (primeiro) primeiro.focus({ preventScroll: true });
  };
  window.closeMenu = function () {
    var devolverFoco = document.activeElement && document.activeElement.classList.contains('close-menu');
    document.body.classList.remove('menu-expanded');
    if (devolverFoco) {
      var abrir = document.querySelector('#navigation .open-menu');
      if (abrir) abrir.focus();
    }
  };
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !document.body.classList.contains('menu-expanded')) return;
    window.closeMenu();
    var abrir = document.querySelector('#navigation .open-menu');
    if (abrir) abrir.focus();
  });
  if (nav) {
    nav.addEventListener('focusout', function (e) {
      if (!document.body.classList.contains('menu-expanded')) return;
      if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) window.closeMenu();
    });
  }
  var scrim = document.createElement('div');
  scrim.className = 'menu-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  scrim.addEventListener('click', window.closeMenu);
  document.body.appendChild(scrim);

  /* ── 2. sumário acompanha a leitura ───────────────────────────────── */
  var secoes = [].slice.call(document.querySelectorAll('.regulamento .reg-secao'));
  var links = [].slice.call(document.querySelectorAll('.reg-sumario-lista a'));
  function marcar(id) {
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === '#' + id) links[i].setAttribute('aria-current', 'true');
      else links[i].removeAttribute('aria-current');
    }
  }
  if ('IntersectionObserver' in window && secoes.length) {
    // O observador só AVISA que alguma seção cruzou a faixa de leitura; quem
    // decide é a posição real: a ativa é a última seção cujo topo já passou
    // da linha a 30% da tela. (Decidir pelo estado acumulado das entradas
    // errava depois de um salto longo — marcava a seção anterior.)
    var decidir = function () {
      var linha = window.innerHeight * 0.3;
      var ativa = secoes[0];
      for (var k = 0; k < secoes.length; k++) {
        if (secoes[k].getBoundingClientRect().top <= linha) ativa = secoes[k];
        else break;
      }
      var h2 = ativa.querySelector('h2');
      if (h2) marcar(h2.id);
    };
    var io = new IntersectionObserver(decidir, { rootMargin: '-28% 0px -70% 0px' });
    secoes.forEach(function (s) { io.observe(s); });
    decidir();
  }
  // no celular, escolher uma seção fecha o <details>
  var movel = document.querySelector('.reg-sumario-movel');
  if (movel) {
    movel.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) movel.removeAttribute('open');
    });
  }

  /* ── 3. âncora copia o link ───────────────────────────────────────── */
  var aviso = document.querySelector('.reg-aviso');
  var timerAviso = null;
  function avisar(texto) {
    if (!aviso) return;
    aviso.textContent = texto;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { aviso.textContent = ''; }, 2200);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('.reg-ancora') : null;
    if (!a || !navigator.clipboard || !window.isSecureContext) return;
    e.preventDefault();
    var hash = a.getAttribute('href');
    var url = location.href.split('#')[0] + hash;
    history.replaceState(null, '', hash);
    navigator.clipboard.writeText(url).then(function () {
      a.classList.add('is-copiado');
      setTimeout(function () { a.classList.remove('is-copiado'); }, 1600);
      avisar('Link copiado');
    }, function () {
      location.hash = hash;
    });
  });

  /* ── 4. voltar ao topo ────────────────────────────────────────────── */
  // sentinela a uma altura de tela do topo do documento: saiu por cima,
  // o leitor passou da primeira tela
  var topo = document.querySelector('.reg-topo');
  if (topo && 'IntersectionObserver' in window) {
    var sentinela = document.createElement('div');
    sentinela.setAttribute('aria-hidden', 'true');
    sentinela.style.cssText = 'position:absolute;top:100vh;left:0;width:1px;height:1px;pointer-events:none';
    document.body.appendChild(sentinela);
    new IntersectionObserver(function (es) {
      topo.classList.toggle('is-visivel', !es[0].isIntersecting && es[0].boundingClientRect.top < 0);
    }).observe(sentinela);
  }
})();
