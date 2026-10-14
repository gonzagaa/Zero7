# Regulamento na home estática — /home/regulamento/ (out/2026)

O regulamento saiu do WordPress (`zero7.com.br/regulamento/`) e foi para a home
estática, em `/home/regulamento/`, redesenhado e no mesmo build e nas mesmas
réguas da home (regra 27). **Nada publicado.** O redirecionamento
`/regulamento` → `/home/regulamento/` é a próxima tarefa.

## Etapa 0 — conteúdo fiel

### De onde veio o texto

1. **Primeiro, o WP no ar.** O corpo foi extraído com o navegador (estilo
   computado, sem os `<span>` do Elementor) e convertido para HTML semântico
   em `regulamento/conteudo.html`.
   - Resultado: **4888 palavras, 0 divergências**; 5 links com os mesmos
     destinos, na mesma ordem.
2. **Data.** A pedido do Gustavo, "Última atualização" passou a 14/10/2026.
   A sonda acusou exatamente essa diferença e mais nada.
3. **Texto novo.** O regulamento revisado chegou como export do Google Docs
   (`NovoRegulamento_unificado091026.html`, apagado da raiz depois do uso e
   nunca commitado) e substituiu o conteúdo.
   - Documento × corpo da página: **4816 palavras, 0 divergências**.
   - **7 links** com os mesmos destinos, na mesma ordem. Os links do Google
     (`google.com/url?q=…`) foram desembrulhados. O texto novo tem dois links
     que o WP não tinha: Área do Trader e cadastro da Nelogica.
   - O documento não tem título nem "Última atualização": a página mantém
     "Regulamento" e 14/10/2026.
4. **Referência aprovada** (`medidas/regulamento-referencia.txt`): é o texto
   da página, isto é, o documento mais o cabeçalho, com 4820 palavras. A
   sonda dá **0 divergências** contra ela. Contra o WP no ar, ela só informa:
   35 trechos mudaram (é o regulamento novo).

`scripts/regulamento-fidelidade.mjs` extrai o texto dos dois lados pelo mesmo
caminho:
- só o texto visível, sem `text-transform`;
- elemento de bloco vira espaço;
- normalização só de espaços: vírgula a mais conta como divergência.

Ele também compara os destinos dos links e lista o negrito visual (peso
computado ≥ 600) como informação.

### Estrutura

| Item | O que ficou |
|---|---|
| Título | `h1` único: "Regulamento" |
| Seções | 16 `h2` com id estável (`regulamento-01-objetivo` … `regulamento-16-do-foro`). O texto novo manteve os 16 títulos, então **os ids não mudaram** |
| Subseções | `h3` ("3.1 – Política de Estorno", "Das operações", "Da eliminação"…) |
| Listas | `<ul>` reais. "Pessoa física;", que no original era um `<p>` solto antes da lista, virou o 1º item dela |
| Tabelas 01, 02, 03 | `<table>` com `<caption>` ("Tabela 01" + título), `<thead>`, `<th scope="col">` e o plano em `<th scope="row">`. No WP, as Tabelas 02 e 03 eram só citadas no texto; o documento novo as rotula, e as legendas passaram a existir |
| A "4ª tabela" (seção 9) | No WP era tabela de **layout**: cartões de plano em duas colunas, sem cabeçalho. `<thead>`/`<th>` ali seria semântica falsa, então ela virou uma lista de cartões, cada um com `h3` e `<dl>` (o texto continua o mesmo) |
| Notas | `<sup>1</sup>`, `<sup>2</sup>` mantidos; as notas são `p.reg-nota` |
| Fórmulas (+)(−)(=) | lista `.reg-conta` |
| Caminhos da Área do Trader | `p.reg-caminho` |
| Negrito, itálico, links | `<strong>`, `<em>`, `<a>`, com os mesmos destinos (`http://www.zero7.com.br/` continua `http`, como no original) |

Os parágrafos que o editor colava com `<br><br>` viraram parágrafos
separados. Um subtítulo inteiro chegou a estar dentro do mesmo `<p>`.

### Possíveis erros no texto — NÃO corrigidos, para o Gustavo decidir

Todos estão no texto novo:

1. **§15:** "entre o usuário e **nome da entidade ou empresa responsável pelo
   regulamento**". É um trecho de modelo que ficou sem preencher (o mais sério).
2. §4 e §6: "Essa obrigatoriedade **faz necessária**" (faltou o "-se": "faz-se").
3. §4 (Da eliminação) e §6 (Da construção de margem): "plano **contrato**", em
   vez de "contratado".
4. §6: "o saldo poderá ser usado **com** margem", em vez de "como".
5. §9 Pleno: "**R$ 1247,00**", sem o ponto de milhar que os outros valores têm.
6. §9 Expert e Master: "Limite de perda **total**" e "Meta aprovação", enquanto
   os demais planos dizem "perda **máxima**" e "Meta **de** aprovação".
7. §6 (Da solicitação de saque): o item "Guardar para Conta Real (…" abre um
   parêntese que não fecha.
8. §3: "devem ser **o mesmo** de cadastro" ("os mesmos").
9. §4 e §6: "0,37 por contrato de **WIN ;**" (espaço antes do ponto e vírgula).
10. §10: "se reserva **no** direito" ("reserva-se o direito").
11. §16: "…dúvidas do presente regulamento", sem ponto final.
12. §6 (Do ciclo de operações): "no ciclo posterior ou **subsequentes**"
    (concordância).
13. §1: "as condições gerais e as regras … devem ser **aceitos**" ("aceitas").
14. Tabela 02: a coluna de valor se chama "**Margem**", mas a tabela é de saque
    máximo. Pode ter sido copiada da Tabela 01.
15. §8: "Solicitar **up grade**". Pode ser o nome do botão na Área do Trader.

## Etapa 1 — a página

### Como é montada (regra 27)

- **Layout:** `regulamento/index.html`, editado à mão fora dos marcadores
  `<!-- build:x -->`. O `scripts/build.mjs` (`construirRegulamento`) preenche
  os marcadores:
  - **o CSS crítico DESTA página:** `dist/critico-regulamento.css`, extraído
    pelo `critico.mjs` com a página aberta, para cada bundle que ela carrega,
    a 390, 1280, 1474 e 1920;
  - **os dois bundles assíncronos** (regra 18): o compartilhado da home e o
    `dist/regulamento.<hash>.css`;
  - **as faces `.sub`**, com preload de NCS (h1) e TT Fors Regular (corpo);
  - **o nav e o rodapé COPIADOS do `index.html`:** um markup só. As âncoras e
    os assets ganham `../`, o `aria-current` vai para "Regulamento" e o nav
    nasce com `.scroll` (fundo sólido, porque o topo da página é claro);
  - **o sumário**, gerado dos `h2`;
  - **o texto** de `regulamento/conteudo.html`, com a interface marcada
    `data-chrome`: tempo de leitura, sumário do celular e âncoras.
- **Datas:** a do conteúdo alimenta o `dateModified` do JSON-LD e o
  cabeçalho de impressão.
- **`npm run check`:** vigia a página (crítico desatualizado e
  `git diff regulamento/`).
- **Crítico da home:** com a extração por página, saiu byte a byte igual
  ao de antes.
- **Fontes:** os `.hero` da home cobrem "REGULAMENTO" (U+41–56), mas não o
  corpo (é, ã, ê, ó, õ, J, W…). Usar os dois exigiria o mecanismo hero → sub
  da home para economizar 5,6 KB. A página usa as `.sub` existentes; **nenhum
  subset novo**.
- **Menu do celular:** o `global.js` não roda nesta página (arma Swiper e o
  modal de depoimentos sem guarda). O `script/regulamento.js` espelha o bloco
  de navegação dele: abrir, fechar, Esc, sair com Tab, scrim.

### Tracking

- **GTM:** o mesmo `GTM-KCJQPMC`, com o **portão de interação** da home.
  O WP também só carregava este container.
- **Zendesk:** pelo observer, quando o topo da seção 5 sobe da base da tela,
  longe da primeira tela em qualquer largura.
- **Sem PageView server-side do Meta.** O WP não tinha.

### Desenho

Decisões do Gustavo durante a rodada:

- **Fundo:** o `bg planos white.avif` (2,3 KB), **fixo**, numa camada própria
  em `position: fixed` (não `background-attachment`, que o iOS ignora). Abaixo
  de 1080, a janela da arte vai para o lado do "G", para a barra reta do "7"
  não cortar a tela.
- **Largura:** o conteúdo ocupa **a mesma caixa do nav**. A caixa do sumário
  encosta na borda esquerda e o texto vai até a direita. A medida de 68ch do
  pedido original saiu: em 1920 a linha passa de ~100 caracteres.
- **Sumário:** em **caixa**. Cartões e tabelas usam o **cinza translúcido** do
  caminho de menu (branco e azul foram testados e recusados).
- **Cabeçalho:** sem eyebrow (repetia "Regulamento") e sem o filete embaixo
  do título.
- **Título da guia:** "Regulamento - Zero7 Tesouraria", com hífen simples
  (também no og/twitter/JSON-LD).

### Acessibilidade

Correções que ficaram fora da página:

- **No markup da home**, que o regulamento copia (só atributos, sem efeito
  visual):
  - `role="listitem"` no `<div class="buttons">` filho do `<ul>` do menu
    (o axe acusava `list`);
  - `aria-hidden="true"` nos ícones sociais do rodapé (`role-img-alt`).
- **No `regulamento.css`:** o nav fica mais denso só nesta página e só a
  partir de 1080. Sobre o fundo claro, o item ativo caía para 4,41:1.

## Etapa 2 — réguas

Bateria final, com o texto novo:

| Régua | Regulamento | Home (sem regressão) |
|---|---|---|
| Lighthouse mobile (mediana de 5) | **98** (98–99): LCP 2180 ms, TBT 0, CLS 0,003 | 93 (87–93) |
| Lighthouse desktop 1474 | **100**: LCP 515 ms | 100 |
| Lighthouse desktop 1920 | **100**: LCP 506 ms | 100 |
| Lighthouse acessibilidade (3 presets) | **100**, sem falhas | — |
| axe-core: 390 / 1366 / 1366 a 200% | **0 / 0 / 0** violações | — |
| CLS de carga: 390/1079/1366/1536/1920 | 0,0052 / 0,0010 / 0,0007 / 0,0005 / 0,0003 | 0,0000 / 0,0000 / 0,0004 / 0,0003 / 0,0003 |
| FOUC: 390/1280/1366/1474/1536/1920 | 0,00% em todas | ≤ 0,03% |
| console-limpa (390, 1474, com interação) | limpo; sumário, menu e âncora ok | limpo; modal ok |
| Rastreadores antes de interação (8 s, 390 e 1474) | **0** | — |
| Fidelidade | **0** divergências (referência aprovada) | — |

- **Requisições de terceiros antes de interação:** além dos rastreadores
  (zero), entram **8 requisições do ionicons** (`unpkg.com/ionicons@7.1.0`),
  que desenha os ícones do nav e do rodapé. A home carrega a mesma biblioteca
  do mesmo jeito. Para zerar de fato, seria preciso hospedar os ícones aqui
  ou trocar por SVG embutido, o que mudaria o markup da home também. **Fica
  para o Gustavo decidir.**
- **Teclado:** o link de pular é o 1º Tab e aparece; sumário, âncoras, links
  do texto e tabelas têm foco visível.
- **Movimento reduzido:** a rolagem deixa de ser suave.
- **`prefers-contrast: more`:** a borda dos cartões sobe de 7% para 55%.
- **Impressão:** nav, rodapé e sumário somem; o cabeçalho "Regulamento Zero7 —
  atualizado em 14/10/2026" aparece; os links externos levam a URL entre
  parênteses; as tabelas não quebram no meio da linha. O PDF A4 tem 136 KB.
- **Shots** (`shots/regulamento-final/`, fora do git): 320, 390, 768, 1079,
  1280, 1366 e 1920, mais 1366 a 200%, cada um com topo e Tabela 01. O
  **lado a lado WP × nova** está em `wp-x-nova-{390,1366,1920}-{topo,tabela}.png`.
  As 7 larguras foram escolhidas porque o repo não tem uma lista de 7: cobrem
  celular pequeno, celular, tablet, o último pixel antes do desktop,
  notebook, notebook comum e full HD.

## Links para /regulamento/ — NÃO trocados

Eles mudam junto com o redirecionamento, na próxima tarefa.

- **Home (`index.html`), 5 links**, todos para `https://zero7.com.br/regulamento/`:
  - nav, linha 741;
  - os 3 botões "Ver Regulamento" do `#topicos`, linhas 1092, 1111 e 1135;
  - rodapé, linha 1785.
- **`#plan`:** nenhum link para o regulamento (nem no HTML, nem em
  `planos.json` ou nos scripts dos planos).
- **Satélites:** `cert/` e os 10 `pedido-registrado/` têm 2 links cada (nav e
  rodapé), 22 no total. Ficaram intocados; o redirecionamento cobre.

## Para a tarefa do redirecionamento

- A URL nova precisa entrar no `sitemap.xml` e no `llms.txt`. Até o
  redirecionamento, WP e página nova coexistem: cada uma aponta o próprio
  canonical, mas o texto é quase o mesmo.
- O `regulamento/conteudo.html` responde 404 em produção (`.htaccess`): é
  fonte, não página.

## Revisão de 14/10/2026 (mesma data de atualização)

Segundo export do Google Docs, com a mesma data. Pelo pedido do Gustavo,
mudaram só o Objetivo e o "Máximo de dias".

- **Diferença contra a referência anterior:** exatamente 9 trechos.
  - **§1 Objetivo:** um parágrafo novo, "Em caso de campanhas verifique os
    termos e condições no momento de sua compra."
  - **§9, nos 8 planos:** "Máximo de dias: 60" virou "Máximo de dias:
    Consulte o plano contratado".
- **Documento × corpo da página:** 4853 palavras e 7 links, com 1 divergência,
  que é de espaço e não de palavra. No plano Sênior o documento traz
  "Máximo de dias:Consulte", colado. Na página, rótulo e valor são `<dt>` e
  `<dd>` separados, então o espaço aparece como nos outros 7 planos. Fica na
  lista de possíveis erros do texto, para o Gustavo decidir.
- **Referência aprovada regravada:** 4858 palavras, 0 divergências.
- **Réguas depois da troca:** axe 0 (390, 1366, 1366 a 200%); FOUC 0,00% nas
  6 larguras; console limpo; teclado, impressão e rastreadores (0) ok.
