# Tarja em vídeo — LIBERDADE (out/2026)

Troca da tarja estática (AVIF) por vídeo em loop, sem regressão de
performance. Contador, cupom, preços, tracking, checkout e planos.json
intocados — a mudança é só a tarja.

Como ficou: o pôster AVIF (quadro 0 exato do vídeo) é a tarja no crítico e
no LCP; o `<video muted playsinline loop preload="none">` nasce sem src e sem
autoplay, transparente por cima, e o `script/tarjaVideo.js` só dá src depois
do load + requestIdleCallback, sem movimento reduzido, sem saveData e com
(desktop ≥ 1080 OU 4g). IntersectionObserver pausa fora da tela/tarja
escondida; aba oculta pausa; cruzar 1080 troca o arquivo. Regra 26 da
AUDITORIA.

## Arquivos

| arquivo | bytes | KB |
|---|---:|---:|
| tarja-liberdade-desk.webm (VP9) | 255 018 | 249,0 |
| tarja-liberdade-desk.mp4 (H.264, fallback) | 252 979 | 247,0 |
| tarja-liberdade-desk-poster.avif | 6 143 | 6,0 |
| tarja-liberdade-mob.webm (VP9) | 186 170 | 181,8 |
| tarja-liberdade-mob.mp4 (H.264, fallback) | 183 229 | 178,9 |
| tarja-liberdade-mob-poster.avif | 4 315 | 4,2 |
| *removidos:* TARJA DESK LIBERDADE.avif | 291 161 | 284,3 |
| *removidos:* TARJA MOBILE LIBERDADE.avif | 155 763 | 152,1 |

Alvos: desktop ≤ 250 KB ✓. Mobile ≤ 200 KB ✓ (alvo revisado pelo Gustavo:
o de 100 KB era estimativa; 728×100 a 125 KB recusado — texto borrado em
iPhone 3×).

## Encode (`node scripts/tarja-video.mjs liberdade`)

Masters: `C:/Users/gusta/Videos/zero7-tarjas/export/master`, 30 fps, 450
quadros (15 s). Relatório completo em
`medidas/tarja-video-encode-liberdade.json` (fora do git).

| | desk | mob |
|---|---|---|
| master | 3160×126 | 2082×286 |
| saída | **2370×94** (decisão do Gustavo; 3160×126 não cabia em 250 KB sem artefato) | **1040×142** |
| filtro | `fps=24,format=yuv444p,scale=2370:95:flags=lanczos,crop=2370:94:0:0,format=yuv420p` | `fps=24,format=yuv444p,scale=1040:143:flags=lanczos,crop=1040:142:0:0,format=yuv420p` |
| VP9 | 2 passes, `-b:v 0 -crf 38`, `-row-mt 1 -tile-columns 2 -g 240`, passe 1 `-cpu-used 4`, passe 2 `-cpu-used 1 -auto-alt-ref 1 -lag-in-frames 25` | idem |
| CRFs VP9 tentados | 34: 335 · 35: 306,5 · 36: 284,2 · 37: 268,4 · **38: 249,0 KB** | **38: 181,8 KB** |
| H.264 | libx264 veryslow, profile high, yuv420p, +faststart, g 240, **CRF 29** (26: 380,9 · 27: 331,1 · 28: 285,5 · 29: 247,0 KB) | **CRF 29** (26: 259,5 · 27: 229,6 · 28: 203,2 · 29: 178,9 KB) |
| denoise (hqdn3d=1.5:1.5:3:3) | NÃO — cortava só 2,7% no CRF 36; o grão não domina (comparação ampliada em shots/tarja-video/) | NÃO — 1,4% |
| emenda do loop no master (último×0 vs passo) | 0,427% × 0,406% → emenda, sem corte | 0,331% × 0,322% |
| emenda no .webm (fase / cheio) | 0,57% / 0,99% ✓ ≤ 1% | 0,554% / 0,912% ✓ |
| pôster AVIF (sharp q60, 4:4:4) × quadro 0 | 0,269% ✓ ≤ 0,5% | 0,31% ✓ |

Tentativas para baixar o mobile, como o Gustavo sugeriu:
- **loop de 10 s:** impossível. A animação só fecha em 15 s, e um corte em 10 s
  não emenda.
- **20 fps:** 170 KB, só −7%. Não compensa a perda de fluidez, então ficou
  24 fps a 182 KB, que é o aprovado.

## Antes × depois

`antes-video` = baseline da ETAPA 0. `HEAD (re-run)` = o mesmo commit
medido de novo no fim, num worktree limpo. Foi preciso porque a baseline
mobile (70) destoava do lote E (93), e a re-run mostrou que parte dela era
ruído da máquina. A comparação justa é contra as duas.

### Lighthouse (lh.mjs, 5 execuções, mediana)

| preset | métrica | antes-video | HEAD (re-run) | depois-video |
|---|---|---:|---:|---:|
| mobile 390 | score | 70 (66–78) | 85 (74–87) | **93 (85–93)** |
| | FCP | 1642 | 1557 | 1539 |
| | LCP | 3996 | 3984 | **3090** |
| | TBT | 631 | 158 | 31 |
| | CLS | 0,0001 | 0,0001 | 0,0001 |
| | SI | 1754 | 1681 | 1767 (+13 / +86, dentro de ±100) |
| | image-delivery | 186 KB | 186 KB | 38 KB |
| desktop 1474 | score | 99 | 99 | **100 (100–100)** |
| | FCP / LCP | 481 / 928 | 450 / 899 | 457 / **701** |
| | TBT / CLS / SI | 0 / 0,0004 / 630 | 0 / 0,0003 / 582 | 0 / 0,0003 / 593 |
| desktop 1920 | score | 99 (97–99) | 98 (97–99) | **100 (99–100)** |
| | FCP / LCP | 488 / 942 | 462 / 1077 | 461 / **744** |
| | TBT / CLS / SI | 13 / 0,0002 / 895 | 0 / 0,0002 / 712 | 0 / 0,0002 / 753 |

O LCP simulado cai 200–900 ms porque a arte da tarja (152/284 KB) disputava
banda com a imagem do LCP; o pôster tem 4/6 KB.

### Protocolo (perf.mjs, 9 cargas, mediana)

| | antes-video | depois-video |
|---|---:|---:|
| 390 lento — LCP | 1596 | 1672 (+76, dentro de ±100) |
| 390 lento — FCP | 1200 | 788 |
| 390 lento — CLS carga | 0,0032 | 0,0028 |
| 390 lento — bytes até load+6 s | 834 KB / 73 req | 869 KB / 75 req ¹ |
| 390 livre — LCP / CLS carga | 236 / 0,0001 | 144 / 0,0001 |
| 1474 lento — LCP | 1916 | 1892 |
| 1474 lento — FCP | 1000 | 812 |
| 1474 lento — CLS carga | 0,0093 | 0,0092 |
| 1474 lento — bytes até load+6 s | 1001 KB / 79 req | 973 KB / 81 req ¹ |
| 1474 livre — LCP / CLS carga | 196 / 0,0063 | 140 / 0,0063 |

¹ A janela "inicial" do perf.mjs vai até load + 6 s, então pega o vídeo, que
chega depois do load: 390 = +182 (webm) +4 (pôster) −152 (arte antiga) ≈ +34 KB;
1474 = +249 +6 −284 ≈ −29 KB. Bate com o medido.

TBT e main thread do perf.mjs caíram muito (390 lento: TBT 3366 → 588 ms).
A re-run do HEAD no Lighthouse indica que a baseline estava carregada de
ruído, então essa queda não é atribuída ao vídeo.

### Antes do LCP observado (tarja-video-prova.mjs rede, lento + CPU 4×, 9 cargas)

| | antes-video | depois-video |
|---|---:|---:|
| 390 — bytes / req antes do LCP | 588,8 KB / 41 | 442 KB / 42 |
| 390 — .webm/.mp4 antes do LCP / antes do load | 0 / 0 | **0 / 0** |
| 390 — load | 3532 ms | 2364 ms |
| 390 — vídeo da tarja | — | mob.webm, +473 ms após o load |
| 1474 — bytes / req antes do LCP | 735,9 KB / 45 | 458,7 KB / 46 |
| 1474 — .webm/.mp4 antes do LCP / antes do load | 0 / 0 | **0 / 0** |
| 1474 — load | 4369 ms | 2955 ms |
| 1474 — vídeo da tarja | — | desk.webm, +703 ms após o load |

O critério "bytes antes do LCP = baseline ± 5 KB" não fecha, mas para
baixo: −147 KB (390) e −277 KB (1474), exatamente a arte antiga trocada pelo
pôster. A requisição a mais é o tarjaVideo.js (defer, 1 KB).

## Aceites

| item | resultado |
|---|---|
| Lighthouse mobile ≥ 90 | 93 ✓ |
| Lighthouse desktop = 100 / 1920 = 100 | 100 / 100 ✓ |
| nenhuma métrica pior que antes-video além do ruído | ✓ (SI mobile +13 ms; LCP perf 390 +76 ms) |
| zero vídeo antes do LCP e do load, 390 e 1474 | 0 / 0 ✓ |
| CLS ≤ 0,01 em 390/1079/1366/1536/1920 (cls.mjs, carga) | 0,0001 / 0,0000 / 0,0004 / 0,0003 / 0,0002 ✓ |
| fouc (390/1280/1366/1474/1536/1920) | 0,00% ✓ |
| console-limpa (390, 1474) | limpo, modal ok ✓ |
| caixa pôster = caixa vídeo (390/1079/1366/1920) | idênticas ✓ |
| diff pôster × quadro 0 no instante da troca (≤ 1%) | 0,487 / 0,547 / 0,897 / 0,838% ✓ |
| movimento reduzido / saveData | nenhuma requisição de vídeo ✓ |
| celular 3g | nenhuma requisição, fica o pôster ✓ |
| tarja escondida com vídeo rodando | pausa (paused=true); voltou, retoma ✓ |
| campanha expirada (Date mockada) | tarja some, nada baixa ✓ |
| Range no servidor do harness | 206 video/webm e video/mp4, `bytes 0-1023/…` ✓ |
| npm run build / npm run check | verde ✓ |

Capturas em `shots/tarja-video-depois-video/` (fora do git): pôster, vídeo
rodando a opacidade 1 e quadro 0 em cada largura.

## Divergências do pedido

- **Resoluções.** O desktop ficou 2370×94 em vez de 3160×126, e o mobile ficou
  1040×142 com alvo de ≤ 200 KB. As duas foram decisão do Gustavo depois das
  medições de peso.
- **"Estado colapsado (fase 9)".** Esse estado não existe na tarja: a fase 9
  da AUDITORIA é o divisor das velas. Testei os dois estados em que a tarja
  some, que são a campanha expirada (o contador dá display:none) e a tarja
  escondida com o vídeo rodando. Nos dois o vídeo pausa ou nem baixa.
- **Bytes antes do LCP.** Não ficaram em ±5 KB da baseline: caíram 147 KB e 277 KB.
- **CLS de rolagem em 390** (cls.mjs). Já existia: 0,0612 no HEAD e 0,0466
  agora. Vem de `#pagamento` e da nav; o CLS de carga está em 0,0001.
- **Console da sonda de cenários.** Ela não bloqueia terceiros, então o
  `sendCapiPageView` dá erro de CORS no localhost. É tracking que já existia e
  não foi tocado; o console-limpa.mjs, que bloqueia terceiros, sai limpo.
- **Medida da troca.** A primeira versão da sonda capturava o "pôster" com o
  vídeo já tocando por cima: no 4g simulado o portão abre antes da captura.
  Por isso o diff oscilava entre 0,8% e 3,2%. Agora a camada do vídeo fica
  escondida durante a captura, e o quadro 0 só é capturado depois de
  realmente pintado (requestVideoFrameCallback).

## Correção: iPhone ficava no pôster (out/2026)

**Causa.** O portão exigia `desktop ≥ 1080 OU navigator.connection.effectiveType === '4g'`.
O Safari (e o Firefox) não têm `navigator.connection`, então todo iPhone
caía no "não" e ficava no pôster.

**Regra nova** (script/tarjaVideo.js, regra 26):
- **O que bloqueia:** só movimento reduzido, ou a API EXISTINDO e dizendo
  saveData ou effectiveType slow-2g/2g/3g.
- **API ausente:** desconhecido = libera.
- **Formato:** webm só quando `canPlayType('video/webm; codecs="vp9"') === 'probably'` E
  a UA traz `Chrome/`, `Chromium/` ou `Firefox/` (Blink/Gecko). Todo o resto leva mp4.
  O resto inclui todo navegador do iOS: CriOS e FxiOS são WebKit e não trazem esses tokens.

**MP4 para iOS** (ffprobe): H.264 profile High, nível 3.1 (≤ 4.1), yuv420p,
`moov` antes do `mdat` (faststart: ftyp@0, moov@32, mdat@4484/4627). Nada a reencodar.

**Range em produção** (producao.mjs, item 8 novo): os 4 arquivos respondem
206 a `Range: bytes=0-1`, com `Content-Range: bytes 0-1/<tamanho>` e Content-Type
`video/mp4`/`video/webm` certos. O `Accept-Ranges: bytes` vem na resposta
200 e o LiteSpeed não repete na 206. A RFC 9110 não exige o cabeçalho na 206,
e o Content-Range basta para o Safari. Nada a ajustar no .htaccess. Em 2 de
~12 HEADs em rajada a resposta veio vazia; em 9 GETs seguidos, todos deram 206.

**Depuração no celular:** `?tarjaDebug=1` abre um quadro fixo no canto inferior
esquerdo. Ele mostra a variante, o motor, a resposta do canPlayType e o formato,
cada condição do portão, o src, readyState/networkState/paused, o resultado do
play() (com o motivo da rejeição) e os últimos eventos do `<video>`. Sem o
parâmetro, nenhum nó e nenhum timer. Não entra no crítico e não faz requisição
a mais (vive no próprio tarjaVideo.js).

**Teste iPhone** (`tarja-video-prova.mjs <rótulo> iphone`), no iPhone 14 emulado:

| motor | padrão | ?tarjaDebug=1 | connection 3g | saveData |
|---|---|---|---|---|
| WebKit | **não abriu nesta máquina** ¹ | — | — | — |
| Chromium (UA do iPhone, sem connection) | toca `mob.mp4`, readyState 4, sem quadro | quadro com "liberado" | pôster, 0 req | pôster, 0 req |

¹ O Windows desta máquina está com o **Smart App Control ligado**. Ele barra
as DLLs sem assinatura do build do WebKit do Playwright (`icutu77.dll`,
`nghttp2.dll`), e o processo sai com 0xC0E90002 (violação de política de
integridade). Desligar o Smart App Control não tem volta sem reinstalar o
Windows, e não foi feito. O modo `iphone` tenta o WebKit primeiro e registra
o motivo quando ele não abre. Numa máquina sem esse bloqueio (macOS, Linux, CI),
o mesmo comando cobre o motor do Safari. O Chromium com a UA do iPhone prova o
portão e a escolha do mp4, mas não prova o decode do WebKit.

**Aceites:**

| item | resultado |
|---|---|
| Lighthouse mobile / desktop / 1920 | 92 (77–93) / 100 / 100 — antes 93 / 100 / 100 ² |
| zero .webm/.mp4 antes do LCP e do load (390, 1474, lento, 9 cargas) | 0 / 0 |
| cenários (desktop, reduzido, saveData, 4g, 3g, **sem connection**, expirada, escondida) | todos como esperado |
| CLS de carga 390/1079/1366/1536/1920 | 0,0000 / 0,0000 / 0,0004 / 0,0003 / 0,0002 |
| fouc / console-limpa | 0,00% / limpo |
| npm run build + check | verde |

² Uma rodada da bateria deu mediana 82, com TBT 386. Então rodei o Lighthouse
no código novo e no HEAD anterior, 4× cada, listando vídeos e long tasks:
91/93/93/93 × 90/92/93/93. As duas versões baixam o mesmo mob.webm dentro da
janela do Lighthouse, porque o Chrome dele informa 4g e o portão antigo também
liberava. As long tasks são as mesmas. Era ruído; a re-medição oficial deu 92.

## Troca de campanha num comando: `npm run tarja -- <pasta>` (out/2026)

`scripts/tarja-ingestao.mjs` faz cinco passos e aborta com mensagem clara em
qualquer falha. Quando a falha vem depois do encode, ele desfaz o que fez: apaga
os arquivos novos e volta o index.html e o dist/ ao HEAD.

1. **Valida a pasta:**
   - `desktop.mp4` 3160×126 e `mobile.mp4` 2080×284, sem áudio, 15 s ± 0,1;
   - `campanha.json` com slug;
   - emenda do loop (quadro 0 × último, escala cheia) ≤ 1%;
   - as razões do CSS (`.tarjaMidia`) iguais às do encoder.
2. **Encoda** com o `tarja-video.mjs`. Os parâmetros aprovados agora moram
   num lugar só, `scripts/lib/tarja.mjs`: VP9 CRF 38 fixo nas duas variantes,
   H.264 no menor CRF de 26–30 que caiba, 24 fps. Slug já usado (no disco,
   no histórico do git ou no index.html) é recusado.
3. **index.html:** troca os 2 pôsteres (com width/height) e os 4 `data-*`. Com
   `"fim"`, mostra o diff de `prazosPromo` e só aplica com `--contador`.
4. **Build, check e prova:** `npm run build`, `git add` do que mudou,
   `npm run check` e `tarja-video-prova.mjs tudo`. A prova agora dá veredito e
   sai com código 1 se algo reprovar.
5. **Resumo:** pesos, emenda, o diff do index.html, os arquivos de tarja que
   ficaram órfãos (com o `git rm` pronto) e "pronto para commit". O script
   não commita.

**A razão do master é a do CSS, com tolerância de 1 px.** Mesmo a entrega
oficial do desktop (3160×126, razão 25,08) não bate exatamente com a do CSS
(2370/94 = 25,21): o encode aprovado já cortava 1 linha. A regra virou: a
escala de cobertura até o tamanho de saída pode cortar no máximo 1 px. Além
disso, o master não pode ser menor que o tamanho de entrega.

**Teste com a LIBERDADE reconstruída.** Os masters originais
(`zero7-tarjas-projetos/liberdade/export-web-v1/master/`, 30 fps, mobile
2082×286) foram copiados para uma pasta temporária no formato novo e passados
por `npm run tarja -- <pasta> --ensaio <saída>`:

| arquivo | no ar × reconstruído |
|---|---|
| tarja-liberdade-desk.mp4 | **byte-idêntico** |
| tarja-liberdade-mob.mp4 | **byte-idêntico** |
| tarja-liberdade-desk-poster.avif | **byte-idêntico** |
| tarja-liberdade-mob-poster.avif | **byte-idêntico** |
| tarja-liberdade-desk.webm | mesmo tamanho (255 018 B), os 360 pacotes idênticos (framemd5); diferem 16 bytes |
| tarja-liberdade-mob.webm | mesmo tamanho (186 170 B), os 360 pacotes idênticos (framemd5); diferem 16 bytes |

Os 16 bytes são o **TrackUID** do Matroska, gravado duas vezes (elementos
0x73C5 e 0x63C5, 8 bytes cada). O muxer do ffmpeg sorteia esse número a cada
gravação: duas execuções seguidas do MESMO comando também diferem nele. O
vídeo em si é idêntico. Os pôsteres byte-idênticos confirmam isso de outro
jeito, porque são o quadro 0 decodificado do webm.

**Ponta a ponta** (num worktree descartável, com os masters originais, slug
`ensaio-e2e`, `"fim": "2026-11-15"` e `--contador`), os cinco passos verdes:
- **Pesos:** 249,0 / 247,0 / 6,0 KB no desk e 181,8 / 178,9 / 4,2 KB no mob.
- **Contador:** 39 prazos diários, de 2026-10-08 a 2026-11-15.
- **Prova:** zero vídeo antes do LCP e do load; os oito cenários certos;
  troca pôster → quadro 0 em 0,487 / 0,547 / 0,897 / 0,838%; iPhone ok no
  Chromium.
- **Fim:** tudo no stage, sem commit. O worktree foi apagado.

**Casos de falha** (vídeos sintéticos), todos abortam com a explicação:
- pasta sem campanha.json, slug inválido, slug já usado, `--contador` sem `fim`;
- trilha de áudio, mobile.mp4 ausente;
- desktop 3160×200 ("cortaria 56 px na altura — outra proporção");
- mobile 1040×142 ("abaixo do tamanho de entrega");
- 10 s de duração;
- loop com 45,9% de diferença entre o quadro 0 e o último.

**O export novo da pasta `zero7-tarjas/liberdade`** (24 fps, 2080×284, outra
exportação, não a que está no ar) passa no passo 1, com emendas de 0,56% e 0,52%.
**É recusado no passo 2:** com o CRF 38 aprovado, o VP9 dá 296,4 KB no desk
(alvo 250) e 217,7 KB no mob (alvo 200). O pôster precisou de AVIF q90 (52 KB,
contra 6 KB do aprovado). Ele tem bem mais grão que o master original. Ou o
designer reexporta com menos grão, ou os parâmetros aprovados mudam.

**A sonda corrigida no caminho.** Na primeira ponta a ponta, o visual em 1366
deu 5,96% com os mesmos arquivos que antes deram 0,897%. O screenshot rola o
alvo para a vista, o IntersectionObserver do tarjaVideo.js dispara `play()` de
novo, e a captura do "quadro 0" pegava a animação andando. Agora o `play()`
daquela instância vira no-op durante a medida, e a captura só vale se o vídeo
seguir parado em t = 0; se não seguir, mede de novo, até 3 vezes. Três rodadas
seguidas deram exatamente os mesmos valores.
