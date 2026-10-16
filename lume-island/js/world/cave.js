// Procedural caves: cellular automata layout, lanterns, ore and gem veins that
// get richer with depth, blue chests, and the creeping darkness.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { TileLevel, T, TS } from './tilelevel.js';
import { RNG } from '../core/rng.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from './materials.js';
import { NodeField } from './nodes.js';

const CAVES = {
  cave_meadow: { theme: 'cave_meadow', seed: 101, size: 62, near: [['ore_copper', 5], ['coal', 3], ['rock', 2]], deep: [['gem_quartz', 2], ['gem_amethyst', 2], ['ore_copper', 3], ['ore_gold', 0.4]], mush: 'mush_meadow', rubble: 'rubble_meadow' },
  cave_forest: { theme: 'cave_forest', seed: 202, size: 66, near: [['ore_iron', 5], ['coal', 3], ['ore_copper', 1.5], ['rock', 1.5]], deep: [['gem_topaz', 2], ['gem_emerald', 2], ['ore_iron', 3], ['ore_gold', 0.6]], mush: 'mush_glow', rubble: 'rubble_forest' },
  cave_mountain: { theme: 'cave_mountain', seed: 303, size: 70, near: [['ore_moonstone', 4], ['ore_iron', 2], ['coal', 3], ['rock_mtn', 1]], deep: [['gem_sapphire', 2], ['gem_diamond', 1], ['ore_moonstone', 3], ['ore_gold', 1], ['icecrystal', 1]], mush: 'mush_snow', rubble: 'rubble_mountain' },
  cave_jungle: { theme: 'cave_jungle', seed: 404, size: 70, near: [['ore_volcanic', 4], ['coal', 3], ['rock_ash', 2]], deep: [['gem_ruby', 2], ['gem_obsidian', 2], ['ore_volcanic', 3], ['ore_gold', 1]], mush: 'mush_ember', rubble: 'rubble_jungle', lava: true },
};

function pick(rng, list) { let t = 0; for (const e of list) t += e[1]; let r = rng.next() * t; for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; } return list[0][0]; }

export class CaveLevel extends TileLevel {
  constructor(id, site) {
    const C = CAVES[id];
    super(id, 'cave', C.theme);
    this.cfg = C;
    this.title = site?.name || 'Cave';
    this.biome = site?.biome || 'meadow';
    this.site = site;
    this.darkness = 0;
    this.generate();
    this.buildStatic();
    this.populate();
    if (!G.save.world.interiors[id]) G.save.world.interiors[id] = { lit: [], chests: [], day: G.time.day };
    this.state = G.save.world.interiors[id];
    this.buildLanterns();
    this.leftEntry = false;
    this.lastDay = G.time.day;
    this.dayOff = G.events.on('newDay', () => { this.nodes.respawnAll(); this.state.chests = []; this.refreshChests?.(); });
  }
  generate() {
    const rng = new RNG(this.cfg.seed);
    const N = this.cfg.size;
    this.W = N; this.H = N;
    let g = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g[y * N + x] = (x < 2 || y < 2 || x > N - 3 || y > N - 3 || rng.next() < 0.45) ? 1 : 0;
    // keep a corridor up from the entrance so the cave always opens up
    const ex = N >> 1;
    for (let y = 1; y < 10; y++) for (let dx = -1; dx <= 1; dx++) g[y * N + ex + dx] = 0;
    for (let it = 0; it < 5; it++) {
      const n = new Uint8Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; c += xx < 0 || yy < 0 || xx >= N || yy >= N ? 1 : g[yy * N + xx]; }
        n[y * N + x] = c >= 5 || x < 2 || y < 2 || x > N - 3 || y > N - 3 ? 1 : 0;
      }
      g = n;
      for (let y = 2; y < 8; y++) g[y * N + ex] = 0;
    }
    // flood from the entrance, keep the connected part
    const dist = new Int32Array(N * N).fill(-1);
    const q = [];
    const start = 3 * N + ex;
    g[start] = 0;
    dist[start] = 0; q.push(start);
    for (let h = 0; h < q.length; h++) {
      const k = q[h], x = k % N, y = (k / N) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy, kk = yy * N + xx;
        if (xx < 0 || yy < 0 || xx >= N || yy >= N || g[kk] || dist[kk] >= 0) continue;
        dist[kk] = dist[k] + 1; q.push(kk);
      }
    }
    this.tiles = new Uint8Array(N * N);
    this.dist = dist;
    let maxD = 0;
    for (let k = 0; k < N * N; k++) { this.tiles[k] = dist[k] >= 0 ? T.FLOOR : T.WALL; maxD = Math.max(maxD, dist[k]); }
    this.maxDist = maxD;
    this.entryTile = { gx: ex, gy: 1 };
    this.tiles[1 * N + ex] = T.ENTRY;
    this.tiles[2 * N + ex] = T.FLOOR;
    const [x, z] = this.toWorld(ex, 3);
    this.entry = { x, z };
    // lava pools in the jungle cave (deep, away from the path)
    if (this.cfg.lava) {
      for (let k = 0; k < N * N; k++) {
        if (this.tiles[k] !== T.FLOOR || dist[k] < 18) continue;
        const x = k % N, y = (k / N) | 0;
        if (Math.sin(x * 0.45) * Math.cos(y * 0.38) > 0.82) this.tiles[k] = T.LAVA;
      }
      // re-check connectivity is fine: lava is only where noise is high (small blobs)
    }
  }
  floorTiles() {
    const out = [];
    for (let gy = 0; gy < this.H; gy++) for (let gx = 0; gx < this.W; gx++) if (this.get(gx, gy) === T.FLOOR) out.push([gx, gy]);
    return out;
  }
  nearWall(gx, gy) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.get(gx + dx, gy + dy) === T.WALL) return true; return false; }
  populate() {
    const rng = new RNG(this.cfg.seed + 7);
    const specs = [];
    const used = new Set();
    const tiles = this.floorTiles();
    const N = this.W;
    // lanterns along the way (every ~13 steps of depth, spread out)
    this.lanternSpots = [];
    const byD = tiles.filter(([x, y]) => this.dist[y * N + x] > 4).sort((a, b) => this.dist[a[1] * N + a[0]] - this.dist[b[1] * N + b[0]]);
    for (const [x, y] of byD) {
      const d = this.dist[y * N + x];
      if (d % 11 !== 0) continue;
      if (this.lanternSpots.some((l) => Math.hypot(l.gx - x, l.gy - y) < 9)) continue;
      if (!this.nearWall(x, y)) continue;
      this.lanternSpots.push({ gx: x, gy: y, d });
      used.add(x + ',' + y);
    }
    // ore, gems, mushrooms, rubble along the walls
    for (const [x, y] of tiles) {
      const key = x + ',' + y;
      if (used.has(key) || y < 4) continue;
      const d = this.dist[y * N + x] / this.maxDist;
      const wall = this.nearWall(x, y);
      const r = rng.next();
      const [wx, wz] = this.toWorld(x, y);
      if (wall && r < 0.2) {
        const type = d > 0.55 && rng.next() < 0.6 ? pick(rng, this.cfg.deep) : pick(rng, this.cfg.near);
        specs.push({ type, x: wx + (rng.next() - 0.5) * 0.4, z: wz + (rng.next() - 0.5) * 0.4, rot: rng.next() * 6, s: 0.9 + rng.next() * 0.2 });
        used.add(key);
      } else if (r < 0.235) {
        specs.push({ type: this.cfg.mush, x: wx, z: wz, rot: rng.next() * 6, s: 1 }); used.add(key);
      } else if (r < 0.245) {
        specs.push({ type: this.cfg.rubble, x: wx, z: wz, rot: rng.next() * 6, s: 1 }); used.add(key);
      } else if (r < 0.255 && d > 0.3) {
        specs.push({ type: rng.next() < 0.5 ? 'pot' : 'barrel', x: wx, z: wz, rot: rng.next() * 6, s: 1 }); used.add(key);
      }
    }
    this.nodes = new NodeField(this, specs, { seed: this.cfg.seed });
    // blue chests in far dead ends
    this.chestSpots = [];
    const far = tiles.filter(([x, y]) => !used.has(x + ',' + y) && this.dist[y * N + x] > this.maxDist * 0.5).sort((a, b) => this.dist[b[1] * N + b[0]] - this.dist[a[1] * N + a[0]]);
    for (const [x, y] of far) {
      if (this.chestSpots.length >= 3) break;
      if (this.chestSpots.some((c) => Math.hypot(c.gx - x, c.gy - y) < 14)) continue;
      this.chestSpots.push({ gx: x, gy: y });
      used.add(x + ',' + y);
    }
    // monsters and hazards (skipped in peaceful mode at spawn time)
    this.spawnSpots = [];
    for (const [x, y] of tiles) {
      const d = this.dist[y * N + x];
      if (d < 14 || used.has(x + ',' + y)) continue;
      const r = rng.next();
      const [wx, wz] = this.toWorld(x, y);
      if (r < 0.012) this.spawnSpots.push({ type: this.biome === 'mountain' ? 'ghost' : 'spider', x: wx, z: wz });
      else if (r < 0.016) this.spawnSpots.push({ type: 'boulder', x: wx, z: wz });
      else if (r < 0.019) this.spawnSpots.push({ type: 'poison', x: wx, z: wz });
    }
    this.used = used;
  }
  buildLanterns() {
    this.lanterns = [];
    const add = (gx, gy, startLit) => {
      const [x, z] = this.toWorld(gx, gy);
      const id = gx + ',' + gy;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(merge([part(P.cyl(0.1, 0.14, 2.6, 6), 0x5a4030, { y: 1.3 }), part(P.box(0.6, 0.1, 0.1), 0x5a4030, { x: 0.25, y: 2.55 }), part(P.cone(0.3, 0.25, 4), 0x3a3030, { x: 0.45, y: 2.55, ry: Math.PI / 4 })]), MAT.world));
      const glass = new THREE.Mesh(merge([part(P.box(0.32, 0.4, 0.32), 0xffe2a0, { x: 0.45, y: 2.25, jitter: 0 })]), MAT.unlit);
      const dark = new THREE.Mesh(merge([part(P.box(0.32, 0.4, 0.32), 0x3a3a40, { x: 0.45, y: 2.25, jitter: 0 })]), MAT.world);
      g.add(glass, dark);
      g.position.set(x, 0, z);
      this.scene.add(g);
      const L = { gx, gy, x, z, id, lit: startLit || this.state.lit.includes(id), glass, dark, light: { x: x + 0.45, y: 2.4, z, color: 0xffc070, intensity: 3.5, distance: 15, always: true } };
      const sync = () => { glass.visible = L.lit; dark.visible = !L.lit; const i = this.lightSources.indexOf(L.light); if (L.lit && i < 0) this.lightSources.push(L.light); if (!L.lit && i >= 0) this.lightSources.splice(i, 1); };
      L.sync = sync;
      sync();
      this.blocked.set(this.key(gx, gy), { lantern: L });
      this.addInteractable({ x, z, r: 0.5, h: 3.0, canInteract: () => !L.lit, label: () => (G.inv.has('charcoal') ? 'Light the lantern (1 charcoal)' : 'Light the lantern (needs charcoal)'), onInteract: () => {
        if (!G.inv.has('charcoal')) { G.ui.toast('You need a piece of charcoal to light it.', 'info'); return; }
        G.inv.remove('charcoal', 1);
        L.lit = true; this.state.lit.push(id); sync();
        G.audio?.play('fire');
        G.particles?.burst('fire', x + 0.45, 2.3, z);
      } });
      this.lanterns.push(L);
    };
    // entrance light is always on
    add(this.entryTile.gx + 2, this.entryTile.gy + 2, true);
    this.lanternSpots.forEach((s, i) => add(s.gx, s.gy, i < 2));
    // chests
    this.chests = [];
    for (const c of this.chestSpots) {
      const [x, z] = this.toWorld(c.gx, c.gy);
      const id = c.gx + ',' + c.gy;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(merge([part(P.box(1.2, 0.7, 0.8), 0x3a6aa0, { y: 0.35 }), part(P.box(1.25, 0.12, 0.85), 0xe8c060, { y: 0.1 }), part(P.box(0.1, 0.72, 0.85), 0xe8c060, { x: 0.38, y: 0.36 }), part(P.box(0.1, 0.72, 0.85), 0xe8c060, { x: -0.38, y: 0.36 })]), MAT.world));
      const lid = new THREE.Mesh(merge([part(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10, 1, false, 0, Math.PI), 0x3a6aa0, { rz: Math.PI / 2, ry: Math.PI / 2 })]), MAT.world);
      lid.position.y = 0.7;
      g.add(lid);
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.blocked.set(this.key(c.gx, c.gy), { chest: true });
      const ch = { id, lid, x, z };
      this.chests.push(ch);
      this.addInteractable({ x, z, r: 0.7, h: 1.8, canInteract: () => !this.state.chests.includes(id), label: 'Open the blue chest', onInteract: () => {
        this.state.chests.push(id);
        lid.rotation.x = -1.9;
        G.audio?.play('chest');
        const tier = { meadow: 1, forest: 2, mountain: 3, jungle: 4 }[this.biome];
        G.pickups.spawn('$', 25 * tier + Math.floor(Math.random() * 30 * tier), x, 1.2, z);
        if (Math.random() < 0.6) G.pickups.spawn('tool_token', 1, x, 1.2, z);
        if (Math.random() < 0.35) G.pickups.spawn('lost_spirit', 1, x, 1.2, z);
        if (Math.random() < 0.5) G.pickups.spawn('token_' + this.biome, 1 + Math.floor(Math.random() * 2), x, 1.2, z);
        G.pickups.spawn(this.cfg.rubble, 1, x, 1.2, z);
      } });
    }
    this.refreshChests = () => { for (const c of this.chests) c.lid.rotation.x = this.state.chests.includes(c.id) ? -1.9 : 0; };
    this.refreshChests();
  }
  // is a point inside a lantern's (or placed torch's) light?
  litAt(x, z) {
    for (const s of this.lightSources) {
      const r = s.lightRadius || 11;
      if ((s.x - x) ** 2 + (s.z - z) ** 2 < r * r) return true;
    }
    return false;
  }
  onEnter() {
    super.onEnter();
    this.darkness = 0;
    if (!this.spawned) {
      this.spawned = true;
      if (!G.save.peaceful) for (const s of this.spawnSpots) G.monsters?.spawn(this, s.type, s.x, s.z);
    }
    G.ui.setDarkness?.(0);
  }
  onExit() { G.ui.setDarkness?.(0); }
  update(dt) {
    super.update(dt);
    const p = G.player;
    const lit = this.litAt(p.pos.x, p.pos.z);
    const lantern = G.save.flags.lumaLanternDay === G.time.day ? 2 : 1;
    const bonus = 1 + (G.lumas?.abilityValue?.('darkness') || 0);
    const limit = 22 * lantern * bonus;
    if (lit) this.darkness = Math.max(0, this.darkness - dt / 2.5);
    else this.darkness = Math.min(1, this.darkness + dt / limit);
    G.ui.setDarkness?.(this.darkness);
    if (this.darkness >= 1 && !G.travel.busy) {
      this.darkness = 0;
      G.ui.toast('The darkness closed in, so you fled back outside.', 'warn', 4000);
      G.travel.toOverworld();
    }
    const [pgx, pgy] = this.toTile(p.pos.x, p.pos.z);
    const onEntry = pgx === this.entryTile.gx && pgy === this.entryTile.gy;
    if (!onEntry) this.leftEntry = true;
    else if (this.leftEntry && !G.travel.busy) G.travel.toOverworld();
  }
  dispose() { this.dayOff?.(); super.dispose(); }
}
