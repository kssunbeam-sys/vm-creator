'use strict';
// Core game: maps, entities, input-driven actions, day cycle, rendering.
G.Game = (() => {
  const U = G.U, D = G.D, A = G.Art, T = A.T, Sys = G.Sys, TS = G.TS, I = D.ITEMS;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const TREE_NAMES = { oak: 'Oak Tree', pine: 'Pine Tree', palm: 'Palm Tree', jungle: 'Jungle Tree', mush: 'Giant Mushroom', cactus: 'Cactus', ash: 'Ashwood Tree' };
  const ROCK = {
    stone: { name: 'Rock', tier: 1, hp: 3, xp: 2 }, coal: { name: 'Coal Vein', tier: 1, hp: 3, xp: 6, lic: 1 }, copper: { name: 'Copper Vein', tier: 1, hp: 4, xp: 8, lic: 1 },
    iron: { name: 'Iron Vein', tier: 2, hp: 5, xp: 12, lic: 1 }, gold: { name: 'Gold Vein', tier: 3, hp: 6, xp: 18, lic: 1 }, crystal: { name: 'Crystal Cluster', tier: 3, hp: 5, xp: 18, lic: 1 },
    lumen: { name: 'Lumenite Cluster', tier: 4, hp: 7, xp: 30, lic: 1 },
  };
  const TREE_DROPS = {
    oak: [['log', 2, 3, 1], ['apple', 1, 2, 0], ['resin', 1, 1, 0.05], ['fiber', 1, 1, 0.3]], pine: [['log', 2, 3, 1], ['pinecone', 1, 2, 0.4], ['resin', 1, 1, 0.15]],
    palm: [['log', 1, 2, 1], ['coconut', 1, 2, 0.6]], jungle: [['log', 3, 4, 1], ['banana', 1, 2, 0.5], ['resin', 1, 1, 0.15], ['fiber', 1, 2, 0.5]],
    mush: [['mush_cap', 2, 3, 1], ['mushroom', 1, 1, 0.4], ['spore_dust', 1, 1, 0.2]], cactus: [['cactus_fruit', 1, 2, 0.85], ['fiber', 1, 2, 0.5]],
    ash: [['log', 1, 2, 1], ['coal', 1, 2, 0.7], ['ember_shard', 1, 1, 0.1]],
  };
  const ROCK_DROPS = {
    stone: [['stone', 2, 3, 1], ['coal', 1, 1, 0.08]], coal: [['coal', 2, 3, 1], ['stone', 1, 1, 0.5]], copper: [['copper_ore', 1, 2, 1], ['stone', 1, 1, 0.5]],
    iron: [['iron_ore', 1, 2, 1], ['stone', 1, 1, 0.4]], gold: [['gold_ore', 1, 2, 1]], crystal: [['crystal', 1, 2, 1], ['amethyst', 1, 1, 0.1]], lumen: [['lumen_ore', 1, 2, 1], ['diamond', 1, 1, 0.05]],
  };
  const GEMS = { stone: [['amethyst', 0.015], ['topaz', 0.015]], iron: [['aquamarine', 0.04], ['emerald', 0.02]], gold: [['ruby', 0.04], ['emerald', 0.04]], crystal: [['amethyst', 0.08]], lumen: [['diamond', 0.06], ['ruby', 0.06]], copper: [['topaz', 0.03]], coal: [] };

  const Game = {
    zoom: 3, cam: { x: 0, y: 0 }, t: 0, map: null, over: null, player: null, npcs: [], pets: [], glims: [], critters: [], enemies: [], strays: [],
    particles: [], floaters: [], explored: null, returnPos: [0, 0], caveDepth: 0, target: null, placing: null, fishing: null, running: false, title: true,
    keys: {}, regenT: 0, spawnT: 0, petGiftT: 60, saveT: 0, areaName: '', lastTile: '',
  };
  G.zoom = 3;

  // ---------------- setup ----------------
  Game.boot = function () {
    const c = Game.canvas = document.getElementById('game');
    Game.ctx = c.getContext('2d');
    Game.light = A.mk(8, 8);
    window.addEventListener('resize', Game.resize);
    Game.resize();
    Game.over = G.World.genOverworld(7);
    Game.map = Game.over;
    Game.cam.x = Game.over.towns.willowmere.cx * TS; Game.cam.y = Game.over.towns.willowmere.cy * TS;
    // a throwaway state so the title screen can render the living world behind the menu
    G.S = G.newState({ seed: 7, name: '', look: { skin: '#f1c7a3', hair: '#5a3a2a', hs: 0, outfit: '#5bc0be', pants: '#3a4a6a', hat: '' } });
    G.S.time = 17 * 60 + 30;
    requestAnimationFrame(Game.loop);
  };
  Game.resize = function () {
    const c = Game.canvas, dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(window.innerWidth * dpr); c.height = Math.floor(window.innerHeight * dpr);
    c.style.width = window.innerWidth + 'px'; c.style.height = window.innerHeight + 'px';
    const z = Math.max(2, Math.round(Math.min(c.width / (26 * TS), c.height / (15 * TS))));
    Game.zoom = G.zoom = z;
    Game.vw = c.width / z; Game.vh = c.height / z;
  };

  Game.start = function (state, isNew) {
    G.S = state;
    const s = state;
    if (!Game.over || Game.over.seed !== s.seed) Game.over = G.World.genOverworld(s.seed);
    const ov = Game.over;
    // apply removed objects
    for (const o of ov.objs) if (o.gone) ov.restore(o);
    for (const id in s.removed) { const o = ov.objs[id]; if (!o) { delete s.removed[id]; continue; } if (s.removed[id] === -1 || s.removed[id] > s.day) ov.remove(o); else delete s.removed[id]; }
    Game.explored = Sys.unpackBits(s.explored, ov.W * ov.H);
    // waystone index
    ov.waystones = {};
    for (const o of ov.objs) if (o.type === 'waystone') ov.waystones[o.ws] = { x: o.x, y: o.y + 1, label: o.label };
    Game.homeMap = null;
    Game.npcs = ov.npcSpots.map((sp) => ({ id: sp.npc, x: sp.x * TS + 8, y: sp.y * TS + 12, hx: sp.x * TS + 8, hy: sp.y * TS + 12, shop: sp.shop, dir: 'down', t: Math.random() * 9, wait: 1 + Math.random() * 3, tx: null, ty: null, moving: false, seed: Math.random() * 9, look: A.lookObj(D.NPCS[sp.npc].look), town: sp.town }));
    Game.player = { x: 0, y: 0, dir: 'down', t: 0, moving: false, swing: null, hurtT: 0, inv: 0, sit: null, pushT: 0 };
    Game.critters = []; Game.enemies = []; Game.particles = []; Game.floaters = [];
    Game.spawnStrays();
    let pos;
    if (s.px != null && s.map === 'overworld') pos = [s.px, s.py];
    else { const hd = ov.homeDoor; pos = [hd[0] * TS + 8, (hd[1] + 2) * TS + 4]; }
    Game.returnPos = [ov.homeDoor[0] * TS + 8, (ov.homeDoor[1] + 1) * TS + 12];
    Game.setMap(ov, pos[0], pos[1]);
    if (s.map === 'home') Game.enterHome(true);
    Game.title = false; Game.running = true;
    G.UI.startHud();
    G.Audio.volumes();
    if (isNew) setTimeout(() => G.UI.intro(), 400);
    Sys.checkQuests();
  };

  Game.spawnStrays = function () {
    Game.strays = Game.over.strays.filter((st) => !G.S.strays[st.biome]).map((st) => ({ biome: st.biome, species: st.species, x: st.x * TS + 8, y: st.y * TS + 12, hx: st.x * TS + 8, hy: st.y * TS + 12, color: (U.hash(st.x, st.y, 4) * 3) | 0, t: 0, face: 1, moving: false }));
  };
  Game.syncPets = function () {
    const s = G.S, p = Game.player;
    const want = Game.map.kind === 'home' ? s.pets : s.pets.filter((x) => x.follow);
    const old = new Map(Game.pets.map((e) => [e.data.id, e]));
    Game.pets = want.map((d, i) => old.get(d.id) || { data: d, x: p.x - 10 - i * 8, y: p.y + 4, face: 1, t: Math.random() * 5, moving: false, hearts: 0, home: Game.map.kind === 'home', wx: null, wy: null, wait: 0 });
    for (const e of Game.pets) e.home = Game.map.kind === 'home' && !e.data.follow;
    const gi = s.activeGlim;
    Game.glims = gi >= 0 && s.glimmers[gi] ? [{ kind: s.glimmers[gi].kind, x: p.x, y: p.y - 14, t: 0 }] : [];
  };

  // ---------------- maps ----------------
  Game.setMap = function (map, x, y) {
    Game.map = map;
    const p = Game.player; p.x = x; p.y = y; p.sit = null; p.swing = null;
    Game.critters = []; Game.enemies = []; Game.particles = [];
    Game.trail = [];
    Game.syncPets();
    Game.pets.forEach((e, i) => { e.x = x - 12 - i * 9; e.y = y + 3; e.face = 1; });
    for (const g of Game.glims) { g.x = x; g.y = y - 14; }
    Game.snapCam();
    if (map.kind === 'cave') Game.spawnCaveEnemies();
    if (map.kind === 'temple') Game.spawnTempleEnemies();
    if (map.kind === 'home') for (const e of Game.pets) if (e.home) { e.x = (2 + Math.random() * (map.W - 4)) * TS; e.y = (3 + Math.random() * (map.H - 5)) * TS; }
    Game.updateArea(true);
  };
  Game.snapCam = function () { Game.cam.x = Game.player.x; Game.cam.y = Game.player.y; };
  Game.transition = function (fn) { G.UI.fade(() => { fn(); G.Audio.sfx('door'); }); };
  Game.enterHome = function (instant) {
    const go = () => {
      if (!Game.homeMap) Game.homeMap = G.World.genHome(G.S.home.size, G.S.home.furniture);
      const m = Game.homeMap;
      if (Game.map.kind === 'overworld') Game.returnPos = [Game.over.homeDoor[0] * TS + 8, (Game.over.homeDoor[1] + 1) * TS + 12];
      Game.setMap(m, m.entry[0] * TS + 8, m.entry[1] * TS + 10);
    };
    instant ? go() : Game.transition(go);
  };
  Game.invalidateHome = function () {
    Game.homeMap = null;
    if (Game.map.kind === 'home') { const m = Game.homeMap = G.World.genHome(G.S.home.size, G.S.home.furniture); const p = Game.player; Game.setMap(m, Math.min(p.x, (m.W - 2) * TS), Math.min(p.y, (m.H - 2) * TS)); }
  };
  Game.exitToOverworld = function () {
    Game.transition(() => Game.setMap(Game.over, Game.returnPos[0], Game.returnPos[1]));
  };
  Game.enterTemple = function (o) {
    const s = G.S;
    if (o.biome !== 'meadow' && !s.lic.explorer) return G.UI.say('The temple doors are carved with a compass. Only licensed Explorers may enter. (Get the Explorer licence from Guildmaster Rowan in Willowmere.)');
    Game.transition(() => {
      Game.returnPos = [o.door[0] * TS + 8, (o.door[1] + 1) * TS + 12];
      const m = G.World.genTemple(o.biome, !!s.temples[o.biome], s.settings.enemies, s.seed + D.BIOME_KEYS.indexOf(o.biome) * 1009 + s.day * 7);
      m.label = o.label;
      Game.setMap(m, m.entry[0] * TS + 8, m.entry[1] * TS + 10);
      Game.visit('temple_' + o.biome, o.label);
      G.Audio.setBiome(o.biome, true);
    });
  };
  Game.enterCave = function (bkey, depth, fromOver) {
    Game.transition(() => {
      const s = G.S;
      if (fromOver) { const pl = Game.over.places['cave_' + bkey]; Game.returnPos = [pl.x * TS + 8, pl.y * TS + 12]; }
      const m = G.World.genCave(bkey, depth, s.seed + depth * 7919 + s.day * 31 + D.BIOME_KEYS.indexOf(bkey) * 101);
      m.label = D.TOWNS[D.BIOMES[D.BIOME_KEYS.indexOf(bkey)].town].cave;
      Game.caveDepth = depth;
      s.deepest[bkey] = Math.max(s.deepest[bkey] || 0, depth);
      Game.setMap(m, m.entry[0] * TS + 8, m.entry[1] * TS + 10);
      Game.visit('cave_' + bkey, m.label);
      G.UI.banner(m.label, 'Level ' + depth);
      Sys.checkQuests();
    });
  };
  // nearest walkable spot to a tile (spiral search), so arrivals never land inside trees or water
  Game.safeSpot = function (map, tx, ty) {
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = tx + dx, y = ty + dy;
      if (map.inb(x, y) && !map.solid(x, y)) return [x * TS + 8, y * TS + 14];
    }
    return [tx * TS + 8, ty * TS + 14];
  };
  Game.teleport = function (wsId) {
    const w = Game.over.waystones[wsId]; if (!w) return;
    G.UI.close();
    G.Audio.sfx('teleport');
    G.UI.fade(() => {
      const [x, y] = Game.safeSpot(Game.over, w.x, w.y);
      Game.setMap(Game.over, x, y);
      G.S.lastWs = wsId;
      for (let i = 0; i < 30; i++) Game.particle(Game.player.x, Game.player.y - 8, { vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60, life: 1, color: '#9af0ff', size: 1.5 });
    }, 500);
  };
  Game.placeName = function (id) {
    if (D.TOWNS[id]) return D.TOWNS[id].name;
    const p = Game.over && Game.over.places[id]; return p ? p.name : id;
  };
  Game.visit = function (id, name) {
    const s = G.S;
    if (!s.visited[id]) { s.visited[id] = true; Sys.addXp('explorer', 15); if (name) G.UI.toast('🗺️ Discovered ' + name + '!'); }
    Sys.checkQuests();
  };

  // ---------------- helpers ----------------
  Game.tileOf = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)];
  function blocked(map, x, y) {
    const pts = [[x - 4, y - 5], [x + 4, y - 5], [x - 4, y - 0.5], [x + 4, y - 0.5]];
    for (const [px, py] of pts) if (map.solid(Math.floor(px / TS), Math.floor(py / TS))) return true;
    return false;
  }
  function moveEnt(map, e, dx, dy) {
    let moved = false;
    if (dx && !blocked(map, e.x + dx, e.y)) { e.x += dx; moved = true; }
    if (dy && !blocked(map, e.x, e.y + dy)) { e.y += dy; moved = true; }
    return moved;
  }
  Game.moveEnt = moveEnt;
  Game.particle = function (x, y, o) { Game.particles.push(Object.assign({ x, y, vx: 0, vy: 0, life: 0.6, max: o && o.life || 0.6, color: '#fff', size: 1, g: 0 }, o || {})); };
  Game.burst = function (x, y, color, n, spread) { for (let i = 0; i < (n || 8); i++) Game.particle(x, y, { vx: (Math.random() - 0.5) * (spread || 80), vy: -Math.random() * (spread || 80) * 0.8, g: 160, life: 0.5 + Math.random() * 0.3, color, size: 1 + Math.random() }); };
  Game.floater = function (text, itemId, icon) { const p = Game.player; if (!p) return; Game.floaters.push({ text, item: itemId, icon, x: p.x, y: p.y - 24 - Game.floaters.length * 7, t: 0 }); };
  Game.biomeAt = function (x, y) { const m = Game.over; const tx = U.clamp(Math.floor(x / TS), 0, m.W - 1), ty = U.clamp(Math.floor(y / TS), 0, m.H - 1); return D.BIOME_KEYS[m.biome[ty * m.W + tx]]; };
  Game.curBiome = function () { return Game.map.kind === 'overworld' ? Game.biomeAt(Game.player.x, Game.player.y) : (Game.map.biome || 'meadow'); };
  Game.townAt = function (x, y) { const m = Game.over; const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!m.inb(tx, ty)) return null; const v = m.town[ty * m.W + tx]; return v > 0 && v < 100 ? D.TOWN_ORDER[v - 1] : null; };
  Game.nearTown = function (x, y) { const m = Game.over; const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!m.inb(tx, ty)) return false; return m.town[ty * m.W + tx] > 0; };
  Game.isPaused = () => G.UI.isOpen() || Game.title;

  // ---------------- update ----------------
  Game.loop = function (ts) {
    const now = ts / 1000, dt = Math.min(0.05, now - (Game.lastT || now));
    Game.lastT = now;
    try {
      if (Game.title) { Game.t += dt; Game.cam.x += dt * 14; Game.cam.y += Math.sin(Game.t * 0.2) * dt * 6; if (Game.cam.x > Game.over.W * TS - 300) Game.cam.x = 300; }
      else if (!Game.isPaused()) Game.update(dt);
      else if (Game.fishing) Game.updateFishing(dt);
      Game.render(dt);
      if (!Game.title) G.UI.tick(dt);
    } catch (e) { console.error(e); }
    requestAnimationFrame(Game.loop);
  };

  Game.update = function (dt) {
    const s = G.S, p = Game.player, map = Game.map;
    Game.t += dt;
    // time
    if (s.settings.dayLen > 0) {
      const mult = p.sit ? 10 : 1;
      const before = s.time;
      s.time += dt * (1440 / (s.settings.dayLen * 60)) * mult;
      if (s.time >= 1440) s.time -= 1440;
      if (before < 360 && s.time >= 360) Game.newDay();
    }
    if (Game.fishing) { Game.updateFishing(dt); }
    // player
    const inp = G.Input.dir();
    p.t += dt;
    if (p.swing != null) { p.swing += dt / 0.28; if (p.swing >= 1) p.swing = null; }
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.inv > 0) p.inv -= dt;
    p.moving = false;
    if (p.sit) { if (inp.x || inp.y) { p.sit = null; } }
    else if (!Game.fishing && (inp.x || inp.y)) {
      const run = G.Input.run();
      const spd = 70 * Sys.speedMult() * (run ? 1.5 : 1);
      const len = Math.hypot(inp.x, inp.y);
      const vx = inp.x / len * spd * dt, vy = inp.y / len * spd * dt;
      if (Math.abs(inp.x) > Math.abs(inp.y)) p.dir = inp.x > 0 ? 'right' : 'left'; else p.dir = inp.y > 0 ? 'down' : 'up';
      const ox = p.x, oy = p.y;
      moveEnt(map, p, vx, vy);
      p.moving = Math.abs(p.x - ox) + Math.abs(p.y - oy) > 0.01;
      if (p.moving) { const last = Game.trail[Game.trail.length - 1]; if (!last || Math.hypot(last[0] - p.x, last[1] - p.y) > 3) { Game.trail.push([p.x, p.y]); if (Game.trail.length > 80) Game.trail.shift(); } }
      // pushing blocks
      if (!p.moving || (Math.abs(p.x - ox) < 0.05 * spd * dt && Math.abs(p.y - oy) < 0.05 * spd * dt)) {
        const [dx, dy] = DIRS[p.dir];
        const [tx, ty] = Game.tileOf(p.x + dx * 8, p.y - 3 + dy * 8);
        const o = map.objAt(tx, ty);
        if (o && o.type === 'block') { p.pushT += dt; if (p.pushT > 0.22) { p.pushT = 0; Game.pushBlock(o, dx, dy); } } else p.pushT = 0;
      } else p.pushT = 0;
    }
    // exits & triggers under feet
    const [ptx, pty] = Game.tileOf(p.x, p.y - 2);
    const under = map.objAt(ptx, pty);
    if (under && under.type === 'exit' && !Game.exiting) { Game.exiting = true; setTimeout(() => (Game.exiting = false), 700); if (map.kind === 'home' || map.kind === 'temple') Game.exitToOverworld(); }
    // world systems
    Game.updateEntities(dt);
    Game.updateParticles(dt);
    if (map.kind === 'overworld') Game.updateOverworld(dt);
    if (map.kind === 'temple') Game.updateTemple(dt);
    // regen
    if (s.settings.enemies) {
      Game.regenT += dt;
      if (Game.regenT > 7 && p.hurtT <= 0 && s.hp < s.maxHp) { Game.regenT = 0; s.hp++; G.UI.dirty(); }
    } else s.hp = s.maxHp;
    // pet gifts
    Game.petGiftT -= dt * (Sys.glimPerk('jungle') ? 2 : 1);
    if (Game.petGiftT <= 0) { Game.petGiftT = 80 + Math.random() * 80; Game.petGift(); }
    // target
    Game.target = Game.findTarget();
    G.UI.prompt(Game.target);
    // camera
    const k = 1 - Math.pow(0.0005, dt);
    Game.cam.x += (p.x - Game.cam.x) * k; Game.cam.y += (p.y - 8 - Game.cam.y) * k;
    // autosave
    Game.saveT += dt; if (Game.saveT > 45) { Game.saveT = 0; Sys.save(); }
    Game.questT = (Game.questT || 0) + dt; if (Game.questT > 1) { Game.questT = 0; Sys.checkQuests(); }
  };

  Game.updateArea = function (force) {
    const p = Game.player, map = Game.map;
    let name, sub;
    if (map.kind === 'overworld') {
      const tw = Game.townAt(p.x, p.y), b = Game.biomeAt(p.x, p.y);
      if (tw) { name = D.TOWNS[tw].name; sub = D.BIOMES[D.TOWNS[tw].biome].name; if (!G.S.visited[tw]) Game.visit(tw); }
      else { name = D.BIOMES[D.BIOME_KEYS.indexOf(b)].name; sub = ''; }
      G.Audio.setBiome(b, false);
    } else if (map.kind === 'home') { name = 'Your Cottage'; sub = 'Willowmere'; G.Audio.setBiome('meadow', true); }
    else { name = map.label || 'Somewhere'; sub = map.kind === 'cave' ? 'Level ' + map.depth : 'Ancient temple'; }
    if (name !== Game.areaName || force) { if (Game.areaName && name !== Game.areaName) G.UI.banner(name, sub); Game.areaName = name; Game.areaSub = sub; G.UI.dirty(); }
  };

  Game.updateOverworld = function (dt) {
    const p = Game.player, s = G.S, map = Game.over;
    const [tx, ty] = Game.tileOf(p.x, p.y);
    const key = tx + ',' + ty;
    if (key !== Game.lastTile) {
      Game.lastTile = key;
      const R = 9;
      for (let y = ty - R; y <= ty + R; y++) for (let x = tx - R; x <= tx + R; x++) if (map.inb(x, y) && (x - tx) ** 2 + (y - ty) ** 2 <= R * R) Game.explored[y * map.W + x] = 1;
      Game.updateArea();
      // auto-activate waystones nearby
      for (const id in map.waystones) {
        const w = map.waystones[id];
        if (!s.ws[id] && Math.abs(w.x - tx) <= 2 && Math.abs(w.y - 1 - ty) <= 2) {
          s.ws[id] = true; G.UI.toast('💠 Waystone awakened: ' + w.label); G.Audio.sfx('teleport');
          for (let i = 0; i < 24; i++) Game.particle(w.x * TS + 8, w.y * TS - 10, { vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 70, life: 1.2, color: '#9af0ff', size: 1.4 });
          Sys.checkQuests();
        }
        if (Math.abs(w.x - tx) <= 2 && Math.abs(w.y - 1 - ty) <= 2) s.lastWs = id;
      }
    }
    // critters
    Game.spawnT -= dt;
    if (Game.spawnT <= 0) {
      Game.spawnT = 0.8;
      Game.critters = Game.critters.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) < 26 * TS);
      Game.enemies = Game.enemies.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < 28 * TS);
      const night = Sys.isNight();
      if (Game.critters.length < (night ? 9 : 7)) {
        const a = Math.random() * 6.28, d = (7 + Math.random() * 8) * TS, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
        const [cx, cy] = Game.tileOf(x, y);
        if (map.inb(cx, cy) && !map.solid(cx, cy)) {
          const b = Game.biomeAt(x, y);
          const opts = D.CRITTERS.filter((c) => c[5].includes(b) && (c[6] === 'any' || (c[6] === 'night') === night));
          if (opts.length) { const c = U.pick(Math.random, opts); Game.critters.push({ kind: c[0], fly: c[7] === 'fly', x, y, vx: 0, vy: 0, t: Math.random() * 9, wait: 0, flee: 0 }); }
        }
      }
      if (s.settings.enemies && Game.enemies.length < (night ? 5 : 3) && Math.random() < 0.5) {
        const a = Math.random() * 6.28, d = (10 + Math.random() * 6) * TS, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
        const [cx, cy] = Game.tileOf(x, y);
        if (map.inb(cx, cy) && !map.solid(cx, cy) && !Game.nearTown(x, y) && map.tile(cx, cy) !== T.PATH && map.tile(cx, cy) !== T.BRIDGE) {
          const b = Game.biomeAt(x, y);
          if (b !== 'meadow' || night) Game.spawnEnemy(D.BIOME_ENEMY[b], x, y);
        }
      }
    }
    if (!s.settings.enemies && Game.enemies.length) Game.enemies = [];
  };
  Game.spawnEnemy = function (kind, x, y, room) {
    const d = D.ENEMIES[kind];
    Game.enemies.push({ kind, x, y, hp: d.hp, maxHp: d.hp, hurt: 0, seed: Math.random() * 9, cd: 0, vx: 0, vy: 0, wait: 0, room, kb: [0, 0] });
  };
  Game.spawnCaveEnemies = function () {
    if (!G.S.settings.enemies) return;
    const m = Game.map, n = Math.min(m.spawns.length, 2 + Math.floor(m.depth / 2));
    U.shuffle(Math.random, m.spawns);
    for (let i = 0; i < n; i++) Game.spawnEnemy(Math.random() < 0.5 ? 'bat' : (m.biome === 'volcano' ? 'magma' : m.biome === 'mushroom' ? 'puff' : 'slime'), m.spawns[i][0] * TS + 8, m.spawns[i][1] * TS + 12);
  };
  Game.spawnTempleEnemies = function () {
    if (!G.S.settings.enemies) return;
    for (const r of Game.map.rooms) if (r.puzzle === 'combat' && !r.solved) for (const [x, y] of r.spawns) Game.spawnEnemy(r.k % 2 ? 'golem' : D.BIOME_ENEMY[Game.map.biome], x * TS + 8, y * TS + 12, r.k);
  };

  Game.updateEntities = function (dt) {
    const p = Game.player, map = Game.map, s = G.S;
    // npcs
    if (map.kind === 'overworld') for (const n of Game.npcs) {
      n.t += dt;
      if (Math.abs(n.x - p.x) > 30 * TS || Math.abs(n.y - p.y) > 20 * TS) continue;
      const talking = G.UI.talkingTo === n.id;
      if (n.shop || talking) { n.moving = false; if (talking) n.dir = Math.abs(p.x - n.x) > Math.abs(p.y - n.y) ? (p.x > n.x ? 'right' : 'left') : (p.y > n.y ? 'down' : 'up'); else if (Math.hypot(p.x - n.x, p.y - n.y) < 40) n.dir = 'down'; continue; }
      if (n.tx == null) { n.wait -= dt; n.moving = false; if (n.wait <= 0) { const R = 5 * TS; n.tx = n.hx + (Math.random() - 0.5) * R * 2; n.ty = n.hy + (Math.random() - 0.5) * R; } }
      else {
        const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
        if (d < 2) { n.tx = null; n.wait = 2 + Math.random() * 4; n.moving = false; }
        else {
          const sp = 26 * dt; const ok = moveEnt(map, n, dx / d * sp, dy / d * sp); n.moving = ok;
          n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          if (!ok) { n.tx = null; n.wait = 1; }
        }
      }
    }
    // strays
    if (map.kind === 'overworld') for (const st of Game.strays) {
      st.t += dt;
      if (Math.abs(st.x - p.x) > 25 * TS) continue;
      if (st.tx == null) { st.moving = false; if (Math.random() < dt * 0.3) { st.tx = st.hx + (Math.random() - 0.5) * 40; st.ty = st.hy + (Math.random() - 0.5) * 30; } }
      else { const dx = st.tx - st.x, dy = st.ty - st.y, d = Math.hypot(dx, dy); if (d < 2) st.tx = null; else { st.moving = moveEnt(map, st, dx / d * 18 * dt, dy / d * 18 * dt); st.face = dx > 0 ? 1 : -1; if (!st.moving) st.tx = null; } }
    }
    // pets
    Game.pets.forEach((e, i) => {
      e.t += dt; if (e.hearts > 0) e.hearts -= dt;
      if (e.home) {
        if (e.wx == null) { e.moving = false; e.wait -= dt; if (e.wait <= 0) { e.wx = (1.5 + Math.random() * (map.W - 3)) * TS; e.wy = (2.5 + Math.random() * (map.H - 4.5)) * TS; } }
        else { const dx = e.wx - e.x, dy = e.wy - e.y, d = Math.hypot(dx, dy); if (d < 2) { e.wx = null; e.wait = 2 + Math.random() * 5; } else { e.moving = moveEnt(map, e, dx / d * 24 * dt, dy / d * 24 * dt); e.face = dx > 0 ? 1 : -1; if (!e.moving) e.wx = null; } }
        return;
      }
      const lag = 9 + i * 7;
      const tr = Game.trail;
      let tx, ty;
      if (tr.length > lag) { [tx, ty] = tr[tr.length - 1 - lag]; } else { tx = p.x - 12 - i * 8; ty = p.y + 2; }
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      if (d > 200) { e.x = p.x - 10; e.y = p.y + 4; }
      else if (d > 3 && (p.moving || d > 14)) { const sp = Math.min(d * 6, 130) * dt; e.x += dx / d * sp; e.y += dy / d * sp; e.moving = true; if (Math.abs(dx) > 0.5) e.face = dx > 0 ? 1 : -1; }
      else { e.moving = false; if (Math.abs(p.x - e.x) > 4) e.face = p.x > e.x ? 1 : -1; }
    });
    // glimmers
    for (const g of Game.glims) {
      g.t += dt;
      const tx = p.x + Math.cos(g.t * 0.8) * 12, ty = p.y - 18 + Math.sin(g.t * 1.6) * 4;
      g.x += (tx - g.x) * Math.min(1, dt * 3); g.y += (ty - g.y) * Math.min(1, dt * 3);
    }
    // critters
    for (const c of Game.critters) {
      c.t += dt;
      const dp = Math.hypot(c.x - p.x, c.y - p.y);
      if (c.flee > 0) c.flee -= dt;
      if (c.fly) {
        c.vx += (Math.random() - 0.5) * 120 * dt; c.vy += (Math.random() - 0.5) * 120 * dt;
        if (c.flee > 0 || (dp < 30 && G.Input.run())) { c.vx += (c.x - p.x) / dp * 200 * dt; c.vy += (c.y - p.y) / dp * 200 * dt; }
        const sp = Math.hypot(c.vx, c.vy), mx = c.flee > 0 ? 70 : 22; if (sp > mx) { c.vx *= mx / sp; c.vy *= mx / sp; }
        c.x += c.vx * dt; c.y += c.vy * dt;
      } else {
        if (c.wait > 0) c.wait -= dt;
        else { const a = Math.random() * 6.28; c.vx = Math.cos(a) * 14; c.vy = Math.sin(a) * 14; c.wait = 0.5 + Math.random() * 2; if (Math.random() < 0.4) { c.vx = c.vy = 0; } }
        if (c.flee > 0) { c.vx = (c.x - p.x) / dp * 60; c.vy = (c.y - p.y) / dp * 60; }
        moveEnt(map, c, c.vx * dt, c.vy * dt);
      }
    }
    // enemies
    if (s.settings.enemies) for (const e of Game.enemies) {
      const d = D.ENEMIES[e.kind];
      if (e.hurt > 0) e.hurt -= dt;
      if (e.cd > 0) e.cd -= dt;
      if (e.kb[0] || e.kb[1]) { moveEnt(map, e, e.kb[0] * dt, e.kb[1] * dt); e.kb[0] *= 0.85; e.kb[1] *= 0.85; if (Math.abs(e.kb[0]) + Math.abs(e.kb[1]) < 3) e.kb = [0, 0]; }
      const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy);
      const inRoom = e.room == null || Game.roomOfY(p.y) === e.room;
      if (dist < 6 * TS && inRoom && !p.sit) {
        const sp = d.speed * dt;
        if (d.fly) { e.x += dx / dist * sp; e.y += dy / dist * sp; } else moveEnt(map, e, dx / dist * sp, dy / dist * sp);
        e.moving = true;
      } else {
        e.wait -= dt; if (e.wait <= 0) { const a = Math.random() * 6.28; e.vx = Math.cos(a) * 12; e.vy = Math.sin(a) * 12; e.wait = 1 + Math.random() * 2; }
        if (d.fly) { e.x += e.vx * dt; e.y += e.vy * dt; } else moveEnt(map, e, e.vx * dt, e.vy * dt);
      }
      if (dist < 9 && p.inv <= 0) Game.hurtPlayer(d.dmg, e);
    }
  };
  Game.hurtPlayer = function (dmg, src) {
    const s = G.S, p = Game.player;
    s.hp -= dmg; p.inv = 1.0; p.hurtT = 4; Game.regenT = 0;
    G.Audio.sfx('hurt'); G.UI.dirty(); G.UI.flash();
    if (src) { const dx = p.x - src.x, dy = p.y - src.y, d = Math.hypot(dx, dy) || 1; moveEnt(Game.map, p, dx / d * 10, dy / d * 10); }
    if (s.hp <= 0) Game.faint();
  };
  Game.faint = function () {
    const s = G.S, pet = s.pets.find((x) => x.follow);
    s.hp = s.maxHp;
    G.UI.fade(() => {
      const w = Game.over.waystones[s.lastWs] || Game.over.waystones.willowmere;
      const [x, y] = Game.safeSpot(Game.over, w.x, w.y);
      Game.setMap(Game.over, x, y);
      G.UI.say((pet ? `${pet.name} nudged you awake and led you back to safety.` : 'You wake up next to a warm Waystone.') + ' Nothing was lost. Take it easy for a bit!');
    }, 900);
  };
  Game.roomOfY = function (py) { const m = Game.map; if (m.kind !== 'temple') return null; const ty = Math.floor(py / TS); const N = m.rooms.length; return U.clamp(N - 1 - Math.floor(ty / 10), 0, N - 1); };

  Game.updateParticles = function (dt) {
    for (const q of Game.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt; }
    Game.particles = Game.particles.filter((q) => q.life > 0);
    for (const f of Game.floaters) f.t += dt;
    Game.floaters = Game.floaters.filter((f) => f.t < 1.6);
  };

  Game.petGift = function () {
    const s = G.S; if (Game.map.kind !== 'overworld') return;
    const fol = s.pets.filter((p) => p.follow && p.happy >= 55);
    if (!fol.length) return;
    const pet = U.pick(Math.random, fol), b = Game.curBiome();
    const pool = { meadow: ['daisy', 'apple', 'berries', 'feather'], coast: ['shell', 'seaweed', 'pearl'], snow: ['snowberry', 'pinecone', 'frost_shard'], mushroom: ['glowcap', 'mushroom', 'spore_dust'], jungle: ['banana', 'orchid', 'feather'], desert: ['cactus_fruit', 'pot_shard', 'topaz'], volcano: ['coal', 'ember_flower', 'ember_shard'] }[b];
    const id = Math.random() < 0.15 ? 'relic_' + b : U.pick(Math.random, pool);
    Sys.give(id, 1, { silent: true });
    G.UI.toast(`🐾 ${pet.name} found ${I[id].name}!`, I[id]);
    const e = Game.pets.find((x) => x.data === pet); if (e) e.hearts = 1.2;
  };

  // ---------------- day cycle ----------------
  Game.newDay = function () {
    const s = G.S, ov = Game.over;
    s.day++;
    for (const id in s.removed) { const v = s.removed[id]; if (v !== -1 && v <= s.day) { ov.restore(ov.objs[id]); delete s.removed[id]; } }
    const hatched = [];
    s.eggs = s.eggs.filter((e) => { if (e.day < s.day) { hatched.push(e.kind); return false; } return true; });
    for (const k of hatched) Game.hatch(k);
    for (const p of s.pets) p.happy = Math.max(35, p.happy - 6);
    G.UI.banner('Day ' + s.day, '🌅 A fresh morning on the isles');
    Sys.save();
  };
  Game.hatch = function (kind) {
    const s = G.S;
    s.glimmers.push({ kind, name: D.GLIMMERS[kind].name });
    if (s.activeGlim < 0) s.activeGlim = s.glimmers.length - 1;
    G.UI.toast(`✨ A ${D.GLIMMERS[kind].name} hatched! (${D.GLIMMERS[kind].perk})`);
    G.Audio.sfx('level');
    Game.syncPets(); Sys.checkQuests();
  };
  Game.sleep = function (hours) {
    const s = G.S;
    G.UI.close();
    G.UI.fade(() => {
      if (hours) { s.time += hours * 60; if (s.time >= 1440) s.time -= 1440; if (s.time >= 360 && s.time - hours * 60 < 360) Game.newDay(); }
      else { const passMidnight = s.time >= 360; s.time = 360; if (passMidnight || true) Game.newDay(); s.buffs.rested = s.day; }
      s.hp = s.maxHp; G.UI.dirty();
    }, 1400);
  };

  // ---------------- targeting & actions ----------------
  Game.findTarget = function () {
    const p = Game.player, map = Game.map;
    if (Game.fishing) return null;
    if (Game.placing) return { kind: 'place' };
    if (p.sit) return { kind: 'sit', label: 'Stand up', fn: () => (p.sit = null) };
    const [dx, dy] = DIRS[p.dir];
    const fx = p.x + dx * 10, fy = p.y - 4 + dy * 10;
    const near = (e, r) => Math.hypot(e.x - fx, (e.y - 4) - fy) < (r || 12);
    if (map.kind === 'overworld') {
      for (const n of Game.npcs) if (near(n, 13)) return { kind: 'npc', ref: n };
      for (const st of Game.strays) if (near(st)) return { kind: 'stray', ref: st };
    }
    for (const e of Game.enemies) if (near(e, 16)) return { kind: 'enemy', ref: e };
    for (const c of Game.critters) if (near(c, 13)) return { kind: 'critter', ref: c };
    const pts = [[fx, fy], [p.x + dx * 18, p.y - 4 + dy * 18], [p.x, p.y - 3]];
    for (const [x, y] of pts) {
      const [tx, ty] = Game.tileOf(x, y);
      const o = map.objAt(tx, ty);
      if (o && o.type !== 'exit' && o.type !== 'torch') { const a = Game.objAction(o, tx, ty); if (a) return Object.assign({ kind: 'obj', ref: o }, a); }
    }
    for (const e of Game.pets) if (near(e, 10)) return { kind: 'pet', ref: e };
    return null;
  };
  Game.actionFor = function (t) {
    if (!t) return null;
    const s = G.S;
    switch (t.kind) {
      case 'npc': return { label: 'Talk to ' + D.NPCS[t.ref.id].name, fn: () => G.UI.talk(t.ref.id) };
      case 'stray': return { label: 'Befriend the stray ' + D.PETS[t.ref.species].name, fn: () => G.UI.stray(t.ref) };
      case 'pet': return { label: 'Pet ' + t.ref.data.name, fn: () => Game.petAction(t.ref) };
      case 'critter': {
        const it = I[t.ref.kind];
        if (!s.lic.critter) return { label: it.name, why: 'Needs Critter Keeper licence' };
        return { label: 'Catch ' + it.name, tool: '🥅', fn: () => Game.catchCritter(t.ref) };
      }
      case 'enemy': return { label: 'Attack ' + D.ENEMIES[t.ref.kind].name, tool: '🗡️', fn: () => Game.attack() };
      default: return t.label ? t : null;
    }
  };
  Game.act = function () {
    if (Game.title || G.UI.isOpen()) return;
    if (Game.placing) return Game.placeConfirm();
    if (Game.fishing) return;
    const p = Game.player;
    if (p.swing != null) return;
    const a = Game.actionFor(Game.target);
    if (!a) { if (G.S.settings.enemies && Game.enemies.length) Game.attack(); return; }
    if (a.why) { G.UI.toast('🔒 ' + a.why); G.Audio.sfx('miss'); return; }
    a.fn();
  };
  Game.swing = function (toolEmoji) { const p = Game.player; p.swing = 0; p.tool = toolEmoji; G.Audio.sfx('swing'); };

  Game.objAction = function (o) {
    const s = G.S, tl = s.tools;
    const tierName = (n) => D.TIER_NAMES[n];
    switch (o.type) {
      case 'tree': return { label: 'Chop ' + TREE_NAMES[o.kind], tool: '🪓', fn: () => Game.hit(o, 'axe') };
      case 'rock': {
        const r = ROCK[o.kind];
        if (r.lic && !s.lic.miner) return { label: r.name, why: 'Needs Miner licence (Guild Hall, Willowmere)' };
        if (tl.pickaxe < r.tier) return { label: r.name, why: `Needs a ${tierName(r.tier)} pickaxe (Forge, Emberforge)` };
        return { label: 'Mine ' + r.name, tool: '⛏️', fn: () => Game.hit(o, 'pickaxe') };
      }
      case 'bush': return { label: 'Pick ' + (o.kind === 'snowberry' ? 'snowberries' : 'berries'), fn: () => Game.harvest(o) };
      case 'grass': return { label: 'Gather fiber', fn: () => Game.harvest(o) };
      case 'forage': return { label: 'Pick up ' + I[o.item].name, fn: () => Game.harvest(o) };
      case 'dig':
        if (!s.lic.archaeologist) return { label: 'Dig spot', why: 'Needs Archaeologist licence' };
        return { label: 'Excavate dig spot', tool: '🧹', fn: () => Game.hit(o, 'brush') };
      case 'fish':
        if (!s.lic.fisher) return { label: 'Bubbling water', why: 'Needs Fisher licence' };
        return { label: 'Fish here', tool: '🎣', fn: () => Game.startFishing(o) };
      case 'chest':
        if (o.explorer && !s.lic.explorer) return { label: 'Explorer chest', why: 'Needs Explorer licence' };
        return { label: o.egg ? 'Open glowing chest' : 'Open chest', fn: () => Game.openChest(o) };
      case 'waystone': return { label: 'Use ' + o.label, fn: () => G.UI.travel(o.ws) };
      case 'building':
        if (o.kind === 'home') return { label: 'Enter your cottage', fn: () => Game.enterHome() };
        if (o.kind === 'lighthouse') return { label: 'Lumen Lighthouse', fn: () => Game.lighthouse() };
        return { label: o.label, fn: () => G.UI.say(o.npc && D.NPCS[o.npc] ? `${o.label}. ${D.NPCS[o.npc].name} is right outside, say hello!` : o.label) };
      case 'temple': return { label: 'Enter ' + o.label, fn: () => Game.enterTemple(o) };
      case 'cave': return { label: 'Enter ' + o.label, fn: () => Game.enterCave(o.biome, 1, true) };
      case 'bench': return { label: 'Sit and watch the world', fn: () => Game.sit(o) };
      case 'board': return { label: 'Read notice board', fn: () => G.UI.board(o.town) };
      case 'sign': return { label: 'Read sign', fn: () => G.UI.say(o.text) };
      case 'fountain': return { label: { xtree: 'Make a wish on the Frostbell tree', gmush: 'Make a wish under the great mushroom', totem: 'Make a wish at the totem', anvil: 'Make a wish at the Ember Anvil', anchor: 'Make a wish on the old anchor' }[o.style] || 'Toss a coin & make a wish', fn: () => Game.wish() };
      case 'station': return { label: 'Use ' + I[o.item].name, fn: () => G.UI.craft(o.station) };
      case 'furniture': {
        const it = I[o.item];
        if (it.bed) return { label: 'Sleep in bed', fn: () => G.UI.bed(), alt: 'Pick up' };
        if (it.station) return { label: 'Use ' + it.name, fn: () => G.UI.craft(it.station), alt: 'Pick up' };
        return { label: it.name, fn: () => G.UI.toast(['So cozy.', 'Looks great here!', 'Perfectly placed.'][(o.x + o.y) % 3]), alt: 'Pick up' };
      }
      case 'block': return { label: 'Stone block (walk into it to push)', fn: () => G.UI.toast('Walk into the block to push it.') };
      case 'gate':
        if (o.lock) return Sys.count('temple_key') ? { label: 'Unlock gate', fn: () => { Sys.take({ temple_key: 1 }); Game.solveRoom(o.room); } } : { label: 'Locked gate', why: 'Find the key somewhere in this room' };
        return { label: 'Sealed gate', why: 'Solve this room to open it' };
      case 'brazier': return o.lit ? null : { label: 'Light brazier', fn: () => Game.lightBrazier(o) };
      case 'crystal': return { label: 'Strike crystal', tool: '🗡️', fn: () => Game.strikeCrystal(o) };
      case 'pot': return { label: 'Break pot', tool: '🗡️', fn: () => Game.breakPot(o) };
      case 'crack': return { label: 'Break boulder', tool: '⛏️', fn: () => Game.hit(o, 'pickaxe') };
      case 'rune': return { label: 'Reset puzzle', fn: () => Game.resetRoom(o.room) };
      case 'altar': return o.shard ? { label: 'Take the Lumen Shard', fn: () => Game.takeShard(o) } : null;
      case 'ladder_down': return { label: 'Climb down', fn: () => Game.enterCave(Game.map.biome, Game.map.depth + 1) };
      case 'ladder_up': return { label: Game.map.depth > 1 ? 'Climb up' : 'Leave the mine', fn: () => (Game.map.depth > 1 ? Game.enterCave(Game.map.biome, Game.map.depth - 1) : Game.exitToOverworld()) };
      case 'boat': return { label: 'A little fishing boat', fn: () => G.UI.say('The boat bobs gently. Someone painted a tiny smiling fish on the side.') };
    }
    return null;
  };

  Game.removeObj = function (o, days) {
    const m = Game.map;
    m.remove(o);
    if (m === Game.over) { const d = days != null ? days : (G.OBJ[o.type].respawn || 2); G.S.removed[o.id] = d < 0 ? -1 : G.S.day + d; }
  };
  Game.objCenter = (o) => [(o.x + o.w / 2) * TS, (o.y + o.h) * TS - 6];
  Game.hit = function (o, tool) {
    const s = G.S;
    const emo = D.TOOLS[tool].icon;
    Game.swing(emo);
    const tier = s.tools[tool] || 1;
    if (o.hp == null) o.hp = o.type === 'tree' ? (o.kind === 'jungle' ? 4 : 3) : o.type === 'rock' ? ROCK[o.kind].hp : o.type === 'dig' ? 2 : 2;
    o.hp -= tier; o.shake = 0.25;
    const [cx, cy] = Game.objCenter(o);
    if (o.type === 'tree') { G.Audio.sfx('chop'); Game.burst(cx, cy - 10, o.kind === 'mush' ? '#c9a0ff' : '#6ab04a', 5, 60); }
    else if (o.type === 'dig') { G.Audio.sfx('chop'); Game.burst(cx, cy, '#a07a50', 8, 50); }
    else { G.Audio.sfx('mine'); Game.burst(cx, cy - 4, '#c8c0b8', 5, 70); }
    if (o.hp > 0) return;
    const r = Math.random;
    if (o.type === 'tree') {
      const drops = TREE_DROPS[o.kind].map((d) => (d[0] === 'apple' ? ['apple', 1, 2, o.v === 1 ? 0.8 : 0.05] : d));
      for (const [id, n] of Sys.roll(drops, r)) Sys.give(id, n);
      G.Audio.sfx('break'); Game.burst(cx, cy - 12, '#4a8a3a', 14, 90);
      Game.removeObj(o);
    } else if (o.type === 'rock') {
      const drops = ROCK_DROPS[o.kind];
      for (const [id, n0] of Sys.roll(drops, r)) {
        let n = n0;
        if (I[id].cat === 'ore' || id === 'coal') { if (r() < Sys.lvl('miner') * 0.05) n++; if (Sys.glimPerk('volcano') && r() < 0.2) n++; }
        Sys.give(id, n);
      }
      const depth = Game.map.depth || 0;
      for (const [g, ch] of GEMS[o.kind] || []) if (r() < ch * (1 + Sys.lvl('miner') * 0.1 + depth * 0.08)) Sys.give(g, 1);
      if (s.lic.miner) Sys.addXp('miner', ROCK[o.kind].xp + depth);
      Sys.stat('ores');
      G.Audio.sfx('break'); Game.burst(cx, cy - 4, '#8a8a92', 12, 90);
      Game.removeObj(o);
    } else if (o.type === 'crack') {
      Sys.give('stone', 2); G.Audio.sfx('break'); Game.burst(cx, cy - 4, '#8a8a92', 12, 90); Game.map.remove(o);
    } else if (o.type === 'dig') {
      const b = o.biome || Game.curBiome();
      const roll = r();
      if (roll < 0.55 + Sys.lvl('archaeologist') * 0.03) Sys.give('relic_' + b, 1);
      else if (roll < 0.75) Sys.give('pot_shard', 1);
      else Sys.give(U.pick(r, ['stone', 'fiber', 'coal', 'feather']), U.ri(r, 1, 2));
      if (r() < 0.04) Sys.give(U.pick(r, ['amethyst', 'topaz', 'old_coin']), 1);
      Sys.addXp('archaeologist', 12); Sys.stat('digs');
      Game.removeObj(o);
    }
  };
  Game.harvest = function (o) {
    const s = G.S, r = Math.random;
    const dbl = Sys.glimPerk('meadow') && r() < 0.3 ? 2 : 1;
    if (o.type === 'bush') { Sys.give(o.kind === 'snowberry' ? 'snowberry' : 'berries', U.ri(r, 2, 3) * dbl); Sys.give('fiber', U.ri(r, 1, 2)); }
    else if (o.type === 'grass') Sys.give('fiber', U.ri(r, 1, 2) * dbl);
    else if (o.type === 'forage') Sys.give(o.item, dbl);
    G.Audio.sfx('pick');
    const [cx, cy] = Game.objCenter(o); Game.burst(cx, cy, '#9ade6e', 6, 40);
    Game.removeObj(o);
    Sys.stat('forage');
  };
  Game.openChest = function (o) {
    const s = G.S, r = U.rng((o.id + 1) * 7919 + s.seed + (o.depth || 0) * 13 + (Game.map.kind === 'overworld' ? 0 : s.day));
    const [cx, cy] = Game.objCenter(o);
    G.Audio.sfx('quest'); Game.burst(cx, cy - 6, '#ffd23a', 16, 80);
    if (o.key) { Sys.give('temple_key', 1); G.UI.toast('🗝️ You found a Temple Key!'); }
    else if (o.egg) { s.eggs.push({ kind: o.egg, day: s.day }); G.UI.toast(`🥚 A Glimmer Egg! It will hatch by tomorrow morning (Sage Oona in Mosslight can hatch it right away).`); }
    else {
      for (const [id, n] of Sys.chestLoot(o, r)) { if (id === 'coins') Sys.addCoins(n); else Sys.give(id, n); }
      Sys.stat('chests'); Sys.addXp('explorer', 20);
      if (s.tmaps.includes(o.id)) s.tmaps = s.tmaps.filter((x) => x !== o.id);
    }
    if (Game.map === Game.over) Game.removeObj(o, -1); else Game.map.remove(o);
    Sys.checkQuests();
  };
  Game.sit = function (o) { const p = Game.player; p.sit = o; p.x = o.x * TS + 8; p.y = o.y * TS + 10; p.dir = 'down'; G.UI.toast('You sit and watch the world go by... (time passes faster while sitting)'); };
  Game.wish = function () {
    const s = G.S;
    if (s.coins < 1) return G.UI.toast('Not even a coin to toss...');
    if (s.buffs.wish === s.day) return G.UI.toast('You already made a wish today. It\'s working on it!');
    s.coins -= 1; s.buffs.wish = s.day;
    const r = Math.random();
    G.Audio.sfx('coin');
    if (r < 0.3) { Sys.addCoins(25); G.UI.toast('✨ The fountain sparkles and spits out 25 coins!'); }
    else if (r < 0.55) { s.buffs.speed = s.day; G.UI.toast('✨ You feel light on your feet today!'); }
    else if (r < 0.8) { for (const p of s.pets) p.happy = Math.min(100, p.happy + 15); G.UI.toast('✨ Your pets feel extra loved today!'); }
    else { Sys.give('glim_snack', 1); G.UI.toast('✨ A Starlight Snack floats up from the water!'); }
  };
  Game.petAction = function (e) {
    Sys.petPet(e.data); e.hearts = 1.2; G.Audio.sfx('pet');
    G.UI.petMenu(e.data);
  };
  Game.catchCritter = function (c) {
    const s = G.S;
    Game.swing('🥅');
    const chance = 0.7 + (s.tools.net - 1) * 0.06 + Sys.lvl('critter') * 0.025;
    if (Math.random() < chance) {
      Game.critters = Game.critters.filter((x) => x !== c);
      Sys.give(c.kind, 1); Sys.addXp('critter', 10); Sys.stat('critters'); G.Audio.sfx('catch');
      Game.burst(c.x, c.y - 4, '#ffffff', 8, 40);
    } else { c.flee = 1.5; G.Audio.sfx('miss'); G.UI.toast('It slipped away!'); }
    Sys.checkQuests();
  };
  Game.attack = function () {
    const p = Game.player, s = G.S;
    Game.swing('🗡️');
    const [dx, dy] = DIRS[p.dir];
    const dmg = s.tools.sword || 1;
    for (const e of Game.enemies) {
      const ex = e.x - p.x, ey = (e.y - 4) - (p.y - 4), d = Math.hypot(ex, ey);
      if (d < 22 && (ex * dx + ey * dy) > -4) {
        e.hp -= dmg; e.hurt = 0.3; e.kb = [dx * 140 + ex / (d || 1) * 40, dy * 140 + ey / (d || 1) * 40];
        G.Audio.sfx('hit'); Game.burst(e.x, e.y - 6, D.ENEMIES[e.kind].color, 6, 60);
        if (e.hp <= 0) {
          for (const [id, n] of Sys.roll(D.ENEMIES[e.kind].drops, Math.random)) Sys.give(id, n);
          Game.burst(e.x, e.y - 6, '#ffffff', 14, 90); Sys.stat('defeated');
        }
      }
    }
    const before = Game.enemies.length;
    Game.enemies = Game.enemies.filter((e) => e.hp > 0);
    if (Game.map.kind === 'temple' && before !== Game.enemies.length) Game.checkCombatRooms();
  };
  Game.eat = function (id) {
    const s = G.S, it = I[id];
    if (!it || !it.heal) return;
    if (!Sys.count(id)) return;
    Sys.take({ [id]: 1 });
    s.hp = Math.min(s.maxHp, s.hp + it.heal);
    G.Audio.sfx('eat'); G.UI.toast(`You ate ${it.name}. Yum!` + (s.settings.enemies ? ` (+${it.heal} ❤️)` : ''));
    G.UI.dirty();
  };
  Game.useItem = function (id) {
    const s = G.S, it = I[id];
    if (it.cat === 'food' || it.food) return Game.eat(id);
    if (id === 'tmap') {
      const ov = Game.over, cand = ov.objs.filter((o) => o.type === 'chest' && !o.gone && !s.tmaps.includes(o.id));
      if (!cand.length) return G.UI.toast('Every chest on the isles has already been found!');
      const p = Game.player; cand.sort((a, b) => Math.hypot(a.x * TS - p.x, a.y * TS - p.y) - Math.hypot(b.x * TS - p.x, b.y * TS - p.y));
      const c = cand[0]; s.tmaps.push(c.id); Sys.take({ tmap: 1 });
      for (let y = c.y - 4; y <= c.y + 4; y++) for (let x = c.x - 4; x <= c.x + 4; x++) if (ov.inb(x, y)) Game.explored[y * ov.W + x] = 1;
      return G.UI.toast('🗺️ A treasure chest has been marked on your map (❌)!');
    }
    if (id === 'speed_tonic') { Sys.take({ [id]: 1 }); s.buffs.speed = s.day; return G.UI.toast('🧪 You feel breezy! Faster for the rest of the day.'); }
    if (id === 'glow_tonic') { Sys.take({ [id]: 1 }); s.buffs.glow = s.day; return G.UI.toast('🧪 Your lantern glows brightly for the rest of the day.'); }
    if (id === 'boots' || id === 'bright_lantern') { s.gear[id === 'boots' ? 'boots' : 'lantern'] = true; Sys.take({ [id]: 1 }); return G.UI.toast(`${it.icon} ${it.name} equipped for good!`); }
    if (it.cat === 'hat') { s.look.hat = s.look.hat === it.icon ? '' : it.icon; s.look.hatId = s.look.hat ? id : ''; return G.UI.dirty(); }
    if (it.cat === 'furniture') {
      if (Game.map.kind !== 'home') return G.UI.toast('Furniture can be placed inside your cottage in Willowmere.');
      G.UI.close(); Game.placing = { item: id }; G.UI.toast('Choose a spot and press Space to place. Esc to cancel.');
    }
  };

  // ---------------- furniture placement ----------------
  Game.placeSpot = function () {
    const p = Game.player, [dx, dy] = DIRS[p.dir];
    const [tx, ty] = Game.tileOf(p.x + dx * 14, p.y - 4 + dy * 14);
    const m = Game.map;
    const ok = m.tile(tx, ty) === T.FLOOR && !m.objAt(tx, ty) && ty < m.H - 2 && !(tx === Math.floor(p.x / TS) && ty === Math.floor((p.y - 3) / TS));
    return { tx, ty, ok };
  };
  Game.placeConfirm = function () {
    const pl = Game.placing, sp = Game.placeSpot();
    if (!sp.ok) return G.UI.toast("Can't place that there.");
    if (!Sys.count(pl.item)) { Game.placing = null; return; }
    Sys.take({ [pl.item]: 1 });
    G.S.home.furniture.push({ item: pl.item, x: sp.tx, y: sp.ty });
    Game.map.add(G.mkObj('furniture', sp.tx, sp.ty, { item: pl.item, solid: I[pl.item].petbed ? 0 : 1 }));
    G.Audio.sfx('pick');
    if (!Sys.count(pl.item)) Game.placing = null;
    Sys.checkQuests();
  };
  Game.pickup = function () {
    if (Game.map.kind !== 'home' || !Game.target || Game.target.kind !== 'obj' || Game.target.ref.type !== 'furniture') return;
    const o = Game.target.ref, f = G.S.home.furniture, i = f.findIndex((x) => x.x === o.x && x.y === o.y && x.item === o.item);
    if (i >= 0) f.splice(i, 1);
    Game.map.remove(o); Sys.give(o.item, 1); G.Audio.sfx('pick');
  };

  // ---------------- fishing ----------------
  Game.startFishing = function (o) {
    const s = G.S;
    Game.swing('🎣');
    const [cx, cy] = Game.objCenter(o);
    Game.fishing = { spot: o, x: cx, y: cy, state: 'wait', t: (1.2 + Math.random() * 2.5) * (Sys.glimPerk('coast') ? 0.55 : 1) * (Sys.weather(o.biome) === 'rain' ? 0.75 : 1) };
    G.Audio.sfx('splash');
    Game.burst(cx, cy, '#cfefff', 8, 40);
  };
  Game.updateFishing = function (dt) {
    const f = Game.fishing; if (!f || f.state !== 'wait') return;
    f.t -= dt;
    if (f.t <= 0) {
      f.state = 'bite'; G.Audio.sfx('bite');
      const fish = Sys.fishFor(f.spot.biome || Game.curBiome(), Math.random);
      const bait = Sys.count('bait') > 0; if (bait) Sys.take({ bait: 1 });
      G.UI.fishing(fish, bait, (ok) => {
        if (ok) {
          Sys.give(fish, 1); Sys.addXp('fisher', 10 + I[fish].rarity * 8); Sys.stat('fish'); G.Audio.sfx('catch');
          Game.removeObj(f.spot); Game.burst(f.x, f.y, '#cfefff', 14, 60);
          if (Math.random() < 0.05) { Sys.give(U.pick(Math.random, ['pearl', 'shell', 'seaweed']), 1); }
        } else { G.Audio.sfx('miss'); G.UI.toast('The fish got away! Try again.'); }
        Game.fishing = null; Sys.checkQuests();
      });
    }
  };

  // ---------------- temples ----------------
  Game.pushBlock = function (o, dx, dy) {
    if (o.locked) return;
    const m = Game.map, nx = o.x + dx, ny = o.y + dy;
    if (m.solid(nx, ny)) return;
    const t = m.objAt(nx, ny); if (t && t.type !== 'plate') return;
    let plate = null; if (t && t.type === 'plate') plate = t;
    // blocks sit "on top of" plates: unplace plate from grid temporarily
    if (plate) m.unplace(plate);
    m.move(o, nx, ny);
    G.Audio.sfx('push');
    if (plate) { plate.on = true; o.locked = true; G.Audio.sfx('puzzle'); Game.solveRoom(o.room); }
  };
  Game.resetRoom = function (room) {
    const m = Game.map;
    for (const o of m.objs) if (o.type === 'block' && o.room === room && !o.locked && !o.gone) { if (!m.objAt(o.home[0], o.home[1])) m.move(o, o.home[0], o.home[1]); }
    G.Audio.sfx('teleport'); G.UI.toast('The rune glows and the block slides back into place.');
  };
  Game.lightBrazier = function (o) {
    o.lit = true; o.litT = o.timed ? 25 : 0;
    G.Audio.sfx('puzzle');
    const [cx, cy] = Game.objCenter(o); Game.burst(cx, cy - 12, '#ffb03a', 10, 50);
    const room = Game.map.rooms[o.room];
    const all = Game.map.objs.filter((x) => x.type === 'brazier' && x.room === o.room && !x.gone);
    if (all.every((x) => x.lit)) Game.solveRoom(o.room);
    else if (o.timed && !room.hinted) { room.hinted = true; G.UI.toast('🔥 These flames won\'t last long. Light them all quickly!'); }
  };
  Game.strikeCrystal = function (o) {
    Game.swing('🗡️');
    const m = Game.map, cs = m.objs.filter((x) => x.type === 'crystal' && x.room === o.room);
    if (m.rooms[o.room].solved) return;
    for (const c of cs) if (Math.abs(c.idx - o.idx) <= 1) c.on ^= 1;
    G.Audio.sfx('mine');
    if (cs.every((c) => c.on)) Game.solveRoom(o.room);
  };
  Game.breakPot = function (o) {
    Game.swing('🗡️'); G.Audio.sfx('break');
    const [cx, cy] = Game.objCenter(o); Game.burst(cx, cy, '#c97a4a', 10, 60);
    Game.map.remove(o);
    const r = Math.random();
    if (r < 0.4) Sys.addCoins(U.ri(Math.random, 3, 12)); else if (r < 0.5) Sys.give('pot_shard', 1);
  };
  Game.checkCombatRooms = function () {
    for (const r of Game.map.rooms) if (r.puzzle === 'combat' && !r.solved && !Game.enemies.some((e) => e.room === r.k)) Game.solveRoom(r.k);
  };
  Game.updateTemple = function (dt) {
    const m = Game.map;
    for (const o of m.objs) if (o.type === 'brazier' && o.lit && o.litT > 0 && !m.rooms[o.room].solved) { o.litT -= dt; if (o.litT <= 0) { o.lit = false; G.Audio.sfx('miss'); } }
    if (!G.S.settings.enemies) for (const r of m.rooms) if (r.puzzle === 'combat' && !r.solved) Game.solveRoom(r.k);
  };
  Game.solveRoom = function (k) {
    const m = Game.map, room = m.rooms[k];
    if (room.solved) return;
    room.solved = true;
    const gate = m.objs.find((o) => o.type === 'gate' && o.room === k);
    if (gate) { m.remove(gate); gate.open = true; const [cx, cy] = Game.objCenter(gate); Game.burst(cx, cy - 8, '#9af0ff', 20, 80); }
    G.Audio.sfx('gate'); G.UI.toast('✨ A gate rumbles open!');
    Sys.addXp('explorer', 30);
  };
  Game.takeShard = function (o) {
    const s = G.S, b = o.biome;
    o.shard = false; s.shards[b] = true; s.temples[b] = true;
    Sys.addXp('explorer', 80);
    G.Audio.sfx('level');
    const [cx, cy] = Game.objCenter(o); for (let i = 0; i < 40; i++) Game.particle(cx, cy - 16, { vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, g: 60, life: 1.5, color: D.GLIMMERS[b].glow, size: 1.5 });
    G.UI.banner('Lumen Shard recovered!', `${Object.keys(s.shards).length} of 7 shards`);
    Sys.checkQuests(); Sys.save();
  };
  Game.lighthouse = function () {
    const s = G.S;
    if (s.finale) return G.UI.say('The Lumen Lighthouse shines over all seven shores. Ships, fireflies and friends find their way home by its light.');
    const n = Object.keys(s.shards).length;
    G.UI.say(n >= 7 ? 'The shards hum in your bag. Talk to Captain Marlow to relight the lamp!' : `The great lamp is dark. A plaque reads: "Seven shards, seven shores." You have ${n} of 7 shards.`);
  };
  Game.finale = function () {
    const s = G.S;
    s.finale = true;
    const tw = Game.over.towns.coralcove;
    G.UI.fade(() => {
      Game.setMap(Game.over, (tw.cx - 13) * TS, (tw.cy + 8) * TS);
      s.time = 21 * 60;
      Game.fireworks = 12;
      G.UI.finale();
    }, 1200);
  };

  // ---------------- rendering ----------------
  Game.render = function (dt) {
    const c = Game.ctx, z = Game.zoom, map = Game.map, cv = Game.canvas;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = map.kind === 'overworld' ? '#2d6aa3' : '#0e0c14';
    c.fillRect(0, 0, cv.width, cv.height);
    let cx = Game.cam.x - Game.vw / 2, cy = Game.cam.y - Game.vh / 2;
    const mw = map.W * TS, mh = map.H * TS;
    if (map.kind !== 'overworld' || true) {
      cx = mw < Game.vw ? (mw - Game.vw) / 2 : U.clamp(cx, 0, mw - Game.vw);
      cy = mh < Game.vh ? (mh - Game.vh) / 2 : U.clamp(cy, 0, mh - Game.vh);
    }
    cx = Math.round(cx * z) / z; cy = Math.round(cy * z) / z;
    Game.view = { x: cx, y: cy };
    c.setTransform(z, 0, 0, z, -cx * z, -cy * z);
    // ground chunks
    const CH = A.CH * TS;
    for (let gy = Math.floor(cy / CH); gy <= Math.floor((cy + Game.vh) / CH); gy++) for (let gx = Math.floor(cx / CH); gx <= Math.floor((cx + Game.vw) / CH); gx++) {
      if (gx < 0 || gy < 0 || gx * A.CH >= map.W || gy * A.CH >= map.H) continue;
      c.drawImage(A.chunk(map, gx, gy), gx * CH, gy * CH);
    }
    if (map.chunks.size > 70) { const keep = new Set(); for (const k of map.chunks.keys()) { const [a, b] = k.split(',').map(Number); if (Math.abs(a * CH - cx) < CH * 3 && Math.abs(b * CH - cy) < CH * 3) keep.add(k); } for (const k of [...map.chunks.keys()]) if (!keep.has(k)) map.chunks.delete(k); }
    const tx0 = Math.floor(cx / TS) - 2, ty0 = Math.floor(cy / TS) - 2, tx1 = Math.ceil((cx + Game.vw) / TS) + 2, ty1 = Math.ceil((cy + Game.vh) / TS) + 6;
    const t = Game.t;
    // water sparkle
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const tt = map.tile(x, y); if (!A.isWater(tt) && tt !== T.LAVA) continue;
      const h = U.hash(x, y, 77), ph = (t * 0.6 + h * 10) % 4;
      if (ph < 0.5) { c.fillStyle = tt === T.LAVA ? 'rgba(255,230,120,0.8)' : 'rgba(255,255,255,0.55)'; c.fillRect(x * TS + 3 + h * 8, y * TS + 4 + ((h * 97) % 8), 3 - ph * 4, 1); }
    }
    // gather drawables
    const list = [];
    const objs = map.objsIn(tx0, ty0, tx1, ty1);
    for (const o of objs) {
      if (o.gone) continue;
      if (o.type === 'plate' || o.type === 'rune' || o.type === 'dig' || o.type === 'fish' || o.type === 'ladder_down' || o.type === 'exit' || o.type === 'torch') { Game.drawFlat(c, o); continue; }
      list.push({ y: (o.y + o.h) * TS - (o.type === 'grass' || o.type === 'forage' ? 4 : 0), o });
    }
    if (map.kind === 'overworld') {
      for (const n of Game.npcs) if (n.x > cx - 20 && n.x < cx + Game.vw + 20 && n.y > cy - 20 && n.y < cy + Game.vh + 40) list.push({ y: n.y, npc: n });
      for (const st of Game.strays) if (Math.abs(st.x - Game.cam.x) < Game.vw) list.push({ y: st.y, stray: st });
    }
    for (const e of Game.pets) list.push({ y: e.y, pet: e });
    for (const cr of Game.critters) list.push({ y: cr.y, crit: cr });
    for (const e of Game.enemies) list.push({ y: e.y, en: e });
    if (Game.player) list.push({ y: Game.player.y, player: 1 });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) {
      if (d.o) Game.drawObj(c, d.o);
      else if (d.npc) A.drawHuman(c, d.npc.x, d.npc.y, d.npc.look, d.npc.dir, d.npc.t, d.npc.moving, { seed: d.npc.seed });
      else if (d.stray) { A.drawPet(c, d.stray.x, d.stray.y, { species: d.stray.species, color: d.stray.color }, d.stray.face, d.stray.t, d.stray.moving); A.emoji(c, '💧', d.stray.x + 6, d.stray.y - 16 + Math.sin(t * 3) * 1.5, 6); }
      else if (d.pet) A.drawPet(c, d.pet.x, d.pet.y, d.pet.data, d.pet.face, d.pet.t, d.pet.moving, { hearts: d.pet.hearts > 0 ? (1.2 - d.pet.hearts) : 0 });
      else if (d.crit) Game.drawCritter(c, d.crit);
      else if (d.en) A.drawEnemy(c, d.en, t);
      else if (d.player) Game.drawPlayer(c);
    }
    for (const g of Game.glims) A.drawGlimmer(c, g.x, g.y, g.kind, g.t);
    // fishing line
    if (Game.fishing) {
      const p = Game.player, f = Game.fishing;
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(p.x + (p.dir === 'left' ? -6 : 6), p.y - 14); c.quadraticCurveTo((p.x + f.x) / 2, Math.min(p.y, f.y) - 10, f.x, f.y - 2); c.stroke();
      const bob = f.state === 'bite' ? Math.sin(t * 30) * 1.5 : Math.sin(t * 3) * 0.6;
      c.fillStyle = '#ff5a5a'; c.fillRect(f.x - 1, f.y - 3 + bob, 3, 2); c.fillStyle = '#fff'; c.fillRect(f.x - 1, f.y - 1 + bob, 3, 1);
      if (f.state === 'bite') A.emoji(c, '❗', f.x, f.y - 12, 9);
    }
    // particles
    for (const q of Game.particles) { c.globalAlpha = Math.max(0, Math.min(1, q.life / (q.max || 0.6))); c.fillStyle = q.color; c.fillRect(q.x, q.y, q.size, q.size); }
    c.globalAlpha = 1;
    // placement ghost
    if (Game.placing) { const sp = Game.placeSpot(); c.globalAlpha = 0.6; A.emoji(c, I[Game.placing.item].icon, sp.tx * TS + 8, sp.ty * TS + 8, 13, I[Game.placing.item].f); c.globalAlpha = 1; c.strokeStyle = sp.ok ? '#7dff9a' : '#ff6a6a'; c.lineWidth = 1; c.strokeRect(sp.tx * TS + 0.5, sp.ty * TS + 0.5, TS - 1, TS - 1); }
    Game.renderLight(c);
    Game.renderWeather(c);
    // target highlight
    const tg = Game.target;
    if (tg && tg.kind === 'obj') { const o = tg.ref; Game.drawBracket(c, o.x * TS, o.y * TS - (o.type === 'tree' ? 12 : 0), o.w * TS, o.h * TS + (o.type === 'tree' ? 12 : 0)); }
    else if (tg && tg.ref && tg.ref.x != null && tg.kind !== 'obj') Game.drawBracket(c, tg.ref.x - 8, tg.ref.y - 18, 16, 20);
    // overlays: npc markers/names
    if (map.kind === 'overworld' && !Game.title) {
      c.textAlign = 'center';
      for (const n of Game.npcs) {
        if (n.x < cx - 20 || n.x > cx + Game.vw + 20 || n.y < cy - 20 || n.y > cy + Game.vh + 40) continue;
        const mk = G.UI.npcMarker(n.id);
        if (mk) A.emoji(c, mk, n.x, n.y - 30 + Math.sin(t * 4) * 1.5, 9);
        if (Game.player && Math.hypot(n.x - Game.player.x, n.y - Game.player.y) < 44) Game.label(c, D.NPCS[n.id].name, n.x, n.y - 25);
        if (Sys.isNight() && !n.shop && G.S.time > 23 * 60 || (G.S.time < 5 * 60 && !n.shop)) A.emoji(c, '💤', n.x + 7, n.y - 24 + Math.sin(t * 2) * 1.5, 6);
      }
      for (const id in map.waystones) { const w = map.waystones[id]; if (Math.abs(w.x * TS - Game.player.x) < 40 && Math.abs(w.y * TS - Game.player.y) < 40) Game.label(c, w.label, w.x * TS + 8, w.y * TS - 32); }
    }
    for (const f of Game.floaters) {
      const a = 1 - Math.max(0, f.t - 1) / 0.6;
      c.globalAlpha = a;
      const y = f.y - f.t * 14;
      if (f.item) A.emoji(c, I[f.item].icon, f.x - Game.textW(c, f.text) / 2 - 5, y - 1.5, 7, I[f.item].f);
      else if (f.icon) A.emoji(c, f.icon, f.x - Game.textW(c, f.text) / 2 - 5, y - 1.5, 7);
      Game.label(c, f.text, f.x, y, true);
      c.globalAlpha = 1;
    }
    if (Game.fireworks) Game.renderFireworks(c, dt);
  };
  Game.textW = function (c, s) { c.font = '600 6px Fredoka, Nunito, sans-serif'; return c.measureText(s).width; };
  Game.label = function (c, s, x, y, plain) {
    c.font = '600 6px Fredoka, Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(s).width;
    if (!plain) { c.fillStyle = 'rgba(40,28,20,0.6)'; c.beginPath(); c.roundRect ? c.roundRect(x - w / 2 - 3, y - 4.5, w + 6, 9, 3) : c.rect(x - w / 2 - 3, y - 4.5, w + 6, 9); c.fill(); c.fillStyle = '#fff8ea'; c.fillText(s, x, y + 0.3); }
    else { c.lineWidth = 2; c.strokeStyle = 'rgba(40,28,20,0.75)'; c.strokeText(s, x, y); c.fillStyle = '#fff8ea'; c.fillText(s, x, y); }
  };
  Game.drawBracket = function (c, x, y, w, h) {
    const k = 3 + Math.sin(Game.t * 6) * 0.6, a = 'rgba(255,248,220,0.9)';
    c.fillStyle = a;
    for (const [px, py, sx, sy] of [[x - 1, y - 1, 1, 1], [x + w + 1, y - 1, -1, 1], [x - 1, y + h + 1, 1, -1], [x + w + 1, y + h + 1, -1, -1]]) { c.fillRect(Math.min(px, px + sx * k), py - (sy < 0 ? 1 : 0), k, 1); c.fillRect(px - (sx < 0 ? 1 : 0), Math.min(py, py + sy * k), 1, k); }
  };
  Game.drawPlayer = function (c) {
    const p = Game.player, s = G.S;
    if (p.inv > 0 && Math.floor(p.inv * 12) % 2) return;
    A.drawHuman(c, p.x, p.y, s.look, p.dir, p.t, p.moving, { sit: !!p.sit, swing: p.swing, tool: p.tool });
  };
  Game.drawCritter = function (c, cr) {
    const it = I[cr.kind];
    if (cr.kind === 'firefly') { const a = 0.5 + Math.sin(cr.t * 5) * 0.5; c.fillStyle = `rgba(255,250,150,${a})`; c.fillRect(cr.x - 1, cr.y - 6, 2, 2); return; }
    const by = cr.fly ? cr.y - 10 + Math.sin(cr.t * 6) * 2 : cr.y - 3;
    if (cr.fly) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(cr.x - 2, cr.y - 1, 4, 1); }
    c.save(); c.translate(cr.x, by); if (cr.vx < 0) c.scale(-1, 1);
    A.emoji(c, it.icon, 0, 0, cr.fly ? 7 + Math.abs(Math.sin(cr.t * 14)) * 0.8 : 7, it.f);
    c.restore();
  };
  Game.drawFlat = function (c, o) {
    const x = o.x * TS, y = o.y * TS, t = Game.t;
    switch (o.type) {
      case 'dig': c.drawImage(A.staticSprite('dig'), x + 1, y + 5); if ((t + o.id) % 3 < 0.4) { c.fillStyle = '#fff'; c.fillRect(x + 11, y + 3, 1, 1); } break;
      case 'fish': {
        const ph = (t * 0.8 + o.id * 0.37) % 2;
        c.strokeStyle = `rgba(255,255,255,${0.6 - ph * 0.3})`; c.lineWidth = 0.6; c.beginPath(); c.ellipse(x + 8, y + 9, 2 + ph * 4, 1 + ph * 2, 0, 0, 6.3); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.8)'; const b = (t * 2 + o.id) % 1; c.fillRect(x + 6 + (o.id % 4), y + 9 - b * 6, 1, 1); c.fillRect(x + 10 - (o.id % 3), y + 7 - ((b + 0.5) % 1) * 6, 1, 1);
        c.fillStyle = 'rgba(20,40,70,0.25)'; c.beginPath(); c.ellipse(x + 8 + Math.sin(t + o.id) * 2, y + 10, 3, 1.2, 0, 0, 6.3); c.fill();
        break;
      }
      case 'plate': c.drawImage(A.staticSprite(o.on ? 'plate_on' : 'plate'), x + 1, y + 1); break;
      case 'rune': c.drawImage(A.staticSprite('rune'), x + 1, y + 1); break;
      case 'ladder_down': c.drawImage(A.staticSprite('ladder_down'), x, y); break;
      case 'torch': {
        c.fillStyle = '#5a3a24'; c.fillRect(x + 7, y + 7, 2, 6);
        const f = Math.sin(t * 14 + o.id) * 0.8;
        c.fillStyle = '#ff8a2a'; c.fillRect(x + 6, y + 3 + f * 0.3, 4, 4); c.fillStyle = '#ffe08a'; c.fillRect(x + 7, y + 4 + f * 0.3, 2, 3);
        break;
      }
      case 'exit': c.fillStyle = 'rgba(255,240,200,0.15)'; c.fillRect(x, y, TS, TS); break;
    }
  };
  Game.drawObj = function (c, o) {
    const x = o.x * TS, y = o.y * TS, t = Game.t, s = G.S;
    let sx = 0; if (o.shake > 0) { o.shake -= 1 / 60; sx = Math.sin(t * 60) * 1; }
    const shadow = (w) => { c.fillStyle = 'rgba(0,0,0,0.18)'; A.ell(c, x + 8, y + 14, w, 2); };
    switch (o.type) {
      case 'tree': { const sp = A.treeSprite(o.kind, o.kind === 'mush' ? o.v : o.v % 2); shadow(Math.min(10, sp.width / 2.6)); c.drawImage(sp, Math.round(x + 8 - sp.width / 2 + sx), y + 16 - sp.height + 2); break; }
      case 'rock': { const sp = A.rockSprite(o.kind, o.biome || 'meadow'); c.drawImage(sp, x + sx, y + 1); break; }
      case 'bush': c.drawImage(A.bushSprite(o.kind), x + sx, y + 3); break;
      case 'grass': { const sp = A.bushSprite('grass'); c.save(); c.translate(x + 8, y + 15); c.transform(1, 0, Math.sin(t * 1.5 + o.x) * 0.12, 1, 0, 0); c.drawImage(sp, -8, -13); c.restore(); break; }
      case 'forage': { const it = I[o.item]; c.fillStyle = 'rgba(0,0,0,0.15)'; A.ell(c, x + 8, y + 13, 4, 1); A.emoji(c, it.icon, x + 8, y + 8 + Math.sin(t * 2 + o.id) * 0.5, 10, it.f); break; }
      case 'chest': c.drawImage(A.staticSprite(o.explorer ? 'xchest' : 'chest'), x + 1, y + 3); if (s.tmaps.includes(o.id)) A.emoji(c, '✨', x + 13, y + 2, 6); break;
      case 'waystone': {
        const active = s.ws[o.ws];
        c.drawImage(A.staticSprite('waystone'), x + 1, y + 16 - 28);
        const col = active ? `rgba(110,240,255,${0.7 + Math.sin(t * 3) * 0.3})` : 'rgba(150,150,170,0.6)';
        c.fillStyle = col; c.fillRect(x + 6, y - 4, 4, 4); c.fillRect(x + 7, y + 2, 2, 4);
        break;
      }
      case 'building': {
        if (o.kind === 'lighthouse') { const sp = A.lighthouseSprite(s.finale); c.drawImage(sp, x, (o.y + o.h) * TS - sp.height); if (s.finale) Game.beam(c, x + 24, (o.y + o.h) * TS - sp.height + 17); break; }
        const sp = A.buildingSprite(o.style, o.v);
        const by = (o.y + o.h) * TS - sp.height;
        c.drawImage(sp, x, by);
        if (o.sign) A.emoji(c, o.sign, x + 40, by + 52.5, 7);
        if (Sys.darkness() > 0.1) { c.fillStyle = `rgba(255,214,120,${Math.min(0.9, Sys.darkness() * 1.4)})`; for (const [wx, wy, ww, wh] of A.WINDOWS) c.fillRect(x + wx, by + wy, ww, wh); }
        break;
      }
      case 'temple': { const sp = A.templeSprite(o.biome); c.drawImage(sp, x, (o.y + o.h) * TS - sp.height); if (s.temples[o.biome]) A.emoji(c, '✨', x + 40, (o.y + o.h) * TS - sp.height + 12, 8); break; }
      case 'cave': { const sp = A.caveSprite(o.biome); c.drawImage(sp, x, (o.y + o.h) * TS - sp.height); break; }
      case 'lamp': c.drawImage(A.staticSprite('lamp'), x + 4, y + 16 - 26); break;
      case 'bench': c.drawImage(A.staticSprite('bench'), x - 3, y + 4); break;
      case 'board': c.drawImage(A.staticSprite('board'), x - 1, y - 4); break;
      case 'sign': c.drawImage(A.staticSprite('sign'), x + 2, y + 2); break;
      case 'fountain': {
        if (o.style) {
          const sp = A.staticSprite(o.style); c.fillStyle = 'rgba(0,0,0,0.18)'; A.ell(c, x + 24, y + 29, 18, 3); c.drawImage(sp, x, y + 32 - sp.height);
          if (o.style === 'anvil') { const f = Math.sin(t * 14); for (const bx of [x + 2, x + 40]) { c.fillStyle = '#4a4040'; c.fillRect(bx, y + 22, 6, 8); c.fillStyle = '#ff7a2a'; c.fillRect(bx, y + 18 + f * 0.5, 6, 5); c.fillStyle = '#ffd23a'; c.fillRect(bx + 1, y + 17 + f, 4, 3); } }
          if (o.style === 'xtree' && Math.floor(t * 2) % 2) { c.fillStyle = 'rgba(255,240,150,0.7)'; c.fillRect(x + 23, y + 32 - 62, 2, 2); }
          break;
        }
        c.drawImage(A.staticSprite('fountain'), x, y + 32 - 36);
        for (let i = 0; i < 4; i++) { const ph = (t * 1.5 + i / 4) % 1; c.fillStyle = 'rgba(200,240,255,0.8)'; c.fillRect(x + 24 + Math.sin(i * 1.7) * ph * 8, y - 2 + ph * ph * 16 - ph * 10, 1, 1); }
        break;
      }
      case 'deco': c.drawImage(A.staticSprite(o.spr), x, y + 5); break;
      case 'boat': c.drawImage(A.staticSprite('boat'), x - 4, y - 2 + Math.sin(t * 1.5) * 0.8); break;
      case 'station': {
        const it = I[o.item];
        c.fillStyle = '#7a5232'; c.fillRect(x + 1, y + 6, 14, 9); c.fillStyle = '#a8743f'; c.fillRect(x + 1, y + 6, 14, 2);
        A.emoji(c, it.icon, x + 8, y + 3, 11, it.f);
        break;
      }
      case 'furniture': { const it = I[o.item]; c.fillStyle = 'rgba(0,0,0,0.18)'; A.ell(c, x + 8, y + 14, 6, 2); A.emoji(c, it.icon, x + 8, y + 7, 14, it.f); break; }
      case 'block': c.drawImage(A.staticSprite('block'), x, y - 2); break;
      case 'gate': c.drawImage(A.staticSprite(o.lock ? 'lockdoor' : 'gate'), x, y - 8); break;
      case 'brazier': {
        c.drawImage(A.staticSprite('brazier'), x + 2, y);
        if (o.lit) { const f = Math.sin(t * 16 + o.id); c.fillStyle = '#ff7a2a'; c.fillRect(x + 4, y - 2 + f * 0.4, 8, 5); c.fillStyle = '#ffc04a'; c.fillRect(x + 5, y - 4 + f * 0.6, 6, 5); c.fillStyle = '#fff3b0'; c.fillRect(x + 7, y - 3, 2, 3); if (o.litT > 0 && o.litT < 8) { c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x + 2, y + 17, 12 * o.litT / 25, 1); } }
        break;
      }
      case 'crystal': c.drawImage(A.staticSprite(o.on ? 'crystal_on' : 'crystal_off'), x + 3, y - 1); break;
      case 'pot': c.drawImage(A.staticSprite('pot'), x + 3, y + 5); break;
      case 'crack': c.drawImage(A.staticSprite('crack'), x + sx, y + 1); break;
      case 'pillar': c.drawImage(A.staticSprite('pillar'), x + 1, y + 16 - 28); break;
      case 'altar': {
        c.drawImage(A.staticSprite('altar'), x, y + 16 - 24);
        if (o.shard) { const g = D.GLIMMERS[o.biome]; const bob = Math.sin(t * 2) * 2; const grd = c.createRadialGradient(x + 16, y - 10 + bob, 0, x + 16, y - 10 + bob, 14); grd.addColorStop(0, g.glow + 'cc'); grd.addColorStop(1, g.glow + '00'); c.fillStyle = grd; c.beginPath(); c.arc(x + 16, y - 10 + bob, 14, 0, 6.3); c.fill(); A.emoji(c, '💎', x + 16, y - 10 + bob, 11, 'hue-rotate(' + (D.BIOME_KEYS.indexOf(o.biome) * 50) + 'deg)'); }
        break;
      }
      case 'ladder_up': c.drawImage(A.staticSprite('ladder_up'), x, y + 16 - 22); break;
    }
  };
  Game.beam = function (c, x, y) {
    const a = Game.t * 0.8;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const s of [1, -1]) {
      const ang = a + (s > 0 ? 0 : Math.PI);
      const g = c.createLinearGradient(x, y, x + Math.cos(ang) * 220, y + Math.sin(ang) * 80);
      g.addColorStop(0, 'rgba(255,240,170,0.45)'); g.addColorStop(1, 'rgba(255,240,170,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x, y);
      c.lineTo(x + Math.cos(ang - 0.12) * 220, y + Math.sin(ang - 0.12) * 80); c.lineTo(x + Math.cos(ang + 0.12) * 220, y + Math.sin(ang + 0.12) * 80); c.fill();
    }
    c.restore();
  };

  // lighting
  Game.renderLight = function (c) {
    const map = Game.map, s = G.S;
    let dark = map.kind === 'overworld' ? (s ? Sys.darkness() : 0.15) : map.kind === 'home' ? (s ? Sys.darkness() * 0.5 : 0) : map.dark;
    const tint = map.kind === 'overworld' && s ? Sys.timeTint() : null;
    if (tint) { c.fillStyle = tint; c.fillRect(Game.view.x, Game.view.y, Game.vw, Game.vh); }
    if (dark <= 0.01) return;
    const L = Game.light, sc = 0.5, w = Math.ceil(Game.vw * sc), h = Math.ceil(Game.vh * sc);
    if (L.width !== w || L.height !== h) { L.width = w; L.height = h; }
    const x = L.getContext('2d');
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, w, h);
    x.fillStyle = map.kind === 'overworld' ? `rgba(14,18,48,${dark})` : `rgba(6,5,14,${dark})`;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out';
    const vx = Game.view.x, vy = Game.view.y;
    const lights = [];
    const add = (lx, ly, r, a) => { if (lx > vx - r && lx < vx + Game.vw + r && ly > vy - r && ly < vy + Game.vh + r) lights.push([lx, ly, r, a == null ? 1 : a]); };
    const p = Game.player;
    if (p && s) {
      let r = map.kind === 'overworld' ? 44 : 62;
      if (s.gear.lantern) r += 26; if (s.buffs.glow === s.day) r += 40; if (Sys.glimPerk('mushroom')) r += 22;
      add(p.x, p.y - 8, r);
    }
    for (const g of Game.glims) add(g.x, g.y, 30, 0.9);
    const objs = map.objsIn(Math.floor(vx / TS) - 4, Math.floor(vy / TS) - 4, Math.ceil((vx + Game.vw) / TS) + 4, Math.ceil((vy + Game.vh) / TS) + 8);
    for (const o of objs) {
      if (o.gone) continue;
      const ox = o.x * TS + 8, oy = o.y * TS;
      if (o.type === 'lamp') add(ox, oy - 4, 60);
      else if (o.type === 'torch') add(ox, oy + 6, 52);
      else if (o.type === 'brazier' && o.lit) add(ox, oy, 56);
      else if (o.type === 'waystone' && s && s.ws[o.ws]) add(ox, oy - 4, 30, 0.7);
      else if (o.type === 'building' && o.kind !== 'lighthouse') add(o.x * TS + 40, oy + 20, 54, 0.8);
      else if (o.type === 'building' && s && s.finale) add(o.x * TS + 24, oy - 70, 120);
      else if (o.type === 'tree' && o.kind === 'mush') add(ox, oy - 4, 22, 0.6);
      else if (o.type === 'rock' && (o.kind === 'lumen' || o.kind === 'crystal')) add(ox, oy + 6, 18, 0.6);
      else if (o.type === 'forage' && o.item === 'glowcap') add(ox, oy + 8, 14, 0.6);
      else if (o.type === 'furniture' && I[o.item].light) add(ox, oy + 6, I[o.item].light);
      else if (o.type === 'station' && o.station === 'furnace') add(ox, oy + 6, 46);
      else if (o.type === 'altar' && o.shard) add(o.x * TS + 16, oy - 8, 60);
      else if (o.type === 'ladder_up') add(ox, oy + 4, 40);
      else if (o.type === 'fountain') add(o.x * TS + 24, oy + (o.style ? -6 : 10), o.style ? 64 : 40, o.style ? 0.9 : 0.5);
    }
    if (map.kind === 'overworld') for (let ty = Math.floor(vy / TS) - 1; ty < (vy + Game.vh) / TS + 1; ty += 2) for (let tx = Math.floor(vx / TS) - 1; tx < (vx + Game.vw) / TS + 1; tx += 2) if (map.tile(tx, ty) === T.LAVA) add(tx * TS + 8, ty * TS + 8, 26, 0.7);
    for (const cr of Game.critters) if (cr.kind === 'firefly' || cr.kind === 'glow_snail') add(cr.x, cr.y - 6, 12, 0.8);
    for (const e of Game.enemies) if (e.kind === 'magma') add(e.x, e.y - 4, 24, 0.7);
    for (const [lx, ly, r, a] of lights) {
      const gx = (lx - vx) * sc, gy = (ly - vy) * sc, gr = r * sc;
      const g = x.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.65})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(gx, gy, gr, 0, 6.3); x.fill();
    }
    c.save(); c.imageSmoothingEnabled = true;
    c.drawImage(L, vx, vy, w / sc, h / sc);
    c.globalCompositeOperation = 'lighter';
    for (const [lx, ly, r, a] of lights) {
      if (r < 20) continue;
      const g = c.createRadialGradient(lx, ly, 0, lx, ly, r * 0.7);
      g.addColorStop(0, `rgba(255,180,90,${0.08 * a * dark})`); g.addColorStop(1, 'rgba(255,180,90,0)');
      c.fillStyle = g; c.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    c.restore();
  };
  // weather (screen space, drawn in world coords of the view)
  Game.renderWeather = function (c) {
    const map = Game.map; if (map.kind !== 'overworld' || !G.S && !Game.title) return;
    const b = Game.player && !Game.title ? Game.curBiome() : 'meadow';
    const w = G.S ? Sys.weather(b) : 'clear';
    const vx = Game.view.x, vy = Game.view.y, t = Game.t;
    if (w === 'rain') {
      c.fillStyle = 'rgba(30,40,80,0.12)'; c.fillRect(vx, vy, Game.vw, Game.vh);
      c.strokeStyle = 'rgba(200,220,255,0.45)'; c.lineWidth = 0.6; c.beginPath();
      for (let i = 0; i < 90; i++) { const px = vx + ((U.hash(i, 1, 3) * Game.vw + t * 40) % Game.vw), py = vy + ((U.hash(i, 2, 3) * Game.vh + t * 260) % Game.vh); c.moveTo(px, py); c.lineTo(px - 2, py + 7); }
      c.stroke();
    } else if (w === 'snow') {
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 70; i++) { const px = vx + ((U.hash(i, 1, 4) * Game.vw + Math.sin(t + i) * 10 + t * 8) % Game.vw + Game.vw) % Game.vw, py = vy + ((U.hash(i, 2, 4) * Game.vh + t * (20 + (i % 5) * 4)) % Game.vh); c.fillRect(px, py, 1 + (i % 2), 1 + (i % 2)); }
    } else if (w === 'ash') {
      for (let i = 0; i < 40; i++) { const px = vx + ((U.hash(i, 1, 5) * Game.vw + t * 6) % Game.vw), py = vy + Game.vh - ((U.hash(i, 2, 5) * Game.vh + t * 12) % Game.vh); c.fillStyle = i % 4 ? 'rgba(90,80,80,0.6)' : 'rgba(255,140,60,0.8)'; c.fillRect(px, py, 1, 1); }
    } else if (w === 'spores') {
      for (let i = 0; i < 40; i++) { const px = vx + ((U.hash(i, 1, 6) * Game.vw + Math.sin(t * 0.5 + i) * 14) % Game.vw + Game.vw) % Game.vw, py = vy + Game.vh - ((U.hash(i, 2, 6) * Game.vh + t * 6) % Game.vh); c.fillStyle = `rgba(190,170,255,${0.4 + Math.sin(t * 2 + i) * 0.3})`; c.fillRect(px, py, 1, 1); }
    } else if (b === 'meadow' || b === 'jungle') {
      if (Sys && G.S && !Sys.isNight()) for (let i = 0; i < 6; i++) { const px = vx + ((U.hash(i, 1, 7) * Game.vw + t * 12) % Game.vw), py = vy + ((U.hash(i, 2, 7) * Game.vh + t * 9 + Math.sin(t + i) * 6) % Game.vh); c.fillStyle = b === 'jungle' ? '#3a9a4a' : '#ffb0c8'; c.fillRect(px, py, 2, 1); }
    }
  };
  Game.renderFireworks = function (c, dt) {
    Game.fwT = (Game.fwT || 0) - dt;
    if (Game.fwT <= 0 && Game.fireworks > 0) {
      Game.fireworks--; Game.fwT = 0.7;
      const x = Game.view.x + Game.vw * (0.2 + Math.random() * 0.6), y = Game.view.y + Game.vh * (0.15 + Math.random() * 0.3);
      const col = U.pick(Math.random, ['#ff6a8a', '#ffd23a', '#6ff0ff', '#b48aff', '#7dff9a']);
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.28, sp = 40 + Math.random() * 30; Game.particle(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 30, life: 1.4, max: 1.4, color: col, size: 1.5 }); }
      G.Audio.sfx('splash');
    }
  };
  return Game;
})();
