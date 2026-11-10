# Звук роликов v2: своя музыка (синтез — чужих прав нет) + эффекты по таймлайну → tt_audio.master → out/<ep>/mix.wav
#   python3 audio.py mrbeast-en nicotine-ru …
# Музыка «загадка»: минор, щипковое арпеджио; до «But did you know» — тихо (пэд + арпеджио), после — бас и бит.
import json, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'tools'))
import tt_audio

SND = os.path.join(HERE, '..', 'snd', 'kino')
EPB = ''
SR = 48000
KEYS = {'mrbeast': 57, 'nicotine': 52, 'aids': 50, 'meph': 54, 'nicstory': 55, 'aidsmyth': 53, 'mephnight': 49, 'energy': 56,
        'nicw': 52, 'nicmax': 55, 'nictyaga': 57, 'nicme': 50, 'howto': 53}  # тоника
BPM = {'mephnight': 116, 'energy': 104, 'aidsmyth': 100, 'nicmax': 98, 'nicme': 118, 'nictyaga': 90, 'howto': 108}
# когда входит бит (сцена-поворот) и когда уходит; удары — на каких сценах
QUIET = {'nicw1': ('toll', 'grudge'), 'nicw2': ('toll',), 'nicw3': ('toll',)}
TURN = {'nicstory': 'd1', 'aidsmyth': 'm1f', 'mephnight': 't1115', 'nicmax': 'd1', 'nictyaga': 'go', 'nicme': 'go'}
STOP = {'mephnight': 'sun', 'nicstory': 'quit', 'nicmax': 'quit', 'nictyaga': 'breath', 'nicme': 'quit'}
BOOM = {'aidsmyth': ['m1f', 'm2f', 'm3f', 'm4f', 'true'], 'nicstory': ['flip'], 'mephnight': ['sun'],
        'nicmax': ['hook2', 'flip'], 'nictyaga': ['hook', 'fact'], 'nicme': ['hook', 'brain'], 'howto': ['hook', 'done']}


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


def fm(f, dur, idx=1.4, dec=3.0, att=400):
    t = np.arange(int(dur * SR)) / SR
    env = np.exp(-t * dec) * (1 - np.exp(-t * att))
    return np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * f * t) * idx * np.exp(-t * 4)) * env


def lp(x, hi=None, lo=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))


def put(buf, x, t, g=1.0, pan=0.0):
    s = int(t * SR)
    if s >= len(buf) or s + len(x) <= 0 or s < 0:
        return
    x = x[: len(buf) - s]
    buf[s:s + len(x), 0] += x * g * np.sqrt(1 - pan)
    buf[s:s + len(x), 1] += x * g * np.sqrt(1 + pan)


def load(name):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(SND, name + '.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


def scenes(T):
    SC = []
    for s in T['sent']:
        if SC and SC[-1]['key'] == s['scene']:
            SC[-1]['sents'].append(s); SC[-1]['words'] += s['words']
        else:
            SC.append({'key': s['scene'], 'sents': [s], 'words': list(s['words'])})
    for i, s in enumerate(SC):
        s['a'] = s['sents'][0]['a'] - .22 if i else 0
    return SC


def music(ep, DUR, t_claim, rng, t_stop=1e9):
    N = int((DUR + 1) * SR)
    m = np.zeros((N, 2))
    root = KEYS.get(ep, 57)
    bpm = BPM.get(ep, 96); beat = 60 / bpm; bar = beat * 4
    # i – VI – iv – V (гармонический минор: тревожно, «тайна»)
    CH = [[0, 3, 7, 12], [-4, 0, 3, 8], [-7, -4, 0, 5], [-5, -1, 2, 7]]
    nb = int(DUR / bar) + 2
    tb = np.arange(int(bar * SR)) / SR
    for b in range(nb):
        t0 = b * bar; ch = CH[b % 4]; full = t_claim - .05 <= t0 < t_stop - .05
        env = np.minimum(1, tb / .6) * np.minimum(1, (bar - tb) / .5)
        pad = np.zeros_like(tb)
        for n in ch[:3]:
            f = midi(root + n)
            for d in (-.003, .003):
                pad += np.sin(2 * np.pi * f * (1 + d) * tb + rng.random() * 6.28)
        put(m, lp(pad * env * .02, hi=2200), t0, 1, -.2); put(m, lp(pad * env * .02, hi=2200), t0 + .015, 1, .2)
        # арпеджио шестнадцатыми — щипок
        for e in range(16):
            n = ch[[0, 1, 2, 3, 2, 1, 2, 3][e % 8]] + 12 + (12 if e % 8 == 3 else 0)
            v = (.045 if full else .035) * (1.0 if e % 4 == 0 else .7)
            put(m, fm(midi(root + n), .5, idx=1.1, dec=7) * v, t0 + e * beat / 4, 1, (.35 if e % 2 else -.35))
        if full:
            for k in range(4):
                bt = t0 + k * beat
                # бас
                if k in (0, 2):
                    put(m, lp(fm(midi(root - 12 + ch[0]), beat * 1.8, idx=.5, dec=1.6), hi=900) * .2, bt)
                # бочка
                if k in (0, 2):
                    tt = np.arange(int(.32 * SR)) / SR
                    f = 48 + 90 * np.exp(-tt * 30)
                    put(m, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 10) * .3, bt)
                # хлопок
                if k in (1, 3):
                    tt = np.arange(int(.2 * SR)) / SR
                    put(m, lp(rng.standard_normal(len(tt)), hi=4500, lo=900) * np.exp(-tt * 26) * .06, bt, 1, .1)
                # хэты
                for h in (0, .5):
                    tt = np.arange(int(.05 * SR)) / SR
                    put(m, lp(rng.standard_normal(len(tt)), lo=7000) * np.exp(-tt * 80) * .025, bt + h * beat, 1, .3)
    fi = np.minimum(1, np.arange(N) / (SR * .2))
    fo = np.clip((DUR + .4 - np.arange(N) / SR) / 1.2, 0, 1)
    m *= (fi * fo)[:, None]
    m /= np.max(np.abs(m)) / .7
    return m


def sfx(T, SC, DUR, rng):
    N = int((DUR + 1) * SR)
    x = np.zeros((N, 2))
    W, SEL, REW, TICK = load('whoosh'), load('sel'), load('reward'), load('tick')
    for s in SC[1:]:
        put(x, W, s['a'] - .05, .22)
    # «удар» на «But did you know» — главный поворот
    for cl in [s for s in SC if s['key'] in BOOM.get(EPB, ['claim'])]:
        tt = np.arange(int(1.6 * SR)) / SR
        boom = np.sin(2 * np.pi * np.cumsum(38 + 50 * np.exp(-tt * 5)) / SR) * np.exp(-tt * 2.2) * .5
        put(x, boom, cl['a'] + .15)
        put(x, lp(rng.standard_normal(len(tt)), hi=1800) * np.exp(-tt * 3) * .05, cl['a'] + .15)
    # щелчок на каждом выделенном слове
    last = -1
    for s in T['sent']:
        for w in s['words']:
            if w['c'] and w['a'] - last > .25:
                put(x, SEL, w['a'], .2 if w['c'] == 'y' else .26, (rng.random() - .5) * .4)
                last = w['a']
    put(x, REW, SC[-1]['a'] + .6, .2)
    return x * .9


# ---------- v6 (09.11): музыка щипком и маримбой, свой стиль на ролик; звуки по событиям из cues.json ----------
import sfxlib
_KS = {}


def ks(f, dur, damp=.996, bright=4500, seed=0):
    """Щипок струны (Карплус — Стронг): шумовой всплеск в линии задержки с усреднением. Кэш по (нота, длина)."""
    key = (round(f, 1), round(dur, 2), damp, bright, seed)
    if key in _KS:
        return _KS[key]
    L = int(dur * SR); N = max(2, int(SR / f)); y = np.zeros(L + N)
    rng = np.random.default_rng(seed)
    y[:N] = lp(rng.standard_normal(N * 4), hi=bright)[:N]
    for st in range(N, L + N, N):
        en = min(st + N, L + N)
        a = y[st - N:en - N]
        b = np.concatenate([[0.0], y[st - N:en - N - 1]]) if st - N - 1 < 0 else y[st - N - 1:en - N - 1]
        y[st:en] = damp * (a + b) / 2
    y = y[:L] * np.minimum(1, np.arange(L) / (SR * .002)) * np.minimum(1, (L - np.arange(L)) / (SR * .03))
    _KS[key] = y / (np.max(np.abs(y)) or 1)
    return _KS[key]


def marimba(f, dur=.9):
    key = ('m', round(f, 1), dur)
    if key in _KS:
        return _KS[key]
    t = np.arange(int(dur * SR)) / SR
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + .45 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 14) + .12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 30)
    y *= np.minimum(1, t / .0015)
    _KS[key] = y / np.max(np.abs(y))
    return _KS[key]


def drum(kind, rng):
    if kind == 'kick':
        tt = np.arange(int(.35 * SR)) / SR
        return np.sin(2 * np.pi * np.cumsum(46 + 110 * np.exp(-tt * 28)) / SR) * np.exp(-tt * 9)
    if kind == 'snare':
        tt = np.arange(int(.22 * SR)) / SR
        return lp(rng.standard_normal(len(tt)), hi=7000, lo=1200) * np.exp(-tt * 20) * .6 + np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 30) * .5
    if kind == 'snap':
        tt = np.arange(int(.12 * SR)) / SR
        return lp(rng.standard_normal(len(tt)), hi=5000, lo=1500) * np.exp(-tt * 45)
    if kind == 'hat':
        tt = np.arange(int(.05 * SR)) / SR
        return lp(rng.standard_normal(len(tt)), lo=7000) * np.exp(-tt * 90)
    if kind == 'shaker':
        tt = np.arange(int(.09 * SR)) / SR
        return lp(rng.standard_normal(len(tt)), hi=9000, lo=3500) * np.sin(np.pi * tt / tt[-1]) ** 2


# стили: темп, тоника, гармония, рисунок. nicw1 — «шпионский» щипок со щелчками, nicw2 — загадка, nicw3 — бит, петля
STY = {
    'nicw1': {'bpm': 112, 'key': 50, 'prog': [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], 'riff': 'heist', 'hit': 'snap'},
    'nicw2': {'bpm': 96, 'key': 52, 'prog': [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -1, 2]], 'riff': 'arp', 'hit': 'snare'},
    'nicw3': {'bpm': 120, 'key': 53, 'prog': [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], 'riff': 'mar', 'hit': 'snare', 'four': True, 'loop': True},
}


def music6(ep, DUR, t_claim, rng, quiet=()):
    st = STY[ep]; N = int((DUR + 2) * SR); m = np.zeros((N, 2))
    root = st['key']; beat = 60 / st['bpm']; bar = beat * 4
    for b in range(int(DUR / bar) + 2):
        t0 = b * bar; ch = st['prog'][b % 4]; full = t0 >= t_claim - .05
        q = any(a - .05 <= t0 < e for a, e in quiet)
        # щипок: арпеджио (восьмые до поворота, шестнадцатые после)
        steps = 16 if full and not q else 8
        for e in range(steps):
            if st['riff'] == 'heist' and e % 4 == 2 and full:
                continue
            n = ch[[0, 1, 2, 1, 2, 0, 1, 2][e % 8]] + 12 + (12 if e % 8 == 3 else 0)
            v = (.17 if full else .13) * (1 if e % 4 == 0 else .62)
            put(m, ks(midi(root + n), .55 if st['riff'] != 'heist' else .28, damp=.994), t0 + e * bar / steps, v, .35 if e % 2 else -.35)
        # маримба-мотив (nicw3) / акценты (остальные)
        if st['riff'] == 'mar' and full and not q:
            for k, (ofs, n) in enumerate([(0, 0), (.75, 7), (1.5, 3), (2, 12), (2.75, 10), (3.25, 7)]):
                put(m, marimba(midi(root + 12 + ch[0] + n)), t0 + ofs * beat, .2, -.15 if k % 2 else .15)
        elif full and not q:
            put(m, marimba(midi(root + 12 + ch[0])), t0, .14, .1)
        if full and not q:
            # бас: щипок низко, «шагами» у шпионского стиля
            bl = [0, 0, 7, 5] if st['riff'] == 'heist' else [0, 0, 0, 0]
            for k in range(4):
                if st['riff'] != 'heist' and k % 2:
                    continue
                put(m, ks(midi(root - 12 + ch[0] + bl[k]), beat * 1.6, damp=.997, bright=900), t0 + k * beat, .42)
            for k in range(4):
                bt = t0 + k * beat
                if st.get('four') or k in (0, 2):
                    put(m, drum('kick', rng), bt, .45)
                if k in (1, 3):
                    put(m, drum(st['hit'], rng), bt, .2 if st['hit'] == 'snap' else .16, .1)
                for h in (0, .5):
                    put(m, drum('hat', rng), bt + h * beat, .05, .3)
                put(m, drum('shaker', rng), bt + .75 * beat, .03, -.3)
        else:
            # до поворота / в тишине: мягкая подложка — две ноты
            tb = np.arange(int(bar * SR)) / SR; env = np.minimum(1, tb / .5) * np.minimum(1, (bar - tb) / .5)
            pad = sum(np.sin(2 * np.pi * midi(root + n) * tb + rng.random() * 6) for n in ch[:2]) * env * .03
            put(m, lp(pad, hi=1800), t0, 1, -.2); put(m, lp(pad, hi=1800), t0 + .02, 1, .2)
    fi = np.minimum(1, np.arange(N) / (SR * .15))
    fo = np.ones(N) if st.get('loop') else np.clip((DUR + .3 - np.arange(N) / SR) / 1.2, 0, 1)
    m *= (fi * fo)[:, None]
    return m / (np.max(np.abs(m)) or 1) * .7


def ext_music(path, DUR, loop=False):
    """Своя музыка Андрея (любой mp3/wav): по кругу до длины ролика, плавно в начале и (если не петля) в конце."""
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    x = np.frombuffer(r.stdout, np.float32).astype(np.float64).reshape(-1, 2)
    N = int((DUR + 1) * SR); x = np.tile(x, (N // len(x) + 1, 1))[:N] if loop else np.concatenate([x, np.zeros((max(0, N - len(x)), 2))])[:N]
    fi = np.minimum(1, np.arange(N) / (SR * .3)); fo = np.ones(N) if loop else np.clip((DUR + .3 - np.arange(N) / SR) / 1.5, 0, 1)
    x *= (fi * fo)[:, None]
    return x / (np.max(np.abs(x)) or 1) * .7


def sfx6(T, SC, DUR, rng, cues, loop=False):
    N = int((DUR + 2) * SR); x = np.zeros((N, 2)); last = {}
    KINO = {}
    times = [c[0] for c in cues]
    for t0, name, g0, pan in cues:
        if name.startswith('tr_'):
            name = sfxlib.TR.get(name[3:])
            if not name:
                continue
        if t0 - last.get(name, -9) < .07:
            continue
        last[name] = t0
        if name.startswith('kino:') or sfxlib.FN.get(name, 0) is None:
            nm = name.split(':')[-1]
            if nm not in KINO:
                KINO[nm] = load(nm)
            arr, gain = KINO[nm], sfxlib.GAIN.get(nm, .25)
        else:
            arr, gain = sfxlib.snd(name, rng)
            if arr is None:
                continue
        dense = sum(1 for u in times if abs(u - t0) < .12)
        put(x, arr, t0, gain * g0 / max(1, dense) ** .35, pan * .5)
    SEL = load('sel'); lw = -1
    for s in T['sent']:
        for w in s['words']:
            if w['c'] and w['a'] - lw > .3:
                put(x, SEL, w['a'], .1, (rng.random() - .5) * .4); lw = w['a']
    if not loop:
        put(x, load('reward'), SC[-1]['a'] + .6, .18)
    return x


# v8 (09.11): звуки — набор ElevenLabs Sound Effects (sfx8/*.mp3), мало и тихо; без щелчков на словах и «награды» в конце
SFX8_EPS = {'nicb', 'nich', 'nicg', 'nics', 'nicsa', 'nicsb', 'nicsc'}
DIR11 = {'nicf'}  # v11: звук по сюжету — sound11.py
BED8 = {'nics': -8, 'nicsa': -8, 'nicsb': -8, 'nicsc': -8, 'nicf': -9}  # музыка относительно голоса, LU: у оригиналов музыка слышна всё время (замер 09.11)
SFX8_GAIN = {'impact': .55, 'dive': .32, 'wave': .32, 'whoosh': .26, 'drip': .4, 'stamp': .35, 'thud': .3, 'chomp': .3, 'zap': .28,
             'ding': .3, 'shimmer': .3, 'pin': .3, 'tick': .25, 'heart': .45, 'swish': .25,
             'bellows': .4, 'quill': .3, 'coins': .4, 'seal': .45, 'whip': .4, 'river': .25, 'bell': .3, 'eyes': .55, 'munch': .35, 'puff': .3,
             'scuttle': .35, 'whirr': .3, 'flutter': .3, 'buzz': .3, 'sniff': .3}


def sfx8(DUR, cues):
    N = int((DUR + 2) * SR); x = np.zeros((N, 2)); cache = {}; last = {}
    for t0, name, g0, pan in cues:
        f = os.path.join(HERE, 'sfx8', name + '.mp3')
        if not os.path.exists(f) or t0 - last.get(name, -9) < .25:
            continue
        last[name] = t0
        if name not in cache:
            r = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
            cache[name] = np.frombuffer(r.stdout, np.float32).astype(np.float64)
        put(x, cache[name], t0, SFX8_GAIN.get(name, .3) * g0, pan * .4)
    return x


def main(ep):
    global EPB
    EPB = ep.rsplit('-', 1)[0]
    out = os.path.join(HERE, 'out', ep)
    T = json.load(open(os.path.join(out, 'timeline.json')))
    DUR = T['dur']; SC = scenes(T); rng = np.random.default_rng(11)
    t_claim = next((s['a'] for s in SC if s['key'] == TURN.get(EPB, 'claim')), 0)
    t_stop = next((s['a'] for s in SC if s['key'] == STOP.get(EPB)), 1e9)
    cf = os.path.join(out, 'cues.json'); loop = STY.get(EPB, {}).get('loop', False)
    mf = os.environ.get('MUSIC') or next((f for f in (os.path.join(HERE, 'music', EPB + e) for e in ('.mp3', '.wav', '.m4a')) if os.path.exists(f)), None)
    if EPB in DIR11:  # v11: музыка идёт за сюжетом (sound11.py) — тот же трек, но с поворотами, провалами и ударами
        import sound11
        M, an11, _ = sound11.music(EPB, T); M = M[:int((DUR + 1) * SR)]
        print(ep, 'музыка v11, опорные точки:', {k: round(v, 2) for k, v in an11.items()})
    elif mf:
        M = ext_music(mf, DUR, loop); print(ep, 'музыка:', mf)
    elif EPB in STY:
        quiet = [(s['a'], (SC[i + 1]['a'] if i + 1 < len(SC) else DUR)) for i, s in enumerate(SC) if s['key'] in QUIET.get(EPB, ())]
        M = music6(EPB, DUR, t_claim, rng, quiet)
    else:
        M = music(EPB, DUR, t_claim, rng, t_stop)
    sf.write(os.path.join(out, 'music.wav'), M.astype(np.float32), SR)
    if EPB in DIR11:
        X = sound11.sfx(T, json.load(open(cf)), SFX8_GAIN)
    elif EPB in SFX8_EPS:
        X = sfx8(DUR, json.load(open(cf)))
    else:
        X = sfx6(T, SC, DUR, rng, json.load(open(cf)), loop) if os.path.exists(cf) else sfx(T, SC, DUR, rng)
    sf.write(os.path.join(out, 'sfx.wav'), X.astype(np.float32), SR)
    if os.environ.get('NOVOICE'):  # v5: голос будет потом (ElevenLabs) — сейчас музыка + эффекты, −14 LUFS
        tmp = os.path.join(out, 'mix.raw.wav')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', os.path.join(out, 'music.wav'), '-i', os.path.join(out, 'sfx.wav'), '-filter_complex',
                        f'[0:a]volume=0.9[a];[1:a]volume=1.0[b];[a][b]amix=inputs=2:normalize=0,atrim=0:{DUR:.3f}[m]', '-map', '[m]', '-c:a', 'pcm_s16le', tmp], check=True)
        L, _ = tt_audio._lufs(tmp)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af', f'volume={-14 - L:.2f}dB,alimiter=limit=0.89:level=disabled', '-c:a', 'pcm_s16le',
                        os.path.join(out, 'mix.wav')], check=True)
        os.remove(tmp)
    else:
        tt_audio.BED_DB = BED8.get(EPB, -16)
        tt_audio.master(os.path.join(out, 'voice.wav'), os.path.join(out, 'mix.wav'), DUR,
                        bed=os.path.join(out, 'music.wav'), extra=os.path.join(out, 'sfx.wav'))
    print(ep, 'mix', tt_audio.report(os.path.join(out, 'mix.wav')))


if __name__ == '__main__':
    for ep in sys.argv[1:]:
        main(ep)
