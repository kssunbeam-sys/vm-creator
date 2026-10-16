// A Level is one playable space with its own scene, colliders and objects:
// the overworld, a cave, a temple or a crystal ruin.
import * as THREE from '../three.js';
import { Colliders } from './collision.js';

export class Level {
  constructor(id, kind) {
    this.id = id;
    this.kind = kind;
    this.scene = new THREE.Scene();
    this.colliders = new Colliders();
    this.interactables = new Set();
    this.updaters = new Set();
    this.entities = new Set();
    this.lightSources = [];   // {x,y,z,color,intensity,distance} for pooled point lights
    this.isInterior = kind !== 'overworld';
  }
  heightAt() { return 0; }
  walkable() { return true; }
  biomeAt() { return 'meadow'; }
  addInteractable(o) { this.interactables.add(o); return o; }
  removeInteractable(o) { this.interactables.delete(o); }
  addUpdater(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); }
  addEntity(e) { this.entities.add(e); if (e.object) this.scene.add(e.object); return e; }
  removeEntity(e) { this.entities.delete(e); if (e.object) this.scene.remove(e.object); e.dispose?.(); }
  update(dt) {
    for (const fn of this.updaters) fn(dt);
    for (const e of this.entities) { if (e.update) e.update(dt); }
  }
  onEnter() {}
  onExit() {}
  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose();
    });
  }
}
