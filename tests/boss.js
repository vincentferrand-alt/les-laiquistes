// ============================================================
//  TEST DES BOSS — « est-ce que chaque boss suit bien ses règles ? »
//  Pour chacun des 7 boss, un robot le combat (en Boss Rush, sans pouvoir mourir). Il esquive en changeant de ligne
//  et ne frappe le boss que lorsqu'il est essoufflé. On vérifie :
//   - qu'il lance son attaque signature, annoncée au moins 0,9 s ;
//   - qu'il est essoufflé après chaque signature terminée ;
//   - qu'il passe par ses 3 comportements, et que les renforts n'arrivent qu'à ces changements ;
//   - qu'aucun danger du décor n'apparaît pendant le combat.
//  Lancement : node tests/boss.js
// ============================================================
const { servir, ouvrirJeu, chromium } = require('./outils');
const MONDES = [['christian', 'guilhem'], ['guilhem', 'christian'], ['fateh', 'faouzi'], ['faouzi', 'fateh'], ['venum', 'senoussi'], ['senoussi', 'purf'], ['purf', 'venum']];

function combattreDansLaPage({ monde, hero, niveau }) {
  const sp = document.getElementById('splash'); if (sp) sp.remove();
  Object.assign(UI.run, { mode: 'bossrush', hero, order: [monde], idx: 0, score: 0, heroHp: null, level: niveau, cp: null });
  UI.launch(); Game.paused = true;
  const G = Game, r = { signatures: 0, annonceMin: 99, essouffle: 0, comportements: [1], renforts: 0, renfortsHorsChangement: 0, dangersDecor: 0, secondes: 0, battu: false, seconde: 0 };
  let dernierChangement = -99;
  const sw = Fighter.prototype.startWindup;
  Fighter.prototype.startWindup = function (a, dur) { if (this.isBoss && a === 'sig') { r.signatures++; r.annonceMin = Math.min(r.annonceMin, dur); } if (this.isBoss && a === 'second') r.seconde++; return sw.call(this, a, dur); };
  const bw = G.bossWinded; G.bossWinded = function (e) { r.essouffle++; return bw.call(this, e); };
  const su = G.bossStageUp; G.bossStageUp = function (e, st) { r.comportements.push(st); dernierChangement = G.t; return su.call(this, e, st); };
  const se = G.spawnEnemy; G.spawnEnemy = function (kind, o = {}) { if (G.bossPhase === 2 && !o.mustKill && kind !== 'agneau') { r.renforts++; if (G.t - dernierChangement > 3) r.renfortsHorsChangement++; } return se.call(this, kind, o); };
  const ad = G.addDanger; G.addDanger = function (d) { if (G.bossPhase >= 1 && d.team !== 'boss' && d.team !== 'hero') r.dangersDecor++; return ad.call(this, d); };
  for (let i = 0; i < 60 * 150 && G.running && G.bossPhase < 3; i++) {
    const h = G.hero, b = G.boss; if (!h.dead) h.hp = h.maxHp;
    const k = Input.keys; k.left = k.right = k.up = k.down = false;
    // le robot ne frappe le boss que lorsqu'il est essoufflé ; sinon il reste à distance, sur une autre ligne (il esquive)
    const autres = G.enemies.filter(e => !e.dead && !e.isBoss && e.entering <= 0).sort((x, y) => Math.abs(x.x - h.x) - Math.abs(y.x - h.x));
    if (b && !b.dead && b.entering <= 0) {
      const vul = b.winded > 0.15, cible = vul ? b : autres[0];
      let tx, ty;
      if (cible) { tx = cible.x - Math.sign(cible.x - h.x || 1) * 70; ty = cible.y; }
      else { tx = b.x + (h.x < b.x ? -300 : 300); ty = b.y > 425 ? b.y - 95 : b.y + 95; }
      if (tx > h.x + 20) k.right = true; else if (tx < h.x - 20) k.left = true;
      if (ty > h.y + 10) k.down = true; else if (ty < h.y - 10) k.up = true;
      if (cible && Math.abs(cible.y - h.y) < 30 && Math.abs(cible.x - h.x) < 130) { k.left = k.right = false; if (cible.x !== h.x) h.dir = Math.sign(cible.x - h.x); if (i % 8 === 0) Input.pressed.attack = true; } // à portée : il frappe
    } else if (autres[0]) { // boss battu : il reste son entourage
      const c = autres[0], tx = c.x - Math.sign(c.x - h.x || 1) * 70;
      if (tx > h.x + 20) k.right = true; else if (tx < h.x - 20) k.left = true;
      if (c.y > h.y + 10) k.down = true; else if (c.y < h.y - 10) k.up = true;
      if (i % 8 === 0) Input.pressed.attack = true;
    }
    G.update(1 / 60); if (i % 20 === 0) G.render();
  }
  r.secondes = Math.round(G.t); r.battu = G.bossPhase >= 3;
  Fighter.prototype.startWindup = sw; G.bossWinded = bw; G.bossStageUp = su; G.spawnEnemy = se; G.addDanger = ad; G.stop();
  return r;
}

(async () => {
  const { srv, url } = await servir();
  const nav = await chromium.launch();
  let echec = false;
  for (const [monde, hero] of MONDES) {
    const { page, ctx, erreurs } = await ouvrirJeu(nav, url, { graine: 21 });
    let r, pb = [];
    try { r = await page.evaluate(combattreDansLaPage, { monde, hero, niveau: 3 }); } catch (e) { erreurs.push(String(e)); } // « Laïque ultime » : l'annonce la plus courte
    if (r) {
      if (r.signatures < 1) pb.push(`seulement ${r.signatures} attaque(s) signature`);
      if (r.annonceMin < 0.9 - 1e-9) pb.push(`annonce trop courte (${r.annonceMin.toFixed(2)} s)`);
      if (r.essouffle < r.signatures - 1) pb.push(`essoufflé ${r.essouffle} fois pour ${r.signatures} signatures`);
      if (r.battu && r.comportements.join() !== '1,2,3') pb.push(`comportements : ${r.comportements.join(' → ')}`);
      if (!r.battu) pb.push('boss pas battu en 150 s');
      if (r.renfortsHorsChangement) pb.push(`${r.renfortsHorsChangement} renfort(s) en dehors d'un changement de comportement`);
      if (r.dangersDecor) pb.push(`${r.dangersDecor} danger(s) du décor pendant le combat`);
    }
    erreurs.forEach(e => pb.push('erreur JavaScript : ' + e.split('\n')[0]));
    if (pb.length) echec = true;
    console.log(`${pb.length ? 'ÉCHEC ' : 'OK    '} ${monde.padEnd(10)}` + (r ? ` ${r.signatures} signatures (annonce ≥ ${r.annonceMin.toFixed(2)} s), essoufflé ${r.essouffle} fois, ${r.seconde} secondes attaques, comportements ${r.comportements.join('→')}, ${r.renforts} renforts, battu en ${r.secondes} s` : '') + (pb.length ? '\n        ' + pb.join(' ; ') : ''));
    await ctx.close();
  }
  await nav.close(); srv.close();
  if (echec) { console.log('\nÉCHEC : au moins un boss ne suit pas ses règles.'); process.exit(1); }
  console.log('\nOK : les 7 boss suivent leurs règles.');
})();
