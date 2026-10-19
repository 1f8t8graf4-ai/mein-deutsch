/* «Мой немецкий» — мини-апп. Без сборщиков: один файл.
   Данные — window.MD_DATA из data/all-data.js (собирает tools/rebuild.py из data/*.json).
   Прогресс — localStorage (md_v1) + Telegram CloudStorage (кусками md_0…, md_n).
   1.2: путь уроков (всё по шагу на экран), справочник, «Мои слова» как в «Языках по кино», 3 вида на пробу. */
(function () {
'use strict';
const TG = window.Telegram && Telegram.WebApp && Telegram.WebApp.platform && Telegram.WebApp.platform !== 'unknown' ? Telegram.WebApp : null;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const D = window.MD_DATA || { rules: [], words: [], lex: {}, qs: [] };
const RBY = {}, WBY = {};
D.rules.forEach(r => RBY[r.id] = r); D.words.forEach(w => WBY[w.id] = w);
const DAY = 864e5, DAYS = [1, 3, 7, 21, 60];
const ST = { n: 'нейтрально', r: 'разговорное', s: 'сленг', o: 'официально' };
const CATS = [['kurs', 'С курса B2'], ['base', 'Базовые слова'], ['live', 'Живой немецкий'], ['char', 'Характер'], ['b2', 'К экзамену B2']]; // порядок в пути
const CAT_SHORT = { kurs: 'с курса B2', base: 'база', live: 'живой немецкий', char: 'характер', b2: 'к экзамену B2' };
const CAT_NAME = Object.fromEntries(CATS);
const SKINS = [['kino', 'Кино'], ['book', 'Учебник'], ['duo', 'Яркий']];
const SKIN_BG = { kino: '#0b0b0d', book: '#F4EEE1', duo: '#FFFFFF' };
const CYR = /[а-яё]/i;
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const IC = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  set: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  slow: svg('<path d="M3 15.5c0-4.1 3.6-7.5 8-7.5s8 3.4 8 7.5z"/><path d="M8 15.5l3-7.4 3 7.4M3.6 12.5h14.8"/><circle cx="21" cy="13.6" r="1.7"/><path d="M6.5 15.5v2.6M15.5 15.5v2.6"/>'),
  spk: svg('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  lock: svg('<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
  rule: svg('<path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z"/><path d="M9 9h6M9 13h6"/>'),
  words: svg('<rect x="3" y="6" width="13" height="14" rx="2.5"/><path d="M8 3h10a3 3 0 0 1 3 3v11"/>'),
  q: svg('<path d="M4 5h16v11H9l-5 4z"/><path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9M12 13.6v.1"/>'),
  rep: svg('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
};
// шапка вкладки: заголовок + поиск и настройки
const head = t => `<div class="hd"><h1>${esc(t)}</h1><button class="ic" data-act="search" aria-label="Поиск">${IC.search}</button><button class="ic" data-act="set" aria-label="Настройки">${IC.set}</button></div>`;
// подвкладки текстом: [[значение, подпись, число]], cur — выбранное, attr — data-атрибут
const stabs = (items, cur, attr) => `<div class="stabs">${items.map(([v, t, n]) => `<button class="${v === cur ? 'on' : ''}" data-${attr}="${esc(v)}">${esc(t)}${n ? `<small>${n}</small>` : ''}</button>`).join('')}</div>`;
const pl = (n, f) => f[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2];
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- хранилище ---------- */
const KEY = 'md_v1';
const fresh = () => ({ v: 1, srs: {}, my: [], del: [], seen: {}, ls: {}, t0: 0, opt: { type: false, rem: true, hh: 10, skin: 'kino' }, sv: 0 });
let S = fresh();
try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v) S = Object.assign(fresh(), o); } catch (e) {}
S.opt = Object.assign(fresh().opt, S.opt);
function save(local) {
  S.sv = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  if (!local) cloudQueue();
}
// облако Telegram: значение до 4096 символов → режем на куски
const CS = TG && TG.CloudStorage && TG.isVersionAtLeast && TG.isVersionAtLeast('6.9') ? TG.CloudStorage : null;
let cloudOK = false, cloudT = 0;
function cloudQueue() { if (!CS || !cloudOK) return; clearTimeout(cloudT); cloudT = setTimeout(cloudWrite, 1200); }
function cloudWrite() {
  const s = JSON.stringify(S), parts = [];
  for (let i = 0; i < s.length; i += 3800) parts.push(s.slice(i, i + 3800));
  parts.forEach((p, i) => CS.setItem('md_' + i, p, () => {}));
  CS.setItem('md_n', String(parts.length), () => {});
}
function merge(a, b) { // a — своё, b — из облака
  const o = Object.assign(fresh(), a.sv >= b.sv ? a : b);
  o.srs = Object.assign({}, a.srs);
  for (const k in b.srs) if (!o.srs[k] || (b.srs[k][2] || 0) > (o.srs[k][2] || 0)) o.srs[k] = b.srs[k];
  o.del = [...new Set([...(a.del || []), ...(b.del || [])])];
  const my = {};
  [...(a.my || []), ...(b.my || [])].forEach(x => { if (!my[x.id] || x.t > my[x.id].t) my[x.id] = x; });
  o.my = Object.values(my).filter(x => !o.del.includes(x.id)).sort((x, y) => (x.c || x.t) - (y.c || y.t));
  o.seen = Object.assign({}, b.seen, a.seen);
  o.ls = Object.assign({}, b.ls, a.ls); // урок пройден — берём более раннюю отметку
  for (const k in b.ls || {}) if (o.ls[k] > b.ls[k]) o.ls[k] = b.ls[k];
  o.t0 = Math.min(a.t0 || Infinity, b.t0 || Infinity); if (!isFinite(o.t0)) o.t0 = 0;
  o.opt = Object.assign(fresh().opt, (a.sv >= b.sv ? a : b).opt);
  return o;
}
function cloudRead() {
  if (!CS) return;
  CS.getItem('md_n', (err, n) => {
    if (err) return;
    n = +n || 0;
    if (!n) { cloudOK = true; cloudQueue(); return; }
    CS.getItems([...Array(n)].map((_, i) => 'md_' + i), (e2, r) => {
      if (e2) return;
      try {
        const b = JSON.parse([...Array(n)].map((_, i) => r['md_' + i] || '').join(''));
        if (b && b.v) { S = merge(S, b); migrate(); save(true); skin(); if (!STACK.length || !STACK[STACK.length - 1].lesson && !QZ) render(); }
      } catch (e) {}
      cloudOK = true; cloudQueue();
    });
  });
}

/* ---------- интервальное повторение ---------- */
const now = () => Date.now();
const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function grade(key, ok) { // ok — верно с первой попытки
  const e = S.srs[key] || [0, 0, 0];
  let step = e[0];
  if (ok) { step = Math.min(step + 1, DAYS.length); e[1] = dayStart(now()) + DAYS[step - 1] * DAY; }
  else { step = 0; e[1] = dayStart(now()) + DAY; }
  S.srs[key] = [step, e[1], now()];
}
const isDue = k => S.srs[k] && S.srs[k][1] <= now();
const dueKeys = () => Object.keys(S.srs).filter(isDue).filter(keyOk).sort((a, b) => S.srs[a][1] - S.srs[b][1]);
const learned = k => S.srs[k] && S.srs[k][0] >= DAYS.length;
function keyOk(k) { // ключ ещё существует в данных
  const p = k.split(':');
  if (p[0] === 'q') return RBY[p[1]] && RBY[p[1]].quiz[+p[2]];
  if (p[0] === 'w') return !!WBY[p[1]];
  if (p[0] === 'm') return S.my.some(x => x.id === p[1] && x.ru);
  return false;
}
function whenTxt(k) {
  const e = S.srs[k]; if (!e) return '';
  if (learned(k)) return 'выучено';
  const d = Math.round((dayStart(e[1]) - dayStart(now())) / DAY);
  return d <= 0 ? 'повторить сегодня' : d === 1 ? 'повтор завтра' : `повтор через ${d} ${pl(d, ['день', 'дня', 'дней'])}`;
}

/* ---------- голос ---------- */
let VOICE = null;
function pickVoice() { const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || []; VOICE = vs.find(v => /^de(-|_)DE/i.test(v.lang)) || vs.find(v => /^de/i.test(v.lang)) || null; }
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, slow) {
  if (!window.speechSynthesis) return toast('Голос недоступен на этом устройстве');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/\([^)]*\)/g, ' ').replace(/[„“«»…]/g, ''));
  u.lang = 'de-DE'; if (VOICE) u.voice = VOICE; u.rate = slow ? 0.62 : 0.95;
  speechSynthesis.speak(u);
}
const wordDe = w => (w.art ? w.art + ' ' : '') + w.w;

/* ---------- примеры: каждое слово нажимается ---------- */
const EXS = [];
const TOKRE = /([A-Za-zÄÖÜäöüß0-9']+(?:-[A-Za-zÄÖÜäöüß]+)*)|([^A-Za-zÄÖÜäöüß0-9']+)/g;
function toks(s) { const out = []; let m; TOKRE.lastIndex = 0; while ((m = TOKRE.exec(s))) out.push(m[1] ? { w: m[1] } : { p: m[2] }); return out; }
const low = t => t.toLowerCase();
function deHTML(de, ru, o) { // предложение: слова — span.w
  o = o || {};
  const i = EXS.push({ de, ru, x: o.x || [], g: o.g || {} }) - 1;
  const xs = new Set(); (o.x || []).forEach(x => x[0].split(' ').forEach(t => xs.add(low(t))));
  return toks(de).map((t, j) => t.w && !/^\d+$/.test(t.w) ? `<span class="w${xs.has(low(t.w)) ? ' xw' : ''}" data-s="${i}" data-j="${j}">${esc(t.w)}</span>` : esc(t.w || t.p)).join(''); // числа не нажимаются
}
function exHTML(e, cls) { // [de, ru, {x,g}]
  return `<div class="ex${cls ? ' ' + cls : ''}"><div class="tx"><div class="de">${deHTML(e[0], e[1], e[2])}</div>${e[1] ? `<div class="ru">${esc(e[1])}</div>` : ''}</div>
    <div class="say"><button data-say="${esc(e[0])}" aria-label="Послушать">${IC.spk}</button><button class="slow" data-say="${esc(e[0])}" data-slow="1" aria-label="Медленно">${IC.slow}</button></div></div>`;
}
function lexOf(tok) {
  const t = low(tok), t2 = t.replace(/^'+|'+$/g, '');
  return D.lex[t] || D.lex[t2] || null;
}
function wordOf(base, tok) { // карточка из words.json, если есть
  const cands = [base, tok].filter(Boolean).map(low);
  return D.words.find(w => cands.includes(low(w.w)) || cands.includes(low(w.w.replace(/^sich /, '')))) || null;
}
function srcOf(de) { // откуда пример: правило или слово
  const r = D.rules.find(r => r.ex.some(e => e[0] === de)); if (r) return 'r:' + r.id;
  const w = D.words.find(w => w.ex && w.ex[0] === de); return w ? 'w:' + w.id : '';
}
const starTxt = on => on ? '★ В моих словах' : '☆ В мои слова';
function wordPop(el) {
  const ex = EXS[+el.dataset.s]; if (!ex) return;
  const tok = el.textContent, t = low(tok);
  const L = lexOf(tok), xp = ex.x.find(x => x[0].split(' ').map(low).includes(t));
  const base = L ? L[0] : tok, ru = ex.g[t] || (L ? L[1] : ''), note = L && L[2];
  const wd = wordOf(base, tok);
  const nn = /^(der|die|das) /.exec(base);
  const key = xp ? xp[1] : base;
  $$('.w.on').forEach(x => x.classList.remove('on')); el.classList.add('on');
  sheet(`<h3>${esc(tok)} <button class="ic" data-say="${esc(tok)}" aria-label="Послушать">${IC.spk}</button></h3>
    ${base && low(base) !== t ? `<div class="base">начальная форма: ${nn ? `<b class="art-${nn[1]}">${esc(nn[1])}</b> ${esc(base.slice(4))}` : `<b>${esc(base)}</b>`}</div>` : ''}
    <div class="ru">${ru ? esc(ru) : '<span class="mut">перевода этого слова пока нет</span>'}</div>
    ${note ? `<div class="note">${esc(note)}</div>` : ''}
    ${xp ? `<div class="xp"><b>${esc(xp[1])}</b>${esc(xp[2])}</div>` : ''}
    <div class="note">В предложении: «${esc(ex.ru)}»</div>
    <div class="acts">${wd ? `<button class="btn sec" data-word="${wd.id}">Карточка слова</button>` : ''}
      <button class="btn${myFind(key) ? ' on' : ''}" id="addMy">${starTxt(myFind(key))}</button></div>`,
    () => { $$('.w.on').forEach(x => x.classList.remove('on')); refMyRefresh(); });
  const b = $('#addMy');
  b.onclick = () => {
    const f = myFind(key);
    if (f) { myRemove(f.id); toast('Убрал из «Моих слов»'); }
    else { myAdd({ w: key, ru: xp ? xp[2] : ru, ex: [ex.de, ex.ru], src: srcOf(ex.de), ref: wd ? wd.id : '' }); haptic('ok'); toast('⭐ В «Моих словах» — придёт в повторение'); }
    b.textContent = starTxt(!f); b.classList.toggle('on', !f);
  };
}

/* ---------- «Мои слова» (как в «Языках по кино») ---------- */
const myFind = w => S.my.find(x => low(x.w) === low(w));
function myAdd(o) {
  const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  S.my.push(Object.assign({ id, w: '', ru: '', ex: null, tags: [], src: '', ref: '', t: now(), c: now() }, o, { id }));
  if (o.ru) S.srs['m:' + id] = [0, now(), now()];
  save(); badge();
  return id;
}
function myRemove(id) { S.my = S.my.filter(y => y.id !== id); if (!S.del.includes(id)) S.del.push(id); delete S.srs['m:' + id]; save(); badge(); }
const myLearned = x => { const e = S.srs['m:' + x.id]; return !!(e && e[0] >= 3 && e[1] > now()); };
function mySrc(x) { // подпись источника: она же автометка и группа
  if (x.own) return 'добавлено мной';
  const p = (x.src || '').split(':');
  if (p[0] === 'r' && RBY[p[1]]) return RBY[p[1]].title.split(':')[0];
  if (p[0] === 'w' && WBY[p[1]]) return CAT_NAME[WBY[p[1]].cat];
  if (x.ref && WBY[x.ref]) return CAT_NAME[WBY[x.ref].cat];
  return 'из примеров';
}
const myTagsOf = x => [...(x.tags || []), mySrc(x)];
function dmRow(x) {
  const k = 'm:' + x.id, e = S.srs[k], st = Math.min(5, e ? e[0] : 0);
  const status = !x.ru ? '<span class="dm-st">без перевода — в повторение не попадёт</span>' : myLearned(x) ? '<span class="dm-st ok">выучено</span>'
    : !e || isDue(k) ? '<span class="dm-st on">повторить сегодня</span>' : `<span class="dm-st">${whenTxt(k)}</span>`;
  const p = (x.src || '').split(':');
  const src = p[0] === 'r' && RBY[p[1]] ? `<button class="dm-src" data-rule="${p[1]}">правило&nbsp;›</button>` : (x.ref || p[0] === 'w') && WBY[x.ref || p[1]] ? `<button class="dm-src" data-word="${x.ref || p[1]}">карточка&nbsp;›</button>` : '';
  return `<div class="dm" data-id="${x.id}"><div class="dm-h"><b>${esc(x.w)}</b><span class="dots" title="Выучено на ${st} из 5">${[0, 1, 2, 3, 4].map(i => `<i class="${i < st ? 'on' : ''}"></i>`).join('')}</span><button class="ic dm-del" data-mdel="${x.id}" aria-label="Убрать">${IC.x}</button></div>
    ${x.ru ? `<div class="dm-ru">${esc(x.ru)}</div>` : ''}${x.ex && x.ex[0] ? `<div class="dm-line">${esc(x.ex[0])}</div>` : ''}
    ${(x.tags || []).length ? `<div class="dm-tags">${x.tags.map(t => `<i>#${esc(t)}</i>`).join('')}</div>` : ''}
    <div class="dm-acts"><button class="ic" data-say="${esc(x.w)}" aria-label="Послушать">${IC.spk}</button>${src}${status}</div></div>`;
}
function myView() { // что сейчас видно в «Моих словах»: вкладка, тег, поиск
  const L = S.my.slice().reverse(), q = norm(F.myq).trim();
  const T = F.myt === 'lrn' ? L.filter(myLearned) : L.filter(x => !myLearned(x));
  return T.filter(x => (!F.mytag || myTagsOf(x).includes(F.mytag)) && (!q || norm(x.w + ' ' + (x.ru || '') + ' ' + (x.tags || []).join(' ')).includes(q)));
}
function myListHTML() {
  const V = myView(), G = [], grp = {};
  V.forEach(x => { const g = mySrc(x); if (!grp[g]) { grp[g] = []; G.push(g); } grp[g].push(x); });
  if (!V.length) return `<div class="empty">${S.my.length ? (F.myq || F.mytag ? 'Ничего не нашлось.' : F.myt === 'lrn' ? 'Пока ничего не выучено — повторяй, и слова переедут сюда.' : 'Всё выучено 👏') : 'Пока пусто.<br><small>Нажми на любое слово в примере → «☆ В мои слова». Или добавь своё кнопкой «＋ Своё».</small>'}</div>`;
  return G.map(g => `<h2>${esc(g)} <small>${grp[g].length}</small></h2><div class="list dm-l">${grp[g].map(dmRow).join('')}</div>`).join('');
}
function myHTML() {
  const L = S.my, lrn = L.filter(myLearned).length, tags = [...new Set(L.flatMap(myTagsOf))];
  const due = L.filter(x => x.ru && (!S.srs['m:' + x.id] || isDue('m:' + x.id))), trN = Math.min(8, myView().filter(x => x.ru).length);
  const nW = n => `${n} ${pl(n, ['слово', 'слова', 'слов'])}`;
  return `<p class="lead dm-what">Слова, которые ты сохранил сам: нажми на любое слово в примере → <b>☆ В мои слова</b>. Они приходят в повторение — завтра, через 3 дня, через неделю… пока не выучишь.</p>
    ${due.length ? `<button class="btn dm-now" id="dmNow">Повторить сейчас · ${nW(Math.min(8, due.length))} →</button>` : trN ? `<button class="btn sec dm-now" id="dmTrain">Проверить себя · ${nW(trN)} →</button>` : ''}
    <div class="seg"><button class="${F.myt !== 'lrn' ? 'on' : ''}" data-myt="rep">Учу <i>${L.length - lrn}</i></button><button class="${F.myt === 'lrn' ? 'on' : ''}" data-myt="lrn">Выучено <i>${lrn}</i></button></div>
    <div class="dm-tools"><label class="srch">${IC.search}<input id="dmQ" type="search" placeholder="Найти в моих словах" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(F.myq)}"></label><button class="btn sec dm-addb" id="dmAddB">＋ Своё</button></div>
    <form class="dm-add" id="dmAdd" autocomplete="off" hidden><input name="w" placeholder="Слово или фраза по-немецки" required maxlength="60"><input name="ru" placeholder="Перевод" maxlength="80">
      <div class="dm-addr"><input name="tag" placeholder="#тег, например работа" maxlength="24" list="dmTagL"><datalist id="dmTagL">${[...new Set(L.flatMap(x => x.tags || []))].map(t => `<option value="${esc(t)}">`).join('')}</datalist><button class="btn" type="submit">Добавить</button></div></form>
    ${tags.length ? `<div class="tagq dm-tagq">${tags.map(t => `<button class="${F.mytag === t ? 'on' : ''}" data-mytag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
    <div id="dmL">${myListHTML()}</div>`;
}
function myBind(m) {
  const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  $$('[data-myt]', m).forEach(b => b.onclick = () => { if (F.myt === b.dataset.myt) return; F.myt = b.dataset.myt; haptic(); re(); });
  $$('[data-mytag]', m).forEach(b => b.onclick = () => { F.mytag = F.mytag === b.dataset.mytag ? '' : b.dataset.mytag; haptic(); re(); });
  const q = $('#dmQ', m);
  if (q) q.oninput = () => { F.myq = q.value; EXS.length = 0; $('#dmL', m).innerHTML = myListHTML(); };
  const f = $('#dmAdd', m);
  $('#dmAddB', m).onclick = () => { f.hidden = !f.hidden; if (!f.hidden) f.w.focus(); };
  f.onsubmit = e => {
    e.preventDefault();
    const w = f.w.value.trim(), ru = f.ru.value.trim(), tg = f.tag.value.trim().replace(/^#/, '').toLowerCase();
    if (!w) return;
    if (myFind(w)) return toast('Такое слово уже есть');
    myAdd({ w, ru, tags: tg ? [tg] : [], own: true });
    haptic('ok'); toast('⭐ Добавил в «Мои слова»'); F.myt = 'rep'; F.myq = ''; re();
  };
  const now_ = $('#dmNow', m); if (now_) now_.onclick = () => myQuiz(S.my.filter(x => x.ru && (!S.srs['m:' + x.id] || isDue('m:' + x.id))));
  const tr = $('#dmTrain', m); if (tr) tr.onclick = () => myQuiz(myView());
}
function refMyRefresh() { if (TAB === 'ref' && F.ref === 'my' && !STACK.length) { const y = window.scrollY; render(); window.scrollTo(0, y); } }
// варианты ответа: сначала из своих слов, потом похожие по длине
function distract(right, pools, n) {
  const out = [], seen = new Set([low(right)]);
  for (const P of pools) {
    const c = shuf([...new Set(P.filter(x => x && !seen.has(low(x))))]).sort((a, b) => Math.abs(a.length - right.length) - Math.abs(b.length - right.length)).slice(0, 8);
    for (const x of shuf(c)) { if (out.length >= n) break; if (!seen.has(low(x))) { seen.add(low(x)); out.push(x); } }
    if (out.length >= n) break;
  }
  return out;
}
function optsFrom(right, pools) { const all = shuf([right, ...distract(right, pools, 3)]); return { o: all, a: all.indexOf(right) }; }
function myQuiz(list) {
  const K = shuf(list.filter(x => x.ru)).slice(0, 8);
  if (!K.length) return toast('Нет слов с переводом');
  const items = [];
  const pairs = set => ({ key: '', task: { t: 'pairs', set: set.map(x => [x.w, x.ru]) } });
  if (K.length >= 4) items.push(pairs(K.slice(0, 4)));
  K.forEach(x => items.push({ key: 'm:' + x.id, task: myTask(x) }));
  if (K.length >= 8) items.push(pairs(K.slice(4, 8)));
  runQuiz(items, 'Мои слова', { again: () => myQuiz(list) });
}

/* ---------- шторка, тост, вибро ---------- */
let sheetClose = null, sheetOn = false; // sheetOn — шторка открыта (класс open появляется кадром позже, ради анимации)
function sheet(html, onClose) {
  const ov = $('#ov');
  ov.innerHTML = `<div class="dim"></div><div class="sh" role="dialog">${html}</div>`;
  sheetOn = true; requestAnimationFrame(() => { if (sheetOn) ov.classList.add('open'); });
  $('.dim', ov).onclick = closeSheet;
  sheetClose = onClose || null; backSync();
  return $('.sh', ov);
}
function closeSheet() {
  const ov = $('#ov'); if (!sheetOn) return false;
  sheetOn = false; ov.classList.remove('open'); const f = sheetClose; sheetClose = null; if (f) f();
  setTimeout(() => { if (!sheetOn) ov.innerHTML = ''; }, 260); backSync();
  return true;
}
function toast(t) { $$('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }
function haptic(k) { try { if (TG && TG.HapticFeedback) k === 'ok' || k === 'bad' ? TG.HapticFeedback.notificationOccurred(k === 'ok' ? 'success' : 'error') : TG.HapticFeedback.selectionChanged(); } catch (e) {} }

/* ---------- навигация ---------- */
let TAB = 'learn', STACK = [];
const F = { lvl: '', ref: S.my.length ? 'my' : 'rules', myt: 'rep', mytag: '', myq: '', open: {}, pathAll: false, q: '' };
try { const t = sessionStorage.getItem('md_tab'); TAB = ['learn', 'rep', 'ref'].includes(t) ? t : t ? 'ref' : 'learn'; } catch (e) {}
function go(page) { page.y = window.scrollY; STACK.push(page); render(); window.scrollTo(0, 0); } // y — куда вернуть прокрутку по «назад»
function swap(page) { const p = STACK.pop(); page.y = p ? p.y : 0; STACK.push(page); render(); window.scrollTo(0, 0); } // заменить верхнюю страницу
function back() {
  if (closeSheet()) return;
  if (STACK.length) { const p = STACK.pop(); if (p.quiz) QZ = null; if (p.lesson) LS = null; render(); if (p.y != null) window.scrollTo(0, p.y); }
}
function backSync() {
  if (!TG || !TG.BackButton) return;
  STACK.length || sheetOn ? TG.BackButton.show() : TG.BackButton.hide();
}
function tabGo(t) {
  TAB = t; STACK = []; QZ = null; LS = null; closeSheet();
  try { sessionStorage.setItem('md_tab', TAB); } catch (e) {}
  render(); window.scrollTo(0, 0);
}
function render() {
  EXS.length = 0;
  const top = STACK[STACK.length - 1];
  document.body.classList.toggle('sub', !!top);
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === TAB));
  const m = $('#main');
  if (top) m.innerHTML = top.r();
  else m.innerHTML = ({ learn: pathHTML, rep: repHTML, ref: refHTML })[TAB]();
  if (top && top.bind) top.bind(m); else bindTab(m);
  badge(); backSync();
}

/* ---------- путь уроков ---------- */
// урок-правило — r:<id>; урок-слова — p:<id первого слова>, пачки по 5 внутри раздела (остаток не меньше 4)
function packsOf(cat) {
  const L = D.words.filter(w => w.cat === cat), n = L.length, k = Math.ceil(n / 5), out = [];
  let i = 0;
  for (let j = 0; j < k; j++) {
    const ws = L.slice(i, i + Math.floor(n / k) + (j < n % k ? 1 : 0)); i += ws.length;
    out.push({ id: 'p:' + ws[0].id, kind: 'w', cat, ws, title: [...new Set(ws.map(w => w.sub))].join(' · ') });
  }
  const cnt = {}; out.forEach(p => cnt[p.title] = (cnt[p.title] || 0) + 1);
  const no = {}; out.forEach(p => { if (cnt[p.title] > 1) p.title += ' · ' + (no[p.title] = (no[p.title] || 0) + 1); });
  return out;
}
const PACKS = CATS.flatMap(c => packsOf(c[0]));
const LV = ['A1', 'A2', 'B1', 'B2', 'C1'];
const RLESS = D.rules.slice().sort((a, b) => LV.indexOf(a.lvl) - LV.indexOf(b.lvl)).map(r => ({ id: 'r:' + r.id, kind: 'r', r, title: r.title }));
const LBY = {}; [...RLESS, ...PACKS].forEach(l => LBY[l.id] = l);
const qDate = id => D.qs.filter(q => q.r.includes(id)).map(q => q.d).sort().pop() || '';
const dayStr = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const isFresh = l => l.kind === 'r' && S.t0 && qDate(l.r.id) >= dayStr(S.t0); // правило из вопроса, заданного после первого запуска 1.2
function buildPath() { // пройденные (в порядке прохождения) → новые из вопросов → остальные: правило, слова, слова, правило…
  const base = []; let i = 0, j = 0;
  while (i < RLESS.length || j < PACKS.length) { if (i < RLESS.length) base.push(RLESS[i++]); for (let k = 0; k < 2 && j < PACKS.length; k++) base.push(PACKS[j++]); }
  const done = base.filter(l => S.ls[l.id]).sort((a, b) => S.ls[a.id] - S.ls[b.id]), todo = base.filter(l => !S.ls[l.id]);
  return [...done, ...todo.filter(isFresh), ...todo.filter(l => !isFresh(l))];
}
function lessonMeta(l) {
  const n = l.kind === 'r' ? ruleSteps(l.r).length + l.r.quiz.length : l.ws.length * 2 + 2;
  return `${n} ${pl(n, ['шаг', 'шага', 'шагов'])} · ~${Math.max(2, Math.round(n * 0.35))} мин`;
}
function lessonKick(l) { return l.kind === 'r' ? (isFresh(l) ? 'Из твоего вопроса · ' + l.r.lvl : 'Правило · ' + l.r.lvl) : 'Слова · ' + CAT_SHORT[l.cat]; }
let JUST = null; // урок, который только что прошли: следующая карточка «выпрыгивает»
function nodeHTML(l, st, k) {
  const kind = isFresh(l) ? 'q' : l.kind, ico = { r: IC.rule, w: IC.words, q: IC.q }[kind];
  const cls = `node ${st} k-${kind}`, at = `style="--zz:${[0, -1, 0, 1][k % 4]}"`, nn = `<em class="nn">${k + 1}</em>`; // --zz — сдвиг змейки в виде «Яркий»
  if (st === 'cur') return `<div class="${cls}${JUST ? ' pop' : ''}" ${at}><i class="nd">${ico}</i><div class="nc"><small>${nn}${esc(lessonKick(l))}</small><b>${esc(l.title)}</b>
    <p>${esc(l.kind === 'r' ? l.r.short : l.ws.map(w => w.w).join(', '))}</p><span class="nm">${lessonMeta(l)}</span><button class="btn" data-lsn="${l.id}">Начать</button></div></div>`;
  return `<button class="${cls}" ${at} ${st === 'lock' ? `data-lock="${esc(l.title)}"` : `data-lsn="${l.id}"`}><i class="nd">${st === 'done' ? IC.check : IC.lock}</i><span class="nt"><small>${nn}${esc(lessonKick(l))}</small><b>${esc(l.title)}</b></span></button>`;
}
function pathHTML() {
  const P = buildPath(), cur = P.findIndex(l => !S.ls[l.id]), nDone = cur < 0 ? P.length : cur, due = dueKeys().length;
  const shown = F.pathAll ? P.slice(0, nDone) : P.slice(Math.max(0, nDone - 2), nDone), hidden = nDone - shown.length;
  let h = `${head('Учить')}<div class="pth-top"><span>${cur < 0 ? 'Все уроки пройдены' : `Урок ${nDone + 1} из ${P.length}`}</span><div class="prog"><i style="width:${nDone / Math.max(1, P.length) * 100}%"></i></div></div>`;
  if (due) h += `<button class="due-chip" data-tabgo="rep">${IC.rep}<span>Повторить</span><b>${due}</b></button>`;
  h += '<div class="path">';
  if (hidden) h += `<button class="pmore" id="pAll">ещё ${hidden} ${pl(hidden, ['урок', 'урока', 'уроков'])} пройдено ▾</button>`;
  h += shown.map((l, k) => nodeHTML(l, 'done', nDone - shown.length + k)).join('');
  if (cur >= 0) {
    h += nodeHTML(P[cur], 'cur', cur);
    P.slice(cur + 1, cur + 3).forEach((l, k) => h += nodeHTML(l, 'lock', cur + 1 + k));
    const rest = P.length - cur - 3; if (rest > 0) h += `<div class="prest">и ещё ${rest} ${pl(rest, ['урок', 'урока', 'уроков'])}</div>`;
  } else h += `<div class="pfin"><b>Путь пройден</b><p>Новые уроки появятся из твоих вопросов. А пока — повторяй.</p></div>`;
  return h + '</div>';
}

/* ---------- урок: один шаг на экран ---------- */
let LS = null; // {l, st: шаги, i: шаг, p: часть шага, items: задания, from}
function ruleSteps(r) {
  const st = [];
  st.push({ k: 'sut', n: 1, html: () => `<div class="kk">${esc(r.lvl)} · Суть</div><h1 class="lt">${esc(r.title)}</h1><div class="big">${esc(r.short)}</div>${exHTML(r.ex[0], 'ex1')}`, say: () => r.ex[0][0] });
  if (r.table) st.push({ k: 'tbl', n: 1, html: () => `<div class="kk">Схема</div><div class="tbl"><table><tr>${r.table.h.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${r.table.r.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>` });
  if (r.when && r.when.length) st.push({ k: 'when', n: r.when.length, html: (p, nw) => `<div class="kk">Когда что</div><ul class="when">${r.when.slice(0, p + 1).map((w, i) => `<li class="${i === p && nw ? 'new' : ''}">${esc(w)}</li>`).join('')}</ul>` });
  const ex = r.ex.slice(1, 4);
  if (ex.length) st.push({ k: 'ex', n: ex.length, html: (p, nw) => `<div class="kk">Примеры <small>нажми на любое слово</small></div><div class="list">${ex.slice(0, p + 1).map((e, i) => exHTML(e, i === p && nw ? 'new' : '')).join('')}</div>`, say: p => ex[p][0] });
  const ms = (r.mistakes || []).slice(0, 2);
  if (ms.length) st.push({ k: 'mis', n: ms.length * 2, btn: p => p % 2 ? '' : 'Как правильно?', html: (p, nw) => `<div class="kk">Типичная ошибка</div>${ms.slice(0, (p >> 1) + 1).map((x, j) => `<div class="mis2${2 * j === p && nw ? ' new' : ''}"><div class="lbl">Так говорят русские</div><div class="no">${esc(x[0])}</div>
      ${p >= 2 * j + 1 ? `<div class="right${2 * j + 1 === p && nw ? ' new' : ''}"><div class="lbl ok">Правильно</div><div class="yes">${esc(x[1])}</div><small>${esc(x[2])}</small></div>` : ''}</div>`).join('')}`,
    say: p => p % 2 ? ms[p >> 1][1] : '' });
  return st;
}
function wordStepHTML(w, i, n) {
  const mine = myFind(wordDe(w));
  return `<div class="kk">Слово ${i + 1} из ${n}</div>
    <div class="wbig">${w.art ? `<span class="art-${w.art}">${w.art}</span> ` : ''}<b>${esc(w.w)}</b></div>
    <div class="wact"><button class="ic" data-say="${esc(wordDe(w))}" aria-label="Послушать">${IC.spk}</button><button class="ic slow" data-say="${esc(wordDe(w))}" data-slow="1" aria-label="Медленно">${IC.slow}</button><button class="star${mine ? ' on' : ''}" data-star="${w.id}">${starTxt(mine)}</button></div>
    <div class="wru">${esc(w.ru)}</div>
    <dl class="kv">${w.pl ? `<dt>Мн. ч.</dt><dd>${esc(w.pl)}</dd>` : ''}${w.forms ? `<dt>Формы</dt><dd>${esc(w.forms)}</dd>` : ''}${w.sep ? `<dt>Приставка</dt><dd>${esc(w.sep)} — отделяется</dd>` : ''}${w.gov ? `<dt>Управление</dt><dd>${esc(w.gov)}</dd>` : ''}${w.snd ? `<dt>Как звучит</dt><dd>«${esc(w.snd)}»</dd>` : ''}${w.opp ? `<dt>Противоп.</dt><dd>${esc(w.opp)}</dd>` : ''}${w.st !== 'n' ? `<dt>Стиль</dt><dd>${ST[w.st]}</dd>` : ''}</dl>
    ${w.note ? `<div class="note">${esc(w.note)}</div>` : ''}${exHTML(w.ex)}`;
}
function revTask(w, ws) { // «Как по-немецки?»: русское → 4 немецких
  const r = optsFrom(wordDe(w), [ws.map(wordDe), D.words.filter(x => x.cat === w.cat).map(wordDe), D.words.map(wordDe)]);
  return { t: 'mean', q: w.ru, o: r.o, a: r.a, ex: w.ex, rev: true };
}
function lessonOpen(id) {
  const l = LBY[id]; if (!l) return;
  closeSheet();
  if (l.r) { S.seen[l.r.id] = S.seen[l.r.id] || now(); save(true); }
  const st = l.kind === 'r' ? ruleSteps(l.r) : l.ws.map((w, i) => ({ k: 'word', n: 1, html: () => wordStepHTML(w, i, l.ws.length), say: () => wordDe(w) }));
  const items = l.kind === 'r' ? l.r.quiz.map((q, i) => ({ key: 'q:' + l.r.id + ':' + i, task: q, rule: l.r }))
    : [...l.ws.map(w => ({ key: 'w:' + w.id, task: wordTask(w, l.ws) })), ...shuf(l.ws).slice(0, 2).map(w => ({ key: '', task: revTask(w, l.ws) }))];
  LS = { l, st, i: 0, p: 0, nw: false, items, from: TAB };
  go({ r: lessonHTML, bind: bindLesson, lesson: true });
  stepSay();
}
function stepSay() { const s = LS && LS.st[LS.i], t = s && s.say && s.say(LS.p); if (t && !CYR.test(t)) say(t); }
function lessonHTML() {
  const L = LS, s = L.st[L.i], tot = L.st.length + L.items.length, lastStep = L.i === L.st.length - 1, lastPart = L.p >= s.n - 1;
  const btn = !lastPart ? (s.btn && s.btn(L.p)) || 'Дальше' : lastStep ? `К заданиям · ${L.items.length}` : 'Дальше';
  return `<div class="ls ls-${s.k}"><div class="qtop"><button class="ic" data-back aria-label="Закрыть">${IC.x}</button><div class="prog"><i style="width:${L.i / tot * 100}%"></i></div>${L.l.kind === 'r' ? `<button class="lk" id="lsFull">Конспект</button>` : `<span class="qn">${L.i + 1}/${L.st.length}</span>`}</div>
    <div class="stp${L.nw ? '' : ' in'}">${s.html(L.p, L.nw)}</div>
    <div class="bar"><div class="in"><button class="btn" id="lsNx">${esc(btn)}</button></div></div></div>`;
}
function bindLesson(m) {
  const L = LS; if (!L) return;
  $('[data-back]', m).onclick = back;
  const full = $('#lsFull', m); if (full) full.onclick = () => go({ r: () => rulePage(L.l.r), bind: mm => bindRule(mm, L.l.r) });
  $$('[data-star]', m).forEach(b => b.onclick = () => {
    const w = WBY[b.dataset.star], f = myFind(wordDe(w));
    if (f) { myRemove(f.id); toast('Убрал из «Моих слов»'); } else { myAdd({ w: wordDe(w), ru: w.ru, ex: w.ex, src: 'w:' + w.id, ref: w.id }); haptic('ok'); toast('⭐ В «Моих словах»'); }
    b.textContent = starTxt(!f); b.classList.toggle('on', !f);
  });
  $('#lsNx', m).onclick = () => {
    const s = L.st[L.i];
    haptic();
    if (L.p < s.n - 1) { L.p++; L.nw = true; render(); const n = $('.stp .new', m); if (n) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); stepSay(); return; }
    if (L.i < L.st.length - 1) { L.i++; L.p = 0; L.nw = false; render(); window.scrollTo(0, 0); stepSay(); return; }
    runQuiz(L.items, L.l.title, { pre: L.st.length, lesson: L.l, from: L.from, replace: true });
  };
}
function confetti() { // видно только в виде «Яркий»
  const C = ['#58CC02', '#1CB0F6', '#FFC800', '#FF4B4B', '#CE82FF'];
  return `<div class="confetti" aria-hidden="true">${[...Array(28)].map((_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.09}s;--r:${(i * 53) % 360}deg;background:${C[i % 5]}"></i>`).join('')}</div>`;
}
function lessonEndHTML(Q) {
  const l = Q.lesson, nRep = new Set(Q.items.filter(it => it.key).map(it => it.key)).size, clean = Q.ok === Q.first;
  return `<div class="qz lend"><div class="res"><div class="medal">${IC.check}</div><div class="stamp">${clean ? 'Sehr gut!' : 'Gut!'}</div><div class="lt">Урок пройден</div>
    <p>${Q.ok} из ${Q.first} — с первого раза</p><p class="mut">+${nRep} в повторении · первое — завтра</p></div>${confetti()}
    <div class="bar"><div class="in"><button class="btn" id="lsNext">${Q.from === 'learn' ? 'Дальше по пути' : 'Готово'}</button>${l.kind === 'r' ? '<button class="btn sec" id="lsFull">Конспект</button>' : ''}</div></div></div>`;
}

/* ---------- конспект правила (всё правило одной страницей — справка) ---------- */
function ruleOpen(id) { lessonOpen('r:' + id); }
function rulePage(r) {
  const qs = D.qs.filter(q => q.r.includes(r.id));
  return `<div class="pg"><div class="pgh"><button class="ic" data-back aria-label="Назад">${IC.back}</button><span class="t">${esc(r.title)}</span><span class="lv">${r.lvl}</span></div>
    <div class="kk">Конспект</div><h1 class="pt">${esc(r.title)}</h1>
    <div class="tags">${r.tags.filter(t => !/^[ABC]\d$/.test(t)).map(t => `<span>#${esc(t)}</span>`).join('')}</div>
    <div class="short">${esc(r.short)}</div>
    ${r.table ? `<h2>Схема</h2><div class="tbl"><table><tr>${r.table.h.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${r.table.r.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>` : ''}
    ${r.when ? `<h2>Когда что</h2><ul class="when">${r.when.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
    <h2>Примеры <small>нажми на любое слово</small></h2><div class="list">${r.ex.map(e => exHTML(e)).join('')}</div>
    ${r.mistakes && r.mistakes.length ? `<h2>Типичные ошибки</h2><div class="list">${r.mistakes.map(x => `<div class="mis"><div class="no">${esc(x[0])}</div><div class="yes">${esc(x[1])}</div><small>${esc(x[2])}</small></div>`).join('')}</div>` : ''}
    ${qs.length ? `<h2>Ты спрашивал</h2><div class="list">${qs.map(q => `<div class="qref"><small>${dateTxt(q.d)}</small>${esc(q.q)}</div>`).join('')}</div>` : ''}
    <div class="bar"><div class="in"><button class="btn" id="rQuiz">Проверить · ${r.quiz.length}</button></div></div></div>`;
}
function bindRule(m, r) {
  $('[data-back]', m).onclick = back;
  $('#rQuiz', m).onclick = () => runQuiz(r.quiz.map((q, i) => ({ key: 'q:' + r.id + ':' + i, task: q, rule: r })), r.title);
}

/* ---------- справочник ---------- */
const STS = { r: 'разг.', s: 'сленг', o: 'офиц.' }, CAT_ST = { live: 'r', b2: 'o' }; // в «Живом» всё разговорное, в B2 всё официальное — там метку не пишем
const ruleDone = r => r.quiz.filter((_, i) => { const e = S.srs['q:' + r.id + ':' + i]; return e && e[0] >= 1; }).length;
function ruleCard(r) { // строка правила в поиске
  return `<button class="rc" data-rule="${r.id}"><span class="tx"><b>${esc(r.title)}</b><p>${esc(r.short)}</p></span>
    <span class="mt"><span class="lv">${r.lvl}</span>${S.ls['r:' + r.id] ? `<span class="okm">${IC.check}</span>` : ''}</span></button>`;
}
function wRow(w, k) {
  const a = w.art ? `<span class="art-${w.art}">${w.art}</span> ` : '';
  return `<button class="wr" data-word="${w.id}"><span class="tx"><b>${a}${esc(w.w)}</b><small>${esc(w.ru)}</small></span>
    ${k && S.srs[k] ? `<span class="in-rep">${whenTxt(k)}</span>` : STS[w.st] && CAT_ST[w.cat] !== w.st ? `<span class="st st-${w.st}">${STS[w.st]}</span>` : ''}</button>`;
}
function myRow(x) {
  return `<button class="wr" data-my="${x.id}"><span class="tx"><b>${esc(x.w)}</b><small>${esc(x.ru || '')}</small></span><span class="in-rep">${whenTxt('m:' + x.id)}</span></button>`;
}
function refHTML() {
  const body = { my: myHTML, rules: refRulesHTML, words: refWordsHTML, qs: qsBody }[F.ref] || refRulesHTML;
  return `${head('Справочник')}${stabs([['my', 'Мои слова', S.my.length], ['rules', 'Правила', 0], ['words', 'Слова', 0], ['qs', 'Вопросы', 0]], F.ref, 'ref')}<div class="refb">${body()}</div>`;
}
function refRulesHTML() { // 1.3: правила со своей группой (grp: «Грамматика B2» — с курса) — отдельным разделом сверху, остальные по уровням
  const grps = [...new Set(D.rules.map(r => r.grp).filter(Boolean))], lv = LV.filter(l => D.rules.some(r => r.lvl === l && !r.grp));
  const row = x => `<button class="rr" data-lsn="${x.id}"><span class="tx"><b>${esc(x.title)}</b></span>${S.ls[x.id] ? `<span class="okm">${IC.check}</span>` : '<span class="chev">›</span>'}</button>`;
  return `<p class="lead">Нажми — правило откроется по шагам. Целиком — кнопка «Конспект».</p>
    ${grps.map(g => `<h2>${esc(g)}</h2><div class="list">${D.rules.filter(r => r.grp === g).map(r => row(LBY['r:' + r.id])).join('')}</div>`).join('')}
    ${lv.map(l => `<h2>${l}</h2><div class="list">${RLESS.filter(x => x.r.lvl === l && !x.r.grp).map(row).join('')}</div>`).join('')}`;
}
function refWordsHTML() {
  return `<p class="lead">Слова пачками по 5: нажми — карточки по одной, в конце проверка.</p>
    ${CATS.map(([c, name]) => { const P = PACKS.filter(p => p.cat === c), n = P.reduce((a, p) => a + p.ws.length, 0), d = P.filter(p => S.ls[p.id]).length;
      return `<details class="cat"${F.open[c] ? ' open' : ''} data-c="${c}"><summary><span class="tx"><b>${esc(name)}</b><small>${n} ${pl(n, ['слово', 'слова', 'слов'])} · пройдено ${d} из ${P.length}</small></span><i class="chev">›</i></summary>
        <div class="list">${P.map(p => `<button class="pk" data-lsn="${p.id}"><span class="tx"><b>${esc(p.title)}</b><small>${esc(p.ws.map(w => w.w).join(', '))}</small></span>${S.ls[p.id] ? `<span class="okm">${IC.check}</span>` : '<span class="chev">›</span>'}</button>`).join('')}</div></details>`; }).join('')}`;
}
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const dateTxt = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${MON[+m - 1]} ${y}`; };
function qsBody() {
  const L = D.qs.slice().reverse(), ds = [...new Set(L.map(q => q.d))];
  return `<p class="lead">Всё, что ты спрашивал. Нажми на правило — откроется урок.</p>
    ${ds.map(d => `<h2>${dateTxt(d)}</h2><div class="list">${L.filter(q => q.d === d).map(q => `<div class="qi"><div class="q">${esc(q.q)}</div>
      <div class="ql">${q.r.filter(id => RBY[id]).map(id => `<button data-rule="${id}">${esc(RBY[id].title)}&nbsp;›</button>`).join('')}</div></div>`).join('')}</div>`).join('')}`;
}
function wordCard(id) {
  const w = WBY[id]; if (!w) return;
  const k = 'w:' + id;
  sheet(`<h3>${w.art ? `<span class="art-${w.art}">${w.art}</span>` : ''}${esc(w.w)} <button class="ic" data-say="${esc(wordDe(w).replace(/[…]/g, ''))}" aria-label="Послушать">${IC.spk}</button></h3>
    <div class="ru">${esc(w.ru)}</div>
    <dl class="kv">${w.pl ? `<dt>Мн. ч.</dt><dd>${esc(w.pl)}</dd>` : ''}${w.forms ? `<dt>Формы</dt><dd>${esc(w.forms)}</dd>` : ''}${w.sep ? `<dt>Приставка</dt><dd>${esc(w.sep)} — отделяется</dd>` : ''}
      ${w.gov ? `<dt>Управление</dt><dd>${esc(w.gov)}</dd>` : ''}${w.snd ? `<dt>Как звучит</dt><dd>«${esc(w.snd)}»</dd>` : ''}${w.opp ? `<dt>Противоп.</dt><dd>${esc(w.opp)}</dd>` : ''}
      <dt>Стиль</dt><dd>${ST[w.st]}${w.tags.length ? ' · ' + w.tags.map(t => '#' + esc(t)).join(' ') : ''} · ${w.lvl}</dd>${S.srs[k] ? `<dt>Повтор</dt><dd>${whenTxt(k)}</dd>` : ''}</dl>
    ${w.note ? `<div class="note">${esc(w.note)}</div>` : ''}
    ${exHTML(w.ex)}
    <div class="acts"><button class="btn${myFind(wordDe(w)) ? ' on' : ''}" id="wMy">${starTxt(myFind(wordDe(w)))}</button></div>`, refMyRefresh);
  $('#wMy').onclick = () => {
    const f = myFind(wordDe(w)), b = $('#wMy');
    if (f) { myRemove(f.id); toast('Убрал из «Моих слов»'); } else { myAdd({ w: wordDe(w), ru: w.ru, ex: w.ex, src: 'w:' + w.id, ref: w.id }); haptic('ok'); toast('⭐ В «Моих словах» — придёт в повторение'); }
    b.textContent = starTxt(!f); b.classList.toggle('on', !f);
  };
}
function myCard(id) {
  const x = S.my.find(y => y.id === id); if (!x) return;
  sheet(`<h3>${esc(x.w)} <button class="ic" data-say="${esc(x.w)}" aria-label="Послушать">${IC.spk}</button></h3><div class="ru">${esc(x.ru || '')}</div>
    <div class="note">${whenTxt('m:' + id)}</div>${x.ex ? exHTML(x.ex) : ''}
    <div class="acts"><button class="btn sec" id="myDel">Убрать из моих слов</button></div>`, refMyRefresh);
  $('#myDel').onclick = () => { myRemove(id); closeSheet(); render(); toast('Убрано'); };
}

/* ---------- вкладка «Повторить» ---------- */
function repHTML() {
  const due = dueKeys(), all = Object.keys(S.srs).filter(keyOk), lrn = all.filter(learned).length;
  const nx = all.filter(k => !isDue(k)).map(k => S.srs[k][1]).sort((a, b) => a - b)[0];
  return `${head('Повторить')}
    <div class="rep">${due.length ? `<div class="big">${due.length}</div><div class="sub">${pl(due.length, ['задание', 'задания', 'заданий'])} на сегодня</div>
        <button class="btn" id="go">Начать · ${Math.min(due.length, 8)}</button>`
      : `<div class="done">${all.length ? 'На сегодня всё' : 'Повторять пока нечего'}</div>
        <div class="sub">${nx ? 'Следующее — ' + whenTxt(all.find(k => S.srs[k][1] === nx)) : 'Пройди урок — задания из него придут сюда.'}</div>
        <button class="btn" data-tabgo="learn">Учить дальше →</button>`}</div>
    <div class="stats"><div><b>${all.length}</b><span>в повторении</span></div><div><b>${lrn}</b><span>выучено</span></div><div><b>${S.my.length}</b><span>моих слов</span></div></div>
    <p class="lead c">Интервалы: 1 → 3 → 7 → 21 → 60 дней.<br>Ошибся или ответил не с первого раза — снова завтра.</p>`;
}
function startRep() {
  const ks = dueKeys().slice(0, 8);
  if (!ks.length) return toast('Нет заданий');
  runQuiz(ks.map(itemOf).filter(Boolean), 'Повторение');
}
function itemOf(k) {
  const p = k.split(':');
  if (p[0] === 'q') return { key: k, task: RBY[p[1]].quiz[+p[2]], rule: RBY[p[1]] };
  if (p[0] === 'w') return { key: k, task: wordTask(WBY[p[1]]) };
  if (p[0] === 'm') { const x = S.my.find(y => y.id === p[1]); return x && x.ru ? { key: k, task: myTask(x) } : null; }
  return null;
}
function wordTask(w, ws) {
  if (w.art && Math.random() < 0.5) return { t: 'art', w: w.w, a: w.art, pl: w.pl, ru: w.ru, ex: w.ex };
  const r = optsFrom(w.ru, [(ws || []).map(x => x.ru), D.words.filter(x => x.cat === w.cat).map(x => x.ru), D.words.map(x => x.ru)]);
  return { t: 'mean', q: wordDe(w), o: r.o, a: r.a, ex: w.ex, word: true };
}
function myTask(x) {
  const r = optsFrom(x.ru, [S.my.map(y => y.ru), D.words.map(y => y.ru), Object.values(D.lex).map(v => v[1])]);
  return { t: 'mean', q: x.w, o: r.o, a: r.a, ex: x.ex, word: true };
}

/* ---------- поиск ---------- */
const norm = s => low(String(s || '')).replace(/ß/g, 'ss').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ё/g, 'е');
function searchHTML(q) {
  const n = norm(q).trim(); if (!n) return '';
  const hit = s => norm(s).includes(n);
  const rs = D.rules.filter(r => hit(r.title) || hit(r.short) || r.tags.some(hit) || (r.when || []).some(hit));
  const ws = D.words.filter(w => hit(w.w) || hit(w.ru) || w.tags.some(hit) || hit(w.sub));
  const my = S.my.filter(x => hit(x.w) || hit(x.ru));
  const exs = []; D.rules.forEach(r => r.ex.forEach(e => { if (hit(e[0]) || hit(e[1])) exs.push([r, e]); }));
  const lx = Object.keys(D.lex).filter(k => norm(k) === n || norm(D.lex[k][0]) === n).slice(0, 4);
  if (!rs.length && !ws.length && !exs.length && !my.length && !lx.length) return `<div class="empty">Ничего не нашлось по «${esc(q)}».<br>Спроси меня в чате — сделаю урок.</div>`;
  return `${lx.length ? `<h2>Словарик</h2><div class="list">${lx.map(k => `<div class="wr"><span class="tx"><b>${esc(k)}</b><small>${esc(D.lex[k][0])} — ${esc(D.lex[k][1])}</small></span></div>`).join('')}</div>` : ''}
    ${rs.length ? `<h2>Правила <small>${rs.length}</small></h2><div class="list">${rs.map(ruleCard).join('')}</div>` : ''}
    ${ws.length || my.length ? `<h2>Слова <small>${ws.length + my.length}</small></h2><div class="list">${my.map(myRow).join('')}${ws.slice(0, 30).map(w => wRow(w, 'w:' + w.id)).join('')}</div>` : ''}
    ${exs.length ? `<h2>Примеры <small>${exs.length}</small></h2><div class="list">${exs.slice(0, 30).map(([r, e]) => `<div class="exq">${exHTML(e)}<button class="from" data-rule="${r.id}">${esc(r.title)}&nbsp;›</button></div>`).join('')}</div>` : ''}`;
}
// поиск — своя страница: поле сверху, ниже результаты (поле не перерисовываем — на iPhone не слетает клавиатура)
function searchOpen() {
  F.q = '';
  go({ r: searchPage, bind: bindSearch, fresh: true });
}
function searchPage() {
  const tags = [...new Set(D.rules.flatMap(r => r.tags).filter(t => !/^[ABC]\d$/.test(t)))];
  return `<div class="pg srp"><div class="pgh"><button class="ic" data-back aria-label="Назад">${IC.back}</button>
    <label class="srch">${IC.search}<input id="q" type="search" enterkeyhint="search" placeholder="Правило, слово, пример" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(F.q)}"><button class="ic" id="qx" aria-label="Очистить"${F.q ? '' : ' hidden'}>${IC.x}</button></label></div>
    <div id="sr">${F.q.trim() ? searchHTML(F.q) : searchHint(tags)}</div></div>`;
}
const searchHint = tags => `<p class="lead">Ищи по-немецки или по-русски. Умлауты можно не ставить: «gross» найдёт «groß».</p>
  <h2>Темы</h2><div class="tagq">${tags.map(t => `<button data-tq="${esc(t)}">#${esc(t)}</button>`).join('')}</div>`;
function bindSearch(m) {
  const pg = STACK[STACK.length - 1], inp = $('#q', m), x = $('#qx', m), sr = $('#sr', m);
  const tags = [...new Set(D.rules.flatMap(r => r.tags).filter(t => !/^[ABC]\d$/.test(t)))];
  const upd = () => { F.q = inp.value; x.hidden = !F.q; EXS.length = 0; sr.innerHTML = F.q.trim() ? searchHTML(F.q) : searchHint(tags); };
  $('[data-back]', m).onclick = back;
  inp.addEventListener('input', upd);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  x.onclick = e => { e.preventDefault(); inp.value = ''; upd(); inp.focus(); };
  sr.addEventListener('click', e => { const t = e.target.closest('[data-tq]'); if (t) { inp.value = t.dataset.tq; upd(); } });
  if (pg.fresh) { pg.fresh = false; setTimeout(() => inp.focus(), 60); }
}

/* ---------- задания ---------- */
let QZ = null;
function runQuiz(items, title, o) { // o: pre — шагов урока до заданий, lesson, from, again, replace
  if (!items.length) return;
  o = o || {};
  QZ = { items: items.slice(), title, i: 0, ok: 0, first: items.length, redo: [], pre: o.pre || 0, lesson: o.lesson || null, from: o.from || TAB, again: o.again || null };
  (o.replace ? swap : go)({ r: quizHTML, bind: bindQuiz, quiz: true });
}
const pickFull = t => { const o = t.o[t.a]; return t.q.replace('___', /^\(/.test(o) ? '' : o).replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1'); };
const WORDS = s => toks(s).filter(t => t.w).map(t => t.w);
function quizHTML() {
  const Q = QZ, n = Q.items.length;
  if (Q.i >= n) return Q.lesson ? lessonEndHTML(Q) : `<div class="qz"><div class="qtop"><button class="ic" data-back aria-label="Закрыть">${IC.x}</button><div class="prog"><i style="width:100%"></i></div></div>
    <div class="res"><div class="big">${Q.ok} / ${Q.first}</div><p>верно с первого раза</p>
    <p>${Q.ok === Q.first ? 'Чисто — всё с первого раза.' : 'Ошибки вернутся завтра — так и запоминается.'}</p></div>
    <div class="bar"><div class="in"><button class="btn" data-back>Готово</button>${Q.again ? '<button class="btn sec" id="qAgain">Ещё раз</button>' : ''}</div></div></div>`;
  const it = Q.items[Q.i], t = it.task;
  const top = `<div class="qtop"><button class="ic" data-back aria-label="Закрыть">${IC.x}</button><div class="prog"><i style="width:${(Q.pre + Q.i) / (Q.pre + n) * 100}%"></i></div><span class="qn">${Q.i + 1}/${n}</span></div>`;
  let body = '';
  if (t.t === 'pick') {
    const [a, b] = t.q.split('___');
    body = `<div class="qk">Выбери, что вставить</div><div class="qq">${esc(a)}<span class="gap" id="gap">&nbsp;</span>${esc(b)}</div>${t.ru ? `<div class="qhint">${esc(t.ru)}</div>` : ''}
      <div class="opts">${t.o.map((o, i) => `<button class="opt" data-o="${i}">${esc(o)}</button>`).join('')}</div>`;
  } else if (t.t === 'mean') {
    const de = !CYR.test(t.q);
    body = `<div class="qk">${t.rev ? 'Как по-немецки?' : de ? 'Что значит?' : 'Выбери'}</div><div class="qq qw">${esc(t.q)}${de ? `<button class="ic" data-say="${esc(t.q)}" aria-label="Послушать">${IC.spk}</button>` : ''}</div>
      <div class="opts">${t.o.map((o, i) => `<button class="opt" data-o="${i}">${esc(o)}</button>`).join('')}</div>`;
  } else if (t.t === 'art') {
    body = `<div class="qk">der, die или das?</div><div class="qq big">${esc(t.w)}</div><div class="qhint">${esc(t.ru)}</div>
      <div class="arts">${['der', 'die', 'das'].map(a => `<button class="opt art-${a}" data-art="${a}">${a}</button>`).join('')}</div>`;
  } else if (t.t === 'pairs') {
    body = `<div class="qk">Соедини пары</div><div class="pairs"><div>${shuf(t.set.map((_, i) => i)).map(i => `<button class="opt" data-pl="${i}">${esc(t.set[i][0])}</button>`).join('')}</div>
      <div>${shuf(t.set.map((_, i) => i)).map(i => `<button class="opt" data-pr="${i}">${esc(t.set[i][1])}</button>`).join('')}</div></div>`;
  } else if (t.t === 'build') {
    if (S.opt.type) body = `<div class="qk">Напиши по-немецки</div><div class="qq">${esc(t.ru)}</div><input class="typ" id="typ" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Пиши здесь…">
      <div class="qgo"><button class="btn" id="chk">Проверить</button></div>`;
    else body = `<div class="qk">Собери фразу</div><div class="qq">${esc(t.ru)}</div><div class="slots" id="slots"></div>
      <div class="tiles" id="tiles">${shuf(WORDS(t.de).map((w, i) => ({ w, i }))).map(x => `<button class="tile" data-i="${x.i}">${esc(x.w)}</button>`).join('')}</div>
      <div class="qgo"><button class="btn" id="chk" disabled>Проверить</button></div>`;
  } else if (t.t === 'err') {
    body = `<div class="qk">Найди ошибку — нажми на неправильное слово</div>
      <div class="errs">${WORDS(t.q).map((w, i) => `<button class="tile" data-e="${i}">${esc(w)}</button>`).join('')}</div>`;
  }
  return `<div class="qz">${top}<div class="stp in">${body}<div id="fb"></div></div><div class="bar" id="nxB" hidden><div class="in"><button class="btn" id="nx">Дальше</button></div></div></div>`;
}
function bindQuiz(m) {
  $$('[data-back]', m).forEach(b => b.onclick = back);
  const Q = QZ; if (!Q) return;
  if (Q.i >= Q.items.length) {
    if (Q.lesson && !Q.marked) { Q.marked = true; S.ls[Q.lesson.id] = S.ls[Q.lesson.id] || now(); JUST = Q.lesson.id; haptic('ok'); }
    save(); badge();
    const a = $('#qAgain', m); if (a) a.onclick = () => { STACK.pop(); QZ = null; Q.again(); };
    const nx = $('#lsNext', m); if (nx) nx.onclick = back;
    const fl = $('#lsFull', m); if (fl) fl.onclick = () => { const r = Q.lesson.r; QZ = null; swap({ r: () => rulePage(r), bind: mm => bindRule(mm, r) }); };
    return;
  }
  const it = Q.items[Q.i], t = it.task;
  let tries = 0, done = false;
  const finish = (ok, html, hd) => {
    if (done) return; done = true;
    const first = !Q.redo.includes(it), clean = ok && tries === 0;
    if (first) { if (it.key) grade(it.key, clean); if (clean) Q.ok++; }
    if (!clean && first && it.key) { Q.redo.push(it); Q.items.push(it); }
    save(); haptic(ok ? 'ok' : 'bad');
    const rl = it.rule ? it.rule.short : '';
    $('#fb').innerHTML = `<div class="fb ${ok ? 'ok' : 'bad'}"><div class="h">${hd || (ok ? (tries ? 'Верно — со второй попытки' : 'Верно!') : 'Не совсем')}</div>${html || ''}${rl ? `<div class="rl">${esc(rl)}</div>` : ''}</div>`;
    $('#nxB').hidden = false; $('#nx').onclick = () => { Q.i++; render(); window.scrollTo(0, 0); };
  };
  const exLine = (de, ru) => exHTML([de, ru || '']);
  if (t.t === 'pick' || t.t === 'mean') {
    $$('.opt', m).forEach(b => b.onclick = () => {
      const i = +b.dataset.o, ok = i === t.a;
      $$('.opt', m).forEach(x => x.disabled = true);
      b.classList.add(ok ? 'ok' : 'bad'); $$('.opt', m)[t.a].classList.add('ok');
      if (t.t === 'pick') {
        const full = pickFull(t); $('#gap').textContent = t.o[t.a];
        finish(ok, `${t.w ? `<div>${esc(t.w)}</div>` : ''}${CYR.test(full) ? '' : exLine(full, t.ru)}`);
        if (!CYR.test(full)) say(full);
      } else {
        finish(ok, `${t.rev ? `<div><b>${esc(t.o[t.a])}</b> — ${esc(t.q)}</div>` : ''}${t.w ? `<div>${esc(t.w)}</div>` : ''}${t.ex && t.ex[0] ? exLine(t.ex[0], t.ex[1]) : ''}`);
        if (t.rev) say(t.o[t.a]); else if (t.word && !CYR.test(t.q)) say(t.q);
      }
    });
  } else if (t.t === 'art') {
    $$('[data-art]', m).forEach(b => b.onclick = () => {
      const ok = b.dataset.art === t.a; $$('[data-art]', m).forEach(x => x.disabled = true);
      b.classList.add(ok ? 'ok' : 'bad'); $(`[data-art="${t.a}"]`, m).classList.add('ok');
      finish(ok, `<div><b class="art-${t.a}">${t.a}</b> ${esc(t.w)}${t.pl ? ' · ' + esc(t.pl) : ''}</div>${t.ex ? exLine(t.ex[0], t.ex[1]) : ''}`);
      say(t.a + ' ' + t.w);
    });
  } else if (t.t === 'pairs') { // соедини пары: ошибки не двигают расписание (ключа нет), но считаются
    let sel = null, left = t.set.length, miss = 0;
    $$('[data-pl]', m).forEach(b => b.onclick = () => { if (b.disabled) return; $$('[data-pl]', m).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b; haptic(); });
    $$('[data-pr]', m).forEach(b => b.onclick = () => {
      if (!sel || b.disabled) return;
      if (b.dataset.pr === sel.dataset.pl) {
        sel.classList.remove('sel'); sel.classList.add('ok'); b.classList.add('ok'); sel.disabled = b.disabled = true; say(t.set[+b.dataset.pr][0]); sel = null;
        if (--left === 0) { tries = miss ? 1 : 0; finish(true, '', miss ? `Пары собраны · ошибок: ${miss}` : 'Все пары верно!'); }
      } else { miss++; b.classList.add('bad'); haptic('bad'); setTimeout(() => b.classList.remove('bad'), 450); }
    });
  } else if (t.t === 'err') {
    const ws = WORDS(t.q);
    $$('[data-e]', m).forEach(b => b.onclick = () => {
      if (done) return;
      const ok = ws[+b.dataset.e] === t.bad;
      if (!ok && tries === 0) { tries++; b.classList.add('bad'); haptic('bad'); toast('Нет, тут всё верно. Ещё раз'); return; }
      $$('[data-e]', m).forEach(x => { if (ws[+x.dataset.e] === t.bad) x.classList.add('ok'); });
      finish(ok, `<div><s class="no">${esc(t.bad)}</s> → <b class="yes">${esc(t.fix)}</b></div>${t.w ? `<div class="w2">${esc(t.w)}</div>` : ''}`);
    });
  } else if (t.t === 'build') {
    const target = WORDS(t.de), right = () => exLine(t.de, t.ru);
    if (S.opt.type) {
      const inp = $('#typ', m); setTimeout(() => inp.focus(), 50);
      const chk = () => {
        const a = norm(inp.value).replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(), b = norm(target.join(' ')).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        const ok = a === b || lev(a, b) <= 1;
        if (!ok && tries === 0) { tries++; inp.classList.add('bad'); haptic('bad'); toast('Не совсем — попробуй ещё'); return; }
        inp.disabled = true; finish(ok, right()); say(t.de);
      };
      $('#chk', m).onclick = chk; inp.onkeydown = e => { if (e.key === 'Enter') chk(); };
      return;
    }
    const slots = $('#slots', m), tiles = $('#tiles', m), put = [];
    const draw = () => {
      slots.innerHTML = put.map((i, k) => `<button class="tile" data-k="${k}">${esc(target[i])}</button>`).join('');
      $$('#tiles .tile', m).forEach(b => b.classList.toggle('used', put.includes(+b.dataset.i)));
      $('#chk', m).disabled = put.length !== target.length;
      $$('.tile', slots).forEach(b => b.onclick = () => { if (done) return; put.splice(+b.dataset.k, 1); slots.className = 'slots'; draw(); });
    };
    $$('.tile', tiles).forEach(b => b.onclick = () => { if (done || put.includes(+b.dataset.i)) return; put.push(+b.dataset.i); haptic(); draw(); });
    $('#chk', m).onclick = () => {
      const got = put.map(i => target[i]), ok = got.join(' ') === target.join(' ');
      if (ok) { slots.className = 'slots ok'; $('#chk', m).disabled = true; finish(true, right()); say(t.de); return; }
      tries++;
      $$('.tile', slots).forEach((b, k) => b.classList.add(got[k] === target[k] ? 'ok' : 'bad'));
      slots.className = 'slots bad'; haptic('bad');
      if (tries >= 2) { $('#chk', m).disabled = true; finish(false, `<div>Правильно:</div>${right()}`); say(t.de); }
      else toast('Почти. Зелёные — на месте; красные убери и поставь иначе');
    };
    draw();
  }
}
function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; }

/* ---------- настройки ---------- */
function settings() {
  const api = window.MD_API;
  sheet(`<h3>Настройки</h3>
    <div class="sw-row col"><div>Вид<small>Три варианта на пробу — выбери, какой нравится</small></div>
      <div class="skins">${SKINS.map(([k, n]) => `<button class="${S.opt.skin === k ? 'on' : ''}" data-skin="${k}"><i class="sk sk-${k}"><b>Aa</b></i>${n}</button>`).join('')}</div></div>
    <div class="sw-row"><div>Задания с вводом текста<small>Вместо кубиков — писать самому</small></div><button class="sw${S.opt.type ? ' on' : ''}" data-opt="type" aria-label="Ввод текста"></button></div>
    <div class="sw-row"><div>Напоминание в боте<small>${api ? 'Раз в день: «5 заданий на сегодня»' : 'Заработает, когда подключим бота'}</small></div><button class="sw${S.opt.rem ? ' on' : ''}" data-opt="rem" aria-label="Напоминание"></button></div>
    <div class="sw-row"><div>Во сколько</div><select id="hh">${[...Array(18)].map((_, i) => i + 6).map(h => `<option value="${h}"${S.opt.hh === h ? ' selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></div>
    <div class="sw-row"><div>Сбросить прогресс<small>Уроки, повторение и мои слова — с нуля</small></div><button class="rst" id="rst">Сбросить</button></div>
    <p class="ver">Мой немецкий · версия ${esc(window.V || '')}</p>`, () => { if (!STACK.length) render(); });
  $$('[data-skin]').forEach(b => b.onclick = () => { S.opt.skin = b.dataset.skin; $$('[data-skin]').forEach(x => x.classList.toggle('on', x === b)); skin(); save(); haptic(); });
  $$('[data-opt]').forEach(b => b.onclick = () => { const k = b.dataset.opt; S.opt[k] = !S.opt[k]; b.classList.toggle('on', S.opt[k]); save(); if (k === 'rem') remindSync(true); });
  $('#hh').onchange = e => { S.opt.hh = +e.target.value; save(); remindSync(true); };
  let armed = false;
  $('#rst').onclick = e => {
    if (!armed) { armed = true; e.target.textContent = 'Точно? Нажми ещё'; return; }
    const opt = S.opt; S.my.forEach(x => S.del.push(x.id)); const del = S.del;
    S = fresh(); S.opt = opt; S.del = del; S.t0 = now(); save(); closeSheet(); render(); toast('Прогресс сброшен');
  };
}
function remindSync(show) {
  const api = window.MD_API; if (!api || !TG || !TG.initData) { if (show && !api) toast('Сохранено. Напоминание заработает, когда подключим бота'); return; }
  let tz = 'Europe/Berlin'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
  fetch(api + '/api/remind', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ init: TG.initData, on: !!S.opt.rem, hh: S.opt.hh, tz }) })
    .then(r => r.json()).then(j => { if (show) toast(j.ok ? (S.opt.rem ? `Напомню в ${String(S.opt.hh).padStart(2, '0')}:00` : 'Напоминание выключено') : 'Не вышло: ' + (j.err || 'ошибка')); })
    .catch(() => { if (show) toast('Нет связи с ботом'); });
}

/* ---------- значок на «Повторить» ---------- */
function badge() { const n = dueKeys().length, b = $('#due'); b.hidden = !n; b.textContent = n > 99 ? '99+' : n; }

/* ---------- события ---------- */
function bindTab(m) {
  $$('[data-ref]', m).forEach(b => b.onclick = () => { F.ref = b.dataset.ref; haptic(); render(); });
  const on = $('.stabs .on', m); // выбранная подвкладка — в поле зрения, если ряд не влез
  if (on) { const p = on.parentNode; p.scrollLeft = Math.max(0, on.offsetLeft - (p.clientWidth - on.offsetWidth) / 2); }
  $$('details.cat', m).forEach(d => d.addEventListener('toggle', () => { F.open[d.dataset.c] = d.open; }));
  const g = $('#go', m); if (g) g.onclick = startRep;
  const pa = $('#pAll', m); if (pa) pa.onclick = () => { F.pathAll = true; render(); };
  if (TAB === 'ref' && F.ref === 'my') myBind(m);
  if (TAB === 'learn' && JUST) { JUST = null; const c = $('.node.cur', m); if (c) setTimeout(() => c.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60); }
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-say],.w,[data-rule],[data-word],[data-my],[data-act],[data-lsn],[data-lock],[data-tabgo],[data-mdel]');
  if (!t) return;
  if (t.dataset.act) { t.dataset.act === 'search' ? searchOpen() : settings(); return; }
  if (t.dataset.say !== undefined) { say(t.dataset.say, !!t.dataset.slow); return; }
  if (t.classList.contains('w')) { wordPop(t); return; }
  if (t.dataset.lsn) { haptic(); lessonOpen(t.dataset.lsn); return; }
  if (t.dataset.lock) { haptic('bad'); toast('Сначала пройди текущий урок — этот откроется следом'); return; }
  if (t.dataset.tabgo) { tabGo(t.dataset.tabgo); return; }
  if (t.dataset.mdel) { myRemove(t.dataset.mdel); haptic(); refMyRefresh(); toast('Убрал из «Моих слов»'); return; }
  if (t.dataset.rule) { closeSheet(); ruleOpen(t.dataset.rule); return; }
  if (t.dataset.word) { wordCard(t.dataset.word); return; }
  if (t.dataset.my) myCard(t.dataset.my);
});
$$('#tabs button').forEach(b => b.onclick = () => {
  if (TAB === b.dataset.tab && !STACK.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  haptic(); tabGo(b.dataset.tab);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') back(); });

/* ---------- вид и Telegram ---------- */
function skin() {
  const k = SKIN_BG[S.opt.skin] ? S.opt.skin : 'kino';
  document.documentElement.dataset.skin = k;
  if (!TG) return;
  try { TG.setHeaderColor(SKIN_BG[k]); } catch (e) {}
  try { TG.setBackgroundColor && TG.setBackgroundColor(SKIN_BG[k]); } catch (e) {}
  try { TG.setBottomBarColor && TG.isVersionAtLeast('7.10') && TG.setBottomBarColor(SKIN_BG[k]); } catch (e) {}
}
// перенос со старого прогресса (и с другого устройства после слияния): урок пройден, если все задания правила / все слова пачки уже в повторении
function migrate() {
  if (!S.t0) S.t0 = now();
  RLESS.forEach(l => { const ks = l.r.quiz.map((_, i) => S.srs['q:' + l.r.id + ':' + i]); if (!S.ls[l.id] && ks.length && ks.every(e => e && e[0] >= 1)) S.ls[l.id] = Math.max(...ks.map(e => e[2] || 1)); });
  PACKS.forEach(p => { const ks = p.ws.map(w => S.srs['w:' + w.id]); if (!S.ls[p.id] && ks.every(Boolean)) S.ls[p.id] = Math.max(...ks.map(e => e[2] || 1)); });
  save(true);
}
if (TG) {
  TG.ready(); TG.expand();
  if (TG.BackButton) TG.BackButton.onClick(back);
  try { TG.disableVerticalSwipes && TG.disableVerticalSwipes(); } catch (e) {}
}
migrate();
skin();
render();
cloudRead();
remindSync(false);
window.MD = { S: () => S, grade, render, go, back, dueKeys, runQuiz, RBY, itemOf, QZ: () => QZ, LS: () => LS, path: buildPath, lessonOpen, myQuiz, PACKS, // для проверки (tests/app.js)
  konspekt: id => go({ r: () => rulePage(RBY[id]), bind: m => bindRule(m, RBY[id]) }), tab: tabGo };
})();
