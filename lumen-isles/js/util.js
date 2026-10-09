'use strict';
// Shared namespace + small helpers (seeded RNG, value noise, misc math).
const G = window.G = window.G || {};
G.TS = 16; // tile size in world pixels

G.U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  },
  noise(x, y, s) {
    const H = G.U.hash, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = H(xi, yi, s), b = H(xi + 1, yi, s), c = H(xi, yi + 1, s), d = H(xi + 1, yi + 1, s);
    return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
  },
  fbm(x, y, s, oct = 4) {
    let t = 0, a = 1, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { t += a * G.U.noise(x * f, y * f, s + i * 101); n += a; a *= 0.5; f *= 2; }
    return t / n;
  },
  pick: (r, arr) => arr[Math.floor(r() * arr.length) % arr.length],
  shuffle(r, arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  },
  wpick(r, list) { // list of [value, weight]
    let tot = 0; for (const e of list) tot += e[1];
    let x = r() * tot;
    for (const e of list) { x -= e[1]; if (x <= 0) return e[0]; }
    return list[list.length - 1][0];
  },
  ri: (r, a, b) => a + Math.floor(r() * (b - a + 1)),
  fmtTime(min) {
    const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
    const ap = h < 12 ? 'AM' : 'PM', hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m - (m % 10)).padStart(2, '0')} ${ap}`;
  },
  el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const k of kids) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  },
  esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
};
