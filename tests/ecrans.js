// ============================================================
//  TEST DES ÉCRANS — « est-ce que tous les menus tiennent sur un téléphone ? »
//  Ouvre chaque écran en 844×390 et 740×360 (téléphone en paysage) et vérifie :
//   - qu'il n'y a pas besoin de faire défiler l'écran (sauf les listes prévues pour : trophées, classements) ;
//   - que chaque bouton est entièrement visible ;
//   - que la version et « Mettre à jour » (en bas à gauche) ne passent sur aucun bouton.
//  Lancement : node tests/ecrans.js          (ajoute un dossier pour garder des captures : node tests/ecrans.js captures)
// ============================================================
const fs = require('fs');
const { servir, ouvrirJeu, chromium } = require('./outils');
const TAILLES = [{ largeur: 844, hauteur: 390, tactile: true }, { largeur: 740, hauteur: 360, tactile: true }];
const DOSSIER = process.argv[2];

// Chaque écran : son nom et comment l'ouvrir (exécuté dans la page)
const ECRANS = {
  titre: () => { UI.toTitle(); },
  'autres-modes': () => { UI.toTitle(); UI.show('s-modes'); },
  personnages: () => { UI.run.mode = 'story'; UI.openChars(); },
  mondes: () => { UI.run.mode = 'select'; UI.run.hero = 'christian'; UI.openWorlds(); },
  intro: () => { Object.assign(UI.run, { mode: 'story', hero: 'christian', order: ['guilhem', 'fateh', 'faouzi', 'venum', 'senoussi', 'purf'], idx: 2, score: 0 }); UI.openIntro(); },
  pause: () => { Object.assign(UI.run, { mode: 'select', hero: 'christian', order: ['guilhem'], idx: 0, score: 0, heroHp: null, level: 1 }); UI.launch(); UI.pause(); },
  reglages: () => { UI.toTitle(); UI.openSettings('s-title'); },
  victoire: () => { Object.assign(UI.run, { mode: 'select', hero: 'christian', order: ['guilhem'], idx: 0, score: 0, heroHp: null, level: 1 }); UI.launch(); Game.kills = 31; Game.score = 12345; Game.time = 150; Game.finish('win'); },
  'victoire-histoire': () => { Object.assign(UI.run, { mode: 'story', hero: 'christian', order: ['guilhem', 'fateh'], idx: 1, score: 5000, heroHp: null, level: 1 }); UI.launch(); Game.score = 45678; Game.time = 150; Game.finish('win'); },
  'game-over': () => { Object.assign(UI.run, { mode: 'select', hero: 'christian', order: ['guilhem'], idx: 0, score: 0, heroHp: null, level: 1 }); UI.launch(); Game.score = 2345; Game.finish('lose'); },
  defi: () => { UI.toTitle(); return UI.openDaily(); },
  trophees: () => { UI.toTitle(); UI.openTrophies(); },
  classement: () => { UI.toTitle(); return UI.openScores('histoire'); },
};

// Exécuté dans la page : mesure l'écran affiché
function mesurer() {
  const s = document.querySelector('.screen.active'); if (!s) return { pb: ['aucun écran affiché'] };
  const W = innerWidth, H = innerHeight, pb = [];
  if (s.scrollHeight > s.clientHeight + 1) pb.push(`il faut faire défiler (contenu ${s.scrollHeight} px pour ${s.clientHeight} px)`);
  const visible = el => { const r = el.getBoundingClientRect(), c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const ver = document.getElementById('ver-box').getBoundingClientRect();
  s.querySelectorAll('button, select, input').forEach(b => {
    if (!visible(b) || b.closest('#troph-grid, #score-list, #daily-list')) return;
    const r = b.getBoundingClientRect(), nom = (b.textContent || b.id || b.tagName).trim().slice(0, 28);
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) pb.push(`« ${nom} » sort de l'écran`);
    else if (r.left < ver.right && r.right > ver.left && r.top < ver.bottom && r.bottom > ver.top) pb.push(`« ${nom} » est sous la version / « Mettre à jour »`);
  });
  return { pb };
}

(async () => {
  const { srv, url } = await servir();
  const nav = await chromium.launch();
  if (DOSSIER) fs.mkdirSync(DOSSIER, { recursive: true });
  let echec = false;
  for (const t of TAILLES) {
    console.log(`\nÉcran ${t.largeur}×${t.hauteur}`);
    for (const [nom, ouvrir] of Object.entries(ECRANS)) {
      const { page, ctx, erreurs } = await ouvrirJeu(nav, url, { ...t, graine: 5 });
      await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp) sp.remove(); });
      await page.evaluate(ouvrir);
      await page.waitForTimeout(nom.startsWith('victoire') ? 3500 : nom === 'game-over' ? 1200 : 500); // (la victoire fait défiler son décompte de points)
      const { pb } = await page.evaluate(mesurer);
      erreurs.forEach(e => pb.push('erreur JavaScript : ' + e.split('\n')[0]));
      if (DOSSIER) await page.screenshot({ path: `${DOSSIER}/${t.largeur}x${t.hauteur}-${nom}.png` });
      if (pb.length) echec = true;
      console.log(`  ${pb.length ? 'ÉCHEC ' : 'OK    '} ${nom}${pb.length ? ' : ' + pb.join(' ; ') : ''}`);
      await ctx.close();
    }
  }
  await nav.close(); srv.close();
  if (echec) { console.log('\nÉCHEC : au moins un écran ne tient pas sur un téléphone.'); process.exit(1); }
  console.log('\nOK : tous les écrans tiennent sur un téléphone.');
})();
