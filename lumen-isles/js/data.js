'use strict';
// All game content: items, creatures, biomes, towns, NPCs, quests, recipes, shops.
(() => {
const D = G.D = {};
const ITEMS = D.ITEMS = {};
function it(id, name, icon, cat, price, o) { ITEMS[id] = Object.assign({ id, name, icon, cat, price }, o || {}); }

// ---------- materials ----------
it('log', 'Log', '🪵', 'material', 4);
it('stone', 'Stone', '🪨', 'material', 3);
it('coal', 'Coal', '⚫', 'material', 8);
it('fiber', 'Plant Fiber', '🧵', 'material', 3);
it('resin', 'Amber Resin', '🍯', 'material', 12, { f: 'hue-rotate(-20deg) saturate(1.6)' });
it('gel', 'Slime Gel', '🟢', 'material', 10);
it('silk', 'Spider Silk', '🕸️', 'material', 14);
it('feather', 'Feather', '🪶', 'material', 8);
it('mush_cap', 'Mushwood', '🍄', 'material', 6, { f: 'hue-rotate(250deg)' });
it('ember_shard', 'Ember Shard', '☄️', 'material', 20);
it('frost_shard', 'Frost Shard', '❄️', 'material', 20);
it('spore_dust', 'Spore Dust', '✨', 'material', 15, { f: 'hue-rotate(220deg)' });
// ores, bars, gems
it('copper_ore', 'Copper Ore', '🪨', 'ore', 10, { f: 'sepia(1) saturate(3) hue-rotate(-15deg)' });
it('iron_ore', 'Iron Ore', '🪨', 'ore', 18, { f: 'sepia(.3) brightness(1.35)' });
it('gold_ore', 'Gold Ore', '🪨', 'ore', 30, { f: 'sepia(1) saturate(6) brightness(1.15)' });
it('crystal', 'Crystal', '🔮', 'ore', 35);
it('lumen_ore', 'Lumenite Ore', '💠', 'ore', 60);
it('copper_bar', 'Copper Bar', '🧱', 'bar', 45);
it('iron_bar', 'Iron Bar', '🧱', 'bar', 75, { f: 'grayscale(1) brightness(1.3)' });
it('gold_bar', 'Gold Bar', '🧱', 'bar', 120, { f: 'sepia(1) saturate(5) brightness(1.3) hue-rotate(10deg)' });
it('lumen_bar', 'Lumenite Bar', '🧱', 'bar', 220, { f: 'hue-rotate(170deg) saturate(2) brightness(1.2)' });
it('amethyst', 'Amethyst', '💎', 'gem', 70, { f: 'hue-rotate(60deg)' });
it('topaz', 'Topaz', '💎', 'gem', 80, { f: 'hue-rotate(-170deg) saturate(2)' });
it('aquamarine', 'Aquamarine', '💎', 'gem', 90, { f: 'hue-rotate(-30deg) brightness(1.3)' });
it('emerald', 'Emerald', '💎', 'gem', 120, { f: 'hue-rotate(-90deg)' });
it('ruby', 'Ruby', '💎', 'gem', 140, { f: 'hue-rotate(150deg) saturate(2)' });
it('diamond', 'Diamond', '💎', 'gem', 250, { f: 'grayscale(1) brightness(1.6)' });
// forage
it('berries', 'Wild Berries', '🫐', 'forage', 6, { food: 1 });
it('apple', 'Apple', '🍎', 'forage', 8, { food: 1 });
it('daisy', 'Daisy', '🌼', 'forage', 6);
it('tulip', 'Tulip', '🌷', 'forage', 8);
it('sunflower', 'Sunflower', '🌻', 'forage', 10);
it('shell', 'Seashell', '🐚', 'forage', 8);
it('seaweed', 'Seaweed', '🌿', 'forage', 6, { f: 'hue-rotate(40deg) brightness(.8)' });
it('coconut', 'Coconut', '🥥', 'forage', 12);
it('snowberry', 'Snowberry', '🫐', 'forage', 10, { f: 'grayscale(.8) brightness(1.6)', food: 1 });
it('frost_lily', 'Frost Lily', '🪷', 'forage', 18, { f: 'hue-rotate(180deg) brightness(1.2)' });
it('mushroom', 'Mushroom', '🍄', 'forage', 8);
it('glowcap', 'Glowcap', '🍄', 'forage', 16, { f: 'hue-rotate(170deg) saturate(2) brightness(1.2)' });
it('orchid', 'Jungle Orchid', '🌸', 'forage', 16);
it('banana', 'Banana', '🍌', 'forage', 10, { food: 1 });
it('desert_rose', 'Desert Rose', '🌹', 'forage', 20, { f: 'hue-rotate(-30deg) saturate(.7)' });
it('cactus_fruit', 'Cactus Fruit', '🍐', 'forage', 12, { f: 'hue-rotate(250deg) saturate(2)', food: 1 });
it('ember_flower', 'Ember Bloom', '🌺', 'forage', 22, { f: 'hue-rotate(20deg) saturate(2)' });
it('pinecone', 'Pinecone', '🌰', 'forage', 5);
// ingredients (bought, since there is no farming)
const ING = [
  ['flour', 'Flour', '🌾', 4], ['egg', 'Egg', '🥚', 4], ['milk', 'Milk', '🥛', 5], ['butter', 'Butter', '🧈', 6],
  ['sugar', 'Sugar', '🍬', 3], ['salt', 'Sea Salt', '🧂', 3], ['cheese', 'Cheese', '🧀', 8], ['carrot', 'Carrot', '🥕', 4],
  ['potato', 'Potato', '🥔', 4], ['tomato', 'Tomato', '🍅', 5], ['lettuce', 'Lettuce', '🥬', 4], ['onion', 'Onion', '🧅', 4],
  ['rice', 'Rice', '🍚', 5], ['corn', 'Corn', '🌽', 5], ['pumpkin', 'Pumpkin', '🎃', 9], ['strawberry', 'Strawberry', '🍓', 6],
  ['lemon', 'Lemon', '🍋', 5], ['cocoa', 'Cocoa Beans', '🫘', 7], ['cream', 'Cream', '🍦', 7], ['honey', 'Honey', '🍯', 9],
  ['mango', 'Mango', '🥭', 8], ['pineapple', 'Pineapple', '🍍', 9], ['chili', 'Chili', '🌶️', 6], ['spice', 'Spice Mix', '🫚', 8],
  ['dates', 'Dates', '🫒', 8, 'sepia(1) saturate(2) hue-rotate(-20deg)'],
];
for (const [id, n, ic, p, f] of ING) it(id, n, ic, 'ingredient', p, f ? { f } : null);
// food (heal = HP restored)
const FOOD = [
  ['fried_egg', 'Fried Egg', '🍳', 18, 2], ['pancakes', 'Fluffy Pancakes', '🥞', 35, 3], ['salad', 'Garden Salad', '🥗', 25, 2],
  ['honey_toast', 'Honey Toast', '🍞', 40, 3], ['veggie_soup', 'Veggie Soup', '🍲', 40, 4], ['grilled_fish', 'Grilled Fish', '🍢', 45, 4],
  ['berry_pie', 'Berry Pie', '🥧', 70, 5], ['hot_cocoa', 'Hot Cocoa', '☕', 40, 3], ['popcorn', 'Buttery Popcorn', '🍿', 35, 2],
  ['pumpkin_soup', 'Pumpkin Soup', '🥣', 60, 5], ['fish_tacos', 'Fish Tacos', '🌮', 80, 5], ['apple_crumble', 'Apple Crumble', '🧁', 75, 5],
  ['smoothie', 'Tropical Smoothie', '🥤', 60, 4], ['risotto', 'Mushroom Risotto', '🥘', 90, 6], ['sushi', 'Seaweed Sushi', '🍣', 100, 6],
  ['curry', 'Spicy Curry', '🍛', 110, 7], ['coconut_pudding', 'Coconut Pudding', '🍮', 95, 5], ['date_cake', 'Date Cake', '🍰', 120, 6],
  ['chili_stew', 'Volcano Chili Stew', '🫕', 130, 8], ['fruit_salad', 'Fruit Salad', '🍧', 110, 6], ['glimmer_tart', 'Glimmer Tart', '🥮', 160, 8],
  ['feast', 'Island Feast', '🍱', 400, 10], ['cookie', 'Cozy Cookie', '🍪', 8, 1],
];
for (const [id, n, ic, p, h] of FOOD) it(id, n, ic, 'food', p, { heal: h });
// misc
it('treat', 'Pet Treat', '🦴', 'pet', 8, { buy: 25, desc: 'Pets love these. Also used to befriend strays.' });
it('toy_ball', 'Bouncy Ball', '🎾', 'pet', 15, { buy: 40, desc: 'Play fetch with a pet for lots of happiness.' });
it('toy_yarn', 'Yarn Ball', '🧶', 'pet', 15, { buy: 40, desc: 'A pet favourite. Play to boost happiness.' });
it('glim_snack', 'Starlight Snack', '🍬', 'pet', 15, { buy: 40, f: 'hue-rotate(180deg)', desc: 'Glimmers glow brighter after a snack.' });
it('bait', 'Bait', '🪱', 'misc', 2, { buy: 6, desc: 'Makes fish easier to catch (used automatically).' });
it('bandage', 'Bandage', '🩹', 'food', 6, { buy: 20, heal: 4 });
it('tmap', 'Treasure Map', '🗺️', 'misc', 30, { buy: 120, desc: 'Use to mark a hidden treasure chest on your map.' });
it('speed_tonic', 'Breeze Tonic', '🧪', 'misc', 20, { buy: 60, desc: 'Walk faster for the rest of the day.' });
it('glow_tonic', 'Glow Tonic', '🧪', 'misc', 20, { buy: 60, f: 'hue-rotate(120deg)', desc: 'Your lantern shines much brighter for the day.' });
it('temple_key', 'Temple Key', '🗝️', 'quest', 0);
it('pot_shard', 'Pottery Shard', '🧩', 'misc', 12);
it('boots', 'Explorer Boots', '🥾', 'gear', 0, { buy: 600, desc: 'Permanently walk 15% faster.' });
it('bright_lantern', 'Bright Lantern', '🔦', 'gear', 0, { buy: 450, desc: 'Permanently larger light radius in the dark.' });
// relics (dug up, cleaned at a relic table)
const BIOME_KEYS = D.BIOME_KEYS = ['meadow', 'coast', 'snow', 'mushroom', 'jungle', 'desert', 'volcano'];
for (const b of BIOME_KEYS) it('relic_' + b, 'Dusty Relic', '🏺', 'relic', 15, { f: 'grayscale(1) brightness(.85)', relic: b, desc: 'Clean it at a Relic Table to reveal what it is.' });
D.ARTIFACTS = [
  ['old_coin', 'Old Coin', '🪙', '', 'meadow', 1], ['clay_pot', 'Clay Pot', '🏺', '', 'meadow', 1], ['brooch', 'Bronze Brooch', '📿', '', 'meadow', 2],
  ['ship_bell', "Ship's Bell", '🔔', '', 'coast', 1], ['mermaid_comb', 'Mermaid Comb', '🪮', '', 'coast', 2], ['compass', "Captain's Compass", '🧭', '', 'coast', 2],
  ['frozen_horn', 'Frozen Horn', '📯', 'hue-rotate(160deg)', 'snow', 1], ['rune_stone', 'Rune Stone', '🪨', 'hue-rotate(180deg) saturate(3)', 'snow', 1], ['ice_crown', 'Ice Crown', '👑', 'hue-rotate(170deg) brightness(1.3)', 'snow', 2],
  ['spore_lantern', 'Spore Lantern', '🏮', 'hue-rotate(240deg)', 'mushroom', 1], ['moon_tablet', 'Moon Tablet', '🌙', '', 'mushroom', 1], ['fae_flute', 'Fae Flute', '🪈', '', 'mushroom', 2],
  ['jade_mask', 'Jade Mask', '🎭', 'hue-rotate(90deg)', 'jungle', 1], ['idol', 'Stone Idol', '🗿', '', 'jungle', 1], ['headdress', 'Feather Headdress', '🪶', 'hue-rotate(90deg) saturate(2)', 'jungle', 2],
  ['sun_disk', 'Sun Disk', '☀️', '', 'desert', 1], ['scarab_amulet', 'Scarab Amulet', '🪲', 'sepia(1) saturate(4)', 'desert', 1], ['golden_mask', 'Golden Mask', '🎭', 'sepia(1) saturate(5) brightness(1.2)', 'desert', 2],
  ['obsidian_blade', 'Obsidian Blade', '🗡️', 'brightness(.5)', 'volcano', 1], ['forge_hammer', 'Ancient Hammer', '🔨', '', 'volcano', 1], ['dragon_scale', 'Dragon Scale', '🐉', '', 'volcano', 2],
];
for (const [id, n, ic, f, b, r] of D.ARTIFACTS) it(id, n, ic, 'artifact', r === 2 ? 160 : 70, { f, biome: b, rarity: r });

// ---------- fish & critters ----------
D.FISH = [
  // id, name, icon, filter, price, biomes, rarity 1-3, time
  ['minnow', 'Minnow', '🐟', 'hue-rotate(60deg) saturate(.6)', 12, ['meadow'], 1, 'any'],
  ['sunfish', 'Sunfish', '🐠', 'hue-rotate(20deg)', 20, ['meadow'], 1, 'day'],
  ['bass', 'Pond Bass', '🐟', 'hue-rotate(90deg) brightness(.8)', 30, ['meadow', 'jungle'], 2, 'any'],
  ['koi', 'Koi', '🐠', 'saturate(1.8)', 90, ['meadow'], 3, 'any'],
  ['sardine', 'Sardine', '🐟', 'grayscale(.5) brightness(1.2)', 14, ['coast'], 1, 'any'],
  ['shrimp', 'Shrimp', '🦐', '', 18, ['coast'], 1, 'any'],
  ['clownfish', 'Clownfish', '🐠', '', 25, ['coast'], 1, 'day'],
  ['pufferfish', 'Pufferfish', '🐡', '', 40, ['coast'], 2, 'day'],
  ['tuna', 'Bluefin Tuna', '🐟', 'hue-rotate(200deg)', 55, ['coast'], 2, 'any'],
  ['octopus', 'Octopus', '🐙', '', 120, ['coast'], 3, 'night'],
  ['icefish', 'Icefish', '🐟', 'hue-rotate(160deg) brightness(1.3)', 25, ['snow'], 1, 'any'],
  ['char', 'Arctic Char', '🐟', 'hue-rotate(-30deg)', 35, ['snow'], 2, 'any'],
  ['glacier_trout', 'Glacier Trout', '🐟', 'hue-rotate(180deg) saturate(2)', 110, ['snow'], 3, 'day'],
  ['glowfin', 'Glowfin', '🐠', 'hue-rotate(250deg) saturate(2)', 50, ['mushroom'], 1, 'any'],
  ['spore_eel', 'Spore Eel', '🐍', 'hue-rotate(200deg)', 60, ['mushroom'], 2, 'night'],
  ['moon_squid', 'Moon Squid', '🦑', 'hue-rotate(180deg)', 140, ['mushroom'], 3, 'night'],
  ['piranha', 'Piranha', '🐟', 'hue-rotate(-40deg) saturate(2)', 35, ['jungle'], 1, 'any'],
  ['arowana', 'Arowana', '🐟', 'sepia(1) saturate(3)', 70, ['jungle'], 2, 'day'],
  ['rainbowfish', 'Rainbowfish', '🐠', 'hue-rotate(90deg) saturate(2)', 130, ['jungle'], 3, 'any'],
  ['sand_carp', 'Sand Carp', '🐟', 'sepia(.8)', 30, ['desert'], 1, 'any'],
  ['pupfish', 'Oasis Pupfish', '🐟', 'hue-rotate(170deg)', 40, ['desert'], 2, 'day'],
  ['golden_koi', 'Golden Koi', '🐠', 'sepia(1) saturate(4) brightness(1.1)', 200, ['desert'], 3, 'any'],
  ['magma_snapper', 'Magma Snapper', '🐟', 'hue-rotate(-60deg) saturate(3)', 60, ['volcano'], 1, 'any'],
  ['ember_eel', 'Ember Eel', '🐍', 'hue-rotate(-90deg) saturate(2)', 75, ['volcano'], 2, 'any'],
  ['phoenix_fish', 'Phoenixfish', '🐠', 'hue-rotate(-30deg) saturate(3) brightness(1.2)', 220, ['volcano'], 3, 'night'],
  ['moonfish', 'Moonfish', '🐟', 'grayscale(1) brightness(1.6)', 80, BIOME_KEYS, 2, 'night'],
];
for (const [id, n, ic, f, p, b, r, t] of D.FISH) it(id, n, ic, 'fish', p, { f, biomes: b, rarity: r, time: t });
D.CRITTERS = [
  // id, name, icon, filter, price, biomes, time, motion
  ['monarch', 'Monarch Butterfly', '🦋', 'hue-rotate(-170deg) saturate(2)', 20, ['meadow'], 'day', 'fly'],
  ['ladybug', 'Ladybug', '🐞', '', 15, ['meadow'], 'day', 'ground'],
  ['bumblebee', 'Bumblebee', '🐝', '', 18, ['meadow', 'jungle'], 'day', 'fly'],
  ['firefly', 'Firefly', '✨', '', 30, ['meadow', 'jungle', 'mushroom'], 'night', 'fly'],
  ['hermit_crab', 'Hermit Crab', '🦀', '', 20, ['coast'], 'any', 'ground'],
  ['sea_snail', 'Sea Snail', '🐌', 'hue-rotate(160deg)', 18, ['coast'], 'any', 'ground'],
  ['snow_moth', 'Snow Moth', '🦋', 'grayscale(1) brightness(1.6)', 30, ['snow'], 'any', 'fly'],
  ['ice_beetle', 'Ice Beetle', '🪲', 'hue-rotate(180deg) brightness(1.4)', 35, ['snow'], 'any', 'ground'],
  ['glow_snail', 'Glow Snail', '🐌', 'hue-rotate(220deg) saturate(2)', 35, ['mushroom'], 'any', 'ground'],
  ['moon_moth', 'Moon Moth', '🦋', 'hue-rotate(60deg) brightness(1.4)', 60, ['mushroom'], 'night', 'fly'],
  ['spore_beetle', 'Spore Beetle', '🪲', 'hue-rotate(260deg)', 30, ['mushroom'], 'any', 'ground'],
  ['blue_morpho', 'Blue Morpho', '🦋', '', 45, ['jungle'], 'day', 'fly'],
  ['rhino_beetle', 'Rhino Beetle', '🪲', '', 40, ['jungle'], 'any', 'ground'],
  ['tree_frog', 'Tree Frog', '🐸', '', 30, ['jungle'], 'any', 'ground'],
  ['stick_bug', 'Stick Bug', '🦗', 'sepia(1)', 35, ['jungle'], 'any', 'ground'],
  ['scarab', 'Golden Scarab', '🪲', 'sepia(1) saturate(4)', 45, ['desert'], 'day', 'ground'],
  ['locust', 'Desert Locust', '🦗', 'sepia(.6)', 25, ['desert'], 'any', 'ground'],
  ['ember_beetle', 'Ember Beetle', '🪲', 'hue-rotate(-60deg) saturate(3)', 50, ['volcano'], 'any', 'ground'],
  ['ash_moth', 'Ash Moth', '🦋', 'grayscale(1) brightness(.7)', 40, ['volcano'], 'any', 'fly'],
  ['dragonfly', 'Dragonfly', '🪰', 'hue-rotate(150deg)', 28, ['meadow', 'coast', 'jungle'], 'day', 'fly'],
];
for (const [id, n, ic, f, p, b, t, m] of D.CRITTERS) it(id, n, ic, 'critter', p, { f, biomes: b, time: t, motion: m });

// ---------- furniture, hats, pet accessories ----------
D.FURNITURE = [
  // id, name, icon, sell, extra
  ['bed', 'Cozy Bed', '🛏️', 60, { bed: 1 }], ['workbench', 'Workbench', '🛠️', 40, { station: 'workbench' }],
  ['stove', 'Stove', '♨️', 80, { station: 'stove' }], ['furnace', 'Furnace', '🔥', 80, { station: 'furnace', light: 50 }],
  ['relic_table', 'Relic Table', '🔍', 60, { station: 'relic' }], ['chair', 'Wooden Chair', '🪑', 15, {}],
  ['table', 'Dining Table', '🍽️', 25, {}], ['sofa', 'Comfy Sofa', '🛋️', 60, {}], ['bookshelf', 'Bookshelf', '📚', 40, {}],
  ['lamp', 'Oil Lamp', '🪔', 30, { light: 60 }], ['lantern', 'Paper Lantern', '🏮', 30, { light: 60 }],
  ['plant', 'Potted Plant', '🪴', 15, {}], ['cactus_pot', 'Cactus Pot', '🌵', 15, {}], ['clock', 'Grandfather Clock', '🕰️', 60, {}],
  ['painting', 'Landscape Painting', '🖼️', 50, {}], ['mirror', 'Mirror', '🪞', 50, {}], ['aquarium', 'Fish Tank', '🐠', 90, {}],
  ['teddy', 'Teddy Bear', '🧸', 25, {}], ['candle', 'Candle', '🕯️', 10, { light: 45 }], ['vase', 'Flower Vase', '💐', 20, {}],
  ['trophy', 'Golden Trophy', '🏆', 150, {}], ['globe', 'Globe', '🌍', 60, {}], ['telescope', 'Telescope', '🔭', 150, {}],
  ['guitar', 'Guitar', '🎸', 70, {}], ['crate', 'Crate', '📦', 10, {}], ['pet_bed', 'Pet Bed', '🧺', 30, { petbed: 1 }],
  ['snowman', 'Little Snowman', '☃️', 40, {}], ['fountain_small', 'Garden Fountain', '⛲', 120, {}],
  ['radio', 'Radio', '📻', 50, {}], ['mush_lamp', 'Mushroom Lamp', '🍄', 45, { light: 70, f: 'hue-rotate(200deg)' }],
  ['crystal_lamp', 'Crystal Lamp', '💡', 100, { light: 90 }], ['piano', 'Piano', '🎹', 200, {}], ['tent', 'Play Tent', '⛺', 40, {}],
  ['arcade', 'Arcade Cabinet', '🕹️', 150, {}], ['bonsai', 'Bonsai', '🌳', 60, {}], ['shell_chime', 'Shell Chime', '🐚', 35, {}],
];
for (const [id, n, ic, p, x] of D.FURNITURE) it(id, n, ic, 'furniture', p, x);
D.HATS = [
  ['straw_hat', 'Straw Hat', '👒', 120], ['cap', 'Cozy Cap', '🧢', 80], ['top_hat', 'Top Hat', '🎩', 250], ['grad_cap', 'Scholar Cap', '🎓', 200],
  ['crown', 'Crown', '👑', 900], ['helmet', 'Explorer Helmet', '⛑️', 220], ['bow_hat', 'Big Bow', '🎀', 90], ['blossom', 'Blossom Crown', '🌸', 110],
  ['pumpkin_head', 'Pumpkin Head', '🎃', 160], ['mush_hat', 'Mushroom Cap', '🍄', 140], ['earmuffs', 'Earmuffs', '🎧', 130], ['leaf_hat', 'Leaf Sprout', '🌱', 70],
  ['snow_crown', 'Snowflake Tiara', '❄️', 180], ['flame_hat', 'Ember Crest', '🔥', 260], ['star_hat', 'Star Clip', '⭐', 150],
];
for (const [id, n, ic, p] of D.HATS) it(id, n, ic, 'hat', Math.floor(p / 3), { buy: p });
D.PETACC = [
  ['acc_bow', 'Pet Bow', '🎀', 60], ['acc_flower', 'Pet Flower', '🌼', 50], ['acc_crown', 'Tiny Crown', '👑', 300], ['acc_tophat', 'Tiny Top Hat', '🎩', 150],
  ['acc_bell', 'Collar Bell', '🔔', 70], ['acc_shades', 'Cool Shades', '🕶️', 120], ['acc_star', 'Star Charm', '⭐', 90], ['acc_scarf', 'Cozy Scarf', '🧣', 80],
];
for (const [id, n, ic, p] of D.PETACC) it(id, n, ic, 'petacc', Math.floor(p / 3), { buy: p });

// ---------- tools & professions ----------
D.TOOLS = {
  axe: { name: 'Axe', icon: '🪓' }, pickaxe: { name: 'Pickaxe', icon: '⛏️' }, brush: { name: 'Dig Kit', icon: '🧹' },
  rod: { name: 'Fishing Rod', icon: '🎣' }, net: { name: 'Bug Net', icon: '🥅' }, sword: { name: 'Sword', icon: '🗡️' },
};
D.TIER_NAMES = ['', 'Basic', 'Copper', 'Iron', 'Gold', 'Lumen'];
D.TIER_COLORS = ['#999', '#b9a58a', '#d9814a', '#c9ccd6', '#f2c94c', '#6fe3f0'];
D.UPGRADES = [null, null, { bar: 'copper_bar', n: 5, coins: 200 }, { bar: 'iron_bar', n: 5, coins: 500 }, { bar: 'gold_bar', n: 5, coins: 1000 }, { bar: 'lumen_bar', n: 5, coins: 2000 }];
D.PROFS = {
  miner: { name: 'Miner', icon: '⛏️', cost: 200, desc: 'Mine ore veins and gems. Higher levels find extra ore and more gems.' },
  fisher: { name: 'Fisher', icon: '🎣', cost: 150, desc: 'Get a fishing rod. Higher levels widen the catch zone and hook rarer fish.', tool: 'rod' },
  archaeologist: { name: 'Archaeologist', icon: '🧹', cost: 200, desc: 'Get a dig kit to excavate dig spots, and clean relics at Relic Tables.', tool: 'brush' },
  critter: { name: 'Critter Keeper', icon: '🦋', cost: 150, desc: 'Get a bug net, and walk two pets at once. Higher levels catch critters more reliably.', tool: 'net' },
  chef: { name: 'Chef', icon: '🍳', cost: 200, desc: 'Cook dishes at stoves. New recipes unlock as you level up.' },
  blacksmith: { name: 'Blacksmith', icon: '🔨', cost: 250, desc: 'Smelt ore into bars at furnaces (used for tool upgrades and crafting).' },
  carpenter: { name: 'Carpenter', icon: '🪚', cost: 200, desc: 'Craft furniture at workbenches. Fancier pieces unlock as you level.' },
  explorer: { name: 'Explorer', icon: '🧭', cost: 150, desc: 'Enter ancient temples and open explorer chests. You walk a little faster each level.' },
};
D.XP = [0, 0, 60, 150, 280, 450, 680, 980, 1350, 1800, 2400];

// ---------- recipes ----------
D.RECIPES = [];
function R(station, out, need, prof, lvl, n) { D.RECIPES.push({ id: out + '@' + station, station, out, need, prof: prof || null, lvl: lvl || 0, n: n || 1 }); }
// cooking
R('stove', 'fried_egg', { egg: 1 }, 'chef', 1); R('stove', 'pancakes', { flour: 1, egg: 1, milk: 1 }, 'chef', 1);
R('stove', 'salad', { lettuce: 1, tomato: 1 }, 'chef', 1); R('stove', 'honey_toast', { flour: 1, honey: 1, butter: 1 }, 'chef', 2);
R('stove', 'veggie_soup', { carrot: 1, potato: 1, onion: 1 }, 'chef', 2); R('stove', 'grilled_fish', { '#fish': 1, salt: 1 }, 'chef', 2);
R('stove', 'berry_pie', { flour: 1, berries: 3, sugar: 1, butter: 1 }, 'chef', 3); R('stove', 'hot_cocoa', { cocoa: 1, milk: 1, sugar: 1 }, 'chef', 3);
R('stove', 'popcorn', { corn: 1, butter: 1, salt: 1 }, 'chef', 3); R('stove', 'pumpkin_soup', { pumpkin: 1, cream: 1, onion: 1 }, 'chef', 4);
R('stove', 'fish_tacos', { '#fish': 1, corn: 1, tomato: 1 }, 'chef', 4); R('stove', 'apple_crumble', { apple: 2, flour: 1, butter: 1, sugar: 1 }, 'chef', 4);
R('stove', 'smoothie', { banana: 1, mango: 1, milk: 1 }, 'chef', 5); R('stove', 'risotto', { rice: 1, mushroom: 2, cheese: 1 }, 'chef', 5);
R('stove', 'sushi', { rice: 1, seaweed: 1, '#fish': 1 }, 'chef', 6); R('stove', 'curry', { rice: 1, chili: 1, potato: 1, spice: 1 }, 'chef', 6);
R('stove', 'coconut_pudding', { coconut: 1, milk: 1, sugar: 1 }, 'chef', 7); R('stove', 'date_cake', { dates: 2, flour: 1, egg: 1, sugar: 1 }, 'chef', 7);
R('stove', 'chili_stew', { chili: 2, tomato: 1, onion: 1, potato: 1 }, 'chef', 8); R('stove', 'fruit_salad', { apple: 1, banana: 1, strawberry: 1, mango: 1 }, 'chef', 8);
R('stove', 'glimmer_tart', { glowcap: 2, flour: 1, sugar: 1, berries: 2 }, 'chef', 9);
R('stove', 'feast', { grilled_fish: 1, salad: 1, pancakes: 1, berry_pie: 1 }, 'chef', 10);
// smelting
R('furnace', 'copper_bar', { copper_ore: 3, coal: 1 }, 'blacksmith', 1); R('furnace', 'iron_bar', { iron_ore: 3, coal: 1 }, 'blacksmith', 2);
R('furnace', 'gold_bar', { gold_ore: 3, coal: 1 }, 'blacksmith', 4); R('furnace', 'lumen_bar', { lumen_ore: 3, coal: 2, crystal: 1 }, 'blacksmith', 6);
// workbench (basic, no licence)
R('workbench', 'workbench', { log: 10, stone: 6 }); R('workbench', 'bait', { fiber: 2 }, null, 0, 3); R('workbench', 'bandage', { fiber: 3 });
R('workbench', 'treat', { berries: 2, fiber: 1 }, null, 0, 2);
R('workbench', 'relic_table', { log: 8, stone: 6, copper_bar: 1 }, 'archaeologist', 1); R('workbench', 'stove', { stone: 12, iron_bar: 1 }, 'chef', 1);
R('workbench', 'furnace', { stone: 20, coal: 4 }, 'blacksmith', 1); R('workbench', 'pet_bed', { fiber: 10, log: 4 }, 'critter', 1);
// carpentry
R('workbench', 'chair', { log: 4 }, 'carpenter', 1); R('workbench', 'crate', { log: 6 }, 'carpenter', 1); R('workbench', 'table', { log: 8 }, 'carpenter', 1);
R('workbench', 'plant', { stone: 4, fiber: 4 }, 'carpenter', 1); R('workbench', 'bed', { log: 12, fiber: 10 }, 'carpenter', 2);
R('workbench', 'bookshelf', { log: 10, fiber: 4 }, 'carpenter', 2); R('workbench', 'candle', { resin: 2 }, 'carpenter', 2);
R('workbench', 'lamp', { copper_bar: 1, resin: 1 }, 'carpenter', 3); R('workbench', 'tent', { fiber: 15, log: 6 }, 'carpenter', 3);
R('workbench', 'snowman', { frost_shard: 2, coal: 2 }, 'carpenter', 3); R('workbench', 'sofa', { log: 12, fiber: 12 }, 'carpenter', 4);
R('workbench', 'clock', { log: 6, copper_bar: 2 }, 'carpenter', 4); R('workbench', 'shell_chime', { shell: 6, fiber: 2 }, 'carpenter', 4);
R('workbench', 'mirror', { iron_bar: 1, crystal: 1 }, 'carpenter', 5); R('workbench', 'mush_lamp', { mush_cap: 6, spore_dust: 2 }, 'carpenter', 5);
R('workbench', 'aquarium', { crystal: 2, iron_bar: 2 }, 'carpenter', 6); R('workbench', 'bonsai', { log: 4, stone: 4, resin: 2 }, 'carpenter', 6);
R('workbench', 'crystal_lamp', { crystal: 3, gold_bar: 1 }, 'carpenter', 7); R('workbench', 'fountain_small', { stone: 30, aquamarine: 1 }, 'carpenter', 8);
R('workbench', 'telescope', { gold_bar: 2, crystal: 2 }, 'carpenter', 8); R('workbench', 'piano', { log: 20, gold_bar: 1 }, 'carpenter', 9);
R('workbench', 'trophy', { gold_bar: 3 }, 'carpenter', 10);
// relic cleaning
for (const b of BIOME_KEYS) D.RECIPES.push({ id: 'clean_' + b, station: 'relic', out: null, relic: b, need: { ['relic_' + b]: 1 }, prof: 'archaeologist', lvl: 1, n: 1 });

// ---------- pets & glimmers ----------
D.PETS = {
  cat: { name: 'Cat', arch: 'cat', colors: [['#f0a050', '#fff3e0'], ['#8a8f99', '#e8e8f0'], ['#3a3540', '#f0f0f0'], ['#f6f1ea', '#ffd9e0'], ['#d9b38c', '#5a4030']] },
  dog: { name: 'Dog', arch: 'dog', colors: [['#e0b060', '#fff3e0'], ['#8a5a3a', '#e8c9a0'], ['#2f2a2a', '#c9a27a'], ['#f4f0e8', '#d9b38c'], ['#c9c0b0', '#5a4a40']] },
  bunny: { name: 'Bunny', arch: 'bunny', colors: [['#f8f6f2', '#ffc0cc'], ['#a87a5a', '#f2e0cc'], ['#9a9aa6', '#f0f0f8'], ['#2e2a2e', '#ffc0cc']] },
  hedgehog: { name: 'Hedgehog', arch: 'hedgehog', colors: [['#8a6a4a', '#f2dfc4'], ['#c9b8a0', '#fff3e0'], ['#5a4a42', '#e0c8b0']] },
  fox: { name: 'Fox', arch: 'fox', colors: [['#e8763a', '#fff6ea'], ['#c9d2dc', '#ffffff'], ['#4a3a3a', '#e8e0d8']] },
  otter: { name: 'Otter', arch: 'otter', colors: [['#7a5238', '#e8cfae'], ['#5a4030', '#d9c0a0']] },
  penguin: { name: 'Penguin', arch: 'penguin', colors: [['#2a3040', '#ffffff'], ['#5a6478', '#ffffff']] },
  axolotl: { name: 'Axolotl', arch: 'axolotl', colors: [['#ffb3c8', '#ff6f91'], ['#c9f0ff', '#7ad0ff'], ['#ffe08a', '#ff9f43']] },
  frog: { name: 'Frog', arch: 'frog', colors: [['#6cc24a', '#e8f7c9'], ['#4aa3c2', '#d9f2ff'], ['#e86a8a', '#ffe0ea']] },
  fennec: { name: 'Fennec Fox', arch: 'fennec', colors: [['#f2d29a', '#fff8ea'], ['#e8c080', '#ffffff']] },
  lizard: { name: 'Salamander', arch: 'lizard', colors: [['#ff7a3a', '#ffd23a'], ['#3a3a4a', '#ff8a3a']] },
  redpanda: { name: 'Red Panda', arch: 'redpanda', colors: [['#c8552a', '#ffffff']] },
  capybara: { name: 'Capybara', arch: 'capybara', colors: [['#a07850', '#7a5838'], ['#8a6a4a', '#6a4a30']] },
};
D.PET_NAMES = ['Biscuit', 'Mochi', 'Pebble', 'Clover', 'Noodle', 'Maple', 'Pudding', 'Sprout', 'Bean', 'Waffles', 'Juniper', 'Pip', 'Tofu', 'Nugget', 'Fig', 'Button', 'Honey', 'Olive', 'Cocoa', 'Puddle'];
// strays live in the wild, one per biome, adopted with a pet treat
D.STRAYS = { meadow: 'fox', coast: 'otter', snow: 'penguin', mushroom: 'axolotl', jungle: 'frog', desert: 'fennec', volcano: 'lizard' };
D.GLIMMERS = {
  meadow: { name: 'Leaflet', color: '#8be36b', glow: '#c8ff9a', perk: 'Foraging sometimes gives double.' },
  coast: { name: 'Tidebell', color: '#5ac8fa', glow: '#a8e6ff', perk: 'Fish bite faster.' },
  snow: { name: 'Frostling', color: '#bfefff', glow: '#ffffff', perk: 'Rare fish appear more often.' },
  mushroom: { name: 'Sporelet', color: '#b18cff', glow: '#e0ccff', perk: 'Shines extra bright in the dark.' },
  jungle: { name: 'Bloomkin', color: '#ff8fc8', glow: '#ffd0ea', perk: 'Pets find gifts more often.' },
  desert: { name: 'Sunmote', color: '#ffd23a', glow: '#fff1a8', perk: 'Relics clean into rarer artifacts.' },
  volcano: { name: 'Emberwisp', color: '#ff7a3a', glow: '#ffc08a', perk: 'Mining sometimes gives extra ore.' },
};

// ---------- enemies ----------
D.ENEMIES = {
  slime: { name: 'Slime', hp: 3, dmg: 1, speed: 28, color: '#7bd36b', drops: [['gel', 1, 2, 0.8]] },
  tideslime: { name: 'Tide Slime', hp: 4, dmg: 1, speed: 30, color: '#5ab0e8', drops: [['gel', 1, 2, 0.8], ['shell', 1, 1, 0.3]] },
  bat: { name: 'Frost Bat', hp: 3, dmg: 1, speed: 45, color: '#9fc8e8', drops: [['frost_shard', 1, 1, 0.5], ['feather', 1, 1, 0.4]], fly: 1 },
  puff: { name: 'Spore Puff', hp: 4, dmg: 1, speed: 24, color: '#b18cff', drops: [['spore_dust', 1, 2, 0.8]] },
  spider: { name: 'Jungle Spider', hp: 4, dmg: 1, speed: 42, color: '#4a3a5a', drops: [['silk', 1, 2, 0.8]] },
  scorpion: { name: 'Scorpion', hp: 5, dmg: 2, speed: 36, color: '#c9883a', drops: [['resin', 1, 1, 0.4], ['topaz', 1, 1, 0.05]] },
  magma: { name: 'Magma Blob', hp: 6, dmg: 2, speed: 30, color: '#ff6a2a', drops: [['ember_shard', 1, 1, 0.6], ['coal', 1, 2, 0.6]] },
  golem: { name: 'Temple Guardian', hp: 8, dmg: 2, speed: 26, color: '#a89e8c', drops: [['stone', 2, 4, 1], ['amethyst', 1, 1, 0.15]] },
};
D.BIOME_ENEMY = { meadow: 'slime', coast: 'tideslime', snow: 'bat', mushroom: 'puff', jungle: 'spider', desert: 'scorpion', volcano: 'magma' };

// ---------- biomes & towns ----------
D.BIOMES = [
  { key: 'meadow', name: 'Sunny Meadow', town: 'willowmere', root: 60, scale: 'major', site: [0.5, 0.5] },
  { key: 'coast', name: 'Coral Coast', town: 'coralcove', root: 62, scale: 'major', site: [0.19, 0.42] },
  { key: 'snow', name: 'Frostpeak Tundra', town: 'frostbell', root: 57, scale: 'minor', site: [0.42, 0.19] },
  { key: 'mushroom', name: 'Mosslight Woods', town: 'mosslight', root: 59, scale: 'dorian', site: [0.72, 0.26] },
  { key: 'jungle', name: 'Verdant Jungle', town: 'canopy', root: 64, scale: 'major', site: [0.8, 0.58] },
  { key: 'desert', name: 'Sunspire Dunes', town: 'sunspire', root: 62, scale: 'phrygian', site: [0.3, 0.76] },
  { key: 'volcano', name: 'Emberfall Caldera', town: 'emberforge', root: 55, scale: 'minor', site: [0.62, 0.79] },
];
D.TOWNS = {
  willowmere: {
    name: 'Willowmere', biome: 0, temple: 'Whispering Grotto', cave: 'Mossy Mine', desc: 'A sleepy village of willow trees and warm bread.',
    buildings: [
      { kind: 'home', label: 'Your Cottage', sign: '🏡' }, { kind: 'shop', npc: 'pip', label: 'General Store', sign: '🛒' },
      { kind: 'shop', npc: 'hazel', label: 'Pawsome Pets', sign: '🐾' }, { kind: 'shop', npc: 'rowan', label: 'Guild Hall', sign: '📜' },
      { kind: 'shop', npc: 'wren', label: 'Wren\'s Tailoring', sign: '🧵' }, { kind: 'shop', npc: 'clover', label: 'Greengrocer', sign: '🥕' },
      { kind: 'house', npc: 'bramble', label: 'Town Hall', sign: '🏛️' }, { kind: 'house', npc: 'tobias', label: 'Tobias\'s House', sign: '' },
    ], wanderers: ['fern'], stations: ['workbench'],
  },
  coralcove: {
    name: 'Coral Cove', biome: 1, temple: 'Tidecaller Temple', desc: 'Salt air, gull cries and the old Lumen Lighthouse.',
    buildings: [
      { kind: 'shop', npc: 'nerissa', label: 'Fishmonger', sign: '🐟' }, { kind: 'shop', npc: 'juniper', label: 'Driftwood Furnishings', sign: '🪑' },
      { kind: 'shop', npc: 'shelly', label: 'Salty Gull Inn', sign: '🛏️', inn: 1 }, { kind: 'house', npc: 'kai', label: 'Surf Shack', sign: '🏄' },
      { kind: 'lighthouse', npc: 'marlow', label: 'Lumen Lighthouse', sign: '' },
    ], wanderers: [], stations: ['stove'],
  },
  frostbell: {
    name: 'Frostbell', biome: 2, temple: 'Rime Sanctum', cave: 'Glacier Cave', desc: 'Cocoa, quilts and chimney smoke over the snow.',
    buildings: [
      { kind: 'shop', npc: 'bjorn', label: 'Cocoa Café & Inn', sign: '☕', inn: 1 }, { kind: 'shop', npc: 'ingrid', label: 'Knit & Purl', sign: '🧣' },
      { kind: 'house', npc: 'sorrel', label: 'Elder\'s Lodge', sign: '🔔' }, { kind: 'house', npc: 'pim', label: 'Ice Hut', sign: '🎣' },
    ], wanderers: [], stations: ['stove'],
  },
  mosslight: {
    name: 'Mosslight', biome: 3, temple: 'Sporelight Hollow', cave: 'Crystal Grotto', desc: 'Glowing caps, soft moss and wishful stargazers.',
    buildings: [
      { kind: 'shop', npc: 'oona', label: 'Glimmer Sanctuary', sign: '✨' }, { kind: 'shop', npc: 'thistle', label: 'Apothecary', sign: '🧪' },
      { kind: 'shop', npc: 'morel', label: 'Mushroom Market', sign: '🍄', inn: 1 }, { kind: 'house', npc: 'luna', label: 'Observatory', sign: '🔭' },
    ], wanderers: [], stations: ['workbench'],
  },
  canopy: {
    name: 'Canopy Hollow', biome: 4, temple: 'Verdant Ziggurat', desc: 'Rope bridges, fruit stalls and very loud birds.',
    buildings: [
      { kind: 'shop', npc: 'kiwi', label: 'Fruit Stand & Inn', sign: '🍍', inn: 1 }, { kind: 'shop', npc: 'basil', label: 'Explorers\' Lodge', sign: '🧭' },
      { kind: 'shop', npc: 'zuri', label: 'Critter Rescue', sign: '🐾' }, { kind: 'house', npc: 'tamsin', label: 'Chief\'s Treehouse', sign: '🌺' },
    ], wanderers: [], stations: ['stove', 'workbench'],
  },
  sunspire: {
    name: 'Sunspire Oasis', biome: 5, temple: 'Sunken Sun Temple', desc: 'Palm shade, spice markets and a grand museum.',
    buildings: [
      { kind: 'shop', npc: 'amara', label: 'Grand Museum', sign: '🏛️' }, { kind: 'shop', npc: 'quill', label: 'Dig Society', sign: '🧹' },
      { kind: 'shop', npc: 'saffron', label: 'Bazaar', sign: '💎' }, { kind: 'shop', npc: 'dahlia', label: 'Date Palm Inn', sign: '🫖', inn: 1 },
    ], wanderers: ['sami'], stations: ['relic_table'],
  },
  emberforge: {
    name: 'Emberforge', biome: 6, temple: 'Cinder Vault', cave: 'Deep Mine', desc: 'Anvils ring day and night beside the lava falls.',
    buildings: [
      { kind: 'shop', npc: 'brann', label: 'Forge', sign: '🔨' }, { kind: 'shop', npc: 'cinder', label: 'Ore Exchange', sign: '⛏️' },
      { kind: 'shop', npc: 'ember', label: 'Spicy Hearth Inn', sign: '🌶️', inn: 1 }, { kind: 'house', npc: 'ash', label: 'Miner\'s Bunk', sign: '' },
    ], wanderers: [], stations: ['furnace', 'workbench'],
  },
};
D.TOWN_ORDER = ['willowmere', 'coralcove', 'frostbell', 'mosslight', 'canopy', 'sunspire', 'emberforge'];

// ---------- NPCs ----------
// look: skin, hair, hairStyle(0 short,1 long,2 bun,3 spiky,4 bald), outfit, pants, hat(emoji)
D.NPCS = {
  bramble: { name: 'Mayor Bramble', town: 'willowmere', look: ['#f1c7a3', '#d8d8d8', 4, '#7a5ab8', '#4a3a6a', '🎩'], loves: ['berry_pie', 'old_coin', 'tulip'], likes: ['#food', 'sunflower'],
    lines: ['Willowmere is small, but the bread is enormous.', 'I remember when the Lighthouse lit every shore of these isles. Golden nights, those.', 'Don\'t rush, friend. The isles have been waiting a long time; they can wait a little longer.'] },
  pip: { name: 'Pip', town: 'willowmere', shop: 'general', look: ['#e8b48a', '#c96a3a', 3, '#4aa36c', '#3a4a6a'], loves: ['honey_toast', 'topaz'], likes: ['#forage', 'coal'],
    lines: ['Stocked up on treats? Pets can smell an empty pocket.', 'If it\'s round, square, or wobbly, I probably sell it.', 'Logs, stone and fiber are the backbone of the isles. And my business.'] },
  hazel: { name: 'Hazel', town: 'willowmere', shop: 'pets', look: ['#c98e6a', '#5a3a2a', 1, '#f28ba8', '#6a4a5a'], loves: ['toy_yarn', 'daisy', 'pancakes'], likes: ['treat', '#critter'],
    lines: ['Every pet on these isles deserves a warm lap and a full bowl.', 'I\'ve heard there are lost little ones out in every corner of the isles. Bring a treat if you go looking!', 'Pet your pets every day. It\'s the law. Well, MY law.'] },
  rowan: { name: 'Guildmaster Rowan', town: 'willowmere', shop: 'licenses', look: ['#a8745a', '#2a2a2a', 0, '#8a5a3a', '#3a2a2a', '🎓'], loves: ['compass', 'iron_bar'], likes: ['#artifact', '#bar'],
    lines: ['A licence isn\'t a rule, it\'s a promise to the isles to do a craft well.', 'Pick a craft that makes your heart hum. You can always learn another.', 'The Explorer licence is popular this season. Temples everywhere, it seems!'] },
  wren: { name: 'Wren', town: 'willowmere', shop: 'tailor', look: ['#f6d5b8', '#e8c547', 2, '#e85a5a', '#5a3a3a'], loves: ['silk', 'blossom'], likes: ['#hat', 'feather'],
    lines: ['A good hat changes the whole adventure.', 'Bring me spider silk sometime, it makes the softest ribbons.', 'Fashion is just comfort with confidence!'] },
  clover: { name: 'Clover', town: 'willowmere', shop: 'grocer', look: ['#8a5a40', '#2a1a1a', 1, '#8ccf5a', '#5a4a2a', '👒'], loves: ['veggie_soup', 'sunflower'], likes: ['#ingredient', 'apple'],
    lines: ['Fresh from the valley farms this morning!', 'No need to grow it yourself, dear, that\'s what I\'m here for.', 'Try mixing flour, eggs and milk on a stove. Pancakes!'] },
  tobias: { name: 'Old Tobias', town: 'willowmere', look: ['#e6c0a0', '#ffffff', 4, '#3a6a9a', '#3a3a4a', '🧢'], loves: ['koi', 'grilled_fish'], likes: ['#fish'],
    lines: ['Fished every pond on these isles. Twice.', 'The Koi in the meadow ponds are shy. Patience, patience.', 'At night, the Moonfish come up to look at the stars. Same as me.'] },
  fern: { name: 'Little Fern', town: 'willowmere', look: ['#f2d0b4', '#e07a3a', 2, '#ffd23a', '#6a8ac9'], loves: ['ladybug', 'cookie', 'popcorn'], likes: ['#critter', 'daisy'],
    lines: ['Did you know ladybugs can have up to twenty spots? I counted!', 'When I grow up I\'m gonna have a hundred pets. And a bug zoo.', 'Can your pet do tricks? Mine can sit. Sometimes.'] },
  marlow: { name: 'Captain Marlow', town: 'coralcove', shop: 'lighthouse', look: ['#d9a07a', '#9a9aa0', 0, '#2a4a7a', '#2a2a3a', '🧢'], loves: ['ship_bell', 'tuna'], likes: ['#fish', 'shell'],
    lines: ['Six shards of lumen, scattered like stars. Bring them home and she\'ll shine again.', 'Wind\'s fair today. Good day for an adventure.', 'Mind the gulls. They steal sandwiches with no remorse.'] },
  nerissa: { name: 'Nerissa', town: 'coralcove', shop: 'fish', look: ['#7a5240', '#3a8ac9', 1, '#3ac9b0', '#2a5a6a'], loves: ['octopus', 'pearl'], likes: ['#fish', 'seaweed'],
    lines: ['I pay extra for fish, any fish! Well, fresh-ish.', 'Bubbles on the water mean fish below. Cast right on top of them.', 'Bait makes the catch zone bigger. Trust me.'] },
  juniper: { name: 'Juniper', town: 'coralcove', shop: 'furniture', look: ['#f6d5b8', '#7a4a2a', 0, '#c9a46a', '#5a4a3a'], loves: ['shell_chime', 'log'], likes: ['#furniture', 'resin'],
    lines: ['Driftwood has stories. I just turn them into chairs.', 'A home isn\'t done until it has too many lamps.', 'If you learn carpentry, you can build my designs yourself!'] },
  kai: { name: 'Kai', town: 'coralcove', look: ['#a8745a', '#f2e07a', 3, '#ff8a3a', '#3a8ac9'], loves: ['smoothie', 'coconut'], likes: ['#fish', 'shell'],
    lines: ['Duuude, the waves are gnarly today. Gnarly in a cozy way.', 'Ever seen a hermit crab change shells? It\'s, like, the cutest thing.', 'The temple out on the rocks hums when the tide comes in. Spooky!'] },
  shelly: { name: 'Shelly', town: 'coralcove', shop: 'coastgrocer', look: ['#e8b48a', '#f28ba8', 2, '#5ac8fa', '#3a5a8a'], loves: ['sushi', 'pearl'], likes: ['#food'],
    lines: ['Welcome to the Salty Gull! Rooms are free for adventurers, always have been.', 'Sea salt makes everything better. Even pancakes. Probably.', 'Need a rest? Just ask and the bed\'s yours.'] },
  sorrel: { name: 'Elder Sorrel', town: 'frostbell', look: ['#f2dcc8', '#f0f0f0', 1, '#5a7ab8', '#3a4a6a', '🎧'], loves: ['frozen_horn', 'hot_cocoa'], likes: ['frost_lily', '#food'],
    lines: ['The Rime Sanctum has been frozen shut for a hundred winters.', 'Snow is only cold if you forget your scarf.', 'Sit by the fire a while. The cold can wait.'] },
  bjorn: { name: 'Bjorn', town: 'frostbell', shop: 'cafe', look: ['#e8b48a', '#c96a3a', 0, '#c94a4a', '#4a3a3a'], loves: ['honey', 'date_cake'], likes: ['#food', 'cocoa'],
    lines: ['One cocoa, extra marshmallows? Coming right up.', 'Rooms upstairs are free for travelers. Rest whenever you like.', 'My stove is your stove, if you know how to cook.'] },
  ingrid: { name: 'Ingrid', town: 'frostbell', shop: 'knit', look: ['#f6e0cc', '#e8d8a0', 2, '#7ac9e8', '#5a5a7a'], loves: ['silk', 'snowberry'], likes: ['fiber', '#hat'],
    lines: ['Every stitch keeps someone warm.', 'Earmuffs are both fashion AND function.', 'Penguins waddle around the frozen lakes. I knit them tiny scarves, they never wear them.'] },
  pim: { name: 'Pim', town: 'frostbell', look: ['#c98e6a', '#3a2a2a', 3, '#e8a83a', '#3a3a5a'], loves: ['glacier_trout', 'hot_cocoa'], likes: ['#fish'],
    lines: ['Cut a hole, drop a line, wait. That\'s ice fishing. Also life.', 'Glacier Trout only bite in daylight. Picky fellas.', 'Brr! Want to hear about my favourite snowflake? It was this one.'] },
  oona: { name: 'Sage Oona', town: 'mosslight', shop: 'glimmer', look: ['#b8e0d0', '#b18cff', 1, '#5a4a9a', '#3a2a5a'], loves: ['moon_tablet', 'glowcap'], likes: ['spore_dust', '#critter'],
    lines: ['Glimmers are little pieces of the old light. They choose the kind-hearted.', 'Bring me any egg from the temples and I\'ll help it hatch right away.', 'Listen... the moss is humming tonight.'] },
  thistle: { name: 'Thistle', town: 'mosslight', shop: 'apothecary', look: ['#e8c8a8', '#4a8a5a', 3, '#8a5ab8', '#4a3a5a'], loves: ['frost_lily', 'orchid'], likes: ['#forage'],
    lines: ['A Breeze Tonic makes your feet feel like feathers.', 'Glow Tonic is great for caves. Less tripping, more finding.', 'Mind the spores, they make you sneeze sparkles.'] },
  morel: { name: 'Morel', town: 'mosslight', shop: 'mushgrocer', look: ['#d9a07a', '#8a3a2a', 4, '#c9883a', '#5a4a3a', '🍄'], loves: ['risotto', 'mushroom'], likes: ['#ingredient', 'glowcap'],
    lines: ['Every mushroom in my market is a friend. Except the grumpy ones.', 'The inn rooms upstairs smell like moss. Very restful!', 'Mushroom risotto. Rice, mushrooms, cheese. Life-changing.'] },
  luna: { name: 'Luna', town: 'mosslight', look: ['#f6e0cc', '#2a2a4a', 1, '#2a3a7a', '#1a1a3a', '⭐'], loves: ['telescope', 'moonfish'], likes: ['#gem', 'moon_moth'],
    lines: ['The stars over Mosslight are the brightest on the isles.', 'I\'ve charted every constellation but one. It moves when I blink.', 'Moon Moths only come out at night. They love lantern light.'] },
  tamsin: { name: 'Chief Tamsin', town: 'canopy', look: ['#8a5a40', '#2a1a1a', 2, '#3a9a5a', '#5a3a2a', '🌺'], loves: ['jade_mask', 'smoothie'], likes: ['orchid', '#food'],
    lines: ['The Ziggurat\'s puzzles were made to test patience, not strength.', 'The canopy remembers everyone who is kind to it.', 'Rest here as long as you like. The jungle is never in a hurry.'] },
  kiwi: { name: 'Kiwi', town: 'canopy', shop: 'fruit', look: ['#a8745a', '#5ac85a', 3, '#ffd23a', '#3a7a3a'], loves: ['fruit_salad', 'mango'], likes: ['#ingredient', 'banana'],
    lines: ['Fresh mango! Sweet pineapple! Bananas shaped like smiles!', 'Free beds above the stand if you get tired. The parrots are loud though.', 'Chili and spice? That\'s curry time.'] },
  basil: { name: 'Basil', town: 'canopy', shop: 'explorer', look: ['#e8b48a', '#8a6a3a', 0, '#a89a5a', '#5a4a2a', '⛑️'], loves: ['idol', 'compass'], likes: ['#artifact', 'tmap'],
    lines: ['Treasure maps! Each one marks a chest nobody\'s opened in ages.', 'Explorer Boots: for the adventurer who never wants to arrive late.', 'A Bright Lantern will make caves much less spooky.'] },
  zuri: { name: 'Zuri', town: 'canopy', shop: 'rescue', look: ['#5a3a2a', '#1a1a1a', 2, '#ff8a5a', '#3a3a3a'], loves: ['treat', 'banana'], likes: ['#pet', 'orchid'],
    lines: ['Every critter here was rescued and is looking for a forever friend.', 'Red pandas are basically fluffy sunsets.', 'Capybaras get along with absolutely everyone.'] },
  brann: { name: 'Forgemaster Brann', town: 'emberforge', shop: 'forge', look: ['#d98a6a', '#c94a2a', 0, '#5a4a4a', '#2a2a2a'], loves: ['forge_hammer', 'gold_bar'], likes: ['#bar', 'coal'],
    lines: ['Bring me bars and coin, and I\'ll make your tools sing.', 'Copper, Iron, Gold, Lumen. Each tier hits harder and digs deeper.', 'The Cinder Vault was a forge once. The biggest the isles ever saw.'] },
  cinder: { name: 'Cinder', town: 'emberforge', shop: 'ore', look: ['#e8b48a', '#3a3a3a', 3, '#8a3a2a', '#2a2a2a'], loves: ['ruby', 'chili_stew'], likes: ['#ore', '#gem'],
    lines: ['Need ore in a hurry? I\'ll sell you some. Want ore cheap? Dig it yourself.', 'Coal keeps the furnaces happy.', 'Deep Mine goes down further every day, I swear.'] },
  ember: { name: 'Ember', town: 'emberforge', shop: 'spicy', look: ['#c98e6a', '#ff6a2a', 1, '#ff8a3a', '#5a2a2a'], loves: ['curry', 'ember_flower'], likes: ['#food', 'chili'],
    lines: ['If it doesn\'t make you sweat, it\'s not dinner.', 'The inn is warm, the beds are free, the chili is HOT.', 'Ember Blooms grow right next to the lava. Brave little flowers.'] },
  ash: { name: 'Ash', town: 'emberforge', look: ['#a8745a', '#5a5a5a', 0, '#5a5a6a', '#3a3a3a', '⛑️'], loves: ['diamond', 'curry'], likes: ['#ore', '#gem'],
    lines: ['Deeper you go in the mine, the shinier it gets.', 'Lumenite glows like a lighthouse. Hard to miss.', 'I named my pickaxe. Her name is Gertrude.'] },
  amara: { name: 'Curator Amara', town: 'sunspire', shop: 'museum', look: ['#8a5a40', '#1a1a1a', 2, '#e8c547', '#6a4a2a'], loves: ['golden_mask', 'sun_disk'], likes: ['#artifact', '#gem'],
    lines: ['Every artifact, fish and critter donated tells a story of the isles.', 'The museum belongs to all of us. Donations make it grow.', 'Have you found anything shiny lately?'] },
  quill: { name: 'Dr. Quill', town: 'sunspire', shop: 'dig', look: ['#f2dcc8', '#a0a0a0', 0, '#c9a46a', '#5a4a3a', '🎓'], loves: ['scarab_amulet', 'pot_shard'], likes: ['#artifact', '#relic'],
    lines: ['Dig spots look like little cracked mounds. The desert is full of them!', 'Clean relics at a Relic Table. Gently! Gently!', 'Archaeology is just very slow treasure hunting.'] },
  saffron: { name: 'Saffron', town: 'sunspire', shop: 'bazaar', look: ['#c98e6a', '#5a1a3a', 1, '#c94a8a', '#e8c547', '👑'], loves: ['diamond', 'desert_rose'], likes: ['#gem', '#hat'],
    lines: ['Rare goods for rare folks. That\'s you, darling.', 'I pay handsomely for gems.', 'A crown? Of course you deserve a crown.'] },
  dahlia: { name: 'Dahlia', town: 'sunspire', shop: 'dategrocer', look: ['#a8745a', '#e8a83a', 2, '#5ac8b0', '#5a4a3a'], loves: ['date_cake', 'lemon'], likes: ['#ingredient', '#food'],
    lines: ['Dates from the oasis palms, sweetest on the isles.', 'Free rooms for weary diggers. Shake the sand off first, please.', 'A cool drink, a shady palm, a good book. Perfect.'] },
  sami: { name: 'Sami', town: 'sunspire', look: ['#8a5a40', '#2a1a1a', 3, '#3ac9e8', '#e8e0d0'], loves: ['scarab', 'popcorn'], likes: ['#critter', 'cookie'],
    lines: ['Did you see the fennec foxes? Their ears are bigger than their faces!', 'I\'m going to be an archaeologist. Or a lizard. Haven\'t decided.', 'The sand temple is half buried. I bet there\'s a sun inside.'] },
};

// ---------- shops ----------
// entries: item id string, or {pet}, {item, price}
D.SHOPS = {
  general: { name: 'General Store', buy: ['treat', 'bait', 'bandage', 'cookie', 'log', 'stone', 'fiber', 'coal', 'workbench', 'crate', 'plant', 'candle', 'speed_tonic'] },
  pets: { name: 'Pawsome Pets', buy: [{ pet: 'cat', price: 300 }, { pet: 'dog', price: 300 }, { pet: 'bunny', price: 250 }, { pet: 'hedgehog', price: 350 }, 'treat', 'toy_ball', 'toy_yarn', 'pet_bed', 'acc_bow', 'acc_flower', 'acc_bell', 'acc_scarf', 'acc_star'] },
  tailor: { name: "Wren's Tailoring", buy: ['straw_hat', 'cap', 'bow_hat', 'blossom', 'leaf_hat', 'grad_cap', 'top_hat', 'pumpkin_head'], wardrobe: 1 },
  grocer: { name: 'Greengrocer', buy: ['flour', 'egg', 'milk', 'butter', 'sugar', 'salt', 'cheese', 'carrot', 'potato', 'tomato', 'lettuce', 'onion', 'apple', 'strawberry', 'corn', 'pumpkin', 'honey'] },
  lighthouse: { name: 'Lighthouse', buy: [] },
  licenses: { name: 'Guild Hall', buy: [] },
  fish: { name: 'Fishmonger', buy: ['bait', 'sardine', 'shrimp', 'aquarium', 'seaweed'], bonus: 'fish' },
  furniture: { name: 'Driftwood Furnishings', buy: ['chair', 'table', 'sofa', 'bookshelf', 'bed', 'lamp', 'lantern', 'plant', 'cactus_pot', 'clock', 'painting', 'mirror', 'teddy', 'vase', 'guitar', 'tent', 'globe', 'radio', 'shell_chime', 'workbench', 'stove'] },
  coastgrocer: { name: 'Salty Gull Pantry', buy: ['rice', 'seaweed', 'salt', 'lemon', 'coconut', 'cream', 'egg', 'milk', 'butter'] },
  cafe: { name: 'Cocoa Café', buy: ['hot_cocoa', 'cookie', 'cocoa', 'cream', 'milk', 'sugar', 'honey', 'flour'] },
  knit: { name: 'Knit & Purl', buy: ['earmuffs', 'snow_crown', 'cap', 'acc_scarf', 'fiber', 'teddy'] },
  glimmer: { name: 'Glimmer Sanctuary', buy: ['glim_snack', 'mush_lamp', 'star_hat'] },
  apothecary: { name: 'Apothecary', buy: ['speed_tonic', 'glow_tonic', 'bandage', 'spore_dust', 'candle', 'mush_hat'] },
  mushgrocer: { name: 'Mushroom Market', buy: ['mushroom', 'glowcap', 'honey', 'rice', 'cheese', 'cream', 'butter', 'flour'] },
  fruit: { name: 'Fruit Stand', buy: ['banana', 'mango', 'pineapple', 'chili', 'lemon', 'coconut', 'rice', 'spice', 'sugar'] },
  explorer: { name: "Explorers' Lodge", buy: ['tmap', 'boots', 'bright_lantern', 'helmet', 'bandage', 'speed_tonic'] },
  rescue: { name: 'Critter Rescue', buy: [{ pet: 'redpanda', price: 500 }, { pet: 'capybara', price: 550 }, 'treat', 'toy_ball', 'acc_shades', 'acc_tophat'] },
  forge: { name: 'Forge', buy: [{ item: 'copper_bar', price: 110 }, { item: 'iron_bar', price: 190 }, { item: 'gold_bar', price: 300 }, 'furnace', 'flame_hat'], upgrades: 1, bonus: 'bar' },
  ore: { name: 'Ore Exchange', buy: ['coal', 'stone', 'copper_ore', 'iron_ore', 'gold_ore', 'furnace'], bonus: 'ore' },
  spicy: { name: 'Spicy Hearth', buy: ['curry', 'chili', 'spice', 'potato', 'onion', 'rice', 'tomato'] },
  museum: { name: 'Grand Museum', buy: [] },
  dig: { name: 'Dig Society', buy: ['relic_table', 'bandage', 'grad_cap', 'tmap'], bonus: 'artifact' },
  bazaar: { name: 'Bazaar', buy: ['crown', 'acc_crown', 'acc_shades', 'crystal_lamp', 'piano', 'arcade', 'telescope', 'bonsai', 'fountain_small', 'amethyst', 'topaz'], bonus: 'gem' },
  dategrocer: { name: 'Oasis Pantry', buy: ['dates', 'spice', 'flour', 'egg', 'milk', 'honey', 'lemon', 'sugar'] },
};
it('pearl', 'Pearl', '⚪', 'gem', 110, { f: 'brightness(1.1)' });

// ---------- quests ----------
D.QUESTS = {};
function Q(id, giver, title, req, reward, offer, done, o) { D.QUESTS[id] = Object.assign({ id, giver, title, req, reward, offer, done }, o || {}); }
// main story
Q('main_welcome', 'bramble', 'Welcome to Willowmere', { t: 'talk', npc: 'hazel' }, { coins: 100, unlock: 'starterPet' },
  'Welcome, welcome! You must be our new neighbour. Your cottage is ready, and so is a little friend. Go see Hazel at Pawsome Pets, she\'s been waiting for you!',
  'Oh, you\'re here! I have three little ones who need a home, and you can pick one. No charge for neighbours!', { turnin: 'hazel', main: 1 });
Q('main_guild', 'bramble', 'Find Your Calling', { t: 'count', what: 'licenses', n: 1 }, { coins: 150 },
  'Every islander has a craft. Visit Guildmaster Rowan at the Guild Hall and pick up a licence: mining, fishing, digging, whatever you like!',
  'A licensed adventurer! Here\'s a little something to pay for the next one.', { pre: ['main_welcome'], main: 1 });
Q('main_grotto', 'bramble', 'The Whispering Grotto', { t: 'temple', biome: 'meadow' }, { coins: 200, items: { tmap: 1 } },
  'Long ago, the Lumen Lighthouse lit all seven shores. When it went dark, its light shattered into shards that hid in old temples. The nearest is the Whispering Grotto, just outside town. Have a look? There\'s nothing dangerous in there, just old puzzles.',
  'You found a shard! And a glimmer egg too? The old light is waking up. Here, take this map; old Basil swears it marks treasure.', { pre: ['main_welcome'], main: 1 });
Q('main_waystones', 'bramble', 'Lights Along the Road', { t: 'count', what: 'waystones', n: 4 }, { coins: 300, items: { straw_hat: 1 } },
  'Each town has a Waystone. Touch one and you can travel back to it in a blink, from anywhere. Visit four towns and wake their stones!',
  'Four towns, four friends, four Waystones! The isles feel smaller already. In a good way.', { pre: ['main_grotto'], main: 1 });
Q('main_lighthouse', 'bramble', 'Relight the Lumen Lighthouse', { t: 'count', what: 'shards', n: 7 }, { coins: 1000, unlock: 'finale' },
  'There are seven shards in all: one in every temple of the isles. When you have them all, bring them to Captain Marlow at the Lumen Lighthouse in Coral Cove. Take your time. Truly.',
  'All seven! Climb up with me, friend. Let\'s give her back her light.', { pre: ['main_grotto'], turnin: 'marlow', main: 1 });
// temples (one per town elder)
Q('temple_coast', 'marlow', 'The Tidecaller Temple', { t: 'temple', biome: 'coast' }, { coins: 250, items: { compass: 1 } }, 'There\'s an old temple out past the dunes. Locals say it sings with the tide. A shard is surely inside.', 'You heard it sing? So did I, the night you went in. Thank you.', { pre: ['main_grotto'] });
Q('temple_snow', 'sorrel', 'Thaw the Rime Sanctum', { t: 'temple', biome: 'snow' }, { coins: 250, items: { earmuffs: 1 } }, 'The Rime Sanctum lies to the north among the pines. Bring warmth back to it, will you?', 'I felt the frost lift from my old bones. Wear these, they\'re lucky.', { pre: ['main_grotto'] });
Q('temple_mushroom', 'oona', 'Sporelight Hollow', { t: 'temple', biome: 'mushroom' }, { coins: 250, items: { glim_snack: 3 } }, 'The Hollow glows with old light. A glimmer egg waits there, I can feel it.', 'Welcome to the family, little one. Here, snacks for your glimmers.', { pre: ['main_grotto'] });
Q('temple_jungle', 'tamsin', 'The Verdant Ziggurat', { t: 'temple', biome: 'jungle' }, { coins: 250, items: { blossom: 1 } }, 'Our ancestors built the Ziggurat to guard a piece of light. It\'s time someone patient took it home.', 'The canopy sings for you tonight. Wear this crown of blossoms.', { pre: ['main_grotto'] });
Q('temple_desert', 'amara', 'The Sunken Sun Temple', { t: 'temple', biome: 'desert' }, { coins: 250, items: { golden_mask: 1 } }, 'The Sunken Sun Temple lies half-buried in the dunes. Will you bring its shard into the light?', 'Marvellous! Please, take this golden mask for your own collection.', { pre: ['main_grotto'] });
Q('temple_volcano', 'brann', 'The Cinder Vault', { t: 'temple', biome: 'volcano' }, { coins: 250, items: { gold_bar: 2 } }, 'The Cinder Vault sits above the lava fields. Old forge, older puzzles. Bring the shard out.', 'Ha! Even I couldn\'t crack that vault. Take these bars, you\'ve earned them.', { pre: ['main_grotto'] });
// willowmere side quests
Q('pip_logs', 'pip', 'Stocking Up', { t: 'have', items: { log: 10, stone: 10 } }, { coins: 120, items: { treat: 3 } }, 'Shelves are looking bare! Could you chop some trees and break some rocks? 10 logs and 10 stones would do it.', 'Lovely! Here, some treats for your furry friend.');
Q('pip_coal', 'pip', 'Coal for Winter', { t: 'have', items: { coal: 5 } }, { coins: 150 }, 'Frostbell wants coal for their stoves. Coal turns up in rocks around Emberfall and in the mines.', 'Perfect, they\'ll be toasty. Thanks!', { pre: ['pip_logs'] });
Q('hazel_strays', 'hazel', 'Lost Little Ones', { t: 'count', what: 'pets', n: 2 }, { coins: 150, items: { acc_bow: 1 } }, 'There\'s a stray fox who sleeps somewhere out in the meadow. Take a Pet Treat and go say hello. Strays live in every biome, actually!', 'Two friends! Here, a bow for whoever looks cutest. That\'s all of them.', { pre: ['main_welcome'] });
Q('hazel_strays2', 'hazel', 'A Home for Everyone', { t: 'count', what: 'pets', n: 5 }, { coins: 400, items: { acc_crown: 1 } }, 'Five pets! Imagine the cuddles. There are strays on every corner of the isles: penguins, otters, fennecs...', 'You have the biggest heart on the isles. A crown for the royal pet!', { pre: ['hazel_strays'] });
Q('hazel_play', 'hazel', 'Playtime', { t: 'stat', stat: 'petted', n: 10 }, { coins: 80, items: { toy_ball: 1 } }, 'Pets need attention! Give your pets 10 good pets. Head scratches count.', 'Happy pets, happy isles. Take this ball, they love fetch.', { pre: ['main_welcome'] });
Q('rowan_two', 'rowan', 'Jack of Two Trades', { t: 'count', what: 'licenses', n: 3 }, { coins: 250, items: { helmet: 1 } }, 'One craft is good, three are better! Earn three licences and I\'ll have something for you.', 'Three crafts! You\'ll be the most useful person on the isles. Take this helmet.', { pre: ['main_guild'] });
Q('rowan_master', 'rowan', 'Master Craftsperson', { t: 'count', what: 'proflevel', n: 5 }, { coins: 600, items: { grad_cap: 1 } }, 'Reach level 5 in any profession, and you\'ll officially be a master.', 'A true master. The cap suits you.', { pre: ['rowan_two'] });
Q('wren_silk', 'wren', 'Silky Ribbons', { t: 'have', items: { fiber: 15 } }, { coins: 100, items: { bow_hat: 1 } }, 'I\'m out of thread! Plant fiber comes from tall grass and berry bushes all over the isles. Fifteen, please!', 'Thank you! I made this big bow from the first batch.');
Q('clover_soup', 'clover', 'Soup for the Soul', { t: 'have', items: { veggie_soup: 1 } }, { coins: 120, items: { honey: 3 } }, 'My granny is under the weather. Could you cook a Veggie Soup? Carrot, potato and onion; I sell all three!', 'She\'ll feel better in no time. Take some honey!', { pre: [] });
Q('clover_pie', 'clover', 'Berry Good Pie', { t: 'have', items: { berry_pie: 1 } }, { coins: 250, items: { vase: 1 } }, 'Nothing says summer like berry pie. Wild berries grow on bushes all over the meadow.', 'Delicious! You\'re a real chef now.', { pre: ['clover_soup'] });
Q('tobias_fish', 'tobias', 'Gone Fishing', { t: 'stat', stat: 'fish', n: 5 }, { coins: 120, items: { bait: 10 } }, 'Back in my day, I caught a fish before breakfast every morning. Catch five fish, any kind, and I\'ll share my secret bait stash.', 'That\'s my kind of morning! Here\'s the bait.');
Q('tobias_koi', 'tobias', 'The Shy Koi', { t: 'have', items: { koi: 1 } }, { coins: 300, items: { radio: 1 } }, 'I have never caught a Koi. Not once. Would you show me one?', 'Oh, look at those colours. Thank you, friend. Here, my old radio.', { pre: ['tobias_fish'] });
Q('fern_bugs', 'fern', 'Bug Buddies', { t: 'stat', stat: 'critters', n: 5 }, { coins: 100, items: { teddy: 1 } }, 'Can you catch five critters? Any kind! I want to see them before you let them... um, donate them!', 'SO COOL. You can have my old teddy, I\'m too big for it. (I\'m not.)');
Q('fern_ladybug', 'fern', 'Spot Counting', { t: 'have', items: { ladybug: 1 } }, { coins: 80, items: { cookie: 5 } }, 'I need a ladybug to count its spots! They crawl in the meadow grass during the day.', 'Seven spots! Have some cookies!', { pre: ['fern_bugs'] });
Q('bramble_home', 'bramble', 'Room to Grow', { t: 'count', what: 'furniture', n: 6 }, { coins: 200, unlock: 'homeUpgrade' }, 'A cottage with no furniture echoes! Place six pieces of furniture in your home and I\'ll get the builders to expand it.', 'Cozy! The builders have added a whole new wing. Go see!', { pre: ['main_guild'] });
Q('bramble_home2', 'bramble', 'A Grand Home', { t: 'count', what: 'furniture', n: 16 }, { coins: 500, unlock: 'homeUpgrade' }, 'You\'re filling that place up nicely. Place sixteen pieces and I\'ll expand it again!', 'Now THAT is a home. Enjoy the extra space!', { pre: ['bramble_home'] });
// coral cove
Q('nerissa_sardines', 'nerissa', 'Fresh Catch', { t: 'have', items: { sardine: 3 } }, { coins: 120, items: { bait: 10 } }, 'Sardines! Three sardines! The cove\'s lunch rush is starting.', 'You saved lunch! Have some bait.');
Q('nerissa_puffer', 'nerissa', 'Puffed Up', { t: 'have', items: { pufferfish: 1, tuna: 1 } }, { coins: 300, items: { aquarium: 1 } }, 'A pufferfish and a tuna for the display tank? Trust me, they\'ll get along.', 'Beautiful! Here, a tank of your own.', { pre: ['nerissa_sardines'] });
Q('juniper_wood', 'juniper', 'Driftwood Delivery', { t: 'have', items: { log: 20 } }, { coins: 160, items: { chair: 2 } }, 'I\'m out of wood for chairs! Twenty logs, please. Palms count, they\'re lovely and soft.', 'Thank you! Two chairs for your trouble.');
Q('juniper_resin', 'juniper', 'Shiny Finish', { t: 'have', items: { resin: 3 } }, { coins: 200, items: { lantern: 2 } }, 'Amber resin gives the best shine. Chop jungle and pine trees and you might find some.', 'Gleaming! Take these lanterns.', { pre: ['juniper_wood'] });
Q('kai_shells', 'kai', 'Shell Collector', { t: 'have', items: { shell: 5 } }, { coins: 100, items: { coconut: 3 } }, 'Brah, I need five shells for a necklace. Beach is full of them!', 'Radical! Coconuts for you.');
Q('kai_temple', 'kai', 'The Singing Temple', { t: 'visit', place: 'temple_coast' }, { coins: 80 }, 'Dare you to go inside the Tidecaller Temple! I mean... just peek.', 'You went IN? Legend!', { auto: 1 });
Q('shelly_sushi', 'shelly', 'Sushi Night', { t: 'have', items: { sushi: 2 } }, { coins: 280, items: { pearl: 1 } }, 'Our guests are craving sushi. Rice, seaweed and any fish. Two plates?', 'Sold out in a minute! Take this pearl.');
// frostbell
Q('bjorn_cocoa', 'bjorn', 'Cocoa Supply', { t: 'have', items: { snowberry: 5 } }, { coins: 140, items: { hot_cocoa: 3 } }, 'Snowberries make cocoa sing. Five, please! They grow on frosty bushes all over the tundra.', 'Mmm. Have some cocoa, on the house.');
Q('ingrid_wool', 'ingrid', 'Knitting Circle', { t: 'have', items: { silk: 3, fiber: 10 } }, { coins: 220, items: { acc_scarf: 1 } }, 'I want to knit something special. Three spider silk and ten fiber, if you can find them.', 'Here, a scarf for your pet. Hand-knit with love.');
Q('pim_icefish', 'pim', 'Ice Fishing 101', { t: 'have', items: { icefish: 2 } }, { coins: 140, items: { bait: 15 } }, 'Bring me two icefish and I\'ll teach you my secret. The secret is bait.', 'See? Bait! Have lots.');
Q('pim_trout', 'pim', 'The Glacier Trout', { t: 'have', items: { glacier_trout: 1 } }, { coins: 400, items: { snowman: 1 } }, 'The Glacier Trout! Biggest fish in the north. Only in daylight. Will you try?', 'Unbelievable! You can have my snowman. He\'s called Gerald.', { pre: ['pim_icefish'] });
Q('sorrel_lily', 'sorrel', 'Winter Flowers', { t: 'have', items: { frost_lily: 3 } }, { coins: 180, items: { candle: 3 } }, 'Frost Lilies bloom only in the cold. Three, for my windowsill?', 'They glow like little moons. Thank you.');
// mosslight
Q('oona_glow', 'oona', 'Glowcaps for the Garden', { t: 'have', items: { glowcap: 5 } }, { coins: 150, items: { glim_snack: 2 } }, 'Glowcaps help sleepy glimmers dream. Five would be wonderful.', 'Shh... listen to them hum.');
Q('oona_glimmers', 'oona', 'A Glimmering Family', { t: 'count', what: 'glimmers', n: 4 }, { coins: 500, items: { crystal_lamp: 1 } }, 'Hatch four glimmers. The temples hold their eggs, and I\'ll help hatch any you bring me.', 'Four little lights! Here, a lamp that glows like them.', { pre: ['temple_mushroom'] });
Q('thistle_spores', 'thistle', 'Sneezy Ingredients', { t: 'have', items: { spore_dust: 3, mushroom: 3 } }, { coins: 160, items: { glow_tonic: 2 } }, 'I need spore dust and mushrooms for tonics. Three each!', 'Achoo! I mean, thank you. Take some tonic.');
Q('morel_risotto', 'morel', 'Risotto Royale', { t: 'have', items: { risotto: 1 } }, { coins: 220, items: { mush_hat: 1 } }, 'I\'ve never tasted risotto cooked by an adventurer. Would you make one?', 'Creamy perfection! Wear this cap with pride.');
Q('luna_moth', 'luna', 'Night Wings', { t: 'have', items: { moon_moth: 1 } }, { coins: 200, items: { globe: 1 } }, 'Moon Moths dance in Mosslight at night. Could you catch one for my study?', 'Gorgeous! Take my old globe.');
Q('luna_gems', 'luna', 'Stargems', { t: 'have', items: { amethyst: 1, aquamarine: 1 } }, { coins: 400, items: { telescope: 1 } }, 'An amethyst and an aquamarine, to build a new lens. You\'ll find gems deep in the mines.', 'The stars are sharper already! Here, my spare telescope.', { pre: ['luna_moth'] });
// canopy hollow
Q('kiwi_bananas', 'kiwi', 'Bananarama', { t: 'have', items: { banana: 6 } }, { coins: 120, items: { mango: 3 } }, 'Bananas fall from jungle trees when you chop them. Six, please!', 'Banana-tastic! Mangoes for you.');
Q('basil_chests', 'basil', 'Treasure Trail', { t: 'stat', stat: 'chests', n: 3 }, { coins: 300, items: { tmap: 2 } }, 'Open three treasure chests anywhere on the isles. Explorer\'s honour!', 'Three! You\'re a natural. More maps for you.');
Q('zuri_rescue', 'zuri', 'Strays of the Jungle', { t: 'stray', biome: 'jungle' }, { coins: 200, items: { treat: 5 } }, 'A little frog has been hopping around the jungle alone. Would you take care of it? Bring a treat!', 'Look how happy it is! Treats for the whole crew.');
Q('tamsin_orchids', 'tamsin', 'Orchid Offering', { t: 'have', items: { orchid: 4 } }, { coins: 180, items: { leaf_hat: 1 } }, 'Orchids for the canopy shrine. Four, please.', 'The shrine looks beautiful. Wear this sprout, little one.');
// sunspire
Q('amara_donate', 'amara', 'Museum Patron', { t: 'count', what: 'donations', n: 10 }, { coins: 400, items: { painting: 1 } }, 'Donate ten items to the museum: fish, critters, artifacts or gems!', 'Ten donations! Your name goes on the patron wall.');
Q('amara_donate2', 'amara', 'Museum Benefactor', { t: 'count', what: 'donations', n: 40 }, { coins: 1200, items: { trophy: 1 } }, 'Forty donations would make us the finest museum on any isle.', 'Extraordinary! This trophy is yours.', { pre: ['amara_donate'] });
Q('quill_relics', 'quill', 'Dusty Discoveries', { t: 'stat', stat: 'relics', n: 3 }, { coins: 200, items: { relic_desert: 2 } }, 'Clean three relics at a Relic Table. Gently!', 'Splendid technique! Here are two more to practise on.');
Q('saffron_gems', 'saffron', 'A Gem of a Deal', { t: 'have', items: { ruby: 1 } }, { coins: 500, items: { crown: 1 } }, 'A ruby, darling. From the deep mines of Emberfall. I\'ll make it worth your while.', 'Exquisite! A crown, as promised.');
Q('dahlia_dates', 'dahlia', 'Desert Bloom', { t: 'have', items: { desert_rose: 3 } }, { coins: 180, items: { dates: 5 } }, 'Desert roses for the inn tables? Three would be lovely.', 'Gorgeous. Dates for the road!');
Q('sami_fennec', 'sami', 'Big Ears', { t: 'stray', biome: 'desert' }, { coins: 150, items: { popcorn: 2 } }, 'There\'s a fennec fox out in the dunes all by itself! Can you adopt it? Please please please?', 'YAY! Have my popcorn, I wasn\'t gonna eat it. (I was.)');
// emberforge
Q('brann_upgrade', 'brann', 'Sharper Tools', { t: 'count', what: 'toolTier', n: 2 }, { coins: 200, items: { coal: 10 } }, 'Upgrade any tool to Copper. Bring me 5 copper bars and coin, or smelt them yourself if you\'re a Blacksmith.', 'Now that\'s a tool! Coal, for your furnace.');
Q('cinder_ore', 'cinder', 'Ore Run', { t: 'have', items: { iron_ore: 6 } }, { coins: 220 }, 'I need six iron ore for a big order. The Deep Mine has plenty.', 'Right on time. Here\'s your pay.');
Q('ash_deep', 'ash', 'Into the Depths', { t: 'count', what: 'depth', n: 5 }, { coins: 350, items: { ruby: 1 } }, 'Reach level 5 of any mine. That\'s where the good stuff starts.', 'Level five! You\'re a real miner now. Take this ruby.');
Q('ember_chili', 'ember', 'Feel the Heat', { t: 'have', items: { chili_stew: 1 } }, { coins: 300, items: { flame_hat: 1 } }, 'Cook me a Volcano Chili Stew. If you can handle it.', 'HOT! Perfect! Wear this crest, champion.');
Q('ember_flowers', 'ember', 'Brave Blooms', { t: 'have', items: { ember_flower: 3 } }, { coins: 200, items: { curry: 2 } }, 'Ember Blooms grow near lava. Three for my table?', 'Lovely! Curry for the road.');

// notice board request pools (per biome)
D.BOARD = {
  meadow: ['log', 'stone', 'berries', 'daisy', 'apple', 'copper_ore', 'minnow', 'tulip'],
  coast: ['shell', 'seaweed', 'coconut', 'sardine', 'clownfish', 'log'],
  snow: ['snowberry', 'frost_lily', 'iron_ore', 'icefish', 'pinecone', 'log'],
  mushroom: ['glowcap', 'mushroom', 'spore_dust', 'crystal', 'mush_cap', 'glowfin'],
  jungle: ['banana', 'orchid', 'log', 'piranha', 'resin', 'silk'],
  desert: ['desert_rose', 'cactus_fruit', 'gold_ore', 'sand_carp', 'stone', 'pot_shard'],
  volcano: ['coal', 'ember_flower', 'iron_ore', 'magma_snapper', 'stone', 'ember_shard'],
};
D.SIGNS = [
  'The isles were once lit by a great lighthouse. Its light, they say, still sleeps in the temples.',
  'Waystone travel is free for all. Touch a stone once and it remembers you.',
  'Strays roam every biome. A treat is the best hello.',
  'Pets and glimmers never get lost. They always find their way home.',
  'Night is lovely here. Fireflies, moon moths and moonfish come out to play.',
  'Too tired? Any inn on the isles offers a free bed.',
  'If you\'d rather explore in peace, the Settings let you turn enemies off.',
];
D.MUSEUM_REWARDS = [[5, { coins: 150 }], [15, { items: { painting: 1 } }], [25, { items: { fountain_small: 1 } }], [40, { coins: 1000 }], [60, { items: { crown: 1 } }]];
})();
