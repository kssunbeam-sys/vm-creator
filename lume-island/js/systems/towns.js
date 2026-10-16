// Town services: waystone fast travel, the daily request boards and Morel's
// travelling mushroom cart.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { h, clear } from '../ui/dom.js';
import { makePanel } from '../ui/ui.js';
import { icon, coinTag } from '../ui/widgets.js';
import { RNG } from '../core/rng.js';
import { ITEMS } from '../data/items.js';
import { CITIES, BIOMES } from '../data/layout.js';
import { NPCS } from '../data/npcs.js';
import { NPC } from '../entities/npc.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from '../world/materials.js';
import { dirName } from './treasure.js';

const REQUESTS = {
  meadow: [['red_berry', 5], ['daisy', 4], ['poppy', 3], ['sunny_sardine', 2], ['copper_ore', 6], ['wood', 20], ['stone', 20], ['meadow_mushroom', 4], ['caterpillar', 3], ['copper_bar', 2], ['plank', 5], ['rope', 4], ['seashell', 4], ['brook_perch', 1]],
  forest: [['blueberry', 5], ['bluebell', 3], ['porcini', 3], ['hardwood', 10], ['iron_ore', 5], ['fern_trout', 2], ['grasshopper', 3], ['glowcap', 2], ['iron_bar', 2], ['sap', 4], ['leather', 2]],
  mountain: [['frostberry', 4], ['edelweiss', 2], ['snowcap', 3], ['pinewood', 8], ['moonstone_ore', 4], ['frost_char', 1], ['frost_beetle', 2], ['ice_crystal', 2], ['moonstone_bar', 1], ['rough_sapphire', 1]],
  jungle: [['sunberry', 4], ['orchid', 2], ['ember_shroom', 2], ['ironwood', 6], ['volcanic_ore', 3], ['parrotfish', 1], ['firefly', 3], ['coral', 2], ['bamboo', 8], ['piranha', 1]],
};
const MOREL_SPOTS = { meadow: [47, 34], forest: [-160, 24], mountain: [-36, -170], jungle: [218, -22] };

export class Towns {
  constructor(world) {
    this.world = world;
    this.wayPanel = makePanel('Waystone', { cls: 'narrow' });
    this.boardPanel = makePanel('Request Board', { cls: '' });
    for (const c of Object.values(world.cities)) {
      if (c.waystone) {
        const w = c.waystone;
        world.addInteractable({ x: w.x, z: w.z, r: 1.0, h: 4.6, priority: 0.3, label: 'Use the waystone', onInteract: () => this.openWaystone(c) });
        world.lightSources.push({ x: w.x, y: w.y + 3.8, z: w.z, color: 0x7ae6ff, intensity: 2, distance: 10 });
      }
      if (c.board) {
        const b = c.board;
        world.addInteractable({ x: b.x + Math.sin(-b.rot) * 0.6, z: b.z + Math.cos(-b.rot) * 0.6, r: 1.1, h: 2.6, priority: 0.3, label: 'Read the request board', onInteract: () => this.openBoard(c) });
      }
    }
    // Morel and his cart
    this.morelDef = NPCS.find((n) => n.id === 'morel');
    this.npc = null;
    this.cart = this.makeCart();
    this.biome = 'meadow';
    G.events.on('gameStart', () => this.placeMorel());
    G.events.on('newDay', () => this.placeMorel());
  }

  // ---------- waystones ----------
  attuned(id) { return !!G.save.discovered?.[id]; }
  openWaystone(city) {
    G.save.discovered[city.id] = true;
    const b = clear(this.wayPanel.body);
    b.append(h('p', { class: 'note' }, 'Touch the waystone of every town you visit. Then you can travel between them in a blink.'));
    const list = h('div', { class: 'menu-col' });
    for (const c of Object.values(this.world.cities)) {
      const here = c.id === city.id, ok = this.attuned(c.id);
      list.append(h('button', { class: 'btn ' + (here ? 'ghost' : 'teal'), disabled: here || !ok, onclick: () => this.travel(c) },
        `${ok ? c.name : '???'}${here ? ' (you are here)' : ''} · ${BIOMES[c.biome].short}`));
    }
    b.append(list);
    G.audio?.play('magic');
    G.ui.open(this.wayPanel);
  }
  async travel(c) {
    G.ui.close(this.wayPanel);
    const w = c.waystone;
    let x = w.x, z = w.z + 2.4;
    if (!this.world.walkable(x, z)) [x, z] = this.world.terrain.findWalkable(x, z, 6);
    G.audio?.play('teleport');
    await G.travel.hop(x, z, c.name, BIOMES[c.biome].name);
    G.player.rotY = Math.PI;
    G.events.emit('waystone', c.id);
  }

  // ---------- request boards ----------
  board() {
    const day = G.time.day;
    const st = (G.save.boards ||= { day: 0, done: {} });
    if (st.day !== day) { st.day = day; st.done = {}; }
    return st;
  }
  requests(city) {
    const rng = new RNG(G.time.day * 131 + city.x * 7 + city.z * 3);
    const pool = REQUESTS[city.biome];
    const out = [];
    const used = new Set();
    while (out.length < 3) {
      const i = Math.floor(rng.next() * pool.length);
      if (used.has(i)) continue;
      used.add(i);
      const [id, q] = pool[i];
      const it = ITEMS[id];
      const coins = Math.round((q * (it.price || 5) * 1.7 + 15) / 5) * 5;
      out.push({ id, q, coins, tokens: 1 + Math.floor(rng.next() * 2) + (BIOMES[city.biome].tier > 1 ? 1 : 0) });
    }
    return out;
  }
  openBoard(city) {
    this.boardCity = city;
    this.renderBoard();
    if (!G.ui.isOpen(this.boardPanel)) G.ui.open(this.boardPanel);
  }
  renderBoard() {
    const city = this.boardCity;
    this.boardPanel.setTitle(`${city.name} Request Board`);
    const st = this.board();
    const done = (st.done[city.id] ||= []);
    const b = clear(this.boardPanel.body);
    b.append(h('p', { class: 'note' }, 'Townsfolk pin up new requests every morning. Deliver the goods for coins and town tokens.'));
    const list = h('div', { class: 'shop-list' });
    this.requests(city).forEach((r, i) => {
      const it = ITEMS[r.id];
      const isDone = done.includes(i);
      const have = G.inv.count(r.id);
      list.append(h('div', { class: 'shop-row' + (isDone ? ' done' : '') },
        icon(r.id),
        h('div', { class: 'shop-name' }, h('b', {}, `${r.q} × ${it.name}`), h('small', {}, isDone ? 'Delivered. Thank you!' : `You have ${have}`)),
        h('span', { class: 'price' }, coinTag(r.coins), ' + ', icon(BIOMES[city.biome].token, 'mini'), `×${r.tokens}`),
        h('div', { class: 'shop-btns' }, h('button', { class: 'btn small', disabled: isDone || have < r.q, onclick: () => {
          G.inv.remove(r.id, r.q);
          G.player.addCoins(r.coins);
          G.inv.add(BIOMES[city.biome].token, r.tokens);
          done.push(i);
          G.audio?.play('coin');
          G.events.emit('requestDone', city.id, r.id);
          this.renderBoard();
        } }, isDone ? 'Done' : 'Deliver'))));
    });
    b.append(list);
  }

  // ---------- Morel ----------
  makeCart() {
    const parts = [
      part(P.box(1.6, 0.7, 1.0), 0x9a6a3c, { y: 0.75, jitter: 0.03 }),
      part(P.cyl(0.35, 0.35, 0.12, 10), 0x5a3a24, { x: 0.82, y: 0.35, rz: Math.PI / 2 }),
      part(P.cyl(0.35, 0.35, 0.12, 10), 0x5a3a24, { x: -0.82, y: 0.35, rz: Math.PI / 2 }),
      part(P.cyl(0.05, 0.05, 1.3, 5), 0x5a3a24, { y: 1.75 }),
      part(P.sphere(1.1, 14, 8), 0xd9443a, { y: 2.3, sy: 0.45, flat: false, jitter: 0 }),
      part(P.cyl(0.45, 0.6, 0.5, 10), 0xf2e6cf, { y: 1.35 }),
    ];
    for (let i = 0; i < 6; i++) { const a = i * 1.05; parts.push(part(P.sphere(0.14, 6, 5), 0xffffff, { x: Math.cos(a) * 0.7, y: 2.62, z: Math.sin(a) * 0.7, sy: 0.4, flat: false, jitter: 0 })); }
    for (let i = 0; i < 4; i++) parts.push(part(P.sphere(0.13, 6, 5), [0xffd27a, 0x56d6c8, 0xff6a2a, 0xf3e3c8][i], { x: -0.5 + i * 0.33, y: 1.17, z: 0.2, sy: 0.6, flat: false, jitter: 0 }));
    const m = new THREE.Mesh(merge(parts), MAT.world);
    m.castShadow = true;
    return m;
  }
  morelBiomes() {
    const out = ['meadow'];
    for (const c of Object.values(CITIES)) if (G.save.discovered?.[c.id] && !out.includes(c.biome)) out.push(c.biome);
    return out;
  }
  placeMorel() {
    const W = this.world;
    const list = this.morelBiomes();
    this.biome = list[(G.time.day * 7 + 3) % list.length];
    let [x, z] = MOREL_SPOTS[this.biome];
    if (!W.walkable(x, z)) [x, z] = W.terrain.findWalkable(x, z, 10);
    if (this.npc) { W.removeEntity(this.npc); W.removeInteractable(this.npc.inter); W.colliders.remove(this.npc.col); }
    this.npc = new NPC(this.morelDef, W, x, z, 0.4);
    W.addEntity(this.npc);
    this.cart.position.set(x + 1.6, W.heightAt(x + 1.6, z - 0.6), z - 0.6);
    this.cart.rotation.y = 0.4;
    if (!this.cart.parent) W.scene.add(this.cart);
    if (this.cartCol) W.colliders.remove(this.cartCol);
    this.cartCol = W.colliders.addCircle(x + 1.6, z - 0.6, 1.0);
  }
  morelWhere() {
    const n = this.npc;
    if (!n) return '';
    const near = Object.values(CITIES).reduce((a, c) => (Math.hypot(c.x - n.x, c.z - n.z) < Math.hypot(a.x - n.x, a.z - n.z) ? c : a));
    return `in the ${BIOMES[this.biome].name}, ${dirName(n.x - near.x, n.z - near.z)} of ${near.name}`;
  }
}
