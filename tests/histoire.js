// ============================================================
//  TEST « CONTINUER L'HISTOIRE »
//  Commence une histoire, gagne un monde, ferme et rouvre le jeu, puis vérifie que le titre propose de continuer
//  au bon monde, avec le bon héros, le bon score, la bonne vie et le bon niveau de difficulté.
//  Vérifie aussi qu'une défaite garde l'histoire et que la victoire finale l'efface.
//  Lancement : node tests/histoire.js
// ============================================================
const { servir, ouvrirJeu, chromium } = require('./outils');

(async () => {
  const { srv, url } = await servir();
  const nav = await chromium.launch();
  const { page, erreurs } = await ouvrirJeu(nav, url, { largeur: 844, hauteur: 390, tactile: true, graine: 4 });
  const pb = [];
  const verifier = (ok, quoi) => { console.log(`  ${ok ? 'OK    ' : 'ÉCHEC '} ${quoi}`); if (!ok) pb.push(quoi); };
  const titre = () => page.evaluate(() => ({ continuer: !document.getElementById('b-continue').classList.contains('hidden'), texteContinuer: document.getElementById('b-continue').textContent, texteHistoire: document.getElementById('b-story').textContent }));
  const ouvrir = async () => { await page.waitForFunction(() => typeof UI !== 'undefined' && UI.current === 's-title'); await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp) sp.remove(); }); };
  const finir = async (resultat, score, vie) => { // termine le monde en cours (victoire ou défaite) et attend l'écran de fin
    await page.evaluate(({ resultat, score, vie }) => { Game.score = score; Game.hero.hp = vie; Game.time = 150; Game.ended = true; Game.finish(resultat); }, { resultat, score, vie });
    await page.waitForFunction(r => UI.current === (r === 'win' ? 's-win' : 's-over'), resultat);
  };

  await ouvrir();
  let t = await titre();
  verifier(!t.continuer && t.texteHistoire === 'MODE HISTOIRE', 'sans histoire en cours : pas de bouton « Continuer »');

  // nouvelle histoire avec Guilhem, premier monde gagné
  await page.tap('#b-story'); await page.evaluate(() => { UI.selHero = 'guilhem'; }); await page.tap('#b-char-go'); await page.tap('#b-intro-go');
  const depart = await page.evaluate(() => ({ ordre: UI.run.order.slice(), sauve: StorySave.get() }));
  verifier(depart.sauve && depart.sauve.idx === 0 && depart.sauve.hero === 'guilhem', "l'histoire est enregistrée dès le début du premier monde");
  await finir('win', 5000, 40);
  const apresVictoire = await page.evaluate(() => ({ sauve: StorySave.get(), score: UI.run.score }));
  verifier(apresVictoire.sauve.idx === 1 && apresVictoire.sauve.score === apresVictoire.score, 'monde gagné : la sauvegarde pointe sur le monde 2, avec le score');

  // on ferme et on rouvre le jeu
  await page.reload(); await ouvrir();
  t = await titre();
  verifier(t.continuer && t.texteContinuer === "CONTINUER L'HISTOIRE (monde 2/6)" && t.texteHistoire === 'NOUVELLE HISTOIRE', `après réouverture, le titre propose : « ${t.texteContinuer} » et « ${t.texteHistoire} »`);
  await page.tap('#b-continue');
  const intro = await page.evaluate(() => ({ ecran: UI.current, etape: document.getElementById('intro-step').textContent, monde: UI.run.order[UI.run.idx], ordre: UI.run.order.slice(), hero: UI.run.hero }));
  verifier(intro.ecran === 's-intro' && intro.etape.startsWith('MONDE 2 / 6') && intro.hero === 'guilhem' && intro.ordre.join() === depart.ordre.join() && intro.monde === depart.ordre[1], `« Continuer » ouvre l'intro du bon monde (${intro.etape.trim()})`);
  await page.tap('#b-intro-go');
  const partie = await page.evaluate(() => ({ score: Game.score, vie: Game.hero.hp, max: Game.hero.maxHp, niveau: Game.level, hero: Game.heroKind }));
  verifier(partie.score === apresVictoire.score && partie.vie === apresVictoire.sauve.heroHp && partie.vie === Math.min(partie.max, 40 + partie.max * 0.5) && partie.niveau === 1 && partie.hero === 'guilhem', `la partie reprend avec le score (${partie.score}), la vie (${partie.vie}/${partie.max}) et le niveau de difficulté`);

  // défaite puis retour au menu : l'histoire est gardée
  await finir('lose', 6000, 0); await page.tap('#b-over-menu');
  t = await titre();
  verifier(t.continuer && t.texteContinuer.includes('monde 2/6'), 'après une défaite, on peut toujours continuer au monde 2');

  // dernier monde gagné : l'histoire est terminée, plus rien à continuer
  await page.tap('#b-continue'); await page.evaluate(() => { UI.run.idx = UI.run.order.length - 1; }); await page.tap('#b-intro-go');
  await finir('win', 30000, 50);
  await page.evaluate(() => UI.toTitle());
  t = await titre();
  verifier(!t.continuer && t.texteHistoire === 'MODE HISTOIRE', "histoire terminée : le bouton « Continuer » disparaît");

  erreurs.forEach(e => { console.log('  ERREUR JavaScript : ' + e.split('\n')[0]); pb.push(e); });
  await nav.close(); srv.close();
  if (pb.length) { console.log('\nÉCHEC : « Continuer l\'histoire » ne marche pas comme prévu.'); process.exit(1); }
  console.log('\nOK : « Continuer l\'histoire » fonctionne.');
})();
