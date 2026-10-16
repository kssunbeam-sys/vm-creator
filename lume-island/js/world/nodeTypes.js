// Harvestable node types: which model, which tool, toughness, drops, respawn.
// power = minimum tool power (copper 1-5, iron 6-10, moonstone 11-15, volcanic 16-20).
import { NATURE } from './natureModels.js';

const T = (o) => ({ hp: 3, power: 1, respawn: 2, r: 0, range: 70, scale: [0.9, 1.15], ...o });

export const NODE_TYPES = {
  // trees
  oak: T({ kind: 'tree', build: () => NATURE.oak(), tool: 'axe', hp: 5, drops: [['wood', 3, 4], ['sap', 1, 1, 0.25]], spirit: ['nature', 0.03], respawn: 3, r: 0.5, scale: [0.85, 1.25] }),
  birch: T({ kind: 'tree', build: () => NATURE.birch(), tool: 'axe', hp: 4, drops: [['wood', 2, 4], ['sap', 1, 1, 0.3]], spirit: ['nature', 0.03], respawn: 3, r: 0.38 }),
  bigoak: T({ kind: 'tree', build: () => NATURE.bigoak(), tool: 'axe', hp: 8, power: 4, drops: [['hardwood', 2, 3], ['wood', 1, 2], ['sap', 1, 2, 0.35]], spirit: ['nature', 0.04], respawn: 4, r: 0.75, scale: [0.85, 1.2] }),
  pine: T({ kind: 'tree', build: () => NATURE.pine(false), tool: 'axe', hp: 5, drops: [['wood', 3, 4], ['pinecone', 1, 1, 0.4]], spirit: ['nature', 0.03], respawn: 3, r: 0.45, scale: [0.85, 1.3] }),
  pine_snow: T({ kind: 'tree', build: () => NATURE.pine(true), tool: 'axe', hp: 6, power: 8, drops: [['pinewood', 2, 3], ['wood', 1, 1], ['pinecone', 1, 1, 0.4]], spirit: ['nature', 0.03], respawn: 4, r: 0.45, scale: [0.85, 1.35] }),
  palm: T({ kind: 'tree', build: () => NATURE.palm(), tool: 'axe', hp: 4, drops: [['wood', 2, 4]], spirit: ['nature', 0.03], respawn: 3, r: 0.35, scale: [0.85, 1.2] }),
  jungle: T({ kind: 'tree', build: () => NATURE.jungle(), tool: 'axe', hp: 9, power: 12, drops: [['ironwood', 2, 3], ['wood', 1, 2], ['sap', 1, 2, 0.4]], spirit: ['nature', 0.04], respawn: 4, r: 0.65, range: 80, scale: [0.85, 1.2] }),
  deadtree: T({ kind: 'tree', build: () => NATURE.deadtree(), tool: 'axe', hp: 3, drops: [['wood', 1, 2], ['charcoal', 1, 1, 0.5]], respawn: 3, r: 0.3 }),
  mushtree: T({ kind: 'tree', build: () => NATURE.mushtree(false), tool: 'axe', hp: 4, drops: [['porcini', 1, 2], ['meadow_mushroom', 1, 1, 0.5]], spirit: ['nature', 0.05], respawn: 3, r: 0.4, scale: [0.8, 1.3] }),
  mushtree_glow: T({ kind: 'tree', build: () => NATURE.mushtree(true), tool: 'axe', hp: 4, drops: [['glowcap', 1, 2]], spirit: ['nature', 0.06], respawn: 3, r: 0.4, scale: [0.8, 1.3] }),
  bamboo: T({ kind: 'tree', build: () => NATURE.bamboo(), tool: 'axe', hp: 3, drops: [['bamboo', 3, 4]], respawn: 2, r: 0.5 }),

  // rocks & ores
  rock: T({ kind: 'rock', build: () => NATURE.rock(0xa9a49a), tool: 'pickaxe', hp: 3, drops: [['stone', 2, 4], ['copper_ore', 1, 1, 0.1]], spirit: ['rock', 0.025], r: 0.75, scale: [0.7, 1.15] }),
  rock_mtn: T({ kind: 'rock', build: () => NATURE.rock(0xa4a8b6), tool: 'pickaxe', hp: 4, drops: [['stone', 3, 4], ['iron_ore', 1, 1, 0.12]], spirit: ['rock', 0.025], r: 0.75, scale: [0.7, 1.2] }),
  rock_jungle: T({ kind: 'rock', build: () => NATURE.rock(0x8e7a6a), tool: 'pickaxe', hp: 4, drops: [['stone', 2, 4]], spirit: ['rock', 0.025], r: 0.75 }),
  rock_ash: T({ kind: 'rock', build: () => NATURE.rock(0x4c4240), tool: 'pickaxe', hp: 4, power: 6, drops: [['stone', 2, 3], ['charcoal', 1, 2, 0.6], ['volcanic_ore', 1, 1, 0.15]], spirit: ['rock', 0.03], r: 0.75 }),
  boulder: T({ kind: 'rock', build: () => NATURE.boulder(0x9a968e), tool: 'pickaxe', hp: 8, power: 6, drops: [['stone', 6, 8], ['gold_nugget', 1, 1, 0.1]], spirit: ['rock', 0.05], respawn: 3, r: 1.5, range: 80 }),
  ore_copper: T({ kind: 'rock', build: () => NATURE.ore(0x8d8780, 0xe0803a), tool: 'pickaxe', hp: 4, power: 1, drops: [['copper_ore', 2, 3], ['stone', 1, 1]], spirit: ['rock', 0.03], respawn: 3, r: 0.75 }),
  ore_iron: T({ kind: 'rock', build: () => NATURE.ore(0x7d7470, 0xd9cbb8), tool: 'pickaxe', hp: 5, power: 4, drops: [['iron_ore', 2, 3], ['stone', 1, 1]], spirit: ['rock', 0.03], respawn: 3, r: 0.75 }),
  ore_moonstone: T({ kind: 'rock', build: () => NATURE.ore(0x6e7186, 0xb9c8ff, true), tool: 'pickaxe', hp: 6, power: 8, drops: [['moonstone_ore', 2, 3], ['stone', 1, 1]], spirit: ['rock', 0.035], respawn: 3, r: 0.75 }),
  ore_volcanic: T({ kind: 'rock', build: () => NATURE.ore(0x3a3030, 0xff5a2a, true), tool: 'pickaxe', hp: 7, power: 12, drops: [['volcanic_ore', 2, 3], ['charcoal', 1, 1, 0.5]], spirit: ['rock', 0.04], respawn: 3, r: 0.75 }),
  ore_gold: T({ kind: 'rock', build: () => NATURE.ore(0x8a8278, 0xf2c94c), tool: 'pickaxe', hp: 6, power: 6, drops: [['gold_nugget', 1, 2], ['stone', 1, 1]], spirit: ['rock', 0.04], respawn: 4, r: 0.75 }),
  coal: T({ kind: 'rock', build: () => NATURE.ore(0x5a5550, 0x1e1a1a), tool: 'pickaxe', hp: 3, drops: [['charcoal', 2, 3], ['stone', 1, 1, 0.5]], spirit: ['rock', 0.02], respawn: 1, r: 0.75 }),
  gem_quartz: T({ kind: 'rock', build: () => NATURE.gem(0xf3f0ff), tool: 'pickaxe', hp: 4, power: 2, drops: [['rough_quartz', 1, 2]], spirit: ['rock', 0.04], respawn: 1, r: 0.6 }),
  gem_amethyst: T({ kind: 'rock', build: () => NATURE.gem(0xa86ad8), tool: 'pickaxe', hp: 4, power: 2, drops: [['rough_amethyst', 1, 2]], spirit: ['rock', 0.04], respawn: 1, r: 0.6 }),
  gem_topaz: T({ kind: 'rock', build: () => NATURE.gem(0xf2b33b), tool: 'pickaxe', hp: 5, power: 5, drops: [['rough_topaz', 1, 2]], spirit: ['rock', 0.04], respawn: 1, r: 0.6 }),
  gem_emerald: T({ kind: 'rock', build: () => NATURE.gem(0x3ccf7a), tool: 'pickaxe', hp: 5, power: 5, drops: [['rough_emerald', 1, 2]], spirit: ['rock', 0.04], respawn: 1, r: 0.6 }),
  gem_sapphire: T({ kind: 'rock', build: () => NATURE.gem(0x3d6ff0), tool: 'pickaxe', hp: 6, power: 9, drops: [['rough_sapphire', 1, 2]], spirit: ['rock', 0.05], respawn: 1, r: 0.6 }),
  gem_diamond: T({ kind: 'rock', build: () => NATURE.gem(0xe8fbff), tool: 'pickaxe', hp: 7, power: 10, drops: [['rough_diamond', 1, 1]], spirit: ['rock', 0.05], respawn: 1, r: 0.6 }),
  gem_obsidian: T({ kind: 'rock', build: () => NATURE.gem(0x4a3a5e), tool: 'pickaxe', hp: 7, power: 12, drops: [['rough_obsidian', 1, 2]], spirit: ['rock', 0.05], respawn: 1, r: 0.6 }),
  gem_ruby: T({ kind: 'rock', build: () => NATURE.gem(0xe8344a), tool: 'pickaxe', hp: 8, power: 13, drops: [['rough_ruby', 1, 2]], spirit: ['rock', 0.05], respawn: 1, r: 0.6 }),
  icecrystal: T({ kind: 'rock', build: () => NATURE.icecrystal(), tool: 'pickaxe', hp: 3, power: 3, drops: [['ice_crystal', 1, 2]], respawn: 3, r: 0.5 }),

  // bushes & forage (pick with E / Use)
  bush_red: T({ kind: 'bush', build: () => NATURE.bush(0xe2383f), pick: true, drops: [['red_berry', 2, 4]], spirit: ['nature', 0.03], r: 0.6, fruitOnly: true }),
  bush_blue: T({ kind: 'bush', build: () => NATURE.bush(0x3f5fd6), pick: true, drops: [['blueberry', 2, 4]], spirit: ['nature', 0.03], r: 0.6, fruitOnly: true }),
  bush_frost: T({ kind: 'bush', build: () => NATURE.bush(0xdff3ff), pick: true, drops: [['frostberry', 2, 4]], spirit: ['nature', 0.03], r: 0.6, fruitOnly: true }),
  bush_sun: T({ kind: 'bush', build: () => NATURE.bush(0xffb21f), pick: true, drops: [['sunberry', 2, 3]], spirit: ['nature', 0.03], r: 0.6, fruitOnly: true }),
  flower_daisy: T({ kind: 'plant', build: () => NATURE.flower(0xffffff, 0xffd43b), pick: true, drops: [['daisy', 1, 2]], spirit: ['nature', 0.02], respawn: 1, range: 45 }),
  flower_poppy: T({ kind: 'plant', build: () => NATURE.flower(0xf0483e, 0x2b2b2b), pick: true, drops: [['poppy', 1, 2]], spirit: ['nature', 0.02], respawn: 1, range: 45 }),
  flower_bluebell: T({ kind: 'plant', build: () => NATURE.flower(0x6f86f0, 0xdfe6ff), pick: true, drops: [['bluebell', 1, 2]], spirit: ['nature', 0.02], respawn: 1, range: 45 }),
  flower_edelweiss: T({ kind: 'plant', build: () => NATURE.flower(0xf6f6ee, 0xd8d36b), pick: true, drops: [['edelweiss', 1, 1]], spirit: ['nature', 0.02], respawn: 1, range: 45 }),
  flower_orchid: T({ kind: 'plant', build: () => NATURE.flower(0xe36bd8, 0xfff07a), pick: true, drops: [['orchid', 1, 1]], spirit: ['nature', 0.02], respawn: 1, range: 45 }),
  mush_meadow: T({ kind: 'plant', build: () => NATURE.mushrooms(0xf3e3c8, 0xfff6e8), pick: true, drops: [['meadow_mushroom', 1, 2]], respawn: 1, range: 45 }),
  mush_porcini: T({ kind: 'plant', build: () => NATURE.mushrooms(0x9a5a2e), pick: true, drops: [['porcini', 1, 2]], respawn: 1, range: 45 }),
  mush_glow: T({ kind: 'plant', build: () => NATURE.mushrooms(0x56d6c8, 0xe6fff9, true), pick: true, drops: [['glowcap', 1, 1]], respawn: 1, range: 50 }),
  mush_snow: T({ kind: 'plant', build: () => NATURE.mushrooms(0xf7fbff, 0xbfd2e6), pick: true, drops: [['snowcap', 1, 2]], respawn: 1, range: 45 }),
  mush_ember: T({ kind: 'plant', build: () => NATURE.mushrooms(0xff6a2a, 0xffe0b0, true), pick: true, drops: [['ember_shroom', 1, 1]], respawn: 1, range: 50 }),
  tallgrass: T({ kind: 'plant', build: () => NATURE.tallgrass(0x7cc04a), pick: true, anyTool: true, drops: [['fiber', 1, 3]], respawn: 1, range: 50 }),
  tallgrass_alpine: T({ kind: 'plant', build: () => NATURE.tallgrass(0x9ab86a), pick: true, anyTool: true, drops: [['fiber', 1, 3]], respawn: 1, range: 50 }),
  tallgrass_jungle: T({ kind: 'plant', build: () => NATURE.tallgrass(0x3fae55), pick: true, anyTool: true, drops: [['fiber', 2, 3]], respawn: 1, range: 50 }),
  shell: T({ kind: 'plant', build: () => NATURE.shell(), pick: true, drops: [['seashell', 1, 2], ['conch', 1, 1, 0.08], ['coral', 1, 1, 0.04]], respawn: 1, range: 45 }),
  sandpile: T({ kind: 'dig', build: () => NATURE.sandpile(), tool: 'pickaxe', alt: 'shovel', hp: 2, drops: [['sand', 2, 3]], respawn: 1, range: 50 }),
  driftwood: T({ kind: 'plant', build: () => NATURE.driftwood(), pick: true, drops: [['wood', 2, 3]], respawn: 2, range: 55 }),
  shiny: T({ kind: 'dig', build: () => NATURE.shiny(), tool: 'shovel', hp: 1, drops: [['tool_token', 1, 1, 0.65], ['$', 5, 20], ['map_fragment', 1, 1, 0.25], ['lost_spirit', 1, 1, 0.05]], respawn: 3, range: 55 }),
  rubble_meadow: T({ kind: 'dig', build: () => NATURE.rubble(0xc9a06a), tool: 'shovel', hp: 2, drops: [['rubble_meadow', 1, 2], ['stone', 1, 1]], respawn: 3, range: 55 }),
  rubble_forest: T({ kind: 'dig', build: () => NATURE.rubble(0x7a8a5a), tool: 'shovel', hp: 2, drops: [['rubble_forest', 1, 2], ['stone', 1, 1]], respawn: 3, range: 55 }),
  rubble_mountain: T({ kind: 'dig', build: () => NATURE.rubble(0xa8c0d8), tool: 'shovel', hp: 2, drops: [['rubble_mountain', 1, 2], ['stone', 1, 1]], respawn: 3, range: 55 }),
  rubble_jungle: T({ kind: 'dig', build: () => NATURE.rubble(0x8a5a4a), tool: 'shovel', hp: 2, drops: [['rubble_jungle', 1, 2], ['stone', 1, 1]], respawn: 3, range: 55 }),

  // breakables (whip, any tool)
  pot: T({ kind: 'break', build: () => NATURE.pot(0xc9804a), anyTool: true, hp: 1, drops: [['$', 3, 12], ['tool_token', 1, 1, 0.12], ['map_fragment', 1, 1, 0.12], ['lost_spirit', 1, 1, 0.05]], respawn: 1, r: 0.4, range: 55 }),
  pot_blue: T({ kind: 'break', build: () => NATURE.pot(0x5a8ac8), anyTool: true, hp: 1, drops: [['$', 5, 15], ['tool_token', 1, 1, 0.15], ['map_fragment', 1, 1, 0.12], ['lost_spirit', 1, 1, 0.06]], respawn: 1, r: 0.4, range: 55 }),
  crate: T({ kind: 'break', build: () => NATURE.crate(), anyTool: true, hp: 2, drops: [['$', 4, 14], ['wood', 1, 2], ['tool_token', 1, 1, 0.1], ['map_fragment', 1, 1, 0.1]], respawn: 2, r: 0.6, range: 55 }),
  barrel: T({ kind: 'break', build: () => NATURE.barrel(), anyTool: true, hp: 2, drops: [['$', 4, 14], ['plank', 1, 1, 0.5], ['tool_token', 1, 1, 0.1]], respawn: 2, r: 0.5, range: 55 }),

  // decoration only
  fern: T({ kind: 'decor', build: () => NATURE.fern(0x3f9a3e), decor: true, range: 45 }),
  fern_jungle: T({ kind: 'decor', build: () => NATURE.fern(0x2fa04a), decor: true, range: 45, scale: [1, 1.5] }),
  bigleaf: T({ kind: 'decor', build: () => NATURE.bigleaf(), decor: true, range: 55, scale: [0.9, 1.5] }),
  reeds: T({ kind: 'decor', build: () => NATURE.reeds(), decor: true, range: 45 }),
  lilypad: T({ kind: 'decor', build: () => NATURE.lilypad(), decor: true, range: 45, water: true }),
  pebbles: T({ kind: 'decor', build: () => NATURE.pebbles(0xa8a49c), decor: true, range: 40 }),
  pebbles_mtn: T({ kind: 'decor', build: () => NATURE.pebbles(0xb8bcc8), decor: true, range: 40 }),
  pebbles_ash: T({ kind: 'decor', build: () => NATURE.pebbles(0x4a403e), decor: true, range: 40 }),
  log: T({ kind: 'decor', build: () => NATURE.log(), decor: true, box: [1.25, 0.35], range: 60 }),
};

// Decorative copies of trees for towns (cannot be chopped)
for (const t of ['oak', 'birch', 'bigoak', 'pine', 'pine_snow', 'palm', 'jungle', 'mushtree_glow']) {
  NODE_TYPES[t + '_town'] = { ...NODE_TYPES[t], decor: true, drops: [] };
}
