// The island overworld: terrain, sea, sky and everything placed on it.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { Level } from './level.js';
import { Terrain } from './terrain.js';
import { createOcean } from './water.js';
import { Sky } from './sky.js';
import { MAT, windUniform } from './materials.js';
import { NodeField } from './nodes.js';
import { scatterOverworld } from './scatter.js';
import { Grass } from './grass.js';
import { buildCities } from './city.js';
import { buildHomestead } from './homestead.js';
import { buildSites } from './sites.js';

export class Overworld extends Level {
  constructor(quality) {
    super('overworld', 'overworld');
    this.terrain = new Terrain(1337);
    this.terrainMesh = this.terrain.buildMeshes(MAT.world);
    this.scene.add(this.terrainMesh);
    this.ocean = createOcean(this.terrain.buildDepthTexture(512));
    this.scene.add(this.ocean);
    this.waterMat = this.ocean.userData.material;
    this.sky = new Sky(this.scene, quality);
    this.nodes = new NodeField(this, scatterOverworld(this.terrain), { seed: 7 });
    this.grass = new Grass(this.terrain, this.scene, quality === 'low' ? 0.4 : quality === 'medium' ? 0.7 : 1);
    this.cities = buildCities(this);
    this.homestead = buildHomestead(this);
    this.sites = buildSites(this);
  }
  onEnter() { G.lightPool.attach(this.scene); }
  heightAt(x, z) { return this.terrain.heightAt(x, z); }
  walkable(x, z) { return this.terrain.walkable(x, z); }
  biomeAt(x, z) { return this.terrain.biomeAt(x, z); }
  update(dt) {
    super.update(dt);
    this.waterMat.uniforms.uTime.value = G.elapsed;
    windUniform.value = G.elapsed;
    const p = G.player ? G.player.pos : new THREE.Vector3();
    this.nodes.update(dt, p.x, p.z);
    this.grass.update(p.x, p.z);
    this.sky.update(G.time.hour, p, this.waterMat);
  }
}
