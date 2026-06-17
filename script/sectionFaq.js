/**
 * Central de Ajuda Zendesk — Zero7 Nacional
 * Consome API pública de https://ajuda.zero7.com.br/hc/pt-br
 */
(function () {
  'use strict';

  const ZENDESK_BASE = 'https://ajuda.zero7.com.br/api/v2/help_center';
  const LOCALE = 'pt-br';
  const PER_PAGE = 100;
  const SEARCH_DEBOUNCE_MS = 350;
  const CATEGORIES_PER_PAGE = 6;

  const state = {
    allCategories: [],
    allSections: [],
    allArticles: [],
    currentPage: 1,
    activeCategoryId: null,
    searchController: null,
  };

  const el = {};

  // ============ Fetch helpers ============

  async function fetchJSON(url, signal) {
    const res = await fetch(url, { signal, cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return res.json();
  }

  function getStickyOffset() {
    let total = 0;
    const tarja = document.querySelector('.tarjaImage');
    if (tarja) total += tarja.getBoundingClientRect().height;
    const nav = document.getElementById('navigation');
    if (nav) {
      const cs = window.getComputedStyle(nav);
      if (cs.position === 'fixed' || cs.position === 'sticky') {
        total += nav.getBoundingClientRect().height;
      }
    }
    return total + 16;
  }

  function smoothScrollTo(target, extraOffset) {
    if (!target) return;
    const extra = typeof extraOffset === 'number' ? extraOffset : 0;
    const off = -getStickyOffset() + extra;
    if (window.lenis && typeof window.lenis.scrollTo === 'function') {
      try {
        window.lenis.scrollTo(target, { offset: off, duration: 1.1 });
        return;
      } catch (e) { /* fallback abaixo */ }
    }
    try {
      const rect = target.getBoundingClientRect();
      const top = rect.top + window.pageYOffset + off;
      window.scrollTo({ top: top, behavior: 'smooth' });
    } catch (e) {
      target.scrollIntoView();
    }
  }

  async function loadAll() {
    try {
      const [catsRes, sectionsRes, articlesRes] = await Promise.all([
        fetchJSON(`${ZENDESK_BASE}/${LOCALE}/categories.json?page[size]=${PER_PAGE}`),
        fetchJSON(`${ZENDESK_BASE}/${LOCALE}/sections.json?page[size]=${PER_PAGE}`),
        fetchJSON(`${ZENDESK_BASE}/${LOCALE}/articles.json?page[size]=${PER_PAGE}`),
      ]);

      state.allCategories = catsRes.categories || [];
      state.allSections = sectionsRes.sections || [];
      state.allArticles = articlesRes.articles || [];

      state.allCategories.forEach(cat => {
        const sectionIds = state.allSections
          .filter(s => s.category_id === cat.id)
          .map(s => s.id);
        cat._articleCount = state.allArticles.filter(a => sectionIds.includes(a.section_id)).length;
      });

      renderCategoriesPage();
    } catch (err) {
      console.warn('[faq] Falha ao carregar Zendesk:', err);
      renderFallback();
    }
  }

  // ============ Renderização ============

  function renderCategoriesPage() {
    const totalPages = Math.ceil(state.allCategories.length / CATEGORIES_PER_PAGE);
    const start = (state.currentPage - 1) * CATEGORIES_PER_PAGE;
    const pageCategories = state.allCategories.slice(start, start + CATEGORIES_PER_PAGE);

    renderCategoryCards(pageCategories);
    renderPagination(totalPages);
  }

  function renderCategoryCards(categories) {
    if (categories.length === 0) {
      el.categories.innerHTML = '<p class="faq__empty">Nenhuma categoria disponível no momento.</p>';
      return;
    }

    el.categories.innerHTML = categories.map(cat => `
      <button type="button" class="faq__category-card" data-category-id="${cat.id}">
        <div class="faq__category-info">
          <span class="faq__category-name">${escapeHtml(cat.name)}</span>
          <span class="faq__category-desc">${escapeHtml(cat.description || '')}</span>
        </div>
        <span class="faq__category-count">${cat._articleCount} ${cat._articleCount === 1 ? 'artigo' : 'artigos'}</span>
        <ion-icon name="chevron-down-outline" class="faq__category-toggle"></ion-icon>
      </button>
    `).join('');

    el.categories.querySelectorAll('.faq__category-card').forEach(card => {
      card.addEventListener('click', () => {
        const catId = parseInt(card.dataset.categoryId, 10);
        toggleExpandedPanel(catId, card);
      });
    });
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      el.pagination.hidden = true;
      return;
    }
    el.pagination.hidden = false;
    el.pageCurrent.textContent = state.currentPage;
    el.pageTotal.textContent = totalPages;
    el.prev.disabled = state.currentPage === 1;
    el.next.disabled = state.currentPage === totalPages;
  }

  function renderFallback() {
    el.categories.innerHTML = `
      <div class="faq__fallback">
        <p>Não foi possível carregar a Central de Ajuda no momento.</p>
        <a href="https://ajuda.zero7.com.br/hc/pt-br" target="_blank" rel="noopener" class="faq__cta-link">
          Acessar a Central de Ajuda
          <ion-icon name="arrow-forward-outline"></ion-icon>
        </a>
      </div>
    `;
    el.pagination.hidden = true;
  }

  // ============ Painel Expandido ============

  function ensureExpandedPanel() {
    if (document.getElementById('faqExpandedPanel')) return;

    const panel = document.createElement('div');
    panel.className = 'faq__expanded-panel';
    panel.id = 'faqExpandedPanel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="faq__expanded-header">
        <h3 class="faq__expanded-title" id="faqExpandedTitle"></h3>
        <button type="button" class="faq__expanded-close" aria-label="Fechar">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>
      <div class="faq__expanded-content" id="faqExpandedContent"></div>
    `;

    el.pagination.parentNode.insertBefore(panel, el.pagination.nextSibling);

    panel.querySelector('.faq__expanded-close').addEventListener('click', () => closeExpandedPanel({ scrollBack: true }));
  }

  function toggleExpandedPanel(categoryId, cardEl) {
    if (state.activeCategoryId === categoryId) {
      closeExpandedPanel({ scrollBack: true });
      return;
    }
    openExpandedPanel(categoryId, cardEl);
  }

  function openExpandedPanel(categoryId, cardEl) {
    ensureExpandedPanel();
    const panel = document.getElementById('faqExpandedPanel');
    const content = document.getElementById('faqExpandedContent');
    const title = document.getElementById('faqExpandedTitle');

    const category = state.allCategories.find(c => c.id === categoryId);
    if (!category) return;

    el.categories.querySelectorAll('.faq__category-card.is-active').forEach(c => c.classList.remove('is-active'));
    cardEl.classList.add('is-active');

    title.textContent = category.name;

    const sections = state.allSections.filter(s => s.category_id === categoryId);
    const html = sections.map(section => {
      const articles = state.allArticles.filter(a => a.section_id === section.id);
      if (articles.length === 0) return '';

      const items = articles.map(article => `
        <li>
          <button type="button" class="faq__expanded-article" data-article-id="${article.id}">
            <span class="faq__expanded-article-title">${escapeHtml(article.title)}</span>
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </li>
      `).join('');

      return `
        <div class="faq__expanded-section">
          <span class="faq__expanded-section-name">${escapeHtml(section.name)}</span>
          <ul class="faq__expanded-articles">${items}</ul>
        </div>
      `;
    }).join('');

    if (state.activeCategoryId !== null) {
      content.classList.add('is-swapping');
      setTimeout(() => {
        content.innerHTML = html;
        attachArticleListeners(content);
        content.classList.remove('is-swapping');
        smoothScrollTo(panel);
      }, 180);
    } else {
      content.innerHTML = html;
      attachArticleListeners(content);
      panel.hidden = false;
      void panel.offsetHeight;
      panel.classList.add('is-open');
      requestAnimationFrame(() => smoothScrollTo(panel));
    }

    state.activeCategoryId = categoryId;
  }

  function attachArticleListeners(container) {
    container.querySelectorAll('.faq__expanded-article').forEach(btn => {
      btn.addEventListener('click', () => {
        const articleId = parseInt(btn.dataset.articleId, 10);
        openArticleModal(articleId);
      });
    });
  }

  function closeExpandedPanel(opts) {
    const panel = document.getElementById('faqExpandedPanel');
    if (!panel) return;
    const wasOpen = state.activeCategoryId !== null;
    panel.classList.remove('is-open');
    setTimeout(() => { panel.hidden = true; }, 300);
    el.categories.querySelectorAll('.faq__category-card.is-active').forEach(c => c.classList.remove('is-active'));
    state.activeCategoryId = null;
    if (opts && opts.scrollBack && wasOpen && el.section) {
      smoothScrollTo(el.section);
    }
  }

  // ============ Modal de artigo ============

  function openArticleModal(articleId) {
    const article = state.allArticles.find(a => a.id === articleId);
    if (!article) return;

    const section = state.allSections.find(s => s.id === article.section_id);
    const category = section ? state.allCategories.find(c => c.id === section.category_id) : null;

    el.modalBreadcrumb.textContent = `${category ? category.name + ' › ' : ''}${section ? section.name : ''}`;
    el.modalTitle.textContent = article.title;
    el.modalBody.innerHTML = article.body || '';
    el.modalSource.href = article.html_url || '#';

    el.modalBody.querySelectorAll('a').forEach(a => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    el.modal.hidden = false;
    void el.modal.offsetHeight;
    el.modal.classList.add('is-open');
    lockBodyScroll();
    document.querySelector('.faq__modal-close')?.focus();
  }

  function closeModal() {
    el.modal.classList.remove('is-open');
    unlockBodyScroll();
    setTimeout(() => { el.modal.hidden = true; }, 200);
  }

  function lockBodyScroll() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + 'px';
    }
  }

  function unlockBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  // ============ Busca ============

  let searchTimer = null;

  function onSearchInput(e) {
    const q = e.target.value.trim();
    clearTimeout(searchTimer);

    if (q.length < 2) {
      el.searchLoading.hidden = true;
      el.results.hidden = true;
      el.categories.style.display = '';
      el.pagination.style.display = '';
      closeExpandedPanel();
      return;
    }

    searchTimer = setTimeout(() => runSearch(q), SEARCH_DEBOUNCE_MS);
  }

  async function runSearch(query) {
    closeExpandedPanel();
    el.categories.style.display = 'none';
    el.pagination.style.display = 'none';
    el.results.hidden = false;
    el.searchLoading.hidden = false;

    if (state.searchController) state.searchController.abort();
    state.searchController = new AbortController();

    try {
      const url = `${ZENDESK_BASE}/articles/search.json?query=${encodeURIComponent(query)}&locale=${LOCALE}&per_page=20`;
      const data = await fetchJSON(url, state.searchController.signal);
      renderSearchResults(data.results || [], query);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[faq] Erro na busca:', err);
        el.resultsList.innerHTML = '<li class="faq__no-results">Erro ao buscar. Tente novamente.</li>';
      }
    } finally {
      el.searchLoading.hidden = true;
    }
  }

  function renderSearchResults(results, query) {
    if (results.length === 0) {
      el.resultsCount.textContent = `Nenhum resultado para "${query}"`;
      el.resultsList.innerHTML = '';
      return;
    }

    el.resultsCount.textContent = `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`;
    el.resultsList.innerHTML = results.map(r => {
      const snippet = (r.snippet || stripHtml(r.body || '').slice(0, 140)).trim();
      return `
        <li>
          <button type="button" class="faq__result-item" data-article-id="${r.id}">
            <span class="faq__result-title">${escapeHtml(r.title)}</span>
            <span class="faq__result-snippet">${escapeHtml(snippet)}</span>
          </button>
        </li>
      `;
    }).join('');

    el.resultsList.querySelectorAll('.faq__result-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.articleId, 10);
        const result = results.find(r => r.id === id);
        if (result && !state.allArticles.find(a => a.id === id)) {
          state.allArticles.push(result);
        }
        openArticleModal(id);
      });
    });
  }

  function clearSearch() {
    el.search.value = '';
    el.results.hidden = true;
    el.categories.style.display = '';
    el.pagination.style.display = '';
    state.currentPage = 1;
    renderCategoriesPage();
  }

  // ============ Paginação ============

  function goToPage(target) {
    const totalPages = Math.ceil(state.allCategories.length / CATEGORIES_PER_PAGE);
    if (target < 1 || target > totalPages) return;
    closeExpandedPanel();
    state.currentPage = target;
    renderCategoriesPage();
    document.getElementById('faq').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============ Utils ============

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // ============ Init ============

  function init() {
    el.section = document.getElementById('faq');
    el.categories = document.getElementById('faqCategories');
    el.pagination = document.getElementById('faqPagination');
    el.prev = document.getElementById('faqPrev');
    el.next = document.getElementById('faqNext');
    el.pageCurrent = document.getElementById('faqPageCurrent');
    el.pageTotal = document.getElementById('faqPageTotal');
    el.search = document.getElementById('faqSearch');
    el.searchLoading = document.querySelector('.faq__search-loading');
    el.results = document.getElementById('faqResults');
    el.resultsList = document.getElementById('faqResultsList');
    el.resultsCount = document.getElementById('faqResultsCount');
    el.clearSearch = document.getElementById('faqClearSearch');
    el.modal = document.getElementById('faqModal');
    el.modalBreadcrumb = document.getElementById('faqModalBreadcrumb');
    el.modalTitle = document.getElementById('faqModalTitle');
    el.modalBody = document.getElementById('faqModalBody');
    el.modalSource = document.getElementById('faqModalSource');

    if (!el.categories) {
      console.warn('[faq] #faqCategories não encontrado');
      return;
    }

    el.search.addEventListener('input', onSearchInput);
    el.clearSearch.addEventListener('click', clearSearch);
    el.prev.addEventListener('click', () => goToPage(state.currentPage - 1));
    el.next.addEventListener('click', () => goToPage(state.currentPage + 1));

    el.modal.querySelectorAll('[data-faq-close]').forEach(elClose => {
      elClose.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !el.modal.hidden) closeModal();
    });

    loadAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
