// Island heightmap: regions, cliffs, river, coasts, paths and plazas,
// chunked low-poly terrain meshes and walkability.
import * as THREE from '../three.js';
import { Noise2D, hash2 } from '../core/rng.js';
import { clamp, lerp, smoothstep } from '../core/game.js';
import { ISLAND_BLOBS, CITIES, HOMESTEAD, BRIDGE, LIFT, VOLCANO, DOCKS, SITES, PATHS, BIOME_BY_ID, LAKES } from '../data/layout.js';

export const HALF = 360, CELL = 2, N = 360, VN = N + 1, CHUNK = 30;
export const REG = { OCEAN: 0, MEADOW: 1, FOREST: 2, MOUNTAIN: 3, JUNGLE: 4 };

const C = (hex) => new THREE.Color(hex);
const PAL = [
  null,
  { g1: C(0x8ccf57), g2: C(0xb4dc66), rock: C(0xb3a48d), sand: C(0xf3df9e), path: C(0xdcbd8a), cliff: C(0xc1b096) },
  { g1: C(0x4c9a41), g2: C(0x6aae4a), rock: C(0x8e8874), sand: C(0xdcc68b), path: C(0xbd9d6b), cliff: C(0x968d78) },
  { g1: C(0x8db96b), g2: C(0xadc985), rock: C(0x9a9daa), sand: C(0xbdb6a8), path: C(0xd6cfc2), cliff: C(0x8f93a1), snow: C(0xf3f7fc) },
  { g1: C(0x2fab52), g2: C(0x58c25c), rock: C(0x80695a), sand: C(0xf6e3a4), path: C(0xcda372), cliff: C(0x86705f), ash: C(0x5b4a45) },
];
const UNDER = C(0xe3cd8f), LAKEBED = C(0xb9b6a2), DEEP = C(0x7f7a5d), PLAZA = C(0xb4a68e), HOMEPLOT = C(0xc9b07c);

export class Terrain {
  constructor(seed = 1337) {
    this.nA = new Noise2D(seed);
    this.nB = new Noise2D(seed + 7);
    this.nC = new Noise2D(seed + 13);
    this.nD = new Noise2D(seed + 29);
    this.H = new Float32Array(VN * VN);
    this.RV = new Uint8Array(VN * VN);
    this.PW = new Float32Array(VN * VN);
    this.PZ = new Float32Array(VN * VN);
    this.VC = new Float32Array(VN * VN * 3);
    this.walk = new Uint8Array(N * N);
    this.cellReg = new Uint8Array(N * N);
    this.surfaces = [];   // walkable decks: {minX,maxX,minZ,maxZ,h,active()}
    this.blockers = [];   // unwalkable rects: {minX,maxX,minZ,maxZ,active()}
    this.segments = [];
    for (const p of PATHS) {
      const w = p[0];
      for (let k = 1; k < p.length - 1; k++) {
        const a = p[k], b = p[k + 1];
        this.segments.push({ ax: a[0], az: a[1], bx: b[0], bz: b[1], w,
          minX: Math.min(a[0], b[0]) - w - 3, maxX: Math.max(a[0], b[0]) + w + 3,
          minZ: Math.min(a[1], b[1]) - w - 3, maxZ: Math.max(a[1], b[1]) + w + 3 });
      }
    }
    this.zones = [];
    this.buildZones();
    this.lakes = LAKES.map((L) => {
      let lo = Infinity;
      for (let a = 0; a < 16; a++) lo = Math.min(lo, this.height(L.x + Math.cos(a / 8 * Math.PI) * (L.r + 5), L.z + Math.sin(a / 8 * Math.PI) * (L.r + 5)));
      return { ...L, h: lo - 0.3 };
    });
    this.generate();
  }

  // Alpine lake basins: a gravel rim around a bowl that holds water at L.h
  lakeHeight(x, z, h) {
    for (const L of this.lakes) {
      const dx = x - L.x, dz = z - L.z;
      if (dx * dx + dz * dz > (L.r + 11) ** 2) continue;
      const d = Math.sqrt(dx * dx + dz * dz) + this.nD.noise(x * 0.16, z * 0.16) * 1.4;
      const target = L.h + 0.42 + 0.25 * smoothstep(L.r, L.r + 5, d) - 0.8 * smoothstep(L.r, L.r - 2.2, d) - 2.8 * smoothstep(L.r * 0.92, L.r * 0.25, d);
      h = lerp(h, target, smoothstep(L.r + 10, L.r + 3, d));
    }
    return h;
  }
  lakeAt(x, z, pad = 0) {
    for (const L of this.lakes) if ((x - L.x) ** 2 + (z - L.z) ** 2 < (L.r + pad) ** 2) return L;
    return null;
  }
  // water surface height at (x,z): sea level, or a lake's level inside its basin
  waterLevelAt(x, z) { const L = this.lakeAt(x, z, 2.5); return L ? L.h : 0; }
  // {y, depth, lake} if there is water at (x,z)
  waterAt(x, z) {
    const wl = this.waterLevelAt(x, z);
    const g = this.groundAt(x, z);
    if (g > wl - 0.22) return null;
    return { y: wl, depth: wl - g, lake: wl !== 0 ? this.lakeAt(x, z, 2.5) : null };
  }

  // ---------- analytic shape ----------
  cliffZ(x) { return -95 + 7 * this.nA.noise(x * 0.012, 3.1) + 2.5 * this.nB.noise(x * 0.05, 1.7); }
  riverX(z) { return -40 + 12 * Math.sin((z + 95) * 0.021) + 5 * this.nC.noise(z * 0.012, 5.3); }

  landField(x, z) {
    let main = -9, jungle = -9;
    for (const b of ISLAND_BLOBS) {
      const dx = (x - b.x) / b.rx, dz = (z - b.z) / b.rz;
      const v = 1 - Math.sqrt(dx * dx + dz * dz);
      if (b.part === 'jungle') jungle = Math.max(jungle, v); else main = Math.max(main, v);
    }
    const n = 0.1 * this.nA.fbm(x * 0.011, z * 0.011, 3) + 0.035 * this.nB.noise(x * 0.045, z * 0.045);
    return { main: main + n, jungle: jungle + n };
  }

  regionAt(x, z) {
    const lf = this.landField(x, z);
    if (lf.jungle > lf.main) return REG.JUNGLE;
    if (z < this.cliffZ(x)) return REG.MOUNTAIN;
    if (x < this.riverX(z)) return REG.FOREST;
    return REG.MEADOW;
  }

  // Returns the narrow (colour) weight; this._pwWide holds the wide weight
  // used to smooth the terrain along roads so they stay walkable.
  pathWeight(x, z) {
    let best = 0, wide = 0;
    for (const s of this.segments) {
      if (x < s.minX - 8 || x > s.maxX + 8 || z < s.minZ - 8 || z > s.maxZ + 8) continue;
      const dx = s.bx - s.ax, dz = s.bz - s.az;
      const L = dx * dx + dz * dz;
      let t = L > 0 ? ((x - s.ax) * dx + (z - s.az) * dz) / L : 0;
      t = clamp(t, 0, 1);
      const px = s.ax + dx * t - x, pz = s.az + dz * t - z;
      const d0 = Math.sqrt(px * px + pz * pz);
      const d = d0 + this.nB.noise(x * 0.3, z * 0.3) * 0.35;
      const w = 1 - smoothstep(s.w * 0.5, s.w * 0.5 + 1.2, d);
      if (w > best) best = w;
      const ww = 1 - smoothstep(s.w * 0.5 + 1, s.w * 0.5 + 11, d0);
      if (ww > wide) wide = ww;
    }
    this._pwWide = wide;
    return best;
  }

  meadowH(x, z, pw) {
    return 2.4 + 1.8 * this.nA.fbm(x * 0.008, z * 0.008, 4) + 0.55 * this.nB.noise(x * 0.03, z * 0.03) * (1 - pw * 0.85);
  }
  forestH(x, z, pw) {
    return 2.9 + 2.5 * this.nC.fbm(x * 0.0095, z * 0.0095, 4) + 0.75 * this.nA.noise(x * 0.035, z * 0.035) * (1 - pw * 0.85);
  }
  mountainH(x, z, pw) {
    const pk = Math.max(0, this.nC.noise(x * 0.011 + 5, z * 0.011 - 3) - 0.25);
    const peaks = 22 * Math.pow(pk, 1.4);
    const detail = 8 * this.nB.ridged(x * 0.0065, z * 0.0065, 4) - 3 + 2.5 * this.nD.fbm(x * 0.02, z * 0.02, 3) + peaks;
    return 17 + detail * (1 - 0.9 * pw);
  }
  jungleH(x, z, pw) {
    let h = 2.6 + 2.6 * this.nD.fbm(x * 0.0105, z * 0.0105, 4) + 0.65 * this.nB.noise(x * 0.04, z * 0.04) * (1 - 0.85 * pw);
    const dx = x - VOLCANO.x, dz = z - VOLCANO.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < VOLCANO.r) {
      h += 30 * Math.pow(1 - d / VOLCANO.r, 1.7) * (1 + 0.06 * this.nA.noise(x * 0.2, z * 0.2));
      if (d < 13) h -= 12 * Math.pow(1 - d / 13, 1.5);
    }
    return h;
  }

  rawHeight(x, z, pwIn) {
    if (pwIn === undefined) this.pathWeight(x, z);
    const pw = this._pwWide;
    const lf = this.landField(x, z);
    const f = Math.max(lf.main, lf.jungle);
    const isJ = lf.jungle > lf.main;
    let h, coastW = 0.1;
    if (isJ) {
      h = this.jungleH(x, z, pw);
    } else {
      const cz = this.cliffZ(x);
      const t = smoothstep(cz + 2.5, cz - 2.5, z);
      const hs = x < this.riverX(z) ? this.forestH(x, z, pw) : this.meadowH(x, z, pw);
      const hm = this.mountainH(x, z, pw);
      h = lerp(hs, hm, t);
      if (t < 0.999 && z < 260) {
        const d = Math.abs(x - this.riverX(z));
        const w = 5.5 + 1.5 * this.nB.noise(z * 0.02, 9.1);
        const k = smoothstep(w * 0.45, w + 5, d);
        h = lerp(-2.7, h, Math.max(k, t));
      }
      if (t > 0.5) coastW = 0.03;
    }
    if (f > 0) h = lerp(-0.75, h, smoothstep(0, coastW, f));
    else h = -0.75 - 10 * smoothstep(0, 0.14, -f);
    return h;
  }

  buildZones() {
    const add = (x, z, r, fall, minH = 1.4, hOverride) => this.zones.push({ x, z, r, fall, minH, h: hOverride });
    for (const c of Object.values(CITIES)) add(c.x, c.z, c.r, 12, 1.8);
    add(HOMESTEAD.x, HOMESTEAD.z, HOMESTEAD.r, 9, 1.8);
    for (const s of SITES) add(s.x, s.z, s.kind === 'temple' ? 13 : 10, 7, 1.4);
    add(DOCKS.lumenbrook.x, DOCKS.lumenbrook.z - 6, 10, 6, 1.2);
    add(DOCKS.tikora.x + 6, DOCKS.tikora.z, 10, 6, 1.2);
    // lift base / top
    const cz = this.cliffZ(LIFT.x);
    add(LIFT.x, cz + 9, 6, 5, 1.5);
    add(LIFT.x, cz - 9, 6, 5, 10);
    // bridge ends
    const rx = this.riverX(BRIDGE.z);
    add(rx - BRIDGE.halfLen - 3, BRIDGE.z, 4, 4, 1.6, BRIDGE.deck - 0.05);
    add(rx + BRIDGE.halfLen + 3, BRIDGE.z, 4, 4, 1.6, BRIDGE.deck - 0.05);
    for (const zn of this.zones) {
      if (zn.h === undefined) zn.h = Math.max(zn.minH, this.rawHeight(zn.x, zn.z));
    }
  }

  height(x, z, pw) {
    let h = this.rawHeight(x, z, pw);
    if (this.lakes) h = this.lakeHeight(x, z, h);
    for (const zn of this.zones) {
      const dx = x - zn.x, dz = z - zn.z;
      const d2 = dx * dx + dz * dz, R = zn.r + zn.fall;
      if (d2 > R * R) continue;
      const w = 1 - smoothstep(zn.r, R, Math.sqrt(d2));
      h = lerp(h, zn.h, w);
    }
    return h;
  }

  plazaWeight(x, z) {
    let w = 0;
    for (const c of Object.values(CITIES)) {
      const d = Math.hypot(x - c.x, z - c.z);
      w = Math.max(w, 1 - smoothstep(c.r * 0.36, c.r * 0.36 + 2.5, d + this.nA.noise(x * 0.2, z * 0.2) * 1.2));
    }
    const d = Math.hypot(x - HOMESTEAD.x, z - HOMESTEAD.z);
    w = Math.max(w, 0.55 * (1 - smoothstep(HOMESTEAD.r * 0.75, HOMESTEAD.r * 0.75 + 3, d + this.nB.noise(x * 0.15, z * 0.15) * 2)));
    return w;
  }

  // ---------- generation ----------
  generate() {
    const { H, RV, PW, PZ } = this;
    for (let j = 0; j < VN; j++) {
      const z = -HALF + j * CELL;
      for (let i = 0; i < VN; i++) {
        const x = -HALF + i * CELL;
        const k = j * VN + i;
        const pw = this.pathWeight(x, z);
        PW[k] = pw;
        H[k] = this.height(x, z, pw);
        RV[k] = this.regionAt(x, z);
        PZ[k] = this.plazaWeight(x, z);
      }
    }
    this.computeColors();
    this.computeWalk();
  }

  computeColors() {
    const { H, RV, PW, PZ, VC } = this;
    const tmp = new THREE.Color();
    for (let j = 0; j < VN; j++) {
      const z = -HALF + j * CELL;
      for (let i = 0; i < VN; i++) {
        const x = -HALF + i * CELL;
        const k = j * VN + i;
        const h = H[k];
        const reg = RV[k] || 1;
        const pal = PAL[reg];
        const il = Math.max(0, i - 1), ir = Math.min(N, i + 1), jd = Math.max(0, j - 1), ju = Math.min(N, j + 1);
        const sx = (H[j * VN + ir] - H[j * VN + il]) / ((ir - il) * CELL);
        const sz = (H[ju * VN + i] - H[jd * VN + i]) / ((ju - jd) * CELL);
        const slope = Math.sqrt(sx * sx + sz * sz);
        const n = this.nA.noise(x * 0.045, z * 0.045) * 0.5 + 0.5;
        const n2 = this.nB.noise(x * 0.17, z * 0.17);
        tmp.copy(pal.g1).lerp(pal.g2, clamp(n + n2 * 0.15, 0, 1));
        if (reg === REG.MOUNTAIN) {
          const s = smoothstep(17.2, 19.5, h + 2.2 * n2 + 1.6 * (n - 0.5)) + smoothstep(-200, -260, z) * 0.5;
          tmp.lerp(pal.snow, clamp(s, 0, 1) * (1 - smoothstep(0.85, 1.25, slope)));
        }
        if (reg === REG.JUNGLE) {
          const dv = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
          tmp.lerp(pal.ash, 1 - smoothstep(VOLCANO.r * 0.35, VOLCANO.r * 0.95, dv + n2 * 6));
        }
        const rb = smoothstep(0.55, 0.95, slope);
        if (rb > 0) tmp.lerp(slope > 1.4 ? pal.cliff : pal.rock, rb);
        const wl = this.waterLevelAt(x, z), hr = h - wl;
        if (hr < 1.05) tmp.lerp(pal.sand, 1 - smoothstep(0.35, 1.05, hr + n2 * 0.15));
        if (PW[k] > 0 && h > 0.3) tmp.lerp(pal.path, PW[k] * 0.92);
        if (PZ[k] > 0) tmp.lerp(Math.hypot(x - HOMESTEAD.x, z - HOMESTEAD.z) < HOMESTEAD.r + 6 ? HOMEPLOT : PLAZA, PZ[k]);
        if (hr < 0) tmp.copy(wl ? LAKEBED : UNDER).lerp(DEEP, smoothstep(0, 7, -hr));
        VC[k * 3] = tmp.r; VC[k * 3 + 1] = tmp.g; VC[k * 3 + 2] = tmp.b;
      }
    }
  }

  computeWalk() {
    const { H, walk, cellReg } = this;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const h00 = H[j * VN + i], h10 = H[j * VN + i + 1], h01 = H[(j + 1) * VN + i], h11 = H[(j + 1) * VN + i + 1];
        const hc = (h00 + h10 + h01 + h11) * 0.25;
        const mn = Math.min(h00, h10, h01, h11), mx = Math.max(h00, h10, h01, h11);
        const slope = (mx - mn) / CELL;
        const x = -HALF + (i + 0.5) * CELL, z = -HALF + (j + 0.5) * CELL;
        cellReg[j * N + i] = this.regionAt(x, z);
        const wl = this.waterLevelAt(x, z);
        walk[j * N + i] = hc - wl > -0.3 && mn - wl > -0.55 && slope < 1.15 ? 1 : 0;
      }
    }
    // hard wall between the mountain plateau and the lowlands
    const kill = [];
    for (let j = 1; j < N - 1; j++) {
      for (let i = 1; i < N - 1; i++) {
        const r = cellReg[j * N + i];
        if (r !== REG.MOUNTAIN) continue;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const r2 = cellReg[(j + dj) * N + i + di];
          if (r2 === REG.MEADOW || r2 === REG.FOREST) { kill.push(j * N + i, (j + dj) * N + i + di); break; }
        }
      }
    }
    for (const k of kill) walk[k] = 0;
  }

  // ---------- queries ----------
  groundAt(x, z) {
    let fx = (x + HALF) / CELL, fz = (z + HALF) / CELL;
    fx = clamp(fx, 0, N - 0.0001); fz = clamp(fz, 0, N - 0.0001);
    const i = Math.floor(fx), j = Math.floor(fz);
    const u = fx - i, v = fz - j;
    const H = this.H;
    const h00 = H[j * VN + i], h10 = H[j * VN + i + 1], h01 = H[(j + 1) * VN + i], h11 = H[(j + 1) * VN + i + 1];
    if (((i + j) & 1) === 0) {
      if (u > v) return h00 + (h10 - h00) * u + (h11 - h10) * v;
      return h00 + (h11 - h01) * u + (h01 - h00) * v;
    }
    if (u + v < 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
    return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }

  surfaceAt(x, z) {
    for (const s of this.surfaces) {
      if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ && (!s.active || s.active())) return s;
    }
    return null;
  }

  heightAt(x, z) {
    const s = this.surfaceAt(x, z);
    if (s) return s.h;
    return this.groundAt(x, z);
  }

  walkable(x, z) {
    if (x < -HALF || x > HALF || z < -HALF || z > HALF) return false;
    for (const b of this.blockers) {
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && (!b.active || b.active())) return false;
    }
    if (this.surfaceAt(x, z)) return true;
    const i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL);
    if (i < 0 || j < 0 || i >= N || j >= N) return false;
    return this.walk[j * N + i] === 1;
  }

  regionIdAt(x, z) {
    const i = clamp(Math.floor((x + HALF) / CELL), 0, N - 1), j = clamp(Math.floor((z + HALF) / CELL), 0, N - 1);
    return this.cellReg[j * N + i];
  }
  biomeAt(x, z) { return BIOME_BY_ID[this.regionIdAt(x, z)] || 'meadow'; }

  isLand(x, z) { return this.groundAt(x, z) > 0.15; }

  // ---------- meshes ----------
  buildMeshes(material) {
    const group = new THREE.Group();
    group.name = 'terrain';
    const per = N / CHUNK;
    for (let cj = 0; cj < per; cj++) {
      for (let ci = 0; ci < per; ci++) {
        const geo = this.buildChunk(ci * CHUNK, cj * CHUNK);
        if (!geo) continue;
        const mesh = new THREE.Mesh(geo, material);
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        group.add(mesh);
      }
    }
    return group;
  }

  buildChunk(i0, j0) {
    const { H, VC } = this;
    let maxH = -99;
    for (let j = j0; j <= j0 + CHUNK; j++) for (let i = i0; i <= i0 + CHUNK; i++) maxH = Math.max(maxH, H[j * VN + i]);
    if (maxH < -7) return null;
    const W = CHUNK + 1;
    const pos = new Float32Array(W * W * 3), nor = new Float32Array(W * W * 3), col = new Float32Array(W * W * 3);
    for (let j = 0; j < W; j++) {
      for (let i = 0; i < W; i++) {
        const gi = i0 + i, gj = j0 + j, k = gj * VN + gi, o = (j * W + i) * 3;
        pos[o] = -HALF + gi * CELL; pos[o + 1] = H[k]; pos[o + 2] = -HALF + gj * CELL;
        const il = Math.max(0, gi - 1), ir = Math.min(N, gi + 1), jd = Math.max(0, gj - 1), ju = Math.min(N, gj + 1);
        const nx = -(H[gj * VN + ir] - H[gj * VN + il]) / ((ir - il) * CELL);
        const nz = -(H[ju * VN + gi] - H[jd * VN + gi]) / ((ju - jd) * CELL);
        const l = Math.hypot(nx, 1, nz);
        nor[o] = nx / l; nor[o + 1] = 1 / l; nor[o + 2] = nz / l;
        const jit = 0.96 + hash2(gi, gj, 77) * 0.08;
        col[o] = VC[k * 3] * jit; col[o + 1] = VC[k * 3 + 1] * jit; col[o + 2] = VC[k * 3 + 2] * jit;
      }
    }
    const idx = [];
    for (let j = 0; j < CHUNK; j++) {
      for (let i = 0; i < CHUNK; i++) {
        const a = j * W + i, b = j * W + i + 1, c = (j + 1) * W + i, d = (j + 1) * W + i + 1;
        if (((i0 + i + j0 + j) & 1) === 0) idx.push(a, d, b, a, c, d);
        else idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }

  // Depth texture for the water shader: R = depth below sea level (0..8 units)
  buildDepthTexture(size = 512) {
    const data = new Uint8Array(size * size * 4);
    for (let j = 0; j < size; j++) {
      const z = -HALF + (j + 0.5) / size * HALF * 2;
      for (let i = 0; i < size; i++) {
        const x = -HALF + (i + 0.5) / size * HALF * 2;
        const h = this.groundAt(x, z);
        const d = clamp(-h / 8, 0, 1);
        const k = (j * size + i) * 4;
        data[k] = Math.round(d * 255); data[k + 1] = 0; data[k + 2] = 0; data[k + 3] = 255;
      }
    }
    // edges are open sea
    for (let i = 0; i < size; i++) for (const k of [i * 4, ((size - 1) * size + i) * 4, (i * size) * 4, (i * size + size - 1) * 4]) data[k] = 255;
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  // Depth texture for one lake, covering a square of half-size L.r + 6 around it
  buildLakeDepthTexture(L, size = 64) {
    const R = L.r + 6;
    const data = new Uint8Array(size * size * 4);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = L.x - R + (i + 0.5) / size * R * 2, z = L.z - R + (j + 0.5) / size * R * 2;
        const d = clamp((L.h - this.groundAt(x, z)) / 8, 0, 1);
        const k = (j * size + i) * 4;
        data[k] = Math.round(d * 255); data[k + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  // Find a walkable land spot near (x,z)
  findWalkable(x, z, maxR = 20) {
    if (this.walkable(x, z)) return [x, z];
    for (let r = 1; r <= maxR; r += 1) {
      for (let a = 0; a < 16; a++) {
        const px = x + Math.cos(a / 16 * Math.PI * 2) * r, pz = z + Math.sin(a / 16 * Math.PI * 2) * r;
        if (this.walkable(px, pz)) return [px, pz];
      }
    }
    return [x, z];
  }
}
