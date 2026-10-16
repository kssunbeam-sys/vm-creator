// Deterministic placement of trees, rocks and plants across the island.
import { RNG, hash2 } from '../core/rng.js';
import { smoothstep } from '../core/game.js';
import { CITIES, HOMESTEAD, SITES, DOCKS, BRIDGE, LIFT, VOLCANO } from '../data/layout.js';
import { REG, HALF, CELL, VN, N } from './terrain.js';
import { NODE_TYPES } from './nodeTypes.js';

const tables = {
  meadow: (t) => [['oak', 8 * t], ['birch', 3.5 * t], ['tallgrass', 4.5], ['flower_daisy', 4], ['flower_poppy', 2.4], ['bush_red', 1.9],
    ['rock', 1.5], ['ore_copper', 0.3], ['mush_meadow', 0.4 + 1.4 * t], ['shiny', 0.22], ['rubble_meadow', 0.12], ['pebbles', 1.3], ['log', 0.35 * t]],
  forest: (t) => [['bigoak', 5 * t], ['pine', 4.5 * t + 0.3], ['birch', 1.4 * t], ['mushtree', 0.55 * t], ['mushtree_glow', 0.3 * t], ['fern', 5.5],
    ['mush_porcini', 1.5], ['mush_glow', 0.55], ['bush_blue', 1.7], ['flower_bluebell', 2.4], ['tallgrass', 2.2], ['rock', 1.5],
    ['ore_iron', 0.4], ['ore_copper', 0.2], ['log', 1.0], ['shiny', 0.22], ['rubble_forest', 0.14], ['pebbles', 0.9]],
  mountain: (t) => [['pine_snow', 6 * t + 0.6], ['rock_mtn', 2.8], ['boulder', 1.0], ['ore_iron', 0.5], ['ore_moonstone', 0.4], ['ore_gold', 0.18],
    ['bush_frost', 1.5], ['flower_edelweiss', 1.9], ['mush_snow', 0.9], ['icecrystal', 0.7], ['tallgrass_alpine', 1.1], ['shiny', 0.22],
    ['rubble_mountain', 0.14], ['pebbles_mtn', 1.2]],
  jungle: (t) => [['jungle', 5.5 * t], ['palm', 2.2], ['bamboo', 1.9], ['bigleaf', 5], ['fern_jungle', 2.8], ['bush_sun', 1.7], ['flower_orchid', 1.9],
    ['mush_ember', 0.7], ['rock_jungle', 1.2], ['ore_volcanic', 0.2], ['tallgrass_jungle', 1.9], ['shiny', 0.22], ['rubble_jungle', 0.14]],
  ash: () => [['deadtree', 2], ['rock_ash', 3], ['ore_volcanic', 0.9], ['pebbles_ash', 2.2], ['shiny', 0.15]],
  beachWarm: () => [['palm', 2.4], ['shell', 2.2], ['sandpile', 1.3], ['driftwood', 0.6], ['pebbles', 0.5]],
  beachCool: () => [['shell', 1.6], ['sandpile', 1.2], ['driftwood', 0.9], ['pebbles', 1.0], ['rock', 0.5]],
  beachCold: () => [['pebbles_mtn', 2], ['rock_mtn', 1], ['driftwood', 0.6], ['shell', 0.6]],
  shore: () => [['reeds', 2], ['lilypad', 1.3]],
};

function pick(rng, entries) {
  let total = 0;
  for (const e of entries) total += Math.max(0, e[1]);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const e of entries) { r -= Math.max(0, e[1]); if (r <= 0) return e[0]; }
  return entries[entries.length - 1][0];
}

const BIG = new Set(['bigoak', 'jungle', 'boulder', 'mushtree', 'mushtree_glow']);

export function excluded(x, z, extra = 0) {
  for (const c of Object.values(CITIES)) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 3 + extra) ** 2) return true;
  if ((x - HOMESTEAD.x) ** 2 + (z - HOMESTEAD.z) ** 2 < (HOMESTEAD.r + 3 + extra) ** 2) return true;
  for (const s of SITES) { const r = s.kind === 'temple' ? 15 : s.kind === 'shrine' ? 13 : 11; if ((x - s.x) ** 2 + (z - s.z) ** 2 < (r + extra) ** 2) return true; }
  for (const d of Object.values(DOCKS)) if ((x - d.x) ** 2 + (z - d.z) ** 2 < (16 + extra) ** 2) return true;
  return false;
}

export function scatterOverworld(T) {
  const rng = new RNG(4242);
  const out = [];
  const step = 3.3;
  const bigCells = new Set();
  const riverBridgeX = T.riverX(BRIDGE.z);
  const liftZ = T.cliffZ(LIFT.x);
  for (let z = -HALF + 4; z < HALF - 4; z += step) {
    for (let x = -HALF + 4; x < HALF - 4; x += step) {
      const px = x + (rng.next() - 0.5) * step * 0.9;
      const pz = z + (rng.next() - 0.5) * step * 0.9;
      const h = T.groundAt(px, pz);
      if (h < -0.8) continue;
      // keep clear of the bridge and the lift
      if (Math.abs(pz - BRIDGE.z) < 8 && Math.abs(px - riverBridgeX) < BRIDGE.halfLen + 8) continue;
      if (Math.abs(px - LIFT.x) < 9 && Math.abs(pz - liftZ) < 16) continue;
      if (excluded(px, pz)) continue;
      const i = Math.round((px + HALF) / CELL), j = Math.round((pz + HALF) / CELL);
      const k = j * VN + i;
      if (T.PW[k] > 0.02) continue;
      const reg = T.RV[k];
      let table = null, p = 0.42;
      if (h < 0.15) {
        // shallows: reeds & lily pads in calm inland water only
        if (h > -0.7 && (reg === REG.MEADOW || reg === REG.FOREST) && T.landField(px, pz).main > 0.08) { table = tables.shore(); p = 0.35; }
        else continue;
      } else {
        if (!T.walkable(px, pz)) continue;
        const beach = h < 0.95;
        const t = smoothstep(0.38, 0.72, 0.5 + 0.5 * T.nC.noise(px * 0.018 + 11, pz * 0.018 - 7));
        if (beach) {
          table = reg === REG.MOUNTAIN ? tables.beachCold() : reg === REG.FOREST ? tables.beachCool() : tables.beachWarm();
          p = 0.3;
        } else if (reg === REG.MEADOW) { table = tables.meadow(t); p = 0.36; }
        else if (reg === REG.FOREST) { table = tables.forest(t); p = 0.56; }
        else if (reg === REG.MOUNTAIN) { table = tables.mountain(t); p = 0.4; }
        else if (reg === REG.JUNGLE) {
          const dv = Math.hypot(px - VOLCANO.x, pz - VOLCANO.z);
          if (dv < VOLCANO.r * 0.8) { table = tables.ash(); p = 0.28; }
          else { table = tables.jungle(t); p = 0.58; }
        }
      }
      if (!table || rng.next() > p) continue;
      const type = pick(rng, table);
      if (!type) continue;
      if (BIG.has(type)) {
        const ci = Math.floor(px / 6), cj = Math.floor(pz / 6);
        let clash = false;
        for (let a = -1; a <= 1 && !clash; a++) for (let b = -1; b <= 1; b++) if (bigCells.has((ci + a) * 10000 + (cj + b))) { clash = true; break; }
        if (clash) continue;
        bigCells.add(ci * 10000 + cj);
        if (excluded(px, pz, 4)) continue;
      }
      const sr = NODE_TYPES[type].scale;
      out.push({ type, x: px, z: pz, rot: rng.next() * Math.PI * 2, s: sr[0] + (sr[1] - sr[0]) * rng.next() });
    }
  }
  return out;
}
