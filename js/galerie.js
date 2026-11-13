// ============================================================
//  GALERIE v4.5 — les laïquistes, les mini-boss et le bestiaire, animés, avec leurs sons et leurs phrases
//  Une fiche se dévoile quand on a rencontré le personnage en jeu (avant : sa silhouette noire) ;
//  une phrase s'ajoute quand on l'a entendue en jeu.
//  Ce qu'on a vu et entendu est gardé SUR L'APPAREIL (comme « Continuer l'histoire »), rien n'est envoyé en ligne.
//  Branchements : Fighter (entities.js) appelle Galerie.voir et Galerie.entendre ; UI.openGalerie ouvre l'écran.
// ============================================================
const Galerie = {
  key: 'laiquistes_galerie_v1',
  d: null,           // { vus: { kind: 1 }, dits: { 'kind|phrase': 1 } }
  onglet: 'heros', choix: null, pose: 'idle', t0: 0, bulle: null, iPhrase: 0,

  // ---------- ce qu'on a vu et entendu ----------
  data() {
    if (this.d) return this.d;
    try { this.d = JSON.parse(localStorage.getItem(this.key)); } catch (e) { this.d = null; }
    if (!this.d || !this.d.vus || !this.d.dits) { this.d = { vus: {}, dits: {} }; this.rattrapage(); }
    return this.d;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.d)); } catch (e) {} },
  // Première ouverture : on dévoile ce que le joueur a forcément déjà croisé (ses héros, et tout le monde des mondes où il a une étoile)
  rattrapage() {
    const v = this.d.vus;
    ROSTER.forEach(k => { if (Save.isUnlocked(k)) v[k] = 1; });
    WORLDS.forEach(w => { if (Progress.stars(w.id) > 0) this.duMonde(w).forEach(k => { v[k] = 1; }); });
    this.save();
  },
  duMonde(w) { return [w.boss, w.mini, w.special, 'costaud'].concat(w.minions.map(m => m[0]), w.entourage || []); },
  voir(kind) { const d = this.data(); if (!d.vus[kind] && this.fiche(kind)) { d.vus[kind] = 1; this.save(); } },
  entendre(kind, text) {
    const f = this.fiche(kind), d = this.data();
    if (f && f.phrases && f.phrases.includes(text) && !d.dits[kind + '|' + text]) { d.dits[kind + '|' + text] = 1; this.save(); }
  },
  vu(kind) { return !!this.data().vus[kind]; },
  entendues(kind) { const f = this.fiche(kind); return (f.phrases || []).filter(p => this.data().dits[kind + '|' + p]); },

  // ---------- les fiches ----------
  fiche(kind) { return CHARACTERS[kind] || MINIBOSSES[kind] || MINIONS[kind] || null; },
  liste(onglet) { return onglet === 'heros' ? ROSTER : onglet === 'minis' ? Object.keys(MINIBOSSES) : Object.keys(MINIONS); },
  monde(kind) { // où on le rencontre
    if (kind === 'costaud') return 'Tous les mondes';
    const w = WORLDS.find(x => x.boss === kind || x.mini === kind || x.special === kind || x.minions.some(m => m[0] === kind) || (x.entourage || []).includes(kind));
    return w ? 'Monde de ' + CHARACTERS[w.boss].name : '';
  },
  GENRE: { melee: 'Corps à corps', ranged: 'Tireur', charger: 'Fonceur', flyer: 'Volant', hopper: 'Sauteur', roller: 'Rouleur' },
  POSES: [['idle', 'Attente'], ['walk', 'Marche'], ['attack', 'Attaque'], ['special', 'Spécial'], ['hurt', 'Touché'], ['down', 'À terre'], ['taunt', 'Nargue']],
  posesDe(kind) { return this.POSES.filter(([p]) => (p !== 'special' && p !== 'taunt') || !MINIONS[kind]); }, // (spécial et raillerie : héros et mini-boss)

  // ---------- dessin ----------
  // Dessine un personnage (héros, mini-boss ou ennemi) avec le rendu du jeu ; o = { scale, t, pose, poseT, walk, dir }
  sprite(ctx, kind, o) {
    if (CHARACTERS[kind]) menuSprite(ctx, kind, Object.assign({ companion: true }, o));
    else if (MINIBOSSES[kind]) miniSprite(ctx, kind, o);
    else {
      const d = MINIONS[kind], sc = o.scale || 1, rig = persoRig(kind), h = d.bh * sc, r = (rig ? rig.H * 0.95 + 75 : d.range + d.bw * 0.6 + 90) * sc;
      drawSprite(ctx, { x: -r, y: -h - 130 * sc, w: r * 2, h: h + 165 * sc }, c => drawMinion(c, kind, Object.assign({ label: 'CLAUDE', roll: (o.t || 0) * 3, air: false }, o)),
        { outline: (rig ? P2.contour : 3.8) * Math.sqrt(sc), shade: { top: -h } });
    }
  },
  // Silhouette noire d'un personnage pas encore rencontré (le canevas ne doit rien contenir d'autre)
  noircir(ctx, W, H) { ctx.save(); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#4a3f7a'; ctx.fillRect(0, 0, W, H); ctx.restore(); },
  // Vignette (dessinée une fois) : le personnage en petit, ou sa silhouette
  vignette(cv, kind) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, f = this.fiche(kind), vol = !!f.fly || f.beh === 'flyer';
    ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    ctx.save(); ctx.translate(W / 2 - (CHARACTERS[kind] ? 0 : 4), H - 9 - (vol ? 14 : 0));
    this.sprite(ctx, kind, { dir: 1, scale: Math.min(0.62, (H - 20) / Math.max(40, f.bh * (kind === 'moutong' ? 1.5 : 1.12))), t: 1.3, pose: 'idle', walk: 0, companion: false });
    ctx.restore();
    if (!this.vu(kind)) this.noircir(ctx, W, H);
  },
  // Grand dessin animé de la fiche choisie
  scene(ctx, t, W, H) {
    const kind = this.choix, f = this.fiche(kind); if (!f) return;
    const vu = this.vu(kind), el = t - this.t0, vol = f.beh === 'flyer';
    let pose = vu ? this.pose : 'idle', pt = 0;
    if (pose === 'attack' || pose === 'special') { const c = el % 1.5; if (c < 0.4) { pose = 'windup'; pt = c / 0.4; } else if (c < 1.05) pt = (c - 0.4) / 0.65; else pose = 'idle'; } // élan → coup → retour, en boucle
    else if (pose === 'down') pt = Math.min(1, (el % 2.4) / 0.5);
    const sc = Math.min(1.25, (H - 78 - ((persoRig(kind) || {}).dessus || 0) * 0.7) / Math.max(48, f.bh * (kind === 'moutong' ? 1.3 : 1))); // (place pour la pelle de Senoussi)
    if (vu) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(W / 2, H - 20, 46, 9, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.save(); ctx.translate(W / 2 - (pose === 'attack' || pose === 'special' ? 26 : 0), H - 22 - (vol ? 46 : 0));
    this.sprite(ctx, kind, { dir: 1, scale: sc, t, pose, poseT: pt, walk: t * 9, combo: this.pose === 'attack' ? Math.floor(el / 1.5) % 3 : 0 });
    ctx.restore();
    if (!vu) { this.noircir(ctx, W, H); ctx.font = '900 54px "Arial Black", Arial'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText('?', W / 2, H / 2 + 14); }
  },

  // ---------- écran ----------
  ouvrir() {
    const sc = document.getElementById('s-galerie');
    if (!sc.dataset.pret) { // premiers branchements
      sc.dataset.pret = '1';
      sc.querySelectorAll('.gal-tabs button').forEach(b => { b.onclick = () => { Sfx.click(); this.onglet = b.dataset.tab; this.choix = null; this.remplir(); }; });
      UI.liveCanvas(document.getElementById('gal-cv'), (ctx, t, W, H) => this.scene(ctx, t, W, H));
      document.getElementById('gal-cv').onclick = () => this.suivante();
    }
    this.remplir();
    UI.show('s-galerie');
  },
  remplir() {
    const ids = this.liste(this.onglet), grid = document.getElementById('gal-grid');
    document.querySelectorAll('#s-galerie .gal-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === this.onglet));
    const tous = ROSTER.concat(Object.keys(MINIBOSSES), Object.keys(MINIONS));
    document.getElementById('gal-sum').textContent = `${tous.filter(k => this.vu(k)).length} / ${tous.length} personnages rencontrés`;
    grid.className = 'n' + (ids.length > 8 ? 'beaucoup' : 'peu');
    grid.innerHTML = '';
    ids.forEach(k => {
      const b = document.createElement('button'); b.className = 'gal-tile' + (this.vu(k) ? '' : ' cache'); b.dataset.kind = k;
      b.setAttribute('aria-label', this.vu(k) ? this.fiche(k).name : 'Pas encore rencontré');
      b.innerHTML = '<canvas width="88" height="88"></canvas>';
      b.onclick = () => { Sfx.click(); this.choisir(k); };
      grid.appendChild(b); this.vignette(b.firstChild, k);
    });
    this.choisir(this.choix && ids.includes(this.choix) ? this.choix : (ids.find(k => this.vu(k)) || ids[0]));
  },
  choisir(kind) {
    this.choix = kind; this.pose = 'idle'; this.t0 = performance.now() / 1000; this.bulle = null; this.iPhrase = 0;
    const f = this.fiche(kind), vu = this.vu(kind), $$ = id => document.getElementById(id);
    document.querySelectorAll('#gal-grid .gal-tile').forEach(b => b.classList.toggle('sel', b.dataset.kind === kind));
    $$('gal-name').textContent = vu ? f.name : '???';
    const genre = CHARACTERS[kind] ? f.title + ' · héros et boss' : MINIBOSSES[kind] ? f.title + ' · mini-boss' : this.GENRE[f.beh] || '';
    $$('gal-info').textContent = vu ? `${genre} · ${this.monde(kind)}` : 'Pas encore rencontré : croise-le en jeu pour le dévoiler';
    $$('gal-bulle').textContent = '';
    // mouvement : un seul bouton, qui passe au suivant (toucher le dessin fait pareil)
    const poses = $$('gal-poses'); poses.innerHTML = '';
    if (vu) { const b = document.createElement('button'); b.className = 'chip on'; b.id = 'gal-pose'; b.onclick = () => { Sfx.click(); this.suivante(); }; poses.appendChild(b); this.marquer('idle'); }
    // sons
    const sons = $$('gal-sons'); sons.innerHTML = '';
    const bouton = (txt, fn) => { const b = document.createElement('button'); b.className = 'chip son'; b.textContent = txt; b.onclick = () => { Sfx.init(); fn(b); }; sons.appendChild(b); return b; };
    if (!vu) return;
    if (f.phrases) {
      const dites = this.entendues(kind), n = f.phrases.length;
      const b = bouton(`🔊 Phrase (${dites.length}/${n})`, () => {
        if (!dites.length) { $$('gal-bulle').textContent = 'Aucune phrase entendue pour l\'instant : écoute-le en jeu'; return; }
        const p = dites[this.iPhrase++ % dites.length]; $$('gal-bulle').textContent = '« ' + p + ' »'; Voice.speak(p, kind, 2);
      });
      if (!dites.length) b.classList.add('vide');
    }
    bouton('💥 Attaque', () => { Sfx.attack(kind, 0, 0); setTimeout(() => Sfx.hit(0, kind), 140); this.marquer('attack'); });
    if (CHARACTERS[kind]) {
      bouton('⭐ ' + f.specialName, () => { Sfx.special(f.special, 0); this.marquer('special'); });
      bouton('🎺 Arrivée', () => Sfx.bossArrival());
    }
  },
  // affiche la pose en cours sur le bouton ; suivante() passe au mouvement suivant
  marquer(pose) { this.pose = pose; this.t0 = performance.now() / 1000 - (pose === 'attack' || pose === 'special' ? 0.3 : 0); const b = document.getElementById('gal-pose'), P = this.posesDe(this.choix), i = P.findIndex(([p]) => p === pose); if (b) b.textContent = `🎬 ${P[i][1]} (${i + 1}/${P.length}) ▸`; },
  suivante() { if (!this.vu(this.choix)) return; const P = this.posesDe(this.choix), i = P.findIndex(([p]) => p === this.pose); this.marquer(P[(i + 1) % P.length][0]); },
};
