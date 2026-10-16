// Tracks which biome / town the player is in, shows banners on arrival and
// records discovered towns.
import { G } from '../core/game.js';
import { CITIES, BIOMES, BIOME_BY_ID } from '../data/layout.js';

export class Locator {
  constructor() { this._t = 0; this.where = null; }
  update(dt) {
    this._t -= dt;
    if (this._t > 0) return;
    this._t = 0.4;
    if (G.level !== G.overworld) { G.ui.setPlace(G.level.title || G.level.id); return; }
    const p = G.player.pos;
    let where = null;
    for (const c of Object.values(CITIES)) if (Math.hypot(p.x - c.x, p.z - c.z) < c.r + 6) where = { key: c.id, name: c.name, city: true };
    // out over the sea (piers, boats) the last biome stays
    const rid = G.overworld.terrain.regionIdAt(p.x, p.z);
    const biome = rid ? BIOME_BY_ID[rid] : (this.lastBiome || 'meadow');
    this.lastBiome = biome;
    if (!where) where = { key: biome, name: BIOMES[biome].name };
    G.ui.setPlace(where.name);
    if (this.where && this.where.key !== where.key) {
      const seen = G.save.flags['seen_' + where.key];
      if (!seen) {
        G.save.flags['seen_' + where.key] = true;
        G.ui.banner(where.name, where.city ? 'Main town of the ' + BIOMES[CITIES[where.key].biome].short : 'New area discovered');
      }
      if (where.city) G.save.discovered[where.key] = true;
      G.events.emit('enterArea', where.key);
    }
    this.where = where;
    G.player.biome = biome;
  }
}
