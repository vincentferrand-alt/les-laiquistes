// ============================================================
//  CLOUD — sauvegarde de la progression dans Firestore
//   • connexion ANONYME automatique (Firebase Auth) : un document saves/{uid} par appareil
//   • bouton facultatif « Relier à Google » : retrouve la même progression sur un autre appareil
//     (fusion : union des déblocages, meilleur des records)
//   • la sauvegarde locale (localStorage) reste la référence si Firebase est indisponible
//  Configuration : js/config.js (window.FIREBASE_CONFIG). Règles et étapes : README.md
// ============================================================
const FIREBASE_VERSION = '10.12.2';
const HERO_IDS = ['christian', 'guilhem', 'fateh', 'faouzi', 'venum', 'senoussi', 'purf'];

const Cloud = {
  status: 'off',      // off (pas de config) | connecting | anon | google | error
  user: null, mods: null, db: null, auth: null,
  pushTimer: null, readyResolve: null,
  ready: null,        // promesse résolue quand l'utilisateur (anonyme ou Google) est connecté

  async init() {
    this.ready = new Promise(r => { this.readyResolve = r; });
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) { this.status = 'off'; this.readyResolve(false); return; }
    this.status = 'connecting'; this.refreshUI();
    try {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
      const [appM, authM, fsM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
      this.mods = { ...authM, ...fsM };
      const app = appM.initializeApp(cfg);
      this.db = fsM.getFirestore(app);
      this.auth = authM.getAuth(app);
      Scores.attach(fsM, this.db); // le classement utilise la même connexion
      // retour d'une liaison Google faite par redirection (téléphone, appli installée)
      authM.getRedirectResult(this.auth).catch(e => this.onLinkError(e));
      authM.onAuthStateChanged(this.auth, async user => {
        if (!user) { // première visite (ou déconnexion) : compte anonyme automatique
          try { await authM.signInAnonymously(this.auth); } catch (e) { this.fail(e); }
          return;
        }
        this.user = user;
        this.status = user.isAnonymous ? 'anon' : 'google';
        await this.pull();
        this.readyResolve(true);
        this.refreshUI();
      });
    } catch (e) { this.fail(e); }
  },
  fail(e) { console.warn('Firebase indisponible, sauvegarde locale uniquement', e); this.status = 'error'; this.readyResolve && this.readyResolve(false); this.refreshUI(); },
  online() { return (this.status === 'anon' || this.status === 'google') && !!this.user; },

  // ---------- conversion locale <-> document Firestore ----------
  toDoc() {
    const d = Save.data, M = this.mods;
    const ints = (src, f = v => v) => { const o = {}; HERO_IDS.forEach(k => { if (src && src[k] != null) o[k] = Math.max(0, Math.round(f(src[k]) || 0)); }); return o; };
    return {
      uid: this.user.uid, v: 1,
      name: String(d.name || '').slice(0, 16),
      unlocked: { senoussi: !!d.unlocked.senoussi, purf: !!d.unlocked.purf },
      storyWinsBy: ints(d.storyWinsBy),
      cleared: ints(d.cleared),
      survWave: ints(d.survival, s => s.wave),
      survScore: ints(d.survival, s => s.score),
      rushBest: Math.max(0, Math.round(d.rushBest || 0)),
      diffMax: Math.max(1, Math.min(3, d.diffMax || 1)),
      stars: ints(d.stars), xp: ints(d.xp),
      trophies: Object.keys(d.trophies || {}).filter(k => TROPHIES.some(t => t.id === k)).slice(0, 60),
      updatedAt: M.serverTimestamp(),
    };
  },
  fromDoc(r) {
    const survival = {};
    HERO_IDS.forEach(k => { if (r.survWave && r.survWave[k] != null) survival[k] = { wave: r.survWave[k], score: (r.survScore || {})[k] || 0 }; });
    return { name: r.name || '', unlocked: r.unlocked || {}, storyWinsBy: r.storyWinsBy || {}, cleared: r.cleared || {}, survival, rushBest: r.rushBest || 0, diffMax: r.diffMax || 1, stars: r.stars || {}, xp: r.xp || {}, trophies: r.trophies || [] };
  },
  // Fusion : union des déblocages, meilleur de chaque record, plus grand nombre d'histoires terminées
  merge(local, remote) {
    const max = (a = {}, b = {}) => { const o = { ...a }; for (const k in b) o[k] = Math.max(o[k] || 0, b[k] || 0); return o; };
    local.unlocked = local.unlocked || {};
    for (const k in remote.unlocked) if (remote.unlocked[k]) local.unlocked[k] = true;
    local.storyWinsBy = max(local.storyWinsBy, remote.storyWinsBy);
    local.cleared = max(local.cleared, remote.cleared);
    local.survival = local.survival || {};
    for (const k in remote.survival) {
      const a = local.survival[k], b = remote.survival[k];
      if (!a || b.wave > a.wave || (b.wave === a.wave && b.score > a.score)) local.survival[k] = b;
    }
    local.rushBest = Math.max(local.rushBest || 0, remote.rushBest || 0);
    local.diffMax = Math.max(local.diffMax || 1, remote.diffMax || 1);
    local.stars = max(local.stars, remote.stars); local.xp = max(local.xp, remote.xp); // v3.7
    local.trophies = local.trophies || {}; (remote.trophies || []).forEach(k => { local.trophies[k] = 1; });
    local.storyWins = Math.max(local.storyWins || 0, Object.values(local.storyWinsBy).reduce((s, n) => s + n, 0));
    if (!local.name && remote.name) local.name = remote.name;
    // cohérence des déblocages avec les histoires terminées
    if (local.storyWins > 0) local.unlocked.senoussi = true;
    if ((local.storyWinsBy.senoussi || 0) > 0) local.unlocked.purf = true;
    return local;
  },

  // ---------- lecture / écriture ----------
  ref() { return this.mods.doc(this.db, 'saves', this.user.uid); },
  async pull() {
    if (!this.online()) return;
    try {
      const snap = await this.mods.getDoc(this.ref());
      if (snap.exists()) { this.merge(Save.data, this.fromDoc(snap.data())); Save.save(true); }
      await this.push(true); // envoie le résultat fusionné
    } catch (e) { console.warn('Lecture de la sauvegarde en ligne impossible', e); }
  },
  // écriture groupée : on attend 1,5 s d'inactivité
  schedulePush() {
    if (!this.online()) return;
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.push(), 1500);
  },
  async push(now) {
    if (!this.online()) return;
    clearTimeout(this.pushTimer);
    try { await this.mods.setDoc(this.ref(), this.toDoc()); }
    catch (e) {
      // Règles Firestore pas encore à jour (sans « diffMax », « stars », « xp », « trophies ») : on renvoie sans ces champs
      if (String(e && e.code).includes('permission')) {
        try { const d = this.toDoc(); ['diffMax', 'stars', 'xp', 'trophies'].forEach(k => delete d[k]); await this.mods.setDoc(this.ref(), d); return; } catch (e2) { e = e2; }
      }
      console.warn('Envoi de la sauvegarde impossible (elle reste sur l\'appareil)', e);
    }
  },

  // ---------- Relier à Google ----------
  async linkGoogle() {
    if (!this.online() || this.status === 'google') return;
    const M = this.mods, provider = new M.GoogleAuthProvider();
    try {
      await M.linkWithPopup(this.auth.currentUser, provider); // même uid : rien à fusionner
      this.status = 'google'; this.user = this.auth.currentUser;
      await this.push(true); this.refreshUI();
    } catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment' || e.code === 'auth/cancelled-popup-request')) {
        try { await M.linkWithRedirect(this.auth.currentUser, provider); } catch (e2) { this.onLinkError(e2); }
      } else this.onLinkError(e);
    }
  },
  // Ce compte Google est déjà relié à une progression (un autre appareil) :
  // on s'y connecte ; onAuthStateChanged → pull() fusionne la progression de cet appareil avec celle du compte.
  async onLinkError(e) {
    if (!e || !e.code) return;
    const M = this.mods;
    if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
      const cred = M.GoogleAuthProvider.credentialFromError(e);
      if (cred) { try { await M.signInWithCredential(this.auth, cred); return; } catch (e2) { console.warn(e2); } }
    }
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      console.warn('Liaison Google impossible', e);
      UI.toast && UI.toast('Liaison Google impossible : ' + (e.code || e.message));
    }
  },

  refreshUI() { if (typeof UI !== 'undefined' && UI.refreshAccount) UI.refreshAccount(); },
  label() {
    switch (this.status) {
      case 'off': return '💾 Sauvegarde sur cet appareil (classement et sauvegarde en ligne non configurés)';
      case 'connecting': return '☁ Connexion à la sauvegarde en ligne…';
      case 'anon': return '☁ Sauvegarde en ligne active (compte anonyme de cet appareil)';
      case 'google': return '☁ Progression reliée à Google' + (this.user && this.user.displayName ? ' : ' + this.user.displayName : '') + ' — retrouve-la sur tous tes appareils';
      default: return '💾 Sauvegarde en ligne indisponible : progression gardée sur cet appareil';
    }
  },
};
