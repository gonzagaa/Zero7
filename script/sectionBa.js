/* ============================================================
   Section #BA — Blackarrow Showcase
   GSAP + ScrollTrigger · tilt e spotlight no mouse
   ============================================================ */
(function () {
  'use strict';

  if (!document.getElementById('ba') || typeof gsap === 'undefined') return;

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
        '#ba .ba-card--hero .z7-btnx',
      ],
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        stagger: .1,
        duration: .9,
        delay: .55,
        ease: 'power3.out',
        // libera o transform para o botão .z7-btnx voltar às animações próprias
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

})();
