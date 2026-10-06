# O que está no ar × o que vai subir (comparação pareada)

A régua é a MESMA dos dois lados: o harness local (brotli + headers do
`.htaccess`, `scripts/lib/servidor.mjs`) servindo (a) um espelho fiel do
`/home/` em produção, baixado em 05/10 por GETs de leitura
(`deploy/backup-ar/`, 15,7MB — HTML, CSS, JS, fontes, imagens e os
vídeos inteiros; carimbo `v94-outubro-out01`, campanha PROFIT), e (b) o
HEAD (`d4c67d4`). Lighthouse 13, 5 execuções por preset, mediana
(mín–máx). O ar carrega GTM/Zendesk/Meta na carga — e os paga da
internet real na medição, como paga em produção; o HEAD só os carrega na
interação, por design.

## Resultado

| preset | NO AR hoje | HEAD (vai subir) | ganho |
|---|---|---|---|
| **mobile** | **64** (37–67) | **90** (80–93) | **+26** |
| **desktop** | **75** (71–81) | **100** (100–100) | **+25** |
| **desktop 1920** | **74** (73–77) | **100** (100–100) | **+26** |

| métrica (mobile) | ar | HEAD |
|---|---|---|
| FCP | 2.292ms | 1.550ms |
| LCP | 3.469ms | 3.275ms |
| TBT | 606ms | 40ms |
| Speed Index | 9.724ms | 1.685ms |
| CLS | 0,0091 | 0,0001 |

| métrica (desktop) | ar | HEAD |
|---|---|---|
| FCP | 637ms | 467ms |
| LCP | 3.846ms | 751ms |
| TBT | 10ms | 0ms |
| Speed Index | 2.121ms | 570ms |

Em uma frase para o CEO: **a home nova carrega com nota 90 no celular e
100 no desktop, contra 64 e 75 da atual — o Speed Index do celular cai
de 9,7s para 1,7s e o visual não muda.**

## As ressalvas de sempre

- Laboratório, não campo: a arbitragem final é o PSI/CrUX depois do
  deploy (`scripts/producao.mjs`).
- O espelho não tem `pedido-registrado/` (nunca abrimos — conversão
  real) e serve os terceiros do ar direto da internet: a variação de
  rede deles está dentro do mín–máx do ar.
- O mín de 80 do HEAD mobile é a variância da máquina no dia (mediana
  90-93 nos últimos três lotes); a do ar (37) é dele mesmo — TBT de
  606ms estoura quando os terceiros chegam juntos.
- Reproduzir: `node scripts/lh.mjs ar 5 --dir deploy/backup-ar` e
  `node scripts/lh.mjs head-ceo 5` (o `--dir` serve qualquer pasta com
  os mesmos headers e brotli — F3b).
