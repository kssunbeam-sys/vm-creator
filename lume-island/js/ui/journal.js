// The journal (J): story, professions, collections and stats. Plus the
// homestead mailbox with letters and gifts from the townsfolk.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { h, clear } from './dom.js';
import { makePanel } from './ui.js';
import { icon } from './widgets.js';
import { ITEMS } from '../data/items.js';
import { PROFESSIONS } from '../data/professions.js';
import { LUMAS, ABILITIES } from '../data/lumas.js';
import { BIOMES, SITES } from '../data/layout.js';
import { STORY } from '../systems/quests.js';
import { OFFERINGS } from '../world/shrines.js';
import { lumaIcon } from '../systems/lumas.js';

const FISH = Object.values(ITEMS).filter((i) => i.cat === 'fish' && i.diff);
const BUGS = Object.values(ITEMS).filter((i) => i.cat === 'bug');
const RELICS = ['clay_figurine', 'sun_tablet', 'wooden_mask', 'moss_idol', 'frost_totem', 'crystal_skull', 'sun_disk', 'obsidian_mask'];
const TREASURES = ['old_coin', 'silver_goblet', 'ancient_doubloon', 'pirate_compass', 'golden_idol', 'jeweled_chalice'];
const fmtTime = (s) => { const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };

export class Journal {
  constructor() {
    this.panel = makePanel('Journal', { cls: 'wide journal' });
    this.tab = 'story';
    G.events.on('crafted', (id) => { if (RELICS.includes(id)) { const r = G.save.stats.relics; r[id] = (r[id] || 0) + 1; } });
    G.events.on('treasureDug', () => { G.save.stats.treasure = (G.save.stats.treasure || 0) + 1; });
    G.events.on('inv', (id, n) => { if (n > 0 && TREASURES.includes(id)) { const t = (G.save.stats.found ||= {}); t[id] = (t[id] || 0) + n; } });
  }
  toggle() { if (G.ui.isOpen(this.panel)) G.ui.close(this.panel); else this.open(); }
  open(tab) {
    if (tab) this.tab = tab;
    this.render();
    if (!G.ui.isOpen(this.panel)) G.ui.open(this.panel);
  }
  render() {
    const b = clear(this.panel.body);
    const tabs = [['story', 'Story'], ['jobs', 'Professions'], ['collection', 'Collection'], ['stats', 'Stats']];
    b.append(h('div', { class: 'tabs' }, ...tabs.map(([id, label]) => h('button', { class: 'tab' + (this.tab === id ? ' on' : ''), onclick: () => { this.tab = id; this.render(); } }, label))));
    const body = h('div', { class: 'journal-body' });
    b.append(body);
    this['render_' + this.tab](body);
  }
  render_story(b) {
    const q = G.quests;
    const cur = q.step;
    b.append(h('div', { class: 'quest-card current' }, h('small', {}, 'Current goal'), h('b', {}, cur.title), h('p', {}, cur.goal), cur.progress ? h('div', { class: 'pill' }, cur.progress()) : null));
    const done = STORY.slice(0, q.index);
    if (done.length) {
      b.append(h('h3', { class: 'section-title' }, 'Story so far'));
      b.append(h('ol', { class: 'quest-done' }, ...done.map((s) => h('li', {}, h('b', {}, s.title), ' · ', s.goal))));
    }
    const temples = SITES.filter((s) => s.kind === 'temple');
    b.append(h('h3', { class: 'section-title' }, 'Temples'));
    b.append(h('div', { class: 'chips' }, ...temples.map((s) => h('span', { class: 'pill' + (G.save.temples?.[s.id]?.done ? '' : ' dim') }, (G.save.temples?.[s.id]?.done ? '✓ ' : '') + s.name)),
      h('span', { class: 'pill' + (G.save.temples?.great?.done ? '' : ' dim') }, (G.save.temples?.great?.done ? '✓ ' : '') + 'The Great Temple')));
    b.append(h('h3', { class: 'section-title' }, 'Shrine offerings'));
    b.append(h('div', { class: 'chips' }, ...Object.keys(OFFERINGS).map((bi) => h('span', { class: 'pill' + (G.shrines.complete(bi) ? '' : ' dim') }, `${BIOMES[bi].short}: ${G.shrines.found(bi)} found · ${G.shrines.placed(bi)}/${OFFERINGS[bi]} placed`))));
  }
  render_jobs(b) {
    const owned = Object.keys(G.save.professions || {});
    if (!owned.length) { b.append(h('p', { class: 'muted' }, 'No professions yet. Visit Tobias at the Guild Hall in Lumenbrook for a permit.')); return; }
    for (const id of owned) {
      const p = PROFESSIONS[id], st = G.save.professions[id];
      const task = p.tasks[st.level - 1];
      b.append(h('div', { class: 'quest-card' },
        h('small', {}, `Level ${st.level} of 8`), h('b', {}, p.name),
        h('div', { class: 'meter wide' }, h('span', { style: { width: (Math.min(8, st.level) / 8 * 100) + '%' } })),
        task ? h('p', {}, `Next lesson: ${task.need.map(([i, q]) => `${q} ${ITEMS[i].name}`).join(' and ')}. ${task.text}`) : h('p', {}, 'Mastered! Nothing left to learn.')));
    }
    const left = Object.keys(PROFESSIONS).filter((k) => !owned.includes(k));
    if (left.length) b.append(h('p', { class: 'muted small' }, 'Other professions: ' + left.map((k) => PROFESSIONS[k].name).join(', ')));
  }
  render_collection(b) {
    const grid = (list, have, label) => h('div', { class: 'coll-grid' }, ...list.map((it) => {
      const n = have(it.id);
      return h('div', { class: 'coll' + (n ? '' : ' unknown'), title: n ? `${it.name} (${n})` : '???' }, icon(it.id), h('small', {}, n ? it.name : (label ? label(it) : '???')), n ? h('b', {}, '×' + n) : null);
    }));
    const st = G.save.stats;
    b.append(h('h3', { class: 'section-title' }, `Fish ${Object.keys(st.fish || {}).length}/${FISH.length}`), grid(FISH, (id) => st.fish?.[id] || 0, (it) => `??? · ${BIOMES[it.biome].short}`));
    b.append(h('h3', { class: 'section-title' }, `Bugs ${Object.keys(st.caught || {}).length}/${BUGS.length}`), grid(BUGS, (id) => st.caught?.[id] || 0));
    b.append(h('h3', { class: 'section-title' }, `Relics ${Object.keys(st.relics || {}).length}/${RELICS.length}`), grid(RELICS.map((i) => ITEMS[i]), (id) => st.relics?.[id] || 0, (it) => `??? · ${BIOMES[it.tier]?.short || ''}`));
    b.append(h('h3', { class: 'section-title' }, `Treasures ${Object.keys(st.found || {}).length}/${TREASURES.length}`), grid(TREASURES.map((i) => ITEMS[i]), (id) => st.found?.[id] || 0));
    const seen = new Set((G.save.lumas || []).map((l) => l.species));
    b.append(h('h3', { class: 'section-title' }, `Lumas ${seen.size}/${LUMAS.length}`),
      h('div', { class: 'coll-grid' }, ...LUMAS.map((l) => h('div', { class: 'coll' + (seen.has(l.id) ? '' : ' unknown'), title: seen.has(l.id) ? `${l.name}: ${ABILITIES[l.ability]}` : '???' },
        h('img', { class: 'icon', src: lumaIcon(l.id), alt: '' }), h('small', {}, seen.has(l.id) ? l.name : (l.legendary ? '??? · legendary' : `??? · ${l.spirit}`))))));
  }
  render_stats(b) {
    const st = G.save.stats;
    const fishN = Object.values(st.fish || {}).reduce((a, c) => a + c, 0);
    const bugN = Object.values(st.caught || {}).reduce((a, c) => a + c, 0);
    const rows = [
      ['Days on the island', G.time.day], ['Time played', fmtTime(G.save.playtime || 0)], ['Coins earned', (st.earned || 0).toLocaleString()],
      ['Items crafted', st.crafted || 0], ['Items sold', st.sold || 0], ['Fish caught', fishN], ['Bugs caught', bugN],
      ['Treasure dug up', st.treasure || 0], ['Lumas hatched', (G.save.lumas || []).length], ['Luma Energy', G.save.lumaEnergy || 0],
      ['Temples cleared', Object.values(G.save.temples || {}).filter((t) => t.done).length], ['Mode', `${G.save.difficulty[0].toUpperCase() + G.save.difficulty.slice(1)}${G.save.peaceful ? ' · Peaceful' : ''}`],
    ];
    b.append(h('div', { class: 'help-grid' }, ...rows.map(([a, c]) => h('div', { class: 'help-row' }, h('b', {}, a), h('span', {}, String(c))))));
  }
}

// ---------------- mail ----------------
export class Mail {
  constructor() {
    this.panel = makePanel('Mailbox', { cls: '' });
    this.flag = null;
    G.events.on('gameStart', (data, fresh) => {
      G.save.mail ||= [];
      if (fresh || !G.save.mail.length) this.send('welcome', 'Mayor Rosalind', 'Welcome home!', `Dear ${G.save.name},\n\nWelcome to Lume Island! This little cottage and the land around it are yours now. Build, tinker and make it your own.\n\nThe market in Lumenbrook sells everything farms would grow, so you will never go hungry. Come and see me in the town square!\n\nWarmly,\nRosalind`, [['$', 50], ['luma_food', 2]]);
      this.syncFlag();
    });
    G.events.on('newDay', () => {
      if (G.time.day % 3 === 0 && G.towns?.npc) this.send('morel' + G.time.day, 'Morel', 'Tokens wanted!', `Hello hello! Today my cart stands ${G.towns.morelWhere()}. Bring ${BIOMES[G.towns.biome].short} Tokens, I have treats for you!\n\n- Morel`);
    });
    G.events.on('questStep', (next, prev) => {
      if (prev === 'bridge') this.send('fern1', 'Elder Fern', 'The bridge!', 'Word travels fast in the forest. The bridge is whole again and Mossvale has visitors at last. Come and see us, little builder.\n\n- Fern', [['blueberry', 5]]);
      if (prev === 'lift') this.send('bjorn1', 'Chieftain Bjorn', 'Up we go!', 'The old lift is singing again! Frostpeak has warm fires and warmer cheese. Come up!\n\n- Bjorn', [['cheese', 2]]);
      if (prev === 'boat') this.send('kaia1', 'Shaman Kaia', 'The sea opens', 'I dreamed of a boat with a new sail. Tikora awaits you.\n\n- Kaia', [['banana', 3]]);
      if (prev === 'great') this.send('rosalind2', 'Mayor Rosalind', 'The light returns', `${G.save.name}, the whole town saw the glow above the Great Temple! Thank you, from all of us.\n\n- Rosalind`, [['$', 1000], ['tool_token', 3]]);
    });
    G.events.on('lumaHatched', () => { if ((G.save.lumas || []).length === 1) this.send('ilsa1', 'Professor Ilsa', 'Your first Luma!', 'I heard the news! Feed your Luma once a day and pet it often. Happy Lumas give Luma Energy, which you can spend at a Luma Altar.\n\nWith admiration,\nIlsa', [['luma_food', 5]]); });
    G.events.on('profLevel', (id, lvl) => {
      if (lvl === 3 || lvl === 5 || lvl === 7) this.send(`prof_${id}_${lvl}`, PROFESSIONS[id].name + ' Guild', 'Well done!', `Your mentor is proud of you. You reached level ${lvl} as a ${PROFESSIONS[id].name}. A small gift from the guild is attached.`, [['tool_token', lvl === 7 ? 3 : 2], ['$', lvl * 50]]);
    });
  }
  send(id, from, title, body, gift = []) {
    G.save.mail ||= [];
    if (G.save.mail.some((m) => m.id === id)) return;
    G.save.mail.push({ id, from, title, body, gift, read: false, claimed: !gift.length, day: G.time.day });
    if (G.save.mail.length > 40) G.save.mail.splice(0, G.save.mail.length - 40);
    if (G.started) G.ui.toast(`New letter from ${from} in your mailbox.`, 'info', 3500);
    this.syncFlag();
  }
  unread() { return (G.save.mail || []).filter((m) => !m.read || !m.claimed).length; }
  syncFlag() {
    const mb = G.overworld.homestead.mailbox;
    if (!mb) return;
    if (!this.flag) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = '#fffaf0'; x.strokeStyle = '#4a3324'; x.lineWidth = 5;
      x.beginPath(); x.arc(32, 32, 26, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#d9443a'; x.fillRect(16, 22, 32, 22); x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(16, 23); x.lineTo(32, 36); x.lineTo(48, 23); x.stroke();
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      this.flag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
      this.flag.scale.setScalar(0.8);
      this.flag.renderOrder = 11;
      this.flag.position.set(mb.x, mb.y + 2.0, mb.z);
      G.overworld.scene.add(this.flag);
    }
    this.flag.visible = this.unread() > 0;
  }
  open() {
    this.sel = null;
    this.render();
    G.ui.open(this.panel);
  }
  render() {
    const b = clear(this.panel.body);
    const list = [...(G.save.mail || [])].reverse();
    if (!list.length) { b.append(h('p', { class: 'muted' }, 'The mailbox is empty.')); return; }
    const m = this.sel || list.find((x) => !x.read) || list[0];
    this.sel = m;
    m.read = true;
    const side = h('div', { class: 'mail-list' }, ...list.map((x) => h('button', { class: 'mail-item' + (x === m ? ' on' : '') + (x.read && x.claimed ? '' : ' new'), onclick: () => { this.sel = x; this.render(); } }, h('b', {}, x.title), h('small', {}, `${x.from} · Day ${x.day}`))));
    const letter = h('div', { class: 'letter' }, h('h3', {}, m.title), h('div', { class: 'letter-body' }, ...m.body.split('\n').map((l) => (l ? h('p', {}, l) : h('br')))));
    if (m.gift?.length) {
      letter.append(h('div', { class: 'gift' }, ...m.gift.map(([id, q]) => (id === '$' ? h('span', { class: 'price' }, `${q} coins`) : h('span', { class: 'gift-item' }, icon(id, 'mini'), `${q} × ${ITEMS[id].name}`))),
        h('button', { class: 'btn small teal', disabled: m.claimed, onclick: () => {
          for (const [id, q] of m.gift) { if (id === '$') G.player.addCoins(q); else { const left = G.inv.add(id, q); if (left) G.pickups.spawn(id, left, G.player.pos.x, G.player.pos.y + 1, G.player.pos.z); } }
          m.claimed = true;
          G.audio?.play('coin');
          this.render();
        } }, m.claimed ? 'Received' : 'Take the gift')));
    }
    b.append(h('div', { class: 'mail' }, side, letter));
    this.syncFlag();
  }
}
