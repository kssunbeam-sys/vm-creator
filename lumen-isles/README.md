# Lumen Isles

A cozy island adventure in the spirit of Luma Island, but with **no farming**:
anything you would normally grow can simply be bought from grocers in every
town. It runs in the browser with no build step and no dependencies.

## Play

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari).
Double-clicking the file works. You can also serve the folder:

```bash
cd lumen-isles
python3 -m http.server 8000   # then visit http://localhost:8000
```

Your progress is saved in the browser automatically. It saves every 45
seconds, when you sleep and when you close the tab. You can also save from
**Settings**.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Move (hold **Shift** to run) |
| Space / E / Click | Interact with whatever you face: talk, chop, mine, fish, catch, open, pet... |
| R | Pick up furniture (inside your cottage) |
| F | Quick-eat a snack |
| T | Waystone travel |
| I · Q · M · P · K · C | Bag · Quests · Map · Pets · Skills · Collection |
| Esc | Close menus / open Settings |

On touch screens, a joystick and an action button appear.

You never switch tools. The right one is used automatically: an axe on trees,
a pickaxe on rocks, a rod on bubbling water, a net on critters, and so on.

## What's in the game

- **Seven biomes, seven towns.** Willowmere (meadow), Coral Cove (coast),
  Frostbell (snow), Mosslight (glowing mushroom woods), Canopy Hollow (jungle),
  Sunspire Oasis (desert) and Emberforge (volcano). Each town has its own
  villagers, shops, quests, notice board, centrepiece and building style.
  There are 34 villagers and 60 quests.
- **Waystones.** Touch one once and you can teleport back to it from anywhere,
  using the travel menu (T) or by clicking it on the map. Every town, temple
  and mine has one.
- **Temples.** Each biome has a temple with push-block, brazier, crystal,
  key and (optionally) combat rooms. Every temple holds a Lumen Shard and a
  Glimmer egg. Collect all seven shards to relight the Lumen Lighthouse.
- **Mines.** Four mines with endless, freshly generated levels every day.
  Deeper levels have richer ore and gems.
- **Professions.** Buy licences for Miner, Fisher, Archaeologist, Critter
  Keeper, Chef, Blacksmith, Carpenter and Explorer. Each one levels up to 10.
- **Pets.** Adopt cats, dogs, bunnies, hedgehogs, red pandas and capybaras.
  There is also a stray in every biome (a fox, otter, penguin, axolotl, frog,
  fennec fox and salamander) that you can befriend with a Pet Treat. Pets
  follow you, love being petted, play, wear accessories and bring you little
  gifts.
- **Glimmers.** Small glowing companions that hatch from temple eggs. Each
  one gives a small perk.
- **More to do.** Fishing minigame, bug catching, archaeology and relic
  cleaning, cooking (22 recipes), smelting, furniture crafting, decorating
  your cottage (which can be expanded twice), a museum with milestone
  rewards, treasure chests and treasure maps, friendship and gifts, inns,
  hats and a wardrobe.

## Cozy by design

- **No punishing end of day.** Nothing happens at midnight. Stay up as late as
  you like, and sleep in any bed or inn only if you want to skip to morning.
  In Settings you can choose the day length or freeze time completely.
- **Enemies are optional.** Choose *Peaceful* when you start, or switch any
  time in Settings. With enemies on, fainting just sends you back to the last
  Waystone. You never lose anything.
- **No stamina and no inventory limits.**

## Code layout

| File | Purpose |
| --- | --- |
| `js/util.js` | Seeded RNG, value noise, DOM helpers |
| `js/data.js` | All content: items, fish, critters, recipes, shops, towns, villagers, quests |
| `js/art.js` | Procedural pixel-art tiles, sprites, characters, pets, glimmers, enemies |
| `js/world.js` | Map class and generators for the island, cottage, temples and mines |
| `js/systems.js` | Inventory, professions, quests, pets, loot, museum, save/load |
| `js/audio.js` | Synthesized sound effects and generative per-biome music |
| `js/game.js` | Game loop, movement, interactions, puzzles, fishing, combat, lighting, rendering |
| `js/ui.js` | HUD, dialogue, shops, crafting, journal tabs, map, title screen |
| `js/main.js` | Keyboard, mouse and touch input, plus startup |

The island is generated from a seed. You can enter a seed when you start a new
game, or leave it blank for a random island.
