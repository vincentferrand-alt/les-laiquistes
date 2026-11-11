# -*- coding: utf-8 -*-
"""
Génère les voix des personnages en fichiers MP3 (voices/), avec les voix neuronales gratuites de Microsoft (Edge).
À lancer UNE fois sur ton ordinateur (il faut Internet), puis à mettre sur GitHub avec le reste du jeu.

  1. Installer Python 3 (python.org), puis dans un terminal :   pip install edge-tts
  2. Depuis le dossier du jeu :                                  python tools/make-voices.py
     (sous Windows :  py tools/make-voices.py)
  3. Le dossier voices/ se remplit (un MP3 par phrase + manifest.json). Pousser voices/ sur GitHub.

Les phrases sont lues directement dans js/data.js : si tu ajoutes ou changes une phrase, relance le script.
Si une phrase n'a pas de fichier, le jeu utilise la voix du navigateur comme avant.

Pour changer la voix d'un personnage, modifie le tableau VOIX ci-dessous :
  voice = nom de la voix (liste complète :  edge-tts --list-voices | findstr fr-   ou   | grep fr-)
  pitch = hauteur (« -20Hz » = plus grave), rate = vitesse (« -10% » = plus lent)
"""
import asyncio, json, os, re, sys

try:
    import edge_tts
except ImportError:
    sys.exit("Il manque le module edge-tts. Installe-le avec :  pip install edge-tts")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'voices')

VOIX = {
    'christian': dict(voice='fr-FR-HenriNeural',   pitch='-6Hz',  rate='+6%'),    # maçon bourru
    'guilhem':   dict(voice='fr-CA-JeanNeural',    pitch='-4Hz',  rate='-6%'),    # posé, frimeur
    'fateh':     dict(voice='fr-BE-GerardNeural',  pitch='-2Hz',  rate='+0%'),    # autoritaire
    'faouzi':    dict(voice='fr-CH-FabriceNeural', pitch='+14Hz', rate='+10%'),   # geek excité
    'venum':     dict(voice='fr-CA-AntoineNeural', pitch='-10Hz', rate='+2%'),    # boxeur
    'senoussi':  dict(voice='fr-FR-HenriNeural',   pitch='-18Hz', rate='-12%'),   # berger, voix grave et lente
    'purf':      dict(voice='fr-CA-ThierryNeural', pitch='-24Hz', rate='-14%'),   # toxique, très grave
    # mini-boss (v3.9)
    'marcel':    dict(voice='fr-FR-HenriNeural',   pitch='-12Hz', rate='-12%'),   # vieux Français
    'clement':   dict(voice='fr-FR-HenriNeural',   pitch='+30Hz', rate='+12%'),   # ado de 15 ans
    'cecile':    dict(voice='fr-FR-DeniseNeural',  pitch='+4Hz',  rate='+10%'),   # voix féminine, pressée
    'leblond':   dict(voice='fr-CH-FabriceNeural', pitch='+6Hz',  rate='+4%'),    # astronome
    'clapet':    dict(voice='fr-CA-ThierryNeural', pitch='+20Hz', rate='+18%'),   # petit téléphone nasillard
    'moutong':   dict(voice='fr-FR-HenriNeural',   pitch='-30Hz', rate='-20%'),   # mouton géant, très grave
    'minipurf':  dict(voice='fr-CA-ThierryNeural', pitch='-8Hz',  rate='-6%'),    # The Purf en plus petit
}
SECOURS = 'fr-FR-HenriNeural'  # si une voix n'existe pas / plus


def lire_phrases():
    """Extrait { id: [phrases] } de js/data.js (on lit les chaînes JS à la main, guillemets simples ou doubles)."""
    src = open(os.path.join(ROOT, 'js', 'data.js'), encoding='utf-8').read()
    res = {}
    for m in re.finditer(r"\n  (\w+): \{\s*\n\s*id: '(\w+)'", src):
        cid = m.group(2)
        bloc = src[m.end():src.find('\n  },', m.end())]
        p = bloc.find('phrases: [')
        if p < 0:
            continue
        i, txt, items = p + len('phrases: ['), bloc, []
        while i < len(txt) and txt[i] != ']':
            if txt[i] in '\'"':
                q, j, s = txt[i], i + 1, ''
                while txt[j] != q:
                    if txt[j] == '\\':
                        j += 1
                    s += txt[j]; j += 1
                items.append(s); i = j + 1
            else:
                i += 1
        res[cid] = items
    return res


async def generer(texte, reglage, chemin):
    for voix in (reglage['voice'], SECOURS):
        try:
            await edge_tts.Communicate(texte, voix, rate=reglage['rate'], pitch=reglage['pitch']).save(chemin)
            return voix
        except Exception as e:  # voix inconnue, coupure réseau…
            print('   ! échec avec', voix, ':', e)
    return None


async def main():
    os.makedirs(OUT, exist_ok=True)
    phrases = lire_phrases()
    # On ne refait que ce qui a changé (phrase ou réglage de voix) : sinon les fichiers changeraient à chaque fois
    # et GitHub signalerait des conflits. « --tout » pour tout refaire.
    tout = '--tout' in sys.argv
    avant = {}
    try:
        for f in json.load(open(os.path.join(OUT, 'manifest.json'), encoding='utf-8')).get('files', []):
            avant[f['file']] = f
    except Exception:
        pass
    manifest = []
    for cid, liste in phrases.items():
        reglage = VOIX.get(cid, dict(voice=SECOURS, pitch='+0Hz', rate='+0%'))
        for n, texte in enumerate(liste, 1):
            nom = f'{cid}-{n}.mp3'
            entree = {'kind': cid, 'text': texte, 'file': nom, 'voice': reglage['voice'], 'pitch': reglage['pitch'], 'rate': reglage['rate']}
            a = avant.get(nom)
            if not tout and a and os.path.exists(os.path.join(OUT, nom)) and a.get('text') == texte \
                    and (a.get('voice'), a.get('pitch'), a.get('rate')) in ((reglage['voice'], reglage['pitch'], reglage['rate']), (None, None, None)):
                print(f'{nom:16} inchangé')
                manifest.append(entree); continue
            print(f'{nom:16} « {texte} »')
            if await generer(texte, reglage, os.path.join(OUT, nom)):
                manifest.append(entree)
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump({'files': manifest}, f, ensure_ascii=False, indent=1)
    print(f'\n{len(manifest)} voix créées dans voices/. Pense à changer VERSION (sw.js) avant la mise en ligne.')


asyncio.run(main())
