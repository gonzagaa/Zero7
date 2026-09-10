/* /script/limiteAlta.js — entrada animada do "Limite de perda total" que
   aumentou (estilos e estados em css/limiteAlta.css).

   Cada .limite-alta__valor traz no HTML o valor NOVO e, em data-de, o antigo.
   Aqui o card começa mostrando o antigo; quando entra na tela, dá uma
   piscada vermelha e o número sobe até o novo, que fica verde com a seta ▲.
   Sem JS, com movimento reduzido ou sem IntersectionObserver, nada muda:
   o HTML já está no estado final. */

(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  const ESPERA = 900;  // ms mostrando o valor antigo (dá tempo do AOS terminar)
  const QUEDA = 450;   // ms da piscada vermelha
  const SUBIDA = 1400; // ms da contagem até o valor novo

  const fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const emReais = v => "R$ " + fmt.format(v);
  const paraNumero = txt => Number(String(txt).replace(/[^\d,]/g, "").replace(",", "."));
  const suave = t => 1 - Math.pow(1 - t, 3); // easeOutCubic: arranca rápido e freia no alvo

  const itens = new Map();

  document.querySelectorAll(".limite-alta").forEach(caixa => {
    const el = caixa.querySelector(".limite-alta__valor");
    if (!el) return;

    const de = paraNumero(el.dataset.de);
    const para = paraNumero(el.textContent);
    if (!(para > de)) return; // sem data-de válido: fica no estado final

    el.textContent = emReais(de);
    caixa.classList.add("is-antigo");
    itens.set(caixa, { el, de, para });
  });

  if (!itens.size) return;

  function trocarEstado(caixa, estado) {
    caixa.classList.remove("is-antigo", "is-queda", "is-subindo", "is-alta");
    caixa.classList.add(estado);
  }

  function animar(caixa) {
    const { el, de, para } = itens.get(caixa);

    setTimeout(() => {
      trocarEstado(caixa, "is-queda");

      setTimeout(() => {
        trocarEstado(caixa, "is-subindo");
        let inicio;

        requestAnimationFrame(function passo(agora) {
          if (inicio === undefined) inicio = agora;
          const t = Math.min(1, (agora - inicio) / SUBIDA);
          el.textContent = emReais(de + (para - de) * suave(t));
          if (t < 1) return requestAnimationFrame(passo);
          trocarEstado(caixa, "is-alta");
        });
      }, QUEDA);
    }, ESPERA);
  }

  // Cada card anima quando aparece de verdade — inclusive os que só entram
  // arrastando o carrossel ou trocando para a aba do Bitcoin.
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;
      observador.unobserve(entrada.target);
      animar(entrada.target);
    });
  }, { threshold: 0.6 });

  itens.forEach((_, caixa) => observador.observe(caixa));
})();
