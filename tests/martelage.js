// ============================================================
//  TEST DU MARTELAGE — « est-ce que mes coups touchent ? »
//  Le héros ne bouge pas et martèle FRAPPE contre un ennemi de taille humaine (le rappeur) qui s'approche.
//  On compte, sur les 9 premiers coups donnés, combien touchent. Objectif : au moins 8 sur 9, pour chacun des 7 héros.
//  Lancement : node tests/martelage.js
// ============================================================
const { servir, ouvrirJeu, chromium } = require('./outils');
const HEROS = ['christian', 'guilhem', 'fateh', 'faouzi', 'venum', 'senoussi', 'purf'];
const GRAINES = [11, 22, 33, 44, 55]; // 5 parties différentes par héros
const COUPS = 9, OBJECTIF = 8;

// Exécuté dans la page : une partie de martelage, en avance rapide (le jeu est avancé image par image)
function martelerDansLaPage({ hero, coups }) {
  UI.hideScreens && UI.hideScreens();
  Game.start({ worldId: 'guilhem', heroKind: hero, mode: 'select', difficulty: 1.15, level: 1 });
  Game.paused = true; // on avance le jeu nous-mêmes, à 60 images par seconde
  const G = Game, h = G.hero;
  G.waves.forEach(w => { w.started = w.done = true; }); G.props = []; G.hazardT = 1e9; G.trickleT = 1e9;
  h.maxHp = h.hp = 1e6;
  const e = G.spawnEnemy('rappeur', { x: h.x + 420, y: h.y });
  e.maxHp = e.hp = 1e6;
  let donnes = 0, touches = 0, aTouche = false, parti = false;
  const th = e.takeHit.bind(e);
  e.takeHit = (src, dmg, o = {}) => { const ok = th(src, dmg, o); if (ok && src === h && !o.noStagger) aTouche = true; return ok; };
  const rm = G.resolveMelee.bind(G);
  G.resolveMelee = f => { if (f !== h) return rm(f); aTouche = false; rm(f); if (donnes < coups) { donnes++; if (aTouche) touches++; } };
  for (let i = 0; i < 60 * 40 && donnes < coups; i++) {
    G.hazardT = 1e9; G.trickleT = 1e9;
    if (!parti && G.inMeleeZone(h, e)) parti = true;       // le joueur commence à marteler quand l'ennemi est à portée
    if (parti && i % 9 === 0) Input.pressed.attack = true;   // un appui bref toutes les 0,15 s
    G.update(1 / 60);
  }
  G.resolveMelee = rm; G.stop();
  return { donnes, touches };
}

(async () => {
  const { srv, url } = await servir();
  const nav = await chromium.launch();
  let echec = false;
  console.log(`Martelage sans bouger : coups qui touchent sur ${COUPS} (5 parties par héros)`);
  for (const hero of HEROS) {
    const res = [];
    for (const graine of GRAINES) {
      const { page, ctx, erreurs } = await ouvrirJeu(nav, url, { graine });
      const r = await page.evaluate(martelerDansLaPage, { hero, coups: COUPS });
      if (erreurs.length) { console.log('  ERREUR JavaScript :', erreurs[0]); echec = true; }
      res.push(r.donnes === COUPS ? r.touches : -1);
      await ctx.close();
    }
    const pire = Math.min(...res), ok = pire >= OBJECTIF;
    if (!ok) echec = true;
    console.log(`  ${ok ? 'OK    ' : 'ÉCHEC '} ${hero.padEnd(10)} ${res.map(n => n + '/' + COUPS).join('  ')}   (pire : ${pire}/${COUPS})`);
  }
  await nav.close(); srv.close();
  if (echec) { console.log(`\nÉCHEC : il faut au moins ${OBJECTIF} coups sur ${COUPS} pour chaque héros.`); process.exit(1); }
  console.log('\nOK : objectif atteint pour les 7 héros.');
})();
