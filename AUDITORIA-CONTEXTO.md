# Contexto da rodada de design — home Zero7

## O que é este projeto
Landing page estática da Zero7 Tesouraria, uma mesa proprietária de day trade.
HTML + CSS + JS puro, sem build step. Servida em produção em zero7.com.br/home/.
Local: index.html na raiz, servido por Live Server.

A rodada de refino de design (branch `design/refino`, fases 1 a 7) terminou em
10/09/2026, e a fase 8 refinou o celular a partir de capturas de iPhone real.
Este arquivo descreve a home **depois** delas. O ponto de partida
está em `medidas/baseline.md` e, lado a lado com o estado final, em
`comparacao.html`.

## Stack do front
- jQuery 3.6.0 (carregado no <head>, sem defer)
- GSAP 3.12.2 + ScrollTrigger — animações de entrada
- Swiper — carrossel de benefícios, de planos e da central de ajuda
- Lenis 1.1.14 — scroll suave
- AOS 2.3.1 — animações on-scroll
- countUp 1.9.3, ionicons 7.1.0

## CSS
**35 arquivos em `css/`, 228,4 KB no total** (sem o trabalho de outra
pessoa, contado com quebra de linha LF — o checkout no Windows converte para
CRLF e soma ~3%). `css/index.css` é só um
manifesto: 33 `@import` em cascata, todos com a query string
`?v=v87-fontes01`. O `index.html` carrega apenas o `index.css`.

**`css/tokens.css` é o primeiro `@import` e a fonte única de valores**: cor de
texto e superfície, marca, dourado, acentos, bordas, raio, espaço, elevação,
foco, movimento, famílias, pesos, degraus de tamanho e medida de linha — mais
um bloco de apelidos no fim, onde os nomes antigos do `global.css`
(`--primary-color`, `--bg-black`, `--ncs`, `--tts`…) apontam para os tokens.
São 1063 usos de `var()` no CSS. O `:root` do `global.css` guarda só o
`font-size` (50%, e 65% a partir de 1600).

Regra do `tokens.css`: **nunca pôr no `:root` um token que dependa de variável
de componente.** `var()` resolve onde a propriedade é declarada; lá, a variável
do componente não existe e o token nasce inválido — foi assim que o canto dos
botões chegou a zerar.

Os 32 de seção, na ordem do manifesto (depois de tokens.css):
global, acessibilidade, home, sectionDivisa, sectionCards, sectionTopicos, sectionDepoimentos,
sectionBa, sectionPlanos, sectionPlanosTematico, planosAtivo, sectionFaq,
sectionContato, divSuporte, navigation, button, componentes, divisor, head, buttonWpp,
modalDepoimento, tarja, tarjaNav, tarjaImage, popup, author, footer,
footerPagamento, coutdownDois, obrigado, verificado, 25k.

`acessibilidade.css` (anel de foco e movimento reduzido) vem logo depois do
`global.css`. `componentes.css` vem depois dos arquivos de seção: onde uma
regra genérica da seção (`.ba-card`, `.ba-card__overlay`) toca o mesmo
elemento com a mesma especificidade, o componente vence.

Dois arquivos sem função:
- **`divSuporte.css` — 0 bytes.** Está importado no `index.css` e não tem conteúdo.
- **`lines.css` — 1,7 KB, órfão.** Não é importado nem referenciado em lugar nenhum
  (`index.css`, `index.html`, `script/`).

Os cinco maiores concentram 36% do CSS: button (20,7 KB), sectionPlanos
(19,3 KB), sectionBa (15,5 KB), sectionFaq (13,6 KB) e componentes (13,3 KB).

Dois apelidos têm erro de grafia e ficam como lembrete: `--secondy-color` (de
*secondary*) e `--orange-blac`, que além de faltar o "k" não é laranja e só
existe por causa do irmão `--orange-black`.

### Cache busting — atenção antes de publicar
Todo CSS carrega com `?v=v87-fontes01`: uma vez no `<link>` do
`index.html`, uma vez em cada `@import` do `index.css` **e nas 10 outras
páginas que carregam o mesmo CSS** (`pedido-registrado/*` e `cert/`, 30
ocorrências). Quem muda CSS gira a string nos três lugares. O `.htaccess`
manda o navegador guardar CSS e JS por um ano (`immutable`), confiando no
`?v=`: sem girar, produção continua servindo a versão antiga.
O `package.json` tem um script `stamp` (`node ./tools/stamp-assets.js …`), mas
**`tools/` não existe no repositório** — `npm run stamp` quebra. O carimbo é
manual.

### Working tree compartilhado
O working tree tem trabalho de outra pessoa que não entrou em nenhum commit
desta rodada: a troca de campanha para MARGEM (`script/planos.json`, artes em
`assets/tarjapopup/`, linhas no `index.html`) e um destaque animado no chip
"Limite de perda total" dos planos (`css/limiteAlta.css`,
`script/limiteAlta.js`, uma linha no `index.css` e outra no `index.html`, com
o cache ainda em `v67`). `index.html` e `css/index.css` são commitados como
HEAD + só as mudanças da fase, e as medições rodam num worktree limpo, sem
esse trabalho.

## Seções da página, em ordem
#home (herói) · #divisa (números) · #ba (benefícios) · #topicos (como funciona) ·
#depoimentos · #plan (planos) · #faq (central de ajuda) · #contato · #footer ·
#pagamento · #author (aviso legal)

## Estado medido em 11/09/2026 — depois da fase 8

`medidas/fase8.md`, num worktree com o HEAD da rodada e sem o trabalho de
outra pessoa. Valores em px; "corpo" é o primeiro parágrafo longo (o do herói).

| Largura | :root | H1 | Corpo | Container | % da tela | Scroll-X | Altura da página |
|---:|---:|---:|---:|---:|---:|:--:|---:|
| 320 | 8 | 22 | 16 | 320 | 100% | não | 11702 |
| 375 | 8 | 26,1 | 16 | 375 | 100% | não | 10953 |
| 390 | 8 | 27,2 | 16 | 390 | 100% | não | 10783 |
| 430 | 8 | 30,1 | 16 | 430 | 100% | não | 10751 |
| 768 | 8 | 32 | 16 | 768 | 100% | não | 9708 |
| 1024 | 8 | 32 | 16 | 1024 | 100% | não | 10080 |
| 1280 | 8 | 39,9 | 12,8 | 1120 | 88% | não | 6060 |
| 1474 | 8 | 40 | 12,8 | 1120 | 76% | não | 6122 |
| 1920 | 10,4 | 61,9 | 16,6 | 1456 | 76% | não | 7523 |

Valores distintos entre os elementos renderizados em cada largura:

| Largura | raio | font-size | cor de texto | gap | assinaturas de botão |
|---:|---:|---:|---:|---:|---:|
| 320 | 12 | 21 | 11 | 8 | 4 |
| 375 | 12 | 22 | 11 | 8 | 4 |
| 390 | 12 | 22 | 11 | 8 | 4 |
| 430 | 12 | 22 | 11 | 8 | 4 |
| 768 | 12 | 21 | 11 | 8 | 4 |
| 1024 | 12 | 21 | 11 | 8 | 4 |
| 1280 | 12 | 24 | 11 | 8 | 4 |
| 1474 | 12 | 21 | 11 | 8 | 4 |
| 1920 | 12 | 23 | 11 | 9 | 4 |

Regressão, no mesmo worktree:

| Verificação | Resultado |
|---|---|
| CLS no carregamento, 375 / 390 / 430 / 1474 (alvo < 0,01; a maior de duas rodadas) | 0,0006 / 0,0071 / 0 / 0 — em 390 foi uma carga em cinco (as outras: 0 a 0,0001), um pico no #divisa que o HEAD da fase 7 também tem (0,0067) |
| CLS rolando, as mesmas larguras | 0,0009 / 0,0009 / 0,0008 / 0,0004 |
| Alvos de toque abaixo de 44×44, 375 / 320 / 390 / 430 | 0 / 1 / 0 / 0, de 48 — o de 320 é a tarja da campanha, com 43,5px |
| Fontes de movimento com `prefers-reduced-motion`, 1280 / 375 | 1 / 1, as duas do Zendesk (terceiro, regra 2): a mensagem proativa anima 200ms quando o botão aparece e some na dobra do #ba; o botão e a mensagem já entravam com 300ms. Da página, nenhuma |
| Travamentos de teclado, 1280 / 768 / 375 | 0 / 0 / 0 — 61, 54 e 53 paradas |
| Alvos de toque cobertos por outro elemento, 320 a 430 | nenhum |
| Scroll horizontal | nenhum, nas 9 larguras |

Como ler:
- **O H1 do desktop é 40px.** Os fracionários (29,9 / 39,9 / 61,9) são a curva
  do `clamp()`, não arredondamento.
- **1280 mede 6060px, antes e depois da fase 8**, seção por seção. Os 6003
  do `medidas/fase7.md` saíram, tudo indica, de uma carga sem as fontes do
  CDN: na fonte de fallback os títulos quebram menos e a página encurta. O
  mesmo HEAD, medido com o cache de fontes, dá 6060.
- **O container em 320 e 375 mede a janela inteira**: o headless não reserva os
  ~6px da barra de rolagem clássica. Números de ambientes diferentes não se
  comparam; entre fases, só o mesmo harness.
- **Os dois degraus do desktop.** Em 1080 a raiz sobe de 8px para 10px
  (fase 11, commit 2) e o texto acompanha os tokens que já trocavam ali: o
  corpo vai de 16px (celular) para 16px, o card da central de 17,6 / 16 /
  12,8 para 16 / 14 / 12. Em 1600 sobra o degrau do container (1120 →
  1456px) e o do h1 (40 → 56,8px), que estão em px desde o commit 1 e não
  dependem mais da raiz.
- **font-size segue em 21–24 valores por largura** de propósito (ver
  Tipografia).
- **Cor de texto em 11, não 7.** Dois não são cor: `rgba(0,0,0,0)` é texto com
  gradiente (`background-clip: text`) e `rgb(0,0,0)` é o `color` herdado desses
  mesmos títulos do #ba — a medição lê o valor, quem pinta é o gradiente. Três
  são acentos aprovados (os dois verdes do WhatsApp e o neon dos tópicos).
  Sobram **6 níveis reais**: título, corpo, secundário, desabilitado, marca e
  título-inverso — este exigido pelas seções claras (#topicos).
- Os véus translúcidos de modal e nav são literais de propósito (opacidade
  intencional) e não entram na contagem de cor.

## Tipografia

**Famílias:** NCS Radhiumz (display) + TT Fors Trial (corpo). O
`* { font-family: var(--tts) }` do `global.css` declara TT Fors em todo
elemento, e declaração direta vence herança: **os rótulos dos CTAs saem em TT
Fors**, embora a raiz do botão declare NCS. Só a nav herda a NCS
(`.btn--nav .btn__label`). "ÁREA DO TRADER" mede 94px em NCS e 72px em TT Fors.

**Raiz:** `:root { font-size: 50% }` → 8px no celular e no tablet, e
`62,5%` (10px) a partir de `min-width: 1080px` (fase 11, commit 2): na
faixa do desktop **1rem = 10px**, a convenção usual. O degrau de `65%` em
1600 saiu — ele punha a virada da raiz numa largura diferente da virada dos
tokens de texto, que é 1080. Abaixo de 1080 nada mudou: lá o rem segue
rendendo 20% menor do que aparenta.

**H1:** no desktop, `clamp(20px, 3.9vw - 10px, 40px)` — 32,1px em 1080 e 40 de
1282 em diante — e um segundo `clamp(52px, 1.6vw + 31.2px, 62.4px)` em xl. As
duas fórmulas estão em px desde a fase 11: em rem, com o termo negativo, o h1
encolheria se a raiz subisse.
Abaixo de 1080, três linhas no celular, a pedido do cliente: "O ECOSSISTEMA /
ACESSÍVEL PARA / OPERAR DAY TRADE.". É a única divisão em três linhas num
tamanho legível, e quem manda é a linha mais longa — "OPERAR DAY TRADE."
mede 13,08em na NCS. O tamanho, `min(4rem, (100vw − 2 × --esp-3) / 13.47)`,
é o maior em que ela cabe com ~3% de folga: 22px em 320, 26,1 em 375, 27,2
em 390 e 30,1 em 430, até o teto de 32px, que encosta na curva do desktop em
1080. No tablet o `text-wrap: balance` fecha em duas linhas ("O ECOSSISTEMA
ACESSÍVEL / PARA OPERAR DAY TRADE."). Entrelinha de 1,1 abaixo de 1080. O
critério de ≥32px em 375 da fase 1 não convive com três linhas: pediria
palavras diferentes.

**Título de seção: um tamanho só**, o `header h2` do `head.css`, no #ba,
#topicos, #depoimentos, planos, #faq e #contato: `--fs-1300` (24px) do lg em
diante; abaixo de 1080, `min(24px, (100vw − 4.8rem) / 16.4)` com
`text-wrap: balance` — 24px, mas nunca maior do que a coluna comporta para
"GRANDES PAGAMENTOS" (15,9em na NCS, a frase mais longa dos títulos) numa
linha: 17,2px em 320, 20,5 em 375, 21,4 em 390, 23,9 em 430 e 24 do 440 em
diante. Em 24px fixos o #depoimentos quebrava com PAGAMENTOS sozinho. O #ba e o #topicos mantêm o tracking de
−0,04em e a entrelinha de 1,05. Não há seção principal e secundária no
título: o tamanho maior que o #ba e o #topicos tinham não marcava isso — os
planos, a seção de conversão, usavam o menor —, punha o título acima do H1 no
celular (24 contra 20px) e quase empatado com ele no desktop (36,8 contra 40).

**Degraus de tamanho: 7 canônicos e 34 legados** (`tokens.css`). Código novo
usa só os canônicos:

| token | px (raiz 8) | papel |
|---|---:|---|
| `--fs-300` | 9,6 | legenda e navegação do desktop; contagem do card da central no desktop |
| `--fs-400` | 10,4 | texto de interface (seletor de mercado); foi o corpo do celular até a fase 8 |
| `--fs-500` | 11,2 | texto de card no desktop (#topicos, central de ajuda) |
| `--fs-650` | 12,8 | corpo e subtítulo do lg em diante; botão; no celular, piso de rótulo e de texto legal; título do card da central no desktop |
| `--fs-850` | 16 | **corpo no celular e no tablet**; título de card, preço |
| `--fs-900` | 17,6 | título de card no celular |
| `--fs-1300` | 24 | título de seção; nome do plano |

Os outros 34 se chamam `--corpo-legado-*` (de `-050` a `-2100`) e renderizam o
mesmo valor de sempre — só o nome marca a dívida, para que código novo não
alcance um deles sem perceber. São 114 usos canônicos e 88 legados. Colapsar
os legados move 62% dos textos no celular (190 de 306), delta médio de 9,1%:
é retipografia, com mudança visual como objetivo e aprovação. Quem mexer num
componente que usa um legado troca pelo canônico do papel. Acima de 24px não
há canônico: os números herói (preço, #divisa) e o H1 são display e têm
tamanho próprio.

**Piso de 16px no celular e no tablet (fase 8).** Abaixo de 1080 todo texto
de conteúdo — parágrafos, descrições de card, legendas, notas, e-mail e
links do rodapé — fica em 16px (`--fs-850`); CNPJ, barra legal e aviso
legal ficam em 12,8px (`--fs-650`), com piso de 12. **O card de plano é a
exceção, por decisão do cliente:** chips (rótulo em 8,4px, valor em 12px),
preço riscado e notinha ficam nos tamanhos de antes — em 16px os valores
quebravam em duas linhas na grade de três colunas e o card crescia. Lá só o
preço cresceu um pouco: o "12x" de 19,2 para 22,4px e, do 375 em diante, a
linha do à vista de 19,2 para 20,8px. O texto dos cards do #topicos também
fica abaixo, em 14px, a pedido do cliente — em 16px ficava grande demais.
Abaixo de 16 ficam ainda controle e rótulo: os rótulos de botão (10,8px no md, 12,8px no lg), o seletor de
mercado (10,4px), os indicadores de plano (11,2px), a contagem
da central (12,8px), os títulos de coluna do rodapé (12,8px) e o selo do
card recomendado (10px). Medido em `medidas/fase8-movel.md`. O corte é em
1080, e não em 640, para a letra não encolher ao passar do celular para o
tablet; o salto que sobra é o do desktop, cujo corpo aprovado é 12,8px.

**Medida de linha.** Na TT Fors o `ch` — a largura do "0" — rende ~1,23
caractere de texto corrido. `--medida-texto: 56ch` (~69 caracteres) vale para
os parágrafos das etapas do #topicos, o do #depoimentos, a nota da plataforma
sob os planos e o terceiro benefício do #ba no tablet, onde o card ocupa as
duas colunas. O herói usa `--medida-heroi: 65ch` (~81 caracteres): o bloco
compacto ali é intencional. Caracteres na linha cheia mais longa
(`medidas/fase7-acabamento.md`):

| Parágrafo | medida | 768 | 1024 | 1280 | 1474 | 1920 |
|---|---|---:|---:|---:|---:|---:|
| Herói | 65ch | 84 | 84 | 81 | 81 | 81 |
| #depoimentos | 56ch | 71 | 71 | 71 | 71 | 71 |
| Nota dos planos | 56ch | 77 | 77 | 77 | 77 | 77 |
| Etapas do #topicos (três) | 56ch | 58–61 | 70–72 | 56–63 | 56–63 | 56–63 |
| 3º benefício do #ba | 56ch | 72 | 72 | — | — | — |

A média das linhas fica 4 a 6 caracteres abaixo da mais longa (65 no
#depoimentos, 73 na nota, cujas palavras são mais curtas). No celular, e no
#topicos e no #ba do lg em diante, a coluna é mais estreita que a medida e o
texto ocupa a coluna.

Fica fora da medida o subtítulo do #contato (124 caracteres numa linha só, do
tablet em diante).

**#topicos:** os parágrafos das etapas, de 9 a 14 linhas, são centralizados,
como os títulos das etapas. A fase 7 os alinhou à esquerda; na fase 8 o
cliente pediu o centro de volta.

**Números:** `font-variant-numeric: tabular-nums` nos specs e preços dos planos
e nos valores do #divisa — 69 de 69 textos com dígito. A TT Fors tem
algarismos tabulares e os chips alinham coluna com coluna; **a NCS Radhiumz não
tem** ("1111" e "0000" seguem com larguras diferentes), então o parcelado, o à
vista e os números do #divisa ficam proporcionais, com a propriedade declarada.

**Caixa alta:** `--ls-rotulo: .05em` em botões, indicadores de plano, títulos de
coluna do rodapé e a tarja do card recomendado. O rótulo do contador da tarja
tem .06em e não se mexe (regra 5). Títulos têm o tracking próprio.

## Layout e responsividade

**Quatro breakpoints, um papel cada**, documentados no topo do `global.css` com
`--bp-sm/md/lg/xl` (media query não aceita `var()`, então os literais aparecem
nas regras; as propriedades existem para consulta e para o JS ler).

| tier | valor | papel |
|---|---|---|
| base | <640 | 1 coluna, 1 card por vez |
| `sm` | 640 | planos 2 cards · trio do #ba 2 col · rodapé 2 col |
| `md` | 768 | #topicos 2 col · FAQ 2 col (4 a partir de 1200, fase 10; três fileiras em repouso, fase 12) · suporte 2 col |
| `lg` | 1080 | desktop completo: 3 colunas, 3 cards; a raiz sobe para 62,5% |
| `xl` | 1600 | container 1456, nav e tarjas recuadas (a raiz já subiu em 1080) |

Abaixo de 1080 — celular e tablet — valem as regras de celular da fase 8:
menu com scrim, nav rolada com fundo sólido, carrossel de planos sem setas,
piso de 16px no texto de conteúdo e rodapé em duas colunas (ver Fase 8).

**Container:** `#home .wrapper` é `width: min(var(--container-max), 100%)` com
o `padding-inline: 2.4rem` — `--container-max` é 1120px e vira 1456px a partir
de 1600 (fase 11: em `140rem` ele seguia a raiz tipográfica).
Sem degraus fixos: 768 e 1024 usam a tela inteira. Não há container query nem
`repeat(auto-fit)`; há 13 `clamp()`.

**Carrosséis de planos:** `script/global.js` usa a config `breakpoints` do
Swiper, então girar o tablet troca o layout na hora. São dois: `.mySwiper4`
(6 cards, mini índice/dólar) e `.mySwiper11` (2 cards, bitcoin). Não há
breakpoint no JS.

Nas bordas (481, 540, 639, 640, 700, 767, 768, 800, 1023, 1024, 1079, 1080,
1199, 1599, 1600) nenhuma largura tem scroll horizontal, e os planos nunca
ficam abaixo de 2 cards acima de 640.

## Cor, raio, espaço, elevação e movimento

**Raio:** o botão usa `--raio-md` (16px) em md e lg e `--raio-sm` (8px) em sm;
o cap do ícone usa `--raio-pilula`, que o navegador reduz a meia altura.

**Espaço:** `--esp-1` a `--esp-8` = 4, 8, 12, 16, 24, 32, 48 e 64px no
celular e no tablet, e ×1,25 a partir de 1080 (5, 10, 15, 20, 30, 40, 60 e
80px), porque a raiz é 10px lá. Entre seções, 64px — no celular e no tablet, a
junção do #contato com o rodapé, dois pretos colados, soma 32 + 32 (fase 8). Dentro delas, um degrau por passo, igual
em toda seção (`head.css`): título → subtítulo `--esp-2`; texto → botão
`--esp-4`; cabeçalho → conteúdo `--esp-6` no celular e `--esp-7` do lg em
diante. Os planos ficam de fora: o respiro sob o título já soma o padding que
abriga o nome flutuante dos cards. Medido em `medidas/fase7-acabamento.md`: nenhum passo fora da escala em 375,
768, 1474 e 1920, fora um de propósito — o CTA dos cards do #topicos se
alinha na base de cards com textos de alturas diferentes, e a distância até
o texto é o que sobra.

**Elevação por papel**, em três níveis:
- **2 — destaque:** só o card do plano recomendado (o halo dourado).
- **1 — card de produto ou de conteúdo:** borda, e a resposta ao hover (cards
  de plano e da central de ajuda — nesta, a borda acende e o card sobe, sem
  sombra, fase 10). Os cards do #topicos, na seção
  clara, não têm borda: quem os separa do fundo é uma sombra curta
  (`--elev-1`), que vai a `--elev-2` no hover.
- **0 — informação e dado:** sem sombra de queda — os chips do card escuro (só o
  fundo; a borda fica transparente para o chip não mudar de tamanho, e na
  variante clara do bitcoin ela aparece), os cards de e-mail, endereço e
  horário do #contato, o card da central e a foto do #suporte, e as molduras
  do #divisa.

Blocos com sombra de queda, iguais em 375 e em 1474: **7** — o card
recomendado, o card do Academy Pass, o seletor de mercado dos planos (um
controle), os três cards do #topicos (a sombra curta) e o card do WhatsApp,
a ação principal do #suporte, que tem regra própria. Blocos com borda: 33.

**Movimento:** `--dur-rapida` (150ms, cor e borda), `--dur-media` (200ms,
sombra, brilho e deslocamento) e `--curva-saida` (desacelera e para, sem
rebote). Com `prefers-reduced-motion`, a rede do `acessibilidade.css` encurta
tudo e os deslocamentos de hover nem armam.
- **Botões:** primária em 200ms; secundária e texto em 150ms. O brilho que
  atravessa a primária no hover (.95s) fica.
- **Cards de plano:** a borda acende em 150ms e o card sobe 2px em 200ms; no
  recomendado, o dourado fica mais vivo. Só em ponteiro com hover — no toque o
  hover fica preso.
- **Cards da central de ajuda:** a linguagem do card de plano (fase 10) — a
  borda acende em 150ms; o card sobe .2rem e a seta desliza .3rem e acende,
  em 200ms. Só com hover.
- **Depoimentos e artigos da central:** 150/200ms.
- **#topicos:** o card sobe 4px em 200ms, só com hover.
- **Seletor de mercado dos planos:** o blob desliza em 200ms com a curva de
  saída, e o rótulo troca de cor em 150ms. Sem rebote.
- **Menu mobile:** o scrim entra e sai em 200ms com a curva de saída; o
  painel desliza como antes.
- **Laços decorativos:** o giro das bordas do #divisa dá uma volta a cada 12s,
  no celular e no desktop; o brilho dos cards do #divisa tem 6,5s, os blobs do
  #ba 18 e 22s, e o ponto do selo do Academy Pass 2,4s. Todos param com
  movimento reduzido.

**Foco:** ver Fase 5.

## Fase 4 — botões e componentes

### Botões: `.btn` em `button.css`

Três tamanhos × três ênfases, com o canto assimétrico como propriedade da
família:

| combinação | instâncias | visível |
|---|---|---|
| lg primária | herói, #depoimentos, 8× CONTRATAR PLANO | sempre |
| md primária | 3× "Ver Regulamento" do #topicos (`--acento`), "Entrar agora" do suporte (`--wpp`), nav dentro do menu mobile | sempre / menu aberto |
| sm primária | nav na barra desktop | ≥1080 |
| md secundária | "Fale Conosco", setas | sempre |
| md texto | hambúrguer | <1080 |
| sm secundária | fechar do painel e do modal do FAQ | só aberto |

**4 assinaturas por largura**; com a matiz separada, 5 até 1024 e 7 a partir
de 1280. Modificadores nomeados: `--wpp` (paleta do WhatsApp); `--acento` (a
cor vem do card — #topicos define `--btn-acento-1/-2`); `--promo` (verde de
campanha, dormente: nenhum card tem `.card--promo` hoje, mas o gancho
continua); `--bloco`, `--centro`, `--icone`; e `--nav` (md no menu mobile, sm
na barra). Maiúsculas só na ênfase primária: as outras não aplicam
`text-transform`, porque o texto delas já aparece em caixa mista (regra 1).

**As classes antigas ficam no HTML de propósito.** `z7-btnx`, `z7-btnx__*`,
`js-checkout`, `link4Selet` e os ids seguem nos elementos, ao lado das `btn*`:
- `blackPlanos.js` acha o CTA de checkout por `.js-checkout` ou `.z7-btnx` e
  reescreve o `href` com a query string (regra 4);
- o hover magnético e o ripple são um `<script>` inline do `index.html` que faz
  `querySelectorAll('.z7-btnx')`;
- gatilhos de clique do GTM podem usar "Click Classes contém z7-btnx" — e o
  clique quase sempre cai no `<span>` do rótulo, então as classes internas
  também contam (regra 2). A configuração do GTM não é visível daqui.

**O CSS aceita as classes antigas como apelido.** `pedido-registrado/*` e
`cert/` carregam este mesmo CSS e só têm `.z7-btnx` e `.z7-btnx--nav`. Os
seletores `.z7-btnx*` saem do `button.css` quando essas páginas migrarem; do
HTML da home, não.

O reset universal da nav desktop (`nav#navigation .wrapper *`) isenta a
subárvore do botão por `:where()`, sem mudar a especificidade do reset — por
isso não existe um arquivo de CSS só para restaurar o botão da nav.

**Rótulo acessível dos CTAs de plano:** `aria-label="Contratar plano <nome>"`,
com o nome como está no card — Trainee, Júnior, Pleno, Sênior, Expert, Master,
BIT 8 e BIT 16. O texto visível do botão diz "CONTRATAR PLANO (JUNIOR)", sem
acento; o rótulo segue a grafia do card.

### Chip, card de ajuda e card de benefício: `componentes.css`

- `.chip` — rótulo + valor dos cards de plano (60 instâncias). Nenhum JS
  depende das classes (`blackPlanos.js` usa `.js-max-dias`). A variante clara
  do bitcoin vem do contexto — `.planos.white` troca as custom properties —,
  sem classe por chip.
- `.card-ajuda` (+ `--compacto`) — categoria e resultado de busca da central de
  ajuda. Os cards são montados no `sectionFaq.js`; as classes novas ficam ao
  lado das antigas. A forma e a hierarquia de hoje são da fase 10.
- `.card-beneficio` — os três cards do #ba. As classes antigas ficam: o GSAP
  anima por `.ba-card--info` e o `sectionBa.js` acha os cards por
  `#ba .ba-card--info`. Fechado, o texto mostra três linhas, cortadas por
  linha com reticências (`-webkit-line-clamp`); a seta ao lado do título gira
  90° ao abrir. Abre no hover só com `(hover: hover)`, no toque em tela de
  toque e no foco de teclado; o `.is-open`, que o `sectionBa.js` aplica, é o
  estado aberto.

## Fase 5 — toque, foco e movimento reduzido

Medido por `scripts/a11y.mjs` (ver Harness); relatório final em
`medidas/fase7-a11y.md`.

### Alvos de toque

A métrica é o **alvo efetivo**, não a caixa: em contexto de celular
(`isMobile` + `hasTouch`, logo `pointer: coarse`), `elementFromPoint` ao longo
das duas retas que passam pelo centro de cada clicável, em quartos de pixel.
Conta padding e pseudo-elemento que estendem o alvo; desconta vizinho por cima
e o que está fora da tela. Entram só os clicáveis visíveis naquele momento;
o selo do Reclame Aqui e o Zendesk são de terceiros. Os controles que só
existem abertos — X do modal de depoimento, "fechar" do painel e do modal da
central, linhas de artigo e "Abrir no Zendesk" — têm alvo de 44.

Como cada um chega a 44, **sem mudar corpo de letra nem tamanho de ícone**:

| alvo | como |
|---|---|
| indicadores do carrossel | botões com o nome do plano, 44px de altura |
| links de navegação do rodapé e links legais (#author) | caixa `inline-flex` de no mínimo 44×44 |
| ícones sociais | caixa de 44×44; a primeira recua meia folga para alinhar ao título |
| botões md (hambúrguer, "Entrar agora", setas) | `--btn-h: max(5.4rem, 44px)` — +0,8px só com a raiz de 8px |
| logo da nav | o link cresce até 44 dentro da barra |
| seletor de mercado | `::after` estende o alvo até a borda interna da pílula |
| fechar do painel e do modal da central (sm) | `::before` de 44 |
| linhas de artigo do painel da central | `min-height: 44px` |
| "Abrir no Zendesk" | caixa de 44 |
| X do modal de depoimento | alvo de 44 acima do vídeo |

Onde vale: `(max-width: 1079.98px), (pointer: coarse)` — celular, tablet e
qualquer tela de toque, inclusive iPad em paisagem. No desktop com mouse só a
linha de indicadores muda.

### Indicadores do carrossel de planos

- São `<button>` com o nome do plano, montados pelo `renderBullet` do Swiper a
  partir do `.title h3` de cada card — o mesmo texto, em caixa alta como no
  HTML.
- **Acesos são os planos à vista** (`.is-na-tela`, lido de
  `swiper-slide-visible` com `watchSlidesProgress`): um no celular, dois no
  tablet, três no desktop. O `aria-current` fica com o Swiper, no slide ativo
  (o da esquerda).
- O bloco fica logo depois do `.swiper`, não dentro: as setas usam `top: 45%`
  da altura do `.swiper`, e a paginação no fluxo lá dentro as empurraria. As
  setas estão na ordem visual no DOM (anterior antes da próxima); a posição
  delas é absoluta.
- A altura é reservada no CSS, porque os botões só nascem quando o Swiper
  monta, depois do primeiro paint: 88px (duas linhas de três) abaixo de 640,
  44px de 640 em diante. O bitcoin reserva 44px no celular e nada de 640 em
  diante, onde os dois cards cabem e o Swiper esconde o bloco
  (`.swiper-pagination-lock`).
- No tema do mini índice a barra acesa é `--sup-clara`; na variante clara
  (bitcoin), `--marca`.
- Os slides fora da tela ficam `inert`. No celular os vizinhos que aparecem na
  borda não respondem ao toque; o arrasto continua, porque o Swiper escuta o
  contêiner.
- Abaixo de 1080 as setas saem (`display: none`), e os indicadores fazem o
  papel delas, junto com o arrasto: de 640 a 1079 elas cairiam inteiras fora
  da tela (o deslocamento de -16% é do card único do celular), e no celular
  ficavam metade para fora, cortadas na borda.

### Foco visível

- **Um anel só**, em `acessibilidade.css`: `:focus-visible` com
  `2px solid var(--foco-cor)` e recuo de 3px. O clique de mouse não acende; o
  Tab sempre acende. A cor tem 3:1 contra o fundo em volta: azul-claro
  (`--marca-clara`, 7,6:1) no escuro, azul-escuro (`--foco-cor-inverso`,
  10:1) na seção clara do bitcoin, onde o azul-claro cairia para 2,7:1.
- Nenhum componente tem anel próprio: botões, `.card-ajuda`, seletor de
  mercado, links da nav e busca da central usam o mesmo.
- O selo do Reclame Aqui vem com `outline: none` do script deles, dentro de um
  contêiner que corta a borda: o anel entra por dentro, escuro sobre o branco
  do selo. O script e o selo ficam como estão.

### Movimento reduzido

Com `prefers-reduced-motion: reduce`, rolando do topo ao fim, nada da página se
mexe. (O widget do Zendesk, no iframe dele, às vezes anima.)

| fonte | guarda |
|---|---|
| AOS (12 blocos) | `AOS.init({ disable })` — tira os `data-aos`, nada fica escondido |
| GSAP do #ba | `gsap.matchMedia` com `(prefers-reduced-motion: no-preference)` |
| Lenis | não é criado |
| `scroll-behavior: smooth` | rede do CSS; a central de ajuda rola com `behavior: 'auto'` |
| contadores do #divisa | começam no número final |
| vídeos do #ba (3) | param no primeiro quadro, sem novas tentativas |
| Swiper | `speed: 0` |
| giro das bordas do #divisa | bloco próprio com o mesmo seletor do `!important` do desktop |
| hover magnético dos CTAs | não arma |
| demais transições e animações CSS | rede em `acessibilidade.css`: 0,01ms e uma iteração |
| palavra do herói | troca sem animar (ver pendências) |

As 7 media queries locais antigas ficam: desligam a animação de vez, o que é
mais limpo que encurtá-la. O primeiro quadro dos três vídeos é uma imagem boa
(as duas pessoas e a tela do Academy Pass). Animação nova passa pela rede do
`acessibilidade.css` ou tem guarda no próprio script.

**Texto coberto.** Sem o AOS, nada segura por `transform` o conteúdo de uma
seção acima da imagem de fundo. No #depoimentos o conteúdo tem
`position: relative; z-index: 1` por isso; sem ele, título e parágrafo
afundariam atrás da imagem. A sonda de movimento confere que cada título e
parágrafo na tela é o que o `elementFromPoint` acha no próprio centro.

### Teclado, do topo ao rodapé

**Nenhum travamento em 1280, 768 ou 375**: a volta passa por 62, 54 e 55
paradas e chega ao fim da página. Todas as paradas têm o anel; as únicas sem indicador são os três
iframes do Zendesk e o do RD Station, e a única fora da vista é o iframe
invisível do RD.

O que garante isso:
- **Carrossel de planos:** os slides fora da tela ficam `inert`, então o Tab
  não entra num CTA escondido (antes, o Swiper deslizava até ele, o loop
  reordenava os slides e o foco voltava a um CTA já visitado). O Tab sai do
  carrossel em 12 paradas no desktop e 10 no celular; Enter num indicador
  troca o plano.
- **Menu mobile:** abrir leva o foco ao primeiro link; Esc e o X devolvem ao
  hambúrguer; sair com Tab fecha o menu; tocar no scrim, fora do painel, também.
- **Depoimentos:** os seis cards são alcançáveis (`role="button"`, 16 Tabs no
  desktop); o modal abre com o foco no X, prende o foco e o devolve ao
  depoimento.
- **Modal da central de ajuda:** abre com `aria-hidden="false"`, prende o foco
  e o devolve ao artigo de origem.
- **Cards de benefício do #ba:** o texto cortado se revela no foco.
- **`scroll-padding-bottom: 120px`** no `html`: o Tab rola o bastante para o
  AOS revelar o bloco (sem isso, o CTA da central recebia foco com
  `opacity: 0`) e para acima do botão do Zendesk. Âncoras alinham pelo topo,
  então os links internos não mudam.

## Fase 6 — hierarquia, elevação, ritmo e micro-interações

A elevação, o espaço e o movimento que esta fase definiu estão em "Cor, raio,
espaço, elevação e movimento"; a medida de linha, os números tabulares e a
caixa alta, em "Tipografia". Aqui fica o que cada seção põe na frente, e por
quê.

### Hierarquia — o que o olho encontra primeiro

| Seção | O olho encontra | O que sustenta isso |
|---|---|---|
| Herói | rosto → título → CTA | o parágrafo na medida do herói, em três linhas |
| #divisa | os números | — |
| #ba | vídeos e ACADEMY PASS | título e descrição do Academy Pass a 8px; respiro título → bento no degrau |
| #topicos | as três etapas | "Ver Regulamento" em md: em lg, saturados, eram os blocos mais altos da seção |
| #depoimentos | rostos e valores, com o título no padrão das seções | título pelo `head.css`; parágrafo no corpo (10,4px) |
| Planos | o card dourado e o preço | elevação só no recomendado |
| #faq | título → busca → cards | no card, título → descrição → contagem: tinta cheia, secundário e terciário (fase 10) |
| #contato | os dois cards de ação | véu da foto do card do meio em .30/.50 — o logo gravado nela roubava o olho |

Tudo por tamanho e cor de elementos que já existiam; nada foi acrescentado.

### Alinhamento óptico dos ícones

O centro de cada ícone fica a no máximo 1,9px do centro das maiúsculas do
texto ao lado (`medidas/fase7-acabamento.md`, medido pela caixa do ícone, não
pelo traço). A seta dos cards de benefício do #ba acompanha a primeira linha
do título, não o bloco: `align-items: flex-start` no cabeçalho e um
`margin-top` que centra o ícone na linha. A seta do link da central (#faq) e
os ícones das pílulas do #suporte sobem com `translate: 0 -.25em`. Os
pictogramas de 66px do #contato se centram no bloco de texto.

## Fase 7 — fechamento da rodada

Decisões desta fase, que valem daqui em diante (detalhe nas seções acima):
- **Medida de linha em 56ch** (`--medida-texto`), também na nota dos planos e
  no terceiro benefício do #ba no tablet; o herói fica em 65ch
  (`--medida-heroi`).
- **#topicos alinhado à esquerda** nos parágrafos das etapas — revertido na
  fase 8, a pedido do cliente: voltaram ao centro.
- **Um tamanho de título de seção**, o do `head.css`.
- **Seletor de mercado sem rebote** (a curva de 450ms passava do alvo e
  voltava) e **giro das bordas do #divisa em 12s** (dava a volta em 4,5s no
  celular e 5s no desktop).
- **`aria-label` dos CTAs de plano** com o nome do card — cinco diziam outro
  plano. Correção de contradição entre o rótulo acessível e o texto na tela,
  não copy nova.
- **Dívida de tipografia marcada**: 7 degraus canônicos, 34 `--corpo-legado-*`,
  nenhum valor mudou.
- **`comparacao.html`**, na raiz: baseline × fase 7 lado a lado nas 7
  larguras, com seletor de largura e a tabela de medidas das duas pontas.
  Abre direto no navegador, sem dependência externa. As capturas vêm de
  `shots/` por caminho relativo — como `shots/` fica fora do git, a página só
  mostra as imagens onde elas existem (`node scripts/shots.mjs fase7` refaz as
  do fim da rodada; as da baseline exigem o commit `630eb1f`).

## Fase 8 — refino mobile (iPhone real)

Rodada feita a partir de capturas de iPhone no Safari. Tudo vale abaixo de
1080 — a mesma faixa do menu hambúrguer e da regra de toque; o tablet
acompanha o celular, para a letra não encolher ao passar de 639 para 640. O
desktop só muda no que o cliente pediu para todas as larguras: o texto das
etapas do #topicos centralizado, o corte por linha dos cards do #ba, o ano
do © e o botão do Zendesk a partir do #ba. Os retratos de layout contra o
HEAD da fase 7, com as mesmas fontes carregadas dos dois lados, confirmam:
em 1474, 634 elementos iguais, 19 mudados — os três primeiros pedidos — e
nenhum deslocado; em 1280, os mesmos, mais os três contadores do #divisa,
que na captura do antes ainda estavam em 0 (estado da contagem, não layout)
(`medidas/retrato-fase8-antes-x-fase8-1474.md` e `-1280.md`; o CNPJ da barra
legal ganhou uma classe e aparece como "sumiu" + "novo"). Relatórios da fase:
`medidas/fase8-antes*.md` (o HEAD da fase 7 nas larguras novas) e
`medidas/fase8*.md`. Do antes, a sonda do celular, a dobra e os retratos
foram refeitos no fim, com o mesmo harness do depois; o `fase8-antes.md` e o
`fase8-antes-a11y.md` são da rodada de base do começo da fase, antes do cache
de fontes.

### Larguras de iPhone no harness

390 e 430 entraram em `LARGURAS` (`scripts/lib/pagina.mjs`), então shots,
medir e acabamento rodam em nove larguras, e a sonda de toque do `a11y.mjs`
em quatro (320, 375, 390, 430). Com só 320 e 375 os problemas desta fase não
apareciam: o menu, por exemplo, estourava em 320, 375 e 390 e não em 430.

### Bugs

- **Menu mobile.** O painel ia até `right: -5%`, com 60vw fixos e respiro só
  à esquerda: COMUNIDADE e ÁREA DO TRADER passavam da borda, com o ícone e a
  seta fora da tela. Agora ele encosta na borda, cresce até o botão mais
  largo caber (nunca abaixo dos 60vw nem acima da tela), tem respiro dos dois
  lados e altura pelo conteúdo, com no mínimo 60vh — eram 50vh e o painel
  acabava no meio da tela; o cliente pediu um pouco mais —, com rolagem
  própria. Medido: em 320, 375 e 390 os dois botões passavam da tela (em 430
  e 768, não); depois, nenhum, em nenhuma largura.
- **Scrim.** `.menu-scrim`, preto a 60%, criado pelo `global.js` direto no
  `body`: o `backdrop-filter` da nav vira bloco de contenção do `position:
  fixed`, e um scrim dentro dela cobriria só a barra. Fecha o menu no toque;
  a transição (200ms) some com movimento reduzido.
- **Nav sobre a seção clara.** Rolada, abaixo de 1080, a nav tem fundo sólido
  do token de superfície (`--sup-fundo`) e nenhum `backdrop-filter` — a
  solução mais simples que funciona sobre qualquer seção, sem detectar qual
  está embaixo. O vidro com `saturate(180%)` sobre o #topicos virava uma
  faixa cinza-esverdeada. No topo da página, sobre o herói escuro, o vidro
  fica.
- **Cards de benefício do #ba.** O `sectionBa.js` só abre no `mouseenter`
  com `(hover: hover)`; em tela de toque, abre e fecha no toque (`click`), e
  o `.is-open` é o estado aberto nos dois casos. No CSS, o `:hover` mora num
  bloco `(hover: hover)`. O corte fechado é por linha, com reticências
  (`-webkit-line-clamp: 3`), e a seta ao lado do título gira 90° ao abrir. O
  texto inteiro continua no DOM: o leitor de tela lê tudo.
- **Academy Pass.** Abaixo de 1080 o véu sobre o vídeo é uma elipse firme na
  faixa do texto (.86 no centro), que se abre para as bordas.
- **Nota da Profit One.** Ela não mora num `.wrapper`: o limite passou a ser
  `min(56ch, 100% − 4.8rem)`, o respiro do `.wrapper` dos dois lados. Margem no celular: 0/0 → 19,2/19,2px,
  igual à do carrossel.
- **Setas do carrossel de planos.** Saem abaixo de 1080 (antes, só de 640 a
  1079): no celular ficavam metade para fora da tela, e trazê-las para dentro
  as poria sobre os chips. Os indicadores com o nome do plano e o arrasto
  fazem o papel delas.

### Tipografia no celular e no tablet

- **Piso de 16px** em todo texto de conteúdo abaixo de 1080 (ver
  Tipografia): eram 45 textos de conteúdo abaixo de 16px em cada
  largura de celular, agora 0 — fora os de dentro do card de plano, que
  ficaram como eram, e o texto dos cards do #topicos, em 14px: as duas
  exceções foram pedidas pelo cliente (ver abaixo). Aviso legal de 8 para 12,8px, à esquerda e
  no peso normal; barra legal em 12,8px.
- **H1:** em três linhas no celular, a pedido do cliente — "O ECOSSISTEMA /
  ACESSÍVEL PARA / OPERAR DAY TRADE." —, com 22px em 320, 26,1 em 375, 27,2
  em 390 e 30,1 em 430 (era 20px). Antes ele foi a 32px em 375, o critério
  da fase 1, com a palavra rotativa em linha própria: quatro linhas, e o
  cliente preferiu três. Três linhas só cabem com a linha mais longa
  ("OPERAR DAY TRADE.") inteira, e isso limita o tamanho; o PARA volta ao fim
  da segunda linha. Entrelinha de 1,1.
- **Herói:** descrição em 16px (era 10,4); margem lateral de 19,2 para 12px
  abaixo de 640. A foto é posicionada, não `object-fit`, então o
  `object-position` não teria efeito: o que desce o rosto é o deslocamento
  dela, de `top: 6%` para 108px abaixo de 640, e o cabelo sai de baixo da
  nav. O texto desce menos que a foto — o `margin-top` de 60% passou a
  `calc(14.75rem + 30.5vw)`, que acompanha o queixo (ele desce com a
  largura, porque a foto ocupa a tela toda) e deixa o H1 a ~18px dele —,
  porque o botão tem que aparecer sem rolar no navegador do Instagram, de
  onde vem a maior parte das visitas e cuja área visível é menor que a tela
  (pedido do cliente). Nas áreas visíveis estimadas do navegador do
  Instagram (`medidas/fase8-dobra.md`), a base do botão fica em 612, 624 e
  634px nos iPhones mini, 13–15 e Pro Max (375×640, 390×672, 430×760), com
  28, 48 e 126px de folga. É ~110px mais baixo que na fase 7 (499, 512, 546
  — `medidas/fase8-antes-dobra.md`), pela descrição em 16px, pelo H1 maior e
  pela foto mais baixa: nas telas de 375×667 (iPhone 6s/7/8 e SE 2/3, ~550px
  visíveis) o botão agora pede uma rolada curta (base em 612, contra 499), e
  o cliente preferiu deixar assim. No SE de 1ª geração (320×460) ele já
  ficava abaixo da dobra (467 → 590).
- **Títulos de seção:** um tamanho fluido abaixo de 1080 (ver Tipografia),
  `min(var(--fs-1300), (100vw − 4.8rem) / 16.4)`: o maior em que "GRANDES
  PAGAMENTOS", a linha mais longa, cabe na coluna com ~3% de folga. Dá
  17,2px em 320, 20,5 em 375, 21,4 em 390, 23,9 em 430 e 24 dali em diante
  (eram 17,6 do celular até 1079). Com balance, as quebras que deixavam uma
  palavra sozinha — "Conheça os Benefícios / Zero7" de 320 a 390,
  "HABILIDADES EM GRANDES / PAGAMENTOS" em 375 e 390 — viraram "Conheça os /
  Benefícios Zero7" e "TRANSFORME SUAS / HABILIDADES EM / GRANDES
  PAGAMENTOS".
- **#topicos:** texto dos cards em 14px (era 11,2) e centralizado, os dois a
  pedido do cliente: em 16px ficava grande demais nos cards, e a fase 7 o
  tinha alinhado à esquerda.
- **#depoimentos:** parágrafo em 16px (era 10,4). A restrição que o deixava
  estreito era a própria medida de 56ch: em 430, com 10,4px, ela dava 368px
  numa coluna de 392. Em 16px os 56ch passam da coluna, e ele ocupa a largura
  toda. O CTA vai na largura do wrapper.
- **Card de plano:** fica fora do piso, por decisão do cliente — em 16px os
  valores dos chips quebravam em duas linhas e o card crescia. Só o preço
  cresceu um pouco: o "12x" de 19,2 para 22,4px; do 375 em diante, a linha
  do à vista de 19,2 para 20,8px (em 320 ela quebraria). Por isso os rótulos
  dos chips seguem em 8,4px, abaixo do piso de 12px de rótulo de chip do
  pedido original — é a mesma decisão.

### Rodapé

- **Bloco de marca:** logo, CNPJ e o selo do Reclame Aqui. O CNPJ entrou
  como uma segunda cópia do mesmo texto, visível só abaixo de 1080; a da barra
  legal some nessa faixa e segue no desktop. Rodapé e barra legal são seções
  diferentes: sem a cópia, o CNPJ não teria como mudar de lugar só no
  celular. O selo do Reclame Aqui fica no
  fluxo do bloco, inteiro e alinhado à esquerda, com 12px de respiro. Nas
  capturas do harness ele não aparece cortado nem antes nem depois: o corte
  na base visto no aparelho não se reproduz aqui, e o selo é montado pelo
  script do Reclame Aqui (terceiro, regra 2).
- **Endereço e horário** saem do rodapé abaixo de 1080 — ficam no #contato,
  logo acima.
- **NAVEGAÇÃO e SUPORTE lado a lado; SOCIAL numa linha**, com rótulo e ícones
  de 44px juntos. Altura do rodapé em 375: 732,5 → 595,5px. Os links seguem
  com alvo de 44px (fase 5), então o passo entre eles não desce disso: o que
  encurta o rodapé são as duas colunas.
- **Links e e-mail** em 16px, no secundário e no peso normal — o peso leve
  apagava a letra; o token já era o secundário (contraste de 9,9:1).
- **Pagamento:** rótulo numa linha própria e as seis bandeiras numa fileira,
  com 16px de altura (eram 20,2).
- **Barra legal:** o © leva o ano corrente pelo `global.js` (o HTML traz
  2025); os três links de política ficam numa linha, com um divisor entre
  eles (em 320 quebram em duas). Aviso legal à esquerda, em 12,8px.
- **"Fale Conosco"** na largura do card (continua md secundário), e **64px
  entre o #contato e o rodapé** — 32 no fim de um e 32 no começo do outro,
  com o filete do rodapé no meio. Eram 128px de preto.

### Botão do Zendesk

A pedido do cliente, o botão flutuante do suporte (Zendesk Messaging) só
aparece a partir da dobra dos benefícios, em todas as larguras: escondido
enquanto o topo do #ba está abaixo da base da tela, visível dali em diante.
No herói, ele e a mensagem proativa cobriam a descrição e o CTA. É uma
exceção à regra 2 autorizada pelo cliente, e o snippet continua igual: o
`global.js` só chama a API documentada do Messaging (`zE('messenger',
'hide' | 'show')`), a partir de um `IntersectionObserver` no #ba com uma
margem de cima enorme — assim até um salto de âncora que pula a seção
inteira muda o estado. Com a conversa aberta nada se esconde; ao fechá-la, o
botão volta a seguir a posição da página. Medido em 375×640 e 1474×900:
escondido no topo por 14s seguidos, sem piscar na carga; aparece quando o
#ba cruza a dobra; some ao voltar ao topo, inclusive num salto direto do
#plan. Se o snippet não carregar (bloqueador), o bloco não faz nada.

### Verificação

Num worktree limpo — HEAD da fase 7 mais só as mudanças desta fase, sem o
trabalho de outra pessoa —, com o mesmo harness dos dois lados: as fontes do
CDN servidas do cache local (ver Harness). O "antes" é o HEAD da fase 7
medido nas larguras novas (`medidas/fase8-antes*.md`).

| Verificação | Antes (fase 7) | Depois |
|---|---|---|
| Texto de conteúdo abaixo de 16px, em cada largura de 320 a 430 | 45 | 0 — fora as duas exceções do cliente (34 textos: os de dentro do card de plano e o dos cards do #topicos) |
| Rótulo de chip / aviso legal | 8,4 / 8px | 8,4px (exceção do cliente) / 12,8px |
| Elemento fora da tela — passando da viewport / cortado por um ancestral —, 320 a 1474 | 0 / 2, de 320 a 430 | 0 / 0; scroll horizontal em nenhuma das nove larguras |
| Menu aberto: botões fora do painel ou da tela | COMUNIDADE e ÁREA DO TRADER em 320, 375 e 390; sem scrim | nenhum, em nenhuma largura; o scrim fecha no toque |
| Card do #ba em tela de toque: abre ao roçar / abre no toque | sim / não, de 320 a 768 | não / sim, e fecha no segundo toque |
| CLS na carga, 375 / 390 / 430 / 1474 (a maior de duas rodadas) | 0,0022 em 375; 0 em 1474 | 0,0006 / 0,0071 / 0 / 0 — o 0,0071 foi uma carga em cinco, um pico no #divisa que o HEAD da fase 7 também tem |
| CLS rolando, as mesmas larguras | 0 em 375; 0,0004 em 1474 | até 0,0009 |
| Alvos de toque abaixo de 44×44, 375 / 320 / 390 / 430 | 0 de 50 / 1 de 50 (a tarja) | 0 de 48 / 1 de 48 (a tarja) / 0 de 48 / 0 de 48 — os dois a menos são as setas do carrossel |
| Teclado, 1280 / 768 / 375: paradas; travamentos | 62 / 54 / 55; 0 | 61 / 54 / 53; 0 — em 375 saíram as duas setas do carrossel; em 1280, o iframe do RD Station, terceiro, que entra ou não conforme a carga |
| Movimento com `prefers-reduced-motion`, 1280 / 375 | 1 / 0, do Zendesk | 1 / 1, do Zendesk: a mensagem proativa anima ao aparecer e sumir com o botão; da página, nada |
| Desktop: retrato de layout 1474 / 1280 | — | 19 / 25 mudados, só os pedidos (e os contadores do #divisa em 1280); 0 deslocados; altura da página igual, seção por seção |
| Altura do rodapé, 375 / 768 | 732,5 / 454px | 595,5 / 595,5px — em 768 ele segue o do celular |
| Vão entre #contato e rodapé, de 320 a 768 | 128px | 64px |
| Base do botão do herói na dobra do Instagram, 375×640 / 390×672 / 430×760 | 499 / 512 / 546 | 612 / 624 / 634 — visível nos três |

## Fase 9 — divisor de seção candles (#divisa → #ba)

A transição entre #divisa e #ba é um divisor de seção em forma de fita de
candles. Saiu de um laboratório de quatro variantes (corte, chanfro, candles
e fio), comparadas na página real; as outras três e o seletor foram
apagados.

### O componente

- **A forma é o recorte da própria seção de baixo** (`css/divisor.css`). O
  #ba leva `secao--divisor secao--divisor-candles`: sobe por cima do fim do
  #divisa (margin-top negativa, a altura da fita) e tem o topo mascarado em
  barras. Não há tira nem fundo próprio: as barras são o próprio #ba — a
  imagem de fundo dele, recortada —, então leem como a seção subindo e
  continuam a imagem sem emenda; entre e acima delas aparece o #divisa de
  verdade. Para reaproveitar em outra transição, basta a classe na seção de
  baixo e a folga embaixo da de cima.
- **Sem espaço novo dentro do #ba.** A subida volta num espaçador no topo
  (`::before`, da altura da fita), então o conteúdo do #ba fica onde estava.
  O espaçador faz o papel do padding-top compensatório sem precisar saber o
  padding de cada seção — no #ba ele vem de uma regra de id, que uma classe
  não sobrescreve.
- **Folga.** O padding-bottom do #divisa é `--divisor-folga +
  --candles-pico` — a folga desejada mais a altura da barra mais alta —,
  para a folga real contar do pico da fita e não da base. `--divisor-folga`
  vai de `--esp-7` (48px) no celular a `--esp-8` (64px) a partir de 1080, o
  ritmo das seções no desktop, em linha reta: `clamp(var(--esp-7), 5.16rem +
  2.1vw, var(--esp-8))`. Os tokens da fita moram no `:root` do
  `divisor.css`, porque a seção de cima também os lê.
- **Nenhuma cor de superfície no divisor.** Os topos acesos são o `::after`
  do #ba, pintado com `--divisor-aresta: var(--marca)` e recortado pela
  mesma geometria. Nada anima, nada recebe foco nem é lido por leitor de
  tela, e a altura é fixa por escala: a fita não mexe no CLS.

### A fita

- **Ladrilho longo**, para o olho não pegar a repetição: 21 barras de 7px a
  cada 16px (336 × 44px), com alturas 14, 22, 11, 30, 18, 9, 25, 36, 20, 13,
  28, 16, 10, 33, 21, 12, 26, 19, 8, 31 e 17 — 4,5:1 entre a menor e a
  maior. No celular (abaixo de 640), as 12 primeiras escaladas para 30px de
  altura (10, 15, 8, 20, 12, 6, 17, 25, 14, 9, 19 e 11), em barras de 5px a
  cada 12px (144 × 30px). Em px reais, repetido na horizontal a partir da
  borda esquerda, sem esticar — centralizado, em largura ímpar (375, 393, o
  desktop com barra de rolagem) o ladrilho caía em meio pixel e borrava as
  bordas das barras.
- **Azul só nos picos.** A barra mais alta do ladrilho ganha topo de 3px no
  azul da marca; a segunda e a terceira, 2px no mesmo azul a 35%. As outras
  não têm topo aceso.
- **Pontas.** A faixa das barras é a intersecção do ladrilho com um degradê
  de 24px nas duas extremidades: o ladrilho não fecha conta com a largura da
  tela, e assim a fita nasce e morre em vez de terminar numa meia barra.
- **Máscara.** Três camadas no #ba — o resto da seção inteiro, somado ao
  degradê das pontas cruzado com o ladrilho —, com `mask-composite: add,
  intersect` e o equivalente `-webkit-` (`source-over, source-in`).

### Verificação

Pelo `scripts/divisor.mjs` (`medidas/divisor.md`), sem capturas, em 320,
375, 390, 430, 768, 1024, 1280, 1474 e 1920:

- **Folga dos cards ao pico da fita** igual à do CSS em todas: 48px em 320,
  49,5 em 390, 57,4 em 768, 62,8 em 1024, 64 em 1474 e 83,2 em 1920 (a
  partir de 1600 a raiz sobe para 10,4px e a página inteira escala junto).
- **Da base da fita ao título** CONHEÇA OS BENEFÍCIOS ZERO7: 80px até 1024,
  100 em 1280 e 1474, 104 em 1920 — o padding-top do #ba, que não mudou.
  Dos cards à base são 73 a 119px, então a fita fica praticamente no meio
  do caminho (em 1474, 100 e 100).
- **Sem meia barra nas bordas.** Nas 3 colunas de cada ponta, a maior
  diferença de cor contra o fundo de cima fica entre 0 e 3 (0–255), contra
  196 no miolo.
- **Fita visível** em todas: barra em 41–42% das colunas do miolo no
  celular (5 de cada 12px) e 43,8% no desktop (7 de cada 16px); o topo
  aceso da barra mais alta a 4,88:1 contra o fundo.
- **Sem faixa chapada, imagem contínua.** O elemento antes do #ba é o
  #divisa, sem nada no meio; a imagem de fundo do #ba começa no topo dele;
  e na base da fita, dentro das barras, a diferença entre a linha de cima e
  a de baixo fica em 4–6, a mesma de duas linhas quaisquer da imagem (3–6).
- **Ladrilho em pixel inteiro.** Centralizado, em 375 as barras davam 50,5%
  do miolo e a costura 16: o ladrilho caía em meio pixel. Ancorado na borda
  esquerda, 41,3% e 5.
- **CLS sem regressão**, duas rodadas: carga 0 em 375 e 1474; rolagem
  0,0005 e 0,0009 em 375, 0,0004 e 0,0004 em 1474 (fase 8: carga 0,0006 e
  0; rolagem até 0,0009 e 0,0004). A âncora do ladrilho, trocada depois, é
  só pintura.
- **Seletor ausente** com `?divisor=chanfro`, com `?dev=1` e sem parâmetro:
  nenhum seletor na página, o #ba com `secao--divisor
  secao--divisor-candles` e nenhum pedido do `divisor.js`.
- **Sem rolagem lateral** em nenhuma largura. A página cresce 9 a 57px em
  relação à fase 8 — a folga maior embaixo do #divisa, de propósito.

### Harness

- `scripts/divisor.mjs` mede o divisor em cada largura: a folga real, do
  card mais baixo do #divisa ao pico desenhado da fita; a folga até o
  título; as pontas; a fita visível; a costura na base; e o seletor do
  laboratório, que tem de estar ausente. A faixa do topo é fotografada só
  para as contas; nada é salvo.
- `PAGINA_QUERY` (`scripts/lib/servidor.mjs`) acrescenta uma query à URL da
  home em todo script.

## Fase 10 — card da central de ajuda (#faq)

A grade de categorias ficou; o card foi refeito sobre o componente da fase 4
(`.card-ajuda`, em `componentes.css`), só com tokens e componentes que já
existiam. Medido em `medidas/faq.md` (depois) e `medidas/faq-antes.md` (o
HEAD da fase 9), no mesmo harness.

### O card

- **Saíram** o trilho azul da borda esquerda (igual em todos os cards, não
  distinguia nenhum), a pílula azul da contagem, o chevron e qualquer sombra.
- **Forma e superfície.** O canto assimétrico da marca, `--raio-assinatura`
  (16px 0 16px 0; 20,8px acima de 1600) — o dos botões. Fundo `--sup-card`,
  liso, borda de 1px em `--borda-sutil`, padding `--esp-5`. O
  `--sup-ajuda`, que o card usava, é um gradiente.
- **Hierarquia.** Título um degrau acima do que era, peso 600, tinta cheia;
  descrição um degrau abaixo do título, no secundário, cortada em duas
  linhas com reticências (`line-clamp: 2`); contagem no menor degrau, no
  terciário (`--cor-desabilitado`, o nível abaixo do secundário), com
  algarismos tabulares. O "mono" do pedido é isso: a TT Fors tem algarismos
  tabulares, e uma família monoespaçada seria vocabulário novo. No desktop,
  12,8 / 11,2 / 9,6px — eram 12 / 10,4 / 8,8, com a contagem em azul, peso
  600, numa pílula. No celular e no tablet o título fica nos 17,6px (um
  degrau acima seria 24px, o tamanho do título da seção), a descrição no
  piso de 16px da fase 8 e a contagem, que é rótulo, em 12,8px.
- **Rodapé.** Contagem à esquerda, seta à direita (`arrow-forward-outline`,
  o ícone do CTA da seção), na base do card (`margin-top: auto`). A seta
  não é botão e tem `aria-hidden`: sem ele o ion-icon entra no nome do
  botão — o chevron entrava como "chevron down outline".
- **Um controle só.** O card já era um `<button>` e o único focável dele —
  a sonda acha 1 por card também no antes. O que mudou por dentro: tudo é
  `<span>` (havia um `<div>` dentro do botão, que o HTML não permite), e o
  card diz se o painel dele está aberto (`aria-expanded`): o chevron que
  girava era o único sinal disso, e saiu. Aberto, a borda fica acesa.
- **Interação: a do card de plano.** No hover a borda vai para
  `--borda-acesa` (o azul-claro da marca a 50%, que o card de plano usava
  como literal e agora vem de token, nos dois), o card sobe .2rem e a seta
  desliza .3rem e acende em `--marca-clara`; borda e cor em
  `--dur-rapida`, deslocamento em `--dur-media`, curva `--curva-saida`.
  Só com `(hover: hover)` — no toque, o card inteiro é o alvo —, e com
  movimento reduzido nada se desloca. Foco: o anel único da fase 5, que
  segue o canto.

### Grade

1 coluna abaixo de 768, 2 de 768 a 1199 e 4 de 1200 em diante, com
`gap: --esp-4` e colunas em `minmax(0, 1fr)`. 1200 é um degrau só desta
grade, pedido na fase. Todas as fileiras têm a mesma altura
(`grid-auto-rows: 1fr`): a descrição para em duas linhas, mas o título
quebra em uma ou duas conforme a largura.

**Sem paginação.** O limite de 6 era do front — o `sectionFaq.js` fatiava a
lista (`CATEGORIES_PER_PAGE`) —, e a API já entrega tudo numa chamada
(`page[size]=100`, `has_more: false`). São **12 categorias**, e não 8:
com quatro colunas, três fileiras cheias; no celular, doze cards em pilha,
e o #faq passa de 1.435 para 2.791px em 390 (em 1474, de 656 para 865px). A contagem de artigos também vem inteira numa chamada
(32 artigos). Saíram o bloco da paginação do HTML, o código dela no JS e as
regras no CSS.

### O resto da seção

- **Busca:** o canto e a superfície do card. No foco, a borda acende em
  `--marca` e o anel único vem junto; o brilho azul de 3px que ela tinha
  era um segundo anel e saiu. O placeholder não mudou.
- **"Acessar a Central de Ajuda completa"** era o `.btn` md secundário da
  fase 4 (`btn btn--md btn--secundaria`, com o canto da família). Saiu na
  fase 13.
- **Modal do artigo:** `--raio-assinatura`.

### Dois relatos, sem conserto

- **A busca funciona.** Ela consulta a API de busca da central
  (`/api/v2/help_center/articles/search.json`), que responde: "saque" dá 7
  resultados, "regras" 10 e "plano" 27 (a página mostra os 20 primeiros).
  Na página, digitar esconde a grade e lista os resultados (no mesmo card,
  na variante compacta); um resultado abre o artigo no modal, Esc fecha e
  "Limpar busca" volta à grade — em 390 e em 1474, antes e depois.
- **"Modal dentro de modal".** São duas camadas de tipos diferentes. O card
  abre um **painel no fluxo da página**, embaixo da grade, com moldura e X
  próprios — parece um modal, mas não é (`position: relative`, sem
  `role="dialog"`) —, e a página rola até ele. Um artigo do painel abre o
  **modal de verdade** (fixo, com véu e foco preso), com o painel aberto por
  baixo; fechado o modal, o foco volta ao artigo e o painel continua. No celular, com os doze cards em pilha, o painel
  nasce a uns 2.400px do primeiro card (em 390). Não mexi.

### Verificação

Pelo `scripts/faq.mjs` (`medidas/faq.md` e, do HEAD da fase 9,
`medidas/faq-antes.md`), sem capturas, em 320, 375, 390, 430, 767, 768,
1024, 1199, 1200, 1280, 1474 e 1920; e pelo `a11y.mjs`
(`medidas/fase10-a11y.md`):

- **Grade correta em todas:** 1 coluna até 767, 2 de 768 a 1199, 4 de 1200
  em diante (três fileiras de quatro). Nenhum card fora da grade, nenhum
  conteúdo fora do card, nenhuma rolagem lateral; a paginação não existe
  mais.
- **Mesma altura em todos os cards** de cada largura: 185,6px de 320 a 390,
  162,8px de 430 a 1024, 154,3px de 1200 a 1474 e 200px em 1920 (antes,
  133 a 179px em 390). A descrição mostra no máximo duas linhas e o resto
  fica nas reticências — 6 das 12 cortadas em 390 e em 1474, 10 em 320.
- **Um elemento focável por card**, em todas as larguras — como antes: o
  card já era um botão só.
- **Nenhum texto de conteúdo abaixo de 16px no celular:** título 17,6px e
  descrição 16px até 1199; a contagem é rótulo, em 12,8px. No desktop,
  12,8 / 11,2 / 9,6px (16,6 / 14,6 / 12,5 em 1920).
- **Alvos de toque:** o menor card tem 162,8px de altura, a busca 53,8px em
  390 e o CTA 44. Na página inteira, 0 de 53 alvos abaixo de 44×44 em 375,
  390 e 430, e 1 de 53 em 320 — a tarja da campanha, como antes.
- **Teclado:** do campo de busca, os 12 cards na ordem visual (fileira,
  depois coluna), o CTA e a saída para o #contato — 13 paradas, todas com o
  anel (2px, `--marca-clara`), nenhuma repetida, em 390 e em 1474. Na
  página inteira, 63, 55 e 54 paradas em 1280, 768 e 375, sem travamento e
  sem parada sem indicador.
- **Hover (1474):** a borda vai de `--borda-sutil` a `--borda-acesa`, o
  card sobe 1,6px (.2rem), a seta anda 2,4px (.3rem) e acende; borda em
  150ms, deslocamento em 200ms, sem sombra. **Com movimento reduzido**,
  nenhum deslocamento (`translate: none`) e transições de 0,01ms; a sonda
  de movimento do `a11y.mjs` não acha fonte nenhuma em 1280 e 375.
- **Seta alinhada:** o centro dela fica a 0,2–0,5px do centro dos
  algarismos da contagem (−0,3px em 1920).
- **CLS sem regressão**, duas rodadas: carga 0 em 375 e 1474; rolagem
  0,0009 e 0,0005 em 375, 0,0003 e 0,0003 em 1474 (fase 9: 0,0005 e
  0,0009; 0,0004 e 0,0004).
- **Altura.** Com as 12 categorias na tela, em vez de 6 por página, a
  página cresce 208px em 1474 (o #faq vai de 656 para 865px), 471 a 620px
  de 768 a 1199 e 844 a 1.405px abaixo de 768 (1.357 em 390, onde o #faq
  vai de 1.435 para 2.791px).

### Harness

- `scripts/faq.mjs [rótulo]` mede a grade em doze larguras (as seis do
  pedido, os iPhones, 1280 e as bordas 767/768 e 1199/1200): cards,
  colunas, fileiras e alturas; estouro e rolagem lateral; focáveis por
  card, contando shadow root; corpo e linhas do título, da descrição e da
  contagem; o alvo de toque; e a seta contra os algarismos da contagem. Em
  390 e 1474, a forma do card, da busca, do CTA e do modal; o teclado, do
  campo de busca até sair da seção; a busca de ponta a ponta; e o caminho
  do card ao modal. Em 1474, o hover com e sem movimento reduzido.

## Fase 11 — a raiz tipográfica e o que não é tipografia

A raiz é `50%` (8px) em toda largura abaixo de 1600 e `65%` (10,4px) daí em
diante (`global.css`), e nenhuma fase antes desta tocou nessas duas linhas —
elas vêm da baseline. Como os tokens de texto trocam em 1080 mas a raiz não,
a faixa 1080–1599 renderiza o corpo em 12,8px e o card da central em
12,8 / 11,2 / 9,6, enquanto os mesmos tokens acima de 1600 dão 16,64 / 14,56
/ 12,48. Medido em `medidas/raiz-antes.md`.

**Este commit não muda nada na tela.** Ele tira da raiz o que ela controla e
não é tipografia, para que subir a raiz (o passo seguinte) mexa só em texto.
A conta: o valor de hoje vira px, então o mesmo pixel sai de qualquer raiz.

- **Container.** `--container-max` (px) no `:root` do `global.css`: 1120px, e
  1456px no bloco de 1600 — o que `140rem` rendia com cada raiz. O container
  de 1120px está na lista do que não se mexe; em `rem` ele se mexeria
  sozinho.
- **h1.** As duas fórmulas em px: `clamp(20px, 3.9vw - 10px, 40px)` no
  desktop e `clamp(52px, 1.6vw + 31.2px, 62.4px)` no xl. A do desktop tem
  termo negativo (`-1.25rem`): com a raiz maior, o h1 **encolheria** em 1280
  (39,9 → 36,9). Os dois acompanhantes vão junto, porque dependem do tamanho
  do h1 e não do texto: a fatia da palavra rotativa (`min-width`, 216px no
  lg e 280,8px no xl) e o encaixe dela (`margin-bottom`, −8,8px e −11,44px).
- **Contêiner de imagem.** Onde a altura fixa define o recorte de um
  `object-fit: cover`: o card de benefício (`min-height` 272px, e 291,2px no
  xl) e o piso da fileira do #suporte de 1080 em diante (200px), cujo card
  do meio é uma foto. **O piso do #suporte nasceu partido só pela metade**:
  o `sectionContato.css` não tinha bloco de 1600, então acima dali o piso
  passou a valer 200px onde `25rem` rendia 260px. O retrato não pegou
  porque, em 1600 e 1920, quem manda na fileira é o conteúdo do `.ajuda`
  (264,8px) — o piso não estava mandando. A contraparte entrou num commit
  próprio logo em seguida, e não por acaso: com o texto do xl encolhendo
  3,85% no commit seguinte, o `.ajuda` cai para ~254,6px e o piso passa a
  segurar a fileira.
- **O que ficou em rem, de propósito.** `padding`, `margin`, `gap` e corpo de
  texto crescem junto com a raiz — é o efeito desejado. As fileiras do bento
  do #ba também: são altura fixa, não piso, e sobram 2,1px entre a fileira
  (383,1px em 1280) e o que o conteúdo pede (381px) — congeladas, o texto
  maior estouraria. Os `min-height` dos cards do bento não valem na faixa (o
  próprio CSS faz `min-height: unset` de 1080 em diante). E a tarja da
  campanha não depende de rem no caminho ativo: a nav usa
  `top: var(--tarja-offset)`, em px, escrito pelo ResizeObserver do
  `index.html` (medido: vão tarja→nav de 0 em 1080, 1280, 1474, 1599, 1600 e
  1920).

### Verificação

Pelo `retrato.mjs` — posição e estilos de cada elemento da página, do HEAD
da fase 10 contra este commit — nas treze larguras (320, 375, 390, 430,
768, 1024, 1079, 1080, 1280, 1474, 1599, 1600 e 1920): **0 mudados, 0
deslocados, 0 novos e 0 sumidos**, sobre 666 elementos abaixo de 1080 e 695
de 1080 em diante.

Pelo `scripts/raiz.mjs` (`medidas/raiz-antes.md` contra
`medidas/raiz-desacopla.md`), as treze linhas batem valor a valor: raiz,
h1, corpo do herói, título e subtítulo de seção, os três tamanhos do card
da central, container, altura da página, rolagem lateral (0 em todas) e
quantos textos ficam abaixo de 16px.

Na primeira volta, 1600 e 1920 não bateram: o h1 crescia 2,5px e empurrava
662 elementos para baixo. A causa eram os dois acompanhantes do h1,
congelados com o valor da raiz de 8px — o encaixe da palavra rotativa
(−8,8px onde o xl rendia −11,44px) e a fatia dela (216px contra 280,8px).
Os dois ganharam o valor do xl no bloco de 1600, e as três larguras
(1599, 1600 e 1920) voltaram a 0 mudados e 0 deslocados. É o tipo de coisa
que só aparece medindo: congelar em px vale por faixa de raiz, não por
declaração.

### A raiz sobe — o segundo commit

Com o container e o h1 fora do caminho, a raiz passou a `62,5%` a partir de
1080 e o bloco de 1600 deixou de mexer nela (guarda só o
`--container-max`). O que isso faz:

- **Abaixo de 1080, nada.** A raiz continua em 50% (8px) e o celular e o
  tablet ficam byte a byte como estavam.
- **De 1080 a 1599, o texto cresce 25%** e passa a render o que os tokens
  sempre disseram: corpo de 16px, título de seção de 30px, card da central
  em 16 / 14 / 12. Era essa a faixa que renderizava 12,8 / 11,2 / 9,6 com os
  mesmos tokens.
- **Acima de 1600, o texto encolhe 3,85%** (16,64 → 16px), porque a raiz cai
  de 10,4px para 10px. É a única faixa onde algo fica menor, e está abaixo
  do limiar de percepção.
- **O container e o h1 não se mexem** em nenhuma largura: estão em px desde
  o commit 1.
- **GSAP.** A página cresce 22 a 26% na faixa, então todo gatilho de
  ScrollTrigger muda de posição. O `sectionBa.js` passou a chamar
  `ScrollTrigger.refresh()` quando as fontes terminam de carregar e no
  resize (com 200ms de folga), senão as entradas disparam nas posições do
  primeiro paint.
- **A altura dos números do #divisa passou a ser reservada.** Com a raiz de
  10px, o `h3` de cada card ("+20 milhões", "Desde 2023") deixa de caber em
  duas linhas quando o countUp troca o "0" pelo número: vai para três, a
  fileira cresce 27px no meio da rolagem e leva a página junto. Medido: 46,8px
  com o "0" e 73,8px com o número, em todas as larguras do desktop; o CLS de
  rolagem ia a 0,0133 em 1280. Proibir a quebra não servia — sem ela o texto
  pede 284px e o card oferece 278,7. Com `min-height: 7.4rem` no `h3` (de
  1080 em diante), a caixa nasce na altura que terá no fim: o estado final é
  o mesmo de sempre e nada se move. Não é efeito do `refresh` do GSAP — o
  A/B com o CSS novo e o JS antigo reproduziu o mesmo CLS.

Nas treze larguras (320, 375, 390, 430, 768, 1024, 1079, 1080, 1280, 1474,
1599, 1600 e 1920), com o `scripts/raiz.mjs` (`medidas/raiz-base.md` contra
`medidas/raiz-subida.md`), o `retrato.mjs`, o `cls.mjs` e o `a11y.mjs`
(`medidas/fase15-a11y.md`):

- **Abaixo de 1080, nada mudou.** A tabela é linha a linha igual à da base
  (raiz 8, h1, corpo 16, card 17,6 / 16 / 12,8, container e altura da
  página), e o retrato em par dá 0 mudados e 0 deslocados em 390, 768 e
  1079.
- **De 1080 a 1599:** raiz 10px; o corpo do herói vai de 12,8 para 16, o
  título de seção de 24 para 30, o subtítulo de 11,2 para 14 e o card da
  central de 12,8 / 11,2 / 9,6 para 16 / 14 / 12. O container segue 1120px
  e o h1, 39,92 (1280) e 40 (1474 e 1599) — os dois congelados no commit 1.
- **Em 1600 e 1920:** raiz 10px (era 10,4), o texto encolhe 3,85% (card de
  16,64 / 14,56 / 12,48 para 16 / 14 / 12), o container segue 1456 e o h1,
  56,8 e 61,92.
- **Textos abaixo de 16px em 1280: 190 de 332** (eram 274). O que sobra é
  legítimo — chip de plano, aviso legal, rótulo de controle — e é a próxima
  rodada, não esta.
- **Nenhuma rolagem lateral** em nenhuma das treze.
- **Fileira do bento do #ba**, o ponto mais apertado: 450px com 448 de
  conteúdo em 1280, 464,5/462,5 em 1474 e 478,8/476,8 em 1599 — a mesma
  folga de ~2px de antes, porque o `clamp` cresceu junto com o texto.
- **Fileira do #suporte em 1600 e 1920:** o conteúdo do `.ajuda` caiu de
  264,8 para 255,4px e a fileira parou em 260 — o piso da contraparte
  (`048c9e4`) passou a mandar, como previsto.
- **Divisor candles encaixado** em 1280 e 1474: pontas em 0 contra 196 do
  miolo, barra em 43,8%, costura de 4 a 5 contra referência de 6. A folga
  do #divisa cresceu de 64 para 92px, junto com o ritmo da faixa.
- **Teclado e movimento reduzido sem regressão:** 62, 49 e 46 paradas em
  1280, 768 e 375, nenhuma travada e nenhuma sem indicador; nenhuma fonte
  de movimento com `prefers-reduced-motion`; 45 alvos de toque por largura,
  nenhum abaixo de 44 fora a tarja em 320.
- **CLS: 0,0000 na carga** nas nove larguras. Na rolagem, com a altura dos
  números reservada: 0,0012 e 0,0015 em 1280, 0,0011 e 0,0009 em 1474 e
  0,0004 em 1920 — contra 0,0133 sem a reserva. **Ainda é o dobro dos
  0,0005 de antes da subida**: sobra um deslocamento de ~0,001 no fim da
  contagem, e ele é de **largura**, não de altura — a caixa do h3 vai de
  266 para 297px quando o número entra, e a NCS não tem algarismos
  tabulares para segurar isso (a mesma pendência de tipografia já
  registrada). Fixar a largura do h3 mudaria onde o texto quebra hoje, o
  que é decisão de design.

### Harness

- `scripts/raiz.mjs <rótulo>` mede, nas treze larguras do portão (as nove do
  harness mais 1079/1080 e 1599/1600): a raiz computada, o h1, o corpo do
  herói, o título e o subtítulo de seção, os três tamanhos do card da
  central, o container, a altura da página, a rolagem lateral e quantos
  textos ficam abaixo de 16px.
- O `retrato.mjs` é o que prova "idêntico": ele guarda posição e estilos de
  cada elemento e compara duas versões sem depender de pixel.

## Fase 12 — expansão progressiva da grade (#faq)

As 12 categorias em uma ou duas colunas faziam uma seção alta demais. Em
repouso a grade mostra **três fileiras — e quatro cards no celular**, onde
três seriam pouco para justificar o controle; o resto abre num controle.
Não voltou paginação: os 12 cards estão sempre no DOM.

- **Quantos aparecem:** 4 abaixo de 768 (uma coluna — três cards seriam
  pouco para justificar o controle), 6 de 768 a 1199 (duas colunas) e os 12
  de 1200 em diante (quatro colunas), onde três fileiras já são a grade
  inteira e o controle nem aparece.
- **Como somem:** `display: none` pela classe `is-escondido`, que o
  `sectionFaq.js` põe nos cards que passam do limite da faixa. Isso tira
  esses cards da ordem de foco e do leitor de tela de graça. A altura em
  repouso sai da grade — nada é medido em JS depois da pintura, então o CLS
  inicial não muda.
- **O controle** é o `.btn` md secundário da fase 4: canto assimétrico,
  alvo de 44px e as transições da seção. Leva **"Ver mais"** — copy pedida
  pelo cliente nesta rodada, a única palavra nova da página — e o chevron,
  que gira 180° com a grade aberta. Ele alterna e permanece (se sumisse, o
  foco do teclado se perderia), tem `aria-expanded` e `aria-controls`, e o
  nome acessível é o próprio rótulo. O texto não muda ao expandir: quem diz
  o estado é o `aria-expanded` e o giro do chevron.
- **O esmaecido** é o `::after` da grade recolhida: 80px de `--sup-fundo`
  a transparente no pé da grade, o sinal de "tem mais" sem rótulo. Não
  recebe toque (`pointer-events: none`), então não cobre o card de baixo.
- **Movimento.** Ao alternar, a altura vai da atual à nova em
  `--dur-media` com a curva de saída (o mesmo recurso do card de benefício:
  medir em vez de animar um `max-height` arbitrário). Com
  `prefers-reduced-motion` o JS nem arma a transição, e o chevron não anima.
- **Busca.** Com resultados na tela o controle some junto com a grade, e
  volta quando a busca é limpa. A busca não filtra a grade — ela troca a
  grade pela lista de resultados (fase 10), então não há card escondido
  para revelar.

### Verificação

Pelo `scripts/faq.mjs` (`medidas/faq-expansao.md`) nas doze larguras, pelo
`cls.mjs` nas nove e pelo `a11y.mjs` (`medidas/fase12-a11y.md`):

- **Em repouso:** 4 de 12 cards abaixo de 768 (quatro fileiras, o que foi
  pedido — três cards seriam pouco para justificar o controle), 6 de 12 de
  768 a 1199 (três fileiras) e os 12 de 1200 em diante (três fileiras), onde
  o controle não existe na tela e a seção segue nos mesmos 865px da fase 10
  (1.121 em 1920).
- **Altura da seção, fechada → aberta:** 1.241 → 2.854 em 320, 1.155 →
  2.859 em 390, 956 → 1.493 em 768 e em 1024, 883 → 1.344 em 1199. De 1200
  em diante não há estado fechado.
- **O controle:** alvo de 44px em todas as larguras, canto
  `16px 0 16px 0` (a assinatura da marca), `aria-controls` na grade e
  `aria-expanded` de `false` a `true` ao abrir. O nome acessível é o rótulo
  visível "Ver mais" — o relatório mostra `aria-label` nulo porque não há
  um: quem nomeia é o texto. O chevron gira 180°.
- **Esmaecido:** 80px no pé da grade recolhida, com `pointer-events: none`,
  então não rouba o toque do card debaixo dele. Some com a grade aberta e
  nas larguras sem controle.
- **Fechar devolve o repouso** em todas as larguras com controle, e o foco
  fica no botão ao alternar — ele nunca some.
- **Teclado:** em 390, 6 paradas na seção com a grade fechada (os 4 cards, o
  controle e o CTA) e 14 com ela aberta (os 12 cards), na ordem visual, com
  anel em todas e nenhuma repetida; em 1474, as mesmas 13 de antes. Na
  página inteira, 63, 50 e 47 paradas em 1280, 768 e 375, sem travamento e
  sem parada sem indicador.
- **Toque:** 0 alvos abaixo de 44×44 em 375, 390 e 430, e 1 em 320 — a
  tarja da campanha, como sempre. São 46 alvos por largura, contra 53 antes:
  os 8 cards escondidos saem e o controle entra.
- **Movimento reduzido:** a troca de altura não anima (o JS nem arma a
  transição) e o chevron não gira animado; a sonda de movimento não acha
  fonte nenhuma em 1280 nem em 375.
- **CLS na carga: 0,0000 nas nove larguras.** Rolando: 0,0010 em 320,
  0,0009 em 375 e 0,0001 a 0,0005 nas outras — a mesma ordem de grandeza da
  fase 10 (até 0,0009 em 375 e 0,0004 em 1474).
- **Nada estourando:** nenhum card fora da grade, nenhum conteúdo fora do
  card e nenhuma rolagem lateral, nas doze larguras.

## Fase 13 — a central de ajuda não manda mais para fora

A pedido do cliente, o botão **"Acessar a Central de Ajuda completa"** saiu
do #faq: os tópicos da central estão todos na página, e o botão levava o
usuário para o Zendesk. Com ele saem as duas regras de CSS que só ele usava
(`.faq__cta` e o alinhamento óptico da seta do link).

Saiu junto o **bloco morto da paginação** no `index.html`. Ele tinha sido
removido na fase 10, voltou num commit de outra pessoa que varreu o
diretório de trabalho (`c059bbc`) e desde a fase 10 nenhum JS o usa: era
markup inerte, escondido por `hidden`, com dois botões e o texto "1 / 2"
dentro.

**Ainda apontam para o Zendesk**, e ficaram como estão até decisão:

- **"Abrir no Zendesk"**, no rodapé do modal de artigo (`faq__modal-source`,
  com o `html_url` do artigo). O modal não muda nesta rodada.
- **O link do estado de falha da API** (`renderFallback`, no
  `sectionFaq.js`): só aparece quando a central não carrega — aí não há
  tópico nenhum na página para ler.

### Verificação

Pelo `scripts/faq.mjs` (`medidas/faq-sem-cta.md`) nas doze larguras, pelo
`a11y.mjs` (`medidas/fase13-a11y.md`) e pelo `cls.mjs`:

- **A seção encolheu o tamanho do botão:** 68px em toda largura abaixo de
  1600 e 87px em 1920, onde a raiz é maior. O #faq vai de 1.241 para 1.173
  em 320, de 1.155 para 1.087 em 390, de 956 para 888 em 768 e em 1024, de
  883 para 815 em 1199, de 865 para 797 de 1200 a 1474 e de 1.121 para
  1.034 em 1920.
- **O bloco da paginação saiu do DOM:** a sonda lê "ausente" nas doze
  larguras (era "escondida").
- **Teclado: uma parada a menos por largura**, que era o botão — 62, 49 e 46
  em 1280, 768 e 375, contra 63, 50 e 47; nenhuma travada, nenhuma sem
  indicador. Dentro da seção, 5 paradas em 390 com a grade fechada (os 4
  cards e o controle) e 12 em 1474.
- **Toque:** 45 alvos por largura (eram 46), 0 abaixo de 44×44 em 375, 390 e
  430 e 1 em 320 — a tarja, como sempre.
- **A expansão continua inteira:** 4, 6 e 12 cards em repouso, controle de
  44px, esmaecido de 80px e o fechar devolvendo o repouso.
- **CLS:** carga 0,0000 em 375 e 1474; rolagem 0,0005 e 0,0004 — igual à
  fase 12. Nenhuma rolagem lateral e nada estourando nas doze larguras.
- **A busca e o caminho card → painel → modal seguem funcionando:** 7
  resultados para "saque", o artigo abre no modal e o Esc fecha.

## Fase 16 — rodada 1 de SEO (só a home estática)

Quatro commits, todos em `<head>`, atributo ou tag semântica: nenhuma
palavra de texto visível entrou, saiu ou mudou. O critério era a página não
mudar na tela, e o retrato de layout nas nove larguras é o que prova.

### O que mudou

- **O FAQPage inventado saiu (SEO-01 e 08).** O segundo bloco JSON-LD
  declarava 17 perguntas que não existem na página — quem chega vê os cards
  de categoria da central. Contraria a diretriz do Google para FAQPage, é
  motivo declarado de ação manual, e desde 2023 o rich result de FAQ só
  aparece para governo e saúde: não havia ganho a perder. Saiu inteiro, com
  o erro de sintaxe que tinha dentro. Sobrou um JSON-LD, o Organization.
- **O logo do schema (SEO-02)** apontava para
  `https://zero7.com.br/caminho-da-logo.png`, texto de exemplo do template,
  404. Agora é `/home/assets/logo-zero7-512.png`: PNG quadrado de 512×512
  exportado do `logo zero7.svg` sobre o fundo escuro da marca — o logo é
  branco e sumiria em fundo transparente. O mínimo do Google é 112×112.
- **Uma URL só (SEO-05).** canonical, og:url e twitter:url passam a apontar
  para `https://zero7.com.br/home/`, a forma que responde 200. Havia ainda
  um **segundo** `<link rel="canonical">`, para a raiz, fora do
  levantamento: duas canonicals deixam a escolha para o buscador. Ficou uma.
- **Hierarquia de títulos (SEO-13).** "ACADEMY PASS" era h2 entre irmãos h3
  e virou h3; os 24 elementos de preço dos oito planos (riscado, parcelado e
  à vista) eram h4/h5 e viraram `<p>`; o h3 do modal da central nascia
  vazio e agora nasce com `hidden`, revelado pelo JS quando recebe texto. O
  CSS mirava h4 e h5 **por elemento** em 29 seletores — todos passaram a
  mirar as classes que já existiam no markup.
- **O h1 lido com uma palavra só (SEO-11).** A troca de palavra mantém as
  duas no DOM, e o rastreador lia "O ECOSSISTEMA LUCRATIVO SEGURO PARA
  OPERAR DAY TRADE". O `aria-hidden` agora acompanha a animação do GSAP: a
  palavra fora de cena sai da árvore e volta quando entra. O `min-width`
  congelado do span, o tamanho do h1 e a animação não foram tocados.
- **Atributos (SEO-16, 17, 18 e 10).** `rel="noopener"` em todo
  `target="_blank"` que não tinha — `noreferrer` só nos três sociais,
  porque nos oito checkouts ele apagaria o Referer de que o
  `app.zero7.com.br` depende para atribuição. Nome acessível nos três
  ícones sociais. A meta keywords saiu (ignorada desde 2009). E cada
  `<img>` declara `width` e `height` naturais.

### O que o levantamento dizia e a medição desmentiu

- **"21 das 35 imagens sem alt".** Nenhuma está sem: todas já tinham o
  atributo, inclusive na baseline (`630eb1f`). O que existe é qualidade —
  os seis depoimentos dividem o mesmo alt, por exemplo. Como alt é
  conteúdo, a lista foi reportada para aprovação, não reescrita.
- **O peso dos preços.** h4 e h5 nascem em negrito pela folha do navegador e
  o CSS nunca declarou peso nesses dois blocos: a troca por `<p>` derrubava
  o peso para 400, estreitava o texto e encolhia o `.price` — que tem a
  largura do conteúdo — em 9px. Só o retrato pegou; o peso 700 está
  declarado agora.
- **Os 41 `<img>` do arquivo** incluem 6 dentro do bloco `#cards`
  comentado e 2 do popup, também comentado: as reais são 34 tags.
- **Nenhuma imagem tinha altura no CSS.** Com `width` e `height` nativos, a
  altura do atributo passava a valer literalmente onde o CSS só definia
  largura: a imagem dos cards do #topicos ia de 158,5 para 1080px, as
  bandeiras de pagamento de 25 para 369 e o logo da nav de 20 para 55 — 23
  elementos mudados e 518 deslocados em 320. O par natural do atributo é
  `height: auto`, que entrou em cinco regras (logo da nav, cards do
  #topicos, logo do rodapé, bandeiras de pagamento e imagem do herói). As
  quatro imagens da campanha — tarja e cupom — ficaram sem atributo: o
  conserto delas exigiria mexer no CSS da campanha.

### O redirecionamento e os sitemaps (SEO-03, só investigação)

Medido no ar, com `curl`:

- `https://zero7.com.br/` responde **301 para `/home`**, que responde **301
  para `/home/`**, que responde 200. São dois saltos: a raiz nunca chega
  direto na página.
- O `page-sitemap.xml` do Yoast lista `https://zero7.com.br/` — a URL que
  redireciona — e **não lista `/home/`**. As outras entradas são
  `/quem-somos/`, `/politica-de-privacidade/`, `/blog/` e `/regulamento/`.
- O `robots.txt` da raiz é o bloco do Yoast e declara **um** sitemap,
  `https://zero7.com.br/sitemap_index.xml`, que aponta para post-, page-,
  category- e author-sitemap. **Um segundo `Sitemap:` pode ser declarado
  ali**: o formato aceita várias linhas e o Yoast tem editor de robots.txt.
- Existem um `robots.txt` e um `sitemap.xml` **dentro de /home/**, no
  repositório. Os dois respondem 200 e **nenhum crawler os usa**:
  robots.txt só vale na raiz do domínio, e aquele sitemap não está
  declarado em lugar nenhum — o `<link rel="sitemap">` do `<head>` é
  ignorado pelos buscadores. Ele ainda lista `/home` sem barra (que
  redireciona) e uma URL com fragmento (`/home#plan`), que sitemap não
  aceita.
- A entrada da raiz vem da página inicial do WordPress. Excluí-la do
  sitemap do Yoast é possível pela própria página (Yoast SEO → Avançado →
  "Permitir que mecanismos de busca mostrem esta página?" = Não) ou por
  filtro (`wpseo_exclude_from_sitemap_by_post_ids`). Isso não dá para
  verificar daqui: precisa de acesso ao WordPress.

A decisão é sua: ou um sitemap estático avulso com `/home/`, declarado no
robots.txt da raiz e com a entrada da raiz excluída do Yoast, ou mover a
home para a raiz e acabar com a cadeia de redirecionamento.

### Verificação

- **Retrato de layout nas nove larguras** (320, 375, 390, 430, 768, 1024,
  1280, 1474 e 1920), em duas etapas:
  - **Semântica:** 0 mudados e 0 deslocados. Os 43 elementos que trocam de
    tag aparecem como sumiram/novos, porque a chave do retrato traz a tag; o
    pareamento um a um deu **43 idênticos em caixa, estilo e texto, 0 com
    diferença**, em 375 e 1474.
  - **Atributos:** 0 mudados, 0 deslocados, 0 novos e 0 sumidos — depois de
    acertar o `height: auto`.
- **CLS sem regressão:** carga 0,0000 em 375 e 1474; rolagem 0,0005 e
  0,0009 a 0,0011, o mesmo patamar de antes da rodada.
- **JSON-LD:** sobrou um bloco, o Organization, e ele passa no `JSON.parse`.
- **Imagens:** 34 `<img>` reais, todas com `alt`, e 30 com `width` e
  `height` (as quatro da campanha ficaram de fora de propósito). Com
  `height: auto`, tirar e repor o atributo não muda a caixa de nenhuma.
- **Links:** 20 com `target="_blank"`, nenhum sem `rel`; os oito de
  checkout só com `noopener`; `noreferrer` nos três sociais.
- **h1:** uma palavra por vez na árvore de acessibilidade — o `aria-hidden`
  alterna junto com a animação.

## Fase 17 — texto alternativo

Rodada só de `alt`. Nenhum arquivo de imagem foi tocado, nenhum CSS ou JS
mudou (portanto **não houve giro de cache**), e nenhuma palavra visível
entrou, saiu ou mudou. `alt` não renderiza: qualquer diferença de tela seria
bug, e o portão foi montado assim.

### As três fotos de fundo do #ba → `alt=""`

Os três `<img class="ba-card__bg card-beneficio__fundo">` são a foto que
preenche o cartão; o texto do cartão vem do `<h3>` logo abaixo. O `alt`
repetia esse `<h3>` **palavra por palavra** — conferido antes de mexer:

| foto | `alt` antigo | `<h3>` do mesmo cartão |
|---|---|---|
| `magnific_photo-a-30yearold-black-m_…avif` | Alavancagem | Alavancagem |
| `magnific_photo-a-man-wearing-a-blu_…avif` | Conta real | Conta real |
| `o4rijghi4rugh4riuhjg.png` | Plano de carreira | Plano de carreira |

Leitor de tela lia o nome do benefício duas vezes seguidas. Com `alt=""` a
foto sai da árvore de acessibilidade e sobra o título, que é o conteúdo.

### Os seis depoimentos → transcritos

**O briefing supunha imagem de texto com uma frase de depoimento. Não é
isso.** Cada `.card.depoimento` carrega um `data-video` com um embed do
YouTube: a imagem é a **miniatura do vídeo** — o rosto da pessoa, a marca
zero7 no topo, um botão de play no centro e, na base, **nome e valor**. Não
existe frase nenhuma para transcrever; o que há de texto é nome e valor, e é
isso que foi para o `alt`, lido direto da imagem:

| arquivo | nome | valor |
|---|---|---|
| `depoimentos/1.avif` | Jhone Mayco | +R$ 47.179,57 |
| `depoimentos/2.avif` | Josivan Lima | +R$ 4.492,87 |
| `depoimentos/3.avif` | Luiz G. Neves Jesus | +R$ 22.971,86 |
| `depoimentos/4.avif` | Fernando T. Silva | +R$ 20.001,92 |
| `depoimentos/5.avif` | Marcelo Augusto Lima | +R$ 5.974,33 |
| `depoimentos/6.avif` | Iago Zandone Silva | +R$ 7.500,17 |

Formato: `Depoimento em vídeo de <nome>: <valor>`. As três palavras iniciais
não estão escritas na imagem — são o enquadramento (que é vídeo, e que é
depoimento), verificável no `data-video` e no botão de play desenhado na
arte. Fora isso, o `alt` é transcrição literal. O nome vai em caixa mista: na
arte está em versal espaçado, que é estilo, não grafia.

Nada foi completado, parafraseado ou inventado. Na `4.avif` há uma linha
fantasma atrás do nome, meio apagada pelo degradê — ilegível, **ficou de
fora** em vez de ser adivinhada.

**Bug de marcação corrigido junto:** os seis `<img>` tinham **dois `alt`** no
mesmo elemento (`alt="Depoimento de trader da Zero7" … alt=""`). O parser
usa o primeiro e descarta o segundo, então o `alt=""` do fim nunca valeu
nada — era HTML inválido. Sobrou um `alt` por imagem.

### Os três do #topicos → investigados, **não mexidos**

Não são foto nem captura: são **letreiros**, arte com o título escrito em
letra grande sobre fundo escuro, com o símbolo da marca no topo.

| arquivo | texto escrito na arte | `alt` atual |
|---|---|---|
| `PROCESSODEAVALIACAO.webp` | PROCESSO DE AVALIAÇÃO | Processo de avaliação da Zero7 |
| `INCUBADORA.webp` | INCUBADORA | Incubadora Zero7 |
| `CONTAREAL.webp` | CONTA REAL | Conta Real Zero7 |

**O cartão não tem título em HTML.** A estrutura é `<img>` + `<p>` +
botão — o título da etapa existe **só dentro da imagem**. Ou seja: o `alt`
atual já é a transcrição do letreiro (mais "Zero7", que é o símbolo presente
na arte), e é o único lugar onde quem usa leitor de tela recebe o nome da
etapa. Zerar seria apagar informação. Ficaram como estão.

Fica a pendência **de estrutura, não de `alt`**: um título de etapa
renderizado como imagem não entra na hierarquia de títulos, não é
selecionável e não cresce com o zoom de texto. Virar `<h3>` visível é mudança
de tela e de copy — pede aprovação.

### Portão

- **Retrato em 9 larguras** (320, 375, 390, 430, 768, 1024, 1280, 1474,
  1920), `alt0` × `alt1`: **0 mudados, 0 deslocados, 0 novos, 0 sumidos** em
  todas. 627 elementos abaixo de 768, 641 até 1024, 710 acima.
- **Imagens:** 41 `<img>` no arquivo, todas com `alt`, **0 com `alt`
  duplicado** (eram 6).
- **a11y:** toque, teclado e movimento reduzido sem mudança — 0 sem
  indicador, 0 fora da vista, 0 travamento; o único alvo abaixo de 44×44 em
  320px é o de sempre, da tarja.
- **Nenhum arquivo de imagem tocado, nenhum CSS ou JS tocado:** o diff da
  rodada é só `index.html` (9 `<img>`) e este documento.

## Fase 18 — meta description e o link que faltava

Copy aprovada pelo Gustavo. Dois itens; o segundo **muda a tela**.

### meta description (SEO-14)

A antiga tinha **195 caracteres** e o Google corta perto de 155: a última
frase nunca aparecia no resultado. A nova, aprovada:

> Mesa proprietária de day trade. Planos a partir de R$ 130, avaliação em 60
> dias e operação em mini índice, mini dólar e Bitcoin.

**128 caracteres** (135 bytes em UTF-8) — o briefing dizia 127; contado no
arquivo depois de colar, são 128.

`og:description` e `twitter:description` **espelhavam** a meta, palavra por
palavra — conferido antes de mexer —, então receberam o mesmo texto. As três
tags mudaram; nenhuma outra.

**Duas ocorrências da frase antiga continuam no arquivo, de propósito:**

1. O `"description"` do JSON-LD `Organization`, no `<head>`. Não estava no
   pedido, e dado estruturado não sofre o corte de 155 — **ficou como está**.
2. O `<p>` abaixo do h1 do herói: a mesma frase é **texto visível na tela**
   (linha 201). Regra 1 — não foi tocada. (A busca literal nem a alcança: ali
   a frase quebra linha no meio. O portão que exigia 4 ocorrências foi o que
   expôs as duas.)

### Link "Quem Somos" no rodapé (SEO-15) — muda a tela

`/quem-somos/` existe, está no sitemap do Yoast e **nenhum dos 37 links da
home apontava para ela**. Entrou como mais um item da lista que já existe, na
coluna Navegação do rodapé, entre Regulamento e Área do Trader — mesmo
componente (`<p><a>`), mesmo estilo, sem `target` nem `rel`, igual a Blog e
Regulamento. **O menu do topo não foi tocado.**

**Altura do rodapé, antes × depois:**

| largura | antes | depois | diferença |
|---|---:|---:|---:|
| 390px | 595,5px | 639,5px | +44 |
| 768px | 595,5px | 639,5px | +44 |
| 1024px | 595,5px | 639,5px | +44 |
| 1474px | 427,9px | **427,9px** | **0** |

Em 1474 o rodapé não mexe: a coluna Navegação cresce de 186 para 219px, mas
quem manda na altura ali é a coluna da marca (CNPJ, endereço, selo do
Reclame Aqui). Abaixo de 1280 as colunas empilham e os 44px do item novo
entram inteiros na altura — 44px é o alvo de toque, não o corpo do texto.

**O que o retrato acusou, e por quê**

| largura | mudaram | deslocados | novos | sumiram |
|---|---:|---:|---:|---:|
| 320–1024 | 5 (6 em 320) | 31 | 2 | 0 |
| 1280–1920 | 2 | 0 | 2 | 0 |

- **Mudaram**: só caixas do `#footer` — `#footer`, `.wrapper`, `.content` e
  `.navigation` ganhando os 44px, mais o `p:5 > a`.
- **`p:5 > a` "Área do Trader" → "Quem Somos"** é artefato da chave, não
  mudança de tela: a chave do retrato numera irmãos, e o item novo entrou
  na posição 5, empurrando Área do Trader para a 6 (que aparece em "novos").
  Em 320 aparece ainda `p:5` com altura 46 → 44 pelo mesmo motivo: "Área do
  Trader" quebra em duas linhas ali. Medido depois, item a item em 320:
  Home 44, Blog 44, Planos 44, Regulamento 44, Quem Somos 44, **Área do
  Trader 46** — ninguém encolheu, a coluna só ganhou 44px.
- **Deslocados (31)**: 9 são a coluna Social, que fica abaixo da Navegação no
  empilhado; os outros 22 são `#pagamento` (10) e `#author` (12) — as duas
  faixas que vêm **depois** do rodapé no DOM e descem 44px junto. Translação
  pura, nenhuma mudou de forma. Acima de 1280, como o rodapé não cresce,
  esses 22 não se mexem: 0 deslocados.
- **Novos (2)**: o `<p>` e o `<a>` do item. **Sumiram: 0 em todas.**

**Resto do portão:** CLS igual ao de antes (carga 0,0000 em 375 e 1474;
rolagem 0,0005 e 0,0009–0,0011). Teclado: 63/50/47 paradas (era 62/49/46),
**0 sem indicador, 0 fora da vista, 0 travamento** — o link novo entra na
ordem visual, entre Regulamento e Área do Trader. Toque: 46 alvos (era 45),
o novo passa de 44×44 em 375, 390 e 430; em 320 o único abaixo segue sendo o
da tarja, de antes. Nenhum CSS ou JS mudou — **sem giro de cache**.

### O `.htaccess` (itens 3, 4 e 5) — **nada aqui é verificável localmente**

**(a) Quais existem.** Um só no repositório: **`/.htaccess`**, na raiz, 36
linhas, rastreado pelo git. Não há nenhum outro, nem em subpasta, nem fora do
controle de versão (`find` por `.htaccess*` e `git ls-files`).

**(b) De onde sai o `no-store`.** Desse mesmo arquivo. Era o primeiro bloco:

```apache
<FilesMatch "\.(html|htm)$">
  Header always set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
  Header always set Pragma "no-cache"
  Header always set Expires "0"
</FilesMatch>
```

**(c) A regra `/` → `/home` NÃO está no repositório.** Não existe
`RewriteEngine`, `RewriteRule` nem `Redirect` em lugar nenhum daqui. E o
cabeçalho do próprio arquivo diz "Aplicado somente na pasta /home", batendo
com o que já estava anotado: **a raiz do repositório é publicada como
`/home/`**. Ou seja, este `.htaccess` vira `/home/.htaccess` no servidor — a
raiz do documento é outra pasta, do WordPress, fora daqui. **O redirect mora
lá. O item 5 (a barra no destino) não foi feito: é edição à mão do Gustavo.**

### Cache do HTML (SEO-06) — aplicado, **não testado**

O bloco do HTML virou, no mesmo `<IfModule mod_headers.c>`:

```apache
<FilesMatch "\.html?$">
  Header always set Cache-Control "max-age=300, must-revalidate"
  Header always unset Pragma
  Header always unset Expires
</FilesMatch>
```

E, **fora** do `IfModule`, porque `FileETag` é diretiva do core e não do
`mod_headers`:

```apache
FileETag MTime Size
```

**Os assets não foram tocados.** Os blocos de JSON (`no-store`), CSS/JS e
imagens/fontes (`max-age=31536000, immutable`) estão byte a byte iguais —
conferido por portão no script antes de gravar.

**Observação sobre os cabeçalhos dos assets:** o `max-age=10368000` e as
regras de vídeo citadas no briefing **não existem neste arquivo** — aqui não
há nenhuma extensão de vídeo nem esse número. Eles vêm de outro lugar
(`.htaccess` da raiz do documento ou config do servidor). Mais um motivo para
não mexer em asset por aqui: parte do que se vê no ar não é decidido neste
arquivo.

**`mod_headers` está disponível?** Não dá para testar daqui — não há Apache
nesta máquina e a página roda por um servidor estático de Node. O que dá para
afirmar por evidência: o HTML no ar devolve hoje **exatamente** o
`no-store, no-cache, must-revalidate, max-age=0` mais `Pragma` e `Expires`
que aquele bloco definia, e o bloco está dentro de
`<IfModule mod_headers.c>`. Se o módulo não estivesse carregado, o bloco
seria ignorado e esses cabeçalhos não apareceriam. Pelo mesmo motivo o
`AllowOverride` da pasta inclui `FileInfo` — classe que `Header` e `FileETag`
exigem —, senão o `.htaccess` já estaria devolvendo 500 hoje.

**O que o Gustavo precisa conferir no ar, depois do deploy:**

1. A página abre (200, não 500). É o teste de que `FileETag` passou.
2. `curl -sI https://zero7.com.br/home/` → `Cache-Control: max-age=300,
   must-revalidate`, **sem** `Pragma`, **sem** `Expires`, e com `ETag`.
3. `curl -sI https://zero7.com.br/home/css/index.css` → tem que continuar
   `public, max-age=31536000, immutable`. Se mudou, é regressão.
4. O redirect segue com dois saltos até a edição à mão na raiz.

## Fase 19 — rodada 2 de performance

Duas passadas, **as duas com a regra 6 suspensa só para os arquivos nomeados**.
Toda outra mídia do site continuou intocável — em especial a tarja e o cupom da
campanha. Nenhuma das duas foi commitada sem o Gustavo olhar a página de
comparação, `comparacao-perf.html`.

### Passe 1 — imagens dos cards de benefício

O briefing listava três PNGs. **Dois deles já eram AVIF** desde o commit
inicial (53,2 KB e 16,1 KB) — só o terceiro era PNG mesmo, e era ele que
importava:

| imagem | antes | depois | redução |
|---|---:|---:|---:|
| `o4rijghi4rugh4riuhjg` | 4 917,2 KB PNG 1856×1607 | **154,4 KB AVIF** 1856×1607 | **−96,9%** |
| `magnific_…30yearold…` | 53,2 KB AVIF | não mexido | — |
| `magnific_…man-wearing…` | 16,1 KB AVIF | não mexido | — |

**Por que os outros dois ficaram como estavam:** recomprimir AVIF que já está
bem comprimido é perda de geração sem ganho. A partir de q55 os candidatos
saíam **maiores** que o original (54,3 KB contra 53,2 KB). O único ganho
possível eram 15 KB a q45, ao custo de nitidez no holograma.

**A dimensão não foi reduzida**, ao contrário do que o briefing pedia: medida a
caixa real nas 9 larguras, em 1024 o terceiro card vira **largura cheia**
(984 CSS px), e 2× disso são 1968 — mais do que os 1856 que o arquivo tem. A
fonte já estava no limite; reduzir seria perder.

**Qualidade escolhida no olho:** q55 borrava o pelo da barba no recorte 1:1;
q65 segura. `effort 9`, canal alfa descartado (era 100% opaco). O critério foi
o do briefing — "300 KB bonito é melhor que 60 KB borrado".

**Cache:** a extensão mudou de `.png` para `.avif`, então a URL já muda
sozinha. Nenhum CSS ou JS foi tocado neste passe; a string não girou.

### Passe 2 — os três vídeos

**Nenhum vídeo foi reencodado.** O item de reencode foi cancelado depois da
etapa 0, e por um motivo que vale registrar: **o alvo de 2× já era maior que a
fonte nos três**.

| | 2× da maior caixa medida | o arquivo tem |
|---|---|---|
| `academy 1` e `academy 2` | 966×924 | 720×1280 |
| `TELA CARREGAMENTO` | 1968×924 | 1920×900 |

Outras duas correções de premissa da etapa 0: o MP4 ser ~2× mais pesado que o
WebM **não é defeito** — é VP9 contra H.264 na mesma qualidade (reencodar o
`TELA CARREGAMENTO.mp4` em CRF 23 saiu **maior**: 3 758 KB contra 2 622 KB), e
o navegador baixa só um dos dois. E **não havia vão branco** antes do primeiro
quadro: o fundo dos cards é azul-marinho escuro.

**O que mudou, então:**

1. **`preload="none"`** no lugar de `auto`.
2. **`autoplay` removido dos três.** Ele contradizia o `preload="none"`: o
   navegador busca assim mesmo para poder tocar, e o ganho seria zero. Quem dá
   `play()` agora é o observer.
3. **`poster` em AVIF q55**, o **primeiro quadro do próprio vídeo** — assim a
   troca poster→vídeo não dá salto, e é exatamente o que o card já mostrava em
   t=0. 23,8 + 19,5 + 24,1 = **67,4 KB** os três.
4. **`width`/`height`** com a dimensão nativa (720×1280 e 1920×900).
5. **`IntersectionObserver`** com `threshold .1` e `rootMargin 200px`: só aí o
   `preload` vira `auto` e o download começa.
6. **`prefers-reduced-motion`:** nenhum toca e **nenhum byte de vídeo é
   baixado** — fica o poster, que é imagem parada.

O bloco de autoplay do `script/sectionBa.js` foi reescrito inteiro. As
tentativas repetidas de `play()` (em `loadeddata`, `canplay`, `visibilitychange`
e no primeiro gesto) continuam lá, porque o celular recusa a reprodução em
silêncio e não tenta de novo — mas agora todas são **filtradas por "está na
tela"**, senão elas próprias forçariam o download.

**O ganho:**

| | antes | depois | |
|---|---:|---:|---|
| carga inicial em 390px | 5,25 MB | **1,25 MB** | **−4,00 MB (−76%)** |
| carga inicial em 1474px | 5,36 MB | **1,36 MB** | **−4,00 MB (−75%)** |
| página inteira, rolada até o fim | 5,45 MB | 5,51 MB | +67 KB (os posters) |

Os 4 MB não sumiram — saíram do caminho crítico. Quem rola até o `#ba` baixa os
mesmos vídeos de sempre.

**Cache:** o JS mudou, então a string girou para `v82-perf-video01` — 70
ocorrências em 12 arquivos. A `v67-a11y-set01` do `limiteAlta` ficou como
estava.

### Portão das duas passadas

- **Retrato nas 9 larguras: 0 mudados, 0 deslocados, 0 novos, 0 sumidos**, nas
  duas passadas. No passe 2 isso surpreendeu o briefing, que esperava
  diferença na área dos vídeos: `poster`, `preload` e `autoplay` não são
  propriedade de CSS nem mudam caixa, e o `width`/`height` do atributo perde
  para o `width: 100%` do autor. O retrato não tem como ver o poster.
- **CLS:** carga 0,0000; rolagem 0,0005–0,0011. Igual antes e depois.
- **Vídeo no carregamento inicial: nenhum**, em 390 e 1474, com e sem
  movimento reduzido. Medido sem a varredura do `prepararPagina` — ela rola a
  página inteira para disparar o lazy, e isso acorda o observer; a primeira
  medição deu falso positivo por causa disso.
- **Ao rolar até o `#ba`:** os três baixam e tocam (`readyState` 4). Com
  movimento reduzido: `readyState` 0, pausados, zero byte.
- **Alcançabilidade:** os 6 vídeos e os 3 posters respondem 200 com o
  `content-type` certo.
- Nenhuma outra imagem, vídeo, tracking, checkout, contador, tarja, cupom,
  MARGEM ou limiteAlta encostado.

### Ferramentas

`sharp`, `ffmpeg-static` e `ffprobe-static` entraram como **devDependencies**,
com o porquê no `README.md` (novo). Binário de build declarado vale mais que
pré-requisito manual: ninguém precisa instalar ffmpeg à mão nem descobrir na
marra qual versão foi usada.

## Fase 20 — fontes auto-hospedadas

O `fonts.cdnfonts.com` era o último domínio de terceiro bloqueando a pintura.
Agora as fontes saem de `css/fonts/`, pela própria origem. **Sem subconjunto**:
subsetting é outra rodada, medida à parte.

**Os arquivos.** Chegaram 19 WOFF2 numa pasta `fonts/` na raiz (não em
`css/fonts/`, como o pedido dizia). Antes de apagar qualquer coisa, a tabela
`name` e a `OS/2` de cada arquivo foram lidas: os nomes PostScript dos 7
mantidos são exatamente as faces que a medição anterior viu desenhando pixel.
Ficaram 7 em `css/fonts/`; os 12 restantes (9 itálicas, Black, ExtraLight e
Thin) foram apagados — nenhum texto do site usa itálico nem esses pesos.

| arquivo | peso | antes (WOFF, CDN) | agora (WOFF2) |
|---|---:|---:|---:|
| `NCS Radhiumz.woff2` | 400 | 16,2 KB | 12,8 KB |
| `TT Fors Trial Light.woff2` | 300 | 68,8 KB | 51,9 KB |
| `TT Fors Trial Regular.woff2` | 400 | 67,5 KB | 51,0 KB |
| `TT Fors Trial Medium.woff2` | 500 | 69,3 KB | 52,7 KB |
| `TT Fors Trial DemiBold.woff2` | 600 | 68,5 KB | 51,9 KB |
| `TT Fors Trial Bold.woff2` | 700 | 70,0 KB | 53,1 KB |
| `TT Fors Trial ExtraBold.woff2` | 800 | 70,4 KB | 53,5 KB |

**A armadilha da NCS Radhiumz.** Ela é UM arquivo, declarado só com
`font-weight: 400`. Os pesos 500, 600, 700 e 900 dos títulos são **negrito
sintetizado** pelo navegador. Uma segunda face, um intervalo de peso ou
declarar esse arquivo como bold mudaria todos os títulos do site. Ficou como
no CDN: uma face, peso 400.

**As declarações** moram no fim do `css/index.css` — arquivo próprio seria
mais um `@import`, mais uma requisição. Os nomes de família são letra por
letra os do CDN e os do `tokens.css`: `'NCS Radhiumz'` e `'TT Fors Trial'`.
`font-display: swap` nas sete. **Sem `local()`**: o CDN usava
`local('TT Fors Trial')` — o nome da família — em todos os pesos, o que numa
máquina com a fonte instalada podia trocar a face de todos eles.

**Preload e `@font-face` estão acoplados.** A URL do `<link rel="preload">`
precisa bater byte a byte com a do `src` do `@font-face`, `?v=` inclusive, e o
preload precisa de `crossorigin` mesmo sendo mesma origem — sem isso o
navegador baixa o arquivo duas vezes. As duas pontas giram juntas com a
string de cache.

**Preload por página**, a partir da medição de quem aparece acima da dobra
sem campanha:

| | home | satélites |
|---|---|---|
| NCS Radhiumz | sem `media` | sem `media` |
| TT Fors DemiBold | sem `media` | sem `media` |
| TT Fors Regular | `(max-width: 1079.98px)` | **sem `media`** — aparece nas duas larguras |
| TT Fors Medium | `(min-width: 1080px)` | `(min-width: 1080px)` |

Bold e ExtraBold não têm preload: na home eles só sobem acima da dobra por
causa da tarja (campanha) e, em 390, do card do `#divisa` que desponta no pé
da tela. **Pendência:** nas satélites o **Bold aparece acima da dobra nas duas
larguras sem campanha nenhuma** — a razão para não fazer preload dele vale
para a home e não para elas. Ficou sem preload, aguardando decisão.

**Verificado:**
- retrato nas 9 larguras 0/0/0/0 — aqui isso prova o mapeamento de peso:
  peso errado muda a largura do texto. Antes de mexer no site, a largura do
  mesmo texto a 100px foi comparada entre o WOFF do CDN e o WOFF2 local:
  0px de diferença nos 6 pesos da TT Fors e nos 5 pesos da NCS (inclusive os
  sintéticos); o controle, com pesos trocados de propósito, deu 384px;
- títulos em NCS em 1474 (h1, `#ba`, `#faq`) pixel a pixel idênticos, em 3
  rodadas de cada estado. A primeira captura acusou diferença no `#faq` — era
  o título no meio da animação de entrada; com movimento reduzido e espera
  pelo fim das animações, zero canais diferentes;
- zero requisições ao `fonts.cdnfonts.com` nas 22 cargas das 11 páginas
  (eram 168); só os 7 arquivos pedidos, todos 200, nenhum duas vezes;
- com **toda a rede externa bloqueada**, as faces carregam e desenham o
  texto certo, sem aviso de preload no console;
- domínios que bloqueiam a pintura: de 1 para 0, nas 11 páginas;
- FCP, 9 cargas com rede real: mediana de 268 para 164 ms em 390, de 292
  para 196 ms em 1474;
- CLS de carga 0,0000 antes e depois. O de rolagem em 1474 alterna entre
  0,0009 e 0,0011 nos dois estados — 8 cargas de cada lado, os mesmos dois
  valores, só a proporção varia.

O Inter Tight e o Open Sans que ainda aparecem na página são do selo do
Reclame Aqui, no rodapé: terceiro, fora desta rodada.

## Pendências — fora desta rodada

**Conteúdo e código morto**
- **`#cards` está comentado** no `index.html` (o comentário fecha na linha 513),
  fora do DOM. É uma segunda implementação do card de benefício, e o
  `sectionCards.css` (4,6 KB) segue carregado sem estilizar nada. A cópia
  comentada diz **"15x maior"** onde o #ba diz **"20x maiores"**: se alguém
  descomentar a seção, a página se contradiz.
- Quatro regras `section.planos .card a button` e `.planos.bit .card a button`
  em `sectionPlanos.css` estilizam um `<button>` dentro de card de plano que
  não existe em nenhuma página.
- `divSuporte.css` vazio e `lines.css` órfão (ver CSS).
- `buttonWpp.css` (`.btn-whatsapp-pulse`) não é usado na home, mas é usado nas
  10 outras páginas. Fica.
- `@property --mx/--my` são registradas com `inherits: false`. O brilho que
  deveria seguir o cursor mora no `__bg` e no `::before`, que não herdam o
  valor que o script escreve na raiz — então ele não segue; só a sombra segue.
  `inherits: true` faria o brilho acompanhar o mouse, o que muda o hover.
- O Lenis loga cada quadro de rolagem no console (`lenis.on("scroll",
  console.log)`).
- O CNPJ está duas vezes no HTML: no bloco de marca do rodapé (visível abaixo
  de 1080) e na barra legal (visível do lg em diante). O CSS mostra um de cada
  vez; mudar o texto é mudar nos dois.
- No desktop o rodapé ainda repete endereço e horário do #contato, e o aviso
  legal segue centralizado em 8px: a fase 8 mexeu só abaixo de 1080.

**Tipografia**
- Os 34 degraus legados. Colapsar é retipografia, com aprovação.
- Rótulos dos CTAs em TT Fors, não em NCS. Unificar muda a fonte do CTA que
  converte.
- A NCS não tem algarismos tabulares: alinhar os números herói pede outra
  fonte para os dígitos.
- O subtítulo do #contato passa da medida (124 caracteres numa linha).
- No celular os rótulos de botão md seguem em 10,8px e o selo do card
  recomendado em 10px: são controle e rótulo, fora do piso de 16px da fase 8.
- O H1 do celular tem ~3% de folga: o tamanho é calculado para "OPERAR DAY
  TRADE." caber numa linha (13,08em na NCS). Mudar tracking, peso, fonte ou
  palavras do título pede refazer a conta.

**Acessibilidade**
- **Sem skip link.** "Pular para o conteúdo" seria texto novo, visível no foco
  (regra 1). No desktop são 8 paradas até o CTA do herói.
- **Shift+Tab pode deixar o foco sob a nav fixa** (a tarja e a barra somam
  ~130px no topo). `scroll-padding-top` resolveria, mas muda onde as âncoras
  internas — "Começar agora mesmo" → #plan — param na tela, e isso é decisão
  do caminho de conversão.
- **Nomes acessíveis que dependem de conteúdo** (regras 1 e 3): os três ícones
  sociais não têm nome — o leitor de tela anuncia só "link"; o link da tarja
  envolve uma imagem sem alt; as setas do carrossel dizem "Next slide" e
  "Previous slide", o padrão em inglês do Swiper.
- **"Cookie" e "Políticas de Uso" têm `href=""`**: recarregam a própria página.
- **Vídeos do #ba sem controle de pausa** para quem não pediu movimento
  reduzido (WCAG 2.2.2). Resolver pede um controle visível novo.
- **A palavra do herói troca a cada 2s mesmo com movimento reduzido** — sem
  animar, por decisão explícita do código. O 2.2.2 pede um jeito de pausar o
  que se atualiza sozinho por mais de 5s; congelar numa palavra é decisão de
  copy.
- **Esc dentro do player do YouTube não fecha o modal**: o iframe é de outra
  origem e a tecla não chega à página. O foco entra no X ao abrir; quem entra
  no player sai com Tab e volta ao X, porque o resto da página está inert.
- **Tarja em 320px**: o link tem 43,5px de altura, pela proporção da arte da
  campanha.
- **Botões de modo** (30/60 dias/reinício): ~26px de altura, hoje ocultos pelo
  `planos.json` (modo único). Se voltarem, precisam do mesmo tratamento.
- **Botão do herói em tela baixa** (fase 8, decisão do cliente): no
  navegador do Instagram, nas telas de 375×667 (iPhone 6s/7/8 e SE 2/3) ele
  fica ~60px abaixo da dobra. Se voltar à pauta, a saída é compactar o herói
  só em tela baixa (foto menor, texto mais alto), sem mexer nos outros
  aparelhos.
- **iPad em paisagem** (≥1080 com toque): a regra de toque cobre links e
  ícones em qualquer tela de toque, mas os botões da barra da nav continuam no
  sm do desktop (30px).
- **Terceiros** (regra 2): no celular, do #ba em diante, o launcher e a
  mensagem proativa do Zendesk cobrem o canto inferior direito de CTAs e
  cards enquanto a página rola (no herói e no #divisa não aparecem mais,
  fase 8), e são três paradas de Tab em iframes no fim da página. O RD Station
  deixa um iframe invisível que recebe foco depois do rodapé.

**SEO — o que ficou para decisão (fase 16)**
- **Qualidade do alt.** Resolvido em parte na fase 17: os seis depoimentos
  passaram a trazer nome e valor lidos da própria arte, e as três fotos de
  fundo do #ba, que repetiam o `<h3>` do cartão, foram para `alt=""`. Segue
  em aberto o que é estrutura: os três cartões do #topicos têm o título só
  dentro da imagem, sem `<h3>` em HTML.
- **"Cookie" e "Políticas de Uso"** seguem com `href=""`, recarregando a
  própria página. A segunda não tem para onde apontar — a página não existe.
- **A barra no destino do redirect** (`/home` -> `/home/`, SEO-05) ficou de
  fora da fase 18: a regra não está em nenhum `.htaccess` do repositório, mora
  na raiz do documento, fora daqui. É edição à mão.
- **O sitemap** lista a raiz, que redireciona duas vezes, e não lista
  `/home/`. A decisão (sitemap estático avulso declarado no robots da raiz,
  ou mover a home para a raiz) está descrita na fase 16. O `robots.txt` e o
  `sitemap.xml` que moravam em `/home/` foram apagados na limpeza de deploy,
  junto com o `<link rel="sitemap">` das 11 páginas: não faziam efeito ali.
- **meta description e o link para Quem Somos**: resolvidos na fase 18. Segue
  em aberto o `"description"` do JSON-LD `Organization`, que ainda traz a
  frase antiga de 195 caracteres — é dado estruturado, não sofre o corte do
  resultado de busca, e mudar é copy.

**Saídas para o Zendesk que sobraram (fase 13)**
- O "Abrir no Zendesk" do modal de artigo e o link do estado de falha da
  API continuam levando para fora. O primeiro é decisão de conteúdo (o
  artigo já está inteiro no modal); o segundo é a única saída quando a
  central não carrega.

**Central de ajuda (fase 10)**
- ~~Doze categorias no celular são doze cards em pilha~~ — resolvido na fase
  12: em repouso são três fileiras (4 cards no celular, 6 no tablet), com o
  resto atrás do "Ver mais".
- O painel de artigos abre embaixo da grade inteira: no celular, longe do
  card tocado. Abrir o painel logo abaixo da fileira do card, ou o artigo
  direto num modal só, é decisão de interação (ver "modal dentro de modal").
- O painel e as linhas de artigo seguem no visual de antes — gradiente
  `--sup-ajuda`, borda azul de 2px, `--raio-sm` —, e o esqueleto de
  carregamento (quatro barras numa coluna) não tem a forma da grade nova.
- A descrição das categorias é cortada em duas linhas também onde o texto
  passa disso (6 das 12 em 390 e em 1474, 10 em 320): o texto inteiro fica no DOM e no nome do botão
  (o leitor de tela lê tudo), mas não na tela.

**Publicação e harness**
- **A raiz do repositório é publicada** (tem o `.htaccess` de cache):
  `comparacao.html`, `medidas/`, `scripts/` e este arquivo vão junto num
  deploy desta branch. As capturas não vão (`shots/` está no `.gitignore`), e
  a comparação publicada abriria sem imagens.
- `npm run stamp` quebra (`tools/` não existe).
- As páginas de pedido e de certificado carregam o mesmo CSS e herdam, no
  celular, o rodapé e a barra legal da fase 8 (duas colunas, links em linha).
  Endereço e horário continuam lá: só somem onde o bloco de marca tem o
  CNPJ, que é a home.
- As capturas não servem para diff por pixel (ver Harness); congelar o
  contador, o countUp e os vídeos durante a captura é trabalho de harness.

## O que já está certo e NÃO deve ser mexido
- Pareamento tipográfico: NCS Radhiumz (display) + TT Fors Trial (corpo)
- Acento de marca único, o azul #0080C9; o dourado só no plano recomendado
- A arquitetura da seção de planos (regra 7)
- Alvo de toque de 44px e o anel de foco único
- A cobertura de `prefers-reduced-motion`
- Ritmo vertical de 64px entre seções e a escala de espaço dentro delas
- Container de 1120px no desktop
- Nenhum scroll horizontal em nenhuma largura
- CLS de até 0,0006 no celular (375) e 0 no desktop (1474), no carregamento (fase 8; em 390, uma carga em cinco deu 0,0071, um pico do #divisa que já existia) — o CSS reserva espaço com contêineres de altura fixa e
  imagens `position:absolute` + `object-fit:cover`. **Qualquer mudança que
  quebre isso é regressão.**

## Harness (branch `design/refino`)

    node scripts/medir.mjs <rótulo>    # medidas/<rótulo>.md
    node scripts/shots.mjs <rótulo> [--regiao <seletor>] [--margem <px>] [--larguras 375,1474]
                                       # shots/<rótulo>/<largura>.png — só quando pedirem

Os dois sobem um servidor estático próprio sobre a raiz do projeto (porta
efêmera) — não dependem do Live Server estar rodando. Nenhum dos dois escreve
no site. Baseline de 09/09/2026: `shots/baseline/` e `medidas/baseline.md`.
As larguras moram em `LARGURAS` (`scripts/lib/pagina.mjs`) e valem para
shots, medir e acabamento: nove desde a fase 8, que trouxe 390 e 430 — as dos
iPhones em uso. Medições em `medidas/` (`fase2` a `fase8`, com `-a11y`,
`-acabamento` e `-movel` conforme a fase); para comparar uma fase nova, rodar
com o rótulo dela contra a anterior.

`scripts/lib/pagina.mjs` prepara a página antes de fotografar, e a receita não é
opcional: sem ela metade da página sai invisível. Motivo — `AOS.init` roda sem
`once`, então o AOS re-esconde o que sai do viewport; os ScrollTriggers do `#ba`
usam `toggleActions: 'play none none reverse'`, ou seja, voltar ao topo desfaz a
entrada dos cards. O preparo destrói o Lenis, varre a página até o fim, mata os
ScrollTriggers preservando o estado, volta ao topo e reafirma as classes do AOS.
Também congela o que varia entre execuções: pausa os `<video>` em loop no quadro
0 e devolve à palavra rotativa do herói (`.reveal-word`, girada por GSAP) o texto
que veio no HTML — lido logo no `DOMContentLoaded`, antes que o GSAP gire a
palavra. **Quem mexer em AOS, GSAP ou Lenis revisa esse preparo junto.**
`prepararPagina` tenta o `goto` até três vezes.

**Rede, espera e contexto (depois da fase 9).** O harness ficava lento pelo
motivo errado: toda carga esperava o evento `load` por até 25s, e ele
depende dos terceiros — 33 domínios, vários com requisição periódica. Agora:

- **Só a própria origem e o que compõe a página.** O contexto de cada
  script aborta todo pedido que não seja do servidor local ou de uma lista
  de prefixos do que vem de fora mas faz parte da página: as bibliotecas
  (jQuery, GSAP, Lenis, AOS, Swiper, CountUp, ionicons), as fontes, a API da
  central de ajuda (`ajuda.zero7.com.br/api/`, de onde vêm as perguntas do
  #faq) e o selo do Reclame Aqui. Bloquear essas também mediria outra página
  — sem as bibliotecas o `global.js` para no `AOS.init`; sem a API o #faq
  fica vazio e a página encolhe 1.000 a 1.500px no celular. Elas vêm de um
  cache local, `shots/_cache` (fora do git: são arquivos de terceiros), que
  se preenche na primeira carga; o conteúdo do #faq e do selo fica
  congelado nele, e apagar a pasta renova. Fica de fora o rastreamento, o
  anúncio e o chat: GTM, Google Ads e Analytics, Meta, RD Station, Hotjar, o
  `send-event` próprio e o Zendesk — 28 hosts numa carga. Quem precisa de um
  terceiro abre com `{ terceiros: true }`; `PAGINA_TERCEIROS=1` libera em
  qualquer script.
- **Espera curta.** Depois do `DOMContentLoaded`, 800ms fixos no lugar do
  `load`; imagens e fontes têm espera própria. O `cls.mjs` e as sondas de
  teclado e movimento do `a11y.mjs`, que não passam pelo preparo, também
  trocaram o `load` por uma espera fixa e usam a mesma rede.
- **Um contexto por modo, não por largura.** A largura muda pelo viewport e
  a página recarrega no mesmo contexto; onde o toque importa (abaixo de
  1080), são dois, um de toque e um de mesa. A exceção é o `cls.mjs`, que
  abre um contexto novo por largura de propósito: o CLS mede a carga, e
  reaproveitar o contexto esquentaria o cache e esconderia o CLS de fonte e
  imagem.
- **Captura é opcional.** A verificação de cada fase é numérica. O
  `shots.mjs` só roda quando pedirem, e com `--regiao <seletor>` fotografa só
  o trecho (com 160px de margem, ou a de `--margem`) em vez da página
  inteira; `--larguras 375,1474` limita as larguras. As capturas do
  `movel.mjs` (menu e nav) e do `dobra.mjs` só saem com `CAPTURAS=1`.

Até a fase 20 as fontes vinham do `fonts.cdnfonts.com`, que no navegador do
harness falhava de vez em quando: sem `@font-face` para esperar, a página era medida na
fonte de fallback — letra mais larga, linha mais alta; na fase 8 isso
produziu 85 "mudanças" falsas no retrato de 1474. Com o cache elas chegam
sempre, e o preparo ainda espera as duas famílias terem uma face carregada,
por até 10s, avisando (`aviso: fonte não carregou`). O retrato guarda as
fontes carregadas, e o `comparar` avisa quando elas diferem entre os lados.

Validado contra o harness antigo, no mesmo worktree, um em seguida do outro:
o `medir` das nove larguras caiu de 201s para 99s, e o `movel`, o `a11y` e o
`dobra` rodam em 1 a 2,5 minutos, sem aviso de fonte ou de carga. Os números
batem — altura da página, tipografia, cores, botões, texto abaixo de 16px,
rodapé, alvos de toque, dobra e CLS. Muda só o que era de terceiro: o
teclado não passa mais pelos iframes do Zendesk e do RD Station (3 ou 4
paradas a menos, as que não tinham indicador de foco), a sonda de movimento
reduzido não vê mais as animações do Zendesk, e a contagem de valores
distintos do `medir` perde os raios (100%, 20 e 22,86px) e o gap (8px) dos
contêineres do Zendesk. Comparação entre versões continua valendo desde que
os dois lados rodem com o mesmo harness — as medidas das fases 2 a 9 são do
harness antigo.

`shots/` está no `.gitignore`: são ~25 MB por rótulo de página inteira, e
qualquer commit permite regerar as imagens. Lá mora também o cache das
dependências (`shots/_cache`). `medidas/` é versionado.

`servidor.fechar()` derruba as conexões abertas (`closeAllConnections`): o
navegador deixa as dos `<video>` do #ba em keep-alive, e o `close()` sozinho
esperava por elas indefinidamente — sem saída nenhuma, porque o relatório só
é gravado depois do fechamento.

### ⚠ As capturas NÃO servem para diff por pixel

Rodar `shots.mjs` duas vezes **com o mesmo código** produz imagens que
diferem em ~21% dos pixels, e a altura da página varia. Três fontes, todas
intocáveis por regra:
- **o contador da tarja promocional** muda a cada segundo (regra 5);
- **countUp** anima os números do `#divisa` e para em valores diferentes;
- **os `<video>`** do `#ba` — o preparo pausa e volta para `currentTime = 0`,
  mas o repaint do frame não é garantido antes do screenshot.

**As capturas servem para olho humano, não para comparação automática.** Para
afirmar que uma largura não regrediu, use os números e a inspeção visual,
nunca um hash de arquivo.

A altura da página também não é confiável em todas as larguras. Em 768 duas
execuções idênticas já deram 154px de diferença, provavelmente pelos vídeos e
imagens lazy do `#ba`, cujas alturas intrínsecas pesam mais quando o layout
empilha; 1024 também oscila. **1474 é a referência mais estável.** 320 repete
ao byte entre execuções do mesmo script, mas o `shots` e o `medir` já
divergiram 112px nela (conteúdo de terceiro que carrega de fora: selo do
Reclame Aqui, central de ajuda). O que é estável em qualquer largura:
container, font-size, scroll horizontal e as contagens de dispersão.

### Métrica de botões

`medir.mjs` conta **assinaturas visuais de botão**: preenchimento · altura ·
cantos · família · corpo · peso · caixa. A matiz (azul/verde) fica fora da
assinatura e é contada à parte. O conjunto medido é fixo por seletor
(`button`, `[role=button]`, `a.z7-btnx`, `a.faq__cta-link`, setas do Swiper),
para acrescentar classes de componente não mudar quem é contado. Ficam fora o
seletor segmentado (`role=radio`), os indicadores do carrossel, os `<button>`
que são cards da central de ajuda e os cards de depoimento. A família entra na
assinatura lida na **raiz** do botão; o texto visível mora no rótulo, que sai
em TT Fors (ver Tipografia).

### Acessibilidade de interação

    node scripts/a11y.mjs <rótulo>                      # medidas/<rótulo>-a11y.md
    A11Y_FOLHA=<pasta> node scripts/a11y.mjs <rótulo>   # + folha de contato do foco

Três sondas:
- **Toque** (375, 320, 390 e 430, `isMobile` + `hasTouch`): alvo efetivo por
  `elementFromPoint` ao longo das duas retas que passam pelo centro, em
  quartos de pixel — sem grade nos cantos, porque canto arredondado e vizinho
  encostado reprovariam alvos de 44 cheios. Clicável é link, botão, `role`
  button/radio/tab, `tabindex` ≥ 0, `onclick`, `.depoimento` e a paginação do
  Swiper; clicável dentro de clicável conta uma vez. Desabilitado, oculto,
  fora da tela e terceiros (selo do Reclame Aqui) ficam fora da conta, mas
  aparecem no relatório. Os `data-aos` saem antes de medir.
- **Teclado** (1280, 768 e 375): Tab do topo até o foco dar a volta. Cada
  parada compara o estilo com e sem foco (outline, sombra, fundo, borda, cor —
  no elemento e nos pseudo). O mesmo elemento em 5 Tabs seguidos, ou um que
  volta antes do fim, é travamento.
- **Movimento** (1280 e 375, `prefers-reduced-motion: reduce`): rola do topo ao
  fim e lista o que ainda se mexe — animações e transições CSS acima de 50ms
  (`document.getAnimations`), tweens ativos do GSAP, vídeos tocando, Lenis,
  scroll suave, `speed` do Swiper, contadores fora do número final e blocos do
  AOS invisíveis na tela. E confere **texto coberto**: cada título e parágrafo
  na tela precisa ser o que o `elementFromPoint` acha no seu próprio centro
  (longe das faixas fixas do topo e do Zendesk).

A sonda de toque usa o preparo do harness. Teclado e movimento, não: o que se
mede ali é justamente o comportamento do Lenis, do AOS e do GSAP na página
real. As guardas de movimento reduzido não mexem nas capturas: `shots.mjs` e
`medir.mjs` rodam com `reducedMotion: 'no-preference'`.

### Acabamento

    node scripts/acabamento.mjs <rótulo>   # medidas/<rótulo>-acabamento.md

Com o preparo do harness e **sem o AOS** (os `data-aos` saem antes de medir:
o AOS desloca em 100px os blocos fora da vista e a sonda pegaria o layout no
meio do caminho). Seis leituras:
- **Medida de linha** — caracteres por linha de cada parágrafo de 80+
  caracteres, contados por `Range`, nas nove larguras do harness; a última linha de cada
  parágrafo fica fora do máximo.
- **Ritmo** — a distância entre os blocos da pilha de cada seção (título,
  subtítulo, conteúdo), e se cai num degrau de `--esp-*` (±1px).
- **Elevação** — blocos de 40×40px ou mais com sombra de queda (deslocamento
  ou desfoque; anel `0 0 0 Npx` conta como borda e `inset` não conta) ou borda.
- **Caixa alta** — letter-spacing, em em, de todo texto próprio em
  maiúsculas, agrupado por papel e família.
- **Números** — `font-variant-numeric` dos textos com dígito nos specs e
  preços dos planos e nos valores do #divisa.
- **Ícones** — desvio do centro do ícone em relação ao centro das maiúsculas
  da linha vizinha; ícone com mais de duas linhas de altura é pictograma e se
  mede contra o centro do bloco de texto.

### Celular, retrato e CLS (fase 8)

    node scripts/movel.mjs <rótulo>                    # medidas/<rótulo>-movel.md (+ shots/<rótulo>-movel/ com CAPTURAS=1)
    node scripts/retrato.mjs tirar <rótulo> [largura]  # shots/<rótulo>/retrato-<largura>.json
    node scripts/retrato.mjs comparar <a> <b> [largura]  # medidas/retrato-<a>-x-<b>-<largura>.md
    node scripts/cls.mjs [largura…]                    # CLS na carga e rolando
    node scripts/dobra.mjs <rótulo>                    # medidas/<rótulo>-dobra.md (+ shots/<rótulo>-dobra/ com CAPTURAS=1)
    node scripts/divisor.mjs                           # medidas/divisor.md
    node scripts/faq.mjs [rótulo]                      # medidas/faq.md (ou faq-<rótulo>.md)
    node scripts/raiz.mjs <rótulo>                     # medidas/raiz-<rótulo>.md

- **`movel.mjs`** roda em 320, 375, 390 e 430 com as alturas de tela dos
  aparelhos (e em 768 e 1474), contexto de toque abaixo de 1080 e sem o AOS.
  Lê: o texto abaixo de 16px por categoria (conteúdo, rótulo, controle,
  navegação, rótulo de chip, aviso e barra legal; tarja e selo de terceiro
  ficam fora); o que passa da viewport ou fica cortado por um ancestral; o
  menu aberto (painel, botões, scrim e fechar pelo scrim); a nav rolada sobre
  o #topicos — as duas com captura, se `CAPTURAS=1`; os cards de benefício ao roçar
  (`mouseenter` sintético) e ao tocar (`tap` do Playwright); e medidas
  pontuais de herói, títulos, CTAs, nota dos planos, vão entre seções,
  rodapé e barra legal. As capturas vão para uma pasta própria, para não
  entrar na contagem do `shots.mjs`.
- **`retrato.mjs`** guarda, para cada elemento com caixa em nav, herói,
  seções e rodapé, a posição (em 0,5px) e os estilos que pintam, com
  movimento reduzido — a página fica determinística, sem AOS, entradas do
  GSAP, vídeos nem contadores girando. `comparar` lista o que mudou de estilo,
  tamanho ou texto, o que só se deslocou na vertical, o que surgiu e o que
  sumiu. É o que permite afirmar "idêntico" entre versões, que as capturas
  não permitem (ver acima). Ficam fora a tarja e o contador, a palavra
  rotativa e o selo do Reclame Aqui. A chave de cada elemento é o caminho até
  o primeiro id estável — os ids que o Swiper sorteia a cada carga
  (`swiper-wrapper-<hex>`) não servem —, com tag, primeira classe e o índice
  entre os irmãos de mesma tag e classe. Acrescentar uma classe num elemento
  aparece como "sumiu" + "novo"; um irmão novo de outra classe não renumera
  os demais.
- **`cls.mjs`** carrega a página, espera 3s e rola até o fim; imprime o CLS
  das duas fases e os nós das mudanças acima de 0,0005. Varia entre
  execuções — a palavra do herói é a fonte em 375 —, então vale rodar duas
  vezes.
- **`dobra.mjs`** abre o topo da página em cinco áreas visíveis estimadas do
  navegador do Instagram — a tela do iPhone menos as barras do app: 375×640,
  390×672, 430×760, 375×550 e 320×460 — e mede a nav, a foto, o H1 e a base
  do botão do herói: se ele aparece sem rolar, e com quanta folga.

## Os dois instrumentos respondem perguntas diferentes

**O retrato de layout prova que a GEOMETRIA não mudou. Ele NÃO prova nada
sobre o que foi PINTADO.**

O retrato guarda, para cada elemento com caixa, a posição e as propriedades de
CSS que pintam. Então ele enxerga: tamanho, deslocamento, cor declarada, peso
declarado, elemento que nasceu ou sumiu. E ele **não** enxerga: o `poster` de
um vídeo, os bytes dentro de um arquivo de imagem, o que uma fonte de fato
desenhou, o que um `<canvas>` ou um vídeo pintou. Tudo isso muda pixel sem
mudar caixa — o retrato dá **0/0/0/0 e não viu nada**.

Para essas perguntas a prova é **captura comparada** ou **teste de
comportamento** (`readyState`, waterfall de rede, o que tocou e quando), nunca
o retrato.

Já custou caro duas vezes:

- **O piso do `#suporte`** (fase 11) foi congelado no valor errado e **passou
  em 0/0/0/0**: naquela largura quem mandava na altura era o conteúdo, não o
  piso, então o número errado não aparecia em lugar nenhum da medição.
- **O poster dos vídeos** (fase 19) passaria exatamente igual **se nem
  existisse**: `poster`, `preload` e `autoplay` não são propriedade de CSS, e
  o `width`/`height` do atributo perde para o `width: 100%` do autor. O
  retrato deu 0/0/0/0 nas nove larguras — o que provou que o poster aparece
  foi o `readyState` e o waterfall.

Regra prática: **antes de usar o 0/0/0/0 como prova, pergunte se a mudança tem
como aparecer no retrato.** Se a resposta for não, escolha outro instrumento.

## Etapa 0 em todo prompt

**Números que vêm da auditoria de 09/09 são de UM viewport e de um artefato que
pode já ter mudado.** Antes de agir: conferir contra o arquivo no disco, e
medir a caixa real **nas 9 larguras**, não em uma.

Quatro vezes o arquivo desmentiu o briefing:

1. **UX-04** — classificado como **CRÍTICO**: "a seção de planos mostra um
   plano por vez, num carrossel". O print do Gustavo desmentiu na hora — são
   **três cards lado a lado, com o Sênior destacado em dourado no meio**,
   exatamente a arquitetura que a regra 7 manda preservar. A causa: o painel
   do navegador **renderiza numa largura real menor que a emulada**, então o
   Swiper inicializava com `slidesPerView=1`. Foi medido o painel, não o
   monitor dele.
2. **As imagens do `#ba`** — o briefing dizia "exibidas em 337×262". O
   envelope real, medido, é **483×289** para dois cards e **984×289** para o
   terceiro, que vira largura cheia em 768 e 1024.
3. **Os AVIFs convertidos à mão** — o briefing listava três PNGs de 5.769 KB,
   4.917 KB e 1.600 KB. **Dois já eram AVIF** desde o commit inicial, com
   53,2 KB e 16,1 KB. Só o terceiro era PNG mesmo.
4. **A caixa dos vídeos** — o briefing dizia 160×371. Esse é o valor **em
   375px**; o envelope real é **984×462**. A diferença inverteu o item: o alvo
   de 2× ficou maior que a fonte, e o reencode que ia economizar passaria a
   degradar.

Houve ainda um quinto caso, do mesmo tipo: o `bg planos independencia.avif` do
PERF-06 **não existia** — era arte da campanha Independência, em
`assets/tarjapopup/`, removida quando entrou a MARGEM.

O custo de conferir é um comando. O custo de não conferir é reencodar para pior,
apagar o arquivo errado ou entregar uma rodada inteira baseada numa premissa
falsa.

### Reverificar com o mesmo instrumento não conserta nada

É o detalhe que faz o UX-04 valer a linha. Depois de classificar o carrossel
como crítico, o caso **foi reverificado em 1920 — e o erro se repetiu igual.**
A segunda leitura não corrigiu a primeira porque **o instrumento é que estava
errado, não a leitura**: o painel continuava renderizando numa largura real
menor que a emulada, e o Swiper continuava inicializando com
`slidesPerView=1`. Repetir a medição só produziu o mesmo engano com mais
confiança.

Quando uma medição contraria o que o arquivo, o CSS ou o cliente dizem, **a
primeira hipótese é o instrumento**, não o alvo. O que desempata é trocar de
instrumento — outro viewport de verdade, um print de quem está na frente da
tela, o valor lido direto do DOM, o arquivo no disco —, nunca rodar de novo o
mesmo. Vale igual para o retrato: ver "0/0/0/0" duas vezes não responde uma
pergunta que o retrato não sabe responder (ver a seção acima).

## Uma amostra não prova nada num comportamento com corrida

A seção anterior trata do **instrumento errado**. Esta trata do **sistema
não-determinístico**.

Comparação byte a byte dos 8 hrefs de checkout, **uma carga de cada lado**: os
hrefs saíram diferentes e pareciam regressão. Com **13 cargas de cada lado:
13/13 iguais nos dois estados.** A diferença era a corrida entre o `fetch` do
`planos.json` e o `DOMContentLoaded`.

Onde há corrida — `fetch`, animação, observer, lazy, terceiro na rede — uma
amostra não separa sinal de variância, **nas duas direções**: pode esconder
mudança real e pode inventar mudança que não existe. Repita até a distribuição
estabilizar e **reporte a distribuição, não a leitura.**

Caso: rodada dos três domínios bloqueantes. O relatório errado quase foi
enviado.

## Elemento semântico novo: confira o seletor de tipo antes

Este projeto estiliza **tipos de elemento**, não só classes. Introduzir uma tag
nova na página herda regras que ninguém escreveu para ela — e herda também o
**padrão do navegador** onde o CSS não declara nada.

Os três conhecidos:

| tag | o que ela herda | caso |
|---|---|---|
| `nav` | `navigation.css`: `position: fixed`, `width: 100vw`. Um `<nav>` novo vira uma segunda barra fixa no topo. Use `<div role="navigation">`. | paginador do #faq, 88e7cca |
| `h4`, `h5` | nascem em **peso 700** pela folha do navegador, e o CSS nunca declarou peso nesses blocos. Virar `<p>` derrubou o peso para 400, o texto estreitou e o `.price`, que tem a largura do conteúdo, encolheu **9px em 375**. | SEO-13, ea9b137 |
| qualquer filho do wrapper da nav | o reset `*:where()` do desktop zera `display`, `position`, `font-size` e mais, dentro de `nav#navigation .wrapper`. | logo da nav, b39f776 |

O do `nav` é o mais traiçoeiro porque **não quebra nada de imediato**: o
paginador do #faq foi medido em `y=5363` com `1280px` de largura e só então
apareceu que ele tinha virado barra fixa. Numa captura de tela do topo da
seção, nada disso se vê.

**Antes de usar uma tag que ainda não existe na página:** procure o seletor de
tipo no CSS **e** confira o computado antes e depois. Se o computado mudar, a
tag não é neutra — ou se declara o que ela perdeu, ou se troca a tag por uma
que já existe com `role`.

## overflow: hidden esconde estouro das sondas

A sonda de rolagem lateral compara `scrollWidth` com `clientWidth` do
documento. **Um ancestral com `overflow: hidden` corta o estouro antes
disso:** o filho pode estar com 2415px dentro de um container de 1120 e a
sonda devolve "sem rolagem lateral".

Caso: `max-content` como piso da coluna do título do #faq levou o `<h2>` a
2415px. O `overflow: hidden` do `#faq` escondeu, a medida de largura não
acusou nada, e **só a captura de tela mostrou** — o título partido em duas
linhas e o campo espremido.

Onde houver `overflow: hidden` no caminho — `#faq`, `#plan`, o balão da
tarja, a gaveta do menu —, **medir a largura do FILHO**, não só o scroll do
documento. E quando a medida disser que está tudo bem numa mudança de
layout, olhar a captura antes de acreditar.

## NCS Radhiumz é fonte de display

**Só em texto GRANDE e em CAIXA ALTA.** Nunca em caixa baixa, nunca em corpo
ou em subtítulo. É a fonte da assinatura da marca — o título de seção, o h1
do herói, o nome do plano. Em caixa baixa ela perde o desenho; em corpo
pequeno, a legibilidade.

Onde o texto é prosa, a fonte é a TT Fors. Quando os dois convivem na mesma
caixa — um título de corpo e um parágrafo —, a distinção vem de **três**
coisas juntas: peso, um degrau de tamanho e a tinta mais clara. Só peso e
tamanho, na mesma família e sobre fundo escuro, fica chapado.

Caso: o corpo do artigo da Central de Ajuda usava NCS nos h2, em caixa baixa
e em 16px — os dois limites rompidos de uma vez. Corrigido em fase 25.

### Onde a NCS está hoje, medido pelo computado

Varredura do DOM em 1474 e 390, procurando `font-family` computada com NCS.
As que **rompem a regra** (só relatório; consertar é rodada à parte):

| onde | corpo (1474 / 390) | caixa | o que é |
|---|---|---|---|
| `#plan p.js-price-parcel` | 50 / 28,8px | **none** | "12x R$13,04" |
| `#plan span` (dentro do preço) | 20 / 22,4px | **none** | "12x" |
| `#plan p.js-price-avista` | 20 / 20,8px | **none** | "ou R$130,41 à vista" |
| `#plan button.swiper-pagination-bullet` | 14 / 11,2px | **none** | nome do plano no paginador |
| `.z7-btnx` (todos os botões) | 16 a 10,8px | uppercase | rótulo de botão |
| `#footer h3` | 16 / 12,8px | uppercase | título de coluna |
| `#ba h3.ba-info__title` | 19,2px em 390 | uppercase | título de card |

As que **respeitam**: o h1 do herói, o `header h2` das seções, `#divisa h3`,
`#plan h3` (nome do plano), o título do painel e do artigo da Central.

O padrão dos preços é o mais claro: número grande em caixa baixa, que é
justamente o que a NCS não foi desenhada para fazer.

## REGRAS INVIOLÁVEIS

1. **Não altere nenhum texto visível.** Nem uma palavra, nem uma vírgula, nem
   capitalização. A copy depende de aprovação que ainda não aconteceu. Se um ajuste
   de layout parecer exigir texto diferente, PARE e pergunte.
2. **Não toque em tracking.** GTM, Meta Pixel, Hotjar, RD Station, Zendesk, dataLayer,
   e os scripts de terceiros ficam exatamente como estão.
3. **SEO só em rodada de SEO.** A rodada 1 (fase 16) mexeu no `<head>`, em
   atributos e na hierarquia de títulos, com autorização e com o critério de
   não mudar a tela. Fora de uma rodada dessas, JSON-LD, meta tags,
   canonical, Open Graph, títulos e alt text ficam como estão — e **alt text
   e meta description são conteúdo: passam por aprovação.**
4. **Não altere hrefs de checkout** nem a lógica que anexa a query string neles.
5. **Não mexa no contador da tarja promocional.** É decisão de negócio pendente.
6. **Não otimize imagens nem vídeos.** É outra rodada.
7. **Mantenha a arquitetura da seção de planos:** três cards lado a lado, o do meio
   destacado em dourado com o selo, specs em chips, preço com o parcelado como número
   herói, CTA de largura total. Essa seção converte bem e o cliente gosta dela.
   Refino sim, reestruturação não.
8. **Um commit por fase.** Nada de commits gigantes atravessando fases.
9. Se algo que você ia mudar parecer intencional e não um erro, **pergunte antes**.

10. **Depois de qualquer alteração em `css/` ou `script/`, rodar `npm run
    build` e commitar `dist/` + `index.html` juntos.** `npm run check` antes
    do commit — ele falha se o dist/ estiver desatualizado. `css/` e
    `script/` continuam sendo a fonte; ninguém edita `dist/`. As 10 páginas
    satélite seguem nos arquivos soltos com `?v=` — o giro de cache delas
    continua como sempre foi.

11. **Elemento animado é VISÍVEL POR PADRÃO.** O estado escondido das
    entradas só existe sob `html.anim`, que o carregador do `index.html`
    põe DEPOIS do LCP e só em ≥1080 — no celular GSAP/ScrollTrigger/AOS nem
    baixam, e `global.js`/`sectionBa.js` têm guardas de `typeof` para viver
    sem eles. Animação nova segue o mesmo padrão: sem a classe, CSS final;
    quem já está na primeira tela não anima quando a classe entra.

12. **O Zendesk carrega pelo observer do #ba** (a mesma condição que mostra
    o botão), sem fallback por tempo. Quem fica no herói não baixa o
    widget; sem IntersectionObserver ele não entra — falha escondido.

13. **O GTM entra depois do LCP** (ou primeira interação, ou 2.500ms — o
    que vier primeiro), e o `dataLayer` continua nascendo no `<head>`:
    push antes do container fica enfileirado e é processado na chegada.
    As páginas de obrigado mantêm o snippet original.

14. **As fontes servidas são os `.sub.woff2`** (subconjunto pt-BR com
    unicode-range; originais ficam ao lado, fora do carregamento). Ao
    trocar ou atualizar fonte: `node scripts/fontes.mjs` regenera os
    subconjuntos e imprime as métricas do fallback, e os preloads das 11
    páginas precisam continuar batendo byte a byte com o CSS.

15. **O GTM só entra na primeira interação** (pointerdown/touchstart/
    keydown/scroll/mousemove — C5, aprovado por Gustavo). Sem timer, sem
    LCP, sem load. O `dataLayer` nasce no `<head>` e push anterior é
    processado na chegada. Quem não interage não é contado pelas tags; o
    PageView server-side do Meta cobre esses. Nada de devolver gatilho de
    tempo sem nova aprovação.

16. **O selo do Reclame Aqui carrega sob demanda** (IO na própria div,
    600px de folga) — o script é injetado com o MESMO id e data-*. O
    markup da div não muda.

17. **A classe `activeCountdown` nasce no markup da nav** (campanha no ar
    = classe no HTML). O script do contador só a REMOVE na expiração; o
    caminho de ativação é no-op. Quem desligar a campanha no HTML tira a
    tarja E a classe. O `--tarja-offset` tem fallback CSS pela razão das
    artes (tarjaImage.css; desde a tarja em vídeo, a razão do VÍDEO, que
    é a do pôster) — trocou a arte, refaça a conta.

18. **O bundle CSS assíncrono usa `media="print"` + troca no onload**,
    nunca `rel="preload" as="style"`: o preload entra no grafo do Lantern
    como dependência da pintura e devolve ~1,8s de FCP simulado. O padrão
    mora no build.mjs; quem mexer no head mantém.

19. **O harness espelha a produção: brotli E os Cache-Control do
    `.htaccess`** (servidor.mjs — lote D, D0). Voltar o `no-store` em
    tudo quebra o reuso de preload e cada woff2 precarregado conta em
    DOBRO no laboratório (346KB contados onde a produção paga ~205KB). O
    cache frio do protocolo vem do contexto novo por carga e do
    `Network.setCacheDisabled`, nunca do header. Número de bytes de fonte
    anterior ao D0 está inflado — não compare entre eras (README,
    "Protocolo de medição").

20. **Os `css/fonts/*.hero.woff2` são GERADOS pelo build, nunca editados
    à mão** (lote E, E1). O build extrai os caracteres reais da primeira
    viewport do index.html (fatia `<body`…`</header>` + palavras
    rotativas + dígitos do contador), gera os subconjuntos, precarrega os
    hero e injeta as faces completas (`.sub`) por JS DEPOIS do load —
    fonte que começa antes do LCP observado entra no grafo do Lantern, e
    os ~205KB na frente da imagem custavam ~8 pontos no mobile. Mudou a
    copy da primeira viewport, rode `npm run build`: o check acusa hero
    desatualizado (git diff em css/fonts) e o build LANÇA se um caractere
    da dobra ficar fora do subconjunto. Não devolva as `.sub` ao crítico
    nem aos preloads; a `e1-prova.mjs` é o juiz do contrato (marca no
    primeiro frame, nenhuma `.sub` antes do LCP, todo caractere em
    webfont após o load).

21. **A tarja nasce na altura certa e a página nunca transborda na
    horizontal durante a carga** (lote E, E2). Três camadas, todas
    medidas: (a) o contêiner `.tarjaMidia` reserva altura com
    `aspect-ratio: <razão do vídeo>` por breakpoint (tarjaImage.css; o
    pôster e o vídeo preenchem a caixa — trocou a arte, refaça a razão;
    width/height do pôster acompanham a resolução do vídeo, regra 24);
    o relógio segura linha única com `white-space: nowrap`; (b) o
    extrator do crítico mantém, em QUALQUER dobra, regra que segura
    width/height de alvo com hint de largura maior que a viewport (o
    cupom com width=4138 explodia o body a ~4157px na fase só-crítico, o
    Chrome mobile travava o zoom em 0,25 e o ICB dos fixos inflava — era
    o grosso do "shift da tarja"), levando junto o position da âncora
    quando o alvo é absoluto; (c) `display: contents` entra na exceção
    das regras-que-escondem (alvo sem caixa). Régua: CLS de carga ≤ 0,01
    nas duas viewports do protocolo, no lento.

22. **Sonda de CLS não filtra por `hadRecentInput`** (cls.mjs, perf.mjs,
    e1-prova). O Chrome marca a flag em shifts de carga SEM input nenhum
    e o Lighthouse a ignora no laboratório — o filtro escondeu 0,10 de
    CLS por quatro lotes. Só filtre se a sonda gerar input real na fase
    medida.

23. **O crítico é emitido do TEXTO-FONTE do bundle, não do cssText**
    (critico.mjs, 2ª passada). Shorthand com var() é "pending
    substitution" no Chromium: o cssText imprime longhands VAZIOS e
    NENHUMA API devolve o valor — o gradiente do "2023" e o fundo do
    botão da nav saíam em branco no crítico. O scanner próprio alinha
    com o CSSOM por contagem em cada nível; desalinhou, avisa e cai no
    cssText. Os fallbacks métricos são calibrados por CONTAGEM DE LINHAS
    real (NCS 110% — caps, não avgWidth; TT 114%), varrendo size-adjust
    nas larguras do protocolo; trocou fonte de display, recalibre assim.

24. **Toda faixa de breakpoint que muda o herói precisa de uma viewport
    na extração do crítico** (critico.mjs — F3a). Extraído só a 390 e
    1474, a faixa ≥1600 ficava inteira fora: a 1920 o wrapper do herói
    crescia 579→725px e o #divisa nascia com altura 0 na chegada do
    bundle — CLS 0,36 que nenhuma régua via. Hoje a extração roda a 390,
    1474 e 1920; quem criar um breakpoint novo que mexa na primeira
    viewport ADICIONA a largura lá, no fouc.mjs e nos filmes de CLS. E
    cada entrada de <picture> acima da dobra leva width/height da
    PRÓPRIA arte (o C4 reprovou attrs só na img porque a razão do mobile
    valia para o desktop; por entrada, cada viewport reserva certo).

25. **ESTA pasta (Zero7, o repo do GitHub que o TurboCloud publica) é a
    ÚNICA pasta de trabalho do site** (migração de 06/10/2026). A antiga
    "Zero7 - Tentativa de Melhoria" está ARQUIVADA — não edite lá; o
    histórico dos lotes A–F3 vive no git dela. Fluxo: editar aqui →
    npm run build → npm run check → commit/push → sincronizar no
    TurboCloud → scripts/producao.mjs. Antes da migração: tag
    pre-melhoria-2026-10-06 (no GitHub) e "Zero7 - backup
    2026-10-06.zip" ao lado das pastas. O script/planos.json e os
    arquivos de campanha continuam sendo editados DIRETO aqui/no ar por
    quem gere campanha — as regras 2, 5 e 17 seguem valendo.

26. **Vídeo da tarja: pôster no crítico, vídeo só pós-load/idle**
    (out/2026). O pôster AVIF (quadro 0 exato do vídeo) é a tarja de
    verdade: entra no crítico com o contêiner e é o que o Lighthouse
    vê. O `<video muted playsinline loop preload="none">` nasce SEM src
    e SEM autoplay, transparente por cima; o script/tarjaVideo.js só dá
    src depois do load + requestIdleCallback (setTimeout no Safari), e
    só sem movimento reduzido e sem a Network Information API DIZENDO
    saveData ou 2g/3g. API ausente = desconhecido = libera: o Safari (e
    o Firefox) não têm navigator.connection, e a 1ª versão, que exigia
    "desktop OU 4g", deixava TODO iPhone no pôster. Formato: webm só com
    canPlayType 'probably' em Blink/Gecko; WebKit (todo navegador do
    iOS) leva mp4 H.264 faststart. Depurar no celular: ?tarjaDebug=1.
    Zero .webm/.mp4 antes do LCP e antes do load — o juiz é a
    scripts/tarja-video-prova.mjs (rede, cenarios, visual, iphone); em
    produção, o producao.mjs confere Range 206 nos quatro arquivos. Trocar
    campanha = rodar `node scripts/tarja-video.mjs <campanha>` com os
    masters novos (nome NOVO por campanha: cache imutável de 1 ano),
    trocar os caminhos no index.html e refazer as razões (regras 17/21).
