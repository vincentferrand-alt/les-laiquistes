// ============================================================
//  PERSONNAGES v4 — nouveau dessin « pantin articulé » des 7 héros / boss (et du rappeur, pour l'étape 8)
//  Depuis la v4.0.0 le jeu s'en sert pour les 7 laïquistes : drawCharacter et drawHead (draw.js) passent par ici.
//  Les ennemis courants gardent l'ancien dessin (drawHumanoid, draw.js) jusqu'à l'étape 8.
//  La page tools/planche.html montre toutes les poses, ancien et nouveau dessin côte à côte.
//
//  Principe : chaque personnage est un pantin — bassin, torse, tête, deux bras et deux jambes en deux
//  segments, des mains et des pieds. Une POSE donne les angles des articulations ; le même pantin sert
//  à tous les personnages, seuls changent les proportions, les couleurs et les détails (casque, montre…).
//  Le gros contour noir autour de la silhouette est toujours posé par drawSprite (draw.js).
//
//  Comme dans draw.js : personnage tourné vers la DROITE, origine (0,0) au sol, entre les pieds.
//  Angles des membres : 0 = vers le bas, π/2 = vers l'avant, π = vers le haut, négatif = vers l'arrière.
//  Ce fichier se charge après draw.js (il réutilise INK, SKIN, lerp, easeOut, rrect, circle, ell, poly).
// ============================================================

const P2 = { ol: 2.7, contour: 4.2, ancien: false }; // ol : épaisseur du trait intérieur · contour : gros contour autour de la silhouette
// (ancien : mis à vrai par la planche de style, le temps de dessiner l'ancien personnage pour comparer)
// Le pantin d'un personnage, s'il a été redessiné (sinon null : on garde l'ancien dessin)
function persoRig(kind) { return P2.ancien ? null : (RIGS[kind] || null); }

// couleur assombrie (bras et jambe du fond)
function p2Dark(hex, k = 0.74) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${((n >> 16) * k) | 0},${(((n >> 8) & 255) * k) | 0},${((n & 255) * k) | 0})`;
}
const p2Seg = (ctx, a, b) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };

// Un membre en deux segments (épaule → coude → poignet, ou hanche → genou → cheville) :
// d'abord le trait noir, plus large, puis la couleur par-dessus (le membre garde un contour net, coude compris).
function p2Limb(ctx, a, b, c, w1, w2, col1, col2) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w1 + P2.ol * 2; p2Seg(ctx, a, b);
  ctx.lineWidth = w2 + P2.ol * 2; p2Seg(ctx, b, c);
  ctx.strokeStyle = col1; ctx.lineWidth = w1; p2Seg(ctx, a, b);
  ctx.strokeStyle = col2 || col1; ctx.lineWidth = w2; p2Seg(ctx, b, c);
}

// Genou d'une jambe dont on connaît la hanche et la cheville (le genou plie vers l'avant).
// Si le pied est trop loin, il est ramené à bout de jambe.
function p2Knee(hip, foot, l1, l2) {
  let dx = foot.x - hip.x, dy = foot.y - hip.y, d = Math.hypot(dx, dy) || 0.01;
  const max = l1 + l2 - 0.4;
  if (d > max) { foot = { x: hip.x + dx / d * max, y: hip.y + dy / d * max }; dx = foot.x - hip.x; dy = foot.y - hip.y; d = max; }
  const k = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - k * k));
  return { knee: { x: hip.x + dx / d * k + dy / d * h, y: hip.y + dy / d * k - dx / d * h }, foot };
}

// Petite étoile à 4 branches (reflet de la montre)
function p2Spark(ctx, x, y, r, col = '#fff') {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, k = i % 2 ? r * 0.28 : r; ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); }
  ctx.closePath(); ctx.fill();
}

// ---------- Mains (repère du poignet : +y = prolongement de l'avant-bras, +x = côté du pouce) ----------
// type : fist (poing) · open (ouverte, doigts écartés) · flat (ouverte, doigts serrés : porter) · beckon (« viens ! »)
function p2Hand(ctx, type, r, skin, t = 0, glove = null) {
  ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (glove) { // gant de boxe : gros poing rembourré, pouce, manchette blanche, reflet
    ctx.lineWidth = P2.ol * 0.9;
    ell(ctx, r * 0.85, r * 0.55, r * 0.62, r * 0.9, glove, true, -0.3);
    ell(ctx, 0, r * 0.95, r * 1.42, r * 1.5, glove);
    ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.beginPath(); ctx.ellipse(-r * 0.45, r * 0.55, r * 0.5, r * 0.28, -0.6, 0, Math.PI * 2); ctx.fill();
    rrect(ctx, -r * 1.05, -r * 0.95, r * 2.1, r * 0.8, r * 0.25, '#fdfdfd');
    return;
  }
  if (type === 'fist') {
    ctx.lineWidth = P2.ol * 0.85;
    rrect(ctx, -r, -r * 0.55, r * 2, r * 1.95, r * 0.8, skin);
    ctx.lineWidth = Math.max(1.1, r * 0.17); // doigts repliés
    ctx.beginPath(); [-0.45, 0.05, 0.5].forEach(x => { ctx.moveTo(x * r, r * 0.8); ctx.lineTo(x * r, r * 1.3); }); ctx.stroke();
    ctx.lineWidth = P2.ol * 0.85; ell(ctx, r * 0.5, r * 0.28, r * 0.42, r * 0.72, skin, true, -0.35); // pouce, en travers
    return;
  }
  // main ouverte : paume, 4 doigts, pouce — en deux passes (noir puis peau) pour une silhouette d'un seul tenant
  const curl = type === 'beckon' ? 1.0 + Math.sin(t * 16) * 0.45 : 0, spread = type === 'flat' ? 0.07 : 0.3;
  const segs = [[0, -r * 0.3, 0, r * 0.5, r * 1.7]]; // paume
  for (let i = 0; i < 4; i++) {
    const a = (i - 1.5) * spread + curl, bx = (i - 1.5) * r * 0.44, by = r * 0.75, len = r * (i === 1 || i === 2 ? 1.1 : 0.9);
    segs.push([bx, by, bx + Math.sin(a) * len, by + Math.cos(a) * len, r * 0.44]);
  }
  segs.push([r * 0.6, r * 0.05, r * 1.35, r * 0.55, r * 0.46]); // pouce
  [P2.ol * 1.7, 0].forEach((extra, pass) => {
    ctx.strokeStyle = pass ? skin : INK;
    segs.forEach(s => { ctx.lineWidth = s[4] + extra; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); });
  });
}

// ---------- Chaussure (repère de la cheville ; le sol est à +ah ; angle 0 = à plat, pointe vers l'avant) ----------
function p2Shoe(ctx, R, col, dark) {
  const L = R.foot, ah = R.ankle, fh = R.footH || 7;
  ctx.beginPath();
  ctx.moveTo(-L * 0.32, ah);
  ctx.lineTo(L * 0.66, ah);
  ctx.quadraticCurveTo(L * 0.8, ah - fh * 0.9, L * 0.46, ah - fh * 1.05);
  ctx.quadraticCurveTo(L * 0.16, ah - fh * 1.5, -L * 0.02, ah - fh * 1.75);
  ctx.lineTo(-L * 0.3, ah - fh * 1.75);
  ctx.quadraticCurveTo(-L * 0.42, ah - fh * 0.6, -L * 0.32, ah);
  ctx.closePath();
  ctx.fillStyle = dark ? p2Dark(col) : col; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = R.sole || '#222'; ctx.fillRect(-L, ah - 2.6, L * 2, 4); ctx.restore(); // semelle
  ctx.strokeStyle = INK; ctx.lineWidth = P2.ol; ctx.stroke();
}

// ---------- Objets tenus (repère de la main : +y = direction de l'objet) ----------
const P2_ITEMS = {
  truelle(ctx) { // truelle de maçon : manche en bois, col en acier, large lame en losange
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    rrect(ctx, -4, -10, 8, 20, 3.5, '#d35400');
    rrect(ctx, -2.2, 9, 4.4, 9, 1.5, '#7f8fa6');
    poly(ctx, [[0, 15], [15, 33], [0, 64], [-15, 33]], '#cfd8dc');
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(9, 33); ctx.lineTo(0, 54); ctx.fill();
  },
  cartouche(ctx) { // cartouche de jeu vidéo : boîtier gris, étiquette rose, contacts
    ctx.save(); ctx.translate(0, 17); ctx.rotate(0.12); ctx.scale(1.15, 1.15);
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    rrect(ctx, -13, -16, 26, 32, 3, '#8f9a9c');
    rrect(ctx, -9, -11, 18, 14, 2, '#e84393');
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-7, -9, 8, 3);
    ctx.fillStyle = '#2d3436'; for (let i = -8; i <= 8; i += 4) ctx.fillRect(i - 1, 9, 2, 6);
    ctx.restore();
  },
  pelleGrande(ctx) { // grande pelle : long manche, poignée en T, large fer
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
    rrect(ctx, -3.6, -36, 7.2, 114, 3, '#a0522d');
    rrect(ctx, -10, -43, 20, 9, 3.5, '#8a4522');
    poly(ctx, [[-17, 74], [17, 74], [14, 108], [0, 120], [-14, 108]], '#aab4b8');
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-10, 79, 5, 22);
  },
  batte(ctx) { // batte de baseball : pommeau, manche bandé, gros bout arrondi
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(3, -9); ctx.lineTo(3.5, 22); ctx.lineTo(8, 62);
    ctx.quadraticCurveTo(8, 76, 0, 76); ctx.quadraticCurveTo(-8, 76, -8, 62); ctx.lineTo(-3.5, 22); ctx.closePath();
    ctx.fillStyle = '#e2b877'; ctx.fill(); ctx.stroke();
    ell(ctx, 0, -10, 5, 3.2, '#e2b877');
    ctx.strokeStyle = 'rgba(120,70,20,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2, 36); ctx.lineTo(-3, 66); ctx.stroke();
    ctx.strokeStyle = '#b33'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(4, 14); ctx.moveTo(-4, 19); ctx.lineTo(4, 19); ctx.stroke();
  },
};

// ---------- Visage (repère de la tête : centre du crâne en (0,0), hr = rayon) ----------
// f = { eye, brow, mouth } · eye : open | angry | wide | half | happy | shut | x | blink
// brow : calm | angry | sad | up | smug · mouth : smile | flat | smirk | grin | laugh | shout | grit | o | ouch | tongue
function p2Brow(ctx, x, y, w, h, kind, near, col) {
  const s = near ? 1 : -1; // les sourcils froncés descendent vers le milieu du visage
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.beginPath();
  if (kind === 'angry') { ctx.moveTo(x - s * w, y - h * 0.55); ctx.lineTo(x + s * w, y + h * 0.5); }
  else if (kind === 'sad') { ctx.moveTo(x - s * w, y + h * 0.2); ctx.lineTo(x + s * w, y - h * 0.6); }
  else if (kind === 'up' || (kind === 'smug' && near)) { ctx.moveTo(x - w, y - h * 0.5); ctx.quadraticCurveTo(x, y - h * 1.5, x + w, y - h * 0.5); }
  else { ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - h * 0.35, x + w, y); }
  ctx.stroke();
}
function p2Eye(ctx, x, y, rx, ry, kind, near, skin, bare) {
  ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const lw = Math.max(1.5, rx * 0.36);
  if (kind === 'shut' || kind === 'x' || kind === 'happy' || kind === 'blink') {
    ctx.lineWidth = Math.max(1.9, rx * 0.5); ctx.beginPath();
    const s = near ? 1 : -1;
    if (kind === 'shut') { ctx.moveTo(x - s * rx, y - ry * 0.75); ctx.lineTo(x + s * rx * 0.8, y); ctx.lineTo(x - s * rx, y + ry * 0.75); }           // > <
    else if (kind === 'x') { ctx.moveTo(x - rx, y - ry * 0.8); ctx.lineTo(x + rx, y + ry * 0.8); ctx.moveTo(x + rx, y - ry * 0.8); ctx.lineTo(x - rx, y + ry * 0.8); }
    else if (kind === 'happy') { ctx.moveTo(x - rx * 1.1, y + ry * 0.35); ctx.quadraticCurveTo(x, y - ry * 1.1, x + rx * 1.1, y + ry * 0.35); }     // ^ ^
    else { ctx.moveTo(x - rx, y); ctx.lineTo(x + rx, y); }
    ctx.stroke(); return;
  }
  const h = kind === 'angry' ? ry * 0.82 : kind === 'wide' ? ry * 1.2 : ry, w = kind === 'wide' ? rx * 1.15 : rx;
  if (bare) { // derrière des lunettes : juste la pupille (petite quand il a peur) et son reflet
    const pr = kind === 'wide' ? rx * 0.3 : rx * 0.52;
    circle(ctx, x + rx * 0.3, y + (kind === 'half' ? ry * 0.3 : ry * 0.05), pr, INK, false);
    circle(ctx, x + rx * 0.12, y - ry * 0.18, pr * 0.34, '#fff', false);
    return;
  }
  ctx.lineWidth = lw; ell(ctx, x, y, w, h, '#fff');
  const pr = kind === 'wide' ? w * 0.42 : w * 0.62;
  circle(ctx, x + w * 0.32, y + (kind === 'half' ? h * 0.25 : h * 0.08), pr, INK, false);
  circle(ctx, x + w * 0.1, y - h * 0.28, pr * 0.36, '#fff', false);
  if (kind === 'half') { // paupière à moitié baissée (air suffisant)
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = skin; ctx.fillRect(x - w - 1, y - h - 1, w * 2 + 2, h * 0.95); ctx.restore();
    ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - w, y - h * 0.08); ctx.lineTo(x + w, y - h * 0.08); ctx.stroke();
  }
}
function p2Mouth(ctx, x, y, hr, kind, R) {
  const w = hr * 0.3;
  ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.6, hr * 0.085);
  const teeth = (yy, hh) => { ctx.fillStyle = '#fff'; ctx.fillRect(x - w * 2, yy, w * 4, hh); };
  switch (kind) {
    case 'flat': ctx.beginPath(); ctx.moveTo(x - w * 0.7, y); ctx.lineTo(x + w * 0.8, y + hr * 0.03); ctx.stroke(); break;
    case 'smirk': ctx.beginPath(); ctx.moveTo(x - w * 0.8, y + hr * 0.04); ctx.quadraticCurveTo(x + w * 0.3, y + hr * 0.14, x + w * 1.0, y - hr * 0.1); ctx.stroke(); break;
    case 'o': ell(ctx, x + w * 0.2, y + hr * 0.04, w * 0.42, w * 0.55, '#5a1410'); break;
    case 'tongue': // bouche de travers, langue pendante
      ctx.beginPath(); ctx.moveTo(x - w * 0.7, y); ctx.quadraticCurveTo(x, y + hr * 0.1, x + w * 0.9, y - hr * 0.02); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - w * 0.1, y + hr * 0.05); ctx.quadraticCurveTo(x - w * 0.2, y + hr * 0.42, x + w * 0.3, y + hr * 0.4); ctx.quadraticCurveTo(x + w * 0.7, y + hr * 0.36, x + w * 0.6, y + hr * 0.03);
      ctx.closePath(); ctx.fillStyle = '#ff6b81'; ctx.fill(); ctx.stroke(); break;
    case 'grit': // dents serrées
      ctx.beginPath(); ctx.roundRect(x - w * 0.9, y - hr * 0.1, w * 2, hr * 0.24, hr * 0.08); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - w * 0.9, y + hr * 0.02); ctx.lineTo(x + w * 1.1, y + hr * 0.02);
      [-0.3, 0.35].forEach(k => { ctx.moveTo(x + w * k, y - hr * 0.1); ctx.lineTo(x + w * k, y + hr * 0.14); }); ctx.stroke(); break;
    case 'grin': // large sourire, dents visibles
      ctx.beginPath(); ctx.moveTo(x - w * 1.0, y - hr * 0.08); ctx.lineTo(x + w * 1.15, y - hr * 0.14);
      ctx.quadraticCurveTo(x + w * 0.9, y + hr * 0.26, x - w * 0.1, y + hr * 0.22); ctx.quadraticCurveTo(x - w * 0.9, y + hr * 0.18, x - w * 1.0, y - hr * 0.08); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      if (R.goldTooth) { ctx.fillStyle = '#f1c40f'; ctx.fillRect(x + w * 0.25, y - hr * 0.1, w * 0.4, hr * 0.17); ctx.strokeRect(x + w * 0.25, y - hr * 0.1, w * 0.4, hr * 0.17); }
      break;
    case 'laugh': case 'shout': case 'ouch': { // bouche grande ouverte : dents en haut, langue en bas
      const hh = hr * (kind === 'shout' ? 0.3 : kind === 'ouch' ? 0.24 : 0.26), ww = w * (kind === 'ouch' ? 0.8 : 1.05);
      ctx.save(); ctx.translate(x + w * 0.1, y); if (kind === 'ouch') ctx.rotate(0.25);
      ctx.beginPath();
      if (kind === 'laugh') { ctx.moveTo(-ww, -hh * 0.5); ctx.lineTo(ww, -hh * 0.75); ctx.quadraticCurveTo(ww * 0.9, hh * 1.3, 0, hh * 1.2); ctx.quadraticCurveTo(-ww * 0.9, hh * 1.1, -ww, -hh * 0.5); ctx.closePath(); }
      else ctx.ellipse(0, hh * 0.1, ww * 0.82, hh, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5a1410'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#ff6b81'; ctx.beginPath(); ctx.ellipse(0, hh * 1.05, ww * 0.6, hh * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-ww * 2, -hh * 1.2, ww * 4, hh * (kind === 'laugh' ? 0.85 : 0.6));
      ctx.restore(); ctx.stroke(); ctx.restore(); break;
    }
    default: ctx.beginPath(); ctx.moveTo(x - w * 0.8, y - hr * 0.02); ctx.quadraticCurveTo(x + w * 0.1, y + hr * 0.16, x + w * 0.95, y - hr * 0.06); ctx.stroke(); // sourire
  }
}
function p2Face(ctx, R, f, t) {
  const hr = R.hr, skin = R.skin || SKIN, E = R.eyes || [0.2, 0.66, -0.1];
  const x1 = hr * E[0], x2 = hr * E[1], ey = hr * E[2], rx = hr * 0.235, ry = hr * 0.31;
  ctx.fillStyle = 'rgba(255,110,80,.22)'; ctx.beginPath(); ctx.ellipse(hr * 0.02, hr * 0.38, hr * 0.2, hr * 0.13, 0, 0, Math.PI * 2); ctx.fill(); // joue
  if (R.glasses) R.glasses(ctx, hr, f, x1, x2, ey, 0); // verres (derrière les yeux)
  if (!R.shades) { p2Eye(ctx, x2, ey, rx * 0.8, ry * 0.9, f.eye, false, skin, !!R.glasses); p2Eye(ctx, x1, ey, rx, ry, f.eye, true, skin, !!R.glasses); }
  if (R.glasses) R.glasses(ctx, hr, f, x1, x2, ey, 1); // montures (devant)
  const by = ey - ry * (R.shades ? 1.75 : 1.45) - (R.browUp || 0) * hr;
  ctx.lineWidth = Math.max(2.6, hr * 0.15);
  if (!(R.browHide && (f.brow === 'calm' || f.brow === 'up' || f.brow === 'smug'))) { // (sous un casque : seuls les sourcils froncés ou tristes dépassent)
    p2Brow(ctx, x2, by, rx * 1.0, ry * 0.8, f.brow, false, R.browCol || INK);
    p2Brow(ctx, x1, by, rx * 1.25, ry * 0.8, f.brow, true, R.browCol || INK);
  }
  p2Mouth(ctx, hr * 0.42, hr * 0.5, hr, f.mouth, R);
  if (f.sweat) { // goutte de sueur (effort)
    ctx.fillStyle = '#74d0ff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(-hr * 0.2, -hr * 0.55); ctx.quadraticCurveTo(-hr * 0.02, -hr * 0.2, -hr * 0.2, -hr * 0.16); ctx.quadraticCurveTo(-hr * 0.38, -hr * 0.2, -hr * 0.2, -hr * 0.55); ctx.fill(); ctx.stroke();
  }
}
// Crâne avec le nez en relief (profil trois quarts), oreille, puis cheveux / chapeau et visage
function p2Head(ctx, R, f, t) {
  const hr = R.hr, skin = R.skin || SKIN, n = R.nose || 1;
  ctx.strokeStyle = INK; ctx.lineWidth = P2.ol;
  if (R.headBack) R.headBack(ctx, hr, f, t);
  ctx.beginPath();
  ctx.arc(0, 0, hr, 0.52, Math.PI * 2 - 0.04);
  ctx.bezierCurveTo(hr * (1 + 0.3 * n), hr * 0.0, hr * (1 + 0.36 * n), hr * 0.46, hr * Math.cos(0.52), hr * Math.sin(0.52));
  ctx.closePath(); ctx.fillStyle = skin; ctx.fill(); ctx.stroke();
  ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(150,70,30,.14)'; ctx.beginPath(); ctx.arc(-hr * 0.95, hr * 0.35, hr * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.restore(); // ombre à l'arrière du crâne
  if (R.skinFx) R.skinFx(ctx, hr, f, t); // barbe de trois jours…
  ctx.strokeStyle = INK; ctx.lineWidth = P2.ol * 0.8; circle(ctx, -hr * 0.42, hr * 0.14, hr * 0.2, skin); // oreille
  ctx.beginPath(); ctx.arc(-hr * 0.4, hr * 0.14, hr * 0.09, 0.6, 3.6); ctx.stroke();
  p2Face(ctx, R, f, t);
  ctx.strokeStyle = INK; ctx.lineWidth = P2.ol;
  if (R.headTop) R.headTop(ctx, hr, f, t);
}

// ============================================================
//  LES PERSONNAGES — proportions, couleurs, détails
//  th / sh : cuisse / tibia · tl : torse · tb / tf : demi-largeur du torse derrière / devant (épaules) · hb / hf : idem aux hanches
//  ua / fa : bras / avant-bras · hr : rayon de la tête · H : hauteur totale dessinée (pour les boîtes d'affichage)
//  style : 'swing' (arme qu'on abat) ou 'punch' (coup de poing) · idle : position de garde des bras
// ============================================================
const RIGS = {
  christian: { // petit, trapu, casque de chantier, lunettes rondes, cheveux gris, truelle
    H: 119, th: 17, sh: 17, ankle: 5, legW: 15, foot: 23, footH: 8, tl: 30, tb: 22, tf: 25, hb: 20, hf: 22, belly: 6,
    ua: 16, fa: 15, armW: 12, hand: 8.5, hr: 24.5, headUp: 0.62, nose: 1.15, eyes: [0.14, 0.7, 0.1], browHide: true, browUp: -0.16,
    shirt: '#a9b6b8', sleeve: '#a9b6b8', fore: SKIN, legs: '#34495e', shoes: '#7a4a2a', sole: '#2b2b2b', browCol: '#4b5358',
    style: 'swing', item: 'truelle', taunt: 'point', portraitY: 0.5,
    idle: { aF: [0.35, 1.0], aB: [-0.45, 0.85], it: 2.0 }, mouth: 'smile',
    torso(ctx, R) { // chemise grise, salopette bleu ardoise : bavette, bretelles, boutons, poche
      const tl = R.tl;
      ctx.fillStyle = '#34495e'; ctx.fillRect(-40, -tl * 0.62, 80, tl);
      ctx.fillRect(-R.tb * 0.2, -tl - 4, 8, tl * 0.5); ctx.fillRect(R.tf * 0.5, -tl - 4, 8, tl * 0.5); // bretelles
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-40, -tl * 0.62, 80, 3);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      circle(ctx, -R.tb * 0.2 + 4, -tl * 0.55, 2.6, '#f1c40f'); circle(ctx, R.tf * 0.5 + 4, -tl * 0.55, 2.6, '#f1c40f');
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.roundRect(R.tf * 0.05, -tl * 0.4, 13, 10, 2); ctx.stroke();
    },
    headBack(ctx, hr) { // cheveux gris qui dépassent du casque, derrière
      ctx.lineWidth = P2.ol * 0.8;
      circle(ctx, -hr * 0.86, -hr * 0.16, hr * 0.26, '#cfd6da'); circle(ctx, -hr * 0.84, hr * 0.18, hr * 0.3, '#cfd6da'); circle(ctx, -hr * 0.64, hr * 0.54, hr * 0.24, '#cfd6da');
    },
    glasses(ctx, hr, f, x1, x2, ey, front) { // grosses lunettes rondes : le verre sert de blanc de l'œil
      const r1 = hr * 0.34, r2 = hr * 0.28;
      if (!front) { ctx.fillStyle = '#f6fbff'; ctx.beginPath(); ctx.arc(x1, ey, r1, 0, Math.PI * 2); ctx.arc(x2, ey, r2, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x1, ey, r1, 0, Math.PI * 2); ctx.moveTo(x2 + r2, ey); ctx.arc(x2, ey, r2, 0, Math.PI * 2);
      ctx.moveTo(x1 - r1, ey - 1); ctx.lineTo(-hr * 0.5, ey - hr * 0.04); ctx.stroke(); // branche
    },
    headTop(ctx, hr) { // casque jaune : calotte, arête, visière orange, reflet
      const cy = -hr * 0.4;
      ctx.beginPath(); ctx.arc(0, cy, hr * 1.1, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fillStyle = '#f1c40f'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, cy, hr * 1.1, Math.PI * 1.44, Math.PI * 1.56); ctx.arc(0, cy, hr * 1.24, Math.PI * 1.56, Math.PI * 1.44, true); ctx.closePath(); ctx.fillStyle = '#f39c12'; ctx.fill(); ctx.stroke();
      rrect(ctx, -hr * 1.18, cy - hr * 0.1, hr * 2.72, hr * 0.26, hr * 0.12, '#f39c12');
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(hr * 0.5, cy - hr * 0.66, hr * 0.13, hr * 0.3, 0.7, 0, Math.PI * 2); ctx.fill();
    },
  },

  guilhem: { // grand et mince, costume sombre, cravate dorée, sans lunettes, grosse montre en or au poignet
    H: 137, th: 27, sh: 26, ankle: 5, legW: 12, foot: 23, footH: 6.5, tl: 39, tb: 15.5, tf: 17.5, hb: 13, hf: 14, belly: 0,
    ua: 23, fa: 21, armW: 10.5, hand: 7.6, hr: 21.5, headUp: 0.78, nose: 1, eyes: [0.2, 0.68, -0.06],
    shirt: '#4a5a73', sleeve: '#4a5a73', fore: '#4a5a73', legs: '#3d4b61', shoes: '#15171c', sole: '#000', browCol: '#5d2f0c',
    style: 'punch', taunt: 'watch',
    idle: { aF: [0.35, 1.8], aB: [-0.12, 0.3] }, eye: 'half', mouth: 'smirk', brow: 'smug',
    torso(ctx, R) { // veste, chemise blanche, cravate dorée, revers, bouton, pochette
      const tl = R.tl, f = R.tf;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      poly(ctx, [[-f * 0.2, -tl - 4], [f * 1.3, -tl - 4], [f * 0.6, -tl * 0.3]], '#fdfdfd');
      poly(ctx, [[f * 0.36, -tl - 3], [f * 0.92, -tl - 3], [f * 0.86, -tl * 0.58], [f * 0.62, -tl * 0.36], [f * 0.4, -tl * 0.58]], '#f1c40f');
      ctx.strokeStyle = '#2b3545'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-f * 0.24, -tl - 2); ctx.lineTo(f * 0.58, -tl * 0.28); ctx.stroke(); // revers
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; circle(ctx, f * 0.58, -tl * 0.16, 2.1, '#f1c40f');
      ctx.fillStyle = '#fdfdfd'; ctx.fillRect(-R.tb * 0.55, -tl * 0.72, 7, 3.5);
    },
    wrist(ctx, R, t, active) { // poignet de chemise, bracelet et ÉNORME cadran doré (c'est son arme), reflet qui scintille
      const w = R.armW, cy = -10;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      rrect(ctx, -w / 2 - 1.5, -23, w + 3, 5.5, 1.5, '#fdfdfd');
      rrect(ctx, -w / 2 - 3, -17, w + 6, 14, 3, '#d4a017');
      const g = ctx.createRadialGradient(-3, cy - 4, 1, 0, cy, 13);
      g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#f1c40f'); g.addColorStop(1, '#c8930a');
      ctx.lineWidth = 2.4; circle(ctx, 0, cy, 12.5, g); ctx.lineWidth = 1.4; circle(ctx, 0, cy, 7.6, '#fdfdfd');
      ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(0, cy - 5); ctx.moveTo(0, cy); ctx.lineTo(3.8, cy + 1.4); ctx.stroke();
      const tw = active ? 1 : Math.max(0, Math.sin(t * 5));
      if (tw > 0.05) p2Spark(ctx, 10, cy - 11, (active ? 11 : 7) * tw);
    },
    headTop(ctx, hr) { // cheveux bruns, mèche soignée vers l'avant
      ctx.beginPath();
      ctx.moveTo(-hr * 1.03, hr * 0.2);
      ctx.arc(0, 0, hr * 1.06, Math.PI * 0.94, Math.PI * 1.58);
      ctx.bezierCurveTo(hr * 0.75, -hr * 1.42, hr * 1.28, -hr * 0.98, hr * 0.94, -hr * 0.5);
      ctx.quadraticCurveTo(hr * 0.42, -hr * 0.72, hr * 0.02, -hr * 0.52);
      ctx.quadraticCurveTo(-hr * 0.22, -hr * 0.42, -hr * 0.2, -hr * 0.06);
      ctx.lineTo(-hr * 0.56, -hr * 0.12);
      ctx.quadraticCurveTo(-hr * 0.72, hr * 0.22, -hr * 1.03, hr * 0.2);
      ctx.closePath(); ctx.fillStyle = '#8b4513'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,170,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hr * 0.05, -hr * 0.1, hr * 0.82, Math.PI * 1.32, Math.PI * 1.62); ctx.stroke();
    },
  },

  rappeur: { // sweat à capuche, casquette rouge à l'envers, lunettes noires, chaîne en or, batte, baskets blanches
    H: 127, th: 22, sh: 22, ankle: 5, legW: 15, foot: 25, footH: 8, tl: 36, tb: 20, tf: 22, hb: 19, hf: 20, belly: 2,
    ua: 21, fa: 19, armW: 12.5, hand: 8, hr: 21.5, headUp: 0.72, nose: 1, shades: true, goldTooth: true,
    shirt: '#6c5ce7', sleeve: '#6c5ce7', fore: '#6c5ce7', legs: '#1e272e', shoes: '#fdfdfd', sole: '#b2bec3', browCol: '#111',
    style: 'swing', item: 'batte', taunt: 'beckon',
    idle: { aF: [0.55, 1.35], aB: [0.5, 1.1], it: 2.8 }, mouth: 'flat', brow: 'angry',
    torso(ctx, R) { // poche kangourou sombre, cordons, chaîne en or avec médaillon
      const tl = R.tl, f = R.tf;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(-R.tb * 0.35, -tl * 0.36, f * 1.5, tl * 0.5, 6); ctx.fillStyle = '#2d3436'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2d3436'; ctx.fillRect(-40, -3, 80, 12); // bord-côte du bas
      ctx.strokeStyle = '#fdfdfd'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(f * 0.15, -tl); ctx.lineTo(f * 0.1, -tl * 0.72); ctx.moveTo(f * 0.75, -tl); ctx.lineTo(f * 0.82, -tl * 0.74); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f * 0.42, -tl - 4, f * 0.62, 0.35, Math.PI - 0.35); ctx.stroke();
      ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.arc(f * 0.42, -tl - 4, f * 0.62, 0.35, Math.PI - 0.35); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; circle(ctx, f * 0.42, -tl - 4 + f * 0.62 + 3, 6.5, '#f1c40f');
      ctx.save(); ctx.translate(f * 0.42, -tl + f * 0.62 + 2.5); ctx.scale(R._dir || 1, 1); // le « $ » reste lisible quand il regarde à gauche
      ctx.fillStyle = INK; ctx.font = '900 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 0); ctx.restore();
    },
    neckBack(ctx, R) { ctx.lineWidth = P2.ol; ell(ctx, -R.tb * 0.5, -R.tl - 2, R.tb * 0.62, 9, '#2d3436', true, -0.25); }, // capuche dans le dos
    headBack(ctx, hr) { ctx.lineWidth = P2.ol * 0.8; circle(ctx, -hr * 0.66, hr * 0.42, hr * 0.26, '#2b2118'); }, // cheveux courts sur la nuque
    headTop(ctx, hr, f) {
      const cy = -hr * 0.16;
      ctx.save(); ctx.translate(-hr * 0.86, cy + hr * 0.02); ctx.rotate(0.12); rrect(ctx, -hr * 1.0, -hr * 0.12, hr * 1.1, hr * 0.25, hr * 0.12, '#b71c1c'); ctx.restore(); // visière, vers l'arrière
      ctx.beginPath(); ctx.arc(0, cy, hr * 1.08, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fillStyle = '#d63031'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hr * 0.62, cy, hr * 0.32, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fillStyle = R_SKIN_DARK; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke(); // ouverture de réglage (devant, puisqu'elle est à l'envers)
      ctx.lineWidth = 1.6; circle(ctx, 0, cy - hr * 1.08, hr * 0.13, '#b71c1c');
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-hr * 0.35, cy - hr * 0.68, hr * 0.3, hr * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
      // lunettes noires (de travers quand il encaisse)
      const ko = f.eye === 'shut' || f.eye === 'x' || f.eye === 'wide';
      ctx.save(); ctx.translate(hr * 0.5, -hr * 0.06); ctx.rotate(ko ? 0.42 : 0.03);
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-hr * 0.55, -hr * 0.12); ctx.lineTo(-hr * 0.98, -hr * 0.02); ctx.stroke(); // branche
      ctx.beginPath(); ctx.roundRect(-hr * 0.58, -hr * 0.2, hr * 1.2, hr * 0.42, hr * 0.14); ctx.fillStyle = '#111'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-hr * 0.38, -hr * 0.08); ctx.lineTo(-hr * 0.12, -hr * 0.08); ctx.moveTo(hr * 0.2, -hr * 0.08); ctx.lineTo(hr * 0.36, -hr * 0.08); ctx.stroke();
      ctx.restore();
    },
  },

  fateh: { // le maître-chien : sportif, sweat violet à capuche, cheveux bruns, barbe de trois jours (Aïka est dessinée par drawCharacter)
    H: 132, th: 26, sh: 25, ankle: 5, legW: 12.5, foot: 24, footH: 7.5, tl: 38, tb: 17, tf: 19, hb: 14.5, hf: 15.5, belly: 1,
    ua: 22, fa: 20, armW: 11.5, hand: 7.8, hr: 21, headUp: 0.76, nose: 1.05, eyes: [0.2, 0.68, -0.04],
    shirt: '#8e44ad', sleeve: '#8e44ad', fore: '#8e44ad', legs: '#34495e', shoes: '#ecf0f1', sole: '#95a5a6', browCol: '#3e2511',
    style: 'punch', taunt: 'beckon', special: 'impact', devant: 40,
    idle: { aF: [0.45, 1.7], aB: [0.2, 1.5] }, mouth: 'smile',
    torso(ctx, R) { // poche kangourou, cordons blancs, bord-côte, empreinte de patte sur la poitrine
      const tl = R.tl, f = R.tf;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(-R.tb * 0.3, -tl * 0.36, f * 1.4, tl * 0.3, 5); ctx.fillStyle = '#7d3c98'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6c3483'; ctx.fillRect(-40, -3, 80, 12);
      ctx.strokeStyle = '#fdfdfd'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(f * 0.2, -tl); ctx.lineTo(f * 0.16, -tl * 0.74); ctx.moveTo(f * 0.72, -tl); ctx.lineTo(f * 0.78, -tl * 0.76); ctx.stroke();
      ctx.fillStyle = '#f5e6ff'; // empreinte de patte
      ctx.beginPath(); ctx.ellipse(f * 0.42, -tl * 0.56, 4.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      [[-4.6, -4.6], [-1.6, -6.6], [1.8, -6.6], [4.8, -4.6]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(f * 0.42 + x, -tl * 0.56 + y, 1.6, 0, Math.PI * 2); ctx.fill(); });
    },
    neckBack(ctx, R) { ctx.lineWidth = P2.ol; ell(ctx, -R.tb * 0.5, -R.tl - 2, R.tb * 0.62, 8.5, '#7d3c98', true, -0.25); }, // capuche dans le dos
    skinFx(ctx, hr) { // barbe de trois jours
      ctx.fillStyle = 'rgba(93,58,26,.36)'; ctx.beginPath();
      ctx.arc(0, 0, hr * 0.97, 0.12 * Math.PI, 0.8 * Math.PI); ctx.quadraticCurveTo(-hr * 0.1, hr * 0.3, hr * 0.5, hr * 0.26); ctx.closePath(); ctx.fill();
    },
    headTop(ctx, hr) { // cheveux bruns courts, patte devant l'oreille
      ctx.beginPath();
      ctx.moveTo(-hr * 1.04, hr * 0.26);
      ctx.arc(0, 0, hr * 1.07, Math.PI * 0.92, Math.PI * 1.74);
      ctx.quadraticCurveTo(hr * 0.5, -hr * 0.5, hr * 0.05, -hr * 0.52);
      ctx.quadraticCurveTo(-hr * 0.2, -hr * 0.44, -hr * 0.18, hr * 0.02);
      ctx.lineTo(-hr * 0.52, -hr * 0.06);
      ctx.quadraticCurveTo(-hr * 0.7, hr * 0.28, -hr * 1.04, hr * 0.26);
      ctx.closePath(); ctx.fillStyle = '#5d3a1a'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,210,160,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -hr * 0.05, hr * 0.84, Math.PI * 1.3, Math.PI * 1.6); ctx.stroke();
    },
  },

  faouzi: { // le geek : mince, grosse tête, gilet de papy boutonné, cheveux noirs avec une mèche, cartouche de jeu à la main
    H: 119, th: 21, sh: 21, ankle: 5, legW: 10, foot: 21, footH: 6.5, tl: 33, tb: 13.5, tf: 15.5, hb: 11.5, hf: 12.5, belly: 0,
    ua: 19, fa: 18, armW: 8.5, hand: 7, hr: 22.5, headUp: 0.7, nose: 1.1, eyes: [0.2, 0.68, -0.02],
    shirt: '#c9ad7a', sleeve: '#c9ad7a', fore: '#c9ad7a', legs: '#6d4c41', shoes: '#3e2723', sole: '#1b1b1b', browCol: '#111',
    style: 'swing', item: 'cartouche', taunt: 'point', special: 'impact',
    idle: { aF: [0.4, 1.35], aB: [-0.25, 0.5], it: 2.7 }, mouth: 'smile',
    torso(ctx, R) { // gilet de papy : col de chemise blanc, patte de boutonnage, boutons, poches, bord-côte
      const tl = R.tl, f = R.tf;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      poly(ctx, [[-f * 0.15, -tl - 4], [f * 1.25, -tl - 4], [f * 0.55, -tl * 0.6]], '#fdfdfd');
      ctx.fillStyle = '#b3976a'; ctx.fillRect(-40, -4, 80, 12);
      ctx.strokeStyle = '#7a6440'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f * 0.55, -tl * 0.6); ctx.lineTo(f * 0.5, 6); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) circle(ctx, f * 0.3, -tl * 0.5 + i * tl * 0.17, 2.3, '#5d4037');
      ctx.strokeStyle = 'rgba(90,70,35,.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.roundRect(-R.tb * 0.6, -tl * 0.3, 9, 7, 1.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,70,35,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); // mailles du tricot
      for (let x = -R.tb; x < f * 0.2; x += 5) { ctx.moveTo(x, -tl * 0.95); ctx.lineTo(x, -tl * 0.4); } ctx.stroke();
    },
    headTop(ctx, hr) { // cheveux noirs, mèche qui retombe sur le front
      ctx.beginPath();
      ctx.moveTo(-hr * 1.04, hr * 0.22);
      ctx.arc(0, 0, hr * 1.07, Math.PI * 0.93, Math.PI * 1.6);
      ctx.bezierCurveTo(hr * 0.95, -hr * 1.3, hr * 1.36, -hr * 0.7, hr * 1.0, -hr * 0.2);
      ctx.quadraticCurveTo(hr * 0.72, -hr * 0.62, hr * 0.05, -hr * 0.5);
      ctx.quadraticCurveTo(-hr * 0.2, -hr * 0.42, -hr * 0.18, -hr * 0.02);
      ctx.lineTo(-hr * 0.54, -hr * 0.1);
      ctx.quadraticCurveTo(-hr * 0.72, hr * 0.24, -hr * 1.04, hr * 0.22);
      ctx.closePath(); ctx.fillStyle = '#1b1b1f'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,170,220,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hr * 0.05, -hr * 0.08, hr * 0.84, Math.PI * 1.3, Math.PI * 1.62); ctx.stroke();
    },
  },

  venum: { // le boxeur : tenue gris sombre, ceinture rouge, gros gants rouges, cheveux ras, regard dur
    H: 122, th: 23, sh: 22, ankle: 5, legW: 13.5, foot: 24, footH: 7.5, tl: 35, tb: 19, tf: 21, hb: 16, hf: 17, belly: 0,
    ua: 20, fa: 18, armW: 12.5, hand: 7.8, hr: 21, headUp: 0.72, nose: 1.1, eyes: [0.2, 0.68, -0.02],
    shirt: '#636e72', sleeve: '#636e72', fore: '#636e72', legs: '#3b4347', shoes: '#1c1c1e', sole: '#d63031', browCol: '#111',
    style: 'punch', taunt: 'gloves', glove: '#d63031',
    idle: { aF: [0.95, 1.85], aB: [0.6, 1.95] }, mouth: 'flat', brow: 'angry', bounce: true,
    torso(ctx, R) { // fermeture éclair, ceinture rouge, col
      const tl = R.tl, f = R.tf;
      ctx.fillStyle = '#d63031'; ctx.fillRect(-40, -tl * 0.2, 80, 7.5);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-40, -tl * 0.2 + 7.5, 80, 1.6);
      ctx.strokeStyle = '#2d3436'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(f * 0.45, -tl - 3); ctx.lineTo(f * 0.42, -tl * 0.2); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; poly(ctx, [[f * 0.05, -tl - 4], [f * 1.2, -tl - 4], [f * 0.5, -tl * 0.74]], '#4b5457');
    },
    headTop(ctx, hr) { // cheveux ras, sombres
      ctx.beginPath();
      ctx.moveTo(-hr * 1.02, hr * 0.06);
      ctx.arc(0, 0, hr * 1.04, Math.PI * 0.98, Math.PI * 1.73);
      ctx.quadraticCurveTo(hr * 0.5, -hr * 0.6, hr * 0.05, -hr * 0.62);
      ctx.quadraticCurveTo(-hr * 0.22, -hr * 0.52, -hr * 0.2, -hr * 0.14);
      ctx.lineTo(-hr * 0.52, -hr * 0.18);
      ctx.quadraticCurveTo(-hr * 0.7, hr * 0.1, -hr * 1.02, hr * 0.06);
      ctx.closePath(); ctx.fillStyle = '#2d3436'; ctx.fill(); ctx.stroke();
    },
  },

  senoussi: { // le berger : costaud, haut orange trop court sur un gros ventre, cheveux bruns bouclés, grande pelle
    H: 133, th: 22, sh: 21, ankle: 5, legW: 16, foot: 26, footH: 8, tl: 40, tb: 24, tf: 26, hb: 23, hf: 25, belly: 17,
    ua: 21, fa: 19, armW: 14, hand: 9, hr: 24, headUp: 0.66, nose: 1.2, eyes: [0.18, 0.68, -0.02],
    shirt: '#e67e22', sleeve: '#e67e22', fore: SKIN, legs: '#34495e', shoes: '#6d4c41', sole: '#3e2723', browCol: '#5d2f0c',
    style: 'swing', item: 'pelleGrande', taunt: 'point', special: 'impact', finalIt: 1.25, grand: true, dessus: 45,
    idle: { aF: [0.5, 1.2], aB: [-0.35, 0.6], it: 3.02 }, mouth: 'grin',
    torso(ctx, R) { p2Bedaine(ctx, R, '#d35400'); },
    headBack(ctx, hr) { // boucles, derrière
      ctx.lineWidth = P2.ol * 0.8;
      [[-0.92, 0.12, 0.34], [-0.86, -0.38, 0.4], [-0.7, 0.5, 0.26]].forEach(([x, y, r]) => circle(ctx, hr * x, hr * y, hr * r, '#8b4513'));
    },
    headTop(ctx, hr) { // boucles, dessus
      ctx.lineWidth = P2.ol * 0.8;
      [[-0.5, -0.8, 0.44], [0.62, -0.74, 0.36], [0.08, -0.98, 0.46], [-0.22, -0.5, 0.3]].forEach(([x, y, r]) => circle(ctx, hr * x, hr * y, hr * r, '#8b4513'));
      ctx.fillStyle = 'rgba(255,200,150,.35)'; ctx.beginPath(); ctx.ellipse(hr * 0.15, -hr * 1.14, hr * 0.2, hr * 0.1, 0.2, 0, Math.PI * 2); ctx.fill();
    },
  },

  purf: { // le toxique : gros, haut rouge trop court sur le ventre, frange brune bien droite, moustache, nuage vert et poudre qui tombe du visage
    H: 130, th: 20, sh: 20, ankle: 5, legW: 17, foot: 26, footH: 8, tl: 42, tb: 27, tf: 30, hb: 27, hf: 30, belly: 23,
    ua: 20, fa: 18, armW: 14.5, hand: 9.5, hr: 25.5, headUp: 0.64, nose: 1.25, eyes: [0.18, 0.68, -0.06],
    shirt: '#e74c3c', sleeve: '#e74c3c', fore: SKIN, legs: '#34495e', shoes: '#1c1c1e', sole: '#000', browCol: '#3e2a1e',
    style: 'swing', taunt: 'hips', special: 'impact',
    idle: { aF: [0.3, 0.55], aB: [-0.2, 0.45] }, mouth: 'flat', brow: 'angry',
    torso(ctx, R) { p2Bedaine(ctx, R, '#c0392b'); },
    headTop(ctx, hr, f, t) {
      ctx.beginPath(); // coupe au bol : frange droite
      ctx.moveTo(-hr * 1.04, hr * 0.26);
      ctx.arc(0, 0, hr * 1.07, Math.PI * 0.92, Math.PI * 1.82);
      ctx.lineTo(hr * 1.0, -hr * 0.36); ctx.lineTo(-hr * 0.16, -hr * 0.36); ctx.lineTo(-hr * 0.18, 0);
      ctx.lineTo(-hr * 0.54, -hr * 0.06);
      ctx.quadraticCurveTo(-hr * 0.72, hr * 0.3, -hr * 1.04, hr * 0.26);
      ctx.closePath(); ctx.fillStyle = '#5c4033'; ctx.fill(); ctx.stroke();
      ctx.lineWidth = P2.ol * 0.8; // grosse moustache
      ctx.beginPath(); ctx.moveTo(hr * 0.2, hr * 0.3); ctx.quadraticCurveTo(hr * 0.62, hr * 0.14, hr * 1.02, hr * 0.32);
      ctx.quadraticCurveTo(hr * 1.06, hr * 0.56, hr * 0.62, hr * 0.46); ctx.quadraticCurveTo(hr * 0.24, hr * 0.6, hr * 0.2, hr * 0.3); ctx.closePath();
      ctx.fillStyle = '#5c4033'; ctx.fill(); ctx.stroke();
      const pul = 0.36 + Math.sin(t * 3) * 0.08; // nuage vert autour du nez et de la bouche
      ctx.fillStyle = `rgba(163,230,53,${pul})`;
      [[0.62, 0.22, 0.46], [0.98, 0.5, 0.3], [0.3, 0.6, 0.28]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(hr * x, hr * y, hr * r, 0, Math.PI * 2); ctx.fill(); });
    },
    front(ctx, R, o, hc) { // poudre toxique qui tombe du visage, jusqu'au sol
      const t = o.t || 0, hr = R.hr, n = 9, bas = Math.max(20, -hc.y - hr * 0.4);
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.9 + i / n) % 1;
        ctx.fillStyle = `rgba(163,230,53,${0.9 * (1 - ph)})`;
        ctx.fillRect(hc.x + hr * 0.45 + Math.sin(i * 3.1 + t) * hr * 0.55, hc.y + hr * 0.5 + ph * bas, 4.5, 4.5);
      }
    },
  },
};
const R_SKIN_DARK = '#e8c98a';
// Gros ventre à l'air sous un haut trop court (Senoussi, The Purf) : bande de peau, nombril, ceinture du pantalon
function p2Bedaine(ctx, R, ombre) {
  const tl = R.tl, skin = R.skin || SKIN;
  ctx.fillStyle = skin; ctx.fillRect(-60, -tl * 0.36, 120, tl);
  ctx.fillStyle = 'rgba(200,110,60,.22)'; ctx.fillRect(-60, -tl * 0.36, 120, 3.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-60, -tl * 0.36); ctx.lineTo(60, -tl * 0.36); ctx.stroke(); // bas du haut
  ctx.fillStyle = R.legs; ctx.fillRect(-60, -tl * 0.07, 120, 30);
  ctx.beginPath(); ctx.moveTo(-60, -tl * 0.07); ctx.lineTo(60, -tl * 0.07); ctx.stroke(); // ceinture
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(R.hf * 0.62, -tl * 0.2, 2.6, 0.3, Math.PI * 1.5); ctx.stroke(); // nombril
  ctx.fillStyle = ombre; ctx.globalAlpha = 0.35; ctx.fillRect(-60, -tl * 0.5, 120, tl * 0.14); ctx.globalAlpha = 1; // ombre sous la poitrine
}

// ============================================================
//  POSES — une pose = les angles du pantin. p2Key renvoie une pose-clé, p2Pose choisit / mélange selon l'état.
//  lean : inclinaison du torse (+ = vers l'avant) · hx, hy : décalage du bassin (en longueurs de jambe ; hy + = plus bas)
//  fF / fB : pied avant / arrière posé [x, hauteur] (en longueurs de jambe) — ou lF / lB : [angle de cuisse, pli du genou] en l'air
//  aF / aB : bras avant / arrière [angle de l'épaule, pli du coude] · it : angle de l'objet tenu · lie : couché (0..1)
// ============================================================
function p2Base() {
  return { lean: 0, hx: 0, hy: 0.04, head: 0, fF: [0.26, 0], fB: [-0.3, 0], lF: null, lB: null, ftF: 0, ftB: 0,
    aF: [0.2, 0.5], aB: [-0.2, 0.5], hF: 'fist', hB: 'fist', it: 1.6, itBack: false, noItem: false,
    eye: 'open', brow: 'calm', mouth: 'smile', sweat: false, rot: 0, oy: 0, lie: 0, lieMid: false, glint: false };
}
function p2Key(R, name, o) {
  const t = o.t || 0, punch = R.style === 'punch' && !o.weaponItem, I = R.idle, P = p2Base(); // (arme ramassée : il la manie comme une arme)
  const guard = () => { P.aF = I.aF.slice(); P.aB = I.aB.slice(); P.it = I.it || 1.6; P.itBack = !!I.itBack; P.hB = I.hB || 'fist'; };
  const mood = () => { P.eye = R.eye || 'open'; P.brow = R.brow || 'calm'; P.mouth = R.mouth || 'smile'; };
  const fierce = m => { P.eye = 'angry'; P.brow = 'angry'; P.mouth = m; };
  switch (name) {
    case 'idle': // attente : en garde, souple, il respire
      guard(); mood(); P.lean = 0.05; P.hy = 0.03 + Math.sin(t * (R.bounce ? 9 : 4)) * (R.bounce ? 0.022 : 0.012); P.fF = [0.2, 0]; P.fB = [-0.22, 0]; // (le boxeur sautille)
      P.aF[1] += Math.sin(t * 4 + 1) * 0.05; P.aB[1] += Math.sin(t * 4) * 0.05; // les bras respirent
      if ((t % 3.3) < 0.12) P.eye = 'blink';
      break;
    case 'walk': { // marche : jambes et bras opposés, le corps monte et descend
      const w = o.walk || 0, s = Math.sin(w), c = Math.cos(w);
      guard(); mood(); P.lean = 0.15; P.hy = 0.02 + 0.07 * Math.abs(s);
      P.fF = [0.56 * s, Math.max(0, c) * 0.22]; P.fB = [-0.56 * s, Math.max(0, -c) * 0.22]; P.ftF = c > 0 ? -0.3 * c : 0.35 * Math.max(0, -s); P.ftB = c < 0 ? 0.3 * c : 0.35 * Math.max(0, s);
      if (punch) { P.aF = [-0.6 * s, 0.85]; P.aB = [0.6 * s + 0.1, 0.8]; P.hB = 'fist'; }
      else { P.aF[0] -= 0.25 * s; P.aB = [0.7 * s, 0.7 + 0.2 * s]; }
      break;
    }
    case 'windup': // élan : le poids part en arrière, l'arme (ou le poing) est armée
      fierce('grit'); P.hx = -0.1; P.hy = 0.11; P.fF = [0.3, 0]; P.fB = [-0.38, 0]; P.head = 0.12;
      if (punch) { P.lean = -0.17; P.aF = [-0.8, 2.05]; P.aB = [1.15, 0.6]; }
      else { P.lean = -0.22; P.aF = [3.55, 1.0]; P.it = 4.35; P.aB = [1.3, 0.3]; P.hB = 'open'; }
      break;
    case 'impact': // impact : grande fente, le bras part droit devant
      fierce('shout'); P.hx = 0.2; P.fF = [0.64, 0]; P.fB = [-0.54, 0]; P.ftB = 0.6;
      if (punch) { P.lean = 0.3; P.hy = 0.15; P.aF = [1.6, 0]; P.aB = [-0.9, 1.9]; P.glint = true; }
      else { P.lean = 0.36; P.hy = 0.18; P.aF = [1.5, 0.1]; P.it = 1.64; P.aB = [-1.0, 0.9]; }
      break;
    case 'windupF': // élan du coup final : il se grandit, l'arme à deux mains au-dessus de la tête (ou se ramasse pour l'uppercut)
      fierce('grit');
      if (punch) { P.lean = 0.32; P.hy = 0.28; P.hx = -0.05; P.aF = [-0.5, 1.3]; P.aB = [0.9, 1.4]; P.fF = [0.3, 0]; P.fB = [-0.36, 0]; }
      else { P.lean = -0.3; P.hy = 0; P.oy = -5; P.aF = [3.3, 0.5]; P.aB = [3.05, 0.65]; P.it = 3.95; P.fF = [0.2, 0.06]; P.fB = [-0.3, 0]; }
      break;
    case 'final': // coup final : l'arme s'écrase au sol devant lui (ou uppercut, poing au ciel)
      fierce('shout');
      if (punch) { P.lean = -0.1; P.hy = -0.01; P.oy = -9; P.head = -0.28; P.aF = [2.8, 0.3]; P.aB = [-0.75, 1.0]; P.fF = [0.24, 0.24]; P.ftF = 0.5; P.fB = [-0.2, 0]; P.ftB = 0.35; P.glint = true; }
      else { P.lean = 0.62; P.hx = 0.22; P.hy = 0.32; P.fF = [0.62, 0]; P.fB = [-0.5, 0.34]; P.ftB = 1.1; P.aF = [1.05, 0.15]; P.aB = [0.85, 0.35]; P.it = R.finalIt || 1.0; }
      break;
    case 'hurt': // touché : le corps part en arrière, bras jetés devant, un pied décolle
      P.lean = -0.36; P.hx = -0.1; P.hy = 0.06; P.head = -0.3; P.fF = [0.36, 0.2]; P.ftF = -0.5; P.fB = [-0.26, 0];
      P.aF = [1.25, 0.6]; P.aB = [0.85, 0.9]; P.hB = 'open'; P.it = 2.3; P.eye = 'shut'; P.brow = 'sad'; P.mouth = 'ouch';
      break;
    case 'jump': // saut : genou avant remonté, jambe arrière qui traîne, arme levée
      P.lean = 0.1; P.lF = [1.05, 1.5]; P.lB = [-0.4, 0.95]; P.aB = [-0.9, 0.35]; P.eye = 'open'; P.brow = 'angry'; P.mouth = 'grin';
      if (punch) P.aF = [2.2, 1.2]; else { P.aF = [2.5, 0.45]; P.it = 3.3; }
      break;
    case 'dive': // piqué : tout le corps plonge en biais, l'arme (ou le poing) en premier
      fierce('shout'); P.rot = 0.85; P.lean = 0.1; P.lF = [-0.1, 0.3]; P.lB = [-0.5, 0.6];
      if (punch) { P.aF = [1.6, 0]; P.aB = [-0.7, 0.5]; P.glint = true; } else { P.aF = [1.45, 0.05]; P.aB = [1.2, 0.25]; P.it = 1.5; }
      break;
    case 'victory': // victoire : bras en V, grand rire, il saute de joie
      P.lean = -0.04; P.head = -0.12; P.hy = 0.02; P.fF = [0.3, 0]; P.fB = [-0.32, 0];
      if (o.air) { P.lF = [0.55, 1.15]; P.lB = [-0.5, 1.0]; }
      P.aF = [2.8 + Math.sin(t * 10) * 0.08, 0.2]; P.aB = [3.5 - Math.sin(t * 10 + 1) * 0.08, 0.25]; P.hB = 'open'; P.it = 3.0;
      P.eye = 'happy'; P.brow = 'up'; P.mouth = 'laugh'; P.glint = punch;
      break;
    case 'taunt': // raillerie : penché en arrière, une main sur la hanche (chacun sa façon de narguer)
      P.lean = -0.16; P.head = -0.16; P.hy = 0.04 + Math.sin(t * 14) * 0.012; P.aB = [-0.8, 1.95];
      if (R.taunt === 'watch') { P.aF = [1.45, 0.7 + Math.sin(t * 9) * 0.06]; P.eye = 'half'; P.brow = 'smug'; P.mouth = 'grin'; P.glint = true; }   // il montre sa montre
      else if (R.taunt === 'gloves') { P.aF = [1.25 + Math.sin(t * 16) * 0.12, 1.3]; P.aB = [1.3 - Math.sin(t * 16) * 0.12, 1.25]; P.eye = 'half'; P.brow = 'smug'; P.mouth = 'grin'; } // il cogne ses gants l'un contre l'autre
      else if (R.taunt === 'hips') { P.aF = [-0.6, 1.5]; P.lean = -0.2; P.eye = 'happy'; P.brow = 'up'; P.mouth = 'laugh'; P.hy = 0.04 + Math.abs(Math.sin(t * 12)) * 0.03; } // les poings sur les hanches, il se moque
      else if (R.taunt === 'beckon') { guard(); P.aB = [1.3, 0.55]; P.hB = 'beckon'; P.eye = 'open'; P.brow = 'smug'; P.mouth = 'grin'; }             // « viens ! » de la main
      else { P.aF = [1.35, 0.15 + Math.sin(t * 16) * 0.07]; P.it = 1.85 + Math.sin(t * 16) * 0.1; P.eye = 'happy'; P.brow = 'up'; P.mouth = 'laugh'; } // il te montre du doigt (de la truelle) en riant
      break;
    case 'carry': { // porter : bras tendus au-dessus de la tête, jambes fléchies sous le poids
      fierce('grit'); P.sweat = true; P.lean = 0.02; P.hy = 0.12; P.fF = [0.36, 0]; P.fB = [-0.36, 0];
      if (o.poseT === 1) { const w = o.walk || 0, s = Math.sin(w), c = Math.cos(w); P.fF = [0.3 * s, Math.max(0, c) * 0.12]; P.fB = [-0.3 * s, Math.max(0, -c) * 0.12]; P.hy = 0.1 + 0.03 * Math.abs(s); }
      P.aF = [3.0, 0.12]; P.aB = [3.3, 0.1]; P.hF = P.hB = 'flat'; P.noItem = true;
      break;
    }
    case 'down': // à terre : sur le dos, un genou relevé, un bras au-dessus de la tête, sonné
      P.lie = 1; P.lean = 0; P.lF = [0.95, 1.8]; P.lB = [0.08, 0.1]; P.aF = [2.85, 0.25]; P.aB = [0.5, 1.2]; P.it = 3.1; P.hB = 'open';
      P.eye = 'x'; P.brow = 'sad'; P.mouth = 'tongue';
      break;
    case 'held': // porté par le héros : à l'horizontale, il gigote
      P.lie = 1; P.lieMid = true; P.lF = [0.6 + Math.sin(t * 14) * 0.5, 0.8]; P.lB = [0.25 - Math.sin(t * 14) * 0.5, 0.6];
      P.aF = [2.4 + Math.sin(t * 12) * 0.4, 0.4]; P.aB = [1.0 + Math.cos(t * 12) * 0.4, 0.5]; P.hB = 'open'; P.it = 2.6;
      P.eye = 'wide'; P.brow = 'sad'; P.mouth = 'o';
      break;
  }
  return P;
}
// mélange de deux poses (k = 0 → a, k = 1 → b)
function p2Blend(a, b, k) {
  const P = {};
  for (const key in a) {
    const x = a[key], y = b[key];
    if (typeof x === 'number' && typeof y === 'number') P[key] = lerp(x, y, k);
    else if (Array.isArray(x) && Array.isArray(y)) P[key] = x.map((v, i) => lerp(v, y[i], k));
    else P[key] = k < 0.5 ? x : y;
  }
  return P;
}
// La pose à dessiner. o : comme pour drawCharacter (pose, poseT, t, walk) + combo (2 = coup final) et air (en l'air).
function p2Pose(R, o) {
  const name = o.pose || 'idle', pt = o.poseT || 0, key = n => p2Key(R, n, o);
  if (name === 'attack' || name === 'special') { // se ramasse → frappe → tient la pose → revient en garde
    // (attaque spéciale : coup final par défaut ; « impact » pour ceux qui lancent ou lâchent quelque chose devant eux)
    const fin = name === 'special' ? R.special !== 'impact' : o.combo === 2, W = key(fin ? 'windupF' : 'windup'), I = key(fin ? 'final' : 'impact');
    if (pt < 0.2) return p2Blend(key('idle'), W, easeOut(pt / 0.2));
    if (pt < 0.4) { const k = (pt - 0.2) / 0.2; return p2Blend(W, I, k * k * (3 - 2 * k)); }
    if (pt < 0.74) return I;
    return p2Blend(I, key('idle'), (pt - 0.74) / 0.26 * 0.65);
  }
  if (name === 'windup') { const P = key('windup'); P.hx += Math.sin((o.t || 0) * 40) * 0.008; return P; } // il tremble avant de frapper
  if (name === 'down') { const P = key('down'); P.lie = Math.min(1, pt); if (pt < 0.6) { P.eye = 'shut'; P.mouth = 'ouch'; } return P; }
  if (name === 'dead') return key('hurt');
  return key(RIGS_POSES.includes(name) ? name : 'idle');
}
const RIGS_POSES = ['idle', 'walk', 'windup', 'impact', 'windupF', 'final', 'hurt', 'jump', 'dive', 'victory', 'taunt', 'carry', 'down', 'held'];

// ============================================================
//  DESSIN D'UN PERSONNAGE — même usage que drawCharacter(ctx, kind, o)
// ============================================================
function drawPerso(ctx, kind, o = {}) {
  const R = RIGS[kind], P = p2Pose(R, o), t = o.t || 0, skin = R.skin || SKIN;
  const L = R.th + R.sh;
  R._dir = o.dir || 1;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale((o.dir || 1) * (o.scale || 1), o.scale || 1);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (P.lie) { // couché sur le dos : tout le pantin bascule en arrière autour des pieds
    if (P.lieMid) ctx.translate(R.H * 0.5, R.hr * 0.5); else ctx.translate(R.H * 0.46 * P.lie, -R.hr * 0.92 * P.lie);
    ctx.rotate(-Math.PI / 2 * P.lie);
  }
  if (P.oy) ctx.translate(0, P.oy);
  const hip = { x: P.hx * L, y: -(L * 0.985 + R.ankle) + P.hy * L };
  if (P.rot) { ctx.translate(hip.x, hip.y); ctx.rotate(P.rot); ctx.translate(-hip.x, -hip.y); }
  // repère du torse : hanche en (0,0), cou en (0,-tl), penché de « lean »
  const ca = Math.cos(P.lean), sa = Math.sin(P.lean);
  const T = (x, y) => ({ x: hip.x + x * ca - y * sa, y: hip.y + x * sa + y * ca });
  const dir = (a, len) => ({ x: Math.sin(a) * len, y: Math.cos(a) * len });
  const add = (p, v) => ({ x: p.x + v.x, y: p.y + v.y });

  // --- jambes : pied posé (on calcule le genou) ou jambe en l'air (angles) ---
  const leg = (hx, tgt, ang, ft) => {
    const h = T(hx, 0);
    if (ang) { const a = ang[0] + P.lean, knee = add(h, dir(a, R.th)), foot = add(knee, dir(a - ang[1], R.sh)); return { h, knee, foot, fa: P.lie ? -0.25 : 0.55 - (a - ang[1]) }; }
    const r = p2Knee(h, { x: tgt[0] * L, y: -R.ankle - tgt[1] * L }, R.th, R.sh);
    return { h, knee: r.knee, foot: r.foot, fa: ft || 0 };
  };
  const LF = leg(-R.hb * 0.28, P.fF, P.lF, P.ftF), LB = leg(R.hf * 0.3, P.fB, P.lB, P.ftB);
  // --- bras ---
  const arm = (sx, a) => { const s = T(sx, -R.tl * 0.86), e = add(s, dir(a[0], R.ua)), w = add(e, dir(a[0] + a[1], R.fa)); return { s, e, w, a: a[0] + a[1] }; };
  const AF = arm(-R.tb * 0.12, P.aF), AB = arm(R.tf * 0.42, P.aB);
  const item = !P.noItem && (o.weaponItem || R.item);
  const fItem = item && (P2_ITEMS[item] || ITEMS[item]); // (armes ramassées, « w_… » : dessinées par rage.js)
  const drawItem = () => { if (!fItem) return; ctx.save(); ctx.translate(AF.w.x, AF.w.y); ctx.rotate(-P.it); ctx.translate(0, R.hand * 0.35); ctx.strokeStyle = INK; ctx.lineWidth = 2; fItem(ctx, t); ctx.restore(); };
  const hand = (A, type, col, fond) => { ctx.save(); ctx.translate(A.w.x, A.w.y); ctx.rotate(-A.a); p2Hand(ctx, type, R.hand, col, t, R.glove ? (fond ? p2Dark(R.glove, 0.8) : R.glove) : null); ctx.restore(); };
  const shoe = (Lg, dark) => { ctx.save(); ctx.translate(Lg.foot.x, Lg.foot.y); ctx.rotate(Lg.fa); p2Shoe(ctx, R, R.shoes, dark); ctx.restore(); };

  if (R.behind) R.behind(ctx, R, o);
  // 1) bras et jambe du fond (plus sombres)
  p2Limb(ctx, AB.s, AB.e, AB.w, R.armW, R.armW * 0.92, p2Dark(R.sleeve), R.fore === skin ? p2Dark(skin, 0.86) : p2Dark(R.fore));
  hand(AB, P.hB, p2Dark(skin, 0.86), true);
  p2Limb(ctx, LB.h, LB.knee, LB.foot, R.legW, R.legW * 0.9, p2Dark(R.legs));
  shoe(LB, true);
  // 2) jambe de devant
  p2Limb(ctx, LF.h, LF.knee, LF.foot, R.legW, R.legW * 0.9, R.legs);
  shoe(LF, false);
  // 3) torse (les détails du costume sont découpés à sa forme)
  ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(P.lean);
  if (R.neckBack) R.neckBack(ctx, R);
  const tl = R.tl, b = R.tb, f = R.tf, bel = R.belly || 0;
  const tracerTorse = () => {
    ctx.beginPath();
    ctx.moveTo(-R.hb, 3);
    ctx.bezierCurveTo(-R.hb - 1, -tl * 0.3, -b, -tl * 0.5, -b, -tl * 0.8);
    ctx.quadraticCurveTo(-b, -tl - 3, -b * 0.3, -tl - 3);
    ctx.lineTo(f * 0.35, -tl - 3);
    ctx.quadraticCurveTo(f, -tl - 3, f, -tl * 0.78);
    ctx.bezierCurveTo(f + bel * 0.55, -tl * 0.6, R.hf + bel * 1.45, -tl * 0.2, R.hf, 3);
    ctx.quadraticCurveTo(0, 10, -R.hb, 3);
    ctx.closePath();
  };
  tracerTorse(); ctx.fillStyle = R.shirt; ctx.fill();
  ctx.save(); ctx.clip(); if (R.torso) R.torso(ctx, R, o);
  ctx.fillStyle = 'rgba(15,10,45,.17)'; ctx.beginPath(); // ombre sur le dos (donne du volume)
  ctx.moveTo(-60, -tl - 10); ctx.lineTo(-b * 0.45, -tl - 10); ctx.quadraticCurveTo(-b * 0.1, -tl * 0.5, -R.hb * 0.5, 14); ctx.lineTo(-60, 14); ctx.fill();
  ctx.restore();
  tracerTorse(); ctx.strokeStyle = INK; ctx.lineWidth = P2.ol; ctx.stroke();
  ctx.restore();
  // 4) objet posé sur l'épaule (derrière la tête), cou, tête
  if (P.itBack) drawItem();
  const neck = T(f * 0.12, -tl), hc = T(f * 0.12 + R.hr * 0.1, -tl - R.hr * (R.headUp || 0.72));
  ctx.strokeStyle = INK; ctx.lineWidth = R.hr * 0.62 + P2.ol * 2; p2Seg(ctx, neck, hc);
  ctx.strokeStyle = skin; ctx.lineWidth = R.hr * 0.62; p2Seg(ctx, neck, hc);
  ctx.save(); ctx.translate(hc.x, hc.y); ctx.rotate(P.lean * 0.55 + P.head);
  p2Head(ctx, R, P, t);
  ctx.restore();
  // 5) bras de devant : manche, montre éventuelle, objet, main par-dessus
  p2Limb(ctx, AF.s, AF.e, AF.w, R.armW, R.armW * 0.92, R.sleeve, R.fore);
  if (R.wrist) { ctx.save(); ctx.translate(AF.w.x, AF.w.y); ctx.rotate(-AF.a); R.wrist(ctx, R, t, P.glint); ctx.restore(); }
  if (!P.itBack) drawItem();
  hand(AF, P.hF, skin);
  if (R.front) R.front(ctx, R, o, hc);
  ctx.restore();
}

// Tête seule, pour le portrait du HUD (même usage que drawHead, draw.js)
function drawPersoHead(ctx, kind, x, y, size) {
  const R = RIGS[kind], hr = R.hr, s = size / (hr * 2.9);
  ctx.save(); ctx.translate(x - hr * 0.14 * s, y + hr * (R.portraitY || 0.3) * s); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  p2Head(ctx, R, { eye: R.eye || 'open', brow: R.brow || 'calm', mouth: R.mouth || 'smile' }, 0);
  ctx.restore();
}

// Personnage avec le rendu cartoon du jeu (gros contour + éclairage + flash) : l'équivalent de menuSprite (ui.js)
function persoSprite(ctx, kind, o = {}) {
  const R = RIGS[kind], sc = o.scale || 1, H = R.H * sc, r = (R.H * 0.95 + 70) * sc;
  drawSprite(ctx, { x: -r, y: -H - 110 * sc, w: r * 2, h: H + 140 * sc }, c => drawCharacter(c, kind, o), // (drawCharacter ajoute Aïka à Fateh)
    { outline: P2.contour * Math.sqrt(sc), shade: { top: -H }, flash: !!o.flash });
}
