// Renders 3D item models into small images for the inventory UI.
import * as THREE from '../three.js';
import { itemGeometry } from '../world/itemModels.js';
import { ITEMS } from '../data/items.js';

let renderer = null, scene, camera, mesh, mat;
const cache = new Map();
const SIZE = 96;

function init() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 2.2));
  const d = new THREE.DirectionalLight(0xffffff, 2.4);
  d.position.set(2, 4, 3);
  scene.add(d);
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  scene.add(mesh);
}

export function iconURL(id, opts = {}) {
  const key = id + '|' + (opts.tier ?? '');
  if (cache.has(key)) return cache.get(key);
  if (!renderer) init();
  const geo = itemGeometry(id, opts);
  mesh.geometry = geo;
  const it = ITEMS[id];
  const kind = it?.model?.k;
  mesh.rotation.set(0, 0, 0);
  if (it?.cat === 'tool') mesh.rotation.set(0, 0, -0.75);
  else if (kind === 'fish' || kind === 'eel' || kind === 'log') mesh.rotation.set(0.2, -0.5, 0.25);
  else if (kind === 'station') mesh.rotation.set(0, 0.6, 0);
  else mesh.rotation.set(0.25, -0.55, 0.05);
  mesh.updateMatrixWorld();
  const box = new THREE.Box3().setFromObject(mesh);
  const sph = box.getBoundingSphere(new THREE.Sphere());
  mesh.position.sub(sph.center);
  mesh.updateMatrixWorld();
  const dist = sph.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.04;
  camera.position.set(0, dist * 0.42, dist * 0.91);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  mesh.position.set(0, 0, 0);
  cache.set(key, url);
  return url;
}

export function clearIconCache(prefix) {
  for (const k of [...cache.keys()]) if (!prefix || k.startsWith(prefix)) cache.delete(k);
}

// Icon for an arbitrary vertex-coloured geometry (Lumas, the dog)
export function objectIconURL(key, makeGeometry) {
  if (cache.has(key)) return cache.get(key);
  if (!renderer) init();
  mesh.geometry = makeGeometry();
  mesh.rotation.set(0.15, -0.5, 0);
  mesh.position.set(0, 0, 0);
  mesh.updateMatrixWorld();
  const box = new THREE.Box3().setFromObject(mesh);
  const sph = box.getBoundingSphere(new THREE.Sphere());
  mesh.position.sub(sph.center);
  mesh.updateMatrixWorld();
  const dist = sph.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.02;
  camera.position.set(0, dist * 0.3, dist * 0.95);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  mesh.position.set(0, 0, 0);
  cache.set(key, url);
  return url;
}
