// Buying and selling with shopkeepers (coins) and Morel (biome tokens).
import { G } from '../core/game.js';
import { h, clear } from './dom.js';
import { makePanel } from './ui.js';
import { ITEMS } from '../data/items.js';
import { SHOPS, buyPrice } from '../data/shops.js';
import { icon, slotEl, coinTag, hideTip } from './widgets.js';

export class ShopUI {
  constructor() {
    this.panel = makePanel('Shop', { cls: 'wide shop' });
    this.panel.onClose = () => hideTip();
    this.sel = -1;
  }
  open(shopId, npc, tab = 'buy') {
    this.shopId = shopId;
    this.shop = SHOPS[shopId];
    this.npc = npc;
    this.tab = tab;
    this.sel = -1;
    this.panel.setTitle(this.shop.name);
    this.render();
    G.ui.open(this.panel);
  }
  tokenId() { return 'token_' + (G.morel?.biome || 'meadow'); }
  render() {
    const b = clear(this.panel.body);
    const tabs = h('div', { class: 'tabs' },
      h('button', { class: 'tab' + (this.tab === 'buy' ? ' on' : ''), onclick: () => { this.tab = 'buy'; this.render(); } }, this.shop.token ? 'Trade' : 'Buy'),
      this.shop.token ? null : h('button', { class: 'tab' + (this.tab === 'sell' ? ' on' : ''), onclick: () => { this.tab = 'sell'; this.sel = -1; this.render(); } }, 'Sell'),
      h('div', { class: 'spacer' }),
      this.shop.token ? h('span', { class: 'price' }, icon(this.tokenId(), 'mini'), String(G.inv.count(this.tokenId()))) : coinTag(G.save.coins.toLocaleString(), 'big'));
    b.append(tabs);
    if (this.shop.farm && this.tab === 'buy') b.append(h('p', { class: 'note' }, 'Nobody farms on Lume Island, so all crops, eggs, milk and Earth Spirits come from the market.'));
    if (this.tab === 'buy') this.renderBuy(b); else this.renderSell(b);
  }
  renderBuy(b) {
    const list = h('div', { class: 'shop-list' });
    const cozy = G.save.difficulty === 'cozy';
    for (const e of this.shop.sells) {
      const id = typeof e === 'string' ? e : e.id;
      const it = ITEMS[id];
      if (!it) continue;
      const bought = G.save.flags['bought_' + this.shopId + '_' + id];
      if (e.once && bought) continue;
      let price, afford, payLabel;
      if (this.shop.token) {
        price = e.token;
        afford = (n) => G.inv.count(this.tokenId()) >= price * n;
        payLabel = h('span', { class: 'price' }, icon(this.tokenId(), 'mini'), String(price));
      } else {
        price = buyPrice(this.shop, id, cozy);
        afford = (n) => G.save.coins >= price * n;
        payLabel = coinTag(price);
      }
      const qtyEach = e.qty || 1;
      const buy = (n) => {
        if (!afford(n)) { G.ui.toast(this.shop.token ? 'Not enough tokens.' : 'Not enough coins.', 'warn'); G.audio?.play('error'); return; }
        if (G.inv.room(id) < n * qtyEach) { G.ui.toast('Your bag is full!', 'warn'); return; }
        if (this.shop.token) G.inv.remove(this.tokenId(), price * n); else G.player.addCoins(-price * n);
        G.inv.add(id, n * qtyEach, true);
        if (e.once) G.save.flags['bought_' + this.shopId + '_' + id] = true;
        G.audio?.play('buy');
        G.ui.toast(`Bought ${n * qtyEach} ${it.name}`, 'good', 1600);
        G.events.emit('bought', id, n * qtyEach);
        this.render();
      };
      const row = h('div', { class: 'shop-row' },
        icon(id),
        h('div', { class: 'shop-name' }, h('b', {}, it.name + (qtyEach > 1 ? ` ×${qtyEach}` : '')), h('small', {}, it.desc || (it.farm ? 'Farm goods' : it.cat))),
        payLabel,
        h('div', { class: 'shop-btns' },
          h('button', { class: 'btn small', disabled: !afford(1), onclick: () => buy(1) }, 'Buy'),
          it.stack > 1 && !e.once ? h('button', { class: 'btn small ghost', disabled: !afford(5), onclick: () => buy(5) }, '×5') : null));
      row.addEventListener('mouseenter', () => {});
      list.append(row);
    }
    b.append(list);
  }
  renderSell(b) {
    const grid = h('div', { class: 'grid-slots' });
    G.inv.slots.forEach((s, i) => {
      const it = s && ITEMS[s.id];
      const el = slotEl(s, { hot: i < 10, cls: (i === this.sel ? 'picked' : '') + (it && (it.noSell || !it.price) ? ' dim' : ''), onClick: () => { this.sel = i; this.render(); } });
      grid.append(el);
    });
    b.append(grid);
    const s = G.inv.slots[this.sel];
    const bar = h('div', { class: 'sell-bar' });
    if (s) {
      const it = ITEMS[s.id];
      const p = it.price || 0;
      const sell = (n) => {
        n = Math.min(n, G.inv.slots[this.sel]?.qty || 0);
        if (!n) return;
        G.inv.removeAt(this.sel, n);
        G.player.addCoins(p * n);
        G.save.stats.sold += n;
        G.events.emit('sold', it.id, n, p * n);
        G.audio?.play('coin');
        this.render();
      };
      bar.append(icon(s.id), h('div', { class: 'shop-name' }, h('b', {}, it.name), h('small', {}, it.noSell || !p ? 'The shop will not buy this.' : `${p} coins each`)));
      if (!it.noSell && p) bar.append(h('div', { class: 'shop-btns' }, h('button', { class: 'btn small', onclick: () => sell(1) }, 'Sell 1'), h('button', { class: 'btn small teal', onclick: () => sell(s.qty) }, `Sell all (${(p * s.qty).toLocaleString()})`)));
    } else bar.append(h('p', { class: 'muted' }, 'Pick an item from your bag to sell it.'));
    b.append(bar);
  }
}
