// Mede a home local nas mesmas 7 larguras do shots.mjs e escreve uma tabela
// markdown em medidas/<rótulo>.md (e no stdout).
//
//   node scripts/medir.mjs baseline
//
// Só lê a página. Nada aqui altera o site.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from './lib/servidor.mjs';
import { LARGURAS, prepararPagina } from './lib/pagina.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rotulo = process.argv[2] ?? 'baseline';

// ── O que é medido dentro da página ─────────────────────────────────────────
function medir() {
  const cs = (el) => getComputedStyle(el);
  const visivel = (el) => el.getClientRects().length > 0;
  const px = (v) => (v ? Number(parseFloat(v).toFixed(2)) : null);

  const raiz = px(cs(document.documentElement).fontSize);

  const h1 = [...document.querySelectorAll('h1')].find(visivel);
  const paragrafo = [...document.querySelectorAll('p')].find(
    (el) => visivel(el) && el.textContent.trim().length >= 80
  );

  // Container principal: o .wrapper do herói (mesmo componente que governa a
  // largura de todas as seções).
  const container =
    document.querySelector('#home .wrapper') ||
    [...document.querySelectorAll('.wrapper')].find(visivel);
  const larguraContainer = container
    ? Number(container.getBoundingClientRect().width.toFixed(1))
    : null;

  const raios = new Set();
  const fontes = new Set();
  const cores = new Set();
  const gaps = new Set();

  for (const el of document.querySelectorAll('*')) {
    if (!visivel(el)) continue;
    const s = cs(el);

    for (const canto of [
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomRightRadius',
      'borderBottomLeftRadius',
    ]) {
      const v = s[canto];
      if (v && v !== '0px') raios.add(v);
    }

    // font-size e cor só contam onde há texto de verdade
    const temTexto = [...el.childNodes].some(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
    );
    if (temTexto) {
      fontes.add(s.fontSize);
      cores.add(s.color);
    }

    if (/flex|grid/.test(s.display)) {
      for (const g of [s.rowGap, s.columnGap]) {
        if (g && g !== 'normal' && g !== '0px') gaps.add(g);
      }
    }
  }

  // ── Botões: assinaturas visuais ───────────────────────────────────────────
  // Conjunto fixo por seletor, para a lista ser a mesma antes e depois de uma
  // refatoração: acrescentar classes de componente não muda quem é contado.
  const SELETOR_BOTAO =
    'button, [role="button"], a.z7-btnx, a.faq__cta-link, .swiper-button-next, .swiper-button-prev';
  // Fora da conta, por serem outros componentes: o seletor segmentado
  // (role="radio"), a paginação do Swiper (desde a fase 5, os indicadores com
  // o nome do plano — são <button>, mas indicam posição), os <button> que são
  // cards da central de ajuda e os cards de depoimento (role="button" desde a
  // fase 5, para o teclado alcançar os vídeos).
  const FORA_BOTAO =
    '[role="radio"], .swiper-pagination-bullet, .faq__category-card, .faq__result-item, .faq__expanded-article, .depoimento';

  const canais = (cor) => {
    const m = /rgba?\(([^)]+)\)/.exec(cor || '');
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
  };
  const coresDoGradiente = (img) =>
    [...img.matchAll(/rgba?\([^)]+\)/g)]
      .map((m) => canais(m[0]))
      .filter((c) => c && c.a > 0.3);
  const matizDe = (lista) => {
    if (!lista.length) return 'neutro';
    const [r, g, b] = lista.reduce(
      (s, c) => [s[0] + c.rgb[0], s[1] + c.rgb[1], s[2] + c.rgb[2]],
      [0, 0, 0]
    );
    if (Math.max(r, g, b) - Math.min(r, g, b) < 40 * lista.length) return 'neutro';
    return b >= r && b >= g ? 'azul' : g >= r ? 'verde' : 'quente';
  };
  // O .z7-btnx pinta o gradiente num <span> filho, não na raiz — por isso a
  // camada __bg entra na leitura do preenchimento.
  const preenchimento = (el) => {
    const camada = el.querySelector(':scope > .z7-btnx__bg, :scope > .btn__bg');
    for (const c of [el, camada].filter(Boolean)) {
      const img = cs(c).backgroundImage;
      if (img && img.includes('gradient')) {
        return { tipo: 'gradiente', cores: coresDoGradiente(img) };
      }
    }
    const s = cs(el);
    const fundo = canais(s.backgroundColor);
    if (fundo && fundo.a >= 0.25) return { tipo: 'sólido', cores: [fundo] };
    const borda = canais(s.borderTopColor);
    if (parseFloat(s.borderTopWidth) > 0 && borda && borda.a >= 0.2) {
      return { tipo: 'contorno', cores: [borda] };
    }
    return { tipo: 'texto', cores: [canais(s.color)].filter(Boolean) };
  };
  const meioPx = (v) => `${Math.round(parseFloat(v) * 2) / 2}px`;
  const canto = (v) => (v === '0px' ? '0' : v.endsWith('%') ? v : meioPx(v));

  const botoes = [...document.querySelectorAll(SELETOR_BOTAO)]
    .filter((el) => !el.matches(FORA_BOTAO))
    .filter((el) =>
      el.checkVisibility
        ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        : visivel(el)
    )
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })
    .map((el) => {
      const s = cs(el);
      const p = preenchimento(el);
      const altura = Math.round(el.getBoundingClientRect().height);
      const cantos = [
        'borderTopLeftRadius',
        'borderTopRightRadius',
        'borderBottomRightRadius',
        'borderBottomLeftRadius',
      ]
        .map((c) => canto(s[c]))
        .join(' ');
      const familia = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      return {
        assinatura: [
          p.tipo,
          `${altura}px`,
          cantos,
          familia,
          meioPx(s.fontSize),
          s.fontWeight,
          s.textTransform,
        ].join(' · '),
        matiz: matizDe(p.cores),
        rotulo:
          (el.getAttribute('aria-label') || el.textContent || '')
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 30) || '(ícone)',
      };
    });

  return {
    raiz,
    h1: h1 ? px(cs(h1).fontSize) : null,
    paragrafo: paragrafo ? px(cs(paragrafo).fontSize) : null,
    trechoParagrafo: paragrafo ? paragrafo.textContent.trim().slice(0, 45) : null,
    larguraContainer,
    larguraJanela: window.innerWidth,
    alturaPagina: document.documentElement.scrollHeight,
    scrollX:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    excedente:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    raios: [...raios],
    fontes: [...fontes],
    cores: [...cores],
    gaps: [...gaps],
    botoes,
  };
}

// ── Coleta ──────────────────────────────────────────────────────────────────
const servidor = await iniciarServidor(RAIZ);
const navegador = await chromium.launch();
const resultados = [];

try {
  // um contexto só: a largura muda pelo viewport e a página recarrega
  const contexto = await navegador.newContext({
    viewport: { width: LARGURAS[0], height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    locale: 'pt-BR',
  });
  const page = await contexto.newPage();
  for (const largura of LARGURAS) {
    await page.setViewportSize({ width: largura, height: 900 });
    await prepararPagina(page, servidor.url);
    resultados.push({ largura, ...(await page.evaluate(medir)) });
    console.error(`  medido: ${largura}px`);
  }
  await contexto.close();
} finally {
  await navegador.close();
  await servidor.fechar();
}

// ── Relatório ───────────────────────────────────────────────────────────────
const ordenarPx = (a, b) => parseFloat(a) - parseFloat(b);
const uniao = (chave) => [...new Set(resultados.flatMap((r) => r[chave]))];

const linhas = [];
linhas.push(`# Medidas da home — \`${rotulo}\``);
linhas.push('');
linhas.push(`Gerado por \`node scripts/medir.mjs ${rotulo}\` em ${new Date().toISOString().slice(0, 10)}.`);
linhas.push('');
linhas.push('## Tipografia, container e scroll');
linhas.push('');
linhas.push('| Largura | `:root` | h1 | Parágrafo | Container | % da tela | Scroll-X | Altura da página |');
linhas.push('|---:|---:|---:|---:|---:|---:|:--:|---:|');
for (const r of resultados) {
  const pct = r.larguraContainer
    ? `${((r.larguraContainer / r.larguraJanela) * 100).toFixed(0)}%`
    : '—';
  linhas.push(
    `| ${r.largura} | ${r.raiz}px | ${r.h1 ?? '—'}px | ${r.paragrafo ?? '—'}px | ` +
      `${r.larguraContainer ?? '—'}px | ${pct} | ${r.scrollX ? `sim (+${r.excedente}px)` : 'não'} | ${r.alturaPagina}px |`
  );
}
linhas.push('');
linhas.push('## Dispersão de valores');
linhas.push('');
linhas.push('Contagem de valores **distintos** entre os elementos renderizados naquela largura.');
linhas.push('');
linhas.push('| Largura | border-radius | font-size | cor de texto | gap |');
linhas.push('|---:|---:|---:|---:|---:|');
for (const r of resultados) {
  linhas.push(
    `| ${r.largura} | ${r.raios.length} | ${r.fontes.length} | ${r.cores.length} | ${r.gaps.length} |`
  );
}
linhas.push('');
linhas.push('## Botões — assinaturas visuais');
linhas.push('');
linhas.push(
  'Assinatura = preenchimento · altura · cantos · família · corpo · peso · caixa. ' +
    'A matiz (azul/verde/…) fica fora e é contada à parte: variação de cor ' +
    'intencional é modificador nomeado, não assinatura nova.'
);
linhas.push('');
linhas.push('| Largura | botões visíveis | assinaturas | assinaturas × matiz |');
linhas.push('|---:|---:|---:|---:|');
for (const r of resultados) {
  const a = new Set(r.botoes.map((b) => b.assinatura));
  const am = new Set(r.botoes.map((b) => `${b.assinatura} | ${b.matiz}`));
  linhas.push(`| ${r.largura} | ${r.botoes.length} | ${a.size} | ${am.size} |`);
}
linhas.push('');
linhas.push('### Assinaturas encontradas');
linhas.push('');
const grupos = new Map();
for (const r of resultados) {
  const porAssinatura = new Map();
  for (const b of r.botoes) {
    const g =
      grupos.get(b.assinatura) ||
      { larguras: new Set(), matizes: new Set(), rotulos: new Set(), max: 0 };
    g.larguras.add(r.largura);
    g.matizes.add(b.matiz);
    g.rotulos.add(b.rotulo);
    grupos.set(b.assinatura, g);
    porAssinatura.set(b.assinatura, (porAssinatura.get(b.assinatura) || 0) + 1);
  }
  for (const [k, n] of porAssinatura) grupos.get(k).max = Math.max(grupos.get(k).max, n);
}
for (const [assinatura, g] of [...grupos].sort((a, b) => b[1].max - a[1].max)) {
  linhas.push(
    `- \`${assinatura}\` — até ${g.max}× por largura · matiz: ${[...g.matizes].join(', ')} · ` +
      `larguras: ${[...g.larguras].join(', ')}`
  );
  linhas.push(`  - ${[...g.rotulos].slice(0, 6).map((t) => `"${t}"`).join(', ')}`);
}
linhas.push('');
linhas.push('## Valores distintos — união das 7 larguras');
linhas.push('');
const raiosU = uniao('raios').sort(ordenarPx);
const fontesU = uniao('fontes').sort(ordenarPx);
const coresU = uniao('cores').sort();
const gapsU = uniao('gaps').sort(ordenarPx);
linhas.push(`**border-radius (${raiosU.length}):** ${raiosU.join(' · ')}`);
linhas.push('');
linhas.push(`**font-size (${fontesU.length}):** ${fontesU.join(' · ')}`);
linhas.push('');
linhas.push(`**cor de texto (${coresU.length}):** ${coresU.join(' · ')}`);
linhas.push('');
linhas.push(`**gap (${gapsU.length}):** ${gapsU.join(' · ')}`);
linhas.push('');
linhas.push('## Critérios');
linhas.push('');
linhas.push('- Só entram elementos com caixa renderizada (`getClientRects().length > 0`).');
linhas.push('- `font-size` e cor contam apenas onde o elemento tem nó de texto próprio.');
linhas.push('- `border-radius` conta os quatro cantos separadamente, ignorando `0px`.');
linhas.push('- `gap` conta `row-gap`/`column-gap` de contêineres flex/grid, ignorando `normal` e `0px`.');
linhas.push(
  '- Botões: `button`, `[role="button"]`, `a.z7-btnx`, `a.faq__cta-link` e as setas do Swiper, ' +
    'visíveis por `checkVisibility` (opacidade e `visibility` incluídas). Ficam fora o seletor ' +
    'segmentado (`role="radio"`), a paginação do Swiper (desde a fase 5, os indicadores com o ' +
    'nome do plano), os `<button>` que são cards da central de ajuda e os cards de depoimento.'
);
linhas.push('- Container principal: `#home .wrapper`.');
const trecho = resultados.find((r) => r.trechoParagrafo)?.trechoParagrafo;
if (trecho) linhas.push(`- Primeiro parágrafo longo: primeiro \`<p>\` visível com 80+ caracteres — "${trecho}…".`);
linhas.push('');

const relatorio = linhas.join('\n');
await mkdir(path.join(RAIZ, 'medidas'), { recursive: true });
await writeFile(path.join(RAIZ, 'medidas', `${rotulo}.md`), relatorio, 'utf8');
console.log(relatorio);
console.error(`\nSalvo em medidas/${rotulo}.md`);
