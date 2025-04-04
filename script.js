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
    duration: 0.4,
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

setInterval(animateSwitch, 3000);




