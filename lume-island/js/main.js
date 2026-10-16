// Boot: renderer, world, player, systems, title screen and the main loop.
import * as THREE from './three.js';
import { G } from './core/game.js';
import { Input } from './core/input.js';
import { GameTime } from './core/time.js';
import { CameraRig } from './core/camera.js';
import { initMaterials, updateSeeThrough } from './world/materials.js';
import { Overworld } from './world/overworld.js';
import { Player, DEFAULT_LOOK } from './entities/player.js';
import { Pickups } from './entities/pickups.js';
import { Particles } from './world/particles.js';
import { Inventory } from './systems/inventory.js';
import { Actions } from './systems/actions.js';
import { newSave } from './systems/state.js';
import { UI } from './ui/ui.js';
import { Dialogue } from './ui/dialogue.js';
import { ShopUI } from './ui/shop.js';
import { AnvilUI } from './ui/anvil.js';
import { InventoryUI, ChestUI } from './ui/inventory.js';
import { Sleep } from './systems/sleep.js';
import { Placed } from './systems/placed.js';
import { Building } from './systems/building.js';
import { StationUI } from './ui/station.js';
import { BuildUI, BlueprintUI } from './ui/build.js';
import { Professions, GuildUI } from './systems/professions.js';
import { LightPool } from './world/lights.js';
import { setStationModelBuilder } from './world/itemModels.js';
import { stationGeometry } from './world/stationModels.js';
import { Title } from './ui/title.js';
import { Menu } from './ui/menu.js';
import { saveGame, loadSettings, collect } from './systems/save.js';
import { Locator } from './systems/locator.js';
import { Travel } from './systems/travel.js';
import { Monsters, Projectiles, Clouds } from './entities/monsters.js';
import { Effects } from './world/effects.js';
import { Lumas } from './systems/lumas.js';
import { Treasure } from './systems/treasure.js';
import { UseItems } from './systems/useitems.js';
import { Fishing } from './systems/fishing.js';
import { Bugs } from './systems/bugs.js';
import { Shrines } from './world/shrines.js';
import { Gates } from './world/gates.js';
import { Quests } from './systems/quests.js';
import { Towns } from './systems/towns.js';

const qs = new URLSearchParams(location.search);

function boot() {
  G.settings = loadSettings();
  const host = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ antialias: G.settings.quality !== 'low', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, G.settings.quality === 'high' ? 1.75 : G.settings.quality === 'medium' ? 1.25 : 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = G.settings.quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  G.renderer = renderer;

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.5, 1200);
  G.camera = camera;
  G.cam = new CameraRig(camera);
  G.input = new Input(renderer.domElement);
  G.time = new GameTime();
  G.time.rate = 1440 / (G.settings.dayLength * 60);
  G.save = newSave();
  initMaterials();
  setStationModelBuilder(stationGeometry);

  G.inv = new Inventory(30);
  G.ui = new UI(document.getElementById('ui'));
  G.pickups = new Pickups();
  G.particles = new Particles();
  G.actions = new Actions();
  G.dialogue = new Dialogue();
  G.shop = new ShopUI();
  G.anvil = new AnvilUI();
  G.invUI = new InventoryUI();
  G.chestUI = new ChestUI();
  G.sleep = new Sleep();
  G.placed = new Placed();
  G.building = new Building();
  G.stationUI = new StationUI();
  G.build = new BuildUI();
  G.blueprints = new BlueprintUI();
  G.professions = new Professions();
  G.guildUI = new GuildUI();
  G.menu = new Menu();
  G.lightPool = new LightPool(G.settings.quality === 'low' ? 3 : 6);
  G.levels = new Map();
  G.saveGame = saveGame;
  G.travel = new Travel();
  G.monsters = new Monsters();
  G.projectiles = new Projectiles();
  G.clouds = new Clouds();
  G.effects = new Effects();
  G.lumas = new Lumas();
  G.treasure = new Treasure();
  G.items = new UseItems();
  G.fishing = new Fishing();
  G.bugs = new Bugs();
  G.quests = new Quests();

  G.overworld = new Overworld(G.settings.quality);
  G.level = G.overworld;
  G.levels.set('overworld', G.overworld);
  G.shrines = new Shrines(G.overworld);
  G.gates = new Gates(G.overworld);
  G.towns = G.morel = new Towns(G.overworld);
  G.lightPool.attach(G.level.scene);
  G.particles.attach(G.level.scene);
  G.player = new Player();
  G.level.scene.add(G.player.object);
  const c = G.overworld.cities.lumenbrook;
  G.player.place(c.x - 4, c.z + 6);
  G.locator = new Locator();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.started) saveGame('auto'); });

  G.title = new Title(startGame);
  G.ui.hud.hidden = true;

  let last = performance.now();
  let autosave = 0;
  function tick(dt, render = true) {
    G.dt = dt; G.elapsed += dt; G.frame++;
    const inp = G.input;
    if (!G.started) {
      G.title.updateCamera(dt);
      G.overworld.update(dt);
      G.player.rig.update(dt, 0);
      if (render) renderer.render(G.level.scene, camera);
      inp.endFrame();
      return;
    }
    if (inp.mouse.wheel && !G.paused) G.cam.addZoom(inp.mouse.wheel);
    for (let i = 0; i < 10; i++) if (inp.hit('Digit' + ((i + 1) % 10))) { G.inv.selected = i; G.ui.hotbarDirty = true; }
    if (inp.hit('Escape')) { if (G.ui.panels.length) G.ui.closeTop(); else G.menu.openPause(); }
    else if (!G.ui.panels.length || G.ui.isOpen(G.invUI.panel) || G.ui.isOpen(G.build.panel)) {
      if (inp.hit('KeyB')) G.build.toggle();
      if (inp.hit('KeyI') || inp.hit('Tab')) G.invUI.toggle();
      if (inp.hit('KeyM')) G.mapUI?.toggle();
      if (inp.hit('KeyJ')) G.journal?.toggle();
    }
    if (!G.paused) {
      G.save.playtime += dt;
      G.time.update(dt);
      G.level.update(dt);
      G.player.update(dt);
      G.building.update(dt);
      G.actions.update(dt);
      G.pickups.update(dt);
      G.locator.update(dt);
      G.monsters.update(dt);
      G.lumas.update(dt);
      G.fishing.update(dt);
      G.bugs.update(dt);
      G.shrines.update(dt);
      G.gates.update(dt);
      G.quests.update(dt);
      G.events.emit('tick', dt);
      autosave += dt;
      if (autosave > 180 && G.level === G.overworld) { autosave = 0; saveGame('auto'); }
    } else G.player.update(0);
    G.placed.update(dt);
    G.lightPool.update(dt, G.level, G.level.sky ? G.level.sky.night : 1);
    G.particles.update(dt);
    G.effects.update(dt);
    G.cam.update(dt, G.player.pos);
    if (render) {
      G.ui.update(dt);
      updateSeeThrough(camera, renderer, G.player.pos, G.cam.zoom, !G.level.noSeeThrough);
      renderer.render(G.level.scene, camera);
    }
    inp.endFrame();
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try { tick(dt); } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }
  G.debugStep = (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) tick(dt, false); G.ui.update(dt); };
  requestAnimationFrame(frame);
  window.G = G;

  // artifact viewer hot-reload support: keep the running game across republishes
  const hot = window.claude?.hot;
  if (hot?.snapshot) hot.snapshot(() => (G.started ? { save: JSON.parse(JSON.stringify(collect())), slot: G.slot } : {}));
  const resume = (data) => {
    if (data?.save) startGame({ fresh: false, slot: data.slot || 1, data: data.save });
    else if (qs.get('autostart')) startGame({ fresh: true, slot: 3, name: 'Tester', look: DEFAULT_LOOK, difficulty: qs.get('diff') || 'adventure', peaceful: qs.get('peaceful') === '1' });
    else G.title.show();
    window.GAME_READY = true;
  };
  if (hot?.ready) hot.ready(resume); else resume(hot?.data ?? {});
}

function startGame(opts) {
  const data = opts.fresh ? newSave({ name: opts.name, look: opts.look, difficulty: opts.difficulty, peaceful: opts.peaceful }) : opts.data;
  G.save = data;
  G.slot = opts.slot;
  if (!data.stats) data.stats = { fish: {}, relics: {}, caught: {}, crafted: 0, sold: 0, earned: 0 };
  G.inv = new Inventory(data.invSize || 30);
  if (data.inv) G.inv.deserialize(data.inv);
  else {
    for (const [id, q] of [['axe', 1], ['pickaxe', 1], ['shovel', 1], ['fresh_bread', 3]]) G.inv.add(id, q, true);
  }
  G.player.setLook(data.look || DEFAULT_LOOK);
  G.player.maxHp = data.maxHp || 20;
  G.player.hp = Math.min(G.player.maxHp, data.hp || G.player.maxHp);
  G.time.day = data.day || 1;
  G.time.minutes = data.minutes ?? 7 * 60;
  G.overworld.nodes.deserialize(data.world?.nodes);
  G.placed.load(data.placed);
  G.events.emit('gameStart', data, !!opts.fresh);
  let x = data.x, z = data.z;
  if (!G.overworld.walkable(x, z)) [x, z] = G.overworld.terrain.findWalkable(x, z, 20);
  G.player.place(x, z);
  G.player.rotY = Math.PI;
  G.cam.zoom = G.cam.zoomTarget = 1;
  G.cam.snap(G.player.pos);
  G.started = true;
  G.title.hide();
  G.ui.hud.hidden = false;
  G.ui.hotbarDirty = true;
  if (qs.get('at')) { const [a, b] = qs.get('at').split(',').map(Number); G.player.place(a, b); G.cam.snap(G.player.pos); }
  if (qs.get('hour')) G.time.minutes = Number(qs.get('hour')) * 60;
  if (qs.get('zoom')) { G.cam.maxZoom = 6; G.cam.zoom = G.cam.zoomTarget = Number(qs.get('zoom')); G.cam.snap(G.player.pos); }
  if (opts.fresh) {
    G.ui.banner('Lume Island', 'Welcome, ' + data.name, 4000);
    setTimeout(() => G.ui.toast('Talk to Mayor Rosalind in the town square of Lumenbrook.', 'magic', 6000), 2500);
    saveGame('auto');
  } else G.ui.toast('Welcome back, ' + data.name + '!', 'good');
  G.audio?.music?.('day');
}

boot();
