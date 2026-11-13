// ============================================================
//  ENTITÉS — combattants : héros, boss, ennemis courants, entourages
// ============================================================

class Fighter {
  constructor(kind, team, x, y, opts = {}) {
    this.kind = kind; this.team = team;
    this.isChar = !!CHARACTERS[kind];
    this.isMini = !this.isChar && !!MINIBOSSES[kind]; // mini-boss (v3.9)
    this.def = this.isChar ? CHARACTERS[kind] : this.isMini ? MINIBOSSES[kind] : MINIONS[kind];
    const c = this.def;
    this.beh = this.isChar || this.isMini ? 'melee' : c.beh;
    this.x = x; this.y = y; this.z = opts.z || 0; this.vz = 0; this.kx = 0; this.thrownT = 0; this.grabbed = false;
    this.fly = this.beh === 'flyer';
    this.heavy = !!c.heavy; // le costaud : ne recule pas sous les coups simples, impossible à attraper (rage.js)
    this.dir = team === 'hero' ? 1 : -1;
    this.isBoss = !!opts.boss;
    this.mustKill = !!opts.mustKill || this.isBoss || this.isMini;
    this.scale = opts.scale || (this.isBoss ? 1.4 : 1);
    this.maxHp = Math.round(opts.hp || c.hp); this.hp = this.maxHp;
    this.dmg = opts.dmg || c.dmg;
    this.speed = opts.speed || c.speed;
    this.state = 'idle'; this.st = 0; this.stateDur = 0;
    this.walk = 0; this.t = Math.random() * 10;
    this.invul = 0; this.flash = 0; this.stun = 0;
    this.combo = 0; this.comboT = 0; this.queued = false; this.hitDone = false;
    this.attackCd = rand(0.6, 1.6);
    this.specialCd = this.isChar ? c.specialCd * (team === 'hero' ? 0 : rand(0.4, 0.8)) : this.isMini ? c.specialCd * 0.6 : 99;
    this.specialFired = false; this.dashHits = new Set();
    this.nextAction = null; this.hasToken = false; this.feint = 0; this.yOffset = rand(-60, 60);
    this.dead = false; this.remove = false; this.deadT = 0; this.rot = 0;
    this.variant = randi(0, 2); this.label = pick(ROBOT_NAMES); this.roll = 0;
    this.contactCd = 0; this.dashT = 0; this.cruiseZ = rand(110, 150);
    this.bubble = null; this.sayT = rand(3, 5);
    this.entering = 0; // > 0 : en train d'arriver (cinématique), invulnérable
    this.entered = false; // devient vrai une fois entré dans la zone visible : il n'en ressort plus
    this.offT = 0;        // temps passé hors de la zone visible (ramené au bord au-delà de 0,7 s)
  }
  get halfW() { return this.def.bw * 0.5 * this.scale; }
  get height() { return this.def.bh * this.scale; }
  get reach() { return this.def.range * this.scale; }
  canAct() { return !this.dead && this.stun <= 0 && this.entering <= 0 && (this.state === 'idle' || this.state === 'walk'); }
  setState(s, dur = 0) { this.state = s; this.st = 0; this.stateDur = dur; }
  // prio 2 : phrase importante (début du combat, niveau de vie perdu, victoire) · voice : faire parler aussi un héros
  say(text, dur = 2.6, prio = 1, voice = false) {
    this.bubble = { text, t: dur, max: dur };
    if (((this.isBoss || this.isMini) && this.team === 'enemy') || voice) Voice.speak(text, this.kind, prio); // voix synthétisée
  }

  startAttack() {
    if (this.comboT > 0 && this.combo < 2) this.combo++; else this.combo = 0;
    const slow = this.kind === 'senoussi' ? 1.2 : this.kind === 'venum' ? 0.8 : 1;
    this.setState('attack', (this.combo === 2 ? 0.38 : 0.28) * slow);
    this.hitDone = false; this.queued = false;
    Sfx.attack(this.kind, Sfx.panX(this.x), this.combo); // aboiement pour Fateh, bip de jeu vidéo pour Faouzi…
  }
  startSpecial() {
    const sp = this.def.special;
    this.setState('special', sp === 'direct' ? 0.5 : sp === 'belier' ? 0.6 : sp === 'truelle' ? 0.55 : 0.45);
    this.specialFired = false; this.dashHits.clear();
    this.specialCd = this.def.specialCd * (this.team === 'hero' ? 1 : rand(0.75, 1.05));
  }
  startWindup(action, dur) { this.setState('windup', dur); this.nextAction = action; }
  // Coup plongeant : en l'air, pendant la descente, on pique vers le sol
  startDive() {
    this.setState('dive', 2); this.vz = -1500; this.kx = this.dir * 120;
    this.hitDone = false; this.queued = false;
    Sfx.diveStart && Sfx.diveStart();
  }

  takeHit(src, dmg, o = {}) {
    // v3.11 : un ENNEMI à terre peut être frappé (avant, il était intouchable 1 s). Le héros à terre, lui, reste protégé.
    const down = this.state === 'down';
    if (this.dead || this.invul > 0 || this.shield > 0 || (down && this.team === 'hero') || this.entering > 0) return false; // (shield : casque de chantier)
    this.hp -= dmg; this.flash = 0.12;
    const fromDir = src ? Math.sign(this.x - src.x) || 1 : -this.dir;
    if (this.hp <= 0) { this.hp = 0; this.die(fromDir); return true; }
    this.hitSq = 0.22; // petit rebond élastique sous le coup
    if (o.stun) this.stun = Math.max(this.stun, o.stun);
    const armored = (this.isBoss && ['attack', 'special', 'windup'].includes(this.state)) || (this.heavy && !o.knockdown);
    if (o.noStagger || armored) return true;
    if (this.fly) { this.setState('hurt', 0.3); this.kx = fromDir * (o.knockdown ? 200 : FEEL.pushFlyer); this.dashT = 0; return true; }
    if (down) { // déjà à terre : il encaisse et reste couché (un gros coup le fait rebondir), sans rallonger son temps au sol
      if (o.knockdown) { this.vz = 260; this.kx = fromDir * 200; } else this.kx = fromDir * FEEL.pushDown;
      return true;
    }
    if (o.knockdown && !this.isBoss) { this.setState('down', this.team === 'hero' ? FEEL.downHero : FEEL.downEnemy); this.vz = 380; this.kx = fromDir * 260; }
    else if (o.knockdown && this.isBoss) { this.setState('hurt', 0.35); this.kx = fromDir * 200; }
    // coup simple : l'ennemi recule peu (le coup suivant du héros reste à portée) ; le héros touché recule comme avant
    else { this.setState('hurt', this.isBoss ? 0.12 : 0.28); this.kx = fromDir * (this.isBoss ? 60 : this.team === 'hero' ? 150 : FEEL.pushSimple); }
    if (this.team === 'hero') this.invul = 0.7;
    this.dashT = 0;
    this.dir = -fromDir;
    return true;
  }
  die(fromDir) {
    this.dead = true; this.setState('dead', 99); this.fly = false;
    this.vz = 520; this.kx = fromDir * 320; this.rotV = fromDir * 7; this.bubble = null;
  }

  physics(dt) {
    if (!this.fly && (this.z > 0 || this.vz > 0)) {
      this.z += this.vz * dt; this.vz -= GRAVITY * dt;
      if (this.z <= 0) {
        // atterrissage : il s'écrase un peu (sauf piqué, qui a son propre atterrissage)
        if (this.vz < -380 && !this.dead && this.state !== 'dive' && this.state !== 'land') {
          this.landSq = 0.2;
          if (this.team === 'hero' && typeof Game !== 'undefined' && Game.running) Game.dust(this.x, this.y, 4);
        }
        this.z = 0; this.vz = this.state === 'victory' && !this.dead ? 330 : 0; // victoire : il rebondit sur place
      }
    }
    this.x += this.kx * dt;
    this.kx *= Math.pow(0.015, dt);
    if (Math.abs(this.kx) < 2) this.kx = 0;
    if (!this.dead) this.y = clamp(this.y, GROUND_TOP + 12, GROUND_BOTTOM);
  }

  tickTimers(dt) {
    this.t += dt; this.st += dt;
    if (this.invul > 0) this.invul -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.stun > 0) this.stun -= dt;
    if (this.comboT > 0) this.comboT -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.specialCd > 0) this.specialCd -= dt;
    if (this.contactCd > 0) this.contactCd -= dt;
    if (this.entering > 0) this.entering -= dt;
    if (this.landSq > 0) this.landSq -= dt;
    if (this.hitSq > 0) this.hitSq -= dt;
    if (this.popT > 0) this.popT -= dt; // sort d'une bouche d'égout (rage.js)
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
    if (this.dead) {
      this.deadT += dt; this.rot += (this.rotV || 0) * dt;
      if (this.z <= 0 && this.deadT > 0.4) this.rotV = 0;
      if (this.deadT > 1.6) this.remove = true;
      return;
    }
    if (this.state === 'hurt' && this.st >= this.stateDur) this.setState('idle');
    if (this.state === 'down' && this.st >= this.stateDur && this.z <= 0) {
      this.setState('idle');
      this.invul = this.team === 'hero' ? 1.0 : FEEL.getUpInvulEnemy;
    }
  }

  pose() {
    if (this.dead) return { pose: 'hurt', pt: 1 };
    if (this.stun > 0) return { pose: 'hurt', pt: 0 };
    if (this.carrying && (this.state === 'idle' || this.state === 'walk')) return { pose: 'carry', pt: this.state === 'walk' ? 1 : 0 }; // porte un ennemi au-dessus de sa tête
    switch (this.state) {
      case 'attack': return { pose: 'attack', pt: this.st / this.stateDur };
      case 'windup': return { pose: 'windup', pt: 0 };
      case 'special': return { pose: this.def.special === 'direct' ? 'attack' : 'special', pt: this.st / this.stateDur };
      case 'dash': return { pose: 'attack', pt: 0.6 };
      case 'dive': return { pose: 'attack', pt: 0.95 };
      case 'taunt': return { pose: 'taunt', pt: 0 };
      case 'victory': return { pose: this.z > 0 ? 'victory' : 'victory', pt: 0 };
      case 'land': return { pose: 'attack', pt: 1 };
      case 'hurt': return { pose: 'hurt', pt: 0 };
      case 'down': return { pose: 'down', pt: Math.min(1, this.st / 0.3) * (this.st > this.stateDur - 0.25 ? 0.5 : 1) };
      case 'walk': return { pose: this.z > 0 && !this.fly ? 'jump' : 'walk', pt: 0 };
      default: return { pose: this.z > 0 && !this.fly ? 'jump' : 'idle', pt: 0 };
    }
  }

  drawShadow(ctx, sx, sy) {
    if (this.dead && this.deadT > 1) return;
    // ombre douce : plus petite et plus pâle quand il saute
    const up = Math.max(0.45, 1 - this.z / 400), r = this.halfW * 1.25 * up, a = (this.fly ? 0.22 : 0.42) * (0.5 + up * 0.5);
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1, (9 * this.scale) / r);
    const g = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.65, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  draw(ctx, sx, sy, gt) {
    if (this.team === 'hero' && this.invul > 0 && !this.dead && Math.floor(gt * 14) % 2 === 0) return;
    const p = this.pose();
    // v4.0 : les héros / boss ont un nouveau dessin articulé (persos.js), avec ses propres poses de piqué et d'atterrissage
    // v4.1 : les ennemis à forme humaine aussi ; un ennemi porté par le héros est à l'horizontale, au bout de ses bras
    const rig = typeof persoRig === 'function' ? persoRig(this.kind) : null; // (v4.3 : mini-boss compris)
    const porte = !!rig && this.grabbed && !this.dead;
    if (rig && !this.dead) { if (this.state === 'dive') p.pose = 'dive'; else if (this.state === 'land') p.pose = 'final'; else if (porte) p.pose = 'held'; }
    ctx.save();
    ctx.translate(sx, sy - this.z - (porte ? 34 * this.scale : 0));
    if (this.dead) {
      ctx.globalAlpha = clamp(1.6 - this.deadT, 0, 1);
      ctx.translate(0, -this.height * 0.4); ctx.rotate(this.rot); ctx.translate(0, this.height * 0.4);
    }
    if (this.stun > 0) ctx.rotate(Math.sin(gt * 18) * 0.06);
    if (this.state === 'dive' && !rig) ctx.rotate(this.dir * 0.35); // penché vers l'avant pendant le piqué (le nouveau dessin plonge tout seul)
    // écrasement / étirement + inclinaison : il se ramasse (armé), s'allonge vers l'avant (frappe), puis se détend
    if (!this.dead) {
      let sx2 = 1, sy2 = 1, lean = 0, lunge = 0;
      const q = this.st / (this.stateDur || 1), big = this.combo === 2 ? 1.4 : 1; // 3e coup du combo : plus ample
      if (rig && ['attack', 'special', 'windup', 'dash'].includes(this.state)) {
        // nouveau dessin : la pose contient déjà l'élan, la fente et l'inclinaison ; il reste un léger écrasement / étirement
        if (this.state === 'windup') lunge = Math.sin(gt * 40) * 1.2;
        else if (this.state === 'dash') { sx2 = 1.07; sy2 = 0.95; }
        else if (q < 0.2) { sx2 = 1.04; sy2 = 0.96; }
        else { const k = q < 0.5 ? 1 : Math.max(0, 1 - (q - 0.5) / 0.4); sx2 = 1 + 0.07 * big * k; sy2 = 1 - 0.05 * big * k; }
      }
      else if (this.state === 'attack' || this.state === 'special') {
        if (q < 0.3) { sx2 = 1.05; sy2 = 0.95; lean = -0.1; lunge = -5; }                       // anticipation : se ramasse en arrière
        else if (q < 0.6) { sx2 = 1 + 0.14 * big; sy2 = 1 - 0.08 * big; lean = 0.16 * big; lunge = 10 * big; } // frappe : étirement vers l'avant
        else { const k = (q - 0.6) / 0.4; sx2 = 1 + 0.14 * big * (1 - k); sy2 = 1 - 0.08 * big * (1 - k); lean = 0.16 * big * (1 - k); lunge = 10 * big * (1 - k); } // retour au calme
      }
      else if (this.state === 'windup') { sx2 = 1.05; sy2 = 0.95; lean = -0.07; lunge = -3 + Math.sin(gt * 40) * 1.2; }
      else if (this.state === 'dash') { sx2 = 1.1; sy2 = 0.92; lean = 0.25; }
      else if (this.state === 'land') { sx2 = 1.18 - q * 0.18; sy2 = 0.84 + q * 0.16; }
      else if (this.state === 'dive') { sx2 = 0.88; sy2 = 1.14; }
      else if (this.state === 'victory') { const w = Math.sin(gt * 9) * 0.04; sx2 = 1 - w; sy2 = 1 + w; if (this.z > 0 && this.vz > 120) { sx2 = 0.93; sy2 = 1.1; } }
      else if (this.state === 'taunt') { sx2 = 1 + Math.sin(gt * 14) * 0.02; sy2 = 1 - Math.sin(gt * 14) * 0.02; }
      else if (this.z > 0 && !this.fly && this.vz > 120) { sx2 = 0.93; sy2 = 1.08; }
      // élasticité (v3.8) : écrasement à l'atterrissage, rebond quand il prend un coup
      if (this.landSq > 0) { const k = this.landSq / 0.2; sx2 *= 1 + 0.22 * k; sy2 *= 1 - 0.18 * k; }
      if (this.hitSq > 0) { const k = this.hitSq / 0.22, w = Math.sin((1 - k) * Math.PI * 3) * k; sx2 *= 1 + 0.15 * w; sy2 *= 1 - 0.15 * w; }
      if (this.popT > 0) { const k = 1 - this.popT / 0.7; sy2 *= Math.max(0.05, k); sx2 *= 0.6 + 0.4 * k; } // il sort du sol
      if (lunge) ctx.translate(this.dir * lunge, 0);
      if (lean) ctx.transform(1, 0, -this.dir * lean, 1, 0, 0); // penche le haut du corps dans le sens du regard
      if (sx2 !== 1 || sy2 !== 1) ctx.scale(sx2, sy2);
    }
    // traînée d'arme (couleur propre à chaque héros ; rouge pour les ennemis)
    if (this.state === 'attack' && (this.isChar || (this.isMini && HUMANS[this.kind])) && !this.dead) {
      ctx.save(); ctx.scale(this.dir * this.scale, this.scale);
      const punch = !this.weapon && (rig ? rig.style === 'punch' : !!(HUMANS[this.kind] && HUMANS[this.kind].punch));
      const col = this.team === 'hero' ? (TRAIL_COL[this.kind] || '255,234,120') : '255,90,90';
      drawWeaponTrail(ctx, this.st / this.stateDur, this.def.range + this.def.bw * 0.5, rig && !punch ? rig.H * 0.82 : this.def.bh, punch, col, this.combo);
      ctx.restore();
    }
    if ((this.state === 'dash' || this.state === 'dive' || (this.state === 'special' && this.def.special === 'direct')) && !this.dead) {
      ctx.save(); ctx.scale(this.dir * this.scale, this.scale);
      drawSpeedLines(ctx, this.height, this.state === 'dive', gt, this.team === 'hero' ? '255,255,255' : '255,120,120');
      ctx.restore();
    }
    if ((this.isBoss || this.isMini) && !this.dead) {
      ctx.fillStyle = this.isMini ? `rgba(255,120,60,${0.1 + Math.sin(gt * 4) * 0.05})` : `rgba(241,196,15,${0.12 + Math.sin(gt * 4) * 0.06})`;
      ctx.beginPath(); ctx.ellipse(0, -this.height * 0.5, this.halfW * 1.8, this.height * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    }
    const o = { dir: this.dir, scale: this.scale, t: this.t, walk: this.walk, pose: p.pose, poseT: p.pt, flash: this.flash > 0, combo: this.state === 'attack' ? this.combo : 0,
      variant: this.variant, label: this.label, roll: this.roll, air: this.z > 0, companion: this.team === 'hero', weaponItem: this.weapon ? 'w_' + this.weapon.type : null };
    const paint = c => { if (this.isChar) drawCharacter(c, this.kind, o); else if (this.isMini) drawMiniBoss(c, this.kind, o); else drawMinion(c, this.kind, o); };
    // rendu cartoon : gros contour + éclairage + flash blanc à l'impact (voir drawSprite dans draw.js)
    // boîte qui contient le perso ET son arme quand il frappe (au-dessus de la tête, devant lui)
    // boîte au plus juste (moins de pixels à recopier) : large devant (arme), plus étroite derrière, plus haute quand il frappe
    const sc = this.scale, front = ((this.def.range || 40) + (this.def.bw || 40) * 0.6 + 40) * sc;
    // (à terre, le personnage est couché vers l'arrière : la boîte s'allonge, sinon il était coupé — on ne voyait que ses pieds)
    const back = ((this.def.bw || 40) * 0.6 + 70) * sc + (p.pose === 'down' ? this.height * 1.1 : 0);
    const swingUp = p.pose === 'attack' || p.pose === 'windup' || p.pose === 'special' || p.pose === 'victory' || p.pose === 'down';
    const above = (swingUp ? 120 : 60) * sc;
    let box = { x: this.dir > 0 ? -back : -front, y: -this.height - above, w: front + back, h: this.height + above + 20 * sc };
    if (rig) { // nouveau dessin : boîte au plus juste selon la pose (moins de pixels à recopier)
      // calme : pas d'arme tendue · sinon : grande fente et arme devant, élan derrière · grand : très longue arme (la pelle de Senoussi)
      // (devant / dessus : place en plus au calme, pour Aïka en laisse et pour la pelle tenue droite)
      const calme = ['idle', 'walk', 'hurt', 'taunt'].includes(p.pose) && !this.weapon && !(rig.grand && p.pose === 'taunt');
      const large = rig.grand || !!this.weapon;
      const front = (calme ? rig.H * 0.55 + 60 + (rig.devant || 0) : rig.H * 0.95 + 75) * sc;
      const back = (calme ? rig.H * 0.55 + 60 : large ? rig.H * 0.95 + 75 : p.pose === 'down' ? rig.H * 0.85 : rig.H * 0.6 + 45) * sc;
      const above = (calme ? 50 + (rig.dessus || 0) : large ? 150 : 110) * sc;
      box = { x: this.dir > 0 ? -back : -front, y: -rig.H * sc - above, w: front + back, h: rig.H * sc + above + 28 * sc };
    }
    drawSprite(ctx, box, paint, { outline: (rig ? P2.contour : this.isBoss ? 4 : this.isMini || (typeof beteDessin === 'function' && beteDessin(this.kind)) ? 3.8 : 3.2) * Math.sqrt(sc), shade: { top: -this.height }, flash: this.flash > 0 && !this.dead,
      minor: this.team === 'enemy' && !this.isBoss && !this.mustKill && !this.golden, tint: this.golden ? '255,200,30' : null }); // ennemi en or : teinte dorée
    if (this.state === 'victory' && !this.dead) { // étoiles qui tournent autour de la tête
      ctx.font = '20px Arial'; ctx.textAlign = 'center';
      for (let i = 0; i < 5; i++) {
        const a = gt * 3 + i * 1.2566, r = this.halfW * 1.5 + 12;
        ctx.globalAlpha = 0.6 + Math.sin(gt * 8 + i) * 0.4; ctx.fillStyle = i % 2 ? '#ffe066' : '#ffffff';
        ctx.fillText('★', Math.cos(a) * r, -this.height * 1.05 + Math.sin(a) * 14);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    const top = sy - this.z - this.height - 18 * this.scale;
    if (this.team === 'enemy' && !this.dead) {
      if (this.isBoss || this.mustKill) {
        const name = this.def.name.toUpperCase();
        ctx.font = `900 ${this.isBoss ? 22 : 14}px "Arial Black", Arial`; ctx.textAlign = 'center';
        ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.fillStyle = this.isBoss ? '#f1c40f' : '#ffeaa7';
        ctx.strokeText(name, sx, top); ctx.fillText(name, sx, top);
      }
      // v3.13 : plus de petite barre de vie au-dessus des têtes ; la vie de l'ennemi visé est sous le panneau du héros (rage.js)
      if (this.state === 'windup') {
        ctx.font = '900 30px Arial'; ctx.fillStyle = '#ff4757'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.textAlign = 'center';
        ctx.strokeText('!', sx, top - 14); ctx.fillText('!', sx, top - 14);
      }
    }
    if (this.winded > 0 && !this.dead) { // boss essoufflé après son attaque signature (boss.js) : c'est le moment de frapper
      ctx.font = '26px Arial'; ctx.textAlign = 'center';
      ctx.fillText('💦', sx + Math.sin(gt * 7) * 6, top + 4 + Math.abs(Math.sin(gt * 5)) * 6);
    }
    if (this.stun > 0 && !this.dead) {
      for (let i = 0; i < 3; i++) {
        const a = gt * 5 + i * 2.09;
        ctx.fillStyle = '#f1c40f'; ctx.font = '18px Arial'; ctx.textAlign = 'center';
        ctx.fillText('★', sx + Math.cos(a) * 22, top + 14 + Math.sin(a) * 6);
      }
    }
  }
}

// Bulle de dialogue (dessinée en surimpression, jamais pixelisée)
// maxX : bord droit de l'écran (la bulle ne déborde pas à droite)
function drawBubble(ctx, x, y, text, alpha, maxX = 99999) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = 'bold 17px "Trebuchet MS", Arial';
  const words = text.split(' '); const lines = []; let cur = '';
  words.forEach(w => { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > 220 && cur) { lines.push(cur); cur = w; } else cur = tst; });
  lines.push(cur);
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 26, h = lines.length * 21 + 16;
  const bx = clamp(x - w / 2, 8, Math.max(8, maxX - w - 8)), by = y - h - 18;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(bx, by, w, h, 14); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 10, by + h - 2); ctx.lineTo(x, by + h + 16); ctx.lineTo(x + 8, by + h - 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 10, by + h); ctx.lineTo(x, by + h + 16); ctx.lineTo(x + 8, by + h); ctx.stroke();
  ctx.fillStyle = '#111'; ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 26 + i * 21));
  ctx.restore();
}
