/* /script/blackPlanos.js
   Sincroniza TODAS as sections .planos (normal e BIT) e alterna o texto
   descritivo na section normal (não .bit) conforme o modo.
*/

(function () {
  const DATA_URL = "/script/planos.json";
  const DEFAULT_MODE = "60dias";
  const VALID_MODES = ["30dias", "60dias", "reinicio"];

  let currentMode = DEFAULT_MODE;
  let cache = null;

  const sections = Array.from(document.querySelectorAll('section.planos'));
  if (!sections.length) return;

  const allButtons = [];
  const allCards = [];
  sections.forEach(sec => {
    const btns = Array.from(sec.querySelectorAll('.botoes button'));
    const cards = Array.from(sec.querySelectorAll('.card[data-plan]'));
    allButtons.push(...btns);
    allCards.push(...cards);

    // assegura data-mode se faltar
    btns.forEach(btn => {
      if (!btn.dataset.mode) {
        const txt = (btn.textContent || "").toLowerCase();
        if (txt.includes("reinício") || txt.includes("reinicio")) btn.dataset.mode = "reinicio";
        else if (txt.includes("30")) btn.dataset.mode = "30dias";
        else btn.dataset.mode = "60dias";
      }
    });
  });

  // visual inicial (base no DEFAULT_MODE)
  setButtonsVisual(DEFAULT_MODE);
  updateModeTexts(DEFAULT_MODE); // mostra o texto correto já no load

  // listeners: qualquer botão muda o modo global
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
    updateModeTexts(mode);              // <<< alterna os textos
    await applyModeToCards(mode);
    // analytics (opcional)
    try {
      if (typeof fbq === "function") fbq('trackCustom', 'SelectPlanMode', { mode });
      if (typeof gtag === "function") gtag('event', 'select_plan_mode', { mode });
      window.dispatchEvent(new CustomEvent('zero7:planModeChanged', { detail: { mode } }));
    } catch (_) {}
  }

  function setButtonsVisual(mode) {
    allButtons.forEach(b => b.classList.toggle('selecionado', b.dataset.mode === mode));
  }

  // === NOVO: alterna os textos na section normal (não .bit) ===
  function updateModeTexts(mode) {
    const containers = document.querySelectorAll('section.planos:not(.bit) .textBotoes');
    containers.forEach(ct => {
      const ps = Array.from(ct.querySelectorAll('p'));
      ps.forEach(p => {
        const show = p.classList.contains(mode); // classes: "30dias", "60dias", "reinicio"
        // evita seletor CSS com classe iniciando por número
        p.classList.toggle('is-active', show);
        // se não usar o CSS sugerido, ainda assim funcionará:
        p.style.display = show ? '' : 'none';
      });
    });
  }
  // ============================================================

  async function loadData() {
    if (cache) return cache;
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("Falha ao carregar planos.json");
    cache = await res.json();
    return cache;
  }

  async function applyModeToCards(mode) {
    const db = await loadData();
    const table = db[mode];
    if (!table) return;

    allCards.forEach(card => {
      const key = (card.dataset.plan || "").toLowerCase(); // trainee | bit_trainee ...
      const cfg = table[key];
      if (!cfg) return;

      const maxEl = card.querySelector('.js-max-dias');
      if (maxEl && typeof cfg.maxDias !== "undefined") maxEl.textContent = String(cfg.maxDias);

      const parcelEl = card.querySelector('.js-price-parcel');
      if (parcelEl && cfg.parcel) {
        const val = String(cfg.parcel).replace(/^12x\s*/i, "");
        parcelEl.innerHTML = `<span>12x</span> ${escapeHTML(val)}`;
      }

      const avistaEl = card.querySelector('.js-price-avista');
      if (avistaEl && cfg.avista) {
        const val = String(cfg.avista).replace(/^ou\s*/i, "").replace(/\s*à vista$/i, "");
        avistaEl.innerHTML = `<span>ou</span> ${escapeHTML(val)} <span>à vista</span>`;
      }

      const link = card.querySelector('.js-checkout');
      if (link && cfg.checkout) link.setAttribute('href', cfg.checkout);
    });
  }

  function escapeHTML(s) {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  // inicia
  setMode(DEFAULT_MODE).catch(console.error);
})();
