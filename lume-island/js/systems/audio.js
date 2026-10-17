// Procedural audio with the Web Audio API: every sound effect is synthesised
// on the fly, and a small generative composer plays gentle music that
// follows the biome and the time of day. Nothing is loaded from files.
import { G } from '../core/game.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
// scales as semitone offsets
const PENTA = [0, 2, 4, 7, 9];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const MINOR_P = [0, 3, 5, 7, 10];
const MOODS = {
  title: { root: 60, scale: PENTA, bpm: 76, chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], lead: 'bell', density: 0.45, pad: 0.6 },
  meadow: { root: 60, scale: PENTA, bpm: 92, chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], lead: 'marimba', density: 0.55, pad: 0.35 },
  forest: { root: 57, scale: DORIAN, bpm: 80, chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]], lead: 'flute', density: 0.42, pad: 0.45 },
  mountain: { root: 62, scale: LYDIAN, bpm: 70, chords: [[0, 4, 7], [2, 6, 9], [-5, -1, 2], [0, 4, 7]], lead: 'bell', density: 0.35, pad: 0.6 },
  jungle: { root: 58, scale: MINOR_P, bpm: 104, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], lead: 'marimba', density: 0.6, pad: 0.25, drums: true },
  night: { root: 57, scale: MINOR_P, bpm: 62, chords: [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-2, 2, 5]], lead: 'bell', density: 0.3, pad: 0.55 },
  cave: { root: 45, scale: MINOR_P, bpm: 54, chords: [[0, 7, 12], [-2, 5, 10]], lead: 'drip', density: 0.22, pad: 0.7, drone: true },
  temple: { root: 50, scale: DORIAN, bpm: 66, chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [0, 3, 7]], lead: 'pluck', density: 0.35, pad: 0.55 },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.last = new Map();
    this.mood = null;
    this.wantMood = 'title';
    this.nextNote = 0;
    this.beat = 0;
    this.prevDeg = 4;
    this._amb = 0;
    const unlock = () => this.unlock();
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, { passive: true });
  }
  unlock() {
    if (!this.ctx) {
      try { this.init(); } catch (e) { console.warn('audio unavailable', e); return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.wantMood && this.mood !== this.wantMood) this.music(this.wantMood);
  }
  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.out = ctx.createDynamicsCompressor();
    this.out.threshold.value = -14; this.out.ratio.value = 4;
    this.out.connect(ctx.destination);
    this.master = ctx.createGain(); this.master.connect(this.out);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.mus = ctx.createGain(); this.mus.connect(this.master);
    this.amb = ctx.createGain(); this.amb.connect(this.master);
    // a soft echo shared by music and magic sounds
    this.echo = ctx.createDelay(1.0); this.echo.delayTime.value = 0.33;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    this.echo.connect(lp); lp.connect(fb); fb.connect(this.echo);
    this.echoOut = ctx.createGain(); this.echoOut.gain.value = 0.5;
    lp.connect(this.echoOut); this.echoOut.connect(this.master);
    // white noise
    const len = ctx.sampleRate * 1.5;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    clearInterval(this._iv);
    this._iv = setInterval(() => this.schedule(), 90);
  }
  applyVolumes() {
    if (!this.ctx) return;
    const s = G.settings || {};
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime((s.master ?? 0.8) * 0.9, t, 0.05);
    this.sfx.gain.setTargetAtTime(s.sfx ?? 0.7, t, 0.05);
    this.mus.gain.setTargetAtTime((s.music ?? 0.5) * 0.42, t, 0.3);
    this.amb.gain.setTargetAtTime((s.sfx ?? 0.7) * 0.5, t, 0.3);
  }

  // ---------- building blocks ----------
  tone(f, dur, o = {}) {
    const ctx = this.ctx, t = (o.when ?? ctx.currentTime) + (o.delay || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.slide ?? dur));
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibAmt ?? f * 0.02; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.1); }
    const g = ctx.createGain();
    const a = o.a ?? 0.005, v = o.v ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur));
    let node = osc;
    if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; osc.connect(f2); node = f2; }
    node.connect(g);
    g.connect(o.dest || this.sfx);
    if (o.echo) g.connect(this.echo);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  noise(dur, o = {}) {
    const ctx = this.ctx, t = (o.when ?? ctx.currentTime) + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = dur > 1.4;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const a = o.a ?? 0.003, v = o.v ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur));
    src.connect(f); f.connect(g); g.connect(o.dest || this.sfx);
    if (o.echo) g.connect(this.echo);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  arp(notes, step, o = {}) { notes.forEach((n, i) => this.tone(midi(n), o.dur ?? 0.35, { ...o, delay: (o.delay || 0) + i * step })); }

  // ---------- effects ----------
  play(name, opts) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - (this.last.get(name) || 0) < 0.035) return;
    this.last.set(name, now);
    const fn = SFX[name];
    if (fn) { try { fn(this, opts); } catch (e) { /* ignore */ } }
  }
  step(kind = 'grass') {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const v = 0.05 + Math.random() * 0.02;
    switch (kind) {
      case 'stone': this.noise(0.05, { filter: 'bandpass', f: 1800 + Math.random() * 400, q: 2, v: v * 1.3 }); break;
      case 'wood': this.tone(170 + Math.random() * 30, 0.08, { type: 'triangle', v: v * 1.6 }); this.noise(0.04, { f: 900, q: 1.5, v: v * 0.8 }); break;
      case 'snow': this.noise(0.09, { filter: 'lowpass', f: 2600, v: v * 1.3 }); break;
      case 'sand': this.noise(0.08, { filter: 'highpass', f: 1200, v: v * 0.8 }); break;
      case 'path': this.noise(0.06, { filter: 'bandpass', f: 700, q: 1.2, v: v * 1.4 }); break;
      default: this.noise(0.06, { filter: 'lowpass', f: 950 + Math.random() * 200, v: v * 1.2 });
    }
  }
  note(n) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const scale = [72, 74, 76, 79, 81, 84, 86, 88];
    const f = midi(scale[(Math.max(1, n) - 1) % scale.length]);
    this.tone(f, 0.7, { type: 'sine', v: 0.32, echo: true });
    this.tone(f * 4, 0.25, { type: 'sine', v: 0.06 });
  }

  // ---------- music ----------
  music(mood) {
    this.wantMood = mood;
    if (!this.ctx) return;
    if (mood === this.mood) return;
    this.mood = mood;
    this.nextNote = Math.max(this.nextNote, this.ctx.currentTime + 0.4);
    this.beat = 0;
    if (this.drone) { const d = this.drone; d.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.8); setTimeout(() => { try { d.o.stop(); d.o2.stop(); } catch { /* done */ } }, 3000); this.drone = null; }
    if (MOODS[mood]?.drone) {
      const ctx = this.ctx, g = ctx.createGain();
      const o = ctx.createOscillator(), o2 = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = midi(MOODS[mood].root - 12);
      o2.type = 'triangle'; o2.frequency.value = midi(MOODS[mood].root - 5) * 1.003;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.mus);
      g.gain.value = 0.0001; g.gain.setTargetAtTime(0.12, ctx.currentTime, 2);
      o.start(); o2.start();
      this.drone = { o, o2, g };
    }
  }
  currentMood() {
    if (!G.started) return 'title';
    if (G.level && G.level !== G.overworld) return G.level.kind === 'cave' ? 'cave' : 'temple';
    if (G.time.isNight()) return 'night';
    return G.player?.biome || 'meadow';
  }
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const want = this.currentMood();
    if (want !== this.mood) this.music(want);
    const M = MOODS[this.mood];
    if (!M) return;
    const spb = 60 / M.bpm / 2; // eighth notes
    const ahead = this.ctx.currentTime + 0.35;
    while (this.nextNote < ahead) {
      this.playBeat(M, this.nextNote, spb);
      this.nextNote += spb;
      this.beat++;
    }
  }
  playBeat(M, t, spb) {
    const bar = Math.floor(this.beat / 8), b = this.beat % 8;
    const chord = M.chords[bar % M.chords.length];
    const dest = this.mus;
    if (b === 0) {
      // pad chord and bass
      for (const c of chord) this.tone(midi(M.root + c), spb * 8.5, { type: 'triangle', v: 0.035 * M.pad, a: 0.6, when: t, dest, lp: 1200 });
      this.tone(midi(M.root + chord[0] - 24), spb * 3, { type: 'sine', v: 0.11, a: 0.02, when: t, dest });
    }
    if (b === 4 && Math.random() < 0.7) this.tone(midi(M.root + chord[0] - 24 + (Math.random() < 0.5 ? 7 : 12)), spb * 2, { type: 'sine', v: 0.07, a: 0.02, when: t, dest });
    if (M.drums && (b === 0 || b === 3 || b === 6)) this.noise(0.08, { filter: 'lowpass', f: 180, v: 0.12, when: t, dest });
    if (M.drums && b % 2 === 1 && Math.random() < 0.6) this.noise(0.03, { filter: 'highpass', f: 6000, v: 0.025, when: t, dest });
    // melody: a random walk over the scale, landing on chord tones on strong beats
    if (Math.random() < M.density * (b % 2 === 0 ? 1.2 : 0.6)) {
      let deg = this.prevDeg + Math.round((Math.random() - 0.5) * 3.2);
      deg = Math.max(0, Math.min(M.scale.length * 2 - 1, deg));
      this.prevDeg = deg;
      let semi = M.scale[deg % M.scale.length] + 12 * Math.floor(deg / M.scale.length);
      if (b === 0) { const tgt = chord[1] % 12; semi = semi - (semi % 12) + ((tgt + 12) % 12); }
      const f = midi(M.root + 12 + semi);
      const len = spb * (Math.random() < 0.3 ? 3 : 1.6);
      switch (M.lead) {
        case 'marimba': this.tone(f, len, { type: 'sine', v: 0.13, a: 0.003, when: t, dest }); this.tone(f * 4, 0.08, { type: 'sine', v: 0.025, when: t, dest }); break;
        case 'flute': this.tone(f, len * 1.4, { type: 'triangle', v: 0.07, a: 0.06, when: t, dest, vib: 5, vibAmt: f * 0.008, lp: 2200 }); break;
        case 'bell': this.tone(f, len * 2, { type: 'sine', v: 0.09, a: 0.004, when: t, dest, echo: true }); this.tone(f * 2.01, len, { type: 'sine', v: 0.025, when: t, dest }); break;
        case 'pluck': this.tone(f, len, { type: 'triangle', v: 0.09, a: 0.003, when: t, dest, lp: 1800, echo: true }); break;
        case 'drip': this.tone(f * 2, 0.25, { type: 'sine', to: f * 2.6, slide: 0.05, v: 0.07, a: 0.002, when: t, dest, echo: true }); break;
      }
    }
  }

  // ---------- ambience ----------
  update(dt) {
    if (!this.ctx || this.ctx.state !== 'running' || !G.started || G.paused) return;
    this._amb -= dt;
    if (this._amb > 0) return;
    this._amb = 0.6 + Math.random() * 1.6;
    if (G.level !== G.overworld) {
      if (G.level.kind === 'cave' && Math.random() < 0.3) this.tone(midi(84 + Math.floor(Math.random() * 6)), 0.2, { to: 3000, slide: 0.04, v: 0.04, dest: this.amb, echo: true });
      return;
    }
    const p = G.player.pos, night = G.time.isNight();
    const biome = G.player.biome || 'meadow';
    const T = G.overworld.terrain;
    // waves near the shore
    let water = false;
    for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) if (T.groundAt(p.x + dx, p.z + dz) < -0.4 && !T.lakeAt(p.x + dx, p.z + dz, 3)) water = true;
    if (water && Math.random() < 0.6) this.noise(1.6, { filter: 'lowpass', f: 600, fTo: 300, v: 0.05, a: 0.6, dest: this.amb });
    if (night) {
      if (Math.random() < 0.7) for (let i = 0; i < 3; i++) this.tone(4200 + Math.random() * 300, 0.03, { type: 'square', v: 0.006, delay: i * 0.06, dest: this.amb, lp: 6000 });
    } else if (biome === 'meadow' || biome === 'forest') {
      if (Math.random() < 0.45) { const f = 2400 + Math.random() * 1600; this.tone(f, 0.08, { to: f * 1.3, v: 0.018, dest: this.amb }); this.tone(f * 1.1, 0.07, { to: f * 0.9, v: 0.015, delay: 0.12, dest: this.amb }); }
    } else if (biome === 'jungle') {
      if (Math.random() < 0.5) this.tone(1400 + Math.random() * 900, 0.18, { to: 2600, v: 0.016, dest: this.amb, vib: 18, vibAmt: 120 });
    } else if (biome === 'mountain') {
      if (Math.random() < 0.35) this.noise(2.0, { filter: 'bandpass', f: 500, fTo: 900, q: 0.6, v: 0.03, a: 0.8, dest: this.amb });
    }
  }
}

// Every named sound effect
const SFX = {
  click: (a) => a.tone(1300, 0.04, { type: 'triangle', v: 0.12 }),
  blip: (a) => a.tone(820 + Math.random() * 120, 0.04, { type: 'square', v: 0.025, lp: 2400 }),
  open: (a) => { a.noise(0.12, { f: 1800, fTo: 3200, q: 0.8, v: 0.06 }); a.tone(520, 0.08, { to: 780, v: 0.06, type: 'triangle' }); },
  close: (a) => { a.noise(0.1, { f: 2600, fTo: 1400, q: 0.8, v: 0.05 }); a.tone(700, 0.08, { to: 480, v: 0.05, type: 'triangle' }); },
  error: (a) => { a.tone(330, 0.09, { type: 'square', v: 0.06, lp: 1600 }); a.tone(247, 0.14, { type: 'square', v: 0.06, lp: 1600, delay: 0.09 }); },
  coin: (a) => { a.tone(988, 0.07, { type: 'square', v: 0.05, lp: 4000 }); a.tone(1319, 0.22, { type: 'square', v: 0.05, lp: 4000, delay: 0.07 }); },
  buy: (a) => { SFX.coin(a); a.tone(660, 0.06, { type: 'triangle', v: 0.08 }); },
  pickup: (a) => a.tone(620, 0.09, { to: 1240, slide: 0.07, type: 'triangle', v: 0.12 }),
  pick: (a) => a.tone(480, 0.07, { to: 900, slide: 0.05, v: 0.14 }),
  pop: (a) => a.tone(420, 0.06, { to: 880, slide: 0.04, v: 0.14 }),
  chop: (a) => { a.noise(0.08, { f: 900 + Math.random() * 200, q: 1.4, v: 0.3 }); a.tone(150, 0.12, { to: 90, v: 0.25, type: 'triangle' }); },
  mine: (a) => { a.noise(0.05, { filter: 'highpass', f: 2500, v: 0.25 }); a.tone(2350 + Math.random() * 200, 0.18, { v: 0.07 }); a.tone(3120, 0.12, { v: 0.05 }); a.tone(110, 0.1, { v: 0.2, type: 'triangle' }); },
  dig: (a) => { a.noise(0.16, { filter: 'lowpass', f: 500, v: 0.32 }); a.noise(0.08, { filter: 'bandpass', f: 1400, v: 0.08, delay: 0.05 }); },
  smash: (a) => { for (let i = 0; i < 4; i++) a.noise(0.06, { f: 2500 + Math.random() * 2000, q: 2, v: 0.18, delay: i * 0.035 }); a.tone(300, 0.15, { to: 120, v: 0.1, type: 'triangle' }); },
  rustle: (a) => a.noise(0.2, { filter: 'highpass', f: 2200, v: 0.1, a: 0.03 }),
  thunk: (a) => a.tone(130, 0.12, { to: 80, v: 0.25, type: 'triangle' }),
  thud: (a) => { a.tone(85, 0.25, { to: 50, v: 0.3 }); a.noise(0.1, { filter: 'lowpass', f: 300, v: 0.15 }); },
  bump: (a) => a.tone(110, 0.14, { to: 70, v: 0.22, type: 'triangle' }),
  clank: (a) => { a.tone(800, 0.12, { type: 'square', v: 0.05, lp: 3000 }); a.tone(1130, 0.12, { type: 'square', v: 0.04, lp: 3000 }); },
  whoosh: (a) => a.noise(0.2, { f: 400, fTo: 2200, q: 1.2, v: 0.12, a: 0.04 }),
  whipWind: (a) => a.noise(0.15, { f: 600, fTo: 1800, q: 1.4, v: 0.08, a: 0.05 }),
  whip: (a) => { a.noise(0.05, { filter: 'highpass', f: 3500, v: 0.35 }); a.tone(1800, 0.04, { to: 600, v: 0.08, type: 'square', lp: 5000 }); },
  hit: (a) => { a.noise(0.06, { filter: 'lowpass', f: 1600, v: 0.25 }); a.tone(160, 0.08, { to: 90, v: 0.2 }); },
  eat: (a) => { for (let i = 0; i < 3; i++) a.noise(0.06, { f: 1800, q: 1, v: 0.14, delay: i * 0.13 }); },
  pet: (a) => { a.tone(520, 0.12, { to: 720, v: 0.1 }); a.tone(880, 0.18, { v: 0.05, delay: 0.1 }); },
  magic: (a) => a.arp([84, 88, 91, 96], 0.06, { type: 'sine', v: 0.08, dur: 0.5, echo: true }),
  teleport: (a) => { a.tone(300, 0.6, { to: 1600, v: 0.1, type: 'sine', echo: true }); a.arp([88, 91, 96, 100], 0.08, { v: 0.05, dur: 0.4, delay: 0.3, echo: true }); },
  fanfare: (a) => { a.arp([72, 76, 79], 0.11, { type: 'triangle', v: 0.13, dur: 0.3 }); [72, 76, 79, 84].forEach((n) => a.tone(midi(n), 0.9, { type: 'triangle', v: 0.07, delay: 0.36, echo: true })); },
  quest: (a) => { a.arp([79, 84, 88], 0.09, { type: 'triangle', v: 0.12, dur: 0.3 }); a.tone(midi(91), 0.7, { v: 0.08, delay: 0.27, echo: true }); },
  levelup: (a) => a.arp([72, 76, 79, 84, 88], 0.07, { type: 'square', v: 0.05, lp: 3000, dur: 0.25 }),
  solve: (a) => { a.arp([76, 79, 83, 88], 0.08, { type: 'triangle', v: 0.1, dur: 0.35 }); a.tone(midi(95), 0.8, { v: 0.05, delay: 0.32, echo: true }); },
  door: (a) => { a.tone(95, 0.6, { to: 60, type: 'sawtooth', v: 0.06, lp: 500 }); a.noise(0.5, { filter: 'lowpass', f: 400, v: 0.08, a: 0.1 }); },
  chest: (a) => { a.tone(180, 0.25, { to: 260, type: 'sawtooth', v: 0.05, lp: 700 }); a.arp([84, 88, 91], 0.07, { v: 0.08, dur: 0.4, delay: 0.2, echo: true }); },
  treasure: (a) => { SFX.dig(a); a.arp([79, 84, 88, 91, 96], 0.06, { type: 'triangle', v: 0.08, dur: 0.35, delay: 0.15, echo: true }); },
  splash: (a) => { a.noise(0.35, { filter: 'lowpass', f: 1400, fTo: 400, v: 0.25 }); for (let i = 0; i < 3; i++) a.tone(600 + Math.random() * 600, 0.05, { to: 1400, v: 0.04, delay: 0.1 + i * 0.07 }); },
  bite: (a) => { a.tone(900, 0.06, { to: 1300, v: 0.12 }); a.tone(900, 0.06, { to: 1300, v: 0.12, delay: 0.1 }); a.noise(0.12, { filter: 'lowpass', f: 1200, v: 0.12 }); },
  plip: (a) => a.tone(950, 0.06, { to: 1350, v: 0.07 }),
  reel: (a) => { for (let i = 0; i < 10; i++) a.noise(0.015, { filter: 'highpass', f: 4000, v: 0.08, delay: i * 0.04 }); },
  reelIn: (a) => { for (let i = 0; i < 6; i++) a.noise(0.015, { filter: 'highpass', f: 4000, v: 0.06, delay: i * 0.03 }); },
  catch: (a) => { a.noise(0.25, { filter: 'lowpass', f: 1600, v: 0.18 }); a.arp([79, 84, 88], 0.07, { type: 'triangle', v: 0.1, dur: 0.3, delay: 0.1 }); },
  fail: (a) => { a.tone(392, 0.15, { type: 'triangle', v: 0.1 }); a.tone(330, 0.3, { type: 'triangle', v: 0.1, delay: 0.15 }); },
  hurt: (a) => { a.tone(320, 0.15, { to: 140, type: 'square', v: 0.07, lp: 1800 }); a.noise(0.1, { filter: 'lowpass', f: 900, v: 0.15 }); },
  faint: (a) => a.tone(440, 1.2, { to: 110, type: 'triangle', v: 0.12 }),
  stone: (a) => a.noise(0.3, { filter: 'lowpass', f: 380, v: 0.25, a: 0.03 }),
  push: (a) => a.noise(0.25, { filter: 'lowpass', f: 320, v: 0.22, a: 0.04 }),
  slide: (a) => a.noise(0.4, { filter: 'bandpass', f: 2600, fTo: 1800, q: 0.6, v: 0.06, a: 0.05 }),
  fire: (a) => { a.noise(0.5, { filter: 'lowpass', f: 1400, v: 0.12, a: 0.08 }); for (let i = 0; i < 4; i++) a.noise(0.02, { filter: 'highpass', f: 3000, v: 0.1, delay: Math.random() * 0.4 }); },
  tick: (a) => a.tone(2400, 0.02, { type: 'square', v: 0.03, lp: 5000 }),
  switch: (a) => { a.noise(0.03, { filter: 'highpass', f: 3000, v: 0.15 }); a.tone(500, 0.1, { to: 900, v: 0.08, type: 'triangle', delay: 0.02 }); },
  switchOff: (a) => { a.noise(0.03, { filter: 'highpass', f: 3000, v: 0.15 }); a.tone(800, 0.1, { to: 450, v: 0.08, type: 'triangle', delay: 0.02 }); },
  lever: (a) => { a.tone(160, 0.15, { to: 240, type: 'sawtooth', v: 0.06, lp: 800 }); a.noise(0.04, { filter: 'highpass', f: 2500, v: 0.12, delay: 0.12 }); },
  spike: (a) => a.noise(0.18, { filter: 'highpass', f: 5000, fTo: 2000, v: 0.12 }),
  puff: (a) => a.noise(0.25, { filter: 'lowpass', f: 900, fTo: 300, v: 0.12, a: 0.03 }),
  poof: (a) => { a.noise(0.3, { filter: 'lowpass', f: 1200, fTo: 300, v: 0.16, a: 0.02 }); a.tone(600, 0.2, { to: 1200, v: 0.04 }); },
  place: (a) => a.tone(140, 0.12, { to: 95, v: 0.2, type: 'triangle' }),
  craft: (a) => { a.tone(1500, 0.12, { v: 0.06 }); a.tone(1500, 0.12, { v: 0.06, delay: 0.14 }); a.arp([84, 88], 0.08, { v: 0.06, dur: 0.3, delay: 0.3 }); },
  build: (a) => { for (let i = 0; i < 3; i++) { a.tone(140, 0.1, { to: 90, v: 0.2, type: 'triangle', delay: i * 0.18 }); a.noise(0.03, { filter: 'highpass', f: 2500, v: 0.08, delay: i * 0.18 }); } a.arp([79, 84, 88], 0.08, { v: 0.07, dur: 0.4, delay: 0.6, echo: true }); },
  anvil: (a) => { a.tone(1500, 0.7, { v: 0.08 }); a.tone(2210, 0.5, { v: 0.05 }); a.noise(0.04, { filter: 'highpass', f: 3000, v: 0.2 }); },
  lift: (a) => { a.tone(70, 1.6, { type: 'sawtooth', v: 0.05, lp: 300, vib: 6, vibAmt: 6 }); for (let i = 0; i < 6; i++) a.noise(0.03, { f: 1200, q: 3, v: 0.06, delay: 0.2 + i * 0.25 }); },
  horn: (a) => { a.tone(110, 1.3, { type: 'sawtooth', v: 0.07, lp: 600, a: 0.08 }); a.tone(165, 1.3, { type: 'sawtooth', v: 0.05, lp: 600, a: 0.08 }); },
  key: (a) => a.arp([93, 96, 100], 0.05, { v: 0.06, dur: 0.2 }),
  boom: (a) => { a.noise(0.7, { filter: 'lowpass', f: 260, v: 0.4, a: 0.005 }); a.tone(65, 0.6, { to: 35, v: 0.3 }); },
  growl: (a) => a.tone(78, 0.55, { type: 'sawtooth', v: 0.08, lp: 420, vib: 22, vibAmt: 10, a: 0.05 }),
  ghost: (a) => a.tone(640, 0.7, { to: 420, v: 0.05, vib: 7, vibAmt: 20, echo: true, a: 0.1 }),
  hiss: (a) => a.noise(0.3, { filter: 'highpass', f: 4200, v: 0.1, a: 0.04 }),
  bark: (a) => { a.tone(520, 0.08, { to: 360, type: 'sawtooth', v: 0.08, lp: 1400 }); a.tone(540, 0.09, { to: 340, type: 'sawtooth', v: 0.08, lp: 1400, delay: 0.16 }); },
  chirp: (a) => { a.tone(1900, 0.06, { to: 2900, v: 0.07 }); a.tone(2100, 0.06, { to: 3100, v: 0.06, delay: 0.09 }); },
};
