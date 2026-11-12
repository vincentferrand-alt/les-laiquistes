// ============================================================
//  RENDU — personnages, ennemis, véhicules, objets
//  Toutes les fonctions dessinent le personnage tourné vers la DROITE,
//  l'origine (0,0) étant au sol, entre les pieds.
// ============================================================

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    r = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this;
  };
}

// ---------- Teinte d'un dessin (flash blanc à l'impact, silhouette des persos verrouillés) ----------
// ctx.filter n'existe pas dans Safari/WebKit (donc pas dans Chrome sur iPhone non plus) :
// on dessine dans un canvas temporaire, puis on recouvre avec 'source-atop', qui ne
// colore que les pixels déjà dessinés, et on recopie le résultat.
// box = { x, y, w, h } : rectangle (unités locales) qui contient le dessin.
const _tint = { cv: null, c: null };
function drawTinted(ctx, col, alpha, box, fn) {
  const m = ctx.getTransform();
  const k = clamp(Math.hypot(m.a, m.b), 0.2, 4); // résolution réelle à l'écran
  const W = Math.max(1, Math.ceil(box.w * k)), H = Math.max(1, Math.ceil(box.h * k));
  if (!_tint.cv) { _tint.cv = document.createElement('canvas'); _tint.c = _tint.cv.getContext('2d'); }
  const cv = _tint.cv, c = _tint.c;
  if (cv.width < W || cv.height < H) { cv.width = Math.max(cv.width, W); cv.height = Math.max(cv.height, H); }
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.clearRect(0, 0, W, H);
  c.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
  c.lineJoin = 'round'; c.miterLimit = 2;
  fn(c);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-atop'; c.globalAlpha = alpha; c.fillStyle = col; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  ctx.drawImage(cv, 0, 0, W, H, box.x, box.y, box.w, box.h);
}

// ---------- Rendu « cartoon » d'un combattant (v3.5) ----------
// Le perso est dessiné dans un canvas à part, puis :
//  1. gros contour noir tout autour de la silhouette (style Castle Crashers) : la silhouette noire est posée
//     8 fois, décalée dans 8 directions, sous le dessin ;
//  2. éclairage : haut du corps éclairé, jambes dans l'ombre (le perso « tient » au sol) ;
//  3. flash blanc à l'impact (remplace drawTinted pour les combattants).
// Gfx.quality descend tout seul si l'appareil rame (voir Gfx.tick) : 2 = complet, 1 = sans contour pour les sbires, 0 = rendu simple.
const Gfx = {
  quality: 2, frames: 0, slow: 0, acc: 0,
  // appelé à chaque image avec la durée de l'image (s) : si on passe trop souvent sous 45 i/s, on allège
  tick(dt) {
    this.acc += dt; this.frames++;
    if (dt > 1 / 45) this.slow++;
    if (this.acc >= 3) {
      if (this.slow / this.frames > 0.35 && this.quality > 0) { this.quality--; console.info('Graphismes allégés : qualité', this.quality); }
      this.acc = 0; this.frames = 0; this.slow = 0;
    }
  },
};
const _spr = { a: null, ca: null, b: null, cb: null };
function drawSprite(ctx, box, paint, o = {}) {
  const outline = o.outline || 0;
  // qualité 0, ou sbire en qualité 1 : dessin direct (plus léger), sauf pendant le flash d'impact
  if (!o.flash && !o.tint && (Gfx.quality === 0 || (o.minor && Gfx.quality < 2) || (!outline && !o.shade))) { paint(ctx); return; }
  const m = ctx.getTransform();
  const k = clamp(Math.hypot(m.a, m.b), 0.2, 2); // résolution réelle à l'écran (plafonnée : assez net, pas trop lourd)
  const pad = outline + 1;
  const W = Math.max(1, Math.ceil((box.w + pad * 2) * k)), H = Math.max(1, Math.ceil((box.h + pad * 2) * k));
  if (!_spr.a) {
    _spr.a = document.createElement('canvas'); _spr.ca = _spr.a.getContext('2d');
    _spr.b = document.createElement('canvas'); _spr.cb = _spr.b.getContext('2d');
  }
  const A = _spr.a, a = _spr.ca, B = _spr.b, b = _spr.cb;
  if (A.width < W || A.height < H) { A.width = B.width = Math.max(A.width, W); A.height = B.height = Math.max(A.height, H); }
  // 1) le perso, dans le canvas A
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over'; a.globalAlpha = 1; a.clearRect(0, 0, W, H);
  a.setTransform(k, 0, 0, k, (pad - box.x) * k, (pad - box.y) * k);
  a.lineJoin = 'round'; a.miterLimit = 2;
  paint(a);
  a.setTransform(1, 0, 0, 1, 0, 0);
  // 2) éclairage, seulement sur les pixels du perso (source-atop)
  if (o.shade) {
    a.globalCompositeOperation = 'source-atop';
    const top = (pad - box.y + o.shade.top) * k, bot = (pad - box.y) * k; // du sommet de la tête jusqu'aux pieds (y = 0)
    const g = a.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(255,250,235,0.16)'); g.addColorStop(0.35, 'rgba(255,250,235,0)');
    g.addColorStop(0.62, 'rgba(25,15,45,0)'); g.addColorStop(1, 'rgba(25,15,45,0.30)');
    a.fillStyle = g; a.fillRect(0, 0, W, H);
  }
  // 2 bis) teinte (ennemi en or) : couleur posée par-dessus, à moitié transparente
  if (o.tint) { a.globalCompositeOperation = 'source-atop'; a.globalAlpha = 0.55; a.fillStyle = `rgb(${o.tint})`; a.fillRect(0, 0, W, H); a.globalAlpha = 1; }
  // 3) flash blanc
  if (o.flash) { a.globalCompositeOperation = 'source-atop'; a.globalAlpha = 0.78; a.fillStyle = '#fff'; a.fillRect(0, 0, W, H); a.globalAlpha = 1; }
  a.globalCompositeOperation = 'source-over';
  const dx = box.x - pad, dy = box.y - pad, dw = W / k, dh = H / k;
  // 4) contour : silhouette noire (canvas B) posée tout autour
  if (outline && Gfx.quality >= 1 && !(o.minor && Gfx.quality < 2)) {
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
    b.drawImage(A, 0, 0, W, H, 0, 0, W, H);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = o.outlineCol || '#0b0b12'; b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = 'source-over';
    const r = outline;
    // 4 décalages en diagonale (moitié moins de copies que 8 directions, contour quasi identique)
    [[r, r], [-r, r], [r, -r], [-r, -r]].forEach(([ox, oy]) => ctx.drawImage(B, 0, 0, W, H, dx + ox, dy + oy, dw, dh));
  }
  ctx.drawImage(A, 0, 0, W, H, dx, dy, dw, dh);
}

const SKIN = '#ffeaa7';
const INK = '#111';
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);

function rrect(ctx, x, y, w, h, r, fill, stroke = true) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) ctx.stroke();
}
function circle(ctx, x, y, r, fill, stroke = true) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) ctx.stroke();
}
function ell(ctx, x, y, rx, ry, fill, stroke = true, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) ctx.stroke();
}
function poly(ctx, pts, fill, stroke = true) {
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) ctx.stroke();
}
// Yeux expressifs (v3.5) : blanc de l'œil + pupille qui regarde devant + reflet, clignement,
// sourcils froncés quand il frappe, levés quand il nargue. _face est rempli par drawHumanoid / drawMinion.
const _face = { pose: 'idle', t: 0 };
function eyeDot(ctx, x, y, r, hurt) {
  ctx.save();
  if (hurt) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); ctx.restore(); return; }
  const P = _face.pose, t = _face.t;
  const angry = P === 'attack' || P === 'windup' || P === 'special', smug = P === 'taunt' || P === 'victory';
  const blink = !angry && (t % 3.3) < 0.12;
  ctx.strokeStyle = INK; ctx.lineCap = 'round';
  if (blink) { ctx.lineWidth = Math.max(1.4, r * 0.6); ctx.beginPath(); ctx.moveTo(x - r * 1.2, y); ctx.lineTo(x + r * 1.2, y); ctx.stroke(); }
  else {
    ctx.lineWidth = Math.max(1, r * 0.4);
    ell(ctx, x, y, r * 1.25, angry ? r * 1.15 : r * 1.55, '#fff');                // blanc (plissé quand il frappe)
    circle(ctx, x + r * 0.38, y + r * 0.1, r * 0.82, INK, false);              // pupille, tournée vers l'avant
    circle(ctx, x + r * 0.12, y - r * 0.38, r * 0.3, '#fff', false);           // reflet
  }
  if (angry || smug) { // sourcils
    ctx.lineWidth = Math.max(1.6, r * 0.75);
    const yo = y - r * 2.1;
    ctx.beginPath();
    if (angry) { ctx.moveTo(x - r * 1.3, yo - r * 0.55); ctx.lineTo(x + r * 1.4, yo + r * 0.55); }
    else { ctx.moveTo(x - r * 1.3, yo); ctx.quadraticCurveTo(x, yo - r * 1.2, x + r * 1.4, yo - r * 0.5); }
    ctx.stroke();
  }
  ctx.restore();
}
function hairDome(ctx, hr, hy, col, a0 = 1.02, a1 = 1.98, lift = 0.25, scale = 1.02) {
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, hy - hr * lift, hr * scale, Math.PI * a0, Math.PI * a1); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
}
// Bouche ouverte pendant les attaques
function mouth(ctx, hr, hy, pose) {
  if (pose === 'attack' || pose === 'special' || pose === 'windup') {
    ctx.fillStyle = '#3d0c02'; ctx.beginPath(); ctx.ellipse(hr * 0.55, hy + hr * 0.5, hr * 0.18, hr * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- Objets tenus (repère du bras : +y = prolongement du bras) ----------
const ITEMS = {
  truelle(ctx) {
    rrect(ctx, -4, -2, 8, 18, 2, '#d35400');
    ctx.fillStyle = '#7f8fa6'; ctx.fillRect(-2, 14, 4, 8);
    poly(ctx, [[0, 20], [14, 36], [0, 60], [-14, 36]], '#bdc3c7');
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(7, 36); ctx.lineTo(0, 50); ctx.fill();
  },
  cartouche(ctx) {
    ctx.save(); ctx.translate(0, 16); ctx.rotate(0.15);
    rrect(ctx, -13, -16, 26, 32, 3, '#7f8c8d');
    rrect(ctx, -9, -10, 18, 14, 2, '#e84393');
    ctx.fillStyle = '#2d3436'; for (let i = -8; i <= 8; i += 4) ctx.fillRect(i, 9, 2, 6);
    ctx.restore();
  },
  pelleGrande(ctx) {
    rrect(ctx, -3.5, -20, 7, 100, 3, '#a0522d');
    rrect(ctx, -9, -26, 18, 8, 3, '#a0522d');
    poly(ctx, [[-16, 80], [16, 80], [13, 112], [0, 122], [-13, 112]], '#95a5a6');
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-10, 84, 5, 22);
  },
  batte(ctx) {
    ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(3, -6); ctx.lineTo(8, 60); ctx.quadraticCurveTo(0, 68, -8, 60); ctx.closePath();
    ctx.fillStyle = '#deb887'; ctx.fill(); ctx.stroke();
  },
  canne(ctx) {
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(-8, -4, 8, Math.PI, 0); ctx.lineTo(0, 64); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
  },
  baton(ctx) { rrect(ctx, -3, -14, 6, 86, 3, '#8d6e63'); },
  tournevis(ctx) { rrect(ctx, -5, -2, 10, 18, 4, '#f1c40f'); ctx.fillStyle = '#95a5a6'; ctx.fillRect(-1.5, 16, 3, 22); ctx.strokeRect(-1.5, 16, 3, 22); },
  marteau(ctx) { rrect(ctx, -3, -2, 6, 34, 2, '#a0522d'); rrect(ctx, -12, 30, 24, 10, 2, '#636e72'); },
  pelle(ctx) { rrect(ctx, -2.5, -2, 5, 34, 2, '#a0522d'); poly(ctx, [[-9, 32], [9, 32], [7, 46], [0, 52], [-7, 46]], '#95a5a6'); },
};
// mains spéciales
function drawHand(ctx, type, t, active) {
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  if (type === 'glove') {
    ell(ctx, 2, 2, 13, 11, '#d63031');
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-2, -2, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
    rrect(ctx, -8, -12, 16, 6, 2, '#fff');
  } else if (type === 'watch') {
    rrect(ctx, -7, -14, 14, 10, 2, '#b8860b');
    const g = ctx.createRadialGradient(0, 2, 0, 0, 2, 13);
    g.addColorStop(0, '#fff'); g.addColorStop(0.45, '#f1c40f'); g.addColorStop(1, '#b8860b');
    circle(ctx, 0, 3, 12, g);
    circle(ctx, 0, 3, 6.5, '#fdfdfd');
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -1); ctx.moveTo(0, 3); ctx.lineTo(3, 4); ctx.stroke();
    if (active || (t * 2.5) % 1 < 0.25) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(18, 20); ctx.moveTo(18, -14); ctx.lineTo(-18, 20); ctx.stroke();
    }
  } else if (type !== 'none') circle(ctx, 0, 0, 7.5, type || SKIN);
}

// ---------- Corps humanoïde générique ----------
// s = spec (voir HUMANS plus bas) ; o = { t, walk, pose, poseT, flash, variant, label }
function drawHumanoid(ctx, s, o = {}) {
  const w = s.bw, h = s.bh;
  const t = o.t || 0, walk = o.walk || 0, pose = o.pose || 'idle', pt = o.poseT || 0;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (pose === 'down') { ctx.translate(-h * 0.5 * pt, 0); ctx.rotate(-Math.PI / 2 * Math.min(1, pt * 1.4)); }
  else if (pose === 'hurt') ctx.rotate(-0.22);
  else if (pose === 'taunt') ctx.rotate(-0.14 + Math.sin(t * 7) * 0.05); // se penche en arrière, se dandine, nargue
  else if (pose === 'victory') ctx.rotate(Math.sin(t * 9) * 0.05);       // se balance, bras levés
  // petit rebond du haut du corps selon la pose (respiration, marche, victoire, raillerie)
  const bob = pose === 'idle' ? Math.sin(t * 4) * 1.5 : pose === 'walk' ? -Math.abs(Math.sin(walk)) * 2 : pose === 'victory' ? -Math.abs(Math.sin(t * 9)) * 5 : pose === 'taunt' ? Math.sin(t * 14) * 2.5 : 0;
  const skin = s.skin || SKIN;

  if (s.under) s.under(ctx, o, w, h);
  if (s.behind) s.behind(ctx, o, w, h);

  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  const legW = s.legW || Math.max(10, w * 0.3), legH = h * 0.27;
  const armW = s.armW || 10; // largeur des bras (Faouzi : plus fins)
  const swing = s.stiffLegs ? 0 : (pose === 'walk' || (pose === 'carry' && pt === 1)) ? Math.sin(walk) * 0.55 : (pose === 'jump' ? 0.5 : 0);
  const legCol = s.legs || '#2c3e50', shoe = s.shoes || '#111';
  ctx.save(); ctx.translate(-w * 0.18, -legH); ctx.rotate(-swing);
  rrect(ctx, -legW / 2, 0, legW, legH, 6, legCol); rrect(ctx, -legW / 2, legH - 7, legW + 6, 8, 4, shoe, false);
  ctx.restore();

  const shoulderY = -h * 0.72 + bob;
  // bras arrière
  ctx.save(); ctx.translate(-w * 0.15, shoulderY);
  ctx.rotate(pose === 'carry' ? -2.85 : pose === 'victory' ? -2.7 + Math.sin(t * 10) * 0.15 : pose === 'taunt' ? 0.5 : s.armFwd ? -1.3 + Math.sin(t * 5) * 0.1 : -0.15 - (pose === 'walk' ? Math.sin(walk + Math.PI) * 0.5 : 0));
  const armLB = Math.max(24, h * 0.3);
  rrect(ctx, -armW / 2, 0, armW, armLB, armW / 2, s.sleeve || s.color);
  ctx.translate(0, armLB); drawHand(ctx, s.backHand || skin, t, false);
  ctx.restore();

  // torse
  const tg = ctx.createLinearGradient(0, -h * 0.85, 0, -h * 0.2);
  tg.addColorStop(0, s.light); tg.addColorStop(1, s.color);
  rrect(ctx, -w / 2, -h * 0.8 + bob, w, h * 0.58, Math.min(18, w / 2), tg);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 4, -h * 0.8 + 4 + bob, w - 8, h * 0.13, 8); ctx.fill();
  if (s.torso) s.torso(ctx, w, h, bob, o);
  if (s.belly) {
    const br = w * s.belly;
    const bg = ctx.createRadialGradient(10, -h * 0.55, 2, 10, -h * 0.48, br);
    bg.addColorStop(0, s.bellyLight || '#ffb07c'); bg.addColorStop(1, s.light);
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    circle(ctx, 12, -h * 0.48 + bob, br, bg);
    circle(ctx, 12 + br * 0.3, -h * 0.45 + bob, 2.5, '#7a3b10', false);
  }

  // jambe avant
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.save(); ctx.translate(w * 0.18, -legH); ctx.rotate(swing);
  rrect(ctx, -legW / 2, 0, legW, legH, 6, s.legsFront || legCol); rrect(ctx, -legW / 2, legH - 7, legW + 6, 8, 4, shoe, false);
  ctx.restore();

  // tête
  const hr = s.headR || Math.max(15, w * 0.38);
  const hy = -h * 0.8 - hr * 0.35 + bob;
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  circle(ctx, 0, hy, hr, skin);
  const hurt = pose === 'hurt' || pose === 'down' || pose === 'dead';
  _face.pose = pose; _face.t = t;
  if (s.face) s.face(ctx, hr, hy, pose, t, hurt, o);
  else eyeDot(ctx, hr * 0.42, hy - hr * 0.08, 3, hurt);
  mouth(ctx, hr, hy, pose);

  // bras avant + objet
  let ang;
  const idle = s.idleArm !== undefined ? s.idleArm : -0.3;
  if (pose === 'attack') ang = lerp(s.overhead === false ? -0.4 : -Math.PI * 1.15, s.punch ? -Math.PI * 0.5 : -Math.PI * 0.42, easeOut(Math.min(1, pt * 2.2)));
  else if (pose === 'windup') ang = (s.overhead === false ? -0.2 : -Math.PI * 1.1) + Math.sin(t * 40) * 0.08;
  else if (pose === 'special') ang = -Math.PI * (0.9 + Math.sin(t * 20) * 0.08);
  else if (pose === 'hurt' || pose === 'down') ang = -Math.PI * 0.8;
  else if (pose === 'victory') ang = -Math.PI * 0.95 + Math.sin(t * 10 + 1) * 0.15;   // bras levés
  else if (pose === 'taunt') ang = -Math.PI * 0.62 + Math.sin(t * 16) * 0.35;      // « viens ! » de la main
  else if (pose === 'carry') ang = -Math.PI * 0.97;  // bras tendus au-dessus de la tête
  else if (pose === 'jump') ang = -Math.PI * 0.7;
  else if (s.armFwd) ang = -1.45 + Math.sin(t * 5) * 0.1;
  else if (pose === 'walk') ang = idle + 0.05 + Math.sin(walk) * 0.45;
  else ang = idle + Math.sin(t * 3) * 0.05;
  const armL = Math.max(26, h * 0.32);
  ctx.save(); ctx.translate(w * 0.12, shoulderY + 4); ctx.rotate(ang);
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  rrect(ctx, -(armW + 1) / 2, 0, armW + 1, armL, (armW + 1) / 2, s.sleeve || s.light);
  ctx.translate(0, armL);
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  const item = o.weaponItem || (typeof s.item === 'function' ? s.item(o) : s.item); // (arme ramassée : rage.js)
  if (item && ITEMS[item]) ITEMS[item](ctx, t);
  drawHand(ctx, s.hand || skin, t, pose === 'attack' || pose === 'special');
  ctx.restore();

  if (s.front) s.front(ctx, o, w, h, hr, hy);
  ctx.restore();
}

// ---------- Traînée d'arme pendant l'attaque (arc lumineux devant le combattant) ----------
// pt : avancement de l'attaque (0..1) · reach : allonge · h : hauteur · punch : coup droit (gants, poings, montre)
// col : couleur « r,g,b » · combo : 0, 1 ou 2 (le 3e coup est plus ample et plus brillant)
const TRAIL_COL = { christian: '190,210,235', guilhem: '255,205,60', fateh: '190,120,255', faouzi: '110,235,160', venum: '255,95,95', senoussi: '245,200,120', purf: '150,230,90' };
function drawWeaponTrail(ctx, pt, reach, h, punch, col, combo = 0) {
  if (pt < 0.08 || pt > 0.82) return;
  const a = Math.sin((pt - 0.08) / 0.74 * Math.PI), big = combo === 2 ? 1.25 : 1;
  ctx.save(); ctx.lineCap = 'round';
  if (punch) { // traits de vitesse horizontaux + éclat à l'impact
    for (let i = 0; i < 4; i++) {
      const y = -h * (0.68 - i * 0.055);
      ctx.strokeStyle = `rgba(${col},${0.6 * a})`; ctx.lineWidth = (4.5 - i * 0.8) * big;
      ctx.beginPath(); ctx.moveTo(reach * (0.1 + i * 0.06), y); ctx.lineTo(reach * (0.55 + pt * 0.7), y); ctx.stroke();
    }
    if (pt > 0.3 && pt < 0.65) { // étoile d'impact au bout du poing
      const k = (pt - 0.3) / 0.35, cx = reach * 1.05, cy = -h * 0.6;
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const ang = i * Math.PI / 3 + 0.3, r0 = 6 + k * 8, r1 = 12 + k * 22;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); ctx.stroke();
      }
    }
  } else { // arc de taille en 3 couches (halo, corps, filet blanc) + étincelles en tête
    const cy = -h * 0.6, r = Math.max(40, reach * 0.95) * (0.95 + 0.1 * big);
    const a0 = -Math.PI * 0.78, a1 = lerp(a0, Math.PI * 0.22, Math.min(1, pt * 1.6));
    ctx.strokeStyle = `rgba(${col},${0.2 * a})`; ctx.lineWidth = 24 * big; ctx.beginPath(); ctx.arc(0, cy, r, a0, a1); ctx.stroke();
    ctx.strokeStyle = `rgba(${col},${0.5 * a})`; ctx.lineWidth = 10 * big; ctx.beginPath(); ctx.arc(0, cy, r, Math.max(a0, a1 - 1.3), a1); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, cy, r, Math.max(a0, a1 - 0.8), a1); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`;
    for (let i = 0; i < 3; i++) { const ang = a1 + 0.05 * i, rr = r + (i - 1) * 9; ctx.beginPath(); ctx.arc(Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 2.6 - i * 0.5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

// Traits de vitesse derrière un combattant qui charge (dash, spécial « direct ») ou pique du ciel (dive)
function drawSpeedLines(ctx, h, vertical, gt, col) {
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const ph = (gt * 6 + i * 0.37) % 1, al = 0.55 * (1 - ph);
    ctx.strokeStyle = `rgba(${col},${al})`; ctx.lineWidth = 3;
    ctx.beginPath();
    if (vertical) { const x = (i - 2) * 14; ctx.moveTo(x, -h - 10 - ph * 30); ctx.lineTo(x, -h * 0.4 - ph * 30); }
    else { const y = -h * (0.2 + i * 0.15); ctx.moveTo(-20 - ph * 20, y); ctx.lineTo(-70 - ph * 40, y); }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- Dangers (sol : annonce ; objet : ce qui frappe) ----------
function warnPulse(t) { return 0.5 + Math.sin(t * 18) * 0.5; }
function drawDangerGround(ctx, d, sx, gt) {
  const warn = d.t < d.warn, p = Math.min(1, d.t / d.warn), pul = warnPulse(gt);
  ctx.save();
  switch (d.type) {
    case 'brick': case 'block': case 'petanque': case 'bomb': case 'strike':
      if (warn) { // cible qui se resserre
        ctx.fillStyle = `rgba(255,40,40,${0.15 + 0.2 * p})`; ctx.beginPath(); ctx.ellipse(sx, d.y, d.rx, d.ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,${80 + pul * 120},60,0.9)`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.ellipse(sx, d.y, d.rx, d.ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(sx, d.y, d.rx * p, d.ry * p, 0, 0, Math.PI * 2); ctx.fill(); // ombre qui grossit
      } else if (d.type === 'brick' || d.type === 'block') { // débris au sol
        ctx.globalAlpha = Math.max(0, 1 - (d.t - d.warn) / 0.8);
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        if (d.type === 'brick') { const n = Math.round(d.rx / 9); for (let k = 0; k < n; k++) rrect(ctx, sx - d.rx * 0.7 + k * (d.rx * 1.4 / n), d.y - 8 - (k % 3) * 6, 16, 8, 1, '#c0392b'); ctx.strokeStyle = 'rgba(60,40,20,.5)'; ctx.beginPath(); ctx.moveTo(sx - d.rx * 0.8, d.y + 4); ctx.lineTo(sx - 10, d.y - 2); ctx.lineTo(sx + d.rx * 0.6, d.y + 6); ctx.stroke(); } // tas de briques + fissure au sol
        else { ctx.fillStyle = '#c0632b'; ctx.fillRect(sx - 24, d.y - 30, 48, 30); ctx.fillStyle = '#7b3f1a'; ctx.fillRect(sx - 24, d.y - 16, 48, 3); }
      }
      break;
    case 'car': // la ligne de la voiture clignote
      if (warn) { ctx.fillStyle = `rgba(255,220,80,${0.12 + pul * 0.15})`; ctx.fillRect(0, d.y - 24, 4000, 48); }
      break;
    case 'laser': // ligne de visée du drone
      if (warn) { ctx.strokeStyle = `rgba(255,40,80,${0.4 + pul * 0.5})`; ctx.lineWidth = 2; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(0, d.y); ctx.lineTo(4000, d.y); ctx.stroke(); ctx.setLineDash([]); }
      break;
    case 'devil': // flèche d'avertissement au bord de l'écran
      if (warn) { ctx.fillStyle = `rgba(255,200,80,${0.25 + pul * 0.3})`; ctx.fillRect(0, d.y - 22, 4000, 44); }
      break;
    case 'spikes': {
      const n = Math.round(d.rx * 2 / 32);
      for (let k = 0; k < n; k++) {
        const x = sx - d.rx + k * 32;
        ctx.fillStyle = warn ? (Math.floor(gt * 10 + k) % 2 ? '#e74c3c' : '#7f8c8d') : '#555';
        ctx.fillRect(x, d.y - 6, 30, 12);
      }
      break;
    }
    case 'arrosage': case 'puddle': case 'acidrain': {
      const col = d.type === 'arrosage' ? '72,219,251' : '163,230,53';
      const grow = warn ? p : 1, fade = Math.min(1, (d.warn + d.act - d.t) / 0.5);
      if (warn) { ctx.strokeStyle = `rgba(${col},${0.5 + pul * 0.4})`; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(sx, d.y, d.rx, d.ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = `rgba(${col},${(warn ? 0.25 : 0.5) * fade})`;
      ctx.beginPath(); ctx.ellipse(sx, d.y, d.rx * grow, d.ry * grow, 0, 0, Math.PI * 2); ctx.fill();
      if (d.type !== 'arrosage' && !warn) for (let k = 0; k < 4; k++) { const bp = (gt * 1.5 + k * 0.27) % 1; ctx.fillStyle = `rgba(200,255,120,${(1 - bp) * fade})`; ctx.beginPath(); ctx.arc(sx + Math.cos(k * 1.7) * d.rx * 0.5, d.y - bp * 10, 3 + bp * 3, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
  }
  ctx.restore();
}
function drawDangerObj(ctx, d, sx, gt, VW) {
  const warn = d.t < d.warn, p = Math.min(1, d.t / d.warn), on = d.t >= d.warn && d.t < d.warn + d.act;
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 2;
  switch (d.type) {
    case 'brick': if (warn) { // palette de briques qui descend au câble de la grue (balancement), puis tombe
      const k = d.rx / 46, drop = p < 0.55 ? 0 : (p - 0.55) / 0.45;              // d'abord elle se balance en hauteur, puis chute
      const y = p < 0.55 ? d.y - 330 + p * 55 : d.y - 300 * (1 - drop * drop);
      const sw = p < 0.55 ? Math.sin(gt * 6) * 10 * (1 - p) : 0, x = sx + sw;
      ctx.strokeStyle = '#444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, -10); ctx.lineTo(x, y - 46 * k); ctx.stroke();
      if (drop === 0) { ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y - 40 * k, 7, 0, Math.PI); ctx.stroke(); } // crochet
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 46 * k); ctx.lineTo(x - 30 * k, y - 30 * k); ctx.moveTo(x, y - 46 * k); ctx.lineTo(x + 30 * k, y - 30 * k); ctx.stroke(); // élingues
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      rrect(ctx, x - 32 * k, y - 8 * k, 64 * k, 8 * k, 2, '#a0522d');
      for (let j = 0; j < 9; j++) rrect(ctx, x - 30 * k + (j % 3) * 20 * k, y - 8 * k - (Math.floor(j / 3) + 1) * 10 * k, 19 * k, 9 * k, 1, j % 2 ? '#b03a2e' : '#c0392b');
    } break;
    case 'block': if (warn) { const y = d.y - 520 * (1 - p * p); ctx.fillStyle = '#c0632b'; ctx.fillRect(sx - 24, y - 48, 48, 48); ctx.fillStyle = '#7b3f1a'; ctx.fillRect(sx - 24, y - 26, 48, 4); ctx.fillRect(sx - 2, y - 48, 4, 22); ctx.fillStyle = '#fff'; ctx.font = '900 22px monospace'; ctx.textAlign = 'center'; ctx.fillText('!', sx, y - 6); } break;
    case 'petanque': if (warn) { const y = d.y - 400 * (1 - p) + 0, x = sx - 160 * (1 - p); const g = ctx.createRadialGradient(x - 4, y - 18, 2, x, y - 14, 14); g.addColorStop(0, '#fff'); g.addColorStop(1, '#7f8c8d'); circle(ctx, x, y - 14, 13, g); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(x, y - 14, 9, 0.3, 2.6); ctx.stroke(); }
      else { const k = Math.min(1, (d.t - d.warn) / 0.6); circle(ctx, sx + k * 40, d.y - 14, 13, '#95a5a6'); } break;
    case 'bomb': if (warn) { // cartouche géante en cloche
      const x = lerp(d.x0, d.x, p) - (d.x - sx), y = lerp(d.y0, d.y, p) - Math.sin(p * Math.PI) * 220;
      ctx.save(); ctx.translate(x, y - 40); ctx.rotate(gt * 8); ctx.scale(1.8, 1.8);
      rrect(ctx, -12, -15, 24, 30, 3, '#7f8c8d'); rrect(ctx, -8, -10, 16, 13, 2, '#e84393'); ctx.restore();
    } break;
    case 'strike': { // drone + laser vertical
      const dy = warn ? -40 + p * 40 : 0;
      ctx.save(); ctx.translate(sx, 60 + dy);
      ell(ctx, 0, 0, 26, 9, '#dfe6e9'); ctx.fillStyle = '#2d3436'; ctx.fillRect(-34, -6, 14, 3); ctx.fillRect(20, -6, 14, 3);
      circle(ctx, 0, 6, 5, warn ? (Math.floor(gt * 12) % 2 ? '#ff4757' : '#fff') : '#ff4757'); ctx.restore();
      if (on || (d.t < d.warn + d.act + 0.2 && !warn)) { ctx.fillStyle = 'rgba(255,71,87,.85)'; ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 20; ctx.fillRect(sx - 10, 66, 20, d.y - 66); ctx.fillStyle = '#fff'; ctx.fillRect(sx - 3, 66, 6, d.y - 66); ctx.shadowBlur = 0; }
    } break;
    case 'car': if (d.cx !== undefined || warn) {
      const B = Game.bounds(), dir = Math.sign(d.vx);
      if (warn) { // phares au bord de l'écran
        const ex = (dir > 0 ? B.L : B.R) - Game.camX;
        ctx.fillStyle = `rgba(255,250,200,${0.4 + warnPulse(gt) * 0.5})`; ctx.beginPath(); ctx.arc(ex + dir * 10, d.y - 30, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#feca57'; ctx.font = '900 34px "Arial Black", Arial'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeText('!', ex + dir * 40, d.y - 40); ctx.fillText('!', ex + dir * 40, d.y - 40);
      } else {
        const x = d.cx - Game.camX;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, d.y, 110, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(x, d.y); ctx.scale(-dir * 0.62, 0.62); drawVehicle(ctx, 'sport', gt, true, false);
      }
    } break;
    case 'laser': {
      const B = Game.bounds();
      ctx.save(); ctx.translate(B.L - Game.camX + 40, d.y - 150); // drone à gauche de la ligne
      ell(ctx, 0, 0, 24, 8, '#dfe6e9'); circle(ctx, 0, 6, 5, '#ff4757'); ctx.restore();
      if (on) { ctx.fillStyle = 'rgba(255,40,80,.8)'; ctx.shadowColor = '#ff2850'; ctx.shadowBlur = 18; ctx.fillRect(0, d.y - 12, VW, 24); ctx.fillStyle = '#fff'; ctx.fillRect(0, d.y - 3, VW, 6); ctx.shadowBlur = 0; }
    } break;
    case 'devil': if (!warn && d.cx !== undefined) { // tourbillon de sable
      const x = d.cx - Game.camX;
      for (let k = 0; k < 7; k++) { const r = 10 + k * 6, yy = d.y - k * 16; ctx.strokeStyle = `rgba(214,170,100,${0.75 - k * 0.07})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x + Math.sin(gt * 10 + k) * 6, yy, r, r * 0.3, 0, gt * 8 + k, gt * 8 + k + 4.5); ctx.stroke(); }
    } break;
    case 'spikes': if (on) { const n = Math.round(d.rx * 2 / 32); for (let k = 0; k < n; k++) { const x = sx - d.rx + k * 32; ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); for (let j = 0; j < 3; j++) { ctx.moveTo(x + j * 10, d.y); ctx.lineTo(x + j * 10 + 5, d.y - 34); ctx.lineTo(x + j * 10 + 10, d.y); } ctx.fill(); } } break;
    case 'arrosage': { // arroseur qui sort du sol, puis jets d'eau
      const up = warn ? p * 16 : 16;
      rrect(ctx, sx - 5, d.y - up, 10, up, 2, '#2d3436');
      if (!warn && on) for (let k = 0; k < 14; k++) { const a = gt * 6 + k * 0.45, r = d.rx * ((gt * 2 + k * 0.13) % 1); ctx.fillStyle = 'rgba(116,185,255,.8)'; ctx.fillRect(sx + Math.cos(a) * r, d.y - up - Math.sin(((gt * 2 + k * 0.13) % 1) * Math.PI) * 60 + Math.sin(a) * r * 0.35, 3, 6); }
    } break;
    case 'acidrain': { // nuage toxique au-dessus, puis pluie verte
      const fade = Math.min(1, d.t / 0.4, (d.warn + d.act - d.t) / 0.4 + 0.01);
      ctx.fillStyle = `rgba(70,90,40,${0.75 * Math.max(0, fade)})`;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(sx - d.rx + k * d.rx * 0.5, 70 + Math.sin(gt + k) * 4, 34, 0, Math.PI * 2); ctx.fill(); }
      if (on) { ctx.strokeStyle = 'rgba(163,230,53,.75)'; ctx.lineWidth = 2; for (let k = 0; k < 26; k++) { const x = sx - d.rx + ((k * 37) % (d.rx * 2)), y = 90 + ((gt * 700 + k * 53) % (d.y - 90)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14); ctx.stroke(); } }
    } break;
  }
  ctx.restore();
}

// ---------- Compagnons / animaux ----------
// Chiens : museau long, oreilles tombantes, pattes longues, queue touffue, langue qui pend à l'attaque.
const DOG_PAL = {
  // Aïka : robe fauve/sable unie, poitrail crème, collier rouge à médaille (on la reconnaît tout de suite)
  aika:   { body: '#d99a52', dark: '#a8692f', light: '#fbe7c6', ear: '#8a5526', muzzle: '#fbe7c6', collar: '#e74c3c' },
  // Berger australien bleu merle : gris-bleu marbré de noir, marques cuivre (joues, pattes) et blanches (liste, poitrail)
  berger: { body: '#97a9bd', dark: '#3d4552', light: '#ffffff', ear: '#2f3542', muzzle: '#ffffff', copper: '#c46a2e', merle: true },
};
function drawDog(ctx, x, y, t, lunge = 0, open = false, pal = DOG_PAL.aika, s = 1) {
  ctx.save(); ctx.translate(x + lunge, y); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const a = Math.sin(t * 14), wag = Math.sin(t * 9);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  // une patte : longue, avec l'extrémité cuivrée (berger) ou foncée
  const leg = (lx, ang, col) => {
    ctx.save(); ctx.translate(lx, -30); ctx.rotate(ang);
    rrect(ctx, -3.6, 0, 7.2, 31, 3.6, col);
    ctx.fillStyle = pal.copper || pal.dark; ctx.fillRect(-2.3, 20, 4.6, 8);
    ctx.restore();
  };
  // queue touffue qui remue
  ctx.save(); ctx.translate(-24, -38); ctx.rotate(-0.55 + wag * 0.28);
  ell(ctx, -13, -3, 15, 7.5, pal.body);
  ell(ctx, -24, -4, 5.5, 4.5, pal.light, false);
  ctx.restore();
  // pattes du fond (plus sombres)
  leg(-13, a * 0.38, pal.dark); leg(17, -a * 0.38, pal.dark);
  // cou
  ell(ctx, 23, -45, 9, 13, pal.body, true, 0.55);
  // corps
  ell(ctx, 0, -34, 27, 12.5, pal.body);
  if (pal.merle) { // marbrures noires du bleu merle
    ctx.fillStyle = pal.dark;
    [[-12, -37, 6, 4], [5, -30, 5, 3.4], [-2, -41, 4, 2.6], [14, -38, 4.5, 3], [-20, -31, 3.5, 2.6]].forEach(([ex, ey, rx, ry]) => { ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0.3, 0, Math.PI * 2); ctx.fill(); });
  }
  // pattes avant-plan
  leg(-19, -a * 0.38, pal.body); leg(21, a * 0.38, pal.body);
  // poitrail / collerette
  ell(ctx, 21, -36, 7, 9.5, pal.light, false);
  // tête : crâne + long museau
  ell(ctx, 32, -55, 11, 10, pal.body);
  // mâchoire du bas (pivote vers le bas quand la gueule s'ouvre)
  ctx.save(); ctx.translate(37, -48); ctx.rotate(open ? 0.32 : 0.05);
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(15, -1); ctx.quadraticCurveTo(17, 2, 13, 4); ctx.lineTo(0, 4); ctx.closePath();
  ctx.fillStyle = pal.muzzle; ctx.fill(); ctx.stroke();
  ctx.restore();
  if (open) { // langue qui pend
    const wob = Math.sin(t * 22) * 1.5;
    ctx.fillStyle = '#ff6b81'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(41, -45); ctx.quadraticCurveTo(41, -34, 45 + wob, -32); ctx.quadraticCurveTo(49 + wob, -34, 47, -45); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,30,60,.6)'; ctx.beginPath(); ctx.moveTo(44, -43); ctx.lineTo(45 + wob * 0.5, -35); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  }
  // museau long et effilé qui prolonge le crâne
  ctx.beginPath(); ctx.moveTo(33, -61); ctx.quadraticCurveTo(46, -59, 53, -56); ctx.quadraticCurveTo(57, -53, 54, -49);
  ctx.lineTo(37, -47); ctx.quadraticCurveTo(32, -50, 33, -61); ctx.closePath();
  ctx.fillStyle = pal.muzzle; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, -49); ctx.lineTo(52, -50); ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 2.5; // babines
  ell(ctx, 54, -54, 3.4, 2.8, INK, false); // truffe
  if (pal.copper) { ctx.fillStyle = pal.copper; ctx.beginPath(); ctx.ellipse(31, -50, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); circle(ctx, 35, -62, 2, pal.copper, false); }
  if (pal.merle) { ctx.fillStyle = pal.light; ctx.beginPath(); ctx.ellipse(37, -61, 2.6, 5, -0.4, 0, Math.PI * 2); ctx.fill(); } // liste blanche
  circle(ctx, 36, -58, 2.4, INK, false); circle(ctx, 36.8, -58.8, 0.8, '#fff', false); // œil
  // oreille tombante (plus d'oreilles pointues de chat)
  ctx.save(); ctx.translate(27, -62); ctx.rotate(0.45 + Math.sin(t * 7) * 0.08 + (open ? -0.2 : 0));
  ell(ctx, 0, 8, 5.2, 10.5, pal.ear);
  ctx.restore();
  if (pal.collar) { // collier rouge + médaille dorée d'Aïka
    ctx.save(); ctx.translate(25, -46); ctx.rotate(0.55);
    rrect(ctx, -2.8, -8, 5.6, 16, 2.5, pal.collar);
    ctx.restore();
    circle(ctx, 22, -39, 3, '#f1c40f');
  }
  ctx.restore();
}
function drawSheep(ctx, x, y, t, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const a = Math.sin(t * 16);
  ctx.fillStyle = INK;
  ctx.fillRect(-14, -16, 6, 16 + a * 4); ctx.fillRect(9, -16, 6, 16 - a * 4);
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  circle(ctx, -10, -26, 14, '#f5f6fa'); circle(ctx, 10, -26, 14, '#f5f6fa'); circle(ctx, 0, -36, 17, '#f5f6fa');
  rrect(ctx, 12, -42, 18, 14, 6, '#222', false);
  circle(ctx, 24, -37, 2, '#fff', false);
  ctx.restore();
}
function drawCat(ctx, t, pose, robot) {
  const a = Math.sin(t * 16);
  const body = robot ? '#b2bec3' : '#e17055', dark = robot ? '#636e72' : '#b35a3f';
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  rrect(ctx, -16, -14, 6, 14 + a * 3, 3, dark); rrect(ctx, 10, -14, 6, 14 - a * 3, 3, dark);
  rrect(ctx, -22, -32, 44, 20, 10, body);
  if (!robot) { ctx.strokeStyle = dark; ctx.lineWidth = 3; for (let i = -12; i < 12; i += 8) { ctx.beginPath(); ctx.moveTo(i, -31); ctx.lineTo(i + 3, -20); ctx.stroke(); } }
  ctx.strokeStyle = robot ? '#636e72' : body; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-20, -28); ctx.quadraticCurveTo(-34, -40, -26 + a * 3, -54); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  circle(ctx, 22, -38, 13, body);
  poly(ctx, [[12, -46], [14, -60], [22, -50]], body); poly(ctx, [[24, -50], [32, -60], [33, -45]], body);
  if (robot) {
    ctx.fillStyle = '#00d2d3'; ctx.shadowColor = '#00d2d3'; ctx.shadowBlur = 8;
    ctx.fillRect(22, -42, 9, 4); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#636e72'; ctx.beginPath(); ctx.moveTo(18, -50); ctx.lineTo(16, -62); ctx.stroke(); circle(ctx, 16, -63, 2.5, '#ff4757', false);
    ctx.fillStyle = '#636e72'; ctx.fillRect(-10, -30, 4, 14); ctx.fillRect(2, -30, 4, 14);
  } else {
    ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.ellipse(27, -40, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    circle(ctx, 27, -40, 1.2, INK, false);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(34, -34); ctx.lineTo(44, -36); ctx.moveTo(34, -32); ctx.lineTo(44, -31); ctx.stroke();
  }
  if (pose === 'attack') { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(34, -32); ctx.lineTo(26, -30); ctx.lineTo(33, -27); ctx.fill(); }
}
function drawSeagull(ctx, t, pose) {
  const flap = Math.sin(t * (pose === 'attack' ? 22 : 12));
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  // aile arrière
  poly(ctx, [[-4, -20], [-26, -20 - flap * 22], [-8, -12]], '#b2bec3');
  ell(ctx, 0, -16, 24, 12, '#fdfdfd');
  ctx.fillStyle = '#636e72'; ctx.beginPath(); ctx.ellipse(-6, -21, 14, 5, 0, Math.PI, 0); ctx.fill();
  poly(ctx, [[-22, -18], [-34, -24], [-32, -12]], '#2d3436');
  // tête + énorme goitre
  circle(ctx, 20, -26, 10, '#fdfdfd');
  ell(ctx, 28, -12, 13, 11, '#ffcccc'); // goitre
  ctx.strokeStyle = 'rgba(200,80,80,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(28, -12, 6, 0.3, 2.6); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  const open = pose === 'attack' ? 5 : 1;
  poly(ctx, [[27, -28], [46, -24], [27, -22 - open]], '#f6b93b');
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(40, -25, 4, 3);
  circle(ctx, 22, -29, 2.2, INK, false);
  // aile avant
  poly(ctx, [[0, -20], [-16, -24 - flap * 30], [12, -14]], '#dfe6e9');
  ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(-6, 2); ctx.moveTo(4, -6); ctx.lineTo(4, 2); ctx.stroke();
}
function drawUrchin(ctx, t, rolling) {
  ctx.save(); ctx.translate(0, -20); ctx.rotate(rolling);
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    poly(ctx, [[Math.cos(a - 0.15) * 15, Math.sin(a - 0.15) * 15], [Math.cos(a) * 30, Math.sin(a) * 30], [Math.cos(a + 0.15) * 15, Math.sin(a + 0.15) * 15]], '#4b2a63');
  }
  circle(ctx, 0, 0, 17, '#6c3483');
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  circle(ctx, 5, -24, 4, '#fff'); circle(ctx, 13, -24, 4, '#fff');
  circle(ctx, 6, -24, 1.8, INK, false); circle(ctx, 14, -24, 1.8, INK, false);
  ctx.beginPath(); ctx.moveTo(1, -31); ctx.lineTo(9, -28); ctx.moveTo(17, -31); ctx.lineTo(10, -28); ctx.stroke();
}
function drawSlime(ctx, t, pose, airborne) {
  const sq = airborne ? 0.85 : 1 + Math.sin(t * 8) * 0.06;
  ctx.save(); ctx.scale(1 / sq, sq);
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-24, 0); ctx.quadraticCurveTo(-26, -34, 0, -38); ctx.quadraticCurveTo(26, -34, 24, 0); ctx.closePath();
  ctx.fillStyle = '#2ecc71'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-14, -30, 6, 6); ctx.fillRect(-8, -32, 4, 4);
  ctx.fillStyle = INK; ctx.fillRect(4, -24, 5, 8); ctx.fillRect(14, -24, 5, 8);
  ctx.restore();
}
// Petits sprites pixel (grilles de caractères) pour le monde de Faouzi
const PIX = {
  chevalier: ['....HHHH....', '...HHHHHH...', '...HVVVVH...', '...HHHHHH...', '....AAAA....', '..AAAAAAAA..', '.AAATAATAAA.', '.AA.AAAA.AA.', '.SS.AAAA.SS.', '....AAAA....', '....L..L....', '....L..L....', '...BB..BB...'],
  saucer:    ['.....GG.....', '....GEEG....', '....GGGG....', '..WWWWWWWW..', '.MMMMMMMMMM.', 'MMYMMYMMYMMM', '.MMMMMMMMMM.', '..........  '],
  chauve:    ['P..........P', 'PP...PP...PP', 'PPP.PPPP.PPP', 'PPPPPRRPPPPP', '.PPPPPPPPPP.', '..P..PP..P..'],
  coeur:     ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
};
const PIX_COL = { H: '#95a5a6', V: '#2d3436', A: '#3498db', T: '#f1c40f', S: '#ecf0f1', L: '#2c3e50', B: '#6d4c41', G: '#2ecc71', E: '#111', W: '#dfe6e9', M: '#7f8c8d', Y: '#f1c40f', P: '#6c3483', R: '#e74c3c' };
function drawPix(ctx, rows, px, ox, oy) {
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = PIX_COL[r[x]]; if (c) { ctx.fillStyle = c; ctx.fillRect(ox + x * px, oy + y * px, px, px); } } });
}
function drawRobot(ctx, t, pose, label, walk, dir = 1) {
  const sw = Math.sin(walk) * 4;
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  rrect(ctx, -16, -26, 12, 26 + sw, 3, '#636e72'); rrect(ctx, 4, -26, 12, 26 - sw, 3, '#636e72');
  rrect(ctx, -26, -78, 52, 54, 8, '#b2bec3');
  rrect(ctx, -22, -70, 44, 22, 4, '#1e272e');
  ctx.save(); ctx.scale(dir, 1); // texte toujours lisible
  ctx.fillStyle = '#00d2d3'; ctx.font = `900 ${label.length > 7 ? 6 : 9}px Arial`; ctx.textAlign = 'center';
  ctx.fillText(label, 0, -56); ctx.restore();
  rrect(ctx, -18, -102, 36, 26, 7, '#dfe6e9');
  ctx.fillStyle = '#ff4757'; ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 8; ctx.fillRect(-2, -95, 18, 7); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(0, -102); ctx.lineTo(0, -114); ctx.stroke(); circle(ctx, 0, -116, 3.5, '#f1c40f');
  // bras canon
  const ang = pose === 'windup' || pose === 'attack' ? -Math.PI / 2 : -0.4;
  ctx.save(); ctx.translate(18, -70); ctx.rotate(ang);
  rrect(ctx, -6, 0, 12, 34, 5, '#95a5a6'); rrect(ctx, -8, 30, 16, 10, 3, '#2d3436');
  if (pose === 'windup') circle(ctx, 0, 44, 5 + Math.sin(t * 40) * 2, '#ff4757', false);
  ctx.restore();
}

// ---------- Humains : héros/boss et ennemis humanoïdes ----------
const HUMANS = {
  christian: {
    bw: 60, bh: 72, color: '#2c3e50', light: '#95a5a6', item: 'truelle', idleArm: -0.9,
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      circle(ctx, -hr * 0.75, hy - hr * 0.05, hr * 0.32, '#bdc3c7'); // cheveux gris
      ctx.beginPath(); ctx.arc(0, hy - hr * 0.3, hr * 1.05, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fillStyle = '#f1c40f'; ctx.fill(); ctx.stroke(); // casque
      rrect(ctx, -hr * 1.1, hy - hr * 0.42, hr * 2.45, 6, 3, '#f39c12');
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-hr * 0.4, hy - hr * 1.2, 5, hr * 0.7);
      const ey = hy + hr * 0.05;
      eyeDot(ctx, hr * 0.2, ey, 2.5, hurt); eyeDot(ctx, hr * 0.68, ey, 2.5, hurt);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
      circle(ctx, hr * 0.2, ey, 7); circle(ctx, hr * 0.68, ey, 7);
      ctx.beginPath(); ctx.moveTo(hr * 0.33, ey); ctx.lineTo(hr * 0.55, ey); ctx.stroke();
    },
  },
  guilhem: {
    bw: 36, bh: 112, color: '#1e272e', light: '#485460', hand: 'watch', punch: true,
    face(ctx, hr, hy, pose, t, hurt) {
      hairDome(ctx, hr, hy, '#8b4513', 1.05, 1.95, 0.2);
      eyeDot(ctx, hr * 0.42, hy - hr * 0.08, 2.5, hurt); // pas de lunettes
    },
    torso(ctx, w, h, bob) { ctx.fillStyle = '#f1c40f'; ctx.fillRect(-2, -h * 0.78 + bob, 4, h * 0.5); },
  },
  fateh: {
    bw: 42, bh: 108, color: '#8e44ad', light: '#9b59b6', punch: true,
    face(ctx, hr, hy, pose, t, hurt) {
      hairDome(ctx, hr, hy, '#5d3a1a', 1.0, 2.0, 0.28, 1.05);
      ctx.fillStyle = '#5d3a1a'; ctx.fillRect(-hr * 1.0, hy - hr * 0.4, hr * 0.5, hr * 0.7);
      eyeDot(ctx, hr * 0.42, hy - hr * 0.05, 3, hurt);
      ctx.fillStyle = 'rgba(93,58,26,.45)'; ctx.beginPath(); ctx.arc(hr * 0.2, hy + hr * 0.45, hr * 0.55, 0, Math.PI); ctx.fill();
    },
  },
  faouzi: {
    // plus mince : largeur 38 (au lieu de 48), bras et jambes fins, tête gardée à la même taille
    bw: 38, bh: 92, headR: 17, armW: 7.5, legW: 9, color: '#a68a5b', light: '#d1b98a', legs: '#6d4c41', item: 'cartouche', idleArm: -0.5,
    face(ctx, hr, hy, pose, t, hurt) {
      hairDome(ctx, hr, hy, '#111', 1.0, 2.0, 0.25, 1.04);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-hr * 0.2, hy - hr * 1.1); ctx.quadraticCurveTo(hr * 0.8, hy - hr * 1.0, hr * 0.95, hy - hr * 0.4); ctx.lineTo(hr * 0.2, hy - hr * 0.7); ctx.fill();
      eyeDot(ctx, hr * 0.45, hy - hr * 0.02, 3, hurt);
    },
    torso(ctx, w, h, bob) { // gilet de papy
      ctx.strokeStyle = '#7a6440'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w * 0.15, -h * 0.78 + bob); ctx.lineTo(w * 0.15, -h * 0.24 + bob); ctx.stroke();
      for (let i = 0; i < 4; i++) circle(ctx, w * 0.25, -h * 0.7 + i * h * 0.12 + bob, 2.5, '#5d4037', false);
      ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.moveTo(w * 0.05, -h * 0.8 + bob); ctx.lineTo(w * 0.3, -h * 0.8 + bob); ctx.lineTo(w * 0.17, -h * 0.68 + bob); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
    },
  },
  venum: {
    bw: 46, bh: 96, color: '#2d3436', light: '#636e72', hand: 'glove', backHand: 'glove', punch: true, overhead: false, idleArm: -1.6,
    face(ctx, hr, hy, pose, t, hurt) {
      hairDome(ctx, hr, hy, '#2d3436', 1.08, 1.92, 0.15, 1.0);
      eyeDot(ctx, hr * 0.45, hy - hr * 0.05, 3, hurt);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hr * 0.2, hy - hr * 0.35); ctx.lineTo(hr * 0.7, hy - hr * 0.22); ctx.stroke();
    },
    torso(ctx, w, h, bob) { ctx.fillStyle = '#d63031'; ctx.fillRect(-w / 2 + 2, -h * 0.34 + bob, w - 4, 7); },
  },
  senoussi: {
    bw: 60, bh: 96, color: '#d35400', light: '#e67e22', belly: 0.45, item: 'pelleGrande', idleArm: -0.6,
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      circle(ctx, -hr * 0.6, hy - hr * 0.6, hr * 0.55, '#8b4513');
      circle(ctx, hr * 0.5, hy - hr * 0.7, hr * 0.55, '#8b4513');
      circle(ctx, -hr * 0.05, hy - hr * 0.95, hr * 0.68, '#8b4513');
      eyeDot(ctx, hr * 0.42, hy - hr * 0.05, 3, hurt);
    },
  },
  purf: {
    bw: 66, bh: 96, color: '#c0392b', light: '#e74c3c', belly: 0.5,
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      rrect(ctx, -hr * 0.8, hy - hr * 1.0, hr * 1.6, hr * 0.4, 6, '#5c4033');
      eyeDot(ctx, hr * 0.42, hy - hr * 0.08, 3, hurt);
      rrect(ctx, hr * 0.05, hy + hr * 0.2, hr * 0.85, hr * 0.28, 5, '#5c4033');
      ctx.fillStyle = 'rgba(163,230,53,.45)'; ctx.beginPath(); ctx.arc(hr * 0.3, hy + hr * 0.1, hr * 0.5, 0, Math.PI * 2); ctx.fill();
    },
    front(ctx, o, w, h, hr, hy) { // poudre toxique qui tombe du visage
      const t = o.t || 0;
      for (let i = 0; i < 9; i++) {
        const ph = (t * 0.9 + i / 9) % 1;
        ctx.fillStyle = `rgba(163,230,53,${0.9 * (1 - ph)})`;
        ctx.fillRect(hr * 0.3 + Math.sin(i * 3.1 + t) * hr * 0.6, hy + hr * 0.5 + ph * (h * 0.9), 4, 4);
      }
    },
  },
  // --- ennemis humanoïdes ---
  ouvrier: {
    bw: 34, bh: 62, color: '#e67e22', light: '#f39c12', legs: '#2c3e50', item: o => ['tournevis', 'marteau', 'pelle'][(o.variant || 0) % 3], idleArm: -0.7,
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, hy - hr * 0.3, hr * 1.05, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fillStyle = '#fdfdfd'; ctx.fill(); ctx.stroke();
      rrect(ctx, -hr * 1.1, hy - hr * 0.42, hr * 2.4, 5, 2, '#dfe6e9');
      eyeDot(ctx, hr * 0.45, hy + hr * 0.02, 2.5, hurt);
      ctx.fillStyle = '#5d4037'; ctx.fillRect(hr * 0.2, hy + hr * 0.3, hr * 0.6, 3);
    },
    torso(ctx, w, h, bob) { ctx.fillStyle = '#ecf0f1'; ctx.fillRect(-w / 2 + 2, -h * 0.6 + bob, w - 4, 4); ctx.fillRect(-w / 2 + 2, -h * 0.45 + bob, w - 4, 4); },
  },
  rappeur: {
    bw: 46, bh: 98, color: '#2d3436', light: '#6c5ce7', legs: '#1e272e', shoes: '#fdfdfd', item: 'batte', idleArm: -0.5,
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, hy - hr * 0.25, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fillStyle = '#d63031'; ctx.fill(); ctx.stroke();
      rrect(ctx, -hr * 1.7, hy - hr * 0.45, hr * 0.9, 6, 3, '#d63031'); // visière à l'envers
      rrect(ctx, hr * 0.1, hy - hr * 0.2, hr * 0.85, 7, 3, '#111'); // lunettes noires
    },
    torso(ctx, w, h, bob) {
      ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(4, -h * 0.8 + bob, w * 0.32, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; circle(ctx, 4, -h * 0.8 + w * 0.32 + bob, 6, '#f1c40f');
      ctx.fillStyle = INK; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('$', 4, -h * 0.8 + w * 0.32 + 3 + bob);
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
    },
  },
  skateur: {
    bw: 40, bh: 96, color: '#00b894', light: '#55efc4', legs: '#0984e3', item: 'batte', idleArm: -0.6, stiffLegs: true,
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, hy - hr * 0.25, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fillStyle = '#0984e3'; ctx.fill(); ctx.stroke();
      rrect(ctx, -hr * 1.7, hy - hr * 0.45, hr * 0.9, 6, 3, '#0984e3');
      eyeDot(ctx, hr * 0.45, hy - hr * 0.05, 2.5, hurt);
    },
    under(ctx, o) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      rrect(ctx, -34, -10, 68, 7, 3, '#e17055');
      circle(ctx, -22, -1, 5, '#f1c40f'); circle(ctx, 22, -1, 5, '#f1c40f');
      ctx.translate(0, -10);
    },
  },
  papy: {
    bw: 40, bh: 86, color: '#a29276', light: '#c8b89a', legs: '#6d4c41', item: 'canne', idleArm: -0.4,
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      circle(ctx, -hr * 0.8, hy, hr * 0.35, '#ecf0f1'); circle(ctx, -hr * 0.3, hy - hr * 0.7, hr * 0.28, '#ecf0f1');
      const ey = hy - hr * 0.05;
      eyeDot(ctx, hr * 0.45, ey, 2.2, hurt);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; circle(ctx, hr * 0.45, ey, 6.5);
      ctx.strokeStyle = '#bdc3c7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hr * 0.2, hy + hr * 0.35); ctx.lineTo(hr * 0.8, hy + hr * 0.35); ctx.stroke();
    },
  },
  runner: {
    bw: 36, bh: 96, color: '#0984e3', light: '#74b9ff', legs: '#ffeaa7', legsFront: '#ffeaa7', shoes: '#ff7675', punch: true, idleArm: -0.9,
    face(ctx, hr, hy, pose, t, hurt) {
      hairDome(ctx, hr, hy, '#6d4c41', 1.05, 1.95, 0.2);
      rrect(ctx, -hr, hy - hr * 0.5, hr * 2, 6, 3, '#e84393');
      eyeDot(ctx, hr * 0.45, hy - hr * 0.05, 2.5, hurt);
    },
    torso(ctx, w, h, bob) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('42', 0, -h * 0.55 + bob); ctx.fillStyle = '#1e272e'; ctx.fillRect(-w / 2, -h * 0.3 + bob, w, h * 0.08); },
  },
  indien: {
    bw: 44, bh: 96, color: '#f5f6fa', light: '#ffffff', legs: '#dfe6e9', skin: '#c68642', item: 'baton', idleArm: -0.5,
    face(ctx, hr, hy, pose, t, hurt) {
      hairDome(ctx, hr, hy, '#111', 1.05, 1.95, 0.22);
      circle(ctx, hr * 0.35, hy - hr * 0.42, 3, '#e74c3c', false); // point rouge
      eyeDot(ctx, hr * 0.45, hy - hr * 0.02, 2.5, hurt);
      ctx.fillStyle = '#111'; ctx.fillRect(hr * 0.2, hy + hr * 0.28, hr * 0.6, 3);
    },
    torso(ctx, w, h, bob) { ctx.fillStyle = '#ff9f43'; ctx.fillRect(-w / 2 + 2, -h * 0.8 + bob, w - 4, 6); ctx.fillRect(-2, -h * 0.8 + bob, 4, h * 0.5); },
  },
  zombie: {
    bw: 46, bh: 98, color: '#4b6584', light: '#778ca3', legs: '#3d4f5c', skin: '#7bed9f', armFwd: true, stiffLegs: false,
    face(ctx, hr, hy, pose, t, hurt) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      circle(ctx, hr * 0.35, hy - hr * 0.1, 5, '#fff'); circle(ctx, -hr * 0.1, hy - hr * 0.1, 4, '#fff');
      ctx.fillStyle = '#3d0c02'; ctx.fillRect(hr * 0.05, hy + hr * 0.35, hr * 0.7, 4);
      ctx.fillStyle = 'rgba(46,213,115,.5)'; ctx.fillRect(-hr * 0.6, hy - hr * 0.7, hr * 0.5, hr * 0.3);
    },
    behind(ctx, o, w, h) {
      ctx.fillStyle = `rgba(46,213,115,${0.18 + Math.sin((o.t || 0) * 5) * 0.08})`;
      ctx.beginPath(); ctx.ellipse(0, -h * 0.5, w * 1.1, h * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    },
    torso(ctx, w, h, bob) { ctx.fillStyle = '#2d3436'; poly(ctx, [[-w / 2, -h * 0.3], [-w / 4, -h * 0.4], [0, -h * 0.28], [w / 4, -h * 0.38], [w / 2, -h * 0.3], [w / 2, -h * 0.24], [-w / 2, -h * 0.24]], '#2d3436', false); },
  },
};

// Héros / boss
function drawCharacter(ctx, kind, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale((o.dir || 1) * (o.scale || 1), o.scale || 1);
  const pose = o.pose || 'idle', pt = o.poseT || 0, t = o.t || 0;
  drawHumanoid(ctx, HUMANS[kind], o);
  if (kind === 'fateh' && o.companion) {
    const lunge = pose === 'attack' ? Math.sin(Math.min(1, pt) * Math.PI) * 34 : 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(14, -60); ctx.quadraticCurveTo(40, -30, 44 + lunge + 22 * 0.9, -41 * 0.9); ctx.stroke(); // laisse jusqu'au collier
    drawDog(ctx, 44, 0, t, lunge, pose === 'attack', DOG_PAL.aika, 0.9);
  }
  ctx.restore();
}

// Ennemis courants (et entourages)
function drawMinion(ctx, type, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale((o.dir || 1) * (o.scale || 1), o.scale || 1);
  const t = o.t || 0, pose = o.pose || 'idle';
  _face.pose = pose; _face.t = t;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (pose === 'down' || pose === 'hurt') ctx.rotate(pose === 'down' ? -0.6 : -0.2);
  switch (type) {
    case 'goeland': drawSeagull(ctx, t, pose); break;
    case 'berger': drawDog(ctx, -6, 0, t, 0, pose === 'attack' || pose === 'windup', DOG_PAL.berger); break;
    case 'aika': drawDog(ctx, -6, 0, t, 0, pose === 'attack' || pose === 'windup', DOG_PAL.aika, 1.1); break;
    case 'chat': drawCat(ctx, t, pose, false); break;
    case 'robochat': drawCat(ctx, t, pose, true); break;
    case 'mouton': drawSheep(ctx, 0, 0, t, 1.05); break;
    case 'agneau': drawSheep(ctx, 0, 0, t, 0.75); break;
    case 'oursin': drawUrchin(ctx, t, o.roll || 0); break;
    case 'slime': drawSlime(ctx, t, pose, o.air); break;
    case 'robot': drawRobot(ctx, t, pose, o.label || 'CLAUDE', o.walk || 0, o.dir || 1); break;
    case 'chevalier8': {
      const fr = Math.floor((o.walk || 0) / 2) % 2;
      drawPix(ctx, PIX.chevalier, 6.5, -39, -84 - (fr ? 3 : 0));
      // épée pixel
      const up = pose === 'windup' ? -1 : pose === 'attack' ? 1 : 0;
      ctx.fillStyle = '#ecf0f1'; ctx.fillRect(28, -66 - up * 22, 7, 34); ctx.fillStyle = '#f1c40f'; ctx.fillRect(22, -36 - up * 22, 19, 6);
      break;
    }
    case 'alien8': drawPix(ctx, PIX.saucer, 6.5, -39, -66 + Math.sin(t * 3) * 3); break;
    case 'chauve8': drawPix(ctx, Math.floor(t * 8) % 2 ? PIX.chauve : PIX.chauve.map(r => r.replace(/^P/, '.')), 6.5, -39, -40); break;
    case 'enfant': drawHumanoid(ctx, HUMANS.fateh, o); break;
    default: if (HUMANS[type]) drawHumanoid(ctx, HUMANS[type], o); else if (typeof drawRageMinion === 'function') drawRageMinion(ctx, type, o); // ennemis spéciaux (rage.js)
  }
  ctx.restore();
}

// Petite tête pour le HUD et les bulles
function drawHead(ctx, kind, x, y, size) {
  ctx.save(); ctx.translate(x, y);
  const s0 = HUMANS[kind];
  const hr = s0.headR || Math.max(15, s0.bw * 0.38);
  const s = size / (hr * 2.6);
  ctx.scale(s, s);
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  circle(ctx, 0, hr * 0.2, hr, s0.skin || SKIN);
  s0.face(ctx, hr, hr * 0.2, 'idle', 0, false, {});
  ctx.restore();
}

// ---------- Véhicules d'arrivée des boss (dessinés tournés vers la gauche) ----------
function drawVehicle(ctx, type, t, moving, doorOpen) {
  ctx.save(); ctx.scale(-1, 1);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  const wheel = (x, r, rim) => {
    ctx.save(); ctx.translate(x, -r); circle(ctx, 0, 0, r, '#1e272e');
    circle(ctx, 0, 0, r * 0.55, rim);
    ctx.rotate(moving ? -t * 14 : 0); ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.5, 0); ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = 3;
  };
  if (type === 'van') { // énorme camionnette de chantier
    rrect(ctx, -200, -250, 290, 225, 10, '#f5f6fa');
    rrect(ctx, 90, -190, 110, 165, 18, '#f5f6fa');
    rrect(ctx, 110, -175, 80, 60, 8, '#74b9ff');
    ctx.fillStyle = '#e67e22'; ctx.fillRect(-200, -120, 400, 22);
    ctx.fillStyle = INK; ctx.font = '900 30px Arial'; ctx.textAlign = 'center';
    ctx.save(); ctx.scale(-1, 1); ctx.fillText('BTP CHRISTIAN', 55, -150); ctx.restore();
    // échelle
    ctx.strokeStyle = '#95a5a6'; ctx.lineWidth = 4; ctx.strokeRect(-180, -268, 240, 14);
    for (let x = -170; x < 60; x += 22) { ctx.beginPath(); ctx.moveTo(x, -268); ctx.lineTo(x, -254); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    circle(ctx, 140, -196, 8, Math.floor(t * 4) % 2 ? '#f39c12' : '#e67e22'); // gyrophare
    if (doorOpen) rrect(ctx, -40, -200, 90, 170, 4, '#2d3436');
    else { ctx.beginPath(); ctx.moveTo(-40, -200); ctx.lineTo(-40, -30); ctx.stroke(); }
    wheel(-130, 38, '#bdc3c7'); wheel(130, 38, '#bdc3c7');
  } else if (type === 'sport') { // voiture de luxe
    ctx.beginPath(); ctx.moveTo(-170, -30); ctx.lineTo(-165, -70); ctx.lineTo(-60, -80); ctx.quadraticCurveTo(-10, -125, 60, -100);
    ctx.lineTo(165, -62); ctx.quadraticCurveTo(178, -45, 170, -28); ctx.closePath();
    const g = ctx.createLinearGradient(0, -120, 0, -30); g.addColorStop(0, '#ff6b6b'); g.addColorStop(1, '#b71540');
    ctx.fillStyle = g; ctx.fill(); ctx.stroke();
    poly(ctx, [[-50, -82], [-10, -114], [50, -98], [80, -82]], doorOpen ? '#2d3436' : '#1e272e');
    rrect(ctx, -178, -84, 26, 10, 3, '#111'); // aileron
    ctx.fillStyle = '#ffeaa7'; ctx.fillRect(150, -60, 16, 8);
    wheel(-110, 30, '#f1c40f'); wheel(110, 30, '#f1c40f');
  } else if (type === 'suv') { // SUV électrique blanc
    ctx.beginPath(); ctx.moveTo(-160, -30); ctx.lineTo(-160, -90); ctx.quadraticCurveTo(-130, -150, -20, -152);
    ctx.quadraticCurveTo(80, -150, 130, -95); ctx.quadraticCurveTo(168, -85, 166, -30); ctx.closePath();
    ctx.fillStyle = '#f5f6fa'; ctx.fill(); ctx.stroke();
    poly(ctx, [[-130, -98], [-100, -140], [40, -142], [110, -96]], doorOpen ? '#2d3436' : '#2f3542');
    ctx.strokeStyle = '#dfe6e9'; ctx.beginPath(); ctx.moveTo(-20, -142); ctx.lineTo(-20, -40); ctx.stroke(); ctx.strokeStyle = INK;
    ctx.fillStyle = '#00d2d3'; ctx.fillRect(150, -80, 14, 5);
    rrect(ctx, 120, -48, 40, 14, 3, '#fff');
    ctx.save(); ctx.scale(-1, 1); ctx.fillStyle = INK; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('IA-01', -140, -38); ctx.restore();
    wheel(-100, 34, '#636e72'); wheel(100, 34, '#636e72');
  }
  ctx.restore();
}

// ---------- Nourriture (soin) ----------
function drawFood(ctx, type, x, y, t) {
  ctx.save(); ctx.translate(x, y - 14 + Math.sin(t * 5) * 3);
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  switch (type) {
    case 'sandwich': rrect(ctx, -16, -6, 32, 14, 7, '#e1a95f'); rrect(ctx, -15, -9, 30, 5, 2, '#e17055'); ctx.fillStyle = '#2ecc71'; ctx.fillRect(-15, -4, 30, 3); break;
    case 'burger': ell(ctx, 0, -6, 16, 8, '#e1a95f'); rrect(ctx, -16, -2, 32, 6, 3, '#6d4c41'); ctx.fillStyle = '#2ecc71'; ctx.fillRect(-16, 3, 32, 3); rrect(ctx, -15, 5, 30, 7, 3, '#e1a95f'); break;
    case 'navette': ell(ctx, 0, 0, 18, 8, '#e1a95f'); ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke(); break;
    case 'coeur8': drawPix(ctx, PIX.coeur, 4, -14, -12); break;
    case 'batterie': rrect(ctx, -10, -14, 20, 28, 3, '#2d3436'); ctx.fillStyle = '#2ecc71'; ctx.fillRect(-7, -4, 14, 15); rrect(ctx, -4, -18, 8, 4, 1, '#95a5a6'); break;
    case 'dattes': ell(ctx, -6, 2, 6, 10, '#6d4c41', true, 0.4); ell(ctx, 6, 0, 6, 10, '#795548', true, -0.3); break;
    case 'conserve': default: rrect(ctx, -11, -14, 22, 28, 3, '#bdc3c7'); ctx.fillStyle = '#e74c3c'; ctx.fillRect(-11, -6, 22, 12); break;
  }
  ctx.restore();
}

// ---------- Projectiles ----------
function drawProjectile(ctx, p, t) {
  ctx.save(); ctx.translate(p.sx, p.sy);
  const d = p.vx >= 0 ? 1 : -1;
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  switch (p.kind) {
    case 'dog': ctx.scale(d, 1); drawDog(ctx, 0, 0, t * 1.6, 0, true, DOG_PAL.aika); break;
    case 'sheep': ctx.scale(d, 1); drawSheep(ctx, 0, 0, t * 1.4, 1.05); break;
    case 'cartouche':
      ctx.translate(0, -50); ctx.rotate(t * 14 * d);
      rrect(ctx, -12, -15, 24, 30, 3, '#7f8c8d'); rrect(ctx, -8, -10, 16, 13, 2, '#e84393');
      ctx.fillStyle = '#2d3436'; for (let i = -7; i <= 7; i += 4) ctx.fillRect(i, 8, 2, 6); break;
    case 'bolt': ctx.fillStyle = '#2ecc71'; ctx.fillRect(-10, -48, 20, 10); ctx.fillStyle = '#b8f5c9'; ctx.fillRect(-6, -46, 12, 6); break;
    case 'laser': ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 12; ctx.fillStyle = '#ff4757'; ctx.fillRect(-26, -72, 52, 6); ctx.fillStyle = '#fff'; ctx.fillRect(-22, -71, 44, 3); break;
    case 'billet': // liasse de billets (Guilhem, phase 2)
      ctx.translate(0, -56); ctx.rotate(Math.sin(t * 20) * 0.3);
      ctx.fillStyle = '#7bc96f'; ctx.strokeStyle = '#2d6a1f'; ctx.fillRect(-16, -9, 32, 18); ctx.strokeRect(-16, -9, 32, 18);
      ctx.fillStyle = '#f1c40f'; ctx.fillRect(-3, -9, 6, 18); ctx.fillStyle = '#2d6a1f'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('$', -9, 4); break;
    case 'quake': // fissure qui court au sol (Senoussi, phase 2)
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30 * d, 0);
      for (let i = 0; i < 6; i++) ctx.lineTo((-30 + i * 10) * d, (i % 2 ? -6 : 6));
      ctx.stroke(); ctx.fillStyle = '#c98a2f'; for (let i = 0; i < 4; i++) ctx.fillRect(rand(-14, 14), -rand(6, 40), 6, 6); break;
    default: if (typeof drawMiniProjectile === 'function') drawMiniProjectile(ctx, p, t, d); break; // projectiles des mini-boss (minis.js)
    case 'parmesan': ctx.translate(0, -60); ctx.rotate(t * 10); poly(ctx, [[-14, 8], [14, 8], [0, -14]], '#f6e58d'); circle(ctx, -3, 2, 2, '#e1c95f', false); circle(ctx, 4, 4, 1.5, '#e1c95f', false); break;
  }
  ctx.restore();
}
