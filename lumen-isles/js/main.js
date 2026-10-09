'use strict';
// Input handling + boot.
G.Input = (() => {
  const keys = {};
  const joy = { x: 0, y: 0, id: null };
  const In = {
    keys, joy, touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    dir() {
      let x = 0, y = 0;
      if (keys.ArrowLeft || keys.KeyA) x -= 1; if (keys.ArrowRight || keys.KeyD) x += 1;
      if (keys.ArrowUp || keys.KeyW) y -= 1; if (keys.ArrowDown || keys.KeyS) y += 1;
      if (!x && !y) { x = joy.x; y = joy.y; }
      return { x, y };
    },
    run() { return !!(keys.ShiftLeft || keys.ShiftRight) || Math.hypot(joy.x, joy.y) > 0.92; },
  };
  return In;
})();

(() => {
  const Game = G.Game, UI = G.UI, In = G.Input;
  const quickEat = () => {
    const s = G.S; if (!s) return;
    const foods = Object.keys(s.inv).filter((k) => G.D.ITEMS[k] && G.D.ITEMS[k].heal).sort((a, b) => G.D.ITEMS[a].price - G.D.ITEMS[b].price);
    if (!foods.length) return UI.toast('No snacks in your bag. Grocers and cafés sell tasty food!');
    Game.eat(foods[0]);
  };
  window.addEventListener('keydown', (e) => {
    G.Audio.init();
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'SELECT') { if (e.code === 'Escape') document.activeElement.blur(); return; }
    if (Game.title) { if (UI.isOpen() && e.code === 'Escape') UI.close(); return; }
    if (UI.handleKey(e)) { e.preventDefault(); for (const k in In.keys) delete In.keys[k]; return; }
    In.keys[e.code] = true;
    switch (e.code) {
      case 'Space': case 'KeyE': case 'Enter': e.preventDefault(); if (!e.repeat || Game.target && Game.target.kind === 'obj' && ['tree', 'rock', 'dig', 'crack'].includes(Game.target.ref.type)) Game.act(); break;
      case 'KeyR': Game.pickup(); break;
      case 'KeyI': case 'Tab': e.preventDefault(); UI.journal('bag'); break;
      case 'KeyQ': UI.journal('quests'); break;
      case 'KeyM': UI.journal('map'); break;
      case 'KeyP': UI.journal('pets'); break;
      case 'KeyK': UI.journal('skills'); break;
      case 'KeyC': UI.journal('collection'); break;
      case 'KeyT': UI.travel(); break;
      case 'KeyF': quickEat(); break;
      case 'Escape': if (Game.placing) { Game.placing = null; } else UI.journal('settings'); break;
    }
  });
  window.addEventListener('keyup', (e) => { delete In.keys[e.code]; });
  window.addEventListener('blur', () => { for (const k in In.keys) delete In.keys[k]; });
  document.getElementById('game').addEventListener('mousedown', (e) => { G.Audio.init(); if (e.button === 0 && !Game.title) Game.act(); });
  window.addEventListener('beforeunload', () => { if (G.S && !Game.title) G.Sys.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.S && !Game.title) G.Sys.save(); });

  // touch controls
  const joyEl = document.getElementById('joy'), knob = document.getElementById('joy-knob');
  const setJoy = (t) => {
    const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2);
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    In.joy.x = Math.abs(dx) > 0.2 ? dx : 0; In.joy.y = Math.abs(dy) > 0.2 ? dy : 0;
    knob.style.transform = `translate(${dx * 35}px, ${dy * 35}px)`;
  };
  joyEl.addEventListener('touchstart', (e) => { e.preventDefault(); G.Audio.init(); setJoy(e.changedTouches[0]); }, { passive: false });
  joyEl.addEventListener('touchmove', (e) => { e.preventDefault(); setJoy(e.changedTouches[0]); }, { passive: false });
  const endJoy = () => { In.joy.x = In.joy.y = 0; knob.style.transform = ''; };
  joyEl.addEventListener('touchend', endJoy); joyEl.addEventListener('touchcancel', endJoy);
  document.getElementById('touch-act').addEventListener('touchstart', (e) => { e.preventDefault(); if (UI.mode === 'fishing') UI.fishHit(); else Game.act(); }, { passive: false });
  document.getElementById('touch-menu').addEventListener('touchstart', (e) => { e.preventDefault(); UI.journal('bag'); }, { passive: false });

  Game.boot();
  UI.title();
})();
