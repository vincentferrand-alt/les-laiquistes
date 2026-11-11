// ============================================================
//  LES LAÏQUISTES — Niveau en 3 tiers (v3.9)
//   1er tiers : deux vagues, puis le MINI-BOSS du monde (data.js : MINIBOSSES)
//   2e tiers  : une vague, puis l'ÉPREUVE (events.js)
//   3e tiers  : une vague, puis le BOSS
//  · Barre de progression en haut avec trois repères (💀 mini-boss, 🎯 épreuve, 👑 boss)
//  · Point de reprise au début de chaque tiers : « Réessayer » reprend au début du tiers (score de ce moment-là)
//  · Survie : le mini-boss revient aux vagues 3, 8, 13…
//  · Gros « GO ! » avec flèches et les deux voix enregistrées (sounds/go-1, go-2), qui revient si on attend
//  · Aides de la première fois : attraper, lancer, spécial (gardées sur l'appareil)
//  · Objectifs dans le menu pause
//  Tout s'ajoute à l'objet Game (game.js) : Object.assign(Game, Tiers).
// ============================================================

// Plan du niveau (positions de la caméra)
const LAYOUT = {
  len: 5800,                         // longueur du niveau (était 4200)
  waves: [520, 1300, 2750, 4050],    // vagues : 2 au 1er tiers, 1 au 2e, 1 au 3e
  sizes: [4, 5, 5, 6],               // ennemis par vague (+ difficulté)
  mini: 2050,                        // arène du mini-boss
  ev: 3350,                          // épreuve de milieu de monde (EV_AT dans events.js)
};
// Aides : nombre de réussites avant de ne plus les montrer, et durée maximale d'affichage (s, cumulée)
const HINTS = { grab: { n: 2, max: 40 }, throw: { n: 2, max: 30 }, special: { n: 1, max: 20 } };

const Tiers = {
  tiersStart(o) {
    this.runId = (this.runId || 0) + 1; // (les actions différées d'une partie précédente sont ignorées : voir later)
    this.mini = { x: LAYOUT.mini, started: false, done: !this.medalOn, e: null, koDone: false, endT: 0 };
    this.miniE = null; this.blackholes = [];
    this.checkpoint = null; this.goN = 0; this.goCam = 0; this.idleT = 0; this.lastCam = this.camX;
    this.hint = null; this.hintPulse = null; this.goldState = 'avenir';
    if (o.checkpoint && this.medalOn) this.applyCheckpoint(o.checkpoint);
  },

  // Reprise au début d'un tiers : tout ce qui est avant est considéré comme fait
  applyCheckpoint(cp) {
    this.checkpoint = cp;
    this.camX = cp.camX; this.hero.x = cp.camX + 220;
    this.waves.forEach(w => { if (w.x <= cp.camX + 2) w.started = w.done = true; });
    this.mini.started = this.mini.done = true;
    if (cp.tier >= 3) { this.evDone = true; this.evOk = cp.evOk; }
    this.score = cp.score; this.time = cp.time; this.kills = cp.kills;
    this.props = this.props.filter(p => p.x > cp.camX + 150);
    if (this.waves[this.goldWave] && this.waves[this.goldWave].done) this.goldDone = true;
    this.hazardT = 5;
  },
  saveCheckpoint(tier) {
    this.checkpoint = { tier, camX: Math.round(this.camX), score: this.score, time: this.time, kills: this.kills, evOk: !!this.evOk };
    this.banner('TIERS ' + tier + ' / 3', 'Point de reprise : si tu tombes, tu repars d\'ici', 2);
  },
  // action différée, annulée si la partie a changé entre-temps
  later(fn, ms) { const id = this.runId; setTimeout(() => { if (this.running && this.runId === id) fn(); }, ms); },
  currentTier() { return !this.mini.done ? 1 : !this.evDone ? 2 : 3; },
  miniActive() { return this.mini && this.mini.started && !this.mini.done; },

  // appelé à chaque image, après updateExtras
  updateTiers(dt, rdt) {
    this.updateBlackholes(dt);
    this.updateGo(dt);
    this.updateHints(dt);
    const e = this.miniE;
    if (e && !e.dead) {
      if (e.entering <= 0) this.updateMiniTier(e);
      if (e.entering > 0 && e.walkIn) { // arrivée à pied (ou en chargeant) depuis le bord droit
        const R = this.bounds().R;
        if (e.x > R - 170) { e.x -= (e.walkIn === 'charge' ? 560 : 190) * dt; e.walk += dt * 12; e.state = 'walk'; if (e.walkIn === 'charge') { this.shake = Math.max(this.shake, 0.12); if (Math.random() < 0.6) this.dust(e.x + 40, e.y, 2); } }
        else e.state = 'idle';
      }
      if (e.landFx && e.z <= 0 && e.vz <= 0 && e.t > 0.1) { // atterrissage (chute du téléphone, étoile filante)
        this.shake = 0.4; this.dust(e.x, e.y, 16); Sfx.bigHit(Sfx.panX(e.x));
        this.particles.push({ type: 'ring', x: e.x, y: e.y, z: 0, r: 10, rmax: 140, life: 0.4, max: 0.4, col: e.landFx === 'etoile' ? '#feca57' : '#fff' });
        if (e.landFx === 'etoile') { this.flashA = 0.5; this.flashCol = '255,240,180'; }
        e.landFx = null;
      }
      if (e.landFx === 'etoile' && e.z > 0) this.particles.push({ type: 'glint', x: e.x + rand(-10, 10), y: e.y, z: e.z + rand(20, 80), vx: 0, vy: 0, vz: rand(40, 120), life: 0.5, max: 0.5, r: rand(5, 10), col: '#feca57' });
      if (e.entering <= 0 && !e.spoke) { e.spoke = true; e.say(e.def.phrases[0], 3, 2); }
    }
    // véhicule du mini-boss : petit nuage d'échappement
    this.vehicles.forEach(v => { if (v.mini && v.state === 'drive' && Math.random() < 0.5) this.dust(v.x + (v.type === 'solex' ? 60 : 90), v.y + 8, 1); });
  },

  // ---------- étape « mini-boss » du 1er tiers (appelée par updateLevel) ----------
  miniStep(dt) {
    const m = this.mini; if (!m || m.done) return;
    if (!m.started) {
      if (this.bossPhase === 0 && !this.wave && !this.ev && this.camX >= m.x - 2) this.startMini();
      return;
    }
    if (m.e && m.e.dead && !m.koDone) { m.koDone = true; m.endT = 1.8; }
    if (m.koDone) { m.endT -= dt; if (m.endT <= 0) this.endMini(); }
  },
  startMini() {
    const m = this.mini, kind = this.world.mini, def = MINIBOSSES[kind];
    m.started = true; this.goT = 0;
    this.lockMax = m.x; this.camX = Math.min(this.camX, m.x);
    // les ennemis isolés s'en vont (pouf)
    this.enemies.forEach(e => { if (!e.dead && !e.golden && !e.mustKill) { this.dust(e.x, e.y, 8); e.remove = true; } });
    this.miniCard(kind, 2.8);
    Sfx.bossArrival(); Music.setIntensity(2);
    m.e = this.miniEntrance(kind);
  },
  // grand bandeau d'arrivée (même que les boss, avec « MINI-BOSS »)
  miniCard(kind, dur) {
    const def = MINIBOSSES[kind];
    this.cineT = dur; this.bossCard = { name: def.name.toUpperCase(), title: def.title, col: MINI_COL[kind] || '#ff9f43', kind, mini: true, splash: true, dur };
    this.slowT = Math.max(this.slowT, 0.6);
  },
  endMini() {
    const m = this.mini; m.done = true; this.miniE = null;
    this.lockMax = this.levelLen; Music.setIntensity(0);
    this.vehicles = this.vehicles.filter(v => { if (v.mini) { this.dust(v.x, v.y, 14); return false; } return true; }); // le véhicule repart (pouf)
    this.saveCheckpoint(2);
    this.later(() => { if (!this.ev && !this.wave) this.goShow(); }, 1600);
  },
  // Crée le mini-boss (PV et dégâts : BALANCE.mini × difficulté × niveau)
  makeMini(kind, x, y, hpMul = 1) {
    const def = MINIBOSSES[kind], M = BALANCE.mini;
    const sc = kind === 'moutong' ? (this.world.small ? 0.8 : 1) : (this.world.small ? 0.9 : 1.15);
    const e = new Fighter(kind, 'enemy', x, y, { scale: sc,
      hp: def.hp * M.hpMul * this.diff * this.L.bossHp * hpMul,
      dmg: def.dmg * M.dmgMul * (0.85 + this.diff * 0.15) * this.L.bossDmg,
      speed: def.speed });
    e.dir = -1; e.attackCd = 1.0; e.tier = 0;
    this.enemies.push(e); this.miniE = e;
    return e;
  },
  // Arrivées : en solex, en voiture sans permis, au téléphone, tombé du ciel, en étoile filante, en chargeant, dans un nuage
  miniEntrance(kind, survival = false) {
    const def = MINIBOSSES[kind], B = this.bounds(), R = B.R, midY = (GROUND_TOP + GROUND_BOTTOM) / 2;
    let e;
    switch (def.entrance) {
      case 'solex': case 'voiturette':
        if (!survival) {
          this.vehicles.push({ type: def.entrance, mini: kind, x: R + 220, tx: R - 200, y: midY - 20, state: 'drive', t: 0, engine: Sfx.engine(def.entrance, 0.7) });
          return null; // le mini-boss descend une fois garé (miniOut)
        }
        e = this.makeMini(kind, R + 60, midY); e.entering = 1.6; e.walkIn = 'walk'; break;
      case 'marche': // Cécile arrive au pas de course, téléphone à l'oreille
        e = this.makeMini(kind, R + 60, midY); e.entering = 2.0; e.walkIn = 'walk';
        [0, 0.35, 0.9, 1.25].forEach(d => Sfx.tone('square', 1320, null, 0.12, 0.1, d)); // dring dring
        break;
      case 'chute': // le téléphone tombe du ciel
        e = this.makeMini(kind, R - 200, midY); e.z = 640; e.vz = -100; e.entering = 1.6; e.landFx = 'chute';
        Sfx.tone('sine', 1400, 300, 0.8, 0.15);
        break;
      case 'etoile': // le Blond arrive en étoile filante
        e = this.makeMini(kind, R - 180, midY); e.z = 760; e.vz = -900; e.kx = -120; e.entering = 1.5; e.landFx = 'etoile';
        Sfx.tone('triangle', 2400, 600, 0.6, 0.12);
        break;
      case 'charge': // le mouton géant déboule en chargeant
        e = this.makeMini(kind, R + 160, midY); e.entering = 1.6; e.walkIn = 'charge';
        Sfx.noise(1.2, 0.3, 200, 0, 0.8);
        break;
      default: // 'fumee' : Mini Purf sort d'un nuage toxique
        e = this.makeMini(kind, R - 200, midY); e.entering = 1.6;
        this.hazards.push({ team: 'none', x: e.x, y: e.y, r: 130, life: 1.6, max: 1.6, tick: 99, dmg: 0 });
        Sfx.special('fumee');
    }
    return e;
  },
  // descend du solex / de la voiturette une fois garé (appelé par updateVehicles)
  miniOut(v) {
    const e = this.makeMini(v.mini, v.x - 40, v.y + 40);
    e.entering = 0.9; e.vz = 380; e.kx = -200;
    this.mini.e = e; v.empty = true;
  },
  // Barre de vie en 3 niveaux : à chaque niveau perdu, il nargue et redit sa phrase
  updateMiniTier(e) {
    const T = BALANCE.mini.tiers;
    const lost = Math.min(T - 1, Math.floor((1 - e.hp / e.maxHp) * T + 1e-6));
    if (lost <= e.tier) return;
    e.tier = lost; e.invul = Math.max(e.invul, 0.5); e.speed *= 1.05;
    if (e.state === 'idle' || e.state === 'walk' || e.state === 'hurt') { e.setState('taunt', 0.6); e.attackCd = Math.max(e.attackCd, 0.7); }
    e.say(e.def.phrases[e.tier % e.def.phrases.length], 2.6, 2);
    this.text(e.x, e.y, e.height + 60, 'NIVEAU ' + (e.tier + 1) + '/' + T, '#feca57', 22, 1.1);
  },
  // Mini-boss battu
  onMiniKill(e) {
    const M = BALANCE.mini;
    this.addScore(M.score);
    this.slowT = Math.max(this.slowT, 1.0); this.shake = 0.45; this.flashA = 0.6; this.flashCol = '255,255,255';
    e.vz = 820; e.kx = (Math.sign(e.x - this.hero.x) || 1) * 420; e.rotV = (Math.sign(e.x - this.hero.x) || 1) * 12;
    this.text(e.x, e.y, e.height + 30, 'K.O. !', '#fff', 52, 1.6, { burst: MINI_COL[e.kind] || '#ff9f43', rot: -0.1 });
    for (let i = 0; i < 16; i++) this.particles.push({ type: 'coin', x: e.x, y: e.y, z: e.height * 0.6, vx: rand(-240, 240), vy: rand(-40, 40), vz: rand(300, 650), life: 1.4, max: 1.4 });
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + M.heal);
    this.dropPower(e.x, e.y);
    this.flashMsg('MINI-BOSS PLANTÉ !', '+' + Math.round(M.score * this.L.score * (this.mod.score || 1)) + ' points · +' + M.heal + ' de vie', MINI_COL[e.kind] || '#feca57', 2);
    Sfx.jingle('stage'); Haptics.vibrate([50, 30, 100]);
    Progress.count('minis');
    if (this.miniE === e) this.miniE = null;
  },

  // ---------- attaques des mini-boss ----------
  miniWantsSpecial(e, dxAbs, dy) {
    const sp = e.def.special;
    if (sp === 'trounoir') return true;
    if (sp === 'belier') return Math.abs(dy) < 40 && dxAbs > 140;
    return Math.abs(dy) < 40;
  },
  // appelé par doSpecial : renvoie true si c'est une attaque de mini-boss
  miniSpecial(f, sp) {
    const M = BALANCE.mini, k = M.specialDmg * this.bossDmgK();
    const proj = (kind, dy, speed, base, o = {}) => this.projectiles.push(Object.assign({ kind, team: 'enemy', owner: f, x: f.x + f.dir * 30, y: clamp(f.y + dy, GROUND_TOP + 15, GROUND_BOTTOM), vx: f.dir * speed, dmg: base * k, life: 1.9, hit: new Set() }, o));
    switch (sp) {
      case 'baguettes': [-40, 0, 40].forEach(dy => proj('baguette', dy, 520, 16)); Sfx.special('cartouches', Sfx.panX(f.x)); break;
      case 'manettes': [-40, 0, 40].forEach(dy => proj('manette', dy, 560, 15)); Sfx.special('cartouches', Sfx.panX(f.x)); break;
      case 'parmesan': [-36, 0, 36].forEach(dy => proj('parmesan', dy, 520, 15)); Sfx.special('cartouches', Sfx.panX(f.x)); break;
      case 'sms': [-46, 0, 46].forEach((dy, i) => proj('sms', dy, 470, 14, { txt: ['LOL', 'SMS', 'MDR'][i] })); [0, 0.1, 0.2].forEach(d => Sfx.tone('square', 1760, null, 0.06, 0.1, d)); break;
      case 'dring': // deux ondes de sonnerie qui traversent tout
        proj('dring', 0, 430, 16, { pierce: true }); proj('dring', 0, 430, 16, { pierce: true, x: f.x - f.dir * 90 });
        [0, 0.12, 0.24, 0.36].forEach(d => Sfx.tone('square', 1320, null, 0.09, 0.12, d));
        break;
      case 'trounoir': { // trou noir sous les pieds du héros : il aspire et fait mal
        const h = this.hero, B = this.bounds();
        this.blackholes.push({ owner: f, x: clamp(h.x, B.L + 80, B.R - 80), y: clamp(h.y, GROUND_TOP + 20, GROUND_BOTTOM - 10), r: 85, warn: 0.9, t: 0, life: 2.6, tick: 0 });
        Sfx.tone('sawtooth', 300, 60, 1.2, 0.15);
        break;
      }
      default: return false;
    }
    return true;
  },
  updateBlackholes(dt) {
    const h = this.hero;
    this.blackholes.forEach(b => {
      b.t += dt;
      if (b.t < b.warn) return;
      b.life -= dt;
      if (h.dead || h.shield > 0 || this.boostIs('masque')) return;
      const dx = b.x - h.x, dy = b.y - h.y, d = Math.hypot(dx, dy * 2.4);
      if (d < b.r * 2.4 && h.z < 60) { h.x += dx * 1.5 * dt; h.y += dy * 1.1 * dt; } // aspiration
      b.tick -= dt;
      if (d < b.r && b.tick <= 0) { b.tick = 0.5; this.applyHit(b.owner, h, 5 * BALANCE.mini.specialDmg * 2 * this.bossDmgK(), { noStagger: true }); }
    });
    this.blackholes = this.blackholes.filter(b => b.life > 0);
  },

  // ---------- GO ! ----------
  goShow(sound = true) {
    if (this.mode === 'survival' || this.hero.dead) return;
    this.goT = 99; this.goCam = this.camX; this.idleT = 0;
    if (sound) { const n = 'go-' + (this.goN++ % 2 + 1); if (!Samples.play(n, 0.2, 1, 1)) Sfx.jingle('stage'); }
  },
  updateGo(dt) {
    if (this.goT > 0 && this.camX - this.goCam > 160) this.goT = 0;
    // on peut avancer mais on attend : le GO revient au bout de 4 s
    const free = this.mode !== 'survival' && this.bossPhase === 0 && !this.wave && !this.ev && !this.miniActive() && !this.hero.dead && this.lockMax > this.camX + 40;
    if (!free || this.goT > 0 || Math.abs(this.camX - this.lastCam) > 3) { this.idleT = 0; this.lastCam = this.camX; return; }
    this.idleT += dt;
    if (this.idleT > 4 && !this.enemies.some(e => !e.dead && !e.golden && e.entering <= 0)) this.goShow(true);
  },
  drawGo(ctx, VW) {
    if (!(this.goT > 0) || this.mode === 'survival' || this.wave || this.ev || this.miniActive() || this.bossPhase > 0) return;
    const t = this.t, x = VW - this.marginR - 30, y = VIEW_H * 0.4, s = 1 + Math.sin(t * 6) * 0.06;
    const a = Math.min(1, (99 - this.goT) * 5);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.06);
    ctx.textAlign = 'right'; ctx.lineJoin = 'round';
    ctx.font = '900 76px "Arial Black", Arial'; ctx.lineWidth = 12; ctx.strokeStyle = '#000'; ctx.fillStyle = '#feca57';
    ctx.strokeText('GO !', 0, 0); ctx.fillText('GO !', 0, 0);
    // trois chevrons qui filent vers la droite
    for (let i = 0; i < 3; i++) {
      const k = (Math.sin(t * 8 - i * 1.1) + 1) / 2, cx0 = -170 + i * 58 + ((t * 70) % 18);
      ctx.globalAlpha = a * (0.3 + k * 0.7);
      ctx.beginPath(); ctx.moveTo(cx0, 26); ctx.lineTo(cx0 + 28, 52); ctx.lineTo(cx0, 78); ctx.lineTo(cx0 + 14, 78); ctx.lineTo(cx0 + 42, 52); ctx.lineTo(cx0 + 14, 26); ctx.closePath();
      ctx.fillStyle = '#feca57'; ctx.lineWidth = 6; ctx.stroke(); ctx.fill();
    }
    ctx.restore();
  },

  // ---------- aides de la première fois ----------
  hintData() { return Save.data.hints || (Save.data.hints = {}); },
  hintOk(k) { const H = this.hintData(); return (H[k] || 0) < HINTS[k].n && (H[k + 'T'] || 0) < HINTS[k].max; },
  hintDone(k) { const H = this.hintData(); H[k] = (H[k] || 0) + 1; Save.save(true); },
  updateHints(dt) {
    const h = this.hero; let hint = null;
    if (!h.dead && !(this.ev && this.ev.lockHero) && this.cine < 0.3 && !this.ended) {
      if (this.carry && this.hintOk('throw')) hint = { k: 'throw', who: h, text: 'Lâche FRAPPE pour le lancer !', icon: '🫳' };
      else if (!this.carry && !this.heldItem && this.hintOk('grab') && (h.canAct() || h.state === 'attack')) {
        const t = this.enemies.find(e => !e.dead && !e.isBoss && !e.isMini && !e.fly && !e.heavy && e.entering <= 0 && e.thrownT <= 0 && this.inMeleeZone(h, e, 45));
        if (t) hint = { k: 'grab', who: t, text: "Maintiens FRAPPE pour l'attraper", icon: '✊', pulse: 'attack' };
      }
      if (!hint && this.hintOk('special') && h.specialCd <= 0 && this.enemies.some(e => !e.dead && e.entering <= 0 && Math.abs(e.x - h.x) < 320))
        hint = { k: 'special', who: h, text: 'Ton spécial est prêt : appuie sur SPÉCIAL', icon: '★', pulse: 'special' };
    }
    if (hint) { const H = this.hintData(); H[hint.k + 'T'] = (H[hint.k + 'T'] || 0) + dt; }
    this.hint = hint;
    // le bouton concerné clignote sur l'écran tactile
    const want = hint && hint.pulse || null;
    if (want !== this.hintPulse) {
      document.querySelectorAll('.pad.hint-pulse').forEach(b => b.classList.remove('hint-pulse'));
      if (want) { const b = document.querySelector(`.pad[data-btn="${want}"]`); if (b) b.classList.add('hint-pulse'); }
      this.hintPulse = want;
    }
  },
  drawHint(ctx) {
    const hn = this.hint; if (!hn) return;
    const w = hn.who, sx = w.x - this.camX, sy = w.y - w.z - w.height - 46 + Math.sin(this.t * 5) * 4;
    ctx.save(); ctx.font = 'bold 15px "Trebuchet MS", Arial'; ctx.textAlign = 'center';
    const txt = hn.icon + '  ' + hn.text, tw = ctx.measureText(txt).width + 24;
    const x = clamp(sx, tw / 2 + 8, this.VW - tw / 2 - 8);
    ctx.fillStyle = 'rgba(20,10,40,.88)'; ctx.strokeStyle = '#feca57'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x - tw / 2, sy - 34, tw, 30, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 8, sy - 5); ctx.lineTo(sx, sy + 7); ctx.lineTo(sx + 8, sy - 5); ctx.closePath(); ctx.fillStyle = '#feca57'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, x, sy - 14);
    ctx.restore();
  },

  // ---------- HUD : barre à 3 repères, barre du mini-boss ----------
  drawTierBar(ctx, VW) {
    const x0 = VW / 2 - 120, w = 240, y = 41, len = this.levelLen - this.VW;
    const pg = clamp(this.camX / len, 0, 1);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(x0, y - 4, w, 8, 4); ctx.fill();
    ctx.fillStyle = '#feca57'; ctx.beginPath(); ctx.roundRect(x0, y - 4, Math.max(8, w * pg), 8, 4); ctx.fill();
    const marks = [
      { at: LAYOUT.mini / len, icon: '💀', done: this.mini.done },
      { at: LAYOUT.ev / len, icon: '🎯', done: this.evDone },
      { at: 1, icon: '👑', done: this.bossPhase >= 3 },
    ];
    marks.forEach((m, i) => {
      const mx = x0 + w * m.at, cur = this.currentTier() === i + 1;
      const r = cur ? 12 + Math.sin(this.t * 6) * 1.5 : 11;
      ctx.fillStyle = m.done ? '#2ecc71' : cur ? '#ff9f43' : '#2d3436'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(m.done ? '✓' : m.icon, mx, y + 1);
    });
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  },
  drawMiniBar(ctx, VW) {
    const e = this.miniE;
    if (!e || e.dead || e.entering > 0 || this.cine > 0.5 || (this.boss && !this.boss.dead && this.bossPhase >= 1)) return;
    const bw = Math.min(440, VW * 0.48), bx = VW / 2 - bw / 2, by = VIEW_H - 34, T = BALANCE.mini.tiers, f = e.hp / e.maxHp;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(bx - 6, by - 22, bw + 12, 42, 10); ctx.fill();
    ctx.font = '900 15px "Arial Black", Arial'; ctx.textAlign = 'left'; ctx.fillStyle = MINI_COL[e.kind] || '#ff9f43';
    ctx.fillText('MINI-BOSS — ' + e.def.name.toUpperCase(), bx, by - 6);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffeaa7'; ctx.fillText('NIVEAU ' + ((e.tier || 0) + 1) + '/' + T, bx + bw, by - 6);
    ctx.fillStyle = '#300'; ctx.fillRect(bx, by, bw, 12);
    const TC = ['#f39c12', '#e67e22', '#e74c3c'], sw = bw / T;
    for (let i = 0; i < T; i++) { const k = clamp(f * T - i, 0, 1); if (k <= 0) continue; ctx.fillStyle = TC[T - 1 - i]; ctx.fillRect(bx + i * sw, by, sw * k, 12); }
    ctx.fillStyle = '#000'; for (let i = 1; i < T; i++) ctx.fillRect(bx + i * sw - 1.5, by - 2, 3, 16);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 12);
    ctx.restore();
  },

  // ---------- objectifs (menu pause) ----------
  goalsHtml() {
    const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0');
    if (this.mode === 'survival') { const rec = (Save.data.survival || {})[this.world.id]; return `<div>🏁 Vague <b>${Math.max(1, this.survWave)}</b>${rec ? ` · record : vague ${rec.wave}` : ''}</div>`; }
    if (this.mode === 'bossrush') return `<div>👑 Boss <b>${UI.run.idx + 1} / ${UI.run.order.length}</b></div>`;
    const ok = '<span class="g-ok">✓</span>', ko = '<span class="g-ko">✗</span>', todo = '<span class="g-todo">…</span>';
    const half = this.hero.hp / this.hero.maxHp > 0.5;
    const m = this.medalFor(this.time);
    const rows = [
      `<div class="g-tier">Tiers <b>${this.currentTier()} / 3</b></div>`,
      `<div>${this.bossPhase >= 3 ? ok : todo} ★ Battre ${CHARACTERS[this.world.boss].name}</div>`,
      `<div>${this.evDone ? (this.evOk ? ok : ko) : todo} ★ Réussir l'épreuve${this.evDone ? '' : ' (2e tiers)'}</div>`,
      `<div>${half ? ok : ko} ★ Finir avec plus de la moitié de ta vie</div>`,
      `<div>⏱ ${m ? `${m.icon} encore possible : il reste ${fmt(m.max - this.time)}` : 'plus de médaille possible cette fois'}</div>`,
      `<div>💰 Ennemi en or : ${{ avenir: 'pas encore vu', battu: 'battu !', enfui: 'il s\'est enfui' }[this.goldState] || 'pas encore vu'}</div>`,
    ];
    return rows.join('');
  },
};
Object.assign(Game, Tiers);
