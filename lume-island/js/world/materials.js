// Shared materials. Almost everything is vertex coloured so one material can
// draw thousands of differently coloured faces.
import * as THREE from '../three.js';

export const MAT = {};
export const windUniform = { value: 0 };
// "see-through" hole around the player for canopies and roofs
export const seeUniforms = {
  uSeeScreen: { value: new THREE.Vector2(-9999, -9999) },
  uSeeDepth: { value: 0 },
  uSeeR: { value: 0 },
};

function patch(mat, { wind = null, keepNormal = false, see = false } = {}) {
  mat.onBeforeCompile = (shader) => {
    if (wind) {
      shader.uniforms.uWind = windUniform;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 wp0 = vec3(0.0);
          #ifdef USE_INSTANCING
            wp0 = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #else
            wp0 = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #endif
          float hk = max(0.0, position.y - ${wind.h.toFixed(2)});
          float ph = uWind * 1.7 + wp0.x * 0.21 + wp0.z * 0.17;
          transformed.x += sin(ph) * ${wind.s.toFixed(3)} * hk;
          transformed.z += cos(ph * 0.83 + 1.3) * ${(wind.s * 0.7).toFixed(3)} * hk;
        }`);
    }
    if (keepNormal) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);');
    }
    if (see) {
      Object.assign(shader.uniforms, seeUniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uSeeScreen;\nuniform float uSeeDepth;\nuniform float uSeeR;')
        .replace('void main() {', `void main() {
          {
            float sd = length(gl_FragCoord.xy - uSeeScreen);
            if (sd < uSeeR && vViewPosition.z < uSeeDepth - 1.2) {
              float k = sd / uSeeR;
              vec2 q = floor(gl_FragCoord.xy);
              float bayer = fract(q.x * 0.5 + q.y * 0.75 + fract(q.x * 0.25) * 0.5);
              if (k < 0.62 || bayer > (k - 0.62) / 0.38) discard;
            }
          }`);
    }
  };
  mat.customProgramCacheKey = () => 'p' + (wind ? wind.s + '_' + wind.h : '') + (keepNormal ? 'k' : '') + (see ? 's' : '');
  return mat;
}

export function initMaterials() {
  MAT.world = new THREE.MeshLambertMaterial({ vertexColors: true });
  MAT.worldDS = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  MAT.foliage = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { wind: { s: 0.025, h: 1.2 }, see: true });
  MAT.trunk = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { see: true });
  MAT.roof = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { see: true });
  MAT.grass = patch(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { wind: { s: 0.22, h: 0.05 }, keepNormal: true });
  MAT.glowWarm = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffb04a, emissiveIntensity: 0 });
  MAT.glowCool = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x6fe6ff, emissiveIntensity: 0.55 });
  MAT.glowMagic = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xb98cff, emissiveIntensity: 0.6 });
  MAT.lava = new THREE.MeshBasicMaterial({ color: 0xff6a1a });
  MAT.unlit = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.unlitDS = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  MAT.char = new THREE.MeshLambertMaterial({ vertexColors: true });
  MAT.ghost = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.72, emissive: 0x8fd8ff, emissiveIntensity: 0.25 });
  MAT.shadowBlob = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
  MAT.beam = new THREE.MeshBasicMaterial({ color: 0xfff6b0, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  MAT.ghostPreviewOk = new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.45, depthWrite: false });
  MAT.ghostPreviewBad = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.45, depthWrite: false });
  return MAT;
}

// Night factor drives window / lantern glow
export function setNightGlow(k) {
  MAT.glowWarm.emissiveIntensity = 0.08 + k * 1.1;
}

const _v = new THREE.Vector3();
export function updateSeeThrough(camera, renderer, pos, zoom, enabled = true) {
  if (!enabled) { seeUniforms.uSeeR.value = 0; return; }
  _v.set(pos.x, pos.y + 1.0, pos.z).project(camera);
  const pr = renderer.getPixelRatio();
  const w = renderer.domElement.width, h = renderer.domElement.height;
  seeUniforms.uSeeScreen.value.set((_v.x * 0.5 + 0.5) * w, (_v.y * 0.5 + 0.5) * h);
  _v.set(pos.x, pos.y + 1.0, pos.z).applyMatrix4(camera.matrixWorldInverse);
  seeUniforms.uSeeDepth.value = -_v.z;
  seeUniforms.uSeeR.value = 95 * pr / Math.max(0.5, zoom) * (h / pr / 800);
}
