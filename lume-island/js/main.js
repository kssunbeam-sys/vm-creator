// Boot: renderer, world, player, systems and the main loop.
import * as THREE from './three.js';
import { G } from './core/game.js';
import { Input } from './core/input.js';
import { GameTime } from './core/time.js';
import { CameraRig } from './core/camera.js';
import { initMaterials, updateSeeThrough } from './world/materials.js';
import { Overworld } from './world/overworld.js';
import { Player } from './entities/player.js';
import { Pickups } from './entities/pickups.js';
import { Particles } from './world/particles.js';
import { Inventory } from './systems/inventory.js';
import { Actions } from './systems/actions.js';
import { newSave } from './systems/state.js';
import { UI } from './ui/ui.js';

function boot() {
  const host = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  G.renderer = renderer;

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.5, 1200);
  G.camera = camera;
  G.cam = new CameraRig(camera);
  G.input = new Input(renderer.domElement);
  G.time = new GameTime();
  G.settings = { quality: 'high', smartTools: true, viewScale: 1 };
  G.save = newSave();
  initMaterials();

  G.inv = new Inventory(30);
  for (const t of ['axe', 'pickaxe', 'shovel', 'whip', 'rod', 'net']) G.inv.add(t, 1, true);
  G.ui = new UI(document.getElementById('ui'));
  G.pickups = new Pickups();
  G.particles = new Particles();
  G.actions = new Actions();

  G.overworld = new Overworld('high');
  G.level = G.overworld;
  G.particles.attach(G.level.scene);
  G.player = new Player();
  G.level.scene.add(G.player.object);
  const qs = new URLSearchParams(location.search);
  const start = qs.get('at');
  let sx = 40, sz = 118;
  if (start) { const [a, b] = start.split(',').map(Number); sx = a; sz = b; }
  G.player.place(sx, sz);
  G.cam.snap(G.player.pos);
  if (qs.get('hour')) G.time.minutes = Number(qs.get('hour')) * 60;
  if (qs.get('zoom')) { G.cam.maxZoom = 6; G.cam.zoom = G.cam.zoomTarget = Number(qs.get('zoom')); G.cam.snap(G.player.pos); }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let last = performance.now();
  function tick(dt, render = true) {
    G.dt = dt; G.elapsed += dt; G.frame++;
    const inp = G.input;
    if (inp.mouse.wheel) G.cam.addZoom(inp.mouse.wheel);
    for (let i = 0; i < 10; i++) if (inp.hit('Digit' + ((i + 1) % 10))) { G.inv.selected = i; G.ui.hotbarDirty = true; }
    if (inp.hit('Escape')) G.ui.closeTop();
    if (!G.paused) {
      G.time.update(dt);
      G.level.update(dt);
      G.player.update(dt);
      G.actions.update(dt);
      G.pickups.update(dt);
    } else G.player.update(0);
    G.particles.update(dt);
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
    tick(dt);
    requestAnimationFrame(frame);
  }
  // test hook: advance the simulation without rendering
  G.debugStep = (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) tick(dt, false); G.ui.update(dt); };
  requestAnimationFrame(frame);
  window.G = G;
  window.GAME_READY = true;
}

boot();
