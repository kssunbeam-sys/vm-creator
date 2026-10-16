// Conversations with townsfolk: typed-out text and a menu of options.
import { G } from '../core/game.js';
import { h, clear } from './dom.js';
import { SHOPS } from '../data/shops.js';

export class Dialogue {
  constructor() {
    this.nameEl = h('div', { class: 'dlg-name' });
    this.titleEl = h('span', { class: 'dlg-title' });
    this.textEl = h('p', { class: 'dlg-text' });
    this.optsEl = h('div', { class: 'dlg-opts' });
    this.el = h('div', { class: 'dialogue', role: 'dialog', onclick: (e) => { if (e.target === this.textEl || e.target === this.el) this.skip(); } },
      h('div', { class: 'dlg-head' }, this.nameEl, this.titleEl), this.textEl, this.optsEl);
    this.panel = { el: this.el, onClose: () => { if (this.npc) this.npc.talking = false; this.npc = null; clearInterval(this._iv); } };
    this.npc = null;
  }
  open(npc) {
    this.npc = npc;
    npc.talking = true;
    npc.rig.play('talk', 1.2);
    this.nameEl.textContent = npc.def.name;
    this.titleEl.textContent = npc.def.title || '';
    G.ui.open(this.panel);
    const seq = G.quests?.onTalk?.(npc.def.id) || null;
    if (seq && seq.length) this.sequence(seq, () => this.menu());
    else this.menu(this.greeting());
  }
  // plain message from a non-NPC source (signs, boards)
  openText(name, text, options = null) {
    this.npc = null;
    this.nameEl.textContent = name;
    this.titleEl.textContent = '';
    G.ui.open(this.panel);
    this.say(text, options || [{ label: 'OK', fn: () => this.close() }]);
  }
  greeting() {
    const lines = this.npc.def.lines;
    const h = G.time.hour;
    const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    return Math.random() < 0.35 ? `${hello}, ${G.save.name}!` : lines[Math.floor(Math.random() * lines.length)];
  }
  close() { G.ui.close(this.panel); }
  say(text, options) {
    clear(this.optsEl);
    this.full = text;
    this.shown = 0;
    clearInterval(this._iv);
    this.textEl.textContent = '';
    const step = () => {
      this.shown = Math.min(this.full.length, this.shown + 2);
      this.textEl.textContent = this.full.slice(0, this.shown);
      if (this.shown >= this.full.length) { clearInterval(this._iv); this.showOpts(options); }
    };
    this._pendingOpts = options;
    this._iv = setInterval(step, 16);
    G.audio?.play('blip');
  }
  skip() {
    if (this.shown < this.full.length) { clearInterval(this._iv); this.shown = this.full.length; this.textEl.textContent = this.full; this.showOpts(this._pendingOpts); }
  }
  showOpts(options) {
    clear(this.optsEl);
    options.forEach((o, i) => {
      const b = h('button', { class: 'btn ' + (o.cls || (i === 0 ? '' : 'ghost')), type: 'button', onclick: () => { G.audio?.play('click'); o.fn(); } }, o.label);
      if (o.disabled) b.disabled = true;
      this.optsEl.append(b);
    });
    this.optsEl.querySelector('button')?.focus({ preventScroll: true });
  }
  sequence(lines, done) {
    let i = 0;
    const next = () => {
      if (i >= lines.length) { done(); return; }
      const l = lines[i++];
      if (typeof l === 'function') { l(); next(); return; }
      this.say(l, [{ label: i < lines.length ? 'Next' : 'OK', fn: next }]);
    };
    next();
  }
  menu(text) {
    const npc = this.npc, def = npc.def;
    const opts = [];
    const shop = def.shop ? SHOPS[def.shop] : null;
    if (def.role === 'inn' && shop) opts.push({ label: `Rent a bed (${shop.inn} coins)`, fn: () => { this.close(); G.sleep?.atInn(npc, shop.inn); } });
    if (def.role === 'smith') opts.push({ label: 'Upgrade tools', fn: () => { this.close(); G.anvil?.open(); } });
    if (def.role === 'mentor') opts.push({ label: 'Lessons', fn: () => G.professions?.mentorTalk(npc, this) });
    if (def.role === 'guild') opts.push({ label: 'Profession permits', fn: () => { this.close(); G.guildUI?.open(); } });
    if (def.role === 'architect') opts.push({ label: 'Blueprints', fn: () => { this.close(); G.blueprints?.open(); } });
    if (def.role === 'mayor') opts.push({ label: 'Any news?', fn: () => this.say(G.quests?.hint?.(def.id) || 'All is well. Enjoy the island!', this.baseOpts()) });
    if (shop) opts.push({ label: def.role === 'morel' ? 'Trade tokens' : def.role === 'inn' ? 'Food & drink' : 'Shop', fn: () => { this.close(); G.shop?.open(def.shop, npc); } });
    if (def.role === 'shop' || def.role === 'smith' || def.role === 'inn') opts.push({ label: 'Sell items', fn: () => { this.close(); G.shop?.open(def.shop, npc, 'sell'); } });
    opts.push(...this.baseOpts().slice(0, 0));
    opts.push({ label: 'Chat', fn: () => this.say(def.lines[Math.floor(Math.random() * def.lines.length)], this.baseOpts()) });
    opts.push({ label: 'Goodbye', fn: () => this.close() });
    this._menuOpts = opts;
    this.say(text || this.greeting(), opts);
  }
  baseOpts() { return [{ label: 'Back', fn: () => this.menu('Anything else?') }, { label: 'Goodbye', fn: () => this.close() }]; }
}
