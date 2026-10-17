// On-screen controls for phones and tablets: a thumb stick on the left and
// action buttons on the right. They appear as soon as the screen is touched.
import { G } from '../core/game.js';
import { h } from './dom.js';

export class TouchControls {
  constructor(root) {
    this.knob = h('div', { class: 'stick-knob' });
    this.base = h('div', { class: 'stick-base' }, this.knob);
    this.stickZone = h('div', { class: 'stick-zone' }, this.base);
    const btn = (cls, label, title, down, up) => {
      const b = h('button', { class: 'tbtn ' + cls, 'aria-label': title, title }, label);
      b.addEventListener('touchstart', (e) => { e.preventDefault(); b.classList.add('down'); down(); }, { passive: false });
      b.addEventListener('touchend', (e) => { e.preventDefault(); b.classList.remove('down'); up?.(); }, { passive: false });
      b.addEventListener('touchcancel', () => { b.classList.remove('down'); up?.(); });
      b.addEventListener('click', (e) => { if (!G.input.usingTouch) down(); e.preventDefault(); });
      return b;
    };
    const inp = () => G.input;
    this.useBtn = btn('use', '⚒', 'Use tool', () => { inp().pressTouch('use'); inp().touchButtons.add('use'); }, () => inp().touchButtons.delete('use'));
    this.talkBtn = btn('talk', '✋', 'Interact', () => inp().pressTouch('interact'));
    this.rotBtn = btn('small rot', '↻', 'Rotate', () => inp().pressTouch('rotate'));
    const side = h('div', { class: 'tbtn-col' },
      btn('small', '🎒', 'Backpack', () => { if (!G.paused || G.ui.isOpen(G.invUI.panel)) G.invUI.toggle(); }),
      btn('small', '🗺️', 'Map', () => G.mapUI?.toggle()),
      btn('small', '🔨', 'Build', () => { if (!G.paused || G.ui.isOpen(G.build.panel)) G.build.toggle(); }),
      btn('small', '📖', 'Journal', () => G.journal?.toggle()));
    this.menuBtn = btn('menu', '☰', 'Menu', () => { if (G.ui.panels.length) G.ui.closeTop(); else G.menu.openPause(); });
    this.el = h('div', { class: 'touch-ui' }, this.stickZone, h('div', { class: 'tbtn-area' }, side, this.rotBtn, this.talkBtn, this.useBtn), this.menuBtn);
    root.append(this.el);
    this.touchId = null;
    this.center = { x: 0, y: 0 };
    this.R = 52;
    const z = this.stickZone;
    z.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.touchId = t.identifier;
      const r = z.getBoundingClientRect();
      // the stick recentres under the thumb, inside the zone
      this.center.x = Math.min(Math.max(t.clientX, r.left + this.R + 10), r.right - this.R - 10);
      this.center.y = Math.min(Math.max(t.clientY, r.top + this.R + 10), r.bottom - this.R - 10);
      this.base.style.left = (this.center.x - r.left) + 'px';
      this.base.style.top = (this.center.y - r.top) + 'px';
      this.base.classList.add('on');
      this.move(t);
    }, { passive: false });
    z.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === this.touchId) this.move(t);
    }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) if (t.identifier === this.touchId) this.release(); };
    z.addEventListener('touchend', end);
    z.addEventListener('touchcancel', end);
    window.addEventListener('touchstart', () => this.show(), { passive: true });
    if (window.matchMedia?.('(pointer: coarse)').matches) this.show();
  }
  show() { if (!this.shown) { this.shown = true; document.body.classList.add('touch'); } }
  move(t) {
    let dx = t.clientX - this.center.x, dy = t.clientY - this.center.y;
    const d = Math.hypot(dx, dy);
    if (d > this.R) { dx *= this.R / d; dy *= this.R / d; }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const k = Math.min(1, d / this.R);
    const tm = G.input.touchMove;
    tm.active = k > 0.12;
    tm.x = (dx / this.R) * (k > 0.12 ? 1 : 0);
    tm.z = (dy / this.R) * (k > 0.12 ? 1 : 0);
    G.input.usingTouch = true;
  }
  release() {
    this.touchId = null;
    this.knob.style.transform = '';
    this.base.classList.remove('on');
    const tm = G.input.touchMove;
    tm.active = false; tm.x = 0; tm.z = 0;
  }
  update() {
    if (!this.shown) return;
    const hidden = !G.started || (G.ui.panels.length > 0 && !G.ui.isOpen(G.build.panel));
    this.el.classList.toggle('away', hidden);
    if (hidden && this.touchId !== null) this.release();
    this.rotBtn.hidden = !G.building?.active;
  }
}
