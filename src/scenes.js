import * as THREE from 'three';
import { mat, BOX } from './world.js';
import { makeCat } from './chars.js';
import fotoMelhores from '../assets/melhores-grupo.jpg';
import { SECRET_NAME, SECRET_KEY } from './secret.js';

// =====================================================================
// LISTA DO AMIGO SECRETO (quem pode ser o boneco)
// Coringas: aparecem livremente e não entram na lista.
// =====================================================================
export const CANDIDATES = [
  { key: 'analuz', name: 'Analuz', art: 'a' },
  { key: 'breno', name: 'Breno', art: 'o' },
  { key: 'dudao', name: 'Dudão', art: 'a' },
  { key: 'flora', name: 'Flora', art: 'a' },
  { key: 'hanna', name: 'Hanna', art: 'a' },
  { key: SECRET_KEY, name: SECRET_NAME, art: 'o' },
  { key: 'nala', name: 'Nala', art: 'a' },
  { key: 'nanda', name: 'Nanda', art: 'a' },
];

const FARDA = { shirt: 0xf7f7f7, pants: 0x1f3a5f }; // PROVISÓRIO: cores da farda

// ---------------------------------------------------------------------
// utilidades
// ---------------------------------------------------------------------
function lights(st, { sky = 0xffffff, ground = 0xb9a68a, hemi = 1.7, sun = 1.6, sunColor = 0xfff2dd, sunPos = [8, 18, 10], shadow = 22, follow = false } = {}) {
  const h = new THREE.HemisphereLight(sky, ground, hemi);
  st.add(h);
  const d = new THREE.DirectionalLight(sunColor, sun);
  d.position.set(...sunPos);
  d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048);
  const c = d.shadow.camera;
  c.left = -shadow; c.right = shadow; c.top = shadow; c.bottom = -shadow; c.near = 1; c.far = 90;
  d.shadow.bias = -0.0004; d.shadow.normalBias = 0.03;
  st.add(d); st.add(d.target);
  if (follow) {
    st.updaters.push(() => {
      const pl = st.engine?.player;
      if (!pl) return;
      const p = pl.root.position;
      d.target.position.set(p.x, 0, p.z);
      d.position.set(p.x + sunPos[0], sunPos[1], p.z + sunPos[2]);
    });
  }
  return { h, d };
}

function point(st, x, y, z, color, intensity = 6, dist = 12) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6);
  l.position.set(x, y, z);
  st.add(l);
  return l;
}

function rope(st, a, b, t = 0.06, color = 0x6b4a2b) {
  const m = new THREE.Mesh(BOX, mat(color));
  m.scale.set(t, t, a.distanceTo(b));
  m.position.copy(a).lerp(b, 0.5);
  m.lookAt(b);
  m.castShadow = true;
  st.add(m);
  return m;
}

function balloon(st, x, z, color, y = 2.6) {
  st.box(x, y, z, 0.55, 0.65, 0.55, color);
  rope(st, new THREE.Vector3(x, y, z), new THREE.Vector3(x + 0.1, 0.9, z + 0.1), 0.02, 0xdddddd);
}

function stringLights(st, x1, x2, z, y, colors = [0xffd36b, 0xff6b6b, 0x6bd3ff, 0x9bff6b]) {
  rope(st, new THREE.Vector3(x1, y, z), new THREE.Vector3(x2, y, z), 0.03, 0x333333);
  let i = 0;
  for (let x = x1 + 0.3; x < x2; x += 0.7) {
    const c = colors[i++ % colors.length];
    st.box(x, y - 0.18, z, 0.14, 0.18, 0.14, c, { emissive: c, ei: 1.5, cast: false });
  }
}

function bandeirinhas(st, x1, x2, z, y) {
  rope(st, new THREE.Vector3(x1, y, z), new THREE.Vector3(x2, y, z), 0.03, 0x222222);
  const cols = [0xff3b3b, 0xffd23f, 0x3bceac, 0x3d5af1, 0xff7f11, 0xee4266];
  let i = 0;
  for (let x = x1 + 0.3; x < x2; x += 0.6) {
    const m = st.box(x, y - 0.45, z, 0.32, 0.32, 0.03, cols[i++ % cols.length], { cast: false });
    m.rotation.z = Math.PI / 4;
  }
}

function deskWithChair(st, x, z) {
  st.box(x, 0.72, z - 0.35, 1.0, 0.08, 0.6, 0xc8a26e, { solid: true });
  st.box(x, 0, z - 0.35, 0.08, 0.72, 0.08, 0x555555);
  st.box(x - 0.2, 0.42, z + 0.25, 0.5, 0.08, 0.5, 0x2f6fae);
  st.box(x - 0.2, 0.5, z + 0.5, 0.5, 0.55, 0.06, 0x2f6fae);
  st.box(x - 0.2, 0, z + 0.25, 0.06, 0.42, 0.06, 0x555555);
}


// tela da TV: slide do Melhores Chapa 2024 (cortina vermelha e letreiro de lâmpadas)
function melhoresTV() {
  const W = 1024, H = 576;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  for (let x = 0; x < W; x += 32) { g.fillStyle = (x / 32) % 2 ? '#a3121a' : '#7e0c12'; g.fillRect(x, 0, 32, H); }
  const grad = g.createRadialGradient(W / 2, H * 0.1, 10, W / 2, H * 0.4, W * 0.6);
  grad.addColorStop(0, 'rgba(255,240,200,0.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const fx = 150, fy = 110, fw = W - 300, fh = 330, r = 50;
  g.lineWidth = 16; g.strokeStyle = '#ffb02e';
  g.beginPath(); g.roundRect(fx, fy, fw, fh, r); g.stroke();
  g.fillStyle = 'rgba(80,0,8,0.35)'; g.fill();
  g.fillStyle = '#fff2b0';
  for (let i = 0; i < 44; i++) {
    const t = i / 44, per = 2 * (fw + fh);
    let d = t * per, x, y;
    if (d < fw) { x = fx + d; y = fy; } else if ((d -= fw) < fh) { x = fx + fw; y = fy + d; } else if ((d -= fh) < fw) { x = fx + fw - d; y = fy + fh; } else { d -= fw; x = fx; y = fy + fh - d; }
    g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
  }
  const font = 'Fredoka, Arial Rounded MT Bold, Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 26px ${font}`; g.fillStyle = '#ffffff'; g.fillText('FUBANGA CERIMONIAIS', W / 2, 70);
  g.font = `italic 700 70px ${font}`; g.lineWidth = 8; g.strokeStyle = '#7e0c12'; g.strokeText('Melhores', W / 2 - 120, 185); g.fillStyle = '#ffd36b'; g.fillText('Melhores', W / 2 - 120, 185);
  g.font = `700 150px ${font}`; g.lineWidth = 14; g.strokeStyle = '#ffd36b'; g.strokeText('CHAPA', W / 2, 315); g.fillStyle = '#e8262e'; g.fillText('CHAPA', W / 2, 315);
  g.font = `700 54px ${font}`; g.fillStyle = '#ffd36b'; g.fillText('2024', W / 2 + 250, 405);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// =====================================================================
// PRÓLOGO: banheiro escuro, o espelho sem rosto
// =====================================================================
export function buildPrologue(st, api) {
  st.engine = api;
  st.floor(-3.2, 3.2, -2.6, 2.6, 0xd8dde3, { checker: 0xc3cad3, tile: 0.8 });
  st.room({ minX: -3.2, maxX: 3.2, minZ: -2.6, maxZ: 2.6, h: 3.4, color: 0x9fb3c2, southH: 0.4 });
  // pia e espelho
  st.box(0, 0, -2.05, 1.6, 0.9, 0.7, 0xf2f2f2, { solid: true });
  st.box(0, 0.86, -2.05, 0.6, 0.06, 0.4, 0xb8c4cf);
  st.box(0, 0.95, -2.3, 0.08, 0.3, 0.08, 0x9a9a9a);
  st.mirror(0, 2.05, -2.37, 1.9, 1.5, 0);
  st.box(2.4, 0, -1.9, 0.8, 0.5, 0.9, 0xf7f7f7, { solid: true }); // vaso
  st.box(2.4, 0.5, -2.25, 0.8, 0.6, 0.25, 0xf7f7f7);

  const hemi = new THREE.HemisphereLight(0x6b7a99, 0x1a1a22, 0.25);
  st.add(hemi);
  const lamp = point(st, 0, 2.95, -1.75, 0xfff0d0, 0, 10);
  st.box(0, 2.9, -2.3, 1.2, 0.14, 0.18, 0xfff7e0, { emissive: 0xfff2c4, ei: 0.4, cast: false });
  const fill = point(st, 1.5, 2.4, 1.5, 0x8899cc, 0, 8);

  return {
    bounds: { minX: -3, maxX: 3, minZ: -2.4, maxZ: 2.4 },
    spawn: { x: -0.35, z: -0.9, rot: Math.PI },
    background: 0x050508,
    run: async () => {
      api.state.cutscene++;
      await api.camTo(new THREE.Vector3(1.5, 2.5, 2.4), new THREE.Vector3(-0.1, 1.9, -2.3), 10);
      api.sfx.pad();
      await api.narrate([
        'Tem dias que pesam mais que os outros.',
        'Nesses dias, a gente segura as pontas, sorri mesmo assim e segue em frente.',
        'Só que, de tanto segurar, às vezes a gente esquece de se olhar.',
        async () => {
          // a luz acende devagar, piscando
          for (let i = 0; i < 4; i++) { lamp.intensity = 4; await api.wait(90); lamp.intensity = 0; await api.wait(140); }
          fill.intensity = 1.5;
          await api.tween(lamp, { intensity: 7 }, 900);
          await api.camTo(new THREE.Vector3(1.25, 2.35, 1.3), new THREE.Vector3(-0.2, 1.9, -2.3), 2400);
        },
        'Um dia, me olhei no espelho e não me encontrei.',
        'Dizem que a gente deixa um pouco de si em cada lugar onde foi feliz, e em cada pessoa que estava lá.',
        'Então é pra lá que eu vou.',
      ]);
      api.sfx.door();
      api.state.cutscene--;
    },
  };
}

// =====================================================================
// CORREDOR DAS MEMÓRIAS: portas com anos
// =====================================================================
const DOOR_X = (i) => 7 + i * 7;

export function buildCorridor(st, api, { next, completed, memories, onEnter }) {
  st.engine = api;
  const n = memories.length;
  const len = DOOR_X(n - 1) + 6;
  const progress = completed.size / n;
  const wallCol = new THREE.Color(0x5d6372).lerp(new THREE.Color(0xf1e3c8), progress).getHex();
  const floorA = new THREE.Color(0x3d4150).lerp(new THREE.Color(0xc9a77c), progress).getHex();
  const floorB = new THREE.Color(0x353845).lerp(new THREE.Color(0xb8956a), progress).getHex();

  st.floor(-2, len, -3.2, 3.2, floorA, { checker: floorB, tile: 1.6 });
  st.room({ minX: -2, maxX: len, minZ: -3.2, maxZ: 3.2, h: 4.2, color: wallCol, southH: 0.45, trim: 0xd7372f });
  lights(st, { hemi: 0.7 + progress * 1.2, sun: 0.5 + progress, sky: 0xdfe6ff, ground: 0x2a2a35, shadow: 14, follow: true, sunPos: [4, 14, 8] });

  // placa do início
  st.sign('CORREDOR DAS MEMÓRIAS', 2.2, 3.3, -2.97, 4.2, 0.7, { bg: '#2b1d14', fg: '#fff4e0' });

  memories.forEach((m, i) => {
    const x = DOOR_X(i);
    const isDone = completed.has(m.id);
    const isNext = i === next;
    const frameCol = isDone ? m.color : isNext ? 0xffd36b : 0x3a3d48;
    const fopts = isNext ? { emissive: 0xffc23a, ei: 1.2 } : {};
    st.box(x - 1.05, 0, -2.85, 0.25, 3.0, 0.3, frameCol, fopts);
    st.box(x + 1.05, 0, -2.85, 0.25, 3.0, 0.3, frameCol, fopts);
    st.box(x, 3.0, -2.85, 2.35, 0.25, 0.3, frameCol, fopts);
    const panelCol = isDone ? 0x8a5a3c : isNext ? 0xfff0c8 : 0x26282f;
    const panel = st.box(x, 0, -2.92, 1.85, 3.0, 0.1, panelCol, isNext ? { emissive: 0xffe6a0, ei: 0.6 } : {});
    if (isDone) { panel.rotation.y = -0.9; panel.position.x -= 0.55; panel.position.z += 0.4; }
    // placa do ano
    const label = m.door;
    st.sign(label, x, 3.75, -2.95, 1.6, 0.6, { bg: isNext ? '#d7372f' : isDone ? '#2f7a4e' : '#2b2d36', fg: isNext || isDone ? '#fff4e0' : '#8a8d99' });
    if (isDone) st.sign(m.title, x, 0.35, -2.4, 2.2, 0.4, { bg: '#fff4e0', fg: '#2b1d14', rotX: -0.6 });
    if (isNext) {
      const l = point(st, x, 2.2, -1.6, 0xffd36b, 8, 9);
      st.updaters.push((dt, t) => { l.intensity = 6 + Math.sin(t * 3) * 2; });
    }
    api.interact({
      x, z: -2.2, r: 1.9, h: 3.3, once: false,
      label: isNext ? `Entrar (${label})` : isDone ? 'Memória recuperada' : 'Trancada',
      onInteract: async () => {
        if (isNext) { await onEnter(i); return; }
        if (isDone) await api.thought('Essa memória eu já recuperei.');
        else await api.thought('Ainda não consigo abrir essa porta.');
      },
    });
  });

  // arandelas na parede entre as portas
  for (let i = 0; i < n; i++) {
    const x = DOOR_X(i) + 3.5;
    st.box(x, 2.6, -2.9, 0.5, 0.5, 0.25, 0xfff7e0, { emissive: 0xfff2c4, ei: 0.4 + progress, cast: false });
  }

  const first = completed.size === 0 && next === 0;
  const spawnX = first ? 0.5 : DOOR_X(Math.max(0, next - 1));
  return {
    bounds: { minX: -1.8, maxX: len - 0.2, minZ: -2.7, maxZ: 2.9 },
    spawn: first ? { x: 0.5, z: 0.5, rot: Math.PI / 2 } : { x: spawnX, z: -1.4, rot: 0 },
    camOffset: new THREE.Vector3(0, 7.5, 10.5),
    camLook: new THREE.Vector3(0, 1.4, -0.8),
    camClamp: { minX: 4, maxX: len - 6, minZ: 0, maxZ: 0 },
    background: new THREE.Color(0x101018).lerp(new THREE.Color(0xfff4e0), progress * 0.6).getHex(),
  };
}

// =====================================================================
// AS MEMÓRIAS (na ordem do jogo)
// =====================================================================
export const MEMORIES = [
  // -------------------------------------------------------------------
  {
    id: 'melhores', door: '2024', title: 'Melhores do Ano', place: 'Casa de Lísis', color: 0xd7372f,
    eliminates: ['hanna', 'analuz'],
    build(st, api) {
      st.engine = api;
      const X = 6, Z = 3;
      st.floor(-X, X, -Z, Z, 0xdcd5c8, { checker: 0xd2cabc, tile: 1 });
      st.room({ minX: -X, maxX: X, minZ: -Z, maxZ: Z, h: 3.2, color: 0xf1ede6 });
      lights(st, { hemi: 1.0, sun: 0.7, shadow: 10 });
      const tvGlow = point(st, 0, 2.0, -1.4, 0xff3b30, 8, 10);
      point(st, -3, 2.8, 1.5, 0xffe2b0, 3, 9);
      point(st, 3, 2.8, 1.5, 0xffe2b0, 3, 9);
      st.updaters.push((dt, t) => { tvGlow.intensity = 7 + Math.sin(t * 2.2) * 1.5; });

      // parede da TV: painel de madeira, rack, TV com o slide do Melhores, espelhos do chão ao teto
      st.box(0, 0, -2.75, 5.0, 3.2, 0.1, 0x5a3e2b);
      st.box(0, 0, -2.42, 4.4, 0.5, 0.65, 0x3d2a1e, { solid: true });
      st.box(0, 0.5, -2.62, 3.75, 2.15, 0.1, 0x111111);
      const tvTex = melhoresTV();
      st.disposables.push(tvTex);
      const tv = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.03), new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false }));
      tv.position.set(0, 1.58, -2.56); st.add(tv);
      [1.4, 1.7, 2.0].forEach(x => { st.box(x, 0.5, -2.3, 0.04, 0.24, 0.04, 0x2f5fd0); st.box(x, 0.5, -2.24, 0.16, 0.16, 0.03, 0xf2c230, { emissive: 0x8a6a00, ei: 0.4 }); });
      st.mirror(-4.15, 1.55, -2.78, 3.0, 2.95, 0);
      st.mirror(4.15, 1.55, -2.78, 3.0, 2.95, 0);

      // presentes no canto
      const gift = (x, z, w, h, d, c, r) => { st.box(x, 0, z, w, h, d, c); st.box(x, 0, z, 0.08, h + 0.02, d + 0.02, r, { cast: false }); st.box(x, 0, z, w + 0.02, h + 0.02, 0.08, r, { cast: false }); st.box(x, h, z, 0.24, 0.1, 0.24, r); };
      gift(-5.3, -2.3, 0.6, 0.55, 0.6, 0xd7372f, 0x2f9e44);
      gift(-4.55, -2.4, 0.45, 0.4, 0.45, 0x2f9e44, 0xd7372f);
      gift(-5.0, -1.75, 0.55, 0.35, 0.4, 0xffffff, 0xd7372f);
      st.solid(-5.8, -4.25, -2.8, -1.5);

      // parede oeste: porta de correr marrom com ar-condicionado em cima
      const doorL = st.box(-5.74, 0, -0.8, 0.07, 2.7, 1.6, 0x7b4426);
      st.box(-5.74, 0, 0.8, 0.07, 2.7, 1.6, 0x6f3d22);
      st.box(-5.68, 0.8, -0.2, 0.04, 1.1, 0.05, 0xd8d8d8);
      st.box(-5.68, 0.8, 0.2, 0.04, 1.1, 0.05, 0xd8d8d8);
      st.box(-5.62, 2.7, 0, 0.3, 0.38, 1.4, 0xffffff);
      st.box(-5.46, 2.75, 0, 0.02, 0.05, 1.25, 0x9a9a9a, { cast: false });

      // parede leste: janela com cortinas bege e os puffs
      st.box(5.77, 0.8, 0, 0.04, 1.8, 2.8, 0x1a2a4a, { emissive: 0x0d1830, ei: 0.6, cast: false });
      [[-2.1, 1.2], [2.1, 1.2]].forEach(([z, w]) => {
        st.box(5.62, 0.05, z, 0.14, 2.95, w, 0xd9c6a2);
        for (let k = -1; k <= 1; k++) st.box(5.53, 0.05, z + k * w / 3, 0.05, 2.95, 0.1, 0xc9b48e, { cast: false });
      });
      st.box(5.58, 2.95, 0, 0.18, 0.22, 5.6, 0xd9c6a2);
      const puff = (x, z) => { st.box(x, 0, z, 1.1, 0.4, 1.1, 0x2e2e38, { solid: true }); st.box(x, 0.4, z, 0.95, 0.16, 0.95, 0x34343f); st.box(x + 0.4, 0.4, z, 0.3, 0.5, 0.95, 0x34343f); };
      puff(4.85, -1.35);
      puff(4.85, 1.35);

      // sofá (de frente para a TV) e a cadeira de sala de jantar
      st.sofa(0.3, 2.25, 5.4, 0xe7e1d5, Math.PI);
      st.chair(-4.4, 1.9, 0.8, 0x6b4a2b);

      // quem pode ser identificado nesta cena
      const alice = api.npc('alice', 0.9, -1.35, {
        look: { shirt: 0xd7372f, skirt: 0xd7372f, pattern: 'leaf', sleeveless: true }, extras: ['mic', 'santahat'],
        ambient: 'E o prêmio vai para...',
      });
      api.npc('lisis', -4.4, 1.9, {
        sit: true, y: 0.1, rot: 0.8, ambient: 'Scout fugiu...', ambientR: 3.2,
        look: { shirt: 0xf3efe6, skirt: 0x161616, skirtLen: 'midi', pattern: 'vest', sleeveless: true },
        label: 'Falar com Lísis', once: false, lines: [{ text: 'Scout fugiu...' }],
      });
      api.npc('yasmim', 4.75, -1.35, { sit: true, y: 0.12, rot: -1.05, look: { shirt: 0xd6336c, skirt: 0xd6336c, skirtLen: 'midi', sleeveless: true } });
      api.npc('chinelo', 4.75, 1.35, { sit: true, y: 0.12, rot: -1.15, look: { shirt: 0xd7262e, skirt: 0xd7262e, sleeveless: true } });

      // quem estava lá mas ainda não pode ser identificado (Breno, Dudão, Flora, Nala, Nanda): bonecos cinza
      const grey = { name: '', label: 'Quem é?', once: false, lines: [{ who: 'thought', text: 'Ainda não sei quem é.' }] };
      api.npc('boneco', -1.15, -1.6, { ...grey, rot: 0.2 });
      api.npc('boneco', 2.7, -1.55, { ...grey, rot: -0.3 });
      [-1.6, 0.3, 2.2].forEach(x => api.npc('boneco', x, 2.1, { ...grey, sit: true, y: 0.1, rot: Math.PI }));

      const check = () => { if (api.state.eliminated.has('hanna') && api.state.eliminated.has('analuz')) api.complete('Não sou Hanna, nem Analuz. Mas eu estava aqui.'); };

      api.npc('hanna', -3.1, -1.3, {
        extras: ['tray'], label: 'Falar com Hanna',
        look: { shirt: 0x151515, skirt: 0x151515, skirtLen: 'short', sleeveless: true, strapless: true },
        lines: [{ text: 'Alguém quer bussys?' }],
        onInteract: async () => { await api.eliminate('hanna'); check(); },
      });
      api.npc('analuz', -4.9, -1.0, {
        rot: 0.9, label: 'Falar com Analuz',
        lines: [{ text: 'Galera, tenho que ir embora para a premiação, mas amo vocês, vou me matar' }],
        onInteract: async (n) => {
          await api.walkNpc(n, -5.35, -0.4, 2.5);
          api.sfx.door();
          await api.tween(doorL.position, { z: 0.6 }, 500);
          n.root.visible = false;
          await api.tween(doorL.position, { z: -0.8 }, 500);
          await api.eliminate('analuz');
          check();
        },
      });

      // Scout, a gata siamesa, correndo pela sala
      const cat = makeCat();
      st.add(cat.root);
      api.custom({ root: cat.root, ch: cat, name: 'Scout', ambient: 'Miau!', ambientR: 1.8 });
      let ang = 0;
      st.updaters.push((dt) => {
        const pp = api.player ? api.player.root.position : null;
        const near = pp && pp.distanceTo(cat.root.position) < 1.5;
        ang += dt * (near ? 1.6 : 0.85);
        const x = Math.cos(ang) * 3.9, z = 0.35 + Math.sin(ang) * 0.75;
        cat.root.position.set(x, 0, z);
        cat.root.rotation.y = Math.atan2(-Math.sin(ang) * 3.9, Math.cos(ang) * 0.75);
        cat.animate(dt, 3);
      });

      // pista escondida: um celular caído entre os puffs, com uma foto
      // (só aparece se a foto estiver na pasta assets/, que fica fora do repositório)
      if (fotoMelhores) {
      const phone = new THREE.Group(); phone.position.set(5.15, 0, 0.05); phone.rotation.y = 0.5; st.add(phone);
      const ph = new THREE.Mesh(BOX, mat(0x1c1c22)); ph.scale.set(0.36, 0.04, 0.2); ph.position.y = 0.03; phone.add(ph);
      const scr = new THREE.Mesh(BOX, mat(0x9fd3ff, { emissive: 0x6fb8ff, ei: 1.2 })); scr.scale.set(0.3, 0.01, 0.16); scr.position.y = 0.055; phone.add(scr);
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), mat(0xfff2b0, { emissive: 0xffe680, ei: 2 }));
      spark.position.set(5.15, 0.45, 0.05); st.add(spark);
      st.updaters.push((dt, t) => { spark.rotation.y += dt * 3; spark.position.y = 0.45 + Math.sin(t * 3) * 0.08; spark.visible = Math.sin(t * 1.7) > -0.3; });
      api.interact({
        x: 5.15, z: 0.05, r: 1.3, h: 1.4, label: 'O que é isso?', once: false,
        onInteract: async () => {
          api.sfx.prompt();
          await api.screen(`<div class="polaroid"><img src="${fotoMelhores}" alt=""><div class="cap">Melhores do Ano 2024</div></div><div class="photo-thought">Nossa... Queria lembrar quem eu sou.</div>`, { cls: 'photo' });
        },
      });
      }

      api.exit(-5.4, 0.2, { rotY: Math.PI / 2, w: 1.5 });

      return {
        bounds: { minX: -5.6, maxX: 5.6, minZ: -2.0, maxZ: 2.6 },
        spawn: { x: -4.5, z: 0.6, rot: Math.PI / 2 },
        camOffset: new THREE.Vector3(0, 7.2, 9.2),
        camLook: new THREE.Vector3(0, 1.0, -1.0),
        camClamp: { minX: -1.5, maxX: 1.5, minZ: -0.3, maxZ: 0.3 },
        background: 0x1b1414,
        music: 'festa',
        onEnter: async () => {
          await api.say([{ who: alice, text: 'E o prêmio vai para...', sfx: 'applause' }]);
        },
      };
    },
  },
  // -------------------------------------------------------------------
  {
    id: 'vale', door: '2024', title: 'Vale Encantado', place: 'Pium', color: 0x2f9e44,
    eliminates: ['nanda'],
    build(st, api) {
      st.engine = api;
      st.floor(-17, 17, -13, 10, 0x6dbb4a, { checker: 0x66b244, tile: 2 });
      lights(st, { sky: 0xcdeeff, ground: 0x4a7a2a, sun: 1.9, shadow: 22 });
      // árvores na borda
      [[-15, -10], [-11, -11.5], [-5, -11.8], [0, -11], [12, -11.5], [15.5, -8], [15.5, -2], [15, 4], [-15.5, -4], [-15.5, 1]].forEach(([x, z], i) => st.tree(x, z, { h: 2.6 + (i % 3) * 0.6, s: 1 + (i % 2) * 0.2 }));
      // lago
      st.box(-8.5, -0.15, 3.2, 7, 0.2, 4.6, 0x3aa0e0, { cast: false });
      st.box(-8.5, -0.05, 3.2, 6.6, 0.1, 4.2, 0x5cc3ff, { cast: false, opacity: 0.85 });
      st.solid(-12, -5, 0.9, 5.5);
      // placa
      st.box(-3.5, 0, -2.5, 0.2, 1.4, 0.2, 0x6b4a2b);
      st.box(-1.5, 0, -2.5, 0.2, 1.4, 0.2, 0x6b4a2b);
      st.sign('VALE ENCANTADO', -2.5, 1.7, -2.4, 3.2, 0.8, { bg: '#7a5230', fg: '#fff4e0' });
      st.solid(-3.7, -1.3, -2.7, -2.3);

      // rede de escalada
      const x1 = 3.8, x2 = 8.6, zb = -4.4, zt = -7.3, yt = 5.6;
      [3.5, 8.9].forEach(x => { st.box(x, 0, zt - 0.2, 0.35, yt + 1.2, 0.35, 0x7a5230, { solid: true }); st.box(x, 0, zt - 1.6, 0.35, yt, 0.35, 0x7a5230, { solid: true }); });
      st.box(6.2, yt - 0.15, zt - 0.85, 5.8, 0.3, 1.9, 0xa0703f);
      st.box(6.2, yt + 0.15, zt - 1.75, 5.8, 0.8, 0.1, 0xa0703f);
      for (let x = x1; x <= x2 + 0.01; x += 0.6) rope(st, new THREE.Vector3(x, 0.05, zb), new THREE.Vector3(x, yt, zt), 0.07, 0xd9b26b);
      for (let k = 0; k <= 1.0001; k += 0.11) {
        const y = 0.05 + (yt - 0.05) * k, z = zb + (zt - zb) * k;
        rope(st, new THREE.Vector3(x1, y, z), new THREE.Vector3(x2, y, z), 0.07, 0xd9b26b);
      }
      st.solid(x1 - 0.2, x2 + 0.2, zt - 1.8, zb - 0.6);

      // coringas e a Alice num piquenique
      st.box(-1.5, 0, 5.2, 3.2, 0.03, 2.2, 0xd7372f, { cast: false });
      api.npc('alice', -2.4, 5.0, { sit: true, y: -0.35, rot: 0.4 });
      api.npc('chinelo', -0.6, 5.4, { sit: true, y: -0.35, rot: -0.4 });
      api.npc('yasmim', -1.5, 4.4, { rot: Math.PI });

      const nanda = api.npc('nanda', 6.2, -3.3, {
        label: 'Falar com Nanda',
        lines: [{ text: 'Vamos subir comigo?' }],
        onInteract: async (n) => {
          const pl = api.player;
          // os dois sobem a rede
          n.collider.on = false;
          pl.root.position.set(5.4, 0, zb + 0.2); n.root.position.set(7.0, 0, zb + 0.2);
          pl.root.rotation.y = Math.PI; n.root.rotation.y = Math.PI; n.moving = true;
          pl.anim.mode = 'climb'; n.ch.anim.mode = 'climb';
          await Promise.all([
            api.tween(pl.root.position, { y: yt, z: zt - 0.5 }, 3600),
            api.tween(n.root.position, { y: yt, z: zt - 0.5 }, 3300),
          ]);
          pl.anim.mode = 'idle'; n.ch.anim.mode = 'idle'; n.moving = false;
          pl.root.rotation.y = 0; n.root.rotation.y = 0;
          await api.eliminate('nanda');
          await api.thought('Daqui de cima dá pra ver tudo.');
          await api.fade(1, 500);
          pl.root.position.set(6.2, 0, -2.0); pl.root.rotation.y = 0;
          n.root.position.set(4.6, 0, -2.6);
          n.collider.minX = 4.2; n.collider.maxX = 5.0; n.collider.minZ = -3.0; n.collider.maxZ = -2.2; n.collider.on = true;
          await api.fade(0, 500);
          await api.complete('Não sou Nanda. Mas subi junto.');
        },
      });
      nanda.ambient = 'Bora?';
      api.exit(-14.6, 6.6, { rotY: Math.PI / 2 });

      return {
        bounds: { minX: -16, maxX: 16, minZ: -12, maxZ: 9 },
        spawn: { x: -8, z: 6.6, rot: Math.PI / 2 },
        camClamp: { minX: -9, maxX: 9, minZ: -5, maxZ: 3 },
        background: 0x9fd8ff,
        fog: { color: 0x9fd8ff, near: 30, far: 70 },
        music: 'calmo',
      };
    },
  },
  // -------------------------------------------------------------------
  {
    id: 'aniversario', door: '2021', title: 'Aniversário', place: 'Festa à fantasia', color: 0x8e44ad,
    eliminates: ['flora'],
    build(st, api) {
      st.engine = api;
      st.floor(-10, 10, -7, 6, 0x3a2f5b, { checker: 0x463a6b, tile: 1 });
      st.room({ minX: -10, maxX: 10, minZ: -7, maxZ: 6, color: 0x2f2a45, trim: 0xff4fa0, gaps: { w: [[2, 4]] } });
      lights(st, { hemi: 0.9, sun: 0.7, sky: 0xd8c8ff, ground: 0x2a1a3a, shadow: 16 });
      const pinks = [point(st, -6, 3, -3, 0xff4fa0, 10, 14), point(st, 6, 3, -3, 0x4fd8ff, 10, 14), point(st, 0, 3, 3, 0xffd34f, 8, 14)];
      st.updaters.push((dt, t) => pinks.forEach((l, i) => { l.intensity = 7 + Math.sin(t * 3 + i * 2) * 4; }));
      st.sign('FELIZ ANIVERSÁRIO!', 0, 2.7, -6.78, 7, 1.1, { bg: '#ff4fa0', fg: '#fff4e0' });
      stringLights(st, -9.5, 9.5, -6.7, 3.6);
      const cols = [0xff4fa0, 0x4fd8ff, 0xffd34f, 0x9b59b6, 0x2ecc71];
      [[-8.8, -6], [-7.6, -6.2], [8.6, -6], [7.4, -6.3], [-9.2, 4.8], [9.1, 4.6], [-3.6, -6.3], [3.6, -6.3]].forEach(([x, z], i) => balloon(st, x, z, cols[i % cols.length], 2.4 + (i % 3) * 0.3));

      // mesa e o bolo estragado
      st.table(0, -3.6, 3.2, 1.4, 0xf3f3f3);
      st.box(0, 0.85, -3.6, 1.3, 0.45, 1.1, 0x9bb36a);
      st.box(0, 1.3, -3.6, 0.85, 0.35, 0.75, 0x8fa35a);
      [[-0.4, 1.12, -3.0], [0.3, 1.2, -3.0], [0.15, 1.5, -3.3], [-0.2, 1.66, -3.6], [0.5, 1.0, -3.1]].forEach(([x, y, z]) => st.box(x, y, z, 0.12, 0.08, 0.06, 0x3a4a1a, { cast: false }));
      st.box(0.2, 1.65, -3.6, 0.05, 0.25, 0.05, 0xffffff);
      st.box(-0.2, 1.65, -3.5, 0.05, 0.22, 0.05, 0xffffff);
      const flies = [];
      for (let i = 0; i < 6; i++) flies.push(st.box(0, 2, -3.6, 0.07, 0.05, 0.07, 0x111111, { cast: false }));
      st.updaters.push((dt, t) => flies.forEach((f, i) => { const a = t * (2 + i * 0.4) + i; f.position.set(Math.cos(a) * (0.6 + i * 0.08), 2.0 + Math.sin(a * 1.7) * 0.25, -3.6 + Math.sin(a) * (0.5 + i * 0.05)); }));

      // quem já saiu da lista + coringas, todos fantasiados
      const coro = [
        api.npc('hanna', -2.6, -2.0, { extras: ['partyhat'], ambient: 'Clarice matou o bolo!' }),
        api.npc('analuz', 2.6, -2.0, { extras: ['mask'], ambient: 'Clarice matou o bolo!' }),
        api.npc('nanda', -3.4, -0.4, { extras: ['partyhat'], ambient: 'Clarice matou o bolo!' }),
        api.npc('yasmim', 3.4, -0.4, { extras: ['mask'], ambient: 'Clarice matou o bolo!' }),
        api.npc('chinelo', -1.8, 0.9, { extras: ['partyhat'] }),
        api.npc('alice', 1.8, 0.9, { extras: ['partyhat'] }),
      ];
      const clarice = api.npc('clarice', 1.0, -1.6, { extras: ['cape'], ambient: 'Socorro!', ambientStyle: 'shout-sm' });

      api.interact({
        x: 0, z: -2.5, r: 2.0, label: 'Ver o bolo',
        onInteract: async () => {
          await api.say([
            { who: coro[0], text: 'Clarice matou o bolo!', sim: [{ who: coro[1], text: 'Clarice matou o bolo!' }, { who: coro[3], text: 'CLARICE MATOU O BOLO!' }] },
            { who: clarice, text: 'Socorro!', style: 'shout' },
          ]);
        },
      });

      // Flora, a aniversariante (fantasia provisória)
      api.npc('flora', -6.4, -4.4, {
        extras: ['cape'], rot: 0.5, label: 'Falar com a aniversariante',
        lines: [{ text: 'Meu bolo...' }],
        onInteract: async () => { await api.eliminate('flora'); await api.complete('Não sou Flora. Mas lembro desse bolo.'); },
      });
      api.exit(-9.6, 3, { rotY: Math.PI / 2 });

      return {
        bounds: { minX: -9.6, maxX: 9.6, minZ: -6.6, maxZ: 5.6 },
        spawn: { x: 0, z: 4.4, rot: Math.PI },
        camClamp: { minX: -3, maxX: 3, minZ: -1.5, maxZ: 1.5 },
        background: 0x1a1428,
        music: 'festa',
      };
    },
  },
  // -------------------------------------------------------------------
  {
    id: 'caico', door: '2025', title: 'Carnaval de Caicó', place: '', color: 0xffde00,
    eliminates: ['dudao'],
    build(st, api) {
      st.engine = api;
      st.floor(-19, 19, -9, 9, 0x3a3a44, { checker: 0x34343d, tile: 2 });
      st.box(0, -0.1, -7.5, 38, 0.15, 3, 0x8a8a8a, { cast: false });
      lights(st, { hemi: 1.05, sun: 0.55, sky: 0x6677cc, ground: 0x222244, sunColor: 0xb0c0ff, shadow: 22 });
      // casarões coloridos
      const fac = [0xf4d35e, 0x3fa7d6, 0xee6352, 0x59cd90, 0xfac05e, 0xf7f7f7, 0xe07a5f, 0x81b29a];
      for (let i = 0; i < 8; i++) {
        const x = -17 + i * 4.8, h = 4 + (i % 3) * 0.7;
        st.box(x, 0, -9.4, 4.6, h, 1.2, fac[i], { solid: true });
        st.box(x, h, -9.4, 4.8, 0.3, 1.4, 0xffffff);
        st.box(x, 0, -8.78, 1.0, 2.0, 0.05, 0x5a3a22, { cast: false });
        st.box(x - 1.5, 2.3, -8.78, 0.8, 1.0, 0.05, 0xffe9a0, { emissive: 0xffc860, ei: 0.8, cast: false });
        st.box(x + 1.5, 2.3, -8.78, 0.8, 1.0, 0.05, 0xffe9a0, { emissive: 0xffc860, ei: 0.8, cast: false });
      }
      bandeirinhas(st, -19, 19, -3.5, 5);
      bandeirinhas(st, -19, 19, 2.5, 5.2);
      // postes
      [-14, -2, 14].forEach(x => { st.box(x, 0, -6.4, 0.2, 4.6, 0.2, 0x333333, { solid: true }); st.box(x, 4.5, -6.1, 0.5, 0.25, 0.8, 0xffe9a0, { emissive: 0xffd480, ei: 1.5 }); point(st, x, 4.2, -5.6, 0xffd480, 12, 16); });
      point(st, -8, 4, 3, 0xff8ad8, 8, 16); point(st, 0, 4, 4, 0x8ad8ff, 8, 16);

      // o paredão
      const px = 8, pz = -4.2;
      st.box(px, 0, pz, 6, 0.8, 2.4, 0x222222, { solid: true });
      st.box(px, 0.8, pz, 6, 3.4, 2.2, 0x111111);
      const cone = new THREE.CylinderGeometry(0.62, 0.62, 0.12, 20);
      const cones = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const m = new THREE.Mesh(cone, mat(0x3a3a3a)); m.rotation.x = Math.PI / 2; m.position.set(px - 2.1 + c * 1.4, 1.75 + r * 1.45, pz + 1.12); st.add(m);
        const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), mat(0x111111)); m2.rotation.x = Math.PI / 2; m2.position.set(m.position.x, m.position.y, pz + 1.16); st.add(m2);
        cones.push(m);
      }
      const leds = [];
      for (let i = 0; i < 12; i++) leds.push(st.box(px - 2.75 + i * 0.5, 4.25, pz + 1.12, 0.4, 0.15, 0.05, 0xffffff, { emissive: 0xffffff, ei: 1, cast: false }));
      const ledMats = leds.map(l => { l.material = l.material.clone(); return l.material; });
      const beams = [point(st, px - 2, 4.8, pz + 2, 0xff00aa, 14, 14), point(st, px + 2, 4.8, pz + 2, 0x00e5ff, 14, 14)];
      st.updaters.push((dt, t) => {
        ledMats.forEach((m, i) => { const c = new THREE.Color().setHSL((t * 0.5 + i / 12) % 1, 1, 0.55); m.color.copy(c); m.emissive.copy(c); });
        const b = 1 + Math.max(0, Math.sin(t * 13.4)) * 0.05;
        cones.forEach(c => c.scale.set(b, 1, b));
        beams[0].intensity = 10 + Math.sin(t * 6) * 6; beams[1].intensity = 10 + Math.cos(t * 6) * 6;
      });

      // multidão (figurantes mascarados)
      const shirts = [0xffde00, 0xff3b3b, 0x3bceac, 0xffffff, 0xff7f11, 0x3d5af1];
      const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x6b3e26, 0xd9a77c];
      const spots = [[3, 0.5], [4.5, 1.8], [6.2, 0.8], [8.0, 1.6], [10, 0.6], [11.5, 1.9], [13, 0.4], [2.2, 2.6], [9.1, 3.0], [12.2, 3.2], [5.3, 3.4], [14.2, 2.2], [-1.0, 1.5], [0.6, 3.6]];
      spots.forEach(([x, z], i) => {
        const n = api.npc('extra', x, z, { dance: true, facePlayer: false, look: { shirt: shirts[i % 6], skin: skins[i % 6], hairStyle: ['short', 'curly', 'long', 'bun'][i % 4] }, extras: ['mask'] });
        n.ch.anim.t = i * 0.37;
      });
      // quem já saiu da lista + coringa
      api.npc('hanna', -4, 1.2, { dance: true, extras: ['abada'] });
      api.npc('analuz', -2.6, 2.6, { dance: true, extras: ['abada'] });
      api.npc('flora', -5.6, 3.0, { dance: true, extras: ['abada'] });
      api.npc('chinelo', -3.2, -0.6, { dance: true, extras: ['abada'] });

      api.npc('dudao', 4.0, -1.0, {
        extras: ['abada'], label: 'Falar com Dudão', ambient: 'Ei...',
        lines: [{ text: 'Cadê o loló?' }],
        onInteract: async () => { await api.eliminate('dudao'); await api.complete('Não sou Dudão. Mas como eu dancei nessa noite!'); },
      });
      api.exit(-18.4, 0, { rotY: Math.PI / 2 });
      st.flags.danceIdle = true;

      return {
        bounds: { minX: -18.6, maxX: 18.6, minZ: -7.8, maxZ: 8.6 },
        spawn: { x: -13, z: 3, rot: Math.PI / 2 },
        camClamp: { minX: -10, maxX: 10, minZ: -2, maxZ: 3 },
        background: 0x0b0b1e,
        fog: { color: 0x0b0b1e, near: 25, far: 55 },
        music: 'paredao',
      };
    },
  },
  // -------------------------------------------------------------------
  {
    id: 'formatura', door: '2026', title: 'Formatura', place: '', color: 0x1f3a6e,
    eliminates: ['nala'],
    build(st, api) {
      st.engine = api;
      st.floor(-12, 12, -9, 7, 0x5a3b2a, { checker: 0x52362a, tile: 1.5 });
      st.box(0, -0.08, -1, 2.6, 0.1, 15, 0x9b1d2d, { cast: false });
      st.room({ minX: -12, maxX: 12, minZ: -9, maxZ: 7, h: 4.4, color: 0xe9dfcf, trim: 0x1f3a6e, gaps: { e: [[3, 5]] } });
      lights(st, { hemi: 1.3, sun: 1.0, shadow: 18 });
      // palco
      st.box(0, 0, -7.2, 16, 0.6, 3.4, 0x3b2a1a, { solid: true });
      st.box(-4.5, 0.6, -7.4, 1.0, 1.2, 0.7, 0x6b4a2b);
      // faixa escondida pela cortina
      st.sign('PARABÉNS, NALA!', 0, 3.3, -8.78, 9, 1.4, { bg: '#1f3a6e', fg: '#f2c230' });
      const curtain = new THREE.Group(); curtain.position.set(0, 3.3, -8.65); st.add(curtain);
      const cm = new THREE.Mesh(BOX, mat(0x9b1d2d)); cm.scale.set(9.6, 1.9, 0.1); curtain.add(cm);
      const cs = st.sign('FORMATURA 2026', 0, 0, 0.06, 7, 1.0, { bg: null, fg: '#f2c230', parent: curtain });
      cs.position.set(0, 0, 0.06);
      const spot = new THREE.SpotLight(0xfff2cc, 40, 20, 0.5, 0.5, 1.2);
      spot.position.set(0, 7, -2); spot.target.position.set(0, 0.6, -6.6); st.add(spot); st.add(spot.target);
      [[-11, -8.4], [-10, -8.4], [10, -8.4], [11, -8.4]].forEach(([x, z], i) => balloon(st, x, z, [0xf2c230, 0x1f3a6e][i % 2], 2.8));

      // cadeiras e convidados (só quem já saiu + coringas)
      const seated = { '-5.2,-3': 'hanna', '-3.6,-3': 'analuz', '3.6,-3': 'nanda', '5.2,-3': 'flora', '-6.8,-1': 'lisis', '6.8,-1': 'chinelo', '-3.6,-1': 'yasmim', '5.2,-1': 'alice' };
      for (const z of [-3, -1, 1]) for (const x of [-8.4, -6.8, -5.2, -3.6, -2.0, 2.0, 3.6, 5.2, 6.8, 8.4]) {
        st.chair(x, z, Math.PI, 0x1f3a6e);
        const who = seated[`${x},${z}`];
        if (who) api.npc(who, x, z, { sit: true, y: 0.1, rot: Math.PI, facePlayer: false });
      }
      api.npc('dudao', 9.5, 4.2, { ambient: 'Cadê a Balena?', rot: -0.6, lines: [{ text: 'Cadê a Balena?' }], label: 'Falar com Dudão', once: false });

      const nala = api.npc('nala', 0, -6.4, {
        y: 0.6, extras: ['gown', 'gradcap'], r: 3.2, label: 'Falar com quem se formou',
        lines: [{ text: 'AAAAAAAAAAAAAAAAAAAAA', style: 'shout', sfx: 'scream' }],
        onInteract: async () => {
          api.sfx.applause();
          await api.tween(curtain.position, { y: 7.5 }, 1400);
          await api.eliminate('nala');
          await api.complete('Não era a minha formatura.');
        },
      });
      nala.facePlayer = false;
      api.exit(11.6, 4, { rotY: -Math.PI / 2 });

      return {
        bounds: { minX: -11.6, maxX: 11.6, minZ: -5.5, maxZ: 6.6 },
        spawn: { x: 0, z: 5.4, rot: Math.PI },
        camClamp: { minX: -4, maxX: 4, minZ: -2.5, maxZ: 2 },
        background: 0xe9dfcf,
        music: 'calmo',
      };
    },
  },
  // -------------------------------------------------------------------
  {
    id: 'sungolden', door: '2019', title: 'Sun Golden', place: 'Área de lazer do condomínio', color: 0x38b6ff,
    eliminates: [],
    build(st, api) {
      st.engine = api;
      st.floor(-15, 15, -11, 9, 0xe9e2d0, { checker: 0xdcd3be, tile: 1.5 });
      lights(st, { sun: 2.0, shadow: 22 });
      // piscina
      st.box(-4, -0.1, -2, 11, 0.12, 7, 0xffffff, { cast: false });
      const water = st.box(-4, -0.04, -2, 10, 0.1, 6, 0x38b6ff, { cast: false, opacity: 0.9, emissive: 0x0a5a9a, ei: 0.3 });
      st.updaters.push((dt, t) => { water.position.y = 0.01 + Math.sin(t * 2) * 0.02; });
      st.solid(-9.3, 1.3, -5.3, 1.3);
      // espreguiçadeiras e guarda-sol
      [-8, -5, -2].forEach(x => { st.box(x, 0, 3.2, 1.0, 0.35, 2.0, 0xffffff, { solid: true }); st.box(x, 0.35, 2.5, 1.0, 0.5, 0.25, 0x3a7bd5); });
      st.box(1.5, 0, 3.6, 0.15, 2.6, 0.15, 0xdddddd);
      st.box(1.5, 2.5, 3.6, 2.6, 0.15, 2.6, 0xff6b6b);
      st.palm(-13, -8); st.palm(-13.5, 6.5, 4); st.palm(13.5, 6.5, 5);
      st.box(-14.6, 0, 1, 0.3, 2.2, 6, 0xf2d6a0, { solid: true });
      st.sign('SUN GOLDEN', -14.4, 2.6, 1, 4, 0.9, { bg: '#f2c230', fg: '#2b1d14', rotY: Math.PI / 2 });

      // banheiro (com teto e parede da frente que somem quando o boneco entra)
      const bx1 = 5, bx2 = 13, bz1 = -10, bz2 = -2.5;
      st.floor(bx1, bx2, bz1, bz2, 0xd6eef5, { checker: 0xc2e0ea, tile: 0.8, y: 0.01 });
      st.room({ minX: bx1, maxX: bx2, minZ: bz1, maxZ: bz2, h: 3.2, color: 0x7fc8a9, southH: 3.2, gaps: { s: [[7.8, 9.4]] } });
      const shell = new THREE.Group(); st.add(shell);
      const roof = new THREE.Mesh(BOX, mat(0x5aa98a)); roof.scale.set(bx2 - bx1 + 0.4, 0.25, bz2 - bz1 + 0.4); roof.position.set((bx1 + bx2) / 2, 3.3, (bz1 + bz2) / 2); roof.castShadow = true; shell.add(roof);
      st.sign('BANHEIRO', 8.6, 3.0, bz2 + 0.22, 2.0, 0.45, { bg: '#ffffff', fg: '#2b1d14' });
      // porta
      const hinge = new THREE.Group(); hinge.position.set(7.8, 0, bz2); st.add(hinge);
      const doorM = new THREE.Mesh(BOX, mat(0x8a5a3c)); doorM.scale.set(1.6, 2.6, 0.1); doorM.position.set(0.8, 1.3, 0); doorM.castShadow = true; hinge.add(doorM);
      const doorCol = st.solid(7.8, 9.4, bz2 - 0.1, bz2 + 0.1);
      // dentro: pia, espelho, boxe
      st.box(7, 0, -9.4, 1.4, 0.9, 0.7, 0xffffff, { solid: true });
      st.mirror(7, 2.0, -9.77, 1.6, 1.3, 0);
      const boxe = new THREE.Group(); boxe.position.set(11.4, 0, -7.6); st.add(boxe);
      const glass = mat(0xe4f4ff, { opacity: 0.9 });
      [[-0.9, 0, 0.06, 1.8], [0.9, 0, 0.06, 1.8]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(BOX, glass); m.scale.set(w, 2.3, d); m.position.set(x, 1.15, z); boxe.add(m); });
      const boxeDoor = new THREE.Mesh(BOX, glass); boxeDoor.scale.set(1.8, 2.3, 0.06); boxeDoor.position.set(0, 1.15, 0.9); boxe.add(boxeDoor);
      st.box(11.4, 2.2, -8.3, 0.3, 0.1, 0.3, 0xaaaaaa);
      st.solid(10.4, 12.4, -8.6, -6.6);

      const chinelo = api.npc('chinelo', 6.4, -7.8, { rot: 0.6, ambient: 'Ocupado!!' });
      const joao = api.npc('joao', 11.4, -7.8, { facePlayer: false, solid: false, hideName: true });

      api.interact({
        x: 8.6, z: bz2 + 0.9, r: 2.0, label: 'Abrir a porta',
        onInteract: async () => {
          api.sfx.door();
          await api.tween(hinge.rotation, { y: -1.6 }, 700);
          doorCol.on = false;
          await api.say([{ who: chinelo, text: 'Ocupado!!' }]);
        },
      });
      api.interact({
        x: 11.4, z: -6.2, r: 1.8, label: 'Bater no boxe',
        onInteract: async () => {
          api.sfx.knock();
          await api.thought('Tem alguém aí dentro...');
          await api.wait(400);
          api.sfx.knock();
          await api.wait(700);
          await api.tween(boxeDoor.position, { x: 1.7 }, 800);
          joao.hideName = false;
          await api.say([{ who: joao, text: 'Me tira daqui!!' }]);
          await api.complete('Era João Neto. Ainda não sei quem eu sou.');
        },
      });
      api.interact({ x: 7, z: -8.5, r: 1.5, label: 'Olhar no espelho', once: false, onInteract: () => api.thought('Ainda sem rosto.') });

      // some o teto e a parede da frente quando o boneco entra no banheiro
      const frontPieces = st.root.children.filter(o => o.isMesh && Math.abs(o.position.z - bz2) < 0.05 && o.position.x > bx1 && o.position.x < bx2 && o.scale.y > 3);
      frontPieces.forEach(o => shell.attach(o));
      st.updaters.push(() => {
        const p = api.player.root.position;
        const inside = p.x > bx1 && p.x < bx2 && p.z > bz1 && p.z < bz2 + 0.3;
        shell.visible = !inside;
        hinge.visible = !inside;
      });

      // Silvana com o cachorro e Analuz
      const silvana = api.npc('silvana', -10.5, 4.6, { extras: ['dog'], rot: 0.3 });
      const analuz = api.npc('analuz', -9.2, 4.9, { rot: -0.3 });
      let played = false;
      st.updaters.push(() => {
        if (played || api.state.dialog || api.state.cutscene) return;
        const p = api.player.root.position;
        if (Math.hypot(p.x - silvana.root.position.x, p.z - silvana.root.position.z) < 4) {
          played = true;
          api.state.cutscene++;
          api.say([{ who: silvana, text: 'Analuz, cadê Duda?' }, { who: analuz, text: 'Não sei.' }]).then(() => { api.state.cutscene--; silvana.ambient = 'Duda?'; });
        }
      });
      api.exit(-13.6, 6.0, { rotY: Math.PI / 2 });

      return {
        bounds: { minX: -14.6, maxX: 14.6, minZ: -10.6, maxZ: 8.6 },
        spawn: { x: -3, z: 6.6, rot: Math.PI },
        camClamp: { minX: -7, maxX: 7, minZ: -4, maxZ: 3 },
        background: 0xbfe7ff,
      };
    },
  },
  // -------------------------------------------------------------------
  {
    id: 'escola', door: '2019', title: 'Escola', place: '', color: 0x2f6fae,
    eliminates: ['breno'],
    build(st, api) {
      st.engine = api;
      // corredor (z 0..4) e salas ao norte
      st.floor(-17, 17, 0, 4.4, 0xcfd6dc, { checker: 0xbcc5cc, tile: 1.1 });
      st.floor(-17, -4.2, -9.5, 0, 0xd9c09a, { checker: 0xcdb38c, tile: 1.1 });
      st.floor(-4.2, 4.2, -9.5, 0, 0xe3eef3, { checker: 0xcfe0e8, tile: 0.8 });
      st.floor(4.2, 17, -9.5, 0, 0xc9b9a6, { checker: 0xbcab97, tile: 1.1 });
      lights(st, { hemi: 1.6, sun: 1.2, shadow: 20 });
      const wall = 0xeae3d2;
      // paredes externas
      st.box(0, 0, -9.7, 34.4, 3.4, 0.4, wall, { solid: true });
      st.box(-17.2, 0, -2.6, 0.4, 3.4, 14.4, wall, { solid: true });
      st.box(17.2, 0, -2.6, 0.4, 3.4, 14.4, wall, { solid: true });
      st.box(0, 0, 4.6, 34.4, 0.45, 0.4, wall, { solid: true });
      // divisórias entre as salas
      st.box(-4.2, 0, -4.8, 0.3, 3.2, 9.4, wall, { solid: true });
      st.box(4.2, 0, -4.8, 0.3, 3.2, 9.4, wall, { solid: true });
      // parede entre corredor e salas (baixa, com portas)
      const gaps = [[-8.2, -6.4], [-0.9, 0.9], [6.4, 8.2]];
      let cur = -17;
      gaps.forEach(([a, b]) => { st.box((cur + a) / 2, 0, -0.05, a - cur, 0.7, 0.3, 0x2f6fae, { solid: true }); cur = b; });
      st.box((cur + 17) / 2, 0, -0.05, 17 - cur, 0.7, 0.3, 0x2f6fae, { solid: true });
      gaps.forEach(([a, b]) => { st.box(a, 0, -0.05, 0.2, 2.6, 0.35, 0x8a5a3c); st.box(b, 0, -0.05, 0.2, 2.6, 0.35, 0x8a5a3c); st.box((a + b) / 2, 2.6, -0.05, b - a + 0.2, 0.2, 0.35, 0x8a5a3c); });
      st.sign('SALA', -7.3, 3.15, 0.15, 1.6, 0.45, { bg: '#2f6fae', fg: '#ffffff' });
      st.sign('BANHEIRO', 0, 3.15, 0.15, 2.0, 0.45, { bg: '#2f6fae', fg: '#ffffff' });
      st.sign('COORDENAÇÃO', 7.3, 3.15, 0.15, 2.6, 0.45, { bg: '#2f6fae', fg: '#ffffff' });
      // armários no corredor
      for (let i = 0; i < 5; i++) st.box(-16.6, 0, 0.8 + i * 0.7, 0.6, 2.2, 0.65, [0x3d7a4f, 0x2f6fae][i % 2], { solid: true });
      st.sign('MURAL', 15.8, 1.8, 2.2, 1.6, 1.0, { bg: '#c89b6b', fg: '#2b1d14', rotY: -Math.PI / 2 });

      // ---- SALA: carteiras, quadro e alunos de farda
      st.box(-10.6, 0.9, -9.45, 7.6, 2.0, 0.1, 0x2f5233, { cast: false });
      st.sign('APRESENTAÇÕES DO\nSARAU EM BREVE', -10.6, 1.9, -9.38, 7.2, 1.8, { bg: '#2f5233', fg: '#f4f4f4', chalk: true, weight: 600 });
      st.table(-14.6, -7.6, 1.8, 0.9, 0x8b5a2b);
      const desks = [];
      for (const z of [-5.6, -3.6, -1.6]) for (const x of [-14.4, -12.2, -10.0, -7.8, -5.6]) { deskWithChair(st, x, z); desks.push([x - 0.2, z + 0.25]); }
      const classmates = ['hanna', 'analuz', 'flora', 'dudao', 'nala', 'lisis', 'chinelo', 'alice'];
      const seatIdx = [0, 2, 3, 5, 6, 8, 11, 13];
      classmates.forEach((k, i) => { const [x, z] = desks[seatIdx[i]]; api.npc(k, x, z, { sit: true, y: 0.02, rot: Math.PI, facePlayer: false, look: FARDA, solid: false }); });
      let salaDone = false;
      st.updaters.push(() => {
        const p = api.player.root.position;
        if (!salaDone && p.z < -0.6 && p.x < -4.2 && !api.state.dialog && !api.state.cutscene) {
          salaDone = true; st.flags.sala = true;
          api.state.cutscene++;
          api.thought('Minha sala.').then(() => { api.state.cutscene--; checkBreno(); });
        }
      });

      // ---- BANHEIRO: pias, espelho, cabines
      st.box(-2.4, 0, -9.1, 3.0, 0.9, 0.7, 0xffffff, { solid: true });
      st.mirror(-2.4, 2.0, -9.47, 2.8, 1.2, 0);
      const stallZ = -6.6;
      for (let i = 0; i < 3; i++) {
        const z0 = -9.5 + i * 1.6;
        st.box(2.4, 0, z0 + 1.6, 3.4, 2.2, 0.1, 0xb9d3e0, { solid: true });
        if (i === 1) st.box(0.75, 0, z0 + 0.8, 0.1, 2.0, 1.5, 0x5d8aa8, { solid: true });
      }
      st.box(0.75, 0, -8.7, 0.1, 2.0, 1.5, 0xb9d3e0, { solid: true });
      st.box(0.75, 0, -5.5, 0.1, 2.0, 1.5, 0xb9d3e0, { solid: true });
      st.solid(0.8, 4.0, -9.5, -4.6);
      const stallAnchor = new THREE.Vector3(2.2, 2.2, stallZ - 0.5);
      const yasmim = api.npc('yasmim', -0.8, -6.6, { rot: -Math.PI / 2, look: FARDA });
      api.interact({
        pos: () => yasmim.root.position, r: 2.4, label: 'Falar com Yasmim',
        onInteract: async () => {
          await api.say([
            { who: 'player', text: 'O que tá acontecendo?' },
            { who: { anchor: () => stallAnchor }, name: 'Cabine', text: 'NÃO ESTOU GRÁVIDA, PORRAAAAA', style: 'shout' },
          ]);
          st.flags.banheiro = true;
          checkBreno();
        },
      });
      api.interact({ x: -2.4, z: -8.2, r: 1.6, label: 'Olhar no espelho', once: false, onInteract: () => api.thought('Ainda sem rosto.') });

      // ---- COORDENAÇÃO: Titia, Mayara e Breno espiando
      st.table(11.5, -6.8, 3.0, 1.2, 0x7a4a2a);
      st.box(11.5, 0.85, -6.9, 0.5, 0.4, 0.4, 0x333333);
      st.box(15.8, 0, -8.5, 1.4, 2.4, 1.6, 0x8a8a8a, { solid: true });
      api.npc('titia', 11.5, -7.9, { sit: true, y: 0.1, facePlayer: false, solid: false });
      st.chair(11.5, -7.9, 0, 0x333333);
      api.npc('mayara', 10.6, -5.2, { rot: Math.PI - 0.3, ambient: 'Laura é perversa!', facePlayer: false });
      const breno = api.npc('breno', 7.3, 0.9, {
        rot: Math.PI, facePlayer: false, look: FARDA, label: 'Quem está espiando?',
        enabled: () => st.flags.sala && st.flags.banheiro,
        lines: [{ text: 'A água de salsicha está esculhambando Laura.' }],
        onInteract: async () => {
          await api.eliminate('breno');
          await api.wait(600);
          await api.thought('Só sobrou um nome.');
          await api.complete('Agora eu preciso me ver.');
        },
      });
      breno.root.visible = false;
      breno.collider.on = false;
      function checkBreno() {
        if (st.flags.sala && st.flags.banheiro && !breno.root.visible) {
          breno.root.visible = true; breno.collider.on = true;
          breno.ch.body.rotation.x = 0.25;
          api.toast('Tem alguém espiando a coordenação...', 3000);
        }
      }

      api.exit(-16.6, 2.4, { rotY: Math.PI / 2 });

      return {
        bounds: { minX: -16.8, maxX: 16.8, minZ: -9.3, maxZ: 4.2 },
        spawn: { x: -13, z: 2.4, rot: Math.PI / 2 },
        camOffset: new THREE.Vector3(0, 11, 11),
        camClamp: { minX: -9, maxX: 9, minZ: -3, maxZ: 0.5 },
        background: 0xdfe8ee,
        onEnter: async () => { api.sfx.bell(); },
      };
    },
  },
  // -------------------------------------------------------------------
  {
    id: 'aviao', door: '?', title: 'Avião', place: 'A caminho da Bahia', color: 0xf2c230,
    eliminates: [], final: true,
    build(st, api) {
      st.engine = api;
      const L = -12, R = 10;
      st.floor(L, R, -2.7, 2.7, 0x4a5568, { checker: 0x434d60, tile: 1.2 });
      st.box(-1, -0.08, 0, R - L, 0.1, 1.2, 0x2b4c7e, { cast: false });
      // fuselagem: parede norte com janelas, sul baixa
      st.box((L + R) / 2, 0, -2.9, R - L, 0.9, 0.4, 0xeef1f5, { solid: true });
      st.box((L + R) / 2, 2.4, -2.9, R - L, 0.9, 0.4, 0xeef1f5);
      const first = L + 4;
      st.box((L + first - 0.35) / 2, 0.9, -2.9, first - 0.35 - L, 1.5, 0.4, 0xeef1f5);
      let lastX = first;
      for (let x = first; x < R - 0.5; x += 1.6) {
        st.box(x, 0.9, -2.95, 0.7, 1.5, 0.1, 0xbfe3ff, { emissive: 0x9fd3ff, ei: 0.5, cast: false });
        const pr = Math.min(x + 1.25, R);
        st.box((x + 0.35 + pr) / 2, 0.9, -2.9, pr - x - 0.35, 1.5, 0.4, 0xeef1f5);
        lastX = x;
      }
      st.box((L + R) / 2, 0, 2.9, R - L, 0.5, 0.4, 0xeef1f5, { solid: true });
      st.box(R + 0.2, 0, 0, 0.4, 3.3, 6.2, 0xeef1f5, { solid: true });
      st.box(L - 0.2, 0, 0, 0.4, 3.3, 6.2, 0xeef1f5, { solid: true });
      // poltronas
      for (let x = L + 4.4; x < R - 0.5; x += 1.6) {
        [-2.05, -1.35, 1.35, 2.05].forEach(z => {
          st.box(x, 0, z, 0.7, 0.5, 0.6, 0x2b4c7e);
          st.box(x - 0.3, 0.5, z, 0.15, 0.85, 0.6, 0x2b4c7e);
          st.box(x - 0.33, 1.15, z, 0.1, 0.2, 0.5, 0xffffff);
        });
        st.solid(x - 0.4, x + 0.4, -2.4, -1.0); st.solid(x - 0.4, x + 0.4, 1.0, 2.4);
      }
      lights(st, { hemi: 1.6, sun: 1.3, shadow: 14 });
      // banheiro do avião no fundo
      st.box(L + 2.6, 0, -1.0, 0.25, 3.0, 3.4, 0xd8dde3, { solid: true });
      st.box(L + 2.6, 0, 2.3, 0.25, 3.0, 0.9, 0xd8dde3, { solid: true });
      st.sign('BANHEIRO', L + 2.75, 2.7, 1.3, 1.4, 0.35, { bg: '#2b4c7e', fg: '#ffffff', rotY: Math.PI / 2 });
      st.box(L + 1.2, 0, -2.3, 1.4, 0.9, 0.6, 0xf7f7f7, { solid: true });
      st.mirror(L + 1.2, 2.0, -2.68, 1.4, 1.2, 0);

      // nuvens lá fora
      const clouds = [];
      for (let i = 0; i < 18; i++) {
        const c = st.box(L - 6 + Math.random() * (R - L + 12), -7 + Math.random() * 3.5, -8 - Math.random() * 14, 3 + Math.random() * 4, 1 + Math.random(), 2 + Math.random() * 2, 0xffffff, { cast: false });
        clouds.push(c);
      }
      st.updaters.push((dt) => clouds.forEach(c => { c.position.x += dt * 6; if (c.position.x > R + 10) c.position.x = L - 10; }));

      // a Bahia lá embaixo (provisório: mar, orla e um farol)
      const B = new THREE.Vector3(0, -70, -40);
      const bahia = new THREE.Group(); st.add(bahia); bahia.visible = false;
      const bahiaStart = st.root.children.length;
      st.box(B.x, B.y - 1, B.z, 160, 1, 120, 0x1f78b4, { cast: false });
      st.box(B.x + 20, B.y, B.z - 20, 80, 1.2, 60, 0xe8d8a8, { cast: false });
      st.box(B.x + 26, B.y + 1, B.z - 26, 70, 0.6, 50, 0x6aa84f, { cast: false });
      for (let i = 0; i < 26; i++) st.box(B.x + 6 + (i % 7) * 6, B.y + 1, B.z - 16 - Math.floor(i / 7) * 6, 3.5, 2 + (i * 7 % 9), 3.5, [0xf7f7f7, 0xf2d6a0, 0xe0a370, 0xc9d6df][i % 4], { cast: false });
      st.box(B.x - 6, B.y, B.z - 6, 9, 2.2, 9, 0xd9c7a0, { cast: false });
      st.box(B.x - 6, B.y + 2.2, B.z - 6, 2.4, 9, 2.4, 0xffffff, { cast: false });
      st.box(B.x - 6, B.y + 6, B.z - 6, 2.5, 1.2, 2.5, 0x222222, { cast: false });
      st.box(B.x - 6, B.y + 11.2, B.z - 6, 1.8, 1.4, 1.8, 0xfff2a0, { emissive: 0xffe680, ei: 1, cast: false });
      const bahiaLight = new THREE.DirectionalLight(0xffffff, 2); bahiaLight.position.set(B.x + 20, B.y + 40, B.z + 20); bahiaLight.target.position.copy(B); st.add(bahiaLight); st.add(bahiaLight.target);
      st.root.children.slice(bahiaStart).forEach(o => bahia.attach(o));

      api.npc('comissaria', 9.2, 1.7, { ambient: 'Estamos quase chegando em Salvador.', rot: -Math.PI / 2 });

      let sawWindow = false;
      api.interact({
        x: 2.8, z: -0.7, r: 1.6, label: 'Olhar pela janela', h: 2.4,
        onInteract: async () => {
          bahia.visible = true;
          await api.camTo(new THREE.Vector3(B.x + 22, B.y + 26, B.z + 30), new THREE.Vector3(B.x - 2, B.y + 3, B.z - 8), 2200);
          await api.thought('Bahia.');
          await api.wait(600);
          bahia.visible = false;
          await api.camTo(api.camera.position.clone().set(api.player.root.position.x, 10, api.player.root.position.z + 10.5), api.player.root.position.clone().setY(1.2), 1600);
          api.camFollow();
          sawWindow = true;
        },
      });

      api.interact({
        x: L + 1.2, z: -1.6, r: 1.5, label: 'Olhar no espelho',
        onInteract: async () => {
          const pl = api.player;
          pl.root.position.set(L + 0.8, 0, -1.3);
          pl.root.rotation.y = Math.PI;
          api.stopMusic();
          await api.camTo(new THREE.Vector3(L + 2.45, 2.4, 2.2), new THREE.Vector3(L + 0.95, 1.9, -2.68), 1800);
          await api.thought('...');
          await api.thought('Eu lembro.');
          api.flash(1200);
          await api.wait(300);
          api.swapPlayer(SECRET_KEY);
          api.sfx.reveal();
          await api.wait(1800);
          await api.thought('Sou eu.');
          await api.finishMemory();
          await api.screen(`<div class="reveal"><div class="small">Eu sou</div><div class="big">${SECRET_NAME.toUpperCase()}</div></div><div class="confetti"></div>`, { cls: 'party' });
          await api.screen(`<div class="placeholder"><div class="ph-icon">▶</div><div>Aqui entra o vídeo de ${SECRET_NAME}</div><small>(enviar o arquivo para incluir)</small></div>`);
          await api.screen(`<div class="placeholder msg"><div>Aqui entra a sua mensagem para ${SECRET_NAME}.</div><small>(texto a escrever)</small></div>`);
          await api.screen(`<div class="placeholder"><div class="grid">${'<i></i>'.repeat(12)}</div><div>Mosaico de fotos</div><small>(enviar as fotos)</small></div>`);
          await api.screen(`<div class="reveal"><div class="small">Feliz</div><div class="big long">Chapaternização<br>2026</div><div class="small">${SECRET_NAME}, o amigo secreto de Alice</div></div><div class="confetti"></div>`, { cls: 'party', wait: false });
        },
      });

      return {
        bounds: { minX: L + 0.3, maxX: R - 0.2, minZ: -2.5, maxZ: 2.5 },
        spawn: { x: 8.2, z: 0, rot: -Math.PI / 2 },
        camOffset: new THREE.Vector3(0, 8.5, 9.5),
        camClamp: { minX: L + 3, maxX: R - 5, minZ: 0, maxZ: 0 },
        background: 0x8ec9ff,
        music: 'calmo',
      };
    },
  },
];
