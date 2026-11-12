import * as THREE from 'three';
import { mat, BOX } from './world.js';
import { SECRET_NAME, SECRET_KEY } from './secret.js';

// ---------------------------------------------------------------
// APARÊNCIA DOS PERSONAGENS
// skin: pele, hair: cabelo, hairStyle: short | long | bun | curly | puff | none
// shirt/pants/shoes: roupa. extras: acessórios fixos.
// ---------------------------------------------------------------
export const LOOKS = {
  // protagonista: totalmente cinza e sem rosto até o espelho final
  boneco:  { skin: 0x9c9c9c, hair: 0x9c9c9c, hairStyle: 'none', shirt: 0x8a8a8a, pants: 0x777777, shoes: 0x666666, faceless: true },
  // aparência no espelho final
  [SECRET_KEY]: { skin: 0xc48a62, hair: 0x1a120c, hairStyle: 'short', shirt: 0xd0524a, pants: 0x7d95b8, shoes: 0x3a2a20, longSleeves: true, extras: ['beard'] },

  // lista do amigo secreto
  analuz:  { skin: 0xe2b48c, hair: 0x3b2416, hairStyle: 'long', shirt: 0x6fa8dc, pants: 0x34495e },
  breno:   { skin: 0xd9a77c, hair: 0x2a1b10, hairStyle: 'short', shirt: 0x3d7a4f, pants: 0x2c3e50 },
  dudao:   { skin: 0xc68e62, hair: 0x2a1a10, hairStyle: 'bun', shirt: 0xe67e22, pants: 0x1f3a5f },
  flora:   { skin: 0xefc7a8, hair: 0x2a1214, hairStyle: 'bob', streaks: 0xb3122a, shirt: 0x8e44ad, pants: 0x222222 },
  hanna:   { skin: 0xe8b896, hair: 0x6b4226, hairStyle: 'bun', shirt: 0xf4a6b8, pants: 0x3a3a5a },
  nala:    { skin: 0xd9a582, hair: 0x2a1a12, hairStyle: 'long', shirt: 0x7fb24a, pants: 0x2d2d2d },
  nanda:   { skin: 0xf0cfb4, hair: 0x2a1810, hairStyle: 'long', shirt: 0xf4f0e8, pants: 0x2c3e50 },

  // coringas
  alice:   { skin: 0xf2cdb0, hair: 0x7a4b2a, hairStyle: 'curly', shirt: 0xd7372f, pants: 0x2f7a4e },
  chinelo: { skin: 0xd8a17c, hair: 0x241610, hairStyle: 'long', shirt: 0xf39c12, pants: 0x3b3b3b },
  lisis:   { skin: 0xf0c9a8, hair: 0x3a2216, hairStyle: 'curly', shirt: 0x5dade2, pants: 0x34495e },
  yasmim:  { skin: 0xe0b48e, hair: 0x1a120e, hairStyle: 'long', shirt: 0xc0392b, pants: 0x1c2833 },

  // figurantes com nome (não estão no amigo secreto)
  titia:   { skin: 0xe0b08a, hair: 0x9a9a9a, hairStyle: 'bun', shirt: 0xffffff, pants: 0x34495e },
  mayara:  { skin: 0xd9a77c, hair: 0x3a2214, hairStyle: 'long', shirt: 0xfafafa, pants: 0x1f3a5f },
  joao:    { skin: 0xe2b48c, hair: 0x2b1a10, hairStyle: 'short', shirt: 0x95a5a6, pants: 0x2c3e50 },
  silvana: { skin: 0xd8a47f, hair: 0x5a3010, hairStyle: 'short', shirt: 0xff7aa2, pants: 0x4a4a4a },
  clarice: { skin: 0xeec4a0, hair: 0xb5651d, hairStyle: 'long', shirt: 0x2c3e50, pants: 0x2c3e50 },
  comissaria: { skin: 0xd9a77c, hair: 0x2b1a10, hairStyle: 'bun', shirt: 0x1f3a6e, pants: 0x1f3a6e },
  // figurantes sem nome (multidão do carnaval)
  extra:   { skin: 0xc98f66, hair: 0x2a1a10, hairStyle: 'short', shirt: 0xffde00, pants: 0x2c3e50 },
};

export const NAMES = {
  analuz: 'Analuz', breno: 'Breno', dudao: 'Dudão', flora: 'Flora', hanna: 'Hanna', nala: 'Nala', nanda: 'Nanda',
  alice: 'Alice', chinelo: 'Chinelo', lisis: 'Lísis', yasmim: 'Yasmim', titia: 'Titia', mayara: 'Mayara',
  joao: 'João Neto', silvana: 'Silvana', clarice: 'Clarice', [SECRET_KEY]: SECRET_NAME, boneco: '???', comissaria: 'Comissária', extra: '',
};

function part(w, h, d, color, x, y, z, parent, opts = {}) {
  const m = new THREE.Mesh(BOX, mat(color, opts));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function buildHair(style, color, head) {
  const g = new THREE.Group();
  head.add(g);
  const c = color;
  switch (style) {
    case 'short':
      part(0.64, 0.14, 0.64, c, 0, 0.33, 0, g);
      part(0.64, 0.3, 0.1, c, 0, 0.18, -0.29, g);
      part(0.08, 0.18, 0.5, c, -0.3, 0.22, -0.04, g);
      part(0.08, 0.18, 0.5, c, 0.3, 0.22, -0.04, g);
      break;
    case 'long':
      part(0.7, 0.16, 0.7, c, 0, 0.33, 0, g);
      part(0.74, 1.3, 0.14, c, 0, -0.28, -0.31, g);
      part(0.12, 0.85, 0.56, c, -0.35, -0.04, -0.05, g);
      part(0.12, 0.85, 0.56, c, 0.35, -0.04, -0.05, g);
      part(0.62, 0.11, 0.08, c, 0, 0.26, 0.3, g);
      break;
    case 'bun':
      part(0.64, 0.12, 0.64, c, 0, 0.32, 0, g);
      part(0.64, 0.35, 0.1, c, 0, 0.16, -0.29, g);
      part(0.28, 0.24, 0.24, c, 0, 0.38, -0.36, g);
      break;
    case 'curly':
      part(0.92, 0.42, 0.9, c, 0, 0.36, -0.04, g);
      part(0.96, 1.15, 0.26, c, 0, -0.2, -0.36, g);
      part(0.18, 0.85, 0.66, c, -0.42, -0.02, -0.08, g);
      part(0.18, 0.85, 0.66, c, 0.42, -0.02, -0.08, g);
      part(0.7, 0.12, 0.1, c, 0, 0.28, 0.31, g);
      break;
    case 'bob':
      part(0.78, 0.3, 0.76, c, 0, 0.36, -0.02, g);
      part(0.8, 0.62, 0.2, c, 0, 0.0, -0.33, g);
      part(0.16, 0.6, 0.62, c, -0.38, 0.02, -0.04, g);
      part(0.16, 0.6, 0.62, c, 0.38, 0.02, -0.04, g);
      part(0.66, 0.12, 0.08, c, 0, 0.27, 0.31, g);
      break;
    case 'braids':
      part(0.66, 0.14, 0.66, c, 0, 0.33, 0, g);
      part(0.66, 0.4, 0.1, c, 0, 0.12, -0.3, g);
      [-0.27, -0.09, 0.09, 0.27].forEach(x => part(0.1, 1.2, 0.1, c, x, -0.42, -0.34, g));
      part(0.1, 0.9, 0.1, c, -0.36, -0.3, 0.12, g);
      part(0.1, 0.9, 0.1, c, 0.36, -0.3, 0.12, g);
      break;
    case 'ponytail':
      part(0.66, 0.14, 0.66, c, 0, 0.33, 0, g);
      part(0.66, 0.42, 0.1, c, 0, 0.12, -0.3, g);
      part(0.1, 0.4, 0.5, c, -0.33, 0.12, -0.06, g);
      part(0.1, 0.4, 0.5, c, 0.33, 0.12, -0.06, g);
      part(0.2, 0.2, 0.16, c, 0, 0.3, -0.4, g);
      part(0.18, 0.75, 0.16, c, 0, -0.12, -0.44, g);
      break;
    case 'puff':
      part(0.64, 0.12, 0.64, c, 0, 0.32, 0, g);
      part(0.5, 0.42, 0.5, c, 0, 0.6, -0.08, g);
      part(0.64, 0.25, 0.1, c, 0, 0.2, -0.29, g);
      break;
    default:
      break;
  }
  return g;
}

function addExtra(name, ch) {
  const { head, torso, armR, armL } = ch.parts;
  const g = new THREE.Group();
  switch (name) {
    case 'glasses':
      part(0.5, 0.06, 0.04, 0x222222, 0, 0.06, 0.32, head);
      part(0.16, 0.12, 0.03, 0x88c0ff, -0.13, 0.05, 0.32, head, { opacity: 0.6 });
      part(0.16, 0.12, 0.03, 0x88c0ff, 0.13, 0.05, 0.32, head, { opacity: 0.6 });
      break;
    case 'santahat': {
      part(0.68, 0.13, 0.68, 0xffffff, 0, 0.33, 0, head);
      const top = part(0.52, 0.34, 0.52, 0xd7262e, 0.04, 0.54, -0.02, head); top.rotation.z = -0.25;
      const tip = part(0.28, 0.24, 0.28, 0xd7262e, 0.2, 0.74, -0.04, head); tip.rotation.z = -0.6;
      part(0.15, 0.15, 0.15, 0xffffff, 0.34, 0.8, -0.04, head);
      break;
    }
    case 'beard':
      part(0.52, 0.16, 0.03, 0x2a1c14, 0, -0.2, 0.305, head, { opacity: 0.85 });
      part(0.06, 0.26, 0.4, 0x2a1c14, -0.3, -0.12, 0.06, head, { opacity: 0.85 });
      part(0.06, 0.26, 0.4, 0x2a1c14, 0.3, -0.12, 0.06, head, { opacity: 0.85 });
      part(0.22, 0.05, 0.03, 0x2a1c14, 0, -0.08, 0.31, head, { opacity: 0.85 });
      break;
    case 'sunglasses':
      part(0.52, 0.13, 0.04, 0x111111, 0, 0.06, 0.32, head);
      break;
    case 'partyhat': {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 4), mat(0xff4fa0));
      cone.position.set(0.05, 0.6, 0); cone.rotation.y = Math.PI / 4; cone.castShadow = true;
      head.add(cone);
      break;
    }
    case 'wings': {
      // asas de fada (cor em ch.look.wingColor)
      const wc = ch.look.wingColor ?? 0xff8fc7;
      [-1, 1].forEach(sd => {
        const w1 = part(0.05, 0.75, 0.55, wc, sd * 0.35, 0.15, -0.38, torso, { opacity: 0.6 }); w1.rotation.y = sd * 0.9; w1.rotation.z = sd * -0.35;
        const w2 = part(0.05, 0.45, 0.38, wc, sd * 0.3, -0.3, -0.36, torso, { opacity: 0.6 }); w2.rotation.y = sd * 0.9; w2.rotation.z = sd * 0.3;
      });
      break;
    }
    case 'bandana': {
      const bc = ch.look.bandanaColor ?? 0xd7262e;
      part(0.66, 0.16, 0.66, bc, 0, 0.36, 0, head);
      part(0.62, 0.1, 0.62, bc, 0, 0.27, -0.01, head);
      part(0.16, 0.2, 0.1, bc, 0, 0.2, -0.36, head);
      break;
    }
    case 'chain':
      part(0.3, 0.05, 0.03, 0xf2c230, 0, 0.26, 0.2, torso);
      part(0.05, 0.12, 0.03, 0xf2c230, 0, 0.18, 0.2, torso);
      break;
    case 'mask':
      part(0.62, 0.14, 0.04, 0x8e44ad, 0, 0.07, 0.31, head);
      break;
    case 'cape':
      part(0.72, 1.25, 0.06, 0xa01818, 0, -0.42, -0.24, torso);
      part(0.75, 0.12, 0.45, 0xa01818, 0, 0.32, -0.02, torso);
      break;
    case 'gown':
      part(0.76, 1.2, 0.46, 0x1a1a2e, 0, -0.25, 0, torso);
      part(0.2, 0.55, 0.12, 0xd7372f, 0.14, 0.05, 0.22, torso);
      part(0.2, 0.55, 0.12, 0xd7372f, -0.14, 0.05, 0.22, torso);
      break;
    case 'gradcap':
      part(0.62, 0.14, 0.62, 0x1a1a2e, 0, 0.36, 0, head);
      part(0.9, 0.04, 0.9, 0x1a1a2e, 0, 0.45, 0, head);
      part(0.04, 0.3, 0.04, 0xf1c40f, 0.38, 0.3, 0.38, head);
      break;
    case 'tray': {
      // bandeja de bruschettas na mão direita
      ch.holdArms = true;
      armR.rotation.x = -1.3;
      const t = new THREE.Group();
      t.position.set(0, -0.72, 0.18);
      armR.add(t);
      t.rotation.x = 1.3;
      part(1.0, 0.05, 0.7, 0x8b5a2b, 0, 0, 0.25, t);
      for (let i = 0; i < 6; i++) {
        const bx = -0.3 + (i % 3) * 0.3, bz = 0.08 + Math.floor(i / 3) * 0.32;
        part(0.26, 0.08, 0.2, 0xe8c27a, bx, 0.06, bz, t);
        part(0.1, 0.08, 0.1, 0xe03a2c, bx - 0.05, 0.13, bz, t);
        part(0.08, 0.08, 0.08, 0x2e8b3a, bx + 0.06, 0.13, bz + 0.03, t);
      }
      break;
    }
    case 'dog': {
      // cachorro branco no colo
      ch.holdArms = true;
      armL.rotation.x = -1.1; armR.rotation.x = -1.1;
      const dg = new THREE.Group();
      dg.position.set(0, -0.05, 0.42);
      torso.add(dg);
      part(0.5, 0.3, 0.3, 0xfafafa, 0, 0, 0, dg);
      part(0.28, 0.28, 0.26, 0xffffff, 0.3, 0.12, 0, dg);
      part(0.08, 0.12, 0.08, 0xeeeeee, 0.26, 0.3, 0.09, dg);
      part(0.08, 0.12, 0.08, 0xeeeeee, 0.26, 0.3, -0.09, dg);
      part(0.05, 0.05, 0.02, 0x111111, 0.44, 0.16, 0.06, dg);
      part(0.05, 0.05, 0.02, 0x111111, 0.44, 0.16, -0.06, dg);
      part(0.04, 0.04, 0.04, 0x222222, 0.46, 0.08, 0, dg);
      ch.parts.dog = dg;
      break;
    }
    case 'mic':
      ch.holdArms = true;
      armR.rotation.x = -1.6;
      part(0.07, 0.3, 0.07, 0x222222, 0, -0.75, 0.05, armR);
      part(0.14, 0.14, 0.14, 0x555555, 0, -0.95, 0.05, armR);
      break;
    case 'abada':
      part(0.74, 0.5, 0.44, 0xffde00, 0, -0.1, 0, torso);
      break;
    default:
      break;
  }
  return g;
}

// Constrói um personagem de blocos. Frente = +Z.
export function makeCharacter(lookKey, overrides = {}) {
  const look = { ...LOOKS[lookKey], ...overrides };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const parts = {};
  // pernas (pivô no quadril)
  // perna em duas partes: com saia, a coxa tem a cor da saia (aparece quando senta) e a canela fica de pele
  const hasSkirt = look.skirt !== undefined;
  const thighCol = hasSkirt ? look.skirt : look.pants;
  const shinCol = hasSkirt ? (look.skirtLen === 'midi' || look.skirtLen === 'short' ? look.skin : look.skirt) : (look.shorts ? look.skin : look.pants);
  const mkLeg = (x) => {
    const p = new THREE.Group(); p.position.set(x, 0.8, 0); body.add(p);
    part(0.28, 0.36, 0.3, thighCol, 0, -0.18, 0, p);
    if (look.shortsPattern !== undefined) {
      // estampa no short
      [[-0.06, -0.08, 0.5], [0.07, -0.22, -0.5], [-0.02, -0.3, 0.3]].forEach(([dx, dy, rz]) => { const m = part(0.05, 0.16, 0.02, look.shortsPattern, dx, dy, 0.155, p); m.rotation.z = rz; });
    }
    part(0.28, 0.3, 0.3, shinCol, 0, -0.51, 0, p);
    part(0.3, 0.14, 0.36, look.shoes ?? 0x333333, 0, -0.73, 0.03, p);
    return p;
  };
  parts.legL = mkLeg(-0.16);
  parts.legR = mkLeg(0.16);

  const torso = new THREE.Group(); torso.position.set(0, 1.17, 0); body.add(torso);
  const hasBikini = look.bikini !== undefined;
  part(0.66, 0.74, 0.38, hasBikini ? look.skin : look.shirt, 0, 0, 0, torso);
  if (hasBikini) {
    // parte de cima do biquíni
    part(0.68, 0.17, 0.4, look.bikini, 0, 0.17, 0, torso);
    part(0.05, 0.2, 0.05, look.bikini, -0.16, 0.33, 0.19, torso);
    part(0.05, 0.2, 0.05, look.bikini, 0.16, 0.33, 0.19, torso);
  }
  parts.torso = torso;

  const mkArm = (x) => {
    const p = new THREE.Group(); p.position.set(x, 1.5, 0); body.add(p);
    part(0.2, 0.5, 0.24, look.sleeveless || look.bikini !== undefined ? look.skin : look.shirt, 0, -0.2, 0, p);
    part(0.18, 0.26, 0.22, look.longSleeves ? look.shirt : look.skin, 0, -0.56, 0, p);
    return p;
  };
  parts.armL = mkArm(-0.44);
  parts.armR = mkArm(0.44);

  if (hasSkirt) {
    if (look.skirtLen === 'midi') parts.skirt = part(0.74, 0.52, 0.46, look.skirt, 0, 0.54, 0, body);
    else if (look.skirtLen === 'short') parts.skirt = part(0.72, 0.3, 0.44, look.skirt, 0, 0.66, 0, body);
    else parts.skirt = part(0.74, 0.68, 0.46, look.skirt, 0, 0.46, 0, body);
  }
  if (look.strapless) {
    // tomara que caia: ombros e colo à mostra
    part(0.67, 0.16, 0.39, look.skin, 0, 0.3, 0, torso);
  }
  if (look.pattern === 'vest') {
    // colete aberto com blusa escura por baixo
    part(0.22, 0.64, 0.02, look.inner ?? 0x151515, 0, 0.02, 0.2, torso);
  }
  if (look.pattern === 'leaf') {
    const leaf = (x, y, z, rz, par) => { const m = part(0.07, 0.24, 0.02, 0xfff4e8, x, y, z, par); m.rotation.z = rz; };
    leaf(-0.18, 0.08, 0.2, 0.6, torso); leaf(0.12, -0.12, 0.2, -0.5, torso); leaf(0.2, 0.18, 0.2, 0.3, torso);
    if (look.skirt !== undefined) {
      [[-0.22, 0.6, 0.5], [0.1, 0.4, -0.6], [0.24, 0.7, 0.2], [-0.05, 0.25, 0.9], [-0.25, 0.3, -0.3]].forEach(([x, y, rz]) => leaf(x, y, 0.24, rz, body));
    }
  }

  const head = new THREE.Group(); head.position.set(0, 1.86, 0); body.add(head);
  parts.headMesh = part(0.6, 0.6, 0.6, look.skin, 0, 0, 0, head);
  parts.head = head;

  // rosto
  const face = new THREE.Group(); head.add(face);
  part(0.09, 0.12, 0.03, 0x1a1a1a, -0.13, 0.05, 0.305, face);
  part(0.09, 0.12, 0.03, 0x1a1a1a, 0.13, 0.05, 0.305, face);
  part(0.03, 0.03, 0.035, 0xffffff, -0.11, 0.08, 0.31, face);
  part(0.03, 0.03, 0.035, 0xffffff, 0.15, 0.08, 0.31, face);
  part(0.2, 0.05, 0.03, 0x6b2a2a, 0, -0.14, 0.305, face);
  part(0.12, 0.06, 0.03, 0xe58b8b, -0.21, -0.06, 0.302, face, { opacity: 0.5 });
  part(0.12, 0.06, 0.03, 0xe58b8b, 0.21, -0.06, 0.302, face, { opacity: 0.5 });
  face.visible = !look.faceless;
  parts.face = face;

  parts.hair = buildHair(look.hairStyle, look.hair, head);
  if (look.streaks !== undefined) {
    part(0.12, 0.5, 0.06, look.streaks, -0.3, 0.12, 0.31, head);
    part(0.12, 0.5, 0.06, look.streaks, 0.3, 0.12, 0.31, head);
    part(0.3, 0.1, 0.07, look.streaks, -0.16, 0.3, 0.31, head);
  }
  if (look.jacket !== undefined) {
    // jaqueta aberta: corpo e mangas na cor da jaqueta, blusa aparecendo no meio
    part(0.24, 0.76, 0.42, look.jacket, -0.22, 0, 0, torso);
    part(0.24, 0.76, 0.42, look.jacket, 0.22, 0, 0, torso);
    part(0.7, 0.76, 0.1, look.jacket, 0, 0, -0.17, torso);
    [parts.armL, parts.armR].forEach(a => { part(0.23, 0.52, 0.27, look.jacket, 0, -0.2, 0, a); part(0.21, 0.24, 0.25, look.jacket, 0, -0.5, 0, a); });
  }

  const ch = { root, body, parts, look, lookKey, anim: { t: Math.random() * 10, walk: 0, mode: 'idle' } };
  ch.look = look;
  (look.extras || []).forEach(e => addExtra(e, ch));
  (overrides.addExtras || []).forEach(e => addExtra(e, ch));
  root.userData.character = ch;
  return ch;
}

export function addCharacterExtra(ch, name) { addExtra(name, ch); }

// Animação por quadro. speed > 0 = andando.
export function animateCharacter(ch, dt, speed = 0) {
  const a = ch.anim;
  a.t += dt;
  const { legL, legR, armL, armR, head } = ch.parts;
  const holds = ch.holdArms;
  if (ch.parts.skirt) ch.parts.skirt.visible = a.mode !== 'sit';
  if (a.mode === 'sit') {
    legL.rotation.x = legR.rotation.x = -Math.PI / 2;
    ch.body.position.y = -0.38 + Math.sin(a.t * 2) * 0.01;
    if (!holds) { armL.rotation.x = armR.rotation.x = -0.5; }
    head.rotation.y = Math.sin(a.t * 0.7) * 0.15;
    return;
  }
  if (a.mode === 'dance') {
    const s = Math.sin(a.t * 9);
    ch.body.position.y = Math.abs(s) * 0.12;
    ch.body.rotation.z = s * 0.08;
    legL.rotation.x = s * 0.4; legR.rotation.x = -s * 0.4;
    if (!holds) { armL.rotation.z = -1.2 - s * 0.6; armR.rotation.z = 1.2 - s * 0.6; armL.rotation.x = armR.rotation.x = 0; }
    head.rotation.z = s * 0.15;
    return;
  }
  if (a.mode === 'climb') {
    const s = Math.sin(a.t * 8);
    legL.rotation.x = s * 0.6; legR.rotation.x = -s * 0.6;
    armL.rotation.x = -2.6 + s * 0.4; armR.rotation.x = -2.6 - s * 0.4;
    return;
  }
  ch.body.rotation.z = 0; head.rotation.z = 0;
  if (!holds) { armL.rotation.z = 0; armR.rotation.z = 0; }
  if (speed > 0.1) {
    a.walk += dt * speed * 2.6;
    const s = Math.sin(a.walk);
    legL.rotation.x = s * 0.7; legR.rotation.x = -s * 0.7;
    if (!holds) { armL.rotation.x = -s * 0.6; armR.rotation.x = s * 0.6; }
    ch.body.position.y = Math.abs(Math.cos(a.walk)) * 0.06;
  } else {
    const s = Math.sin(a.t * 2);
    legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
    if (!holds) { armL.rotation.x *= 0.8; armR.rotation.x *= 0.8; armL.rotation.z = -0.05 - s * 0.02; armR.rotation.z = 0.05 + s * 0.02; }
    ch.body.position.y = s * 0.015;
    if (a.talking > 0) { a.talking -= dt; ch.body.position.y += Math.abs(Math.sin(a.t * 14)) * 0.05; }
  }
}

// Recolore o boneco aos poucos para a aparência final (usado no espelho)
export function collectMaterials(ch) {
  const list = [];
  ch.root.traverse(o => { if (o.isMesh) list.push(o); });
  return list;
}

// ---------------------------------------------------------------
// Scout, a gata siamesa
// ---------------------------------------------------------------
export function makeCat({ fur = 0xeee0c8, points = 0x4a3426, belly = 0xf7efe2, eyes = 0x4aa3ff } = {}) {
  // estilo siamês: corpo creme, máscara, orelhas, patas e rabo escuros, olhos azuis
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  part(0.34, 0.3, 0.75, fur, 0, 0.38, 0, body);
  part(0.3, 0.06, 0.6, belly, 0, 0.22, 0, body);
  const head = new THREE.Group(); head.position.set(0, 0.55, 0.42); body.add(head);
  part(0.34, 0.3, 0.3, fur, 0, 0, 0, head);
  part(0.26, 0.22, 0.03, points, 0, -0.02, 0.152, head);
  part(0.09, 0.12, 0.06, points, -0.11, 0.2, 0, head);
  part(0.09, 0.12, 0.06, points, 0.11, 0.2, 0, head);
  part(0.06, 0.05, 0.02, eyes, -0.07, 0.04, 0.168, head);
  part(0.06, 0.05, 0.02, eyes, 0.07, 0.04, 0.168, head);
  part(0.05, 0.04, 0.02, 0x2a1a14, 0, -0.06, 0.168, head);
  const legs = [];
  [[-0.11, 0.25], [0.11, 0.25], [-0.11, -0.25], [0.11, -0.25]].forEach(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0.26, z); body.add(g);
    part(0.09, 0.14, 0.09, fur, 0, -0.07, 0, g);
    part(0.095, 0.13, 0.095, points, 0, -0.195, 0, g);
    legs.push(g);
  });
  const tail = new THREE.Group(); tail.position.set(0, 0.48, -0.36); body.add(tail);
  const tm = part(0.07, 0.07, 0.5, points, 0, 0.12, -0.2, tail); tm.rotation.x = -0.6;
  const ch = { root, body, parts: { head, legs, tail }, anim: { t: 0 }, lookKey: 'gato' };
  ch.animate = (dt, speed) => {
    ch.anim.t += dt * (speed > 0.1 ? 14 : 3);
    const s = Math.sin(ch.anim.t);
    legs.forEach((l, i) => { l.rotation.x = speed > 0.1 ? s * 0.8 * (i % 2 ? 1 : -1) * (i < 2 ? 1 : -1) : 0; });
    tail.rotation.y = Math.sin(ch.anim.t * 0.5) * 0.5;
    body.position.y = speed > 0.1 ? Math.abs(s) * 0.05 : 0;
  };
  return ch;
}
