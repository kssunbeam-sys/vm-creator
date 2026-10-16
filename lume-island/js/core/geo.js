// Geometry helpers for the low-poly look: colour primitives per face, transform
// them, and merge many parts into one BufferGeometry with vertex colours.
import * as THREE from '../three.js';
import { hash2 } from './rng.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export function color(hex) { return new THREE.Color(hex); }

// Displace vertices by a hash of their rest position, so duplicated vertices
// (non-indexed polyhedra) move together and the surface stays closed.
export function jiggle(geom, amt = 0.1, seed = 1, axes = [1, 1, 1]) {
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const kx = Math.round(x * 997), ky = Math.round(y * 991), kz = Math.round(z * 983);
    const h1 = hash2(kx + kz * 7, ky, seed), h2 = hash2(ky + kx * 3, kz, seed + 11), h3 = hash2(kz + ky * 5, kx, seed + 23);
    pos.setXYZ(i, x + (h1 - 0.5) * 2 * amt * axes[0], y + (h2 - 0.5) * 2 * amt * axes[1], z + (h3 - 0.5) * 2 * amt * axes[2]);
  }
  pos.needsUpdate = true;
  return geom;
}

// Build a coloured, transformed, non-indexed part.
// o: {x,y,z, rx,ry,rz, s, sx,sy,sz, jitter, flat, seed, colors:[per-face fn]}
export function part(geom, hex, o = {}) {
  let g = geom.index ? geom.toNonIndexed() : geom.clone();
  g.deleteAttribute('uv');
  if (g.attributes.uv1) g.deleteAttribute('uv1');
  const s = o.s ?? 1;
  _p.set(o.x || 0, o.y || 0, o.z || 0);
  _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
  _q.setFromEuler(_e);
  _s.set((o.sx ?? 1) * s, (o.sy ?? 1) * s, (o.sz ?? 1) * s);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  if (o.flat !== false) g.computeVertexNormals();
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const base = _c.set(hex);
  const jitter = o.jitter ?? 0.06;
  const seed = o.seed ?? 7;
  const br = base.r, bg = base.g, bb = base.b;
  for (let f = 0; f < n / 3; f++) {
    let k = 1 + (hash2(f, seed, 31) - 0.5) * 2 * jitter;
    let r = br * k, gg = bg * k, b = bb * k;
    if (o.faceColor) { const c = o.faceColor(f, g); if (c) { r = c.r; gg = c.g; b = c.b; } }
    for (let v = 0; v < 3; v++) { const i = (f * 3 + v) * 3; col[i] = r; col[i + 1] = gg; col[i + 2] = b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// Vertical gradient colour (for trunks, cliffs...). Applied after part().
export function gradientY(g, hexBottom, hexTop, y0, y1) {
  const a = new THREE.Color(hexBottom), b = new THREE.Color(hexTop);
  const pos = g.attributes.position, col = g.attributes.color;
  for (let f = 0; f < pos.count / 3; f++) {
    const y = (pos.getY(f * 3) + pos.getY(f * 3 + 1) + pos.getY(f * 3 + 2)) / 3;
    const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
    const k = 0.94 + hash2(f, 3, 9) * 0.12;
    for (let v = 0; v < 3; v++) {
      const i = f * 3 + v;
      col.setXYZ(i, (a.r + (b.r - a.r) * t) * k, (a.g + (b.g - a.g) * t) * k, (a.b + (b.b - a.b) * t) * k);
    }
  }
  col.needsUpdate = true;
  return g;
}

export function merge(parts) {
  let n = 0;
  for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array, o);
    nor.set(p.attributes.normal.array, o);
    col.set(p.attributes.color.array, o);
    o += p.attributes.position.count * 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

// Re-transform an already built (merged) geometry copy.
export function transformed(g, o = {}) {
  const c = g.clone();
  const s = o.s ?? 1;
  _p.set(o.x || 0, o.y || 0, o.z || 0);
  _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
  _q.setFromEuler(_e);
  _s.set((o.sx ?? 1) * s, (o.sy ?? 1) * s, (o.sz ?? 1) * s);
  _m.compose(_p, _q, _s);
  c.applyMatrix4(_m);
  return c;
}

// Tint all vertex colours of a geometry copy.
export function tinted(g, hex, amount = 1) {
  const c = g.clone();
  const t = new THREE.Color(hex);
  const col = c.attributes.color;
  for (let i = 0; i < col.count; i++) {
    col.setXYZ(i, col.getX(i) + (t.r - col.getX(i)) * amount, col.getY(i) + (t.g - col.getY(i)) * amount, col.getZ(i) + (t.b - col.getZ(i)) * amount);
  }
  return c;
}

// Common primitives (unit-ish sizes; scale with part options)
export const P = {
  box: (w = 1, h = 1, d = 1) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt = 0.5, rb = 0.5, h = 1, seg = 8, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  cone: (r = 0.5, h = 1, seg = 8) => new THREE.ConeGeometry(r, h, seg),
  sphere: (r = 0.5, w = 10, h = 7) => new THREE.SphereGeometry(r, w, h),
  ico: (r = 0.5, d = 0) => new THREE.IcosahedronGeometry(r, d),
  dodeca: (r = 0.5, d = 0) => new THREE.DodecahedronGeometry(r, d),
  octa: (r = 0.5, d = 0) => new THREE.OctahedronGeometry(r, d),
  tetra: (r = 0.5) => new THREE.TetrahedronGeometry(r),
  torus: (r = 0.5, t = 0.15, rs = 6, ts = 10, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  // Gable roof prism: width along x, depth along z, ridge height h, centred at base
  prism: (w = 1, h = 1, d = 1) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  },
  // Flat polygon disc on the ground (y up)
  disc: (r = 1, seg = 12) => { const g = new THREE.CircleGeometry(r, seg); g.rotateX(-Math.PI / 2); return g; },
  plane: (w = 1, d = 1) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); return g; },
  capsule: (r = 0.3, l = 0.6, cs = 3, rs = 8) => new THREE.CapsuleGeometry(r, l, cs, rs),
};
