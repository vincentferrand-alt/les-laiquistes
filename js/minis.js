// ============================================================
//  LES LAÏQUISTES — Dessins des mini-boss (v3.9)
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

// Mini-boss (même convention que drawMinion : o = { dir, scale, t, walk, pose, poseT })
function drawMiniBoss(ctx, kind, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale((o.dir || 1) * (o.scale || 1), o.scale || 1);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const pose = o.pose || 'idle';
  _face.pose = pose; _face.t = o.t || 0;
  if (kind === 'clapet') { if (pose === 'down') ctx.rotate(-0.6); drawFlipPhone(ctx, o); }
  else if (kind === 'moutong') { if (pose === 'down' || pose === 'hurt') ctx.rotate(pose === 'down' ? -0.5 : -0.12); drawBigSheep(ctx, o); }
  else if (kind === 'minipurf') { ctx.scale(0.73, 0.73); drawHumanoid(ctx, HUMANS.purf, o); }
  else if (HUMANS[kind]) drawHumanoid(ctx, HUMANS[kind], o);
  ctx.restore();
}
// Mini-boss dans les menus et les bandeaux (même rendu cartoon qu'en jeu)
function miniSprite(ctx, kind, o) {
  const d = MINIBOSSES[kind], sc = o.scale || 1, h = d.bh * sc, r = (d.range + d.bw * 0.6 + 40) * sc;
  drawSprite(ctx, { x: -r, y: -h - 120 * sc, w: r * 2, h: h + 140 * sc }, x => drawMiniBoss(x, kind, o), { outline: 3.2 * Math.sqrt(sc), shade: { top: -h } });
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
