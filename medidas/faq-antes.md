# Card da central de ajuda — verificação (antes)

Gerado por `node scripts/faq.mjs antes` em 11/09/2026. Página preparada pelo harness, movimento reduzido, tela de 900px de altura, contexto de toque abaixo de 1080. As categorias vêm da API da central pelo cache do harness.

## Grade

"Colunas": as posições distintas de card na horizontal; "fase 10" é o que a grade pede (4 de 1200 em diante, 2 de 768 a 1199, 1 abaixo). "Focáveis": o maior número de elementos focáveis num card, contando o próprio card e o que estiver em shadow root. "Alvo": o menor lado do menor card. "Estouro": card fora da grade ou conteúdo fora do card.

| Largura | Cards | Colunas (fase 10) | Fileiras | Altura dos cards | Focáveis | Alvo | Estouro | Rolagem lateral | Paginação | #faq | Página |
|---:|---:|---|---:|---|---:|---:|---:|---:|---|---:|---:|
| 320 | 6 | 1 (1) | 6 | 203–272px | 1 | 203px | 0 | 0 | na tela | 1942 | 11711 |
| 375 | 6 | 1 (1) | 6 | 156–180px | 1 | 156px | 0 | 0 | na tela | 1527 | 10963 |
| 390 | 6 | 1 (1) | 6 | 133–179px | 1 | 133px | 0 | 0 | na tela | 1435 | 10793 |
| 430 | 6 | 1 (1) | 6 | 133–157px | 1 | 133px | 0 | 0 | na tela | 1346 | 10762 |
| 767 | 6 | 1 (1) | 6 | 87–110px | 1 | 87px | 0 | 0 | na tela | 1092 | 11154 |
| 768 | 6 | 2 (2) | 3 | 156–179px | 1 | 156px | 0 | 0 | na tela | 954 | 9737 |
| 1024 | 6 | 2 (2) | 3 | 110–133px | 1 | 110px | 0 | 0 | na tela | 838 | 10114 |
| 1199 | 6 | 3 (2) | 2 | 102px, todas | 1 | 102px | 0 | 0 | na tela | 656 | 6074 |
| 1200 | 6 | 3 (4) | 2 | 102px, todas | 1 | 102px | 0 | 0 | na tela | 656 | 6074 |
| 1280 | 6 | 3 (4) | 2 | 102px, todas | 1 | 102px | 0 | 0 | na tela | 656 | 6112 |
| 1474 | 6 | 3 (4) | 2 | 102px, todas | 1 | 102px | 0 | 0 | na tela | 656 | 6174 |
| 1920 | 6 | 3 (4) | 2 | 128,8px, todas | 1 | 128,8px | 0 | 0 | na tela | 842 | 7580 |

## Texto

Corpo em px. "Linhas da descrição": as visíveis / as do texto inteiro, no card que mais tem — com o line-clamp, as visíveis param em 2 e o resto fica nas reticências. "Seta × algarismos": centro da seta menos o centro dos algarismos da contagem (positivo = seta mais baixa).

| Largura | Título | Linhas do título | Descrição | Linhas da descrição | Cortadas | Contagem | Seta × algarismos |
|---:|---:|---:|---:|---|---:|---:|---|
| 320 | 17,6 | 3 | 16 | 8 / 8 | 0 de 6 | 12,8 | — |
| 375 | 17,6 | 2 | 16 | 5 / 5 | 0 de 6 | 12,8 | — |
| 390 | 17,6 | 2 | 16 | 5 / 5 | 0 de 6 | 12,8 | — |
| 430 | 17,6 | 2 | 16 | 4 / 4 | 0 de 6 | 12,8 | — |
| 767 | 17,6 | 1 | 16 | 2 / 2 | 0 de 6 | 12,8 | — |
| 768 | 17,6 | 2 | 16 | 5 / 5 | 0 de 6 | 12,8 | — |
| 1024 | 17,6 | 1 | 16 | 3 / 3 | 0 de 6 | 12,8 | — |
| 1199 | 12 | 1 | 10,4 | 3 / 3 | 0 de 6 | 8,8 | — |
| 1200 | 12 | 1 | 10,4 | 3 / 3 | 0 de 6 | 8,8 | — |
| 1280 | 12 | 1 | 10,4 | 3 / 3 | 0 de 6 | 8,8 | — |
| 1474 | 12 | 1 | 10,4 | 3 / 3 | 0 de 6 | 8,8 | — |
| 1920 | 15,6 | 1 | 13,5 | 3 / 3 | 0 de 6 | 11,4 | — |

## Forma e superfície

**390px**

- Card: canto `0px 8px 8px 0px` · fundo gradiente (linear-gradient(130deg, rgb(1, 11, 21), …) · borda 2px rgba(87, 87, 87, 0.12) · sombra `none` · padding 16px.
- Saiu? trilho: sim (2px) · pílula da contagem: sim (rgba(0, 128, 201, 0.1), borda 1px) · chevron: sim. Seta: não. `aria-expanded`: —.
- Tinta: título rgb(255, 255, 255) (peso 600) · descrição rgba(255, 255, 255, 0.7) · contagem rgb(0, 128, 201), `normal`.
- Busca: canto `8px 8px 8px 8px` · fundo gradiente (linear-gradient(130deg, rgb(1, 11, 21), …) · borda 2px rgba(87, 87, 87, 0.12) · altura 55,8px · placeholder "Pesquisar na central de ajuda...".
- CTA: `btn btn--md btn--secundaria` · canto `16px 0px 16px 0px` · altura 44px.
- Modal: canto `16px 16px 16px 16px`.

**1474px**

- Card: canto `0px 8px 8px 0px` · fundo gradiente (linear-gradient(130deg, rgb(1, 11, 21), …) · borda 2px rgba(87, 87, 87, 0.12) · sombra `none` · padding 16px.
- Saiu? trilho: sim (2px) · pílula da contagem: sim (rgba(0, 128, 201, 0.1), borda 1px) · chevron: sim. Seta: não. `aria-expanded`: —.
- Tinta: título rgb(255, 255, 255) (peso 600) · descrição rgba(255, 255, 255, 0.7) · contagem rgb(0, 128, 201), `normal`.
- Busca: canto `8px 8px 8px 8px` · fundo gradiente (linear-gradient(130deg, rgb(1, 11, 21), …) · borda 2px rgba(87, 87, 87, 0.12) · altura 48,8px · placeholder "Pesquisar na central de ajuda...".
- CTA: `btn btn--md btn--secundaria` · canto `16px 0px 16px 0px` · altura 44px.
- Modal: canto `16px 16px 16px 16px`.

## Teclado

Do campo de busca, Tab até o foco sair do #faq. "Ordem": os cards na sequência do Tab contra a ordem visual (fileira, depois coluna). "Repetidas": a mesma parada duas vezes — travamento.

| Largura | Paradas na seção | Cards | Ordem visual | Sem anel | Fora da tela | Repetidas | Saiu para | Anel |
|---:|---:|---:|:--:|---:|---:|---:|---|---|
| 390 | 8 | 6 | sim | 0 | 0 | 0 | Entrar na comunidade oficial da Zero7 no WhatsApp | 2px rgb(29, 164, 243) |
| 1474 | 8 | 6 | sim | 0 | 0 | 0 | Entrar na comunidade oficial da Zero7 no WhatsApp | 2px rgb(29, 164, 243) |

Sequência em 390: Começando na Zero7 → Inscrição e Pagamento → Área do Trader e Plataforma Profit → Fase de Avaliação → Aprovação no Plano → Fase Incubadora → Próxima página → Acessar a Central de Ajuda completa → (Entrar na comunidade oficial da Zero7 no WhatsApp)

Sequência em 1474: Começando na Zero7 → Inscrição e Pagamento → Área do Trader e Plataforma Profit → Fase de Avaliação → Aprovação no Plano → Fase Incubadora → Próxima página → Acessar a Central de Ajuda completa → (Entrar na comunidade oficial da Zero7 no WhatsApp)

## Hover (1474)

- Movimento reduzido: borda rgba(87, 87, 87, 0.12) → rgba(255, 255, 255, 0.3); o card sobe 0px (`translate: none`, `transform: none`); a seta anda —px e vai de null para null; sombra `none`; transições `border-color` em `1e-05s`.
- Sem preferência de movimento: borda rgba(87, 87, 87, 0.12) → rgba(255, 255, 255, 0.3); o card sobe 0px (`translate: none`, `transform: none`); a seta anda —px e vai de null para null; sombra `none`; transições `border-color` em `0.15s`.

## Busca

- 390: digitando "saque", 7 resultados ("7 resultados"), com a grade escondida: sim; o primeiro abre o modal: sim ("Janelas de saque do prêmio incubadora", 878 caracteres); Esc fecha: sim; "Limpar busca" volta à grade: sim.
- 1474: digitando "saque", 7 resultados ("7 resultados"), com a grade escondida: sim; o primeiro abre o modal: sim ("Janelas de saque do prêmio incubadora", 878 caracteres); Esc fecha: sim; "Limpar busca" volta à grade: sim.

## Do card ao artigo

- 390: o card abre o painel: sim (`position: relative`, depois de #faqPagination, com X próprio: sim, 3 artigos; `aria-expanded` —; borda do card rgba(255, 255, 255, 0.3)). Um artigo abre o modal: sim (`position: fixed`), com o painel aberto por baixo: sim; diálogos abertos: 1; foco em Fechar. Esc fecha o modal: sim, o foco volta ao artigo: sim, o painel continua: sim. O mesmo card fecha o painel: sim (`aria-expanded` —).
- 1474: o card abre o painel: sim (`position: relative`, depois de #faqPagination, com X próprio: sim, 3 artigos; `aria-expanded` —; borda do card rgba(255, 255, 255, 0.3)). Um artigo abre o modal: sim (`position: fixed`), com o painel aberto por baixo: sim; diálogos abertos: 1; foco em Fechar. Esc fecha o modal: sim, o foco volta ao artigo: sim, o painel continua: sim. O mesmo card fecha o painel: sim (`aria-expanded` —).
