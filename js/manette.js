// ============================================================
//  MANETTE (v4.6) — manette USB ou Bluetooth : Xbox, PlayStation, SteelSeries Nimbus (iPhone / iPad / Mac)…
//  Le navigateur donne l'état des boutons (fonction « Gamepad » de Chrome et Safari) : on le lit à chaque image.
//  Boutons, disposition Xbox / Nimbus (entre parenthèses : PlayStation) :
//    En jeu : stick gauche ou croix = se déplacer · A (✕) = sauter · X (□) = frapper (rester appuyé = attraper)
//             Y (△) ou RB (R1) = attaque spéciale · B (○) ou LB (L1) = appeler un pote · Start / Menu = pause
//    Menus  : stick ou croix = choisir un bouton · A = valider · B = retour · Start = valider (reprendre en pause)
//  Dès qu'on se sert de la manette, les commandes tactiles disparaissent ; un toucher sur l'écran les fait revenir.
// ============================================================
const PAD_BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, SELECT: 8, START: 9, HAUT: 12, BAS: 13, GAUCHE: 14, DROITE: 15 };
const PAD_JEU = { // action du jeu → boutons qui la déclenchent
  jump: [PAD_BTN.A], attack: [PAD_BTN.X], special: [PAD_BTN.Y, PAD_BTN.RB], pote: [PAD_BTN.B, PAD_BTN.LB], pause: [PAD_BTN.START, PAD_BTN.SELECT],
};
const PAD_ZONE_MORTE = 0.3; // le stick doit être poussé d'au moins 30 % (sinon les petites dérives feraient bouger le héros)

const Manette = {
  actif: false,      // la manette est le dernier moyen de contrôle utilisé
  avant: [],         // boutons appuyés à l'image précédente (pour repérer le moment où on appuie)
  focus: null,       // bouton de menu choisi à la manette
  dirAvant: null, dirT: 0, // répétition quand on garde une direction enfoncée dans les menus
  sonPret: false,

  init() {
    if (!navigator.getGamepads) return; // navigateur trop ancien : rien ne change
    window.addEventListener('gamepadconnected', () => UI.toast('🎮 Manette connectée', 2500));
    window.addEventListener('gamepaddisconnected', () => { if (!this.pad()) { this.setActif(false); UI.toast('🎮 Manette déconnectée', 2500); } });
    // retour au tactile ou à la souris : on cache le cadre de la manette, et on remet les commandes tactiles si on touche l'écran
    window.addEventListener('pointerdown', e => { this.montrer(null); if (e.pointerType === 'touch') this.setActif(false); }, true);
    window.addEventListener('keydown', () => this.montrer(null), true);
    let t0 = performance.now();
    const boucle = now => { const dt = Math.min(0.1, (now - t0) / 1000); t0 = now; this.lire(dt); requestAnimationFrame(boucle); };
    requestAnimationFrame(boucle);
  },

  // première manette branchée
  pad() {
    let l = []; try { l = navigator.getGamepads() || []; } catch (e) {}
    for (const g of l) if (g && g.connected) return g;
    return null;
  },

  setActif(on) {
    if (this.actif === on) return;
    this.actif = on;
    document.body.classList.toggle('manette', on);
    const ctl = document.getElementById('controls');
    if (ctl && !ctl.classList.contains('hidden')) { ctl.classList.toggle('touch', Input.isTouch && !on); Game.updateSafeArea(); }
  },

  lire(dt) {
    const g = this.pad();
    if (!g) { Input.pad.mx = Input.pad.my = 0; if (this.avant.length) { this.avant = []; Input.held.attack = Input.held.jump = false; } return; }
    const appui = i => { const b = g.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };
    const maintenant = g.buttons.map((b, i) => appui(i));
    const vient = i => maintenant[i] && !this.avant[i];
    // direction : croix, sinon stick gauche
    let mx = (appui(PAD_BTN.DROITE) ? 1 : 0) - (appui(PAD_BTN.GAUCHE) ? 1 : 0);
    let my = (appui(PAD_BTN.BAS) ? 1 : 0) - (appui(PAD_BTN.HAUT) ? 1 : 0);
    if (!mx && !my) {
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      mx = Math.abs(ax) > PAD_ZONE_MORTE ? ax : 0; my = Math.abs(ay) > PAD_ZONE_MORTE ? ay : 0;
    }
    const touche = maintenant.some(Boolean) || mx || my;
    if (touche && !this.actif) this.setActif(true);
    if (touche && !this.sonPret) { this.sonPret = true; try { Sfx.init(); } catch (e) {} }

    // écran d'accueil « Touche pour jouer » : A ou Start le passe
    const splash = document.getElementById('splash');
    if (splash) { if (vient(PAD_BTN.A) || vient(PAD_BTN.START)) splash.click(); this.avant = maintenant; return; }

    const enMenu = !!UI.current;
    if (enMenu) {
      Input.pad.mx = Input.pad.my = 0;
      this.menu(dt, mx, my, vient);
    } else {
      this.montrer(null);
      Input.pad.mx = clamp(mx, -1, 1); Input.pad.my = clamp(my, -1, 1);
      for (const a in PAD_JEU) {
        const tenu = PAD_JEU[a].some(i => maintenant[i]);
        if (PAD_JEU[a].some(i => vient(i))) { Input.pressed[a] = true; }
        if (a === 'attack' || a === 'jump') {
          // on ne relâche que ce que la manette tenait (le clavier ou le tactile peuvent tenir le même bouton)
          if (tenu) { Input.held[a] = true; this['tient_' + a] = true; }
          else if (this['tient_' + a]) { Input.held[a] = false; this['tient_' + a] = false; }
        }
      }
    }
    this.avant = maintenant;
  },

  // ---------- menus ----------
  // boutons visibles de l'écran affiché
  choix() {
    const ecran = UI.current && document.getElementById(UI.current); if (!ecran) return [];
    return [...ecran.querySelectorAll('button, summary, input[type=range], input[type=checkbox]')].filter(el => {
      if (el.disabled || el.closest('.hidden')) return false;
      const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    });
  },
  montrer(el) {
    if (this.focus === el) return;
    if (this.focus) this.focus.classList.remove('pad-focus');
    this.focus = el;
    if (el) { el.classList.add('pad-focus'); try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
  },
  // bouton choisi au départ : le perso sélectionné, sinon le gros bouton principal, sinon le premier
  depart(l) {
    return l.find(el => el.classList.contains('sel')) || l.find(el => el.classList.contains('primary') && !el.classList.contains('dp')) || l[0] || null;
  },
  menu(dt, mx, my, vient) {
    const l = this.choix();
    if (!l.length) { this.montrer(null); return; }
    if (!this.focus || !l.includes(this.focus)) { if (!this.actif) return; this.montrer(this.depart(l)); }
    // direction, avec répétition si on la garde (0,35 s puis toutes les 0,13 s)
    const dir = Math.abs(mx) >= Math.abs(my) ? (mx > 0 ? 'D' : mx < 0 ? 'G' : null) : (my > 0 ? 'B' : 'H');
    if (dir && dir === this.dirAvant) { this.dirT -= dt; } else { this.dirT = 0; }
    if (dir && this.dirT <= 0) { this.dirT = dir === this.dirAvant ? 0.13 : 0.35; this.bouger(dir, l); }
    this.dirAvant = dir;
    const el = this.focus;
    if (vient(PAD_BTN.A) || (vient(PAD_BTN.START) && UI.current !== 's-pause')) this.valider(el);
    else if (vient(PAD_BTN.START) && UI.current === 's-pause') UI.resume();
    else if (vient(PAD_BTN.B)) this.retour();
  },
  valider(el) {
    if (!el) return;
    try { Sfx.init(); } catch (e) {}
    if (el.type === 'checkbox') { el.click(); return; }
    if (el.type === 'range') return;
    // perso déjà choisi : un second appui lance la partie (comme le double-clic)
    if (el.classList.contains('char-card') && el.classList.contains('sel') && el.ondblclick) { el.ondblclick(); return; }
    el.click();
  },
  retour() {
    if (UI.current === 's-pause') { UI.resume(); return; }
    const b = this.choix().find(el => /^\s*←/.test(el.textContent));
    if (b) b.click();
  },
  bouger(dir, l) {
    const el = this.focus;
    // curseurs (réglages) : gauche / droite changent la valeur
    if (el && el.type === 'range' && (dir === 'G' || dir === 'D')) {
      const pas = +el.step || 1, v = clamp(+el.value + (dir === 'D' ? pas : -pas), +el.min, +el.max);
      if (v !== +el.value) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
      return;
    }
    const c = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const a = c(el.getBoundingClientRect());
    const [ux, uy] = { D: [1, 0], G: [-1, 0], B: [0, 1], H: [0, -1] }[dir];
    let mieux = null, score = Infinity;
    for (const o of l) {
      if (o === el) continue;
      const b = c(o.getBoundingClientRect()), dx = b.x - a.x, dy = b.y - a.y;
      const loin = dx * ux + dy * uy, cote = Math.abs(dx * uy - dy * ux);
      if (loin <= 4) continue; // pas dans cette direction
      const s = loin + cote * 2.5;
      if (s < score) { score = s; mieux = o; }
    }
    if (mieux) { this.montrer(mieux); try { Sfx.click(); } catch (e) {} }
  },
};
