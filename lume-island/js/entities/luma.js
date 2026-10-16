// Luma creatures (and Biscuit the treasure dog): models and companion AI.
import * as THREE from '../three.js';
import { G, angleLerp, clamp } from '../core/game.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from '../world/materials.js';
import { LUMA_BY_ID } from '../data/lumas.js';

const S = { flat: false, jitter: 0 };

// Returns { body: parts[], glow: parts[] } in local space (feet at y=0, facing +z)
export function lumaParts(spec) {
  const b = spec.body, a = spec.accent;
  const body = [], glow = [];
  const fly = spec.shape === 'wisp' || spec.shape === 'crown';
  const y0 = fly ? 0.35 : 0.02;
  body.push(part(P.sphere(0.4, 16, 12), b, { ...S, y: y0 + 0.38, sy: 0.9 }));
  body.push(part(P.sphere(0.28, 12, 10), new THREE.Color(b).lerp(new THREE.Color(0xffffff), 0.5).getHex(), { ...S, y: y0 + 0.3, z: 0.16, sy: 0.85, sz: 0.7 }));
  for (const sx of [-1, 1]) {
    body.push(part(P.sphere(0.085, 8, 8), 0x1e1a24, { ...S, x: sx * 0.15, y: y0 + 0.47, z: 0.33, sy: 1.35, sz: 0.6 }));
    body.push(part(P.sphere(0.03, 6, 5), 0xffffff, { ...S, x: sx * 0.15 + 0.03, y: y0 + 0.52, z: 0.38 }));
    body.push(part(P.sphere(0.05, 6, 5), 0xff9ab0, { ...S, x: sx * 0.26, y: y0 + 0.37, z: 0.3, sy: 0.5 }));
    if (!fly) body.push(part(P.sphere(0.1, 8, 6), new THREE.Color(b).multiplyScalar(0.8).getHex(), { ...S, x: sx * 0.16, y: 0.06, z: 0.08, sy: 0.6, sz: 1.3 }));
  }
  switch (spec.shape) {
    case 'fin':
      body.push(part(P.cone(0.16, 0.35, 6), a, { y: y0 + 0.85, z: -0.05, sz: 0.35 }));
      body.push(part(P.cone(0.2, 0.3, 6), a, { y: y0 + 0.3, z: -0.42, rx: -Math.PI / 2, sx: 1.4, sy: 1, sz: 0.3 }));
      glow.push(part(P.sphere(0.06, 6, 5), a, { ...S, y: y0 + 1.0, z: -0.05 }));
      break;
    case 'drop': body.push(part(P.cone(0.24, 0.4, 10), b, { ...S, y: y0 + 0.86 })); glow.push(part(P.sphere(0.08, 6, 5), a, { ...S, y: y0 + 1.08 })); break;
    case 'coral': for (let i = 0; i < 4; i++) body.push(part(P.cyl(0.04, 0.06, 0.32, 5), a, { x: (i - 1.5) * 0.12, y: y0 + 0.86, rz: (i - 1.5) * 0.4 })); glow.push(part(P.sphere(0.06, 6, 5), 0xffe0f0, { ...S, y: y0 + 1.02 })); break;
    case 'ears': for (const sx of [-1, 1]) { body.push(part(P.sphere(0.13, 8, 6), b, { ...S, x: sx * 0.25, y: y0 + 0.78 })); body.push(part(P.sphere(0.08, 6, 5), a, { ...S, x: sx * 0.25, y: y0 + 0.79, z: 0.04 })); } glow.push(part(P.sphere(0.07, 6, 5), a, { ...S, y: y0 + 0.4, z: -0.42 })); break;
    case 'long': for (const sx of [-1, 1]) { body.push(part(P.sphere(0.09, 8, 6), b, { ...S, x: sx * 0.15, y: y0 + 0.95, sy: 3.2, rz: sx * -0.25 })); body.push(part(P.sphere(0.05, 6, 5), a, { ...S, x: sx * 0.16, y: y0 + 0.95, z: 0.05, sy: 3.4, rz: sx * -0.25 })); } glow.push(part(P.sphere(0.08, 6, 5), a, { ...S, y: y0 + 0.3, z: -0.42 })); break;
    case 'crystal': for (let i = 0; i < 4; i++) glow.push(part(P.octa(0.12, 0), a, { x: (i - 1.5) * 0.14, y: y0 + 0.78 - Math.abs(i - 1.5) * 0.05, z: -0.15, sy: 1.8, rz: (i - 1.5) * 0.3 })); break;
    case 'horns': for (const sx of [-1, 1]) body.push(part(P.cone(0.07, 0.3, 6), a, { x: sx * 0.2, y: y0 + 0.82, rz: sx * -0.4 })); glow.push(part(P.sphere(0.06, 6, 5), a, { ...S, y: y0 + 0.62, z: 0.36 })); break;
    case 'wisp': body.push(part(P.cone(0.3, 0.55, 10), b, { ...S, y: y0 - 0.05, rx: Math.PI })); glow.push(part(P.sphere(0.1, 8, 6), a, { ...S, y: y0 + 0.88 })); break;
    case 'antenna': body.push(part(P.cyl(0.02, 0.02, 0.35, 4), 0x3a3030, { y: y0 + 0.88, rz: 0.2 })); glow.push(part(P.sphere(0.12, 8, 6), a, { ...S, x: -0.04, y: y0 + 1.08 })); break;
    case 'sprout': body.push(part(P.cyl(0.025, 0.025, 0.25, 4), 0x4f9a3a, { y: y0 + 0.86 })); for (const sx of [-1, 1]) body.push(part(P.sphere(0.12, 8, 5), a, { ...S, x: sx * 0.12, y: y0 + 0.98, sy: 0.35, sx: 1.6, rz: sx * 0.4 })); glow.push(part(P.sphere(0.05, 6, 5), 0xffffaa, { ...S, y: y0 + 1.0 })); break;
    case 'leaf': for (const sx of [-1, 1]) body.push(part(P.sphere(0.16, 8, 5), a, { ...S, x: sx * 0.28, y: y0 + 0.78, sx: 0.5, sy: 1.6, rz: sx * -0.6 })); glow.push(part(P.sphere(0.06, 6, 5), a, { ...S, y: y0 + 0.35, z: -0.42 })); break;
    case 'flower': for (let i = 0; i < 5; i++) { const an = i / 5 * Math.PI * 2; body.push(part(P.sphere(0.1, 8, 5), a, { ...S, x: Math.cos(an) * 0.16, y: y0 + 0.84, z: Math.sin(an) * 0.16, sy: 0.4 })); } glow.push(part(P.sphere(0.07, 6, 5), 0xfff07a, { ...S, y: y0 + 0.86 })); break;
    case 'crown':
      for (let i = 0; i < 5; i++) { const an = i / 5 * Math.PI * 2; body.push(part(P.cone(0.05, 0.16, 4), 0xf2c94c, { x: Math.cos(an) * 0.16, y: y0 + 0.86, z: Math.sin(an) * 0.16 })); }
      for (const sx of [-1, 1]) glow.push(part(P.sphere(0.28, 8, 5), a, { ...S, x: sx * 0.42, y: y0 + 0.5, z: -0.1, sx: 0.25, sy: 0.9, rz: sx * 0.5 }));
      body.push(part(P.cone(0.3, 0.55, 10), b, { ...S, y: y0 - 0.05, rx: Math.PI }));
      break;
  }
  return { body, glow, fly };
}

const geoCache = new Map();
export function lumaGeometry(speciesId) {
  if (geoCache.has(speciesId)) return geoCache.get(speciesId);
  const spec = LUMA_BY_ID[speciesId];
  const p = lumaParts(spec);
  const res = { body: merge(p.body), glow: p.glow.length ? merge(p.glow) : null, fly: p.fly, accent: spec.accent };
  geoCache.set(speciesId, res);
  return res;
}
const glowMats = new Map();
function glowMat(color) {
  if (!glowMats.has(color)) glowMats.set(color, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: color, emissiveIntensity: 0.9 }));
  return glowMats.get(color);
}

export function dogParts() {
  const c = 0xd8a060, w = 0xfff2e0, d = 0x7a4a2a;
  const body = [];
  body.push(part(P.sphere(0.36, 12, 10), c, { ...S, y: 0.48, sz: 1.35 }));
  body.push(part(P.sphere(0.3, 12, 10), c, { ...S, y: 0.82, z: 0.42 }));
  body.push(part(P.sphere(0.16, 10, 8), w, { ...S, y: 0.74, z: 0.66, sz: 0.9 }));
  body.push(part(P.sphere(0.06, 6, 5), 0x2a1e1a, { ...S, y: 0.78, z: 0.8 }));
  for (const sx of [-1, 1]) {
    body.push(part(P.sphere(0.13, 8, 6), d, { ...S, x: sx * 0.26, y: 0.88, z: 0.36, sy: 1.6, rz: sx * 0.5 }));
    body.push(part(P.sphere(0.05, 6, 5), 0x1e1a1a, { ...S, x: sx * 0.12, y: 0.9, z: 0.66 }));
    for (const sz of [-1, 1]) body.push(part(P.cyl(0.07, 0.08, 0.36, 6), c, { x: sx * 0.18, y: 0.18, z: sz * 0.28 }));
  }
  body.push(part(P.cyl(0.04, 0.07, 0.4, 6), c, { y: 0.66, z: -0.52, rx: -0.7 }));
  body.push(part(P.torus(0.2, 0.04, 5, 12), 0xd9443a, { y: 0.68, z: 0.36, rx: Math.PI / 2 + 0.3 }));
  return { body, glow: [], fly: false };
}

export class Companion {
  constructor(kind, data) {
    this.kind = kind; // 'luma' | 'dog'
    this.data = data;
    this.object = new THREE.Group();
    this.inner = new THREE.Group();
    this.object.add(this.inner);
    if (kind === 'dog') {
      const p = dogParts();
      this.inner.add(new THREE.Mesh(merge(p.body), MAT.char));
      this.fly = false;
      this.ability = 'treasure';
      this.name = 'Biscuit';
    } else {
      const spec = LUMA_BY_ID[data.species];
      const g = lumaGeometry(data.species);
      this.inner.add(new THREE.Mesh(g.body, MAT.char));
      if (g.glow) this.inner.add(new THREE.Mesh(g.glow, glowMat(spec.accent)));
      this.fly = g.fly;
      this.ability = spec.ability;
      this.name = data.name || spec.name;
      if (spec.ability === 'light') { this.light = new THREE.PointLight(0xfff2c0, 14, 12, 1.4); this.light.position.y = 1.2; this.object.add(this.light); }
    }
    this.object.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const blob = new THREE.Mesh(P.disc(0.32, 12), MAT.shadowBlob);
    blob.position.y = 0.03;
    this.object.add(blob);
    this.x = 0; this.z = 0; this.rot = 0; this.t = Math.random() * 5;
    this.target = null;
    this.emote = null;
    this.hopT = 0;
    this.inter = { x: 0, z: 0, r: 0.4, h: 1.6, priority: 0.1, label: () => `Pet ${this.name}`, onInteract: () => G.lumas.pet(this) };
  }
  place(level, x, z) {
    this.level = level;
    this.x = x; this.z = z;
    level.scene.add(this.object);
    level.addInteractable(this.inter);
    this.update(0);
  }
  detach() { this.level?.scene.remove(this.object); this.level?.removeInteractable(this.inter); this.level = null; }
  update(dt) {
    if (!this.level) return;
    this.t += dt;
    const p = G.player;
    let goalX, goalZ;
    if (this.target) { goalX = this.target.x; goalZ = this.target.z; }
    else { goalX = p.pos.x - Math.sin(p.rotY) * 1.6 + Math.cos(p.rotY) * 0.9; goalZ = p.pos.z - Math.cos(p.rotY) * 1.6 - Math.sin(p.rotY) * 0.9; }
    const dx = goalX - this.x, dz = goalZ - this.z, d = Math.hypot(dx, dz);
    if (Math.hypot(p.pos.x - this.x, p.pos.z - this.z) > 26) { this.x = p.pos.x - 1; this.z = p.pos.z + 1; }
    let moving = false;
    if (d > (this.target ? 0.2 : 0.8)) {
      const sp = clamp(d * 2.2, 2, 11);
      const nx = this.x + dx / d * sp * dt, nz = this.z + dz / d * sp * dt;
      if (this.fly || this.level.walkable(nx, nz) || d > 6) { this.x = nx; this.z = nz; }
      this.rot = angleLerp(this.rot, Math.atan2(dx, dz), Math.min(1, dt * 10));
      moving = true;
    } else if (!this.target) this.rot = angleLerp(this.rot, Math.atan2(p.pos.x - this.x, p.pos.z - this.z), Math.min(1, dt * 3));
    const gy = this.level.heightAt(this.x, this.z);
    let hop = 0;
    if (this.fly) hop = 0.25 + Math.sin(this.t * 2.6) * 0.15;
    else if (moving) hop = Math.abs(Math.sin(this.t * 12)) * (this.kind === 'dog' ? 0.12 : 0.3);
    else if (this.target) hop = Math.abs(Math.sin(this.t * 9)) * 0.35;
    this.object.position.set(this.x, gy + hop, this.z);
    this.object.rotation.y = this.rot;
    this.inner.scale.set(1, 1 + (moving && !this.fly ? Math.sin(this.t * 12) * 0.06 : Math.sin(this.t * 3) * 0.02), 1);
    this.inter.x = this.x; this.inter.z = this.z;
    if (this.emote) {
      this.emote.t -= dt;
      this.emote.el.position.set(0, 1.6 + Math.sin(this.t * 6) * 0.08, 0);
      if (this.emote.t <= 0) { this.object.remove(this.emote.el); this.emote = null; }
    }
  }
  showEmote(kind = '!', secs = 2.5) {
    if (this.emote) this.object.remove(this.emote.el);
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#fffaf0'; x.strokeStyle = '#4a3324'; x.lineWidth = 5;
    x.beginPath(); x.arc(32, 30, 24, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = kind === '♥' ? '#ff5a7a' : '#d9443a'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(kind, 32, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.scale.setScalar(0.7);
    sp.renderOrder = 10;
    this.object.add(sp);
    this.emote = { el: sp, t: secs };
  }
}
