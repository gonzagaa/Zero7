/* /script/planosAtivo.js — alterna o ativo da dobra unificada de planos
   (Mini Índice/Dólar × Contrato Futuro de Bitcoin).

   Roda depois de global.js (que instancia os Swipers) e de blackPlanos.js
   (que monta os botões de modo e preenche os cards). */

(function () {
  const secao = document.getElementById("plan");
  if (!secao) return;

  const seg = secao.querySelector(".seg--ativo");
  const blob = seg && seg.querySelector(".seg__blob");
  const opcoes = seg ? Array.from(seg.querySelectorAll(".seg__option[data-asset]")) : [];
  const titulo = secao.querySelector(".js-plan-title");
  if (!seg || opcoes.length < 2) return;

  const ATIVOS = {
    indice: {
      bloco: ".plano-asset--indice",
      titulo: "Mini índice / Dólar",
      classes: ["tema"],
      swiper: () => window.swiper4
    },
    bitcoin: {
      bloco: ".plano-asset--bit",
      titulo: "Contrato Futuro de Bitcoin",
      classes: ["white", "bit"],
      swiper: () => window.swiper11
    }
  };

  const CLASSES_TEMA = ["tema", "white", "bit"];
  const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let atual = null;

  /* ---------------- blob deslizante ---------------- */
  function posicionarBlob() {
    if (!blob) return;
    const ativo = seg.querySelector(".seg__option.selecionado");
    if (!ativo) return;

    const rSeg = seg.getBoundingClientRect();
    const rOpt = ativo.getBoundingClientRect();
    if (!rOpt.width) return;

    // rOpt.left - rSeg.left é medido a partir da borda; o blob é
    // posicionado a partir da caixa de padding, daí o clientLeft.
    const x = rOpt.left - rSeg.left - seg.clientLeft;

    blob.style.transform = `translate3d(${x}px, 0, 0)`;
    blob.style.width = `${rOpt.width}px`;
  }

  // reposiciona sem animar (troca de breakpoint, fontes carregando, etc.)
  function reposicionarSemAnimar() {
    const pronto = seg.dataset.ready;
    seg.dataset.ready = "false";
    posicionarBlob();
    requestAnimationFrame(() => {
      if (pronto) seg.dataset.ready = pronto;
    });
  }

  /* ---------------- título ---------------- */
  function trocarTitulo(texto) {
    if (!titulo || titulo.textContent.trim() === texto) return;

    if (semMovimento) {
      titulo.textContent = texto;
      return;
    }

    titulo.classList.add("is-swapping");
    setTimeout(() => {
      titulo.textContent = texto;
      titulo.classList.remove("is-swapping");
    }, 180);
  }

  /* ---------------- swiper ---------------- */
  // Swiper mede errado enquanto o container está display:none — ao exibir,
  // é preciso remedir antes que o usuário interaja com o carrossel.
  function atualizarSwiper(sw) {
    if (!sw || sw.destroyed) return;
    requestAnimationFrame(() => {
      try {
        sw.update();
        if (sw.params && sw.params.loop && typeof sw.loopFix === "function") {
          sw.loopFix();
        }
      } catch (_) {}
    });
  }

  /* ---------------- troca de ativo ---------------- */
  function setAtivo(id, opts) {
    const cfg = ATIVOS[id];
    if (!cfg) return;
    if (id === atual) {
      posicionarBlob();
      return;
    }

    const focar = !!(opts && opts.focar);
    const noInit = !!(opts && opts.init);
    atual = id;

    opcoes.forEach(btn => {
      const ligado = btn.dataset.asset === id;
      btn.classList.toggle("selecionado", ligado);
      btn.setAttribute("aria-checked", ligado ? "true" : "false");
      btn.tabIndex = ligado ? 0 : -1;
      if (ligado && focar) btn.focus();
    });

    secao.dataset.asset = id;
    CLASSES_TEMA.forEach(c => secao.classList.remove(c));
    cfg.classes.forEach(c => secao.classList.add(c));

    trocarTitulo(cfg.titulo);

    Object.keys(ATIVOS).forEach(key => {
      const bloco = secao.querySelector(ATIVOS[key].bloco);
      if (!bloco) return;
      bloco.hidden = key !== id;
      // O AOS não observa elementos escondidos: ao exibir o bloco, marca a
      // entrada como já animada para o conteúdo não ficar em opacity 0.
      // No init não mexemos — o bloco inicial ainda deve entrar pelo scroll.
      if (key === id && !noInit) {
        bloco.querySelectorAll("[data-aos]").forEach(el => el.classList.add("aos-animate"));
      }
    });

    posicionarBlob();
    atualizarSwiper(cfg.swiper());

    try {
      if (typeof fbq === "function") fbq("trackCustom", "SelectPlanAsset", { asset: id });
      if (typeof gtag === "function") gtag("event", "select_plan_asset", { asset: id });
      window.dispatchEvent(new CustomEvent("zero7:planAssetChanged", { detail: { asset: id } }));
    } catch (_) {}
  }

  /* ---------------- eventos ---------------- */
  opcoes.forEach(btn => {
    btn.addEventListener("click", () => setAtivo(btn.dataset.asset));
  });

  seg.addEventListener("keydown", ev => {
    const idx = opcoes.indexOf(document.activeElement);
    if (idx === -1) return;

    let alvo = null;
    if (ev.key === "ArrowRight" || ev.key === "ArrowDown") alvo = (idx + 1) % opcoes.length;
    else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") alvo = (idx - 1 + opcoes.length) % opcoes.length;
    else if (ev.key === "Home") alvo = 0;
    else if (ev.key === "End") alvo = opcoes.length - 1;
    else return;

    ev.preventDefault();
    setAtivo(opcoes[alvo].dataset.asset, { focar: true });
  });

  let rafResize = null;
  window.addEventListener("resize", () => {
    if (rafResize) cancelAnimationFrame(rafResize);
    rafResize = requestAnimationFrame(reposicionarSemAnimar);
  });

  // a troca de modo (30/60/reinício) muda a altura dos cards e pode
  // mudar a largura do seg em telas estreitas
  window.addEventListener("zero7:planModeChanged", () => {
    posicionarBlob();
    atualizarSwiper(window.swiper4);
    atualizarSwiper(window.swiper11);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(reposicionarSemAnimar).catch(() => {});
  }

  /* ---------------- init ----------------
     Síncrono: os dois blocos nascem visíveis para o Swiper conseguir medir
     os slides em global.js; aqui escondemos o inativo antes do primeiro
     paint, então não há flash. */
  const param = new URLSearchParams(window.location.search).get("ativo");
  const inicial = ATIVOS[param] ? param : "indice";

  setAtivo(inicial, { init: true });

  requestAnimationFrame(() => {
    posicionarBlob();
    seg.dataset.ready = "true";
  });
})();
