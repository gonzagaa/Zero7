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

 function openMenu() {
     document.body.classList.add('menu-expanded')
 }

function closeMenu() {
    document.body.classList.remove('menu-expanded')
}

AOS.init(
  {
      duration: 1200
  }
);

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
    if (nextCall) nextCall.kill();
    nextCall = gsap.delayedCall(delay, animateSwitch);
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

    // estado inicial da palavra que entra
    gsap.set(back, {
      yPercent: 110,
      opacity: 0,
      filter: "blur(14px)",
      scale: 0.985
    });

    // garante estado normal da palavra que sai
    gsap.set(front, {
      yPercent: 0,
      opacity: 1,
      filter: "blur(0px)",
      scale: 1
    });

    const tl = gsap.timeline({
      onComplete: () => {
        // swap refs
        const tmp = front;
        front = back;
        back = tmp;

        front.classList.add("is-front");
        front.classList.remove("is-back");
        back.classList.add("is-back");
        back.classList.remove("is-front");

        // prepara back (que ficou escondido) pro próximo ciclo
        gsap.set(back, { yPercent: 110, opacity: 0, filter: "blur(14px)", scale: 0.985 });

        index = nextIndex;
        scheduleNext(2.0);
      }
    });

    // SAÍDA (mais perceptível pelo blur)
    tl.to(front, {
      duration: 0.45,
      yPercent: -110,
      opacity: 0,
      filter: "blur(16px)",
      scale: 0.985,
      ease: "power3.inOut"
    }, 0);

    // ENTRADA (baixo -> cima + blur “dissolve”)
    tl.to(back, {
      duration: 0.60,
      yPercent: 0,
      opacity: 1,
      filter: "blur(0px)",
      scale: 1,
      ease: "power3.out"
    }, 0.06);

    // micro “settle” pra dar sensação de troca sem enfeite
    tl.fromTo(
      back,
      { scale: 1.015 },
      { scale: 1, duration: 0.25, ease: "power2.out" },
      0.20
    );
  }

  function start() {
    measureMaxWidth();
    scheduleNext(2.0);
    window.addEventListener("resize", gsap.utils.debounce(measureMaxWidth, 150));
  }

  // espera fontes pra medir correto
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

if (larguraDaTela < 800) {
  var swiper4 = new Swiper(".mySwiper4", {
      slidesPerView: 1,
      spaceBetween: 5,
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
  var swiper4 = new Swiper(".mySwiper4", {
      slidesPerView: 3,
      spaceBetween: 90,
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

if (larguraDaTela < 800) {
  var swiper11 = new Swiper(".mySwiper11", {
      slidesPerView: 1,
      spaceBetween: 5,
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
  var swiper11 = new Swiper(".mySwiper11", {
      slidesPerView: 2,
      spaceBetween: 30,
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

const modalGeral = document.getElementById("modalDepoimentos");
const videoContainerGeral = document.getElementById("video-container-geral");
const closeBtnGeral = document.querySelector(".close-depoimento-geral");

document.querySelectorAll(".depoimento").forEach((depoimento) => {
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
  });
});

closeBtnGeral.addEventListener("click", () => {
  modalGeral.style.display = "none";
  videoContainerGeral.innerHTML = "";
});

window.addEventListener("click", (e) => {
  if (e.target === modalGeral) {
    modalGeral.style.display = "none";
    videoContainerGeral.innerHTML = "";
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalGeral.style.display === "flex") {
    modalGeral.style.display = "none";
    videoContainerGeral.innerHTML = "";
  }
});

/* Popup overlay removido do HTML (linhas 304-311 do index.html antigo).
   Este bloco está comentado pois os elementos #popupOverlay, #popupContent e #popupClose
   não existem mais no DOM. Quando o popup voltar a ser usado, descomentar este bloco. */
/*
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("popupOverlay");
  const content = document.getElementById("popupContent");
  const closeBtn = document.getElementById("popupClose");

  // Mostrar o popup após 2s
  setTimeout(() => {
    overlay.classList.add("active");
    content.classList.add("active");
  }, 3000);

  // Fechar com botão X
  closeBtn.addEventListener("click", () => {
    closePopup();
  });

  // Fechar ao clicar fora do conteúdo (na overlay)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePopup();
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
*/


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

const intervalo = setInterval(atualizarContagem, 1000);
atualizarContagem(); // Inicializa já com os valores corretos

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