#!/usr/bin/env python3
"""Интонация диктора: слышен ли вопрос (Claude Fable, 10.11).
Андрей на v10: «в конце не чувствуется вопрос». Этот файл меряет высоту голоса и говорит, поднялся ли он на вопросе.

  python3 intonation.py nicf-ru                 голос out/nicf-ru/voice.wav + timeline.json, вопросы — scripts.QUESTIONS
  python3 intonation.py --takes a.mp3 b.mp3 …   дубли ОДНОЙ фразы-вопроса: какой звучит вопросом сильнее (лучший — первым)

Как меряет: высота голоса (автокорреляция, 70–330 Гц) каждые 10 мс. Подъём = пик высоты на вопросном слове (или в последних 45 % дубля)
относительно медианы начала фразы, в полутонах. В русском вопросе без вопросительного слова голос резко идёт вверх на ударном слоге
главного слова: +4…8 полутонов. Меньше +3 — на слух это утверждение.
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 16000
OK, WEAK = 3.0, 1.5


def load(f):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


def f0(x, lo=70, hi=330):
    """→ (время кадров, высота в Гц или nan)"""
    W, HOP = int(.04 * SR), int(.01 * SR); l0, l1 = SR // hi, SR // lo
    n = max(0, (len(x) - W - l1) // HOP); T = np.zeros(n); F = np.full(n, np.nan)
    thr = np.sqrt(np.mean(x ** 2)) * .25 if len(x) else 0
    for i in range(n):
        a = x[i * HOP:i * HOP + W + l1]; fr = a[:W] - np.mean(a[:W]); T[i] = (i * HOP + W / 2) / SR
        e = np.sqrt(np.mean(fr ** 2))
        if e < thr:
            continue
        c = np.array([np.dot(fr, a[l:l + W] - np.mean(a[l:l + W])) for l in range(l0, l1)])
        nrm = np.sqrt(np.dot(fr, fr) * np.array([np.dot(a[l:l + W] - np.mean(a[l:l + W]), a[l:l + W] - np.mean(a[l:l + W])) for l in range(l0, l1)])) + 1e-9
        c = c / nrm; k = int(np.argmax(c))
        if c[k] > .5:
            F[i] = SR / (l0 + k)
    # убрать скачки на октаву
    med = np.nanmedian(F) if np.any(~np.isnan(F)) else np.nan
    F[(F > med * 1.9) | (F < med / 1.9)] = np.nan
    return T, F


def st(a, b):
    return 12 * np.log2(a / b) if a > 0 and b > 0 else float('nan')


def rise(T, F, a, b, wa, wb):
    """Подъём на слове [wa, wb] относительно медианы фразы [a, b] до этого слова, в полутонах."""
    base = F[(T >= a) & (T < wa) & ~np.isnan(F)]; w = F[(T >= wa - .05) & (T <= wb + .12) & ~np.isnan(F)]
    if len(base) < 5:
        base = F[(T >= a) & (T <= b) & ~np.isnan(F)]
    if len(base) < 5 or len(w) < 3:
        return float('nan')
    return st(np.percentile(w, 90), np.median(base))


def verdict(r):
    return 'нет данных' if np.isnan(r) else 'вопрос слышен' if r >= OK else 'слабо' if r >= WEAK else 'ровно — звучит как утверждение'


def episode(ep):
    sys.path.insert(0, HERE)
    import scripts
    out = os.path.join(HERE, 'out', ep); tl = json.load(open(os.path.join(out, 'timeline.json')))
    T, F = f0(load(os.path.join(out, 'voice.wav'))); Q = getattr(scripts, 'QUESTIONS', {}).get(ep, {})
    base = [rise(T, F, s['a'], s['b'], s['words'][-1]['a'], s['words'][-1]['b']) for s in tl['sent'] if s['i'] not in Q]
    base = [x for x in base if not np.isnan(x)]
    print(f'{ep}: голос {np.nanmedian(F):.0f} Гц; конец обычной фразы: {np.mean(base):+.1f} полутона (от медианы фразы)' if base else ep)
    bad = 0
    for i, pref in Q.items():
        s = tl['sent'][i]; w = next((w for w in s['words'] if w['d'].lower().strip('«».,?!:—*').startswith(pref)), s['words'][-1])
        r = max(rise(T, F, s['a'], s['b'], w['a'], w['b']), rise(T, F, s['a'], s['b'], s['words'][-1]['a'], s['words'][-1]['b']))
        v = verdict(r); bad += v != 'вопрос слышен'
        print(f'  {i:2d} {r:+5.1f} пт  {v:32s} {s["text"]}')
    print('ИТОГ:', 'все вопросы слышны' if not bad else f'{bad} вопрос(а) перезаписать — см. README «Интонация»')
    return bad


def takes(files):
    res = []
    for f in files:
        x = load(f); T, F = f0(x); d = len(x) / SR
        res.append((rise(T, F, 0, d, d * .55, d), f))
    for r, f in sorted(res, key=lambda q: -(q[0] if not np.isnan(q[0]) else -99)):
        print(f'{r:+5.1f} пт  {verdict(r):32s} {f}')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--takes':
        takes(a[1:])
    elif a:
        sys.exit(1 if episode(a[0]) else 0)
    else:
        print(__doc__)
