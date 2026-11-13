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
// Le dessin des chiens et des moutons est dans betes.js (v4.2) ; ces deux noms restent pour le reste du jeu.
function drawDog(ctx, x, y, t, lunge = 0, open = false, pal = DOG_PAL.aika, s = 1, q = null) { drawChien(ctx, x, y, t, lunge, open, pal, s, q); }
function drawSheep(ctx, x, y, t, s = 1) { drawMouton(ctx, x, y, t, s); }

// Petit sprite en pixels (le cœur du monde de Faouzi) ; les ennemis pixelisés sont dans betes.js
const PIX = { coeur: ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'] };
const PIX_COL = { R: '#e74c3c' };
function drawPix(ctx, rows, px, ox, oy) {
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = PIX_COL[r[x]]; if (c) { ctx.fillStyle = c; ctx.fillRect(ox + x * px, oy + y * px, px, px); } } });
}
// ---------- Personnages ----------
// Les dessins sont dans persos.js (héros, boss, ennemis à forme humaine), betes.js (animaux, robots, monde pixelisé,
// ennemis spéciaux) et minis.js (mini-boss). L'ancien dessin (drawHumanoid, HUMANS) a été retiré en v4.4.
function drawCharacter(ctx, kind, o = {}) {
  const rig = persoRig(kind);
  drawPerso(ctx, kind, o);
  if (kind === 'fateh' && o.companion) { // Aïka, en laisse, qui bondit quand Fateh frappe
    const pose = o.pose || 'idle', pt = o.poseT || 0, sc = o.scale || 1;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.scale((o.dir || 1) * sc, sc); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const lunge = pose === 'attack' ? Math.sin(Math.min(1, pt) * Math.PI) * 40 : 0, dx = 56;
    if (pose !== 'down' && pose !== 'carry') {
      ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(16, -rig.H * 0.5); ctx.quadraticCurveTo(44, -34, dx + lunge + 24, -46); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(16, -rig.H * 0.5); ctx.quadraticCurveTo(44, -34, dx + lunge + 24, -46); ctx.stroke();
    }
    drawDog(ctx, dx, 0, o.t || 0, lunge, pose === 'attack', DOG_PAL.aika, 1.1, { pose: pose === 'walk' || pose === 'attack' ? pose : 'idle', walk: o.walk || 0 }); // (elle ne trotte pas sur place à l'arrêt)
    ctx.restore();
  }
}

// Ennemis courants (et entourages)
function drawMinion(ctx, type, o = {}) {
  if (persoRig(type)) drawPerso(ctx, type, o); // ennemis à forme humaine (persos.js)
  else drawBete(ctx, type, o);                 // animaux, robots, monde pixelisé, ennemis spéciaux (betes.js)
}

// Petite tête pour le HUD et les bulles
function drawHead(ctx, kind, x, y, size) { drawPersoHead(ctx, kind, x, y, size); }

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
