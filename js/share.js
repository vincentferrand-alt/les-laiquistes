// ============================================================
//  LES LAÏQUISTES — Image de score à partager (v3.8)
//  À la fin d'un monde (victoire ou défaite), le jeu dessine une image 1200 × 675 : décor du monde,
//  le héros (et le boss), une phrase en bulle, le score, les étoiles, la médaille de vitesse et l'adresse du jeu.
//  Bouton « 📸 Partager » : sur téléphone, la feuille de partage s'ouvre (WhatsApp…) avec l'image et un message ;
//  sur ordinateur, l'image est téléchargée.
//  L'image est préparée dès l'affichage de l'écran de fin : au clic, elle est déjà prête (iPhone et iPad
//  refusent d'ouvrir le partage si on attend trop entre le clic et l'ouverture).
// ============================================================
const Share = {
  file: null, text: '', ready: null,

  url() {
    const meta = document.querySelector('meta[property="og:url"]');
    return (meta && meta.content) || (location.origin + location.pathname);
  },

  // res : résultat de Game.finish · run : partie en cours (UI.run) · extra : { stars, medal }
  prepare(res, run, extra = {}) {
    this.file = null;
    const info = this.describe(res, run, extra);
    this.text = info.msg + ' 👉 ' + this.url();
    let cv;
    try { cv = this.draw(res, run, info, extra); } catch (e) { console.warn('Image de partage :', e); this.ready = Promise.resolve(null); return; }
    this.ready = new Promise(ok => cv.toBlob(b => {
      this.file = b ? new File([b], 'les-laiquistes-score.png', { type: 'image/png' }) : null;
      ok(this.file);
    }, 'image/png'));
  },

  // textes de l'image et du message
  describe(res, run, extra) {
    const hero = CHARACTERS[run.hero], w = worldById(res.worldId), boss = CHARACTERS[w.boss];
    const win = res.result === 'win', pts = res.score.toLocaleString('fr-FR');
    const stars = extra.stars ? ' ' + '⭐'.repeat(extra.stars) : '';
    let title, msg;
    if (res.mode === 'survival') { title = 'SURVIE — VAGUE ' + res.wave; msg = `J'ai tenu ${res.wave} vagues en Survie dans le monde de ${boss.name} avec ${hero.name} : ${pts} points ! Tu fais mieux ?`; }
    else if (win) { title = boss.name.toUpperCase() + ' EST PLANTÉ !'; msg = `J'ai planté ${boss.name} avec ${hero.name} : ${pts} points${stars}${extra.medal ? ' ' + extra.medal.icon : ''} ! Viens me battre`; }
    else { title = 'ALORS LÀ !!!'; msg = `${boss.name} m'a planté… ${pts} points avec ${hero.name}. Venge-moi`; }
    if (run.mode === 'daily') msg = '📅 Défi du jour — ' + msg;
    // phrase en bulle : celle du héros s'il a gagné, celle du boss sinon
    const who = win ? hero : boss, ph = who.phrases && who.phrases.length ? pick(who.phrases) : '';
    return { title, msg, phrase: ph, win };
  },

  draw(res, run, info, extra) {
    const W = 1200, H = 675, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const w = worldById(res.worldId), s = H / VIEW_H, VW = W / s, win = info.win;
    // --- scène (coordonnées du jeu, hauteur 540) ---
    ctx.save(); ctx.scale(s, s);
    drawWorldBackground(ctx, w.id, VW, 900, 2.5);
    const shadow = (x, r) => { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, GROUND_BOTTOM - 8, r, 12, 0, 0, Math.PI * 2); ctx.fill(); };
    const hx = VW * (run.hero === 'fateh' ? 0.13 : 0.2), bx = VW * 0.42, // (v4.4 : Fateh recule, Aïka ne passe plus devant le boss)
       hk = CHARACTERS[run.hero], bk = CHARACTERS[w.boss];
    const hs = 2.1 * 100 / Math.max(80, hk.bh), bs = (win ? 1.6 : 1.9) * 100 / Math.max(80, bk.bh);
    shadow(bx, 70); shadow(hx, 60);
    ctx.save(); ctx.translate(bx, GROUND_BOTTOM - 8);
    // boss sonné (étoiles au-dessus de la tête) s'il a perdu, qui nargue s'il a gagné
    menuSprite(ctx, w.boss, { dir: -1, scale: bs, t: 1.3, pose: win ? 'hurt' : 'taunt' });
    ctx.restore();
    if (win) { ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#feca57'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const a = i * 2.1, sy = GROUND_BOTTOM - 8 - bk.bh * bs - 46 + Math.sin(a) * 8; ctx.strokeText('★', bx + Math.cos(a) * 34, sy); ctx.fillText('★', bx + Math.cos(a) * 34, sy); } }
    ctx.save(); ctx.translate(hx, GROUND_BOTTOM - 8);
    menuSprite(ctx, run.hero, { dir: 1, scale: hs, t: 0.3, pose: win ? 'taunt' : 'hurt', companion: true });
    ctx.restore();
    if (info.phrase) {
      const by = win ? GROUND_BOTTOM - 8 - hk.bh * hs - 60 : GROUND_BOTTOM - 8 - bk.bh * bs - 40;
      drawBubble(ctx, win ? hx : bx, Math.max(110, by), info.phrase, 1);
    }
    ctx.restore();
    // --- panneau de droite (pixels de l'image) ---
    const g = ctx.createLinearGradient(W * 0.5, 0, W, 0); g.addColorStop(0, 'rgba(15,8,35,0)'); g.addColorStop(0.25, 'rgba(15,8,35,.82)'); g.addColorStop(1, 'rgba(15,8,35,.92)');
    ctx.fillStyle = g; ctx.fillRect(W * 0.5, 0, W * 0.5, H);
    const x = W * 0.79, txt = (t, y, size, col, lw = 8, font = '"Arial Black", Arial') => {
      ctx.font = `900 ${size}px ${font}`; ctx.textAlign = 'center'; ctx.lineWidth = lw; ctx.strokeStyle = '#000';
      ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y);
    };
    txt('LES LAÏQUISTES', 70, 46, '#feca57', 10);
    txt(w.name, 112, 22, '#fff', 6);
    const fit = (t, max) => { let sz = max; ctx.font = `900 ${sz}px "Arial Black", Arial`; while (ctx.measureText(t).width > W * 0.4 && sz > 20) { sz -= 2; ctx.font = `900 ${sz}px "Arial Black", Arial`; } return sz; };
    txt(info.title, 190, fit(info.title, 40), win ? '#7bed9f' : '#ff6b6b', 8);
    txt(res.score.toLocaleString('fr-FR'), 300, 92, '#fff', 12);
    txt('POINTS', 340, 24, '#feca57', 6);
    let y = 410;
    if (extra.stars !== undefined && win && res.mode !== 'survival') { txt('★'.repeat(extra.stars) + '☆'.repeat(3 - extra.stars), y, 54, '#feca57', 8, 'Arial'); y += 60; }
    if (extra.medal) { txt(extra.medal.icon + ' ' + extra.medal.name, y, 24, extra.medal.col, 6); y += 40; }
    const tm = Math.floor(res.time / 60) + ':' + String(Math.floor(res.time % 60)).padStart(2, '0');
    const lv = BALANCE.levels[run.level || 1];
    txt(`${CHARACTERS[run.hero].name} · ${'★'.repeat(run.level || 1)} ${lv ? lv.name : ''} · ⏱ ${tm}`, Math.max(y, 500), 20, '#dfe6e9', 5, '"Trebuchet MS", Arial');
    // adresse du jeu, en bas
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, H - 46, W, 46);
    ctx.font = 'bold 22px "Trebuchet MS", Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText('🎮 Joue toi aussi : ' + this.url().replace(/^https?:\/\//, ''), W / 2, H - 16);
    return cv;
  },

  // bouton « Partager » : feuille de partage du téléphone, sinon téléchargement de l'image
  async share() {
    const f = this.file || await this.ready;
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], text: this.text }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; } // annulé par le joueur
    }
    if (f) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      UI.toast('📸 Image enregistrée : ajoute-la dans ta conversation WhatsApp', 4500);
    } else window.open('https://wa.me/?text=' + encodeURIComponent(this.text), '_blank', 'noopener');
  },
};
