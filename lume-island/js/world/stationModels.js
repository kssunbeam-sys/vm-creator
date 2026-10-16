// Models for player-placed stations, storage and decorations.
// Each returns { parts:{body,glow,crystal,water,cloth,foliage}, hw, hd } (front = +z).
import * as THREE from '../three.js';
import { part, merge, P, jiggle } from '../core/geo.js';
import { MAT } from './materials.js';

const S = { flat: false, jitter: 0 };
const WOOD = 0xb07a48, WOOD_D = 0x7a4e2c, STONE = 0xa9a49a, METAL = 0x6a6e78, COPPER = 0xe0803a;

function legs(out, w, d, h, c = WOOD_D, t = 0.12) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.body.push(part(P.box(t, h, t), c, { x: sx * (w / 2 - t), y: h / 2, z: sz * (d / 2 - t) }));
}
function table(out, w, d, h, top = WOOD) {
  legs(out, w, d, h - 0.1);
  out.body.push(part(P.box(w, 0.12, d), top, { y: h - 0.06, jitter: 0.04 }));
}
function barrel(out, x, z, r, h, c, band = 0x5a5a5e, lying = false) {
  const o = lying ? { rz: Math.PI / 2, x, y: r + 0.15, z } : { x, y: h / 2, z };
  out.body.push(part(P.cyl(r, r, h, 12), c, { ...S, ...o }));
  out.body.push(part(P.sphere(r * 1.08, 12, 6), c, { ...S, ...o, sy: lying ? 1.08 : h / (r * 2.2), sx: lying ? h / (r * 2.2) : 1.08, sz: 1.08 }));
  for (const k of [-0.3, 0.3]) {
    const bo = lying ? { rz: Math.PI / 2, x: x + k * h, y: r + 0.15, z } : { x, y: h / 2 + k * h, z };
    out.body.push(part(P.torus(r * 1.04, 0.04, 4, 14), band, { ...bo, rx: lying ? 0 : Math.PI / 2, ry: lying ? Math.PI / 2 : 0 }));
  }
}

const M = {
  workbench() {
    const out = { body: [], glow: [] };
    table(out, 2.2, 1.1, 1.0);
    out.body.push(part(P.box(2.0, 0.08, 0.9), WOOD_D, { y: 0.35, jitter: 0 }));
    out.body.push(part(P.box(0.3, 0.25, 0.3), METAL, { x: -0.8, y: 1.15, z: 0.3 }));
    out.body.push(part(P.box(0.7, 0.04, 0.2), 0xd8d8e0, { x: 0.3, y: 1.04, z: -0.1, ry: 0.3 }));
    out.body.push(part(P.box(0.1, 0.06, 0.4), WOOD_D, { x: 0.65, y: 1.05, z: -0.05, ry: 0.3 }));
    out.body.push(part(P.cyl(0.04, 0.04, 0.4, 5), WOOD_D, { x: 0.1, y: 1.05, z: 0.3, rz: Math.PI / 2 }));
    out.body.push(part(P.box(0.18, 0.12, 0.1), METAL, { x: 0.32, y: 1.05, z: 0.3 }));
    for (let i = 0; i < 3; i++) out.body.push(part(P.box(0.25, 1.4, 0.06), 0xc8925a, { x: 1.25, y: 0.7, z: -0.3 + i * 0.25, rz: -0.15 }));
    return { out, hw: 1.3, hd: 0.6 };
  },
  kiln() {
    const out = { body: [], glow: [] };
    out.body.push(part(P.cyl(1.1, 1.2, 0.4, 10), 0x8a7a6a, { y: 0.2 }));
    out.body.push(part(new THREE.SphereGeometry(1.0, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xc87a5a, { y: 0.4, jitter: 0.06 }));
    out.glow.push(part(P.box(0.6, 0.55, 0.2), 0xffa030, { y: 0.7, z: 0.86, jitter: 0 }));
    out.body.push(part(P.box(0.8, 0.12, 0.3), 0x8a5a3a, { y: 1.02, z: 0.86 }));
    out.body.push(part(P.cyl(0.18, 0.22, 0.9, 8), 0x9a6a4a, { y: 1.5, z: -0.3 }));
    return { out, hw: 1.15, hd: 1.15 };
  },
  smelter() {
    const out = { body: [], glow: [] };
    out.body.push(part(P.box(1.6, 1.4, 1.4), STONE, { y: 0.7, jitter: 0.08 }));
    out.body.push(part(P.box(1.7, 0.2, 1.5), 0x8a8680, { y: 1.45 }));
    out.glow.push(part(P.box(0.7, 0.5, 0.2), 0xff8a2a, { y: 0.5, z: 0.65, jitter: 0 }));
    out.body.push(part(P.cyl(0.35, 0.28, 0.4, 10), METAL, { y: 1.75 }));
    out.glow.push(part(P.cyl(0.3, 0.3, 0.05, 10), 0xffc040, { y: 1.95, jitter: 0 }));
    out.body.push(part(P.box(0.4, 1.4, 0.4), 0x8a8680, { x: 0.55, y: 2.1, z: -0.45 }));
    return { out, hw: 0.9, hd: 0.8 };
  },
  incubator() {
    const out = { body: [], glow: [], crystal: [] };
    out.body.push(part(P.cyl(0.9, 1.0, 0.5, 14), COPPER, { y: 0.25 }));
    out.body.push(part(P.torus(0.85, 0.08, 6, 16), 0xb86a2a, { rx: Math.PI / 2, y: 0.52 }));
    out.crystal.push(part(new THREE.SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xd8f4ff, { ...S, y: 0.5 }));
    out.body.push(part(P.sphere(0.32, 12, 10), 0xf4eedf, { ...S, y: 0.85, sy: 1.25 }));
    for (let i = 0; i < 4; i++) out.glow.push(part(P.sphere(0.08, 6, 5), 0xffd27a, { ...S, x: Math.cos(i * 1.57) * 0.95, y: 0.35, z: Math.sin(i * 1.57) * 0.95 }));
    return { out, hw: 1.0, hd: 1.0 };
  },
  chest() {
    const out = { body: [], glow: [] };
    out.body.push(part(P.box(1.3, 0.7, 0.85), 0xa06a3a, { y: 0.35, jitter: 0.04 }));
    out.body.push(part(new THREE.CylinderGeometry(0.43, 0.43, 1.3, 10, 1, false, 0, Math.PI), 0xb07a48, { y: 0.7, rz: Math.PI / 2, ry: Math.PI / 2, jitter: 0.03 }));
    for (const x of [-0.45, 0.45]) out.body.push(part(P.box(0.1, 1.15, 0.9), 0x5a5a64, { x, y: 0.57 }));
    out.body.push(part(P.box(0.22, 0.26, 0.08), 0xf2c94c, { y: 0.66, z: 0.45 }));
    return { out, hw: 0.7, hd: 0.5 };
  },
  luma_nest() {
    const out = { body: [], glow: [] };
    out.body.push(part(P.torus(0.9, 0.3, 8, 16), 0xc9a06a, { rx: Math.PI / 2, y: 0.3, jitter: 0.05 }));
    out.body.push(part(P.cyl(0.9, 0.9, 0.2, 14), 0xe8d0a0, { y: 0.15 }));
    out.body.push(part(P.sphere(0.4, 10, 6), 0x7ad6ff, { ...S, x: -0.3, y: 0.35, sy: 0.45 }));
    out.body.push(part(P.sphere(0.35, 10, 6), 0xffb0d0, { ...S, x: 0.35, y: 0.35, z: 0.2, sy: 0.45 }));
    out.body.push(part(P.box(0.06, 0.9, 0.06), WOOD_D, { x: 1.1, y: 0.45, z: 0.6 }));
    out.body.push(part(P.box(0.6, 0.35, 0.06), WOOD, { x: 1.1, y: 0.85, z: 0.62 }));
    return { out, hw: 1.2, hd: 1.2 };
  },
  luma_altar() {
    const out = { body: [], glow: [], crystal: [] };
    out.body.push(part(P.cyl(1.2, 1.4, 0.4, 8), 0x8f8c88, { y: 0.2 }));
    out.body.push(part(P.cyl(0.6, 0.8, 1.0, 8), 0xb8b2a6, { y: 0.9 }));
    out.body.push(part(P.cyl(0.9, 0.7, 0.25, 8), 0x8f8c88, { y: 1.5 }));
    out.crystal.push(part(P.octa(0.45, 0), 0xc08aff, { y: 2.3, sy: 1.6 }));
    for (let i = 0; i < 4; i++) out.crystal.push(part(P.octa(0.12, 0), 0x7ad6ff, { x: Math.cos(i * 1.57) * 1.0, y: 0.5, z: Math.sin(i * 1.57) * 1.0 }));
    return { out, hw: 1.2, hd: 1.2 };
  },
  stove() {
    const out = { body: [], glow: [] };
    out.body.push(part(P.box(1.4, 1.0, 1.0), 0x3a3a42, { y: 0.55, jitter: 0.04 }));
    legs(out, 1.4, 1.0, 0.1, 0x2a2a30);
    out.glow.push(part(P.box(0.6, 0.35, 0.1), 0xff8a2a, { y: 0.45, z: 0.51, jitter: 0 }));
    out.body.push(part(P.cyl(0.35, 0.3, 0.45, 12), 0x8a8e98, { y: 1.28, x: -0.25 }));
    out.body.push(part(P.cyl(0.25, 0.25, 0.1, 10), METAL, { y: 1.1, x: 0.35 }));
    out.body.push(part(P.cyl(0.12, 0.12, 1.6, 8), 0x2a2a30, { x: 0.5, y: 1.8, z: -0.35 }));
    out.body.push(part(P.box(0.06, 0.06, 0.4), WOOD_D, { x: -0.25, y: 1.5, z: 0.3 }));
    return { out, hw: 0.75, hd: 0.6 };
  },
  cask(c = 0xb07a48, band = 0x5a5a5e, stand = WOOD_D) {
    const out = { body: [], glow: [] };
    out.body.push(part(P.box(1.6, 0.3, 0.9), stand, { y: 0.15 }));
    barrel(out, 0, 0, 0.55, 1.4, c, band, true);
    out.body.push(part(P.cyl(0.06, 0.06, 0.25, 6), 0xd8b04a, { y: 0.55, x: 0.82, rz: Math.PI / 2 }));
    out.body.push(part(P.box(0.08, 0.12, 0.08), 0xd8b04a, { y: 0.45, x: 0.95 }));
    return { out, hw: 0.9, hd: 0.6 };
  },
  fish_table() {
    const out = { body: [], glow: [] };
    table(out, 1.8, 1.0, 0.95, 0xd8c09a);
    out.body.push(part(P.box(0.7, 0.06, 0.45), 0xc8925a, { x: -0.3, y: 0.98 }));
    out.body.push(part(P.sphere(0.2, 8, 6), 0x9fc6e0, { ...S, x: -0.3, y: 1.06, sx: 1.8, sy: 0.6 }));
    out.body.push(part(P.box(0.35, 0.03, 0.06), 0xd8d8e0, { x: 0.3, y: 1.0, z: 0.15, ry: 0.4 }));
    out.body.push(part(P.cyl(0.25, 0.2, 0.4, 10), 0x6a8aa8, { x: 1.1, y: 0.2 }));
    return { out, hw: 1.0, hd: 0.6 };
  },
  forge() {
    const out = { body: [], glow: [] };
    out.body.push(part(P.box(1.6, 0.9, 1.2), STONE, { y: 0.45, jitter: 0.08 }));
    out.glow.push(part(P.box(1.1, 0.12, 0.8), 0xff6a1a, { y: 0.92, jitter: 0 }));
    out.body.push(part(P.box(1.2, 1.8, 0.3), 0x8a8680, { y: 1.8, z: -0.5 }));
    out.body.push(part(P.cone(0.8, 0.8, 4), 0x8a8680, { y: 1.35, z: -0.2, ry: Math.PI / 4, sz: 0.7 }));
    out.body.push(part(P.box(0.5, 0.3, 0.3), 0x5a5a64, { x: 1.3, y: 0.7, z: 0.2 }));
    out.body.push(part(P.box(0.9, 0.2, 0.35), 0x5a5a64, { x: 1.35, y: 0.95, z: 0.2 }));
    out.body.push(part(P.cyl(0.25, 0.32, 0.6, 8), WOOD_D, { x: 1.35, y: 0.3, z: 0.2 }));
    return { out, hw: 1.5, hd: 0.7 };
  },
  gem_cutter() {
    const out = { body: [], glow: [], crystal: [] };
    table(out, 1.4, 0.8, 0.9);
    out.body.push(part(P.cyl(0.45, 0.45, 0.12, 16), 0x9a9aa8, { y: 1.35, rx: Math.PI / 2 }));
    out.body.push(part(P.box(0.1, 0.5, 0.1), METAL, { y: 1.1 }));
    out.body.push(part(P.box(0.08, 0.35, 0.08), METAL, { x: 0.15, y: 1.35, z: 0.2, rz: 0.6 }));
    out.crystal.push(part(P.octa(0.12, 0), 0xa86ad8, { x: -0.45, y: 1.0, sy: 1.4 }));
    return { out, hw: 0.8, hd: 0.5 };
  },
  jeweler_bench() {
    const out = { body: [], glow: [], crystal: [] };
    table(out, 1.5, 0.8, 0.95, 0x8a5a36);
    out.body.push(part(P.cyl(0.04, 0.04, 0.7, 5), METAL, { x: 0.45, y: 1.3, z: -0.1 }));
    out.body.push(part(P.torus(0.16, 0.03, 4, 12), METAL, { x: 0.45, y: 1.6, z: 0.05 }));
    out.crystal.push(part(P.cyl(0.14, 0.14, 0.02, 12), 0xd8f4ff, { x: 0.45, y: 1.6, z: 0.05, rx: Math.PI / 2 }));
    out.body.push(part(P.torus(0.08, 0.025, 4, 10), 0xf2c94c, { x: -0.3, y: 1.0, rx: Math.PI / 2 }));
    out.crystal.push(part(P.octa(0.06, 0), 0xe8344a, { x: -0.1, y: 1.03 }));
    return { out, hw: 0.8, hd: 0.5 };
  },
  treasure_sink() {
    const out = { body: [], glow: [], water: [] };
    out.body.push(part(P.box(1.6, 0.8, 1.0), STONE, { y: 0.4, jitter: 0.06 }));
    out.water.push(part(P.box(1.3, 0.06, 0.7), 0x5fd8e6, { y: 0.78, jitter: 0 }));
    out.body.push(part(P.cyl(0.05, 0.05, 0.6, 6), 0x8a8e98, { x: -0.6, y: 1.05, z: -0.4 }));
    out.body.push(part(P.box(0.4, 0.05, 0.05), 0x8a8e98, { x: -0.45, y: 1.33, z: -0.4 }));
    out.body.push(part(P.box(0.3, 0.1, 0.15), 0xd9a04a, { x: 0.5, y: 0.86, z: 0.35 }));
    return { out, hw: 0.85, hd: 0.55 };
  },
  treasure_bench() {
    const out = { body: [], glow: [] };
    table(out, 1.8, 1.0, 0.95, 0x9a6a3a);
    out.body.push(part(P.box(0.9, 0.02, 0.6), 0xe9d6a6, { y: 0.97, ry: 0.2 }));
    out.body.push(part(P.box(0.06, 0.03, 0.06), 0xe8343a, { x: 0.15, y: 0.99, z: 0.05 }));
    out.body.push(part(P.cyl(0.18, 0.18, 0.05, 12), 0xc9a040, { x: -0.6, y: 0.98, z: 0.25 }));
    out.body.push(part(P.cyl(0.05, 0.06, 0.2, 6), 0xfff6e8, { x: 0.65, y: 1.08, z: -0.3 }));
    out.glow.push(part(P.cone(0.04, 0.1, 5), 0xffd27a, { x: 0.65, y: 1.24, z: -0.3, jitter: 0 }));
    return { out, hw: 1.0, hd: 0.6 };
  },
  rubble_refiner() {
    const out = { body: [], glow: [] };
    legs(out, 1.6, 1.0, 0.9);
    out.body.push(part(P.box(1.6, 0.15, 1.0), WOOD, { y: 0.95, jitter: 0.04 }));
    out.body.push(part(P.box(1.4, 0.05, 0.85), 0x8a8680, { y: 1.04, jitter: 0 }));
    for (let i = 0; i < 5; i++) out.body.push(jiggle(part(P.dodeca(0.13, 0), 0xc9a06a, { x: (i - 2) * 0.25, y: 1.12, z: (i % 2) * 0.2 - 0.1 }), 0.03, i));
    out.body.push(part(P.cyl(0.3, 0.25, 0.4, 10), 0x7a5232, { x: 0, y: 0.2 }));
    return { out, hw: 0.9, hd: 0.6 };
  },
  restoration_table() {
    const out = { body: [], glow: [] };
    table(out, 1.8, 1.0, 0.95, 0xe8dcc0);
    out.body.push(part(P.cyl(0.18, 0.12, 0.45, 10), 0xc98a5a, { ...S, y: 1.2 }));
    out.body.push(part(P.cyl(0.1, 0.18, 0.12, 10), 0xc98a5a, { ...S, y: 1.48 }));
    out.body.push(part(P.cyl(0.08, 0.08, 0.12, 8), 0xe9c46a, { x: 0.55, y: 1.02, z: 0.2 }));
    for (let i = 0; i < 3; i++) out.body.push(part(P.cyl(0.02, 0.02, 0.35, 4), WOOD_D, { x: -0.6 + i * 0.08, y: 0.99, z: 0.25, rz: Math.PI / 2, ry: 0.3 }));
    return { out, hw: 1.0, hd: 0.6 };
  },
  lamp_post() {
    const out = { body: [], glow: [] };
    out.body.push(part(P.cyl(0.08, 0.12, 2.8, 6), 0x3a3434, { y: 1.4 }));
    out.glow.push(part(P.box(0.32, 0.4, 0.32), 0xffe6a8, { y: 2.95, jitter: 0 }));
    out.body.push(part(P.cone(0.32, 0.25, 4), 0x3a3434, { y: 3.28, ry: Math.PI / 4 }));
    return { out, hw: 0.2, hd: 0.2, light: { y: 3.0, color: 0xffc070 } };
  },
  fence() {
    const out = { body: [], glow: [] };
    for (const x of [-0.95, 0.95]) out.body.push(part(P.box(0.14, 1.0, 0.14), WOOD_D, { x, y: 0.5 }));
    for (const y of [0.35, 0.75]) out.body.push(part(P.box(2.0, 0.12, 0.08), WOOD, { y }));
    return { out, hw: 1.0, hd: 0.12 };
  },
  flower_pot() {
    const out = { body: [], glow: [] };
    out.body.push(part(P.cyl(0.35, 0.25, 0.5, 10), 0xc87a4a, { y: 0.25 }));
    for (let i = 0; i < 5; i++) { out.body.push(part(P.cone(0.06, 0.4, 4), 0x4f9a3a, { x: Math.cos(i) * 0.15, y: 0.7, z: Math.sin(i) * 0.15 })); out.body.push(part(P.ico(0.1, 0), [0xff6a8a, 0xffd23a, 0xffffff][i % 3], { x: Math.cos(i) * 0.15, y: 0.92, z: Math.sin(i) * 0.15 })); }
    return { out, hw: 0.35, hd: 0.35 };
  },
  bench() {
    const out = { body: [] };
    out.body.push(part(P.box(1.8, 0.1, 0.5), WOOD, { y: 0.5 }));
    out.body.push(part(P.box(1.8, 0.45, 0.08), WOOD, { y: 0.8, z: -0.24, rx: -0.15 }));
    for (const sx of [-1, 1]) out.body.push(part(P.box(0.1, 0.5, 0.45), 0x3a3434, { x: sx * 0.75, y: 0.25 }));
    return { out, hw: 0.95, hd: 0.3 };
  },
  table() { const out = { body: [] }; table(out, 1.6, 1.0, 0.85); return { out, hw: 0.85, hd: 0.55 }; },
  rug() { const out = { body: [] }; out.body.push(part(P.box(2.4, 0.04, 1.6), 0xd9603c, { y: 0.03, jitter: 0 })); out.body.push(part(P.box(2.0, 0.05, 1.2), 0xf2c94c, { y: 0.035, jitter: 0 })); out.body.push(part(P.box(1.4, 0.06, 0.6), 0x2fa6a0, { y: 0.04, jitter: 0 })); return { out, hw: 0, hd: 0, flat: true }; },
  hay_bale() { const out = { body: [] }; out.body.push(part(P.box(1.4, 0.8, 0.9), 0xe8c86a, { y: 0.4, jitter: 0.08 })); for (const x of [-0.35, 0.35]) out.body.push(part(P.box(0.06, 0.82, 0.92), 0xb8763a, { x, y: 0.4 })); return { out, hw: 0.7, hd: 0.45 }; },
  scarecrow() {
    const out = { body: [] };
    out.body.push(part(P.box(0.12, 2.2, 0.12), WOOD_D, { y: 1.1 }));
    out.body.push(part(P.box(1.6, 0.1, 0.1), WOOD_D, { y: 1.6 }));
    out.body.push(part(P.box(0.6, 0.8, 0.35), 0x4e8fd1, { y: 1.45 }));
    out.body.push(part(P.sphere(0.3, 8, 6), 0xe8c86a, { ...S, y: 2.1 }));
    out.body.push(part(P.cyl(0.5, 0.5, 0.05, 12), 0xe0b25a, { y: 2.3 }));
    out.body.push(part(P.cone(0.25, 0.35, 10), 0xe0b25a, { y: 2.45 }));
    return { out, hw: 0.3, hd: 0.3 };
  },
  luma_statue() {
    const out = { body: [], crystal: [] };
    out.body.push(part(P.box(1.2, 0.6, 1.2), 0x9a968e, { y: 0.3 }));
    out.body.push(part(P.sphere(0.55, 12, 10), 0xd8d2c6, { ...S, y: 1.15 }));
    out.body.push(part(P.cone(0.15, 0.45, 6), 0xd8d2c6, { x: 0.3, y: 1.7, rz: -0.4 }));
    out.body.push(part(P.cone(0.15, 0.45, 6), 0xd8d2c6, { x: -0.3, y: 1.7, rz: 0.4 }));
    out.crystal.push(part(P.sphere(0.1, 6, 5), 0x7ad6ff, { ...S, x: 0.18, y: 1.25, z: 0.48 }));
    out.crystal.push(part(P.sphere(0.1, 6, 5), 0x7ad6ff, { ...S, x: -0.18, y: 1.25, z: 0.48 }));
    return { out, hw: 0.6, hd: 0.6 };
  },
  fountain() {
    const out = { body: [], water: [] };
    out.body.push(part(P.torus(1.1, 0.22, 6, 16), 0xd8cdb8, { rx: Math.PI / 2, y: 0.3 }));
    out.body.push(part(P.cyl(1.1, 1.2, 0.15, 14), 0xb8ad9a, { y: 0.08 }));
    out.water.push(part(P.cyl(1.0, 1.0, 0.05, 14), 0x5fd8e6, { y: 0.3, jitter: 0 }));
    out.body.push(part(P.cyl(0.18, 0.25, 1.0, 8), 0xd8cdb8, { y: 0.7 }));
    out.water.push(part(P.sphere(0.2, 8, 6), 0x9af0ff, { ...S, y: 1.3 }));
    return { out, hw: 1.2, hd: 1.2 };
  },
  campfire() {
    const out = { body: [], glow: [] };
    for (let i = 0; i < 8; i++) out.body.push(jiggle(part(P.dodeca(0.18, 0), 0x8f8c88, { x: Math.cos(i * 0.785) * 0.6, y: 0.1, z: Math.sin(i * 0.785) * 0.6 }), 0.03, i));
    for (let i = 0; i < 4; i++) out.body.push(part(P.cyl(0.07, 0.07, 0.9, 5), WOOD_D, { y: 0.25, rz: Math.cos(i * 1.57) * 1.1, rx: Math.sin(i * 1.57) * 1.1 }));
    out.glow.push(part(P.cone(0.3, 0.7, 6), 0xffa030, { y: 0.45, jitter: 0 }));
    out.glow.push(part(P.cone(0.18, 0.9, 5), 0xffe066, { y: 0.55, jitter: 0 }));
    return { out, hw: 0.6, hd: 0.6, light: { y: 0.8, color: 0xffa040 } };
  },
  banner() {
    const out = { body: [], cloth: [] };
    out.body.push(part(P.cyl(0.07, 0.09, 3.6, 6), WOOD_D, { y: 1.8 }));
    out.cloth.push(part(P.box(0.06, 1.4, 0.9), 0x3f7fe0, { y: 2.7, z: 0.5, jitter: 0 }));
    out.cloth.push(part(P.octa(0.2, 0), 0xf2c94c, { x: 0.05, y: 2.8, z: 0.5, sx: 0.3 }));
    return { out, hw: 0.15, hd: 0.15 };
  },
  planter() {
    const out = { body: [] };
    out.body.push(part(P.box(2.0, 0.5, 0.8), WOOD, { y: 0.25 }));
    for (let i = 0; i < 8; i++) { out.body.push(part(P.cone(0.06, 0.4, 4), 0x4f9a3a, { x: -0.8 + i * 0.23, y: 0.7 })); out.body.push(part(P.ico(0.11, 0), [0xff6a8a, 0xffd23a, 0xb07af0, 0xffffff][i % 4], { x: -0.8 + i * 0.23, y: 0.92 })); }
    return { out, hw: 1.0, hd: 0.4 };
  },
  signpost() {
    const out = { body: [] };
    out.body.push(part(P.box(0.12, 1.6, 0.12), WOOD_D, { y: 0.8 }));
    out.body.push(part(P.box(1.0, 0.35, 0.08), WOOD, { y: 1.35, x: 0.25 }));
    out.body.push(part(P.cone(0.18, 0.25, 3), WOOD, { y: 1.35, x: 0.85, rz: -Math.PI / 2, sz: 0.4 }));
    return { out, hw: 0.15, hd: 0.15 };
  },
  torch() {
    const out = { body: [], glow: [] };
    out.body.push(part(P.cyl(0.06, 0.08, 1.4, 6), WOOD_D, { y: 0.7 }));
    out.body.push(part(P.cyl(0.13, 0.1, 0.18, 6), 0x3a2a20, { y: 1.42 }));
    out.glow.push(part(P.cone(0.14, 0.4, 6), 0xffb02a, { y: 1.68, jitter: 0 }));
    return { out, hw: 0.15, hd: 0.15, light: { y: 1.7, color: 0xffa040 } };
  },
};
M.cask_meadow = () => M.cask(0xc8925a, 0x5a5a5e);
M.cask_forest = () => M.cask(0x6b4426, 0x3a5a3a, 0x4a3a2a);
M.cask_mountain = () => M.cask(0x8a6a4a, 0xa8b8d8, 0x6a6e78);
M.cask_jungle = () => M.cask(0xd9b46a, 0x8a4a2a, 0x7a5232);

const cache = new Map();
export function stationModel(type) {
  if (cache.has(type)) return cache.get(type);
  const fn = M[type] || M.workbench;
  const { out, hw, hd, light, flat } = fn();
  const res = { hw, hd, light, flat, meshes: [] };
  const mats = { body: MAT.world, glow: MAT.glowWarm, crystal: MAT.glowCool, water: MAT.glowCool, cloth: MAT.foliage };
  for (const k of Object.keys(out)) if (out[k] && out[k].length) res.meshes.push({ geo: merge(out[k]), mat: mats[k] || MAT.world, key: k });
  cache.set(type, res);
  return res;
}
// Merged single geometry (for icons)
export function stationGeometry(type) {
  const m = stationModel(type);
  return merge(m.meshes.map((x) => x.geo));
}
