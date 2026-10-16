// A small pool of point lights assigned to the light sources nearest the player.
import * as THREE from '../three.js';
import { G } from '../core/game.js';

export class LightPool {
  constructor(n = 6) {
    this.lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffc070, 0, 12, 1.5);
      l.castShadow = false;
      this.lights.push(l);
    }
    this.scene = null;
    this._t = 0;
  }
  attach(scene) {
    if (this.scene === scene) return;
    for (const l of this.lights) { this.scene?.remove(l); scene.add(l); }
    this.scene = scene;
  }
  update(dt, level, nightK) {
    this._t -= dt;
    if (this._t > 0) return;
    this._t = 0.25;
    const p = G.player.pos;
    const srcs = level.lightSources.concat(level.dynamicLights || []);
    const sorted = srcs.map((s) => [s, (s.x - p.x) ** 2 + (s.z - p.z) ** 2]).filter((e) => e[1] < 60 * 60).sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      const e = sorted[i];
      if (!e) { l.intensity = 0; continue; }
      const s = e[0];
      l.position.set(s.x, s.y, s.z);
      l.color.set(s.color ?? 0xffc070);
      l.distance = s.distance ?? 12;
      const k = level.isInterior || s.always ? 1 : nightK;
      l.intensity = (s.intensity ?? 3) * k * 9;
    }
  }
}
