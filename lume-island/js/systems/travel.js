// Moving between the overworld and interiors (temples, ruins, caves), plus
// short hops inside the overworld (lift, boat, waystones).
import { G } from '../core/game.js';
import { TempleLevel } from '../world/temple.js';
import { CaveLevel } from '../world/cave.js';

export class Travel {
  constructor() { this.busy = false; }
  switchLevel(level) {
    const old = G.level;
    if (old && old !== level) old.onExit?.();
    G.level = level;
    level.scene.add(G.player.object);
    G.particles.attach(level.scene);
    G.lightPool.attach(level.scene);
    G.placed.attachLevel(level);
    G.building.hide();
    G.companions?.attach?.(level);
    G.events.emit('levelChanged', level);
  }
  async enter(site, exitPos) {
    if (this.busy) return;
    this.busy = true;
    G.paused = true;
    G.audio?.play('door');
    await G.ui.fadeTo(true, 450);
    let level = G.levels.get(site.id);
    if (level && site.kind !== 'cave') { level.dispose(); G.levels.delete(site.id); level = null; }
    if (!level) {
      level = site.kind === 'cave' ? new CaveLevel(site.id, site) : new TempleLevel(site.id, site);
      G.levels.set(site.id, level);
    }
    level.exitTo = exitPos;
    level.leftEntry = false;
    this.switchLevel(level);
    G.player.place(level.entry.x, level.entry.z, level);
    G.player.rotY = Math.PI;
    G.cam.snap(G.player.pos);
    level.onEnter();
    G.paused = G.ui.panels.length > 0;
    this.busy = false;
    G.ui.banner(level.title, site.kind === 'cave' ? 'Light lanterns with charcoal to push back the dark' : site.kind === 'ruin' ? 'A crystal puzzle that resets every day' : '');
    G.audio?.music?.(site.kind === 'cave' ? 'cave' : 'temple');
    await G.ui.fadeTo(false, 450);
  }
  async toOverworld(pos, instant = false) {
    if (this.busy && !instant) return;
    this.busy = true;
    const from = G.level;
    if (!instant) { G.paused = true; await G.ui.fadeTo(true, 400); }
    this.switchLevel(G.overworld);
    const p = pos || from.exitTo || { x: G.save.x, z: G.save.z };
    G.player.place(p.x, p.z, G.overworld);
    G.player.rotY = 0;
    G.cam.snap(G.player.pos);
    if (from && from !== G.overworld && from.kind !== 'cave') { G.monsters?.clearLevel?.(from); G.pickups.clearLevel(from); }
    G.overworld.onEnter?.();
    G.paused = G.ui.panels.length > 0;
    this.busy = false;
    G.audio?.music?.(G.time.isNight() ? 'night' : 'day');
    if (!instant) await G.ui.fadeTo(false, 400);
  }
  // teleport inside the overworld (lift, boat, waystone)
  async hop(x, z, banner, sub) {
    if (this.busy) return;
    this.busy = true;
    G.paused = true;
    await G.ui.fadeTo(true, 450);
    G.player.place(x, z, G.overworld);
    G.cam.snap(G.player.pos);
    G.paused = G.ui.panels.length > 0;
    this.busy = false;
    if (banner) G.ui.banner(banner, sub || '');
    await G.ui.fadeTo(false, 450);
  }
}
