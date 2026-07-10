/* =========================================
   MODAL INDICAÇÃO — GERAR MEU LINK
   Abre pelos botões .z7-btnx--laranja
   Etapa 1: regulamento -> Etapa 2: e-mail -> link
   ========================================= */
(function () {
  "use strict";

  const modal = document.getElementById("modalIndicacao");
  if (!modal) return;

  const stepRegulamento = modal.querySelector('[data-step="1"]');
  const stepLink = modal.querySelector('[data-step="2"]');
  const doc = modal.querySelector(".modal-indicacao__doc");
  const btnAvancar = modal.querySelector(".js-indicacao-avancar");
  const form = modal.querySelector(".js-indicacao-form");
  const inputEmail = modal.querySelector(".js-indicacao-email");
  const erro = modal.querySelector(".js-indicacao-erro");
  const resultado = modal.querySelector(".js-indicacao-resultado");
  const inputLink = modal.querySelector(".js-indicacao-link");
  const btnCopiar = modal.querySelector(".js-indicacao-copiar");

  let copiadoTimer = null;

  function abrir(e) {
    if (e) e.preventDefault();

    // sempre começa do regulamento, com tudo zerado
    stepRegulamento.hidden = false;
    stepLink.hidden = true;
    form.hidden = false;
    resultado.hidden = true;
    erro.hidden = true;
    inputEmail.value = "";
    if (doc) doc.scrollTop = 0;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("modal-indicacao-aberto");
    if (window.lenis) window.lenis.stop();
  }

  function fechar() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("modal-indicacao-aberto");
    if (window.lenis) window.lenis.start();
  }

  // os dois botões laranja (seção indicação + topo dos planos) abrem o modal
  document.querySelectorAll(".z7-btnx--laranja").forEach(function (btn) {
    btn.addEventListener("click", abrir);
  });

  modal.querySelectorAll("[data-indicacao-close]").forEach(function (el) {
    el.addEventListener("click", fechar);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) fechar();
  });

  // etapa 1 -> etapa 2
  btnAvancar.addEventListener("click", function () {
    stepRegulamento.hidden = true;
    stepLink.hidden = false;
    inputEmail.focus();
  });

  // confirma o e-mail e gera o link
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = inputEmail.value.trim().toLowerCase();
    const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!valido) {
      erro.hidden = false;
      inputEmail.focus();
      return;
    }

    erro.hidden = true;
    inputLink.value = "https://zero7.com.br/home/?promoter=" + email;

    form.hidden = true;
    resultado.hidden = false;

    inputLink.focus();
    inputLink.select();
  });

  // copiar o link
  btnCopiar.addEventListener("click", function () {
    const texto = inputLink.value;

    function feedback(ok) {
      btnCopiar.textContent = ok ? "Copiado!" : "Copie manualmente";
      clearTimeout(copiadoTimer);
      copiadoTimer = setTimeout(function () {
        btnCopiar.textContent = "Copiar";
      }, 2200);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(
        function () { feedback(true); },
        function () {
          inputLink.select();
          feedback(document.execCommand("copy"));
        }
      );
    } else {
      inputLink.select();
      feedback(document.execCommand("copy"));
    }
  });
})();
