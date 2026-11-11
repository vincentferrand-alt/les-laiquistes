// ============================================================
//  LES LAÏQUISTES — Un peu de Streets of Rage (v3.10)
//   A. Un ennemi spécial par monde, au 3e tiers et pendant le boss :
//      Marteau-piqueur (Christian), Ballon de basket (Guilhem), Basket de course (Fateh), Glitch (Faouzi),
//      Tableur (Venum), Chèvres (Senoussi), Fût radioactif (The Purf)
//   B. Le gros Costaud : impossible à attraper, ne recule pas sous les coups simples (il faut le renverser)
//   C. Ennemis qui sortent du décor : ils tombent d'en haut ou sortent d'une bouche d'égout
//   D. Armes à manier (une par monde) : plus fortes, plus d'allonge, cassent après 8 coups
//   E. Appel à un pote : une fois par monde, un autre laïquiste traverse l'écran et renverse tout le monde
//   F. Barre de vie de l'ennemi visé, en haut à droite (nom + petite tête)
//  (Le décompte des points de fin de niveau est dans ui.js : countUp.)
//  Tout s'ajoute à l'objet Game (game.js) : Object.assign(Game, Rage).
// ============================================================

const RAGE = {
  specialShare: 0.35,   // part des ennemis spéciaux dans la vague du 3e tiers et les renforts du boss
  fromDecor: 0.3,       // part des ennemis de vague qui sortent du décor
  weaponCrate: 0.3,     // chance qu'une caisse lâche une arme (après le bonus temporaire)
  weapon: { hits: 8, dmg: 1.6, reach: 28 },
  pote: { dmg: 60, bossDmg: 30, speed: 1150 },
  boomR: 115,           // rayon de l'explosion du fût radioactif
};
// Armes à manier, une par monde
const WORLD_WEAPON = { christian: 'tuyau', guilhem: 'micro', fateh: 'temoin', faouzi: 'manetteg', venum: 'neon', senoussi: 'houlette', purf: 'piedbiche' };
const WEAPON_NAME = { tuyau: 'TUYAU', micro: 'MICRO', temoin: 'TÉMOIN DE RELAIS', manetteg: 'MANETTE GÉANTE', neon: 'SABRE NÉON', houlette: 'HOULETTE', piedbiche: 'PIED-DE-BICHE' };

const Rage = {
  rageStart() {
    this.target = null; this.holes = [];
    this.pote = { ready: true, run: null, survWave: 0 };
    this.hero.weapon = null;
    this.refreshPoteBtn();
  },

  // ---------- A / B. choix des ennemis d'une vague ----------
  pickMinion(w) {
    const i = w ? this.waves.indexOf(w) : -1, sp = this.world.special;
    const late = i === this.waves.length - 1 || this.bossPhase >= 1 || (this.mode === 'survival' && this.survWave >= 4);
    if (sp && late && Math.random() < RAGE.specialShare) return sp;
    return pickWeighted(this.world.minions);
  },
  // composition d'une vague : un costaud dans les vagues du 2e et du 3e tiers (toutes les 4 vagues en Survie)
  fillWave(w) {
    const i = this.waves.indexOf(w);
    for (let k = 0; k < w.n; k++) this.spawnQueue.push(this.pickMinion(w));
    if (i >= 2) this.spawnQueue.splice(Math.floor(this.spawnQueue.length / 2), 0, 'costaud');
  },

  // ---------- C. ennemis qui sortent du décor ----------
  spawnWave(kind) {
    const m = MINIONS[kind], r = Math.random();
    if (this.mode !== 'bossrush' && m.beh !== 'flyer' && kind !== 'costaud' && r < RAGE.fromDecor) {
      const B = this.bounds(), h = this.hero;
      let x = rand(B.L + 120, B.R - 160);
      if (Math.abs(x - h.x) < 120) x = clamp(h.x + (x > h.x ? 160 : -160), B.L + 100, B.R - 120); // pas pile sur le héros
      const e = this.spawnEnemy(kind, { x, y: rand(GROUND_TOP + 25, GROUND_BOTTOM - 15) });
      e.entered = true;
      if (r < RAGE.fromDecor / 2) { e.z = 520; e.entering = 0.95; e.dropIn = true; Sfx.tone('sine', 900, 300, 0.4, 0.08); } // tombe d'en haut
      else { e.entering = 0.75; e.popT = 0.7; this.holes.push({ x, y: e.y, t: 0, life: 1.8 }); Sfx.tone('square', 220, 440, 0.15, 0.1); } // sort d'une bouche d'égout
      return e;
    }
    return this.spawnEnemy(kind);
  },

  updateRage(dt) {
    const h = this.hero;
    this.holes.forEach(o => { o.t += dt; }); this.holes = this.holes.filter(o => o.t < o.life);
    if (this.target) { this.target.t -= dt; if (this.target.t <= 0) this.target = null; }
    // comportements des ennemis spéciaux
    this.enemies.forEach(e => {
      if (e.dead || e.entering > 0) return;
      if (e.dropIn && e.z <= 0) { e.dropIn = false; this.dust(e.x, e.y, 10); this.shake = Math.max(this.shake, 0.15); }
      if (e.def.blink && e.canAct()) { // Glitch : se téléporte derrière le héros
        e.blinkT = (e.blinkT === undefined ? rand(2, 4) : e.blinkT) - dt;
        if (e.blinkT <= 0 && !h.dead) {
          e.blinkT = rand(3, 5);
          const B = this.bounds();
          this.pixBurst(e.x, e.y, e.height * 0.5);
          e.x = clamp(h.x - h.dir * 90, B.L + 40, B.R - 40); e.y = clamp(h.y + rand(-10, 10), GROUND_TOP + 15, GROUND_BOTTOM);
          e.dir = Math.sign(h.x - e.x) || 1; e.attackCd = Math.min(e.attackCd, 0.3);
          this.pixBurst(e.x, e.y, e.height * 0.5); Sfx.tone('square', 1800, 200, 0.12, 0.08);
        }
      }
    });
    this.updateWeapon(dt);
    this.updatePote(dt);
  },
  pixBurst(x, y, z) {
    for (let i = 0; i < 14; i++) this.particles.push({ type: 'pix', x: x + rand(-20, 20), y, z: z + rand(-25, 25), vx: 0, vy: 0, vz: rand(-50, 50), life: 0.5, max: 0.5, col: pick(['#a55eea', '#00d2d3', '#ff4757', '#fff']) });
  },
  // Marteau-piqueur : chaque atterrissage fait trembler le sol autour de lui
  onHopLand(e) {
    if (!e.def.quake) return;
    this.particles.push({ type: 'ring', x: e.x, y: e.y, z: 0, r: 6, rmax: 80, life: 0.25, max: 0.25, col: '#f1c40f' });
    const h = this.hero;
    if (!h.dead && h.z < 15 && Math.abs(h.x - e.x) < 80 && Math.abs(h.y - e.y) < 30) this.applyHit(e, h, e.dmg, {});
  },
  // Fût radioactif : il se met à clignoter puis explose (et fait aussi mal aux autres ennemis)
  futBoom(e) {
    if (e.boomed) return; e.boomed = true;
    const R = RAGE.boomR;
    this.particles.push({ type: 'ring', x: e.x, y: e.y, z: 0, r: 10, rmax: R * 1.3, life: 0.4, max: 0.4, col: '#a3e635' });
    this.particles.push({ type: 'ring', x: e.x, y: e.y, z: 20, r: 6, rmax: R, life: 0.3, max: 0.3, col: '#fff' });
    this.flashA = Math.max(this.flashA, 0.35); this.flashCol = '190,255,120'; this.shake = Math.max(this.shake, 0.4);
    this.dust(e.x, e.y, 14); Sfx.bigHit(Sfx.panX(e.x)); Sfx.noise(0.6, 0.35, 500, 0, 2);
    const h = this.hero, inR = o => { const dx = (o.x - e.x) / R, dy = (o.y - e.y) / (R * 0.45); return dx * dx + dy * dy < 1 && o.z < 90; };
    if (!h.dead && inR(h)) this.applyHit(e, h, e.dmg * 1.4, { knockdown: true }, true);
    this.enemies.forEach(o => { if (o !== e && !o.dead && o.entering <= 0 && inR(o)) this.applyHit({ team: 'world', x: e.x, kind: 'fut' }, o, 30, { knockdown: true }, true); });
    if (!e.dead) { e.hp = 0; e.die(1); this.kills++; }
    e.remove = true; // il a explosé : il disparaît
  },

  // ---------- D. armes à manier ----------
  dropWeapon(x, y, type) {
    const B = this.bounds();
    this.pickups.push({ weapon: type || WORLD_WEAPON[this.world.id] || 'tuyau', x: clamp(x, B.L + 40, B.R - 40), y: clamp(y, GROUND_TOP + 20, GROUND_BOTTOM - 5), t: 0, life: 20 });
  },
  updateWeapon() {
    const h = this.hero; if (h.dead || h.weapon) return;
    this.pickups.forEach(p => {
      if (p.weapon && p.life > 0 && Math.abs(p.x - h.x) < 36 && Math.abs(p.y - h.y) < 26 && h.z < 40) {
        p.life = 0; h.weapon = { type: p.weapon, hits: RAGE.weapon.hits };
        Sfx.pickup(); Sfx.tone('square', 520, 1040, 0.12, 0.1);
        this.text(h.x, h.y, h.height + 30, WEAPON_NAME[p.weapon] + ' ! (' + RAGE.weapon.hits + ' coups)', '#7bed9f', 18, 1.6, { stroke: '#0b3d1f' });
      }
    });
  },
  // appelé par resolveMelee quand le héros a touché quelqu'un avec une arme
  weaponUsed(f) {
    const w = f.weapon; if (!w) return;
    w.hits--;
    if (w.hits <= 0) {
      f.weapon = null;
      this.text(f.x, f.y, f.height + 30, 'CASSÉ !', '#ff6b6b', 22, 1.2, { wob: 1, stroke: '#3d0000' });
      for (let i = 0; i < 10; i++) this.particles.push({ type: 'pix', x: f.x + f.dir * 40, y: f.y, z: f.height * 0.6, vx: 0, vy: 0, vz: rand(-60, 120), life: 0.6, max: 0.6, col: pick(['#95a5a6', '#7f8c8d', '#feca57']) });
      Sfx.tone('square', 400, 90, 0.25, 0.12);
    }
  },

  // ---------- E. appel à un pote ----------
  refreshPoteBtn() {
    const b = document.querySelector('.pad[data-btn="pote"]');
    if (b) b.classList.toggle('used', !(this.pote && this.pote.ready));
  },
  updatePote(dt) {
    const P = this.pote, h = this.hero;
    // Survie : le pote revient toutes les 5 vagues
    if (this.mode === 'survival' && !P.ready && !P.run && this.survWave >= P.survWave + 5) { P.ready = true; this.refreshPoteBtn(); }
    if (Input.consume('pote') && P.ready && !P.run && !h.dead && !(this.ev && this.ev.lockHero) && this.cine < 0.3) this.callPote();
    const r = P.run; if (!r) return;
    r.t += dt; r.x += RAGE.pote.speed * dt; r.walk += dt * 22;
    if (Math.random() < 0.8) this.dust(r.x - 30, r.y, 1);
    this.enemies.forEach(e => {
      if (e.dead || e.entering > 0 || r.hit.has(e) || Math.abs(e.x - r.x) > 60) return;
      r.hit.add(e);
      const big = e.isBoss || e.isMini;
      this.applyHit(h, e, (big ? RAGE.pote.bossDmg : RAGE.pote.dmg) / this.boostDmg(), { knockdown: true }, true);
    });
    this.props.forEach(p => { if (!r.hitP.has(p) && Math.abs(p.x - r.x) < 50) { r.hitP.add(p); if (this.hitProp) this.hitProp(p, 99); } });
    if (r.x > this.camX + this.VW + 200) P.run = null;
  },
  callPote() {
    const P = this.pote, h = this.hero;
    const pool = ROSTER.filter(k => k !== h.kind && k !== this.world.boss);
    const kind = pick(pool.length ? pool : ROSTER), c = CHARACTERS[kind];
    P.ready = false; P.survWave = this.survWave; this.refreshPoteBtn();
    P.run = { kind, x: this.camX - 140, y: (GROUND_TOP + GROUND_BOTTOM) / 2 + 20, t: 0, walk: 0, hit: new Set(), hitP: new Set() };
    this.flashMsg('APPEL À UN POTE !', c.name + ' arrive à la rescousse !', c.light === '#485460' ? '#feca57' : c.light, 1.8);
    Voice.speak(pick(c.phrases), kind, 2);
    [0, 4, 7, 12].forEach((iv, i) => Sfx.tone('square', midiHz(67 + iv), null, 0.1, 0.12, i * 0.06));
    this.shake = Math.max(this.shake, 0.2); Haptics.vibrate([30, 30, 60]);
    Progress.count('potes');
  },

  // ---------- F. ennemi visé ----------
  setTarget(o) { if (o && o.team === 'enemy' && !o.isBoss && !o.isMini && !o.golden) this.target = { e: o, t: 3 }; },

  // ---------- rendu ----------
  rageDrawGround(ctx, cx) { // bouches d'égout d'où sortent les ennemis
    this.holes.forEach(o => {
      const a = Math.min(1, o.t * 6, (o.life - o.t) * 2), sx = o.x - cx;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(sx, o.y, 40, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.stroke();
      const lift = Math.min(1, o.t * 3); // la plaque se soulève et glisse sur le côté
      ctx.fillStyle = '#636e72'; ctx.strokeStyle = '#2d3436'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx + 48 * lift, o.y - 6 * lift, 38, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 48 * lift - 24, o.y - 6 * lift); ctx.lineTo(sx + 48 * lift + 24, o.y - 6 * lift); ctx.stroke();
      ctx.restore();
    });
  },
  rageDraw(list, ctx, cx, gt) {
    const r = this.pote.run;
    if (r) list.push({ y: GROUND_BOTTOM + 5, draw: () => {
      ctx.save(); ctx.translate(r.x - cx, r.y);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 50, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.scale(1.4, 1.4); drawSpeedLines(ctx, CHARACTERS[r.kind].bh, false, gt, '255,255,255'); ctx.restore();
      menuSprite(ctx, r.kind, { dir: 1, scale: 1.4, t: r.t, walk: r.walk, pose: Math.floor(r.t * 6) % 2 ? 'attack' : 'walk', poseT: (r.t * 6) % 1, companion: true });
      ctx.restore();
    } });
  },
  rageHUD(ctx, VW) {
    // pote : pastille dans le cadre du héros (couleur = prêt ; gris = déjà appelé)
    if (this.mode !== 'bossrush' || true) {
      const ready = this.pote.ready;
      ctx.save(); ctx.translate(304, 66);
      ctx.fillStyle = ready ? '#ff9f43' : '#3d3d3d'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = ready ? 1 : 0.4; ctx.fillText('📣', 0, 1);
      ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
      if (ready && !Input.isTouch) { ctx.font = 'bold 9px Arial'; ctx.fillStyle = '#fff'; ctx.fillText('L', 0, 26); }
      ctx.restore();
    }
    // arme en main
    const w = this.hero.weapon;
    if (w) {
      const y = this.boost ? 136 : 90;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(10, y, 210, 26, 10); ctx.fill(); ctx.stroke();
      ctx.font = '900 12px "Arial Black", Arial'; ctx.textAlign = 'left'; ctx.fillStyle = '#7bed9f';
      ctx.fillText('🔨 ' + WEAPON_NAME[w.type], 18, y + 17);
      for (let i = 0; i < RAGE.weapon.hits; i++) { ctx.fillStyle = i < w.hits ? '#7bed9f' : '#2d3436'; ctx.fillRect(150 + i * 8, y + 8, 6, 10); }
      ctx.restore();
    }
    // ennemi visé : nom, petite tête et barre de vie (en haut à droite, sous le score)
    const tg = this.target;
    if (tg && tg.e && !tg.e.remove) {
      const e = tg.e, f = clamp(e.hp / e.maxHp, 0, 1), x = VW - 90 - 250, y = 52, a = Math.min(1, tg.t * 3);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(x, y, 250, 38, 12); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(x + 22, y + 19, 15, 0, Math.PI * 2); ctx.fillStyle = '#dfe6e9'; ctx.fill(); ctx.clip();
      const s = Math.min(0.6, 34 / Math.max(30, e.def.bh * 0.55));
      ctx.translate(x + 22, y + 19 + e.def.bh * s * 0.55); drawMinion(ctx, e.kind, { dir: 1, scale: s, t: e.t, variant: e.variant, label: e.label });
      ctx.restore();
      ctx.beginPath(); ctx.arc(x + 22, y + 19, 15, 0, Math.PI * 2); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = '900 12px "Arial Black", Arial'; ctx.textAlign = 'left'; ctx.fillStyle = e.dead ? '#ff6b6b' : '#fff';
      ctx.fillText(e.def.name.toUpperCase() + (e.dead ? ' — K.O.' : ''), x + 44, y + 15);
      ctx.fillStyle = '#300'; ctx.fillRect(x + 44, y + 21, 196, 9);
      ctx.fillStyle = f > 0.5 ? '#2ecc71' : f > 0.25 ? '#f39c12' : '#e74c3c'; ctx.fillRect(x + 44, y + 21, 196 * f, 9);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 44, y + 21, 196, 9);
      ctx.restore();
    }
  },
};
Object.assign(Game, Rage);

// ============================================================
//  DESSINS — ennemis spéciaux, costaud, armes
// ============================================================
// le gros costaud (humanoïde)
HUMANS.costaud = {
  bw: 66, bh: 124, armW: 17, legW: 20, headR: 20, color: '#2d3436', light: '#636e72', legs: '#1e272e', skin: '#e0ac69', punch: true, idleArm: -0.4,
  torso(ctx, w, h, bob) { // débardeur, chaîne en or, tatouage
    ctx.fillStyle = '#e0ac69'; ctx.beginPath(); ctx.moveTo(-w * 0.28, -h * 0.8 + bob); ctx.quadraticCurveTo(0, -h * 0.66 + bob, w * 0.28, -h * 0.8 + bob); ctx.fill();
    ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -h * 0.8 + bob, w * 0.26, 0.4, Math.PI - 0.4); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
  },
  face(ctx, hr, hy, pose, t, hurt) {
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    rrect(ctx, hr * 0.05, hy - hr * 0.25, hr * 0.95, hr * 0.32, 4, '#111'); // lunettes noires
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(hr * 0.2, hy - hr * 0.2, hr * 0.25, 3);
    ctx.fillStyle = '#5d4037'; ctx.fillRect(hr * 0.25, hy + hr * 0.45, hr * 0.55, 3); // bouche pincée
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.arc(-hr * 0.1, hy - hr * 0.55, hr * 0.5, Math.PI, 0); ctx.fill(); // crâne rasé qui brille
  },
};

// ennemis spéciaux (tournés vers la droite ; drawMinion s'occupe du retournement)
function drawRageMinion(ctx, type, o) {
  const t = o.t || 0, pose = o.pose || 'idle', walk = o.walk || 0;
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  const eye = (x, y, r = 3.5, angry = true) => {
    circle(ctx, x, y, r * 1.6, '#fff'); circle(ctx, x + 1, y, r * 0.8, INK, false);
    if (angry) { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - r * 1.8, y - r * 2.4); ctx.lineTo(x + r * 1.6, y - r * 1.4); ctx.stroke(); }
  };
  switch (type) {
    case 'marteau': { // marteau-piqueur
      const sh = pose === 'walk' || o.air ? Math.sin(t * 60) * 1.5 : 0;
      ctx.translate(sh, 0);
      ctx.fillStyle = '#95a5a6'; ctx.fillRect(-3, -18, 6, 18); ctx.strokeRect(-3, -18, 6, 18); // burin
      poly(ctx, [[-3, 0], [3, 0], [0, 6]], '#7f8c8d');
      rrect(ctx, -15, -66, 30, 50, 8, '#f1c40f'); // corps
      ctx.fillStyle = '#2d3436'; ctx.fillRect(-15, -34, 30, 6); ctx.fillRect(-15, -22, 30, 4);
      rrect(ctx, -26, -80, 52, 9, 4, '#2d3436'); // poignées
      rrect(ctx, -4, -76, 8, 12, 2, '#636e72');
      eye(-5, -52, 3); eye(7, -52, 3);
      break;
    }
    case 'ballon': { // ballon de basket qui rebondit
      const b = -Math.abs(Math.sin(t * 7)) * 16;
      ctx.translate(0, -21 + b); ctx.rotate((o.roll || 0) * 0.6);
      circle(ctx, 0, 0, 21, '#e67e22');
      ctx.strokeStyle = '#2d3436'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-21, 0); ctx.lineTo(21, 0); ctx.moveTo(0, -21); ctx.lineTo(0, 21); ctx.stroke();
      ctx.beginPath(); ctx.arc(-24, 0, 15, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(24, 0, 15, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
      ctx.rotate(-(o.roll || 0) * 0.6); eye(5, -5, 3); eye(13, -4, 2.5);
      break;
    }
    case 'basket': { // chaussure de course qui court toute seule
      const a = pose === 'walk' || pose === 'dash' ? Math.sin(walk * 1.5) * 5 : 0;
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-18 - a, 0); ctx.moveTo(10, -8); ctx.lineTo(14 + a, 0); ctx.stroke(); // petites jambes
      ctx.lineWidth = 2.5;
      rrect(ctx, -30, -16, 62, 9, 4, '#f5f6fa'); // semelle
      ctx.beginPath(); ctx.moveTo(-28, -16); ctx.lineTo(-26, -40); ctx.quadraticCurveTo(-12, -46, -2, -34); ctx.lineTo(18, -28); ctx.quadraticCurveTo(32, -26, 32, -16); ctx.closePath();
      ctx.fillStyle = '#ff4757'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#feca57'; poly(ctx, [[-14, -22], [-4, -34], [-6, -27], [6, -30], [-4, -18], [-2, -24]], '#feca57', false); // éclair
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 6, -40 + i * 2); ctx.lineTo(-2 + i * 6, -36 + i * 2); ctx.stroke(); } // lacets
      eye(20, -26, 2.6);
      break;
    }
    case 'glitch': { // bug de jeu vidéo : cube de pixels qui grésille
      const j = Math.floor(t * 12) % 3, px = 6;
      const rows = ['..PPPP..', '.PPPPPP.', 'PPWEPWEP', 'PPPPPPPP', 'PCPPPPCP', 'PPCCCCPP', '.PP..PP.', 'PP....PP'];
      const pal = { P: '#8854d0', W: '#fff', E: '#111', C: '#00d2d3' };
      const draw = (ox, col) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; ctx.fillStyle = col || pal[ch]; ctx.fillRect(-24 + x * px + ox, -60 + y * 7.4, px, 7.4); }));
      ctx.globalAlpha = 0.5; draw(-3 - j, '#ff4757'); draw(3 + j, '#00d2d3'); ctx.globalAlpha = 1; draw(0);
      if (Math.random() < 0.15) { ctx.fillStyle = '#fff'; ctx.fillRect(-26, -60 + Math.random() * 56, 52, 2); }
      break;
    }
    case 'tableur': { // feuille de calcul en colère (pas de logo : un tableur, tout simplement)
      const sw = pose === 'walk' ? Math.sin(walk) * 4 : 0;
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(-12 - sw, 0); ctx.moveTo(10, -10); ctx.lineTo(12 + sw, 0); ctx.stroke();
      rrect(ctx, -27, -60, 54, 52, 4, '#ffffff');
      ctx.fillStyle = '#21a366'; ctx.fillRect(-26, -59, 52, 9); // barre de formule
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'left'; ctx.fillText('=SOMME()', -23, -52);
      ctx.strokeStyle = '#b2bec3'; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-26 + i * 13, -50); ctx.lineTo(-26 + i * 13, -8); ctx.stroke(); }
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-26, -50 + i * 10.5); ctx.lineTo(26, -50 + i * 10.5); ctx.stroke(); }
      ctx.fillStyle = 'rgba(33,163,102,.35)'; ctx.fillRect(-13, -29, 26, 10.5); // cellule sélectionnée
      ctx.strokeStyle = '#21a366'; ctx.lineWidth = 2; ctx.strokeRect(-13, -29, 26, 10.5);
      eye(-6, -40, 2.6); eye(10, -40, 2.6);
      ctx.fillStyle = '#c0392b'; ctx.font = 'bold 6px Arial'; ctx.textAlign = 'center'; ctx.fillText('#DIV/0!', 0, -12);
      break;
    }
    case 'chevre': { // chèvre (corne, barbichette)
      const a = Math.sin(t * 16) * (pose === 'walk' || pose === 'dash' ? 1 : 0.2);
      ctx.fillStyle = '#3d2b1f';
      ctx.fillRect(-16, -18, 6, 18 + a * 4); ctx.fillRect(10, -18, 6, 18 - a * 4);
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ell(ctx, -2, -28, 24, 14, '#d7b899');
      ell(ctx, -6, -26, 10, 7, '#f5f6fa', false);
      poly(ctx, [[-26, -32], [-34, -38], [-28, -28]], '#d7b899'); // queue
      ell(ctx, 24, -40, 10, 9, '#d7b899', true, -0.3); // tête
      ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, -47); ctx.quadraticCurveTo(14, -60, 6, -56); ctx.stroke(); // corne
      ctx.fillStyle = '#f5f6fa'; poly(ctx, [[26, -32], [30, -32], [27, -22]], '#f5f6fa', false); // barbichette
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(28, -43, 1.8, 0, Math.PI * 2); ctx.fill();
      ell(ctx, 14, -44, 5, 2.5, '#c49a6c', true, 0.6); // oreille
      break;
    }
    case 'fut': { // fût radioactif sur pattes
      const glow = pose === 'windup' ? 0.5 + Math.sin(t * 30) * 0.5 : 0;
      const sw = pose === 'walk' ? Math.sin(walk) * 4 : 0;
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-11 - sw, 0); ctx.moveTo(9, -8); ctx.lineTo(11 + sw, 0); ctx.stroke();
      if (glow > 0) { ctx.fillStyle = `rgba(255,60,60,${0.35 * glow})`; ctx.beginPath(); ctx.arc(0, -36, 42, 0, Math.PI * 2); ctx.fill(); }
      const g = ctx.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, '#d4ac0d'); g.addColorStop(0.5, '#f9e79f'); g.addColorStop(1, '#b7950b');
      rrect(ctx, -20, -64, 40, 56, 6, g);
      ctx.fillStyle = '#2d3436'; ctx.fillRect(-20, -54, 40, 4); ctx.fillRect(-20, -20, 40, 4);
      // symbole « danger radioactif »
      ctx.save(); ctx.translate(0, -36); ctx.fillStyle = '#111';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 11, i * 2.094 - 0.52, i * 2.094 + 0.52); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#f9e79f'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = `rgba(163,230,53,${0.6 + Math.sin(t * 5) * 0.3})`; ctx.beginPath(); ctx.ellipse(0, -64, 14, 4, 0, 0, Math.PI * 2); ctx.fill(); // liquide vert
      eye(-7, -46, 2.2); eye(8, -46, 2.2);
      break;
    }
  }
}

// armes à manier (repère du bras : +y = prolongement du bras)
Object.assign(ITEMS, {
  w_tuyau(ctx) { rrect(ctx, -5, -10, 10, 70, 4, '#95a5a6'); rrect(ctx, -8, 54, 22, 12, 4, '#7f8c8d'); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-2, -6, 3, 58); },
  w_micro(ctx) { ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(-14, -20, -6, -34); ctx.stroke(); ctx.strokeStyle = INK;
    rrect(ctx, -4, -6, 8, 34, 3, '#2d3436'); circle(ctx, 0, 34, 10, '#b2bec3'); ctx.strokeStyle = '#636e72'; ctx.lineWidth = 1; for (let i = -6; i <= 6; i += 4) { ctx.beginPath(); ctx.moveTo(i, 26); ctx.lineTo(i, 42); ctx.stroke(); } ctx.strokeStyle = INK; ctx.lineWidth = 2; },
  w_temoin(ctx) { rrect(ctx, -5, -8, 10, 56, 5, '#ff9f43'); ctx.fillStyle = '#fff'; ctx.fillRect(-5, 14, 10, 5); ctx.fillRect(-5, 30, 10, 5); },
  w_manetteg(ctx) { ctx.save(); ctx.translate(0, 34); ctx.scale(1.9, 1.9); ITEMS.manette(ctx); ctx.restore(); rrect(ctx, -3, -6, 6, 26, 2, '#2f3542'); },
  w_neon(ctx, t) { rrect(ctx, -4, -6, 8, 16, 3, '#2d3436');
    ctx.save(); ctx.shadowColor = '#00d2ff'; ctx.shadowBlur = 14; rrect(ctx, -4, 8, 8, 70, 4, '#7efff5'); ctx.restore(); ctx.fillStyle = '#fff'; ctx.fillRect(-1.5, 12, 3, 62); },
  w_houlette(ctx) { ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 78); ctx.arc(10, 78, 10, Math.PI, 0, true); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 2; },
  w_piedbiche(ctx) { ctx.strokeStyle = '#a04000'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(0, -4); ctx.lineTo(0, 62); ctx.quadraticCurveTo(0, 74, 12, 72); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,30,0,.6)'; ctx.lineWidth = 2; for (let y = 6; y < 60; y += 14) { ctx.beginPath(); ctx.moveTo(-3, y); ctx.lineTo(3, y + 4); ctx.stroke(); } ctx.strokeStyle = INK; },
});
// arme posée au sol (elle brille un peu pour qu'on la remarque)
function drawWeaponPickup(ctx, type, x, y, t) {
  ctx.save(); ctx.translate(x, y - 10);
  ctx.fillStyle = `rgba(123,237,159,${0.25 + Math.sin(t * 5) * 0.12})`; ctx.beginPath(); ctx.ellipse(0, 6, 46, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(-Math.PI / 2 + 0.25); ctx.translate(0, -34); ctx.strokeStyle = INK; ctx.lineWidth = 2;
  const f = ITEMS['w_' + type]; if (f) f(ctx, t);
  ctx.restore();
}
