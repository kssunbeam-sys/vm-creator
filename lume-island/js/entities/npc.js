// Townsfolk: idle, wander near home, face the player, open dialogue.
import * as THREE from '../three.js';
import { G, angleLerp, clamp } from '../core/game.js';
import { buildCharacter, Rig } from './character.js';

export class NPC {
  constructor(def, level, x, z, rot = 0) {
    this.def = def;
    this.level = level;
    this.x = x; this.z = z;
    this.home = { x, z };
    this.rotY = rot;
    this.homeRot = rot;
    this.ch = buildCharacter(def.look);
    this.rig = new Rig(this.ch);
    this.object = this.ch.root;
    this.object.position.set(x, level.heightAt(x, z), z);
    this.object.rotation.y = rot;
    this.radius = 0.4;
    this.target = null;
    this.wait = Math.random() * 4;
    this.col = level.colliders.addCircle(x, z, 0.42, { npc: this });
    this.inter = {
      x, z, r: 0.45, h: 2.4 * (def.look.scale ?? 1), priority: 0.4, npc: this,
      label: () => (G.quests?.npcHasQuest?.(def.id) ? '❗ ' : '') + 'Talk to ' + def.name,
      onInteract: () => G.dialogue.open(this),
    };
    level.addInteractable(this.inter);
    this.talking = false;
    this.emote = null;
  }
  setPos(x, z) {
    this.x = x; this.z = z;
    this.level.colliders.move(this.col, x, z);
    this.inter.x = x; this.inter.z = z;
  }
  update(dt) {
    const p = G.player;
    const dx = p.pos.x - this.x, dz = p.pos.z - this.z;
    const d = Math.hypot(dx, dz);
    let speed = 0;
    if (this.talking || d < 3.2) {
      this.rotY = angleLerp(this.rotY, Math.atan2(dx, dz), clamp(dt * 6, 0, 1));
      this.target = null;
    } else if (this.def.wander) {
      this.wait -= dt;
      if (!this.target && this.wait <= 0) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * (this.def.wander[0] || 6);
        const tx = this.home.x + Math.cos(a) * r, tz = this.home.z + Math.sin(a) * r;
        if (this.level.walkable(tx, tz)) this.target = { x: tx, z: tz };
        this.wait = 2 + Math.random() * 5;
      }
      if (this.target) {
        const tx = this.target.x - this.x, tz = this.target.z - this.z, td = Math.hypot(tx, tz);
        if (td < 0.3) this.target = null;
        else {
          const sp = 1.7;
          let nx = this.x + tx / td * sp * dt, nz = this.z + tz / td * sp * dt;
          if (this.level.walkable(nx, nz) && !this.level.colliders.overlaps(nx, nz, 0.4, this.col)) { this.setPos(nx, nz); speed = 0.35; }
          else this.target = null;
          this.rotY = angleLerp(this.rotY, Math.atan2(tx, tz), clamp(dt * 8, 0, 1));
        }
      }
    } else {
      this.rotY = angleLerp(this.rotY, this.homeRot, clamp(dt * 3, 0, 1));
    }
    const y = this.level.heightAt(this.x, this.z);
    this.object.position.set(this.x, y, this.z);
    this.object.rotation.y = this.rotY;
    this.rig.update(dt, speed);
  }
}
