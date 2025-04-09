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
      duration: 1200,
  }
);

const words = ["acessível", "seguro", "lucrativo"];
let index = 0;

const wordEl = document.querySelector(".reveal-word");

function animateSwitch() {
  const tl = gsap.timeline();

  // anima saída
  tl.to(wordEl, {
    duration: 0.3,
    opacity: 0,
    filter: "blur(4px)",
    scale: 0.95,
    y: -10,
    ease: "power2.inOut",
    onComplete: () => {
      index = (index + 1) % words.length;
      wordEl.textContent = words[index];
    }
  });

  // anima entrada
  tl.to(wordEl, {
    duration: 0.6,
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    y: 0,
    ease: "power2.out"
  });
}

setInterval(animateSwitch, 2000);

gsap.registerPlugin(ScrollTrigger);

// Animação da linha de progresso
gsap.to(".line-progress", {
  scrollTrigger: {
    trigger: ".timeline",
    start: "top center",
    end: "bottom center",
    scrub: true,
  },
  height: "100%",
  ease: "none"
});

// Ativa bolinhas conforme o scroll
gsap.utils.toArray(".step").forEach(step => {
  const circle = step.querySelector(".circle");

  ScrollTrigger.create({
    trigger: step,
    start: "top center+=20",
    onEnter: () => circle.classList.add("active"),
    onLeaveBack: () => circle.classList.remove("active")
  });
});

// Aparecer os textos se quiser manter a animação original dos conteúdos
gsap.utils.toArray(".contentStep").forEach(content => {
  gsap.to(content, {
    scrollTrigger: {
      trigger: content,
      start: "top 80%",
      toggleActions: "play none none reverse"
    },
    opacity: 1,
    y: 0,
    duration: 1,
    ease: "power2.out"
  });
});

const larguraDaTela = window.innerWidth

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
