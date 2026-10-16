// Recipe availability, ingredient counting (inventory + nearby chests) and
// timed station jobs.
import { G } from '../core/game.js';
import { ITEMS } from '../data/items.js';
import { RECIPES, RECIPE_BY_ID, TAGS, TAG_NAMES, COFFER_LOOT } from '../data/recipes.js';
import { PROFESSIONS } from '../data/professions.js';

export function recipeUnlocked(rc) {
  const u = rc.unlock;
  if (u === 'start') return true;
  if (u === 'bp' || u === 'book') return G.save.recipes.includes(rc.id);
  if (u && u.prof) return (G.save.professions[u.prof]?.level || 0) >= u.lvl;
  return false;
}
export function lockReason(rc) {
  const u = rc.unlock;
  if (u === 'bp') return `Blueprint from Bram in Lumenbrook (${rc.bp} coins)`;
  if (u === 'book') return 'Learned from an Ancient Book';
  if (u && u.prof) {
    const p = PROFESSIONS[u.prof];
    const lvl = G.save.professions[u.prof]?.level || 0;
    return lvl ? `${p.name} level ${u.lvl}` : `Needs the ${p.name} permit`;
  }
  return 'Locked';
}
export function recipesFor(station) { return RECIPES.filter((r) => r.st === station); }

export function nearbySources(x, z) {
  const src = [G.inv];
  for (const o of G.placed?.inLevel(G.level.id) || []) {
    if (o.type === 'chest' && Math.hypot(o.x - x, o.z - z) < 14) src.push(o.chest);
  }
  return src;
}
function matches(ing, id) {
  if (ing.startsWith('#')) return TAGS[ing.slice(1)](ITEMS[id]);
  return ing === id;
}
export function countIng(sources, ing) {
  let n = 0;
  for (const s of sources) for (const sl of s.slots) if (sl && matches(ing, sl.id)) n += sl.qty;
  return n;
}
export function ingName(ing) { return ing.startsWith('#') ? TAG_NAMES[ing.slice(1)] : ITEMS[ing]?.name ?? ing; }
export function ingIcon(ing) {
  if (!ing.startsWith('#')) return ing;
  return { berry: 'red_berry', flower: 'daisy', mushroom: 'meadow_mushroom' }[ing.slice(1)];
}
export function maxCraftable(rc, sources) {
  let m = 999;
  for (const [ing, q] of rc.ins) m = Math.min(m, Math.floor(countIng(sources, ing) / q));
  if (rc.energy) m = Math.min(m, Math.floor((G.save.lumaEnergy || 0) / rc.energy));
  return m;
}
export function consume(rc, sources, n) {
  for (const [ing, q] of rc.ins) {
    let left = q * n;
    for (const s of sources) {
      for (let i = 0; i < s.slots.length && left > 0; i++) {
        const sl = s.slots[i];
        if (!sl || !matches(ing, sl.id)) continue;
        const a = Math.min(sl.qty, left);
        sl.qty -= a; left -= a;
        if (sl.qty <= 0) s.slots[i] = null;
      }
    }
  }
  if (rc.energy) G.save.lumaEnergy -= rc.energy * n;
  G.events.emit('inv');
}

// ---- station jobs ----
export function addJob(st, rc, n) {
  const now = G.time.total;
  const q = st.data.queue;
  const start = q.length ? null : now;
  q.push({ r: rc.id, n, done: 0, start });
}
function produce(st, rc) {
  const out = st.out;
  const add = (id, qty) => out.add(id, qty);
  if (rc.loot) {
    const table = COFFER_LOOT[rc.loot];
    let tot = 0; for (const e of table) tot += e[1];
    let x = Math.random() * tot, pick = table[0][0];
    for (const e of table) { x -= e[1]; if (x <= 0) { pick = e[0]; break; } }
    add(pick, 1);
    if (Math.random() < 0.3) add('old_coin', 1);
  } else if (rc.chance !== undefined) {
    if (Math.random() < rc.chance) add(rc.out[0], rc.out[1]); else if (rc.fail) add(rc.fail[0], rc.fail[1]);
  } else add(rc.out[0], rc.out[1]);
  if (rc.bonus) for (const [id, q, ch] of rc.bonus) if (Math.random() < ch) add(id, q);
  G.save.stats.crafted = (G.save.stats.crafted || 0) + 1;
  G.events.emit('crafted', rc.out[0], rc.out[1], rc);
}
export function processStation(st) {
  const q = st.data.queue;
  const now = G.time.total;
  let guard = 0;
  while (q.length && guard++ < 200) {
    const job = q[0];
    const rc = RECIPE_BY_ID[job.r];
    if (!rc) { q.shift(); continue; }
    if (job.start === null || job.start === undefined) job.start = now;
    const dur = Math.max(1, rc.time);
    const finished = Math.min(job.n, Math.floor((now - job.start) / dur));
    while (job.done < finished) { produce(st, rc); job.done++; }
    if (job.done >= job.n) {
      q.shift();
      if (q.length) q[0].start = job.start + job.n * dur;
    } else break;
  }
}
export function jobProgress(st) {
  const job = st.data.queue[0];
  if (!job) return 0;
  const rc = RECIPE_BY_ID[job.r];
  const dur = Math.max(1, rc.time);
  return Math.min(1, ((G.time.total - job.start) % dur) / dur);
}
export function isWorking(st) { return st.data.queue.length > 0; }
