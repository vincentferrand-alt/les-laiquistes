# Les laïquistes

Beat'em up à défilement horizontal (inspiré de Castle Crashers), jouable dans Chrome sur PC et sur téléphone, installable comme une appli.

- **5 héros jouables** (Christian, Guilhem, Fateh, Faouzi, Venum) + **Senoussi** et **The Purf** à débloquer.
- **7 mondes**, chacun porte le nom de son boss, avec ses ennemis, son arrivée de boss et ses phrases :

| Monde | Décor | Ennemis | Arrivée du boss |
|---|---|---|---|
| Christian | Chantier miniature (tout est petit) | Petits ouvriers (tournevis, marteau, pelle), goélands à goitre | Sort d'un van de chantier bien trop grand |
| Guilhem | Rap City : terrains de basket, belles voitures | Rappeurs (chaîne en or, casquette à l'envers, batte), skateurs | Descend d'une voiture de luxe |
| Fateh | Allauch, village provençal luxueux | Bergers australiens, papys à canne, runners | Arrive avec ses 2 mini-Fateh et Aïka (les 4 à battre) |
| Faouzi | Pixel World, tout rétro et pixelisé | Chevaliers 8-bit, slimes, soucoupes, chauves-souris pixel | Se matérialise en pixels, lance des cartouches |
| Venum | IA City futuriste | Chats, robots CLAUDE / OPENAI / GEMINI / ANTHROPIC | Descend d'un SUV électrique avec 2 chats robots (les 3 à battre) |
| Senoussi | Désert, palmiers, chameaux | Indiens, moutons | Précédé de son troupeau, grande pelle, invoque des agneaux |
| The Purf | Zone polluée, centrale qui fume | Oursins, zombies radioactifs | Sort d'un nuage toxique, poudre toxique, parmesan |

- **Mode histoire** : les 6 mondes autres que celui de ton héros, dans un ordre aléatoire ; la vie et le score se cumulent.
- **Choix du niveau** : n'importe quel monde sauf celui de ton héros, record enregistré par monde. Les mondes de Senoussi et de The Purf y restent verrouillés (🔒) tant que ces deux persos ne sont pas débloqués ; en mode histoire, ils sont joués comme les autres.
- **💀 Boss Rush** : les 6 boss des autres mondes à la suite. La vie se reporte d'un boss à l'autre (petit soin de 30 PV entre deux combats) et le score se cumule.
- **🌊 Survie** (par monde) : vagues sans fin, de plus en plus nombreuses et coriaces. Le boss du monde revient toutes les 5 vagues. Le record (vague et score) est gardé pour chaque monde.
- **Classement** : un tableau par mode (histoire, chaque monde du choix du niveau, Boss Rush, Survie par monde). Local par défaut, partagé entre joueurs si Firebase est configuré.
- Aucune dépendance : pas de framework. Tout est dessiné et les sons sont synthétisés (les seules images sont les icônes et l'aperçu de partage).

## Commandes

| | PC | Téléphone |
|---|---|---|
| Se déplacer | Flèches ou ZQSD | Joystick flottant (pouce gauche, n'importe où sur la moitié gauche) |
| Frapper (combo x3) | J ou X | ✊ FRAPPE |
| Sauter (coup sauté = renverse) | Espace | ⤒ SAUT |
| Coup plongeant (onde de choc, renverse) | Espace puis J / X **en redescendant** | SAUT puis FRAPPE **en redescendant** |
| Spécial | K ou C | ★ SPÉCIAL |
| Attraper puis lancer un ennemi | Rester appuyé sur J / X, puis lâcher | Rester appuyé sur FRAPPE, puis lâcher |
| Arme (trouvée dans une caisse) | Marche dessus : 8 coups plus forts | idem |
| Pause | Échap ou P | ❚❚ |

Sur tablette, le joystick et les boutons sont **plus gros automatiquement** (taille proportionnelle à l'écran, jusqu'à × 1,6 sur iPad). ⚙ Réglages → **Commandes tactiles** : Normales / Grandes / Très grandes.

## Les spéciaux

| Perso | Spécial |
|---|---|
| Christian (truelle, casque) | Coup de truelle : onde de choc au sol |
| Guilhem (montre en or en guise de poing) | Éclat de Rolex : aveugle et paralyse les ennemis |
| Fateh (Aïka mord à chaque coup) | Lâcher d'Aïka : morsures en ligne |
| Faouzi (cartouches de jeux) | Salve de 3 cartouches |
| Venum (gants de boxe) | Direct foudroyant (fonce, invincible) |
| Senoussi (grande pelle) | Ruée de 3 moutons |
| The Purf (poudre toxique) | Nuage toxique |

Déblocages :
- **Senoussi** : termine le mode histoire (avec n'importe quel héros) ;
- **The Purf** : termine le mode histoire **en jouant Senoussi**.

Les histoires terminées sont comptées par héros dans la sauvegarde (`storyWinsBy`).

## Combat (v3.6)

- **Combos** : gros compteur à droite, avec une jauge qui montre le temps avant que la série retombe. Paliers à ×10 (« PAS MAL ! »), ×25 (« LAÏQUE ! »), ×50 (« INARRÊTABLE ! ») et ×100 (« LÉGENDAIRE ! ») : bonus de points, petit ralenti, arpège. Le coup final envoie valser l'ennemi ; le dernier ennemi d'une vague tombe au ralenti (« K.O. ! »).
- **Attraper / lancer** : reste appuyé sur FRAPPE près d'un ennemi (pas les boss ni les volants) : il passe au-dessus de ta tête. Lâche le bouton : il part devant et renverse tous ceux qu'il croise, puis s'écrase. Si tu es touché, tu le lâches.
- **Caisses** (3 par monde : palette, enceinte, cagette, bloc « ? », conteneur, amphore, baril) : 3 coups pour les casser. Elles lâchent un **bonus**, une **arme à manier** ou de la nourriture (depuis la v3.13, les objets à lancer sont fusionnés avec les armes).
- **Dangers et lancers récompensés** : un ennemi éliminé par un danger du décor (« BIEN ENVOYÉ ! ») ou par un lancer (« STRIKE ! ») rapporte un bonus, plus gros pour un « DOUBLÉ ! », « TRIPLÉ ! », « CARNAGE ! ».
- Réglages : `COMBAT` en haut de `js/combat.js`.

## Événements de milieu de monde (v3.6)

À la fin du 2e tiers (mode histoire, choix du niveau, défi du jour), une épreuve propre au monde. Réussie : **+800 points** (× le niveau de difficulté) et **+30 de vie**. Ratée : rien de perdu.

| Monde | Épreuve |
|---|---|
| Christian | **Pluie de briques d'or** : ramasser 10 briques dorées sous les palettes de la grue |
| Guilhem | **Battle de rap** : FRAPPE quand la note passe dans le cercle (calé sur le tempo) ; 60 % de réussite pour gagner |
| Fateh | **Partie de pétanque** : 3 boules, jauge de puissance ; carreau = 3 points, il en faut 3 |
| Faouzi | **Niveau bonus** : sauter pour attraper 12 pièces |
| Venum | **Le drone voleur** : le frapper 5 fois avant qu'il s'enfuie |
| Senoussi | **Le mouton d'or** : le frapper 5 fois avant qu'il s'échappe |
| The Purf | **Opération nettoyage** : ramasser 8 bidons entre les flaques |

Le temps imparti dépend du niveau de difficulté. Réglages : `EVENTS` en haut de `js/events.js`.

## Progression (v3.7)

- **Étoiles** (3 par monde, 21 en tout), affichées sur les cartes des mondes : ★ boss vaincu, ★ épreuve de milieu de monde réussie, ★ fini avec plus de la moitié de sa vie. On garde le meilleur résultat.
- **Niveaux des héros** (1 à 10) : expérience à chaque partie (10 par ennemi, 150 par boss, 100 par épreuve réussie, même en cas de défaite pour les ennemis). Depuis la v3.13 le niveau est un **grade** honorifique : il ne donne plus de vie ni de force (classements équitables). Niveau et barre d'XP sur l'écran du choix du perso.
- **24 trophées** (écran 🏅 TROPHÉES) : premier boss, histoire en Costaud / Laïque ultime, combos ×25 / ×50 / ×100, strike, carreau, roi du flow, intouchable, 21 étoiles, héros niveau 10, pétomane, ruée vers l'or, médaille d'or… Annoncés par un message quand on les gagne.
- Réglages : `XP` et `TROPHIES` en haut de `js/progress.js`.

## Un peu de Streets of Rage (v3.10)

- **Ennemi spécial par monde** (3e tiers et renforts du boss) : Marteau-piqueur, Ballon de basket, Basket de course, Glitch, Tableur, Chèvre, Fût radioactif. **Costaud** : impossible à attraper, ne recule que s'il est renversé.
- **Ennemis qui sortent du décor** (tombent d'en haut, sortent d'une bouche d'égout).
- **Armes à manier** (une par monde, 8 coups), **appel à un pote** (📣 POTE, touche L ou V, une fois par monde), **barre de l'ennemi visé** (sous le panneau du héros ; c'est la seule barre de vie des ennemis courants depuis la v3.13), **décompte des points** en fin de niveau.
- Réglages : `RAGE` en haut de `js/rage.js` (ennemis spéciaux dans `MINIONS`, `js/data.js`).

## Niveaux en 3 tiers et mini-boss (v3.9)

- Chaque monde : **1er tiers** (2 vagues + mini-boss), **2e tiers** (1 vague + épreuve), **3e tiers** (1 vague + boss). Barre en haut avec 3 repères. Plan du niveau : `LAYOUT` en haut de `js/tiers.js`.
- **Reprise au début du tiers** après une défaite (score et chrono de ce moment-là).
- **Mini-boss** (`MINIBOSSES` dans `js/data.js`, dessins dans `js/minis.js`, réglages `BALANCE.mini`) : Marcel (Christian), Clément (Guilhem), Cécile (Fateh), Le Blond (Faouzi), Clapet 3000 (Venum), Mouton géant (Senoussi), Mini Purf (The Purf). Barre de vie en 3 niveaux, un coup et une attaque spéciale. En Survie : vagues 3, 8, 13…
- **GO !** : sons `sounds/go-1.mp3` et `go-2.mp3` (enregistrés), en alternance.
- **Aides de la première fois** (attraper, lancer, spécial), **duel verbal** à l'intro, **objectifs** dans le menu pause.

## Bonus, ennemi en or, chrono (v3.8)

- **Bonus temporaires**, un par monde : casque de chantier (invincible 6 s), Rolex en or (points ×2), os à moelle (force ×1,6), champignon 8-bit (géant, force ×1,4), boisson énergisante (vitesse ×1,4), thé à la menthe (spécial qui se recharge à toute vitesse), masque à gaz (dangers sans effet + soin). On les trouve dans les caisses (3 chances sur 10), sur l'ennemi en or, et le boss en lâche un quand il perd son 2e niveau de vie. Affichés sous la barre de vie avec le temps restant.
- **Ennemi en or** : un par monde (histoire, choix du niveau, défi du jour), une vague sur trois en Survie. Il fuit en zigzag et s'échappe au bout de 12 s. Battu : 1 000 points (× niveau de difficulté) et un bonus temporaire.
- **Attaques des boss annoncées** : pendant qu'un boss prépare un coup ou un spécial, la zone touchée s'affiche au sol en rouge (en jaune pour l'éclat de Rolex, en vert pour le nuage toxique).
- **Chrono et médailles de vitesse** : 🥇 moins de 3:45, 🥈 moins de 4:45, 🥉 moins de 6:00 (depuis la v3.9) pour finir un monde (histoire, choix du niveau, défi du jour). Meilleure médaille et meilleur temps affichés sur les cartes des mondes (gardés sur l'appareil, pas besoin de nouvelles règles Firestore).
- **Image de score à partager** (bouton 📸 Partager en fin de partie) : décor du monde, héros, boss, phrase en bulle, score, étoiles, médaille et adresse du jeu. Sur téléphone, la feuille de partage s'ouvre (WhatsApp…) ; sur ordinateur, l'image est téléchargée.
- Réglages : `EXTRA`, `POWERUPS` et `HERO_WORDS` en haut de `js/extras.js`.

## Défi du jour (v3.7)

Bouton **📅 DÉFI DU JOUR** : le même défi pour tout le monde, tiré au sort d'après la date — un monde, un héros imposé (parmi les 5 de départ), difficulté Costaud et une **règle du jour** : Turbo (tout va 20 % plus vite), Ennemis géants, Fragile (moitié de vie, score ×2), Déluge (dangers ×2), Combo fou (coups ×3), Déménagement (caisses ×2). Avec l'épreuve de milieu de monde. Classement du jour partagé (règles Firestore à jour nécessaires) ; on peut rejouer autant qu'on veut.

## Niveaux de difficulté

| Niveau | Nom | Score | Comment le débloquer |
|---|---|---|---|
| ★ | Tranquille | ×1 | dès le départ |
| ★★ | Costaud | ×1,5 | finir le mode histoire en Tranquille |
| ★★★ | Laïque ultime | ×2 | finir le mode histoire en Costaud |

- Le choix se fait sur l'écran du choix du perso, une fois les niveaux débloqués. Le déblocage vaut **pour tous les héros**, et le niveau est fixé pour toute la partie.
- **Costaud = l'équilibrage de la v3.3.** Tranquille : ennemis et boss moins solides et moins violents, coups mieux annoncés, dangers plus rares, plus de nourriture. Laïque ultime : l'inverse, un ennemi de plus à l'écran, boss qui enchaînent plus et passent en **phase 2 dès 80 % de vie**.
- Tous les réglages sont dans `BALANCE.levels` (`js/data.js`).
- Qui avait déjà fini l'histoire avant la v3.4 commence avec Costaud débloqué.
- Le niveau débloqué est sauvegardé en ligne (champ `diffMax`) si les règles Firestore ci-dessous sont à jour ; sinon il reste sur l'appareil et tout le reste se sauvegarde normalement.

## Boss, dangers et difficulté

- La **barre de vie d'un boss compte 5 niveaux**. Il dit une de ses phrases au début du combat puis à chaque niveau perdu, et devient un peu plus rapide et plus dur à chaque fois. Une fois le boss vaincu, le héros dit une de ses phrases.
- Depuis la v3.15, chaque boss a **3 comportements** (niveaux 1-2, 3-4, 5 de sa barre), une **attaque signature annoncée au sol au moins 0,9 s**, puis un **moment où il est essoufflé** (1,5 à 2 s) : c'est là qu'il faut frapper. Pendant le combat il n'y a plus de dangers du décor, et les renforts n'arrivent qu'aux deux changements de comportement.

| Boss | Attaque signature | Seconde attaque (à partir du niveau 3) |
|---|---|---|
| Christian | Pluie de briques sur 4 zones marquées | Coup de truelle (onde de choc) |
| Guilhem | Éclat de Rolex : grand cercle autour de lui | Liasses de billets en éventail |
| Fateh | « J'ai un impératif » : charge sur un couloir marqué | Aïka lâchée sur ta ligne |
| Faouzi | Cartouche géante : cible marquée, puis explosion | Salve de trois cartouches |
| Venum | Direct foudroyant : charge sur un couloir marqué | Frappes de drones sur trois cibles |
| Senoussi | Coup de pelle sismique : fissure sur une ligne (saute ou change de ligne) | Appel des agneaux |
| The Purf | « Rendez-moi mon argent !!!! » : charge qui laisse des flaques toxiques | Nuage toxique |

- Les boss sont **beaucoup moins durs** qu'avant : moins de PV, moins de dégâts, préparations plus longues (le « ! » reste affiché plus longtemps), spéciaux plus espacés, moins de renforts. Après t'avoir renversé, le boss prend le temps de te narguer, ce qui te laisse un répit.
- **Tous ces réglages sont regroupés dans le bloc `BALANCE`, en haut de `js/data.js`**, avec les anciennes valeurs en commentaire.
- **Dangers propres à chaque monde**, toujours annoncés avant de blesser (zone rouge, phares, ligne de visée…) et évitables en changeant de ligne ou en sautant : chute de briques (Christian), voitures qui traversent (Guilhem), arrosage automatique et boule de pétanque (Fateh), piques et blocs pixel (Faouzi), laser de drone (Venum), tempête de sable avec tourbillons (Senoussi), flaques et pluie toxiques (The Purf). Ils touchent aussi les ennemis : profites-en.
- **Vibrations** (téléphone Android) quand tu es touché, à la mort d'un boss, sur les spéciaux et le coup plongeant. Elles se désactivent dans ⚙ Réglages ; sur iPhone, le navigateur ne les gère pas et elles sont ignorées sans erreur.

## Graphismes

- Un vrai **premier plan** par monde, qui défile plus vite que le sol et passe devant les personnages (poteaux, rubalise, lampadaire, branches d'olivier, palmes, tuyaux rouillés…).
- **Particules d'ambiance** : poussière de plâtre, billets qui tombent, lucioles, scintillements pixel, pluie de code, sable, cendres.
- **Teinte et vignettage** par monde, qui s'accentuent du début du niveau vers l'arène du boss (avec une pulsation rouge pendant le combat).
- **Traînées d'arme**, écrasement et étirement à l'attaque, au saut et à l'atterrissage, **pose de victoire** et petite **raillerie** à la fin d'une vague.
- **Arrivée des boss** : ralenti, grand bandeau à rayures avec le boss en grand (v3.8), puis bandes noires, léger zoom et carte avec son nom.
- **K.O. du boss** (v3.8) : ralenti, zoom, flash et le boss s'envole en tournoyant.
- **Onomatopées** propres à chaque héros (v3.8) : TCHAK ! (Christian), BLING ! (Guilhem), WOUF ! (Fateh), BLIP ! (Faouzi), POW ! (Venum), BÊÊÊ ! (Senoussi), SPLOTCH ! (The Purf), sur une étoile de BD pour les gros coups.
- **Ambiance animée par monde** (v3.8) : rayons de soleil (chantier, Allauch), pétales de lavande, projecteurs de Rap City, lignes d'écran rétro chez Faouzi, pluie et néons à IA City, soleil et mirage dans le désert, nappes de smog dans la zone polluée.
- **Élasticité** (v3.8) : les persos s'écrasent à l'atterrissage et rebondissent quand ils prennent un coup.
- **Fin de niveau festive** (v3.8) : confettis, le héros danse, les étoiles arrivent une par une avec un « ding ».
- **Rendu cartoon (v3.5)** : gros contour noir autour des persos, éclairage (haut éclairé, jambes dans l'ombre), ombres douces, yeux expressifs (clignement, sourcils selon l'action), brume au loin et grain sur le sol, halos sur les étincelles. Voir `drawSprite` et `Gfx` dans `js/draw.js`, `drawDepth` dans `js/backgrounds.js`.
- **Qualité automatique** : si l'appareil rame, le jeu allège tout seul (d'abord le contour des petits ennemis, puis l'éclairage).

## Son

Musiques, ambiances et la plupart des bruitages sont synthétisés en direct (Web Audio). Quelques sons sont des fichiers :
- `sounds/` : sons enregistrés — 5 pets, 2 rots, arrivée des boss, camionnette de Christian, game over, fin de niveau (« blague nulle »). Si un fichier manque, le jeu utilise un son de synthèse ;
- `voices/` (facultatif) : **voix des personnages** fabriquées par `tools/make-voices.py` (voir plus bas).

- **Mixage** : musique, effets, ambiance et voix ont chacun leur bus ; la musique et les effets ont chacun leur compresseur (les coups ne font plus « respirer » la musique), puis un limiteur en sortie empêche toute saturation. Un peu de **réverbération** donne de l'espace à la musique et aux effets. Chaque son démarre par une montée de quelques millisecondes (plus de petits « clics »), et le nombre de sons d'une même famille joués en même temps est limité.
- **Une musique écrite par monde** (`SONGS` dans `js/audio.js`) : chantier sifflé avec coups de marteau (Christian), boom bap (Guilhem), cordes pincées et galoubet provençal en 3/4 (Fateh), chiptune (Faouzi), électro (Venum), gamme orientale avec bourdon, darbouka et ney (Senoussi), drone industriel (The Purf), plus un thème de menu.
- **Arrangement** : la boucle ne se répète plus à l'identique. Intro (batterie + basse), puis en cycle : passage complet avec contre-chant, **break** de 4 mesures (grosse caisse seule, mélodie une octave plus bas, roulement qui monte), passage **un ton plus haut**. Roulement de caisse claire toutes les 4 mesures.
- **Thème de boss** dérivé du monde, qui démarre **pile sur la mesure** (plus de coupure sèche) par une mesure de montée. L'intensité monte avec le compteur de coups (charleston, arpèges, octaves, cymbales). Jingles de vague terminée, de victoire et de défaite.
- **Ambiances par monde** (curseur à part) : goélands et vent (chantier), klaxons et ballon (Rap City), cigales et oiseaux (Allauch), bips rétro, bourdonnement électrique, vent du désert et bêlements, crépitement Geiger et bulles toxiques.
- **Coups** : trois couches (choc, claquement, chair) + la « couleur » de l'arme du héros (tintement de truelle, « ting » de la Rolex, cuir des gants de Venum, « bôngg » de la pelle, cartouche en plastique, grésillement toxique). Le son monte un peu à chaque coup du combo et avec la série en cours.
- **KO** : un « pouf » cartoon, et **environ une fois sur trois un pet ou un rot** (jamais deux de suite, tirés sans répétition parmi les 13). Un boss vaincu part toujours sur un long pet. Pour qu'il n'y ait aucun doute, c'est aussi **montré** : « PROUUUT ! » vert qui tremble, nuage verdâtre et lignes d'odeur pour un pet ; « BUUURP ! » jaune, ondes et postillons devant la bouche pour un rot.
- Bruits de pas discrets selon le sol, moteurs des véhicules de boss, panoramique stéréo selon la position à l'écran.
- **iPad / iPhone** : le jeu joue **même avec l'interrupteur silencieux activé** (iOS 17 et plus). Revers : la musique d'une autre appli se met en pause pendant le jeu.
- **⚙ Réglages** : curseurs Musique / Effets / Ambiance / Voix sur une **échelle progressive** (on règle finement dans les volumes bas). Par défaut : Musique 50 %, Effets 50 %, Ambiance 50 %, Voix 100 %. Les appareils qui n'avaient jamais touché aux curseurs passent à ces niveaux (un peu plus bas qu'avant) ; ceux qui les avaient réglés gardent leur volume. En pause, la musique continue, étouffée.

### Voix des personnages (fichiers générés)

Sans fichiers, les personnages parlent avec la synthèse vocale du navigateur (qualité variable selon l'appareil). Pour avoir **les mêmes voix partout, de bien meilleure qualité** :

**Le plus simple (rien à installer)** : le fichier `.github/workflows/voix.yml` demande à GitHub de fabriquer les voix sur ses serveurs. Il se lance tout seul quand il arrive sur GitHub et à chaque changement de `js/data.js` ; sinon onglet **Actions → Générer les voix → Run workflow**. Le dossier `voices/` apparaît dans le dépôt une minute plus tard.

**Ou sur ton ordinateur** :

1. Installer Python 3, puis dans un terminal : `pip install edge-tts`
2. Dans le dossier du jeu : `python tools/make-voices.py` (Windows : `py tools/make-voices.py`). Il faut Internet : ce sont les voix neuronales gratuites de Microsoft.
3. Le dossier `voices/` se remplit (un MP3 par phrase + `manifest.json`). Le mettre sur GitHub, puis changer `VERSION` (sw.js) et `GAME_VERSION` (config.js).

Les phrases sont lues dans `js/data.js` : si tu en changes une, relance le script. La voix, la hauteur et la vitesse de chaque personnage se règlent dans le tableau `VOIX` en haut du script. Une phrase sans fichier retombe sur la synthèse du navigateur.

## Mettre le jeu en ligne (GitHub Pages)

1. Crée un dépôt sur GitHub (par exemple `les-laiquistes`).
2. Envoie tout le contenu de ce dossier à la racine du dépôt (bouton « Add file > Upload files » sur github.com, ou `git push`).
3. Dans le dépôt : **Settings > Pages > Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
4. Au bout d'une minute, le jeu est sur `https://<ton-pseudo>.github.io/les-laiquistes/`.
5. Sur téléphone, ouvre ce lien dans Chrome puis menu ⋮ > **Installer l'application** (ou le bouton « 📲 Installer l'appli » sur l'écran titre).

### Mises à jour (bandeau « Nouvelle version disponible »)

Le numéro de version est affiché **en bas à gauche de tous les menus**, avec un bouton **⟳ Mettre à jour** : il cherche une nouvelle version, la charge et relance le jeu (ou répond « Tu as la dernière version »).

À chaque mise en ligne, change **deux** numéros :
- `VERSION` dans `sw.js` (par exemple `laiquistes-v3.0.1`) : c'est ce changement qui fait télécharger la nouvelle version aux joueurs ;
- `GAME_VERSION` dans `js/config.js` (par exemple `3.0.1`) : le numéro affiché en bas de l'écran titre et dans ⚙ Réglages.

La nouvelle version ne s'installe plus en douce : les joueurs voient un bandeau **« ✨ Nouvelle version disponible — Mettre à jour »**. Le bouton active la nouvelle version et recharge la page. Les fichiers du jeu sont servis depuis le cache de la version active (le jeu marche hors-ligne).

Si tu ajoutes un fichier au jeu, ajoute-le aussi à la liste `FILES` de `sw.js`.

### Aperçu de partage (WhatsApp…)

Les balises Open Graph et Twitter sont dans `<head>` de `index.html`, dans le bloc signalé par **« ⚠ URL DU SITE »**.
Remplace `https://vincentferrand-alt.github.io/les-laiquistes/` par l'adresse finale du jeu **aux 3 endroits** (`og:url`, `og:image`, `twitter:image`). Les adresses doivent être complètes (`https://…`), sinon WhatsApp n'affiche pas l'image.

L'image `icons/og-image.png` (1200×630, PNG) est fournie. Pour la refaire (ou refaire les icônes), ouvre `tools/make-og.html` depuis le dossier du jeu : la page dessine les images avec le code du jeu et propose un bouton « Télécharger » pour chacune.
WhatsApp garde les aperçus en cache : après un changement, l'aperçu peut mettre du temps à se mettre à jour.

### Icônes

- `icons/icon-192.png` et `icons/icon-512.png` : icônes « any » (les têtes des 5 héros, sans texte) ;
- `icons/icon-maskable-512.png` : version « maskable » pour Android, tout le dessin tient dans les 80 % centraux (rien n'est rogné par les icônes rondes) ;
- `icons/apple-touch-icon.png` : icône pour l'écran d'accueil de l'iPhone.

## Firebase : classement en ligne et sauvegarde de la progression

Sans configuration, tout reste sur l'appareil (classement local, sauvegarde locale). Avec Firebase :
- **classement partagé** entre tous les joueurs, un tableau par mode ;
- **sauvegarde de la progression** dans Firestore (déblocages, histoires terminées par héros, records par monde, records de Survie et de Boss Rush, pseudo). Chaque appareil reçoit automatiquement un **compte anonyme**, sans rien demander au joueur. Un document `saves/{uid}` est créé par joueur ;
- bouton facultatif **« 🔗 Relier à Google »** (dans ⚙ Réglages) : la progression est attachée au compte Google. Sur un autre appareil, le même bouton reconnecte ce compte et **fusionne** les deux progressions (union des déblocages, meilleur de chaque record) ;
- la **sauvegarde locale reste la référence de secours** : si Firebase ne répond pas (hors-ligne, mauvaise config), le jeu continue normalement avec la sauvegarde de l'appareil.

Les réglages (volumes, voix, vibrations) restent propres à chaque appareil et ne sont pas envoyés en ligne.

### Étapes dans la console Firebase

1. Va sur https://console.firebase.google.com et crée un projet (gratuit, offre Spark).
2. **Build > Firestore Database > Créer une base de données** (mode production, région `eur3`).
3. **Build > Authentication > Commencer**, puis onglet **Sign-in method** :
   - active **Anonyme** ;
   - active **Google** (choisis une adresse e-mail d'assistance, puis Enregistrer).
4. Toujours dans **Authentication**, onglet **Paramètres > Domaines autorisés** : clique sur **Ajouter un domaine** et ajoute `<ton-pseudo>.github.io` (sans `https://` ni chemin). `localhost` y est déjà pour les tests en local.
5. **Firestore Database > Règles** : colle les règles ci-dessous, puis **Publier**.
6. **Paramètres du projet (roue dentée) > Vos applications > icône Web `</>`** : enregistre l'appli et copie l'objet `firebaseConfig`.
7. Colle-le dans `js/config.js` à la place de `null` (`window.FIREBASE_CONFIG = { ... };`), puis renvoie le fichier sur GitHub.

La clé `apiKey` de Firebase n'est pas un secret : c'est normal qu'elle soit visible, ce sont les règles qui protègent la base.

### Règles Firestore complètes

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function heroes() { return ['christian', 'guilhem', 'fateh', 'faouzi', 'venum', 'senoussi', 'purf']; }
    function boards() {
      return ['histoire', 'bossrush',
              'christian', 'guilhem', 'fateh', 'faouzi', 'venum', 'senoussi', 'purf',
              'survie-christian', 'survie-guilhem', 'survie-fateh', 'survie-faouzi',
              'survie-venum', 'survie-senoussi', 'survie-purf'];
    }
    function okInt(v) { return v is int && v >= 0 && v < 100000000; }
    // table { héros: entier } (histoires terminées, records…)
    function intMap(m) {
      return m is map && m.keys().hasOnly(heroes())
        && okInt(m.get('christian', 0)) && okInt(m.get('guilhem', 0)) && okInt(m.get('fateh', 0))
        && okInt(m.get('faouzi', 0)) && okInt(m.get('venum', 0)) && okInt(m.get('senoussi', 0))
        && okInt(m.get('purf', 0));
    }

    // ---------- Classements : un tableau par mode ----------
    match /boards/{board}/scores/{id} {
      allow read: if board in boards() || board.matches('defi-[0-9]{8}');
      allow create: if request.auth != null
        && (board in boards() || board.matches('defi-[0-9]{8}'))   // défi du jour : un tableau par date
        && request.resource.data.keys().hasOnly(['name', 'score', 'hero', 'ts'])
        && request.resource.data.keys().hasAll(['name', 'score', 'hero'])
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 16
        && request.resource.data.score is int
        && request.resource.data.score >= 0 && request.resource.data.score < 1000000
        && request.resource.data.hero in heroes()
        && (!('ts' in request.resource.data) || request.resource.data.ts is int);
      allow update, delete: if false;
    }

    // ---------- Sauvegarde de la progression : un document par joueur ----------
    match /saves/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid
        && validSave(request.resource.data, uid);
      allow delete: if false;
    }
    function validSave(d, uid) {
      return d.keys().hasOnly(['uid', 'v', 'name', 'unlocked', 'storyWinsBy', 'cleared',
                               'survWave', 'survScore', 'rushBest', 'diffMax',
                               'stars', 'xp', 'trophies', 'updatedAt'])
        && d.keys().hasAll(['uid', 'v', 'unlocked', 'updatedAt'])
        && d.uid == uid                                     // uid obligatoire, et c'est bien le sien
        && d.v is int
        && (!('name' in d) || (d.name is string && d.name.size() <= 16))
        && d.unlocked is map && d.unlocked.keys().hasOnly(['senoussi', 'purf'])
        && d.unlocked.get('senoussi', false) is bool && d.unlocked.get('purf', false) is bool
        && intMap(d.get('storyWinsBy', {})) && intMap(d.get('cleared', {}))
        && intMap(d.get('survWave', {})) && intMap(d.get('survScore', {}))
        && (!('rushBest' in d) || okInt(d.rushBest))
        && (!('diffMax' in d) || (d.diffMax is int && d.diffMax >= 1 && d.diffMax <= 3))
        && intMap(d.get('stars', {})) && intMap(d.get('xp', {}))
        && (!('trophies' in d) || (d.trophies is list && d.trophies.size() <= 60))
        && d.updatedAt == request.time;                     // horodatage du serveur
    }
  }
}
```

Ces règles acceptent tous les tableaux du jeu (`histoire`, `bossrush`, un par monde, `survie-<monde>`, et `defi-AAAAMMJJ` pour le défi du jour) et refusent les autres.

**À recoller après la v3.7** : sans ces règles, le classement du défi du jour reste sur l'appareil, et les étoiles, trophées et niveaux des héros ne suivent pas d'un appareil à l'autre (rien n'est perdu pour autant). Envoyer un score demande d'être connecté : le compte anonyme créé automatiquement suffit (c'est pourquoi la connexion **Anonyme** doit être activée).

## Structure

```
index.html            écrans, contrôles, balises de partage (Open Graph)
css/style.css         style des menus et des boutons tactiles
js/config.js          configuration Firebase + numéro de version affiché
js/data.js            BALANCE (difficulté), persos, phrases, ennemis, mondes, sauvegarde locale
js/draw.js            dessin des persos, ennemis, véhicules, dangers, objets
js/backgrounds.js     décors des 7 mondes (parallaxe), premier plan, particules, teintes
js/entities.js        combattants (héros et ennemis)
js/game.js            niveau, vagues, IA, boss et phases, dangers, modes, HUD
js/combat.js          combos, attraper/lancer, caisses, bonus des dangers
js/events.js          événements de milieu de monde (briques d'or, battle de rap, pétanque…)
js/progress.js        étoiles, trophées, niveaux des héros, défi du jour
js/tiers.js           niveau en 3 tiers, mini-boss, point de reprise, GO, aides, objectifs (pause)
js/minis.js           dessins des mini-boss, de leurs armes, projectiles et véhicules
js/boss.js            boss : attaque signature annoncée, essoufflement, 3 comportements (v3.15)
js/rage.js            ennemis spéciaux, costaud, ennemis du décor, armes à manier, appel à un pote, ennemi visé
js/extras.js          bonus temporaires, ennemi en or, attaques des boss annoncées, chrono et médailles, onomatopées, entrée et K.O. des boss
js/share.js           image de score à partager
js/audio.js           mixage, bruitages, musiques écrites et arrangement, ambiances, voix (fichiers ou synthèse)
sounds/               sons enregistrés (pets, rots, arrivée des boss, voiture, game over, fin de niveau)
voices/               voix des personnages, facultatif (générées par tools/make-voices.py)
js/input.js           clavier, joystick, boutons, vibrations
js/cloud.js           sauvegarde en ligne (Firebase Auth anonyme + Google, Firestore)
js/scores.js          classements (local / Firestore)
js/ui.js              menus, modes, réglages
sw.js, manifest.webmanifest, icons/   appli installable (PWA) et mises à jour
tools/make-og.html    fabrique l'image de partage et les icônes
tools/make-voices.py  fabrique les voix des personnages (voices/)
tests/                tests automatiques (lancés par GitHub à chaque demande de fusion) : fumee.js, martelage.js, ecrans.js, histoire.js, boss.js, outils.js ; equilibrage.js affiche la vie et les dégâts de chaque adversaire par niveau de difficulté
```

Pour tester en local : `python3 -m http.server` dans ce dossier puis http://localhost:8000 (ou ouvre simplement `index.html` ; tout marche sauf l'installation et la connexion Google).
