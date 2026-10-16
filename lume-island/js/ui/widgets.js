// Shared UI pieces: item slots, tooltips, price tags, cost lists.
import { G } from '../core/game.js';
import { h, SVG } from './dom.js';
import { ITEMS } from '../data/items.js';
import { iconURL } from './icons.js';

const CAT_LABEL = {
  tool: 'Tool', resource: 'Resource', ore: 'Ore', bar: 'Metal bar', gem: 'Gem', material: 'Material', forage: 'Forage', bug: 'Bug · Bait',
  fish: 'Fish', junk: 'Junk', farm: 'Farm goods', spirit: 'Spirit', luma: 'Luma', special: 'Special', treasure: 'Treasure', relic: 'Relic',
  food: 'Meal', drink: 'Drink', smithing: 'Smithing', jewelry: 'Jewelry', placeable: 'Placeable',
};

let tipEl = null;
export function tooltip() {
  if (!tipEl) { tipEl = h('div', { class: 'tooltip', hidden: true }); document.body.append(tipEl); }
  return tipEl;
}
export function showTip(id, x, y, extra = '') {
  const it = ITEMS[id];
  if (!it) return;
  const t = tooltip();
  const tier = it.cat === 'tool' ? G.save.tools[it.tool] : null;
  const lines = [];
  if (tier) lines.push(`${['Copper', 'Iron', 'Moonstone', 'Volcanic'][tier.tier]} · Level ${tier.lvl}`);
  if (it.food) lines.push(`Restores ${it.food * (it.cat === 'food' ? 2 : 1.5) / 4} ♥`);
  if (it.price && !it.noSell) lines.push(`Sells for ${it.price}`);
  t.innerHTML = `<div class="cat">${CAT_LABEL[it.cat] || it.cat}${it.farm ? ' · bought at markets' : ''}</div><h4>${it.name}</h4>${it.desc ? `<p>${it.desc}</p>` : ''}${lines.length ? `<p class="muted">${lines.join(' · ')}</p>` : ''}${extra}`;
  t.hidden = false;
  const r = t.getBoundingClientRect();
  t.style.left = Math.min(window.innerWidth - r.width - 8, x + 14) + 'px';
  t.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, y + 14)) + 'px';
}
export function hideTip() { if (tipEl) tipEl.hidden = true; }

export function icon(id, cls = '') {
  const it = ITEMS[id];
  const tier = it?.cat === 'tool' ? G.save.tools[it.tool]?.tier : undefined;
  return h('img', { class: 'icon ' + cls, src: iconURL(id, { tier }), alt: it?.name ?? '', draggable: 'false' });
}

export function slotEl(slot, opts = {}) {
  const el = h('button', { class: 'gslot' + (opts.hot ? ' hot' : '') + (opts.cls ? ' ' + opts.cls : ''), type: 'button' });
  if (slot) {
    el.append(icon(slot.id));
    if (slot.qty > 1) el.append(h('span', { class: 'qty' }, String(slot.qty)));
    el.addEventListener('mouseenter', (e) => showTip(slot.id, e.clientX, e.clientY, opts.tipExtra?.(slot) ?? ''));
    el.addEventListener('mousemove', (e) => showTip(slot.id, e.clientX, e.clientY, opts.tipExtra?.(slot) ?? ''));
    el.addEventListener('mouseleave', hideTip);
    el.setAttribute('aria-label', `${ITEMS[slot.id].name}${slot.qty > 1 ? ' x' + slot.qty : ''}`);
  } else el.setAttribute('aria-label', 'Empty slot');
  if (opts.onClick) el.addEventListener('click', (e) => { hideTip(); opts.onClick(e); });
  return el;
}

export function coinTag(n, cls = '') {
  return h('span', { class: 'price ' + cls }, h('span', { class: 'ico', html: SVG.coin }), String(n));
}

// [{id, qty}] → list with have/need colouring; also coins / tokens
export function costList(costs, extra = {}) {
  const wrap = h('div', { class: 'costs' });
  for (const c of costs) {
    const have = c.id === '$' ? G.save.coins : G.inv.count(c.id);
    const ok = have >= c.qty;
    if (c.id === '$') wrap.append(h('span', { class: 'cost' + (ok ? '' : ' short') }, coinTag(c.qty)));
    else wrap.append(h('span', { class: 'cost' + (ok ? '' : ' short'), title: ITEMS[c.id]?.name }, icon(c.id, 'mini'), h('b', {}, `${Math.min(have, 999)}/${c.qty}`)));
  }
  return wrap;
}

export function canAfford(costs) {
  return costs.every((c) => (c.id === '$' ? G.save.coins >= c.qty : G.inv.count(c.id) >= c.qty));
}
export function payCosts(costs) {
  for (const c of costs) { if (c.id === '$') G.player.addCoins(-c.qty); else G.inv.remove(c.id, c.qty); }
}
