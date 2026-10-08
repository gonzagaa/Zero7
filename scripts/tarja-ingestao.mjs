// Troca da tarja em vídeo num comando só (regra 26).
//
//   npm run tarja -- <pasta> [--contador] [--cargas N]
//   npm run tarja -- <pasta> --ensaio <saída>     (só passos 1 e 2, fora do site)
//
// <pasta> é a da campanha, como o designer entrega:
//   desktop.mp4    3160×126, 15 s, sem áudio
//   mobile.mp4     2080×284, 15 s, sem áudio
//   campanha.json  { "slug": "profit-pro", "nome": "...", "fim": "2026-11-30" }
//                  ("fim" e "inicio" opcionais, AAAA-MM-DD: prazos do contador)
//
// Passos, nesta ordem, abortando com mensagem clara em qualquer falha:
//   1. valida a pasta: tamanhos (a razão tem que bater com a do CSS — a
//      escala até o tamanho de saída pode cortar no máximo 1 px), sem áudio,
//      15 s ± 0,1, campanha.json com slug, emenda do loop (quadro 0 × último,
//      escala cheia) ≤ 1%;
//   2. encoda com scripts/tarja-video.mjs (parâmetros aprovados em
//      scripts/lib/tarja.mjs) para assets/tarjapopup/tarja-<slug>-{desk,mob}
//      .{webm,mp4} + -poster.avif. Recusa slug já usado — o cache dos assets
//      é immutable de 1 ano, nome NUNCA se reaproveita;
//   3. index.html: troca os pôsteres (srcset/src + width/height) e os quatro
//      data-* do <video>. O aspect-ratio do CSS não muda (validado no 1).
//      Com "fim", mostra o diff proposto em prazosPromo (só as datas; a
//      lógica do contador é intocada — regra 5) e só aplica com --contador;
//   4. npm run build, git add do que mudou, npm run check,
//      scripts/tarja-video-prova.mjs (rede, cenários, visual com shots em
//      390/1079/1366/1920 — pôster e vídeo rodando —, iphone);
//   5. resumo: pesos, emenda, o que mudou no index.html. O COMMIT É DE QUEM
//      RODOU: nada aqui commita nem faz push.
//
// --ensaio <saída>: valida e encoda para <saída>, sem tocar no site e sem a
// recusa de slug (serve para provar que o encode reproduz o que está no ar).
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import sharp from 'sharp';
import { DURACAO, VARIANTES, cobertura } from './lib/tarja.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(RAIZ, 'assets', 'tarjapopup');
const argv = process.argv.slice(2);
const opc = (nome, padrao) => { const i = argv.indexOf(nome); return i >= 0 ? argv.splice(i, 2)[1] : padrao; };
const flag = (nome) => { const i = argv.indexOf(nome); if (i >= 0) { argv.splice(i, 1); return true; } return false; };
const ENSAIO = opc('--ensaio', null);
const CARGAS = opc('--cargas', '5');
const CONTADOR = flag('--contador');
const PASTA = argv[0] ? path.resolve(argv[0]) : null;

const passo = (n, titulo) => console.log(`\n━━ ${n}. ${titulo}`);
const linha = (s) => console.log('   ' + s);
let limpar = null; // desfaz o que o passo 2 criou, se algo falhar depois dele
function aborta(msg, dica = '') {
  console.error(`\n✗ ABORTADO: ${msg}${dica ? '\n  ' + dica.split('\n').join('\n  ') : ''}`);
  if (limpar) limpar();
  process.exit(1);
}
function rodar(bin, args, { binario = false, herda = false } = {}) {
  const r = spawnSync(bin, args, { cwd: RAIZ, maxBuffer: 1 << 30, encoding: binario ? 'buffer' : 'utf8', stdio: herda ? 'inherit' : 'pipe' });
  return { ok: r.status === 0, status: r.status, out: r.stdout, err: String(r.stderr || '') };
}
const git = (...a) => rodar('git', a);
const kb = (b) => (b / 1024).toFixed(1) + ' KB';

if (!PASTA) aborta('falta a pasta da campanha', 'uso: npm run tarja -- <pasta> [--contador] [--cargas N] | npm run tarja -- <pasta> --ensaio <saída>');

/* ================================ 1 ================================ */
passo(1, `valida ${PASTA}`);
if (!fs.existsSync(PASTA) || !fs.statSync(PASTA).isDirectory()) aborta(`a pasta não existe: ${PASTA}`);

const arqCampanha = path.join(PASTA, 'campanha.json');
if (!fs.existsSync(arqCampanha)) aborta('falta campanha.json na pasta', 'mínimo: { "slug": "nome-da-campanha" }');
let campanha;
try { campanha = JSON.parse(fs.readFileSync(arqCampanha, 'utf8')); } catch (e) { aborta(`campanha.json não é JSON válido: ${e.message}`); }
const slug = String(campanha.slug || '');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) aborta(`slug inválido: "${slug}"`, 'só minúsculas, números e hífen (vira nome de arquivo: tarja-<slug>-desk.webm)');
const reData = /^\d{4}-\d{2}-\d{2}$/;
for (const k of ['inicio', 'fim']) if (campanha[k] !== undefined && !reData.test(campanha[k])) aborta(`"${k}" no campanha.json tem que ser AAAA-MM-DD (veio "${campanha[k]}")`);
if (CONTADOR && !campanha.fim) aborta('--contador sem "fim" no campanha.json', 'acrescente "fim": "AAAA-MM-DD" (o último dia da campanha)');
linha(`campanha.json: slug "${slug}"${campanha.nome ? ` (${campanha.nome})` : ''}${campanha.fim ? `, fim ${campanha.fim}` : ''}`);

// as razões que o CSS reserva (regras 17/21) têm que ser as do encoder
const css = fs.readFileSync(path.join(RAIZ, 'css', 'tarjaImage.css'), 'utf8');
const razaoCss = {
  mob: /\n\.tarjaImage \.tarjaMidia \{\s*aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/.exec(css),
  desk: /div\.tarjaImage \.tarjaMidia \{\s*aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/.exec(css),
};
for (const [nome, v] of Object.entries(VARIANTES)) {
  const m = razaoCss[nome];
  if (!m) aborta(`não achei o aspect-ratio ${nome} do .tarjaMidia em css/tarjaImage.css`);
  if (Number(m[1]) * v.h !== Number(m[2]) * v.w) aborta(`o CSS reserva ${m[1]}/${m[2]} para ${nome}, mas o encoder gera ${v.w}×${v.h}`, 'CSS e scripts/lib/tarja.mjs divergem — acerte os dois juntos (regras 17/21) antes de trocar campanha');
}

if (!ENSAIO) {
  // index.html limpo: o passo 4 dá git add nele, e alteração de outra mão
  // entraria junto sem ninguém ver
  if (!git('diff', '--quiet', 'HEAD', '--', 'index.html').ok) aborta('index.html tem alterações não commitadas', 'commit ou descarte antes de trocar a tarja — o passo 4 põe o index.html no stage');
  // nome nunca reaproveitado: nem no disco, nem no histórico, nem no HTML
  const noDisco = fs.readdirSync(ASSETS).filter((f) => f.startsWith(`tarja-${slug}-`));
  const noGit = String(git('log', '--all', '--format=%h', '--', `assets/tarjapopup/tarja-${slug}-*`).out).trim();
  const noHtml = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').includes(`tarja-${slug}-`);
  if (noDisco.length || noGit || noHtml) aborta(`o slug "${slug}" já foi usado (${[noDisco.length && 'arquivos em assets/tarjapopup', noGit && 'histórico do git', noHtml && 'index.html'].filter(Boolean).join(', ')})`, 'o cache dos assets é immutable de 1 ano: um nome repetido serviria o vídeo ANTIGO a quem já visitou.\nUse um slug novo no campanha.json (ex.: ' + slug + '-2).');
}

function sondar(arquivo) {
  const r = rodar(ffprobeStatic.path, ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames:format=duration', '-of', 'json', arquivo]);
  if (!r.ok) aborta(`não consegui ler ${path.basename(arquivo)} (ffprobe): ${r.err.slice(-200)}`);
  const j = JSON.parse(r.out);
  const v = j.streams.find((s) => s.codec_type === 'video');
  return { video: v, audio: j.streams.filter((s) => s.codec_type === 'audio'), duracao: Number(j.format.duration) };
}
function quadroPng(arquivo, n) {
  const r = rodar(ffmpeg, ['-v', 'error', '-i', arquivo, '-vf', `select=eq(n\\,${n})`, '-vsync', '0', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { binario: true });
  if (!r.ok || !r.out.length) aborta(`não consegui extrair o quadro ${n} de ${path.basename(arquivo)}`);
  return r.out;
}
async function maePct(a, b) {
  const [ra, rb] = await Promise.all([sharp(a).removeAlpha().raw().toBuffer(), sharp(b).removeAlpha().raw().toBuffer()]);
  let s = 0;
  for (let i = 0; i < ra.length; i++) s += Math.abs(ra[i] - rb[i]);
  return +(s / ra.length / 255 * 100).toFixed(3);
}

const validacao = {};
for (const [nome, v] of Object.entries(VARIANTES)) {
  const arq = v.masters.map((n) => path.join(PASTA, n)).find((f) => fs.existsSync(f));
  if (!arq) aborta(`falta ${v.masters[0]} na pasta`, `esperado: ${v.masters[0]} ${v.entrega.join('×')}, ${DURACAO} s, sem áudio`);
  const s = sondar(arq);
  const rot = `${path.basename(arq)}`;
  if (!s.video) aborta(`${rot} não tem trilha de vídeo`);
  if (s.audio.length) aborta(`${rot} tem trilha de áudio (${s.audio.map((a) => a.codec_name).join(', ')})`, 'reexporte sem áudio — a tarja é muda e a trilha só pesa');
  const { width: mw, height: mh } = s.video;
  const [ew, eh] = v.entrega;
  const cob = cobertura(mw, mh, v.w, v.h);
  const razao = (a, b) => (a / b).toFixed(4);
  // abaixo do tamanho de entrega, o encode perde a nitidez que justificou a
  // resolução de saída (texto num iPhone a 3×); acima, só reduz
  if (mw < ew || mh < eh) aborta(`${rot} é ${mw}×${mh}, abaixo do tamanho de entrega ${ew}×${eh}`, `reexporte em ${ew}×${eh} — a saída é ${v.w}×${v.h} e precisa de master com folga para reduzir`);
  if (cob.cortaX > 1 || cob.cortaY > 1) {
    aborta(`${rot} é ${mw}×${mh} (razão ${razao(mw, mh)}), e o CSS reserva ${v.w}/${v.h} (razão ${razao(v.w, v.h)})`,
      `para virar ${v.w}×${v.h} a escala cortaria ${cob.cortaX} px na largura e ${cob.cortaY} px na altura — a arte tem outra proporção\ne o vídeo ficaria cortado (ou a tarja mudaria de altura e quebraria o --tarja-offset).\nReexporte em ${ew}×${eh}. Mudar a proporção da tarja é outra tarefa: CSS (regras 17/21) + scripts/lib/tarja.mjs.`);
  }
  const avisoTamanho = mw !== ew || mh !== eh ? ` (não é o ${ew}×${eh} de entrega, mas a razão bate com a do CSS: a escala corta ${Math.max(cob.cortaX, cob.cortaY)} px)` : '';
  if (Math.abs(s.duracao - DURACAO) > 0.1) aborta(`${rot} tem ${s.duracao.toFixed(3)} s; o loop é de ${DURACAO} s ± 0,1`);
  const n = Number(s.video.nb_read_frames);
  const emenda = await maePct(quadroPng(arq, 0), quadroPng(arq, n - 1));
  if (emenda > 1) aborta(`${rot}: o último quadro difere ${emenda}% do quadro 0 (régua ≤ 1%)`, 'o loop vai dar um pulo visível na volta — a animação tem que terminar onde começa');
  const [fn, fd] = s.video.r_frame_rate.split('/').map(Number);
  validacao[nome] = { arquivo: path.basename(arq), w: mw, h: mh, fps: +(fn / fd).toFixed(3), quadros: n, duracao: s.duracao, emendaMaster: emenda };
  linha(`${nome}: ${rot} ${mw}×${mh}${avisoTamanho}, ${validacao[nome].fps} fps, ${n} quadros, ${s.duracao.toFixed(3)} s, sem áudio, emenda 0×último ${emenda}% ✓`);
}

/* ================================ 2 ================================ */
const destino = ENSAIO ? path.resolve(ENSAIO) : ASSETS;
const arquivosNovos = Object.keys(VARIANTES).flatMap((n) => ['.webm', '.mp4', '-poster.avif'].map((e) => path.join(destino, `tarja-${slug}-${n}${e}`)));
passo(2, `encode → ${path.relative(RAIZ, destino) || destino}`);
const relatorio = ENSAIO ? path.join(destino, `tarja-video-encode-${slug}.json`) : path.join(RAIZ, 'medidas', `tarja-video-encode-${slug}.json`);
if (!ENSAIO) limpar = () => { for (const f of arquivosNovos) fs.rmSync(f, { force: true }); console.error('  (arquivos novos da tarja removidos)'); };
const enc = rodar(process.execPath, ['scripts/tarja-video.mjs', slug, '--masters', PASTA, '--destino', destino, '--relatorio', relatorio], { herda: true });
if (!enc.ok) aborta(enc.status === 2 ? 'o encode saiu fora da régua (peso acima do alvo ou emenda > 1%) — ver acima' : `o encode falhou (código ${enc.status}) — ver acima`,
  enc.status === 2 ? 'a arte é mais pesada que a aprovada (grão, movimento). Simplifique a animação ou fale com quem aprovou os parâmetros\n(scripts/lib/tarja.mjs) antes de afrouxar.' : '');
const rel = JSON.parse(fs.readFileSync(relatorio, 'utf8'));
for (const f of arquivosNovos) if (!fs.existsSync(f)) aborta(`o encode não gerou ${path.basename(f)}`);

if (ENSAIO) {
  console.log('\nensaio: passos 1 e 2 ok, nada no site foi tocado');
  for (const f of arquivosNovos) linha(`${path.basename(f).padEnd(36)} ${String(fs.statSync(f).size).padStart(7)} B  sha256 ${crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16)}`);
  process.exit(0);
}

/* ================================ 3 ================================ */
passo(3, 'index.html');
const arqHtml = path.join(RAIZ, 'index.html');
let html = fs.readFileSync(arqHtml, 'utf8');
const ini = html.indexOf('<span class="tarjaMidia">');
const fimBloco = html.indexOf('</video>', ini);
if (ini < 0 || fimBloco < 0) aborta('não achei o bloco <span class="tarjaMidia"> … </video> no index.html');
let bloco = html.slice(ini, fimBloco);
const antigo = (/tarja-([a-z0-9-]+)-desk\.webm/.exec(bloco) || [])[1] || '?';
const url = (n, e) => `./assets/tarjapopup/tarja-${slug}-${n}${e}`;
const troca = (re, novo, oque) => {
  const achados = bloco.match(new RegExp(re.source, 'g')) || [];
  if (achados.length !== 1) aborta(`index.html: esperava 1 ${oque} no bloco da tarja, achei ${achados.length}`);
  bloco = bloco.replace(re, novo);
};
const D = VARIANTES.desk, M = VARIANTES.mob;
troca(/<source media="\(min-width: 1080px\)" srcset="[^"]*" width="\d+" height="\d+">/, `<source media="(min-width: 1080px)" srcset="${url('desk', '-poster.avif')}" width="${D.w}" height="${D.h}">`, 'pôster desk (<source>)');
troca(/<img decoding="async" width="\d+" height="\d+" src="[^"]*"/, `<img decoding="async" width="${M.w}" height="${M.h}" src="${url('mob', '-poster.avif')}"`, 'pôster mob (<img>)');
for (const [attr, n, e] of [['data-desk-webm', 'desk', '.webm'], ['data-desk-mp4', 'desk', '.mp4'], ['data-mob-webm', 'mob', '.webm'], ['data-mob-mp4', 'mob', '.mp4']]) {
  troca(new RegExp(`${attr}="[^"]*"`), `${attr}="${url(n, e)}"`, attr);
}
html = html.slice(0, ini) + bloco + html.slice(fimBloco);
linha(`tarja: ${antigo} → ${slug} (2 pôsteres com width/height ${D.w}×${D.h} e ${M.w}×${M.h}, 4 data-* do <video>)`);

// contador: só as datas de prazosPromo (regra 5)
let contadorResumo = 'sem "fim" no campanha.json — prazos do contador intocados';
if (campanha.fim) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const re = /(const prazosPromo = \[\r?\n)([\s\S]*?)(\];)/;
  const m = re.exec(html);
  if (!m) aborta('não achei "const prazosPromo = [" no index.html');
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const inicio = campanha.inicio || hoje;
  if (campanha.fim < inicio) aborta(`"fim" (${campanha.fim}) é antes de ${campanha.inicio ? '"inicio"' : 'hoje'} (${inicio})`);
  const dias = [];
  for (let t = Date.parse(inicio + 'T12:00:00Z'); t <= Date.parse(campanha.fim + 'T12:00:00Z'); t += 864e5) dias.push(new Date(t).toISOString().slice(0, 10));
  const novo = dias.map((d) => `  new Date("${d}T23:59:59-03:00"),`).join(eol) + eol;
  if (novo === m[2]) contadorResumo = `prazosPromo já é ${inicio} → ${campanha.fim}`;
  else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tarja-contador-'));
    fs.writeFileSync(path.join(tmp, 'atual'), m[2]);
    fs.writeFileSync(path.join(tmp, 'proposto'), novo);
    const d = rodar('git', ['diff', '--no-index', '--no-color', '-U1', path.join(tmp, 'atual'), path.join(tmp, 'proposto')]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`\n   contador — diff proposto em prazosPromo (${dias.length} prazos diários, ${inicio} → ${campanha.fim}, 23:59:59 -03:00):`);
    console.log(String(d.out).split('\n').filter((l) => /^[-+@ ]/.test(l) && !/^(---|\+\+\+)/.test(l)).map((l) => '     ' + l).join('\n'));
    if (CONTADOR) {
      html = html.replace(re, `$1${novo}$3`);
      contadorResumo = `prazosPromo APLICADO: ${dias.length} prazos, ${inicio} → ${campanha.fim} (lógica intocada)`;
    } else contadorResumo = `prazosPromo NÃO aplicado (diff acima) — rode de novo com --contador para aplicar`;
  }
  linha(contadorResumo);
}
fs.writeFileSync(arqHtml, html);
limpar = () => {
  for (const f of arquivosNovos) fs.rmSync(f, { force: true });
  git('restore', '--staged', '--worktree', '--', 'index.html', 'dist');
  git('clean', '-fdq', '--', 'dist');
  console.error('  (desfeito: arquivos novos removidos, index.html e dist/ de volta ao HEAD)');
};

/* ================================ 4 ================================ */
passo(4, 'build, check e prova');
// comando inteiro numa string: com shell (o npm do Windows é .cmd), args em
// array é depreciado no Node (DEP0190)
const npm = (s) => ({ ok: spawnSync(`npm run ${s}`, { cwd: RAIZ, shell: true, stdio: 'inherit' }).status === 0 });
if (!npm('build').ok) aborta('npm run build falhou — ver acima');
const add = git('add', '-A', '--', 'index.html', 'dist', ...arquivosNovos.map((f) => path.relative(RAIZ, f)));
if (!add.ok) aborta(`git add falhou: ${add.err}`);
if (!npm('check').ok) aborta('npm run check falhou — ver acima');
const rotulo = `tarja-${slug}`;
const prova = rodar(process.execPath, ['scripts/tarja-video-prova.mjs', rotulo, 'tudo', CARGAS], { herda: true });
if (!prova.ok) aborta('a prova da tarja reprovou — ver acima', `shots em shots/tarja-video-${rotulo}/, medidas em medidas/tarja-video-${rotulo}-*.json`);
limpar = null;

/* ================================ 5 ================================ */
passo(5, 'resumo');
console.log('\n   arquivo                                 bytes        peso     parâmetros');
for (const [nome, r] of Object.entries(rel.variantes)) {
  for (const [tipo, extra] of [['webm', `VP9 CRF ${r.webm.crf}`], ['mp4', `H.264 CRF ${r.mp4.crf}`], ['poster', `AVIF q${r.poster.quality}, diff × quadro 0 ${r.poster.diff}%`]]) {
    const f = path.join(ASSETS, `tarja-${slug}-${nome}${tipo === 'poster' ? '-poster.avif' : '.' + tipo}`);
    const b = fs.statSync(f).size;
    linha(`${path.basename(f).padEnd(38)} ${String(b).padStart(7)}  ${kb(b).padStart(9)}   ${extra}`);
  }
  linha(`  ${nome}: ${r.saida.w}×${r.saida.h} ${r.saida.fps} fps, alvo ${VARIANTES[nome].alvoKB} KB | emenda master ${validacao[nome].emendaMaster}% | no .webm: fase ${r.loop.fase.finalX0}%, cheio ${r.loop.cheio.finalX0}% (≤ 1%)`);
}
console.log('\n   index.html (stage):');
const dif = String(git('diff', '--cached', '-U0', '--', 'index.html').out).split('\n').filter((l) => /^[-+]\s/.test(l) && !/^(---|\+\+\+)/.test(l) && l.length < 400);
console.log(dif.map((l) => '     ' + l.trim()).join('\n'));
linha(contadorResumo);

const referenciados = new Set([...html.matchAll(/tarjapopup\/(tarja-[^"']+)/g)].map((m) => m[1]));
const orfaos = fs.readdirSync(ASSETS).filter((f) => /^tarja-.+-(desk|mob)(\.webm|\.mp4|-poster\.avif)$/.test(f) && !referenciados.has(f));
if (orfaos.length) {
  console.log(`\n   arquivos de tarja que o site não usa mais (${orfaos.map((f) => f).join(', ')}).`);
  console.log(`   Para tirar do repo junto: git rm ${orfaos.map((f) => `"assets/tarjapopup/${f}"`).join(' ')}`);
}
console.log(`\n   shots: shots/tarja-video-${rotulo}/ (pôster, vídeo rodando e quadro 0 em 390/1079/1366/1920)`);
console.log(`   medidas: ${path.relative(RAIZ, relatorio)}, medidas/tarja-video-${rotulo}-*.json`);
console.log(`\n✓ pronto para commit (tudo no stage — confira com git status). Sugestão:\n   git commit -m "feat: tarja ${slug} em vídeo"\n   depois: push → TurboCloud + purge → node scripts/producao.mjs https://zero7.com.br/home/`);
