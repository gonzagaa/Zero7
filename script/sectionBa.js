/* ============================================================
   Section #BA — Academy Pass + benefícios
   Autoplay dos vídeos · GSAP/ScrollTrigger · revelação dos cards
   ============================================================ */
(function () {
  'use strict';

  const secao = document.getElementById('ba');
  if (!secao) return;

  // ── Autoplay dos vídeos ────────────────────────────────────────────────────
  // O atributo autoplay sozinho falha muito no mobile: modo de baixo consumo,
  // economia de dados e o limite de vídeos decodificados ao mesmo tempo fazem
  // o navegador recusar em silêncio, e não há nova tentativa. Aqui a
  // reprodução é pedida de novo em cada momento em que costuma ser liberada.
  const videos = secao.querySelectorAll('video');

  const tocar = (v) => {
    // por propriedade, e não só por atributo: é o que alguns navegadores
    // conferem antes de liberar o autoplay
    v.muted = true;
    v.playsInline = true;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  videos.forEach(v => {
    if (v.readyState >= 2) tocar(v);
    v.addEventListener('loadeddata', () => tocar(v));
    v.addEventListener('canplay', () => tocar(v));
  });

  // Vários navegadores só liberam quando o vídeo está de fato visível, e
  // pausar o que saiu da tela devolve decodificador para os que ficaram.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(e => {
        if (e.isIntersecting) tocar(e.target);
        else e.target.pause();
      });
    }, { threshold: .1 });

    videos.forEach(v => io.observe(v));
  }

  // Volta a tocar ao retomar a aba
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) videos.forEach(tocar);
  });

  // Último recurso: a primeira interação do usuário destrava a reprodução
  ['touchstart', 'click', 'scroll'].forEach(ev => {
    window.addEventListener(ev, () => videos.forEach(tocar), {
      once: true,
      passive: true,
    });
  });

  if (typeof gsap === 'undefined') return;

  // ── Estados iniciais (o GSAP sobrescreve na entrada) ───────────────────────
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

  // ── Animações de entrada por ScrollTrigger ─────────────────────────────────
  const mm = gsap.matchMedia();

  // ---- Desktop (≥ 1080px) ---------------------------------------------------
  mm.add('(min-width: 1080px)', () => {

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
  mm.add('(max-width: 1079px)', () => {

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

  // ── Cards de benefício: revelação do texto ─────────────────────────────────
  // O CSS sozinho teria que animar até um max-height arbitrário (40em), bem
  // maior que o texto real — a parte visível terminaria no primeiro terço do
  // tempo e o resto animaria espaço vazio, dando a sensação de estalo. Aqui a
  // altura exata é medida, então a transição percorre só a distância real.
  //
  // mouseenter/mouseleave sem media query: em touch o navegador dispara os
  // dois no toque, então o mesmo par cobre mouse e telas sensíveis.
  document.querySelectorAll('#ba .ba-card--info').forEach(card => {
    const desc = card.querySelector('.ba-info__desc');
    if (!desc) return;

    card.addEventListener('mouseenter', () => {
      desc.style.maxHeight = desc.scrollHeight + 'px';
    });

    card.addEventListener('mouseleave', () => {
      desc.style.maxHeight = '';
    });
  });

})();
