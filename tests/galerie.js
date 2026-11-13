// ============================================================
//  TEST DE LA GALERIE — « est-ce que les fiches se dévoilent, et est-ce que tout s'anime sans erreur ? »
//   1. sauvegarde neuve : seuls les 5 héros de départ sont dévoilés ;
//   2. après quelques secondes de jeu dans un monde, ses ennemis sont dévoilés, et pas ceux des autres mondes ;
//   3. une phrase dite par un boss s'ajoute à sa fiche ; c'est gardé après avoir fermé et rouvert le jeu ;
//   4. chaque fiche (43), dans chaque mouvement, avec chaque bouton de son, s'affiche sans erreur JavaScript.
//  Lancement : node tests/galerie.js
// ============================================================
const { servir, ouvrirJeu, chromium } = require('./outils');
(async () => {
  const { srv, url } = await servir(), nav = await chromium.launch(), pb = [];
  const { page, ctx, erreurs } = await ouvrirJeu(nav, url, { largeur: 844, hauteur: 390, tactile: true, graine: 7 });
  await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp) sp.remove(); });
  const vus = () => page.evaluate(() => Object.keys(Galerie.data().vus).sort().join(','));
  // 1
  const depart = await vus();
  if (depart !== 'christian,faouzi,fateh,guilhem,venum') pb.push('sauvegarde neuve : dévoilés = ' + depart);
  // 2 et 3
  await page.evaluate(() => {
    Object.assign(UI.run, { mode: 'select', hero: 'christian', order: ['venum'], idx: 0, score: 0, heroHp: null, level: 1, cp: null, worldScoreStart: 0 });
    UI.launch(); Game.paused = true;
    for (let i = 0; i < 60 * 25; i++) { Game.hero.hp = Game.hero.maxHp; Game.update(1 / 60); }
    Game.stop();
    const f = new Fighter('venum', 'enemy', 0, 0, {}); f.isBoss = true; f.say(CHARACTERS.venum.phrases[1], 2, 2);
  });
  const apres = await page.evaluate(() => ({ chat: Galerie.vu('chat'), robot: Galerie.vu('robot'), mouton: Galerie.vu('mouton'), dites: Galerie.entendues('venum').length }));
  if (!apres.chat && !apres.robot) pb.push('après 25 s dans le monde de Venum, ni le chat ni le robot ne sont dévoilés');
  if (apres.mouton) pb.push('le mouton est dévoilé sans avoir été rencontré');
  if (apres.dites !== 1) pb.push('phrase entendue non enregistrée (' + apres.dites + ')');
  await page.reload(); await page.waitForFunction(() => typeof Galerie !== 'undefined' && typeof UI !== 'undefined' && !!Game.canvas);
  const garde = await page.evaluate(() => Galerie.vu('venum') && Galerie.entendues('venum').length === 1);
  if (!garde) pb.push('la galerie n\'est pas gardée après avoir rouvert le jeu');
  // 4
  await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp) sp.remove(); });
  const n = await page.evaluate(async () => {
    const tous = ROSTER.concat(Object.keys(MINIBOSSES), Object.keys(MINIONS)); tous.forEach(k => Galerie.voir(k));
    UI.toTitle(); document.getElementById('b-galerie').click();
    const attendre = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    let n = 0;
    for (const onglet of ['heros', 'minis', 'betes']) {
      document.querySelector(`#s-galerie .gal-tabs [data-tab="${onglet}"]`).click();
      for (const tuile of [...document.querySelectorAll('#gal-grid .gal-tile')]) {
        tuile.click(); n++;
        for (let i = 0; i < Galerie.posesDe(Galerie.choix).length; i++) { document.getElementById('gal-pose').click(); await attendre(); }
        document.querySelectorAll('#gal-sons button').forEach(b => b.click()); await attendre();
      }
    }
    return n;
  });
  if (n !== 43) pb.push('nombre de fiches : ' + n + ' au lieu de 43');
  erreurs.forEach(e => pb.push('erreur JavaScript : ' + e.split('\n')[0]));
  await ctx.close(); await nav.close(); srv.close();
  if (pb.length) { console.log('ÉCHEC :\n - ' + pb.join('\n - ')); process.exit(1); }
  console.log(`OK : la galerie dévoile, garde et anime ses ${n} fiches.`);
})();
