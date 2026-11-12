// ============================================================
//  OUTILS DES TESTS AUTOMATIQUES (ne font pas partie du jeu)
//  - un mini serveur web local qui sert les fichiers du dépôt ;
//  - l'ouverture du jeu dans un Chrome sans fenêtre (Playwright), coupé d'Internet
//    (ni Firebase ni classement en ligne : les tests n'écrivent rien nulle part).
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };

// Sert le dossier du jeu sur http://127.0.0.1:<port libre>
function servir() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(RACINE, p);
      if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}/` }));
  });
}

// Ouvre le jeu. Renvoie la page et la liste des erreurs JavaScript rencontrées.
// opts : { largeur, hauteur, tactile, graine } — graine : rend le hasard reproductible (même partie à chaque fois)
async function ouvrirJeu(nav, url, opts = {}) {
  const ctx = await nav.newContext({ viewport: { width: opts.largeur || 1280, height: opts.hauteur || 720 }, hasTouch: !!opts.tactile, isMobile: !!opts.tactile });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e && e.stack || e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|firebase|gstatic/i.test(m.text())) erreurs.push('console : ' + m.text()); });
  // tout ce qui n'est pas le jeu lui-même est bloqué (Firebase, polices…) : le jeu doit marcher sans
  await page.route('**/*', r => r.request().url().startsWith(url) ? r.continue() : r.abort());
  await page.addInitScript(g => {
    window.NO_SW = true; // pas de mise en cache pendant les tests
    if (g) { let s = g >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  }, opts.graine || 0);
  await page.goto(url);
  await page.waitForFunction(() => typeof Game !== 'undefined' && !!Game.canvas && typeof UI !== 'undefined');
  return { page, ctx, erreurs };
}

module.exports = { servir, ouvrirJeu, chromium };
