// The player's homestead west of Lumenbrook: a cottage with a bed, a mailbox
// and plenty of open ground for stations.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { merge, part, P } from '../core/geo.js';
import { MAT } from './materials.js';
import { house, PROPS } from './buildings.js';
import { HOMESTEAD } from '../data/layout.js';

export function buildHomestead(world) {
  const acc = { body: [], roof: [], glow: [], glass: [] };
  const hx = HOMESTEAD.x, hz = HOMESTEAD.z - HOMESTEAD.r * 0.62;
  const y = world.heightAt(hx, hz);
  const out = house({ style: 'meadow', w: 7, d: 5.5, roofColor: 0xd9603c, chimney: true, seed: 5 });
  const add = (o, x, yy, z, rot) => { for (const k of Object.keys(o)) for (const g of o[k]) { const c = g.clone(); c.rotateY(rot); c.translate(x, yy, z); (acc[k] = acc[k] || []).push(c); } };
  add(out, hx, y, hz, 0);
  world.colliders.addBox(hx, hz, 3.75, 3.0, 0);
  // mailbox + sign + fences
  const mb = { body: [part(P.box(0.12, 1.1, 0.12), 0x7a4e2c, { y: 0.55 }), part(P.box(0.5, 0.4, 0.7), 0x4f80b8, { y: 1.25 }), part(P.box(0.06, 0.25, 0.12), 0xd9443a, { x: 0.28, y: 1.4, z: 0.2 })] };
  const mx = hx + 5.2, mz = hz + 4.2;
  add(mb, mx, world.heightAt(mx, mz), mz, 0);
  world.colliders.addCircle(mx, mz, 0.4);
  const sx = HOMESTEAD.x + 7, sz = HOMESTEAD.z + HOMESTEAD.r * 0.55;
  const sign = { body: [part(P.box(0.14, 1.6, 0.14), 0x7a4e2c, { x: -0.7, y: 0.8 }), part(P.box(0.14, 1.6, 0.14), 0x7a4e2c, { x: 0.7, y: 0.8 }), part(P.box(1.9, 0.7, 0.12), 0xc8925a, { y: 1.3 }), part(P.box(1.5, 0.08, 0.13), 0x5a3a24, { y: 1.42 }), part(P.box(1.1, 0.08, 0.13), 0x5a3a24, { y: 1.22 })] };
  add(sign, sx, world.heightAt(sx, sz), sz, 0.3);
  world.colliders.addBox(sx, sz, 1.0, 0.2, 0.3);
  for (let i = -3; i <= 3; i++) {
    if (Math.abs(i) < 1) continue;
    const fx = hx + i * 2.0, fz = hz + 3.2 + 4.5;
    const f = { body: [part(P.box(0.14, 0.9, 0.14), 0x8a5a36, { x: -0.95, y: 0.45 }), part(P.box(2.0, 0.1, 0.07), 0xb07a48, { y: 0.35 }), part(P.box(2.0, 0.1, 0.07), 0xb07a48, { y: 0.7 })] };
    add(f, fx, world.heightAt(fx, fz), fz, 0);
  }
  const group = new THREE.Group();
  for (const [k, mat] of [['body', MAT.world], ['roof', MAT.roof], ['glow', MAT.glowWarm], ['glass', MAT.glowWarm]]) {
    if (!acc[k].length) continue;
    const m = new THREE.Mesh(merge(acc[k]), mat);
    m.castShadow = k === 'body' || k === 'roof'; m.receiveShadow = true;
    group.add(m);
  }
  world.scene.add(group);
  const door = { x: hx, z: hz + 2.75 + 1.4 };
  world.addInteractable({ x: hx, z: hz + 3.1, r: 0.8, h: 3.0, label: () => (G.time.hour >= 17 || G.time.hour < 6 ? 'Sleep in your cottage' : 'Your cottage (sleep after 5 PM)'), onInteract: () => G.sleep.atBed({ x: door.x, z: door.z }) });
  world.addInteractable({ x: mx, z: mz, r: 0.4, h: 1.8, label: 'Check the mailbox', onInteract: () => G.mail?.open() });
  world.addInteractable({ x: sx, z: sz, r: 0.6, h: 2.0, label: 'Read sign', onInteract: () => G.dialogue.openText('Sign', `${G.save.name}'s Homestead. Build anything you like on this land.`) });
  return { door, x: hx, z: hz, mailbox: { x: mx, y: world.heightAt(mx, mz), z: mz } };
}
