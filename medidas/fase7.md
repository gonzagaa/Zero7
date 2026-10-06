# Medidas da home — `fase7`

Gerado por `node scripts/medir.mjs fase7` em 2026-09-10.

## Tipografia, container e scroll

| Largura | `:root` | h1 | Parágrafo | Container | % da tela | Scroll-X | Altura da página |
|---:|---:|---:|---:|---:|---:|:--:|---:|
| 320 | 8px | 20px | 10.4px | 320px | 100% | não | 9813px |
| 375 | 8px | 20px | 10.4px | 375px | 100% | não | 9636px |
| 768 | 8px | 20px | 10.4px | 768px | 100% | não | 8762px |
| 1024 | 8px | 29.94px | 10.4px | 1024px | 100% | não | 9538px |
| 1280 | 8px | 39.92px | 12.8px | 1120px | 88% | não | 6003px |
| 1474 | 8px | 40px | 12.8px | 1120px | 76% | não | 6122px |
| 1920 | 10.4px | 61.92px | 16.64px | 1456px | 76% | não | 7523px |

## Dispersão de valores

Contagem de valores **distintos** entre os elementos renderizados naquela largura.

| Largura | border-radius | font-size | cor de texto | gap |
|---:|---:|---:|---:|---:|
| 320 | 12 | 23 | 11 | 7 |
| 375 | 12 | 23 | 11 | 7 |
| 768 | 12 | 24 | 11 | 8 |
| 1024 | 12 | 24 | 11 | 8 |
| 1280 | 12 | 24 | 11 | 8 |
| 1474 | 12 | 21 | 11 | 8 |
| 1920 | 12 | 23 | 11 | 9 |

## Botões — assinaturas visuais

Assinatura = preenchimento · altura · cantos · família · corpo · peso · caixa. A matiz (azul/verde/…) fica fora e é contada à parte: variação de cor intencional é modificador nomeado, não assinatura nova.

| Largura | botões visíveis | assinaturas | assinaturas × matiz |
|---:|---:|---:|---:|
| 320 | 19 | 4 | 5 |
| 375 | 19 | 4 | 5 |
| 768 | 17 | 4 | 5 |
| 1024 | 17 | 4 | 5 |
| 1280 | 20 | 4 | 7 |
| 1474 | 20 | 4 | 7 |
| 1920 | 20 | 4 | 7 |

### Assinaturas encontradas

- `gradiente · 56px · 16px 0 16px 0 · NCS Radhiumz · 13px · 600 · uppercase` — até 8× por largura · matiz: azul · larguras: 320, 375, 768, 1024, 1280, 1474
  - "Começar agora mesmo", "Contrate um plano", "Contratar plano Trainee", "Contratar plano Júnior", "Contratar plano Pleno", "Contratar plano Sênior"
- `gradiente · 73px · 21px 0 21px 0 · NCS Radhiumz · 16.5px · 600 · uppercase` — até 8× por largura · matiz: azul · larguras: 1920
  - "Começar agora mesmo", "Contrate um plano", "Contratar plano Trainee", "Contratar plano Júnior", "Contratar plano Pleno", "Contratar plano Sênior"
- `contorno · 44px · 16px 0 16px 0 · TT Fors Trial · 11px · 600 · none` — até 6× por largura · matiz: azul, neutro · larguras: 320, 375, 768, 1024, 1280, 1474
  - "Previous slide", "Next slide", "Página anterior", "Próxima página", "Acessar a Central de Ajuda com", "Fale Conosco"
- `contorno · 56px · 21px 0 21px 0 · TT Fors Trial · 14px · 600 · none` — até 6× por largura · matiz: neutro, azul · larguras: 1920
  - "Previous slide", "Next slide", "Página anterior", "Próxima página", "Acessar a Central de Ajuda com", "Fale Conosco"
- `gradiente · 44px · 16px 0 16px 0 · NCS Radhiumz · 11px · 600 · uppercase` — até 4× por largura · matiz: verde, azul · larguras: 320, 375, 768, 1024, 1280, 1474
  - "Ver Regulamento", "Entrar na comunidade oficial d"
- `gradiente · 56px · 21px 0 21px 0 · NCS Radhiumz · 14px · 600 · uppercase` — até 4× por largura · matiz: verde, azul · larguras: 1920
  - "Ver Regulamento", "Entrar na comunidade oficial d"
- `gradiente · 30px · 8px 0 8px 0 · NCS Radhiumz · 8px · 500 · uppercase` — até 2× por largura · matiz: verde, azul · larguras: 1280, 1474
  - "Entrar na comunidade do WhatsA", "Acessar a Área do Trader"
- `gradiente · 40px · 10.5px 0 10.5px 0 · NCS Radhiumz · 10.5px · 500 · uppercase` — até 2× por largura · matiz: verde, azul · larguras: 1920
  - "Entrar na comunidade do WhatsA", "Acessar a Área do Trader"
- `texto · 44px · 16px 0 16px 0 · TT Fors Trial · 11px · 600 · none` — até 1× por largura · matiz: azul · larguras: 320, 375, 768, 1024
  - "Abrir menu"

## Valores distintos — união das 7 larguras

**border-radius (21):** 8px · 9px · 10.4px · 10.8px · 12.8px · 14.04px · 15px · 16px · 16.64px · 19.8px · 20px · 20.8px · 22.8571px · 24px · 31.2px · 40px · 50% · 52px · 100% · 7992px · 10389.6px

**font-size (54):** 8px · 8.4px · 8.8px · 9.6px · 10px · 10.16px · 10.4px · 10.8px · 11px · 11.2px · 11.44px · 12px · 12.32px · 12.4px · 12.48px · 12.8px · 13px · 13.52px · 13.6px · 14px · 14.04px · 14.4px · 14.56px · 15.2px · 15.6px · 16px · 16.12px · 16.64px · 17.6px · 17.68px · 18.72px · 19.2px · 19.76px · 20px · 20.8px · 22.4px · 22.88px · 23.296px · 24px · 25.728px · 28.16px · 28.8px · 29.12px · 29.936px · 30px · 31.2px · 33.6px · 35.36px · 39.92px · 40px · 41.6px · 52px · 54.08px · 61.92px

**cor de texto (11):** rgb(0, 0, 0) · rgb(0, 128, 201) · rgb(0, 77, 55) · rgb(255, 255, 255) · rgb(37, 211, 102) · rgb(7, 12, 17) · rgb(87, 255, 109) · rgba(0, 0, 0, 0) · rgba(255, 255, 255, 0.58) · rgba(255, 255, 255, 0.7) · rgba(255, 255, 255, 0.9)

**gap (18):** 4px · 5px · 5.2px · 8px · 10.4px · 12px · 12.8px · 15.36px · 15.6px · 16px · 19.2px · 20.8px · 24px · 31.2px · 32px · 41.6px · 64px · 83.2px

## Critérios

- Só entram elementos com caixa renderizada (`getClientRects().length > 0`).
- `font-size` e cor contam apenas onde o elemento tem nó de texto próprio.
- `border-radius` conta os quatro cantos separadamente, ignorando `0px`.
- `gap` conta `row-gap`/`column-gap` de contêineres flex/grid, ignorando `normal` e `0px`.
- Botões: `button`, `[role="button"]`, `a.z7-btnx`, `a.faq__cta-link` e as setas do Swiper, visíveis por `checkVisibility` (opacidade e `visibility` incluídas). Ficam fora o seletor segmentado (`role="radio"`), a paginação do Swiper (desde a fase 5, os indicadores com o nome do plano), os `<button>` que são cards da central de ajuda e os cards de depoimento.
- Container principal: `#home .wrapper`.
- Primeiro parágrafo longo: primeiro `<p>` visível com 80+ caracteres — "Uma mesa proprietária para desenvolver sua ca…".
