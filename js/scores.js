// ============================================================
//  SCORES — local (localStorage) + en ligne (Firestore) si configuré
//  Un tableau par mode : 'histoire', 'bossrush', '<monde>' (choix du niveau), 'survie-<monde>'
//  La connexion Firebase est ouverte par Cloud (js/cloud.js), qui appelle Scores.attach().
// ============================================================
const BOARDS = ['histoire', 'bossrush'].concat(HERO_IDS, HERO_IDS.map(w => 'survie-' + w));
const Scores = {
  online: false, fs: null, db: null, localKey: 'laiquistes_scores_v1',

  init() { return Cloud.init(); },
  attach(fs, db) { this.fs = fs; this.db = db; this.online = true; },

  local() { try { return JSON.parse(localStorage.getItem(this.localKey)) || {}; } catch (e) { return {}; } },

  async submit(board, entry) {
    entry = { name: String(entry.name || 'Anonyme').slice(0, 16), score: Math.max(0, Math.round(entry.score)), hero: entry.hero, ts: Date.now() };
    const all = this.local();
    (all[board] = all[board] || []).push(entry);
    all[board].sort((a, b) => b.score - a.score); all[board] = all[board].slice(0, 20);
    try { localStorage.setItem(this.localKey, JSON.stringify(all)); } catch (e) {}
    if (this.online && (BOARDS.includes(board) || /^defi-\d{8}$/.test(board))) { // (défi du jour : 'defi-AAAAMMJJ')
      // les règles exigent d'être connecté (compte anonyme créé automatiquement)
      const ok = await Promise.race([Cloud.ready, new Promise(r => setTimeout(() => r(false), 6000))]);
      if (ok) {
        try { await this.fs.addDoc(this.fs.collection(this.db, 'boards', board, 'scores'), entry); return true; }
        catch (e) { console.warn('Envoi du score impossible', e); }
      }
    }
    return false;
  },

  async top(board) {
    if (this.online) {
      try {
        const f = this.fs;
        const q = f.query(f.collection(this.db, 'boards', board, 'scores'), f.orderBy('score', 'desc'), f.limit(20));
        const snap = await f.getDocs(q);
        return { online: true, list: snap.docs.map(d => d.data()) };
      } catch (e) { console.warn(e); }
    }
    return { online: false, list: this.local()[board] || [] };
  },
};
