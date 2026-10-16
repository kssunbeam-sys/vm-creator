// Using special items from the hotbar or backpack.
import { G } from '../core/game.js';
import { ITEMS } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';

export class UseItems {
  useSpecial(it, slot) {
    const consume = () => { G.inv.removeAt(slot, 1); G.ui.hotbarDirty = true; };
    switch (it.use) {
      case 'return': {
        consume();
        G.audio?.play('magic');
        const hx = G.overworld.homestead.door;
        if (G.level !== G.overworld) G.travel.toOverworld({ x: hx.x, z: hx.z + 2 });
        else G.travel.hop(hx.x, hx.z + 2, 'Home', 'The charm whisks you away');
        return;
      }
      case 'lantern': G.save.flags.lumaLanternDay = G.time.day; consume(); G.ui.toast('The Luma Lantern glows. You can stay in cave darkness twice as long today.', 'magic'); return;
      case 'compass': G.treasure.compass(); return;
      case 'heart': consume(); G.player.maxHp += 4; G.save.maxHp = G.player.maxHp; G.player.hp = G.player.maxHp; G.audio?.play('levelup'); G.ui.banner('+1 Heart', 'You feel stronger'); return;
      case 'backpack': consume(); G.inv.resize(G.inv.size + 10); G.save.invSize = G.inv.size; G.ui.toast('Your backpack now holds 10 more stacks.', 'good'); return;
      case 'superfood': consume(); G.lumas.addEnergy(3); G.ui.toast('+3 Luma Energy', 'magic'); return;
      case 'book': {
        consume();
        const books = RECIPES.filter((r) => r.unlock === 'book' && !G.save.recipes.includes(r.id));
        if (books.length) { G.save.recipes.push(books[0].id); G.ui.banner('Ancient Book', `You learned to build: ${ITEMS[books[0].out[0]].name}`); }
        else { G.lumas.addEnergy(5); G.ui.banner('Ancient Book', 'Old Luma lore fills you with energy (+5 Luma Energy)'); }
        G.audio?.play('magic');
        return;
      }
      case 'treasuremap': if (G.treasure.useMap()) consume(); return;
      default:
        G.ui.toast(it.desc || "You can't use that here.", 'info');
    }
  }
}
