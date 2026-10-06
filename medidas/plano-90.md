# O caminho para 90 no mobile — investigação, com ganho medido por item

Tarefa de investigação: nada no site mudou. Instrumento novo:
`scripts/ablacao.mjs` (12 categorias + 1 extra, Lighthouse mobile 3
execuções por categoria, mediana; remoção por `blockedUrlPatterns` do
próprio LH; a categoria do herói usa uma raiz descartável em %TEMP% com a
arte reexportada — o branch nunca é tocado). Dados crus:
`medidas/ablacao.json` (inclui o inventário completo da parte 3).

**A resposta curta:** o teto teórico da página (tudo removível removido) é
**90 em ponto**. O teto honesto mantendo GTM+Meta obrigatórios é **76
(3/3 execuções)**. Para 90 de verdade, a família GTM/Meta precisa sair do
trace do Lighthouse — o que é decisão da gestora de tráfego, não de código.

## Parte 1 — a conta da nota (curvas do próprio Lighthouse)

Calculada com `getLogNormalScore` e os p10/mediana do preset mobile dos
audits instalados (LH 13.5). Modelo validado: a soma reproduz o medido
(55,3 vs 55 mobile; 96,2 vs 96 desktop).

| MOBILE | valor | p10 / mediana | score | peso | pontos perdidos |
|---|---|---|---|---|---|
| FCP | 4.355 | 1.800 / 3.000 | 0,175 | 10 | **8,3** |
| SI | 4.355 | 3.387 / 5.800 | 0,753 | 10 | 2,5 |
| LCP | 5.780 | 2.500 / 4.000 | 0,158 | 25 | **21,1** |
| TBT | 516 | 200 / 600 | 0,570 | 30 | **12,9** |
| CLS | 0,0168 | 0,1 / 0,25 | 1,000 | 25 | 0,0 |
| | | | | **total** | **44,7** |

Desktop: 96,2 (LCP custa 2,8; FCP 0,8; resto ~0).

Combinações que dão 90 no mobile (mesmas curvas):

| combo | FCP | LCP | TBT | SI | CLS | score |
|---|---|---|---|---|---|---|
| A | 1.800 | 2.500 | 200 | 3.400 | 0,017 | 92,5 |
| B | 2.300 | 2.900 | 150 | 3.800 | 0,010 | 89,6 |
| e o inverso que educa: TBT e CLS PERFEITOS com FCP/LCP atuais | 4.355 | 5.780 | 0 | 4.355 | 0 | **68,2** |

**Como o Lantern converte bytes em FCP/LCP/SI (5 linhas):** o preset mobile
simula RTT de 150ms e ~1,6Mbps. O Lantern reconstrói o grafo de
dependências das requisições (quem descobriu quem) e "reproduz" o load
nessa rede virtual: cada nó espera seus pais, paga RTTs de conexão e o
tempo de transferência bytes/1,6Mbps, com no máximo 10 conexões. FCP/LCP
saem do instante simulado em que os nós que os bloqueiam terminam — por
isso cortar CPU (lotes A/B) moveu TBT, mas FCP/LCP só se movem tirando
BYTES ou ARESTAS do grafo que antecede a pintura.

## Parte 2 — ablação medida (a tabela que manda)

`node scripts/ablacao.mjs 3`, mediana de 3, preset mobile:

| categoria | bytes fora | score | FCP | LCP | TBT | SI |
|---|---|---|---|---|---|---|
| baseline (HEAD) | 0 | **56** | 4.356 | 5.798 | 464 | 4.356 |
| a) terceiros todos | 1.109KB | 65 | 4.655 | 7.055 | 0 | 4.655 |
| b) GTM + o que injeta | 917KB | **67** | 4.355 | 6.080 | **0** | 4.355 |
| c) imagens abaixo da dobra | 147KB | 56 | 4.354 | 5.629 | 517 | 4.354 |
| d) vídeos e posters | 57KB | 56 | 4.355 | 5.555 | 504 | 4.355 |
| e) fontes (todas) | 369KB | **62** | **3.458** | 4.583 | 522 | 3.458 |
| f) Google Fonts (do selo RA) | 89KB | 55 | 4.357 | 6.082 | 490 | 4.357 |
| g) CSS além do crítico | 186KB | **65** | **2.553** | **4.055** | 728 | 3.596 |
| h) JS próprio (dist/script) | 38KB | 54 | 4.355 | 6.080 | 533 | 4.355 |
| i) Swiper + Lenis | 155KB | 55 | 4.354 | 5.779 | 506 | 4.354 |
| j) herói trocado por ~7KB | 3KB | 55 | 4.354 | 5.713 | 498 | 4.354 |
| k) TUDO junto (teto teórico) | 1.914KB | **90** | 2.582 | 3.111 | 0 | 2.582 |
| l) tudo MENOS GTM+Meta (teto sob restrição) | — | **76** | 2.583 | 3.176 | 532 | 2.583 |

Leituras que a tabela impõe:

1. **GTM+Meta são o maior item isolado**: +11 pontos (todo o TBT some) e
   ~917KB. E o único que não é nosso para decidir.
2. **O bundle assíncrono ainda segura o FCP simulado**: bloquear
   `dist/home.*.css` derruba FCP 4.355→2.553. O `<link rel="preload"
   as="style">` entra no grafo do Lantern como dependência de alta
   prioridade da pintura — o CSS é assíncrono no navegador real, mas não
   na conta do simulador. Item de código com ~9 pontos.
3. **Fontes**: +6 pontos (FCP −900ms) — os .sub são VeryHigh por causa dos
   preloads; tirar preload de peso não-crítico / adiar pesos raros é
   caminho medido.
4. **c, d, h, i, j ≈ 0 pontos**: imagem abaixo da dobra, vídeo, JS
   próprio, Swiper/Lenis e a arte do herói (10,7KB!) NÃO são o problema
   do simulador. A hipótese "reduzir imagem/vídeo próprio" do relatório B
   morre aqui.
5. As categorias não somam linearmente (65+67+62+65 ≠ 90): o grafo
   reordena; as combinações k e l são as medições que valem.

## Parte 3 — inventário da janela inicial (390, antes do load)

116 requisições com bytes, **2.183KB**. Completo em
`medidas/ablacao.json` (`baselineRede` + `inventario` com iniciador e
imagens dentro/fora da primeira viewport). Os que mandam:

| KB | recurso | prioridade | classe |
|---|---|---|---|
| 193 | gtag/js?id=G-K81WL9X541 | Low | decisão de negócio |
| 186 | dist/home.<hash>.css (bundle) | VeryHigh | necessário; a ARESTA no grafo é removível (ver g) |
| 165 | index.html (78KB são o crítico inline) | VeryHigh | necessário |
| 162 | gtm.js?id=GTM-KCJQPMC | Low | decisão de negócio |
| 160 | gtag/js?id=AW-11118566280 | Low | decisão de negócio |
| 151 | swiper-bundle.min.js | Medium | adiável (carrossel está abaixo da dobra) |
| 113+112 | Meta (config + fbevents) | Low | decisão de negócio |
| 57+56 | RD Station + capiParamBuilder | Low | decisão de negócio |
| 44+42 | Inter Tight + Open Sans (fonts.gstatic) | VeryHigh | vem do CSS do SELO RA (parte f) — decisão de negócio |
| 6×~32 | TT Fors .sub | VeryHigh/High | necessários; preload dos 6 é discutível |
| 31 | jquery (code.jquery.com) | Medium | adiável/removível (uso a auditar) |
| ~150 | imagens da primeira viewport (herói 10,7KB, tarja 20KB, divisa…) | — | necessário acima da dobra |
| ~147 | imagens abaixo da dobra | Low | já lazy; custo ≈ 0 no simulador |

Os "515KB de Google" são TRÊS containers: o GTM e DOIS gtag (GA4 +
Google Ads) que o próprio GTM injeta — consolidação é conversa para a
gestora (um só container serviria).

## Parte 4 — servidor e entrega

Medido por requisição real em produção (26/09):

- **HTTP/1.1** — sem HTTP/2/3. Com ~116 requisições, a fila serializada em
  poucas conexões é exatamente o que o Lantern pune; h2 é o maior item de
  infraestrutura.
- **Brotli OK** em HTML/CSS/JS ✓; imagens com immutable ✓.
- **HTML respondendo `Cache-Control: no-store, no-cache`** — a regra do
  .htaccess (max-age=300, must-revalidate, fase 18) NÃO está valendo no
  ar; algo na origem a sobrescreve. Todo F5 rebaixa a página inteira.
- **TTFB 307ms** daqui (o relatório original registrou 520–890ms do
  preview). Custo em pontos: cada 100ms de TTFB empurram FCP/LCP
  simulados ~100ms; entre TTFB local (2ms) e produção (300–900ms), isso é
  ~0,5–2,5 pontos só de espera inicial, antes do H1.1.
- **PSI × local: NÃO rodado** — a produção está em `v89-limite` (nem o
  lote A nem o B publicados; carimbo do trabalho limiteAlta). Comparar
  PSI de um código com lh.mjs de outro não mede "custo do servidor".
  Quando o lote B subir, a receita está pronta (3× runPagespeed mobile).
- **Cloudflare em grey-cloud no apex** (dado da tarefa): sem proxy, sem
  cache de borda, sem h2/h3 da Cloudflare. Ligar o laranja + cache de
  estáticos daria h2/h3 e TTFB de borda — **não medido** (não aplicado);
  é o caminho mais barato para os itens acima sem tocar na origem.
- **Preconnect: zero no HEAD.** Para os terceiros que ficarem
  (googletagmanager, connect.facebook.net, fonts.gstatic do selo),
  preconnect economiza 1 RTT simulado cada — item pequeno e seguro.

## Parte 5 — pendências do lote B, com causa

**O salto de 60px do body (1474, ~100ms pós-FCP): causa raiz, filmada.**
Sonda de rAF desde antes do parse, com throttle: t969 primeiro frame com
`body` de **0 filhos**; t988 um filho (a tarja) e body.top 0; t1053 o
parser alcança `header#home` e o body.top vira 60. O Chrome pinta um
frame NO MEIO do streaming do HTML; quando o header entra no DOM, sua
`margin-top: 6rem` (home.css, ≥1080) **colapsa através do body** e
empurra tudo. Não é CSS atrasado, fonte nem JS — é margin-collapse do
primeiro bloco com margem chegando depois do primeiro paint (os 78KB de
crítico inline no head adiam o corpo no stream e aumentam a janela).
Conserto de uma linha, para aprovação: o espaço vira `padding-top` no
body em ≥1080 (padding não colapsa; o espaço existe desde o frame 1) e o
header perde a margem.

**Nav × activeCountdown (o outro CLS): desenho, sem implementar.** O
salto é a CLASSE chegando só quando o script protegido roda. Proposta que
NÃO duplica datas nem toca o script (regra 5): (1) a classe
`activeCountdown` passa a estar NO HTML estático da nav — campanha no ar
= classe no markup, exatamente como a tarja já está no markup; o script
protegido continua mandando: seu caminho de expiração REMOVE a classe
(tickPromo já faz isso) e o de ativação vira no-op; quem desligar a
campanha no HTML tira a tarja E a classe (documentado). (2) o
`--tarja-offset` ganha fallback CSS estimado pela razão da arte
(largura/12,394 por viewport), então nem o primeiro frame nem o refino do
ResizeObserver saltam. Risco: usuário que cruza o fim da promo com a
página aberta vê a nav subir — comportamento que já existe hoje.

**Tilt dos CTAs (removido em 1a5cad3) — o que exatamente saiu:** o
handler de `pointermove` com rAF+lerp que dirigia (i) tilt
`rotateX/rotateY` ±7° seguindo o cursor, (ii) imã `translate` ±1,05rem,
(iii) sombras direcionais `--sh1/--sh2` (até 1,2/2,4rem) com fator de
pressão 0,25, e (iv) o radial `--mx/--my` — este último morto desde
sempre. Ficou: subida 0,75rem + escala 1,01 no hover (com transição),
sombra estática do `:hover`, ripple. **Custo de reverter só o tilt**:
~40 linhas reintroduzindo pointermove escrevendo apenas `transform`
(compositor-friendly); custo de carga zero (só roda em interação), custo
contínuo pequeno durante hover. Decisão de design/Gustavo.

## Parte 6 — o plano

Ordenado por PONTOS MEDIDOS na ablação (não estimativa). Baseline 56.

| # | item | o que muda | ganho medido | risco | aprova | esforço |
|---|---|---|---|---|---|---|
| 1 | Família GTM fora do trace | consolidar 3 containers Google em 1 e/ou carregar as tags de um jeito que o Lighthouse não conte (p.ex. após interação real — hoje é pós-LCP e ELE CONTA) | **+11 (56→67)**; com o resto, é o que separa 76 de 90 | perde medição de quem não interage; atribuição de Ads | **gestora de tráfego** | médio |
| 2 | Tirar a ARESTA do bundle do grafo do FCP | trocar o padrão `preload+onload` do CSS assíncrono (testar: sem preload / media-swap / fetchpriority) — o navegador real não muda, a conta do Lantern sim | **+9 (56→65)** pela ablação g | FOUC se sair do padrão errado — o fouc.mjs é o juiz | Gustavo | baixo |
| 3 | Fontes fora do caminho da pintura | tirar preload dos pesos não usados acima da dobra (medir quais); avaliar Ext-A fora do subconjunto | **+6 (56→62)** pela ablação e (limite superior: sem fontes NENHUMA) | glifo de fallback se errar a conta; CLS de swap | Gustavo | baixo |
| 4 | Selo RA fora da janela | carregar o selo (e seus 89KB de Google Fonts + Open Sans/Inter) sob interação/viewport como o Zendesk (B2) | ablação f isolada: ~0-1; o valor real é dentro da combinação (compõe o k) | selo aparece tarde no rodapé | Gustavo (selo é prova social) | baixo |
| 5 | Swiper adiável | carregar swiper-bundle (151KB) quando #plan se aproxima | dentro de i (≈0 isolado; compõe o teto) | carrossel montar tarde se o usuário voar até lá | Gustavo | baixo |
| 6 | jQuery: auditar e remover | 31KB Medium; uso a inventariar (4selet?) | não medido isolado | 4selet é protegido — só leitura primeiro | Gustavo | médio |
| 7 | body 60px (parte 5) | margin→padding | CLS real; no simulador ~0 (CLS já não custa ponto) | visual do fundo do header | design | mínimo |
| 8 | Nav/tarja (parte 5) | classe no markup + fallback CSS | CLS real ~0,011→~0 | fim de promo com página aberta | Gustavo (regra 5 adjacente) | baixo |
| 9 | Infra: h2/h3 + cache de borda + HTML sem no-store + preconnect | Cloudflare laranja ou h2 na origem | **não medido** (fora do laboratório); no PSI real é material | DNS/SSL da migração | Gustavo/infra | fora do repo |

**Combinação mínima para 90 mobile (mantendo 94+ desktop):** não existe
dentro das restrições atuais. **O teto medido com GTM+Meta obrigatórios é
76** (itens 2–5 + tudo o mais removível, 3/3 execuções). O teto teórico
com tudo é 90 em ponto. Portanto: 90 = itens 2+3 (código, ~risco baixo) +
**decisão da gestora sobre o item 1** — sem ela, o realista é mirar o
teto de 76 no simulador e colher o resto em usuário real (INP/CLS/campo),
onde os lotes A/B já pagaram.

**Não medidos por ablação** (mecanismo não representável por bloqueio de
URL): o padrão exato de carga do CSS que zera a aresta (item 2 — precisa
de variantes servidas, próxima rodada), consolidação de containers (item
1 — depende do GTM da gestora), infra (item 9).

## Housekeeping desta tarefa

- `scripts/ablacao.mjs` entra (o instrumento).
- `_b4-prova` → `scripts/b4-prova.mjs` e `_b5-prova` → `scripts/b5-prova.mjs`
  (permanentes, no README).
- Saem as seis sondas restantes do lote B (`_b1-prova`, `_b2-prova`,
  `_b3-pesos`, `_b3-prova`, `_b3-cls-debug`, `_b4-cls-1474`) e a `_nota.mjs`
  desta investigação (a conta está reproduzível na parte 1).
