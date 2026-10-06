# Lote D — fontes e crítico (harness espelhando produção)

Meta: mobile ≥ 90, desktop ≥ 97. **Resultado: mobile 81 (79–87), desktop
99.** O desktop passa; o mobile fica a 9 pontos — e este relatório mostra
onde os 9 estão e qual decisão destrava cada um. Nenhum número daqui se
compara com eras anteriores (duas fronteiras: brotli no plano-90 v2,
headers de cache no D0 — README, "Protocolo de medição").

## D0 — harness com os Cache-Control da produção (commit 6b0a9ba)

O `no-store` antigo impedia o reuso de preload: cada woff2 precarregado
baixava DUAS vezes no laboratório. Com os headers do `.htaccess`
(dist/fontes/imagens `immutable`, HTML `max-age=300`, json `no-store`),
o aceite bateu: **7 woff2, cada um baixado uma vez, 205KB na rede**
(eram 346KB contados). Cache frio do protocolo preservado (contexto novo
por carga + `Network.setCacheDisabled`). Regra 19 no AUDITORIA.

### O que a era nova desmascarou: CLS 0,102–0,116 no trace do LH

O antes-d (pré-D0) tinha o CLS do LH em 0,0079 na mediana porque 3 de 5
execuções caíam num modo lento de carga; o D0 tornou a carga rápida o
modo único e o CLS real do trace apareceu: **0,102–0,116, ~3 pontos do
score**. Filmado com layout-shift sources:

- **A tarja nasce com ~139px e colapsa para ~78px** quando a arte chega
  (t≈150–190ms): o `<img>` da arte não tem dimensão intrínseca (só
  `sizes="96vw"`), e os `span.label` do contador entram depois (0→17px).
- O Chrome marca esses shifts com `hadRecentInput` **espúrio** (não há
  input nenhum); o LH ignora a flag no laboratório, a sonda antiga
  filtrava por ela — por isso nunca vimos. Lição registrada.
- Não é regressão do lote D: pré-existente, só estava escondido.
- **Fora do escopo aprovado do lote D — decisão do Gustavo** (item 2 das
  pendências abaixo). Atenção: o C4 já mediu que `width`/`height` na
  tarja piora 1474 (shift de 0,0147); o caminho é reservar a altura via
  CSS pela razão da arte (na linha do fallback do `--tarja-offset`,
  regra 17), não atributos.

## D1 — fontes: nenhuma variante atinge o gate de +10; SEM COMMIT

Regra de entrada: B entra se ≥ +10 no mobile COM a marca no primeiro
frame. Baseline pós-D0: **80 (80–87)**. Medido (5 execuções LH cada, em
raízes descartáveis; `medidas/d1-variantes.json`):

| variante | score | FCP | LCP | CLS | marca no 1º frame |
|---|---|---|---|---|---|
| baseline pós-D0 | **80** (80–87) | 1806 | 4287 | 0,102 | sim (preload) |
| A: `optional`, sem preload | 68 (68–80) | 2258 | 4289 | **0,298** | **não** |
| B (letra da tarefa): hero preload + completas `optional` no crítico | 78 (77–82) | 2258 | 4908 | 0,076 | não |
| B2: hero preload + completas só no bundle async | 78 (75–81) | 1545 | 5193 | 0,055 | **sim** |
| B3: hero preload + completas injetadas pós-load | **88** (82–88) | 1553 | 3703 | 0,055 | **sim** |
| B4: B3 com subconjunto POR FACE | **88** (85–89) | 1541 | 3618 | 0,054 | **sim** |

O que a medição ensinou (a física, confirmada em 3 passos):

1. **`font-display: optional` não remove o download.** A ablação "+12"
   media bytes AUSENTES; A e B mantêm os ~205KB na fila pré-LCP — por
   isso não ganham. A ainda estoura o CLS (0,298) e perde a marca.
2. **Qualquer fonte que COMECE antes do instante observado do LCP entra
   no grafo simulado do Lantern** — e na carga de laboratório o LCP
   observado é t≈175ms. B2 piorou o LCP porque a cadeia
   HTML→bundle→fontes é mais LONGA que o preload direto.
3. **A saída é começar as completas depois do load** (injeção JS
   load+rAF, o mesmo padrão do GSAP pós-LCP): B3/B4 tiram os ~205KB do
   grafo e o LCP cai a 3703/3618 — encostado no teto da ablação sem
   fonte nenhuma (3462).

Hipótese descartada no caminho: "a chegada da fonte re-pinta o elemento
LCP" — refutada; o candidato final de LCP é a imagem a t≈175ms, sem
candidato tardio.

Todas as 7 faces pintam o frame 1 (o "NCS 500/700" é peso sintetizado da
única face 400) — não dá para precarregar menos faces. O corte por
caracteres (B4) rende pouco: cada TT tem ~10KB de overhead fixo por
arquivo (heroes: 4,9KB NCS + 12–16KB por TT ≈ 92KB).

**Decisão para o Gustavo (nada foi aplicado):**

- **B4 dá +8** (80→88), com a marca no primeiro frame e CLS MELHOR que a
  baseline (0,054 × 0,102). Não atinge o gate de +10 sozinho — mas
  B4 + o conserto da tarja (item acima) se sobrepõem pouco e a soma
  estimada é ~91–92 (a confirmar em combinação, como sempre).
- O mecanismo difere da letra aprovada: as completas entram por injeção
  JS **pós-load** (não `optional` no crítico — o que foi aprovado e
  medido em 78). Risco real de UX: em rede lenta, texto ABAIXO da dobra
  fica no fallback métrico até o load; acima da dobra a marca aparece no
  primeiro frame via hero. Todo caractere continua em webfont após o
  load (aceite mantido); NCS segue face única 400.
- Se aprovar: o plano de implementação já existe (`fontes-hero.mjs` +
  portar para o build com regeneração por copy e gate no `npm run
  check`; sonda `_d1-variantes.mjs` fica no disco, fora de commit, para
  reproduzir).

## D2 — crítico só com o que pinta no frame 1 (commit d21ac91)

Duas podas no extrator (`critico.mjs`): @keyframes só se referenciados
por regra mantida (25→8) e seletores que exigem interação
(`:hover/:focus/:active`) fora do casamento. **79,0→74,0KB cru
(11,9→11,2KB br)**. Juiz: fouc.mjs **0,40%/0,37%** nas duas larguras, 5
cargas (≤0,5%). CLS não mudou.

**Medido +1 (80→81) × ablação +5 — divergência de 4, explicada:** a
ablação "crítico-metade" cortava 39KB às CEGAS, metade de tudo,
inclusive regras que pintam o frame 1 — jamais passaria no fouc. O +5
nunca esteve disponível dentro do aceite; +1 é o que a poda honesta
rende. O crítico é dominado por regras que pintam mesmo, em duas
viewports.

## antes-d × depois-d (protocolo completo, 9 cargas por combinação)

| | antes-d* | depois-d |
|---|---|---|
| LH mobile | 79 (56–80) | **81 (79–87)** |
| LH desktop | 99 (99–99) | **99 (99–99)** |
| 390 lento: LCP | 924 (892–936) | 928 (892–948) |
| 390 lento: TBT | 693 (656–782) | **577 (541–629)** |
| 390 lento: main thread | 1699ms | **1280ms** |
| 390 lento: bytes iniciais | 1069KB / 83 req | **994KB / 80 req** |
| 390 lento: CLS carga | 0,0156 | 0,0157 |
| 1474 lento: LCP | 1308 (1284–1340) | 1332 (1284–1348) |
| 1474 lento: TBT | 445 (359–608) | **332 (323–384)** |
| 1474 lento: main thread | 1308ms | **818ms** |
| 390 livre: LCP | 204 | **152** |

\* antes-d é pré-D0 (era anterior): os scores LH não são comparáveis
diretamente — a régua honesta do lote é a baseline pós-D0 (80). Os
números de protocolo (mesma máquina de throttle CDP) são comparáveis.

## A conta da nota (depois-d, mobile 81)

Com as curvas do próprio LH (p10/mediana; pesos FCP 10 / SI 25 / LCP 30
/ TBT 10 / CLS 25 — nomenclatura do lh.mjs):

| métrica | valor | perde |
|---|---|---|
| LCP | 4081ms (p10 2500, mediana 4000) | **~15** |
| CLS | 0,116 (p10 0,1, mediana 0,25) | **~3** |
| FCP | 1806ms (p10 1800) | ~1 |
| TBT | 111ms (p10 200) | ~0,5 |
| SI | 1806ms (p10 3387) | ~0 |

## O que falta para 95 (por ganho medido, nada estimado sem medição)

1. **B4 (fontes pós-load): +8 medido** → 88. Decisão do Gustavo (acima).
2. **Tarja com altura reservada: ~+3** (CLS 0,116→~0,01; valor da curva,
   a medir na implementação). Decisão do Gustavo; regra 17 vigia.
3. Depois de 1+2 (~91–92 se a soma confirmar), o resto é o LCP residual
   (~3618 com fontes fora do grafo): imagem do herói + bundle na fila de
   1,6Mbps — daqui em diante é **infra** (h2, Cloudflare laranja — plano
   v2, parte 4) ou repensar a arte do herói (fora das regras atuais).
   Teto v2 medido: 98.

## Housekeeping

- Commits do lote: 6b0a9ba (D0), d21ac91 (D2), este relatório. D1 sem
  commit (gate não atingido — decisão pendente).
- Dados: `medidas/d1-variantes.json`, `medidas/lh-{antes-d,antes-d1,d2-poda,depois-d}-*.json`,
  `medidas/perf/lote-d/*.json`. Logs fora (gitignore).
- Ficam no disco, FORA de commit, aguardando a decisão do D1:
  `scripts/_d1-variantes.mjs` (sonda, reproduz as 5 variantes) e
  `scripts/lib/fontes-hero.mjs` (a biblioteca que o build usaria).
- Regra nova: 19 (harness espelha produção). A regra do "subconjunto
  gerado, nunca editado" só entra se o D1 for aprovado.
- Lição de sonda: shift de carga pode vir com `hadRecentInput` espúrio —
  sonda de CLS não filtra mais por essa flag sem conferir se houve input
  de verdade.
