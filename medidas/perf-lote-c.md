# Rodada de performance 3 — lote C (implementação do plano-90)

Baseline: o "depois-b" (HEAD só diferia por docs/scripts — conferido por
diff de arquivos de página). Cada item traz medido × previsto na ablação.

## Placar

| | baseline (B) | depois-c | ablação previa |
|---|---|---|---|
| mobile score | 55 (54–56) | **66 (66–68)** — e 72 numa execução no modo baixo do FCP | teto sob restrição 76; sem GTM no trace, teto teórico 90 |
| desktop score | 96 (96–97) | **97 (97–97)** | — |
| mobile TBT sim | 516 | **0** | b previa TBT 0 ✓ |
| mobile FCP sim | 4.355 | 4.355 (mediana) / 2.555 (modo baixo) | ~2.553 |

Protocolo (9 cargas, mediana) — aqui o lote C aparece inteiro:

| combinação | métrica | B | depois-c |
|---|---|---|---|
| 390 lento | LCP | 2.748 | **1.564** |
| | TBT | 1.825 | **699** |
| | main thread | 2.673 | **1.566** |
| | bytes/req iniciais | 2.680KB/144 | **1.632KB/87** |
| | CLS carga | 0,0145 | **0,0083** |
| 390 livre | FCP=LCP | 148 | **120/172** |
| | TBT | 13 | **0** |
| 1474 lento | LCP | 3.200 | **2.864** |
| | TBT | 1.297 | **356** |
| | bytes iniciais | 2.961KB* | **1.264KB/78** |
| | CLS carga | 0,0499 | **0,0035** |
| 1474 livre | TBT / main | 14 / 161 | **0 / 181** |

\* o valor B inclui GTM na janela.

## Por item: medido × ablação

**C1 — bundle fora do grafo (`ff3f970`).** FCP simulado 4.355→2.555
(faixa da ablação: 2.553 ✓) e desktop 885→560. Score +4 × previsto +9 —
divergência >3 explicada ANTES de seguir: a ablação g removia os BYTES
(o LCP dela caía a 4.055); o C1 remove só a ARESTA — os 186KB seguem na
fila e o LCP não se move. FOUC ≤0,5% verificado (0,36–0,41%).
**Incidente aberto: o benefício é BIMODAL.** Execuções idênticas alternam
FCP 2.555 ↔ 4.355 (5 execuções: 2410/2554/2554/4357/4359) — o Lantern ora
tira, ora devolve a aresta do stylesheet media=print. É por isso que a
mediana oficial ficou 66 e uma execução deu 72. Causa não fechada.

**C2 — fontes: NÃO ENTROU.** A remoção dos preloads (única poda possível:
a sonda mostrou a dobra usando QUASE TODOS os pesos) explodiu o CLS de
0,0083 para 0,1724 no protocolo (sim 0,23) — os fallbacks métricos não
seguram um swap 1,3s depois do paint no h1 display. A régua "CLS não
piora" matou o item; revertido dentro do próprio lote. A ablação e (+6)
media SEM fontes nenhuma — não representa "sem preload com swap real".
De brinde, a reversão expôs um bug de reconstrução do build (um
</noscript> órfão por rebuild) — consertado em dois commits (57e15a1),
reconstrução agora por posição com auto-cura, build ×3 = zero diff.

**C3 — selo RA sob demanda (`663b3fb`).** Zero requisições a raichu/
reclameaqui/fonts.googleapis/fonts.gstatic na carga sem scroll; ao rolar,
o selo monta 352×76 idêntico (shot). data-model="2" quase escapou do
script injetado — pego em revisão. Ablação f isolada previa ~0 e ~0 foi
no score; o valor real é composição (menos 91KB e 4 conexões na janela).

**C4 — CLS (`8f4622c`).** Body-60px morto na causa (margem→padding em
body.home; :has não serve — só fica verdadeiro quando o header chega;
escopo por classe nova porque TODAS as páginas têm id="body");
activeCountdown no markup + fallback CSS do offset (erro 0,2px/0,0px nas
viewports do protocolo); preconnects. CLS carga: 1474 0,0499→0,0035; 390
0,0145→0,0083. **Aceite ≤0,001 NÃO fechou** — resíduos nomeados por
sources: um ::before do CTA (0,0025) no armar das ociosas, um residual da
nav só no throttle profundo (0,0046, valor final divergente do settled —
aberto), e a img da tarja na chegada da arte (0,0028 em 1474; a tentativa
de reservar caixa com width/height criou um shift maior, 0,0147, e foi
revertida no próprio item). Campanha EXPIRADA testada com Date mockada só
no harness: classe removida pelo script, nav no topo, sem buraco; tarja
colapsada no scroll ok; retrato 0/0/0/0.

**C5 — GTM na interação (o commit perf(gtm) — ver git log).** Zero requisições de tag
no trace do lh.mjs (mobile e desktop) — mobile 55→72 na execução de
aceite; TBT simulado a 0; b5-prova reescrita para o contrato novo e verde
(0 reqs sem interação; após um toque entram DEZ domínios — Meta, Hotjar e
RD confirmados todos via container; push pré-container processado; ordem
preservada). **Atribuição com número:** _gcl_aw presente 4.729–5.587ms
(mediana 5.272) após o pointerdown no CTA, protocolo lento. O 4selet.js
(lido, não alterado) anexa location.search inteiro à query do checkout —
o gclid chega por URL independentemente do cookie. Risco residual: perde
a atribuição POR COOKIE quem, em rede lenta, toca e sai em <~5,5s sem
outra página gravar o _gcl_aw; a atribuição por query sobrevive.

## A conta da nota, refeita (mobile depois-c, mediana)

| métrica | valor | score | peso | pontos perdidos |
|---|---|---|---|---|
| FCP | 4.355 (bimodal c/ 2.555) | 0,175 | 10 | 8,3 |
| LCP | 6.985 | 0,09 | 25 | 22,7 |
| TBT | 0 | 1,000 | 30 | 0,0 |
| SI | 4.355 | 0,753 | 10 | 2,5 |
| CLS | 0,0079 | 1,000 | 25 | 0,0 |

Soma ≈ 66,5 ✓. **O que falta para 90 agora é só FCP/LCP/SI simulados** —
fila de bytes da PRÓPRIA página (1,6MB na janela: fontes 204KB, swiper
151KB, jquery 31KB, imagens da dobra ~1MB, o HTML de 165KB com 78KB de
crítico). No modo baixo do FCP a nota já toca 72; os próximos pontos
exigem: (1) fechar a bimodalidade do C1, (2) cortar bytes próprios da
janela — e a ablação já mediu que imagem-abaixo-da-dobra/vídeo/JS dão ~0;
o que resta com massa é fonte (a via C2 exige fallback métrico muito
melhor no display) e a fila de imagens DA dobra.

## Aceites não fechados, resumo

1. C1: ganho +4 × +9 (arestas × bytes — explicado) e benefício bimodal.
2. C2: reprovado nos próprios aceites; revertido; não entrou.
3. C4: CLS ≤0,001 → 0,0083/0,0035 (resíduos nomeados; dois abertos).

## Incidentes

- Bimodalidade do Lantern com stylesheet media=print (aberto).
- Bug de reconstrução do bloco crítico (fechado, 57e15a1 + auto-cura).
- Residual da nav no throttle profundo com valor final 123 divergente do
  settled 72 (aberto).
- Sondas desta rodada: _c3-prova (descartável, sem commit).
