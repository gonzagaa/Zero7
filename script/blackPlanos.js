/* /script/blackPlanos.js — V4 (três modos: 30dias | 60dias | reinicio) */

(function () {
  const DATA_URL = "./script/planos.json?v=v18-cachebust-jun23";

  let currentMode = null;
  let cache = null;
  let activeModeIds = [];
  let allButtons = [];

  const sections = Array.from(document.querySelectorAll("section.planos"));
  if (!sections.length) return;

  const buttonContainers = [];
  const modeUiElements = [];
  const allCards = [];
  sections.forEach(sec => {
    const containers = Array.from(sec.querySelectorAll(".botoes"));
    const headings = Array.from(sec.querySelectorAll(".js-plan-mode-heading"));
    const descriptions = Array.from(sec.querySelectorAll(".js-plan-mode-description"));
    const cards = Array.from(sec.querySelectorAll(".card[data-plan]"));
    buttonContainers.push(...containers);
    modeUiElements.push(...containers, ...headings, ...descriptions);
    allCards.push(...cards);
  });

  async function init() {
    const db = await loadData();
    const config = db?.config || {};
    const activeModes = getActiveModes(config);

    if (!activeModes.length) {
      throw new Error("Nenhum modo ativo encontrado em config.modes no planos.json");
    }

    activeModeIds = activeModes.map(mode => mode.id);
    renderModeButtons(activeModes, config.hideButtonsWhenSingleMode === true);

    const defaultMode = activeModeIds.includes(config.defaultMode)
      ? config.defaultMode
      : activeModes[0].id;

    await setMode(defaultMode);
  }

  function getActiveModes(config) {
    if (!Array.isArray(config.modes)) return [];

    return config.modes
      .filter(mode => mode && mode.active === true && mode.id)
      .map(mode => ({
        id: String(mode.id),
        label: mode.label ? String(mode.label) : String(mode.id)
      }));
  }

  function renderModeButtons(activeModes, hideButtonsWhenSingleMode) {
    allButtons = [];
    const shouldHideModeUi = activeModes.length === 1 && hideButtonsWhenSingleMode;

    modeUiElements.forEach(el => setElementVisible(el, !shouldHideModeUi));

    buttonContainers.forEach(container => {
      container.innerHTML = "";

      if (shouldHideModeUi) return;

      activeModes.forEach(mode => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.mode = mode.id;
        btn.textContent = mode.label;
        btn.setAttribute("aria-pressed", "false");
        btn.addEventListener("click", () => {
          if (!activeModeIds.includes(mode.id)) return;
          setMode(mode.id).catch(console.error);
        });

        container.appendChild(btn);
        allButtons.push(btn);
      });
    });
  }

  function setElementVisible(el, isVisible) {
    el.hidden = !isVisible;
    el.style.display = isVisible ? "" : "none";
  }

  async function setMode(mode) {
    if (!activeModeIds.includes(mode)) return;

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
    if (!table) {
      console.warn(`[blackPlanos] Modo ativo sem dados em planos.json: ${mode}`);
      return;
    }

    allCards.forEach(card => {
      const key = (card.dataset.plan || "").toLowerCase(); // trainee, junior, bit_trainee...
      const cfg = table[key];
      if (!cfg) {
        console.warn(`[blackPlanos] Card sem dados para o modo "${mode}": ${key}`);
        return;
      }

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
        link.classList.add("link4selet");
        const newHref = withCurrentQueryParams(cfg.checkout);
        if (link.getAttribute("href") !== newHref) {
          link.setAttribute("href", newHref);
        }
      }
    });
  }

  function escapeHTML(s) {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function withCurrentQueryParams(href) {
    const params = window.location.search.substring(1);
    if (!params) return href;

    return href + (href.includes("?") ? "&" : "?") + params;
  }

  // inicia no modo padrão
  init().catch(console.error);
})();
