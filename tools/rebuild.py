#!/usr/bin/env python3
"""Собирает data/*.json в data/all-data.js (приложение грузит его одним <script>, работает и с file://).
Проверяет: JSON целый, у правил есть всё нужное, у слов из примеров есть перевод в lex.json или words.json.
Запуск: python3 tools/rebuild.py"""
import json, re, os, sys
D = os.path.join(os.path.dirname(__file__), '..', 'data')
def load(n): return json.load(open(os.path.join(D, n), encoding='utf-8'))
rules, words, lex, qs = load('rules.json'), load('words.json'), load('lex.json'), load('questions.json')

def slug(s):
    s = s.lower().replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
seen = set()
for w in words:
    w.setdefault('id', slug(w['w']))
    assert w['id'] not in seen, 'дубль слова ' + w['id']; seen.add(w['id'])
ids = {r['id'] for r in rules}
for r in rules:
    for k in ('id', 'title', 'short', 'lvl', 'tags', 'ex', 'quiz'):
        assert k in r, f"{r.get('id')}: нет {k}"
    for q in r['quiz']:
        if q['t'] in ('pick', 'mean'): assert 0 <= q['a'] < len(q['o']), r['id']
        if q['t'] == 'pick': assert '___' in q['q'], r['id'] + ': нет ___ в ' + q['q']
        if q['t'] == 'err': assert q['bad'] in q['q'], r['id'] + ': ' + q['bad']
for q in qs:
    for x in q['r']: assert x in ids, 'вопрос ссылается на нет такого правила: ' + x

# покрытие: каждое слово из примеров должно открываться
TOK = re.compile(r"[A-Za-zÄÖÜäöüß']+")
known = set(lex) | {w['w'].lower() for w in words}
miss = set()
sents = [e[0] for r in rules for e in r['ex']] + [w['ex'][0] for w in words]
for s in sents:
    for t in TOK.findall(s):
        t = t.lower().strip("'")
        if t and t not in known: miss.add(t)
if miss: print('нет в словаре:', ' '.join(sorted(miss)))

out = 'window.MD_DATA=' + json.dumps({'rules': rules, 'words': words, 'lex': lex, 'qs': qs}, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(D, 'all-data.js'), 'w', encoding='utf-8').write(out)
print(f'ok: правил {len(rules)}, заданий {sum(len(r["quiz"]) for r in rules)}, слов {len(words)}, форм в словарике {len(lex)}, вопросов {len(qs)}')
