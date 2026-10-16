// Ambient bugs around the player. Swing the Bug Net to catch them: they are
// fishing bait and sell for a few coins.
import * as THREE from '../three.js';
import { G, angleLerp } from '../core/game.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from '../world/materials.js';
import { CITIES } from '../data/layout.js';

const S = { flat: false, jitter: 0 };
// where and when each bug lives
const SPAWN = {
  meadow: { day: [['caterpillar', 3], ['butterfly', 3]], night: [['firefly', 3], ['caterpillar', 1]] },
  forest: { day: [['grasshopper', 3], ['butterfly', 2]], night: [['firefly', 3], ['grasshopper', 1]] },
  mountain: { day: [['frost_beetle', 4], ['butterfly', 1]], night: [['frost_beetle', 3]] },
  jungle: { day: [['firefly', 2], ['butterfly', 3], ['grasshopper', 1]], night: [['firefly', 5]] },
};
const KIND = {
  caterpillar: { move: 'crawl', speed: 0.35, shy: 0.1 },
  grasshopper: { move: 'hop', speed: 3.2, shy: 0.45 },
  frost_beetle: { move: 'crawl', speed: 0.6, shy: 0.2 },
  firefly: { move: 'fly', speed: 1.4, shy: 0.25 },
  butterfly: { move: 'fly', speed: 1.8, shy: 0.35 },
};
const WINGS = [0xffa94d, 0x7ab8ff, 0xff8ac8, 0xfff07a];

function bugModel(id, variant) {
  const g = new THREE.Group();
  const body = [], glow = [];
  let wings = null;
  switch (id) {
    case 'caterpillar':
      for (let i = 0; i < 5; i++) body.push(part(P.sphere(0.07, 7, 5), i === 4 ? 0x6fb83a : 0x8fd14f, { ...S, z: i * 0.09 - 0.18, y: 0.07 }));
      body.push(part(P.sphere(0.02, 4, 3), 0x111111, { ...S, x: 0.035, y: 0.1, z: 0.21 }), part(P.sphere(0.02, 4, 3), 0x111111, { ...S, x: -0.035, y: 0.1, z: 0.21 }));
      break;
    case 'grasshopper':
      body.push(part(P.sphere(0.07, 7, 5), 0x5fb43a, { ...S, y: 0.1, sz: 2.4 }));
      body.push(part(P.sphere(0.055, 6, 5), 0x4f9a2e, { ...S, y: 0.13, z: 0.16 }));
      for (const sx of [-1, 1]) body.push(part(P.cyl(0.012, 0.012, 0.22, 3), 0x3f7a26, { x: sx * 0.06, y: 0.12, z: -0.06, rx: 0.9, rz: sx * 0.5 }));
      break;
    case 'frost_beetle':
      body.push(part(P.sphere(0.11, 8, 6), 0x7fc8ff, { ...S, y: 0.08, sy: 0.6, sz: 1.2 }));
      body.push(part(P.sphere(0.05, 6, 5), 0x2a3a4a, { ...S, y: 0.07, z: 0.13 }));
      body.push(part(P.box(0.01, 0.02, 0.24), 0x3a6a9a, { y: 0.14 }));
      break;
    case 'firefly':
      body.push(part(P.sphere(0.04, 6, 5), 0x3a3030, { ...S, z: 0.04 }));
      glow.push(part(P.sphere(0.06, 7, 5), 0xfff27a, { ...S, z: -0.05 }));
      wings = [part(P.box(0.12, 0.005, 0.06), 0xdfefff, { x: 0.06, jitter: 0 }), part(P.box(0.12, 0.005, 0.06), 0xdfefff, { x: -0.06, jitter: 0 })];
      break;
    case 'butterfly': {
      const c = WINGS[variant % WINGS.length];
      body.push(part(P.cyl(0.015, 0.015, 0.16, 4), 0x2a2020, { rx: Math.PI / 2 }));
      wings = [part(P.box(0.2, 0.005, 0.18), c, { x: 0.1, jitter: 0 }), part(P.box(0.2, 0.005, 0.18), c, { x: -0.1, jitter: 0 })];
      break;
    }
  }
  const b = new THREE.Mesh(merge(body), MAT.char);
  b.castShadow = true;
  g.add(b);
  if (glow.length) g.add(new THREE.Mesh(merge(glow), new THREE.MeshBasicMaterial({ color: 0xfff27a })));
  let wl = null, wr = null;
  if (wings) {
    wl = new THREE.Mesh(merge([wings[0]]), MAT.worldDS); wr = new THREE.Mesh(merge([wings[1]]), MAT.worldDS);
    g.add(wl, wr);
  }
  return { g, wl, wr };
}

export class Bugs {
  constructor() {
    this.list = [];
    this.t = 0;
    G.events.on('levelChanged', () => this.clear());
  }
  clear() { for (const b of this.list) b.level.scene.remove(b.obj); this.list = []; }
  remove(b) { b.level.scene.remove(b.obj); this.list.splice(this.list.indexOf(b), 1); }
  spawnOne() {
    const W = G.overworld, T = W.terrain, p = G.player.pos;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 26;
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      if (!T.walkable(x, z) || T.groundAt(x, z) < 0.6) continue;
      if (Object.values(CITIES).some((c) => Math.hypot(c.x - x, c.z - z) < c.r * 0.45)) continue;
      const biome = T.biomeAt(x, z);
      const table = SPAWN[biome][G.time.isNight() ? 'night' : 'day'];
      let tot = table.reduce((s, e) => s + e[1], 0) * Math.random();
      let id = table[0][0];
      for (const [k, w] of table) { tot -= w; if (tot <= 0) { id = k; break; } }
      const m = bugModel(id, Math.floor(Math.random() * 4));
      const K = KIND[id];
      const b = { id, K, obj: m.g, wl: m.wl, wr: m.wr, x, z, y: 0, rot: Math.random() * 6, tx: x, tz: z, t: Math.random() * 10, hopT: 0, vy: 0, alt: K.move === 'fly' ? 0.9 + Math.random() * 0.8 : 0, level: W, flee: 0 };
      W.scene.add(m.g);
      this.list.push(b);
      return;
    }
  }
  wander(b, far = 3) {
    const T = G.overworld.terrain;
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * far;
      const x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r;
      if (b.K.move === 'fly' ? T.groundAt(x, z) > 0.2 : T.walkable(x, z)) { b.tx = x; b.tz = z; return; }
    }
  }
  scare(b, fromX, fromZ) {
    const dx = b.x - fromX, dz = b.z - fromZ, l = Math.hypot(dx, dz) || 1;
    b.tx = b.x + dx / l * 4; b.tz = b.z + dz / l * 4;
    b.flee = 1.2;
    if (b.K.move === 'hop' && b.vy === 0) b.vy = 4.2;
  }
  // called by the net swing
  tryCatch(pl, power) {
    const fx = Math.sin(pl.rotY), fz = Math.cos(pl.rotY);
    let best = null, bd = Infinity;
    for (const b of this.list) {
      const dx = b.x - pl.pos.x, dz = b.z - pl.pos.z, d = Math.hypot(dx, dz);
      if (d > 2.6) continue;
      if ((dx * fx + dz * fz) / (d || 1) < 0.25 && d > 0.8) continue;
      if (d < bd) { bd = d; best = b; }
    }
    const nx = pl.pos.x + fx * 1.4, nz = pl.pos.z + fz * 1.4;
    G.particles?.burst('leaves', nx, pl.pos.y + 0.4, nz, { n: 4 });
    if (!best) return false;
    const chance = Math.min(0.97, 0.72 + power * 0.015 - (best.flee > 0 ? 0.25 : 0));
    if (Math.random() > chance) { this.scare(best, pl.pos.x, pl.pos.z); G.ui.toast('Missed! It got away.', 'warn', 1500); return false; }
    this.remove(best);
    const left = G.inv.add(best.id, 1);
    if (left > 0) G.pickups.spawn(best.id, left, pl.pos.x, pl.pos.y + 1, pl.pos.z);
    G.particles?.burst('sparkle', best.x, best.obj.position.y + 0.2, best.z, { n: 8 });
    G.audio?.play('catch');
    const st = G.save.stats.caught;
    st[best.id] = (st[best.id] || 0) + 1;
    G.events.emit('bugCaught', best.id);
    return true;
  }
  update(dt) {
    if (G.level !== G.overworld || !G.started) { if (this.list.length) this.clear(); return; }
    const p = G.player.pos;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 0.7;
      for (const b of [...this.list]) if (Math.hypot(b.x - p.x, b.z - p.z) > 48) this.remove(b);
      const want = G.time.isNight() ? 7 : 10;
      if (this.list.length < want) this.spawnOne();
    }
    const T = G.overworld.terrain;
    const running = G.player.moving && Math.hypot(G.player.vel.x, G.player.vel.z) > 6.5;
    for (const b of this.list) {
      b.t += dt;
      if (b.flee > 0) b.flee -= dt;
      const pd = Math.hypot(b.x - p.x, b.z - p.z);
      if (pd < 2.4 && running && b.flee <= 0 && Math.random() < b.K.shy) this.scare(b, p.x, p.z);
      const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz);
      const sp = b.K.speed * (b.flee > 0 ? 2.2 : 1);
      if (b.K.move === 'hop') {
        b.hopT -= dt;
        if (b.vy === 0 && b.hopT <= 0 && d > 0.3) { b.vy = 3.2; b.hopT = 1 + Math.random() * 2.5; }
        if (b.vy !== 0 || b.y > 0) {
          b.y += b.vy * dt; b.vy -= 14 * dt;
          if (d > 0.05) { b.x += dx / d * sp * dt; b.z += dz / d * sp * dt; }
          if (b.y <= 0) { b.y = 0; b.vy = 0; if (d < 0.5) this.wander(b); }
        }
      } else if (d > 0.1) {
        b.x += dx / d * Math.min(d, sp * dt); b.z += dz / d * Math.min(d, sp * dt);
      } else if (Math.random() < dt * (b.K.move === 'fly' ? 1.5 : 0.4)) this.wander(b, b.K.move === 'fly' ? 4 : 1.5);
      if (d > 0.05) b.rot = angleLerp(b.rot, Math.atan2(dx, dz), Math.min(1, dt * 6));
      const gy = T.heightAt(b.x, b.z);
      let y = gy + b.y;
      if (b.K.move === 'fly') y = Math.max(gy, 0) + b.alt + Math.sin(b.t * 3.1) * 0.25;
      b.y0 = y;
      b.obj.position.set(b.x, y, b.z);
      b.obj.rotation.y = b.rot;
      if (b.wl) {
        const f = Math.sin(b.t * (b.id === 'firefly' ? 40 : 14)) * 0.9;
        b.wl.rotation.z = f; b.wr.rotation.z = -f;
      }
      if (b.id === 'caterpillar') b.obj.scale.set(1, 1, 1 + Math.sin(b.t * 6) * 0.08);
    }
  }
}
