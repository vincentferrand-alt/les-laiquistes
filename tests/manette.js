// ============================================================
//  TEST « MANETTE » (v4.6)
//  Une fausse manette (disposition standard, comme une Nimbus ou une manette Xbox) est branchée dans un Chrome
//  de téléphone. On vérifie qu'on peut, uniquement avec elle : passer l'écran d'accueil, naviguer dans les menus,
//  choisir un héros, lancer un monde, bouger, sauter, frapper, mettre en pause et reprendre ;
//  et que les commandes tactiles disparaissent avec la manette puis reviennent quand on touche l'écran.
//  Lancement : node tests/manette.js
// ============================================================
const { servir, chromium } = require('./outils');

(async () => {
  const { srv, url } = await servir();
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  // fausse manette : 17 boutons et 4 axes, réglés depuis le test par window.__pad
  await ctx.addInitScript(() => {
    const b = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
    window.__pad = { id: 'Fausse manette (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', buttons: b(), axes: [0, 0, 0, 0], timestamp: 0 };
    navigator.getGamepads = () => [window.__pad, null, null, null];
  });
  const erreurs = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(String(e && e.stack || e)));
  await p.route('**/*', r => r.request().url().startsWith(url) ? r.continue() : r.abort());
  await p.addInitScript(() => { window.NO_SW = true; });
  await p.goto(url);
  await p.waitForFunction(() => typeof Manette !== 'undefined' && typeof UI !== 'undefined' && UI.current === 's-title');

  const pb = [];
  const verifier = (ok, quoi) => { console.log(`  ${ok ? 'OK    ' : 'ÉCHEC '} ${quoi}`); if (!ok) pb.push(quoi); };
  const attendre = ms => p.waitForTimeout(ms);
  const bouton = (i, on) => p.evaluate(({ i, on }) => { window.__pad.buttons[i] = { pressed: on, value: on ? 1 : 0, touched: on }; }, { i, on });
  const appuyer = async (i, ms = 80) => { await bouton(i, true); await attendre(ms); await bouton(i, false); await attendre(80); };
  const A = 0, B = 1, X = 2, START = 9, HAUT = 12, BAS = 13, GAUCHE = 14, DROITE = 15;
  const etat = () => p.evaluate(() => ({ ecran: UI.current, focus: Manette.focus && (Manette.focus.id || Manette.focus.className), splash: !!document.getElementById('splash'), actif: Manette.actif }));

  // écran d'accueil
  await appuyer(A);
  let e = await etat();
  verifier(!e.splash && e.actif, "A passe l'écran d'accueil et active la manette");

  // titre : un bouton est choisi, et on peut descendre
  await attendre(100); e = await etat();
  verifier(e.ecran === 's-title' && /b-story/.test(e.focus), `au titre, le bouton choisi est « Mode histoire » (${e.focus})`);
  await appuyer(BAS); e = await etat();
  verifier(e.focus && !/b-story/.test(e.focus), `la croix déplace le choix (${e.focus})`);
  await appuyer(HAUT); e = await etat();
  verifier(/b-story/.test(e.focus), 'et le ramène');

  // B = retour : réglages puis retour au titre
  await p.evaluate(() => Manette.montrer(document.getElementById('b-settings')));
  await appuyer(A); e = await etat();
  verifier(e.ecran === 's-settings', 'A ouvre les réglages');
  const avant = await p.evaluate(() => { const r = document.querySelector('[data-set=music]'); Manette.montrer(r); return +r.value; });
  await appuyer(DROITE);
  const apres = await p.evaluate(() => +document.querySelector('[data-set=music]').value);
  verifier(apres === Math.min(100, avant + 5), `droite monte le volume de la musique (${avant} → ${apres})`);
  await appuyer(GAUCHE);
  await appuyer(B); e = await etat();
  verifier(e.ecran === 's-title', 'B revient au titre');

  // histoire : choix du perso, puis lancement
  await p.evaluate(() => Manette.montrer(document.getElementById('b-story')));
  await appuyer(A); e = await etat();
  verifier(e.ecran === 's-chars' && /char-card/.test(e.focus), 'A ouvre le choix du perso, le perso choisi est en surbrillance');
  await appuyer(DROITE);
  const hero = await p.evaluate(() => { Manette.focus.click(); return UI.selHero; });
  await appuyer(A); e = await etat(); // second appui sur le perso choisi : on lance
  verifier(e.ecran === 's-intro', `un second A sur le perso (${hero}) passe à l'intro du monde`);
  await appuyer(START); e = await etat();
  verifier(e.ecran === null && await p.evaluate(() => Game.running), 'Start lance le monde');
  verifier(await p.evaluate(() => !document.getElementById('controls').classList.contains('touch')), 'avec la manette, les commandes tactiles sont cachées');

  // en jeu : bouger, sauter, frapper
  await attendre(1500);
  const x0 = await p.evaluate(() => Game.hero.x);
  await p.evaluate(() => { window.__pad.axes[0] = 1; }); await attendre(600); await p.evaluate(() => { window.__pad.axes[0] = 0; });
  const x1 = await p.evaluate(() => Game.hero.x);
  verifier(x1 > x0 + 30, `le stick fait avancer le héros (${Math.round(x0)} → ${Math.round(x1)})`);
  await bouton(A, true); await attendre(150);
  const saut = await p.evaluate(() => Game.hero.z || Game.hero.jz || Game.hero.state);
  await bouton(A, false); await attendre(800);
  verifier(saut && saut !== 'idle' && saut !== 'walk', `A fait sauter (${saut})`);
  await bouton(X, true); await attendre(60);
  const frappe = await p.evaluate(() => Game.hero.state);
  await bouton(X, false); await attendre(500);
  verifier(frappe === 'attack', `X fait frapper (${frappe})`);

  // pause et reprise
  await appuyer(START); e = await etat();
  verifier(e.ecran === 's-pause', 'Start met en pause');
  await appuyer(START); e = await etat();
  verifier(e.ecran === null && await p.evaluate(() => !Game.paused), 'Start reprend la partie');

  // toucher l'écran : retour des commandes tactiles
  await p.touchscreen.tap(200, 300); await attendre(100);
  verifier(await p.evaluate(() => !Manette.actif && document.getElementById('controls').classList.contains('touch')), "un toucher sur l'écran fait revenir les commandes tactiles");

  verifier(!erreurs.length, `aucune erreur JavaScript${erreurs.length ? ' :\n' + erreurs.join('\n') : ''}`);
  await nav.close(); srv.close();
  console.log(pb.length ? `\n${pb.length} problème(s).` : '\nTout est bon.');
  process.exit(pb.length ? 1 : 0);
})();
