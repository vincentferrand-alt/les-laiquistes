// ============================================================
//  DÉMARRAGE
// ============================================================
window.addEventListener('load', () => {
  Input.init();
  Game.init();
  UI.init();
  Scores.init(); // ouvre aussi la sauvegarde en ligne (js/cloud.js) si Firebase est configuré
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && UI.current === 's-pause') { e.preventDefault(); UI.resume(); }
    else if (e.code === 'Escape' && UI.current === 's-settings') { e.preventDefault(); UI.closeSettings(); }
  });
  // Débloque l'audio au premier geste (exigence des navigateurs mobiles)
  const unlock = () => { Sfx.init(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);
  // Retour dans l'appli (après WhatsApp, un appel…) : iOS coupe l'audio et ne le rend qu'à un vrai geste.
  // À chaque geste, si le son ne tourne pas, on le relance ; la voix est aussi re-débloquée.
  ['pointerdown', 'click', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, () => {
    if (Sfx.ctx && Sfx.ctx.state !== 'running' && !document.hidden) Sfx.ctx.resume();
  }, { capture: true }));
  // Écran d'accueil : un vrai clic démarre l'audio (la musique de menu attend déjà dans Sfx.wanted)
  const splash = document.getElementById('splash');
  if (splash) {
    let done = false;
    const go = () => {
      if (done) return; done = true;
      Sfx.init(); Voice.prime();
      Sfx.music('menu'); // relance explicitement la musique de menu une fois le son débloqué
      splash.remove();
    };
    splash.addEventListener('click', go);
    splash.addEventListener('touchend', e => { e.preventDefault(); go(); });
    window.addEventListener('keydown', go, { once: true });
  }
  // iPad / iPhone : la synthèse vocale ne se débloque que sur un vrai geste (click, touchend)
  ['click', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, () => { if (typeof Voice !== 'undefined' && !Voice.primed) Voice.prime(); }, { capture: true }));
  // Application installable (PWA) — uniquement quand le jeu est servi en https
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.NO_SW) registerSW();
});

// ---------- Mises à jour de l'appli ----------
// Le service worker ne s'active plus tout seul : quand une nouvelle version est téléchargée,
// elle attend (« waiting ») et on affiche un bandeau. Le bouton l'active, puis la page se recharge.
function registerSW() {
  const banner = document.getElementById('update-banner');
  let reloading = false;
  const showBanner = reg => {
    banner.classList.remove('hidden');
    document.getElementById('b-update').onclick = () => {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      banner.classList.add('hidden');
    };
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    window.SWReg = reg; // pour le bouton « Mettre à jour » (UI.checkUpdate)
    // une version attend déjà (téléchargée lors d'une visite précédente)
    if (reg.waiting && navigator.serviceWorker.controller) showBanner(reg);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => {
        // « installed » + une page déjà contrôlée = c'est une mise à jour (pas la toute première installation)
        if (w.state === 'installed' && navigator.serviceWorker.controller) showBanner(reg);
      });
    });
    // vérifie s'il y a une nouvelle version quand on revient sur l'appli
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
}

// Bouton « ⟳ Mettre à jour » : cherche une nouvelle version sur le serveur.
// Résultat : 'latest' (déjà à jour), 'updating' (téléchargée : la page va se recharger), 'offline', 'reload' (pas de service worker)
function checkForUpdate() {
  return new Promise(resolve => {
    const reg = window.SWReg;
    if (!reg) { resolve('reload'); setTimeout(() => location.reload(), 300); return; }
    const activate = w => { resolve('updating'); if (w.state === 'installed') w.postMessage({ type: 'SKIP_WAITING' }); else w.addEventListener('statechange', () => { if (w.state === 'installed') w.postMessage({ type: 'SKIP_WAITING' }); }); };
    if (reg.waiting) { activate(reg.waiting); return; }
    reg.update().then(() => {
      if (reg.installing) activate(reg.installing);
      else if (reg.waiting) activate(reg.waiting);
      else resolve('latest');
    }).catch(() => resolve('offline'));
  });
}
