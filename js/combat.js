// ============================================================
//  LES LAÏQUISTES — Combat (v3.6)
//  A. Combos gratifiants : compteur central, paliers (×10, ×25, ×50, ×100), ralenti sur le dernier ennemi
//     d'une vague, ennemis éjectés par le coup final.
//  B. Attraper / lancer : rester appuyé sur FRAPPE près d'un ennemi l'attrape (au-dessus de la tête) ;
//     lâcher le bouton le lance devant : il renverse tous ceux qu'il croise.
//  C. Caisses à casser (3 par monde) : elles lâchent de la nourriture ou un OBJET À LANCER propre au monde
//     (brique, vinyle, boule de pétanque, cartouche, batterie, jarre, bidon). Le prochain FRAPPE le lance.
//  D. Les dangers récompensent : un ennemi éliminé par un danger du décor (ou par un ennemi lancé) rapporte
//     un bonus, avec « DOUBLÉ ! », « TRIPLÉ ! »…
//  Tout s'ajoute à l'objet Game (game.js) : Object.assign(Game, Combat).
// ============================================================

// Réglages
const COMBAT = {
  milestones: [[10, 'PAS MAL !', 100], [25, 'LAÏQUE !', 300], [50, 'INARRÊTABLE !', 800], [100, 'LÉGENDAIRE !', 2000]],
  grabHold: 0.32,        // durée d'appui sur FRAPPE pour attraper (s)
  carryMax: 3.5,         // on lâche tout seul au bout de… (s)
  throwSpeed: 640, throwDmgMul: 2.2, landDmgMul: 1.4,
  crates: [760, 1260, 3150], crateHp: 3, itemChance: 0.6,
  itemSpeed: 780, itemDmgMul: 2.4,
  hazardBonus: 150, strikeBonus: 120,
};
// Objets à lancer et caisses, par monde
const WORLD_ITEM = { christian: 'brique', guilhem: 'vinyle', fateh: 'boule', faouzi: 'cartouche', venum: 'batterie', senoussi: 'jarre', purf: 'bidon' };
const ITEM_NAME = { brique: 'BRIQUE', vinyle: 'VINYLE', boule: 'BOULE', cartouche: 'CARTOUCHE', batterie: 'BATTERIE', jarre: 'JARRE', bidon: 'BIDON' };
const CRATE_TYPE = { christian: 'palette', guilhem: 'enceinte', fateh: 'cagette', faouzi: 'bloc', venum: 'conteneur', senoussi: 'amphore', purf: 'baril' };

const Combat = {
  combatStart() {
    this.props = []; this.heldItem = null; this.carry = null; this.holdT = 0;
    this.comboFxT = 0; this.comboPop = 0; this.lastMilestone = 0; this.multiT = 0; this.multiN = 0;
    if (['story', 'select', 'daily'].includes(this.mode)) {
      const xs = this.mod.crates ? COMBAT.crates.concat(COMBAT.crates.map(x => x + 330)) : COMBAT.crates; // défi « Déménagement » : deux fois plus
      xs.forEach(x => this.props.push({ type: CRATE_TYPE[this.world.id] || 'palette', x: x + rand(-60, 60), y: rand(GROUND_TOP + 40, GROUND_BOTTOM - 20), hp: COMBAT.crateHp, shakeT: 0 }));
    }
  },

  // ---------- A. Combos ----------
  onHeroHit() {
    this.comboPop = 1;
    const m = COMBAT.milestones.find(x => x[0] === this.hits);
    if (m && m[0] > this.lastMilestone) {
      this.lastMilestone = m[0];
      this.addScore(m[2]);
      this.comboFxT = 1.6; this.comboFxLabel = '×' + m[0] + '  ' + m[1]; this.comboFxBonus = '+' + Math.round(m[2] * this.L.score);
      this.slowT = Math.max(this.slowT, 0.3); this.flashA = Math.max(this.flashA, 0.25); this.flashCol = '255,230,120';
      Sfx.comboUp(COMBAT.milestones.indexOf(m));
      if (m[0] >= 25) Progress.unlock('combo' + m[0]);
      Haptics.vibrate([30, 30, 60]);
    }
  },
  // appelé quand le compteur retombe à zéro
  comboReset() { this.lastMilestone = 0; },

  // ---------- éliminations : éjection, dernier ennemi, bonus des dangers / lancers ----------
  onKillFx(e, src, opts) {
    if (e.isBoss) return;
    const hero = src && src.team === 'hero';
    if (hero && opts && opts.knockdown) { e.kx *= 1.7; e.vz = 760; e.rotV *= 1.6; } // le coup final l'envoie valser
    // bonus : danger du décor, ennemi lancé, objet lancé
    const how = src && src.team === 'world' ? 'danger' : (opts && (opts.thrown || opts.item)) ? 'lancer' : null;
    if (how) {
      const base = how === 'danger' ? COMBAT.hazardBonus : COMBAT.strikeBonus;
      if (this.t - this.multiT < 1.2) this.multiN++; else this.multiN = 1;
      this.multiT = this.t;
      const extra = this.multiN >= 2 ? (this.multiN - 1) * 100 : 0;
      this.addScore(base + extra);
      const word = this.multiN >= 4 ? 'CARNAGE !' : this.multiN === 3 ? 'TRIPLÉ !' : this.multiN === 2 ? 'DOUBLÉ !' : how === 'danger' ? 'BIEN ENVOYÉ !' : 'STRIKE !';
      this.text(e.x, e.y, e.height + 50, word + ' +' + Math.round((base + extra) * this.L.score), '#7bed9f', this.multiN >= 2 ? 30 : 24, 1.3, { wob: 1, stroke: '#0b3d1f' });
      if (this.multiN >= 2) Sfx.comboUp(Math.min(3, this.multiN - 2));
      Progress.count(how === 'danger' ? 'hazard' : 'thrown');
      if (how === 'lancer' && this.multiN >= 3) Progress.unlock('strike3');
    }
    // dernier ennemi d'une vague : ralenti + « K.O. ! »
    if (this.wave && !this.spawnQueue.length && this.enemies.every(x => x === e || x.dead)) {
      this.slowT = Math.max(this.slowT, 0.9); this.shake = Math.max(this.shake, 0.35);
      this.text(e.x, e.y, e.height + 70, 'K.O. !', '#ff6b6b', 46, 1.4, { wob: 1, stroke: '#3d0000' });
    }
  },

  // ---------- B / C. Mise à jour : attraper, porter, lancer, objets, caisses ----------
  updateCombat(dt) {
    const h = this.hero;
    if (this.comboFxT > 0) this.comboFxT -= dt;
    if (this.comboPop > 0) this.comboPop = Math.max(0, this.comboPop - dt * 4);
    this.props.forEach(p => { if (p.shakeT > 0) p.shakeT -= dt; });
    if (h.dead) { this.dropCarry(); return; }
    // appui long sur FRAPPE : attraper
    if (Input.held.attack && !this.heldItem && !(this.ev && this.ev.lockHero)) this.holdT += dt; else this.holdT = 0;
    if (!this.carry && this.holdT > COMBAT.grabHold && (h.canAct() || h.state === 'attack')) {
      const t = this.enemies.find(e => !e.dead && !e.isBoss && !e.fly && e.entering <= 0 && !e.grabbed && e.thrownT <= 0 && this.inMeleeZone(h, e, 45)); // (marge : le premier coup l'a un peu repoussé)
      if (t) this.grab(t);
      this.holdT = -99; // un seul essai par appui
    }
    if (this.carry) {
      const e = this.carry.e;
      this.carry.t += dt;
      if (e.dead || e.remove) { this.carry = null; return; }
      e.x = h.x + h.dir * 4; e.y = h.y + 0.5; e.z = h.z + h.height * 0.92; e.vz = 0; e.kx = 0; e.dir = h.dir;
      e.stun = 0.2;
      if (!Input.held.attack || this.carry.t > COMBAT.carryMax) this.throwCarry();
    }
    // ramasser un objet à lancer
    this.pickups.forEach(p => {
      if (p.item && !this.heldItem && !this.carry && p.life > 0 && Math.abs(p.x - h.x) < 34 && Math.abs(p.y - h.y) < 26 && h.z < 40) {
        p.life = 0; this.heldItem = p.item; Sfx.pickup();
        this.text(h.x, h.y, h.height + 30, ITEM_NAME[p.item] + ' ! (FRAPPE pour lancer)', '#feca57', 18, 1.6);
      }
    });
  },

  grab(e) {
    const h = this.hero;
    this.carry = { e, t: 0 }; e.grabbed = true; e.setState('hurt', 99); e.bubble = null;
    h.carrying = true; h.setState('idle');
    Sfx.tone('square', 300, 520, 0.08, 0.15); this.text(e.x, e.y, e.height + 40, 'ATTRAPÉ !', '#feca57', 22);
  },
  throwCarry() {
    const h = this.hero, c = this.carry; if (!c) return;
    const e = c.e; this.carry = null; h.carrying = false;
    e.grabbed = false; e.thrownT = 1.2; e.thrownHit = new Set([e]);
    e.kx = h.dir * COMBAT.throwSpeed; e.vz = 260; e.setState('hurt', 1.2); e.rotV = h.dir * 9;
    h.setState('attack', 0.26); h.hitDone = true; h.combo = 2;
    Sfx.swing(Sfx.panX(h.x)); Sfx.tone('sawtooth', 220, 90, 0.2, 0.12);
    Haptics.vibrate(40);
  },
  dropCarry() {
    const c = this.carry; if (!c) return;
    this.carry = null; this.hero.carrying = false;
    c.e.grabbed = false; c.e.setState('down', 0.8);
  },
  // ennemi en vol : renverse ceux qu'il croise, puis s'écrase
  updateThrown(e, dt) {
    if (e.thrownT <= 0) return;
    e.thrownT -= dt;
    const h = this.hero, dmg = h.dmg * COMBAT.throwDmgMul;
    this.enemies.forEach(o => {
      if (o === e || o.dead || e.thrownHit.has(o) || o.entering > 0) return;
      if (Math.abs(o.x - e.x) < o.halfW + e.halfW && Math.abs(o.y - e.y) < 34 && o.z < 120) {
        e.thrownHit.add(o); this.applyHit(h, o, dmg, { knockdown: true, thrown: true }, true);
      }
    });
    this.props.forEach(p => { if (p.hp > 0 && !e.thrownHit.has(p) && Math.abs(p.x - e.x) < 40 && Math.abs(p.y - e.y) < 34) { e.thrownHit.add(p); this.hitProp(p, 3); } });
    if (e.z <= 0 && e.thrownT < 1.05) { // atterrissage : il encaisse à son tour
      e.thrownT = 0; e.kx *= 0.3; this.dust(e.x, e.y, 10); this.shake = Math.max(this.shake, 0.25);
      e.hp -= h.dmg * COMBAT.landDmgMul; e.flash = 0.12;
      Sfx.bigHit(Sfx.panX(e.x), null, this.hits);
      if (e.hp <= 0) { e.hp = 0; e.die(Math.sign(e.kx) || h.dir); this.onKill(e, h, { knockdown: true, thrown: true }); }
      else e.setState('down', 1.0);
    }
  },
  // FRAPPE en tenant un objet : on le lance
  throwItem() {
    const h = this.hero, it = this.heldItem; this.heldItem = null;
    h.setState('attack', 0.28); h.hitDone = true;
    this.projectiles.push({ kind: 'item', item: it, team: 'hero', owner: h, x: h.x + h.dir * 30, y: h.y, vx: h.dir * COMBAT.itemSpeed, dmg: h.dmg * COMBAT.itemDmgMul,
      knockdown: true, pierce: it === 'boule' || it === 'vinyle' || it === 'batterie', life: 1.1, hit: new Set(), itemHit: true });
    Sfx.swing(Sfx.panX(h.x));
  },

  // ---------- caisses ----------
  meleeProps(f) {
    if (f.team !== 'hero') return;
    const fin = f.combo === 2 || f.z > 20;
    this.props.forEach(p => { if (p.hp > 0 && this.inMeleeZone(f, { x: p.x, y: p.y, z: 0, height: 56, halfW: 26, scale: 1 })) this.hitProp(p, fin ? 2 : 1); });
  },
  hitProp(p, n) {
    p.hp -= n; p.shakeT = 0.25;
    Sfx.noise(0.12, 0.3, 700, 0, 0.8, Sfx.panX(p.x)); Sfx.tone('square', 140, 80, 0.06, 0.12, 0, null, 0, Sfx.panX(p.x));
    for (let i = 0; i < 5; i++) this.particles.push({ type: 'pix', x: p.x + rand(-20, 20), y: p.y, z: rand(10, 50), vx: rand(-150, 150), vy: rand(-30, 30), vz: rand(150, 420), col: PROP_COL[p.type] || '#a0522d', life: 0.7, max: 0.7 });
    if (p.hp <= 0) {
      this.addScore(60); this.shake = Math.max(this.shake, 0.2);
      for (let i = 0; i < 12; i++) this.particles.push({ type: 'pix', x: p.x + rand(-25, 25), y: p.y, z: rand(5, 55), vx: rand(-260, 260), vy: rand(-40, 40), vz: rand(200, 560), col: PROP_COL[p.type] || '#a0522d', life: 1, max: 1 });
      Progress.count('crates');
      if (this.mod.crates || Math.random() < COMBAT.itemChance) this.pickups.push({ item: WORLD_ITEM[this.world.id] || 'brique', x: p.x, y: p.y, t: 0, life: 20 });
      else this.pickups.push({ type: this.world.food, x: p.x, y: p.y, t: 0, life: 14 });
      Sfx.bigHit(Sfx.panX(p.x), null, 0);
    }
  },

  // ---------- rendu ----------
  combatDraw(list, ctx, cx, gt) {
    this.props.forEach(p => { if (p.hp > 0) list.push({ y: p.y, draw: () => {
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(p.x - cx, p.y, 32, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(p.x - cx + (p.shakeT > 0 ? Math.sin(gt * 80) * 4 : 0), p.y);
      drawSprite(ctx, { x: -45, y: -95, w: 90, h: 100 }, c => drawCrate(c, p.type, p.hp / COMBAT.crateHp, gt), { outline: 3, shade: { top: -60 } });
      ctx.restore();
    } }); });
  },
  // objet tenu : au-dessus de la main du héros
  combatOverlay(ctx, cx, gt) {
    const h = this.hero;
    if (this.heldItem && !h.dead) {
      ctx.save(); ctx.translate(h.x - cx + h.dir * 26, h.y - h.z - h.height * 0.95 + Math.sin(gt * 6) * 3);
      drawThrowItem(ctx, this.heldItem, gt * 0.3, h.dir); ctx.restore();
    }
  },
  // HUD : compteur de combo central + palier atteint
  combatHUD(ctx, VW) {
    if (this.hits >= 3) {
      const tier = this.hits >= 50 ? 3 : this.hits >= 25 ? 2 : this.hits >= 10 ? 1 : 0;
      const col = ['#feca57', '#ff9f43', '#ff6b6b', '#d980fa'][tier];
      const s = 1 + this.comboPop * 0.35, x = VW - 120, y = 112;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.06);
      ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.font = `900 ${40 + tier * 6}px "Arial Black", Arial`; ctx.lineWidth = 8; ctx.strokeStyle = '#000';
      ctx.strokeText(this.hits, 0, 0); ctx.fillStyle = col; ctx.fillText(this.hits, 0, 0);
      ctx.font = '900 15px "Arial Black", Arial'; ctx.lineWidth = 5; ctx.strokeText('COUPS', 0, 22); ctx.fillStyle = '#fff'; ctx.fillText('COUPS', 0, 22);
      // jauge qui se vide : temps restant avant que la série retombe
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(-40, 30, 80, 6); ctx.fillStyle = col; ctx.fillRect(-40, 30, 80 * clamp(this.hitT / 1.6, 0, 1), 6);
      ctx.restore();
    }
    if (this.comboFxT > 0) {
      const a = Math.min(1, this.comboFxT / 0.4), s = 1 + Math.max(0, this.comboFxT - 1.3) * 2;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(VW / 2, VIEW_H * 0.3); ctx.scale(s, s); ctx.rotate(-0.04);
      ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.font = '900 46px "Arial Black", Arial';
      ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeText(this.comboFxLabel, 0, 0); ctx.fillStyle = '#feca57'; ctx.fillText(this.comboFxLabel, 0, 0);
      ctx.font = '900 24px "Arial Black", Arial'; ctx.lineWidth = 6; ctx.strokeText(this.comboFxBonus, 0, 34); ctx.fillStyle = '#7bed9f'; ctx.fillText(this.comboFxBonus, 0, 34);
      ctx.restore();
    }
  },
};
Object.assign(Game, Combat);

// ---------- dessins : caisses et objets à lancer ----------
const PROP_COL = { palette: '#c8955a', enceinte: '#2d3436', cagette: '#e1b072', bloc: '#f39c12', conteneur: '#7f8fa6', amphore: '#c0703a', baril: '#8e5a2b' };
function drawCrate(ctx, type, f, t) {
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  const crack = f < 0.7, crack2 = f < 0.4;
  switch (type) {
    case 'enceinte':
      rrect(ctx, -30, -74, 60, 74, 6, '#2d3436');
      circle(ctx, 0, -48, 15, '#636e72'); circle(ctx, 0, -48, 7 + Math.abs(Math.sin(t * 8)) * 2, '#111');
      circle(ctx, 0, -16, 9, '#636e72'); circle(ctx, 0, -16, 4, '#111'); break;
    case 'cagette':
      rrect(ctx, -34, -46, 68, 46, 3, '#e1b072');
      ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(34, -30); ctx.moveTo(-34, -15); ctx.lineTo(34, -15); ctx.stroke();
      [-20, 0, 20].forEach((x, i) => circle(ctx, x, -50, 9, ['#e67e22', '#f1c40f', '#e74c3c'][i])); break;
    case 'bloc':
      rrect(ctx, -28, -58, 56, 56, 2, '#f39c12');
      ctx.fillStyle = '#fff3c4'; ctx.font = '900 34px "Arial Black", Arial'; ctx.textAlign = 'center'; ctx.fillText('?', 0, -17);
      ctx.fillStyle = '#7a4a00'; [[-22, -52], [18, -52], [-22, -10], [18, -10]].forEach(([x, y]) => ctx.fillRect(x, y, 4, 4)); break;
    case 'conteneur':
      rrect(ctx, -34, -60, 68, 60, 4, '#7f8fa6');
      ctx.fillStyle = '#00d2ff'; ctx.fillRect(-26, -50, 52, 5);
      for (let x = -24; x <= 24; x += 12) { ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x, -6); ctx.stroke(); } break;
    case 'amphore':
      ctx.beginPath(); ctx.moveTo(-10, -78); ctx.lineTo(10, -78); ctx.quadraticCurveTo(36, -50, 22, -10); ctx.quadraticCurveTo(0, 4, -22, -10); ctx.quadraticCurveTo(-36, -50, -10, -78); ctx.closePath();
      ctx.fillStyle = '#c0703a'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7a3d14'; ctx.beginPath(); ctx.moveTo(-24, -40); ctx.lineTo(24, -40); ctx.stroke(); ctx.strokeStyle = INK; break;
    case 'baril':
      rrect(ctx, -26, -66, 52, 66, 8, '#8e5a2b');
      ctx.fillStyle = '#5c3a1a'; ctx.fillRect(-26, -52, 52, 5); ctx.fillRect(-26, -18, 52, 5);
      ctx.fillStyle = '#a3e635'; ctx.beginPath(); ctx.moveTo(-8, -66); ctx.quadraticCurveTo(-4, -50, -10, -40); ctx.lineTo(-4, -40); ctx.quadraticCurveTo(2, -52, 2, -66); ctx.fill(); break;
    default: // palette de chantier
      rrect(ctx, -34, -54, 68, 54, 3, '#c8955a');
      ctx.beginPath(); ctx.moveTo(-34, -36); ctx.lineTo(34, -36); ctx.moveTo(-34, -18); ctx.lineTo(34, -18); ctx.moveTo(-30, -50); ctx.lineTo(30, -4); ctx.stroke();
  }
  // fissures quand elle s'abîme
  if (crack) { ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -50); ctx.lineTo(0, -36); ctx.lineTo(-6, -26); ctx.lineTo(4, -14); ctx.stroke(); }
  if (crack2) { ctx.beginPath(); ctx.moveTo(18, -46); ctx.lineTo(10, -34); ctx.lineTo(16, -22); ctx.stroke(); }
}
function drawThrowItem(ctx, type, t, dir = 1) {
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.rotate(t * 12 * dir);
  switch (type) {
    case 'vinyle': circle(ctx, 0, 0, 16, '#111'); circle(ctx, 0, 0, 6, '#e84393'); circle(ctx, 0, 0, 1.5, '#fff', false); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(0, 0, 11, 0.3, 1.4); ctx.stroke(); break;
    case 'boule': { const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 12); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#bdc3c7'); g.addColorStop(1, '#636e72'); circle(ctx, 0, 0, 12, g); ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(10, -4); ctx.moveTo(-10, 4); ctx.lineTo(10, 4); ctx.stroke(); break; }
    case 'cartouche': rrect(ctx, -12, -15, 24, 30, 3, '#7f8c8d'); rrect(ctx, -8, -10, 16, 13, 2, '#e84393'); break;
    case 'batterie': rrect(ctx, -10, -16, 20, 32, 3, '#2d3436'); ctx.fillStyle = '#00d2ff'; ctx.fillRect(-6, -2, 12, 14); rrect(ctx, -4, -20, 8, 5, 1, '#95a5a6'); break;
    case 'jarre': ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(5, -15); ctx.quadraticCurveTo(17, -2, 9, 12); ctx.lineTo(-9, 12); ctx.quadraticCurveTo(-17, -2, -5, -15); ctx.closePath(); ctx.fillStyle = '#c0703a'; ctx.fill(); ctx.stroke(); break;
    case 'bidon': rrect(ctx, -11, -15, 22, 30, 4, '#f1c40f'); ctx.fillStyle = '#111'; ctx.font = '900 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('☣', 0, 6); break;
    default: rrect(ctx, -16, -8, 32, 16, 2, '#c0392b'); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6, 8); ctx.moveTo(6, -8); ctx.lineTo(6, 8); ctx.stroke(); // brique
  }
  ctx.restore();
}
