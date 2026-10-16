// Every item in the game. price = what a shop pays when you sell it.
// Farm goods (crops, animal products, Earth Spirits) cannot be grown on Lume
// Island: they are bought at the farmers' market in each city.

export const ITEMS = {};
const def = (id, name, cat, price, model, extra = {}) => {
  ITEMS[id] = { id, name, cat, price, model, stack: 99, desc: '', ...extra };
  return ITEMS[id];
};

// ---------------- tools ----------------
const tool = (id, name, type, model, desc) => def(id, name, 'tool', 0, model, { tool: type, stack: 1, noSell: true, desc });
tool('axe', 'Axe', 'axe', { k: 'axe' }, 'Chops trees. Upgrade it at an anvil to fell tougher wood.');
tool('pickaxe', 'Pickaxe', 'pickaxe', { k: 'pickaxe' }, 'Breaks rocks, ore and crystals, and scoops sand.');
tool('shovel', 'Shovel', 'shovel', { k: 'shovel' }, 'Digs up shiny piles, treasure and ancient rubble.');
tool('rod', 'Fishing Rod', 'rod', { k: 'rod' }, 'Cast into water and reel in fish. Bait helps.');
tool('whip', 'Whip', 'whip', { k: 'whip' }, 'Cracks at monsters, switches and pots from a distance.');
tool('net', 'Bug Net', 'net', { k: 'net' }, 'Catches bugs for bait and for selling.');

// ---------------- raw resources ----------------
def('wood', 'Wood', 'resource', 2, { k: 'log', c: 0x9a6a3e, c2: 0xd9b27a });
def('hardwood', 'Hardwood', 'resource', 6, { k: 'log', c: 0x6b4426, c2: 0xb88a56 }, { desc: 'Dense wood from the old forest oaks.' });
def('pinewood', 'Frost Pine Log', 'resource', 10, { k: 'log', c: 0x7a5a42, c2: 0xe8d9b8 }, { desc: 'Pale, resinous wood from mountain pines.' });
def('ironwood', 'Ironwood', 'resource', 16, { k: 'log', c: 0x4e3a30, c2: 0xc46a3a }, { desc: 'Jungle wood as hard as metal.' });
def('bamboo', 'Bamboo', 'resource', 5, { k: 'bamboo', c: 0x9fcf5a });
def('fiber', 'Plant Fiber', 'resource', 1, { k: 'fiber', c: 0x8fbf4a });
def('sap', 'Tree Sap', 'resource', 5, { k: 'drop', c: 0xe9a02c });
def('stone', 'Stone', 'resource', 2, { k: 'stone', c: 0x9c9a94 });
def('sand', 'Sand', 'resource', 2, { k: 'pile', c: 0xf0d79a });
def('charcoal', 'Charcoal', 'resource', 4, { k: 'stone', c: 0x2f2a2a });
def('pinecone', 'Pinecone', 'forage', 3, { k: 'pinecone', c: 0x8a5a32 });

def('copper_ore', 'Copper Ore', 'ore', 5, { k: 'ore', c: 0x8d8780, c2: 0xe0803a });
def('iron_ore', 'Iron Ore', 'ore', 10, { k: 'ore', c: 0x7d7470, c2: 0xc9b9a8 });
def('moonstone_ore', 'Moonstone Ore', 'ore', 20, { k: 'ore', c: 0x6e7186, c2: 0xb9c8ff });
def('volcanic_ore', 'Volcanic Ore', 'ore', 35, { k: 'ore', c: 0x3a3030, c2: 0xff5a2a });
def('gold_nugget', 'Gold Nugget', 'ore', 25, { k: 'nugget', c: 0xf2c94c });

def('copper_bar', 'Copper Bar', 'bar', 18, { k: 'bar', c: 0xe0803a });
def('iron_bar', 'Iron Bar', 'bar', 35, { k: 'bar', c: 0xb9bcc4 });
def('moonstone_bar', 'Moonstone Bar', 'bar', 70, { k: 'bar', c: 0xa9b8ff });
def('volcanic_bar', 'Volcanic Bar', 'bar', 120, { k: 'bar', c: 0xd8452a });
def('gold_bar', 'Gold Bar', 'bar', 90, { k: 'bar', c: 0xf2c94c });

const GEMS = [
  ['quartz', 'Quartz', 0xf3f0ff, 8, 22], ['amethyst', 'Amethyst', 0xa86ad8, 15, 40],
  ['topaz', 'Topaz', 0xf2b33b, 22, 60], ['emerald', 'Emerald', 0x3ccf7a, 30, 80],
  ['sapphire', 'Sapphire', 0x3d6ff0, 50, 130], ['diamond', 'Diamond', 0xe8fbff, 90, 240],
  ['obsidian', 'Obsidian', 0x3a2e48, 40, 100], ['ruby', 'Ruby', 0xe8344a, 70, 180],
];
for (const [id, name, c, p1, p2] of GEMS) {
  def('rough_' + id, 'Rough ' + name, 'gem', p1, { k: 'roughgem', c });
  def('cut_' + id, 'Cut ' + name, 'gem', p2, { k: 'cutgem', c });
}
def('pearl', 'Pearl', 'gem', 60, { k: 'pearl', c: 0xfff6ee });

// processed materials
def('plank', 'Plank', 'material', 6, { k: 'plank', c: 0xc8925a });
def('rope', 'Rope', 'material', 5, { k: 'rope', c: 0xc9a86a });
def('nails', 'Nails', 'material', 6, { k: 'nails', c: 0xc0723a });
def('glass', 'Glass', 'material', 10, { k: 'glass', c: 0xbfeaf2 });
def('bottle', 'Bottle', 'material', 12, { k: 'bottle', c: 0xbfeaf2, c2: 0xbfeaf2, empty: true });
def('fabric', 'Fabric', 'material', 14, { k: 'fabric', c: 0xf2efe6 });
def('leather', 'Leather', 'material', 16, { k: 'leather', c: 0xa06a3c });
def('glue', 'Ancient Glue', 'material', 14, { k: 'jar', c: 0xe9c46a });
def('magnet', 'Copper Magnet', 'material', 20, { k: 'magnet', c: 0xd9443a }, { desc: 'Bait for sunken treasure. Cast it into bubbling water.' });
def('red_dye', 'Red Color', 'material', 8, { k: 'jar', c: 0xe0464a });
def('blue_dye', 'Blue Color', 'material', 14, { k: 'jar', c: 0x3f7fe0 });
def('white_dye', 'White Color', 'material', 20, { k: 'jar', c: 0xf4f4f8 });
def('gold_dye', 'Gold Color', 'material', 28, { k: 'jar', c: 0xf2c33b });
def('torch', 'Torch', 'placeable', 4, { k: 'torch' }, { place: 'torch', desc: 'Place it to light a cave. Darkness cannot reach you near a torch.' });

// ---------------- forage ----------------
def('red_berry', 'Red Berries', 'forage', 3, { k: 'berry', c: 0xe2383f }, { food: 1, biome: 'meadow' });
def('blueberry', 'Blueberries', 'forage', 6, { k: 'berry', c: 0x3f5fd6 }, { food: 1, biome: 'forest' });
def('frostberry', 'Frostberries', 'forage', 10, { k: 'berry', c: 0xdff3ff }, { food: 1, biome: 'mountain' });
def('sunberry', 'Sunberries', 'forage', 14, { k: 'berry', c: 0xffb21f }, { food: 2, biome: 'jungle' });
def('daisy', 'Daisy', 'forage', 4, { k: 'flower', c: 0xffffff, c2: 0xffd43b }, { biome: 'meadow', flower: true });
def('poppy', 'Poppy', 'forage', 5, { k: 'flower', c: 0xf0483e, c2: 0x2b2b2b }, { biome: 'meadow', flower: true });
def('bluebell', 'Bluebell', 'forage', 7, { k: 'flower', c: 0x6f86f0, c2: 0xdfe6ff }, { biome: 'forest', flower: true });
def('edelweiss', 'Edelweiss', 'forage', 12, { k: 'flower', c: 0xf6f6ee, c2: 0xd8d36b }, { biome: 'mountain', flower: true });
def('orchid', 'Orchid', 'forage', 16, { k: 'flower', c: 0xe36bd8, c2: 0xfff07a }, { biome: 'jungle', flower: true });
def('meadow_mushroom', 'Meadow Mushroom', 'forage', 5, { k: 'mushroom', c: 0xf3e3c8, c2: 0xd9c2a0 }, { mushroom: true, food: 1 });
def('porcini', 'Forest Porcini', 'forage', 9, { k: 'mushroom', c: 0x9a5a2e, c2: 0xf1e2c6 }, { mushroom: true, food: 1 });
def('glowcap', 'Glowcap', 'forage', 12, { k: 'mushroom', c: 0x56d6c8, c2: 0xe6fff9, glow: true }, { mushroom: true });
def('snowcap', 'Snowcap Mushroom', 'forage', 14, { k: 'mushroom', c: 0xf7fbff, c2: 0xbfd2e6 }, { mushroom: true, food: 1 });
def('ember_shroom', 'Ember Shroom', 'forage', 18, { k: 'mushroom', c: 0xff6a2a, c2: 0xffe0b0 }, { mushroom: true });
def('trippy_spores', 'Trippy Spores', 'forage', 22, { k: 'spores', c: 0xc77dff });
def('seashell', 'Seashell', 'forage', 5, { k: 'shell', c: 0xffd9c2 });
def('conch', 'Conch', 'forage', 15, { k: 'conch', c: 0xffb38a });
def('coral', 'Coral', 'forage', 20, { k: 'coral', c: 0xff6f91 });
def('ice_crystal', 'Ice Crystal', 'forage', 18, { k: 'cutgem', c: 0xbff0ff });

// ---------------- bugs (bait) ----------------
def('caterpillar', 'Caterpillar', 'bug', 3, { k: 'caterpillar', c: 0x8fd14f }, { bait: 'meadow' });
def('grasshopper', 'Grasshopper', 'bug', 6, { k: 'hopper', c: 0x5fb43a }, { bait: 'forest' });
def('frost_beetle', 'Frost Beetle', 'bug', 10, { k: 'beetle', c: 0x7fc8ff }, { bait: 'mountain' });
def('firefly', 'Firefly', 'bug', 14, { k: 'firefly', c: 0xfff27a }, { bait: 'jungle' });
def('butterfly', 'Butterfly', 'bug', 8, { k: 'butterfly', c: 0xffa94d });

// ---------------- fish ----------------
const fish = (id, name, price, c, c2, biome, diff, size = 1, extra = {}) => def(id, name, 'fish', price, { k: 'fish', c, c2, s: size }, { biome, diff, food: 1, ...extra });
fish('sunny_sardine', 'Sunny Sardine', 12, 0x9fc6e0, 0xf2d35a, 'meadow', 1, 0.8);
fish('brook_perch', 'Brook Perch', 18, 0x8fb35a, 0xe9a44a, 'meadow', 2, 0.95);
fish('gilded_carp', 'Gilded Carp', 45, 0xf2b93b, 0xfff0a0, 'meadow', 4, 1.15);
fish('bubble_jelly', 'Bubble Jelly', 30, 0xf6a3e0, 0xffffff, 'meadow', 3, 0.9, { model: { k: 'jelly', c: 0xf6a3e0 } });
fish('fern_trout', 'Fern Trout', 30, 0x6aa86a, 0xf2a8a0, 'forest', 3, 1.0);
fish('barkskin_pike', 'Barkskin Pike', 40, 0x7a6a4a, 0xc9b98a, 'forest', 4, 1.25);
fish('shade_ray', 'Shade Ray', 55, 0x4a5a7a, 0x8fa0c0, 'forest', 5, 1.1, { model: { k: 'ray', c: 0x4a5a7a } });
fish('glowfin', 'Glowfin', 75, 0x3ad6c0, 0xd6fff6, 'forest', 6, 0.9);
fish('frost_char', 'Frost Char', 55, 0xa8c8e8, 0xf28a6a, 'mountain', 5, 1.0);
fish('ice_pike', 'Ice Pike', 70, 0xcfe8ff, 0x7aa0c8, 'mountain', 6, 1.3);
fish('glacier_salmon', 'Glacier Salmon', 95, 0xe88a7a, 0xd8e8f2, 'mountain', 6, 1.2);
fish('crystal_eel', 'Crystal Eel', 130, 0xbfe8ff, 0x9a8aff, 'mountain', 8, 1.4, { model: { k: 'eel', c: 0xbfe8ff, c2: 0x9a8aff } });
fish('parrotfish', 'Parrotfish', 80, 0x3ad6a0, 0xff6aa8, 'jungle', 6, 1.1);
fish('piranha', 'Piranha', 95, 0x9aa0a8, 0xe84a3a, 'jungle', 7, 0.9);
fish('lava_snapper', 'Lava Snapper', 140, 0xff5a2a, 0xffd23a, 'jungle', 8, 1.15);
fish('rainbow_koi', 'Rainbow Koi', 200, 0xff8a3a, 0x7ad6ff, 'jungle', 9, 1.2);
def('oyster', 'Oyster', 'fish', 20, { k: 'oyster', c: 0x9a948a }, { desc: 'Sometimes hides a pearl. Open it at a Fish Prep Table.' });
def('old_boot', 'Old Boot', 'junk', 1, { k: 'boot', c: 0x6a4a32 });
def('seaweed', 'Seaweed', 'forage', 2, { k: 'seaweed', c: 0x3f9a5a });

// ---------------- farm goods (buy only) ----------------
const farm = (id, name, price, model, biome, extra = {}) => def(id, name, 'farm', price, model, { biome, farm: true, ...extra });
farm('wheat', 'Wheat', 6, { k: 'wheat', c: 0xf2c96a }, 'meadow');
farm('potato', 'Potato', 6, { k: 'potato', c: 0xc9a06a }, 'meadow', { food: 1 });
farm('carrot', 'Carrot', 6, { k: 'carrot', c: 0xf28a2e }, 'meadow', { food: 1 });
farm('tomato', 'Tomato', 8, { k: 'round', c: 0xe8433a, leaf: true }, 'meadow', { food: 1 });
farm('cotton', 'Cotton', 7, { k: 'cotton', c: 0xffffff }, 'meadow');
farm('egg', 'Egg', 8, { k: 'egg', c: 0xf6ead8 }, 'meadow');
farm('milk', 'Milk', 10, { k: 'bottle', c: 0xffffff, c2: 0xd8ecf2 }, 'meadow');
farm('sunflower', 'Sunflower', 8, { k: 'flower', c: 0xffc21a, c2: 0x6a3a1a }, 'meadow', { flower: true });
farm('pumpkin', 'Pumpkin', 14, { k: 'pumpkin', c: 0xf28a1e }, 'forest');
farm('onion', 'Onion', 10, { k: 'onion', c: 0xd9a0c0 }, 'forest');
farm('hops', 'Hops', 12, { k: 'hops', c: 0x9fd46a }, 'forest');
farm('cabbage', 'Cabbage', 12, { k: 'round', c: 0x8fd46a, s: 1.2 }, 'forest', { food: 1 });
farm('strawberry', 'Strawberry', 14, { k: 'strawberry', c: 0xf03a4a }, 'forest', { food: 1 });
farm('honey', 'Honey', 18, { k: 'jar', c: 0xf2a91e }, 'forest');
farm('butter', 'Butter', 16, { k: 'block', c: 0xffe38a }, 'forest');
farm('lavender', 'Lavender', 12, { k: 'lavender', c: 0x9a7ae0 }, 'forest', { flower: true });
farm('barley', 'Barley', 16, { k: 'wheat', c: 0xd9b85a }, 'mountain');
farm('beetroot', 'Beetroot', 16, { k: 'beet', c: 0x9a1e4a }, 'mountain', { food: 1 });
farm('grapes', 'Grapes', 22, { k: 'grapes', c: 0x7a3ab8 }, 'mountain', { food: 1 });
farm('apple', 'Apple', 18, { k: 'round', c: 0xe0362e, stem: true }, 'mountain', { food: 2 });
farm('wool', 'Wool', 24, { k: 'wool', c: 0xf6f2ea }, 'mountain');
farm('cheese', 'Cheese', 30, { k: 'cheese', c: 0xffcf4a }, 'mountain', { food: 2 });
farm('corn', 'Corn', 20, { k: 'corn', c: 0xffd23a }, 'jungle', { food: 1 });
farm('chili', 'Chili', 22, { k: 'chili', c: 0xe8281e }, 'jungle');
farm('sugarcane', 'Sugarcane', 20, { k: 'cane', c: 0x9fcf5a }, 'jungle');
farm('coffee_beans', 'Coffee Beans', 30, { k: 'sack', c: 0x6a3e22 }, 'jungle');
farm('cocoa_beans', 'Cocoa Beans', 32, { k: 'cocoa', c: 0x8a4a22 }, 'jungle');
farm('pineapple', 'Pineapple', 30, { k: 'pineapple', c: 0xf2b93b }, 'jungle', { food: 2 });
farm('banana', 'Banana', 24, { k: 'banana', c: 0xffe066 }, 'jungle', { food: 2 });
farm('rice', 'Rice', 20, { k: 'sack', c: 0xf6f2e6 }, 'jungle');
farm('flour', 'Flour', 10, { k: 'sack', c: 0xfff8ea }, 'all');
farm('sugar', 'Sugar', 12, { k: 'sack', c: 0xffffff }, 'all');
farm('salt', 'Salt', 6, { k: 'jar', c: 0xf2f2f2 }, 'all');
farm('earth_spirit', 'Earth Spirit', 'spirit', null, 'all');
ITEMS.earth_spirit = { ...ITEMS.earth_spirit, cat: 'spirit', price: 40, model: { k: 'spirit', c: 0xc98a3a }, desc: 'Spirit of the fields. Bought from farmers, since nobody grows crops here any more.' };

// ---------------- spirits & lumas ----------------
def('water_spirit', 'Water Spirit', 'spirit', 40, { k: 'spirit', c: 0x3fa9f5 }, { desc: 'Sometimes surfaces while fishing.' });
def('rock_spirit', 'Rock Spirit', 'spirit', 40, { k: 'spirit', c: 0x9a8f86 }, { desc: 'Sometimes found while mining.' });
def('lost_spirit', 'Lost Spirit', 'spirit', 40, { k: 'spirit', c: 0xb07af0 }, { desc: 'Lingers in ruins and old chests.' });
def('nature_spirit', 'Nature Spirit', 'spirit', 40, { k: 'spirit', c: 0x5fd06a }, { desc: 'Rustles out of bushes, flowers and trees.' });
for (const s of ['water', 'rock', 'lost', 'nature', 'earth']) {
  def('luma_life_' + s, 'Luma Life (' + s[0].toUpperCase() + s.slice(1) + ')', 'luma', 60, { k: 'vial', c: ITEMS[s + '_spirit'].model.c }, { spirit: s, desc: 'Pour onto a Mysterious Egg in an Incubator. The spirit decides what kind of Luma hatches.' });
}
def('mysterious_egg', 'Mysterious Egg', 'luma', 0, { k: 'egg_myst' }, { noSell: true, desc: 'Something inside glows softly. Hatch it in an Incubator with Luma Life.' });
def('luma_food', 'Luma Food', 'luma', 10, { k: 'bowl', c: 0xf2a84a, c2: 0x7ad06a }, { desc: 'Feed your Lumas once a day for Luma Energy.' });
def('super_luma_food', 'Super Luma Food', 'luma', 60, { k: 'bowl', c: 0xff7ad8, c2: 0xfff07a }, { desc: 'Instantly grants 3 Luma Energy.' });

// ---------------- treasure, keys, quest items ----------------
def('tool_token', 'Tool Token', 'special', 0, { k: 'token', c: 0x8fd6ff, c2: 0x2a6aa0 }, { noSell: true, desc: 'Used with metal bars to upgrade tools at an anvil.' });
for (const [b, n, c] of [['meadow', 'Meadow', 0x8fd05a], ['forest', 'Forest', 0x3f9a4a], ['mountain', 'Mountain', 0xbfe0ff], ['jungle', 'Jungle', 0xff8a3a]]) {
  def('token_' + b, n + ' Token', 'special', 0, { k: 'token', c, c2: 0xf2c94c }, { noSell: true, desc: `Morel the mushroom merchant accepts these in the ${n.toLowerCase()}.` });
}
def('crystal_meadow', 'Tepid Offering', 'special', 0, { k: 'crystal', c: 0xffd27a }, { noSell: true, desc: 'Place at the Meadow Shrine.' });
def('crystal_forest', 'Verdant Offering', 'special', 0, { k: 'crystal', c: 0x6ff08a }, { noSell: true, desc: 'Place at the Forest Shrine.' });
def('crystal_mountain', 'Frost Offering', 'special', 0, { k: 'crystal', c: 0x9fe4ff }, { noSell: true, desc: 'Place at the Mountain Shrine.' });
def('crystal_jungle', 'Ember Offering', 'special', 0, { k: 'crystal', c: 0xff7a4a }, { noSell: true, desc: 'Place at the Jungle Shrine.' });
def('key_meadow', 'Ancient Key of Sun', 'special', 0, { k: 'key', c: 0xffd27a }, { noSell: true, stack: 1, desc: 'One of four keys to the Great Temple.' });
def('key_forest', 'Ancient Key of Leaf', 'special', 0, { k: 'key', c: 0x6ff08a }, { noSell: true, stack: 1, desc: 'One of four keys to the Great Temple.' });
def('key_mountain', 'Ancient Key of Frost', 'special', 0, { k: 'key', c: 0x9fe4ff }, { noSell: true, stack: 1, desc: 'One of four keys to the Great Temple.' });
def('key_jungle', 'Ancient Key of Ember', 'special', 0, { k: 'key', c: 0xff7a4a }, { noSell: true, stack: 1, desc: 'One of four keys to the Great Temple.' });
def('frozen_tablet', 'Frozen Tablet', 'special', 0, { k: 'tablet', c: 0xbfe8ff }, { noSell: true, desc: 'Three of these open the Summit Sanctum.' });
def('temple_key', 'Small Temple Key', 'special', 0, { k: 'key', c: 0xc9a86a, small: true }, { noSell: true, desc: 'Opens one locked door inside the temple where it was found.' });
def('ancient_book', 'Ancient Book', 'special', 0, { k: 'book', c: 0x6a3ab8 }, { noSell: true, desc: 'Read it to learn forgotten blueprints.' });
def('map_fragment', 'Map Fragment', 'treasure', 8, { k: 'map', c: 0xe9d6a6, frag: true }, { desc: 'Three fragments make a Treasure Map at a Treasure Workbench.' });
def('treasure_map', 'Treasure Map', 'treasure', 30, { k: 'map', c: 0xe9d6a6 }, { desc: 'Use it to mark a buried chest on your map, then dig there.' });
for (const [b, n, c, p] of [['meadow', 'Muddy', 0x8a6a3a, 25], ['forest', 'Mossy', 0x5a7a3a, 50], ['mountain', 'Frosty', 0x8ab0c8, 90], ['jungle', 'Ember', 0x9a4a2a, 150]]) {
  def('coffer_' + b, n + ' Coffer', 'treasure', p, { k: 'chest', c, c2: 0xc9a040 }, { desc: 'Clean it at a Treasure Sink to see what is inside.', tier: b });
}
def('sunken_chest', 'Sunken Chest', 'treasure', 60, { k: 'chest', c: 0x3a6a7a, c2: 0x9ad6c8 }, { desc: 'Pulled from the sea with a magnet. Clean it at a Treasure Sink.', tier: 'sea' });
def('old_coin', 'Old Coin', 'treasure', 20, { k: 'coin', c: 0xc9a040 });
def('silver_goblet', 'Silver Goblet', 'treasure', 60, { k: 'goblet', c: 0xd8dde6 });
def('ancient_doubloon', 'Ancient Doubloon', 'treasure', 80, { k: 'coin', c: 0xf2c94c, big: true });
def('pirate_compass', 'Pirate Compass', 'treasure', 120, { k: 'compass', c: 0xc9a040 });
def('golden_idol', 'Golden Idol', 'treasure', 160, { k: 'idol', c: 0xf2c94c });
def('jeweled_chalice', 'Jeweled Chalice', 'treasure', 300, { k: 'goblet', c: 0xf2c94c, gem: 0xe8344a });

// archaeology
for (const [b, n, c] of [['meadow', 'Sunbaked', 0xc9a06a], ['forest', 'Mossy', 0x7a8a5a], ['mountain', 'Frozen', 0xa8c0d8], ['jungle', 'Ember', 0x8a5a4a]]) {
  def('rubble_' + b, n + ' Rubble', 'relic', 6, { k: 'rubble', c }, { desc: 'Refine it in a Rubble Refiner to recover relic fragments.', tier: b });
  def('fragment_' + b, n + ' Relic Fragment', 'relic', 18, { k: 'shard', c }, { tier: b });
}
const relic = (id, name, price, model, tier) => def(id, name, 'relic', price, model, { tier, desc: 'A restored relic. Collectors pay well for these.' });
relic('clay_figurine', 'Clay Figurine', 95, { k: 'figurine', c: 0xc98a5a }, 'meadow');
relic('sun_tablet', 'Sun Tablet', 125, { k: 'tablet', c: 0xd8b07a }, 'meadow');
relic('wooden_mask', 'Wooden Mask', 230, { k: 'mask', c: 0x8a5a32 }, 'forest');
relic('moss_idol', 'Moss Idol', 270, { k: 'idol', c: 0x6a9a5a }, 'forest');
relic('frost_totem', 'Frost Totem', 430, { k: 'totem', c: 0x9fc8e8 }, 'mountain');
relic('crystal_skull', 'Crystal Skull', 540, { k: 'skull', c: 0xd8f0ff }, 'mountain');
relic('sun_disk', 'Sun Disk', 760, { k: 'disk', c: 0xf2b93b }, 'jungle');
relic('obsidian_mask', 'Obsidian Mask', 920, { k: 'mask', c: 0x2e2638 }, 'jungle');

// monster drops
def('spider_silk', 'Spider Silk', 'resource', 9, { k: 'silk', c: 0xf2f2f8 });
def('ectoplasm', 'Ectoplasm', 'resource', 14, { k: 'jar', c: 0x9fffe0 });
def('bear_fur', 'Bear Fur', 'resource', 20, { k: 'leather', c: 0x6a4a32 });
def('cannon_pod', 'Cannon Pod', 'resource', 16, { k: 'round', c: 0x6aa83a });

// ---------------- meals (Cook) ----------------
const meal = (id, name, price, heal, model, tier) => def(id, name, 'food', price, model, { food: heal, tier, prof: 'cook' });
meal('baked_potato', 'Baked Potato', 28, 3, { k: 'plate', c: 0xc9a06a, c2: 0xfff2b0 }, 1);
meal('tomato_soup', 'Tomato Soup', 55, 4, { k: 'bowl', c: 0xe8433a }, 1);
meal('berry_tart', 'Berry Tart', 50, 3, { k: 'pie', c: 0xe2383f }, 1);
meal('fresh_bread', 'Fresh Bread', 70, 4, { k: 'bread', c: 0xd99a4a }, 1);
meal('carrot_cake', 'Carrot Cake', 95, 5, { k: 'cake', c: 0xf28a2e, c2: 0xfff6e6 }, 1);
meal('pumpkin_pie', 'Pumpkin Pie', 150, 6, { k: 'pie', c: 0xf28a1e }, 2);
meal('mushroom_stew', 'Mushroom Stew', 140, 6, { k: 'bowl', c: 0x9a6a3e }, 2);
meal('onion_soup', 'Onion Soup', 165, 6, { k: 'bowl', c: 0xd9a65a }, 2);
meal('honey_pancakes', 'Honey Pancakes', 160, 6, { k: 'pancakes', c: 0xe8b46a, c2: 0xf2a91e }, 2);
meal('cheese_fondue', 'Cheese Fondue', 280, 8, { k: 'bowl', c: 0xffcf4a }, 3);
meal('apple_strudel', 'Apple Strudel', 300, 8, { k: 'bread', c: 0xe8b46a, c2: 0xffffff }, 3);
meal('borscht', 'Borscht', 260, 8, { k: 'bowl', c: 0x9a1e4a }, 3);
meal('alpine_stew', 'Alpine Stew', 290, 8, { k: 'bowl', c: 0xb07a4a }, 3);
meal('chili_con_corn', 'Chili con Corn', 450, 10, { k: 'bowl', c: 0xc8301e, c2: 0xffd23a }, 4);
meal('jungle_curry', 'Jungle Curry', 480, 10, { k: 'bowl', c: 0xf2a91e, c2: 0xffffff }, 4);
meal('chocolate_cake', 'Chocolate Cake', 600, 10, { k: 'cake', c: 0x6a3a22, c2: 0xff6aa0 }, 4);
meal('tropical_salad', 'Tropical Salad', 420, 10, { k: 'bowl', c: 0xffe066, c2: 0x7ad06a }, 4);

// ---------------- drinks (Brewer) ----------------
const drink = (id, name, price, c, tier) => def(id, name, 'drink', price, { k: 'bottle', c, c2: c }, { food: 1, tier, prof: 'brewer' });
drink('berry_juice', 'Berry Juice', 60, 0xe2383f, 1);
drink('wheat_ale', 'Wheat Ale', 70, 0xf2c96a, 1);
drink('carrot_tonic', 'Carrot Tonic', 70, 0xf28a2e, 1);
drink('honey_mead', 'Honey Mead', 160, 0xf2a91e, 2);
drink('hop_ale', 'Hop Ale', 170, 0xb8d46a, 2);
drink('strawberry_wine', 'Strawberry Wine', 180, 0xf03a6a, 2);
drink('grape_wine', 'Grape Wine', 320, 0x7a2a6a, 3);
drink('apple_cider', 'Apple Cider', 280, 0xf2d06a, 3);
drink('frost_liqueur', 'Frost Liqueur', 300, 0xcfefff, 3);
drink('island_coffee', 'Island Coffee', 420, 0x5a3220, 4);
drink('cocoa_cream', 'Cocoa Cream', 480, 0x9a5a3a, 4);
drink('sunfruit_punch', 'Sunfruit Punch', 450, 0xff9a2a, 4);
drink('cane_spirit', 'Cane Spirit', 500, 0xf6e6c0, 4);

// ---------------- fish dishes (Fisherman) ----------------
const dish = (id, name, price, heal, model, tier) => def(id, name, 'food', price, model, { food: heal, tier, prof: 'fisher' });
dish('grilled_sardine', 'Grilled Sardines', 45, 3, { k: 'plate', c: 0x9fc6e0, c2: 0xf2d35a }, 1);
dish('fish_and_chips', 'Fish & Chips', 85, 4, { k: 'plate', c: 0xe8b46a, c2: 0xf2d35a }, 1);
dish('carp_skewer', 'Carp Skewer', 115, 4, { k: 'skewer', c: 0xf2b93b }, 1);
dish('smoked_trout', 'Smoked Trout', 145, 6, { k: 'plate', c: 0xb8704a, c2: 0x6aa86a }, 2);
dish('pike_pie', 'Pike Pie', 175, 6, { k: 'pie', c: 0xc9a06a }, 2);
dish('ray_stew', 'Ray Stew', 205, 6, { k: 'bowl', c: 0x8fa0c0 }, 2);
dish('salmon_gravlax', 'Salmon Gravlax', 265, 8, { k: 'plate', c: 0xe88a7a, c2: 0xffffff }, 3);
dish('char_chowder', 'Char Chowder', 300, 8, { k: 'bowl', c: 0xf2ead8 }, 3);
dish('eel_rolls', 'Eel Rolls', 345, 8, { k: 'plate', c: 0x9a8aff, c2: 0x3a3a3a }, 3);
dish('koi_sashimi', 'Koi Sashimi', 520, 10, { k: 'plate', c: 0xff8a3a, c2: 0xffffff }, 4);
dish('spicy_piranha', 'Spicy Piranha', 420, 10, { k: 'plate', c: 0xe84a3a, c2: 0x9aa0a8 }, 4);
dish('snapper_platter', 'Lava Snapper Platter', 485, 10, { k: 'plate', c: 0xff5a2a, c2: 0xffd23a }, 4);

// ---------------- smithing (Blacksmith) ----------------
const forged = (id, name, price, model, tier) => def(id, name, 'smithing', price, model, { tier, prof: 'smith' });
forged('horseshoe', 'Lucky Horseshoe', 35, { k: 'horseshoe', c: 0xe0803a }, 1);
forged('copper_kettle', 'Copper Kettle', 60, { k: 'kettle', c: 0xe0803a }, 1);
forged('copper_lantern', 'Copper Lantern', 80, { k: 'lantern', c: 0xe0803a }, 1);
forged('iron_pot', 'Iron Pot', 160, { k: 'pot', c: 0x6a6e78 }, 2);
forged('iron_lantern', 'Iron Lantern', 150, { k: 'lantern', c: 0x8a8e98 }, 2);
forged('iron_shield', 'Iron Shield', 230, { k: 'shield', c: 0xb9bcc4 }, 2);
forged('moonstone_blade', 'Moonstone Blade', 390, { k: 'blade', c: 0xa9b8ff }, 3);
forged('moonstone_helm', 'Moonstone Helm', 430, { k: 'helm', c: 0xa9b8ff }, 3);
forged('volcanic_hammer', 'Volcanic Hammer', 660, { k: 'hammer', c: 0xd8452a }, 4);
forged('volcanic_armor', 'Volcanic Armor', 920, { k: 'armor', c: 0xd8452a }, 4);

// ---------------- jewellery (Jewelrycrafter) ----------------
const jewel = (id, name, price, model, tier) => def(id, name, 'jewelry', price, model, { tier, prof: 'jewel' });
jewel('quartz_pendant', 'Quartz Pendant', 75, { k: 'necklace', c: 0xe0803a, gem: 0xf3f0ff }, 1);
jewel('amethyst_ring', 'Amethyst Ring', 115, { k: 'ring', c: 0xe0803a, gem: 0xa86ad8 }, 1);
jewel('topaz_earrings', 'Topaz Earrings', 195, { k: 'earrings', c: 0xb9bcc4, gem: 0xf2b33b }, 2);
jewel('emerald_brooch', 'Emerald Brooch', 245, { k: 'brooch', c: 0xb9bcc4, gem: 0x3ccf7a }, 2);
jewel('sapphire_necklace', 'Sapphire Necklace', 430, { k: 'necklace', c: 0xa9b8ff, gem: 0x3d6ff0 }, 3);
jewel('pearl_tiara', 'Pearl Tiara', 660, { k: 'tiara', c: 0xa9b8ff, gem: 0xfff6ee }, 3);
jewel('obsidian_amulet', 'Obsidian Amulet', 390, { k: 'necklace', c: 0xd8452a, gem: 0x3a2e48 }, 4);
jewel('ruby_crown', 'Ruby Crown', 980, { k: 'crown', c: 0xf2c94c, gem: 0xe8344a }, 4);

// ---------------- placeables ----------------
const place = (id, name, price, station, extra = {}) => def(id, name, 'placeable', price, { k: 'station', id: station }, { place: station, stack: 10, ...extra });
place('workbench', 'Simple Workbench', 20, 'workbench', { desc: 'Turns raw materials into planks, rope, fabric, leather and more.' });
place('kiln', 'Kiln', 30, 'kiln', { desc: 'Bakes sand and charcoal into glass.' });
place('smelter', 'Ore Smelter', 40, 'smelter', { desc: 'Smelts ore into bars.' });
place('incubator', 'Incubator', 120, 'incubator', { desc: 'Hatches Mysterious Eggs with Luma Life.' });
place('chest', 'Storage Chest', 15, 'chest', { desc: 'Holds 24 stacks. Crafting stations nearby can use what is inside.' });
place('luma_nest', 'Luma Nest', 40, 'luma_nest', { desc: 'Your hatched Lumas gather here to be fed and petted.' });
place('luma_altar', 'Luma Altar', 150, 'luma_altar', { desc: 'Spend Luma Energy on magical items.' });
place('stove', "Cook's Stove", 60, 'stove', { desc: 'Cook profession station.' });
place('cask_meadow', 'Meadow Cask', 50, 'cask_meadow', { desc: 'Brewer station for novice drinks.' });
place('cask_forest', 'Forest Cask', 90, 'cask_forest', { desc: 'Brewer station for skilled drinks.' });
place('cask_mountain', 'Mountain Cask', 150, 'cask_mountain', { desc: 'Brewer station for expert drinks.' });
place('cask_jungle', 'Jungle Cask', 220, 'cask_jungle', { desc: 'Brewer station for master drinks.' });
place('fish_table', 'Fish Prep Table', 60, 'fish_table', { desc: 'Fisherman station.' });
place('forge', 'Forge', 80, 'forge', { desc: 'Blacksmith station.' });
place('gem_cutter', 'Gem Cutter', 70, 'gem_cutter', { desc: 'Jewelrycrafter station for cutting rough gems.' });
place('jeweler_bench', "Jeweler's Bench", 90, 'jeweler_bench', { desc: 'Jewelrycrafter station for setting gems.' });
place('treasure_sink', 'Treasure Sink', 60, 'treasure_sink', { desc: 'Treasure Hunter station for cleaning coffers.' });
place('treasure_bench', 'Treasure Workbench', 70, 'treasure_bench', { desc: 'Treasure Hunter station for maps and magnets.' });
place('rubble_refiner', 'Rubble Refiner', 80, 'rubble_refiner', { desc: 'Archaeologist station for sifting rubble.' });
place('restoration_table', 'Restoration Table', 100, 'restoration_table', { desc: 'Archaeologist station for restoring relics.' });
place('lamp_post', 'Lamp Post', 25, 'lamp_post', { desc: 'Lights up the night.' });
place('fence', 'Wooden Fence', 3, 'fence', { decor: true });
place('flower_pot', 'Flower Pot', 12, 'flower_pot', { decor: true });
place('bench', 'Garden Bench', 20, 'bench', { decor: true });
place('table', 'Wooden Table', 20, 'table', { decor: true });
place('rug', 'Woven Rug', 18, 'rug', { decor: true });
place('hay_bale', 'Hay Bale', 6, 'hay_bale', { decor: true });
place('scarecrow', 'Retired Scarecrow', 30, 'scarecrow', { decor: true, desc: 'No crops to guard any more. It looks relieved.' });
place('luma_statue', 'Luma Statue', 120, 'luma_statue', { decor: true });
place('fountain', 'Garden Fountain', 150, 'fountain', { decor: true });
place('campfire', 'Campfire', 10, 'campfire', { decor: true, light: true });
place('banner', 'Island Banner', 25, 'banner', { decor: true });
place('planter', 'Flower Planter', 30, 'planter', { decor: true });
place('signpost', 'Signpost', 8, 'signpost', { decor: true });

// Luma Altar specials
def('return_charm', 'Return Charm', 'special', 30, { k: 'charm', c: 0x7ad6ff }, { use: 'return', desc: 'Use it to return to your homestead instantly.' });
def('luma_lantern', 'Luma Lantern', 'special', 50, { k: 'lantern', c: 0x7ad6ff, glow: true }, { use: 'lantern', desc: 'Doubles how long you can stay in cave darkness today.' });
def('treasure_compass', 'Treasure Compass', 'special', 40, { k: 'compass', c: 0x7ad6ff }, { use: 'compass', desc: 'Points to the nearest buried treasure.' });
def('heart_crystal', 'Heart Crystal', 'special', 0, { k: 'heart', c: 0xff5a7a }, { use: 'heart', noSell: true, desc: 'Use it to gain one extra heart permanently.' });
def('backpack_upgrade', 'Big Backpack', 'special', 0, { k: 'backpack', c: 0x9a6a3c }, { use: 'backpack', noSell: true, desc: 'Use it to add 10 inventory slots.' });

export function item(id) { return ITEMS[id]; }
export function itemName(id) { return ITEMS[id]?.name ?? id; }
export const FOOD_IDS = Object.values(ITEMS).filter((i) => i.food).map((i) => i.id);
