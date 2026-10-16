// Profession permits, mentor lessons and levels.
import { G } from '../core/game.js';
import { h, clear } from '../ui/dom.js';
import { makePanel } from '../ui/ui.js';
import { ITEMS } from '../data/items.js';
import { PROFESSIONS, PROF_IDS, PERMIT_COSTS, LEVEL_TITLES } from '../data/professions.js';
import { RECIPES } from '../data/recipes.js';
import { NPCS } from '../data/npcs.js';
import { icon, coinTag, hideTip } from '../ui/widgets.js';

const STARTER = {
  cook: [['potato', 6], ['tomato', 2], ['milk', 1]],
  brewer: [['red_berry', 6], ['bottle', 2], ['red_dye', 2]],
  treasure: [['map_fragment', 3], ['coffer_meadow', 1]],
  smith: [['copper_ore', 9], ['charcoal', 3]],
  fisher: [['caterpillar', 8], ['sunny_sardine', 1]],
  jewel: [['rough_quartz', 4], ['copper_bar', 1]],
  arch: [['rubble_meadow', 2], ['glue', 2]],
};

export class Professions {
  level(id) { return G.save.professions[id]?.level || 0; }
  has(id) { return this.level(id) > 0; }
  owned() { return PROF_IDS.filter((p) => this.has(p)); }
  nextPermitCost() { return PERMIT_COSTS[Math.min(PERMIT_COSTS.length - 1, this.owned().length)]; }
  buyPermit(id) {
    if (this.has(id)) return;
    const cost = Math.round(this.nextPermitCost() * (G.save.difficulty === 'cozy' ? 0.8 : 1));
    if (G.save.coins < cost) { G.ui.toast('Not enough coins for that permit.', 'warn'); return; }
    G.player.addCoins(-cost);
    G.save.professions[id] = { level: 1, gift: false };
    const p = PROFESSIONS[id];
    const mentor = NPCS.find((n) => n.id === p.mentor);
    G.audio?.play('levelup');
    G.ui.banner(p.name + ' Permit', 'Visit ' + mentor.name + ' in Lumenbrook');
    G.events.emit('permit', id);
  }
  levelUp(id) {
    const st = G.save.professions[id];
    st.level++;
    const p = PROFESSIONS[id];
    const unlocked = RECIPES.filter((r) => r.unlock?.prof === id && r.unlock.lvl === st.level).map((r) => ITEMS[r.out[0]].name);
    G.ui.banner(`${p.name} Level ${st.level}`, LEVEL_TITLES[st.level]);
    if (unlocked.length) G.ui.toast('New recipes: ' + unlocked.join(', '), 'magic', 5000);
    G.audio?.play('levelup');
    G.events.emit('profLevel', id, st.level);
  }
  mentorTalk(npc, dlg) {
    const id = npc.def.prof;
    const p = PROFESSIONS[id];
    const back = [{ label: 'Back', fn: () => dlg.menu('Anything else?') }, { label: 'Goodbye', fn: () => dlg.close() }];
    if (!this.has(id)) {
      dlg.say(`You want to become a ${p.name}? Wonderful! First get a permit from Tobias at the Guild Hall.`, back);
      return;
    }
    const st = G.save.professions[id];
    if (!st.gift) {
      st.gift = true;
      for (const [it, q] of STARTER[id] || []) G.inv.add(it, q);
      const stations = p.stations.slice(0, id === 'jewel' || id === 'arch' ? 2 : 1).map((s) => ITEMS[s].name).join(' and ');
      if (id === 'treasure') { G.save.flags.dog = true; if (!G.save.activeLuma) G.lumas?.setActive('dog'); }
      dlg.say(`Welcome, apprentice! Here is something to get you started. Build a ${stations} from your Build menu (B), and come back when you are ready for your first lesson.` + (id === 'treasure' ? ' Oh, and take Biscuit. Best treasure nose on the island!' : ''), back);
      return;
    }
    const lvl = st.level;
    if (lvl >= 8) { dlg.say(`You are a Grand Master ${p.name}. There is nothing left for me to teach you!`, back); return; }
    const task = p.tasks[lvl - 1];
    const needTxt = task.need.map(([it, q]) => `${q} ${ITEMS[it].name}`).join(' and ');
    const ready = task.need.every(([it, q]) => G.inv.count(it) >= q);
    const opts = [];
    if (ready) opts.push({ label: 'Hand over ' + needTxt, fn: () => {
      for (const [it, q] of task.need) G.inv.remove(it, q);
      const reward = 120 * lvl * lvl;
      G.player.addCoins(reward);
      if (lvl % 2 === 0) G.inv.add('tool_token', 1);
      this.levelUp(id);
      dlg.say(`Splendid work! Here are ${reward} coins. You are now a level ${st.level} ${p.name}.`, back);
    } });
    opts.push(...back);
    dlg.say(`Lesson ${lvl}: ${task.text} (Bring ${needTxt}.)`, opts);
  }
}

export class GuildUI {
  constructor() { this.panel = makePanel('Guild Hall · Profession Permits', { cls: 'wide' }); this.panel.onClose = () => hideTip(); }
  open() { this.render(); G.ui.open(this.panel); }
  render() {
    const b = clear(this.panel.body);
    const prof = G.professions;
    const cost = Math.round(prof.nextPermitCost() * (G.save.difficulty === 'cozy' ? 0.8 : 1));
    b.append(h('p', { class: 'note' }, prof.owned().length ? `Your next permit costs ${cost.toLocaleString()} coins. You can learn every profession eventually.` : 'Your first permit is free! Pick the path that sounds most fun. You can learn the others later.'));
    const grid = h('div', { class: 'prof-grid' });
    for (const id of PROF_IDS) {
      const p = PROFESSIONS[id];
      const mentor = NPCS.find((n) => n.id === p.mentor);
      const lvl = prof.level(id);
      const diff = '★'.repeat(p.difficulty) + '☆'.repeat(3 - p.difficulty);
      grid.append(h('div', { class: 'prof-card' + (lvl ? ' owned' : '') },
        h('div', { class: 'prof-top' }, h('h3', {}, p.name), h('span', { class: 'diff', title: 'Difficulty' }, diff)),
        h('p', {}, p.blurb),
        h('p', { class: 'muted small' }, `Mentor: ${mentor.name} · Stations: ${p.stations.map((s) => ITEMS[s].name).join(', ')}`),
        lvl ? h('div', { class: 'row' }, h('b', {}, `Level ${lvl} · ${LEVEL_TITLES[lvl]}`), h('div', { class: 'meter' }, h('span', { style: { width: (lvl / 8 * 100) + '%' } })))
          : h('button', { class: 'btn small', disabled: G.save.coins < cost, onclick: () => { prof.buyPermit(id); this.render(); } }, cost ? `Get permit · ${cost.toLocaleString()}` : 'Get permit · Free')));
    }
    b.append(grid);
  }
}
