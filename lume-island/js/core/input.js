// Keyboard, mouse and touch input. Systems poll this once per frame.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.hits = new Set();
    this.mouse = { x: 0, y: 0, nx: 0, ny: 0, left: false, right: false, leftHit: false, rightHit: false, wheel: 0, overCanvas: false, lastMove: 0 };
    this.touchMove = { x: 0, z: 0, active: false };
    this.touchButtons = new Set();
    this.touchHits = new Set();
    this.usingTouch = false;
    this.blocked = false; // true while typing in a text field

    window.addEventListener('keydown', (e) => {
      if (this._isTyping(e)) return;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.hits.add(e.code);
      this.keys.add(e.code);
      this.usingTouch = false;
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; });

    canvas.addEventListener('mousemove', (e) => this._pos(e));
    canvas.addEventListener('mouseenter', () => { this.mouse.overCanvas = true; });
    canvas.addEventListener('mouseleave', () => { this.mouse.overCanvas = false; });
    canvas.addEventListener('mousedown', (e) => {
      this._pos(e);
      if (e.button === 0) { this.mouse.left = true; this.mouse.leftHit = true; }
      if (e.button === 2) { this.mouse.right = true; this.mouse.rightHit = true; }
      this.usingTouch = false;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.mouse.wheel += Math.sign(e.deltaY); }, { passive: false });
    window.addEventListener('touchstart', () => { this.usingTouch = true; }, { passive: true });
  }
  _isTyping(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) && t.type !== 'range' && t.type !== 'checkbox';
  }
  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
    this.mouse.nx = (this.mouse.x / r.width) * 2 - 1;
    this.mouse.ny = -(this.mouse.y / r.height) * 2 + 1;
    this.mouse.overCanvas = true;
    this.mouse.lastMove = performance.now();
  }
  down(code) { return this.keys.has(code); }
  hit(code) { return this.hits.has(code); }
  anyHit(...codes) { return codes.some((c) => this.hits.has(c)); }
  touchHit(name) { return this.touchHits.has(name); }
  pressTouch(name) { this.touchHits.add(name); this.usingTouch = true; }
  moveVector() {
    let x = 0, z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.touchMove.active) { x += this.touchMove.x; z += this.touchMove.z; }
    const l = Math.hypot(x, z);
    if (l > 1) { x /= l; z /= l; }
    return { x, z, len: Math.min(1, l) };
  }
  endFrame() {
    this.hits.clear();
    this.touchHits.clear();
    this.mouse.leftHit = false;
    this.mouse.rightHit = false;
    this.mouse.wheel = 0;
  }
  clear() { this.keys.clear(); this.hits.clear(); this.mouse.left = this.mouse.right = false; }
}
