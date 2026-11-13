// ============================================================
//  BÊTES ET MACHINES v4.2 — nouveau dessin des ennemis qui n'ont pas forme humaine
//  Animaux (goéland, berger australien, chat, mouton, oursin, chèvre), robots (robot, chat robot),
//  monde pixelisé de Faouzi (chevalier, alien, chauve-souris, slime, Glitch), ennemis spéciaux
//  (marteau-piqueur, ballon, basket de course, tableur, fût radioactif) et entourages (Aïka, agneau).
//
//  Même style que les personnages de persos.js : gros contour (posé par drawSprite, draw.js), trait
//  intérieur épais, gros yeux expressifs, et une vraie pose pour chaque moment : attente, marche, élan,
//  attaque, touché, à terre. Chaque bête est dessinée à son ancienne taille puis agrandie de 23 %
//  (BETE.gros) ; les ennemis du monde pixelisé restent en gros carrés, sur une grille plus fine.
//
//  Comme dans draw.js : bête tournée vers la DROITE, origine (0,0) au sol, entre les pattes.
//  Ce fichier se charge après persos.js (il réutilise INK, rrect, circle, ell, poly, p2Limb, P2).
//  drawMinion (draw.js) passe par ici quand beteDessin(type) existe ; drawDog et drawSheep aussi
//  (Aïka en laisse, moutons lancés par Senoussi, mouton doré de l'épreuve, Mouton géant).
// ============================================================

const BETE = { gros: 1.23, ol: 2.4, pix: 6 }; // gros : agrandissement · ol : trait intérieur · pix : côté d'un carré du monde pixelisé
function beteDessin(type) { return BETES[type] || null; }

// humeur du visage selon la pose
const bMood = pose => pose === 'down' ? 'ko' : pose === 'hurt' ? 'hurt' : (pose === 'attack' || pose === 'windup' || pose === 'special') ? 'angry' : 'calm';

// Œil de dessin animé, qui regarde devant. mood : calm (cligne de temps en temps) · angry (plissé, sourcil froncé) ·
// hurt (plissé « > ») · ko (croix). k.cote : -1 pour l'œil de gauche d'un visage de face (sourcils en V) ·
// k.blanc / k.iris : couleurs · k.fente : pupille de chat
function bOeil(ctx, x, y, r, mood, t = 0, k = {}) {
  ctx.save(); ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (mood === 'ko' || mood === 'hurt') {
    ctx.lineWidth = Math.max(1.8, r * 0.55); ctx.beginPath();
    if (mood === 'ko') { ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); }
    else { ctx.moveTo(x - r * 0.9, y - r * 0.85); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x - r * 0.9, y + r * 0.85); }
    ctx.stroke(); ctx.restore(); return;
  }
  if (mood === 'calm' && (t % 3.1) < 0.11) { ctx.lineWidth = Math.max(1.6, r * 0.5); ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke(); ctx.restore(); return; }
  ctx.lineWidth = Math.max(1.2, r * 0.34);
  ell(ctx, x, y, r, mood === 'angry' ? r * 0.92 : r * 1.15, k.blanc || '#fff');
  if (k.fente) ell(ctx, x + r * 0.2, y, r * 0.3, r * 0.82, INK, false);
  else { circle(ctx, x + r * 0.3, y + r * 0.08, r * 0.56, k.iris || INK, false); circle(ctx, x + r * 0.08, y - r * 0.3, r * 0.2, '#fff', false); }
  if (mood === 'angry') { // sourcil froncé, qui descend vers le milieu du visage
    const c = k.cote || 1;
    ctx.lineWidth = Math.max(2, r * 0.6); ctx.beginPath(); ctx.moveTo(x - c * r * 1.35, y - r * 1.75); ctx.lineTo(x + c * r * 1.15, y - r * 0.7); ctx.stroke();
  }
  ctx.restore();
}

// Patte en deux segments, de la hanche (x, y) vers le sol : a = balancement (radians), bout = couleur du pied
function bPatte(ctx, x, y, len, a, w, col, bout) {
  const f = { x: x + Math.sin(a) * len, y: y + Math.cos(a) * len }, g = { x: x + Math.sin(a * 0.35) * len * 0.5 - 1.2, y: y + len * 0.5 };
  const ol = P2.ol; P2.ol = BETE.ol * 0.8; p2Limb(ctx, { x, y }, g, f, w, w * 0.88, col, col); P2.ol = ol;
  ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol * 0.8;
  if (bout) ell(ctx, f.x + w * 0.22, f.y - w * 0.16, w * 0.72, w * 0.46, bout);
}
// Trait épais cerné de noir le long d'un chemin (queue du chat, cornes, antennes) : tracer(ctx) pose le chemin
function bTrait(ctx, tracer, w, col) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = w + BETE.ol * 1.7; ctx.beginPath(); tracer(ctx); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); tracer(ctx); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
}
// Texte toujours lisible, même quand la bête regarde à gauche
function bTexte(ctx, txt, x, y, dir, font, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.font = font; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(txt, 0, 0); ctx.restore();
}
// balancement des pattes : au rythme des pas quand on connaît la pose, sinon en courant sans arrêt (chien ou mouton lancé)
const bPas = (q, t, v) => !q ? Math.sin(t * v) : q.pose === 'walk' ? Math.sin(q.walk * 1.3) * 0.75 : q.pose === 'attack' ? 0.6 : 0;

// ---------- Chiens : Aïka (fauve, collier rouge) et le berger australien (bleu merle) ----------
// q (facultatif) = { pose, walk } : sans lui le chien court (Aïka lâchée par Fateh)
function drawChien(ctx, x, y, t, lunge = 0, open = false, pal = DOG_PAL.aika, s = 1, q = null) {
  const pose = q ? q.pose : 'walk', mood = open && !q ? 'angry' : bMood(pose), run = bPas(q, t, 14);
  const elan = pose === 'windup', wag = Math.sin(t * (mood === 'calm' ? 9 : 17));
  ctx.save(); ctx.translate(x + lunge, y); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
  if (elan) ctx.transform(1, 0.1, 0, 1, 0, 0); // ramassé avant de mordre : l'avant s'abaisse
  // queue en panache, qui remue
  ctx.save(); ctx.translate(-23, -40); ctx.rotate(-0.75 + wag * 0.3 + (mood === 'hurt' ? 1.2 : 0));
  ctx.beginPath(); ctx.moveTo(3, 5); ctx.quadraticCurveTo(-13, 11, -28, -2); ctx.quadraticCurveTo(-17, -15, 3, -6); ctx.closePath(); ctx.fillStyle = pal.body; ctx.fill(); ctx.stroke();
  ell(ctx, -21, -3, 6.5, 4.6, pal.light, false);
  ctx.restore();
  bPatte(ctx, -14, -29, 28, run * 0.55, 7, pal.dark, pal.dark); bPatte(ctx, 17, -29, 28, -run * 0.55, 7, pal.dark, pal.dark); // pattes du fond
  ell(ctx, 21, -45, 10, 13, pal.body, true, 0.6); // cou
  ell(ctx, 0, -35, 27, 13.5, pal.body);           // corps
  if (pal.merle) { ctx.fillStyle = pal.dark; [[-12, -39, 6.5, 4], [5, -31, 5, 3.4], [-1, -43, 4.4, 2.6], [13, -40, 4.5, 3], [-19, -33, 3.6, 2.6]].forEach(([ex, ey, rx, ry]) => { ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0.3, 0, Math.PI * 2); ctx.fill(); }); }
  ctx.fillStyle = 'rgba(15,10,45,.16)'; ctx.beginPath(); ctx.ellipse(-1, -27, 21, 5, 0, 0, Math.PI * 2); ctx.fill(); // ombre du ventre
  bPatte(ctx, -20, -29, 28, -run * 0.55, 7.6, pal.body, pal.copper || pal.light); bPatte(ctx, 20, -29, 28, run * 0.55 + (elan ? 0.35 : 0), 7.6, pal.body, pal.copper || pal.light);
  poly(ctx, [[14, -42], [27, -43], [29, -33], [25, -27], [22, -31], [18, -25], [15, -31]], pal.light); // poitrail touffu
  if (pal.collar) { ctx.save(); ctx.translate(24, -46); ctx.rotate(0.6); rrect(ctx, -3.2, -9, 6.4, 18, 2.6, pal.collar); ctx.restore(); circle(ctx, 22, -38, 3.3, '#f1c40f'); }
  // tête : grosse, museau long, oreille tombante
  ctx.save(); ctx.translate(30, -55); ctx.rotate(elan ? 0.22 : mood === 'hurt' ? -0.4 : pose === 'attack' ? -0.08 : Math.sin(t * 2.3) * 0.04);
  circle(ctx, 0, 0, 13, pal.body);
  ctx.save(); ctx.translate(6, 4); ctx.rotate(open ? 0.42 : 0.04); // mâchoire du bas
  ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(17, -2); ctx.quadraticCurveTo(20, 2, 15, 4.5); ctx.lineTo(-1, 5); ctx.closePath(); ctx.fillStyle = open ? '#8e2f3f' : pal.muzzle; ctx.fill(); ctx.stroke();
  if (open) { const wob = Math.sin(t * 22) * 1.5; ctx.beginPath(); ctx.moveTo(6, 1); ctx.quadraticCurveTo(7, 12, 11 + wob, 14); ctx.quadraticCurveTo(15 + wob, 11, 13, 1); ctx.closePath(); ctx.fillStyle = '#ff7a93'; ctx.fill(); ctx.stroke(); }
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(1, -8); ctx.quadraticCurveTo(17, -8, 24, -3); ctx.quadraticCurveTo(28, 1, 24, 4.5); ctx.lineTo(4, 6); ctx.quadraticCurveTo(-2, 2, 1, -8); ctx.closePath(); ctx.fillStyle = pal.muzzle; ctx.fill(); ctx.stroke(); // museau
  if (mood === 'angry') poly(ctx, [[9, 5.4], [11, 9.5], [13, 5.2], [15, 9], [17, 5]], '#fff'); // crocs
  ell(ctx, 25, -1.5, 3.8, 3.1, INK, false); circle(ctx, 24, -2.6, 1, '#fff', false); // truffe
  if (pal.copper) { ctx.fillStyle = pal.copper; ctx.beginPath(); ctx.ellipse(-1, 7, 5.5, 3.6, 0, 0, Math.PI * 2); ctx.fill(); circle(ctx, 4, -10.5, 2.2, pal.copper, false); }
  if (pal.merle) { ctx.fillStyle = pal.light; ctx.beginPath(); ctx.ellipse(8, -8.5, 2.6, 4.6, -0.5, 0, Math.PI * 2); ctx.fill(); } // liste blanche
  bOeil(ctx, 5, -3.5, 4.4, mood, t);
  ctx.save(); ctx.translate(-6, -9); ctx.rotate(0.5 + Math.sin(t * 7) * 0.08 - (open ? 0.5 : 0) - (mood === 'hurt' ? 0.9 : 0));
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-9, 16, -1, 21); ctx.quadraticCurveTo(7, 16, 5, 0); ctx.closePath(); ctx.fillStyle = pal.ear; ctx.fill(); ctx.stroke(); // oreille
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

// ---------- Mouton (et agneau, en plus petit) ----------
function drawMouton(ctx, x, y, t, s = 1, q = null) {
  const pose = q ? q.pose : 'walk', belier = !!(q && q.belier), run = bPas(q, t, 16), charge = pose === 'attack' || pose === 'windup' || !!(q && q.charge);
  const mood = belier && bMood(pose) === 'calm' ? 'angry' : bMood(pose); // (q.belier : cornes et air mauvais du Mouton géant, minis.js)
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
  [[-15, 0.6], [13, -0.6], [-8, -0.6], [18, 0.6]].forEach(([lx, k], i) => bPatte(ctx, lx, -17, 17, run * k, 5.4, i < 2 ? '#26222d' : '#3a3340', '#111'));
  // toison : un nuage de boules (le trait noir d'abord, le blanc par-dessus : un seul contour festonné)
  const laine = [[-25, -29, 6], [-14, -26, 13], [0, -23, 13], [12, -27, 13], [-8, -38, 13], [7, -39, 12.5], [-18, -37, 10]];
  ctx.lineWidth = BETE.ol * 2; laine.forEach(([cx, cy, r]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); });
  laine.forEach(([cx, cy, r]) => circle(ctx, cx, cy, r, '#fafbfd', false));
  ctx.fillStyle = 'rgba(40,30,80,.13)'; ctx.beginPath(); ctx.ellipse(-2, -17, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9cfdd'; ctx.lineWidth = 1.6; [[-12, -30], [2, -27], [-4, -41], [10, -37]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0.4, 2.6); ctx.stroke(); }); // boucles
  ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
  // tête noire, baissée quand il charge
  ctx.save(); ctx.translate(18, -37); ctx.rotate(q && charge ? 0.5 : mood === 'hurt' ? -0.45 : 0);
  ell(ctx, -3, -3, 6.5, 3.2, '#3a3340', true, -0.6);     // oreille
  rrect(ctx, -6, -7, 19, 16, 7, '#3a3340');              // museau
  circle(ctx, -2, -8, 6.5, '#fafbfd');                   // toupet de laine
  bOeil(ctx, 6.5, -1, belier ? 4 : 3.4, mood, t);
  circle(ctx, 11, 4.5, 0.9, '#8a8296', false);
  if (belier) bTrait(ctx, c => { c.arc(-6, -4, 6.5, Math.PI * 0.15, Math.PI * 1.75); c.arc(-5.2, -4, 2.8, Math.PI * 1.75, Math.PI * 3.1); }, 3.4, '#a1887f'); // corne en spirale
  ctx.restore();
  ctx.restore();
}

// ---------- Les dessins (repère : ancienne taille de la bête ; q = { t, pose, pt, walk, mood, o }) ----------
const BETES = {
  // tete : [x, y, rayon] de la tête, pour le portrait de l'ennemi visé · dos : hauteur de la bête (à terre, elle est sur le dos, les pattes en l'air) · couche : demi-épaisseur (à terre, couchée sur le dos) · plat : aplatie
  berger: { tete: [34, -57, 17], dos: 66, draw(ctx, q) { drawChien(ctx, -6, 0, q.t, q.pose === 'attack' ? Math.sin(Math.min(1, q.pt) * Math.PI) * 10 : 0, q.pose === 'attack' || q.pose === 'windup', DOG_PAL.berger, 1, q); } },
  aika: { tete: [36, -61, 18], dos: 72, draw(ctx, q) { drawChien(ctx, -6, 0, q.t, q.pose === 'attack' ? Math.sin(Math.min(1, q.pt) * Math.PI) * 10 : 0, q.pose === 'attack' || q.pose === 'windup', DOG_PAL.aika, 1.1, q); } },
  mouton: { tete: [22, -41, 14], dos: 54, draw(ctx, q) { drawMouton(ctx, 0, 0, q.t, 1.05, q); } },
  agneau: { tete: [15, -29, 11], dos: 38, draw(ctx, q) { drawMouton(ctx, 0, 0, q.t, 0.75, q); } },

  chevre: { tete: [26, -44, 15], dos: 60, draw(ctx, q) {
    const run = bPas(q, q.t, 16), charge = q.pose === 'attack' || q.pose === 'windup', poil = '#dcc0a0';
    bPatte(ctx, -14, -22, 22, run * 0.6, 5.6, '#7a5a40', '#2d221b'); bPatte(ctx, 12, -22, 22, -run * 0.6, 5.6, '#7a5a40', '#2d221b');
    poly(ctx, [[-23, -36], [-33, -45], [-27, -30]], poil);                         // petite queue dressée
    ell(ctx, 15, -36, 8, 12, poil, true, 0.75);                                    // cou
    ell(ctx, -2, -30, 24, 13.5, poil);
    ell(ctx, -5, -27, 12, 7, '#fbf6ee', false);
    ctx.fillStyle = 'rgba(15,10,45,.15)'; ctx.beginPath(); ctx.ellipse(-2, -21, 19, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    bPatte(ctx, -19, -22, 22, -run * 0.6, 6, '#a98463', '#2d221b'); bPatte(ctx, 17, -22, 22, run * 0.6, 6, '#a98463', '#2d221b');
    ctx.save(); ctx.translate(23, -44); ctx.rotate(charge ? 0.75 : q.mood === 'hurt' ? -0.4 : 0); // tête : baissée, cornes en avant, quand elle charge
    [[-3, 0.92], [3, 1]].forEach(([dx, k]) => bTrait(ctx, c => { c.moveTo(-1 + dx, -7); c.quadraticCurveTo(-4 + dx, -19 * k, -14 + dx, -18 * k); }, 3, dx < 0 ? '#5a4233' : '#7b5b45')); // cornes
    ell(ctx, -6, -3, 7, 3.2, '#b98f69', true, -0.5);                               // oreille
    ctx.beginPath(); ctx.moveTo(-7, -7); ctx.quadraticCurveTo(4, -11, 14, -3); ctx.quadraticCurveTo(18, 2, 14, 6); ctx.lineTo(1, 8); ctx.quadraticCurveTo(-9, 5, -7, -7); ctx.closePath(); ctx.fillStyle = poil; ctx.fill(); ctx.stroke();
    poly(ctx, [[4, 7.5], [10, 7], [6, 18]], '#fbf6ee');                            // barbichette
    circle(ctx, 14, 1, 1, '#5a4233', false);
    bOeil(ctx, 3, -2.5, 3.8, q.mood, q.t, { blanc: '#ffe9a8' });
    ctx.restore();
  } },

  chat: { tete: [24, -41, 17], dos: 56, draw(ctx, q) { bChat(ctx, q, false); } },
  robochat: { tete: [24, -41, 17], dos: 56, draw(ctx, q) { bChat(ctx, q, true); } },

  goeland: { tete: [22, -24, 17], draw(ctx, q) {
    const pique = q.pose === 'attack', flap = Math.sin(q.t * (pique ? 24 : 12)), gris = '#aab7c4';
    const aile = (ox, oy, col, k) => { ctx.save(); ctx.translate(ox, oy); ctx.rotate((pique ? 0.5 : 0) + flap * 0.75 * k);
      ctx.beginPath(); ctx.moveTo(8, 2); ctx.quadraticCurveTo(-10, -13, -34, -8); ctx.lineTo(-31, -1); ctx.lineTo(-25, -3); ctx.lineTo(-22, 3); ctx.lineTo(-15, 1); ctx.quadraticCurveTo(-6, 9, 8, 8); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(-24, -9); ctx.lineTo(-25, -3); ctx.lineTo(-31, -1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }; // bout d'aile noir
    aile(-2, -22, '#8794a3', 1.15);
    poly(ctx, [[-20, -19], [-36, -25], [-33, -17], [-36, -11], [-20, -12]], '#2d3436');   // queue
    bTrait(ctx, c => { c.moveTo(-5, -7); c.lineTo(-11, 0); c.moveTo(3, -7); c.lineTo(-2, 1); }, 2.6, '#f39c12'); // pattes repliées
    ell(ctx, 0, -17, 24, 12.5, '#fdfdfd');
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -17, 24, 12.5, 0, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = gris; ctx.fillRect(-26, -31, 34, 9); ctx.fillStyle = 'rgba(15,10,45,.13)'; ctx.fillRect(-26, -10, 52, 8); ctx.restore();
    ell(ctx, 28, -11, 13, 11.5, '#ffc2c2');                                           // son énorme goitre
    ctx.strokeStyle = 'rgba(200,80,80,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(28, -11, 6.5, 0.3, 2.6); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
    circle(ctx, 20, -27, 11, '#fdfdfd');
    const bec = pique || q.pose === 'windup' ? 6 : 1;                                 // bec ouvert quand il pique
    poly(ctx, [[28, -24], [45, -22 + bec * 0.6], [28, -20 + bec]], '#e58e26');
    ctx.beginPath(); ctx.moveTo(27, -31); ctx.lineTo(46, -27); ctx.quadraticCurveTo(50, -24, 46, -20); ctx.lineTo(28, -24); ctx.closePath(); ctx.fillStyle = '#f6b93b'; ctx.fill(); ctx.stroke();
    circle(ctx, 41, -24.5, 1.9, '#e74c3c', false);
    bOeil(ctx, 22, -30, 4, q.mood === 'calm' ? 'angry' : q.mood, q.t);                // un goéland a toujours l'air mauvais
    aile(2, -20, '#dfe6e9', 1);
  } },

  oursin: { tete: [6, -26, 20], draw(ctx, q) {
    const R = q.pose === 'windup' ? 35 : 31, roll = q.o.roll || 0;
    const piques = (n, r0, r1, col, rot) => { for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2, d = 0.42 * Math.PI / n * 2;
      poly(ctx, [[Math.cos(a - d) * r0, Math.sin(a - d) * r0 - 22], [Math.cos(a) * r1, Math.sin(a) * r1 - 22], [Math.cos(a + d) * r0, Math.sin(a + d) * r0 - 22]], col); } };
    piques(14, 14, R, '#3b1f52', roll); piques(11, 14, R - 7, '#5b2c83', roll * 1.3 + 0.3);
    circle(ctx, 0, -22, 17.5, '#7d3c98');
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-7, -31, 6, 3.4, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(15,10,45,.22)'; ctx.beginPath(); ctx.arc(0, -22, 16, 0.25, Math.PI - 0.25); ctx.fill();
    bOeil(ctx, 2, -25, 4.6, q.mood === 'calm' ? 'angry' : q.mood, q.t, { cote: -1 }); bOeil(ctx, 12.5, -25, 4.6, q.mood === 'calm' ? 'angry' : q.mood, q.t);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, -13, 4.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); // moue
  } },

  slime: { tete: [4, -22, 24], plat: true, draw(ctx, q) {
    const sq = q.o.air ? 0.84 : q.pose === 'windup' ? 1.22 : 1 + Math.sin(q.t * 8) * 0.06, vert = '#2ecc71';
    ctx.save(); ctx.scale(sq, 1 / sq);
    const goutte = () => { ctx.beginPath(); ctx.moveTo(-25, 0); ctx.bezierCurveTo(-31, -22, -17, -41, 0, -41); ctx.bezierCurveTo(17, -41, 31, -22, 25, 0); ctx.quadraticCurveTo(17, 4, 9, 0); ctx.quadraticCurveTo(0, 5, -9, 0); ctx.quadraticCurveTo(-17, 4, -25, 0); ctx.closePath(); };
    goutte(); ctx.fillStyle = vert; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#1e9e55'; ctx.beginPath(); ctx.ellipse(0, 4, 30, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-16, -33, 7, 7); ctx.fillRect(-9, -36, 4, 4);          // reflets carrés (monde pixelisé)
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-13, -14, 4, 4); ctx.fillRect(15, -10, 3, 3); ctx.restore();
    goutte(); ctx.lineWidth = BETE.ol * 1.15; ctx.stroke(); ctx.lineWidth = BETE.ol;
    bOeil(ctx, 2, -23, 5.4, q.mood, q.t, { cote: -1 }); bOeil(ctx, 15, -23, 5.4, q.mood, q.t);
    if (q.mood === 'angry') { rrect(ctx, 3, -14, 12, 7.5, 3, '#0b5e2f'); ctx.fillStyle = '#fff'; ctx.fillRect(5, -14, 3, 3.2); ctx.fillRect(10, -14, 3, 3.2); } // gueule ouverte
    else { ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8.5, -14, 4.5, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.restore();
  } },

  robot: { tete: [2, -92, 22], couche: 26, draw(ctx, q) {
    const t = q.t, vise = q.pose === 'windup' || q.pose === 'attack', sw = q.pose === 'walk' ? Math.sin(q.walk) * 0.34 : 0, dir = q.o.dir || 1;
    const acier = '#b2bec3', sombre = '#636e72', clair = '#dfe6e9';
    // petit bras du fond, pince ouverte
    bTrait(ctx, c => { c.moveTo(-16, -62); c.lineTo(-22, -46); c.lineTo(-17 + sw * 14, -34); }, 6.5, sombre);
    // jambes articulées et gros pieds
    [[-10, sw, sombre], [10, -sw, '#8795a1']].forEach(([lx, a, col]) => { const f = { x: lx + Math.sin(a) * 28, y: -30 + Math.cos(a) * 26 };
      bTrait(ctx, c => { c.moveTo(lx, -30); c.lineTo(lx + Math.sin(a * 0.4) * 13 + 2, -17); c.lineTo(f.x, f.y); }, 8.5, col);
      circle(ctx, lx + Math.sin(a * 0.4) * 13 + 2, -17, 3.2, clair); rrect(ctx, f.x - 9, f.y - 4, 23, 8.5, 4, '#2d3436'); });
    // torse : écran avec son nom, boulons, voyant
    rrect(ctx, -26, -80, 52, 53, 11, acier);
    ctx.save(); ctx.beginPath(); ctx.roundRect(-26, -80, 52, 53, 11); ctx.clip(); ctx.fillStyle = 'rgba(15,10,45,.17)'; ctx.fillRect(-26, -80, 13, 53); ctx.fillRect(-26, -36, 52, 9); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(15, -78, 5, 18); ctx.restore();
    rrect(ctx, -21, -73, 39, 21, 5, '#1e272e');
    const lab = q.o.label || 'CLAUDE'; bTexte(ctx, lab, -2, -59.5, dir, `900 ${lab.length > 7 ? 6.3 : 7.8}px Arial`, '#00d2d3');
    [[-19, -34], [19, -34]].forEach(([bx, by]) => circle(ctx, bx, by, 2.4, clair));
    circle(ctx, 0, -40, 4.2, Math.floor(t * 3) % 2 ? '#2ecc71' : '#16a085'); rrect(ctx, -12, -47, 5, 12, 2, sombre); rrect(ctx, 7, -47, 5, 12, 2, sombre);
    // tête : visière, yeux rouges, antenne à ressort
    rrect(ctx, -6, -86, 12, 8, 2, sombre);
    bTrait(ctx, c => { c.moveTo(-2, -106); c.lineTo(-5, -111); c.lineTo(1, -114); c.lineTo(-3, -118); }, 2.2, sombre);
    circle(ctx, -3, -120, 4, vise && Math.floor(t * 16) % 2 ? '#ff4757' : '#f1c40f');
    rrect(ctx, -19, -107, 39, 25, 9, clair);
    rrect(ctx, -22, -99, 5, 10, 2, sombre);
    rrect(ctx, -9, -102, 28, 14, 6, '#1e272e');
    ctx.save(); ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 7; ctx.fillStyle = '#ff4757'; ctx.strokeStyle = '#ff4757'; ctx.lineWidth = 2.4;
    [1, 11].forEach(ex => { if (q.mood === 'ko' || q.mood === 'hurt') { ctx.beginPath(); ctx.moveTo(ex - 2.5, -97.5); ctx.lineTo(ex + 2.5, -92.5); ctx.moveTo(ex + 2.5, -97.5); ctx.lineTo(ex - 2.5, -92.5); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(ex - 3, q.mood === 'angry' ? -99.5 + (ex > 5 ? 2.6 : 0) : -98); ctx.lineTo(ex + 3, q.mood === 'angry' ? -96.9 - (ex > 5 ? 2.6 : 0) : -98); ctx.lineTo(ex + 3, -92); ctx.lineTo(ex - 3, -92); ctx.closePath(); ctx.fill(); } });
    ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
    // bras canon : il se lève à l'horizontale pour tirer (à la hauteur du laser), avec un petit recul
    ctx.save(); ctx.translate(23, -59); ctx.rotate(vise ? -Math.PI / 2 : -0.2 - sw * 0.5); if (q.pose === 'attack') ctx.translate(0, -7 * (1 - Math.min(1, q.pt * 2)));
    rrect(ctx, -7.5, -4, 15, 33, 7, '#95a5a6'); rrect(ctx, -10, 26, 20, 13, 4, '#2d3436'); ctx.fillStyle = '#636e72'; ctx.fillRect(-6, 8, 12, 3); ctx.fillRect(-6, 14, 12, 3);
    if (q.pose === 'windup') { ctx.save(); ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 10; circle(ctx, 0, 43, 5 + Math.sin(t * 40) * 2, '#ff4757', false); ctx.restore(); }
    ctx.restore();
    circle(ctx, 23, -59, 6.5, clair);
  } },

  // ----- ennemis spéciaux (un par monde) -----
  marteau: { tete: [1, -52, 22], couche: 17, draw(ctx, q) { // marteau-piqueur qui saute
    const sh = q.pose === 'walk' || q.o.air ? Math.sin(q.t * 60) * 1.5 : 0, m = q.mood === 'calm' ? 'angry' : q.mood;
    ctx.translate(sh, 0);
    poly(ctx, [[-4, -20], [4, -20], [3.2, 0], [0, 7], [-3.2, 0]], '#95a5a6'); rrect(ctx, -7, -24, 14, 7, 3, '#636e72'); // burin
    rrect(ctx, -30, -84, 14, 11, 5, '#2d3436'); rrect(ctx, 16, -84, 14, 11, 5, '#2d3436');                             // poignées
    rrect(ctx, -19, -82, 38, 7, 3, '#7f8c8d'); rrect(ctx, -5, -78, 10, 11, 2, '#636e72');
    rrect(ctx, -16, -69, 32, 51, 9, '#f1c40f');
    ctx.save(); ctx.beginPath(); ctx.roundRect(-16, -69, 32, 51, 9); ctx.clip();
    ctx.fillStyle = '#2d3436'; for (let i = -3; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 11, -18); ctx.lineTo(i * 11 + 5.5, -18); ctx.lineTo(i * 11 + 13.5, -30); ctx.lineTo(i * 11 + 8, -30); ctx.fill(); } // bande de chantier
    ctx.fillStyle = 'rgba(15,10,45,.16)'; ctx.fillRect(-16, -69, 8, 51); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(9, -65, 3.5, 20); ctx.restore();
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-16, -30); ctx.lineTo(16, -30); ctx.stroke(); ctx.lineWidth = BETE.ol;
    bOeil(ctx, -4.5, -53, 4.6, m, q.t, { cote: -1 }); bOeil(ctx, 7.5, -53, 4.6, m, q.t);
    rrect(ctx, -5, -43, 13, 6, 2, '#fff'); ctx.lineWidth = 1.2; ctx.beginPath(); [-1, 3.2].forEach(x => { ctx.moveTo(x, -43); ctx.lineTo(x, -37); }); ctx.stroke(); // dents serrées
  } },

  ballon: { tete: [3, -22, 22], draw(ctx, q) { // ballon de basket qui rebondit
    const b = Math.abs(Math.sin(q.t * 7)), sq = q.pose === 'down' ? 1.2 : b < 0.3 ? 1.16 - b * 0.53 : 1, roll = (q.o.roll || 0) * 0.6, m = q.mood === 'calm' ? 'angry' : q.mood;
    ctx.translate(0, -21 / sq - (q.pose === 'down' ? 0 : b * 16)); ctx.scale(sq, 1 / sq);
    circle(ctx, 0, 0, 21, '#e67e22');
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(60,20,0,.22)'; ctx.beginPath(); ctx.arc(-4, -5, 25, 0.35, Math.PI - 0.5); ctx.arc(-2, -12, 24, Math.PI - 0.3, 0.2, true); ctx.fill(); // ombre du bas
    ctx.rotate(roll); ctx.strokeStyle = '#2d3436'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-21, 0); ctx.lineTo(21, 0); ctx.moveTo(0, -21); ctx.lineTo(0, 21); ctx.stroke();
    ctx.beginPath(); ctx.arc(-25, 0, 16, -0.95, 0.95); ctx.stroke(); ctx.beginPath(); ctx.arc(25, 0, 16, Math.PI - 0.95, Math.PI + 0.95); ctx.stroke();
    ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-9, -12, 6, 3.2, -0.6, 0, Math.PI * 2); ctx.fill();
    bOeil(ctx, 1, -5, 4.8, m, q.t, { cote: -1 }); bOeil(ctx, 12, -5, 4.8, m, q.t);
    ctx.beginPath(); ctx.moveTo(-2, 5); ctx.quadraticCurveTo(7, 9, 16, 4); ctx.quadraticCurveTo(8, 15, -2, 5); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); // sourire carnassier
  } },

  basket: { tete: [12, -30, 22], dos: 46, draw(ctx, q) { // chaussure de course qui court toute seule
    const fonce = q.pose === 'attack', a = q.pose === 'walk' || fonce ? Math.sin(q.walk * 1.5) : 0, m = q.mood === 'calm' ? 'angry' : q.mood;
    [[-13, a, '#c23b48'], [11, -a, '#ff6b78']].forEach(([lx, k, col]) => { bTrait(ctx, c => { c.moveTo(lx, -15); c.lineTo(lx + k * 8, 0); }, 4.5, '#2d3436'); rrect(ctx, lx + k * 8 - 4, -3.5, 13, 6, 3, col); }); // petites jambes, petites baskets
    if (fonce) ctx.rotate(0.13);
    ctx.beginPath(); ctx.moveTo(-28, -17); ctx.lineTo(-27, -42); ctx.quadraticCurveTo(-13, -50, -2, -37); ctx.lineTo(17, -31); ctx.quadraticCurveTo(34, -29, 34, -17); ctx.closePath(); ctx.fillStyle = '#ff4757'; ctx.fill(); ctx.stroke(); // tige rouge
    ell(ctx, -15, -43, 10, 3.6, '#7d1f2b', true, -0.12);                                                              // ouverture
    ctx.beginPath(); ctx.moveTo(19, -30.5); ctx.quadraticCurveTo(34, -29, 34, -17); ctx.lineTo(17, -17); ctx.quadraticCurveTo(15, -24, 19, -30.5); ctx.closePath(); ctx.fillStyle = '#f5f6fa'; ctx.fill(); ctx.stroke(); // bout blanc
    rrect(ctx, -31, -18, 67, 10.5, 5, '#f5f6fa'); ctx.fillStyle = '#b2bec3'; for (let i = -26; i < 32; i += 8) ctx.fillRect(i, -10.5, 4, 2.4);  // semelle crantée
    poly(ctx, [[-21, -22], [-11, -35], [-13, -28], [-3, -30], [-13, -19], [-11, -25]], '#feca57');                    // éclair
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-7 + i * 5.5, -43 + i * 2.6); ctx.lineTo(-1 + i * 5.5, -37.5 + i * 2.6); ctx.stroke(); } // lacets
    ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
    bOeil(ctx, 7, -27, 3.6, m, q.t, { cote: -1 }); bOeil(ctx, 15.5, -26, 3.6, m, q.t);
  } },

  tableur: { tete: [2, -40, 24], couche: 27, draw(ctx, q) { // feuille de calcul en colère (pas de logo : un tableur, tout simplement)
    const sw = q.pose === 'walk' ? Math.sin(q.walk) : 0, leve = q.pose === 'windup' || q.pose === 'attack', dir = q.o.dir || 1, m = q.mood === 'calm' ? 'angry' : q.mood;
    [[-10, sw], [10, -sw]].forEach(([lx, k]) => { bTrait(ctx, c => { c.moveTo(lx, -12); c.lineTo(lx + k * 6, 0); }, 4.5, '#2d3436'); rrect(ctx, lx + k * 6 - 4, -3.5, 13, 6, 3, '#21a366'); });
    bTrait(ctx, c => { c.moveTo(-25, -34); c.lineTo(-33, leve ? -44 : -24); }, 4.5, '#2d3436'); circle(ctx, -33, leve ? -44 : -24, 4, '#fff');  // petits bras
    poly(ctx, [[-27, -62], [17, -62], [27, -52], [27, -9], [-27, -9]], '#ffffff');                                     // la feuille, coin corné
    ctx.save(); ctx.beginPath(); ctx.rect(-26, -61, 52, 51); ctx.clip();
    ctx.fillStyle = '#21a366'; ctx.fillRect(-27, -62, 54, 11);
    ctx.strokeStyle = '#b2bec3'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < 4; i++) { ctx.moveTo(-27 + i * 13.5, -51); ctx.lineTo(-27 + i * 13.5, -9); ctx.moveTo(-27, -51 + i * 10.5); ctx.lineTo(27, -51 + i * 10.5); } ctx.stroke();
    ctx.fillStyle = 'rgba(33,163,102,.3)'; ctx.fillRect(-13.5, -30, 27, 10.5); ctx.restore();
    bTexte(ctx, '=SOMME()', -5, -53.5, dir, 'bold 7.5px Arial', '#fff');
    ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol; poly(ctx, [[17, -62], [27, -52], [17, -52]], '#dfe6e9');
    bOeil(ctx, -5, -40, 4.6, m, q.t, { cote: -1 }); bOeil(ctx, 9, -40, 4.6, m, q.t);
    rrect(ctx, -15, -23, 30, 10, 2, '#fdecea'); bTexte(ctx, '#DIV/0!', 0, -15.5, dir, 'bold 6.5px Arial', '#c0392b');   // sa bouche : une cellule en erreur
    bTrait(ctx, c => { c.moveTo(25, -34); c.lineTo(leve ? 37 : 32, leve ? -42 : -24); }, 4.5, '#2d3436'); circle(ctx, leve ? 37 : 32, leve ? -42 : -24, 4, '#fff');
  } },

  fut: { tete: [0, -44, 24], couche: 22, draw(ctx, q) { // fût radioactif sur pattes : il clignote puis explose
    const t = q.t, glow = q.pose === 'windup' ? 0.5 + Math.sin(t * 30) * 0.5 : 0, sw = q.pose === 'walk' ? Math.sin(q.walk) : 0, m = q.mood === 'calm' ? 'angry' : q.mood;
    [[-9, sw], [9, -sw]].forEach(([lx, k]) => { bTrait(ctx, c => { c.moveTo(lx, -10); c.lineTo(lx + k * 6, 0); }, 4.5, '#2d3436'); rrect(ctx, lx + k * 6 - 4, -3.5, 13, 6, 3, '#2d3436'); });
    if (glow > 0) { ctx.fillStyle = `rgba(255,60,60,${0.35 * glow})`; ctx.beginPath(); ctx.arc(0, -36, 44, 0, Math.PI * 2); ctx.fill(); }
    const g = ctx.createLinearGradient(-21, 0, 21, 0); g.addColorStop(0, '#c99a0a'); g.addColorStop(0.55, '#f9e27d'); g.addColorStop(1, '#b7950b');
    rrect(ctx, -21, -66, 42, 58, 7, g);
    rrect(ctx, -23, -57, 46, 5, 2.5, '#8a6d08'); rrect(ctx, -23, -22, 46, 5, 2.5, '#8a6d08');                           // cerclages
    ell(ctx, 0, -66, 17, 4.6, `rgb(${150 + Math.sin(t * 5) * 20 | 0},230,53)`);                                         // liquide vert, qui déborde
    bTrait(ctx, c => { c.moveTo(-12, -66); c.lineTo(-12, -49 + Math.sin(t * 3) * 3); c.moveTo(13, -66); c.lineTo(13, -58 + Math.sin(t * 2.2 + 1) * 2); }, 5, '#a3e635');
    bOeil(ctx, -6, -44, 4.6, m, t, { cote: -1 }); bOeil(ctx, 7, -44, 4.6, m, t);
    ctx.save(); ctx.translate(0, -31); ctx.fillStyle = '#111'; // symbole « danger radioactif »
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 8, i * 2.094 - 0.52, i * 2.094 + 0.52); ctx.closePath(); ctx.fill(); }
    circle(ctx, 0, 0, 2.4, '#f9e27d', false); circle(ctx, 0, 0, 1.5, '#111', false); ctx.restore();
  } },

  // ----- monde pixelisé de Faouzi : gros carrés, cernés de noir -----
  chevalier8: { pix: true, tete: [3, -78, 30], couche: 36, draw(ctx, q) {
    const p = BETE.pix, pas = q.pose === 'walk' && Math.floor(q.walk / 2) % 2, oy = -102 - (pas ? 3 : 0);
    bPix(ctx, PIX2.chevalier.concat(pas ? PIX2.chevalierPas : PIX2.chevalierPieds), -42, oy, q.mood === 'ko' || q.mood === 'hurt' ? { W: '#ff4757' } : null);
    // épée : dressée en attente, levée pour l'élan, abattue devant lui pour frapper
    const K = PIX_COL2.K, r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(-42 + x * p, oy + y * p, w * p, h * p); };
    if (q.pose === 'attack') { r(12, 11, 9, 2, K); r(12.5, 11.5, 8, 1, '#f5f6fa'); r(11, 10, 1.5, 4, K); r(11.25, 10.5, 1, 3, '#f1c40f'); }
    else { const up = q.pose === 'windup' ? -4 : 0; r(11, 3 + up, 2, 9, K); r(11.5, 3.5 + up, 1, 8, '#f5f6fa'); r(9.5, 11.5 + up, 5, 1.5, K); r(10, 11.75 + up, 4, 1, '#f1c40f'); }
  } },
  alien8: { pix: true, tete: [0, -42, 30], draw(ctx, q) {
    const oy = -72 + Math.round(Math.sin(q.t * 3)) * 3, tire = q.pose === 'windup' || q.pose === 'attack';
    bPix(ctx, PIX2.alien, -42, oy, Object.assign({ Y: tire ? '#ff4757' : Math.floor(q.t * 4) % 2 ? '#f1c40f' : '#fff3b0' }, q.mood === 'ko' || q.mood === 'hurt' ? { E: '#ff4757' } : null));
    if (q.pose === 'windup') { ctx.fillStyle = Math.floor(q.t * 20) % 2 ? '#b8f5c9' : '#2ecc71'; ctx.fillRect(-6, oy + 66, 12, 6); } // le rayon se charge
  } },
  chauve8: { pix: true, tete: [0, -27, 28], draw(ctx, q) { bPix(ctx, Math.floor(q.t * 8) % 2 ? PIX2.chauveA : PIX2.chauveB, -48, -51, q.pose === 'attack' || q.pose === 'windup' ? { R: '#ffd32a' } : null); } },
  glitch: { pix: true, tete: [0, -45, 28], couche: 30, draw(ctx, q) { // bug de jeu vidéo : il grésille et se dédouble
    const j = Math.floor(q.t * 12) % 3, pal = q.mood === 'ko' || q.mood === 'hurt' ? { E: '#ff4757' } : null;
    ctx.globalAlpha *= 0.5; bPix(ctx, PIX2.glitch, -30 - 3 - j * 3, -72, null, '#ff4757'); bPix(ctx, PIX2.glitch, -30 + 3 + j * 3, -72, null, '#00d2d3'); ctx.globalAlpha *= 2;
    const dec = Math.floor(q.t * 9) % 4 === 0 ? 2 + Math.floor(q.t * 5) % 7 : -1;                                    // une bande qui se décale
    bPix(ctx, PIX2.glitch, -30, -72, pal, null, dec, q.mood === 'angry' ? 6 : 3);
    if (Math.floor(q.t * 14) % 6 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(-33, -66 + (Math.floor(q.t * 31) % 9) * 6, 66, 3); }
  } },
};

// ---------- Chat et chat robot (même silhouette) ----------
function bChat(ctx, q, robot) {
  const t = q.t, run = bPas(q, t, 16), elan = q.pose === 'windup', griffe = q.pose === 'attack';
  const corps = robot ? '#b2bec3' : '#e8794f', fonce = robot ? '#6f7b83' : '#b6583a', clair = robot ? '#dfe6e9' : '#fbe3cf';
  const dos = elan ? 5 : 0; // dos rond quand il crache
  // queue : en point d'interrogation, hérissée et droite avant l'attaque
  bTrait(ctx, c => { c.moveTo(-19, -26 - dos); if (elan) c.quadraticCurveTo(-27, -44, -24, -64); else c.bezierCurveTo(-36, -34, -34, -56, -24 + Math.sin(t * 5) * 3, -58); }, elan ? 8 : 5.5, robot ? fonce : corps);
  if (robot) { ctx.strokeStyle = INK; ctx.lineWidth = 1.4; [[-25, -36], [-29, -46]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy - 2); ctx.stroke(); }); ctx.lineWidth = BETE.ol; }
  bPatte(ctx, -12, -15, 15, run * 0.6, 5.6, fonce, fonce); bPatte(ctx, 12, -15, 15, -run * 0.6, 5.6, fonce, fonce);
  ell(ctx, 0, -24 - dos, 22, 11.5 + dos * 0.5, corps);
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -24 - dos, 22, 11.5 + dos * 0.5, 0, 0, Math.PI * 2); ctx.clip();
  if (robot) { ctx.fillStyle = fonce; ctx.fillRect(-9, -40, 3, 30); ctx.fillRect(4, -40, 3, 30); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-18, -33 - dos, 10, 3); }
  else { ctx.strokeStyle = fonce; ctx.lineWidth = 3.4; for (let i = -14; i < 12; i += 8) { ctx.beginPath(); ctx.moveTo(i, -38 - dos); ctx.lineTo(i + 3, -25 - dos); ctx.stroke(); } } // rayures
  ctx.fillStyle = 'rgba(15,10,45,.16)'; ctx.fillRect(-24, -18, 48, 8); ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
  bPatte(ctx, -17, -15, 15, -run * 0.6, 6, corps, clair);
  // patte de devant : levée, griffes sorties, quand il attaque
  if (griffe) { const k = Math.sin(Math.min(1, q.pt) * Math.PI); bTrait(ctx, c => { c.moveTo(15, -20); c.lineTo(30 + k * 10, -30 + k * 14); }, 6, corps);
    circle(ctx, 31 + k * 10, -29 + k * 14, 4.6, clair); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; [-0.5, 0.1, 0.7].forEach(a => { ctx.beginPath(); ctx.moveTo(34 + k * 10, -29 + k * 14); ctx.lineTo(34 + k * 10 + Math.cos(a) * 7, -29 + k * 14 + Math.sin(a) * 7); ctx.stroke(); }); ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol; }
  else bPatte(ctx, 16, -15, 15, run * 0.6, 6, corps, clair);
  // tête : grosse, oreilles pointues
  ctx.save(); ctx.translate(21, -38 - dos * 0.4); ctx.rotate(q.mood === 'hurt' ? -0.35 : elan ? 0.12 : 0);
  [[-11, -6, -10, -23, -1, -12], [2, -13, 10, -24, 12, -8]].forEach(([ax, ay, bx, by, cx, cy]) => { poly(ctx, [[ax, ay], [bx, by], [cx, cy]], corps); poly(ctx, [[(ax + bx + cx) / 3 - 2, (ay + by + cy) / 3 + 2], [bx * 0.8 + ax * 0.2, by * 0.7 + ay * 0.3], [(ax + bx + cx) / 3 + 3, (ay + by + cy) / 3 + 1]], robot ? '#ff4757' : '#ffb3a7', false); });
  circle(ctx, 0, 0, 14, corps);
  if (robot) { // visière sombre, œil-fente lumineux, antenne
    rrect(ctx, -3, -8, 18, 11, 5, '#1e272e');
    ctx.save(); ctx.shadowColor = '#00d2d3'; ctx.shadowBlur = 8; ctx.strokeStyle = q.mood === 'angry' ? '#ff4757' : '#00d2d3'; ctx.lineWidth = 3;
    ctx.beginPath(); if (q.mood === 'ko' || q.mood === 'hurt') { ctx.moveTo(3, -5.5); ctx.lineTo(9, 0.5); ctx.moveTo(9, -5.5); ctx.lineTo(3, 0.5); } else { ctx.moveTo(1, q.mood === 'angry' ? -5 : -2.5); ctx.lineTo(11, -2.5); } ctx.stroke(); ctx.restore();
    bTrait(ctx, c => { c.moveTo(-4, -13); c.lineTo(-7, -25); }, 2, fonce); circle(ctx, -7, -26, 3, '#ff4757');
    rrect(ctx, 3, 5, 9, 4, 1.5, fonce); circle(ctx, -9, 3, 1.6, clair);
  } else {
    ell(ctx, 6, 5, 7.5, 5.2, clair, false);                                    // babines claires
    bOeil(ctx, 5, -3.5, 4.8, q.mood, t, { blanc: '#b8e994', fente: true });
    poly(ctx, [[10.5, 1.5], [14.5, 1.5], [12.5, 4]], '#ff7a93');               // truffe rose
    if (elan || griffe) { rrect(ctx, 4, 5, 8, 6, 2.5, '#7d1f2b'); ctx.fillStyle = '#fff'; ctx.fillRect(5, 5, 2, 3); ctx.fillRect(9, 5, 2, 3); } // il crache : crocs
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(11, 5); ctx.lineTo(22, 3); ctx.moveTo(11, 6.5); ctx.lineTo(22, 8); ctx.stroke(); // moustaches
  }
  ctx.restore();
}

// ---------- Monde pixelisé : grilles de caractères (un caractère = un carré de BETE.pix) ----------
const PIX_COL2 = { K: '#141421', H: '#aab7b8', h: '#7f8c8d', V: '#1e272e', W: '#fff7ae', A: '#3498db', a: '#2471a3', T: '#f1c40f', S: '#ffeaa7', L: '#34495e', B: '#6d4c41', R: '#e74c3c',
  G: '#2ecc71', g: '#1e9e55', E: '#111111', C: '#c7ecee', M: '#95a5a6', m: '#636e72', Y: '#f1c40f', D: '#2d3436', P: '#8854d0', p: '#5f3aa0', c: '#00d2d3', w: '#ffffff' };
const PIX2 = {
  chevalier: ['....RR........', '...RRKKKK.....', '...RKHHHHK....', '..KHHHHHHHK...', '..KHHKKKKKK...', '..KHhKWKWKK...', '..KHHHHHhhK...', '...KHHHHhK....', '..KKAAAAAKK...', '.KAAAAAAAaaK..', '.KATAAAATaaK..', '.KAAATTAAAaK..', '.KSKAAAAAKSK..', '..KKLLKLLKK...'],
  chevalierPieds: ['...KLLKLLK....', '...KLLKLLK....', '..KBBBKBBBK...'],
  chevalierPas: ['..KLLK.KLLK...', '.KLLK...KLLK..', 'KBBBK...KBBBK.'],
  alien: ['....KKKKKK....', '...KCCCCCCK...', '..KCCGGGGCCK..', '..KCGEGGEGCK..', '..KCGGggGGCK..', '.KKKKKKKKKKKK.', 'KMMMMMMMMMMMMK', 'KMYMMYMMYMMYMK', '.KmmmmmmmmmmK.', '..KKDDDDDDKK..', '....KDDDDK....', '.....KKKK.....'],
  chauveA: ['K..............K', 'KK....K..K....KK', 'KPK..KPKKPK..KPK', 'KPPKKPPPPPPKKPPK', 'KPPPPPRPPRPPPPPK', '.KppPPPwwPPPppK.', '..KKpKPPPPKpKK..', '....K.KKKK.K....'],
  chauveB: ['......K..K......', '.....KPKKPK.....', '..KKKPPPPPPKKK..', '.KPPPPRPPRPPPPK.', 'KPPPPPPwwPPPPPPK', 'KPpKKPPPPPPKKpPK', 'KpK..KPPPPK..KpK', 'KK....KKKK....KK'],
  glitch: ['..KKKKKK..', '.KPPPPPPK.', 'KPPPPPPPPK', 'KPwwPPwwPK', 'KPwEPPwEPK', 'KPPPPPPPPK', 'KPcKcKcKPK', 'KPPccccPPK', 'KppPPPPppK', '.KppKKppK.', '.KpK..KpK.', 'KKK....KKK'],
};
// pal : couleurs remplacées (yeux rouges quand il est touché…) · uni : tout d'une seule couleur (fantômes du Glitch) ·
// dec : numéro d'une ligne décalée de n carrés (grésillement du Glitch)
function bPix(ctx, rows, ox, oy, pal, uni, dec = -1, n = 0) {
  const p = BETE.pix;
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = (pal && pal[r[x]]) || PIX_COL2[r[x]]; if (c) { ctx.fillStyle = uni || c; ctx.fillRect(ox + x * p + (y === dec || y === dec + 1 ? n : 0), oy + y * p, p, p); } } });
}

// ---------- Dessin d'une bête (même convention que drawMinion : o = { dir, scale, t, walk, pose, poseT, roll, air, label }) ----------
function drawBete(ctx, type, o = {}) {
  const B = BETES[type], sc = (o.scale || 1) * (B.pix ? 1 : BETE.gros), pose = o.pose || 'idle';
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale((o.dir || 1) * sc, sc);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
  if (pose === 'hurt') ctx.rotate(B.pix ? 0 : -0.2);                       // touché : il part en arrière
  else if (pose === 'down') {                                               // à terre :
    if (B.dos) { ctx.translate(0, -B.dos); ctx.scale(1, -1); }              //  les quatre fers en l'air,
    else if (B.plat) ctx.scale(1.3, 0.45);                                  //  aplati (slime),
    else if (B.couche) { ctx.translate(-6, -B.couche); ctx.rotate(-Math.PI / 2); } //  ou couché sur le dos (robots, objets)
  }
  B.draw(ctx, { t: o.t || 0, pose, pt: o.poseT || 0, walk: o.walk || 0, mood: bMood(pose), o });
  ctx.restore();
}
// Portrait de l'ennemi visé : sa tête, cadrée dans un rond de rayon r centré en (x, y)
function drawBeteTete(ctx, type, x, y, r, o = {}) {
  const B = BETES[type], k = (B.pix ? 1 : BETE.gros), s = r / (B.tete[2] * k);
  ctx.save(); ctx.translate(x - B.tete[0] * k * s, y - B.tete[1] * k * s);
  drawBete(ctx, type, { dir: 1, scale: s, t: o.t || 0, variant: o.variant, label: o.label, roll: 0 });
  ctx.restore();
}
