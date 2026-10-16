// Static + dynamic colliders in a spatial hash. Circles and oriented boxes.
import { clamp } from '../core/game.js';

export class Colliders {
  constructor(cell = 8) {
    this.cell = cell;
    this.map = new Map();
  }
  _key(i, j) { return (i + 4096) * 8192 + (j + 4096); }
  _cells(c, fn) {
    const r = c.type === 'c' ? c.r : Math.hypot(c.hw, c.hd);
    const i0 = Math.floor((c.x - r) / this.cell), i1 = Math.floor((c.x + r) / this.cell);
    const j0 = Math.floor((c.z - r) / this.cell), j1 = Math.floor((c.z + r) / this.cell);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) fn(this._key(i, j));
  }
  _insert(c) {
    this._cells(c, (k) => { let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); } a.push(c); });
    return c;
  }
  addCircle(x, z, r, data = null) { return this._insert({ type: 'c', x, z, r, active: true, data }); }
  addBox(x, z, hw, hd, rot = 0, data = null) {
    return this._insert({ type: 'b', x, z, hw, hd, rot, c: Math.cos(rot), s: Math.sin(rot), active: true, data });
  }
  move(c, x, z) {
    this.remove(c);
    c.x = x; c.z = z;
    this._insert(c);
  }
  remove(c) {
    if (!c) return;
    this._cells(c, (k) => { const a = this.map.get(k); if (a) { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); } });
  }
  query(x, z, r, fn) {
    const i0 = Math.floor((x - r) / this.cell), i1 = Math.floor((x + r) / this.cell);
    const j0 = Math.floor((z - r) / this.cell), j1 = Math.floor((z + r) / this.cell);
    const seen = new Set();
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const a = this.map.get(this._key(i, j));
      if (!a) continue;
      for (const c of a) { if (!c.active || seen.has(c)) continue; seen.add(c); fn(c); }
    }
  }
  // Push a circle (x,z,r) out of every collider it overlaps.
  resolve(x, z, r) {
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      this.query(x, z, r + 1, (c) => {
        if (c.type === 'c') {
          const dx = x - c.x, dz = z - c.z;
          const d2 = dx * dx + dz * dz, R = r + c.r;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 0.0001;
            const push = R - d;
            x += (dx / d) * push; z += (dz / d) * push;
            moved = hit = true;
          }
        } else {
          const dx = x - c.x, dz = z - c.z;
          const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
          const cx = clamp(lx, -c.hw, c.hw), cz = clamp(lz, -c.hd, c.hd);
          let ox = lx - cx, oz = lz - cz;
          let d2 = ox * ox + oz * oz;
          let nlx = lx, nlz = lz;
          if (d2 > 1e-8) {
            if (d2 < r * r) {
              const d = Math.sqrt(d2);
              nlx = cx + (ox / d) * r; nlz = cz + (oz / d) * r;
            } else return;
          } else {
            // centre inside the box: push out along the shallowest axis
            const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
            if (px < pz) nlx = Math.sign(lx || 1) * (c.hw + r); else nlz = Math.sign(lz || 1) * (c.hd + r);
          }
          x = c.x + nlx * c.c + nlz * c.s;
          z = c.z - nlx * c.s + nlz * c.c;
          moved = hit = true;
        }
      });
      if (!moved) break;
    }
    return { x, z, hit };
  }
  // true if a circle overlaps any collider (used for placement checks)
  overlaps(x, z, r, ignore = null) {
    let res = false;
    this.query(x, z, r + 1, (c) => {
      if (res || c === ignore) return;
      if (c.type === 'c') { if ((x - c.x) ** 2 + (z - c.z) ** 2 < (r + c.r) ** 2) res = true; }
      else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
        const cx = clamp(lx, -c.hw, c.hw), cz = clamp(lz, -c.hd, c.hd);
        if ((lx - cx) ** 2 + (lz - cz) ** 2 < r * r) res = true;
      }
    });
    return res;
  }
}
