// Offering crystals hidden around each biome, and the biome Shrines where
// they are placed. Filling every pedestal lowers the barrier around two chests.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { RNG } from '../core/rng.js';
import { part, merge, P, jiggle } from '../core/geo.js';
import { MAT } from './materials.js';
import { SITES, CITIES, HOMESTEAD, BIOMES } from '../data/layout.js';
import { ITEMS } from '../data/items.js';
import { toolPower } from '../systems/actions.js';

export const OFFERINGS = { meadow: 6, forest: 8, mountain: 8, jungle: 8 };   // per shrine; one of each comes from the biome's crystal ruin
const COLOR = { meadow: 0xffd27a, forest: 0x6ff08a, mountain: 0x9fe4ff, jungle: 0xff7a4a };
const STONE = { meadow: 0xd2c19a, forest: 0x8f9c7c, mountain: 0xb4c2d4, jungle: 0xc0906e };
const ROCK = { meadow: 0x9a8f80, forest: 0x7f8a72, mountain: 0x9aa4b8, jungle: 0x6e5a50 };
const PICK_NEED = { meadow: 1, forest: 4, mountain: 8, jungle: 12 };
const KINDS = ['pedestal', 'boulder', 'buried'];

const glowMats = {};
const glowMat = (b) => (glowMats[b] ||= new THREE.MeshLambertMaterial({ color: COLOR[b], emissive: COLOR[b], emissiveIntensity: 0.55 }));
const crystalGeo = () => merge([part(P.octa(0.34, 0), 0xffffff, { sy: 1.7, jitter: 0.1 }), part(P.octa(0.16, 0), 0xffffff, { x: 0.26, y: -0.2, sy: 1.5, rz: -0.45, jitter: 0.1 }), part(P.octa(0.13, 0), 0xffffff, { x: -0.22, y: -0.25, sy: 1.4, rz: 0.5, jitter: 0.1 })]);

export class Shrines {
  constructor(world) {
    this.world = world;
    this.spots = [];
    this.shrines = {};
    this.crystal = crystalGeo();
    this.placeSpots();
    for (const s of SITES) if (s.kind === 'shrine') this.buildShrine(s);
    G.events.on('gameStart', () => this.sync());
  }
  get st() {
    const o = (G.save.offerings ||= {});
    o.got ||= {}; o.ruin ||= {}; o.placed ||= {}; o.chests ||= {};
    return o;
  }

  // ---------- offering spots in the wild ----------
  placeSpots() {
    const W = this.world, T = W.terrain;
    let bi = 0;
    for (const b of Object.keys(OFFERINGS)) {
      const rng = new RNG(4242 + bi * 101);
      const want = OFFERINGS[b] - 1;
      const mine = [];
      for (let tries = 0; tries < 6000 && mine.length < want; tries++) {
        const x = -330 + rng.next() * 660, z = -330 + rng.next() * 660;
        if (T.biomeAt(x, z) !== b || !T.walkable(x, z) || T.groundAt(x, z) < 1.0) continue;
        if (T.waterAt(x, z) || T.lakeAt(x, z, 4)) continue;
        if (Object.values(CITIES).some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 8)) continue;
        if (Math.hypot(HOMESTEAD.x - x, HOMESTEAD.z - z) < HOMESTEAD.r + 6) continue;
        if (SITES.some((s) => Math.hypot(s.x - x, s.z - z) < 18)) continue;
        if (mine.some((m) => Math.hypot(m.x - x, m.z - z) < (b === 'meadow' ? 40 : 45))) continue;
        T.pathWeight(x, z);
        if (T._pwWide > 0.2) continue;
        let ok = true;
        for (let a = 0; a < 8 && ok; a++) if (!T.walkable(x + Math.cos(a * 0.785) * 2.5, z + Math.sin(a * 0.785) * 2.5)) ok = false;
        if (!ok || W.colliders.overlaps(x, z, 1.6)) continue;
        let blocked = false;
        W.nodes.query(x, z, 2.2, (n) => { if (Math.hypot(n.x - x, n.z - z) < 2.0) blocked = true; });
        if (blocked) continue;
        mine.push({ id: `${b}_${mine.length}`, biome: b, x, z, kind: KINDS[mine.length % 3] });
      }
      this.spots.push(...mine);
      bi++;
    }
    for (const s of this.spots) this.buildSpot(s);
  }
  buildSpot(s) {
    const W = this.world;
    const y = W.heightAt(s.x, s.z);
    const g = new THREE.Group();
    g.position.set(s.x, y, s.z);
    const body = [];
    const cr = new THREE.Mesh(this.crystal, glowMat(s.biome));
    cr.castShadow = true;
    if (s.kind === 'pedestal') {
      body.push(part(P.cyl(0.5, 0.62, 0.7, 7), STONE[s.biome], { y: 0.3, jitter: 0.06 }));
      body.push(part(P.cyl(0.62, 0.62, 0.14, 7), new THREE.Color(STONE[s.biome]).multiplyScalar(0.8).getHex(), { y: 0.7 }));
      for (let i = 0; i < 3; i++) body.push(jiggle(part(P.ico(0.22, 0), 0x6aa84a, { x: Math.cos(i * 2.1) * 0.55, y: 0.12, z: Math.sin(i * 2.1) * 0.55, sy: 0.5 }), 0.05, i));
      cr.position.y = 1.45;
      s.collider = W.colliders.addCircle(s.x, s.z, 0.6);
    } else if (s.kind === 'boulder') {
      body.push(jiggle(part(P.dodeca(1.05, 0), ROCK[s.biome], { y: 0.75, sy: 0.85, jitter: 0.1 }), 0.12, 7));
      body.push(jiggle(part(P.dodeca(0.55, 0), ROCK[s.biome], { x: 0.9, y: 0.3, z: 0.3, jitter: 0.1 }), 0.1, 9));
      for (let i = 0; i < 4; i++) body.push(part(P.box(0.05, 0.6, 0.03), 0x3a3434, { x: Math.cos(i * 1.6) * 0.5, y: 0.9, z: Math.sin(i * 1.6) * 0.9, rz: (i - 1.5) * 0.5, ry: i, jitter: 0 }));
      cr.position.set(0.1, 1.3, 0.62); cr.scale.setScalar(0.8); cr.rotation.x = 0.7;
      s.collider = W.colliders.addCircle(s.x, s.z, 1.1);
    } else {
      body.push(part(P.cone(0.85, 0.4, 9), 0x8a6a48, { y: 0.14, jitter: 0.12 }));
      body.push(part(P.cone(0.4, 0.22, 7), 0x6a4e34, { x: 0.5, y: 0.08, z: -0.2, jitter: 0.1 }));
      cr.position.y = 0.3; cr.scale.setScalar(0.45);
    }
    const m = new THREE.Mesh(merge(body), MAT.world);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m, cr);
    W.scene.add(g);
    s.group = g; s.cr = cr; s.base = m;
    s.light = { x: s.x, y: y + 1.6, z: s.z, color: COLOR[s.biome], intensity: 1.2, distance: 7 };
    W.lightSources.push(s.light);
    const name = ITEMS['crystal_' + s.biome].name;
    s.inter = W.addInteractable({ x: s.x, z: s.z, r: s.kind === 'boulder' ? 1.1 : 0.6, h: 2.2, priority: 0.3,
      label: () => (s.kind === 'pedestal' ? `Take the ${name}` : s.kind === 'boulder' ? `Break the boulder (Pickaxe ${PICK_NEED[s.biome]}+)` : 'Dig up the glowing mound'),
      canInteract: () => !this.st.got[s.id],
      onInteract: () => this.claim(s) });
  }
  claim(s) {
    const pl = G.player;
    if (s.kind === 'boulder') {
      if (!G.inv.has('pickaxe')) { G.ui.toast('A crystal glows inside the rock. You need a pickaxe.', 'warn'); return; }
      if (toolPower('pickaxe') < PICK_NEED[s.biome]) { G.ui.toast(`This rock is too hard. Upgrade your pickaxe to power ${PICK_NEED[s.biome]} at an anvil.`, 'warn'); return; }
      G.actions.selectTool('pickaxe');
      pl.showTool('pickaxe');
      pl.rig.play('swing', 0.45, () => { G.audio?.play('mine'); G.particles?.burst('rock', s.x, pl.pos.y + 0.8, s.z, { n: 16 }); G.cam.addShake(0.25); this.release(s); });
      return;
    }
    if (s.kind === 'buried') {
      if (!G.inv.has('shovel')) { G.ui.toast('Something glows under the soil. You need a shovel.', 'warn'); return; }
      G.actions.selectTool('shovel');
      pl.showTool('shovel');
      pl.rig.play('dig', 0.5, () => { G.audio?.play('dig'); G.particles?.burst('dig', s.x, pl.pos.y + 0.4, s.z, { n: 14 }); this.release(s); });
      return;
    }
    pl.rig.play('pet', 0.4, () => this.release(s));
  }
  release(s) {
    if (this.st.got[s.id]) return;
    this.st.got[s.id] = true;
    const y = this.world.heightAt(s.x, s.z);
    G.pickups.spawn('crystal_' + s.biome, 1, s.x, y + 1.2, s.z);
    G.particles?.burst('magic', s.x, y + 1.2, s.z, { n: 24, color: COLOR[s.biome] });
    G.audio?.play('magic');
    this.hideSpot(s);
    const got = this.found(s.biome);
    G.ui.toast(`Offering found! ${got} of ${OFFERINGS[s.biome]} for the ${BIOMES[s.biome].short} Shrine.`, 'magic', 3500);
    G.events.emit('offeringFound', s.biome);
  }
  hideSpot(s) {
    s.cr.visible = false;
    if (s.kind !== 'pedestal') { s.group.visible = false; if (s.collider) { this.world.colliders.remove(s.collider); s.collider = null; } }
    const i = this.world.lightSources.indexOf(s.light);
    if (i >= 0) this.world.lightSources.splice(i, 1);
  }
  showSpot(s) {
    s.cr.visible = true; s.group.visible = true;
    if (!s.collider && s.kind !== 'buried') s.collider = this.world.colliders.addCircle(s.x, s.z, s.kind === 'boulder' ? 1.1 : 0.6);
    if (!this.world.lightSources.includes(s.light)) this.world.lightSources.push(s.light);
  }
  found(b) { return this.spots.filter((s) => s.biome === b && this.st.got[s.id]).length + (this.st.ruin[b] ? 1 : 0); }
  // shovel use on bare ground
  tryDig(x, z) {
    if (G.level !== this.world) return false;
    const s = this.spots.find((p) => p.kind === 'buried' && !this.st.got[p.id] && Math.hypot(p.x - x, p.z - z) < 1.8);
    if (!s) return false;
    G.particles?.burst('dig', s.x, G.player.pos.y + 0.4, s.z, { n: 14 });
    this.release(s);
    return true;
  }
  // the first clear of each crystal ruin holds that biome's last offering
  ruinOffering(b) {
    if (this.st.ruin[b]) return false;
    this.st.ruin[b] = true;
    return true;
  }
  nearestOffering(x, z) {
    let best = null, bd = Infinity;
    for (const s of this.spots) {
      if (this.st.got[s.id]) continue;
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  // ---------- shrines ----------
  buildShrine(site) {
    const W = this.world, b = site.biome, n = OFFERINGS[b];
    const y = W.heightAt(site.x, site.z);
    const st = STONE[b], dark = new THREE.Color(st).multiplyScalar(0.75).getHex();
    const g = new THREE.Group();
    g.position.set(site.x, y - 0.05, site.z);
    const body = [];
    body.push(part(P.cyl(7.6, 8.0, 0.4, 24), dark, { y: 0.1, jitter: 0.03 }));
    body.push(part(P.cyl(7.0, 7.2, 0.2, 24), st, { y: 0.38, jitter: 0.03 }));
    body.push(part(P.cyl(2.4, 2.6, 0.45, 12), dark, { y: 0.6, jitter: 0.03 }));
    // standing stone behind the dais
    body.push(part(P.box(1.6, 4.2, 0.8), st, { y: 2.4, z: -3.6, jitter: 0.06 }));
    body.push(part(P.box(2.2, 0.4, 1.1), dark, { y: 4.6, z: -3.6 }));
    const glow = [part(P.octa(0.45, 0), 0xffffff, { y: 3.2, z: -3.15, sy: 1.5, jitter: 0 })];
    const peds = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (i + 0.5) / n * Math.PI * 2;
      const px = Math.cos(a) * 5.3, pz = Math.sin(a) * 5.3;
      body.push(part(P.cyl(0.42, 0.5, 1.1, 7), st, { x: px, y: 0.95, z: pz, jitter: 0.05 }));
      body.push(part(P.cyl(0.55, 0.55, 0.14, 7), dark, { x: px, y: 1.55, z: pz }));
      peds.push({ i, x: site.x + px, z: site.z + pz });
    }
    const m = new THREE.Mesh(merge(body), MAT.world);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m, new THREE.Mesh(merge(glow), glowMat(b)));
    // chests on the dais
    const chests = [];
    for (const [k, col, dx] of [['y', 0xd8a030, -0.95], ['p', 0x7a4ab0, 0.95]]) {
      const cg = new THREE.Group();
      cg.add(new THREE.Mesh(merge([part(P.box(1.1, 0.6, 0.75), col, { y: 0.3, jitter: 0.03 }), part(P.box(1.14, 0.1, 0.79), 0xf2d27a, { y: 0.08 }), part(P.box(0.1, 0.62, 0.79), 0xf2d27a, { x: 0.36, y: 0.31 }), part(P.box(0.1, 0.62, 0.79), 0xf2d27a, { x: -0.36, y: 0.31 })]), MAT.world));
      const lid = new THREE.Group();
      lid.position.set(0, 0.6, -0.37);
      lid.add(new THREE.Mesh(merge([part(new THREE.CylinderGeometry(0.37, 0.37, 1.1, 10, 1, false, 0, Math.PI), col, { rz: Math.PI / 2, ry: Math.PI / 2, z: 0.37, jitter: 0.02 }), part(P.box(0.22, 0.24, 0.07), 0xf2c94c, { y: -0.04, z: 0.75 })]), MAT.world));
      cg.add(lid);
      cg.position.set(dx, 0.82, 0.2);
      cg.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.add(cg);
      chests.push({ k, lid, x: site.x + dx, z: site.z + 0.2 });
    }
    // barrier dome
    const barrier = new THREE.Mesh(new THREE.SphereGeometry(2.55, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: COLOR[b], transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    barrier.position.y = 0.8;
    g.add(barrier);
    W.scene.add(g);
    // pedestal crystals
    for (const p of peds) {
      const c = new THREE.Mesh(this.crystal, glowMat(b));
      c.position.set(p.x - site.x, 2.15, p.z - site.z);
      c.scale.setScalar(0.75);
      c.visible = false;
      g.add(c);
      p.mesh = c;
      W.colliders.addCircle(p.x, p.z, 0.55);
    }
    W.colliders.addBox(site.x, site.z - 3.6, 0.9, 0.5);
    const dais = W.colliders.addCircle(site.x, site.z, 2.5);
    const S = { site, biome: b, peds, chests, barrier, group: g, dais, fade: 0 };
    this.shrines[b] = S;
    W.lightSources.push({ x: site.x, y: y + 3.2, z: site.z - 2.6, color: COLOR[b], intensity: 2.2, distance: 12 });
    const name = ITEMS['crystal_' + b].name;
    for (const p of peds) {
      W.addInteractable({ x: p.x, z: p.z, r: 0.55, h: 2.6, priority: 0.2,
        label: () => (G.inv.has('crystal_' + b) ? `Place a ${name}` : `Empty pedestal (${name})`),
        canInteract: () => this.placed(b) <= p.i,
        onInteract: () => this.placeOffering(b) });
    }
    W.addInteractable({ x: site.x, z: site.z - 2.8, r: 1.0, h: 3.6, priority: -0.2, label: `Read the ${site.name} stone`,
      onInteract: () => G.dialogue.openText(site.name, `The stone reads: "Bring the ${n} lost offerings of the ${BIOMES[b].name} home, and the old gifts are yours." ${this.placed(b)} of ${n} pedestals glow. You have found ${this.found(b)} offerings here so far.`) });
    for (const c of chests) {
      W.addInteractable({ x: c.x, z: c.z + 0.6, r: 0.6, h: 1.8, priority: 0.4, label: c.k === 'y' ? 'Open the golden chest' : 'Open the violet chest',
        canInteract: () => this.complete(b) && !this.st.chests[b + '_' + c.k], onInteract: () => this.openChest(b, c) });
    }
  }
  placed(b) { return this.st.placed[b] || 0; }
  complete(b) { return this.placed(b) >= OFFERINGS[b]; }
  placeOffering(b) {
    const S = this.shrines[b];
    if (!G.inv.has('crystal_' + b)) {
      G.dialogue.openText(S.site.name, `This pedestal waits for a ${ITEMS['crystal_' + b].name}. They are hidden all over the ${BIOMES[b].name}: on old pedestals, inside boulders and buried in glowing mounds. The ${BIOMES[b].short} Crystal Ruin keeps one as well.`);
      return;
    }
    const n = Math.min(G.inv.count('crystal_' + b), OFFERINGS[b] - this.placed(b));
    G.inv.remove('crystal_' + b, n);
    this.st.placed[b] = this.placed(b) + n;
    G.player.rig.play('place', 0.5);
    G.audio?.play('solve');
    this.syncShrine(b, true);
    G.events.emit('offeringPlaced', b, this.placed(b));
    if (this.complete(b)) {
      G.ui.banner(S.site.name, 'All offerings returned! The barrier fades.', 3500);
      G.audio?.play('fanfare');
      G.events.emit('shrineComplete', b);
    } else G.ui.toast(`${this.placed(b)} of ${OFFERINGS[b]} offerings placed.`, 'magic');
  }
  openChest(b, c) {
    const key = b + '_' + c.k;
    if (this.st.chests[key]) return;
    this.st.chests[key] = true;
    G.audio?.play('chest');
    let t = 0;
    const off = this.world.addUpdater((dt) => { t += dt; c.lid.rotation.x = -1.9 * Math.min(1, t / 0.5); if (t > 0.5) off(); });
    const y = this.world.heightAt(c.x, c.z) + 1.4;
    const tier = BIOMES[b].tier;
    const loot = c.k === 'y'
      ? [['$', 150 + tier * 150], ['tool_token', 3], [BIOMES[b].token, 5], [tier % 2 ? 'water_spirit' : 'nature_spirit', 2], ['heart_crystal', b === 'mountain' ? 1 : 0]]
      : [['mysterious_egg', 1], ['ancient_book', 1], ['lost_spirit', 1]];
    setTimeout(() => { for (const [id, q] of loot) if (q > 0) G.pickups.spawn(id, q, c.x, y, c.z + 0.6); G.particles?.burst('magic', c.x, y, c.z, { n: 26 }); }, 350);
    G.events.emit('shrineChest', b, c.k);
  }
  syncShrine(b, animate = false) {
    const S = this.shrines[b];
    const n = this.placed(b);
    for (const p of S.peds) p.mesh.visible = p.i < n;
    const done = this.complete(b);
    if (done && S.dais) { this.world.colliders.remove(S.dais); S.dais = null; for (const c of S.chests) c.col = this.world.colliders.addBox(c.x, c.z, 0.55, 0.4); }
    if (done && !animate) S.barrier.visible = false;
    if (done && animate) S.fade = 1;
    if (!done) { S.barrier.visible = true; S.barrier.material.opacity = 0.28; }
    for (const c of S.chests) c.lid.rotation.x = this.st.chests[b + '_' + c.k] ? -1.9 : 0;
  }
  sync() {
    for (const s of this.spots) { if (this.st.got[s.id]) this.hideSpot(s); else this.showSpot(s); }
    for (const b of Object.keys(this.shrines)) {
      const S = this.shrines[b];
      if (!this.complete(b) && !S.dais) { S.dais = this.world.colliders.addCircle(S.site.x, S.site.z, 2.5); for (const c of S.chests) { this.world.colliders.remove(c.col); c.col = null; } }
      this.syncShrine(b);
    }
  }
  update(dt) {
    if (G.level !== this.world) return;
    const p = G.player.pos;
    for (const s of this.spots) {
      if (!s.cr.visible || Math.abs(s.x - p.x) > 60 || Math.abs(s.z - p.z) > 60) continue;
      if (s.kind === 'pedestal') { s.cr.rotation.y += dt * 1.2; s.cr.position.y = 1.45 + Math.sin(G.elapsed * 2 + s.x) * 0.12; }
      if (Math.random() < dt * 1.5) G.particles?.burst('sparkle', s.x + (Math.random() - 0.5), s.cr.position.y + this.world.heightAt(s.x, s.z), s.z + (Math.random() - 0.5), { n: 1, color: COLOR[s.biome] });
    }
    for (const S of Object.values(this.shrines)) {
      if (Math.abs(S.site.x - p.x) > 70 || Math.abs(S.site.z - p.z) > 70) continue;
      for (const pd of S.peds) if (pd.mesh.visible) { pd.mesh.rotation.y += dt; pd.mesh.position.y = 2.15 + Math.sin(G.elapsed * 1.6 + pd.i) * 0.1; }
      if (S.barrier.visible) {
        if (S.fade > 0) { S.fade -= dt * 0.5; S.barrier.material.opacity = 0.28 * Math.max(0, S.fade); S.barrier.scale.setScalar(1 + (1 - S.fade) * 0.4); if (S.fade <= 0) S.barrier.visible = false; }
        else S.barrier.material.opacity = 0.22 + Math.sin(G.elapsed * 2) * 0.06;
      }
    }
  }
}
