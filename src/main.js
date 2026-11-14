import * as THREE from 'three';
import { Stage, mat, BOX } from './world.js';
import { makeCharacter, animateCharacter, NAMES } from './chars.js';
import { initAudio, sfx, playMusic, stopMusic, toggleMute } from './audio.js';
import { MEMORIES, CANDIDATES, buildPrologue, buildCorridor } from './scenes.js';
import { PRESENTER } from './secret.js';

// ------------------------------------------------------------------
// Renderização
// ------------------------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 500);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------
// Estado
// ------------------------------------------------------------------
const state = {
  eliminated: new Set(),
  completed: new Set(),
  nextDoor: 0,
  stage: null,
  player: null,
  where: 'start',
  memoryIndex: -1,
  dialog: null,
  cutscene: 0,
  cam: { mode: 'follow', offset: new THREE.Vector3(0, 9.5, 12), look: new THREE.Vector3(0, 1.1, -1.8), pos: new THREE.Vector3(), target: new THREE.Vector3(), clamp: null },
  idleTime: 0,
  started: false,
};
const keys = {};
const tweens = [];
let lastT = performance.now();
const tmpV = new THREE.Vector3();

// ------------------------------------------------------------------
// Interface (DOM)
// ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const bubbleLayer = $('bubbles');
const fadeEl = $('fade');

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function fade(to, ms = 600) {
  fadeEl.style.transition = `opacity ${ms}ms ease`;
  fadeEl.style.opacity = to;
  return wait(ms);
}

let toastTimer = null;
function toast(text, ms = 2400) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function hint(text) {
  const el = $('hint');
  if (!text) { el.classList.remove('show'); return; }
  el.innerHTML = text;
  el.classList.add('show');
}

async function titleCard(year, title, sub = '') {
  const el = $('titlecard');
  el.innerHTML = `<div class="year">${year}</div><div class="ttl">${title}</div>${sub ? `<div class="sub">${sub}</div>` : ''}`;
  el.classList.add('show');
  await wait(2300);
  el.classList.remove('show');
}

// (a lista "quem sou eu?" foi removida; as eliminações aparecem só no aviso do topo)
function buildHud() {}
function refreshHud() {}
function showHud() {}

// ------------------------------------------------------------------
// Nomes sobre a cabeça dos personagens
// ------------------------------------------------------------------
const tagLayer = $('tags');
const tags = [];
function addTag(n) {
  if (!n.name) return;
  const el = document.createElement('div');
  el.className = 'nametag';
  el.textContent = n.name;
  tagLayer.appendChild(el);
  tags.push({ n, el });
}
function revealName(n) {
  if (n && n.nameUntilTalk) { n.nameUntilTalk = false; n.hideName = false; }
}
function clearTags() { tags.forEach(t => t.el.remove()); tags.length = 0; }
function updateTags() {
  const talking = new Set(bubbles.map(b => b.npc).filter(Boolean));
  const hideAll = state.where === 'prologue' || !!$('screen').className;
  const W = window.innerWidth, H = window.innerHeight;
  tags.forEach(({ n, el }) => {
    const p = (!hideAll && n.root.visible && !n.hideName && !talking.has(n)) ? headPos(n.ch) : null;
    if (!p) { el.style.display = 'none'; return; }
    p.y -= 0.32;
    const v = p.project(camera);
    if (v.z > 1) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px) translate(-50%, -100%)`;
  });
}

// ------------------------------------------------------------------
// Balões de fala
// ------------------------------------------------------------------
const bubbles = [];

function anchorFor(who) {
  if (who === 'player' || who === 'thought') return () => headPos(state.player);
  if (who && who.ch) return () => headPos(who.ch);
  if (who && who.parts) return () => headPos(who);
  if (who && who.isObject3D) return () => who.getWorldPosition(tmpV.clone()).add(new THREE.Vector3(0, 0.3, 0));
  if (who && who.isVector3) return () => who;
  if (who && who.anchor) return who.anchor;
  return () => null;
}
function headPos(ch) {
  if (!ch) return null;
  const v = new THREE.Vector3();
  ch.parts.head.getWorldPosition(v);
  v.y += 0.75 * (ch.root.scale.y || 1);
  return v;
}

function makeBubble({ who, text, style = '', name = null, ambient = false }) {
  const el = document.createElement('div');
  const isThought = who === 'thought';
  const isPlayer = who === 'player' || isThought;
  el.className = `bubble ${style} ${isThought ? 'thought' : ''} ${isPlayer ? 'mine' : ''} ${ambient ? 'ambient' : ''}`;
  let label = name;
  if (label === null) {
    if (who && who.name) label = who.name;
    else if (who && who.lookKey) label = NAMES[who.lookKey];
  }
  if (isPlayer && !name) label = null;
  if (name === null && who && who.nameUntilTalk) label = null;
  el.innerHTML = `${label ? `<div class="who">${label}</div>` : ''}<div class="txt"></div>`;
  bubbleLayer.appendChild(el);
  const b = { el, txt: el.querySelector('.txt'), text: String(text), shown: 0, done: false, anchor: anchorFor(who), ambient, npc: who && who.ch ? who : null };
  b.finish = () => { b.shown = b.text.length; b.txt.textContent = b.text; b.done = true; };
  if (who && who.ch) who.ch.anim.talking = 1.2;
  bubbles.push(b);
  positionBubble(b);
  return b;
}
function removeBubble(b) {
  const i = bubbles.indexOf(b);
  if (i >= 0) bubbles.splice(i, 1);
  b.el.remove();
}
function positionBubble(b) {
  const p = b.anchor();
  if (!p) { b.el.style.display = 'none'; return; }
  const v = p.clone().project(camera);
  if (v.z > 1) { b.el.style.display = 'none'; return; }
  b.el.style.display = '';
  const W = window.innerWidth, H = window.innerHeight;
  let x = (v.x * 0.5 + 0.5) * W;
  let y = (-v.y * 0.5 + 0.5) * H;
  const r = b.el.getBoundingClientRect();
  x = Math.min(Math.max(x, r.width / 2 + 12), W - r.width / 2 - 12);
  y = Math.min(Math.max(y, r.height + 12), H - 12);
  b.el.style.transform = `translate(${x - r.width / 2}px, ${y - r.height}px)`;
}
function updateBubbles(dt) {
  bubbles.forEach(b => {
    if (!b.done) {
      const before = Math.floor(b.shown);
      b.shown += dt * 48;
      const n = Math.min(b.text.length, Math.floor(b.shown));
      if (n !== before) { b.txt.textContent = b.text.slice(0, n); if (n % 3 === 0 && !b.ambient) sfx.blip(); }
      if (n >= b.text.length) b.done = true;
    }
    positionBubble(b);
  });
}

// diálogo bloqueante: cada linha espera Enter/E/Espaço
function say(lines) {
  if (!Array.isArray(lines)) lines = [lines];
  return new Promise(resolve => {
    clearAmbient();
    state.dialog = { lines, i: -1, resolve, bubbles: [] };
    nextLine();
  });
}
function nextLine() {
  const d = state.dialog;
  if (!d) return;
  d.bubbles.forEach(removeBubble);
  d.bubbles = [];
  clearTimeout(d.timer);
  d.i++;
  if (d.i >= d.lines.length) { state.dialog = null; $('advance').classList.remove('show'); d.resolve(); return; }
  const line = d.lines[d.i];
  if (typeof line.do === 'function') line.do();
  if (line.sfx && sfx[line.sfx]) sfx[line.sfx]();
  [line, ...(line.sim || [])].forEach(l => { if (l.text) d.bubbles.push(makeBubble(l)); });
  if (line.instant) d.bubbles.forEach(b => b.finish());   // grito: aparece inteiro, todo mundo junto
  $('advance').classList.add('show');
  if (line.auto) d.timer = setTimeout(() => { if (state.dialog === d) { d.bubbles.forEach(b => b.finish()); nextLine(); } }, line.auto);
}
function advance() {
  const d = state.dialog;
  if (!d) return false;
  if (d.bubbles.some(b => !b.done)) { d.bubbles.forEach(b => b.finish()); return true; }
  nextLine();
  return true;
}
const thought = (text, extra = {}) => say([{ who: 'thought', text, ...extra }]);

// balões ambientes (aparecem quando o boneco chega perto)
const ambientMap = new Map();
function clearAmbient() { ambientMap.forEach(b => removeBubble(b)); ambientMap.clear(); }
function updateAmbient() {
  const st = state.stage;
  if (!st || state.dialog || state.cutscene) { if (ambientMap.size) clearAmbient(); return; }
  const pp = state.player.root.position;
  st.npcs.forEach(n => {
    const txt = typeof n.ambient === 'function' ? n.ambient() : n.ambient;
    const near = txt && n.root.visible && n.root.position.distanceTo(pp) < (n.ambientR || 4);
    const cur = ambientMap.get(n);
    if (near && (!cur || cur.text !== txt)) {
      if (cur) removeBubble(cur);
      ambientMap.set(n, makeBubble({ who: n, text: txt, ambient: true, style: n.ambientStyle || '' }));
    } else if (!near && cur) { removeBubble(cur); ambientMap.delete(n); }
  });
}

// ------------------------------------------------------------------
// Interações
// ------------------------------------------------------------------
const promptEl = $('prompt');
let nearest = null;
function updatePrompt() {
  nearest = null;
  const st = state.stage;
  if (!st || state.dialog || state.cutscene || !state.player) { promptEl.style.display = 'none'; return; }
  const pp = state.player.root.position;
  let best = Infinity;
  st.interactables.forEach(it => {
    if (it.done || (it.enabled && !it.enabled())) return;
    const p = it.pos();
    const d = Math.hypot(p.x - pp.x, p.z - pp.z);
    if (d < (it.r || 2.2) && d < best) { best = d; nearest = it; }
  });
  if (!nearest) { promptEl.style.display = 'none'; return; }
  const p = nearest.pos().clone();
  p.y += nearest.h ?? 2.9;
  const v = p.project(camera);
  promptEl.style.display = '';
  promptEl.innerHTML = `<kbd>E</kbd> ${nearest.label || 'Interagir'}`;
  const W = window.innerWidth, H = window.innerHeight;
  const r = promptEl.getBoundingClientRect();
  const x = Math.min(Math.max((v.x * 0.5 + 0.5) * W, r.width / 2 + 8), W - r.width / 2 - 8);
  const y = Math.min(Math.max((-v.y * 0.5 + 0.5) * H, r.height + 8), H - 8);
  promptEl.style.transform = `translate(${x - r.width / 2}px, ${y - r.height}px)`;
}
async function interact() {
  if (!nearest) return;
  const it = nearest;
  if (it.once !== false) it.done = true;
  sfx.prompt();
  state.cutscene++;
  try { await it.onInteract(); } catch (e) { console.error(e); }
  state.cutscene--;
}

// ------------------------------------------------------------------
// Eliminação
// ------------------------------------------------------------------
async function eliminate(key) {
  if (state.eliminated.has(key)) return;
  const c = CANDIDATES.find(x => x.key === key);
  state.eliminated.add(key);
  if (state.stage) state.stage.npcs.forEach(n => { if (n.lookKey === key) revealName(n); });
  refreshHud();
  sfx.eliminate();
  toast(c ? `Não sou ${c.name}.` : '');
  await wait(1500);
}

// ------------------------------------------------------------------
// Tweens e câmera
// ------------------------------------------------------------------
const ease = { inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, out: t => 1 - Math.pow(1 - t, 3), in: t => t * t, lin: t => t };
function tween(obj, to, ms, e = 'inOut') {
  return new Promise(resolve => {
    const from = {};
    Object.keys(to).forEach(k => from[k] = obj[k]);
    tweens.push({ obj, from, to, ms, t: 0, e: ease[e] || ease.inOut, resolve });
  });
}
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt * 1000;
    const k = tw.e(Math.min(1, tw.t / tw.ms));
    Object.keys(tw.to).forEach(p => tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * k);
    if (tw.t >= tw.ms) { tweens.splice(i, 1); tw.resolve(); }
  }
}

function camTo(pos, look, ms = 1200) {
  state.cam.mode = 'manual';
  const c = state.cam;
  const from = { px: camera.position.x, py: camera.position.y, pz: camera.position.z, lx: c.target.x, ly: c.target.y, lz: c.target.z };
  const o = { ...from };
  const p = tween(o, { px: pos.x, py: pos.y, pz: pos.z, lx: look.x, ly: look.y, lz: look.z }, ms);
  c.manual = o;
  return p;
}
function camFollow() { state.cam.mode = 'follow'; }

function updateCamera(dt, snap = false) {
  const c = state.cam;
  if (c.mode === 'manual' && c.manual) {
    camera.position.set(c.manual.px, c.manual.py, c.manual.pz);
    c.target.set(c.manual.lx, c.manual.ly, c.manual.lz);
    camera.lookAt(c.target);
    return;
  }
  if (!state.player) return;
  const p = state.player.root.position;
  const goal = tmpV.set(p.x, p.y * 0.85, p.z);
  if (c.clamp) {
    goal.x = Math.min(Math.max(goal.x, c.clamp.minX), c.clamp.maxX);
    goal.z = Math.min(Math.max(goal.z, c.clamp.minZ), c.clamp.maxZ);
  }
  goal.add(c.look);
  const k = snap ? 1 : 1 - Math.pow(0.002, dt);
  c.target.lerp(goal, k);
  c.pos.copy(c.target).add(c.offset);
  camera.position.lerp(c.pos, snap ? 1 : k);
  camera.lookAt(c.target);
}

// ------------------------------------------------------------------
// Movimento e colisão
// ------------------------------------------------------------------
function collide(pos, r) {
  const st = state.stage;
  for (let iter = 0; iter < 2; iter++) {
    st.colliders.forEach(c => {
      if (!c.on) return;
      const cx = Math.min(Math.max(pos.x, c.minX), c.maxX);
      const cz = Math.min(Math.max(pos.z, c.minZ), c.maxZ);
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          pos.x = cx + dx / d * r; pos.z = cz + dz / d * r;
        } else {
          const l = pos.x - c.minX, rr = c.maxX - pos.x, t = pos.z - c.minZ, b = c.maxZ - pos.z;
          const m = Math.min(l, rr, t, b);
          if (m === l) pos.x = c.minX - r; else if (m === rr) pos.x = c.maxX + r; else if (m === t) pos.z = c.minZ - r; else pos.z = c.maxZ + r;
        }
      }
    });
  }
  const bd = st.bounds;
  pos.x = Math.min(Math.max(pos.x, bd.minX + r), bd.maxX - r);
  pos.z = Math.min(Math.max(pos.z, bd.minZ + r), bd.maxZ - r);
}

function updatePlayer(dt) {
  const pl = state.player;
  if (!pl) return;
  let mx = 0, mz = 0;
  const free = !state.dialog && !state.cutscene;
  if (free) {
    if (keys.ArrowLeft || keys.KeyA) mx -= 1;
    if (keys.ArrowRight || keys.KeyD) mx += 1;
    if (keys.ArrowUp || keys.KeyW) mz -= 1;
    if (keys.ArrowDown || keys.KeyS) mz += 1;
  }
  const len = Math.hypot(mx, mz);
  const speed = 5.2 * (state.stage.flags.speedMul || 1);
  if (len > 0) {
    mx /= len; mz /= len;
    const pos = pl.root.position;
    pos.x += mx * speed * dt; pos.z += mz * speed * dt;
    collide(pos, 0.38);
    const targetRot = Math.atan2(mx, mz);
    let dr = targetRot - pl.root.rotation.y;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    pl.root.rotation.y += dr * Math.min(1, dt * 14);
    state.idleTime = 0;
    if (pl.anim.mode === 'dance') pl.anim.mode = 'idle';
  } else {
    state.idleTime += dt;
    if (state.stage.flags.danceIdle && state.idleTime > 1.2 && free) pl.anim.mode = 'dance';
  }
  if (!state.playerLocked) animateCharacter(pl, dt, len > 0 ? speed : 0);
}

function updateNpcs(dt) {
  const st = state.stage;
  if (!st) return;
  const pp = state.player ? state.player.root.position : null;
  st.npcs.forEach(n => {
    if (!n.root.visible || n.custom) return;
    if (pp && n.facePlayer !== false && !n.moving && n.ch.anim.mode !== 'sit') {
      const d = n.root.position.distanceTo(pp);
      const want = d < 4.5 ? Math.atan2(pp.x - n.root.position.x, pp.z - n.root.position.z) : n.baseRot;
      let dr = want - n.root.rotation.y;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      n.root.rotation.y += dr * Math.min(1, dt * 5);
    }
    animateCharacter(n.ch, dt, n.moving ? 4 : 0);
  });
}

// ------------------------------------------------------------------
// API para as cenas
// ------------------------------------------------------------------
const api = {
  THREE, mat, BOX, wait, tween, say, thought, eliminate, toast, hint, camTo, camFollow, sfx, playMusic, stopMusic, fade,
  get stage() { return state.stage; },
  get player() { return state.player; },
  get state() { return state; },
  camera, renderer,

  npc(lookKey, x, z, opts = {}) {
    const st = state.stage;
    const ch = makeCharacter(lookKey, { ...(opts.look || {}), addExtras: opts.extras || [] });
    ch.root.position.set(x, opts.y || 0, z);
    ch.root.rotation.y = opts.rot || 0;
    if (opts.scale) ch.root.scale.setScalar(opts.scale);
    if (opts.sit) ch.anim.mode = 'sit';
    if (opts.dance) ch.anim.mode = 'dance';
    st.add(ch.root);
    const n = {
      ch, root: ch.root, key: lookKey, name: opts.name !== undefined ? opts.name : (lookKey in NAMES ? NAMES[lookKey] : lookKey), lookKey,
      ambient: opts.ambient || null, ambientR: opts.ambientR, ambientStyle: opts.ambientStyle,
      baseRot: opts.rot || 0, facePlayer: opts.facePlayer, moving: false,
    };
    if (opts.solid !== false) n.collider = st.solid(x - 0.4, x + 0.4, z - 0.4, z + 0.4);
    if (opts.hideName) n.hideName = true;
    // quem sai da lista nesta memória só mostra o nome depois da primeira conversa
    const mem = state.where === 'memory' ? MEMORIES[state.memoryIndex] : null;
    if (mem && (mem.eliminates || []).includes(lookKey) && !state.eliminated.has(lookKey) && n.name) {
      n.hideName = true; n.nameUntilTalk = true;
    }
    st.npcs.push(n);
    addTag(n);
    if (opts.lines || opts.onInteract) {
      let label = opts.label || 'Falar';
      if (n.nameUntilTalk && label.includes(n.name)) label = 'Falar';
      api.interact({
        pos: () => n.root.position, r: opts.r || 2.4, label, once: opts.once,
        enabled: opts.enabled,
        onInteract: async () => {
          revealName(n);
          if (opts.lines) await say(opts.lines.map(l => ({ ...l, who: l.who === undefined ? n : l.who })));
          if (opts.onInteract) await opts.onInteract(n);
        },
      });
    }
    return n;
  },

  // registra um personagem montado à mão (ex.: o gato) para ter nome e balão
  custom(n) { n.custom = true; n.baseRot = 0; state.stage.npcs.push(n); addTag(n); return n; },

  interact(it) {
    const st = state.stage;
    if (!it.pos) { const p = new THREE.Vector3(it.x, 0, it.z); it.pos = () => p; }
    st.interactables.push(it);
    return it;
  },

  async walkNpc(n, x, z, speed = 3) {
    if (n.collider) n.collider.on = false;
    n.moving = true;
    const p = n.root.position;
    n.root.rotation.y = Math.atan2(x - p.x, z - p.z);
    const dist = Math.hypot(x - p.x, z - p.z);
    await tween(p, { x, z }, dist / speed * 1000, 'lin');
    n.moving = false;
  },

  // saída da memória: aparece quando a cena é concluída
  exit(x, z, { rotY = 0, label = 'Voltar ao corredor', w = 1.8 } = {}) {
    const st = state.stage;
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = rotY;
    const glow = mat(0xffd36b, { emissive: 0xffc23a, ei: 1.4 });
    [[-w / 2, 1.4, 0.18, 2.8], [w / 2, 1.4, 0.18, 2.8], [0, 2.85, w + 0.18, 0.18]].forEach(([px, py, sw, sh]) => {
      const m = new THREE.Mesh(BOX, glow); m.scale.set(sw, sh, 0.25); m.position.set(px, py, 0); g.add(m);
    });
    const panel = new THREE.Mesh(BOX, mat(0xfff1c1, { emissive: 0xffe08a, ei: 0.8, opacity: 0.55 }));
    panel.scale.set(w, 2.7, 0.05); panel.position.set(0, 1.35, 0); g.add(panel);
    const light = new THREE.PointLight(0xffd36b, 0, 8);
    light.position.set(0, 2, 0.8); g.add(light);
    g.visible = false;
    st.add(g);
    st.exitObj = { g, light };
    api.interact({ x, z, r: 2.4, label, enabled: () => st.flags.complete, onInteract: () => finishMemory() });
    st.updaters.push((dt, t) => { if (g.visible) { light.intensity = 3 + Math.sin(t * 4) * 1.2; panel.material.opacity = 0.45 + Math.sin(t * 4) * 0.15; } });
    return g;
  },

  async complete(text = null) {
    const st = state.stage;
    st.flags.complete = true;
    if (st.exitObj) { st.exitObj.g.visible = true; sfx.door(); }
    if (text) await thought(text);
    toast('Memória recuperada. Volte pela porta dourada.', 3200);
  },

  goCorridor: () => enterCorridor(),
  finishMemory: () => finishMemory(),
  screen: (html, opts) => showScreen(html, opts),
  narrate: (lines) => narrate(lines),
  flash: (ms) => flash(ms),
  titleCard: (a, b, c) => titleCard(a, b, c),
  swapPlayer(lookKey) {
    const old = state.player;
    const ch = makeCharacter(lookKey);
    ch.root.position.copy(old.root.position);
    ch.root.rotation.y = old.root.rotation.y;
    state.stage.root.remove(old.root);
    state.stage.add(ch.root);
    state.player = ch;
    return ch;
  },
  lockPlayer(v) { state.playerLocked = v; },
};

// narração em tela (prólogo)
async function narrate(lines) {
  const el = $('narr');
  el.classList.add('show');
  for (const l of lines) {
    if (typeof l === 'function') { el.innerHTML = ''; await l(); continue; }
    el.innerHTML = `<span>${l}</span><em>Enter</em>`;
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    sfx.blip();
    await new Promise(r => { state.screenResolve = () => { state.screenResolve = null; r(); }; });
  }
  el.classList.remove('show');
}
async function flash(ms = 900) {
  const el = $('flash');
  el.style.transition = 'opacity 250ms ease';
  el.style.opacity = 1;
  await wait(350);
  el.style.transition = `opacity ${ms}ms ease`;
  el.style.opacity = 0;
}

// telas cheias (final)
function showScreen(html, { wait: waitKey = true, cls = '' } = {}) {
  const el = $('screen');
  el.className = `show ${cls}`;
  el.innerHTML = html + (waitKey ? '<div class="cont">Enter para continuar</div>' : '');
  return new Promise(resolve => {
    if (!waitKey) { resolve(); return; }
    state.screenResolve = () => { el.className = ''; state.screenResolve = null; resolve(); };
  });
}

// ------------------------------------------------------------------
// Fluxo do jogo
// ------------------------------------------------------------------
function makeStage() {
  if (state.stage) state.stage.dispose();
  bubbles.slice().forEach(removeBubble);
  ambientMap.clear();
  clearTags();
  tweens.length = 0;
  stopMusic();
  scene.background = new THREE.Color(0x101018);
  scene.fog = null;
  const st = new Stage(scene);
  state.stage = st;
  state.cam.mode = 'follow';
  state.cam.offset.set(0, 9.5, 12);
  state.cam.look.set(0, 1.1, -1.8);
  state.cam.clamp = null;
  camera.fov = 38; camera.updateProjectionMatrix();
  state.playerLocked = false;
  return st;
}

function spawnPlayer(st, spawn) {
  const pl = makeCharacter('boneco');
  pl.root.position.set(spawn.x, 0, spawn.z);
  pl.root.rotation.y = spawn.rot ?? Math.PI;
  st.add(pl.root);
  state.player = pl;
  state.idleTime = 0;
}

function applyStageConfig(st, cfg = {}) {
  if (cfg.bounds) st.bounds = cfg.bounds;
  if (cfg.camOffset) state.cam.offset.copy(cfg.camOffset);
  if (cfg.camLook) state.cam.look.copy(cfg.camLook);
  if (cfg.camClamp) state.cam.clamp = cfg.camClamp;
  if (cfg.fov) { camera.fov = cfg.fov; camera.updateProjectionMatrix(); }
  if (cfg.background !== undefined) scene.background = new THREE.Color(cfg.background);
  if (cfg.fog) scene.fog = new THREE.Fog(cfg.fog.color, cfg.fog.near, cfg.fog.far);
  spawnPlayer(st, cfg.spawn || { x: 0, z: 0 });
  updateCamera(0, true);
}

async function startPrologue() {
  state.where = 'prologue';
  showHud(false);
  const st = makeStage();
  const cfg = buildPrologue(st, api);
  applyStageConfig(st, cfg);
  await fade(0, 1200);
  await cfg.run();
  await fade(1, 900);
  await enterCorridor(true);
}

async function enterCorridor(first = false) {
  state.where = 'corridor';
  state.memoryIndex = -1;
  if (!first) await fade(1, 500);
  const st = makeStage();
  const cfg = buildCorridor(st, api, { next: state.nextDoor, completed: state.completed, memories: MEMORIES, onEnter: (i) => enterMemory(i) });
  applyStageConfig(st, cfg);
  showHud(true);
  await fade(0, 700);
  if (first) {
    hint('<kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> andar &nbsp; <kbd>E</kbd> interagir &nbsp; <kbd>Enter</kbd> continuar');
    setTimeout(() => hint(null), 9000);
    state.cutscene++;
    await thought('Tantas portas... cada uma deve guardar uma memória.');
    state.cutscene--;
  }
}

async function enterMemory(i) {
  const mem = MEMORIES[i];
  state.cutscene++;
  sfx.whoosh();
  await fade(1, 700);
  state.where = 'memory';
  state.memoryIndex = i;
  const st = makeStage();
  const cfg = mem.build(st, api);
  applyStageConfig(st, cfg);
  if (cfg.music) playMusic(cfg.music);
  hint(null);
  const card = titleCard(mem.door, mem.title, mem.place || '');
  await fade(0, 900);
  await card;
  state.cutscene--;
  if (cfg.onEnter) { state.cutscene++; await cfg.onEnter(); state.cutscene--; }
}

async function finishMemory() {
  const i = state.memoryIndex;
  if (i < 0) return;
  const mem = MEMORIES[i];
  for (const k of (mem.eliminates || [])) state.eliminated.add(k);
  refreshHud();
  state.completed.add(mem.id);
  state.nextDoor = Math.max(state.nextDoor, i + 1);
  if (mem.final) return; // o final cuida de si mesmo
  sfx.whoosh();
  await enterCorridor();
}

// atalhos de apresentação: pular para uma memória com o estado correto
async function jumpTo(i) {
  state.eliminated.clear();
  state.completed.clear();
  for (let k = 0; k < i; k++) { (MEMORIES[k].eliminates || []).forEach(e => state.eliminated.add(e)); state.completed.add(MEMORIES[k].id); }
  state.nextDoor = i;
  state.dialog = null;
  state.cutscene = 0;
  $('screen').className = '';
  $('narr').classList.remove('show');
  state.screenResolve = null;
  refreshHud();
  showHud(true);
  $('start').classList.add('hidden');
  state.started = true;
  if (i >= MEMORIES.length) { await enterCorridor(); return; }
  await enterMemory(i);
}

// ------------------------------------------------------------------
// Entrada
// ------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.repeat && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) return;
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (!state.started) { if (e.code === 'Enter') startGame(); return; }

  if (PRESENTER && e.shiftKey && /^Digit[0-9]$/.test(e.code)) { const n = +e.code.slice(5); jumpTo(n === 0 ? MEMORIES.length : n - 1); return; }
  if (e.shiftKey && e.code === 'KeyN') {
    if (state.where === 'memory' && !MEMORIES[state.memoryIndex].final) { state.dialog = null; state.cutscene = 0; bubbles.slice().forEach(removeBubble); finishMemory(); }
    else if (state.where === 'corridor') jumpTo(state.nextDoor);
    return;
  }
  if (e.code === 'KeyM') { const m = toggleMute(); toast(m ? 'Som desligado' : 'Som ligado', 1200); return; }
  if (e.code === 'KeyF') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.(); return; }
  if (e.code === 'KeyH') { $('help').classList.toggle('show'); return; }

  if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
    if (state.screenResolve) { state.screenResolve(); return; }
    if (advance()) return;
    if (!state.cutscene) interact();
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => Object.keys(keys).forEach(k => keys[k] = false));
document.addEventListener('pointerdown', (e) => {
  if (!state.started || e.target.closest('button')) return;
  if (state.screenResolve) { state.screenResolve(); return; }
  advance();
});

function startGame() {
  if (state.started) return;
  state.started = true;
  initAudio();
  $('start').classList.add('hidden');
  buildHud();
  fadeEl.style.opacity = 1;
  startPrologue();
}
$('startBtn').addEventListener('click', startGame);
document.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => { initAudio(); buildHud(); jumpTo(+b.dataset.jump); }));
document.body.classList.toggle('presenter', PRESENTER);
buildHud();

// ------------------------------------------------------------------
// Laço principal
// ------------------------------------------------------------------
let elapsed = 0;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(); const dt = Math.min((now - lastT) / 1000, 0.05); lastT = now;
  elapsed += dt;
  updateTweens(dt);
  if (state.stage) {
    state.stage.updaters.forEach(fn => fn(dt, elapsed));
    updatePlayer(dt);
    updateNpcs(dt);
    updateCamera(dt);
    updateAmbient();
    updatePrompt();
  }
  updateBubbles(dt);
  updateTags();
  renderer.render(scene, camera);
}

// tela inicial: uma cena de fundo simples girando
(function idleBackdrop() {
  const st = new Stage(scene);
  state.stage = null;
  scene.background = new THREE.Color(0xfff4e0);
  st.root.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.9));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 6); st.root.add(dl);
  const pl = makeCharacter('boneco');
  st.add(pl.root);
  // um "?" flutuando sobre o boneco
  const q = st.sign('?', 0, 2.75, 0, 0.7, 0.7, { bg: null, fg: '#d7372f' });
  camera.position.set(-2.4, 1.9, 7.5); camera.lookAt(-2.4, 1.3, 0);
  st.updaters.push((dt, t) => { q.position.y = 2.75 + Math.sin(t * 2) * 0.08; });
  let tt = 0;
  const spin = () => { if (state.started) { st.dispose(); return; } tt += 0.016; pl.root.rotation.y += 0.01; animateCharacter(pl, 0.016, 0); st.updaters.forEach(f => f(0.016, tt)); renderer.render(scene, camera); requestAnimationFrame(spin); };
  spin();
  const wait2 = () => { if (state.started) { loop(); } else requestAnimationFrame(wait2); };
  wait2();
})();

if (PRESENTER || location.protocol === 'file:') window.__game = { state, api, jumpTo, camera, scene, enterCorridor, startGame };
