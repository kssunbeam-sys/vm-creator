'use strict';
// Tiny WebAudio synth: sound effects + gentle generative music that changes with biome and time of day.
G.Audio = (() => {
  let ctx = null, master, music, sfxG, noiseBuf, timer = null, nextT = 0, step = 0, biome = 'meadow', indoor = false;
  const SCALES = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10], dorian: [0, 2, 3, 7, 9], phrygian: [0, 1, 5, 7, 8] };
  const PROG = { major: [0, 9, 5, 7], minor: [0, 8, 3, 10], dorian: [0, 5, 3, 10], phrygian: [0, 1, 0, 8] };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    music = ctx.createGain(); music.connect(master);
    sfxG = ctx.createGain(); sfxG.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    volumes();
    nextT = ctx.currentTime + 0.2;
    timer = setInterval(schedule, 100);
  }
  function volumes() {
    if (!ctx || !G.S) return;
    music.gain.value = (G.S.settings.music ?? 0.45) * 0.5;
    sfxG.gain.value = (G.S.settings.sfx ?? 0.7) * 0.6;
  }
  function tone(f, dur, type, vol, when, dest, slideTo, attack) {
    if (!ctx) return;
    const t = when || ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + (attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, when) {
    if (!ctx) return;
    const t = when || ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq || 800; f.Q.value = 1.2;
    g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxG); s.start(t); s.stop(t + dur + 0.05);
  }
  function sfx(name) {
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'chop': noise(0.12, 0.5, 300); tone(160, 0.12, 'square', 0.08, t, null, 90); break;
      case 'mine': tone(900, 0.08, 'triangle', 0.18); tone(1350, 0.1, 'triangle', 0.1, t + 0.02); noise(0.06, 0.2, 2500); break;
      case 'break': noise(0.25, 0.4, 500); tone(220, 0.2, 'triangle', 0.12, t, null, 110); break;
      case 'pick': tone(660, 0.08, 'triangle', 0.18); tone(990, 0.12, 'triangle', 0.15, t + 0.06); break;
      case 'coin': tone(1320, 0.08, 'square', 0.06); tone(1760, 0.18, 'square', 0.06, t + 0.07); break;
      case 'quest': [0, 4, 7, 12].forEach((s, i) => tone(mtof(72 + s), 0.3, 'triangle', 0.14, t + i * 0.09)); break;
      case 'level': [0, 4, 7, 11, 12, 16].forEach((s, i) => tone(mtof(67 + s), 0.35, 'triangle', 0.12, t + i * 0.07)); break;
      case 'splash': noise(0.35, 0.35, 1200); break;
      case 'bite': tone(1000, 0.06, 'square', 0.08); tone(1000, 0.06, 'square', 0.08, t + 0.1); break;
      case 'catch': [0, 7, 12].forEach((s, i) => tone(mtof(76 + s), 0.25, 'sine', 0.18, t + i * 0.08)); break;
      case 'miss': tone(400, 0.2, 'triangle', 0.12, t, null, 200); break;
      case 'pet': tone(880, 0.1, 'sine', 0.15, t, null, 1320); tone(1320, 0.12, 'sine', 0.1, t + 0.1, null, 1760); break;
      case 'ui': tone(700, 0.05, 'triangle', 0.08); break;
      case 'hurt': tone(300, 0.2, 'sawtooth', 0.1, t, null, 120); break;
      case 'hit': noise(0.08, 0.3, 1500); tone(500, 0.08, 'square', 0.06, t, null, 300); break;
      case 'door': noise(0.15, 0.2, 400); tone(300, 0.15, 'triangle', 0.08); break;
      case 'teleport': tone(300, 0.6, 'sine', 0.15, t, null, 1200); tone(450, 0.6, 'sine', 0.1, t + 0.05, null, 1800); break;
      case 'puzzle': [0, 4, 7].forEach((s) => tone(mtof(79 + s), 0.6, 'sine', 0.1, t)); break;
      case 'gate': noise(0.4, 0.3, 200); tone(110, 0.4, 'triangle', 0.12); break;
      case 'push': noise(0.12, 0.25, 250); break;
      case 'swing': noise(0.08, 0.15, 3000); break;
      case 'eat': tone(500, 0.06, 'square', 0.06); tone(600, 0.06, 'square', 0.06, t + 0.08); break;
    }
  }
  function schedule() {
    if (!ctx || !G.S || G.S.settings.music <= 0) { if (ctx) nextT = ctx.currentTime + 0.1; return; }
    const b = G.D.BIOMES.find((x) => x.key === biome) || G.D.BIOMES[0];
    const scale = SCALES[b.scale], prog = PROG[b.scale];
    const night = G.Sys && G.S && G.Sys.isNight();
    const beat = 60 / (night ? 66 : 80) / 2;
    while (nextT < ctx.currentTime + 0.3) {
      const bar = Math.floor(step / 8) % 4, sub = step % 8, root = b.root + prog[bar] - (indoor ? 0 : 0);
      if (sub === 0) {
        [0, scale[2] > 3 ? 4 : 3, 7].forEach((iv) => tone(mtof(root - 12 + iv), beat * 8, 'sine', night ? 0.05 : 0.06, nextT, music, null, 0.6));
        tone(mtof(root - 24), beat * 4, 'triangle', 0.07, nextT, music, null, 0.05);
      }
      if (sub === 4) tone(mtof(root - 24 + 7), beat * 4, 'triangle', 0.05, nextT, music, null, 0.05);
      const h = G.U.hash(step, bar, 777);
      if (h < (night ? 0.3 : 0.55)) {
        const deg = Math.floor(G.U.hash(step, 3, 41) * 7), oct = deg >= 5 ? 12 : 0;
        tone(mtof(b.root + 12 + scale[deg % 5] + oct), beat * 1.8, 'triangle', night ? 0.04 : 0.055, nextT, music, null, 0.01);
      }
      if (night && sub === 6 && h < 0.5) tone(mtof(b.root + 24 + scale[(step >> 3) % 5]), beat * 3, 'sine', 0.02, nextT, music);
      nextT += beat; step++;
    }
  }
  return { init, sfx, volumes, setBiome(k, ind) { biome = k || 'meadow'; indoor = !!ind; }, get ready() { return !!ctx; } };
})();
