// The seven professions. Buy a permit from Tobias at the Guild Hall, then learn
// from your mentor. Each lesson you complete raises your profession level and
// unlocks new recipes (Novice → Skilled → Expert → Master tiers follow the biomes).
export const PROFESSIONS = {
  cook: {
    name: 'Cook', mentor: 'paolo', difficulty: 1, color: 0xe0644b, stations: ['stove'],
    blurb: 'Turn market produce, fish and forage into hearty meals that heal and sell well.',
    tasks: [
      { need: [['baked_potato', 3]], text: 'Start simple. Bake me three potatoes on your new stove.' },
      { need: [['tomato_soup', 2], ['fresh_bread', 1]], text: 'Soup and bread, the bones of any kitchen.' },
      { need: [['carrot_cake', 2]], text: 'Something sweet now. Two carrot cakes, please!' },
      { need: [['pumpkin_pie', 1], ['mushroom_stew', 1]], text: 'Forest flavours! Pumpkins and porcini from Mossvale.' },
      { need: [['honey_pancakes', 2]], text: 'Honey pancakes. The Mossvale market sells honey.' },
      { need: [['cheese_fondue', 1], ['apple_strudel', 1]], text: 'Mountain cuisine. Frostpeak cheese and apples.' },
      { need: [['chili_con_corn', 2]], text: 'Spice! Tikora has the best chilies on the island.' },
    ],
  },
  brewer: {
    name: 'Brewer', mentor: 'gus', difficulty: 1, color: 0x3fb1a8, stations: ['cask_meadow', 'cask_forest', 'cask_mountain', 'cask_jungle'],
    blurb: 'Brew juices, ales and wines in casks. Slow, but very profitable.',
    tasks: [
      { need: [['berry_juice', 2]], text: 'Every brewer starts with berry juice. Two bottles, please.' },
      { need: [['carrot_tonic', 2]], text: 'Carrot tonic. Odd, but the townsfolk love it.' },
      { need: [['wheat_ale', 3]], text: 'Now a proper ale. Three wheat ales!' },
      { need: [['honey_mead', 2]], text: 'Build a Forest Cask and brew some honey mead.' },
      { need: [['strawberry_wine', 2]], text: 'Strawberry wine, sweet and pink.' },
      { need: [['grape_wine', 2]], text: 'A Mountain Cask and Frostpeak grapes make fine wine.' },
      { need: [['island_coffee', 2]], text: 'The jungle beans make a brew that wakes the dead.' },
    ],
  },
  treasure: {
    name: 'Treasure Hunter', mentor: 'morwen', difficulty: 1, color: 0xf2b03b, stations: ['treasure_sink', 'treasure_bench'],
    blurb: 'Dig up buried coffers, fish up sunken chests and clean them for valuables. Comes with a loyal treasure-sniffing pup.',
    tasks: [
      { need: [['old_coin', 3]], text: 'Dig up a coffer, clean it at a Treasure Sink and bring me three old coins.' },
      { need: [['treasure_map', 1]], text: 'Three map fragments make a treasure map. Show me one.' },
      { need: [['silver_goblet', 2]], text: 'Silver goblets. Forest coffers and sunken chests hold them.' },
      { need: [['sunken_chest', 1]], text: 'Cast a magnet into bubbling sea water and haul up a sunken chest.' },
      { need: [['golden_idol', 1]], text: 'A golden idol! Mountain coffers hide them.' },
      { need: [['ancient_doubloon', 2]], text: 'Two ancient doubloons for my collection.' },
      { need: [['jeweled_chalice', 1]], text: 'The jeweled chalice. The greatest prize of the jungle.' },
    ],
  },
  smith: {
    name: 'Blacksmith', mentor: 'ingrid', difficulty: 2, color: 0x6d7b8c, stations: ['forge'],
    blurb: 'Smelt ore into bars and hammer them into kettles, lanterns, shields and blades. Upgrades cost you less.',
    tasks: [
      { need: [['copper_bar', 5]], text: 'Every smith begins at the smelter. Five copper bars.' },
      { need: [['copper_kettle', 2]], text: 'Two copper kettles. Hammer gently!' },
      { need: [['copper_lantern', 2]], text: 'Lanterns need glass from a kiln.' },
      { need: [['iron_pot', 2]], text: 'Iron is tougher. Two iron pots.' },
      { need: [['iron_shield', 1]], text: 'A shield worth carrying.' },
      { need: [['moonstone_blade', 1]], text: 'Moonstone sings when you strike it. Forge a blade.' },
      { need: [['volcanic_hammer', 1]], text: 'The volcanic hammer. A masterpiece.' },
    ],
  },
  fisher: {
    name: 'Fisherman', mentor: 'finn', difficulty: 2, color: 0x4e8fd1, stations: ['fish_table'],
    blurb: 'Catch fish across the island and prepare them into fine dishes. Bait helps.',
    tasks: [
      { need: [['sunny_sardine', 3]], text: 'Bring me three sunny sardines, fresh from the sea.' },
      { need: [['fish_and_chips', 2]], text: 'Fish and chips! Potatoes are at the market.' },
      { need: [['gilded_carp', 1], ['carp_skewer', 1]], text: 'The gilded carp is shy. Catch one for me, and skewer another.' },
      { need: [['smoked_trout', 2]], text: 'Forest trout, smoked over hardwood.' },
      { need: [['ray_stew', 1], ['pike_pie', 1]], text: 'Ray stew and pike pie.' },
      { need: [['char_chowder', 2]], text: 'Mountain char chowder warms the bones.' },
      { need: [['spicy_piranha', 2]], text: 'Piranhas bite back. Make them spicy.' },
    ],
  },
  jewel: {
    name: 'Jewelrycrafter', mentor: 'opal', difficulty: 2, color: 0x8f63c9, stations: ['gem_cutter', 'jeweler_bench'],
    blurb: 'Mine rough gems deep in the caves, cut them and set them into rings, necklaces and crowns.',
    tasks: [
      { need: [['cut_quartz', 3]], text: 'Cut three quartz stones. Patience makes them sparkle.' },
      { need: [['quartz_pendant', 1], ['amethyst_ring', 1]], text: 'A pendant and a ring.' },
      { need: [['amethyst_ring', 2]], text: 'Two more amethyst rings. They sell beautifully.' },
      { need: [['topaz_earrings', 2]], text: 'Topaz earrings, set in iron.' },
      { need: [['emerald_brooch', 1]], text: 'An emerald brooch with a touch of gold.' },
      { need: [['sapphire_necklace', 1]], text: 'A sapphire necklace. Moonstone makes the chain.' },
      { need: [['obsidian_amulet', 1]], text: 'Obsidian from the volcano. An amulet!' },
    ],
  },
  arch: {
    name: 'Archaeologist', mentor: 'ilsa', difficulty: 3, color: 0xb8763a, stations: ['rubble_refiner', 'restoration_table'],
    blurb: 'Dig ancient rubble from ruins, caves and temples, refine it into fragments and restore lost relics. The hardest path.',
    tasks: [
      { need: [['fragment_meadow', 3]], text: 'Refine rubble from the meadow into fragments. Three, please.' },
      { need: [['clay_figurine', 1], ['sun_tablet', 1]], text: 'Restore a figurine and a sun tablet.' },
      { need: [['wooden_mask', 1]], text: 'The forest people carved masks. Restore one.' },
      { need: [['moss_idol', 1]], text: 'A moss idol. Careful, it is fragile.' },
      { need: [['frost_totem', 1]], text: 'Frozen rubble holds frost totems.' },
      { need: [['crystal_skull', 1]], text: 'The crystal skull. Legends speak of it.' },
      { need: [['sun_disk', 1]], text: 'The Sun Disk of Tikora. The last piece of the story.' },
    ],
  },
};
export const PROF_IDS = Object.keys(PROFESSIONS);
export const PERMIT_COSTS = [0, 500, 3000, 10000, 20000, 30000, 45000];
export const LEVEL_TITLES = ['', 'Novice', 'Novice', 'Novice', 'Skilled', 'Skilled', 'Expert', 'Master', 'Grand Master'];
