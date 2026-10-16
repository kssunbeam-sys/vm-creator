// The main story: from your first chat with Mayor Rosalind to hatching the
// Great Luma. Steps complete by talking to someone or when a check passes.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { h, clear } from '../ui/dom.js';
import { SITES, HOMESTEAD } from '../data/layout.js';
import { PROFESSIONS } from '../data/professions.js';
import { ITEMS } from '../data/items.js';
import { REPAIRS } from '../world/gates.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from '../world/materials.js';
import { dirName } from './treasure.js';

const temple = (id) => !!G.save.temples?.[id]?.done;
const TABLET_TEMPLES = ['t_mtn1', 't_mtn2', 't_mtn3'];
const tablets = () => TABLET_TEMPLES.filter(temple).length;
const repairProgress = (id) => REPAIRS[id].cost.map(([i, q]) => `${ITEMS[i].name} ${Math.min(G.inv.count(i), q)}/${q}`).join(' · ');

export const STORY = [
  { id: 'arrive', title: 'Welcome to Lume Island', goal: 'Talk to Mayor Rosalind in the Lumenbrook town square.', npc: 'rosalind',
    talk: (n) => [`Oh! You must be ${n}, our new islander. Welcome to Lumenbrook!`,
      'Long ago Lumas lived all over this island. Then the old light went quiet and they vanished into the temples as sleeping eggs.',
      'The town has set aside a plot of land for you, just north-west of here along the west road. Build whatever you like there.',
      'Start with a Workbench: chop trees, break rocks, then press B to open your Build menu. Here is a little something to get you going.'],
    reward: [['$', 100], ['fresh_bread', 3]] },
  { id: 'workbench', title: 'A place to work', goal: 'Gather wood and stone, then build a Workbench (press B).', check: () => G.placed.objs.some((o) => o.type === 'workbench'), where: () => HOMESTEAD, reward: [['$', 50]] },
  { id: 'permit', title: 'Choose a profession', goal: 'Visit Tobias at the Guild Hall and take your first profession permit. It is free!', npc: 'tobias', npcIsTarget: true,
    check: () => Object.keys(G.save.professions || {}).length > 0 },
  { id: 'lesson', title: 'Your first lesson', goal: 'Talk to your new mentor and finish their first lesson.', check: () => Object.values(G.save.professions || {}).some((p) => p.level >= 2),
    target: () => { const id = Object.keys(G.save.professions || {})[0]; return id ? npcPos(PROFESSIONS[id].mentor) : null; }, reward: [['$', 100]] },
  { id: 'temple', title: 'The Sunken Garden', goal: 'Find the Sunken Garden Temple north of Lumenbrook and reach its treasure.', site: 't_meadow', check: () => temple('t_meadow'),
    intro: { npc: 'rosalind', lines: ['You are settling in nicely! May I ask a favour?', 'Professor Ilsa believes Lumas still sleep inside the old temples.', 'The Sunken Garden Temple lies north of town, along the road past the Meadow Shrine. Mind the puzzles!'] } },
  { id: 'hatch', title: 'A Mysterious Egg', goal: 'Build an Incubator, make Luma Life at a workbench and hatch your Mysterious Egg.', check: () => (G.save.lumas || []).length > 0, reward: [['luma_food', 5]],
    intro: { npc: 'ilsa', lines: ['A Mysterious Egg! May I see? Remarkable... it is warm.', 'Bram the architect sells the Incubator blueprint. Build one at your homestead.', 'Then make Luma Life at a workbench: a Spirit, fiber and a flower. Earth Spirits are sold at every market, and the spirit decides what hatches.'] } },
  { id: 'bridge', title: 'The broken bridge', goal: 'Repair the old bridge over the river, west of your homestead.', check: () => G.save.gates?.bridge, where: () => ({ x: G.gates.bridgeInfo.rx + 14, z: G.gates.bridgeInfo.z }),
    progress: () => repairProgress('bridge'), reward: [['$', 300]],
    intro: { npc: 'rosalind', lines: ['A Luma! The island already feels brighter.', 'The forest folk of Mossvale have been cut off since the bridge fell. Could you fix it?', 'It needs Planks, Rope and Nails. A workbench makes planks and rope; nails need copper bars from a smelter.'] } },
  { id: 'mossvale', title: 'Into the forest', goal: 'Cross the river and meet Elder Fern in Mossvale.', npc: 'fern',
    talk: (n) => ['A visitor from across the river! The bridge is mended? Then the forest thanks you.', 'I am Fern. The Ancient Grove Temple sleeps in the far west, sealed by glowing roots.',
      'Only the Forest Shrine can wake it. Find the Verdant Offerings hidden among the trees and place four of them at the shrine, east of here.'] },
  { id: 'offerings', title: 'Lost offerings', goal: 'Place four Verdant Offerings at the Forest Shrine.', site: 'shrine_forest', check: () => G.shrines.placed('forest') >= 4,
    progress: () => `${G.shrines.placed('forest')}/4 placed · ${G.shrines.found('forest')} found` },
  { id: 'grove', title: 'The Ancient Grove', goal: 'The roots have parted! Reach the heart of the Ancient Grove Temple.', site: 't_forest', check: () => temple('t_forest') },
  { id: 'lift', title: 'The old lift', goal: 'Repair the old lift at the foot of the northern cliffs.', check: () => G.save.gates?.lift, where: () => ({ x: G.gates.lift.x, z: G.gates.lift.zc + 4 }),
    progress: () => repairProgress('lift'), reward: [['$', 500]],
    intro: { npc: 'fern', lines: ['You woke the Grove, and the Key of Leaf chose you.', 'The Frostpeak clan lives on the plateau above the cliffs. The old lift north of Mossvale is the only way up.', 'It needs Iron Bars, Rope and Planks. Iron ore hides in Ironroot Cave, west of here.'] } },
  { id: 'frostpeak', title: 'Frostpeak', goal: 'Ride the lift up and meet Chieftain Bjorn in Frostpeak.', npc: 'bjorn',
    talk: () => ['Ha! A climber! Welcome to Frostpeak, friend.', 'Three Frozen Tablets lie in three cold temples: the Forgotten Peak, the Forsaken Ice and the Frozen Echo.', 'Bring all three to the Summit Sanctum, east of town, and its door will open for you.'] },
  { id: 'tablets', title: 'Three frozen tablets', goal: 'Find the Frozen Tablets in the Forgotten Peak, Forsaken Ice and Frozen Echo temples.', check: () => tablets() >= 3 || G.save.flags?.open_t_mountain,
    progress: () => `${tablets()}/3 tablets`, target: () => { const s = SITES.find((x) => TABLET_TEMPLES.includes(x.id) && !temple(x.id)); return s ? { x: s.x, z: s.z } : null; } },
  { id: 'sanctum', title: 'The Summit Sanctum', goal: 'Open the Summit Sanctum with the three tablets and reach its treasure.', site: 't_mountain', check: () => temple('t_mountain') },
  { id: 'boat', title: 'Set sail', goal: 'Repair Old Finn\'s boat at the end of the Lumenbrook pier.', check: () => G.save.gates?.boat, where: () => ({ x: 56, z: 216 }),
    progress: () => repairProgress('boat'), reward: [['$', 800]],
    intro: { npc: 'bjorn', lines: ['The Key of Frost! The mountain approves of you.', 'The last key lies across the sea, in the jungle of Tikora.', 'Old Finn in Lumenbrook has a boat. It needs Hardwood, Fabric for a new sail, Rope and Moonstone Bars.'] } },
  { id: 'tikora', title: 'Tikora', goal: 'Sail to the jungle and meet Shaman Kaia in Tikora.', npc: 'kaia',
    talk: () => ['The sea carried you here. The jungle has been expecting you.', 'The Sun Temple stands south of the volcano. Its Ember Key is the last you need.', 'It is hot in there, and the traps are old but not asleep. Go carefully.'] },
  { id: 'sun', title: 'The Sun Temple', goal: 'Brave the Sun Temple near the volcano and claim the Ember Key.', site: 't_jungle', check: () => temple('t_jungle') },
  { id: 'great', title: 'The Great Temple', goal: 'Bring the four Ancient Keys to the Great Temple in Lumenbrook.', check: () => temple('great'), where: () => G.gates.greatSite && G.overworld.cities.lumenbrook.buildings.great_temple.door,
    progress: () => `${['meadow', 'forest', 'mountain', 'jungle'].filter((k) => G.inv.has('key_' + k)).length}/4 keys`,
    intro: { npc: 'kaia', lines: ['The Ember Key burns, but it does not hurt you. Good.', 'Four keys, four lights. Take them to the Great Temple in Lumenbrook.', 'The Great Luma has waited a very long time.'] } },
  { id: 'golden', title: 'The Great Luma', goal: 'Hatch the Golden Egg in an Incubator. Any Luma Life will do.', check: () => (G.save.lumas || []).some((l) => l.species === 'lumaria') },
  { id: 'free', title: 'Island life', goal: 'The island is yours! Master every profession, find all the Lumas and fill your journal.',
    intro: { npc: 'rosalind', lines: ['The old light hums again. Can you feel it? The whole town can.', 'Thank you, truly. Lume Island is your home now.', 'There is always more to find: Lumas, relics, recipes. Enjoy every day of it!'] } },
];
const STEP_BY_ID = Object.fromEntries(STORY.map((s, i) => [s.id, i]));

export function npcPos(id) {
  for (const c of Object.values(G.overworld.cities)) for (const n of c.npcs) if (n.def.id === id) return { x: n.x, z: n.z };
  if (id === 'morel' && G.morel?.npc) return { x: G.morel.npc.x, z: G.morel.npc.z };
  return null;
}

export class Quests {
  constructor() {
    this.markers = new Map();
    this._t = 0;
    this.excl = this.makeExcl();
    this.rootsMesh = null;
    G.events.on('gameStart', () => { this.state; this.refresh(true); this.syncRoots(); });
    G.events.on('offeringPlaced', () => this.syncRoots());
  }
  get state() { return (G.save.quests ||= { step: 0, intro: {}, done: [] }); }
  get step() { return STORY[Math.min(this.state.step, STORY.length - 1)]; }
  get index() { return this.state.step; }
  isDone(id) { return this.state.step > STEP_BY_ID[id]; }

  // ---------- dialogue hooks ----------
  onTalk(npcId) {
    const st = this.step;
    if (st.npc === npcId && st.talk) {
      return [...st.talk(G.save.name), () => this.complete()];
    }
    if (st.intro && st.intro.npc === npcId && !this.state.intro[st.id]) {
      return [...st.intro.lines, () => { this.state.intro[st.id] = true; this.refresh(); }];
    }
    return null;
  }
  npcHasQuest(npcId) {
    const st = this.step;
    if (st.npc === npcId && (st.talk || st.npcIsTarget)) return true;
    return !!(st.intro && st.intro.npc === npcId && !this.state.intro[st.id]);
  }
  hint() {
    const st = this.step;
    return st.id === 'free' ? 'The whole island is yours to enjoy. Have you met every Luma yet?' : `Here is what I would do next: ${st.goal.charAt(0).toLowerCase() + st.goal.slice(1)}`;
  }
  siteBlocked(id) {
    if (id === 't_forest' && !this.grovesOpen()) return 'Thick glowing roots seal the doorway. Elder Fern says the Forest Shrine can wake them: place four Verdant Offerings there.';
    return null;
  }
  grovesOpen() { return G.shrines.placed('forest') >= 4; }

  // ---------- progression ----------
  complete() {
    const st = this.step;
    if (!st || st.id === 'free') return;
    this.state.done.push(st.id);
    this.state.step++;
    for (const [id, q] of st.reward || []) {
      if (id === '$') G.player.addCoins(q); else { const left = G.inv.add(id, q); if (left) G.pickups.spawn(id, left, G.player.pos.x, G.player.pos.y + 1, G.player.pos.z); }
    }
    G.audio?.play('quest');
    const next = this.step;
    G.ui.banner('Quest complete', st.title, 2600);
    setTimeout(() => { if (this.step === next) G.ui.toast(`New goal: ${next.goal}`, 'magic', 6000); }, 2700);
    G.events.emit('questStep', next.id, st.id);
    this.refresh(true);
    if (st.id === 'offerings' || st.id === 'mossvale') this.syncRoots();
  }
  target() {
    const st = this.step;
    if (st.target) return st.target();
    if (st.npc) return npcPos(st.npc);
    if (st.intro && !this.state.intro[st.id] && !st.site && !st.where) return npcPos(st.intro.npc);
    if (st.site) { const s = SITES.find((x) => x.id === st.site); return s ? { x: s.x, z: s.z } : null; }
    if (st.where) return st.where();
    return null;
  }
  update(dt) {
    for (const [n, m] of this.markers) m.position.y = 3.0 * (n.def.look.scale ?? 1) + Math.sin(G.elapsed * 3) * 0.08;
    this._t -= dt;
    if (this._t > 0) return;
    this._t = 0.5;
    // several checks can pass at once (an old save); advance one per tick
    const st = this.step;
    if (st.check && st.check()) { this.complete(); return; }
    this.refresh();
  }
  refresh(force = false) {
    this.updateTracker(force);
    this.updateMarkers();
  }
  updateTracker(force) {
    const el = G.ui.tracker;
    const st = this.step;
    const show = G.settings.showTracker && G.started && !!st;
    el.hidden = !show;
    if (!show) return;
    let where = '';
    const t = this.target();
    if (t && G.level === G.overworld) {
      const dx = t.x - G.player.pos.x, dz = t.z - G.player.pos.z, d = Math.hypot(dx, dz);
      where = d < 12 ? 'Right here!' : `${Math.round(d)} m ${dirName(dx, dz)}`;
    }
    const prog = st.progress ? st.progress() : '';
    const key = st.id + '|' + where + '|' + prog;
    if (!force && key === this._key) return;
    this._key = key;
    clear(el).append(...[h('h3', {}, st.title), h('p', {}, st.goal), prog && h('div', { class: 'obj' }, prog), where && h('div', { class: 'tr-where' }, '➜ ' + where)].filter(Boolean));
  }
  // "!" over the heads of townsfolk with something to say
  makeExcl() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = '#ffd23a'; x.strokeStyle = '#5e3a20'; x.lineWidth = 6;
    x.beginPath(); x.moveTo(20, 8); x.lineTo(44, 8); x.lineTo(38, 60); x.lineTo(26, 60); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.arc(32, 80, 10, 0, Math.PI * 2); x.fill(); x.stroke();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  }
  updateMarkers() {
    for (const c of Object.values(G.overworld.cities)) for (const n of c.npcs) {
      const want = this.npcHasQuest(n.def.id);
      let m = this.markers.get(n);
      if (want && !m) {
        m = new THREE.Sprite(this.excl);
        m.scale.set(0.8, 1.2, 1);
        m.renderOrder = 12;
        m.position.y = 3.0 * (n.def.look.scale ?? 1);
        n.object.add(m);
        this.markers.set(n, m);
      } else if (!want && m) { n.object.remove(m); this.markers.delete(n); }
    }
  }
  // roots sealing the Ancient Grove Temple until the shrine wakes them
  syncRoots() {
    const site = G.overworld.sites?.t_forest;
    if (!site) return;
    if (!this.rootsMesh) {
      const parts = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 8 - 0.5) * 2.4;
        parts.push(part(P.cyl(0.12, 0.22, 3.6, 5), i % 2 ? 0x5a3a24 : 0x6a4a2a, { x: a, y: 1.5, rz: (i - 4) * 0.12, rx: 0.15, jitter: 0.1 }));
      }
      for (let i = 0; i < 6; i++) parts.push(part(P.ico(0.16, 0), 0x6ff08a, { x: (i - 2.5) * 0.5, y: 0.6 + (i % 3) * 0.9, z: 0.15, jitter: 0 }));
      const m = new THREE.Mesh(merge(parts), MAT.world);
      m.castShadow = true;
      m.position.set(site.door.x, G.overworld.heightAt(site.door.x, site.door.z - 2.6), site.door.z - 2.6);
      G.overworld.scene.add(m);
      this.rootsMesh = m;
    }
    this.rootsMesh.visible = !this.grovesOpen();
  }
}
