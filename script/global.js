 window.addEventListener('scroll', onScroll)

 onScroll()
 function onScroll() {
     showNavOnScroll()
 }

 function showNavOnScroll() {
     if(scrollY > 0) {
         document.querySelector("#navigation").classList.add("scroll")
     } else {
         document.querySelector("#navigation").classList.remove("scroll")
     }
 }

 /* Teclado no menu mobile: o hambúrguer some (visibility: hidden) no instante
    em que o menu abre, e o foco sumiria junto. O foco vai para o primeiro
    link; Esc fecha; fechar pelo X devolve o foco ao hambúrguer; e sair do menu
    com Tab fecha o menu, em vez de deixá-lo aberto por cima da página enquanto
    o foco anda por trás dele. */
 function openMenu() {
     document.body.classList.add('menu-expanded')
     document.querySelector('#navigation .menu a')?.focus({ preventScroll: true })
 }

function closeMenu() {
    const devolverFoco = document.activeElement?.classList.contains('close-menu')
    document.body.classList.remove('menu-expanded')
    if (devolverFoco) document.querySelector('#navigation .open-menu')?.focus()
}

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !document.body.classList.contains('menu-expanded')) return
    closeMenu()
    document.querySelector('#navigation .open-menu')?.focus()
})

document.getElementById('navigation')?.addEventListener('focusout', (e) => {
    if (!document.body.classList.contains('menu-expanded')) return
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) closeMenu()
})

/* Scrim do menu mobile (fase 8): escurece a página atrás do painel e fecha o
   menu no toque. Direto no body, fora da nav (ver navigation.css). */
{
    const scrim = document.createElement('div')
    scrim.className = 'menu-scrim'
    scrim.setAttribute('aria-hidden', 'true')
    scrim.addEventListener('click', closeMenu)
    document.body.appendChild(scrim)
}

/* Ano do © no rodapé (fase 8): o HTML traz o ano da publicação; aqui entra
   o ano corrente. */
document.querySelectorAll('.js-ano').forEach((el) => {
    el.textContent = new Date().getFullYear()
})

/* Zendesk (fase 8, pedido do cliente): o botão flutuante do suporte só
   aparece a partir da dobra dos benefícios (#ba). No herói, o botão e a
   mensagem proativa cobriam o texto e o CTA — e no navegador do Instagram a
   área visível é ainda menor. O snippet do Zendesk continua igual (regra 2):
   aqui entra só a API documentada do Messaging, zE('messenger', 'show' |
   'hide'). Com a conversa aberta nada se esconde; ao fechá-la, o botão volta
   a seguir a posição da página.

   O snippet agora entra sob interação ou ocioso, então o zE NÃO existe mais
   quando este arquivo roda — antes existia só porque as duas tags eram
   bloqueantes e o snippet vinha 500 linhas acima. Por isso o bloco virou
   função, e quem carrega o snippet (index.html) a chama quando a API fica
   pronta. Ela lê o ESTADO ATUAL da página, não repete a sequência da carga:
   quem rolou rápido para depois do #ba antes do snippet chegar vê o botão
   aparecer, porque o passouDaDobra() é medido na hora da chamada. */
function ligarBotaoDoZendesk() {
    if (ligarBotaoDoZendesk.armado) return
    const beneficios = document.getElementById('ba')
    if (typeof window.zE !== 'function' || !beneficios || !('IntersectionObserver' in window)) return
    ligarBotaoDoZendesk.armado = true

    let conversaAberta = false
    let mostrando = null
    const passouDaDobra = () => beneficios.getBoundingClientRect().top < window.innerHeight
    const aplicar = (mostrar) => {
        if ((!mostrar && conversaAberta) || mostrar === mostrando) return
        mostrando = mostrar
        window.zE('messenger', mostrar ? 'show' : 'hide')
    }
    // Esconde INCONDICIONALMENTE antes de olhar a dobra. Quem carrega o
    // snippet já fez isto; aqui é a segunda trava, para quando esta função
    // for chamada por outro caminho. O estado conhecido passa a ser
    // "escondido" — e o mostrando=false registra isso, para o aplicar() não
    // achar que ainda não sabe de nada.
    //
    // São DUAS camadas, e cada uma cobre um caso. Esta aqui é o à prova de
    // falha: se alguém quebrar o acoplamento com o carregador (renomear o
    // zero7LigarZendesk, mexer na ordem), nada nunca mostra o botão, e ele
    // fica escondido — que é o pedido do cliente — em vez de aparecer sobre
    // o CTA do herói. Medido com o acoplamento quebrado de propósito
    // (scripts/ze-falha.mjs): antes desta linha o lançador saía VISÍVEL em
    // 390 parado no topo.
    //
    // A camada de baixo é o observador, e ele é DE MÃO DUPLA de propósito:
    // mostra ao entrar no #ba, esconde ao sair por cima, e NÃO se
    // desconecta no primeiro acerto. Já tentei aqui deixá-lo só mostrando,
    // achando que isso reforçava o à prova de falha — não reforça (quem
    // garante é a linha acima) e quebrava o "some ao voltar ao topo" da
    // fase 8. Se for mexer nisto, rode o ze-falha.mjs nos três modos.
    window.zE('messenger', 'hide')
    mostrando = false

    window.zE('messenger:on', 'open', () => { conversaAberta = true })
    window.zE('messenger:on', 'close', () => {
        conversaAberta = false
        aplicar(passouDaDobra())
    })
    aplicar(passouDaDobra())
    // A margem de cima enorme faz "intersecta" valer "o topo de #ba já
    // subiu da base da tela". Sem ela, um salto que pula a seção inteira
    // (de #plan de volta ao topo) não mudava a interseção e o botão ficava.
    new IntersectionObserver(([e]) => aplicar(e.isIntersecting), {
        rootMargin: '100000px 0px 0px 0px',
    }).observe(beneficios)
}
window.zero7LigarZendesk = ligarBotaoDoZendesk
// Se o snippet já tiver chegado (cache quente, ou alguém devolver a tag
// bloqueante), arma aqui mesmo. Senão não faz nada, e quem carrega chama.
ligarBotaoDoZendesk()

/* Anel dos CTAs no compositor + pausa fora da tela (lote A, item 3).

   O anel girava animando a custom property --spin, que roda na main thread
   (o Lighthouse acusava os botões). O giro composto precisa de um rotor
   com transform DENTRO de uma máscara parada — e máscara em pseudo não tem
   filho, então o rotor é um span injetado aqui (16 botões no HTML; editar
   todos multiplicaria o risco). O ::after estático do CSS segue sendo o
   primeiro frame e o fallback sem JS; a classe .z7x--rotor faz a troca, que
   é invisível: mesma geometria, mesmo conic, mesmo ângulo inicial.

   E TUDO que anima pausa fora da viewport: eram até 24 animações rodando a
   três telas de distância. A classe .anim-fora (button.css) pausa o botão,
   os pseudos e o rotor; o observador liga e desliga com uma folga de 160px
   para a animação já estar rodando quando o elemento entra. */
{
    const alvos = [...document.querySelectorAll('.btn--primaria, .z7-btnx, .card-tarja')]
    for (const el of alvos) {
        const eBotao = el.classList.contains('btn--primaria') || el.classList.contains('z7-btnx')
        if (eBotao && !el.querySelector('.z7x-anel')) {
            const anel = document.createElement('span')
            anel.className = 'z7x-anel'
            anel.setAttribute('aria-hidden', 'true')
            el.appendChild(anel)
            el.classList.add('z7x--rotor')
        }
    }
    if ('IntersectionObserver' in window && alvos.length) {
        const obs = new IntersectionObserver((entradas) => {
            for (const e of entradas) e.target.classList.toggle('anim-fora', !e.isIntersecting)
        }, { rootMargin: '160px 0px 160px 0px' })
        alvos.forEach((el) => obs.observe(el))
    }

    /* O portão: as ociosas só armam DEPOIS do load, em idle. Sem isto, 16
       gradientes + 16 discos de anel viravam camadas compostas rasterizadas
       na primeira pintura — +1s de main thread na carga, medido (TBT 73 ->
       694ms em 390 livre). Ligar depois tira o custo da janela que o Google
       mede; visualmente, antes do portão os botões mostram o primeiro
       frame, que é o que o prefers-reduced-motion sempre mostrou. */
    const armarOciosas = () => document.body.classList.add('anima-ociosas')
    const emIdle = () => (typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(armarOciosas, { timeout: 3000 })
        : setTimeout(armarOciosas, 800))
    if (document.readyState === 'complete') emIdle()
    else window.addEventListener('load', emIdle, { once: true })
}

/* Camadas sobre a página (os modais de depoimento e da central de ajuda):
   enquanto uma está aberta, o resto do documento fica inert — o Tab não
   escapa para trás do overlay e o leitor de tela não lê o que está coberto.
   Devolve a função que solta: tira o inert e devolve o foco a quem o tinha
   antes de abrir. */
function prenderFoco(camada) {
    const origem = document.activeElement
    const inertes = []
    for (let no = camada; no.parentElement; no = no.parentElement) {
        for (const irmao of no.parentElement.children) {
            if (irmao === no || irmao.inert) continue
            irmao.inert = true
            inertes.push(irmao)
        }
        if (no.parentElement === document.body) break
    }
    return function soltar() {
        inertes.forEach((el) => { el.inert = false })
        if (origem && typeof origem.focus === 'function' && document.contains(origem)) {
            origem.focus({ preventScroll: true })
        }
    }
}

/* Movimento reduzido. O CSS tem a rede de segurança dele (acessibilidade.css);
   aqui ficam as guardas do que é movido por JS neste arquivo: o AOS nem arma
   (o disable tira os data-aos, e sem o atributo o CSS do AOS não esconde
   nada) e os carrosséis trocam de slide sem deslizar. */
const SEM_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* B4: o AOS não carrega mais junto com a página — no celular ele nem baixa,
   e no desktop entra DEPOIS do LCP, pelo carregador do index.html, que
   então chama isto. A guarda de typeof é a vida sem a biblioteca: sem AOS
   nada aqui pode lançar, senão o resto do arquivo morre. */
window.zero7ArmarAnimacoes = function () {
    if (typeof AOS === 'undefined') return
    AOS.init({
        duration: 1200,
        disable: SEM_MOVIMENTO
    })
}
/* O ponto-e-vírgula abaixo NÃO é opcional: sem ele, a IIFE seguinte vira
   argumento — window.zero7ArmarAnimacoes()(() => {…}) — o retorno
   (undefined) é chamado como função, o TypeError mata TODO o resto deste
   arquivo (rotator do h1, Swipers, modal de depoimentos) e ninguém vê,
   porque cada bloco morto falha em silêncio. Foi exatamente o que o
   cbd4352 (lote B) fez, e ficou quebrado por quatro lotes. A sonda
   scripts/console-limpa.mjs reprova qualquer erro de console na carga. */
window.zero7ArmarAnimacoes();  // se o AOS já estiver na página (não estará)

(() => {
  const wrapper = document.querySelector(".reveal-wrapper");
  if (!wrapper) return;

  const NBSP = "\u00A0";
  const THIN = "\u2009";

  const words = [
    "acessível",
    "seguro" + NBSP + NBSP + NBSP + NBSP,
    "lucrativo" + THIN
  ];

  // garante 2 spans (front/back)
  let front =
    wrapper.querySelector(".reveal-word.is-front") ||
    wrapper.querySelector(".reveal-word");

  if (!front) return;

  front.classList.add("reveal-word", "is-front");

  let back = wrapper.querySelector(".reveal-word.is-back");
  if (!back) {
    back = document.createElement("span");
    back.className = "reveal-word is-back";
    wrapper.appendChild(back);
  }

  // SEO-11: as duas palavras ficam no DOM (a de fora só tem opacity 0), e o
  // rastreador lia o h1 com as duas — "O ECOSSISTEMA LUCRATIVO SEGURO PARA
  // OPERAR DAY TRADE". O aria-hidden acompanha a troca: só a palavra em cena
  // fica na árvore de acessibilidade.
  front.removeAttribute("aria-hidden");
  back.setAttribute("aria-hidden", "true");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // índice inicial
  const initial = (front.textContent || "").trim();
  let index = Math.max(0, words.findIndex(w => w.trim() === initial));
  if (!initial) front.textContent = words[index];

  // trava largura na maior palavra (zero pulo)
  function measureMaxWidth() {
    const probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    probe.style.left = "-9999px";
    probe.style.top = "-9999px";

    const cs = getComputedStyle(front);
    probe.style.font = cs.font;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.style.textTransform = cs.textTransform;

    document.body.appendChild(probe);

    let max = 0;
    for (const w of words) {
      probe.textContent = w;
      max = Math.max(max, probe.getBoundingClientRect().width);
    }

    document.body.removeChild(probe);
    wrapper.style.width = `${Math.ceil(max) + 2}px`;
  }

  let nextCall = null;

  function scheduleNext(delay = 2.0) {
    clearTimeout(nextCall);
    nextCall = setTimeout(animateSwitch, delay * 1000);
  }

  /* B4: o rotador saiu do GSAP para a Web Animations API — no celular as
     bibliotecas de animação nem baixam, e a palavra continua girando nas
     duas plataformas. Mesmos números do timeline antigo: saída de 450ms
     (power3.inOut ~ cubic-bezier .645/.045/.355/1), entrada de 600ms com
     60ms de atraso (power3.out ~ .215/.61/.355/1), blur 14/16, e o micro
     settle de escala virou keyframes com offset (1.015 a 23%, 1 a 65%).
     translate/scale como propriedades individuais: não brigam entre si. */
  const CURVA_SAIDA_TL = 'cubic-bezier(0.645, 0.045, 0.355, 1)';
  const CURVA_ENTRADA_TL = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
  let animSaida = null;
  let animEntrada = null;

  function pousar(el, escondido) {
    el.style.translate = escondido ? '0 110%' : '0 0';
    el.style.opacity = escondido ? '0' : '1';
    el.style.filter = escondido ? 'blur(14px)' : 'blur(0px)';
    el.style.scale = escondido ? '0.985' : '1';
  }

  function animateSwitch() {
    const nextIndex = (index + 1) % words.length;
    const nextWord = words[nextIndex];

    if (prefersReducedMotion) {
      front.textContent = nextWord;
      index = nextIndex;
      scheduleNext(2.0);
      return;
    }

    back.textContent = nextWord;
    pousar(back, true);
    pousar(front, false);

    animSaida = front.animate([
      { translate: '0 0', opacity: 1, filter: 'blur(0px)', scale: '1' },
      { translate: '0 -110%', opacity: 0, filter: 'blur(16px)', scale: '0.985' },
    ], { duration: 450, easing: CURVA_SAIDA_TL, fill: 'forwards' });

    animEntrada = back.animate([
      { translate: '0 110%', opacity: 0, filter: 'blur(14px)', scale: '0.985', offset: 0 },
      { scale: '1.015', offset: 0.233 },
      { scale: '1', offset: 0.65 },
      { translate: '0 0', opacity: 1, filter: 'blur(0px)', scale: '1', offset: 1 },
    ], { duration: 600, delay: 60, easing: CURVA_ENTRADA_TL, fill: 'forwards' });

    animEntrada.onfinish = () => {
      if (animSaida) animSaida.cancel();
      animEntrada.cancel();

      const tmp = front;
      front = back;
      back = tmp;

      front.classList.add("is-front");
      front.classList.remove("is-back");
      back.classList.add("is-back");
      back.classList.remove("is-front");

      // a palavra que entrou passa a ser a lida; a que saiu sai da árvore
      front.removeAttribute("aria-hidden");
      back.setAttribute("aria-hidden", "true");

      pousar(front, false);
      pousar(back, true);

      index = nextIndex;
      scheduleNext(2.0);
    };
  }

  // gsap.utils.debounce NÃO existe no GSAP 3 (conferido no 3.12.2: zero
  // ocorrências de "debounce" no arquivo). A chamada lançava TypeError e o
  // listener de resize nunca era pendurado — a largura do wrapper, travada
  // na carga, ficava errada depois de girar o celular ou redimensionar:
  // medido, um ciclo 1920 -> 390 deixava o wrapper em 461px num viewport de
  // 390, com o h1 vazando da tela. Debounce próprio, mesmo contrato.
  function debounce(fn, espera) {
    let t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, espera);
    };
  }

  function start() {
    measureMaxWidth();
    scheduleNext(2.0);
    window.addEventListener("resize", debounce(measureMaxWidth, 150));
  }

  // A medida NÃO espera o fonts.ready: desde o E1 ele só resolve DEPOIS
  // do load (as faces completas entram por JS), e travar a largura do
  // wrapper tão tarde movia o herói em ~0,011 de CLS no meio da carga
  // (medido, lote da campanha PROFIT). A ordem agora: (1) mede já, com o
  // fallback métrico, antes do primeiro paint; (2) remede assim que a
  // NCS chega — é o subconjunto do HERO, precarregado, que traz as três
  // palavras rotativas com a MÉTRICA da face completa, então chega antes
  // do FCP e a remedida do fonts.ready (3, dentro do start) dá delta
  // zero e não move nada.
  measureMaxWidth();
  if (document.fonts && document.fonts.load) {
    // o texto de amostra é OBRIGATÓRIO: a face tem unicode-range e, sem
    // ele, o load() não resolve na chegada da fonte — o wrapper travava
    // largura tarde (244→292px pós-paint, shift medido no F3a)
    document.fonts.load('400 100px "NCS Radhiumz"', 'acessível seguro lucrativo').then(measureMaxWidth).catch(() => {});
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
  } else {
    window.addEventListener("load", start);
  }
})();


// // Animação da linha de progresso
// gsap.to(".line-progress", {
//   scrollTrigger: {
//     trigger: ".timeline",
//     start: "top center",
//     end: "bottom center",
//     scrub: true,
//   },
//   height: "100%",
//   ease: "none"
// });

// // Ativa bolinhas conforme o scroll
// gsap.utils.toArray(".step").forEach(step => {
//   const circle = step.querySelector(".circle");

//   ScrollTrigger.create({
//     trigger: step,
//     start: "top center+=20",
//     onEnter: () => circle.classList.add("active"),
//     onLeaveBack: () => circle.classList.remove("active")
//   });
// });

// // Aparecer os textos se quiser manter a animação original dos conteúdos
// gsap.utils.toArray(".contentStep").forEach(content => {
//   gsap.to(content, {
//     scrollTrigger: {
//       trigger: content,
//       start: "top 80%",
//       toggleActions: "play none none reverse"
//     },
//     opacity: 1,
//     y: 0,
//     duration: 1,
//     ease: "power2.out"
//   });
// });

const larguraDaTela = window.innerWidth

/* mySwiper3 — Swiper órfão. O elemento .mySwiper3 não existe mais no HTML
   (provavelmente fazia parte da section #plan antiga removida). Mantido aqui
   comentado caso volte a ser necessário. */
/*
if (larguraDaTela < 800) {
    var swiper3 = new Swiper(".mySwiper3", {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: true,
        grabCursor: true,
        pagination: {
          el: ".swiper-pagination",
          clickable: true,
        },
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        },
      });
} else {
    var swiper3 = new Swiper(".mySwiper3", {
        slidesPerView: 4,
        spaceBetween: 10,
        loop: true,
        grabCursor: true,
        pagination: {
          el: ".swiper-pagination",
          clickable: true,
        },
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        },
      });
}
*/

// Quando existe um card com .card--copa em .mySwiper4, ele deve ser exibido
// como slide inicial (primeiro no mobile, do meio no desktop).
const __copaSlides = Array.from(
  document.querySelectorAll(".mySwiper4 .swiper-wrapper > .swiper-slide")
);
const __copaIndex = __copaSlides.findIndex(el => el.classList.contains("card--copa"));
const __hasCopa = __copaIndex >= 0;

/* Antes daqui havia dois `new Swiper` por carrossel, escolhidos por um
   `if (larguraDaTela < 800)`. Dois problemas: 800 era um breakpoint que só
   existia neste arquivo, fora do mapa do CSS; e como `larguraDaTela` é lido
   uma única vez no load, o carrossel não sobrevivia a um resize — girar o
   tablet mantinha o layout da orientação anterior até recarregar a página.

   A config `breakpoints` do próprio Swiper resolve os dois: ela é reavaliada
   a cada resize e segue o mapa do global.css (sm 640 / lg 1080). A faixa de
   tablet, que mostrava 1 card entre 768 e 799 e 3 a partir de 800, agora
   mostra 2 de ponta a ponta. */
const BP_SM = 640;
const BP_LG = 1080;

// Com 3 cards à vista o copa precisa ser o do meio; com 1 ou 2, o primeiro.
const __slideInicialCopa =
  larguraDaTela >= BP_LG ? Math.max(0, __copaIndex - 1) : __copaIndex;

/* Indicadores com o nome do plano no lugar das bolinhas de 8px. Cada um é um
   <button> com o mesmo texto do título do card — nada de copy nova — e 44px
   de altura (sectionPlanos.css). Os planos que estão na tela ficam acesos:
   um no celular, dois no tablet, três no desktop. O bloco mora logo depois do
   .swiper, fora dele, para não mexer no top: 45% das setas.

   Os slides fora da tela ficam inert. Sem isso o Tab entrava no CTA de um
   card escondido, o Swiper deslizava até ele, o loop reordenava os slides no
   DOM e o foco caía de novo num CTA já visitado: no desktop o teclado não
   saía mais do carrossel. Com eles inert, o Tab passa pelos CTAs à vista,
   pelas setas e pelos indicadores, e segue para a próxima seção. */
function paginacaoDePlanos(carrossel) {
  const nomes = Array.from(
    document.querySelectorAll(carrossel + " .swiper-slide .title h3"),
    (h) => h.textContent.trim()
  );
  return {
    el: carrossel + " + .swiper-pagination",
    clickable: true,
    renderBullet: (i, classe) =>
      '<button type="button" class="' + classe + '">' + (nomes[i] || i + 1) + "</button>",
  };
}

function marcarPlanosNaTela(sw) {
  const naTela = new Set();
  sw.slides.forEach((slide, i) => {
    if (!slide.classList.contains("swiper-slide-visible")) return;
    const real = slide.getAttribute("data-swiper-slide-index");
    naTela.add(real === null ? i : Number(real));
  });

  // Carrossel escondido (o ativo que não está selecionado) não tem slide
  // visível; nada fica inert até ele aparecer e ser medido de novo.
  sw.slides.forEach((slide, i) => {
    const real = slide.getAttribute("data-swiper-slide-index");
    slide.inert = naTela.size > 0 && !naTela.has(real === null ? i : Number(real));
  });

  const indicadores = (sw.pagination && sw.pagination.bullets) || [];
  indicadores.forEach((b, i) => b.classList.toggle("is-na-tela", naTela.has(i)));
}

const EVENTOS_DO_CARROSSEL_DE_PLANOS = {
  init: marcarPlanosNaTela,
  update: marcarPlanosNaTela,
  resize: marcarPlanosNaTela,
  slideChange: marcarPlanosNaTela,
  transitionEnd: marcarPlanosNaTela,
  loopFix: marcarPlanosNaTela,
  paginationRender: marcarPlanosNaTela,
  paginationUpdate: marcarPlanosNaTela,
};

/* F1: os dois carrosséis armam DEPOIS do load, em idle — o MESMO portão
   das animações ociosas lá em cima. Medido no dia em que este arquivo
   ressuscitou (o cbd4352 tinha matado tudo daqui para baixo): os dois
   `new Swiper` no parse custavam 2–3 pontos no mobile (LCP simulado
   +300ms, SI +416ms); em idle, custo zero na janela que o Google mede.
   Quem consome (planosAtivo) já lê por função (() => window.swiper4) e
   com guarda de undefined — não mexa nisso sem rodar o lh.mjs antes e
   depois. */
function armarCarrosseis() {
window.swiper4 = new Swiper(".mySwiper4", {
    slidesPerView: 1,
    spaceBetween: 5,
    loop: true,
    grabCursor: true,
    speed: SEM_MOVIMENTO ? 0 : 300,
    watchSlidesProgress: true,
    ...(__hasCopa ? { initialSlide: __slideInicialCopa } : {}),
    breakpoints: {
      [BP_SM]: { slidesPerView: 2, spaceBetween: 20 },
      [BP_LG]: { slidesPerView: 3, spaceBetween: 60 },
    },
    pagination: paginacaoDePlanos(".mySwiper4"),
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    on: EVENTOS_DO_CARROSSEL_DE_PLANOS,
  });

// O carrossel de bitcoin só tem dois cards, então o teto dele é 2.
window.swiper11 = new Swiper(".mySwiper11", {
    slidesPerView: 1,
    spaceBetween: 5,
    loop: true,
    grabCursor: true,
    speed: SEM_MOVIMENTO ? 0 : 300,
    watchSlidesProgress: true,
    breakpoints: {
      [BP_SM]: { slidesPerView: 2, spaceBetween: 20 },
      [BP_LG]: { slidesPerView: 2, spaceBetween: 30 },
    },
    pagination: paginacaoDePlanos(".mySwiper11"),
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    on: EVENTOS_DO_CARROSSEL_DE_PLANOS,
  });
}

{
  const emIdleCarrosseis = () => (typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(armarCarrosseis, { timeout: 3000 })
    : setTimeout(armarCarrosseis, 800));
  if (document.readyState === 'complete') emIdleCarrosseis();
  else window.addEventListener('load', emIdleCarrosseis, { once: true });
}

const modalGeral = document.getElementById("modalDepoimentos");
const videoContainerGeral = document.getElementById("video-container-geral");
const closeBtnGeral = document.querySelector(".close-depoimento-geral");

/* Teclado: os depoimentos são <div> com clique e o X do modal é um <span>;
   nenhum dos dois recebia foco, então os seis vídeos eram inalcançáveis sem
   mouse. Viram botões para o teclado (tabindex + Enter/Espaço). Ao abrir, o
   foco vai para o X e fica preso no modal; ao fechar, volta ao depoimento. */
let soltarFocoDoDepoimento = null;

function ativarComTeclado(el) {
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    el.click();
  });
}

function fecharDepoimento() {
  modalGeral.style.display = "none";
  videoContainerGeral.innerHTML = "";
  if (soltarFocoDoDepoimento) {
    soltarFocoDoDepoimento();
    soltarFocoDoDepoimento = null;
  }
}

ativarComTeclado(closeBtnGeral);

document.querySelectorAll(".depoimento").forEach((depoimento) => {
  ativarComTeclado(depoimento);
  depoimento.addEventListener("click", () => {
    const videoUrl = depoimento.getAttribute("data-video");
    if (!videoUrl) return;

    modalGeral.style.display = "flex";
    videoContainerGeral.innerHTML = `
      <iframe src="${videoUrl}?autoplay=1&rel=0"
        title="Depoimento"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen>
      </iframe>
    `;
    soltarFocoDoDepoimento = prenderFoco(modalGeral);
    closeBtnGeral.focus();
  });
});

closeBtnGeral.addEventListener("click", fecharDepoimento);

window.addEventListener("click", (e) => {
  if (e.target === modalGeral) fecharDepoimento();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalGeral.style.display === "flex") fecharDepoimento();
});

/* Popup promo (#popupOverlay no index.html, estilos em css/popup.css).
   Abre sozinho após o delay abaixo; fecha no X, clicando fora, com Esc,
   ou ao clicar em qualquer link dentro dele. Se o bloco HTML for removido/
   comentado, o guard `if (!overlay...)` desativa tudo sem erro. */
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("popupOverlay");
  const content = document.getElementById("popupContent");
  const closeBtn = document.getElementById("popupClose");

  if (!overlay || !content || !closeBtn) return;

  // Mostrar o popup um tempinho após o acesso
  setTimeout(() => {
    overlay.classList.add("active");
    content.classList.add("active");
  }, 4000);

  // Fechar com botão X
  closeBtn.addEventListener("click", () => {
    closePopup();
  });

  // Fechar ao clicar fora do conteúdo (na overlay)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePopup();
  });

  // Fechar com Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) closePopup();
  });

  // Fechar ao clicar em QUALQUER link dentro do popup (ex.: <a href="#plan">...</a>)
  content.addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (anchor) {
      // fecha instantaneamente para não atrapalhar o scroll até a âncora
      closePopup({ instant: true });
      // não damos preventDefault: o navegador segue o link normalmente
    }
  });

  function closePopup(opts = {}) {
    const { instant = false } = opts;
    content.classList.remove("active");

    if (instant) {
      overlay.classList.remove("active");
      overlay.style.opacity = "";
      return;
    }

    overlay.style.opacity = "1";
    setTimeout(() => {
      overlay.classList.remove("active");
      overlay.style.opacity = "";
    }, 300); // mesmo tempo da transição no CSS
  }
});


const dataFinal = new Date("2025-12-15T23:59:00");

const diasEl = document.getElementById('dias');
const horasEl = document.getElementById('horas');
const minutosEl = document.getElementById('minutos');
const segundosEl = document.getElementById('segundos');
/* mensagemEl removido: o elemento #mensagem não existe no HTML. Quando o
   countdown chegava a zero o código antigo dava erro `null` ao tentar setar
   .innerText. Se quiser exibir uma mensagem ao zerar, basta adicionar um
   <span id="mensagem"></span> no HTML e descomentar as linhas marcadas abaixo. */
// const mensagemEl = document.getElementById('mensagem');

/* Guarda: os elementos #dias/#horas/#minutos/#segundos NÃO existem em
   nenhuma página (conferido por grep no index, no cert/ e nos nove
   pedido-registrado/) — este contador é órfão, distinto do da tarja
   (#diasPromo, no index.html, que a regra 5 protege). Sem a guarda,
   diasEl é null e o innerText lançava TypeError na carga e a cada tick.
   A lógica do contador não muda: se um dia os elementos voltarem ao HTML,
   ele volta a rodar sozinho. */
const contadorPresente = !!(diasEl && horasEl && minutosEl && segundosEl);

function atualizarContagem() {
  const agora = new Date();
  const diferenca = dataFinal - agora;

  if (diferenca <= 0) {
    clearInterval(intervalo);
    diasEl.innerText = "00";
    horasEl.innerText = "00";
    minutosEl.innerText = "00";
    segundosEl.innerText = "00";
    // mensagemEl.innerText = "Tempo esgotado!";
    return;
  }

  const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

  diasEl.innerText = dias.toString().padStart(2, '0');
  horasEl.innerText = horas.toString().padStart(2, '0');
  minutosEl.innerText = minutos.toString().padStart(2, '0');
  segundosEl.innerText = segundos.toString().padStart(2, '0');
}

const intervalo = contadorPresente ? setInterval(atualizarContagem, 1000) : null;
if (contadorPresente) atualizarContagem(); // Inicializa já com os valores corretos

/* Bloco da .tarjaTimerNav — a tarja foi removida do HTML.
   Tinha proteção `if (!tarja || !nav || !header) return` então não dava erro,
   mas era código morto sendo carregado à toa. Mantido comentado pra reversão fácil. */
/*
document.addEventListener("DOMContentLoaded", () => {
  const tarja = document.querySelector(".tarjaTimerNav");
  const nav = document.querySelector("#navigation");
  const header = document.querySelector("#home");

  if (!tarja || !nav || !header) return;

  // Após 3 segundos, ativa a tarja e mantém fixa
  setTimeout(() => {
    tarja.classList.add("active");
    nav.classList.add("activeTarja");
    header.classList.add("activeTarjaHome");
  }, 3000);
});
*/