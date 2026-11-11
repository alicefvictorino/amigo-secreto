import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export const BOX = new THREE.BoxGeometry(1, 1, 1);
const matCache = new Map();

export function mat(color, opts = {}) {
  const key = `${color}|${opts.opacity ?? 1}|${opts.emissive ?? ''}|${opts.ei ?? ''}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshLambertMaterial({ color });
  if (opts.opacity !== undefined && opts.opacity < 1) { m.transparent = true; m.opacity = opts.opacity; m.depthWrite = false; }
  if (opts.emissive !== undefined) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.ei ?? 1; }
  matCache.set(key, m);
  return m;
}

// Textura de texto desenhada em canvas (placas, faixas, quadro)
export function textTexture(text, {
  w = 1024, h = 256, bg = '#fff4e0', fg = '#2b1d14', font = 'Fredoka, Arial Rounded MT Bold, Arial, sans-serif',
  weight = 700, size = null, border = null, align = 'center', lineGap = 1.15, chalk = false,
} = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  if (border) { g.strokeStyle = border; g.lineWidth = Math.max(6, h * 0.05); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
  const lines = String(text).split('\n');
  let fs = size || Math.floor(h / (lines.length * lineGap + 0.4));
  g.font = `${weight} ${fs}px ${font}`;
  const maxW = Math.max(...lines.map(l => g.measureText(l).width));
  if (maxW > w * 0.92) { fs = Math.floor(fs * (w * 0.92) / maxW); g.font = `${weight} ${fs}px ${font}`; }
  g.fillStyle = fg;
  g.textAlign = align; g.textBaseline = 'middle';
  const total = lines.length * fs * lineGap;
  lines.forEach((l, i) => {
    const y = h / 2 - total / 2 + fs * lineGap * (i + 0.5);
    const x = align === 'center' ? w / 2 : w * 0.05;
    if (chalk) { g.globalAlpha = 0.9; g.shadowColor = 'rgba(255,255,255,0.4)'; g.shadowBlur = 6; }
    g.fillText(l, x, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------
// Stage: monta uma cena com blocos, colisões e pontos de interação
// ---------------------------------------------------------------
export class Stage {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.colliders = [];
    this.interactables = [];
    this.npcs = [];
    this.updaters = [];
    this.mirrors = [];
    this.disposables = [];
    this.bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
    this.flags = {};
  }

  add(o) { this.root.add(o); return o; }

  box(x, y, z, w, h, d, color, opts = {}) {
    const m = new THREE.Mesh(BOX, mat(color, opts));
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    m.castShadow = opts.cast ?? (h > 0.15);
    m.receiveShadow = true;
    if (opts.rotY) m.rotation.y = opts.rotY;
    (opts.parent || this.root).add(m);
    if (opts.solid) this.solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    return m;
  }

  solid(minX, maxX, minZ, maxZ) {
    const c = { minX, maxX, minZ, maxZ, on: true };
    this.colliders.push(c);
    return c;
  }

  floor(minX, maxX, minZ, maxZ, color, { checker = null, y = 0, tile = 1 } = {}) {
    if (!checker) return this.box((minX + maxX) / 2, y - 0.2, (minZ + maxZ) / 2, maxX - minX, 0.2, maxZ - minZ, color, { cast: false });
    for (let x = minX; x < maxX; x += tile) for (let z = minZ; z < maxZ; z += tile) {
      const odd = (Math.floor((x - minX) / tile) + Math.floor((z - minZ) / tile)) % 2;
      this.box(x + tile / 2, y - 0.2, z + tile / 2, tile, 0.2, tile, odd ? checker : color, { cast: false });
    }
  }

  // paredes de uma sala. gaps: aberturas [de, até] em cada lado. A parede sul (perto da câmera) fica baixa.
  room({ minX, maxX, minZ, maxZ, h = 3.2, color = 0xeee3cf, t = 0.4, gaps = {}, southH = 0.5, trim = null, skip = [] }) {
    const seg = (side, from, to, fixed) => {
      const gs = (gaps[side] || []).slice().sort((a, b) => a[0] - b[0]);
      let cur = from;
      const pieces = [];
      gs.forEach(([a, b]) => { if (a > cur) pieces.push([cur, a]); cur = Math.max(cur, b); });
      if (cur < to) pieces.push([cur, to]);
      pieces.forEach(([a, b]) => {
        const hh = side === 's' ? southH : h;
        if (side === 'n' || side === 's') this.box((a + b) / 2, 0, fixed, b - a, hh, t, color, { solid: true });
        else this.box(fixed, 0, (a + b) / 2, t, hh, b - a, color, { solid: true });
        if (trim && side !== 's') {
          if (side === 'n') this.box((a + b) / 2, 0, fixed + t / 2 + 0.03, b - a, 0.35, 0.06, trim, { cast: false });
          else this.box(fixed + (side === 'w' ? t / 2 + 0.03 : -t / 2 - 0.03), 0, (a + b) / 2, 0.06, 0.35, b - a, trim, { cast: false });
        }
      });
    };
    if (!skip.includes('n')) seg('n', minX, maxX, minZ);
    if (!skip.includes('s')) seg('s', minX, maxX, maxZ);
    if (!skip.includes('w')) seg('w', minZ, maxZ, minX);
    if (!skip.includes('e')) seg('e', minZ, maxZ, maxX);
  }

  // placa/faixa com texto. rotY = 0 olha para +Z (câmera)
  sign(text, x, y, z, w, h, opts = {}) {
    const ratio = w / h;
    const tw = 1024, th = Math.max(64, Math.round(1024 / ratio));
    const tex = textTexture(text, { w: tw, h: th, ...opts });
    this.disposables.push(tex);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: opts.bg === null, toneMapped: false }));
    m.position.set(x, y, z);
    m.rotation.y = opts.rotY || 0;
    if (opts.rotX) m.rotation.x = opts.rotX;
    (opts.parent || this.root).add(m);
    return m;
  }

  mirror(x, y, z, w, h, rotY = 0, renderer = null) {
    const geo = new THREE.PlaneGeometry(w, h);
    const r = new Reflector(geo, {
      clipBias: 0.003,
      textureWidth: Math.round(512 * w / h * (window.devicePixelRatio || 1)),
      textureHeight: Math.round(512 * (window.devicePixelRatio || 1)),
      color: 0xc8d0d8,
    });
    r.position.set(x, y, z);
    r.rotation.y = rotY;
    this.root.add(r);
    // moldura
    const fw = 0.12;
    const frame = new THREE.Group();
    frame.position.copy(r.position); frame.rotation.y = rotY;
    [[0, h / 2 + fw / 2, w + fw * 2, fw], [0, -h / 2 - fw / 2, w + fw * 2, fw], [-w / 2 - fw / 2, 0, fw, h], [w / 2 + fw / 2, 0, fw, h]].forEach(([fx, fy, fw2, fh]) => {
      const b = new THREE.Mesh(BOX, mat(0xb8b8b8)); b.scale.set(fw2, fh, 0.08); b.position.set(fx, fy, -0.02); frame.add(b);
    });
    this.root.add(frame);
    this.mirrors.push(r);
    this.disposables.push(r);
    return r;
  }

  tree(x, z, { h = 3, leaf = 0x3f8f3a, trunk = 0x7a5230, s = 1 } = {}) {
    this.box(x, 0, z, 0.5 * s, h * s, 0.5 * s, trunk, { solid: true });
    this.box(x, h * s - 0.4, z, 2.4 * s, 1.4 * s, 2.4 * s, leaf);
    this.box(x, h * s + 0.9 * s, z, 1.5 * s, 0.9 * s, 1.5 * s, leaf);
  }

  palm(x, z, h = 4.5) {
    for (let i = 0; i < h; i += 0.6) this.box(x + Math.sin(i * 0.5) * 0.25, i, z, 0.4, 0.62, 0.4, 0x9b7b4f, { solid: i === 0 });
    const top = h;
    const cx = x + Math.sin(h * 0.5) * 0.25;
    [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]].forEach(([dx, dz]) => {
      this.box(cx + dx * 1.0, top - 0.1, z + dz * 1.0, 1.4 * Math.abs(dx || 0.4) + 0.3, 0.18, 1.4 * Math.abs(dz || 0.4) + 0.3, 0x2f9e44);
      this.box(cx + dx * 1.7, top - 0.45, z + dz * 1.7, 0.6, 0.18, 0.6, 0x2b8a3e);
    });
    this.box(cx, top - 0.3, z, 0.5, 0.5, 0.5, 0x5c4a2a);
  }

  chair(x, z, rotY = 0, color = 0x8b5a2b) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; this.root.add(g);
    this.box(0, 0.45, 0, 0.7, 0.1, 0.7, color, { parent: g });
    this.box(0, 0.55, -0.3, 0.7, 0.75, 0.1, color, { parent: g });
    [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].forEach(([a, b]) => this.box(a, 0, b, 0.08, 0.45, 0.08, color, { parent: g }));
    this.solid(x - 0.35, x + 0.35, z - 0.35, z + 0.35);
    return g;
  }

  table(x, z, w, d, color = 0x9c6b3c, h = 0.85) {
    this.box(x, h - 0.1, z, w, 0.1, d, color, { solid: true });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => this.box(x + a * (w / 2 - 0.1), 0, z + b * (d / 2 - 0.1), 0.12, h - 0.1, 0.12, color));
  }

  sofa(x, z, w = 3, color = 0x7d5a8c, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; this.root.add(g);
    this.box(0, 0, 0, w, 0.5, 1, color, { parent: g });
    this.box(0, 0.5, -0.4, w, 0.6, 0.25, color, { parent: g });
    this.box(-w / 2 + 0.15, 0.5, 0, 0.3, 0.3, 1, color, { parent: g });
    this.box(w / 2 - 0.15, 0.5, 0, 0.3, 0.3, 1, color, { parent: g });
    const horiz = Math.abs(Math.sin(rotY)) < 0.5;
    if (horiz) this.solid(x - w / 2, x + w / 2, z - 0.5, z + 0.5); else this.solid(x - 0.5, x + 0.5, z - w / 2, z + w / 2);
    return g;
  }

  dispose() {
    this.scene.remove(this.root);
    this.disposables.forEach(d => { try { d.dispose(); } catch (e) { /* */ } });
    this.root.traverse(o => {
      if (o.geometry && o.geometry !== BOX) o.geometry.dispose();
      if (o.material && o.material.map) o.material.map.dispose();
    });
  }
}
