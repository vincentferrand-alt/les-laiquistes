# -*- coding: utf-8 -*-
"""
Fabrique les bruitages « réalistes » du jeu (8 pets, 5 rots) par synthèse, sans enregistrement.
Sortie : sounds/pet-1.mp3 … sounds/pet-8.mp3, sounds/rot-1.mp3 … sounds/rot-5.mp3

Usage (depuis le dossier du jeu) :  python3 tools/make-bruitages.py
Il faut Python 3 avec numpy + scipy, et ffmpeg pour l'encodage MP3.

Principe :
 - PET : le sphincter vibre comme des lèvres → un train d'impulsions dont la fréquence (le « pitch »)
   varie sans cesse (dérive lente + tremblement), chaque impulsion excite des résonances graves ;
   on ajoute du souffle, des « crépitements humides » pour certains, et la fin typique où la vibration
   ralentit et devient irrégulière (« prrrt… pt »).
 - ROT : une voix très grave et rauque (fréquence 60–110 Hz, gros tremblement, sous-harmoniques)
   filtrée par des formants de voyelle qui glissent (« eu » → « o » → « a »).
"""
import os, subprocess, tempfile
import numpy as np
from scipy.signal import lfilter, butter

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sounds')
rng = np.random.default_rng(7)  # graine fixe : mêmes sons à chaque exécution


# ---------- outils de filtrage ----------
def resonance(x, f, bw):
    """Résonateur à 2 pôles (formant) : fréquence f, largeur de bande bw (Hz)."""
    r = np.exp(-np.pi * bw / SR)
    a = [1, -2 * r * np.cos(2 * np.pi * f / SR), r * r]
    b = [1 - r]
    return lfilter(b, a, x)


def lowpass(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), 'low')
    return lfilter(b, a, x)


def highpass(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), 'high')
    return lfilter(b, a, x)


def smooth_noise(n, rate, amount):
    """Bruit lent (dérive) : points aléatoires toutes les 1/rate s, interpolés."""
    pts = max(2, int(n / SR * rate) + 2)
    v = rng.normal(0, amount, pts)
    return np.interp(np.arange(n), np.linspace(0, n, pts), v)


def time_varying_formants(x, tracks, bws):
    """Applique des formants qui bougent : on découpe en blocs de 10 ms (suffisant pour l'oreille)."""
    out = np.zeros_like(x)
    blk = int(SR * 0.01)
    zi = [np.zeros(2) for _ in tracks]
    for s in range(0, len(x), blk):
        seg = x[s:s + blk]
        acc = np.zeros_like(seg)
        for k, (tr, bw) in enumerate(zip(tracks, bws)):
            f = tr[min(s, len(tr) - 1)]
            r = np.exp(-np.pi * bw / SR)
            a = [1, -2 * r * np.cos(2 * np.pi * f / SR), r * r]
            y, zi[k] = lfilter([1 - r], a, seg, zi=zi[k])
            acc += y * (1.0 if k == 0 else 0.6 / k)
        out[s:s + blk] = acc
    return out


def pulse_train(f0, amp, shape):
    """Place une impulsion (forme `shape`) à chaque cycle de la fréquence instantanée f0(t)."""
    n = len(f0)
    phase = np.cumsum(f0 / SR)
    idx = np.nonzero(np.diff(np.floor(phase)) > 0)[0]
    src = np.zeros(n + len(shape))
    for i in idx:
        a = amp[i] * (0.75 + 0.5 * rng.random())          # chaque battement est un peu différent
        src[i:i + len(shape)] += a * shape
    return src[:n], idx


def env_adsr(n, a, r, curve=1.0):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na) ** curve
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def finish(x, peak=0.89):
    x = x - np.mean(x)
    x = highpass(x, 35)
    fade = int(0.006 * SR)
    x[:fade] *= np.linspace(0, 1, fade); x[-fade:] *= np.linspace(1, 0, fade)
    # même volume perçu pour tous (niveau moyen visé 0,2), sans dépasser le crête
    rms = np.sqrt(np.mean(x ** 2)) + 1e-9
    return x * min(peak / (np.max(np.abs(x)) + 1e-9), 0.2 / rms)


# ---------- PETS ----------
def fart(dur, f_start, f_end, flutter=0.12, wet=0.0, breath=0.25, cav=(180, 420), tail=0.35,
         sputter=False, muffle=2600, squeak=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    # fréquence : glissement + dérive lente + tremblement rapide (lèvres qui battent)
    f0 = np.geomspace(f_start, f_end, n)
    f0 *= np.exp(smooth_noise(n, 9, flutter) + smooth_noise(n, 40, flutter * 0.5))
    # fin : la vibration ralentit et devient irrégulière
    nt = int(n * tail)
    if nt:
        f0[-nt:] *= np.linspace(1, 0.35 if not squeak else 0.7, nt)
    if sputter:  # pétarade : la fréquence chute par paliers, impulsions bien séparées
        f0 *= 0.45 + 0.55 * (np.sin(2 * np.pi * 3.3 * t + rng.random() * 6) > -0.2)
    f0 = np.clip(f0, 14, 900)
    amp = env_adsr(n, 0.012, min(0.25, dur * 0.35)) * np.exp(smooth_noise(n, 14, 0.35))
    # forme d'une impulsion : claquement bref amorti (lèvres qui se referment)
    L = int(SR * 0.009)
    k = np.arange(L) / SR
    shape = np.exp(-k * 520) * np.sin(2 * np.pi * 260 * k + 0.3) + 0.6 * np.exp(-k * 1500)
    src, idx = pulse_train(f0, amp, shape)
    # résonances du « tuyau » + de la chaise / du vêtement
    y = resonance(src, cav[0], 70) * 1.0 + resonance(src, cav[1], 140) * 0.6 + resonance(src, 950, 300) * 0.25
    y += src * 0.15
    # souffle synchronisé aux battements
    nz = rng.normal(0, 1, n)
    puff = np.zeros(n); puff[idx] = 1
    puff = lfilter([1], [1, -0.985], puff)
    y += breath * lowpass(nz, 1800) * puff * amp * 0.35
    # version « humide » : crépitements et petites bulles
    if wet:
        cr = np.zeros(n)
        nb = int(dur * 70 * wet)
        for _ in range(nb):
            p = rng.integers(0, max(1, n - 400))
            l = rng.integers(40, 300)
            cr[p:p + l] += rng.normal(0, 1, l) * np.exp(-np.arange(l) / (l / 4)) * rng.uniform(0.3, 1)
        cr = highpass(cr, 900) * amp
        y += wet * 0.9 * cr / (np.max(np.abs(cr)) + 1e-9) * np.max(np.abs(y))
        bub = np.zeros(n)
        for _ in range(int(dur * 9 * wet)):
            p = rng.integers(0, max(1, n - 3000)); l = rng.integers(800, 2600); kk = np.arange(l) / SR
            ff = rng.uniform(250, 700)
            bub[p:p + l] += np.sin(2 * np.pi * ff * kk * (1 + 3 * kk)) * np.exp(-kk * 40)
        y += wet * 0.25 * bub * np.max(np.abs(y))
    y = lowpass(y, muffle, 2)
    return finish(y)


# ---------- ROTS ----------
def burp(dur, f0a, f0b, vowels, fry=0.35, jitter=0.08, rumble=0.0, breath=0.12):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0 = np.geomspace(f0a, f0b, n) * np.exp(smooth_noise(n, 20, jitter) + smooth_noise(n, 5, jitter))
    if rumble:  # roulement : la voix « tremble » à 18–25 Hz
        f0 *= 1 + rumble * np.sin(2 * np.pi * rng.uniform(18, 25) * t)
    f0 = np.clip(f0, 30, 300)
    # attaque brusque (l'air qui sort d'un coup), corps, fin qui s'éteint en grinçant
    amp = env_adsr(n, 0.02, min(0.3, dur * 0.4), 0.6) * np.exp(smooth_noise(n, 12, 0.25))
    # onde glottique (impulsion de Rosenberg) + sous-harmonique (voix éraillée)
    L = int(SR * 0.006)
    k = np.linspace(0, 1, L)
    shape = np.where(k < 0.6, 0.5 * (1 - np.cos(np.pi * k / 0.6)), np.cos(np.pi * (k - 0.6) / 0.8))
    shape = np.diff(np.concatenate([[0], shape]))
    src, idx = pulse_train(f0, amp, shape * 30)
    if fry:  # une impulsion sur deux plus faible → sous-harmonique, son rauque
        src2, _ = pulse_train(f0 / 2, amp, shape * 30)
        src = src * (1 - fry) + src2 * fry * 1.6
    src += breath * rng.normal(0, 1, n) * amp * 0.08
    # formants qui glissent d'une voyelle à l'autre
    V = {'eu': (480, 1350, 2400), 'o': (520, 900, 2450), 'a': (700, 1150, 2600), 'ou': (380, 800, 2300), 'è': (560, 1700, 2500)}
    pts = np.linspace(0, n - 1, len(vowels))
    tracks = [np.interp(np.arange(n), pts, [V[v][i] for v in vowels]) for i in range(3)]
    y = time_varying_formants(src, tracks, (110, 160, 260))
    # « gorge » : résonance très grave de l'œsophage
    y += resonance(src, 230, 90) * 0.5
    y = lowpass(y, 3200, 2)
    return finish(y)


def write_mp3(name, x):
    os.makedirs(OUT, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    import wave
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    dst = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', '44100',
                    '-codec:a', 'libmp3lame', '-q:a', '4', dst], check=True)
    os.remove(tmp)
    print('→', os.path.relpath(dst), f'{len(x) / SR:.2f} s')


if __name__ == '__main__':
    # 8 pets bien différents
    write_mp3('pet-1', fart(0.75, 95, 70, flutter=0.10, tail=0.3))                                  # classique « prrout »
    write_mp3('pet-2', fart(0.35, 140, 110, flutter=0.06, tail=0.25, breath=0.1))                   # court et sec
    write_mp3('pet-3', fart(1.6, 70, 40, flutter=0.16, tail=0.45, cav=(150, 380), muffle=2000))     # long et grave, qui s'éternise
    write_mp3('pet-4', fart(0.9, 260, 330, flutter=0.08, tail=0.2, cav=(320, 760), squeak=True, muffle=3600, breath=0.05))  # couinement aigu
    write_mp3('pet-5', fart(1.0, 75, 55, flutter=0.14, wet=0.8, tail=0.35, breath=0.5))             # humide (beurk)
    write_mp3('pet-6', fart(1.2, 42, 28, flutter=0.12, sputter=True, tail=0.3, cav=(160, 400)))     # pétarade irrégulière
    write_mp3('pet-7', fart(0.5, 55, 45, flutter=0.10, breath=0.9, tail=0.5, muffle=1300))          # étouffé (dans le pantalon)
    write_mp3('pet-8', fart(1.3, 120, 60, flutter=0.12, wet=0.25, tail=0.4, cav=(220, 520)))        # « trompette » qui descend
    # 5 rots
    write_mp3('rot-1', burp(0.7, 95, 75, ['eu', 'o', 'o'], fry=0.3))                                # rot franc
    write_mp3('rot-2', burp(1.3, 80, 62, ['è', 'a', 'o', 'ou'], fry=0.45, rumble=0.12))             # long et roulé
    write_mp3('rot-3', burp(0.35, 115, 95, ['a', 'eu'], fry=0.2, jitter=0.05))                      # petit rot rapide
    write_mp3('rot-4', burp(0.95, 68, 55, ['ou', 'o', 'a', 'o'], fry=0.6, jitter=0.1))              # très grave, rauque
    write_mp3('rot-5', burp(0.8, 105, 70, ['è', 'eu', 'o'], fry=0.35, rumble=0.2, breath=0.3))      # baveux qui tremble
