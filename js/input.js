// ============================================================
//  ENTRÉES — clavier (PC) + joystick et boutons tactiles (téléphone)
// ============================================================

// Vibration du téléphone (ignorée en silence si le navigateur ne la gère pas, ex. iPhone)
const Haptics = {
  enabled: true,
  vibrate(pattern) {
    if (!this.enabled) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* non pris en charge */ }
  },
};
const Input = {
  keys: {}, mx: 0, my: 0,
  pressed: { attack: false, jump: false, special: false, pause: false, pote: false },
  held: { attack: false, jump: false },
  stick: { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
  isTouch: false, stickR: 55,

  init() {
    const map = {
      // e.code = position physique : KeyW/KeyA/KeyS/KeyD = ZQSD sur clavier AZERTY
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
    };
    const actions = { Space: 'jump', KeyJ: 'attack', KeyX: 'attack', Enter: 'attack', KeyK: 'special', KeyC: 'special', KeyE: 'special', Escape: 'pause', KeyP: 'pause', KeyL: 'pote', KeyV: 'pote' }; // L / V : appel à un pote (v3.10)
    window.addEventListener('keydown', e => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (map[e.code]) { this.keys[map[e.code]] = true; e.preventDefault(); }
      if (actions[e.code]) { if (!e.repeat) this.pressed[actions[e.code]] = true; this.held[actions[e.code]] = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', e => {
      if (map[e.code]) this.keys[map[e.code]] = false;
      if (actions[e.code]) this.held[actions[e.code]] = false;
    });
    window.addEventListener('blur', () => { this.keys = {}; });

    // Joystick virtuel : n'importe où sur la moitié gauche
    const zone = document.getElementById('stick-zone');
    const knob = document.getElementById('stick-knob');
    const base = document.getElementById('stick-base');
    const setKnob = () => {
      const half = base.offsetWidth / 2 || 65; // le socle grandit avec la taille des commandes
      base.style.left = (this.stick.ox - half) + 'px'; base.style.top = (this.stick.oy - half) + 'px';
      knob.style.transform = `translate(${this.stick.dx}px, ${this.stick.dy}px)`;
    };
    zone.addEventListener('pointerdown', e => {
      this.isTouch = true;
      this.stick.active = true; this.stick.id = e.pointerId;
      const r = zone.getBoundingClientRect();
      this.stick.ox = e.clientX - r.left; this.stick.oy = e.clientY - r.top; this.stick.dx = this.stick.dy = 0;
      base.classList.add('on'); setKnob();
      try { zone.setPointerCapture(e.pointerId); } catch (err) {} e.preventDefault();
    });
    zone.addEventListener('pointermove', e => {
      if (!this.stick.active || e.pointerId !== this.stick.id) return;
      const r = zone.getBoundingClientRect();
      let dx = e.clientX - r.left - this.stick.ox, dy = e.clientY - r.top - this.stick.oy;
      const R = this.stickR, d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      this.stick.dx = dx; this.stick.dy = dy; setKnob();
    });
    const end = e => { if (e.pointerId !== this.stick.id) return; this.stick.active = false; this.stick.dx = this.stick.dy = 0; base.classList.remove('on'); knob.style.transform = ''; base.style.left = base.style.top = ''; }; // le socle revient à sa place de repos
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);

    document.querySelectorAll('[data-btn]').forEach(b => {
      const a = b.dataset.btn;
      b.addEventListener('pointerdown', e => { this.isTouch = true; this.pressed[a] = true; this.held[a] = true; b.classList.add('down'); e.preventDefault(); });
      const up = () => { this.held[a] = false; b.classList.remove('down'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
    // écran tactile : téléphone, iPad (même avec clavier ou trackpad branché, qui le fait passer en « pointer: fine »)
    if (matchMedia('(pointer: coarse)').matches || matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0) this.isTouch = true;
  },

  update() {
    let mx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    let my = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
    if (this.stick.active) {
      const dx = this.stick.dx / this.stickR, dy = this.stick.dy / this.stickR;
      mx = Math.abs(dx) > 0.25 ? dx : 0; my = Math.abs(dy) > 0.3 ? dy : 0;
    }
    this.mx = clamp(mx, -1, 1); this.my = clamp(my, -1, 1);
  },
  consume(a) { const v = this.pressed[a]; this.pressed[a] = false; return v; },
  clear() { for (const k in this.pressed) this.pressed[k] = false; },
};
