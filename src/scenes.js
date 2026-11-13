import * as THREE from 'three';
import { mat, BOX } from './world.js';
import { makeCat } from './chars.js';
import fotoMelhores from '../assets/melhores-grupo.jpg';
import fotoVale from '../assets/vale-piquenique.jpg';
import fotoAniversario from '../assets/aniversario-grupo.jpg';
import fotoPlacaNala from '../assets/formatura-placa-nala.jpg';
import fotoFormatura from '../assets/formatura-grupo.jpg';
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

// faz um personagem andar devagar por alguns pontos, parando um pouco em cada um.
// para quando o boneco chega perto, para não atrapalhar a conversa nem prender ninguém.
function wander(st, n, pts, { speed = 1.1, pause = [1.2, 3.2] } = {}) {
  let i = 0, wait = pause[0] + Math.random() * (pause[1] - pause[0]);
  const p = n.root.position;
  const rest = () => pause[0] + Math.random() * (pause[1] - pause[0]);
  st.updaters.push((dt) => {
    if (st.engine && st.engine.state.cutscene) return;
    const pl = st.engine && st.engine.player ? st.engine.player.root.position : null;
    if (pl && Math.hypot(pl.x - p.x, pl.z - p.z) < 1.7) { n.moving = false; return; }
    if (wait > 0) { wait -= dt; n.moving = false; return; }
    const [tx, tz] = pts[i];
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { i = (i + 1) % pts.length; wait = rest(); n.moving = false; return; }
    const step = Math.min(d, speed * dt);
    p.x += dx / d * step; p.z += dz / d * step;
    n.root.rotation.y = Math.atan2(dx, dz);
    n.moving = true;
    if (n.collider) { n.collider.minX = p.x - 0.4; n.collider.maxX = p.x + 0.4; n.collider.minZ = p.z - 0.4; n.collider.maxZ = p.z + 0.4; }
  });
}

// alterna poses de foto (gira o corpo e mexe os braços)
function poser(st, n, poses, every = 2.6) {
  const ch = n.ch; ch.holdArms = true;
  const { armL, armR } = ch.parts;
  let k = 0, t0 = Math.random() * every;
  st.updaters.push((dt) => {
    t0 += dt;
    if (t0 > every) { t0 = 0; k = (k + 1) % poses.length; }
    const ps = poses[k], f = Math.min(1, dt * 6);
    n.root.rotation.y += (ps.rot - n.root.rotation.y) * f;
    armR.rotation.x += ((ps.rx ?? 0) - armR.rotation.x) * f;
    armR.rotation.z += ((ps.rz ?? 0.05) - armR.rotation.z) * f;
    armL.rotation.x += ((ps.lx ?? 0) - armL.rotation.x) * f;
    armL.rotation.z += ((ps.lz ?? -0.05) - armL.rotation.z) * f;
  });
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

// pista escondida com foto: um objeto brilhando no chão; ao interagir, a foto aparece numa polaroide
function photoClue(st, api, { x, z, rot = 0, photo, caption, thought, kind = 'phone' }) {
  if (!photo) return; // sem a foto na pasta assets/, a pista não aparece
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; st.add(g);
  if (kind === 'camera') {
    const body = new THREE.Mesh(BOX, mat(0xc9ccd1)); body.scale.set(0.34, 0.2, 0.12); body.position.y = 0.1; body.castShadow = true; g.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 12), mat(0x3a3a3a)); lens.rotation.x = Math.PI / 2; lens.position.set(0.04, 0.1, 0.09); g.add(lens);
    const btn = new THREE.Mesh(BOX, mat(0x222222)); btn.scale.set(0.06, 0.02, 0.04); btn.position.set(-0.1, 0.21, 0); g.add(btn);
  } else {
    const ph = new THREE.Mesh(BOX, mat(0x1c1c22)); ph.scale.set(0.36, 0.04, 0.2); ph.position.y = 0.03; g.add(ph);
    const scr = new THREE.Mesh(BOX, mat(0x9fd3ff, { emissive: 0x6fb8ff, ei: 1.2 })); scr.scale.set(0.3, 0.01, 0.16); scr.position.y = 0.055; g.add(scr);
  }
  const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), mat(0xfff2b0, { emissive: 0xffe680, ei: 2 }));
  spark.position.set(x, 0.5, z); st.add(spark);
  st.updaters.push((dt, t) => { spark.rotation.y += dt * 3; spark.position.y = 0.5 + Math.sin(t * 3) * 0.08; spark.visible = Math.sin(t * 1.7) > -0.3; });
  api.interact({
    x, z, r: 1.3, h: 1.4, label: 'O que é isso?', once: false,
    onInteract: async () => {
      api.sfx.prompt();
      await api.screen(`<div class="polaroid"><img src="${photo}" alt=""><div class="cap">${caption}</div></div><div class="photo-thought">${thought}</div>`, { cls: 'photo' });
    },
  });
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
        sit: true, y: 0.1, rot: 0.8, ambient: 'SCOOOOOUT', ambientStyle: 'shout-sm', ambientR: 3.2,
        look: { shirt: 0xf3efe6, skirt: 0x161616, skirtLen: 'midi', pattern: 'vest', sleeveless: true },
        label: 'Falar com Lísis', once: false, lines: [{ text: 'SCOOOOOUT', style: 'shout' }],
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

      // pista escondida: um celular caído entre os puffs, com a foto daquela noite
      photoClue(st, api, { x: 5.15, z: 0.05, rot: 0.5, photo: fotoMelhores, caption: 'Melhores do Ano 2024', thought: 'Nossa... Queria lembrar quem eu sou.' });

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
      st.floor(-12, 12, -9, 9, 0x6dbb4a, { checker: 0x66b244, tile: 1.5 });
      lights(st, { sky: 0xcdeeff, ground: 0x4a7a2a, sun: 1.9, shadow: 16 });

      // mata em volta (só nos fundos e nas laterais, para não tapar a câmera)
      [[-11.6, -8], [-1, -8.4], [2.5, -8.6], [10.8, -8.2], [11.2, -4], [11.4, 0.5], [-11.7, 2], [-11.6, 6]].forEach(([x, z], i) => st.tree(x, z, { h: 2.4 + (i % 3) * 0.7, s: 0.9 + (i % 2) * 0.3 }));
      st.palm(-11.6, -3.5, 5.5); st.palm(9.6, -7.2, 6); st.palm(11.2, 4.5, 5);
      [[4.5, 8.6], [-3.5, 8.7]].forEach(([x, z]) => { st.box(x, 0, z, 1.4, 0.7, 0.9, 0x3f8f3a); st.box(x + 0.4, 0.5, z, 0.9, 0.5, 0.7, 0x4aa040); });

      // a grande árvore (com terra e folhas em volta)
      const TX = -5, TZ = -5.6;
      st.box(TX + 1.9, -0.17, TZ + 0.8, 4.2, 0.2, 4.2, 0x8a6a45, { cast: false });
      st.box(TX, 0, TZ, 1.3, 3.6, 1.3, 0x7a5a3c, { solid: true });
      const branch = (x1, y1, z1, x2, y2, z2, t) => rope(st, new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2), t, 0x6e5034);
      branch(TX, 3.4, TZ, TX - 2.4, 5.6, TZ - 1.2, 0.6);
      branch(TX, 3.4, TZ, TX + 2.6, 5.4, TZ - 0.8, 0.55);
      branch(TX, 3.6, TZ, TX + 0.4, 6.0, TZ - 2.0, 0.5);
      [[0, 5.6, -1.6, 4.4, 1.6, 3.6], [-2.6, 5.4, -1.0, 3.4, 1.4, 3.2], [2.4, 5.2, -0.6, 3.4, 1.4, 3.0], [0.2, 6.6, -1.8, 3.0, 1.1, 2.6], [-1.2, 5.0, 0.6, 2.4, 0.9, 1.8]].forEach(([dx, y, dz, w, h, d]) => st.box(TX + dx, y, TZ + dz, w, h, d, 0x3d8a33));

      // ponte de madeira saindo da árvore e atravessando o rio
      for (let x = TX - 0.8; x > -12; x -= 0.55) st.box(x, 2.6, TZ + 0.1, 0.45, 0.08, 1.0, 0xa77b4f);
      rope(st, new THREE.Vector3(TX - 0.6, 3.4, TZ - 0.45), new THREE.Vector3(-12, 3.3, TZ - 0.45), 0.05, 0xd9b26b);
      rope(st, new THREE.Vector3(TX - 0.6, 3.4, TZ + 0.65), new THREE.Vector3(-12, 3.3, TZ + 0.65), 0.05, 0xd9b26b);
      [-8.4, -11.2].forEach(x => { st.box(x, -0.6, TZ - 0.45, 0.2, 3.2, 0.2, 0x7a5a3c, { solid: true }); st.box(x, -0.6, TZ + 0.65, 0.2, 3.2, 0.2, 0x7a5a3c, { solid: true }); });
      for (let x = TX - 1.0; x > -12; x -= 1.1) { rope(st, new THREE.Vector3(x, 2.65, TZ - 0.45), new THREE.Vector3(x, 3.35, TZ - 0.45), 0.04, 0xd9b26b); rope(st, new THREE.Vector3(x, 2.65, TZ + 0.65), new THREE.Vector3(x, 3.35, TZ + 0.65), 0.04, 0xd9b26b); }

      // balanço de madeira num dos galhos (balança de um lado para o outro, de frente para a câmera de lado)
      branch(TX, 3.3, TZ, TX + 2.1, 4.15, TZ - 0.95, 0.38);
      const SW = new THREE.Vector3(TX + 1.95, 4.05, TZ - 0.95);
      const swing = new THREE.Group(); swing.position.copy(SW); st.add(swing);
      const swingLen = 3.45;
      [-0.38, 0.38].forEach(dz => { const r = new THREE.Mesh(BOX, mat(0xd9b26b)); r.scale.set(0.04, swingLen, 0.04); r.position.set(0, -swingLen / 2, dz); swing.add(r); });
      const seat = new THREE.Mesh(BOX, mat(0xa77b4f)); seat.scale.set(0.42, 0.08, 0.95); seat.position.set(0, -swingLen, 0); seat.castShadow = true; swing.add(seat);
      let swingT = 0, swinging = false;
      st.updaters.push((dt) => { swingT += dt; if (!swinging) swing.rotation.z = Math.sin(swingT * 1.3) * 0.05; });
      api.interact({
        x: SW.x + 0.9, z: SW.z, r: 1.4, label: 'Balançar', once: false,
        onInteract: async () => {
          const pl = api.player;
          swinging = true;
          pl.anim.mode = 'sit';
          pl.root.rotation.set(0, Math.PI / 2, 0);
          const start = performance.now();
          await new Promise(res => {
            const step = () => {
              const t = (performance.now() - start) / 1000;
              const amp = 0.6 * Math.min(1, t * 0.8) * Math.max(0, Math.min(1, 5 - t));
              const a = Math.sin(t * 2.3) * amp;
              swing.rotation.z = a;
              // o boneco acompanha o assento: mesma rotação e mesma posição no arco
              pl.root.position.set(SW.x + Math.sin(a) * swingLen, SW.y - Math.cos(a) * swingLen - 0.4, SW.z);
              pl.root.rotation.z = a;
              if (t < 5) requestAnimationFrame(step); else res();
            };
            step();
          });
          swinging = false;
          pl.root.rotation.set(0, Math.PI / 2, 0);
          pl.anim.mode = 'idle';
          pl.root.position.set(SW.x + 1.2, 0, SW.z);
        },
      });

      // rio ocupando toda a parte esquerda do mapa, com vitórias-régias; dá para entrar na água
      const FAR = -10.9;
      const bankPts = [[-9, -6.3], [-7, -6.2], [-5.6, -6.0], [-3.5, -5.6], [-1, -5.2], [1.5, -5.8], [4, -5.4], [6.5, -6.0], [9, -6.6]];
      const bank = (z) => {
        for (let i = 0; i < bankPts.length - 1; i++) {
          const [z1, x1] = bankPts[i], [z2, x2] = bankPts[i + 1];
          if (z >= z1 && z <= z2) return x1 + (x2 - x1) * (z - z1) / (z2 - z1);
        }
        return bankPts[bankPts.length - 1][1];
      };
      const waterMat = new THREE.MeshPhongMaterial({ color: 0x6a4f30, specular: 0xbfe0f0, shininess: 90, emissive: 0x241a0c });
      st.disposables.push(waterMat);
      for (let z = -9; z < 9; z += 0.75) {
        const bx = bank(z + 0.375);
        const w = bx - FAR;
        const m = st.box(FAR + w / 2, -0.12, z + 0.375, w, 0.15, 0.75, 0x5b4630, { cast: false });
        m.material = waterMat;
        const sky = st.box(FAR + w / 2, 0.035, z + 0.375, w, 0.01, 0.75, 0x9fd0ea, { cast: false, opacity: 0.3 });
        sky.receiveShadow = false;
        st.box(bx + 0.1, -0.05, z + 0.375, 0.3, 0.12, 0.75, 0x7a5a38, { cast: false });
      }
      for (let i = 0; i < 26; i++) {
        const z = -8.5 + (i * 0.71) % 17, x = FAR + 0.4 + ((i * 2.37) % 1) * (bank(z) - FAR - 0.8);
        st.box(x, 0.04, z, 0.7 + (i % 3) * 0.2, 0.01, 0.05, 0xcfe6f2, { cast: false, opacity: 0.5 });
      }
      // margem do outro lado
      st.box(-11.5, -0.1, 0, 1.4, 0.18, 18, 0x5ea83f, { cast: false });
      const pad = new THREE.CylinderGeometry(0.42, 0.42, 0.03, 10);
      const pads = [];
      for (let i = 0; i < 34; i++) {
        const z = -8.4 + ((i * 0.53) % 1) * 16.8 * 0.5 + (i % 2) * 8.4;
        const x = FAR + 0.5 + ((i * 0.618) % 1) * (bank(z) - FAR - 1.0);
        const p = new THREE.Mesh(pad, mat(i % 3 ? 0x6cb84a : 0x58a63a)); p.position.set(x, 0.06, z); p.scale.setScalar(0.8 + (i % 4) * 0.15); st.add(p); pads.push(p);
        if (i % 4 === 0) st.box(x + 0.1, 0.06, z, 0.16, 0.14, 0.16, 0xf7b6d2, { cast: false });
      }
      st.updaters.push((dt, t) => pads.forEach((p, i) => { p.position.y = 0.06 + Math.sin(t * 1.5 + i) * 0.01; }));

      // entrar na água: o boneco afunda até a cintura, anda mais devagar e faz ondinhas
      const rings = [];
      const ringGeo = new THREE.RingGeometry(0.3, 0.38, 20);
      let inWater = false, ringT = 0;
      st.updaters.push((dt) => {
        const pl = api.player;
        rings.forEach(r => { r.age += dt; r.mesh.scale.setScalar(1 + r.age * 2.2); r.mesh.material.opacity = Math.max(0, 0.6 - r.age * 0.5); });
        while (rings.length && rings[0].age > 1.2) { const r = rings.shift(); st.root.remove(r.mesh); r.mesh.material.dispose(); }
        if (!pl || api.state.cutscene) return;
        const p = pl.root.position;
        const now = p.x < bank(p.z) - 0.25 && p.x > FAR;
        if (now !== inWater) { inWater = now; if (now) api.sfx.splash(); st.flags.speedMul = now ? 0.55 : 1; }
        const targetY = inWater ? -0.62 : 0;
        p.y += (targetY - p.y) * Math.min(1, dt * 8);
        ringT += dt;
        if (inWater && ringT > 0.35) {
          ringT = 0;
          const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xe8f4fa, transparent: true, opacity: 0.6, depthWrite: false }));
          mesh.rotation.x = -Math.PI / 2; mesh.position.set(p.x, 0.07, p.z); st.add(mesh);
          rings.push({ mesh, age: 0 });
        }
      });

      // rede de escalada
      const x1 = 3.9, x2 = 8.4, zb = -4.4, zt = -7.2, yt = 5.2;
      [3.6, 8.7].forEach(x => { st.box(x, 0, zt - 0.2, 0.45, yt + 1.6, 0.45, 0x7a5a3c, { solid: true }); st.box(x, yt + 1.2, zt - 0.2, 1.8, 1.0, 1.6, 0x3d8a33); });
      const P = (u, v) => new THREE.Vector3(x1 + (x2 - x1) * u, 0.05 + (yt - 0.05) * v, zb + (zt - zb) * v);
      // trama em losango: duas famílias de cordas diagonais
      for (let c = -1; c <= 2.001; c += 0.14) {
        const a0 = Math.max(0, -c), a1 = Math.min(1, 1 - c);
        if (a1 - a0 > 0.02) rope(st, P(c + a0, a0), P(c + a1, a1), 0.06, 0xd9b26b);
        const b0 = Math.max(0, c - 1), b1 = Math.min(1, c);
        if (b1 - b0 > 0.02) rope(st, P(c - b0, b0), P(c - b1, b1), 0.06, 0xd9b26b);
      }
      rope(st, P(0, 1), P(1, 1), 0.08, 0xc9a25b);
      rope(st, P(0, 0), P(0, 1), 0.08, 0xc9a25b);
      rope(st, P(1, 0), P(1, 1), 0.08, 0xc9a25b);
      st.solid(x1 - 0.3, x2 + 0.3, zt - 0.5, zb - 0.5);

      // slackline amarrado no tronco da árvore até uma estaca de madeira, com uma leve barriga no meio
      const slA = new THREE.Vector3(TX + 0.66, 0.7, TZ + 0.35), slB = new THREE.Vector3(7.4, 0.62, -2.9);
      const SAG = 0.14;
      const slAt = (t) => { const p = slA.clone().lerp(slB, t); p.y -= SAG * 4 * t * (1 - t); return p; };
      for (let i = 0; i < 10; i++) rope(st, slAt(i / 10), slAt((i + 1) / 10), 0.05, 0x2f6fae);
      st.box(TX, 0.62, TZ, 1.36, 0.14, 1.36, 0x2f6fae, { cast: false }); // fita enrolada no tronco
      st.box(slB.x, 0, slB.z, 0.22, 0.75, 0.22, 0x7a5a3c, { solid: true });
      st.box(slB.x, 0.56, slB.z, 0.27, 0.1, 0.27, 0x2f6fae, { cast: false });

      // mesa de plástico e toalhas de praia
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 16), mat(0xf4f4f4)); tbl.position.set(3.4, 0.74, 2.2); tbl.castShadow = true; st.add(tbl);
      st.box(3.4, 0, 2.2, 0.12, 0.74, 0.12, 0xe8e8e8, { solid: true });
      st.box(3.2, 0.77, 2.0, 0.14, 0.32, 0.14, 0x2f9e44); st.box(3.6, 0.77, 2.4, 0.12, 0.22, 0.12, 0xffffff, { opacity: 0.8 });
      [[2.3, 2.2, Math.PI / 2], [4.5, 2.2, -Math.PI / 2], [3.4, 3.3, Math.PI]].forEach(([x, z, r]) => st.chair(x, z, r, 0xf2f2f2));
      const towel = (x, z, base, stripe) => { st.box(x, 0, z, 2.3, 0.03, 1.4, base, { cast: false }); for (let k = -1; k <= 1; k++) st.box(x + k * 0.7, 0.01, z, 0.18, 0.03, 1.4, stripe, { cast: false }); };
      towel(-1.4, 5.2, 0x2a5fb0, 0xffffff);
      towel(1.6, 5.3, 0xf4f4f4, 0xe0562c);
      st.box(-2.9, 0, 4.7, 0.5, 0.45, 0.3, 0x2b2b2b); st.box(0.2, 0, 6.3, 0.6, 0.3, 0.35, 0xf2c230); st.box(3.0, 0, 6.0, 0.25, 0.4, 0.25, 0xd7372f);

      // trilha e placa
      for (let i = 0; i < 6; i++) st.box(10.6 - i * 0.9, -0.17, 8.6 - i * 0.8, 1.3, 0.2, 1.1, 0xb08a5a, { cast: false });
      st.box(7.7, 0, 7.7, 0.15, 1.3, 0.15, 0x6b4a2b); st.box(9.5, 0, 7.7, 0.15, 1.3, 0.15, 0x6b4a2b);
      st.sign('VALE ENCANTADO', 8.6, 1.55, 7.75, 2.6, 0.65, { bg: '#7a5230', fg: '#fff4e0' });

      // quem pode ser identificado: Alice, Chinelo e Yasmim; Nanda sai aqui
      api.npc('alice', -1.9, 5.0, { sit: true, y: -0.35, rot: 0.2, look: { bikini: 0xff4f8b, shorts: true, pants: 0x1c1c1c } });
      api.npc('chinelo', 2.2, 5.1, { sit: true, y: -0.35, rot: -0.25, look: { bikini: 0xf8f8f8, shorts: true, pants: 0x1c1c1c } });

      // Yasmim andando no slackline
      const yas = api.npc('yasmim', slA.x + 2, slA.z, { solid: false, facePlayer: false, look: { bikini: 0xff8a1e, pants: 0x151515 } });
      yas.ch.holdArms = true;
      yas.ch.parts.armL.rotation.z = -1.6; yas.ch.parts.armR.rotation.z = 1.6;
      yas.moving = true;
      let yt2 = 0, dir = 1;
      st.updaters.push((dt, t) => {
        yt2 += dt * 0.09 * dir;
        if (yt2 > 0.85) dir = -1; else if (yt2 < 0.15) dir = 1;
        const p = slAt(yt2);
        yas.root.position.set(p.x, p.y + 0.03 + Math.sin(t * 6) * 0.02, p.z);
        yas.root.rotation.y = Math.atan2((slB.x - slA.x) * dir, (slB.z - slA.z) * dir);
        yas.root.rotation.z = Math.sin(t * 2.3) * 0.07;
      });

      // quem estava lá mas ainda não pode ser identificado (Breno, Dudão, Flora, Nala): bonecos cinza
      const grey = { name: '', label: 'Quem é?', once: false, lines: [{ who: 'thought', text: 'Ainda não sei quem é.' }] };
      api.npc('boneco', -0.6, 5.5, { ...grey, sit: true, y: -0.35, rot: 0 });
      api.npc('boneco', 1.0, 5.6, { ...grey, sit: true, y: -0.35, rot: 0.1 });
      api.npc('boneco', 2.3, 2.2, { ...grey, sit: true, y: 0.1, rot: Math.PI / 2 });
      api.npc('boneco', 4.5, 2.2, { ...grey, sit: true, y: 0.1, rot: -Math.PI / 2 });

      const nanda = api.npc('nanda', 6.2, -3.6, {
        label: 'Falar com Nanda', look: { bikini: 0xe8743b, shorts: true, pants: 0x6e1a24, shortsPattern: 0xff9a3c, hairStyle: 'ponytail' },
        lines: [{ text: 'Vamos subir comigo?' }],
        onInteract: async (n) => {
          const pl = api.player;
          n.collider.on = false;
          const v = 0.8;
          pl.root.position.copy(P(0.38, 0)).setY(0); pl.root.position.z += 0.25;
          n.root.position.copy(P(0.62, 0)).setY(0); n.root.position.z += 0.25;
          pl.root.rotation.y = Math.PI; n.root.rotation.y = Math.PI; n.moving = true;
          pl.anim.mode = 'climb'; n.ch.anim.mode = 'climb';
          const top1 = P(0.38, v), top2 = P(0.62, v);
          await Promise.all([
            api.tween(pl.root.position, { y: top1.y - 1.4, z: top1.z + 0.35 }, 3600),
            api.tween(n.root.position, { y: top2.y - 1.4, z: top2.z + 0.35 }, 3300),
          ]);
          await api.eliminate('nanda');
          await api.thought('Daqui de cima dá pra ver tudo.');
          await api.fade(1, 500);
          pl.anim.mode = 'idle'; n.ch.anim.mode = 'idle'; n.moving = false;
          pl.root.position.set(6.2, 0, -2.6); pl.root.rotation.y = 0;
          n.root.position.set(4.7, 0, -3.3); n.root.rotation.y = 0.3;
          n.collider.minX = 4.3; n.collider.maxX = 5.1; n.collider.minZ = -3.7; n.collider.maxZ = -2.9; n.collider.on = true;
          await api.fade(0, 500);
          await api.complete('Não sou Nanda. Mas subi junto.');
        },
      });
      nanda.ambient = 'Bora?';

      // pista escondida: uma câmera digital esquecida na grama, com a foto do piquenique
      photoClue(st, api, { x: 10.2, z: 1.6, rot: -0.6, kind: 'camera', photo: fotoVale, caption: 'Vale Encantado 2024', thought: 'Esse dia foi bom... Queria lembrar quem eu sou.' });

      api.exit(10.2, 7.4, { rotY: -2.36 });

      return {
        bounds: { minX: -11.6, maxX: 11.3, minZ: -8, maxZ: 8.6 },
        spawn: { x: 9.2, z: 6.6, rot: -2.36 },
        camClamp: { minX: -6.5, maxX: 4.5, minZ: -2.5, maxZ: 4.2 },
        background: 0x9fd8ff,
        fog: { color: 0x9fd8ff, near: 28, far: 60 },
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
      const X = 5.2, ZN = -3.8, ZS = 3.6;
      st.floor(-X, X, ZN, ZS, 0xe6e0d6, { checker: 0xdcd5c9, tile: 1 });
      // paredes com painel de madeira, como no salão das fotos
      st.room({ minX: -X, maxX: X, minZ: ZN, maxZ: ZS, h: 3.2, color: 0x8b4f2a });
      for (let x = -X + 0.6; x < X; x += 0.6) st.box(x, 0, ZN + 0.21, 0.04, 3.2, 0.02, 0x6e3c1e, { cast: false });
      for (let z = ZN + 0.6; z < ZS - 0.4; z += 0.6) st.box(X - 0.21, 0, z, 0.02, 3.2, 0.04, 0x6e3c1e, { cast: false });
      // a parede da cortina prateada é lisa e clara
      st.box(-X + 0.205, 0, (ZN + ZS) / 2, 0.02, 3.2, ZS - ZN - 0.4, 0xe8dcc8, { cast: false });
      lights(st, { hemi: 1.0, sun: 0.6, shadow: 9 });
      point(st, 0, 3.0, 0, 0xffe6c0, 5, 10);
      const shine = point(st, -3.4, 2.4, 0.4, 0xe4ecff, 3, 6);
      st.updaters.push((dt, t) => { shine.intensity = 2.6 + Math.sin(t * 2) * 0.8; });

      // mesa grande com o bolo; atrás dela, espelho do chão até 2,4 m e ar-condicionado em cima
      const TZ = -2.2, dz = TZ + 3.05;
      st.table(0, TZ, 3.8, 1.3, 0x8a5a3c);
      st.mirror(0, 1.2, ZN + 0.22, 2.4, 2.4, 0);
      st.box(0, 2.72, ZN + 0.36, 1.5, 0.38, 0.3, 0xffffff);
      st.box(0, 2.76, ZN + 0.52, 1.3, 0.04, 0.02, 0x9a9a9a, { cast: false });

      // o bolo começa inteiro; na abertura Clarice esbarra na mesa, um pedaço cai no chão e o andar de cima escorrega
      const CH = 0x5a3420, CR = 0xfff3e6, PK = 0xff6fa8, top = 0.85;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.03, 20), mat(0xffffff)); plate.position.set(-0.1, top + 0.015, -3.1 + dz); st.add(plate);
      [[-0.5, -3.35], [-0.08, -3.35], [0.34, -3.35], [-0.5, -2.95], [-0.08, -2.95]].forEach(([x, z]) => {
        st.box(x, top + 0.03, z + dz, 0.42, 0.36, 0.4, CH);
        st.box(x, top + 0.39, z + dz, 0.42, 0.06, 0.4, CR);
      });
      // pedaço da frente, que vai cair
      const piece = new THREE.Group(); piece.position.set(0.34, top + 0.03, -2.95 + dz); st.add(piece);
      st.box(0, 0, 0, 0.42, 0.36, 0.4, CH, { parent: piece });
      st.box(0, 0.36, 0, 0.42, 0.06, 0.4, CR, { parent: piece });
      // o que fica na mesa depois do esbarrão
      const leftovers = new THREE.Group(); leftovers.visible = false; st.add(leftovers);
      st.box(0.36, top + 0.03, -2.92 + dz, 0.3, 0.16, 0.26, CH, { parent: leftovers });
      st.box(-0.29, top + 0.12, -2.73 + dz, 0.2, 0.22, 0.04, CR, { cast: false, parent: leftovers });
      st.box(0.12, top + 0.2, -2.73 + dz, 0.12, 0.16, 0.04, CR, { cast: false, parent: leftovers });
      // andar de cima (em pé no começo, escorrega depois)
      const tierG = new THREE.Group(); tierG.position.set(-0.08, top + 0.45, -3.2 + dz); st.add(tierG);
      st.box(0, 0, 0, 0.7, 0.28, 0.5, CH, { parent: tierG });
      st.box(0, 0.28, 0, 0.7, 0.05, 0.5, CR, { parent: tierG });
      [[-0.2, 0.1], [0.05, -0.12], [0.22, 0.12]].forEach(([x, z]) => st.box(x, 0.33, z, 0.08, 0.08, 0.08, PK, { cast: false, parent: tierG }));
      [[-0.45, -3.42], [-0.2, -3.42], [-0.6, -3.15]].forEach(([x, z]) => st.box(x, top + 0.45, z + dz, 0.08, 0.08, 0.08, PK, { cast: false }));
      // velas de número "19", na frente do bolo
      const DIG = { '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'], '9': ['XXX', 'X.X', 'XXX', '..X', 'XXX'] };
      const flames = [];
      const V = 0.08;
      [['1', -0.66], ['9', -0.34]].forEach(([d, x0]) => {
        DIG[d].forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'X') st.box(x0 + c * V, top + 0.45 + (4 - r) * V, -2.86 + dz, V, V, 0.06, 0xf2c230, { cast: false, emissive: 0x6a4a00, ei: 0.4 }); }));
        flames.push(st.box(x0 + V, top + 0.45 + 5 * V + 0.02, -2.86 + dz, 0.06, 0.1, 0.06, 0xffb02e, { emissive: 0xff9a1e, ei: 2, cast: false }));
      });
      const candleLight = point(st, -0.4, top + 1.1, -2.8 + dz, 0xffa64d, 2, 4);
      st.updaters.push((dt, t) => { flames.forEach((f, i) => { f.scale.y = 0.1 * (1 + Math.sin(t * 17 + i) * 0.25); }); candleLight.intensity = 1.8 + Math.sin(t * 13) * 0.4; });
      // docinhos numa bandeja e copos nas pontas da mesa
      st.box(-1.35, top, TZ, 0.7, 0.03, 0.5, 0xf4f4f4, { cast: false });
      for (let i = 0; i < 8; i++) st.box(-1.6 + (i % 4) * 0.16, top + 0.03, TZ - 0.1 + Math.floor(i / 4) * 0.2, 0.1, 0.09, 0.1, i % 3 ? 0x3a2216 : 0xf7e7c6, { cast: false });
      [[1.2, -0.2], [1.45, -0.05], [1.3, 0.2], [1.6, 0.25]].forEach(([x, z], i) => st.box(x, top, TZ + z, 0.11, 0.17, 0.11, i % 2 ? 0xd7262e : 0xff8fc7, { cast: false }));
      // bagunça no chão (aparece quando o pedaço cai)
      const mess = new THREE.Group(); mess.visible = false; st.add(mess);
      const chunk1 = st.box(0.75, 0, -1.25, 0.42, 0.34, 0.38, CH, { parent: mess }); chunk1.rotation.set(0.25, 0.6, 0.35);
      const chunk2 = st.box(1.15, 0, -0.95, 0.3, 0.22, 0.26, CH, { parent: mess }); chunk2.rotation.set(-0.3, 0.2, 0.5);
      st.box(0.9, 0, -1.1, 0.9, 0.02, 0.7, CR, { cast: false, parent: mess });
      for (let i = 0; i < 14; i++) st.box(0.3 + ((i * 0.37) % 1) * 1.3, 0, -1.6 + ((i * 0.61) % 1) * 1.0, 0.07, 0.05, 0.07, i % 3 ? CH : PK, { cast: false, parent: mess });

      // painel "FLORA FAZ 19" num cavalete, com balões
      st.box(-3.1, 0, -3.0, 0.08, 1.0, 0.08, 0x6b4a2b);
      st.box(-3.1, 0, -2.75, 0.06, 1.0, 0.06, 0x6b4a2b);
      st.sign('FLORA\nFAZ 19', -3.1, 1.6, -2.95, 1.6, 1.1, { bg: '#ff4fa0', fg: '#fff4e0', border: '#f2c230' });
      const cols = [0xff4fa0, 0x4fd8ff, 0xffd34f, 0x9b59b6, 0x2ecc71];
      [[-4.3, -3.3], [-4.5, -2.8], [3.6, -3.3], [3.9, -2.9], [4.7, -0.5]].forEach(([x, z], i) => balloon(st, x, z, cols[i % cols.length], 2.2 + (i % 3) * 0.3));

      // cortina prateada para fotos na parede da esquerda
      const tinsel = [];
      const tm = [0x7d8592, 0xaab2be, 0xdfe4ec, 0x949cab, 0xf2f4f8, 0xc3c9d3].map(c => new THREE.MeshPhongMaterial({ color: c, specular: 0xffffff, shininess: 200, emissive: 0xffffff, emissiveIntensity: 0.02 }));
      tm.forEach(m => st.disposables.push(m));
      for (let layer = 0; layer < 2; layer++) for (let z = -2.6; z <= 2.6; z += 0.06) {
        const m = new THREE.Mesh(BOX, tm[(Math.random() * tm.length) | 0]);
        m.scale.set(0.02, 2.75, 0.045); m.position.set(-X + 0.28 + layer * 0.1, 0.05 + 1.375, z); st.add(m); tinsel.push(m);
      }
      st.box(-X + 0.32, 2.85, 0, 0.12, 0.08, 5.4, 0xd0d4dc);
      // cintilância: cada grupo de franjas acende de leve em momentos diferentes
      st.updaters.push((dt, t) => {
        tinsel.forEach((m, i) => { m.rotation.x = Math.sin(t * 1.6 + i * 0.7) * 0.035; });
        tm.forEach((m, i) => { m.emissiveIntensity = 0.02 + 0.55 * Math.pow(Math.max(0, Math.sin(t * 2.4 + i * 1.3)), 8); });
      });
      // estrelinhas de brilho que aparecem e somem pela cortina
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
      st.disposables.push(glintMat);
      const glints = [];
      const placeGlint = (gl) => gl.g.position.set(-X + 0.44, 0.3 + Math.random() * 2.4, -2.5 + Math.random() * 5.0);
      for (let i = 0; i < 16; i++) {
        const g = new THREE.Group();
        [[0.16, 0.025], [0.025, 0.16]].forEach(([h, d]) => { const m = new THREE.Mesh(BOX, glintMat); m.scale.set(0.01, h, d); g.add(m); });
        const gl = { g, ph: Math.random() * Math.PI * 2, sp: 1.6 + Math.random() * 1.6 };
        placeGlint(gl); st.add(g); glints.push(gl);
      }
      st.updaters.push((dt) => glints.forEach(gl => {
        gl.ph += dt * gl.sp;
        if (gl.ph > Math.PI * 2) { gl.ph -= Math.PI * 2; placeGlint(gl); }
        const k = Math.pow(Math.max(0, Math.sin(gl.ph)), 4);
        gl.g.scale.setScalar(Math.max(0.001, k));
        gl.g.rotation.x = gl.ph * 0.5;
      }));

      // mesa redonda com cadeiras
      const RT = new THREE.Vector3(2.0, 0, 2.5);
      const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 18), mat(0xf1ede6)); rt.position.set(RT.x, 0.78, RT.z); rt.castShadow = true; st.add(rt);
      st.box(RT.x, 0, RT.z, 0.12, 0.78, 0.12, 0x6b4a2b);
      st.solid(RT.x - 0.65, RT.x + 0.65, RT.z - 0.65, RT.z + 0.65);
      st.box(RT.x + 0.1, 0.81, RT.z - 0.1, 0.14, 0.2, 0.14, 0xffffff, { opacity: 0.8 });
      const seats = [[RT.x - 1.0, RT.z, Math.PI / 2], [RT.x + 1.0, RT.z, -Math.PI / 2], [RT.x, RT.z - 1.0, 0]];
      seats.forEach(([x, z, r]) => st.chair(x, z, r, 0x6b4a2b));

      // quem estava lá mas ainda não pode ser identificado (Breno, Dudão, Nala): bonecos cinza na mesa
      const grey = { name: '', label: 'Quem é?', once: false, lines: [{ who: 'thought', text: 'Ainda não sei quem é.' }] };
      seats.slice(0, 3).forEach(([x, z, r]) => api.npc('boneco', x, z, { ...grey, sit: true, y: 0.1, rot: r }));

      // fantasias (as de personagens de anime e série não são desenhadas; cada pessoa aparece com a roupa por baixo)
      const coro = [
        api.npc('hanna', -3.0, -0.6, { look: { shirt: 0xff8fc7, skirt: 0xff8fc7, skirtLen: 'short', sleeveless: true, wingColor: 0xff8fc7 }, extras: ['wings'], ambientR: 2.2, ambient: 'Clarice matou o bolo!' }),
        api.npc('analuz', 3.4, -1.0, { look: { shirt: 0xa3161f, skirt: 0xa3161f, skirtLen: 'short', strapless: true, sleeveless: true, socks: 0xf5f5f5, shoes: 0xc0392b, headbandColor: 0xc0182a }, extras: ['headband', 'bloodmarks'], ambientR: 2.2, ambient: 'Clarice matou o bolo!' }),
        api.npc('nanda', -1.9, 0.4, { dance: true, look: { shirt: 0xf8f6f0, pants: 0xf8f6f0, sleeveless: true, streaks: 0xe8d27a, wingColor: 0xffffff }, extras: ['wings'], ambientR: 2.2, ambient: 'Clarice matou o bolo!' }),
        api.npc('yasmim', 2.5, 0.5, { look: { bikini: 0xff7eb6, shorts: true, pants: 0x5b7fb5, hairStyle: 'braids', bandanaColor: 0xff5fa2 }, extras: ['bandana'], ambientR: 2.2, ambient: 'CLARICE MATOU O BOLO!' }),
      ];
      const alice = api.npc('alice', -3.7, 0.7, { rot: 0.45, facePlayer: false, look: { shirt: 0x151515, pants: 0x151515, sleeveless: true, kimono: 0xf4c542 } });
      // Chinelo: blazer preto, blusa branca, short preto, meia arrastão e argolas, como na foto em grupo
      const chinelo = api.npc('chinelo', -3.8, 2.3, { rot: 0.35, facePlayer: false, look: { shirt: 0xf8f6f0, jacket: 0x161616, pants: 0x161616, shorts: true, fishnet: true, shoes: 0x161616 }, extras: ['hoops'] });
      const clarice = api.npc('clarice', 3.0, -0.2, { ambient: 'Socorro!', ambientStyle: 'shout-sm' });

      // ninguém fica parado: Clarice anda aflita perto do bolo, o pessoal circula, Nanda dança,
      // Hanna flutua e Alice e Chinelo trocam de pose na cortina
      wander(st, clarice, [[2.4, -1.0], [2.2, -0.4], [1.7, -0.8]], { speed: 1.6, pause: [0.4, 1.2] });
      wander(st, coro[1], [[4.2, -0.4], [3.9, 0.4], [3.4, -1.0]]);
      wander(st, coro[3], [[1.4, 0.9], [0.6, 0.7], [2.5, 0.5]]);
      wander(st, coro[0], [[-2.4, -1.2], [-3.0, -0.6]], { speed: 0.8 });
      st.updaters.push((dt, t) => { coro[0].root.position.y = 0.1 + Math.sin(t * 2.2) * 0.08; });
      poser(st, alice, [{ rot: 0.45, rx: -2.8, rz: 0.2 }, { rot: 1.0, lz: -0.7, rz: 0.7 }, { rot: 0.1, rx: -1.4, lx: -1.4 }]);
      poser(st, chinelo, [{ rot: 0.35, lz: -0.6 }, { rot: 0.9, rx: -2.8, rz: 0.15 }, { rot: -0.1, rz: 0.6, lz: -0.6 }], 3.1);

      api.interact({
        x: 0.6, z: -1.2, r: 1.6, label: 'Ver o bolo',
        onInteract: async () => {
          await api.say([
            { who: coro[0], text: 'Clarice matou o bolo!', sim: [{ who: coro[1], text: 'Clarice matou o bolo!' }, { who: coro[3], text: 'CLARICE MATOU O BOLO!' }] },
            { who: clarice, text: 'Socorro!', style: 'shout' },
          ]);
        },
      });

      // Flora, a aniversariante, de jaqueta de couro
      const flora = api.npc('flora', -1.1, -3.2, {
        rot: 0, r: 2.6, label: 'Falar com a aniversariante',
        look: { shirt: 0x2a2a2a, pants: 0x3d5a8a, jacket: 0x161616 }, extras: ['bat'],
        lines: [{ text: 'Meu bolo...' }],
        onInteract: async () => { await api.eliminate('flora'); await api.complete('Não sou Flora. Mas lembro desse bolo.'); },
      });
      wander(st, flora, [[-1.5, -3.2], [-1.0, -3.2]], { speed: 0.5, pause: [2, 4] });
      // easter egg: celular caído perto da cortina com a foto em grupo da festa
      photoClue(st, api, { x: -2.4, z: 3.0, rot: 0.4, photo: fotoAniversario, caption: 'Aniversário de Flora 2021', thought: 'Que festa... Queria lembrar quem eu sou.' });
      api.exit(X - 0.45, 2.9, { rotY: -Math.PI / 2, w: 1.4 });

      return {
        bounds: { minX: -X + 0.6, maxX: X - 0.4, minZ: ZN + 0.4, maxZ: ZS - 0.4 },
        spawn: { x: X - 1.2, z: 2.9, rot: -Math.PI / 2 },
        camOffset: new THREE.Vector3(0, 7.2, 9.2),
        camLook: new THREE.Vector3(0, 1.0, -1.0),
        camClamp: { minX: -1.2, maxX: 1.2, minZ: -0.3, maxZ: 0.3 },
        background: 0x1a1428,
        music: 'festa',
        onEnter: async () => {
          const { tween, wait, sfx } = api;
          await api.camTo(new THREE.Vector3(0.6, 7.2, 2.3), new THREE.Vector3(0.6, 0.9, -2.3), 900);
          // Clarice vai até a mesa e esbarra
          await api.walkNpc(clarice, 1.75, -1.2, 2.4);
          clarice.root.rotation.y = clarice.baseRot = Math.PI + 0.3;
          await tween(clarice.root.position, { z: -1.32 }, 120);
          sfx.bump();
          tween(clarice.root.position, { z: -1.2 }, 200);
          // o bolo balança, o andar de cima escorrega e o pedaço da frente cai
          tween(tierG.rotation, { z: -0.32 }, 450);
          tween(tierG.position, { x: 0.15, y: top + 0.42 }, 450);
          await tween(piece.position, { z: piece.position.z + 0.45 }, 280);
          await tween(piece.rotation, { x: 0.9 }, 180);
          tween(piece.rotation, { x: 2.2, y: 0.6, z: 0.35 }, 380);
          await tween(piece.position, { x: 0.75, y: 0.05, z: -1.25 }, 380, 'in');
          piece.visible = false; mess.visible = true; leftovers.visible = true;
          sfx.splat();
          await wait(350);
          const kk = 'KKKKKKKKKKKKKKK';
          await api.say([
            { who: coro[0], text: kk, sim: [coro[1], coro[2], coro[3], alice, chinelo].map(w => ({ who: w, text: kk })) },
            { who: flora, text: 'PUTA QUE PARIUUU', style: 'shout', sfx: 'scream' },
            { who: clarice, text: 'Socorro!', style: 'shout' },
          ]);
          if (clarice.collider) clarice.collider.on = true;
          api.camFollow();
        },
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
      // quem já saiu da lista (Chinelo, Flora, Yasmim, Nanda e Lísis não foram)
      api.npc('hanna', -4, 1.2, { dance: true, extras: ['abada'] });
      api.npc('analuz', -2.6, 2.6, { dance: true, extras: ['abada'] });
      // estavam lá mas ainda não dá para saber quem são (Nala e Breno)
      const grey = { name: '', label: 'Quem é?', once: false, lines: [{ who: 'thought', text: 'Ainda não sei quem é.' }] };
      api.npc('boneco', -5.4, 2.8, { ...grey, dance: true, extras: ['abada'] });
      api.npc('boneco', -3.4, -0.6, { ...grey, dance: true, extras: ['abada'] });

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
    id: 'formatura', door: '2026', title: 'Formatura', place: 'Festa de formatura', color: 0x0f4d3a,
    eliminates: ['nala'],
    build(st, api) {
      st.engine = api;
      // festa de formatura (baile), pela planta: palco com cantor no fundo, pista de dança no meio
      // e, na frente, a mesa de outro convidado (esquerda) e a mesa de Nala com a placa (direita)
      const X = 9, ZN = -8.4, ZS = 7;
      st.floor(-X, X, ZN, ZS, 0x2a2a31, { checker: 0x24242a, tile: 1.2 });
      st.room({ minX: -X, maxX: X, minZ: ZN, maxZ: ZS, h: 4.6, color: 0x1b2450 });
      lights(st, { sky: 0xb0b8ff, ground: 0x3a3048, hemi: 1.25, sun: 0.6, shadow: 12 });

      // colunas brancas com luz quente embaixo
      [-4.2, 0, 4.2].forEach(z => [-1, 1].forEach(sd => {
        st.box(sd * (X - 0.5), 0, z, 0.6, 4.6, 0.6, 0xf1ece2, { solid: true });
        point(st, sd * (X - 1.0), 0.5, z, 0xffa040, 3, 3.5);
      }));

      // palco
      st.box(0, 0, -7.3, 13, 0.7, 2.6, 0x15151c, { solid: true });
      st.box(0, 0.62, -5.98, 13, 0.08, 0.04, 0x7a5cff, { emissive: 0x7a5cff, ei: 1.6, cast: false });
      st.sign('FORMATURA', 0, 2.7, ZN + 0.25, 4.4, 1.5, { bg: '#0f4d3a', fg: '#ffffff', border: '#7fe0b0' });
      [-1, 1].forEach(sd => st.sign('2025.2', sd * 4.8, 2.5, ZN + 0.25, 2.2, 1.3, { bg: '#0f4d3a', fg: '#ffffff', border: '#7fe0b0' }));
      st.box(0, 4.25, -6.6, 13.2, 0.16, 0.16, 0x2b2b2b, { cast: false });
      [-1, 1].forEach(sd => st.box(sd * 6.5, 0.7, -6.6, 0.16, 3.6, 0.16, 0x2b2b2b));

      // fachos de luz coloridos varrendo a pista
      const beamCols = [0x3b5bff, 0x2ee86a, 0xd4ff3a, 0x9b4dff, 0x2ee86a, 0x3b5bff];
      const beams = beamCols.map((c, i) => {
        const geo = new THREE.ConeGeometry(0.75, 7.5, 16, 1, true); geo.translate(0, -3.75, 0);
        const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        st.disposables.push(geo, m);
        const cone = new THREE.Mesh(geo, m); cone.position.set(-5.5 + i * 2.2, 4.1, -6.6); st.add(cone);
        st.box(cone.position.x, 3.95, -6.6, 0.3, 0.3, 0.3, 0x111111, { cast: false });
        return cone;
      });
      const washes = [point(st, -4, 3.4, -4.2, 0x3b5bff, 9, 12), point(st, 4, 3.4, -4.2, 0x2ee86a, 9, 12), point(st, 0, 3.8, -1.5, 0x9b4dff, 7, 12)];
      st.updaters.push((dt, t) => {
        beams.forEach((b, i) => { b.rotation.x = -(0.55 + Math.sin(t * 0.9 + i) * 0.3); b.rotation.z = Math.sin(t * 0.7 + i * 1.3) * 0.6; });
        washes.forEach((l, i) => { l.intensity = 6 + Math.sin(t * 2.2 + i * 2) * 4; });
      });

      // roupas de festa: mulheres de vestido, homens de roupa social
      const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x6b3e26, 0xd9a77c];
      const suits = [0x151515, 0x1c2340, 0x2a2a2a];
      const gowns = [0x0f4d3a, 0x8e1b2c, 0x1c2340, 0xc9a24a, 0x5b2a6e, 0x111111, 0xd98fa6];
      const man = (i) => ({ skin: skins[i % 6], hair: 0x1a120c, hairStyle: 'short', shirt: 0xf2f2f2, jacket: suits[i % 3], pants: suits[i % 3], shoes: 0x111111 });
      const woman = (i) => ({ skin: skins[(i + 2) % 6], hair: [0x1a120c, 0x3a2216, 0x6b4226][i % 3], hairStyle: ['long', 'bun', 'long', 'curly'][i % 4], shirt: gowns[i % 7], skirt: gowns[i % 7], sleeveless: true, shoes: 0x222222 });
      const dress = (c, more = {}) => ({ shirt: c, skirt: c, sleeveless: true, shoes: 0x222222, ...more });

      // banda no palco: cantor, guitarrista, baterista e duas dançarinas
      api.npc('extra', 0, -6.7, { y: 0.7, dance: true, facePlayer: false, solid: false, look: { skin: 0xc68642, hair: 0x1a120c, hairStyle: 'short', shirt: 0x151515, pants: 0x151515, shoes: 0x111111 }, extras: ['mic'] });
      const gt = api.npc('extra', -3.0, -7.2, { y: 0.7, facePlayer: false, solid: false, look: { skin: 0xe0ac69, hair: 0x2a1a10, hairStyle: 'short', shirt: 0x2a2a2a, pants: 0x151515 } });
      gt.ch.holdArms = true; gt.ch.parts.armR.rotation.x = -0.7; gt.ch.parts.armL.rotation.x = -1.0;
      const guitar = new THREE.Group(); guitar.position.set(0, -0.12, 0.26); guitar.rotation.z = 0.55; gt.ch.parts.torso.add(guitar);
      const gb = new THREE.Mesh(BOX, mat(0xb03030)); gb.scale.set(0.42, 0.5, 0.1); gb.position.y = -0.1; guitar.add(gb);
      const gn = new THREE.Mesh(BOX, mat(0x2a1a10)); gn.scale.set(0.07, 0.7, 0.05); gn.position.y = 0.48; guitar.add(gn);
      // bateria
      const DX = 3.2, DZ = -7.6;
      const drum = (x, y, z, r, h, c, rx = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mat(c)); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; st.add(m); return m; };
      drum(DX, 1.05, DZ + 0.55, 0.36, 0.3, 0x1c2340, Math.PI / 2);
      drum(DX - 0.45, 1.25, DZ + 0.45, 0.17, 0.16, 0xe8e8e8);
      drum(DX + 0.4, 1.35, DZ + 0.45, 0.16, 0.16, 0x1c2340);
      drum(DX - 0.65, 1.75, DZ + 0.25, 0.25, 0.02, 0xd4b04a);
      drum(DX + 0.7, 1.8, DZ + 0.2, 0.25, 0.02, 0xd4b04a);
      st.box(DX - 0.65, 0.7, DZ + 0.25, 0.03, 1.05, 0.03, 0x777777); st.box(DX + 0.7, 0.7, DZ + 0.2, 0.03, 1.1, 0.03, 0x777777);
      st.box(DX, 0.7, DZ - 0.25, 0.4, 0.45, 0.4, 0x222222);
      api.npc('extra', DX, DZ - 0.25, { y: 0.8, sit: true, facePlayer: false, solid: false, look: man(4) });
      [-5.2, 5.2].forEach((x, i) => api.npc('extra', x, -6.9, { y: 0.7, dance: true, facePlayer: false, solid: false, look: dress(0x0f6a4a, { skin: skins[i + 1], hair: 0x1a120c, hairStyle: 'long' }) }));

      // pista de dança: convidados
      const floorSpots = [[-6.4, -4.8], [-4.6, -4.0], [-3.0, -5.0], [-1.6, -4.4], [1.8, -4.9], [3.4, -4.2], [5.0, -5.0], [6.6, -4.0], [-6.8, -2.0], [-5.0, -1.2], [5.2, -1.6], [6.9, -2.6]];
      floorSpots.forEach(([x, z], i) => {
        const n = api.npc('extra', x, z, { dance: true, facePlayer: false, look: i % 2 ? man(i) : woman(i) });
        n.ch.anim.t = i * 0.41;
      });

      // mesas: decoração com toalha escura, sousplat verde com flores brancas, guardanapo rosa, taças e arranjos de flores
      const pm = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d'); g.fillStyle = '#0f4d3a'; g.fillRect(0, 0, 128, 128);
        g.strokeStyle = '#e9f5ee'; g.lineWidth = 3;
        [[34, 40], [92, 86], [88, 30], [30, 98]].forEach(([cx, cy]) => { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 8, 4, a, 0, Math.PI * 2); g.stroke(); } });
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
        const m = new THREE.MeshLambertMaterial({ map: tex }); st.disposables.push(tex, m); return m;
      })();
      const mkTable = (tx, tz, len) => {
        st.table(tx, tz, 1.3, len, 0x1d1d22);
        const seats = [];
        const n = Math.floor(len / 0.85);
        for (let k = 0; k < n; k++) {
          const z = tz - len / 2 + 0.45 + k * ((len - 0.9) / Math.max(1, n - 1));
          [-1, 1].forEach(sd => {
            const mm = new THREE.Mesh(BOX, pm); mm.scale.set(0.42, 0.012, 0.5); mm.position.set(tx + sd * 0.38, 0.856, z); st.add(mm);
            st.box(tx + sd * 0.4, 0.86, z + 0.13, 0.13, 0.05, 0.16, 0xf4a6b8, { cast: false });
            st.box(tx + sd * 0.22, 0.85, z - 0.16, 0.06, 0.17, 0.06, 0xdfe8ef, { opacity: 0.5, cast: false });
            st.chair(tx + sd * 1.05, z, sd < 0 ? Math.PI / 2 : -Math.PI / 2, 0x151515);
            seats.push([tx + sd * 1.05, z, sd < 0 ? Math.PI / 2 : -Math.PI / 2]);
          });
        }
        [-len / 4, len / 4].forEach(dz2 => {
          const cz = tz + dz2;
          st.box(tx, 0.85, cz, 0.14, 0.3, 0.14, 0xdfe8ef, { opacity: 0.6, cast: false });
          for (let k = 0; k < 9; k++) st.box(tx + Math.cos(k * 2.4) * 0.14 * (k % 3), 1.12 + (k % 3) * 0.06, cz + Math.sin(k * 2.4) * 0.14 * (k % 3), 0.13, 0.13, 0.13, k % 4 ? 0xffffff : 0xf4d6e0, { cast: false });
        });
        // luz quente do lustre em cima da mesa
        point(st, tx, 3.3, tz, 0xffd9a0, 4, 6);
        return seats;
      };
      const guestSeats = mkTable(-4.0, 3.6, 3.4);
      const nalaSeats = mkTable(4.0, 3.6, 5.0);
      // placa com a foto de Nala na mesa dela
      st.box(4.0, 0.85, 3.6, 0.06, 1.35, 0.06, 0x9a9a9a);
      st.box(4.0, 2.2, 3.6, 1.0, 1.36, 0.04, 0xf4f4f4);
      if (fotoPlacaNala) {
        const tex = new THREE.TextureLoader().load(fotoPlacaNala); tex.colorSpace = THREE.SRGBColorSpace;
        const pmat = new THREE.MeshBasicMaterial({ map: tex }); st.disposables.push(tex, pmat);
        const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 1.3), pmat); ph.position.set(4.0, 2.88, 3.63); st.add(ph);
      }
      // convidados da outra mesa
      guestSeats.slice(0, 5).forEach(([x, z, r], i) => api.npc('extra', x, z, { sit: true, y: 0.1, rot: r, facePlayer: false, look: i % 2 ? man(i + 1) : woman(i + 3) }));

      // a chapa (todo mundo foi)
      const grey = { name: '', label: 'Quem é?', once: false, lines: [{ who: 'thought', text: 'Ainda não sei quem é.' }] };
      api.npc('flora', -1.4, -2.0, { dance: true, look: dress(0xc0182a) });
      api.npc('hanna', 1.5, -1.9, { dance: true, look: dress(0x8a5a3a) });
      api.npc('alice', 2.5, -3.0, { dance: true, look: dress(0xb9a3d6) });
      api.npc('lisis', -0.6, -3.6, { dance: true, look: dress(0xf2f2f2, { longSleeves: true }) });
      api.npc('analuz', -2.6, -3.1, { dance: true, look: dress(0x1c2a5a) });
      api.npc('yasmim', 1.0, -3.9, { dance: true, look: dress(0x6e1a2e) });
      api.npc('nanda', nalaSeats[2][0], nalaSeats[2][1], { sit: true, y: 0.1, rot: nalaSeats[2][2], facePlayer: false, look: dress(0xe8d3a8) });
      api.npc('chinelo', nalaSeats[5][0], nalaSeats[5][1], { sit: true, y: 0.1, rot: nalaSeats[5][2], facePlayer: false, look: dress(0x151515) });
      // ainda sem rosto: Breno, de terno
      api.npc('boneco', 3.4, -2.2, { ...grey, dance: true, look: { jacket: 0x5f5f5f, shirt: 0xbdbdbd } });
      // Dudão procurando Nala pelo salão
      const dudao = api.npc('dudao', -5.5, 0.4, { ambient: 'Cadê a Balena?', look: dress(0x111111, { hairStyle: 'long' }), extras: ['chain'], lines: [{ text: 'Cadê a Balena?' }], label: 'Falar com Dudão', once: false });
      wander(st, dudao, [[-1.2, 0.8], [5.8, 0.4], [1.0, 0.9], [-5.8, 0.5]], { speed: 1.2, pause: [0.8, 2.0] });

      // Nala, a formanda, de vestido verde de cetim, dançando no meio da pista
      const nala = api.npc('nala', 0.1, -2.6, {
        dance: true, r: 2.2, label: 'Falar com a formanda',
        look: dress(0x0f5a42, { strapless: true, hairStyle: 'bun', shoes: 0x0f5a42 }),
        lines: [{ text: 'AAAAAAAAAAAAAAAAAAAAA', style: 'shout', sfx: 'scream' }],
        onInteract: async () => {
          api.sfx.applause();
          await api.eliminate('nala');
          await api.complete('Não era a minha formatura.');
        },
      });
      // bottons no peito
      [[-0.16, 0.12, 0xd7372f], [0.0, 0.18, 0x3fa7d6], [0.15, 0.1, 0xf2c230], [-0.04, 0.03, 0x7fe0b0]].forEach(([x, y, c]) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), mat(c)); b.rotation.x = Math.PI / 2; b.position.set(x, y, 0.2); nala.ch.parts.torso.add(b);
      });
      nala.facePlayer = false;

      // easter egg: celular caído perto da coluna da esquerda com a foto em grupo da festa
      photoClue(st, api, { x: -7.5, z: 2.0, rot: 0.7, photo: fotoFormatura, caption: 'Formatura 2026', thought: 'Todo mundo tão feliz... Queria lembrar quem eu sou.' });

      api.exit(X - 0.45, 5.6, { rotY: -Math.PI / 2 });
      st.flags.danceIdle = true;

      return {
        bounds: { minX: -X + 0.7, maxX: X - 0.7, minZ: -5.6, maxZ: ZS - 0.5 },
        spawn: { x: 0, z: 5.8, rot: Math.PI },
        camClamp: { minX: -3.5, maxX: 3.5, minZ: -3, maxZ: 1.5 },
        background: 0x0b0d1e,
        music: 'festa',
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
