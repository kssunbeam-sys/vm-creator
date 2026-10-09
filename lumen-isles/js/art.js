'use strict';
// Procedural pixel art: tiles, chunks, sprites, characters, pets, glimmers, enemies, emoji cache.
G.Art = (() => {
  const U = G.U, TS = G.TS;
  const T = {
    DEEP: 0, WATER: 1, SAND: 2, GRASS: 3, JGRASS: 4, DSAND: 5, SNOW: 6, ICE: 7, MOSS: 8, ASH: 9, LAVA: 10,
    PATH: 11, COBBLE: 12, FLOOR: 13, WALL: 14, BRIDGE: 15, TFLOOR: 16, TWALL: 17, CFLOOR: 18, CWALL: 19, VOID: 20, HOT: 21,
  };
  const SOLID = new Uint8Array(32);
  [T.DEEP, T.WATER, T.LAVA, T.WALL, T.TWALL, T.CWALL, T.VOID, T.HOT].forEach((t) => (SOLID[t] = 1));
  const isWater = (t) => t === T.DEEP || t === T.WATER || t === T.HOT;
  const isWall = (t) => t === T.WALL || t === T.TWALL || t === T.CWALL || t === T.VOID;
  const GROUND = new Uint8Array(32);
  [T.SAND, T.GRASS, T.JGRASS, T.DSAND, T.SNOW, T.ICE, T.MOSS, T.ASH, T.PATH].forEach((t) => (GROUND[t] = 1));

  const TCOL = {
    0: ['#2d6aa3', '#265d91', '#3a7cb8'], 1: ['#4aa3d8', '#3f95c9', '#7cc8ee'], 2: ['#f0dca6', '#e3cb90', '#fbeac0'],
    3: ['#86cf5a', '#74bd4a', '#9ade6e'], 4: ['#3fa060', '#348a52', '#55b874'], 5: ['#e8bf74', '#d9a95c', '#f4d390'],
    6: ['#eef5fb', '#d6e4f0', '#ffffff'], 7: ['#b8e2f4', '#9fd2ea', '#e2f6ff'], 8: ['#7476b4', '#6668a6', '#8789c6'],
    9: ['#5e5052', '#4f4345', '#706264'], 10: ['#ff6a2a', '#e8501a', '#ffc04a'], 11: ['#d4ad74', '#c49a60', '#e2c08a'],
    12: ['#d6cbb8', '#b4a892', '#ebe3d4'], 13: ['#c48a56', '#a8723f', '#d89e68'], 14: ['#8a6448', '#6e4c34', '#a07a5a'],
    15: ['#b07a44', '#8e5f32', '#c9925a'], 16: ['#a89c88', '#958a76', '#bbb09c'], 17: ['#5c544c', '#48413a', '#746c64'],
    18: ['#7a6a5c', '#6a5a4e', '#8a7a6c'], 19: ['#3e3430', '#2e2622', '#4e4440'], 20: ['#0e0c14', '#0e0c14', '#0e0c14'],
    21: ['#5fd0c8', '#4abab2', '#9aeee6'],
  };
  // temple palettes by biome: [floor, wall]
  const TEMPLE_PAL = {
    meadow: [['#9aa888', '#8a9878', '#aebc9c'], ['#4e5a46', '#3e4a38', '#64705a']],
    coast: [['#9cc0bc', '#8aaeaa', '#b4d6d2'], ['#3e5e66', '#304c54', '#56767e']],
    snow: [['#b4cce0', '#a0bad0', '#cfe2f2'], ['#4a6078', '#3a4e64', '#647a92']],
    mushroom: [['#8c80b0', '#7a6ea0', '#a498c8'], ['#3e3460', '#30284c', '#564a7a']],
    jungle: [['#8aa078', '#78906a', '#a0b88e'], ['#3a5a3a', '#2c4a2e', '#507252']],
    desert: [['#d8b880', '#c8a46c', '#e8cc98'], ['#8a6a44', '#765a38', '#a08058']],
    volcano: [['#8a6a64', '#7a5a54', '#a07e78'], ['#3e2a2a', '#2e1e1e', '#563a38']],
  };

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rect(x, c, px, py, w, h) { x.fillStyle = c; x.fillRect(px, py, w, h); }
  function ell(x, cx, cy, rx, ry, c) {
    if (c) x.fillStyle = c;
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
      if (hw > 0) x.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2, 1);
    }
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = U.clamp((n >> 16) + amt, 0, 255), g = U.clamp(((n >> 8) & 255) + amt, 0, 255), b = U.clamp((n & 255) + amt, 0, 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // ---------- tiles ----------
  const tileCache = new Map();
  function tileCanvas(type, v, pal) {
    const col = (pal && pal[type]) || TCOL[type] || TCOL[20];
    const key = type + ':' + v + ':' + col[0];
    let c = tileCache.get(key);
    if (c) return c;
    c = mk(TS, TS);
    const x = c.getContext('2d');
    const r = U.rng(type * 977 + v * 131 + 7);
    rect(x, col[0], 0, 0, TS, TS);
    const speck = (n, cc) => { for (let i = 0; i < n; i++) rect(x, cc, (r() * 16) | 0, (r() * 16) | 0, 1, 1); };
    switch (type) {
      case T.GRASS: case T.JGRASS: case T.MOSS:
        speck(8, col[1]); speck(5, col[2]);
        for (let i = 0; i < 3; i++) { const px = (r() * 14) | 0, py = 2 + ((r() * 13) | 0); rect(x, col[2], px, py - 1, 1, 2); rect(x, col[1], px + 1, py, 1, 1); }
        if (type === T.MOSS && r() < 0.15) rect(x, '#a8f0ff', (r() * 15) | 0, (r() * 15) | 0, 1, 1);
        break;
      case T.SAND: case T.DSAND:
        speck(10, col[1]); speck(6, col[2]);
        if (type === T.DSAND) for (let i = 0; i < 2; i++) { const py = 3 + ((r() * 11) | 0), px = (r() * 9) | 0; rect(x, col[1], px, py, 5, 1); rect(x, col[2], px + 1, py - 1, 3, 1); }
        break;
      case T.SNOW: speck(6, col[1]); speck(4, '#dce9f6'); break;
      case T.ICE:
        speck(4, col[2]);
        for (let i = 0; i < 2; i++) { const px = (r() * 12) | 0, py = (r() * 12) | 0; for (let k = 0; k < 4; k++) rect(x, col[2], px + k, py + 3 - k, 1, 1); }
        break;
      case T.ASH: speck(10, col[1]); speck(5, col[2]); if (r() < 0.4) { const px = (r() * 12) | 0, py = (r() * 12) | 0; rect(x, '#3a2e30', px, py, 3, 1); rect(x, '#3a2e30', px + 2, py + 1, 2, 1); } break;
      case T.LAVA:
        speck(14, col[1]);
        for (let i = 0; i < 3; i++) ell(x, 2 + r() * 12, 2 + r() * 12, 2, 1, col[2]);
        break;
      case T.WATER: case T.DEEP: case T.HOT:
        speck(5, col[1]);
        for (let i = 0; i < 2; i++) { const px = (r() * 12) | 0, py = 2 + ((r() * 12) | 0); rect(x, col[2], px, py, 3, 1); }
        break;
      case T.PATH: speck(10, col[1]); speck(6, col[2]); for (let i = 0; i < 2; i++) { const px = (r() * 14) | 0, py = (r() * 14) | 0; rect(x, '#b48a58', px, py, 2, 1); rect(x, col[2], px, py - 1, 2, 1); } break;
      case T.COBBLE:
        rect(x, col[1], 0, 0, 16, 16);
        for (let cyy = 0; cyy < 2; cyy++) for (let cxx = 0; cxx < 2; cxx++) {
          const sx = cxx * 8 + ((r() * 2) | 0), sy = cyy * 8 + ((r() * 2) | 0), cc = shade(col[0], ((r() * 3) | 0) * 6 - 6);
          rect(x, cc, sx + 1, sy, 5, 7); rect(x, cc, sx, sy + 1, 7, 5);
          rect(x, col[2], sx + 1, sy + 1, 3, 1); rect(x, col[2], sx + 1, sy + 1, 1, 2);
          rect(x, shade(col[0], -14), sx + 2, sy + 6, 4, 1);
        }
        break;
      case T.FLOOR:
        for (let row = 0; row < 4; row++) {
          rect(x, row % 2 ? col[0] : shade(col[0], 6), 0, row * 4, 16, 4);
          rect(x, col[1], 0, row * 4 + 3, 16, 1);
          rect(x, col[1], ((r() * 14) | 0) + 1, row * 4, 1, 3);
          rect(x, col[2], (r() * 15) | 0, row * 4 + 1, 2, 1);
        }
        break;
      case T.WALL:
        for (let i = 0; i < 4; i++) { rect(x, i % 2 ? col[0] : shade(col[0], 8), i * 4, 0, 4, 16); rect(x, col[1], i * 4 + 3, 0, 1, 16); }
        break;
      case T.BRIDGE:
        for (let row = 0; row < 5; row++) { rect(x, row % 2 ? col[0] : col[2], 0, row * 3 + 1, 16, 2); rect(x, col[1], 0, row * 3, 16, 1); }
        rect(x, '#6e4a28', 0, 0, 16, 1);
        break;
      case T.TFLOOR:
        rect(x, col[1], 0, 0, 16, 1); rect(x, col[1], 0, 8, 16, 1); rect(x, col[1], 0, 0, 1, 16); rect(x, col[1], 8, 0, 1, 16);
        rect(x, col[2], 1, 1, 6, 1); rect(x, col[2], 9, 9, 6, 1); speck(4, col[1]);
        break;
      case T.TWALL: case T.CWALL:
        speck(14, col[1]); speck(8, col[2]);
        if (type === T.TWALL) for (let row = 0; row < 4; row++) { rect(x, col[1], 0, row * 4 + 3, 16, 1); rect(x, col[1], (row % 2 ? 4 : 10), row * 4, 1, 3); }
        break;
      case T.CFLOOR: speck(12, col[1]); speck(6, col[2]); break;
      default: speck(6, col[1]);
    }
    tileCache.set(key, c);
    return c;
  }

  // ---------- chunk rendering ----------
  const CH = 32;
  function decorate(x, t, wx, wy, seed) {
    const h = U.hash(wx, wy, seed + 5);
    if (h > 0.11) return;
    const h2 = U.hash(wx, wy, seed + 9), px = 2 + ((h2 * 11) | 0), py = 3 + ((U.hash(wx, wy, 31) * 10) | 0);
    if (t === T.GRASS) {
      const fc = ['#ffffff', '#ffd23a', '#ff8ab4', '#a98aff', '#ff6a5a'][(h2 * 5) | 0];
      if (h < 0.06) { rect(x, fc, px, py, 1, 1); rect(x, fc, px - 1, py + 1, 1, 1); rect(x, fc, px + 1, py + 1, 1, 1); rect(x, fc, px, py + 2, 1, 1); rect(x, '#ffe680', px, py + 1, 1, 1); }
      else { rect(x, '#5aa83a', px, py, 1, 3); rect(x, '#5aa83a', px + 2, py + 1, 1, 2); rect(x, '#5aa83a', px - 2, py + 1, 1, 2); }
    } else if (t === T.JGRASS) { rect(x, '#2a7a44', px, py, 1, 4); rect(x, '#2a7a44', px + 1, py - 1, 1, 3); rect(x, '#6ad08a', px - 1, py + 1, 1, 2); if (h < 0.03) { rect(x, '#ff6ab4', px + 3, py, 2, 2); } }
    else if (t === T.MOSS) { rect(x, '#a8f0ff', px, py, 1, 1); if (h < 0.05) { rect(x, '#c9a0ff', px + 2, py + 2, 2, 1); rect(x, '#efe6d8', px + 2, py + 3, 1, 2); } }
    else if (t === T.SNOW) { rect(x, '#c8dcec', px, py, 3, 1); rect(x, '#ffffff', px + 1, py - 1, 2, 1); }
    else if (t === T.SAND || t === T.DSAND) { if (h < 0.05) { rect(x, '#b89a6a', px, py, 2, 1); rect(x, '#fff4d8', px, py - 1, 1, 1); } }
    else if (t === T.ASH) { if (h < 0.04) { rect(x, '#ff8a3a', px, py, 1, 1); } else rect(x, '#3a2e30', px, py, 2, 2); }
  }
  function renderChunk(map, cx, cy) {
    const W = Math.min(CH, map.W - cx * CH), H = Math.min(CH, map.H - cy * CH);
    const c = mk(W * TS, H * TS), x = c.getContext('2d');
    const pal = map.pal;
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      const wx = cx * CH + tx, wy = cy * CH + ty, t = map.tile(wx, wy);
      const px = tx * TS, py = ty * TS;
      x.drawImage(tileCanvas(t, (U.hash(wx, wy, 3) * 4) | 0, pal), px, py);
      // edges
      const nb = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      if (isWater(t)) {
        for (let k = 0; k < 4; k++) {
          const n = map.tile(wx + nb[k][0], wy + nb[k][1]);
          if (!isWater(n) && n !== T.VOID) {
            x.fillStyle = 'rgba(235,250,255,0.8)';
            for (let i = 0; i < 16; i++) {
              if (U.hash(wx * 16 + i, wy + k, 11) < 0.25) continue;
              const fx = k === 1 ? px + 15 : k === 3 ? px : px + i, fy = k === 0 ? py : k === 2 ? py + 15 : py + i;
              x.fillRect(fx, fy, 1, 1);
            }
          }
        }
        if (t === T.WATER) for (let k = 0; k < 4; k++) {
          if (map.tile(wx + nb[k][0], wy + nb[k][1]) === T.DEEP) {
            x.fillStyle = 'rgba(38,93,145,0.35)';
            if (k === 0) x.fillRect(px, py, 16, 2); else if (k === 2) x.fillRect(px, py + 14, 16, 2); else if (k === 1) x.fillRect(px + 14, py, 2, 16); else x.fillRect(px, py, 2, 16);
          }
        }
      } else if (GROUND[t]) {
        for (let k = 0; k < 4; k++) {
          const n = map.tile(wx + nb[k][0], wy + nb[k][1]);
          if (n !== t && GROUND[n] && n !== T.PATH && t !== T.PATH) {
            const cc = (TCOL[n] || TCOL[20])[0];
            x.fillStyle = cc;
            for (let i = 0; i < 16; i++) for (let d = 0; d < 3; d++) {
              if (U.hash(wx * 31 + i, wy * 17 + d + k * 3, 13) > (d === 0 ? 0.55 : d === 1 ? 0.3 : 0.12)) continue;
              const fx = k === 1 ? px + 15 - d : k === 3 ? px + d : px + i, fy = k === 0 ? py + d : k === 2 ? py + 15 - d : py + i;
              x.fillRect(fx, fy, 1, 1);
            }
          }
          if (t !== T.PATH && n === T.PATH) {
            // soft path edge
          }
        }
        decorate(x, t, wx, wy, map.seed || 0);
      } else if (isWall(t) && t !== T.VOID) {
        const below = map.tile(wx, wy + 1);
        if (!isWall(below)) {
          const col = (pal && pal[t]) || TCOL[t];
          rect(x, shade(col[0], -18), px, py + 8, 16, 8);
          rect(x, col[2], px, py + 8, 16, 1);
          rect(x, 'rgba(0,0,0,0.25)', px, py + 15, 16, 1);
          if (t === T.TWALL) for (let i = 0; i < 2; i++) rect(x, shade(col[0], -30), px + (i ? 10 : 3), py + 10, 1, 5);
        }
      }
      if (!isWall(t) && !isWater(t) && isWall(map.tile(wx, wy - 1))) { rect(x, 'rgba(0,0,0,0.18)', px, py, 16, 3); rect(x, 'rgba(0,0,0,0.1)', px, py + 3, 16, 2); }
    }
    return c;
  }
  function chunk(map, cx, cy) {
    const key = cx + ',' + cy;
    let c = map.chunks.get(key);
    if (!c) { c = renderChunk(map, cx, cy); map.chunks.set(key, c); }
    return c;
  }

  // ---------- sprite cache ----------
  const sprites = new Map();
  function spr(key, w, h, fn) {
    let c = sprites.get(key);
    if (!c) { c = mk(w, h); fn(c.getContext('2d'), w, h); sprites.set(key, c); }
    return c;
  }

  const TREE = {
    oak(x, v) {
      rect(x, '#6e4a2c', 11, 21, 5, 11); rect(x, '#8a5e38', 11, 21, 2, 11); rect(x, '#5a3a22', 9, 30, 9, 2);
      ell(x, 13, 13, 12, 10, v ? '#3f8a44' : '#3a8a3a'); ell(x, 12, 11, 10, 8, v ? '#58a85a' : '#5aa848'); ell(x, 10, 8, 6, 4, v ? '#78c870' : '#7ac85a');
      const r = U.rng(v + 3); for (let i = 0; i < 10; i++) rect(x, '#2f7030', 4 + r() * 18, 6 + r() * 14, 1, 1);
      if (v === 1) for (let i = 0; i < 4; i++) { const ax = 5 + r() * 16, ay = 8 + r() * 10; rect(x, '#e84a3a', ax, ay, 2, 2); rect(x, '#ff9a8a', ax, ay, 1, 1); }
    },
    pine(x, v) {
      rect(x, '#5a3a22', 9, 27, 4, 7);
      for (let i = 0; i < 4; i++) {
        const top = 1 + i * 6;
        for (let r = 0; r < 10; r++) {
          const hw = Math.round(1 + r * 0.7 + i * 1.4);
          rect(x, '#2a6a4a', 11 - hw, top + r, hw, 1); rect(x, '#3a8a5a', 11, top + r, hw, 1);
          if (r < 2 + (v ? 1 : 0)) { rect(x, '#ffffff', 11 - hw, top + r, hw * 2, 1); }
        }
      }
    },
    palm(x, v) {
      let px = 12, py = 33;
      for (let i = 0; i < 20; i++) { px = 12 + Math.sin(i / 20 * 1.3) * (v ? 5 : -4); py = 33 - i; rect(x, i % 3 ? '#a87a4a' : '#8a5e38', Math.round(px) - 1, py, 3, 1); }
      const tx = Math.round(px), ty = py;
      const angs = [-2.8, -2.2, -1.5, -0.9, -0.3, 0.3];
      for (const a of angs) for (let s = 0; s < 11; s++) {
        const fx = tx + Math.cos(a) * s, fy = ty + Math.sin(a) * s + s * s * 0.06;
        rect(x, s % 2 ? '#3a9a4a' : '#4ab85a', Math.round(fx), Math.round(fy), 2, 1);
      }
      rect(x, '#7a4a28', tx - 2, ty + 1, 2, 2); rect(x, '#7a4a28', tx + 1, ty + 2, 2, 2);
    },
    jungle(x, v) {
      rect(x, '#5a3a24', 13, 24, 7, 14); rect(x, '#7a5232', 13, 24, 2, 14); rect(x, '#4a2e1c', 10, 36, 13, 2);
      ell(x, 16, 15, 15, 12, '#1f6a3a'); ell(x, 15, 13, 13, 10, '#2f8a4a'); ell(x, 11, 9, 7, 5, '#4aa860'); ell(x, 21, 12, 5, 4, '#4aa860');
      const r = U.rng(v + 9); for (let i = 0; i < 5; i++) { const vx = 4 + r() * 24; rect(x, '#2a7a3a', vx, 18 + r() * 4, 1, 6 + r() * 8); }
      for (let i = 0; i < 12; i++) rect(x, '#185a30', 3 + r() * 26, 5 + r() * 18, 1, 1);
    },
    mush(x, v) {
      const caps = ['#9a5ad6', '#3ab8c0', '#e86aa8'], cc = caps[v % 3];
      rect(x, '#e8dccb', 10, 14, 7, 16); rect(x, '#cfc2ae', 14, 14, 3, 16); rect(x, '#bfb29e', 8, 28, 11, 2);
      ell(x, 13, 12, 12, 8, shade(cc, -30)); ell(x, 13, 10, 12, 7, cc); ell(x, 10, 7, 6, 3, shade(cc, 30));
      rect(x, shade(cc, -50), 3, 17, 20, 2);
      const r = U.rng(v + 21); for (let i = 0; i < 5; i++) ell(x, 5 + r() * 16, 5 + r() * 8, 1 + (r() * 2 | 0), 1, '#fff6e8');
    },
    cactus(x, v) {
      const g = '#4aa04a', d = '#3a8a3a', l = '#6ac06a';
      rect(x, g, 5, 4, 6, 22); rect(x, d, 9, 4, 2, 22); rect(x, l, 6, 4, 1, 22); rect(x, g, 6, 3, 4, 1);
      rect(x, g, 1, 12, 4, 3); rect(x, g, 1, 7, 3, 6); rect(x, l, 1, 7, 1, 6);
      if (v) { rect(x, g, 11, 15, 4, 3); rect(x, g, 12, 9, 3, 7); rect(x, d, 14, 9, 1, 7); }
      for (let i = 0; i < 6; i++) rect(x, '#e8f0c8', 5 + (i % 2) * 5, 6 + i * 3, 1, 1);
      if (v) { rect(x, '#ff6ab4', 7, 1, 2, 2); rect(x, '#ffd23a', 7, 2, 1, 1); }
    },
    ash(x, v) {
      rect(x, '#3a2e2e', 9, 10, 4, 20); rect(x, '#4a3a3a', 9, 10, 1, 20); rect(x, '#2a2020', 7, 28, 8, 2);
      const br = [[9, 14, -1, -1], [12, 12, 1, -1], [10, 18, -1, -0.6], [12, 8, 1, -1.4]];
      for (const [bx, by, dx, dy] of br) for (let s = 0; s < 6; s++) rect(x, '#3a2e2e', Math.round(bx + dx * s), Math.round(by + dy * s), 2, 1);
      const r = U.rng(v + 5); for (let i = 0; i < 6; i++) rect(x, i % 2 ? '#ff8a3a' : '#ffc04a', 9 + r() * 4, 12 + r() * 16, 1, 1);
    },
  };
  const TREE_SIZE = { oak: [26, 32], pine: [22, 35], palm: [26, 35], jungle: [32, 38], mush: [26, 30], cactus: [16, 27], ash: [22, 30] };
  function treeSprite(kind, v) { const [w, h] = TREE_SIZE[kind]; return spr('tree_' + kind + v, w, h, (x) => TREE[kind](x, v)); }

  const ROCK_TINT = { meadow: '#8e8e96', coast: '#a49c90', snow: '#8a96a8', mushroom: '#7a7494', jungle: '#7e8a7a', desert: '#b49a74', volcano: '#5a4c4c', cave: '#7e746c' };
  function rockSprite(kind, biome) {
    return spr('rock_' + kind + biome, 16, 15, (x) => {
      const base = ROCK_TINT[biome] || ROCK_TINT.meadow;
      if (kind === 'crystal' || kind === 'lumen') {
        ell(x, 8, 12, 7, 3, shade(base, -10));
        const cc = kind === 'crystal' ? ['#b48aff', '#8a5ad6', '#e0ccff'] : ['#6ff0ff', '#3ac0e0', '#e0ffff'];
        const shards = [[4, 12, 2, 7], [8, 13, 3, 11], [12, 12, 2, 8]];
        for (const [sx, sy, hw, h] of shards) for (let r = 0; r < h; r++) { const w = Math.max(1, Math.round(hw * (r / h))); rect(x, cc[1], sx - w, sy - h + r, w, 1); rect(x, cc[0], sx, sy - h + r, w, 1); }
        rect(x, cc[2], 8, 4, 1, 3); rect(x, cc[2], 4, 7, 1, 2);
        return;
      }
      ell(x, 8, 9, 7, 5, shade(base, -22)); ell(x, 8, 8, 7, 5, base); ell(x, 7, 6, 4, 2, shade(base, 22));
      if (biome === 'snow') { ell(x, 8, 5, 5, 2, '#ffffff'); }
      const sp = { copper: ['#e8823a', '#ffb070'], iron: ['#d8cfc4', '#a89888'], gold: ['#ffd23a', '#fff09a'], coal: ['#1e1a1a', '#3a3434'] }[kind];
      if (sp) { const r = U.rng(kind.length * 7); for (let i = 0; i < 6; i++) { const px = 3 + r() * 10, py = 5 + r() * 6; rect(x, sp[0], px, py, 2, 2); rect(x, sp[1], px, py, 1, 1); } }
    });
  }
  function bushSprite(kind) {
    return spr('bush_' + kind, 16, 13, (x) => {
      if (kind === 'grass') {
        const r = U.rng(4);
        for (let i = 0; i < 9; i++) { const bx = 2 + i * 1.4, h = 5 + r() * 6; rect(x, i % 2 ? '#5aa83a' : '#74c04a', Math.round(bx), Math.round(13 - h), 1, Math.round(h)); }
        return;
      }
      const g = kind === 'snowberry' ? ['#8aa8a0', '#b4ccc4', '#e8f4f0'] : ['#3a8a3a', '#5aa848', '#7ac85a'];
      ell(x, 8, 8, 7, 5, g[0]); ell(x, 8, 7, 6, 4, g[1]); ell(x, 6, 5, 3, 2, g[2]);
      const bc = kind === 'snowberry' ? '#e84a5a' : '#5a5ae8';
      const pts = [[4, 7], [9, 5], [11, 9], [6, 10], [12, 6]];
      for (const [px, py] of pts) { rect(x, bc, px, py, 2, 2); rect(x, '#ffffff', px, py, 1, 1); }
    });
  }
  const STATIC = {
    dig: [14, 9, (x) => { ell(x, 7, 5, 6, 3, '#8a6440'); ell(x, 7, 4, 5, 2, '#a07a50'); rect(x, '#5a3e24', 4, 4, 3, 1); rect(x, '#5a3e24', 8, 3, 2, 1); rect(x, '#5a3e24', 6, 5, 1, 2); rect(x, '#f2ead8', 10, 5, 2, 1); }],
    chest: [14, 12, (x) => { rect(x, '#7a4a24', 1, 3, 12, 9); rect(x, '#a8683a', 1, 3, 12, 4); rect(x, '#e8b83a', 1, 6, 12, 1); rect(x, '#e8b83a', 6, 5, 2, 4); rect(x, '#5a3418', 1, 11, 12, 1); rect(x, '#c98a4a', 2, 3, 10, 1); }],
    xchest: [14, 12, (x) => { rect(x, '#3a5a6a', 1, 3, 12, 9); rect(x, '#4a7a8a', 1, 3, 12, 4); rect(x, '#6ff0ff', 1, 6, 12, 1); rect(x, '#6ff0ff', 6, 5, 2, 4); rect(x, '#2a3a4a', 1, 11, 12, 1); }],
    waystone: [14, 28, (x) => {
      rect(x, '#7a7a86', 1, 23, 12, 5); rect(x, '#9a9aa6', 1, 23, 12, 1);
      for (let r = 0; r < 22; r++) { const hw = 3 + Math.round(r / 7); rect(x, '#8a90a0', 7 - hw, 1 + r, hw * 2, 1); rect(x, '#a8aebe', 7 - hw, 1 + r, 2, 1); }
      rect(x, '#5a6070', 5, 8, 4, 4); rect(x, '#5a6070', 6, 14, 2, 4);
    }],
    lamp: [8, 26, (x) => { rect(x, '#3a3440', 3, 8, 2, 18); rect(x, '#3a3440', 1, 24, 6, 2); rect(x, '#3a3440', 1, 2, 6, 1); rect(x, '#3a3440', 1, 8, 6, 1); rect(x, '#ffe08a', 2, 3, 4, 5); rect(x, '#fff6c8', 3, 4, 1, 2); rect(x, '#3a3440', 2, 0, 4, 2); }],
    bench: [22, 12, (x) => { rect(x, '#8a5a34', 1, 2, 20, 3); rect(x, '#a87444', 1, 2, 20, 1); rect(x, '#8a5a34', 1, 7, 20, 2); rect(x, '#a87444', 1, 7, 20, 1); rect(x, '#4a3a3a', 3, 5, 2, 7); rect(x, '#4a3a3a', 17, 5, 2, 7); }],
    board: [18, 20, (x) => { rect(x, '#6a4a2a', 2, 10, 2, 10); rect(x, '#6a4a2a', 14, 10, 2, 10); rect(x, '#a8743f', 0, 1, 18, 12); rect(x, '#c9925a', 0, 1, 18, 1); rect(x, '#f6efe0', 2, 3, 5, 6); rect(x, '#f6efe0', 9, 3, 6, 4); rect(x, '#ffe08a', 10, 8, 4, 3); rect(x, '#e85a5a', 4, 3, 1, 1); rect(x, '#e85a5a', 12, 3, 1, 1); }],
    sign: [12, 14, (x) => { rect(x, '#6a4a2a', 5, 7, 2, 7); rect(x, '#a8743f', 0, 1, 12, 7); rect(x, '#c9925a', 0, 1, 12, 1); rect(x, '#5a3a20', 2, 3, 8, 1); rect(x, '#5a3a20', 2, 5, 6, 1); }],
    fountain: [48, 36, (x) => {
      ell(x, 24, 22, 22, 12, '#8a8a96'); ell(x, 24, 21, 21, 11, '#b4b4c0'); ell(x, 24, 21, 18, 9, '#4aa3d8'); ell(x, 24, 20, 14, 6, '#6cc0ea');
      rect(x, '#9a9aa6', 21, 6, 6, 14); rect(x, '#c4c4d0', 21, 6, 2, 14); ell(x, 24, 7, 7, 3, '#b4b4c0'); ell(x, 24, 6, 5, 2, '#6cc0ea');
    }],
    pot: [10, 10, (x) => { ell(x, 5, 6, 4, 4, '#a8643a'); ell(x, 5, 5, 4, 3, '#c97a4a'); rect(x, '#7a4428', 3, 1, 4, 2); rect(x, '#e8a070', 3, 4, 1, 2); }],
    plate: [14, 14, (x) => { rect(x, '#6a6058', 1, 1, 12, 12); rect(x, '#8a8078', 2, 2, 10, 10); rect(x, '#ffd23a', 5, 5, 4, 4); }],
    plate_on: [14, 14, (x) => { rect(x, '#6a6058', 1, 1, 12, 12); rect(x, '#5a5048', 2, 2, 10, 10); rect(x, '#6ff0ff', 5, 5, 4, 4); }],
    block: [16, 18, (x) => { rect(x, '#5a5048', 0, 2, 16, 16); rect(x, '#8a8070', 0, 0, 16, 12); rect(x, '#a49a88', 1, 1, 14, 2); rect(x, '#6a6058', 4, 4, 8, 5); rect(x, '#ffd23a', 7, 5, 2, 3); }],
    gate: [16, 24, (x) => { rect(x, '#3a3434', 0, 0, 16, 3); for (let i = 0; i < 4; i++) rect(x, '#6a6470', 1 + i * 4, 3, 2, 21); rect(x, '#8a8490', 1, 10, 14, 2); }],
    lockdoor: [16, 24, (x) => { rect(x, '#5a3a24', 0, 0, 16, 24); rect(x, '#7a5232', 1, 1, 14, 22); rect(x, '#e8b83a', 6, 10, 4, 5); rect(x, '#3a2a1a', 7, 12, 2, 2); }],
    brazier: [12, 16, (x) => { rect(x, '#4a4040', 5, 7, 2, 9); rect(x, '#4a4040', 2, 14, 8, 2); rect(x, '#6a6060', 1, 4, 10, 4); rect(x, '#8a8080', 1, 4, 10, 1); }],
    crystal_off: [10, 16, (x) => { for (let r = 0; r < 14; r++) { const w = r < 4 ? r + 1 : r > 10 ? 15 - r : 4; rect(x, '#6a5a7a', 5 - w, r + 1, w * 2, 1); } rect(x, '#8a7a9a', 4, 3, 1, 8); }],
    crystal_on: [10, 16, (x) => { for (let r = 0; r < 14; r++) { const w = r < 4 ? r + 1 : r > 10 ? 15 - r : 4; rect(x, '#5ac8fa', 5 - w, r + 1, w * 2, 1); } rect(x, '#e0ffff', 4, 3, 1, 8); }],
    altar: [32, 24, (x) => { rect(x, '#6a6058', 2, 10, 28, 14); rect(x, '#8a8070', 2, 10, 28, 3); rect(x, '#a49a88', 6, 6, 20, 5); rect(x, '#c4baa8', 6, 6, 20, 1); }],
    ladder_down: [16, 16, (x) => { rect(x, '#1a1414', 1, 1, 14, 14); rect(x, '#2a2020', 2, 2, 12, 12); rect(x, '#8a5a34', 4, 2, 2, 12); rect(x, '#8a5a34', 10, 2, 2, 12); for (let i = 0; i < 4; i++) rect(x, '#a87444', 4, 3 + i * 3, 8, 1); }],
    ladder_up: [16, 22, (x) => { rect(x, '#8a5a34', 3, 0, 2, 22); rect(x, '#8a5a34', 11, 0, 2, 22); for (let i = 0; i < 6; i++) rect(x, '#a87444', 3, 2 + i * 3.5, 10, 1); rect(x, '#ffe08a', 6, 0, 4, 1); }],
    pillar: [14, 28, (x) => { rect(x, '#7a7468', 2, 2, 10, 24); rect(x, '#948e82', 2, 2, 3, 24); rect(x, '#5a544c', 0, 24, 14, 4); rect(x, '#5a544c', 0, 0, 14, 3); }],
    rune: [14, 14, (x) => { ell(x, 7, 7, 6, 6, '#3a3a4a'); ell(x, 7, 7, 4, 4, '#5a5a7a'); rect(x, '#b48aff', 6, 3, 2, 8); rect(x, '#b48aff', 3, 6, 8, 2); }],
    stray_box: [16, 12, (x) => { rect(x, '#b08050', 1, 3, 14, 9); rect(x, '#c99a68', 1, 3, 14, 2); rect(x, '#8a6038', 0, 1, 4, 3); rect(x, '#8a6038', 12, 1, 4, 3); }],
    crate_deco: [14, 14, (x) => { rect(x, '#8a5a34', 1, 1, 12, 12); rect(x, '#a87444', 2, 2, 10, 10); rect(x, '#8a5a34', 2, 6, 10, 2); }],
    flowerbed: [16, 10, (x) => { rect(x, '#7a5232', 0, 4, 16, 6); rect(x, '#5a3a22', 1, 5, 14, 4); const fc = ['#ff6a8a', '#ffd23a', '#ffffff', '#a98aff']; for (let i = 0; i < 5; i++) { rect(x, '#4a9a3a', 2 + i * 3, 2, 1, 3); rect(x, fc[i % 4], 1 + i * 3, 0, 3, 2); } }],
    snowpile: [16, 10, (x) => { ell(x, 8, 6, 7, 4, '#d6e4f0'); ell(x, 7, 5, 6, 3, '#ffffff'); }],
    vines: [16, 16, (x) => { for (let i = 0; i < 4; i++) { rect(x, '#2a7a3a', 2 + i * 4, 0, 1, 8 + i * 2); rect(x, '#4aa860', 1 + i * 4, 3 + i, 3, 2); } }],
    crack: [16, 15, (x) => { ell(x, 8, 9, 7, 5, '#6a6058'); ell(x, 8, 8, 7, 5, '#8a8070'); rect(x, '#3a3430', 5, 4, 1, 4); rect(x, '#3a3430', 6, 7, 3, 1); rect(x, '#3a3430', 9, 8, 1, 4); }],
    boat: [40, 18, (x) => { for (let r = 0; r < 10; r++) rect(x, r < 2 ? '#e8e0d0' : '#a8643a', 2 + r, 6 + r, 36 - r * 2, 1); rect(x, '#6a3a1a', 19, 0, 2, 8); rect(x, '#f6efe0', 21, 0, 8, 6); }],
    xtree: [48, 62, (x) => {
      rect(x, '#5a3a22', 21, 54, 6, 8);
      for (let i = 0; i < 4; i++) {
        const top = 6 + i * 12;
        for (let r = 0; r < 15; r++) { const hw = Math.round(2 + r * 1.05 + i * 2.6); rect(x, '#2a6a4a', 24 - hw, top + r, hw, 1); rect(x, '#3a8a5a', 24, top + r, hw, 1); if (r < 2) rect(x, '#ffffff', 24 - hw, top + r, hw * 2, 1); }
      }
      const rr = U.rng(5), cols = ['#ff4a5a', '#ffd23a', '#5ac8fa', '#ff8ad8', '#ffffff'];
      for (let i = 0; i < 26; i++) { const yy = 10 + rr() * 42, hw = 2 + (yy - 6) * 0.4; rect(x, cols[i % 5], Math.round(24 + (rr() - 0.5) * hw * 1.6), Math.round(yy), 2, 2); }
      rect(x, '#ffd23a', 22, 0, 4, 6); rect(x, '#ffd23a', 20, 2, 8, 2); rect(x, '#fff6a8', 23, 1, 2, 2);
    }],
    gmush: [48, 60, (x) => {
      rect(x, '#e8dccb', 18, 26, 12, 34); rect(x, '#cfc2ae', 25, 26, 5, 34); rect(x, '#bfb29e', 14, 57, 20, 3);
      ell(x, 24, 24, 23, 15, '#2a8a94'); ell(x, 24, 21, 23, 14, '#3ab8c0'); ell(x, 18, 14, 11, 6, '#6fd8de'); rect(x, '#1e6a72', 4, 33, 40, 3);
      const rr = U.rng(9); for (let i = 0; i < 9; i++) ell(x, 6 + rr() * 36, 10 + rr() * 18, 1 + ((rr() * 2) | 0), 2, '#e8fbff');
      for (const [mx, c] of [[8, '#e86aa8'], [38, '#9a5ad6']]) { rect(x, '#efe6d8', mx, 53, 3, 6); ell(x, mx + 1, 52, 4, 3, c); }
    }],
    totem: [48, 58, (x) => {
      ell(x, 24, 55, 18, 3, '#6a6058');
      const sec = [['#c94a3a', '#ffd23a'], ['#3a9ab0', '#ffffff'], ['#e8a83a', '#3a2a1a']];
      for (let i = 0; i < 3; i++) {
        const y0 = 10 + i * 15, [c1, c2] = sec[i];
        rect(x, '#8a5a34', 16, y0, 16, 15); rect(x, '#6a4428', 28, y0, 4, 15); rect(x, c1, 16, y0, 16, 2);
        rect(x, c2, 19, y0 + 4, 4, 3); rect(x, c2, 25, y0 + 4, 4, 3); rect(x, '#1a1210', 20, y0 + 5, 2, 2); rect(x, '#1a1210', 26, y0 + 5, 2, 2);
        rect(x, c1, 20, y0 + 10, 8, 2); rect(x, '#1a1210', 21, y0 + 11, 6, 1);
      }
      rect(x, '#3aa84a', 2, 12, 14, 4); rect(x, '#e85a5a', 4, 16, 12, 3); rect(x, '#3aa84a', 32, 12, 14, 4); rect(x, '#e85a5a', 32, 16, 12, 3);
      rect(x, '#ffd23a', 20, 2, 8, 8); rect(x, '#ff8a3a', 22, 0, 4, 3);
    }],
    anvil: [48, 46, (x) => {
      rect(x, '#3a2e2e', 4, 30, 40, 16); rect(x, '#5a4a48', 4, 30, 40, 3); for (let i = 0; i < 3; i++) rect(x, '#2a2020', 4, 35 + i * 4, 40, 1);
      rect(x, '#4a4a54', 16, 22, 16, 8); rect(x, '#5a5a66', 8, 12, 32, 10); rect(x, '#7a7a88', 8, 12, 32, 2); rect(x, '#5a5a66', 2, 14, 8, 5); rect(x, '#7a7a88', 2, 14, 8, 1);
      rect(x, '#8a5a34', 30, 2, 3, 12); rect(x, '#3a3a44', 26, 0, 11, 5); rect(x, '#5a5a66', 26, 0, 11, 1);
      rect(x, '#ff8a3a', 12, 26, 2, 2); rect(x, '#ffc04a', 36, 28, 2, 2);
    }],
    anchor: [48, 50, (x) => {
      rect(x, '#8a8a96', 8, 38, 32, 12); rect(x, '#a8a8b4', 8, 38, 32, 2);
      const ir = '#3a4a5a', hi = '#5a6a7a';
      ell(x, 24, 5, 4, 4, ir); ell(x, 24, 5, 2, 2, '#8a8a96');
      rect(x, ir, 22, 8, 4, 28); rect(x, hi, 22, 8, 1, 28); rect(x, ir, 13, 13, 22, 3); rect(x, hi, 13, 13, 22, 1);
      for (let i = 0; i < 9; i++) { rect(x, ir, 12 + i, 30 + Math.round(Math.sqrt(i) * 2), 3, 3); rect(x, ir, 33 - i, 30 + Math.round(Math.sqrt(i) * 2), 3, 3); }
      rect(x, ir, 10, 27, 4, 4); rect(x, ir, 34, 27, 4, 4);
      for (let i = 0; i < 6; i++) rect(x, i % 2 ? '#c9a46a' : '#a8843a', 19 + (i % 3), 16 + i * 3, 10 - (i % 3) * 2, 2);
    }],
  };
  function staticSprite(name) { const s = STATIC[name]; return spr('st_' + name, s[0], s[1], s[2]); }

  // ---------- buildings ----------
  const BSTYLE = {
    meadow: { wall: '#f2e2c4', roofs: ['#d9604a', '#4a7ad9', '#5aa85a', '#d9a04a', '#9a6ad9'], trim: '#8a5a3a', door: '#7a4a2a' },
    home: { wall: '#fff0d8', roofs: ['#e8789a'], trim: '#8a5a3a', door: '#5aa0d8' },
    coast: { wall: '#f6f6f2', roofs: ['#3a8ad9', '#3ac9c0', '#e86a5a', '#f2c94c'], trim: '#3a5a8a', door: '#3a8ad9' },
    snow: { wall: '#9a6a44', roofs: ['#c94a4a', '#4a6ab8', '#5a8a5a'], trim: '#5a3a22', door: '#5a3a22', snowroof: 1, logs: 1 },
    mushroom: { wall: '#efe6d8', roofs: ['#9a5ad6', '#e86aa8', '#3ab8c0', '#d94a4a'], trim: '#8a7a6a', door: '#7a5aa8', cap: 1 },
    jungle: { wall: '#c9a65a', roofs: ['#3a8a3a', '#5a9a2a', '#2a7a4a'], trim: '#7a5a2a', door: '#6a4a24', bamboo: 1 },
    desert: { wall: '#ecc48e', roofs: ['#4a8ad9', '#e8e0d0', '#3ac9b0', '#d9604a'], trim: '#a87444', door: '#3a6ab8', flat: 1 },
    volcano: { wall: '#5a4c4c', roofs: ['#8a3a2a', '#5a5a6a', '#a85a2a'], trim: '#2a2222', door: '#3a2a2a', stone: 1 },
  };
  function buildingSprite(style, v) {
    return spr('bld_' + style + v, 80, 84, (x) => {
      const S = BSTYLE[style] || BSTYLE.meadow, roof = S.roofs[v % S.roofs.length];
      // walls
      rect(x, shade(S.wall, -25), 6, 44, 68, 40); rect(x, S.wall, 6, 44, 68, 38);
      if (S.logs) for (let i = 0; i < 9; i++) { rect(x, shade(S.wall, i % 2 ? 12 : -8), 6, 46 + i * 4, 68, 4); rect(x, shade(S.wall, -30), 6, 49 + i * 4, 68, 1); }
      if (S.bamboo) for (let i = 0; i < 17; i++) { rect(x, shade(S.wall, i % 2 ? 10 : -10), 6 + i * 4, 44, 4, 40); rect(x, shade(S.wall, -35), 6 + i * 4, 52 + (i % 3) * 9, 4, 1); }
      if (S.stone) for (let r = 0; r < 10; r++) { rect(x, shade(S.wall, -18), 6, 46 + r * 4, 68, 1); for (let c = 0; c < 8; c++) rect(x, shade(S.wall, -18), 6 + c * 9 + (r % 2) * 4, 46 + r * 4, 1, 4); }
      rect(x, S.trim, 6, 44, 68, 2); rect(x, S.trim, 6, 44, 2, 40); rect(x, S.trim, 72, 44, 2, 40);
      // roof
      if (S.cap) {
        ell(x, 40, 30, 40, 18, shade(roof, -30)); ell(x, 40, 27, 39, 17, roof); ell(x, 30, 20, 16, 7, shade(roof, 30));
        const r = U.rng(v + 77); for (let i = 0; i < 7; i++) ell(x, 10 + r() * 60, 16 + r() * 18, 2 + (r() * 2 | 0), 2, '#fff6e8');
      } else if (S.flat) {
        rect(x, shade(S.wall, -15), 2, 36, 76, 10); rect(x, shade(S.wall, 10), 2, 36, 76, 2);
        ell(x, 40, 34, 14, 12, shade(roof, -25)); ell(x, 40, 33, 13, 11, roof); rect(x, shade(S.wall, -15), 26, 34, 28, 12); ell(x, 36, 27, 4, 4, shade(roof, 35));
        rect(x, '#e8b83a', 39, 18, 2, 4);
      } else {
        for (let r = 0; r < 40; r++) {
          const hw = 18 + Math.round(r * 0.6);
          const c = (Math.floor(r / 4) % 2) ? roof : shade(roof, -16);
          rect(x, c, 40 - hw, 6 + r, hw * 2, 1);
          if (r % 4 === 3) rect(x, shade(roof, -40), 40 - hw, 6 + r, hw * 2, 1);
        }
        rect(x, shade(roof, 30), 22, 6, 36, 2);
        if (S.snowroof) { rect(x, '#ffffff', 22, 4, 36, 4); for (let i = 0; i < 12; i++) rect(x, '#ffffff', 2 + i * 6, 44, 4, 2 + (i % 3)); rect(x, '#e8f0f8', 0, 44, 80, 2); }
        if (S.bamboo) for (let i = 0; i < 16; i++) rect(x, '#2a6a2a', 4 + i * 5, 40 + (i % 2) * 3, 2, 6);
        if (style === 'meadow' || style === 'home' || style === 'snow') { rect(x, '#8a5a4a', 56, 2, 8, 14); rect(x, '#6a4a3a', 56, 2, 8, 2); }
      }
      // door
      rect(x, S.trim, 32, 60, 16, 24); rect(x, S.door, 34, 62, 12, 22); rect(x, shade(S.door, 25), 34, 62, 12, 2); rect(x, '#ffd23a', 43, 72, 2, 2);
      // windows
      for (const wx of [13, 55]) { rect(x, S.trim, wx - 1, 55, 14, 14); rect(x, '#3a4a6a', wx, 56, 12, 12); rect(x, '#5a7aa8', wx, 56, 5, 5); rect(x, S.trim, wx + 5, 56, 2, 12); rect(x, S.trim, wx, 61, 12, 2); }
      if (style === 'home' || style === 'meadow') for (const wx of [12, 54]) { rect(x, '#7a5232', wx, 69, 16, 3); const fc = ['#ff6a8a', '#ffd23a', '#ffffff']; for (let i = 0; i < 4; i++) rect(x, fc[(i + v) % 3], wx + 1 + i * 4, 67, 2, 2); }
      // sign board
      rect(x, '#6a4a2a', 31, 47, 18, 11); rect(x, '#c9925a', 32, 48, 16, 9);
    });
  }
  const WINDOWS = [[13, 56, 12, 12], [55, 56, 12, 12]];
  function templeSprite(biome) {
    return spr('temple_' + biome, 80, 76, (x) => {
      const [fl, wl] = TEMPLE_PAL[biome];
      rect(x, wl[1], 0, 36, 80, 40); rect(x, wl[0], 0, 36, 80, 37); rect(x, wl[2], 0, 36, 80, 2);
      rect(x, wl[1], 8, 20, 64, 17); rect(x, wl[0], 8, 20, 64, 15); rect(x, wl[2], 8, 20, 64, 2);
      rect(x, wl[1], 18, 6, 44, 15); rect(x, wl[0], 18, 6, 44, 13); rect(x, wl[2], 18, 6, 44, 2);
      for (let r = 0; r < 9; r++) rect(x, wl[1], 0, 40 + r * 4, 80, 1);
      for (const px of [4, 66]) { rect(x, fl[0], px, 38, 10, 38); rect(x, fl[2], px, 38, 3, 38); rect(x, fl[1], px - 1, 36, 12, 3); }
      ell(x, 40, 52, 11, 12, '#141018'); rect(x, '#141018', 29, 52, 22, 24); rect(x, fl[1], 27, 40, 26, 3);
      const glow = { meadow: '#8be36b', coast: '#5ac8fa', snow: '#bfefff', mushroom: '#b18cff', jungle: '#ff8fc8', desert: '#ffd23a', volcano: '#ff7a3a' }[biome];
      ell(x, 40, 12, 4, 4, glow); rect(x, '#ffffff', 39, 10, 2, 2);
      if (biome === 'snow') { rect(x, '#ffffff', 18, 4, 44, 3); rect(x, '#ffffff', 8, 18, 64, 3); rect(x, '#ffffff', 0, 34, 80, 3); }
      if (biome === 'jungle' || biome === 'meadow') for (let i = 0; i < 8; i++) { rect(x, '#2a7a3a', 3 + i * 10, 36, 2, 6 + (i * 7) % 12); rect(x, '#4aa860', 2 + i * 10, 40 + (i * 5) % 8, 4, 2); }
      if (biome === 'desert') { ell(x, 12, 74, 14, 4, '#e8bf74'); ell(x, 68, 74, 14, 4, '#e8bf74'); }
      if (biome === 'volcano') for (let i = 0; i < 6; i++) rect(x, '#ff8a3a', 10 + i * 12, 70 - (i % 3) * 8, 2, 2);
    });
  }
  function caveSprite(biome) {
    return spr('cave_' + biome, 48, 38, (x) => {
      const base = ROCK_TINT[biome] || '#7e746c';
      ell(x, 24, 22, 23, 16, shade(base, -25)); ell(x, 24, 20, 22, 15, base); ell(x, 18, 12, 10, 6, shade(base, 18));
      if (biome === 'snow') { ell(x, 22, 8, 14, 5, '#ffffff'); }
      if (biome === 'mushroom') { rect(x, '#b48aff', 6, 14, 3, 5); rect(x, '#b48aff', 38, 18, 3, 6); }
      ell(x, 24, 30, 9, 8, '#141018'); rect(x, '#141018', 15, 30, 18, 8);
      rect(x, '#8a5a34', 13, 22, 3, 16); rect(x, '#8a5a34', 32, 22, 3, 16); rect(x, '#a87444', 13, 21, 22, 3);
    });
  }
  function lighthouseSprite(lit) {
    return spr('lighthouse' + (lit ? 1 : 0), 48, 112, (x) => {
      rect(x, '#8a8a96', 4, 98, 40, 14); rect(x, '#a8a8b4', 4, 98, 40, 2);
      for (let r = 0; r < 72; r++) { const hw = 11 + Math.round(r * 0.1); rect(x, Math.floor(r / 12) % 2 ? '#e84a4a' : '#f6f6f2', 24 - hw, 27 + r, hw * 2, 1); rect(x, 'rgba(0,0,0,0.12)', 24 + hw - 4, 27 + r, 4, 1); }
      rect(x, '#3a3a4a', 10, 24, 28, 4);
      rect(x, '#3a3a4a', 13, 10, 22, 15); rect(x, lit ? '#fff6a8' : '#5a6a8a', 15, 12, 18, 11); if (lit) rect(x, '#ffffff', 19, 14, 10, 7);
      for (let r = 0; r < 9; r++) rect(x, '#c94a4a', 24 - (r + 4), 2 + r, (r + 4) * 2, 1);
      rect(x, '#5a3a3a', 22, 98, 4, 14); rect(x, '#3a2a2a', 20, 102, 8, 10);
    });
  }

  // ---------- emoji ----------
  const emojiCache = new Map();
  const EFONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
  function emojiCanvas(ch, px, filter) {
    const key = ch + '|' + px + '|' + (filter || '');
    let c = emojiCache.get(key);
    if (c) return c;
    const s = Math.ceil(px * 1.3);
    c = mk(s, s);
    const x = c.getContext('2d');
    if (filter) x.filter = filter;
    x.font = px + 'px ' + EFONT; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ch, s / 2, s / 2 + px * 0.06);
    emojiCache.set(key, c);
    return c;
  }
  function emoji(ctx, ch, x, y, size, filter) {
    const z = G.zoom || 3;
    const c = emojiCanvas(ch, Math.max(6, Math.round(size * z)), filter);
    const w = c.width / z;
    ctx.drawImage(c, x - w / 2, y - w / 2, w, w);
  }

  // ---------- characters ----------
  function lookObj(a) { return Array.isArray(a) ? { skin: a[0], hair: a[1], hs: a[2], outfit: a[3], pants: a[4], hat: a[5] || '' } : a; }
  function drawHuman(c, x, y, L, dir, t, moving, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y);
    c.fillStyle = 'rgba(0,0,0,0.22)'; ell(c, x, y, 5, 2);
    const ph = Math.floor(t * 8) % 2, step = moving ? (ph ? 1 : -1) : 0, bob = moving ? ph : 0;
    const side = dir === 'left' || dir === 'right';
    if (o.sit) { y -= 2; }
    // legs
    c.fillStyle = L.pants;
    if (o.sit) { c.fillRect(x - 3, y - 4, 6, 3); }
    else if (side) { c.fillRect(x - 2 + step, y - 4, 2, 4); c.fillRect(x - step, y - 4, 2, 4); c.fillStyle = '#3a2a2a'; c.fillRect(x - 2 + step, y - 1, 2, 1); c.fillRect(x - step, y - 1, 2, 1); }
    else { c.fillRect(x - 3, y - 4 - (step > 0 ? 1 : 0), 2, 4); c.fillRect(x + 1, y - 4 - (step < 0 ? 1 : 0), 2, 4); c.fillStyle = '#3a2a2a'; c.fillRect(x - 3, y - 1 - (step > 0 ? 1 : 0), 2, 1); c.fillRect(x + 1, y - 1 - (step < 0 ? 1 : 0), 2, 1); }
    const by = y - 4 - bob;
    // body
    c.fillStyle = L.outfit; c.fillRect(x - 4, by - 6, 8, 6);
    c.fillStyle = shade(L.outfit, -30); c.fillRect(x - 4, by - 1, 8, 1);
    c.fillStyle = shade(L.outfit, 25); c.fillRect(x - 3, by - 6, 6, 1);
    // arms
    const sw = o.swing != null ? 0 : step;
    c.fillStyle = shade(L.outfit, -12);
    if (side) { const ax = dir === 'left' ? x - 1 : x; c.fillRect(ax + sw, by - 5, 2, 4); c.fillStyle = L.skin; c.fillRect(ax + sw, by - 2, 2, 1); }
    else { c.fillRect(x - 5, by - 6 + (sw > 0 ? 1 : 0), 1, 4); c.fillRect(x + 4, by - 6 + (sw < 0 ? 1 : 0), 1, 4); c.fillStyle = L.skin; c.fillRect(x - 5, by - 2 + (sw > 0 ? 1 : 0), 1, 1); c.fillRect(x + 4, by - 2 + (sw < 0 ? 1 : 0), 1, 1); }
    // head
    const hy = by - 15;
    c.fillStyle = L.skin; c.fillRect(x - 5, hy + 1, 10, 8); c.fillRect(x - 4, hy, 8, 10);
    // face
    const blink = (Math.floor(t * 0.7 + (o.seed || 0)) % 5 === 0) && (t * 0.7 + (o.seed || 0)) % 1 < 0.12;
    c.fillStyle = '#2a2030';
    if (dir === 'down') { if (blink) { c.fillRect(x - 3, hy + 6, 1, 1); c.fillRect(x + 2, hy + 6, 1, 1); } else { c.fillRect(x - 3, hy + 5, 1, 2); c.fillRect(x + 2, hy + 5, 1, 2); } c.fillStyle = '#f29a9a'; c.fillRect(x - 4, hy + 7, 1, 1); c.fillRect(x + 3, hy + 7, 1, 1); }
    else if (dir === 'left') { c.fillRect(x - 3, hy + 5, 1, blink ? 1 : 2); c.fillStyle = '#f29a9a'; c.fillRect(x - 4, hy + 7, 1, 1); }
    else if (dir === 'right') { c.fillRect(x + 2, hy + 5, 1, blink ? 1 : 2); c.fillStyle = '#f29a9a'; c.fillRect(x + 3, hy + 7, 1, 1); }
    // hair
    c.fillStyle = L.hair; const hs = L.hs | 0;
    if (hs !== 4) { c.fillRect(x - 5, hy - 1, 10, 3); c.fillRect(x - 4, hy - 2, 8, 1); }
    else { c.fillRect(x - 5, hy + 2, 1, 3); c.fillRect(x + 4, hy + 2, 1, 3); }
    if (hs !== 4) {
      if (dir === 'down') { c.fillRect(x - 5, hy + 2, 2, 2); c.fillRect(x + 3, hy + 2, 2, 2); c.fillRect(x - 2, hy + 2, 3, 1); if (hs === 1) { c.fillRect(x - 6, hy + 1, 2, 9); c.fillRect(x + 4, hy + 1, 2, 9); } }
      else if (dir === 'up') { c.fillRect(x - 5, hy + 1, 10, 8); if (hs === 1) c.fillRect(x - 5, hy + 8, 10, 5); }
      else if (dir === 'left') { c.fillRect(x, hy + 1, 5, 6); c.fillRect(x - 5, hy + 2, 2, 1); if (hs === 1) c.fillRect(x + 1, hy + 6, 5, 6); }
      else { c.fillRect(x - 5, hy + 1, 5, 6); c.fillRect(x + 3, hy + 2, 2, 1); if (hs === 1) c.fillRect(x - 6, hy + 6, 5, 6); }
      if (hs === 2) { c.fillRect(x - 2, hy - 5, 4, 3); c.fillStyle = shade(L.hair, 25); c.fillRect(x - 1, hy - 5, 1, 1); }
      if (hs === 3) { c.fillRect(x - 4, hy - 3, 1, 1); c.fillRect(x - 1, hy - 4, 2, 2); c.fillRect(x + 3, hy - 3, 1, 1); }
      c.fillStyle = shade(L.hair, 30); c.fillRect(x - 3, hy - 1, 3, 1);
    }
    if (L.hat) emoji(c, L.hat, x, hy - 1, 11);
    if (o.swing != null && o.tool) {
      const a = (dir === 'left' ? -1 : 1) * (-1.2 + o.swing * 2.2);
      const hx = dir === 'left' ? x - 6 : dir === 'right' ? x + 6 : x + 5, hyy = by - 4 + (dir === 'up' ? -4 : 0);
      c.save(); c.translate(hx, hyy); c.rotate(a); emoji(c, o.tool, 0, -4, 9); c.restore();
    }
  }

  // ---------- pets ----------
  function drawPet(c, x, y, pet, face, t, moving, extra) {
    const sp = G.D.PETS[pet.species]; if (!sp) return;
    const [m, a] = sp.colors[(pet.color || 0) % sp.colors.length];
    x = Math.round(x); y = Math.round(y);
    c.fillStyle = 'rgba(0,0,0,0.2)'; ell(c, x, y, 5, 2);
    const hop = moving ? Math.round(Math.abs(Math.sin(t * 11)) * 1.5) : 0;
    const legPh = moving ? (Math.floor(t * 10) % 2) : 0;
    const wag = Math.sin(t * (moving ? 14 : 5));
    c.save(); c.translate(x, y - hop); if (face < 0) c.scale(-1, 1);
    const d = shade(m, -30), ink = '#2a2030', pink = '#ff9ab0';
    const R = (cc, px, py, w, h) => { c.fillStyle = cc; c.fillRect(px, py, w, h); };
    const blink = (t % 4) < 0.12;
    const eye = (px, py) => R(ink, px, py, 1, blink ? 1 : 2);
    let head = [4, -12];
    switch (sp.arch) {
      case 'cat': case 'fox': case 'fennec': case 'redpanda': {
        R(d, -4 + legPh, -2, 2, 2); R(d, 2 - legPh, -2, 2, 2);
        ell(c, 0, -5, 5, 3, m); ell(c, 1, -4, 3, 1, a);
        if (sp.arch === 'cat') { const tw = Math.round(wag); R(m, -6, -6, 2, 1); R(m, -7, -9 + tw, 1, 3); R(m, -6, -10 + tw, 1, 1); }
        else { ell(c, -7, -7 + Math.round(wag * 0.5), 3, 2, m); R(sp.arch === 'redpanda' ? d : a, -10, -8 + Math.round(wag * 0.5), 2, 2); if (sp.arch === 'redpanda') { R(d, -8, -8, 1, 3); R(d, -6, -8, 1, 3); } }
        ell(c, 4, -9, 4, 3, m);
        const eh = sp.arch === 'fennec' ? 5 : sp.arch === 'fox' ? 3 : 2;
        R(m, 1, -12 - eh, 2, eh + 1); R(m, 5, -12 - eh, 2, eh + 1); R(sp.arch === 'redpanda' ? a : pink, 1, -11 - eh + 1, 1, eh - 1); R(sp.arch === 'redpanda' ? a : pink, 5, -11 - eh + 1, 1, eh - 1);
        R(a, 5, -8, 3, 2); if (sp.arch === 'redpanda') { R(a, 2, -10, 2, 1); R(a, 6, -11, 1, 1); }
        eye(6, -10); R(pink, 8, -8, 1, 1);
        head = [4, -13 - (sp.arch === 'fennec' ? 3 : 0)];
        break;
      }
      case 'dog': {
        R(d, -4 + legPh, -2, 2, 2); R(d, 2 - legPh, -2, 2, 2);
        ell(c, 0, -5, 5, 3, m); ell(c, 1, -4, 3, 1, a);
        R(m, -6, -8 + Math.round(wag), 1, 3); R(m, -5, -6, 1, 1);
        ell(c, 5, -9, 4, 3, m); R(a, 7, -9, 3, 3); R(ink, 9, -9, 1, 1); R(pink, 8, -6, 2, 1);
        R(d, 2, -12, 2, 5); eye(6, -11); head = [5, -13];
        break;
      }
      case 'otter': {
        R(d, -4 + legPh, -2, 2, 2); R(d, 2 - legPh, -2, 2, 2);
        ell(c, 0, -4, 6, 2, m); R(m, -9, -4 + Math.round(wag * 0.5), 4, 2); R(m, -11, -3, 2, 1);
        ell(c, 6, -7, 3, 3, m); R(a, 7, -6, 3, 2); R(ink, 9, -6, 1, 1); R(d, 4, -10, 2, 1); eye(7, -8); head = [6, -10];
        break;
      }
      case 'capybara': {
        R(d, -4 + legPh, -2, 2, 2); R(d, 3 - legPh, -2, 2, 2);
        ell(c, 0, -5, 6, 4, m); R(m, 4, -10, 5, 6); R(a, 7, -8, 3, 4); R(d, 4, -11, 2, 1); R(ink, 6, -9, 1, 1); R(ink, 9, -7, 1, 1);
        head = [6, -12];
        break;
      }
      case 'bunny': {
        ell(c, 0, -4, 4, 3, m); R('#ffffff', -5, -6, 2, 2);
        ell(c, 3, -8, 3, 3, m); R(m, 1, -15 + (moving ? 0 : Math.round(wag * 0.3)), 2, 6); R(m, 4, -15, 2, 6); R(a, 1, -14, 1, 4); R(a, 4, -14, 1, 4);
        eye(4, -9); R(pink, 6, -7, 1, 1); R(d, -2 + legPh, -1, 2, 1); R(d, 2, -1, 3, 1); head = [3, -15];
        break;
      }
      case 'hedgehog': {
        R(ink, -3 + legPh, -1, 2, 1); R(ink, 2 - legPh, -1, 2, 1);
        ell(c, 0, -4, 6, 4, d); for (let i = -5; i <= 3; i += 2) R(shade(d, -20), i, -8 + (i % 4 === 0 ? 0 : 1), 1, 2);
        ell(c, 5, -3, 3, 2, a); R(ink, 8, -4, 1, 1); eye(5, -5); head = [1, -9];
        break;
      }
      case 'penguin': {
        const sway = moving ? Math.round(Math.sin(t * 10)) : 0;
        c.translate(sway, 0);
        R('#ffa030', -3 + legPh, -1, 2, 1); R('#ffa030', 1 - legPh, -1, 2, 1);
        ell(c, 0, -7, 4, 6, m); ell(c, 1, -6, 3, 5, a); R(d, -4, -9, 1, 4);
        eye(2, -11); R('#ffa030', 4, -10, 2, 1); head = [1, -15];
        break;
      }
      case 'frog': {
        R(d, -5, -1, 3, 1); R(d, 3, -1, 3, 1);
        ell(c, 0, -3, 5, 3, m); ell(c, 1, -2, 3, 1, a);
        ell(c, 1, -6, 2, 2, m); ell(c, 4, -6, 2, 2, m); R('#ffffff', 0, -7, 2, 2); R('#ffffff', 3, -7, 2, 2); R(ink, 1, -7, 1, blink ? 1 : 2); R(ink, 4, -7, 1, blink ? 1 : 2);
        R(pink, 4, -3, 2, 1); head = [2, -9];
        break;
      }
      case 'axolotl': {
        R(d, -3 + legPh, -1, 1, 1); R(d, 2 - legPh, -1, 1, 1);
        ell(c, -1, -3, 5, 2, m); R(a, -9, -4 + Math.round(wag * 0.6), 4, 2); R(m, -7, -3, 2, 1);
        ell(c, 5, -4, 3, 3, m);
        R(a, 2, -8, 1, 2); R(a, 3, -9, 1, 2); R(a, 6, -9, 1, 2); R(a, 7, -8, 1, 2);
        eye(6, -5); R(ink, 7, -3, 2, 1); head = [5, -9];
        break;
      }
      case 'lizard': {
        R(d, -3 + legPh, -1, 2, 1); R(d, 2 - legPh, -1, 2, 1);
        ell(c, 0, -3, 5, 2, m); R(m, -9, -3 + Math.round(wag * 0.5), 5, 1); R(m, -7, -4, 3, 1); R(m, -11, -2, 2, 1);
        ell(c, 5, -4, 3, 2, m); R(a, -2, -4, 1, 1); R(a, 1, -5, 1, 1); R(a, -4, -3, 1, 1); eye(6, -5); head = [5, -7];
        break;
      }
    }
    c.restore();
    if (pet.acc && G.D.ITEMS[pet.acc]) { const it = G.D.ITEMS[pet.acc]; emoji(c, it.icon, x + face * head[0], y - hop + head[1], 6, it.f); }
    if (extra && extra.hearts) emoji(c, '💗', x, y - 18 - (extra.hearts * 6), 7);
  }
  function drawGlimmer(c, x, y, kind, t, scale) {
    const g = G.D.GLIMMERS[kind]; if (!g) return;
    const s = scale || 1;
    const bob = Math.sin(t * 3) * 2;
    y += bob;
    const grd = c.createRadialGradient(x, y, 0, x, y, 9 * s);
    grd.addColorStop(0, g.glow + 'aa'); grd.addColorStop(1, g.glow + '00');
    c.fillStyle = grd; c.beginPath(); c.arc(x, y, 9 * s, 0, 6.3); c.fill();
    const fl = Math.abs(Math.sin(t * 12));
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath(); c.ellipse(x - 4 * s, y - 1, 2.5 * s, (1 + fl) * s, -0.5, 0, 6.3); c.fill();
    c.beginPath(); c.ellipse(x + 4 * s, y - 1, 2.5 * s, (1 + fl) * s, 0.5, 0, 6.3); c.fill();
    c.fillStyle = g.color; c.beginPath(); c.arc(x, y, 3.2 * s, 0, 6.3); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x - 1 * s, y - 1.2 * s, 1 * s, 0, 6.3); c.fill();
    c.fillStyle = '#2a2030'; c.fillRect(x - 1.5 * s, y, 0.7 * s, 1 * s); c.fillRect(x + 0.8 * s, y, 0.7 * s, 1 * s);
    c.fillStyle = g.color;
    switch (kind) {
      case 'meadow': c.fillStyle = '#4ab83a'; c.beginPath(); c.ellipse(x + 1, y - 4 * s, 1.5 * s, 0.8 * s, -0.6, 0, 6.3); c.fill(); break;
      case 'coast': c.beginPath(); c.moveTo(x - 1.5 * s, y - 2.5 * s); c.lineTo(x, y - 5.5 * s); c.lineTo(x + 1.5 * s, y - 2.5 * s); c.fill(); break;
      case 'snow': c.fillStyle = '#ffffff'; c.fillRect(x - 0.4, y - 6 * s, 0.8, 3 * s); c.fillRect(x - 1.5 * s, y - 4.8 * s, 3 * s, 0.8); break;
      case 'mushroom': c.fillStyle = '#e86aa8'; c.beginPath(); c.ellipse(x, y - 3.2 * s, 3 * s, 1.5 * s, 0, Math.PI, 0); c.fill(); break;
      case 'jungle': c.fillStyle = '#ffd0ea'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + Math.cos(i * 1.57 + t) * 1.6 * s, y - 4 * s + Math.sin(i * 1.57 + t) * 1.2, 0.9 * s, 0, 6.3); c.fill(); } break;
      case 'volcano': c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(x - 1.5 * s, y - 2.5 * s); c.quadraticCurveTo(x, y - 7 * s - fl, x + 1.5 * s, y - 2.5 * s); c.fill(); break;
      case 'desert': c.strokeStyle = '#ffd23a'; c.lineWidth = 0.6; for (let i = 0; i < 6; i++) { const a = i * 1.047 + t; c.beginPath(); c.moveTo(x + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s); c.lineTo(x + Math.cos(a) * 5.5 * s, y + Math.sin(a) * 5.5 * s); c.stroke(); } break;
    }
  }
  function drawEnemy(c, e, t) {
    const x = Math.round(e.x), y = Math.round(e.y), d = G.D.ENEMIES[e.kind], col = d.color;
    const flash = e.hurt > 0 && Math.floor(e.hurt * 20) % 2 === 0;
    c.fillStyle = 'rgba(0,0,0,0.22)'; ell(c, x, y, 5, 2);
    const cc = flash ? '#ffffff' : col, dk = flash ? '#ffffff' : shade(col, -40), ink = '#1a1420';
    const sq = Math.sin(t * 8 + e.seed) * 1;
    switch (e.kind) {
      case 'slime': case 'tideslime': case 'magma':
        ell(c, x, y - 4, 6 + sq, 4 - sq * 0.5, dk); ell(c, x, y - 5, 5 + sq, 4 - sq * 0.5, cc); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x - 3, y - 8, 2, 1);
        c.fillStyle = ink; c.fillRect(x - 2, y - 6, 1, 2); c.fillRect(x + 2, y - 6, 1, 2); break;
      case 'puff':
        ell(c, x, y - 6, 5, 5, dk); ell(c, x, y - 7, 5, 4, cc); c.fillStyle = '#efe6d8'; c.fillRect(x - 3, y - 9, 2, 2); c.fillRect(x + 2, y - 10, 2, 1);
        c.fillStyle = ink; c.fillRect(x - 2, y - 6, 1, 1); c.fillRect(x + 2, y - 6, 1, 1); break;
      case 'bat': {
        const fy = y - 12 + Math.sin(t * 6 + e.seed) * 2, w = Math.abs(Math.sin(t * 16)) * 3;
        c.fillStyle = dk; c.fillRect(x - 7, fy - 1 - w, 5, 2); c.fillRect(x + 2, fy - 1 - w, 5, 2);
        ell(c, x, fy, 3, 3, cc); c.fillStyle = ink; c.fillRect(x - 2, fy - 1, 1, 1); c.fillRect(x + 1, fy - 1, 1, 1);
        c.fillStyle = 'rgba(0,0,0,0.15)'; ell(c, x, y, 3, 1); break;
      }
      case 'spider': {
        c.fillStyle = dk; for (let i = 0; i < 4; i++) { const ly = y - 6 + i * 1.5, k = Math.sin(t * 14 + i) > 0 ? 1 : 0; c.fillRect(x - 7, ly + k, 4, 1); c.fillRect(x + 3, ly + 1 - k, 4, 1); }
        ell(c, x, y - 5, 4, 3, cc); ell(c, x, y - 8, 2, 2, cc); c.fillStyle = '#ff5a5a'; c.fillRect(x - 1, y - 9, 1, 1); c.fillRect(x + 1, y - 9, 1, 1); break;
      }
      case 'scorpion': {
        ell(c, x, y - 3, 5, 2, cc); c.fillStyle = dk; c.fillRect(x - 5, y - 2, 2, 1); c.fillRect(x + 3, y - 2, 2, 1);
        c.fillStyle = cc; for (let i = 0; i < 5; i++) c.fillRect(x - 5 - (i < 3 ? i : 2), y - 4 - i * 2, 2, 2); c.fillStyle = '#5a2a1a'; c.fillRect(x - 5, y - 13, 2, 2);
        c.fillStyle = cc; c.fillRect(x + 5, y - 5, 3, 2); c.fillStyle = ink; c.fillRect(x + 1, y - 4, 1, 1); break;
      }
      case 'golem': {
        c.fillStyle = dk; c.fillRect(x - 5, y - 3, 3, 3); c.fillRect(x + 2, y - 3, 3, 3);
        c.fillStyle = cc; c.fillRect(x - 6, y - 12, 12, 10); c.fillStyle = shade(col, 20); c.fillRect(x - 6, y - 12, 12, 2);
        c.fillStyle = dk; c.fillRect(x - 8, y - 10, 2, 6); c.fillRect(x + 6, y - 10, 2, 6);
        c.fillStyle = '#6ff0ff'; c.fillRect(x - 3, y - 9, 2, 2); c.fillRect(x + 1, y - 9, 2, 2); break;
      }
    }
    if (e.hp < e.maxHp) { c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(x - 6, y - 17, 12, 2); c.fillStyle = '#ff6a6a'; c.fillRect(x - 6, y - 17, Math.round(12 * e.hp / e.maxHp), 2); }
  }

  return {
    T, SOLID, isWater, isWall, TCOL, TEMPLE_PAL, CH, chunk, tileCanvas, treeSprite, rockSprite, bushSprite, staticSprite, buildingSprite, WINDOWS,
    templeSprite, caveSprite, lighthouseSprite, emoji, emojiCanvas, drawHuman, drawPet, drawGlimmer, drawEnemy, lookObj, ell, shade, mk, BSTYLE, ROCK_TINT,
  };
})();
