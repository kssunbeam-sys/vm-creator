'use strict';
// Game rules that don't depend on rendering: inventory, professions, quests, pets, loot, museum, saving.
(() => {
  const U = G.U, D = G.D, I = D.ITEMS;
  const S = () => G.S;

  G.newState = (o) => ({
    v: 1, seed: o.seed, name: o.name || 'Traveler', look: o.look,
    coins: 300, inv: { treat: 2, cookie: 3 }, tools: { axe: 1, pickaxe: 1, sword: 1, brush: 0, rod: 0, net: 0 },
    lic: {}, xp: {}, day: 1, time: 8 * 60,
    settings: { enemies: !!o.enemies, dayLen: o.dayLen || 24, music: 0.45, sfx: 0.7, autoRun: false },
    map: 'overworld', px: null, py: null, lastWs: 'willowmere',
    removed: {}, explored: null, ws: { willowmere: true }, visited: { willowmere: true },
    quests: { active: {}, done: {} }, board: {}, npc: {},
    pets: [], strays: {}, glimmers: [], eggs: [], activeGlim: -1,
    museum: {}, seen: {}, stats: {}, gear: {}, buffs: {},
    home: { size: 0, furniture: [{ item: 'bed', x: 1, y: 2 }, { item: 'workbench', x: 11, y: 2 }, { item: 'plant', x: 12, y: 2 }, { item: 'table', x: 6, y: 4 }, { item: 'chair', x: 5, y: 4 }, { item: 'lamp', x: 3, y: 2 }] },
    temples: {}, shards: {}, finale: false, hp: 10, maxHp: 10, deepest: {}, tmaps: [], petId: 1,
  });

  const Sys = G.Sys = {
    // ---------------- inventory ----------------
    count(id) {
      const s = S();
      if (id[0] === '#') { const cat = id.slice(1); let n = 0; for (const k in s.inv) if (I[k] && I[k].cat === cat) n += s.inv[k]; return n; }
      return s.inv[id] || 0;
    },
    has(need) { for (const k in need) if (Sys.count(k) < need[k]) return false; return true; },
    take(need) {
      const s = S();
      for (const k in need) {
        let n = need[k];
        if (k[0] === '#') {
          const cat = k.slice(1), ids = Object.keys(s.inv).filter((i) => I[i] && I[i].cat === cat).sort((a, b) => I[a].price - I[b].price);
          for (const i of ids) { const t = Math.min(n, s.inv[i]); s.inv[i] -= t; n -= t; if (!s.inv[i]) delete s.inv[i]; if (!n) break; }
        } else { s.inv[k] -= n; if (s.inv[k] <= 0) delete s.inv[k]; }
      }
      G.UI && G.UI.dirty();
    },
    give(id, n, opts) {
      if (!I[id] || n <= 0) return;
      const s = S();
      s.inv[id] = (s.inv[id] || 0) + n;
      const first = !s.seen[id];
      s.seen[id] = 1;
      if (!(opts && opts.silent) && G.Game) G.Game.floater('+' + n + ' ' + I[id].name, id);
      if (first && ['fish', 'critter', 'artifact', 'gem'].includes(I[id].cat) && G.UI) G.UI.toast('📖 New ' + I[id].cat + ': ' + I[id].name + '!', I[id]);
      G.UI && G.UI.dirty();
    },
    addCoins(n) { S().coins += n; if (n > 0 && G.Game) G.Game.floater('+' + n + ' coins', null, '🪙'); G.UI && G.UI.dirty(); },
    stat(k, n) { const s = S(); s.stats[k] = (s.stats[k] || 0) + (n || 1); },
    buyPrice(id) { const it = I[id]; return it.buy || Math.max(5, Math.ceil(it.price * 2.5)); },

    // ---------------- professions ----------------
    lvl(p) { const s = S(); if (!s.lic[p]) return 0; const xp = s.xp[p] || 0; let l = 1; while (l < 10 && xp >= D.XP[l + 1]) l++; return l; },
    addXp(p, n) {
      const s = S(); if (!s.lic[p]) return;
      const b = Sys.lvl(p); s.xp[p] = (s.xp[p] || 0) + n; const a = Sys.lvl(p);
      if (a > b) { G.UI.toast(`⭐ ${D.PROFS[p].name} reached level ${a}!`); G.Audio.sfx('level'); }
    },
    grantLicense(p) {
      const s = S(); if (s.lic[p]) return;
      s.lic[p] = true; s.xp[p] = 0;
      const tool = D.PROFS[p].tool; if (tool && !s.tools[tool]) s.tools[tool] = 1;
      G.UI.toast(`📜 ${D.PROFS[p].name} licence earned!` + (tool ? ` You got a ${D.TOOLS[tool].name}.` : ''));
      G.Audio.sfx('level');
      G.UI.dirty();
    },
    maxProfLevel() { let m = 0; for (const p in D.PROFS) m = Math.max(m, Sys.lvl(p)); return m; },
    maxToolTier() { let m = 0; for (const t in S().tools) m = Math.max(m, S().tools[t]); return m; },

    // ---------------- time ----------------
    isNight() { const t = S().time; return t >= 20 * 60 || t < 6 * 60; },
    darkness() {
      const t = S().time / 60;
      if (t >= 7 && t < 18) return 0;
      if (t >= 18 && t < 20.5) return (t - 18) / 2.5 * 0.62;
      if (t >= 20.5 || t < 5) return 0.62;
      return 0.62 * (1 - (t - 5) / 2);
    },
    timeTint() { const t = S().time / 60; if (t >= 17 && t < 19.5) return 'rgba(255,140,60,' + (0.12 * Math.sin((t - 17) / 2.5 * Math.PI)) + ')'; if (t >= 5 && t < 7) return 'rgba(255,170,120,' + (0.1 * Math.sin((t - 5) / 2 * Math.PI)) + ')'; return null; },
    weather(bkey, day) {
      const h = U.hash(day || S().day, D.BIOME_KEYS.indexOf(bkey) + 3, 99);
      if (bkey === 'snow') return h < 0.6 ? 'snow' : 'clear';
      if (bkey === 'desert') return h < 0.05 ? 'rain' : 'clear';
      if (bkey === 'volcano') return 'ash';
      if (bkey === 'mushroom') return h < 0.3 ? 'rain' : 'spores';
      if (bkey === 'jungle') return h < 0.4 ? 'rain' : 'clear';
      return h < 0.22 ? 'rain' : 'clear';
    },
    glimPerk(kind) { const s = S(); const g = s.glimmers[s.activeGlim]; return !!(g && g.kind === kind); },
    speedMult() {
      const s = S(); let m = 1 + Sys.lvl('explorer') * 0.02;
      if (s.gear.boots) m += 0.15;
      if (s.buffs.speed === s.day) m += 0.25;
      return m;
    },

    // ---------------- loot ----------------
    roll(list, r) { // [[id,min,max,chance]]
      const out = [];
      for (const [id, a, b, ch] of list) if (r() < ch) out.push([id, U.ri(r, a, b)]);
      return out;
    },
    fishFor(bkey, r, bonus) {
      const s = S(), night = Sys.isNight(), rain = Sys.weather(bkey) === 'rain';
      const cands = D.FISH.filter((f) => f[5].includes(bkey) && (f[7] === 'any' || (f[7] === 'night') === night));
      const lv = Sys.lvl('fisher'), glim = Sys.glimPerk('snow') ? 6 : 0;
      const w = cands.map((f) => [f[0], f[6] === 1 ? 60 : f[6] === 2 ? 26 + lv * 2 + (rain ? 10 : 0) + (bonus || 0) : 6 + lv * 1.5 + glim + (rain ? 5 : 0) + (bonus || 0) / 2]);
      return w.length ? U.wpick(r, w) : 'minnow';
    },
    chestLoot(o, r) {
      const b = o.biome || G.Game.map.biome || 'meadow';
      const out = [['coins', U.ri(r, 40, 120) + (o.explorer ? 80 : 0) + (o.depth ? o.depth * 20 : 0)]];
      const pool = {
        meadow: ['daisy', 'apple', 'copper_ore', 'treat', 'amethyst', 'cap', 'acc_flower', 'vase', 'teddy'],
        coast: ['shell', 'pearl', 'coconut', 'bait', 'aquarium', 'shell_chime', 'straw_hat', 'aquamarine'],
        snow: ['frost_shard', 'iron_ore', 'aquamarine', 'earmuffs', 'snowman', 'candle', 'hot_cocoa'],
        mushroom: ['glowcap', 'crystal', 'spore_dust', 'mush_lamp', 'amethyst', 'mush_hat', 'glim_snack'],
        jungle: ['orchid', 'resin', 'emerald', 'silk', 'bonsai', 'leaf_hat', 'acc_star', 'tmap'],
        desert: ['gold_ore', 'topaz', 'desert_rose', 'relic_desert', 'cactus_pot', 'globe', 'acc_shades'],
        volcano: ['ember_shard', 'ruby', 'gold_ore', 'coal', 'flame_hat', 'iron_bar', 'lantern'],
      }[b] || ['stone'];
      const n = o.explorer ? 3 : 2;
      for (let i = 0; i < n; i++) { const id = U.pick(r, pool); out.push([id, I[id].cat === 'furniture' || I[id].cat === 'hat' || I[id].cat === 'petacc' ? 1 : U.ri(r, 1, 3)]); }
      if (r() < 0.35) out.push(['relic_' + b, 1]);
      return out;
    },
    cleanRelic(b, r) {
      const arts = D.ARTIFACTS.filter((a) => a[4] === b);
      const lv = Sys.lvl('archaeologist') + (Sys.glimPerk('desert') ? 4 : 0);
      const roll = r();
      if (roll < Math.max(0.05, 0.22 - lv * 0.02)) return r() < 0.5 ? 'pot_shard' : U.pick(r, ['amethyst', 'topaz', 'aquamarine']);
      const w = arts.map((a) => [a[0], a[5] === 2 ? 14 + lv * 3 : 40]);
      return U.wpick(r, w);
    },

    // ---------------- npcs & friendship ----------------
    npc(id) { const s = S(); return s.npc[id] || (s.npc[id] = { pts: 0, talk: 0, gift: 0 }); },
    hearts(id) { return Math.min(10, Math.floor(Sys.npc(id).pts / 100)); },
    befriend(id, n) { const f = Sys.npc(id), b = Sys.hearts(id); f.pts = Math.min(1000, f.pts + n); if (Sys.hearts(id) > b) G.UI.toast(`💗 ${D.NPCS[id].name} now has ${Sys.hearts(id)} hearts for you!`); },
    giftReaction(id, item) {
      const n = D.NPCS[id], it = I[item];
      const match = (list) => list.some((l) => l === item || (l[0] === '#' && it.cat === l.slice(1)));
      if (match(n.loves)) return 'love'; if (match(n.likes)) return 'like'; return 'ok';
    },

    // ---------------- quests ----------------
    qState(id) { const s = S(); return s.quests.done[id] ? 'done' : s.quests.active[id] ? 'active' : 'none'; },
    questAvailable(npcId) {
      const s = S(), out = [];
      for (const id in D.QUESTS) {
        const q = D.QUESTS[id];
        if (q.giver !== npcId || s.quests.done[id] || s.quests.active[id]) continue;
        if (q.pre && !q.pre.every((p) => s.quests.done[p])) continue;
        if (q.hearts && Sys.hearts(npcId) < q.hearts) continue;
        out.push(q);
      }
      return out;
    },
    acceptQuest(id) {
      const s = S(), q = D.QUESTS[id];
      s.quests.active[id] = { base: q.req.t === 'stat' ? (s.stats[q.req.stat] || 0) : 0 };
      G.UI.toast('📜 New quest: ' + q.title);
      G.Audio.sfx('quest');
      Sys.checkQuests();
    },
    countWhat(what) {
      const s = S();
      switch (what) {
        case 'licenses': return Object.keys(s.lic).length;
        case 'waystones': return Object.keys(s.ws).filter((k) => D.TOWNS[k]).length;
        case 'pets': return s.pets.length;
        case 'glimmers': return s.glimmers.length;
        case 'shards': return Object.keys(s.shards).length;
        case 'donations': return Object.keys(s.museum).length;
        case 'proflevel': return Sys.maxProfLevel();
        case 'toolTier': return Sys.maxToolTier();
        case 'furniture': return s.home.furniture.length;
        case 'depth': { let m = 0; for (const k in s.deepest) m = Math.max(m, s.deepest[k]); return m; }
      }
      return 0;
    },
    progress(id) {
      const s = S(), q = D.QUESTS[id], r = q.req, a = s.quests.active[id] || { base: 0 };
      switch (r.t) {
        case 'have': case 'deliver': { let cur = 0, need = 0; const parts = []; for (const k in r.items) { const c = Math.min(Sys.count(k), r.items[k]); cur += c; need += r.items[k]; parts.push(`${(I[k] || { name: k }).name} ${Sys.count(k)}/${r.items[k]}`); } return { cur, need, ok: cur >= need, text: parts.join(', ') }; }
        case 'talk': return { cur: 0, need: 1, ok: false, text: 'Talk to ' + D.NPCS[r.npc].name };
        case 'visit': { const ok = !!s.visited[r.place]; return { cur: ok ? 1 : 0, need: 1, ok, text: 'Visit ' + (G.Game.placeName(r.place)) }; }
        case 'temple': { const ok = !!s.temples[r.biome]; return { cur: ok ? 1 : 0, need: 1, ok, text: 'Complete the ' + D.TOWNS[D.BIOMES[D.BIOME_KEYS.indexOf(r.biome)].town].temple }; }
        case 'count': { const c = Sys.countWhat(r.what); const label = { licenses: 'Licences', waystones: 'Town Waystones', pets: 'Pets', glimmers: 'Glimmers', shards: 'Lumen Shards', donations: 'Museum donations', proflevel: 'Best profession level', toolTier: 'Best tool tier', furniture: 'Furniture placed at home', depth: 'Deepest mine level' }[r.what]; return { cur: Math.min(c, r.n), need: r.n, ok: c >= r.n, text: `${label} ${Math.min(c, r.n)}/${r.n}` }; }
        case 'stat': { const c = (s.stats[r.stat] || 0) - a.base; const label = { fish: 'Fish caught', critters: 'Critters caught', relics: 'Relics cleaned', chests: 'Chests opened', petted: 'Pets given' }[r.stat] || r.stat; return { cur: Math.min(c, r.n), need: r.n, ok: c >= r.n, text: `${label} ${Math.min(c, r.n)}/${r.n}` }; }
        case 'stray': { const ok = !!s.strays[r.biome]; return { cur: ok ? 1 : 0, need: 1, ok, text: 'Adopt the stray ' + D.PETS[D.STRAYS[r.biome]].name.toLowerCase() }; }
      }
      return { cur: 0, need: 1, ok: false, text: '' };
    },
    turnInNpc(id) { const q = D.QUESTS[id]; return q.turnin || q.giver; },
    completeQuest(id) {
      const s = S(), q = D.QUESTS[id];
      if (q.req.t === 'have' || q.req.t === 'deliver') Sys.take(q.req.items);
      delete s.quests.active[id]; s.quests.done[id] = s.day;
      const rw = q.reward || {};
      if (rw.coins) Sys.addCoins(rw.coins);
      if (rw.items) for (const k in rw.items) Sys.give(k, rw.items[k]);
      Sys.befriend(q.giver, 60);
      G.UI.toast('✅ Quest complete: ' + q.title);
      G.Audio.sfx('quest');
      if (rw.unlock === 'homeUpgrade') { s.home.size = Math.min(2, s.home.size + 1); G.Game.invalidateHome(); }
      if (rw.unlock === 'starterPet') setTimeout(() => G.UI.starterPet(), 50);
      if (rw.unlock === 'finale') setTimeout(() => G.Game.finale(), 50);
      G.UI.dirty();
    },
    checkQuests() {
      const s = S();
      for (const id in s.quests.active) {
        const q = D.QUESTS[id]; if (!q) { delete s.quests.active[id]; continue; }
        if (q.auto && Sys.progress(id).ok) Sys.completeQuest(id);
      }
    },

    // ---------------- notice boards ----------------
    board(town) {
      const s = S();
      let b = s.board[town];
      if (!b || b.day !== s.day) {
        const r = U.rng(s.day * 131 + D.TOWN_ORDER.indexOf(town) * 7 + s.seed);
        const pool = D.BOARD[D.BIOME_KEYS[D.TOWNS[town].biome]].slice();
        U.shuffle(r, pool);
        const npcs = Object.keys(D.NPCS).filter((k) => D.NPCS[k].town === town);
        b = s.board[town] = { day: s.day, reqs: pool.slice(0, 3).map((item) => { const p = I[item].price, n = p < 10 ? U.ri(r, 4, 8) : p < 30 ? U.ri(r, 2, 4) : 1; return { item, n, reward: Math.ceil(p * n * 1.8 + 25), npc: U.pick(r, npcs), done: false }; }) };
      }
      return b;
    },

    // ---------------- pets ----------------
    maxFollowers() { return S().lic.critter ? 2 : 1; },
    adoptPet(species, color, name, opts) {
      const s = S();
      const following = s.pets.filter((p) => p.follow).length;
      const p = { id: s.petId++, species, color: color | 0, name: name || U.pick(Math.random, D.PET_NAMES), acc: '', happy: 75, bond: 0, follow: following < Sys.maxFollowers(), petDay: 0, playDay: 0, treatDay: 0 };
      s.pets.push(p);
      if (opts && opts.stray) s.strays[opts.stray] = true;
      G.UI.toast(`🐾 ${p.name} the ${D.PETS[species].name} joined your family!`);
      G.Audio.sfx('pet');
      G.Game.syncPets();
      Sys.checkQuests();
      return p;
    },
    petHearts(p) { return Math.min(5, Math.floor(p.bond / 40)); },
    petPet(p) {
      const s = S();
      if (p.petDay !== s.day) { p.petDay = s.day; p.happy = Math.min(100, p.happy + 15); p.bond += 5; Sys.stat('petted'); }
      else p.happy = Math.min(100, p.happy + 2);
      Sys.checkQuests();
    },
    feedTreat(p) {
      const s = S();
      if (!Sys.count('treat')) return G.UI.toast('You have no Pet Treats. Pip and Hazel sell them!');
      Sys.take({ treat: 1 }); p.happy = Math.min(100, p.happy + 20);
      if (p.treatDay !== s.day) { p.treatDay = s.day; p.bond += 8; }
      G.UI.toast(`${p.name} munches happily! 🦴`); G.Audio.sfx('pet');
    },
    playWith(p) {
      const s = S();
      if (!Sys.count('toy_ball') && !Sys.count('toy_yarn')) return G.UI.toast('You need a Bouncy Ball or Yarn Ball to play.');
      if (p.playDay === s.day) { p.happy = Math.min(100, p.happy + 3); return G.UI.toast(`${p.name} is still tired from playing today.`); }
      p.playDay = s.day; p.happy = Math.min(100, p.happy + 25); p.bond += 10;
      G.UI.toast(`${p.name} had the best time playing! 🎾`); G.Audio.sfx('pet');
    },

    // ---------------- museum ----------------
    donatable(id) { const it = I[id]; return it && ['fish', 'critter', 'artifact', 'gem'].includes(it.cat) && !S().museum[id]; },
    donate(id) {
      const s = S(); if (!Sys.donatable(id) || !Sys.count(id)) return;
      Sys.take({ [id]: 1 }); s.museum[id] = s.day;
      const n = Object.keys(s.museum).length;
      for (const [k, rw] of D.MUSEUM_REWARDS) if (n === k) { G.UI.toast(`🏛️ Museum milestone: ${k} donations!`); if (rw.coins) Sys.addCoins(rw.coins); if (rw.items) for (const i in rw.items) Sys.give(i, rw.items[i]); }
      Sys.befriend('amara', 15);
      Sys.checkQuests();
    },
    museumTotal() { return D.FISH.length + D.CRITTERS.length + D.ARTIFACTS.length + 7; },

    // ---------------- saving ----------------
    KEY: 'lumen-isles-save-v1',
    save() {
      try {
        const s = S(); if (!s) return;
        const g = G.Game;
        if (g && g.player) { s.px = g.player.x; s.py = g.player.y; s.map = g.map.kind === 'overworld' || g.map.kind === 'home' ? g.map.kind : 'overworld'; if (s.map === 'overworld' && g.map.kind !== 'overworld') { s.px = g.returnPos[0]; s.py = g.returnPos[1]; } }
        if (g && g.explored) s.explored = Sys.packBits(g.explored);
        localStorage.setItem(Sys.KEY, JSON.stringify(s));
        return true;
      } catch (e) { console.warn('save failed', e); return false; }
    },
    load() { try { const raw = localStorage.getItem(Sys.KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } },
    hasSave() { try { return !!localStorage.getItem(Sys.KEY); } catch (e) { return false; } },
    wipe() { try { localStorage.removeItem(Sys.KEY); } catch (e) { /* ignore */ } },
    packBits(arr) { let s = ''; for (let i = 0; i < arr.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) if (arr[i + k]) b |= 1 << k; s += String.fromCharCode(b); } return btoa(s); },
    unpackBits(str, n) { const out = new Uint8Array(n); if (!str) return out; const s = atob(str); for (let i = 0; i < s.length; i++) { const b = s.charCodeAt(i); for (let k = 0; k < 8; k++) if (b & (1 << k)) out[i * 8 + k] = 1; } return out; },
  };
})();
