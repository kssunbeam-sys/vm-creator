'use strict';
// Maps and world generation: the overworld island, the player's home, temples and caves.
(() => {
  const U = G.U, D = G.D, A = G.Art, T = A.T;

  class GMap {
    constructor(id, W, H, kind) {
      this.id = id; this.W = W; this.H = H; this.kind = kind;
      this.tiles = new Uint8Array(W * H);
      this.grid = new Int32Array(W * H).fill(-1);
      this.objs = []; this.buckets = new Map(); this.chunks = new Map();
      this.oob = T.VOID; this.dark = 0; this.pal = null; this.seed = 1;
      this.biome = null; this.lights = [];
    }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
    tile(x, y) { return this.inb(x, y) ? this.tiles[y * this.W + x] : this.oob; }
    set(x, y, t) {
      if (!this.inb(x, y)) return;
      this.tiles[y * this.W + x] = t;
      if (this.chunks.size) { const cx = Math.floor(x / A.CH), cy = Math.floor(y / A.CH); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.chunks.delete((cx + dx) + ',' + (cy + dy)); }
    }
    add(o) {
      o.id = this.objs.length; o.w = o.w || 1; o.h = o.h || 1;
      this.objs.push(o); this.place(o); return o;
    }
    place(o) {
      for (let dy = 0; dy < o.h; dy++) for (let dx = 0; dx < o.w; dx++) if (this.inb(o.x + dx, o.y + dy)) this.grid[(o.y + dy) * this.W + o.x + dx] = o.id;
      const k = (o.x >> 3) + ',' + (o.y >> 3);
      let b = this.buckets.get(k); if (!b) this.buckets.set(k, (b = [])); b.push(o.id);
    }
    unplace(o) {
      for (let dy = 0; dy < o.h; dy++) for (let dx = 0; dx < o.w; dx++) if (this.inb(o.x + dx, o.y + dy) && this.grid[(o.y + dy) * this.W + o.x + dx] === o.id) this.grid[(o.y + dy) * this.W + o.x + dx] = -1;
      const b = this.buckets.get((o.x >> 3) + ',' + (o.y >> 3)); if (b) { const i = b.indexOf(o.id); if (i >= 0) b.splice(i, 1); }
    }
    remove(o) { if (!o.gone) { o.gone = true; this.unplace(o); } }
    restore(o) { if (o.gone) { o.gone = false; this.place(o); } }
    move(o, nx, ny) { this.unplace(o); o.x = nx; o.y = ny; this.place(o); }
    objAt(x, y) { if (!this.inb(x, y)) return null; const i = this.grid[y * this.W + x]; return i >= 0 ? this.objs[i] : null; }
    solid(x, y) {
      const t = this.tile(x, y);
      if (A.SOLID[t]) return true;
      const o = this.objAt(x, y);
      return !!(o && o.solid);
    }
    objsIn(x0, y0, x1, y1) {
      const out = [];
      for (let by = (y0 >> 3) - 1; by <= (y1 >> 3) + 1; by++) for (let bx = (x0 >> 3) - 1; bx <= (x1 >> 3) + 1; bx++) {
        const b = this.buckets.get(bx + ',' + by); if (b) for (const id of b) out.push(this.objs[id]);
      }
      return out;
    }
  }
  G.GMap = GMap;

  // Static per-type info used by gameplay + rendering
  G.OBJ = {
    tree: { solid: 1, respawn: 2 }, rock: { solid: 1, respawn: 3 }, bush: { solid: 1, respawn: 2 }, grass: { solid: 0, respawn: 1 },
    forage: { solid: 0, respawn: 2 }, dig: { solid: 0, respawn: 2 }, fish: { solid: 0, respawn: 1 }, chest: { solid: 1, respawn: -1 },
    waystone: { solid: 1 }, building: { solid: 1 }, temple: { solid: 1 }, cave: { solid: 1 }, lamp: { solid: 1 }, bench: { solid: 1 },
    board: { solid: 1 }, sign: { solid: 1 }, fountain: { solid: 1 }, deco: { solid: 1 }, station: { solid: 1 }, furniture: { solid: 1 },
    exit: { solid: 0 }, block: { solid: 1 }, plate: { solid: 0 }, gate: { solid: 1 }, brazier: { solid: 1 }, crystal: { solid: 1 },
    pot: { solid: 1 }, altar: { solid: 1 }, rune: { solid: 0 }, ladder_down: { solid: 0 }, ladder_up: { solid: 0 }, torch: { solid: 0 },
    crack: { solid: 1 }, boat: { solid: 1 },
  };
  function mkObj(type, x, y, extra) { return Object.assign({ type, x, y, solid: G.OBJ[type] ? G.OBJ[type].solid : 1 }, extra || {}); }
  G.mkObj = mkObj;

  // ---------------- A* ----------------
  function astar(map, sx, sy, ex, ey, costFn) {
    const W = map.W, H = map.H, N = W * H;
    const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = [], hk = [];
    const push = (i, f) => { heap.push(i); hk.push(f); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hk[p] <= hk[c]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; [hk[p], hk[c]] = [hk[c], hk[p]]; c = p; } };
    const pop = () => {
      const top = heap[0], li = heap.pop(), lk = hk.pop();
      if (heap.length) { heap[0] = li; hk[0] = lk; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && hk[l] < hk[m]) m = l; if (r < heap.length && hk[r] < hk[m]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; [hk[m], hk[c]] = [hk[c], hk[m]]; c = m; } }
      return top;
    };
    const s = sy * W + sx, e = ey * W + ex;
    g[s] = 0; push(s, 0);
    while (heap.length) {
      const cur = pop(); if (cur === e) break; if (closed[cur]) continue; closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 1 || ny < 1 || nx >= W - 2 || ny >= H - 2) continue;
        const ni = ny * W + nx; if (closed[ni]) continue;
        const c = costFn(nx, ny); if (c >= 999) continue;
        const ng = g[cur] + c;
        if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; push(ni, ng + (Math.abs(nx - ex) + Math.abs(ny - ey)) * 0.9); }
      }
    }
    const path = []; let c = e; if (from[e] < 0 && e !== s) return path;
    while (c >= 0) { path.push([c % W, (c / W) | 0]); if (c === s) break; c = from[c]; }
    return path.reverse();
  }

  // ---------------- overworld ----------------
  const BIOME_GROUND = [T.GRASS, T.SAND, T.SNOW, T.MOSS, T.JGRASS, T.DSAND, T.ASH];
  G.World = {
    genOverworld(seed) {
      const W = 256, H = 208, map = new GMap('overworld', W, H, 'overworld');
      map.seed = seed; map.oob = T.DEEP;
      const r = U.rng(seed);
      const biome = map.biome = new Uint8Array(W * H);
      const town = map.town = new Uint8Array(W * H);
      const sites = D.BIOMES.map((b) => [b.site[0] * W + (r() - 0.5) * 8, b.site[1] * H + (r() - 0.5) * 6]);
      map.sites = sites;
      // ---- terrain
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = (x / W - 0.5) * 2, dy = (y / H - 0.5) * 2, d2 = dx * dx + dy * dy;
        const e = U.fbm(x / 28, y / 28, seed, 4) * 0.55 + 1.0 - d2 * 1.15;
        const wx = x + (U.fbm(x / 20, y / 20, seed + 50, 3) - 0.5) * 30, wy = y + (U.fbm(x / 20, y / 20, seed + 60, 3) - 0.5) * 30;
        let best = 0, bd = 1e9;
        for (let i = 0; i < sites.length; i++) { const dd = (wx - sites[i][0]) ** 2 + (wy - sites[i][1]) ** 2 * 1.2; if (dd < bd) { bd = dd; best = i; } }
        biome[y * W + x] = best;
        map.tiles[y * W + x] = e > 0.56 ? BIOME_GROUND[best] : T.DEEP;
      }
      // coast biome: grassy dunes
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (biome[i] === 1 && map.tiles[i] === T.SAND && U.fbm(x / 10, y / 10, seed + 70, 3) > 0.56) map.tiles[i] = T.GRASS;
      }
      // ---- lakes & rivers
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (map.tiles[i] === T.DEEP) continue;
        const b = biome[i], n2 = U.fbm(x / 13, y / 13, seed + 200, 3);
        const rv = Math.abs(U.fbm(x / 55, y / 55, seed + 300, 3) - 0.5);
        if (n2 > 0.69) {
          if (b === 2) map.tiles[i] = n2 > 0.74 ? T.WATER : T.ICE;
          else if (b === 6) map.tiles[i] = n2 > 0.725 ? T.LAVA : T.HOT;
          else if (b === 5) { if (n2 > 0.76) map.tiles[i] = T.WATER; }
          else map.tiles[i] = T.WATER;
        } else if (rv < 0.011 && b !== 5 && b !== 6) map.tiles[i] = b === 2 ? T.ICE : T.WATER;
      }
      // ---- ocean flood from border, beaches, depth
      const ocean = new Uint8Array(W * H), q = [];
      for (let x = 0; x < W; x++) { q.push(x, (H - 1) * W + x); }
      for (let y = 0; y < H; y++) { q.push(y * W, y * W + W - 1); }
      for (const i of q) ocean[i] = 1;
      for (let qi = 0; qi < q.length; qi++) {
        const i = q[qi], x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx; if (ocean[ni]) continue;
          const t = map.tiles[ni]; if (t === T.DEEP || t === T.WATER) { ocean[ni] = 1; q.push(ni); }
        }
      }
      const distOcean = new Uint8Array(W * H).fill(255), dq = [];
      for (let i = 0; i < W * H; i++) if (ocean[i]) { distOcean[i] = 0; dq.push(i); map.tiles[i] = T.DEEP; }
      for (let qi = 0; qi < dq.length; qi++) {
        const i = dq[qi], x = i % W, y = (i / W) | 0, d = distOcean[i]; if (d >= 4) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx; if (distOcean[ni] <= d + 1) continue; distOcean[ni] = d + 1; dq.push(ni);
        }
      }
      // shallow water near land; beaches
      const distLand = new Uint8Array(W * H).fill(255), lq = [];
      for (let i = 0; i < W * H; i++) if (!ocean[i]) { distLand[i] = 0; lq.push(i); }
      for (let qi = 0; qi < lq.length; qi++) {
        const i = lq[qi], x = i % W, y = (i / W) | 0, d = distLand[i]; if (d >= 3) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx; if (distLand[ni] <= d + 1) continue; distLand[ni] = d + 1; lq.push(ni);
        }
      }
      for (let i = 0; i < W * H; i++) {
        if (ocean[i] && distLand[i] <= 2) map.tiles[i] = T.WATER;
        if (!ocean[i] && distOcean[i] <= 2) {
          const b = biome[i], t = map.tiles[i];
          if (t === T.WATER || t === T.ICE || t === T.LAVA || t === T.HOT) continue;
          map.tiles[i] = b === 2 ? T.SNOW : b === 6 ? T.ASH : b === 5 ? T.DSAND : T.SAND;
        }
      }
      map.ocean = ocean;
      // ---- towns
      const TBX = 20, TBY = 15;
      map.towns = {};
      D.TOWN_ORDER.forEach((id, ti) => {
        const td = D.TOWNS[id], bi = td.biome;
        let cx = Math.round(sites[bi][0]), cy = Math.round(sites[bi][1]);
        // nudge toward island centre if too much water
        for (let k = 0; k < 30; k++) {
          let land = 0, tot = 0;
          for (let y = cy - TBY; y <= cy + TBY; y += 2) for (let x = cx - TBX; x <= cx + TBX; x += 2) { tot++; if (map.tile(x, y) !== T.DEEP) land++; }
          if (land / tot > (id === 'coralcove' ? 0.6 : 0.85)) break;
          cx += Math.sign(W / 2 - cx); cy += Math.sign(H / 2 - cy);
        }
        const g = BIOME_GROUND[bi];
        for (let y = cy - TBY; y <= cy + TBY; y++) for (let x = cx - TBX; x <= cx + TBX; x++) {
          const i = y * W + x; town[i] = ti + 1;
          const t = map.tiles[i];
          if (t === T.DEEP || t === T.WATER || t === T.LAVA || t === T.HOT || t === T.ICE || A.SOLID[t]) map.tiles[i] = g === T.SAND ? T.GRASS : g;
          if (map.tiles[i] === T.SAND || map.tiles[i] === T.DSAND) map.tiles[i] = bi === 1 ? T.GRASS : g;
        }
        for (let y = cy - TBY - 3; y <= cy + TBY + 3; y++) for (let x = cx - TBX - 3; x <= cx + TBX + 3; x++) if (map.inb(x, y) && !town[y * W + x]) town[y * W + x] = 100 + ti;
        // plaza, main street and lanes (cobble); the rest of town stays grassy
        const cob = (x, y) => { if (map.inb(cx + x, cy + y)) map.set(cx + x, cy + y, T.COBBLE); };
        for (let y = -6; y <= 4; y++) for (let x = -10; x <= 10; x++) if ((x * x) / 100 + ((y + 1) * (y + 1)) / 25 <= 1) cob(x, y);
        for (let x = -TBX - 1; x <= TBX + 1; x++) { cob(x, -1); cob(x, 0); }
        for (let y = -TBY - 1; y <= -6; y++) { cob(0, y); cob(1, y); }
        for (let y = 4; y <= TBY + 1; y++) { cob(0, y); cob(1, y); }
        for (let x = -16; x <= 17; x++) { cob(x, 10); cob(x, 11); }
        map.towns[id] = { id, cx, cy, ti, biome: bi, name: td.name, exits: { N: [cx, cy - TBY - 1], S: [cx, cy + TBY + 1], W: [cx - TBX - 1, cy - 1], E: [cx + TBX + 1, cy - 1] } };
      });
      // ---- roads
      const isTownCore = (x, y) => { const t = town[y * W + x]; return t > 0 && t < 100; };
      const roadCost = (x, y) => {
        if (isTownCore(x, y)) return 999;
        const t = map.tiles[y * W + x];
        if (t === T.PATH || t === T.BRIDGE) return 0.6;
        if (t === T.DEEP) return ocean[y * W + x] && distLand[y * W + x] > 1 ? 999 : 12;
        if (t === T.WATER || t === T.HOT) return 7;
        if (t === T.LAVA) return 9;
        return 1 + U.hash(x, y, seed + 9) * 0.15;
      };
      const paint = (path) => {
        for (const [x, y] of path) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const nx = x + dx, ny = y + dy; if (!map.inb(nx, ny) || isTownCore(nx, ny)) continue;
          const t = map.tile(nx, ny);
          if (t === T.COBBLE) continue;
          map.set(nx, ny, (t === T.DEEP || t === T.WATER || t === T.LAVA || t === T.HOT) ? T.BRIDGE : T.PATH);
        }
      };
      const exitToward = (A1, B1) => {
        const dx = B1.cx - A1.cx, dy = B1.cy - A1.cy;
        return Math.abs(dx) * 0.75 > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
      };
      const usedExits = {};
      const road = (a, b) => {
        const A1 = map.towns[a], B1 = map.towns[b];
        const ea = exitToward(A1, B1), eb = exitToward(B1, A1);
        (usedExits[a] = usedExits[a] || {})[ea] = 1; (usedExits[b] = usedExits[b] || {})[eb] = 1;
        const [sx, sy] = A1.exits[ea], [ex, ey] = B1.exits[eb];
        paint(astar(map, sx, sy, ex, ey, roadCost));
      };
      for (const id of D.TOWN_ORDER.slice(1)) road('willowmere', id);
      const ring = ['coralcove', 'frostbell', 'mosslight', 'canopy', 'emberforge', 'sunspire'];
      for (let i = 0; i < ring.length; i++) road(ring[i], ring[(i + 1) % ring.length]);
      // connect used exits to plaza
      for (const id in usedExits) {
        const tw = map.towns[id];
        for (const e in usedExits[id]) {
          const [ex, ey] = tw.exits[e];
          const dx = Math.sign(tw.cx - ex), dy = Math.sign(tw.cy - ey);
          let x = ex, y = ey;
          for (let k = 0; k < 30; k++) {
            if (map.tile(x, y) === T.COBBLE && map.tile(x + 1, y + 1) === T.COBBLE) break;
            for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (map.tile(x + ox, y + oy) !== T.COBBLE) map.set(x + ox, y + oy, T.PATH);
            x += dx; y += dy;
          }
        }
      }
      // ---- town objects
      const BPOS = [[-17, -11], [-8, -11], [3, -11], [12, -11], [-17, 6], [-8, 6], [3, 6], [12, 6]];
      map.npcSpots = [];
      map.homeDoor = null;
      const TREE_OF = ['oak', 'palm', 'pine', 'mush', 'jungle', 'cactus', 'ash'];
      D.TOWN_ORDER.forEach((id, ti) => {
        const td = D.TOWNS[id], tw = map.towns[id], { cx, cy } = tw, bkey = D.BIOME_KEYS[td.biome];
        const cob = (x, y) => map.set(cx + x, cy + y, T.COBBLE);
        td.buildings.forEach((b, i) => {
          const [bx, by] = BPOS[i];
          let o;
          if (b.kind === 'lighthouse') o = map.add(mkObj('building', cx + bx + 1, cy + by + 1, { w: 3, h: 2, kind: 'lighthouse', label: b.label, npc: b.npc, door: [cx + bx + 2, cy + by + 2], town: id }));
          else o = map.add(mkObj('building', cx + bx, cy + by, { w: 5, h: 3, kind: b.kind, label: b.label, npc: b.npc, sign: b.sign, inn: b.inn, style: b.kind === 'home' ? 'home' : bkey, v: (i + ti) % 5, door: [cx + bx + 2, cy + by + 2], town: id }));
          const dx = o.door[0] - cx, dy = o.door[1] - cy;
          if (dy < 0) for (let y = dy + 1; y <= -2; y++) cob(dx, y); else cob(dx, dy + 1);
          if (b.kind === 'home') map.homeDoor = [o.door[0], o.door[1]];
          if (b.npc) map.npcSpots.push({ npc: b.npc, x: o.door[0], y: o.door[1] + 1, shop: b.kind === 'shop' || b.kind === 'lighthouse', town: id });
        });
        if (bkey === 'desert') {
          // an oasis pond (with fish!) instead of a fountain
          for (let y = -5; y <= -3; y++) for (let x = -3; x <= 3; x++) if ((x * x) / 12 + ((y + 4) * (y + 4)) / 1.6 <= 1) map.set(cx + x, cy + y, T.WATER);
          map.add(mkObj('fish', cx, cy - 4, { biome: 'desert' }));
          map.add(mkObj('tree', cx - 5, cy - 5, { kind: 'palm', v: 0, biome: 'coast' })); map.add(mkObj('tree', cx + 5, cy - 5, { kind: 'palm', v: 1, biome: 'coast' }));
        } else map.add(mkObj('fountain', cx - 1, cy - 4, { w: 3, h: 2, style: { snow: 'xtree', mushroom: 'gmush', jungle: 'totem', volcano: 'anvil', coast: 'anchor' }[bkey] || null }));
        tw.waystone = [cx + 4, cy + 2];
        map.add(mkObj('waystone', cx + 4, cy + 2, { ws: id, label: td.name + ' Waystone' }));
        map.add(mkObj('board', cx - 4, cy + 2, { town: id }));
        map.add(mkObj('sign', cx - 9, cy - 3, { text: td.name + ': ' + td.desc }));
        map.add(mkObj('bench', cx - 4, cy - 4)); map.add(mkObj('bench', cx + 4, cy - 4));
        for (const [lx, ly] of [[-11, -2], [11, -2], [-11, 1], [11, 1], [-2, -7], [3, -7], [-2, 12], [3, 12]]) map.add(mkObj('lamp', cx + lx, cy + ly));
        for (const fx of [-3, 3]) map.add(mkObj('deco', cx + fx, cy + 4, { spr: bkey === 'snow' ? 'snowpile' : 'flowerbed' }));
        (td.stations || []).forEach((s, i) => map.add(mkObj('station', cx + (i ? 7 : -7), cy + 2, { station: D.ITEMS[s].station, item: s })));
        (td.wanderers || []).forEach((n) => map.npcSpots.push({ npc: n, x: cx + 6, y: cy + 1, town: id }));
        for (const [tx, ty] of [[-19, -14], [19, -14], [-20, 4], [20, 4], [-19, 14], [19, 14], [-11, 14], [12, 14], [-6, -14], [7, -14]]) {
          const x = cx + tx, y = cy + ty;
          if (map.inb(x, y) && !map.objAt(x, y) && A.GROUND_OK(map.tile(x, y)) && map.tile(x, y) !== T.PATH) map.add(mkObj('tree', x, y, { kind: TREE_OF[td.biome], v: (tx + ty) & 1, biome: bkey }));
        }
        if (id === 'coralcove') {
          // the main street runs west onto a wooden pier
          let x = cx - TBX - 2, wet = 0;
          for (; x > 2 && wet < 8; x--) { for (const yy of [cy - 1, cy]) { const tt = map.tile(x, yy); if (tt === T.DEEP || tt === T.WATER) { map.set(x, yy, T.BRIDGE); } else if (!map.objAt(x, yy)) map.set(x, yy, T.PATH); } if (A.isWater(map.tile(x, cy + 1)) || map.tile(x, cy) === T.BRIDGE) wet++; }
          tw.pier = [x + 1, cy];
          const bx = x + 3; if (A.isWater(map.tile(bx, cy + 2)) && A.isWater(map.tile(bx + 1, cy + 2))) map.add(mkObj('boat', bx, cy + 2, { w: 2, solid: 1 }));
        }
      });
      // ---- temples & caves
      map.places = {};
      const free = (x0, y0, w, h) => {
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
          if (!map.inb(x, y) || x < 3 || y < 3 || x > W - 4 || y > H - 4) return false;
          const t = map.tile(x, y); if (A.SOLID[t] || t === T.PATH || t === T.BRIDGE || t === T.COBBLE || t === T.ICE) return false;
          if (town[y * W + x]) return false; if (map.objAt(x, y)) return false;
        }
        return true;
      };
      const nearestExit = (tx, ty, tw) => {
        let best = null, bd = 1e9;
        for (const e in tw.exits) { const [ex, ey] = tw.exits[e]; const d = Math.abs(ex - tx) + Math.abs(ey - ty); if (d < bd) { bd = d; best = tw.exits[e]; } }
        return best;
      };
      // find a free, reachable spot (a road to town must be buildable)
      const placeSite = (tw, minD, maxD, angOff) => {
        const base = Math.atan2(tw.cy - H / 2, tw.cx - W / 2) + angOff;
        for (let tries = 0; tries < 500; tries++) {
          const a = base + (r() - 0.5) * (tries < 200 ? 1.6 : 6.2), d = minD + r() * (maxD - minD + tries * 0.05);
          const x = Math.round(tw.cx + Math.cos(a) * d * 1.1), y = Math.round(tw.cy + Math.sin(a) * d);
          if (!map.inb(x, y) || (tries < 350 && biome[y * W + x] !== tw.biome)) continue;
          if (!free(x - 3, y - 4, 7, 7)) continue;
          const ex = nearestExit(x, y + 1, tw), path = astar(map, x, y + 1, ex[0], ex[1], roadCost);
          if (path.length) return [x, y, path, ex];
        }
        return null;
      };
      const connect = (path, ex, tw) => {
        paint(path);
        const [x0, y0] = ex, dx = Math.sign(tw.cx - x0), dy = Math.sign(tw.cy - y0);
        let x = x0, y = y0;
        for (let k = 0; k < 30; k++) { if (map.tile(x, y) === T.COBBLE && map.tile(x + 1, y + 1) === T.COBBLE) break; for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (map.tile(x + ox, y + oy) !== T.COBBLE) map.set(x + ox, y + oy, T.PATH); x += dx; y += dy; }
      };
      const apron = (x0, x1, y0, y1) => { for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) map.set(xx, yy, T.PATH); };
      D.TOWN_ORDER.forEach((id) => {
        const td = D.TOWNS[id], tw = map.towns[id], bkey = D.BIOME_KEYS[td.biome], g = BIOME_GROUND[td.biome];
        const gr = g === T.SAND ? T.GRASS : g;
        let p = placeSite(tw, 26, 34, 0.4);
        if (p) {
          const [x, y, path, ex] = p;
          for (let yy = y - 4; yy <= y + 2; yy++) for (let xx = x - 3; xx <= x + 3; xx++) map.set(xx, yy, gr);
          const o = map.add(mkObj('temple', x - 2, y - 2, { w: 5, h: 3, biome: bkey, label: td.temple, door: [x, y] }));
          map.places['temple_' + bkey] = { x, y: y + 1, name: td.temple, obj: o.id };
          apron(x - 1, x + 3, y + 1, y + 2);
          map.add(mkObj('waystone', x + 3, y + 1, { ws: 'temple_' + bkey, label: td.temple + ' Waystone' }));
          connect(path, ex, tw);
        }
        if (td.cave) {
          p = placeSite(tw, 18, 26, -1.3);
          if (p) {
            const [x, y, path, ex] = p;
            for (let yy = y - 3; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 3; xx++) map.set(xx, yy, gr);
            const o = map.add(mkObj('cave', x - 1, y - 1, { w: 3, h: 2, biome: bkey, label: td.cave, door: [x, y], cave: 'cave_' + bkey }));
            map.places['cave_' + bkey] = { x, y: y + 1, name: td.cave, obj: o.id };
            apron(x - 1, x + 2, y + 1, y + 2);
            map.add(mkObj('waystone', x + 2, y + 1, { ws: 'cave_' + bkey, label: td.cave + ' Waystone' }));
            connect(path, ex, tw);
          }
        }
      });
      // ---- lore signs along roads
      let signs = 0;
      for (let k = 0; k < 4000 && signs < D.SIGNS.length; k++) {
        const x = 4 + ((r() * (W - 8)) | 0), y = 4 + ((r() * (H - 8)) | 0);
        if (map.tile(x, y) === T.PATH && !town[y * W + x]) {
          for (const [dx, dy] of [[2, 0], [-1, 0], [0, 2], [0, -1]]) {
            const nx = x + dx, ny = y + dy, t = map.tile(nx, ny);
            if (A.GROUND_OK(t) && t !== T.PATH && !map.objAt(nx, ny) && !town[ny * W + nx]) { map.add(mkObj('sign', nx, ny, { text: D.SIGNS[signs++] })); break; }
          }
        }
      }
      // ---- scatter
      const SC = {
        0: [['tree', 'oak', 0.09, 1], ['rock', 'stone', 0.016], ['rock', 'copper', 0.006], ['rock', 'coal', 0.0015], ['bush', 'berry', 0.01], ['grass', null, 0.035], ['forage', 'daisy', 0.009], ['forage', 'tulip', 0.006], ['forage', 'sunflower', 0.003], ['forage', 'mushroom', 0.003], ['dig', null, 0.005]],
        1: [['tree', 'palm', 0.06], ['rock', 'stone', 0.012], ['rock', 'copper', 0.004], ['forage', 'shell', 0.02, 0, T.SAND], ['forage', 'seaweed', 0.01, 0, T.SAND], ['grass', null, 0.025, 0, T.GRASS], ['bush', 'berry', 0.008, 0, T.GRASS], ['dig', null, 0.005]],
        2: [['tree', 'pine', 0.11, 1], ['rock', 'stone', 0.02], ['rock', 'iron', 0.007], ['rock', 'coal', 0.003], ['bush', 'snowberry', 0.012], ['forage', 'frost_lily', 0.006], ['forage', 'pinecone', 0.006], ['dig', null, 0.005]],
        3: [['tree', 'mush', 0.09, 1], ['rock', 'stone', 0.014], ['rock', 'crystal', 0.005], ['forage', 'glowcap', 0.012], ['forage', 'mushroom', 0.012], ['grass', null, 0.025], ['dig', null, 0.005]],
        4: [['tree', 'jungle', 0.15, 1], ['rock', 'stone', 0.012], ['rock', 'iron', 0.005], ['forage', 'orchid', 0.01], ['grass', null, 0.05], ['bush', 'berry', 0.008], ['dig', null, 0.005]],
        5: [['tree', 'cactus', 0.025], ['rock', 'stone', 0.018], ['rock', 'copper', 0.006], ['rock', 'gold', 0.005], ['forage', 'desert_rose', 0.006], ['dig', null, 0.014]],
        6: [['tree', 'ash', 0.035], ['rock', 'stone', 0.03], ['rock', 'coal', 0.014], ['rock', 'iron', 0.008], ['rock', 'gold', 0.004], ['forage', 'ember_flower', 0.007], ['dig', null, 0.005]],
      };
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
        const i = y * W + x, t = map.tiles[i];
        if (!A.GROUND_OK(t) || t === T.PATH || t === T.ICE || town[i] || map.grid[i] >= 0) continue;
        // keep a little clearance from roads
        if (map.tile(x - 1, y) === T.PATH || map.tile(x + 1, y) === T.PATH || map.tile(x, y + 1) === T.PATH || map.tile(x, y - 1) === T.PATH) continue;
        const b = biome[i], forest = U.clamp((U.fbm(x / 12, y / 12, seed + 77, 3) - 0.36) * 5, 0.15, 2.4);
        let acc = 0; const h = U.hash(x, y, seed + 1234);
        for (const [type, kind, dens, forestMul, onTile] of SC[b]) {
          if (onTile != null && t !== onTile) continue;
          acc += dens * (forestMul ? forest : 1);
          if (h < acc) {
            if (type === 'tree' && b === 1 && t !== T.SAND && U.hash(x, y, 5) < 0.5) break;
            if (type === 'forage') map.add(mkObj('forage', x, y, { item: kind, biome: D.BIOME_KEYS[b] }));
            else map.add(mkObj(type, x, y, { kind, v: (U.hash(x, y, 3) * 3) | 0, biome: D.BIOME_KEYS[b] }));
            break;
          }
        }
      }
      // ---- fishing spots
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
        const t = map.tile(x, y); if (t !== T.WATER && t !== T.HOT) continue;
        let near = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = map.tile(x + dx, y + dy); if (!A.isWater(n) && !A.SOLID[n]) near = true; }
        if (!near || map.objAt(x, y)) continue;
        if (U.hash(x, y, seed + 555) < (town[y * W + x] ? 0.12 : 0.05)) map.add(mkObj('fish', x, y, { biome: D.BIOME_KEYS[biome[y * W + x]] }));
      }
      // ---- what can be reached on foot from Willowmere (trees/rocks count as passable: they can be cleared)
      const reach = new Uint8Array(W * H);
      {
        const st = map.towns.willowmere, q = [st.cy * W + st.cx]; reach[q[0]] = 1;
        const removable = { tree: 1, rock: 1, bush: 1, grass: 1, forage: 1, dig: 1 };
        for (let qi = 0; qi < q.length; qi++) {
          const i = q[qi], x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy; if (!map.inb(nx, ny)) continue;
            const ni = ny * W + nx; if (reach[ni] || A.SOLID[map.tiles[ni]]) continue;
            const o = map.objAt(nx, ny); if (o && o.solid && !removable[o.type]) continue;
            reach[ni] = 1; q.push(ni);
          }
        }
      }
      map.reach = reach;
      const freeReach = (x, y) => free(x - 1, y - 1, 3, 3) && reach[y * W + x];
      // ---- chests & strays
      map.strays = [];
      D.TOWN_ORDER.forEach((id) => {
        const tw = map.towns[id], bkey = D.BIOME_KEYS[tw.biome];
        for (let k = 0; k < 5; k++) {
          for (let tries = 0; tries < 300; tries++) {
            const a = r() * 6.28, d = 14 + r() * 30, x = Math.round(tw.cx + Math.cos(a) * d * 1.2), y = Math.round(tw.cy + Math.sin(a) * d);
            if (!map.inb(x, y) || biome[y * W + x] !== tw.biome || !freeReach(x, y)) continue;
            map.add(mkObj('chest', x, y, { explorer: k >= 3, biome: bkey })); break;
          }
        }
        for (let tries = 0; tries < 400; tries++) {
          const a = r() * 6.28, d = 12 + r() * 18, x = Math.round(tw.cx + Math.cos(a) * d * 1.2), y = Math.round(tw.cy + Math.sin(a) * d);
          if (!map.inb(x, y) || biome[y * W + x] !== tw.biome || !freeReach(x, y)) continue;
          map.strays.push({ biome: bkey, species: D.STRAYS[bkey], x, y }); break;
        }
      });
      return map;
    },

    // ---------------- home ----------------
    genHome(size, furniture) {
      const dims = [[12, 8], [16, 10], [20, 12]][Math.min(2, size)];
      const W = dims[0] + 2, H = dims[1] + 3, map = new GMap('home', W, H, 'home');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const wall = x === 0 || x === W - 1 || y < 2 || y === H - 1;
        map.tiles[y * W + x] = wall ? T.WALL : T.FLOOR;
      }
      const dx = W >> 1;
      map.tiles[(H - 1) * W + dx] = T.FLOOR;
      map.add(mkObj('exit', dx, H - 1, { to: 'overworld' }));
      map.entry = [dx, H - 2];
      for (const f of furniture) map.add(mkObj('furniture', f.x, f.y, { item: f.item, solid: D.ITEMS[f.item] && D.ITEMS[f.item].petbed ? 0 : 1 }));
      map.add(mkObj('torch', 2, 1)); map.add(mkObj('torch', W - 3, 1));
      map.dark = 0;
      map.indoor = 1;
      return map;
    },

    // ---------------- temples ----------------
    genTemple(bkey, done, enemies, seed) {
      const r = U.rng(seed);
      const N = bkey === 'meadow' ? 3 : 4 + (D.BIOME_KEYS.indexOf(bkey) % 2);
      const W = 15, H = N * 10 + 1, map = new GMap('temple_' + bkey, W, H, 'temple');
      const pal = A.TEMPLE_PAL[bkey];
      map.pal = { [T.TFLOOR]: pal[0], [T.TWALL]: pal[1] };
      map.dark = 0.8; map.biome = bkey;
      for (let i = 0; i < W * H; i++) map.tiles[i] = T.TWALL;
      map.rooms = [];
      const yTop = (k) => (N - 1 - k) * 10;
      for (let k = 0; k < N; k++) {
        const yt = yTop(k);
        for (let y = yt + 1; y <= yt + 9; y++) for (let x = 1; x <= 13; x++) map.tiles[y * W + x] = T.TFLOOR;
        map.rooms.push({ k, yt, solved: false, puzzle: null });
      }
      map.tiles[(H - 1) * W + 7] = T.TFLOOR;
      map.add(mkObj('exit', 7, H - 1, { to: 'overworld' }));
      map.entry = [7, H - 2];
      const decoTile = (x, y) => map.tile(x, y) === T.TFLOOR && !map.objAt(x, y);
      const types = enemies ? ['plate', 'braziers', 'crystals', 'key', 'combat'] : ['plate', 'braziers', 'crystals', 'key'];
      let last = null;
      for (let k = 0; k < N; k++) {
        const room = map.rooms[k], yt = room.yt, cx = 7, cy = yt + 5;
        // torches on the wall above each room
        map.add(mkObj('torch', 3, yt)); map.add(mkObj('torch', 11, yt));
        if (k === N - 1) {
          room.puzzle = 'altar';
          map.add(mkObj('altar', 6, cy - 2, { w: 2, h: 1, shard: !done, biome: bkey }));
          if (!done) { map.add(mkObj('chest', 3, cy, { egg: bkey, temple: 1 })); map.add(mkObj('chest', 11, cy, { loot: bkey, temple: 1 })); }
          for (const [px, py] of [[2, yt + 2], [12, yt + 2], [2, yt + 8], [12, yt + 8]]) map.add(mkObj('pillar', px, py));
          room.solved = true;
          continue;
        }
        // gate in the wall above this room
        const gate = map.add(mkObj('gate', 7, yt, { room: k, lock: false }));
        map.tiles[yt * W + 7] = T.TFLOOR;
        let pz;
        if (bkey === 'meadow' && k === 0) pz = 'braziers';
        else if (bkey === 'meadow' && k === 1) pz = 'plate';
        else { const opts = types.filter((t) => t !== last); pz = U.pick(r, opts); }
        last = pz; room.puzzle = pz;
        if (done) { room.solved = true; map.remove(gate); gate.open = true; }
        if (pz === 'plate') {
          const vertical = r() < 0.5;
          if (vertical) { map.add(mkObj('block', cx - 3, cy + 2, { room: k, home: [cx - 3, cy + 2] })); map.add(mkObj('plate', cx - 3, cy - 2, { room: k })); }
          else { map.add(mkObj('block', cx - 1, cy + 1, { room: k, home: [cx - 1, cy + 1] })); map.add(mkObj('plate', cx + 3, cy + 1, { room: k })); }
          map.add(mkObj('rune', 12, yt + 8, { room: k }));
        } else if (pz === 'braziers') {
          const timed = bkey !== 'meadow' && r() < 0.5;
          room.timed = timed;
          for (const [bx, by] of [[3, yt + 3], [11, yt + 3], [3, yt + 7], [11, yt + 7]]) map.add(mkObj('brazier', bx, by, { room: k, lit: done, timed }));
          if (bkey !== 'meadow') map.add(mkObj('crack', cx, cy + 1, {}));
        } else if (pz === 'crystals') {
          const st = [1, 1, 1, 1];
          do { for (let i = 0; i < 3; i++) { const j = (r() * 4) | 0; for (const d of [-1, 0, 1]) if (st[j + d] != null) st[j + d] ^= 1; } } while (st.every((v) => v));
          [cx - 3, cx - 1, cx + 1, cx + 3].forEach((x, i) => map.add(mkObj('crystal', x, cy - 1, { room: k, idx: i, on: done ? 1 : st[i] })));
        } else if (pz === 'key') {
          gate.lock = true;
          const spots = [[2, yt + 2], [12, yt + 2], [2, yt + 8], [12, yt + 8], [4, yt + 6], [10, yt + 6]];
          U.shuffle(r, spots);
          if (!done) map.add(mkObj('chest', spots[0][0], spots[0][1], { key: 1, temple: 1 }));
          for (let i = 1; i < 6; i++) map.add(mkObj('pot', spots[i][0], spots[i][1], {}));
        } else if (pz === 'combat') {
          room.spawns = [[4, yt + 4], [10, yt + 4], [7, yt + 7]];
          for (const [px, py] of [[2, yt + 2], [12, yt + 2]]) map.add(mkObj('pillar', px, py));
        }
        // a few pots for fun (never in push-block rooms, so lanes stay clear)
        if (pz !== 'plate') for (let i = 0; i < 2; i++) { const px = 1 + ((r() * 13) | 0), py = yt + 1 + ((r() * 9) | 0); if (decoTile(px, py) && Math.abs(px - 7) > 1 && Math.abs(py - cy) > 1 && py !== cy + 1 && py !== cy + 2 && py !== cy - 2) map.add(mkObj('pot', px, py, {})); }
      }
      return map;
    },

    // ---------------- caves ----------------
    genCave(bkey, depth, seed) {
      const r = U.rng(seed);
      const W = 44, H = 34, map = new GMap('cave_' + bkey, W, H, 'cave');
      map.dark = 0.85; map.biome = bkey; map.depth = depth;
      const CP = { snow: [['#8a96a8', '#7a869a', '#a0acbe'], ['#3a4454', '#2c3442', '#4c5668']], mushroom: [['#6e6488', '#605878', '#82789c'], ['#2e2840', '#221e32', '#3e3654']], volcano: [['#6a5452', '#5a4644', '#7a6462'], ['#2e2222', '#221818', '#3e302e']] };
      if (CP[bkey]) map.pal = { [T.CFLOOR]: CP[bkey][0], [T.CWALL]: CP[bkey][1] };
      let g = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || r() < 0.44) ? 1 : 0;
      for (let it = 0; it < 4; it++) {
        const n = new Uint8Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) { n[y * W + x] = 1; continue; }
          let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += g[(y + dy) * W + x + dx];
          n[y * W + x] = c >= 5 ? 1 : 0;
        }
        g = n;
      }
      const sx = W >> 1, sy = H - 5;
      for (let y = sy - 2; y <= sy + 2; y++) for (let x = sx - 2; x <= sx + 2; x++) g[y * W + x] = 0;
      // flood
      const dist = new Int32Array(W * H).fill(-1), q = [sy * W + sx]; dist[q[0]] = 0;
      for (let qi = 0; qi < q.length; qi++) {
        const i = q[qi], x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = (y + dy) * W + x + dx; if (!g[ni] && dist[ni] < 0) { dist[ni] = dist[i] + 1; q.push(ni); } }
      }
      let far = q[0];
      for (let i = 0; i < W * H; i++) { if (!g[i] && dist[i] < 0) g[i] = 1; if (dist[i] > dist[far]) far = i; }
      for (let i = 0; i < W * H; i++) map.tiles[i] = g[i] ? T.CWALL : T.CFLOOR;
      map.add(mkObj('ladder_up', sx, sy, {}));
      map.entry = [sx, sy + 1];
      map.add(mkObj('ladder_down', far % W, (far / W) | 0, {}));
      const ores = {
        meadow: [['stone', 5], ['copper', 4], ['coal', 2], ['iron', depth >= 3 ? 2 : 0], ['crystal', depth >= 6 ? 1 : 0]],
        snow: [['stone', 4], ['iron', 4], ['coal', 2], ['gold', depth >= 4 ? 2 : 0]],
        mushroom: [['stone', 4], ['crystal', 4], ['iron', 2], ['lumen', depth >= 4 ? 1.5 : 0]],
        volcano: [['stone', 3], ['coal', 3], ['iron', 3], ['gold', 2], ['lumen', depth >= 3 ? 1.5 : 0]],
      }[bkey] || [['stone', 1]];
      map.spawns = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; if (g[i] || map.grid[i] >= 0 || Math.abs(x - sx) + Math.abs(y - sy) < 4) continue;
        let walls = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) walls += g[(y + dy) * W + x + dx];
        const p = r();
        if (p < 0.05 + walls * 0.03) map.add(mkObj('rock', x, y, { kind: U.wpick(r, ores), biome: 'cave', cave: 1 }));
        else if (p < 0.075 + walls * 0.03 && dist[i] > 12) map.spawns.push([x, y]);
      }
      if (depth % 5 === 0) { for (let k = 0; k < 200; k++) { const x = 1 + ((r() * (W - 2)) | 0), y = 1 + ((r() * (H - 2)) | 0); if (!g[y * W + x] && !map.objAt(x, y) && dist[y * W + x] > 10) { map.add(mkObj('chest', x, y, { loot: bkey, cave: 1, depth })); break; } } }
      return map;
    },
  };
  A.GROUND_OK = (t) => t === T.GRASS || t === T.JGRASS || t === T.SAND || t === T.DSAND || t === T.SNOW || t === T.MOSS || t === T.ASH || t === T.PATH;
})();
