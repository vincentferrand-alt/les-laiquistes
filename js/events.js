// ============================================================
//  LES LAÏQUISTES — Événements de milieu de monde (v3.6)
//  Entre la 2e et la 3e vague (mode histoire et choix du niveau), une petite épreuve propre au monde :
//   Christian : pluie de briques d'or (ramasser, sous les palettes de la grue)
//   Guilhem   : battle de rap (FRAPPE en rythme)
//   Fateh     : partie de pétanque (viser le cochonnet)
//   Faouzi    : niveau bonus (sauter pour attraper les pièces)
//   Venum     : le drone voleur (le frapper avant qu'il s'enfuie)
//   Senoussi  : le mouton d'or (l'attraper avant qu'il s'échappe)
//   The Purf  : opération nettoyage (ramasser les bidons, entre les flaques)
//  Réussite : gros bonus de points + vie. Échec : rien de perdu, on continue.
//  Tout s'ajoute à l'objet Game (game.js).
// ============================================================

const EVENTS = {
  christian: { type: 'collect', title: "PLUIE DE BRIQUES D'OR", how: 'Ramasse 10 briques dorées — gare aux palettes !', item: 'goldbrick', n: 10, dur: 22, hazards: 2.2 },
  guilhem:   { type: 'rhythm',  title: 'BATTLE DE RAP',          how: 'FRAPPE quand la note passe dans le cercle', notes: 16 },
  fateh:     { type: 'petanque', title: 'PARTIE DE PÉTANQUE',    how: 'FRAPPE pour lancer — vise le cochonnet (3 boules)' },
  faouzi:    { type: 'collect', title: 'NIVEAU BONUS',           how: 'Saute pour attraper 12 pièces', item: 'coin', n: 12, dur: 20, z: 78 },
  venum:     { type: 'chase',   title: 'LE DRONE VOLEUR',        how: 'Frappe le drone 5 fois avant qu\'il s\'enfuie', target: 'drone', hits: 5, dur: 18 },
  senoussi:  { type: 'chase',   title: "LE MOUTON D'OR",         how: 'Frappe-le 5 fois avant qu\'il s\'échappe', target: 'goldsheep', hits: 5, dur: 18 },
  purf:      { type: 'collect', title: 'OPÉRATION NETTOYAGE',    how: 'Ramasse 8 bidons toxiques — évite les flaques', item: 'barrel', n: 8, dur: 22, hazards: 2.6 },
};
const EV_BONUS = 800, EV_HEAL = 30, EV_AT = 1900; // bonus, vie rendue, position de déclenchement

const Events = {
  evReset() { this.ev = null; this.evDone = !['story', 'select', 'daily'].includes(this.mode); },

  // Appelé par updateLevel. Renvoie true tant qu'un événement occupe la scène (pas de vagues ni d'ennemis isolés).
  evUpdate(dt) {
    if (!this.ev) {
      if (this.evDone || this.bossPhase !== 0 || this.wave || !this.waves[1] || !this.waves[1].done || this.camX < EV_AT) return false;
      this.evStart();
    }
    const ev = this.ev;
    ev.t += dt;
    if (ev.phase === 'intro') { if (ev.t >= 2.4) { ev.phase = 'run'; ev.t = 0; this.evBegin(); } return true; }
    if (ev.phase === 'end') { if (ev.t >= 2.2) this.evClose(); return true; }
    switch (ev.type) {
      case 'collect': this.evCollect(dt); break;
      case 'chase': this.evChase(dt); break;
      case 'rhythm': this.evRhythm(dt); break;
      case 'petanque': this.evPetanque(dt); break;
    }
    return true;
  },

  evStart() {
    const cfg = EVENTS[this.world.id]; if (!cfg) { this.evDone = true; return; }
    const k = this.L.windup; // niveau Tranquille : un peu plus de temps ; Laïque ultime : un peu moins
    this.ev = Object.assign({ phase: 'intro', t: 0, ok: false, lockHero: cfg.type === 'rhythm' || cfg.type === 'petanque', hazards: false, items: [], got: 0 }, cfg);
    if (this.ev.dur) this.ev.dur *= k;
    this.lockMax = this.camX; // la caméra s'arrête
    // les ennemis isolés s'en vont (pouf)
    this.enemies.forEach(e => { if (!e.dead && !e.isBoss) { this.dust(e.x, e.y, 8); e.remove = true; } });
    this.dangers = []; this.dropCarry();
    this.banner(cfg.title, cfg.how, 2.6);
    Sfx.comboUp(1); Music.setIntensity(1);
    const h = this.hero, B = this.bounds();
    if (this.ev.lockHero) { h.x = B.L + (B.R - B.L) * 0.3; h.y = (GROUND_TOP + GROUND_BOTTOM) / 2; h.dir = 1; h.kx = 0; }
  },

  evBegin() {
    const ev = this.ev, B = this.bounds(), h = this.hero;
    if (ev.type === 'collect') { ev.spawnT = 0; ev.hazT = 1.5; ev.hazards = !!ev.hazards; }
    if (ev.type === 'chase') {
      ev.obj = { x: B.L + (B.R - B.L) * 0.75, y: (GROUND_TOP + GROUND_BOTTOM) / 2, z: ev.target === 'drone' ? 58 : 0, vx: 0, vy: 0, stun: 0, flash: 0, turnT: 0, hits: 0, t: 0 };
    }
    if (ev.type === 'rhythm') {
      // notes calées sur le tempo de la musique (Rap City : 88 BPM) : un motif de 16 temps
      const bpm = (Music.track && Music.track.song.bpm) || 88, beat = 60 / bpm;
      const pat = [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0.5, 1, 1, 1, 1];
      ev.notes = []; let tt = 1.6;
      pat.forEach(p => { if (p === 0.5) { ev.notes.push({ t: tt - beat / 2 }); return; } if (p) ev.notes.push({ t: tt }); tt += beat; });
      ev.end = tt + 0.8; ev.perfect = 0; ev.good = 0; ev.miss = 0;
      ev.rival = { x: h.x + 270, y: h.y, t: 0, laugh: 0 };
      ev.clock = 0;
    }
    if (ev.type === 'petanque') {
      ev.cochon = { x: h.x + rand(250, 380), y: clamp(h.y + rand(-35, 35), GROUND_TOP + 30, GROUND_BOTTOM - 20) };
      ev.balls = []; ev.left = 3; ev.points = 0; ev.gauge = 0; ev.wait = 0;
    }
  },

  evFinish(ok, msg) {
    const ev = this.ev; ev.phase = 'end'; ev.t = 0; ev.ok = ok;
    if (ok) {
      this.evOk = true; Progress.eventDone(this.world.id);
      if (ev.type === 'rhythm' && ev.miss === 0) Progress.unlock('flow');
      this.addScore(EV_BONUS); const h = this.hero; h.hp = Math.min(h.maxHp, h.hp + EV_HEAL);
      this.banner('BRAVO !', (msg ? msg + ' · ' : '') + '+' + Math.round(EV_BONUS * this.L.score) + ' points · +' + EV_HEAL + ' vie', 2.4);
      Sfx.jingle('victory'); if (h.state === 'idle' || h.state === 'walk') { h.setState('victory', 1.4); h.vz = 380; }
    } else {
      this.banner('RATÉ…', (msg ? msg + ' · ' : '') + 'pas grave, on continue', 2.2);
      Sfx.tone('sawtooth', 220, 110, 0.5, 0.15);
    }
  },
  evClose() {
    this.ev = null; this.evDone = true; this.lockMax = this.levelLen; this.goT = 3; this.hazardT = 4;
  },

  // ---------- 1. Ramasser (briques d'or, pièces, bidons) ----------
  evCollect(dt) {
    const ev = this.ev, h = this.hero, B = this.bounds();
    ev.spawnT -= dt;
    if (ev.spawnT <= 0 && ev.items.length < 3 && ev.got + ev.items.length < ev.n) {
      ev.spawnT = 0.7;
      ev.items.push({ x: rand(B.L + 70, B.R - 70), y: rand(GROUND_TOP + 25, GROUND_BOTTOM - 10), z: ev.z || 0, t: 0, drop: ev.item === 'goldbrick' ? 260 : 0 });
    }
    ev.items.forEach(it => {
      it.t += dt; if (it.drop > 0) it.drop = Math.max(0, it.drop - 700 * dt); // les briques tombent du ciel
      const zOk = ev.z ? h.z > ev.z - 45 : h.z < 50;
      if (it.drop <= 0 && Math.abs(it.x - h.x) < 36 && Math.abs(it.y - h.y) < 28 && zOk) {
        it.done = true; ev.got++;
        Sfx.pickup(); this.addScore(30);
        this.text(it.x, it.y, (ev.z || 0) + 50, ev.got + ' / ' + ev.n, '#feca57', 24);
        for (let i = 0; i < 8; i++) this.particles.push({ type: 'coin', x: it.x, y: it.y, z: (ev.z || 0) + 20, vx: rand(-120, 120), vy: 0, vz: rand(200, 400), life: 0.7, max: 0.7 });
      }
    });
    ev.items = ev.items.filter(i => !i.done);
    if (ev.hazards) { ev.hazT -= dt; if (ev.hazT <= 0) { ev.hazT = ev.hazards * this.L.hazardEvery; this.spawnWorldHazard(); } }
    if (ev.got >= ev.n) this.evFinish(true);
    else if (ev.t >= ev.dur) this.evFinish(false, ev.got + ' / ' + ev.n);
  },

  // ---------- 2. Poursuite (drone voleur, mouton d'or) ----------
  evChase(dt) {
    const ev = this.ev, o = ev.obj, h = this.hero, B = this.bounds();
    o.t += dt; if (o.flash > 0) o.flash -= dt;
    if (o.stun > 0) { o.stun -= dt; o.x += o.vx * dt * 0.3; }
    else {
      // fuit le héros en zigzaguant, change de cap de temps en temps
      o.turnT -= dt;
      const sp = (ev.target === 'drone' ? 250 : 230) / this.L.windup;
      if (o.turnT <= 0) {
        o.turnT = rand(0.5, 1.1);
        const away = Math.sign(o.x - h.x) || 1, nearWall = (o.x < B.L + 120 && away < 0) || (o.x > B.R - 120 && away > 0);
        const dir = nearWall ? -away : (Math.random() < 0.8 ? away : -away);
        o.vx = dir * sp * rand(0.7, 1.1); o.vy = rand(-1, 1) * sp * 0.6;
      }
      o.x += o.vx * dt; o.y += o.vy * dt;
    }
    if (o.x < B.L + 50 || o.x > B.R - 50) { o.vx = -o.vx; o.x = clamp(o.x, B.L + 50, B.R - 50); }
    if (o.y < GROUND_TOP + 20 || o.y > GROUND_BOTTOM - 5) { o.vy = -o.vy; o.y = clamp(o.y, GROUND_TOP + 20, GROUND_BOTTOM - 5); }
    if (ev.target === 'drone') o.z = 58 + Math.sin(o.t * 4) * 10;
    if (o.hits >= ev.hits) this.evFinish(true, ev.target === 'drone' ? 'Batterie récupérée' : 'Mouton attrapé');
    else if (ev.t >= ev.dur) this.evFinish(false, ev.target === 'drone' ? 'Le drone s\'est enfui' : 'Le mouton s\'est échappé');
  },
  // coup du héros sur la cible de poursuite
  evMelee(f) {
    const ev = this.ev; if (!ev || ev.phase !== 'run' || ev.type !== 'chase') return;
    const o = ev.obj; if (o.stun > 0.25) return;
    if (this.inMeleeZone(f, { x: o.x, y: o.y, z: o.z, height: 50, halfW: 26, scale: 1 })) {
      o.hits++; o.flash = 0.15; o.stun = 0.45; o.vx = f.dir * 420; o.vy = rand(-80, 80);
      this.spark(o.x, o.y, o.z + 25, 10); Sfx.hit(Sfx.panX(o.x), f.kind, f.combo, this.hits);
      if (ev.target === 'goldsheep') Sfx.tone('triangle', 520, 380, 0.25, 0.15); else Sfx.tone('square', 900, 300, 0.15, 0.1);
      this.text(o.x, o.y, o.z + 60, o.hits + ' / ' + ev.hits, '#feca57', 26);
      this.hitstop = Math.max(this.hitstop, 0.05);
    }
  },

  // ---------- 3. Battle de rap ----------
  evRhythm(dt) {
    const ev = this.ev, h = this.hero;
    ev.clock += dt; ev.rival.t += dt; if (ev.rival.laugh > 0) ev.rival.laugh -= dt;
    const press = Input.consume('attack') || Input.consume('jump');
    Input.consume('special');
    if (press) {
      // la note la plus proche, pas encore jouée
      let best = null, bd = 9;
      ev.notes.forEach(n => { if (!n.res) { const d = Math.abs(n.t - ev.clock); if (d < bd) { bd = d; best = n; } } });
      if (best && bd < 0.16) {
        best.res = bd < 0.07 ? 'perfect' : 'good'; ev[best.res]++;
        this.addScore(best.res === 'perfect' ? 60 : 30);
        this.text(h.x + 30, h.y, h.height + 40, best.res === 'perfect' ? pick(['PUNCHLINE !', 'FLOW !', 'PARFAIT !']) : pick(['YO !', 'OUAIS !', 'BIEN !']), best.res === 'perfect' ? '#feca57' : '#fff', best.res === 'perfect' ? 26 : 20, 0.7);
        Drums.rapSnare(Sfx.ctx ? Sfx.ctx.currentTime : 0, 0.6, Sfx.sfxBus);
        h.setState('attack', 0.22); h.hitDone = true;
      } else { // appui dans le vide
        Sfx.tone('square', 160, 120, 0.1, 0.08); ev.rival.laugh = 0.6;
      }
    }
    ev.notes.forEach(n => { if (!n.res && ev.clock - n.t > 0.16) { n.res = 'miss'; ev.miss++; ev.rival.laugh = 0.6; this.text(ev.rival.x, ev.rival.y, 110, 'HAHA', '#ff6b6b', 18, 0.6); } });
    if (ev.clock >= ev.end) {
      const total = ev.notes.length, score = (ev.perfect + ev.good * 0.7) / total;
      const pct = Math.round(score * 100) + ' %';
      if (score >= 0.6) { // le rival est KO
        this.evFinish(true, 'Battle gagnée (' + pct + ')');
        this.gagFx({ x: ev.rival.x, y: ev.rival.y, dir: -1, height: 100 }, 'rot'); Sfx.burp(Sfx.panX(ev.rival.x));
        ev.rival.ko = true;
      } else this.evFinish(false, 'Battle perdue (' + pct + ')');
    }
  },

  // ---------- 4. Pétanque ----------
  evPetanque(dt) {
    const ev = this.ev, h = this.hero;
    ev.gauge += dt; Input.consume('jump'); Input.consume('special');
    ev.balls.forEach(b => {
      if (b.t < b.dur) {
        b.t += dt; const k = Math.min(1, b.t / b.dur);
        b.x = lerp(b.x0, b.tx, k); b.y = lerp(b.y0, b.ty, k); b.z = Math.sin(k * Math.PI) * b.h + (1 - k) * 60;
        if (k >= 1) { // atterrissage : petit roulé, puis on mesure
          b.z = 0; this.dust(b.x, b.y, 6); Sfx.tone('triangle', 180, 120, 0.08, 0.2); Sfx.noise(0.1, 0.15, 900, 0, 1, Sfx.panX(b.x));
          b.x += rand(-12, 18);
          const d = Math.hypot(b.x - ev.cochon.x, (b.y - ev.cochon.y) * 1.6);
          const pts = d < 24 ? 3 : d < 60 ? 2 : d < 110 ? 1 : 0; ev.points += pts;
          const word = pts === 3 ? 'CARREAU !' : pts === 2 ? 'BIEN PLACÉE !' : pts === 1 ? 'PAS MAL' : 'TROP LOIN…';
          this.text(b.x, b.y, 60, word + (pts ? ' +' + pts : ''), pts === 3 ? '#feca57' : pts ? '#fff' : '#ff6b6b', pts === 3 ? 30 : 22, 1.2, pts === 3 ? { wob: 1 } : {});
          if (pts === 3) { Sfx.comboUp(2); this.shake = 0.25; Progress.unlock('carreau'); }
          ev.wait = 0.9;
        }
      }
    });
    if (ev.wait > 0) { ev.wait -= dt; if (ev.wait <= 0 && ev.left <= 0) { ev.points >= 3 ? this.evFinish(true, ev.points + ' points') : this.evFinish(false, ev.points + ' point' + (ev.points > 1 ? 's' : '')); } }
    const flying = ev.balls.some(b => b.t < b.dur);
    if (Input.consume('attack') && ev.left > 0 && !flying && ev.wait <= 0) {
      const p = this.evPower();
      const dist = 60 + p * 440, tx = h.x + dist, ty = ev.cochon.y + rand(-14, 14);
      ev.balls.push({ x0: h.x + 20, y0: h.y, x: h.x + 20, y: h.y, z: 60, tx, ty, t: 0, dur: 0.75, h: 110 + p * 60 });
      ev.left--; h.setState('attack', 0.3); h.hitDone = true; Sfx.swing(Sfx.panX(h.x));
    }
  },
  evPower() { return 0.5 - 0.5 * Math.cos(this.ev.gauge * 2.6); }, // jauge qui va et vient

  // ---------- rendu dans le décor (trié par profondeur) ----------
  evDraw(list, ctx, cx, gt) {
    const ev = this.ev; if (!ev || ev.phase === 'intro') return;
    if (ev.type === 'collect') ev.items.forEach(it => list.push({ y: it.y, draw: () => {
      const sx = it.x - cx, z = (it.z || 0) + it.drop + Math.sin(it.t * 5) * 4;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx, it.y, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(sx, it.y - z - 16); drawEvItem(ctx, ev.item, it.t); ctx.restore();
    } }));
    if (ev.type === 'chase' && ev.obj) { const o = ev.obj; list.push({ y: o.y, draw: () => {
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(o.x - cx, o.y, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(o.x - cx, o.y - o.z); const d = o.vx >= 0 ? 1 : -1;
      const paint = c => { if (ev.target === 'drone') drawThiefDrone(c, o.t); else { c.save(); c.scale(d, 1); drawSheep(c, 0, 0, o.t * 1.6, 1.15); c.restore(); } };
      if (ev.target === 'goldsheep') drawTinted(ctx, o.flash > 0 ? '#ffffff' : '#ffc400', o.flash > 0 ? 0.8 : 0.55, { x: -60, y: -90, w: 120, h: 100 }, paint);
      else if (o.flash > 0) drawTinted(ctx, '#fff', 0.8, { x: -60, y: -60, w: 120, h: 90 }, paint); else paint(ctx);
      if (ev.target === 'goldsheep' && Math.random() < 0.3) this.particles.push({ type: 'spark', x: o.x + rand(-20, 20), y: o.y, z: o.z + rand(10, 50), vx: 0, vy: 0, vz: 60, life: 0.4, max: 0.4 });
      ctx.restore();
    } }); }
    if (ev.type === 'rhythm' && ev.rival) { const r = ev.rival; list.push({ y: r.y, draw: () => {
      if (r.ko && ev.t > 0.6) return;
      ctx.save(); ctx.translate(r.x - cx, r.y);
      drawMinion(ctx, 'rappeur', { dir: -1, scale: 1.1, t: r.t, walk: r.t * 6, pose: r.laugh > 0 ? 'taunt' : (Math.floor(r.t * 2.9) % 2 ? 'attack' : 'idle'), poseT: (r.t * 2.9) % 1 });
      ctx.restore();
    } }); }
    if (ev.type === 'petanque' && ev.cochon) {
      const c = ev.cochon;
      list.push({ y: c.y, draw: () => { // cochonnet + cercle de visée
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        [24, 60, 110].forEach(r => { ctx.beginPath(); ctx.ellipse(c.x - cx, c.y, r, r / 1.6, 0, 0, Math.PI * 2); ctx.stroke(); });
        ctx.setLineDash([]); ctx.strokeStyle = INK; circle(ctx, c.x - cx, c.y - 6, 6, '#f1c40f');
      } });
      ev.balls.forEach(b => list.push({ y: b.y, draw: () => {
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(b.x - cx, b.y, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(b.x - cx, b.y - b.z - 11); drawThrowItem(ctx, 'boule', b.t < b.dur ? b.t : 0); ctx.restore();
      } }));
    }
  },

  // ---------- rendu par-dessus (HUD de l'événement) ----------
  evHUD(ctx, VW) {
    const ev = this.ev; if (!ev || ev.phase === 'intro') return;
    ctx.save(); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    const y0 = 78;
    // minuteur
    if (ev.dur && ev.phase === 'run') {
      const f = clamp(1 - ev.t / ev.dur, 0, 1), w = 240;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.roundRect(VW / 2 - w / 2 - 4, y0 - 4, w + 8, 18, 9); ctx.fill();
      ctx.fillStyle = f > 0.3 ? '#feca57' : (Math.floor(this.t * 6) % 2 ? '#ff4757' : '#feca57'); ctx.beginPath(); ctx.roundRect(VW / 2 - w / 2, y0, w * f, 10, 5); ctx.fill();
    }
    const label = (txt, y, col = '#fff', size = 24) => { ctx.font = `900 ${size}px "Arial Black", Arial`; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(txt, VW / 2, y); ctx.fillStyle = col; ctx.fillText(txt, VW / 2, y); };
    if (ev.type === 'collect') label(ev.got + ' / ' + ev.n, y0 + 42, '#feca57', 30);
    if (ev.type === 'chase' && ev.obj) label('TOUCHÉ ' + ev.obj.hits + ' / ' + ev.hits, y0 + 42, '#feca57', 26);
    if (ev.type === 'rhythm' && ev.notes) {
      // piste : les notes arrivent de la droite vers le cercle
      const lx = VW / 2 - 230, lw = 460, ly = y0 + 40, lead = 1.7, tx = lx + 50;
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(lx, ly - 26, lw, 52, 26); ctx.fill();
      const pulse = 1 + Math.max(0, 0.12 - Math.abs(((ev.clock + 10) % (60 / ((Music.track && Music.track.song.bpm) || 88))) - 0)) * 2;
      ctx.strokeStyle = '#feca57'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(tx, ly, 20 * pulse, 0, Math.PI * 2); ctx.stroke();
      ev.notes.forEach(n => {
        const dtn = n.t - ev.clock; if (dtn > lead || (n.res && n.res !== 'miss' && dtn < -0.1) || dtn < -0.5) return;
        const x = tx + (dtn / lead) * (lw - 70);
        const col = n.res === 'perfect' ? '#feca57' : n.res === 'good' ? '#7bed9f' : n.res === 'miss' ? '#ff4757' : '#fff';
        ctx.fillStyle = col; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, ly, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.font = '900 16px Arial'; ctx.fillText('♪', x, ly + 6);
      });
      ctx.font = '900 14px "Arial Black", Arial'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeStyle = '#000';
      const s = 'PARFAIT ' + ev.perfect + '  ·  BIEN ' + ev.good + '  ·  RATÉ ' + ev.miss;
      ctx.strokeText(s, VW / 2, ly + 46); ctx.fillText(s, VW / 2, ly + 46);
    }
    if (ev.type === 'petanque' && ev.balls) {
      label('BOULES : ' + '● '.repeat(ev.left).trim() + (ev.left ? '' : '—') + '   POINTS : ' + ev.points, y0 + 10, '#fff', 20);
      const flying = ev.balls.some(b => b.t < b.dur);
      if (ev.left > 0 && !flying && ev.wait <= 0 && ev.phase === 'run') { // jauge de puissance
        const w = 300, x = VW / 2 - w / 2, y = y0 + 34, p = this.evPower();
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.roundRect(x - 4, y - 4, w + 8, 26, 13); ctx.fill();
        const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#7bed9f'); g.addColorStop(0.6, '#feca57'); g.addColorStop(1, '#ff4757');
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w * p, 18, 9); ctx.fill();
        label('FRAPPE pour lancer', y + 48, '#feca57', 16);
      }
    }
    ctx.restore();
  },
};
Object.assign(Game, Events);

// ---------- dessins propres aux événements ----------
function drawEvItem(ctx, type, t) {
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  if (type === 'coin') { // pièce pixel qui tourne
    const w = Math.abs(Math.cos(t * 5)) * 12 + 2;
    ctx.fillStyle = '#f1c40f'; ctx.fillRect(-w, -14, w * 2, 28); ctx.strokeRect(-w, -14, w * 2, 28);
    ctx.fillStyle = '#fff6b0'; ctx.fillRect(-w * 0.4, -10, Math.max(1, w * 0.4), 20);
  } else if (type === 'barrel') {
    rrect(ctx, -12, -16, 24, 32, 4, '#f1c40f'); ctx.fillStyle = '#111'; ctx.font = '900 15px Arial'; ctx.textAlign = 'center'; ctx.fillText('☣', 0, 6);
  } else { // brique d'or
    const g = ctx.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#f1c40f'); g.addColorStop(1, '#b8860b');
    rrect(ctx, -18, -9, 36, 18, 2, g);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; if ((t * 2) % 1 < 0.2) ctx.fillRect(-12, -6, 6, 3);
  }
}
function drawThiefDrone(ctx, t) {
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  [-26, 26].forEach(x => { ctx.fillStyle = 'rgba(200,230,255,.6)'; ctx.beginPath(); ctx.ellipse(x, -40, 18 * Math.abs(Math.cos(t * 40)) + 4, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x, -32); ctx.stroke(); });
  rrect(ctx, -26, -34, 52, 16, 6, '#2d3436');
  circle(ctx, 0, -26, 5, Math.floor(t * 4) % 2 ? '#ff4757' : '#00d2ff');
  // la batterie volée, pendue en dessous
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -10); ctx.stroke();
  rrect(ctx, -8, -10, 16, 22, 3, '#2d3436'); ctx.fillStyle = '#7bed9f'; ctx.fillRect(-5, -2, 10, 10);
}
