// Entrances in the overworld: temples, caves and crystal ruins.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { part, merge, P, jiggle } from '../core/geo.js';
import { MAT } from './materials.js';
import { SITES } from '../data/layout.js';
import { TEMPLES } from '../data/temples.js';
import { ITEMS } from '../data/items.js';

const STONE = { meadow: 0xd2c19a, forest: 0x8f9c7c, mountain: 0xb4c2d4, jungle: 0xc0906e };
const TOPS = { meadow: 0x7fae4e, forest: 0x4f8a3a, mountain: 0xf4f8ff, jungle: 0x3f9a4a };

function templeFacade(biome, big = false) {
  const st = STONE[biome], top = TOPS[biome];
  const dark = new THREE.Color(st).multiplyScalar(0.78).getHex();
  const s = big ? 1.25 : 1;
  const body = [], glow = [], crystal = [];
  body.push(part(P.box(10 * s, 0.8, 8 * s), dark, { y: 0.4, jitter: 0.05 }));
  body.push(part(P.box(8.4 * s, 3.8 * s, 6 * s), st, { y: 0.8 + 1.9 * s, z: -0.6, jitter: 0.05 }));
  body.push(part(P.cone(1, 1, 4), dark, { y: 0.8 + 3.8 * s + 1.4 * s, z: -0.6, ry: Math.PI / 4, sx: 6.6 * s, sz: 4.9 * s, sy: 2.8 * s, jitter: 0.05 }));
  body.push(part(P.box(3.0, 2.9, 0.4), 0x1a120c, { y: 2.25, z: 2.45, jitter: 0 }));
  body.push(part(P.box(3.6, 0.5, 0.7), dark, { y: 3.85, z: 2.55 }));
  for (const sx of [-1, 1]) {
    body.push(part(P.cyl(0.42, 0.5, 3.2, 8), st, { x: sx * 2.3, y: 2.4, z: 2.7 }));
    body.push(part(P.box(1.1, 0.3, 1.1), dark, { x: sx * 2.3, y: 4.05, z: 2.7 }));
    body.push(part(P.box(0.9, 1.3, 0.9), dark, { x: sx * 3.9, y: 1.45, z: 3.3 }));
    glow.push(part(P.cone(0.38, 0.7, 6), 0xffa030, { x: sx * 3.9, y: 2.45, z: 3.3, jitter: 0 }));
  }
  for (let k = 0; k < 3; k++) body.push(part(P.box(3.4, 0.3, 0.6), dark, { y: 0.15 + k * 0.28, z: 4.3 - k * 0.45 }));
  crystal.push(part(P.octa(0.42, 0), biome === 'jungle' ? 0xff8a4a : biome === 'forest' ? 0x6ff08a : biome === 'mountain' ? 0x9fe4ff : 0xffd27a, { y: 4.7, z: 2.6, sy: 1.4 }));
  for (let i = 0; i < 7; i++) body.push(jiggle(part(P.ico(0.55, 0), top, { x: (i - 3) * 1.3 * s, y: 0.8 + 3.8 * s + 0.2, z: -0.6 + ((i % 2) * 2 - 1) * 2.8 * s, sy: 0.4 }), 0.1, i));
  if (biome === 'jungle' || biome === 'forest') for (let i = 0; i < 6; i++) body.push(part(P.cyl(0.05, 0.05, 2.6, 3), 0x2e7a3a, { x: -4 + i * 1.6, y: 3.4, z: 2.45 }));
  return { body, glow, crystal, hw: 5 * s, hd: 4 * s, door: { x: 0, z: 5.6 } };
}
function caveMouth(biome) {
  const rock = { meadow: 0x9a8f80, forest: 0x7f8a72, mountain: 0x9aa4b8, jungle: 0x5e4a44 }[biome];
  const body = [], glow = [];
  const rocks = [[-3.4, 1.6, -0.5, 2.6], [3.4, 1.5, -0.4, 2.5], [0, 3.6, -1.6, 3.0], [-2.0, 3.0, -1.2, 2.2], [2.2, 3.1, -1.4, 2.3], [-4.6, 0.8, 0.6, 1.6], [4.6, 0.8, 0.5, 1.5], [0, 1.4, -3.4, 3.6]];
  rocks.forEach(([x, y, z, r], i) => body.push(jiggle(part(P.dodeca(r, 0), rock, { x, y, z, jitter: 0.08 }), r * 0.15, i + 3)));
  body.push(part(P.box(3.4, 3.2, 1.2), 0x050403, { y: 1.5, z: 0.6, jitter: 0 }));
  for (const sx of [-1, 1]) body.push(part(P.box(0.32, 3.4, 0.32), 0x7a5232, { x: sx * 1.7, y: 1.7, z: 1.3 }));
  body.push(part(P.box(4.0, 0.34, 0.36), 0x7a5232, { y: 3.4, z: 1.3 }));
  body.push(part(P.box(0.08, 0.5, 0.08), 0x3a3030, { x: 1.2, y: 3.05, z: 1.55 }));
  glow.push(part(P.box(0.3, 0.38, 0.3), 0xffd27a, { x: 1.2, y: 2.65, z: 1.55, jitter: 0 }));
  return { body, glow, hw: 5.2, hd: 3.4, door: { x: 0, z: 3.0 } };
}
function crystalRuin(biome) {
  const st = STONE[biome];
  const body = [], crystal = [];
  body.push(part(P.cyl(4.6, 4.9, 0.5, 16), new THREE.Color(st).multiplyScalar(0.8).getHex(), { y: 0.25, jitter: 0.05 }));
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, h = 1.2 + ((i * 7) % 5) * 0.6;
    if (i === 2) continue;
    body.push(part(P.cyl(0.42, 0.5, h, 7), st, { x: Math.cos(a) * 3.8, y: 0.5 + h / 2, z: Math.sin(a) * 3.8, rz: (i % 3 - 1) * 0.08 }));
  }
  body.push(part(P.box(2.4, 0.2, 2.4), 0x120c08, { y: 0.52 }));
  for (let k = 0; k < 3; k++) body.push(part(P.box(2.0, 0.12, 0.5), new THREE.Color(st).multiplyScalar(0.6).getHex(), { y: 0.48 - k * 0.15, z: 0.8 - k * 0.5 }));
  crystal.push(part(P.octa(0.6, 0), { meadow: 0xffd27a, forest: 0x6ff08a, mountain: 0x9fe4ff, jungle: 0xff7a4a }[biome], { y: 3.2, sy: 1.6 }));
  return { body, crystal, hw: 0, hd: 0, door: { x: 0, z: 0.4 }, ring: 4.0 };
}

export function buildSites(world) {
  const out = {};
  for (const s of SITES) {
    if (s.kind === 'shrine') continue;
    const y = world.heightAt(s.x, s.z);
    const m = s.kind === 'temple' ? templeFacade(s.biome, s.main) : s.kind === 'cave' ? caveMouth(s.biome) : crystalRuin(s.biome);
    // face the way the closest road arrives (towards +z by default: south)
    const rot = 0;
    const g = new THREE.Group();
    for (const [k, mat] of [['body', MAT.world], ['glow', MAT.glowWarm], ['crystal', MAT.glowCool]]) {
      if (!m[k] || !m[k].length) continue;
      const mesh = new THREE.Mesh(merge(m[k]), mat);
      mesh.castShadow = k === 'body'; mesh.receiveShadow = true;
      g.add(mesh);
    }
    g.position.set(s.x, y - 0.1, s.z);
    g.rotation.y = rot;
    world.scene.add(g);
    if (m.ring) {
      for (let i = 0; i < 8; i++) { if (i === 2) continue; const a = i / 8 * Math.PI * 2; world.colliders.addCircle(s.x + Math.cos(a) * 3.8, s.z + Math.sin(a) * 3.8, 0.55); }
    } else if (s.kind === 'temple') {
      world.colliders.addBox(s.x, s.z - 0.8, m.hw - 0.6, m.hd - 1.2, rot);
      for (const sx of [-1, 1]) { world.colliders.addCircle(s.x + sx * 2.3, s.z + 2.7, 0.5); world.colliders.addCircle(s.x + sx * 3.9, s.z + 3.3, 0.6); }
    } else world.colliders.addBox(s.x, s.z - 1.0, m.hw - 0.8, m.hd - 0.8, rot);
    const door = { x: s.x + m.door.x, z: s.z + m.door.z };
    const level = s.kind === 'cave' ? s.id : s.id;
    const label = () => {
      const t = TEMPLES[s.id];
      if (s.kind === 'temple' && t?.needs && !G.save.flags['open_' + s.id]) return `${s.name} (sealed)`;
      const done = G.save.temples[s.id]?.done;
      return (s.kind === 'cave' ? 'Enter ' : s.kind === 'ruin' ? 'Climb down into ' : 'Enter ') + s.name + (done ? ' ✓' : '');
    };
    world.addInteractable({ x: door.x, z: door.z - (s.kind === 'ruin' ? 0 : 1.2), r: 1.2, h: s.kind === 'ruin' ? 2.5 : 4.2, label, priority: 0.5, onInteract: () => enterSite(s, door) });
    out[s.id] = { site: s, door, group: g };
  }
  return out;
}

export function enterSite(s, door) {
  const t = TEMPLES[s.id];
  if (s.kind === 'temple' && t?.needs && !G.save.flags['open_' + s.id]) {
    const missing = t.needs.filter(([id, q]) => G.inv.count(id) < q);
    if (missing.length) {
      const what = t.needs.map(([id, q]) => `${q > 1 ? q + ' ' : ''}${ITEMS[id].name}${q > 1 ? 's' : ''}`).join(', ');
      G.dialogue.openText(s.name, `The door is sealed. Carved hollows wait for: ${what}.`);
      return;
    }
    for (const [id, q] of t.needs) G.inv.remove(id, q);
    G.save.flags['open_' + s.id] = true;
    G.audio?.play('solve');
    G.ui.toast('The seal accepts your offering and the door grinds open!', 'magic', 4000);
    G.events.emit('siteUnsealed', s.id);
  }
  G.travel.enter(s, { x: door.x, z: door.z + 1.5 });
}
