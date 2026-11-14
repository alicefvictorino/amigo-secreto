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

// metais: duas serras levemente desafinadas passando por um filtro que abre no ataque
function brass(freq, dur, { when = 0, vol = 0.05, out = null, bright = 2600 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(350, t);
  f.frequency.linearRampToValueAtTime(bright, t + 0.05);
  f.frequency.exponentialRampToValueAtTime(bright * 0.55, t + Math.min(dur, 0.3));
  f.frequency.exponentialRampToValueAtTime(300, t + dur + 0.08);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.025);
  g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.03, dur - 0.04));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
  [-7, 7].forEach(c => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = c; o.connect(f); o.start(t); o.stop(t + dur + 0.15); });
  f.connect(g); g.connect(out || master);
}

// voz principal: quadrada filtrada com vibrato depois do ataque
function lead(freq, dur, { when = 0, vol = 0.05, out = null } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 5.6;
  const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(freq * 0.012, t + Math.min(0.25, dur));
  lfo.connect(lg); lg.connect(o.frequency);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; f.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.setValueAtTime(vol * 0.85, t + Math.max(0.03, dur - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
  o.connect(f); f.connect(g); g.connect(out || master);
  o.start(t); lfo.start(t); o.stop(t + dur + 0.12); lfo.stop(t + dur + 0.12);
}

const bass = (n, dur, when, out, vol = 0.13) => { tone(midi(n), dur, { type: 'triangle', vol, when, out }); tone(midi(n - 12), dur * 0.8, { type: 'sine', vol: vol * 0.7, when, out }); };
const surdo = (when, out, f0 = 105, vol = 0.32) => tone(f0, 0.45, { vol, when, slideTo: f0 * 0.48, out });
const caixa = (when, out, vol = 0.07) => { noise(0.09, { vol, freq: 2300, q: 0.9, when, out }); tone(190, 0.05, { type: 'triangle', vol: vol * 0.5, when, out }); };
const agogo = (hi, when, out) => { const f = hi ? 1180 : 890; tone(f, 0.16, { type: 'triangle', vol: 0.035, when, out }); tone(f * 2.71, 0.08, { vol: 0.012, when, out }); };
const shaker = (when, out, vol = 0.018) => noise(0.045, { vol, freq: 6500, filter: 'highpass', when, out });
const clap = (when, out, vol = 0.08) => [0, 0.011, 0.024].forEach(d => noise(0.07, { vol, freq: 1400, q: 1.1, when: when + d, out }));
const crash = (when, out, vol = 0.09) => noise(2.2, { vol, freq: 5200, filter: 'highpass', when, out, attack: 0.002 });
const piano = (n, dur, when, out, vol = 0.045) => { tone(midi(n), dur, { vol, when, out }); tone(midi(n) * 2, dur * 0.6, { vol: vol * 0.3, when, out }); tone(midi(n) * 3, dur * 0.3, { vol: vol * 0.12, when, out }); };
const glock = (n, when, out, vol = 0.05) => { tone(midi(n), 1.2, { vol, when, out }); tone(midi(n) * 2.76, 0.35, { vol: vol * 0.35, when, out }); };

// Comemoração (original, no clima de samba-reggae da Bahia): C, Am, F, G
const COM = {
  bpm: 116,
  chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
  roots: [36, 33, 29, 31],
  mel: [
    [67, 72, 76, 79, null, 76, 74, 72], [76, null, 69, null, 72, 76, 74, 72],
    [69, 72, 77, 81, null, 79, 77, 76], [74, null, 79, null, 77, 76, 74, null],
    [76, 79, 84, null, 83, 81, 79, 76], [81, null, 76, null, 79, null, 76, 72],
    [77, 81, 84, 81, 79, 77, 76, 74], [79, null, 71, 74, null, 79, null, null],
  ],
};
// Saudade feliz (original, mais calma, para o mosaico): F, C/E, Dm, Bb, F, C, Bb, C
const SAU = {
  bpm: 92,
  chords: [[53, 57, 60, 65], [52, 55, 60, 64], [50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60], [46, 50, 53, 58], [48, 52, 55, 60]],
  roots: [29, 28, 26, 34, 29, 36, 34, 36],
  mel: [
    [72, null, 69, 72, 77, null, 76, 74], [72, null, null, 67, 72, null, 74, 76],
    [77, null, 74, null, 69, 72, 74, null], [74, null, 70, null, 74, 77, 79, null],
    [81, null, 79, 77, 76, null, 77, 79], [76, null, 72, null, 67, 72, 76, null],
    [74, 77, 79, null, 77, 74, 72, 70], [72, null, null, null, 76, null, 79, null],
  ],
};
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
  splash() { noise(0.5, { vol: 0.18, freq: 1800, q: 0.4, filter: 'highpass' }); noise(0.35, { vol: 0.1, freq: 500, q: 0.7, when: 0.05 }); },
  bump() { noise(0.12, { vol: 0.3, freq: 220, q: 1 }); },
  splat() { noise(0.3, { vol: 0.35, freq: 140, q: 0.8 }); noise(0.25, { vol: 0.14, freq: 1200, q: 0.5, when: 0.02 }); },
  knock() { [0, 0.18, 0.36].forEach(w => noise(0.08, { vol: 0.25, freq: 250, q: 1, when: w })); },
  reveal() {
    // brilho + fanfarra de metais com rufar de caixa e prato
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 1.2, { type: 'triangle', vol: 0.07, when: i * 0.07 }));
    for (let i = 0; i < 14; i++) caixa(0.1 + i * 0.045, null, 0.03 + i * 0.004);
    const T = 0.75;
    [[67, 0], [67, 0.16], [67, 0.32]].forEach(([n, d]) => brass(midi(n), 0.13, { when: T + d, vol: 0.07 }));
    [60, 64, 67, 72].forEach(n => brass(midi(n), 1.6, { when: T + 0.48, vol: 0.06, bright: 3200 }));
    bass(36, 1.4, T + 0.48, null, 0.18);
    surdo(T + 0.48, null, 110, 0.4);
    crash(T + 0.48, null, 0.12);
    [[64, 2.3], [67, 2.45], [72, 2.6]].forEach(([n, d]) => brass(midi(n), 0.14, { when: T + d - 0.2, vol: 0.06 }));
    [65, 69, 72, 77].forEach(n => brass(midi(n), 0.5, { when: T + 2.6, vol: 0.05 }));
    [67, 71, 74, 79].forEach(n => brass(midi(n), 1.4, { when: T + 3.1, vol: 0.06, bright: 3400 }));
    surdo(T + 3.1, null, 110, 0.4); crash(T + 3.1, null, 0.1);
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
  bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.8);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  bus.connect(comp); comp.connect(master);
  const out = bus;
  let step = 0;
  const song = kind === 'comemoracao' ? COM : kind === 'saudade' ? SAU : null;
  const bpm = song ? song.bpm : kind === 'paredao' ? 128 : 84;
  const interval = song ? 60 / bpm / 4 : 60 / bpm / 2;   // músicas novas em semicolcheias
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
        if (step % 4 === 0) tone(90, 0.2, { vol: 0.15, when: w, slideTo: 50, out });
        if (step % 4 === 2) noise(0.08, { vol: 0.05, freq: 3000, when: w, out });
        const notes = [392, 440, 523, 440, 392, 330, 392, 294];
        if (step % 2 === 0) tone(notes[(step / 2) % 8], 0.25, { type: 'triangle', vol: 0.04, when: w, out });
      } else if (kind === 'calmo') {
        if (step % 8 === 0) {
          const chords = [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 330]];
          chords[Math.floor(step / 8) % 4].forEach(f => tone(f, 2.6, { vol: 0.035, when: w, attack: 0.6, out }));
        }
      } else if (kind === 'comemoracao') {
        const s16 = step % 16, bar = Math.floor(step / 16), c = bar % 4, s8 = 60 / bpm / 2;
        // percussão: surdos nos tempos, caixa no desenho do samba-reggae, agogô e ganzá
        if (s16 === 4 || s16 === 12) surdo(w, out, 100, 0.34);
        if (s16 === 0 || s16 === 8) surdo(w, out, 140, 0.18);
        if ([0, 3, 6, 10, 12].includes(s16)) caixa(w, out, s16 === 6 || s16 === 12 ? 0.08 : 0.05);
        if ([0, 2, 5, 8, 11, 14].includes(s16)) agogo(s16 === 0 || s16 === 8, w, out);
        shaker(w, out, s16 % 2 ? 0.022 : 0.012);
        if (bar % 8 === 0 && s16 === 0) crash(w, out, 0.07);
        // baixo saltitante
        const r = song.roots[c];
        if (s16 === 0) bass(r, 0.32, w, out);
        if (s16 === 6) bass(r + 7, 0.18, w, out, 0.1);
        if (s16 === 8) bass(r + 12, 0.18, w, out, 0.1);
        if (s16 === 11) bass(r + 7, 0.18, w, out, 0.09);
        if (s16 === 14) bass(r + 10, 0.12, w, out, 0.08);
        // metais em contratempo
        if (s16 === 2 || s16 === 10) song.chords[c].forEach(n => brass(midi(n + 12), 0.12, { when: w, vol: 0.026, out }));
        if (s16 === 14) song.chords[(c + 1) % 4].forEach(n => brass(midi(n + 12), 0.2, { when: w, vol: 0.028, out }));
        // melodia (entra na segunda volta, para começar só com a batucada)
        if (bar >= 2 && s16 % 2 === 0) {
          const mb = song.mel[(bar - 2) % 8], i = s16 / 2, n = mb[i];
          if (n !== null) lead(midi(n), melDur(mb, i, s8), { when: w, vol: 0.045, out });
        }
      } else if (kind === 'saudade') {
        const s16 = step % 16, bar = Math.floor(step / 16), c = bar % 8, s8 = 60 / bpm / 2;
        if (s16 === 0) song.chords[c].forEach((n, k) => piano(n, 2.4, w + k * 0.02, out, 0.04));
        if (s16 === 6 || s16 === 10) song.chords[c].slice(1).forEach(n => piano(n + 12, 0.5, w, out, 0.018));
        if (s16 === 0) bass(song.roots[c], 1.1, w, out, 0.11);
        if (s16 === 10) bass(song.roots[c] + 7, 0.4, w, out, 0.07);
        if (s16 === 0 || s16 === 8) tone(70, 0.3, { vol: 0.22, when: w, slideTo: 40, out });
        if (s16 === 4 || s16 === 12) clap(w, out, 0.06);
        if (s16 % 2 === 0) shaker(w, out, s16 % 4 ? 0.014 : 0.008);
        if (bar >= 1 && s16 % 2 === 0) {
          const mb = song.mel[(bar - 1) % 8], i = s16 / 2, n = mb[i];
          if (n !== null) { glock(n, w, out, 0.055); lead(midi(n), melDur(mb, i, s8), { when: w, vol: 0.022, out }); }
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
