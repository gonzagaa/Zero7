# Zero7 — home estática

Landing page estática servida em `https://zero7.com.br/home/`. A raiz deste
repositório **é** a pasta `/home/` no servidor: o `.htaccess` daqui vira
`/home/.htaccess`, e o redirecionamento de `/` mora na raiz do documento, fora
deste projeto.

Não há build. O HTML, o CSS e o JS são servidos como estão. O que existe de
ferramenta serve para **medir** e para **preparar mídia**, nunca para gerar a
página.

## Contexto obrigatório

Antes de mexer em qualquer coisa, leia **[AUDITORIA-CONTEXTO.md](AUDITORIA-CONTEXTO.md)**.
Ele traz o histórico das fases, o que já está decidido, o que não pode ser
tocado e as **regras invioláveis** (texto visível, tracking, checkout, contador
da tarja, campanha, otimização de mídia).

## Cache busting

Todo CSS e JS carrega com `?v=<string>`. A string aparece em três lugares e os
três giram juntos quando CSS ou JS muda:

- o `<link>` e as `<script>` do `index.html`
- cada `@import` do `css/index.css`
- as 10 páginas satélite (`pedido-registrado/*`, `cert/`)

E ainda nas fontes: os 7 `src` do `@font-face` no fim do `css/index.css` e os 4
`<link rel="preload">` de cada página. Essas duas pontas precisam bater byte a
byte — se não baterem, o navegador baixa a fonte duas vezes.

São ~121 ocorrências. O `.htaccess` manda o navegador guardar CSS e JS por um
ano (`immutable`) confiando nesse `?v=`: **sem girar, produção continua
servindo a versão antiga.** O `npm run stamp` do `package.json` está quebrado
(`tools/` não existe no repositório) — o carimbo é manual.

## Ferramentas de desenvolvimento

```bash
npm install
```

Instala as devDependencies. Nenhuma é usada em produção:

| pacote | para quê |
|---|---|
| `playwright` | o harness de medição em `scripts/` — retrato de layout, CLS, a11y, peso da página |
| `sharp` | preparar imagem: reexportar em AVIF, gerar poster, montar recortes de comparação |
| `ffmpeg-static` + `ffprobe-static` | sondar os vídeos (codec, bitrate, duração) e extrair o quadro do poster |

`sharp`, `ffmpeg-static` e `ffprobe-static` trazem binário próprio — ficam como
dependência declarada de propósito, para ninguém precisar instalar ffmpeg à mão
nem descobrir na marra qual versão foi usada.

## Bibliotecas de terceiro hospedadas aqui

Ficam em `vendor/`, com a versão no caminho — não carregam `?v=` e não entram
no giro de cache, porque o caminho já muda quando a versão muda. Não edite
nada dentro de `vendor/`: para atualizar, baixe a versão nova numa pasta nova
e troque a referência nas 11 páginas.

| pasta | versão | licença | de onde veio |
|---|---|---|---|
| `vendor/swiper-11.2.10/` | 11.2.10 | MIT | `cdn.jsdelivr.net/npm/swiper@11` |
| `vendor/aos-2.3.1/` | 2.3.1 | MIT | `unpkg.com/aos@2.3.1` |

As duas licenças MIT estão no `LICENSE` de cada pasta, como o MIT exige. A
versão do Swiper veio de `swiper@11`, que é major flutuante: 11.2.10 é o que o
CDN servia no dia em que foi baixado, ou seja, congelar nela não muda nada do
que já estava no ar — só para de seguir atualizações silenciosas.

Ainda vêm de CDN: jQuery (code.jquery.com), Lenis e Ionicons (unpkg.com) e
GSAP + countUp (cdnjs.cloudflare.com). As fontes são servidas de `css/fonts/`
(WOFF2, sem subconjunto) — ver a fase 20 do `AUDITORIA-CONTEXTO.md`.

## Como alterar o site

1. Edite `css/`, `script/` ou `index.html` NESTA pasta (a única de trabalho).
2. `npm run build` — regenera `dist/`, o crítico embutido e os `.hero.woff2`.
3. `npm run check` — tem que sair verde (build determinístico + nada fora do commit).
4. Commit e push (`master` → github.com/gonzagaa/Zero7).
5. Sincronize no painel do TurboCloud.
6. `node scripts/producao.mjs https://zero7.com.br/home/` — a verificação pós-deploy.

## Como trocar a tarja em vídeo

1. Crie a pasta da campanha: `desktop.mp4` (3160×126), `mobile.mp4` (2080×284), 15 s, sem áudio, e `campanha.json` com `{ "slug": "nome-novo", "fim": "AAAA-MM-DD" }` (slug nunca repetido; `fim` opcional).
2. `npm run tarja -- <pasta>` (com `--contador` para aplicar os prazos do `fim`): valida, encoda, troca o `index.html`, roda build, check e a prova, e deixa tudo no stage. Se algo falhar, ele aborta e explica.
3. Commit e push.
4. TurboCloud: sincronize e faça o purge; depois `node scripts/producao.mjs https://zero7.com.br/home/`.

## Publicação: o que sobe e o que NÃO sobe

**Leia antes de publicar.** Não existe script nem configuração de deploy
neste repositório — a publicação é manual, e esta lista é a única proteção
contra subir o que não deve.

A raiz daqui vira `/home/` no servidor. **Sobe só isto:**

```
index.html
.htaccess
assets/
css/
script/          (MENOS o planos.json — ver abaixo)
vendor/
cert/
pedido-registrado/
dist/            (bundle e JS com hash — existe desde o lote A)
llms.txt
```

**`script/planos.json` NUNCA sobe:** é o painel de campanha, editado
DIRETO no servidor por outra pessoa (medido no lote F: o do ar difere do
local). Sobrescrever = trocar a campanha ativa. O
`scripts/deploy-pacote.mjs` monta o zip com estas regras e SONDA o
resultado — use-o em vez de montar à mão.

**NÃO sobe:**

| o quê | por quê |
|---|---|
| `AUDITORIA-CONTEXTO.md`, `README.md` (qualquer `.md`) | documentação interna. A auditoria é, na prática, a lista de pontos fracos do site |
| `comparacao.html`, `comparacao-perf.html` | páginas de revisão visual |
| `scripts/` | o harness de medição (atenção: `script/`, sem "s", é o JS do site e **sobe**) |
| `medidas/` | saídas do harness |
| `shots/` | capturas e cache de rede |
| `node_modules/`, `package.json`, `package-lock.json` | ferramentas de desenvolvimento |
| `.vscode/`, `.git/`, `.gitignore` | editor e controle de versão. `.git/` exposto entrega o código e o histórico inteiros |
| `backend/` | é uma função da Vercel (`backend-api-zero7.vercel.app`), publicada lá, não aqui |
| `.env` de qualquer pasta | segredo |

**Sobe, mas não faz efeito em `/home/`:** `llms.txt`. Ele só é lido na raiz
do domínio. O `robots.txt` e o `sitemap.xml` que moravam aqui foram apagados
pelo mesmo motivo — robots só vale na raiz, e aquele sitemap não estava
declarado em lugar nenhum.

**A rede de segurança:** o `.htaccess` responde 404 para os padrões de
ferramenta da tabela acima, mesmo que eles subam por engano. Ela existe para o
erro, não para substituir esta lista — e só funciona se o `.htaccess` subir.

Depois de publicar, conferir no ar:

```
/home/                             200, carrossel de planos e animações funcionando
/home/vendor/aos-2.3.1/aos.js      200
/home/script/global.js             200
/home/AUDITORIA-CONTEXTO.md        404
/home/scripts/retrato.mjs          404
```

## Build (bundle + minify)

`npm run build` concatena os 36 CSS na ordem dos `<link>` para
`dist/home.<hash8>.css` e minifica cada JS nosso para
`dist/script/<nome>.<hash8>.js` (sem concatenar JS: escopos de topo
colidiriam, e 4selet/blackPlanos têm lógica protegida), reescrevendo só o
`index.html`. O hash é do conteúdo: mudou, muda a URL — por isso dist/ não
usa `?v=`. **A fonte é `css/` e `script/`; ninguém edita `dist/`.**
`npm run watch` reconstrói a cada mudança (com Live Server, a edição aparece
na hora). `npm run check` = rebuild + `git diff --exit-code`: falha se o
`dist/` commitado estiver desatualizado. Sempre commitar `dist/` +
`index.html` juntos (a hospedagem não roda build). `cert/` e
`pedido-registrado/*` ficam fora, nos arquivos soltos com `?v=`.

O CSS crítico (acima da dobra, extraído nas duas viewports do protocolo por
`scripts/critico.mjs`) vai inline no `<head>`; o bundle completo carrega com
`preload` + `onload` e `<noscript>` de reserva. O `critico.css` é commitado
e amarrado ao hash do bundle: mudou CSS de cima da dobra, rode
`npm run build:critico` — o `check` falha se o crítico estiver de outro
bundle.

## Harness de medição

Os scripts em `scripts/` rodam a página num Chromium headless, com movimento
reduzido, para a medição ser determinística. Os principais:

```bash
node scripts/retrato.mjs tirar <rótulo> [largura]     # grava o retrato
node scripts/retrato.mjs comparar <a> <b> [largura]   # o que mudou entre dois
node scripts/cls.mjs                                  # CLS de carga e de rolagem
node scripts/a11y.mjs <rótulo>                        # toque, teclado, movimento
node scripts/medir.mjs <rótulo>                       # tabela de medidas
node scripts/perf.mjs <raiz> <rótulo> <largura> <rede>  # LCP, CLS, TBT, bytes
node scripts/inp.mjs <largura> <repetições>           # INP com interação real
node scripts/inp-etapas.mjs <largura> <repetições>    # INP nas três etapas + LoAF
node scripts/terceiros.mjs <largura>                  # terceiros e custos nomeados
node scripts/etapas-modal.mjs <largura> <repetições>  # abrir/fechar artigo, linha a linha
node scripts/etapas-modal-vazio.mjs <largura> <rep>   # o mesmo, com o corpo do artigo vazio
node scripts/ze-falha.mjs <largura> [normal|mostra|volta|quebrar]  # estado do botão do Zendesk
node scripts/fouc.mjs                                 # juiz do CSS crítico: só-crítico x completo, diff acima da dobra <= 0,5%
node scripts/ablacao.mjs [execuções]                  # quanto cada categoria de recurso custa na nota mobile
node scripts/b4-prova.mjs                             # animações: libs não baixam no celular, nada opacity-0, reveals no desktop
node scripts/b5-prova.mjs                             # GTM: nada de tag antes do LCP, push enfileirado processado, gclid
```

O **inp-etapas** abre o INP em atraso de entrada, processamento e
apresentação, a partir dos campos crus do Event Timing agrupados por
`interactionId` — um número de INP sozinho não diz o que consertar, e cada
etapa aponta para um conserto diferente: fila, código, ou layout e paint.
Junto vai o LoAF, que mostra onde o quadro longo gastou o tempo, e um log de
`fetch`, que separa fila de terceiro de processamento nosso.

O **etapas-modal** e o **etapas-modal-vazio** são um par, e só valem juntos.
Eles cronometram o abrir e o fechar do artigo da Central de Ajuda linha a
linha, interceptando o `sectionFaq.js` na rede e servindo uma cópia com
marcas — o arquivo do repositório não é tocado. O `-vazio` é a mesma sonda
com o corpo do artigo em branco. A comparação entre os dois é o que separa
"custa porque o conteúdo é grande" de "custa de qualquer jeito". Foi assim
que caiu a hipótese de que os 480ms de abrir um artigo eram o
`void el.modal.offsetHeight`: ele mede 0,0ms, o custo é o `showModal()`, e
com o corpo vazio o `showModal()` não ficou mais barato.

O **ze-falha** existe porque o botão do Zendesk depende de um acoplamento
entre o carregador do snippet (no `index.html`) e o `zero7LigarZendesk` (no
`global.js`), e o modo de falha desse acoplamento **ninguém vê sem
provocar**. Ele serve o `global.js` com a função removida de propósito e
confere que o lançador continua escondido. Os quatro modos são os quatro
estados que o botão precisa acertar:

| modo | o que faz | esperado |
|---|---|---|
| `normal` | carrega e fica no topo | escondido |
| `mostra` | rola para depois do #ba e fica | VISÍVEL |
| `volta` | passa do #ba e volta ao topo | escondido |
| `quebrar` | serve o `global.js` sem o `zero7LigarZendesk` | escondido |

O `quebrar` é a razão de o script existir. São duas camadas: o `hide`
incondicional, que roda assim que o `zE` aparece e garante o modo de falha
seguro, e o `IntersectionObserver` de mão dupla, que faz o pedido do cliente.
Deixar o observador só mostrando NÃO reforça a primeira camada e quebra a
segunda — já foi tentado. Mexeu aqui, rode os quatro modos.

O **retrato** é o que permite afirmar "idêntico" entre duas versões: para cada
elemento com caixa, guarda a posição e os estilos que pintam. Captura de tela
não serve para isso — varia entre execuções.

As saídas vão para `medidas/` (versionado) e `shots/` (ignorado). O
`AUDITORIA-CONTEXTO.md` tem a seção **Harness** com o detalhe de cada script e
as armadilhas conhecidas.

## Protocolo de medição de performance

Toda rodada de performance segue isto, sem exceção. Duas rodadas só são
comparáveis se as duas seguiram o mesmo protocolo — número solto, medido de
outro jeito, não entra em tabela nenhuma.

**Antes de gravar qualquer número, a asserção de carga.** `conferirCarga()`
(em `scripts/lib/pagina.mjs`) confere que as fontes carregaram e que o `h1`
está na fonte pretendida, e que o `:root` está no corpo esperado para a
largura (8px abaixo de 1080, 10 de 1080 em diante) com o `.wrapper` já com
recuo. Falhou, tenta uma vez; falhou de novo, **lança e a carga é
descartada**. Isso existe porque duas vezes o harness gravou número de uma
página que não era a página: um baseline sem a fonte e, em 1079, uma carga
sem o CSS aplicado.

**Os viewports fixos** (F3a: 1920 entrou — a faixa ≥1600 ficava fora de
toda régua e escondeu um CLS de 0,36; CLS/fouc cobrem também 1280):

| | largura × altura | DPR | UA |
|---|---|---|---|
| celular | 390 × 844 | 3 | Android (Pixel 7) |
| desktop | 1474 × 900 | 1 | o padrão |
| desktop largo | 1920 × 1080 | 1 | o padrão (lh.mjs, fouc, CLS) |

**Os dois cenários de rede**, em toda combinação:

| | latência | download | upload | CPU |
|---|---|---|---|---|
| `lento` | 150ms | 1,6 Mbps | 750 kbps | 4× |
| `livre` | — | — | — | — |

O `lento` é o preset móvel do Lighthouse. O `livre` é referência: separa o
que é custo da rede do que é custo da página.

**Em toda carga medida:**

- **cache frio** (`Network.setCacheDisabled`);
- **terceiros liberados** (`PAGINA_TERCEIROS=1`). O harness bloqueia GTM,
  Meta, Zendesk e o selo do Reclame Aqui por padrão, e medir assim
  **subestima o custo real**;
- **`prefers-reduced-motion` desligado** — o visitante real não tem;
- **9 cargas por combinação**, e o relatório traz **mediana com mínimo e
  máximo**. Uma leitura só não separa sinal de variância (ver "Uma amostra
  não prova nada", no AUDITORIA-CONTEXTO).

**O servidor do harness espelha a produção** (fronteiras de era — número de
antes não se compara com número de depois):

- **brotli** (plano-90 v2): html/css/js/json/svg saem com `Content-Encoding:
  br` como no /home/ real. Números simulados da era crua saíam inflados
  (o index de 169KB contava 169KB na fila do Lantern; o visitante recebe
  ~29KB).
- **Cache-Control do `.htaccess`** (lote D, D0): dist/fontes/imagens
  `immutable`, HTML `max-age=300`, json `no-store`. O `no-store` antigo em
  tudo impedia o reuso de preload e **cada woff2 precarregado baixava duas
  vezes** — todo número de bytes de fonte anterior ao D0 está inflado
  (346KB contados onde a produção paga ~204KB; medido pós-D0: 205KB, cada
  fonte uma vez). O cache frio do protocolo continua garantido pelo
  contexto novo por carga e pelo `Network.setCacheDisabled`, não pelo
  header.

**Bytes em dois momentos:** na carga inicial (visitante que não rola) e
depois de rolar até o rodapé — é lá que os vídeos e as imagens preguiçosas
entram.

**Bytes de terceiro saem do CDP** (`Network.loadingFinished`), nunca do
Resource Timing: sem `Timing-Allow-Origin` a API devolve zero e o relatório
sai com terceiro de graça.

**O INP se mede com interação de verdade**, com CPU a 4×, clicando por
coordenada com o mouse do navegador. O `.click()` do DOM **não conta**: o
Event Timing só dá `interactionId` a evento confiável. Cada interação é
repetida, e o relatório traz P75 e pior caso.

Os scripts que implementam isto são `perf.mjs`, `inp.mjs`, `inp-etapas.mjs` e
`terceiros.mjs`. A saída vai para `medidas/perf/`, e o relatório da rodada
fica em `medidas/perf-baseline-x-head.md`.

**Fica de fora:** dado de campo. O p75 de usuário real está no relatório de
Core Web Vitals do Search Console, e só o dono da propriedade alcança. Tudo
que o harness produz é laboratório — a melhor hipótese, não a verdade.

## Páginas de comparação

- `comparacao.html` — baseline × fase 7, lado a lado
- `comparacao-perf.html` — rodada 2 de performance: imagens e vídeos, antes ×
  depois no tamanho exibido real
