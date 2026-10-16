// Build menu: craft placeables by hand. Blueprints come from Bram, profession
// stations from your permits.
import { G } from '../core/game.js';
import { h, clear } from './dom.js';
import { makePanel } from './ui.js';
import { ITEMS } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { icon, hideTip, coinTag } from './widgets.js';
import { recipeUnlocked, lockReason, nearbySources, countIng, ingName, ingIcon, maxCraftable, consume } from '../systems/crafting.js';

const GROUPS = [
  ['Essentials', ['b_workbench', 'b_chest', 'b_kiln', 'b_smelter', 'b_incubator', 'b_luma_nest', 'b_luma_altar', 'b_lamp_post', 'b_campfire']],
  ['Professions', ['b_stove', 'b_cask_meadow', 'b_cask_forest', 'b_cask_mountain', 'b_cask_jungle', 'b_fish_table', 'b_forge', 'b_gem_cutter', 'b_jeweler_bench', 'b_treasure_sink', 'b_treasure_bench', 'b_rubble_refiner', 'b_restoration_table']],
  ['Decor', ['b_fence', 'b_signpost', 'b_hay', 'b_bench', 'b_table', 'b_rug', 'b_flower_pot', 'b_planter', 'b_banner', 'b_scarecrow', 'b_luma_statue', 'b_fountain']],
];

export class BuildUI {
  constructor() {
    this.panel = makePanel('Build', { cls: 'wide build' });
    this.panel.onClose = () => hideTip();
    this.group = 0;
  }
  toggle() { if (G.ui.isOpen(this.panel)) G.ui.close(this.panel); else if (!G.ui.panels.length) this.open(); }
  open() { this.render(); G.ui.open(this.panel); }
  render() {
    const b = clear(this.panel.body);
    b.append(h('div', { class: 'tabs' }, ...GROUPS.map(([name], i) => h('button', { class: 'tab' + (i === this.group ? ' on' : ''), onclick: () => { this.group = i; this.render(); } }, name))));
    const src = nearbySources(G.player.pos.x, G.player.pos.z);
    const grid = h('div', { class: 'build-grid' });
    for (const id of GROUPS[this.group][1]) {
      const rc = RECIPES.find((r) => r.id === id);
      if (!rc) continue;
      const ok = recipeUnlocked(rc);
      const max = ok ? maxCraftable(rc, src) : 0;
      const it = ITEMS[rc.out[0]];
      const costs = h('div', { class: 'costs' }, ...rc.ins.map(([ing, q]) => {
        const have = countIng(src, ing);
        return h('span', { class: 'cost' + (have >= q ? '' : ' short'), title: ingName(ing) }, icon(ingIcon(ing), 'mini'), h('b', {}, `${Math.min(have, 999)}/${q}`));
      }));
      grid.append(h('div', { class: 'build-card' + (ok ? '' : ' locked') },
        icon(rc.out[0], 'big'),
        h('div', { class: 'shop-name' }, h('b', {}, it.name + (rc.out[1] > 1 ? ` ×${rc.out[1]}` : '')), h('small', {}, ok ? (it.desc || '') : '🔒 ' + lockReason(rc))),
        costs,
        h('button', { class: 'btn small', disabled: !ok || max < 1, onclick: () => this.craft(rc) }, 'Craft')));
    }
    b.append(grid);
    b.append(h('p', { class: 'muted small' }, 'Crafted items go to your bag. Select one in your hotbar to place it, press R to rotate.'));
  }
  craft(rc) {
    const src = nearbySources(G.player.pos.x, G.player.pos.z);
    if (maxCraftable(rc, src) < 1) return;
    if (G.inv.room(rc.out[0]) < rc.out[1]) { G.ui.toast('Your bag is full!', 'warn'); return; }
    consume(rc, src, 1);
    G.inv.add(rc.out[0], rc.out[1]);
    G.audio?.play('craft');
    G.events.emit('crafted', rc.out[0], rc.out[1], rc);
    this.render();
  }
}

export class BlueprintUI {
  constructor() { this.panel = makePanel("Bram's Blueprints", { cls: 'wide' }); this.panel.onClose = () => hideTip(); }
  open() { this.render(); G.ui.open(this.panel); }
  render() {
    const b = clear(this.panel.body);
    b.append(h('p', { class: 'note' }, 'A blueprint teaches you how to build something forever. Build it from the Build menu (B).'));
    const list = h('div', { class: 'shop-list' });
    const cozy = G.save.difficulty === 'cozy';
    for (const rc of RECIPES.filter((r) => r.unlock === 'bp')) {
      const owned = G.save.recipes.includes(rc.id);
      const price = Math.round(rc.bp * (cozy ? 0.8 : 1));
      const it = ITEMS[rc.out[0]];
      list.append(h('div', { class: 'shop-row' + (owned ? ' owned' : '') }, icon(rc.out[0]),
        h('div', { class: 'shop-name' }, h('b', {}, it.name), h('small', {}, it.desc || '')),
        owned ? h('span', { class: 'muted' }, 'Learned') : coinTag(price),
        owned ? null : h('button', { class: 'btn small', disabled: G.save.coins < price, onclick: () => {
          if (G.save.coins < price) return;
          G.player.addCoins(-price);
          G.save.recipes.push(rc.id);
          G.audio?.play('buy');
          G.ui.toast(`Learned the ${it.name} blueprint!`, 'good');
          G.events.emit('blueprint', rc.id);
          this.render();
        } }, 'Buy')));
    }
    b.append(list);
  }
}
