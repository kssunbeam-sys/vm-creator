// Hand-placed world layout. North is -z. Coordinates are world units.
// The island: Meadow (start, centre/south-east), Forest (west, across the river),
// Mountains (north plateau above the cliffs, reached by the Old Lift) and the
// Jungle island (east, reached by boat).

export const BIOMES = {
  meadow:   { id: 1, name: 'Sunny Meadow', short: 'Meadow',   tier: 0, token: 'token_meadow' },
  forest:   { id: 2, name: 'Whispering Forest', short: 'Forest', tier: 1, token: 'token_forest' },
  mountain: { id: 3, name: 'Frostcrown Mountains', short: 'Mountains', tier: 2, token: 'token_mountain' },
  jungle:   { id: 4, name: 'Emberleaf Jungle', short: 'Jungle', tier: 3, token: 'token_jungle' },
};
export const BIOME_BY_ID = [null, 'meadow', 'forest', 'mountain', 'jungle'];

export const ISLAND_BLOBS = [
  { x: -80, z: 40, rx: 200, rz: 175, part: 'main' },
  { x: -80, z: -170, rx: 210, rz: 115, part: 'main' },
  { x: 40, z: 120, rx: 105, rz: 95, part: 'main' },
  { x: 245, z: -40, rx: 82, rz: 125, part: 'jungle' },
];

export const CITIES = {
  lumenbrook: { id: 'lumenbrook', name: 'Lumenbrook', biome: 'meadow', x: 55, z: 122, r: 40 },
  mossvale:   { id: 'mossvale',   name: 'Mossvale',   biome: 'forest', x: -170, z: 58, r: 36 },
  frostpeak:  { id: 'frostpeak',  name: 'Frostpeak',  biome: 'mountain', x: -62, z: -188, r: 36 },
  tikora:     { id: 'tikora',     name: 'Tikora',     biome: 'jungle', x: 232, z: 14, r: 36 },
};

export const HOMESTEAD = { x: 2, z: 52, r: 22 };

export const BRIDGE = { z: 62, halfLen: 16, halfW: 2.4, deck: 2.4 };
export const LIFT = { x: -150 };
export const VOLCANO = { x: 272, z: -98, r: 62 };

export const DOCKS = {
  lumenbrook: { x: 55, z: 196, dir: 1, to: 'tikora' },   // pier runs south (+z)
  tikora:     { x: 176, z: 6, dir: -1, to: 'lumenbrook', axis: 'x' }, // pier runs west (-x)
};

// Interior entrances placed in the overworld
export const SITES = [
  // Meadow
  { id: 'cave_meadow', kind: 'cave', biome: 'meadow', name: 'Copperhollow Cave', x: 72, z: -58 },
  { id: 't_meadow', kind: 'temple', biome: 'meadow', name: 'Sunken Garden Temple', x: -6, z: -42, main: true },
  { id: 'ruin_meadow', kind: 'ruin', biome: 'meadow', name: 'Meadow Crystal Ruin', x: 94, z: 30 },
  { id: 'shrine_meadow', kind: 'shrine', biome: 'meadow', name: 'Meadow Shrine', x: 40, z: 0 },
  // Forest
  { id: 'cave_forest', kind: 'cave', biome: 'forest', name: 'Ironroot Cave', x: -230, z: -38 },
  { id: 't_forest1', kind: 'temple', biome: 'forest', name: 'Mossy Temple', x: -122, z: 158 },
  { id: 't_forest', kind: 'temple', biome: 'forest', name: 'Ancient Grove Temple', x: -232, z: 100, main: true },
  { id: 'ruin_forest', kind: 'ruin', biome: 'forest', name: 'Forest Crystal Ruin', x: -108, z: -48 },
  { id: 'shrine_forest', kind: 'shrine', biome: 'forest', name: 'Forest Shrine', x: -96, z: 104 },
  // Mountains
  { id: 'cave_mountain', kind: 'cave', biome: 'mountain', name: 'Moonstone Grotto', x: -214, z: -214 },
  { id: 't_mtn1', kind: 'temple', biome: 'mountain', name: 'Forgotten Peak Temple', x: -196, z: -150, tablet: true },
  { id: 't_mtn2', kind: 'temple', biome: 'mountain', name: 'Forsaken Ice Temple', x: 48, z: -214, tablet: true },
  { id: 't_mtn3', kind: 'temple', biome: 'mountain', name: 'Frozen Echo Temple', x: -120, z: -254, tablet: true },
  { id: 't_mountain', kind: 'temple', biome: 'mountain', name: 'Summit Sanctum', x: -4, z: -140, main: true, needsTablets: 3 },
  { id: 'ruin_mountain', kind: 'ruin', biome: 'mountain', name: 'Mountain Crystal Ruin', x: 74, z: -150 },
  { id: 'shrine_mountain', kind: 'shrine', biome: 'mountain', name: 'Mountain Shrine', x: -150, z: -206 },
  // Jungle
  { id: 'cave_jungle', kind: 'cave', biome: 'jungle', name: 'Ember Depths', x: 224, z: -106 },
  { id: 't_jungle1', kind: 'temple', biome: 'jungle', name: 'Vine Temple', x: 290, z: 44 },
  { id: 't_jungle', kind: 'temple', biome: 'jungle', name: 'Sun Temple', x: 196, z: -74, main: true },
  { id: 'ruin_jungle', kind: 'ruin', biome: 'jungle', name: 'Jungle Crystal Ruin', x: 236, z: 62 },
  { id: 'shrine_jungle', kind: 'shrine', biome: 'jungle', name: 'Jungle Shrine', x: 290, z: -12 },
];

// Roads and trails: [width, [x,z], [x,z], ...]
export const PATHS = [
  // Meadow
  [3.6, [55, 122], [26, 100], [6, 72], [-14, 63], [-24, 62]],
  [3.6, [55, 122], [55, 196]],
  [3.0, [55, 122], [50, 62], [40, 0], [12, -26], [-6, -42]],
  [2.6, [40, 0], [60, -34], [72, -58]],
  [2.6, [55, 122], [84, 80], [94, 30]],
  [2.6, [6, 72], [2, 52]],
  // Forest
  [3.4, [-60, 62], [-100, 64], [-170, 58]],
  [3.0, [-170, 58], [-162, 0], [-150, -78]],
  [2.6, [-170, 58], [-210, 84], [-232, 100]],
  [2.6, [-170, 58], [-140, 120], [-122, 158]],
  [2.6, [-170, 58], [-205, 10], [-230, -38]],
  [2.4, [-100, 64], [-96, 104]],
  [2.4, [-162, 0], [-108, -48]],
  // Mountains
  [3.0, [-150, -112], [-112, -150], [-62, -188]],
  [2.6, [-62, -188], [-30, -160], [-4, -140]],
  [2.6, [-62, -188], [0, -205], [48, -214]],
  [2.6, [-62, -188], [-95, -230], [-120, -254]],
  [2.6, [-112, -150], [-196, -150]],
  [2.4, [-196, -150], [-150, -206], [-214, -214]],
  [2.4, [-4, -140], [74, -150]],
  // Jungle
  [3.4, [176, 6], [232, 14]],
  [2.6, [232, 14], [265, 30], [290, 44]],
  [2.6, [232, 14], [236, 62]],
  [2.6, [232, 14], [290, -12]],
  [2.6, [232, 14], [212, -40], [196, -74]],
  [2.4, [212, -40], [224, -106]],
];
