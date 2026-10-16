// HUD (hearts, coins, clock, hotbar, quest tracker), toasts, prompts,
// banners, fades and the modal panel stack.
import { G, clamp } from '../core/game.js';
import { h, $, clear, SVG } from './dom.js';
import { ITEMS } from '../data/items.js';
import { iconURL } from './icons.js';

export class UI {
  constructor(root) {
    this.root = root;
    this.panels = [];
    this.toasts = h('div', { class: 'toasts passive' });
    this.prompt = h('div', { class: 'prompt passive', hidden: true });
    this.fade = h('div', { class: 'fade passive' });
    this.bannerEl = h('div', { class: 'banner passive', hidden: true });
    this.dark = h('div', { class: 'darkness passive' });
    this.hurt = h('div', { class: 'hurt-flash passive' });
    this.hud = h('div', { class: 'hud' });
    this.buildHud();
    this.panelLayer = h('div', { class: 'panel-layer', hidden: true, onmousedown: (e) => { if (e.target === this.panelLayer) this.closeTop(); } });
    root.append(this.dark, this.hurt, this.hud, this.toasts, this.prompt, this.bannerEl, this.panelLayer, this.fade);
    this._lastHud = '';
    this.hotbarDirty = true;
    G.events.on('inv', () => { this.hotbarDirty = true; });
  }

  buildHud() {
    this.hearts = h('div', { class: 'hearts', 'aria-label': 'Health' });
    this.coins = h('div', { class: 'stat coins', title: 'Coins' }, h('span', { class: 'ico', html: SVG.coin }), h('b', {}, '0'));
    this.energy = h('div', { class: 'stat energy', title: 'Luma Energy' }, h('span', { class: 'ico', html: SVG.energy }), h('b', {}, '0'));
    const tl = h('div', { class: 'hud-tl panel-chip' }, this.hearts, h('div', { class: 'stats' }, this.coins, this.energy));
    this.clockIco = h('span', { class: 'clock-ico', html: SVG.sun });
    this.clock = h('div', { class: 'clock' }, this.clockIco, h('div', {}, h('b', { class: 'clock-time' }, '7:00 AM'), h('small', { class: 'clock-day' }, 'Day 1')));
    this.place = h('div', { class: 'place' }, 'Sunny Meadow');
    this.minimap = h('canvas', { class: 'minimap', width: 168, height: 168, title: 'Open the map (M)', onclick: () => G.ui.openMap?.() });
    const tr = h('div', { class: 'hud-tr' }, h('div', { class: 'panel-chip clock-chip' }, this.clock, this.place), this.minimap);
    this.tracker = h('div', { class: 'tracker panel-chip', hidden: true });
    this.hotbar = h('div', { class: 'hotbar' });
    this.hotSlots = [];
    for (let i = 0; i < 10; i++) {
      const s = h('button', { class: 'slot', 'aria-label': 'Hotbar slot ' + ((i + 1) % 10), onclick: () => { G.inv.selected = i; this.hotbarDirty = true; G.audio?.play('click'); } },
        h('img', { alt: '', draggable: 'false' }), h('span', { class: 'qty' }), h('span', { class: 'key' }, String((i + 1) % 10)));
      this.hotSlots.push(s);
      this.hotbar.append(s);
    }
    this.itemName = h('div', { class: 'item-name passive' });
    this.hud.append(tl, tr, this.tracker, this.itemName, this.hotbar);
  }

  setHearts(hp, max) {
    const hearts = Math.ceil(max / 4);
    const key = hp + '/' + max;
    if (this._hk === key) return;
    this._hk = key;
    clear(this.hearts);
    for (let i = 0; i < hearts; i++) {
      const f = clamp((hp - i * 4) / 4, 0, 1);
      this.hearts.append(h('span', { class: 'heart' + (f < 1 && f > 0 ? ' part' : ''), html: SVG.heart(f) }));
    }
  }

  refreshHotbar() {
    this.hotbarDirty = false;
    const inv = G.inv;
    for (let i = 0; i < 10; i++) {
      const el = this.hotSlots[i];
      const s = inv.slots[i];
      el.classList.toggle('sel', inv.selected === i);
      const img = el.querySelector('img');
      const q = el.querySelector('.qty');
      if (s) {
        const it = ITEMS[s.id];
        const tier = it.cat === 'tool' ? G.save?.tools?.[it.tool]?.tier ?? 0 : undefined;
        const url = iconURL(s.id, { tier });
        if (img.getAttribute('src') !== url) img.src = url;
        img.hidden = false;
        q.textContent = s.qty > 1 ? s.qty : (it.cat === 'tool' ? 'L' + (G.save?.tools?.[it.tool]?.lvl ?? 1) : '');
        q.classList.toggle('lvl', it.cat === 'tool');
        el.title = it.name;
      } else { img.hidden = true; img.removeAttribute('src'); q.textContent = ''; el.title = ''; }
    }
    const cur = inv.current;
    this.itemName.textContent = cur ? ITEMS[cur.id].name : '';
    this.itemName.classList.remove('show');
    void this.itemName.offsetWidth;
    if (cur) this.itemName.classList.add('show');
  }

  update(dt) {
    const p = G.player;
    if (!p) return;
    this.setHearts(p.hp, p.maxHp);
    const coinTxt = String(G.save.coins);
    const b = this.coins.querySelector('b');
    if (b.textContent !== coinTxt) b.textContent = coinTxt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const eb = this.energy.querySelector('b');
    const et = String(G.save.lumaEnergy ?? 0);
    if (eb.textContent !== et) eb.textContent = et;
    this.energy.hidden = !(G.save.lumasOwned > 0 || G.save.lumaEnergy > 0);
    const t = G.time.label();
    const tEl = this.clock.querySelector('.clock-time');
    if (tEl.textContent !== t) {
      tEl.textContent = t;
      this.clock.querySelector('.clock-day').textContent = 'Day ' + G.time.day;
      const night = G.time.isNight();
      if (this._night !== night) { this._night = night; this.clockIco.innerHTML = night ? SVG.moon : SVG.sun; }
    }
    if (this.hotbarDirty) this.refreshHotbar();
    this.updatePrompt();
  }

  setDarkness(k) {
    if (this._dk === k) return;
    this._dk = k;
    const r = 75 - k * 62;
    this.dark.style.background = k > 0.01 ? `radial-gradient(circle at 50% 48%, rgba(0,0,0,0) ${Math.max(6, r - 22)}%, rgba(0,0,0,${0.45 + k * 0.55}) ${r}%)` : 'none';
    this.dark.classList.toggle('warn', k > 0.6);
  }
  flashDamage() {
    this.hurt.classList.remove('on');
    void this.hurt.offsetWidth;
    this.hurt.classList.add('on');
  }
  setPlace(name) { if (this.place.textContent !== name) this.place.textContent = name; }

  // ---------- prompts ----------
  showPrompt(key, text, x, y, z) {
    this._prompt = { key, text, x, y, z };
  }
  hidePrompt() { this._prompt = null; }
  updatePrompt() {
    const pr = this._prompt;
    if (!pr || this.panels.length) { this.prompt.hidden = true; return; }
    const s = G.cam.toScreen(pr.x, pr.y, pr.z);
    if (!s.visible) { this.prompt.hidden = true; return; }
    const html = `<kbd>${G.input.usingTouch ? (pr.key === 'E' ? '✋' : '⚒') : pr.key}</kbd>${pr.text}`;
    if (this._ph !== html) { this.prompt.innerHTML = html; this._ph = html; }
    this.prompt.hidden = false;
    this.prompt.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`;
  }

  // ---------- toasts ----------
  toast(text, kind = 'info', ms = 2600) {
    const el = h('div', { class: 'toast ' + kind }, text);
    this.toasts.append(el);
    while (this.toasts.children.length > 6) this.toasts.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
  }
  toastItem(id, qty) {
    const it = ITEMS[id];
    if (!it) return;
    // merge with a recent toast of the same item
    const last = [...this.toasts.children].reverse().find((e) => e.dataset.item === id && !e.classList.contains('out'));
    if (last) {
      const n = +last.dataset.qty + qty;
      last.dataset.qty = n;
      last.querySelector('b').textContent = '+' + n;
      clearTimeout(last._t);
      last._t = setTimeout(() => { last.classList.add('out'); setTimeout(() => last.remove(), 400); }, 2200);
      return;
    }
    const el = h('div', { class: 'toast item', 'data-item': id, 'data-qty': qty }, h('img', { src: iconURL(id), alt: '' }), h('b', {}, '+' + qty), ' ' + it.name);
    this.toasts.append(el);
    while (this.toasts.children.length > 6) this.toasts.firstChild.remove();
    el._t = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2200);
  }

  banner(title, sub = '', ms = 2800) {
    this.bannerEl.innerHTML = `<h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}`;
    this.bannerEl.hidden = false;
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => { this.bannerEl.hidden = true; }, ms);
  }

  // ---------- fades ----------
  fadeTo(black, ms = 350) {
    return new Promise((res) => {
      this.fade.style.transition = `opacity ${ms}ms ease`;
      this.fade.style.opacity = black ? '1' : '0';
      setTimeout(res, ms + 20);
    });
  }

  // ---------- panels ----------
  open(panel) {
    if (this.panels.includes(panel)) return;
    this.panels.push(panel);
    this.panelLayer.append(panel.el);
    this.panelLayer.hidden = false;
    G.paused = true;
    G.input.clear();
    panel.onOpen?.();
    G.audio?.play('open');
  }
  close(panel) {
    const i = this.panels.indexOf(panel);
    if (i < 0) return;
    this.panels.splice(i, 1);
    panel.el.remove();
    panel.onClose?.();
    if (!this.panels.length) { this.panelLayer.hidden = true; G.paused = false; G.input.clear(); }
    G.audio?.play('close');
    this.hotbarDirty = true;
  }
  closeTop() { const p = this.panels[this.panels.length - 1]; if (p && !p.modalLock) this.close(p); }
  get top() { return this.panels[this.panels.length - 1]; }
  isOpen(panel) { return this.panels.includes(panel); }
}

// Build a standard panel frame
export function makePanel(title, opts = {}) {
  const body = h('div', { class: 'panel-body' });
  const close = h('button', { class: 'panel-close', 'aria-label': 'Close', onclick: () => G.ui.close(panel) }, '✕');
  const head = h('div', { class: 'panel-head' }, h('h2', {}, title), opts.noClose ? null : close);
  const el = h('div', { class: 'panel ' + (opts.cls || ''), role: 'dialog', 'aria-label': title }, head, body);
  const panel = { el, body, head, titleEl: head.querySelector('h2'), setTitle(t) { this.titleEl.textContent = t; } };
  return panel;
}
