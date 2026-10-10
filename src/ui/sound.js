// Sound, made in the browser: no files to load, nothing to license, and the
// single-file build stays a single file. Hooves, the crack of a lance, the
// ring of a helm, the crowd, and the heralds' trumpets.
//
// Decides nothing. It is told what happened (the course record) and when the
// lances meet, and schedules sounds to match. Off is remembered per browser.

const KEY = 'the-lists.sound';
let ctx = null;
let out = null;
let noiseBuf = null;
const live = new Set();

export function soundOn() {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setSound(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode: on for this visit */ }
  if (!on) hush(0.05);
}

/** The audio context, made on the first tap (browsers allow no sooner). */
function audio() {
  if (!soundOn()) return null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      out = ctx.createDynamicsCompressor();
      out.threshold.value = -14;
      out.ratio.value = 4;
      const master = ctx.createGain();
      master.gain.value = 0.7;
      out.connect(master).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** A bus for one cue, so a skipped course can be faded out on its own. */
function bus(seconds) {
  const g = ctx.createGain();
  g.connect(out);
  live.add(g);
  setTimeout(() => { live.delete(g); try { g.disconnect(); } catch { /* gone */ } }, (seconds + 1) * 1000);
  return g;
}

/** Fade out whatever is playing. */
export function hush(fade = 0.12) {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const g of live) {
    try {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + fade);
    } catch { /* gone */ }
  }
}

// --- primitives --------------------------------------------------------------

function envelope(param, t, peak, attack, decay) {
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noise(dest, t, { type = 'bandpass', freq = 1000, to = null, q = 1, peak = 0.4, attack = 0.004, decay = 0.1 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
  f.Q.value = q;
  const g = ctx.createGain();
  envelope(g.gain, t, peak, attack, decay);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 1.5);
  src.stop(t + attack + decay + 0.05);
  return g;
}

function tone(dest, t, { freq, to = null, type = 'sine', peak = 0.3, attack = 0.004, decay = 0.2 }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
  const g = ctx.createGain();
  envelope(g.gain, t, peak, attack, decay);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

// --- the sounds of the lists -----------------------------------------------

function hoof(dest, t, level, pitch) {
  noise(dest, t, { type: 'lowpass', freq: 520 * pitch, q: 0.7, peak: 0.55 * level, decay: 0.05 });
  tone(dest, t, { freq: 120 * pitch, to: 55 * pitch, peak: 0.45 * level, decay: 0.07 });
}

/** Two horses at the gallop, closing for `until` seconds, then on past. */
function gallop(dest, t0, until, after) {
  for (const [lag, pitch, vol] of [[0, 1, 1], [0.045, 0.82, 0.8]]) {
    let t = t0 + lag;
    while (t < t0 + until + after) {
      const k = Math.min(1, (t - t0) / until);
      const level = (t > t0 + until ? Math.max(0, 1 - (t - t0 - until) / after) : 0.3 + 0.7 * k) * vol;
      const stride = 0.36 - 0.13 * k;
      for (const beat of [0, 0.065, 0.13]) hoof(dest, t + beat, level * (beat ? 0.8 : 1), pitch);
      t += stride;
    }
  }
}

function crack(dest, t, big = false) {
  noise(dest, t, { type: 'highpass', freq: 1800, peak: big ? 1 : 0.8, decay: 0.03 });
  noise(dest, t, { type: 'bandpass', freq: 750, q: 1.2, peak: 0.5, decay: 0.12 });
  tone(dest, t, { freq: 170, to: 60, peak: 0.45, decay: 0.12 });
  const bits = big ? 9 : 6;
  for (let i = 0; i < bits; i++) {
    noise(dest, t + 0.02 + Math.random() * 0.2, { type: 'bandpass', freq: 2400 + Math.random() * 2600, q: 3, peak: 0.22, decay: 0.012 });
  }
}

function clang(dest, t) {
  [[520, 1.1, 0.24], [1243, 0.8, 0.16], [2088, 0.5, 0.11], [3294, 0.35, 0.07]]
    .forEach(([f, d, p]) => tone(dest, t, { freq: f * (0.98 + Math.random() * 0.04), peak: p, decay: d }));
  crack(dest, t, true);
}

function thud(dest, t) {
  tone(dest, t, { freq: 85, to: 38, peak: 0.75, decay: 0.35 });
  noise(dest, t, { type: 'lowpass', freq: 320, peak: 0.6, decay: 0.25 });
}

function clatter(dest, t) {
  for (let i = 0; i < 6; i++) {
    tone(dest, t + Math.random() * 0.3, { freq: 1700 + Math.random() * 1600, peak: 0.07, decay: 0.06 + Math.random() * 0.08 });
  }
}

function whoosh(dest, t) {
  noise(dest, t, { type: 'bandpass', freq: 300, to: 1500, q: 0.8, peak: 0.16, attack: 0.08, decay: 0.24 });
}

function thunk(dest, t) {
  noise(dest, t, { type: 'bandpass', freq: 240, q: 5, peak: 0.75, decay: 0.14 });
  tone(dest, t, { freq: 150, to: 90, peak: 0.35, decay: 0.12 });
  crack(dest, t + 0.01);
}

function crowd(dest, t, mood, size = 1) {
  if (mood === 'cheer') {
    [[600, 0.24], [1200, 0.17], [2400, 0.08]].forEach(([f, p]) => {
      const g = noise(dest, t, { freq: f, q: 1.1, peak: p * size, attack: 0.18, decay: 1.7 });
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 6 + Math.random() * 4;
      depth.gain.value = 0.04 * size;
      lfo.connect(depth).connect(g.gain);
      lfo.start(t);
      lfo.stop(t + 2);
    });
  } else if (mood === 'ooh') {
    noise(dest, t, { freq: 480, to: 290, q: 3, peak: 0.26 * size, attack: 0.14, decay: 1.0 });
    noise(dest, t, { freq: 950, to: 620, q: 3, peak: 0.1 * size, attack: 0.14, decay: 0.9 });
  } else {
    noise(dest, t, { freq: 700, q: 1, peak: 0.09 * size, attack: 0.2, decay: 0.8 });
  }
}

function brass(dest, t, freq, dur, peak) {
  for (const detune of [-5, 5]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = detune;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.04);
    f.frequency.exponentialRampToValueAtTime(1700, t + Math.min(dur, 0.25));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    g.gain.setValueAtTime(peak, t + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    if (dur > 0.3) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.value = 6;
      lfo.connect(depth).connect(o.detune);
      lfo.start(t + 0.15);
      lfo.stop(t + dur + 0.1);
    }
    o.connect(f).connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.12);
  }
}

// --- cues --------------------------------------------------------------------

/** The heralds' trumpets: riders to the lists. */
export function fanfare() {
  if (!audio()) return;
  const t = ctx.currentTime + 0.03;
  const dest = bus(2);
  [[392, 0, 0.13], [523.25, 0.15, 0.13], [659.25, 0.3, 0.13], [783.99, 0.45, 0.7]].forEach(([f, at, d]) => {
    brass(dest, t + at, f, d, 0.15);
    brass(dest, t + at, f / 2, d, 0.07);
  });
}

const STRIKE = {
  break: (d, t) => crack(d, t),
  helm: (d, t) => clang(d, t),
  unhorse: (d, t) => { crack(d, t, true); thud(d, t + 0.47); clatter(d, t + 0.5); },
  tilt: (d, t) => thunk(d, t),
  horse: (d, t) => { thunk(d, t); crack(d, t + 0.02); },
  miss: () => {},
};

/**
 * A course: hooves to the meeting at `impact` seconds from now, the lances,
 * and the crowd. `tone` is the herald's cry's tone (good, bad or even).
 */
export function courseSound(course, { impact = 0.95, gallopToo = true, tone: mood = 'even' } = {}) {
  if (!audio()) return;
  const t = ctx.currentTime + 0.02;
  const dest = bus(impact + 3);
  if (gallopToo) gallop(dest, t, impact, 0.75);
  const hit = t + impact;
  const a = course.you.out;
  const b = course.him.out;
  if (a === 'miss' && b === 'miss') whoosh(dest, hit - 0.08);
  else {
    STRIKE[a]?.(dest, hit);
    if (b !== a || b === 'unhorse') STRIKE[b]?.(dest, hit + 0.012);
  }
  const fall = a === 'unhorse' || b === 'unhorse';
  if (mood === 'good' || fall) crowd(dest, hit + 0.1, 'cheer', fall ? 1.25 : 1);
  if (mood === 'bad') crowd(dest, hit + 0.1, 'ooh', b === 'unhorse' ? 1.2 : 1);
  if (mood === 'even' && !fall) crowd(dest, hit + 0.1, a === 'miss' && b === 'miss' ? 'murmur' : 'cheer', 0.55);
}
