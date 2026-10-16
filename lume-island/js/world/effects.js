// Small one-off visual effects (whip lash).
import * as THREE from '../three.js';
import { G } from '../core/game.js';

export class Effects {
  constructor() {
    this.list = [];
    this.mat = new THREE.MeshBasicMaterial({ color: 0x8a5a32, transparent: true, opacity: 1, depthWrite: false });
  }
  whipLine(pl, len) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector3(Math.sin(t * Math.PI * 2) * 0.25 * (1 - t), 1.0 + Math.sin(t * Math.PI) * 0.6, 0.4 + t * len));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 20, 0.04, 4, false);
    const m = new THREE.Mesh(geo, this.mat.clone());
    m.position.copy(pl.pos);
    m.rotation.y = pl.rotY;
    G.level.scene.add(m);
    this.list.push({ m, t: 0, life: 0.22, level: G.level });
    const tip = new THREE.Vector3(Math.sin(pl.rotY) * (0.4 + len), 1.0, Math.cos(pl.rotY) * (0.4 + len)).add(pl.pos);
    G.particles?.burst('hit', tip.x, tip.y, tip.z, { n: 5 });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.t += dt;
      e.m.material.opacity = 1 - e.t / e.life;
      if (e.t >= e.life) { e.level.scene.remove(e.m); e.m.geometry.dispose(); this.list.splice(i, 1); }
    }
  }
}
