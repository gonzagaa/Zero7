# Medidas da home — `lote-meio`

Gerado por `node scripts/medir.mjs lote-meio` em 2026-09-25.

## Tipografia, container e scroll

| Largura | `:root` | h1 | Parágrafo | Container | % da tela | Scroll-X | Altura da página |
|---:|---:|---:|---:|---:|---:|:--:|---:|
| 320 | 8px | 21.97px | 16px | 320px | 100% | não | 11030px |
| 375 | 8px | 26.06px | 16px | 375px | 100% | não | 10702px |
| 390 | 8px | 27.17px | 16px | 390px | 100% | não | 10534px |
| 430 | 8px | 30.14px | 16px | 430px | 100% | não | 10573px |
| 768 | 8px | 32px | 16px | 768px | 100% | não | 9780px |
| 1024 | 8px | 32px | 16px | 1024px | 100% | não | 10278px |
| 1280 | 10px | 39.92px | 16px | 1120px | 88% | não | 7200px |
| 1474 | 10px | 40px | 16px | 1120px | 76% | não | 7273px |
| 1920 | 10px | 61.92px | 16px | 1456px | 76% | não | 7103px |

## Dispersão de valores

Contagem de valores **distintos** entre os elementos renderizados naquela largura.

| Largura | border-radius | font-size | cor de texto | gap |
|---:|---:|---:|---:|---:|
| 320 | 10 | 22 | 12 | 10 |
| 375 | 10 | 22 | 12 | 9 |
| 390 | 10 | 22 | 12 | 9 |
| 430 | 10 | 22 | 12 | 9 |
| 768 | 10 | 21 | 12 | 10 |
| 1024 | 10 | 21 | 12 | 10 |
| 1280 | 10 | 23 | 13 | 10 |
| 1474 | 10 | 23 | 13 | 10 |
| 1920 | 10 | 21 | 13 | 10 |

## Botões — assinaturas visuais

Assinatura = preenchimento · altura · cantos · família · corpo · peso · caixa. A matiz (azul/verde/…) fica fora e é contada à parte: variação de cor intencional é modificador nomeado, não assinatura nova.

| Largura | botões visíveis | assinaturas | assinaturas × matiz |
|---:|---:|---:|---:|
| 320 | 15 | 4 | 4 |
| 375 | 15 | 4 | 4 |
| 390 | 15 | 4 | 4 |
| 430 | 15 | 4 | 4 |
| 768 | 15 | 4 | 4 |
| 1024 | 15 | 4 | 4 |
| 1280 | 19 | 6 | 7 |
| 1474 | 19 | 6 | 7 |
| 1920 | 19 | 6 | 7 |

### Assinaturas encontradas

- `texto · 56px · 16px 0 16px 0 · NCS Radhiumz · 13px · 600 · uppercase` — até 8× por largura · matiz: neutro · larguras: 320, 375, 390, 430, 768, 1024
  - "Começar agora mesmo", "Contrate um plano", "Contratar plano Trainee", "Contratar plano Júnior", "Contratar plano Pleno", "Contratar plano Sênior"
- `texto · 70px · 20px 0 20px 0 · NCS Radhiumz · 16px · 600 · uppercase` — até 8× por largura · matiz: neutro · larguras: 1280, 1474, 1920
  - "Começar agora mesmo", "Contrate um plano", "Contratar plano Trainee", "Contratar plano Júnior", "Contratar plano Pleno", "Contratar plano Sênior"
- `texto · 44px · 16px 0 16px 0 · NCS Radhiumz · 11px · 600 · uppercase` — até 4× por largura · matiz: neutro · larguras: 320, 375, 390, 430, 768, 1024
  - "Ver Regulamento", "Entrar na comunidade oficial d"
- `texto · 54px · 20px 0 20px 0 · NCS Radhiumz · 13.5px · 600 · uppercase` — até 4× por largura · matiz: neutro · larguras: 1280, 1474, 1920
  - "Ver Regulamento", "Entrar na comunidade oficial d"
- `contorno · 54px · 20px 0 20px 0 · TT Fors Trial · 13.5px · 600 · none` — até 3× por largura · matiz: neutro, azul · larguras: 1280, 1474, 1920
  - "Previous slide", "Next slide", "Fale Conosco"
- `contorno · 44px · 16px 0 16px 0 · TT Fors Trial · 11px · 600 · none` — até 2× por largura · matiz: azul · larguras: 320, 375, 390, 430, 768, 1024
  - "Ver mais", "Fale Conosco"
- `sólido · 58px · 20px 0 20px 0 · TT Fors Trial · 16px · 400 · none` — até 2× por largura · matiz: neutro · larguras: 1280, 1474, 1920
  - "Página anterior", "Próxima página"
- `texto · 44px · 8px 0 8px 0 · TT Fors Trial · 11px · 600 · none` — até 1× por largura · matiz: azul · larguras: 320, 375, 390, 430, 768, 1024
  - "Abrir menu"
- `texto · 40px · 10px 0 10px 0 · TT Fors Trial · 14px · 600 · none` — até 1× por largura · matiz: neutro · larguras: 1280, 1474, 1920
  - "Entrar na comunidade do WhatsA"
- `gradiente · 40px · 10px 0 10px 0 · TT Fors Trial · 14px · 600 · none` — até 1× por largura · matiz: azul · larguras: 1280, 1474, 1920
  - "Acessar a Área do Trader"

## Valores distintos — união das 7 larguras

**border-radius (17):** 8px · 9px · 10px · 10.8px · 12.8px · 13.5px · 15px · 16px · 19px · 20px · 24px · 30px · 40px · 50% · 50px · 7992px · 9990px

**font-size (56):** 8.4px · 8.8px · 9.6px · 9.82px · 10px · 10.4px · 10.8px · 11px · 11.2px · 11.566px · 12px · 12.36px · 12.5px · 12.8px · 13px · 13.5px · 14px · 14.203px · 14.4px · 15px · 15.5px · 16px · 17px · 17.1707px · 17.6px · 18px · 19px · 19.2px · 20px · 20.085px · 20.5244px · 20.8px · 21.439px · 21.9748px · 22px · 22.4px · 23.296px · 23.878px · 24px · 25.728px · 26.0579px · 27.1715px · 28px · 28.8px · 30px · 30.1411px · 32px · 32.16px · 33.6px · 34px · 34.003px · 39.92px · 40px · 50px · 52px · 61.92px

**cor de texto (13):** rgb(0, 0, 0) · rgb(0, 128, 201) · rgb(0, 77, 55) · rgb(255, 255, 255) · rgb(29, 164, 243) · rgb(37, 211, 102) · rgb(7, 12, 17) · rgb(87, 255, 109) · rgba(0, 0, 0, 0) · rgba(255, 255, 255, 0.58) · rgba(255, 255, 255, 0.7) · rgba(255, 255, 255, 0.8) · rgba(255, 255, 255, 0.9)

**gap (18):** 3.2px · 4px · 5px · 6.4px · 8px · 10px · 12px · 12.8px · 15px · 15.36px · 16px · 19.2px · 20px · 24px · 30px · 32px · 40px · 80px

## Critérios

- Só entram elementos com caixa renderizada (`getClientRects().length > 0`).
- `font-size` e cor contam apenas onde o elemento tem nó de texto próprio.
- `border-radius` conta os quatro cantos separadamente, ignorando `0px`.
- `gap` conta `row-gap`/`column-gap` de contêineres flex/grid, ignorando `normal` e `0px`.
- Botões: `button`, `[role="button"]`, `a.z7-btnx`, `a.faq__cta-link` e as setas do Swiper, visíveis por `checkVisibility` (opacidade e `visibility` incluídas). Ficam fora o seletor segmentado (`role="radio"`), a paginação do Swiper (desde a fase 5, os indicadores com o nome do plano), os `<button>` que são cards da central de ajuda e os cards de depoimento.
- Container principal: `#home .wrapper`.
- Primeiro parágrafo longo: primeiro `<p>` visível com 80+ caracteres — "Uma mesa proprietária para desenvolver sua ca…".
