// ============================================================
//  LES LAÏQUISTES — Dessins des mini-boss (v3.9 ; nouveau dessin en v4.3, plus bas)
//   Marcel (vieux Français : béret, canne, baguette) · Clément (ado de 15 ans, voiture sans permis)
//   Cécile (blonde, pas très grande, au téléphone) · Le Blond (taille de Faouzi, blond, télescope)
//   Clapet 3000 (téléphone noir à clapet) · Mouton géant · Mini Purf (The Purf en plus petit)
//  + leurs armes, leurs projectiles, le solex et la voiturette, le trou noir.
//  Tout est dessiné tourné vers la droite (+x) ; le retournement se fait dans drawMiniBoss.
// ============================================================

// couleur vive de chaque mini-boss (bandeau d'arrivée, barre de vie)
const MINI_COL = { marcel: '#3867d6', clement: '#8854d0', cecile: '#f368e0', leblond: '#f7d794', clapet: '#4b7bec', moutong: '#dfe6e9', minipurf: '#a3e635' };

// ---------- armes tenues (même repère que ITEMS dans draw.js : +y = prolongement du bras) ----------
Object.assign(ITEMS, {
  baguette(ctx) { // baguette de pain
    ctx.save(); ctx.rotate(-0.1);
    rrect(ctx, -6, -18, 12, 82, 6, '#e1a95f');
    ctx.strokeStyle = '#b9772f'; ctx.lineWidth = 2;
    for (let y = -6; y < 58; y += 15) { ctx.beginPath(); ctx.moveTo(-4, y + 6); ctx.lineTo(4, y); ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = 2;
  },
  phone(ctx, t) { // smartphone de Cécile (il sonne de temps en temps)
    rrect(ctx, -7, 2, 14, 24, 3, '#2d3436');
    ctx.fillStyle = (t * 3) % 2 < 0.3 ? '#fff' : '#74b9ff'; ctx.fillRect(-5, 5, 10, 16);
  },
  manette(ctx) { // manette de jeu
    ctx.save(); ctx.translate(0, 12);
    ell(ctx, -9, 4, 7, 9, '#2f3542'); ell(ctx, 9, 4, 7, 9, '#2f3542');
    rrect(ctx, -14, -6, 28, 14, 6, '#2f3542');
    circle(ctx, 6, -1, 2.2, '#ff4757', false); circle(ctx, 10, 2, 2.2, '#2ed573', false);
    ctx.fillStyle = '#ced6e0'; ctx.fillRect(-10, -1, 6, 2); ctx.fillRect(-8, -3, 2, 6);
    ctx.restore();
  },
  telescope(ctx) { // télescope en laiton
    rrect(ctx, -5, -10, 10, 40, 3, '#d4ac0d');
    rrect(ctx, -7, 28, 14, 46, 4, '#b7950b');
    rrect(ctx, -9, 70, 18, 10, 3, '#7d6608');
    ctx.fillStyle = 'rgba(160,220,255,.8)'; ctx.fillRect(-6, 78, 12, 3);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-3, 32, 3, 36);
  },
});

// ---------- les mini-boss humanoïdes ----------
Object.assign(HUMANS, {
  marcel: {
    bw: 40, bh: 86, color: '#dfe6e9', light: '#ffffff', legs: '#34495e', shoes: '#4e342e', item: 'baguette', idleArm: -0.55,
    behind(ctx, o, w, h) { // canne dans l'autre main
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-w * 0.5, 0); ctx.lineTo(-w * 0.5, -h * 0.42); ctx.arc(-w * 0.5 + 7, -h * 0.42, 7, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
    },
    torso(ctx, w, h, bob) { // marinière + foulard rouge
      ctx.fillStyle = '#1e3799';
      for (let i = 0; i < 5; i++) ctx.fillRect(-w / 2 + 3, -h * 0.74 + i * h * 0.1 + bob, w - 6, h * 0.04);
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      poly(ctx, [[-8, -h * 0.8 + bob], [10, -h * 0.8 + bob], [2, -h * 0.68 + bob]], '#e74c3c');
      ctx.lineWidth = 3;
    },
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      circle(ctx, -hr * 0.8, hy + hr * 0.05, hr * 0.3, '#dfe6e9'); // cheveux blancs sur le côté
      ell(ctx, -hr * 0.05, hy - hr * 0.72, hr * 1.12, hr * 0.42, '#1e272e', true, -0.12); // béret
      rrect(ctx, -2, hy - hr * 1.22, 4, 7, 2, '#1e272e', false); // la petite queue du béret
      eyeDot(ctx, hr * 0.45, hy - hr * 0.05, 2.5, hurt);
      ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hr * 0.22, hy - hr * 0.3); ctx.lineTo(hr * 0.68, hy - hr * 0.26); ctx.stroke(); // sourcil
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ell(ctx, hr * 0.55, hy + hr * 0.32, hr * 0.42, hr * 0.13, '#ecf0f1'); // moustache
      ctx.fillStyle = 'rgba(231,76,60,.35)'; ctx.beginPath(); ctx.arc(hr * 0.75, hy + hr * 0.05, hr * 0.15, 0, Math.PI * 2); ctx.fill(); // nez rouge
    },
  },
  clement: {
    bw: 34, bh: 80, headR: 16, color: '#5f27cd', light: '#a29bfe', legs: '#576574', shoes: '#ffffff', item: 'manette', idleArm: -0.7,
    torso(ctx, w, h, bob) { // sweat à capuche : poche + cordons
      ctx.strokeStyle = '#341f97'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-w * 0.3, -h * 0.42 + bob, w * 0.6, h * 0.12, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, -h * 0.79 + bob); ctx.lineTo(-4, -h * 0.65 + bob); ctx.moveTo(5, -h * 0.79 + bob); ctx.lineTo(6, -h * 0.65 + bob); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
    },
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      hairDome(ctx, hr, hy, '#6d4c41', 1.0, 2.0, 0.22, 1.05);
      ctx.beginPath(); ctx.arc(0, hy - hr * 0.3, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fillStyle = '#ff9f43'; ctx.fill(); ctx.stroke(); // casquette…
      rrect(ctx, -hr * 1.75, hy - hr * 0.5, hr * 0.95, 6, 3, '#ff9f43'); // … à l'envers
      eyeDot(ctx, hr * 0.45, hy - hr * 0.02, 2.6, hurt);
      ctx.fillStyle = '#e17055'; [[0.1, 0.25], [0.3, 0.4], [-0.1, 0.35]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(hr * x, hy + hr * y, 1.6, 0, Math.PI * 2); ctx.fill(); }); // boutons d'ado
      if (pose !== 'attack' && pose !== 'windup') { ctx.strokeStyle = '#95a5a6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hr * 0.35, hy + hr * 0.5); ctx.lineTo(hr * 0.75, hy + hr * 0.5); ctx.stroke(); } // appareil dentaire
    },
  },
  cecile: {
    bw: 34, bh: 82, headR: 15, color: '#c2185b', light: '#f06292', legs: '#2d3436', shoes: '#c0392b', item: 'phone', idleArm: -2.5,
    behind(ctx, o, w, h) { // longs cheveux blonds dans le dos
      const hr = 15, hy = -h * 0.8 - hr * 0.35;
      ctx.fillStyle = '#f6d365'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-hr * 1.05, hy - hr * 0.2); ctx.quadraticCurveTo(-hr * 1.55, hy + hr * 1.9, -hr * 0.7, hy + hr * 2.4);
      ctx.lineTo(hr * 0.2, hy + hr * 1.3); ctx.lineTo(hr * 0.3, hy - hr * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 3;
    },
    torso(ctx, w, h, bob) { // jupe
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      poly(ctx, [[-w / 2 + 1, -h * 0.36 + bob], [w / 2 - 1, -h * 0.36 + bob], [w / 2 + 6, -h * 0.2 + bob], [-w / 2 - 6, -h * 0.2 + bob]], '#2d3436');
      ctx.lineWidth = 3;
    },
    face(ctx, hr, hy, pose, t, hurt) {
      hairDome(ctx, hr, hy, '#f6d365', 0.95, 2.02, 0.22, 1.1); // frange blonde
      ctx.fillStyle = '#f6d365'; ctx.fillRect(-hr * 1.05, hy - hr * 0.4, hr * 0.45, hr * 0.9);
      eyeDot(ctx, hr * 0.45, hy - hr * 0.02, 2.6, hurt);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; // cils
      ctx.beginPath(); ctx.moveTo(hr * 0.35, hy - hr * 0.2); ctx.lineTo(hr * 0.27, hy - hr * 0.34); ctx.moveTo(hr * 0.5, hy - hr * 0.24); ctx.lineTo(hr * 0.5, hy - hr * 0.38); ctx.stroke();
      ctx.fillStyle = '#e84393'; ctx.beginPath(); ctx.ellipse(hr * 0.58, hy + hr * 0.45, hr * 0.17, hr * 0.08, 0, 0, Math.PI * 2); ctx.fill(); // rouge à lèvres
      ctx.fillStyle = 'rgba(255,120,150,.35)'; ctx.beginPath(); ctx.arc(hr * 0.2, hy + hr * 0.22, hr * 0.2, 0, Math.PI * 2); ctx.fill();
    },
    front(ctx, o, w, h, hr, hy) { // « dring » quand elle prépare son attaque
      if (o.pose !== 'windup' && o.pose !== 'special') return;
      ctx.strokeStyle = '#ff7675'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(hr * 0.2, hy - hr * 1.2, 8 + i * 7 + ((o.t || 0) * 30) % 7, -2.4, -0.7); ctx.stroke(); }
    },
  },
  leblond: {
    bw: 38, bh: 92, headR: 17, armW: 7.5, legW: 9, color: '#1e3799', light: '#4a69bd', legs: '#2c3e50', item: 'telescope', idleArm: -0.5,
    torso(ctx, w, h, bob) { // veste d'astronome étoilée
      ctx.fillStyle = '#feca57'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
      [[-8, -0.7], [6, -0.6], [-4, -0.45], [9, -0.38]].forEach(([x, y]) => ctx.fillText('★', x, h * y + bob));
    },
    face(ctx, hr, hy, pose, t, hurt) {
      hairDome(ctx, hr, hy, '#f9e79f', 1.0, 2.0, 0.25, 1.06); // blond
      ctx.fillStyle = '#f9e79f'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-hr * 0.3, hy - hr * 1.15); ctx.quadraticCurveTo(hr * 0.9, hy - hr * 1.1, hr * 1.0, hy - hr * 0.35); ctx.lineTo(hr * 0.15, hy - hr * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
      eyeDot(ctx, hr * 0.45, hy - hr * 0.02, 3, hurt);
    },
  },
});

// ---------- Clapet 3000 : téléphone noir à clapet ----------
function drawFlipPhone(ctx, o) {
  const t = o.t || 0, pose = o.pose || 'idle', pt = o.poseT || 0, walk = o.walk || 0;
  const sw = pose === 'walk' ? Math.sin(walk) * 7 : 0;
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  // jambes fines et baskets
  rrect(ctx, -14, -22, 6, 22 + sw * 0.3, 3, '#2d3436'); rrect(ctx, -18, -4, 14, 6, 3, '#ff4757', false);
  rrect(ctx, 8, -22, 6, 22 - sw * 0.3, 3, '#2d3436'); rrect(ctx, 6, -4, 14, 6, 3, '#ff4757', false);
  // bas du téléphone : le clavier
  rrect(ctx, -26, -70, 52, 50, 8, '#1e1e1e');
  ctx.fillStyle = '#57606f';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) ctx.fillRect(-15 + c * 11, -62 + r * 10, 8, 6);
  rrect(ctx, -10, -66, 20, 3, 1, '#a4b0be', false);
  // bras
  ctx.lineWidth = 4; ctx.strokeStyle = '#2d3436';
  const arm = pose === 'attack' ? -1.2 : pose === 'windup' ? 0.6 : Math.sin(t * 4) * 0.2;
  ctx.beginPath(); ctx.moveTo(24, -52); ctx.lineTo(24 + Math.cos(arm) * 18, -52 + Math.sin(arm) * 18 + 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-24, -52); ctx.lineTo(-38, -40); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  // charnière
  rrect(ctx, -28, -76, 56, 9, 4, '#2f3542');
  // couvercle (écran) : s'ouvre en grand pour préparer, claque vers l'avant pour frapper
  let ang = Math.sin(t * 2) * 0.05;
  if (pose === 'windup') ang = -0.45 + Math.sin(t * 30) * 0.05;
  else if (pose === 'attack') ang = Math.sin(Math.min(1, pt * 1.6) * Math.PI) * 1.25;
  else if (pose === 'hurt' || pose === 'down') ang = 0.5;
  ctx.save(); ctx.translate(0, -72); ctx.rotate(ang);
  rrect(ctx, -26, -58, 52, 58, 8, '#1e1e1e');
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-22, -54, 6, 50);
  const scr = ctx.createLinearGradient(0, -50, 0, -14); scr.addColorStop(0, '#74b9ff'); scr.addColorStop(1, '#0984e3');
  rrect(ctx, -19, -50, 38, 32, 4, scr);
  // visage sur l'écran
  const hurt = pose === 'hurt' || pose === 'down';
  ctx.fillStyle = '#0c2461';
  if (hurt) { ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('x  x', 2, -32); }
  else { ctx.fillRect(-9, -40, 6, 7); ctx.fillRect(7, -40, 6, 7); ctx.fillRect(-10, -44, 9, 2); ctx.fillRect(6, -45, 9, 2); }
  ctx.fillRect(-6, -25, 14, pose === 'attack' || pose === 'windup' ? 5 : 2);
  ctx.save(); ctx.translate(0, -7); if ((o.dir || 1) < 0) ctx.scale(-1, 1); // (texte à l'endroit même quand il regarde à gauche)
  ctx.fillStyle = '#dfe6e9'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillText('CLAPET 3000', 0, 0); ctx.restore();
  ctx.restore();
  // petite antenne
  ctx.save(); ctx.translate(0, -72); ctx.rotate(ang);
  rrect(ctx, 16, -70, 5, 14, 2, '#2f3542'); ctx.restore();
}

// ---------- Mouton géant ----------
function drawBigSheep(ctx, o) {
  const t = o.t || 0, pose = o.pose || 'idle', pt = o.poseT || 0, s = 2.3;
  const lunge = pose === 'attack' ? Math.sin(Math.min(1, pt * 1.4) * Math.PI) * 18 : pose === 'windup' ? -8 : 0;
  ctx.save(); ctx.translate(lunge, 0);
  drawSheep(ctx, 0, 0, pose === 'walk' || pose === 'special' ? t : t * 0.2, s);
  ctx.scale(s, s); ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  // cornes en spirale
  ctx.beginPath(); ctx.arc(15, -40, 6, Math.PI * 0.2, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(15, -40, 2.5, 0, Math.PI * 1.5); ctx.stroke();
  // sourcil furieux + œil rouge quand il prépare son coup
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(20, -42); ctx.lineTo(27, -39); ctx.stroke();
  if (pose === 'windup' || pose === 'special') { ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(24, -37, 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// ============================================================
//  v4.3 — NOUVEAU DESSIN DES MINI-BOSS (même style que les héros : persos.js, et que les bêtes : betes.js)
//  Marcel, Clément, Cécile, Le Blond et Mini Purf sont des pantins articulés (RIGS) ; Clapet 3000 et le
//  Mouton géant sont redessinés ici. L'ancien dessin (plus haut) ne sert plus qu'à la planche de style.
// ============================================================
Object.assign(RIGS, {
  marcel: { // vieux Français : béret, marinière, foulard rouge, moustache blanche, nez rouge, baguette à la main, canne
    H: 110, th: 19, sh: 18, ankle: 5, legW: 12.5, foot: 22, footH: 7, tl: 31, tb: 17, tf: 19, hb: 16, hf: 18, belly: 7,
    ua: 19, fa: 17, armW: 11, hand: 7.6, hr: 20.5, headUp: 0.7, nose: 1.3, eyes: [0.16, 0.7, 0.06], browCol: '#ecf0f1', browUp: 0.08,
    shirt: '#f5f6fa', sleeve: '#f5f6fa', fore: '#f5f6fa', legs: '#34495e', shoes: '#4e342e', sole: '#1b1b1b',
    style: 'swing', item: 'baguette', itemK: 1, taunt: 'point', special: 'impact', stoop: 0.08,
    idle: { aF: [0.45, 1.2], aB: [-0.35, 0.45], it: 2.6 }, mouth: 'flat', brow: 'angry',
    behind(ctx, R) { // sa canne, plantée derrière lui
      const x = -R.tb - 15, h = R.H * 0.5;
      bTrait(ctx, c => { c.moveTo(x, 0); c.lineTo(x, -h); c.arc(x + 5, -h, 5, Math.PI, Math.PI * 1.9); }, 4.2, '#6d4c41');
    },
    torso(ctx, R) { // marinière, foulard rouge noué
      const tl = R.tl, f = R.tf;
      ctx.fillStyle = '#1e3799'; for (let i = 0; i < 6; i++) ctx.fillRect(-40, -tl * 0.8 + i * tl * 0.17, 80, tl * 0.075);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; poly(ctx, [[-f * 0.3, -tl - 6], [f * 1.1, -tl - 6], [f * 0.45, -tl * 0.62]], '#e74c3c');
    },
    headBack(ctx, hr) { ctx.lineWidth = P2.ol * 0.8; circle(ctx, -hr * 0.86, hr * 0.12, hr * 0.3, '#f5f6fa'); circle(ctx, -hr * 0.7, hr * 0.5, hr * 0.26, '#f5f6fa'); },
    headTop(ctx, hr) {
      ctx.fillStyle = 'rgba(231,76,60,.45)'; ctx.beginPath(); ctx.arc(hr * 1.12, hr * 0.14, hr * 0.2, 0, Math.PI * 2); ctx.fill(); // nez rouge
      p2Moustache(ctx, hr, '#f5f6fa');
      rrect(ctx, -hr * 0.18, -hr * 1.42, hr * 0.2, hr * 0.3, 2, '#1e272e');                                              // la petite queue du béret
      ell(ctx, -hr * 0.12, -hr * 0.8, hr * 1.2, hr * 0.44, '#1e272e', true, -0.1);                                      // béret
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(-hr * 0.3, -hr * 0.92, hr * 0.5, hr * 0.12, -0.1, 0, Math.PI * 2); ctx.fill();
    },
  },
  clement: { // ado de 15 ans : sweat violet à capuche, casquette orange à l'envers, boutons, appareil dentaire, manette
    H: 104, th: 19, sh: 18.5, ankle: 5, legW: 11, foot: 22, footH: 7.5, tl: 28, tb: 15, tf: 17, hb: 14, hf: 15, belly: 1,
    ua: 17, fa: 16, armW: 10, hand: 7, hr: 20, headUp: 0.72, nose: 1, eyes: [0.2, 0.68, 0.02],
    shirt: '#5f27cd', sleeve: '#5f27cd', fore: '#5f27cd', legs: '#576574', shoes: '#fdfdfd', sole: '#b2bec3', browCol: '#3e2511',
    style: 'swing', item: 'manette', itemK: 0.9, taunt: 'beckon', special: 'impact',
    idle: { aF: [0.6, 1.5], aB: [0.4, 1.3], it: 2.2 }, mouth: 'grit', brow: 'angry',
    neckBack(ctx, R) { ctx.lineWidth = P2.ol; ell(ctx, -R.tb * 0.5, -R.tl - 2, R.tb * 0.62, 8.5, '#4a1fa8', true, -0.25); }, // capuche dans le dos
    torso(ctx, R) { // poche kangourou, cordons
      const tl = R.tl, f = R.tf;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; rrect(ctx, -f * 0.3, -tl * 0.42, f * 1.3, tl * 0.3, 4, '#4a1fa8');
      ctx.strokeStyle = '#dcd6f7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f * 0.3, -tl); ctx.lineTo(f * 0.26, -tl * 0.62); ctx.moveTo(f * 0.68, -tl); ctx.lineTo(f * 0.7, -tl * 0.66); ctx.stroke();
    },
    headTop(ctx, hr) {
      ctx.fillStyle = '#e17055'; [[0.22, 0.3], [0.5, 0.44], [0.02, 0.5]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(hr * x, hr * y, 1.8, 0, Math.PI * 2); ctx.fill(); }); // boutons d'ado
      p2Cheveux(ctx, hr, '#6d4c41'); p2Casquette(ctx, hr, '#ff9f43', '#e67e22');
    },
  },
  cecile: { // blonde, pas très grande, haut rose, jupe sombre, toujours au téléphone
    H: 105, th: 19, sh: 19, ankle: 5, legW: 10, foot: 20, footH: 6.5, tl: 28, tb: 13.5, tf: 15.5, hb: 14.5, hf: 15.5, belly: 0,
    ua: 17, fa: 16, armW: 8.5, hand: 6.6, hr: 19.5, headUp: 0.72, nose: 0.85, eyes: [0.2, 0.68, 0.02],
    shirt: '#c2185b', sleeve: '#c2185b', fore: SKIN, legs: '#2d3436', shoes: '#c0392b', sole: '#7b241c', browCol: '#b8860b',
    style: 'swing', item: 'phone', itemK: 1.1, taunt: 'hips', special: 'impact',
    idle: { aF: [-0.2, 2.75], aB: [-0.3, 0.6], it: 2.9 }, mouth: 'flat', brow: 'angry', // (le téléphone à l'oreille)
    torso(ctx, R) { ctx.fillStyle = '#2d3436'; ctx.fillRect(-40, -R.tl * 0.3, 80, 40); ctx.fillStyle = '#f06292'; ctx.fillRect(-40, -R.tl * 0.36, 80, 3.5); }, // jupe, ceinture
    headBack(ctx, hr) { // longs cheveux blonds dans le dos
      ctx.beginPath(); ctx.moveTo(-hr * 0.2, -hr * 1.02); ctx.quadraticCurveTo(-hr * 1.5, -hr * 0.7, -hr * 1.42, hr * 1.2); ctx.quadraticCurveTo(-hr * 1.3, hr * 2.2, -hr * 0.55, hr * 2.25);
      ctx.quadraticCurveTo(hr * 0.1, hr * 1.5, hr * 0.1, hr * 0.3); ctx.closePath(); ctx.fillStyle = '#eac24f'; ctx.fill(); ctx.stroke();
    },
    headTop(ctx, hr) {
      ctx.fillStyle = 'rgba(255,120,150,.4)'; ctx.beginPath(); ctx.arc(hr * 0.3, hr * 0.34, hr * 0.2, 0, Math.PI * 2); ctx.fill(); // joue rose
      p2Cheveux(ctx, hr, '#f6d365', 'rgba(255,255,255,.55)');
    },
    front(ctx, R, o, hc) { // « dring » quand elle prépare son attaque
      if (o.pose !== 'windup' && o.pose !== 'special') return;
      ctx.strokeStyle = '#ff7675'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(hc.x + R.hr * 0.2, hc.y - R.hr * 0.9, 9 + i * 8 + ((o.t || 0) * 30) % 8, -2.4, -0.7); ctx.stroke(); }
    },
  },
  leblond: { // l'astronome : la taille de Faouzi, mince, blond avec une grande mèche, veste bleu nuit étoilée, télescope en laiton
    H: 119, th: 21, sh: 21, ankle: 5, legW: 10, foot: 21, footH: 6.5, tl: 33, tb: 13.5, tf: 15.5, hb: 11.5, hf: 12.5, belly: 0,
    ua: 19, fa: 18, armW: 8.5, hand: 7, hr: 22, headUp: 0.7, nose: 1.1, eyes: [0.2, 0.68, -0.02],
    shirt: '#1e3799', sleeve: '#1e3799', fore: '#1e3799', legs: '#2c3e50', shoes: '#1b1b1b', sole: '#000', browCol: '#c9a227',
    style: 'swing', item: 'telescope', itemK: 1, taunt: 'point', special: 'impact',
    idle: { aF: [0.4, 1.25], aB: [-0.25, 0.5], it: 2.45 }, mouth: 'smirk', brow: 'smug',
    torso(ctx, R) { // étoiles sur la veste
      ctx.fillStyle = '#feca57'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      [[-0.3, -0.82], [0.75, -0.7], [0.1, -0.48], [0.9, -0.3], [-0.4, -0.2]].forEach(([x, y]) => ctx.fillText('★', R.tf * x, R.tl * y + 4));
    },
    headTop(ctx, hr) { // blond, grande mèche vers l'avant
      p2Cheveux(ctx, hr, '#f9e79f', 'rgba(255,255,255,.6)');
      ctx.beginPath(); ctx.moveTo(-hr * 0.35, -hr * 1.06); ctx.quadraticCurveTo(hr * 0.9, -hr * 1.5, hr * 1.22, -hr * 0.5); ctx.quadraticCurveTo(hr * 0.6, -hr * 0.82, hr * 0.02, -hr * 0.5); ctx.closePath();
      ctx.fillStyle = '#f9e79f'; ctx.fill(); ctx.stroke();
    },
  },
});
RIGS.minipurf = Object.assign({}, RIGS.purf, { H: 91, mini: 0.7 }); // Mini Purf : le même pantin que The Purf, en plus petit

// ---------- Clapet 3000 : téléphone noir à clapet (repère : ancienne taille, agrandie de 23 % par drawMiniBoss) ----------
function drawClapet(ctx, o) {
  const t = o.t || 0, pose = o.pose || 'idle', pt = o.poseT || 0, dir = o.dir || 1, mood = bMood(pose);
  const sw = pose === 'walk' ? Math.sin(o.walk || 0) : 0, frappe = pose === 'attack' || pose === 'special';
  ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol;
  [[-11, sw, '#c23b48'], [11, -sw, '#ff4757']].forEach(([lx, k, col]) => { // jambes fines, baskets rouges
    bTrait(ctx, c => { c.moveTo(lx, -22); c.lineTo(lx + k * 3 + 1, -12); c.lineTo(lx + k * 7, -3); }, 5, '#2d3436'); rrect(ctx, lx + k * 7 - 6, -6.5, 18, 7.5, 3.5, col); });
  bTrait(ctx, c => { c.moveTo(-24, -52); c.lineTo(-36, -43); c.lineTo(-34, -31); }, 5, '#2d3436'); circle(ctx, -34, -30, 5.2, '#f5f6fa'); // bras du fond, gant blanc
  // bas du téléphone : le clavier
  rrect(ctx, -27, -73, 54, 53, 9, '#26262c');
  ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(-23, -66, 4, 40);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) rrect(ctx, -14.5 + c * 11, -62 + r * 10, 8, 6.5, 2, r === 3 && c !== 1 ? '#57606f' : '#8b95a5', false);
  rrect(ctx, -9, -68.5, 18, 3.5, 1.5, '#a4b0be', false);
  rrect(ctx, -29, -79, 58, 10, 5, '#3d4452'); // charnière
  // couvercle (écran) : s'ouvre en grand pour préparer, claque vers l'avant pour frapper
  let ang = Math.sin(t * 2) * 0.05;
  if (pose === 'windup') ang = -0.5 + Math.sin(t * 30) * 0.05;
  else if (frappe) ang = Math.sin(Math.min(1, pt * 1.6) * Math.PI) * 1.25;
  else if (mood === 'hurt' || mood === 'ko') ang = 0.45;
  ctx.save(); ctx.translate(0, -74); ctx.rotate(ang);
  rrect(ctx, 14, -73, 6.5, 17, 3, '#3d4452'); circle(ctx, 17.2, -74, 3.4, Math.floor(t * 4) % 2 ? '#ff4757' : '#c0392b'); // antenne
  rrect(ctx, -27, -61, 54, 61, 9, '#26262c');
  ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(-23, -56, 4, 50);
  const scr = ctx.createLinearGradient(0, -53, 0, -17); scr.addColorStop(0, '#8fd3ff'); scr.addColorStop(1, '#0984e3');
  rrect(ctx, -21, -54, 42, 37, 5, scr);
  bOeil(ctx, -7.5, -40, 5.2, mood, t, { cote: -1, iris: '#0c2461' }); bOeil(ctx, 8.5, -40, 5.2, mood, t, { iris: '#0c2461' }); // son visage, sur l'écran
  if (mood === 'angry') { rrect(ctx, -7, -30, 16, 8, 3, '#0c2461'); ctx.fillStyle = '#fff'; ctx.fillRect(-5, -30, 3.5, 3); ctx.fillRect(0.5, -30, 3.5, 3); ctx.fillRect(5, -30, 2.5, 3); }
  else { ctx.strokeStyle = '#0c2461'; ctx.lineWidth = 2.4; ctx.beginPath(); if (mood === 'calm') ctx.arc(0.5, -29, 6, 0.25, Math.PI - 0.25); else { ctx.moveTo(-6, -25); ctx.lineTo(-2, -28); ctx.lineTo(2, -25); ctx.lineTo(6, -28); } ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = BETE.ol; }
  bTexte(ctx, 'CLAPET 3000', 0, -6.5, dir, 'bold 7px Arial', '#dfe6e9');
  ctx.restore();
  // bras de devant : poing levé avant de frapper, tendu pendant le coup
  const main = pose === 'windup' ? [[31, -64], [27, -78]] : frappe ? [[38, -52], [50, -50]] : [[35, -43 + Math.sin(t * 4) * 1.5], [37, -31]];
  bTrait(ctx, c => { c.moveTo(25, -53); c.lineTo(main[0][0], main[0][1]); c.lineTo(main[1][0], main[1][1]); }, 5, '#2d3436'); circle(ctx, main[1][0], main[1][1], 5.8, '#f5f6fa');
}

// Mini-boss (même convention que drawMinion : o = { dir, scale, t, walk, pose, poseT })
function drawMiniBoss(ctx, kind, o = {}) {
  const pose = o.pose || 'idle';
  if (!P2.ancien && persoRig(kind)) { drawPerso(ctx, kind, o); return; } // pantins articulés (persos.js)
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale((o.dir || 1) * (o.scale || 1), o.scale || 1);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (!P2.ancien && kind === 'clapet') { // touché : il part en arrière ; à terre : couché sur le dos
    ctx.scale(BETE.gros, BETE.gros);
    if (pose === 'hurt') ctx.rotate(-0.15); else if (pose === 'down') { ctx.translate(-6, -27); ctx.rotate(-Math.PI / 2); }
    drawClapet(ctx, o);
  } else if (!P2.ancien && kind === 'moutong') { // le mouton de betes.js, en très grand, avec ses cornes ; il charge tête baissée
    const s = 2.6, pt = o.poseT || 0, ol = BETE.ol, ruee = pose === 'special';
    const lunge = pose === 'attack' ? Math.sin(Math.min(1, pt * 1.4) * Math.PI) * 18 : pose === 'windup' ? -8 : 0;
    if (pose === 'hurt') ctx.rotate(-0.12); else if (pose === 'down') { ctx.translate(0, -56 * s); ctx.scale(1, -1); } // à terre : sur le dos
    BETE.ol = ol * 0.6; // (trait intérieur moins épais : le dessin est très agrandi)
    drawMouton(ctx, lunge, 0, o.t || 0, s, { pose: ruee ? 'walk' : pose, walk: ruee ? (o.t || 0) * 12 : (o.walk || 0) * 0.8, belier: true, charge: ruee });
    BETE.ol = ol;
  } else { // ancien dessin (planche de style)
    _face.pose = pose; _face.t = o.t || 0;
    if (kind === 'clapet') { if (pose === 'down') ctx.rotate(-0.6); drawFlipPhone(ctx, o); }
    else if (kind === 'moutong') { if (pose === 'down' || pose === 'hurt') ctx.rotate(pose === 'down' ? -0.5 : -0.12); drawBigSheep(ctx, o); }
    else if (kind === 'minipurf') { ctx.scale(0.73, 0.73); drawHumanoid(ctx, HUMANS.purf, o); }
    else if (HUMANS[kind]) drawHumanoid(ctx, HUMANS[kind], o);
  }
  ctx.restore();
}
// Mini-boss dans les menus et les bandeaux (même rendu cartoon qu'en jeu)
function miniSprite(ctx, kind, o) {
  const d = MINIBOSSES[kind], sc = o.scale || 1, rig = persoRig(kind);
  if (rig) { // pantin : même boîte que les héros (menuSprite, ui.js)
    const H = rig.H * sc, r = (rig.H * 0.95 + 75) * sc;
    drawSprite(ctx, { x: -r, y: -H - 120 * sc, w: r * 2, h: H + 148 * sc }, x => drawMiniBoss(x, kind, o), { outline: P2.contour * Math.sqrt(sc), shade: { top: -H } }); return;
  }
  const h = d.bh * sc, r = (d.range + d.bw * 0.6 + 60) * sc;
  drawSprite(ctx, { x: -r, y: -h - 120 * sc, w: r * 2, h: h + 140 * sc }, x => drawMiniBoss(x, kind, o), { outline: 3.8 * Math.sqrt(sc), shade: { top: -h } });
}

// ---------- véhicules d'arrivée des mini-boss (dessinés tournés vers la gauche) ----------
function drawMiniVehicle(ctx, v) {
  const t = v.t, moving = v.state === 'drive';
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  const wheel = (x, r, rim) => {
    ctx.save(); ctx.translate(x, -r); circle(ctx, 0, 0, r, '#1e272e'); circle(ctx, 0, 0, r * 0.5, rim);
    ctx.rotate(moving ? t * 16 : 0); ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.85, 0); ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = 3;
  };
  const bump = moving ? Math.abs(Math.sin(t * 18)) * 2 : 0;
  if (v.type === 'solex') { // le solex de Marcel (moteur sur la roue avant)
    wheel(-42, 20, '#bdc3c7'); wheel(42, 20, '#bdc3c7');
    ctx.translate(0, -bump);
    ctx.lineWidth = 5; ctx.strokeStyle = '#2d3436';
    ctx.beginPath(); ctx.moveTo(-42, -20); ctx.lineTo(-30, -62); ctx.lineTo(28, -40); ctx.lineTo(42, -20); ctx.stroke(); // cadre
    ctx.beginPath(); ctx.moveTo(-30, -62); ctx.lineTo(-38, -84); ctx.lineTo(-48, -86); ctx.stroke(); // guidon
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    rrect(ctx, -52, -44, 22, 18, 5, '#2d3436'); // moteur sur la roue avant
    rrect(ctx, 14, -52, 30, 8, 4, '#6d4c41'); // selle
    rrect(ctx, 40, -50, 26, 14, 2, '#d35400'); // panier de baguettes
    ctx.fillStyle = '#e1a95f'; ctx.fillRect(44, -66, 5, 18); ctx.fillRect(52, -70, 5, 22); ctx.fillRect(59, -64, 5, 16);
  } else if (v.type === 'voiturette') { // la voiture sans permis de Clément
    ctx.translate(0, -bump);
    rrect(ctx, -86, -78, 172, 58, 14, '#9b59b6');
    poly(ctx, [[-62, -76], [-42, -122], [54, -122], [66, -76]], '#ecf0f1');
    poly(ctx, [[-54, -80], [-38, -114], [4, -114], [4, -80]], '#74b9ff');
    poly(ctx, [[10, -80], [10, -114], [50, -114], [58, -80]], '#74b9ff');
    rrect(ctx, -92, -46, 18, 10, 3, '#fdfdfd'); // phare
    ctx.fillStyle = '#fff'; ctx.font = '900 13px Arial'; ctx.textAlign = 'center'; ctx.fillText('SANS PERMIS', 0, -34);
    ctx.translate(0, bump);
    wheel(-56, 20, '#dfe6e9'); wheel(56, 20, '#dfe6e9');
  }
  ctx.restore();
}

// ---------- projectiles des mini-boss ----------
function drawMiniProjectile(ctx, p, t, d) {
  switch (p.kind) {
    case 'baguette': ctx.translate(0, -56); ctx.rotate(t * 12 * d); rrect(ctx, -26, -6, 52, 12, 6, '#e1a95f');
      ctx.strokeStyle = '#b9772f'; for (let x = -16; x < 20; x += 12) { ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x + 6, -4); ctx.stroke(); } return true;
    case 'manette': ctx.translate(0, -56); ctx.rotate(t * 10 * d); ITEMS.manette(ctx); return true;
    case 'dring': // onde de sonnerie
      ctx.translate(0, -62); ctx.strokeStyle = '#ff7675'; ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-d * i * 12, 0, 16 + i * 10, d > 0 ? -0.9 : Math.PI - 0.9, d > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.font = '900 14px "Arial Black", Arial'; ctx.textAlign = 'center';
      ctx.strokeText('DRING', 0, -30); ctx.fillText('DRING', 0, -30); return true;
    case 'cellule': // cellule de tableur qui vole (« #DIV/0! »)
      ctx.translate(0, -50); ctx.rotate(Math.sin(t * 12) * 0.2);
      rrect(ctx, -24, -10, 48, 20, 2, '#ffffff'); ctx.strokeStyle = '#21a366'; ctx.lineWidth = 2.5; ctx.strokeRect(-24, -10, 48, 20);
      ctx.fillStyle = '#c0392b'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(p.txt || '#DIV/0!', 0, 4); return true;
    case 'sms': // bulle de texto
      ctx.translate(0, -60); ctx.rotate(Math.sin(t * 9) * 0.15);
      rrect(ctx, -22, -14, 44, 26, 8, '#2ed573'); poly(ctx, [[-10, 10], [-16, 20], [-2, 10]], '#2ed573', false);
      ctx.fillStyle = '#fff'; ctx.font = '900 12px Arial'; ctx.textAlign = 'center'; ctx.fillText(p.txt || 'SMS', 0, 4); return true;
  }
  return false;
}

// ---------- trou noir du Blond (au sol) ----------
function drawBlackhole(ctx, b, sx, gt) {
  ctx.save(); ctx.translate(sx, b.y);
  if (b.t < b.warn) { // annonce : cercle violet en pointillés
    const p = b.t / b.warn;
    ctx.strokeStyle = `rgba(155,89,182,${0.5 + warnPulse(gt) * 0.5})`; ctx.lineWidth = 3; ctx.setLineDash([10, 7]);
    ctx.beginPath(); ctx.ellipse(0, 0, b.r, b.r * 0.4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = `rgba(108,52,131,${0.15 + 0.25 * p})`; ctx.beginPath(); ctx.ellipse(0, 0, b.r * p, b.r * 0.4 * p, 0, 0, Math.PI * 2); ctx.fill();
  } else { // trou noir qui tourne et aspire
    const k = Math.min(1, (b.t - b.warn) / 0.25) * Math.min(1, b.life / 0.3);
    ctx.scale(k, k);
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, b.r * 1.3);
    g.addColorStop(0, '#000'); g.addColorStop(0.45, '#2c003e'); g.addColorStop(0.8, 'rgba(155,89,182,.6)'); g.addColorStop(1, 'rgba(155,89,182,0)');
    ctx.save(); ctx.scale(1, 0.42); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, b.r * 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(gt * 4); ctx.strokeStyle = 'rgba(214,162,232,.8)'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.arc(b.r * 0.35, 0, b.r * 0.6, Math.PI * 0.9, Math.PI * 1.5); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}
