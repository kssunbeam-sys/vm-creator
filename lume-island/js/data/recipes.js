// Recipes. `st` = station ('build' = the Build menu, crafted instantly by hand).
// time = game minutes. Ingredients starting with '#' are tags (#berry, #flower, #mushroom).
// Unlock: 'start' | 'bp' (bought blueprint) | { prof, lvl } | 'book'
import { ITEMS } from './items.js';

export const RECIPES = [];
const r = (id, st, out, ins, time = 10, unlock = 'start', extra = {}) => RECIPES.push({ id, st, out: Array.isArray(out) ? out : [out, 1], ins, time, unlock, ...extra });

// ---------- Build menu (placeables, by hand) ----------
r('b_workbench', 'build', 'workbench', [['wood', 10], ['stone', 6]]);
r('b_chest', 'build', 'chest', [['wood', 15]]);
r('b_fence', 'build', ['fence', 2], [['wood', 2]]);
r('b_signpost', 'build', 'signpost', [['wood', 3]]);
r('b_campfire', 'build', 'campfire', [['wood', 5], ['stone', 5]]);
r('b_hay', 'build', 'hay_bale', [['fiber', 8]]);
r('b_kiln', 'build', 'kiln', [['stone', 15], ['sand', 4]], 0, 'bp', { bp: 200 });
r('b_smelter', 'build', 'smelter', [['stone', 20], ['wood', 10], ['copper_ore', 3]], 0, 'bp', { bp: 300 });
r('b_incubator', 'build', 'incubator', [['leather', 2], ['copper_bar', 2], ['fabric', 2], ['glass', 2]], 0, 'bp', { bp: 500 });
r('b_luma_nest', 'build', 'luma_nest', [['wood', 10], ['fiber', 6], ['fabric', 2]], 0, 'bp', { bp: 250 });
r('b_luma_altar', 'build', 'luma_altar', [['stone', 25], ['glass', 4], ['gold_nugget', 3]], 0, 'bp', { bp: 1500 });
r('b_lamp_post', 'build', 'lamp_post', [['copper_bar', 2], ['glass', 1], ['wood', 2]], 0, 'bp', { bp: 120 });
r('b_bench', 'build', 'bench', [['plank', 4], ['nails', 2]], 0, 'bp', { bp: 80 });
r('b_table', 'build', 'table', [['plank', 4], ['nails', 2]], 0, 'bp', { bp: 80 });
r('b_rug', 'build', 'rug', [['fabric', 3], ['red_dye', 1]], 0, 'bp', { bp: 60 });
r('b_flower_pot', 'build', 'flower_pot', [['stone', 3], ['#flower', 1]], 0, 'bp', { bp: 50 });
r('b_planter', 'build', 'planter', [['plank', 3], ['#flower', 3]], 0, 'bp', { bp: 120 });
r('b_banner', 'build', 'banner', [['fabric', 2], ['wood', 2], ['blue_dye', 1]], 0, 'bp', { bp: 100 });
r('b_scarecrow', 'build', 'scarecrow', [['wood', 4], ['fiber', 6], ['fabric', 1]], 0, 'bp', { bp: 40 });
r('b_luma_statue', 'build', 'luma_statue', [['stone', 20], ['cut_amethyst', 1]], 0, 'book');
r('b_fountain', 'build', 'fountain', [['stone', 30], ['glass', 2], ['water_spirit', 1]], 0, 'book');
// profession stations
r('b_stove', 'build', 'stove', [['stone', 10], ['copper_bar', 2], ['wood', 5]], 0, { prof: 'cook', lvl: 1 });
r('b_cask_meadow', 'build', 'cask_meadow', [['wood', 10], ['nails', 2]], 0, { prof: 'brewer', lvl: 1 });
r('b_cask_forest', 'build', 'cask_forest', [['hardwood', 10], ['nails', 4]], 0, { prof: 'brewer', lvl: 4 });
r('b_cask_mountain', 'build', 'cask_mountain', [['pinewood', 10], ['iron_bar', 3]], 0, { prof: 'brewer', lvl: 6 });
r('b_cask_jungle', 'build', 'cask_jungle', [['ironwood', 10], ['moonstone_bar', 2]], 0, { prof: 'brewer', lvl: 7 });
r('b_fish_table', 'build', 'fish_table', [['wood', 10], ['rope', 2], ['copper_bar', 1]], 0, { prof: 'fisher', lvl: 1 });
r('b_forge', 'build', 'forge', [['stone', 20], ['copper_bar', 4], ['charcoal', 5]], 0, { prof: 'smith', lvl: 1 });
r('b_gem_cutter', 'build', 'gem_cutter', [['stone', 10], ['copper_bar', 3], ['rough_quartz', 2]], 0, { prof: 'jewel', lvl: 1 });
r('b_jeweler_bench', 'build', 'jeweler_bench', [['wood', 10], ['copper_bar', 2], ['glass', 1]], 0, { prof: 'jewel', lvl: 1 });
r('b_treasure_sink', 'build', 'treasure_sink', [['stone', 10], ['copper_bar', 2], ['rope', 2]], 0, { prof: 'treasure', lvl: 1 });
r('b_treasure_bench', 'build', 'treasure_bench', [['wood', 12], ['rope', 3]], 0, { prof: 'treasure', lvl: 2 });
r('b_rubble_refiner', 'build', 'rubble_refiner', [['stone', 15], ['copper_bar', 3], ['rope', 2]], 0, { prof: 'arch', lvl: 1 });
r('b_restoration_table', 'build', 'restoration_table', [['wood', 12], ['glue', 2], ['glass', 1]], 0, { prof: 'arch', lvl: 1 });

// ---------- Workbench ----------
r('plank', 'workbench', ['plank', 2], [['wood', 3]], 10);
r('rope', 'workbench', 'rope', [['fiber', 3]], 10);
r('fabric', 'workbench', 'fabric', [['cotton', 2]], 15);
r('wool_fabric', 'workbench', ['fabric', 2], [['wool', 1]], 15);
r('leather', 'workbench', 'leather', [['#mushroom', 3]], 20);
r('fur_leather', 'workbench', ['leather', 2], [['bear_fur', 1]], 15);
r('silk_rope', 'workbench', ['rope', 2], [['spider_silk', 1]], 10);
r('bottle', 'workbench', 'bottle', [['charcoal', 1], ['sand', 1]], 15);
r('glue', 'workbench', 'glue', [['sap', 2], ['fiber', 1]], 15);
r('torch', 'workbench', ['torch', 2], [['wood', 1], ['charcoal', 1]], 5);
r('nails', 'workbench', ['nails', 5], [['copper_bar', 1]], 10);
r('red_dye', 'workbench', 'red_dye', [['red_berry', 3]], 15);
r('blue_dye', 'workbench', 'blue_dye', [['blueberry', 3]], 15);
r('white_dye', 'workbench', 'white_dye', [['frostberry', 3]], 15);
r('gold_dye', 'workbench', 'gold_dye', [['sunberry', 3]], 15);
r('luma_food', 'workbench', ['luma_food', 2], [['#berry', 2], ['#flower', 1], ['#mushroom', 1]], 15);
for (const s of ['water', 'rock', 'lost', 'nature', 'earth']) r('luma_life_' + s, 'workbench', 'luma_life_' + s, [[s + '_spirit', 1], ['fiber', 2], ['#flower', 1]], 30);

// ---------- Kiln ----------
r('glass', 'kiln', 'glass', [['sand', 2], ['charcoal', 1]], 20);
r('k_charcoal', 'kiln', ['charcoal', 2], [['wood', 3]], 30);
r('k_glass_bottles', 'kiln', ['bottle', 3], [['glass', 2]], 20);

// ---------- Ore Smelter ----------
r('copper_bar', 'smelter', 'copper_bar', [['copper_ore', 3], ['charcoal', 1]], 30);
r('iron_bar', 'smelter', 'iron_bar', [['iron_ore', 3], ['charcoal', 1]], 40);
r('moonstone_bar', 'smelter', 'moonstone_bar', [['moonstone_ore', 3], ['charcoal', 2]], 60);
r('volcanic_bar', 'smelter', 'volcanic_bar', [['volcanic_ore', 3], ['charcoal', 2]], 80);
r('gold_bar', 'smelter', 'gold_bar', [['gold_nugget', 3], ['charcoal', 1]], 60);
r('magnet', 'smelter', ['magnet', 2], [['copper_bar', 1]], 20);

// ---------- Luma Altar (costs Luma Energy) ----------
r('return_charm', 'luma_altar', 'return_charm', [['glass', 1]], 10, 'start', { energy: 3 });
r('luma_lantern', 'luma_altar', 'luma_lantern', [['glass', 1], ['glowcap', 1]], 10, 'start', { energy: 4 });
r('treasure_compass', 'luma_altar', 'treasure_compass', [['copper_bar', 1], ['glass', 1]], 10, 'start', { energy: 5 });
r('altar_super_food', 'luma_altar', 'super_luma_food', [['luma_food', 2], ['#flower', 2]], 10, 'start', { energy: 2 });
r('heart_crystal', 'luma_altar', 'heart_crystal', [['cut_amethyst', 1], ['gold_bar', 1]], 30, 'start', { energy: 15 });

// ---------- Cook (Stove) ----------
const P = (prof, lvl) => ({ prof, lvl });
r('baked_potato', 'stove', 'baked_potato', [['potato', 2]], 20, P('cook', 1));
r('tomato_soup', 'stove', 'tomato_soup', [['tomato', 2], ['milk', 1]], 30, P('cook', 1));
r('berry_tart', 'stove', 'berry_tart', [['red_berry', 3], ['flour', 1]], 30, P('cook', 2));
r('fresh_bread', 'stove', 'fresh_bread', [['flour', 2], ['egg', 1], ['milk', 1]], 40, P('cook', 2));
r('carrot_cake', 'stove', 'carrot_cake', [['carrot', 2], ['flour', 1], ['egg', 1], ['sugar', 1]], 45, P('cook', 3));
r('pumpkin_pie', 'stove', 'pumpkin_pie', [['pumpkin', 1], ['flour', 1], ['egg', 1], ['sugar', 1]], 45, P('cook', 4));
r('mushroom_stew', 'stove', 'mushroom_stew', [['porcini', 2], ['onion', 1], ['milk', 1]], 40, P('cook', 4));
r('onion_soup', 'stove', 'onion_soup', [['onion', 2], ['butter', 1], ['fresh_bread', 1]], 40, P('cook', 5));
r('honey_pancakes', 'stove', 'honey_pancakes', [['flour', 1], ['egg', 1], ['milk', 1], ['honey', 1]], 35, P('cook', 5));
r('cheese_fondue', 'stove', 'cheese_fondue', [['cheese', 2], ['fresh_bread', 1], ['grapes', 1]], 50, P('cook', 6));
r('apple_strudel', 'stove', 'apple_strudel', [['apple', 2], ['flour', 1], ['butter', 1], ['sugar', 1]], 50, P('cook', 6));
r('borscht', 'stove', 'borscht', [['beetroot', 2], ['cabbage', 1], ['onion', 1]], 45, P('cook', 6));
r('alpine_stew', 'stove', 'alpine_stew', [['snowcap', 1], ['barley', 1], ['potato', 1], ['carrot', 1]], 50, P('cook', 6));
r('chili_con_corn', 'stove', 'chili_con_corn', [['chili', 2], ['corn', 1], ['tomato', 1], ['onion', 1]], 55, P('cook', 7));
r('jungle_curry', 'stove', 'jungle_curry', [['rice', 1], ['chili', 1], ['ember_shroom', 1], ['milk', 1]], 55, P('cook', 7));
r('chocolate_cake', 'stove', 'chocolate_cake', [['cocoa_beans', 2], ['flour', 1], ['egg', 1], ['sugar', 1], ['butter', 1]], 60, P('cook', 8));
r('tropical_salad', 'stove', 'tropical_salad', [['pineapple', 1], ['banana', 1], ['orchid', 1]], 40, P('cook', 8));

// ---------- Brewer (Casks) ----------
r('berry_juice', 'cask_meadow', 'berry_juice', [['red_berry', 3], ['bottle', 1], ['red_dye', 1]], 300, P('brewer', 1));
r('wheat_ale', 'cask_meadow', 'wheat_ale', [['wheat', 3], ['bottle', 1], ['red_dye', 1]], 360, P('brewer', 1));
r('carrot_tonic', 'cask_meadow', 'carrot_tonic', [['carrot', 3], ['bottle', 1], ['red_dye', 1]], 360, P('brewer', 2));
r('honey_mead', 'cask_forest', 'honey_mead', [['honey', 2], ['bottle', 1], ['blue_dye', 1]], 420, P('brewer', 4));
r('hop_ale', 'cask_forest', 'hop_ale', [['hops', 3], ['wheat', 1], ['bottle', 1], ['blue_dye', 1]], 420, P('brewer', 4));
r('strawberry_wine', 'cask_forest', 'strawberry_wine', [['strawberry', 3], ['bottle', 1], ['blue_dye', 1]], 480, P('brewer', 5));
r('grape_wine', 'cask_mountain', 'grape_wine', [['grapes', 4], ['bottle', 1], ['white_dye', 1]], 540, P('brewer', 6));
r('apple_cider', 'cask_mountain', 'apple_cider', [['apple', 3], ['bottle', 1], ['white_dye', 1]], 480, P('brewer', 6));
r('frost_liqueur', 'cask_mountain', 'frost_liqueur', [['frostberry', 4], ['sugar', 1], ['bottle', 1], ['white_dye', 1]], 540, P('brewer', 6));
r('island_coffee', 'cask_jungle', 'island_coffee', [['coffee_beans', 3], ['milk', 1], ['bottle', 1], ['gold_dye', 1]], 540, P('brewer', 7));
r('sunfruit_punch', 'cask_jungle', 'sunfruit_punch', [['pineapple', 1], ['banana', 1], ['sunberry', 2], ['bottle', 1], ['gold_dye', 1]], 540, P('brewer', 7));
r('cocoa_cream', 'cask_jungle', 'cocoa_cream', [['cocoa_beans', 3], ['milk', 1], ['sugar', 1], ['bottle', 1], ['gold_dye', 1]], 600, P('brewer', 8));
r('cane_spirit', 'cask_jungle', 'cane_spirit', [['sugarcane', 4], ['bottle', 1], ['gold_dye', 1]], 600, P('brewer', 8));

// ---------- Fisherman (Fish Prep Table) ----------
r('open_oyster', 'fish_table', 'pearl', [['oyster', 1]], 10, P('fisher', 1), { chance: 0.35, fail: ['seashell', 1] });
r('grilled_sardine', 'fish_table', 'grilled_sardine', [['sunny_sardine', 2]], 20, P('fisher', 1));
r('fish_and_chips', 'fish_table', 'fish_and_chips', [['brook_perch', 1], ['potato', 2]], 30, P('fisher', 1));
r('carp_skewer', 'fish_table', 'carp_skewer', [['gilded_carp', 1], ['tomato', 1]], 30, P('fisher', 2));
r('smoked_trout', 'fish_table', 'smoked_trout', [['fern_trout', 2], ['hardwood', 1]], 60, P('fisher', 4));
r('pike_pie', 'fish_table', 'pike_pie', [['barkskin_pike', 1], ['flour', 1], ['butter', 1]], 45, P('fisher', 4));
r('ray_stew', 'fish_table', 'ray_stew', [['shade_ray', 1], ['onion', 1], ['cabbage', 1]], 45, P('fisher', 5));
r('salmon_gravlax', 'fish_table', 'salmon_gravlax', [['glacier_salmon', 1], ['salt', 1], ['barley', 1]], 50, P('fisher', 6));
r('char_chowder', 'fish_table', 'char_chowder', [['frost_char', 2], ['milk', 1], ['potato', 1]], 50, P('fisher', 6));
r('eel_rolls', 'fish_table', 'eel_rolls', [['crystal_eel', 1], ['cabbage', 1], ['beetroot', 1]], 50, P('fisher', 6));
r('spicy_piranha', 'fish_table', 'spicy_piranha', [['piranha', 2], ['chili', 1]], 50, P('fisher', 7));
r('snapper_platter', 'fish_table', 'snapper_platter', [['lava_snapper', 1], ['corn', 1], ['banana', 1]], 55, P('fisher', 7));
r('koi_sashimi', 'fish_table', 'koi_sashimi', [['rainbow_koi', 1], ['rice', 1]], 60, P('fisher', 8));

// ---------- Blacksmith (Forge) ----------
r('horseshoe', 'forge', 'horseshoe', [['copper_bar', 1]], 30, P('smith', 1));
r('copper_kettle', 'forge', 'copper_kettle', [['copper_bar', 2]], 40, P('smith', 1));
r('copper_lantern', 'forge', 'copper_lantern', [['copper_bar', 2], ['glass', 1]], 45, P('smith', 2));
r('iron_pot', 'forge', 'iron_pot', [['iron_bar', 3]], 50, P('smith', 4));
r('iron_lantern', 'forge', 'iron_lantern', [['iron_bar', 2], ['glass', 1], ['charcoal', 1]], 50, P('smith', 4));
r('iron_shield', 'forge', 'iron_shield', [['iron_bar', 4], ['leather', 1]], 60, P('smith', 5));
r('moonstone_blade', 'forge', 'moonstone_blade', [['moonstone_bar', 3], ['leather', 1]], 70, P('smith', 6));
r('moonstone_helm', 'forge', 'moonstone_helm', [['moonstone_bar', 4]], 70, P('smith', 6));
r('volcanic_hammer', 'forge', 'volcanic_hammer', [['volcanic_bar', 3], ['ironwood', 1]], 80, P('smith', 7));
r('volcanic_armor', 'forge', 'volcanic_armor', [['volcanic_bar', 5], ['leather', 2]], 90, P('smith', 8));

// ---------- Jewelrycrafter ----------
const cut = (g, lvl, t) => r('cut_' + g, 'gem_cutter', 'cut_' + g, [['rough_' + g, 1]], t, P('jewel', lvl));
cut('quartz', 1, 20); cut('amethyst', 1, 25); cut('topaz', 4, 30); cut('emerald', 4, 35); cut('sapphire', 6, 40); cut('diamond', 6, 50); cut('obsidian', 7, 45); cut('ruby', 7, 50);
r('quartz_pendant', 'jeweler_bench', 'quartz_pendant', [['cut_quartz', 1], ['copper_bar', 1]], 40, P('jewel', 1));
r('amethyst_ring', 'jeweler_bench', 'amethyst_ring', [['cut_amethyst', 1], ['copper_bar', 1]], 45, P('jewel', 2));
r('topaz_earrings', 'jeweler_bench', 'topaz_earrings', [['cut_topaz', 2], ['iron_bar', 1]], 50, P('jewel', 4));
r('emerald_brooch', 'jeweler_bench', 'emerald_brooch', [['cut_emerald', 1], ['iron_bar', 1], ['gold_nugget', 1]], 55, P('jewel', 5));
r('sapphire_necklace', 'jeweler_bench', 'sapphire_necklace', [['cut_sapphire', 2], ['moonstone_bar', 1]], 60, P('jewel', 6));
r('pearl_tiara', 'jeweler_bench', 'pearl_tiara', [['pearl', 2], ['cut_diamond', 1], ['moonstone_bar', 1]], 70, P('jewel', 7));
r('obsidian_amulet', 'jeweler_bench', 'obsidian_amulet', [['cut_obsidian', 1], ['volcanic_bar', 1]], 60, P('jewel', 7));
r('ruby_crown', 'jeweler_bench', 'ruby_crown', [['cut_ruby', 2], ['volcanic_bar', 2], ['gold_bar', 1]], 90, P('jewel', 8));

// ---------- Treasure Hunter ----------
r('clean_meadow', 'treasure_sink', 'old_coin', [['coffer_meadow', 1]], 20, P('treasure', 1), { loot: 'meadow' });
r('clean_sunken', 'treasure_sink', 'silver_goblet', [['sunken_chest', 1]], 30, P('treasure', 2), { loot: 'sea' });
r('clean_forest', 'treasure_sink', 'silver_goblet', [['coffer_forest', 1]], 30, P('treasure', 3), { loot: 'forest' });
r('clean_mountain', 'treasure_sink', 'golden_idol', [['coffer_mountain', 1]], 40, P('treasure', 5), { loot: 'mountain' });
r('clean_jungle', 'treasure_sink', 'jeweled_chalice', [['coffer_jungle', 1]], 50, P('treasure', 7), { loot: 'jungle' });
r('treasure_map', 'treasure_bench', 'treasure_map', [['map_fragment', 3]], 20, P('treasure', 1));
r('tb_magnet', 'treasure_bench', ['magnet', 3], [['copper_bar', 1], ['rope', 1]], 20, P('treasure', 2));

// ---------- Archaeologist ----------
for (const [b, lvl] of [['meadow', 1], ['forest', 3], ['mountain', 5], ['jungle', 7]]) {
  r('refine_' + b, 'rubble_refiner', ['fragment_' + b, 2], [['rubble_' + b, 1]], 30, P('arch', lvl), { bonus: [['stone', 1, 0.6], ['old_coin', 1, 0.15], ['map_fragment', 1, 0.08]] });
}
r('clay_figurine', 'restoration_table', 'clay_figurine', [['fragment_meadow', 3], ['glue', 1]], 40, P('arch', 1));
r('sun_tablet', 'restoration_table', 'sun_tablet', [['fragment_meadow', 4], ['glue', 1]], 45, P('arch', 2));
r('wooden_mask', 'restoration_table', 'wooden_mask', [['fragment_forest', 3], ['glue', 1], ['hardwood', 1]], 50, P('arch', 3));
r('moss_idol', 'restoration_table', 'moss_idol', [['fragment_forest', 4], ['glue', 1], ['porcini', 1]], 55, P('arch', 4));
r('frost_totem', 'restoration_table', 'frost_totem', [['fragment_mountain', 3], ['glue', 2]], 60, P('arch', 5));
r('crystal_skull', 'restoration_table', 'crystal_skull', [['fragment_mountain', 4], ['cut_quartz', 1], ['glue', 1]], 70, P('arch', 6));
r('sun_disk', 'restoration_table', 'sun_disk', [['fragment_jungle', 3], ['gold_bar', 1], ['glue', 1]], 80, P('arch', 7));
r('obsidian_mask', 'restoration_table', 'obsidian_mask', [['fragment_jungle', 4], ['cut_obsidian', 1], ['glue', 1]], 90, P('arch', 8));

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((x) => [x.id, x]));
export const TAGS = {
  berry: (it) => ['red_berry', 'blueberry', 'frostberry', 'sunberry'].includes(it.id),
  flower: (it) => !!it.flower,
  mushroom: (it) => !!it.mushroom,
};
export const TAG_NAMES = { berry: 'Any berries', flower: 'Any flower', mushroom: 'Any mushroom' };

// sanity check for typos in development
for (const rc of RECIPES) {
  if (!ITEMS[rc.out[0]]) console.warn('recipe output missing', rc.id, rc.out[0]);
  for (const [id] of rc.ins) if (!id.startsWith('#') && !ITEMS[id]) console.warn('recipe input missing', rc.id, id);
}

// Loot when cleaning coffers at the Treasure Sink
export const COFFER_LOOT = {
  meadow: [['old_coin', 50], ['silver_goblet', 18], ['ancient_doubloon', 8], ['map_fragment', 14], ['tool_token', 10]],
  sea: [['silver_goblet', 30], ['old_coin', 25], ['pearl', 15], ['pirate_compass', 12], ['ancient_doubloon', 12], ['tool_token', 6]],
  forest: [['silver_goblet', 35], ['ancient_doubloon', 25], ['pirate_compass', 15], ['golden_idol', 10], ['tool_token', 15]],
  mountain: [['golden_idol', 30], ['ancient_doubloon', 25], ['pirate_compass', 20], ['jeweled_chalice', 8], ['tool_token', 17]],
  jungle: [['jeweled_chalice', 30], ['golden_idol', 30], ['ancient_doubloon', 20], ['pirate_compass', 10], ['tool_token', 10]],
};
