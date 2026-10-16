// Sleeping (inns and your own bed), fainting and respawning.
import { G } from '../core/game.js';

export class Sleep {
  constructor() {
    G.events.on('playerDied', () => this.faint());
  }
  async atInn(npc, price) {
    if (G.save.coins < price) { G.ui.toast(`A bed costs ${price} coins.`, 'warn'); return; }
    if (G.time.hour > 6 && G.time.hour < 17) { G.ui.toast('Rooms open in the evening (after 5 PM).', 'info'); return; }
    G.player.addCoins(-price);
    G.save.bed = { level: 'overworld', x: npc.x, z: npc.z };
    await this.sleep();
  }
  async atBed(bed) {
    if (G.time.hour > 6 && G.time.hour < 17) { G.ui.toast('You are not sleepy yet. You can sleep after 5 PM.', 'info'); return; }
    G.save.bed = { level: G.level.id, x: bed.x, z: bed.z };
    await this.sleep();
  }
  async sleep() {
    G.paused = true;
    await G.ui.fadeTo(true, 700);
    G.time.sleep();
    G.player.hp = G.player.maxHp;
    G.save.flags.slept = (G.save.flags.slept || 0) + 1;
    G.saveGame?.('sleep');
    await new Promise((r) => setTimeout(r, 400));
    G.paused = G.ui.panels.length > 0;
    G.ui.banner('Day ' + G.time.day, ['Rise and shine!', 'A fresh start.', 'Good morning, ' + G.save.name + '!'][G.time.day % 3]);
    await G.ui.fadeTo(false, 700);
  }
  async faint() {
    const p = G.player;
    if (p.dead) return;
    p.dead = true;
    G.paused = true;
    G.audio?.play('faint');
    await G.ui.fadeTo(true, 900);
    const loss = G.save.difficulty === 'cozy' ? 0 : G.save.difficulty === 'hero' ? 0.2 : 0.1;
    const lost = Math.floor(G.save.coins * loss);
    G.save.coins -= lost;
    const bed = G.save.bed;
    if (G.level !== G.overworld) await G.travel.toOverworld(null, true);
    if (bed && bed.level === 'overworld') p.place(bed.x, bed.z + 1.2, G.overworld);
    else { const c = G.overworld.cities.lumenbrook.buildings.tavern.door; p.place(c.x, c.z, G.overworld); }
    G.cam.snap(p.pos);
    G.time.advance(120);
    p.hp = p.maxHp;
    p.dead = false;
    p.invuln = 2;
    G.paused = false;
    await G.ui.fadeTo(false, 700);
    G.ui.toast(lost ? `You fainted and dropped ${lost} coins.` : 'You fainted, but you are safe now.', 'warn', 4000);
  }
}
