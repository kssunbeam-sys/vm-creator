// Stylised water: depth-tinted, shore foam, gentle waves, sparkles.
import * as THREE from '../three.js';
import { HALF } from './terrain.js';

const vert = /* glsl */`
uniform float uTime;
uniform float uWaveAmp;
varying vec3 vW;
varying float vFogDepth;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  float t = uTime;
  w.y += (sin(w.x * 0.18 + t * 1.1) * 0.07 + cos(w.z * 0.15 + t * 0.9) * 0.07 + sin((w.x - w.z) * 0.32 + t * 1.9) * 0.025) * uWaveAmp;
  vW = w.xyz;
  vec4 mv = viewMatrix * w;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */`
uniform sampler2D uDepth;
uniform float uHalf;
uniform float uTime;
uniform float uDepthScale;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uFoam;
uniform vec3 uLight;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uUseDepthTex;
uniform float uConstDepth;
varying vec3 vW;
varying float vFogDepth;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 uv = (vW.xz + uHalf) / (2.0 * uHalf);
  float depth = uUseDepthTex > 0.5 ? texture2D(uDepth, uv).r * uDepthScale : uConstDepth;
  float t = smoothstep(0.0, 5.0, depth);
  vec3 col = mix(uShallow, uDeep, t);
  float n = vnoise(vW.xz * 0.35 + vec2(uTime * 0.25, uTime * 0.18)) + vnoise(vW.xz * 0.7 - vec2(uTime * 0.2, -uTime * 0.27));
  col += (n - 1.0) * 0.045;
  float cells = vnoise(vW.xz * 1.3 + vec2(uTime * 0.4, uTime * 0.31));
  col += smoothstep(0.62, 0.78, cells) * 0.05 * (1.0 - t);
  float shore = 1.0 - smoothstep(0.0, 0.9, depth);
  float ripple = sin(depth * 8.0 - uTime * 2.1 + n * 2.0) * 0.5 + 0.5;
  float foam = step(0.8, shore * 0.55 + ripple * shore * 0.6 + n * 0.12 * shore) + step(0.88, shore);
  foam = clamp(foam, 0.0, 1.0);
  float sp = step(0.988, vnoise(vW.xz * 2.4 + uTime * 0.55)) * (0.6 + 0.4 * t);
  col = mix(col, uFoam, max(foam * 0.92, sp * 0.65));
  col *= uLight;
  float alpha = mix(0.58, 0.97, t);
  alpha = max(alpha, foam);
  float fogF = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
  col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

export function createWaterMaterial(depthTex, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveAmp: { value: opts.waveAmp ?? 1 },
      uDepth: { value: depthTex },
      uHalf: { value: opts.half ?? HALF },
      uDepthScale: { value: 8 },
      uUseDepthTex: { value: depthTex ? 1 : 0 },
      uConstDepth: { value: opts.constDepth ?? 8 },
      uShallow: { value: new THREE.Color(opts.shallow ?? 0x43d8cf) },
      uDeep: { value: new THREE.Color(opts.deep ?? 0x1d6fb5) },
      uFoam: { value: new THREE.Color(0xffffff) },
      uLight: { value: new THREE.Color(1, 1, 1) },
      uFogColor: { value: new THREE.Color(0x9fd4f2) },
      uFogDensity: { value: 0 },
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
  });
}

export function createOcean(depthTex) {
  const group = new THREE.Group();
  group.name = 'water';
  const mat = createWaterMaterial(depthTex);
  const inner = HALF + 60;
  const g = new THREE.PlaneGeometry(inner * 2, inner * 2, 210, 210);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 1;
  group.add(m);
  // outer ring of open sea (low resolution, never overlaps the island)
  const outer = 2600;
  const ring = [
    [-outer, -outer, outer * 2, outer - inner],
    [-outer, inner, outer * 2, outer - inner],
    [-outer, -inner, outer - inner, inner * 2],
    [inner, -inner, outer - inner, inner * 2],
  ];
  for (const [x, z, w, d] of ring) {
    const pg = new THREE.PlaneGeometry(w, d, 8, 8);
    pg.rotateX(-Math.PI / 2);
    pg.translate(x + w / 2, 0, z + d / 2);
    const pm = new THREE.Mesh(pg, mat);
    pm.renderOrder = 1;
    group.add(pm);
  }
  group.userData.material = mat;
  return group;
}
