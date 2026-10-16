// Builds the four main cities: buildings, plazas, props, town trees, NPCs.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { merge, part, P } from '../core/geo.js';
import { MAT } from './materials.js';
import { house, hut, PROPS, STYLES } from './buildings.js';
import { CITIES } from '../data/layout.js';
import { CITY_LAYOUT } from '../data/cities.js';
import { NPCS } from '../data/npcs.js';
import { NPC } from '../entities/npc.js';
import { RNG } from '../core/rng.js';

const rad = (d) => (d * Math.PI) / 180;

function placeParts(acc, out, x, y, z, rot) {
  for (const k of Object.keys(out)) {
    if (!acc[k]) acc[k] = [];
    for (const g of out[k]) {
      const c = g.clone();
      c.rotateY(rot);
      c.translate(x, y, z);
      acc[k].push(c);
    }
  }
}

export function buildCities(world) {
  const cities = {};
  for (const c of Object.values(CITIES)) cities[c.id] = buildCity(world, c);
  return cities;
}

function buildCity(world, C) {
  const L = CITY_LAYOUT[C.id];
  const st = L.style;
  const acc = {};
  const info = { id: C.id, name: C.name, biome: C.biome, x: C.x, z: C.z, r: C.r, buildings: {}, npcs: [], waystone: null, board: null };
  const T = world.terrain;
  const y0 = world.heightAt(C.x, C.z);
  const rng = new RNG(C.x * 13 + C.z * 7);
  const footprints = [];
  const pos = (ang, R) => ({ x: C.x + Math.sin(rad(ang)) * R, z: C.z - Math.cos(rad(ang)) * R });

  // ---- cobblestones ----
  const stones = [];
  const plazaR = C.r * 0.36 + 1.2;
  const cols = st === 'mountain' ? [0xc4c6cc, 0xb4b7bf, 0xd2d3d8, 0xa9adb6] : st === 'jungle' ? [0xd8b88a, 0xc9a576, 0xe2c79c, 0xbf9a6a] : st === 'forest' ? [0xb8b09a, 0xa8a08a, 0xc4bca6, 0x9c947e] : [0xe2d8c6, 0xd6cab4, 0xece2d0, 0xcdbfa6];
  for (let R = 1.2; R < plazaR; R += 0.78) {
    const n = Math.max(6, Math.floor((2 * Math.PI * R) / 1.05));
    const off = rng.next() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      const len = (2 * Math.PI * R) / n - 0.12;
      stones.push(part(P.box(len, 0.1, 0.66), cols[Math.floor(rng.next() * cols.length)], { x, y: 0.03, z, ry: -a + Math.PI / 2, jitter: 0.04 }));
    }
  }
  placeParts(acc, { body: stones }, C.x, y0, C.z, 0);

  // ---- plaza centrepiece ----
  if (L.plaza === 'fountain') {
    placeParts(acc, PROPS.fountain('meadow'), C.x, y0, C.z, 0);
    world.colliders.addCircle(C.x, C.z, 3.5);
  } else if (L.plaza === 'bigtree') {
    world.nodes.add({ type: 'bigoak_town', x: C.x, z: C.z, rot: 0.3, s: 1.7 });
    const ring = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ring.push(part(P.box(1.2, 0.5, 0.6), 0x9a968e, { x: Math.cos(a) * 3.2, y: 0.25, z: Math.sin(a) * 3.2, ry: -a, jitter: 0.06 })); }
    placeParts(acc, { body: ring }, C.x, y0, C.z, 0);
  } else if (L.plaza === 'brazier' || L.plaza === 'firepit') {
    const body = [part(P.cyl(2.4, 2.6, 0.6, 12), st === 'mountain' ? 0x8f8c88 : 0x8a6a4a, { y: 0.3, jitter: 0.06 }), part(P.cyl(1.6, 1.6, 0.3, 12), 0x3a3030, { y: 0.62 })];
    for (let i = 0; i < 5; i++) body.push(part(P.cyl(0.14, 0.14, 2.0, 5), 0x6a4a32, { y: 0.9, rz: Math.cos(i * 1.3) * 0.9, rx: Math.sin(i * 1.3) * 0.9 }));
    placeParts(acc, { body, glow: [part(P.cone(1.0, 1.8, 7), 0xffa030, { y: 1.5, jitter: 0 }), part(P.cone(0.6, 2.4, 6), 0xffd23a, { y: 1.7, jitter: 0 })] }, C.x, y0, C.z, 0);
    world.colliders.addCircle(C.x, C.z, 2.6);
    world.lightSources.push({ x: C.x, y: y0 + 2.2, z: C.z, color: 0xffa040, intensity: 4, distance: 16, always: false });
    info.fire = { x: C.x, y: y0 + 1.8, z: C.z };
  }

  // ---- buildings ----
  let seed = Math.abs(Math.round(C.x * 3 + C.z)) % 97;
  for (const b of L.buildings) {
    const p = pos(b.ang, b.R);
    const rot = -rad(b.ang);
    const y = world.heightAt(p.x, p.z);
    let out, hw, hd, round = 0;
    seed++;
    if (b.kind === 'house') {
      out = house({ style: st, w: b.w, d: b.d, floors: b.floors, roofColor: b.roofColor, chimney: b.chimney, sign: b.sign, awning: b.awning, roof: b.roof, seed });
      hw = b.w / 2 + 0.25; hd = b.d / 2 + 0.25;
      if (STYLES[st].stilts) { hw += 0.7; hd += 0.8; }
    } else if (b.kind === 'hut') {
      out = hut({ r: b.r, seed, flag: b.flag, sign: b.sign });
      round = b.r + 0.8;
    } else if (b.kind === 'greatTemple') {
      out = PROPS.greatTemple();
      hw = 8; hd = 7;
    }
    placeParts(acc, out, p.x, y, p.z, rot);
    const col = round ? world.colliders.addCircle(p.x, p.z, round) : world.colliders.addBox(p.x, p.z, hw, hd, rot);
    const depth = round ? round : hd;
    const fx = -Math.sin(rad(b.ang)), fz = Math.cos(rad(b.ang)); // front direction (towards plaza)
    const door = { x: p.x + fx * (depth + 1.4), z: p.z + fz * (depth + 1.4) };
    info.buildings[b.id] = { ...b, x: p.x, z: p.z, y, rot, door, fx, fz, col };
    footprints.push({ x: p.x, z: p.z, r: round || Math.hypot(hw, hd) });
    if (b.anvil) {
      const ax = door.x + Math.cos(rot) * 2.6, az = door.z - Math.sin(rot) * 2.6;
      placeParts(acc, PROPS.anvil(), ax, world.heightAt(ax, az), az, rot + 0.4);
      world.colliders.addCircle(ax, az, 0.6);
      info.anvil = { x: ax, z: az };
    }
    if (b.banners) for (const s of [-1, 1]) {
      const bx = door.x + Math.cos(rot) * s * (b.w / 2 + 0.5) - fx * 0.5, bz = door.z - Math.sin(rot) * s * (b.w / 2 + 0.5) - fz * 0.5;
      placeParts(acc, PROPS.banner(st === 'mountain' ? 0x2f4b7a : 0xd9603c), bx, world.heightAt(bx, bz), bz, rot);
    }
  }

  // ---- market stalls ----
  if (L.market) {
    const m = L.market;
    const stalls = [];
    for (let i = 0; i < m.stalls; i++) {
      const ang = m.ang + (i - (m.stalls - 1) / 2) * 28;
      const p = pos(ang, m.R);
      const rot = -rad(ang);
      const goods = st === 'jungle' ? [0xffd23a, 0xe8281e, 0x6a3e22, 0xf2b93b] : st === 'mountain' ? [0x7a3ab8, 0xe0362e, 0xffcf4a, 0xf6f2ea] : st === 'forest' ? [0xf28a1e, 0xd9a0c0, 0x9fd46a, 0xf2a91e] : [0xe8433a, 0xf28a2e, 0xf2c96a, 0xf6ead8];
      placeParts(acc, PROPS.stall(m.colors[i % m.colors.length], goods), p.x, world.heightAt(p.x, p.z), p.z, rot + Math.PI);
      world.colliders.addBox(p.x, p.z, 1.6, 0.9, rot);
      stalls.push({ x: p.x, z: p.z, rot, ang });
    }
    // the market keeper stands behind the first stall (away from the plaza centre)
    const s0 = stalls[0];
    const bx = s0.x + Math.sin(rad(s0.ang)) * 1.9, bz = s0.z - Math.cos(rad(s0.ang)) * 1.9;
    info.buildings.market = { x: s0.x, z: s0.z, rot: s0.rot, door: { x: bx, z: bz }, keeperBehind: true, ang: s0.ang };
  }

  // ---- props ----
  for (const pr of L.props || []) {
    const p = pos(pr.ang, pr.R);
    const y = world.heightAt(p.x, p.z);
    const rot = -rad(pr.ang);
    let out;
    switch (pr.kind) {
      case 'waystone': out = PROPS.waystone(); world.colliders.addCircle(p.x, p.z, 0.9); info.waystone = { x: p.x, z: p.z, y }; break;
      case 'board': out = PROPS.board(); world.colliders.addBox(p.x, p.z, 1.3, 0.3, rot); info.board = { x: p.x, z: p.z, y, rot }; break;
      case 'lamp': out = PROPS.lamp(); world.colliders.addCircle(p.x, p.z, 0.25); world.lightSources.push({ x: p.x + Math.cos(rot) * 0.42, y: y + 2.6, z: p.z - Math.sin(rot) * 0.42, color: 0xffc070, intensity: 3, distance: 12 }); break;
      case 'mushlamp': out = PROPS.mushlamp(); world.colliders.addCircle(p.x, p.z, 0.3); world.lightSources.push({ x: p.x, y: y + 1.4, z: p.z, color: 0x5ad6c8, intensity: 3, distance: 11 }); break;
      case 'bench': out = PROPS.bench(); world.colliders.addBox(p.x, p.z, 0.9, 0.3, rot); break;
      case 'flowerbed': out = PROPS.flowerbed(pr.cols); world.colliders.addBox(p.x, p.z, 1.1, 0.5, rot); break;
      case 'well': out = PROPS.well(); world.colliders.addCircle(p.x, p.z, 1.1); break;
      case 'crates': out = PROPS.crates(); world.colliders.addCircle(p.x, p.z, 1.2); break;
      case 'banner': out = PROPS.banner(pr.color ?? 0xd9603c); world.colliders.addCircle(p.x, p.z, 0.15); break;
      case 'totem': out = PROPS.totem(); world.colliders.addCircle(p.x, p.z, 0.6); break;
      case 'snowman': out = PROPS.snowman(); world.colliders.addCircle(p.x, p.z, 0.7); break;
      default: continue;
    }
    placeParts(acc, out, p.x, y, p.z, rot);
    footprints.push({ x: p.x, z: p.z, r: 1.5 });
  }

  // ---- town trees around the edge ----
  const treeTypes = { meadow: ['oak_town', 'oak_town', 'birch_town'], forest: ['bigoak_town', 'pine_town', 'birch_town', 'mushtree_glow_town'], mountain: ['pine_snow_town'], jungle: ['palm_town', 'jungle_town', 'palm_town'] }[st];
  let placed = 0, tries = 0;
  while (placed < (L.trees || 15) && tries++ < 600) {
    const a = rng.next() * Math.PI * 2, R = C.r * (0.6 + rng.next() * 0.5);
    const x = C.x + Math.sin(a) * R, z = C.z - Math.cos(a) * R;
    if (!T.walkable(x, z) || T.pathWeight(x, z) > 0.01 || T.groundAt(x, z) < 1) continue;
    if (footprints.some((f) => Math.hypot(f.x - x, f.z - z) < f.r + 3.2)) continue;
    const type = treeTypes[Math.floor(rng.next() * treeTypes.length)];
    world.nodes.add({ type, x, z, rot: rng.next() * 6.28, s: 0.9 + rng.next() * 0.3 });
    footprints.push({ x, z, r: 2.5 });
    placed++;
  }

  // ---- merge geometry ----
  const group = new THREE.Group();
  group.name = 'city_' + C.id;
  const addMesh = (key, mat, shadow = true) => {
    if (!acc[key] || !acc[key].length) return null;
    const m = new THREE.Mesh(merge(acc[key]), mat);
    m.castShadow = shadow; m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    group.add(m);
    return m;
  };
  addMesh('body', MAT.world);
  addMesh('roof', MAT.roof);
  addMesh('glow', MAT.glowWarm, false);
  addMesh('glass', MAT.glowWarm, false);
  addMesh('crystal', MAT.glowCool, false);
  addMesh('water', MAT.glowCool, false);
  addMesh('cloth', MAT.foliage);
  world.scene.add(group);
  info.group = group;

  // ---- NPCs ----
  for (const def of NPCS.filter((n) => n.city === C.id)) {
    let x, z, rot = 0;
    if (def.at) { [x, z] = def.at; }
    else {
      const b = info.buildings[def.bld];
      if (!b) { console.warn('npc building missing', def.id, def.bld); continue; }
      x = b.door.x; z = b.door.z;
      if (def.off) {
        const c = Math.cos(b.rot), s = Math.sin(b.rot);
        x += def.off[0] * c + def.off[1] * s; z += -def.off[0] * s + def.off[1] * c;
      }
      rot = Math.atan2(C.x - x, C.z - z);
      if (b.keeperBehind) rot = Math.atan2(b.x - x, b.z - z);
    }
    if (!world.walkable(x, z)) [x, z] = world.terrain.findWalkable(x, z, 6);
    const npc = new NPC(def, world, x, z, rot);
    world.addEntity(npc);
    info.npcs.push(npc);
  }
  return info;
}
