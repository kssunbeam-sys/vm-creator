// Tool upgrades: 5 levels per tier, then the next metal. Costs Tool Tokens,
// bars (leather for the whip) and coins.
import { G } from '../core/game.js';
import { h, clear } from './dom.js';
import { makePanel } from './ui.js';
import { ITEMS } from '../data/items.js';
import { icon, costList, canAfford, payCosts } from './widgets.js';
import { clearIconCache } from './icons.js';

export const TIERS = ['Copper', 'Iron', 'Moonstone', 'Volcanic'];
const BAR = ['copper_bar', 'iron_bar', 'moonstone_bar', 'volcanic_bar'];
const TOOLS = ['axe', 'pickaxe', 'shovel', 'whip', 'rod', 'net'];

export function nextLevel(t) {
  if (t.lvl < 5) return { tier: t.tier, lvl: t.lvl + 1 };
  if (t.tier < 3) return { tier: t.tier + 1, lvl: 1 };
  return null;
}
export function upgradeCost(type, t) {
  const n = nextLevel(t);
  if (!n) return null;
  const tokens = 1 + Math.floor((n.lvl - 1) / 2) + n.tier;
  const bars = 2 + n.lvl + n.tier;
  const coins = 60 * (n.tier + 1) * (n.lvl + (n.tier ? 2 : 0));
  const mat = type === 'whip' ? 'leather' : type === 'net' || type === 'rod' ? (n.tier === 0 ? 'copper_bar' : BAR[n.tier]) : BAR[n.tier];
  const costs = [{ id: 'tool_token', qty: tokens }, { id: mat, qty: type === 'whip' ? Math.ceil(bars * (1 + n.tier * 0.5)) : bars }, { id: '$', qty: coins }];
  if (type === 'whip' && n.tier > 0) costs.splice(2, 0, { id: BAR[n.tier], qty: 1 + n.tier });
  return { next: n, costs };
}

export class AnvilUI {
  constructor() { this.panel = makePanel('Upgrade Tools', { cls: 'anvil' }); }
  open() { this.render(); G.ui.open(this.panel); }
  render() {
    const b = clear(this.panel.body);
    b.append(h('p', { class: 'note' }, 'Each tool has five levels per metal. A fully upgraded tool moves on to the next metal and can break tougher rocks and trees.'));
    for (const type of TOOLS) {
      if (!G.inv.has(type)) continue;
      const t = G.save.tools[type];
      const up = upgradeCost(type, t);
      const row = h('div', { class: 'anvil-row' },
        icon(type),
        h('div', { class: 'shop-name' }, h('b', {}, ITEMS[type].name), h('small', {}, `${TIERS[t.tier]} · Level ${t.lvl}` + (up ? `  →  ${TIERS[up.next.tier]} · Level ${up.next.lvl}` : '  ·  Mastered'))),
        up ? costList(up.costs) : h('span', { class: 'muted' }, 'Fully upgraded'),
        up ? h('button', { class: 'btn small', disabled: !canAfford(up.costs), onclick: () => this.upgrade(type) }, 'Upgrade') : null);
      b.append(row);
    }
    b.append(h('p', { class: 'muted small' }, 'Tool Tokens come from shiny dirt piles, pots, crates and chests.'));
  }
  upgrade(type) {
    const t = G.save.tools[type];
    const up = upgradeCost(type, t);
    if (!up || !canAfford(up.costs)) return;
    payCosts(up.costs);
    G.save.tools[type] = up.next;
    clearIconCache(type);
    G.ui.hotbarDirty = true;
    G.player.heldKey = '';
    G.audio?.play('anvil');
    G.ui.toast(`${ITEMS[type].name} upgraded to ${TIERS[up.next.tier]} level ${up.next.lvl}!`, 'good');
    G.events.emit('toolUpgraded', type, up.next);
    this.render();
  }
}
