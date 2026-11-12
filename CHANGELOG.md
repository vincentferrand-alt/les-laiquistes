# Les laïquistes — v3.15.0 : des boss plus lisibles

Cinquième étape de la refonte (5/9).

## Ce qui change dans un combat de boss
- **Trois comportements nets**, selon le niveau de la barre de vie :
  1. niveaux 1 et 2 : coups simples et attaque signature de temps en temps (toutes les 8 à 10 s) ;
  2. niveaux 3 et 4 : la signature revient plus souvent (6 à 7,5 s) et le boss ajoute sa seconde attaque — annonce « IL S'ÉNERVE ! » ;
  3. niveau 5 : il enchaîne plus vite (4,5 à 5,5 s) — annonce « IL EST À BOUT ! ».
- **Une attaque signature par boss, annoncée au sol au moins 0,9 s** (1,2 s en Tranquille, 1 s en Costaud, 0,9 s en Laïque ultime) :

| Boss | Attaque signature | Seconde attaque (comportements 2 et 3) |
|---|---|---|
| Christian | pluie de briques de la grue, 4 zones marquées | coup de truelle (onde de choc) |
| Guilhem | éclat de Rolex : grand cercle doré autour de lui | liasses de billets en éventail |
| Fateh | « J'ai un impératif » : charge sur un couloir marqué | Aïka lâchée sur sa ligne |
| Faouzi | cartouche géante : cible au sol, puis explosion | salve de trois cartouches |
| Venum | direct foudroyant : charge sur un couloir marqué | frappes de drones sur trois cibles |
| Senoussi | coup de pelle sismique : fissure sur une ligne marquée | appel des agneaux |
| The Purf | « Rendez-moi mon argent ! » : charge qui laisse des flaques | nuage toxique |

- **Un moment de faiblesse après chaque signature** : le boss est « ESSOUFFLÉ ! » (💦) pendant 1,5 s — 2 s après une charge, qui l'emmène plus loin. Il ne fait rien et encaisse tous les coups. S'il perd un niveau à ce moment-là, il n'a pas sa courte invulnérabilité.
- **Plus de dangers du décor pendant le combat** (briques, voiture, laser, tempête de sable… s'arrêtent à l'arrivée du boss, y compris quand il revient en Survie).
- **Des renforts seulement aux deux changements de comportement** : 1 ennemi en Tranquille, 2 en Costaud, 3 en Laïque ultime à chaque fois. Avant : un ennemi toutes les 11 à 15 s pendant tout le combat.

## Ce qui disparaît
- La « PHASE 2 » (déclenchée à 60 % de vie, 80 % en Laïque ultime) est remplacée par les trois comportements. Ses attaques sont devenues les signatures ou les secondes attaques ci-dessus : aucune attaque n'a été supprimée.
- L'éclat de Rolex du boss Guilhem ne touche plus toute la largeur de l'écran : seulement le cercle annoncé.

## Ce qui ne change pas
- La barre en 5 niveaux, une phrase avec voix à chaque niveau perdu, les arrivées, les entourages, le bandeau, le K.O. au ralenti, la vie et les dégâts des boss, les mini-boss.

## Technique
- Nouveau fichier `js/boss.js` (ajouté à `index.html` et à `sw.js`). Réglages : `BALANCE.boss.sig` dans `js/data.js`.
- Nouveau test `tests/boss.js` : un robot combat les 7 boss et vérifie l'annonce d'au moins 0,9 s, l'essoufflement après chaque signature, les 3 comportements, les renforts et l'absence de dangers du décor.

---

# Les laïquistes — v3.14.0 : continuer l'histoire

Quatrième étape de la refonte (4/9), première partie. Rien ne disparaît. (Les nouveaux seuils des médailles viendront dans une version suivante, à partir de temps réels.)

## Continuer l'histoire
- **L'histoire en cours est enregistrée** au début de chaque monde, et dès qu'un monde est gagné : héros, ordre des mondes, numéro du monde, score, vie, niveau de difficulté.
- Le titre propose alors **« CONTINUER L'HISTOIRE (monde 3/6) »**, et « MODE HISTOIRE » devient **« NOUVELLE HISTOIRE »**.
- On reprend au **début du monde** où l'on s'était arrêté, avec le score et la vie qu'on avait en y entrant (pas au milieu d'un monde).
- Une défaite ou un retour au menu garde l'histoire. Elle est effacée quand on la termine, et remplacée quand une nouvelle histoire commence (au lancement de son premier monde).
- Sur l'écran de victoire d'un monde, le bouton « Abandonner » s'appelle maintenant « Menu (histoire gardée) ».
- La sauvegarde est **sur l'appareil seulement** : elle ne suit pas d'un téléphone à l'autre et ne touche pas à Firebase.

## Tests automatiques
- Nouveau test `tests/histoire.js` : commence une histoire, gagne un monde, ferme et rouvre le jeu, continue, perd, puis termine.

---

# Les laïquistes — v3.13.0 : élagage

Troisième étape de la refonte (3/9). Cette version retire ou simplifie quatre choses.

## Ce qui disparaît ou change
- **Les objets à lancer disparaissent** (brique, vinyle, boule, cartouche, batterie, jarre, bidon). Une caisse donne maintenant un bonus (30 %), une arme à manier (35 %) ou de la nourriture (35 %). Avant : bonus 30 %, arme 21 %, objet à lancer 29 %, nourriture 20 %.
  - Attraper et lancer un ennemi ne change pas. Les trophées « Strike ! » et « Lanceur » se gagnent toujours en lançant des ennemis.
  - Défi du jour « Déménagement » : « toujours une arme ou un bonus » au lieu de « toujours un objet à lancer ».
  - Le tableau des commandes (pause) explique l'arme à la place de l'objet à lancer.
- **Une seule barre de vie par ennemi courant** : les petites barres au-dessus des têtes disparaissent. La barre de l'ennemi visé (le dernier touché) passe sous le panneau du héros, comme dans Streets of Rage. L'ennemi en or y apparaît aussi, en doré. Boss et mini-boss gardent leur grande barre en bas.
- **Les niveaux des héros ne donnent plus de vie ni de force** (c'était +3 % et +2 % par niveau, soit jusqu'à +27 % et +18 %). Le classement partagé et le défi du jour deviennent équitables. Le niveau reste affiché, sous le nom de **grade** ; l'expérience et le trophée « Vétéran » restent.
  - ⚠ Un héros déjà monté en niveau sera donc un peu moins fort qu'avant.

## Équilibrage regroupé (aucune valeur ne change)
- Un seul tableau par niveau de difficulté, `LEVEL_TABLE` dans `js/data.js` : une ligne par réglage, une colonne par niveau (Tranquille, Costaud, Laïque ultime).
- Une seule fonction de calcul, `Tuning` (dans `js/data.js`) : vie, dégâts et délais des ennemis, des mini-boss et des boss. Avant, les formules étaient réparties dans quatre fichiers.
- Vérification : `tests/equilibrage.js` relève la vie et les dégâts de chaque adversaire dans le vrai jeu (3 niveaux × 4 situations × 7 mondes, 744 lignes). Le relevé est identique avant et après.

---

# Les laïquistes — v3.12.0 : l'écran de téléphone

Deuxième étape de la refonte (2/9). Rien ne disparaît ; trois boutons du titre ont changé de place (voir « Menu titre »).

## Tous les écrans tiennent sur un téléphone
- En 844×390 et en 740×360, plus aucun écran n'a besoin d'être défilé : choix du personnage (le titre et « C'EST PARTI ! » étaient hors écran), réglages, victoire, défi du jour. Les listes longues (trophées, classements) défilent toujours dans leur cadre.
- Choix du personnage : la grille s'adapte à la hauteur, la fiche du héros est resserrée, les trois difficultés tiennent sur une ligne, « Retour » et « C'EST PARTI ! » sont côte à côte.
- Réglages sur deux colonnes ; victoire sur trois colonnes (le héros qui danse, le décompte, les étoiles) ; défi du jour sur deux colonnes (l'image et les règles, le classement du jour).
- La version et « Mettre à jour » restent en bas à gauche, en plus compact sur téléphone, et ne passent plus sur aucun bouton.

## Menu titre regroupé
- Trois gros boutons : **MODE HISTOIRE**, **CHOIX DU NIVEAU**, **AUTRES MODES**.
- **AUTRES MODES** ouvre un nouvel écran avec **Boss Rush**, **Survie** et **Défi du jour** (qui étaient sur le titre).
- Une rangée d'icônes : Trophées, Classement, Réglages, Son, Plein écran, Partager (et Installer quand c'est possible).

## En jeu
- **Le héros ne passe plus sous le joystick** : une zone protégée existe maintenant à gauche, comme à droite. Celle de droite est un peu élargie (le héros passait encore sous le bouton POTE). Les ennemis n'y entrent pas non plus ; ils arrivent du vrai bord de l'écran. Réglage : `SAFE` au début de `js/game.js`.
- Un bonus, de la nourriture ou une arme tombés sous le joystick ou les boutons glissent vers la zone jouable.
- **Le premier plan ne cache plus les combats** : poteaux, cactus, buissons et barrières deviennent translucides devant la zone où l'on se bat (ils restent nets en haut de l'écran). Les décors ne sont pas redessinés.
- **Plus de pointes noires** au-dessus des textes (contours arrondis).
- **Affichage allégé** : le nom du monde n'est plus affiché pendant le jeu (il est annoncé en grand au début) ; le bonus en cours est une petite icône entourée d'une jauge, à droite du panneau du héros, au lieu d'un grand panneau.

## Tests automatiques
- Nouveau test `tests/ecrans.js` : ouvre les 13 écrans en 844×390 et 740×360 ; échec si l'un d'eux doit être défilé, si un bouton sort de l'écran ou passe sous la version.

---

# Les laïquistes — v3.11.0 : des coups qui touchent

Première étape de la refonte (1/9). Rien ne disparaît.

## Les coups
- **Le héros avance d'un petit pas** (25 px) à chaque coup de l'enchaînement. Il s'arrête juste avant de marcher sur l'ennemi et ne sort pas de l'écran.
- **Un coup simple repousse beaucoup moins l'ennemi** : environ 13 px au lieu de 36. Le 3e coup garde sa grosse projection.
- **Légère aide à la visée** : un peu plus de tolérance en profondeur pour les coups du héros, et il se recale un peu (16 px au plus) vers l'ennemi le plus proche devant lui pendant son élan.
- **Un ennemi à terre peut être frappé** (avant, il était intouchable pendant 1 seconde). Il reste couché le même temps, et un gros coup le fait rebondir. Il n'a plus son court instant d'invulnérabilité en se relevant.
- **Le héros renversé se relève plus vite** : 0,6 s au sol au lieu de 1 s (il reste protégé tant qu'il est à terre, et 1 s après).
- Mesure (« je martèle FRAPPE sans bouger contre un rappeur qui s'approche », sur 9 coups) : avant, 1 à 3 coups touchaient (jusqu'à 7 avec Senoussi) ; maintenant 9 sur 9 pour les 7 héros.
- Tous ces réglages sont regroupés dans le tableau `FEEL` au début de `js/data.js`.
- ⚠ Le jeu devient plus facile. C'est voulu à cette étape : la difficulté sera réglée après essai.

## Tests automatiques
- Nouveau dossier `tests/` (ne fait pas partie du jeu) et action GitHub « Tests automatiques », lancée à chaque demande de fusion :
  - `tests/fumee.js` : un robot joue le début de chaque monde, chaque boss (Boss Rush) et une Survie, sur écran de PC et de téléphone ; échec à la moindre erreur JavaScript.
  - `tests/martelage.js` : refait la mesure ci-dessus ; échec si un héros touche moins de 8 coups sur 9.
- Les tests tournent sans Internet : ils n'écrivent rien dans Firebase ni dans les classements.

---

# Les laïquistes — v3.10.0 : un peu de Streets of Rage

- **Un ennemi spécial par monde**, qui arrive au 3e tiers et pendant le boss : Marteau-piqueur qui fait trembler le sol (Christian), Ballon de basket qui rebondit (Guilhem), Basket de course qui fonce (Fateh), Glitch qui se téléporte derrière toi (Faouzi), Tableur qui lance des « #DIV/0! » (Venum), Chèvres qui chargent (Senoussi), Fût radioactif qui explose — aussi sur les autres ennemis (The Purf).
- **Le gros Costaud** : un par vague aux 2e et 3e tiers (toutes les 4 vagues en Survie). Impossible à attraper, il ne recule pas sous les coups simples : il faut le renverser (3e coup du combo, coup sauté, plongeant, objet lancé). Il lâche une arme.
- **Ennemis qui sortent du décor** : certains tombent d'en haut, d'autres sortent d'une bouche d'égout.
- **Armes à manier**, une par monde (tuyau, micro, témoin de relais, manette géante, sabre néon, houlette, pied-de-biche) : plus fortes, plus d'allonge, cassent après 8 coups. Dans les caisses et sur le Costaud.
- **Appel à un pote** (bouton 📣 POTE, touche L ou V) : une fois par monde, un autre laïquiste traverse l'écran et renverse tout le monde (toutes les 5 vagues en Survie).
- **Barre de l'ennemi visé** en haut à droite : petite tête, nom et vie du dernier ennemi touché.
- **Décompte des points** sur l'écran de victoire : ennemis, bonus temps et bonus vie défilent, et s'ajoutent au score.
- Le téléphone à clapet n'affiche plus de nom de marque (il porte « CLAPET 3000 »).

---

# Les laïquistes — v3.9.0 : niveaux en 3 tiers et mini-boss

## Niveaux en 3 tiers
- **1er tiers** : deux vagues, puis le **mini-boss** du monde. **2e tiers** : une vague, puis l'**épreuve**. **3e tiers** : une vague, puis le **boss**. Niveaux un peu plus longs.
- **Barre de progression** en haut avec 3 repères (💀 mini-boss, 🎯 épreuve, 👑 boss) qui passent au vert une fois franchis.
- **Reprise au début du tiers** : en cas de défaite, « REPRENDRE AU TIERS 2 / 3 » repart du début du tiers avec le score de ce moment-là (« Recommencer le monde » reste possible).
- Seuils des médailles relevés : 🥇 moins de 3:45, 🥈 moins de 4:45, 🥉 moins de 6:00.

## Les 7 mini-boss
Plus simples qu'un boss : barre de vie en 3 niveaux, un coup et une attaque spéciale annoncée au sol, pas de phase 2. Battu : 500 points, de la vie et un bonus.
- **Marcel** (monde de Christian) : vieux Français, béret, canne et baguette. Arrive en solex. « Vive la France ! » · lance des baguettes.
- **Clément** (Guilhem) : l'ado de 15 ans, sort de sa voiture sans permis. « Rachète-moi une PS5 ! » · lance des manettes.
- **Cécile** (Fateh) : blonde, pas très grande, au téléphone. « Fateh, rappelle-moi tout de suite ! » · ondes de sonnerie.
- **Le Blond** (Faouzi) : taille de Faouzi, blond, attaque au télescope, arrive en étoile filante. « Laissez Faouzi tranquille, son trou noir m'appartient ! » · trou noir qui aspire.
- **Clapet 3000** (Venum) : téléphone Samsung noir à clapet, tombe du ciel. « Vive Samsung et les téléphones à clapet ! » · rafale de SMS.
- **Mouton géant** (Senoussi) : déboule en chargeant. « Bêêêêê ! Qu'est-ce que tu veux ? » · charge.
- **Mini Purf** (The Purf) : The Purf en plus petit, sort d'un nuage toxique. « Vous aimez le parmesan ? Vous allez en avoir ! » · parmesan en éventail.
- En **Survie**, le mini-boss revient aux vagues 3, 8, 13…

## Et aussi
- **Gros « GO ! »** avec flèches et tes deux voix enregistrées (en alternance). Il reste tant qu'on n'avance pas et revient si on attend plus de 4 s.
- **Aides de la première fois** : « Maintiens FRAPPE pour l'attraper », « Lâche FRAPPE pour le lancer », « Ton spécial est prêt » (le bouton clignote sur téléphone). Elles disparaissent une fois le geste réussi.
- **Duel verbal à l'intro** : le héros lance une de ses phrases, le boss lui répond (bulles + voix).
- **Objectifs dans le menu pause** : tiers en cours, étoiles encore possibles, médaille encore atteignable, ennemi en or. Les commandes sont repliées sous « 🎮 Commandes ».
- **26 nouvelles phrases** pour les 7 héros/boss. Les voix (héros et mini-boss) sont générées par l'action GitHub « Générer les voix » après la fusion.

---

# Les laïquistes — v3.8.0 : finitions graphiques et petits plus de jeu

## Graphismes
- **Onomatopées des héros** : TCHAK ! (Christian), BLING ! (Guilhem), WOUF ! (Fateh), BLIP ! (Faouzi), POW ! (Venum), BÊÊÊ ! (Senoussi), SPLOTCH ! (The Purf). Sur les gros coups, elles sortent sur une étoile de BD.
- **Entrée des boss** : ralenti et grand bandeau à rayures avec le boss en grand, puis la petite carte habituelle.
- **K.O. du boss** : ralenti, zoom, flash, il s'envole en tournoyant (la bannière « Je t'ai planté ! » attend la fin).
- **Ambiance animée par monde** : rayons de soleil, pétales de lavande, projecteurs, lignes d'écran rétro, pluie de néons, mirage, smog. Coupée automatiquement si l'appareil rame.
- **Élasticité** : écrasement à l'atterrissage, rebond quand on prend un coup.
- **Fin de niveau festive** : confettis, le héros danse, les étoiles arrivent une par une avec un « ding ».

## Jeu
- **Bonus temporaires** (un par monde) : casque, Rolex, os, champignon, canette, thé, masque à gaz. Dans les caisses, sur l'ennemi en or, et le boss en lâche un en cours de combat.
- **Ennemi en or** : un par monde (une vague sur trois en Survie). Il fuit et s'échappe au bout de 12 s. Battu : 1 000 points et un bonus.
- **Attaques des boss annoncées au sol** pendant leur préparation (zone rouge, couloir avec flèches).
- **Chrono et médailles de vitesse** par monde (🥇 < 2:50, 🥈 < 3:35, 🥉 < 4:30), sur les cartes des mondes.
- **Image de score à partager** (📸 Partager) en fin de partie, victoire comme défaite.
- 2 nouveaux trophées : Ruée vers l'or, Éclair (24 au total).

Rien à changer dans Firebase : médailles et temps restent sur l'appareil.

---

# Les laïquistes — v3.7.0 : progression et défi du jour

## Correction
- **Fin d'épreuve** : le héros restait bloqué dans sa pose de victoire (il fallait qu'un ennemi le touche). Il reprend la main après 1,4 s.

## Progression (`js/progress.js`)
- **Étoiles** par monde (3) : boss vaincu · épreuve réussie · plus de la moitié de sa vie. Sur les cartes des mondes et l'écran de victoire.
- **Niveaux des héros** 1 à 10 (+3 % vie, +2 % force par niveau), expérience affichée en fin de partie (même en cas de défaite) et sur l'écran du choix du perso.
- **22 trophées** avec un écran dédié et un message quand on en gagne un.

## Défi du jour
- Même défi pour tous chaque jour : monde + héros imposé + règle du jour (Turbo, Ennemis géants, Fragile, Déluge, Combo fou, Déménagement). Classement du jour partagé, record du jour sur l'appareil.

## En ligne
- Étoiles, XP et trophées sauvegardés en ligne. **Nouvelles règles Firestore dans le README** (sinon tout reste sur l'appareil, rien n'est perdu).

---

# Les laïquistes — v3.6.0 : combat et événements

## Combat (`js/combat.js`)
- **Combos** : gros compteur avec jauge, paliers ×10 / ×25 / ×50 / ×100 (bonus, ralenti, arpège), ennemi éjecté par le coup final, ralenti et « K.O. ! » sur le dernier ennemi d'une vague.
- **Attraper / lancer** : appui long sur FRAPPE près d'un ennemi, puis lâcher : il renverse ceux qu'il croise.
- **Caisses** (3 par monde, une par décor) → nourriture ou **objet à lancer** du monde (brique, vinyle, boule, cartouche, batterie, jarre, bidon).
- **Bonus** quand un danger du décor ou un lancer élimine des ennemis (« BIEN ENVOYÉ ! », « STRIKE ! », « DOUBLÉ ! », « TRIPLÉ ! »).

## Événements de milieu de monde (`js/events.js`)
- Une épreuve par monde entre la 2e et la 3e vague : briques d'or (Christian), battle de rap (Guilhem), pétanque (Fateh), niveau bonus (Faouzi), drone voleur (Venum), mouton d'or (Senoussi), opération nettoyage (The Purf).
- Réussite : +800 points × niveau, +30 vie. Échec : on continue sans pénalité.

## Divers
- Commandes « attraper / lancer » ajoutées dans le menu pause et le README.

---

# Les laïquistes — v3.5.0 : graphismes

- **Gros contour noir** autour de chaque personnage (style Castle Crashers), en jeu et dans les menus.
- **Éclairage des persos** : haut du corps éclairé, jambes dans l'ombre ; **ombres au sol douces**, plus petites et plus pâles quand on saute.
- **Yeux expressifs** : blanc de l'œil, pupille tournée vers l'avant, reflet, clignement ; sourcils froncés quand il frappe, levés quand il nargue ou fête sa victoire.
- **Profondeur des décors** : brume au loin près de l'horizon, sol plus sombre au fond et plus clair devant, grain léger qui défile avec le sol.
- **Effets lumineux** : étincelles et étoiles d'impact avec halo.
- **Qualité automatique** : si l'appareil rame (moins de 45 images/s trop souvent), le jeu retire d'abord le contour des petits ennemis, puis l'éclairage.

---

# Les laïquistes — v3.4.1 : vrais sons

- **Sons enregistrés** fournis par Vincent, nettoyés (blancs coupés, volumes égalisés, MP3 mono pour les bruitages) :
  - 5 pets et 2 rots à la place des sons de synthèse (même règle : environ 1 KO sur 3, montrés à l'écran) ; un boss vaincu part sur le pet en 4 temps ;
  - **arrivée des boss** (remplace le grondement de synthèse ; le rugissement de phase 2 reste synthétisé) ;
  - **camionnette de Christian** : le moteur enregistré tourne en boucle tant qu'elle roule, puis freinage et klaxon ;
  - **game over** (remplace le trombone de synthèse) ;
  - **fin de niveau** : « blague nulle » sur l'écran de victoire (la victoire totale garde sa fanfare).
- Si un fichier manque, le jeu retombe sur l'ancien son de synthèse.
- `tools/make-bruitages.py` supprimé (plus utilisé).

---

# Les laïquistes — v3.4.0 : difficulté, version, pets et rots lisibles

## Niveaux de difficulté
- **3 niveaux** : ★ Tranquille (score ×1), ★★ Costaud (×1,5, = l'équilibrage de la v3.3), ★★★ Laïque ultime (×2).
- Tout le monde commence en Tranquille ; finir le mode histoire débloque le niveau suivant **pour tous les héros**. Choix sur l'écran du perso (niveaux verrouillés : 🔒 + explication).
- Le niveau touche : vie, dégâts et rythme d'attaque des ennemis et des boss, durée des « ! » d'annonce, nombre d'ennemis à l'écran et de renforts, fréquence et dégâts des dangers, nourriture, enchaînements des boss, début de la phase 2 (80 % en Laïque ultime). Réglages : `BALANCE.levels`.
- Le niveau est rappelé sur l'écran d'intro de chaque monde.
- Sauvegarde en ligne du niveau débloqué (`diffMax`) : nouvelles règles Firestore dans le README. Avec les anciennes règles, le jeu renvoie la sauvegarde sans ce champ (rien n'est perdu).

## Version et mise à jour
- **Version en bas à gauche de tous les menus** + bouton **⟳ Mettre à jour** (cherche, charge et relance ; sinon « Tu as la dernière version »).

## Pets et rots lisibles
- Pet : « PROUUUT ! » vert qui tremble, nuage verdâtre qui sort de l'arrière, lignes d'odeur.
- Rot : « BUUURP ! » jaune qui sort de la bouche, ondes et postillons.

---

# Les laïquistes — v3.3.0 : son et iPad

## Mixage
- **Plus de petits « clics »** au début des sons (montée de 3–4 ms sur chaque bruitage et percussion).
- **Plus de saturation** quand tout tape en même temps : nombre de sons simultanés limité par famille (coups, KO, aboiements, pas…), compresseurs séparés pour la musique et les effets (les coups ne font plus « respirer » la musique), limiteur en sortie.
- **Réverbération** légère sur la musique et les effets (impulsion calculée, pas de fichier).
- **Curseur Ambiance** séparé (avant, les ambiances suivaient le curseur Effets, 1,6 fois plus fort).
- **Curseurs progressifs** (en décibels) : on règle finement dans les volumes bas.
- **Volumes par défaut plus bas** : musique ≈ 2 dB sous la v3.2, ambiance nettement plus discrète, effets au même niveau. Seuls les appareils qui n'avaient jamais touché aux curseurs changent ; les autres gardent leur volume (converti sur la nouvelle échelle). Rien à dire aux joueurs.
- **iPad / iPhone : le son joue même en mode silencieux** (iOS 17+).

## Bruitages
- **Coups en 3 couches** (choc, claquement, chair) + **couleur de l'arme** de chaque héros ; le son monte avec le combo et la série.
- **8 pets et 5 rots réalistes** (fichiers générés par `tools/make-bruitages.py`) : environ un KO sur trois, jamais deux de suite, tirés sans répétition ; les autres KO font un « pouf » cartoon avec étoiles. Un boss vaincu part sur un long pet.
- Pas plus discrets, souffle d'attaque plus ample au 3e coup.

## Musique
- **Arrangement** : intro, contre-chant, break de 4 mesures, passage un ton plus haut, roulements toutes les 4 mesures. La boucle ne se répète plus à l'identique.
- **Changement de musique calé sur la mesure** (plus de coupure) ; le thème du boss démarre par une mesure de montée.

## Voix
- Le jeu lit des **fichiers de voix** s'ils existent (`voices/`, créés par `tools/make-voices.py` avec les voix neuronales gratuites de Microsoft), sinon la synthèse du navigateur comme avant.

## iPad
- **Joystick et boutons proportionnels à l'écran** : × 1,6 sur iPad (joystick 208 px au lieu de 130, FRAPPE 154 px au lieu de 96), inchangés sur téléphone.
- **⚙ Réglages → Commandes tactiles** : Normales / Grandes / Très grandes.
- Le joystick reste flottant ; son socle revient à sa place au relâchement.
- Les boutons tactiles ne disparaissent plus sur un iPad avec clavier ou trackpad branché.

---

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
