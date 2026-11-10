// ============================================================
//  UI — écrans, choix du perso, mode histoire, choix du niveau
// ============================================================
const $ = s => document.querySelector(s);
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
    $('#b-scores').onclick = () => { Sfx.init(); Sfx.click(); this.openScores('histoire'); };
    $('#b-mute').onclick = () => this.toggleMute();
    $('#b-fs').onclick = () => this.fullscreen();
    $('#b-share').onclick = () => this.shareWhatsApp();
    $('#b-char-go').onclick = () => { Sfx.click(); this.confirmHero(); };
    $('#b-intro-go').onclick = () => { Sfx.click(); this.launch(); };
    // Retour depuis l'intro : choix du niveau → choix du monde ; histoire → choix du personnage
    $('#b-intro-back').onclick = () => { Sfx.click(); if (this.run.mode === 'select' || this.run.mode === 'survival') this.openWorlds(); else this.openChars(); };
    $('#b-resume').onclick = () => this.resume();
    $('#b-restart').onclick = () => { this.hideScreens(); Game.stop(); this.launch(true); };
    $('#b-quit').onclick = () => { Game.stop(); this.toTitle(); };
    $('#b-over-retry').onclick = () => { Sfx.click(); this.launch(true); };
    $('#b-over-menu').onclick = () => { Sfx.click(); this.toTitle(); };
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
        drawCharacter(ctx, k, { dir: i < n / 2 ? 1 : -1, scale: 0.85, t: t + i, walk: t * 8 + i, pose: 'walk' });
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
      card.innerHTML = `<canvas width="140" height="150"></canvas><div class="cc-name">${unlocked ? c.name : '???'}</div>${unlocked ? `<div class="cc-title">${c.title}</div>` : `<div class="cc-title">🔒 ${c.unlockText}</div>`}`;
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
        else drawCharacter(ctx, k, o);
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
        : best ? '✓ Record : ' + best : 'Jamais terminé';
      card.innerHTML = `<canvas width="300" height="150"></canvas><div class="wc-name">${locked ? '🔒 ' : ''}${CHARACTERS[w.boss].name.toUpperCase()}</div><div class="wc-boss">${w.sub}</div><div class="wc-best">${status}</div>`;
      const cv = card.querySelector('canvas');
      this.liveCanvas(cv, (ctx, t, W, H) => {
        const s = H / VIEW_H; ctx.save(); ctx.scale(s, s);
        drawWorldBackground(ctx, w.id, W / s, 200 + t * 30, t);
        ctx.translate(W / s * 0.62, GROUND_BOTTOM - 40);
        drawCharacter(ctx, w.boss, { dir: -1, scale: 1.6, t: t + i });
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

  // ---------- intro de monde ----------
  openIntro() {
    const wid = this.run.order[this.run.idx], w = worldById(wid), boss = CHARACTERS[w.boss];
    const n = `${this.run.idx + 1} / ${this.run.order.length}`;
    $('#intro-step').textContent = { story: 'MONDE ' + n, select: 'CHOIX DU NIVEAU', bossrush: 'BOSS RUSH — BOSS ' + n, survival: 'SURVIE — VAGUES SANS FIN' }[this.run.mode]
      + '  ·  ' + '★'.repeat(this.run.level || 1) + ' ' + BALANCE.levels[this.run.level || 1].name;
    $('#intro-name').textContent = w.name;
    $('#intro-sub').textContent = w.sub;
    $('#intro-boss').innerHTML = `Boss : <b style="color:${boss.light}">${boss.name}</b> — ${boss.title}`;
    const cv = $('#intro-art');
    this.liveCanvas(cv, (ctx, t, W, H) => {
      const s = H / VIEW_H; ctx.save(); ctx.scale(s, s);
      const VW = W / s;
      drawWorldBackground(ctx, wid, VW, t * 40, t);
      ctx.save(); ctx.translate(VW * 0.3, GROUND_BOTTOM - 30); drawCharacter(ctx, this.run.hero, { dir: 1, scale: 1.5, t, walk: t * 9, pose: 'idle', companion: true }); ctx.restore();
      ctx.save(); ctx.translate(VW * 0.72, GROUND_BOTTOM - 20); drawCharacter(ctx, w.boss, { dir: -1, scale: 2.1, t: t + 1, pose: Math.floor(t) % 3 === 0 ? 'windup' : 'idle' }); ctx.restore();
      ctx.font = '900 70px "Arial Black", Arial'; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.fillStyle = '#feca57';
      ctx.strokeText('VS', VW * 0.5, GROUND_TOP + 40); ctx.fillText('VS', VW * 0.5, GROUND_TOP + 40);
      ctx.restore();
    });
    this.show('s-intro');
  },

  launch(retry = false) {
    Sfx.init();
    const wid = this.run.order[this.run.idx];
    if (retry) { this.run.score = this.run.worldScoreStart; }
    this.run.worldScoreStart = this.run.score;
    const diff = { story: BALANCE.story.base + this.run.idx * BALANCE.story.perWorld, bossrush: 1 + this.run.idx * 0.08, survival: 1 }[this.run.mode] || 1.15;
    this.hideScreens(); this.setControls(true);
    Game.start({ worldId: wid, heroKind: this.run.hero, mode: this.run.mode, difficulty: diff, level: this.run.level, score: this.run.score, heroHp: retry ? null : this.run.heroHp });
  },

  pause() {
    if (!Game.running || Game.ended) return;
    Game.paused = true; Sfx.setPaused(true); // la musique continue, étouffée
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
      const board = { story: 'histoire', bossrush: 'bossrush', survival: 'survie-' + res.worldId }[mode];
      this.prepareNameEntry('#over-save', !!board && res.score > 0, board);
      this.show('s-over');
      return;
    }
    // victoire
    const w = worldById(res.worldId);
    const prev = Save.data.cleared[w.id] || 0;
    Save.data.cleared[w.id] = Math.max(prev, res.levelScore);
    // Déblocages : uniquement en terminant le mode histoire (voir Save.storyCompleted dans data.js)
    const storyDone = this.run.mode === 'story' && this.run.idx >= this.run.order.length - 1;
    const rush = this.run.mode === 'bossrush', rushDone = rush && this.run.idx >= this.run.order.length - 1;
    const unlocks = storyDone ? Save.storyCompleted(this.run.hero, this.run.level) : [];
    if (rushDone) Save.data.rushBest = Math.max(Save.data.rushBest || 0, res.score);
    Save.save();

    $('#win-title').textContent = storyDone ? 'VICTOIRE TOTALE !' : rushDone ? 'BOSS RUSH TERMINÉ !' : `${CHARACTERS[w.boss].name.toUpperCase()} EST PLANTÉ !`;
    $('#win-stats').innerHTML = `
      <div><span>Ennemis plantés</span><b>${res.kills}</b></div>
      <div><span>Temps</span><b>${Math.floor(res.time / 60)}:${String(Math.floor(res.time % 60)).padStart(2, '0')}</b></div>
      <div><span>Bonus temps</span><b>+${res.timeBonus}</b></div>
      <div><span>Bonus vie</span><b>+${res.hpBonus}</b></div>
      <div class="total"><span>SCORE</span><b>${res.score}</b></div>`;
    let unlockHtml = unlocks.map(n => `🔓 <b>${n}</b> est débloqué !`).join('<br>');
    if (storyDone || rushDone) setTimeout(() => Sfx.jingle('victory'), 300);
    else Sfx.levelEnd(); // fin de niveau : « ba-dum-tss »
    if (storyDone && !Save.isUnlocked('purf')) unlockHtml += (unlockHtml ? '<br>' : '') + '<span class="win-hint">Termine l\'histoire avec <b>Senoussi</b> pour débloquer <b>The Purf</b>…</span>';
    $('#win-unlock').innerHTML = unlockHtml;
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
      this.prepareNameEntry('#win-save', true, storyDone ? 'histoire' : w.id);
      if (!storyDone) { add('Rejouer', () => { this.run.score = 0; this.launch(true); }, 'primary'); add('Autre monde', () => this.openWorlds()); }
      add('Menu', () => this.toTitle());
    }
    this.show('s-win');
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
const MENU_SCREENS = ['s-title', 's-chars', 's-worlds', 's-intro', 's-scores', 's-settings'];
const CONTROLS_HTML = `
  <table>
    <tr><th></th><th>Clavier</th><th>Téléphone</th></tr>
    <tr><td>Se déplacer</td><td>Flèches ou ZQSD</td><td>Joystick (pouce gauche)</td></tr>
    <tr><td>Frapper (combo ×3)</td><td>J ou X</td><td>✊ FRAPPE</td></tr>
    <tr><td>Sauter</td><td>Espace</td><td>⤒ SAUT</td></tr>
    <tr><td>Coup sauté (renverse)</td><td>Espace puis J (en montée)</td><td>SAUT puis FRAPPE</td></tr>
    <tr><td>Coup plongeant (onde de choc)</td><td>Espace puis J / X en redescendant</td><td>SAUT puis FRAPPE en redescendant</td></tr>
    <tr><td>Attaque spéciale</td><td>K ou C</td><td>★ SPÉCIAL</td></tr>
    <tr><td>Pause</td><td>Échap ou P</td><td>❚❚</td></tr>
  </table>
  <div class="ctl-tip">La frappe touche aussi en hauteur (goélands, chauves-souris). Le « ! » rouge annonce une attaque ennemie : esquive en changeant de ligne.</div>`;
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
