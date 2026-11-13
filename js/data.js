// ============================================================
//  LES LAÏQUISTES — Données : héros/boss, ennemis, mondes
// ============================================================

// ============================================================
//  BALANCE — tous les réglages de difficulté des boss et des dangers, au même endroit.
//  (Les valeurs d'avant sont rappelées en commentaire.) Ajuste ici, sans toucher au reste.
// ============================================================
const BALANCE = {
  boss: {
    hpMul: 1.3,             // PV = PV du perso × hpMul × (difficulté atténuée)   [v3.0 : 1,1]
    hpMulEntourage: 1.0,    // idem quand le boss vient avec un entourage        [v3.0 : 0,85]
    entourageHpMul: 0.7,    // PV des mini-Fateh, d'Aïka, des chats robots      [avant : 1]
    diffScale: 0.4,         // part de la difficulté du niveau appliquée au boss (1 = tout, 0 = rien)
    dmgMul: 0.62,           // dégâts au corps à corps                          [v3.0 : 0,55]
    specialDmgMul: 0.6,     // dégâts des spéciaux                              [avant : 0,55 × diff × 1,15]
    windupAttack: 0.5,        // préparation d'un coup, en s (le « ! » reste plus longtemps) [avant : 0,32]
    windupSpecial: 0.85,    // préparation de la seconde attaque                [avant : 0,55]
    windupShoot: 0.6,       // préparation d'un tir                             [avant : 0,45]
    attackCd: [1.4, 2.4],   // délai entre deux coups, en s                     [avant : 1,3–2,4]
    shootCd: [2.0, 3.1],    // délai entre deux tirs                            [avant : 1,3–2,1]
    comboChance: 0.22,      // chance d'enchaîner un 2e coup                    [avant : 0,35]
    phase2Dmg: 9,           // dégâts de base des attaques signature (briques, cartouche géante, fissure, charge de The Purf…)
    // v3.15 — attaque signature, essoufflement, comportements (voir js/boss.js)
    sig: {
      first: 4,             // première attaque signature après n s de combat
      every: { 1: [8, 10], 2: [6, 7.5], 3: [4.5, 5.5] }, // délai entre deux signatures, selon le comportement (1, 2 ou 3)
      warn: 1.0,            // durée de l'annonce au sol (× le réglage « windup » du niveau de difficulté)…
      minWarn: 0.9,         // … mais jamais moins que ça
      winded: 1.5,          // durée de l'essoufflement après la signature : le boss ne fait rien et encaisse tout
      windedCharge: 2.0,    // … après une charge (Fateh, Venum, The Purf), qui l'emmène loin du héros
      secondCdMul: 1.7,     // délai entre deux secondes attaques (× le délai du spécial du perso)
      reinforce: 2,         // ennemis qui arrivent à chaque changement de comportement (+ le réglage « maxAlive » du niveau)
    },
    lambs: 3,               // agneaux invoqués par Senoussi                    [avant : 4]
    cloudRadius: 115,       // nuage toxique de The Purf : rayon                [avant : 180]
    cloudLife: 3,           // … durée en s                                     [avant : 4]
    cloudTick: 0.7,         // … un tic de dégâts toutes les n s                [avant : 0,35]
    tauntAfterKnockdown: 0.9, // le boss nargue (et souffle) après t'avoir renversé
    rushHeal: 30,           // Boss Rush : vie rendue entre deux boss
    shotDmgMul: 0.65,       // dégâts des tirs du boss (cartouches, parmesan) × dégâts du boss [avant : 0,8]
    // barre de vie en 5 niveaux : le boss dit une phrase au début puis à chaque niveau perdu, et se durcit un peu
    tiers: 5,
    tierSpeedUp: 0.04,      // +4 % de vitesse par niveau perdu
    tierDmgUp: 0.05,        // +5 % de dégâts par niveau perdu
    tierCdMul: 0.92,        // délais entre attaques × 0,92 par niveau perdu
    tierInvul: 0.6,         // courte invulnérabilité quand il perd un niveau (il nargue)
    // ajustements boss par boss (multiplient PV et dégâts ci-dessus) — The Purf était le plus coriace
    perBoss: { purf: { hp: 0.75, dmg: 0.7 }, senoussi: { hp: 0.9, dmg: 1 }, fateh: { hp: 1, dmg: 0.85 } },
  },
  hazards: {
    first: 5,               // premier danger du monde après n s
    every: [6.5, 10],       // puis toutes les n s (× 1,6 pendant le boss)       [v3.0 : 8–12]
    dmg: 10,                // dégâts d'un danger « coup » (briques, voiture, laser…) [v3.0 : 8]
    tickDmg: 3.5,           // dégâts par tic des dangers « zone » (flaques, pluie, arrosage) [v3.0 : 3]
    craneDmg: 14,           // palette de la grue (monde de Christian) : gros impact
  },
  // ennemis courants (tous les mondes)
  enemies: {
    hpMul: 1.15,            // PV × 1,15
    dmgMul: 1.15,           // dégâts × 1,15
    cdMul: 0.85,            // délai entre leurs attaques × 0,85
    maxAlive: 5,            // ennemis courants max en même temps pendant une vague [v3.0 : 4]
  },
  // difficulté du mode histoire : base + n × (numéro du monde)                   [v3.0 : 1 + n × 0,1]
  story: { base: 1.05, perWorld: 0.12 },
  // réglages propres à un monde
  perWorld: {
    christian: { minionHp: 1.45, minionDmg: 1.35, extraPerWave: 2, hazardEvery: 0.7 }, // le chantier était trop facile
    fateh: { hazardEvery: 0.8 },
  },
  diveMul: 1.8,             // dégâts du coup plongeant (× dégâts du héros)
  levels: {},               // les 3 niveaux de difficulté : voir LEVEL_TABLE juste en dessous
  survival: { baseCount: 4, perWave: 1.2, maxCount: 14, diffPerWave: 0.05, bossEvery: 5, bossHpMul: 0.7,
              miniFrom: 3, miniEvery: 5 }, // mini-boss du monde aux vagues 3, 8, 13… (v3.9)
  // mini-boss (v3.9) : PV × difficulté × niveau, dégâts, barre en 3 niveaux
  mini: { hpMul: 1, dmgMul: 0.9, tiers: 3, windupSpecial: 0.8, specialDmg: 0.5, heal: 25, score: 500 },
};

// ============================================================
//  NIVEAUX DE DIFFICULTÉ — LE tableau à régler (v3.13). Une ligne par réglage, une colonne par niveau.
//  Ces valeurs multiplient les réglages généraux de BALANCE ci-dessus. Le niveau « Costaud » = l'équilibrage de la v3.3.
//  Finir le mode histoire dans un niveau débloque le suivant (pour tous les héros) ; ensuite on choisit librement.
// ============================================================
const LEVEL_TABLE = {
  //                Tranquille   Costaud   Laïque ultime
  name:           ['Tranquille', 'Costaud', 'Laïque ultime'],
  // --- ennemis courants ---
  enemyHp:        [0.8,          1,         1.3 ],   // vie
  enemyDmg:       [0.7,          1,         1.3 ],   // dégâts
  enemyCd:        [1.2,          1,         0.85],   // délai entre leurs attaques (plus grand = plus calme)
  maxAlive:       [-1,           0,         1   ],   // ennemis en même temps, en plus ou en moins (base : BALANCE.enemies.maxAlive)
  extraPerWave:   [-1,           0,         1   ],   // ennemis par vague, en plus ou en moins
  // --- boss et mini-boss ---
  bossHp:         [0.8,          1,         1.3 ],   // vie
  bossDmg:        [0.7,          1,         1.3 ],   // dégâts
  bossCd:         [1.15,         1,         0.85],   // délai entre leurs attaques
  windup:         [1.2,          1,         0.85],   // durée de préparation des attaques (le « ! ») — vaut aussi pour les épreuves
  combo:          [0,            0,         0.15],   // chance en plus que le boss enchaîne un 2e coup
  // --- dangers du décor, nourriture, score ---
  hazardEvery:    [1.3,          1,         0.8 ],   // délai entre deux dangers
  hazardDmg:      [0.7,          1,         1.25],   // dégâts des dangers
  food:           [1.35,         1,         0.7 ],   // chance qu'un ennemi lâche de la nourriture
  score:          [1,            1.5,       2   ],   // multiplicateur de score
};
[1, 2, 3].forEach(n => { const L = BALANCE.levels[n] = {}; for (const k in LEVEL_TABLE) L[k] = LEVEL_TABLE[k][n - 1]; });

// ============================================================
//  TUNING — LA fonction de calcul (v3.13). C'est le SEUL endroit où l'on calcule la vie, les dégâts et les délais
//  des adversaires (avant : les formules étaient réparties entre spawnEnemy, makeBoss, makeMini, think…).
//  Tout est un produit de trois choses :
//    1. la fiche de l'adversaire (MINIONS, MINIBOSSES, CHARACTERS) ;
//    2. les réglages généraux (BALANCE) et ceux du monde (BALANCE.perWorld, g.pw) ;
//    3. la difficulté : g.diff = difficulté du monde (elle monte au fil de l'histoire et des vagues de Survie)
//       et g.L = la colonne du niveau choisi dans LEVEL_TABLE.
//  g : la partie en cours (l'objet Game).
// ============================================================
const Tuning = {
  // ennemi courant · o.mustKill : entourage d'un boss · o.hpMul : multiplicateur ponctuel (ennemi en or…)
  enemy(g, kind, o = {}) {
    const m = MINIONS[kind], E = BALANCE.enemies, pw = g.pw || {};
    return {
      hp: m.hp * g.diff * (o.hpMul || 1) * (o.mustKill ? BALANCE.boss.entourageHpMul : E.hpMul * (pw.minionHp || 1)) * g.L.enemyHp,
      dmg: m.dmg * (0.85 + g.diff * 0.15) * (o.mustKill ? 1 : E.dmgMul * (pw.minionDmg || 1)) * g.L.enemyDmg,
    };
  },
  // boss du monde · hpMul : multiplicateur ponctuel (retour du boss en Survie)
  boss(g, hpMul = 1) {
    const w = g.world, c = CHARACTERS[w.boss], B = BALANCE.boss, d = this.bossDiff(g), pb = (B.perBoss && B.perBoss[w.boss]) || {};
    return {
      hp: c.hp * (w.entourage ? B.hpMulEntourage : B.hpMul) * d * hpMul * (pb.hp || 1) * g.L.bossHp,
      dmg: c.dmg * B.dmgMul * d * (pb.dmg || 1) * g.L.bossDmg,
    };
  },
  // mini-boss
  mini(g, kind, hpMul = 1) {
    const def = MINIBOSSES[kind], M = BALANCE.mini;
    return { hp: def.hp * M.hpMul * g.diff * g.L.bossHp * hpMul, dmg: def.dmg * M.dmgMul * (0.85 + g.diff * 0.15) * g.L.bossDmg };
  },
  // les boss ne subissent qu'une partie de la difficulté du monde (BALANCE.boss.diffScale)
  bossDiff(g) { return 1 + (g.diff - 1) * BALANCE.boss.diffScale; },
  bossDmgK(g) { return this.bossDiff(g) * g.L.bossDmg; }, // dégâts des attaques spéciales et de phase 2 des boss
  // dégâts d'une attaque spéciale (base = dégâts de la fiche de l'attaque) ; celles du héros ne changent pas
  specialDmg(g, f, base) {
    if (f.team === 'hero') return base;
    return f.isBoss ? base * BALANCE.boss.specialDmgMul * this.bossDmgK(g) : base * 0.55 * g.diff * 0.8 * g.L.enemyDmg;
  },
  // délai avant la prochaine attaque : [min, max] en secondes
  enemyCd(g, range) { return rand(range[0], range[1]) / Math.sqrt(g.diff) * BALANCE.enemies.cdMul * g.L.enemyCd; },
  bossCd(g, e, range) { return rand(range[0], range[1]) * (e.tierCd || 1) * g.L.bossCd; },
  // nombre d'ennemis en plus dans une vague
  extraPerWave(g) { return Math.max(0, Math.floor((g.diff - 1) * 6) + ((g.pw || {}).extraPerWave || 0) + g.L.extraPerWave); },
};

// ============================================================
//  FEEL — le « ressenti » des coups (v3.11). Tout ce qui fait qu'un coup touche ou part dans le vide.
//  Les distances sont en pixels du jeu, les durées en secondes. (Valeurs de la v3.10 en commentaire.)
// ============================================================
const FEEL = {
  step: 25,          // petit pas en avant du héros à chaque coup de l'enchaînement            [avant : 0]
  gap: 6,            // … mais il s'arrête juste avant de marcher sur l'ennemi visé (écart mini)
  pushSimple: 55,    // élan de recul d'un ennemi sous un coup simple (≈ 13 px parcourus)        [avant : 150, soit ≈ 36 px]
  pushFlyer: 110,    // idem pour les ennemis volants (≈ 26 px)                                  [avant : 200]
  heroDepth: 8,      // tolérance en profondeur ajoutée aux coups du héros (aide à la visée)     [avant : 0]
  aimX: 60,          // le héros se recale vers un ennemi situé jusqu'à n px au-delà de sa portée
  aimDepth: 70,      // … et jusqu'à n px plus haut ou plus bas que lui
  aimY: 16,          // recalage maximal en profondeur pendant l'élan d'un coup
  downEnemy: 1.0,    // temps au sol d'un ennemi renversé. Nouveau : on peut le frapper pendant qu'il est à terre.
  downHero: 0.6,     // temps au sol du héros renversé                                           [avant : 1,0]
  getUpInvulEnemy: 0, // invulnérabilité d'un ennemi qui se relève                                [avant : 0,3]
  pushDown: 30,      // élan d'un ennemi frappé au sol par un coup simple
};

const VIEW_H = 540;          // hauteur logique du jeu
const GROUND_TOP = 330;      // haut de la zone de déplacement (profondeur)
const GROUND_BOTTOM = 520;   // bas de la zone de déplacement
const GRAVITY = 1600;

// ---------- Les 7 laïquistes (héros jouables ET boss) ----------
// bh : hauteur dessinée. v4.0 : c'est la hauteur H du nouveau dessin (RIGS, persos.js), environ 23 % de plus qu'avant
// (avant : 72, 112, 108, 92, 96, 96, 96). bw (largeur de frappe) et range (portée) n'ont pas changé.
const CHARACTERS = {
  christian: {
    id: 'christian', name: 'Christian', title: 'Le Maçon',
    color: '#2c3e50', light: '#95a5a6', bw: 60, bh: 119,
    hp: 130, speed: 215, dmg: 12, range: 70,
    weapon: 'Truelle', weaponDesc: 'Courte mais lourde, casque de chantier vissé sur la tête',
    special: 'truelle', specialName: 'Coup de truelle', specialDesc: 'Onde de choc au sol qui renverse tout le monde',
    specialCd: 7,
    phrases: ["Qui peut l'en blâmer ?", 'Mon oreille !!!!', "J'ai tout vu, j'ai tout fait !",
      "J'ai vu le président, moi", "J'ai tenu ma grosse voiture à une seule main", "Il y avait de la buée à l'extérieur",
      "Je vous promets, c'était bien la porte du garage"],
  },
  guilhem: {
    id: 'guilhem', name: 'Guilhem', title: 'Le Bling',
    color: '#1e272e', light: '#485460', bw: 36, bh: 137,
    hp: 95, speed: 300, dmg: 10, range: 74,
    weapon: 'Montre en or', weaponDesc: 'Une Rolex dorée en guise de poing, grande allonge',
    special: 'rolex', specialName: 'Éclat de Rolex', specialDesc: 'Aveugle et paralyse les ennemis proches',
    specialCd: 8,
    phrases: ['Popeck', "Je n'ai pas les moyens d'être pauvre", 'Elle a de belles dents ! Héhé',
      'Et si je me prenais une autre montre de luxe ?', "De Fursac, c'est nul. C'est mieux Hugo Boss", "Regardez, il n'arrive pas",
      'Je veux encore des actions Air Liquide'],
  },
  fateh: {
    id: 'fateh', name: 'Fateh', title: 'Le Maître-chien',
    color: '#8e44ad', light: '#9b59b6', bw: 42, bh: 132,
    hp: 105, speed: 260, dmg: 10, range: 70,
    weapon: 'Ses poings + Aïka', weaponDesc: 'Aïka, sa chienne, mord à chaque coup',
    special: 'chien', specialName: 'Lâcher d\'Aïka', specialDesc: 'Aïka fonce et mord tout sur sa ligne',
    specialCd: 6,
    phrases: ['Je t\'ordonne de partir', "J'ai un impératif", 'Aïka, j\'ai de la confiture !',
      'Je vais me baigner dans mon pédiluve', 'Allô Cécile ? Super, les enfants ont bien fait caca', 'Aïka, viens nettoyer papa',
      "L'an prochain, promis, j'essaie de le faire en plus de 2 heures"],
  },
  faouzi: {
    id: 'faouzi', name: 'Faouzi', title: 'Le Geek',
    color: '#a68a5b', light: '#d1b98a', bw: 38, bh: 119, // plus mince (était 48)
    hp: 95, speed: 260, dmg: 10, range: 66,
    weapon: 'Cartouches de jeux', weaponDesc: 'Gilet de papy, cheveux noirs, cartouches à lancer',
    special: 'cartouches', specialName: 'Salve de cartouches', specialDesc: 'Lance trois cartouches de jeux vidéo en éventail',
    specialCd: 5,
    phrases: ['Ça ne coûte rien de dépenser', 'Je suis Short Stack', 'Regarde, un conifère !',
      "Je l'achèterai pas, promis. Quoique peut-être", 'Arrêtez de parler de caca', 'Si ça continue, je rentre seul en avion',
      'On avait dit balade'],
  },
  venum: {
    id: 'venum', name: 'Venum', title: 'Le Boxeur',
    color: '#2d3436', light: '#636e72', bw: 46, bh: 122,
    hp: 115, speed: 255, dmg: 11, range: 64,
    weapon: 'Gants de boxe', weaponDesc: 'Enchaînements rapides, frappe sèche',
    special: 'direct', specialName: 'Direct foudroyant', specialDesc: 'Fonce gants en avant, invincible',
    specialCd: 6,
    phrases: ["Je vais demander à l'IA de t'éliminer", 'À mort les voitures essence', 'Maybe Later',
      "Comme vous voulez, ça m'est égal", "C'est confidentiel, mais je vais vous le dire", 'Désolé, pas là, je suis en TT'],
  },
  senoussi: {
    id: 'senoussi', name: 'Senoussi', title: 'Le Berger',
    color: '#d35400', light: '#e67e22', bw: 60, bh: 133,
    hp: 140, speed: 225, dmg: 14, range: 100,
    weapon: 'Grande pelle', weaponDesc: 'Énorme allonge, balaie large',
    special: 'moutons', specialName: 'Ruée de moutons', specialDesc: 'Trois moutons chargent sur toute la profondeur',
    specialCd: 7, locked: true, unlockText: 'Termine le mode histoire',
    phrases: ['Alors là !', 'Approche que je te montre mon outil', 'Que le Chapiste soit avec moi !',
      "C'est un updater, cela, mec", 'Qui veut croiser le fer avec moi ?'],
  },
  purf: {
    id: 'purf', name: 'The Purf', title: 'Le Toxique',
    color: '#c0392b', light: '#e74c3c', bw: 66, bh: 130,
    hp: 150, speed: 225, dmg: 14, range: 70,
    weapon: 'Poudre toxique', weaponDesc: 'Une poudre verte tombe de son visage en continu',
    special: 'fumee', specialName: 'Nuage toxique', specialDesc: 'Un nuage vert qui ronge les ennemis',
    specialCd: 8, locked: true, unlockText: 'Termine l\'histoire avec Senoussi',
    phrases: ['Rendez-moi mon argent !!!!', 'Attaque de parmesan',
      'Est-ce que je peux payer avec des pièces de centimes ?', "Je viens que si c'est gratuit et qu'on me ramène chez moi",
      "Je me suis fabriqué une boîte à chaussures"],
  },
};
const ROSTER = ['christian', 'guilhem', 'fateh', 'faouzi', 'venum', 'senoussi', 'purf'];

// ---------- Mini-boss (v3.9) : un par monde, à la fin du 1er tiers (et de temps en temps en Survie) ----------
// Plus simples qu'un boss : barre de vie en 3 niveaux, un coup et UNE attaque spéciale, pas de phase 2.
// special : baguettes | manettes | dring | sms | trounoir | belier | parmesan (voir js/tiers.js)
// entrance : solex | voiturette | marche | chute | etoile | charge | fumee
// (Les phrases sont lues par tools/make-voices.py, comme celles des héros : garder ce format.)
const MINIBOSSES = {
  marcel: {
    id: 'marcel', name: 'Marcel', title: 'Le vrai Français', world: 'christian',
    bw: 40, bh: 86, hp: 125, speed: 150, dmg: 9, range: 86, special: 'baguettes', specialCd: 5.5, entrance: 'solex',
    phrases: ['Vive la France !'],
  },
  clement: {
    id: 'clement', name: 'Clément', title: "L'ado", world: 'guilhem',
    bw: 34, bh: 80, hp: 115, speed: 215, dmg: 8, range: 60, special: 'manettes', specialCd: 5, entrance: 'voiturette',
    phrases: ['Rachète-moi une PS5 !'],
  },
  cecile: {
    id: 'cecile', name: 'Cécile', title: 'Au téléphone', world: 'fateh',
    bw: 34, bh: 82, hp: 115, speed: 205, dmg: 8, range: 62, special: 'dring', specialCd: 5, entrance: 'marche',
    phrases: ['Fateh, rappelle-moi tout de suite !'],
  },
  leblond: {
    id: 'leblond', name: 'Le Blond', title: "L'astronome", world: 'faouzi',
    bw: 38, bh: 92, hp: 120, speed: 190, dmg: 9, range: 92, special: 'trounoir', specialCd: 6.5, entrance: 'etoile',
    phrases: ['Laissez Faouzi tranquille, son trou noir m\'appartient !'],
  },
  clapet: {
    id: 'clapet', name: 'Clapet 3000', title: 'Le téléphone à clapet', world: 'venum',
    bw: 54, bh: 100, hp: 130, speed: 170, dmg: 9, range: 64, special: 'sms', specialCd: 5, entrance: 'chute',
    phrases: ['Vive Samsung et les téléphones à clapet !'],
  },
  moutong: {
    id: 'moutong', name: 'Mouton géant', title: 'Le bélier', world: 'senoussi',
    bw: 110, bh: 96, hp: 150, speed: 170, dmg: 10, range: 56, special: 'belier', specialCd: 5.5, entrance: 'charge',
    phrases: ['Bêêêêê ! Qu\'est-ce que tu veux ?'],
  },
  minipurf: {
    id: 'minipurf', name: 'Mini Purf', title: 'Le petit toxique', world: 'purf',
    bw: 48, bh: 70, hp: 120, speed: 200, dmg: 9, range: 56, special: 'parmesan', specialCd: 5, entrance: 'fumee',
    phrases: ['Vous aimez le parmesan ? Vous allez en avoir !'],
  },
};

// ---------- Ennemis courants ----------
// beh : melee | charger (fonce en ligne droite) | ranged | flyer | hopper | roller
// bh : hauteur dessinée. v4.1 : pour les ennemis à forme humaine, c'est la hauteur H du nouveau dessin (RIGS, persos.js),
// environ 23 % de plus qu'avant (avant : ouvrier 62, rappeur 98, skateur 96, papy 86, runner 96, indien 96, zombie 98, Mini-Fateh 64, costaud 124).
// bw (largeur de frappe), range (portée), vie, vitesse et dégâts n'ont pas changé.
const MINIONS = {
  // bh = hauteur du dessin : montée avec les nouveaux dessins (v4.1 : humains, persos.js ; v4.2 : les autres, betes.js, +23 %).
  // bw, range, vie, vitesse et dégâts n'ont pas changé.
  ouvrier:  { name: 'Ouvrier', bw: 34, bh: 93, hp: 28, speed: 175, dmg: 6, range: 46, beh: 'melee' },
  goeland:  { name: 'Goéland', bw: 46, bh: 42, hp: 16, speed: 230, dmg: 6, range: 30, beh: 'flyer' },
  rappeur:  { name: 'Rappeur', bw: 46, bh: 127, hp: 42, speed: 180, dmg: 8, range: 78, beh: 'melee' },
  skateur:  { name: 'Skateur', bw: 40, bh: 128, hp: 30, speed: 200, dmg: 8, range: 60, beh: 'charger', dash: 560 },
  berger:   { name: 'Berger australien', bw: 54, bh: 74, hp: 24, speed: 300, dmg: 6, range: 40, beh: 'melee' },
  papy:     { name: 'Papy', bw: 40, bh: 110, hp: 34, speed: 110, dmg: 9, range: 80, beh: 'melee' },
  runner:   { name: 'Runner', bw: 36, bh: 117, hp: 26, speed: 220, dmg: 7, range: 50, beh: 'charger', dash: 640 },
  chevalier8: { name: 'Chevalier 8-bit', bw: 44, bh: 102, hp: 40, speed: 160, dmg: 8, range: 72, beh: 'melee' },
  slime:    { name: 'Slime', bw: 46, bh: 44, hp: 24, speed: 150, dmg: 7, range: 30, beh: 'hopper' },
  alien8:   { name: 'Alien 8-bit', bw: 52, bh: 66, hp: 26, speed: 150, dmg: 7, range: 30, beh: 'ranged', shot: 'bolt' },
  chauve8:  { name: 'Chauve-souris 8-bit', bw: 48, bh: 48, hp: 18, speed: 170, dmg: 6, range: 30, beh: 'flyer' },
  chat:     { name: 'Chat', bw: 44, bh: 47, hp: 22, speed: 320, dmg: 6, range: 38, beh: 'melee' },
  robot:    { name: 'Robot', bw: 54, bh: 123, hp: 48, speed: 140, dmg: 8, range: 30, beh: 'ranged', shot: 'laser' },
  indien:   { name: 'Indien', bw: 44, bh: 120, hp: 38, speed: 190, dmg: 8, range: 76, beh: 'melee' },
  mouton:   { name: 'Mouton', bw: 50, bh: 54, hp: 18, speed: 200, dmg: 6, range: 40, beh: 'charger', dash: 480 },
  oursin:   { name: 'Oursin', bw: 44, bh: 47, hp: 30, speed: 70, dmg: 8, range: 30, beh: 'roller' },
  zombie:   { name: 'Zombie', bw: 46, bh: 124, hp: 46, speed: 100, dmg: 10, range: 64, beh: 'melee' },
  // entourages de boss
  enfant:   { name: 'Mini-Fateh', bw: 30, bh: 98, hp: 40, speed: 230, dmg: 6, range: 46, beh: 'melee', look: 'fateh' },
  aika:     { name: 'Aïka', bw: 56, bh: 76, hp: 55, speed: 310, dmg: 7, range: 42, beh: 'melee' },
  robochat: { name: 'Chat robot', bw: 48, bh: 52, hp: 55, speed: 300, dmg: 7, range: 42, beh: 'melee' },
  agneau:   { name: 'Agneau', bw: 38, bh: 42, hp: 8, speed: 220, dmg: 4, range: 30, beh: 'charger', dash: 420 },
  // v3.10 : un ennemi spécial par monde (il arrive au 3e tiers et pendant le boss ; dessins dans js/rage.js)
  marteau:  { name: 'Marteau-piqueur', bw: 40, bh: 96, hp: 34, speed: 150, dmg: 8, range: 30, beh: 'hopper', quake: true },
  ballon:   { name: 'Ballon de basket', bw: 42, bh: 52, hp: 26, speed: 200, dmg: 8, range: 30, beh: 'roller' },
  basket:   { name: 'Basket de course', bw: 58, bh: 57, hp: 26, speed: 240, dmg: 7, range: 40, beh: 'charger', dash: 720 },
  glitch:   { name: 'Glitch', bw: 46, bh: 72, hp: 30, speed: 170, dmg: 8, range: 52, beh: 'melee', blink: true },
  tableur:  { name: 'Tableur', bw: 54, bh: 71, hp: 30, speed: 140, dmg: 7, range: 30, beh: 'ranged', shot: 'cellule' },
  chevre:   { name: 'Chèvre', bw: 54, bh: 64, hp: 22, speed: 220, dmg: 7, range: 40, beh: 'charger', dash: 560 },
  fut:      { name: 'Fût radioactif', bw: 42, bh: 76, hp: 26, speed: 125, dmg: 13, range: 60, beh: 'melee', boom: true },
  // le gros costaud : impossible à attraper, ne recule pas sous les coups simples (il faut le renverser)
  costaud:  { name: 'Costaud', bw: 66, bh: 153, hp: 110, speed: 120, dmg: 13, range: 74, beh: 'melee', heavy: true },
};
const ROBOT_NAMES = ['CLAUDE', 'OPENAI', 'GEMINI', 'ANTHROPIC'];

// ---------- Les 7 mondes (un par laïquiste, qui en est le boss) ----------
const WORLDS = [
  { id: 'christian', boss: 'christian', special: 'marteau', mini: 'marcel', name: 'MONDE DE CHRISTIAN', sub: 'Le chantier miniature', small: true,
    minions: [['ouvrier', 5], ['goeland', 3]], food: 'sandwich', entrance: 'van' },
  { id: 'guilhem', boss: 'guilhem', special: 'ballon', mini: 'clement', name: 'MONDE DE GUILHEM', sub: 'Rap City', minions: [['rappeur', 5], ['skateur', 3]],
    food: 'burger', entrance: 'sport' },
  { id: 'fateh', boss: 'fateh', special: 'basket', mini: 'cecile', name: 'MONDE DE FATEH', sub: 'Allauch', minions: [['berger', 4], ['papy', 3], ['runner', 3]],
    food: 'navette', entrance: 'family', entourage: ['enfant', 'enfant', 'aika'] },
  { id: 'faouzi', boss: 'faouzi', special: 'glitch', mini: 'leblond', name: 'MONDE DE FAOUZI', sub: 'Pixel World', pixel: true,
    minions: [['chevalier8', 4], ['slime', 3], ['alien8', 2], ['chauve8', 2]], food: 'coeur8', entrance: 'pixel' },
  { id: 'venum', boss: 'venum', special: 'tableur', mini: 'clapet', name: 'MONDE DE VENUM', sub: 'IA City', minions: [['chat', 4], ['robot', 4]],
    food: 'batterie', entrance: 'suv', entourage: ['robochat', 'robochat'] },
  { id: 'senoussi', boss: 'senoussi', special: 'chevre', mini: 'moutong', name: 'MONDE DE SENOUSSI', sub: 'Le grand désert', minions: [['indien', 5], ['mouton', 4]],
    food: 'dattes', entrance: 'herd' },
  { id: 'purf', boss: 'purf', special: 'fut', mini: 'minipurf', name: 'MONDE DE THE PURF', sub: 'La zone polluée', minions: [['zombie', 5], ['oursin', 3]],
    food: 'conserve', entrance: 'smoke' },
];
const worldById = id => WORLDS.find(w => w.id === id);

const HIT_WORDS = ['PAF!', 'BIM!', 'POW!', 'BAM!', 'TCHAK!', 'BONK!'];

// Sauvegarde locale
const Save = {
  key: 'laiquistes_save_v2',
  data: null,
  load() {
    try { this.data = JSON.parse(localStorage.getItem(this.key)) || null; } catch (e) { this.data = null; }
    if (!this.data) this.data = { unlocked: {}, cleared: {}, name: '', muted: false, storyWins: 0 };
    this.data.unlocked = this.data.unlocked || {};
    this.data.cleared = this.data.cleared || {};
    // histoires terminées, comptées par héros : { christian: 1, senoussi: 2, ... }
    this.data.storyWinsBy = this.data.storyWinsBy || {};
    this.data.survival = this.data.survival || {};  // meilleure vague atteinte en Survie, par monde
    this.data.rushBest = this.data.rushBest || 0;    // meilleur score en Boss Rush
    // niveau de difficulté le plus haut débloqué (1 à 3) et niveau choisi. Qui avait déjà fini l'histoire avant la v3.4 a le niveau 2.
    if (!this.data.diffMax) this.data.diffMax = (this.data.storyWins || 0) > 0 ? 2 : 1;
    this.data.diff = Math.max(1, Math.min(this.data.diffMax, this.data.diff || 1));
    // réglages : volumes séparés (0..1), voix des boss, vibrations
    // music / sfx / amb = position du curseur (échelle progressive, voir volGain dans audio.js) ; ctlSize = taille des commandes tactiles
    const old = this.data.settings;
    this.data.settings = Object.assign({ music: 0.5, sfx: 0.5, amb: 0.5, voice: 1, voiceOn: true, vibrate: true, ctlSize: 1, sv: 2 }, old || {});
    const st = this.data.settings;
    // Migration v3.3 : avant, les curseurs étaient linéaires. Ceux qui n'y avaient jamais touché (20 % / 20 %)
    // passent aux nouveaux niveaux, plus bas ; les autres gardent le même volume réel, converti sur la nouvelle échelle.
    if (old && !old.sv) {
      const lim = v => Math.max(0, Math.min(1, v)); // (clamp n'est pas encore défini ici)
      const toPos = v => v <= 0 ? 0 : Math.round(lim(1 + 20 * Math.log10(v) / 36) * 20) / 20;
      if (old.music === 0.2 && old.sfx === 0.2) { st.music = 0.5; st.sfx = 0.5; st.amb = 0.5; }
      else { st.music = toPos(old.music); st.sfx = toPos(old.sfx); st.amb = lim(st.sfx - 0.05); }
      st.sv = 2;
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {}
    }
    return this.data;
  },
  // sauvegarde locale (toujours) + envoi groupé vers Firestore si la sauvegarde en ligne est active
  save(localOnly) {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {}
    if (!localOnly && typeof Cloud !== 'undefined') Cloud.schedulePush();
  },
  isUnlocked(id) { return !CHARACTERS[id].locked || !!this.data.unlocked[id]; },
  // Règles de déblocage (appelées à la fin du mode histoire). Renvoie les noms débloqués.
  //  - Senoussi : terminer le mode histoire avec n'importe quel héros
  //  - The Purf : terminer le mode histoire EN JOUANT Senoussi
  storyCompleted(heroId, level = 1) {
    const d = this.data, out = [];
    d.storyWins = (d.storyWins || 0) + 1;
    d.storyWinsBy[heroId] = (d.storyWinsBy[heroId] || 0) + 1;
    if (!d.unlocked.senoussi) { d.unlocked.senoussi = true; out.push('Senoussi'); }
    if (heroId === 'senoussi' && !d.unlocked.purf) { d.unlocked.purf = true; out.push('The Purf'); }
    // niveau de difficulté suivant (valable pour tous les héros)
    if (level >= d.diffMax && d.diffMax < 3) { d.diffMax++; d.diff = d.diffMax; out.push('Le niveau de difficulté ' + d.diffMax + ' (« ' + BALANCE.levels[d.diffMax].name + ' »)'); }
    this.save();
    return out;
  },
};
Save.load();

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickWeighted = list => { const tot = list.reduce((s, x) => s + x[1], 0); let r = Math.random() * tot; for (const [k, w] of list) { if ((r -= w) <= 0) return k; } return list[0][0]; };
