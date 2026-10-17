/* «Мой немецкий» — мини-апп. Без сборщиков: один файл.
   Данные — window.MD_DATA из data/all-data.js (собирает tools/rebuild.py из data/*.json).
   Прогресс — localStorage (md_v1) + Telegram CloudStorage (кусками md_0…, md_n). */
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
const CAT = [['my', 'Мои'], ['live', 'Живой немецкий'], ['b2', 'К экзамену B2'], ['char', 'Характер'], ['base', 'Слова уроков']];
const CYR = /[а-яё]/i;

/* ---------- хранилище ---------- */
const KEY = 'md_v1';
const fresh = () => ({ v: 1, srs: {}, my: [], del: [], seen: {}, opt: { type: false, rem: true, hh: 10 }, sv: 0 });
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
  o.my = Object.values(my).filter(x => !o.del.includes(x.id));
  o.seen = Object.assign({}, b.seen, a.seen);
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
        if (b && b.v) { S = merge(S, b); save(true); render(); }
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
  if (p[0] === 'm') return S.my.some(x => x.id === p[1]);
  return false;
}
function whenTxt(k) {
  const e = S.srs[k]; if (!e) return '';
  if (learned(k)) return 'выучено';
  const d = Math.round((dayStart(e[1]) - dayStart(now())) / DAY);
  return d <= 0 ? 'повторить сегодня' : d === 1 ? 'повтор завтра' : `повтор через ${d} ${pl(d, ['день', 'дня', 'дней'])}`;
}
const pl = (n, f) => f[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2];

/* ---------- голос ---------- */
let VOICE = null;
function pickVoice() { const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || []; VOICE = vs.find(v => /^de(-|_)DE/i.test(v.lang)) || vs.find(v => /^de/i.test(v.lang)) || null; }
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, slow) {
  if (!window.speechSynthesis) return toast('Голос недоступен на этом устройстве');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/\([^)]*\)/g, ' ').replace(/[„“«»]/g, ''));
  u.lang = 'de-DE'; if (VOICE) u.voice = VOICE; u.rate = slow ? 0.62 : 0.95;
  speechSynthesis.speak(u);
}

/* ---------- примеры: каждое слово нажимается ---------- */
const EXS = [];
const TOKRE = /([A-Za-zÄÖÜäöüß0-9']+(?:-[A-Za-zÄÖÜäöüß]+)*)|([^A-Za-zÄÖÜäöüß0-9']+)/g;
function toks(s) { const out = []; let m; TOKRE.lastIndex = 0; while ((m = TOKRE.exec(s))) out.push(m[1] ? { w: m[1] } : { p: m[2] }); return out; }
const low = t => t.toLowerCase();
function deHTML(de, ru, o) { // предложение: слова — span.w
  o = o || {};
  const i = EXS.push({ de, ru, x: o.x || [], g: o.g || {} }) - 1;
  const xs = new Set(); (o.x || []).forEach(x => x[0].split(' ').forEach(t => xs.add(low(t))));
  return toks(de).map((t, j) => t.w ? `<span class="w${xs.has(low(t.w)) ? ' xw' : ''}" data-s="${i}" data-j="${j}">${esc(t.w)}</span>` : esc(t.p)).join('');
}
function exHTML(e) { // [de, ru, {x,g}]
  return `<div class="ex"><div class="tx"><div class="de">${deHTML(e[0], e[1], e[2])}</div>${e[1] ? `<div class="ru">${esc(e[1])}</div>` : ''}</div>
    <div class="say"><button data-say="${esc(e[0])}" aria-label="Послушать">🔊</button><button data-say="${esc(e[0])}" data-slow="1" aria-label="Медленно">🐢</button></div></div>`;
}
function lexOf(tok) {
  const t = low(tok), t2 = t.replace(/^'+|'+$/g, '');
  return D.lex[t] || D.lex[t2] || null;
}
function wordOf(base, tok) { // карточка из words.json, если есть
  const cands = [base, tok].filter(Boolean).map(low);
  return D.words.find(w => cands.includes(low(w.w)) || cands.includes(low(w.w.replace(/^sich /, '')))) || null;
}
function wordPop(el) {
  const ex = EXS[+el.dataset.s]; if (!ex) return;
  const tok = el.textContent, t = low(tok);
  const L = lexOf(tok), xp = ex.x.find(x => x[0].split(' ').map(low).includes(t));
  const base = L ? L[0] : tok, ru = ex.g[t] || (L ? L[1] : ''), note = L && L[2];
  const wd = wordOf(base, tok);
  const nn = /^(der|die|das) /.exec(base);
  $$('.w.on').forEach(x => x.classList.remove('on')); el.classList.add('on');
  sheet(`<h3>${esc(tok)} <button class="ic" data-say="${esc(tok)}" aria-label="Послушать">🔊</button></h3>
    ${base && low(base) !== t ? `<div class="base">начальная форма: ${nn ? `<b class="art-${nn[1]}">${esc(nn[1])}</b> ${esc(base.slice(4))}` : `<b>${esc(base)}</b>`}</div>` : ''}
    <div class="ru">${ru ? esc(ru) : '<span style="color:var(--hint)">перевода этого слова пока нет</span>'}</div>
    ${note ? `<div class="note">${esc(note)}</div>` : ''}
    ${xp ? `<div class="xp"><b>${esc(xp[1])}</b>${esc(xp[2])}</div>` : ''}
    <div class="note">В предложении: «${esc(ex.ru)}»</div>
    <div class="acts">${wd ? `<button class="btn sec" data-word="${wd.id}">Карточка слова</button>` : ''}
      <button class="btn" id="addMy">${myHas(xp ? xp[1] : base) ? '✓ В моих словах' : '＋ В мои слова'}</button></div>`,
    () => $$('.w.on').forEach(x => x.classList.remove('on')));
  const b = $('#addMy');
  b.onclick = () => {
    const w = xp ? xp[1] : base;
    if (myHas(w)) return toast('Уже в твоих словах');
    const id = 'm' + Date.now().toString(36);
    S.my.push({ id, w, ru: xp ? xp[2] : ru, ex: [ex.de, ex.ru], t: now() });
    S.srs['m:' + id] = [0, now(), now()];
    save(); b.textContent = '✓ В моих словах'; haptic('ok'); toast('Добавлено — придёт в «Повторить»'); badge();
  };
}
const myHas = w => S.my.some(x => low(x.w) === low(w));

/* ---------- шторка, тост, вибро ---------- */
let sheetClose = null;
function sheet(html, onClose) {
  const ov = $('#ov');
  ov.innerHTML = `<div class="dim"></div><div class="sh" role="dialog">${html}</div>`;
  requestAnimationFrame(() => ov.classList.add('open'));
  $('.dim', ov).onclick = closeSheet;
  sheetClose = onClose || null; backSync();
  return $('.sh', ov);
}
function closeSheet() {
  const ov = $('#ov'); if (!ov.classList.contains('open')) return false;
  ov.classList.remove('open'); if (sheetClose) sheetClose(); sheetClose = null;
  setTimeout(() => { if (!ov.classList.contains('open')) ov.innerHTML = ''; }, 260); backSync();
  return true;
}
function toast(t) { $$('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }
function haptic(k) { try { if (TG && TG.HapticFeedback) k === 'ok' || k === 'bad' ? TG.HapticFeedback.notificationOccurred(k === 'ok' ? 'success' : 'error') : TG.HapticFeedback.selectionChanged(); } catch (e) {} }

/* ---------- навигация ---------- */
let TAB = 'rules', STACK = [], F = { lvl: '', tag: '', cat: 'live', q: '' };
try { const t = sessionStorage.getItem('md_tab'); if (t) TAB = t; } catch (e) {}
function go(page) { STACK.push(page); render(); window.scrollTo(0, 0); }
function back() {
  if (closeSheet()) return;
  if (STACK.length) { STACK.pop(); render(); return; }
  if (F.q) { F.q = ''; $('#q').value = ''; render(); }
}
function backSync() {
  if (!TG || !TG.BackButton) return;
  STACK.length || $('#ov').classList.contains('open') || F.q ? TG.BackButton.show() : TG.BackButton.hide();
}
function render() {
  EXS.length = 0;
  const top = STACK[STACK.length - 1];
  document.body.classList.toggle('sub', !!top);
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === TAB));
  const m = $('#main');
  if (top) m.innerHTML = top.r();
  else if (F.q) m.innerHTML = searchHTML(F.q);
  else m.innerHTML = ({ rules: rulesHTML, words: wordsHTML, rep: repHTML, qs: qsHTML })[TAB]();
  if (top && top.bind) top.bind(m); else bindTab(m);
  badge(); backSync();
}

/* ---------- вкладка «Правила» ---------- */
function ruleDots(r) { const n = r.quiz.length, k = r.quiz.filter((_, i) => { const e = S.srs['q:' + r.id + ':' + i]; return e && e[0] >= 1; }).length;
  return `<span class="dots">${r.quiz.map((_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span>`; }
function ruleCard(r) {
  return `<button class="rc" data-rule="${r.id}"><b>${esc(r.title)}</b><p>${esc(r.short)}</p>
    <div class="mt"><span class="lvl">${r.lvl}</span>${ruleDots(r)}${S.seen[r.id] ? '' : '<span>новое</span>'}</div></button>`;
}
function rulesHTML() {
  const tags = [...new Set(D.rules.flatMap(r => r.tags).filter(t => !/^[ABC]\d$/.test(t)))];
  const L = D.rules.filter(r => (!F.lvl || r.lvl === F.lvl) && (!F.tag || r.tags.includes(F.tag)));
  return `<h1>Правила</h1><p class="lead">Твой учебник: каждая страница — из твоего вопроса.</p>
    <div class="chips">${['', 'A1', 'A2', 'B1', 'B2'].map(l => `<button class="chip${F.lvl === l ? ' on' : ''}" data-lvl="${l}">${l || 'Все уровни'}</button>`).join('')}</div>
    <div class="chips">${tags.map(t => `<button class="chip${F.tag === t ? ' on' : ''}" data-tg="${esc(t)}">#${esc(t)}</button>`).join('')}</div>
    <div class="list">${L.length ? L.map(ruleCard).join('') : '<div class="empty">Ничего не нашлось</div>'}</div>`;
}

/* ---------- страница правила ---------- */
function ruleOpen(id) {
  const r = RBY[id]; if (!r) return;
  S.seen[id] = S.seen[id] || now(); save();
  go({ r: () => rulePage(r), bind: m => bindRule(m, r) });
}
function rulePage(r) {
  const qs = D.qs.filter(q => q.r.includes(r.id));
  const inRep = r.quiz.some((_, i) => S.srs['q:' + r.id + ':' + i]);
  return `<div class="pg"><div class="pgh"><button class="ic" data-back aria-label="Назад">‹</button><span class="t">${esc(r.title)}</span><span class="lvl">${r.lvl}</span></div>
    <h1>${esc(r.title)}</h1>
    <div style="margin:0 2px 12px">${r.tags.filter(t => !/^[ABC]\d$/.test(t)).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
    <div class="short">${esc(r.short)}</div>
    ${r.table ? `<h2>Схема</h2><div class="tbl"><table><tr>${r.table.h.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${r.table.r.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>` : ''}
    ${r.when ? `<h2>Когда что</h2><ul class="when">${r.when.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
    <h2>Примеры · нажми на любое слово</h2><div class="list">${r.ex.map(exHTML).join('')}</div>
    ${r.mistakes && r.mistakes.length ? `<h2>Типичные ошибки</h2><div class="list">${r.mistakes.map(x => `<div class="mis"><div class="no">✗ ${esc(x[0])}</div><div class="yes">✓ ${esc(x[1])}</div><small>${esc(x[2])}</small></div>`).join('')}</div>` : ''}
    ${qs.length ? `<h2>Ты спрашивал</h2><div class="list">${qs.map(q => `<div class="qref"><small>${dateTxt(q.d)}</small>${esc(q.q)}</div>`).join('')}</div>` : ''}
    <div class="bar"><div class="in"><button class="btn" id="rQuiz">Проверить себя · ${r.quiz.length}</button>
      <button class="btn sec" id="rRep" style="width:auto;flex:0 0 auto">${inRep ? '✓ В повторении' : '＋ В повторение'}</button></div></div></div>`;
}
function bindRule(m, r) {
  $('[data-back]', m).onclick = back;
  $('#rQuiz', m).onclick = () => runQuiz(r.quiz.map((q, i) => ({ key: 'q:' + r.id + ':' + i, task: q, rule: r })), r.title);
  $('#rRep', m).onclick = () => {
    let n = 0; r.quiz.forEach((_, i) => { const k = 'q:' + r.id + ':' + i; if (!S.srs[k]) { S.srs[k] = [0, now(), now()]; n++; } });
    save(); render(); toast(n ? `Добавлено ${n} ${pl(n, ['задание', 'задания', 'заданий'])} в «Повторить»` : 'Уже в повторении');
  };
}

/* ---------- вкладка «Слова» ---------- */
function wRow(w, k) {
  const a = w.art ? `<span class="art-${w.art}">${w.art}</span> ` : '';
  return `<button class="wr" data-word="${w.id}"><span class="tx"><b>${a}${esc(w.w)}</b><small>${esc(w.ru)}</small></span>
    ${k && S.srs[k] ? `<span class="in-rep">${whenTxt(k)}</span>` : `<span class="st st-${w.st}">${w.st !== 'n' ? ST[w.st] : ''}</span>`}</button>`;
}
function myRow(x) {
  return `<button class="wr" data-my="${x.id}"><span class="tx"><b>${esc(x.w)}</b><small>${esc(x.ru || '')}</small></span><span class="in-rep">${whenTxt('m:' + x.id)}</span></button>`;
}
function wordsHTML() {
  let body = '';
  if (F.cat === 'my') {
    const ws = D.words.filter(w => S.srs['w:' + w.id]);
    body = ws.length || S.my.length
      ? `<div class="list">${S.my.slice().reverse().map(myRow).join('')}${ws.map(w => wRow(w, 'w:' + w.id)).join('')}</div>`
      : `<div class="empty">Пока пусто.<br>Нажми на любое слово в примере → «В мои слова»,<br>или открой карточку слова → «В повторение».</div>`;
  } else {
    const L = D.words.filter(w => w.cat === F.cat), subs = [...new Set(L.map(w => w.sub))];
    body = subs.map(s => `<h2>${esc(s)}</h2><div class="list">${L.filter(w => w.sub === s).map(w => wRow(w, 'w:' + w.id)).join('')}</div>`).join('');
  }
  return `<h1>Слова</h1><p class="lead">${F.cat === 'live' ? 'Как говорят немцы вживую: сокращения, частицы, сленг, фразы на каждый день.' : F.cat === 'b2' ? 'Готовые обороты и связки для telc B2: говорение и письмо.' : F.cat === 'my' ? 'Твои слова и всё, что ты отправил в повторение.' : 'Нажми на слово — откроется карточка.'}</p>
    <div class="chips">${CAT.map(c => `<button class="chip${F.cat === c[0] ? ' on' : ''}" data-cat="${c[0]}">${c[1]}${c[0] === 'my' && S.my.length ? ' · ' + S.my.length : ''}</button>`).join('')}</div>${body}`;
}
function wordCard(id) {
  const w = WBY[id]; if (!w) return;
  const k = 'w:' + id;
  sheet(`<h3>${w.art ? `<span class="art-${w.art}">${w.art}</span>` : ''}${esc(w.w)} <button class="ic" data-say="${esc((w.art ? w.art + ' ' : '') + w.w.replace(/[…]/g, ''))}" aria-label="Послушать">🔊</button></h3>
    <div class="ru">${esc(w.ru)}</div>
    <dl class="kv">${w.pl ? `<dt>Мн. ч.</dt><dd>${esc(w.pl)}</dd>` : ''}${w.forms ? `<dt>Формы</dt><dd>${esc(w.forms)}</dd>` : ''}${w.sep ? `<dt>Приставка</dt><dd>${esc(w.sep)} — отделяется</dd>` : ''}
      ${w.gov ? `<dt>Управление</dt><dd>${esc(w.gov)}</dd>` : ''}${w.snd ? `<dt>Как звучит</dt><dd>«${esc(w.snd)}»</dd>` : ''}${w.opp ? `<dt>Противоп.</dt><dd>${esc(w.opp)}</dd>` : ''}
      <dt>Стиль</dt><dd>${ST[w.st]}${w.tags.length ? ' · ' + w.tags.map(t => '#' + esc(t)).join(' ') : ''} · ${w.lvl}</dd></dl>
    ${w.note ? `<div class="note">${esc(w.note)}</div>` : ''}
    ${exHTML(w.ex)}
    <div class="acts"><button class="btn${S.srs[k] ? ' sec' : ''}" id="wRep">${S.srs[k] ? '✓ В повторении · ' + whenTxt(k) : '＋ В повторение'}</button></div>`);
  $('#wRep').onclick = () => {
    if (S.srs[k]) { delete S.srs[k]; toast('Убрано из повторения'); } else { S.srs[k] = [0, now(), now()]; toast('Придёт в «Повторить»'); haptic('ok'); }
    save(); closeSheet(); if (!STACK.length) render(); else badge();
  };
}
function myCard(id) {
  const x = S.my.find(y => y.id === id); if (!x) return;
  sheet(`<h3>${esc(x.w)} <button class="ic" data-say="${esc(x.w)}">🔊</button></h3><div class="ru">${esc(x.ru || '')}</div>
    <div class="note">${whenTxt('m:' + id)}</div>${x.ex ? exHTML(x.ex) : ''}
    <div class="acts"><button class="btn sec" id="myDel">Убрать из моих слов</button></div>`);
  $('#myDel').onclick = () => { S.my = S.my.filter(y => y.id !== id); S.del.push(id); delete S.srs['m:' + id]; save(); closeSheet(); render(); toast('Убрано'); };
}

/* ---------- вкладка «Повторить» ---------- */
function newKeys() { // ещё не начатые задания: сначала из открытых правил
  const out = [], rs = D.rules.slice().sort((a, b) => (S.seen[b.id] ? 1 : 0) - (S.seen[a.id] ? 1 : 0));
  rs.forEach(r => r.quiz.forEach((_, i) => { const k = 'q:' + r.id + ':' + i; if (!S.srs[k]) out.push(k); }));
  return out;
}
function repHTML() {
  const due = dueKeys(), all = Object.keys(S.srs).filter(keyOk), lrn = all.filter(learned).length;
  const nx = all.filter(k => !isDue(k)).map(k => S.srs[k][1]).sort((a, b) => a - b)[0];
  return `<h1>Повторить</h1><p class="lead">Интервалы: 1 → 3 → 7 → 21 → 60 дней. Ошибся — снова завтра.</p>
    <div class="card" style="text-align:center;padding:22px 16px">
      ${due.length ? `<div style="font-size:44px;font-weight:800;line-height:1">${due.length}</div><div style="color:var(--hint);margin:6px 0 16px">${pl(due.length, ['задание', 'задания', 'заданий'])} на сегодня</div>
        <button class="btn" id="go">Начать · ${Math.min(Math.max(due.length, 5), 8)}</button>`
      : `<div style="font-size:36px">✓</div><div style="margin:6px 0 4px;font-weight:600">${all.length ? 'На сегодня всё' : 'Повторять пока нечего'}</div>
        <div style="color:var(--hint);margin-bottom:16px">${nx ? 'Следующее — ' + whenTxt(all.find(k => S.srs[k][1] === nx)) : 'Открой правило → «Проверить себя» или «В повторение».'}</div>
        <button class="btn" id="go">Новые задания · 5</button>`}
    </div>
    <h2>Прогресс</h2><div class="card"><dl class="kv" style="margin:0"><dt>В повторении</dt><dd>${all.length}</dd><dt>Выучено</dt><dd>${lrn}</dd><dt>Моих слов</dt><dd>${S.my.length}</dd></dl></div>`;
}
function startRep() {
  const due = dueKeys();
  let ks = due.slice(0, 8);
  if (ks.length < 5) ks = ks.concat(newKeys().slice(0, 5 - ks.length));
  if (!ks.length) return toast('Нет заданий');
  runQuiz(ks.map(itemOf).filter(Boolean), 'Повторение');
}
function itemOf(k) {
  const p = k.split(':');
  if (p[0] === 'q') return { key: k, task: RBY[p[1]].quiz[+p[2]], rule: RBY[p[1]] };
  if (p[0] === 'w') return { key: k, task: wordTask(WBY[p[1]]) };
  if (p[0] === 'm') { const x = S.my.find(y => y.id === p[1]); return x ? { key: k, task: myTask(x) } : null; }
  return null;
}
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function optsFrom(right, pool) { const o = shuf([...new Set(pool.filter(x => x && x !== right))]).slice(0, 3); const all = shuf([right, ...o]); return { o: all, a: all.indexOf(right) }; }
function wordTask(w) {
  if (w.art && Math.random() < 0.5) return { t: 'art', w: w.w, a: w.art, pl: w.pl, ru: w.ru, ex: w.ex };
  const pool = D.words.filter(x => x.cat === w.cat && x.id !== w.id).map(x => x.ru);
  const r = optsFrom(w.ru, pool.length >= 3 ? pool : D.words.map(x => x.ru));
  return { t: 'mean', q: (w.art ? w.art + ' ' : '') + w.w, o: r.o, a: r.a, ex: w.ex, word: true };
}
function myTask(x) {
  const r = optsFrom(x.ru, [...S.my.map(y => y.ru), ...D.words.map(y => y.ru)]);
  return { t: 'mean', q: x.w, o: r.o, a: r.a, ex: x.ex, word: true };
}

/* ---------- вкладка «Мои вопросы» ---------- */
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const dateTxt = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${MON[+m - 1]} ${y}`; };
function qsHTML() {
  const L = D.qs.slice().reverse(), ds = [...new Set(L.map(q => q.d))];
  return `<h1>Мои вопросы</h1><p class="lead">Всё, что ты спрашивал. Нажми на правило — откроется страница.</p>
    ${ds.map(d => `<h2>${dateTxt(d)}</h2><div class="list">${L.filter(q => q.d === d).map(q => `<div class="card"><div>${esc(q.q)}</div>
      <div class="chips wrap">${q.r.map(id => `<button class="chip" data-rule="${id}">${esc(RBY[id].title)}</button>`).join('')}</div></div>`).join('')}</div>`).join('')}`;
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
  if (!rs.length && !ws.length && !exs.length && !my.length && !lx.length) return `<div class="empty">Ничего не нашлось по «${esc(q)}».<br>Спроси меня в чате — сделаю страницу.</div>`;
  return `${lx.length ? `<h2>Словарик</h2><div class="list">${lx.map(k => `<div class="wr"><span class="tx"><b>${esc(k)}</b><small>${esc(D.lex[k][0])} — ${esc(D.lex[k][1])}</small></span></div>`).join('')}</div>` : ''}
    ${rs.length ? `<h2>Правила · ${rs.length}</h2><div class="list">${rs.map(ruleCard).join('')}</div>` : ''}
    ${ws.length || my.length ? `<h2>Слова · ${ws.length + my.length}</h2><div class="list">${my.map(myRow).join('')}${ws.slice(0, 30).map(w => wRow(w, 'w:' + w.id)).join('')}</div>` : ''}
    ${exs.length ? `<h2>Примеры · ${exs.length}</h2><div class="list">${exs.slice(0, 30).map(([r, e]) => `${exHTML(e)}<button class="qref" data-rule="${r.id}" style="margin-top:-4px"><small>из правила</small>${esc(r.title)} ›</button>`).join('')}</div>` : ''}`;
}

/* ---------- задания ---------- */
let QZ = null;
function runQuiz(items, title) {
  if (!items.length) return;
  QZ = { items: items.slice(), title, i: 0, ok: 0, first: items.length, wrong: new Set(), redo: [] };
  go({ r: quizHTML, bind: bindQuiz, quiz: true });
}
const pickFull = t => { const o = t.o[t.a]; return t.q.replace('___', /^\(/.test(o) ? '' : o).replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1'); };
const WORDS = s => toks(s).filter(t => t.w).map(t => t.w);
function quizHTML() {
  const Q = QZ, n = Q.items.length;
  if (Q.i >= n) return `<div class="qz"><div class="qtop"><button class="ic" data-back aria-label="Закрыть">✕</button><div class="prog"><i style="width:100%"></i></div></div>
    <div class="res"><div class="big">${Q.ok} / ${Q.first}</div><p>верно с первого раза</p>
    <p>${Q.ok === Q.first ? 'Чисто! 🔥' : 'Ошибки вернутся завтра — так и запоминается.'}</p></div>
    <div class="bar"><div class="in"><button class="btn" data-back>Готово</button></div></div></div>`;
  const it = Q.items[Q.i], t = it.task;
  const head = `<div class="qtop"><button class="ic" data-back aria-label="Закрыть">✕</button><div class="prog"><i style="width:${Q.i / n * 100}%"></i></div><span style="color:var(--hint);font-size:14px">${Q.i + 1}/${n}</span></div>`;
  let body = '';
  if (t.t === 'pick') {
    const [a, b] = t.q.split('___');
    body = `<div class="qk">Выбери, что вставить</div><div class="qq">${esc(a)}<span class="gap" id="gap">&nbsp;</span>${esc(b)}</div>${t.ru ? `<div class="qhint">${esc(t.ru)}</div>` : ''}
      <div class="opts">${t.o.map((o, i) => `<button class="opt" data-o="${i}">${esc(o)}</button>`).join('')}</div>`;
  } else if (t.t === 'mean') {
    const de = !CYR.test(t.q);
    body = `<div class="qk">${de ? 'Что значит?' : 'Выбери'}</div><div class="qq" style="display:flex;align-items:center;gap:6px">${esc(t.q)}${de ? `<button class="ic" data-say="${esc(t.q)}">🔊</button>` : ''}</div>
      <div class="opts">${t.o.map((o, i) => `<button class="opt" data-o="${i}">${esc(o)}</button>`).join('')}</div>`;
  } else if (t.t === 'art') {
    body = `<div class="qk">der, die или das?</div><div class="qq" style="font-size:30px;font-weight:700">${esc(t.w)}</div><div class="qhint">${esc(t.ru)}</div>
      <div class="arts">${['der', 'die', 'das'].map(a => `<button class="opt art-${a}" data-art="${a}">${a}</button>`).join('')}</div>`;
  } else if (t.t === 'build') {
    if (S.opt.type) body = `<div class="qk">Напиши по-немецки</div><div class="qq">${esc(t.ru)}</div><input class="typ" id="typ" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Пиши здесь…">
      <div style="margin-top:12px"><button class="btn" id="chk">Проверить</button></div>`;
    else body = `<div class="qk">Собери фразу</div><div class="qq">${esc(t.ru)}</div><div class="slots" id="slots"></div>
      <div class="tiles" id="tiles">${shuf(WORDS(t.de).map((w, i) => ({ w, i }))).map(x => `<button class="tile" data-i="${x.i}">${esc(x.w)}</button>`).join('')}</div>
      <div style="margin-top:16px"><button class="btn" id="chk" disabled>Проверить</button></div>`;
  } else if (t.t === 'err') {
    body = `<div class="qk">Найди ошибку — нажми на неправильное слово</div>
      <div class="errs">${WORDS(t.q).map((w, i) => `<button class="tile" data-e="${i}">${esc(w)}</button>`).join('')}</div>`;
  }
  return `<div class="qz">${head}${body}<div id="fb"></div><div class="bar" id="nxB" hidden><div class="in"><button class="btn" id="nx">Дальше</button></div></div></div>`;
}
function bindQuiz(m) {
  $$('[data-back]', m).forEach(b => b.onclick = () => { QZ = null; back(); });
  const Q = QZ; if (!Q || Q.i >= Q.items.length) { if (Q) { save(); badge(); } return; }
  const it = Q.items[Q.i], t = it.task;
  let tries = 0, done = false;
  const finish = (ok, html) => {
    if (done) return; done = true;
    if (!Q.redo.includes(it)) { grade(it.key, ok && tries === 0); if (ok && tries === 0) Q.ok++; }
    if (!(ok && tries === 0) && !Q.redo.includes(it)) { Q.redo.push(it); Q.items.push(it); Q.wrong.add(it.key); }
    save(); haptic(ok ? 'ok' : 'bad');
    const rl = it.rule ? it.rule.short : '';
    $('#fb').innerHTML = `<div class="fb ${ok ? 'ok' : 'bad'}"><div class="h">${ok ? (tries ? 'Верно — со второй попытки' : 'Верно!') : 'Не совсем'}</div>${html || ''}${rl ? `<div class="rl">${esc(rl)}</div>` : ''}</div>`;
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
        finish(ok, `${t.w ? `<div>${esc(t.w)}</div>` : ''}${t.ex ? exLine(t.ex[0], t.ex[1]) : ''}`);
        if (t.word && !CYR.test(t.q)) say(t.q);
      }
    });
  } else if (t.t === 'art') {
    $$('[data-art]', m).forEach(b => b.onclick = () => {
      const ok = b.dataset.art === t.a; $$('[data-art]', m).forEach(x => x.disabled = true);
      b.classList.add(ok ? 'ok' : 'bad'); $(`[data-art="${t.a}"]`, m).classList.add('ok');
      finish(ok, `<div><b class="art-${t.a}">${t.a}</b> ${esc(t.w)}${t.pl ? ' · ' + esc(t.pl) : ''}</div>${t.ex ? exLine(t.ex[0], t.ex[1]) : ''}`);
      say(t.a + ' ' + t.w);
    });
  } else if (t.t === 'err') {
    const ws = WORDS(t.q);
    $$('[data-e]', m).forEach(b => b.onclick = () => {
      if (done) return;
      const ok = ws[+b.dataset.e] === t.bad;
      if (!ok && tries === 0) { tries++; b.classList.add('bad'); haptic('bad'); toast('Нет, тут всё верно. Ещё раз'); return; }
      $$('[data-e]', m).forEach(x => { if (ws[+x.dataset.e] === t.bad) x.classList.add('ok'); });
      finish(ok, `<div><s style="color:var(--bad)">${esc(t.bad)}</s> → <b style="color:var(--ok)">${esc(t.fix)}</b></div>${t.w ? `<div style="margin-top:4px">${esc(t.w)}</div>` : ''}`);
    });
  } else if (t.t === 'build') {
    const target = WORDS(t.de), right = () => exLine(t.de, t.ru);
    if (S.opt.type) {
      const inp = $('#typ', m); setTimeout(() => inp.focus(), 50);
      const chk = () => {
        const a = norm(inp.value).replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(), b = norm(target.join(' ')).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        const ok = a === b || lev(a, b) <= 1;
        if (!ok && tries === 0) { tries++; inp.style.borderColor = 'var(--bad)'; haptic('bad'); toast('Не совсем — попробуй ещё'); return; }
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
  sheet(`<h3 style="font-size:22px">Настройки</h3>
    <div class="sw-row"><div>Задания с вводом текста<small>Вместо кубиков — писать самому</small></div><button class="sw${S.opt.type ? ' on' : ''}" data-opt="type" aria-label="Ввод текста"></button></div>
    <div class="sw-row"><div>Напоминание в боте<small>${api ? 'Раз в день: «5 заданий на сегодня»' : 'Заработает, когда подключим бота'}</small></div><button class="sw${S.opt.rem ? ' on' : ''}" data-opt="rem" aria-label="Напоминание"></button></div>
    <div class="sw-row"><div>Во сколько</div><select id="hh">${[...Array(18)].map((_, i) => i + 6).map(h => `<option value="${h}"${S.opt.hh === h ? ' selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></div>
    <div class="sw-row" style="border:0"><div>Сбросить прогресс<small>Повторение и мои слова — с нуля</small></div><button class="chip" id="rst" style="background:var(--bad-bg);color:var(--bad)">Сбросить</button></div>
    <p class="note" style="text-align:center;margin-top:14px">Мой немецкий · версия ${esc(window.V || '')}</p>`);
  $$('[data-opt]').forEach(b => b.onclick = () => { const k = b.dataset.opt; S.opt[k] = !S.opt[k]; b.classList.toggle('on', S.opt[k]); save(); if (k === 'rem') remindSync(true); });
  $('#hh').onchange = e => { S.opt.hh = +e.target.value; save(); remindSync(true); };
  let armed = false;
  $('#rst').onclick = e => {
    if (!armed) { armed = true; e.target.textContent = 'Точно? Нажми ещё'; return; }
    const opt = S.opt; S = fresh(); S.opt = opt; save(); closeSheet(); render(); toast('Прогресс сброшен');
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
  $$('[data-lvl]', m).forEach(b => b.onclick = () => { F.lvl = b.dataset.lvl; render(); });
  $$('[data-tg]', m).forEach(b => b.onclick = () => { F.tag = F.tag === b.dataset.tg ? '' : b.dataset.tg; render(); });
  $$('[data-cat]', m).forEach(b => b.onclick = () => { F.cat = b.dataset.cat; render(); });
  const g = $('#go', m); if (g) g.onclick = startRep;
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-say],.w,[data-rule],[data-word],[data-my]');
  if (!t) return;
  if (t.dataset.say !== undefined) { say(t.dataset.say, !!t.dataset.slow); return; }
  if (t.classList.contains('w')) { wordPop(t); return; }
  if (t.dataset.rule) { closeSheet(); ruleOpen(t.dataset.rule); return; }
  if (t.dataset.word) { wordCard(t.dataset.word); return; }
  if (t.dataset.my) myCard(t.dataset.my);
});
$$('#tabs button').forEach(b => b.onclick = () => {
  TAB = b.dataset.tab; STACK = []; F.q = ''; $('#q').value = ''; $('#qx').hidden = true;
  try { sessionStorage.setItem('md_tab', TAB); } catch (e) {}
  haptic(); render(); window.scrollTo(0, 0);
});
$('#q').addEventListener('input', e => { F.q = e.target.value; $('#qx').hidden = !F.q; render(); });
$('#qx').onclick = () => { F.q = ''; $('#q').value = ''; $('#qx').hidden = true; render(); };
$('#set').onclick = settings;
document.addEventListener('keydown', e => { if (e.key === 'Escape') back(); });

/* ---------- тема и Telegram ---------- */
function theme() {
  const dark = TG ? TG.colorScheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const p = (TG && TG.themeParams) || {}, st = document.documentElement.style;
  if (p.secondary_bg_color) st.setProperty('--bg', p.secondary_bg_color);
  if (p.section_bg_color || p.bg_color) st.setProperty('--card', p.section_bg_color || p.bg_color);
  if (p.text_color) st.setProperty('--tx', p.text_color);
  if (p.hint_color) st.setProperty('--hint', p.hint_color);
  if (p.button_color) st.setProperty('--acc', p.button_color);
  if (p.button_text_color) st.setProperty('--acc-tx', p.button_text_color);
  try { if (TG) { TG.setHeaderColor(p.secondary_bg_color ? 'secondary_bg_color' : 'bg_color'); TG.setBackgroundColor && TG.setBackgroundColor(p.secondary_bg_color || p.bg_color || '#f1f2f6'); } } catch (e) {}
}
if (TG) {
  TG.ready(); TG.expand();
  TG.onEvent('themeChanged', theme);
  if (TG.BackButton) TG.BackButton.onClick(back);
  try { TG.disableVerticalSwipes && TG.disableVerticalSwipes(); } catch (e) {}
} else matchMedia('(prefers-color-scheme: dark)').addEventListener('change', theme);
theme();
render();
cloudRead();
remindSync(false);
window.MD = { S: () => S, grade, render, go, back, dueKeys, runQuiz, RBY }; // для проверки
})();
