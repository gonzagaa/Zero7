<?php
// Serve /css/index.css dinamicamente: injeta ?v=<mtime> em cada @import local.
// Não usa shell_exec; funciona em PHP 7+.
// Cabeçalho para não cachear só o index.css; importados podem ter cache longo.

error_reporting(0);
$root = realpath(__DIR__ . '/..');          // /public_html/home
$physicalIndex = __DIR__ . '/index.css';    // /css/index.css

if (!is_file($physicalIndex)) {
  http_response_code(404);
  header('Content-Type: text/plain; charset=utf-8');
  exit("index.css not found\n");
}

$css = file_get_contents($physicalIndex);

// injeta ?v=mtime por arquivo importado local
$css = preg_replace_callback(
  '/@import\s+(url\()?["\']([^"\']+)["\']\)?\s*;/i',
  function($m) {
    $isUrl = !empty($m[1]);
    $url   = $m[2];

    // ignora http(s) e data:
    if (preg_match('/^(https?:)?\/\//i', $url) || strpos($url, 'data:') === 0) {
      return $m[0];
    }

    // normaliza caminho físico do import (relativo à pasta /css)
    $base = preg_replace('/\?v=[\w\.\-]+$/', '', $url); // tira versão antiga, se houver
    $importPath = __DIR__ . '/' . ltrim($base, '/');
    $v = is_file($importPath) ? filemtime($importPath) : time();

    $newUrl = $base . '?v=' . $v;
    return '@import ' . ($isUrl ? 'url(' : '') . '"' . $newUrl . '"' . ($isUrl ? ')' : '') . ';';
  },
  $css
);

// cabeçalhos
header('Content-Type: text/css; charset=utf-8');
// O index.css (proxy) deve revalidar sempre, para capturar mudanças nos imports
header('Cache-Control: no-cache, must-revalidate');
// Evita issues de compressão duplicada; o Apache/CF cuidam da compressão
header_remove('Content-Encoding');

echo $css;
