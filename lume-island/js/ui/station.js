// Crafting at a station: recipe list, details, queue with progress, output.
import { G } from '../core/game.js';
import { h, clear } from './dom.js';
import { makePanel } from './ui.js';
import { ITEMS } from '../data/items.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { icon, hideTip, slotEl } from './widgets.js';
import { recipesFor, recipeUnlocked, lockReason, nearbySources, countIng, ingName, ingIcon, maxCraftable, consume, addJob, processStation, jobProgress } from '../systems/crafting.js';

const fmtTime = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + 'm' : ''}`.trim() : `${m}m`);

export class StationUI {
  constructor() {
    this.panel = makePanel('Station', { cls: 'wide station' });
    this.panel.onClose = () => { hideTip(); clearInterval(this._iv); };
    this.sel = null;
  }
  open(st) {
    this.st = st;
    this.panel.setTitle(ITEMS[st.type].name);
    const list = recipesFor(st.type);
    this.sel = list.find((r) => recipeUnlocked(r))?.id ?? list[0]?.id;
    this.render();
    G.ui.open(this.panel);
    clearInterval(this._iv);
    this._iv = setInterval(() => { if (G.ui.isOpen(this.panel)) { processStation(this.st); this.renderQueue(); } }, 400);
  }
  render() {
    const st = this.st;
    const b = clear(this.panel.body);
    const src = nearbySources(st.x, st.z);
    const list = recipesFor(st.type).sort((a, c) => (recipeUnlocked(c) - recipeUnlocked(a)));
    const col1 = h('div', { class: 'rc-list' });
    for (const rc of list) {
      const ok = recipeUnlocked(rc);
      const can = ok && maxCraftable(rc, src) > 0;
      col1.append(h('button', { class: 'rc-item' + (this.sel === rc.id ? ' on' : '') + (ok ? '' : ' locked') + (can ? ' can' : ''), onclick: () => { this.sel = rc.id; this.render(); } },
        icon(rc.out[0]), h('span', {}, ITEMS[rc.out[0]].name + (rc.out[1] > 1 ? ` ×${rc.out[1]}` : '')), can ? h('i', { class: 'dot' }) : null));
    }
    const rc = RECIPE_BY_ID[this.sel];
    const col2 = h('div', { class: 'rc-detail' });
    if (rc) {
      const out = ITEMS[rc.out[0]];
      const ok = recipeUnlocked(rc);
      const max = ok ? maxCraftable(rc, src) : 0;
      col2.append(h('div', { class: 'rc-head' }, icon(rc.out[0], 'big'), h('div', {}, h('h3', {}, out.name + (rc.out[1] > 1 ? ` ×${rc.out[1]}` : '')), h('p', { class: 'muted' }, out.desc || (out.price ? `Sells for ${out.price} coins` : '')))));
      const ings = h('div', { class: 'ings' });
      for (const [ing, q] of rc.ins) {
        const have = countIng(src, ing);
        ings.append(h('div', { class: 'ing' + (have >= q ? '' : ' short') }, icon(ingIcon(ing), 'mini'), h('span', {}, ingName(ing)), h('b', {}, `${have}/${q}`)));
      }
      if (rc.energy) ings.append(h('div', { class: 'ing' + ((G.save.lumaEnergy || 0) >= rc.energy ? '' : ' short') }, h('span', { class: 'ico-energy' }), h('span', {}, 'Luma Energy'), h('b', {}, `${G.save.lumaEnergy || 0}/${rc.energy}`)));
      col2.append(ings);
      col2.append(h('p', { class: 'muted small' }, `Takes ${fmtTime(rc.time)} of island time.` + (rc.chance ? ` ${Math.round(rc.chance * 100)}% chance.` : '') + (rc.loot ? ' Contents are random.' : '') + ' Ingredients can come from chests nearby.'));
      if (!ok) col2.append(h('p', { class: 'lock' }, '🔒 ' + lockReason(rc)));
      else {
        const go = (n) => {
          n = Math.min(n, maxCraftable(rc, nearbySources(st.x, st.z)));
          if (n <= 0) { G.audio?.play('error'); return; }
          if (st.data.queue.length >= 6) { G.ui.toast('The queue is full.', 'warn'); return; }
          consume(rc, nearbySources(st.x, st.z), n);
          addJob(st, rc, n);
          G.audio?.play('craft');
          G.events.emit('craftStart', rc.id, n);
          this.render();
        };
        col2.append(h('div', { class: 'row' },
          h('button', { class: 'btn', disabled: max < 1, onclick: () => go(1) }, 'Craft 1'),
          h('button', { class: 'btn ghost', disabled: max < 5, onclick: () => go(5) }, '×5'),
          h('button', { class: 'btn ghost', disabled: max < 2, onclick: () => go(max) }, `Max (${max})`)));
      }
    }
    this.queueEl = h('div', { class: 'queue' });
    b.append(h('div', { class: 'station-cols' }, col1, col2), this.queueEl);
    this.renderQueue();
  }
  renderQueue() {
    const st = this.st;
    const q = clear(this.queueEl);
    const jobs = h('div', { class: 'jobs' });
    st.data.queue.forEach((j, i) => {
      const rc = RECIPE_BY_ID[j.r];
      const pct = i === 0 ? Math.round(jobProgress(st) * 100) : 0;
      jobs.append(h('div', { class: 'job' }, icon(rc.out[0], 'mini'), h('span', {}, `${j.n - j.done} left`), h('div', { class: 'meter' }, h('span', { style: { width: pct + '%' } }))));
    });
    if (!st.data.queue.length) jobs.append(h('span', { class: 'muted small' }, 'Nothing is being made.'));
    const outs = h('div', { class: 'outs' });
    st.out.slots.forEach((s) => { if (s) outs.append(slotEl(s, {})); });
    q.append(h('div', { class: 'row' }, h('b', {}, 'Working on'), jobs),
      h('div', { class: 'row' }, h('b', {}, 'Ready'), outs, h('div', { class: 'spacer' }),
        h('button', { class: 'btn small teal', disabled: st.out.isEmpty(), onclick: () => { G.placed.collect(st); this.render(); } }, 'Collect all'),
        h('button', { class: 'btn small ghost', onclick: () => { if (G.placed.pickUp(st)) G.ui.close(this.panel); } }, 'Pick up station')));
  }
}
