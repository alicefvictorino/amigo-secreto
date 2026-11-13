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

function tone(freq, dur, { type = 'sine', vol = 0.2, when = 0, attack = 0.01, slideTo = null } = {}) {
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
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.2, when = 0, filter = 'bandpass', freq = 1500, q = 0.8, attack = 0.005 } = {}) {
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
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t); src.stop(t + dur + 0.05);
}

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
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 1.6, { type: 'triangle', vol: 0.12, when: i * 0.14 }));
    [262, 330, 392].forEach(f => tone(f, 2.5, { type: 'sine', vol: 0.08, when: 0.7 }));
  },
  pad() {
    [220, 277, 330].forEach((f, i) => tone(f, 4, { type: 'sine', vol: 0.05, when: i * 0.05, attack: 1.2 }));
  },
  bell() {
    for (let i = 0; i < 6; i++) tone(1200, 0.12, { type: 'square', vol: 0.05, when: i * 0.15 });
  },
};

// Música em loop (batida de paredão para o carnaval, ambiente suave para outras cenas)
export function playMusic(kind) {
  stopMusic();
  if (!ctx || !kind) return;
  let step = 0;
  const bpm = kind === 'paredao' ? 128 : 84;
  const interval = 60 / bpm / 2;
  let next = ctx.currentTime + 0.05;
  const bassLine = [55, 55, 65.4, 73.4];
  const timer = setInterval(() => {
    if (!ctx) return;
    while (next < ctx.currentTime + 0.2) {
      const w = next - ctx.currentTime;
      if (kind === 'paredao') {
        if (step % 2 === 0) tone(120, 0.18, { vol: 0.35, when: w, slideTo: 45 });
        if (step % 4 === 2) noise(0.12, { vol: 0.12, freq: 2500, when: w });
        noise(0.03, { vol: 0.03, freq: 8000, when: w, filter: 'highpass' });
        if (step % 2 === 1) tone(bassLine[Math.floor(step / 8) % 4] * 2, 0.15, { type: 'square', vol: 0.05, when: w });
      } else if (kind === 'festa') {
        if (step % 4 === 0) tone(90, 0.2, { vol: 0.15, when: w, slideTo: 50 });
        if (step % 4 === 2) noise(0.08, { vol: 0.05, freq: 3000, when: w });
        const notes = [392, 440, 523, 440, 392, 330, 392, 294];
        if (step % 2 === 0) tone(notes[(step / 2) % 8], 0.25, { type: 'triangle', vol: 0.04, when: w });
      } else if (kind === 'calmo') {
        if (step % 8 === 0) {
          const chords = [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 330]];
          chords[Math.floor(step / 8) % 4].forEach(f => tone(f, 2.6, { vol: 0.035, when: w, attack: 0.6 }));
        }
      }
      next += interval;
      step++;
    }
  }, 50);
  musicNodes = { timer };
}

export function stopMusic() {
  if (musicNodes) { clearInterval(musicNodes.timer); musicNodes = null; }
}
