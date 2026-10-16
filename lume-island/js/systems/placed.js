// Player-placed stations, chests, lights and decorations.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { ITEMS } from '../data/items.js';
import { Container } from './inventory.js';
import { stationModel } from '../world/stationModels.js';
import { processStation, isWorking, jobProgress } from './crafting.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { iconURL } from '../ui/icons.js';

export const PROCESSING = new Set(['workbench', 'kiln', 'smelter', 'stove', 'cask_meadow', 'cask_forest', 'cask_mountain', 'cask_jungle', 'fish_table', 'forge', 'gem_cutter', 'jeweler_bench', 'treasure_sink', 'treasure_bench', 'rubble_refiner', 'restoration_table', 'luma_altar']);
const texCache = new Map();
function itemTexture(id) {
  if (!texCache.has(id)) {
    const t = new THREE.TextureLoader().load(iconURL(id));
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(id, t);
  }
  return texCache.get(id);
}

export class Placed {
  constructor() {
    this.objs = [];
    this.uid = 1;
    this._t = 0;
  }
  inLevel(id) { return this.objs.filter((o) => o.level === id); }
  spawn(type, levelId, x, z, rot = 0, data = null, out = null, chest = null) {
    const o = { uid: this.uid++, type, level: levelId, x, z, rot, data: data || { queue: [] }, out: new Container(8), chest: null };
    if (out) o.out.deserialize(out);
    if (type === 'chest') { o.chest = new Container(24); if (chest) o.chest.deserialize(chest); }
    if (type === 'incubator' && !o.data.egg) o.data.egg = null;
    this.objs.push(o);
    const level = G.levels?.get(levelId);
    if (level) this.attach(o, level);
    return o;
  }
  attach(o, level) {
    if (o.mesh) return;
    const m = stationModel(o.type);
    const g = new THREE.Group();
    for (const { geo, mat } of m.meshes) { const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = !m.flat; mesh.receiveShadow = true; g.add(mesh); }
    g.position.set(o.x, level.heightAt(o.x, o.z), o.z);
    g.rotation.y = o.rot;
    level.scene.add(g);
    o.mesh = g;
    o.levelRef = level;
    if (!m.flat && (m.hw > 0.05)) o.col = level.colliders.addBox(o.x, o.z, m.hw, m.hd, o.rot, { placed: o });
    if (m.light) { o.light = { x: o.x, y: g.position.y + m.light.y, z: o.z, color: m.light.color, intensity: 3.5, distance: 13, lightRadius: o.type === 'torch' ? 9 : 11 }; level.lightSources.push(o.light); }
    const it = ITEMS[o.type];
    o.inter = {
      x: o.x, z: o.z, r: Math.max(m.hw, m.hd) * 0.8, h: 2.0, priority: 0.2,
      label: () => this.label(o),
      onInteract: () => this.interact(o),
    };
    level.addInteractable(o.inter);
    if (PROCESSING.has(o.type)) {
      const sm = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
      const sp = new THREE.Sprite(sm);
      sp.scale.setScalar(0.95);
      sp.position.set(0, 2.4, 0);
      sp.visible = false;
      g.add(sp);
      o.sprite = sp;
    }
  }
  detach(o) {
    const level = o.levelRef;
    if (!level) return;
    level.scene.remove(o.mesh);
    if (o.col) level.colliders.remove(o.col);
    level.removeInteractable(o.inter);
    if (o.light) { const i = level.lightSources.indexOf(o.light); if (i >= 0) level.lightSources.splice(i, 1); }
    o.mesh = null; o.col = null; o.levelRef = null;
  }
  attachLevel(level) { for (const o of this.objs) if (o.level === level.id) this.attach(o, level); }
  label(o) {
    const name = ITEMS[o.type]?.name ?? o.type;
    if (PROCESSING.has(o.type)) {
      if (!o.out.isEmpty()) return 'Collect from ' + name;
      return 'Use ' + name;
    }
    if (o.type === 'chest') return 'Open chest';
    if (o.type === 'incubator') return o.data.egg ? 'Check Incubator' : 'Use Incubator';
    if (o.type === 'luma_nest') return 'Visit your Lumas';
    return 'Pick up ' + name;
  }
  interact(o) {
    processStation(o);
    if (PROCESSING.has(o.type)) {
      if (!o.out.isEmpty() && !G.input.down('ShiftLeft')) { this.collect(o); return; }
      G.stationUI.open(o);
    } else if (o.type === 'chest') G.chestUI.open(o.chest);
    else if (o.type === 'incubator') G.lumas?.openIncubator(o);
    else if (o.type === 'luma_nest') G.lumas?.openNest(o);
    else this.pickUp(o);
  }
  collect(o) {
    let any = false;
    for (let i = 0; i < o.out.slots.length; i++) {
      const s = o.out.slots[i];
      if (!s) continue;
      const left = G.inv.add(s.id, s.qty);
      if (left < s.qty) any = true;
      if (left > 0) s.qty = left; else o.out.slots[i] = null;
    }
    if (any) { G.audio?.play('pickup'); G.particles?.burst('sparkle', o.x, o.mesh.position.y + 1.5, o.z); }
    this.refreshSprite(o);
  }
  pickUp(o) {
    if (o.chest && !o.chest.isEmpty()) { G.ui.toast('Empty the chest before picking it up.', 'warn'); return false; }
    if (PROCESSING.has(o.type) && (o.data.queue.length || !o.out.isEmpty())) { G.ui.toast('Wait until it has finished and collect the items first.', 'warn'); return false; }
    if (o.type === 'incubator' && o.data.egg) { G.ui.toast('There is an egg inside!', 'warn'); return false; }
    if (G.inv.room(o.type) < 1) { G.ui.toast('Your bag is full!', 'warn'); return false; }
    this.detach(o);
    this.objs.splice(this.objs.indexOf(o), 1);
    G.inv.add(o.type, 1);
    G.audio?.play('pickup');
    return true;
  }
  refreshSprite(o) {
    if (!o.sprite) return;
    let id = null, ready = false;
    const outSlot = o.out.slots.find(Boolean);
    if (outSlot) { id = outSlot.id; ready = true; }
    else if (o.data.queue.length) id = RECIPE_BY_ID[o.data.queue[0].r]?.out[0];
    if (!id) { o.sprite.visible = false; return; }
    o.sprite.visible = true;
    if (o.sprite.userData.id !== id) { o.sprite.material.map = itemTexture(id); o.sprite.material.needsUpdate = true; o.sprite.userData.id = id; }
    o.sprite.material.opacity = ready ? 1 : 0.5;
    o.sprite.userData.ready = ready;
  }
  update(dt) {
    this._t -= dt;
    if (this._t <= 0) {
      this._t = 0.5;
      for (const o of this.objs) if (PROCESSING.has(o.type)) { processStation(o); this.refreshSprite(o); }
    }
    const t = G.elapsed;
    for (const o of this.objs) {
      if (o.sprite && o.sprite.visible && o.levelRef === G.level) {
        o.sprite.position.y = 2.4 + (o.sprite.userData.ready ? Math.abs(Math.sin(t * 4)) * 0.3 : Math.sin(t * 2) * 0.05);
      }
    }
  }
  serialize() { return this.objs.map((o) => ({ t: o.type, l: o.level, x: +o.x.toFixed(2), z: +o.z.toFixed(2), r: +o.rot.toFixed(3), d: o.data, o: o.out.serialize(), c: o.chest ? o.chest.serialize() : null })); }
  load(arr) {
    for (const o of [...this.objs]) this.detach(o);
    this.objs = [];
    for (const s of arr || []) if (ITEMS[s.t]) this.spawn(s.t, s.l, s.x, s.z, s.r, s.d, s.o, s.c);
  }
}
