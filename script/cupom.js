/* Cupom da seção #plan (css/cupom.css, markup de scripts/lib/cupom.mjs).
   - Entrada na primeira vez que o cupom aparece (data-anim="entrou"); o
     "pendente" já foi marcado inline, antes da primeira pintura.
   - Loop de 7 s (data-loop) depois que o subtítulo assenta, rodando só com o
     cupom na tela E a aba visível (senão .cupom-z7--pausado).
   - Movimento reduzido ou sem IntersectionObserver: nada roda, o cupom fica
     estático (o inline também não marca "pendente"). */
(function () {
  "use strict";

  var cupom = document.querySelector("[data-cupom]");
  if (!cupom) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    cupom.removeAttribute("data-anim");
    return;
  }

  var visivel = false;
  var primeira = true;

  function estado() {
    cupom.classList.toggle("cupom-z7--pausado", !(visivel && !document.hidden));
  }

  function entrar() {
    cupom.setAttribute("data-anim", "entrou");
    // 0,3 s de atraso + 0,55 s do subtítulo
    setTimeout(function () { cupom.setAttribute("data-loop", ""); }, 850);
  }

  new IntersectionObserver(function (entradas) {
    visivel = entradas[0].isIntersecting;
    if (visivel && primeira) {
      primeira = false;
      entrar();
    }
    estado();
  }, { threshold: 0.35 }).observe(cupom);

  document.addEventListener("visibilitychange", estado);
})();
