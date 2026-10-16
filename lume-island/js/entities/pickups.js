// Items lying in the world: pop out of nodes, bounce, then fly to the player.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { itemGeometry } from '../world/itemModels.js';
import { MAT } from '../world/materials.js';

export class Pickups {
  constructor() {
    this.list = [];
  }
  spawn(id, qty, x, y, z, opts = {}) {
    const level = opts.level || G.level;
    if (id === '$') {
      // coins: several small gold coins
      const n = Math.min(6, Math.max(1, Math.round(qty / 5)));
      let left = qty;
      for (let i = 0; i < n; i++) { const q = i === n - 1 ? left : Math.floor(qty / n); left -= q; this._make('$', q, x, y, z, level, opts); }
      return;
    }
    this._make(id, qty, x, y, z, level, opts);
  }
  _make(id, qty, x, y, z, level, opts) {
    const geo = id === '$' ? coinGeo() : itemGeometry(id);
    const mesh = new THREE.Mesh(geo, MAT.world);
    mesh.castShadow = true;
    const s = id === '$' ? 0.32 : 0.48;
    mesh.scale.setScalar(s);
    mesh.position.set(x, y, z);
    level.scene.add(mesh);
    const a = Math.random() * Math.PI * 2, sp = opts.still ? 0 : 1.6 + Math.random() * 1.8;
    this.list.push({
      id, qty, mesh, level, x, y, z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: opts.still ? 0 : 4.5 + Math.random() * 2,
      t: 0, ground: false, baseScale: s, delay: opts.delay ?? 0.45, life: 0,
    });
  }
  update(dt) {
    const p = G.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const it = this.list[i];
      if (it.level !== G.level) continue;
      it.t += dt; it.life += dt;
      const gy = it.level.heightAt(it.x, it.z) + 0.25;
      const dx = p.pos.x - it.x, dz = p.pos.z - it.z, dy = p.pos.y + 0.8 - it.y;
      const d = Math.hypot(dx, dz);
      const canTake = it.id === '$' || (G.inv && G.inv.room(it.id) > 0);
      if (it.t > it.delay && d < 3.4 && canTake) {
        // magnet
        const k = Math.min(1, dt * 10);
        it.x += dx * k; it.z += dz * k; it.y += dy * k;
        if (d < 0.6) { this.collect(it); this.list.splice(i, 1); continue; }
      } else if (!it.ground) {
        it.vy -= 18 * dt;
        it.x += it.vx * dt; it.z += it.vz * dt; it.y += it.vy * dt;
        if (!it.level.walkable(it.x, it.z)) { it.x -= it.vx * dt; it.z -= it.vz * dt; it.vx *= -0.3; it.vz *= -0.3; }
        if (it.y <= gy) { it.y = gy; if (Math.abs(it.vy) > 2) { it.vy = -it.vy * 0.35; it.vx *= 0.6; it.vz *= 0.6; } else { it.ground = true; it.vy = 0; } }
      } else {
        it.y = gy + Math.sin(it.t * 3) * 0.08;
      }
      it.mesh.position.set(it.x, it.y, it.z);
      it.mesh.rotation.y += dt * 1.6;
      if (it.life > 600) { it.level.scene.remove(it.mesh); this.list.splice(i, 1); }
    }
  }
  collect(it) {
    it.level.scene.remove(it.mesh);
    if (it.id === '$') { G.player.addCoins(it.qty); G.audio?.play('coin'); return; }
    const left = G.inv.add(it.id, it.qty);
    G.audio?.play('pickup');
    if (left > 0) this.spawn(it.id, left, G.player.pos.x, G.player.pos.y + 0.5, G.player.pos.z, { delay: 3 });
  }
  clearLevel(level) {
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].level === level) { level.scene.remove(this.list[i].mesh); this.list.splice(i, 1); }
  }
}

let _coin = null;
function coinGeo() {
  if (_coin) return _coin;
  const g = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 12);
  g.rotateX(Math.PI / 2);
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  const col = new THREE.Color(0xf2c33b);
  for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  _coin = g;
  return g;
}
