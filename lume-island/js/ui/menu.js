// Pause menu, settings and controls help.
import { G } from '../core/game.js';
import { h, clear } from './dom.js';
import { makePanel } from './ui.js';
import { saveSettings } from '../systems/save.js';

export class Menu {
  constructor() {
    this.pause = makePanel('Paused', { cls: 'narrow' });
    this.settings = makePanel('Settings', { cls: '' });
    this.help = makePanel('How to play', { cls: 'wide' });
  }
  openPause() {
    const b = clear(this.pause.body);
    b.append(h('div', { class: 'menu-col' },
      h('button', { class: 'btn', onclick: () => G.ui.close(this.pause) }, 'Resume'),
      h('button', { class: 'btn ghost', onclick: () => G.saveGame('manual') }, 'Save game'),
      h('button', { class: 'btn ghost', onclick: () => this.openSettings() }, 'Settings'),
      h('button', { class: 'btn ghost', onclick: () => this.openHelp() }, 'How to play'),
      h('button', { class: 'btn ghost', onclick: () => { G.ui.close(this.pause); G.journal?.open(); } }, 'Journal'),
      h('button', { class: 'btn red', onclick: (e) => {
        if (e.currentTarget.dataset.c) { G.saveGame('quit'); location.reload(); }
        else { e.currentTarget.dataset.c = 1; e.currentTarget.textContent = 'Save and quit to title?'; }
      } }, 'Quit to title')));
    G.ui.open(this.pause);
  }
  openSettings() {
    const s = G.settings;
    const b = clear(this.settings.body);
    const toggle = (id, label, sub, get, set) => h('label', { class: 'toggle-row' }, h('input', { id, type: 'checkbox', checked: get() || undefined, onchange: (e) => { set(e.target.checked); saveSettings(); } }), h('span', {}, h('b', {}, label), h('small', {}, sub)));
    const slider = (id, label, key) => h('label', { class: 'slider-row' }, h('span', {}, label), h('input', { id, type: 'range', min: '0', max: '1', step: '0.05', value: s[key], oninput: (e) => { s[key] = +e.target.value; G.audio?.applyVolumes(); saveSettings(); } }));
    if (G.started) {
      b.append(h('h3', { class: 'section-title' }, 'This island'));
      b.append(toggle('set-peaceful', 'Peaceful mode', 'Removes every monster from the island, caves and temples. Traps only push you back.', () => G.save.peaceful, (v) => { G.save.peaceful = v; G.events.emit('peaceful', v); G.ui.toast(v ? 'Peaceful mode on: the monsters are gone.' : 'Peaceful mode off: watch your step!', 'magic'); }));
      const diffRow = h('div', { class: 'choices' });
      for (const [id, label] of [['cozy', 'Cozy'], ['adventure', 'Adventure'], ['hero', 'Hero']]) diffRow.append(h('button', { class: 'tab' + (G.save.difficulty === id ? ' on' : ''), onclick: () => { G.save.difficulty = id; this.openSettings(); } }, label));
      b.append(h('div', { class: 'field' }, h('span', {}, 'Difficulty'), diffRow));
    }
    b.append(h('h3', { class: 'section-title' }, 'Gameplay'));
    b.append(toggle('set-smart', 'Smart tools', 'Automatically use the right tool for the tree, rock or pot you aim at.', () => s.smartTools, (v) => { s.smartTools = v; }));
    b.append(toggle('set-autorun', 'Always run', 'Run without holding Shift.', () => s.autoRun, (v) => { s.autoRun = v; }));
    b.append(toggle('set-arachno', 'Arachnophobia mode', 'Spiders look like fluffy dust bunnies instead.', () => s.arachnophobia, (v) => { s.arachnophobia = v; G.events.emit('arachnophobia', v); }));
    b.append(toggle('set-tracker', 'Show quest tracker', 'The current goal under the minimap.', () => s.showTracker, (v) => { s.showTracker = v; }));
    b.append(toggle('set-shake', 'Camera shake', 'Shake the camera on impacts.', () => s.cameraShake, (v) => { s.cameraShake = v; }));
    const dayRow = h('div', { class: 'choices' });
    for (const m of [12, 16, 24, 32]) dayRow.append(h('button', { class: 'tab' + (s.dayLength === m ? ' on' : ''), onclick: () => { s.dayLength = m; G.time.rate = 1440 / (m * 60); saveSettings(); this.openSettings(); } }, `${m} min`));
    b.append(h('div', { class: 'field' }, h('span', {}, 'Length of a day'), dayRow));
    b.append(h('h3', { class: 'section-title' }, 'Graphics'));
    const qRow = h('div', { class: 'choices' });
    for (const [id, label] of [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]) qRow.append(h('button', { class: 'tab' + (s.quality === id ? ' on' : ''), onclick: () => { s.quality = id; saveSettings(); G.applyQuality?.(); this.openSettings(); } }, label));
    b.append(h('div', { class: 'field' }, h('span', {}, 'Quality'), qRow));
    b.append(h('h3', { class: 'section-title' }, 'Sound'));
    b.append(slider('set-master', 'Master volume', 'master'), slider('set-music', 'Music', 'music'), slider('set-sfx', 'Effects', 'sfx'));
    if (!G.ui.isOpen(this.settings)) G.ui.open(this.settings);
  }
  openHelp() {
    const b = clear(this.help.body);
    const rows = [
      ['Move', 'WASD / arrow keys · left stick on touch'], ['Run', 'Shift (or turn on Always run)'], ['Use tool / attack / place', 'Left click or Space · Use button'],
      ['Interact, talk, pick up', 'E or right click · hand button'], ['Hotbar', '1 – 0 or click a slot'], ['Backpack', 'I or Tab'], ['Build menu', 'B'],
      ['Map', 'M'], ['Journal (quests, professions, Lumas)', 'J'], ['Rotate when placing', 'R'], ['Zoom', 'Mouse wheel'], ['Pause / close', 'Esc'],
    ];
    b.append(h('div', { class: 'help-grid' }, ...rows.map(([a, c]) => h('div', { class: 'help-row' }, h('b', {}, a), h('span', {}, c)))));
    b.append(h('h3', { class: 'section-title' }, 'Getting started'));
    b.append(h('ol', { class: 'help-list' },
      h('li', {}, 'Talk to Mayor Rosalind in Lumenbrook. She gives you your homestead and your first goals.'),
      h('li', {}, 'Chop trees and break rocks, then build a Workbench (B) at your homestead.'),
      h('li', {}, 'Pick a profession at the Guild Hall. The first permit is free.'),
      h('li', {}, 'Farm goods (crops, eggs, milk, Earth Spirits) are sold at every town market. Nobody farms here.'),
      h('li', {}, 'Explore temples to find Mysterious Eggs. Hatch them in an Incubator with Luma Life to get Luma companions.'),
      h('li', {}, 'Repair the bridge, the old lift and the boat to reach the Forest, the Mountains and the Jungle. Each has its own town.'),
      h('li', {}, 'Prefer no fighting? Turn on Peaceful mode in Settings at any time.')));
    G.ui.open(this.help);
  }
}
