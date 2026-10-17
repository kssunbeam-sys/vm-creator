// Buried treasure: new hidden spots every day, treasure maps with an X,
// digging with the shovel, and the treasure compass.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { RNG } from '../core/rng.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from '../world/materials.js';
import { CITIES, HOMESTEAD, BIOME_BY_ID } from '../data/layout.js';

const BIOMES = ['meadow', 'forest', 'mountain', 'jungle'];

export class Treasure {
  constructor() {
    this.spots = [];
    this.marks = new Map();
    this.moundGeo = merge([part(P.cone(0.7, 0.35, 8), 0x8a6a48, { y: 0.12, jitter: 0.12 }), part(P.cone(0.35, 0.2, 6), 0x6a4e34, { x: 0.4, y: 0.06, jitter: 0.1 })]);
    this.xGeo = merge([part(P.box(2.2, 0.06, 0.4), 0xd9302e, { y: 0.06, ry: Math.PI / 4, jitter: 0 }), part(P.box(2.2, 0.06, 0.4), 0xd9302e, { y: 0.06, ry: -Math.PI / 4, jitter: 0 })]);
    G.events.on('gameStart', () => this.generate());
    G.events.on('newDay', () => this.generate());
  }
  randomSpot(rng, biome, avoid = []) {
    const T = G.overworld.terrain;
    for (let i = 0; i < 400; i++) {
      const x = -330 + rng.next() * 660, z = -330 + rng.next() * 660;
      if (BIOME_BY_ID[T.regionIdAt(x, z)] !== biome) continue;
      if (!T.walkable(x, z) || T.groundAt(x, z) < 1.0) continue;
      if (Object.values(CITIES).some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 6)) continue;
      if (Math.hypot(HOMESTEAD.x - x, HOMESTEAD.z - z) < HOMESTEAD.r) continue;
      if (G.overworld.colliders.overlaps(x, z, 1.2)) continue;
      if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < 20)) continue;
      return { x, z };
    }
    return null;
  }
  generate() {
    for (const m of this.marks.values()) G.overworld.scene.remove(m);
    this.marks.clear();
    const rng = new RNG(G.time.day * 977 + 13);
    this.spots = [];
    for (const b of BIOMES) for (let i = 0; i < 6; i++) { const p = this.randomSpot(rng, b, this.spots); if (p) this.spots.push({ ...p, biome: b, dug: false, revealed: false }); }
    // spots already dug today stay dug after a reload
    const dd = G.save.treasureDug;
    if (dd && dd.day === G.time.day) this.spots.forEach((s, i) => { if (dd.ids.includes(i)) s.dug = true; });
    else G.save.treasureDug = { day: G.time.day, ids: [] };
    for (const m of G.save.treasureMaps || []) { this.spots.push({ ...m, map: true, revealed: true }); this.showX(this.spots[this.spots.length - 1]); }
  }
  nearest(x, z, r, level) {
    if (level && level !== G.overworld) return null;
    let best = null, bd = r;
    for (const s of this.spots) { if (s.dug) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  showMound(s) {
    if (this.marks.has(s)) return;
    const m = new THREE.Mesh(this.moundGeo, MAT.world);
    m.position.set(s.x, G.overworld.heightAt(s.x, s.z), s.z);
    m.receiveShadow = true;
    G.overworld.scene.add(m);
    this.marks.set(s, m);
  }
  showX(s) {
    const m = new THREE.Mesh(this.xGeo, MAT.unlit);
    m.position.set(s.x, G.overworld.heightAt(s.x, s.z) + 0.02, s.z);
    G.overworld.scene.add(m);
    this.marks.set(s, m);
  }
  tryDig(x, z) {
    if (G.level !== G.overworld) return false;
    const s = this.nearest(x, z, 1.9);
    if (!s) return false;
    s.dug = true;
    const idx = this.spots.indexOf(s);
    if (!s.map && G.save.treasureDug?.day === G.time.day) G.save.treasureDug.ids.push(idx);
    const m = this.marks.get(s);
    if (m) { G.overworld.scene.remove(m); this.marks.delete(s); }
    const y = G.overworld.heightAt(s.x, s.z) + 0.6;
    G.particles?.burst('dig', s.x, y, s.z, { n: 16 });
    G.audio?.play('treasure');
    G.pickups.spawn('coffer_' + s.biome, 1, s.x, y, s.z);
    G.pickups.spawn('$', 10 + Math.floor(Math.random() * 30), s.x, y, s.z);
    if (Math.random() < 0.3) G.pickups.spawn('map_fragment', 1, s.x, y, s.z);
    if (s.map) {
      G.pickups.spawn('gold_nugget', 2, s.x, y, s.z);
      G.pickups.spawn('tool_token', 1, s.x, y, s.z);
      G.pickups.spawn('token_' + s.biome, 3, s.x, y, s.z);
      G.pickups.spawn('coffer_' + s.biome, 1, s.x, y, s.z);
      G.save.treasureMaps = (G.save.treasureMaps || []).filter((t) => !(t.x === s.x && t.z === s.z));
    }
    G.ui.toast('You dug up a treasure coffer! Clean it at a Treasure Sink.', 'good');
    G.events.emit('treasureDug', s.biome, !!s.map);
    return true;
  }
  useMap() {
    if (G.level !== G.overworld) { G.ui.toast('Read treasure maps outdoors.', 'info'); return false; }
    const biome = G.overworld.biomeAt(G.player.pos.x, G.player.pos.z);
    const rng = new RNG(Date.now() % 100000);
    const p = this.randomSpot(rng, biome, [{ x: G.player.pos.x, z: G.player.pos.z }]);
    if (!p) { G.ui.toast('The map is too smudged to read here.', 'warn'); return false; }
    const spot = { ...p, biome, dug: false };
    G.save.treasureMaps = [...(G.save.treasureMaps || []), spot];
    const s = { ...spot, map: true, revealed: true };
    this.spots.push(s);
    this.showX(s);
    const dx = p.x - G.player.pos.x, dz = p.z - G.player.pos.z;
    G.ui.toast(`The map marks a big red X about ${Math.round(Math.hypot(dx, dz))} steps to the ${dirName(dx, dz)}. It is on your map (M).`, 'magic', 6000);
    return true;
  }
  compass() {
    const s = this.nearest(G.player.pos.x, G.player.pos.z, 400, G.level);
    if (!s) { G.ui.toast('The needle spins lazily. No treasure nearby.', 'info'); return; }
    const dx = s.x - G.player.pos.x, dz = s.z - G.player.pos.z;
    G.ui.toast(`The needle points ${dirName(dx, dz)}, about ${Math.round(Math.hypot(dx, dz))} steps away.`, 'magic', 4500);
  }
}
export function dirName(dx, dz) {
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((Math.atan2(dx, -dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
}
