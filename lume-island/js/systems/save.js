// Save slots in localStorage (wrapped in try/catch: storage can be blocked).
import { G } from '../core/game.js';
import { SAVE_VERSION } from './state.js';

const KEY = 'lume-island-save-';
const SETTINGS_KEY = 'lume-island-settings';

export function storageOK() {
  try { const k = '__lume_test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch { return false; }
}

export function collect() {
  const s = G.save;
  const p = G.player;
  s.hp = p.hp; s.maxHp = p.maxHp;
  s.day = G.time.day; s.minutes = G.time.minutes;
  if (G.level === G.overworld) { s.level = 'overworld'; s.x = +p.pos.x.toFixed(2); s.z = +p.pos.z.toFixed(2); }
  else if (G.level.exitTo) { s.level = 'overworld'; s.x = G.level.exitTo.x; s.z = G.level.exitTo.z; }
  s.inv = G.inv.serialize();
  s.invSize = G.inv.size;
  s.world.nodes = G.overworld.nodes.serialize();
  s.placed = G.placed.serialize();
  s.savedAt = Date.now();
  G.events.emit('beforeSave', s);
  return s;
}

export function saveGame(reason = 'manual') {
  if (!G.started) return false;
  const data = collect();
  let ok = false;
  try {
    localStorage.setItem(KEY + G.slot, JSON.stringify(data));
    ok = true;
  } catch (e) { console.warn('save failed', e); }
  if (reason === 'manual') G.ui.toast(ok ? 'Game saved.' : 'Could not save: this browser is blocking storage.', ok ? 'good' : 'warn');
  else if (ok && reason === 'sleep') G.ui.toast('Game saved.', 'good', 1800);
  return ok;
}

export function readSlot(slot) {
  try {
    const raw = localStorage.getItem(KEY + slot);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.version > SAVE_VERSION) return null;
    return d;
  } catch { return null; }
}
export function deleteSlot(slot) { try { localStorage.removeItem(KEY + slot); } catch { /* ignore */ } }
export function listSlots() {
  const out = [];
  for (let i = 1; i <= 3; i++) {
    const d = readSlot(i);
    out.push(d ? { slot: i, name: d.name, day: d.day, coins: d.coins, savedAt: d.savedAt, difficulty: d.difficulty, peaceful: d.peaceful } : { slot: i, empty: true });
  }
  return out;
}
export function latestSlot() {
  let best = null;
  for (const s of listSlots()) if (!s.empty && (!best || (s.savedAt || 0) > (best.savedAt || 0))) best = s;
  return best;
}

export const DEFAULT_SETTINGS = {
  quality: 'high', smartTools: true, autoRun: false, arachnophobia: false, music: 0.5, sfx: 0.7, master: 0.8,
  dayLength: 16, showTracker: true, cameraShake: true, viewScale: 1,
};
export function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) }; } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); } catch { /* ignore */ }
}
