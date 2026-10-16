// Low-poly trees, rocks, ores, bushes, flowers and other nature props.
// Each builder returns { main:[{geo,mat}], stump?:[...], fruit?:[...] }.
import * as THREE from '../three.js';
import { part, merge, P, jiggle } from '../core/geo.js';
import { MAT } from './materials.js';

const S = { flat: false, jitter: 0 };

// darken faces towards the bottom of a canopy (cheap ambient occlusion)
function shadeY(g, y0, y1, dark = 0.72) {
  const pos = g.attributes.position, col = g.attributes.color;
  for (let f = 0; f < pos.count / 3; f++) {
    const y = (pos.getY(f * 3) + pos.getY(f * 3 + 1) + pos.getY(f * 3 + 2)) / 3;
    const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
    const k = dark + (1 - dark) * t;
    for (let v = 0; v < 3; v++) { const i = f * 3 + v; col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k); }
  }
  return g;
}

function blob(r, color, o, seed, detail = 1, amt = 0.14) {
  return jiggle(part(P.ico(r, detail), color, { jitter: 0.07, seed, ...o }), amt * r, seed);
}

const one = (geo, mat = MAT.world) => [{ geo, mat }];

function stumpGeo(r = 0.3, col = 0x8a5a36, top = 0xd9b27a) {
  return merge([
    part(P.cyl(r, r * 1.25, 0.45, 7), col, { y: 0.22 }),
    part(P.cyl(r * 0.92, r * 0.92, 0.03, 7), top, { y: 0.46, jitter: 0 }),
  ]);
}

export const NATURE = {
  oak() {
    const t = [
      part(P.cyl(0.2, 0.32, 2.4, 6), 0x8a5a36, { y: 1.2, jitter: 0.05 }),
      part(P.cone(0.18, 0.5, 4), 0x7a4e30, { x: 0.25, y: 0.15, rz: -0.9 }),
      part(P.cone(0.18, 0.5, 4), 0x7a4e30, { x: -0.22, z: 0.1, y: 0.15, rz: 0.9 }),
      part(P.cyl(0.08, 0.12, 0.9, 5), 0x8a5a36, { x: 0.35, y: 2.3, rz: -0.7 }),
    ];
    const cols = [0x6fbf47, 0x82cc52, 0x5daf3f, 0x8ed45a];
    const c = [
      blob(1.35, cols[0], { y: 3.3 }, 1),
      blob(1.05, cols[1], { x: 0.9, y: 2.9, z: 0.3 }, 2),
      blob(1.0, cols[2], { x: -0.85, y: 3.0, z: -0.2 }, 3),
      blob(0.9, cols[3], { x: 0.1, y: 4.1, z: 0.2 }, 4),
    ];
    const canopy = shadeY(merge(c), 2.0, 4.6);
    return { main: [{ geo: merge(t), mat: MAT.trunk }, { geo: canopy, mat: MAT.foliage }], stump: one(stumpGeo(0.3)) };
  },
  birch() {
    const t = [part(P.cyl(0.14, 0.2, 3.0, 6), 0xf0ece2, { y: 1.5, jitter: 0.03 })];
    for (let i = 0; i < 6; i++) t.push(part(P.box(0.12, 0.05, 0.3), 0x2f2a28, { y: 0.4 + i * 0.45, ry: i * 1.7, x: Math.cos(i * 1.7) * 0.12, z: Math.sin(i * 1.7) * 0.12, jitter: 0 }));
    const c = [
      blob(1.0, 0xa6d65c, { y: 3.4, sy: 1.25 }, 5),
      blob(0.8, 0xb7de6a, { x: 0.55, y: 3.0, z: 0.2 }, 6),
      blob(0.75, 0x97cb52, { x: -0.5, y: 3.9, z: -0.1 }, 7),
    ];
    return { main: [{ geo: merge(t), mat: MAT.trunk }, { geo: shadeY(merge(c), 2.3, 4.6), mat: MAT.foliage }], stump: one(stumpGeo(0.2, 0xf0ece2, 0xe9d6a8)) };
  },
  bigoak() {
    const t = [
      part(P.cyl(0.38, 0.55, 3.0, 7), 0x6b4426, { y: 1.5, jitter: 0.05 }),
      part(P.cone(0.3, 0.8, 4), 0x5e3b22, { x: 0.45, y: 0.2, rz: -1.0 }),
      part(P.cone(0.3, 0.8, 4), 0x5e3b22, { x: -0.4, z: 0.2, y: 0.2, rz: 1.0 }),
      part(P.cone(0.3, 0.8, 4), 0x5e3b22, { z: -0.45, y: 0.2, rx: -1.0 }),
      part(P.cyl(0.12, 0.2, 1.4, 5), 0x6b4426, { x: 0.6, y: 3.0, rz: -0.8 }),
      part(P.cyl(0.12, 0.2, 1.4, 5), 0x6b4426, { x: -0.6, y: 3.1, rz: 0.8 }),
    ];
    const cols = [0x3f8f3c, 0x4c9c43, 0x377f36, 0x56a64a];
    const c = [
      blob(1.9, cols[0], { y: 4.6 }, 11),
      blob(1.5, cols[1], { x: 1.5, y: 4.0, z: 0.4 }, 12),
      blob(1.5, cols[2], { x: -1.4, y: 4.1, z: -0.3 }, 13),
      blob(1.3, cols[3], { x: 0.2, y: 5.7, z: 0.1 }, 14),
      blob(1.2, cols[1], { x: 0.1, y: 4.2, z: 1.4 }, 15),
    ];
    return { main: [{ geo: merge(t), mat: MAT.trunk }, { geo: shadeY(merge(c), 2.6, 6.8, 0.68), mat: MAT.foliage }], stump: one(stumpGeo(0.5, 0x6b4426, 0xb88a56)) };
  },
  pine(snow = false) {
    const t = [part(P.cyl(0.16, 0.24, 1.4, 6), 0x6b4a32, { y: 0.7 })];
    const c = [];
    const tiers = [[1.55, 1.6, 1.3], [1.2, 1.45, 2.3], [0.85, 1.25, 3.2], [0.5, 1.0, 4.0]];
    tiers.forEach(([r, h, y], i) => {
      c.push(jiggle(part(P.cone(r, h, 7), i % 2 ? 0x2f7d4c : 0x37895a, { y: y + h / 2 - 0.2, ry: i * 0.5, jitter: 0.06 }), 0.06, i + 20));
      if (snow) c.push(part(P.cone(r * 0.72, h * 0.42, 7), 0xf4f8ff, { y: y + h - 0.35, ry: i * 0.5, jitter: 0.03 }));
    });
    return { main: [{ geo: merge(t), mat: MAT.trunk }, { geo: shadeY(merge(c), 0.8, 5.0, 0.7), mat: MAT.foliage }], stump: one(stumpGeo(0.22, 0x6b4a32, 0xe8d9b8)) };
  },
  palm() {
    const t = [];
    let x = 0, y = 0;
    for (let i = 0; i < 7; i++) {
      const nx = x + 0.07 * i, ny = y + 0.62;
      t.push(part(P.cyl(0.17 - i * 0.012, 0.2 - i * 0.012, 0.66, 6), i % 2 ? 0xb88a56 : 0xa67a48, { x: (x + nx) / 2, y: (y + ny) / 2, rz: -0.11 }));
      x = nx; y = ny;
    }
    const top = [x, y];
    const leaves = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      const leaf = part(P.cone(0.35, 2.4, 4), i % 2 ? 0x4cb050 : 0x3fa148, { jitter: 0.05, sx: 1, sz: 0.18 });
      leaf.rotateZ(-Math.PI / 2 - 0.45);
      leaf.translate(1.0, 0, 0);
      leaf.rotateY(a);
      leaf.translate(top[0], top[1] + 0.05, 0);
      leaves.push(leaf);
    }
    for (let i = 0; i < 3; i++) t.push(part(P.sphere(0.17, 7, 5), 0x6a4a2a, { ...S, x: top[0] + Math.cos(i * 2.1) * 0.2, y: top[1] - 0.15, z: Math.sin(i * 2.1) * 0.2 }));
    return { main: [{ geo: merge(t), mat: MAT.trunk }, { geo: merge(leaves), mat: MAT.foliage }], stump: one(stumpGeo(0.18, 0xa67a48, 0xe9d6a8)) };
  },
  jungle() {
    const t = [
      part(P.cyl(0.3, 0.42, 5.0, 7), 0x6a5040, { y: 2.5, jitter: 0.05 }),
    ];
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; t.push(part(P.cone(0.35, 1.2, 4), 0x5e463a, { x: Math.cos(a) * 0.35, z: Math.sin(a) * 0.35, y: 0.5, rz: -Math.cos(a) * 0.6, rx: Math.sin(a) * 0.6 })); }
    const c = [
      blob(2.1, 0x2f9a48, { y: 5.6, sy: 0.55 }, 31),
      blob(1.6, 0x3aab50, { x: 1.4, y: 5.3, z: 0.6, sy: 0.6 }, 32),
      blob(1.6, 0x268a40, { x: -1.3, y: 5.4, z: -0.5, sy: 0.6 }, 33),
      blob(1.3, 0x45b85a, { x: 0.2, y: 6.2, z: -0.2, sy: 0.6 }, 34),
    ];
    for (let i = 0; i < 5; i++) { const a = i * 1.26; c.push(part(P.cyl(0.03, 0.03, 2.2, 3), 0x2e7a3a, { x: Math.cos(a) * 1.6, y: 4.1, z: Math.sin(a) * 1.6 })); }
    return { main: [{ geo: merge(t), mat: MAT.trunk }, { geo: shadeY(merge(c), 3.0, 6.8, 0.7), mat: MAT.foliage }], stump: one(stumpGeo(0.42, 0x6a5040, 0xc46a3a)) };
  },
  deadtree() {
    const t = [part(P.cyl(0.15, 0.3, 3.0, 5), 0x4a3a34, { y: 1.5 })];
    t.push(part(P.cyl(0.06, 0.1, 1.4, 4), 0x4a3a34, { x: 0.45, y: 2.4, rz: -0.8 }));
    t.push(part(P.cyl(0.06, 0.1, 1.2, 4), 0x4a3a34, { x: -0.4, y: 2.0, rz: 0.9 }));
    t.push(part(P.cyl(0.05, 0.08, 1.0, 4), 0x4a3a34, { z: 0.35, y: 2.8, rx: 0.8 }));
    return { main: one(merge(t)), stump: one(stumpGeo(0.24, 0x4a3a34, 0x8a6a5a)) };
  },
  mushtree(glow = false) {
    const capC = glow ? 0x40d2c6 : 0xe0483a;
    const stem = [part(P.cyl(0.25, 0.38, 2.6, 8), 0xf2e6cf, { ...S, y: 1.3 })];
    const cap = [part(new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), capC, { ...S, y: 2.45, sy: 0.6 })];
    cap.push(part(P.cyl(1.48, 1.2, 0.18, 12), 0xf6eadb, { ...S, y: 2.42 }));
    for (let i = 0; i < 7; i++) { const a = i * 0.9; cap.push(part(P.sphere(0.16, 6, 4), 0xffffff, { ...S, x: Math.cos(a) * 0.9, y: 3.05 - (i % 2) * 0.15, z: Math.sin(a) * 0.9, sy: 0.5 })); }
    return { main: [{ geo: merge(stem), mat: MAT.world }, { geo: merge(cap), mat: glow ? MAT.glowCool : MAT.world }], stump: one(stumpGeo(0.3, 0xf2e6cf, 0xf6eadb)) };
  },
  bamboo() {
    const p = [];
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3, r = 0.35 + (i % 2) * 0.2, h = 3.2 + (i % 3) * 0.8;
      p.push(part(P.cyl(0.09, 0.1, h, 6), 0x9fcf5a, { x: Math.cos(a) * r, z: Math.sin(a) * r, y: h / 2, jitter: 0.04 }));
      for (let k = 1; k < 4; k++) p.push(part(P.cyl(0.105, 0.105, 0.06, 6), 0x7aa840, { x: Math.cos(a) * r, z: Math.sin(a) * r, y: h * k / 4 }));
      p.push(part(P.cone(0.12, 0.8, 3), 0x5fb04a, { x: Math.cos(a) * r + 0.3, z: Math.sin(a) * r, y: h * 0.8, rz: -1.1, sz: 0.3 }));
    }
    return { main: [{ geo: merge(p), mat: MAT.foliage }], stump: one(merge([part(P.cyl(0.4, 0.45, 0.25, 7), 0x8fbf4a, { y: 0.12 })])) };
  },
  rock(color = 0x9c9a94, size = 1) {
    const g = jiggle(part(P.dodeca(0.85 * size, 0), color, { y: 0.35 * size, sy: 0.75, jitter: 0.08 }), 0.14 * size, 41);
    const g2 = jiggle(part(P.dodeca(0.45 * size, 0), color, { x: 0.6 * size, y: 0.15 * size, z: 0.2 * size, jitter: 0.08 }), 0.08 * size, 42);
    return { main: one(shadeY(merge([g, g2]), 0, 1.0 * size, 0.8)) };
  },
  boulder(color = 0x8f8c88) {
    const g = jiggle(part(P.dodeca(1.6, 0), color, { y: 0.8, sy: 0.8, jitter: 0.07 }), 0.25, 51);
    const g2 = jiggle(part(P.dodeca(0.8, 0), color, { x: 1.2, y: 0.4, z: -0.4, jitter: 0.07 }), 0.12, 52);
    return { main: one(shadeY(merge([g, g2]), 0, 2.2, 0.75)) };
  },
  ore(base, fleck, glow = false) {
    const g = jiggle(part(P.dodeca(0.85, 0), base, { y: 0.4, sy: 0.85, jitter: 0.08 }), 0.13, 61);
    const f = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.95, yy = 0.25 + (i % 3) * 0.22;
      f.push(part(P.octa(0.17, 0), fleck, { x: Math.cos(a) * 0.68, y: yy, z: Math.sin(a) * 0.68, rx: a, ry: a * 2, jitter: 0.1 }));
    }
    f.push(part(P.octa(0.22, 0), fleck, { y: 1.0, ry: 0.4, jitter: 0.1 }));
    return { main: [{ geo: merge([g]), mat: MAT.world }, { geo: merge(f), mat: glow ? MAT.glowCool : MAT.world }] };
  },
  gem(color) {
    const base = jiggle(part(P.dodeca(0.55, 0), 0x6e6a74, { y: 0.2, sy: 0.6 }), 0.08, 71);
    const cr = [];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, r = i === 0 ? 0 : 0.32, h = i === 0 ? 1.4 : 0.8 + (i % 3) * 0.2;
      const c = part(P.cyl(0.0, 0.16 + (i === 0) * 0.08, h, 5), color, { jitter: 0.12 });
      c.rotateZ(i === 0 ? 0 : -0.5); c.rotateY(a);
      c.translate(Math.cos(a) * r, 0.3 + h / 2 - 0.1, -Math.sin(a) * r);
      cr.push(c);
    }
    return { main: [{ geo: base, mat: MAT.world }, { geo: merge(cr), mat: MAT.glowCool }] };
  },
  bush(berry = null) {
    const g = merge([
      blob(0.75, 0x4f9e3e, { y: 0.55 }, 81),
      blob(0.6, 0x5aa846, { x: 0.55, y: 0.45, z: 0.2 }, 82),
      blob(0.55, 0x47923a, { x: -0.5, y: 0.45, z: -0.15 }, 83),
    ]);
    const res = { main: [{ geo: shadeY(g, 0, 1.2, 0.7), mat: MAT.foliage }] };
    if (berry) {
      const b = [];
      for (let i = 0; i < 11; i++) {
        const a = i * 2.39, yy = 0.35 + (i % 4) * 0.2, r = 0.62 + (i % 3) * 0.1;
        b.push(part(P.sphere(0.11, 6, 5), berry, { ...S, x: Math.cos(a) * r, y: yy, z: Math.sin(a) * r * 0.8 }));
      }
      res.fruit = one(merge(b));
    }
    return res;
  },
  flower(c, c2 = 0xffe066) {
    const p = [];
    for (let k = 0; k < 4; k++) {
      const ox = Math.cos(k * 1.9) * 0.35 * (k > 0), oz = Math.sin(k * 1.9) * 0.35 * (k > 0), h = 0.35 + (k % 2) * 0.15;
      p.push(part(P.cyl(0.02, 0.025, h, 4), 0x4f9a3a, { x: ox, y: h / 2, z: oz }));
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; p.push(part(P.sphere(0.075, 6, 4), c, { ...S, x: ox + Math.cos(a) * 0.08, y: h, z: oz + Math.sin(a) * 0.08, sy: 0.45 })); }
      p.push(part(P.sphere(0.05, 6, 4), c2, { ...S, x: ox, y: h + 0.02, z: oz }));
    }
    p.push(part(P.cone(0.18, 0.28, 5), 0x5aa846, { y: 0.1, jitter: 0.05 }));
    return { main: one(merge(p), MAT.foliage) };
  },
  mushrooms(cap, stem = 0xf2e6cf, glow = false) {
    const p = [];
    for (let i = 0; i < 3; i++) {
      const s = 1 - i * 0.25, x = i === 0 ? 0 : Math.cos(i * 2.3) * 0.3, z = i === 0 ? 0 : Math.sin(i * 2.3) * 0.3;
      p.push(part(P.cyl(0.06 * s, 0.08 * s, 0.32 * s, 6), stem, { ...S, x, y: 0.16 * s, z }));
      p.push(part(new THREE.SphereGeometry(0.2 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cap, { ...S, x, y: 0.3 * s, z, sy: 0.7 }));
    }
    return { main: one(merge(p), glow ? MAT.glowCool : MAT.world) };
  },
  tallgrass(c = 0x7cc04a) {
    const p = [];
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7, r = 0.1 + (i % 3) * 0.12, h = 0.8 + (i % 4) * 0.18;
      p.push(part(P.cone(0.07, h, 3), i % 2 ? c : 0x6aae3e, { x: Math.cos(a) * r, y: h / 2, z: Math.sin(a) * r, rz: Math.cos(a) * 0.25, rx: Math.sin(a) * 0.25, jitter: 0.06 }));
    }
    return { main: one(merge(p), MAT.grass) };
  },
  fern(c = 0x3f9a3e) {
    const p = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const l = part(P.cone(0.18, 1.1, 3), i % 2 ? c : 0x4fae48, { jitter: 0.05, sz: 0.2 });
      l.rotateZ(-Math.PI / 2 + 0.6); l.translate(0.45, 0.25, 0); l.rotateY(a);
      p.push(l);
    }
    return { main: one(merge(p), MAT.grass) };
  },
  bigleaf() {
    const p = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + 0.2;
      p.push(part(P.cyl(0.03, 0.04, 1.1, 4), 0x2f7a3a, { x: Math.cos(a) * 0.25, y: 0.5, z: Math.sin(a) * 0.25, rz: -Math.cos(a) * 0.4, rx: Math.sin(a) * 0.4 }));
      const l = part(P.sphere(0.55, 8, 5), i % 2 ? 0x2fa04a : 0x3cb556, { ...S, sy: 0.08, sx: 1.4 });
      l.rotateZ(-0.35); l.translate(0.85, 1.0, 0); l.rotateY(a);
      p.push(l);
    }
    return { main: one(merge(p), MAT.foliage) };
  },
  reeds() {
    const p = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, r = 0.1 + (i % 3) * 0.1, h = 1.2 + (i % 3) * 0.3;
      p.push(part(P.cyl(0.025, 0.03, h, 3), 0x6a9a3a, { x: Math.cos(a) * r, y: h / 2, z: Math.sin(a) * r }));
      if (i % 2) p.push(part(P.cyl(0.06, 0.06, 0.28, 5), 0x7a4a2a, { x: Math.cos(a) * r, y: h - 0.1, z: Math.sin(a) * r }));
    }
    return { main: one(merge(p), MAT.grass) };
  },
  lilypad() {
    const p = [part(new THREE.CircleGeometry(0.55, 9, 0.4, Math.PI * 2 - 0.4).rotateX(-Math.PI / 2), 0x4fae4a, { jitter: 0.04 })];
    p.push(part(P.sphere(0.12, 6, 4), 0xffa8d0, { ...S, x: 0.15, y: 0.06, sy: 0.6 }));
    return { main: one(merge(p), MAT.worldDS) };
  },
  pebbles(c = 0xa8a49c) {
    const p = [];
    for (let i = 0; i < 4; i++) p.push(jiggle(part(P.dodeca(0.13 + (i % 2) * 0.08, 0), c, { x: Math.cos(i * 1.7) * 0.35, y: 0.06, z: Math.sin(i * 1.7) * 0.35, sy: 0.6 }), 0.03, i));
    return { main: one(merge(p)) };
  },
  log() {
    const p = [part(P.cyl(0.32, 0.32, 2.4, 7), 0x7a5232, { rz: Math.PI / 2, y: 0.3, jitter: 0.05 })];
    p.push(part(P.cyl(0.28, 0.28, 0.03, 7), 0xc9a06a, { rz: Math.PI / 2, x: 1.21, y: 0.3, jitter: 0 }));
    p.push(blob(0.3, 0x5aa846, { x: -0.4, y: 0.6 }, 91, 0, 0.1));
    return { main: one(merge(p)) };
  },
  driftwood() {
    const p = [part(P.cyl(0.18, 0.22, 1.8, 6), 0xc8b8a0, { rz: Math.PI / 2, ry: 0.4, y: 0.18 })];
    p.push(part(P.cyl(0.07, 0.09, 0.8, 5), 0xc8b8a0, { x: 0.3, y: 0.35, z: 0.2, rz: 0.9, ry: 0.4 }));
    return { main: one(merge(p)) };
  },
  shell() {
    const p = [];
    for (let i = 0; i < 5; i++) p.push(part(P.cone(0.05, 0.3, 4), 0xffd2bc, { rz: (i - 2) * 0.3 + Math.PI / 2, rx: -1.3, y: 0.05, z: (i - 2) * 0.02, jitter: 0.05 }));
    p.push(part(P.cone(0.12, 0.35, 7), 0xffb08a, { x: 0.45, z: 0.3, y: 0.06, rz: Math.PI / 2, jitter: 0.05 }));
    return { main: one(merge(p)) };
  },
  sandpile() {
    const p = [part(P.cone(0.9, 0.5, 9), 0xf0d48e, { y: 0.2, jitter: 0.06 }), part(P.cone(0.5, 0.35, 8), 0xf5df9e, { x: 0.6, y: 0.12, jitter: 0.06 })];
    return { main: one(merge(p)) };
  },
  shiny() {
    const p = [part(P.cone(0.7, 0.35, 8), 0x8a6a48, { y: 0.15, jitter: 0.1 })];
    for (let i = 0; i < 5; i++) p.push(part(P.octa(0.08, 0), 0xfff2a0, { x: Math.cos(i * 1.3) * 0.35, y: 0.3, z: Math.sin(i * 1.3) * 0.35, jitter: 0 }));
    return { main: [{ geo: merge([p[0]]), mat: MAT.world }, { geo: merge(p.slice(1)), mat: MAT.glowCool }] };
  },
  rubble(c = 0xc9a06a) {
    const p = [];
    for (let i = 0; i < 6; i++) p.push(jiggle(part(P.box(0.4, 0.3, 0.4), i % 2 ? c : 0x9a8f80, { x: Math.cos(i * 1.1) * 0.5, y: 0.12 + (i % 3) * 0.1, z: Math.sin(i * 1.1) * 0.5, ry: i, rz: i * 0.3 }), 0.05, i));
    p.push(part(P.octa(0.12, 0), 0xffe08a, { y: 0.55, jitter: 0 }));
    return { main: one(merge(p)) };
  },
  icecrystal() {
    const p = [];
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26, h = 1.0 + (i % 3) * 0.4;
      const c = part(P.cyl(0, 0.2, h, 5), 0xbff0ff, { jitter: 0.1 });
      c.rotateZ(i === 0 ? 0 : -0.4); c.rotateY(a);
      c.translate(Math.cos(a) * 0.25 * (i > 0), h / 2, -Math.sin(a) * 0.25 * (i > 0));
      p.push(c);
    }
    return { main: one(merge(p), MAT.glowCool) };
  },
  pot(c = 0xc9804a) {
    const p = [part(P.sphere(0.4, 9, 7), c, { ...S, y: 0.38, sy: 1.0 }), part(P.cyl(0.18, 0.24, 0.2, 9), c, { ...S, y: 0.8 }), part(P.torus(0.2, 0.04, 4, 10), 0x8a4a2a, { rx: Math.PI / 2, y: 0.9 })];
    p.push(part(P.torus(0.39, 0.03, 4, 12), 0xf2d6a0, { rx: Math.PI / 2, y: 0.42 }));
    return { main: one(merge(p)) };
  },
  crate() {
    const p = [part(P.box(0.9, 0.8, 0.9), 0xb07a48, { y: 0.4, jitter: 0.04 })];
    for (const y of [0.05, 0.75]) p.push(part(P.box(0.94, 0.1, 0.94), 0x8a5a32, { y }));
    p.push(part(P.box(0.08, 0.9, 1.2), 0x8a5a32, { y: 0.4, rx: 0.73, x: 0.46 }));
    return { main: one(merge(p)) };
  },
  barrel() {
    const p = [part(P.cyl(0.42, 0.42, 1.0, 10), 0xa0703e, { ...S, y: 0.5, sx: 1, sz: 1 }), part(P.sphere(0.46, 10, 6), 0xa0703e, { ...S, y: 0.5, sy: 1.1 })];
    for (const y of [0.18, 0.82]) p.push(part(P.torus(0.45, 0.035, 4, 12), 0x5a5a5e, { rx: Math.PI / 2, y }));
    return { main: one(merge([p[0], p[2], p[3]])) };
  },
};
