// Follow camera at a fixed angle (classic cosy top-down 3/4 view).
import * as THREE from '../three.js';
import { G, clamp, damp } from './game.js';

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.pitch = THREE.MathUtils.degToRad(54);
    this.dist = 25;
    this.focus = new THREE.Vector3();
    this.shake = 0;
    this.ray = new THREE.Raycaster();
    this._v = new THREE.Vector3();
    this.minZoom = 0.5;
    this.maxZoom = 1.75;
  }
  snap(p) {
    this.focus.copy(p);
    this._place(1);
  }
  addZoom(steps) { this.zoomTarget = clamp(this.zoomTarget + steps * 0.1, this.minZoom, this.maxZoom); }
  addShake(a) { this.shake = Math.max(this.shake, a); }
  _place(k) {
    const d = this.dist * this.zoom;
    const tx = this.focus.x, ty = this.focus.y + Math.sin(this.pitch) * d, tz = this.focus.z + Math.cos(this.pitch) * d;
    const c = this.cam.position;
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (tz - c.z) * k;
  }
  update(dt, target) {
    this.zoom = damp(this.zoom, this.zoomTarget, 8, dt);
    this.focus.x = damp(this.focus.x, target.x, 7, dt);
    this.focus.z = damp(this.focus.z, target.z, 7, dt);
    this.focus.y = damp(this.focus.y, target.y + 0.8, 5, dt);
    this._place(1);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.35;
      this.cam.position.x += (Math.random() - 0.5) * s;
      this.cam.position.y += (Math.random() - 0.5) * s;
    }
    this.cam.lookAt(this.focus.x, this.focus.y, this.focus.z);
  }
  // Point on the ground under normalised screen coordinates
  groundPoint(nx, ny, heightAt, refY) {
    this.ray.setFromCamera({ x: nx, y: ny }, this.cam);
    const o = this.ray.ray.origin, d = this.ray.ray.direction;
    let y = refY;
    let px = o.x, pz = o.z;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d.y) < 1e-4) break;
      const t = (y - o.y) / d.y;
      px = o.x + d.x * t; pz = o.z + d.z * t;
      y = heightAt(px, pz);
    }
    return this._v.set(px, y, pz);
  }
  // project a world position to CSS pixels
  toScreen(x, y, z, out = {}) {
    const v = this._v.set(x, y, z).project(this.cam);
    const el = G.renderer.domElement;
    out.x = (v.x * 0.5 + 0.5) * el.clientWidth;
    out.y = (-v.y * 0.5 + 0.5) * el.clientHeight;
    out.visible = v.z < 1 && v.z > -1;
    return out;
  }
}
