// Servidor estático mínimo para abrir a home sem depender do Live Server.
// Só lê arquivos; não escreve nada.
//
// BROTLI espelhando a produção (plano-90 v2): a produção serve HTML/CSS/JS
// com Content-Encoding: br, e o harness servia CRU — o index.html de 165KB
// contava 165KB na fila simulada do Lantern quando o visitante real recebe
// ~35KB. Todo FCP/LCP simulado local saía inflado. Texto (html/css/js/
// json/svg) agora sai em brotli quando o cliente aceita, com cache em
// memória por mtime; binário (imagem/fonte/vídeo) segue cru, como na
// produção. PAGINA_SEM_BR=1 devolve o comportamento antigo, para comparar
// eras.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const COMPRIMIVEIS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml']);
const cacheBr = new Map(); // arquivo -> { mtimeMs, corpo }

/* D0: os MESMOS Cache-Control do /home/.htaccess. O no-store antigo tinha
   um efeito colateral que distorcia TODA medição de fonte: preload não
   pode ser reutilizado sob no-store, então cada woff2 precarregado
   baixava DUAS vezes no laboratório (346KB contados onde a produção paga
   ~204KB uma vez). O cache frio do protocolo continua garantido pelo
   CONTEXTO NOVO por carga (e pelo Network.setCacheDisabled de quem o
   usa), não pelo header. */
function cacheControlDe(ext) {
  if (ext === '.json') return 'no-store, no-cache, must-revalidate, max-age=0';
  if (ext === '.html' || ext === '.htm') return 'max-age=300, must-revalidate';
  return 'public, max-age=31536000, immutable';
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

export function iniciarServidor(raiz) {
  const servidor = http.createServer(async (req, res) => {
    let caminhoRel;
    try {
      // decodeURIComponent porque há arquivos com espaço no nome
      caminhoRel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('URL inválida');
      return;
    }

    if (caminhoRel.endsWith('/')) caminhoRel += 'index.html';

    const arquivo = path.join(raiz, path.normalize(caminhoRel));
    if (!arquivo.startsWith(raiz)) {
      res.writeHead(403).end('Fora da raiz');
      return;
    }

    let info;
    try {
      info = await stat(arquivo);
      if (info.isDirectory()) throw new Error('dir');
    } catch {
      res.writeHead(404).end('Não encontrado');
      return;
    }

    const tipo = TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
    const faixa = req.headers.range;

    // Range é necessário para os <video> não travarem o load
    if (faixa) {
      const m = /bytes=(\d*)-(\d*)/.exec(faixa);
      const inicio = m && m[1] ? Number(m[1]) : 0;
      const fim = m && m[2] ? Number(m[2]) : info.size - 1;
      res.writeHead(206, {
        'Content-Type': tipo,
        'Content-Range': `bytes ${inicio}-${fim}/${info.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': fim - inicio + 1,
      });
      createReadStream(arquivo, { start: inicio, end: fim }).pipe(res);
      return;
    }

    const ext = path.extname(arquivo).toLowerCase();
    const aceitaBr = /\bbr\b/.test(req.headers['accept-encoding'] || '');
    if (COMPRIMIVEIS.has(ext) && aceitaBr && !process.env.PAGINA_SEM_BR) {
      let entrada = cacheBr.get(arquivo);
      if (!entrada || entrada.mtimeMs !== info.mtimeMs) {
        const cru = await readFile(arquivo);
        entrada = { mtimeMs: info.mtimeMs, corpo: zlib.brotliCompressSync(cru, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }) };
        cacheBr.set(arquivo, entrada);
      }
      res.writeHead(200, {
        'Content-Type': tipo,
        'Content-Encoding': 'br',
        'Content-Length': entrada.corpo.length,
        'Cache-Control': cacheControlDe(path.extname(arquivo).toLowerCase()),
        'Vary': 'Accept-Encoding',
      });
      res.end(entrada.corpo);
      return;
    }

    res.writeHead(200, {
      'Content-Type': tipo,
      'Content-Length': info.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheControlDe(path.extname(arquivo).toLowerCase()),
    });
    createReadStream(arquivo).pipe(res);
  });

  return new Promise((resolve) => {
    servidor.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address();
      resolve({
        // PAGINA_QUERY acrescenta uma query à URL da home em todo script
        // (fase 9): PAGINA_QUERY='?x=1' node scripts/cls.mjs
        url: `http://127.0.0.1:${port}/index.html${process.env.PAGINA_QUERY || ''}`,
        // close() espera cada conexão terminar, e o navegador deixa as dos
        // <video> abertas em keep-alive: na fase 5 o medir.mjs mediu as sete
        // larguras e ficou 70 minutos parado aqui. Fecha tudo de uma vez.
        fechar: () => new Promise((r) => {
          servidor.close(r);
          servidor.closeAllConnections?.();
        }),
      });
    });
  });
}
