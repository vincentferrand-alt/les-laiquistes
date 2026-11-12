// ============================================================
//  LES LAÏQUISTES — Finitions (v3.8)
//  Graphismes :
//   A. Onomatopées BD propres à chaque héros (« WOUF ! » pour Fateh, « BLIP ! » pour Faouzi…) ;
//      sur les gros coups, elles sortent sur une étoile de BD à la couleur du héros.
//   B. Carte d'entrée du boss façon jeu de combat : ralenti, bandeau à rayures, boss en grand.
//   C. K.O. du boss au ralenti : zoom, flash, il s'envole en tournoyant.
//   (L'ambiance animée par monde est dans backgrounds.js : drawWorldAtmos.)
//  Jeu :
//   D. Bonus temporaires, un par monde (casque, Rolex, os, champignon, canette, thé, masque à gaz).
//      On les trouve dans les caisses, sur l'ennemi en or, et le boss en lâche un à son 3e niveau de vie.
//   E. Ennemi en or : un par monde (une vague sur trois en Survie). Il fuit et s'échappe au bout de 12 s.
//      Battu : gros bonus de points + un bonus temporaire.
//   F. Attaques des boss annoncées au sol (zone rouge) pendant leur préparation.
//   G. Chrono et médailles de vitesse (or / argent / bronze) par monde.
//  Tout s'ajoute à l'objet Game (game.js) : Object.assign(Game, Extras).
// ============================================================

// ---------- Réglages ----------
const EXTRA = {
  powerCrate: 0.3,     // chance qu'une caisse lâche un bonus temporaire (avant l'arme / la nourriture)
  goldHpMul: 2.2,      // l'ennemi en or est plus solide…
  goldSpeed: 1.1,      // … et un peu plus rapide
  goldFlee: 12,        // il s'échappe au bout de n secondes
  goldScore: 1000,     // points (× niveau de difficulté)
  goldTrophy: 5,       // trophée « Ruée vers l'or » au bout de n ennemis en or battus
  // médailles de vitesse : temps maximum (s) pour finir un monde (histoire, choix du niveau, défi du jour)
  medals: [
    // (v3.9 : niveau en 3 tiers, plus long → seuils relevés ; avant : 170 / 215 / 270)
    { id: 3, max: 225, icon: '🥇', name: "MÉDAILLE D'OR", col: '#ffd32a' },
    { id: 2, max: 285, icon: '🥈', name: "MÉDAILLE D'ARGENT", col: '#dfe6e9' },
    { id: 1, max: 360, icon: '🥉', name: 'MÉDAILLE DE BRONZE', col: '#e1a95f' },
  ],
};

// Onomatopées des héros (couleur de l'étoile de BD)
const HERO_WORDS = {
  christian: { words: ['TCHAK !', 'BLAM !', 'CLONK !'], col: '#f39c12' },
  guilhem:   { words: ['BLING !', 'CLING !', 'SHLAK !'], col: '#f1c40f' },
  fateh:     { words: ['WOUF !', 'WAF !', 'GRRR !'], col: '#a55eea' },
  faouzi:    { words: ['BLIP !', 'PEW !', 'BZIOU !'], col: '#2ecc71' },
  venum:     { words: ['POW !', 'SBAM !', 'BOUM !'], col: '#ff4757' },
  senoussi:  { words: ['BÊÊÊ !', 'TOC !', 'BONK !'], col: '#e67e22' },
  purf:      { words: ['SPLOTCH !', 'BEURK !', 'SPLAF !'], col: '#a3e635' },
};

// Bonus temporaires : un par monde
const POWERUPS = {
  casque:  { name: 'CASQUE DE CHANTIER', desc: 'Invincible !', dur: 6, col: '#f1c40f' },
  rolex:   { name: 'ROLEX EN OR', desc: 'Points ×2', dur: 12, col: '#feca57' },
  os:      { name: 'OS À MOELLE', desc: 'Force ×1,6', dur: 10, col: '#ff7675' },
  champi:  { name: 'CHAMPIGNON 8-BIT', desc: 'Géant ! Force ×1,4', dur: 9, col: '#e74c3c' },
  canette: { name: 'BOISSON ÉNERGISANTE', desc: 'Vitesse ×1,4', dur: 10, col: '#00d2ff' },
  the:     { name: 'THÉ À LA MENTHE', desc: 'Spécial qui se recharge à toute vitesse', dur: 10, col: '#2ecc71' },
  masque:  { name: 'MASQUE À GAZ', desc: 'Dangers sans effet + soin', dur: 10, col: '#a3e635' },
};
const WORLD_POWER = { christian: 'casque', guilhem: 'rolex', fateh: 'os', faouzi: 'champi', venum: 'canette', senoussi: 'the', purf: 'masque' };

const Extras = {
  extrasStart() {
    this.boost = null; this.boostPop = 0;
    this.koT = 0; this.msg = null;
    this.goldDone = false; this.goldT = 0; this.goldWave = randi(0, 2); this.goldSurv = 0;
    this.medalOn = ['story', 'select', 'daily'].includes(this.mode);
    this.hero.scaleTarget = 1;
  },

  // appelé à chaque image, juste après updateCombat
  updateExtras(dt, rdt) {
    if (this.koT > 0) this.koT -= rdt;
    if (this.msg) { this.msg.t -= rdt; if (this.msg.t <= 0) this.msg = null; }
    if (this.boostPop > 0) this.boostPop -= rdt;
    this.updateBoost(dt);
    this.updateGoldSpawn(dt);
    this.updatePowerPickups(dt);
    // paillettes autour des ennemis en or
    this.enemies.forEach(e => {
      if (e.golden && !e.dead && Math.random() < 0.45) this.particles.push({ type: 'glint', x: e.x + rand(-e.halfW, e.halfW), y: e.y, z: rand(10, e.height), vx: 0, vy: 0, vz: rand(20, 60), life: 0.6, max: 0.6, r: rand(4, 8) });
    });
  },

  // message centré (ennemi en or, jackpot…)
  flashMsg(title, sub, col = '#feca57', dur = 2.2) { this.msg = { title, sub, col, t: dur, max: dur }; },

  // ---------- A. Onomatopées ----------
  hitText(src, o, hz, big) {
    const hw = src && src.team === 'hero' && HERO_WORDS[src.kind];
    const x = o.x + rand(-10, 10);
    if (hw && big) this.text(x, o.y, hz + 30, pick(hw.words), '#fff', 28, 0.9, { burst: hw.col, rot: rand(-0.25, 0.25) });
    else if (hw) this.text(x, o.y, hz + 20, pick(hw.words), hw.col, 20);
    else this.text(x, o.y, hz + 20, pick(HIT_WORDS), big ? '#ff9f43' : '#fff', big ? 26 : 20);
  },

  // ---------- B. Carte d'entrée du boss (bandeau plein écran, puis la petite carte habituelle) ----------
  renderBossSplash(ctx, card, el) {
    const VW = this.VW, H = VIEW_H;
    const inP = clamp(el / 0.28, 0, 1), outP = clamp((el - 1.45) / 0.3, 0, 1);
    const k = easeOut(inP) * (1 - outP);
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.45 * k})`; ctx.fillRect(0, 0, VW, H);
    ctx.translate(VW / 2, H * 0.5); ctx.rotate(-0.1);
    ctx.translate((1 - easeOut(inP)) * VW * 1.3 - easeOut(outP) * VW * 1.3, 0); // entre par la droite, sort par la gauche
    const bw = VW * 1.7, hh = 190;
    ctx.fillStyle = card.mini ? card.col : (HERO_WORDS[card.kind] || {}).col || card.col; ctx.fillRect(-bw / 2, -hh / 2, bw, hh); // couleur vive du perso
    // rayures qui défilent
    ctx.save(); ctx.beginPath(); ctx.rect(-bw / 2, -hh / 2, bw, hh); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    const off = (el * 260) % 70;
    for (let x = -bw / 2 - 140; x < bw / 2 + 70; x += 70) { ctx.beginPath(); ctx.moveTo(x + off, -hh / 2); ctx.lineTo(x + off + 35, -hh / 2); ctx.lineTo(x + off - 15, hh / 2); ctx.lineTo(x + off - 50, hh / 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; // traits de vitesse
    for (let i = 0; i < 9; i++) { const y = -hh / 2 + 12 + ((i * 53) % (hh - 20)), x = ((i * 211 - el * 900) % bw + bw) % bw - bw / 2; ctx.fillRect(x, y, 120 + (i % 3) * 60, 3); }
    ctx.restore();
    ctx.fillStyle = '#000'; ctx.fillRect(-bw / 2, -hh / 2 - 10, bw, 10); ctx.fillRect(-bw / 2, hh / 2, bw, 10);
    ctx.fillStyle = '#fff'; ctx.fillRect(-bw / 2, -hh / 2 - 15, bw, 5); ctx.fillRect(-bw / 2, hh / 2 + 10, bw, 5);
    // le boss en grand, qui déborde du bandeau par le haut
    const cdef = card.mini ? MINIBOSSES[card.kind] : CHARACTERS[card.kind];
    if (cdef) {
      ctx.save(); ctx.beginPath(); ctx.rect(-bw / 2, -hh / 2 - 200, bw, hh + 200); ctx.clip();
      ctx.translate(VW * 0.24, hh / 2 + 4); ctx.rotate(0.1);
      const sc = 2.6 * 100 / Math.max(80, cdef.bh), so = { dir: -1, scale: Math.min(sc, card.kind === 'moutong' ? 1.9 : 9), t: el * 1.5 + 2, pose: el < 0.9 ? 'windup' : 'taunt' };
      if (card.mini) miniSprite(ctx, card.kind, so); else menuSprite(ctx, card.kind, so); // (mini-boss : minis.js)
      ctx.restore();
    }
    // nom
    ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    const tx = -VW * 0.4;
    ctx.font = '900 22px "Arial Black", Arial'; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.fillStyle = '#feca57';
    const lab = card.mini ? 'MINI-BOSS' : 'BOSS'; ctx.strokeText(lab, tx, -42); ctx.fillText(lab, tx, -42);
    ctx.font = '900 70px "Arial Black", Arial'; ctx.lineWidth = 10; ctx.fillStyle = '#fff';
    ctx.strokeText(card.name, tx, 22); ctx.fillText(card.name, tx, 22);
    ctx.font = 'italic 900 24px "Trebuchet MS", Arial'; ctx.lineWidth = 6; ctx.fillStyle = '#ffeaa7';
    ctx.strokeText(card.title, tx + 4, 60); ctx.fillText(card.title, tx + 4, 60);
    ctx.restore();
  },

  // ---------- C. K.O. du boss ----------
  bossKO(e) {
    const dir = Math.sign(e.x - this.hero.x) || 1;
    e.vz = 950; e.kx = dir * 480; e.rotV = dir * 15; // il s'envole en tournoyant
    this.koT = 1.8; this.koX = e.x; this.koY = e.y - e.height * 0.6;
    this.slowT = Math.max(this.slowT, 1.7);
    this.flashA = 0.85; this.flashCol = '255,255,255';
    this.bossCard = null; this.cineT = Math.max(this.cineT, 1.7); // bandes noires, sans carte
    this.text(e.x, e.y, e.height + 30, 'K.O. !', '#fff', 64, 2, { burst: '#ff4757', rot: -0.12 });
    Sfx.tone('sawtooth', 180, 40, 0.9, 0.25); Sfx.noise(0.8, 0.3, 300, 0, 0.6);
  },
  // zoom pendant le K.O. (0 → 1 → 0)
  koAmount() {
    if (this.koT <= 0) return 0;
    return Math.sin(clamp((1.8 - this.koT) / 0.25, 0, 1) * Math.PI / 2) * clamp(this.koT / 0.45, 0, 1);
  },

  // ---------- D. Bonus temporaires ----------
  boostIs(type) { return !!(this.boost && this.boost.type === type); },
  boostDmg() { return this.boostIs('os') ? 1.6 : this.boostIs('champi') ? 1.4 : 1; },
  boostSpeed() { return this.boostIs('canette') ? 1.4 : 1; },
  dropPower(x, y, type) {
    const B = this.bounds();
    type = type || WORLD_POWER[this.world.id] || 'casque';
    this.pickups.push({ power: type, x: clamp(x, B.L + 50, B.R - 50), y: clamp(y, GROUND_TOP + 20, GROUND_BOTTOM - 5), t: 0, life: 16 });
  },
  updatePowerPickups() {
    const h = this.hero; if (h.dead) return;
    this.pickups.forEach(p => {
      if (p.power && p.life > 0 && Math.abs(p.x - h.x) < 38 && Math.abs(p.y - h.y) < 28 && h.z < 70) { p.life = 0; this.givePower(p.power); }
    });
  },
  givePower(type) {
    const P = POWERUPS[type], h = this.hero;
    this.endBoost(true);
    this.boost = { type, t: P.dur, max: P.dur };
    this.boostPop = 1.6;
    if (type === 'champi') h.scaleTarget = 1.3;
    if (type === 'the') h.specialCd = 0;
    this.flashA = Math.max(this.flashA, 0.3); this.flashCol = '255,245,190';
    this.text(h.x, h.y, h.height + 50, P.name + ' !', P.col, 24, 1.6, { wob: 1, stroke: '#000' });
    this.spark(h.x, h.y, h.height * 0.6, 14);
    [0, 4, 7, 12, 16].forEach((iv, i) => Sfx.tone('square', midiHz(72 + iv), null, 0.1, 0.12, i * 0.055));
    Sfx.tone('triangle', midiHz(96), null, 0.4, 0.1, 0.3);
    Haptics.vibrate([30, 30, 50]);
    Progress.count('powers');
  },
  endBoost(silent) {
    if (!this.boost) return;
    const h = this.hero; h.shield = 0; h.scaleTarget = 1; this.boost = null;
    if (!silent) { this.text(h.x, h.y, h.height + 30, 'FIN DU BONUS', '#dfe6e9', 16, 1); Sfx.tone('square', 660, 220, 0.25, 0.08); }
  },
  updateBoost(dt) {
    const h = this.hero, b = this.boost;
    const st = h.scaleTarget || 1; // grossit / rétrécit en douceur (champignon)
    if (Math.abs(h.scale - st) > 0.002) h.scale += (st - h.scale) * Math.min(1, dt * 8); else h.scale = st;
    if (!b) { h.shield = 0; return; }
    if (h.dead) { this.endBoost(true); return; }
    b.t -= dt;
    h.shield = b.type === 'casque' ? 1 : 0;
    if (b.type === 'the' && h.specialCd > 0) h.specialCd -= dt * 3;
    if (b.type === 'masque') h.hp = Math.min(h.maxHp, h.hp + 3 * dt);
    if (b.type === 'canette' && h.state === 'walk' && Math.random() < 0.6) this.particles.push({ type: 'speed', x: h.x - h.dir * rand(10, 30), y: h.y, z: h.z + h.height * rand(0.3, 1), vz: 0, vx: -h.dir * 200, life: 0.18, max: 0.18 });
    if (Math.random() < 0.25) this.particles.push({ type: 'glint', x: h.x + rand(-h.halfW, h.halfW), y: h.y, z: rand(5, h.height), vx: 0, vy: 0, vz: rand(40, 90), life: 0.6, max: 0.6, r: rand(3, 6), col: POWERUPS[b.type].col });
    if (b.t <= 0) this.endBoost();
  },

  // ---------- E. Ennemi en or ----------
  updateGoldSpawn(dt) {
    if (this.hero.dead || this.ev || this.bossPhase > 0) return;
    if (this.mode === 'survival') { // une vague sur trois (2, 5, 8…), hors retour du boss
      if (this.survWave >= 2 && this.survWave % 3 === 2 && this.goldSurv !== this.survWave && !this.spawnQueue.length && !this.survBoss) { this.goldSurv = this.survWave; this.spawnGolden(); }
      return;
    }
    if (this.goldDone || !this.medalOn) return;
    const w = this.waves[this.goldWave];
    if (!w || !w.started || (this.spawnQueue.length && !w.done)) return;
    this.goldT += dt;
    if (this.goldT > 1.5) { this.goldDone = true; this.spawnGolden(); }
  },
  spawnGolden() {
    const kinds = this.world.minions.map(m => m[0]).filter(k => MINIONS[k].beh !== 'flyer');
    const e = this.spawnEnemy(pick(kinds.length ? kinds : [this.world.minions[0][0]]), { hpMul: EXTRA.goldHpMul });
    e.golden = true; e.goldT = 0; e.speed *= EXTRA.goldSpeed; e.dmg = 0; e.attackCd = 99; this.goldState = 'encours';
    this.flashMsg('UN ENNEMI EN OR !', "Bats-le avant qu'il s'enfuie", '#ffd32a');
    [0, 3, 7, 10, 14, 19].forEach((iv, i) => Sfx.tone('triangle', midiHz(84 + iv), null, 0.12, 0.1, i * 0.05));
  },
  // IA de l'ennemi en or : il fuit le héros en zigzag, puis s'échappe par le bord le plus proche
  thinkGolden(e, dt) {
    const h = this.hero, B = this.bounds();
    if (e.escaping) {
      const dir = e.escDir || (e.escDir = e.x < (B.L + B.R) / 2 ? -1 : 1);
      e.x += dir * e.speed * 1.4 * dt; e.dir = dir; e.state = 'walk'; e.walk += dt * 14;
      { const E = this.edges(); if (e.x < E.L - 120 || e.x > E.R + 120) e.remove = true; } // il sort vraiment de l'écran
      return;
    }
    const side = Math.sign(e.x - h.x) || 1;
    let tx = h.x + side * 300;
    if (tx > B.R - 60 || tx < B.L + 60) tx = h.x - side * 300; // coincé contre le bord : il repasse de l'autre côté
    tx = clamp(tx, B.L + 50, B.R - 50);
    const ty = clamp((GROUND_TOP + GROUND_BOTTOM) / 2 + Math.sin(e.goldT * 1.8) * 80, GROUND_TOP + 15, GROUND_BOTTOM);
    const spd = e.speed * 0.8, mx = tx - e.x, my = ty - e.y;
    const moveX = Math.abs(mx) > 8 ? Math.sign(mx) : 0, moveY = Math.abs(my) > 5 ? Math.sign(my) : 0;
    e.x += moveX * spd * dt; e.y += moveY * spd * 0.55 * dt;
    if (moveX) e.dir = moveX;
    if (moveX || moveY) { e.state = 'walk'; e.walk += dt * 12; } else e.state = 'idle';
  },
  goldTick(e, dt) {
    e.goldT += dt;
    if (!e.escaping && (e.goldT > EXTRA.goldFlee || this.ev || this.bossPhase > 0)) {
      e.escaping = true; e.stun = 0; this.goldState = 'enfui';
      if (e.state === 'hurt' || e.state === 'down') e.setState('idle');
      this.text(e.x, e.y, e.height + 40, "IL S'ENFUIT !", '#ffd32a', 22, 1.4, { wob: 1, stroke: '#5c3d00' });
      Sfx.tone('triangle', 1200, 300, 0.5, 0.12);
    }
  },
  onGoldKill(e) {
    this.addScore(EXTRA.goldScore); this.goldState = 'battu';
    for (let i = 0; i < 30; i++) this.particles.push({ type: 'coin', x: e.x, y: e.y, z: e.height * 0.6, vx: rand(-300, 300), vy: rand(-40, 40), vz: rand(300, 750), life: 1.6, max: 1.6 });
    this.text(e.x, e.y, e.height + 40, 'JACKPOT !', '#fff', 40, 1.6, { burst: '#ffd32a', rot: -0.1 });
    this.flashMsg('+' + Math.round(EXTRA.goldScore * this.L.score * (this.mod.score || 1) * (this.boostIs('rolex') ? 2 : 1)) + ' POINTS', 'et un bonus à ramasser !', '#ffd32a', 1.8);
    this.dropPower(e.x, e.y);
    [0, 4, 7, 12, 16, 19, 24].forEach((iv, i) => Sfx.tone('square', midiHz(76 + iv), null, 0.1, 0.12, i * 0.05));
    Haptics.vibrate([40, 30, 80]);
    Progress.count('golden');
  },

  // ---------- F. Attaques des boss annoncées au sol ----------
  drawBossTelegraphs(ctx, cx, gt) {
    this.enemies.forEach(e => {
      if (!(e.isBoss || e.isMini) || e.dead || e.state !== 'windup' || e.entering > 0) return;
      const a = e.nextAction, p = clamp(e.st / (e.stateDur || 1), 0, 1), pul = warnPulse(gt), d = e.dir, sx = e.x - cx, sc = e.scale;
      const ell = (x, y, rx, ry, col = '255,40,40') => {
        ctx.fillStyle = `rgba(${col},${0.1 + 0.25 * p})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(${col},${0.5 + pul * 0.45})`; ctx.lineWidth = 3; ctx.setLineDash([10, 7]);
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      };
      const lane = (x0, len, y, hh, col = '255,40,40') => {
        const x1 = x0 + d * len, l = Math.min(x0, x1), w = Math.abs(len);
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, `rgba(${col},${0.15 + 0.3 * p})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fillRect(l, y - hh, w, hh * 2);
        ctx.strokeStyle = `rgba(${col},${0.45 + pul * 0.45})`; ctx.lineWidth = 2; ctx.setLineDash([12, 8]);
        ctx.beginPath(); ctx.moveTo(x0, y - hh); ctx.lineTo(x1, y - hh); ctx.moveTo(x0, y + hh); ctx.lineTo(x1, y + hh); ctx.stroke(); ctx.setLineDash([]);
        // flèches qui avancent dans le couloir
        ctx.fillStyle = `rgba(${col},${0.55 * (0.4 + p * 0.6)})`;
        for (let i = 0; i < 4; i++) { const ax = x0 + d * (((gt * 260 + i * len / 4) % len)); ctx.beginPath(); ctx.moveTo(ax + d * 14, y); ctx.lineTo(ax - d * 6, y - hh * 0.6); ctx.lineTo(ax - d * 6, y + hh * 0.6); ctx.fill(); }
      };
      ctx.save();
      if (a === 'attack') ell(sx + d * (e.halfW + e.reach * 0.55), e.y, (e.halfW + e.reach) * 0.6, 22 + 9 * (sc + 1));
      else if (a === 'shoot') lane(sx + d * 30, 520, e.y, 18);
      else if (a === 'special' && e.isMini) { // mini-boss (tiers.js)
        const sp = e.def.special;
        if (sp === 'belier' || sp === 'dring') lane(sx, sp === 'belier' ? 380 : 560, e.y, sp === 'belier' ? 40 * sc : 22);
        else if (sp !== 'trounoir') [-40, 0, 40].forEach(dy => lane(sx + d * 30, 560, e.y + dy, 13));
      }
      else if (a === 'special') {
        switch (BOSS_SPECIAL[e.kind]) {
          case 'truelle': ell(sx + d * 60 * sc, e.y, 175 * sc, 62 * sc); break;
          case 'rolex': ell(sx, e.y, 460, 95, '255,215,40'); break;
          case 'fumee': ell(sx + d * 30, e.y, BALANCE.boss.cloudRadius, BALANCE.boss.cloudRadius * 0.45, '163,230,53'); break;
          case 'direct': case 'imperatif': lane(sx, 340, e.y, 32 * sc); break;
          case 'cartouches': [-36, 0, 36].forEach(dy => lane(sx + d * 30, 600, e.y + dy, 13)); break;
        }
      }
      ctx.restore();
    });
  },

  // ---------- G. Chrono et médailles ----------
  medalFor(time) { return EXTRA.medals.find(m => time <= m.max) || null; },

  // ---------- rendu ----------
  // ajoute à la liste triée par profondeur : aura du héros (bonus) et des ennemis en or
  extrasDraw(list, ctx, cx, gt) {
    const h = this.hero, b = this.boost;
    if (b && !h.dead) list.push({ y: h.y - 0.5, draw: () => {
      const P = POWERUPS[b.type], blink = b.t < 2 && Math.floor(gt * 10) % 2;
      if (blink) return;
      ctx.save(); ctx.translate(h.x - cx, h.y - h.z);
      if (b.type === 'casque') { // bulle de protection dorée
        const r = h.height * 0.75;
        ctx.fillStyle = `rgba(255,230,90,${0.16 + Math.sin(gt * 8) * 0.05})`; ctx.strokeStyle = 'rgba(255,240,140,.9)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, -h.height * 0.5, r * 0.8, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        const g = ctx.createRadialGradient(0, -h.height * 0.5, 4, 0, -h.height * 0.5, h.height * 0.8);
        g.addColorStop(0, hexA(P.col, 0.35)); g.addColorStop(1, hexA(P.col, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -h.height * 0.5, h.height * 0.6, h.height * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } });
    this.enemies.forEach(e => { if (e.golden && !e.dead) list.push({ y: e.y - 0.5, draw: () => {
      const g = ctx.createRadialGradient(e.x - cx, e.y - e.z - e.height * 0.5, 4, e.x - cx, e.y - e.z - e.height * 0.5, e.height * 0.9);
      g.addColorStop(0, `rgba(255,215,40,${0.45 + Math.sin(gt * 6) * 0.1})`); g.addColorStop(1, 'rgba(255,215,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x - cx, e.y - e.z - e.height * 0.5, e.height * 0.9, 0, Math.PI * 2); ctx.fill();
    } }); });
  },

  extrasHUD(ctx, VW) {
    const h = this.hero, b = this.boost;
    // bonus en cours : une petite icône à droite du panneau du héros, entourée d'une jauge qui se vide (v3.12 ;
    // avant : un grand panneau sous la vie). Son nom est annoncé au-dessus du héros quand il le ramasse.
    if (b) {
      const P = POWERUPS[b.type], f = clamp(b.t / b.max, 0, 1), s = 1 + Math.max(0, this.boostPop - 1.2) * 1.2;
      ctx.save(); ctx.translate(310, 31); ctx.scale(s, s);
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.scale(0.62, 0.62); drawPowerIcon(ctx, b.type, this.t); ctx.restore();
      ctx.lineCap = 'round'; ctx.lineWidth = 4; // jauge circulaire : temps restant (clignote à la fin)
      ctx.strokeStyle = b.t < 2 && Math.floor(this.t * 8) % 2 ? '#fff' : P.col;
      ctx.beginPath(); ctx.arc(0, 0, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
      ctx.restore();
    }
    // chrono (histoire, choix du niveau, défi du jour) : couleur de la médaille encore possible
    if (this.medalOn && this.bossPhase < 3) {
      const m = this.medalFor(this.time), tm = this.time;
      const lbl = '⏱ ' + Math.floor(tm / 60) + ':' + String(Math.floor(tm % 60)).padStart(2, '0') + (m ? ' ' + m.icon : '');
      ctx.save(); ctx.textAlign = 'center'; ctx.font = '900 15px "Arial Black", Arial'; ctx.lineWidth = 4; ctx.strokeStyle = '#000';
      ctx.fillStyle = m ? m.col : '#b2bec3';
      ctx.strokeText(lbl, VW / 2, 54); ctx.fillText(lbl, VW / 2, 54);
      ctx.restore();
    }
    // message centré
    if (this.msg) {
      const m = this.msg, a = Math.min(1, m.t / 0.4), s = 1 + Math.max(0, m.t - (m.max - 0.25)) * 3;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(VW / 2, VIEW_H * 0.24); ctx.scale(s, s); ctx.rotate(-0.03);
      ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.font = '900 40px "Arial Black", Arial'; ctx.lineWidth = 9; ctx.strokeStyle = '#000'; ctx.strokeText(m.title, 0, 0); ctx.fillStyle = m.col; ctx.fillText(m.title, 0, 0);
      if (m.sub) { ctx.font = '900 18px "Arial Black", Arial'; ctx.lineWidth = 5; ctx.strokeText(m.sub, 0, 28); ctx.fillStyle = '#fff'; ctx.fillText(m.sub, 0, 28); }
      ctx.restore();
    }
  },
};
Object.assign(Game, Extras);

// ---------- dessins ----------
// couleur #rrggbb → rgba avec transparence
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// Étoile de BD derrière une onomatopée
function drawBurst(ctx, w, col, t) {
  const r = w * 0.62 + 16, n = 14;
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + t, rr = i % 2 ? r * 0.7 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.62 - 8); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.stroke();
}

// Icône d'un bonus (centrée sur 0,0, environ 40 px)
function drawPowerIcon(ctx, type, t) {
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  switch (type) {
    case 'casque': // casque de chantier
      ctx.beginPath(); ctx.moveTo(-17, 4); ctx.quadraticCurveTo(-17, -18, 0, -18); ctx.quadraticCurveTo(17, -18, 17, 4); ctx.closePath(); ctx.fillStyle = '#f1c40f'; ctx.fill(); ctx.stroke();
      rrect(ctx, -22, 2, 44, 7, 3, '#f39c12'); ctx.fillStyle = '#fff3c4'; ctx.fillRect(-3, -17, 6, 18); break;
    case 'rolex': // montre en or
      rrect(ctx, -7, -20, 14, 40, 3, '#d4a017'); circle(ctx, 0, 0, 13, '#f1c40f'); circle(ctx, 0, 0, 9, '#1e272e');
      ctx.strokeStyle = '#f1c40f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -6); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * 3) * 6, Math.sin(t * 3) * 6); ctx.stroke(); break;
    case 'os': // os à moelle
      ctx.save(); ctx.rotate(-0.5);
      [[-14, -5], [-14, 5], [14, -5], [14, 5]].forEach(([x, y]) => circle(ctx, x, y, 6, '#f5f6fa'));
      rrect(ctx, -14, -5, 28, 10, 2, '#f5f6fa', false); ctx.beginPath(); ctx.moveTo(-12, -5); ctx.lineTo(12, -5); ctx.moveTo(-12, 5); ctx.lineTo(12, 5); ctx.stroke(); ctx.restore(); break;
    case 'champi': // champignon 8-bit
      ctx.fillStyle = '#f5e6c8'; ctx.fillRect(-8, -2, 16, 16); ctx.strokeRect(-8, -2, 16, 16);
      ctx.fillStyle = '#111'; ctx.fillRect(-5, 3, 3, 5); ctx.fillRect(2, 3, 3, 5);
      ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-18, -8); ctx.lineTo(-12, -16); ctx.lineTo(12, -16); ctx.lineTo(18, -8); ctx.lineTo(18, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(-5, -14, 10, 7); ctx.fillRect(-16, -7, 6, 6); ctx.fillRect(10, -7, 6, 6); break;
    case 'canette': // boisson énergisante
      rrect(ctx, -10, -18, 20, 36, 4, '#00a8ff'); ctx.fillStyle = '#95a5a6'; ctx.fillRect(-9, -18, 18, 4);
      ctx.fillStyle = '#feca57'; ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(-6, 2); ctx.lineTo(0, 2); ctx.lineTo(-3, 13); ctx.lineTo(7, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'the': // verre de thé à la menthe
      ctx.beginPath(); ctx.moveTo(-11, -14); ctx.lineTo(11, -14); ctx.lineTo(8, 16); ctx.lineTo(-8, 16); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b5651d'; ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(10, -6); ctx.lineTo(8, 15); ctx.lineTo(-8, 15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2ecc71'; ell(ctx, 4, -16, 7, 4, '#2ecc71', true, -0.5); ell(ctx, -3, -18, 6, 3.5, '#27ae60', true, 0.4);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(-4, -22 - Math.sin(t * 3) * 3); ctx.quadraticCurveTo(0, -28, -2, -34); ctx.stroke(); break;
    case 'masque': // masque à gaz
      ell(ctx, 0, -4, 15, 16, '#7f8c8d'); circle(ctx, -6, -8, 5, '#a3e635'); circle(ctx, 6, -8, 5, '#a3e635');
      rrect(ctx, -6, 6, 12, 10, 3, '#2d3436'); circle(ctx, -15, 10, 6, '#636e72'); circle(ctx, 15, 10, 6, '#636e72'); break;
  }
  ctx.restore();
}

// Bonus posé au sol : il flotte, brille et tourne, pour ne pas le confondre avec la nourriture
function drawPowerPickup(ctx, type, x, y, t) {
  const P = POWERUPS[type], bob = Math.sin(t * 4) * 5;
  ctx.save(); ctx.translate(x, y - 34 + bob);
  ctx.save(); ctx.rotate(t * 1.5); ctx.fillStyle = hexA(P.col, 0.28);
  for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -38); ctx.lineTo(7, -38); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30); g.addColorStop(0, hexA(P.col, 0.6)); g.addColorStop(1, hexA(P.col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
  ctx.scale(1.15, 1.15); drawPowerIcon(ctx, type, t);
  ctx.restore();
}

// Petit « ding » (étoiles de l'écran de victoire)
Sfx.ding = function (i = 0) {
  this.tone('sine', midiHz(84 + [0, 4, 7][i % 3]), null, 0.35, 0.2);
  this.tone('triangle', midiHz(96 + [0, 4, 7][i % 3]), null, 0.2, 0.06, 0.01);
};
