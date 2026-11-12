// Service worker : met le jeu en cache pour qu'il marche hors-ligne et s'installe comme une appli.
// ⚠ Change VERSION à chaque mise en ligne (et GAME_VERSION dans js/config.js) :
// les joueurs verront alors le bandeau « Nouvelle version disponible — Mettre à jour ».
const VERSION = 'laiquistes-v3.13.0';
const FILES = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/config.js', 'js/data.js', 'js/audio.js', 'js/draw.js', 'js/backgrounds.js', 'js/entities.js',
  'js/input.js', 'js/cloud.js', 'js/scores.js', 'js/game.js', 'js/combat.js', 'js/tiers.js', 'js/events.js', 'js/extras.js', 'js/minis.js', 'js/rage.js', 'js/share.js', 'js/progress.js', 'js/ui.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  // bruitages enregistrés
  ...[1, 2, 3, 4, 5].map(i => `sounds/pet-${i}.mp3`), ...[1, 2].map(i => `sounds/rot-${i}.mp3`),
  'sounds/arrivee-boss.mp3', 'sounds/voiture-christian.mp3', 'sounds/game-over.mp3', 'sounds/blague-nulle.mp3',
  'sounds/go-1.mp3', 'sounds/go-2.mp3',
];
// Installation : on télécharge la nouvelle version (sans passer par le cache HTTP)…
// …mais on NE l'active PAS tout de suite (plus de skipWaiting automatique) : elle attend que le joueur clique sur « Mettre à jour ».
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))
    // voix générées (facultatives : dossier voices/ créé par tools/make-voices.py) — on ne bloque pas si elles manquent
    .then(() => fetch('voices/manifest.json', { cache: 'reload' }).then(r => r.ok ? r.clone().json().then(m => {
      c.put('voices/manifest.json', r);
      return Promise.all((m.files || []).map(f => c.add(new Request('voices/' + f.file, { cache: 'reload' })).catch(() => {})));
    }) : null).catch(() => {}))));
});
// Le bouton « Mettre à jour » envoie ce message
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Fichiers du jeu : servis depuis le cache de la version active (cohérent, et marche hors-ligne).
// Le reste (image de partage, etc.) : réseau, puis cache si hors-ligne.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }).catch(() => c.match('index.html'))))
  );
});
