// Procedural buildings and town props in four regional styles.
// Every builder returns arrays of parts: { body, roof, glow, glass } which the
// city merges into a handful of meshes. Local front = +z, ground at y = 0.
import * as THREE from '../three.js';
import { part, merge, P, jiggle } from '../core/geo.js';

const S = { flat: false, jitter: 0 };
export const STYLES = {
  meadow: { walls: [0xf7ecd4, 0xf3e3c4, 0xfff4de, 0xf0e6d8], trim: 0x8a5a36, roofs: [0xd9603c, 0xe27b47, 0xc9584a, 0x4f80b8, 0x5f9a6a, 0xd99a3a], base: 0xbcb19e, door: 0x7a4a2a, frame: true },
  forest: { walls: [0xa6743f, 0x956838, 0xb07e48], trim: 0x5e3b22, roofs: [0x5a8a3a, 0x6c9a44, 0x7a5a36, 0x4f7a3f], base: 0x8f8c84, door: 0x5a3a24, logs: true, moss: true },
  mountain: { walls: [0xb3b1b8, 0xa3a6af, 0xbab4aa], upper: 0x9a7350, trim: 0x5a4030, roofs: [0x4a5a7a, 0x5d4c6c, 0x3f6a7a, 0x7a4a3a], base: 0x7f8088, door: 0x5a3a24, snow: true },
  jungle: { walls: [0xdcb86e, 0xc8a05a, 0xbf7c3e, 0xe0c890], trim: 0x7a4a2a, roofs: [0xe2c272, 0xd6b25a, 0xc9a24a], base: 0x8a6a4a, door: 0x6a3a1a, stilts: true, thatch: true },
};

export function pickFrom(arr, seed) { return arr[Math.abs(seed) % arr.length]; }

function windowParts(out, x, y, z, ry, style, opts = {}) {
  const st = STYLES[style];
  const w = opts.w ?? 0.9, h = opts.h ?? 0.95;
  const T = (g, c, o) => { const p = part(g, c, o); p.rotateY(ry); p.translate(x, y, z); return p; };
  out.body.push(T(P.box(w + 0.18, h + 0.18, 0.12), st.trim, { jitter: 0.02 }));
  out.glass.push(T(P.box(w, h, 0.14), 0x6d8fae, { jitter: 0 }));
  out.body.push(T(P.box(0.07, h, 0.16), st.trim, { jitter: 0 }));
  out.body.push(T(P.box(w, 0.07, 0.16), st.trim, { jitter: 0 }));
  if (opts.box) {
    out.body.push(T(P.box(w + 0.2, 0.22, 0.32), 0x8a5a36, { y: -h / 2 - 0.16, z: 0.12 }));
    const fc = [0xff6a8a, 0xffd23a, 0xffffff, 0xb07af0];
    for (let i = 0; i < 4; i++) out.body.push(T(P.ico(0.1, 0), fc[(i + Math.round(x * 3)) & 3], { x: (i - 1.5) * 0.22, y: -h / 2 - 0.02, z: 0.16, jitter: 0 }));
  }
  if (opts.shutters) {
    out.body.push(T(P.box(0.32, h + 0.1, 0.08), opts.shutters, { x: -(w / 2 + 0.28) }));
    out.body.push(T(P.box(0.32, h + 0.1, 0.08), opts.shutters, { x: w / 2 + 0.28 }));
  }
}

// A rectangular house (meadow, forest, mountain, jungle styles)
export function house(o) {
  const style = o.style || 'meadow';
  const st = STYLES[style];
  const seed = o.seed ?? 1;
  const w = o.w ?? 6, d = o.d ?? 5, H = o.h ?? 2.8, floors = o.floors ?? 1;
  const wall = o.wall ?? pickFrom(st.walls, seed);
  const roofC = o.roofColor ?? pickFrom(st.roofs, seed * 7 + 3);
  const out = { body: [], roof: [], glow: [], glass: [] };
  const stiltH = st.stilts && o.stilts !== false ? 1.3 : 0;
  const baseH = stiltH ? stiltH + 0.2 : 0.4;
  // foundation / stilts
  if (stiltH) {
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) out.body.push(part(P.cyl(0.13, 0.15, stiltH, 6), 0x7a5232, { x: sx * (w / 2 + 0.3), y: stiltH / 2, z: sz * (d / 2 + 0.3) }));
    out.body.push(part(P.box(w + 1.4, 0.22, d + 1.6), 0xa07040, { y: stiltH + 0.1, jitter: 0.03 }));
    for (let i = 0; i < 4; i++) out.body.push(part(P.box(1.4, 0.12, 0.4), 0x8a5a36, { y: (i + 0.5) * stiltH / 4, z: d / 2 + 1.1 + (3 - i) * 0.42 }));
    // railing
    for (const sx of [-1, 1]) out.body.push(part(P.box(0.08, 0.7, d + 1.4), 0x7a4a2a, { x: sx * (w / 2 + 0.65), y: stiltH + 0.55 }));
  } else {
    out.body.push(part(P.box(w + 0.35, 0.42, d + 0.35), st.base, { y: 0.2, jitter: 0.05 }));
    out.body.push(part(P.box(1.5, 0.22, 0.6), st.base, { y: 0.11, z: d / 2 + 0.45 }));
  }
  const totalH = H * floors;
  const y0 = baseH;
  // walls
  if (style === 'mountain') {
    out.body.push(part(P.box(w, H, d), wall, { y: y0 + H / 2, jitter: 0.06 }));
    if (floors > 1) out.body.push(part(P.box(w + 0.1, H * (floors - 1), d + 0.1), st.upper, { y: y0 + H + H * (floors - 1) / 2, jitter: 0.04 }));
    else out.body.push(part(P.box(w + 0.06, H * 0.35, d + 0.06), st.upper, { y: y0 + H * 0.82, jitter: 0.03 }));
  } else {
    out.body.push(part(P.box(w, totalH, d), wall, { y: y0 + totalH / 2, jitter: 0.03 }));
  }
  if (st.logs) {
    for (let k = 0.35; k < totalH; k += 0.42) {
      out.body.push(part(P.box(w + 0.04, 0.05, d + 0.04), 0x6e4a2a, { y: y0 + k, jitter: 0 }));
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.body.push(part(P.cyl(0.18, 0.18, totalH + 0.2, 6), 0x7a5232, { x: sx * w / 2, y: y0 + totalH / 2, z: sz * d / 2 }));
  } else {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.body.push(part(P.box(0.22, totalH, 0.22), st.trim, { x: sx * w / 2, y: y0 + totalH / 2, z: sz * d / 2, jitter: 0.02 }));
  }
  if (st.frame) {
    for (let f = 0; f < floors; f++) {
      const yb = y0 + f * H;
      out.body.push(part(P.box(w + 0.05, 0.16, d + 0.05), st.trim, { y: yb + H - 0.08, jitter: 0 }));
      out.body.push(part(P.box(0.14, H, 0.1), st.trim, { x: -w / 4 - 0.4, y: yb + H / 2, z: d / 2 + 0.03 }));
      out.body.push(part(P.box(0.14, H, 0.1), st.trim, { x: w / 4 + 0.4, y: yb + H / 2, z: d / 2 + 0.03 }));
      if (f > 0) {
        out.body.push(part(P.box(0.12, H * 1.15, 0.08), st.trim, { x: -w / 2 + 0.6, y: yb + H / 2, z: d / 2 + 0.05, rz: 0.7 }));
        out.body.push(part(P.box(0.12, H * 1.15, 0.08), st.trim, { x: w / 2 - 0.6, y: yb + H / 2, z: d / 2 + 0.05, rz: -0.7 }));
      }
    }
  }
  if (style === 'jungle') {
    for (let k = 0.3; k < totalH; k += 0.5) out.body.push(part(P.box(w + 0.03, 0.06, d + 0.03), 0xa07a3a, { y: y0 + k, jitter: 0 }));
  }
  // door
  out.body.push(part(P.box(1.35, 2.05, 0.1), st.trim, { y: y0 + 1.02, z: d / 2 + 0.02 }));
  out.body.push(part(P.box(1.1, 1.85, 0.14), o.doorColor ?? st.door, { y: y0 + 0.93, z: d / 2 + 0.03, jitter: 0.02 }));
  out.body.push(part(P.sphere(0.06, 6, 5), 0xf2c94c, { ...S, x: 0.35, y: y0 + 0.95, z: d / 2 + 0.12 }));
  // lanterns either side of the door
  for (const sx of [-1, 1]) {
    out.body.push(part(P.box(0.08, 0.08, 0.3), 0x3a3030, { x: sx * 0.95, y: y0 + 2.0, z: d / 2 + 0.15 }));
    out.glow.push(part(P.box(0.22, 0.3, 0.22), 0xffe2a0, { x: sx * 0.95, y: y0 + 1.82, z: d / 2 + 0.3, jitter: 0 }));
    out.body.push(part(P.cone(0.2, 0.16, 4), 0x3a3030, { x: sx * 0.95, y: y0 + 2.04, z: d / 2 + 0.3, ry: Math.PI / 4 }));
  }
  // windows
  const box = style === 'meadow';
  const shutters = style === 'mountain' ? 0x6a8aa8 : style === 'meadow' && seed % 2 ? 0x5f9a6a : null;
  for (let f = 0; f < floors; f++) {
    const wy = y0 + f * H + H * 0.55;
    const fx = w / 2 - 1.1;
    if (w >= 4.6 || f > 0) {
      windowParts(out, -fx, wy, d / 2 + 0.03, 0, style, { box, shutters });
      windowParts(out, fx, wy, d / 2 + 0.03, 0, style, { box, shutters });
    }
    if (f > 0) windowParts(out, 0, wy, d / 2 + 0.03, 0, style, { box, shutters });
    for (const sx of [-1, 1]) windowParts(out, sx * (w / 2 + 0.03), wy, 0, sx * Math.PI / 2, style, { shutters });
    windowParts(out, 0, wy, -d / 2 - 0.03, Math.PI, style, {});
  }
  // roof
  const top = y0 + totalH;
  const roofType = o.roof || (st.thatch ? 'hip' : 'gable');
  const oh = 0.55;
  if (roofType === 'gable') {
    const rh = o.roofH ?? Math.max(1.6, d * 0.42);
    const half = d / 2 + oh;
    const slope = Math.hypot(half, rh);
    const ang = Math.atan2(rh, half);
    for (const sz of [-1, 1]) {
      const pl = part(P.box(w + oh * 2, 0.2, slope), roofC, { jitter: 0.05 });
      pl.rotateX(sz * ang);
      pl.translate(0, top + rh / 2 + 0.05, sz * half / 2);
      out.roof.push(pl);
      for (let k = 1; k < 4; k++) {
        const t = k / 4;
        const strip = part(P.box(w + oh * 2 + 0.02, 0.05, 0.12), new THREE.Color(roofC).multiplyScalar(0.82).getHex(), { jitter: 0 });
        strip.rotateX(sz * ang);
        strip.translate(0, top + rh * (1 - t) + 0.14, sz * half * t);
        out.roof.push(strip);
      }
      if (st.snow) {
        const sn = part(P.box(w + oh * 2 - 0.2, 0.12, slope * 0.75), 0xf4f8ff, { jitter: 0.02 });
        sn.rotateX(sz * ang);
        sn.translate(0, top + rh * 0.62 + 0.17, sz * half * 0.38);
        out.roof.push(sn);
      }
    }
    out.roof.push(part(P.box(w + oh * 2 + 0.1, 0.22, 0.32), new THREE.Color(roofC).multiplyScalar(0.75).getHex(), { y: top + rh + 0.08 }));
    // gable triangles close the roof at the side walls (span the depth)
    for (const sx of [-1, 1]) {
      const g = part(P.prism(d, rh - 0.12, 0.12), style === 'mountain' ? st.upper : wall, { jitter: 0.02 });
      g.rotateY(Math.PI / 2);
      g.translate(sx * (w / 2 - 0.08), top, 0);
      out.body.push(g);
    }
    if (o.chimney ?? (seed % 3 !== 0)) {
      out.roof.push(part(P.box(0.6, rh + 1.0, 0.6), 0x9a8e84, { x: w / 4, y: top + rh / 2 + 0.6, z: -d / 6, jitter: 0.06 }));
      out.roof.push(part(P.box(0.75, 0.15, 0.75), 0x6a625c, { x: w / 4, y: top + rh + 1.12, z: -d / 6 }));
    }
    if (st.moss) for (let i = 0; i < 5; i++) out.roof.push(jiggle(part(P.ico(0.4, 0), 0x6aa848, { x: (i - 2) * w * 0.18, y: top + rh * 0.55, z: ((i % 2) * 2 - 1) * half * 0.45, sy: 0.4 }), 0.08, i));
  } else if (roofType === 'hip' || roofType === 'thatch') {
    const rh = o.roofH ?? Math.max(1.8, Math.min(w, d) * 0.55);
    const g = part(P.cone(1, 1, 4), roofC, { jitter: 0.05, ry: Math.PI / 4, sx: (w / 2 + oh) * 1.42, sz: (d / 2 + oh) * 1.42, sy: rh, y: top + rh / 2 });
    out.roof.push(g);
    if (st.thatch) {
      for (let k = 1; k < 4; k++) out.roof.push(part(P.cone(1, 0.12, 4), new THREE.Color(roofC).multiplyScalar(0.85).getHex(), { ry: Math.PI / 4, sx: (w / 2 + oh) * 1.42 * (1 - k / 4) + 0.1, sz: (d / 2 + oh) * 1.42 * (1 - k / 4) + 0.1, y: top + rh * k / 4, jitter: 0 }));
      out.roof.push(part(P.cyl(0.18, 0.3, 0.5, 6), 0xa07a3a, { y: top + rh + 0.1 }));
    }
    if (st.snow) out.roof.push(part(P.cone(1, 1, 4), 0xf4f8ff, { ry: Math.PI / 4, sx: (w / 2) * 1.1, sz: (d / 2) * 1.1, sy: rh * 0.55, y: top + rh * 0.72 + 0.1, jitter: 0.02 }));
  }
  // shop extras
  if (o.awning) {
    const cols = o.awning;
    const aw = Math.min(w - 0.6, 4.2), n = 7;
    for (let i = 0; i < n; i++) {
      const s = part(P.box(aw / n, 0.08, 1.5), cols[i % cols.length], { x: -aw / 2 + (i + 0.5) * aw / n, y: y0 + 2.55, z: d / 2 + 0.7, rx: 0.42, jitter: 0 });
      out.roof.push(s);
    }
    for (const sx of [-1, 1]) out.body.push(part(P.cyl(0.05, 0.05, 2.4, 5), st.trim, { x: sx * aw / 2, y: y0 + 1.2, z: d / 2 + 1.35 }));
  }
  if (o.sign) {
    const sx = w / 2 + 0.15;
    out.body.push(part(P.box(0.1, 0.1, 1.0), 0x3a3030, { x: sx - 0.3, y: y0 + 2.35, z: d / 2 + 0.45 }));
    out.body.push(part(P.box(0.08, 0.8, 0.95), o.sign.board ?? 0xf2e2bf, { x: sx - 0.3, y: y0 + 1.85, z: d / 2 + 0.75, jitter: 0 }));
    out.body.push(part(P.box(0.1, 0.86, 1.01), st.trim, { x: sx - 0.33, y: y0 + 1.85, z: d / 2 + 0.75, jitter: 0 }));
    emblem(out.body, o.sign.icon, o.sign.color ?? 0xd9603c, sx - 0.22, y0 + 1.85, d / 2 + 0.75);
  }
  return out;
}

// little icons on shop signs (face +x)
function emblem(arr, icon, c, x, y, z) {
  const add = (g, col, o) => arr.push(part(g, col, { x: x + (o.x || 0), y: y + (o.y || 0), z: z + (o.z || 0), ...o, jitter: 0 }));
  switch (icon) {
    case 'bag': add(P.box(0.08, 0.4, 0.45), c, {}); add(P.torus(0.12, 0.03, 4, 8), c, { y: 0.25, ry: Math.PI / 2 }); break;
    case 'apple': add(P.sphere(0.2, 8, 6), c, { flat: false }); add(P.box(0.03, 0.12, 0.03), 0x3f8a2a, { y: 0.22 }); break;
    case 'anvil': add(P.box(0.1, 0.12, 0.5), c, { y: 0.1 }); add(P.box(0.1, 0.2, 0.2), c, { y: -0.06 }); add(P.box(0.1, 0.06, 0.4), c, { y: -0.18 }); break;
    case 'mug': add(P.cyl(0.14, 0.14, 0.32, 8), c, { rz: 0 }); add(P.torus(0.08, 0.03, 4, 8), c, { z: 0.18, ry: Math.PI / 2 }); break;
    case 'scroll': add(P.box(0.08, 0.36, 0.3), c, {}); add(P.cyl(0.05, 0.05, 0.4, 6), c, { y: 0.2, rx: Math.PI / 2 }); break;
    case 'leaf': add(P.sphere(0.2, 8, 5), c, { flat: false, sz: 0.5, ry: Math.PI / 2 }); break;
    case 'gem': add(P.octa(0.2, 0), c, { sy: 1.3 }); break;
    case 'fish': add(P.sphere(0.18, 8, 5), c, { flat: false, sz: 1.6, sx: 0.4 }); add(P.cone(0.12, 0.2, 4), c, { z: -0.3, rx: Math.PI / 2 }); break;
    case 'star': add(P.octa(0.22, 0), c, { sx: 0.3 }); break;
    default: add(P.sphere(0.18, 8, 6), c, { flat: false });
  }
}

// Round hut (jungle) on stilts
export function hut(o) {
  const st = STYLES.jungle;
  const r = o.r ?? 2.6, H = o.h ?? 2.4, seed = o.seed ?? 1;
  const out = { body: [], roof: [], glow: [], glass: [] };
  const stiltH = o.stilts === false ? 0 : 1.2;
  if (stiltH) {
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; out.body.push(part(P.cyl(0.12, 0.14, stiltH, 6), 0x7a5232, { x: Math.cos(a) * r * 0.95, y: stiltH / 2, z: Math.sin(a) * r * 0.95 })); }
    out.body.push(part(P.cyl(r + 0.7, r + 0.7, 0.2, 12), 0xa07040, { y: stiltH + 0.1 }));
    for (let i = 0; i < 4; i++) out.body.push(part(P.box(1.3, 0.12, 0.4), 0x8a5a36, { y: (i + 0.5) * stiltH / 4, z: r + 0.9 + (3 - i) * 0.4 }));
  }
  const y0 = stiltH + 0.2;
  const wall = o.wall ?? pickFrom(st.walls, seed);
  out.body.push(part(P.cyl(r, r * 1.04, H, 12), wall, { y: y0 + H / 2, jitter: 0.04 }));
  for (let k = 0.35; k < H; k += 0.5) out.body.push(part(P.cyl(r + 0.02, r + 0.02, 0.06, 12, true), 0xa07a3a, { y: y0 + k, jitter: 0 }));
  out.body.push(part(P.box(1.2, 1.9, 0.3), st.trim, { y: y0 + 0.95, z: r - 0.05 }));
  out.body.push(part(P.box(0.95, 1.7, 0.32), 0x5a2a1a, { y: y0 + 0.85, z: r - 0.02 }));
  for (const a of [Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.25, -Math.PI * 0.75]) {
    out.glass.push(part(P.box(0.6, 0.6, 0.2), 0x6d8fae, { x: Math.sin(a) * r, y: y0 + H * 0.6, z: Math.cos(a) * r, ry: a, jitter: 0 }));
    out.body.push(part(P.box(0.78, 0.78, 0.15), st.trim, { x: Math.sin(a) * (r - 0.03), y: y0 + H * 0.6, z: Math.cos(a) * (r - 0.03), ry: a }));
  }
  const roofC = o.roofColor ?? pickFrom(st.roofs, seed);
  const rh = r * 1.15;
  out.roof.push(part(P.cone(r + 0.9, rh, 12), roofC, { y: y0 + H + rh / 2 - 0.1, jitter: 0.05 }));
  for (let k = 1; k < 4; k++) out.roof.push(part(P.cyl((r + 0.9) * (1 - k / 4) + 0.05, (r + 0.9) * (1 - k / 4) + 0.1, 0.1, 12), new THREE.Color(roofC).multiplyScalar(0.85).getHex(), { y: y0 + H + rh * k / 4 - 0.1, jitter: 0 }));
  out.roof.push(part(P.cone(0.25, 0.7, 6), 0xa07a3a, { y: y0 + H + rh + 0.2 }));
  if (o.flag) out.roof.push(part(P.box(0.6, 0.35, 0.03), o.flag, { x: 0.32, y: y0 + H + rh + 0.55, jitter: 0 }));
  for (const sx of [-1, 1]) out.glow.push(part(P.sphere(0.16, 6, 5), 0xffd27a, { ...S, x: sx * 0.85, y: y0 + 1.9, z: r + 0.1 }));
  if (o.sign) emblem(out.body, o.sign.icon, o.sign.color ?? 0xd9603c, 0, y0 + 2.25, r + 0.25);
  return out;
}

// ---------- props ----------
export const PROPS = {
  stall(cols = [0xe0503a, 0xfff2e0], goods = [0xe8433a, 0xf28a2e, 0xffd23a, 0x8fd46a]) {
    const out = { body: [], roof: [], glow: [], glass: [] };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.body.push(part(P.cyl(0.08, 0.08, 2.4, 5), 0x8a5a36, { x: sx * 1.4, y: 1.2, z: sz * 0.9 }));
    out.body.push(part(P.box(3.0, 0.9, 1.1), 0xa87442, { y: 0.45, z: 0.35, jitter: 0.04 }));
    out.body.push(part(P.box(3.1, 0.1, 1.2), 0x7a4a2a, { y: 0.93, z: 0.35 }));
    for (let i = 0; i < 8; i++) out.roof.push(part(P.box(3.2 / 8, 0.08, 2.4), cols[i % 2], { x: -1.6 + (i + 0.5) * 0.4, y: 2.45, rx: 0.12, jitter: 0 }));
    for (let i = 0; i < 4; i++) {
      out.body.push(part(P.box(0.6, 0.3, 0.6), 0xc8925a, { x: -1.05 + i * 0.7, y: 1.12, z: 0.35 }));
      for (let k = 0; k < 4; k++) out.body.push(part(P.sphere(0.12, 6, 5), goods[i % goods.length], { ...S, x: -1.05 + i * 0.7 + (k % 2 - 0.5) * 0.24, y: 1.32, z: 0.35 + (Math.floor(k / 2) - 0.5) * 0.24 }));
    }
    return out;
  },
  fountain(style = 'meadow') {
    const out = { body: [], roof: [], glow: [], glass: [], water: [] };
    const stone = style === 'mountain' ? 0xa8acb8 : style === 'jungle' ? 0xc8a07a : 0xd8cdb8;
    const dark = new THREE.Color(stone).multiplyScalar(0.85).getHex();
    out.body.push(part(P.cyl(3.4, 3.6, 0.25, 18), dark, { y: 0.12, jitter: 0.03 }));
    out.body.push(part(P.torus(3.0, 0.42, 6, 22), stone, { rx: Math.PI / 2, y: 0.55, sy: 1.0, jitter: 0.03 }));
    out.water.push(part(P.cyl(2.85, 2.85, 0.1, 18), 0x5fd8e6, { y: 0.48, jitter: 0 }));
    out.body.push(part(P.cyl(0.42, 0.6, 1.7, 10), stone, { y: 1.2 }));
    out.body.push(part(P.torus(0.95, 0.2, 6, 14), stone, { rx: Math.PI / 2, y: 2.05 }));
    out.water.push(part(P.cyl(0.9, 0.9, 0.08, 14), 0x8aeaf2, { y: 2.08, jitter: 0 }));
    out.body.push(part(P.cyl(0.18, 0.25, 0.7, 8), stone, { y: 2.4 }));
    out.water.push(part(P.sphere(0.3, 10, 8), 0x9af0ff, { ...S, y: 2.85, sy: 1.2 }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; out.water.push(part(P.cone(0.08, 0.9, 5), 0xbff6ff, { x: Math.cos(a) * 0.75, y: 1.7, z: Math.sin(a) * 0.75, rz: Math.cos(a) * 2.6, rx: -Math.sin(a) * 2.6, jitter: 0 })); }
    return out;
  },
  waystone() {
    const out = { body: [], roof: [], glow: [], glass: [], crystal: [] };
    out.body.push(part(P.cyl(1.3, 1.5, 0.35, 8), 0x8f8c88, { y: 0.17 }));
    out.body.push(part(P.cyl(0.55, 0.7, 2.8, 6), 0xb8b2a6, { y: 1.75, jitter: 0.05 }));
    for (let i = 0; i < 3; i++) out.body.push(part(P.box(0.62, 0.08, 0.1), 0x5ac8d8, { y: 1.0 + i * 0.6, z: 0.58, jitter: 0 }));
    out.crystal.push(part(P.octa(0.55, 0), 0x7ae6ff, { y: 3.75, sy: 1.5, jitter: 0.08 }));
    return out;
  },
  board() {
    const out = { body: [], roof: [], glow: [], glass: [] };
    for (const sx of [-1, 1]) out.body.push(part(P.box(0.18, 2.2, 0.18), 0x7a4a2a, { x: sx * 1.1, y: 1.1 }));
    out.body.push(part(P.box(2.4, 1.4, 0.14), 0xa87442, { y: 1.45, jitter: 0.03 }));
    out.roof.push(part(P.box(2.7, 0.12, 0.6), 0x8a5a36, { y: 2.25, rx: 0.2 }));
    const notes = [0xfff6e0, 0xffe0a0, 0xd8f0ff, 0xffd8e0];
    for (let i = 0; i < 5; i++) out.body.push(part(P.box(0.42, 0.5, 0.04), notes[i % 4], { x: -0.8 + i * 0.4, y: 1.45 + (i % 2) * 0.25 - 0.1, z: 0.09, rz: (i - 2) * 0.08, jitter: 0 }));
    return out;
  },
  lamp() {
    const out = { body: [], roof: [], glow: [], glass: [] };
    out.body.push(part(P.cyl(0.08, 0.12, 3.0, 6), 0x3a3434, { y: 1.5 }));
    out.body.push(part(P.box(0.5, 0.08, 0.08), 0x3a3434, { x: 0.2, y: 2.95 }));
    out.glow.push(part(P.box(0.32, 0.4, 0.32), 0xffe6a8, { x: 0.42, y: 2.65, jitter: 0 }));
    out.body.push(part(P.cone(0.3, 0.22, 4), 0x3a3434, { x: 0.42, y: 2.95, ry: Math.PI / 4 }));
    return out;
  },
  bench() {
    const out = { body: [], roof: [], glow: [], glass: [] };
    out.body.push(part(P.box(1.8, 0.1, 0.5), 0xa87442, { y: 0.5 }));
    out.body.push(part(P.box(1.8, 0.45, 0.08), 0xa87442, { y: 0.8, z: -0.24, rx: -0.15 }));
    for (const sx of [-1, 1]) out.body.push(part(P.box(0.1, 0.5, 0.45), 0x3a3434, { x: sx * 0.75, y: 0.25 }));
    return out;
  },
  flowerbed(cols = [0xff6a8a, 0xffd23a, 0xffffff, 0xb07af0]) {
    const out = { body: [], roof: [], glow: [], glass: [] };
    out.body.push(part(P.box(2.2, 0.35, 1.0), 0x9a7a5a, { y: 0.17 }));
    out.body.push(part(P.box(2.0, 0.08, 0.8), 0x5a3a24, { y: 0.36, jitter: 0 }));
    for (let i = 0; i < 9; i++) {
      out.body.push(part(P.cone(0.14, 0.4, 4), 0x4f9a3a, { x: -0.8 + (i % 5) * 0.4, y: 0.55, z: (Math.floor(i / 5) - 0.5) * 0.35 }));
      out.body.push(part(P.ico(0.12, 0), cols[i % cols.length], { x: -0.8 + (i % 5) * 0.4, y: 0.78, z: (Math.floor(i / 5) - 0.5) * 0.35, jitter: 0 }));
    }
    return out;
  },
  well() {
    const out = { body: [], roof: [], glow: [], glass: [] };
    out.body.push(part(P.cyl(1.0, 1.05, 0.9, 10), 0xb8ad9a, { y: 0.45, jitter: 0.05 }));
    out.glass.push(part(P.cyl(0.8, 0.8, 0.05, 10), 0x2a5a7a, { y: 0.75, jitter: 0 }));
    for (const sx of [-1, 1]) out.body.push(part(P.box(0.14, 1.8, 0.14), 0x7a4a2a, { x: sx * 0.9, y: 1.5 }));
    out.roof.push(part(P.prism(2.4, 0.8, 1.6), 0xd9603c, { y: 2.3 }));
    out.body.push(part(P.cyl(0.08, 0.08, 1.8, 6), 0x7a4a2a, { y: 2.1, rz: Math.PI / 2 }));
    return out;
  },
  anvil() {
    const out = { body: [], roof: [], glow: [], glass: [] };
    out.body.push(part(P.cyl(0.4, 0.5, 0.6, 8), 0x7a5232, { y: 0.3 }));
    out.body.push(part(P.box(0.4, 0.3, 0.35), 0x4a4a52, { y: 0.75 }));
    out.body.push(part(P.box(1.0, 0.22, 0.45), 0x5a5a64, { y: 0.98, x: 0.1 }));
    out.body.push(part(P.cone(0.18, 0.4, 4), 0x5a5a64, { x: 0.75, y: 0.98, rz: -Math.PI / 2, sz: 0.8 }));
    return out;
  },
  crates() {
    const out = { body: [], roof: [], glow: [], glass: [] };
    out.body.push(part(P.box(0.9, 0.8, 0.9), 0xb07a48, { y: 0.4, jitter: 0.04 }));
    out.body.push(part(P.box(0.7, 0.6, 0.7), 0xa06a3a, { x: 0.9, y: 0.3, ry: 0.3, jitter: 0.04 }));
    out.body.push(part(P.box(0.7, 0.6, 0.7), 0xc08a58, { x: 0.3, y: 1.1, ry: 0.6, jitter: 0.04 }));
    out.body.push(part(P.cyl(0.4, 0.4, 0.9, 10), 0x9a6a3a, { x: -0.9, y: 0.45 }));
    return out;
  },
  totem() {
    const out = { body: [], roof: [], glow: [], glass: [] };
    const cols = [0xc8783a, 0x2fa6a0, 0xe0c070, 0xd9603c];
    for (let i = 0; i < 4; i++) {
      out.body.push(part(P.box(0.8, 0.75, 0.8), cols[i], { y: 0.4 + i * 0.75, jitter: 0.03 }));
      out.body.push(part(P.box(0.15, 0.15, 0.05), 0x1a1a1a, { x: 0.18, y: 0.5 + i * 0.75, z: 0.42 }));
      out.body.push(part(P.box(0.15, 0.15, 0.05), 0x1a1a1a, { x: -0.18, y: 0.5 + i * 0.75, z: 0.42 }));
    }
    out.body.push(part(P.box(2.0, 0.2, 0.3), 0xe0c070, { y: 2.6 }));
    return out;
  },
  snowman() {
    const out = { body: [], roof: [], glow: [], glass: [] };
    out.body.push(part(P.sphere(0.7, 10, 8), 0xf6f9ff, { ...S, y: 0.6 }));
    out.body.push(part(P.sphere(0.5, 10, 8), 0xf6f9ff, { ...S, y: 1.55 }));
    out.body.push(part(P.sphere(0.36, 10, 8), 0xf6f9ff, { ...S, y: 2.25 }));
    out.body.push(part(P.cone(0.07, 0.35, 6), 0xf28a2e, { y: 2.25, z: 0.45, rx: Math.PI / 2 }));
    out.body.push(part(P.cyl(0.3, 0.3, 0.4, 8), 0x2a2a2a, { y: 2.68 }));
    out.body.push(part(P.torus(0.42, 0.08, 6, 12), 0xd9443a, { y: 1.95, rx: Math.PI / 2 }));
    return out;
  },
  mushlamp() {
    const out = { body: [], roof: [], glow: [], glass: [] };
    out.body.push(part(P.cyl(0.14, 0.2, 1.6, 8), 0xf2e6cf, { ...S, y: 0.8 }));
    out.glow.push(part(new THREE.SphereGeometry(0.75, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x5ad6c8, { ...S, y: 1.5, sy: 0.6 }));
    return out;
  },
  banner(c = 0xd9603c) {
    const out = { body: [], roof: [], glow: [], glass: [], cloth: [] };
    out.body.push(part(P.cyl(0.07, 0.09, 4.2, 6), 0x7a4a2a, { y: 2.1 }));
    out.body.push(part(P.sphere(0.13, 6, 5), 0xf2c94c, { ...S, y: 4.25 }));
    out.cloth.push(part(P.box(0.06, 1.6, 1.0), c, { y: 3.1, z: 0.55, jitter: 0 }));
    return out;
  },
  dock(len = 18, w = 3.2) {
    const out = { body: [], roof: [], glow: [], glass: [] };
    out.body.push(part(P.box(w, 0.25, len), 0xb88a56, { y: 0, z: len / 2, jitter: 0.04 }));
    for (let k = 0; k < len; k += 1.0) out.body.push(part(P.box(w + 0.02, 0.27, 0.06), 0x8a5a36, { z: k + 0.5, jitter: 0 }));
    for (let k = 0; k <= len; k += 4) for (const sx of [-1, 1]) out.body.push(part(P.cyl(0.18, 0.18, 3.2, 6), 0x7a5232, { x: sx * (w / 2 + 0.05), y: -1.0, z: Math.min(len - 0.2, k + 0.2) }));
    return out;
  },
  boat(broken = false) {
    const out = { body: [], roof: [], glow: [], glass: [] };
    const hull = broken ? 0x8a6a4a : 0xb8763a;
    out.body.push(part(P.box(2.4, 0.9, 6.0), hull, { y: 0.25, jitter: 0.04 }));
    out.body.push(part(P.cone(1.2, 1.8, 4), hull, { y: 0.25, z: 3.8, rx: Math.PI / 2, ry: Math.PI / 4, sx: 1.4, sz: 0.62 }));
    out.body.push(part(P.box(2.0, 0.12, 5.6), 0xd8b47a, { y: 0.66, jitter: 0 }));
    out.body.push(part(P.box(2.5, 0.12, 6.1), 0xf2f2ea, { y: 0.2, jitter: 0 }));
    out.body.push(part(P.cyl(0.1, 0.12, broken ? 2.0 : 5.0, 6), 0x7a5232, { y: broken ? 1.6 : 3.1, z: 0.4, rz: broken ? 0.4 : 0 }));
    if (!broken) {
      out.roof.push(part(P.box(0.06, 3.2, 2.6), 0xfff6e8, { y: 3.3, z: 0.4 - 1.35, jitter: 0 }));
      out.roof.push(part(P.box(0.07, 0.4, 2.6), 0xd9603c, { y: 4.8, z: 0.4 - 1.35, jitter: 0 }));
    } else {
      out.body.push(part(P.box(0.8, 0.2, 1.2), 0x5a4a3a, { x: 0.6, y: 0.75, z: -1.5, ry: 0.5 }));
    }
    return out;
  },
  greatTemple() {
    const out = { body: [], roof: [], glow: [], glass: [], crystal: [] };
    const stone = 0xd8c8a6, dark = 0xb8a684, gold = 0xe8b84a;
    out.body.push(part(P.box(16, 1.2, 14), dark, { y: 0.6, jitter: 0.04 }));
    out.body.push(part(P.box(13, 1.2, 11.5), stone, { y: 1.8, jitter: 0.04 }));
    out.body.push(part(P.box(10, 5.5, 9), stone, { y: 5.1, jitter: 0.04 }));
    out.roof.push(part(P.cone(1, 1, 4), dark, { y: 10.2, ry: Math.PI / 4, sx: 8.5, sz: 7.8, sy: 4.2, jitter: 0.04 }));
    out.roof.push(part(P.octa(0.9, 0), 0x9fe8ff, { y: 12.9, sy: 1.6 }));
    for (let i = -2; i <= 2; i++) {
      out.body.push(part(P.cyl(0.42, 0.48, 5.4, 8), 0xeee2c8, { x: i * 2.1, y: 5.1, z: 4.8 }));
      out.body.push(part(P.box(1.1, 0.3, 1.1), dark, { x: i * 2.1, y: 7.9, z: 4.8 }));
    }
    out.body.push(part(P.box(11, 0.6, 1.6), dark, { y: 8.2, z: 4.8 }));
    for (let k = 0; k < 5; k++) out.body.push(part(P.box(5, 0.4, 0.9), dark, { y: 0.2 + k * 0.4, z: 7.4 - k * 0.55 }));
    out.body.push(part(P.box(3.2, 4.2, 0.4), 0x6a5a48, { y: 4.6, z: 4.52 }));
    out.body.push(part(P.box(3.6, 4.6, 0.3), gold, { y: 4.7, z: 4.45 }));
    // four key sockets
    const socket = [0xffd27a, 0x6ff08a, 0x9fe4ff, 0xff7a4a];
    for (let i = 0; i < 4; i++) out.crystal.push(part(P.octa(0.28, 0), socket[i], { x: -1.2 + i * 0.8, y: 7.3, z: 4.75 }));
    for (const sx of [-1, 1]) {
      out.body.push(part(P.box(1.2, 2.2, 1.2), stone, { x: sx * 3.6, y: 2.9, z: 7.6 }));
      out.glow.push(part(P.cone(0.5, 0.8, 6), 0xffb02a, { x: sx * 3.6, y: 4.4, z: 7.6, jitter: 0 }));
    }
    for (let i = 0; i < 6; i++) out.roof.push(jiggle(part(P.ico(0.6, 0), 0x6aa848, { x: (i - 2.5) * 2.3, y: 2.45, z: -5.6 + (i % 2) * 11.3, sy: 0.35 }), 0.1, i));
    return out;
  },
};
