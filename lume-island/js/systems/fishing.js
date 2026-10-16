// Fishing: cast into water, wait for a bite, then reel in with the catch-bar
// minigame. Bait bugs are used automatically. A Copper Magnet cast into the
// bubbles of sunken treasure hauls up a Sunken Chest instead.
import * as THREE from '../three.js';
import { G, clamp } from '../core/game.js';
import { ITEMS } from '../data/items.js';
import { h } from '../ui/dom.js';
import { iconURL } from '../ui/icons.js';
import { RNG } from '../core/rng.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from '../world/materials.js';
import { toolPower } from './actions.js';

const FISH = Object.values(ITEMS).filter((it) => it.cat === 'fish' && it.diff);
export const BAIT = { meadow: 'caterpillar', forest: 'grasshopper', mountain: 'frost_beetle', jungle: 'firefly' };

export class Fishing {
  constructor() {
    this.state = null;       // null | cast | wait | bite | reel | magnet
    this.bobber = new THREE.Mesh(merge([
      part(P.sphere(0.16, 10, 8), 0xe84a3a, { flat: false, jitter: 0, y: 0.06 }),
      part(P.sphere(0.16, 10, 8), 0xffffff, { flat: false, jitter: 0, y: 0.0, sy: 0.6 }),
      part(P.cyl(0.02, 0.02, 0.16, 4), 0x333333, { y: 0.26 }),
    ]), MAT.char);
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
    this.line = new THREE.Line(this.lineGeo, new THREE.LineBasicMaterial({ color: 0xf6f6f0, transparent: true, opacity: 0.85 }));
    this.line.frustumCulled = false;
    this.tip = new THREE.Vector3();
    this.spot = new THREE.Vector3();
    this.bubbles = [];
    this.bubbleGeo = merge([part(P.torus(0.5, 0.05, 4, 16), 0xffffff, { rx: Math.PI / 2, jitter: 0 })]);
    this.bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false });
    this.alert = h('div', { class: 'fish-alert passive', hidden: true }, '!');
    this.buildGame();
    G.ui.root.append(this.alert, this.game);
    G.events.on('gameStart', () => this.makeBubbles());
    G.events.on('newDay', () => this.makeBubbles());
    G.events.on('levelChanged', () => this.end(true));
  }

  // ---------- sunken treasure bubbles ----------
  makeBubbles() {
    for (const b of this.bubbles) b.mesh.parent?.remove(b.mesh);
    this.bubbles = [];
    const T = G.overworld.terrain;
    const rng = new RNG(G.time.day * 313 + 7);
    const n = 6 + (G.lumas?.ability() === 'bubbles' ? 3 : 0);
    for (let tries = 0; tries < 4000 && this.bubbles.length < n; tries++) {
      const x = -340 + rng.next() * 680, z = -340 + rng.next() * 680;
      const g = T.groundAt(x, z);
      if (g > -0.9 || g < -4) continue;
      // reachable: dry land within casting range
      let shore = false;
      for (let a = 0; a < 12 && !shore; a++) for (const r of [3.5, 5.5]) if (T.walkable(x + Math.cos(a / 6 * Math.PI) * r, z + Math.sin(a / 6 * Math.PI) * r)) { shore = true; break; }
      if (!shore || this.bubbles.some((b) => Math.hypot(b.x - x, b.z - z) < 60)) continue;
      const mesh = new THREE.Group();
      for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(this.bubbleGeo, this.bubbleMat); m.position.set((i - 1) * 0.5, 0.05, (i % 2) * 0.4); mesh.add(m); }
      mesh.position.set(x, 0.02, z);
      G.overworld.scene.add(mesh);
      this.bubbles.push({ x, z, mesh, t: rng.next() * 3, hinted: false });
    }
  }
  bubbleNear(x, z, r = 2.6) {
    if (G.level !== G.overworld) return null;
    return this.bubbles.find((b) => Math.hypot(b.x - x, b.z - z) < r) || null;
  }
  removeBubble(b) { b.mesh.parent?.remove(b.mesh); this.bubbles = this.bubbles.filter((x) => x !== b); }

  // ---------- casting ----------
  waterAt(x, z) { return G.level === G.overworld ? G.overworld.terrain.waterAt(x, z) : null; }
  findCastPoint(aim) {
    const p = G.player.pos;
    let dx = aim.x - p.x, dz = aim.z - p.z;
    let d = Math.hypot(dx, dz);
    if (d < 0.01) { dx = Math.sin(G.player.rotY); dz = Math.cos(G.player.rotY); d = 1; }
    dx /= d; dz /= d;
    for (const r of [5.5, 4.5, 6.5, 3.5, 7.5, 2.8]) {
      const x = p.x + dx * r, z = p.z + dz * r;
      const w = this.waterAt(x, z);
      if (w && w.depth > 0.3) return { x, z, w };
    }
    return null;
  }
  cast(aim) {
    const pl = G.player;
    if (this.state === 'wait' || this.state === 'magnet') { this.reelIn(); return; }
    if (this.state === 'bite') { this.hook(); return; }
    if (this.state) return;
    const pt = this.findCastPoint(aim);
    pl.showTool('rod', 2);
    if (!pt) { G.ui.toast('Face the water and cast your line into it.', 'info'); return; }
    pl.faceTowards(pt.x, pt.z);
    this.state = 'cast';
    this.point = pt;
    G.audio?.play('whoosh');
    pl.rig.play('cast', 0.55, () => {
      if (this.state !== 'cast') return;
      this.spot.set(pt.x, pt.w.y, pt.z);
      this.biome = pt.w.lake ? 'mountain' : G.overworld.biomeAt(pl.pos.x, pl.pos.z);
      this.sea = !pt.w.lake && G.overworld.terrain.groundAt(pt.x, pt.z) < -1.2;
      G.level.scene.add(this.bobber, this.line);
      this.bobber.position.copy(this.spot);
      G.particles?.burst('splash', pt.x, pt.w.y + 0.1, pt.z, { n: 8 });
      G.audio?.play('splash');
      pl.rig.play('hold', 1);
      const bub = this.bubbleNear(pt.x, pt.z);
      if (bub && G.inv.has('magnet')) {
        G.inv.remove('magnet', 1);
        this.state = 'magnet';
        this.bub = bub;
        this.timer = 2.2;
        G.ui.toast('The magnet sinks into the bubbles...', 'magic');
        return;
      }
      if (bub && !bub.hinted) { bub.hinted = true; G.ui.toast('Something metal glints under those bubbles. A Copper Magnet could pull it up.', 'magic', 4500); }
      // bait is used automatically
      this.bait = null;
      for (const id of [BAIT[this.biome], 'butterfly']) if (id && G.inv.has(id)) { G.inv.remove(id, 1); this.bait = id; break; }
      let wait = 3.5 + Math.random() * 7;
      if (this.bait) wait *= this.bait === 'butterfly' ? 0.8 : 0.6;
      if (G.lumas?.ability() === 'fish') wait *= 0.7;
      this.timer = wait;
      this.nibbles = Math.floor(Math.random() * 3);
      this.state = 'wait';
    });
  }
  pickCatch() {
    const r = Math.random();
    if (r < 0.04) return 'water_spirit';
    if (this.sea && r < 0.11) return 'oyster';
    if (r < (this.bait ? 0.14 : 0.2)) return Math.random() < 0.5 ? 'old_boot' : 'seaweed';
    const maxDiff = 3 + toolPower('rod') * 0.35;
    const pool = FISH.filter((f) => f.biome === this.biome);
    const ok = pool.filter((f) => f.diff <= maxDiff);
    if (ok.length < pool.length && Math.random() < 0.06) this.bigShadow = true;
    const list = ok.length ? ok : [pool[0]];
    const ws = list.map((f) => Math.pow(f.diff, -1.15) * (this.bait && this.bait !== 'butterfly' ? 1 + f.diff * 0.16 : 1));
    let t = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { t -= ws[i]; if (t <= 0) return list[i].id; }
    return list[0].id;
  }
  hook() {
    this.state = 'reel';
    this.alert.hidden = true;
    const id = this.catchId;
    const it = ITEMS[id];
    const diff = it.cat === 'fish' && it.diff ? it.diff : it.id === 'oyster' ? 2 : 1;
    const tier = G.save.tools.rod?.tier ?? 0;
    let zone = 0.24 + tier * 0.035 + ((G.save.tools.rod?.lvl ?? 1) - 1) * 0.006;
    if (G.lumas?.ability() === 'fishzone') zone *= 1.25;
    this.mg = {
      diff, zone, zoneY: 0.1, zoneV: 0, fishY: 0.5, fishV: 0, target: 0.5, retarget: 0.6,
      prog: 0.32, gain: 0.3 + tier * 0.035, drain: 0.17 + diff * 0.012,
    };
    this.fishImg.src = iconURL(id);
    this.fishImg.classList.toggle('mystery', true);
    this.game.hidden = false;
    G.player.rig.play('reel', 1);
    G.audio?.play('reel');
  }
  reelIn() {
    if (this.state === 'magnet') { G.ui.toast('You pulled the magnet back up. It was lost in the bubbles.', 'warn'); }
    this.end();
  }
  end(silent = false) {
    this.state = null;
    this.mg = null;
    this.game.hidden = true;
    this.alert.hidden = true;
    this.bobber.parent?.remove(this.bobber);
    this.line.parent?.remove(this.line);
    if (G.player && ['hold', 'reel'].includes(G.player.rig.action)) G.player.rig.action = null;
    if (!silent) G.audio?.play('reelIn');
  }
  give(id, qty = 1) {
    const left = G.inv.add(id, qty);
    if (left > 0) G.pickups.spawn(id, left, G.player.pos.x, G.player.pos.y + 1, G.player.pos.z);
  }
  landed(ok) {
    const id = this.catchId;
    const sp = this.spot;
    if (ok) {
      this.give(id);
      G.particles?.burst('splash', sp.x, sp.y + 0.2, sp.z, { n: 18 });
      G.player.rig.play('cheer', 0.8);
      G.audio?.play('catch');
      const it = ITEMS[id];
      if (it.cat === 'fish') {
        const st = G.save.stats.fish;
        const first = !st[id];
        st[id] = (st[id] || 0) + 1;
        if (first && it.diff) G.ui.banner(it.name, 'New fish for your journal!', 2200);
      } else if (id === 'water_spirit') G.ui.toast('A Water Spirit swirls up out of the water!', 'magic');
      G.events.emit('fishCaught', id);
    } else {
      G.particles?.burst('splash', sp.x, sp.y + 0.1, sp.z, { n: 8 });
      G.ui.toast('The fish slipped off the hook...', 'warn');
      G.audio?.play('fail');
    }
    this.end(true);
  }

  // ---------- minigame UI ----------
  buildGame() {
    this.zoneEl = h('div', { class: 'fg-zone' });
    this.fishImg = h('img', { alt: '' });
    this.fishEl = h('div', { class: 'fg-fish' }, this.fishImg);
    this.progEl = h('span');
    this.game = h('div', { class: 'fishing-game passive', hidden: true },
      h('div', { class: 'fg-bar' }, this.zoneEl, this.fishEl),
      h('div', { class: 'fg-progress' }, this.progEl),
      h('div', { class: 'fg-hint' }, 'Hold to lift the net. Keep the fish inside!'));
  }
  renderGame() {
    const m = this.mg;
    this.zoneEl.style.height = (m.zone * 100) + '%';
    this.zoneEl.style.bottom = (m.zoneY * 100) + '%';
    this.fishEl.style.bottom = `calc(${m.fishY * 100}% - 22px)`;
    this.progEl.style.height = (m.prog * 100) + '%';
    this.zoneEl.classList.toggle('on', m.inside);
  }
  updateGame(dt) {
    const m = this.mg;
    const inp = G.input;
    const hold = inp.mouse.left || inp.down('Space') || inp.touchButtons.has('use');
    m.zoneV = clamp(m.zoneV + (hold ? 3.0 : -2.4) * dt, -1.5, 1.5);
    m.zoneY += m.zoneV * dt;
    if (m.zoneY < 0) { m.zoneY = 0; m.zoneV = Math.abs(m.zoneV) * 0.3; }
    if (m.zoneY > 1 - m.zone) { m.zoneY = 1 - m.zone; m.zoneV = -Math.abs(m.zoneV) * 0.2; }
    m.retarget -= dt;
    if (m.retarget <= 0) {
      m.retarget = 0.35 + Math.random() * Math.max(0.3, 1.7 - m.diff * 0.14);
      const jump = 0.15 + Math.random() * (0.2 + m.diff * 0.06);
      m.target = clamp(m.fishY + (Math.random() < 0.5 ? -jump : jump), 0.04, 0.96);
    }
    const speed = 0.25 + m.diff * 0.085;
    m.fishV += ((m.target - m.fishY) * 7 - m.fishV) * Math.min(1, dt * 5);
    m.fishY = clamp(m.fishY + clamp(m.fishV, -speed * 2.2, speed * 2.2) * dt, 0.02, 0.98);
    m.inside = m.fishY >= m.zoneY && m.fishY <= m.zoneY + m.zone;
    m.prog = clamp(m.prog + (m.inside ? m.gain : -m.drain) * dt, 0, 1);
    if (m.prog > 0.6) this.fishImg.classList.remove('mystery');
    this.renderGame();
    if (m.prog >= 1) this.landed(true);
    else if (m.prog <= 0) this.landed(false);
  }

  // ---------- per frame ----------
  update(dt) {
    for (const b of this.bubbles) {
      if (G.level !== G.overworld) break;
      if (Math.abs(b.x - G.player.pos.x) > 80 || Math.abs(b.z - G.player.pos.z) > 80) continue;
      b.t += dt;
      b.mesh.children.forEach((m, i) => {
        const k = ((b.t * 0.8 + i * 0.33) % 1);
        m.scale.setScalar(0.3 + k * 1.2);
        m.position.y = 0.05 + Math.sin(G.elapsed * 2 + i) * 0.03;
      });
      if (Math.random() < dt * 3) G.particles?.burst('splash', b.x + (Math.random() - 0.5) * 1.2, 0.1, b.z + (Math.random() - 0.5) * 1.2, { n: 1, scale: 0.6 });
    }
    if (!this.state) return;
    const pl = G.player;
    if (G.paused) return;
    if (pl.dead) { this.end(true); return; }
    // the line, from rod tip to the bobber, with a little sag
    if (this.bobber.parent) {
      const bob = this.bobber.position;
      let dip = 0;
      if (this.state === 'bite') dip = -0.16 - Math.abs(Math.sin(G.elapsed * 18)) * 0.08;
      else if (this.state === 'reel') dip = -0.1 + Math.sin(G.elapsed * 25) * 0.06;
      else dip = Math.sin(G.elapsed * 2.4) * 0.04 + (this.nibT > 0 ? -0.08 : 0);
      bob.set(this.spot.x, this.spot.y + dip, this.spot.z);
      if (this.state === 'reel') { bob.x += Math.sin(G.elapsed * 7) * 0.25; bob.z += Math.cos(G.elapsed * 5) * 0.25; }
      pl.object.updateMatrixWorld(true);
      pl.held.localToWorld(this.tip.set(0, 1.02, 0));
      const arr = this.lineGeo.attributes.position.array;
      const sag = this.state === 'reel' ? 0.05 : 0.6;
      for (let i = 0; i < 16; i++) {
        const t = i / 15;
        arr[i * 3] = this.tip.x + (bob.x - this.tip.x) * t;
        arr[i * 3 + 1] = this.tip.y + (bob.y + 0.2 - this.tip.y) * t - Math.sin(t * Math.PI) * sag;
        arr[i * 3 + 2] = this.tip.z + (bob.z - this.tip.z) * t;
      }
      this.lineGeo.attributes.position.needsUpdate = true;
    }
    pl.showTool('rod', 0.5);
    const mv = G.input.moveVector();
    if (this.state === 'reel') { pl.lockMove = 0.15; this.updateGame(dt); return; }
    if (mv.len > 0.3 && this.state !== 'cast') { this.reelIn(); return; }
    if (this.state === 'magnet') {
      this.timer -= dt;
      if (this.timer <= 0) {
        G.particles?.burst('splash', this.spot.x, this.spot.y + 0.2, this.spot.z, { n: 20 });
        this.give('sunken_chest');
        if (Math.random() < 0.35) this.give('old_coin', 1 + Math.floor(Math.random() * 3));
        G.player.rig.play('cheer', 0.8);
        G.audio?.play('treasure');
        G.ui.toast('You hauled up a Sunken Chest! Clean it at a Treasure Sink.', 'good');
        this.removeBubble(this.bub);
        G.events.emit('sunkenChest');
        this.end(true);
      }
      return;
    }
    if (this.state === 'wait') {
      this.timer -= dt;
      this.nibT = (this.nibT || 0) - dt;
      if (this.nibbles > 0 && this.timer < 1.5 + this.nibbles * 1.1 && this.nibT <= -0.6) { this.nibbles--; this.nibT = 0.25; G.audio?.play('plip'); G.particles?.burst('splash', this.spot.x, this.spot.y + 0.05, this.spot.z, { n: 2, scale: 0.6 }); }
      if (this.timer <= 0) {
        this.bigShadow = false;
        this.catchId = this.pickCatch();
        if (this.bigShadow) G.ui.toast('A huge shadow circles your bobber but will not bite. A stronger rod might tempt it.', 'info', 4500);
        this.state = 'bite';
        this.timer = 1.25;
        G.audio?.play('bite');
        G.particles?.burst('splash', this.spot.x, this.spot.y + 0.1, this.spot.z, { n: 10 });
      }
    } else if (this.state === 'bite') {
      this.timer -= dt;
      const s = G.cam.toScreen(pl.pos.x, pl.pos.y + 2.6, pl.pos.z);
      this.alert.hidden = !s.visible;
      this.alert.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`;
      if (this.timer <= 0) { G.ui.toast('Too slow! The fish got away.', 'warn'); G.audio?.play('fail'); this.end(true); }
    }
  }
}
