# Lume Island

A cosy 3D island adventure that runs in the browser. It is a fan-made homage
to *Luma Island*: the same kind of game loop (gather, craft, pick
professions, solve temple puzzles, hatch Luma companions and explore four
biomes) with original, procedurally built low-poly art.

Lume Island makes three changes to the formula:

- **No farming.** There are no fields, crops or animals to tend. Every farm
  good (wheat, eggs, milk, cheese, coffee beans, Earth Spirits and so on) is
  bought at the market in each town.
- **A main town in every biome.** Lumenbrook (Sunny Meadow), Mossvale
  (Whispering Forest), Frostpeak (Frostcrown Mountains) and Tikora
  (Emberleaf Jungle). Each has its own market, smith, inn, shops, request
  board and waystone.
- **Peaceful mode.** Tick it when you start a new game, or switch it on or
  off at any time in Settings. All monsters disappear from the island, the
  caves and the temples.

## Running it

The game is plain HTML, CSS and JavaScript modules. There is no build step,
but browsers only load modules over HTTP, so serve the folder:

```sh
cd lume-island
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The page loads three.js r160 from
jsDelivr and two Google Fonts, so it needs an internet connection the first
time. Saves are kept in the browser's local storage (three slots).

## Controls

| Action | Keyboard and mouse | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | Left thumb stick |
| Run | Shift (or turn on *Always run*) | Push the stick all the way |
| Use the tool in your hand, attack, place | Left click or Space (hold to keep going) | ⚒ button |
| Talk, pick up, open | E or right click | ✋ button |
| Hotbar | 1 to 0, or click a slot | Tap a slot |
| Backpack | I or Tab | 🎒 |
| Build menu | B | 🔨 |
| Rotate while placing | R | ↻ |
| Map | M | 🗺️, or tap the minimap |
| Journal | J | 📖 |
| Zoom | Mouse wheel | |
| Pause, close a window | Esc | ☰ |

*Smart tools* (on by default) switches to the right tool for whatever you
aim at: the axe for trees, the pickaxe for rocks, the shovel for mounds.

## What's in the game

- **Four biomes on one island.** Rivers, cliffs, alpine lakes, a volcano,
  day and night, and gates to open: repair the bridge to reach the forest,
  the old lift to climb to the mountains, and the boat to sail to the jungle.
- **A main story** in 20 steps, from your first chat with Mayor Rosalind to
  the Great Temple and the Great Luma. A tracker under the minimap shows the
  current goal and how far away it is.
- **Seven professions**: Cook, Brewer, Treasure Hunter, Blacksmith,
  Fisherman, Jewelrycrafter and Archaeologist. Each has a mentor with eight
  levels of lessons and its own crafting stations.
- **Crafting**: about 160 recipes at workbenches, kilns, smelters, stoves,
  casks, forges, gem cutters, treasure sinks, a rubble refiner, a
  restoration table and a Luma Altar. Stations keep working while you
  explore. Tools upgrade at any anvil through four metals.
- **Temples, crystal ruins and caves**: nine temples with push-block,
  pressure-plate, light-beam, ice-sliding and memory puzzles, four crystal
  ruins that reset every day, four dark caves where you light lanterns with
  charcoal, and the Great Temple, which opens with the four Ancient Keys.
- **Lumas**: 21 creatures to hatch from Mysterious Eggs in an Incubator. The
  Luma Life you pour on the egg decides the family. Each Luma follows you
  and gives a perk, such as finding treasure, more ore, faster bites or
  regenerating hearts. Pet and feed them for Luma Energy.
- **Fishing** with bait and a catch-bar minigame, 16 fish across the
  biomes, oysters and junk. Cast a Copper Magnet into sea bubbles to pull up
  a sunken chest.
- **Bugs** to catch with the net, **buried treasure** that moves every day,
  treasure maps, and **offering crystals** hidden in every biome (on
  pedestals, inside boulders, under glowing mounds) for the biome shrines.
- **Towns**: shops, farmers' markets, inns, daily request boards, waystones
  for fast travel, and Morel, a mushroom merchant who turns up somewhere new
  each day and trades for biome tokens.
- **A map with fog of war** that clears as you explore, a minimap (it also
  works inside temples), a **journal** with collections and stats, and a
  **mailbox** at your homestead.
- **Difficulty**: Cozy, Adventure or Hero, plus Peaceful mode, Arachnophobia
  mode, a choice of day length and three graphics quality levels.
- **Sound**: every sound effect and the music are synthesised in the
  browser with the Web Audio API. The music changes with the biome, the
  night and the dungeons.

## Project layout

```
index.html       page shell
css/style.css    all of the user interface
js/main.js       start-up and the main loop
js/core/         game state and events, input, camera, time, maths helpers
js/data/         items, recipes, shops, towns, people, professions, temples, Lumas, map layout
js/world/        terrain, water, sky, towns, buildings, nature, temples, caves, shrines, gates
js/entities/     player, townsfolk, Lumas, monsters, pickups
js/systems/      actions, inventory, crafting, professions, fishing, bugs, treasure, quests, saves, audio
js/ui/           HUD, panels, dialogue, shops, map, journal, title screen, touch controls
```

## Handy URL parameters

These skip the title screen when you are testing:

- `?autostart=1` starts a new game straight away in slot 3.
- `&peaceful=1` starts it in Peaceful mode. `&diff=cozy` or `&diff=hero`
  sets the difficulty.
- `&at=x,z` places you at world coordinates. `&hour=21` sets the time of day.
- `&zoom=2` zooms the camera out.

## Credits

Lume Island is a non-commercial fan homage. It is not affiliated with or
endorsed by the makers of *Luma Island*. All models, textures, sounds and
music are generated by the code in this folder.

Built with [three.js](https://threejs.org/) (MIT licence) and the
[Lilita One](https://fonts.google.com/specimen/Lilita+One) and
[Nunito](https://fonts.google.com/specimen/Nunito) fonts (SIL Open Font
Licence).
