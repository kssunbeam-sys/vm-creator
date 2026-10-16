// The save-state object. Everything that persists between sessions lives here.
export const SAVE_VERSION = 1;

export function newSave(opts = {}) {
  return {
    version: SAVE_VERSION,
    name: opts.name || 'Traveler',
    look: opts.look || null,
    difficulty: opts.difficulty || 'adventure',   // cozy | adventure | hero
    peaceful: !!opts.peaceful,                     // no monsters at all
    created: Date.now(),
    playtime: 0,
    coins: 150,
    tools: { axe: { tier: 0, lvl: 1 }, pickaxe: { tier: 0, lvl: 1 }, shovel: { tier: 0, lvl: 1 }, rod: { tier: 0, lvl: 1 }, whip: { tier: 0, lvl: 1 }, net: { tier: 0, lvl: 1 } },
    maxHp: 20,
    hp: 20,
    lumaEnergy: 0,
    lumasOwned: 0,
    day: 1,
    minutes: 7 * 60,
    level: 'overworld',
    x: 46, z: 168,
    inv: null,
    invSize: 30,
    world: { nodes: {}, interiors: {} },
    flags: {},
    discovered: { lumenbrook: true },
    fog: null,
    quests: null,
    professions: {},
    permits: 0,
    recipes: [],
    placed: [],
    chests: {},
    lumas: [],
    activeLuma: null,
    eggs: [],
    stats: { fish: {}, relics: {}, caught: {}, crafted: 0, sold: 0, earned: 0 },
    shopsDay: {},
    gates: { bridge: false, lift: false, boat: false },
    offerings: {},
    temples: {},
    bed: null,
  };
}
