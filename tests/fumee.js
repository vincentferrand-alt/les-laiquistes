// ============================================================
//  TEST DE FUMÉE — « est-ce que le jeu démarre et tourne sans planter ? »
//  Un petit robot joue chaque monde (avec un héros différent à chaque fois), chaque boss (Boss Rush) et une Survie :
//  pour chaque monde, le début du niveau puis le combat contre son boss, en avance rapide, puis 2 secondes à vitesse réelle.
//  Le test échoue à la moindre erreur JavaScript. Lancement : node tests/fumee.js
// ============================================================
const { servir, ouvrirJeu, chromium } = require('./outils');

const PC = { largeur: 1280, hauteur: 720 }, TEL = { largeur: 844, hauteur: 390, tactile: true }, PETIT = { largeur: 740, hauteur: 360, tactile: true };
const MONDES = [ // [monde, héros qui le joue, écran]
  ['christian', 'guilhem', PC], ['guilhem', 'christian', TEL], ['fateh', 'faouzi', PC], ['faouzi', 'fateh', PETIT],
  ['venum', 'senoussi', PC], ['senoussi', 'purf', TEL], ['purf', 'venum', PC],
];
const PARTIES = [];
// chaque monde : le début du niveau (40 s), puis son boss directement (mode Boss Rush, 25 s, robot plus fort pour voir toutes ses phases)
MONDES.forEach(([m, hero, ecran]) => {
  PARTIES.push({ nom: 'Monde ' + m, mode: 'select', mondes: [m], hero, ecran, secondes: 40 });
  PARTIES.push({ nom: 'Boss Rush ' + m, mode: 'bossrush', mondes: [m], hero, ecran: ecran === PC ? TEL : PC, secondes: 25, force: 3 });
});
PARTIES.push({ nom: 'Survie', mode: 'survival', mondes: ['senoussi'], hero: 'guilhem', ecran: PC, secondes: 60 });

// Exécuté dans la page : lance la partie comme le fait le menu, puis un robot joue en avance rapide
function jouerDansLaPage({ mode, mondes, hero, secondes, force }) {
  const sp = document.getElementById('splash'); if (sp) sp.remove();
  Object.assign(UI.run, { mode, hero, order: mondes, idx: 0, score: 0, heroHp: null, level: 1, cp: null, worldScoreStart: 0 });
  UI.launch();
  Game.paused = true; // on avance le jeu nous-mêmes
  const G = Game;
  if (force) G.hero.dmg *= force;
  let fins = 0, maxPhase = 0;
  for (let i = 0; i < 60 * secondes; i++) {
    if (!G.running) { fins++; break; } // victoire ou défaite : l'écran de fin est affiché
    const h = G.hero;
    if (!h.dead) { h.hp = h.maxHp; }     // le robot ne meurt pas : il doit aller le plus loin possible
    // le robot : va vers l'ennemi le plus proche (sinon vers la droite), martèle, saute et lance son spécial de temps en temps
    const cible = G.enemies.filter(e => !e.dead && e.entering <= 0).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    const k = Input.keys; k.left = k.right = k.up = k.down = false;
    if (cible && Math.abs(cible.x - h.x) < 500) {
      if (cible.x > h.x + 60) k.right = true; else if (cible.x < h.x - 60) k.left = true;
      if (cible.y > h.y + 12) k.down = true; else if (cible.y < h.y - 12) k.up = true;
    } else k.right = true;
    if (i % 8 === 0) Input.pressed.attack = true;
    Input.held.attack = (i % 600) > 520;          // de temps en temps il garde FRAPPE enfoncé (attraper puis lancer)
    if (i % 173 === 0) Input.pressed.jump = true;
    if (i % 211 === 0) Input.pressed.special = true;
    if (i % 1500 === 900) Input.pressed.pote = true;
    G.update(1 / 60);
    if (G.running && i % 12 === 0) G.render();    // on dessine aussi (une image sur douze) : les erreurs de dessin comptent
    maxPhase = Math.max(maxPhase, G.bossPhase || 0);
  }
  const etat = { fini: !G.running, ecran: UI.current, pos: Math.round(100 * G.hero.x / G.levelLen), elimines: G.kills, boss: maxPhase > 0, vague: G.survWave || 0, monde: UI.run.idx + 1 };
  const k = Input.keys; k.left = k.right = k.up = k.down = false; Input.held.attack = false;
  if (G.running) G.paused = false; // puis on laisse tourner la vraie boucle du jeu
  return etat;
}

(async () => {
  const { srv, url } = await servir();
  const nav = await chromium.launch();
  let echec = false;
  for (const p of PARTIES) {
    const { page, ctx, erreurs } = await ouvrirJeu(nav, url, { ...p.ecran, graine: 7 });
    let etat = null;
    try {
      etat = await page.evaluate(jouerDansLaPage, { mode: p.mode, mondes: p.mondes, hero: p.hero, secondes: p.secondes, force: p.force || 0 });
      await page.waitForTimeout(2000); // 2 s à vitesse réelle
    } catch (e) { erreurs.push(String(e)); }
    const ok = erreurs.length === 0;
    if (!ok) echec = true;
    const detail = !etat ? '' : p.mode === 'survival' ? `vague ${etat.vague}` : etat.fini ? `terminé (écran ${etat.ecran})` : `${etat.pos} % du niveau${etat.boss ? ', boss atteint' : ''}`;
    console.log(`${ok ? 'OK    ' : 'ÉCHEC '} ${p.nom.padEnd(22)} héros ${p.hero.padEnd(10)} ${p.ecran.largeur}×${p.ecran.hauteur}   ${etat ? etat.elimines + ' ennemis éliminés, ' + detail : ''}`);
    erreurs.slice(0, 5).forEach(e => console.log('        ' + e.split('\n').slice(0, 3).join('\n        ')));
    await ctx.close();
  }
  await nav.close(); srv.close();
  if (echec) { console.log('\nÉCHEC : au moins une erreur JavaScript.'); process.exit(1); }
  console.log('\nOK : aucune erreur JavaScript.');
})();
