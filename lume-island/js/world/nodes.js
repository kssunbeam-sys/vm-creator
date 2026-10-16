// NodeField: every tree, rock, bush and pot in a level. Drawn with instanced
// meshes that only hold the nodes near the player, rebuilt as the player moves.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { NODE_TYPES } from './nodeTypes.js';
import { RNG } from '../core/rng.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const modelCache = {};
export function nodeModel(type) {
  if (!modelCache[type]) modelCache[type] = NODE_TYPES[type].build();
  return modelCache[type];
}

const CELL = 8;
const key = (i, j) => (i + 4096) * 8192 + (j + 4096);

export class NodeField {
  constructor(level, specs, opts = {}) {
    this.level = level;
    this.opts = opts;
    this.group = new THREE.Group();
    this.group.name = 'nodes';
    level.scene.add(this.group);
    this.grid = new Map();
    this.byType = new Map();
    this.meshes = new Map();
    this.shaking = new Set();
    this.center = new THREE.Vector3(1e9, 0, 1e9);
    this.dirty = true;
    this.rng = new RNG(opts.seed ?? 99);
    this.nodes = [];
    for (const s of specs) this.add(s, false);
    for (const type of this.byType.keys()) this._ensureMeshes(type);
  }

  add(s, ensure = true) {
    const def = NODE_TYPES[s.type];
    if (!def) { console.warn('unknown node type', s.type); return null; }
    const n = {
      id: this.nodes.length, type: s.type, x: s.x, z: s.z,
      y: s.y ?? this.level.heightAt(s.x, s.z) - (def.water ? 0 : 0.05),
      rot: s.rot ?? 0, s: s.s ?? 1, alive: true, ripe: true, hp: def.hp, respawnDay: 0, shake: 0,
      col: null, _im: -1, _if: -1, _is: -1, tag: s.tag,
    };
    if (def.water) n.y = 0.03;
    this.nodes.push(n);
    if (!this.byType.has(s.type)) this.byType.set(s.type, []);
    this.byType.get(s.type).push(n);
    const k = key(Math.floor(n.x / CELL), Math.floor(n.z / CELL));
    if (!this.grid.has(k)) this.grid.set(k, []);
    this.grid.get(k).push(n);
    if (def.box) n.col = this.level.colliders.addBox(n.x, n.z, def.box[0] * n.s, def.box[1] * n.s, n.rot, { node: n });
    else if (def.r > 0) n.col = this.level.colliders.addCircle(n.x, n.z, def.r * n.s, { node: n });
    if (ensure) { this._ensureMeshes(s.type); this.dirty = true; }
    return n;
  }

  _ensureMeshes(type) {
    const count = this.byType.get(type).length;
    let entry = this.meshes.get(type);
    if (entry && entry.cap >= count) return;
    if (entry) for (const arr of [entry.main, entry.fruit, entry.stump]) for (const m of arr) { this.group.remove(m); m.dispose(); }
    const model = nodeModel(type);
    const cap = Math.max(count, 8) + 8;
    const mk = (parts) => (parts || []).map(({ geo, mat }) => {
      const im = new THREE.InstancedMesh(geo, mat, cap);
      im.count = 0;
      im.frustumCulled = false;
      const def = NODE_TYPES[type];
      im.castShadow = def.kind === 'tree' || def.kind === 'rock' || def.kind === 'bush' || def.kind === 'break' || type === 'log';
      im.receiveShadow = true;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(im);
      return im;
    });
    entry = { cap, main: mk(model.main), fruit: mk(model.fruit), stump: mk(model.stump) };
    this.meshes.set(type, entry);
    this.dirty = true;
  }

  _matrix(n, wobX = 0, wobZ = 0) {
    _p.set(n.x, n.y, n.z);
    _e.set(wobX, n.rot, wobZ, 'YXZ');
    _q.setFromEuler(_e);
    _s.set(n.s, n.s, n.s);
    return _m.compose(_p, _q, _s);
  }

  rebuild(cx, cz) {
    this.center.set(cx, 0, cz);
    this.dirty = false;
    for (const [type, list] of this.byType) {
      const def = NODE_TYPES[type];
      const entry = this.meshes.get(type);
      const r2 = (def.range * (G.settings?.viewScale ?? 1)) ** 2;
      let nm = 0, nf = 0, ns = 0;
      for (const n of list) {
        n._im = n._if = n._is = -1;
        const dx = n.x - cx, dz = n.z - cz;
        if (dx * dx + dz * dz > r2) continue;
        if (n.alive) {
          const mat = this._matrix(n);
          for (const im of entry.main) im.setMatrixAt(nm, mat);
          n._im = nm++;
          if (entry.fruit.length && n.ripe) { for (const im of entry.fruit) im.setMatrixAt(nf, mat); n._if = nf++; }
        } else if (entry.stump.length) {
          const mat = this._matrix(n);
          for (const im of entry.stump) im.setMatrixAt(ns, mat);
          n._is = ns++;
        }
      }
      for (const im of entry.main) { im.count = nm; im.instanceMatrix.needsUpdate = true; }
      for (const im of entry.fruit) { im.count = nf; im.instanceMatrix.needsUpdate = true; }
      for (const im of entry.stump) { im.count = ns; im.instanceMatrix.needsUpdate = true; }
    }
  }

  update(dt, px, pz) {
    const dx = px - this.center.x, dz = pz - this.center.z;
    if (this.dirty || dx * dx + dz * dz > 36) this.rebuild(px, pz);
    for (const n of this.shaking) {
      n.shake -= dt;
      const entry = this.meshes.get(n.type);
      const k = Math.max(0, n.shake) / 0.35;
      const w = Math.sin(n.shake * 45) * 0.09 * k;
      const mat = this._matrix(n, w * n.shakeDirZ, -w * n.shakeDirX);
      if (n._im >= 0) for (const im of entry.main) { im.setMatrixAt(n._im, mat); im.instanceMatrix.needsUpdate = true; }
      if (n._if >= 0) for (const im of entry.fruit) { im.setMatrixAt(n._if, mat); im.instanceMatrix.needsUpdate = true; }
      if (n.shake <= 0) this.shaking.delete(n);
    }
  }

  query(x, z, r, fn) {
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL);
    const j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const a = this.grid.get(key(i, j));
      if (a) for (const n of a) fn(n);
    }
  }

  // nearest live, interactive node satisfying filter
  nearest(x, z, r, filter) {
    let best = null, bd = r * r;
    this.query(x, z, r, (n) => {
      const def = NODE_TYPES[n.type];
      if (def.decor) return;
      if (!n.alive) return;
      if (def.fruitOnly && !n.ripe) return;
      if (filter && !filter(n, def)) return;
      const d = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (d < bd) { bd = d; best = n; }
    });
    return best;
  }

  shake(n, fromX, fromZ) {
    const dx = n.x - fromX, dz = n.z - fromZ, l = Math.hypot(dx, dz) || 1;
    n.shakeDirX = dx / l; n.shakeDirZ = dz / l;
    n.shake = 0.35;
    this.shaking.add(n);
  }

  // Apply a tool hit. Returns {ok, done, msg}
  hit(n, toolType, power, fromX, fromZ) {
    const def = NODE_TYPES[n.type];
    if (def.decor || !n.alive) return { ok: false };
    if (def.pick && !def.anyTool) return this.harvest(n);
    const toolOk = def.anyTool || def.tool === toolType || def.alt === toolType || (def.pick && def.anyTool);
    if (!toolOk) return { ok: false, msg: `Use a ${toolLabel(def.tool)} on this.`, need: def.tool };
    if (power < def.power) return { ok: false, msg: `Your ${toolLabel(toolType)} isn't strong enough. Upgrade it at an anvil.`, weak: true };
    const dmg = 1 + Math.max(0, power - def.power) * 0.35;
    n.hp -= dmg;
    this.shake(n, fromX, fromZ);
    if (n.hp <= 0) { this.kill(n, fromX, fromZ); return { ok: true, done: true }; }
    return { ok: true, done: false };
  }

  harvest(n) {
    const def = NODE_TYPES[n.type];
    if (!n.alive || (def.fruitOnly && !n.ripe)) return { ok: false };
    this.dropLoot(n, def);
    if (def.fruitOnly) {
      n.ripe = false;
      n.respawnDay = (G.time?.day ?? 1) + def.respawn;
      this.shake(n, n.x - 1, n.z);
    } else {
      n.alive = false;
      n.respawnDay = (G.time?.day ?? 1) + def.respawn;
      if (n.col) n.col.active = false;
    }
    this.dirty = true;
    G.events.emit('harvest', n.type, def);
    return { ok: true, done: true };
  }

  kill(n, fromX = n.x - 1, fromZ = n.z) {
    const def = NODE_TYPES[n.type];
    n.alive = false;
    n.hp = def.hp;
    n.respawnDay = (G.time?.day ?? 1) + def.respawn;
    if (n.col) n.col.active = false;
    this.dirty = true;
    if (def.kind === 'tree') this.fallEffect(n, fromX, fromZ);
    this.dropLoot(n, def);
    G.events.emit('harvest', n.type, def);
  }

  dropLoot(n, def) {
    const bonus = G.lumas?.bonus?.(def) ?? {};
    const cozy = G.save?.difficulty === 'cozy' ? 1 : 0;
    for (const [id, a, b, chance = 1] of def.drops) {
      let ch = chance * (1 + (bonus.chance || 0));
      if (Math.random() > ch) continue;
      let q = a + Math.floor(Math.random() * (b - a + 1));
      if (id !== '$' && (bonus.extra || 0) > Math.random()) q += 1;
      if (cozy && id !== '$' && id !== 'tool_token' && Math.random() < 0.3) q += 1;
      if (q > 0) G.pickups?.spawn(id, q, n.x, n.y + 0.6, n.z);
    }
    if (def.spirit && Math.random() < def.spirit[1] * (1 + (bonus.spirit || 0))) G.pickups?.spawn(def.spirit[0] + '_spirit', 1, n.x, n.y + 0.8, n.z);
    G.particles?.burst(def.kind, n.x, n.y + (def.kind === 'tree' ? 1.5 : 0.5), n.z);
  }

  fallEffect(n, fromX, fromZ) {
    const model = nodeModel(n.type);
    const g = new THREE.Group();
    for (const { geo, mat } of model.main) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m); }
    g.position.set(n.x, n.y, n.z);
    g.rotation.y = n.rot;
    g.scale.setScalar(n.s);
    const pivot = new THREE.Group();
    pivot.position.set(n.x, n.y, n.z);
    g.position.set(0, 0, 0);
    pivot.add(g);
    this.level.scene.add(pivot);
    const dx = n.x - fromX, dz = n.z - fromZ, l = Math.hypot(dx, dz) || 1;
    const ax = new THREE.Vector3(dz / l, 0, -dx / l);
    let t = 0;
    const off = this.level.addUpdater((dt) => {
      t += dt;
      const k = Math.min(1, t / 0.9);
      pivot.setRotationFromAxisAngle(ax, (k * k) * Math.PI / 2 * 0.95);
      if (t > 0.9) { const f = Math.min(1, (t - 0.9) / 0.5); pivot.scale.setScalar(1 - f); }
      if (t > 0.9 && !pivot.userData.thud) { pivot.userData.thud = true; G.audio?.play('thud'); G.cam?.addShake(0.25); G.particles?.burst('leaves', n.x + dx / l * 3, n.y + 0.5, n.z + dz / l * 3); }
      if (t > 1.4) { this.level.scene.remove(pivot); off(); }
    });
  }

  newDay(day) {
    for (const n of this.nodes) {
      const def = NODE_TYPES[n.type];
      if (n.respawnDay && n.respawnDay <= day) {
        if (!n.alive) {
          if (G.player && G.level === this.level && Math.hypot(G.player.pos.x - n.x, G.player.pos.z - n.z) < def.r + 0.8) continue;
          n.alive = true; n.hp = def.hp; if (n.col) n.col.active = true;
        }
        n.ripe = true;
        n.respawnDay = 0;
      }
    }
    this.dirty = true;
  }

  respawnAll() {
    for (const n of this.nodes) { const def = NODE_TYPES[n.type]; n.alive = true; n.ripe = true; n.hp = def.hp; n.respawnDay = 0; if (n.col) n.col.active = true; }
    this.dirty = true;
  }

  serialize() {
    const out = {};
    for (const n of this.nodes) if (n.respawnDay) out[n.id] = [n.alive ? 1 : 0, n.ripe ? 1 : 0, n.respawnDay];
    return out;
  }
  deserialize(data) {
    if (!data) return;
    for (const id in data) {
      const n = this.nodes[id];
      if (!n) continue;
      const [alive, ripe, day] = data[id];
      n.alive = !!alive; n.ripe = !!ripe; n.respawnDay = day;
      if (n.col) n.col.active = n.alive;
    }
    this.dirty = true;
  }
}

export function toolLabel(t) {
  return { axe: 'Axe', pickaxe: 'Pickaxe', shovel: 'Shovel', rod: 'Fishing Rod', whip: 'Whip', net: 'Bug Net' }[t] || 'tool';
}
