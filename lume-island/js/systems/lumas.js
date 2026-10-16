// Luma collection: hatching, petting and feeding for Luma Energy, companions
// and their abilities.
import * as THREE from '../three.js';
import { G } from '../core/game.js';
import { h, clear } from '../ui/dom.js';
import { makePanel } from '../ui/ui.js';
import { LUMAS, LUMA_BY_ID, ABILITIES } from '../data/lumas.js';
import { ITEMS } from '../data/items.js';
import { Companion, lumaGeometry, dogParts } from '../entities/luma.js';
import { icon } from '../ui/widgets.js';
import { objectIconURL } from '../ui/icons.js';
import { merge } from '../core/geo.js';

const HATCH_MINUTES = 600;

export function lumaIcon(species) {
  return objectIconURL('luma_' + species, () => { const g = lumaGeometry(species); return g.glow ? merge([g.body, g.glow]) : g.body; });
}

export class Lumas {
  constructor() {
    this.companion = null;
    this.resting = [];
    this.regenT = 0;
    this.sniffT = 0;
    this.incPanel = makePanel('Incubator', { cls: 'narrow' });
    this.nestPanel = makePanel('Your Lumas', { cls: 'wide' });
    G.events.on('gameStart', () => { this.spawnCompanion(); });
    G.events.on('levelChanged', (L) => { if (this.companion) { this.companion.detach(); this.pendingLevel = L; } this.clearResting(); });
  }
  get list() { return G.save.lumas; }
  activeSpec() {
    const a = G.save.activeLuma;
    if (!a) return null;
    if (a === 'dog') return { ability: 'treasure' };
    const l = this.list.find((x) => x.uid === a);
    return l ? LUMA_BY_ID[l.species] : null;
  }
  ability() { return this.activeSpec()?.ability || null; }
  has(kind) { return this.ability() === kind || (this.ability() === 'light' && kind !== 'treasure' && false); }
  abilityValue(kind) {
    const a = this.ability();
    if (a === 'light' && kind === 'darkness') return 99;
    const v = { darkness: 0.6, fish: 0.3, fishzone: 0.25, chest: 0.3, heal: 0.3, speed: 0.1, pick: 2 };
    return a === kind ? v[kind] ?? 1 : 0;
  }
  // drop bonuses for NodeField
  bonus(def) {
    const a = this.ability();
    const b = {};
    if (a === 'ore' && def.kind === 'rock') b.extra = 0.2;
    if (a === 'gem' && def.kind === 'rock') b.chance = 0.3;
    if (a === 'forage' && (def.kind === 'bush' || def.kind === 'plant')) b.extra = 0.25;
    if (a === 'wood' && def.kind === 'tree') b.extra = 0.25;
    if (a === 'lumaria') b.extra = 0.1;
    return b;
  }
  spawnCompanion() {
    if (this.companion) { this.companion.detach(); this.companion = null; }
    const a = G.save.activeLuma;
    G.player.speedBonus = 0;
    if (!a) return;
    let c;
    if (a === 'dog') { if (!G.save.flags.dog) return; c = new Companion('dog', {}); }
    else { const l = this.list.find((x) => x.uid === a); if (!l) return; c = new Companion('luma', l); }
    c.place(G.level, G.player.pos.x - 1.2, G.player.pos.z + 1.2);
    this.companion = c;
    if (this.ability() === 'speed') G.player.speedBonus = 0.1;
  }
  setActive(uid) {
    G.save.activeLuma = uid;
    this.spawnCompanion();
    G.ui.toast(uid === 'dog' ? 'Biscuit trots along beside you.' : `${this.companion?.name} is your companion now.`, 'magic');
  }
  today() { return G.time.day; }
  pet(target) {
    const data = target.data && target.kind === 'luma' ? target.data : target.kind === 'dog' ? null : target;
    G.player.rig.play('pet', 0.9);
    const pos = target.object ? target.object.position : G.player.pos;
    G.particles?.burst('hearts', pos.x, pos.y + 1, pos.z);
    target.showEmote?.('♥', 1.5);
    G.audio?.play('pet');
    if (!data) { G.ui.toast('Biscuit wags happily.', 'good'); return; }
    if (data.petDay === this.today()) { G.ui.toast(`${data.name} is happy. You already got today's energy from petting.`, 'info'); return; }
    data.petDay = this.today();
    this.addEnergy(1);
    G.ui.toast(`${data.name} glows happily. +1 Luma Energy`, 'magic');
    G.events.emit('lumaPet');
  }
  feed(data) {
    if (data.feedDay === this.today()) { G.ui.toast(`${data.name} is full for today.`, 'info'); return false; }
    if (!G.inv.has('luma_food')) { G.ui.toast('You need Luma Food. Craft it at a workbench or buy it in town.', 'warn'); return false; }
    G.inv.remove('luma_food', 1);
    data.feedDay = this.today();
    const n = LUMA_BY_ID[data.species].ability === 'energy' ? 2 : 1;
    this.addEnergy(n);
    G.audio?.play('eat');
    G.ui.toast(`${data.name} munches happily. +${n} Luma Energy`, 'magic');
    return true;
  }
  addEnergy(n) { G.save.lumaEnergy = (G.save.lumaEnergy || 0) + n; G.events.emit('energy', n); }
  hatch(egg) {
    let species;
    if (egg.type === 'golden_egg') species = 'lumaria';
    else {
      const fam = LUMAS.filter((l) => l.spirit === egg.spirit);
      const fresh = fam.filter((l) => !this.list.some((x) => x.species === l.id));
      const pool = fresh.length ? fresh : fam;
      species = pool[Math.floor(Math.random() * pool.length)].id;
    }
    const spec = LUMA_BY_ID[species];
    const uid = 'L' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
    const data = { uid, species, name: spec.name, petDay: 0, feedDay: 0, born: G.time.day };
    this.list.push(data);
    G.save.lumasOwned = this.list.length;
    if (!G.save.activeLuma || G.save.activeLuma === 'dog') { G.save.activeLuma = uid; this.spawnCompanion(); }
    G.ui.banner(`${spec.name} hatched!`, ABILITIES[spec.ability]);
    G.audio?.play('fanfare');
    G.events.emit('lumaHatched', species);
    return data;
  }
  eggReady(egg) { return !!egg && G.time.total >= egg.start + HATCH_MINUTES; }
  // ---------- incubator ----------
  openIncubator(o) {
    this.inc = o;
    this.renderIncubator();
    G.ui.open(this.incPanel);
  }
  renderIncubator() {
    const o = this.inc;
    const b = clear(this.incPanel.body);
    const egg = o.data.egg;
    if (egg) {
      const left = egg.start + HATCH_MINUTES - G.time.total;
      if (left > 0) {
        const pct = Math.round((1 - left / HATCH_MINUTES) * 100);
        b.append(h('p', {}, `The egg is warm and humming. It will hatch in about ${Math.ceil(left / 60)} hour${Math.ceil(left / 60) === 1 ? '' : 's'} of island time.`), h('div', { class: 'meter wide' }, h('span', { style: { width: pct + '%' } })));
      } else {
        b.append(h('p', {}, 'The egg is wobbling. Something wants out!'), h('button', { class: 'btn big teal', onclick: () => {
          o.data.egg = null;
          G.ui.close(this.incPanel);
          G.particles?.burst('magic', o.x, o.mesh.position.y + 1.2, o.z, { n: 30 });
          this.hatch(egg);
          G.placed.refreshEgg(o);
        } }, 'Hatch the egg'));
      }
      return;
    }
    const eggs = ['mysterious_egg', 'golden_egg'].filter((id) => G.inv.has(id));
    const lifes = ['water', 'rock', 'lost', 'nature', 'earth'].filter((s) => G.inv.has('luma_life_' + s));
    this.pickEgg = eggs.includes(this.pickEgg) ? this.pickEgg : eggs[0];
    this.pickLife = lifes.includes(this.pickLife) ? this.pickLife : lifes[0];
    b.append(h('p', { class: 'note' }, 'Place a Mysterious Egg and pour Luma Life over it. The kind of spirit decides which family of Luma hatches.'));
    b.append(h('h3', { class: 'section-title' }, 'Egg'));
    if (!eggs.length) b.append(h('p', { class: 'muted' }, 'You have no eggs. Temples, shrines and ruins hide them.'));
    else b.append(h('div', { class: 'choices' }, ...eggs.map((id) => h('button', { class: 'tab' + (this.pickEgg === id ? ' on' : ''), onclick: () => { this.pickEgg = id; this.renderIncubator(); } }, icon(id, 'mini'), ITEMS[id].name))));
    b.append(h('h3', { class: 'section-title' }, 'Luma Life'));
    if (this.pickEgg === 'golden_egg') b.append(h('p', { class: 'muted' }, 'The golden egg needs any Luma Life.'));
    if (!lifes.length) b.append(h('p', { class: 'muted' }, 'Craft Luma Life at a workbench from a Spirit, fiber and a flower. Earth Spirits are sold at every market.'));
    else b.append(h('div', { class: 'choices' }, ...lifes.map((s) => h('button', { class: 'tab' + (this.pickLife === s ? ' on' : ''), onclick: () => { this.pickLife = s; this.renderIncubator(); } }, icon('luma_life_' + s, 'mini'), s[0].toUpperCase() + s.slice(1)))));
    b.append(h('button', { class: 'btn big teal', disabled: !(this.pickEgg && this.pickLife), onclick: () => {
      G.inv.remove(this.pickEgg, 1);
      G.inv.remove('luma_life_' + this.pickLife, 1);
      o.data.egg = { type: this.pickEgg, spirit: this.pickLife, start: G.time.total };
      G.placed.refreshEgg(o);
      G.audio?.play('magic');
      G.ui.toast('The egg settles into the warm incubator.', 'magic');
      G.events.emit('incubating');
      this.renderIncubator();
    } }, 'Start incubating'));
  }
  // ---------- nest ----------
  openNest() { this.renderNest(); G.ui.open(this.nestPanel); }
  renderNest() {
    const b = clear(this.nestPanel.body);
    b.append(h('div', { class: 'row' }, h('span', { class: 'price big' }, h('span', { class: 'ico-energy' }), `${G.save.lumaEnergy || 0} Luma Energy`), h('div', { class: 'spacer' }), h('span', { class: 'muted small' }, `${this.list.length} of ${LUMAS.length} Lumas discovered · Luma Food: ${G.inv.count('luma_food')}`)));
    b.append(h('p', { class: 'muted small' }, 'Pet and feed each Luma once a day for Luma Energy. Spend it at a Luma Altar.'));
    const grid = h('div', { class: 'luma-grid' });
    if (G.save.flags.dog) grid.append(h('div', { class: 'luma-card' + (G.save.activeLuma === 'dog' ? ' active' : '') },
      h('img', { src: objectIconURL('dog', () => merge(dogParts().body)), alt: '' }), h('b', {}, 'Biscuit'), h('small', {}, 'Treasure pup · ' + ABILITIES.treasure),
      h('div', { class: 'row' }, G.save.activeLuma === 'dog' ? h('span', { class: 'pill' }, 'Companion') : h('button', { class: 'btn small', onclick: () => { this.setActive('dog'); this.renderNest(); } }, 'Take along'))));
    for (const l of this.list) {
      const spec = LUMA_BY_ID[l.species];
      const active = G.save.activeLuma === l.uid;
      grid.append(h('div', { class: 'luma-card' + (active ? ' active' : '') },
        h('img', { src: lumaIcon(l.species), alt: '' }), h('b', {}, l.name), h('small', {}, `${spec.spirit[0].toUpperCase() + spec.spirit.slice(1)} Luma · ${ABILITIES[spec.ability]}`),
        h('div', { class: 'row' },
          h('button', { class: 'btn small', disabled: l.petDay === this.today(), onclick: () => { this.pet(l); this.renderNest(); } }, l.petDay === this.today() ? 'Petted' : 'Pet'),
          h('button', { class: 'btn small', disabled: l.feedDay === this.today(), onclick: () => { this.feed(l); this.renderNest(); } }, l.feedDay === this.today() ? 'Fed' : 'Feed'),
          active ? h('span', { class: 'pill' }, 'Companion') : h('button', { class: 'btn small ghost', onclick: () => { this.setActive(l.uid); this.renderNest(); } }, 'Take along'))));
    }
    if (!this.list.length && !G.save.flags.dog) grid.append(h('p', { class: 'muted' }, 'No Lumas yet. Hatch a Mysterious Egg in an Incubator.'));
    b.append(grid);
    const missing = LUMAS.filter((s) => !this.list.some((l) => l.species === s.id));
    if (missing.length) b.append(h('h3', { class: 'section-title' }, 'Still to discover'), h('div', { class: 'luma-unknown' }, ...missing.map((s) => h('span', { class: 'pill dim' }, s.legendary ? '??? (legendary)' : `??? · ${s.spirit}`))));
  }
  clearResting() { for (const r of this.resting) r.detach(); this.resting = []; }
  // ---------- per frame ----------
  update(dt) {
    if (this.pendingLevel && this.companion) { this.companion.place(this.pendingLevel, G.player.pos.x - 1, G.player.pos.z + 1); this.pendingLevel = null; }
    const c = this.companion;
    if (c) c.update(dt);
    const a = this.ability();
    if (a === 'regen') { this.regenT += dt; if (this.regenT > 20) { this.regenT = 0; if (G.player.hp < G.player.maxHp) G.player.heal(1); } }
    if (c && a === 'treasure') {
      this.sniffT -= dt;
      if (this.sniffT <= 0) {
        this.sniffT = 1;
        const spot = G.treasure?.nearest(G.player.pos.x, G.player.pos.z, 15, G.level);
        if (spot && !c.target) { c.target = spot; spot.revealed = true; G.treasure.showMound(spot); c.showEmote('!', 3); G.audio?.play(c.kind === 'dog' ? 'bark' : 'chirp'); G.ui.toast(`${c.name} found something! Dig there with your shovel.`, 'magic'); }
        if (c.target && (c.target.dug || Math.hypot(c.target.x - G.player.pos.x, c.target.z - G.player.pos.z) > 22)) c.target = null;
      }
    }
    if (c && a === 'offering') {
      this.sniffT -= dt;
      if (this.sniffT <= 0) {
        this.sniffT = 25;
        const o = G.shrines?.nearestOffering(G.player.pos.x, G.player.pos.z);
        if (o && G.level === G.overworld) {
          const dx = o.x - G.player.pos.x, dz = o.z - G.player.pos.z;
          const dir = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((Math.atan2(dx, -dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
          c.showEmote('?', 2);
          G.ui.toast(`${c.name} senses an offering crystal to the ${dir}, about ${Math.round(Math.hypot(dx, dz))} steps away.`, 'magic', 4000);
        }
      }
    }
  }
}
