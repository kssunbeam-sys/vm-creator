// Luma species. The spirit used to make Luma Life decides which family hatches.
export const ABILITIES = {
  fish: 'Fish bite 30% sooner',
  fishzone: 'Your fishing catch zone is 25% wider',
  bubbles: 'Sunken treasure bubbles appear more often',
  ore: '20% chance of extra ore when mining',
  gem: 'Gems and gold turn up more often',
  pick: 'Your pickaxe hits 2 power harder',
  treasure: 'Sniffs out buried treasure nearby and marks the spot',
  darkness: 'You can stay in cave darkness 60% longer',
  chest: 'Chests and pots give 30% more coins',
  luck: 'Coffers you clean hold better loot',
  forage: '25% chance of extra forage and berries',
  wood: '25% chance of extra wood from trees',
  offering: 'Points the way to the nearest offering crystal',
  regen: 'Slowly restores your hearts',
  speed: 'You move 10% faster',
  heal: 'Food restores 30% more health',
  energy: 'Gives 1 extra Luma Energy when fed',
  light: 'Glows so brightly that caves never go dark around you',
};

export const LUMAS = [
  // water
  { id: 'bubblin', name: 'Bubblin', spirit: 'water', body: 0x7ad6ff, accent: 0x2a8ad8, shape: 'fin', ability: 'fish' },
  { id: 'splashkin', name: 'Splashkin', spirit: 'water', body: 0x5ac8e8, accent: 0xffffff, shape: 'drop', ability: 'fishzone' },
  { id: 'coralette', name: 'Coralette', spirit: 'water', body: 0xff9ab8, accent: 0xff6a8a, shape: 'coral', ability: 'bubbles' },
  { id: 'tidepup', name: 'Tidepup', spirit: 'water', body: 0x4a9ad8, accent: 0xd8f4ff, shape: 'ears', ability: 'speed' },
  // rock
  { id: 'pebblit', name: 'Pebblit', spirit: 'rock', body: 0xb8b0a4, accent: 0xe0803a, shape: 'crystal', ability: 'ore' },
  { id: 'geodie', name: 'Geodie', spirit: 'rock', body: 0x8a8090, accent: 0xb07af0, shape: 'crystal', ability: 'gem' },
  { id: 'cragling', name: 'Cragling', spirit: 'rock', body: 0x9a8a78, accent: 0xf2c94c, shape: 'horns', ability: 'pick' },
  { id: 'dustmole', name: 'Dustmole', spirit: 'rock', body: 0xa88a6a, accent: 0xffd2b0, shape: 'ears', ability: 'treasure' },
  // lost
  { id: 'wispy', name: 'Wispy', spirit: 'lost', body: 0xd8c8ff, accent: 0x9a6aff, shape: 'wisp', ability: 'darkness' },
  { id: 'glimmer', name: 'Glimmerghost', spirit: 'lost', body: 0xe8f0ff, accent: 0x7ad6ff, shape: 'wisp', ability: 'chest' },
  { id: 'lanternette', name: 'Lanternette', spirit: 'lost', body: 0xffe6a8, accent: 0xff9a3a, shape: 'antenna', ability: 'luck' },
  { id: 'echo', name: 'Echo', spirit: 'lost', body: 0xb8a8e8, accent: 0x5a4a9a, shape: 'long', ability: 'treasure' },
  // nature
  { id: 'sproutle', name: 'Sproutle', spirit: 'nature', body: 0x8fd46a, accent: 0x4f9a3a, shape: 'sprout', ability: 'forage' },
  { id: 'barkley', name: 'Barkley', spirit: 'nature', body: 0xa87a4a, accent: 0x6fbf47, shape: 'leaf', ability: 'wood' },
  { id: 'fernet', name: 'Fernet', spirit: 'nature', body: 0x5ab87a, accent: 0xd8ff8a, shape: 'leaf', ability: 'offering' },
  { id: 'petalpuff', name: 'Petalpuff', spirit: 'nature', body: 0xffc8e0, accent: 0xff6aa8, shape: 'flower', ability: 'regen' },
  // earth (spirits bought at markets)
  { id: 'mudsy', name: 'Mudsy', spirit: 'earth', body: 0x9a6a42, accent: 0xe8c48a, shape: 'ears', ability: 'treasure' },
  { id: 'clodhop', name: 'Clodhop', spirit: 'earth', body: 0xc8925a, accent: 0x6a4a2a, shape: 'long', ability: 'speed' },
  { id: 'rootle', name: 'Rootle', spirit: 'earth', body: 0xd8a86a, accent: 0x7ac04a, shape: 'sprout', ability: 'heal' },
  { id: 'sunbun', name: 'Sunbun', spirit: 'earth', body: 0xffd27a, accent: 0xff9a3a, shape: 'long', ability: 'energy' },
  // legendary
  { id: 'lumaria', name: 'Lumaria', spirit: 'great', body: 0xfff6e0, accent: 0x7ad6ff, shape: 'crown', ability: 'light', legendary: true },
];
export const LUMA_BY_ID = Object.fromEntries(LUMAS.map((l) => [l.id, l]));
