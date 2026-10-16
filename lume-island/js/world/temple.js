// Temples and crystal ruins: rooms assembled from ASCII maps with working
// puzzle mechanisms, traps, chests, keys and rewards.
import * as THREE from '../three.js';
import { G, clamp } from '../core/game.js';
import { TileLevel, T, TS } from './tilelevel.js';
import { TEMPLES } from '../data/temples.js';
import { part, merge, P, jiggle } from '../core/geo.js';
import { MAT } from './materials.js';
import { NodeField } from './nodes.js';
import { ITEMS } from '../data/items.js';

const S = { flat: false, jitter: 0 };
const DIR = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] };
const DIR_ORDER = ['N', 'E', 'S', 'W'];
const dirAngle = (d) => ({ N: Math.PI, E: Math.PI / 2, S: 0, W: -Math.PI / 2 }[d]); // rotation.y so local +z points that way
const BEAM_PASS = new Set([T.FLOOR, T.PLATE, T.ICE, T.SPIKES, T.LAVA, T.WATER, T.PIT, T.MEM, T.ENTRY]);

function mesh(parts, mat = MAT.world, shadow = true) {
  const m = new THREE.Mesh(merge(parts), mat);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

export class TempleLevel extends TileLevel {
  constructor(id, site) {
    const def = TEMPLES[id];
    super(id, def.daily ? 'ruin' : 'temple', def.theme);
    this.def = def;
    this.title = def.title;
    this.biome = site?.biome || 'meadow';
    this.site = site;
    if (!G.save.temples[id]) G.save.temples[id] = { solved: [], chests: [], keys: [], doors: [], done: false };
    this.prog = G.save.temples[id];
    if (def.daily && this.prog.day !== G.time.day) Object.assign(this.prog, { solved: [], chests: [], keys: [], doors: [], day: G.time.day });
    this.rooms = [];
    this.mechs = [];
    this.hazards = [];
    this.beams = [];
    this.assemble();
    this.buildStatic();
    this.buildObjects();
    this.beamGroup = new THREE.Group();
    this.scene.add(this.beamGroup);
    this.beamPool = [];
    this.curRoom = 0;
    this.leftEntry = false;
    this.slideCool = 0;
    this.pushT = 0;
    for (const i of this.prog.solved) if (this.rooms[i]) this.solve(i, true);
    this.whipOff = G.events.on('whip', (x, z) => { if (G.level === this) this.onWhip(x, z); });
  }

  // ---------- assembly ----------
  assemble() {
    const placed = [];
    let prevDoorX = 0, prevTop = 0;
    this.def.rooms.forEach((room, i) => {
      const rows = room.map.slice().reverse();
      const h = rows.length, w = rows[0].length;
      const entryX = rows[0].indexOf('e');
      const top = rows[h - 1];
      const doorX = Math.max(top.indexOf('D'), top.indexOf('l'));
      const ox = i === 0 ? 0 : prevDoorX - entryX;
      const oy = i === 0 ? 0 : prevTop;
      placed.push({ room, rows, ox, oy, w, h, entryX, doorX });
      prevDoorX = ox + doorX; prevTop = oy + h - 1;
    });
    const minX = Math.min(...placed.map((p) => p.ox));
    const maxX = Math.max(...placed.map((p) => p.ox + p.w - 1));
    const maxY = Math.max(...placed.map((p) => p.oy + p.h - 1));
    this.W = maxX - minX + 3; this.H = maxY + 3;
    this.tiles = new Uint8Array(this.W * this.H);
    this.roomOf = new Int16Array(this.W * this.H).fill(-1);
    this.chars = [];
    placed.forEach((p, i) => {
      p.ox += 1 - minX; p.oy += 1;
      const info = { i, def: p.room, ox: p.ox, oy: p.oy, w: p.w, h: p.h, plates: [], blocks: [], timed: [], levers: [], statues: [], receivers: [], sources: [], mem: null, door: null, solved: false, spawns: [], visited: false };
      info.entry = { gx: p.ox + p.entryX, gy: p.oy };
      info.respawn = this.toWorld(info.entry.gx, info.entry.gy + 1);
      this.rooms.push(info);
      for (let ly = 0; ly < p.h; ly++) {
        for (let lx = 0; lx < p.w; lx++) {
          const c = p.rows[ly][lx];
          const gx = p.ox + lx, gy = p.oy + ly;
          const k = gy * this.W + gx;
          const existing = this.tiles[k];
          if (ly === 0 && i > 0 && existing === T.DOOR) continue; // shared door tile belongs to the room below
          if (ly === 0 && i > 0 && c === '#' && existing) continue;
          this.tiles[k] = this.tileFor(c);
          this.roomOf[k] = i;
          if (c !== '#' && c !== '.' && c !== ' ') this.chars.push({ c, gx, gy, room: i, ly, lx });
        }
      }
    });
    const r0 = this.rooms[0];
    this.entryTile = { gx: r0.entry.gx, gy: r0.entry.gy };
    this.set(r0.entry.gx, r0.entry.gy, T.ENTRY);
    const [ex, ez] = this.toWorld(r0.entry.gx, r0.entry.gy + 1);
    this.entry = { x: ex, z: ez };
  }
  tileFor(c) {
    switch (c) {
      case '#': return T.WALL; case ' ': return T.VOID; case 'D': case 'l': return T.DOOR; case 'P': return T.PLATE;
      case '^': return T.SPIKES; case 'i': return T.ICE; case '~': return T.WATER; case 'L': return T.LAVA; case '_': return T.PIT;
      case '1': case '2': case '3': case '4': return T.MEM; case 'e': return T.FLOOR;
      default: return T.FLOOR;
    }
  }

  // ---------- objects ----------
  buildObjects() {
    const nodeSpecs = [];
    const lvRooms = new Map();
    for (const ch of this.chars) {
      const { c, gx, gy, room } = ch;
      const R = this.rooms[room];
      const [x, z] = this.toWorld(gx, gy);
      const key = this.key(gx, gy);
      switch (c) {
        case 'D': case 'l': this.makeDoor(R, gx, gy, c === 'l'); break;
        case 'P': R.plates.push(this.makePlate(gx, gy)); break;
        case 'B': R.blocks.push(this.makeBlock(gx, gy)); break;
        case 'T': R.timed.push(this.makeTimed(R, gx, gy)); break;
        case 'S': { const lv = this.makeLever(R, gx, gy); R.levers.push(lv); break; }
        case 'R': R.statues.push(this.makeStatue(R, gx, gy)); break;
        case 'C': R.crystal = this.makeCrystal(gx, gy); break;
        case 'O': R.sources.push(this.makeSource(R, gx, gy)); break;
        case 'm': case 'n': case '/': case '\\': this.makeMirror(R, gx, gy, c); break;
        case 'X': R.receivers.push(this.makeReceiver(gx, gy)); break;
        case '^': this.makeSpikes(R, gx, gy); break;
        case 'F': this.makeFire(R, gx, gy); break;
        case 'o': this.makeLog(R, gx, gy); break;
        case '*': this.makeBlade(R, gx, gy); break;
        case 'r': this.makeStatic(gx, gy, 'boulder'); break;
        case 'p': this.makeStatic(gx, gy, 'pillar'); break;
        case 't': this.makeStatic(gx, gy, 'brazier'); break;
        case 'Q': R.memPillar = this.makeMemPillar(R, gx, gy); break;
        case '1': case '2': case '3': case '4': (R.memTiles = R.memTiles || []).push(this.makeMemTile(gx, gy, +c)); break;
        case 'c': this.makeChest(R, gx, gy, false); break;
        case 'K': this.makeChest(R, gx, gy, true); break;
        case 'k': this.makeKey(R, gx, gy); break;
        case 'v': nodeSpecs.push({ type: Math.random() < 0.5 ? 'pot' : 'pot_blue', x, z, rot: Math.random() * 6, s: 1 }); break;
        case 'x': nodeSpecs.push({ type: 'rubble_' + this.biome, x, z, rot: Math.random() * 6, s: 1 }); break;
        case 's': R.spawns.push({ type: 'spider', x, z }); break;
        case 'g': R.spawns.push({ type: 'ghost', x, z }); break;
      }
    }
    for (const R of this.rooms) {
      if (R.def.levers) R.levers.sort((a, b) => a.gx - b.gx || a.gy - b.gy).forEach((lv, i) => lv.setOn(!!R.def.levers[i], true));
      if (R.def.statues) {
        const order = R.statues.slice().sort((a, b) => b.gy - a.gy || a.gx - b.gx);
        order.forEach((st, i) => st.setDir(R.def.statues[i] || 'N', true));
      }
      if (R.memTiles) R.mem = { seq: R.def.seq, step: 0, playing: false, done: false };
    }
    this.nodes = new NodeField(this, nodeSpecs, { seed: 11 });
  }

  addMech(m) { this.mechs.push(m); if (m.object) this.scene.add(m.object); return m; }
  block(gx, gy, obj) { this.blocked.set(this.key(gx, gy), obj); }
  unblock(gx, gy) { this.blocked.delete(this.key(gx, gy)); }

  makeDoor(R, gx, gy, locked) {
    const [x, z] = this.toWorld(gx, gy);
    const acc = this.theme.accent;
    const parts = [part(P.box(TS, 3.2, 0.6), locked ? 0x6a5a48 : 0x8a7a64, { y: 1.6, jitter: 0.05 })];
    parts.push(part(P.box(TS * 0.7, 2.4, 0.66), locked ? 0x8a6a3a : 0x9a8a72, { y: 1.5, jitter: 0 }));
    const glow = [part(P.octa(0.28, 0), acc, { y: 2.2, z: 0.34, sz: 0.4 }), part(P.box(0.08, 1.2, 0.04), acc, { y: 1.1, z: 0.34 })];
    if (locked) { glow.length = 0; parts.push(part(P.torus(0.3, 0.08, 6, 12), 0xc9a040, { y: 1.5, z: 0.36 }), part(P.box(0.12, 0.3, 0.05), 0x2a2020, { y: 1.45, z: 0.4 })); }
    const g = new THREE.Group();
    g.add(mesh(parts));
    if (glow.length) g.add(mesh(glow, MAT.glowCool, false));
    g.position.set(x, 0, z);
    const door = { gx, gy, object: g, open: false, locked, t: 0, update: (dt) => {
      if (door.open && door.t < 1) { door.t = Math.min(1, door.t + dt * 1.1); g.position.y = -3.4 * door.t * door.t; if (door.t >= 1) g.visible = false; }
    } };
    this.block(gx, gy, door);
    R.door = door;
    this.addMech(door);
    if (locked) {
      this.addInteractable({ x, z, r: 0.9, h: 3.2, enabled: true, door, canInteract: () => !door.open, label: () => (G.inv.has('temple_key') ? 'Unlock the door' : 'Locked door'), onInteract: () => {
        if (!G.inv.has('temple_key')) { G.ui.toast('It is locked. The key must be somewhere in this room.', 'info'); return; }
        G.inv.remove('temple_key', 1);
        this.solve(R.i);
      } });
    }
  }
  openDoor(door, instant) {
    if (!door || door.open) return;
    door.open = true;
    this.unblock(door.gx, door.gy);
    if (instant) { door.t = 1; door.object.visible = false; }
    else { G.audio?.play('door'); G.cam.addShake(0.2); }
  }
  makePlate(gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const g = new THREE.Group();
    g.add(mesh([part(P.box(TS * 0.8, 0.16, TS * 0.8), 0x9a8e7e, { y: 0.02, jitter: 0.03 })], MAT.world, false));
    const rune = mesh([part(P.box(TS * 0.4, 0.05, TS * 0.4), this.theme.accent, { y: 0.11, ry: Math.PI / 4, jitter: 0 })], MAT.glowCool, false);
    g.add(rune);
    g.position.set(x, 0, z);
    const plate = { gx, gy, object: g, pressed: false, rune, update: () => {
      const pt = this.toTile(G.player.pos.x, G.player.pos.z);
      const b = this.blocked.get(this.key(gx, gy));
      plate.pressed = (b && b.isBlock) || (pt[0] === gx && pt[1] === gy);
      g.position.y = plate.pressed ? -0.08 : 0;
      rune.visible = plate.pressed;
    } };
    return this.addMech(plate);
  }
  makeBlock(gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const parts = [part(P.box(TS * 0.92, 1.7, TS * 0.92), 0xa89a82, { y: 0.85, jitter: 0.06 })];
    parts.push(part(P.box(TS * 0.6, 0.06, TS * 0.94), 0x7a6e5e, { y: 1.71, jitter: 0 }), part(P.box(TS * 0.94, 0.06, TS * 0.6), 0x7a6e5e, { y: 1.71, jitter: 0 }));
    const g = mesh(parts);
    g.position.set(x, 0, z);
    const b = { isBlock: true, gx, gy, object: g, moving: 0, from: null, to: null, update: (dt) => {
      if (b.moving > 0) {
        b.moving = Math.max(0, b.moving - dt / 0.22);
        const k = 1 - b.moving;
        g.position.set(b.from[0] + (b.to[0] - b.from[0]) * k, 0, b.from[1] + (b.to[1] - b.from[1]) * k);
      }
    } };
    this.block(gx, gy, b);
    return this.addMech(b);
  }
  tryPush(b, dx, dy) {
    let tx = b.gx + dx, ty = b.gy + dy;
    const ok = (gx, gy) => { const t = this.get(gx, gy); return (t === T.FLOOR || t === T.PLATE || t === T.ICE || t === T.MEM || t === T.SPIKES) && !this.blocked.has(this.key(gx, gy)); };
    if (!ok(tx, ty)) return false;
    while (this.get(tx, ty) === T.ICE && ok(tx + dx, ty + dy)) { tx += dx; ty += dy; }
    this.unblock(b.gx, b.gy);
    b.from = this.toWorld(b.gx, b.gy);
    b.gx = tx; b.gy = ty;
    b.to = this.toWorld(tx, ty);
    b.moving = 1;
    this.block(tx, ty, b);
    G.audio?.play('push');
    G.particles?.burst('dig', b.from[0], 0.2, b.from[1], { n: 5 });
    return true;
  }
  makeTimed(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const g = new THREE.Group();
    g.add(mesh([part(P.cyl(0.55, 0.7, 1.6, 8), 0x9a8e7e, { y: 0.8, jitter: 0.05 }), part(P.cyl(0.65, 0.65, 0.2, 8), 0x7a6e5e, { y: 1.65 })]));
    const orbOff = mesh([part(P.sphere(0.4, 12, 10), 0x5a6a78, S)], MAT.world, false);
    const orbOn = mesh([part(P.sphere(0.42, 12, 10), this.theme.accent, S)], MAT.glowCool, false);
    orbOff.position.y = orbOn.position.y = 2.15;
    g.add(orbOff, orbOn);
    g.position.set(x, 0, z);
    const timer = R.def.timer || 7;
    const sw = { gx, gy, object: g, t: 0, get on() { return this.t > 0 || R.solved; }, activate: () => {
      if (R.solved) return;
      sw.t = timer; G.audio?.play('switch'); G.particles?.burst('magic', x, 2.2, z, { n: 8 });
    }, update: (dt) => {
      if (sw.t > 0 && !R.solved) { sw.t -= dt; if (sw.t <= 0) G.audio?.play('switchOff'); else if (Math.floor(sw.t * 2) !== Math.floor((sw.t + dt) * 2)) G.audio?.play('tick'); }
      const on = sw.on;
      orbOn.visible = on; orbOff.visible = !on;
      if (on) orbOn.scale.setScalar(R.solved ? 1 : 0.6 + 0.4 * (sw.t / timer) + Math.sin(G.elapsed * 10) * 0.03);
    } };
    this.block(gx, gy, sw);
    this.addInteractable({ x, z, r: 0.8, h: 2.8, label: () => (sw.on ? 'Glowing...' : 'Touch the pillar'), canInteract: () => !R.solved, onInteract: () => sw.activate() });
    return this.addMech(sw);
  }
  makeLever(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const g = new THREE.Group();
    g.add(mesh([part(P.box(1.0, 0.4, 0.8), 0x8a7e6e, { y: 0.2 }), part(P.box(0.7, 0.3, 0.5), 0x6a5e4e, { y: 0.5 })]));
    const arm = new THREE.Group();
    arm.position.y = 0.6;
    arm.add(mesh([part(P.cyl(0.07, 0.07, 1.1, 6), 0x5a4a3a, { y: 0.55 }), part(P.sphere(0.16, 8, 6), 0xd9443a, { ...S, y: 1.12 })]));
    g.add(arm);
    const lamp = mesh([part(P.sphere(0.14, 8, 6), 0x7aff8a, S)], MAT.glowCool, false);
    lamp.position.set(0, 0.75, 0.42);
    g.add(lamp);
    g.position.set(x, 0, z);
    const lv = { gx, gy, object: g, on: false, setOn: (v, instant) => { lv.on = v; arm.rotation.z = v ? -0.6 : 0.6; lamp.visible = v; }, toggle: () => {
      if (R.solved) return;
      const list = R.levers;
      const i = list.indexOf(lv);
      const flip = R.def.chain ? [i - 1, i, i + 1] : [i];
      for (const j of flip) if (list[j]) list[j].setOn(!list[j].on);
      G.audio?.play('lever');
    } };
    this.block(gx, gy, lv);
    this.addInteractable({ x, z, r: 0.6, h: 2.0, label: 'Pull the lever', canInteract: () => !R.solved, onInteract: () => lv.toggle() });
    return this.addMech(lv);
  }
  makeStatue(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const g = new THREE.Group();
    g.add(mesh([part(P.cyl(0.7, 0.8, 0.5, 8), 0x8a8478, { y: 0.25 })]));
    const bird = new THREE.Group();
    bird.position.y = 0.5;
    bird.add(mesh([
      part(P.sphere(0.55, 10, 8), 0xc8c0b0, { ...S, y: 0.65, sy: 1.2 }),
      part(P.sphere(0.38, 10, 8), 0xc8c0b0, { ...S, y: 1.45, z: 0.12 }),
      part(P.cone(0.13, 0.5, 6), 0xd9a04a, { y: 1.42, z: 0.6, rx: Math.PI / 2 }),
      part(P.sphere(0.07, 6, 5), 0x2a2020, { ...S, x: 0.18, y: 1.55, z: 0.42 }),
      part(P.sphere(0.07, 6, 5), 0x2a2020, { ...S, x: -0.18, y: 1.55, z: 0.42 }),
      part(P.sphere(0.35, 8, 6), 0xb8b0a0, { ...S, x: 0.45, y: 0.7, z: -0.1, sx: 0.3, sy: 1.1 }),
      part(P.sphere(0.35, 8, 6), 0xb8b0a0, { ...S, x: -0.45, y: 0.7, z: -0.1, sx: 0.3, sy: 1.1 }),
    ]));
    g.add(bird);
    g.position.set(x, 0, z);
    const st = { gx, gy, object: g, dir: 'N', target: 0, setDir: (d, instant) => { st.dir = d; st.target = dirAngle(d); if (instant) bird.rotation.y = st.target; }, rotate: () => {
      if (R.solved) return;
      st.setDir(DIR_ORDER[(DIR_ORDER.indexOf(st.dir) + 1) % 4]);
      G.audio?.play('stone');
    }, update: (dt) => {
      let d = st.target - bird.rotation.y;
      d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      bird.rotation.y += d * Math.min(1, dt * 8);
    }, faces: () => {
      const c = R.crystal;
      if (!c) return false;
      const [dx, dy] = DIR[st.dir];
      let cx = st.gx + dx, cy = st.gy + dy;
      for (let k = 0; k < 40; k++) {
        if (cx === c.gx && cy === c.gy) return true;
        if (!BEAM_PASS.has(this.get(cx, cy)) || this.blocked.has(this.key(cx, cy))) return false;
        cx += dx; cy += dy;
      }
      return false;
    } };
    this.block(gx, gy, st);
    this.addInteractable({ x, z, r: 0.8, h: 2.8, label: 'Turn the statue', canInteract: () => !R.solved, onInteract: () => st.rotate() });
    return this.addMech(st);
  }
  makeCrystal(gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const g = new THREE.Group();
    g.add(mesh([part(P.cyl(0.6, 0.75, 0.6, 8), 0x8a8478, { y: 0.3 })]));
    const cr = mesh([part(P.octa(0.6, 0), this.theme.accent, { y: 1.6, sy: 1.6, jitter: 0.08 })], MAT.glowCool, false);
    g.add(cr);
    g.position.set(x, 0, z);
    const c = { gx, gy, object: g, cr, update: () => { cr.rotation.y += 0.01; } };
    this.block(gx, gy, c);
    return this.addMech(c);
  }
  makeSource(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const d = R.def.beam || 'N';
    const g = new THREE.Group();
    g.add(mesh([part(P.box(1.2, 1.0, 1.2), 0x9a8e7e, { y: 0.5 }), part(P.cyl(0.35, 0.45, 0.6, 8), 0x8a7e6e, { y: 1.2, z: 0.3, rx: Math.PI / 2 })]));
    g.add(mesh([part(P.sphere(0.32, 10, 8), 0xfff2a0, { ...S, y: 1.2, z: 0.62 })], MAT.unlit, false));
    g.rotation.y = dirAngle(d);
    g.position.set(x, 0, z);
    const s = { gx, gy, object: g, dir: d };
    this.block(gx, gy, s);
    this.lightSources.push({ x, y: 1.6, z, color: 0xfff2a0, intensity: 2, distance: 8, always: true });
    return this.addMech(s);
  }
  makeMirror(R, gx, gy, c) {
    const [x, z] = this.toWorld(gx, gy);
    const rotatable = c === 'm' || c === 'n';
    const g = new THREE.Group();
    g.add(mesh([part(P.cyl(0.55, 0.65, 0.35, 8), rotatable ? 0x9a8e7e : 0x6a5e4e, { y: 0.17 })]));
    const panel = new THREE.Group();
    panel.position.y = 0.35;
    panel.add(mesh([part(P.box(1.5, 1.3, 0.12), 0xc8d8e8, { y: 0.7, jitter: 0 }), part(P.box(1.62, 1.42, 0.1), rotatable ? 0xc9a040 : 0x5a5a64, { y: 0.7, z: -0.04, jitter: 0 })], MAT.glowCool, true));
    g.add(panel);
    g.position.set(x, 0, z);
    const m = { gx, gy, object: g, isMirror: true, kind: c === 'm' || c === '/' ? '/' : '\\', target: 0, update: (dt) => {
      let d = m.target - panel.rotation.y;
      panel.rotation.y += d * Math.min(1, dt * 10);
    } };
    // '/' runs bottom-left to top-right on the map: panel rotated -45deg (x right, north up = -z)
    const setRot = (instant) => { m.target = m.kind === '/' ? Math.PI / 4 : -Math.PI / 4; if (instant) panel.rotation.y = m.target; };
    setRot(true);
    this.block(gx, gy, m);
    if (rotatable) this.addInteractable({ x, z, r: 0.8, h: 2.4, label: 'Turn the mirror', canInteract: () => !R.solved, onInteract: () => { m.kind = m.kind === '/' ? '\\' : '/'; setRot(false); G.audio?.play('stone'); } });
    return this.addMech(m);
  }
  makeReceiver(gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const g = new THREE.Group();
    g.add(mesh([part(P.cyl(0.6, 0.75, 0.7, 8), 0x8a8478, { y: 0.35 })]));
    const off = mesh([part(P.octa(0.5, 0), 0x6a7a8a, { y: 1.5, sy: 1.5 })]);
    const on = mesh([part(P.octa(0.55, 0), 0xfff2a0, { y: 1.5, sy: 1.5 })], MAT.unlit, false);
    g.add(off, on);
    g.position.set(x, 0, z);
    const r = { gx, gy, object: g, lit: false, update: () => { on.visible = r.lit; off.visible = !r.lit; on.rotation.y += 0.02; } };
    this.block(gx, gy, r);
    return this.addMech(r);
  }
  makeSpikes(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const base = mesh([part(P.box(TS * 0.9, 0.08, TS * 0.9), 0x5a5048, { y: 0.02, jitter: 0 })], MAT.world, false);
    base.position.set(x, 0, z);
    this.scene.add(base);
    const sp = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) sp.push(part(P.cone(0.13, 0.7, 4), this.def.theme === 'mountain' ? 0xd8f0ff : 0xc8c8d0, { x: -0.6 + i * 0.4, y: 0.35, z: -0.6 + j * 0.4, jitter: 0 }));
    const g = mesh(sp);
    g.position.set(x, -0.75, z);
    const off = (gx * 0.35 + gy * 0.6) % 2.6;
    const h = { gx, gy, object: g, up: false, update: (dt) => {
      const ph = (G.elapsed + off) % 2.6;
      const target = ph < 1.0 ? 0 : -0.75;
      h.up = ph < 1.0;
      g.position.y += (target - g.position.y) * Math.min(1, dt * 18);
      if (h.up && !h.wasUp && R === this.rooms[this.curRoom]) G.audio?.play('spike', 0.4);
      h.wasUp = h.up;
      if (h.up) { const pt = this.toTile(G.player.pos.x, G.player.pos.z); if (pt[0] === gx && pt[1] === gy) this.trap(R, 'spikes'); }
    } };
    this.addMech(h);
  }
  makeFire(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const fireDirs = R.def.fire || ['E'];
    R._fi = (R._fi || 0);
    const d = fireDirs[R._fi++ % fireDirs.length];
    const [dx, dy] = DIR[d];
    let len = 0;
    while (len < 5 && BEAM_PASS.has(this.get(gx + dx * (len + 1), gy + dy * (len + 1)))) len++;
    const g = new THREE.Group();
    const head = mesh([part(P.box(1.4, 1.4, 1.4), 0x7a6a5a, { y: 0.7 }), part(P.box(0.6, 0.6, 0.3), 0x2a1a10, { y: 0.8, z: 0.72 })]);
    head.rotation.y = dirAngle(d);
    g.add(head);
    const flame = mesh([part(P.cyl(0.25, 0.65, len * TS, 7), 0xffa030, { y: 0, jitter: 0 }), part(P.cyl(0.12, 0.35, len * TS, 6), 0xffe066, { jitter: 0 })], MAT.unlit, false);
    flame.rotation.x = Math.PI / 2;
    const fg = new THREE.Group();
    fg.add(flame);
    flame.position.z = (len * TS) / 2 + 0.7;
    fg.position.y = 0.85;
    fg.rotation.y = dirAngle(d);
    g.add(fg);
    g.position.set(x, 0, z);
    this.block(gx, gy, { fire: true });
    const off = (gx + gy) * 0.4;
    const f = { object: g, update: (dt) => {
      const ph = (G.elapsed + off) % 3.4;
      const on = ph > 1.8 && ph < 3.2, warn = ph > 1.4 && ph <= 1.8;
      fg.visible = on || warn;
      flame.scale.set(warn ? 0.3 : 1, warn ? 0.15 : 1 + Math.sin(G.elapsed * 30) * 0.05, warn ? 0.3 : 1);
      if (on && R === this.rooms[this.curRoom]) {
        if (!f.wasOn) G.audio?.play('fire', 0.5);
        const pt = this.toTile(G.player.pos.x, G.player.pos.z);
        for (let k = 1; k <= len; k++) if (pt[0] === gx + dx * k && pt[1] === gy + dy * k) { this.trap(R, 'fire'); break; }
        if (Math.random() < 0.3) G.particles?.burst('fire', x + dx * TS * (1 + Math.random() * len), 1, z - dy * TS * (1 + Math.random() * len), { n: 1 });
      }
      f.wasOn = on;
    } };
    this.addMech(f);
    this.lightSources.push({ x, y: 1.5, z, color: 0xff8a2a, intensity: 1.5, distance: 8, always: true });
  }
  makeLog(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const g = mesh([part(P.cyl(0.6, 0.6, TS * 1.5, 10), 0x8a5a32, { rx: Math.PI / 2, y: 0.6 }), part(P.cyl(0.5, 0.5, TS * 1.52, 10), 0xd9b27a, { rx: Math.PI / 2, y: 0.6, jitter: 0 })]);
    // rolls along x between walls
    let minX = gx, maxX = gx;
    while (BEAM_PASS.has(this.get(minX - 1, gy))) minX--;
    while (BEAM_PASS.has(this.get(maxX + 1, gy))) maxX++;
    const a = this.toWorld(minX, gy)[0], b = this.toWorld(maxX, gy)[0];
    g.position.set(x, 0, z);
    const lg = { object: g, x, v: 6.5, update: (dt) => {
      lg.x += lg.v * dt;
      if (lg.x > b) { lg.x = b; lg.v = -Math.abs(lg.v); }
      if (lg.x < a) { lg.x = a; lg.v = Math.abs(lg.v); }
      g.position.x = lg.x;
      g.rotation.z -= lg.v * dt / 0.6;
      const p = G.player.pos;
      if (Math.abs(p.z - z) < 1.6 && Math.abs(p.x - lg.x) < 1.0) this.trap(R, 'log', lg.x, z);
    } };
    this.addMech(lg);
  }
  makeBlade(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const g = new THREE.Group();
    g.add(mesh([part(P.cyl(0.3, 0.4, 1.2, 8), 0x5a5a64, { y: 0.6 })]));
    const arm = mesh([part(P.box(TS * 5, 0.12, 0.35), 0xc8c8d0, { y: 1.0, jitter: 0 }), part(P.cyl(0.2, 0.2, 0.3, 8), 0x3a3a44, { y: 1.0 })]);
    g.add(arm);
    g.position.set(x, 0, z);
    this.block(gx, gy, { blade: true });
    const bl = { object: g, update: (dt) => {
      arm.rotation.y += dt * 1.6;
      const a = arm.rotation.y;
      const ux = Math.cos(a), uz = -Math.sin(a);
      const p = G.player.pos;
      const rx = p.x - x, rz = p.z - z;
      const along = rx * ux + rz * uz;
      const perp = Math.abs(-rx * uz + rz * ux);
      if (Math.abs(along) < TS * 2.5 && perp < 0.55) this.trap(R, 'blade', x, z);
    } };
    this.addMech(bl);
  }
  makeStatic(gx, gy, kind) {
    const [x, z] = this.toWorld(gx, gy);
    let m;
    if (kind === 'boulder') m = mesh([jiggle(part(P.dodeca(0.95, 0), 0x9aa4b4, { y: 0.8, jitter: 0.08 }), 0.15, gx * 3 + gy)]);
    else if (kind === 'pillar') m = mesh([part(P.cyl(0.6, 0.7, 3.4, 8), this.theme.wall, { y: 1.7 }), part(P.box(1.5, 0.3, 1.5), this.theme.wall, { y: 3.45 }), part(P.box(1.5, 0.3, 1.5), this.theme.wall, { y: 0.15 })]);
    else {
      m = new THREE.Group();
      m.add(mesh([part(P.cyl(0.5, 0.3, 0.5, 8), 0x7a6a5a, { y: 1.25 }), part(P.cyl(0.12, 0.2, 1.0, 6), 0x5a4a3a, { y: 0.5 })]));
      m.add(mesh([part(P.cone(0.35, 0.8, 6), 0xffa030, { y: 1.85, jitter: 0 }), part(P.cone(0.2, 0.9, 5), 0xffe066, { y: 1.9, jitter: 0 })], MAT.unlit, false));
      this.lightSources.push({ x, y: 2.2, z, color: 0xffa040, intensity: 3.2, distance: 12, always: true });
    }
    m.position.set(x, 0, z);
    this.scene.add(m);
    this.block(gx, gy, { kind });
  }
  makeMemPillar(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const g = new THREE.Group();
    g.add(mesh([part(P.cyl(0.6, 0.75, 2.0, 8), 0x9a8e7e, { y: 1.0 }), part(P.octa(0.4, 0), this.theme.accent, { y: 2.4, sy: 1.4 })]));
    g.position.set(x, 0, z);
    this.block(gx, gy, { kind: 'mem' });
    this.addInteractable({ x, z, r: 0.8, h: 3.0, label: 'Touch the echo pillar', canInteract: () => !R.solved && !R.mem?.playing, onInteract: () => this.playMem(R) });
    return this.addMech({ object: g });
  }
  makeMemTile(gx, gy, n) {
    const [x, z] = this.toWorld(gx, gy);
    const g = new THREE.Group();
    g.add(mesh([part(P.box(TS * 0.86, 0.14, TS * 0.86), 0x8a8478, { y: 0.02, jitter: 0 })], MAT.world, false));
    const shapes = [null, P.sphere(0.35, 10, 4), P.cone(0.42, 0.1, 3), P.box(0.6, 0.1, 0.6), P.cone(0.42, 0.1, 4)];
    const sym = mesh([part(shapes[n], 0x5a6a78, { y: 0.12, sy: n === 1 ? 0.15 : 1, jitter: 0 })], MAT.world, false);
    const lit = mesh([part(shapes[n], 0xfff2a0, { y: 0.14, sy: n === 1 ? 0.18 : 1.2, s: 1.1, jitter: 0 })], MAT.unlit, false);
    lit.visible = false;
    g.add(sym, lit);
    g.position.set(x, 0, z);
    const t = { gx, gy, n, object: g, lit, glowT: 0, red: 0, update: (dt) => {
      if (t.glowT > 0) t.glowT -= dt;
      lit.visible = t.glowT > 0 || t.hold;
      if (t.red > 0) { t.red -= dt; lit.visible = Math.floor(t.red * 10) % 2 === 0; }
    } };
    return this.addMech(t);
  }
  playMem(R) {
    const m = R.mem;
    if (!m || m.playing) return;
    m.playing = true; m.step = 0;
    for (const t of R.memTiles) t.hold = false;
    m.seq.forEach((n, i) => setTimeout(() => {
      const t = R.memTiles.find((x) => x.n === n);
      if (t) { t.glowT = 0.6; G.audio?.note(n); }
      if (i === m.seq.length - 1) setTimeout(() => { m.playing = false; }, 600);
    }, 400 + i * 750));
  }
  makeChest(R, gx, gy, big) {
    const [x, z] = this.toWorld(gx, gy);
    const k = `${gx},${gy}`;
    const opened = this.prog.chests.includes(k);
    const g = new THREE.Group();
    const s = big ? 1.35 : 1;
    const col = big ? 0x8a3a6a : 0x3a6aa0;
    g.add(mesh([part(P.box(1.3 * s, 0.7 * s, 0.85 * s), col, { y: 0.35 * s, jitter: 0.04 }), part(P.box(1.35 * s, 0.12 * s, 0.9 * s), 0xe8c060, { y: 0.1 * s }), part(P.box(0.12 * s, 0.72 * s, 0.9 * s), 0xe8c060, { x: 0.4 * s, y: 0.36 * s }), part(P.box(0.12 * s, 0.72 * s, 0.9 * s), 0xe8c060, { x: -0.4 * s, y: 0.36 * s })]));
    const lid = new THREE.Group();
    lid.position.set(0, 0.7 * s, -0.42 * s);
    lid.add(mesh([part(new THREE.CylinderGeometry(0.43 * s, 0.43 * s, 1.3 * s, 10, 1, false, 0, Math.PI), col, { rz: Math.PI / 2, ry: Math.PI / 2, z: 0.42 * s, jitter: 0.03 }), part(P.box(0.24 * s, 0.26 * s, 0.08 * s), 0xf2c94c, { y: -0.05 * s, z: 0.86 * s })]));
    g.add(lid);
    if (opened) lid.rotation.x = -1.9;
    g.position.set(x, 0, z);
    g.rotation.y = Math.PI;
    this.block(gx, gy, { kind: 'chest' });
    const glow = big ? mesh([part(P.torus(1.2, 0.06, 4, 20), this.theme.accent, { rx: Math.PI / 2, y: 0.08, jitter: 0 })], MAT.glowCool, false) : null;
    if (glow) { glow.position.set(x, 0, z); this.scene.add(glow); }
    const ch = { object: g, opened, open: () => {
      if (ch.opened) return;
      if (this.def.rooms[R.i].lockChest && !R.solved) { G.ui.toast('A glowing seal holds the chest shut. Light the crystal first.', 'info'); return; }
      ch.opened = true;
      this.prog.chests.push(k);
      G.audio?.play('chest');
      let t = 0;
      const off = this.addUpdater((dt) => { t += dt; lid.rotation.x = -1.9 * Math.min(1, t / 0.5); if (t > 0.5) off(); });
      setTimeout(() => this.chestLoot(big, x, z), 350);
      if (glow) glow.visible = false;
    }, update: () => { if (glow) glow.rotation.z += 0.01; } };
    this.addInteractable({ x, z, r: 0.9 * s, h: 1.8, label: big ? 'Open the treasure chest' : 'Open chest', canInteract: () => !ch.opened, onInteract: () => ch.open() });
    return this.addMech(ch);
  }
  chestLoot(big, x, z) {
    const spawn = (id, q) => { if (q > 0) G.pickups.spawn(id, q, x, 1.2, z); };
    if (big) {
      for (const [id, q] of this.def.reward) {
        if (id === 'crystal_meadow') continue;
        spawn(id, q);
      }
      G.particles?.burst('magic', x, 1.5, z, { n: 30 });
      if (!this.def.daily) {
        this.prog.done = true;
        G.ui.banner(this.def.final ? 'The Heart of the Island' : this.def.title, this.def.final ? 'The Great Luma awakens' : 'Temple cleared!');
        G.events.emit('templeDone', this.id);
      } else G.events.emit('ruinDone', this.id);
      G.audio?.play('fanfare');
    } else {
      const tier = { meadow: 1, forest: 2, mountain: 3, jungle: 4, great: 4 }[this.def.theme] || 1;
      spawn('$', 15 * tier + Math.floor(Math.random() * 20 * tier));
      if (Math.random() < 0.45) spawn('tool_token', 1);
      if (Math.random() < 0.3) spawn('map_fragment', 1);
      if (Math.random() < 0.3) spawn('rubble_' + this.biome, 1);
      if (Math.random() < 0.18) spawn('lost_spirit', 1);
      if (Math.random() < 0.5) spawn('token_' + this.biome, 1);
    }
  }
  makeKey(R, gx, gy) {
    const [x, z] = this.toWorld(gx, gy);
    const k = `${gx},${gy}`;
    if (this.prog.keys.includes(k) || R.solved) return;
    const g = new THREE.Group();
    g.add(mesh([part(P.cyl(0.4, 0.5, 0.6, 8), 0x8a8478, { y: 0.3 })]));
    g.add(mesh([part(P.torus(0.14, 0.05, 5, 10), 0xe8c060, { y: 1.15 }), part(P.box(0.07, 0.45, 0.05), 0xe8c060, { y: 0.8 }), part(P.box(0.15, 0.06, 0.05), 0xe8c060, { x: 0.08, y: 0.62 })], MAT.glowWarm, false));
    g.position.set(x, 0, z);
    const kk = { object: g, taken: false, update: () => { g.children[1].rotation.y += 0.04; } };
    this.addMech(kk);
    this.addInteractable({ x, z, r: 0.5, h: 1.8, label: 'Take the small key', canInteract: () => !kk.taken, onInteract: () => {
      kk.taken = true;
      g.visible = false;
      this.prog.keys.push(k);
      G.inv.add('temple_key', 1);
      G.audio?.play('key');
    } });
  }

  // ---------- puzzle logic ----------
  solve(i, instant = false) {
    const R = this.rooms[i];
    if (R.solved) return;
    R.solved = true;
    if (!this.prog.solved.includes(i)) this.prog.solved.push(i);
    if (R.door) this.openDoor(R.door, instant);
    for (const t of R.timed) t.t = 1;
    if (R.crystal) R.crystal.cr.scale.setScalar(1.3);
    if (!instant) {
      G.ui.toast(R.door ? 'A door rumbles open!' : 'The seal fades. The chest can be opened.', 'magic');
      G.audio?.play('solve');
      G.events.emit('roomSolved', this.id, i);
      if (R.memTiles) for (const t of R.memTiles) t.hold = true;
    }
  }
  checkRoom(R) {
    if (R.solved) return;
    const conds = [];
    if (R.plates.length) conds.push(R.plates.every((p) => p.pressed));
    if (R.timed.length) conds.push(R.timed.every((t) => t.t > 0));
    if (R.levers.length) conds.push(R.levers.every((l) => l.on));
    if (R.statues.length) conds.push(R.statues.every((s) => s.faces()));
    if (R.receivers.length) conds.push(R.receivers.every((r) => r.lit));
    if (R.mem) conds.push(R.mem.done);
    const lockedDoor = R.door && R.door.locked;
    if (!conds.length) { if (!lockedDoor && (R.door || this.def.rooms[R.i].lockChest === undefined)) this.solve(R.i, true); return; }
    if (conds.every(Boolean)) this.solve(R.i);
  }
  traceBeams() {
    let seg = 0;
    for (const R of this.rooms) {
      for (const r of R.receivers) r.lit = R.solved && r.lit;
      for (const src of R.sources) {
        let [dx, dy] = DIR[src.dir];
        let x = src.gx, y = src.gy;
        let sx = x, sy = y;
        const seen = new Set();
        for (let step = 0; step < 200; step++) {
          x += dx; y += dy;
          const k = `${x},${y},${dx},${dy}`;
          if (seen.has(k)) break;
          seen.add(k);
          const b = this.blocked.get(this.key(x, y));
          if (b && b.isMirror) {
            this.drawBeam(seg++, sx, sy, x, y);
            if (b.kind === '/') [dx, dy] = [dy, dx]; else [dx, dy] = [-dy, -dx];
            sx = x; sy = y;
            continue;
          }
          if (b && R.receivers.includes(b)) { b.lit = true; this.drawBeam(seg++, sx, sy, x, y); sx = null; break; }
          if (b || !BEAM_PASS.has(this.get(x, y))) { this.drawBeam(seg++, sx, sy, x - dx * 0.55, y - dy * 0.55); sx = null; break; }
        }
      }
    }
    for (let i = seg; i < this.beamPool.length; i++) this.beamPool[i].visible = false;
  }
  drawBeam(i, ax, ay, bx, by) {
    let m = this.beamPool[i];
    if (!m) {
      m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), MAT.beam);
      this.beamGroup.add(m);
      this.beamPool.push(m);
    }
    const [x1, z1] = this.toWorld(ax, ay), [x2, z2] = this.toWorld(bx, by);
    const len = Math.hypot(x2 - x1, z2 - z1);
    m.visible = len > 0.01;
    m.position.set((x1 + x2) / 2, 1.2, (z1 + z2) / 2);
    m.scale.set(0.16 + Math.sin(G.elapsed * 12 + i) * 0.02, 0.16, len);
    m.rotation.y = Math.atan2(x2 - x1, z2 - z1);
  }
  trap(R, kind, fx, fz) {
    const p = G.player;
    if (p.invuln > 0 || p.dead || this.trapCool > 0) return;
    this.trapCool = 1.0;
    const dmg = G.save.peaceful ? 0 : G.save.difficulty === 'cozy' ? 1 : G.save.difficulty === 'hero' ? 4 : 2;
    G.audio?.play('hurt');
    G.cam.addShake(0.3);
    if (dmg) { p.hp = Math.max(G.save.difficulty === 'cozy' ? 1 : 0, p.hp - dmg); if (p.hp <= 0) { G.events.emit('playerDied', kind); return; } }
    p.invuln = 1.2;
    G.ui.flashDamage?.();
    const [x, z] = R.respawn;
    G.particles?.burst('magic', p.pos.x, 1, p.pos.z, { n: 10 });
    p.place(x, z, this);
    p.sliding = null;
    G.ui.toast(G.save.peaceful ? 'The trap pushes you back to the start of the room.' : 'Ouch! Back to the start of the room.', 'warn', 1800);
  }
  onWhip(x, z) {
    for (const R of this.rooms) {
      for (const t of R.timed) { const [tx, tz] = this.toWorld(t.gx, t.gy); if (Math.hypot(tx - x, tz - z) < 2.0 && !t.on) t.activate(); }
      for (const l of R.levers) { const [lx, lz] = this.toWorld(l.gx, l.gy); if (Math.hypot(lx - x, lz - z) < 1.6) l.toggle(); }
    }
  }
  update(dt) {
    super.update(dt);
    this.trapCool = Math.max(0, (this.trapCool || 0) - dt);
    const p = G.player;
    const [pgx, pgy] = this.toTile(p.pos.x, p.pos.z);
    const ri = this.roomOf[pgy * this.W + pgx];
    if (ri >= 0 && ri !== this.curRoom) { this.curRoom = ri; }
    const R = this.rooms[this.curRoom];
    if (R && !R.visited) { R.visited = true; if (!G.save.peaceful) for (const s of R.spawns) G.monsters?.spawn(this, s.type, s.x, s.z); if (R.def.hint && !R.solved) G.ui.toast(R.def.hint, 'magic', 4500); }
    for (const m of this.mechs) m.update?.(dt);
    for (const RR of this.rooms) this.checkRoom(RR);
    this.traceBeams();
    // memory tiles: stepping in order
    if (R?.mem && !R.mem.done && !R.mem.playing) {
      const t = R.memTiles.find((t) => t.gx === pgx && t.gy === pgy);
      if (t && R.mem.lastTile !== t) {
        const want = R.mem.seq[R.mem.step];
        if (t.n === want) { t.hold = true; G.audio?.note(t.n); R.mem.step++; if (R.mem.step >= R.mem.seq.length) R.mem.done = true; }
        else { for (const x of R.memTiles) { x.hold = false; x.red = 0.8; } R.mem.step = 0; G.audio?.play('error'); }
      }
      R.mem.lastTile = t || null;
    }
    // pushing blocks
    const mv = G.input.moveVector();
    if (mv.len > 0.6 && !p.sliding && !G.paused) {
      const ax = Math.abs(mv.x) > Math.abs(mv.z);
      const dx = ax ? Math.sign(mv.x) : 0, dy = ax ? 0 : -Math.sign(mv.z);
      const b = this.blocked.get(this.key(pgx + dx, pgy + dy));
      const [bx, bz] = this.toWorld(pgx + dx, pgy + dy);
      const lateral = ax ? Math.abs(p.pos.z - bz) : Math.abs(p.pos.x - bx);
      const dist = ax ? Math.abs(p.pos.x - bx) : Math.abs(p.pos.z - bz);
      if (b && b.isBlock && !b.moving && lateral < 0.75 && dist < TS * 0.5 + 0.6) {
        this.pushT += dt;
        if (this.pushT > 0.25) { this.pushT = 0; this.tryPush(b, dx, dy); }
      } else this.pushT = 0;
    } else this.pushT = 0;
    // ice sliding
    this.slideCool -= dt;
    const onIce = this.get(pgx, pgy) === T.ICE;
    if (p.sliding) {
      if (!onIce) { p.sliding = null; }
    } else if (onIce && this.slideCool <= 0) {
      p.lockMove = 0.05;
      let dx = 0, dy = 0;
      const v = Math.hypot(p.vel.x, p.vel.z);
      const src = mv.len > 0.5 ? { x: mv.x, z: mv.z } : v > 1 ? { x: p.vel.x, z: p.vel.z } : null;
      if (src) {
        if (Math.abs(src.x) > Math.abs(src.z)) dx = Math.sign(src.x); else dy = -Math.sign(src.z);
        if (this.tileWalkable(pgx + dx, pgy + dy)) {
          const [cx, cz] = this.toWorld(pgx, pgy);
          if (dx) p.pos.z = cz; else p.pos.x = cx;
          p.sliding = { x: dx, z: -dy };
          p.rotY = Math.atan2(dx, -dy);
          G.audio?.play('slide');
        }
      }
    }
    // leaving through the entrance
    const onEntry = pgx === this.entryTile.gx && pgy === this.entryTile.gy;
    if (!onEntry) this.leftEntry = true;
    else if (this.leftEntry && !G.travel.busy) G.travel.toOverworld();
  }
  onSlideStop(p) { p.sliding = null; this.slideCool = 0.12; G.audio?.play('bump'); }
  dispose() { this.whipOff?.(); super.dispose(); }
}
