// All audio is generated in code with the Web Audio API.
// Mixer: master -> compressor/limiter -> destination, with music and SFX
// buses. SFX have per-type voice limits and +-7% random pitch. Music is a
// small step sequencer with layered tracks and crossfades (see music.js).
// iOS: the context is created/resumed on the first user gesture and
// suspended while the page is hidden.

import { TRACKS, noteHz } from '../data/music.js';

const VOICES = {
  blaster: 6, blasterSep: 4, rocket: 4, flak: 4, explosionS: 4, explosionM: 3, explosionL: 2,
  shieldHum: 3, armorClank: 3, droidDeath: 5, ui: 3, place: 2, upgrade: 2, sell: 2, horn: 1,
  siren: 1, stinger: 1, repeater: 3, artillery: 2, whistle: 2, ion: 4, sniper: 3, thunder: 1, leak: 2, whoosh: 3,
};

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, music: 0.6, sfx: 0.8, muted: false };
    this.active = {};
    this.lastAt = {};
    this.music = null;
    this.wantTrack = null;
    this.intensity = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      this.master = c.createGain();
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.knee.value = 8;
      this.comp.ratio.value = 12;
      this.comp.attack.value = 0.003;
      this.comp.release.value = 0.2;
      this.limiter = c.createDynamicsCompressor();
      this.limiter.threshold.value = -2;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.001;
      this.master.connect(this.comp).connect(this.limiter).connect(c.destination);
      this.musicBus = c.createGain();
      this.sfxBus = c.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      const len = c.sampleRate;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        d[i] = (seed / 0x3fffffff) - 1;
      }
      this.pulse = c.createPeriodicWave(...pulseWave(0.25));
      this.applyVolumes();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.ctx.suspend();
        else this.ctx.resume();
      });
      this.music = new Sequencer(this);
      if (this.wantTrack) this.music.play(this.wantTrack, 0.5);
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  setVolumes(v) {
    Object.assign(this.vol, v);
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.muted ? 0 : this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx * 0.9, t, 0.05);
  }

  playMusic(name) {
    this.wantTrack = name;
    if (this.music) this.music.play(name);
  }

  setIntensity(v) {
    this.intensity = v;
    if (this.music) this.music.setIntensity(v);
  }

  // ------------------------------------------------------------- SFX ------
  sfx(name, { vol = 1, pitch = 1 } = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const fn = SFX[name];
    if (!fn) return;
    const group = fn.group || name;
    const limit = VOICES[group] ?? 4;
    const now = this.ctx.currentTime;
    if ((this.active[group] || 0) >= limit) return; // drop extra voices
    if (now - (this.lastAt[group] || 0) < 0.025) return; // no machine-gun stacking
    this.lastAt[group] = now;
    const p = pitch * (1 + (Math.random() * 2 - 1) * 0.07);
    const out = this.ctx.createGain();
    out.gain.value = vol;
    out.connect(this.sfxBus);
    const dur = fn(this, out, now, p);
    this.active[group] = (this.active[group] || 0) + 1;
    setTimeout(() => {
      this.active[group]--;
      out.disconnect();
    }, (dur + 0.05) * 1000);
  }

  // building blocks
  osc(type, f0, f1, t, dur, out, { gain = 0.3, attack = 0.002 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(this.pulse);
    else o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
    return o;
  }

  noiseBurst(t, dur, out, { gain = 0.3, type = 'bandpass', f0 = 1000, f1 = f0, q = 1, attack = 0.002 } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }
}

function pulseWave(duty) {
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
  return [re, im];
}

// Each SFX: (audio, outNode, time, pitch) -> duration (s).
const SFX = {
  blaster: (a, o, t, p) => { a.osc('square', 1500 * p, 260 * p, t, 0.11, o, { gain: 0.11 }); a.osc('sawtooth', 900 * p, 180 * p, t, 0.09, o, { gain: 0.06 }); return 0.12; },
  blasterSep: (a, o, t, p) => { a.osc('sawtooth', 700 * p, 140 * p, t, 0.14, o, { gain: 0.1 }); a.osc('square', 520 * p, 110 * p, t, 0.12, o, { gain: 0.05 }); return 0.15; },
  repeater: (a, o, t, p) => { for (let i = 0; i < 3; i++) a.osc('square', 1100 * p, 300 * p, t + i * 0.05, 0.05, o, { gain: 0.07 }); return 0.2; },
  rocket: (a, o, t, p) => { a.noiseBurst(t, 0.35, o, { gain: 0.25, f0: 600 * p, f1: 2400 * p, q: 0.8 }); a.osc('sawtooth', 90 * p, 60 * p, t, 0.15, o, { gain: 0.12 }); return 0.36; },
  whoosh: (a, o, t, p) => { a.noiseBurst(t, 0.4, o, { gain: 0.12, f0: 2000 * p, f1: 500 * p, q: 2, attack: 0.08 }); return 0.4; },
  flak: (a, o, t, p) => { a.noiseBurst(t, 0.18, o, { gain: 0.35, type: 'lowpass', f0: 2600 * p, f1: 300, q: 0.7 }); a.osc('square', 220 * p, 70 * p, t, 0.08, o, { gain: 0.08 }); return 0.2; },
  explosionS: (a, o, t, p) => { a.noiseBurst(t, 0.35, o, { gain: 0.45, type: 'lowpass', f0: 1800 * p, f1: 120, q: 0.6 }); a.osc('sine', 120 * p, 40, t, 0.3, o, { gain: 0.25 }); return 0.36; },
  explosionM: (a, o, t, p) => { a.noiseBurst(t, 0.6, o, { gain: 0.55, type: 'lowpass', f0: 1400 * p, f1: 80, q: 0.6 }); a.osc('sine', 90 * p, 30, t, 0.55, o, { gain: 0.35 }); return 0.62; },
  explosionL: (a, o, t, p) => { a.noiseBurst(t, 1.2, o, { gain: 0.6, type: 'lowpass', f0: 1000 * p, f1: 50, q: 0.5 }); a.osc('sine', 70 * p, 25, t, 1.0, o, { gain: 0.45 }); return 1.2; },
  artillery: (a, o, t, p) => { a.osc('sine', 80 * p, 35, t, 0.4, o, { gain: 0.5 }); a.noiseBurst(t, 0.25, o, { gain: 0.3, type: 'lowpass', f0: 900, f1: 100 }); return 0.4; },
  whistle: (a, o, t, p) => { a.osc('sine', 1800 * p, 600 * p, t, 0.7, o, { gain: 0.06, attack: 0.2 }); return 0.7; },
  ion: (a, o, t, p) => { for (let i = 0; i < 4; i++) a.osc('sawtooth', (2400 - i * 300) * p, 900 * p, t + i * 0.025, 0.05, o, { gain: 0.06 }); a.noiseBurst(t, 0.15, o, { gain: 0.12, f0: 5000, q: 3 }); return 0.18; },
  sniper: (a, o, t, p) => { a.noiseBurst(t, 0.12, o, { gain: 0.5, type: 'highpass', f0: 2500 * p, q: 0.7 }); a.osc('square', 2000 * p, 150, t, 0.06, o, { gain: 0.1 }); return 0.15; },
  shieldHum: (a, o, t, p) => { a.osc('sine', 330 * p, 300 * p, t, 0.2, o, { gain: 0.1, attack: 0.02 }); a.osc('sine', 495 * p, 450 * p, t, 0.18, o, { gain: 0.05, attack: 0.02 }); return 0.22; },
  armorClank: (a, o, t, p) => { a.osc('square', 760 * p, 640 * p, t, 0.08, o, { gain: 0.08 }); a.noiseBurst(t, 0.06, o, { gain: 0.15, f0: 3500 * p, q: 6 }); return 0.1; },
  droidDeath: (a, o, t, p) => { a.noiseBurst(t, 0.2, o, { gain: 0.18, f0: 3000 * p, f1: 800, q: 2 }); a.osc('square', 880 * p, 220 * p, t + 0.02, 0.12, o, { gain: 0.05 }); a.osc('square', 1320 * p, 330 * p, t + 0.09, 0.08, o, { gain: 0.04 }); return 0.22; },
  place: (a, o, t, p) => { a.osc('sine', 160 * p, 60, t, 0.18, o, { gain: 0.35 }); a.noiseBurst(t, 0.12, o, { gain: 0.15, type: 'lowpass', f0: 1200 }); return 0.2; },
  upgrade: (a, o, t, p) => { [523, 659, 784].forEach((f, i) => a.osc('pulse', f * p, f * p, t + i * 0.06, 0.12, o, { gain: 0.08 })); return 0.3; },
  sell: (a, o, t, p) => { [784, 523].forEach((f, i) => a.osc('pulse', f * p, f * p, t + i * 0.07, 0.1, o, { gain: 0.07 })); return 0.22; },
  click: (a, o, t, p) => { a.osc('square', 1200 * p, 900 * p, t, 0.03, o, { gain: 0.05 }); return 0.04; },
  horn: (a, o, t) => { [[147, 0], [220, 0.05]].forEach(([f, d]) => { a.osc('sawtooth', f, f, t + d, 0.9, o, { gain: 0.08, attack: 0.08 }); a.osc('sawtooth', f * 1.005, f * 1.005, t + d, 0.9, o, { gain: 0.06, attack: 0.08 }); }); return 1.0; },
  siren: (a, o, t) => { for (let i = 0; i < 3; i++) a.osc('sawtooth', 500, 900, t + i * 0.7, 0.68, o, { gain: 0.07, attack: 0.1 }); return 2.1; },
  leak: (a, o, t, p) => { a.osc('square', 200 * p, 140 * p, t, 0.25, o, { gain: 0.08 }); return 0.26; },
  thunder: (a, o, t) => { a.noiseBurst(t, 2.2, o, { gain: 0.35, type: 'lowpass', f0: 400, f1: 60, q: 0.4, attack: 0.15 }); return 2.2; },
  victory: (a, o, t) => { [[392, 0], [523, 0.16], [659, 0.32], [784, 0.48], [1047, 0.7]].forEach(([f, d]) => a.osc('sawtooth', f, f, t + d, d > 0.6 ? 1.2 : 0.3, o, { gain: 0.08, attack: 0.02 })); return 1.9; },
  defeat: (a, o, t) => { [[392, 0], [349, 0.3], [311, 0.6], [262, 0.9]].forEach(([f, d]) => a.osc('sawtooth', f, f * 0.98, t + d, d > 0.8 ? 1.4 : 0.32, o, { gain: 0.08, attack: 0.03 })); return 2.3; },
};
SFX.victory.group = 'stinger';
SFX.defeat.group = 'stinger';
SFX.click.group = 'ui';
SFX.explosionS.group = 'explosionS';

// ---------------------------------------------------------------- music ---
// Lookahead step sequencer. Each track has layers (base / mid / high);
// intensity fades mid and high layers in. Switching tracks crossfades.
class Sequencer {
  constructor(audio) {
    this.a = audio;
    this.c = audio.ctx;
    this.cur = null;
    this.intensity = 0;
    setInterval(() => this.schedule(), 25);
  }

  play(name, fade = 2.0) {
    if (this.cur && this.cur.name === name) return;
    const t = this.c.currentTime;
    if (this.cur) {
      const old = this.cur;
      old.bus.gain.cancelScheduledValues(t);
      old.bus.gain.setValueAtTime(old.bus.gain.value, t);
      old.bus.gain.linearRampToValueAtTime(0, t + fade);
      old.stopping = true;
      setTimeout(() => old.bus.disconnect(), (fade + 0.5) * 1000);
    }
    const tr = TRACKS[name];
    if (!tr) { this.cur = null; return; }
    const bus = this.c.createGain();
    bus.gain.setValueAtTime(0, t);
    bus.gain.linearRampToValueAtTime(1, t + fade);
    bus.connect(this.a.musicBus);
    const layers = {};
    for (const L of ['base', 'mid', 'high']) {
      const g = this.c.createGain();
      g.gain.value = L === 'base' ? 1 : 0;
      g.connect(bus);
      layers[L] = g;
    }
    this.cur = { name, tr, bus, layers, step: 0, next: t + 0.1 };
    this.setIntensity(this.intensity);
  }

  setIntensity(v) {
    this.intensity = v;
    if (!this.cur) return;
    const t = this.c.currentTime;
    this.cur.layers.mid.gain.setTargetAtTime(v > 0.25 ? 1 : 0, t, 0.8);
    this.cur.layers.high.gain.setTargetAtTime(v > 0.65 ? 1 : 0, t, 0.8);
  }

  schedule() {
    const s = this.cur;
    if (!s || this.c.state !== 'running') return;
    const spb = 60 / s.tr.bpm / 4; // 16th notes
    while (s.next < this.c.currentTime + 0.15) {
      for (const ch of s.tr.channels) {
        const ev = ch.steps[s.step % ch.steps.length];
        if (ev) {
          try { playNote(this.a, s.layers[ch.layer], ch.inst, ev, s.next, spb); } catch (err) { console.warn('note failed', err); }
        }
      }
      s.step++;
      s.next += spb;
    }
  }
}

function playNote(a, out, inst, ev, t, spb) {
  const dur = (ev.len || 1) * spb;
  const notes = ev.n === undefined ? [0] : Array.isArray(ev.n) ? ev.n : [ev.n];
  const c = a.ctx;
  for (const n of notes) {
    const f = typeof n === 'number' ? n : noteHz(n);
    switch (inst) {
      case 'brass': {
        const g = c.createGain(), flt = c.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(500, t);
        flt.frequency.linearRampToValueAtTime(2600, t + 0.06);
        flt.frequency.exponentialRampToValueAtTime(1200, t + dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.09, t + 0.04);
        g.gain.setValueAtTime(0.07, t + dur * 0.8);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
        for (const det of [-5, 5]) {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.detune.value = det;
          o.connect(flt);
          o.start(t);
          o.stop(t + dur + 0.15);
        }
        flt.connect(g).connect(out);
        break;
      }
      case 'strings': {
        const g = c.createGain(), flt = c.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.value = 1400;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.035, t + Math.min(0.35, dur * 0.4));
        g.gain.setValueAtTime(0.035, t + dur * 0.85);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
        for (const det of [-9, 0, 8]) {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.detune.value = det;
          o.connect(flt);
          o.start(t);
          o.stop(t + dur + 0.55);
        }
        flt.connect(g).connect(out);
        break;
      }
      case 'arp':
        a.osc('pulse', f, f, t, Math.min(dur, 0.18), out, { gain: 0.035 });
        break;
      case 'bass':
        a.osc('triangle', f, f, t, dur * 0.95, out, { gain: 0.14, attack: 0.01 });
        a.osc('sawtooth', f, f, t, dur * 0.6, out, { gain: 0.025, attack: 0.01 });
        break;
      case 'timpani':
        a.osc('sine', f * 1.5, f, t, 0.9, out, { gain: 0.22, attack: 0.005 });
        a.noiseBurst(t, 0.12, out, { gain: 0.06, type: 'lowpass', f0: 500 });
        break;
      case 'snare':
        a.noiseBurst(t, 0.12, out, { gain: (ev.v || 1) * 0.09, f0: 1900, q: 0.9 });
        a.osc('triangle', 190, 160, t, 0.06, out, { gain: (ev.v || 1) * 0.04 });
        break;
      case 'hat':
        a.noiseBurst(t, 0.03, out, { gain: 0.02, type: 'highpass', f0: 7000 });
        break;
    }
  }
}
