// Inventory: hotbar (first 10 slots) + backpack. Slots hold {id, qty}.
import { G } from '../core/game.js';
import { ITEMS } from '../data/items.js';

export class Inventory {
  constructor(size = 30) {
    this.slots = new Array(size).fill(null);
    this.selected = 0;
  }
  get size() { return this.slots.length; }
  resize(n) { while (this.slots.length < n) this.slots.push(null); }
  stackOf(id) { return ITEMS[id]?.stack ?? 99; }
  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.qty; return n; }
  has(id, q = 1) { return this.count(id) >= q; }
  // how many of id would fit
  room(id) {
    const st = this.stackOf(id);
    let r = 0;
    for (const s of this.slots) { if (!s) r += st; else if (s.id === id) r += st - s.qty; }
    return r;
  }
  add(id, qty = 1, silent = false) {
    if (!ITEMS[id]) { console.warn('unknown item', id); return qty; }
    const st = this.stackOf(id);
    let left = qty;
    for (const s of this.slots) { if (left <= 0) break; if (s && s.id === id && s.qty < st) { const a = Math.min(st - s.qty, left); s.qty += a; left -= a; } }
    // prefer the backpack for new stacks of non-tools, hotbar for tools/placeables
    const order = [];
    const preferHot = ITEMS[id].cat === 'tool' || ITEMS[id].food || ITEMS[id].place;
    for (let i = 0; i < this.slots.length; i++) order.push(i);
    if (!preferHot) order.sort((a, b) => (a < 10 ? 1 : 0) - (b < 10 ? 1 : 0));
    for (const i of order) { if (left <= 0) break; if (!this.slots[i]) { const a = Math.min(st, left); this.slots[i] = { id, qty: a }; left -= a; } }
    const added = qty - left;
    if (added > 0) {
      G.events.emit('inv', id, added);
      if (!silent) G.ui?.toastItem(id, added);
    }
    if (left > 0 && !silent) G.ui?.toast('Your bag is full!', 'warn');
    return left;
  }
  remove(id, qty = 1) {
    let left = qty;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) { const a = Math.min(s.qty, left); s.qty -= a; left -= a; if (s.qty <= 0) this.slots[i] = null; }
    }
    if (left < qty) G.events.emit('inv', id, -(qty - left));
    return qty - left;
  }
  removeAt(i, qty = 1) {
    const s = this.slots[i];
    if (!s) return 0;
    const a = Math.min(qty, s.qty);
    s.qty -= a;
    if (s.qty <= 0) this.slots[i] = null;
    G.events.emit('inv', s.id, -a);
    return a;
  }
  get current() { return this.slots[this.selected]; }
  swap(a, b) { const t = this.slots[a]; this.slots[a] = this.slots[b]; this.slots[b] = t; G.events.emit('inv'); }
  serialize() { return { slots: this.slots.map((s) => (s ? [s.id, s.qty] : 0)), selected: this.selected }; }
  deserialize(d) {
    if (!d) return;
    this.slots = d.slots.map((s) => (s && ITEMS[s[0]] ? { id: s[0], qty: s[1] } : null));
    this.selected = d.selected || 0;
  }
}

// A container that is not the player's bag (storage chests, station output)
export class Container {
  constructor(size = 24) { this.slots = new Array(size).fill(null); }
  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.qty; return n; }
  add(id, qty) {
    const st = ITEMS[id]?.stack ?? 99;
    let left = qty;
    for (const s of this.slots) { if (left <= 0) break; if (s && s.id === id && s.qty < st) { const a = Math.min(st - s.qty, left); s.qty += a; left -= a; } }
    for (let i = 0; i < this.slots.length && left > 0; i++) if (!this.slots[i]) { const a = Math.min(st, left); this.slots[i] = { id, qty: a }; left -= a; }
    return left;
  }
  remove(id, qty) {
    let left = qty;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) { const a = Math.min(s.qty, left); s.qty -= a; left -= a; if (s.qty <= 0) this.slots[i] = null; }
    }
    return qty - left;
  }
  isEmpty() { return this.slots.every((s) => !s); }
  serialize() { return this.slots.map((s) => (s ? [s.id, s.qty] : 0)); }
  deserialize(d) { if (d) this.slots = d.map((s) => (s && ITEMS[s[0]] ? { id: s[0], qty: s[1] } : null)); }
}
