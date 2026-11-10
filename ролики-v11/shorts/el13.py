#!/usr/bin/env python3
"""ElevenLabs для v13 (Claude Fable, 10.11): голос с точным временем слов, звуки, музыка. Ключ — секрет окружения (прокси подставляет сам).
  python3 el13.py voice nicv-ru [--voice ID] [--model eleven_multilingual_v2] [--stab .45] [--style .3] [--speed 1.0] [--seed N]
      → out/<ep>/tts.mp3, voice.wav, timeline.json. Время слов — из ответа ElevenLabs (with-timestamps), без распознавания и без ужатия пауз.
  python3 el13.py sfx            → sfx13/*.mp3 (короткие звуки по списку SFX; готовые не перезаписывает)
  python3 el13.py music nicv-ru  → music/<ep>-raw.mp3 по плану из тайминга ролика
Экономно: голос — один дубль (≈ 1 кредит за знак, у голосов из библиотеки бывает наценка), звуки — по 1–2 с, музыка — один раз."""
import base64, json, os, re, subprocess, sys, time
import numpy as np, requests, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
H = {'xi-api-key': 'proxy-injected'}; API = 'https://api.elevenlabs.io'
BELL = 'TUQNWEvVPBLzMBSVDPUA'   # Alex Bell: по высоте (130 Гц) ближе всех к диктору оригиналов (118–135); у Макса 170 Гц
SFX = {  # имя (как в cue() рисовки) → (описание, длительность с)
    'stamp':  ('heavy rubber stamp slammed onto a paper document on a wooden desk, single dry thud, close-up, no reverb', 1.0),
    'coins':  ('cash counting machine rapidly flicking through banknotes, short burst, close-up', 1.8),
    'tick':   ('single mechanical typewriter key strike, crisp, close-up, dry', 0.5),
    'swish':  ('single sheet of paper sliding quickly across a desk, soft whoosh', 0.7),
    'impact': ('deep cinematic sub bass hit with short dark tail, movie trailer impact, no melody', 2.2),
    'thud':   ('wooden judge gavel single strike on sound block, courtroom, dry', 1.0),
    'whoosh': ('fast airy cinematic whoosh transition, short', 0.8),
    'ding':   ('small glass crystal chime, single bright note, short', 1.0),
    'puff':   ('short soft exhale of vapor, breathy puff', 0.8),
    'scuttle': ('several metal filing cabinet drawers sliding open one after another', 1.8),
    'vape':   ('person inhaling from an electronic vape pen, soft crackling hiss of the coil, close-up, quiet room', 1.6),
    'bubble': ('liquid bubbling and fizzing in a glass laboratory flask, chemical reaction, close-up', 1.6),
}

def opt(a, k, d=None): return a[a.index(k) + 1] if k in a else d

def post(path, body, tries=3):
    last = ''
    for i in range(tries):
        try:
            r = requests.post(API + path, headers=H, json=body, timeout=600)
        except requests.RequestException as e:
            last = str(e); time.sleep(5); continue
        if r.status_code == 200: return r
        last = f'{r.status_code} {r.text[:400]}'
        if r.status_code < 500: break
        time.sleep(5)
    sys.exit('ElevenLabs ' + path + ': ' + last)

def voice(ep, a):
    import tts
    from scripts import EPISODES, parse
    model = opt(a, '--model', 'eleven_multilingual_v2'); L = tts.lines(ep); text = tts.el_text(ep, L, model in ('eleven_v3', 'eleven_v4')); vid = opt(a, '--voice', BELL)
    vs = {'stability': float(opt(a, '--stab', '.45')), 'similarity_boost': .75, 'style': float(opt(a, '--style', '.3')), 'speed': float(opt(a, '--speed', '1.0'))}
    body = {'text': text, 'model_id': model, 'voice_settings': vs}
    if opt(a, '--seed'): body['seed'] = int(opt(a, '--seed'))
    print(ep, 'знаков:', len(text), 'голос', vid, model, vs)
    j = post(f'/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_192', body).json()
    out = os.path.join(HERE, 'out', ep); os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'tts.mp3'), 'wb').write(base64.b64decode(j['audio_base64'])); json.dump(j.get('alignment'), open(os.path.join(out, 'tts.align.json'), 'w'), ensure_ascii=False)
    build(ep)

def build(ep):
    """tts.mp3 + tts.align.json → voice.wav + timeline.json (время каждого слова — по буквам из ответа сервера)."""
    from scripts import EPISODES, parse
    out = os.path.join(HERE, 'out', ep); al = json.load(open(os.path.join(out, 'tts.align.json'))); SR = 44100; LEAD = .15
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(out, 'tts.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32).copy(); y = np.concatenate([np.zeros(int(LEAD * SR), np.float32), y / (np.max(np.abs(y)) or 1) * .9, np.zeros(int(1.2 * SR), np.float32)])
    sf.write(os.path.join(out, 'voice.wav'), y, SR)
    W, cur = [], None   # слово = кусок без пробелов, в котором есть буква или цифра (отдельное тире — не слово)
    dep = 0
    for ch, a0, b0 in list(zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds'])) + [(' ', 0, 0)]:
        if ch == '[': dep += 1; continue      # пометки эмоций [serious] — не слова
        if ch == ']': dep = max(0, dep - 1); continue
        if dep: continue
        if ch.isspace():
            if cur and cur[2]: W.append(cur[:2])
            cur = None
        else:
            cur = [cur[0], b0, cur[2] or ch.isalnum()] if cur else [a0, b0, ch.isalnum()]
    T, j = [], 0; need = sum(len(tk['sp']) for _, s0 in EPISODES[ep] for tk in parse(s0)[1])
    print('слов в ответе:', len(W), 'в тексте:', need)
    if len(W) != need: sys.exit('число слов не сошлось — проверить текст с тире и числами')
    for i, (scene, s0) in enumerate(EPISODES[ep]):
        text, toks = parse(s0); words = []
        for tk in toks:
            seg = W[j:j + len(tk['sp'])]; j += len(tk['sp'])
            words.append({'d': tk['d'], 'c': tk['c'], 'a': round(seg[0][0] + LEAD, 3), 'b': round(seg[-1][1] + LEAD, 3)})
        T.append({'i': i, 'scene': scene, 'a': round(words[0]['a'] - .03, 3), 'b': round(words[-1]['b'] + .05, 3), 'q': 1, 'text': text, 'words': words})
        print(f'{i:02d} {scene:9s} {T[-1]["a"]:6.2f}–{T[-1]["b"]:6.2f} {text[:60]}')
    hop = SR // 30; env = [float(np.sqrt(np.mean(y[k:k + hop] ** 2))) for k in range(0, len(y), hop)]; mx = max(env) or 1
    json.dump({'ep': ep, 'lang': 'ru', 'dur': round(len(y) / SR, 3), 'fps': 30, 'voice': 'own', 'natural': True, 'sent': T, 'env': [round(min(1, e / mx * 1.8), 3) for e in env]},
              open(os.path.join(out, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
    n = sum(len(x['words']) for x in T); print(ep, 'итого', round(len(y) / SR, 2), 'с;', round(n / (T[-1]['b'] - T[0]['a']), 2), 'слова в секунду')

def sfx():
    d = os.path.join(HERE, 'sfx13'); os.makedirs(d, exist_ok=True)
    for name, (text, dur) in SFX.items():
        f = os.path.join(d, name + '.mp3')
        if os.path.exists(f): continue
        r = post('/v1/sound-generation', {'text': text, 'duration_seconds': dur, 'prompt_influence': .5})
        open(f, 'wb').write(r.content); print('звук', name, len(r.content) // 1024, 'КБ')

def music(ep):
    tl = json.load(open(os.path.join(HERE, 'out', ep, 'timeline.json'))); S = {}
    for s in tl['sent']: S.setdefault(s['scene'], s['a'])
    dur = tl['dur']; t = lambda k: int(round(S[k]))
    prompt = (f"Instrumental underscore for a dark, witty conspiracy explainer cartoon, {int(dur)} seconds, 110 BPM, minor key, no vocals. "
              f"Pizzicato strings, soft marimba, deep sub bass, light ticking percussion, mysterious and playful like a heist film. "
              f"0-{t('memo')}s: sparse curious intro, plucks and ticking only. {t('memo')}s: bass and steady groove enter, secretive. "
              f"{t('safe')}-{t('students')}s: music thins out, hollow and muffled, suspense. {t('students')}s: groove returns brighter and builds tension. "
              f"{t('deal')}s: biggest moment, full arrangement with a low hit. Last 6 seconds: everything drops to a single pulsing note, unresolved ending.")
    print(prompt)
    r = post('/v1/music', {'prompt': prompt, 'music_length_ms': int((dur + 1) * 1000)})
    f = os.path.join(HERE, 'music', ep.rsplit('-', 1)[0] + '-raw.mp3'); open(f, 'wb').write(r.content); print('музыка →', f, len(r.content) // 1024, 'КБ')

def demon(ep):
    """Демонический слой на последнюю фразу («Признайтесь…»): чистый голос + слой на −4 полутона + слой на −8 с тёмным эхом; нарастает к последнему слову.
    Основной голос не трогается (никакого растяжения): слои подмешиваются под него. voice.clean.wav — запас без эффекта."""
    out = os.path.join(HERE, 'out', ep); tl = json.load(open(os.path.join(out, 'timeline.json'))); last = tl['sent'][-1]
    src = os.path.join(out, 'voice.clean.wav'); v = os.path.join(out, 'voice.wav')
    if not os.path.exists(src): os.replace(v, src)
    t0 = max(0, last['a'] - .08); d = last['b'] - t0; w = last['words'][-2]['a'] - t0   # слои на полную — к «захотелось»
    fg = (f"[0:a]atrim=0:{t0:.3f},asetpts=PTS-STARTPTS[head];[0:a]atrim={t0:.3f},asetpts=PTS-STARTPTS,asplit=3[main][mid][sub];"
          f"[mid]asetrate=44100*0.7937,aresample=44100,atempo=1.2599,lowpass=f=1800,chorus=0.5:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3,volume=0.55,afade=t=in:st=0:d={max(.3, w):.2f}[dm];"
          f"[sub]asetrate=44100*0.63,aresample=44100,atempo=1.5874,lowpass=f=750,aecho=0.8:0.9:55|110:0.45|0.35,volume=0.9,afade=t=in:st=0:d={max(.3, w):.2f}[dsb];"
          f"[main][dm][dsb]amix=inputs=3:duration=longest:normalize=0,alimiter=limit=0.95[tail];[head][tail]concat=n=2:v=0:a=1[o]")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-filter_complex', fg, '-map', '[o]', '-ar', '44100', '-ac', '1', v], check=True)
    print(ep, 'демонический слой с', round(t0, 2), 'с, длина фразы', round(d, 2), 'с')

if __name__ == '__main__':
    a = sys.argv[1:]
    {'voice': lambda: voice(a[1], a), 'build': lambda: build(a[1]), 'sfx': sfx, 'music': lambda: music(a[1]), 'demon': lambda: demon(a[1])}[a[0]]()
