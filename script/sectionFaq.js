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

  const state = {
    allCategories: [],
    allSections: [],
    allArticles: [],
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

  // Movimento reduzido: as rolagens programáticas vão direto, sem animar. O
  // Lenis nem é criado nesse caso (index.html), então o caminho é o scrollTo.
  const ROLAGEM = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

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
      window.scrollTo({ top: top, behavior: ROLAGEM });
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

      renderCategories();
    } catch (err) {
      console.warn('[faq] Falha ao carregar Zendesk:', err);
      renderFallback();
    }
  }

  // ============ Renderização ============

  // Todas as categorias de uma vez (fase 10). Eram 6 por página, num corte
  // feito aqui no front: a API já entrega todas numa chamada (page[size]=100).
  function renderCategories() {
    const categories = state.allCategories;
    if (categories.length === 0) {
      el.categories.innerHTML = '<p class="faq__empty">Nenhuma categoria disponível no momento.</p>';
      return;
    }

    // O card inteiro é o controle: um <button> só, sem nada focável dentro.
    // A seta não é botão, é o sinal de que o card abre — e fica fora da
    // árvore de acessibilidade (sem o aria-hidden, o ion-icon entra no nome
    // do botão como "arrow forward outline"). As classes faq__* ficam ao
    // lado das do componente (fase 4).
    el.categories.innerHTML = categories.map(cat => `
      <button type="button" class="faq__category-card card-ajuda" data-category-id="${cat.id}" aria-expanded="false">
        <span class="faq__category-info card-ajuda__texto">
          <span class="faq__category-name card-ajuda__titulo">${escapeHtml(cat.name)}</span>
          <span class="faq__category-desc card-ajuda__descricao">${escapeHtml(cat.description || '')}</span>
        </span>
        <span class="card-ajuda__rodape">
          <span class="faq__category-count card-ajuda__contagem">${cat._articleCount} ${cat._articleCount === 1 ? 'artigo' : 'artigos'}</span>
          <ion-icon name="arrow-forward-outline" class="card-ajuda__seta" aria-hidden="true"></ion-icon>
        </span>
      </button>
    `).join('');

    el.categories.querySelectorAll('.faq__category-card').forEach(card => {
      card.addEventListener('click', () => {
        const catId = parseInt(card.dataset.categoryId, 10);
        toggleExpandedPanel(catId, card);
      });
    });

    ajustarGrade();
  }

  // ============ Expansão progressiva da grade ============
  // Em repouso a grade mostra três fileiras em qualquer largura: 4 cards no
  // celular (uma coluna — três seriam pouco para justificar o controle), 6
  // de 768 a 1199 (duas colunas) e todos de 1200 em diante (quatro), onde as
  // três fileiras já são a grade inteira e o controle nem aparece.
  //
  // Os 12 cards ficam sempre no DOM: nada é buscado depois. O que sobra sai
  // por display: none (a classe is-escondido, em sectionFaq.css), o que
  // também tira esses cards da ordem de foco e do leitor de tela. A altura
  // em repouso sai da grade, não de medida em JS depois da pintura.
  const GRADE_MD = window.matchMedia('(min-width: 768px)');
  const GRADE_LG = window.matchMedia('(min-width: 1200px)');
  const SEM_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visiveisEmRepouso = () => (GRADE_LG.matches ? Infinity : GRADE_MD.matches ? 6 : 4);
  let gradeAberta = false;

  // De 1200 em diante, onde a grade tem quatro colunas, as três fileiras
  // viravam os doze cards de uma vez. Ali entra a paginação: uma fileira
  // por página, três páginas, e o controle de expansão some — nunca os
  // dois ao mesmo tempo, em nenhuma largura.
  const POR_PAGINA = 4;
  let paginaAtual = 1;

  function montarControle() {
    if (el.mais) return el.mais;
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.id = 'faqMais';
    botao.className = 'faq__mais btn btn--md btn--secundaria';
    botao.hidden = true;
    botao.setAttribute('aria-controls', 'faqCategories');
    botao.setAttribute('aria-expanded', 'false');
    // "Ver mais" é copy pedida pelo cliente nesta rodada. O rótulo visível
    // dá o nome acessível do botão — por isso não há aria-label —, e quem
    // diz o estado é o aria-expanded: o texto não muda ao expandir, só o
    // chevron gira.
    botao.innerHTML = 'Ver mais <ion-icon name="chevron-down-outline" aria-hidden="true"></ion-icon>';
    botao.addEventListener('click', alternarGrade);
    el.categories.insertAdjacentElement('afterend', botao);
    el.mais = botao;
    return botao;
  }

  // O paginador mora na linha de controle, à direita da busca: duas setas
  // com o indicador no meio. Div com role=navigation, e não <nav>: o
  // seletor de tipo `nav` deste projeto é a barra do topo (position:
  // fixed, 100vw) e pegaria qualquer <nav> da página.
  function montarPaginador() {
    if (el.paginacao) return el.paginacao;
    const caixa = document.createElement('div');
    caixa.id = 'faqPaginacao';
    caixa.className = 'faq__paginacao';
    caixa.hidden = true;
    caixa.setAttribute('role', 'navigation');
    // rótulo do contêiner e das setas: não aparecem na tela
    caixa.setAttribute('aria-label', 'Páginas de categorias');

    const seta = (direcao, rotulo, icone) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `faq__seta faq__seta--${direcao}`;
      b.dataset.direcao = direcao;
      b.setAttribute('aria-label', rotulo);
      b.innerHTML = `<ion-icon name="${icone}" aria-hidden="true"></ion-icon>`;
      // aria-disabled, e não disabled: a seta apagada continua alcançável
      // pelo teclado, então quem navega por Tab descobre que chegou ao fim
      // em vez de ver o controle sumir da ordem de foco.
      b.addEventListener('click', () => {
        if (b.getAttribute('aria-disabled') === 'true') return;
        irParaPagina(paginaAtual + (direcao === 'anterior' ? -1 : 1), b);
      });
      return b;
    };

    el.setaAnterior = seta('anterior', 'Página anterior', 'chevron-back-outline');
    el.setaProxima = seta('proxima', 'Próxima página', 'chevron-forward-outline');

    // INDICADOR "1 / 3" — o único caractere novo na tela desta rodada.
    // Para tirar: apague este elemento e a regra .faq__contador no CSS.
    el.contador = document.createElement('span');
    el.contador.className = 'faq__contador';
    el.contador.setAttribute('aria-hidden', 'true');

    // quem anuncia a troca para o leitor de tela; só existe para ele
    el.paginacaoAviso = document.createElement('span');
    el.paginacaoAviso.className = 'faq__paginacao-aviso';
    el.paginacaoAviso.setAttribute('aria-live', 'polite');

    caixa.append(el.setaAnterior, el.contador, el.setaProxima, el.paginacaoAviso);
    el.categories.insertAdjacentElement('beforebegin', caixa);
    el.paginacao = caixa;
    return caixa;
  }

  function desenharPaginador(paginas) {
    montarPaginador();
    el.contador.textContent = `${paginaAtual} / ${paginas}`;
    el.setaAnterior.setAttribute('aria-disabled', String(paginaAtual === 1));
    el.setaProxima.setAttribute('aria-disabled', String(paginaAtual === paginas));
  }

  // Trocar de página NÃO recria botão nenhum: as setas são sempre os mesmos
  // nós, então o foco fica onde estava.
  function irParaPagina(n, botao) {
    const cards = el.categories.querySelectorAll('.faq__category-card');
    const paginas = Math.ceil(cards.length / POR_PAGINA);
    if (n < 1 || n > paginas || n === paginaAtual) return;
    paginaAtual = n;
    closeExpandedPanel();
    ajustarGrade();
    botao?.focus();
    el.paginacaoAviso.textContent = `Página ${n} de ${paginas}`;
  }

  // As três páginas precisam ter a mesma altura: sem isso a linha de
  // controle e o rodapé da seção sobem e descem a cada troca. A reserva é a
  // altura da MAIOR das páginas, medida percorrendo as três de uma vez —
  // tudo num mesmo passo síncrono, sem pintura no meio, então nada pisca.
  //
  // Medir da página que está na tela e multiplicar não serve: em 1920 as
  // fileiras de páginas diferentes têm alturas diferentes (o texto dos
  // cards muda) e o paginador descia 41px ao trocar.
  let alturaReserva = 0;

  function medirReserva(cards) {
    const paginas = Math.ceil(cards.length / POR_PAGINA);
    const escondidos = cards.map((c) => c.classList.contains('is-escondido'));
    el.categories.style.minHeight = '';
    let maior = 0;
    for (let pag = 1; pag <= paginas; pag++) {
      const primeiro = (pag - 1) * POR_PAGINA;
      cards.forEach((card, i) => card.classList.toggle('is-escondido', i < primeiro || i >= primeiro + POR_PAGINA));
      maior = Math.max(maior, el.categories.getBoundingClientRect().height);
    }
    cards.forEach((card, i) => card.classList.toggle('is-escondido', escondidos[i]));
    alturaReserva = maior;
    el.categories.style.minHeight = maior ? `${maior}px` : '';
  }

  function ajustarGrade() {
    if (!el.categories) return;
    const cards = [...el.categories.querySelectorAll('.faq__category-card')];
    const escondida = el.categories.style.display === 'none';
    const botao = montarControle();
    const paginador = montarPaginador();
    const paginando = GRADE_LG.matches && cards.length > POR_PAGINA;

    if (paginando) {
      const paginas = Math.ceil(cards.length / POR_PAGINA);
      if (paginaAtual > paginas) paginaAtual = 1;
      const primeiro = (paginaAtual - 1) * POR_PAGINA;
      cards.forEach((card, i) => card.classList.toggle('is-escondido', i < primeiro || i >= primeiro + POR_PAGINA));
      el.categories.classList.remove('is-recolhida');
      gradeAberta = false;
      botao.hidden = true;
      botao.setAttribute('aria-expanded', 'false');
      desenharPaginador(paginas);
      paginador.hidden = escondida;
      if (!alturaReserva) medirReserva(cards);
      else el.categories.style.minHeight = `${alturaReserva}px`;
    } else {
      const limite = visiveisEmRepouso();
      const sobra = cards.length > limite;
      if (!sobra) gradeAberta = false;
      const recolhida = sobra && !gradeAberta;

      cards.forEach((card, i) => card.classList.toggle('is-escondido', recolhida && i >= limite));
      el.categories.classList.toggle('is-recolhida', recolhida);
      botao.hidden = !sobra || escondida;
      botao.setAttribute('aria-expanded', String(sobra && gradeAberta));
      paginador.hidden = true;
      el.categories.style.minHeight = '';
      paginaAtual = 1;
    }

    // o painel de uma categoria que acabou de sumir fecha junto, e o foco
    // nunca fica preso num card escondido
    const ativo = el.categories.querySelector('.faq__category-card.is-active');
    if (ativo && ativo.classList.contains('is-escondido')) closeExpandedPanel();
    if (document.activeElement && document.activeElement.closest('.is-escondido')) {
      const destino = paginando ? el.paginacao.querySelector('[aria-current="page"]') : botao;
      destino?.focus();
    }
  }

  function alternarGrade() {
    const grade = el.categories;
    const antes = grade.getBoundingClientRect().height;
    gradeAberta = !gradeAberta;
    ajustarGrade();
    if (SEM_MOVIMENTO.matches) return;

    // a altura vai da atual à nova; o max-height arbitrário animaria espaço
    // vazio (o mesmo motivo do card de benefício, sectionBa.js)
    const depois = grade.getBoundingClientRect().height;
    grade.style.overflow = 'hidden';
    grade.style.height = `${antes}px`;
    void grade.offsetHeight;
    grade.style.transition = 'height var(--dur-media) var(--curva-saida)';
    grade.style.height = `${depois}px`;
    const soltar = () => {
      grade.style.transition = '';
      grade.style.height = '';
      grade.style.overflow = '';
    };
    grade.addEventListener('transitionend', soltar, { once: true });
    setTimeout(soltar, 600);
  }

  function renderFallback() {
    el.categories.innerHTML = `
      <div class="faq__fallback">
        <p>Não foi possível carregar a Central de Ajuda no momento.</p>
        <a href="https://ajuda.zero7.com.br/hc/pt-br" target="_blank" rel="noopener" class="faq__cta-link btn btn--md btn--secundaria">
          Acessar a Central de Ajuda
          <ion-icon name="arrow-forward-outline"></ion-icon>
        </a>
      </div>
    `;
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
        <button type="button" class="faq__expanded-close faq__seta" aria-label="Fechar">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>
      <div class="faq__expanded-content" id="faqExpandedContent"></div>
    `;

    const antesDoPainel = el.mais || el.categories;
    antesDoPainel.parentNode.insertBefore(panel, antesDoPainel.nextSibling);

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

    el.categories.querySelectorAll('.faq__category-card.is-active').forEach(c => {
      c.classList.remove('is-active');
      c.setAttribute('aria-expanded', 'false');
    });
    cardEl.classList.add('is-active');
    cardEl.setAttribute('aria-expanded', 'true');

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
    el.categories.querySelectorAll('.faq__category-card.is-active').forEach(c => {
      c.classList.remove('is-active');
      c.setAttribute('aria-expanded', 'false');
    });
    state.activeCategoryId = null;
    if (opts && opts.scrollBack && wasOpen && el.section) {
      smoothScrollTo(el.section);
    }
  }

  // ============ Modal de artigo ============

  // quem abriu o modal, para o foco voltar exatamente para lá ao fechar
  let quemAbriuOModal = null;

  function openArticleModal(articleId) {
    const article = state.allArticles.find(a => a.id === articleId);
    if (!article) return;

    const section = state.allSections.find(s => s.id === article.section_id);
    const category = section ? state.allCategories.find(c => c.id === section.category_id) : null;

    el.modalBreadcrumb.textContent = `${category ? category.name + ' › ' : ''}${section ? section.name : ''}`;
    el.modalTitle.textContent = article.title;
    // o h3 nasce escondido para não existir título vazio na árvore de
    // acessibilidade (SEO-13); aparece quando tem texto
    el.modalTitle.hidden = !article.title;
    el.modalBody.innerHTML = article.body || '';
    el.modalSource.href = article.html_url || '#';

    el.modalBody.querySelectorAll('a').forEach(a => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    // <dialog> nativo: showModal() põe o modal na TOP LAYER, acima de
    // qualquer z-index e de qualquer contexto de empilhamento — e foi um
    // contexto novo no #faq (mask-image, do divisor) que já deixou este
    // modal atrás da seção seguinte. Na top layer isso não volta a
    // acontecer. Vêm de graça: o fundo (::backdrop), o Esc, o aria-modal e a
    // prisão do foco — por isso o prenderFoco do global.js saiu daqui.
    quemAbriuOModal = document.activeElement;
    el.modal.showModal();
    void el.modal.offsetHeight;
    el.modal.classList.add('is-open');
    lockBodyScroll();
    el.modalClose?.focus();
  }

  function closeModal() {
    if (el.modal.open) el.modal.close();
  }

  // Um lugar só para arrumar a casa: o botão de fechar, o Esc do navegador e
  // o clique fora passam todos por aqui.
  function aoFecharModal() {
    el.modal.classList.remove('is-open');
    unlockBodyScroll();
    quemAbriuOModal?.focus();
    quemAbriuOModal = null;
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
      ajustarGrade();
      closeExpandedPanel();
      return;
    }

    searchTimer = setTimeout(() => runSearch(q), SEARCH_DEBOUNCE_MS);
  }

  async function runSearch(query) {
    closeExpandedPanel();
    el.categories.style.display = 'none';
    if (el.mais) el.mais.hidden = true;
    if (el.paginacao) el.paginacao.hidden = true;
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
          <button type="button" class="faq__result-item card-ajuda card-ajuda--compacto" data-article-id="${r.id}">
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
    ajustarGrade();
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
    el.modalClose = el.modal.querySelector('.faq__modal-close');

    if (!el.categories) {
      console.warn('[faq] #faqCategories não encontrado');
      return;
    }

    el.search.addEventListener('input', onSearchInput);
    el.clearSearch.addEventListener('click', clearSearch);
    GRADE_MD.addEventListener('change', ajustarGrade);
    GRADE_LG.addEventListener('change', ajustarGrade);

    // Redimensionar sem cruzar 768 nem 1200 não dispara os dois acima, e a
    // reserva guardada envelheceria. Ela é zerada e refeita na próxima
    // página cheia.
    let tempoResize = null;
    window.addEventListener('resize', () => {
      clearTimeout(tempoResize);
      tempoResize = setTimeout(() => {
        alturaReserva = 0;
        ajustarGrade();
      }, 150);
    }, { passive: true });

    el.modal.querySelectorAll('[data-faq-close]').forEach(elClose => {
      elClose.addEventListener('click', closeModal);
    });

    // o Esc vem do próprio <dialog>; aqui ficam só a arrumação e o clique
    // fora do painel — no <dialog> o fundo não é elemento, então clicar nele
    // é clicar no próprio dialog
    el.modal.addEventListener('close', aoFecharModal);
    el.modal.addEventListener('click', (e) => {
      if (e.target === el.modal) closeModal();
    });

    loadAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
