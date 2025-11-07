// Node 16+
// Atualiza a versão (query ?v=HASH) no link do index.css no HTML
// e em todos os @import do index.css, sem mudar sua estrutura.

// Como versão, uso o curto do commit (se git disponível) ou timestamp.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const INDEX_CSS  = path.join(ROOT, 'css', 'index.css');

// 1) pega versão = short hash do git ou timestamp
let version = '';
try {
  version = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
} catch (e) {
  version = String(Math.floor(Date.now() / 1000)); // fallback
}

// 2) atualiza o link do index.css no index.html
let html = fs.readFileSync(INDEX_HTML, 'utf8');
// cobre casos com ou sem versão anterior
html = html.replace(
  /<link([^>]+)href=["']([^"']*\/css\/index\.css)(\?v=[^"']*)?["']([^>]*)>/i,
  (_m, pre, href, q, post) => `<link${pre}href="${href}?v=${version}"${post}>`
);

// 3) adiciona/atualiza ?v= nos @import do index.css
let css = fs.readFileSync(INDEX_CSS, 'utf8');

// trata @import url("arquivo.css"); @import "arquivo.css";
// (não mexe se já tiver http/https ou data:)
css = css.replace(
  /@import\s+(url\()?["']([^"']+)["']\)?\s*;/gi,
  (m, isUrl, urlPath) => {
    // ignora absolutos remotos
    if (/^(https?:)?\/\//i.test(urlPath) || /^data:/.test(urlPath)) return m;
    // remove versão antiga se existir
    const base = urlPath.replace(/\?v=[\w.-]+$/, '');
    return `@import ${isUrl ? 'url(' : ''}"${base}?v=${version}"${isUrl ? ')' : ''};`;
  }
);

// grava
fs.writeFileSync(INDEX_HTML, html, 'utf8');
fs.writeFileSync(INDEX_CSS, css, 'utf8');

console.log(`OK: versão aplicada ?v=${version} em index.html e imports do index.css`);
