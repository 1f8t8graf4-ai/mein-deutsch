#!/usr/bin/env python3
"""Черновой тайминг без голоса: python3 tl_draft.py <ep-lang> [слов_в_секунду=2.35] → out/<ep>/timeline.json
Нужен, чтобы рисовать и смотреть кадры, пока нет озвучки (ключа ElevenLabs). Время слов — по слогам, паузы между фразами 0.17 с.
Голос пришёл → обычный путь: voice.py <ep> --audio …"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scripts import EPISODES, parse
VOW = re.compile(r'[аеёиоуыэюяaeiouy]', re.I)
def words(toks, dur, t0):
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
def main(ep, rate=5.6, gaps=None):
    L = EPISODES[ep]; T = []; t = 0.15; prev = None
    for i, (scene, s) in enumerate(L):
        text, toks = parse(s)
        syl = sum(max(1, len(VOW.findall(' '.join(tk['sp'])))) for tk in toks)
        pun = len(re.findall(r'[,:;—]', text)) * 0.16 + len(re.findall(r'[.!?…](?=\s)', text)) * 0.3
        dur = syl / rate + pun + 0.12
        if prev is not None:
            t += (gaps or {}).get(i, 0.17 if scene == prev else 0.22)
        T.append({'i': i, 'scene': scene, 'a': round(t, 3), 'b': round(t + dur, 3), 'q': 1, 'text': text, 'words': words(toks, dur, t)})
        t += dur; prev = scene
    total = t + 1.2
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', ep); os.makedirs(out, exist_ok=True)
    n = int(total * 30)
    json.dump({'ep': ep, 'lang': ep.rsplit('-', 1)[1], 'dur': round(total, 3), 'fps': 30, 'voice': 'draft', 'sent': T, 'env': [0.4] * n},
              open(os.path.join(out, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
    print(ep, 'черновой тайминг', round(total, 2), 'с;', sum(len(x['words']) for x in T), 'слов')
if __name__ == '__main__':
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 5.6)
