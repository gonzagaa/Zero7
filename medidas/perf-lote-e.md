# Lote E — B4 aplicado e o CLS de carga inteiro

Meta: mobile ≥ 90, desktop ≥ 97. **Resultado: mobile 93 (93–93), desktop
100 (100–100).** As duas metas batidas, com margem. Baseline = depois-d
(mobile 81, desktop 99).

## Medido × previsto

| | previsto (lote D) | medido |
|---|---|---|
| E1 sozinho (fontes) | +8 (B4: 88) | **+7** (88, 88–88) |
| E2 (CLS da tarja) | ~+3 | — (ver abaixo: o CLS era 5 causas, não 1) |
| combinação E1+E2 | ~91–92 | **93 (93–93)** — a soma superou porque o E2 também derrubou o LCP simulado (menos relayout antes da pintura: render delay do LCP 160→88ms) |

## E1 — fontes (commit 576b32e)

Reproduz a B4: `css/fonts/<face>.hero.woff2` gerados NO BUILD dos
caracteres reais da primeira viewport, precarregados (hash de conteúdo
na query); as faces completas (`.sub`) saem do crítico, do bundle e dos
preloads e entram por JS depois do load. Aceites, todos medidos
(`scripts/e1-prova.mjs`, juiz permanente):

- mobile ≥ +7: **88 (88–88)** sobre 81 ✓ (medido antes do E2 entrar);
- h1 na fonte da marca no FCP: ✓ nas duas viewports (família computada +
  `fonts.check` com o texto real);
- nenhuma requisição de `.sub` antes do LCP observado: ✓ (começam
  3,2–3,7s, pós-load; eram ~190ms);
- todo caractere renderiza da webfont após o load: ✓ (varredura por
  elemento, as duas caixas);
- CLS de carga ≤ baseline nas duas viewports, INCLUINDO scroll até
  #depoimentos antes do load: ✓ com folga no estado final —
  390: 0,0070 / com scroll 0,0326 (baseline 0,2742 / 0,2742);
  1474: 0,0078 / com scroll 0,0086 (baseline 0,0724 / 0,0738);
- fouc ≤ 0,5%: **0,00%** nas duas larguras (com o E2);
- NCS face única a 400 ✓; regra 20 no AUDITORIA.

Caminho até o desenho: `optional` puro (A do lote D) e hero+optional (B)
falham porque **`font-display` não remove o download** — os bytes ficam
na fila pré-LCP. Só tirar as completas da janela pré-LCP (pós-load, como
o GSAP) realiza o ganho da ablação. Detalhe medido: estender o charset
do hero ao body inteiro custa +20KB de preload, −1 ponto, e não melhora
nada — a fatia é só o herói.

## E2 — o "shift da tarja" eram CINCO causas (commit 42d1e20)

Régua do aceite: CLS de carga ≤ 0,01 nas duas viewports, no lento.
**Medido: 0,0068–0,0070 @390 e 0,0080–0,0097 @1474** (eram 0,27 / 0,07).
As causas, na ordem em que caíram:

1. **Zoom travado em 0,25**: o cupom (`width="4138"`, abaixo da dobra)
   rendia na largura natural na fase só-crítico → body ~4157px → o
   Chrome mobile trava o zoom no mínimo → o ICB dos elementos fixos
   infla → tarja/nav nascem com ~1082px e colapsam na chegada do bundle.
   Extrator: regra que segura alvo com hint > viewport fica em QUALQUER
   dobra, levando o `position` da âncora junto (sem ela o `ba-card__bg`
   reancorava no viewport — o fouc pegou como moldura de broken-image).
2. **Arte da tarja sem dimensão intrínseca**: `aspect-ratio: auto
   <razão>` por breakpoint + `white-space: nowrap` no relógio (no
   fallback ele quebrava em duas linhas — o 139→78px filmado no lote D).
3. **`display: contents` descartado pelo extrator** (alvo sem caixa): o
   `<picture>` da tarja dobrava de largura (536→1072) na chegada do
   bundle. Entrou na exceção das regras-que-escondem.
4. **Fallback métrico da NCS 65% largo demais**: 165,83% veio do
   avgWidth de caixa baixa, mas a NCS só aparece em CAPS — o h1 ganhava
   até 2 linhas no primeiro layout e o relayout era um shift de 0,15,
   sempre com `hadRecentInput` espúrio (por isso nenhuma sonda via; o
   LH ignora a flag). Recalibrado por contagem de linhas real: NCS 110%,
   TT 114% — casam nas larguras do protocolo.
5. **Crítico com declarações vazias**: shorthand com var() é "pending
   substitution" e o cssText do CSSOM imprime longhands vazios sem API
   que devolva o valor — o gradiente do "2023" e o fundo azul do botão
   da nav saíam em branco. O crítico agora é emitido do TEXTO-FONTE do
   bundle (scanner próprio alinhado ao CSSOM por contagem).

Aceites restantes: retrato antes-e × depois-e nas 7 larguras —
idêntico, exceto 1 span (`seg__blob`, pílula posicionada por JS) com
2,5px de largura de diferença em ≥1280 (invisível; o JS a mede em
runtime). Campanha expirada (Date mockada pós-30/09): tarja some,
classe e `--tarja-offset` saem, nav volta ao topo ✓. Tarja desligada no
markup: script sai limpo no `if (!root) return` ✓. Nenhum frame com a
tarja em altura errada no filme; resíduo de 3px (0,0028) na chegada da
arte a 1474 (razão reservada × razão da candidata 2400 — subpixel).
Sondas permanentes sem filtro de `hadRecentInput` (regra 22) e fouc com
contador congelado. Bônus: **fouc 0,00%** (era 0,40% — as causas 1/3/5
eram diferenças reais que o juiz antigo não isolava).

## depois-e (protocolo completo)

| | depois-d | depois-e |
|---|---|---|
| LH mobile | 81 (79–87) | **93 (93–93)** |
| LH desktop | 99 (99–99) | **100 (100–100)** |
| LH mobile FCP / LCP / TBT / CLS | 1806 / 4081 / 111 / 0,116 | **1544 / 3091 / 6 / 0,0004** |
| 390 lento: bytes iniciais | 994KB / 80 req | **699KB / 72 req** |
| 390 lento: TBT / main thread | 577 / 1280ms | **438 / 1068ms** |
| 390 lento: CLS carga | 0,0157\* | **0,0068** (régua nova, sem filtro) |
| 1474 lento: CLS carga | 0,0724\* | **0,0078** |
| 390 lento: LCP | 928 | 1596 (ver nota) |
| 1474 lento: LCP | 1332 | 1884 (ver nota) |

\* números da régua antiga com filtro de `hadRecentInput`; o valor REAL
da época era ~0,27 @390 e ~0,072 @1474 (medido na baseline com a sonda
nova). A régua nova é a regra 22.

**Nota sobre o LCP do protocolo (real-throttle)**: subiu ~670ms enquanto
o simulado caiu 1s. Hipótese com mecanismo: 7 preloads de hero ocupam as
6 conexões do **HTTP/1.1 do harness** e a imagem do herói espera vaga —
serialização por arquivo, não por byte. A produção serve **h2**
(multiplexado), onde essa fila não existe; o Lantern também não a
modela. 1596ms segue muito abaixo dos 2500 da régua verde. Arbitragem
final: PSI depois do deploy. Se o PSI discordar do simulado, os
suspeitos são esta fila e o h1.1 do harness (candidato a D0-parte-2:
servir o harness em h2).

**Preço do desenho**: a visita paga hero (+109KB) além das completas
(205KB) — mas as completas saem da janela pré-LCP e o total inicial do
390 lento ainda CAIU 295KB (994→699KB), porque a era antiga baixava
`.sub` duplicado e cedo.

## A conta da nota (depois-e, mobile 93)

| métrica | valor | perde |
|---|---|---|
| LCP | 3091ms (p10 2500, mediana 4000) | ~6,5 |
| FCP | 1544ms (p10 1800) | ~0,5 |
| TBT / CLS / SI | 6ms / 0,0004 / 1544ms | ~0 |

## O que falta para 95 — e se é código ou infra

Sobra UM assento: o LCP simulado (3091 → precisa ~2800 para 95). O que
resta na frente da imagem: o HTML com crítico inline (~29KB br), os
hero (~109KB) e a própria imagem — nada mais é removível por código sem
quebrar contrato (crítico menor já foi podado no D2; hero menor perde a
marca no frame 1). Daqui em diante é **infra**: h2 na origem (a fila de
arquivos morre), Cloudflare laranja/CDN (RTT menor — o modelo do Lantern
paga 150ms por salto), e o teto medido pós-GTM segue 98 (ablação v2).
Único código restante com ganho possível: reavaliar a arte do herói
(fora das regras atuais — decisão de design).

## Pendências que este lote revelou (fora de escopo, para decisão)

- `TypeError: window.zero7ArmarAnimacoes(...) is not a function` em toda
  carga, **pré-existente no HEAD** (confirmado na baseline) — o loader
  de animações pós-LCP desktop merece uma olhada.
- `seg__blob` 2,5px (acima) — se incomodar, o JS do seg pode re-medir no
  `document.fonts.ready`.

## Housekeeping

- Commits: 576b32e (E1), 42d1e20 (E2), este relatório. `npm run check`
  verde nos três.
- Regras novas: 20 (hero gerado no build), 21 (tarja/viewport), 22
  (sonda de CLS sem filtro), 23 (crítico do texto-fonte + calibração de
  fallback por contagem de linhas).
- Dados: `medidas/lh-{e1-fontes,depois-e}-*.json`,
  `medidas/perf/lote-e/depois-e-*.json`,
  `medidas/retrato-antes-e-x-depois-e-*.md` (7 larguras).
- `scripts/_d1-variantes.mjs` (sonda descartável do lote D) cumpriu o
  papel — B4 está aplicado — e sai do disco neste commit de docs.
