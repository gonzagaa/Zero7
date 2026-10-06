# Card da central de ajuda — verificação (expansao)

Gerado por `node scripts/faq.mjs expansao` em 15/09/2026. Página preparada pelo harness, movimento reduzido, tela de 900px de altura, contexto de toque abaixo de 1080. As categorias vêm da API da central pelo cache do harness.

## Grade

"Colunas": as posições distintas de card na horizontal; "fase 10" é o que a grade pede (4 de 1200 em diante, 2 de 768 a 1199, 1 abaixo). "Focáveis": o maior número de elementos focáveis num card, contando o próprio card e o que estiver em shadow root. "Alvo": o menor lado do menor card. "Estouro": card fora da grade ou conteúdo fora do card.

| Largura | Cards | Colunas (fase 10) | Fileiras | Altura dos cards | Focáveis | Alvo | Estouro | Rolagem lateral | Paginação | #faq | Página |
|---:|---:|---|---:|---|---:|---:|---:|---:|---|---:|---:|
| 320 | 4 | 1 (1) | 4 | 185,6px, todas | 1 | 185,6px | 0 | 0 | escondida | 1241 | 11036 |
| 375 | 4 | 1 (1) | 4 | 185,6px, todas | 1 | 185,6px | 0 | 0 | escondida | 1245 | 10707 |
| 390 | 4 | 1 (1) | 4 | 162,8px, todas | 1 | 162,8px | 0 | 0 | escondida | 1155 | 10539 |
| 430 | 4 | 1 (1) | 4 | 162,8px, todas | 1 | 162,8px | 0 | 0 | escondida | 1135 | 10577 |
| 767 | 4 | 1 (1) | 4 | 162,8px, todas | 1 | 162,8px | 0 | 0 | escondida | 1135 | 11223 |
| 768 | 6 | 2 (2) | 3 | 162,8px, todas | 1 | 162,8px | 0 | 0 | escondida | 956 | 9766 |
| 1024 | 6 | 2 (2) | 3 | 162,8px, todas | 1 | 162,8px | 0 | 0 | escondida | 956 | 10259 |
| 1199 | 6 | 2 (2) | 3 | 137,6px, todas | 1 | 137,6px | 0 | 0 | escondida | 883 | 6331 |
| 1200 | 12 | 4 (4) | 3 | 154,3px, todas | 1 | 154,3px | 0 | 0 | escondida | 865 | 6314 |
| 1280 | 12 | 4 (4) | 3 | 154,3px, todas | 1 | 154,3px | 0 | 0 | escondida | 865 | 6351 |
| 1474 | 12 | 4 (4) | 3 | 154,3px, todas | 1 | 154,3px | 0 | 0 | escondida | 865 | 6413 |
| 1920 | 12 | 4 (4) | 3 | 200px, todas | 1 | 200px | 0 | 0 | escondida | 1121 | 7898 |

## Expansão progressiva

"Visíveis": cards na tela em repouso, do total. "Fileiras": fileiras na tela em repouso. "#faq": altura da seção fechada → aberta. "Controle": o menor lado do botão do chevron, que é o alvo de toque. "Volta": fechar pelo mesmo botão devolve o estado de repouso.

| Largura | Visíveis | Fileiras | #faq fechada | #faq aberta | Controle | Canto | aria-expanded | Esmaecido | Foco no botão | Volta | Lateral |
|---:|---:|---:|---:|---:|---:|---|---|---|:--:|:--:|---:|
| 320 | 4 de 12 | 4 | 1241 | 2854 | 44px | `16px 0px 16px 0px` | false → true | 80px, none | sim | sim | 0 |
| 375 | 4 de 12 | 4 | 1245 | 2858 | 44px | `16px 0px 16px 0px` | false → true | 80px, none | sim | sim | 0 |
| 390 | 4 de 12 | 4 | 1155 | 2859 | 44px | `16px 0px 16px 0px` | false → true | 80px, none | sim | sim | 0 |
| 430 | 4 de 12 | 4 | 1135 | 2565 | 44px | `16px 0px 16px 0px` | false → true | 80px, none | sim | sim | 0 |
| 767 | 4 de 12 | 4 | 1135 | 2565 | 44px | `16px 0px 16px 0px` | false → true | 80px, none | sim | sim | 0 |
| 768 | 6 de 12 | 3 | 956 | 1493 | 44px | `16px 0px 16px 0px` | false → true | 80px, none | sim | sim | 0 |
| 1024 | 6 de 12 | 3 | 956 | 1493 | 44px | `16px 0px 16px 0px` | false → true | 80px, none | sim | sim | 0 |
| 1199 | 6 de 12 | 3 | 883 | 1344 | 44px | `16px 0px 16px 0px` | false → true | 80px, none | sim | sim | 0 |
| 1200 | 12 de 12 | 3 | 865 | — | ausente | — | — | não | — | — | 0 |
| 1280 | 12 de 12 | 3 | 865 | — | ausente | — | — | não | — | — | 0 |
| 1474 | 12 de 12 | 3 | 865 | — | ausente | — | — | não | — | — | 0 |
| 1920 | 12 de 12 | 3 | 1121 | — | ausente | — | — | não | — | — | 0 |

Controle em 320: `aria-controls` faqCategories · nome acessível "null" · texto visível "Ver mais" · chevron none → matrix(-1, 0, 0, -1, 0, 0), transição 1e-05s · altura animada ao alternar: não (movimento reduzido).

## Texto

Corpo em px. "Linhas da descrição": as visíveis / as do texto inteiro, no card que mais tem — com o line-clamp, as visíveis param em 2 e o resto fica nas reticências. "Seta × algarismos": centro da seta menos o centro dos algarismos da contagem (positivo = seta mais baixa).

| Largura | Título | Linhas do título | Descrição | Linhas da descrição | Cortadas | Contagem | Seta × algarismos |
|---:|---:|---:|---:|---|---:|---:|---|
| 320 | 17,6 | 2 | 16 | 2 / 4 | 4 de 4 | 12,8 | 0,5 a 0,5px |
| 375 | 17,6 | 2 | 16 | 2 / 3 | 4 de 4 | 12,8 | 0,5 a 0,5px |
| 390 | 17,6 | 1 | 16 | 2 / 3 | 3 de 4 | 12,8 | 0,5 a 0,5px |
| 430 | 17,6 | 1 | 16 | 2 / 3 | 2 de 4 | 12,8 | 0,5 a 0,5px |
| 767 | 17,6 | 1 | 16 | 2 / 2 | 0 de 4 | 12,8 | 0,5 a 0,5px |
| 768 | 17,6 | 1 | 16 | 2 / 3 | 4 de 6 | 12,8 | 0,5 a 0,5px |
| 1024 | 17,6 | 1 | 16 | 2 / 2 | 0 de 6 | 12,8 | 0,5 a 0,5px |
| 1199 | 12,8 | 1 | 11,2 | 2 / 2 | 0 de 6 | 9,6 | 0,2 a 0,2px |
| 1200 | 12,8 | 2 | 11,2 | 2 / 3 | 6 de 12 | 9,6 | 0,2 a 0,2px |
| 1280 | 12,8 | 2 | 11,2 | 2 / 3 | 6 de 12 | 9,6 | 0,2 a 0,2px |
| 1474 | 12,8 | 2 | 11,2 | 2 / 3 | 6 de 12 | 9,6 | 0,2 a 0,2px |
| 1920 | 16,6 | 2 | 14,6 | 2 / 3 | 6 de 12 | 12,5 | -0,3 a -0,3px |

## Forma e superfície

**390px**

- Card: canto `16px 0px 16px 0px` · fundo rgb(7, 12, 17) · borda 1px rgba(255, 255, 255, 0.14) · sombra `none` · padding 24px.
- Saiu? trilho: não · pílula da contagem: não · chevron: não. Seta: arrow-forward-outline. `aria-expanded`: false.
- Tinta: título rgb(255, 255, 255) (peso 600) · descrição rgba(255, 255, 255, 0.7) · contagem rgba(255, 255, 255, 0.58), `tabular-nums`.
- Busca: canto `16px 0px 16px 0px` · fundo rgb(7, 12, 17) · borda 1px rgba(255, 255, 255, 0.14) · altura 53,8px · placeholder "Pesquisar na central de ajuda...".
- CTA: `btn btn--md btn--secundaria` · canto `16px 0px 16px 0px` · altura 44px.
- Modal: canto `16px 0px 16px 0px`.

**1474px**

- Card: canto `16px 0px 16px 0px` · fundo rgb(7, 12, 17) · borda 1px rgba(255, 255, 255, 0.14) · sombra `none` · padding 24px.
- Saiu? trilho: não · pílula da contagem: não · chevron: não. Seta: arrow-forward-outline. `aria-expanded`: false.
- Tinta: título rgb(255, 255, 255) (peso 600) · descrição rgba(255, 255, 255, 0.7) · contagem rgba(255, 255, 255, 0.58), `tabular-nums`.
- Busca: canto `16px 0px 16px 0px` · fundo rgb(7, 12, 17) · borda 1px rgba(255, 255, 255, 0.14) · altura 46,8px · placeholder "Pesquisar na central de ajuda...".
- CTA: `btn btn--md btn--secundaria` · canto `16px 0px 16px 0px` · altura 44px.
- Modal: canto `16px 0px 16px 0px`.

## Teclado

Do campo de busca, Tab até o foco sair do #faq. "Ordem": os cards na sequência do Tab contra a ordem visual (fileira, depois coluna). "Repetidas": a mesma parada duas vezes — travamento.

| Largura | Paradas na seção | Cards | Ordem visual | Sem anel | Fora da tela | Repetidas | Saiu para | Anel |
|---:|---:|---:|:--:|---:|---:|---:|---|---|
| 390 | 6 | 4 | sim | 0 | 0 | 0 | Entrar na comunidade oficial da Zero7 no WhatsApp | 2px rgb(29, 164, 243) |
| 1474 | 13 | 12 | sim | 0 | 0 | 0 | Entrar na comunidade oficial da Zero7 no WhatsApp | 2px rgb(29, 164, 243) |
| 390 aberta | 14 | 12 | sim | 0 | 0 | 0 | Entrar na comunidade oficial da Zero7 no WhatsApp | 2px rgb(29, 164, 243) |

Sequência em 390: Começando na Zero7 → Inscrição e Pagamento → Área do Trader e Plataforma Profit → Fase de Avaliação → Ver mais → Acessar a Central de Ajuda completa → (Entrar na comunidade oficial da Zero7 no WhatsApp)

Sequência em 1474: Começando na Zero7 → Inscrição e Pagamento → Área do Trader e Plataforma Profit → Fase de Avaliação → Aprovação no Plano → Fase Incubadora → Prêmio Incubadora → Migração para Conta Real → Conta Real e Saques → Aprovação Permanente → Resolução de Problemas → Termos, Privacidade e Atendimento → Acessar a Central de Ajuda completa → (Entrar na comunidade oficial da Zero7 no WhatsApp)

Sequência em 390 aberta: Começando na Zero7 → Inscrição e Pagamento → Área do Trader e Plataforma Profit → Fase de Avaliação → Aprovação no Plano → Fase Incubadora → Prêmio Incubadora → Migração para Conta Real → Conta Real e Saques → Aprovação Permanente → Resolução de Problemas → Termos, Privacidade e Atendimento → Ver mais → Acessar a Central de Ajuda completa → (Entrar na comunidade oficial da Zero7 no WhatsApp)

## Hover (1474)

- Movimento reduzido: borda rgba(255, 255, 255, 0.14) → rgba(29, 164, 243, 0.5); o card sobe 0px (`translate: none`, `transform: none`); a seta anda 0px e vai de rgba(255, 255, 255, 0.58) para rgb(29, 164, 243); sombra `none`; transições `border-color, translate` em `1e-05s`.
- Sem preferência de movimento: borda rgba(255, 255, 255, 0.14) → rgba(29, 164, 243, 0.5); o card sobe 1,6px (`translate: 0px -1.6px`, `transform: none`); a seta anda 2,4px e vai de rgba(255, 255, 255, 0.58) para rgb(29, 164, 243); sombra `none`; transições `border-color, translate` em `0.15s, 0.2s`.

## Busca

- 390: digitando "saque", 7 resultados ("7 resultados"), com a grade escondida: sim; o primeiro abre o modal: sim ("Janelas de saque do prêmio incubadora", 878 caracteres); Esc fecha: sim; "Limpar busca" volta à grade: sim.
- 1474: digitando "saque", 7 resultados ("7 resultados"), com a grade escondida: sim; o primeiro abre o modal: sim ("Janelas de saque do prêmio incubadora", 878 caracteres); Esc fecha: sim; "Limpar busca" volta à grade: sim.

## Do card ao artigo

- 390: o card abre o painel: sim (`position: relative`, depois de #faqMais, com X próprio: sim, 3 artigos; `aria-expanded` true; borda do card rgba(29, 164, 243, 0.5)). Um artigo abre o modal: sim (`position: fixed`), com o painel aberto por baixo: sim; diálogos abertos: 1; foco em Fechar. Esc fecha o modal: sim, o foco volta ao artigo: sim, o painel continua: sim. O mesmo card fecha o painel: sim (`aria-expanded` false).
- 1474: o card abre o painel: sim (`position: relative`, depois de #faqMais, com X próprio: sim, 3 artigos; `aria-expanded` true; borda do card rgba(29, 164, 243, 0.5)). Um artigo abre o modal: sim (`position: fixed`), com o painel aberto por baixo: sim; diálogos abertos: 1; foco em Fechar. Esc fecha o modal: sim, o foco volta ao artigo: sim, o painel continua: sim. O mesmo card fecha o painel: sim (`aria-expanded` false).
