// Title screen: continue, new game (character, difficulty, peaceful mode), load.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { h, clear } from './dom.js';
import { SKIN, HAIR, CLOTH } from '../entities/character.js';
import { DEFAULT_LOOK } from '../entities/player.js';
import { listSlots, latestSlot, readSlot, deleteSlot, storageOK } from '../systems/save.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const HAIRSTYLES = [['short', 'Short'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['twin', 'Twin tails'], ['bob', 'Bob'], ['spiky', 'Spiky'], ['bald', 'None']];
const HATS = [['explorer', 'Explorer'], ['straw', 'Straw'], ['cap', 'Cap'], ['beanie', 'Beanie'], ['bandana', 'Bandana'], ['flower', 'Flower'], [null, 'None']];

export class Title {
  constructor(onStart) {
    this.onStart = onStart;
    this.el = h('div', { class: 'title-screen' });
    document.getElementById('ui').append(this.el);
    this.t = 0;
    this.mode = 'main';
    this.look = { ...DEFAULT_LOOK };
    this.opts = { name: 'Traveler', difficulty: 'adventure', peaceful: false, slot: 1 };
  }
  show() { this.el.hidden = false; this.mode = 'main'; this.render(); G.audio?.music?.('title'); }
  hide() { this.el.hidden = true; }
  render() {
    const el = clear(this.el);
    el.classList.toggle('new', this.mode === 'new');
    if (this.mode === 'new' && !G.started) {
      const c = G.overworld.cities.lumenbrook;
      if (!this._placed) { G.player.place(c.x + 1, c.z + 9.5); this._placed = true; }
    }
    const logo = h('div', { class: 'logo' }, h('h1', {}, 'Lume Island'), h('p', {}, 'A cozy island adventure'));
    if (this.mode === 'main') {
      const last = latestSlot();
      const box = h('div', { class: 'title-menu' });
      if (last) box.append(h('button', { class: 'btn big', onclick: () => this.load(last.slot) }, `Continue · ${last.name}, day ${last.day}`));
      box.append(h('button', { class: 'btn big' + (last ? ' ghost' : ''), onclick: () => { this.mode = 'new'; this.pickFreeSlot(); this.render(); } }, 'New game'));
      if (last) box.append(h('button', { class: 'btn ghost', onclick: () => { this.mode = 'load'; this.render(); } }, 'Load game'));
      box.append(h('button', { class: 'btn ghost', onclick: () => G.menu.openSettings() }, 'Settings'));
      box.append(h('button', { class: 'btn ghost', onclick: () => G.menu.openHelp() }, 'How to play'));
      if (!storageOK()) box.append(h('p', { class: 'warn-text' }, 'Saving is blocked in this browser, so progress will not be kept between visits.'));
      el.append(logo, box, h('p', { class: 'credit' }, 'A fan-made homage with original procedural art. Not affiliated with the makers of Luma Island.'));
    } else if (this.mode === 'load') {
      const box = h('div', { class: 'title-menu wide' }, h('h2', {}, 'Load game'));
      for (const s of listSlots()) {
        box.append(h('div', { class: 'slot-row' },
          h('div', { class: 'shop-name' }, h('b', {}, s.empty ? `Slot ${s.slot} · empty` : `Slot ${s.slot} · ${s.name}`), s.empty ? null : h('small', {}, `Day ${s.day} · ${s.coins.toLocaleString()} coins · ${s.difficulty}${s.peaceful ? ' · peaceful' : ''}`)),
          s.empty ? null : h('button', { class: 'btn small', onclick: () => this.load(s.slot) }, 'Load'),
          s.empty ? null : h('button', { class: 'btn small red', onclick: (e) => {
            if (e.currentTarget.dataset.confirm) { deleteSlot(s.slot); this.render(); }
            else { e.currentTarget.dataset.confirm = '1'; e.currentTarget.textContent = 'Really delete?'; }
          } }, 'Delete')));
      }
      box.append(h('button', { class: 'btn ghost', onclick: () => { this.mode = 'main'; this.render(); } }, 'Back'));
      el.append(logo, box);
    } else if (this.mode === 'new') {
      el.append(this.newGameForm());
    }
  }
  pickFreeSlot() {
    const slots = listSlots();
    const free = slots.find((s) => s.empty);
    this.opts.slot = free ? free.slot : 1;
  }
  swatches(list, key, apply) {
    const row = h('div', { class: 'swatches', role: 'radiogroup' });
    for (const c of list) {
      row.append(h('button', { class: 'swatch' + (this.look[key] === c ? ' on' : ''), style: { background: hex(c) }, 'aria-label': hex(c), onclick: () => { this.look[key] = c; if (apply) apply(c); this.refreshLook(); this.render(); } }));
    }
    return row;
  }
  choice(list, key, target) {
    const row = h('div', { class: 'choices' });
    for (const [v, label] of list) row.append(h('button', { class: 'tab' + (target[key] === v ? ' on' : ''), onclick: () => { target[key] = v; this.refreshLook(); this.render(); } }, label));
    return row;
  }
  refreshLook() { G.player.setLook(this.look); }
  newGameForm() {
    const o = this.opts;
    const name = h('input', { id: 'player-name', type: 'text', maxlength: '16', value: o.name, 'aria-label': 'Your name', oninput: (e) => { o.name = e.target.value; } });
    const diffs = [['cozy', 'Cozy', 'Monsters only fight back if you attack first. Prices are 20% lower, drops are richer and traps are never deadly.'], ['adventure', 'Adventure', 'The intended balance of danger and comfort.'], ['hero', 'Hero', 'Monsters hit twice as hard. Fainting costs more coins.']];
    const slots = listSlots();
    const form = h('div', { class: 'newgame' },
      h('h2', {}, 'New game'),
      h('label', { class: 'field' }, h('span', {}, 'Name'), name),
      h('div', { class: 'field' }, h('span', {}, 'Skin'), this.swatches(SKIN, 'skin')),
      h('div', { class: 'field' }, h('span', {}, 'Hair'), this.choice(HAIRSTYLES, 'hairStyle', this.look)),
      h('div', { class: 'field' }, h('span', {}, 'Hair colour'), this.swatches(HAIR, 'hair')),
      h('div', { class: 'field' }, h('span', {}, 'Outfit'), this.swatches(CLOTH, 'shirt', (c) => { this.look.sleeve = c; })),
      h('div', { class: 'field' }, h('span', {}, 'Hat'), this.choice(HATS, 'hat', this.look)),
      h('div', { class: 'field' }, h('span', {}, 'Difficulty'), h('div', { class: 'diff-cards' }, ...diffs.map(([id, label, txt]) => h('button', { class: 'diff-card' + (o.difficulty === id ? ' on' : ''), onclick: () => { o.difficulty = id; this.render(); } }, h('b', {}, label), h('small', {}, txt))))),
      h('label', { class: 'toggle-row' }, h('input', { id: 'peaceful-toggle', type: 'checkbox', checked: o.peaceful || undefined, onchange: (e) => { o.peaceful = e.target.checked; } }),
        h('span', {}, h('b', {}, 'Peaceful mode'), h('small', {}, 'No monsters anywhere on the island, in caves or in temples. Traps only push you back. You can change this later in Settings.'))),
      h('div', { class: 'field' }, h('span', {}, 'Save slot'), h('div', { class: 'choices' }, ...slots.map((s) => h('button', { class: 'tab' + (o.slot === s.slot ? ' on' : ''), onclick: () => { o.slot = s.slot; this.render(); } }, s.empty ? `Slot ${s.slot}` : `Slot ${s.slot} (overwrite ${s.name})`)))),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { this.mode = 'main'; this.render(); } }, 'Back'), h('div', { class: 'spacer' }), h('button', { class: 'btn big teal', onclick: () => this.startNew() }, 'Start adventure')));
    return h('div', { class: 'newgame-wrap' }, form);
  }
  startNew() {
    const name = (this.opts.name || '').trim() || 'Traveler';
    this.onStart({ fresh: true, slot: this.opts.slot, name, look: { ...this.look }, difficulty: this.opts.difficulty, peaceful: this.opts.peaceful });
  }
  load(slot) {
    const d = readSlot(slot);
    if (!d) { G.ui.toast('That save could not be read.', 'warn'); return; }
    this.onStart({ fresh: false, slot, data: d });
  }
  // slow orbit over Lumenbrook while the title is up
  updateCamera(dt) {
    this.t += dt * 0.05;
    const cam = G.camera;
    if (this.mode === 'new') {
      const p = G.player.pos;
      const a = 0.35 + Math.sin(this.t * 3) * 0.3;
      const wide = window.innerWidth > 700;
      cam.position.set(p.x + Math.sin(a) * 6, p.y + 2.6, p.z + Math.cos(a) * 6);
      G.player.rotY = G.player.object.rotation.y = a;
      cam.lookAt(p.x + (wide ? Math.cos(a) * 1.6 : 0), p.y + (wide ? 1.0 : 0.2), p.z - (wide ? Math.sin(a) * 1.6 : 0));
      return;
    }
    const c = G.overworld.cities.lumenbrook;
    cam.position.set(c.x + Math.sin(this.t) * 70, 48, c.z + Math.cos(this.t) * 70);
    cam.lookAt(c.x, 4, c.z);
  }
}
