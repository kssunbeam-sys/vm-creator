// The three ways onward: the broken bridge to the Forest, the old lift up to
// the Mountains and the boat to the Jungle. Plus the Great Temple door.
import * as THREE from '../three.js';
import { G, clamp, lerp, smoothstep } from '../core/game.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from './materials.js';
import { BRIDGE, LIFT, BIOMES } from '../data/layout.js';
import { ITEMS } from '../data/items.js';
import { enterSite } from './sites.js';

export const REPAIRS = {
  bridge: { title: 'The Old Bridge', cost: [['plank', 12], ['rope', 6], ['nails', 8]], done: 'The bridge to the Whispering Forest is whole again!' },
  lift: { title: 'The Old Lift', cost: [['plank', 16], ['rope', 10], ['iron_bar', 6]], done: 'The lift creaks back to life. The Frostcrown Mountains await!' },
  boat: { title: 'The Old Boat', cost: [['hardwood', 16], ['fabric', 6], ['rope', 8], ['moonstone_bar', 4]], done: 'The boat is seaworthy! Set sail for the Emberleaf Jungle.' },
};
const WOOD = 0xb88a56, WOOD_D = 0x7a5232, WOOD_L = 0xd2a872, ROPE = 0xc9a86a, STONE = 0xa8a294;
const mesh = (parts, mat = MAT.world, shadow = true) => { const m = new THREE.Mesh(merge(parts), mat); m.castShadow = shadow; m.receiveShadow = true; return m; };
const easeInOut = (t) => t * t * (3 - 2 * t);

function sign(text) {
  const g = new THREE.Group();
  g.add(mesh([part(P.cyl(0.07, 0.08, 1.5, 5), WOOD_D, { y: 0.75 }), part(P.box(1.3, 0.62, 0.08), WOOD_L, { y: 1.35, jitter: 0.02 })]));
  const c = document.createElement('canvas'); c.width = 256; c.height = 120;
  const x = c.getContext('2d');
  x.fillStyle = '#d2a872'; x.fillRect(0, 0, 256, 120);
  x.fillStyle = '#5e3a20'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((l, i) => x.fillText(l, 128, 60 + (i - (lines.length - 1) / 2) * 40));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.54), new THREE.MeshLambertMaterial({ map: tex }));
  face.position.set(0, 1.35, 0.045);
  g.add(face);
  return g;
}

export class Gates {
  constructor(world) {
    this.world = world;
    this.T = world.terrain;
    this.ride = null;
    this.buildBridge();
    this.buildLift();
    this.buildDocks();
    this.buildGreatDoor();
    G.events.on('gameStart', () => this.sync());
  }
  get st() { return (G.save.gates ||= { bridge: false, lift: false, boat: false }); }
  sync() {
    const s = this.st;
    this.bridge.whole.visible = s.bridge; this.bridge.broken.visible = !s.bridge;
    this.lift.broken.visible = !s.lift; this.lift.rope.visible = s.lift;
    this.lift.cabin.position.y = this.lift.y0; this.lift.cabin.rotation.set(s.lift ? 0 : 0.12, 0, s.lift ? 0 : -0.18);
    this.boats.lumenbrook.whole.visible = s.boat; this.boats.lumenbrook.broken.visible = !s.boat;
    this.boats.tikora.group.visible = s.boat;
  }

  // ---------- repairs ----------
  repairDialog(id, extra = '') {
    const R = REPAIRS[id];
    const have = (iid) => G.inv.count(iid);
    const ok = R.cost.every(([iid, q]) => have(iid) >= q);
    const list = R.cost.map(([iid, q]) => `${q} ${ITEMS[iid].name} (you have ${have(iid)})`).join(', ');
    G.dialogue.openText(R.title, `${extra}To repair it you need: ${list}.`, [
      { label: ok ? 'Repair it' : 'Not enough materials', disabled: !ok, fn: () => { G.dialogue.close(); this.repair(id); } },
      { label: 'Not now', fn: () => G.dialogue.close() },
    ]);
  }
  async repair(id) {
    const R = REPAIRS[id];
    for (const [iid, q] of R.cost) G.inv.remove(iid, q);
    G.paused = true;
    G.audio?.play('build');
    await G.ui.fadeTo(true, 500);
    this.st[id] = true;
    this.sync();
    await new Promise((r) => setTimeout(r, 350));
    G.paused = G.ui.panels.length > 0;
    await G.ui.fadeTo(false, 500);
    G.ui.banner(R.title + ' repaired!', R.done, 3600);
    G.audio?.play('fanfare');
    G.events.emit('gateRepaired', id);
  }

  // ---------- bridge ----------
  buildBridge() {
    const W = this.world, T = this.T;
    const rx = T.riverX(BRIDGE.z), z0 = BRIDGE.z, L = BRIDGE.halfLen, hw = BRIDGE.halfW;
    const deckH = (x) => BRIDGE.deck + 0.9 * (1 - ((x - rx) / L) ** 2);
    this.bridgeInfo = { rx, z: z0 };
    T.surfaces.push({ minX: rx - L, maxX: rx + L, minZ: z0 - hw + 0.3, maxZ: z0 + hw - 0.3, h: BRIDGE.deck, hAt: (x) => deckH(x), active: () => this.st.bridge });
    const whole = [], broken = [];
    for (let x = rx - L; x < rx + L - 0.01; x += 0.8) {
      const xm = x + 0.4, y = deckH(xm);
      const plank = part(P.box(0.74, 0.16, hw * 2), (Math.round(x * 5) % 2) ? WOOD : WOOD_L, { x: xm, y: y - 0.08, z: z0, rz: Math.atan(-1.8 * (xm - rx) / (L * L)), jitter: 0.02 });
      whole.push(plank);
      if (Math.abs(xm - rx) > L - 5.5) broken.push(plank.clone());
    }
    for (let x = rx - L; x <= rx + L + 0.01; x += 2) {
      for (const sz of [-1, 1]) {
        const p = part(P.box(0.14, 1.0, 0.14), WOOD_D, { x, y: deckH(x) + 0.45, z: z0 + sz * (hw - 0.07) });
        whole.push(p);
        if (Math.abs(x - rx) > L - 5.5) broken.push(p.clone());
      }
    }
    for (let x = rx - L; x < rx + L - 0.01; x += 0.5) for (const sz of [-1, 1]) {
      const y = deckH(x + 0.25);
      const r = part(P.box(0.52, 0.1, 0.1), WOOD, { x: x + 0.25, y: y + 0.9, z: z0 + sz * (hw - 0.07), rz: Math.atan(-1.8 * (x + 0.25 - rx) / (L * L)), jitter: 0 });
      whole.push(r);
      if (Math.abs(x + 0.25 - rx) > L - 5.5) broken.push(r.clone());
    }
    // stone piers in the river
    const piers = [];
    for (const dx of [-6, 6]) piers.push(part(P.cyl(1.0, 1.3, 6, 8), STONE, { x: rx + dx, y: deckH(rx + dx) - 3.3, z: z0, jitter: 0.08 }));
    whole.push(...piers.map((p) => p.clone()));
    broken.push(...piers);
    // dangling planks on the broken bridge
    for (const [dx, a] of [[-L + 5.6, 0.9], [L - 5.6, -0.8], [-L + 6.4, 1.3]]) broken.push(part(P.box(0.74, 0.14, hw * 1.6), WOOD, { x: rx + dx, y: deckH(rx + dx) - 0.9, z: z0 + 0.3, rz: a }));
    const gW = new THREE.Group(), gB = new THREE.Group();
    gW.add(mesh(whole)); gB.add(mesh(broken));
    const sgn = sign('BRIDGE\nOUT!');
    sgn.position.set(rx + L + 2.2, T.groundAt(rx + L + 2.2, z0 + 3.4), z0 + 3.4);
    sgn.rotation.y = Math.PI / 2;
    gB.add(sgn);
    W.scene.add(gW, gB);
    this.bridge = { whole: gW, broken: gB };
    for (const side of [1, -1]) {
      W.addInteractable({ x: rx + side * (L - 2), z: z0, r: 2.2, h: 3.2, priority: 0.2, label: 'Repair the old bridge',
        canInteract: () => !this.st.bridge,
        onInteract: () => this.repairDialog('bridge', 'The bridge over the river collapsed years ago. ') });
    }
  }

  // ---------- lift ----------
  buildLift() {
    const W = this.world, T = this.T;
    const x = LIFT.x, cz = T.cliffZ(x);
    const zc = cz + 3.8;                          // shaft at the foot of the cliff
    const y0 = T.groundAt(x, cz + 9), y1 = T.groundAt(x, cz - 9);
    const topY = y1 + 0.05;
    this.liftInfo = { x, zc, y0, y1, base: { x, z: cz + 8.4 }, top: { x, z: cz - 9.5 } };
    const parts = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(part(P.box(0.32, topY - y0 + 3.2, 0.32), WOOD_D, { x: x + sx * 1.7, y: (y0 + topY + 3.2) / 2, z: zc + sz * 1.7 }));
    for (let y = y0 + 2; y < topY + 2; y += 3) {
      for (const sx of [-1, 1]) parts.push(part(P.box(0.16, 0.16, 3.4), WOOD, { x: x + sx * 1.7, y, z: zc }));
      for (const sz of [-1, 1]) parts.push(part(P.box(3.4, 0.16, 0.16), WOOD, { x, y, z: zc + sz * 1.7 }));
      parts.push(part(P.box(0.12, 4.2, 0.12), WOOD, { x: x - 1.7, y: y + 1.4, z: zc, rx: 0.78 }));
      parts.push(part(P.box(0.12, 4.2, 0.12), WOOD, { x: x + 1.7, y: y + 1.4, z: zc, rx: -0.78 }));
    }
    parts.push(part(P.box(4.2, 0.4, 4.2), WOOD_D, { x, y: topY + 3.3, z: zc }));
    // walkway from the shaft to the plateau
    const wz0 = zc - 1.7, wz1 = cz - 7.5;
    parts.push(part(P.box(2.4, 0.22, wz0 - wz1), WOOD, { x, y: topY - 0.1, z: (wz0 + wz1) / 2 }));
    for (const sx of [-1, 1]) parts.push(part(P.box(0.12, 0.9, wz0 - wz1), WOOD_D, { x: x + sx * 1.2, y: topY + 0.45, z: (wz0 + wz1) / 2 }));
    // base platform
    parts.push(part(P.box(4.4, 0.3, 4.4), WOOD_L, { x, y: y0 + 0.1, z: zc, jitter: 0.02 }));
    const tower = mesh(parts);
    const pulley = mesh([part(P.cyl(0.7, 0.7, 0.3, 14), WOOD_D, { rz: Math.PI / 2 }), part(P.cyl(0.18, 0.18, 0.5, 8), 0x6a6a72, { rz: Math.PI / 2 })]);
    pulley.position.set(x, topY + 3.9, zc);
    const cab = new THREE.Group();
    cab.add(mesh([
      part(P.box(3.0, 0.26, 3.0), WOOD_L, { y: 0.13, jitter: 0.02 }),
      ...[-1, 1].flatMap((s) => [part(P.box(0.12, 0.9, 3.0), WOOD, { x: s * 1.45, y: 0.6 }), part(P.box(3.0, 0.9, 0.12), WOOD, { y: 0.6, z: s * 1.45 })]),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => part(P.box(0.14, 1.1, 0.14), WOOD_D, { x: sx * 1.45, y: 0.6, z: sz * 1.45 }))),
    ]));
    cab.position.set(x, y0 + 0.25, zc);
    const rope = mesh([part(P.cyl(0.04, 0.04, 1, 4), ROPE, { y: 0.5 }), part(P.cyl(0.04, 0.04, 1, 4), ROPE, { x: 0.25, y: 0.5 })], MAT.world, false);
    rope.position.set(x, 0, zc);
    const broken = new THREE.Group();
    const sgn = sign('LIFT\nBROKEN');
    sgn.position.set(x + 2.8, T.groundAt(x + 2.8, cz + 8), cz + 8);
    broken.add(sgn);
    broken.add(mesh([part(P.box(0.7, 0.2, 2.2), WOOD, { x: x - 2.2, y: y0 + 0.15, z: zc + 2.6, ry: 0.6 }), part(P.cyl(0.6, 0.6, 0.25, 12), WOOD_D, { x: x + 2.4, y: y0 + 0.3, z: zc + 2.2, rx: Math.PI / 2 - 0.3 })]));
    W.scene.add(tower, pulley, cab, rope, broken);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) W.colliders.addCircle(x + sx * 1.7, zc + sz * 1.7, 0.3);
    this.lift = { cabin: cab, pulley, rope, broken, y0: y0 + 0.25, y1: topY + 0.05, x, zc, wz1 };
    const L = this.liftInfo;
    W.addInteractable({ x, z: zc + 2.6, r: 1.6, h: 3, priority: 0.3, label: () => (this.st.lift ? 'Ride the lift up' : 'Repair the old lift'),
      onInteract: () => (this.st.lift ? this.rideLift(true) : this.repairDialog('lift', 'Its ropes have rotted and the pulley has fallen. ')) });
    W.addInteractable({ x, z: L.top.z + 0.2, r: 1.4, h: 2.5, priority: 0.3, label: 'Ride the lift down', canInteract: () => this.st.lift, onInteract: () => this.rideLift(false) });
  }
  rideLift(up) {
    if (this.ride) return;
    const Lf = this.lift, pl = G.player;
    const base = { x: Lf.x, z: Lf.zc + 3.2 }, top = { x: Lf.x, z: Lf.wz1 - 1.6 };
    const legs = up
      ? [['walk', { x: Lf.x, z: Lf.zc, cab: true }, 0.7], ['lift', Lf.y0, Lf.y1, 4.2], ['walk', top, 1.4]]
      : [['walk', { x: Lf.x, z: Lf.zc, cab: true }, 1.4], ['lift', Lf.y1, Lf.y0, 4.2], ['walk', base, 0.7]];
    // the cabin waits at the bottom: bring it up first when riding down
    if (!up) Lf.cabin.position.y = Lf.y1;
    G.audio?.play('lift');
    this.startRide(legs, () => {
      G.events.emit('liftRide', up);
      if (up && !G.save.flags.seen_mountain_lift) { G.save.flags.seen_mountain_lift = true; }
    });
  }
  // a little scripted movement (lift ride), driven through Player.ride
  startRide(legs, done) {
    const pl = G.player;
    let i = 0, t = 0, from = null;
    const Lf = this.lift;
    this.ride = true;
    pl.ride = (dt) => {
      const leg = legs[i];
      if (!leg) { pl.ride = null; this.ride = null; done?.(); return; }
      if (!from) from = { x: pl.pos.x, z: pl.pos.z, y: pl.pos.y };
      t += dt;
      const k = clamp(t / leg[leg.length - 1], 0, 1);
      if (leg[0] === 'walk') {
        const to = leg[1];
        pl.pos.x = lerp(from.x, to.x, k); pl.pos.z = lerp(from.z, to.z, k);
        const toY = to.cab ? Lf.cabin.position.y + 0.25 : G.level.heightAt(to.x, to.z);
        pl.pos.y = lerp(from.y, toY, k);
        if (Math.hypot(to.x - from.x, to.z - from.z) > 0.1) pl.rotY = Math.atan2(to.x - from.x, to.z - from.z);
        pl.rideSpeed = 0.8;
      } else {
        const y = lerp(leg[1], leg[2], easeInOut(k));
        Lf.cabin.position.y = y;
        Lf.pulley.rotation.x += dt * 4 * Math.sign(leg[2] - leg[1]);
        pl.pos.y = y + 0.25;
        pl.rideSpeed = 0;
      }
      this.updateRope();
      if (k >= 1) { i++; t = 0; from = null; }
    };
  }
  updateRope() {
    const Lf = this.lift;
    const len = Math.max(0.1, Lf.y1 + 3.6 - (Lf.cabin.position.y + 1.1));
    Lf.rope.scale.set(1, len, 1);
    Lf.rope.position.y = Lf.cabin.position.y + 1.1;
  }

  // ---------- docks and boats ----------
  buildDocks() {
    const W = this.world, T = this.T;
    this.boats = {};
    // Lumenbrook: pier runs south into the sea
    const lz0 = 202, lz1 = 224, lx = 55, lh = 1.75;
    T.surfaces.push({ minX: lx - 1.6, maxX: lx + 1.6, minZ: lz0, maxZ: lz1, h: lh });
    W.scene.add(mesh(this.pierParts(lx, lz0, lx, lz1, () => lh)));
    // Tikora: pier runs west, ramping down from the high bank
    const tx0 = 172, tx1 = 150, tz = 6;
    const th = (x) => (x > 164 ? lerp(1.6, 3.1, (x - 164) / 8) : 1.6);
    T.surfaces.push({ minX: tx1, maxX: tx0, minZ: tz - 1.6, maxZ: tz + 1.6, h: 1.6, hAt: (x) => th(x) });
    W.scene.add(mesh(this.pierParts(tx0, tz, tx1, tz, (x) => th(x))));
    this.boats.lumenbrook = this.makeBoat(lx + 3.5, lz1 - 5, 0, true);
    this.boats.tikora = this.makeBoat(tx1 + 5, tz + 3.5, -Math.PI / 2, false);
    this.docks = {
      lumenbrook: { x: lx, z: lz1 - 3.5, ang: Math.PI, name: 'Lumenbrook' },
      tikora: { x: tx1 + 3.5, z: tz, ang: Math.PI / 2, name: 'Tikora' },
    };
    W.addInteractable({ x: lx + 1.6, z: lz1 - 5, r: 1.6, h: 2.6, priority: 0.3,
      label: () => (this.st.boat ? 'Sail to Tikora' : 'Repair the old boat'),
      onInteract: () => (this.st.boat ? this.sail('tikora') : this.repairDialog('boat', 'Old Finn\'s boat has a cracked hull and no sail. ')) });
    W.addInteractable({ x: tx1 + 5, z: tz + 1.6, r: 1.6, h: 2.6, priority: 0.3, label: 'Sail to Lumenbrook', canInteract: () => this.st.boat, onInteract: () => this.sail('lumenbrook') });
  }
  pierParts(x0, z0, x1, z1, hAt) {
    const parts = [];
    const len = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / len, dz = (z1 - z0) / len;
    const ry = Math.atan2(dx, dz);
    for (let s = 0; s < len; s += 0.75) {
      const x = x0 + dx * (s + 0.37), z = z0 + dz * (s + 0.37), y = hAt(x, z);
      parts.push(part(P.box(3.2, 0.2, 0.7), (Math.round(s * 4) % 3) ? WOOD : WOOD_L, { x, y: y - 0.1, z, ry, jitter: 0.02 }));
    }
    for (let s = 0; s <= len; s += 3.5) for (const side of [-1, 1]) {
      const x = x0 + dx * s + dz * side * 1.65, z = z0 + dz * s - dx * side * 1.65, y = hAt(x0 + dx * s, z0 + dz * s);
      const bottom = Math.min(this.T.groundAt(x, z), -0.5) - 0.5;
      parts.push(part(P.cyl(0.17, 0.2, y - bottom + 0.6, 6), WOOD_D, { x, y: (y + 0.6 + bottom) / 2, z }));
    }
    return parts;
  }
  makeBoat(x, z, rot, withBroken) {
    const g = new THREE.Group();
    const whole = new THREE.Group(), broken = new THREE.Group();
    const hull = [
      part(P.box(2.4, 0.9, 6.0), 0xb8763a, { y: 0.25, jitter: 0.03 }),
      part(P.cone(1.2, 1.8, 4), 0xb8763a, { y: 0.25, z: 3.8, rx: Math.PI / 2, ry: Math.PI / 4, sx: 1.4, sz: 0.62 }),
      part(P.box(2.0, 0.12, 5.6), 0xd8b47a, { y: 0.66, jitter: 0 }),
      part(P.box(2.5, 0.12, 6.1), 0xf2f2ea, { y: 0.2, jitter: 0 }),
    ];
    whole.add(mesh([...hull, part(P.cyl(0.1, 0.12, 5.0, 6), WOOD_D, { y: 3.1, z: 0.4 })]));
    const sail = mesh([part(P.box(0.06, 3.2, 2.6), 0xfff6e8, { y: 3.3, z: 0.4 - 1.35, jitter: 0 }), part(P.box(0.07, 0.5, 2.6), 0xd9603c, { y: 4.7, z: 0.4 - 1.35, jitter: 0 })], MAT.foliage);
    whole.add(sail);
    if (withBroken) {
      broken.add(mesh([
        part(P.box(2.4, 0.9, 6.0), 0x8a6a4a, { y: 0.0, jitter: 0.05 }),
        part(P.cone(1.2, 1.8, 4), 0x8a6a4a, { y: 0.0, z: 3.8, rx: Math.PI / 2, ry: Math.PI / 4, sx: 1.4, sz: 0.62 }),
        part(P.box(2.0, 0.12, 5.6), 0x9a8a6a, { y: 0.4, jitter: 0 }),
        part(P.cyl(0.1, 0.12, 2.0, 6), WOOD_D, { y: 1.3, z: 0.4, rz: 0.4 }),
        part(P.box(0.8, 0.2, 1.2), 0x5a4a3a, { x: 0.6, y: 0.5, z: -1.5, ry: 0.5 }),
        part(P.box(0.9, 0.5, 0.06), 0x3a2a20, { x: 1.21, y: 0.1, z: 1.2, jitter: 0.1 }),
      ]));
      broken.rotation.z = 0.08;
    }
    g.add(whole, broken);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.world.scene.add(g);
    return { group: g, whole, broken, sail };
  }
  async sail(to) {
    if (this.ride || G.travel.busy) return;
    const d = this.docks[to];
    G.audio?.play('horn');
    G.events.emit('sailing', to);
    G.time.advance?.(45);
    await G.travel.hop(d.x, d.z, d.name, to === 'tikora' ? 'Emberleaf Jungle' : 'Sunny Meadow');
    G.player.rotY = d.ang;
  }

  // ---------- the Great Temple in Lumenbrook ----------
  buildGreatDoor() {
    const W = this.world;
    const b = W.cities.lumenbrook.buildings.great_temple;
    const site = { id: 'great', kind: 'temple', biome: 'meadow', name: 'The Great Temple', x: b.x, z: b.z };
    const door = { x: b.door.x, z: b.door.z };
    this.greatSite = site;
    W.addInteractable({ x: door.x, z: door.z, r: 1.6, h: 6, priority: 0.5,
      label: () => (G.save.flags.open_great ? 'Enter the Great Temple' + (G.save.temples.great?.done ? ' ✓' : '') : 'The Great Temple (four keyholes)'),
      onInteract: () => {
        if (!G.save.flags.open_great) {
          const have = ['meadow', 'forest', 'mountain', 'jungle'].filter((k) => G.inv.has('key_' + k));
          if (have.length < 4) {
            G.dialogue.openText('The Great Temple', `Four keyholes are carved into the golden door: Sun, Leaf, Frost and Ember. You hold ${have.length} of the four Ancient Keys.${have.length ? ' (' + have.map((k) => BIOMES[k].short).join(', ') + ')' : ''}`);
            return;
          }
        }
        enterSite(site, door, { x: door.x + (b.fx || 0) * 1.2, z: door.z + (b.fz || 0) * 1.2 });
      } });
  }

  update(dt) {
    if (G.level !== this.world) return;
    const t = G.elapsed;
    for (const b of Object.values(this.boats)) {
      if (!b.group.visible) continue;
      b.group.position.y = Math.sin(t * 1.3 + b.group.position.x) * 0.08 - 0.05;
      b.whole.rotation.z = Math.sin(t * 1.1) * 0.03;
    }
    if (this.st.lift && !this.ride) this.updateRope();
  }
}
