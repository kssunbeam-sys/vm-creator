// Procedural 3D models for every item kind. Used for inventory icons, items
// lying on the ground and tools held in the hand. Models are ~1 unit tall.
import * as THREE from '../three.js';
import { part, merge, P, jiggle } from '../core/geo.js';
import { ITEMS } from '../data/items.js';

const S = { flat: false, jitter: 0 };
export const TIER_COLORS = [0xe0803a, 0xc4c8d2, 0xa9b8ff, 0xe8452a];
const WOOD = 0x8a5a32, WOOD_L = 0xc28e58;

const cache = new Map();
let stationBuilder = null;
export function setStationModelBuilder(fn) { stationBuilder = fn; }

function toolGeo(kind, tier = 0) {
  const metal = TIER_COLORS[tier] ?? TIER_COLORS[0];
  const p = [];
  const handle = (len = 1.0, r = 0.05, col = WOOD) => p.push(part(P.cyl(r, r * 1.15, len, 6), col, { y: len / 2 }));
  switch (kind) {
    case 'axe':
      handle(1.0);
      p.push(part(P.box(0.12, 0.3, 0.12), metal, { y: 0.88, x: 0.08 }));
      p.push(part(P.box(0.32, 0.36, 0.06), metal, { y: 0.86, x: 0.24, jitter: 0.03 }));
      p.push(part(P.box(0.05, 0.4, 0.07), 0xffffff, { y: 0.86, x: 0.41, jitter: 0 }));
      break;
    case 'pickaxe':
      handle(1.0);
      p.push(part(P.box(0.9, 0.1, 0.1), metal, { y: 0.93 }));
      p.push(part(P.cone(0.07, 0.25, 4), metal, { y: 0.93, x: 0.55, rz: -Math.PI / 2 }));
      p.push(part(P.cone(0.07, 0.25, 4), metal, { y: 0.93, x: -0.55, rz: Math.PI / 2 }));
      break;
    case 'shovel':
      handle(0.95);
      p.push(part(P.box(0.24, 0.06, 0.06), WOOD, { y: 0.98 }));
      p.push(part(P.box(0.28, 0.34, 0.05), metal, { y: -0.12 }));
      p.push(part(P.cone(0.14, 0.14, 4), metal, { y: -0.35, rz: Math.PI, ry: Math.PI / 4, sz: 0.3 }));
      break;
    case 'rod':
      p.push(part(P.cyl(0.025, 0.045, 1.5, 6), WOOD_L, { y: 0.75 }));
      p.push(part(P.cyl(0.06, 0.06, 0.25, 6), WOOD, { y: 0.12 }));
      p.push(part(P.torus(0.08, 0.03, 5, 10), metal, { y: 0.32, x: 0.07, ry: Math.PI / 2 }));
      p.push(part(P.sphere(0.06, 6, 5), 0xe84a3a, { ...S, y: 1.52 }));
      break;
    case 'whip':
      p.push(part(P.cyl(0.05, 0.06, 0.4, 6), 0x5a3a24, { y: 0.2 }));
      p.push(part(P.torus(0.24, 0.035, 5, 14), 0x8a5a32, { y: 0.62, rx: 0.3 }));
      p.push(part(P.torus(0.18, 0.035, 5, 14), metal, { y: 0.64, rx: 0.5 }));
      break;
    case 'net':
      handle(1.0, 0.035, WOOD_L);
      p.push(part(P.torus(0.24, 0.03, 5, 14), metal, { y: 1.2, rx: Math.PI / 2 }));
      p.push(part(P.cone(0.23, 0.35, 10), 0xf2f2f2, { y: 1.0, rx: Math.PI, flat: false, jitter: 0 }));
      break;
  }
  return merge(p);
}

function fishGeo(c, c2, s = 1) {
  const p = [];
  p.push(part(P.sphere(0.32, 10, 8), c, { ...S, sx: 1.6 * s, sy: 0.85 * s, sz: 0.55 * s }));
  p.push(part(P.sphere(0.2, 8, 6), c2, { ...S, y: -0.08 * s, sx: 1.4 * s, sy: 0.5 * s, sz: 0.5 * s }));
  p.push(part(P.cone(0.22, 0.32, 4), c2, { x: -0.6 * s, rz: Math.PI / 2, sx: 0.4, sy: 1, sz: 0.25 * s, s }));
  p.push(part(P.cone(0.1, 0.2, 4), c2, { y: 0.27 * s, x: 0.05, sz: 0.2 }));
  p.push(part(P.sphere(0.05, 6, 5), 0x111111, { ...S, x: 0.34 * s, y: 0.06 * s, z: 0.15 * s }));
  p.push(part(P.sphere(0.05, 6, 5), 0x111111, { ...S, x: 0.34 * s, y: 0.06 * s, z: -0.15 * s }));
  return p;
}

function gemShape(c, p, y = 0, s = 1) {
  p.push(part(P.cyl(0.3 * s, 0.15 * s, 0.14 * s, 8), c, { y: y + 0.07 * s, jitter: 0.12 }));
  p.push(part(P.cone(0.3 * s, 0.35 * s, 8), c, { y: y - 0.175 * s, rx: Math.PI, jitter: 0.12 }));
}

export function itemGeometry(id, opts = {}) {
  const key = id + '|' + (opts.tier ?? '');
  if (cache.has(key)) return cache.get(key);
  const it = ITEMS[id];
  const m = it?.model || { k: 'stone', c: 0xff00ff };
  const c = m.c ?? 0xcccccc, c2 = m.c2 ?? 0xffffff;
  let p = [];
  switch (m.k) {
    case 'axe': case 'pickaxe': case 'shovel': case 'rod': case 'whip': case 'net': {
      const g = toolGeo(m.k, opts.tier ?? 0);
      g.translate(0, -0.5, 0);
      cache.set(key, g);
      return g;
    }
    case 'log':
      p.push(part(P.cyl(0.26, 0.26, 0.9, 8), c, { rz: Math.PI / 2, jitter: 0.08 }));
      p.push(part(P.cyl(0.24, 0.24, 0.02, 8), c2, { rz: Math.PI / 2, x: 0.455, jitter: 0 }));
      p.push(part(P.cyl(0.24, 0.24, 0.02, 8), c2, { rz: Math.PI / 2, x: -0.455, jitter: 0 }));
      p.push(part(P.cyl(0.1, 0.1, 0.025, 8), c, { rz: Math.PI / 2, x: 0.46, jitter: 0 }));
      break;
    case 'bamboo':
      for (let i = 0; i < 3; i++) p.push(part(P.cyl(0.08, 0.08, 1, 6), c, { x: (i - 1) * 0.18, rz: 0.1 * (i - 1) }));
      for (let i = 0; i < 3; i++) p.push(part(P.cyl(0.095, 0.095, 0.05, 6), 0x7aa840, { x: (i - 1) * 0.18, y: 0.1 }));
      break;
    case 'fiber':
      for (let i = 0; i < 7; i++) p.push(part(P.cyl(0.02, 0.03, 0.9, 4), i % 2 ? c : 0x6aa83a, { x: (i - 3) * 0.05, rz: (i - 3) * 0.08 }));
      p.push(part(P.torus(0.16, 0.035, 4, 10), 0xc9a86a, { rx: Math.PI / 2 }));
      break;
    case 'drop':
      p.push(part(P.sphere(0.28, 10, 8), c, { ...S, sy: 1.1 }));
      p.push(part(P.cone(0.2, 0.35, 10), c, { ...S, y: 0.32 }));
      break;
    case 'stone':
      p.push(jiggle(part(P.dodeca(0.38, 0), c, { jitter: 0.1 }), 0.06, 3));
      break;
    case 'pile':
      p.push(part(P.cone(0.5, 0.42, 9), c, { jitter: 0.08, y: -0.1 }));
      p.push(part(P.sphere(0.2, 6, 4), c, { x: 0.25, y: -0.18, flat: true }));
      break;
    case 'pinecone':
      for (let i = 0; i < 5; i++) p.push(part(P.cone(0.24 - i * 0.04, 0.2, 7), c, { y: -0.3 + i * 0.14, jitter: 0.1 }));
      break;
    case 'ore':
      p.push(jiggle(part(P.dodeca(0.36, 0), c, { jitter: 0.08 }), 0.05, 5));
      for (let i = 0; i < 5; i++) { const a = i * 1.3; p.push(part(P.octa(0.11, 0), c2, { x: Math.cos(a) * 0.28, y: Math.sin(i * 2.1) * 0.2, z: Math.sin(a) * 0.28, rx: a, jitter: 0.1 })); }
      break;
    case 'nugget':
      p.push(jiggle(part(P.dodeca(0.24, 0), c, { jitter: 0.12 }), 0.06, 8));
      p.push(jiggle(part(P.dodeca(0.16, 0), c, { x: 0.22, y: -0.08, jitter: 0.12 }), 0.04, 9));
      break;
    case 'bar':
      p.push(part(P.cyl(0.27, 0.36, 0.26, 4), c, { ry: Math.PI / 4, sx: 1.6, jitter: 0.05 }));
      break;
    case 'roughgem':
      p.push(jiggle(part(P.dodeca(0.28, 0), 0x8a8580, { y: -0.12 }), 0.04, 6));
      for (let i = 0; i < 4; i++) p.push(part(P.cone(0.1, 0.45, 5), c, { x: (i - 1.5) * 0.12, y: 0.12, rz: (i - 1.5) * 0.35, jitter: 0.15 }));
      break;
    case 'cutgem':
      gemShape(c, p);
      break;
    case 'pearl':
      p.push(part(P.sphere(0.3, 14, 10), c, S));
      break;
    case 'plank':
      p.push(part(P.box(1, 0.1, 0.32), c, { y: 0.06, jitter: 0.05 }));
      p.push(part(P.box(1, 0.1, 0.32), 0xb07a48, { y: -0.06, ry: 0.15, jitter: 0.05 }));
      break;
    case 'rope':
      p.push(part(P.torus(0.3, 0.09, 6, 14), c, { rx: Math.PI / 2 }));
      p.push(part(P.torus(0.18, 0.09, 6, 12), c, { rx: Math.PI / 2, y: 0.12 }));
      break;
    case 'nails':
      for (let i = 0; i < 4; i++) {
        p.push(part(P.cyl(0.03, 0.03, 0.7, 5), 0xa8a8b0, { x: (i - 1.5) * 0.14, rz: (i - 1.5) * 0.2 }));
        p.push(part(P.cyl(0.08, 0.08, 0.04, 6), c, { x: (i - 1.5) * 0.14 - (i - 1.5) * 0.07, y: 0.35, rz: (i - 1.5) * 0.2 }));
      }
      break;
    case 'glass':
      p.push(part(P.box(0.7, 0.7, 0.06), c, { rz: 0.1, jitter: 0 }));
      p.push(part(P.box(0.1, 0.5, 0.07), 0xffffff, { x: -0.12, rz: 0.6, jitter: 0 }));
      break;
    case 'bottle':
      p.push(part(P.cyl(0.24, 0.26, 0.55, 10), m.empty ? 0xd8f4f8 : c, { ...S, y: -0.15 }));
      p.push(part(P.cyl(0.08, 0.2, 0.2, 10), m.empty ? 0xd8f4f8 : c, { ...S, y: 0.22 }));
      p.push(part(P.cyl(0.09, 0.09, 0.14, 8), m.empty ? 0xd8f4f8 : 0x8a5a32, { ...S, y: 0.38 }));
      if (!m.empty) p.push(part(P.cyl(0.25, 0.27, 0.25, 10), 0xf6ecd0, { ...S, y: -0.12 }));
      break;
    case 'fabric':
      for (let i = 0; i < 3; i++) p.push(part(P.box(0.8, 0.12, 0.55), i === 1 ? 0xe6dccb : c, { y: (i - 1) * 0.13, rz: (i - 1) * 0.04 }));
      break;
    case 'leather':
      p.push(jiggle(part(P.box(0.8, 0.08, 0.6, ), c, { jitter: 0.05 }), 0.04, 2));
      p.push(part(P.box(0.6, 0.08, 0.45), c, { y: 0.09, ry: 0.3 }));
      break;
    case 'jar':
      p.push(part(P.cyl(0.28, 0.25, 0.5, 10), 0xe8f4f4, { ...S, y: -0.05 }));
      p.push(part(P.cyl(0.27, 0.24, 0.4, 10), c, { ...S, y: -0.08 }));
      p.push(part(P.cyl(0.2, 0.2, 0.12, 10), 0x8a5a32, { ...S, y: 0.26 }));
      break;
    case 'magnet':
      p.push(part(P.torus(0.28, 0.1, 6, 12, Math.PI), c, { rz: Math.PI }));
      p.push(part(P.box(0.2, 0.15, 0.2), 0xd8d8e0, { x: 0.28, y: 0.05 }));
      p.push(part(P.box(0.2, 0.15, 0.2), 0xd8d8e0, { x: -0.28, y: 0.05 }));
      break;
    case 'torch':
      p.push(part(P.cyl(0.06, 0.05, 0.9, 6), WOOD, {}));
      p.push(part(P.cyl(0.11, 0.08, 0.16, 6), 0x3a2a20, { y: 0.45 }));
      p.push(part(P.cone(0.12, 0.3, 6), 0xffb02a, { y: 0.66, jitter: 0 }));
      break;
    case 'berry':
      for (let i = 0; i < 6; i++) { const a = i * 1.1; p.push(part(P.sphere(0.15, 8, 6), c, { ...S, x: Math.cos(a) * 0.17 * (i % 3) * 0.7, y: (i % 2) * 0.12 - 0.05, z: Math.sin(a) * 0.17 })); }
      p.push(part(P.sphere(0.12, 6, 4), 0x4f9a3a, { x: 0, y: 0.22, sy: 0.3, sx: 1.6 }));
      break;
    case 'flower':
      p.push(part(P.cyl(0.03, 0.03, 0.7, 4), 0x4f9a3a, { y: -0.2 }));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; p.push(part(P.sphere(0.13, 8, 5), c, { ...S, x: Math.cos(a) * 0.17, y: 0.2, z: Math.sin(a) * 0.17, sy: 0.4 })); }
      p.push(part(P.sphere(0.09, 8, 6), c2, { ...S, y: 0.23 }));
      break;
    case 'lavender':
      for (let i = 0; i < 3; i++) {
        p.push(part(P.cyl(0.02, 0.02, 0.8, 4), 0x5f8a4a, { x: (i - 1) * 0.12, rz: (i - 1) * 0.2 }));
        for (let k = 0; k < 4; k++) p.push(part(P.sphere(0.06, 5, 4), c, { ...S, x: (i - 1) * (0.12 + k * 0.05), y: 0.15 + k * 0.08 }));
      }
      break;
    case 'mushroom':
      p.push(part(P.cyl(0.11, 0.14, 0.4, 8), c2, { ...S, y: -0.15 }));
      p.push(part(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, { ...S, y: 0.02, sy: 0.75 }));
      if (c === 0xe2383f || m.dots) for (let i = 0; i < 4; i++) p.push(part(P.sphere(0.05, 5, 4), 0xffffff, { ...S, x: Math.cos(i * 1.6) * 0.2, y: 0.2, z: Math.sin(i * 1.6) * 0.2 }));
      break;
    case 'spores':
      for (let i = 0; i < 7; i++) p.push(part(P.sphere(0.1 + (i % 3) * 0.04, 6, 5), c, { ...S, x: Math.cos(i * 0.9) * 0.25, y: Math.sin(i * 1.7) * 0.2, z: Math.sin(i * 0.9) * 0.25 }));
      break;
    case 'shell':
      for (let i = 0; i < 6; i++) p.push(part(P.cone(0.1, 0.55, 4), c, { rz: (i - 2.5) * 0.28, y: 0.05, sz: 0.4, jitter: 0.05 }));
      p.push(part(P.sphere(0.12, 6, 4), c, { ...S, y: -0.22, sx: 1.6, sy: 0.6 }));
      break;
    case 'conch':
      p.push(part(P.cone(0.3, 0.8, 9), c, { rz: -Math.PI / 2, jitter: 0.06 }));
      p.push(part(P.sphere(0.25, 8, 6), 0xffe6d6, { ...S, x: -0.3, sy: 0.8 }));
      break;
    case 'coral':
      for (let i = 0; i < 5; i++) p.push(part(P.cyl(0.05, 0.08, 0.6, 5), c, { x: (i - 2) * 0.12, y: 0.0, rz: (i - 2) * 0.3 }));
      for (let i = 0; i < 5; i++) p.push(part(P.sphere(0.08, 6, 5), c, { ...S, x: (i - 2) * 0.22, y: 0.3 }));
      break;
    case 'caterpillar':
      for (let i = 0; i < 5; i++) p.push(part(P.sphere(0.13, 8, 6), i === 4 ? 0x6aa83a : c, { ...S, x: (i - 2) * 0.17, y: Math.sin(i) * 0.04 }));
      break;
    case 'hopper':
      p.push(part(P.sphere(0.2, 8, 6), c, { ...S, sx: 2.2, sy: 0.8 }));
      p.push(part(P.sphere(0.13, 8, 6), c, { ...S, x: 0.42 }));
      p.push(part(P.box(0.5, 0.05, 0.05), 0x3f7a2a, { x: -0.1, y: 0.15, z: 0.12, rz: 0.6 }));
      p.push(part(P.box(0.5, 0.05, 0.05), 0x3f7a2a, { x: -0.1, y: 0.15, z: -0.12, rz: 0.6 }));
      break;
    case 'beetle':
      p.push(part(P.sphere(0.3, 10, 8), c, { ...S, sy: 0.6, sx: 1.2 }));
      p.push(part(P.sphere(0.14, 8, 6), 0x2a3a4a, { ...S, x: 0.36, y: -0.02 }));
      p.push(part(P.box(0.02, 0.2, 0.62), 0x2a3a4a, { y: 0.1 }));
      break;
    case 'firefly':
      p.push(part(P.sphere(0.15, 8, 6), 0x3a3020, { ...S, x: 0.18, sx: 1.4 }));
      p.push(part(P.sphere(0.22, 10, 8), c, { ...S, x: -0.15 }));
      p.push(part(P.sphere(0.12, 6, 4), 0xe8f4ff, { ...S, x: 0.15, y: 0.17, z: 0.12, sx: 1.6, sy: 0.3 }));
      p.push(part(P.sphere(0.12, 6, 4), 0xe8f4ff, { ...S, x: 0.15, y: 0.17, z: -0.12, sx: 1.6, sy: 0.3 }));
      break;
    case 'butterfly':
      p.push(part(P.cyl(0.04, 0.04, 0.5, 5), 0x3a2a20, { rz: Math.PI / 2 }));
      for (const s of [-1, 1]) {
        p.push(part(P.sphere(0.25, 8, 5), c, { ...S, x: 0.1, z: 0.25 * s, sy: 0.12, ry: 0.3 * s }));
        p.push(part(P.sphere(0.18, 8, 5), 0xfff0d0, { ...S, x: -0.14, z: 0.18 * s, sy: 0.12 }));
      }
      break;
    case 'fish': p = fishGeo(c, c2, m.s ?? 1); break;
    case 'jelly':
      p.push(part(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, S));
      for (let i = 0; i < 5; i++) p.push(part(P.cyl(0.03, 0.02, 0.45, 4), c, { x: Math.cos(i * 1.25) * 0.18, y: -0.22, z: Math.sin(i * 1.25) * 0.18 }));
      break;
    case 'ray':
      p.push(part(P.sphere(0.45, 10, 6), c, { ...S, sy: 0.18 }));
      p.push(part(P.cyl(0.03, 0.01, 0.6, 4), c, { x: -0.6, rz: Math.PI / 2 }));
      break;
    case 'eel':
      for (let i = 0; i < 6; i++) p.push(part(P.sphere(0.13, 8, 6), i % 2 ? c : c2, { ...S, x: (i - 2.5) * 0.18, y: Math.sin(i * 1.2) * 0.12 }));
      break;
    case 'oyster':
      p.push(part(P.sphere(0.35, 10, 6), c, { sy: 0.32, flat: true, jitter: 0.1 }));
      p.push(part(P.sphere(0.33, 10, 6), 0xb8b0a4, { y: 0.12, sy: 0.25, rz: 0.2, flat: true, jitter: 0.1 }));
      break;
    case 'boot':
      p.push(part(P.box(0.3, 0.55, 0.3), c, { y: 0.1 }));
      p.push(part(P.box(0.55, 0.22, 0.3), c, { x: 0.15, y: -0.18 }));
      break;
    case 'seaweed':
      for (let i = 0; i < 4; i++) p.push(part(P.box(0.1, 0.8, 0.03), c, { x: (i - 1.5) * 0.12, rz: Math.sin(i) * 0.3 }));
      break;
    case 'wheat':
      for (let i = 0; i < 5; i++) {
        p.push(part(P.cyl(0.02, 0.02, 0.9, 4), 0xc9a24a, { x: (i - 2) * 0.06, rz: (i - 2) * 0.12 }));
        p.push(part(P.sphere(0.07, 6, 5), c, { ...S, x: (i - 2) * 0.12, y: 0.42, sy: 2.2 }));
      }
      p.push(part(P.torus(0.12, 0.03, 4, 8), 0x8a5a32, { rx: Math.PI / 2, y: -0.1 }));
      break;
    case 'potato': p.push(jiggle(part(P.sphere(0.32, 8, 6), c, { sx: 1.3, jitter: 0.05 }), 0.04, 4)); break;
    case 'carrot':
      p.push(part(P.cone(0.18, 0.75, 8), c, { ...S, rz: Math.PI, y: -0.05 }));
      for (let i = 0; i < 3; i++) p.push(part(P.cone(0.06, 0.35, 4), 0x5aa83a, { y: 0.45, rz: (i - 1) * 0.4 }));
      break;
    case 'round':
      p.push(part(P.sphere(0.34 * (m.s ?? 1), 12, 10), c, { ...S, sy: 0.92 }));
      if (m.leaf) for (let i = 0; i < 5; i++) p.push(part(P.cone(0.05, 0.2, 3), 0x3f8a2a, { y: 0.32, x: Math.cos(i * 1.25) * 0.08, z: Math.sin(i * 1.25) * 0.08, rz: Math.cos(i * 1.25) * 1.2, rx: -Math.sin(i * 1.25) * 1.2 }));
      if (m.stem) { p.push(part(P.cyl(0.02, 0.02, 0.15, 4), 0x6a4a2a, { y: 0.36 })); p.push(part(P.sphere(0.08, 6, 4), 0x4f9a3a, { ...S, x: 0.08, y: 0.38, sy: 0.4 })); }
      break;
    case 'cotton':
      for (let i = 0; i < 5; i++) p.push(part(P.sphere(0.18, 8, 6), c, { ...S, x: Math.cos(i * 1.25) * 0.17, y: 0.05, z: Math.sin(i * 1.25) * 0.17 }));
      p.push(part(P.cone(0.2, 0.2, 5), 0x7a5a32, { y: -0.18, rx: Math.PI }));
      break;
    case 'egg': p.push(part(P.sphere(0.3, 12, 10), c, { ...S, sy: 1.3 })); break;
    case 'egg_myst':
      p.push(part(P.sphere(0.36, 14, 10), 0xf4eedf, { ...S, sy: 1.3 }));
      for (let i = 0; i < 7; i++) { const a = i * 0.9; p.push(part(P.sphere(0.08, 6, 5), i % 2 ? 0x7ad6ff : 0xc08aff, { ...S, x: Math.cos(a) * 0.33, y: Math.sin(i * 1.9) * 0.3, z: Math.sin(a) * 0.33, sx: 0.5, sz: 0.5 })); }
      break;
    case 'pumpkin':
      for (let i = 0; i < 6; i++) p.push(part(P.sphere(0.22, 8, 6), c, { ...S, x: Math.cos(i * 1.05) * 0.16, z: Math.sin(i * 1.05) * 0.16, sy: 1.2 }));
      p.push(part(P.cyl(0.04, 0.05, 0.18, 5), 0x5a7a2a, { y: 0.3 }));
      break;
    case 'onion':
      p.push(part(P.sphere(0.3, 10, 8), c, { ...S, sy: 1.0 }));
      p.push(part(P.cone(0.12, 0.3, 8), c, { ...S, y: 0.32 }));
      break;
    case 'hops':
      for (let i = 0; i < 4; i++) p.push(part(P.cone(0.2 - i * 0.03, 0.22, 6), c, { y: -0.25 + i * 0.15, jitter: 0.1 }));
      break;
    case 'strawberry':
      p.push(part(P.cone(0.3, 0.55, 10), c, { ...S, rz: Math.PI }));
      p.push(part(P.cone(0.2, 0.08, 6), 0x4f9a3a, { y: 0.3 }));
      break;
    case 'block': p.push(part(P.box(0.6, 0.35, 0.4), c, { jitter: 0.02 })); break;
    case 'beet':
      p.push(part(P.sphere(0.3, 10, 8), c, S));
      p.push(part(P.cone(0.06, 0.3, 4), c, { y: -0.4, rz: Math.PI }));
      for (let i = 0; i < 3; i++) p.push(part(P.box(0.12, 0.35, 0.03), 0x3f9a4a, { y: 0.42, rz: (i - 1) * 0.4 }));
      break;
    case 'grapes':
      for (let r = 0; r < 4; r++) for (let i = 0; i <= 3 - r; i++) p.push(part(P.sphere(0.11, 8, 6), c, { ...S, x: (i - (3 - r) / 2) * 0.2, y: 0.25 - r * 0.17, z: (r % 2) * 0.05 }));
      p.push(part(P.sphere(0.15, 6, 4), 0x4f9a3a, { y: 0.4, x: 0.15, sy: 0.3, sx: 1.5 }));
      break;
    case 'wool':
      for (let i = 0; i < 6; i++) p.push(part(P.sphere(0.2, 8, 6), c, { ...S, x: Math.cos(i * 1.05) * 0.2, y: Math.sin(i * 2) * 0.1, z: Math.sin(i * 1.05) * 0.2 }));
      break;
    case 'cheese':
      p.push(part(P.cyl(0.45, 0.45, 0.35, 3), c, { ry: 0.3, jitter: 0.03 }));
      p.push(part(P.sphere(0.06, 5, 4), 0xe0a82a, { ...S, y: 0.1, x: 0.15, z: 0.25 }));
      break;
    case 'corn':
      p.push(part(P.cyl(0.16, 0.12, 0.8, 8), c, { rz: 0.3, jitter: 0.1 }));
      p.push(part(P.cone(0.18, 0.7, 6), 0x7ac04a, { rz: 0.3, x: 0.05, y: -0.08, sz: 0.5 }));
      break;
    case 'chili':
      p.push(part(P.cone(0.13, 0.75, 8), c, { ...S, rz: Math.PI + 0.5 }));
      p.push(part(P.cyl(0.03, 0.03, 0.18, 4), 0x3f8a2a, { y: 0.38, x: -0.2, rz: -0.4 }));
      break;
    case 'cane':
      for (let i = 0; i < 3; i++) p.push(part(P.cyl(0.07, 0.07, 1, 6), c, { x: (i - 1) * 0.15, rz: (i - 1) * 0.1 }));
      p.push(part(P.torus(0.17, 0.03, 4, 8), 0x8a5a32, { rx: Math.PI / 2 }));
      break;
    case 'sack':
      p.push(part(P.sphere(0.36, 10, 8), 0xd8c09a, { ...S, sy: 1.1, y: -0.05 }));
      p.push(part(P.cyl(0.1, 0.16, 0.16, 8), 0xd8c09a, { ...S, y: 0.38 }));
      p.push(part(P.cyl(0.25, 0.28, 0.12, 10), c, { ...S, y: 0.25 }));
      break;
    case 'cocoa':
      p.push(part(P.sphere(0.3, 10, 8), c, { ...S, sx: 0.8, sy: 1.4 }));
      for (let i = 0; i < 4; i++) p.push(part(P.box(0.02, 0.8, 0.02), 0x6a3a1a, { x: Math.cos(i * 1.57) * 0.24, z: Math.sin(i * 1.57) * 0.24 }));
      break;
    case 'pineapple':
      p.push(part(P.sphere(0.28, 8, 7), c, { sy: 1.4, flat: true, jitter: 0.1 }));
      for (let i = 0; i < 6; i++) p.push(part(P.cone(0.06, 0.4, 3), 0x3f9a4a, { y: 0.5, x: Math.cos(i) * 0.06, z: Math.sin(i) * 0.06, rz: Math.cos(i) * 0.5, rx: Math.sin(i) * 0.5 }));
      break;
    case 'banana':
      for (let i = 0; i < 3; i++) p.push(part(P.torus(0.35, 0.08, 6, 10, Math.PI * 0.7), c, { z: (i - 1) * 0.12, rz: 0.9 + i * 0.1, y: -0.1, flat: false, jitter: 0 }));
      break;
    case 'spirit':
      p.push(part(P.sphere(0.3, 12, 10), c, S));
      p.push(part(P.sphere(0.18, 10, 8), 0xffffff, { ...S, y: 0.06, x: 0.05 }));
      p.push(part(P.cone(0.18, 0.4, 8), c, { ...S, y: -0.36, rz: Math.PI }));
      break;
    case 'vial':
      p.push(part(P.sphere(0.27, 12, 10), 0xe8f8ff, { ...S, y: -0.12 }));
      p.push(part(P.sphere(0.24, 12, 10), c, { ...S, y: -0.14 }));
      p.push(part(P.cyl(0.07, 0.07, 0.35, 8), 0xe8f8ff, { ...S, y: 0.25 }));
      p.push(part(P.cyl(0.09, 0.09, 0.08, 8), 0x8a5a32, { ...S, y: 0.43 }));
      break;
    case 'bowl':
      p.push(part(new THREE.SphereGeometry(0.42, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0xf3ead8, { ...S, y: 0.1 }));
      p.push(part(P.cyl(0.38, 0.38, 0.05, 12), c, { ...S, y: 0.06 }));
      if (m.c2) for (let i = 0; i < 3; i++) p.push(part(P.sphere(0.07, 6, 5), m.c2, { ...S, x: Math.cos(i * 2.1) * 0.18, y: 0.1, z: Math.sin(i * 2.1) * 0.18 }));
      break;
    case 'plate':
      p.push(part(P.cyl(0.48, 0.4, 0.06, 14), 0xf6f2ea, { ...S, y: -0.12 }));
      p.push(part(P.sphere(0.25, 10, 6), c, { ...S, x: -0.1, y: 0.0, sx: 1.4, sy: 0.6 }));
      p.push(part(P.sphere(0.12, 8, 6), c2, { ...S, x: 0.22, y: -0.02, z: 0.12, sy: 0.6 }));
      break;
    case 'pie':
      p.push(part(P.cyl(0.45, 0.38, 0.18, 14), 0xe0b06a, { ...S, y: -0.05 }));
      p.push(part(P.cyl(0.38, 0.38, 0.04, 14), c, { ...S, y: 0.05 }));
      for (let i = 0; i < 3; i++) p.push(part(P.box(0.7, 0.03, 0.06), 0xe0b06a, { y: 0.08, ry: i * 1.05, jitter: 0 }));
      break;
    case 'bread':
      p.push(part(P.sphere(0.35, 10, 8), c, { ...S, sx: 1.4, sy: 0.7 }));
      for (let i = 0; i < 3; i++) p.push(part(P.box(0.06, 0.05, 0.3), m.c2 ?? 0xf2d09a, { x: (i - 1) * 0.2, y: 0.22, ry: 0.4, jitter: 0 }));
      break;
    case 'cake':
      p.push(part(P.cyl(0.38, 0.38, 0.4, 14), c, { ...S, y: -0.05 }));
      p.push(part(P.cyl(0.4, 0.4, 0.08, 14), m.c2 ?? 0xffffff, { ...S, y: 0.17 }));
      p.push(part(P.sphere(0.08, 6, 5), 0xe8343a, { ...S, y: 0.26 }));
      break;
    case 'pancakes':
      for (let i = 0; i < 4; i++) p.push(part(P.cyl(0.38, 0.38, 0.09, 12), c, { ...S, y: -0.2 + i * 0.1 }));
      p.push(part(P.cyl(0.25, 0.3, 0.05, 12), m.c2, { ...S, y: 0.17 }));
      break;
    case 'skewer':
      p.push(part(P.cyl(0.02, 0.02, 1.0, 4), 0xc9a06a, { rz: 0.6 }));
      for (let i = 0; i < 3; i++) p.push(part(P.box(0.18, 0.18, 0.18), i === 1 ? 0xe8433a : c, { x: (i - 1) * -0.17, y: (i - 1) * 0.26, rz: 0.6 }));
      break;
    case 'horseshoe': p.push(part(P.torus(0.3, 0.07, 5, 12, Math.PI * 1.4), c, { rz: -Math.PI * 0.2 + Math.PI / 2 })); break;
    case 'kettle':
      p.push(part(P.sphere(0.34, 12, 8), c, { ...S, sy: 0.8 }));
      p.push(part(P.cyl(0.04, 0.07, 0.35, 6), c, { x: 0.35, y: 0.1, rz: -0.9 }));
      p.push(part(P.torus(0.2, 0.03, 4, 10, Math.PI), 0x3a3a3a, { y: 0.25 }));
      break;
    case 'lantern':
      p.push(part(P.box(0.4, 0.5, 0.4), m.glow ? 0xdff8ff : 0xffe7a0, { jitter: 0 }));
      p.push(part(P.cone(0.32, 0.22, 4), c, { y: 0.36, ry: Math.PI / 4 }));
      p.push(part(P.box(0.44, 0.06, 0.44), c, { y: -0.27 }));
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) p.push(part(P.box(0.05, 0.5, 0.05), c, { x: x * 0.2, z: z * 0.2 }));
      p.push(part(P.torus(0.08, 0.02, 4, 8), c, { y: 0.52 }));
      break;
    case 'pot':
      p.push(part(P.cyl(0.38, 0.32, 0.45, 12), c, S));
      p.push(part(P.torus(0.38, 0.04, 4, 12), c, { rx: Math.PI / 2, y: 0.22 }));
      break;
    case 'shield':
      p.push(part(P.cyl(0.45, 0.45, 0.08, 12), c, { rx: Math.PI / 2 }));
      p.push(part(P.sphere(0.12, 8, 6), 0x8a5a32, { ...S, z: 0.05 }));
      p.push(part(P.torus(0.42, 0.04, 4, 14), 0x8a6a4a, {}));
      break;
    case 'blade':
      p.push(part(P.box(0.12, 0.8, 0.03), c, { y: 0.15, jitter: 0 }));
      p.push(part(P.cone(0.06, 0.15, 4), c, { y: 0.62, sz: 0.3 }));
      p.push(part(P.box(0.35, 0.06, 0.08), 0x8a6a4a, { y: -0.27 }));
      p.push(part(P.cyl(0.04, 0.04, 0.25, 6), 0x5a3a24, { y: -0.42 }));
      break;
    case 'helm':
      p.push(part(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, S));
      p.push(part(P.box(0.08, 0.3, 0.1), c, { z: 0.38, y: -0.08 }));
      p.push(part(P.torus(0.4, 0.04, 4, 14), 0xf2c94c, { rx: Math.PI / 2 }));
      break;
    case 'hammer':
      p.push(part(P.cyl(0.05, 0.05, 0.9, 6), WOOD, { y: -0.1 }));
      p.push(part(P.box(0.55, 0.28, 0.28), c, { y: 0.38 }));
      break;
    case 'armor':
      p.push(part(P.cyl(0.32, 0.38, 0.6, 10), c, {}));
      p.push(part(P.sphere(0.16, 8, 6), c, { ...S, x: 0.38, y: 0.22 }));
      p.push(part(P.sphere(0.16, 8, 6), c, { ...S, x: -0.38, y: 0.22 }));
      p.push(part(P.box(0.2, 0.2, 0.05), 0xf2c94c, { z: 0.35, y: 0.05 }));
      break;
    case 'necklace':
      p.push(part(P.torus(0.33, 0.025, 4, 18), c, { rx: 0.2 }));
      gemShape(m.gem, p, -0.38, 0.55);
      break;
    case 'ring':
      p.push(part(P.torus(0.24, 0.06, 6, 16), c, { rx: 0.4 }));
      gemShape(m.gem, p, 0.32, 0.5);
      break;
    case 'earrings':
      for (const s of [-1, 1]) { p.push(part(P.torus(0.08, 0.02, 4, 8), c, { x: s * 0.2, y: 0.2 })); gemShape(m.gem, p, -0.05, 0.45); p[p.length - 1].translate(s * 0.2, 0, 0); p[p.length - 2].translate(s * 0.2, 0, 0); }
      break;
    case 'brooch':
      p.push(part(P.cyl(0.32, 0.32, 0.08, 10), c, { rx: Math.PI / 2 }));
      gemShape(m.gem, p, 0, 0.6);
      p[p.length - 1].rotateX(Math.PI / 2); p[p.length - 2].rotateX(Math.PI / 2);
      p[p.length - 1].translate(0, 0, 0.12); p[p.length - 2].translate(0, 0, 0.12);
      break;
    case 'tiara': case 'crown':
      p.push(part(P.cyl(0.38, 0.38, 0.16, 12, true), c, { jitter: 0 }));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; p.push(part(P.cone(0.07, 0.25, 4), c, { x: Math.cos(a) * 0.37, y: 0.18, z: Math.sin(a) * 0.37 })); }
      gemShape(m.gem, p, 0.08, 0.4);
      p[p.length - 1].translate(0, 0, 0.38); p[p.length - 2].translate(0, 0, 0.38);
      break;
    case 'token':
      p.push(part(P.cyl(0.38, 0.38, 0.1, 14), c, { rx: Math.PI / 2, jitter: 0 }));
      p.push(part(P.torus(0.33, 0.04, 4, 14), c2, {}));
      p.push(part(P.octa(0.13, 0), c2, { z: 0.07, sz: 0.4 }));
      break;
    case 'crystal':
      p.push(part(P.octa(0.3, 0), c, { sy: 1.8, jitter: 0.12 }));
      p.push(part(P.octa(0.14, 0), c, { x: 0.22, y: -0.2, sy: 1.6, rz: -0.4, jitter: 0.12 }));
      break;
    case 'key':
      if (m.small) {
        p.push(part(P.torus(0.15, 0.05, 5, 10), c, { y: 0.25 }));
        p.push(part(P.box(0.07, 0.5, 0.05), c, { y: -0.12 }));
        p.push(part(P.box(0.15, 0.06, 0.05), c, { x: 0.08, y: -0.3 }));
      } else {
        p.push(part(P.torus(0.2, 0.06, 6, 12), c, { y: 0.3 }));
        p.push(part(P.octa(0.1, 0), 0xffffff, { y: 0.3 }));
        p.push(part(P.box(0.09, 0.7, 0.07), c, { y: -0.15 }));
        p.push(part(P.box(0.2, 0.08, 0.07), c, { x: 0.12, y: -0.42 }));
        p.push(part(P.box(0.14, 0.08, 0.07), c, { x: 0.09, y: -0.28 }));
      }
      break;
    case 'tablet':
      p.push(part(P.box(0.6, 0.8, 0.12), c, { jitter: 0.05 }));
      for (let i = 0; i < 3; i++) p.push(part(P.box(0.4, 0.05, 0.02), 0x5a6a7a, { y: 0.2 - i * 0.2, z: 0.07, jitter: 0 }));
      break;
    case 'book':
      p.push(part(P.box(0.6, 0.12, 0.75), c, {}));
      p.push(part(P.box(0.55, 0.1, 0.7), 0xf6ecd0, { x: 0.03, jitter: 0 }));
      p.push(part(P.octa(0.1, 0), 0xf2c94c, { y: 0.07, sy: 0.3 }));
      break;
    case 'map':
      if (m.frag) p.push(part(P.box(0.55, 0.03, 0.45), c, { rz: 0.1, ry: 0.4 }));
      else {
        p.push(part(P.cyl(0.12, 0.12, 0.8, 8), c, { rz: Math.PI / 2 }));
        p.push(part(P.box(0.8, 0.02, 0.5), c, { y: -0.12, z: 0.2 }));
        p.push(part(P.box(0.08, 0.025, 0.08), 0xe8343a, { y: -0.1, z: 0.25, ry: 0.8 }));
      }
      break;
    case 'chest':
      p.push(part(P.box(0.8, 0.45, 0.55), c, { y: -0.1 }));
      p.push(part(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 10, 1, false, 0, Math.PI), c, { y: 0.12, rz: Math.PI / 2, ry: Math.PI / 2, sx: 1, sz: 1 }));
      p.push(part(P.box(0.82, 0.06, 0.57), c2, { y: 0.12 }));
      p.push(part(P.box(0.12, 0.16, 0.05), c2, { y: 0.06, z: 0.29 }));
      break;
    case 'coin':
      for (let i = 0; i < (m.big ? 1 : 3); i++) p.push(part(P.cyl(0.3, 0.3, 0.07, 12), c, { y: -0.2 + i * 0.09, x: i * 0.04 }));
      if (m.big) p.push(part(P.torus(0.24, 0.03, 4, 12), 0xffffff, { rx: Math.PI / 2, y: -0.16 }));
      break;
    case 'goblet':
      p.push(part(P.cyl(0.3, 0.12, 0.4, 10), c, { ...S, y: 0.2 }));
      p.push(part(P.cyl(0.04, 0.04, 0.3, 6), c, { y: -0.15 }));
      p.push(part(P.cyl(0.2, 0.22, 0.05, 10), c, { y: -0.3 }));
      if (m.gem) gemShape(m.gem, p, 0.2, 0.3), p[p.length - 1].translate(0, 0, 0.27), p[p.length - 2].translate(0, 0, 0.27);
      break;
    case 'compass':
      p.push(part(P.cyl(0.36, 0.36, 0.12, 14), c, { rx: Math.PI / 2, jitter: 0 }));
      p.push(part(P.cyl(0.3, 0.3, 0.13, 14), 0xf6ecd0, { rx: Math.PI / 2, jitter: 0 }));
      p.push(part(P.cone(0.06, 0.28, 3), 0xe8343a, { z: 0.08, y: 0.12 }));
      break;
    case 'idol':
      p.push(part(P.box(0.4, 0.5, 0.3), c, { y: -0.15 }));
      p.push(part(P.sphere(0.24, 8, 6), c, { y: 0.25, flat: true }));
      p.push(part(P.box(0.06, 0.06, 0.05), 0x1a1a1a, { x: 0.08, y: 0.28, z: 0.2 }));
      p.push(part(P.box(0.06, 0.06, 0.05), 0x1a1a1a, { x: -0.08, y: 0.28, z: 0.2 }));
      break;
    case 'rubble':
      for (let i = 0; i < 5; i++) p.push(jiggle(part(P.dodeca(0.16 + (i % 3) * 0.05, 0), i % 2 ? c : 0x9a8f80, { x: Math.cos(i * 1.3) * 0.22, y: (i % 2) * 0.12 - 0.1, z: Math.sin(i * 1.3) * 0.22 }), 0.03, i));
      break;
    case 'shard': p.push(jiggle(part(P.tetra(0.38), c, { jitter: 0.1 }), 0.05, 2)); p.push(part(P.box(0.15, 0.04, 0.02), 0xf2c94c, { z: 0.1, jitter: 0 })); break;
    case 'figurine':
      p.push(part(P.cyl(0.2, 0.28, 0.5, 8), c, { y: -0.1 }));
      p.push(part(P.sphere(0.18, 8, 6), c, { y: 0.28, flat: true }));
      break;
    case 'mask':
      p.push(part(P.sphere(0.4, 10, 8), c, { sz: 0.35, sy: 1.2, flat: true }));
      p.push(part(P.box(0.12, 0.06, 0.1), 0x111111, { x: 0.13, y: 0.1, z: 0.12 }));
      p.push(part(P.box(0.12, 0.06, 0.1), 0x111111, { x: -0.13, y: 0.1, z: 0.12 }));
      p.push(part(P.box(0.2, 0.05, 0.1), 0x111111, { y: -0.2, z: 0.12 }));
      break;
    case 'totem':
      for (let i = 0; i < 3; i++) p.push(part(P.box(0.4, 0.3, 0.4), i === 1 ? 0xf2f6ff : c, { y: -0.3 + i * 0.3, ry: i * 0.2 }));
      p.push(part(P.box(0.7, 0.08, 0.12), c, { y: 0.22 }));
      break;
    case 'skull':
      p.push(part(P.sphere(0.35, 10, 8), c, { ...S, sy: 0.95 }));
      p.push(part(P.box(0.32, 0.2, 0.3), c, { y: -0.28, z: 0.06 }));
      p.push(part(P.sphere(0.08, 6, 5), 0x3a5a8a, { ...S, x: 0.12, y: 0.0, z: 0.28 }));
      p.push(part(P.sphere(0.08, 6, 5), 0x3a5a8a, { ...S, x: -0.12, y: 0.0, z: 0.28 }));
      break;
    case 'disk':
      p.push(part(P.cyl(0.45, 0.45, 0.08, 16), c, { rx: Math.PI / 2, jitter: 0 }));
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; p.push(part(P.cone(0.06, 0.18, 3), 0xffe08a, { x: Math.cos(a) * 0.35, y: Math.sin(a) * 0.35, z: 0.05, rz: a - Math.PI / 2 })); }
      p.push(part(P.cyl(0.18, 0.18, 0.1, 12), 0xffe08a, { rx: Math.PI / 2, z: 0.02 }));
      break;
    case 'silk': p.push(part(P.sphere(0.33, 10, 8), c, { ...S })); p.push(part(P.torus(0.33, 0.02, 4, 12), 0xd8d8e0, { rx: 0.6 })); p.push(part(P.torus(0.33, 0.02, 4, 12), 0xd8d8e0, { rx: -0.6 })); break;
    case 'charm':
      p.push(part(P.octa(0.3, 0), c, { sy: 1.4 }));
      p.push(part(P.torus(0.12, 0.03, 4, 8), 0xf2c94c, { y: 0.45 }));
      break;
    case 'heart':
      p.push(part(P.sphere(0.22, 10, 8), c, { ...S, x: 0.14, y: 0.1 }));
      p.push(part(P.sphere(0.22, 10, 8), c, { ...S, x: -0.14, y: 0.1 }));
      p.push(part(P.cone(0.3, 0.4, 10), c, { ...S, y: -0.2, rz: Math.PI }));
      break;
    case 'backpack':
      p.push(part(P.box(0.6, 0.7, 0.35), c, {}));
      p.push(part(P.box(0.62, 0.22, 0.37), 0x7a5232, { y: 0.28 }));
      p.push(part(P.box(0.4, 0.25, 0.1), 0x7a5232, { y: -0.15, z: 0.2 }));
      break;
    case 'station':
      if (stationBuilder) {
        const g = stationBuilder(m.id).clone();
        g.computeBoundingBox();
        const bb = g.boundingBox, sz = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
        g.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -(bb.max.z + bb.min.z) / 2);
        g.scale(1 / sz, 1 / sz, 1 / sz);
        cache.set(key, g);
        return g;
      }
      p.push(part(P.box(0.8, 0.5, 0.5), 0xa0703a, {}));
      break;
    default:
      p.push(part(P.box(0.5, 0.5, 0.5), c, {}));
  }
  const g = merge(p);
  cache.set(key, g);
  return g;
}

export function toolGeometry(kind, tier) { return toolGeo(kind, tier); }
