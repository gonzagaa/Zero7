# Rodada de performance 3 — lote A

Meta do lote: desktop ≥ 90 e mobile ≥ 75 no Lighthouse (preset mobile
simulado). Resultado: **desktop 94 (94–95) — meta batida. Mobile 47 (45–47)
— meta não batida**; a seção "o que falta para o mobile" diz por quê, com
números.

Instrumentos: `scripts/lh.mjs` (Lighthouse 13.5 programático, Chromium do
Playwright, 5 execuções por preset, mediana e intervalo, cache frio, sem
extensão) e o protocolo do README (`perf.mjs`, 9 cargas por combinação,
`conferirCarga` antes de cada uma — inclusive a trava de hash do bundle a
partir do item 4). **Ressalva de origem dos números:** os que motivaram o
lote vieram de um preview no Netlify com 3 extensões de Chrome ativas e
TTFB de 520–890ms. Os locais têm TTFB de 2–6ms. Nada aqui é comparável com
aqueles; toda comparação antes×depois deste relatório é no MESMO
instrumento local. No PageSpeed Insights contra produção os números virão
piores que os locais na proporção do TTFB e dos terceiros — ver a última
seção.

## Lighthouse, antes × meio × depois (mediana de 5, intervalo)

| métrica | mobile antes | mobile meio | mobile depois | desktop antes | desktop meio | desktop depois |
|---|---|---|---|---|---|---|
| score | 39 (28–43) | 35 (33–38) | **47 (45–47)** | 78 (73–80) | 77 (68–79) | **94 (94–95)** |
| FCP | 4.963 | 4.983 | 5.104 | 978 | 1.017 | 968 |
| LCP | 7.385 | 6.484 | 6.830 | 3.452 | 1.211 | **1.345** |
| TBT | 1.200 | 3.741 | **687** | 4 | 392 | **3** |
| CLS | 0 | 0 | 0,0001 | 0 | 0,0003 | 0 |
| SI | 5.025 | 5.134 | 5.104 | 2.031 | 1.502 | **1.156** |
| não compostas | 26 | 0 | 2* | 30 | 2 | 4* |
| image-delivery | 409KB | 49KB | **49KB** | 498KB | 99KB | **99KB** |
| render-blocking | 36 | 36 | **0** | 36 | 36 | **0** |
| render delay do LCP | 145,5 | 288,5 | 109,8 | 718,1 | 317 | 161,5 |

\* os que restam são terceiros intocáveis (regra 2): o selo do Reclame
Aqui e o interno do ion-icon — mais artefatos de fronteira de trace desde
que as animações armam pós-load (o LH pareia animação que começa no meio
do trace com failure de outro elemento; "z7x-breathe animando font-weight"
não existe nos keyframes). A leitura limpa, pré-portão: mobile 0, desktop
2, zero dos nossos.

Elemento LCP por fase: antes, `img.mobile` (limpa) no mobile e
`img.desktop` **com `data-aos="zoom-out"`** no desktop; do item 1 em
diante, a MESMA `<img>` do herói nas duas larguras, agora única dentro de
`<picture>` (item 6). Nunca mudou de elemento — só deixou de estar
escondida atrás de animação.

## Protocolo (perf.mjs, 9 cargas, mediana)

| combinação | métrica | antes | meio | depois |
|---|---|---|---|---|
| 390 lento | LCP | 4.580 | 5.600 | **3.848** |
| | FCP | 4.484 | 5.560 | **1.244** |
| | TBT | 4.909 | 11.333 | **1.897** |
| | main thread | 16.799 | 17.850 | **2.897** |
| | bytes / req iniciais | 3.002KB / 176 | 2.775KB / 175 | 2.978KB / 147 |
| | CLS carga | 0,0007 | 0,0008 | 0,0069 |
| 390 livre | LCP=FCP | 178 | 352 | **124** |
| | TBT | 73 | 694 | **16** |
| | main thread | 289 | 1.303 | **117** |
| 1474 lento | LCP | 16.462 | 5.748 | **4.456** (2.092–4.524) |
| | FCP | 4.812 | 5.748 | **1.264** |
| | TBT | 8.666 | 9.632 | **1.791** |
| | main thread | 22.642 | 14.522 | **2.951** |
| | CLS carga | 0 | 0 | 0,0044 (uma carga a 0,0729) |
| 1474 livre | LCP | 1.272 | 360 | **152** |
| | TBT | 113 | 715 | **16** |
| | main thread | 323 | 1.317 | **116** |

A coluna "meio" registra a regressão que o item 3 criou e o conserto
`475bff9` desfez — está na seção "o que não rendeu" porque a lição vale
mais que o vexame.

## O que cada item rendeu

**Item 7 — erros de console (`a42f64c`).** Console limpo nas 9 larguras
(eram 2 erros por carga: `gsap.utils.debounce` inexistente no GSAP 3 e
`null.innerText` do contador órfão de `#dias/#horas`, que não existem em
página nenhuma — grep no index, cert/ e nos nove pedido-registrado/). O
que passou a executar: a re-medição do `.reveal-wrapper` no resize — o
ciclo 1920→390 deixava o h1 com 461px num viewport de 390, vazando; agora
re-mede para 203px, igual à carga fresca. Em carga parada, byte a byte
igual (retrato 0/0/0/0). `sendCapiPageView` (CORS): não tocado, regra 2 —
o erro é da origem local/preview.

**Item 1 — LCP nunca animado (`68800a0`).** Desktop: LCP 3.452→1.636ms e
score 78→89 só neste item; render delay 718→209ms. Mobile: já era limpa,
sem mudança (145→161ms, ruído). Saíram o `zoom-out` da img e o `fade-up`
do `div.text` (pai do h1/CTA — pai com opacity 0 tira os filhos do
primeiro frame). Herói de aparência final idêntica; o que sumiu é a
ENTRADA animada, que é o que o item pede.

**Item 6 — imagens (`c5ab371`).** image-delivery: mobile 409→49KB (aceite
≤50KB), desktop 498→99KB. Tudo medido por viewport com DPR antes de
escolher degrau (celular é DPR 3). Adendo do herói: as duas `<img>` com
atributo `media` — que em `<img>` não existe — viraram `<picture>` com o
breakpoint de 1080 lido do CSS; exclusividade provada no waterfall (em 390,
zero requisições da arte desktop; em 1474, zero da mobile). Achado no
caminho: a TARJA DESK tem **14.012px de largura** exibida a ~1.150 — 165KB
que viraram 9,8KB no degrau que o desktop DPR 1 escolhe. Duas variantes
saíram MAIORES que a original (a original já era codificada dura) e foram
cortadas do srcset. CLS 0,0000; caixa do cupom/tarja/herói conferida uma a
uma.

**Item 3 — animações compostas (`be41a89` + conserto `475bff9`).** Audit
zerado dos nossos (26→0 mobile). Render contínuo na main thread, 10s
parado em 1474: RecalcStyle 5.499→583ms (−89%), tarefas 7.199→1.550ms.
Frame do MEIO da animação idêntico (fase travada por Web Animations API:
CTA 1,14/255, tópicos 0,94, tarja 2,63). Pausa fora da viewport
funcionando (CTA em tela: 5 running; tarja fora: 2 paused). O anel é um
span injetado (16 botões; máscara parada + disco girando por transform),
com o `::after` estático como primeiro frame e fallback sem JS — CLS da
troca 0,0001/0,0000.

**Item 4 — build (`41e2036` + `4f4c363`).** 36 CSS render-blocking → 1;
requisições iniciais 180→146 em 390 livre. Página idêntica por diff de
página inteira: 0,002%/0,001% de pixels (o resíduo é o contador vivo); as
48 "mudanças" do retrato são o minificador tirando `0%`/`100%` redundantes
de gradiente — serialização, não pixel. `npm run check` falha com fonte
alterada sem rebuild e passa após rebuild (testado nos dois sentidos);
`npm run watch` reflete edição em css/ em <3s. `dist/** -text` no
.gitattributes para o autocrlf não criar diff fantasma.

**Item 5 — crítico inline (`1aaa5c4`).** render-blocking 0. **FCP
observado no protocolo: 4.484→1.244ms em 390 lento (−72%; o aceite pedia
−30%) e 4.812→1.264 em 1474 lento.** FOUC pelo juiz de estilo (página
só-com-crítico × completa, imagens e terceiros bloqueados, animações
congeladas): 0,36–0,42%, ≤0,5% nas duas viewports, 5 cargas cada. O
pacote `critical` caiu em 15 min (export quebrado sob Node 24); extração
própria, com três consertos que a medição impôs (@property sempre entram —
sem elas um var() invalida a declaração inteira; regra que esconde fica
mesmo sem caixa; absoluto só conta com a âncora na dobra — o blob de blur
de 100px do #ba re-ancorava no body e manchava o herói).

## O que não rendeu o previsto, e por quê

1. **FCP e SI SIMULADOS do mobile não se moveram** (~5,0–5,1s em todas as
   fases, do 36-CSS-bloqueantes ao render-blocking-zero), enquanto o FCP
   OBSERVADO com throttling real caiu 72%. O simulador (Lantern) está
   ancorando o FCP mobile em algo que não é CSS — com ~2,9MB na janela
   inicial e terceiros liberados, a estimativa dele fica presa na banda
   simulada de 1,6Mbps. É a razão de o score mobile ter parado em 47: FCP
   e SI pesam ~25% do score e não responderam. Fica aberto como
   discrepância de instrumento; o dado observado contradiz.
2. **Render delay do LCP ≤ 100ms: não fechou.** 109,8ms mobile e 161,5ms
   desktop (de 145,5 e 718,1). O que sobrou não é animação (item 1) nem
   CSS (render-blocking 0): é decode + agendamento de pintura da própria
   arte. Para fechar a régua seria preciso mexer na arte do herói
   (dimensão/formato), que não estava no lote.
3. **CLS de carga no protocolo: 0,0007 → 0,0069 (390 lento).** Preço do
   paint cedo: antes, a primeira pintura acontecia aos 4,5s com as fontes
   já em casa; agora pinta a 1,2s e o swap de fonte mexe o texto. Abaixo
   do limiar "bom" (0,01) e invisível no Lighthouse (CLS 0,0001), mas é
   regressão numérica e fica registrada. Em 1474 lento houve UMA carga com
   0,0729 (mediana 0,0044) — outlier de uma em nove, não reproduzido.
4. **O item 3 como commitado primeiro REGREDIU TBT** (390 livre: main
   thread 289→1.303ms; lento: TBT 4.909→11.333) — cada animação composta
   vira camada rasterizada na primeira pintura, e eram 32. A medição
   intermediária existiu exatamente para isso; o conserto (`475bff9`, as
   ociosas só armam pós-load em idle) devolveu 315ms/65ms e o "depois"
   fechou melhor que o antes (117ms/16ms).
5. **`npm run watch` sobreviveu a um kill** (morreu o wrapper npm, ficou o
   node filho) e reconstruiu com build.mjs velho durante medições — números
   bipolares até ser identificado pelo command line e morto. Lição: em
   Windows, matar o processo `node scripts/build.mjs --watch`, não o npm.

## O que ficou de fora, e por quê

- **Itens 2 (animações mobile) e 8 (GTM/Zendesk):** não aprovados; nada
  foi tocado neles.
- **Radial do hover dos CTAs:** descoberto MORTO desde antes do lote — as
  `@property --mx/--my` são `inherits: false` e o `__bg` filho nunca herdou
  do botão (0,0% de diferença de pixels movendo --mx, medido nas duas
  versões). O efeito "magnético" visível são as sombras. Não consertado:
  fora de escopo; fica para decisão.
- **Fontes:** nenhum toque (fase 20). O swap pós-paint do achado 3 poderia
  ser atacado com `font-display: optional` ou subsetting — decisão de
  design, não deste lote.
- **Sondas descartáveis** em `scripts/_*.mjs` (fouc, anim-prova,
  hero-caixa, larguras-img, page-diff, crit-*, lh*, tarja-*, gate-check,
  h1-resize, sheets) e a pasta `.bkp-i3/`: sem commit, à espera de decisão
  — em especial `_fouc.mjs`, que é o juiz do item 5 e candidato a
  instrumento permanente.

## O que falta para o mobile ≥ 75

Com score 47 e TBT/CLS já verdes, o que pesa são FCP/LCP/SI simulados, e
eles são função de BYTES na janela inicial: ~2,9MB com terceiros
liberados. Os maiores blocos que restam: terceiros ~700KB (Zendesk 398KB —
o adiamento por interação/ocioso existe desde `dcf6299`, mas o LH ainda o
vê dentro da janela; Meta 250KB; item 8 cobriria), fontes sem subconjunto,
e vídeos/imagens abaixo da dobra que o simulador ainda conta. E sobre o
PSI contra produção: o TTFB local é 2–6ms; o de produção, 520–890ms —
cada métrica de rede vem ~0,5–0,9s pior lá por essa diferença sozinha,
antes de qualquer culpa do site.
