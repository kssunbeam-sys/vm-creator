// Tile-based interior levels (temples, crystal ruins, caves). Tile (gx, gy)
// sits at world (gx*TS, -gy*TS); gy grows to the north.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { Level } from './level.js';
import { part, merge, P, jiggle } from '../core/geo.js';
import { hash2 } from '../core/rng.js';
import { MAT } from './materials.js';

export const TS = 2;
export const T = { VOID: 0, FLOOR: 1, WALL: 2, WATER: 3, LAVA: 4, ICE: 5, PLATE: 6, SPIKES: 7, DOOR: 8, ENTRY: 9, MEM: 10, PIT: 11 };
const WALKABLE = new Set([T.FLOOR, T.ICE, T.PLATE, T.SPIKES, T.ENTRY, T.MEM]);

export const THEMES = {
  meadow: { floor: [0xd9c9a2, 0xcfbd94, 0xe2d4b0], wall: 0xc4ad84, wallTop: 0x7fae4e, accent: 0xf2c94c, bg: 0x1a1410, amb: 0xfff0d8, ambI: 1.15, fog: 0x2a2018 },
  forest: { floor: [0x8c9a78, 0x7f8e6c, 0x98a684], wall: 0x6e7c5c, wallTop: 0x4f8a3a, accent: 0x6ff08a, bg: 0x0f1610, amb: 0xe0f0d8, ambI: 1.0, fog: 0x101a12 },
  mountain: { floor: [0xbccadb, 0xaebdd0, 0xc8d6e6], wall: 0x8c9cb2, wallTop: 0xf4f8ff, accent: 0x9fe4ff, bg: 0x101622, amb: 0xe0ecff, ambI: 1.05, fog: 0x141c2a },
  jungle: { floor: [0xba8a6c, 0xae7e62, 0xc69878], wall: 0x8a5c4a, wallTop: 0x3f9a4a, accent: 0xff7a4a, bg: 0x160c08, amb: 0xfff0e0, ambI: 1.05, fog: 0x200e08 },
  great: { floor: [0xeadfc6, 0xe0d4b8, 0xf2e8d2], wall: 0xd6c6a2, wallTop: 0xf2c94c, accent: 0xffe08a, bg: 0x14100a, amb: 0xfff6e0, ambI: 1.2, fog: 0x201810 },
  cave_meadow: { floor: [0x6e5e4a, 0x665844, 0x766650], wall: 0x7e7262, wallTop: 0x5e5446, accent: 0xe0803a, bg: 0x000000, amb: 0x8a98c0, ambI: 0.62, fog: 0x000000, cave: true },
  cave_forest: { floor: [0x5a6652, 0x525e4a, 0x626e58], wall: 0x68745e, wallTop: 0x4e5a44, accent: 0x6ff08a, bg: 0x000000, amb: 0x88b098, ambI: 0.6, fog: 0x000000, cave: true },
  cave_mountain: { floor: [0x5e6678, 0x565e70, 0x667082], wall: 0x727c90, wallTop: 0x9aa6ba, accent: 0xb9c8ff, bg: 0x000000, amb: 0x8a9ad0, ambI: 0.62, fog: 0x000000, cave: true },
  cave_jungle: { floor: [0x4e3a34, 0x48362e, 0x56423a], wall: 0x5a443e, wallTop: 0x3e2e2a, accent: 0xff5a2a, bg: 0x000000, amb: 0xc09080, ambI: 0.6, fog: 0x000000, cave: true },
};

export class TileLevel extends Level {
  constructor(id, kind, themeKey) {
    super(id, kind);
    this.theme = THEMES[themeKey];
    this.themeKey = themeKey;
    this.W = 0; this.H = 0;
    this.tiles = null;
    this.roomOf = null;
    this.blocked = new Map();   // tileKey -> blocker object (blocks, statues, closed doors, pillars)
    this.noSeeThrough = false;
    this.exitTo = null;         // {x, z} in the overworld
    this.entry = { x: 0, z: 0 };
    const t = this.theme;
    this.scene.background = new THREE.Color(t.bg);
    this.scene.fog = new THREE.FogExp2(t.fog, t.cave ? 0.02 : 0.012);
    this.hemi = new THREE.HemisphereLight(t.amb, 0x302820, t.ambI);
    this.scene.add(this.hemi);
    if (!t.cave) {
      const d = new THREE.DirectionalLight(0xfff2dc, 1.1);
      d.position.set(20, 60, 30);
      this.scene.add(d);
      this.scene.add(d.target);
      this.dir = d;
    }
  }
  key(gx, gy) { return gx * 4096 + gy; }
  inside(gx, gy) { return gx >= 0 && gy >= 0 && gx < this.W && gy < this.H; }
  get(gx, gy) { return this.inside(gx, gy) ? this.tiles[gy * this.W + gx] : T.VOID; }
  set(gx, gy, v) { if (this.inside(gx, gy)) this.tiles[gy * this.W + gx] = v; }
  toTile(x, z) { return [Math.round(x / TS), Math.round(-z / TS)]; }
  toWorld(gx, gy) { return [gx * TS, -gy * TS]; }
  tileWalkable(gx, gy) {
    const t = this.get(gx, gy);
    if (t === T.DOOR) { const b = this.blocked.get(this.key(gx, gy)); return !b; }
    if (!WALKABLE.has(t)) return false;
    return !this.blocked.has(this.key(gx, gy));
  }
  walkable(x, z) {
    const r = 0.34;
    for (const [dx, dz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const [gx, gy] = this.toTile(x + dx, z + dz);
      if (!this.tileWalkable(gx, gy)) return false;
    }
    return true;
  }
  heightAt() { return 0; }
  biomeAt() { return this.biome || 'meadow'; }
  surfaceKind() { return 'stone'; }

  // Build static floor + wall meshes from the tile grid
  buildStatic() {
    const t = this.theme;
    const floor = [], walls = [], tops = [], dark = [], lava = [], water = [];
    const pal = t.floor;
    for (let gy = 0; gy < this.H; gy++) {
      for (let gx = 0; gx < this.W; gx++) {
        const v = this.get(gx, gy);
        const [x, z] = this.toWorld(gx, gy);
        const hsh = hash2(gx, gy, 5);
        if (v === T.WALL) {
          // only walls next to open space are drawn
          let edge = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const n = this.get(gx + dx, gy + dy); if (n !== T.WALL && n !== T.VOID) { edge = true; break; } }
          if (!edge) continue;
          if (t.cave) {
            const hgt = 2.2 + hsh * 2.2;
            walls.push(jiggle(part(P.dodeca(TS * 0.78, 0), t.wall, { x, y: hgt * 0.35, z, sy: hgt / (TS * 1.2), ry: hsh * 6, jitter: 0.12, seed: gx * 7 + gy }), 0.25, gx * 31 + gy));
            if (hsh > 0.5) walls.push(jiggle(part(P.dodeca(TS * 0.5, 0), t.wallTop, { x: x + (hsh - 0.5), y: hgt * 0.8, z: z - (hsh - 0.5), ry: hsh * 3, jitter: 0.12 }), 0.15, gx + gy * 13));
          } else {
            const hgt = 3.2;
            walls.push(part(P.box(TS, hgt, TS), t.wall, { x, y: hgt / 2, z, jitter: 0.05, seed: gx * 13 + gy }));
            for (let k = 0; k < 2; k++) walls.push(part(P.box(TS + 0.02, 0.06, TS + 0.02), new THREE.Color(t.wall).multiplyScalar(0.82).getHex(), { x, y: 1.0 + k * 1.1, z, jitter: 0 }));
            tops.push(part(P.box(TS + 0.06, 0.22, TS + 0.06), t.wallTop, { x, y: hgt + 0.11, z, jitter: 0.06, seed: gx + gy * 7 }));
          }
          continue;
        }
        if (v === T.VOID) continue;
        if (v === T.PIT) { dark.push(part(P.box(TS, 0.1, TS), 0x0a0806, { x, y: -1.5, z, jitter: 0 })); continue; }
        if (v === T.LAVA) { lava.push(part(P.box(TS, 0.1, TS), 0xff6a1a, { x, y: -0.25, z, jitter: 0.1 })); continue; }
        if (v === T.WATER) { water.push(part(P.box(TS, 0.1, TS), 0x3fa8c8, { x, y: -0.3, z, jitter: 0.04 })); continue; }
        const c = v === T.ICE ? 0xd8f0ff : pal[Math.floor(hsh * pal.length)];
        if (t.cave) floor.push(part(P.box(TS, 0.3, TS), c, { x, y: -0.15, z, jitter: 0.1, seed: gx * 3 + gy }));
        else {
          floor.push(part(P.box(TS - 0.08, 0.3, TS - 0.08), c, { x, y: -0.15, z, jitter: 0.04, seed: gx * 3 + gy }));
          dark.push(part(P.box(TS, 0.2, TS), new THREE.Color(pal[0]).multiplyScalar(0.6).getHex(), { x, y: -0.22, z, jitter: 0 }));
        }
      }
    }
    const add = (arr, mat, cast = false) => {
      if (!arr.length) return;
      const m = new THREE.Mesh(merge(arr), mat);
      m.receiveShadow = true; m.castShadow = cast;
      m.matrixAutoUpdate = false;
      this.scene.add(m);
    };
    add(floor, MAT.world);
    add(dark, MAT.world);
    add(walls, MAT.roof, true);
    add(tops, MAT.roof, true);
    add(lava, MAT.unlit);
    add(water, MAT.glowCool);
    if (lava.length) this.lavaGlow = true;
  }
  onEnter() {
    G.lightPool.attach(this.scene);
    if (this.theme.cave) this.ensurePlayerLight();
  }
  ensurePlayerLight() {
    if (!this.playerLight) {
      this.playerLight = new THREE.PointLight(0xffd9a0, 22, 11, 1.4);
      this.scene.add(this.playerLight);
    }
  }
  update(dt) {
    super.update(dt);
    if (this.playerLight) this.playerLight.position.set(G.player.pos.x, 2.4, G.player.pos.z);
  }
}
