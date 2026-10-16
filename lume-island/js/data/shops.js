// What each shop sells. Buy price = item price x markup unless a price is given.
// Farm goods are sold at every city's market since nobody farms on Lume Island.
import { ITEMS } from './items.js';

const farmOf = (biome) => Object.values(ITEMS).filter((i) => i.farm && i.biome === biome).map((i) => i.id);
const STAPLES = ['flour', 'sugar', 'salt', 'earth_spirit'];

export const SHOPS = {
  general_lumenbrook: { name: "Mira's General Store", markup: 2, sells: ['torch', 'chest', 'luma_food', 'rope', 'plank', 'glass', 'bottle', 'fiber', 'stone', 'wood', 'workbench', 'lamp_post', 'fence', 'flower_pot', 'bench', 'signpost'] },
  market_lumenbrook: { name: "Hattie's Farmers' Market", markup: 1.6, farm: true, sells: [...farmOf('meadow'), ...STAPLES, 'red_berry', 'hay_bale', 'scarecrow'] },
  herbalist: { name: "Willow's Remedies", markup: 2, sells: [{ id: 'net', price: 50 }, 'daisy', 'poppy', 'bluebell', 'edelweiss', 'orchid', 'meadow_mushroom', 'porcini', 'glowcap', 'snowcap', 'ember_shroom', 'luma_food', 'red_dye', 'blue_dye', 'nature_spirit', 'lost_spirit', 'sap'] },
  tackle: { name: "Finn's Tackle & Bait", markup: 2, sells: [{ id: 'rod', price: 60 }, 'caterpillar', 'grasshopper', 'frost_beetle', 'firefly', 'magnet', 'rope', 'water_spirit'] },
  smith_lumenbrook: { name: "Garrick's Smithy", markup: 2, sells: [{ id: 'whip', price: 120 }, 'copper_ore', 'copper_bar', 'charcoal', 'nails', 'smelter', 'kiln'] },
  inn_lumenbrook: { name: 'The Sleepy Lantern', markup: 1.8, sells: ['baked_potato', 'tomato_soup', 'fresh_bread', 'berry_juice', 'wheat_ale'], inn: 40 },

  general_mossvale: { name: "Birch's Woodcraft", markup: 2, sells: ['hardwood', 'plank', 'glue', 'leather', 'rope', 'torch', 'chest', 'luma_food', 'pinecone', 'planter', 'banner'] },
  market_mossvale: { name: "Hazel's Forest Market", markup: 1.6, farm: true, sells: [...farmOf('forest'), ...STAPLES, ...farmOf('meadow').slice(0, 4), 'blueberry'] },
  smith_mossvale: { name: "Sorrel's Forge", markup: 2, sells: [{ id: 'whip', price: 120 }, 'iron_ore', 'iron_bar', 'copper_bar', 'charcoal', 'nails'] },
  inn_mossvale: { name: 'The Mossy Hearth', markup: 1.8, sells: ['mushroom_stew', 'pumpkin_pie', 'honey_mead', 'hop_ale'], inn: 60 },

  general_frostpeak: { name: "Garnet's Gem Trade", markup: 2, sells: ['rough_quartz', 'rough_amethyst', 'rough_topaz', 'rough_sapphire', 'moonstone_ore', 'gold_nugget', 'pearl', 'torch', 'luma_food', 'chest', 'pinewood'] },
  market_frostpeak: { name: "Sigrid's Highland Market", markup: 1.6, farm: true, sells: [...farmOf('mountain'), ...STAPLES, 'frostberry'] },
  smith_frostpeak: { name: "Ulla's Mountain Forge", markup: 2, sells: ['iron_bar', 'moonstone_ore', 'moonstone_bar', 'charcoal', 'gold_bar'] },
  inn_frostpeak: { name: 'The Snowcap Lodge', markup: 1.8, sells: ['cheese_fondue', 'alpine_stew', 'apple_cider', 'grape_wine'], inn: 80 },

  general_tikora: { name: "Ash's Ember Trade", markup: 2, sells: ['volcanic_ore', 'volcanic_bar', 'rough_obsidian', 'rough_ruby', 'ironwood', 'bamboo', 'torch', 'luma_food', 'chest', 'coral'] },
  market_tikora: { name: "Mango's Jungle Market", markup: 1.6, farm: true, sells: [...farmOf('jungle'), ...STAPLES, 'sunberry'] },
  explorer: { name: "Dr. Reyes' Field Camp", markup: 2, sells: ['glue', 'map_fragment', 'treasure_map', 'magnet', 'rope', 'torch', 'lost_spirit'] },
  inn_tikora: { name: 'The Stilt House', markup: 1.8, sells: ['chili_con_corn', 'tropical_salad', 'island_coffee', 'sunfruit_punch'], inn: 100 },

  morel: { name: "Morel's Mushroom Cart", token: true, sells: [
    { id: 'super_luma_food', token: 2 }, { id: 'luma_food', token: 1, qty: 3 }, { id: 'tool_token', token: 3 }, { id: 'map_fragment', token: 1 },
    { id: 'glowcap', token: 1 }, { id: 'ember_shroom', token: 1 }, { id: 'trippy_spores', token: 2 }, { id: 'heart_crystal', token: 12, once: true },
    { id: 'backpack_upgrade', token: 10, once: true }, { id: 'luma_statue', token: 6 }, { id: 'fountain', token: 8 },
  ] },
};

export function buyPrice(shop, id, cozy) {
  const it = ITEMS[id];
  const entry = (shop.sells || []).find((e) => (typeof e === 'string' ? e : e.id) === id);
  let p = typeof entry === 'object' && entry.price ? entry.price : Math.max(2, Math.round((it.price || 5) * (shop.markup || 2)));
  if (it.cat === 'placeable' && !it.price) p = 20;
  if (cozy) p = Math.max(1, Math.round(p * 0.8));
  return p;
}
