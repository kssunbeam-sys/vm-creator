// Placement mode: select a placeable item in the hotbar, aim, rotate with R,
// click / Use to place it.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { ITEMS } from '../data/items.js';
import { stationModel } from '../world/stationModels.js';
import { MAT } from '../world/materials.js';
import { CITIES, SITES } from '../data/layout.js';

export class Building {
  constructor() {
    this.active = false;
    this.type = null;
    this.rot = 0;
    this.ghost = null;
    this.valid = false;
    this.pos = new THREE.Vector3();
  }
  ghostFor(type) {
    const m = stationModel(type);
    const g = new THREE.Group();
    for (const { geo } of m.meshes) g.add(new THREE.Mesh(geo, MAT.ghostPreviewOk));
    g.userData.model = m;
    return g;
  }
  setGhostValid(ok) {
    this.ghost.traverse((o) => { if (o.isMesh) o.material = ok ? MAT.ghostPreviewOk : MAT.ghostPreviewBad; });
  }
  canBuildHere(x, z, m, type) {
    const level = G.level;
    if (level.isInterior) {
      if (type !== 'torch') return 'Only torches can be placed in here.';
    } else {
      for (const c of Object.values(CITIES)) if (Math.hypot(x - c.x, z - c.z) < c.r + 2) return 'You cannot build inside a town.';
      for (const s of SITES) if (Math.hypot(x - s.x, z - s.z) < 9) return 'Too close to the ruins.';
    }
    const r = Math.max(0.3, Math.max(m.hw, m.hd));
    for (const [dx, dz] of [[0, 0], [m.hw, m.hd], [-m.hw, m.hd], [m.hw, -m.hd], [-m.hw, -m.hd]]) {
      const c = Math.cos(this.rot), s = Math.sin(this.rot);
      const px = x + dx * c + dz * s, pz = z - dx * s + dz * c;
      if (!level.walkable(px, pz)) return 'Not on that ground.';
    }
    if (!m.flat && level.colliders.overlaps(x, z, r * 0.85)) return 'Something is in the way.';
    if (Math.hypot(x - G.player.pos.x, z - G.player.pos.z) < r * 0.6 + 0.5) return 'Step back a little.';
    if (!level.isInterior) {
      const ys = [[m.hw, m.hd], [-m.hw, -m.hd], [m.hw, -m.hd], [-m.hw, m.hd]].map(([a, b]) => level.heightAt(x + a, z + b));
      if (Math.max(...ys) - Math.min(...ys) > 1.0) return 'The ground is too steep.';
    }
    return null;
  }
  update(dt) {
    const cur = G.inv.current;
    const it = cur && ITEMS[cur.id];
    const want = !!(it && it.place && !G.paused && !G.player.dead);
    if (!want) { this.hide(); return; }
    if (this.type !== it.place || !this.ghost) {
      this.hide();
      this.type = it.place;
      this.ghost = this.ghostFor(it.place);
      G.level.scene.add(this.ghost);
    }
    if (this.ghost.parent !== G.level.scene) G.level.scene.add(this.ghost);
    this.active = true;
    if (G.input.hit('KeyR') || G.input.touchHit('rotate')) this.rot += Math.PI / 4;
    const aim = G.actions.aimPoint();
    const p = G.player.pos;
    let dx = aim.x - p.x, dz = aim.z - p.z;
    let d = Math.hypot(dx, dz);
    const m = this.ghost.userData.model;
    const want2 = Math.max(2.0, Math.max(m.hw, m.hd) + 1.4);
    if (d < want2) { const ang = d > 0.01 ? Math.atan2(dx, dz) : G.player.rotY; dx = Math.sin(ang) * want2; dz = Math.cos(ang) * want2; d = want2; }
    if (d > 6) { dx *= 6 / d; dz *= 6 / d; }
    let x = Math.round((p.x + dx) * 2) / 2, z = Math.round((p.z + dz) * 2) / 2;
    this.pos.set(x, G.level.heightAt(x, z), z);
    this.ghost.position.copy(this.pos);
    this.ghost.rotation.y = this.rot;
    const why = this.canBuildHere(x, z, m, this.type);
    this.valid = !why;
    this.reason = why;
    this.setGhostValid(this.valid);
    G.ui.showPrompt(G.input.usingTouch ? '⚒' : 'Click', this.valid ? `Place ${ITEMS[cur.id].name}  ·  R to rotate` : why, x, this.pos.y + 2.2, z);
  }
  hide() {
    if (this.ghost) { this.ghost.parent?.remove(this.ghost); this.ghost = null; }
    this.active = false;
    this.type = null;
  }
  tryPlace() {
    if (!this.active || !this.ghost) return;
    if (!this.valid) { G.ui.toast(this.reason || 'You cannot place that here.', 'warn'); G.audio?.play('error'); return; }
    const cur = G.inv.current;
    const type = ITEMS[cur.id].place;
    G.placed.spawn(type, G.level.id, this.pos.x, this.pos.z, this.rot);
    G.inv.removeAt(G.inv.selected, 1);
    G.player.rig.play('place', 0.35);
    G.audio?.play('place');
    G.particles?.burst('dig', this.pos.x, this.pos.y + 0.3, this.pos.z);
    G.events.emit('placed', type);
    G.ui.hotbarDirty = true;
  }
}
