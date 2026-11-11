// ============================================================
//  DÉCORS — 7 mondes, défilement en plusieurs plans (parallaxe)
//  plan lointain (≈0.1) · plan moyen (≈0.4) · premier plan (≈0.7) · sol (1)
// ============================================================

function skyGrad(ctx, VW, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, GROUND_TOP + 2);
}
function sun(ctx, x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.2);
  g.addColorStop(0, col); g.addColorStop(0.4, col + '88'); g.addColorStop(1, col + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function clouds(ctx, VW, camX, t, col = 'rgba(255,255,255,0.55)', n = 5) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const span = VW + 360;
    const cx = (((i * 330 - camX * 0.08 - t * (8 + i * 3)) % span) + span) % span - 180;
    const cy = 40 + (i * 37) % 110;
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.arc(cx + 34, cy - 14, 38, 0, Math.PI * 2); ctx.arc(cx + 70, cy, 28, 0, Math.PI * 2); ctx.fill();
  }
}
function repeatLayer(VW, camX, factor, spacing, fn) {
  const off = camX * factor;
  const first = Math.floor((off - 400) / spacing);
  const last = Math.ceil((off + VW + 400) / spacing);
  for (let i = first; i <= last; i++) fn(i * spacing - off, ((i % 1000) + 1000) % 1000);
}
function groundFloor(ctx, VW, camX, c1, c2, line = 'rgba(0,0,0,0.18)', spacing = 110) {
  const g = ctx.createLinearGradient(0, GROUND_TOP, 0, VIEW_H);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, GROUND_TOP, VW, VIEW_H - GROUND_TOP);
  ctx.strokeStyle = line; ctx.lineWidth = 2;
  repeatLayer(VW, camX, 1, spacing, x => { ctx.beginPath(); ctx.moveTo(x, GROUND_TOP); ctx.lineTo(x + (x - VW / 2) * 0.45, VIEW_H); ctx.stroke(); });
  [0.18, 0.45, 0.78].forEach(f => { const y = GROUND_TOP + (VIEW_H - GROUND_TOP) * f; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); });
  ctx.strokeStyle = INK; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, GROUND_TOP); ctx.lineTo(VW, GROUND_TOP); ctx.stroke();
}
function windowsGrid(ctx, x, y, w, h, col = 'rgba(0,0,0,0.35)', cw = 10, ch = 14, gx = 22, gy = 26) {
  ctx.fillStyle = col;
  for (let yy = y + 10; yy < y + h - ch - 4; yy += gy) for (let xx = x + 8; xx < x + w - cw - 4; xx += gx) ctx.fillRect(xx, yy, cw, ch);
}
function palm(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#6d4c2f'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -60, 0, -120); ctx.stroke();
  ctx.fillStyle = '#27ae60'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(0, -120); ctx.rotate(i * Math.PI / 3 + 0.3); ctx.beginPath(); ctx.ellipse(28, 0, 32, 8, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
function camel(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(-s, s);
  ctx.fillStyle = '#cd6133'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  const a = Math.sin(t * 5);
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(i * 20 - 30, 20); ctx.rotate(a * (i % 2 ? -0.25 : 0.25)); rrect(ctx, -5, 0, 10, 40, 5, '#cd6133'); ctx.restore(); }
  ctx.beginPath(); ctx.moveTo(-40, 20); ctx.bezierCurveTo(-60, -30, -20, -60, 0, 0); ctx.bezierCurveTo(20, -60, 60, -30, 40, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-35, 10); ctx.bezierCurveTo(-70, -20, -70, -40, -50, -60); ctx.bezierCurveTo(-30, -60, -30, -30, -20, 10); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-65, -55, 15, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Boutique de montres de luxe (monde de Guilhem) : enseigne « ROLEX » en lettres dorées,
// vitrine avec des montres dorées. Pas de logo à couronne, juste le nom en capitales.
function watchShop(ctx, x, t, i) {
  const top = GROUND_TOP - 170, w = 240;
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  rrect(ctx, x, top, w, 170, 3, '#173d2f'); // façade vert sombre
  rrect(ctx, x - 6, top - 8, w + 12, 12, 2, '#0e2a20'); // corniche
  // enseigne : lettres dorées avec dégradé et petit reflet
  rrect(ctx, x + 20, top + 10, w - 40, 38, 4, '#0b2219');
  const g = ctx.createLinearGradient(0, top + 14, 0, top + 44);
  g.addColorStop(0, '#fff3b0'); g.addColorStop(0.45, '#f1c40f'); g.addColorStop(1, '#a87b00');
  ctx.font = '900 30px Georgia, "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3; ctx.strokeStyle = '#3a2a00'; ctx.strokeText('ROLEX', x + w / 2, top + 41);
  ctx.fillStyle = g; ctx.fillText('ROLEX', x + w / 2, top + 41);
  const gl = (t * 0.6 + i * 0.37) % 1; // éclat qui passe sur l'enseigne
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x + 30 + gl * (w - 70), top + 16, 6, 26);
  // vitrine
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  rrect(ctx, x + 14, top + 62, 150, 92, 4, '#20372f');
  ctx.fillStyle = 'rgba(180,230,255,.18)'; ctx.fillRect(x + 18, top + 66, 142, 84);
  // présentoirs + montres dorées
  for (let k = 0; k < 3; k++) {
    const mx = x + 40 + k * 48, my = top + 112;
    ctx.fillStyle = '#ecf0f1'; ctx.fillRect(mx - 12, my + 10, 24, 30); // coussin
    ctx.fillStyle = '#b8860b'; ctx.fillRect(mx - 5, my - 14, 10, 34); // bracelet
    const wg = ctx.createRadialGradient(mx - 3, my - 3, 1, mx, my, 11);
    wg.addColorStop(0, '#fffbe0'); wg.addColorStop(0.5, '#f1c40f'); wg.addColorStop(1, '#a87b00');
    circle(ctx, mx, my, 10, wg);
    circle(ctx, mx, my, 5.5, '#fdfdfd', false);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my - 4); ctx.moveTo(mx, my); ctx.lineTo(mx + 3, my + 1); ctx.stroke();
    ctx.lineWidth = 2;
    const sp = (t * 2 + k * 0.7 + i) % 2; // scintillement
    if (sp < 0.35) { ctx.fillStyle = '#fff'; ctx.font = '900 14px Arial'; ctx.fillText('✦', mx + 9, my - 9); }
  }
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(x + 24, top + 150); ctx.lineTo(x + 70, top + 66); ctx.lineTo(x + 86, top + 66); ctx.lineTo(x + 40, top + 150); ctx.fill(); // reflet sur la vitre
  // porte vitrée + poignée dorée
  rrect(ctx, x + 176, top + 62, 50, 108, 3, '#20372f');
  ctx.fillStyle = 'rgba(180,230,255,.2)'; ctx.fillRect(x + 181, top + 67, 40, 98);
  rrect(ctx, x + 210, top + 110, 5, 22, 2, '#f1c40f');
  ctx.textBaseline = 'alphabetic';
}

const BACKGROUNDS = {
  // 1 — Christian : le chantier miniature (tout est petit)
  christian(ctx, VW, camX, t) {
    skyGrad(ctx, VW, ['#5dade2', '#aed6f1', '#eaf2f8']);
    sun(ctx, VW * 0.8, 70, 26, '#fff6c9');
    clouds(ctx, VW, camX, t);
    // goélands au loin
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const x = ((i * 260 + t * 30 - camX * 0.05) % (VW + 100)) - 50, y = 60 + i * 23 + Math.sin(t * 2 + i) * 6; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.quadraticCurveTo(x - 4, y - 6, x, y); ctx.quadraticCurveTo(x + 4, y - 6, x + 9, y); ctx.stroke(); }
    // lointain : grues
    repeatLayer(VW, camX, 0.1, 700, x => {
      ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3;
      ctx.strokeRect(x + 100, GROUND_TOP - 250, 16, 250);
      for (let y = GROUND_TOP - 250; y < GROUND_TOP; y += 16) { ctx.beginPath(); ctx.moveTo(x + 100, y); ctx.lineTo(x + 116, y + 16); ctx.stroke(); }
      ctx.strokeRect(x + 30, GROUND_TOP - 262, 220, 12);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 210, GROUND_TOP - 250); ctx.lineTo(x + 210, GROUND_TOP - 170 + Math.sin(t) * 10); ctx.stroke();
      ctx.fillStyle = '#e67e22'; ctx.fillRect(x + 200, GROUND_TOP - 170 + Math.sin(t) * 10, 20, 12);
      ctx.fillStyle = '#95a5a6'; ctx.fillRect(x + 330, GROUND_TOP - 70, 50, 70); ctx.fillRect(x + 390, GROUND_TOP - 100, 40, 100); ctx.fillRect(x + 440, GROUND_TOP - 55, 60, 55);
    });
    // moyen : petites maisons en travaux avec échafaudages
    repeatLayer(VW, camX, 0.4, 520, (x, i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      // maison en construction (petite !)
      rrect(ctx, x, GROUND_TOP - 80, 110, 80, 3, '#e8d8c3');
      for (let by = GROUND_TOP - 80; by < GROUND_TOP; by += 10) for (let bx = x + ((by / 10) % 2) * 10; bx < x + 110; bx += 20) { ctx.strokeStyle = 'rgba(150,80,40,.5)'; ctx.strokeRect(bx, by, 20, 10); }
      ctx.strokeStyle = INK;
      poly(ctx, [[x - 8, GROUND_TOP - 80], [x + 55, GROUND_TOP - 118], [x + 118, GROUND_TOP - 80]], '#c0392b');
      rrect(ctx, x + 40, GROUND_TOP - 40, 24, 40, 2, '#5d4037');
      // échafaudage
      ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + 130 + k * 25, GROUND_TOP); ctx.lineTo(x + 130 + k * 25, GROUND_TOP - 95); ctx.stroke(); }
      [30, 60, 90].forEach(h => { ctx.beginPath(); ctx.moveTo(x + 125, GROUND_TOP - h); ctx.lineTo(x + 185, GROUND_TOP - h); ctx.stroke(); });
      ctx.fillStyle = '#a0522d'; ctx.fillRect(x + 125, GROUND_TOP - 64, 60, 5);
      // bétonnière miniature
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.save(); ctx.translate(x + 260, GROUND_TOP - 30); ctx.rotate(Math.sin(t * 2) * 0.1);
      ell(ctx, 0, 0, 22, 16, '#e67e22'); ctx.restore();
      circle(ctx, x + 250, GROUND_TOP - 6, 6, '#2d3436'); circle(ctx, x + 272, GROUND_TOP - 6, 6, '#2d3436');
      // tas de briques
      for (let k = 0; k < 6; k++) rrect(ctx, x + 330 + (k % 3) * 18 + (k > 2 ? 9 : 0), GROUND_TOP - 10 - (k > 2 ? 10 : 0), 17, 9, 1, '#c0392b');
      rrect(ctx, x + 400, GROUND_TOP - 60, 70, 60, 3, '#dfe6e9');
      ctx.fillStyle = '#2d3436'; ctx.fillRect(x + 410, GROUND_TOP - 50, 50, 20);
    });
    groundFloor(ctx, VW, camX, '#d4a76a', '#8a6a3c', 'rgba(80,50,20,0.2)', 90);
    // premier plan : cônes et barrières
    repeatLayer(VW, camX, 1, 380, (x, i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      poly(ctx, [[x, GROUND_TOP + 4], [x + 10, GROUND_TOP - 24], [x + 20, GROUND_TOP + 4]], '#e67e22');
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 6, GROUND_TOP - 12, 8, 4);
      if (i % 2 === 0) { rrect(ctx, x + 120, GROUND_TOP - 22, 70, 10, 2, '#fff'); ctx.fillStyle = '#e74c3c'; for (let k = 0; k < 70; k += 14) ctx.fillRect(x + 120 + k, GROUND_TOP - 22, 7, 10); ctx.fillStyle = '#7f8c8d'; ctx.fillRect(x + 124, GROUND_TOP - 12, 4, 14); ctx.fillRect(x + 182, GROUND_TOP - 12, 4, 14); }
    });
  },

  // 2 — Guilhem : Rap City (stades de basket, belles voitures)
  guilhem(ctx, VW, camX, t) {
    skyGrad(ctx, VW, ['#2c2c54', '#706fd3', '#ff793f']);
    sun(ctx, VW * 0.3, 230, 40, '#ffb142');
    repeatLayer(VW, camX, 0.08, 900, (x, i) => { // gratte-ciels
      for (let k = 0; k < 7; k++) {
        const h = 120 + ((k * 53 + i * 17) % 5) * 30, w = 70 + (k % 3) * 20, bx = x + k * 125;
        ctx.fillStyle = '#1e1e3f'; ctx.fillRect(bx, GROUND_TOP - h, w, h);
        windowsGrid(ctx, bx, GROUND_TOP - h, w, h, (k + i) % 2 ? 'rgba(255,218,121,.6)' : 'rgba(255,218,121,.3)', 6, 8, 14, 16);
      }
    });
    repeatLayer(VW, camX, 0.4, 1080, (x, i) => { // (espacement élargi pour loger la boutique de montres)
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      watchShop(ctx, x + 790, t, i);
      // mur graffiti
      rrect(ctx, x, GROUND_TOP - 120, 300, 120, 2, '#57606f');
      ['#ff4757', '#2ed573', '#1e90ff', '#ffa502'].forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + 50 + k * 65, GROUND_TOP - 60, 34, 26, k * 0.4, 0, Math.PI * 2); ctx.fill(); });
      ctx.font = '900 38px "Arial Black", Arial'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.fillStyle = '#fff';
      const tag = ['RAP CITY', 'YO !', 'BLING', 'POPECK'][i % 4];
      ctx.strokeText(tag, x + 150, GROUND_TOP - 48); ctx.fillText(tag, x + 150, GROUND_TOP - 48);
      ctx.lineWidth = 2;
      // terrain de basket : grillage + panneau
      ctx.strokeStyle = 'rgba(200,200,200,.6)';
      for (let k = 0; k < 400; k += 14) { ctx.beginPath(); ctx.moveTo(x + 340 + k, GROUND_TOP - 140); ctx.lineTo(x + 354 + k, GROUND_TOP); ctx.moveTo(x + 354 + k, GROUND_TOP - 140); ctx.lineTo(x + 340 + k, GROUND_TOP); ctx.stroke(); }
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      rrect(ctx, x + 530, GROUND_TOP - 220, 10, 220, 2, '#7f8c8d');
      rrect(ctx, x + 500, GROUND_TOP - 240, 70, 46, 3, '#fff');
      ctx.strokeRect(x + 520, GROUND_TOP - 228, 30, 20);
      ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x + 535, GROUND_TOP - 192, 16, 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; for (let k = -12; k <= 12; k += 6) { ctx.beginPath(); ctx.moveTo(x + 535 + k, GROUND_TOP - 191); ctx.lineTo(x + 535 + k * 0.6, GROUND_TOP - 172); ctx.stroke(); }
      // ballon qui rebondit
      const by = GROUND_TOP - 20 - Math.abs(Math.sin(t * 3 + i)) * 80;
      ctx.strokeStyle = INK; ctx.lineWidth = 2; circle(ctx, x + 650, by, 11, '#e67e22');
      ctx.beginPath(); ctx.moveTo(x + 639, by); ctx.lineTo(x + 661, by); ctx.stroke();
    });
    // belles voitures garées (premier plan lointain)
    repeatLayer(VW, camX, 0.7, 1100, (x, i) => {
      ctx.save(); ctx.translate(x + 200, GROUND_TOP + 4); ctx.scale(0.55, 0.55); drawVehicle(ctx, 'sport', 0, false, false); ctx.restore();
      palm(ctx, x + 500, GROUND_TOP, 1.1);
    });
    groundFloor(ctx, VW, camX, '#3c6382', '#1e3799', 'rgba(255,255,255,0.12)', 140);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4;
    repeatLayer(VW, camX, 1, 900, x => { ctx.beginPath(); ctx.ellipse(x + 450, GROUND_TOP + 95, 110, 40, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 450, GROUND_TOP); ctx.lineTo(x + 450, VIEW_H); ctx.stroke(); });
  },

  // 3 — Fateh : Allauch, village luxueux provençal
  fateh(ctx, VW, camX, t) {
    skyGrad(ctx, VW, ['#4aa3df', '#a9d6f5', '#fdebd0']);
    sun(ctx, VW * 0.72, 80, 30, '#fffbe0');
    clouds(ctx, VW, camX, t, 'rgba(255,255,255,0.5)', 4);
    repeatLayer(VW, camX, 0.08, 1300, x => { // collines du Garlaban + moulin
      ctx.fillStyle = '#b7a57a'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 100, GROUND_TOP); ctx.quadraticCurveTo(x + 250, GROUND_TOP - 210, x + 520, GROUND_TOP - 120); ctx.quadraticCurveTo(x + 800, GROUND_TOP - 60, x + 1300, GROUND_TOP); ctx.fill();
      ctx.fillStyle = '#8a9a5b'; ctx.beginPath(); ctx.moveTo(x - 100, GROUND_TOP); ctx.quadraticCurveTo(x + 400, GROUND_TOP - 110, x + 1300, GROUND_TOP); ctx.fill();
      rrect(ctx, x + 300, GROUND_TOP - 205, 30, 42, 4, '#f5f0e1');
      poly(ctx, [[x + 296, GROUND_TOP - 205], [x + 315, GROUND_TOP - 222], [x + 334, GROUND_TOP - 205]], '#8b4513');
      ctx.save(); ctx.translate(x + 315, GROUND_TOP - 196); ctx.rotate(t);
      for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = '#fff'; ctx.fillRect(2, -4, 34, 8); ctx.strokeRect(2, -4, 34, 8); }
      ctx.restore();
    });
    repeatLayer(VW, camX, 0.4, 700, (x, i) => { // belles maisons provençales
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      const wall = ['#f3d9a4', '#f0c987', '#f6e3c1'][i % 3];
      rrect(ctx, x, GROUND_TOP - 160, 260, 160, 3, wall);
      poly(ctx, [[x - 14, GROUND_TOP - 160], [x + 130, GROUND_TOP - 205], [x + 274, GROUND_TOP - 160]], '#c0582f');
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 270; k += 12) { ctx.beginPath(); ctx.moveTo(x - 10 + k, GROUND_TOP - 162); ctx.lineTo(x - 10 + k, GROUND_TOP - 158); ctx.stroke(); }
      ctx.strokeStyle = INK;
      for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
        const wx = x + 22 + k * 60, wy = GROUND_TOP - 140 + r * 66;
        rrect(ctx, wx, wy, 26, 36, 2, '#fff8e7');
        ctx.fillStyle = '#5dade2'; ctx.fillRect(wx - 12, wy, 11, 36); ctx.fillRect(wx + 27, wy, 11, 36);
        ctx.strokeRect(wx - 12, wy, 11, 36); ctx.strokeRect(wx + 27, wy, 11, 36);
      }
      // bougainvillier
      ctx.fillStyle = '#e84393'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(x + 240 + Math.cos(k) * 14, GROUND_TOP - 150 + k * 8, 9, 0, Math.PI * 2); ctx.fill(); }
      // cyprès + olivier + piscine
      ctx.fillStyle = '#1e5631'; ctx.beginPath(); ctx.ellipse(x + 300, GROUND_TOP - 90, 15, 90, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7a8450'; ctx.beginPath(); ctx.arc(x + 380, GROUND_TOP - 80, 40, 0, Math.PI * 2); ctx.arc(x + 410, GROUND_TOP - 95, 32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6d4c41'; ctx.fillRect(x + 386, GROUND_TOP - 50, 10, 50);
      rrect(ctx, x + 460, GROUND_TOP - 26, 200, 26, 4, '#48dbfb');
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.moveTo(x + 480, GROUND_TOP - 14 + Math.sin(t * 3) * 2); ctx.lineTo(x + 530, GROUND_TOP - 14); ctx.stroke();
    });
    repeatLayer(VW, camX, 0.7, 420, x => { // lavande + muret
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      rrect(ctx, x, GROUND_TOP - 22, 160, 22, 3, '#d7ccc8');
      for (let k = 0; k < 6; k++) { ctx.fillStyle = '#8e44ad'; ctx.beginPath(); ctx.ellipse(x + 200 + k * 26, GROUND_TOP - 16, 11, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9b59b6'; ctx.beginPath(); ctx.ellipse(x + 200 + k * 26, GROUND_TOP - 22, 6, 10, 0, 0, Math.PI * 2); ctx.fill(); }
    });
    groundFloor(ctx, VW, camX, '#e8d5b5', '#b39b72', 'rgba(110,80,40,0.2)', 80);
  },

  // 4 — Faouzi : Pixel World (rétro ; l'image entière est pixelisée par le moteur)
  faouzi(ctx, VW, camX, t) {
    ['#5c94fc', '#6aa0fc', '#7aacfc', '#8ab8fc', '#9cc4fc'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * GROUND_TOP / 5, VW, GROUND_TOP / 5 + 1); });
    repeatLayer(VW, camX, 0.05, 420, (x, i) => { // nuages pixel
      ctx.fillStyle = '#fff'; const y = 50 + (i % 3) * 40;
      ctx.fillRect(x, y, 90, 24); ctx.fillRect(x + 18, y - 16, 54, 16); ctx.fillRect(x + 36, y - 28, 24, 12);
    });
    repeatLayer(VW, camX, 0.12, 640, x => { // montagnes en escalier
      ctx.fillStyle = '#2e8b57';
      for (let k = 0; k < 8; k++) ctx.fillRect(x + k * 24, GROUND_TOP - k * 24 - 24, 400 - k * 48, 24 + k * 24);
    });
    repeatLayer(VW, camX, 0.4, 900, (x, i) => {
      // château pixel
      ctx.fillStyle = '#9e9e9e'; ctx.fillRect(x, GROUND_TOP - 150, 180, 150);
      for (let k = 0; k < 180; k += 30) ctx.fillRect(x + k, GROUND_TOP - 170, 18, 20);
      ctx.fillStyle = '#616161'; for (let yy = 0; yy < 150; yy += 15) for (let k = (yy / 15) % 2 * 15; k < 180; k += 30) ctx.fillRect(x + k, GROUND_TOP - 150 + yy, 14, 2);
      ctx.fillStyle = '#212121'; ctx.fillRect(x + 70, GROUND_TOP - 60, 40, 60); ctx.fillRect(x + 30, GROUND_TOP - 120, 16, 24); ctx.fillRect(x + 134, GROUND_TOP - 120, 16, 24);
      ctx.fillStyle = '#e53935'; ctx.fillRect(x + 88, GROUND_TOP - 210, 4, 40); ctx.fillRect(x + 92, GROUND_TOP - 210, 26, 14);
      // plateformes de briques flottantes
      for (let k = 0; k < 5; k++) { ctx.fillStyle = '#c0632b'; ctx.fillRect(x + 300 + k * 32, GROUND_TOP - 140, 30, 30); ctx.fillStyle = '#7b3f1a'; ctx.fillRect(x + 300 + k * 32, GROUND_TOP - 126, 30, 3); ctx.fillRect(x + 314 + k * 32, GROUND_TOP - 140, 3, 14); }
      ctx.fillStyle = Math.floor(t * 3) % 2 ? '#ffd54f' : '#ffb300'; ctx.fillRect(x + 364, GROUND_TOP - 200, 30, 30);
      ctx.fillStyle = '#5d4037'; ctx.fillRect(x + 374, GROUND_TOP - 192, 10, 14);
      // arbres pixel
      [560, 660].forEach(px => { ctx.fillStyle = '#5d4037'; ctx.fillRect(x + px + 14, GROUND_TOP - 40, 12, 40); ctx.fillStyle = '#43a047'; ctx.fillRect(x + px, GROUND_TOP - 90, 40, 52); ctx.fillRect(x + px + 8, GROUND_TOP - 104, 24, 14); });
    });
    repeatLayer(VW, camX, 0.7, 300, x => { ctx.fillStyle = '#7cb342'; ctx.fillRect(x, GROUND_TOP - 20, 60, 20); ctx.fillRect(x + 12, GROUND_TOP - 32, 36, 12); });
    // sol en damier
    const sz = 38;
    for (let y = GROUND_TOP; y < VIEW_H; y += sz) {
      const off = Math.floor(camX) % (sz * 2);
      for (let x = -off; x < VW + sz; x += sz) {
        const ix = Math.floor((x + camX) / sz), iy = Math.floor((y - GROUND_TOP) / sz);
        ctx.fillStyle = (ix + iy) % 2 ? '#c87137' : '#e0904f'; ctx.fillRect(x, y, sz, sz);
      }
    }
    ctx.fillStyle = '#43a047'; ctx.fillRect(0, GROUND_TOP, VW, 10);
  },

  // 5 — Venum : IA City, monde futuriste où l'IA est maître
  venum(ctx, VW, camX, t) {
    skyGrad(ctx, VW, ['#0b0326', '#2b0f57', '#6a1b9a']);
    ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const x = (i * 97 - camX * 0.02) % VW; ctx.globalAlpha = 0.4 + (Math.sin(t * 2 + i) + 1) * 0.3; ctx.fillRect((x + VW) % VW, (i * 53) % 200, 2, 2); } ctx.globalAlpha = 1;
    repeatLayer(VW, camX, 0.08, 1000, (x, i) => { // tours futuristes
      for (let k = 0; k < 6; k++) {
        const h = 160 + ((k * 61 + i * 13) % 5) * 28, w = 60 + (k % 3) * 22, bx = x + k * 165;
        ctx.fillStyle = '#1a1033'; ctx.beginPath(); ctx.moveTo(bx, GROUND_TOP); ctx.lineTo(bx + 6, GROUND_TOP - h); ctx.lineTo(bx + w - 6, GROUND_TOP - h - 20); ctx.lineTo(bx + w, GROUND_TOP); ctx.fill();
        ctx.strokeStyle = k % 2 ? '#00d2d3' : '#ff3fa4'; ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
      }
    });
    // voitures volantes
    for (let i = 0; i < 4; i++) {
      const x = ((i * 380 + t * (60 + i * 20)) % (VW + 200)) - 100, y = 90 + i * 32;
      ctx.fillStyle = '#dfe6e9'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 26, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#00d2d3'; ctx.fillRect(x - 30, y + 2, 8, 3);
    }
    repeatLayer(VW, camX, 0.4, 760, (x, i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      rrect(ctx, x, GROUND_TOP - 200, 170, 200, 6, '#2d1b4e');
      // panneau holographique
      ctx.fillStyle = 'rgba(0,210,211,.18)'; ctx.fillRect(x + 15, GROUND_TOP - 185, 140, 90);
      ctx.strokeStyle = '#00d2d3'; ctx.strokeRect(x + 15, GROUND_TOP - 185, 140, 90);
      ctx.font = '900 34px "Arial Black", Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#00d2d3'; ctx.shadowColor = '#00d2d3'; ctx.shadowBlur = 14;
      ctx.fillText(['IA', 'A.I.', '> _', 'IA'][i % 4], x + 85, GROUND_TOP - 128 + Math.sin(t * 3) * 3); ctx.shadowBlur = 0;
      ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ff3fa4'; ctx.fillText('L\'IA EST MAÎTRE', x + 85, GROUND_TOP - 105);
      windowsGrid(ctx, x, GROUND_TOP - 90, 170, 90, 'rgba(255,63,164,.5)', 8, 10, 18, 18);
      // dôme
      ctx.strokeStyle = INK; ctx.fillStyle = 'rgba(116,185,255,.25)'; ctx.beginPath(); ctx.arc(x + 380, GROUND_TOP, 120, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#74b9ff'; ctx.stroke();
      ctx.strokeStyle = 'rgba(116,185,255,.4)'; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + 380, GROUND_TOP, 120 * k / 4, 120, 0, Math.PI, 0); ctx.stroke(); }
    });
    repeatLayer(VW, camX, 0.7, 360, x => { // lampadaires néon
      ctx.fillStyle = '#2d3436'; ctx.fillRect(x, GROUND_TOP - 140, 6, 140);
      ctx.fillStyle = '#ff3fa4'; ctx.shadowColor = '#ff3fa4'; ctx.shadowBlur = 16; ctx.fillRect(x - 20, GROUND_TOP - 144, 46, 6); ctx.shadowBlur = 0;
    });
    // sol circuit imprimé
    const g = ctx.createLinearGradient(0, GROUND_TOP, 0, VIEW_H); g.addColorStop(0, '#1b1035'); g.addColorStop(1, '#07030f');
    ctx.fillStyle = g; ctx.fillRect(0, GROUND_TOP, VW, VIEW_H - GROUND_TOP);
    ctx.strokeStyle = 'rgba(0,210,211,0.45)'; ctx.lineWidth = 2;
    repeatLayer(VW, camX, 1, 120, x => { ctx.beginPath(); ctx.moveTo(x, GROUND_TOP); ctx.lineTo(x + (x - VW / 2) * 0.45, VIEW_H); ctx.stroke(); });
    [0.15, 0.4, 0.72].forEach(f => { ctx.beginPath(); ctx.moveTo(0, GROUND_TOP + (VIEW_H - GROUND_TOP) * f); ctx.lineTo(VW, GROUND_TOP + (VIEW_H - GROUND_TOP) * f); ctx.stroke(); });
    const pulse = (t * 300) % (VW + 200) - 100;
    ctx.fillStyle = '#00d2d3'; ctx.shadowColor = '#00d2d3'; ctx.shadowBlur = 12; ctx.fillRect(pulse, GROUND_TOP + (VIEW_H - GROUND_TOP) * 0.4 - 2, 40, 4); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ff3fa4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, GROUND_TOP); ctx.lineTo(VW, GROUND_TOP); ctx.stroke();
  },

  // 6 — Senoussi : le grand désert (palmiers, dunes, chameaux)
  senoussi(ctx, VW, camX, t) {
    skyGrad(ctx, VW, ['#f39c12', '#fad390', '#fff3d6']);
    sun(ctx, VW * 0.7, 80, 36, '#fff3b0');
    repeatLayer(VW, camX, 0.08, 1200, x => {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillStyle = '#e58e26'; ctx.beginPath(); ctx.moveTo(x, GROUND_TOP); ctx.bezierCurveTo(x + 240, GROUND_TOP - 170, x + 480, GROUND_TOP - 60, x + 720, GROUND_TOP); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6b93b'; ctx.beginPath(); ctx.moveTo(x + 480, GROUND_TOP); ctx.bezierCurveTo(x + 800, GROUND_TOP - 220, x + 1050, GROUND_TOP - 110, x + 1250, GROUND_TOP); ctx.fill(); ctx.stroke();
    });
    repeatLayer(VW, camX, 0.25, 1100, x => { // caravane de chameaux
      const d = (t * 25) % 500;
      camel(ctx, x + 700 - d, GROUND_TOP - 40, 0.7, t); camel(ctx, x + 820 - d, GROUND_TOP - 40, 0.62, t + 1);
    });
    repeatLayer(VW, camX, 0.42, 760, (x, i) => { // oasis
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillStyle = '#48dbfb'; ctx.beginPath(); ctx.ellipse(x + 200, GROUND_TOP - 6, 130, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      palm(ctx, x + 90, GROUND_TOP - 4, 1.05); palm(ctx, x + 300, GROUND_TOP - 4, 0.85);
      ctx.fillStyle = '#c8a46e'; rrect(ctx, x + 440, GROUND_TOP - 70, 120, 70, 6, '#d9b77e');
      poly(ctx, [[x + 430, GROUND_TOP - 70], [x + 500, GROUND_TOP - 100], [x + 570, GROUND_TOP - 70]], '#c0392b');
      rrect(ctx, x + 488, GROUND_TOP - 40, 24, 40, 10, '#5d4037');
      camel(ctx, x + 650, GROUND_TOP - 40, 0.9, 0.5 + i);
    });
    repeatLayer(VW, camX, 0.7, 500, x => { // cactus et rochers
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ell(ctx, x + 40, GROUND_TOP - 8, 30, 14, '#b9895a');
      rrect(ctx, x + 220, GROUND_TOP - 60, 16, 60, 8, '#27ae60'); rrect(ctx, x + 204, GROUND_TOP - 44, 12, 26, 6, '#27ae60'); rrect(ctx, x + 236, GROUND_TOP - 50, 12, 22, 6, '#27ae60');
    });
    groundFloor(ctx, VW, camX, '#f6c66b', '#c98a2f', 'rgba(120,70,10,0.18)');
  },

  // 7 — The Purf : la zone polluée (grosse centrale qui fume)
  purf(ctx, VW, camX, t) {
    skyGrad(ctx, VW, ['#4a4a2e', '#7d7a4a', '#a3a07a']);
    sun(ctx, VW * 0.22, 90, 26, '#d4d68a');
    repeatLayer(VW, camX, 0.06, 1200, x => { // centrale nucléaire
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      [[x + 200, 1], [x + 360, 0.85]].forEach(([cx, s]) => {
        ctx.fillStyle = '#9e9e9e'; ctx.beginPath(); ctx.moveTo(cx - 80 * s, GROUND_TOP); ctx.quadraticCurveTo(cx - 40 * s, GROUND_TOP - 120 * s, cx - 55 * s, GROUND_TOP - 220 * s);
        ctx.lineTo(cx + 55 * s, GROUND_TOP - 220 * s); ctx.quadraticCurveTo(cx + 40 * s, GROUND_TOP - 120 * s, cx + 80 * s, GROUND_TOP); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#757575'; ctx.fillRect(cx - 55 * s, GROUND_TOP - 200 * s, 110 * s, 8);
        for (let i = 0; i < 6; i++) { const ph = (t * 0.25 + i / 6) % 1; ctx.fillStyle = `rgba(220,220,200,${0.7 * (1 - ph)})`; ctx.beginPath(); ctx.arc(cx + Math.sin(i * 2 + t) * 20, GROUND_TOP - 220 * s - ph * 180, (30 + ph * 60) * s, 0, Math.PI * 2); ctx.fill(); }
      });
      // cheminées
      [560, 610].forEach((cx, k) => {
        ctx.fillStyle = '#7f5539'; ctx.fillRect(x + cx, GROUND_TOP - 260, 26, 260); ctx.strokeRect(x + cx, GROUND_TOP - 260, 26, 260);
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(x + cx, GROUND_TOP - 240, 26, 8); ctx.fillRect(x + cx, GROUND_TOP - 200, 26, 8);
        for (let i = 0; i < 6; i++) { const ph = (t * 0.35 + i / 6 + k * 0.3) % 1; ctx.fillStyle = `rgba(60,60,40,${0.75 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x + cx + 13 + ph * 90, GROUND_TOP - 262 - ph * 120, 14 + ph * 40, 0, Math.PI * 2); ctx.fill(); }
      });
    });
    repeatLayer(VW, camX, 0.4, 720, (x, i) => { // usines rouillées, tuyaux, arbres morts
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      rrect(ctx, x, GROUND_TOP - 120, 220, 120, 2, '#6d5d4b');
      for (let k = 0; k < 4; k++) poly(ctx, [[x + k * 55, GROUND_TOP - 120], [x + k * 55 + 55, GROUND_TOP - 150], [x + k * 55 + 55, GROUND_TOP - 120]], '#5a4a3a');
      windowsGrid(ctx, x, GROUND_TOP - 110, 220, 100, 'rgba(163,230,53,.35)', 14, 12, 30, 28);
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x + 220, GROUND_TOP - 80); ctx.lineTo(x + 300, GROUND_TOP - 80); ctx.lineTo(x + 300, GROUND_TOP - 10); ctx.stroke();
      ctx.fillStyle = '#a3e635'; ctx.beginPath(); ctx.ellipse(x + 300, GROUND_TOP - 4 + Math.sin(t * 4) * 1, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x + 420, GROUND_TOP); ctx.lineTo(x + 420, GROUND_TOP - 110); ctx.moveTo(x + 420, GROUND_TOP - 70); ctx.lineTo(x + 390, GROUND_TOP - 100); ctx.moveTo(x + 420, GROUND_TOP - 85); ctx.lineTo(x + 452, GROUND_TOP - 120); ctx.stroke();
    });
    repeatLayer(VW, camX, 0.7, 380, (x, i) => { // fûts toxiques
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      rrect(ctx, x, GROUND_TOP - 46, 34, 46, 4, '#f1c40f');
      ctx.fillStyle = INK; ctx.fillRect(x, GROUND_TOP - 34, 34, 4); ctx.fillRect(x, GROUND_TOP - 16, 34, 4);
      circle(ctx, x + 17, GROUND_TOP - 24, 5, INK, false);
      if (i % 2) { ctx.save(); ctx.translate(x + 60, GROUND_TOP - 12); ctx.rotate(1.4); rrect(ctx, -17, -23, 34, 46, 4, '#d4ac0d'); ctx.restore(); }
    });
    groundFloor(ctx, VW, camX, '#6b6b4d', '#3a3a28', 'rgba(0,0,0,0.2)');
    repeatLayer(VW, camX, 1, 460, (x, i) => { // flaques radioactives
      const y = GROUND_TOP + 40 + (i % 3) * 50;
      ctx.fillStyle = `rgba(163,230,53,${0.55 + Math.sin(t * 3 + i) * 0.15})`; ctx.beginPath(); ctx.ellipse(x + 100, y, 60, 12, 0, 0, Math.PI * 2); ctx.fill();
    });
  },
};

function drawWorldBackground(ctx, worldId, VW, camX, t) {
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  (BACKGROUNDS[worldId] || BACKGROUNDS.christian)(ctx, VW, camX, t);
  drawDepth(ctx, worldId, VW, camX);
}

// ---------- Profondeur (v3.5) : brume au loin, sol qui s'assombrit vers l'horizon, grain ----------
// Brume : le fond se fond dans la couleur du ciel près de l'horizon (perspective atmosphérique).
// Sol : plus sombre au fond, plus clair devant, avec un grain léger qui défile avec le sol.
const DEPTH_HAZE = {
  christian: '255,236,200', guilhem: '120,80,190', fateh: '255,225,170', faouzi: null,
  venum: '40,200,255', senoussi: '255,210,140', purf: '150,170,90',
};
const _grain = { cv: null, pat: null, ctx: null };
function drawDepth(ctx, worldId, VW, camX) {
  if (Gfx.quality === 0) return;
  const H0 = GROUND_TOP;
  ctx.save();
  const haze = DEPTH_HAZE[worldId];
  if (haze) {
    const g = ctx.createLinearGradient(0, H0 - 150, 0, H0 + 4);
    g.addColorStop(0, `rgba(${haze},0)`); g.addColorStop(1, `rgba(${haze},0.32)`);
    ctx.fillStyle = g; ctx.fillRect(0, H0 - 150, VW, 154);
  }
  // sol : ombre au fond (sous l'horizon), lumière devant
  const gs = ctx.createLinearGradient(0, H0, 0, VIEW_H);
  gs.addColorStop(0, 'rgba(10,5,25,0.26)'); gs.addColorStop(0.35, 'rgba(10,5,25,0.06)'); gs.addColorStop(1, 'rgba(255,245,220,0.07)');
  ctx.fillStyle = gs; ctx.fillRect(0, H0, VW, VIEW_H - H0);
  // grain (motif 128×128 calculé une fois)
  if (worldId !== 'faouzi') {
    if (!_grain.cv) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 1.5); }
      _grain.cv = c;
    }
    if (_grain.ctx !== ctx) { _grain.pat = ctx.createPattern(_grain.cv, 'repeat'); _grain.ctx = ctx; }
    ctx.translate(-(camX % 128), 0);
    ctx.fillStyle = _grain.pat; ctx.fillRect(0, H0 + 2, VW + 128, VIEW_H - H0);
  }
  ctx.restore();
}

// ============================================================
//  PREMIER PLAN — défile plus vite que le sol (×1,4) et passe DEVANT les personnages.
//  Peu d'objets, espacés, pour ne pas gêner la lecture du combat.
// ============================================================
const FG_SPEED = 1.4;
function fgPole(ctx, x, w, col, top = -20) { ctx.fillStyle = col; ctx.fillRect(x - w / 2, top, w, VIEW_H - top + 10); ctx.strokeRect(x - w / 2, top, w, VIEW_H - top + 10); }
const FOREGROUNDS = {
  christian(ctx, VW, camX, t) {
    repeatLayer(VW, camX, FG_SPEED, 1150, (x, i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      // poteau de chantier rayé
      ctx.save(); ctx.beginPath(); ctx.rect(x - 9, GROUND_TOP - 90, 18, VIEW_H); ctx.clip();
      for (let y = GROUND_TOP - 90; y < VIEW_H; y += 24) { ctx.fillStyle = (y / 24) % 2 ? '#fff' : '#e67e22'; ctx.fillRect(x - 9, y, 18, 24); }
      ctx.restore(); ctx.strokeRect(x - 9, GROUND_TOP - 90, 18, VIEW_H);
      // rubalise qui flotte
      ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 5; ctx.setLineDash([14, 10]);
      ctx.beginPath(); ctx.moveTo(x, GROUND_TOP - 70); ctx.quadraticCurveTo(x + 60, GROUND_TOP - 50 + Math.sin(t * 3 + i) * 8, x + 120, GROUND_TOP - 64); ctx.stroke(); ctx.setLineDash([]);
      // barrière basse
      if (i % 2 === 0) { ctx.strokeStyle = INK; ctx.lineWidth = 3; rrect(ctx, x + 420, VIEW_H - 46, 180, 20, 3, '#fff'); ctx.fillStyle = '#e74c3c'; for (let k = 0; k < 180; k += 30) ctx.fillRect(x + 422 + k, VIEW_H - 44, 15, 16); ctx.fillStyle = '#7f8c8d'; ctx.fillRect(x + 430, VIEW_H - 26, 8, 30); ctx.fillRect(x + 582, VIEW_H - 26, 8, 30); }
    });
  },
  guilhem(ctx, VW, camX, t) {
    repeatLayer(VW, camX, FG_SPEED, 1250, (x, i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      fgPole(ctx, x, 16, '#2f3542', -30); // lampadaire
      rrect(ctx, x - 50, -10, 60, 14, 5, '#2f3542');
      ctx.fillStyle = 'rgba(255,218,121,.35)'; ctx.beginPath(); ctx.moveTo(x - 46, 4); ctx.lineTo(x - 90, 120); ctx.lineTo(x - 10, 120); ctx.lineTo(x - 14, 4); ctx.fill();
      // bouche d'incendie
      ctx.save(); ctx.translate(x + 380, VIEW_H - 4);
      rrect(ctx, -16, -54, 32, 54, 6, '#e74c3c'); rrect(ctx, -22, -40, 44, 10, 4, '#c0392b'); ell(ctx, 0, -56, 16, 7, '#c0392b');
      ctx.restore();
    });
  },
  fateh(ctx, VW, camX, t) {
    repeatLayer(VW, camX, FG_SPEED, 1050, (x, i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      // branche d'olivier qui pend du haut
      ctx.save(); ctx.translate(x, -10); ctx.rotate(Math.sin(t * 1.3 + i) * 0.03);
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(60, 50, 160, 70); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      for (let k = 0; k < 12; k++) { const px = -20 + k * 15, py = 12 + k * 5 + (k % 2) * 10; ell(ctx, px, py, 13, 4.5, k % 2 ? '#7a8450' : '#95a06a', true, 0.6 + (k % 3) * 0.3); }
      ctx.restore();
      // touffe de lavande devant
      for (let k = 0; k < 5; k++) { const px = x + 520 + k * 22; ctx.fillStyle = '#556b2f'; ctx.fillRect(px - 2, VIEW_H - 50, 4, 50); ctx.fillStyle = k % 2 ? '#8e44ad' : '#9b59b6'; ctx.beginPath(); ctx.ellipse(px, VIEW_H - 62 - (k % 2) * 8, 8, 18, 0, 0, Math.PI * 2); ctx.fill(); }
    });
  },
  faouzi(ctx, VW, camX, t) {
    repeatLayer(VW, camX, FG_SPEED, 1000, (x, i) => {
      // buisson pixel
      ctx.fillStyle = '#1b5e20'; ctx.fillRect(x, VIEW_H - 54, 120, 60); ctx.fillRect(x + 18, VIEW_H - 78, 84, 30);
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(x + 8, VIEW_H - 48, 30, 18); ctx.fillRect(x + 60, VIEW_H - 72, 24, 18);
      // clôture pixel
      ctx.fillStyle = '#efebe9';
      for (let k = 0; k < 4; k++) { ctx.fillRect(x + 460 + k * 36, VIEW_H - 70, 18, 80); ctx.fillRect(x + 466 + k * 36, VIEW_H - 82, 6, 12); }
      ctx.fillRect(x + 450, VIEW_H - 52, 150, 10);
    });
  },
  venum(ctx, VW, camX, t) {
    repeatLayer(VW, camX, FG_SPEED, 1200, (x, i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      fgPole(ctx, x, 14, '#1e1e2f', -20);
      ctx.fillStyle = '#00d2d3'; ctx.shadowColor = '#00d2d3'; ctx.shadowBlur = 14; ctx.fillRect(x - 3, -20, 6, VIEW_H); ctx.shadowBlur = 0;
      // barrière holographique
      ctx.fillStyle = `rgba(255,63,164,${0.25 + Math.sin(t * 4 + i) * 0.1})`; ctx.fillRect(x + 400, VIEW_H - 60, 200, 34);
      ctx.strokeStyle = '#ff3fa4'; ctx.lineWidth = 2; ctx.strokeRect(x + 400, VIEW_H - 60, 200, 34);
      ctx.fillStyle = '#ff3fa4'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('ZONE IA', x + 500, VIEW_H - 38);
    });
  },
  senoussi(ctx, VW, camX, t) {
    repeatLayer(VW, camX, FG_SPEED, 1100, (x, i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      // palmes qui entrent par le haut
      ctx.save(); ctx.translate(x, -30);
      for (let k = 0; k < 4; k++) { ctx.save(); ctx.rotate(0.5 + k * 0.42 + Math.sin(t * 1.5 + k) * 0.04); ctx.fillStyle = k % 2 ? '#1e8449' : '#27ae60'; ctx.beginPath(); ctx.ellipse(70, 0, 80, 14, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      // cactus devant
      ctx.save(); ctx.translate(x + 560, VIEW_H + 6);
      rrect(ctx, -12, -90, 24, 96, 12, '#27ae60'); rrect(ctx, -36, -66, 18, 40, 9, '#27ae60'); rrect(ctx, 18, -74, 18, 36, 9, '#27ae60');
      ctx.restore();
    });
  },
  purf(ctx, VW, camX, t) {
    repeatLayer(VW, camX, FG_SPEED, 1150, (x, i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      fgPole(ctx, x, 22, '#6d4c41', -20); // tuyau rouillé
      ctx.fillStyle = '#8d6e63'; for (let y = 20; y < VIEW_H; y += 90) ctx.fillRect(x - 15, y, 30, 10);
      ctx.fillStyle = `rgba(163,230,53,${0.6 + Math.sin(t * 5) * 0.2})`; ctx.beginPath(); ctx.arc(x + 8, 200 + ((t * 60) % 300), 4, 0, Math.PI * 2); ctx.fill(); // goutte toxique
      // grillage barbelé
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
      for (let k = 0; k < 220; k += 16) { ctx.beginPath(); ctx.moveTo(x + 400 + k, VIEW_H - 70); ctx.lineTo(x + 416 + k, VIEW_H); ctx.moveTo(x + 416 + k, VIEW_H - 70); ctx.lineTo(x + 400 + k, VIEW_H); ctx.stroke(); }
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 396, VIEW_H - 72); ctx.lineTo(x + 624, VIEW_H - 72); ctx.stroke();
      for (let k = 0; k < 220; k += 22) { ctx.beginPath(); ctx.moveTo(x + 400 + k - 4, VIEW_H - 76); ctx.lineTo(x + 400 + k + 4, VIEW_H - 68); ctx.moveTo(x + 400 + k + 4, VIEW_H - 76); ctx.lineTo(x + 400 + k - 4, VIEW_H - 68); ctx.stroke(); }
      ctx.fillStyle = '#7f5539'; ctx.fillRect(x + 392, VIEW_H - 80, 8, 90); ctx.fillRect(x + 620, VIEW_H - 80, 8, 90);
    });
  },
};
function drawWorldForeground(ctx, worldId, VW, camX, t) {
  const f = FOREGROUNDS[worldId]; if (!f) return;
  ctx.save(); ctx.lineJoin = 'round'; f(ctx, VW, camX, t); ctx.restore();
}

// ============================================================
//  PARTICULES D'AMBIANCE par monde (coordonnées écran)
// ============================================================
const AMBIENT = {
  christian: { n: 16, make: (VW, y) => ({ k: 'plaster', x: rand(0, VW), y: y ?? -10, vx: rand(-12, 12), vy: rand(14, 32), r: rand(1.5, 3), t: 0, life: 40 }) },
  guilhem:   { n: 7,  make: (VW, y) => ({ k: 'bill', x: rand(0, VW), y: y ?? -20, vx: rand(-20, 20), vy: rand(30, 55), r: rand(0, 6), t: 0, life: 40 }) },
  // v3.8 : pétales de lavande en plus des lucioles
  fateh:     { n: 20, make: (VW, y) => Math.random() < 0.45 ? ({ k: 'petal', x: rand(-40, VW), y: y ?? -10, vx: rand(15, 45), vy: rand(22, 45), r: rand(0, 6), t: 0, life: 40 }) : ({ k: 'firefly', x: rand(0, VW), y: y ?? rand(GROUND_TOP - 120, VIEW_H), vx: rand(-14, 14), vy: rand(-8, 8), r: rand(0, 6), t: 0, life: rand(5, 10) }) },
  faouzi:    { n: 14, make: (VW, y) => ({ k: 'twinkle', x: rand(0, VW), y: rand(10, VIEW_H - 20), vx: 0, vy: 0, r: rand(0, 6), t: 0, life: rand(1.2, 3) }) },
  // v3.8 : pluie de néons en plus des 0 et des 1
  venum:     { n: 40, make: (VW, y) => Math.random() < 0.5 ? ({ k: 'rain', x: rand(0, VW + 120), y: y ?? -30, vx: -110, vy: rand(620, 780), r: rand(22, 38), t: 0, life: 4 }) : ({ k: 'code', x: rand(0, VW), y: y ?? -10, vx: 0, vy: rand(110, 210), r: randi(0, 1), t: 0, life: 20 }) },
  senoussi:  { n: 26, make: (VW, y) => ({ k: 'sand', x: y === null ? VW + 20 : rand(0, VW), y: rand(40, VIEW_H), vx: rand(-320, -170), vy: rand(-10, 10), r: rand(8, 26), t: 0, life: 20 }) },
  purf:      { n: 30, make: (VW, y) => ({ k: 'ash', x: rand(0, VW), y: y ?? -10, vx: rand(-10, 10), vy: rand(18, 45), r: rand(1.5, 3.5), t: 0, life: 40 }) },
};
function drawAmbientParticles(ctx, list) {
  ctx.save();
  list.forEach(p => {
    const a = Math.min(1, p.t * 2, (p.life - p.t) * 2);
    switch (p.k) {
      case 'plaster': ctx.fillStyle = `rgba(255,250,235,${0.55 * a})`; ctx.fillRect(p.x, p.y, p.r, p.r); break;
      case 'bill': // billet de banque qui tombe en tournoyant
        ctx.save(); ctx.translate(p.x + Math.sin(p.t * 2 + p.r) * 20, p.y); ctx.rotate(Math.sin(p.t * 3 + p.r) * 0.8); ctx.scale(1, Math.abs(Math.cos(p.t * 2.5 + p.r)) * 0.8 + 0.2);
        ctx.globalAlpha = 0.8 * a; ctx.fillStyle = '#7bc96f'; ctx.strokeStyle = '#2d6a1f'; ctx.lineWidth = 1.5; ctx.fillRect(-12, -6, 24, 12); ctx.strokeRect(-12, -6, 24, 12);
        ctx.fillStyle = '#2d6a1f'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 3); ctx.restore(); break;
      case 'firefly': { const g = 0.5 + Math.sin(p.t * 5 + p.r) * 0.5; ctx.fillStyle = `rgba(255,240,120,${0.25 * g * a})`; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = `rgba(255,250,180,${0.9 * g * a})`; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); break; }
      case 'twinkle': { const s = Math.sin(p.t / p.life * Math.PI); ctx.fillStyle = ['#fff', '#feca57', '#48dbfb', '#ff6b6b'][Math.floor(p.r) % 4]; ctx.globalAlpha = s; ctx.fillRect(p.x - 3, p.y - 9 * s, 6, 18 * s); ctx.fillRect(p.x - 9 * s, p.y - 3, 18 * s, 6); ctx.globalAlpha = 1; break; }
      case 'petal': // pétale de lavande qui tournoie
        ctx.save(); ctx.translate(p.x + Math.sin(p.t * 1.7 + p.r) * 14, p.y); ctx.rotate(p.t * 2 + p.r);
        ctx.fillStyle = `rgba(165,120,220,${0.75 * a})`; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); break;
      case 'rain': ctx.strokeStyle = `rgba(140,235,255,${0.6 * a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.r * 0.16, p.y - p.r); ctx.stroke(); break;
      case 'code': ctx.fillStyle = `rgba(0,210,211,${0.45 * a})`; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(p.r ? '1' : '0', p.x, p.y); break;
      case 'sand': ctx.strokeStyle = `rgba(240,200,120,${0.45 * a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.r, p.y + 1); ctx.stroke(); break;
      case 'ash': ctx.fillStyle = Math.floor(p.r * 10) % 3 ? `rgba(90,90,80,${0.6 * a})` : `rgba(163,230,53,${0.5 * a})`; ctx.fillRect(p.x + Math.sin(p.t * 2 + p.r) * 6, p.y, p.r, p.r); break;
    }
  });
  ctx.restore();
}

// ============================================================
//  TEINTE ET VIGNETTAGE par monde, selon l'avancée : début, milieu, arène du boss
// ============================================================
const WORLD_TINT = {
  christian: '255,214,140', guilhem: '140,70,220', fateh: '255,196,110', faouzi: '60,90,255',
  venum: '0,190,255', senoussi: '255,140,30', purf: '120,170,30',
};
const _vig = { key: '', cv: null };
function drawWorldOverlay(ctx, worldId, VW, stage, t, boss) {
  // stage : 0 = début, 0.5 = milieu, 1 = arène du boss
  const tint = WORLD_TINT[worldId] || '255,255,255';
  ctx.save();
  ctx.fillStyle = `rgba(${tint},${0.05 + stage * 0.07})`; ctx.fillRect(0, 0, VW, VIEW_H);
  if (boss) { ctx.fillStyle = `rgba(120,0,20,${0.06 + Math.sin(t * 2.2) * 0.03})`; ctx.fillRect(0, 0, VW, VIEW_H); }
  // vignette (dessinée une fois, réutilisée)
  const key = Math.round(VW) + '';
  if (_vig.key !== key) {
    _vig.key = key; _vig.cv = document.createElement('canvas'); _vig.cv.width = Math.round(VW / 2); _vig.cv.height = VIEW_H / 2;
    const c = _vig.cv.getContext('2d'), w = _vig.cv.width, h = _vig.cv.height;
    const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  ctx.globalAlpha = 0.28 + stage * 0.17 + (boss ? 0.12 : 0);
  ctx.drawImage(_vig.cv, 0, 0, VW, VIEW_H);
  ctx.restore();
}

// ============================================================
//  AMBIANCE ANIMÉE PAR MONDE (v3.8) — effets légers dessinés par-dessus la scène (coordonnées écran) :
//   Christian : rayons de soleil · Guilhem : projecteurs qui balaient · Fateh : rayons de soleil chauds
//   Faouzi : lignes d'écran rétro · Venum : lueur des néons (+ pluie, voir AMBIENT) · Senoussi : soleil et mirage
//   The Purf : nappes de smog. Rien n'est dessiné quand l'appareil rame (Gfx.quality 0).
// ============================================================
const _scan = { pat: null };
function sunRays(ctx, VW, t, col, a, ox) {
  for (let i = 0; i < 5; i++) {
    const ang = 0.35 + i * 0.16 + Math.sin(t * 0.25 + i) * 0.03, len = VIEW_H * 1.5, w = 26 + i * 9;
    const al = a * (0.6 + Math.sin(t * 0.8 + i * 1.7) * 0.4);
    const x1 = ox - Math.sin(ang) * len, y1 = Math.cos(ang) * len;
    const g = ctx.createLinearGradient(ox, -40, x1, y1);
    g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(ox - 8, -40); ctx.lineTo(ox + 8, -40); ctx.lineTo(x1 + w, y1); ctx.lineTo(x1 - w, y1); ctx.closePath(); ctx.fill();
  }
}
function drawWorldAtmos(ctx, id, VW, t, boss) {
  if (typeof Gfx !== 'undefined' && Gfx.quality === 0) return;
  ctx.save();
  switch (id) {
    case 'christian': sunRays(ctx, VW, t, '255,240,190', 0.12, VW * 0.85); break;
    case 'fateh': sunRays(ctx, VW, t, '255,214,140', 0.11, VW * 0.12); break;
    case 'guilhem': { // deux projecteurs qui balaient la scène
      ctx.globalCompositeOperation = 'lighter';
      [[VW * 0.2, '255,80,200'], [VW * 0.8, '80,220,255']].forEach(([x, col], i) => {
        const ang = Math.sin(t * 0.7 + i * 2.2) * 0.45, len = VIEW_H * 1.2, w = 120;
        const x1 = x + Math.sin(ang) * len, y1 = Math.cos(ang) * len;
        const g = ctx.createLinearGradient(x, -10, x1, y1);
        g.addColorStop(0, `rgba(${col},${boss ? 0.2 : 0.14})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 6, -10); ctx.lineTo(x + 6, -10); ctx.lineTo(x1 + w, y1); ctx.lineTo(x1 - w, y1); ctx.closePath(); ctx.fill();
      });
      break;
    }
    case 'faouzi': { // lignes d'écran cathodique + léger scintillement
      if (!_scan.pat) {
        const c = document.createElement('canvas'); c.width = 4; c.height = 4;
        const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, 0, 4, 1);
        _scan.pat = ctx.createPattern(c, 'repeat');
      }
      ctx.fillStyle = _scan.pat; ctx.fillRect(0, 0, VW, VIEW_H);
      ctx.fillStyle = `rgba(255,255,255,${0.015 + Math.max(0, Math.sin(t * 13)) * 0.02})`; ctx.fillRect(0, 0, VW, VIEW_H);
      const by = (t * 90) % (VIEW_H + 80) - 40; // bande lumineuse qui descend
      const g = ctx.createLinearGradient(0, by - 30, 0, by + 30); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, by - 30, VW, 60);
      break;
    }
    case 'venum': { // lueur des néons qui grésille, en haut et en bas
      const fl = Math.sin(t * 3) * 0.5 + 0.5, cut = Math.sin(t * 23) > 0.93 ? 0.3 : 1; // petite coupure de temps en temps
      ctx.globalCompositeOperation = 'lighter';
      let g = ctx.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, `rgba(255,0,170,${(0.18 + fl * 0.08) * cut})`); g.addColorStop(1, 'rgba(255,0,170,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 120);
      g = ctx.createLinearGradient(0, VIEW_H - 90, 0, VIEW_H); g.addColorStop(0, 'rgba(0,210,255,0)'); g.addColorStop(1, `rgba(0,210,255,${(0.14 + (1 - fl) * 0.08) * cut})`);
      ctx.fillStyle = g; ctx.fillRect(0, VIEW_H - 90, VW, 90);
      break;
    }
    case 'senoussi': { // soleil écrasant + mirage au-dessus de l'horizon
      const g = ctx.createRadialGradient(VW * 0.82, 40, 10, VW * 0.82, 40, 260);
      g.addColorStop(0, 'rgba(255,255,230,0.35)'); g.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 320);
      ctx.strokeStyle = 'rgba(255,250,235,0.18)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const y = GROUND_TOP - 70 + i * 9; ctx.beginPath();
        for (let x = 0; x <= VW; x += 24) { const yy = y + Math.sin(x * 0.03 + t * 3 + i) * 2.5; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
        ctx.stroke();
      }
      break;
    }
    case 'purf': { // nappes de smog qui dérivent
      for (let i = 0; i < 3; i++) {
        const y = [VIEW_H * 0.12, GROUND_TOP - 30, VIEW_H - 40][i], x = ((t * (12 + i * 7) + i * 300) % (VW + 600)) - 300;
        const g = ctx.createRadialGradient(x, y, 10, x, y, 320);
        g.addColorStop(0, `rgba(140,160,70,${0.28 + (boss ? 0.08 : 0)})`); g.addColorStop(1, 'rgba(140,160,70,0)');
        ctx.fillStyle = g; ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.35); ctx.translate(-x, -y); ctx.fillRect(x - 320, y - 320, 640, 640); ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
}
