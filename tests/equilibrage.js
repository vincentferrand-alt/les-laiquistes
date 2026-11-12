// ============================================================
//  TABLEAU DES CHIFFRES DE L'ÉQUILIBRAGE (outil, ne fait pas partie du jeu)
//  Fait apparaître chaque adversaire dans le vrai jeu et note sa vie et ses dégâts, pour les 3 niveaux de difficulté.
//  Sert à vérifier qu'un changement de code ne modifie pas les valeurs : on compare le fichier avant et après.
//  Lancement : node tests/equilibrage.js            → affiche un résumé
//              node tests/equilibrage.js fichier    → écrit toutes les valeurs dans « fichier » (JSON)
// ============================================================
const fs = require('fs');
const { servir, ouvrirJeu, chromium } = require('./outils');

function releverDansLaPage() {
  const out = {};
  const r1 = x => Math.round(x * 1000) / 1000;
  const CAS = [['choix du niveau', 'select', 1.15, 0], ['histoire monde 1', 'story', BALANCE.story.base, 0], ['histoire monde 6', 'story', BALANCE.story.base + 5 * BALANCE.story.perWorld, 5], ['survie vague 10', 'survival', 1, 0]];
  for (const level of [1, 2, 3]) for (const [nomCas, mode, difficulty, idx] of CAS) for (const w of WORLDS) {
    UI.run.idx = idx; UI.run.order = [w.id];
    Game.start({ worldId: w.id, heroKind: w.id === 'christian' ? 'guilhem' : 'christian', mode, difficulty, level });
    Game.paused = true;
    if (mode === 'survival') Game.diff = 1 + 9 * BALANCE.survival.diffPerWave;
    const k = `${BALANCE.levels[level].name} | ${nomCas} | ${w.id}`, o = out[k] = {};
    const note = (nom, e) => { o[nom] = { vie: e.maxHp, degats: r1(e.dmg) }; };
    const kinds = w.minions.map(m => m[0]).concat([w.special, 'costaud']);
    kinds.forEach(kind => note(kind, Game.spawnEnemy(kind, { x: 500, y: 400 })));
    (w.entourage || []).forEach(kind => note('entourage ' + kind, Game.spawnEnemy(kind, { x: 500, y: 400, mustKill: true })));
    note('en or', Game.spawnEnemy(w.minions[0][0], { hpMul: EXTRA.goldHpMul, x: 500, y: 400 }));
    note('mini-boss', Game.makeMini(w.mini, 500, 400));
    const b = Game.makeBoss(500, 400, mode === 'survival' ? BALANCE.survival.bossHpMul : 1); note('boss', b);
    o.divers = { specialBoss24: r1(Game.specialDmg(b, 24)), specialEnnemi18: r1(Game.specialDmg(Game.enemies[0], 18)), degatsBossK: r1(Game.bossDmgK()), vieHeros: Game.hero.maxHp, degatsHeros: r1(Game.hero.dmg),
      ennemisParVague: Game.waves.map(x => x.n).join('/'), score: Game.L.score, nourriture: Game.L.food, dangers: r1(BALANCE.hazards.dmg * Game.L.hazardDmg), delaiEnnemi: r1(BALANCE.enemies.cdMul * Game.L.enemyCd / Math.sqrt(Game.diff)), delaiBoss: Game.L.bossCd, preparation: Game.L.windup, maxEnMemeTemps: BALANCE.enemies.maxAlive + Game.L.maxAlive };
    Game.stop();
  }
  return out;
}

(async () => {
  const { srv, url } = await servir();
  const nav = await chromium.launch();
  const { page, erreurs } = await ouvrirJeu(nav, url, { graine: 1 });
  await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp) sp.remove(); try { localStorage.clear(); } catch (e) {} Save.load(); });
  const out = await page.evaluate(releverDansLaPage);
  await nav.close(); srv.close();
  if (erreurs.length) { console.log('ERREUR JavaScript :', erreurs[0]); process.exit(1); }
  if (process.argv[2]) { fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log(`${Object.keys(out).length} situations écrites dans ${process.argv[2]}`); return; }
  // résumé : le monde de Guilhem en « choix du niveau », pour les 3 niveaux
  for (const k of Object.keys(out).filter(k => k.includes('choix du niveau | guilhem'))) {
    console.log('\n' + k);
    Object.entries(out[k]).forEach(([nom, v]) => console.log('  ' + nom.padEnd(18) + (v.vie !== undefined ? `vie ${String(v.vie).padStart(4)}   dégâts ${v.degats}` : JSON.stringify(v))));
  }
})();
