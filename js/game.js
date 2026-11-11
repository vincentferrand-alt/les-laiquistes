// ============================================================
//  JEU — niveau à défilement horizontal, vagues, boss, HUD
// ============================================================
const BOSS_SPECIAL = { christian: 'truelle', guilhem: 'rolex', fateh: 'imperatif', faouzi: 'cartouches', venum: 'direct', senoussi: 'agneaux', purf: 'fumee' };
const PX = 3; // taille d'un "pixel" dans le monde rétro de Faouzi

const Game = {
  canvas: null, ctx: null, dpr: 1, s: 1, ox: 0, oy: 0, VW: 960,
  marginR: 0, // largeur (unités du jeu) masquée à droite par les boutons tactiles
  running: false, paused: false, onEnd: null,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.pcanvas = document.createElement('canvas'); this.pctx = this.pcanvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    let last = performance.now();
    const loop = now => {
      const raw = (now - last) / 1000, dt = Math.min(0.033, raw); last = now;
      if (this.running && !this.paused && raw < 0.25) Gfx.tick(raw); // allège les graphismes si l'appareil rame
      if (this.running && !this.paused) this.update(dt);
      if (this.running) this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = window.innerWidth, ch = window.innerHeight;
    this.canvas.width = Math.round(cw * this.dpr); this.canvas.height = Math.round(ch * this.dpr);
    this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
    let s = ch / VIEW_H, VW = cw / s;
    this.ox = 0; this.oy = 0;
    if (VW < 760) { VW = 760; s = cw / VW; this.oy = (ch - VIEW_H * s) / 2; }
    if (VW > 1400) { VW = 1400; this.ox = (cw - VW * s) / 2; }
    this.s = s; this.VW = VW;
    this.updateSafeArea();
  },

  // Sur téléphone, les boutons FRAPPE / SAUT / SPÉCIAL couvrent le bas à droite de l'écran,
  // c'est-à-dire justement le sol. On mesure leur place pour réduire la zone jouable utile.
  updateSafeArea() {
    this.marginR = 0;
    const ctl = document.getElementById('controls');
    if (!ctl || ctl.classList.contains('hidden') || !ctl.classList.contains('touch')) return;
    const jump = ctl.querySelector('.pad.jump');
    if (!jump) return;
    const r = jump.getBoundingClientRect();
    if (!r.width) return;
    const fromRight = window.innerWidth - r.left; // px CSS depuis le bord droit
    this.marginR = clamp(fromRight / this.s * 0.85 - (window.innerWidth - (this.ox + this.VW * this.s)) / this.s, 0, this.VW * 0.3);
  },
  // Zone visible ET jouable (en coordonnées du monde)
  bounds() { return { L: this.camX, R: this.camX + this.VW - this.marginR }; },
  // Côté d'apparition des ennemis : 60 % par la droite, 40 % par la gauche (true = droite)
  spawnFromRight() { return Math.random() < 0.6; },

  // ---------- démarrage d'un niveau ----------
  start(o) {
    this.world = worldById(o.worldId);
    this.mode = o.mode; this.diff = o.difficulty || 1;
    // niveau de difficulté choisi (1 à 3) : multiplicateurs de BALANCE.levels
    this.level = o.level || Save.data.diff || 1; this.L = BALANCE.levels[this.level] || BALANCE.levels[2];
    this.mod = o.mod || {}; // règle spéciale du défi du jour (progress.js)
    this.evOk = false; this.bossTouched = false;
    this.heroKind = o.heroKind;
    this.score = o.score || 0; this.startScore = this.score;
    this.levelLen = LAYOUT.len; // niveau en 3 tiers (tiers.js)
    this.camX = 0; this.lockMax = this.levelLen;
    this.t = 0; this.time = 0; this.hitstop = 0; this.shake = 0; this.flashA = 0; this.flashCol = '255,255,240'; this.timeScale = 1; this.slowT = 0;
    this.hits = 0; this.hitT = 0; this.kills = 0;
    this.enemies = []; this.projectiles = []; this.hazards = []; this.pickups = []; this.particles = []; this.texts = []; this.vehicles = [];
    this.dangers = [];   // dangers annoncés (monde + attaques de phase 2 des boss)
    this.combatStart(); this.evReset(); // caisses, objets, attraper/lancer (combat.js) · événements de milieu de monde (events.js)
    this.ambient = [];   // particules d'ambiance (cendres, sable, billets…)
    this.hazardT = BALANCE.hazards.first; this.pw = (BALANCE.perWorld && BALANCE.perWorld[this.world.id]) || {}; this.storm = null;
    this.cine = 0; this.cineT = 0; this.bossCard = null; // cinématique d'arrivée du boss
    this.minionScale = this.world.small ? 0.72 : 1;
    this.hero = new Fighter(o.heroKind, 'hero', 160, (GROUND_TOP + GROUND_BOTTOM) / 2);
    this.extrasStart(); // bonus, ennemi en or, chrono (extras.js)
    // niveau du héros (progress.js) : +3 % de vie et +2 % de force par niveau ; défi « Fragile » : moitié de vie
    { const bn = Progress.bonus(o.heroKind), h = this.hero; h.maxHp = Math.round(h.maxHp * bn.hp * (this.mod.heroHp || 1)); h.hp = h.maxHp; h.dmg *= bn.dmg; }
    if (o.heroHp) this.hero.hp = clamp(o.heroHp, 1, this.hero.maxHp);
    this.pw = (BALANCE.perWorld && BALANCE.perWorld[this.world.id]) || {}; // réglages propres au monde
    const extra = Math.max(0, Math.floor((this.diff - 1) * 6) + (this.pw.extraPerWave || 0) + this.L.extraPerWave);
    // vagues : 2 au 1er tiers (avant le mini-boss), 1 au 2e (avant l'épreuve), 1 au 3e (avant le boss) — voir LAYOUT (tiers.js)
    this.waves = LAYOUT.waves.map((x, i) => ({ x, n: LAYOUT.sizes[i] + (i === LAYOUT.waves.length - 1 ? extra : Math.floor(extra / 2)), started: false, done: false }));
    this.wave = null; this.spawnQueue = []; this.spawnT = 0; this.trickleT = 3;
    this.bossPhase = 0; this.boss = null; this.bossMinionT = 7; this.bossIntroT = 0; this.endT = 0; this.ended = false;
    this.goT = 0; this.tokenT = 0;
    this.survWave = 0; this.survBoss = null; this.survT = 1.5;
    if (this.mode === 'bossrush') { // Boss Rush : on arrive directement dans l'arène du boss
      this.waves.forEach(w => { w.started = w.done = true; });
      this.camX = this.levelLen - this.VW; this.hero.x = this.camX + 220; // déclenche tout de suite l'arrivée du boss
      this.hazardT = 9;
    } else if (this.mode === 'survival') { // Survie : arène fixe, vagues sans fin
      this.waves = []; this.camX = 900; this.lockMax = this.camX; this.hero.x = this.camX + (this.VW - this.marginR) * 0.4;
    }
    this.tiersStart(o); // mini-boss, point de reprise, GO, aides (tiers.js)
    this.rageStart();   // armes, pote, ennemi visé (rage.js)
    this.running = true; this.paused = false;
    Input.clear();
    this.banner(this.world.name, this.checkpoint ? 'REPRISE AU TIERS ' + this.checkpoint.tier + ' / 3' : this.mode === 'survival' ? 'SURVIE — tiens le plus longtemps possible !' : this.mode === 'bossrush' ? 'BOSS RUSH' : this.world.sub, 2);
    Music.setIntensity(0);
    Sfx.music(this.world.id);       // musique du monde
    Ambience.start(this.world.id);  // ambiance sonore du monde
  },

  stop() {
    this.running = false; Sfx.stopMusic(); Ambience.stop(); Voice.stop();
    (this.vehicles || []).forEach(v => v.engine && v.engine.stop(false));
  },

  banner(title, sub, dur = 2) {
    const b = document.getElementById('banner');
    b.querySelector('.b-title').textContent = title;
    b.querySelector('.b-sub').textContent = sub || '';
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    b.style.animationDuration = dur + 's';
  },

  opponents(f) { return f.team === 'hero' ? this.enemies.filter(e => !e.dead && e.entering <= 0) : (this.hero.dead ? [] : [this.hero]); },

  // ---------- boucle ----------
  update(rdt) {
    rdt *= this.mod.speed || 1; // défi « Turbo »
    if (this.hitstop > 0) { this.hitstop -= rdt; this.updateFx(rdt * 0.2); return; }
    if (this.slowT > 0) { this.slowT -= rdt; this.timeScale = 0.3; } else this.timeScale = 1;
    const dt = rdt * this.timeScale;
    this.t += dt; this.time += rdt;
    if (this.hitT > 0) { this.hitT -= dt; if (this.hitT <= 0) { this.hits = 0; this.comboReset(); } }

    Input.update();
    if (Input.consume('pause')) { UI.pause(); return; }
    this.updateHero(dt);
    this.updateCombat(dt);
    this.updateExtras(dt, rdt); // bonus temporaires, ennemi en or (extras.js)
    this.updateTiers(dt, rdt);  // mini-boss, trou noir, GO, aides (tiers.js)
    this.updateRage(dt);        // ennemis spéciaux, armes, appel à un pote (rage.js)
    // intensité musicale : monte avec le compteur de coups
    Music.setIntensity(this.hits >= 20 ? 3 : this.hits >= 10 ? 2 : this.hits >= 4 ? 1 : 0);
    if (this.cineT > 0) this.cineT -= rdt;
    this.cine += ((this.cineT > 0 ? 1 : 0) - this.cine) * Math.min(1, rdt * 5);

    this.tokenT -= dt;
    if (this.tokenT <= 0) {
      this.tokenT = 0.5;
      const alive = this.enemies.filter(e => !e.dead && !e.golden && e.beh === 'melee').sort((a, b) => Math.abs(a.x - this.hero.x) - Math.abs(b.x - this.hero.x));
      let n = 0;
      alive.forEach(e => { e.hasToken = e.isBoss || e.isMini || (n < 2 && ++n > 0); });
    }
    this.enemies.forEach(e => this.updateEnemy(e, dt));
    this.enemies = this.enemies.filter(e => !e.remove);

    this.updateVehicles(dt);
    this.updateProjectiles(dt);
    this.updateHazards(dt);
    this.updateDangers(dt);
    this.updateStorm(dt);
    this.updatePickups(dt);
    this.updateAmbient(dt);
    this.updateFx(dt);
    this.updateCamera(dt);
    this.updateLevel(dt, rdt);
  },

  updateHero(dt) {
    const h = this.hero;
    h.tickTimers(dt);
    if (!h.dead) {
      // la raillerie est purement décorative : n'importe quelle commande l'annule
      if (h.state === 'taunt' && (Input.mx || Input.my || Input.pressed.attack || Input.pressed.jump || Input.pressed.special)) h.setState('idle');
      if (this.ev && this.ev.lockHero) { if (h.state === 'walk') h.state = 'idle'; } // événement : le héros est guidé par l'événement
      else if (h.canAct()) {
        const mx = Input.mx, my = Input.my;
        if (mx || my) {
          const spd = h.speed * this.boostSpeed(); // boisson énergisante : plus rapide
          h.x += mx * spd * dt; h.y += my * spd * 0.62 * dt;
          if (mx) h.dir = Math.sign(mx);
          const ph = Math.floor(h.walk / Math.PI);
          h.walk += dt * 12; h.state = 'walk';
          if (h.z <= 0 && Math.floor(h.walk / Math.PI) !== ph) Sfx.step(this.world.id, Sfx.panX(h.x)); // bruits de pas
        } else h.state = 'idle';
        if (Input.consume('jump') && h.z <= 0) { h.vz = 600; Sfx.jump(); this.dust(h.x, h.y, 5); }
        if (Input.consume('special') && h.specialCd <= 0) { h.startSpecial(); Haptics.vibrate(50); if (this.hintOk('special')) this.hintDone('special'); }
        else if (this.carry) Input.consume('attack'); // il porte un ennemi : lâcher FRAPPE le lance (combat.js)
        else if (Input.consume('attack')) {
          if (this.heldItem) this.throwItem(); // objet en main : on le lance
          // en l'air ET en train de redescendre : coup plongeant
          else if (h.z > 25 && h.vz < 0) h.startDive(); else h.startAttack();
        }
      } else {
        if (h.state === 'attack' && h.st > 0.1 && Input.consume('attack')) h.queued = true;
        if (h.z > 0 && (h.state === 'attack' || h.state === 'dive')) h.x += Input.mx * h.speed * 0.6 * dt;
        if (h.state === 'dive') h.y += Input.my * h.speed * 0.4 * dt;
      }
      this.updateAction(h, dt);
      const B = this.bounds();
      h.x = clamp(h.x, B.L + 25, Math.min(B.R - 25, this.levelLen - 25));
    }
    h.physics(dt);
    if (h.dead && h.deadT > 1.8 && !this.ended) { this.ended = true; this.finish('lose'); }
    h.remove = false;
  },

  specialOf(f) { return f.team === 'hero' || f.isMini ? f.def.special : BOSS_SPECIAL[f.kind]; },

  updateAction(f, dt) {
    if (f.state === 'attack') {
      if (!f.hitDone && f.st >= f.stateDur * 0.35) { f.hitDone = true; this.resolveMelee(f); }
      if (f.st >= f.stateDur) {
        if (f.queued) { f.comboT = 1; f.startAttack(); }
        else { f.setState('idle'); f.comboT = 0.45; if (f.combo >= 2) { f.combo = 0; f.comboT = 0; } }
      }
    } else if (f.state === 'taunt') {
      if (f.st >= f.stateDur) f.setState('idle');
    } else if (f.state === 'victory') { // victoire courte (fin d'épreuve) : on rend la main ; celle de fin de boss (99 s) dure jusqu'à l'écran de victoire
      if (f.stateDur < 50 && f.st >= f.stateDur) { f.setState('idle'); f.vz = Math.min(f.vz, 0); }
    } else if (f.state === 'special') {
      const sp = f.dashSp || this.specialOf(f);
      if (sp === 'argent' && f.st - (f.lastPuddle || 0) > 0.12) { // The Purf : la charge laisse des flaques toxiques
        f.lastPuddle = f.st;
        this.addDanger({ type: 'puddle', team: 'boss', x: f.x, y: f.y, warn: 0.25, act: 3.2, rx: 46, ry: 16, tick: 0.5, dmg: BALANCE.hazards.tickDmg, kd: false, sound: false });
      }
      if (sp === 'direct' || sp === 'imperatif' || sp === 'argent' || sp === 'belier') { // (belier : charge du mouton géant)
        f.invul = Math.max(f.invul, 0.05);
        f.x += f.dir * 640 * dt;
        if (f.team === 'enemy') { const B = this.bounds(); f.x = clamp(f.x, B.L + 20, B.R - 20); }
        if (!f.specialFired) { f.specialFired = true; Sfx.special('direct', Sfx.panX(f.x)); if (sp === 'imperatif') f.say("J'ai un impératif"); }
        this.opponents(f).forEach(o => {
          if (f.dashHits.has(o)) return;
          if (Math.abs(o.x - f.x) < f.halfW + o.halfW + 10 && Math.abs(o.y - f.y) < 32 * f.scale && o.z < 120) {
            const dd = sp === 'argent' ? BALANCE.boss.phase2Dmg * this.bossDmgK() : this.specialDmg(f, 24); // charge de phase 2 de The Purf
            f.dashHits.add(o); this.applyHit(f, o, dd, { knockdown: true }, true);
          }
        });
        if (Math.random() < 0.5) this.dust(f.x - f.dir * 20, f.y, 1);
      } else if (!f.specialFired && f.st >= f.stateDur * 0.4) {
        f.specialFired = true; this.doSpecial(f, sp);
      }
      if (f.st >= f.stateDur) { f.setState('idle'); f.dashSp = null; }
    } else if (f.state === 'dive') {
      f.invul = Math.max(f.invul, 0.05);
      // lignes de vitesse
      if (Math.random() < 0.85) this.particles.push({ type: 'speed', x: f.x + rand(-f.halfW, f.halfW), y: f.y, z: f.z + f.height * rand(0.4, 1.2), vz: 260, life: 0.2, max: 0.2 });
      if (f.z <= 0 && f.st > 0.02) this.diveLand(f);
    } else if (f.state === 'land') {
      if (f.st >= f.stateDur) f.setState('idle');
    } else if (f.state === 'windup') {
      if (f.st >= f.stateDur) {
        const a = f.nextAction;
        if (a === 'special') f.startSpecial();
        else if (a === 'shoot') { f.setState('attack', 0.3); f.hitDone = true; this.shoot(f); }
        else if (a === 'dash') { f.setState('dash', 1.4); f.dashHits.clear(); }
        else if (a === 'swoop') { f.setState('dash', 1.1); f.dashHits.clear(); }
        else if (a === 'hop') { f.setState('idle'); f.vz = 560; f.kx = Math.sign(this.hero.x - f.x) * 240; f.hopping = true; }
        else if (a === 'p2') this.bossPhase2Attack(f);
        else if (a === 'boom') this.futBoom(f); // fût radioactif (rage.js)
        else f.startAttack();
      }
    }
  },

  // Atterrissage du coup plongeant : onde de choc courte autour du point d'impact
  diveLand(f) {
    f.setState('land', 0.26); f.kx = 0; f.vz = 0;
    const rx = 120 * f.scale, ry = 46 * f.scale;
    this.particles.push({ type: 'ring', x: f.x, y: f.y, z: 0, r: 8, rmax: rx, life: 0.3, max: 0.3, col: 'rgba(255,255,255,0.95)' });
    this.particles.push({ type: 'ring', x: f.x, y: f.y, z: 0, r: 4, rmax: rx * 0.6, life: 0.22, max: 0.22, col: '#feca57' });
    this.dust(f.x, f.y, 16);
    let hit = 0;
    this.opponents(f).forEach(o => {
      const dx = (o.x - f.x) / rx, dy = (o.y - f.y) / ry;
      if (dx * dx + dy * dy < 1 && o.z < 80 && this.applyHit(f, o, f.dmg * 1.8, { knockdown: true }, true)) hit++;
    });
    this.shake = Math.max(this.shake, 0.45);
    this.hitstop = Math.max(this.hitstop, hit ? 0.15 : 0.08); // arrêt sur image plus marqué qu'un coup normal
    Haptics.vibrate(hit ? [35, 30, 70] : 45);
    Sfx.diveLand();
  },

  // points gagnés × multiplicateur du niveau de difficulté (×1 / ×1,5 / ×2)
  addScore(n) { this.score += Math.round(n * this.L.score * (this.mod.score || 1) * (this.boostIs('rolex') ? 2 : 1)); }, // Rolex en or : points ×2
  specialDmg(f, base) {
    if (f.team === 'hero') return base;
    return f.isBoss ? base * BALANCE.boss.specialDmgMul * this.bossDmgK() : base * 0.55 * this.diff * 0.8 * this.L.enemyDmg;
  },
  // difficulté atténuée appliquée aux boss (voir BALANCE.boss.diffScale)
  bossDiff() { return 1 + (this.diff - 1) * BALANCE.boss.diffScale; },
  bossDmgK() { return this.bossDiff() * this.L.bossDmg; }, // dégâts des boss, niveau de difficulté compris

  // zone de frappe : devant, large, et haute (touche aussi les goélands)
  inMeleeZone(f, o, extra = 0) {
    const dx = (o.x - f.x) * f.dir;
    const reachX = f.halfW + f.reach + o.halfW * 0.6 + extra;
    const depthTol = 26 + 9 * (f.scale + o.scale);
    const zUp = f.team === 'hero' ? 175 : 90;
    return dx > -18 && dx < reachX && Math.abs(o.y - f.y) < depthTol && o.z <= f.z + zUp && o.z + o.height >= f.z - 20;
  },

  resolveMelee(f) {
    const finisher = f.combo === 2 || (f.z > 20 && f.team === 'hero');
    const W = f.weapon ? RAGE.weapon : null; // arme ramassée : plus fort, plus loin (rage.js)
    const dmg = f.dmg * (finisher ? 1.6 : 1) * (W ? W.dmg : 1);
    let touched = 0;
    this.opponents(f).forEach(o => { if (this.inMeleeZone(f, o, W ? W.reach : 0) && !o.grabbed && this.applyHit(f, o, dmg, { knockdown: finisher })) touched++; });
    if (W && touched) this.weaponUsed(f);
    if (f.team === 'hero') { this.meleeProps(f); this.evMelee(f); } // caisses · cible d'un événement
    if (f.team === 'hero' && f.kind === 'fateh') { // Aïka mord en même temps
      this.opponents(f).forEach(o => { if (this.inMeleeZone(f, o, 40) && !o.dead) this.applyHit(f, o, 3, { noStagger: true }); });
    }
  },

  applyHit(src, o, dmg, opts = {}, big = false) {
    if (src && src === this.hero) dmg *= this.boostDmg(); // os à moelle, champignon
    dmg = Math.max(1, Math.round(dmg));
    if (!o.takeHit(src, dmg, opts)) return false;
    const hz = o.z + o.height * 0.55;
    this.spark(o.x, o.y, hz, opts.knockdown || big ? 14 : 8);
    if (!opts.noStagger || dmg > 4) this.hitText(src, o, hz, opts.knockdown || big); // onomatopée du héros (extras.js)
    const pan = Sfx.panX(o.x);
    const wk = src && src.team === 'hero' ? src.kind : null; // le son prend la « couleur » de l'arme du héros
    if (opts.knockdown || big) { Sfx.bigHit(pan, wk, this.hits); this.shake = 0.25; this.hitstop = 0.07; }
    else { Sfx.hit(pan, wk, src ? src.combo || 0 : 0, this.hits); this.hitstop = Math.max(this.hitstop, 0.035); this.shake = Math.max(this.shake, 0.08); }
    if (src && src.team === 'hero') {
      this.setTarget(o); // barre de l'ennemi visé (rage.js)
      this.hits++; this.hitT = 1.6; this.addScore((5 + Math.min(this.hits, 30)) * (this.mod.hitScore || 1)); this.onHeroHit();
      if (o.dead) this.onKill(o, src, opts);
    } else if (o === this.hero) {
      Sfx.hurt(); this.hits = 0; this.comboReset(); this.dropCarry();
      if (this.bossPhase === 2) this.bossTouched = true; // (trophée « Intouchable »)
      Haptics.vibrate(opts.knockdown ? 110 : 55);
      if (o.dead) { this.slowT = 1.2; Sfx.gameOver(); Sfx.stopMusic(); }
      // le boss qui vient de renverser le héros prend le temps de le narguer (répit pour le joueur)
      else if (opts.knockdown && src && src.isBoss && !src.dead && src.state !== 'special') { src.setState('taunt', BALANCE.boss.tauntAfterKnockdown); src.attackCd = Math.max(src.attackCd, 1.2); }
    } else if (src && src.team === 'world' && o.dead) this.onKill(o, src, opts); // un ennemi pris dans un danger du décor
    return true;
  },

  onKill(e, src, opts) {
    this.kills++;
    this.onKillFx(e, src, opts); // éjection, bonus danger / lancer, dernier ennemi de la vague (combat.js)
    const gag = Sfx.kill(Sfx.panX(e.x), e.isBoss);
    if (gag) { this.gagFx(e, gag); Progress.count('gags'); }
    if (e.golden) this.onGoldKill(e); // ennemi en or : jackpot (extras.js)
    if (e.def.boom) this.futBoom(e);  // un fût radioactif explose quand on le bat (rage.js)
    if (e.heavy) this.dropWeapon(e.x, e.y); // le costaud lâche une arme (rage.js)
    if (e.isMini) this.onMiniKill(e); // mini-boss (tiers.js)
    else if (e.isBoss) {
      this.addScore(1000);
      this.slowT = 1.2; this.shake = 0.5;
      this.bossKO(e); // K.O. au ralenti (extras.js)
      Haptics.vibrate([70, 40, 160]);
      for (let i = 0; i < 24; i++) this.particles.push({ type: 'coin', x: e.x, y: e.y, z: e.height * 0.6, vx: rand(-260, 260), vy: rand(-40, 40), vz: rand(300, 700), life: 1.6, max: 1.6 });
    } else {
      this.addScore(e.mustKill ? 300 : 50);
      if (!e.mustKill && Math.random() < 0.22 * this.L.food) this.pickups.push({ type: this.world.food, x: e.x, y: e.y, t: 0, life: 14 });
    }
  },

  // ---------- spéciaux ----------
  doSpecial(f, sp) {
    if (f.isMini && this.miniSpecial(f, sp)) return; // attaques des mini-boss (tiers.js)
    Sfx.special(sp, Sfx.panX(f.x));
    const opp = this.opponents(f);
    switch (sp) {
      case 'truelle': {
        const cx = f.x + f.dir * 60 * f.scale, rx = 175 * f.scale, ry = 62 * f.scale;
        this.particles.push({ type: 'ring', x: cx, y: f.y, z: 0, r: 10, rmax: rx, life: 0.45, max: 0.45 });
        this.dust(cx, f.y, 16); this.shake = 0.35;
        opp.forEach(o => { const dx = (o.x - cx) / rx, dy = (o.y - f.y) / ry; if (dx * dx + dy * dy < 1 && o.z < 80) this.applyHit(f, o, this.specialDmg(f, 28), { knockdown: true }, true); });
        break;
      }
      case 'rolex': {
        this.flashA = 0.55; this.flashCol = '255,250,210';
        this.particles.push({ type: 'ring', x: f.x, y: f.y, z: f.height * 0.6, r: 10, rmax: 300, life: 0.35, max: 0.35, col: '#f1c40f' });
        opp.forEach(o => { if (Math.abs(o.x - f.x) < 460) this.applyHit(f, o, this.specialDmg(f, 8), { stun: f.team === 'hero' ? (o.isBoss ? 1.2 : 2.4) : 0.8, noStagger: true }); });
        break;
      }
      case 'chien':
        this.projectiles.push({ kind: 'dog', team: f.team, owner: f, x: f.x + f.dir * 40, y: f.y, vx: f.dir * 560, dmg: this.specialDmg(f, 18), life: 1.3, pierce: true, hit: new Set() });
        break;
      case 'cartouches':
        [-36, 0, 36].forEach(dy => this.projectiles.push({ kind: 'cartouche', team: f.team, owner: f, x: f.x + f.dir * 30, y: clamp(f.y + dy, GROUND_TOP + 15, GROUND_BOTTOM), vx: f.dir * 620, dmg: this.specialDmg(f, 15), life: 1.4, hit: new Set() }));
        break;
      case 'moutons':
        [-55, 0, 55].forEach((dy, i) => this.projectiles.push({ kind: 'sheep', team: f.team, owner: f, x: f.x - f.dir * (40 + i * 30), y: clamp(f.y + dy, GROUND_TOP + 15, GROUND_BOTTOM), vx: f.dir * 470, dmg: this.specialDmg(f, 18), life: 2.2, pierce: true, hit: new Set(), knockdown: true }));
        break;
      case 'agneaux':
        f.say(pick(['Alors là !', 'Que le Chapiste soit avec moi !']));
        { // les agneaux arrivent tous du même côté (60 % droite / 40 % gauche)
          const right = this.spawnFromRight(), B = this.bounds();
          for (let i = 0; i < (f.isBoss ? BALANCE.boss.lambs : 4); i++) this.spawnEnemy('agneau', { x: right ? B.R + 40 + i * 50 : B.L - 40 - i * 50, y: rand(GROUND_TOP + 20, GROUND_BOTTOM - 10) });
        }
        break;
      case 'fumee':
        if (f.isBoss) { // nuage du boss : plus petit, plus court, tics plus lents (voir BALANCE.boss.cloud*)
          const B = BALANCE.boss;
          this.hazards.push({ team: f.team, owner: f, x: f.x + f.dir * 30, y: f.y, r: B.cloudRadius, life: B.cloudLife, max: B.cloudLife, tick: 0.4, tickEvery: B.cloudTick, dmg: this.specialDmg(f, 5) });
        } else this.hazards.push({ team: f.team, owner: f, x: f.x + f.dir * 30, y: f.y, r: 150 * Math.min(f.scale, 1.2), life: 3.5, max: 3.5, tick: 0, dmg: this.specialDmg(f, 6) });
        break;
    }
  },

  shoot(f) {
    let kind = f.def.shot || 'bolt', dmg = f.dmg * 0.9, speed = 560, z = 0;
    if (f.isBoss && f.kind === 'faouzi') { kind = 'cartouche'; dmg = f.dmg * BALANCE.boss.shotDmgMul; speed = 600; }
    if (f.isBoss && f.kind === 'purf') { kind = 'parmesan'; dmg = f.dmg * BALANCE.boss.shotDmgMul; speed = 520; f.say('Attaque de parmesan'); }
    if (kind === 'laser') Sfx.tone('square', 1400, 300, 0.2, 0.15); else Sfx.special('cartouches');
    this.projectiles.push({ kind, team: f.team, owner: f, x: f.x + f.dir * 34, y: f.y, vx: f.dir * speed, dmg, life: 1.8, hit: new Set() });
  },

  updateProjectiles(dt) {
    this.projectiles.forEach(p => {
      p.x += p.vx * dt; p.life -= dt;
      const targets = p.team === 'hero' ? this.enemies.filter(e => !e.dead && e.entering <= 0) : (this.hero.dead ? [] : [this.hero]);
      for (const o of targets) {
        if (p.hit.has(o)) continue;
        if (p.ground && o.z > 30) continue; // la fissure au sol s'évite en sautant
        if (Math.abs(o.y - p.y) < 30 * Math.max(1, o.scale) && Math.abs(o.x - p.x) < o.halfW + 22 && o.z < 160) {
          p.hit.add(o);
          this.applyHit(p.owner, o, p.dmg, { knockdown: p.knockdown, item: p.itemHit });
          if (!p.pierce) { p.life = 0; break; }
        }
      }
      if ((p.kind === 'sheep' || p.kind === 'dog' || p.kind === 'quake') && Math.random() < (p.kind === 'quake' ? 0.8 : 0.3)) this.dust(p.x, p.y, 1);
    });
    this.projectiles = this.projectiles.filter(p => p.life > 0 && p.x > this.camX - 300 && p.x < this.camX + this.VW + 300);
  },

  updateHazards(dt) {
    this.hazards.forEach(hz => {
      hz.life -= dt; hz.tick -= dt;
      if (hz.tick > 0) return;
      hz.tick = hz.tickEvery || 0.35;
      const targets = hz.team === 'hero' ? this.enemies.filter(e => !e.dead && e.entering <= 0) : (this.hero.dead ? [] : [this.hero]);
      targets.forEach(o => {
        const dx = (o.x - hz.x) / hz.r, dy = (o.y - hz.y) / (hz.r * 0.45);
        if (dx * dx + dy * dy >= 1 || o.z > 150) return;
        if (o === this.hero && (o.invul > 0 || o.shield > 0 || this.boostIs('masque'))) return; // casque, masque à gaz
        o.hp -= hz.dmg; o.flash = 0.08;
        this.text(o.x, o.y, o.height + 10, '-' + Math.round(hz.dmg), '#a3e635', 16, 0.6);
        if (o.hp <= 0) { o.hp = 0; o.die(Math.sign(o.x - hz.x) || 1); if (hz.team === 'hero') this.onKill(o); else { Sfx.gameOver(); Sfx.stopMusic(); } }
        else if (o === this.hero) { o.invul = 0.3; Sfx.hurt(); }
      });
    });
    this.hazards = this.hazards.filter(h => h.life > 0);
  },

  // ============================================================
  //  DANGERS — toujours annoncés (marque au sol, phares, ligne de visée…) avant de blesser.
  //  team 'world' : danger du décor, touche le héros ET les ennemis courants
  //  team 'boss'  : attaque de phase 2, ne touche que le héros
  // ============================================================
  addDanger(d) {
    d = Object.assign({ act: 0.15, rx: 50, ry: 22, dmg: BALANCE.hazards.dmg, kd: true, team: 'world', t: 0, hit: new Set(), tickT: 0 }, d);
    if (d.team !== 'hero') d.dmg *= this.L.hazardDmg; // niveau de difficulté
    this.dangers.push(d);
    if (d.sound !== false) Sfx.warn(Sfx.panX(d.x));
    return d;
  },
  dangerTargets(d) {
    const hero = this.hero.dead || this.boostIs('masque') ? [] : [this.hero]; // masque à gaz : les dangers ne le touchent pas
    if (d.team === 'boss') return hero;
    return hero.concat(this.enemies.filter(e => !e.dead && !e.isBoss && !e.mustKill && e.entering <= 0));
  },
  // la cible est-elle dans la zone active du danger ?
  dangerHits(d, o) {
    const airOk = d.air; // les objets en hauteur touchent aussi en l'air
    if (!airOk && o.z > 40 && !o.fly) return false;
    if (d.type === 'car') return Math.abs(o.y - d.y) < 26 && Math.abs(o.x - d.cx) < 105;
    if (d.type === 'laser') return Math.abs(o.y - d.y) < 20 && o.z < 50;
    if (d.type === 'devil') return Math.abs(o.y - d.y) < 26 && Math.abs(o.x - d.cx) < 38;
    if (d.type === 'spikes') return Math.abs(o.x - d.x) < d.rx && Math.abs(o.y - d.y) < d.ry;
    const dx = (o.x - d.x) / d.rx, dy = (o.y - d.y) / d.ry;
    return dx * dx + dy * dy < 1;
  },
  updateDangers(dt) {
    const B = this.bounds();
    this.dangers.forEach(d => {
      d.t += dt;
      const on = d.t >= d.warn && d.t < d.warn + d.act;
      if (!d.fired && d.t >= d.warn) { d.fired = true; this.dangerFire(d); }
      // objets qui traversent l'écran (voiture, tourbillon)
      if (d.type === 'car' || d.type === 'devil') {
        if (d.cx === undefined) d.cx = d.vx > 0 ? B.L - 180 : B.R + 180;
        if (d.t >= d.warn) d.cx += d.vx * dt;
      }
      if (!on) return;
      d.tickT -= dt;
      this.dangerTargets(d).forEach(o => {
        if (!this.dangerHits(d, o)) return;
        if (d.tick) { // zone : dégâts par tic
          if ((o._dt || 0) > this.t) return; // un tic à la fois par cible
          o._dt = this.t + d.tick;
          this.applyHit({ x: d.x, team: d.team === 'boss' ? 'enemy' : 'world' }, o, d.dmg, { noStagger: true });
          this.text(o.x, o.y, o.height + 10, '-' + Math.round(d.dmg), d.type === 'arrosage' ? '#74b9ff' : '#a3e635', 15, 0.5);
        } else if (!d.hit.has(o)) { // coup unique
          d.hit.add(o);
          this.applyHit({ x: d.type === 'car' ? d.cx - Math.sign(d.vx) * 50 : d.x, team: d.team === 'boss' ? 'enemy' : 'world' }, o, d.dmg, { knockdown: d.kd }, true);
        }
      });
    });
    this.dangers = this.dangers.filter(d => d.t < d.warn + d.act + (d.linger || 0));
  },
  // instant où le danger se déclenche : effets visuels et sonores
  dangerFire(d) {
    const pan = Sfx.panX(d.x);
    switch (d.type) {
      case 'brick': if (d.crane || d.team === 'boss') { // palette de la grue : choc lourd
          this.dust(d.x, d.y, 22); this.spark(d.x, d.y, 10, 14);
          this.particles.push({ type: 'ring', x: d.x, y: d.y, z: 0, r: 10, rmax: d.rx * 1.6, life: 0.35, max: 0.35, col: '#e67e22' });
          this.shake = Math.max(this.shake, 0.55); this.hitstop = Math.max(this.hitstop, 0.05);
          this.flashA = Math.max(this.flashA, 0.18); this.flashCol = '255,200,140';
          Sfx.bigHit(pan); Sfx.tone('sine', 90, 30, 0.6, 0.8, 0, null, 0, pan); Sfx.noise(0.5, 0.45, 260, 0, 0.7, pan);
          [0.08, 0.16, 0.27].forEach((dl, i) => Sfx.tone('triangle', 1900 - i * 300, 1500, 0.06, 0.12, dl, null, 0, pan)); // briques qui rebondissent
          Haptics.vibrate(70); d.linger = 0.9; break;
        } // sinon : comme un bloc
      case 'block': case 'petanque':
        this.dust(d.x, d.y, 12); this.shake = Math.max(this.shake, 0.25); Sfx.bigHit(pan);
        d.linger = 0.6; break;
      case 'bomb': case 'strike':
        this.particles.push({ type: 'ring', x: d.x, y: d.y, z: 0, r: 8, rmax: d.rx, life: 0.3, max: 0.3, col: d.type === 'strike' ? '#ff4757' : '#feca57' });
        this.spark(d.x, d.y, 20, 12); this.shake = Math.max(this.shake, 0.3); Sfx.bigHit(pan); d.linger = 0.25; break;
      case 'car': Sfx.engine('sport', pan).stop(false); Sfx.noise(0.6, 0.25, 900, 0, 0.7, pan); break;
      case 'laser': Sfx.tone('sawtooth', 1600, 200, 0.4, 0.2, 0, null, 0, pan); this.shake = Math.max(this.shake, 0.15); break;
      case 'spikes': Sfx.tone('square', 300, 900, 0.08, 0.2, 0, null, 0, pan); break;
      case 'arrosage': Sfx.noise(d.act, 0.12, 4000, 0, 0.5, pan); break;
      case 'acidrain': Sfx.noise(d.act, 0.14, 2500, 0, 0.4, pan); break;
      case 'puddle': if (d.team === 'world') Sfx.tone('sine', 220, 600, 0.12, 0.1, 0, null, 0, pan); break;
      case 'devil': Sfx.noise(1.2, 0.18, 600, 0, 0.6, pan); break;
    }
  },
  // Un danger propre au monde, près du héros
  spawnWorldHazard() {
    const h = this.hero, B = this.bounds(), id = this.world.id, H = BALANCE.hazards;
    const nx = (sp = 120) => clamp(h.x + rand(-sp, sp), B.L + 50, B.R - 50);
    const ny = (sp = 40) => clamp(h.y + rand(-sp, sp), GROUND_TOP + 18, GROUND_BOTTOM - 4);
    const lane = () => clamp(h.y + rand(-25, 25), GROUND_TOP + 22, GROUND_BOTTOM - 8);
    switch (id) {
      case 'christian': { // la grue lâche 2 ou 3 palettes de briques, l'une après l'autre, dont une droit sur le héros
        const n = randi(2, 3);
        for (let i = 0; i < n; i++) this.addDanger({ type: 'brick', crane: true, x: i === 0 ? clamp(h.x, B.L + 60, B.R - 60) : nx(170), y: i === 0 ? h.y : ny(55), warn: 1.05 + i * 0.35, act: 0.14, rx: 62, ry: 25, dmg: H.craneDmg, kd: true, sound: i === 0 });
        Sfx.tone('square', 220, 200, 0.5, 0.05, 0, null, 6, Sfx.panX(h.x)); // grincement du câble
        break;
      }
      case 'guilhem': { // une voiture traverse : phares + klaxon avant
        const vx = Math.random() < 0.5 ? 1100 : -1100;
        this.addDanger({ type: 'car', y: lane(), x: h.x, vx, warn: 1.4, act: (this.VW + 500) / 1100, kd: true });
        Sfx.tone('square', 392, 392, 0.3, 0.08, 0.2, null, 0, vx > 0 ? -0.8 : 0.8); Sfx.tone('square', 494, 494, 0.3, 0.06, 0.2, null, 0, vx > 0 ? -0.8 : 0.8);
        break;
      }
      case 'fateh': { // arrosage plus large et plus long, mène de pétanque (3 boules), ou les deux à la fois
        const arro = () => this.addDanger({ type: 'arrosage', x: nx(70), y: ny(30), warn: 0.85, act: 2.6, rx: 95, ry: 32, tick: 0.35, dmg: H.tickDmg, kd: false });
        const boules = () => { for (let i = 0; i < 3; i++) this.addDanger({ type: 'petanque', x: nx(150), y: ny(50), warn: 0.85 + i * 0.28, act: 0.1, rx: 34, ry: 15, kd: true, dmg: H.dmg * 0.9, sound: i === 0 }); };
        const r = Math.random();
        if (r < 0.35) arro(); else if (r < 0.7) boules(); else { arro(); boules(); }
        break;
      }
      case 'faouzi': // pièges pixel : une rangée de piques, ou un bloc qui tombe
        if (Math.random() < 0.5) this.addDanger({ type: 'spikes', x: nx(80), y: ny(), warn: 1.2, act: 0.9, rx: 64, ry: 16, kd: true });
        else this.addDanger({ type: 'block', x: nx(), y: ny(), warn: 1.2, act: 0.12, rx: 40, ry: 18, kd: true });
        break;
      case 'venum': // laser d'un drone sur une ligne (saute ou change de ligne)
        this.addDanger({ type: 'laser', x: h.x, y: lane(), warn: 1.3, act: 0.35, kd: true });
        break;
      case 'senoussi': // tempête de sable : vent qui pousse + tourbillons sur des lignes annoncées
        if (!this.storm) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          this.storm = { t: 0, warn: 1.6, dur: 6, dir };
          this.text(h.x, h.y, 200, 'TEMPÊTE DE SABLE !', '#feca57', 26, 1.6);
          Sfx.noise(2, 0.15, 500, 0, 0.5);
          [0, 1].forEach(i => this.addDanger({ type: 'devil', y: clamp(lane() + (i ? 60 : -60), GROUND_TOP + 22, GROUND_BOTTOM - 8), x: h.x, vx: dir * 300, warn: 1.6 + i * 1.6, act: (this.VW + 400) / 300, rx: 38, kd: true, sound: false }));
        }
        break;
      case 'purf': // flaque toxique, ou pluie toxique sous un nuage
        if (Math.random() < 0.5) this.addDanger({ type: 'puddle', x: nx(90), y: ny(), warn: 1.1, act: 6, rx: 64, ry: 20, tick: 0.5, dmg: H.tickDmg, kd: false });
        else this.addDanger({ type: 'acidrain', x: nx(80), y: ny(20), warn: 1.6, act: 2.4, rx: 105, ry: 40, tick: 0.45, dmg: H.tickDmg, kd: false });
        break;
    }
  },
  // Tempête de sable : le vent pousse tout le monde dans une direction
  updateStorm(dt) {
    const st = this.storm; if (!st) return;
    st.t += dt;
    if (st.t > st.warn && st.t < st.warn + st.dur) {
      const push = st.dir * 85 * dt;
      if (!this.hero.dead) this.hero.x += push;
      this.enemies.forEach(e => { if (!e.dead && !e.isBoss && e.entering <= 0) e.x += push * 0.8; });
    }
    if (st.t > st.warn + st.dur + 1) this.storm = null;
  },

  // ---------- particules d'ambiance (dans l'espace écran, avec parallaxe) ----------
  updateAmbient(dt) {
    const id = this.world.id, VW = this.VW;
    const boss = this.bossPhase >= 1 || !!this.survBoss;
    const cfg = AMBIENT[id]; if (!cfg) return;
    const want = Math.round(cfg.n * (boss ? 1.6 : 1) * (this.storm && this.storm.t > this.storm.warn ? 3 : 1));
    while (this.ambient.length < want) this.ambient.push(cfg.make(VW, Math.random() < 0.5 ? rand(0, VIEW_H) : null));
    this.ambient.forEach(p => {
      p.x += p.vx * dt + (this.storm && this.storm.t > this.storm.warn ? this.storm.dir * 260 * dt : 0);
      p.y += p.vy * dt; p.t += dt;
      if (p.y > VIEW_H + 20 || p.y < -40 || p.x < -60 || p.x > VW + 60 || p.t > p.life) p.dead = true;
    });
    this.ambient = this.ambient.filter(p => !p.dead);
    if (this.ambient.length > want + 10) this.ambient.length = want;
  },

  updatePickups(dt) {
    const h = this.hero;
    this.pickups.forEach(p => {
      p.t += dt; p.life -= dt;
      if (!p.item && !p.power && !p.weapon && !h.dead && Math.abs(p.x - h.x) < 34 && Math.abs(p.y - h.y) < 24) {
        p.life = 0; h.hp = Math.min(h.maxHp, h.hp + 25); Sfx.pickup();
        this.text(h.x, h.y, h.height + 20, '+25 MIAM', '#2ecc71', 22);
      }
    });
    this.pickups = this.pickups.filter(p => p.life > 0);
  },

  // ---------- IA ennemie ----------
  updateEnemy(e, dt) {
    if (e.grabbed) { e.tickTimers(dt); return; } // porté par le héros (combat.js)
    e.tickTimers(dt);
    if (e.isBoss && !e.dead) {
      if (!e.phase2 && e.hp <= e.maxHp * this.L.phase2At && e.entering <= 0) this.enterPhase2(e);
      if (e.entering <= 0) this.updateBossTier(e);
      if (e.p2Cd > 0) e.p2Cd -= dt;
    }
    if (!e.dead) {
      if (e.golden) this.goldTick(e, dt); // ennemi en or : il finit par s'enfuir (extras.js)
      if (e.entering > 0) { /* cinématique */ }
      else if (e.state === 'dash') this.updateDash(e, dt);
      else if (e.canAct() || (e.escaping && e.state !== 'down')) e.golden ? this.thinkGolden(e, dt) : this.think(e, dt);
      this.updateAction(e, dt);
      if (e.fly && e.state !== 'dash') e.z += (e.cruiseZ - e.z) * Math.min(1, dt * 2.5);
      if (e.beh === 'hopper' && e.hopping && e.z <= 0 && e.vz <= 0) { e.hopping = false; e.kx = 0; this.dust(e.x, e.y, 3); this.onHopLand(e); } // (marteau-piqueur : rage.js)
      if (['hopper', 'roller'].includes(e.beh) && !e.golden) this.contact(e, false);
      if (e.beh === 'roller') e.roll += (e.dir) * dt * 3 * (e.state === 'walk' ? 1 : 0);
    }
    e.physics(dt);
    if (e.thrownT > 0) this.updateThrown(e, dt); // lancé par le héros
    if (!e.dead && e.entering <= 0 && !e.escaping) this.keepInView(e, dt);
  },

  // Les ennemis restent ENTIÈREMENT dans la zone visible (et non masquée par les boutons).
  // À l'apparition, ils glissent vers l'intérieur et sont posés au bord au plus tard après 0,7 s ; ensuite ils n'en ressortent plus.
  keepInView(e, dt) {
    const B = this.bounds(), m = 8 + e.halfW;
    const L = B.L + m, R = B.R - m;
    if (e.x >= L && e.x <= R) { e.entered = true; e.offT = 0; return; }
    if (e.entered) {
      e.x = clamp(e.x, L, R); if ((e.x === L && e.kx < 0) || (e.x === R && e.kx > 0)) e.kx = 0;
      if (e.state === 'dash' && e.beh !== 'flyer') { e.setState('idle'); e.attackCd = rand(1.0, 1.8); } // une charge s'arrête au bord
      return;
    }
    e.offT += dt;
    const dir = e.x < L ? 1 : -1;
    e.x += dir * Math.max(260, e.speed * 1.4) * dt;
    if (e.offT > 0.7) { e.x = dir > 0 ? L : R; e.entered = true; e.offT = 0; this.dust(e.x, e.y, 4); }
  },

  contact(e, knockdown) {
    const h = this.hero;
    if (h.dead || e.contactCd > 0 || e.dead) return false;
    if (Math.abs(h.x - e.x) < e.halfW + h.halfW * 0.6 && Math.abs(h.y - e.y) < 24 * Math.max(1, e.scale) && Math.abs(h.z - e.z) < 60) {
      e.contactCd = 0.9;
      return this.applyHit(e, h, e.dmg, { knockdown });
    }
    return false;
  },

  updateDash(e, dt) {
    const h = this.hero;
    if (e.beh === 'flyer') { // piqué du goéland / de la chauve-souris
      const tx = h.x, ty = h.y;
      e.x += Math.sign(tx - e.x) * e.speed * 1.5 * dt;
      e.y += clamp(ty - e.y, -1, 1) * e.speed * 0.8 * dt;
      e.z = Math.max(18, e.z - 260 * dt);
      e.dir = Math.sign(tx - e.x) || e.dir;
      if (this.contact(e, false) || e.st > e.stateDur) { e.setState('idle'); e.attackCd = rand(1.6, 2.8); }
      return;
    }
    // charge en ligne droite (skateur, runner, mouton, agneau)
    e.x += e.dir * (e.def.dash || 500) * dt;
    e.walk += dt * 18;
    if (!e.dashHits.has(h) && this.contact(e, e.kind === 'mouton')) e.dashHits.add(h);
    if (Math.random() < 0.3) this.dust(e.x - e.dir * 20, e.y, 1);
    const passed = (e.x - h.x) * e.dir > 260;
    if (e.st > e.stateDur || passed || e.x < this.camX - 100 || e.x > this.camX + this.VW + 100) {
      e.setState('idle'); e.attackCd = rand(1.2, 2.2);
      e.x = clamp(e.x, this.camX - 60, this.camX + this.VW + 60);
    }
  },

  think(e, dt) {
    const h = this.hero;
    if (h.dead) { e.state = 'idle'; return; }
    const side = Math.sign(e.x - h.x) || 1;
    const dxAbs = Math.abs(e.x - h.x), dy = h.y - e.y;
    const aligned = Math.abs(dy) < 16 * Math.max(1, e.scale);
    const B = this.bounds();
    const onScreen = e.x > B.L + 10 && e.x < B.R - 10;
    let tx, ty, spdMul = 0.7;

    switch (e.beh) {
      case 'flyer': tx = h.x + side * 170; ty = h.y + e.yOffset * 0.3; spdMul = 0.8; break;
      case 'ranged': tx = h.x + side * 300; ty = h.y; break;
      case 'charger': tx = h.x + side * 330; ty = h.y; spdMul = 0.75; break;
      case 'roller': tx = h.x; ty = h.y; spdMul = 1; break;
      case 'hopper': tx = h.x; ty = h.y; spdMul = 0.5; break;
      default:
        if (e.isBoss && (e.kind === 'faouzi' || e.kind === 'purf') && e.hp < e.maxHp && Math.random() < 0.002) e.feint = 0.8;
        if (e.feint > 0) { e.feint -= dt; tx = e.x + side * 200; ty = e.y; }
        else if (e.hasToken) { tx = h.x + side * (e.reach * 0.75 + e.halfW + h.halfW * 0.4); ty = h.y; }
        else { tx = h.x + side * 250; ty = clamp(h.y + e.yOffset, GROUND_TOP + 15, GROUND_BOTTOM); }
    }
    tx = clamp(tx, B.L + 50, B.R - 50);

    let sepx = 0, sepy = 0;
    if (!e.fly) this.enemies.forEach(o => { if (o !== e && !o.dead && !o.fly && Math.abs(o.x - e.x) < 46 && Math.abs(o.y - e.y) < 20) { sepx += Math.sign(e.x - o.x) || 1; sepy += Math.sign(e.y - o.y) || 1; } });

    if (e.beh === 'hopper') { // ne se déplace qu'en sautant
      if (!onScreen && e.z <= 0) { e.x += Math.sign((B.L + B.R) / 2 - e.x) * e.speed * dt; e.state = 'walk'; return; }
      if (e.z <= 0 && e.attackCd <= 0 && onScreen) { e.attackCd = rand(0.9, 1.6); e.dir = -side; e.startWindup('hop', 0.25); }
      else if (e.z <= 0) e.y += clamp(dy, -1, 1) * 60 * dt;
      return;
    }
    const spd = e.speed * spdMul * (0.9 + this.diff * 0.1);
    const mx = tx - e.x, my = ty - e.y;
    const moveX = Math.abs(mx) > 8 ? Math.sign(mx) : 0, moveY = Math.abs(my) > 5 ? Math.sign(my) : 0;
    e.x += (moveX * spd + sepx * 40) * dt; e.y += (moveY * spd * 0.55 + sepy * 30) * dt;
    if (e.x < this.camX - 140) e.x = this.camX - 140;
    if (e.x > this.camX + this.VW + 140) e.x = this.camX + this.VW + 140;
    e.dir = -side;
    if (moveX || moveY) { e.state = 'walk'; e.walk += dt * 10; } else e.state = 'idle';

    if (e.beh === 'roller') return;

    // attaque de phase 2 (nouvelle attaque à partir de 50 % de vie)
    if (e.isBoss && e.phase2 && e.p2Cd <= 0 && onScreen) {
      e.p2Cd = rand(...BALANCE.boss.phase2Every) * (e.tierCd || 1);
      e.startWindup('p2', BALANCE.boss.windupPhase2 * this.L.windup);
      Sfx.warn(Sfx.panX(e.x));
      return;
    }
    // spécial du boss
    if (e.isBoss && e.specialCd <= 0 && onScreen) {
      const sp = BOSS_SPECIAL[e.kind];
      const near = dxAbs < 260 && Math.abs(dy) < 60;
      const lined = Math.abs(dy) < 40;
      if ((sp === 'truelle' || sp === 'rolex' || sp === 'fumee') ? near : sp === 'agneaux' ? true : lined) { e.startWindup('special', BALANCE.boss.windupSpecial * this.L.windup); return; }
    }
    // attaque spéciale du mini-boss (tiers.js)
    if (e.isMini && e.specialCd <= 0 && onScreen && this.miniWantsSpecial(e, dxAbs, dy)) { e.startWindup('special', BALANCE.mini.windupSpecial * this.L.windup); return; }
    if (e.beh === 'flyer') {
      if (e.attackCd <= 0 && dxAbs < 240 && onScreen) e.startWindup('swoop', 0.35);
      return;
    }
    if (e.beh === 'ranged' || (e.isBoss && (e.kind === 'faouzi' || e.kind === 'purf') && dxAbs > 160)) {
      if (aligned && e.attackCd <= 0 && onScreen && dxAbs < 520) {
        e.attackCd = e.isBoss ? rand(...BALANCE.boss.shootCd) * (e.tierCd || 1) * this.L.bossCd : rand(1.8, 3.0) / Math.sqrt(this.diff) * BALANCE.enemies.cdMul * this.L.enemyCd;
        e.startWindup('shoot', (e.isBoss ? BALANCE.boss.windupShoot : 0.45) * this.L.windup);
      }
      if (e.beh === 'ranged') return;
    }
    if (e.beh === 'charger') {
      if (aligned && e.attackCd <= 0 && onScreen && dxAbs > 120) { e.attackCd = 99; e.startWindup('dash', 0.5); }
      return;
    }
    if (e.def.boom && aligned && dxAbs < 95 && e.attackCd <= 0) { e.attackCd = 99; e.startWindup('boom', 0.9); Sfx.warn(Sfx.panX(e.x)); return; } // fût radioactif (rage.js)
    if (!e.hasToken && !e.isBoss) return;
    if (!e.isBoss && Math.random() < 0.25 * dt) { e.feint = rand(0.3, 0.7); return; }
    if (aligned && e.attackCd <= 0 && dxAbs < e.halfW + e.reach + h.halfW * 0.5) {
      e.attackCd = e.isBoss ? rand(...BALANCE.boss.attackCd) * (e.tierCd || 1) * this.L.bossCd : rand(1.3, 2.4) / Math.sqrt(this.diff) * BALANCE.enemies.cdMul * this.L.enemyCd;
      e.combo = e.isBoss && Math.random() < BALANCE.boss.comboChance + this.L.combo ? 1 : -1; e.comboT = e.isBoss ? 1 : 0;
      e.startWindup('attack', (e.isBoss ? BALANCE.boss.windupAttack : 0.42) * this.L.windup);
    }
  },

  spawnEnemy(kind, o = {}) {
    const fromRight = o.fromRight !== undefined ? o.fromRight : this.spawnFromRight();
    const B = this.bounds();
    const x = o.x !== undefined ? o.x : fromRight ? B.R + 40 : B.L - 40; // juste derrière le bord : il entre tout de suite
    const y = o.y !== undefined ? o.y : rand(GROUND_TOP + 20, GROUND_BOTTOM - 10);
    const m = MINIONS[kind];
    const e = new Fighter(kind, 'enemy', x, y, {
      hp: m.hp * this.diff * (o.hpMul || 1) * (o.mustKill ? BALANCE.boss.entourageHpMul : BALANCE.enemies.hpMul * (this.pw.minionHp || 1)) * this.L.enemyHp,
      dmg: m.dmg * (0.85 + this.diff * 0.15) * (o.mustKill ? 1 : BALANCE.enemies.dmgMul * (this.pw.minionDmg || 1)) * this.L.enemyDmg,
      speed: m.speed * rand(0.9, 1.05), scale: (o.scale || 1) * (o.mustKill ? 1 : this.minionScale), mustKill: o.mustKill,
    });
    if (e.fly) e.z = e.cruiseZ;
    if (this.mod.giant && !o.mustKill) { e.scale *= 1.3; e.maxHp = e.hp = Math.round(e.hp * 1.5); } // défi « Ennemis géants »
    e.dir = x > this.hero.x ? -1 : 1;
    this.enemies.push(e);
    return e;
  },

  // ---------- arrivée du boss ----------
  startBoss() {
    this.bossTouched = false;
    const w = this.world, c = CHARACTERS[w.boss];
    this.bossPhase = 1; this.lockMax = this.levelLen - this.VW; this.bossIntroT = 2.6;
    // cinématique : bandes noires, léger zoom, carte avec le nom du boss
    // (v3.8 : d'abord un grand bandeau au ralenti, puis la petite carte)
    this.cineT = 3.3; this.bossCard = { name: c.name.toUpperCase(), title: c.title, col: c.light, kind: w.boss, splash: true, dur: 3.3 };
    this.slowT = Math.max(this.slowT, 0.9);
    Sfx.bossArrival();
    Sfx.music('boss:' + w.id); // le thème de boss prend le relais
    const R = this.camX + this.VW;
    const bossScale = w.small ? 1.0 : 1.4;
    const mk = (x, y) => { const b = this.makeBoss(x, y); b.entering = 9; return b; };
    const midY = (GROUND_TOP + GROUND_BOTTOM) / 2;
    if (['van', 'sport', 'suv'].includes(w.entrance)) {
      this.vehicles.push({ type: w.entrance, x: R + 260, tx: R - (w.entrance === 'van' ? 230 : 190), y: GROUND_TOP + 26, state: 'drive', t: 0, engine: Sfx.engine(w.entrance, 0.7) });
    } else if (w.entrance === 'family') {
      const b = mk(R + 80, midY); b.entering = 2.2;
      [['enfant', -50], ['enfant', 50], ['aika', 0]].forEach(([k, dy], i) => {
        const e = this.spawnEnemy(k, { x: R + 150 + i * 50, y: clamp(midY + dy + (k === 'aika' ? 40 : 0), GROUND_TOP + 15, GROUND_BOTTOM), mustKill: true, scale: k === 'enfant' ? 1 : 1, hpMul: 1 });
        e.entering = 2.2;
      });
    } else if (w.entrance === 'herd') {
      for (let i = 0; i < 5; i++) this.spawnEnemy('agneau', { x: R + 40 + i * 60, y: rand(GROUND_TOP + 20, GROUND_BOTTOM - 10) });
      const b = mk(R + 120, midY); b.entering = 2.4;
    } else if (w.entrance === 'pixel') {
      const b = mk(R - 220, midY); b.entering = 1.6;
      this.flashA = 0.6; this.flashCol = '46,204,113';
      for (let i = 0; i < 40; i++) this.particles.push({ type: 'pix', x: b.x + rand(-60, 60), y: b.y, z: rand(0, 160), vx: 0, vy: 0, vz: rand(-60, 60), life: 1.4, max: 1.4, col: pick(['#2ecc71', '#f1c40f', '#e74c3c', '#3498db']) });
    } else if (w.entrance === 'smoke') {
      const b = mk(R - 200, midY); b.entering = 1.8;
      this.hazards.push({ team: 'none', x: b.x, y: b.y, r: 170, life: 1.8, max: 1.8, tick: 99, dmg: 0 });
      Sfx.special('fumee');
    }
  },

  // Crée le boss du monde avec les réglages de BALANCE (PV, dégâts, premiers délais)
  makeBoss(x, y, hpMul = 1) {
    const w = this.world, c = CHARACTERS[w.boss], B = BALANCE.boss, d = this.bossDiff();
    const pb = (B.perBoss && B.perBoss[w.boss]) || {};
    const b = new Fighter(w.boss, 'enemy', x, y, { boss: true, scale: w.small ? 1.0 : 1.4,
      hp: c.hp * (w.entourage ? B.hpMulEntourage : B.hpMul) * d * hpMul * (pb.hp || 1) * this.L.bossHp, dmg: c.dmg * B.dmgMul * d * (pb.dmg || 1) * this.L.bossDmg, speed: c.speed * 0.95 });
    b.dir = -1; b.specialCd = c.specialCd * B.firstSpecial; b.attackCd = 1.2; b.p2Cd = 0;
    this.enemies.push(b); this.boss = b;
    return b;
  },

  // Boss vaincu : le héros dit une de ses phrases (bulle + voix), juste après le jingle de victoire
  heroLine() {
    const h = this.hero, ph = h.def.phrases; if (!ph || !ph.length || h.dead) return;
    const text = pick(ph);
    setTimeout(() => { if (this.running && !h.dead) h.say(text, 3.2, 2, true); }, 650);
  },
  // Phrase du boss : au début du combat puis à chaque niveau perdu ; ses phrases défilent sans se répéter d'affilée
  bossLine(e) {
    const ph = e.def.phrases; if (!ph || !ph.length) return;
    if (e.lineIdx === undefined) e.lineIdx = randi(0, ph.length - 1);
    e.say(ph[e.lineIdx % ph.length], 3, 2);
    e.lineIdx++;
  },
  // Barre de vie en BALANCE.boss.tiers niveaux : à chaque niveau perdu, le boss nargue, parle et se durcit
  updateBossTier(e) {
    const B = BALANCE.boss, T = B.tiers;
    const lost = Math.min(T - 1, Math.floor((1 - e.hp / e.maxHp) * T + 1e-6));
    if (e.tier === undefined) e.tier = 0;
    if (lost <= e.tier) return;
    const n = lost - e.tier; e.tier = lost;
    e.speed *= Math.pow(1 + B.tierSpeedUp, n); e.dmg *= Math.pow(1 + B.tierDmgUp, n);
    e.tierCd = Math.pow(B.tierCdMul, e.tier);
    e.invul = Math.max(e.invul, B.tierInvul);
    if (e.state === 'idle' || e.state === 'walk' || e.state === 'hurt') { e.setState('taunt', 0.7); e.attackCd = Math.max(e.attackCd, 0.8); }
    this.bossLine(e);
    if (e.tier === 2 && !e.powerDropped) { e.powerDropped = true; this.dropPower((e.x + this.hero.x) / 2, this.hero.y); } // un bonus pour la suite du combat (extras.js)
    this.shake = Math.max(this.shake, 0.3);
    if (!this.text) return;
    this.text(e.x, e.y, e.height + 70, 'NIVEAU ' + (e.tier + 1) + '/' + T, '#feca57', 24, 1.2);
    Haptics.vibrate(40);
  },

  // Passage en phase 2 : rugissement, petit répit, puis nouvelle attaque
  enterPhase2(e) {
    e.phase2 = true; e.p2Cd = 1.6; e.invul = 1.0; e.speed *= 1.08;
    e.setState('taunt', 0.9); e.bubble = null; e.sayT = 4;
    this.shake = 0.45; this.flashA = 0.35; this.flashCol = '255,80,60';
    this.text(e.x, e.y, e.height + 40, 'PHASE 2 !', '#ff4757', 30, 1.4);
    Sfx.bossIntro(); Haptics.vibrate(80);
    Music.setIntensity(2);
  },

  // Attaque de phase 2, différente pour chaque boss
  bossPhase2Attack(e) {
    const h = this.hero, P = BALANCE.boss.phase2Dmg * this.bossDmgK(), B = this.bounds();
    const say = i => e.say(e.def.phrases[i % e.def.phrases.length]);
    switch (e.kind) {
      case 'christian': // pluie de briques sur des zones marquées
        say(2);
        [0, -1, 1, 0].forEach((k, i) => this.addDanger({ type: 'brick', team: 'boss', crane: true, x: clamp(h.x + k * rand(90, 130), B.L + 40, B.R - 40), y: clamp(h.y + rand(-30, 30), GROUND_TOP + 15, GROUND_BOTTOM), warn: 0.95 + i * 0.3, act: 0.14, rx: 56, ry: 23, dmg: P * 1.2, kd: true, sound: i === 0 }));
        e.setState('special', 0.5); e.specialFired = true;
        break;
      case 'guilhem': // liasses de billets en éventail
        say(1);
        [-46, 0, 46].forEach(dy => this.projectiles.push({ kind: 'billet', team: 'enemy', owner: e, x: e.x + e.dir * 30, y: clamp(e.y + dy, GROUND_TOP + 15, GROUND_BOTTOM), vx: e.dir * 430, dmg: P * 0.8, life: 2, hit: new Set() }));
        Sfx.special('rolex', Sfx.panX(e.x)); e.setState('attack', 0.3); e.hitDone = true;
        break;
      case 'fateh': // Aïka lâchée sur la ligne du héros
        say(2);
        this.projectiles.push({ kind: 'dog', team: 'enemy', owner: e, x: e.x + e.dir * 40, y: e.y, vx: e.dir * 520, dmg: P, life: 1.8, pierce: true, knockdown: true, hit: new Set() });
        Sfx.special('chien', Sfx.panX(e.x)); e.setState('attack', 0.3); e.hitDone = true;
        break;
      case 'faouzi': { // cartouche géante : la cible est marquée au sol, puis elle explose
        say(1);
        const tx = clamp(h.x, B.L + 60, B.R - 60), ty = h.y;
        this.addDanger({ type: 'bomb', team: 'boss', x: tx, y: ty, x0: e.x, y0: e.y, warn: 1.2, act: 0.15, rx: 95, ry: 36, dmg: P, kd: true });
        e.setState('attack', 0.3); e.hitDone = true;
        break;
      }
      case 'venum': // frappes de drones sur trois cibles
        say(0);
        [-1, 0, 1].forEach((k, i) => this.addDanger({ type: 'strike', team: 'boss', x: clamp(h.x + k * 120, B.L + 40, B.R - 40), y: clamp(h.y + k * 18, GROUND_TOP + 15, GROUND_BOTTOM), warn: 1.1 + i * 0.15, act: 0.25, rx: 40, ry: 18, dmg: P, kd: true, sound: i === 0 }));
        e.setState('special', 0.5); e.specialFired = true;
        break;
      case 'senoussi': // coup de pelle sismique : une fissure court au sol vers le héros (saute ou change de ligne)
        say(1);
        this.projectiles.push({ kind: 'quake', team: 'enemy', owner: e, x: e.x + e.dir * 50, y: e.y, vx: e.dir * 380, dmg: P, life: 2.6, pierce: true, ground: true, knockdown: true, hit: new Set() });
        this.shake = 0.3; this.dust(e.x + e.dir * 50, e.y, 10); Sfx.bigHit(Sfx.panX(e.x));
        e.setState('attack', 0.35); e.hitDone = true;
        break;
      case 'purf': // « Rendez-moi mon argent !!!! » : charge qui laisse des flaques toxiques
        say(0);
        e.dir = Math.sign(h.x - e.x) || e.dir; e.dashSp = 'argent'; e.lastPuddle = 0;
        e.setState('special', 0.75); e.specialFired = false; e.dashHits.clear();
        break;
    }
  },

  updateVehicles(dt) {
    this.vehicles.forEach(v => {
      v.t += dt;
      if (v.state === 'drive') {
        v.x += (v.tx - v.x) * Math.min(1, dt * 2.2) - 30 * dt;
        if (v.x <= v.tx + 4) { v.state = 'park'; v.t = 0; if (v.engine) { v.engine.stop(true); v.engine = null; } } // freinage + klaxon
      } else if (v.state === 'park' && !v.out && v.t > (v.mini ? 0.3 : 0.5)) {
        v.out = true; v.door = true;
        if (v.mini) { this.miniOut(v); return; } // le mini-boss descend du solex / de la voiturette (tiers.js)
        const R = this.camX + this.VW, w = this.world, c = CHARACTERS[w.boss];
        const b = this.makeBoss(v.x - (v.type === 'van' ? 10 : 40), v.y + 50);
        b.entering = 1.0; b.vz = 420; b.kx = -220;
        if (w.entourage) w.entourage.forEach((k, i) => { const e = this.spawnEnemy(k, { x: v.x + 40 + i * 30, y: clamp(v.y + 70 + i * 50, GROUND_TOP + 15, GROUND_BOTTOM), mustKill: true }); e.entering = 1.0; e.vz = 380; e.kx = -260; });
        this.bossLine(b);
        b.specialCd = c.specialCd * BALANCE.boss.firstSpecial;
      }
    });
  },

  // ---------- progression ----------
  updateCamera(dt) {
    const target = this.hero.x - (this.VW - this.marginR) * 0.42;
    let nx = this.camX + (target - this.camX) * Math.min(1, dt * 5);
    nx = Math.max(this.camX, nx);
    nx = Math.min(nx, this.lockMax, this.levelLen - this.VW);
    this.camX = Math.max(0, nx);
  },

  updateLevel(dt, rdt) {
    const alive = this.enemies.filter(e => !e.dead && !e.golden); // (l'ennemi en or ne bloque pas les vagues)
    // dangers du monde (annoncés, évitables), plus rares pendant le boss
    if (this.bossPhase !== 1 && this.bossPhase !== 3 && !this.hero.dead && !this.ev) { // (pendant un événement, c'est lui qui gère les dangers)
      this.hazardT -= dt;
      if (this.hazardT <= 0) { this.hazardT = rand(...BALANCE.hazards.every) * (this.pw.hazardEvery || 1) * this.L.hazardEvery * (this.mod.hazard || 1) * (this.bossPhase === 2 || this.survBoss ? 1.6 : 1); this.spawnWorldHazard(); }
    }
    if (this.mode === 'survival') { this.updateSurvival(dt, alive); return; }
    if (this.evUpdate(dt)) return; // événement de milieu de monde en cours (events.js)
    for (const w of this.waves) {
      if (!w.started && this.camX >= w.x - 2 && this.bossPhase === 0) {
        w.started = true; this.wave = w; this.lockMax = w.x; this.camX = Math.min(this.camX, w.x);
        this.fillWave(w); // ennemis de la vague, dont l'ennemi spécial et le costaud (rage.js)
        this.spawnT = 0.2;
      }
    }
    if (this.spawnQueue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && alive.length < BALANCE.enemies.maxAlive + this.L.maxAlive) { this.spawnWave(this.spawnQueue.shift()); this.spawnT = rand(0.6, 1.1); } // (certains sortent du décor : rage.js)
    }
    if (this.wave && !this.wave.done && this.spawnQueue.length === 0 && alive.length === 0) {
      this.wave.done = true; this.wave = null; this.lockMax = this.levelLen; this.goShow(); // gros GO ! (tiers.js)
      if (this.hero.state === 'idle' || this.hero.state === 'walk') this.hero.setState('taunt', 0.9); // petite raillerie
    }
    // quelques ennemis isolés entre les vagues (même répartition 60/40 que les vagues)
    this.miniStep(dt); // mini-boss du 1er tiers (tiers.js)
    if (!this.wave && this.bossPhase === 0 && this.mode !== 'bossrush' && !this.miniActive()) {
      this.trickleT -= dt;
      if (this.trickleT <= 0) { this.trickleT = rand(4, 7); if (alive.length < 2) this.spawnEnemy(pickWeighted(this.world.minions)); }
    }
    if (this.goT > 0) this.goT -= dt;

    if (this.bossPhase === 0 && this.camX >= this.levelLen - this.VW - 2) this.startBoss();
    if (this.bossPhase === 1) {
      this.bossIntroT -= dt;
      if (this.boss && this.bossIntroT <= 0 && this.boss.entering <= 0) {
        this.bossPhase = 2;
        this.enemies.forEach(e => { if (e.entering > 0) e.entering = 0; });
        if (this.boss.lineIdx === undefined) this.bossLine(this.boss); // 1re phrase s'il n'a encore rien dit
      }
      if (this.boss && this.boss.entering > 0 && !this.vehicles.length) { // marche d'entrée
        const BR = this.bounds().R;
        this.enemies.forEach(e => { if (e.entering > 0 && e.x > BR - 200) { e.x -= 160 * dt; e.walk += dt * 10; e.state = 'walk'; } });
      }
    }
    if (this.bossPhase === 2) {
      this.bossMinionT -= dt;
      if (this.bossMinionT <= 0) {
        this.bossMinionT = rand(...BALANCE.boss.reinforceEvery);
        if (alive.filter(e => !e.mustKill).length < Math.max(1, BALANCE.boss.reinforceMax + this.L.maxAlive)) this.spawnEnemy(this.pickMinion(null));
      }
      const left = this.enemies.filter(e => e.mustKill && !e.dead);
      if (left.length === 0) {
        this.bossPhase = 3; this.endT = this.koT > 0 ? 4 : 3.2; // (après un K.O. au ralenti, on laisse le temps de le voir)
        this.flashA = 0.6; this.flashCol = '255,255,240'; this.slowT = 1.4;
        Sfx.victory(); Sfx.stopMusic();
        Progress.unlock('boss1'); if (!this.bossTouched && !this.hero.dead) Progress.unlock('intouchable');
        if (this.koT > 0) this.later(() => this.banner("JE T'AI PLANTÉ !", 'No homo.', 2.4), 1000); // la bannière attend la fin du K.O.
        else this.banner("JE T'AI PLANTÉ !", 'No homo.', 3);
        this.enemies.forEach(m => { if (!m.dead) m.die(Math.sign(m.x - this.hero.x) || 1); });
        this.dangers = []; this.storm = null;
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 30);
        if (!this.hero.dead) { this.hero.setState('victory', 99); this.hero.vz = 420; this.heroLine(); } // pose de victoire + phrase du héros
      }
    }
    if (this.bossPhase === 3) {
      this.endT -= rdt;
      if (this.endT <= 0 && !this.ended) { this.ended = true; this.finish('win'); }
    }
  },

  // ---------- Survie : vagues sans fin, le boss du monde revient toutes les 5 vagues ----------
  updateSurvival(dt, alive) {
    const S = BALANCE.survival;
    if (this.survBoss && this.survBoss.dead) { this.survBoss = null; this.boss = null; Sfx.music(this.world.id); this.heroLine(); }
    if (this.spawnQueue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && alive.length < 5) { this.spawnWave(this.spawnQueue.shift()); this.spawnT = rand(0.5, 1.0); }
      return;
    }
    if (alive.length > 0) return;
    this.survT -= dt;
    if (this.survT > 0) return;
    this.survWave++; this.survT = 2.2;
    if (this.survWave >= 10) Progress.unlock('survie10');
    this.diff = 1 + (this.survWave - 1) * S.diffPerWave;
    const n = Math.min(S.maxCount, Math.round(S.baseCount + (this.survWave - 1) * S.perWave));
    for (let i = 0; i < n; i++) this.spawnQueue.push(this.pickMinion(null));
    if (this.survWave % 4 === 0) this.spawnQueue.push('costaud'); // un costaud toutes les 4 vagues (rage.js)
    this.spawnT = 0.4;
    if (this.survWave > 1) { Sfx.jingle('stage'); this.addScore(100 * (this.survWave - 1)); if (this.hero.state === 'idle') this.hero.setState('taunt', 0.8); }
    if (this.survWave % S.bossEvery === 0) { // retour du boss du monde
      const B = this.bounds(), right = this.spawnFromRight();
      const b = this.makeBoss(right ? B.R + 80 : B.L - 80, (GROUND_TOP + GROUND_BOTTOM) / 2, S.bossHpMul);
      this.bossLine(b); this.survBoss = b;
      this.cineT = 2.4; this.bossCard = { name: b.def.name.toUpperCase(), title: b.def.title, col: b.def.light, kind: b.kind, splash: true, dur: 2.4 };
      Sfx.bossArrival(); Sfx.music('boss:' + this.world.id);
      this.banner('VAGUE ' + this.survWave, 'Le boss est de retour !', 2);
    } else if (this.survWave >= S.miniFrom && (this.survWave - S.miniFrom) % S.miniEvery === 0 && this.world.mini) { // mini-boss (tiers.js)
      const e = this.miniEntrance(this.world.mini, true); if (e) e.maxHp = e.hp = Math.round(e.hp * 0.85);
      this.miniCard(this.world.mini, 2.4); Sfx.bossArrival();
      this.banner('VAGUE ' + this.survWave, 'Un mini-boss arrive !', 1.8);
    } else this.banner('VAGUE ' + this.survWave, n + ' ennemis', 1.6);
  },

  finish(result) {
    const timeBonus = result === 'win' ? Math.max(0, Math.round((330 - this.time) * 3 * this.L.score)) : 0; // (niveau plus long depuis la v3.9 : 330 au lieu de 240)
    const hpBonus = result === 'win' ? Math.round(this.hero.hp * 4 * this.L.score) : 0;
    this.score += timeBonus + hpBonus;
    const res = { result, score: this.score, levelScore: this.score - this.startScore, timeBonus, hpBonus, heroHp: this.hero.hp, evOk: !!this.evOk, hpFrac: this.hero.hp / this.hero.maxHp, kills: this.kills, time: this.time, worldId: this.world.id, wave: this.survWave, mode: this.mode, checkpoint: this.checkpoint };
    setTimeout(() => { this.stop(); this.onEnd && this.onEnd(res); }, result === 'win' ? 200 : 600);
  },

  // ---------- effets ----------
  spark(x, y, z, n) {
    for (let i = 0; i < n; i++) this.particles.push({ type: 'spark', x, y, z, vx: rand(-320, 320), vy: 0, vz: rand(-150, 380), life: rand(0.2, 0.45), max: 0.45 });
    this.particles.push({ type: 'burst', x, y, z, life: 0.16, max: 0.16 });
  },
  dust(x, y, n) {
    for (let i = 0; i < n; i++) this.particles.push({ type: 'dust', x: x + rand(-15, 15), y: y + rand(-5, 5), z: 2, vx: rand(-60, 60), vy: 0, vz: rand(20, 90), life: rand(0.35, 0.7), max: 0.7 });
  },
  text(x, y, z, s, col = '#fff', size = 20, life = 0.8, o = {}) { this.texts.push(Object.assign({ x, y, z, s, col, size, life, max: life }, o)); },
  // Pet ou rot au KO : on le MONTRE, pour qu'il n'y ait aucun doute sur ce qu'on entend
  //  pet : « PROUUUT ! » vert qui tremble + nuage verdâtre qui sort de l'arrière + lignes d'odeur
  //  rot : « BUUURP ! » jaune qui sort de la bouche + ondes devant le visage
  gagFx(e, gag) {
    const dir = e.dir || 1, big = e.isBoss ? 1.5 : 1, top = e.height || 90;
    if (gag === 'pet') {
      this.text(e.x - dir * 30, e.y, top * 0.55, pick(['PROUUUT !', 'PROUT !', 'PRRRRT !', 'POUÊÊÊT !', 'PFFFRT !']), '#9be15d', 30 * big, 1.5, { wob: 1, rot: -dir * 0.12, stroke: '#1f3d0c' });
      for (let i = 0; i < 9 * big; i++) this.particles.push({ type: 'gas', x: e.x - dir * rand(10, 30), y: e.y + rand(-6, 6), z: top * rand(0.3, 0.45), vx: -dir * rand(30, 110), vy: rand(-12, 12), vz: rand(10, 45), life: rand(1.2, 2), max: 2, r: rand(14, 24) * big });
      for (let i = 0; i < 3; i++) this.particles.push({ type: 'stink', x: e.x - dir * (18 + i * 16), y: e.y, z: top * 0.5, vx: -dir * 12, vy: 0, vz: 38, life: 1.6, max: 1.6, ph: i * 2 });
    } else {
      this.text(e.x + dir * 34, e.y, top * 0.95, pick(['BUUUURP !', 'BEUARRP !', 'BURRP !', 'ROOOT !']), '#ffd166', 30 * big, 1.5, { wob: 1, rot: dir * 0.1, stroke: '#4a2c00' });
      for (let i = 0; i < 3; i++) this.particles.push({ type: 'burpwave', x: e.x + dir * 20, y: e.y, z: top * 0.85, dir, life: 0.7 + i * 0.18, max: 0.7 + i * 0.18, delay: i * 0.15 });
      for (let i = 0; i < 4; i++) this.particles.push({ type: 'spit', x: e.x + dir * 22, y: e.y, z: top * 0.85, vx: dir * rand(80, 180), vy: rand(-20, 20), vz: rand(60, 200), life: 0.6, max: 0.6 });
    }
  },
  updateFx(dt) {
    this.particles.forEach(p => {
      p.life -= dt;
      if (p.type === 'ring') { p.r = p.rmax * (1 - p.life / p.max); return; }
      p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
      if (p.vz !== undefined) {
        p.z += p.vz * dt;
        if (p.type === 'gas' || p.type === 'stink') { p.vx *= 1 - 1.5 * dt; p.vy *= 1 - 1.5 * dt; }
        else if (p.type !== 'pix' && p.type !== 'speed' && p.type !== 'burpwave' && p.type !== 'glint') { p.vz -= (p.type === 'dust' ? 100 : 1200) * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.4; p.vx *= 0.6; } }
      }
    });
    this.particles = this.particles.filter(p => p.life > 0);
    this.texts.forEach(t => { t.life -= dt; t.z += 40 * dt; });
    this.texts = this.texts.filter(t => t.life > 0);
    if (this.shake > 0) this.shake -= dt;
    if (this.flashA > 0) this.flashA -= dt * 1.5;
  },

  // ============================================================
  //  RENDU
  // ============================================================
  render() {
    const ctx = this.ctx, d = this.dpr, VW = this.VW;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    let shx = 0, shy = 0;
    if (this.shake > 0) { shx = rand(-1, 1) * 9 * this.shake / 0.3; shy = rand(-1, 1) * 6 * this.shake / 0.3; }
    const setMain = () => ctx.setTransform(this.s * d, 0, 0, this.s * d, (this.ox + shx) * d, (this.oy + shy) * d);

    // léger zoom pendant la cinématique d'arrivée du boss (centré sur le boss)
    // … et zoom plus fort sur le K.O. du boss (extras.js)
    const ko = this.koAmount();
    const zoom = 1 + 0.07 * this.cine + 0.2 * ko;
    const fx = ko > 0 ? clamp(this.koX - this.camX, VW * 0.25, VW * 0.75) : this.boss && !this.boss.dead ? clamp(this.boss.x - this.camX, VW * 0.3, VW * 0.85) : VW * 0.6;
    const fy = ko > 0 ? clamp(this.koY, 220, 420) : GROUND_TOP + 60;
    const applyZoom = () => { if (zoom > 1.001) { ctx.translate(fx, fy); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy); } };

    if (this.world.pixel) {
      const pw = Math.ceil(VW / PX), ph = Math.ceil(VIEW_H / PX);
      if (this.pcanvas.width !== pw || this.pcanvas.height !== ph) { this.pcanvas.width = pw; this.pcanvas.height = ph; }
      const p = this.pctx; p.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0);
      p.clearRect(0, 0, VW, VIEW_H);
      this.renderScene(p);
      setMain(); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VIEW_H); ctx.clip();
      ctx.save(); applyZoom();
      ctx.imageSmoothingEnabled = false; ctx.drawImage(this.pcanvas, 0, 0, pw * PX, ph * PX); ctx.imageSmoothingEnabled = true;
    } else {
      setMain(); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VIEW_H); ctx.clip();
      ctx.save(); applyZoom();
      this.renderScene(ctx);
    }
    // surimpressions nettes : bulles
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    [this.hero, ...this.enemies].forEach(f => {
      if (f.bubble && !f.dead) drawBubble(ctx, f.x - this.camX, f.y - f.z - f.height - 34 * f.scale, f.bubble.text, Math.min(1, f.bubble.t * 3, (f.bubble.max - f.bubble.t) * 6), this.VW - this.marginR);
    });
    ctx.restore(); // fin du zoom
    // teinte + vignettage du monde : début → milieu → arène du boss
    const inBoss = this.bossPhase >= 1 && this.bossPhase < 3 || !!this.survBoss;
    const stage = this.mode === 'survival' ? (inBoss ? 1 : 0.5) : inBoss ? 1 : clamp(this.camX / (this.levelLen - VW), 0, 1) * 0.6;
    drawWorldAtmos(ctx, this.world.id, VW, this.t, inBoss); // ambiance animée du monde (backgrounds.js)
    drawWorldOverlay(ctx, this.world.id, VW, stage, this.t, inBoss);
    // tempête de sable : voile qui réduit la visibilité
    if (this.storm) {
      const st = this.storm, a = st.t < st.warn ? st.t / st.warn * 0.15 : Math.min(0.32, (st.warn + st.dur + 1 - st.t) * 0.32);
      ctx.fillStyle = `rgba(214,170,100,${Math.max(0, a)})`; ctx.fillRect(0, 0, VW, VIEW_H);
    }
    if (this.flashA > 0) { ctx.fillStyle = `rgba(${this.flashCol},${Math.min(0.85, this.flashA)})`; ctx.fillRect(0, 0, VW, VIEW_H); }
    this.renderCinematic(ctx);
    this.renderHUD(ctx);
    ctx.restore();
  },

  // Cinématique d'arrivée du boss : bandes noires + carte avec son nom
  renderCinematic(ctx) {
    const c = this.cine, VW = this.VW;
    if (c < 0.01) return;
    const bar = 58 * c;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, bar); ctx.fillRect(0, VIEW_H - bar, VW, bar);
    const card = this.bossCard; if (!card) return;
    if (card.splash && card.dur - this.cineT < 1.75) { this.renderBossSplash(ctx, card, card.dur - this.cineT); return; } // grand bandeau (extras.js)
    const w = 430, x = 30 - (w + 80) * (1 - c), y = VIEW_H * 0.3; // glisse depuis la gauche, au-dessus du décor (le boss reste visible)
    ctx.save(); ctx.globalAlpha = Math.min(1, c * 1.4); ctx.translate(x, y);
    const para = (x0, y0, ww, hh, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0 + 18, y0); ctx.lineTo(x0 + ww + 18, y0); ctx.lineTo(x0 + ww, y0 + hh); ctx.lineTo(x0, y0 + hh); ctx.closePath(); ctx.fill(); };
    para(0, -52, w, 104, 'rgba(0,0,0,.82)'); para(0, -52, 12, 104, card.col); para(0, 44, w, 8, card.col);
    ctx.textAlign = 'left'; ctx.fillStyle = '#feca57'; ctx.font = '900 16px "Arial Black", Arial'; ctx.fillText('BOSS', 40, -24);
    ctx.font = '900 44px "Arial Black", Arial'; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
    ctx.strokeText(card.name, 34, 20); ctx.fillText(card.name, 34, 20);
    ctx.font = 'italic bold 16px "Trebuchet MS", Arial'; ctx.fillStyle = card.col; ctx.fillText(card.title, 30, 39);
    ctx.restore();
  },

  renderScene(ctx) {
    const VW = this.VW, cx = this.camX, gt = this.t;
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    drawWorldBackground(ctx, this.world.id, VW, cx, gt);

    this.hazards.forEach(hz => {
      const a = Math.min(1, hz.life / 0.5) * Math.min(1, (hz.max - hz.life) / 0.2 + 0.2);
      for (let i = 0; i < 9; i++) {
        const ang = i / 9 * Math.PI * 2 + gt * 0.6;
        const px = hz.x - cx + Math.cos(ang) * hz.r * 0.6, py = hz.y + Math.sin(ang) * hz.r * 0.22 - 30 - Math.sin(gt * 2 + i) * 10;
        ctx.fillStyle = `rgba(${150 + i * 5},210,90,${0.38 * a})`;
        ctx.beginPath(); ctx.arc(px, py, hz.r * 0.38, 0, Math.PI * 2); ctx.fill();
      }
    });
    this.dangers.forEach(dg => drawDangerGround(ctx, dg, dg.x - cx, gt)); // annonces au sol
    this.drawBossTelegraphs(ctx, cx, gt); // attaques des boss annoncées au sol (extras.js)
    this.blackholes.forEach(b => drawBlackhole(ctx, b, b.x - cx, gt)); // trou noir du Blond (minis.js)
    this.rageDrawGround(ctx, cx); // bouches d'égout (rage.js)
    this.particles.forEach(p => {
      if (p.type !== 'ring') return;
      ctx.strokeStyle = p.col || 'rgba(255,255,255,0.9)'; ctx.globalAlpha = p.life / p.max; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(p.x - cx, p.y - p.z, p.r, p.r * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    });

    const fighters = [this.hero, ...this.enemies];
    fighters.forEach(f => f.drawShadow(ctx, f.x - cx, f.y));
    const list = [];
    this.vehicles.forEach(v => list.push({ y: v.y, draw: () => {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(v.x - cx, v.y, v.mini ? 100 : 190, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(v.x - cx, v.y); if (v.mini) drawMiniVehicle(ctx, v); else drawVehicle(ctx, v.type, v.t, v.state === 'drive', v.door); ctx.restore();
    } }));
    fighters.forEach(f => list.push({ y: f.y + (f.dead ? 1 : 0), draw: () => f.draw(ctx, f.x - cx, f.y, gt) }));
    this.projectiles.forEach(p => list.push({ y: p.y, draw: () => { p.sx = p.x - cx; p.sy = p.y; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.sx, p.y, 18, 5, 0, 0, Math.PI * 2); ctx.fill(); drawProjectile(ctx, p, gt); } }));
    this.pickups.forEach(p => list.push({ y: p.y, draw: () => {
      if (p.life < 3 && Math.floor(p.life * 8) % 2) return;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x - cx, p.y, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      if (p.power) { drawPowerPickup(ctx, p.power, p.x - cx, p.y, p.t); return; } // bonus temporaire (extras.js)
      if (p.weapon) { drawWeaponPickup(ctx, p.weapon, p.x - cx, p.y, p.t); return; } // arme à manier (rage.js)
      if (p.item) { ctx.save(); ctx.translate(p.x - cx, p.y - 18 - Math.abs(Math.sin(p.t * 4)) * 8); drawThrowItem(ctx, p.item, 0); ctx.restore(); }
      else drawFood(ctx, p.type, p.x - cx, p.y, p.t);
    } }));
    this.combatDraw(list, ctx, cx, gt); this.evDraw(list, ctx, cx, gt); this.extrasDraw(list, ctx, cx, gt); this.rageDraw(list, ctx, cx, gt);
    this.dangers.forEach(dg => list.push({ y: dg.y + 2, draw: () => drawDangerObj(ctx, dg, dg.x - cx, gt, VW) }));
    list.sort((a, b) => a.y - b.y).forEach(o => o.draw());
    this.combatOverlay(ctx, cx, gt);
    drawWorldForeground(ctx, this.world.id, VW, cx, gt); // premier plan, devant les personnages

    this.particles.forEach(p => {
      const a = Math.max(0, p.life / p.max), sx = p.x - cx, sy = p.y - p.z;
      if (p.type === 'spark') { // étincelle lumineuse (halo additif)
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 9); g.addColorStop(0, `rgba(255,240,180,${a})`); g.addColorStop(0.4, `rgba(255,170,60,${a * 0.6})`); g.addColorStop(1, 'rgba(255,120,30,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - 9, sy - 9, 18, 18); ctx.restore();
        ctx.fillStyle = `rgba(255,${200 + Math.random() * 55},80,${a})`; ctx.fillRect(sx - 2, sy - 2, 4, 4); }
      else if (p.type === 'dust') { ctx.fillStyle = `rgba(230,220,200,${a * 0.6})`; ctx.beginPath(); ctx.arc(sx, sy, 6 + (1 - a) * 10, 0, Math.PI * 2); ctx.fill(); }
      else if (p.type === 'speed') { ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 46); ctx.stroke(); }
      else if (p.type === 'glint') { // paillette (ennemi en or, bonus) : petite étoile à 4 branches
        const r = p.r * (0.4 + a * 0.6); ctx.fillStyle = p.col || '#ffe066'; ctx.globalAlpha = a; ctx.beginPath();
        ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.25, sy - r * 0.25); ctx.lineTo(sx + r, sy); ctx.lineTo(sx + r * 0.25, sy + r * 0.25); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.25, sy + r * 0.25); ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * 0.25, sy - r * 0.25); ctx.fill(); ctx.globalAlpha = 1; }
      else if (p.type === 'pix') { ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.fillRect(sx - 4, sy - 4, 8, 8); ctx.globalAlpha = 1; }
      else if (p.type === 'burst') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; // halo derrière l'étoile d'impact
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 46); g.addColorStop(0, `rgba(255,250,210,${a * 0.75})`); g.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 46, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const ang = i / 10 * Math.PI * 2, r = i % 2 ? 12 : 30; ctx.lineTo(sx + Math.cos(ang) * r, sy + Math.sin(ang) * r); }
        ctx.fill();
      } else if (p.type === 'gas') { // bouffée de gaz verdâtre qui gonfle
        const r = p.r * (1 + (1 - a) * 1.6);
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `rgba(170,215,60,${0.8 * a})`); g.addColorStop(0.6, `rgba(115,165,35,${0.5 * a})`); g.addColorStop(1, 'rgba(90,130,30,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'stink') { // lignes d'odeur ondulées (style BD)
        ctx.strokeStyle = `rgba(110,160,40,${a})`; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
        for (let k = 0; k <= 10; k++) { const yy = sy - k * 4.5, xx = sx + Math.sin(k * 0.9 + p.ph + p.life * 9) * 6; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke(); ctx.lineCap = 'butt';
      } else if (p.type === 'burpwave') { // ondes de choc du rot, devant la bouche
        const t = 1 - a; if (t * p.max < p.delay) return;
        const r = 10 + t * 55;
        ctx.strokeStyle = `rgba(255,209,102,${a})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(sx + p.dir * t * 30, sy, r, p.dir > 0 ? -0.9 : Math.PI - 0.9, p.dir > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
      } else if (p.type === 'spit') { ctx.fillStyle = `rgba(200,235,255,${a})`; ctx.beginPath(); ctx.arc(sx, sy, 3.5, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'coin') {
        ctx.fillStyle = '#f1c40f'; ctx.strokeStyle = '#8a6d00'; ctx.lineWidth = 2; ctx.globalAlpha = a;
        ctx.beginPath(); ctx.ellipse(sx, sy, 7 * Math.abs(Math.sin(p.life * 12)) + 1, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
      }
    });
    this.texts.forEach(t => {
      const a = Math.min(1, t.life / (t.max * 0.4));
      const sc = 1 + Math.max(0, (t.life - t.max * 0.8) / (t.max * 0.2)) * 0.5;
      const wx = t.wob ? Math.sin(t.life * 47) * 3 : 0, wy = t.wob ? Math.cos(t.life * 39) * 2 : 0;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(t.x - cx + wx, t.y - t.z + wy); ctx.scale(sc, sc); if (t.rot) ctx.rotate(t.rot);
      ctx.font = `900 ${t.size}px "Arial Black", Arial`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      if (t.burst) drawBurst(ctx, ctx.measureText(t.s).width, t.burst, t.life * 0.4); // étoile de BD (extras.js)
      if (t.stroke) { ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeText(t.s, 0, 0); ctx.lineWidth = 5; ctx.strokeStyle = t.stroke; ctx.strokeText(t.s, 0, 0); }
      else { ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(t.s, 0, 0); }
      ctx.fillStyle = t.col; ctx.fillText(t.s, 0, 0);
      ctx.restore();
    });
    drawAmbientParticles(ctx, this.ambient);
  },

  renderHUD(ctx) {
    const h = this.hero, VW = this.VW;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(10, 10, 280, 74, 14); ctx.fill();
    ctx.fillStyle = h.def.light; ctx.beginPath(); ctx.arc(46, 47, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(46, 47, 28, 0, Math.PI * 2); ctx.clip(); drawHead(ctx, h.kind, 46, 47, 62); ctx.restore();
    ctx.font = '900 16px "Arial Black", Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(h.def.name.toUpperCase(), 84, 30);
    const f = h.hp / h.maxHp;
    ctx.fillStyle = '#300'; ctx.beginPath(); ctx.roundRect(84, 37, 194, 16, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = f > 0.5 ? '#2ecc71' : f > 0.25 ? '#f39c12' : '#e74c3c';
    if (f > 0) { ctx.beginPath(); ctx.roundRect(86, 39, 190 * f, 12, 5); ctx.fill(); }
    ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(Math.ceil(h.hp) + ' / ' + h.maxHp, 181, 49);
    const sf = 1 - Math.max(0, h.specialCd) / h.def.specialCd, ready = sf >= 1;
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.roundRect(84, 58, 194, 14, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ready ? `hsl(${(this.t * 200) % 360},90%,60%)` : '#e67e22';
    ctx.beginPath(); ctx.roundRect(86, 60, 190 * Math.min(1, sf), 10, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial';
    ctx.fillText(ready ? h.def.specialName.toUpperCase() + ' PRÊT !' : h.def.specialName, 181, 69);
    ctx.restore();

    ctx.textAlign = 'right'; ctx.font = '900 26px "Arial Black", Arial'; ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
    const sc = String(this.score).padStart(6, '0');
    ctx.strokeText(sc, VW - 90, 40); ctx.fillText(sc, VW - 90, 40);
    this.combatHUD(ctx, VW); // compteur de combo + paliers (combat.js)
    this.evHUD(ctx, VW);     // événement en cours (events.js)
    this.extrasHUD(ctx, VW); // bonus en cours, chrono, messages (extras.js)
    this.rageHUD(ctx, VW);   // pote, arme en main, ennemi visé (rage.js)
    ctx.textAlign = 'center'; ctx.font = '900 17px "Arial Black", Arial'; ctx.fillStyle = '#fff';
    ctx.strokeText(this.world.name, VW / 2, 28); ctx.fillText(this.world.name, VW / 2, 28);
    if (this.mode === 'survival') { // Survie : numéro de vague
      ctx.font = '900 20px "Arial Black", Arial'; ctx.fillStyle = '#feca57';
      ctx.strokeText('SURVIE — VAGUE ' + Math.max(1, this.survWave), VW / 2, 54); ctx.fillText('SURVIE — VAGUE ' + Math.max(1, this.survWave), VW / 2, 54);
    } else if (this.mode === 'bossrush') {
      ctx.font = '900 15px "Arial Black", Arial'; ctx.fillStyle = '#ff6b6b';
      const lbl = 'BOSS RUSH ' + (UI.run.idx + 1) + ' / ' + UI.run.order.length;
      ctx.strokeText(lbl, VW / 2, 50); ctx.fillText(lbl, VW / 2, 50);
    } else {
      this.drawTierBar(ctx, VW); // barre avec les 3 repères : mini-boss, épreuve, boss (tiers.js)
    }

    // barre du boss (+ entourage restant)
    if (this.boss && !this.boss.dead && ((this.bossPhase >= 1 && this.bossPhase < 3) || this.survBoss) && this.cine < 0.5) {
      const bw = Math.min(520, VW * 0.55), bx = VW / 2 - bw / 2, by = VIEW_H - 34;
      const bf = this.boss.hp / this.boss.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(bx - 6, by - 22, bw + 12, 42, 10); ctx.fill();
      ctx.fillStyle = '#f1c40f'; ctx.font = '900 15px "Arial Black", Arial'; ctx.textAlign = 'left';
      ctx.fillText('BOSS — ' + this.boss.def.name.toUpperCase(), bx, by - 6);
      const ent = this.enemies.filter(e => e.mustKill && !e.isBoss && !e.dead).length;
      const T = BALANCE.boss.tiers, tier = this.boss.tier || 0;
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffeaa7';
      ctx.fillText((ent ? '+ ' + ent + ' à battre  ·  ' : '') + 'NIVEAU ' + (tier + 1) + '/' + T, bx + bw, by - 6);
      // barre en T niveaux : chaque niveau a sa couleur (du jaune au rouge vif), le niveau en cours clignote quand il est presque vide
      const TC = ['#f1c40f', '#f39c12', '#e67e22', '#e74c3c', '#ff1f4b'];
      ctx.fillStyle = '#300'; ctx.fillRect(bx, by, bw, 12);
      const sw = bw / T;
      for (let i = 0; i < T; i++) {
        const f = clamp(bf * T - i, 0, 1); if (f <= 0) continue;
        ctx.fillStyle = TC[Math.min(TC.length - 1, T - 1 - i)];
        if (i === T - 1 - tier && f < 0.3 && Math.floor(this.t * 8) % 2) ctx.fillStyle = '#fff';
        ctx.fillRect(bx + i * sw, by, sw * f, 12);
      }
      ctx.fillStyle = '#000'; for (let i = 1; i < T; i++) ctx.fillRect(bx + i * sw - 1.5, by - 2, 3, 16); // séparations
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 12);
    }
    this.drawMiniBar(ctx, VW); // barre du mini-boss (tiers.js)
    this.drawGo(ctx, VW);      // gros GO ! (tiers.js)
    this.drawHint(ctx);        // aides de la première fois (tiers.js)
  },
};
