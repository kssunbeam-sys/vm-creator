// Tiny DOM helpers
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export const SVG = {
  heart: (fill = 1) => `<svg viewBox="0 0 24 22" class="heart-svg"><defs><clipPath id="hc${Math.round(fill * 100)}"><rect x="0" y="0" width="${24 * fill}" height="22"/></clipPath></defs>
    <path d="M12 21s-8.5-5.4-10.6-10.3C-.1 6.9 2.3 2 6.8 2c2.4 0 4 1.4 5.2 3.1C13.2 3.4 14.8 2 17.2 2c4.5 0 6.9 4.9 5.4 8.7C20.5 15.6 12 21 12 21z" fill="#6b3a35" stroke="#3f2320" stroke-width="1.6"/>
    <path clip-path="url(#hc${Math.round(fill * 100)})" d="M12 21s-8.5-5.4-10.6-10.3C-.1 6.9 2.3 2 6.8 2c2.4 0 4 1.4 5.2 3.1C13.2 3.4 14.8 2 17.2 2c4.5 0 6.9 4.9 5.4 8.7C20.5 15.6 12 21 12 21z" fill="#ff5a6e"/>
    <path d="M6 6.5c-1.3.4-2.2 1.6-2.2 3" stroke="#ffd0d6" stroke-width="1.6" fill="none" stroke-linecap="round" clip-path="url(#hc${Math.round(fill * 100)})"/></svg>`,
  coin: `<svg viewBox="0 0 24 24" class="coin-svg"><circle cx="12" cy="12" r="10" fill="#f2b33b" stroke="#a8700f" stroke-width="2"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#ffe08a" stroke-width="1.8"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" stroke="#c98a1c" stroke-width="1.4"/></svg>`,
  energy: `<svg viewBox="0 0 24 24" class="energy-svg"><circle cx="12" cy="12" r="9" fill="#7ad6ff" opacity=".35"/><circle cx="12" cy="12" r="6" fill="#7ad6ff" stroke="#2a7aa0" stroke-width="1.6"/><path d="M12.8 7l-3.3 5.4h2.6l-.9 4.6 3.4-5.6h-2.6z" fill="#fff"/></svg>`,
  sun: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#ffc83d" stroke="#c98a1c" stroke-width="1.5"/><g stroke="#ffb02a" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></g></svg>`,
  moon: `<svg viewBox="0 0 24 24"><path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15.5 3.5z" fill="#e8eeff" stroke="#8a9ad0" stroke-width="1.5"/></svg>`,
};
