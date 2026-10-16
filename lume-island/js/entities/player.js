// The player: movement, collisions, facing, animation, health and held tool.
import * as THREE from '../three.js';
import { G, clamp, damp, angleLerp } from '../core/game.js';
import { buildCharacter, Rig } from './character.js';
import { itemGeometry } from '../world/itemModels.js';
import { ITEMS } from '../data/items.js';
import { MAT } from '../world/materials.js';

export const DEFAULT_LOOK = {
  skin: 0xf5c7a1, hair: 0x6b4428, hairStyle: 'short', shirt: 0xf2e6c8, vest: 0x8a6a43, pants: 0x5d6b52,
  shoes: 0x5a3a28, hat: 'explorer', hatColor: 0xc89b62, hatBand: 0x6b4428, backpack: 0x9a6a3c, sleeve: 0xf2e6c8,
};

export class Player {
  constructor(look = DEFAULT_LOOK) {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.rotY = 0;
    this.radius = 0.38;
    this.walkSpeed = 5.4;
    this.runSpeed = 8.6;
    this.object = new THREE.Group();
    this.setLook(look);
    this.lockMove = 0;
    this.moving = false;
    this.speedBonus = 0;
    this.hp = 20;
    this.maxHp = 20;
    this.invuln = 0;
    this.dead = false;
    this.knock = new THREE.Vector3();
    this.heldKey = '';
    this.sliding = null;
    this.stepT = 0;
    this.held = new THREE.Mesh(new THREE.BufferGeometry(), MAT.world);
    this.held.castShadow = true;
    this.ch.socket.add(this.held);
    this.forceTool = null;
    this.forceToolT = 0;
  }
  setLook(look) {
    if (this.ch) { this.object.remove(this.ch.root); }
    this.look = { ...DEFAULT_LOOK, ...look };
    this.ch = buildCharacter(this.look);
    this.object.add(this.ch.root);
    this.rig = new Rig(this.ch);
    if (this.held) { this.ch.socket.add(this.held); this.heldKey = ''; }
  }
  place(x, z, level = G.level) {
    this.pos.set(x, level.heightAt(x, z), z);
    this.vel.set(0, 0, 0);
    this.knock.set(0, 0, 0);
    this.sliding = null;
    this.object.position.copy(this.pos);
  }
  faceTowards(x, z) { this.rotY = Math.atan2(x - this.pos.x, z - this.pos.z); }
  addCoins(n) {
    G.save.coins = Math.max(0, G.save.coins + n);
    if (n > 0) { G.save.stats.earned += n; G.events.emit('coins', n); }
  }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
  showTool(type, secs = 0.9) { this.forceTool = type; this.forceToolT = secs; }

  damage(n, fromX, fromZ, src = '') {
    if (this.invuln > 0 || this.dead) return false;
    if (G.save.peaceful) return false;
    const mult = G.save.difficulty === 'hero' ? 2 : G.save.difficulty === 'cozy' ? 0.5 : 1;
    const dmg = Math.max(1, Math.round(n * mult));
    this.hp -= dmg;
    this.invuln = 0.9;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, l = Math.hypot(dx, dz) || 1;
    this.knock.set(dx / l * 9, 0, dz / l * 9);
    this.rig.play('hurt', 0.3);
    G.audio?.play('hurt');
    G.cam.addShake(0.35);
    G.ui?.flashDamage?.();
    if (this.hp <= 0) { this.hp = 0; G.events.emit('playerDied', src); }
    return true;
  }

  updateHeld() {
    let key = '';
    let id = null, tier;
    if (this.forceTool && this.forceToolT > 0) { id = this.forceTool; }
    else {
      const cur = G.inv?.current;
      if (cur) id = cur.id;
    }
    if (id && ITEMS[id]) {
      const it = ITEMS[id];
      tier = it.cat === 'tool' ? G.save.tools[it.tool]?.tier ?? 0 : undefined;
      key = id + '|' + tier;
    }
    if (key === this.heldKey) return;
    this.heldKey = key;
    if (!id || !ITEMS[id] || ITEMS[id].place) { this.held.visible = false; return; }
    const it = ITEMS[id];
    this.held.geometry = itemGeometry(id, { tier });
    this.held.visible = true;
    if (it.cat === 'tool') {
      this.held.scale.setScalar(it.tool === 'rod' ? 1.0 : 0.85);
      this.held.position.set(0, -0.02, 0.05);
      this.held.rotation.set(Math.PI / 2 + 0.25, 0, 0);
      if (it.tool === 'whip') { this.held.rotation.set(Math.PI / 2, 0, 0); this.held.scale.setScalar(0.55); }
      this.held.position.y = -0.0;
      // tool geometry is centred at its middle; shift so the grip sits in the hand
      this.held.translateY(0.38);
    } else {
      this.held.scale.setScalar(0.32);
      this.held.position.set(0, -0.08, 0.12);
      this.held.rotation.set(0, 0, 0);
    }
  }

  update(dt) {
    const level = G.level;
    const input = G.input;
    if (this.ride) {
      // scripted movement (the lift): the ride function moves pos directly
      if (dt > 0) this.ride(dt);
      this.object.position.copy(this.pos);
      this.object.rotation.y = angleLerp(this.object.rotation.y, this.rotY, clamp(dt * 10, 0, 1));
      this.rig.update(dt, this.rideSpeed || 0);
      this.updateHeld();
      return;
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.forceToolT > 0) this.forceToolT -= dt;
    let mv = { x: 0, z: 0, len: 0 };
    const busy = this.rig.busy && !['eat', 'talk', 'hurt'].includes(this.rig.action);
    if (!G.paused && this.lockMove <= 0 && !busy && !this.dead) mv = input.moveVector();
    if (this.lockMove > 0) this.lockMove -= dt;
    const run = input.down('ShiftLeft') || input.down('ShiftRight') || (input.usingTouch && mv.len > 0.85) || G.settings?.autoRun;
    const maxSp = (run ? this.runSpeed : this.walkSpeed) * (1 + this.speedBonus);
    let tvx = mv.x * maxSp, tvz = mv.z * maxSp;
    if (this.sliding) { tvx = this.sliding.x * 8; tvz = this.sliding.z * 8; }
    this.vel.x = damp(this.vel.x, tvx, this.sliding ? 40 : 14, dt);
    this.vel.z = damp(this.vel.z, tvz, this.sliding ? 40 : 14, dt);
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 7));
    const vx = this.vel.x + this.knock.x, vz = this.vel.z + this.knock.z;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.moving = sp > 0.3;
    if (Math.hypot(vx, vz) > 0.01) {
      let nx = this.pos.x + vx * dt, nz = this.pos.z + vz * dt;
      const ok = (x, z) => level.walkable(x, z, this);
      if (!ok(nx, nz)) {
        if (ok(nx, this.pos.z)) nz = this.pos.z;
        else if (ok(this.pos.x, nz)) nx = this.pos.x;
        else { nx = this.pos.x; nz = this.pos.z; if (this.sliding) level.onSlideStop?.(this); }
      }
      const r = level.colliders.resolve(nx, nz, this.radius);
      if (ok(r.x, r.z)) { nx = r.x; nz = r.z; }
      else if (!ok(nx, nz)) { nx = this.pos.x; nz = this.pos.z; }
      if (this.sliding && Math.hypot(nx - this.pos.x, nz - this.pos.z) < 0.001) level.onSlideStop?.(this);
      this.pos.x = nx; this.pos.z = nz;
      if (mv.len > 0.1 && !this.sliding) this.rotY = angleLerp(this.rotY, Math.atan2(mv.x, mv.z), clamp(dt * 14, 0, 1));
    }
    const gy = level.heightAt(this.pos.x, this.pos.z);
    this.pos.y = damp(this.pos.y, gy, 20, dt);
    if (Math.abs(this.pos.y - gy) > 2) this.pos.y = gy;
    this.object.position.copy(this.pos);
    this.object.rotation.y = angleLerp(this.object.rotation.y, this.rotY, clamp(dt * 16, 0, 1));
    this.rig.update(dt, this.sliding ? 0 : sp / this.walkSpeed);
    this.ch.root.visible = !(this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0);
    this.updateHeld();
    // footsteps
    if (this.moving && !this.sliding) {
      this.stepT -= dt * (sp / this.walkSpeed);
      if (this.stepT <= 0) { this.stepT = 0.36; G.audio?.step(level.surfaceKind?.(this.pos.x, this.pos.z) ?? 'grass'); }
    }
  }
}
