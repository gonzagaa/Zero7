/* ============================================================
   Section #BA — Academy Pass + benefícios
   Autoplay dos vídeos · GSAP/ScrollTrigger · revelação dos cards
   ============================================================ */
(function () {
  'use strict';

  const secao = document.getElementById('ba');
  if (!secao) return;

  // ── Vídeos: só baixam e tocam quando entram na tela ────────────────────────
  // Os três somam 4 MB. Com preload="auto" isso começava a baixar junto com a
  // primeira dobra, competindo com o que estava na tela — e o atributo
  // autoplay obrigava o navegador a buscar mesmo se o preload dissesse "none".
  // Agora o HTML não pede byte nenhum de vídeo: quem dispara o download é o
  // IntersectionObserver, e até lá o card mostra o poster, que é o primeiro
  // quadro do próprio vídeo — a troca não dá salto.
  //
  // O autoplay saiu de propósito e quem dá play é o observer. De quebra isso
  // resolve o velho problema do celular: o navegador recusa o autoplay em
  // silêncio (baixo consumo, economia de dados, limite de decodificadores) e
  // não tenta de novo. Aqui a tentativa se repete em cada momento em que a
  // reprodução costuma ser liberada.
  const videos = Array.prototype.slice.call(secao.querySelectorAll('video'));

  // Movimento reduzido: os vídeos são decorativos, mudos, em laço e não têm
  // controle de pausa. Com a preferência ligada nenhum toca — e nenhum chega a
  // ser baixado. Fica o poster, que é imagem parada.
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const naTela = new WeakSet();
  const armados = new WeakSet();

  const tocar = (v) => {
    if (semMovimento) return;
    if (!naTela.has(v)) return;
    // por propriedade, e não só por atributo: é o que alguns navegadores
    // conferem antes de liberar a reprodução sem gesto do usuário
    v.muted = true;
    v.playsInline = true;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  // Só aqui o vídeo passa a poder buscar dados. Antes disto, preload="none".
  const armar = (v) => {
    if (semMovimento) return;
    if (!armados.has(v)) {
      armados.add(v);
      v.preload = 'auto';
      v.addEventListener('loadeddata', () => tocar(v));
      v.addEventListener('canplay', () => tocar(v));
    }
    tocar(v);
  };

  if ('IntersectionObserver' in window) {
    // a margem começa o download um pouco antes de entrar, para o primeiro
    // quadro não chegar atrasado; 200px não alcança a dobra inicial, o #ba
    // está a milhares de pixels dali
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) {
          naTela.add(e.target);
          armar(e.target);
        } else {
          naTela.delete(e.target);
          // pausar devolve decodificador para os que ficaram na tela
          e.target.pause();
        }
      });
    }, { threshold: .1, rootMargin: '200px 0px' });

    videos.forEach((v) => io.observe(v));
  } else {
    // sem observer não dá para saber o que está na tela: o poster fica e a
    // reprodução só começa na primeira rolagem
    window.addEventListener('scroll', () => {
      videos.forEach((v) => { naTela.add(v); armar(v); });
    }, { once: true, passive: true });
  }

  // Volta a tocar ao retomar a aba — só o que está na tela
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) videos.forEach(tocar);
  });

  // Último recurso: a primeira interação destrava a reprodução no celular
  ['touchstart', 'click'].forEach((ev) => {
    window.addEventListener(ev, () => videos.forEach(tocar), {
      once: true,
      passive: true,
    });
  });

  /* B4: as entradas por GSAP/ScrollTrigger viraram função armada pelo
     carregador do index.html DEPOIS do LCP, e só no desktop — no celular o
     GSAP nem baixa. O que vem DEPOIS deste bloco (revelação de texto dos
     cards, que é CSS + medição) roda sempre: por isso o "return" de topo
     virou guarda da função, senão celular perdia o hover dos cards. Sem
     gsap, nada esconde: os estados iniciais são gsap.set daqui de dentro. */
  window.zero7ArmarBa = function () {
    if (typeof gsap === 'undefined') return;


  // Movimento reduzido: nenhuma entrada é armada — header e cards ficam no
  // estado final desde o início. A condição mora no matchMedia do GSAP, que
  // desfaz sets e tweens sozinho se a preferência mudar com a página aberta.
  const mm = gsap.matchMedia();
  const COM_MOVIMENTO = '(prefers-reduced-motion: no-preference)';

  mm.add(COM_MOVIMENTO, () => {
    // ── Estados iniciais (o GSAP sobrescreve na entrada) ─────────────────────
    gsap.set('.ba-header', { opacity: 0, y: 24 });
    gsap.set('#ba .ba-card', { opacity: 0, y: 38, scale: .97 });

    gsap.to('.ba-header', {
      opacity: 1,
      y: 0,
      duration: .9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#ba',
        start: 'top 78%',
        toggleActions: 'play none none reverse',
      },
    });
  });

  // ── Animações de entrada por ScrollTrigger ─────────────────────────────────

  // ---- Desktop (≥ 1080px) ---------------------------------------------------
  mm.add(`(min-width: 1080px) and ${COM_MOVIMENTO}`, () => {

    // Painéis verticais de vídeo (esquerda + direita)
    gsap.to(['.ba-card--video-a', '.ba-card--video-b'], {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1.3,
      stagger: .09,
      ease: 'expo.out',
      clearProps: 'transform',
      scrollTrigger: {
        trigger: '#ba .ba-bento',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });

    // Card hero
    gsap.to('.ba-card--hero', {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1.4,
      delay: .15,
      ease: 'expo.out',
      clearProps: 'transform',
      scrollTrigger: {
        trigger: '#ba .ba-bento',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });

    // Conteúdo interno do hero — revelação em camadas
    gsap.fromTo(
      [
        '.ba-hero__title',
        '.ba-hero__desc',
      ],
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        stagger: .1,
        duration: .9,
        delay: .55,
        ease: 'power3.out',
        clearProps: 'transform',
        scrollTrigger: {
          trigger: '.ba-card--hero',
          start: 'top 78%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    // Trio de benefícios — stagger da esquerda para a direita
    gsap.to('.ba-card--info', {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: .9,
      stagger: .1,
      ease: 'power3.out',
      clearProps: 'transform',
      scrollTrigger: {
        trigger: '#ba .ba-trio',
        start: 'top 88%',
        toggleActions: 'play none none reverse',
      },
    });

  });

  // ---- Mobile / Tablet (< 1080px) — revelação simples por card -------------
  mm.add(`(max-width: 1079px) and ${COM_MOVIMENTO}`, () => {

    gsap.utils.toArray('#ba .ba-card').forEach((card, i) => {
      gsap.to(card, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: .85,
        delay: i * .06,
        ease: 'power3.out',
        clearProps: 'transform',
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
          toggleActions: 'play none none reverse',
        },
      });
    });

  });

  // A página muda de altura depois que as fontes chegam, e de novo quando a
  // janela cruza 1080, onde a raiz tipográfica troca e o layout inteiro se
  // refaz (fase 11). Sem refazer os gatilhos, o ScrollTrigger fica com as
  // posições do primeiro paint e as entradas disparam no lugar errado.
  const refazerGatilhos = () => window.ScrollTrigger?.refresh?.();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refazerGatilhos).catch(() => {});
  }
  let refrescoPendente;
  window.addEventListener('resize', () => {
    clearTimeout(refrescoPendente);
    refrescoPendente = setTimeout(refazerGatilhos, 200);
  }, { passive: true });
  };
  window.zero7ArmarBa(); // se o gsap já estiver na página (não estará)

  // ── Cards de benefício: revelação do texto ─────────────────────────────────
  // O CSS sozinho teria que animar até um max-height arbitrário (40em), bem
  // maior que o texto real — a parte visível terminaria no primeiro terço do
  // tempo e o resto animaria espaço vazio, dando a sensação de estalo. Aqui a
  // altura exata é medida, então a transição percorre só a distância real.
  //
  // Com mouse (hover: hover), abre ao passar o ponteiro, como sempre. Em tela
  // de toque (hover: none), abre e fecha no toque: o navegador emula o
  // mouseenter até quando o dedo só passa pelo card rolando a página, e o
  // texto abria sozinho (fase 8). O .is-open é o estado aberto nos dois casos
  // — o CSS tira o line-clamp com ele.
  //
  // Teclado: o card vira parada de Tab e abre com o foco de teclado — sem
  // isso o texto cortado em três linhas não tinha como ser lido. Fecha quando
  // não resta nem ponteiro nem foco de teclado em cima dele.
  const comMouse = window.matchMedia('(hover: hover)');
  document.querySelectorAll('#ba .ba-card--info').forEach(card => {
    const desc = card.querySelector('.ba-info__desc');
    if (!desc) return;

    const abrir = () => {
      card.classList.add('is-open');
      desc.style.maxHeight = desc.scrollHeight + 'px';
    };
    const fecharJa = () => {
      card.classList.remove('is-open');
      desc.style.maxHeight = '';
    };
    const fechar = () => {
      if (card.matches(':hover, :focus-visible')) return;
      fecharJa();
    };

    card.tabIndex = 0;
    card.addEventListener('mouseenter', () => { if (comMouse.matches) abrir(); });
    card.addEventListener('mouseleave', () => { if (comMouse.matches) fechar(); });
    card.addEventListener('click', () => {
      if (comMouse.matches) return;
      if (card.classList.contains('is-open')) fecharJa();
      else abrir();
    });
    card.addEventListener('focus', () => {
      if (card.matches(':focus-visible')) abrir();
    });
    card.addEventListener('blur', fechar);
  });

})();
