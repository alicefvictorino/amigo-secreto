// Mosaico de fotos do final: as imagens entram no build como data URL (se existirem em assets/mosaico/).
import f01 from '../assets/mosaico/01.jpg';
import f02 from '../assets/mosaico/02.jpg';
import f03 from '../assets/mosaico/03.jpg';
import f04 from '../assets/mosaico/04.jpg';
import f05 from '../assets/mosaico/05.jpg';
import f06 from '../assets/mosaico/06.jpg';
import f07 from '../assets/mosaico/07.jpg';
import f08 from '../assets/mosaico/08.jpg';
import f09 from '../assets/mosaico/09.jpg';
import f10 from '../assets/mosaico/10.jpg';
import f11 from '../assets/mosaico/11.jpg';
import f12 from '../assets/mosaico/12.jpg';
import f13 from '../assets/mosaico/13.jpg';
import f14 from '../assets/mosaico/14.jpg';
import f15 from '../assets/mosaico/15.jpg';
import f16 from '../assets/mosaico/16.jpg';
import f17 from '../assets/mosaico/17.jpg';
import f18 from '../assets/mosaico/18.jpg';

// [foto, proporção largura/altura], na ordem em que aparecem
const FOTOS = [
  [f01, 1.3333],
  [f04, 0.5625],
  [f09, 1.7778],
  [f13, 1.3333],
  [f07, 0.5625],
  [f06, 1.3333],
  [f14, 1.3333],
  [f10, 0.7500],
  [f03, 1.3333],
  [f12, 1.3333],
  [f18, 0.7500],
  [f08, 1.3333],
  [f11, 1.3333],
  [f05, 0.5625],
  [f15, 1.7225],
  [f02, 1.3333],
  [f17, 0.7500],
  [f16, 1.3333],
].filter(([src]) => src);

export const temMosaico = () => FOTOS.length > 0;

export function mosaicoHTML(titulo) {
  const tiles = FOTOS.map(([src], i) => {
    const r = (((i * 37) % 9) - 4) * 0.35;
    return `<figure class="mz-tile" style="--d:${(0.15 + i * 0.17).toFixed(2)}s;--r:${r.toFixed(2)}deg;--kb:${(9 + (i % 5) * 1.3).toFixed(1)}s"><img src="${src}" alt=""></figure>`;
  }).join('');
  return `<div class="mz-bg"></div><div class="mz-title" style="--d:${(0.4 + FOTOS.length * 0.17).toFixed(2)}s">${titulo}</div><div id="mosaico">${tiles}</div>`;
}

// distribui as fotos em fileiras justificadas que preenchem a tela, sem cortar ninguém
export function montarMosaico() {
  const box = document.getElementById('mosaico');
  if (!box) return;
  const W = box.clientWidth, H = box.clientHeight, GAP = Math.max(6, Math.round(W * 0.007));
  const a = FOTOS.map(f => f[1]), n = a.length;
  let best = null;
  for (let k = 1; k <= Math.min(6, n); k++) {
    // partição linear: k fileiras contíguas com somas de proporção parecidas
    const pre = [0]; a.forEach(x => pre.push(pre[pre.length - 1] + x));
    const target = pre[n] / k;
    const cost = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(Infinity));
    const cut = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(0));
    cost[0][0] = 0;
    for (let r = 1; r <= k; r++) for (let j = r; j <= n; j++) for (let i = r - 1; i < j; i++) {
      const c = cost[r - 1][i] + (pre[j] - pre[i] - target) ** 2;
      if (c < cost[r][j]) { cost[r][j] = c; cut[r][j] = i; }
    }
    const rows = []; let j = n;
    for (let r = k; r >= 1; r--) { const i = cut[r][j]; rows.unshift([i, j]); j = i; }
    const hs = rows.map(([i, j2]) => (W - GAP * (j2 - i - 1)) / (pre[j2] - pre[i]));
    const total = hs.reduce((s, h) => s + h, 0) + GAP * (k - 1);
    const s = Math.min(1, H / total);
    const score = Math.abs(total * s - H) + (s < 1 ? (1 - s) * H * 0.6 : 0);
    if (!best || score < best.score) best = { rows, hs, s, total, score };
  }
  const { rows, hs, s, total } = best;
  const tiles = box.querySelectorAll('.mz-tile');
  let y = (H - total * s) / 2;
  rows.forEach(([i, j], r) => {
    const h = hs[r] * s;
    const rowW = (W - GAP * (j - i - 1)) * s + GAP * (j - i - 1);
    let x = (W - rowW) / 2;
    for (let t = i; t < j; t++) {
      const w = a[t] * hs[r] * s;
      Object.assign(tiles[t].style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      x += w + GAP;
    }
    y += h + GAP;
  });
}
