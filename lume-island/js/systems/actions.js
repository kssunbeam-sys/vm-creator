// Player actions: tool use with smart targeting, eating, interacting.
import * as THREE from '../three.js';
import { G, clamp } from '../core/game.js';
import { ITEMS } from '../data/items.js';
import { NODE_TYPES } from '../world/nodeTypes.js';
import { toolLabel } from '../world/nodes.js';

export function toolPower(type) {
  const t = G.save.tools[type];
  return t ? t.tier * 5 + t.lvl : 0;
}
export function ownsTool(type) { return G.inv.has(type); }

const SOUND = { tree: 'chop', rock: 'mine', dig: 'dig', break: 'smash', bush: 'rustle', plant: 'rustle' };

export class Actions {
  constructor() {
    this.cooldown = 0;
    this.aim = new THREE.Vector3();
    this.best = null;
    this._scan = 0;
  }

  aimPoint() {
    const p = G.player;
    const m = G.input.mouse;
    if (!G.input.usingTouch && m.overCanvas && performance.now() - m.lastMove < 4000) {
      const gp = G.cam.groundPoint(m.nx, m.ny, (x, z) => G.level.heightAt(x, z), p.pos.y);
      const dx = gp.x - p.pos.x, dz = gp.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d < 4.5) return this.aim.set(gp.x, gp.y, gp.z);
      if (d > 0.01) return this.aim.set(p.pos.x + dx / d * 1.5, p.pos.y, p.pos.z + dz / d * 1.5);
    }
    return this.aim.set(p.pos.x + Math.sin(p.rotY) * 1.5, p.pos.y, p.pos.z + Math.cos(p.rotY) * 1.5);
  }

  // Best thing to hit near the aim point
  findTarget(aim, prefer) {
    const level = G.level, p = G.player.pos;
    let best = null, bestScore = Infinity;
    const reach = prefer === 'whip' ? 4.2 : 2.5;
    level.nodes?.query(aim.x, aim.z, 4, (n) => {
      const def = NODE_TYPES[n.type];
      if (def.decor || !n.alive || (def.fruitOnly && !n.ripe)) return;
      if (def.pick && !def.anyTool) return; // picked with E
      const r = (def.r || 0.45) * n.s;
      const dp = Math.hypot(n.x - p.x, n.z - p.z) - r;
      if (dp > reach) return;
      let score = Math.hypot(n.x - aim.x, n.z - aim.z) - r * 0.5;
      if (prefer && def.tool !== prefer && def.alt !== prefer && !def.anyTool) score += 1.2;
      if (score < bestScore) { bestScore = score; best = { kind: 'node', node: n, def, x: n.x, z: n.z }; }
    });
    for (const e of level.entities) {
      if (!e.hittable || e.dead) continue;
      const dp = Math.hypot(e.x - p.x, e.z - p.z) - (e.radius || 0.5);
      if (dp > (prefer === 'whip' ? 4.2 : 2.6)) continue;
      const score = Math.hypot(e.x - aim.x, e.z - aim.z) - 0.6 - (e.hostile ? 1.0 : 0);
      if (score < bestScore) { bestScore = score; best = { kind: 'entity', ent: e, x: e.x, z: e.z }; }
    }
    return best;
  }

  use() {
    const pl = G.player;
    if (this.cooldown > 0 || pl.rig.busy || pl.dead || pl.lockMove > 0) return;
    const cur = G.inv.current;
    const it = cur ? ITEMS[cur.id] : null;
    if (it?.place) { G.building?.tryPlace(); return; }
    if (it && it.cat !== 'tool') {
      if (it.use) { G.items?.useSpecial(it, G.inv.selected); return; }
      if (it.food) { this.eat(it); return; }
      if (it.bait || it.id === 'magnet') { G.ui.toast('Equip a Fishing Rod to use bait. It is used automatically.', 'info'); return; }
    }
    const aim = this.aimPoint();
    const selectedTool = it?.cat === 'tool' ? it.tool : null;
    if (selectedTool === 'rod') { G.fishing?.cast(aim); return; }
    if (selectedTool === 'net') { this.swingNet(aim); return; }
    let target = this.findTarget(aim, selectedTool);
    let tool = selectedTool;
    if (target?.kind === 'node') {
      const def = target.def;
      const need = def.tool;
      if (!def.anyTool && tool !== need && def.alt !== tool) {
        if (G.settings.smartTools && ownsTool(need)) { tool = need; this.selectTool(need); }
        else if (G.settings.smartTools && def.alt && ownsTool(def.alt)) { tool = def.alt; this.selectTool(def.alt); }
        else { G.ui.toast(`You need a ${toolLabel(need)} for that.`, 'warn'); return; }
      }
      if (!tool) tool = ['axe', 'pickaxe', 'shovel', 'whip'].find((t) => ownsTool(t)) || 'hand';
    } else if (target?.kind === 'entity') {
      if (!tool || (tool !== 'whip' && G.settings.smartTools && ownsTool('whip'))) { tool = ownsTool('whip') ? 'whip' : tool; if (tool === 'whip') this.selectTool('whip'); }
    }
    if (!tool) {
      // empty hand: try interacting instead
      if (this.best) { this.interact(); return; }
      return;
    }
    if (target) pl.faceTowards(target.x, target.z);
    else pl.faceTowards(aim.x, aim.z);
    if (tool === 'whip') { this.whip(aim, target); return; }
    const anim = tool === 'shovel' ? 'dig' : 'swing';
    pl.showTool(tool);
    this.cooldown = 0.12;
    pl.rig.play(anim, tool === 'shovel' ? 0.5 : 0.42, () => {
      if (!target) { G.audio?.play('whoosh'); return; }
      if (target.kind === 'node') {
        const res = G.level.nodes.hit(target.node, tool, tool === 'hand' ? 1 : toolPower(tool), pl.pos.x, pl.pos.z);
        if (res.msg) G.ui.toast(res.msg, 'warn');
        if (res.ok) {
          G.audio?.play(SOUND[target.def.kind] || 'thunk');
          G.particles?.burst(target.def.kind === 'tree' ? 'tree' : target.def.kind, target.node.x, target.node.y + (target.def.kind === 'tree' ? 1.3 : 0.5), target.node.z, { n: 4 });
          if (target.def.kind === 'rock') G.cam.addShake(0.12);
          G.events.emit('toolHit', tool, target.node.type);
        } else G.audio?.play('clank');
      } else if (target.kind === 'entity') {
        target.ent.onHit?.(toolPower(tool) * 0.5 + 1, pl.pos.x, pl.pos.z, tool);
      }
    });
  }

  selectTool(type) {
    const i = G.inv.slots.findIndex((s, k) => k < 10 && s && s.id === type);
    if (i >= 0 && G.inv.selected !== i) { G.inv.selected = i; G.ui.hotbarDirty = true; }
  }

  whip(aim, target) {
    const pl = G.player;
    pl.showTool('whip');
    this.cooldown = 0.2;
    G.audio?.play('whipWind');
    pl.rig.play('whip', 0.42, () => {
      G.audio?.play('whip');
      const dirx = Math.sin(pl.rotY), dirz = Math.cos(pl.rotY);
      G.effects?.whipLine(pl, 4.0);
      const power = toolPower('whip');
      const hitSet = new Set();
      // entities in a narrow cone
      for (const e of G.level.entities) {
        if (!e.hittable || e.dead) continue;
        const dx = e.x - pl.pos.x, dz = e.z - pl.pos.z, d = Math.hypot(dx, dz);
        if (d > 4.4 + (e.radius || 0.5)) continue;
        const dot = (dx * dirx + dz * dirz) / (d || 1);
        if (dot < 0.55 && d > 1.2) continue;
        e.onHit?.(1 + power * 0.6, pl.pos.x, pl.pos.z, 'whip');
        hitSet.add(e);
      }
      // pots and grass along the lash
      G.level.nodes?.query(pl.pos.x + dirx * 2, pl.pos.z + dirz * 2, 3, (n) => {
        const def = NODE_TYPES[n.type];
        if (!n.alive || def.kind !== 'break' && !def.anyTool) return;
        const dx = n.x - pl.pos.x, dz = n.z - pl.pos.z, d = Math.hypot(dx, dz);
        if (d > 4.3) return;
        const dot = (dx * dirx + dz * dirz) / (d || 1);
        if (dot < 0.6) return;
        G.level.nodes.hit(n, 'whip', power, pl.pos.x, pl.pos.z);
        G.audio?.play('smash');
      });
      G.events.emit('whip', pl.pos.x + dirx * 3, pl.pos.z + dirz * 3);
    });
  }

  swingNet(aim) {
    const pl = G.player;
    pl.faceTowards(aim.x, aim.z);
    pl.showTool('net');
    this.cooldown = 0.25;
    G.audio?.play('whoosh');
    pl.rig.play('net', 0.5, () => { G.bugs?.tryCatch(pl, toolPower('net')); });
  }

  eat(it) {
    const pl = G.player;
    if (pl.hp >= pl.maxHp) { G.ui.toast("You're not hungry right now.", 'info'); return; }
    const heal = it.food * (it.cat === 'food' ? 2 : 1.5);
    G.inv.removeAt(G.inv.selected, 1);
    pl.rig.play('eat', 0.8);
    G.audio?.play('eat');
    pl.heal(Math.round(heal));
    G.particles?.burst('hearts', pl.pos.x, pl.pos.y + 1.8, pl.pos.z);
    G.ui.hotbarDirty = true;
  }

  // ---------- interaction ----------
  scanInteract() {
    const pl = G.player;
    const p = pl.pos;
    let best = null, bd = Infinity;
    const fx = Math.sin(pl.rotY), fz = Math.cos(pl.rotY);
    for (const o of G.level.interactables) {
      if (o.enabled === false || (o.canInteract && !o.canInteract())) continue;
      const dx = o.x - p.x, dz = o.z - p.z;
      const d = Math.hypot(dx, dz) - (o.r || 0.5);
      const range = o.range ?? 1.6;
      if (d > range) continue;
      const facing = (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1);
      const score = d - facing * 0.6 - (o.priority || 0);
      if (score < bd) { bd = score; best = { kind: 'obj', obj: o }; }
    }
    G.level.nodes?.query(p.x, p.z, 3, (n) => {
      const def = NODE_TYPES[n.type];
      if (!def.pick || !n.alive || (def.fruitOnly && !n.ripe)) return;
      const dx = n.x - p.x, dz = n.z - p.z;
      const d = Math.hypot(dx, dz) - (def.r || 0.3) * n.s;
      if (d > 1.3) return;
      const facing = (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1);
      const score = d - facing * 0.6 + 0.3;
      if (score < bd) { bd = score; best = { kind: 'node', node: n, def }; }
    });
    this.best = best;
    if (best) {
      if (best.kind === 'obj') {
        const o = best.obj;
        G.ui.showPrompt('E', typeof o.label === 'function' ? o.label() : o.label, o.x, (o.y ?? G.level.heightAt(o.x, o.z)) + (o.h ?? 2.2), o.z);
      } else {
        const n = best.node;
        G.ui.showPrompt('E', pickLabel(best.def, n), n.x, n.y + 1.3, n.z);
      }
    } else G.ui.hidePrompt();
  }

  interact() {
    const b = this.best;
    if (!b || G.player.rig.busy) return;
    if (b.kind === 'obj') { G.player.faceTowards(b.obj.x, b.obj.z); b.obj.onInteract(); }
    else {
      const n = b.node;
      G.player.faceTowards(n.x, n.z);
      G.player.rig.play('pet', 0.35, () => {
        const res = G.level.nodes.harvest(n);
        if (res.ok) G.audio?.play('pick');
      });
    }
  }

  update(dt) {
    this.cooldown -= dt;
    if (G.paused || G.player.dead) { G.ui.hidePrompt(); return; }
    this._scan -= dt;
    if (this._scan <= 0) { this._scan = 0.08; this.scanInteract(); }
    const inp = G.input;
    if (inp.hit('KeyE') || inp.mouse.rightHit || inp.touchHit('interact')) this.interact();
    if ((inp.mouse.leftHit && !G.building?.active) || inp.hit('Space') || inp.touchHit('use')) this.use();
    else if ((inp.mouse.left && !G.building?.active) || inp.down('Space') || G.input.touchButtons.has('use')) {
      // hold to keep chopping
      if (this.cooldown <= 0 && !G.player.rig.busy && G.inv.current && ITEMS[G.inv.current.id]?.cat === 'tool' && !['rod', 'net'].includes(ITEMS[G.inv.current.id].tool)) this.use();
    }
  }
}

function pickLabel(def, n) {
  const d = def.drops[0][0];
  const name = ITEMS[d]?.name ?? 'it';
  if (def.kind === 'bush') return 'Pick ' + name;
  if (n.type.startsWith('tallgrass')) return 'Pull grass';
  return 'Pick up ' + name;
}
