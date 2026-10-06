# Plano 90 — v2 (pós-GTM), com ablação refeita

Investigação sem mudança no site. A única mudança fora de `medidas/` e
`scripts/` é ordenada pela própria tarefa: o harness passou a espelhar a
compressão da produção — e isso reescreveu o problema inteiro.

## Parte 3 — compressão (medida primeiro, porque muda a régua)

- **O harness servia tudo CRU** (zero `Content-Encoding`, conferido por
  leitura do servidor.mjs e por requisição). A produção serve **brotli**
  em HTML/CSS/JS (medido: `enc=br`; o HTML de lá desce 16KB na rede).
- Tamanhos: index.html **169KB cru → 29KB br**; o crítico inline dentro
  dele é a maior parte disso. Imagens/fontes: sem compressão nos dois
  lados (já são formatos comprimidos), idênticos.
- **Correção aplicada** (`scripts/lib/servidor.mjs`): brotli q5 com cache
  por mtime para html/css/js/json/svg quando o cliente aceita; binário
  cru; `PAGINA_SEM_BR=1` devolve a era antiga para comparação.
- Distorção que isso removia do lh.mjs vs PSI, MEDIDA: score mobile
  **66 → 78–79** só de ligar a compressão (10 execuções: 76–80). Todo
  número simulado de rodadas anteriores está em outra era e não se
  compara com os daqui.
- Resíduo de harness que AINDA infla: `Cache-Control: no-store` impede o
  reuso de preload e os 4 woff2 precarregados baixam 2× no laboratório
  (346KB contados vs ~204KB reais em produção com immutable). Fica
  registrado; não foi mexido nesta tarefa (mudar o no-store muda o
  desenho de cache-frio do protocolo — decisão à parte).

## Parte 1 — bimodalidade do C1: resolvida por remoção da causa

Coleta de 10 execuções na era comprimida: **10/10 no modo baixo**
(FCP sim 1.659–2.706; score 76–80; `medidas/bimodal-coletar.json`). A
hipótese proposta (Lantern reclassifica conforme o bundle termina antes/
depois do FCP observado) foi TESTADA E REFUTADA: o bundle termina antes
do FCP observado em 10/10 e o modo é baixo em 10/10 (na era crua, a
concordância também era nula). A alternância era função do TAMANHO CRU
do bundle (186KB) na fila simulada — um artefato do harness sem
compressão, que a parte 3 eliminou. **O experimento do conserto
(injeção por JS pós-frame) ficou sem objeto** — o HEAD já é 10/10
determinístico no modo baixo; nada a levar ao lote D por aqui.

## Parte 2 — ablação v2 (HEAD pós-GTM, harness comprimido, mediana de 3)

| categoria | −KB | score | FCP | LCP | TBT | SI |
|---|---|---|---|---|---|---|
| baseline | 0 | **78** | 1.803 | 4.661 | 76 | 1.803 |
| fonte NCS (só ela) | 22 | 79 | 2.705 | 4.586 | 0 | 2.705 |
| fonte TT Light | 32 | 78 | 1.804 | 4.885 | 109 | 1.804 |
| fonte TT Regular | 63 | 79 | 1.804 | 4.584 | 73 | 1.804 |
| fonte TT Medium | 32 | 78 | 2.555 | 4.883 | 0 | 2.555 |
| fonte TT DemiBold | 65 | 79 | 2.705 | 4.588 | 0 | 2.705 |
| fonte TT Bold | 66 | 79 | 2.705 | 4.737 | 0 | 2.705 |
| fonte TT ExtraBold | 66 | 79 | 2.704 | 4.583 | 18 | 2.704 |
| **fontes todas** | **346** | **90** | 1.956 | **3.462** | 0 | 1.956 |
| swiper | 40 | 79 | 2.555 | 4.661 | 0 | 2.555 |
| jquery | 31 | 79 | 2.704 | 4.734 | 0 | 2.704 |
| lenis | 4 | 79 | 2.556 | 4.659 | 0 | 2.556 |
| img tarja mobile | 0* | 78 | 2.704 | 4.734 | 0 | 2.704 |
| img logo-icon.svg | 1 | 80 | 2.554 | 4.585 | 0 | 2.554 |
| img bg mobile (herói) | 11 | 78 | 2.705 | 4.883 | 0 | 2.705 |
| **crítico pela metade** | 0† | **83** | 2.255 | 4.284 | 0 | 2.255 |
| teto v2 (tudo removível) | 1.038 | **98** | 1.531 | 2.273 | 0 | 1.531 |

\* bytes contados na baseline; a tarja variante-1500 entra por outro nome.
† o corte é no HTML servido, não numa URL — os KB não aparecem na conta
por padrão de URL; o efeito vem de ~39KB inline a menos (≈14KB br).

O "~1MB de imagens da dobra" do relatório C morreu na medição: a primeira
viewport mobile tem só herói (10,7KB), tarja (20KB) e logo (1KB) — o 1MB
era leitura errada do inventário v1 (que somava a página toda). Imagem,
Swiper, jQuery e Lenis: ~0 ponto cada.

**A física da nota agora**: perdem-se ~22 pontos, quase todos em LCP
(4.661 → precisa ~2.500-2.900). Dois assentos pagam quase tudo:

1. **Fontes (+12, medido)**: 346KB de woff2 VeryHigh na frente da imagem
   do LCP na fila de 1,6Mbps. Individualmente nada; o conjunto é o
   gargalo.
2. **Crítico menor (+5, medido)**: metade do inline = FCP −450ms e LCP
   −380ms. O crítico atual (78KB cru) carrega TODOS os @font-face,
   keyframes e uma dobra generosa em duas viewports.

## Parte 4 — plano v2 (ordenado pelo medido; teto pós-GTM = 98)

| # | item | ganho medido | como, concretamente | risco | aprova |
|---|---|---|---|---|---|
| 1 | Fontes fora da fila crítica | **+12** (78→90, ablação "todas") | o caminho SEM o CLS do C2: (a) `font-display: optional` + fallbacks métricos (sem swap = sem shift; 1ª visita em rede lenta fica no Arial-ajustado, 2ª sempre webfont) OU (b) subconjunto-da-dobra minúsculo inline/1 face + resto adiado. O C2 provou que "só tirar preload" com swap não passa na régua de CLS | troca de identidade tipográfica na 1ª visita lenta (a); complexidade (b) | **Gustavo/design** |
| 2 | Crítico pela metade | **+5** (78→83) | podar o critico.css: keyframes não usados na dobra, @font-face dos pesos que não pintam no frame 1, uma só viewport de folga; juiz continua o fouc.mjs | FOUC se podar demais — o fouc reprova | Gustavo |
| 3 | Harness: no-store × preload | corrige +? (medição hoje pune 142KB de fonte que produção não paga) | permitir reuso de preload no harness (immutable como produção) mantendo cache frio entre cargas | nenhum no site; muda o protocolo | Gustavo (protocolo) |
| 4 | Infra (h2, HTML sem no-store na origem, Cloudflare laranja) | não medido aqui (v1, parte 4) | fora do repo | DNS/SSL | Gustavo/infra |

Somando 1+2 pela ablação (não-aditivo, a confirmar em combinação): a
faixa 90+ fica alcançável SEM tocar em GTM/Meta — que já estão fora do
trace desde o C5. Swiper/jQuery/imagens: não gastar esforço; a medição
diz ~0.

## Housekeeping

- `scripts/lib/servidor.mjs`: brotli (a mudança de harness ordenada).
- `scripts/ablacao.mjs`: modo v2 (`node scripts/ablacao.mjs 3 v2`).
- Dados: `medidas/ablacao-v2.json`, `medidas/bimodal-coletar.json`,
  `medidas/ablacao-v2-run.log` fica fora (gitignore de logs).
- Sondas descartáveis da tarefa (`_bimodal.mjs`, `_v2-checagens.mjs`):
  removidas; os dados estão em `medidas/`.
