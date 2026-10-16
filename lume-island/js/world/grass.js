// Grass tufts and tiny wildflowers scattered around the player in chunks.
import * as THREE from '../three.js';
import { hash2 } from '../core/rng.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from './materials.js';
import { HALF, CELL, VN, N, REG } from './terrain.js';

const CH = 24;
function tuftGeo(blades = 5, h = 0.5, w = 0.07) {
  const parts = [];
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + i * 0.7;
    const r = 0.06 + (i % 3) * 0.05;
    const hh = h * (0.7 + ((i * 37) % 10) / 22);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array([-w, 0, 0, w, 0, 0, 0, hh, 0]);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = part(g, 0xffffff, { x: Math.cos(a) * r, z: Math.sin(a) * r, ry: a + 1.2, rx: Math.cos(a) * 0.25, rz: Math.sin(a) * 0.25, jitter: 0, flat: true });
    // darker at the root
    const col = p.attributes.color;
    col.setXYZ(0, 0.62, 0.62, 0.62); col.setXYZ(1, 0.62, 0.62, 0.62); col.setXYZ(2, 1.08, 1.08, 1.08);
    // normals pointing up for soft, even lighting
    const nor = p.attributes.normal;
    for (let k = 0; k < 3; k++) nor.setXYZ(k, 0, 1, 0);
    parts.push(p);
  }
  return merge(parts);
}
function flowerGeo(petal, center) {
  const parts = [];
  for (let k = 0; k < 3; k++) {
    const ox = Math.cos(k * 2.1) * 0.12, oz = Math.sin(k * 2.1) * 0.12, h = 0.26 + k * 0.06;
    parts.push(part(P.cyl(0.012, 0.012, h, 3), 0x5a9a3a, { x: ox, y: h / 2, z: oz, jitter: 0 }));
    parts.push(part(P.ico(0.06, 0), petal, { x: ox, y: h, z: oz, sy: 0.55, jitter: 0.05 }));
    parts.push(part(P.ico(0.025, 0), center, { x: ox, y: h + 0.025, z: oz, jitter: 0 }));
  }
  return merge(parts);
}

export class Grass {
  constructor(terrain, scene, density = 1) {
    this.T = terrain;
    this.scene = scene;
    this.density = density;
    this.chunks = new Map();
    this.geo = { tuft: tuftGeo(5, 0.5), tall: tuftGeo(7, 0.85, 0.06) };
    this.flowers = [
      flowerGeo(0xffffff, 0xffd43b), flowerGeo(0xffd84a, 0xf28a1e), flowerGeo(0xff8fc0, 0xffffff),
      flowerGeo(0x8fa8ff, 0xffffff), flowerGeo(0xff7a4a, 0xffe066),
    ];
    this.radius = 54;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
    this.lastX = 1e9; this.lastZ = 1e9;
  }
  colorAt(x, z, out) {
    const T = this.T;
    const i = Math.min(N, Math.max(0, Math.round((x + HALF) / CELL))), j = Math.min(N, Math.max(0, Math.round((z + HALF) / CELL)));
    const k = (j * VN + i) * 3;
    return out.setRGB(T.VC[k], T.VC[k + 1], T.VC[k + 2]);
  }
  build(ci, cj) {
    const T = this.T;
    const x0 = ci * CH, z0 = cj * CH;
    const tufts = [], flowers = [[], [], [], [], []];
    const n = Math.floor(330 * this.density);
    const c = this._c;
    for (let k = 0; k < n; k++) {
      const x = x0 + hash2(ci * 977 + k, cj, 1) * CH, z = z0 + hash2(ci, cj * 991 + k, 2) * CH;
      const h = T.groundAt(x, z);
      if (h < 1.0) continue;
      this.colorAt(x, z, c);
      const green = c.g - Math.max(c.r, c.b);
      if (green < 0.05) continue;
      if (T.surfaceAt(x, z)) continue;
      const reg = T.regionIdAt(x, z);
      const r = hash2(k, ci * 31 + cj, 3);
      const flowerChance = reg === REG.MEADOW ? 0.09 : reg === REG.FOREST ? 0.03 : reg === REG.JUNGLE ? 0.04 : 0.025;
      if (r < flowerChance) {
        let v = reg === REG.MEADOW ? Math.floor(hash2(k, 5, ci) * 3) : reg === REG.FOREST ? 3 : reg === REG.JUNGLE ? 4 : 0;
        flowers[v].push([x, h, z, hash2(k, 6, cj) * 6.28, 0.8 + hash2(k, 7, ci) * 0.5]);
      } else {
        const tall = reg === REG.JUNGLE ? 0.35 : reg === REG.FOREST ? 0.15 : 0.06;
        tufts.push([x, h, z, hash2(k, 8, ci) * 6.28, 0.75 + hash2(k, 9, cj) * 0.6, c.r * 1.12, c.g * 1.12, c.b * 1.05, hash2(k, 10, ci) < tall]);
      }
    }
    const group = new THREE.Group();
    const mk = (geo, list, colored) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, MAT.grass, list.length);
      im.frustumCulled = false;
      im.receiveShadow = true;
      list.forEach((t, i) => {
        this._p.set(t[0], t[1] - 0.02, t[2]); this._e.set(0, t[3], 0); this._q.setFromEuler(this._e); this._s.setScalar(t[4]);
        im.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
        if (colored) im.setColorAt(i, this._c.setRGB(t[5], t[6], t[7]));
      });
      group.add(im);
    };
    mk(this.geo.tuft, tufts.filter((t) => !t[8]), true);
    mk(this.geo.tall, tufts.filter((t) => t[8]), true);
    this.flowers.forEach((g, i) => mk(g, flowers[i], false));
    this.scene.add(group);
    return group;
  }
  update(px, pz) {
    if (Math.abs(px - this.lastX) < 4 && Math.abs(pz - this.lastZ) < 4) return;
    this.lastX = px; this.lastZ = pz;
    const R = this.radius;
    const need = new Set();
    const i0 = Math.floor((px - R) / CH), i1 = Math.floor((px + R) / CH);
    const j0 = Math.floor((pz - R) / CH), j1 = Math.floor((pz + R) / CH);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const cx = (i + 0.5) * CH, cz = (j + 0.5) * CH;
      if ((cx - px) ** 2 + (cz - pz) ** 2 > (R + CH * 0.7) ** 2) continue;
      const k = i * 10000 + j;
      need.add(k);
      if (!this.chunks.has(k)) this.chunks.set(k, this.build(i, j));
    }
    for (const [k, g] of this.chunks) {
      if (need.has(k)) continue;
      this.scene.remove(g);
      g.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      this.chunks.delete(k);
    }
  }
}
