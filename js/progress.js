// ============================================================
//  LES LAÏQUISTES — Progression (v3.7)
//  · Étoiles par monde (0 à 3) : ★ boss vaincu · ★ épreuve de milieu de monde réussie · ★ fini avec plus de la moitié de sa vie
//  · Trophées (24) : affichés dans l'écran 🏅 Trophées, annoncés par un message quand on les gagne
//  · Niveaux des héros (1 à 10) : de l'expérience à chaque partie ; chaque niveau donne +3 % de vie et +2 % de force
//  · Défi du jour : le même pour tout le monde (monde + héros + règle spéciale tirés au sort d'après la date),
//    avec son propre classement partagé ('defi-AAAAMMJJ')
//  Sauvegarde : Save.data.stars / trophies / xp (envoyés en ligne) et Save.data.stats (compteurs, sur l'appareil).
// ============================================================

const TROPHIES = [
  { id: 'boss1', icon: '👑', name: 'Premier boss', desc: 'Battre un boss' },
  { id: 'histoire', icon: '📖', name: 'Laïque confirmé', desc: 'Finir le mode histoire' },
  { id: 'costaud', icon: '💪', name: 'Costaud', desc: 'Finir le mode histoire en « Costaud »' },
  { id: 'ultime', icon: '🔥', name: 'Laïque ultime', desc: 'Finir le mode histoire en « Laïque ultime »' },
  { id: 'combo25', icon: '⚡', name: 'Laïque !', desc: 'Atteindre un combo ×25' },
  { id: 'combo50', icon: '🌪️', name: 'Inarrêtable', desc: 'Atteindre un combo ×50' },
  { id: 'combo100', icon: '💥', name: 'Légendaire', desc: 'Atteindre un combo ×100' },
  { id: 'strike3', icon: '🎳', name: 'Strike !', desc: 'Éliminer 3 ennemis coup sur coup en les lançant' },
  { id: 'lanceur', icon: '🤾', name: 'Lanceur', desc: 'Éliminer 25 ennemis en lançant (au total)' },
  { id: 'danger', icon: '🏗️', name: 'Bien envoyé', desc: 'Éliminer 25 ennemis grâce aux dangers (au total)' },
  { id: 'demenageur', icon: '📦', name: 'Déménageur', desc: 'Casser 30 caisses (au total)' },
  { id: 'carreau', icon: '🎯', name: 'Carreau !', desc: 'Faire un carreau à la pétanque' },
  { id: 'flow', icon: '🎤', name: 'Roi du flow', desc: 'Gagner la battle de rap sans rater une note' },
  { id: 'epreuves', icon: '🏅', name: 'Touche-à-tout', desc: 'Réussir les 7 épreuves de milieu de monde' },
  { id: 'intouchable', icon: '🛡️', name: 'Intouchable', desc: 'Battre un boss sans être touché pendant le combat' },
  { id: 'survie10', icon: '🌊', name: 'Survivant', desc: 'Atteindre la vague 10 en Survie' },
  { id: 'rush', icon: '💀', name: 'Boss Rush', desc: 'Terminer le Boss Rush' },
  { id: 'etoiles', icon: '⭐', name: 'Collectionneur', desc: 'Obtenir les 21 étoiles' },
  { id: 'heros', icon: '👥', name: "Toute l'équipe", desc: 'Gagner un monde avec chacun des 7 héros' },
  { id: 'niveau10', icon: '🎖️', name: 'Vétéran', desc: 'Monter un héros au niveau 10' },
  { id: 'petomane', icon: '💨', name: 'Pétomane', desc: 'Provoquer 50 pets ou rots (au total)' },
  { id: 'defi', icon: '📅', name: 'Défi relevé', desc: 'Gagner un défi du jour' },
  // v3.8
  { id: 'or', icon: '💰', name: "Ruée vers l'or", desc: 'Battre 5 ennemis en or (au total)' },
  { id: 'flash', icon: '⏱️', name: 'Éclair', desc: "Gagner une médaille d'or de vitesse" },
];
const XP = { kill: 10, boss: 150, event: 100, maxLevel: 10, perLevel: 250, hpPerLevel: 0.03, dmgPerLevel: 0.02 };

const Progress = {
  data() {
    const d = Save.data;
    d.stars = d.stars || {}; d.trophies = d.trophies || {}; d.xp = d.xp || {};
    d.stats = Object.assign({ thrown: 0, hazard: 0, crates: 0, gags: 0, golden: 0, powers: 0, events: {}, heroes: {} }, d.stats || {});
    return d;
  },
  has(id) { return !!this.data().trophies[id]; },
  // débloque un trophée (une seule fois) et l'annonce
  unlock(id) {
    const d = this.data(); if (d.trophies[id]) return false;
    const t = TROPHIES.find(x => x.id === id); if (!t) return false;
    d.trophies[id] = 1; Save.save();
    UI.toast(`🏅 Trophée débloqué : ${t.icon} ${t.name}`, 4000);
    Sfx.comboUp(3);
    if (Object.keys(d.trophies).length >= 1) this.checkGlobal();
    return true;
  },
  count(stat, n = 1) {
    const s = this.data().stats; s[stat] = (s[stat] || 0) + n; Save.save(true);
    if (stat === 'thrown' && s.thrown >= 25) this.unlock('lanceur');
    if (stat === 'hazard' && s.hazard >= 25) this.unlock('danger');
    if (stat === 'crates' && s.crates >= 30) this.unlock('demenageur');
    if (stat === 'gags' && s.gags >= 50) this.unlock('petomane');
    if (stat === 'golden' && s.golden >= EXTRA.goldTrophy) this.unlock('or');
  },
  eventDone(worldId) {
    const s = this.data().stats; s.events[worldId] = true; Save.save(true);
    if (WORLDS.every(w => s.events[w.id])) this.unlock('epreuves');
  },
  checkGlobal() {
    const d = this.data();
    if (this.totalStars() >= WORLDS.length * 3) this.unlock('etoiles');
    if (HERO_IDS.every(h => d.stats.heroes[h])) this.unlock('heros');
    if (HERO_IDS.some(h => this.level(h).lv >= XP.maxLevel)) this.unlock('niveau10');
  },

  // ---------- étoiles ----------
  stars(worldId) { return this.data().stars[worldId] || 0; },
  totalStars() { return WORLDS.reduce((n, w) => n + this.stars(w.id), 0); },

  // ---------- niveaux des héros ----------
  // xp nécessaire pour passer du niveau l au niveau l+1 : perLevel × l
  level(hero) {
    let xp = this.data().xp[hero] || 0, lv = 1;
    while (lv < XP.maxLevel && xp >= XP.perLevel * lv) { xp -= XP.perLevel * lv; lv++; }
    return { lv, cur: xp, need: lv >= XP.maxLevel ? 0 : XP.perLevel * lv };
  },
  bonus(hero) { const lv = this.level(hero).lv - 1; return { hp: 1 + lv * XP.hpPerLevel, dmg: 1 + lv * XP.dmgPerLevel }; },
  addXp(hero, n) {
    const before = this.level(hero).lv;
    const d = this.data(); d.xp[hero] = (d.xp[hero] || 0) + Math.round(n); Save.save();
    const after = this.level(hero).lv;
    if (after >= XP.maxLevel) this.unlock('niveau10');
    return after - before;
  },

  // ---------- fin d'un monde ----------
  // Renvoie les lignes HTML à afficher sur l'écran de fin (étoiles, expérience, niveau gagné)
  worldEnd(res, run) {
    const d = this.data(), out = [], hero = run.hero;
    this.lastStars = 0;
    const win = res.result === 'win';
    let xp = res.kills * XP.kill + (win ? XP.boss : 0) + (res.evOk ? XP.event : 0);
    if (win) {
      d.stats.heroes[hero] = true;
      if (['story', 'select', 'daily'].includes(run.mode)) {
        const s = 1 + (res.evOk ? 1 : 0) + (res.hpFrac >= 0.5 ? 1 : 0);
        const prev = d.stars[res.worldId] || 0;
        if (s > prev) d.stars[res.worldId] = s;
        this.lastStars = s; // (l'écran de victoire fait « ding » pour chaque étoile gagnée)
        out.push(`<div class="win-stars">${[0, 1, 2].map(i => `<span class="${i < s ? 'on' : 'off'}" style="animation-delay:${0.5 + i * 0.35}s">${i < s ? '★' : '☆'}</span>`).join('')}</div>` +
          `<div class="win-hint">${res.evOk ? '✓' : '✗'} épreuve · ${res.hpFrac >= 0.5 ? '✓' : '✗'} plus de la moitié de ta vie${s > prev && prev ? ' · nouveau record !' : ''}</div>`);
      }
    }
    const up = this.addXp(hero, xp);
    const L = this.level(hero), name = CHARACTERS[hero].name;
    out.push(`<div class="win-xp">+${xp} XP pour ${name} — niveau ${L.lv}${L.need ? ` <span class="xpbar"><i style="width:${Math.round(L.cur / L.need * 100)}%"></i></span>` : ' (max)'}</div>`);
    if (up > 0) out.push(`<div class="win-lvl">⬆ ${name} passe niveau ${L.lv} ! Vie +${Math.round((L.lv - 1) * XP.hpPerLevel * 100)} %, force +${Math.round((L.lv - 1) * XP.dmgPerLevel * 100)} % (par rapport au niveau 1)</div>`);
    Save.save();
    this.checkGlobal();
    return out.join('');
  },
};

// ============================================================
//  DÉFI DU JOUR
// ============================================================
const DAILY_MODS = [
  { id: 'turbo', name: 'TURBO', desc: 'Tout va 20 % plus vite', speed: 1.2, score: 1.2 },
  { id: 'geants', name: 'ENNEMIS GÉANTS', desc: 'Ennemis plus grands et plus solides — score ×1,3', giant: true, score: 1.3 },
  { id: 'fragile', name: 'FRAGILE', desc: 'La moitié de ta vie — score ×2', heroHp: 0.5, score: 2 },
  { id: 'deluge', name: 'DÉLUGE', desc: 'Dangers deux fois plus fréquents — score ×1,5', hazard: 0.5, score: 1.5 },
  { id: 'combo', name: 'COMBO FOU', desc: 'Chaque coup rapporte 3 fois plus', hitScore: 3 },
  { id: 'caisses', name: 'DÉMÉNAGEMENT', desc: 'Deux fois plus de caisses, toujours un objet à lancer', crates: 2 },
];
const Daily = {
  // date locale du jour : « 20261110 » et « mardi 10 novembre »
  today() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return { key: d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()), label: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) };
  },
  // tirage déterministe : tout le monde a le même défi le même jour
  get() {
    const t = this.today();
    let s = +t.key; const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    rnd(); rnd();
    const world = WORLDS[Math.floor(rnd() * WORLDS.length)].id;
    const heroes = ['christian', 'guilhem', 'fateh', 'faouzi', 'venum'].filter(h => h !== world); // les 5 héros de départ (pas son propre monde)
    const hero = heroes[Math.floor(rnd() * heroes.length)];
    const mod = DAILY_MODS[Math.floor(rnd() * DAILY_MODS.length)];
    return { key: t.key, label: t.label, world, hero, mod, level: 2, board: 'defi-' + t.key };
  },
  best() { const b = Save.data.daily; const t = this.today().key; return b && b.key === t ? b.score : 0; },
  record(score) { const t = this.today().key; if (score > this.best()) { Save.data.daily = { key: t, score }; Save.save(true); return true; } return false; },
};
