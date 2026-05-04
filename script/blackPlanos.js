/* /script/blackPlanos.js — V4 (três modos: 30dias | 60dias | reinicio) */

(function () {
  const DATA_URL = "./script/planos.json?v=435345213123qwdfwefwe";
  const DEFAULT_MODE = "60dias";
  const VALID_MODES = ["30dias", "60dias", "reinicio"];

  let currentMode = DEFAULT_MODE;
  let cache = null;

  const sections = Array.from(document.querySelectorAll("section.planos"));
  if (!sections.length) return;

  const allButtons = [];
  const allCards = [];
  sections.forEach(sec => {
    const btns = Array.from(sec.querySelectorAll(".botoes button"));
    const cards = Array.from(sec.querySelectorAll(".card[data-plan]"));
    allButtons.push(...btns);
    allCards.push(...cards);

    // assegura data-mode (fallback caso o HTML venha sem)
    btns.forEach(btn => {
      if (!btn.dataset.mode) {
        const txt = (btn.textContent || "").toLowerCase();
        if (txt.includes("rein")) btn.dataset.mode = "reinicio";
        else if (txt.includes("30")) btn.dataset.mode = "30dias";
        else btn.dataset.mode = "60dias";
      }
    });
  });

  setButtonsVisual(DEFAULT_MODE);
  updateModeTexts(DEFAULT_MODE);

  allButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if (!VALID_MODES.includes(mode)) return;
      setMode(mode).catch(console.error);
    });
  });

  async function setMode(mode) {
    currentMode = mode;
    setButtonsVisual(mode);
    updateModeTexts(mode);
    await applyModeToCards(mode);

    try {
      if (typeof fbq === "function") fbq("trackCustom", "SelectPlanMode", { mode });
      if (typeof gtag === "function") gtag("event", "select_plan_mode", { mode });
      window.dispatchEvent(new CustomEvent("zero7:planModeChanged", { detail: { mode } }));
    } catch (_) {}
  }

  function setButtonsVisual(mode) {
    allButtons.forEach(b => {
      b.classList.toggle("selecionado", b.dataset.mode === mode);
      b.setAttribute("aria-pressed", b.dataset.mode === mode ? "true" : "false");
    });
  }

  // Só troca textos na primeira seção (não .bit), igual antes
  function updateModeTexts(mode) {
    const containers = document.querySelectorAll("section.planos:not(.bit) .textBotoes");
    containers.forEach(ct => {
      const ps = Array.from(ct.querySelectorAll("p"));
      ps.forEach(p => {
        const show = p.classList.contains("mode-" + mode);
        p.classList.toggle("is-active", show);
        p.style.display = show ? "" : "none";
      });
    });
  }

  async function loadData() {
    if (cache) return cache;
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("Falha ao carregar planos.json");
    cache = await res.json();
    return cache;
  }

  // efeito antigo -> só no "Máximo de dias"
  function flashMaxDias(el) {
    if (!el) return;
    el.classList.remove("flash-change");
    el.offsetHeight; // reflow
    el.classList.add("flash-change");
    setTimeout(() => el.classList.remove("flash-change"), 700);
  }

  // efeito suave -> preços
  function flashPreco(el) {
    if (!el) return;
    el.classList.add("flash-base");
    el.classList.remove("flash-active");
    el.offsetHeight; // reflow
    el.classList.add("flash-active");
    setTimeout(() => el.classList.remove("flash-active"), 400);
  }

  async function applyModeToCards(mode) {
    const db = await loadData();
    const table = db[mode];
    if (!table) return;

    allCards.forEach(card => {
      const key = (card.dataset.plan || "").toLowerCase(); // trainee, junior, bit_trainee...
      const cfg = table[key];
      if (!cfg) return;

      // OLD PRICE -> atualiza só o valor do span
      const oldPriceEl = card.querySelector(".js-old-price");
      if (oldPriceEl && cfg.oldPrice) {
        const newOld = String(cfg.oldPrice);
        if (oldPriceEl.textContent !== newOld) {
          oldPriceEl.textContent = newOld;
          flashPreco(oldPriceEl);
        }
      }

      // MAX DIAS
      const maxEl = card.querySelector(".js-max-dias");
      if (maxEl && typeof cfg.maxDias !== "undefined") {
        const newMax = String(cfg.maxDias);
        if (maxEl.textContent !== newMax) {
          maxEl.textContent = newMax;
          flashMaxDias(maxEl);
        }
      }

      // PREÇO PARCELADO
      const parcelEl = card.querySelector(".js-price-parcel");
      if (parcelEl && cfg.parcel) {
        const newParcelVal = (() => {
          const val = String(cfg.parcel).replace(/^12x\s*/i, "");
          return `<span>12x</span> ${escapeHTML(val)}`;
        })();
        if (parcelEl.innerHTML !== newParcelVal) {
          parcelEl.innerHTML = newParcelVal;
          flashPreco(parcelEl);
        }
      }

      // PREÇO À VISTA
      const avistaEl = card.querySelector(".js-price-avista");
      if (avistaEl && cfg.avista) {
        const cleaned = String(cfg.avista).replace(/^ou\s*/i, "").replace(/\s*à vista$/i, "");
        const newAvistaVal = `<span>ou</span> ${escapeHTML(cleaned)} <span>à vista</span>`;
        if (avistaEl.innerHTML !== newAvistaVal) {
          avistaEl.innerHTML = newAvistaVal;
          flashPreco(avistaEl);
        }
      }

      // CHECKOUT
      const link = card.querySelector(".js-checkout");
      if (link && cfg.checkout) {
        const newHref = cfg.checkout;
        if (link.getAttribute("href") !== newHref) {
          link.setAttribute("href", newHref);
        }
      }
    });
  }

  function escapeHTML(s) {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  // inicia no modo padrão
  setMode(DEFAULT_MODE).catch(console.error);
})();