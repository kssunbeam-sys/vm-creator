// Sun, sky light, fog and the day/night cycle for the overworld.
import * as THREE from '../three.js';
import { clamp, lerp, smoothstep } from '../core/game.js';
import { setNightGlow } from './materials.js';

// hour, fog/bg, hemiSky, hemiGround, hemiIntensity, sunColor, sunIntensity
const KEYS = [
  [0, 0x0f1b3c, 0x4a62a0, 0x1c2336, 1.05, 0xa9bcff, 0.6],
  [4.6, 0x1b2b57, 0x5a6eaa, 0x232a3d, 1.1, 0xb0bcff, 0.55],
  [6.0, 0xf2b28b, 0xffcfae, 0x6f5d4a, 1.3, 0xffb07a, 1.7],
  [8.0, 0xa7d9f4, 0xd6eeff, 0x8f8a62, 1.55, 0xfff0d8, 2.55],
  [12.0, 0x95d2f4, 0xdff1ff, 0x939066, 1.65, 0xfffaf0, 2.85],
  [16.5, 0xa1d2ee, 0xdcedff, 0x8f8a62, 1.55, 0xffe8c6, 2.55],
  [18.6, 0xf59c6c, 0xffbc8d, 0x6c5242, 1.3, 0xff9858, 1.75],
  [20.1, 0x45396d, 0x7d6dab, 0x2a2439, 1.1, 0xa29aff, 0.62],
  [24, 0x0f1b3c, 0x4a62a0, 0x1c2336, 1.05, 0xa9bcff, 0.6],
];
const cA = new THREE.Color(), cB = new THREE.Color();

function sample(hour) {
  let i = 0;
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = smoothstep(0, 1, (hour - a[0]) / (b[0] - a[0]));
  const mix = (ka, kb) => cA.set(ka).lerp(cB.set(kb), t).clone();
  return {
    fog: mix(a[1], b[1]), hemiSky: mix(a[2], b[2]), hemiGround: mix(a[3], b[3]),
    hemiI: lerp(a[4], b[4], t), sun: mix(a[5], b[5]), sunI: lerp(a[6], b[6], t),
  };
}

export class Sky {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a8a60, 1.5);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.6);
    this.sun.castShadow = quality !== 'low';
    const s = this.sun.shadow;
    s.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
    this.shadowExtent = 38;
    s.camera.left = -this.shadowExtent; s.camera.right = this.shadowExtent;
    s.camera.top = this.shadowExtent; s.camera.bottom = -this.shadowExtent;
    s.camera.near = 1; s.camera.far = 220;
    s.bias = -0.0006; s.normalBias = 0.04;
    scene.add(this.sun);
    scene.add(this.sun.target);
    scene.fog = new THREE.FogExp2(0x9fd4f2, 0.0042);
    scene.background = new THREE.Color(0x9fd4f2);
    this.night = 0;
    this.lightTint = new THREE.Color(1, 1, 1);
    this.dir = new THREE.Vector3(0.4, 0.8, 0.3).normalize();
  }

  update(hour, target, waterMat) {
    const k = sample(hour);
    this.hemi.color.copy(k.hemiSky);
    this.hemi.groundColor.copy(k.hemiGround);
    this.hemi.intensity = k.hemiI;
    this.sun.color.copy(k.sun);
    this.sun.intensity = k.sunI;
    this.scene.fog.color.copy(k.fog);
    this.scene.background.copy(k.fog);
    this.night = 1 - smoothstep(0.75, 1.65, k.sunI);
    this.scene.fog.density = lerp(0.0042, 0.0065, this.night);
    setNightGlow(this.night);

    // sun path east -> west; moon from the north-west at night
    const ang = clamp((hour - 6) / 12, 0, 1) * Math.PI;
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.75, 0.5 + 0.5 * Math.sin(ang), 0.42).normalize();
    const moonDir = new THREE.Vector3(-0.35, 0.85, 0.4).normalize();
    const dayW = smoothstep(4.8, 6.4, hour) * (1 - smoothstep(18.4, 20.2, hour));
    this.dir.copy(moonDir).lerp(sunDir, dayW).normalize();

    // keep the shadow camera on the player, snapped to texels to avoid shimmer
    const ext = this.shadowExtent;
    const texel = (ext * 2) / this.sun.shadow.mapSize.x;
    const tx = Math.round(target.x / texel) * texel, tz = Math.round(target.z / texel) * texel;
    this.sun.target.position.set(tx, target.y, tz);
    this.sun.position.set(tx + this.dir.x * 90, target.y + this.dir.y * 90, tz + this.dir.z * 90);
    this.sun.target.updateMatrixWorld();

    // overall light tint for custom shaders (water)
    const lum = clamp((k.hemiI * 0.55 + k.sunI * 0.22) / 1.55, 0.25, 1.05);
    this.lightTint.copy(k.hemiSky).lerp(new THREE.Color(1, 1, 1), 0.55).multiplyScalar(lum);
    if (waterMat) {
      waterMat.uniforms.uLight.value.copy(this.lightTint);
      waterMat.uniforms.uFogColor.value.copy(k.fog);
      waterMat.uniforms.uFogDensity.value = this.scene.fog.density;
    }
  }
}
