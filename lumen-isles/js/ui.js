'use strict';
// DOM user interface: HUD, dialogs, shops, crafting, journal tabs, fishing minigame, title screen.
G.UI = (() => {
  const U = G.U, D = G.D, I = D.ITEMS, Sys = G.Sys, A = G.Art, el = U.el, esc = U.esc;
  const $ = (id) => document.getElementById(id);
  const S = () => G.S;
  const UI = { talkingTo: null, isDirty: true, hudT: 0, mode: null, fish: null, markers: {}, markerT: 0, lastPrompt: null, bagCat: 'all', bagSel: null, colCat: 'fish', mapBase: null };

  const ic = (id, size) => { const it = I[id] || { icon: '❔' }; return `<span class="emo" style="${it.f ? 'filter:' + it.f + ';' : ''}${size ? 'font-size:' + size + 'px' : ''}">${it.icon}</span>`; };
  const coinsHTML = () => `🪙 <b>${S().coins.toLocaleString()}</b>`;
  const PET_EMO = { cat: '🐱', dog: '🐶', bunny: '🐰', hedgehog: '🦔', fox: '🦊', otter: '🦦', penguin: '🐧', axolotl: '🦎', frog: '🐸', fennec: '🦊', lizard: '🦎', redpanda: '🦝', capybara: '🦫' };
  const CAT_NAMES = { material: 'Material', ore: 'Ore', bar: 'Metal bar', gem: 'Gem', forage: 'Forage', ingredient: 'Ingredient', food: 'Food', fish: 'Fish', critter: 'Critter', relic: 'Relic', artifact: 'Artifact', furniture: 'Furniture', hat: 'Hat', petacc: 'Pet accessory', pet: 'Pet supplies', misc: 'Misc', quest: 'Quest item', gear: 'Gear' };

  // ---------------- overlay ----------------
  UI.open = function (node, cls) {
    const o = $('overlay'); o.innerHTML = ''; o.className = 'open' + (cls ? ' ' + cls : ''); o.append(node);
    UI.mode = cls || 'panel'; G.Audio.sfx('ui');
  };
  UI.close = function () {
    const o = $('overlay'); o.className = ''; o.innerHTML = '';
    UI.mode = null; UI.talkingTo = null;
    if (UI.fish) { const f = UI.fish; UI.fish = null; f.cb(false); }
    UI.dirty();
  };
  UI.isOpen = () => !!UI.mode;
  function panel(title, opts) {
    opts = opts || {};
    const root = el('div', { class: 'panel', style: opts.w ? `width:min(${opts.w}px, calc(100vw - 32px))` : '' });
    const h = el('div', { class: 'panel-h' }, el('h2', { html: title }));
    const coins = el('div', { class: 'coins', html: G.Game.title ? '' : coinsHTML() });
    h.append(coins, el('button', { class: 'x', onclick: () => (opts.onClose ? opts.onClose() : UI.close()) }, '✕'));
    root.append(h);
    let tabs = null;
    if (opts.tabs) { tabs = el('div', { class: 'tabs' }); root.append(tabs); }
    const body = el('div', { class: 'panel-b' });
    root.append(body);
    return { root, body, tabs, coins, refreshCoins: () => (coins.innerHTML = coinsHTML()) };
  }

  // ---------------- HUD ----------------
  UI.dirty = () => { UI.isDirty = true; };
  UI.startHud = function () {
    $('hud').classList.remove('hidden'); $('title').classList.add('hidden'); $('title').innerHTML = '';
    const m = $('hud-menu'); m.innerHTML = '';
    const btns = [['🎒', 'I', () => UI.journal('bag')], ['📜', 'Q', () => UI.journal('quests')], ['🗺️', 'M', () => UI.journal('map')], ['🐾', 'P', () => UI.journal('pets')], ['⭐', 'K', () => UI.journal('skills')], ['📖', 'C', () => UI.journal('collection')], ['⚙️', 'Esc', () => UI.journal('settings')]];
    for (const [e, k, fn] of btns) m.append(el('button', { onclick: (ev) => { ev.currentTarget.blur(); fn(); }, title: k }, el('span', { class: 'emo' }, e), el('span', { class: 'k' }, k)));
    $('hud-quest').onclick = () => UI.journal('quests');
    if (G.Input && G.Input.touch) { $('touch').classList.remove('hidden'); document.body.classList.add('touch'); }
    UI.dirty();
  };
  UI.renderHud = function () {
    const s = S(); if (!s) return;
    const G2 = G.Game, hr = s.time / 60;
    const tIcon = hr >= 20 || hr < 5 ? '🌙' : hr < 7 ? '🌅' : hr >= 18 ? '🌇' : '☀️';
    const w = G2.map.kind === 'overworld' ? Sys.weather(G2.curBiome()) : 'clear';
    const wIcon = { rain: ' 🌧️', snow: ' ❄️', ash: ' 🌋', spores: ' ✨' }[w] || '';
    $('hud-time').innerHTML = `${tIcon}${wIcon} Day ${s.day} · ${U.fmtTime(s.time)}${s.settings.dayLen === 0 ? ' ⏸️' : ''}`;
    $('hud-coins').innerHTML = coinsHTML();
    $('hud-place').innerHTML = `<b>${esc(G2.areaName || '')}</b>${G2.areaSub ? ' · ' + esc(G2.areaSub) : ''}`;
    if (s.settings.enemies) {
      let h = ''; for (let i = 0; i < s.maxHp / 2; i++) { const v = s.hp - i * 2; h += v >= 2 ? '❤️' : v === 1 ? '💔' : '🤍'; }
      $('hud-hp').innerHTML = `<span class="emo">${h}</span>`;
    } else $('hud-hp').innerHTML = '';
    // quest tracker
    const act = Object.keys(s.quests.active).filter((q) => D.QUESTS[q]);
    act.sort((a, b) => (D.QUESTS[b].main ? 1 : 0) - (D.QUESTS[a].main ? 1 : 0));
    if (act.length) {
      const q = D.QUESTS[act[0]], p = Sys.progress(act[0]);
      $('hud-quest').innerHTML = `<div class="qt">📜 ${esc(q.title)}</div><div class="qp">${p.ok ? '✅ Ready! Talk to ' + esc(D.NPCS[Sys.turnInNpc(act[0])].name) : esc(p.text)}</div>` + (act.length > 1 ? `<div class="muted">+${act.length - 1} more (Q)</div>` : '');
    } else $('hud-quest').innerHTML = '';
    // toolbar
    const tb = $('toolbar'); tb.innerHTML = '';
    for (const k of ['axe', 'pickaxe', 'brush', 'rod', 'net', 'sword']) {
      if (k === 'sword' && !s.settings.enemies) continue;
      const tier = s.tools[k] || 0, t = D.TOOLS[k];
      const d = el('div', { class: 'tool' + (tier ? '' : ' off'), title: tier ? `${D.TIER_NAMES[tier]} ${t.name}` : `${t.name} (not owned)` }, el('span', { class: 'emo' }, t.icon));
      if (tier) d.append(el('div', { class: 'tier', style: 'background:' + D.TIER_COLORS[tier] }));
      tb.append(d);
    }
    UI.isDirty = false; UI.hudT = 0;
  };
  UI.tick = function (dt) {
    UI.hudT += dt;
    if (UI.isDirty || UI.hudT > 0.5) UI.renderHud();
    UI.markerT -= dt; if (UI.markerT <= 0) { UI.markerT = 1; UI.computeMarkers(); }
    if (UI.fish) UI.fishTick(dt);
    if (UI.typing) UI.typeTick(dt);
  };
  UI.computeMarkers = function () {
    const s = S(); if (!s) return;
    const m = {};
    for (const id in D.NPCS) if (Sys.questAvailable(id).length) m[id] = '❗';
    for (const q in s.quests.active) {
      const Q = D.QUESTS[q]; if (!Q) continue;
      if (Q.req.t === 'talk') m[Q.req.npc] = '⭐';
      else if (!Q.auto && Sys.progress(q).ok) m[Sys.turnInNpc(q)] = '⭐';
    }
    UI.markers = m;
  };
  UI.npcMarker = (id) => UI.markers[id];
  UI.prompt = function (t) {
    const G2 = G.Game;
    let html = '', cls = '';
    if (G2.placing) html = `<kbd>Space</kbd>Place ${esc(I[G2.placing.item].name)} · <kbd>Esc</kbd>Cancel`;
    else if (G2.fishing) html = '🎣 Waiting for a bite...';
    else if (t) {
      const a = G2.actionFor(t);
      if (a) {
        if (a.why) { cls = 'locked'; html = `🔒 ${esc(a.label)} · ${esc(a.why)}`; }
        else html = `<kbd>Space</kbd>${a.tool ? `<span class="emo">${a.tool}</span> ` : ''}${esc(a.label)}` + (a.alt ? ` · <kbd>R</kbd>${a.alt}` : '');
      }
    }
    const key = html + cls;
    if (key !== UI.lastPrompt) { UI.lastPrompt = key; const p = $('prompt'); p.innerHTML = html; p.className = cls; }
  };
  UI.toast = function (text, item) {
    const box = $('toasts');
    const t = el('div', { class: 'toast', html: (item ? `<span class="emo" style="${item.f ? 'filter:' + item.f : ''}">${item.icon}</span> ` : '') + esc(text) });
    box.append(t);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 4200);
  };
  UI.banner = function (title, sub) {
    const b = $('banner'); b.innerHTML = `<div class="bt">${esc(title)}</div>${sub ? `<div class="bs">${esc(sub)}</div>` : ''}`;
    b.classList.add('show'); clearTimeout(UI.bannerT); UI.bannerT = setTimeout(() => b.classList.remove('show'), 2600);
  };
  UI.fade = function (cb, hold) {
    const f = $('fade'); f.classList.add('on');
    setTimeout(() => { try { cb(); } catch (e) { console.error(e); } setTimeout(() => f.classList.remove('on'), hold || 250); }, 360);
  };
  UI.flash = function () { const f = $('flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 60); };

  // ---------------- portraits ----------------
  function portrait(look, w, h, sc) {
    const c = A.mk(w * sc, h * sc), x = c.getContext('2d'), z = G.zoom;
    G.zoom = sc; x.scale(sc, sc); x.imageSmoothingEnabled = false;
    A.drawHuman(x, w / 2, h - 3, A.lookObj(look), 'down', 0.3, false, {});
    G.zoom = z; return c;
  }
  function petPortrait(pet, sc) {
    const c = A.mk(24 * sc, 24 * sc), x = c.getContext('2d'), z = G.zoom;
    G.zoom = sc; x.scale(sc, sc); x.imageSmoothingEnabled = false;
    A.drawPet(x, 12, 19, pet, 1, 0.5, false);
    G.zoom = z; return c;
  }

  // ---------------- dialogs ----------------
  UI.dialog = function (o) {
    const d = el('div', { class: 'dlg' });
    if (o.look) {
      const por = el('div', { class: 'por' }, portrait(o.look, 32, 40, 3));
      if (o.hearts != null) { let h = ''; for (let i = 0; i < 10; i++) h += i < o.hearts ? '💗' : '🤍'; por.append(el('div', { class: 'hearts emo' }, h)); }
      d.append(por);
    }
    const body = el('div', { class: 'body' });
    if (o.name) body.append(el('div', { class: 'nm' }, o.name));
    const tx = el('div', { class: 'tx' });
    body.append(tx);
    const opts = el('div', { class: 'opts' });
    for (const op of o.options || [{ label: 'OK', fn: UI.close }]) {
      const b = el('button', { class: 'btn ' + (op.cls || ''), onclick: () => { UI.finishType(); op.fn(); } }, op.label);
      opts.append(b);
    }
    body.append(opts);
    d.append(body);
    UI.open(d, 'dialog');
    UI.typing = { el: tx, text: o.text || '', i: 0, acc: 0 };
    d.addEventListener('click', (e) => { if (UI.typing && e.target.tagName !== 'BUTTON') UI.finishType(); });
    const first = opts.querySelector('button'); if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
  };
  UI.typeTick = function (dt) {
    const t = UI.typing; t.acc += dt * 70;
    const n = Math.min(t.text.length, Math.floor(t.acc));
    if (n !== t.i) { t.i = n; t.el.textContent = t.text.slice(0, n); }
    if (n >= t.text.length) UI.typing = null;
  };
  UI.finishType = function () { if (UI.typing) { UI.typing.el.textContent = UI.typing.text; UI.typing = null; } };
  UI.say = function (text, name, next) { UI.dialog({ name, text, options: [{ label: next ? 'Next ▸' : 'OK', fn: next || UI.close }] }); };
  UI.story = function (lines, name, look, done) {
    let i = 0;
    const step = () => {
      if (i >= lines.length) { UI.close(); if (done) done(); return; }
      const t = lines[i++];
      UI.dialog({ name, look, text: t, options: [{ label: i < lines.length ? 'Next ▸' : 'OK', fn: step }] });
    };
    step();
  };

  // ---------------- NPC conversations ----------------
  const INN_NPCS = new Set(); for (const k in D.TOWNS) for (const b of D.TOWNS[k].buildings) if (b.inn) INN_NPCS.add(b.npc);
  UI.talk = function (id) {
    const s = S(), n = D.NPCS[id];
    UI.talkingTo = id;
    for (const q in s.quests.active) {
      const Q = D.QUESTS[q];
      if (Q && Q.req.t === 'talk' && Q.req.npc === id) {
        Sys.completeQuest(q);
        return UI.npcSay(id, Q.done, () => UI.talk(id));
      }
    }
    const f = Sys.npc(id);
    if (f.talk !== s.day) { f.talk = s.day; Sys.befriend(id, 10); }
    const night = Sys.isNight();
    let line = U.pick(Math.random, n.lines);
    if (night && Math.random() < 0.4) line = U.pick(Math.random, ['Oh! Out for a night stroll? Me too. Well, sort of.', 'The stars are lovely tonight, aren\'t they?', '*yawn* Evening, friend.']);
    if (s.day === 1 && id === 'bramble' && !s.quests.done.main_welcome) line = `Ah, ${s.name}! Welcome, welcome! I'm Mayor Bramble. We've been expecting you.`;
    UI.talkMenu(id, line);
  };
  UI.npcSay = function (id, text, next) {
    const n = D.NPCS[id];
    UI.dialog({ name: n.name, look: n.look, hearts: Sys.hearts(id), text, options: [{ label: 'Continue ▸', fn: next || UI.close }] });
  };
  UI.talkMenu = function (id, text) {
    const s = S(), n = D.NPCS[id], f = Sys.npc(id);
    UI.talkingTo = id;
    const opts = [];
    for (const q in s.quests.active) {
      const Q = D.QUESTS[q]; if (!Q || Q.auto || Q.req.t === 'talk') continue;
      if (Sys.turnInNpc(q) === id && Sys.progress(q).ok) opts.push({ label: '⭐ ' + Q.title, cls: 'go', fn: () => { Sys.completeQuest(q); UI.npcSay(id, Q.done, () => UI.talk(id)); } });
    }
    const av = Sys.questAvailable(id);
    if (av.length) {
      const Q = av[0];
      opts.push({ label: '❗ ' + (Q.main ? Q.title : 'Any requests?'), cls: 'blue', fn: () => UI.dialog({ name: n.name, look: n.look, hearts: Sys.hearts(id), text: Q.offer, options: [{ label: '✔ Accept "' + Q.title + '"', cls: 'go', fn: () => { Sys.acceptQuest(Q.id); UI.talkMenu(id, 'Wonderful! Take your time.'); } }, { label: 'Maybe later', fn: () => UI.talkMenu(id, 'No rush at all.') }] }) });
    }
    for (const q in s.quests.active) { const Q = D.QUESTS[q]; if (Q && Q.giver === id && !(Sys.turnInNpc(q) === id && Sys.progress(q).ok)) opts.push({ label: '📜 About "' + Q.title + '"', fn: () => UI.talkMenu(id, Q.offer + '  (' + Sys.progress(q).text + ')') }); }
    if (n.shop) {
      const sh = D.SHOPS[n.shop];
      if (n.shop === 'licenses') opts.push({ label: '📜 Licences', fn: () => UI.licenses() });
      if (sh && sh.buy && sh.buy.length) opts.push({ label: '🛒 Shop', fn: () => UI.shop(n.shop, id) });
      if (sh && sh.upgrades) opts.push({ label: '🔨 Upgrade tools', fn: () => UI.upgrades() });
      if (n.shop === 'museum') opts.push({ label: '🏛️ Museum', fn: () => UI.museum() });
      if (n.shop === 'dig') opts.push({ label: '🔍 Clean relics', fn: () => UI.craft('relic') });
      if (n.shop === 'glimmer' && s.eggs.length) opts.push({ label: '🥚 Hatch my eggs', cls: 'pink', fn: () => { const eggs = s.eggs.splice(0); for (const e of eggs) G.Game.hatch(e.kind); UI.talkMenu(id, 'There, there... welcome to the world, little light!'); } });
      if (sh && sh.wardrobe) opts.push({ label: '👗 Wardrobe', fn: () => UI.wardrobe() });
      if (n.shop === 'lighthouse') opts.push({ label: '🗼 The Lighthouse', fn: () => G.Game.lighthouse() });
    }
    if (INN_NPCS.has(id)) opts.push({ label: '🛏️ Rest at the inn', fn: () => UI.bed(true) });
    if (f.gift !== s.day) opts.push({ label: '🎁 Give a gift', cls: 'pink', fn: () => UI.giftPicker(id) });
    opts.push({ label: '💬 Chat', fn: () => UI.talkMenu(id, U.pick(Math.random, n.lines)) });
    opts.push({ label: '👋 Bye', fn: UI.close });
    UI.dialog({ name: n.name, look: n.look, hearts: Sys.hearts(id), text, options: opts });
    UI.talkingTo = id;
  };
  UI.giftPicker = function (id) {
    const s = S(), n = D.NPCS[id];
    const P = panel('🎁 Gift for ' + esc(n.name), { w: 640, onClose: () => UI.talkMenu(id, 'Oh, no worries!') });
    const items = Object.keys(s.inv).filter((k) => I[k] && !['quest', 'gear'].includes(I[k].cat));
    if (!items.length) P.body.append(el('p', {}, 'Your bag is empty!'));
    const g = el('div', { class: 'grid' });
    for (const k of items) g.append(el('div', { class: 'slot', title: I[k].name, html: ic(k) + `<span class="n">${s.inv[k]}</span>`, onclick: () => {
      Sys.take({ [k]: 1 });
      const r = Sys.giftReaction(id, k);
      Sys.npc(id).gift = s.day;
      Sys.befriend(id, r === 'love' ? 80 : r === 'like' ? 45 : 20);
      G.Audio.sfx(r === 'love' ? 'quest' : 'pick');
      UI.talkMenu(id, r === 'love' ? `A ${I[k].name}?! I absolutely love this! Thank you!` : r === 'like' ? `Ooh, a ${I[k].name}. How thoughtful, thank you!` : `A ${I[k].name}! That's very kind of you.`);
    } }));
    P.body.append(el('p', { class: 'muted' }, `Tip: ${n.name} loves ${n.loves.filter((l) => l[0] !== '#').map((l) => I[l] ? I[l].name : l).slice(0, 2).join(' and ')}.`), g);
    UI.open(P.root);
  };

  // ---------------- shops ----------------
  function sellPrice(id, shopId) { const it = I[id], sh = D.SHOPS[shopId]; return Math.max(1, Math.floor(it.price * (sh && sh.bonus === it.cat ? 1.3 : 1))); }
  UI.shop = function (shopId, npcId, tab) {
    const s = S(), sh = D.SHOPS[shopId];
    const P = panel('🛒 ' + esc(sh.name), { tabs: true, onClose: () => (npcId ? UI.talkMenu(npcId, 'Come back any time!') : UI.close()) });
    tab = tab || 'buy';
    for (const [k, l] of [['buy', 'Buy'], ['sell', 'Sell']]) P.tabs.append(el('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => UI.shop(shopId, npcId, k) }, l));
    if (tab === 'buy') {
      for (const e of sh.buy) {
        if (typeof e === 'object' && e.pet) {
          const sp = D.PETS[e.pet];
          P.body.append(el('div', { class: 'row' }, el('div', { class: 'ic emo' }, PET_EMO[e.pet]), el('div', { class: 'nm', html: `Adopt a ${sp.name}<small>A loyal companion who follows you everywhere.</small>` }), el('div', { class: 'pr' }, '🪙 ' + e.price), el('button', { class: 'btn go sm', disabled: s.coins < e.price ? '' : null, onclick: () => UI.adopt(e.pet, e.price, () => UI.shop(shopId, npcId)) }, 'Adopt')));
          continue;
        }
        const id = typeof e === 'object' ? e.item : e, price = typeof e === 'object' ? e.price : Sys.buyPrice(id), it = I[id];
        const single = ['furniture', 'hat', 'petacc', 'gear'].includes(it.cat);
        const owned = Sys.count(id);
        const row = el('div', { class: 'row' }, el('div', { class: 'ic', html: ic(id) }), el('div', { class: 'nm', html: `${esc(it.name)}<small>${esc(it.desc || CAT_NAMES[it.cat] || '')}${it.heal ? ' · heals ' + it.heal : ''}${owned ? ' · have ' + owned : ''}</small>` }), el('div', { class: 'pr' }, '🪙 ' + price));
        const buy = (n) => { if (s.coins < price * n) return; s.coins -= price * n; Sys.give(id, n, { silent: true }); G.Audio.sfx('coin'); UI.shop(shopId, npcId, 'buy'); };
        row.append(el('button', { class: 'btn go sm', disabled: s.coins < price ? '' : null, onclick: () => buy(1) }, 'Buy'));
        if (!single) row.append(el('button', { class: 'btn sm', disabled: s.coins < price * 5 ? '' : null, onclick: () => buy(5) }, '×5'));
        P.body.append(row);
      }
    } else {
      const ids = Object.keys(s.inv).filter((k) => I[k] && I[k].cat !== 'quest' && I[k].cat !== 'gear').sort((a, b) => (I[a].cat > I[b].cat ? 1 : -1));
      if (!ids.length) P.body.append(el('p', {}, 'Nothing to sell!'));
      if (sh.bonus) P.body.append(el('p', { class: 'muted' }, `This shop pays 30% extra for ${CAT_NAMES[sh.bonus].toLowerCase()}s.`));
      for (const id of ids) {
        const it = I[id], v = sellPrice(id, shopId), n = s.inv[id];
        const sell = (k) => { Sys.take({ [id]: k }); s.coins += v * k; G.Audio.sfx('coin'); UI.shop(shopId, npcId, 'sell'); };
        P.body.append(el('div', { class: 'row' }, el('div', { class: 'ic', html: ic(id) }), el('div', { class: 'nm', html: `${esc(it.name)} ×${n}<small>${CAT_NAMES[it.cat] || ''}${Sys.donatable(id) ? ' · 🏛️ not yet in museum' : ''}</small>` }), el('div', { class: 'pr' }, '🪙 ' + v), el('button', { class: 'btn sm', onclick: () => sell(1) }, 'Sell 1'), el('button', { class: 'btn sm', onclick: () => sell(n) }, 'All')));
      }
    }
    UI.open(P.root);
  };
  UI.adopt = function (species, price, back, opts) {
    const s = S(), sp = D.PETS[species];
    let color = 0, name = U.pick(Math.random, D.PET_NAMES);
    const P = panel('🐾 Adopt a ' + sp.name, { w: 520, onClose: back || UI.close });
    const cv = el('div', {});
    const draw = () => { cv.innerHTML = ''; const c = petPortrait({ species, color }, 6); c.style.cssText = 'width:144px;height:144px;image-rendering:pixelated;background:#eaf6e0;border-radius:16px;border:3px solid #e2cfae'; cv.append(c); };
    draw();
    const sw = el('div', { class: 'sw' });
    sp.colors.forEach((cc, i) => { const d = el('span', { style: `background:linear-gradient(135deg, ${cc[0]} 60%, ${cc[1]} 60%)`, class: i === 0 ? 'on' : '', onclick: () => { color = i; [...sw.children].forEach((x, j) => x.classList.toggle('on', j === i)); draw(); } }); sw.append(d); });
    const inp = el('input', { type: 'text', value: name, maxlength: 14 });
    P.body.append(el('div', { style: 'display:flex;gap:18px;align-items:center;flex-wrap:wrap' }, cv, el('div', { style: 'flex:1;min-width:200px' }, el('div', {}, 'Colour'), sw, el('div', {}, 'Name'), inp,
      el('div', { style: 'margin-top:12px' }, el('button', { class: 'btn go', onclick: () => {
        if (price && s.coins < price) return UI.toast('Not enough coins.');
        if (price) s.coins -= price;
        if (opts && opts.stray) { if (!Sys.count('treat')) return UI.toast('You need a Pet Treat.'); Sys.take({ treat: 1 }); }
        Sys.adoptPet(species, color, inp.value.trim().slice(0, 14) || name, opts);
        if (opts && opts.stray) G.Game.strays = G.Game.strays.filter((x) => x.biome !== opts.stray);
        back ? back() : UI.close();
      } }, price ? `Adopt for 🪙 ${price}` : 'Welcome home!')))));
    UI.open(P.root);
  };
  UI.starterPet = function () {
    const P = panel('🐾 Choose your first friend', { w: 560 });
    P.body.append(el('p', {}, 'Hazel smiles: "These three have been waiting for someone just like you. Who will it be?"'));
    const row = el('div', { style: 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap' });
    for (const sp of ['cat', 'dog', 'bunny']) {
      const c = petPortrait({ species: sp, color: 0 }, 5); c.style.cssText = 'width:120px;height:120px;image-rendering:pixelated;background:#eaf6e0;border-radius:16px';
      row.append(el('div', { style: 'text-align:center' }, c, el('div', {}, el('button', { class: 'btn go', onclick: () => UI.adopt(sp, 0, () => { UI.close(); UI.npcSay('hazel', 'Oh, they adore you already! Pets follow you everywhere. Pet them, give treats, and check on them in the Pets menu (P).'); }) }, D.PETS[sp].name))));
    }
    P.body.append(row);
    UI.open(P.root);
  };
  UI.stray = function (st) {
    const sp = D.PETS[st.species];
    if (!Sys.count('treat')) return UI.say(`A little stray ${sp.name.toLowerCase()} watches you with big, hopeful eyes. It looks hungry... A Pet Treat might help (Pip and Hazel in Willowmere sell them).`);
    UI.dialog({ text: `The stray ${sp.name.toLowerCase()} sniffs at the treat in your pocket and wags hopefully. Offer it a treat?`, options: [{ label: '🦴 Offer a treat', cls: 'go', fn: () => {
      UI.adopt(st.species, 0, () => UI.close(), { stray: st.biome });
    } }, { label: 'Not now', fn: UI.close }] });
  };
  UI.petMenu = function (pet) { UI.toast(`${pet.name} loves the attention! 💗 (happiness ${Math.round(pet.happy)}%)`); };

  // ---------------- licences / upgrades ----------------
  UI.licenses = function () {
    const s = S();
    const P = panel('📜 Guild Licences', { w: 720, onClose: () => UI.talkMenu('rowan', 'Choose wisely, but don\'t worry too much. You can always learn more!') });
    P.body.append(el('p', { class: 'muted' }, 'Licences unlock crafts and tools. Each profession levels up as you practise it.'));
    for (const k in D.PROFS) {
      const p = D.PROFS[k], has = s.lic[k];
      P.body.append(el('div', { class: 'row' }, el('div', { class: 'ic emo' }, p.icon), el('div', { class: 'nm', html: `<b>${p.name}</b><small>${esc(p.desc)}</small>` }),
        has ? el('div', { class: 'pr' }, '✔ Lv ' + Sys.lvl(k)) : el('button', { class: 'btn go sm', disabled: s.coins < p.cost ? '' : null, onclick: () => { s.coins -= p.cost; Sys.grantLicense(k); Sys.checkQuests(); UI.licenses(); } }, `🪙 ${p.cost}`)));
    }
    UI.open(P.root);
  };
  UI.upgrades = function () {
    const s = S();
    const P = panel('🔨 Tool Upgrades', { w: 720, onClose: () => UI.talkMenu('brann', 'Swing true!') });
    P.body.append(el('p', { class: 'muted' }, 'Higher tiers hit harder and can break tougher veins. Rods, nets and dig kits get better results too.'));
    for (const k in D.TOOLS) {
      const t = D.TOOLS[k], tier = s.tools[k] || 0;
      if (!tier) { P.body.append(el('div', { class: 'row' }, el('div', { class: 'ic emo' }, t.icon), el('div', { class: 'nm', html: `${t.name}<small>Not owned yet (comes with a licence)</small>` }))); continue; }
      const nx = D.UPGRADES[tier + 1];
      const row = el('div', { class: 'row' }, el('div', { class: 'ic emo' }, t.icon), el('div', { class: 'nm', html: `<b>${D.TIER_NAMES[tier]} ${t.name}</b><small>${nx ? `Next: ${D.TIER_NAMES[tier + 1]}: ` + `<span class="need ${Sys.count(nx.bar) < nx.n ? 'no' : ''}">${ic(nx.bar)} ${Sys.count(nx.bar)}/${nx.n}</span> 🪙 ${nx.coins}` : 'Max tier!'}</small>` }));
      if (nx) row.append(el('button', { class: 'btn go sm', disabled: (s.coins < nx.coins || Sys.count(nx.bar) < nx.n) ? '' : null, onclick: () => { s.coins -= nx.coins; Sys.take({ [nx.bar]: nx.n }); s.tools[k] = tier + 1; G.Audio.sfx('level'); UI.toast(`✨ Your ${t.name} is now ${D.TIER_NAMES[tier + 1]}!`); Sys.checkQuests(); UI.upgrades(); } }, 'Upgrade'));
      P.body.append(row);
    }
    UI.open(P.root);
  };

  // ---------------- crafting ----------------
  UI.craft = function (station) {
    const s = S();
    const names = { workbench: '🛠️ Workbench', stove: '♨️ Stove', furnace: '🔥 Furnace', relic: '🔍 Relic Table' };
    const P = panel(names[station] || 'Craft', { w: 760 });
    if (station === 'relic') {
      if (!s.lic.archaeologist) P.body.append(el('p', {}, '🔒 You need the Archaeologist licence to clean relics.'));
      P.body.append(el('p', { class: 'muted' }, 'Gently brush away centuries of dust to reveal what each relic really is.'));
      const relics = D.BIOME_KEYS.filter((b) => Sys.count('relic_' + b));
      if (!relics.length) P.body.append(el('p', {}, 'You have no dusty relics. Dig them up at dig spots (little cracked mounds) with a Dig Kit.'));
      for (const b of relics) {
        P.body.append(el('div', { class: 'row' }, el('div', { class: 'ic', html: ic('relic_' + b) }), el('div', { class: 'nm', html: `Dusty Relic (${D.BIOMES[D.BIOME_KEYS.indexOf(b)].name}) ×${Sys.count('relic_' + b)}` }),
          el('button', { class: 'btn go sm', disabled: s.lic.archaeologist ? null : '', onclick: () => {
            Sys.take({ ['relic_' + b]: 1 }); const r = Sys.cleanRelic(b, Math.random); Sys.give(r, 1, { silent: true }); Sys.addXp('archaeologist', 10); Sys.stat('relics');
            G.Audio.sfx(I[r].cat === 'artifact' ? 'quest' : 'pick'); UI.toast(`Revealed: ${I[r].name}!`, I[r]); Sys.checkQuests(); UI.craft('relic');
          } }, 'Clean')));
      }
      return UI.open(P.root);
    }
    const recs = D.RECIPES.filter((r) => r.station === station);
    if (station === 'stove' && !s.lic.chef) P.body.append(el('p', {}, '🔒 Cooking requires the Chef licence (Guild Hall, Willowmere). Ingredients are sold at grocers in every town!'));
    if (station === 'furnace' && !s.lic.blacksmith) P.body.append(el('p', {}, '🔒 Smelting requires the Blacksmith licence. You can also buy bars at the Forge in Emberforge.'));
    for (const r of recs) {
      const locked = r.prof && (!s.lic[r.prof] || Sys.lvl(r.prof) < r.lvl);
      const ok = !locked && Sys.has(r.need);
      const it = I[r.out];
      const needs = Object.keys(r.need).map((k) => { const have = Sys.count(k), n = r.need[k]; const lab = k[0] === '#' ? `<span class="emo">🐟</span> any ${k.slice(1)}` : ic(k) + ' ' + esc(I[k].name); return `<span class="need ${have < n ? 'no' : ''}">${lab} ${have}/${n}</span>`; }).join('');
      const row = el('div', { class: 'row', style: locked ? 'opacity:.55' : '' }, el('div', { class: 'ic', html: ic(r.out) }), el('div', { class: 'nm', html: `<b>${esc(it.name)}${r.n > 1 ? ' ×' + r.n : ''}</b>${locked ? ` <span class="muted">🔒 ${D.PROFS[r.prof].name} Lv ${r.lvl}</span>` : ''}<small>${needs}</small>` }));
      const make = (times) => {
        for (let i = 0; i < times && Sys.has(r.need); i++) {
          Sys.take(r.need); Sys.give(r.out, r.n, { silent: true });
          if (r.prof) Sys.addXp(r.prof, station === 'stove' ? 12 : station === 'furnace' ? 8 : 10);
          Sys.stat(station === 'stove' ? 'cooked' : 'crafted');
        }
        G.Audio.sfx(station === 'stove' ? 'eat' : 'pick'); UI.toast(`Made ${it.name}!`, it); Sys.checkQuests(); UI.craft(station);
      };
      row.append(el('button', { class: 'btn go sm', disabled: ok ? null : '', onclick: () => make(1) }, station === 'stove' ? 'Cook' : station === 'furnace' ? 'Smelt' : 'Craft'));
      row.append(el('button', { class: 'btn sm', disabled: ok ? null : '', onclick: () => make(5) }, '×5'));
      P.body.append(row);
    }
    UI.open(P.root);
  };

  // ---------------- museum ----------------
  UI.museum = function (cat) {
    const s = S(); cat = cat || 'fish';
    const P = panel('🏛️ Grand Museum', { tabs: true, w: 760, onClose: () => UI.talkMenu('amara', 'Thank you for supporting the museum!') });
    for (const [k, l] of [['fish', '🐟 Fish'], ['critter', '🦋 Critters'], ['artifact', '🏺 Artifacts'], ['gem', '💎 Gems']]) P.tabs.append(el('button', { class: 'tab' + (cat === k ? ' on' : ''), onclick: () => UI.museum(k) }, l));
    const n = Object.keys(s.museum).length;
    const next = D.MUSEUM_REWARDS.find(([k]) => k > n);
    const newOnes = Object.keys(s.inv).filter((k) => Sys.donatable(k));
    P.body.append(el('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap' }, el('div', { style: 'flex:1', html: `<b>${n}</b> / ${Sys.museumTotal()} donated${next ? ` · next reward at ${next[0]}` : ''}` }),
      el('button', { class: 'btn go', disabled: newOnes.length ? null : '', onclick: () => { for (const k of newOnes) Sys.donate(k); G.Audio.sfx('quest'); UI.toast(`Donated ${newOnes.length} item${newOnes.length > 1 ? 's' : ''}!`); UI.museum(cat); } }, `Donate all new (${newOnes.length})`)));
    const ids = Object.keys(I).filter((k) => I[k].cat === cat);
    const g = el('div', { class: 'grid' });
    for (const k of ids) {
      const don = s.museum[k], seen = s.seen[k], have = Sys.count(k);
      g.append(el('div', { class: 'slot' + (don ? ' don' : '') + (!seen ? ' unk' : ''), title: seen ? I[k].name + (don ? ' (donated)' : have ? ' (click to donate)' : '') : '???', html: seen ? ic(k) + (have && !don ? '<span class="n">✚</span>' : '') : '❔', onclick: () => { if (!don && have) { Sys.donate(k); G.Audio.sfx('pick'); UI.museum(cat); } } }));
    }
    P.body.append(g);
    UI.open(P.root);
  };

  // ---------------- notice board ----------------
  UI.board = function (town) {
    const s = S(), b = Sys.board(town);
    const P = panel('📋 ' + esc(D.TOWNS[town].name) + ' Notice Board', { w: 640 });
    P.body.append(el('p', { class: 'muted' }, 'Little favours for neighbours. New requests are posted every morning.'));
    for (const r of b.reqs) {
      const have = Sys.count(r.item), it = I[r.item];
      P.body.append(el('div', { class: 'row', style: r.done ? 'opacity:.5' : '' }, el('div', { class: 'ic', html: ic(r.item) }), el('div', { class: 'nm', html: `${esc(D.NPCS[r.npc].name)} wants <b>${r.n} ${esc(it.name)}</b><small>Reward: 🪙 ${r.reward} + friendship · you have ${have}</small>` }),
        r.done ? el('div', { class: 'pr' }, '✔ Done') : el('button', { class: 'btn go sm', disabled: have >= r.n ? null : '', onclick: () => { Sys.take({ [r.item]: r.n }); r.done = true; Sys.addCoins(r.reward); Sys.befriend(r.npc, 40); G.Audio.sfx('quest'); UI.board(town); } }, 'Deliver')));
    }
    UI.open(P.root);
  };

  // ---------------- travel ----------------
  UI.travel = function (from) {
    const s = S(), ov = G.Game.over;
    const P = panel('💠 Waystone Travel', { w: 620 });
    P.body.append(el('p', { class: 'muted' }, 'Touch a Waystone once and you can return to it from anywhere, any time, for free. You can also click Waystones on your map (M).'));
    const groups = [['Towns', D.TOWN_ORDER], ['Temples', D.BIOME_KEYS.map((b) => 'temple_' + b)], ['Mines', D.BIOME_KEYS.map((b) => 'cave_' + b)]];
    for (const [title, ids] of groups) {
      const list = ids.filter((id) => ov.waystones[id]);
      if (!list.length) continue;
      P.body.append(el('h3', {}, title));
      for (const id of list) {
        const on = s.ws[id], w = ov.waystones[id];
        P.body.append(el('div', { class: 'row' }, el('div', { class: 'ic emo' }, on ? '💠' : '🔘'), el('div', { class: 'nm', html: `${esc(on ? w.label.replace(' Waystone', '') : '???')}${id === from ? ' <small>You are here</small>' : ''}` }),
          on && id !== from ? el('button', { class: 'btn blue sm', onclick: () => G.Game.teleport(id) }, 'Travel') : el('span', { class: 'muted' }, on ? '' : 'Not yet visited')));
      }
    }
    UI.open(P.root);
  };
  UI.bed = function (inn) {
    const night = Sys.isNight() || S().time >= 18 * 60;
    UI.dialog({ name: inn ? 'Cozy inn bed' : 'Your bed', text: night ? 'The pillow looks very soft. Time for bed?' : 'It\'s still daytime, but a little rest never hurt anyone.', options: [
      { label: '🌙 Sleep until morning', cls: 'go', fn: () => G.Game.sleep() },
      { label: '😴 Nap for 2 hours', fn: () => G.Game.sleep(2) },
      { label: 'Not yet', fn: UI.close }] });
  };

  // ---------------- fishing minigame ----------------
  UI.fishing = function (fishId, bait, cb) {
    const s = S(), it = I[fishId], rar = it.rarity || 1;
    const zoneW = U.clamp(0.26 + Sys.lvl('fisher') * 0.015 + (bait ? 0.08 : 0) + ((s.tools.rod || 1) - 1) * 0.03 - (rar - 1) * 0.055, 0.12, 0.55);
    const d = el('div', { class: 'card fish' });
    const bar = el('div', { class: 'fbar' }), zone = el('div', { class: 'zone' }), mark = el('div', { class: 'mark' });
    bar.append(zone, mark);
    const dots = el('div', { class: 'fdots' });
    d.append(el('h2', {}, '🎣 Something\'s biting!'), el('div', { class: 'muted' }, 'Difficulty ' + '★'.repeat(rar) + '☆'.repeat(3 - rar) + (bait ? ' · bait helps!' : '')), bar, dots, el('div', { class: 'muted' }, 'Press Space (or click) when the marker is in the green zone. 3 hits to reel it in!'));
    d.addEventListener('mousedown', (e) => { e.preventDefault(); UI.fishHit(); });
    UI.open(d, 'fishing');
    UI.fish = { fishId, cb, zoneW, rar, t: Math.random() * 6, pos: 0, dir: 1, hits: 0, miss: 0, zone, mark, dots, speed: 0.75 + rar * 0.22, zs: 0.5 + rar * 0.3, zc: 0.5, cool: 0 };
    UI.fishTick(0);
  };
  UI.fishTick = function (dt) {
    const f = UI.fish;
    f.t += dt; if (f.cool > 0) f.cool -= dt;
    f.pos += f.dir * f.speed * dt; if (f.pos > 1) { f.pos = 1; f.dir = -1; } if (f.pos < 0) { f.pos = 0; f.dir = 1; }
    f.zc = 0.5 + Math.sin(f.t * f.zs) * (0.5 - f.zoneW / 2) * 0.85;
    f.zone.style.left = ((f.zc - f.zoneW / 2) * 100) + '%'; f.zone.style.width = (f.zoneW * 100) + '%';
    f.mark.style.left = (f.pos * 100) + '%';
    f.dots.textContent = '🐟'.repeat(f.hits) + '○'.repeat(3 - f.hits) + '   ' + '💧'.repeat(f.miss);
  };
  UI.fishHit = function () {
    const f = UI.fish; if (!f || f.cool > 0) return;
    f.cool = 0.15;
    if (Math.abs(f.pos - f.zc) <= f.zoneW / 2 + 0.01) {
      f.hits++; G.Audio.sfx('bite');
      if (f.hits >= 3) { UI.fish = null; UI.close(); f.cb(true); UI.toast(`You caught a ${I[f.fishId].name}!`, I[f.fishId]); return; }
      f.t += 1.7;
    } else {
      f.miss++; G.Audio.sfx('miss');
      if (f.miss >= 3) { UI.fish = null; UI.close(); f.cb(false); return; }
    }
    UI.fishTick(0);
  };

  // ---------------- journal ----------------
  const TABS = [['bag', '🎒 Bag'], ['quests', '📜 Quests'], ['skills', '⭐ Skills'], ['pets', '🐾 Pets'], ['collection', '📖 Collection'], ['map', '🗺️ Map'], ['settings', '⚙️ Settings']];
  UI.journal = function (tab) {
    if (UI.mode === 'journal' && UI.jTab === tab) return UI.close();
    UI.jTab = tab;
    const P = panel(G.S.name + '\'s Journal', { tabs: true, w: 880 });
    for (const [k, l] of TABS) P.tabs.append(el('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => UI.journal(k) }, l));
    ({ bag: tabBag, quests: tabQuests, skills: tabSkills, pets: tabPets, collection: tabCollection, map: tabMap, settings: tabSettings })[tab](P.body, P);
    UI.open(P.root, 'journal');
    UI.mode = 'journal';
  };
  function tabBag(B) {
    const s = S();
    const cats = [['all', 'All'], ['mat', 'Materials'], ['food', 'Food'], ['ingredient', 'Ingredients'], ['catch', 'Fish & Critters'], ['treasure', 'Treasures'], ['furniture', 'Furniture'], ['wear', 'Wardrobe'], ['other', 'Other']];
    const inCat = (id) => {
      const c = I[id].cat;
      switch (UI.bagCat) {
        case 'all': return true; case 'mat': return ['material', 'ore', 'bar', 'forage'].includes(c); case 'food': return c === 'food';
        case 'ingredient': return c === 'ingredient'; case 'catch': return c === 'fish' || c === 'critter'; case 'treasure': return ['gem', 'artifact', 'relic'].includes(c);
        case 'furniture': return c === 'furniture'; case 'wear': return c === 'hat' || c === 'petacc'; default: return ['pet', 'misc', 'quest', 'gear'].includes(c);
      }
    };
    const chips = el('div', { class: 'chips' });
    for (const [k, l] of cats) chips.append(el('span', { class: 'chip' + (UI.bagCat === k ? ' on' : ''), onclick: () => { UI.bagCat = k; UI.journal('bag'); } }, l));
    B.append(chips);
    const ids = Object.keys(s.inv).filter((k) => I[k] && inCat(k)).sort((a, b) => (I[a].cat === I[b].cat ? I[a].name.localeCompare(I[b].name) : I[a].cat.localeCompare(I[b].cat)));
    if (!ids.length) B.append(el('p', { class: 'muted' }, 'Nothing here yet.'));
    const g = el('div', { class: 'grid' });
    for (const k of ids) g.append(el('div', { class: 'slot' + (UI.bagSel === k ? ' sel' : ''), title: I[k].name, html: ic(k) + `<span class="n">${s.inv[k]}</span>`, onclick: () => { UI.bagSel = k; UI.journal('bag'); } }));
    B.append(g);
    const k = UI.bagSel;
    if (k && s.inv[k]) {
      const it = I[k];
      const acts = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
      if (it.heal || it.food) acts.append(el('button', { class: 'btn go sm', onclick: () => { G.Game.eat(k); UI.journal('bag'); } }, 'Eat'));
      if (['tmap', 'speed_tonic', 'glow_tonic', 'boots', 'bright_lantern'].includes(k)) acts.append(el('button', { class: 'btn go sm', onclick: () => { G.Game.useItem(k); UI.journal('bag'); } }, 'Use'));
      if (it.cat === 'hat') acts.append(el('button', { class: 'btn go sm', onclick: () => { G.Game.useItem(k); UI.journal('bag'); } }, s.look.hat === it.icon ? 'Take off' : 'Wear'));
      if (it.cat === 'furniture') acts.append(el('button', { class: 'btn go sm', onclick: () => G.Game.useItem(k) }, G.Game.map.kind === 'home' ? 'Place' : 'Place (at home)'));
      if (it.cat === 'petacc') acts.append(el('span', { class: 'muted' }, 'Dress up a pet from the Pets tab.'));
      B.append(el('div', { class: 'detail' }, el('div', { class: 'big', html: ic(k) }), el('div', { style: 'flex:1', html: `<b>${esc(it.name)}</b> ×${s.inv[k]}<br><span class="muted">${esc(CAT_NAMES[it.cat] || '')}${it.desc ? ' · ' + esc(it.desc) : ''}${it.heal ? ' · heals ' + it.heal : ''} · sells for 🪙 ${it.price}${Sys.donatable(k) ? ' · 🏛️ museum wants this!' : ''}</span>` }), acts));
    } else B.append(el('div', { class: 'detail muted' }, 'Select an item to see what you can do with it.'));
  }
  function tabQuests(B) {
    const s = S();
    const act = Object.keys(s.quests.active).filter((q) => D.QUESTS[q]);
    act.sort((a, b) => (D.QUESTS[b].main ? 1 : 0) - (D.QUESTS[a].main ? 1 : 0));
    B.append(el('h3', {}, `Active quests (${act.length})`));
    if (!act.length) B.append(el('p', { class: 'muted' }, 'No active quests. Look for ❗ above villagers\' heads, or check town notice boards.'));
    for (const q of act) {
      const Q = D.QUESTS[q], p = Sys.progress(q), n = D.NPCS[Q.giver];
      B.append(el('div', { class: 'row' }, el('div', { class: 'ic emo' }, Q.main ? '⭐' : '📜'), el('div', { class: 'nm', html: `<b>${esc(Q.title)}</b> <span class="muted">from ${esc(n.name)} (${esc(D.TOWNS[n.town].name)})</span><small>${esc(Q.offer)}</small><small>${p.ok ? '✅ Ready to turn in to ' + esc(D.NPCS[Sys.turnInNpc(q)].name) : '▸ ' + esc(p.text)}</small>` }), el('div', { class: 'bar', style: 'width:90px' }, el('i', { style: `width:${Math.round(100 * p.cur / Math.max(1, p.need))}%` }))));
    }
    const done = Object.keys(s.quests.done).length;
    B.append(el('h3', {}, 'Lumen Shards'), el('div', { html: D.BIOME_KEYS.map((b) => `<span class="emo" style="font-size:26px;${s.shards[b] ? `filter:hue-rotate(${D.BIOME_KEYS.indexOf(b) * 50}deg)` : 'filter:grayscale(1);opacity:.3'}">💎</span>`).join(' ') + ` <span class="muted">${Object.keys(s.shards).length}/7 · one in every temple</span>` }));
    B.append(el('p', { class: 'muted' }, `Completed quests: ${done} / ${Object.keys(D.QUESTS).length}`));
  }
  function tabSkills(B) {
    const s = S();
    const cols = el('div', { class: 'cols' });
    const left = el('div', {}, el('h3', {}, 'Professions'));
    for (const k in D.PROFS) {
      const p = D.PROFS[k], lv = Sys.lvl(k), xp = s.xp[k] || 0;
      const cur = D.XP[lv] || 0, nx = D.XP[lv + 1];
      left.append(el('div', { class: 'row' }, el('div', { class: 'ic emo' }, p.icon), el('div', { class: 'nm', html: `<b>${p.name}</b> ${s.lic[k] ? 'Lv ' + lv : '<span class="muted">No licence</span>'}<small>${s.lic[k] ? (nx ? `${xp - cur} / ${nx - cur} XP` : 'Max level!') : 'Get licensed by Guildmaster Rowan'}</small>` }), el('div', { class: 'bar', style: 'width:80px' }, el('i', { style: `width:${s.lic[k] ? (nx ? Math.round(100 * (xp - cur) / (nx - cur)) : 100) : 0}%` }))));
    }
    const right = el('div', {}, el('h3', {}, 'Tools'));
    for (const k in D.TOOLS) { const t = D.TOOLS[k], tier = s.tools[k] || 0; right.append(el('div', { class: 'row' }, el('div', { class: 'ic emo' }, t.icon), el('div', { class: 'nm', html: tier ? `<b>${D.TIER_NAMES[tier]} ${t.name}</b>` : `<span class="muted">${t.name}: not owned</span>` }), tier ? el('div', { style: `width:16px;height:16px;border-radius:50%;background:${D.TIER_COLORS[tier]};border:2px solid #0003` }) : '')); }
    right.append(el('h3', {}, 'Friends'));
    const fr = Object.keys(D.NPCS).filter((k) => (s.npc[k] || {}).pts > 0).sort((a, b) => s.npc[b].pts - s.npc[a].pts).slice(0, 10);
    if (!fr.length) right.append(el('p', { class: 'muted' }, 'Chat with villagers to become friends!'));
    for (const k of fr) right.append(el('div', { class: 'row' }, el('div', { class: 'nm', html: `${esc(D.NPCS[k].name)} <small>${esc(D.TOWNS[D.NPCS[k].town].name)}</small>` }), el('div', { class: 'emo', style: 'font-size:12px' }, '💗'.repeat(Sys.hearts(k)) + '🤍'.repeat(10 - Sys.hearts(k)))));
    const st = s.stats;
    right.append(el('h3', {}, 'Stats'), el('div', { class: 'muted', html: `Fish caught: ${st.fish || 0} · Critters: ${st.critters || 0} · Ores mined: ${st.ores || 0}<br>Relics cleaned: ${st.relics || 0} · Chests: ${st.chests || 0} · Dishes cooked: ${st.cooked || 0}<br>Pets given: ${st.petted || 0} · Forage picked: ${st.forage || 0}` }));
    cols.append(left, right); B.append(cols);
  }
  function tabPets(B) {
    const s = S();
    B.append(el('h3', {}, `Pets (${s.pets.length}) · walking ${s.pets.filter((p) => p.follow).length}/${Sys.maxFollowers()}`));
    if (!s.pets.length) B.append(el('p', { class: 'muted' }, 'No pets yet. Visit Hazel at Pawsome Pets in Willowmere, or befriend strays with a Pet Treat!'));
    for (const p of s.pets) {
      const c = petPortrait(p, 3);
      const accSel = el('select', { onchange: (e) => { p.acc = e.target.value; UI.journal('pets'); } });
      accSel.append(el('option', { value: '' }, 'No accessory'));
      for (const [id] of D.PETACC) if (Sys.count(id) || p.acc === id) { const o = el('option', { value: id }, I[id].icon + ' ' + I[id].name); if (p.acc === id) o.selected = true; accSel.append(o); }
      const card = el('div', { class: 'petcard' }, c, el('div', { class: 'info', html: `<b>${esc(p.name)}</b> <span class="muted">the ${esc(D.PETS[p.species].name)}</span><div class="emo" style="font-size:12px">${'💗'.repeat(Sys.petHearts(p))}${'🤍'.repeat(5 - Sys.petHearts(p))}</div><div class="muted">Happiness</div>` }));
      card.querySelector('.info').append(el('div', { class: 'bar pink' }, el('i', { style: `width:${Math.round(p.happy)}%` })));
      const acts = el('div', { class: 'acts' },
        el('button', { class: 'btn sm ' + (p.follow ? 'go' : ''), onclick: () => { if (!p.follow && s.pets.filter((x) => x.follow).length >= Sys.maxFollowers()) { const f = s.pets.find((x) => x.follow); if (f) f.follow = false; } p.follow = !p.follow; G.Game.syncPets(); UI.journal('pets'); } }, p.follow ? '🚶 Walking with you' : '🏡 Resting at home'),
        el('button', { class: 'btn sm', onclick: () => { Sys.feedTreat(p); UI.journal('pets'); } }, '🦴 Treat (' + Sys.count('treat') + ')'),
        el('button', { class: 'btn sm', onclick: () => { Sys.playWith(p); UI.journal('pets'); } }, '🎾 Play'),
        el('button', { class: 'btn sm', onclick: () => { const n = prompt('New name for ' + p.name + '?', p.name); if (n && n.trim()) { p.name = n.trim().slice(0, 14); UI.journal('pets'); } } }, '✏️ Rename'), accSel);
      card.append(acts); B.append(card);
    }
    B.append(el('h3', {}, `Glimmers (${s.glimmers.length}/7)`));
    if (!s.glimmers.length && !s.eggs.length) B.append(el('p', { class: 'muted' }, 'Glimmers hatch from eggs found in temple treasure rooms. Each one grants a small perk while it floats beside you.'));
    s.glimmers.forEach((g, i) => {
      const gd = D.GLIMMERS[g.kind];
      const c = A.mk(48, 48), x = c.getContext('2d'); A.drawGlimmer(x, 24, 26, g.kind, 1, 2.5); c.style.cssText = 'width:48px;height:48px;background:#2a2440;border-radius:12px';
      B.append(el('div', { class: 'petcard' }, c, el('div', { class: 'info', html: `<b>${esc(g.name)}</b><div class="muted">${esc(gd.perk)}</div>` }), el('button', { class: 'btn sm ' + (s.activeGlim === i ? 'go' : ''), onclick: () => { s.activeGlim = s.activeGlim === i ? -1 : i; G.Game.syncPets(); UI.journal('pets'); } }, s.activeGlim === i ? '✨ Following you' : 'Bring along')));
    });
    for (const e of s.eggs) B.append(el('div', { class: 'row' }, el('div', { class: 'ic emo' }, '🥚'), el('div', { class: 'nm', html: `${esc(D.GLIMMERS[e.kind].name)} egg<small>Hatches tomorrow morning, or right away with Sage Oona in Mosslight.</small>` })));
  }
  function tabCollection(B) {
    const s = S();
    const cats = [['fish', '🐟 Fish'], ['critter', '🦋 Critters'], ['artifact', '🏺 Artifacts'], ['gem', '💎 Gems'], ['hat', '👒 Hats'], ['furniture', '🛋️ Furniture']];
    const chips = el('div', { class: 'chips' });
    for (const [k, l] of cats) { const ids = Object.keys(I).filter((x) => I[x].cat === k); chips.append(el('span', { class: 'chip' + (UI.colCat === k ? ' on' : ''), onclick: () => { UI.colCat = k; UI.journal('collection'); } }, `${l} ${ids.filter((x) => s.seen[x]).length}/${ids.length}`)); }
    B.append(chips);
    const g = el('div', { class: 'grid' });
    for (const k of Object.keys(I).filter((x) => I[x].cat === UI.colCat)) {
      const seen = s.seen[k], it = I[k];
      let tip = seen ? it.name : '???';
      if (seen && it.biomes) tip += ' · ' + it.biomes.map((b) => D.BIOMES[D.BIOME_KEYS.indexOf(b)].name).join(', ') + (it.time && it.time !== 'any' ? ' · ' + it.time + ' only' : '');
      else if (!seen && it.biomes) tip = '??? · found in ' + it.biomes.map((b) => D.BIOMES[D.BIOME_KEYS.indexOf(b)].name).join(', ') + (it.time && it.time !== 'any' ? ' (' + it.time + ')' : '');
      g.append(el('div', { class: 'slot' + (s.museum[k] ? ' don' : '') + (seen ? '' : ' unk'), title: tip, html: seen ? ic(k) : '❔' }));
    }
    B.append(g, el('p', { class: 'muted' }, 'Hover a slot for hints. 🏛️ marks items donated to the Grand Museum in Sunspire Oasis.'));
  }
  function tabMap(B) {
    const s = S(), ov = G.Game.over, W = ov.W, H = ov.H;
    if (!UI.mapBase || UI.mapBase.seed !== ov.seed) {
      const c = A.mk(W, H), x = c.getContext('2d'), img = x.createImageData(W, H);
      for (let i = 0; i < W * H; i++) {
        const t = ov.tiles[i], col = A.TCOL[t][0], n = parseInt(col.slice(1), 16);
        img.data[i * 4] = n >> 16; img.data[i * 4 + 1] = (n >> 8) & 255; img.data[i * 4 + 2] = n & 255; img.data[i * 4 + 3] = 255;
        const o = ov.grid[i] >= 0 ? ov.objs[ov.grid[i]] : null;
        if (o && o.type === 'tree') { img.data[i * 4] *= 0.75; img.data[i * 4 + 1] *= 0.8; img.data[i * 4 + 2] *= 0.75; }
        if (o && (o.type === 'building' || o.type === 'temple' || o.type === 'cave')) { img.data[i * 4] = 140; img.data[i * 4 + 1] = 100; img.data[i * 4 + 2] = 70; }
      }
      x.putImageData(img, 0, 0); UI.mapBase = c; c.seed = ov.seed;
    }
    const c = A.mk(W, H), x = c.getContext('2d');
    x.drawImage(UI.mapBase, 0, 0);
    const img = x.getImageData(0, 0, W, H), ex = G.Game.explored;
    for (let i = 0; i < W * H; i++) if (!ex[i]) { img.data[i * 4] = 232 - (i % 3); img.data[i * 4 + 1] = 218 - (i % 5); img.data[i * 4 + 2] = 186; }
    x.putImageData(img, 0, 0);
    const wrap = el('div', { class: 'mapwrap' }, c);
    const pos = (tx, ty) => `left:${(tx + 0.5) / W * 100}%;top:${(ty + 0.5) / H * 100}%`;
    const seen = (tx, ty) => ex[ty * W + tx];
    for (const id of D.TOWN_ORDER) { const tw = ov.towns[id]; if (seen(tw.cx, tw.cy)) wrap.append(el('div', { class: 'mlabel', style: pos(tw.cx, tw.cy + 9) }, D.TOWNS[id].name)); }
    for (const k in ov.places) { const p = ov.places[k]; if (seen(p.x, p.y)) wrap.append(el('div', { class: 'mi', style: pos(p.x, p.y - 2), title: p.name }, k.startsWith('temple') ? (s.temples[k.slice(7)] ? '✨' : '🏛️') : '⛏️')); }
    for (const id in ov.waystones) {
      const w = ov.waystones[id]; if (!seen(w.x, w.y) && !s.ws[id]) continue;
      const on = s.ws[id];
      wrap.append(el('div', { class: 'mi ws' + (on ? '' : ' off'), style: pos(w.x, w.y), title: on ? 'Travel to ' + w.label : w.label + ' (not yet awakened)', onclick: on ? () => G.Game.teleport(id) : null }, '💠'));
    }
    if (ov.homeDoor) wrap.append(el('div', { class: 'mi', style: pos(ov.homeDoor[0], ov.homeDoor[1] - 1), title: 'Your Cottage' }, '🏡'));
    for (const id of s.tmaps) { const o = ov.objs[id]; if (o && !o.gone) wrap.append(el('div', { class: 'mi', style: pos(o.x, o.y), title: 'Treasure!' }, '❌')); }
    for (const st of G.Game.strays) { const tx = Math.floor(st.x / 16), ty = Math.floor(st.y / 16); if (seen(tx, ty)) wrap.append(el('div', { class: 'mi', style: pos(tx, ty), title: 'A stray ' + D.PETS[st.species].name.toLowerCase() }, '🐾')); }
    const pl = G.Game.map.kind === 'overworld' ? [G.Game.player.x, G.Game.player.y] : G.Game.returnPos;
    wrap.append(el('div', { class: 'mi me', style: pos(Math.floor(pl[0] / 16), Math.floor(pl[1] / 16)), title: 'You are here' }, '📍'));
    B.append(wrap, el('p', { class: 'muted' }, '💠 Click an awakened Waystone to travel there instantly. 🏛️ temples · ⛏️ mines · 🐾 strays · ❌ treasure maps'));
  }
  function tabSettings(B) {
    const s = S(), st = s.settings;
    const tog = (opts, cur, set) => { const d = el('div', { class: 'toggle' }); for (const [v, l] of opts) d.append(el('button', { class: 'btn sm' + (cur === v ? ' on' : ''), onclick: () => { set(v); UI.journal('settings'); } }, l)); return d; };
    B.append(el('h3', {}, 'Enemies'), tog([[false, '🕊️ Peaceful (no enemies)'], [true, '⚔️ Adventure (gentle enemies)']], st.enemies, (v) => { st.enemies = v; if (!v) G.Game.enemies = []; s.hp = s.maxHp; UI.dirty(); }),
      el('p', { class: 'muted' }, 'With enemies on, fainting just sends you to the last Waystone. You never lose anything. Combat rooms in temples become puzzles in Peaceful mode.'));
    B.append(el('h3', {}, 'Day length'), tog([[16, 'Brisk (16 min)'], [24, 'Normal (24 min)'], [36, 'Relaxed (36 min)'], [60, 'Slow (60 min)'], [0, '⏸️ Timeless']], st.dayLen, (v) => (st.dayLen = v)),
      el('p', { class: 'muted' }, 'Nothing bad happens at night. Stay up as late as you like; sleep (in any bed or inn) only if you want to skip to morning.'));
    const slider = (label, key) => el('div', { style: 'display:flex;align-items:center;gap:10px;margin:6px 0' }, el('span', { style: 'width:70px' }, label), el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st[key], oninput: (e) => { st[key] = +e.target.value; G.Audio.volumes(); } }));
    B.append(el('h3', {}, 'Sound'), slider('Music', 'music'), slider('Effects', 'sfx'));
    B.append(el('h3', {}, 'Game'), el('div', { class: 'toggle' },
      el('button', { class: 'btn go sm', onclick: () => { if (Sys.save()) UI.toast('💾 Game saved!'); } }, '💾 Save now'),
      el('button', { class: 'btn sm', onclick: () => { Sys.save(); location.reload(); } }, '🏠 Save & return to title'),
      el('button', { class: 'btn sm', onclick: () => { const d = JSON.stringify(G.S); const a = el('a', { href: URL.createObjectURL(new Blob([d], { type: 'application/json' })), download: 'lumen-isles-save.json' }); a.click(); } }, '⬇️ Export save')));
    B.append(el('h3', {}, 'Controls'), el('div', { class: 'kbd', html: '<b>WASD / Arrows</b><span>Move (hold Shift to run)</span><b>Space / E / Click</b><span>Interact: talk, chop, mine, fish, catch, open...</span><b>R</b><span>Pick up furniture at home</span><b>F</b><span>Quick-eat a snack</span><b>T</b><span>Waystone travel</span><b>I · Q · M · P · K · C</b><span>Bag · Quests · Map · Pets · Skills · Collection</span><b>Esc</b><span>Close menus / settings</span>' }));
  }

  // ---------------- wardrobe & creator ----------------
  const SKIN = ['#f6d5b8', '#f1c7a3', '#e8b48a', '#c98e6a', '#a8745a', '#8a5a40', '#5a3a2a'];
  const HAIR = ['#2a1a1a', '#5a3a2a', '#8a5a3a', '#c96a3a', '#e8c547', '#f0f0f0', '#e86aa8', '#5ab0e8', '#7a5ab8', '#4a9a5a'];
  const OUTFIT = ['#e85a5a', '#f4a259', '#ffd23a', '#7cc36b', '#5bc0be', '#5a8ad9', '#9a6ad9', '#f28ba8', '#f6f1ea', '#4a4a5a'];
  const PANTS = ['#3a4a6a', '#4a3a2a', '#2a2a2a', '#6a8ac9', '#8a6a4a', '#5a7a4a', '#a85a7a'];
  function lookEditor(look, onChange) {
    const wrap = el('div', {});
    const sw = (label, arr, key) => {
      const d = el('div', { class: 'sw' });
      arr.forEach((c) => d.append(el('span', { style: 'background:' + c, class: look[key] === c ? 'on' : '', onclick: (e) => { look[key] = c; [...d.children].forEach((x) => x.classList.toggle('on', x === e.currentTarget)); onChange(); } })));
      wrap.append(el('div', {}, label), d);
    };
    sw('Skin', SKIN, 'skin'); sw('Hair colour', HAIR, 'hair');
    const hs = el('div', { class: 'toggle', style: 'margin:4px 0 10px' });
    ['Short', 'Long', 'Bun', 'Spiky', 'Bald'].forEach((l, i) => hs.append(el('button', { class: 'btn sm' + (look.hs === i ? ' on' : ''), onclick: () => { look.hs = i; [...hs.children].forEach((x, j) => x.classList.toggle('on', j === i)); onChange(); } }, l)));
    wrap.append(el('div', {}, 'Hair style'), hs);
    sw('Outfit', OUTFIT, 'outfit'); sw('Trousers', PANTS, 'pants');
    return wrap;
  }
  UI.wardrobe = function () {
    const s = S();
    const P = panel('👗 Wardrobe', { w: 640, onClose: () => UI.talkMenu('wren', 'Looking fabulous!') });
    const pv = el('div', {});
    const draw = () => { pv.innerHTML = ''; const c = portrait(s.look, 32, 40, 5); c.style.cssText = 'width:160px;height:200px;image-rendering:pixelated;background:linear-gradient(#cfeaf5,#bfe3a8);border-radius:16px;border:3px solid #e2cfae'; pv.append(c); };
    draw();
    P.body.append(el('div', { class: 'creator' }, pv, lookEditor(s.look, draw)), el('p', { class: 'muted' }, 'Restyling is always free! Hats can be worn from your bag.'));
    UI.open(P.root);
  };
  UI.title = function () {
    const t = $('title'); t.classList.remove('hidden'); t.innerHTML = '';
    const has = Sys.hasSave();
    const menu = el('div', { class: 'menu' });
    if (has) menu.append(el('button', { class: 'btn go', onclick: () => { G.Audio.init(); const st = Sys.load(); if (st) { G.Game.start(st, false); } } }, '▶ Continue'));
    menu.append(el('button', { class: 'btn', onclick: () => { G.Audio.init(); if (has && !confirm('Start a new game? Your current save will be replaced when you next save.')) return; UI.creator(); } }, '✨ New Game'));
    menu.append(el('button', { class: 'btn blue', onclick: () => UI.howTo() }, '❔ How to play'));
    t.append(el('div', { class: 'logo' }, 'Lumen Isles'), el('div', { class: 'sub' }, 'a cozy island adventure'), menu, el('div', { class: 'foot' }, 'Explore seven biomes · befriend villagers · adopt pets · relight the lighthouse'));
  };
  UI.howTo = function () {
    const P = panel('❔ How to play', { w: 700 });
    P.body.innerHTML = `<p>Welcome to the <b>Lumen Isles</b>, a cozy island adventure with no pressure and no farming. Everything you'd grow can simply be bought at grocers in every town.</p>
      <h3>Things to do</h3><ul>
      <li>🏘️ Visit <b>seven towns</b>, one in every biome, each with its own villagers, shops and quests.</li>
      <li>💠 Touch <b>Waystones</b> to unlock instant travel between towns, temples and mines.</li>
      <li>📜 Buy <b>licences</b> (Miner, Fisher, Archaeologist, Critter Keeper, Chef, Blacksmith, Carpenter, Explorer) and level them up.</li>
      <li>🏛️ Solve puzzles in <b>ancient temples</b> to recover the seven Lumen Shards and hatch <b>Glimmers</b>.</li>
      <li>🐾 Adopt <b>pets</b> from shops or befriend <b>strays</b> hidden in every biome. Pet them daily!</li>
      <li>🏡 Decorate your cottage, cook, craft, fish, dig up relics and fill the museum.</li></ul>
      <h3>No punishing nights</h3><p>Stay up as late as you like. Nothing happens at midnight; sleep only if you want to skip to morning. You can even freeze time in Settings.</p>
      <h3>Enemies are optional</h3><p>Choose Peaceful mode for a fully combat-free game, or switch any time in Settings.</p>
      <h3>Controls</h3><div class="kbd"><b>WASD / Arrows</b><span>Move (Shift to run)</span><b>Space / E / Click</b><span>Interact with whatever you face</span><b>I Q M P K C</b><span>Bag, Quests, Map, Pets, Skills, Collection</span><b>T</b><span>Travel</span><b>Esc</b><span>Close / Settings</span></div>`;
    UI.open(P.root);
  };
  UI.creator = function () {
    const look = { skin: SKIN[1], hair: HAIR[1], hs: 0, outfit: OUTFIT[4], pants: PANTS[0], hat: '' };
    const opts = { enemies: false, dayLen: 24 };
    const P = panel('✨ A new adventure', { w: 760 });
    const pv = el('div', {});
    const draw = () => { pv.innerHTML = ''; const c = portrait(look, 32, 40, 5); pv.append(c); };
    draw();
    const name = el('input', { type: 'text', value: 'Sunny', maxlength: 16 });
    const seed = el('input', { type: 'text', value: '', placeholder: 'random', style: 'width:140px' });
    const tog = (arr, key) => { const d = el('div', { class: 'toggle' }); arr.forEach(([v, l]) => d.append(el('button', { class: 'btn sm' + (opts[key] === v ? ' on' : ''), onclick: (e) => { opts[key] = v; [...d.children].forEach((x) => x.classList.toggle('on', x === e.currentTarget)); } }, l))); return d; };
    const right = el('div', {}, el('div', {}, 'Your name'), name, el('div', { style: 'height:8px' }), lookEditor(look, draw));
    P.body.append(el('div', { class: 'creator' }, pv, right),
      el('h3', {}, 'Enemies'), tog([[false, '🕊️ Peaceful: no enemies at all'], [true, '⚔️ Adventure: gentle, optional combat']], 'enemies'),
      el('h3', {}, 'Day length'), tog([[16, 'Brisk'], [24, 'Normal'], [36, 'Relaxed'], [0, '⏸️ Timeless']], 'dayLen'),
      el('p', { class: 'muted' }, 'You can change both of these any time in Settings.'),
      el('div', { style: 'display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap' }, el('span', {}, 'World seed'), seed, el('div', { style: 'flex:1' }),
        el('button', { class: 'btn go', style: 'font-size:18px', onclick: () => {
          const sd = seed.value.trim() ? (parseInt(seed.value, 10) || [...seed.value].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) : (Math.random() * 1e9) | 0;
          const st = G.newState({ seed: sd, name: name.value.trim() || 'Sunny', look, enemies: opts.enemies, dayLen: opts.dayLen });
          UI.close();
          UI.fade(() => { G.Game.start(st, true); Sys.save(); }, 600);
        } }, 'Begin adventure ▸')));
    UI.open(P.root);
  };
  UI.intro = function () {
    const s = S();
    UI.story([
      `Welcome to the Lumen Isles, ${s.name}!`,
      'A little ferry has dropped you off in Willowmere, where a cozy cottage now has your name on the door.',
      'There\'s no rush here. No crops to water and no harsh nights. Explore seven biomes, make friends, adopt pets and uncover old temples whenever you like.',
      'Mayor Bramble is waiting by the Town Hall. Look for the ❗ above their head! (Move with WASD or the arrow keys. Press Space to talk.)',
    ], '🌊 The Lumen Isles');
  };
  UI.finale = function () {
    const d = el('div', { class: 'card finale' });
    d.innerHTML = '<h1>✨ The Lighthouse shines! ✨</h1><p>Seven shards, seven shores. The Lumen Lighthouse sweeps its golden light across the isles once more, and every window in every town glows back.</p><p class="muted">Thank you for playing! The isles are yours to keep exploring: fish to catch, critters to find, friends to make, pets to adopt and homes to decorate.</p>';
    d.append(el('button', { class: 'btn go', onclick: UI.close }, 'Keep exploring ▸'));
    UI.open(d);
  };

  // ---------------- keyboard while UI open ----------------
  UI.handleKey = function (e) {
    if (!UI.mode) return false;
    const k = e.code;
    if (UI.mode === 'fishing') { if (k === 'Space' || k === 'KeyE' || k === 'Enter') { UI.fishHit(); return true; } if (k === 'Escape') { UI.close(); return true; } return true; }
    if (k === 'Escape') { if (UI.mode === 'dialog' && UI.talkingTo) { UI.close(); return true; } UI.close(); return true; }
    if (UI.mode === 'dialog' && (k === 'Space' || k === 'Enter' || k === 'KeyE')) {
      if (UI.typing) { UI.finishType(); return true; }
      const f = document.activeElement; if (f && f.tagName === 'BUTTON' && $('overlay').contains(f)) { f.click(); return true; }
      const b = $('overlay').querySelector('.opts button'); if (b) b.click(); return true;
    }
    if (UI.mode === 'journal') { const map = { KeyI: 'bag', Tab: 'bag', KeyQ: 'quests', KeyM: 'map', KeyP: 'pets', KeyK: 'skills', KeyC: 'collection' }; if (map[k] && document.activeElement.tagName !== 'INPUT') { UI.journal(map[k]); return true; } }
    if (UI.mode === 'dialog' && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown')) {
      const bs = [...$('overlay').querySelectorAll('.opts button')]; const i = bs.indexOf(document.activeElement);
      const n = bs[(i + (k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1) + bs.length) % bs.length]; if (n) n.focus(); return true;
    }
    return document.activeElement && document.activeElement.tagName === 'INPUT' ? false : true;
  };
  return UI;
})();
