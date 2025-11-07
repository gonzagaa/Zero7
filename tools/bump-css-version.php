<?php
// Compatível com PHP 7+ (sem str_starts_with). Mostra erros na tela (tire em produção).
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Caminhos
$root = realpath(__DIR__ . '/..');
$indexHtml = $root . '/index.html';
$indexCss  = $root . '/css/index.css';

// Versão: use timestamp (evita shell_exec/ git)
$version = date('YmdHis');

// Helpers
function read_or_die($path, $label) {
  $c = @file_get_contents($path);
  if ($c === false) {
    http_response_code(500);
    exit("ERRO: não consegui ler {$label} em {$path}\n");
  }
  return $c;
}
function write_or_die($path, $content, $label) {
  if (@file_put_contents($path, $content) === false) {
    http_response_code(500);
    exit("ERRO: não consegui gravar {$label} em {$path}\n");
  }
}

// 1) index.html
$html = read_or_die($indexHtml, 'index.html');
$htmlNew = preg_replace_callback(
  '/<link([^>]+)href=["\']([^"\']*\/css\/index\.css)(\?v=[^"\']*)?["\']([^>]*)>/i',
  function($m) use ($version) {
    $pre  = isset($m[1]) ? $m[1] : '';
    $href = isset($m[2]) ? $m[2] : '';
    $post = isset($m[4]) ? $m[4] : '';
    return '<link' . $pre . 'href="' . $href . '?v=' . $version . '"' . $post . '>';
  },
  $html,
  1
);
if ($htmlNew === null) {
  http_response_code(500);
  exit("ERRO: regex falhou ao atualizar link do index.css\n");
}

// 2) css/index.css — atualiza todos os @import locais
$css = read_or_die($indexCss, 'css/index.css');
$cssNew = preg_replace_callback(
  '/@import\s+(url\()?["\']([^"\']+)["\']\)?\s*;/i',
  function($m) use ($version) {
    $isUrl = !empty($m[1]);
    $url   = $m[2];

    // ignorar http(s) e data:
    if (preg_match('/^(https?:)?\/\//i', $url) || strpos($url, 'data:') === 0) {
      return $m[0];
    }

    // remove versão antiga se houver
    $base = preg_replace('/\?v=[\w\.\-]+$/', '', $url);
    return '@import ' . ($isUrl ? 'url(' : '') . '"' . $base . '?v=' . $version . '"' . ($isUrl ? ')' : '') . ';';
  },
  $css
);
if ($cssNew === null) {
  http_response_code(500);
  exit("ERRO: regex falhou ao atualizar @import do index.css\n");
}

// 3) gravar
write_or_die($indexHtml, $htmlNew, 'index.html');
write_or_die($indexCss,  $cssNew,  'css/index.css');

header('Content-Type: text/plain; charset=utf-8');
echo "OK: versao aplicada ?v={$version} em index.html e nos @import do css/index.css\n";
