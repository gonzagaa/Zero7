# Sonda do celular — `fase8`

Gerado por `node scripts/movel.mjs fase8` em 2026-09-11. Contexto de toque (`isMobile` + `hasTouch`) abaixo de 1080; alturas de tela dos aparelhos (320×568, 375×812, 390×844, 430×932, 768×1024, 1474×900). Os `data-aos` saem antes de medir.

## Texto abaixo de 16px

Elementos visíveis com texto próprio, por categoria. **Conteúdo** tem de chegar a 16px; rótulo de chip e aviso legal têm piso de 12px; a tarja (regra 5) e o selo do Reclame Aqui (terceiro) ficam fora. Rótulo = caixa alta com espaçamento; controle = botão, campo, seletor e indicador; navegação = links e ícones do rodapé.

| Largura | conteúdo | exceção do cliente | rótulo | controle | navegação | rótulo de chip | aviso legal | barra legal | tarja (regra 5) | terceiro |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 320 | 0 | 34 | 10 | 16 | 1 | 8 | 1 | 6 | 9 | 1 |
| 375 | 0 | 34 | 10 | 16 | 1 | 8 | 1 | 6 | 9 | 1 |
| 390 | 0 | 34 | 10 | 16 | 1 | 8 | 1 | 6 | 9 | 1 |
| 430 | 0 | 34 | 10 | 16 | 1 | 8 | 1 | 6 | 9 | 1 |

### 320px — conteúdo abaixo de 16px, e chip ou aviso abaixo de 12px

| Categoria | Seção | Elemento | Corpo | Ocorrências | Amostra |
|---|---|---|---:|---:|---|
| rótulo de chip | #plan | `span.chip__rotulo` | 8.4px | 8 | Limite por operação |

### 375px — conteúdo abaixo de 16px, e chip ou aviso abaixo de 12px

| Categoria | Seção | Elemento | Corpo | Ocorrências | Amostra |
|---|---|---|---:|---:|---|
| rótulo de chip | #plan | `span.chip__rotulo` | 8.4px | 8 | Limite por operação |

### 390px — conteúdo abaixo de 16px, e chip ou aviso abaixo de 12px

| Categoria | Seção | Elemento | Corpo | Ocorrências | Amostra |
|---|---|---|---:|---:|---|
| rótulo de chip | #plan | `span.chip__rotulo` | 8.4px | 8 | Limite por operação |

### 430px — conteúdo abaixo de 16px, e chip ou aviso abaixo de 12px

| Categoria | Seção | Elemento | Corpo | Ocorrências | Amostra |
|---|---|---|---:|---:|---|
| rótulo de chip | #plan | `span.chip__rotulo` | 8.4px | 8 | Limite por operação |

### 375px — rótulos, controles e navegação abaixo de 16px (fora do piso)

| Categoria | Seção | Elemento | Corpo | Ocorrências | Amostra |
|---|---|---|---:|---:|---|
| controle | #contato | `span.z7-btnx__label.btn__label` | 10.8px | 1 | Entrar agora |
| controle | #contato | `button.btn.btn--md` | 10.8px | 1 | Fale Conosco |
| controle | #depoimentos | `span.z7-btnx__label.btn__label` | 12.8px | 1 | Contrate um plano |
| controle | #faq | `span.faq__pagination-info` | 12.8px | 1 | / |
| controle | #faq | `span` | 12.8px | 2 | 1 |
| controle | #faq | `a.faq__cta-link.btn` | 10.8px | 1 | Acessar a Central de Ajuda completa |
| controle | #home | `span.z7-btnx__label.btn__label` | 12.8px | 1 | Começar agora mesmo |
| controle | #plan | `button.seg__option.selecionado` | 10.4px | 1 | Mini Índice / Dólar |
| controle | #plan | `button.seg__option` | 10.4px | 1 | Futuro de Bitcoin |
| controle | #plan | `button.swiper-pagination-bullet` | 11.2px | 5 | TRAINEE |
| controle | #plan | `button.swiper-pagination-bullet.is-na-tela` | 11.2px | 1 | SÊNIOR |
| navegação | #footer | `h3` | 12.8px | 1 | Social |
| rótulo | #contato | `span` | 12.8px | 2 | Fique por dentro |
| rótulo | #faq | `span.faq__category-count` | 12.8px | 6 | 3 artigos |
| rótulo | #footer | `h3` | 12.8px | 2 | Navegação |

## Estouro da viewport

"Passa da viewport": a parte visível do elemento sai da tela. "Cortado por ancestral": o elemento sai da tela, mas um ancestral com overflow o corta — o que aparece fica dentro, com o resto amputado. Imagens decorativas (`alt=""`, `aria-hidden`) ficam fora.

| Largura | scroll horizontal | passa da viewport | cortado por ancestral |
|---:|:--:|---:|---:|
| 320 | não | 0 | 0 |
| 375 | não | 0 | 0 |
| 390 | não | 0 | 0 |
| 430 | não | 0 | 0 |
| 768 | não | 0 | 0 |
| 1474 | não | 0 | 0 |

## Menu mobile aberto

Painel e itens em px da viewport. "Sob o ponto" é o elemento que o `elementFromPoint` acha num ponto da página fora do painel — sem scrim, é o conteúdo de trás.

| Largura | painel (esq → dir, largura) | itens que passam do painel ou da tela | sob o ponto | scrim | fecha tocando no scrim |
|---:|---|---|---|---|:--:|
| 320 | 76 → 317 (241) | nenhum | `div.menu-scrim` | rgba(0, 0, 0, 0.6), 0.2s | sim |
| 375 | 131 → 372 (241) | nenhum | `div.menu-scrim` | rgba(0, 0, 0, 0.6), 0.2s | sim |
| 390 | 146 → 387 (241) | nenhum | `div.menu-scrim` | rgba(0, 0, 0, 0.6), 0.2s | sim |
| 430 | 169 → 427 (258) | nenhum | `div.menu-scrim` | rgba(0, 0, 0, 0.6), 0.2s | sim |
| 768 | 304 → 765 (461) | nenhum | `div.menu-scrim` | rgba(0, 0, 0, 0.6), 0.2s | sim |

## Nav sobre a seção clara (#topicos)

| Largura | fundo da nav | backdrop-filter |
|---:|---|---|
| 320 | rgb(0, 2, 5) | none |
| 375 | rgb(0, 2, 5) | none |
| 390 | rgb(0, 2, 5) | none |
| 430 | rgb(0, 2, 5) | none |
| 768 | rgb(0, 2, 5) | none |

## Cards de benefício do #ba

"Abre ao roçar" = um `mouseenter` sintético, o que o dedo rolando dispara, abre o texto. O toque é um `tap` de verdade do Playwright.

| Largura | hover: none | abre ao roçar | line-clamp | reticências | 1º toque: altura, aberto, aria-expanded, seta | 2º toque: altura, aberto |
|---:|:--:|---|---|---|---|---|
| 320 | sim | não / não / não | 3 | clip | 154px, sim, —, matrix(0, 1, -1, 0, 0, 0) | 77px, não |
| 375 | sim | não / não / não | 3 | clip | 128px, sim, —, matrix(0, 1, -1, 0, 0, 0) | 77px, não |
| 390 | sim | não / não / não | 3 | clip | 128px, sim, —, matrix(0, 1, -1, 0, 0, 0) | 77px, não |
| 430 | sim | não / não / não | 3 | clip | 102px, sim, —, matrix(0, 1, -1, 0, 0, 0) | 77px, não |
| 768 | sim | não / não / não | 3 | clip | 128px, sim, —, matrix(0, 1, -1, 0, 0, 0) | 77px, não |

## Herói

| Largura | H1 | linhas do H1 | bloco: margem esq / dir | parágrafo | linhas | base da nav | imagem: topo, object-position |
|---:|---:|---|---|---:|---:|---:|---|
| 320 | 22px | O ECOSSISTEMA / acessível PARA / OPERAR DAY TRADE. | 12 / 12 | 16px | 6 | 141.7 | 108, 50% 50% |
| 375 | 26.1px | O ECOSSISTEMA / acessível PARA / OPERAR DAY TRADE. | 12 / 12 | 16px | 5 | 136.2 | 108, 50% 50% |
| 390 | 27.2px | O ECOSSISTEMA / acessível PARA / OPERAR DAY TRADE. | 12 / 12 | 16px | 5 | 138.3 | 108, 50% 50% |
| 430 | 30.1px | O ECOSSISTEMA / acessível PARA / OPERAR DAY TRADE. | 12 / 12 | 16px | 4 | 143.7 | 108, 50% 50% |
| 768 | 32px | O ECOSSISTEMA acessível / PARA OPERAR DAY TRADE. | 19.2 / 19.2 | 16px | 3 | 189.9 | 67.2, 50% 50% |
| 1474 | 40px | O ECOSSISTEMA acessível PARA / OPERAR DAY TRADE. | 196.2 / 196.2 | 12.8px | 3 | 125.7 | — |

## Títulos e texto das seções

| Largura | #ba: corpo, linhas | #depoimentos: corpo, linhas | texto dos cards do #topicos |
|---:|---|---|---:|
| 320 | 17.2px — Conheça os / Benefícios Zero7 | 17.2px — TRANSFORME SUAS / HABILIDADES EM / GRANDES PAGAMENTOS | 14px |
| 375 | 20.5px — Conheça os / Benefícios Zero7 | 20.5px — TRANSFORME SUAS / HABILIDADES EM / GRANDES PAGAMENTOS | 14px |
| 390 | 21.4px — Conheça os / Benefícios Zero7 | 21.4px — TRANSFORME SUAS / HABILIDADES EM / GRANDES PAGAMENTOS | 14px |
| 430 | 23.9px — Conheça os / Benefícios Zero7 | 23.9px — TRANSFORME SUAS / HABILIDADES EM / GRANDES PAGAMENTOS | 14px |
| 768 | 24px — Conheça os Benefícios Zero7 | 24px — TRANSFORME SUAS HABILIDADES / EM GRANDES PAGAMENTOS | 14px |
| 1474 | 24px — Conheça os Benefícios Zero7 | 24px — TRANSFORME SUAS / HABILIDADES EM GRANDES / PAGAMENTOS | 11.2px |

## #depoimentos, nota dos planos e "Precisa de ajuda?"

| Largura | depoimentos: coluna / cabeçalho / parágrafo (corpo, max-width) / CTA | nota: margem esq / dir, corpo | referência (carrossel): esq / dir | ajuda: coluna do card / botão (altura) |
|---:|---|---|---|---|
| 320 | 281.6 / 281.6 / 281.6 (16px, 566.272px) / 281.6 | 19.2 / 19.2, 16px | 19.2 / 19.2 | 241.2 / 241.3 (44) |
| 375 | 336.6 / 336.6 / 336.6 (16px, 566.272px) / 336.6 | 19.2 / 19.2, 16px | 19.2 / 19.2 | 296.2 / 296.3 (44) |
| 390 | 351.6 / 351.6 / 351.6 (16px, 566.272px) / 351.6 | 19.2 / 19.2, 16px | 19.2 / 19.2 | 311.2 / 311.3 (44) |
| 430 | 391.6 / 391.6 / 391.6 (16px, 566.272px) / 391.6 | 19.2 / 19.2, 16px | 19.2 / 19.2 | 351.2 / 351.3 (44) |
| 768 | 729.6 / 729.6 / 566.3 (16px, 566.272px) / 729.6 | 100.9 / 100.9, 16px | 19.2 / 19.2 | 316.4 / 316.4 (44) |
| 1474 | 1081.6 / 508.8 / 453 (12.8px, 453.018px) / 256.3 | 510.5 / 510.5, 12.8px | 19.2 / 19.2 | 259.5 / 122.5 (44) |

## Vão entre seções

Do fim do conteúdo de uma seção ao começo do conteúdo da seguinte.

| Largura | #contato → rodapé | #faq → #contato |
|---:|---:|---:|
| 320 | 64px | 128px |
| 375 | 64px | 128px |
| 390 | 64px | 128px |
| 430 | 64px | 128px |
| 768 | 64px | 128px |
| 1474 | 128px | 128px |

## Rodapé, pagamento e barra legal

| Largura | altura | colunas | passo dos links | alvo do link | cor do link (contraste) | endereço/horário visíveis | social: alvos; desvio do rótulo | pagamento: altura, linhas, desalinho | selo: folga até a base do rodapé |
|---:|---:|---|---:|---|---|---:|---|---|---:|
| 320 | 597.5 | 108.031px 163.953px | 44 | 44×44 | rgba(255, 255, 255, 0.7) (9.9:1) | 0 | 44×44 44×44 44×44; 72 | 16, 1, 0 | 411 |
| 375 | 595.5 | 148.672px 163.953px | 44 | 44×44 | rgba(255, 255, 255, 0.7) (9.9:1) | 0 | 44×44 44×44 44×44; 72 | 16, 1, 0 | 409 |
| 390 | 595.5 | 163.672px 163.953px | 44 | 44×44 | rgba(255, 255, 255, 0.7) (9.9:1) | 0 | 44×44 44×44 44×44; 72 | 16, 1, 0 | 409 |
| 430 | 595.5 | 183.812px 183.812px | 44 | 44×44 | rgba(255, 255, 255, 0.7) (9.9:1) | 0 | 44×44 44×44 44×44; 72 | 16, 1, 0 | 409 |
| 768 | 595.5 | 352.812px 352.812px | 44 | 44×44 | rgba(255, 255, 255, 0.7) (9.9:1) | 0 | 44×44 44×44 44×44; 72 | 16, 1, 0 | 409 |
| 1474 | 333.5 | 222.406px 222.406px 222.406px 222.406px | 25 | 34.8×17 | rgba(255, 255, 255, 0.7) (9.9:1) | 2 | 36.8×39.8 36.8×39.8 36.8×39.8; -54.3 | 20.2, 1, 0 | 64 |

| Largura | ano do © | links de política em linha | passo entre links | aviso legal: corpo, alinhamento, contraste |
|---:|---:|:--:|---:|---|
| 320 | 2026 | não | 0 | 12.8px, left, 9.9:1 |
| 375 | 2026 | sim | 0 | 12.8px, left, 9.9:1 |
| 390 | 2026 | sim | 0 | 12.8px, left, 9.9:1 |
| 430 | 2026 | sim | 0 | 12.8px, left, 9.9:1 |
| 768 | 2026 | sim | 0 | 12.8px, left, 9.9:1 |
| 1474 | 2026 | sim | 0 | 8px, center, 9.9:1 |
