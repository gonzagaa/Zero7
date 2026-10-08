// Reencoda a tarja em vídeo a partir dos masters — reprodutível.
//
//   node scripts/tarja-video.mjs <campanha> [--masters <pasta>] [--so desk|mob]
//                                [--denoise auto|leve|nao] [--analisar]
//
// Entrada: <pasta>/tarja-desktop-master.mp4 e tarja-mobile-master.mp4 (os
// masters do designer, ~CRF 6). Padrão: $TARJA_MASTERS ou
// C:/Users/gusta/Videos/zero7-tarjas/export/master.
// Saída: assets/tarjapopup/tarja-<campanha>-<desk|mob>.webm/.mp4/-poster.avif
// e medidas/tarja-video-encode-<campanha>.json (parâmetros, pesos, diffs).
//
// Regras (lote "tarja em vídeo", out/2026):
//   - 24 fps; VP9 em duas passadas, CRF 34–38 (o menor que caiba no alvo;
//     o mob tem CRF fixo, ver VARIANTES); H.264 de reserva (libx264,
//     CRF 26–30, high, yuv420p, +faststart).
//   - Alvo: desk ≤ 250 KB, mob ≤ 200 KB.
//   - Denoise (hqdn3d fraco) SÓ se o grão domina o peso: em `auto`, mede o
//     mesmo CRF com e sem; entra se cortar ≥ 25% E o alvo não couber sem ele.
//     `--analisar` grava a comparação ampliada em shots/tarja-video/.
//   - Loop: o PERÍODO é medido no master, em escala 1/4 (a fase da animação,
//     sem o grão); emenda, não corta. A régua do vídeo final é o diff do
//     quadro final × quadro 0 ≤ 1% em escala cheia — ela pega também o
//     "pulo" do quadro-chave (o 0 sai mais nítido que o último).
//   - Pôster = quadro 0 EXATO do .webm final, em AVIF; diff ≤ 0,5%.
//   - Nome por campanha: o cache de assets é immutable de 1 ano — nunca
//     reaproveite o nome de uma campanha anterior.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import sharp from 'sharp';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opc = (nome, padrao) => { const i = argv.indexOf(nome); return i >= 0 ? argv.splice(i, 2)[1] : padrao; };
const flag = (nome) => { const i = argv.indexOf(nome); if (i >= 0) { argv.splice(i, 1); return true; } return false; };
const MASTERS = opc('--masters', process.env.TARJA_MASTERS || 'C:/Users/gusta/Videos/zero7-tarjas/export/master');
const SO = opc('--so', null);
const DENOISE = opc('--denoise', 'auto');
const ANALISAR = flag('--analisar');
const campanha = (argv[0] || '').toLowerCase();
if (!/^[a-z0-9-]+$/.test(campanha)) { console.error('uso: node scripts/tarja-video.mjs <campanha> [--masters <pasta>] [--so desk|mob] [--denoise auto|leve|nao] [--analisar]'); process.exit(1); }

const FPS = 24;
const CRF_264 = [26, 27, 28, 29, 30];
const HQDN3D_LEVE = 'hqdn3d=1.5:1.5:3:3';
// Resoluções e alvos decididos medindo (LIBERDADE, out/2026 — ver
// medidas/tarja-video.md):
//  - desk 2370×94 (1,5×): a 3160×126 do master dava 502 KB em CRF 38 e
//    emenda de 1,29%; a 1,5× dá 246 KB e 0,98%. Na tela de 1920 (DPR 1) a
//    tarja é exibida com ≤ 1580 px — sobra resolução.
//  - mob 1040×142 em CRF 38 FIXO (182 KB), alvo revisado para ≤ 200 KB: a
//    728×100 cabia mais perto dos 100 KB, mas borra o texto num iPhone
//    (390 px a 3×). O vídeo do celular só baixa pós-load/idle e em 4g.
const VARIANTES = {
  desk: { master: 'tarja-desktop-master.mp4', w: 2370, h: 94, alvoKB: 250, crfs: [34, 35, 36, 37, 38] },
  mob: { master: 'tarja-mobile-master.mp4', w: 1040, h: 142, alvoKB: 200, crfs: [38] },
};
const DESTINO = path.join(RAIZ, 'assets', 'tarjapopup');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tarja-video-'));

function rodar(bin, args, { binario = false } = {}) {
  const r = spawnSync(bin, args, { maxBuffer: 1 << 30, encoding: binario ? 'buffer' : 'utf8' });
  if (r.status !== 0) throw new Error(`${path.basename(bin)} falhou (${r.status}): ${String(r.stderr).slice(-800)}`);
  return r.stdout;
}

function sondar(arquivo) {
  const j = JSON.parse(rodar(ffprobeStatic.path, ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=width,height,r_frame_rate,nb_read_frames:format=duration', '-of', 'json', arquivo]));
  const s = j.streams[0];
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  return { w: s.width, h: s.height, fps: n / d, quadros: Number(s.nb_read_frames), duracao: Number(j.format.duration) };
}

// quadro n (0-based) de um arquivo, como PNG em memória
const quadro = (arquivo, n, vf = '') => rodar(ffmpeg, ['-v', 'error', '-i', arquivo,
  '-vf', `${vf ? vf + ',' : ''}select=eq(n\\,${n})`, '-vsync', '0', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { binario: true });

async function diffPct(a, b) {
  const [ra, rb] = await Promise.all([sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true }), sharp(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })]);
  if (ra.info.width !== rb.info.width || ra.info.height !== rb.info.height) throw new Error('diff entre tamanhos diferentes');
  let soma = 0;
  for (let i = 0; i < ra.data.length; i++) soma += Math.abs(ra.data[i] - rb.data[i]);
  return +(soma / ra.data.length / 255 * 100).toFixed(3);
}

function cadeia(v, { denoise, duracao }) {
  // o corte do loop (se houver) vem ANTES da troca de fps: é medido no master
  const partes = duracao ? [`trim=duration=${duracao}`, 'setpts=PTS-STARTPTS', `fps=${FPS}`] : [`fps=${FPS}`];
  if (denoise) partes.push(HQDN3D_LEVE);
  const m = v.masterInfo;
  if (m.w !== v.w || m.h !== v.h) {
    // reduz SEM distorcer: cobre o alvo mantendo a proporção do master e o
    // excedente sai num crop centrado. O master mobile é 2082×286 (7,28:1)
    // e o alvo 1040×142 (7,32:1): vira 1040×143 e perde 1 linha. Em 4:4:4
    // durante a escala — altura ímpar no meio da cadeia não esbarra no 4:2:0.
    let sw, sh;
    if (v.w / m.w >= v.h / m.h) { sw = v.w; sh = Math.ceil(m.h * v.w / m.w - 1e-9); }
    else { sh = v.h; sw = Math.ceil(m.w * v.h / m.h - 1e-9); }
    partes.push('format=yuv444p', `scale=${sw}:${sh}:flags=lanczos`);
    if (sw !== v.w || sh !== v.h) partes.push(`crop=${v.w}:${v.h}:${Math.floor((sw - v.w) / 2)}:${Math.floor((sh - v.h) / 2)}`);
  }
  partes.push('format=yuv420p');
  return partes.join(',');
}

function vp9(entrada, saida, crf, vf, nome) {
  const log = path.join(TMP, `vp9-${nome}`);
  const comum = ['-y', '-v', 'error', '-i', entrada, '-vf', vf, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf),
    '-row-mt', '1', '-tile-columns', '2', '-g', '240', '-passlogfile', log];
  rodar(ffmpeg, [...comum, '-pass', '1', '-deadline', 'good', '-cpu-used', '4', '-f', 'null', '-']);
  rodar(ffmpeg, [...comum, '-pass', '2', '-deadline', 'good', '-cpu-used', '1', '-auto-alt-ref', '1', '-lag-in-frames', '25', saida]);
  return fs.statSync(saida).size;
}

function h264(entrada, saida, crf, vf) {
  rodar(ffmpeg, ['-y', '-v', 'error', '-i', entrada, '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(crf),
    '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-g', '240', '-movflags', '+faststart', saida]);
  return fs.statSync(saida).size;
}

// o menor CRF da faixa que caiba no alvo; nenhum coube, fica o maior
function escolherCrf(faixaCrf, encoder, alvoBytes) {
  const tentativas = [];
  for (const crf of faixaCrf) {
    const bytes = encoder(crf);
    tentativas.push({ crf, kb: +(bytes / 1024).toFixed(1) });
    if (bytes <= alvoBytes) return { crf, bytes, coube: true, tentativas };
  }
  const ult = tentativas.at(-1);
  return { crf: ult.crf, bytes: ult.kb * 1024, coube: false, tentativas };
}

// Todos os quadros de um vídeo, em RGB cru, na escala pedida. Reduzido
// (escala 1/4), o grão some na média e sobra a FASE da animação — é o que diz
// se o loop emenda. Em escala cheia entra o grão e a diferença de compressão
// entre o quadro-chave (o 0, mais nítido) e o último.
function quadrosCrus(arquivo, w, h) {
  const raw = rodar(ffmpeg, ['-v', 'error', '-i', arquivo, '-vf', `scale=${w}:${h}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { binario: true });
  const t = w * h * 3;
  return { n: Math.floor(raw.length / t), q: (i) => raw.subarray(i * t, (i + 1) * t) };
}
const maeCru = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255 * 100; };
const mediana = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };

// Período do loop, medido no MASTER (fase, escala 1/4). Emenda se o último
// quadro está tão perto do 0 quanto um passo normal (≤ 1,5× a mediana);
// senão, o período é o quadro (depois do 1º segundo) mais parecido com o 0.
function loopDoMaster(entrada, m) {
  const { n, q } = quadrosCrus(entrada, Math.round(m.w / 4), Math.round(m.h / 4));
  const passos = [];
  for (let i = 1; i < n; i++) passos.push(maeCru(q(i - 1), q(i)));
  const passo = mediana(passos);
  const final = maeCru(q(n - 1), q(0));
  if (final <= passo * 1.5) return { emenda: true, passo: +passo.toFixed(3), finalX0: +final.toFixed(3), duracao: null };
  let melhor = null;
  for (let i = Math.round(m.fps); i < n; i++) { const d = maeCru(q(i), q(0)); if (!melhor || d < melhor.d) melhor = { i, d }; }
  return { emenda: false, passo: +passo.toFixed(3), finalX0: +final.toFixed(3), periodoQuadros: melhor.i, duracao: +(melhor.i / m.fps).toFixed(4) };
}

// Conferência no vídeo final: fase (a animação emenda?) e escala cheia (a
// régua de ≤ 1% do lote, que também pega o "pulo" do quadro-chave).
function emenda(arquivo, w, h) {
  const out = {};
  for (const [nome, ew, eh] of [['fase', Math.round(w / 4), Math.round(h / 4)], ['cheio', w, h]]) {
    const { n, q } = quadrosCrus(arquivo, ew, eh);
    const passos = [0.2, 0.4, 0.6, 0.8].map((f) => Math.floor((n - 1) * f)).map((k) => maeCru(q(k), q(k + 1)));
    out[nome] = { finalX0: +maeCru(q(n - 1), q(0)).toFixed(3), passo: +mediana(passos).toFixed(3) };
    out.quadros = n;
  }
  return out;
}

async function comparacaoDenoise(v, nome) {
  // mesmo quadro (o do meio), com e sem denoise, recorte central ampliado 3×
  const pasta = path.join(RAIZ, 'shots', 'tarja-video');
  fs.mkdirSync(pasta, { recursive: true });
  const n = Math.floor(v.masterInfo.quadros * FPS / v.masterInfo.fps / 2);
  const recorteW = Math.min(v.w, nome === 'desk' ? 700 : 420);
  const recorte = async (png) => sharp(await sharp(png).extract({ left: Math.floor((v.w - recorteW) / 2), top: 0, width: recorteW, height: v.h }).toBuffer())
    .resize({ width: recorteW * 3, kernel: 'nearest' }).png().toBuffer();
  const sem = await recorte(quadro(path.join(TMP, `${nome}-sem.webm`), n));
  const com = await recorte(quadro(path.join(TMP, `${nome}-com.webm`), n));
  const alt = v.h * 3;
  const arquivo = path.join(pasta, `denoise-${campanha}-${nome}.png`);
  await sharp({ create: { width: recorteW * 3, height: alt * 2 + 12, channels: 3, background: '#808080' } })
    .composite([{ input: sem, top: 0, left: 0 }, { input: com, top: alt + 12, left: 0 }]).png().toFile(arquivo);
  return path.relative(RAIZ, arquivo);
}

async function posterDe(webm, saidaAvif) {
  const q0 = quadro(webm, 0);
  for (const quality of [60, 65, 70, 75, 80, 85, 90]) {
    const avif = await sharp(q0).avif({ quality, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer();
    const d = await diffPct(await sharp(avif).png().toBuffer(), q0);
    if (d <= 0.5) { fs.writeFileSync(saidaAvif, avif); return { quality, kb: +(avif.length / 1024).toFixed(1), diff: d }; }
  }
  throw new Error('pôster não chegou a diff ≤ 0,5% nem com quality 90');
}

const relatorio = { campanha, masters: MASTERS, fps: FPS, hqdn3d: HQDN3D_LEVE, variantes: {} };

for (const [nome, v] of Object.entries(VARIANTES)) {
  if (SO && SO !== nome) continue;
  const entrada = path.join(MASTERS, v.master);
  v.masterInfo = sondar(entrada);
  const alvo = v.alvoKB * 1024;
  const base = `tarja-${campanha}-${nome}`;
  const webm = path.join(DESTINO, `${base}.webm`);
  const mp4 = path.join(DESTINO, `${base}.mp4`);
  const avif = path.join(DESTINO, `${base}-poster.avif`);
  console.log(`\n== ${nome}: master ${v.masterInfo.w}×${v.masterInfo.h} ${v.masterInfo.fps}fps ${v.masterInfo.quadros} quadros → ${v.w}×${v.h} ${FPS}fps, alvo ${v.alvoKB} KB`);

  // 1) denoise: decide medindo, no CRF do meio da faixa
  let denoise = DENOISE === 'leve';
  let decisaoDenoise = DENOISE;
  if (DENOISE === 'auto' || ANALISAR) {
    const crfTeste = 36;
    const sem = vp9(entrada, path.join(TMP, `${nome}-sem.webm`), crfTeste, cadeia(v, { denoise: false }), `${nome}-sem`);
    const com = vp9(entrada, path.join(TMP, `${nome}-com.webm`), crfTeste, cadeia(v, { denoise: true }), `${nome}-com`);
    const corte = 1 - com / sem;
    const comparacao = await comparacaoDenoise(v, nome);
    if (DENOISE === 'auto') {
      denoise = corte >= 0.25 && sem > alvo; // grão domina E o alvo não cabe sem ele
      decisaoDenoise = `auto: CRF ${crfTeste} sem ${(sem / 1024).toFixed(0)} KB × com ${(com / 1024).toFixed(0)} KB (−${(corte * 100).toFixed(0)}%) → ${denoise ? 'COM' : 'SEM'} denoise`;
    }
    v.denoiseTeste = { crf: crfTeste, semKB: +(sem / 1024).toFixed(1), comKB: +(com / 1024).toFixed(1), cortePct: +(corte * 100).toFixed(1), comparacao };
    console.log(`   denoise: ${decisaoDenoise} | comparação ampliada: ${comparacao}`);
  }

  // 2) loop: período medido no master; corta só se ele não emendar
  const loop = loopDoMaster(entrada, v.masterInfo);
  console.log(`   loop do master: último×0 ${loop.finalX0}% × passo ${loop.passo}% → ${loop.emenda ? 'emenda, sem corte' : `NÃO emenda: período ${loop.periodoQuadros} quadros (${loop.duracao}s), corta aí`}`);

  // 3) VP9: o menor CRF da faixa que caiba no alvo
  const vfFinal = cadeia(v, { denoise, duracao: loop.duracao });
  const r9 = escolherCrf(v.crfs, (crf) => vp9(entrada, webm, crf, vfFinal, nome), alvo);
  const costura = { master: loop, ...emenda(webm, v.w, v.h) };
  console.log(`   VP9: CRF ${r9.crf} → ${(r9.bytes / 1024).toFixed(1)} KB ${r9.coube ? '✓' : 'ACIMA DO ALVO'} | tentativas ${r9.tentativas.map((t) => `${t.crf}:${t.kb}KB`).join(' ')}`);
  console.log(`   emenda no .webm (${costura.quadros} quadros): fase ${costura.fase.finalX0}% (passo ${costura.fase.passo}%) | cheio ${costura.cheio.finalX0}% (passo ${costura.cheio.passo}%) ${costura.cheio.finalX0 <= 1 ? '✓ ≤ 1%' : '— ACIMA de 1%'}`);

  // 3) H.264 de reserva, mesma cadeia
  const r264 = escolherCrf(CRF_264, (crf) => h264(entrada, mp4, crf, vfFinal), alvo);
  console.log(`   H.264: CRF ${r264.crf} → ${(r264.bytes / 1024).toFixed(1)} KB ${r264.coube ? '✓' : 'ACIMA DO ALVO'} | tentativas ${r264.tentativas.map((t) => `${t.crf}:${t.kb}KB`).join(' ')}`);

  // 4) pôster = quadro 0 do webm final
  const poster = await posterDe(webm, avif);
  const diffMp4 = await diffPct(quadro(mp4, 0), quadro(webm, 0));
  console.log(`   pôster: AVIF q${poster.quality} ${poster.kb} KB, diff × quadro 0 = ${poster.diff}% | quadro 0 mp4 × webm = ${diffMp4}%`);

  relatorio.variantes[nome] = {
    master: { arquivo: v.master, ...v.masterInfo }, saida: { w: v.w, h: v.h, fps: FPS },
    filtro: vfFinal, denoise: { usado: denoise, decisao: decisaoDenoise, teste: v.denoiseTeste || null },
    webm: { arquivo: path.relative(RAIZ, webm), crf: r9.crf, kb: +(r9.bytes / 1024).toFixed(1), noAlvo: r9.coube, tentativas: r9.tentativas },
    mp4: { arquivo: path.relative(RAIZ, mp4), crf: r264.crf, kb: +(r264.bytes / 1024).toFixed(1), noAlvo: r264.coube, tentativas: r264.tentativas },
    poster: { arquivo: path.relative(RAIZ, avif), ...poster, diffQuadro0Mp4xWebm: diffMp4 },
    loop: costura,
  };
}

fs.rmSync(TMP, { recursive: true, force: true });
const arqRel = path.join(RAIZ, 'medidas', `tarja-video-encode-${campanha}.json`);
fs.writeFileSync(arqRel, JSON.stringify(relatorio, null, 1));
console.log(`\nrelatório: ${path.relative(RAIZ, arqRel)}`);
