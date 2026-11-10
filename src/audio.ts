// All sound is synthesized live with WebAudio (no files, no copyrighted music):
// a bouncy village march by day (marimba + plucks + bass + little drums, birds),
// sliding into a low drone with crickets near the kila at night. Plus UI pops and a whoosh for flights.

let ctx: AudioContext | null = null;
let master: GainNode, music: GainNode, nightBus: GainNode, sfx: GainNode, noise: AudioBuffer;
let muted = (() => { try { return localStorage.getItem('ff-muted') === '1'; } catch { return false; } })();
let dark = 0;
const listeners = new Set<(m: boolean) => void>();

const BPM = 108, STEP = 60 / BPM / 4;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
// C – G – Am – F, a happy 4-bar loop; melody in C major pentatonic
const CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
const BASS = [36, 43, 45, 41];
const _ = null;
const MEL: (number | null)[][] = [
  [72, _, 76, _, 79, _, 76, _, 74, _, 72, _, 67, _, _, _],
  [74, _, 79, _, 81, _, 79, 76, 74, _, _, _, 71, _, 74, _],
  [76, _, 72, _, 76, _, 79, _, 81, _, 79, _, 76, _, _, _],
  [77, _, 76, _, 74, _, 72, _, 74, _, 76, _, 72, _, _, _],
];
const MEL_B: (number | null)[][] = [
  [79, _, _, 76, 79, _, 84, _, 81, _, 79, _, 76, _, _, _],
  [74, _, _, 71, 74, _, 79, _, 76, _, 74, _, 71, _, _, _],
  [76, _, _, 72, 76, _, 81, _, 79, _, 76, _, 72, _, _, _],
  [77, _, 79, _, 81, _, 79, _, 77, 76, 74, _, 72, _, _, _],
];

function env(g: GainNode, t: number, peak: number, dec: number, att = 0.004) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
}
function tone(type: OscillatorType, f: number, t: number, peak: number, dec: number, out: AudioNode, f2?: number) {
  const o = ctx!.createOscillator(), g = ctx!.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dec);
  env(g, t, peak, dec); o.connect(g).connect(out); o.start(t); o.stop(t + dec + 0.05);
}
function hiss(t: number, peak: number, dec: number, type: BiquadFilterType, freq: number, out: AudioNode, q = 0.8) {
  const s = ctx!.createBufferSource(), f = ctx!.createBiquadFilter(), g = ctx!.createGain(); s.buffer = noise;
  f.type = type; f.frequency.value = freq; f.Q.value = q; env(g, t, peak, dec, 0.002); s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 1.5); s.stop(t + dec + 0.05);
}
const marimba = (m: number, t: number, v: number) => { tone('sine', mtof(m), t, v, 0.45, music); tone('sine', mtof(m) * 4, t, v * 0.18, 0.08, music); };
const pluck = (m: number, t: number, v: number) => { tone('triangle', mtof(m), t, v, 0.32, music); tone('square', mtof(m), t, v * 0.08, 0.12, music); };

let step = 0, nextT = 0;
function schedule() {
  if (!ctx) return;
  while (nextT < ctx.currentTime + 0.15) {
    const t = nextT, s = step % 16, bar = Math.floor(step / 16) % 4, section = Math.floor(step / 64) % 2;
    const ch = CHORDS[bar];
    if (s % 2 === 0) marimba(ch[(s / 2) % 3] + 12 * ((s / 2) % 4 === 3 ? 1 : 0), t, 0.11);                        // arpeggio
    const mel = (section ? MEL_B : MEL)[bar][s]; if (mel) pluck(mel, t, 0.12);                                     // tune
    if (s === 0 || s === 6 || s === 8 || s === 14) tone('triangle', mtof(BASS[bar] + (s === 6 || s === 14 ? 7 : 0)), t, 0.32, 0.28, music);
    if (s === 0 || s === 8 || (s === 10 && bar % 2)) tone('sine', 150, t, 0.5, 0.16, music, 45);                    // kick
    if (s === 4 || s === 12) { hiss(t, 0.18, 0.13, 'bandpass', 1900, music); tone('triangle', 190, t, 0.08, 0.07, music); }   // snare
    if (bar === 3 && s >= 13) hiss(t, 0.07 + (s - 13) * 0.03, 0.08, 'bandpass', 2200, music);                       // little roll
    if (s % 2 === 1) hiss(t, 0.03, 0.035, 'highpass', 7500, music);                                                 // shaker
    // day birds / night crickets
    if (s === 0 && Math.random() < 0.35) bird(t + Math.random() * 0.5);
    if (s % 4 === 0 && Math.random() < 0.6) cricket(t + Math.random() * 0.2);
    if (step % 64 === 0) drone(t);
    nextT += STEP; step++;
  }
}
function bird(t: number) {
  const n = 2 + (Math.random() * 3 | 0), base = 2400 + Math.random() * 1400;
  for (let i = 0; i < n; i++) tone('sine', base, t + i * 0.11, 0.025 * (1 - dark), 0.07, master, base * 1.5);
}
function cricket(t: number) {
  if (dark < 0.15) return;
  for (let i = 0; i < 3; i++) tone('sine', 4400, t + i * 0.045, 0.012, 0.03, nightBus);
}
function drone(t: number) {
  const len = STEP * 64 + 0.4;
  for (const [f, d] of [[55, 0], [82.4, 4], [110, -6]]) {
    const o = ctx!.createOscillator(), lp = ctx!.createBiquadFilter(), g = ctx!.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; lp.type = 'lowpass'; lp.frequency.value = 320;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 1.5); g.gain.setValueAtTime(0.05, t + len - 1.5); g.gain.linearRampToValueAtTime(0.0001, t + len);
    o.connect(lp).connect(g).connect(nightBus); o.start(t); o.stop(t + len + 0.1);
  }
}

function applyMix() {
  if (!ctx) return; const now = ctx.currentTime;
  master.gain.setTargetAtTime(muted ? 0 : 0.6, now, 0.15);
  music.gain.setTargetAtTime(0.55 * (1 - dark * 0.9), now, 0.4);
  nightBus.gain.setTargetAtTime(dark, now, 0.6);
}

export function startAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor(); master.connect(comp).connect(ctx.destination);
  music = ctx.createGain(); nightBus = ctx.createGain(); sfx = ctx.createGain(); nightBus.gain.value = 0; sfx.gain.value = 0.8;
  music.connect(master); nightBus.connect(master); sfx.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  nextT = ctx.currentTime + 0.1; applyMix();
  setInterval(schedule, 40);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
}
export function setDark(k: number) { dark = k; applyMix(); }
export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted; try { localStorage.setItem('ff-muted', muted ? '1' : '0'); } catch { /* private mode */ }
  startAudio(); applyMix(); listeners.forEach((f) => f(muted));
}
export function onMute(f: (m: boolean) => void) { listeners.add(f); return () => { listeners.delete(f); }; }

export function pop() {
  if (!ctx || muted) return; const t = ctx.currentTime;
  tone('sine', 520, t, 0.25, 0.12, sfx, 1100); tone('triangle', 1040, t + 0.05, 0.08, 0.08, sfx);
}
export function whoosh() {
  if (!ctx || muted) return; const t = ctx.currentTime;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise;
  f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.6); f.frequency.exponentialRampToValueAtTime(400, t + 1.5);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  s.connect(f).connect(g).connect(sfx); s.start(t); s.stop(t + 1.7);
  [0, 0.12, 0.24].forEach((d, i) => tone('sine', [784, 988, 1175][i], t + 1.35 + d, 0.07, 0.25, sfx));   // little arrival chime
}
