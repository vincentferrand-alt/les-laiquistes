// ============================================================
//  AUDIO — tout est synthétisé avec Web Audio (aucun fichier audio)
//   • Sfx      : bus de mixage (musique / effets / ambiance), bruitages, jingles
//   • Music    : séquenceur multi-pistes calé sur audioCtx.currentTime
//   • SONGS    : une musique écrite par monde + menu ; thème de boss dérivé
//   • Ambience : ambiances sonores par monde (goélands, cigales, vent…)
//   • Voice    : voix des boss par la synthèse vocale du navigateur (fr-FR)
// ============================================================

const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

// iPad / iPhone : jouer le son même quand l'interrupteur « silencieux » est activé (iOS 17+ / Safari 17+).
// Effet secondaire : la musique d'une autre appli (Spotify…) se met en pause pendant le jeu.
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

// ---------- Réglages (sauvegardés) ----------
// Save.data.settings = { music, sfx, amb, voice (0..1 = position du curseur), voiceOn, vibrate, ctlSize } — voir data.js
// Les curseurs Musique / Effets / Ambiance suivent une échelle « progressive » (en décibels) :
// on règle finement dans les volumes bas, comme l'oreille l'entend. 0 = coupé, 100 % = plein volume, 50 % ≈ -18 dB.
const VOL_DB = 36;
const volGain = p => p <= 0.001 ? 0 : Math.pow(10, -VOL_DB * (1 - p) / 20);
const Settings = {
  get() { return Save.data.settings; },
  set(k, v) { Save.data.settings[k] = v; Save.save(true); // réglages propres à l'appareil : pas envoyés en ligne
    Sfx.applyVolumes(); if (k === 'vibrate') Haptics.enabled = !!v; if (k === 'ctlSize' && typeof UI !== 'undefined') UI.applyControlSize(); },
};

const Sfx = {
  ctx: null, master: null, musicBus: null, musicLP: null, sfxBus: null, ambBus: null, voiceBus: null, noiseBuf: null,
  muted: false, paused: false, wanted: null, act: {},

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      const comp = (thr, ratio, att, rel, knee = 6) => { const k = c.createDynamicsCompressor(); k.threshold.value = thr; k.ratio.value = ratio; k.attack.value = att; k.release.value = rel; k.knee.value = knee; return k; };
      // sortie : volume général → limiteur (empêche toute saturation, même quand tout tape en même temps)
      this.master = c.createGain();
      const lim = comp(-2, 20, 0.002, 0.12, 0);
      this.master.connect(lim); lim.connect(c.destination);
      // MUSIQUE : bus → filtre (étouffé en pause) → compresseur doux (séparé : les coups ne font plus « respirer » la musique)
      const mComp = comp(-20, 2.5, 0.01, 0.25); mComp.connect(this.master);
      this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 20000;
      this.musicLP.connect(mComp);
      this.musicBus = c.createGain(); this.musicBus.connect(this.musicLP);
      this.duck = c.createGain(); this.duck.connect(this.musicBus); // baisse la musique quand quelqu'un parle
      // EFFETS : compresseur à eux
      const sComp = comp(-12, 3, 0.003, 0.15); sComp.connect(this.master);
      this.sfxBus = c.createGain(); this.sfxBus.connect(sComp);
      // AMBIANCE : son propre curseur, directement vers la sortie
      this.ambBus = c.createGain(); this.ambBus.connect(this.master);
      // VOIX (fichiers audio) : à part, pour garder un volume constant
      this.voiceBus = c.createGain(); this.voiceBus.connect(this.master);
      // RÉVERBÉRATION : un peu d'espace autour de la musique et des effets (impulsion fabriquée par calcul)
      const verb = c.createConvolver(); verb.buffer = this.makeImpulse(1.7, 3.4);
      const vOut = c.createGain(); vOut.gain.value = 1; verb.connect(vOut); vOut.connect(this.master);
      const mSend = c.createGain(); mSend.gain.value = 0.18; this.musicLP.connect(mSend); mSend.connect(verb);
      const sSend = c.createGain(); sSend.gain.value = 0.12; this.sfxBus.connect(sSend); sSend.connect(verb);
      const len = c.sampleRate;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      Music.boot();
      Samples.load();
      VoiceFiles.load();
      if (this.wanted) { const w = this.wanted; this.wanted = null; this.music(w); }
      Voice.prime();
    }
    if (this.ctx.state !== 'running' && !document.hidden) this.ctx.resume(); // iOS : l'état peut être « interrupted », pas seulement « suspended »
  },

  // Réponse impulsionnelle stéréo : bruit qui décroît, de plus en plus sourd (comme une pièce)
  makeImpulse(dur, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      const pre = Math.floor(c.sampleRate * 0.012); // petit pré-délai
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / n, k = 0.35 + 0.6 * t; // le filtre se ferme avec le temps
        lp += (Math.random() * 2 - 1 - lp) * (1 - k);
        d[i] = lp * Math.pow(1 - t, decay) * 0.6;
      }
    }
    return buf;
  },

  ambLevel() { return volGain(Settings.get().amb) * 0.9; },
  applyVolumes() {
    if (!this.ctx) return;
    const s = Settings.get(), t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, t, 0.02);
    this.musicBus.gain.setTargetAtTime(volGain(s.music) * 0.45, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(volGain(s.sfx), t, 0.05);
    this.voiceBus.gain.setTargetAtTime(clamp(s.voice, 0, 1), t, 0.05);
    if (!this.paused) this.ambBus.gain.setTargetAtTime(this.ambLevel(), t, 0.05);
  },
  setMuted(m) { this.muted = m; this.applyVolumes(); if (m) Voice.stop(); },

  // Pause : la musique continue, étouffée ; l'ambiance se coupe. Reprise en douceur.
  setPaused(p) {
    this.paused = p;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicLP.frequency.setTargetAtTime(p ? 700 : 20000, t, 0.08);
    this.duck.gain.setTargetAtTime(p ? 0.55 : 1, t, 0.08);
    this.ambBus.gain.setTargetAtTime(p ? 0 : this.ambLevel(), t, 0.1);
    if (p) Voice.stop();
  },

  // Limite le nombre de sons d'une même famille joués en même temps (sinon tout s'empile et sature)
  gate(cat, max, len = 0.12) {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime, a = this.act[cat] = (this.act[cat] || []).filter(e => e > now);
    if (a.length >= max) return false;
    a.push(now + len); return true;
  },

  // Panoramique stéréo d'après la position x dans le monde (bord gauche → -0.8, bord droit → +0.8)
  panX(x) {
    if (typeof Game === 'undefined' || !Game.running) return 0;
    return clamp(((x - Game.camX) / Game.VW) * 2 - 1, -1, 1) * 0.8;
  },
  out(pan, bus) {
    const dest = bus || this.sfxBus;
    if (!pan || !this.ctx.createStereoPanner) return dest;
    const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(dest);
    return p;
  },

  // ---------- briques de base ----------
  tone(type, f1, f2, dur, vol = 0.3, delay = 0, dest = null, wobble = 0, pan = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    // montée de 4 ms : sans elle, chaque son démarre par un petit « clic »
    const a = Math.min(0.004, dur * 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.005));
    if (wobble) {
      const l = this.ctx.createOscillator(), lg = this.ctx.createGain();
      l.frequency.value = 18 + Math.random() * 10; lg.gain.value = wobble;
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur);
    }
    o.connect(g); g.connect(dest || this.out(pan));
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3, freq = 1200, delay = 0, q = 1, pan = 0, dest = null, type = 'bandpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    const a = Math.min(0.003, dur * 0.3); // montée anti-clic
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.005));
    s.connect(f); f.connect(g); g.connect(dest || this.out(pan));
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  vary(f) { return f * (0.92 + Math.random() * 0.16); }, // légère variation de hauteur aléatoire

  // ---------- bruitages ----------
  click()      { this.tone('square', 660, 880, 0.06, 0.12); },
  swing(pan)   { if (this.gate('swing', 3, 0.08)) this.noise(0.09, 0.1, this.vary(2500), 0, 0.8, pan); },
  // Coup porté : trois couches — choc grave (le corps), claquement (l'impact), « couleur » propre à l'arme.
  // kind = qui frappe ; combo = 0..2 ; rise = série de coups en cours (le son monte un peu avec elle)
  hit(pan, kind, combo = 0, rise = 0) {
    if (!this.ctx || !this.gate('hit', 4, 0.09)) return;
    const p = (1 + combo * 0.06 + Math.min(rise, 20) * 0.01) * (0.95 + Math.random() * 0.1);
    this.tone('sine', 150 * p, 52, 0.11, 0.34, 0, null, 0, pan);       // choc dans le corps
    this.noise(0.035, 0.24, 2600 * p, 0, 1.2, pan);                    // claquement
    this.noise(0.09, 0.18, 850 * p, 0.004, 1, pan);                    // chair
    this.weapon(kind, pan, p, false);
  },
  bigHit(pan, kind, rise = 0) {
    if (!this.ctx || !this.gate('big', 3, 0.15)) return;
    const p = (1 + Math.min(rise, 20) * 0.01) * (0.95 + Math.random() * 0.1);
    this.tone('sine', 120 * p, 38, 0.24, 0.5, 0, null, 0, pan);
    this.noise(0.05, 0.3, 2200 * p, 0, 1, pan);
    this.noise(0.26, 0.34, this.vary(480), 0.006, 0.9, pan);
    this.tone('sawtooth', this.vary(140), 40, 0.2, 0.18, 0, null, 0, pan);
    this.weapon(kind, pan, p, true);
  },
  // Couleur de l'arme du héros (les coups des ennemis gardent le son « poing » de base)
  weapon(kind, pan, p, big) {
    const v = big ? 1.3 : 1;
    switch (kind) {
      case 'christian': // truelle : tintement métallique
        [1, 2.76, 5.4].forEach((m, i) => this.tone('triangle', 1250 * m * p, null, 0.16 - i * 0.04, 0.09 * v / (i + 1), 0, null, 0, pan)); break;
      case 'guilhem': // montre en or : claque sèche + petit « ting » doré
        this.tone('sine', 3136 * p, 2900, 0.12, 0.07 * v, 0.01, null, 0, pan); this.noise(0.02, 0.15, 5000, 0, 2, pan); break;
      case 'venum': // gants de boxe : « pof » cuir, plus sourd
        this.noise(0.07, 0.3 * v, 600 * p, 0, 0.7, pan, null, 'lowpass'); this.tone('sine', 95 * p, 50, 0.09, 0.3 * v, 0, null, 0, pan); break;
      case 'senoussi': // grande pelle : « bôngg » grave qui résonne
        [1, 2.2, 3.9].forEach((m, i) => this.tone('triangle', 420 * m * p, 400 * m * p, 0.32 - i * 0.07, 0.12 * v / (i + 1), 0, null, 0, pan)); break;
      case 'faouzi': // cartouche en plastique + bip
        this.noise(0.025, 0.22, 3800, 0, 3, pan); this.tone('square', 523 * p, 262, 0.05, 0.06 * v, 0.015, null, 0, pan); break;
      case 'purf': // poudre toxique : « pschh » qui grésille
        this.noise(0.2, 0.14 * v, 6000, 0, 0.6, pan, null, 'highpass'); break;
      case 'fateh': // poings : un claquement de plus
        this.noise(0.03, 0.18 * v, 1500 * p, 0.012, 1.5, pan); break;
    }
  },
  jump()       { this.tone('sine', 300, 800, 0.16, 0.18); },
  hurt()       { if (this.gate('hurt', 1, 0.15)) { this.tone('sawtooth', this.vary(220), 70, 0.28, 0.3, 0, null, 40); this.noise(0.08, 0.2, 700, 0, 1); } },
  pickup()     { [0, 0.07, 0.14].forEach((d, i) => this.tone('square', 520 + i * 260, null, 0.09, 0.15, d)); },
  // pets et rots de synthèse (repli si les fichiers ne sont pas chargés)
  synthFart(pan) { this.tone('sawtooth', rand(70, 110), 30, rand(0.35, 0.6), 0.45, 0, null, 50, pan); this.noise(0.3, 0.15, 200, 0, 1, pan); },
  synthBurp(pan) { this.tone('square', rand(110, 150), 50, 0.45, 0.3, 0, null, 30, pan); },
  fart(pan, which) { if (!Samples.play(which || Samples.next('pet'), pan, 1)) this.synthFart(pan); },
  burp(pan, which) { if (!Samples.play(which || Samples.next('rot'), pan, 1)) this.synthBurp(pan); },
  // Ennemi KO : un « pouf » cartoon la plupart du temps, et de temps en temps un pet ou un rot (8 pets, 5 rots)
  // renvoie 'pet', 'rot' ou rien : le jeu affiche alors le gag à l'écran (texte BD + nuage), pour qu'il n'y ait aucun doute
  kill(pan, boss = false) {
    if (!this.ctx) return null;
    if (boss) { this.fart(pan, pick(['pet-3', 'pet-3', 'pet-5'])); return 'pet'; } // un boss vaincu part toujours… avec panache
    this.killN = (this.killN || 0) + 1;
    // ≈ 1 fois sur 3, et jamais deux KO de suite
    const lucky = this.killN - (this.lastGag || -9) >= 2 && Math.random() < 0.33;
    if (lucky && this.gate('gag', 1, 0.8)) {
      this.lastGag = this.killN;
      if (Math.random() < 0.62) { this.fart(pan); return 'pet'; }
      this.burp(pan); return 'rot';
    }
    if (!this.gate('ko', 2, 0.2)) return;
    const p = 0.9 + Math.random() * 0.25;
    this.noise(0.22, 0.3, 380 * p, 0, 0.8, pan, null, 'lowpass');               // « pouf » (nuage de poussière)
    this.tone('sine', 900 * p, 180, 0.22, 0.08, 0.02, null, 0, pan);            // petit sifflet qui descend
    [0, 0.06, 0.12].forEach((d, i) => this.tone('triangle', 1760 * p * (1 + i * 0.26), null, 0.05, 0.05, 0.08 + d, null, 0, pan)); // étoiles
  },
  warn(pan)    { if (this.gate('warn', 2, 0.25)) { this.tone('square', 880, 880, 0.08, 0.1, 0, null, 0, pan); this.tone('square', 660, 660, 0.08, 0.1, 0.12, null, 0, pan); } },
  // Aboiement de chien : « wouf » (voix qui monte puis retombe, filtrée comme une gueule) + souffle
  bark(pan, pitch = 1, vol = 1) {
    if (!this.ctx || !this.gate('bark', 2, 0.2)) return;
    const c = this.ctx, t = c.currentTime, p = pitch * (0.93 + Math.random() * 0.14), out = this.out(pan);
    const o = c.createOscillator(), o2 = c.createOscillator(), bp = c.createBiquadFilter(), bp2 = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    [o, o2].forEach((x, i) => { const m = i ? 0.5 : 1; x.frequency.setValueAtTime(330 * p * m, t); x.frequency.exponentialRampToValueAtTime(560 * p * m, t + 0.035); x.frequency.exponentialRampToValueAtTime(240 * p * m, t + 0.16); });
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(900 * p, t); bp.frequency.exponentialRampToValueAtTime(1400 * p, t + 0.04); bp.frequency.exponentialRampToValueAtTime(600 * p, t + 0.16); bp.Q.value = 3;
    bp2.type = 'peaking'; bp2.frequency.value = 2600 * p; bp2.gain.value = 8; bp2.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.012); g.gain.setValueAtTime(0.45 * vol, t + 0.07); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    o.connect(bp); o2.connect(bp); bp.connect(bp2); bp2.connect(g); g.connect(out);
    [o, o2].forEach(x => { x.start(t); x.stop(t + 0.22); });
    this.noise(0.07, 0.2 * vol, 1700 * p, 0, 1.4, pan);
  },
  // Bruit de jeu vidéo : « piou » 8-bit, la note change à chaque coup du combo
  blip(pan, combo = 0) {
    if (!this.ctx || !this.gate('blip', 3, 0.1)) return;
    const base = [988, 1175, 1568][combo % 3];
    this.tone('square', base, base * 2, 0.04, 0.13, 0, null, 0, pan);
    this.tone('square', base * 2, base * 0.35, 0.11, 0.11, 0.04, null, 0, pan);
    if (combo === 2) [0, 0.05, 0.1].forEach((d, i) => this.tone('square', 1319 * Math.pow(1.26, i), null, 0.05, 0.08, 0.14 + d, null, 0, pan)); // petit arpège au 3e coup
  },
  // Son d'attaque propre au combattant (le « fouet » de l'arme dans l'air)
  attack(kind, pan, combo = 0) {
    if (kind === 'fateh') this.bark(pan, 1, 1);
    else if (kind === 'aika' || kind === 'berger') this.bark(pan, kind === 'aika' ? 1.15 : 1.3, 0.7);
    else if (kind === 'faouzi') this.blip(pan, combo);
    else if (this.gate('swing', 3, 0.08)) this.noise(0.1 + combo * 0.03, 0.08 + combo * 0.03, this.vary(kind === 'senoussi' ? 1500 : 2600) * (1 + combo * 0.12), 0, 0.8, pan); // souffle plus ample au 3e coup
  },
  // bruits de pas selon le sol du monde (discrets : ils accompagnent sans fatiguer)
  step(world, pan) {
    if (!this.ctx || !this.gate('step', 1, 0.1)) return;
    const v = 0.035;
    switch (world) {
      case 'senoussi': this.noise(0.09, v * 1.3, 900, 0, 0.5, pan, null, 'lowpass'); break; // sable
      case 'venum': this.tone('square', this.vary(1400), 900, 0.03, v * 0.4, 0, null, 0, pan); this.noise(0.04, v, 4000, 0, 2, pan); break; // métal
      case 'faouzi': this.tone('square', this.vary(220), 110, 0.04, v * 0.8, 0, null, 0, pan); break; // pas 8-bit
      case 'purf': this.noise(0.1, v * 1.3, 500, 0, 1, pan); this.tone('sine', this.vary(90), 60, 0.06, v, 0, null, 0, pan); break; // flaque
      default: this.noise(0.06, v, this.vary(1600), 0, 1.2, pan); this.tone('sine', this.vary(120), 70, 0.05, v * 0.8, 0, null, 0, pan);
    }
  },
  special(kind, pan) {
    switch (kind) {
      case 'truelle':   this.bigHit(pan); this.tone('triangle', 90, 30, 0.5, 0.5, 0, null, 0, pan); break;
      case 'rolex':     [0, 0.05, 0.1, 0.15].forEach((d, i) => this.tone('sine', 1200 + i * 400, 2400, 0.25, 0.15, d, null, 0, pan)); break;
      case 'chien':     [0, 0.2, 0.36].forEach((d, i) => setTimeout(() => this.bark(pan, 1.1 - i * 0.05, 1), d * 1000)); break; // Aïka aboie 3 fois
      case 'cartouches': [0, 0.06, 0.12, 0.18].forEach((d, i) => this.tone('square', 1568 - i * 200, 400, 0.08, 0.14, d, null, 0, pan)); this.tone('square', 196, 98, 0.25, 0.18, 0.05, null, 0, pan); break; // rafale 8-bit
      case 'direct':
      case 'imperatif': this.noise(0.25, 0.3, 700, 0, 1, pan); this.tone('sawtooth', 90, 200, 0.3, 0.3, 0, null, 0, pan); break;
      case 'moutons':
      case 'agneaux':   [0, 0.15, 0.3].forEach(d => this.tone('sawtooth', this.vary(380), 300, 0.25, 0.2, d, null, 30, pan)); break;
      case 'fumee':     this.noise(0.8, 0.25, 300, 0, 0.5, pan); this.fart(pan); break;
    }
  },
  // coup plongeant : sifflement qui descend, puis choc grave à l'atterrissage
  diveStart() { this.tone('sine', 2200, 260, 0.32, 0.16); this.noise(0.3, 0.08, 3500, 0, 0.6); },
  diveLand()  { this.tone('sine', 110, 28, 0.55, 0.7); this.tone('square', 70, 30, 0.25, 0.25); this.noise(0.4, 0.55, 220, 0, 0.7); },
  // Palier de combo (×10, ×25…) ou multi-élimination : arpège qui monte, plus haut selon le niveau
  comboUp(lv = 0) {
    if (!this.ctx) return;
    const base = [72, 74, 77, 79][Math.min(3, lv)];
    [0, 4, 7, 12].forEach((iv, i) => this.tone('square', midiHz(base + iv), null, 0.09, 0.12, i * 0.06));
    this.tone('triangle', midiHz(base + 24), null, 0.3, 0.1, 0.26);
  },
  // Arrivée d'un boss : le son enregistré (repli : la synthèse)
  bossArrival() { if (!Samples.play('arrivee-boss', 0, 1, 1)) this.bossIntro(); },
  // Fin de niveau (boss battu, écran de victoire) : « ba-dum-tss »
  levelEnd() { if (!Samples.play('blague-nulle', 0, 1, 1)) this.jingle('stage'); },
  bossIntro() { [0, 0.25, 0.5].forEach((d, i) => this.tone('sawtooth', 110 - i * 15, 90 - i * 15, 0.35, 0.35, d)); this.noise(1.2, 0.25, 160, 0, 0.6); },

  // Moteur d'un véhicule de boss : renvoie une poignée { stop(brake) }
  engine(type, pan = 0.6) {
    if (!this.ctx) return { stop() {} };
    const c = this.ctx, t = c.currentTime;
    // Camionnette de Christian : le moteur enregistré, en boucle tant qu'elle roule
    if (type === 'van' && Samples.buf['voiture-christian']) {
      const p = Samples.play('voiture-christian', pan, 1.1, 1, true);
      return { stop: brake => {
        const n = c.currentTime; p.g.gain.setValueAtTime(p.g.gain.value, n); p.g.gain.exponentialRampToValueAtTime(0.0001, n + 0.4);
        try { p.src.stop(n + 0.45); } catch (e) {}
        if (brake) { this.noise(0.45, 0.22, 2600, 0, 12, pan); this.tone('square', 440, 440, 0.12, 0.15, 0.45, null, 0, pan); this.tone('square', 440, 440, 0.12, 0.15, 0.62, null, 0, pan); }
      } };
    }
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.3);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.connect(g); g.connect(this.out(pan));
    const nodes = [];
    const osc = (tp, f) => { const o = c.createOscillator(); o.type = tp; o.frequency.setValueAtTime(f, t); o.connect(lp); o.start(t); nodes.push(o); return o; };
    if (type === 'van') { // gros diesel qui ronronne
      lp.frequency.value = 380;
      const a = osc('sawtooth', 46), b = osc('square', 23);
      a.frequency.linearRampToValueAtTime(70, t + 1.2); b.frequency.linearRampToValueAtTime(35, t + 1.2);
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 11; lg.gain.value = 0.12; l.connect(lg); lg.connect(g.gain); l.start(t); nodes.push(l);
    } else if (type === 'sport') { // moteur qui monte dans les tours
      lp.frequency.value = 1400;
      const a = osc('sawtooth', 90), b = osc('sawtooth', 181);
      a.frequency.exponentialRampToValueAtTime(260, t + 0.9); b.frequency.exponentialRampToValueAtTime(520, t + 0.9);
      a.frequency.exponentialRampToValueAtTime(120, t + 1.5); b.frequency.exponentialRampToValueAtTime(240, t + 1.5);
    } else { // SUV électrique : sifflement montant
      lp.frequency.value = 3000;
      const a = osc('sine', 260), b = osc('triangle', 523);
      a.frequency.exponentialRampToValueAtTime(820, t + 1.3); b.frequency.exponentialRampToValueAtTime(1640, t + 1.3);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.4);
    }
    return {
      stop: brake => {
        const n = c.currentTime;
        g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value || 0.2, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.35);
        nodes.forEach(o => { try { o.stop(n + 0.4); } catch (e) {} });
        if (brake) {
          if (type === 'suv') this.noise(0.5, 0.1, 2000, 0, 0.5, pan);
          else { this.noise(0.45, 0.22, 2600, 0, 12, pan); this.tone('square', 440, 440, 0.12, 0.15, 0.45, null, 0, pan); this.tone('square', 440, 440, 0.12, 0.15, 0.62, null, 0, pan); }
        }
      },
    };
  },

  // ---------- jingles (sur le bus musique) ----------
  jingle(name) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + 0.05, out = this.musicBus;
    const n = (inst, m, at, d, v = 0.5) => Inst[inst](t0 + at, midiHz(m), d, v, out);
    if (name === 'victory') {
      [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36]].forEach(([m, a]) => n('square', m, a, 0.14, 0.32));
      n('square', 84, 0.5, 0.9, 0.36); n('square', 79, 0.5, 0.9, 0.2);
      [48, 55, 60, 64].forEach(m => n('pad', m, 0.5, 1.2, 0.3));
      Drums.crash(t0 + 0.5, 0.5, out); Drums.kick(t0 + 0.5, 0.9, out);
      [0, 0.12, 0.24, 0.36].forEach(a => Drums.snare(t0 + a, 0.35, out));
    } else if (name === 'defeat') { // trombone triste
      [[62, 0], [61, 0.42], [60, 0.84]].forEach(([m, a]) => n('brass', m, a, 0.4, 0.45));
      n('brass', 59, 1.26, 1.3, 0.45);
      n('tri', 35, 1.26, 1.3, 0.6);
    } else if (name === 'stage') { // vague terminée
      [72, 76, 79].forEach((m, i) => n('pulse', m, i * 0.08, 0.1, 0.25));
    }
  },
  victory()  { Music.stop(0.3); this.jingle('victory'); },
  gameOver() { Music.stop(0.4); if (!Samples.play('game-over', 0, 1, 1)) { this.jingle('defeat'); this.tone('sawtooth', 150, 20, 1.8, 0.2, 0.1); } },

  // ---------- musique : API simple pour le reste du jeu ----------
  // name : 'menu' | id de monde | 'boss:' + id de monde
  music(name) {
    if (!this.ctx) { this.wanted = name; return; }
    if (Music.current === name && Music.track) return;
    const song = name === 'menu' ? SONGS.menu : name.startsWith('boss:') ? bossSong(name.slice(5)) : SONGS[name];
    if (song) Music.play(song, name);
  },
  startMusic(worldIdx) { this.music(WORLDS[worldIdx] ? WORLDS[worldIdx].id : 'menu'); }, // compatibilité
  stopMusic(fade = 0.5) { Music.stop(fade); },
};

// ============================================================
//  FICHIERS AUDIO — bruitages réalistes (sounds/) et voix générées (voices/)
//  Tout est facultatif : si un fichier manque, le jeu retombe sur la synthèse.
// ============================================================
function loadBuffer(url) {
  return fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(ab => new Promise((res, rej) => { const p = Sfx.ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); })); // ancien Safari : rappels
}
// Bruitages enregistrés (fournis par Vincent, nettoyés : blancs coupés, volumes égalisés) :
//  5 pets, 2 rots, l'arrivée des boss, la voiture de Christian, le game over et la fin de niveau (« blague nulle »)
const Samples = {
  list: { pet: 5, rot: 2 }, named: ['arrivee-boss', 'voiture-christian', 'game-over', 'blague-nulle'], buf: {}, bag: {}, loading: false,
  load() {
    if (this.loading || !Sfx.ctx) return; this.loading = true;
    for (const k in this.list) for (let i = 1; i <= this.list[k]; i++) {
      const name = k + '-' + i;
      loadBuffer('sounds/' + name + '.mp3').then(b => { this.buf[name] = b; }).catch(() => {});
    }
    this.named.forEach(name => loadBuffer('sounds/' + name + '.mp3').then(b => { this.buf[name] = b; }).catch(() => {}));
  },
  // tirage « sac mélangé » : on entend tous les sons d'une famille avant d'en réentendre un
  next(k) {
    if (!this.bag[k] || !this.bag[k].length) this.bag[k] = shuffle(Array.from({ length: this.list[k] }, (_, i) => k + '-' + (i + 1)));
    return this.bag[k].pop();
  },
  // Joue un son ; renvoie { src, g } (ou null si le fichier n'est pas chargé : on retombe alors sur la synthèse)
  play(name, pan = 0, vol = 1, rate, loop = false) {
    const b = this.buf[name]; if (!b || !Sfx.ctx) return null;
    const c = Sfx.ctx, s = c.createBufferSource(); s.buffer = b; s.loop = loop;
    s.playbackRate.value = rate || (0.92 + Math.random() * 0.16); // légère variation : jamais tout à fait le même
    const g = c.createGain(); g.gain.value = vol * 0.8;
    s.connect(g); g.connect(Sfx.out(pan)); s.start();
    return { src: s, g };
  },
};
// Voix générées par tools/make-voices.py : voices/manifest.json liste { kind, text, file }
const VoiceFiles = {
  map: null, buf: {}, count: 0,
  load() {
    if (this.map || !Sfx.ctx) return; this.map = {};
    fetch('voices/manifest.json').then(r => r.ok ? r.json() : null).then(m => {
      if (!m || !Array.isArray(m.files)) return;
      m.files.forEach(f => {
        this.map[f.kind + '|' + f.text] = f.file;
        loadBuffer('voices/' + f.file).then(b => { this.buf[f.file] = b; this.count++; if (typeof UI !== 'undefined' && UI.refreshSettings) UI.refreshSettings(); }).catch(() => {});
      });
    }).catch(() => {});
  },
  get(text, kind) { const f = this.map && this.map[kind + '|' + text]; return f ? this.buf[f] : null; },
};

// ============================================================
//  INSTRUMENTS — fonctions (t, fréquence, durée, volume, sortie)
// ============================================================
function env(g, t, a, peak, d, dur, rel = 0.05) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * d), t + Math.max(a + 0.01, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
}
function mkOsc(type, f, t, end, dest, detune = 0) {
  const o = Sfx.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(end); return o;
}
function vibrato(o, t, end, rate, depth) {
  const c = Sfx.ctx, l = c.createOscillator(), lg = c.createGain();
  l.frequency.value = rate; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(depth, t + 0.15);
  l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(end);
}
const Inst = {
  square(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(); g.connect(out); env(g, t, 0.005, v * 0.22, 0.6, d, 0.04); mkOsc('square', f, t, t + d + 0.1, g); },
  pulse(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(); g.connect(out); env(g, t, 0.004, v * 0.13, 0.5, d, 0.03); mkOsc('square', f, t, t + d + 0.1, g, -8); mkOsc('square', f, t, t + d + 0.1, g, 8); },
  tri(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(); g.connect(out); env(g, t, 0.005, v * 0.55, 0.7, d, 0.05); mkOsc('triangle', f, t, t + d + 0.1, g); },
  sub(t, f, d, v, out) { // basse 808 : sinus avec petit glissé
    const c = Sfx.ctx, g = c.createGain(); g.connect(out); env(g, t, 0.006, v * 0.75, 0.55, d, 0.12);
    const o = mkOsc('sine', f * 1.5, t, t + d + 0.2, g); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
  },
  whistle(t, f, d, v, out) { // sifflement de chantier
    const c = Sfx.ctx, g = c.createGain(); g.connect(out); env(g, t, 0.03, v * 0.2, 0.8, d, 0.06);
    const o = mkOsc('sine', f, t, t + d + 0.1, g); vibrato(o, t, t + d + 0.1, 6, f * 0.012);
    const o2 = mkOsc('sine', f * 2, t, t + d + 0.1, g); o2.detune.value = 3;
  },
  fife(t, f, d, v, out) { // galoubet provençal
    const c = Sfx.ctx, g = c.createGain(); g.connect(out); env(g, t, 0.02, v * 0.2, 0.75, d, 0.05);
    const o = mkOsc('triangle', f, t, t + d + 0.1, g); vibrato(o, t, t + d + 0.1, 5.5, f * 0.01);
    Sfx.noise(Math.min(0.08, d), v * 0.02, f * 2, t - Sfx.ctx.currentTime, 2, 0, out);
  },
  pluck(t, f, d, v, out) { // corde pincée (mandoline / guitare)
    const c = Sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.3); lp.Q.value = 2;
    lp.connect(g); g.connect(out); env(g, t, 0.002, v * 0.3, 0.05, Math.min(d, 0.6) + 0.15, 0.1);
    mkOsc('sawtooth', f, t, t + d + 0.4, lp); mkOsc('triangle', f * 2, t, t + d + 0.4, lp, 4);
  },
  oud(t, f, d, v, out) { // oud : pincé sombre, légère attaque glissée
    const c = Sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.35); lp.Q.value = 4;
    lp.connect(g); g.connect(out); env(g, t, 0.003, v * 0.34, 0.08, Math.min(d, 0.7) + 0.2, 0.12);
    const o = mkOsc('sawtooth', f * 1.03, t, t + d + 0.5, lp); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  },
  ney(t, f, d, v, out) { // flûte ney : souffle + vibrato lent
    const c = Sfx.ctx, g = c.createGain(); g.connect(out); env(g, t, 0.09, v * 0.2, 0.85, d, 0.12);
    const o = mkOsc('sine', f, t, t + d + 0.2, g); vibrato(o, t, t + d + 0.2, 4.5, f * 0.014);
    Sfx.noise(d + 0.1, v * 0.04, f * 1.5, t - Sfx.ctx.currentTime, 3, 0, out);
  },
  bell(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(); g.connect(out); env(g, t, 0.003, v * 0.22, 0.05, d + 0.6, 0.3); mkOsc('sine', f, t, t + d + 1, g); const g2 = c.createGain(); g2.gain.value = 0.3; g2.connect(g); mkOsc('sine', f * 2.76, t, t + d + 1, g2); },
  epiano(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(); g.connect(out); env(g, t, 0.006, v * 0.2, 0.25, d, 0.25); mkOsc('sine', f, t, t + d + 0.4, g); const g2 = c.createGain(); g2.gain.value = 0.25; g2.connect(g); mkOsc('sine', f * 2, t, t + d + 0.4, g2, 6); },
  saw(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(g); g.connect(out); env(g, t, 0.006, v * 0.18, 0.6, d, 0.06); mkOsc('sawtooth', f, t, t + d + 0.1, lp, -7); mkOsc('sawtooth', f, t, t + d + 0.1, lp, 7); },
  acid(t, f, d, v, out) { // basse acide (Venum)
    const c = Sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 9; lp.frequency.setValueAtTime(2200, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.18);
    lp.connect(g); g.connect(out); env(g, t, 0.004, v * 0.32, 0.5, d, 0.04); mkOsc('sawtooth', f, t, t + d + 0.1, lp);
  },
  supersaw(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800; lp.connect(g); g.connect(out); env(g, t, 0.04, v * 0.07, 0.8, d, 0.2); [-14, -5, 5, 14].forEach(dt => mkOsc('sawtooth', f, t, t + d + 0.3, lp, dt)); },
  pad(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.connect(g); g.connect(out); env(g, t, 0.25, v * 0.1, 0.9, d, 0.4); mkOsc('sawtooth', f, t, t + d + 0.5, lp, -9); mkOsc('triangle', f, t, t + d + 0.5, lp, 9); },
  brass(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1800, t + 0.08); lp.frequency.linearRampToValueAtTime(900, t + d); lp.connect(g); g.connect(out); env(g, t, 0.03, v * 0.25, 0.7, d, 0.08); const o = mkOsc('sawtooth', f, t, t + d + 0.1, lp); vibrato(o, t, t + d, 5, f * 0.008); },
  dark(t, f, d, v, out) { const c = Sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(350, t + d); lp.Q.value = 3; lp.connect(g); g.connect(out); env(g, t, 0.02, v * 0.24, 0.6, d, 0.1); mkOsc('sawtooth', f, t, t + d + 0.2, lp, -12); mkOsc('square', f / 2, t, t + d + 0.2, lp, 10); },
};

// ---------- Percussions (t, volume, sortie) ----------
function noiseHit(t, v, out, freq, q, dur, type = 'bandpass') {
  const c = Sfx.ctx, s = c.createBufferSource(); s.buffer = Sfx.noiseBuf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function pitchHit(t, v, out, type, f1, f2, dur) {
  const c = Sfx.ctx, g = c.createGain(); g.connect(out);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const o = mkOsc(type, f1, t, t + dur + 0.02, g); o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
}
const Drums = {
  kick(t, v, o) { pitchHit(t, v * 0.9, o, 'sine', 150, 42, 0.28); },
  kick808(t, v, o) { pitchHit(t, v, o, 'sine', 120, 38, 0.75); },
  snare(t, v, o) { noiseHit(t, v * 0.45, o, 1800, 0.8, 0.18); pitchHit(t, v * 0.3, o, 'triangle', 240, 160, 0.09); },
  clap(t, v, o) { [0, 0.012, 0.024].forEach(d => noiseHit(t + d, v * 0.35, o, 1400, 1.5, 0.1)); },
  hat(t, v, o) { noiseHit(t, v * 0.16, o, 8500, 1, 0.045, 'highpass'); },
  ohat(t, v, o) { noiseHit(t, v * 0.14, o, 7500, 1, 0.22, 'highpass'); },
  crash(t, v, o) { noiseHit(t, v * 0.22, o, 5500, 0.6, 1.3, 'highpass'); },
  rim(t, v, o) { pitchHit(t, v * 0.3, o, 'square', 1700, 1500, 0.03); },
  hammer(t, v, o) { // coup de marteau sur du métal (chantier)
    noiseHit(t, v * 0.32, o, 3200, 12, 0.12); pitchHit(t, v * 0.18, o, 'square', 1900, 1750, 0.06); pitchHit(t, v * 0.3, o, 'triangle', 260, 180, 0.08);
  },
  tamb(t, v, o) { noiseHit(t, v * 0.16, o, 9000, 3, 0.12); noiseHit(t + 0.02, v * 0.08, o, 7000, 3, 0.1); },
  tambourin(t, v, o) { pitchHit(t, v * 0.7, o, 'sine', 130, 80, 0.22); noiseHit(t, v * 0.18, o, 900, 1, 0.12); }, // tambour provençal
  doum(t, v, o) { pitchHit(t, v * 0.85, o, 'sine', 110, 70, 0.35); },
  tek(t, v, o) { noiseHit(t, v * 0.3, o, 4200, 4, 0.05); pitchHit(t, v * 0.18, o, 'triangle', 900, 700, 0.04); },
  metal(t, v, o) { noiseHit(t, v * 0.35, o, 1300, 18, 0.35); pitchHit(t, v * 0.16, o, 'square', 311, 300, 0.25); pitchHit(t, v * 0.12, o, 'square', 467, 450, 0.2); }, // tôle frappée
  // rap : caisse claire + clap superposés, roulement de charleston, scratch de vinyle, craquements
  rapSnare(t, v, o) { noiseHit(t, v * 0.5, o, 1900, 0.7, 0.2); [0, 0.011, 0.022].forEach(d => noiseHit(t + d, v * 0.3, o, 1300, 1.4, 0.12)); pitchHit(t, v * 0.3, o, 'triangle', 220, 150, 0.08); },
  hatRoll(t, v, o) { const n = 3; for (let i = 0; i < n; i++) noiseHit(t + i * 0.043, v * (0.1 + i * 0.03), o, 9000, 1, 0.03, 'highpass'); },
  scratch(t, v, o) { // aller-retour de disque : bruit filtré dont la fréquence suit la main
    const c = Sfx.ctx, s = c.createBufferSource(); s.buffer = Sfx.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    const seg = [[0, 600, 2600], [0.07, 2600, 500], [0.13, 500, 3000], [0.19, 3000, 700]];
    seg.forEach(([d, a, b]) => { f.frequency.setValueAtTime(a, t + d); f.frequency.exponentialRampToValueAtTime(b, t + d + 0.06); g.gain.setValueAtTime(v * 0.5, t + d); g.gain.exponentialRampToValueAtTime(v * 0.08, t + d + 0.058); });
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.27);
    s.connect(f); f.connect(g); g.connect(o); s.start(t, Math.random() * 0.5); s.stop(t + 0.3);
    const ov = c.createOscillator(), og = c.createGain(); ov.type = 'sawtooth'; og.gain.value = v * 0.05; og.connect(o); ov.connect(og);
    seg.forEach(([d, a, b]) => { ov.frequency.setValueAtTime(a * 0.25, t + d); ov.frequency.exponentialRampToValueAtTime(b * 0.25, t + d + 0.06); });
    ov.start(t); ov.stop(t + 0.26);
  },
  crackle(t, v, o) { if (Math.random() < 0.6) noiseHit(t + Math.random() * 0.1, v * 0.05, o, 3000 + Math.random() * 3000, 3, 0.006); },
  // montée de bruit qui s'ouvre (annonce le thème du boss)
  riser(t, v, o, dur = 1.6) {
    const c = Sfx.ctx, s = c.createBufferSource(); s.buffer = Sfx.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.35, t + dur * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    s.connect(f); f.connect(g); g.connect(o); s.start(t); s.stop(t + dur + 0.1);
  },
  chipKick(t, v, o) { pitchHit(t, v * 0.5, o, 'square', 200, 50, 0.1); },
  chipSnare(t, v, o) { noiseHit(t, v * 0.4, o, 3000, 0.4, 0.1); },
  chipHat(t, v, o) { noiseHit(t, v * 0.12, o, 10000, 1, 0.03, 'highpass'); },
};

// ============================================================
//  PARTITIONS
//  root : note MIDI de la tonique · spb : pas (double-croches) par mesure
//  chords : une par mesure « décalage:qualité » · bass : spb jetons par mesure (R, 3, 5, 7, 8, '.' silence, '-' tenue)
//  lead : mélodie écrite, mesures séparées par « | », jetons = croches (demi-tons depuis la tonique)
//  drums : motifs sur spb caractères ('x' fort, 'o' doux)
// ============================================================
// familles de percussions (pour l'arrangement)
const KICKS = ['kick', 'kick808', 'chipKick', 'doum', 'tambourin'];
const SNARES = ['snare', 'rapSnare', 'chipSnare', 'clap', 'tek', 'metal'];
const QUAL = { maj: [0, 4, 7], min: [0, 3, 7], dom: [0, 4, 7, 10], min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], pow: [0, 7, 12], sus: [0, 5, 7] };
const SONGS = {
  // Menu : thème des laïquistes, chiptune funky
  menu: {
    bpm: 118, root: 43, spb: 16,
    chords: ['0:maj', '9:min', '5:maj', '7:maj', '0:maj', '9:min', '5:maj', '7:dom'],
    bass: 'R . . R . . 5 . R . . R . 8 . .',
    lead: '12 . 11 12 14 . 16 . | 16 . 14 . 12 . 9 . | 17 . 16 . 12 . 9 . | 14 - 11 - 7 - . . | 19 . 16 . 12 . 16 19 | 21 . 19 . 16 . 14 . | 17 16 14 12 14 . 16 . | 14 - - - 11 . 7 .',
    drums: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    stab: { pat: '..x...x...x...x.', len: 1, inst: 'pulse', oct: 12 },
    inst: { lead: 'square', bass: 'tri', arp: 'pulse' }, leadOct: 24, bassOct: 0,
  },
  // Christian : ambiance de chantier, sifflotée, avec coups de marteau
  christian: {
    bpm: 112, root: 48, spb: 16,
    chords: ['0:maj', '5:maj', '7:maj', '0:maj', '9:min', '5:maj', '7:maj', '7:dom'],
    bass: 'R . . . 5 . . . R . . . 5 . 3 .',
    lead: '7 . 4 . 7 9 7 4 | 5 . 9 . 12 - 9 . | 7 . 11 . 14 12 11 7 | 12 - - . 7 . . . | 9 . 12 . 16 - 12 9 | 5 . 9 . 12 . 9 5 | 7 9 11 12 14 - 12 11 | 7 - - - 5 . 2 .',
    drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hammer: '..x...x...x.x...' },
    stab: { pat: '....x.......x...', len: 2, inst: 'pulse', oct: 12 },
    inst: { lead: 'whistle', bass: 'tri', arp: 'pulse' }, leadOct: 24, bassOct: 0,
  },
  // Guilhem : vrai beat de rap (boom bap) ~88 BPM — 808 qui glisse, caisse claire + clap, roulements de charleston,
  // scratch toutes les 4 mesures, piano sombre en boucle, cuivres « à la West Coast », craquements de vinyle
  guilhem: {
    bpm: 88, root: 45, spb: 16, swing: 0.2,
    chords: ['0:min', '0:min', '8:maj', '8:maj', '5:min', '5:min', '7:maj', '7:dom'],
    bass: 'R - - - - - - R - - R - - - 3 .',
    lead: '12 . . 12 15 . 12 . | 10 . . . 8 . . . | 12 . . 12 15 . 12 . | 17 . . 15 . . 12 . | 12 . . 12 15 . 12 . | 10 . . . 8 . . . | 11 . . 11 14 . 11 . | 14 . 12 . 11 . 8 .',
    drums: {
      kick808: 'x......x.x....x.', rapSnare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatRoll: '..........x.....',
      ohat: '..............x.', crackle: 'xxxxxxxxxxxxxxxx',
      scratch: '.'.repeat(56) + 'x...x...',
    },
    stab: { pat: 'x.........x.....', len: 3, inst: 'brass', oct: 12 },
    inst: { lead: 'epiano', bass: 'sub', arp: 'epiano' }, leadOct: 12, bassOct: -12,
  },
  // Fateh : Allauch, cordes pincées provençales en 3/4, galoubet et tambourin
  fateh: {
    bpm: 138, root: 50, spb: 12,
    chords: ['0:maj', '5:maj', '7:maj', '0:maj', '0:maj', '9:min', '5:maj', '7:maj'],
    bass: 'R . . . 5 . . . 5 . . .',
    lead: '7 - 4 7 12 - | 7 9 11 12 11 9 | 9 - 7 4 2 - | 0 - - 4 7 - | 7 - 4 7 12 - | 14 12 11 9 11 12 | 11 9 7 5 4 2 | 4 - - 2 - -',
    drums: { tambourin: 'x.....x.x...', tamb: 'x.x.x.x.x.x.' },
    stab: { pat: '....x...x...', len: 3, inst: 'pluck', oct: 12 },
    inst: { lead: 'fife', bass: 'pluck', arp: 'pluck' }, leadOct: 24, bassOct: -12,
  },
  // Faouzi : chiptune pur
  faouzi: {
    bpm: 150, root: 52, spb: 16,
    chords: ['0:min', '8:maj', '10:maj', '7:maj', '0:min', '8:maj', '3:maj', '10:maj'],
    bass: 'R . 8 . R . 8 . R . 8 . R . 8 .',
    lead: '0 . 7 . 12 . 10 7 | 8 . 12 . 15 . 12 8 | 10 . 14 . 17 . 14 10 | 11 . 7 . 3 . 7 . | 12 . 12 14 15 . 14 12 | 15 . 12 . 8 . 12 . | 15 . 19 . 22 . 19 15 | 14 . 10 . 14 . 11 .',
    drums: { chipKick: 'x.....x.x.......', chipSnare: '....x.......x...', chipHat: 'x.x.x.x.x.x.x.x.' },
    arpAlways: true,
    inst: { lead: 'square', bass: 'tri', arp: 'pulse' }, leadOct: 24, bassOct: -12,
  },
  // Venum : électro, synthés, kick à chaque temps
  venum: {
    bpm: 124, root: 41, spb: 16,
    chords: ['0:min', '8:maj', '3:maj', '10:maj', '0:min', '8:maj', '3:maj', '10:maj'],
    bass: '. . R . . . R . . . R . . . R 8',
    lead: '12 . 15 . 19 . 15 12 | 20 . 15 . 12 . 15 17 | 15 . 19 . 22 . 19 15 | 22 - 19 - 17 - 15 . | 24 . 22 . 19 . 15 . | 20 . 17 . 15 . 12 . | 15 . 15 19 22 . 24 22 | 22 - - - 19 - 17 .',
    drums: { kick: 'x...x...x...x...', clap: '....x.......x...', ohat: '..x...x...x...x.', hat: 'xx.xxx.xxx.xxx.x' },
    pad: { inst: 'supersaw', oct: 12 },
    inst: { lead: 'saw', bass: 'acid', arp: 'saw' }, leadOct: 24, bassOct: 0,
  },
  // Senoussi : gamme orientale (hijaz) avec bourdon, darbouka et oud
  senoussi: {
    bpm: 96, root: 38, spb: 16,
    chords: ['0:maj', '0:maj', '5:min', '0:maj', '0:maj', '10:min', '1:maj', '0:maj'],
    bass: 'R . . . . . . . R . . . . . . .',
    lead: '0 1 4 1 0 . . . | 4 5 7 5 4 1 0 . | 5 . 8 7 5 4 5 . | 4 - 1 - 0 - - . | 7 8 10 8 7 5 4 . | 10 - 12 10 8 7 8 . | 13 - 12 10 8 . 7 . | 4 5 4 1 0 - - .',
    drums: { doum: 'x.......x.......', tek: '..x...x.....x...' },
    stab: { pat: 'x.....x...x.....', len: 2, inst: 'oud', oct: 12 },
    drone: [0, 7],
    inst: { lead: 'ney', bass: 'oud', arp: 'oud' }, leadOct: 24, bassOct: 0,
  },
  // The Purf : drone sombre industriel
  purf: {
    bpm: 84, root: 37, spb: 16,
    chords: ['0:min', '0:min', '1:maj', '0:min', '0:min', '8:maj', '10:min', '1:maj'],
    bass: 'R . . R . . R . R . . . R . . .',
    lead: '0 - - - 1 - 0 . | 3 - 1 - 0 - - . | 1 - - - 5 - 3 . | 0 - - - - - - . | 7 - 8 - 7 - 3 . | 8 - 7 - 5 - 3 . | 3 - 5 - 1 - - . | 0 - - - -1 - 0 .',
    drums: { kick: 'x.....x...x.....', metal: '....x.......x...', rim: 'x...x...x...x...' },
    drone: [0, 1, 7],
    inst: { lead: 'dark', bass: 'dark', arp: 'pulse' }, leadOct: 24, bassOct: 0,
  },
};

// Thème de boss : même timbre que le monde, plus rapide, mineur et martelé
function bossSong(worldId) {
  const w = SONGS[worldId] || SONGS.christian;
  if (worldId === 'guilhem') return { // boss de Guilhem : rap plus dur, charlestons trap, 808 partout
    bpm: 96, root: w.root, spb: 16, swing: 0.08, boss: true,
    chords: ['0:min', '0:min', '1:maj', '1:maj', '0:min', '0:min', '8:maj', '7:maj'],
    bass: 'R - - R - - R - - - R - 8 - R .',
    lead: '12 . 12 . 13 . 12 . | 15 . 13 . 12 . . . | 12 . 12 . 13 . 12 . | 8 . 7 . 8 . . . | 12 . 12 . 13 . 12 . | 15 . 13 . 12 . 15 . | 20 . 19 . 17 . 15 . | 13 - - - 12 . . .',
    drums: { kick808: 'x..x..x...x..x..', rapSnare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', hatRoll: '......x.......x.', crackle: 'xxxxxxxxxxxxxxxx', scratch: '.'.repeat(24) + 'x.......' },
    stab: { pat: 'x.....x.........', len: 2, inst: 'brass', oct: 12 },
    inst: { lead: 'bell', bass: 'sub', arp: 'epiano' }, leadOct: 24, bassOct: -12, minIntensity: 1,
  };
  const oriental = worldId === 'senoussi' || worldId === 'purf';
  return {
    bpm: clamp(Math.round(w.bpm * 1.14), 104, 165), root: w.root, spb: 16, boss: true,
    chords: oriental ? ['0:maj', '0:maj', '1:maj', '0:maj', '5:min', '5:min', '1:maj', '0:maj']
                     : ['0:min', '0:min', '8:maj', '7:maj', '0:min', '0:min', '5:min', '7:maj'],
    bass: 'R . R . R . R . R . R . 8 . R 8',
    lead: oriental
      ? '0 . 0 1 . 0 4 . | 5 . 4 . 1 . 0 . | 8 . 7 . 8 10 8 7 | 7 - - - 8 - 7 . | 12 . 12 13 . 12 16 . | 17 . 16 . 13 . 12 . | 8 . 7 . 5 . 4 1 | 0 - - - 1 - 0 .'
      : '0 . 0 3 . 0 7 . | 6 . 7 . 3 . 0 . | 8 . 7 . 8 10 8 7 | 7 - - - 11 - 7 . | 12 . 12 15 . 12 19 . | 18 . 19 . 15 . 12 . | 17 . 15 . 12 . 15 17 | 19 - - - 18 - 19 .',
    drums: { kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', [Object.keys(w.drums).find(k => ['hammer', 'tambourin', 'tek', 'metal', 'tamb'].includes(k)) || 'clap']: '..x...x...x...x.' },
    stab: { pat: 'x.......x.......', len: 7, inst: 'pad', oct: 12 },
    drone: w.drone,
    inst: { lead: w.inst.lead, bass: w.inst.bass === 'sub' ? 'acid' : w.inst.bass, arp: w.inst.arp }, leadOct: w.leadOct, bassOct: w.bassOct,
    minIntensity: 1,
  };
}

// Prépare une partition (découpe des chaînes une fois pour toutes)
function compileSong(s) {
  if (s._c) return s._c;
  const bars = s.chords.length, spb = s.spb || 16;
  const tok = str => str.trim().split(/\s+/);
  const lead = s.lead.split('|').map(tok);
  const bass = tok(s.bass);
  const chords = s.chords.map(c => { const [o, q] = c.split(':'); return { root: +o, tones: QUAL[q] || QUAL.maj, q }; });
  s._c = { bars, spb, lead, bass, chords, leadDiv: spb / lead[0].length };
  return s._c;
}
// longueur d'une note : 1 + nombre de « - » qui suivent
function holdLen(arr, i) { let n = 1; while (i + n < arr.length && arr[i + n] === '-') n++; return n; }

// ============================================================
//  SÉQUENCEUR — planification en avance sur l'horloge audio (pas de dérive)
// ============================================================
const Music = {
  track: null, current: null, intensity: 0, timer: null,
  boot() {
    if (this.timer) return;
    // le minuteur ne fait que « pomper » : toutes les notes sont calées sur ctx.currentTime
    this.timer = setInterval(() => this.pump(), 25);
  },
  play(song, name) {
    const c = Sfx.ctx, t = c.currentTime;
    // Si un morceau tourne, le suivant démarre pile sur la prochaine mesure (ou le prochain temps si la mesure est loin)
    let start = t + 0.08;
    const old = this.track;
    if (old && !old.dead) {
      const spb = old.c.spb, sd = 60 / old.song.bpm / 4, beat = spb === 12 ? 3 : 4;
      const toBar = (spb - old.step % spb) % spb, toBeat = (beat - old.step % beat) % beat;
      const left = (toBar * sd + old.next - t) < 2.2 ? toBar : toBeat;
      start = Math.max(t + 0.05, old.next + left * sd);
      old.endAt = start; // l'ancien s'arrête de jouer des notes à cet instant…
      this.track = null; this.current = null;
      old.g.gain.setValueAtTime(1, start); old.g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35); // …et ses dernières notes s'éteignent
      old.dead = true;
      setTimeout(() => { old.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { old.g.disconnect(); } catch (e) {} }, (start - t) * 1000 + 800);
      this.zombie = old; // continue d'être « pompé » jusqu'à l'enchaînement
    } else this.stop(0.6);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    if (old) g.gain.setValueAtTime(1, start); else g.gain.exponentialRampToValueAtTime(1, t + 0.4);
    g.connect(Sfx.duck);
    const tr = { song, c: compileSong(song), g, step: 0, next: start, nodes: [] };
    if (song.drone) { // bourdon continu (scies désaccordées + filtre qui respire)
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 2; lp.connect(g);
      const dg = c.createGain(); dg.gain.value = 0.05; dg.connect(lp);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(start);
      tr.nodes.push(lfo);
      song.drone.forEach((n, i) => { [-6, 6].forEach(dt => tr.nodes.push(mkOsc(i === 0 ? 'sawtooth' : 'triangle', midiHz(song.root - 12 + n), start, start + 3600, dg, dt + i * 2))); });
    }
    this.track = tr; this.current = name;
  },
  stop(fade = 0.5) {
    this.zombie = null;
    const tr = this.track; if (!tr) return;
    this.track = null; this.current = null;
    const t = Sfx.ctx.currentTime;
    tr.g.gain.cancelScheduledValues(t); tr.g.gain.setValueAtTime(Math.max(0.0001, tr.g.gain.value), t);
    tr.g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, fade));
    tr.dead = true;
    setTimeout(() => { tr.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { tr.g.disconnect(); } catch (e) {} }, fade * 1000 + 300);
  },
  setIntensity(n) { this.intensity = n; },
  pump() {
    const c = Sfx.ctx; if (!c || c.state !== 'running') return;
    Ambience.pump();
    const now = c.currentTime, ahead = now + 0.14;
    const z = this.zombie; // morceau précédent : finit sa mesure avant l'enchaînement
    if (z) {
      const sd = 60 / z.song.bpm / 4;
      while (z.next < ahead && z.next < z.endAt - 0.001) { this.scheduleStep(z, z.next, sd); z.next += sd; z.step++; }
      if (z.next >= z.endAt - 0.001 || now > z.endAt) this.zombie = null;
    }
    const tr = this.track; if (!tr) return;
    if (tr.next < now - 0.08) tr.next = now + 0.03; // retard (onglet en arrière-plan) : on saute au lieu de tout jouer d'un coup
    const sd = 60 / tr.song.bpm / 4;
    while (tr.next < ahead) { this.scheduleStep(tr, tr.next, sd); tr.next += sd; tr.step++; }
  },
  scheduleStep(tr, t, sd) {
    const s = tr.song, cs = tr.c, spb = cs.spb;
    const step = tr.step % (spb * cs.bars), bar = Math.floor(step / spb), si = step % spb;
    const ch = cs.chords[bar], out = tr.g;
    const lvl = Math.max(this.intensity, s.minIntensity || 0);
    if (si % 2 === 1 && s.swing) t += s.swing * sd; // swing des double-croches impaires
    // ---- ARRANGEMENT : la boucle de 8 mesures ne se répète plus à l'identique ----
    //  passage 0 : intro (2 mesures batterie + basse ; boss : 1 mesure de montée)
    //  puis en cycle : 1 = complet + contre-chant · 2 = break (4 mesures allégées, puis ça repart) · 3 = tout un ton plus haut
    const pass = Math.floor(tr.step / (spb * cs.bars));
    const P = pass === 0 ? 0 : 1 + ((pass - 1) % 3);
    const intro = pass === 0 && bar < (s.boss ? 1 : 2);
    const brk = P === 2 && bar < 4;
    const R = s.root + (P === 3 ? 2 : 0);
    const beat = spb === 12 ? 3 : 4;
    if (intro && s.boss && step === 0) Drums.riser(t, 0.9, out, spb * sd);
    // percussions
    for (const k in s.drums) {
      const p = s.drums[k], ch2 = p.length > spb ? p[step % p.length] : p[si % p.length]; // motif plus long qu'une mesure : suit toute la boucle
      if (ch2 !== 'x' && ch2 !== 'o') continue;
      const isKick = KICKS.includes(k);
      if (intro && s.boss && !(isKick && si % beat === 0)) continue;   // intro du boss : juste les temps
      if (brk && !isKick && k !== 'crackle') continue;                 // break : on garde la grosse caisse
      Drums[k](t, (ch2 === 'x' ? 0.9 : 0.5) * (brk ? 0.6 : 1), out);
    }
    // roulement de caisse claire : fin de chaque 4e mesure, et fin du break (qui monte en puissance)
    const sn = Drums[Object.keys(s.drums).find(k => SNARES.includes(k)) || 'snare'];
    if (!intro && bar % 4 === 3 && si >= spb - (brk ? spb / 2 : beat)) sn(t, 0.35 + 0.5 * (si / spb), out);
    if (!brk && !intro) {
      if (lvl >= 1 && s.drums.hat == null && s.drums.chipHat == null && si % 2 === 1) Drums.hat(t, 0.35, out);
      if (lvl >= 1 && si % 2 === 1 && (s.drums.hat || s.drums.chipHat)) (s.drums.chipHat ? Drums.chipHat : Drums.hat)(t, 0.3, out);
    }
    if (si === 0 && (lvl >= 3 || (s.boss && bar % 4 === 0) || (pass > 0 && bar === 0) || (P === 2 && bar === 4))) Drums.crash(t, 0.7, out);
    if (intro && s.boss) return; // intro du boss : rien d'autre
    // basse (absente du break)
    const bt = brk ? null : cs.bass[si];
    if (bt && bt !== '.' && bt !== '-') {
      const iv = bt === 'R' ? 0 : bt === '3' ? ch.tones[1] : bt === '5' ? 7 : bt === '7' ? (ch.tones[3] || 10) : bt === '8' ? 12 : 0;
      const m = R + ch.root + iv + (s.bassOct || 0);
      Inst[s.inst.bass](t, midiHz(m), holdLen(cs.bass, si) * sd * 0.92, 0.9, out);
      if (lvl >= 3) Inst[s.inst.bass](t, midiHz(m + 12), sd * 0.8, 0.35, out);
    }
    // accords : nappe sur toute la mesure, ou « stabs » rythmés
    if (intro) return; // intro : batterie + basse seulement
    if (s.pad && si === 0) ch.tones.forEach(iv => Inst[s.pad.inst](t, midiHz(R + ch.root + iv + s.pad.oct), spb * sd, 0.8, out));
    if (s.stab && s.stab.pat[si] === 'x') ch.tones.slice(0, 3).forEach(iv => Inst[s.stab.inst](t, midiHz(R + ch.root + iv + s.stab.oct), s.stab.len * sd, 0.55, out));
    // mélodie écrite (pas pendant l'intro ; une octave plus bas, plus douce, pendant le break)
    if (si % cs.leadDiv === 0 && !intro) {
      const li = si / cs.leadDiv, lb = cs.lead[bar], tk = lb && lb[li];
      if (tk && tk !== '.' && tk !== '-') {
        const m = R + (+tk) + (s.leadOct || 24) - (brk ? 12 : 0), d = holdLen(lb, li) * cs.leadDiv * sd * 0.9;
        Inst[s.inst.lead](t, midiHz(m), d, brk ? 0.65 : 0.9, out);
        if (lvl >= 3) Inst[s.inst.lead](t, midiHz(m + 12), d, 0.3, out);
      }
    }
    // arpèges (intensité 2+, ou toujours en chiptune)
    if (!intro && !brk && (lvl >= 2 || s.arpAlways) && si % (s.arpAlways && lvl < 2 ? 2 : 1) === 0) {
      const tones = ch.tones, iv = tones[(si >> (s.arpAlways && lvl < 2 ? 1 : 0)) % tones.length];
      Inst[s.inst.arp](t, midiHz(R + ch.root + iv + 24), sd * 0.8, lvl >= 2 ? 0.45 : 0.3, out);
    }
    // contre-chant (passage 1) : arpège lent et discret sur les temps
    else if (P === 1 && lvl < 2 && !s.arpAlways && si % beat === 0) {
      const tones = ch.tones, iv = tones[(si / beat + bar) % tones.length];
      Inst[s.inst.arp](t, midiHz(R + ch.root + iv + 24), sd * beat * 0.7, 0.22, out);
    }
  },
};

// ============================================================
//  AMBIANCES par monde : un fond continu + des évènements au hasard
// ============================================================
const Ambience = {
  world: null, nodes: [], nextEvt: 0, nextEvt2: 0,
  // fond de bruit filtré en boucle, avec éventuellement un LFO sur la fréquence (vent) ou le volume (rafales)
  bed(c, t, type, freq, q, vol, out, fLfo, gLfo) {
    const s = c.createBufferSource(); s.buffer = Sfx.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); this.nodes.push(s);
    if (fLfo) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = fLfo[0]; lg.gain.value = fLfo[1]; l.connect(lg); lg.connect(f.frequency); l.start(t); this.nodes.push(l); }
    if (gLfo) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = gLfo[0]; lg.gain.value = vol * gLfo[1]; l.connect(lg); lg.connect(g.gain); l.start(t); this.nodes.push(l); }
    return { f, g };
  },
  start(worldId) {
    this.stop();
    if (!Sfx.ctx) return;
    const c = Sfx.ctx, t = c.currentTime;
    this.world = worldId; this.nextEvt = t + 0.8; this.nextEvt2 = t + 2;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 1.5); g.connect(Sfx.ambBus);
    this.gain = g;
    switch (worldId) {
      case 'christian': // brise marine + rumeur du chantier
        this.bed(c, t, 'bandpass', 520, 0.6, 0.16, g, [0.11, 260], [0.07, 0.6]);
        this.bed(c, t, 'lowpass', 140, 0.7, 0.10, g);
        break;
      case 'guilhem': this.bed(c, t, 'lowpass', 220, 0.7, 0.13, g); break; // rumeur de la ville
      case 'fateh': // cigales en continu (stridulation qui enfle et retombe) + mistral léger
        this.cicadaBed(c, t, g, 4700, 0.10, 0.12, -0.5);
        this.cicadaBed(c, t, g, 5600, 0.08, 0.17, 0.6);
        this.bed(c, t, 'bandpass', 420, 0.6, 0.07, g, [0.09, 180], [0.05, 0.7]);
        break;
      case 'venum': this.bed(c, t, 'lowpass', 120, 0.7, 0.08, g); break;
      case 'senoussi': // vent du désert, fort, en rafales sifflantes
        this.bed(c, t, 'bandpass', 650, 0.8, 0.22, g, [0.08, 420], [0.06, 0.8]);
        this.bed(c, t, 'bandpass', 1800, 5, 0.05, g, [0.13, 700], [0.09, 0.9]);
        break;
      case 'purf': this.bed(c, t, 'lowpass', 260, 0.7, 0.12, g, null, [0.05, 0.4]); break;
    }
    if (worldId === 'venum' || worldId === 'purf') { // bourdonnement électrique / industriel
      const hg = c.createGain(); hg.gain.value = 0.035; hg.connect(g);
      [50, 100, 150].forEach((f, i) => this.nodes.push(mkOsc(i ? 'sine' : 'sawtooth', worldId === 'purf' ? f * 0.8 : f * 1.2, t, t + 3600, hg)));
    }
  },
  // Cigale : bruit aigu haché très vite (≈ 90 Hz), volume qui monte et descend lentement
  cicadaBed(c, t, out, freq, vol, swell, pan) {
    const s = c.createBufferSource(); s.buffer = Sfx.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 7;
    const am = c.createGain(); am.gain.value = 0.5;
    const chop = c.createOscillator(), cg = c.createGain(); chop.type = 'square'; chop.frequency.value = 85 + Math.random() * 20; cg.gain.value = 0.5; chop.connect(cg); cg.connect(am.gain);
    const sw = c.createGain(); sw.gain.value = vol * 0.6;
    const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = swell; lg.gain.value = vol * 0.45; l.connect(lg); lg.connect(sw.gain);
    s.connect(f); f.connect(am); am.connect(sw); sw.connect(Sfx.out(pan, out));
    [s, chop, l].forEach(n => { n.start(t, n === s ? Math.random() : undefined); this.nodes.push(n); });
  },
  stop() {
    this.world = null;
    if (!Sfx.ctx || !this.gain) return;
    const t = Sfx.ctx.currentTime, g = this.gain, nodes = this.nodes;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { g.disconnect(); } catch (e) {} }, 900);
    this.nodes = []; this.gain = null;
  },
  // ---------- évènements ponctuels ----------
  // Cri de goéland : « kiaaou » qui descend, puis « ka-ka-ka » plus courts
  gull(pan, delay, o) {
    const c = Sfx.ctx, t0 = c.currentTime + 0.03 + delay, out = Sfx.out(pan, o);
    const n = randi(2, 5), base = rand(0.9, 1.15);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (i === 0 ? 0.42 : 0.2), d = i === 0 ? 0.38 : 0.14, f1 = (i === 0 ? 1900 : 1600) * base, f2 = (i === 0 ? 1050 : 1250) * base;
      const osc = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f1 * 0.85, t); osc.frequency.linearRampToValueAtTime(f1, t + 0.04); osc.frequency.exponentialRampToValueAtTime(f2, t + d);
      bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 2.5;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 26; lg.gain.value = 40; l.connect(lg); lg.connect(osc.frequency);
      osc.connect(bp); bp.connect(g); g.connect(out); osc.start(t); osc.stop(t + d + 0.05); l.start(t); l.stop(t + d + 0.05);
    }
  },
  // aperçu du curseur Ambiance (écran Réglages)
  preview() { if (Sfx.ctx) this.gull(0, 0, Sfx.ambBus); },
  // Une cigale proche qui « démarre », chante 2-4 s puis s'arrête
  cicada(pan, o) {
    const c = Sfx.ctx, t = c.currentTime + 0.03, d = rand(2, 4), out = Sfx.out(pan, o);
    const s = c.createBufferSource(); s.buffer = Sfx.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rand(5000, 6500); f.Q.value = 9;
    const am = c.createGain(); am.gain.value = 0.5;
    const chop = c.createOscillator(), cg = c.createGain(); chop.type = 'square'; chop.frequency.value = rand(110, 160); cg.gain.value = 0.5; chop.connect(cg); cg.connect(am.gain);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.5); g.gain.setValueAtTime(0.32, t + d - 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(am); am.connect(g); g.connect(out);
    s.start(t, Math.random()); s.stop(t + d + 0.05); chop.start(t); chop.stop(t + d + 0.05);
  },
  // Rafale de vent qui siffle
  gust(pan, o, strong) {
    const c = Sfx.ctx, t = c.currentTime + 0.03, d = rand(1.5, 3);
    const s = c.createBufferSource(); s.buffer = Sfx.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = strong ? 4 : 3;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(strong ? 1500 : 1100, t + d * 0.5); f.frequency.exponentialRampToValueAtTime(350, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(strong ? 0.4 : 0.25, t + d * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(Sfx.out(pan, o)); s.start(t, Math.random()); s.stop(t + d + 0.05);
  },
  pump() {
    if (!this.world || Sfx.paused) return;
    const c = Sfx.ctx, now = c.currentTime;
    const o = this.gain, pan = rand(-0.9, 0.9), d = 0.03;
    const at = (type, f1, f2, dur, v, delay = 0, wob = 0) => Sfx.tone(type, f1, f2, dur, v, d + delay, Sfx.out(pan, o), wob);
    // 2e couche d'évènements : le vent (Christian, Senoussi, Fateh)
    if (now >= this.nextEvt2) {
      if (this.world === 'christian' || this.world === 'senoussi' || this.world === 'fateh') this.gust(rand(-0.8, 0.8), o, this.world === 'senoussi');
      this.nextEvt2 = now + (this.world === 'senoussi' ? rand(3, 6) : rand(6, 11));
    }
    if (now < this.nextEvt) return;
    switch (this.world) {
      case 'christian': // goélands
        this.gull(pan, 0, o); if (Math.random() < 0.35) this.gull(-pan * 0.7, rand(0.6, 1.2), o);
        this.nextEvt = now + rand(3, 6); break;
      case 'guilhem': // klaxon au loin ou ballon de basket
        if (Math.random() < 0.5) { at('square', 392, 392, 0.25, 0.06); at('square', 494, 494, 0.25, 0.05); }
        else for (let i = 0; i < 3; i++) at('sine', 160, 70, 0.08, 0.16, i * (0.4 - i * 0.08));
        this.nextEvt = now + rand(4, 9); break;
      case 'fateh': // une cigale proche, ou des oiseaux
        if (Math.random() < 0.6) this.cicada(pan, o);
        else for (let i = 0; i < randi(3, 6); i++) at('sine', rand(2400, 3400), rand(2600, 4200), 0.07, 0.07, i * 0.11);
        this.nextEvt = now + rand(2, 4.5); break;
      case 'faouzi': // petits bips rétro
        at('square', pick([988, 1319, 1568]), null, 0.06, 0.06); at('square', pick([1319, 1976]), null, 0.08, 0.05, 0.07);
        this.nextEvt = now + rand(3, 6); break;
      case 'venum': // drone qui passe
        at('sawtooth', 300, 600, 1.4, 0.045); at('sine', 1200, 1600, 0.12, 0.05, 0.2);
        this.nextEvt = now + rand(4, 8); break;
      case 'senoussi': // bêlement au loin
        at('sawtooth', 420, 380, 0.5, 0.06, 0, 35);
        this.nextEvt = now + rand(5, 10); break;
      case 'purf': // crépitement (compteur Geiger) et bulles toxiques
        for (let i = 0; i < randi(4, 12); i++) Sfx.noise(0.01, 0.22, 3500, d + rand(0, 0.8), 2, pan, o);
        if (Math.random() < 0.4) for (let i = 0; i < 3; i++) at('sine', rand(200, 320), rand(500, 700), 0.06, 0.08, 0.2 + i * 0.12);
        this.nextEvt = now + rand(0.8, 2.2); break;
      default: this.nextEvt = now + 5;
    }
  },
};

// ============================================================
//  VOIX DES BOSS — synthèse vocale du navigateur (fr-FR)
//  Hauteur et vitesse propres à chaque boss. Repli silencieux s'il n'y a pas de voix française.
// ============================================================
const Voice = {
  voice: null, lastT: 0, primed: false, cur: null, busyUntil: 0, watch: null, failed: {},
  PROFILES: {
    christian: { pitch: 0.85, rate: 1.08 }, guilhem: { pitch: 1.15, rate: 0.9 }, fateh: { pitch: 0.95, rate: 1.0 },
    faouzi: { pitch: 1.45, rate: 1.15 }, venum: { pitch: 0.7, rate: 1.02 }, senoussi: { pitch: 0.55, rate: 0.85 }, purf: { pitch: 0.4, rate: 0.8 },
  },
  supported() { return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'; },
  // Choix de la voix : française, et de préférence LOCALE. Les voix « Google » de Chrome passent par Internet
  // et finissent par échouer en silence au bout d'un moment (c'était la cause des voix qui se coupaient).
  pickVoice() {
    if (!this.supported()) return;
    const vs = (speechSynthesis.getVoices() || []).filter(v => !this.failed[v.name]);
    const fr = vs.filter(v => /^fr[-_]FR/i.test(v.lang)), fr2 = vs.filter(v => /^fr/i.test(v.lang));
    this.voice = fr.find(v => v.localService) || fr2.find(v => v.localService) || fr[0] || fr2[0] || this.voice || null;
  },
  init() {
    if (!this.supported()) return;
    const onChange = () => { this.pickVoice(); if (typeof UI !== 'undefined' && UI.refreshSettings) UI.refreshSettings(); };
    onChange();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', onChange);
    else speechSynthesis.onvoiceschanged = onChange;
  },
  // iPhone : la synthèse vocale doit d'abord être lancée par un geste de l'utilisateur
  // iOS/iPadOS n'accepte ce déblocage que dans un vrai geste (clic / fin de toucher), pas dans « pointerdown » :
  // on retente donc à chaque geste, jusqu'à ce que le moteur confirme qu'il a bien démarré.
  prime() {
    if (this.primed || !this.supported()) return;
    try {
      const u = new SpeechSynthesisUtterance('.'); u.volume = 0;
      const ok = () => { this.primed = true; };
      u.onstart = ok; u.onend = ok;
      speechSynthesis.speak(u);
    } catch (e) {}
  },
  available() { return !!this.voice; },
  unduck() { if (Sfx.ctx) Sfx.duck.gain.setTargetAtTime(Sfx.paused ? 0.55 : 1, Sfx.ctx.currentTime, 0.2); },
  // Remet la synthèse vocale à zéro si elle est bloquée (Chrome reste parfois « en train de parler » pour toujours)
  reset() {
    try { speechSynthesis.cancel(); } catch (e) {}
    this.cur = null; this.busyUntil = 0; this.unduck();
  },
  // prio : 2 = phrase importante (arrivée du boss, palier de vie, victoire) — coupe ce qui se dit ;
  //        1 = cri d'attaque — seulement si personne ne parle déjà (sinon : bulle seule)
  speak(text, kind, prio = 1) {
    const s = Settings.get();
    if (!s.voiceOn || Sfx.muted || Sfx.paused || s.voice <= 0) return;
    const now = performance.now();
    if (prio < 2 && (now < this.busyUntil || now - this.lastT < 1800)) return; // pas de mitraillage
    // 1) fichier audio généré (même voix sur tous les appareils, passe par le mixage du jeu)
    const buf = VoiceFiles.get(text, kind);
    if (buf && Sfx.ctx) { this.playFile(buf, now); return; }
    // 2) sinon : synthèse vocale du navigateur
    if (!this.supported()) return;
    if (!this.voice) this.pickVoice();
    if (!this.voice) return;
    // synthèse bloquée depuis longtemps (onend jamais reçu) : on la débloque
    if (speechSynthesis.speaking && now > this.busyUntil + 2500) this.reset();
    this.lastT = now;
    const p = this.PROFILES[kind] || { pitch: 1, rate: 1 };
    const u = new SpeechSynthesisUtterance(text);
    u.voice = this.voice; u.lang = this.voice.lang; u.pitch = p.pitch; u.rate = p.rate; u.volume = clamp(s.voice, 0, 1);
    const est = 600 + text.length * 75 / p.rate; // durée estimée de la phrase
    this.busyUntil = now + est;
    u.onstart = () => { if (Sfx.ctx) Sfx.duck.gain.setTargetAtTime(Sfx.paused ? 0.55 : 0.5, Sfx.ctx.currentTime, 0.05); };
    u.onend = () => { if (this.cur === u) { this.cur = null; this.busyUntil = 0; } this.unduck(); };
    u.onerror = ev => {
      if (this.cur === u) { this.cur = null; this.busyUntil = 0; }
      this.unduck();
      // une voix qui échoue (réseau…) est écartée : on bascule sur une autre voix française
      if (ev && /network|synthesis|unavailable|voice/i.test(ev.error || '') && this.voice) { this.failed[this.voice.name] = true; this.voice = null; this.pickVoice(); }
    };
    this.cur = u; // garder une référence : sinon Chrome peut « oublier » la phrase et ne plus rien dire
    const go = () => {
      try { if (speechSynthesis.paused) speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) { this.reset(); }
    };
    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(go, 60); } // Chrome perd la phrase si on parle juste après cancel()
      else go();
    } catch (e) { this.reset(); }
    // garde-fou : si rien ne se termine, on débloque et on remet la musique
    clearTimeout(this.watch);
    this.watch = setTimeout(() => { if (this.cur === u) this.reset(); }, est + 4000);
  },
  playFile(buf, now) {
    this.stop();
    const c = Sfx.ctx, src = c.createBufferSource(); src.buffer = buf; src.connect(Sfx.voiceBus);
    Sfx.duck.gain.setTargetAtTime(Sfx.paused ? 0.55 : 0.5, c.currentTime, 0.05); // la musique se pousse pendant qu'on parle
    src.onended = () => { if (this.src === src) { this.src = null; this.busyUntil = 0; this.unduck(); } };
    this.src = src; this.lastT = now; this.busyUntil = now + buf.duration * 1000;
    src.start();
  },
  stop() {
    try { if (this.supported()) { speechSynthesis.cancel(); } } catch (e) {}
    if (this.src) { try { this.src.stop(); } catch (e) {} this.src = null; this.unduck(); }
    this.cur = null; this.busyUntil = 0;
  },
};

Sfx.muted = !!Save.data.muted;
Voice.init();
// Onglet caché : on suspend l'audio (le séquenceur se recale tout seul au retour)
document.addEventListener('visibilitychange', () => {
  if (!Sfx.ctx) return;
  if (document.hidden) Sfx.ctx.suspend(); else { Sfx.ctx.resume(); Voice.primed = false; }
});
