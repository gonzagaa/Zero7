# Divisor de seção candles — verificação

Gerado por `node scripts/divisor.mjs` em 15/09/2026. Página preparada pelo harness, movimento reduzido, tela de 900px de altura, contexto de toque abaixo de 1080. A faixa do topo do #ba é fotografada só para as contas.

## Folgas e fita

"Folga real": do card mais baixo do #divisa ao pico desenhado da fita. "No CSS": o padding-bottom do #divisa menos a barra mais alta — o que a folga deveria dar. "Base → título": da base da fita ao título do #ba. "Pontas": a maior diferença de cor contra o fundo de cima (0–255) nas 3 colunas de cada ponta da faixa, acima da base, contra a do miolo — sem meia barra, a das pontas fica perto de 0. "Barra": a fração do miolo com barra. "Tom": a diferença de cor típica do corpo da barra (sem o azul) contra o fundo de cima — as duas seções são quase a mesma cor, então é pequena. "Aceso": o contraste do pixel mais claro da faixa (o topo da barra mais alta) contra o fundo de cima.

| Largura | Folga real | No CSS | Barra mais alta | Base → título | Pontas x miolo | Barra | Tom | Aceso |
|---:|---:|---:|---:|---:|---|---:|---:|---:|
| 320 | 48px | 48px | 25px | 80px | 3 x 196 | 42,3% | 26 | 4,88:1 |
| 375 | 49,1px | 49,2px | 25px | 80px | 0 x 196 | 41,3% | 27 | 4,88:1 |
| 390 | 49,5px | 49,5px | 25px | 80px | 2 x 196 | 41,8% | 26 | 4,88:1 |
| 430 | 50,3px | 50,3px | 25px | 80px | 2 x 196 | 41,9% | 26 | 4,88:1 |
| 768 | 57,4px | 57,4px | 36px | 80px | 0 x 196 | 43,8% | 21 | 4,88:1 |
| 1024 | 62,8px | 62,8px | 36px | 80px | 0 x 196 | 43,8% | 13 | 4,88:1 |
| 1280 | 92px | 78,5px | 36px | 125px | 0 x 196 | 43,8% | 13 | 4,88:1 |
| 1474 | 93,5px | 80px | 36px | 125px | 0 x 196 | 43,8% | 11 | 4,88:1 |
| 1920 | 80px | 80px | 36px | 100px | 0 x 196 | 43,8% | 10 | 4,88:1 |

## Recorte, costura e layout

"Antes do #ba": o elemento anterior a ele — tem de ser o #divisa, sem tira no meio. "Imagem no topo": a imagem de fundo do #ba começa no topo dele, então é ela que aparece nas barras. "Costura": a maior diferença de cor entre a linha logo acima e a logo abaixo da base da fita, só dentro das barras, imagem contra imagem; "referência": a mesma conta entre duas linhas quaisquer da imagem.

| Largura | Antes do #ba | Imagem no topo | Costura (máx. / média) | Referência (máx. / média) | Página | Rolagem lateral |
|---:|---|:--:|---|---|---:|---:|
| 320 | `#divisa` | sim | 4 / 1,3 | 3 / 1 | 10968 | 0 |
| 375 | `#divisa` | sim | 5 / 1,2 | 4 / 1,1 | 10639 | 0 |
| 390 | `#divisa` | sim | 4 / 1,2 | 3 / 1 | 10471 | 0 |
| 430 | `#divisa` | sim | 4 / 1,4 | 4 / 1,1 | 10509 | 0 |
| 768 | `#divisa` | sim | 4 / 1,1 | 4 / 1,2 | 9698 | 0 |
| 1024 | `#divisa` | sim | 4 / 1,1 | 6 / 1,2 | 10191 | 0 |
| 1280 | `#divisa` | sim | 5 / 1,3 | 6 / 1,3 | 7668 | 0 |
| 1474 | `#divisa` | sim | 4 / 1,4 | 6 / 1,2 | 7738 | 0 |
| 1920 | `#divisa` | sim | 5 / 1,3 | 7 / 1,3 | 7569 | 0 |

## O seletor do laboratório saiu

- ?divisor=chanfro, 375: seletor ausente · classes do #ba `secao--divisor secao--divisor-candles` · pedido do divisor.js: nenhum.
- ?dev=1, 375: seletor ausente · classes do #ba `secao--divisor secao--divisor-candles` · pedido do divisor.js: nenhum.
- sem parâmetro, 375: seletor ausente · classes do #ba `secao--divisor secao--divisor-candles` · pedido do divisor.js: nenhum.
