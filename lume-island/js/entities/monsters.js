// Monsters and the spawner. Peaceful mode removes every monster; Cozy mode
// keeps them passive until you attack first.
import * as THREE from '../three.js';
import { G, angleLerp, clamp } from '../core/game.js';
import { part, merge, P, jiggle } from '../core/geo.js';
import { MAT } from '../world/materials.js';
import { RNG, hash2 } from '../core/rng.js';
import { CITIES, HOMESTEAD } from '../data/layout.js';
import { REG } from '../world/terrain.js';

const S = { flat: false, jitter: 0 };
const geoCache = new Map();
const cached = (k, fn) => { if (!geoCache.has(k)) geoCache.set(k, fn()); return geoCache.get(k); };

const TYPES = {
  spider: { hp: 6, dmg: 2, speed: 4.2, aggro: 7.5, reach: 1.3, radius: 0.55, drops: [['spider_silk', 1, 1, 0.65], ['lost_spirit', 1, 1, 0.05]], leash: 18 },
  ghost: { hp: 8, dmg: 2, speed: 2.6, aggro: 8, reach: 1.2, radius: 0.5, fly: true, drops: [['ectoplasm', 1, 1, 0.7], ['lost_spirit', 1, 1, 0.08]], leash: 20 },
  bear: { hp: 22, dmg: 4, speed: 3.4, charge: 7.5, aggro: 6.5, reach: 1.8, radius: 0.95, drops: [['bear_fur', 1, 2, 1], ['nature_spirit', 1, 1, 0.08]], leash: 22, roam: true },
  cannon: { hp: 8, dmg: 2, speed: 0, aggro: 10, reach: 10, radius: 0.7, static: true, drops: [['cannon_pod', 1, 2, 0.8], ['nature_spirit', 1, 1, 0.06]] },
  shroom: { hp: 6, dmg: 1, speed: 0, aggro: 3.6, reach: 3.6, radius: 0.7, static: true, drops: [['trippy_spores', 1, 2, 0.85]] },
  boulder: { hp: 4, dmg: 3, speed: 0, aggro: 2.4, reach: 3, radius: 0.8, static: true, drops: [['stone', 2, 3, 1], ['charcoal', 1, 1, 0.4]] },
  poison: { hp: 999, dmg: 1, speed: 0, aggro: 0, reach: 2.6, radius: 0.5, static: true, hazard: true, drops: [] },
};

function spiderGeo(fluffy) {
  if (fluffy) return cached('fluff', () => merge([
    jiggle(part(P.ico(0.62, 1), 0xd8d2cc, { y: 0.62, jitter: 0.1 }), 0.12, 3),
    part(P.sphere(0.13, 8, 6), 0xffffff, { ...S, x: 0.2, y: 0.78, z: 0.5 }), part(P.sphere(0.13, 8, 6), 0xffffff, { ...S, x: -0.2, y: 0.78, z: 0.5 }),
    part(P.sphere(0.07, 6, 5), 0x1a1a1a, { ...S, x: 0.2, y: 0.78, z: 0.6 }), part(P.sphere(0.07, 6, 5), 0x1a1a1a, { ...S, x: -0.2, y: 0.78, z: 0.6 }),
    part(P.sphere(0.12, 6, 4), 0xff9ab0, { ...S, x: 0.34, y: 0.62, z: 0.48, sy: 0.5 }), part(P.sphere(0.12, 6, 4), 0xff9ab0, { ...S, x: -0.34, y: 0.62, z: 0.48, sy: 0.5 }),
    part(P.sphere(0.12, 6, 5), 0xb8b0a8, { ...S, x: 0.3, y: 0.1, z: 0.2 }), part(P.sphere(0.12, 6, 5), 0xb8b0a8, { ...S, x: -0.3, y: 0.1, z: 0.2 }),
  ]));
  return cached('spider', () => {
    const p = [part(P.sphere(0.5, 10, 8), 0x3a2a4a, { ...S, y: 0.6, z: -0.45, sz: 1.2 }), part(P.sphere(0.32, 10, 8), 0x2a1e36, { ...S, y: 0.55, z: 0.2 })];
    p.push(part(P.sphere(0.16, 6, 5), 0xd9443a, { ...S, y: 0.95, z: -0.5, sy: 0.4 }));
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) p.push(part(P.sphere(0.06, 6, 5), 0xff3a3a, { ...S, x: sx * (0.1 + i * 0.08), y: 0.68 - i * 0.05, z: 0.48 }));
    return merge(p);
  });
}
function spiderLegGeo() { return cached('leg', () => merge([part(P.cyl(0.04, 0.04, 0.6, 4), 0x2a1e36, { y: 0.25, x: 0.3, rz: -1.0 }), part(P.cyl(0.035, 0.03, 0.6, 4), 0x2a1e36, { x: 0.62, y: 0.2, rz: 0.6 })])); }
function ghostGeo() {
  return cached('ghost', () => {
    const p = [part(P.sphere(0.55, 12, 10), 0xeaf6ff, { ...S, y: 1.25 }), part(P.cyl(0.55, 0.7, 0.9, 12, true), 0xeaf6ff, { ...S, y: 0.75 })];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; p.push(part(P.cone(0.18, 0.35, 5), 0xeaf6ff, { x: Math.cos(a) * 0.55, y: 0.22, z: Math.sin(a) * 0.55, rx: Math.PI })); }
    p.push(part(P.sphere(0.1, 6, 5), 0x1a2030, { ...S, x: 0.18, y: 1.32, z: 0.48, sy: 1.5 }), part(P.sphere(0.1, 6, 5), 0x1a2030, { ...S, x: -0.18, y: 1.32, z: 0.48, sy: 1.5 }));
    p.push(part(P.sphere(0.12, 6, 5), 0x1a2030, { ...S, y: 1.08, z: 0.5, sy: 0.6 }));
    return merge(p);
  });
}
function bearGeo() {
  return cached('bear', () => {
    const c = 0x7a5032, d = 0x5e3c24, l = 0xc89a6a;
    const p = [part(P.sphere(0.95, 12, 10), c, { ...S, y: 1.2, sz: 1.35, sy: 0.95 }), part(P.sphere(0.6, 12, 10), c, { ...S, y: 1.65, z: 1.1 })];
    p.push(part(P.sphere(0.3, 10, 8), l, { ...S, y: 1.52, z: 1.6, sy: 0.8 }), part(P.sphere(0.1, 6, 5), 0x1a1a1a, { ...S, y: 1.62, z: 1.86 }));
    for (const sx of [-1, 1]) {
      p.push(part(P.sphere(0.2, 8, 6), d, { ...S, x: sx * 0.4, y: 2.15, z: 1.0 }));
      p.push(part(P.sphere(0.07, 6, 5), 0x1a1a1a, { ...S, x: sx * 0.22, y: 1.82, z: 1.58 }));
      for (const sz of [-1, 1]) p.push(part(P.cyl(0.24, 0.28, 0.75, 8), d, { ...S, x: sx * 0.5, y: 0.38, z: sz * 0.62 }));
    }
    return merge(p);
  });
}
function cannonGeo() {
  return cached('cannon', () => {
    const p = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const l = part(P.sphere(0.5, 8, 5), 0x3f9a4a, { ...S, sy: 0.15, sx: 1.6 }); l.rotateY(a); l.translate(Math.cos(a) * 0.6, 0.1, -Math.sin(a) * 0.6); p.push(l); }
    p.push(part(P.sphere(0.6, 12, 10), 0x6ab84a, { ...S, y: 0.75 }), part(P.cyl(0.26, 0.32, 0.8, 10), 0x4f9a3a, { y: 1.0, z: 0.55, rx: Math.PI / 2 - 0.3 }), part(P.cyl(0.2, 0.2, 0.1, 10), 0x1a2a1a, { y: 1.12, z: 0.95, rx: Math.PI / 2 - 0.3 }));
    p.push(part(P.sphere(0.12, 6, 5), 0xffd23a, { ...S, x: 0.25, y: 1.15, z: 0.45 }), part(P.sphere(0.12, 6, 5), 0xffd23a, { ...S, x: -0.25, y: 1.15, z: 0.45 }));
    return merge(p);
  });
}
function shroomGeo() {
  return cached('shroom', () => merge([
    part(P.cyl(0.3, 0.42, 0.9, 10), 0xf2e6cf, { ...S, y: 0.45 }),
    part(new THREE.SphereGeometry(0.85, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xb06ae0, { ...S, y: 0.85, sy: 0.7 }),
    ...[0, 1, 2, 3, 4].map((i) => part(P.sphere(0.13, 6, 4), 0xf2d6ff, { ...S, x: Math.cos(i * 1.25) * 0.55, y: 1.25, z: Math.sin(i * 1.25) * 0.55, sy: 0.5 })),
    part(P.sphere(0.1, 6, 5), 0x1a1020, { ...S, x: 0.14, y: 0.62, z: 0.36, sy: 1.4 }), part(P.sphere(0.1, 6, 5), 0x1a1020, { ...S, x: -0.14, y: 0.62, z: 0.36, sy: 1.4 }),
  ]));
}
function boulderGeo() { return cached('boulderm', () => merge([jiggle(part(P.dodeca(0.85, 0), 0x8a8078, { y: 0.6, jitter: 0.08 }), 0.12, 9), part(P.box(0.5, 0.06, 0.08), 0x2a2020, { y: 0.9, z: 0.72, rz: 0.4 })])); }
function ventGeo() { return cached('vent', () => merge([jiggle(part(P.cyl(0.7, 0.9, 0.4, 8), 0x5a4e5e, { y: 0.2, jitter: 0.1 }), 0.08, 4), part(P.cyl(0.35, 0.35, 0.42, 8), 0x2a1e2a, { y: 0.22 })])); }

export class Monster {
  constructor(level, type, x, z, opts = {}) {
    this.level = level;
    this.type = type;
    this.def = TYPES[type];
    this.x = x; this.z = z;
    this.home = { x, z };
    this.hp = this.def.hp;
    this.radius = this.def.radius;
    this.hittable = !this.def.hazard;
    this.hostile = true;
    this.provoked = false;
    this.state = 'idle';
    this.t = Math.random() * 10;
    this.cool = 1 + Math.random();
    this.rot = Math.random() * Math.PI * 2;
    this.flash = 0;
    this.knock = { x: 0, z: 0 };
    this.dead = false;
    this.den = opts.den;
    this.object = new THREE.Group();
    this.build();
    this.object.position.set(x, level.heightAt(x, z), z);
  }
  build() {
    const g = this.object;
    while (g.children.length) g.remove(g.children[0]);
    let mat = MAT.char;
    const t = this.type;
    if (t === 'spider') {
      const fluffy = !!G.settings.arachnophobia;
      this.body = new THREE.Mesh(spiderGeo(fluffy), MAT.char);
      this.body.castShadow = true;
      g.add(this.body);
      this.legs = [];
      if (!fluffy) for (let i = 0; i < 8; i++) {
        const side = i < 4 ? 1 : -1;
        const leg = new THREE.Mesh(spiderLegGeo(), MAT.char);
        leg.position.set(0, 0.5, -0.2 + (i % 4) * 0.22 - 0.2);
        leg.rotation.y = side > 0 ? 0 : Math.PI;
        leg.userData.base = leg.rotation.y; leg.userData.i = i;
        g.add(leg);
        this.legs.push(leg);
      }
    } else if (t === 'ghost') { this.body = new THREE.Mesh(ghostGeo(), MAT.ghost); g.add(this.body); }
    else if (t === 'bear') { this.body = new THREE.Mesh(bearGeo(), mat); this.body.castShadow = true; g.add(this.body); }
    else if (t === 'cannon') { this.body = new THREE.Mesh(cannonGeo(), mat); this.body.castShadow = true; g.add(this.body); }
    else if (t === 'shroom') { this.body = new THREE.Mesh(shroomGeo(), mat); this.body.castShadow = true; g.add(this.body); }
    else if (t === 'boulder') { this.body = new THREE.Mesh(boulderGeo(), mat); this.body.castShadow = true; g.add(this.body); }
    else if (t === 'poison') { this.body = new THREE.Mesh(ventGeo(), mat); g.add(this.body); }
    const blob = new THREE.Mesh(P.disc(this.radius * 1.1, 12), MAT.shadowBlob);
    blob.position.y = 0.04;
    g.add(blob);
  }
  get px() { return G.player.pos.x; }
  canAttack() {
    if (G.save.peaceful) return false;
    if (G.save.difficulty === 'cozy' && !this.provoked) return false;
    return true;
  }
  move(dx, dz, dt) {
    const L = this.level;
    let nx = this.x + dx * dt, nz = this.z + dz * dt;
    if (!this.def.fly) {
      if (!L.walkable(nx, nz)) { if (L.walkable(nx, this.z)) nz = this.z; else if (L.walkable(this.x, nz)) nx = this.x; else return; }
      const r = L.colliders.resolve(nx, nz, this.radius * 0.8);
      if (L.walkable(r.x, r.z)) { nx = r.x; nz = r.z; }
      if (L.isLand && !(L.walkable(nx, nz))) return;
    }
    this.x = nx; this.z = nz;
  }
  update(dt) {
    if (this.dead) return;
    const d = this.def;
    this.t += dt;
    this.cool -= dt;
    if (this.flash > 0) { this.flash -= dt; this.body.visible = Math.floor(this.flash * 20) % 2 === 0; } else this.body.visible = true;
    const p = G.player.pos;
    const dx = p.x - this.x, dz = p.z - this.z;
    const dist = Math.hypot(dx, dz);
    const sees = dist < d.aggro && !G.player.dead && this.canAttack();
    // knockback
    if (Math.abs(this.knock.x) + Math.abs(this.knock.z) > 0.05) { this.move(this.knock.x, this.knock.z, dt); this.knock.x *= 1 - dt * 6; this.knock.z *= 1 - dt * 6; }
    if (this.type === 'cannon') return this.updateCannon(dt, dx, dz, dist, sees);
    if (this.type === 'shroom') return this.updateShroom(dt, dist, sees);
    if (this.type === 'boulder') return this.updateBoulder(dt, dist);
    if (this.type === 'poison') return this.updateVent(dt, dist);
    let speed = 0, tx = 0, tz = 0;
    const hd = Math.hypot(this.home.x - this.x, this.home.z - this.z);
    if (sees && hd < d.leash) {
      this.state = 'chase';
      tx = dx / (dist || 1); tz = dz / (dist || 1);
      speed = d.speed;
      if (this.type === 'bear' && dist > 2.5 && dist < 6) speed = d.charge;
      if (dist < d.reach + 0.4 && this.cool <= 0) this.attack(dist);
      if (dist < d.reach * 0.7) speed = 0;
    } else if (hd > 2.5 && (this.state === 'chase' || this.state === 'return' || hd > d.leash)) {
      this.state = 'return';
      tx = (this.home.x - this.x) / hd; tz = (this.home.z - this.z) / hd;
      speed = d.speed * 0.7;
      if (hd < 3) this.state = 'idle';
    } else {
      this.state = 'idle';
      if (!this.wander || this.t > this.wander.t) this.wander = { a: Math.random() * Math.PI * 2, t: this.t + 2 + Math.random() * 3, go: Math.random() < 0.6 };
      if (this.wander.go) { tx = Math.cos(this.wander.a); tz = Math.sin(this.wander.a); speed = d.speed * 0.3; }
    }
    if (this.attackT > 0) { this.attackT -= dt; speed = 0; }
    if (speed > 0) { this.move(tx * speed, tz * speed, dt); this.rot = angleLerp(this.rot, Math.atan2(tx, tz), Math.min(1, dt * 8)); }
    const y = d.fly ? this.level.heightAt(this.x, this.z) + 0.3 + Math.sin(this.t * 2.5) * 0.25 : this.level.heightAt(this.x, this.z);
    this.object.position.set(this.x, y, this.z);
    this.object.rotation.y = this.rot;
    if (this.legs) for (const l of this.legs) l.rotation.y = l.userData.base + Math.sin(this.t * 18 + l.userData.i * 1.3) * (speed > 0 ? 0.35 : 0.05);
    if (this.type === 'bear') this.body.rotation.x = speed > 0 ? Math.sin(this.t * 10) * 0.05 : 0;
    if (this.type === 'ghost') this.body.material.opacity = 0.55 + Math.sin(this.t * 3) * 0.15;
    if (this.type === 'spider' && !this.legs.length) this.body.position.y = Math.abs(Math.sin(this.t * 12)) * 0.15 * (speed > 0 ? 1 : 0.2);
  }
  attack(dist) {
    this.cool = this.type === 'bear' ? 1.6 : 1.2;
    this.attackT = 0.35;
    const p = G.player.pos;
    this.object.position.y += 0.3;
    G.audio?.play(this.type === 'bear' ? 'growl' : this.type === 'ghost' ? 'ghost' : 'hiss');
    setTimeout(() => {
      if (this.dead) return;
      const d2 = Math.hypot(G.player.pos.x - this.x, G.player.pos.z - this.z);
      if (d2 < this.def.reach + 0.6 && this.canAttack()) G.player.damage(this.def.dmg, this.x, this.z, this.type);
    }, 220);
  }
  updateCannon(dt, dx, dz, dist, sees) {
    this.object.position.y = this.level.heightAt(this.x, this.z);
    if (sees) {
      this.rot = angleLerp(this.rot, Math.atan2(dx, dz), Math.min(1, dt * 4));
      if (this.cool <= 0) {
        this.cool = 2.2;
        G.projectiles?.fire(this.level, this.x + Math.sin(this.rot) * 0.9, 1.1, this.z + Math.cos(this.rot) * 0.9, dx / dist, dz / dist, 9, this.def.dmg);
        G.audio?.play('pop');
        this.body.scale.set(1.1, 0.9, 1.1);
      }
    }
    this.body.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 6));
    this.object.rotation.y = this.rot;
  }
  updateShroom(dt, dist, sees) {
    this.object.position.y = this.level.heightAt(this.x, this.z);
    this.body.scale.y = 1 + Math.sin(this.t * 2) * 0.05;
    if (sees && this.cool <= 0) {
      this.cool = 3.5;
      G.clouds?.spawn(this.level, this.x, this.z, 3.4, 3.0, this.def.dmg);
      G.audio?.play('puff');
    }
  }
  updateBoulder(dt, dist) {
    this.object.position.y = this.level.heightAt(this.x, this.z);
    if (!this.fuse && dist < this.def.aggro && this.canAttack()) this.fuse = 1.6;
    if (this.fuse) {
      this.fuse -= dt;
      this.body.position.x = Math.sin(this.t * 60) * 0.06;
      this.body.scale.setScalar(1 + (1.6 - this.fuse) * 0.12);
      if (Math.floor(this.fuse * 8) % 2 === 0) this.body.material = MAT.glowWarm; else this.body.material = MAT.char;
      if (this.fuse <= 0) this.explode();
    }
  }
  explode() {
    const r = 3.2;
    G.particles?.burst('rock', this.x, 1, this.z, { n: 18, scale: 1.4 });
    G.particles?.burst('fire', this.x, 1, this.z, { n: 12 });
    G.audio?.play('boom');
    G.cam.addShake(0.6);
    if (Math.hypot(G.player.pos.x - this.x, G.player.pos.z - this.z) < r && this.canAttack()) G.player.damage(this.def.dmg, this.x, this.z, 'boulder');
    for (const e of this.level.entities) if (e !== this && e.hittable && !e.dead && Math.hypot(e.x - this.x, e.z - this.z) < r) e.onHit?.(6, this.x, this.z, 'boom');
    this.die(true);
  }
  updateVent(dt, dist) {
    if (this.cool <= 0) { this.cool = 4 + Math.random() * 2; if (dist < 16 && this.canAttack()) G.clouds?.spawn(this.level, this.x, this.z, 2.6, 3.2, 1); }
  }
  onHit(dmg, fx, fz, tool) {
    if (this.dead || this.def.hazard) return;
    this.provoked = true;
    if (this.type === 'boulder') { if (!this.fuse) this.fuse = 1.2; return; }
    this.hp -= dmg;
    this.flash = 0.3;
    const dx = this.x - fx, dz = this.z - fz, l = Math.hypot(dx, dz) || 1;
    if (!this.def.static) { this.knock.x = dx / l * (this.type === 'bear' ? 5 : 11); this.knock.z = dz / l * (this.type === 'bear' ? 5 : 11); }
    G.particles?.burst('hit', this.x, 1, this.z);
    G.audio?.play('hit');
    if (this.hp <= 0) this.die();
  }
  die(silent) {
    if (this.dead) return;
    this.dead = true;
    if (!silent) { G.particles?.burst('magic', this.x, 0.8, this.z, { n: 14 }); G.audio?.play('poof'); }
    for (const [id, a, b, ch] of this.def.drops) if (Math.random() < ch * (G.save.difficulty === 'cozy' ? 1.25 : 1)) G.pickups.spawn(id, a + Math.floor(Math.random() * (b - a + 1)), this.x, 0.8 + this.level.heightAt(this.x, this.z), this.z, { level: this.level });
    if (this.den) this.den.deadDay = G.time.day;
    G.events.emit('monsterKilled', this.type);
    this.level.removeEntity(this);
  }
  dispose() {}
}

// seeds shot by cannon plants
export class Projectiles {
  constructor() { this.list = []; this.geo = merge([part(P.sphere(0.22, 8, 6), 0x5a8a2a, S)]); }
  fire(level, x, y, z, dx, dz, speed, dmg) {
    const m = new THREE.Mesh(this.geo, MAT.char);
    m.position.set(x, y, z);
    level.scene.add(m);
    this.list.push({ level, m, dx, dz, speed, dmg, t: 0 });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      p.m.position.x += p.dx * p.speed * dt; p.m.position.z += p.dz * p.speed * dt;
      const pl = G.player.pos;
      const hit = Math.hypot(pl.x - p.m.position.x, pl.z - p.m.position.z) < 0.7;
      if (hit && p.level === G.level) G.player.damage(p.dmg, p.m.position.x - p.dx, p.m.position.z - p.dz, 'seed');
      if (hit || p.t > 2.5 || p.level !== G.level || !p.level.walkable(p.m.position.x, p.m.position.z)) {
        G.particles?.burst('bush', p.m.position.x, p.m.position.y, p.m.position.z, { n: 4 });
        p.level.scene.remove(p.m);
        this.list.splice(i, 1);
      }
    }
  }
}

// lingering poison clouds
export class Clouds {
  constructor() { this.list = []; }
  spawn(level, x, z, r, life, dmg) { this.list.push({ level, x, z, r, life, t: 0, dmg, tick: 0 }); G.particles?.burst('poison', x, 0.8, z, { n: 16, scale: r / 2 }); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      c.t += dt; c.tick -= dt;
      if (c.level === G.level && Math.random() < 0.5) G.particles?.burst('poison', c.x + (Math.random() - 0.5) * c.r, 0.6, c.z + (Math.random() - 0.5) * c.r, { n: 1, scale: 1.4 });
      if (c.level === G.level && c.tick <= 0 && Math.hypot(G.player.pos.x - c.x, G.player.pos.z - c.z) < c.r) {
        c.tick = 1;
        if (!G.save.peaceful) { G.player.invuln = 0; G.player.damage(c.dmg, c.x, c.z, 'poison'); }
      }
      if (c.t > c.life) this.list.splice(i, 1);
    }
  }
}

// The spawner: dens in the wild, night spawns, interior spawns.
export class Monsters {
  constructor() {
    this.dens = [];
    this.nightT = 0;
    G.events.on('peaceful', (on) => { if (on) this.clearAll(); else this.respawnDens(); });
    G.events.on('newDay', () => this.respawnDens());
    G.events.on('arachnophobia', () => { for (const L of G.levels.values()) for (const e of L.entities) if (e.type === 'spider') e.build(); });
    G.events.on('gameStart', () => { this.makeDens(); this.respawnDens(); });
  }
  spawn(level, type, x, z, opts) {
    if (G.save.peaceful) return null;
    const m = new Monster(level, type, x, z, opts);
    level.addEntity(m);
    return m;
  }
  clearLevel(level) { for (const e of [...level.entities]) if (e instanceof Monster) level.removeEntity(e); }
  clearAll() { for (const L of G.levels.values()) this.clearLevel(L); G.projectiles.list.length = 0; G.clouds.list.length = 0; }
  makeDens() {
    if (this.dens.length) return;
    const T = G.overworld.terrain;
    const rng = new RNG(777);
    const want = { [REG.FOREST]: [['bear', 7], ['shroom', 16]], [REG.MOUNTAIN]: [['bear', 6]], [REG.JUNGLE]: [['cannon', 16]] };
    for (const [reg, list] of Object.entries(want)) {
      for (const [type, n] of list) {
        let made = 0, tries = 0;
        while (made < n && tries++ < 4000) {
          const x = -340 + rng.next() * 680, z = -340 + rng.next() * 680;
          if (T.regionIdAt(x, z) !== +reg || !T.walkable(x, z) || T.groundAt(x, z) < 1.2) continue;
          if (Object.values(CITIES).some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 24)) continue;
          if (Math.hypot(HOMESTEAD.x - x, HOMESTEAD.z - z) < 40) continue;
          if (T.pathWeight(x, z) > 0.05) continue;
          if (this.dens.some((d) => Math.hypot(d.x - x, d.z - z) < 18)) continue;
          this.dens.push({ type, x, z, deadDay: 0, mob: null });
          made++;
        }
      }
    }
  }
  respawnDens() {
    if (G.save.peaceful || !G.overworld) return;
    for (const d of this.dens) {
      if (d.mob && !d.mob.dead) continue;
      if (d.deadDay === G.time.day) continue;
      d.mob = this.spawn(G.overworld, d.type, d.x, d.z, { den: d });
    }
  }
  update(dt) {
    G.projectiles.update(dt);
    G.clouds.update(dt);
    // night creatures in the wilderness
    if (G.save.peaceful || G.level !== G.overworld) return;
    this.nightT -= dt;
    if (this.nightT > 0) return;
    this.nightT = 4;
    const night = G.time.isNight();
    const roamers = [...G.overworld.entities].filter((e) => e instanceof Monster && e.night);
    for (const m of roamers) {
      const far = Math.hypot(m.x - G.player.pos.x, m.z - G.player.pos.z) > 60;
      if (!night || far) G.overworld.removeEntity(m);
    }
    if (!night || roamers.length >= 4) return;
    const p = G.player.pos;
    if (Object.values(CITIES).some((c) => Math.hypot(c.x - p.x, c.z - p.z) < c.r + 15)) return;
    if (Math.hypot(HOMESTEAD.x - p.x, HOMESTEAD.z - p.z) < HOMESTEAD.r + 10) return;
    const a = Math.random() * Math.PI * 2, r = 22 + Math.random() * 10;
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    if (!G.overworld.walkable(x, z)) return;
    const biome = G.overworld.biomeAt(x, z);
    const type = biome === 'mountain' || biome === 'meadow' ? (Math.random() < 0.6 ? 'ghost' : 'spider') : 'spider';
    const m = this.spawn(G.overworld, type, x, z);
    if (m) m.night = true;
  }
}
