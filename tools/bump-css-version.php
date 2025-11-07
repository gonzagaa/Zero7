<?php
// bump-css-version.php
// Atualiza ?v=<versao> no <link href="./css/index.css"> do index.html
// e em todos os @import do css/index.css. Não muda sua estrutura.
// Versão = hash curto do git; se falhar, usa timestamp.

$root = __DIR__ . '/..';
$indexHtml = $root . '/index.html';
$indexCss  = $root . '/css/index.css';

// 1) versão
$version = trim(@shell_exec('git -C ' . escapeshellarg($root) . ' rev-parse --short HEAD 2>&1'));
if ($version === '' || stripos($version, 'fatal') !== false) {
  $version = (string) time();
}

// 2) index.html: atualiza link do index.css
$html = file_get_contents($indexHtml);
if ($html === false) { http_response_code(500); exit("Erro lendo index.html\n"); }

$html = preg_replace_callback(
  '/<link([^>]+)href=["\']([^"\']*\/css\/index\.css)(\?v=[^"\']*)?["\']([^>]*)>/i',
  function($m) use ($version) {
    $pre  = $m[1] ?? '';
    $href = $m[2] ?? '';
    $post = $m[4] ?? '';
    return '<link' . $pre . 'href="' . $href . '?v=' . $version . '"' . $post . '>';
  },
  $html,
  1
);

// 3) css/index.css: atualiza todos os @import
$css = file_get_contents($indexCss);
if ($css === false) { http_response_code(500); exit("Erro lendo css/index.css\n"); }

$css = preg_replace_callback(
  '/@import\s+(url\()?["\']([^"\']+)["\']\)?\s*;/i',
  function($m) use ($version) {
    $isUrl  = $m[1] !== null;
    $url    = $m[2];

    // ignora http(s) e data:
    if (preg_match('/^(https?:)?\/\//i', $url) || str_starts_with($url, 'data:')) {
      return $m[0];
    }

    // remove versão antiga
    $base = preg_replace('/\?v=[\w\.-]+$/', '', $url);
    return '@import ' . ($isUrl ? 'url(' : '') . '"' . $base . '?v=' . $version . '"' . ($isUrl ? ')' : '') . ';';
  },
  $css
);

// 4) grava
if (file_put_contents($indexHtml, $html) === false) { http_response_code(500); exit("Erro gravando index.html\n"); }
if (file_put_contents($indexCss, $css) === false)   { http_response_code(500); exit("Erro gravando css/index.css\n"); }

header('Content-Type: text/plain; charset=utf-8');
echo "OK: versao aplicada ?v={$version} em index.html e imports do index.css\n";
