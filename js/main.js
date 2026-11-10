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
