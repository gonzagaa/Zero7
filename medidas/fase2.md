# Medidas da home — `fase2`

Gerado por `node scripts/medir.mjs fase2` em 2026-09-09.

## Tipografia, container e scroll

| Largura | `:root` | h1 | Parágrafo | Container | % da tela | Scroll-X | Altura da página |
|---:|---:|---:|---:|---:|---:|:--:|---:|
| 320 | 8px | 20px | 10.4px | 320px | 100% | não | 9545px |
| 375 | 8px | 20px | 10.4px | 375px | 100% | não | 9365px |
| 768 | 8px | 20px | 10.4px | 768px | 100% | não | 8682px |
| 1024 | 8px | 29.94px | 10.4px | 1024px | 100% | não | 9375px |
| 1280 | 8px | 39.92px | 12.8px | 1120px | 88% | não | 5943px |
| 1474 | 8px | 40px | 12.8px | 1120px | 76% | não | 6005px |
| 1920 | 10.4px | 61.92px | 16.64px | 1456px | 76% | não | 7388px |

## Dispersão de valores

Contagem de valores **distintos** entre os elementos renderizados naquela largura.

| Largura | border-radius | font-size | cor de texto | gap |
|---:|---:|---:|---:|---:|
| 320 | 23 | 22 | 27 | 16 |
| 375 | 23 | 22 | 27 | 16 |
| 768 | 23 | 24 | 27 | 19 |
| 1024 | 23 | 24 | 27 | 19 |
| 1280 | 22 | 26 | 28 | 21 |
| 1474 | 22 | 23 | 28 | 21 |
| 1920 | 22 | 25 | 28 | 21 |

## Valores distintos — união das 7 larguras

**border-radius (40):** 6.4px · 8px · 8.32px · 9px · 9.6px · 10% · 10.1333px · 10.4px · 10.8px · 11.6px · 12.48px · 12.8px · 13.1733px · 13.4px · 13.52px · 13.8667px · 14.04px · 14.4px · 15.08px · 16px · 16.4px · 16.64px · 17.72px · 18.6667px · 18.72px · 20px · 20.8px · 22.8571px · 24.2667px · 27.04px · 28px · 36.4px · 38px · 48px · 50% · 62.4px · 100% · 999px · 7992px · 10389.6px

**font-size (60):** 8px · 8.4px · 8.8px · 9.6px · 10px · 10.16px · 10.4px · 10.8px · 11px · 11.2px · 11.44px · 12px · 12.32px · 12.4px · 12.48px · 12.8px · 13px · 13.52px · 13.6px · 14px · 14.04px · 14.4px · 14.56px · 15.2px · 15.6px · 16px · 16.12px · 16.64px · 17.6px · 17.68px · 18.72px · 19.2px · 19.76px · 20px · 20.8px · 21.6px · 22.4px · 22.88px · 23.296px · 24px · 24.576px · 25.728px · 28.08px · 28.16px · 28.8px · 29.12px · 29.936px · 30px · 31.2px · 32.768px · 33.6px · 35.36px · 36.8px · 39.92px · 40px · 41.6px · 47.84px · 52px · 54.08px · 61.92px

**cor de texto (29):** rgb(0, 0, 0) · rgb(0, 128, 201) · rgb(0, 77, 55) · rgb(149, 162, 177) · rgb(155, 163, 170) · rgb(185, 197, 211) · rgb(193, 193, 193) · rgb(198, 198, 198) · rgb(209, 224, 255) · rgb(210, 210, 210) · rgb(215, 226, 238) · rgb(216, 216, 216) · rgb(232, 232, 232) · rgb(242, 255, 251) · rgb(248, 255, 253) · rgb(255, 255, 255) · rgb(37, 211, 102) · rgb(7, 12, 17) · rgb(87, 255, 109) · rgba(0, 0, 0, 0) · rgba(220, 220, 220, 0.7) · rgba(255, 255, 255, 0.58) · rgba(255, 255, 255, 0.6) · rgba(255, 255, 255, 0.68) · rgba(255, 255, 255, 0.7) · rgba(255, 255, 255, 0.85) · rgba(255, 255, 255, 0.9) · rgba(255, 255, 255, 0.92) · rgba(255, 255, 255, 0.96)

**gap (43):** 2.8px · 3.2px · 3.64px · 4px · 4.16px · 4.4px · 4.8px · 5px · 5.2px · 5.72px · 6.24px · 6.4px · 8px · 8.32px · 9.6px · 10px · 10.4px · 11.2px · 12px · 12.48px · 12.8px · 14px · 14.4px · 14.56px · 15.36px · 15.6px · 16px · 16.64px · 17.6px · 18px · 18.72px · 19.2px · 20.8px · 22.88px · 24px · 25.6px · 32px · 33.28px · 41.6px · 64px · 80px · 83.2px · 104px

## Critérios

- Só entram elementos com caixa renderizada (`getClientRects().length > 0`).
- `font-size` e cor contam apenas onde o elemento tem nó de texto próprio.
- `border-radius` conta os quatro cantos separadamente, ignorando `0px`.
- `gap` conta `row-gap`/`column-gap` de contêineres flex/grid, ignorando `normal` e `0px`.
- Container principal: `#home .wrapper`.
- Primeiro parágrafo longo: primeiro `<p>` visível com 80+ caracteres — "Uma mesa proprietária para desenvolver sua ca…".
