# Zero7 — home estática (/home/)

- Antes de qualquer tarefa, leia AUDITORIA-CONTEXTO.md (regras 1–26) e a seção
  "Como alterar o site" do README.md.
- Depois de QUALQUER alteração em css/, script/ ou index.html: rode
  `npm run build` e depois `npm run check`. Só diga que terminou com o check
  verde. Nunca edite dist/ nem css/fonts/*.hero.woff2 à mão — são gerados.
- Nunca altere planos.json, MARGEM/limiteAlta, tracking (GTM, Meta, Hotjar, RD,
  Zendesk, dataLayer), hrefs de checkout, nem a lógica do contador, sem pedido
  explícito.
- Se mudar texto da primeira tela (h1, subtítulo, CTA, tarja, nav), o build
  regenera as fontes do hero; o check acusa se faltar caractere.
- Depois do commit do Gustavo e da sincronização no TurboCloud, a verificação é
  `node scripts/producao.mjs https://zero7.com.br/home/`.
- Este repo publica tudo o que é commitado. Nada de node_modules, shots/,
  deploy/ ou arquivos grandes de medida fora do .gitignore.
