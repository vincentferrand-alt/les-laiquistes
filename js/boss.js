// ============================================================
//  LES LAÏQUISTES — Boss plus lisibles (v3.15)
//  Chaque boss a maintenant :
//   · 3 COMPORTEMENTS nets, selon le niveau de sa barre de vie (5 niveaux) :
//       1. niveaux 1-2 : coups simples + attaque signature de temps en temps ;
//       2. niveaux 3-4 : la signature revient plus souvent, et il ajoute sa SECONDE ATTAQUE ;
//       3. niveau 5    : il enchaîne encore plus vite.
//   · une ATTAQUE SIGNATURE, annoncée au sol au moins 0,9 s (zone ou couloir rouge) ;
//   · un MOMENT DE FAIBLESSE juste après : il est essoufflé (« 💦 ») et ne peut rien faire pendant 1,5 s.
//  Pendant le combat : plus de dangers du décor, et des renforts seulement aux deux changements de comportement.
//  Réglages : BALANCE.boss.sig (data.js). Tout s'ajoute à l'objet Game : Object.assign(Game, Boss).
//
//  Boss      | attaque signature                              | seconde attaque (comportements 2 et 3)
//  Christian | pluie de briques de la grue (4 zones)          | coup de truelle (onde de choc)
//  Guilhem   | éclat de Rolex (grand cercle autour de lui)    | liasses de billets en éventail
//  Fateh     | « J'ai un impératif » (charge sur un couloir)  | Aïka lâchée sur sa ligne
//  Faouzi    | cartouche géante (cible, puis explosion)       | salve de trois cartouches
//  Venum     | direct foudroyant (charge sur un couloir)      | frappes de drones sur trois cibles
//  Senoussi  | coup de pelle sismique (fissure sur une ligne) | appel des agneaux
//  The Purf  | « Rendez-moi mon argent ! » (charge + flaques) | nuage toxique
// ============================================================
const BOSS_SIG = { christian: 'briques', guilhem: 'rolex', fateh: 'imperatif', faouzi: 'bombe', venum: 'direct', senoussi: 'seisme', purf: 'argent' };
const BOSS_SECOND = { christian: 'truelle', guilhem: 'billets', fateh: 'aika', faouzi: 'cartouches', venum: 'drones', senoussi: 'agneaux', purf: 'fumee' };
const ROLEX_ZONE = { rx: 250, ry: 92 }; // taille du cercle de l'éclat de Rolex de Guilhem

const Boss = {
  // comportement en cours (1 à 3), d'après le nombre de niveaux de barre perdus (0 à 4)
  bossStage(e) { const t = e.tier || 0; return t >= 4 ? 3 : t >= 2 ? 2 : 1; },
  // durée de l'annonce de la signature : jamais moins de 0,9 s, même en « Laïque ultime »
  sigWarn() { const S = BALANCE.boss.sig; return Math.max(S.minWarn, S.warn * this.L.windup); },

  // appelé à chaque image pour le boss : délais, essoufflement après la signature
  bossTick(e, dt) {
    if (e.sigCd > -99) e.sigCd -= dt;
    if (e.secCd > 0) e.secCd -= dt;
    if (e.winded > 0) e.winded -= dt;
    // la signature est finie (il a retrouvé sa position normale) : il est essoufflé
    if (e.windPending && (e.state === 'idle' || e.state === 'walk')) { e.windPending = false; this.bossWinded(e); }
    // renforts d'un changement de comportement : un par un
    if (this.reinfQ > 0 && this.bossPhase === 2 && (this.reinfT -= dt) <= 0) { this.reinfQ--; this.reinfT = 0.45; this.spawnEnemy(this.pickMinion(null)); }
  },
  bossWinded(e) {
    // après une charge il est loin du héros : on laisse plus de temps pour le rejoindre
    const S = BALANCE.boss.sig, T = ['imperatif', 'direct', 'argent'].includes(BOSS_SIG[e.kind]) ? S.windedCharge : S.winded;
    e.stun = Math.max(e.stun, T); e.winded = T; // (étourdi = il ne peut rien faire et encaisse tous les coups)
    e.attackCd = Math.max(e.attackCd, T + 0.5);
    this.text(e.x, e.y, e.height + 60, 'ESSOUFFLÉ !', '#74b9ff', 26, 1.3, { wob: 1, stroke: '#000' });
    Sfx.tone('sine', 520, 260, 0.35, 0.12, 0, null, 0, Sfx.panX(e.x));
  },

  // changement de comportement (2 puis 3) : il s'énerve, et des renforts arrivent — c'est le seul moment où il en vient
  bossStageUp(e, st) {
    this.text(e.x, e.y, e.height + 100, st === 2 ? "IL S'ÉNERVE !" : 'IL EST À BOUT !', '#ff4757', 30, 1.5, { wob: 1, stroke: '#000' });
    this.shake = Math.max(this.shake, 0.45); this.flashA = Math.max(this.flashA, 0.3); this.flashCol = '255,80,60';
    Sfx.bossIntro(); Haptics.vibrate(80); Music.setIntensity(st);
    if (st === 2) e.secCd = 3; // sa seconde attaque arrive bientôt
    e.sigCd = Math.min(e.sigCd, 4);
    if (this.bossPhase === 2) { // (pas en Survie : les vagues y servent déjà de renforts)
      this.reinfQ = Math.max(1, BALANCE.boss.sig.reinforce + this.L.maxAlive); this.reinfT = 0.5; // ils arrivent un par un (bossTick)
    }
  },

  // Le boss décide : signature, seconde attaque, ou rien (il continue alors ses coups simples). Renvoie true s'il prépare quelque chose.
  bossBrain(e, dxAbs, dy) {
    const S = BALANCE.boss.sig, st = this.bossStage(e), c = e.def;
    const near = dxAbs < 230 && Math.abs(dy) < 70, lined = Math.abs(dy) < 40;
    if (e.sigCd <= 0) {
      const sig = BOSS_SIG[e.kind];
      // il attend d'être bien placé (près du héros pour le cercle, sur sa ligne pour un couloir), mais pas plus de 3 s
      const placed = sig === 'briques' || sig === 'bombe' ? true : sig === 'rolex' ? near : lined;
      if (placed || e.sigCd < -3) {
        e.sigCd = rand(...S.every[st]);
        e.dir = Math.sign(this.hero.x - e.x) || e.dir;
        e.startWindup('sig', this.sigWarn());
        this.bossTelegraph(e, e.stateDur);
        Sfx.warn(Sfx.panX(e.x));
        return true;
      }
    }
    if (st >= 2 && e.secCd <= 0) {
      const sec = BOSS_SECOND[e.kind];
      const ok = sec === 'truelle' || sec === 'fumee' ? dxAbs < 260 && Math.abs(dy) < 60 : sec === 'agneaux' || sec === 'drones' ? true : lined;
      if (ok) {
        e.secCd = c.specialCd * S.secondCdMul * (e.tierCd || 1);
        e.startWindup('second', BALANCE.boss.windupSpecial * this.L.windup);
        return true;
      }
    }
    return false;
  },

  // Début de l'annonce : les signatures qui tombent du ciel posent tout de suite leurs cibles au sol (W = durée de l'annonce)
  bossTelegraph(e, W) {
    const h = this.hero, P = BALANCE.boss.phase2Dmg * this.bossDmgK(), B = this.bounds();
    const say = i => e.say(e.def.phrases[i % e.def.phrases.length]);
    switch (BOSS_SIG[e.kind]) {
      case 'briques': // pluie de briques : 4 zones marquées, la première tombe à la fin de l'annonce
        say(2);
        [0, -1, 1, 0].forEach((k, i) => this.addDanger({ type: 'brick', team: 'boss', crane: true, x: clamp(h.x + k * rand(90, 130), B.L + 40, B.R - 40), y: clamp(h.y + rand(-30, 30), GROUND_TOP + 15, GROUND_BOTTOM), warn: W + i * 0.25, act: 0.14, rx: 56, ry: 23, dmg: P * 1.2, kd: true, sound: false }));
        break;
      case 'bombe': // cartouche géante : la cible est marquée au sol, puis elle explose
        say(1);
        this.addDanger({ type: 'bomb', team: 'boss', x: clamp(h.x, B.L + 60, B.R - 60), y: h.y, x0: e.x, y0: e.y, warn: W + 0.2, act: 0.15, rx: 95, ry: 36, dmg: P, kd: true, sound: false });
        break;
      case 'rolex': say(3); break;
      case 'seisme': say(1); break;
      case 'argent': say(0); break; // « Rendez-moi mon argent !!!! » (« J'ai un impératif » est dit au départ de la charge)
    }
  },

  // Fin de l'annonce : l'attaque signature part
  bossSignature(e) {
    const h = this.hero, P = BALANCE.boss.phase2Dmg * this.bossDmgK();
    e.windPending = true; // il sera essoufflé dès qu'elle sera terminée
    const charge = (sp, dur) => { e.dashSp = sp; e.lastPuddle = 0; e.setState('special', dur); e.specialFired = false; e.dashHits.clear(); };
    switch (BOSS_SIG[e.kind]) {
      case 'briques': case 'bombe': // (les cibles sont déjà au sol) il fait le geste
        e.setState('special', 0.5); e.specialFired = true; break;
      case 'rolex': { // éclat : aveugle et étourdit le héros s'il est dans le cercle
        this.flashA = 0.55; this.flashCol = '255,250,210';
        this.particles.push({ type: 'ring', x: e.x, y: e.y, z: e.height * 0.6, r: 10, rmax: ROLEX_ZONE.rx, life: 0.35, max: 0.35, col: '#f1c40f' });
        Sfx.special('rolex', Sfx.panX(e.x));
        const dx = (h.x - e.x) / ROLEX_ZONE.rx, dyy = (h.y - e.y) / ROLEX_ZONE.ry;
        if (!h.dead && dx * dx + dyy * dyy < 1) this.applyHit(e, h, this.specialDmg(e, 8), { stun: 0.8, noStagger: true });
        e.setState('attack', 0.3); e.hitDone = true; break;
      }
      case 'imperatif': charge('imperatif', 0.45); break;
      case 'direct': charge('direct', 0.5); break;
      case 'argent': charge('argent', 0.75); break; // la charge laisse des flaques toxiques (updateAction)
      case 'seisme': // coup de pelle sismique : une fissure court au sol (saute ou change de ligne)
        this.projectiles.push({ kind: 'quake', team: 'enemy', owner: e, x: e.x + e.dir * 50, y: e.y, vx: e.dir * 380, dmg: P, life: 2.6, pierce: true, ground: true, knockdown: true, hit: new Set() });
        this.shake = 0.3; this.dust(e.x + e.dir * 50, e.y, 10); Sfx.bigHit(Sfx.panX(e.x));
        e.setState('attack', 0.35); e.hitDone = true; break;
    }
  },

  // Seconde attaque (comportements 2 et 3) — pas d'essoufflement après celle-ci
  bossSecond(e) {
    const h = this.hero, P = BALANCE.boss.phase2Dmg * this.bossDmgK(), B = this.bounds();
    switch (BOSS_SECOND[e.kind]) {
      case 'truelle': case 'cartouches': case 'agneaux': case 'fumee': // les spéciaux « classiques » (doSpecial, game.js)
        e.setState('special', 0.5); e.specialFired = false; e.dashSp = null; break;
      case 'billets': // liasses de billets en éventail
        [-46, 0, 46].forEach(dy => this.projectiles.push({ kind: 'billet', team: 'enemy', owner: e, x: e.x + e.dir * 30, y: clamp(e.y + dy, GROUND_TOP + 15, GROUND_BOTTOM), vx: e.dir * 430, dmg: P * 0.8, life: 2, hit: new Set() }));
        Sfx.special('rolex', Sfx.panX(e.x)); e.setState('attack', 0.3); e.hitDone = true; break;
      case 'aika': // Aïka lâchée sur la ligne du héros
        this.projectiles.push({ kind: 'dog', team: 'enemy', owner: e, x: e.x + e.dir * 40, y: e.y, vx: e.dir * 520, dmg: P, life: 1.8, pierce: true, knockdown: true, hit: new Set() });
        Sfx.special('chien', Sfx.panX(e.x)); e.setState('attack', 0.3); e.hitDone = true; break;
      case 'drones': // frappes de drones sur trois cibles
        [-1, 0, 1].forEach((k, i) => this.addDanger({ type: 'strike', team: 'boss', x: clamp(h.x + k * 120, B.L + 40, B.R - 40), y: clamp(h.y + k * 18, GROUND_TOP + 15, GROUND_BOTTOM), warn: 1.1 + i * 0.15, act: 0.25, rx: 40, ry: 18, dmg: P, kd: true, sound: i === 0 }));
        e.setState('special', 0.5); e.specialFired = true; break;
    }
  },
};
Object.assign(Game, Boss);
