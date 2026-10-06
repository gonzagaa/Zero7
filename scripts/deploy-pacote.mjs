// Monta deploy/zero7-home-<hash>.zip com SÓ o que sobe, na estrutura de
// /home/, e CONFERE por sonda que nada da lista de exclusão entrou.
//
//   node scripts/deploy-pacote.mjs
//
// A lista do que sobe é a do README ("Publicação") mais o dist/ (existe
// desde o lote A e o README nasceu antes dele). As exceções por ARQUIVO:
//
// - script/planos.json NÃO sobe: é o painel de campanha da outra pessoa,
//   editado DIRETO no servidor (medido: o do ar difere do local). Subir o
//   nosso sobrescreveria a campanha ativa.
// - assets/tarjapopup/TARJA MOBILE MARGEM ... REDUZIDO*.avif SOBEM apesar
//   do "MARGEM" no nome: são a arte da campanha REINÍCIO em altura
//   reduzida (fase 22) — o nome herdou o template do remake; o CONTEÚDO
//   foi conferido a olho ("PLANOS COM REINÍCIO + 77% OFF") e o index.html
//   do HEAD as referencia no srcset da tarja. Qualquer OUTRO arquivo com
//   MARGEM no nome reprova.
// - dist/manifest.json e dist/critico.meta.json não sobem: metadados do
//   build; o critico.css também não (vive embutido no index.html).
//
// Depois de montar, a sonda relê o ZIP (não a pasta) e reprova qualquer
// caminho proibido. No fim, confere que toda referência local do
// index.html (./assets, ./css, ./dist, ./script, ./vendor) existe no zip.
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(RAIZ);

const hash = execSync('git rev-parse --short HEAD').toString().trim();
const suja = execSync('git status --porcelain -- index.html dist css script vendor assets cert pedido-registrado .htaccess').toString().trim();
if (suja) {
  console.error('working tree com mudanças não commitadas no que sobe:\n' + suja + '\nCommite antes de empacotar — o zip leva o nome do commit.');
  process.exit(1);
}

const SOBE_RAIZ = ['index.html', '.htaccess', 'llms.txt'];
const SOBE_PASTAS = ['assets', 'css', 'script', 'vendor', 'cert', 'pedido-registrado', 'dist'];
const TARJA_REDUZIDA = /^assets\/tarjapopup\/TARJA MOBILE MARGEM TAMANHO REDUZIDO(-\d+)?\.avif$/;

const NAO_SOBE = [
  [/^(medidas|scripts|shots|node_modules|backend|\.git|\.vscode|deploy)\//, 'pasta interna'],
  [/(^|\/)(AUDITORIA-CONTEXTO|README)\.md$/, 'documentação interna'],
  [/\.md$/, 'qualquer .md'],
  [/^comparacao(-perf)?\.html$/, 'página de revisão'],
  [/^package(-lock)?\.json$/, 'ferramenta de dev'],
  [/^\.git(ignore|attributes)$/, 'controle de versão'],
  [/(^|\/)\.env/, 'segredo'],
  [/(^|\/)planos\.json$/, 'campanha editada no servidor — NUNCA sobrescrever'],
  [/^dist\/(manifest\.json|critico\.(css|meta\.json))$/, 'metadado do build'],
  [/MARGEM/i, 'campanha MARGEM', (p) => TARJA_REDUZIDA.test(p)], // exceção justificada acima
];

const proibido = (rel) => {
  for (const [re, motivo, excecao] of NAO_SOBE) {
    if (re.test(rel) && !(excecao && excecao(rel))) return motivo;
  }
  return null;
};

// ── monta a área de staging ─────────────────────────────────────────────
const staging = path.join(os.tmpdir(), 'zero7-deploy-' + hash);
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

let copiados = 0;
const copiar = (rel) => {
  const motivo = proibido(rel);
  if (motivo) return;
  const destino = path.join(staging, rel);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(path.join(RAIZ, rel), destino);
  copiados++;
};
const varrer = (rel) => {
  for (const nome of fs.readdirSync(path.join(RAIZ, rel))) {
    const filho = rel + '/' + nome;
    if (fs.statSync(path.join(RAIZ, filho)).isDirectory()) varrer(filho);
    else copiar(filho);
  }
};
for (const f of SOBE_RAIZ) if (fs.existsSync(path.join(RAIZ, f))) copiar(f);
for (const d of SOBE_PASTAS) varrer(d);

// ── zipa (bsdtar do Windows escreve zip) ───────────────────────────────
fs.mkdirSync(path.join(RAIZ, 'deploy'), { recursive: true });
const zipRel = `deploy/zero7-home-${hash}.zip`;
const zipAbs = path.join(RAIZ, zipRel);
fs.rmSync(zipAbs, { force: true });
// o tar do Windows (bsdtar) escreve zip; o do Git Bash (GNU) leria "C:"
// como host remoto — caminho explícito para não depender do PATH
const TAR = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
execSync(`"${TAR}" -a -cf "${zipAbs}" -C "${staging}" .`);
fs.rmSync(staging, { recursive: true, force: true });

// ── sonda: relê o ZIP e reprova qualquer proibido ──────────────────────
const listagem = execSync(`"${TAR}" -tf "${zipAbs}"`, { maxBuffer: 20e6 }).toString().split('\n')
  .map((l) => l.trim().replace(/^\.\//, '')).filter((l) => l && !l.endsWith('/'));
const violacoes = [];
for (const rel of listagem) {
  const motivo = proibido(rel);
  if (motivo) violacoes.push(rel + '  (' + motivo + ')');
}

// ── sonda 2: toda referência local do index.html existe no zip ─────────
// comentários HTML fora: o popup desativado referencia uma arte que não
// existe mais, e isso não é referência viva
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const refs = [...new Set([...html.matchAll(/(?:src|href)="\.\/([^"?#]+)/g)].map((m) => decodeURIComponent(m[1])))]
  .filter((r) => /^(assets|css|dist|script|vendor)\//.test(r));
const noZip = new Set(listagem);
const quebradas = refs.filter((r) => !noZip.has(r));

const kb = (fs.statSync(zipAbs).size / 1024 / 1024).toFixed(1);
console.log(`${zipRel}: ${listagem.length} arquivos (${copiados} copiados), ${kb}MB`);
if (violacoes.length) {
  console.error('REPROVADO — no zip:\n  ' + violacoes.join('\n  '));
  process.exit(1);
}
console.log('sonda de exclusão: nenhum proibido no zip ✓');
if (quebradas.length) {
  console.error('REPROVADO — o index.html referencia e o zip NÃO tem:\n  ' + quebradas.join('\n  '));
  process.exit(1);
}
console.log(`sonda de referências: ${refs.length} caminhos do index.html presentes ✓`);
