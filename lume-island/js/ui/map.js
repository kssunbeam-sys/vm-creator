// World map (M) and the round HUD minimap, both drawn from the terrain
// colours, with fog of war that clears as you explore.
import { G, clamp } from '../core/game.js';
import { h, clear } from './dom.js';
import { makePanel } from './ui.js';
import { HALF, N, VN, CELL } from '../world/terrain.js';
import { CITIES, SITES, BIOMES } from '../data/layout.js';
import { T as TILE } from '../world/tilelevel.js';

const FOG = 96;                       // fog grid cells across the island
const FOG_CELL = (HALF * 2) / FOG;    // world units per fog cell
const REVEAL = 42;                    // reveal radius around the player
const SITE_COL = { temple: '#e8902a', cave: '#6a6a72', ruin: '#3fc8d8', shrine: '#5fd06a' };

export class MapUI {
  constructor() {
    this.panel = makePanel('Map of Lume Island', { cls: 'wide map-panel' });
    this.canvas = h('canvas', { class: 'map-canvas', width: 900, height: 900 });
    this.legend = h('div', { class: 'map-legend' });
    this.panel.body.append(h('div', { class: 'map-wrap' }, this.canvas), this.legend);
    this.fog = new Uint8Array(FOG * FOG);
    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = this.fogCanvas.height = FOG;
    this.fogDirty = true;
    this.base = null;
    this._t = 0;
    this._mt = 0;
    this.mini = G.ui.minimap;
    G.ui.openMap = () => this.toggle();
    G.events.on('gameStart', () => this.loadFog());
    G.events.on('beforeSave', (s) => { s.fog = this.packFog(); });
  }

  // ---------- base image ----------
  buildBase() {
    const Tr = G.overworld.terrain;
    const c = document.createElement('canvas');
    c.width = c.height = VN;
    const x = c.getContext('2d');
    const img = x.createImageData(VN, VN);
    const H = Tr.H, VC = Tr.VC;
    for (let j = 0; j < VN; j++) for (let i = 0; i < VN; i++) {
      const k = j * VN + i, o = k * 4;
      const wx = -HALF + i * CELL, wz = -HALF + j * CELL;
      const wl = Tr.waterLevelAt(wx, wz);
      const hgt = H[k];
      let r, g, b;
      if (hgt < wl) {
        const d = clamp((wl - hgt) / 6, 0, 1);
        r = 0.36 * (1 - d) + 0.13 * d; g = 0.82 * (1 - d) + 0.42 * d; b = 0.86 * (1 - d) + 0.72 * d;
        if (wl - hgt < 0.5) { r = g = b = 0.95; }
      } else {
        r = Math.pow(VC[k * 3], 1 / 2.2); g = Math.pow(VC[k * 3 + 1], 1 / 2.2); b = Math.pow(VC[k * 3 + 2], 1 / 2.2);
        // hill shading from the north-west
        const hn = H[Math.max(0, j - 1) * VN + Math.max(0, i - 1)];
        const sh = clamp(1 + (hgt - hn) * 0.18, 0.72, 1.18);
        r *= sh; g *= sh; b *= sh;
      }
      img.data[o] = clamp(r, 0, 1) * 255; img.data[o + 1] = clamp(g, 0, 1) * 255; img.data[o + 2] = clamp(b, 0, 1) * 255; img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    this.base = c;
  }

  // ---------- fog ----------
  loadFog() {
    this.fog.fill(0);
    const s = G.save.fog;
    if (typeof s === 'string') {
      try {
        const bin = atob(s);
        for (let i = 0; i < this.fog.length; i++) this.fog[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
      } catch { /* corrupt: start fresh */ }
    }
    this.fogDirty = true;
    this.reveal(true);
  }
  packFog() {
    const bytes = new Uint8Array(Math.ceil(this.fog.length / 8));
    for (let i = 0; i < this.fog.length; i++) if (this.fog[i]) bytes[i >> 3] |= 1 << (i & 7);
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }
  revealAt(x, z, r) {
    const ci = (x + HALF) / FOG_CELL, cj = (z + HALF) / FOG_CELL, rc = r / FOG_CELL;
    for (let j = Math.floor(cj - rc); j <= Math.ceil(cj + rc); j++) for (let i = Math.floor(ci - rc); i <= Math.ceil(ci + rc); i++) {
      if (i < 0 || j < 0 || i >= FOG || j >= FOG) continue;
      if ((i + 0.5 - ci) ** 2 + (j + 0.5 - cj) ** 2 > rc * rc) continue;
      if (!this.fog[j * FOG + i]) { this.fog[j * FOG + i] = 1; this.fogDirty = true; }
    }
  }
  reveal(force = false) {
    if (G.level !== G.overworld && !force) return;
    if (G.level === G.overworld) this.revealAt(G.player.pos.x, G.player.pos.z, REVEAL);
    // towns you have heard of are always on the map
    for (const c of Object.values(CITIES)) if (G.save.discovered?.[c.id]) this.revealAt(c.x, c.z, c.r + 8);
  }
  seen(x, z) {
    const i = Math.floor((x + HALF) / FOG_CELL), j = Math.floor((z + HALF) / FOG_CELL);
    return i >= 0 && j >= 0 && i < FOG && j < FOG && this.fog[j * FOG + i] === 1;
  }
  fogImage() {
    if (!this.fogDirty) return this.fogCanvas;
    this.fogDirty = false;
    const x = this.fogCanvas.getContext('2d');
    const img = x.createImageData(FOG, FOG);
    for (let i = 0; i < this.fog.length; i++) {
      const o = i * 4;
      img.data[o] = 236; img.data[o + 1] = 222; img.data[o + 2] = 190; img.data[o + 3] = this.fog[i] ? 0 : 255;
    }
    x.putImageData(img, 0, 0);
    return this.fogCanvas;
  }

  // ---------- markers ----------
  markers() {
    const out = [];
    for (const c of Object.values(CITIES)) if (this.seen(c.x, c.z)) out.push({ kind: 'city', x: c.x, z: c.z, label: c.name });
    for (const s of SITES) if (this.seen(s.x, s.z)) out.push({ kind: s.kind, x: s.x, z: s.z, label: s.name, done: !!G.save.temples?.[s.id]?.done });
    const gl = G.gates;
    if (gl) {
      if (this.seen(gl.bridgeInfo.rx, gl.bridgeInfo.z)) out.push({ kind: 'gate', x: gl.bridgeInfo.rx, z: gl.bridgeInfo.z, label: G.save.gates.bridge ? 'Bridge' : 'Broken bridge', ok: G.save.gates.bridge });
      if (this.seen(gl.lift.x, gl.lift.zc)) out.push({ kind: 'gate', x: gl.lift.x, z: gl.lift.zc, label: G.save.gates.lift ? 'Lift' : 'Broken lift', ok: G.save.gates.lift });
      if (this.seen(56, 216)) out.push({ kind: 'gate', x: 56, z: 218, label: G.save.gates.boat ? 'Boat to Tikora' : 'Broken boat', ok: G.save.gates.boat });
    }
    for (const c of Object.values(G.overworld.cities)) if (c.waystone && G.save.discovered?.[c.id]) out.push({ kind: 'waystone', x: c.waystone.x, z: c.waystone.z });
    const m = G.towns?.npc;
    if (m && this.seen(m.x, m.z)) out.push({ kind: 'morel', x: m.x, z: m.z, label: 'Morel' });
    for (const t of G.save.treasureMaps || []) out.push({ kind: 'x', x: t.x, z: t.z });
    for (const s of G.treasure?.spots || []) if (s.revealed && !s.dug && !s.map) out.push({ kind: 'x', x: s.x, z: s.z });
    for (const o of G.placed?.objs || []) if (o.level === 'overworld' && o.type === 'workbench') { out.push({ kind: 'home', x: o.x, z: o.z }); break; }
    const tg = G.quests?.target();
    if (tg) out.push({ kind: 'quest', x: tg.x, z: tg.z });
    return out;
  }
  drawMarker(x, m, px, py, s, labels) {
    x.save();
    x.translate(px, py);
    x.lineWidth = 2 * s; x.strokeStyle = '#4a3324';
    switch (m.kind) {
      case 'city':
        x.fillStyle = '#fff6e0'; x.beginPath(); x.arc(0, 0, 9 * s, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillStyle = '#d9603c'; x.beginPath(); x.moveTo(-5 * s, 0); x.lineTo(0, -5 * s); x.lineTo(5 * s, 0); x.closePath(); x.fill();
        x.fillStyle = '#8a5a36'; x.fillRect(-3.5 * s, 0, 7 * s, 4.5 * s);
        break;
      case 'temple':
        x.fillStyle = m.done ? '#9ad06a' : SITE_COL.temple; x.beginPath(); x.moveTo(0, -8 * s); x.lineTo(8 * s, 6 * s); x.lineTo(-8 * s, 6 * s); x.closePath(); x.fill(); x.stroke();
        break;
      case 'cave':
        x.fillStyle = '#4a4440'; x.beginPath(); x.arc(0, 3 * s, 7 * s, Math.PI, 0); x.closePath(); x.fill(); x.stroke();
        break;
      case 'ruin':
        x.fillStyle = SITE_COL.ruin; x.beginPath(); x.moveTo(0, -8 * s); x.lineTo(6 * s, 0); x.lineTo(0, 8 * s); x.lineTo(-6 * s, 0); x.closePath(); x.fill(); x.stroke();
        break;
      case 'shrine': {
        x.fillStyle = SITE_COL.shrine; x.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 3.5 : 8) * s; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        x.closePath(); x.fill(); x.stroke();
        break;
      }
      case 'waystone':
        x.fillStyle = '#7ae6ff'; x.beginPath(); x.moveTo(0, -7 * s); x.lineTo(4 * s, 0); x.lineTo(0, 7 * s); x.lineTo(-4 * s, 0); x.closePath(); x.fill(); x.stroke();
        break;
      case 'gate':
        x.fillStyle = m.ok ? '#c8925a' : '#9a8a7a'; x.fillRect(-6 * s, -4 * s, 12 * s, 8 * s); x.strokeRect(-6 * s, -4 * s, 12 * s, 8 * s);
        if (!m.ok) { x.strokeStyle = '#d9302e'; x.beginPath(); x.moveTo(-4 * s, -3 * s); x.lineTo(4 * s, 3 * s); x.stroke(); }
        break;
      case 'morel':
        x.fillStyle = '#d9443a'; x.beginPath(); x.arc(0, 0, 7 * s, Math.PI, 0); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = '#f2e6cf'; x.fillRect(-2 * s, 0, 4 * s, 5 * s);
        break;
      case 'home':
        x.fillStyle = '#f2b03b'; x.beginPath(); x.arc(0, 0, 6 * s, 0, Math.PI * 2); x.fill(); x.stroke();
        break;
      case 'x':
        x.strokeStyle = '#d9302e'; x.lineWidth = 3.5 * s; x.beginPath(); x.moveTo(-6 * s, -6 * s); x.lineTo(6 * s, 6 * s); x.moveTo(6 * s, -6 * s); x.lineTo(-6 * s, 6 * s); x.stroke();
        break;
      case 'quest': {
        const p = 1 + Math.sin(performance.now() / 250) * 0.15;
        x.strokeStyle = '#ffd23a'; x.lineWidth = 3 * s; x.beginPath(); x.arc(0, 0, 13 * s * p, 0, Math.PI * 2); x.stroke();
        x.fillStyle = '#ffd23a'; x.strokeStyle = '#5e3a20'; x.lineWidth = 2 * s; x.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 3.5 : 8) * s; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        x.closePath(); x.fill(); x.stroke();
        break;
      }
    }
    x.restore();
    if (labels && m.label) {
      x.font = `800 ${Math.round(12 * s)}px Nunito, sans-serif`;
      x.textAlign = 'center';
      x.lineWidth = 3.5; x.strokeStyle = 'rgba(255,248,232,.95)'; x.fillStyle = '#4a3324';
      const ly = py + (m.kind === 'city' ? 22 : 18) * s;
      x.strokeText(m.label, px, ly); x.fillText(m.label, px, ly);
    }
  }
  drawPlayer(x, px, py, s) {
    const pl = G.player;
    const fx = Math.sin(pl.rotY), fy = Math.cos(pl.rotY);
    x.save();
    x.translate(px, py);
    x.rotate(Math.atan2(fx, -fy));
    x.fillStyle = '#ffffff'; x.strokeStyle = '#d9302e'; x.lineWidth = 2.5 * s;
    x.beginPath(); x.moveTo(0, -9 * s); x.lineTo(7 * s, 7 * s); x.lineTo(0, 3 * s); x.lineTo(-7 * s, 7 * s); x.closePath(); x.fill(); x.stroke();
    x.restore();
  }

  // ---------- full map ----------
  toggle() { if (G.ui.isOpen(this.panel)) G.ui.close(this.panel); else this.open(); }
  open() {
    if (!this.base) this.buildBase();
    this.reveal(true);
    this.renderFull();
    this.renderLegend();
    G.ui.open(this.panel);
    clearInterval(this._iv);
    this._iv = setInterval(() => { if (!G.ui.isOpen(this.panel)) { clearInterval(this._iv); return; } this.renderFull(); }, 120);
  }
  renderFull() {
    const c = this.canvas, x = c.getContext('2d');
    const S = c.width;
    x.fillStyle = '#ecdebe'; x.fillRect(0, 0, S, S);
    x.imageSmoothingEnabled = true;
    x.drawImage(this.base, 0, 0, S, S);
    x.drawImage(this.fogImage(), 0, 0, S, S);
    const toPx = (wx, wz) => [(wx + HALF) / (HALF * 2) * S, (wz + HALF) / (HALF * 2) * S];
    const s = S / 900 * 1.25;
    for (const m of this.markers()) { const [px, py] = toPx(m.x, m.z); this.drawMarker(x, m, px, py, s, true); }
    let pp;
    if (G.level === G.overworld) pp = toPx(G.player.pos.x, G.player.pos.z);
    else if (G.level.exitTo) pp = toPx(G.level.exitTo.x, G.level.exitTo.z);
    if (pp) this.drawPlayer(x, pp[0], pp[1], s * 1.2);
    // compass
    x.save(); x.translate(S - 46, 46);
    x.fillStyle = 'rgba(255,248,232,.9)'; x.strokeStyle = '#4a3324'; x.lineWidth = 2;
    x.beginPath(); x.arc(0, 0, 26, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#d9302e'; x.beginPath(); x.moveTo(0, -20); x.lineTo(6, 0); x.lineTo(-6, 0); x.closePath(); x.fill();
    x.fillStyle = '#4a3324'; x.beginPath(); x.moveTo(0, 20); x.lineTo(6, 0); x.lineTo(-6, 0); x.closePath(); x.fill();
    x.font = '900 13px Nunito, sans-serif'; x.textAlign = 'center'; x.fillText('N', 0, -30 + 1);
    x.restore();
  }
  renderLegend() {
    const L = clear(this.legend);
    const total = this.fog.reduce((a, b) => a + b, 0);
    const pct = Math.round(total / (FOG * FOG * 0.42) * 100);
    const where = G.level === G.overworld ? (G.ui.place?.textContent || '') : `Inside: ${G.level.title || G.level.id}`;
    L.append(h('span', { class: 'pill' }, where), h('span', { class: 'pill dim' }, `${Math.min(100, pct)}% explored`),
      ...[['city', 'Town'], ['temple', 'Temple'], ['cave', 'Cave'], ['ruin', 'Crystal ruin'], ['shrine', 'Shrine'], ['waystone', 'Waystone'], ['quest', 'Current goal']].map(([k, t]) => h('span', { class: 'legend-item' }, h('i', { class: 'lg lg-' + k }), t)));
  }

  // ---------- minimap ----------
  drawMini() {
    const c = this.mini;
    if (!c || c.offsetParent === null) return;
    const x = c.getContext('2d');
    const S = c.width;
    x.save();
    x.clearRect(0, 0, S, S);
    x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.clip();
    if (G.level === G.overworld) {
      if (!this.base) this.buildBase();
      const R = 52;   // world units from the centre to the edge
      const p = G.player.pos;
      const k = VN / (HALF * 2);
      const sx = (p.x - R + HALF) * k, sy = (p.z - R + HALF) * k, sw = R * 2 * k;
      x.fillStyle = '#2a6fa8'; x.fillRect(0, 0, S, S);
      x.imageSmoothingEnabled = true;
      x.drawImage(this.base, sx, sy, sw, sw, 0, 0, S, S);
      const fk = FOG / (HALF * 2);
      x.drawImage(this.fogImage(), (p.x - R + HALF) * fk, (p.z - R + HALF) * fk, R * 2 * fk, R * 2 * fk, 0, 0, S, S);
      const toPx = (wx, wz) => [(wx - p.x + R) / (R * 2) * S, (wz - p.z + R) / (R * 2) * S];
      for (const m of this.markers()) {
        const [px, py] = toPx(m.x, m.z);
        if (m.kind === 'quest') {
          const dx = px - S / 2, dy = py - S / 2, d = Math.hypot(dx, dy), lim = S / 2 - 12;
          const q = d > lim ? [S / 2 + dx / d * lim, S / 2 + dy / d * lim] : [px, py];
          this.drawMarker(x, m, q[0], q[1], 0.75, false);
          continue;
        }
        if (px < -10 || py < -10 || px > S + 10 || py > S + 10) continue;
        this.drawMarker(x, m, px, py, 0.7, false);
      }
      this.drawPlayer(x, S / 2, S / 2, 0.85);
    } else this.drawInteriorMini(x, S);
    x.restore();
  }
  drawInteriorMini(x, S) {
    const L = G.level;
    x.fillStyle = '#14100c'; x.fillRect(0, 0, S, S);
    if (!L.tiles) return;
    const [pgx, pgy] = L.toTile(G.player.pos.x, G.player.pos.z);
    const R = 11, cs = S / (R * 2 + 1);
    const col = { [TILE.FLOOR]: '#cdb894', [TILE.ENTRY]: '#e8d6a8', [TILE.PLATE]: '#d8c070', [TILE.WATER]: '#3fa8c8', [TILE.LAVA]: '#ff6a2a', [TILE.ICE]: '#bfe8ff', [TILE.SPIKES]: '#a08a7a', [TILE.DOOR]: '#8a5a36', [TILE.WALL]: '#4a3e34', [TILE.MEM]: '#c0a8e8', [TILE.PIT]: '#0a0806' };
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const t = L.get(pgx + i, pgy - j);   // tile rows grow northwards
      if (!t) continue;
      x.fillStyle = col[t] || '#cdb894';
      x.fillRect((i + R) * cs, (j + R) * cs, cs + 0.5, cs + 0.5);
    }
    this.drawPlayer(x, S / 2 + cs / 2, S / 2 + cs / 2, 0.75);
  }

  update(dt) {
    this._t -= dt;
    if (this._t <= 0) { this._t = 0.5; this.reveal(); }
    this._mt -= dt;
    if (this._mt <= 0) { this._mt = 0.1; this.drawMini(); }
  }
}
