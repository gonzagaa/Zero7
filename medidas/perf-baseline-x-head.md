# Performance: baseline (630eb1f) × HEAD

Rodada de medição. **Nada foi alterado no site.** Protocolo no README, seção
"Protocolo de medição de performance": 390×844 DPR 3 e 1474×900 DPR 1; rede
`lento` (150ms, 1,6 Mbps, CPU 4×, o preset móvel do Lighthouse) e `livre`;
cache frio; **terceiros liberados**; movimento reduzido desligado; **9 cargas
por combinação**, com mediana e faixa.

Tudo aqui é laboratório. O p75 de usuário real está no Search Console e só o
Gustavo alcança.

---

## 0. O que a asserção pegou — e por que ela é o item mais importante

Na primeira rodada em que existiu, a asserção **rejeitou 36 de 36 cargas do
baseline**. A causa era minha: no script da matriz eu separei raiz e rótulo
por `:`, e o caminho começa com `C:` — o shell cortou ali e serviu uma pasta
chamada "C". Tudo 404, página sem CSS, `:root` em 16px, `h1` no fallback.

Sem a asserção, esse baseline teria virado tabela: uma página sem estilo
pinta mais rápido, e a comparação inteira teria mentido a favor do HEAD.

Depois de corrigir o caminho, o baseline em 1474 ainda reprovou 18 vezes,
por outro motivo — e esse **não era defeito de carga**: a regra de `:root`
em 62,5% acima de 1080 não existia no baseline, onde a raiz é 8px em
qualquer largura. A expectativa do corpo da raiz é do DESENHO, não da carga,
e virou parâmetro (`RAIZ_ESPERADA`). O que continua valendo para qualquer
versão, sem negociação: fonte carregada, `h1` fora do fallback e `.wrapper`
com recuo.

**Frequência final:** 36 cargas do HEAD, 0 abortos, 0 repetições. 36 cargas
do baseline (após as duas correções de instrumento), 0 abortos, 0
repetições.

---

## 1. Tabela baseline × HEAD

Mediana (mínimo–máximo) de 9 cargas.

### 390px, sem throttling

| | baseline | HEAD | |
|---|---|---|---|
| **bytes iniciais** | **13.003 KB** / 182 req | **3.858 KB** / 184 req | **−70%** |
| bytes após rolar | 13.122 KB / 190 req | 8.196 KB / 197 req | −38% |
| LCP | 260ms (224–312) | 176ms (132–868) | melhor |
| FCP | 260ms | 176ms | melhor |
| TTFB | 2ms | 2ms | igual |
| TBT | 27ms (17–85) | 31ms (21–487) | empate (faixas se cruzam) |
| CLS de carga | 0,0020 | **0,0003** | melhor |
| CLS total rolando | 0,0020 | **0,0003** | melhor |
| main thread | 196ms | 181ms | igual |
| elemento do LCP | `img.mobile` (bg mobile.avif) | o mesmo | — |

### 390px, Slow 4G + CPU 4×

| | baseline | HEAD | |
|---|---|---|---|
| LCP | 5.048ms (4.764–6.468) | 5.072ms (4.724–5.672) | igual |
| FCP | 5.048ms | 5.004ms | igual |
| **CLS de carga** | **0,0099** | **0,0007** | **−93%** |
| **CLS total rolando** | **0,5733** (0,0097–0,5769) | **0,0007** | **−99,9%** |
| TBT | 2.707ms (1.802–5.692) | **12.942ms** (6.844–17.493) | **pior — ver §2** |
| main thread | 7.640ms (3.080–17.563) | **28.082ms** | **pior — ver §2** |
| bytes na janela | 3.806 KB / 167 req | 3.746 KB / 179 req | igual |

### 1474px, sem throttling

| | baseline | HEAD | |
|---|---|---|---|
| **bytes iniciais** | **13.396 KB** / 175 req | **4.040 KB** / 179 req | **−70%** |
| bytes após rolar | 13.438 KB | 8.396 KB | −38% |
| LCP | 1.556ms (1.276–3.020) | 1.416ms (1.308–1.572) | melhor e mais estável |
| FCP | 472ms | **208ms** | −56% |
| TBT | 292ms (161–1.153) | **72ms** (44–123) | −75% |
| main thread | 980ms (521–2.472) | **344ms** (312–398) | −65% |
| CLS de carga | 0 | 0 | igual |
| elemento do LCP | `h1` **ou** `img.desktop` | `img.desktop` | mais previsível |

### 1474px, Slow 4G + CPU 4×

| | baseline | HEAD | |
|---|---|---|---|
| LCP | 17.196ms (16.488–20.024) | 15.504ms (13.584–19.276) | melhor |
| FCP | 4.964ms | 5.084ms | igual |
| TBT | 8.530ms (3.532–19.966) | 10.324ms (8.975–11.921) | faixas se cruzam |
| main thread | 28.444ms (10.473–50.551) | 24.641ms (23.573–25.537) | melhor e muito mais estável |
| **bytes iniciais** | **13.134 KB** | **3.926 KB** | **−70%** |
| elemento do LCP | `h1` | `h1` | — |

---

## 2. O número pior no HEAD, e a causa

**TBT e main thread em 390 com throttling pioraram: 2.707 → 12.942ms e
7.640 → 28.082ms.** As faixas não se cruzam, então não é variância.

**Não é trabalho novo do HEAD.** As evidências:

1. **Sem throttling, o HEAD é igual ou melhor em toda medida de CPU**: 181
   contra 196ms em 390; **344 contra 980ms** em 1474; TBT 72 contra 292ms em
   1474. Se o HEAD executasse mais código, isso apareceria aqui também.
2. **Os terceiros são os mesmos**, byte a byte: GTM 515 KB, Zendesk 398 KB,
   Meta 250 KB nos dois. A única diferença é o `fonts.cdnfonts.com` (435 KB)
   que o HEAD deixou de usar ao auto-hospedar as fontes.
3. **Dentro da mesma janela de medição, o HEAD baixa MAIS da própria origem**
   — 2.460 KB em 91 requisições contra 1.974 KB em 73 do baseline.

A leitura é essa: com **13 MB na fila** e 1,6 Mbps, o baseline passa a janela
inteira esperando rede, e boa parte do JavaScript de terceiro **nem chega a
executar antes de a medição terminar**. O HEAD, com 3,9 MB, termina o próprio
download cedo e **o mesmo trabalho de terceiro cabe dentro da janela**.

Ou seja: a janela fixa mede "quanto do trabalho de terceiro coube no
período", não "quanto trabalho a página dá". O baseline não era mais leve de
CPU — ele estava **engasgado na rede**.

**A consequência prática é ruim de qualquer jeito:** agora que a página é
leve, o custo de CPU dos terceiros aparece inteiro para o visitante.

---

## 3. Terceiros, em 390 com throttling

Nenhum bloqueia a pintura. **Item 7 confirmado: zero domínios bloqueantes.**

| domínio | KB | req | 1ª requisição | main thread | descoberto por |
|---|---:|---:|---:|---:|---|
| própria origem | 2.091 | 73 | 0ms | 865ms | parser |
| `googletagmanager.com` | 515 | 3 | 251ms | **1.087ms** | JS |
| `static.zdassets.com` (Zendesk) | 398 | 11 | 1.026ms | **801ms** | parser |
| `connect.facebook.net` (Meta) | 250 | 4 | 5.734ms | **856ms** | parser |
| `fonts.gstatic.com` | 92 | 2 | 7.608ms | — | parser |
| `d335luupugsy2.cloudfront.net` (RD) | 73 | 5 | 5.953ms | 68ms | JS |
| `capi-automation.s3…` | 56 | 1 | 16.922ms | 57ms | JS |
| `cdnjs.cloudflare.com` | 42 | 3 | 1.303ms | 276ms | parser |
| `unpkg.com` | 23 | 21 | 1.304ms | 152ms | parser |
| `ajuda.zero7.com.br` (API da Central) | 21 | 3 | 14.337ms | — | JS |
| resto (Hotjar, DoubleClick, Google, Zendesk chat…) | ~25 | ~30 | 4.9–19s | ~30ms | JS |

**Main thread por arquivo nomeado** (o resto é motor do navegador, sob CPU
4×): `fbevents.js` **674ms**, `web-widget-main` do Zendesk **652ms**, o `js`
do gtag **640ms**, `swiper-bundle` **525ms**, `gtm.js` **447ms**, `gsap`
206ms.

**Sim, o `fbevents.js` ainda é o maior script nomeado.**

---

## 4. Os custos que você pediu para nomear

- **O contador da tarja:** 5ms de main thread em 10 segundos de página
  parada, ou seja **~31ms por minuto**. É desprezível — no mesmo período o
  main thread só esteve ocupado 72ms no total. Regra 5 preservada, e o custo
  não justifica nem cogitar mexer.
- **Os dois pixels da Meta:** `fbevents.js` chega aos **5.734ms** (112 KB) e
  os dois disparos de pixel aos 11,7s (113 KB) e 15,9s (26 KB). Somam ~250 KB
  e **674ms de main thread** — o maior script nomeado da carga.
- **A arte da tarja:** pedida pelo **parser aos 239–352ms**, bem no caminho
  crítico. E aqui aparece um achado: em **390px o navegador baixa as DUAS
  artes** — a de desktop (161 KB) e a de celular (80 KB) —, porque as duas
  estão no HTML como `<img>` e `display: none` não impede download. **São
  161 KB jogados fora em todo celular.** Além delas, `cupom reinicio
  white.avif` (260 KB) e `black.avif` (247 KB) também são baixados aos 352ms.

---

## 5. Custo das máscaras (#plan e #faq) — inconclusivo, e por quê

Medido com o trace do DevTools (Paint + PrePaint + Layerize) numa rolagem
idêntica pelas duas transições, 3 passadas com e 3 sem a máscara, CPU 4×:

| | com máscara | sem máscara | diferença |
|---|---|---|---|
| 390px | 870ms (714–1.669) | 819ms (764–872) | +51ms (+6%) |
| 1474px | 679ms (651–1.065) | 944ms (678–1.047) | **−265ms (−28%)** |

O sinal **inverte** entre os dois viewports e as faixas se cruzam nos dois
casos. Isso não é um custo de −28%: é ruído maior que o efeito. **A conclusão
honesta é que o custo da máscara está abaixo do piso de ruído deste
instrumento** — se existe, é da ordem de algumas dezenas de ms numa rolagem
da página inteira. Para medir de verdade seria preciso um instrumento
diferente (contagem de quadros perdidos numa rolagem controlada, com muito
mais passadas).

---

## 6. INP, com interação de verdade (CPU 4×, 5 repetições)

P75 / pior caso, em ms:

| interação | 390px | 1474px |
|---|---|---|
| acordeão: abrir card | 264 / 264 | 280 / 344 |
| paginador: próxima | 168 / 216 | 344 / 344 |
| busca: digitar | 216 / *(ver nota)* | 280 / 416 |
| **artigo: abrir dialog** | **376 / 472** | **584 / 640** |
| artigo: fechar dialog | 272 / 504 | 472 / 576 |
| carrossel: trocar plano | 224 / 248 | 400 / 544 |
| menu: abrir | 288 / 480 | — (só no celular) |
| menu: fechar | 312 / 392 | — |

**Tudo acima de 200ms está fora da faixa "bom".** O pior é abrir o artigo:
584ms de P75 no desktop.

*Nota:* uma amostra da busca em 390 marcou 55.640.552ms. Isso não é latência:
é um evento medido contra um relógio que andou (aba suspensa entre o
`pointerdown` e o registro). **Descartada**, e o P75 vem das outras amostras.

Ressalva: é CPU a 4× com terceiros vivos — o cenário do Lighthouse móvel, não
um aparelho parado.

---

## 7. O que ainda custa, por custo real

### (a) Dá para consertar — é nosso

1. **A arte de desktop da tarja baixando no celular: 161 KB por visita
   móvel**, pedida pelo parser aos 240ms, no caminho crítico. Um `<picture>`
   com `source media` resolve sem tocar na arte nem no contador.
2. **`cupom reinicio white/black.avif`: 507 KB** baixados aos 352ms. Conferir
   se ainda são usados — o popup está desativado no HTML.
3. **8,2 MB depois de rolar** (contra 3,9 na carga inicial): a diferença são
   os vídeos. Já houve rodada sobre isso; segue sendo o maior peso da página.
4. **INP do `<dialog>`**: 584ms de P75 no desktop para abrir um artigo. O
   trabalho é montar o HTML do artigo e abrir o modal; dá para dividir.

### (b) Depende de decisão de negócio

5. **GTM: 515 KB e 1.087ms de main thread.** É o maior custo de CPU da
   página inteira.
6. **Meta: 250 KB e 674ms** no `fbevents.js`, o maior script nomeado.
7. **Zendesk: 398 KB e 801ms.** Já foi adiado para depois da dobra do #ba;
   o custo restante é o widget em si.

Os três somam **1,16 MB e ~2,5 segundos de main thread** sob CPU 4×. Nenhum
deles é nosso código, mas os três são nossa escolha.

### (c) Fora do nosso controle

8. O encadeamento tardio: `capi-automation` aos 16,9s, `zero7support.zendesk`
   aos 18s, `backend-api-zero7` aos 14,5s. São requisições disparadas por
   scripts de terceiro, sem ponto de entrada nosso.

---

## 8. O que ficou de fora

Dados de campo. Laboratório é a melhor hipótese, não a verdade.
