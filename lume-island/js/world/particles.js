// Pooled low-poly particles (leaves, chips, sparks, splashes, sparkles).
import * as THREE from '../three.js';
import { G } from '../core/game.js';

const PRESETS = {
  tree: { n: 8, colors: [0x7cc04a, 0x5aa846, 0x9a6a3e], speed: 3, up: 4, size: 0.16, life: 0.9, grav: 9 },
  leaves: { n: 14, colors: [0x6fbf47, 0x82cc52, 0x4f9e3e], speed: 4, up: 3, size: 0.2, life: 1.2, grav: 4 },
  rock: { n: 9, colors: [0xa9a49a, 0x8a8680, 0xc8c2b8], speed: 3.5, up: 4.5, size: 0.15, life: 0.8, grav: 14 },
  bush: { n: 8, colors: [0x4f9e3e, 0x6fbf47], speed: 2.5, up: 3, size: 0.14, life: 0.8, grav: 8 },
  plant: { n: 6, colors: [0x7cc04a, 0xffffff, 0xffd43b], speed: 2, up: 3, size: 0.12, life: 0.7, grav: 8 },
  dig: { n: 10, colors: [0x8a6a48, 0x6a4e34, 0xb08a60], speed: 2.5, up: 5, size: 0.15, life: 0.8, grav: 14 },
  break: { n: 10, colors: [0xc9804a, 0x8a4a2a, 0xf2d6a0], speed: 4, up: 4, size: 0.16, life: 0.8, grav: 14 },
  sparkle: { n: 12, colors: [0xfff6b0, 0xffffff, 0x9fe8ff], speed: 2, up: 2.5, size: 0.1, life: 1.0, grav: -0.5, glow: true },
  splash: { n: 14, colors: [0xffffff, 0xbff0ff, 0x7fdcff], speed: 2.5, up: 5, size: 0.12, life: 0.7, grav: 14 },
  hit: { n: 8, colors: [0xffffff, 0xfff2a0], speed: 5, up: 2, size: 0.1, life: 0.35, grav: 0, glow: true },
  smoke: { n: 6, colors: [0xd8d8d8, 0xbfbfbf], speed: 0.8, up: 1.4, size: 0.35, life: 1.6, grav: -0.6 },
  magic: { n: 18, colors: [0x7ad6ff, 0xc08aff, 0xfff2a0], speed: 3, up: 3, size: 0.12, life: 1.3, grav: -1, glow: true },
  hearts: { n: 6, colors: [0xff7aa8, 0xff9ac0], speed: 1, up: 2.5, size: 0.16, life: 1.2, grav: -1, glow: true },
  fire: { n: 10, colors: [0xff8a2a, 0xffd23a, 0xff5a2a], speed: 1.5, up: 3, size: 0.18, life: 0.7, grav: -3, glow: true },
  poison: { n: 14, colors: [0xb07af0, 0x9a5ad8, 0xd8b0ff], speed: 1.6, up: 1.2, size: 0.3, life: 1.6, grav: -0.4, glow: true },
};

const MAX = 900;
export class Particles {
  constructor() {
    const geo = new THREE.TetrahedronGeometry(1, 0);
    this.solid = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), MAX);
    this.glow = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }), MAX);
    for (const m of [this.solid, this.glow]) {
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
      m.count = 0; m.frustumCulled = false;
    }
    this.items = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
    this.scene = null;
  }
  attach(scene) {
    if (this.scene === scene) return;
    if (this.scene) { this.scene.remove(this.solid); this.scene.remove(this.glow); }
    this.items.length = 0;
    this.scene = scene;
    scene.add(this.solid); scene.add(this.glow);
  }
  burst(kind, x, y, z, opts = {}) {
    const P = PRESETS[kind] || PRESETS.rock;
    const n = opts.n ?? P.n;
    for (let i = 0; i < n; i++) {
      if (this.items.length >= MAX * 2 - 2) break;
      const a = Math.random() * Math.PI * 2, sp = P.speed * (0.4 + Math.random() * 0.8);
      this.items.push({
        x, y, z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: P.up * (0.5 + Math.random() * 0.8),
        rx: Math.random() * 6, ry: Math.random() * 6, life: P.life * (0.7 + Math.random() * 0.6), t: 0,
        size: P.size * (0.6 + Math.random() * 0.8) * (opts.scale ?? 1), grav: P.grav, glow: !!P.glow,
        color: opts.color ?? P.colors[Math.floor(Math.random() * P.colors.length)],
      });
    }
  }
  update(dt) {
    let ns = 0, ng = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.t += dt;
      if (p.t >= p.life) { this.items.splice(i, 1); continue; }
      p.vy -= p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vx *= 1 - dt * 1.5; p.vz *= 1 - dt * 1.5;
      if (!p.glow && G.level) { const gy = G.level.heightAt(p.x, p.z); if (p.y < gy + 0.05) { p.y = gy + 0.05; p.vy = 0; p.vx *= 0.5; p.vz *= 0.5; } }
      p.rx += dt * 5; p.ry += dt * 4;
      const k = 1 - p.t / p.life;
      const s = p.size * (p.glow ? k : Math.min(1, k * 3));
      this._p.set(p.x, p.y, p.z); this._e.set(p.rx, p.ry, 0); this._q.setFromEuler(this._e); this._s.set(s, s, s);
      this._m.compose(this._p, this._q, this._s);
      const mesh = p.glow ? this.glow : this.solid;
      const idx = p.glow ? ng++ : ns++;
      if (idx >= MAX) continue;
      mesh.setMatrixAt(idx, this._m);
      mesh.setColorAt(idx, this._c.set(p.color));
    }
    this.solid.count = Math.min(ns, MAX); this.glow.count = Math.min(ng, MAX);
    this.solid.instanceMatrix.needsUpdate = true; this.glow.instanceMatrix.needsUpdate = true;
    if (this.solid.instanceColor) this.solid.instanceColor.needsUpdate = true;
    if (this.glow.instanceColor) this.glow.instanceColor.needsUpdate = true;
  }
}
