// Shared game state. Systems register themselves here at boot so modules can
// reach each other at runtime without import cycles.

class EventBus {
  constructor() { this.map = new Map(); }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name).add(fn);
    return () => this.off(name, fn);
  }
  off(name, fn) { this.map.get(name)?.delete(fn); }
  emit(name, ...args) {
    const set = this.map.get(name);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(...args); } catch (e) { console.error('event handler failed', name, e); }
    }
  }
}

export const G = {
  events: new EventBus(),
  renderer: null,
  camera: null,
  level: null,        // active Level (overworld or an interior)
  overworld: null,
  player: null,
  inv: null,
  time: null,
  audio: null,
  ui: null,
  input: null,
  save: null,         // live save-state object (serialised by systems/save.js)
  settings: null,
  paused: false,      // true while a modal panel is open
  started: false,
  elapsed: 0,
  dt: 0,
  frame: 0,
};

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const angleLerp = (a, b, t) => {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
};
export const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
