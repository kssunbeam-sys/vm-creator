// Backpack panel and storage chest panel.
import { G } from '../core/game.js';
import { h, clear } from './dom.js';
import { makePanel } from './ui.js';
import { ITEMS } from '../data/items.js';
import { icon, slotEl, coinTag, hideTip } from './widgets.js';
import { TIERS } from './anvil.js';

const ORDER = ['tool', 'placeable', 'food', 'drink', 'fish', 'farm', 'forage', 'bug', 'resource', 'material', 'ore', 'bar', 'gem', 'smithing', 'jewelry', 'relic', 'treasure', 'spirit', 'luma', 'special', 'junk'];

export class InventoryUI {
  constructor() {
    this.panel = makePanel('Backpack', { cls: 'inv' });
    this.panel.onClose = () => { hideTip(); this.sel = -1; };
    this.sel = -1;
    this.tab = 'bag';
  }
  toggle() { if (G.ui.isOpen(this.panel)) G.ui.close(this.panel); else this.open(); }
  open() { this.sel = -1; this.render(); G.ui.open(this.panel); }
  render() {
    const b = clear(this.panel.body);
    b.append(h('div', { class: 'tabs' },
      h('button', { class: 'tab' + (this.tab === 'bag' ? ' on' : ''), onclick: () => { this.tab = 'bag'; this.render(); } }, 'Bag'),
      h('button', { class: 'tab' + (this.tab === 'tools' ? ' on' : ''), onclick: () => { this.tab = 'tools'; this.render(); } }, 'Tools'),
      h('div', { class: 'spacer' }), coinTag(G.save.coins.toLocaleString(), 'big')));
    if (this.tab === 'tools') return this.renderTools(b);
    const grid = h('div', { class: 'grid-slots' });
    G.inv.slots.forEach((s, i) => {
      grid.append(slotEl(s, { hot: i < 10, cls: i === this.sel ? 'picked' : '', onClick: () => this.click(i) }));
      if (i === 9) grid.append(h('div', { class: 'grid-break' }));
    });
    b.append(grid);
    const s = G.inv.slots[this.sel];
    const bar = h('div', { class: 'sell-bar' });
    if (s) {
      const it = ITEMS[s.id];
      const btns = h('div', { class: 'shop-btns' });
      if (it.food && it.cat !== 'tool') btns.append(h('button', { class: 'btn small', onclick: () => { G.inv.selected = this.sel < 10 ? this.sel : G.inv.selected; this.eat(); } }, 'Eat'));
      if (it.use) btns.append(h('button', { class: 'btn small', onclick: () => { G.items?.useSpecial(it, this.sel); this.render(); } }, 'Use'));
      if (it.place || it.cat === 'tool' || it.food) btns.append(h('button', { class: 'btn small ghost', onclick: () => this.toHotbar() }, this.sel < 10 ? 'Select' : 'To hotbar'));
      if (it.cat !== 'tool' && !it.noSell) btns.append(h('button', { class: 'btn small red', onclick: () => this.drop() }, 'Drop'));
      bar.append(icon(s.id), h('div', { class: 'shop-name' }, h('b', {}, it.name + (s.qty > 1 ? ` ×${s.qty}` : '')), h('small', {}, it.desc || '')), btns);
    } else bar.append(h('p', { class: 'muted' }, 'Tap an item to see it. Tap another slot to move or swap. The top row is your hotbar.'));
    b.append(bar);
    b.append(h('div', { class: 'row' }, h('button', { class: 'btn small ghost', onclick: () => this.sort() }, 'Sort bag'), h('span', { class: 'muted small' }, `${G.inv.slots.filter(Boolean).length}/${G.inv.size} slots used`)));
  }
  renderTools(b) {
    for (const type of ['axe', 'pickaxe', 'shovel', 'whip', 'rod', 'net']) {
      const t = G.save.tools[type];
      const power = t.tier * 5 + t.lvl;
      b.append(h('div', { class: 'anvil-row' }, icon(type), h('div', { class: 'shop-name' }, h('b', {}, ITEMS[type].name), h('small', {}, `${TIERS[t.tier]} · Level ${t.lvl} · Power ${power}`)), h('div', { class: 'meter' }, h('span', { style: { width: (power / 20 * 100) + '%' } }))));
    }
    b.append(h('p', { class: 'muted small' }, 'Upgrade tools with any town smith. Iron ore needs Power 4, moonstone 8, volcanic 12.'));
  }
  click(i) {
    if (this.sel < 0) { if (G.inv.slots[i]) this.sel = i; this.render(); return; }
    if (this.sel === i) { this.sel = -1; this.render(); return; }
    const a = G.inv.slots[this.sel], bb = G.inv.slots[i];
    if (a && bb && a.id === bb.id && bb.qty < (ITEMS[a.id].stack || 99)) {
      const m = Math.min(a.qty, (ITEMS[a.id].stack || 99) - bb.qty);
      bb.qty += m; a.qty -= m;
      if (a.qty <= 0) G.inv.slots[this.sel] = null;
    } else G.inv.swap(this.sel, i);
    this.sel = -1;
    G.ui.hotbarDirty = true;
    G.audio?.play('click');
    this.render();
  }
  toHotbar() {
    if (this.sel < 10) { G.inv.selected = this.sel; G.ui.hotbarDirty = true; G.ui.close(this.panel); return; }
    let t = G.inv.slots.findIndex((s, k) => k < 10 && !s);
    if (t < 0) t = G.inv.selected;
    G.inv.swap(this.sel, t);
    G.inv.selected = t;
    this.sel = t;
    G.ui.hotbarDirty = true;
    this.render();
  }
  eat() {
    const s = G.inv.slots[this.sel];
    if (!s) return;
    const it = ITEMS[s.id];
    if (G.player.hp >= G.player.maxHp) { G.ui.toast("You're not hungry right now."); return; }
    G.inv.removeAt(this.sel, 1);
    G.player.heal(Math.round(it.food * (it.cat === 'food' ? 2 : 1.5)));
    G.audio?.play('eat');
    if (!G.inv.slots[this.sel]) this.sel = -1;
    this.render();
  }
  drop() {
    const s = G.inv.slots[this.sel];
    if (!s) return;
    const p = G.player.pos;
    G.pickups.spawn(s.id, s.qty, p.x + Math.sin(G.player.rotY) * 1.2, p.y + 0.5, p.z + Math.cos(G.player.rotY) * 1.2, { delay: 8 });
    G.inv.slots[this.sel] = null;
    G.events.emit('inv');
    this.sel = -1;
    this.render();
  }
  sort() {
    const rest = G.inv.slots.slice(10).filter(Boolean);
    const merged = [];
    for (const s of rest) {
      const m = merged.find((x) => x.id === s.id && x.qty < (ITEMS[s.id].stack || 99));
      if (m) { const k = Math.min(s.qty, (ITEMS[s.id].stack || 99) - m.qty); m.qty += k; s.qty -= k; if (s.qty > 0) merged.push(s); }
      else merged.push(s);
    }
    merged.sort((a, b) => (ORDER.indexOf(ITEMS[a.id].cat) - ORDER.indexOf(ITEMS[b.id].cat)) || ITEMS[a.id].name.localeCompare(ITEMS[b.id].name));
    for (let i = 10; i < G.inv.size; i++) G.inv.slots[i] = merged[i - 10] || null;
    this.sel = -1;
    this.render();
  }
}

export class ChestUI {
  constructor() {
    this.panel = makePanel('Storage Chest', { cls: 'wide chest' });
    this.panel.onClose = () => hideTip();
  }
  open(container, title = 'Storage Chest') {
    this.c = container;
    this.panel.setTitle(title);
    this.render();
    G.ui.open(this.panel);
  }
  render() {
    const b = clear(this.panel.body);
    const cg = h('div', { class: 'grid-slots' });
    this.c.slots.forEach((s, i) => cg.append(slotEl(s, { onClick: () => this.take(i) })));
    const bg = h('div', { class: 'grid-slots' });
    G.inv.slots.forEach((s, i) => bg.append(slotEl(s, { hot: i < 10, onClick: () => this.store(i) })));
    b.append(
      h('div', { class: 'row' }, h('h3', { class: 'section-title' }, 'Chest'), h('div', { class: 'spacer' }), h('button', { class: 'btn small ghost', onclick: () => { this.c.slots.forEach((_, i) => this.take(i, true)); this.render(); } }, 'Take all')),
      cg,
      h('div', { class: 'row' }, h('h3', { class: 'section-title' }, 'Your bag'), h('div', { class: 'spacer' }), h('button', { class: 'btn small ghost', onclick: () => { for (let i = 10; i < G.inv.size; i++) this.store(i, true); this.render(); } }, 'Store bag (not hotbar)')),
      bg,
      h('p', { class: 'muted small' }, 'Tap a stack to move it. Stations near a chest can craft with what is inside.'));
  }
  take(i, quiet) {
    const s = this.c.slots[i];
    if (!s) return;
    const left = G.inv.add(s.id, s.qty, true);
    if (left === s.qty) { if (!quiet) G.ui.toast('Your bag is full!', 'warn'); return; }
    if (left > 0) s.qty = left; else this.c.slots[i] = null;
    if (!quiet) { G.audio?.play('click'); this.render(); }
  }
  store(i, quiet) {
    const s = G.inv.slots[i];
    if (!s || ITEMS[s.id].cat === 'tool') return;
    const left = this.c.add(s.id, s.qty);
    if (left === s.qty) { if (!quiet) G.ui.toast('The chest is full.', 'warn'); return; }
    if (left > 0) s.qty = left; else G.inv.slots[i] = null;
    G.events.emit('inv');
    if (!quiet) { G.audio?.play('click'); this.render(); }
  }
}
