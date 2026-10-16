// Chibi characters built from coloured primitives, with a small procedural
// animation rig (walk, idle, swing, whip, cast, dig, pet, cheer).
import * as THREE from '../three.js';
import { part, merge, P } from '../core/geo.js';
import { MAT } from '../world/materials.js';
import { clamp, lerp } from '../core/game.js';

export const SKIN = [0xffdcc0, 0xf5c7a1, 0xe0a47a, 0xc68457, 0x9a6440, 0x6e4529];
export const HAIR = [0x3b2a20, 0x6b4428, 0xa8683a, 0xe0b25a, 0xf2e2b0, 0xb8432f, 0x2c2c38, 0x8b8f9c, 0xe58fb5, 0x4f8fd6, 0x5aa864];
export const CLOTH = [0x4e8fd1, 0xe0644b, 0x5cae5a, 0xf0c04a, 0x8f63c9, 0xf09a3e, 0x3fb1a8, 0xd85f8f, 0xf2efe6, 0x6d7b8c, 0x8b5a3c, 0x2f4b7a];

const smooth = { flat: false, jitter: 0 };

function hairParts(look, parts) {
  const hc = look.hair;
  const style = look.hairStyle || 'short';
  if (style === 'bald') return;
  // cap over the top and back of the head
  const cap = new THREE.SphereGeometry(0.43, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.52);
  parts.push(part(cap, hc, { ...smooth, y: 0.38, rx: -0.32, sx: 1.04, sy: 1.0, sz: 1.04 }));
  // fringe
  for (let i = -2; i <= 2; i++) {
    parts.push(part(P.sphere(0.12, 8, 6), hc, { ...smooth, x: i * 0.11, y: 0.55 - Math.abs(i) * 0.03, z: 0.31 - Math.abs(i) * 0.03, sy: 0.75, sz: 0.6 }));
  }
  if (style === 'long' || style === 'bob') {
    const len = style === 'long' ? 0.55 : 0.28;
    parts.push(part(P.sphere(0.4, 12, 8), hc, { ...smooth, y: 0.3 - len * 0.35, z: -0.12, sx: 1.08, sy: 0.6 + len, sz: 0.8 }));
  }
  if (style === 'ponytail') {
    parts.push(part(P.sphere(0.16, 10, 8), hc, { ...smooth, y: 0.42, z: -0.44, sy: 1.5 }));
    parts.push(part(P.sphere(0.06, 6, 5), look.accent ?? 0xe0644b, { ...smooth, y: 0.55, z: -0.4 }));
  }
  if (style === 'bun') parts.push(part(P.sphere(0.17, 10, 8), hc, { ...smooth, y: 0.82, z: -0.12 }));
  if (style === 'twin') {
    parts.push(part(P.sphere(0.14, 10, 8), hc, { ...smooth, x: 0.4, y: 0.42, z: -0.1, sy: 1.4 }));
    parts.push(part(P.sphere(0.14, 10, 8), hc, { ...smooth, x: -0.4, y: 0.42, z: -0.1, sy: 1.4 }));
  }
  if (style === 'spiky') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      parts.push(part(P.cone(0.1, 0.3, 6), hc, { x: Math.cos(a) * 0.22, y: 0.74, z: Math.sin(a) * 0.22 - 0.05, rz: -Math.cos(a) * 0.6, rx: Math.sin(a) * 0.6, jitter: 0 }));
    }
  }
}

function hatParts(look, parts) {
  const h = look.hat;
  const c = look.hatColor ?? 0x9a7148;
  if (!h) return;
  if (h === 'explorer') {
    parts.push(part(P.cyl(0.6, 0.62, 0.05, 16), c, { y: 0.6, jitter: 0.02 }));
    parts.push(part(P.cyl(0.33, 0.4, 0.3, 14), c, { y: 0.76, jitter: 0.02 }));
    parts.push(part(P.cyl(0.405, 0.405, 0.07, 14), look.hatBand ?? 0x5a3a24, { y: 0.66, jitter: 0 }));
  } else if (h === 'straw') {
    parts.push(part(P.cyl(0.68, 0.7, 0.04, 18), 0xf0d27a, { y: 0.6, jitter: 0.03 }));
    parts.push(part(P.sphere(0.36, 12, 7, ), 0xf0d27a, { ...smooth, y: 0.64, sy: 0.75 }));
    parts.push(part(P.cyl(0.37, 0.37, 0.06, 14), c, { y: 0.66, jitter: 0 }));
  } else if (h === 'cap') {
    parts.push(part(new THREE.SphereGeometry(0.44, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), c, { ...smooth, y: 0.44 }));
    parts.push(part(P.cyl(0.3, 0.3, 0.04, 12, false), c, { y: 0.46, z: 0.34, sz: 0.9, sx: 1.1 }));
  } else if (h === 'beanie') {
    parts.push(part(new THREE.SphereGeometry(0.45, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), c, { ...smooth, y: 0.42 }));
    parts.push(part(P.torus(0.42, 0.06, 6, 16), look.hatBand ?? 0xffffff, { y: 0.47, rx: Math.PI / 2, jitter: 0 }));
    parts.push(part(P.sphere(0.1, 8, 6), look.hatBand ?? 0xffffff, { ...smooth, y: 0.9 }));
  } else if (h === 'chef') {
    parts.push(part(P.cyl(0.36, 0.36, 0.22, 14), 0xffffff, { y: 0.7, jitter: 0 }));
    parts.push(part(P.sphere(0.34, 12, 8), 0xffffff, { ...smooth, y: 0.95, sx: 1.25, sz: 1.25, sy: 0.8 }));
  } else if (h === 'captain') {
    parts.push(part(P.cyl(0.55, 0.58, 0.06, 3), c, { y: 0.62, ry: Math.PI / 6, jitter: 0 }));
    parts.push(part(P.sphere(0.36, 12, 8), c, { ...smooth, y: 0.66, sy: 0.7 }));
    parts.push(part(P.sphere(0.08, 6, 5), 0xf2d16b, { ...smooth, y: 0.78, z: 0.3 }));
  } else if (h === 'crown') {
    parts.push(part(P.cyl(0.3, 0.3, 0.16, 8, true), 0xf2c94c, { y: 0.78, jitter: 0 }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; parts.push(part(P.cone(0.06, 0.16, 4), 0xf2c94c, { x: Math.cos(a) * 0.28, y: 0.92, z: Math.sin(a) * 0.28, jitter: 0 })); }
  } else if (h === 'hood') {
    parts.push(part(new THREE.SphereGeometry(0.5, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.62), c, { ...smooth, y: 0.36, rx: -0.45 }));
  } else if (h === 'bandana') {
    parts.push(part(new THREE.SphereGeometry(0.445, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), c, { ...smooth, y: 0.42, rx: -0.25 }));
    parts.push(part(P.sphere(0.08, 6, 5), c, { ...smooth, y: 0.45, z: -0.44 }));
  } else if (h === 'flower') {
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; parts.push(part(P.sphere(0.07, 6, 5), look.hatColor ?? 0xff8fb8, { ...smooth, x: 0.3 + Math.cos(a) * 0.07, y: 0.62 + Math.sin(a) * 0.07, z: 0.2 })); }
    parts.push(part(P.sphere(0.05, 6, 5), 0xffe066, { ...smooth, x: 0.3, y: 0.62, z: 0.24 }));
  } else if (h === 'horns') {
    parts.push(part(P.cone(0.07, 0.3, 6), 0xf3ead6, { x: 0.25, y: 0.75, rz: -0.4 }));
    parts.push(part(P.cone(0.07, 0.3, 6), 0xf3ead6, { x: -0.25, y: 0.75, rz: 0.4 }));
    parts.push(part(P.cyl(0.42, 0.42, 0.1, 14), c, { y: 0.6, jitter: 0 }));
  } else if (h === 'mushroom') {
    parts.push(part(new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xd9443a, { ...smooth, y: 0.55, sy: 0.65 }));
    parts.push(part(P.cyl(0.74, 0.6, 0.08, 16), 0xf6eadb, { ...smooth, y: 0.55 }));
    for (let i = 0; i < 7; i++) { const a = i * 0.9; parts.push(part(P.sphere(0.1, 6, 4), 0xffffff, { ...smooth, x: Math.cos(a) * 0.45, y: 0.86 - (i % 2) * 0.08, z: Math.sin(a) * 0.45, sy: 0.5 })); }
  } else if (h === 'leafcrown') {
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; parts.push(part(P.sphere(0.09, 6, 4), 0x5fbf4a, { x: Math.cos(a) * 0.4, y: 0.62, z: Math.sin(a) * 0.4, sy: 0.5, sz: 1.6, ry: -a })); }
  }
}

export function buildCharacter(look = {}) {
  const L = {
    skin: SKIN[1], hair: HAIR[1], hairStyle: 'short', shirt: CLOTH[0], pants: 0x4a5a78, shoes: 0x5a3a28,
    hat: null, scale: 1, width: 1, ...look,
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const mk = (parts) => { const m = new THREE.Mesh(merge(parts), MAT.char); m.castShadow = true; return m; };

  // torso
  const tp = [];
  tp.push(part(P.cyl(0.24, 0.3, 0.5, 12), L.shirt, { ...smooth, y: 0.82, sx: L.width }));
  tp.push(part(P.cyl(0.305, 0.305, 0.07, 12), L.belt ?? 0x5a3a24, { ...smooth, y: 0.6, sx: L.width }));
  tp.push(part(P.sphere(0.2, 10, 6), L.shirt, { ...smooth, y: 1.04, sy: 0.45, sx: 1.45 * L.width }));
  if (L.apron) tp.push(part(P.box(0.4, 0.42, 0.04), L.apron, { y: 0.74, z: 0.28, rx: -0.12, jitter: 0 }));
  if (L.vest) {
    tp.push(part(P.cyl(0.255, 0.31, 0.4, 12, true), L.vest, { ...smooth, y: 0.86, sx: L.width * 1.02 }));
  }
  if (L.backpack) {
    tp.push(part(P.box(0.42, 0.46, 0.22), L.backpack, { y: 0.84, z: -0.36, jitter: 0.03 }));
    tp.push(part(P.box(0.44, 0.14, 0.24), 0x7a5232, { y: 1.02, z: -0.36, jitter: 0.02 }));
    tp.push(part(P.cyl(0.1, 0.1, 0.5, 8), L.bedroll ?? 0x4f8a64, { y: 1.12, z: -0.36, rz: Math.PI / 2 }));
  }
  if (L.cape) tp.push(part(P.box(0.55, 0.6, 0.04), L.cape, { y: 0.78, z: -0.31, rx: 0.12, jitter: 0.02 }));
  tp.push(part(P.cyl(0.09, 0.1, 0.1, 8), L.skin, { ...smooth, y: 1.08 }));
  const torso = mk(tp);
  body.add(torso);

  // head
  const head = new THREE.Group();
  head.position.y = 1.08;
  const hp = [];
  hp.push(part(P.sphere(0.4, 16, 12), L.skin, { ...smooth, y: 0.36, sx: 1.06, sy: 0.96 }));
  hp.push(part(P.sphere(0.05, 6, 5), L.skin, { ...smooth, x: 0.41, y: 0.33, sx: 0.6 }));
  hp.push(part(P.sphere(0.05, 6, 5), L.skin, { ...smooth, x: -0.41, y: 0.33, sx: 0.6 }));
  const eye = L.eyes ?? 0x2a2018;
  hp.push(part(P.sphere(0.06, 8, 6), eye, { ...smooth, x: 0.14, y: 0.36, z: 0.355, sy: 1.45, sz: 0.55 }));
  hp.push(part(P.sphere(0.06, 8, 6), eye, { ...smooth, x: -0.14, y: 0.36, z: 0.355, sy: 1.45, sz: 0.55 }));
  hp.push(part(P.sphere(0.022, 5, 4), 0xffffff, { ...smooth, x: 0.155, y: 0.395, z: 0.39 }));
  hp.push(part(P.sphere(0.022, 5, 4), 0xffffff, { ...smooth, x: -0.125, y: 0.395, z: 0.39 }));
  hp.push(part(P.sphere(0.055, 8, 5), 0xff9a9a, { ...smooth, x: 0.25, y: 0.26, z: 0.305, sy: 0.55, sz: 0.4 }));
  hp.push(part(P.sphere(0.055, 8, 5), 0xff9a9a, { ...smooth, x: -0.25, y: 0.26, z: 0.305, sy: 0.55, sz: 0.4 }));
  hp.push(part(P.box(0.08, 0.018, 0.02), 0x8a4a3a, { x: 0, y: 0.22, z: 0.385, jitter: 0 }));
  if (L.beard) hp.push(part(P.sphere(0.3, 10, 8), L.beard, { ...smooth, y: 0.14, z: 0.18, sx: 1.05, sy: 0.75, sz: 0.7 }));
  if (L.mustache) { hp.push(part(P.sphere(0.07, 6, 5), L.mustache, { ...smooth, x: 0.06, y: 0.26, z: 0.37, sx: 1.4, sy: 0.6 })); hp.push(part(P.sphere(0.07, 6, 5), L.mustache, { ...smooth, x: -0.06, y: 0.26, z: 0.37, sx: 1.4, sy: 0.6 })); }
  if (L.glasses) {
    hp.push(part(P.torus(0.075, 0.015, 5, 12), 0x3a3a44, { x: 0.14, y: 0.36, z: 0.39, jitter: 0 }));
    hp.push(part(P.torus(0.075, 0.015, 5, 12), 0x3a3a44, { x: -0.14, y: 0.36, z: 0.39, jitter: 0 }));
  }
  hairParts(L, hp);
  hatParts(L, hp);
  const headMesh = mk(hp);
  head.add(headMesh);
  body.add(head);

  // arms
  const mkArm = (side) => {
    const g = new THREE.Group();
    g.position.set(0.32 * side * L.width, 1.0, 0);
    const ap = [];
    ap.push(part(P.capsule(0.085, 0.2, 3, 8), L.sleeve ?? L.shirt, { ...smooth, y: -0.14 }));
    ap.push(part(P.capsule(0.075, 0.12, 3, 8), L.skin, { ...smooth, y: -0.32 }));
    ap.push(part(P.sphere(0.085, 8, 6), L.gloves ?? L.skin, { ...smooth, y: -0.42 }));
    g.add(mk(ap));
    g.rotation.z = 0.12 * side;
    const socket = new THREE.Group();
    socket.position.set(0, -0.44, 0.02);
    g.add(socket);
    g.userData.socket = socket;
    body.add(g);
    return g;
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // legs
  const mkLeg = (side) => {
    const g = new THREE.Group();
    g.position.set(0.13 * side * L.width, 0.58, 0);
    const lp = [];
    lp.push(part(P.capsule(0.105, 0.26, 3, 8), L.pants, { ...smooth, y: -0.24 }));
    lp.push(part(P.sphere(0.13, 10, 7), L.shoes, { ...smooth, y: -0.5, z: 0.05, sx: 0.9, sy: 0.6, sz: 1.35 }));
    g.add(mk(lp));
    body.add(g);
    return g;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // blob shadow keeps characters grounded even when real shadows are off
  const blob = new THREE.Mesh(P.disc(0.42, 14), MAT.shadowBlob);
  blob.position.y = 0.03;
  blob.renderOrder = 2;
  root.add(blob);

  root.scale.setScalar(L.scale);
  return { root, body, torso, head, armL, armR, legL, legR, socket: armR.userData.socket, blob, look: L };
}

// Procedural animation driver
export class Rig {
  constructor(ch) {
    this.ch = ch;
    this.phase = 0;
    this.t = Math.random() * 10;
    this.action = null;
    this.actionT = 0;
    this.actionDur = 0.4;
    this.onHit = null;
    this.hitDone = false;
    this.headTurn = 0;
  }
  play(action, dur = 0.4, onHit = null) {
    this.action = action; this.actionT = 0; this.actionDur = dur; this.onHit = onHit; this.hitDone = false;
  }
  get busy() { return !!this.action && this.action !== 'hold' && this.action !== 'sit'; }
  update(dt, speed = 0) {
    const c = this.ch;
    this.t += dt;
    const sp = clamp(speed, 0, 1.6);
    this.phase += dt * (6 + sp * 6) * (sp > 0.05 ? 1 : 0);
    const s = Math.sin(this.phase);
    const walkW = clamp(sp, 0, 1);
    // base pose
    let armLx = -s * 0.75 * walkW, armRx = s * 0.75 * walkW;
    let legLx = s * 0.8 * walkW, legRx = -s * 0.8 * walkW;
    let bodyY = Math.abs(Math.cos(this.phase)) * 0.07 * walkW;
    let lean = 0.06 * walkW;
    let headX = 0, armRz = 0.12, armLz = -0.12;
    if (walkW < 0.05) { // idle breathing
      const b = Math.sin(this.t * 2.2);
      bodyY = b * 0.012; armLx = b * 0.04; armRx = -b * 0.04;
    }
    if (this.action) {
      this.actionT += dt / this.actionDur;
      const k = clamp(this.actionT, 0, 1);
      const hitAt = 0.55;
      if (!this.hitDone && k >= hitAt && this.onHit) { this.hitDone = true; const f = this.onHit; this.onHit = null; f(); }
      switch (this.action) {
        case 'swing': { // axe / pickaxe: wind up then chop down
          const wind = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55;
          armRx = k < 0.45 ? lerp(0, -2.7, wind) : lerp(1.0, -2.7, wind);
          armLx = armRx * 0.6; lean = k < 0.45 ? -0.1 : 0.25 * (1 - k);
          armRz = 0.05;
          break;
        }
        case 'dig': {
          const w = Math.sin(k * Math.PI);
          armRx = -0.4 + w * 1.4; armLx = -0.6 + w * 1.2; lean = 0.25 * w;
          break;
        }
        case 'whip': {
          armRx = k < 0.35 ? lerp(0, -2.4, k / 0.35) : lerp(-2.4, 1.3, Math.min(1, (k - 0.35) / 0.25));
          lean = k > 0.4 ? 0.15 : -0.05;
          break;
        }
        case 'net': {
          armRx = k < 0.3 ? lerp(0, -2.0, k / 0.3) : lerp(-2.0, 0.9, Math.min(1, (k - 0.3) / 0.4));
          armLx = armRx * 0.3; lean = 0.1;
          break;
        }
        case 'cast': {
          armRx = k < 0.4 ? lerp(0, -2.6, k / 0.4) : lerp(-2.6, -0.9, Math.min(1, (k - 0.4) / 0.3));
          armLx = armRx * 0.5;
          break;
        }
        case 'hold': { armRx = -0.9; armLx = -0.5; this.actionT = 0.5; break; }
        case 'reel': { armRx = -0.9 + Math.sin(this.t * 18) * 0.15; armLx = -0.6 + Math.cos(this.t * 18) * 0.25; this.actionT = 0.5; break; }
        case 'pet': { armRx = -1.1 + Math.sin(k * Math.PI * 4) * 0.3; lean = 0.3; headX = 0.3; break; }
        case 'cheer': { const w = Math.sin(k * Math.PI); armRx = -2.8 * w; armLx = -2.8 * w; armRz = 0.4 * w; armLz = -0.4 * w; bodyY += 0.25 * w; break; }
        case 'eat': { armRx = -1.6 - Math.sin(k * Math.PI * 6) * 0.2; headX = 0.15; break; }
        case 'talk': { armRx = -0.5 + Math.sin(k * Math.PI * 3) * 0.3; break; }
        case 'hurt': { lean = -0.35 * Math.sin(k * Math.PI); break; }
        case 'sit': { legLx = -1.4; legRx = -1.4; bodyY = -0.25; this.actionT = 0.5; break; }
        case 'place': { armRx = -1.0 * Math.sin(k * Math.PI); armLx = armRx; lean = 0.2 * Math.sin(k * Math.PI); break; }
      }
      if (this.actionT >= 1 && this.action !== 'hold' && this.action !== 'reel' && this.action !== 'sit') {
        if (this.onHit) { const f = this.onHit; this.onHit = null; f(); }
        this.action = null;
      }
    }
    c.armL.rotation.x = armLx; c.armR.rotation.x = armRx;
    c.armL.rotation.z = armLz; c.armR.rotation.z = armRz;
    c.legL.rotation.x = legLx; c.legR.rotation.x = legRx;
    c.body.position.y = bodyY;
    c.body.rotation.x = lean;
    c.head.rotation.x = headX - lean * 0.6;
    c.head.rotation.y = lerp(c.head.rotation.y, this.headTurn, Math.min(1, dt * 6));
  }
}
