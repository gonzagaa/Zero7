# Rodada de performance 3 — lote B

Meta: mobile ≥ 75 no lh.mjs, desktop não cair de 94. Resultado: **desktop
96 (96–97) — mantido acima de 94. Mobile 55 (54–56) — não bateu**; a última
seção diz quanto falta e de onde viria.

Baseline: o "depois" do lote A (HEAD idêntico em arquivos de página,
conferido por diff; `npm run check` verde antes do primeiro item e depois
do último). Instrumentos e ressalvas do relatório A valem aqui.

## Lighthouse, baseline × depois-b (mediana de 5)

| métrica | mobile A | mobile B | desktop A | desktop B |
|---|---|---|---|---|
| score | 47 (45–47) | **55 (54–56)** | 94 (94–95) | **96 (96–97)** |
| FCP | 5.104 | **4.355** | 968 | 885 |
| LCP | 6.830 | **5.780** | 1.345 | 1.245 |
| TBT | 687 | 516 | 3 | 6 |
| SI | 5.104 | 4.355 | 1.156 | 894 |
| CLS | 0,0001 | 0,0168 | 0 | 0,008 |
| render delay do LCP | 109,8 | 130,9 | 161,5 | 200,4 |
| elemento LCP | img do herói | o mesmo | img do herói | o mesmo |

O FCP simulado do mobile, imóvel durante todo o lote A, moveu 749ms — o que
saiu da janela dele foram fontes (B3) e bibliotecas (B4).

## Protocolo (9 cargas, mediana)

| combinação | métrica | A (baseline) | B (depois) |
|---|---|---|---|
| 390 lento | LCP | 3.848 | **2.748** |
| | FCP | 1.244 | 1.032 |
| | TBT | 1.897 | 1.825 |
| | main thread | 2.897 | 2.673 |
| | bytes / req iniciais | 2.978KB / 147 | **2.680KB / 144** |
| | CLS carga | 0,0069 | 0,0145 |
| 390 livre | LCP=FCP | 124 | 148 |
| | TBT / main | 16 / 117 | 13 / 169 |
| | bytes iniciais | 2.849KB | **2.229KB** |
| 1474 lento | LCP | 4.456 | **3.200** |
| | FCP | 1.264 | 1.052 |
| | TBT / main | 1.791 / 2.951 | **1.297 / 1.999** |
| | CLS carga | 0 (0–0,0002) | 0,0499 (uma carga a 0,1734) |
| 1474 livre | LCP | 152 | 188 |
| | bytes iniciais | 2.856KB | **2.292KB** |

## O que cada item rendeu

**B0 (`6890cad`)** — fouc.mjs virou instrumento permanente (juiz do
crítico, ≤0,5% acima da dobra, no README); saíram 14 sondas, `.bkp-i3/` e
os 211 `medidas/retrato-*` (nenhum citado por nome no relatório A; todos
recuperáveis nos commits em que nasceram).

**B1 (`1a5cad3`)** — o radial magnético estava morto desde sempre
(inherits:false; 0,0% de pixels ao mover --mx) e custava um rAF com seis
setProperty por quadro em 16 botões. Handlers de pointermove: 16 → 0.
Shots idênticos nas 7 larguras (diffs só de serialização); hover com o
mouse centrado: 1,65/255. REGISTRADO: junto com o handler foi o TILT
(rotateX/Y seguindo o cursor) e o deslocamento direcional das sombras, que
estavam vivos — era a mesma máquina que o aceite manda zerar; o hover que
fica é subida + escala por transição, sombra do :hover e ripple.

**B2 (`031f3a5`)** — Zendesk carrega quando a condição de MOSTRAR o botão
fica verdadeira (observer do #ba), sem fallback por tempo. Parado no herói
8s: 0 requisições a *.zendesk.com/*.zdassets.com. Rolando: botão visível
em 1.336ms (≤1,5s). Volta ao topo esconde (cbcd296 preservado). Âncora
#plan: dispara na criação do observer.

**B3 (`e096a1d`)** — inventário mudou o plano: TODOS os pesos em uso (TT
Fors 300–800; NCS sintetiza 500/700/900 do face único). Subconjunto por
node/harfbuzz (sem Python na máquina): 328KB → 204KB de fontes locais
(−38%; o "esperado −50%" NÃO fecha — a cobertura mandada, blocos inteiros
+ → e ≥, é ~430 codepoints). Fallbacks com métricas reais
(size-adjust 124,83% / 165,83%). fonts.check com o texto real de cada nó:
ZERO fora da webfont. Achado de harness: o servidor de medição manda
no-store, e preload não pode ser reutilizado sob no-store — todo
precarregado baixa DUAS vezes no laboratório desde a fase 8; em produção o
immutable segura a segunda. Contabilidade de fontes daqui em diante é por
arquivo único. Ainda na janela: 91KB de Google Fonts (Inter Tight + Open
Sans), fora do escopo dos 7 WOFF2 — para decisão.

**B4 (`cbd4352`)** — abaixo de 1080, GSAP/ScrollTrigger/AOS NEM BAIXAM;
no desktop entram depois do LCP e o estado escondido só existe sob
html.anim (quem já está na primeira tela tem o data-aos removido antes de
a classe entrar: 0,01%/0,00% de pixels na primeira tela com × sem a
classe, congelada). O rotador do h1 saiu do GSAP para a Web Animations
API e gira nas duas plataformas. Reveals do desktop funcionam (ba-header
0,84→1,0 pego em transição). Celular: zero requisições das três libs,
zero nós visíveis com opacity 0, bytes livres 2.849→2.228KB. Lighthouse
mobile 47→55.

**B5 (o commit perf(gtm) — ver git log)** — GTM injeta no primeiro de LCP/interação/
2.500ms; dataLayer nasce no head e push pré-container é processado na
chegada (provado com push de teste via google_tag_manager[ID].dataLayer).
Zero requisições de tag antes do LCP nas duas larguras; sem interação,
gtm.js aos 174ms, fbevents 583ms, GA 861ms — todos ≤3s. ?gclid=teste123 →
_gcl_au e _gcl_aw presentes. Meta/Hotjar/RD não têm snippet próprio no
HTML: vêm todos pelo container. Páginas de obrigado intocadas.

## Aceites que não fecharam, com número

1. **Bytes de fonte −50% (B3): deu −38%** (328→204KB). Causa: a cobertura
   por blocos inteiros deixa pouco a cortar. Caminho para mais: derrubar
   Latin Ext-A (fora do mandado) ou os 91KB do Google Fonts.
2. **CLS de carga ≤0,001 (herdada do B3): 0,0145 no 390 lento e 0,0499 no
   1474 lento.** As fontes foram absolvidas por sonda de layout-shift com
   sources: o swap contribui 0,0003–0,0005 (a atribuição do relatório A ao
   font-swap estava ERRADA e fica corrigida). Os culpados medidos:
   - 390: a nav salta 121px (0,0108) quando o script PROTEGIDO da tarja
     (regra 5) põe activeCountdown e entrega --tarja-offset ~2,9s; no
     lote A o mesmo movimento saía amortizado (0,0092) por engrenagem que
     o mobile perdeu junto com o AOS.
   - 1474: um salto de 60px do BODY ~100ms após o FCP (0,0407), com estado
     capturado no instante: só a folha inline presente, :root já em 10px,
     margem de 6rem do header#home já computada, fontes "loading". O
     mecanismo exato do atraso NÃO foi fechado — incidente aberto, com os
     dados acima. Uma carga em nove foi a 0,1734.
   Conserto proposto (precisa de aprovação — mexe na composição
   tarja↔nav): reservar a posição da nav e o espaço da tarja desde o CSS.
3. **Render delay do LCP ≤100ms (herdada do lote A): 130,9/200,4ms.**
   Segue decode/agendamento da própria arte do herói.

## Incidentes

- O worktree de comparação serviu 0 requisições (allowlist do harness
  presa à raiz principal) — a comparação pré/pós-B3 saiu por interceptação
  de rede em memória.
- O pacote `critical`… (lote A). Neste lote, o fonttools não entrou por
  falta de Python; subset-font/harfbuzz em node o substituiu.
- Sondas do lote (não commitadas, para decisão): _b1-prova, _b2-prova,
  _b3-pesos, _b3-prova, _b3-cls-debug, _b4-prova, _b4-cls-1474, _b5-prova.

## O que falta para o mobile ≥ 75

Faltam ~20 pontos, e eles moram em FCP/LCP/SI simulados, funções dos
~2,7MB (lento) da janela inicial. Por origem, na última medição de
terceiros com tudo liberado:

| bloco | ~KB na janela | estado |
|---|---|---|
| imagens próprias (herói, bgs, cards, tarja) | ~900 | já com srcset/degraus (lote A) |
| vídeos/posters + JS próprio + CSS | ~700 | bundle e crítico feitos |
| fontes locais | 204 | subconjunto feito (B3) |
| Google Fonts | 91 | fora de escopo até aqui |
| Meta (fbevents + pixels) | ~250 | via GTM, agora pós-LCP (B5) |
| GTM + GA + ads | ~200 | pós-LCP (B5) |
| Zendesk | **0** | só carrega no scroll (B2) |
| RD Station + Hotjar + outros | ~130 | via GTM |

O Lantern, porém, continua contando o que chega DENTRO do trace dele —
pós-LCP ou não. Os próximos pontos viriam de: (1) reduzir de verdade os
bytes de imagem/vídeo da janela (a maior fatia própria), (2) Google Fonts
locais e subsetadas, (3) o que a gestora liberar de terceiros. E vale
repetir a ressalva do lote A: no PSI contra produção, o TTFB de 520–890ms
desloca todas as métricas de rede para cima antes de qualquer culpa do
site.
