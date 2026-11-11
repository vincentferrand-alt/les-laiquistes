// ============================================================
//  UI — écrans, choix du perso, mode histoire, choix du niveau
// ============================================================
const $ = s => document.querySelector(s);
// Perso dans les menus : même rendu cartoon qu'en jeu (contour épais + éclairage)
function menuSprite(ctx, kind, o) {
  const c = CHARACTERS[kind], sc = o.scale || 1, h = c.bh * sc, r = (c.range + c.bw * 0.6 + 40) * sc;
  drawSprite(ctx, { x: -r, y: -h - 120 * sc, w: r * 2, h: h + 140 * sc }, x => drawCharacter(x, kind, o), { outline: 3.2 * Math.sqrt(sc), shade: { top: -h } });
}
const UI = {
  current: null, live: new Map(), selHero: null,
  run: { mode: 'story', hero: null, order: [], idx: 0, score: 0, heroHp: null, worldScoreStart: 0 },
  lastRes: null,

  init() {
    document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { Sfx.init(); Sfx.click(); this.show(b.dataset.go); }));
    $('#b-story').onclick = () => { Sfx.init(); Sfx.click(); this.run.mode = 'story'; this.openChars(); };
    $('#b-levels').onclick = () => { Sfx.init(); Sfx.click(); this.run.mode = 'select'; this.openChars(); };
    $('#b-rush').onclick = () => { Sfx.init(); Sfx.click(); this.run.mode = 'bossrush'; this.openChars(); };
    $('#b-surv').onclick = () => { Sfx.init(); Sfx.click(); this.run.mode = 'survival'; this.openChars(); };
    $('#b-daily').onclick = () => { Sfx.init(); Sfx.click(); this.openDaily(); };
    $('#b-daily-go').onclick = () => { Sfx.click(); this.startDaily(); };
    $('#b-trophies').onclick = () => { Sfx.init(); Sfx.click(); this.openTrophies(); };
    $('#b-scores').onclick = () => { Sfx.init(); Sfx.click(); this.openScores('histoire'); };
    $('#b-mute').onclick = () => this.toggleMute();
    $('#b-fs').onclick = () => this.fullscreen();
    $('#b-share').onclick = () => this.shareWhatsApp();
    $('#b-char-go').onclick = () => { Sfx.click(); this.confirmHero(); };
    $('#b-intro-go').onclick = () => { Sfx.click(); this.launch(); };
    // Retour depuis l'intro : choix du niveau → choix du monde ; histoire → choix du personnage
    $('#b-intro-back').onclick = () => { Sfx.click(); if (this.run.mode === 'select' || this.run.mode === 'survival') this.openWorlds(); else this.openChars(); };
    $('#b-resume').onclick = () => this.resume();
    $('#b-restart').onclick = () => { this.hideScreens(); Game.stop(); this.run.cp = null; this.launch(true); }; // recommence tout le monde
    $('#b-quit').onclick = () => { Game.stop(); this.toTitle(); };
    $('#b-over-retry').onclick = () => { Sfx.click(); this.launch(true, true); }; // reprend au début du tiers (v3.9)
    $('#b-over-restart').onclick = () => { Sfx.click(); this.run.cp = null; this.launch(true); };
    $('#b-over-menu').onclick = () => { Sfx.click(); this.toTitle(); };
    $('#b-over-share').onclick = () => { Sfx.click(); Share.share(); }; // image de score (share.js)
    $('#score-board').onchange = e => this.openScores(e.target.value);
    $('#btn-pause').addEventListener('click', () => this.pause());

    const sel = $('#score-board');
    // un classement par mode : histoire, chaque monde (choix du niveau), Boss Rush, Survie par monde
    sel.innerHTML = '<option value="histoire">Mode histoire</option><option value="bossrush">Boss Rush</option>'
      + '<optgroup label="Choix du niveau">' + WORLDS.map(w => `<option value="${w.id}">${w.name}</option>`).join('') + '</optgroup>'
      + '<optgroup label="Survie">' + WORLDS.map(w => `<option value="survie-${w.id}">Survie — ${CHARACTERS[w.boss].name}</option>`).join('') + '</optgroup>';
    $('#pause-controls').innerHTML = CONTROLS_HTML;

    Game.onEnd = res => this.onLevelEnd(res);
    this.updateMuteBtn();

    // installation PWA
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); this.installEvt = e; $('#b-install').classList.remove('hidden');
    });
    $('#b-install').onclick = async () => { if (this.installEvt) { this.installEvt.prompt(); await this.installEvt.userChoice; this.installEvt = null; $('#b-install').classList.add('hidden'); } };
    document.addEventListener('visibilitychange', () => { if (document.hidden && Game.running && !Game.paused) this.pause(); });

    this.initSettings();
    $('#version').textContent = 'v' + (window.GAME_VERSION || '?');
    $('#b-check-update').onclick = () => {
      Sfx.init(); Sfx.click();
      const msg = $('#upd-msg'); msg.textContent = 'Recherche…';
      checkForUpdate().then(r => {
        msg.textContent = { latest: '✓ Tu as la dernière version', updating: 'Nouvelle version : chargement…', offline: 'Pas de connexion', reload: 'Rechargement…' }[r] || '';
        if (r === 'latest' || r === 'offline') setTimeout(() => { msg.textContent = ''; }, 3000);
      });
    };
    $('#version-settings').textContent = 'Les laïquistes v' + (window.GAME_VERSION || '?');
    $('#b-link-google').onclick = () => { Sfx.click(); Cloud.linkGoogle(); };
    this.refreshAccount();
    this.buildTitleArt();
    this.show('s-title');
    const loop = () => { this.animate(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },

  // ---------- navigation ----------
  show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    this.current = id;
    $('#screens').classList.toggle('hidden', !id);
    // musique de menu (titre, persos, mondes, intro, classement, réglages hors partie)
    if (MENU_SCREENS.includes(id) && !(Game.running && Game.paused)) Sfx.music('menu');
  },
  hideScreens() { this.show(null); },
  toTitle() { Game.stop(); this.setControls(false); this.buildTitleArt(); this.show('s-title'); },

  setControls(on) {
    $('#controls').classList.toggle('hidden', !on);
    $('#controls').classList.toggle('touch', on && Input.isTouch);
    Game.updateSafeArea(); // place prise par les boutons tactiles
  },

  toggleMute() {
    Save.data.muted = !Save.data.muted; Save.save();
    Sfx.setMuted(Save.data.muted); this.updateMuteBtn();
  },
  // Partage par WhatsApp (appli sur téléphone, WhatsApp Web sur ordinateur). L'aperçu avec l'image est
  // fabriqué par WhatsApp à partir des balises Open Graph de index.html.
  shareWhatsApp() {
    const meta = document.querySelector('meta[property="og:url"]');
    const url = (meta && meta.content) || (location.origin + location.pathname);
    const text = '🎮 Viens jouer à Les laïquistes : 7 héros, 7 mondes, 7 boss ! ' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  },
  updateMuteBtn() { $('#b-mute').textContent = Save.data.muted ? '🔇 Son coupé' : '🔊 Son activé'; },
  fullscreen() {
    const el = document.documentElement;
    const p = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen && el.webkitRequestFullscreen());
    Promise.resolve(p).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
  },

  // ---------- canvas animés des menus ----------
  liveCanvas(canvas, fn) { this.live.set(canvas, fn); },
  animate() {
    const t = performance.now() / 1000;
    for (const [cv, fn] of this.live) {
      if (!cv.isConnected) { this.live.delete(cv); continue; }
      const scr = cv.closest('.screen');
      if (scr && !scr.classList.contains('active')) continue;
      const ctx = cv.getContext('2d');
      ctx.lineJoin = 'round'; ctx.miterLimit = 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      fn(ctx, t, cv.width, cv.height);
    }
  },

  buildTitleArt() {
    const cv = $('#title-art');
    this.liveCanvas(cv, (ctx, t, W, H) => {
      const kinds = ROSTER.filter(k => Save.isUnlocked(k));
      const n = kinds.length;
      kinds.forEach((k, i) => {
        ctx.save();
        const x = W * (i + 0.5) / n, y = H - 14 - Math.abs(Math.sin(t * 3 + i)) * 10;
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, H - 12, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(x, y);
        menuSprite(ctx, k, { dir: i < n / 2 ? 1 : -1, scale: 0.85, t: t + i, walk: t * 8 + i, pose: 'walk' });
        ctx.restore();
      });
    });
  },

  // ---------- choix du personnage ----------
  openChars() {
    const grid = $('#char-grid');
    grid.innerHTML = '';
    if (!this.selHero || !Save.isUnlocked(this.selHero)) this.selHero = 'christian';
    ROSTER.forEach(k => {
      const c = CHARACTERS[k], unlocked = Save.isUnlocked(k);
      const card = document.createElement('button');
      card.className = 'char-card' + (unlocked ? '' : ' locked') + (k === this.selHero ? ' sel' : '');
      card.style.setProperty('--c', c.light);
      card.innerHTML = `${unlocked ? `<div class="cc-lv">Niv. ${Progress.level(k).lv}</div>` : ''}<canvas width="140" height="150"></canvas><div class="cc-name">${unlocked ? c.name : '???'}</div>${unlocked ? `<div class="cc-title">${c.title}</div>` : `<div class="cc-title">🔒 ${c.unlockText}</div>`}`;
      const cv = card.querySelector('canvas');
      this.liveCanvas(cv, (ctx, t, W, H) => {
        const sel = this.selHero === k;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(W / 2, H - 14, 34, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(W / 2 - (k === 'fateh' ? 18 : k === 'senoussi' ? -14 : 0), H - 14);
        const sc = k === 'guilhem' || k === 'fateh' ? 0.95 : 1.05;
        const o = { dir: 1, scale: sc, companion: true, t, walk: t * 9, pose: sel && unlocked ? (Math.floor(t * 1.2) % 3 === 2 ? 'attack' : 'walk') : 'idle', poseT: (t * 1.2) % 1 };
        // perso verrouillé : silhouette noire (sans ctx.filter, pour iPhone)
        if (!unlocked) { ctx.globalAlpha = 0.6; drawTinted(ctx, '#000', 1, { x: -110, y: -150, w: 220, h: 160 }, c => drawCharacter(c, k, o)); ctx.globalAlpha = 1; }
        else menuSprite(ctx, k, o);
        ctx.restore();
      });
      card.onclick = () => {
        if (!unlocked) { Sfx.init(); Sfx.burp(); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; }
        Sfx.init(); Sfx.click(); this.selHero = k;
        grid.querySelectorAll('.char-card').forEach(el => el.classList.remove('sel')); card.classList.add('sel');
        this.showHeroDetail();
      };
      card.ondblclick = () => { if (unlocked) this.confirmHero(); };
      grid.appendChild(card);
    });
    this.showHeroDetail();
    this.renderDiff();
    $('#chars-sub').textContent = {
      story: 'Mode histoire : les 6 autres mondes, dans un ordre aléatoire',
      select: 'Choix du niveau',
      bossrush: 'Boss Rush : les 6 autres boss à la suite, la vie se reporte',
      survival: 'Survie : des vagues sans fin dans le monde de ton choix',
    }[this.run.mode];
    this.show('s-chars');
  },

  // Niveaux de difficulté (écran du choix du perso) : 1 débloqué d'office, 2 et 3 en finissant l'histoire
  renderDiff() {
    const box = $('#diff-pick'); if (!box) return;
    const d = Save.data;
    box.innerHTML = '<div class="dp-title">Difficulté</div>';
    [1, 2, 3].forEach(n => {
      const L = BALANCE.levels[n], locked = n > d.diffMax;
      const b = document.createElement('button');
      b.className = 'btn small dp' + (n === d.diff ? ' primary' : '') + (locked ? ' locked' : '');
      b.innerHTML = `${locked ? '🔒' : '★'.repeat(n)} <b>${L.name}</b><small>score ×${String(L.score).replace('.', ',')}</small>`;
      b.onclick = () => {
        Sfx.init();
        if (locked) { Sfx.burp(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); $('#diff-hint').textContent = `Termine le mode histoire en « ${BALANCE.levels[n - 1].name} » pour débloquer ce niveau.`; return; }
        Sfx.click(); d.diff = n; Save.save(); this.renderDiff();
      };
      box.appendChild(b);
    });
    const hint = document.createElement('div'); hint.id = 'diff-hint'; hint.className = 'dp-hint';
    hint.textContent = d.diffMax < 3 ? `Termine le mode histoire en « ${BALANCE.levels[d.diffMax].name} » pour débloquer le niveau suivant.` : 'Tous les niveaux sont débloqués.';
    box.appendChild(hint);
  },
  showHeroDetail() {
    const c = CHARACTERS[this.selHero];
    const bar = (label, v, max) => `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.round(v / max * 100)}%"></i></div></div>`;
    $('#char-detail').innerHTML = `
      <div class="cd-name" style="color:${c.light}">${c.name}</div>
      <div class="cd-title">${c.title}</div>
      ${(() => { const L = Progress.level(this.selHero), b = Progress.bonus(this.selHero); return `<div class="cd-lv">Niveau <b>${L.lv}</b>${L.need ? ` <span class="xpbar"><i style="width:${Math.round(L.cur / L.need * 100)}%"></i></span> ${L.cur}/${L.need} XP` : ' (max)'}${L.lv > 1 ? ` · vie +${Math.round((b.hp - 1) * 100)} %, force +${Math.round((b.dmg - 1) * 100)} %` : ''}</div>`; })()}
      <div class="cd-weapon"><b>⚔ ${c.weapon}</b> — ${c.weaponDesc}</div>
      ${bar('Vie', c.hp, 150)}${bar('Vitesse', c.speed, 300)}${bar('Force', c.dmg, 14)}${bar('Allonge', c.range, 100)}
      <div class="cd-special"><b>★ ${c.specialName}</b><br>${c.specialDesc}</div>`;
  },

  confirmHero() {
    if (!Save.isUnlocked(this.selHero)) return;
    this.run.hero = this.selHero;
    this.run.level = Save.data.diff || 1; // le niveau est fixé pour toute la partie
    if (this.run.mode === 'story' || this.run.mode === 'bossrush') {
      this.run.order = shuffle(WORLDS.filter(w => w.id !== this.run.hero).map(w => w.id)); this.run.idx = 0; this.run.score = 0; this.run.heroHp = null;
      this.openIntro();
    } else this.openWorlds();
  },

  // ---------- choix du monde ----------
  openWorlds() {
    const grid = $('#world-grid'); grid.innerHTML = '';
    WORLDS.forEach((w, i) => {
      const best = Save.data.cleared[w.id];
      const mine = w.id === this.run.hero;
      // les mondes de Senoussi et de The Purf restent verrouillés tant que le perso n'est pas débloqué
      // (en mode histoire, ils sont joués normalement)
      const locked = !Save.isUnlocked(w.boss);
      const card = document.createElement('button');
      card.className = 'world-card' + (mine ? ' mine' : '') + (locked ? ' locked' : '');
      const surv = this.run.mode === 'survival', sb = Save.data.survival[w.id];
      const status = locked ? '🔒 ' + CHARACTERS[w.boss].unlockText : mine ? "C'est ton monde !"
        : surv ? (sb ? `🏆 Vague ${sb.wave} — ${sb.score} pts` : 'Pas encore tenté')
        : best ? '✓ Record : ' + best + this.medalLabel(w.id) : 'Jamais terminé';
      const st = Progress.stars(w.id);
      card.innerHTML = `${!locked && !surv ? `<div class="wc-stars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</div>` : ''}<canvas width="300" height="150"></canvas><div class="wc-name">${locked ? '🔒 ' : ''}${CHARACTERS[w.boss].name.toUpperCase()}</div><div class="wc-boss">${w.sub}</div><div class="wc-best">${status}</div>`;
      const cv = card.querySelector('canvas');
      this.liveCanvas(cv, (ctx, t, W, H) => {
        const s = H / VIEW_H; ctx.save(); ctx.scale(s, s);
        drawWorldBackground(ctx, w.id, W / s, 200 + t * 30, t);
        ctx.translate(W / s * 0.62, GROUND_BOTTOM - 40);
        menuSprite(ctx, w.boss, { dir: -1, scale: 1.6, t: t + i });
        if (mine || locked) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = locked ? 'rgba(0,0,0,.7)' : 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); }
        if (locked) { ctx.font = '64px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔒', W / 2, H / 2); ctx.textBaseline = 'alphabetic'; }
        ctx.restore();
      });
      card.onclick = () => {
        if (locked) { Sfx.burp(); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; }
        if (mine) { Sfx.burp(); return; } Sfx.click(); this.run.order = [w.id]; this.run.idx = 0; this.run.score = 0; this.run.heroHp = null; this.openIntro(); };
      grid.appendChild(card);
    });
    $('#s-worlds h2').textContent = this.run.mode === 'survival' ? 'SURVIE : CHOISIS TON MONDE' : 'CHOISIS TON MONDE';
    this.show('s-worlds');
  },

  // médaille de vitesse et meilleur temps d'un monde (« · 🥇 2:41 »)
  medalLabel(id) {
    const m = (Save.data.medals || {})[id], t = (Save.data.bestTimes || {})[id];
    if (!t) return '';
    return ' · ' + (m ? EXTRA.medals.find(x => x.id === m).icon + ' ' : '⏱ ') + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  },

  // ---------- intro de monde ----------
  openIntro() {
    const wid = this.run.order[this.run.idx], w = worldById(wid), boss = CHARACTERS[w.boss];
    const n = `${this.run.idx + 1} / ${this.run.order.length}`;
    $('#intro-step').textContent = { story: 'MONDE ' + n, select: 'CHOIX DU NIVEAU', bossrush: 'BOSS RUSH — BOSS ' + n, survival: 'SURVIE — VAGUES SANS FIN', daily: 'DÉFI DU JOUR — ' + (this.run.daily ? this.run.daily.mod.name : '') }[this.run.mode]
      + '  ·  ' + '★'.repeat(this.run.level || 1) + ' ' + BALANCE.levels[this.run.level || 1].name;
    $('#intro-name').textContent = w.name;
    $('#intro-sub').textContent = w.sub;
    $('#intro-boss').innerHTML = `Boss : <b style="color:${boss.light}">${boss.name}</b> — ${boss.title}`;
    const cv = $('#intro-art');
    // duel verbal (v3.9) : le héros lance une phrase, le boss lui répond (bulles + voix)
    const hc = CHARACTERS[this.run.hero], duel = { t0: performance.now() / 1000, a: pick(hc.phrases), b: pick(boss.phrases) };
    const dur = (txt, kind) => { const buf = VoiceFiles.get(txt, kind); return buf ? buf.duration : 0.6 + txt.length * 0.07; };
    duel.ta = 0.7; duel.tb = duel.ta + dur(duel.a, this.run.hero) + 0.5; duel.end = duel.tb + dur(duel.b, w.boss) + 1.2;
    clearTimeout(this.duelT1); clearTimeout(this.duelT2);
    this.duelT1 = setTimeout(() => { if (this.current === 's-intro') Voice.speak(duel.a, this.run.hero, 2); }, duel.ta * 1000);
    this.duelT2 = setTimeout(() => { if (this.current === 's-intro') Voice.speak(duel.b, w.boss, 2); }, duel.tb * 1000);
    this.liveCanvas(cv, (ctx, t, W, H) => {
      const s = H / VIEW_H; ctx.save(); ctx.scale(s, s);
      const VW = W / s, el = performance.now() / 1000 - duel.t0;
      drawWorldBackground(ctx, wid, VW, t * 40, t);
      ctx.save(); ctx.translate(VW * 0.3, GROUND_BOTTOM - 30); menuSprite(ctx, this.run.hero, { dir: 1, scale: 1.5, t, walk: t * 9, pose: 'idle', companion: true }); ctx.restore();
      ctx.save(); ctx.translate(VW * 0.72, GROUND_BOTTOM - 20); menuSprite(ctx, w.boss, { dir: -1, scale: 2.1, t: t + 1, pose: Math.floor(t) % 3 === 0 ? 'windup' : 'idle' }); ctx.restore();
      ctx.font = '900 70px "Arial Black", Arial'; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.fillStyle = '#feca57';
      ctx.strokeText('VS', VW * 0.5, GROUND_TOP + 40); ctx.fillText('VS', VW * 0.5, GROUND_TOP + 40);
      const fade = (a, b) => clamp(Math.min((el - a) * 5, (b - el) * 3), 0, 1);
      const big = 1.7; ctx.save(); ctx.scale(big, big); // bulles en grand (l'image de l'intro est petite)
      if (el > duel.ta && el < duel.end) drawBubble(ctx, VW * 0.3 / big, (GROUND_BOTTOM - 40 - hc.bh * 1.5) / big, duel.a, fade(duel.ta, duel.end), VW / big);
      if (el > duel.tb && el < duel.end + 0.8) drawBubble(ctx, VW * 0.72 / big, Math.max(150, GROUND_BOTTOM - 30 - boss.bh * 2.1) / big, duel.b, fade(duel.tb, duel.end + 0.8), VW / big);
      ctx.restore();
      ctx.restore();
    });
    this.show('s-intro');
  },

  // retry : rejouer le même monde · fromCp : reprendre au début du tiers où l'on est tombé (v3.9)
  launch(retry = false, fromCp = false) {
    Sfx.init(); Voice.stop();
    const wid = this.run.order[this.run.idx];
    const cp = retry && fromCp && this.run.cp && this.run.cp.world === wid ? this.run.cp : null;
    if (!fromCp) this.run.cp = null;
    if (retry) { this.run.score = this.run.worldScoreStart; }
    this.run.worldScoreStart = this.run.score;
    const diff = { story: BALANCE.story.base + this.run.idx * BALANCE.story.perWorld, bossrush: 1 + this.run.idx * 0.08, survival: 1 }[this.run.mode] || 1.15;
    this.hideScreens(); this.setControls(true);
    Game.start({ worldId: wid, heroKind: this.run.hero, mode: this.run.mode, difficulty: diff, level: this.run.level, mod: this.run.mode === 'daily' && this.run.daily ? this.run.daily.mod : null, score: this.run.score, heroHp: retry ? null : this.run.heroHp, checkpoint: cp });
  },

  pause() {
    if (!Game.running || Game.ended) return;
    Game.paused = true; Sfx.setPaused(true); // la musique continue, étouffée
    $('#pause-goals').innerHTML = Game.goalsHtml(); // objectifs de la partie (tiers.js)
    this.show('s-pause');
  },
  resume() {
    this.hideScreens(); Game.paused = false; Input.clear();
    Sfx.setPaused(false); // reprise propre, sans redémarrer le morceau
  },

  // ---------- réglages : Musique / Effets / Voix (+ voix des boss, vibrations) ----------
  openSettings(from) {
    this.settingsFrom = from || this.current || 's-title';
    this.refreshSettings();
    this.show('s-settings');
  },
  closeSettings() { Sfx.click(); this.show(this.settingsFrom || 's-title'); },
  // état de la sauvegarde en ligne (écran Réglages)
  refreshAccount() {
    const st = $('#acct-status'); if (!st) return;
    st.textContent = Cloud.label();
    $('#b-link-google').classList.toggle('hidden', Cloud.status !== 'anon');
  },
  toast(msg, ms = 3500) {
    const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.add('hidden'), ms);
  },
  refreshSettings() {
    this.refreshAccount();
    const s = Settings.get();
    document.querySelectorAll('[data-set]').forEach(el => {
      const k = el.dataset.set;
      if (el.type === 'checkbox') el.checked = !!s[k];
      else { el.value = Math.round(s[k] * 100); const o = el.parentElement.querySelector('output'); if (o) o.textContent = el.value + ' %'; }
    });
    document.querySelectorAll('#ctl-size [data-size]').forEach(b => b.classList.toggle('primary', +b.dataset.size === (s.ctlSize || 1)));
    const note = $('#voice-note');
    if (note) note.textContent = VoiceFiles.count ? 'Voix : fichiers audio générés (' + VoiceFiles.count + ' phrases).'
      : !Voice.supported() ? 'Synthèse vocale non disponible sur ce navigateur : les boss resteront muets.'
      : !Voice.available() ? 'Aucune voix française trouvée sur cet appareil : les boss resteront muets.' : 'Voix : ' + Voice.voice.name;
  },
  // Taille des commandes tactiles : proportionnelle à l'écran (×1 sur téléphone, jusqu'à ×1,6 sur iPad),
  // multipliée par le réglage Normales / Grandes / Très grandes
  applyControlSize() {
    const auto = clamp(Math.min(innerWidth, innerHeight) / 420, 1, 1.6);
    const k = Math.min(2, auto * (Settings.get().ctlSize || 1)); // plafond : les boutons ne doivent pas manger l'écran
    document.documentElement.style.setProperty('--k', k.toFixed(3));
    Input.stickR = 55 * k;
    if (Game.resize && Game.running) Game.updateSafeArea();
  },
  initSettings() {
    document.querySelectorAll('[data-set]').forEach(el => {
      const k = el.dataset.set;
      el.addEventListener('input', () => {
        if (el.type === 'checkbox') Settings.set(k, el.checked);
        else { Settings.set(k, el.value / 100); const o = el.parentElement.querySelector('output'); if (o) o.textContent = el.value + ' %'; }
      });
      el.addEventListener('change', () => { Sfx.init(); if (k === 'sfx') Sfx.hit(0, 'christian'); if (k === 'amb') Ambience.preview(); if (k === 'voice' || k === 'voiceOn') Voice.speak('Alors là !', 'senoussi', 2); if (k === 'vibrate' && el.checked) Haptics.vibrate(60); });
    });
    document.querySelectorAll('#ctl-size [data-size]').forEach(b => b.onclick = () => { Sfx.click(); Settings.set('ctlSize', +b.dataset.size); this.refreshSettings(); });
    this.applyControlSize();
    window.addEventListener('resize', () => this.applyControlSize());
    $('#b-settings').onclick = () => { Sfx.init(); Sfx.click(); this.openSettings('s-title'); };
    $('#b-pause-settings').onclick = () => { Sfx.click(); this.openSettings('s-pause'); };
    $('#b-settings-back').onclick = () => this.closeSettings();
    Haptics.enabled = !!Settings.get().vibrate;
  },

  // ---------- fin de niveau ----------
  onLevelEnd(res) {
    this.setControls(false);
    this.lastRes = res;
    this.run.score = res.score;
    if (res.result === 'lose') {
      const mode = this.run.mode;
      $('#over-score').textContent = res.score + (mode === 'survival' ? ` — vague ${res.wave}` : '');
      if (mode === 'survival') { // record de survie par monde
        const prevS = Save.data.survival[res.worldId];
        if (!prevS || res.wave > prevS.wave || (res.wave === prevS.wave && res.score > prevS.score)) Save.data.survival[res.worldId] = { wave: res.wave, score: res.score };
        Save.save();
      }
      if (mode === 'bossrush') { Save.data.rushBest = Math.max(Save.data.rushBest || 0, res.score); Save.save(); }
      if (mode === 'daily') Daily.record(res.score);
      // point de reprise (v3.9) : « Réessayer » repart du début du tiers où l'on est tombé
      this.run.cp = res.checkpoint ? Object.assign({ world: res.worldId }, res.checkpoint) : null;
      $('#b-over-retry').textContent = this.run.cp ? 'REPRENDRE AU TIERS ' + this.run.cp.tier : 'RÉESSAYER';
      $('#b-over-restart').classList.toggle('hidden', !this.run.cp);
      $('#over-prog').innerHTML = Progress.worldEnd(res, this.run); // expérience gagnée quand même
      Share.prepare(res, this.run);
      const board = { story: 'histoire', bossrush: 'bossrush', survival: 'survie-' + res.worldId, daily: this.run.daily && this.run.daily.board }[mode];
      this.prepareNameEntry('#over-save', !!board && res.score > 0, board);
      this.show('s-over');
      return;
    }
    // victoire
    this.run.cp = null;
    const w = worldById(res.worldId);
    const prev = Save.data.cleared[w.id] || 0;
    Save.data.cleared[w.id] = Math.max(prev, res.levelScore);
    // Déblocages : uniquement en terminant le mode histoire (voir Save.storyCompleted dans data.js)
    const storyDone = this.run.mode === 'story' && this.run.idx >= this.run.order.length - 1;
    const rush = this.run.mode === 'bossrush', rushDone = rush && this.run.idx >= this.run.order.length - 1;
    const unlocks = storyDone ? Save.storyCompleted(this.run.hero, this.run.level) : [];
    if (rushDone) Save.data.rushBest = Math.max(Save.data.rushBest || 0, res.score);
    Save.save();
    // progression : étoiles, expérience, trophées
    if (storyDone) { Progress.unlock('histoire'); if (this.run.level >= 2) Progress.unlock('costaud'); if (this.run.level >= 3) Progress.unlock('ultime'); }
    if (rushDone) Progress.unlock('rush');
    const daily = this.run.mode === 'daily';
    if (daily) { Daily.record(res.score); Progress.unlock('defi'); }
    const progHtml = Progress.worldEnd(res, this.run);
    // médaille de vitesse (histoire, choix du niveau, défi du jour) : meilleure médaille et meilleur temps par monde, sur l'appareil
    const timed = ['story', 'select', 'daily'].includes(this.run.mode), medal = timed ? Game.medalFor(res.time) : null;
    if (timed) {
      const d = Save.data; d.medals = d.medals || {}; d.bestTimes = d.bestTimes || {};
      if (medal) d.medals[w.id] = Math.max(d.medals[w.id] || 0, medal.id);
      d.bestTimes[w.id] = Math.round(Math.min(d.bestTimes[w.id] || 9999, res.time));
      Save.save(true);
      if (medal && medal.id === 3) Progress.unlock('flash');
    }
    const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    const medalHtml = !timed ? '' : medal
      ? `<div class="medal-row" style="color:${medal.col}">${medal.icon} ${medal.name} <small>(moins de ${fmt(medal.max)})</small></div>`
      : `<div class="medal-row off">Pas de médaille — bronze en moins de ${fmt(EXTRA.medals[2].max)}</div>`;

    $('#win-title').textContent = storyDone ? 'VICTOIRE TOTALE !' : rushDone ? 'BOSS RUSH TERMINÉ !' : `${CHARACTERS[w.boss].name.toUpperCase()} EST PLANTÉ !`;
    $('#win-stats').innerHTML = `
      <div><span>Ennemis plantés</span><b>${res.kills}</b></div>
      <div><span>Temps</span><b>${fmt(res.time)}${medal ? ' ' + medal.icon : ''}</b></div>
      <div><span>Bonus temps</span><b>+${res.timeBonus}</b></div>
      <div><span>Bonus vie</span><b>+${res.hpBonus}</b></div>
      <div class="total"><span>SCORE</span><b>${res.score}</b></div>${medalHtml}`;
    let unlockHtml = unlocks.map(n => `🔓 <b>${n}</b> est débloqué !`).join('<br>');
    if (storyDone || rushDone) setTimeout(() => Sfx.jingle('victory'), 300);
    else Sfx.levelEnd(); // fin de niveau : « ba-dum-tss »
    for (let i = 0; i < (Progress.lastStars || 0); i++) setTimeout(() => { if (this.current === 's-win') Sfx.ding(i); }, 700 + i * 350); // une étoile = un « ding »
    Share.prepare(res, this.run, { stars: Progress.lastStars, medal });
    this.startParty();
    if (storyDone && !Save.isUnlocked('purf')) unlockHtml += (unlockHtml ? '<br>' : '') + '<span class="win-hint">Termine l\'histoire avec <b>Senoussi</b> pour débloquer <b>The Purf</b>…</span>';
    $('#win-unlock').innerHTML = progHtml + (unlockHtml ? '<div>' + unlockHtml + '</div>' : '');
    const btns = $('#win-buttons'); btns.innerHTML = '';
    const add = (label, fn, cls = '') => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { Sfx.click(); fn(); }; btns.appendChild(b); };
    if (rush && !rushDone) { // Boss Rush : la vie se reporte (petit soin entre deux boss), le score se cumule
      this.prepareNameEntry('#win-save', false);
      add('BOSS SUIVANT →', () => {
        this.run.idx++;
        this.run.heroHp = Math.min(CHARACTERS[this.run.hero].hp, res.heroHp + BALANCE.boss.rushHeal);
        this.openIntro();
      }, 'primary');
      add('Abandonner', () => this.toTitle());
    } else if (rushDone) {
      this.prepareNameEntry('#win-save', true, 'bossrush');
      add('Menu', () => this.toTitle());
    } else if (this.run.mode === 'story' && !storyDone) {
      this.prepareNameEntry('#win-save', false);
      add('MONDE SUIVANT →', () => {
        this.run.idx++;
        const max = CHARACTERS[this.run.hero].hp;
        this.run.heroHp = Math.min(max, res.heroHp + max * 0.5);
        this.openIntro();
      }, 'primary');
      add('Abandonner', () => this.toTitle());
    } else {
      this.prepareNameEntry('#win-save', true, storyDone ? 'histoire' : daily ? this.run.daily.board : w.id);
      if (!storyDone) { add('Rejouer', () => { this.run.score = 0; this.launch(true); }, 'primary'); if (!daily) add('Autre monde', () => this.openWorlds()); }
      add('Menu', () => this.toTitle());
    }
    add('📸 Partager', () => Share.share());
    this.show('s-win');
  },

  // Écran de victoire : le héros danse et des confettis tombent (v3.8)
  startParty() {
    const t0 = performance.now() / 1000, hero = this.run.hero;
    const conf = $('#confetti');
    conf.width = Math.round(innerWidth); conf.height = Math.round(innerHeight);
    const COLS = ['#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1', '#ff9ff3', '#ffffff'];
    this.liveCanvas(conf, (ctx, t, W, H) => {
      const el = t - t0, fade = clamp(1 - (el - 4) / 1.5, 0, 1); if (fade <= 0) return;
      ctx.globalAlpha = fade;
      for (let i = 0; i < 80; i++) {
        const sp = 90 + (i * 37) % 120, x = (i * 97.3) % W + Math.sin(el * 2 + i) * 22, y = (el * sp + (i * 53) % H) % (H + 40) - 20 - (el < 1.2 ? (1.2 - el) * H * 0.6 : 0);
        ctx.save(); ctx.translate(x, y); ctx.rotate(el * (2 + i % 4) + i); ctx.scale(1, Math.abs(Math.cos(el * 5 + i)) + 0.15);
        ctx.fillStyle = COLS[i % COLS.length]; ctx.fillRect(-5, -3, 10, 6); ctx.restore();
      }
      ctx.globalAlpha = 1;
    });
    this.liveCanvas($('#win-art'), (ctx, t, W, H) => {
      const el = t - t0, c = CHARACTERS[hero], x = W * 0.36, y = H - 14, jump = Math.abs(Math.sin(el * 4.2)) * 22;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x, y, 44 - jump * 0.6, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(x, y - jump);
      const step = Math.floor(el / 0.6) % 4, pose = step === 3 ? 'attack' : 'taunt'; // il nargue, nargue, nargue… et frappe dans le vide
      menuSprite(ctx, hero, { dir: 1, scale: 160 / Math.max(80, c.bh), t: el, pose, poseT: (el % 0.6) / 0.6, companion: true });
      ctx.restore();
    });
  },

  prepareNameEntry(sel, on, board) {
    const box = $(sel); box.classList.toggle('hidden', !on);
    if (!on) return;
    box.innerHTML = `<input class="name-in" maxlength="16" placeholder="Ton blaze" value="${(Save.data.name || '').replace(/"/g, '')}"><button class="btn small">Enregistrer</button><div class="save-msg"></div>`;
    const inp = box.querySelector('input'), btn = box.querySelector('button'), msg = box.querySelector('.save-msg');
    btn.onclick = async () => {
      const name = inp.value.trim() || 'Anonyme';
      Save.data.name = name; Save.save();
      btn.disabled = true; msg.textContent = 'Envoi…';
      const ok = await Scores.submit(board, { name, score: this.lastRes.score, hero: this.run.hero });
      msg.textContent = ok ? '✓ Score envoyé au classement en ligne !' : '✓ Score enregistré sur cet appareil';
      inp.disabled = true;
    };
  },
  saveScore() {},

  // ---------- défi du jour ----------
  async openDaily() {
    const d = Daily.get(), w = worldById(d.world), hero = CHARACTERS[d.hero];
    this.dailyCur = d;
    $('#daily-date').textContent = 'Défi du ' + d.label + ' — le même pour tout le monde';
    $('#daily-card').innerHTML = `<div>Monde : <b>${CHARACTERS[w.boss].name}</b> — ${w.sub}</div><div>Héros imposé : <b>${hero.name}</b> (niveau ${Progress.level(d.hero).lv})</div>`
      + `<div class="mod">Règle du jour : <b>${d.mod.name}</b> — ${d.mod.desc}</div><div>Difficulté : <b>★★ ${BALANCE.levels[d.level].name}</b></div>`
      + `<div>Ton record du jour : <b>${Daily.best() || '—'}</b></div>`;
    this.liveCanvas($('#daily-art'), (ctx, t, W, H) => {
      const s = H / VIEW_H; ctx.save(); ctx.scale(s, s); const VW = W / s;
      drawWorldBackground(ctx, d.world, VW, t * 40, t);
      ctx.save(); ctx.translate(VW * 0.35, GROUND_BOTTOM - 20); menuSprite(ctx, d.hero, { dir: 1, scale: 1.6, t, walk: t * 9, pose: Math.floor(t * 1.2) % 3 === 2 ? 'attack' : 'idle', poseT: (t * 1.2) % 1, companion: true }); ctx.restore();
      ctx.save(); ctx.translate(VW * 0.68, GROUND_BOTTOM - 20); menuSprite(ctx, w.boss, { dir: -1, scale: 1.9, t: t + 1, pose: 'idle' }); ctx.restore();
      ctx.restore();
    });
    $('#daily-list').innerHTML = '<li class="empty">Chargement…</li>';
    this.show('s-daily');
    const { online, list } = await Scores.top(d.board);
    $('#daily-src').textContent = (online ? '🌍 Classement du jour' : '📱 Classement du jour (cet appareil)');
    $('#daily-list').innerHTML = list.length
      ? list.slice(0, 10).map((e, i) => `<li><span class="rk">${i + 1}</span><span class="nm">${escapeHtml(e.name)}</span><b>${e.score}</b></li>`).join('')
      : '<li class="empty">Personne n\'a encore relevé le défi aujourd\'hui !</li>';
  },
  startDaily() {
    const d = this.dailyCur || Daily.get();
    this.run.mode = 'daily'; this.run.daily = d; this.run.hero = d.hero; this.run.level = d.level;
    this.run.order = [d.world]; this.run.idx = 0; this.run.score = 0; this.run.heroHp = null;
    this.openIntro();
  },
  // ---------- trophées ----------
  openTrophies() {
    const got = TROPHIES.filter(t => Progress.has(t.id)).length;
    $('#troph-sum').textContent = `${got} / ${TROPHIES.length} trophées · ${Progress.totalStars()} / ${WORLDS.length * 3} étoiles`;
    $('#troph-grid').innerHTML = TROPHIES.map(t => { const ok = Progress.has(t.id);
      return `<div class="troph ${ok ? 'got' : 'locked'}"><span class="ti">${ok ? t.icon : '🔒'}</span><span><b>${t.name}</b><small>${t.desc}</small></span></div>`; }).join('');
    this.show('s-trophies');
  },

  async openScores(board) {
    $('#score-board').value = board;
    $('#score-list').innerHTML = '<li class="empty">Chargement…</li>';
    this.show('s-scores');
    const { online, list } = await Scores.top(board);
    $('#score-src').textContent = online ? '🌍 Classement partagé' : '📱 Classement local (cet appareil)';
    $('#score-list').innerHTML = list.length
      ? list.map((e, i) => `<li><span class="rk">${i + 1}</span><span class="nm">${escapeHtml(e.name)}</span><span class="hr">${CHARACTERS[e.hero] ? CHARACTERS[e.hero].name : ''}</span><b>${e.score}</b></li>`).join('')
      : '<li class="empty">Aucun score pour l\'instant. À toi de jouer !</li>';
  },
};
const MENU_SCREENS = ['s-title', 's-chars', 's-worlds', 's-intro', 's-scores', 's-settings', 's-daily', 's-trophies'];
const CONTROLS_HTML = `
  <table>
    <tr><th></th><th>Clavier</th><th>Téléphone</th></tr>
    <tr><td>Se déplacer</td><td>Flèches ou ZQSD</td><td>Joystick (pouce gauche)</td></tr>
    <tr><td>Frapper (combo ×3)</td><td>J ou X</td><td>✊ FRAPPE</td></tr>
    <tr><td>Sauter</td><td>Espace</td><td>⤒ SAUT</td></tr>
    <tr><td>Coup sauté (renverse)</td><td>Espace puis J (en montée)</td><td>SAUT puis FRAPPE</td></tr>
    <tr><td>Coup plongeant (onde de choc)</td><td>Espace puis J / X en redescendant</td><td>SAUT puis FRAPPE en redescendant</td></tr>
    <tr><td>Attaque spéciale</td><td>K ou C</td><td>★ SPÉCIAL</td></tr>
    <tr><td>Attraper puis lancer un ennemi</td><td>Rester appuyé sur J / X, puis lâcher</td><td>Rester appuyé sur FRAPPE, puis lâcher</td></tr>
    <tr><td>Lancer un objet (trouvé dans une caisse)</td><td>J ou X</td><td>✊ FRAPPE</td></tr>
    <tr><td>Pause</td><td>Échap ou P</td><td>❚❚</td></tr>
  </table>
  <div class="ctl-tip">Chaque monde a 3 tiers : un mini-boss 💀, une épreuve 🎯, puis le boss 👑. Si tu tombes, tu reprends au début du tiers.<br>La frappe touche aussi en hauteur (goélands, chauves-souris). Le « ! » rouge annonce une attaque ennemie, et la zone rouge au sol montre où frappe le boss : esquive en changeant de ligne.<br>Ramasse les bonus qui brillent (casque, Rolex, os…) et bats l'ennemi en or avant qu'il s'enfuie !</div>`;
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
