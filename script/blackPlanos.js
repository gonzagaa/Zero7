/* /script/blackPlanos.js
   - Sincroniza planos normais + BIT
   - Sincroniza textos de descrição ("30 dias" / "60 dias" / "Reinício")
   - Destaque visual:
       * Máximo de dias  -> efeito antigo (flash-change)
       * Preço           -> efeito suave (flash-base / flash-active)
*/

(function () {
  const DATA_URL = "/script/planos.json";
  const DEFAULT_MODE = "60dias";
  const VALID_MODES = ["30dias", "60dias", "reinicio"];

  let currentMode = DEFAULT_MODE;
  let cache = null;

  // pega TODAS as sections .planos (normais e .bit)
  const sections = Array.from(document.querySelectorAll('section.planos'));
  if (!sections.length) return;

  const allButtons = [];
  const allCards = [];
  sections.forEach(sec => {
    const btns = Array.from(sec.querySelectorAll('.botoes button'));
    const cards = Array.from(sec.querySelectorAll('.card[data-plan]'));

    allButtons.push(...btns);
    allCards.push(...cards);

    // garante data-mode se não tiver
    btns.forEach(btn => {
      if (!btn.dataset.mode) {
        const txt = (btn.textContent || "").toLowerCase();
        if (txt.includes("reinício") || txt.includes("reinicio")) {
          btn.dataset.mode = "reinicio";
        } else if (txt.includes("30")) {
          btn.dataset.mode = "30dias";
        } else {
          btn.dataset.mode = "60dias";
        }
      }
    });
  });

  // estado inicial visual
  setButtonsVisual(DEFAULT_MODE);
  updateModeTexts(DEFAULT_MODE);

  // clique em QUALQUER botão muda o modo global
  allButtons.forEach(btn => {
    btn.addEventListener('click', () => {
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

    // opcional: analytics
    try {
      if (typeof fbq === "function") {
        fbq("trackCustom", "SelectPlanMode", { mode });
      }
      if (typeof gtag === "function") {
        gtag("event", "select_plan_mode", { mode });
      }
      window.dispatchEvent(
        new CustomEvent("zero7:planModeChanged", { detail: { mode } })
      );
    } catch (_) {}
  }

  function setButtonsVisual(mode) {
    allButtons.forEach(b => {
      b.classList.toggle("selecionado", b.dataset.mode === mode);
    });
  }

  // mostra só o texto correspondente na section normal
  function updateModeTexts(mode) {
    const containers = document.querySelectorAll(
      "section.planos:not(.bit) .textBotoes"
    );

    containers.forEach(ct => {
      const ps = Array.from(ct.querySelectorAll("p"));
      ps.forEach(p => {
        const show = p.classList.contains(mode); // "30dias" | "60dias" | "reinicio"
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

  // efeito antigo (que vc gostou) -> só no "Máximo de dias"
  function flashMaxDias(el) {
    if (!el) return;

    // remove e recoloca a classe pra reiniciar a animação CSS toda vez
    el.classList.remove("flash-change");
    // força reflow pra garantir restart
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight;
    el.classList.add("flash-change");

    // opcional remover depois; mas como é keyframe com 0.6s e não depende da classe no fim,
    // tanto faz manter ou remover. vamos remover pra não acumular:
    setTimeout(() => {
      el.classList.remove("flash-change");
    }, 700);
  }

  // efeito novo suave -> só nos preços
  function flashPreco(el) {
    if (!el) return;

    // garante base com transition
    el.classList.add("flash-base");

    // reseta caso clique de novo rápido
    el.classList.remove("flash-active");
    // força reflow pra reiniciar transição
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight;

    // ativa destaque
    el.classList.add("flash-active");

    // tira o destaque depois pra voltar suave
    setTimeout(() => {
      el.classList.remove("flash-active");
    }, 400);
  }

  async function applyModeToCards(mode) {
    const db = await loadData();
    const table = db[mode];
    if (!table) return;

    allCards.forEach(card => {
      const key = (card.dataset.plan || "").toLowerCase(); // trainee, junior, bit_trainee...
      const cfg = table[key];
      if (!cfg) return;

      // MAX DIAS (efeito antigo)
      const maxEl = card.querySelector(".js-max-dias");
      if (maxEl && typeof cfg.maxDias !== "undefined") {
        const newMax = String(cfg.maxDias);
        if (maxEl.textContent !== newMax) {
          maxEl.textContent = newMax;
          flashMaxDias(maxEl); // efeito antigo aqui
        }
      }

      // PREÇO PARCELADO (efeito suave)
      const parcelEl = card.querySelector(".js-price-parcel");
      if (parcelEl && cfg.parcel) {
        const newParcelVal = (() => {
          const val = String(cfg.parcel).replace(/^12x\s*/i, "");
          return `<span>12x</span> ${escapeHTML(val)}`;
        })();

        if (parcelEl.innerHTML !== newParcelVal) {
          parcelEl.innerHTML = newParcelVal;
          flashPreco(parcelEl); // efeito novo só aqui
        }
      }

      // PREÇO À VISTA (efeito suave tbm)
      const avistaEl = card.querySelector(".js-price-avista");
      if (avistaEl && cfg.avista) {
        const cleaned = String(cfg.avista)
          .replace(/^ou\s*/i, "")
          .replace(/\s*à vista$/i, "");
        const newAvistaVal = `<span>ou</span> ${escapeHTML(
          cleaned
        )} <span>à vista</span>`;

        if (avistaEl.innerHTML !== newAvistaVal) {
          avistaEl.innerHTML = newAvistaVal;
          flashPreco(avistaEl); // efeito novo aqui tbm
        }
      }

      // LINK DO CHECKOUT (não precisa animar)
      const link = card.querySelector(".js-checkout");
      if (link && cfg.checkout) {
        const newHref = cfg.checkout;
        if (link.getAttribute("href") !== newHref) {
          link.setAttribute("href", newHref);
          // se quiser flash no botão, você poderia chamar flashPreco(link),
          // mas eu deixei sem porque pode distrair muito no CTA.
        }
      }
    });
  }

  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  // inicia no modo padrão
  setMode(DEFAULT_MODE).catch(console.error);
})();
