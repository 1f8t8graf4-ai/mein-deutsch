# Звук v11 (Claude Fable, 10.11): музыка идёт за сюжетом, а не просто играет под ним; заметных звуков мало, но каждый — на повороте.
#   Вызывается из audio.py для роликов из DIR11 (nicf). Отдельно: python3 sound11.py nicf-ru → печатает опорные точки и план.
# Что не так было в v10 (отзыв Андрея: «музыка и эффекты хуже, чем у „Что вы знаете о…“»):
#   • трек играл ровно весь ролик — тезис, штамп и финал в музыке не слышны; 30 тихих звуков сливались в шорох.
# Что делает этот файл с тем же треком Eleven Music (music/nics-raw.mp3 или music/<ep>-raw.mp3):
#   1) до тезиса музыка «за стеной» (срезаны верха) → на «В табачной компании» открывается, входит бас (сильная доля) + удар;
#   2) на штампе «Конфиденциально» — удар, музыка на полсекунды приседает (до 30 %), дальше глухая (отчёт в архиве) → на «открыть архивы» раскрывается;
#   3) перед «домой» — музыка приседает на 0,4 с, на слове — удар трека + низкий «бум»;
#   Полной тишины нет нигде: замер 13 оригиналов (10.11) — ни одной паузы в музыке длиннее 0,25 с, перепад громкости 7–12 дБ.
#   4) на финальном вопросе музыка уходит вниз и тише: вопрос звучит почти в тишине, последний звук — хвост, под петлю.
#   Звуки: 5 «главных» (штамп ×2, молоток судьи, «домой», «в семьдесят третьем») в полную громкость, остальные — вполголоса и не чаще раза в 0,3 с.
import json, os, sys, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
BAR = 4 * 60 / 112           # трек nics-raw: 112 BPM
D0, HIT = 17.15, 68.57       # в исходнике: вход баса (сильная доля) и удар после провала
HERO = {'stamp': 1.0, 'impact': 1.0, 'ding': .8, 'bell': .7, 'coins': .8, 'eyes': .7}
# Громкость ударов (Opus, 10.11, после записи голоса): у 13 оригиналов самый громкий момент — всего на 2–4 LU выше средней громкости ролика
#   (замер ebur128: Google +2,5, Coca-Cola +2,7, Apple +4,2, Starbucks +2,1). С голосом при 1.7/1.0 удары выходили на +11 LU — «бах» по ушам.
#   Теперь удары тише, их места и рисунок те же. Проверка: python3 sound11.py --check nicf-ru (максимум ≤ средняя + 4,5 LU, LRA ≤ 5).
HERO_MUL, BOOM_K = float(os.environ.get('S11_HERO', 1.7)), float(os.environ.get('S11_BOOM', 1.0))
# Потолок звука: самые громкие 0,4 с звука (RMS, dBFS) после усиления — не выше этого. Файл impact.mp3 сам по себе −6,5 LUFS,
#   поэтому одним коэффициентом его не усмирить: потолок держит каждый удар чуть громче голоса (голос ≈ −22 dBFS RMS).
HCEIL, FCEIL = float(os.environ.get('S11_HCEIL', -19)), float(os.environ.get('S11_FCEIL', -28))


def _loud(x):
    """Самые громкие 0,4 с, RMS в dBFS (моно-звук)."""
    w = int(.4 * SR)
    if len(x) <= w:
        return 10 * np.log10(np.mean(x ** 2) + 1e-12)
    c = np.cumsum(np.concatenate([[0.0], x ** 2]))
    return 10 * np.log10(np.max((c[w:] - c[:-w]) / w) + 1e-12)


def word(tl, scene, pref, n=0):
    k = 0
    for s in tl['sent']:
        if s['scene'] != scene:
            continue
        for w in s['words']:
            if w['d'].lower().strip('«».,?!:—').startswith(pref):
                if k == n:
                    return w['a']
                k += 1
    raise KeyError(scene + ':' + pref)


def sent(tl, scene, n=0):
    return [s for s in tl['sent'] if s['scene'] == scene][n]


def anchors(tl):
    if any(s['scene'] == 'pharma' for s in tl['sent']):   # v13 nicv: «Что вы знаете об одноразках?»
        q = sent(tl, 'you', 1)
        return {'claim': max(.3, sent(tl, 'claim')['a']), 'tob': word(tl, 'claim', 'табачные'), 'stamp': word(tl, 'safe', 'отправили') + .25,
                'open': word(tl, 'archive', 'открыть'), 'home': word(tl, 'deal', 'мальборо'), 'you': sent(tl, 'you')['a'],
                's73': max(sent(tl, 'you')['a'] + .2, q['a'] - 1.2), 'q': q['a'], 'qe': q['b'], 'dur': tl['dur']}
    return {'claim': max(.3, sent(tl, 'hook')['a']), 'tob': sent(tl, 'hook', 1)['a'], 'stamp': word(tl, 'safe', 'засекретили'),
            'open': word(tl, 'archive', 'открыть'), 'home': word(tl, 'deal', 'домой'), 'you': sent(tl, 'you')['a'],
            's73': word(tl, 'you', 'семьдесят'), 'q': sent(tl, 'you', 3)['a'], 'qe': sent(tl, 'you', 3)['b'], 'dur': tl['dur']}


def _load(f, ch=2):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    x = np.frombuffer(r.stdout, np.float32).astype(np.float64)
    return x.reshape(-1, 2) if ch == 2 else x


def _lp(x, hi=None, lo=None):
    X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g = g / np.sqrt(1 + (f / hi) ** 6)
    if lo: g = g / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 6)
    return np.fft.irfft(X * (g[:, None] if x.ndim == 2 else g), len(x), axis=0)


def arrange(ep, an):
    """Куски трека по тактам: вступление до тезиса, бас входит ровно на «В табачной компании», удар трека — ровно на «домой»."""
    raw = os.path.join(HERE, 'music', ep + '-raw.mp3')
    if ep == 'nicv' and os.path.exists(raw):   # свой трек под этот ролик (el13.py music): идёт как есть, без перестановки кусков
        x = _load(raw); n = int((an['dur'] + 1) * SR); y = np.zeros((n, 2)); y[:min(n, len(x))] = x[:n]
        return y, [(0, len(x) / SR, 0, 1.0, 0)]
    x = _load(raw if os.path.exists(raw) else os.path.join(HERE, 'music', 'nics-raw.mp3'))
    tob, home, dur = an['tob'] - .04, an['home'] - .04, an['dur']
    plan = [(max(.3, D0 - tob), D0, max(0, tob - D0 + .3), 1.5, .3)]
    t, src, groove_end = tob, D0, HIT - 6.2
    while t < home - .05:  # грув: идём по исходнику, дошли до провала — возвращаемся на 12 тактов назад (не петля из одних 4 тактов)
        ln = min(groove_end - src, home - t)
        plan.append((src, src + ln, t, 1.0, .04)); t += ln
        src = groove_end - 12 * BAR
    plan.append((HIT - .02, HIT + 11.5, home - .02, 1.0, .03))
    t = home + 2.2
    while t < dur:
        plan.append((.5, 13.0, t, 1.5, 1.2 if t < home + 3 else .4)); t += 12.5
    y = np.zeros((int((dur + 1) * SR), 2))
    for a, b, at, g0, fd in plan:
        seg = x[int(a * SR):int(b * SR)].copy() * g0
        n = int(fd * SR); m = int(.03 * SR)
        if n: seg[:n] *= np.sqrt(np.linspace(0, 1, n))[:, None]
        seg[-m:] *= np.sqrt(np.linspace(1, 0, m))[:, None]
        i = int(at * SR); seg = seg[:len(y) - i]
        y[i:i + len(seg)] += seg
    return y, plan


def direct(y, an):
    """Режиссура: «глухо ↔ открыто» (два слоя одного трека) и громкость по опорным точкам сюжета."""
    N = len(y); t = np.arange(N) / SR; dull = _lp(y, hi=650) * 1.25
    A = an
    # доля глухого слоя: 1 — музыка «за стеной»
    mp = [(0, .75), (A['claim'], .75), (A['tob'] - .05, .25), (A['tob'], 0), (A['stamp'], 0), (A['stamp'] + .05, 1), (A['open'] - .5, 1), (A['open'] + .5, 0),
          (A['q'] - .6, 0), (A['q'], .8), (A['dur'] + 1, .9)]
    # громкость
    gp = [(0, 0), (.25, .9), (A['claim'], .9), (A['tob'] - .06, 1.05), (A['tob'], 1), (A['stamp'], 1), (A['stamp'] + .06, .3), (A['stamp'] + .5, .3), (A['stamp'] + .9, .85),
          (A['open'] - .2, .85), (A['open'] + .5, 1), (A['home'] - .5, 1), (A['home'] - .38, .3), (A['home'] - .05, .3), (A['home'], 1.1), (A['home'] + 2.5, .95),
          (A['s73'] + .9, .95), (A['q'], .6), (A['qe'], .5), (A['qe'] + .5, .42), (A['dur'], .25), (A['dur'] + 1, .25)]
    m = np.interp(t, *zip(*mp)); gg = np.interp(t, *zip(*gp))
    return (y * (1 - m)[:, None] + dull * m[:, None]) * gg[:, None]


def boom(dur=1.8, f0=110, f1=36):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 9); ph = 2 * np.pi * np.cumsum(f) / SR
    rng = np.random.default_rng(3)
    x = np.sin(ph) * np.exp(-t * 2.4) + _lp(rng.standard_normal(n), hi=900) * np.exp(-t * 38) * 2.2 + _lp(rng.standard_normal(n), hi=260) * np.exp(-t * 6) * 1.2
    return np.tanh(x * 1.4) / 1.1


def riser(dur=1.5):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur; rng = np.random.default_rng(5); x = np.zeros(n)
    for i, (lo, hi) in enumerate([(250, 600), (600, 1300), (1300, 2800), (2800, 6000), (6000, 11000)]):
        x += _lp(rng.standard_normal(n), hi=hi, lo=lo) * np.clip((u - i * .14) / (1 - i * .14), 0, 1) ** 2.4 * (1.6 - i * .15)
    x += np.sin(2 * np.pi * np.cumsum(180 + 620 * u ** 2) / SR) * u ** 3 * .25
    x[-int(.012 * SR):] *= np.linspace(1, 0, int(.012 * SR))
    return x / (np.max(np.abs(x)) or 1)


def _put(buf, x, t, g=1.0, pan=0.0):
    s = int(t * SR)
    if s < 0: x = x[-s:]; s = 0
    if s >= len(buf): return
    x = x[:len(buf) - s]
    buf[s:s + len(x), 0] += x * g * np.sqrt(1 - pan); buf[s:s + len(x), 1] += x * g * np.sqrt(1 + pan)


def music(ep, tl):
    an = anchors(tl); y, plan = arrange(ep, an); y = direct(y, an)
    y = y / (np.max(np.abs(y)) or 1) * .7
    r, b = riser(1.5), boom()
    _put(y, r, an['tob'] - 1.5, .16 * BOOM_K); _put(y, b, an['tob'] - .01, .36 * BOOM_K)          # тезис
    _put(y, b, an['stamp'] - .02, .5 * BOOM_K)                                  # штамп → тишина
    _put(y, riser(1.0), an['open'] - 1.0, .12 * BOOM_K)                         # архивы открываются
    _put(y, riser(.45)[::-1].copy(), an['home'] - .5, .1 * BOOM_K); _put(y, boom(2.4, 130, 32), an['home'] - .01, .6 * BOOM_K)  # «домой»
    _put(y, boom(1.6, 90, 40), an['s73'], .34 * BOOM_K)                         # «в семьдесят третьем»
    return np.clip(y, -1, 1), an, plan


def sfx(tl, cues, gains):
    """Звуки по событиям из рисовки (cues.json): главные — в полную, остальные — вполголоса и не чаще раза в 0,3 с."""
    N = int((tl['dur'] + 2) * SR); x = np.zeros((N, 2)); cache = {}; last_f = -9; n_h = n_f = 0
    for t0, name, g0, pan in sorted(cues):
        f = os.path.join(HERE, 'sfx13', name + '.mp3')   # новые звуки v13 (el13.py sfx), иначе старые
        if not os.path.exists(f):
            f = os.path.join(HERE, 'sfx8', name + '.mp3')
        if not os.path.exists(f):
            continue
        hero = name in HERO and g0 >= .7
        if not hero:
            if t0 - last_f < .3 and name != 'tick':
                continue
            last_f = t0
        if name not in cache:
            cache[name] = _load(f, 1)
            cache[name + '#L'] = _loud(cache[name])
        g = gains.get(name, .3) * g0 * (HERO_MUL * HERO[name] if hero else .5)
        over = cache[name + '#L'] + 20 * np.log10(g + 1e-12) - (HCEIL if hero else FCEIL)
        if over > 0:
            g *= 10 ** (-over / 20)
        _put(x, cache[name], t0, g, pan * .4)
        n_h += hero; n_f += not hero
    print(f'звуки: главных {n_h}, тихих {n_f}')
    return x


def check(ep):
    """Громкость готового сведения out/<ep>/mix.wav против оригиналов: средняя (I), разброс (LRA), самый громкий момент (M, 0,4 с)."""
    import re
    r = subprocess.run(['ffmpeg', '-v', 'info', '-nostats', '-i', os.path.join(HERE, 'out', ep, 'mix.wav'), '-af', 'ebur128', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    M = [(float(a), float(b)) for a, b in re.findall(r't:\s*([\d.]+).*?M:\s*(-?[\d.]+)', r)]
    I = float(re.findall(r'I:\s*(-?[\d.]+) LUFS', r)[-1]); L = float(re.findall(r'LRA:\s*(-?[\d.]+) LU', r)[-1])
    top = sorted(M, key=lambda m: -m[1])[:1][0]
    ok = top[1] - I <= 4.5 and L <= 5
    print(f'{ep}: средняя {I} LUFS, разброс {L} LU, громче всего {top[1]} LUFS на {top[0]:.1f} с (средняя +{top[1] - I:.1f}) → '
          + ('как у оригиналов' if ok else 'удары громче оригиналов (у них +2…4 LU, разброс 1,4–4,5)'))
    return ok


if __name__ == '__main__':
    if sys.argv[1] == '--check':
        sys.exit(0 if check(sys.argv[2]) else 1)
    ep = sys.argv[1]; tl = json.load(open(os.path.join(HERE, 'out', ep, 'timeline.json')))
    y, an, plan = music(ep.rsplit('-', 1)[0], tl)
    print('опорные точки:', {k: round(v, 2) for k, v in an.items()})
    for a, b, at, g0, fd in plan:
        print(f'  трек {a:6.2f}–{b:6.2f} → ролик {at:6.2f}–{at + b - a:6.2f}  ×{g0}')
