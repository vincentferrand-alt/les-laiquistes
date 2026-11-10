# Les laïquistes — v3.2.5

- **Son coupé après un retour dans l’appli** (iPhone / iPad) : l’audio passe en état « interrupted » quand on quitte l’appli ; il est maintenant relancé à chaque geste dès qu’il ne tourne pas, et la voix est re-débloquée.

---

# Les laïquistes — v3.2.4

- **Écran d’accueil « Touche pour jouer »** : les navigateurs interdisent tout son avant un geste ; le premier toucher débloque désormais l’audio et lance tout de suite la musique de menu.
- **Bouton « Partager sur WhatsApp »** sur l’écran titre (aperçu avec image via les balises Open Graph).

---

# Les laïquistes — v3.2.3

- **Voix sur iPad / iPhone** : le déblocage de la synthèse vocale se faisait sur « pointerdown », que Safari iOS ne reconnaît pas comme un vrai geste, et n’était tenté qu’une fois. Il est maintenant retenté à chaque clic / fin de toucher jusqu’à confirmation.

---

# Les laïquistes — v3.2.2

- Volumes par défaut : musique 20 %, effets 20 %, voix 100 % (pour les nouveaux appareils ; les réglages déjà enregistrés sont conservés).

---

# Les laïquistes — v3.2.0

## Corrections
- **Voix qui se coupaient** (`audio.js`, `Voice`) : Chrome choisissait souvent une voix « Google » qui passe par Internet et finit par échouer en silence ; la synthèse restait alors bloquée « en train de parler ». Désormais : voix française **locale** en priorité, bascule automatique sur une autre voix en cas d'erreur, référence gardée sur la phrase, petit délai après `cancel()`, garde-fou qui débloque la synthèse et remet la musique à son niveau.
- **Priorités de voix** : les phrases importantes (début du combat, niveau perdu, victoire du héros) coupent la parole ; les cris d'attaque ne sont dits que si personne ne parle (sinon : bulle seule). Les phrases au hasard toutes les 6–9 s sont supprimées.
- **Ambiances inaudibles** : réécrites et nettement plus fortes (bus d'ambiance × 1,6). Vraies cigales (stridulation hachée qui enfle) et cigales proches à Allauch, cris de goélands « kiaaou ka-ka-ka » sur le chantier, vent en rafales sifflantes (Christian, Fateh, Senoussi — fort dans le désert).
- **Ennemis hors de l'écran** : ils restent maintenant *entièrement* visibles (marge = demi-largeur du corps). À l'apparition, ils glissent vers l'intérieur et sont posés au bord au plus tard après 0,7 s (au lieu de 2 s).

## Boss
- **Barre de vie en 5 niveaux** (couleurs du jaune au rouge, séparations, « NIVEAU x/5 »). Phrase au début puis à chaque niveau perdu, sans répéter la même d'affilée. À chaque niveau : +4 % vitesse, +5 % dégâts, délais × 0,92, courte raillerie.
- Un peu plus difficiles : PV × 1,3 (avant 1,1), dégâts × 0,62 (avant 0,55), préparations plus courtes, coups plus rapprochés, combos plus fréquents, jusqu'à 3 renforts. Phase 2 à 60 % (fin du 2e niveau).
- **Boss vaincu : le héros dit une de ses phrases** (bulle + voix).

## Difficulté
- Ennemis courants : PV et dégâts × 1,15, attaques plus rapprochées, 5 en même temps au lieu de 4. Histoire : difficulté 1,05 + 0,12 par monde (avant 1 + 0,1). Dangers plus fréquents et plus forts.
- **Monde de Christian** : ouvriers et goélands plus coriaces (PV × 1,45, dégâts × 1,35), 2 ennemis de plus par vague, dangers plus fréquents. **Grues** : 2 ou 3 palettes de 9 briques qui se balancent au câble puis tombent (la première droit sur le héros) — gros choc : tremblement, onde, éclats, flash, vibration, dégâts 14. La phase 2 de Christian utilise les mêmes palettes.
- **Monde de Fateh** : arrosage plus large, plus long et moins annoncé ; mène de 3 boules de pétanque ; parfois les deux à la fois ; dangers plus fréquents.
- Tous ces réglages sont dans `BALANCE` (haut de `data.js`) : `enemies`, `story`, `perWorld`, `boss.tiers…`.

## Sons
- **Musique de Guilhem** : vrai beat de rap (boom bap, 88 BPM) — basse 808, caisse claire + clap, roulements de charleston, scratch toutes les 4 mesures, cuivres « West Coast », piano sombre, craquements de vinyle. Thème de boss en rap plus dur (charlestons trap).
- **Attaque de Fateh : aboiement** (et Aïka aboie 3 fois sur son spécial ; les bergers australiens et Aïka aboient aussi en attaquant).
- **Attaque de Faouzi : bruit de jeu vidéo** (« piou » 8-bit, petit arpège au 3e coup du combo ; rafale 8-bit sur son spécial).

# Les laïquistes — v3.1.0 : animations

- **Squelette partagé (`drawHumanoid`)** : rebond du buste selon la pose (marche, victoire, raillerie), balancement en victoire, dandinement en raillerie.
- **Attaque** : anticipation (le combattant se ramasse en arrière), étirement et inclinaison vers l'avant à la frappe, retour progressif ; le 3e coup du combo est plus ample. Charge (dash) : penché en avant.
- **Traînées d'arme** : arc en 3 couches avec étincelles, couleur propre à chaque héros (`TRAIL_COL`), étoile d'impact pour les coups de poing, traits de vitesse pour les charges et les piqués.
- **Victoire** : le héros rebondit sur place, étoiles qui tournent autour de sa tête.

# Les laïquistes — changements de la v3.0.0

## Lot 1 — Corrections

- **Ennemis toujours visibles** (`game.js`). Trois causes ont été corrigées :
  - les ennemis pouvaient attendre jusqu'à 140 px hors champ (le clamp de `think()` ne visait que leur cible) ;
  - les charges les emmenaient hors de l'écran ;
  - sur téléphone, les boutons FRAPPE / SAUT / SPÉCIAL couvraient le sol à droite.

  Désormais `Game.bounds()` donne la zone visible **et** jouable : la place des boutons est mesurée (`updateSafeArea()`) et retirée à droite. `keepInView()` empêche un ennemi entré de ressortir (une charge s'arrête au bord), et un ennemi resté hors champ plus de 2 s est ramené au bord. La caméra et le héros utilisent la même zone utile.
- **Senoussi** se débloque en terminant le mode histoire (n'importe quel héros) ; l'ancienne règle « le battre dans son désert » est supprimée.
- **The Purf** se débloque en terminant le mode histoire en jouant Senoussi. Les histoires terminées sont suivies par héros dans `Save.data.storyWinsBy` (`Save.storyCompleted()`). Les textes `unlockText`, l'écran de victoire (avec un indice pour The Purf) et le README sont à jour.
- **Choix du niveau** : les mondes de Senoussi et de The Purf sont verrouillés (cadenas + condition) tant que les persos ne sont pas débloqués ; le mode histoire les garde.
- **Écran GO** : bouton « ← Retour » (choix du niveau → choix du monde ; histoire → choix du perso).
- **Apparitions 60 % droite / 40 % gauche** via une seule fonction `spawnFromRight()` (vagues, ennemis isolés, renforts du boss, agneaux). Les entourages de boss gardent leur arrivée.
- **Guilhem** n'a plus de lunettes (jeu et HUD). Les rappeurs gardent leurs lunettes noires.
- **Chiens redessinés** : museau long, oreilles tombantes, pattes longues, queue touffue, langue qui pend à l'attaque. Berger australien bleu merle (marbrures noires, cuivre, blanc) ; Aïka fauve avec collier rouge et médaille.
- **Monde de Guilhem** : boutiques de montres avec enseigne « ROLEX » en lettres dorées et vitrine de montres (sans logo).
- **Faouzi plus mince** : largeur 38 au lieu de 48 (`CHARACTERS` et `HUMANS`), bras et jambes affinés, tête gardée ; gilet, cartouche et hitbox cohérents.
- **Coup plongeant** : FRAPPE en redescendant. Chute accélérée, lignes de vitesse, onde de choc courte (×1,8, renverse, plusieurs ennemis), poussière, tremblement, arrêt sur image marqué, vibration et son dédié. Tableau des commandes (pause) et README à jour.
- **Flash blanc compatible iPhone** : `ctx.filter` est remplacé par `drawTinted()` (canvas temporaire + `source-atop`). Même méthode pour la silhouette des persos verrouillés.

## Lot 2 — Bande son (tout synthétisé)

- Nouveau **séquenceur** multi-pistes calé sur `audioCtx.currentTime` (planification en avance, recalage après mise en arrière-plan).
- **Musiques écrites** : une par monde (tempo, accords, basse, batterie, timbre, mélodie) plus un **thème de menu** (titre, persos, mondes, intro, classement).
- **Thème de boss** dérivé de chaque monde, qui prend le relais à l'arrivée du boss ; **intensité** qui monte avec le compteur de coups ; **jingles** de vague, victoire et défaite.
- **Ambiances** par monde (goélands, klaxons, cigales, bips, bourdonnement, vent et bêlements, Geiger).
- **Bruitages** : panoramique stéréo, variation de hauteur, bruits de pas selon le sol, moteurs des véhicules de boss avec freinage et klaxon.
- **⚙ Réglages** (titre et pause) : volumes Musique / Effets / Voix, voix des boss, vibrations. En pause, la musique est étouffée sans s'arrêter.
- **Voix des boss** par `speechSynthesis` (fr-FR), avec une hauteur et une vitesse par boss, déclenchée avec la bulle. Repli silencieux (et signalé) sans voix française.

## Lot 3 — Graphismes, dangers, boss, modes

- **Premier plan** par monde (×1,4, devant les personnages), **particules d'ambiance**, **teinte et vignettage** qui évoluent du début du niveau à l'arène du boss.
- **Traînées d'arme**, écrasement et étirement, **pose de victoire**, **raillerie** de fin de vague.
- **Cinématique d'arrivée du boss** : bandes noires, zoom, carte avec le nom.
- **Dangers par monde**, annoncés et évitables, qui touchent aussi les ennemis : briques, voitures, arrosage et pétanque, piques et blocs pixel, laser de drone, tempête de sable avec tourbillons, flaques et pluie toxiques.
- **Boss** : une **phase 2 à 50 %** avec une attaque propre à chacun. Ils sont **beaucoup moins difficiles** (PV environ –50 %, dégâts environ –35 %, préparations des coups presque ×2, spéciaux plus espacés, 2 renforts maximum, répit après un renversement). Tous les réglages sont dans **`BALANCE`** (haut de `data.js`).
- **Modes** : 💀 **Boss Rush** (vie reportée, score cumulé) et 🌊 **Survie** par monde (vagues sans fin, boss toutes les 5 vagues), chacun avec son classement.
- **Vibrations** : coup reçu, mort d'un boss, spéciaux, coup plongeant ; option dans les réglages ; ignorées si non gérées.

## Lot 4 — Sauvegarde, publication

- **Sauvegarde Firestore** (`js/cloud.js`) : connexion anonyme automatique, document `saves/{uid}`, bouton « 🔗 Relier à Google » avec fusion entre appareils. La sauvegarde locale reste le repli.
- **Règles Firestore complètes** et étapes de la console Firebase dans le README. Un score ne peut être envoyé qu'une fois connecté, et seulement vers les tableaux du jeu.
- **Aperçu de partage** : balises Open Graph et Twitter, `icons/og-image.png` (1200×630) et `tools/make-og.html` pour la refaire.
- **Mises à jour** : plus de `skipWaiting()` automatique ; bandeau « Nouvelle version disponible — Mettre à jour ». Le numéro de version est affiché (titre et réglages).
- **Icônes** refaites (têtes des 5 héros) : `icon-192.png`, `icon-512.png` (any), `icon-maskable-512.png` (80 % centraux), `apple-touch-icon.png`. Manifeste avec `id` et `categories`. `FILES` et `VERSION` à jour dans `sw.js`.
