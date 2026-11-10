#!/usr/bin/env python3
"""Перезапись последней фразы-вопроса (Claude Fable, 10.11): диктор читает финальный вопрос ровно — берём несколько дублей только этой
фразы, intonation.py выбирает тот, где голос поднялся, и дубль вклеивается в конец записи (перед ним естественная пауза — шва не слышно).

  python3 retake.py nicf-ru --voice <id> [--takes 5] [--stab .3] [--model eleven_v4]     дубли через ElevenLabs (нужен ключ в окружении)
  python3 retake.py nicf-ru --from a.mp3 b.mp3 …                                         дубли из готовых файлов (свой диктор, другой синтез)
Нужно: out/<ep>/voice.wav и timeline.json после первого прохода voice.py. Итог: out/<ep>/tts.q.wav → python3 voice.py <ep> --audio out/<ep>/tts.q.wav
Часть с ElevenLabs написана по образцу tts.py, но без ключа не запускалась — при первом запуске проверить ответ сервера.
"""
import json, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import intonation as I


def rd(f, sr):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


def main():
    a = sys.argv[1:]; ep = a[0]; opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    out = os.path.join(HERE, 'out', ep); tl = json.load(open(os.path.join(out, 'timeline.json'))); last = tl['sent'][-1]
    tdir = os.path.join(out, 'takes'); os.makedirs(tdir, exist_ok=True)
    if '--from' in a:
        files = a[a.index('--from') + 1:]
    else:
        import tts
        L = tts.lines(ep); text = tts.el_text(ep, L, True).split('\n')[-1]; lang = ep.rsplit('-', 1)[1]
        voice = opt('--voice', tts.EL_VOICE[lang]); model = opt('--model', 'eleven_v4'); stab = float(opt('--stab', '.3')); files = []
        for seed in range(1, int(opt('--takes', '5')) + 1):
            f = os.path.join(tdir, f'q_s{seed}.mp3'); open(f, 'wb').write(tts.el_say(text, voice, lang, model, stab, seed)); files.append(f)
            print('дубль', seed, '→', f)
    res = []
    for f in files:
        x = rd(f, I.SR); T, F = I.f0(x); d = len(x) / I.SR
        res.append((I.rise(T, F, 0, d, d * .55, d), f))
    res.sort(key=lambda q: -(q[0] if not np.isnan(q[0]) else -99))
    for r, f in res:
        print(f'{r:+5.1f} пт  {I.verdict(r):32s} {f}')
    best_r, best = res[0]
    y, sr = sf.read(os.path.join(out, 'voice.wav')); y = y if y.ndim == 1 else y.mean(1)
    cut = int(max(0, last['a'] - .06) * sr); head = y[:cut].copy(); n = int(.03 * sr); head[-n:] *= np.linspace(1, 0, n)
    t = rd(best, sr); idx = np.where(np.abs(t) > .02 * np.max(np.abs(t)))[0]; t = t[max(0, idx[0] - int(.02 * sr)):idx[-1] + int(.2 * sr)]
    ref = y[max(0, cut - 6 * sr):cut]; rms = lambda v: np.sqrt(np.mean(v[np.abs(v) > .02] ** 2)) if np.any(np.abs(v) > .02) else 1e-3
    t = t * (rms(ref) / rms(t))          # громкость дубля — как у соседних фраз
    res_wav = np.concatenate([head, np.zeros(int(.12 * sr)), t, np.zeros(int(.3 * sr))])
    dst = os.path.join(out, 'tts.q.wav'); sf.write(dst, (res_wav / max(1, np.max(np.abs(res_wav)) / .95)).astype(np.float32), sr)
    print(f'лучший дубль: {best} ({best_r:+.1f} пт) → {dst}\nдальше: python3 voice.py {ep} --audio {dst}')
    if not best_r >= I.OK:
        print('ВНИМАНИЕ: ни один дубль не поднялся на +3 полутона — ещё дубли (--takes 8, --stab .2) или другой голос')


if __name__ == '__main__':
    main()
