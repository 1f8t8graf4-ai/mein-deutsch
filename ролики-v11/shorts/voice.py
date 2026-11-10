# Озвучка → out/<ep>-<lang>/voice.wav + timeline.json (время каждого слова).
#   python3 voice.py mrbeast-en nicotine-ru …        (без аргументов — все)
#   EN: Kokoro af_heart (Apache 2.0), время слов — Vosk (../tools/wt_vosk.py).
#   RU: Piper ru_RU-dmitri-medium (MIT, датасет CC0), время слов — Vosk ru (models/vosk-ru), без модели — по слогам.
#   Голос нейросетью: python3 tts.py <ep> (Gemini) → python3 voice.py <ep> --audio out/<ep>/tts.wav
#   Свой голос (ElevenLabs): python3 voice.py nicotine-ru --audio eleven.mp3 — режет запись по паузам на фразы,
#   число фраз должно совпасть со scripts.py (иначе подскажет, где расходится).
import json, os, re, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'tools'))
from scripts import EPISODES, parse

M = '/home/user/wdyk/models' if os.path.isdir('/home/user/wdyk/models') else os.path.join(HERE, 'models')
VOICE = os.environ.get('SV_VOICE', 'af_heart')
SPEED = float(os.environ.get('SV_SPEED', '0.95'))
GAP_IN, GAP_SCENE = 0.16, 0.30
GAPS = {'nics-ru': 0.17}  # у оригиналов диктор говорит почти без остановок — между фразами короче
SR = 24000


def trim(x, sr, thr=0.012, pad=0.03):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    return x[max(0, idx[0] - int(pad * sr)):min(len(x), idx[-1] + int(pad * sr * 2))]


def resample(x, sr):
    if sr == SR:
        return x
    n = int(len(x) * SR / sr)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


VOW = re.compile(r'[aeiouyаеёиоуыэюя]', re.I)


def by_syllables(toks, dur, t0):
    """Время слов внутри фразы — пропорционально слогам (+ паузы на знаках)."""
    w = []
    for tk in toks:
        sp = ' '.join(tk['sp'])
        v = max(1, len(VOW.findall(sp))) + 0.3
        p = 1.2 if re.search(r'[.!?…]$', sp) else 0.7 if re.search(r'[,:;—]$', sp) else 0
        w.append((v, p))
    tot = sum(a + b for a, b in w) or 1
    k = (dur - 0.05) / tot
    out, t = [], t0 + 0.03
    for tk, (v, p) in zip(toks, w):
        out.append({'d': tk['d'], 'c': tk['c'], 'a': round(t, 3), 'b': round(t + v * k, 3)})
        t += (v + p) * k
    return out


class Synth:
    def __init__(self, lang):
        self.lang = lang
        if lang == 'en':
            from kokoro_onnx import Kokoro
            self.k = Kokoro(os.path.join(M, 'kokoro-v1.0.onnx'), os.path.join(M, 'voices-v1.0.bin'))
        else:
            from piper import PiperVoice, SynthesisConfig
            d = os.path.join(M, 'piper', 'vits-piper-ru_RU-dmitri-medium')
            self.p = PiperVoice.load(os.path.join(d, 'ru_RU-dmitri-medium.onnx'),
                                     config_path=os.path.join(d, 'ru_RU-dmitri-medium.onnx.json'))
            self.cfg = SynthesisConfig(length_scale=float(os.environ.get('SV_LEN', '1.06')), noise_scale=0.6, noise_w_scale=0.7)

    def __call__(self, text):
        if self.lang == 'en':
            x, sr = self.k.create(text, voice=VOICE, speed=SPEED, lang='en-us')
            return resample(np.asarray(x, dtype=np.float32), sr)
        ch = list(self.p.synthesize(text, syn_config=self.cfg))
        x = np.concatenate([c.audio_float_array for c in ch]).astype(np.float32)
        return resample(x, ch[0].sample_rate)


def split_audio(path, n, expect=None):
    """Своя запись → n фраз. Есть expect (ожидаемая длина каждой фразы) — режем по паузам так, чтобы доли фраз
    совпали с ожидаемыми (паузы внутри фразы — счёт «раз, два…» — не путают); нет — по n−1 самым длинным паузам."""
    import subprocess
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(raw, dtype=np.float32)
    hop = SR // 100
    e = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y) - hop, hop)])
    on = e > max(0.006, np.percentile(e, 60) * 0.18)
    gaps, i = [], 0
    while i < len(on):
        if not on[i]:
            j = i
            while j < len(on) and not on[j]:
                j += 1
            if i > 0 and j < len(on):
                gaps.append((j - i, i, j))
            i = j
        else:
            i += 1
    if expect is None or n < 2:
        cut = sorted(sorted(gaps, reverse=True)[:n - 1], key=lambda g: g[1])
    else:
        cand = sorted([g for g in gaps if g[0] >= 8], key=lambda g: g[1])
        if len(cand) < n - 1:
            sys.exit(f'в записи нашлось {len(cand) + 1} фраз, а в тексте {n}')
        tot = len(on); ex = np.cumsum(np.array(expect, float) / sum(expect))[:-1] * tot
        pos = np.array([(a + b) / 2 for _, a, b in cand]); gl = np.log(np.array([g[0] for g in cand], float))
        P_ = len(cand); INF = 1e18
        dp = np.full((n - 1, P_), INF); bk = np.zeros((n - 1, P_), int)
        for k in range(n - 1):
            c = ((pos - ex[k]) / tot) ** 2 * 400 - gl * .35
            if k == 0:
                dp[0] = c
            else:
                best, arg = INF, -1
                for j in range(P_):
                    if j - 1 >= 0 and dp[k - 1][j - 1] < best:
                        best, arg = dp[k - 1][j - 1], j - 1
                    if arg >= 0:
                        dp[k][j] = best + c[j]; bk[k][j] = arg
        j = int(np.argmin(dp[n - 2])); idx = [j]
        for k in range(n - 2, 0, -1):
            j = bk[k][j]; idx.append(j)
        cut = [cand[j] for j in reversed(idx)]
    if len(cut) < n - 1:
        sys.exit(f'в записи нашлось {len(cut) + 1} фраз, а в тексте {n}')
    pts = [0] + [((a + b) // 2) * hop for _, a, b in cut] + [len(y)]
    return [trim(y[pts[i]:pts[i + 1]], SR) for i in range(n)]


def split_by_words(path, says, vosk):
    """09.11: своя запись → фразы по словам (Vosk), а не по паузам: длинная пауза внутри фразы («Совпадение? … Не думаю.»)
    больше не режет её пополам. Граница — самое тихое место между последним словом фразы и первым словом следующей."""
    import subprocess
    from wt_vosk import align, toks
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(raw, dtype=np.float32)
    W, q = align(vosk, path, ' '.join(says))
    hop = SR // 100
    e = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y) - hop, hop)])
    e = np.convolve(e, np.ones(3) / 3, 'same')
    ends = np.cumsum([len(toks(x)) for x in says])
    pts = [0]
    for k in range(len(says) - 1):
        a, b = W[ends[k] - 1][1], W[ends[k]][0]
        lo, hi = (a, b) if b > a + 0.05 else (b - 0.3, a + 0.3)
        i0, i1 = max(int(lo * 100), pts[-1] // hop + 1), max(int(hi * 100) + 1, pts[-1] // hop + 2)
        j = i0 + int(np.argmin(e[i0:i1])) if i1 <= len(e) and i1 > i0 else i0
        pts.append(j * hop)
    pts.append(len(y))
    return [trim(y[pts[i]:pts[i + 1]], SR) for i in range(len(says))], q


LEVEL = {'nics-ru': 0.6}  # своя запись: громкость фраз ближе к средней (шёпот слышно на телефоне), 0 — как есть, 1 — все одинаково
CAP = {'nics-ru': 0.38}  # своя запись: паузы внутри фразы длиннее этого — ужать (режиссёрские пометки растягивают их до секунды)


def squeeze(x, cap, sr=SR, thr=0.012):
    """Тишину внутри фразы длиннее cap секунд укоротить до cap: вырезаем середину, края склеиваем наплывом 10 мс."""
    hop = sr // 200
    e = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    quiet = e < thr * max(1e-6, np.max(e)) * 4
    out, i, n, f = [], 0, len(quiet), int(sr * 0.01)
    pos = 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if 0 < i and j < n and (j - i) * hop > cap * sr:
                keep = int(cap * sr / 2)
                a, b = i * hop + keep, j * hop - keep
                seg = x[pos:a].copy()
                seg[-f:] *= np.linspace(1, 0, f)
                out.append(seg)
                pos = b
                head = x[pos:pos + f] * np.linspace(0, 1, f)
                x = np.concatenate([x[:pos], head, x[pos + f:]])
            i = j
        else:
            i += 1
    out.append(x[pos:])
    return np.concatenate(out)


# 09.11 (v10): «естественный» режим своей записи — без нарезки на фразы и склейки: запись целиком (44,1 кГц), паузы как у диктора,
#   только слишком длинные (> N с) ужимаются до N. Тайминг слов — Vosk по всему файлу. Так голос не звучит «роботом»
#   (робота давали: растяжка темпа, 24 кГц, одинаковые паузы между фразами, выравнивание громкости фраз).
NATURAL = {'nicsa-ru': .4, 'nicsb-ru': .4, 'nicsc-ru': .4, 'nicf-ru': .4}


def natural(ep, audio):
    import subprocess
    from wt_vosk import align, toks as wtoks
    sr = 44100
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32).copy()
    y = squeeze(y, NATURAL[ep], sr=sr)
    idx = np.where(np.abs(y) > 0.01 * np.max(np.abs(y)))[0]
    y = y[max(0, idx[0] - int(.04 * sr)):idx[-1] + int(.25 * sr)]
    lead = .15
    y = np.concatenate([np.zeros(int(lead * sr), np.float32), y, np.zeros(int(1.2 * sr), np.float32)])
    y = y / (np.max(np.abs(y)) or 1) * .9
    out = os.path.join(HERE, 'out', ep)
    wav = os.path.join(out, 'voice.wav')
    sf.write(wav, y, sr)
    L = EPISODES[ep]
    says = [parse(x)[0].lstrip('.… ') for _, x in L]
    W, q = align(os.path.join(M, 'vosk-' + ep.rsplit('-', 1)[1]), wav, ' '.join(says))
    print(f'слова по всему файлу: распознано {q:.0%}')
    T, j = [], 0
    for i, (scene, s0) in enumerate(L):
        text, tk = parse(s0)
        n = len(wtoks(says[i]))
        seg = W[j:j + n]
        j += n
        words, k = [], 0
        for t0 in tk:
            ws = seg[k:k + len(t0['sp'])] or [seg[-1]]
            k += len(t0['sp'])
            words.append({'d': t0['d'], 'c': t0['c'], 'a': round(ws[0][0], 3), 'b': round(ws[-1][1], 3)})
        a0, b0 = max(0, seg[0][0] - .04), seg[-1][1] + .06
        T.append({'i': i, 'scene': scene, 'a': round(a0, 3), 'b': round(b0, 3), 'q': round(q, 2), 'text': text, 'words': words})
        print(f'{i:02d} {scene:8s} {a0:6.2f}–{b0:6.2f} {text}')
    total = len(y) / sr
    hop = sr // 30
    env = [float(np.sqrt(np.mean(y[i:i + hop] ** 2))) for i in range(0, len(y), hop)]
    mx = max(env) or 1
    json.dump({'ep': ep, 'lang': ep.rsplit('-', 1)[1], 'dur': round(total, 3), 'fps': 30, 'voice': 'own', 'natural': True,
               'sent': T, 'env': [round(min(1, e / mx * 1.8), 3) for e in env]},
              open(os.path.join(out, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
    print(ep, 'итого', round(total, 2), 'с (естественный режим)')


def main(ep, audio=None):
    if audio and ep in NATURAL:
        return natural(ep, audio)
    lang = ep.rsplit('-', 1)[1]
    L = EPISODES[ep]
    out = os.path.join(HERE, 'out', ep)
    os.makedirs(out, exist_ok=True)
    exp = None
    if audio:  # ожидаемые длины фраз: прошлый тайминг (если есть), иначе по числу букв
        try:
            tl0 = json.load(open(os.path.join(out, 'timeline.piper.json' if os.path.exists(os.path.join(out, 'timeline.piper.json')) else 'timeline.json')))
            exp = [max(.3, x['b'] - x['a']) for x in tl0['sent']] if len(tl0['sent']) == len(L) else None
        except Exception:
            exp = None
        exp = exp or [len(parse(s)[0]) + 8 for _, s in L]
    vosk = os.path.join(M, 'vosk-' + lang)
    exact = os.path.isdir(vosk)  # 09.11: русский тоже по голосу (Vosk ru), без модели — по слогам
    clips = None
    if audio and exact:
        clips, q0 = split_by_words(audio, [parse(x)[0].lstrip('.… ') for _, x in L], vosk)
        print(f'фразы по словам: распознано {q0:.0%}')
        if q0 < 0.6:
            clips = None
    if audio and clips is None:
        clips = split_audio(audio, len(L), exp)
    syn = None if clips else Synth(lang)
    LV = [1.0] * len(L)
    if clips and ep in LEVEL:
        def vr(c):
            e = np.array([np.sqrt(np.mean(c[i:i + SR // 50] ** 2)) for i in range(0, max(1, len(c) - SR // 50), SR // 50)])
            return float(np.sqrt(np.mean(e[e > np.max(e) * .1] ** 2))) if len(e) else 1e-3
        rm = [vr(c) for c in clips]; med = float(np.median(rm))
        LV = [float(np.clip((med / max(r, 1e-6)) ** LEVEL[ep], .7, 2.5)) for r in rm]
        print('громкость фраз:', ' '.join(f'{v:.2f}' for v in LV))
    if exact:
        from wt_vosk import align
    # свой голос режется и собирается заново с паузами GAP_* — паузы-шутки из retime.RT ставим сами
    extra = {}
    if audio:
        from retime import RT
        extra = {op[1]: op[2] for op in RT.get(ep, []) if op[0] == 'pause'}
    parts, T, t, prev = [], [], 0.15, None
    for i, (scene, s) in enumerate(L):
        text, toks = parse(s)
        say = text.lstrip('.… ')
        x = clips[i] if clips else trim(syn(say), SR)
        if clips and ep in CAP:
            x = squeeze(x, CAP[ep])
        if clips and ep in LEVEL:
            x = x * LV[i]
        if prev is not None:
            t += (GAPS.get(ep, GAP_SCENE) if scene != prev else GAP_IN) + extra.get(i - 1, 0)
        dur = len(x) / SR
        q = 1.0
        if exact:
            wav = os.path.join(out, f's{i:02d}.wav')
            sf.write(wav, x, SR)
            W, q = align(vosk, wav, say)
            j, words = 0, []
            for tk in toks:
                seg = W[j:j + len(tk['sp'])] or [W[-1]]
                j += len(tk['sp'])
                words.append({'d': tk['d'], 'c': tk['c'], 'a': round(t + seg[0][0], 3), 'b': round(t + seg[-1][1], 3)})
        else:
            words = by_syllables(toks, dur, t)
        T.append({'i': i, 'scene': scene, 'a': round(t, 3), 'b': round(t + dur, 3), 'q': round(q, 2), 'text': text, 'words': words})
        parts.append((t, x))
        print(f'{i:02d} {scene:8s} {t:6.2f}–{t + dur:6.2f} {q:4.0%} {text}')
        t += dur
        prev = scene
    total = t + 1.2
    y = np.zeros(int(total * SR), dtype=np.float32)
    for a, x in parts:
        s0 = int(a * SR)
        y[s0:s0 + len(x)] += x
    pk = np.max(np.abs(y)) or 1
    y = y / pk * 0.9
    sf.write(os.path.join(out, 'voice.wav'), y, SR)
    hop = SR // 30
    env = [float(np.sqrt(np.mean(y[i:i + hop] ** 2))) for i in range(0, len(y), hop)]
    mx = max(env) or 1
    json.dump({'ep': ep, 'lang': lang, 'dur': round(total, 3), 'fps': 30, 'voice': 'own' if audio else (VOICE if lang == 'en' else 'piper-dmitri'),
               'sent': T, 'env': [round(min(1, e / mx * 1.8), 3) for e in env]},
              open(os.path.join(out, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
    print(ep, 'итого', round(total, 2), 'с')


if __name__ == '__main__':
    a = sys.argv[1:]
    audio = None
    if '--audio' in a:
        k = a.index('--audio')
        audio = a[k + 1]
        a = a[:k] + a[k + 2:]
    for ep in a or EPISODES:
        main(ep, audio)
