// Sons sintetizados com Web Audio (sem arquivos externos).
let ctx = null;
let master = null;
let muted = false;
let musicNodes = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.6;
  return muted;
}

function tone(freq, dur, { type = 'sine', vol = 0.2, when = 0, attack = 0.01, slideTo = null, out = null } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out || master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.2, when = 0, filter = 'bandpass', freq = 1500, q = 0.8, attack = 0.005, out = null } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = filter; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(out || master);
  src.start(t); src.stop(t + dur + 0.05);
}


// ---------------- instrumentos para as músicas de comemoração ----------------
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

const shaker = (when, out, vol = 0.018) => noise(0.045, { vol, freq: 6500, filter: 'highpass', when, out });
const clap = (when, out, vol = 0.08) => [0, 0.011, 0.024].forEach(d => noise(0.07, { vol, freq: 1400, q: 1.1, when: when + d, out }));
const piano = (n, dur, when, out, vol = 0.045) => { tone(midi(n), dur, { vol, when, out }); tone(midi(n) * 2, dur * 0.6, { vol: vol * 0.3, when, out }); tone(midi(n) * 3, dur * 0.3, { vol: vol * 0.12, when, out }); };
const glock = (n, when, out, vol = 0.05) => { tone(midi(n), 1.2, { vol, when, out }); tone(midi(n) * 2.76, 0.35, { vol: vol * 0.35, when, out }); };

// timbres claros (sem serras, sem vibrato)
const pan = (n, when, out, vol = 0.05, dur = 0.55) => {           // steel pan / marimba
  tone(midi(n), dur, { vol, when, out, attack: 0.004 });
  tone(midi(n) * 2, dur * 0.6, { vol: vol * 0.35, when, out, attack: 0.004 });
  tone(midi(n) * 3, dur * 0.25, { vol: vol * 0.1, when, out, attack: 0.004 });
};
const pluck = (n, when, out, vol = 0.03) => tone(midi(n), 0.2, { type: 'triangle', vol, when, out, attack: 0.003 });
const softBass = (n, dur, when, out, vol = 0.12) => { tone(midi(n), dur, { vol, when, out, attack: 0.006 }); tone(midi(n) * 2, dur * 0.5, { type: 'triangle', vol: vol * 0.25, when, out }); };
const kick = (when, out, vol = 0.22) => tone(150, 0.16, { vol, when, slideTo: 62, out, attack: 0.002 });
const hat = (when, out, vol = 0.02) => noise(0.035, { vol, freq: 9000, filter: 'highpass', when, out, attack: 0.001 });
const pad = (notes, dur, when, out, vol = 0.014) => notes.forEach(n => { tone(midi(n), dur, { vol, when, out, attack: 0.25 }); tone(midi(n) * 2, dur, { vol: vol * 0.3, when, out, attack: 0.25 }); });

// Comemoração (original, alegre, pop/axé leve): C, G, Am, F
const ALEGRE = {
  bpm: 124,
  chords: [[60, 64, 67], [59, 62, 67], [60, 64, 69], [60, 65, 69]],
  roots: [48, 43, 45, 41],
  mel: [
    [76, 79, 84, null, 79, 76, 79, null], [74, 79, 83, null, 81, 79, 74, null],
    [72, 76, 81, null, 79, 76, 72, 76], [77, null, 81, null, 84, null, 81, 79],
    [76, 79, 84, 86, 88, null, 84, null], [86, null, 83, null, 79, 81, 83, null],
    [84, 83, 81, null, 76, null, 81, 84], [81, null, 79, 77, 76, null, 74, null],
  ],
};
// Saudade feliz (original, calma e luminosa, para o mosaico): C, Am, F, G
const DOCE = {
  bpm: 96,
  chords: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]],
  roots: [48, 45, 41, 43],
  mel: [
    [79, null, 76, null, 79, 81, 79, null], [76, null, 72, null, 76, 77, 76, null],
    [77, null, 81, null, 84, null, 81, 79], [79, null, 74, null, 77, 76, 74, null],
    [84, null, 83, 81, 79, null, 76, null], [81, null, 79, 76, 72, null, 76, null],
    [77, 79, 81, null, 84, null, 81, null], [83, null, 81, null, 79, null, null, null],
  ],
};
// festa das memórias (mais leve que a comemoração): C, F, G, C / Am, F, G, G
const FESTA = {
  bpm: 112,
  chords: [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67], [60, 64, 69], [60, 65, 69], [59, 62, 67], [59, 62, 67]],
  roots: [48, 41, 43, 48, 45, 41, 43, 43],
  mel: [[79, null, 76, 79, 81, null, 79, null], [77, null, 81, null, 79, 77, 76, null], [74, 76, 77, 79, 77, null, 74, null], [76, null, 72, null, 76, 79, 84, null],
        [81, null, 79, 76, 81, null, 84, null], [81, null, 77, null, 72, 74, 77, null], [79, null, 74, 76, 77, 79, 81, 83], [84, null, null, null, 79, null, null, null]],
};
// calmo (corredor e avião): C, Am, F, G em arpejos de caixinha de música
const CALMO = { chords: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]], roots: [48, 45, 41, 43] };

const melDur = (bar, i, step8) => { let k = i + 1; while (k < bar.length && bar[k] === null) k++; return (k - i) * step8 * 0.92; };

export const sfx = {
  blip() { tone(520 + Math.random() * 120, 0.05, { type: 'square', vol: 0.025 }); },
  prompt() { tone(880, 0.08, { type: 'triangle', vol: 0.06 }); },
  eliminate() {
    tone(660, 0.18, { type: 'triangle', vol: 0.15 });
    tone(990, 0.3, { type: 'triangle', vol: 0.15, when: 0.12 });
    noise(0.25, { vol: 0.08, freq: 3000, when: 0.05 });
  },
  door() { noise(0.6, { vol: 0.12, freq: 400, q: 0.5, attack: 0.1 }); tone(180, 0.5, { vol: 0.06, slideTo: 90 }); },
  whoosh() { noise(0.9, { vol: 0.15, freq: 800, q: 0.3, attack: 0.3 }); },
  applause() {
    for (let i = 0; i < 70; i++) noise(0.06, { vol: 0.12, when: Math.random() * 2.4, freq: 1800 + Math.random() * 2500, q: 2 });
  },
  scream() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t);
    o.frequency.linearRampToValueAtTime(620, t + 0.4);
    o.frequency.linearRampToValueAtTime(560, t + 2.2);
    lfo.frequency.value = 7; lg.gain.value = 18;
    lfo.connect(lg); lg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.08);
    g.gain.setValueAtTime(0.22, t + 2.0);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); lfo.start(t); o.stop(t + 2.5); lfo.stop(t + 2.5);
  },
  // várias vozes gritando juntas, no mesmo tempo
  crowdShout() {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let v = 0; v < 11; v++) {
      const base = 230 + v * 38 + Math.random() * 25;
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 1.12, t + 0.35);
      o.frequency.linearRampToValueAtTime(base * 1.25, t + 1.2);
      o.frequency.linearRampToValueAtTime(base * 1.05, t + 1.9);
      f.type = 'bandpass'; f.frequency.value = 800 + (v % 3) * 250; f.Q.value = 1.3;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.06);
      g.gain.setValueAtTime(0.045, t + 1.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); o.stop(t + 2.2);
    }
    noise(1.8, { vol: 0.06, freq: 1600, q: 0.4, attack: 0.05 });
  },
  splash() { noise(0.5, { vol: 0.18, freq: 1800, q: 0.4, filter: 'highpass' }); noise(0.35, { vol: 0.1, freq: 500, q: 0.7, when: 0.05 }); },
  bump() { noise(0.12, { vol: 0.3, freq: 220, q: 1 }); },
  splat() { noise(0.3, { vol: 0.35, freq: 140, q: 0.8 }); noise(0.25, { vol: 0.14, freq: 1200, q: 0.5, when: 0.02 }); },
  knock() { [0, 0.18, 0.36].forEach(w => noise(0.08, { vol: 0.25, freq: 250, q: 1, when: w })); },
  reveal() {
    // "tcharam": subida de sinos, acorde maior brilhante, palmas e brilhinhos
    [60, 64, 67, 72, 76, 79].forEach((n, i) => pan(n + 12, i * 0.08, null, 0.05, 0.5));
    for (let i = 0; i < 10; i++) hat(0.1 + i * 0.06, null, 0.012 + i * 0.002);
    const T = 0.7;
    [72, 76, 79, 84].forEach(n => pan(n, T, null, 0.055, 1.6));
    pad([60, 64, 67, 72], 2.6, T, null, 0.03);
    softBass(48, 1.2, T, null, 0.08);
    kick(T, null, 0.1); clap(T, null, 0.08);
    noise(1.4, { vol: 0.04, freq: 7000, filter: 'highpass', when: T, attack: 0.002 });
    [84, 88, 91, 96].forEach((n, i) => glock(n, T + 0.25 + i * 0.09, null, 0.03));
    // segunda frase: G -> C
    [[67, 0], [71, 0.15], [74, 0.3]].forEach(([n, d]) => pan(n + 12, T + 1.7 + d, null, 0.05, 0.4));
    [72, 76, 79, 84, 88].forEach(n => pan(n, T + 2.25, null, 0.05, 1.8));
    pad([60, 64, 67], 2.4, T + 2.25, null, 0.03);
    softBass(48, 1.4, T + 2.25, null, 0.08);
    kick(T + 2.25, null, 0.1); clap(T + 2.25, null, 0.08);
    [91, 96, 100].forEach((n, i) => glock(n, T + 2.4 + i * 0.1, null, 0.028));
  },

  pad() {
    [220, 277, 330].forEach((f, i) => tone(f, 4, { type: 'sine', vol: 0.05, when: i * 0.05, attack: 1.2 }));
  },
  bell() {
    for (let i = 0; i < 6; i++) tone(1200, 0.12, { type: 'square', vol: 0.05, when: i * 0.15 });
  },
};

// Música em loop (batida de paredão para o carnaval, ambiente suave, e as comemorações do final)
export function playMusic(kind) {
  stopMusic();
  if (!ctx || !kind) return;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, ctx.currentTime);
  bus.gain.linearRampToValueAtTime(1.5, ctx.currentTime + 0.8);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  bus.connect(comp); comp.connect(master);
  const out = bus;
  let step = 0;
  const song = { comemoracao: ALEGRE, saudade: DOCE, festa: FESTA, calmo: CALMO }[kind] || null;
  const bpm = kind === 'paredao' ? 128 : kind === 'calmo' ? 72 : (song && song.bpm) || 100;
  const interval = kind === 'paredao' ? 60 / bpm / 2 : 60 / bpm / 4;   // semicolcheias (paredão em colcheias)
  let next = ctx.currentTime + 0.08;
  const bassLine = [55, 55, 65.4, 73.4];
  const timer = setInterval(() => {
    if (!ctx) return;
    // se o navegador atrasar o relógio (aba pesada), pula em vez de tocar tudo de uma vez
    if (next < ctx.currentTime) next = ctx.currentTime + 0.03;
    while (next < ctx.currentTime + 0.6) {
      const w = next - ctx.currentTime;
      if (kind === 'paredao') {
        if (step % 2 === 0) tone(120, 0.18, { vol: 0.35, when: w, slideTo: 45, out });
        if (step % 4 === 2) noise(0.12, { vol: 0.12, freq: 2500, when: w, out });
        noise(0.03, { vol: 0.03, freq: 8000, when: w, filter: 'highpass', out });
        if (step % 2 === 1) tone(bassLine[Math.floor(step / 8) % 4] * 2, 0.15, { type: 'square', vol: 0.05, when: w, out });
      } else if (kind === 'festa') {
        // festa leve: bumbo, palmas, chimbal, baixo saltitante, violão no contratempo e melodia de marimba
        const s16 = step % 16, bar = Math.floor(step / 16), c = bar % 8, s8 = 60 / bpm / 2;
        if (s16 === 0 || s16 === 8) kick(w, out, 0.1);
        if (s16 === 4 || s16 === 12) clap(w, out, 0.045);
        if (s16 % 4 === 2) hat(w, out, 0.016);
        const r = song.roots[c];
        if (s16 === 0) softBass(r, 0.28, w, out, 0.065);
        if (s16 === 6) softBass(r + 12, 0.14, w, out, 0.05);
        if (s16 === 8) softBass(r + 7, 0.2, w, out, 0.055);
        if (s16 % 4 === 2) song.chords[c].forEach((n, k) => pluck(n + 12, w + k * 0.01, out, 0.03));
        if (s16 % 2 === 0) { const mb = song.mel[c], i = s16 / 2, n = mb[i]; if (n !== null) pan(n, w, out, 0.05, Math.min(0.6, melDur(mb, i, s8) + 0.15)); }
      } else if (kind === 'calmo') {
        // caixinha de música: arpejo lento e acorde suave por baixo
        const s16 = step % 16, bar = Math.floor(step / 16), c = bar % 4;
        if (s16 === 0) { pad(song.chords[c], 3.0, w, out, 0.016); softBass(song.roots[c] + 12, 1.6, w, out, 0.035); }
        if (s16 % 2 === 0) { const ch = song.chords[c], k = (s16 / 2) % 4; glock(ch[k] + 12 + (s16 >= 8 ? 12 : 0), w, out, 0.032); }
      } else if (kind === 'comemoracao') {
        // alegre: bumbo nos tempos, palmas no 2 e no 4, chimbal e ganzá, baixo saltitante,
        // violão no contratempo, acorde suave por baixo e melodia de steel pan
        const s16 = step % 16, bar = Math.floor(step / 16), c = bar % 4, s8 = 60 / bpm / 2;
        if (s16 % 4 === 0) kick(w, out, 0.1);
        if (s16 === 4 || s16 === 12) clap(w, out, 0.07);
        if (s16 % 4 === 2) hat(w, out, 0.03);
        shaker(w, out, s16 % 2 ? 0.014 : 0.008);
        if (bar % 4 === 0 && s16 === 0) noise(1.2, { vol: 0.03, freq: 7000, filter: 'highpass', when: w, out, attack: 0.002 });
        const r = song.roots[c];
        if (s16 === 0) softBass(r, 0.26, w, out, 0.075);
        if (s16 === 3) softBass(r, 0.12, w, out, 0.05);
        if (s16 === 6) softBass(r + 12, 0.14, w, out, 0.055);
        if (s16 === 8) softBass(r + 7, 0.22, w, out, 0.065);
        if (s16 === 11) softBass(r + 12, 0.12, w, out, 0.05);
        if (s16 === 14) softBass(r + 7, 0.12, w, out, 0.05);
        if (s16 === 0) pad(song.chords[c].map(n => n + 12), 1.9, w, out, 0.012);
        if (s16 % 4 === 2) song.chords[c].forEach((n, k) => pluck(n + 12, w + k * 0.008, out, 0.032));
        if (bar >= 2 && s16 % 2 === 0) {
          const mb = song.mel[(bar - 2) % 8], i = s16 / 2, n = mb[i];
          if (n !== null) pan(n, w, out, 0.07, Math.min(0.7, melDur(mb, i, s8) + 0.2));
        }
      } else if (kind === 'saudade') {
        // calma e luminosa: piano no meio do teclado, palmas leves, caixinha de música na melodia
        const s16 = step % 16, bar = Math.floor(step / 16), c = bar % 4, s8 = 60 / bpm / 2;
        if (s16 === 0) song.chords[c].forEach((n, k) => piano(n, 2.2, w + k * 0.03, out, 0.03));
        if (s16 === 8) song.chords[c].slice(1).forEach((n, k) => piano(n, 1.2, w + k * 0.03, out, 0.02));
        if (s16 === 0) softBass(song.roots[c], 1.0, w, out, 0.05);
        if (s16 === 8) softBass(song.roots[c] + 7, 0.6, w, out, 0.04);
        if (s16 === 0 || s16 === 10) kick(w, out, 0.05);
        if (s16 === 4 || s16 === 12) clap(w, out, 0.04);
        if (s16 % 4 === 2) hat(w, out, 0.01);
        if (bar >= 1 && s16 % 2 === 0) {
          const mb = song.mel[(bar - 1) % 8], i = s16 / 2, n = mb[i];
          if (n !== null) { glock(n, w, out, 0.05); pan(n, w, out, 0.035, Math.min(0.9, melDur(mb, i, s8) + 0.2)); }
        }
      }
      next += interval;
      step++;
    }
  }, 40);
  musicNodes = { timer, bus };
}

export function stopMusic() {
  if (!musicNodes) return;
  clearInterval(musicNodes.timer);
  const { bus } = musicNodes;
  if (ctx && bus) {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    setTimeout(() => { try { bus.disconnect(); } catch (e) { /* já desligado */ } }, 900);
  }
  musicNodes = null;
}
