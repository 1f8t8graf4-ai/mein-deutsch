// «Мой немецкий» 1.2: полный прогон приложения в браузере.
// Запуск: python3 -m http.server 8090 (в корне репо), потом
//   NODE_PATH=/opt/node-tools/node_modules node tests/app.js ph|360|pc [kino|book|duo]
// ph — iPhone 390×844, 360 — узкий Android 360×740, pc — 1440×900; второй аргумент — вид (по умолчанию kino).
// Скрины — в tests/shots/ (папка в .gitignore).
// Что проверяется: перенос прогресса 1.1, весь путь уроков по шагам (пункты и примеры по одному, ошибка — вторым нажатием,
// звук, задания, итог, следующий урок), новое правило из вопроса — следующим уроком, справочник (свёрнутые разделы, пачки слов,
// правила по шагам, конспект, вопросы), «Мои слова» как в кино (☆/★, ＋ Своё, теги, поиск, Учу/Выучено, пары + выбор из 4),
// все задания всех правил (кубики и ввод текста), ошибки и повтор, все карточки слов, перевод каждого слова в примерах,
// «назад» Телеграма, вид в настройках, вёрстка без вылезания вбок, облако, напоминание, сброс.
const { chromium } = require('playwright');
const dev = process.argv[2] || 'ph', SKIN = process.argv[3] || 'kino';
const VP = { ph: { width: 390, height: 844 }, 360: { width: 360, height: 740 }, pc: { width: 1440, height: 900 } }[dev];
const mob = dev !== 'pc';
const D = require('path').join(__dirname, 'shots'); require('fs').mkdirSync(D, { recursive: true });
let fails = 0, passes = 0;
const ok = (n, c, d) => { if (!c) fails++; else passes++; console.log(c ? 'PASS' : 'FAIL', n, !c && d !== undefined ? JSON.stringify(d).slice(0, 500) : ''); };
const API = 'https://mein-deutsch-bot.1f8t8graf4.workers.dev';
// фейковый Telegram: ios, облако в памяти, BackButton и цвет шапки запоминаем
const fakeTG = (cloud, local) => `(()=>{window.__cloud=${JSON.stringify(cloud || {})};window.__bb=[];window.__hc=[];const noop=()=>{};
 if(!sessionStorage.getItem('t-init')){sessionStorage.setItem('t-init','1');localStorage.setItem('md_v1',${JSON.stringify(local)});}
 window.Telegram={WebApp:{platform:'ios',version:'8.0',initData:'query_id=1&user=%7B%22id%22%3A1%7D&hash=x',initDataUnsafe:{user:{id:1,first_name:'Андрей'}},colorScheme:'light',themeParams:{bg_color:'#ffffff'},
  ready:noop,expand:noop,setHeaderColor(c){window.__hc.push(c)},setBackgroundColor(c){window.__hc.push('bg:'+c)},setBottomBarColor:noop,disableVerticalSwipes:noop,isVersionAtLeast:()=>true,onEvent:noop,
  BackButton:{show(){window.__bb.push(1)},hide(){window.__bb.push(0)},onClick(f){window.__back=f}},HapticFeedback:{notificationOccurred:noop,selectionChanged:noop,impactOccurred:noop},
  CloudStorage:{getItem(k,cb){setTimeout(()=>cb(null,window.__cloud[k]==null?'':window.__cloud[k]),10)},getItems(ks,cb){setTimeout(()=>{const r={};ks.forEach(k=>r[k]=window.__cloud[k]||'');cb(null,r)},10)},setItem(k,v,cb){window.__cloud[k]=v;cb&&cb(null,true)}}}};
 window.__said=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel:noop,speak(u){window.__said.push([u.text,u.rate,u.lang])},getVoices:()=>[{lang:'de-DE',name:'Anna'}],onvoiceschanged:null}});
 Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,writable:true,value:function(t){this.text=t}});
 // помощники проверки (в странице)
 const WRE=/[A-Za-zÄÖÜäöüß0-9']+(?:-[A-Za-zÄÖÜäöüß]+)*/g, W=s=>s.match(WRE)||[];
 window.__solve=()=>{ // ответить верно на текущее задание
  const Q=MD.QZ(), t=Q.items[Q.i].task, $=s=>document.querySelector(s);
  if(t.t==='pick'||t.t==='mean') $('[data-o="'+t.a+'"]').click();
  else if(t.t==='art') $('[data-art="'+t.a+'"]').click();
  else if(t.t==='err') $('[data-e="'+W(t.q).indexOf(t.bad)+'"]').click();
  else if(t.t==='pairs') t.set.forEach((_,i)=>{ $('[data-pl="'+i+'"]').click(); $('[data-pr="'+i+'"]').click(); });
  else if(t.t==='build'){ if($('#typ')){ $('#typ').value=t.de.toLowerCase().replace(/[.,!?]/g,''); $('#chk').click(); }
    else { W(t.de).forEach(w=>[...document.querySelectorAll('#tiles .tile')].find(x=>x.textContent===w&&!x.classList.contains('used')).click()); $('#chk').click(); } }
  return t.t+(t.rev?'-rev':''); };
 window.__ovf=()=>{ // что вылезает за край экрана по ширине; кнопки в одну строку (анимации въезда сначала доводим до конца)
  document.getAnimations().forEach(a=>{try{if(isFinite(a.effect.getComputedTiming().endTime))a.finish();}catch(e){}});
  const Wd=innerWidth, bad=[]; if(document.documentElement.scrollWidth>Wd) bad.push('scrollWidth '+document.documentElement.scrollWidth);
  document.querySelectorAll('body *').forEach(el=>{ if(el.closest('.stabs>*,.tbl>*,.confetti')) return; const r=el.getBoundingClientRect(); if(!r.width||!r.height) return;
   const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.opacity==='0') return;
   if(r.right>Wd+1||r.left<-1) bad.push(el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]+' '+Math.round(r.left)+'..'+Math.round(r.right)); });
  document.querySelectorAll('.btn').forEach(b=>{ const r=b.getBoundingClientRect(); if(r.width&&(b.scrollWidth>b.clientWidth+1||r.height>64)) bad.push('кнопка не влезла: '+b.textContent.trim()); });
  return bad.slice(0,6); };
 window.__lesson=()=>{ // пройти открытый урок: шаги (с проверками) → задания → итог
  const out={steps:[],bad:[],ovf:[],said:0,tasks:[],end:null}; const $=s=>document.querySelector(s); let g=0;
  while(MD.LS()&&!$('.qz')&&g++<90){
   const L=MD.LS(), s=L.st[L.i], key=s.k+':'+L.p; out.steps.push(key);
   if(s.k==='when'&&document.querySelectorAll('.stp ul.when li').length!==L.p+1) out.bad.push('when '+L.p);
   if(s.k==='ex'&&document.querySelectorAll('.stp .ex').length!==L.p+1) out.bad.push('ex '+L.p);
   if(s.k==='mis'&&document.querySelectorAll('.stp .right').length!==((L.p+1)>>1)) out.bad.push('mis '+L.p);
   if(s.k==='word'&&!$('.wbig')) out.bad.push('word');
   const last=L.i===L.st.length-1&&L.p>=s.n-1; if(last&&!/К заданиям/.test($('#lsNx').textContent)) out.bad.push('кнопка «К заданиям»');
   const o=__ovf(); if(o.length) out.ovf.push([key,o]);
   const n0=window.__said.length; $('#lsNx').click(); if(window.__said.length>n0) out.said++; }
  g=0; while($('.qz')&&!$('.lend')&&!$('.res')&&g++<60){ out.tasks.push(__solve()); const fb=$('.fb'); if(!fb||!/ok/.test(fb.className)) out.bad.push('задание '+out.tasks.length+' '+(fb&&fb.className));
   const o=__ovf(); if(o.length) out.ovf.push(['task',o]); $('#nx').click(); }
  const e=$('.lend'); out.end=e&&e.innerText; const o=__ovf(); if(o.length) out.ovf.push(['end',o]); return out; };
})();`;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: VP, hasTouch: mob, isMobile: mob });
  await ctx.route('https://telegram.org/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const remind = [];
  await ctx.route(API + '/**', r => { const j = JSON.parse(r.request().postData() || '{}'); remind.push(j); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, on: j.on, hh: j.hh, tz: j.tz }) }); });
  const T = Date.now();
  // на телефоне — прогресс версии 1.1: все задания du-form пройдены (поля ls/t0 ещё нет); в облаке — своё слово и выученное задание
  const local = JSON.stringify({ v: 1, srs: Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => ['q:du-form:' + i, [1, T + 864e5, T - 5000]])), my: [], del: [], seen: {}, opt: { type: false, rem: true, hh: 10, skin: SKIN }, sv: T - 2000 });
  const cloudS = JSON.stringify({ v: 1, srs: { 'q:bevor:0': [5, T + 9e9, T], 'm:mcloud': [0, T - 1000, T - 1000] }, my: [{ id: 'mcloud', w: 'Feierabend', ru: 'конец рабочего дня', t: T }], del: [], seen: {}, opt: { type: false, rem: true, hh: 10, skin: SKIN }, sv: T - 1000 });
  await ctx.addInitScript(fakeTG({ md_n: '1', md_0: cloudS }, local));
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8090/'); await page.waitForTimeout(800);
  const ev = (f, a) => page.evaluate(f, a), wt = n => page.waitForTimeout(n || 60);
  const tag = `${dev}-${SKIN}`, shot = n => page.screenshot({ path: `${D}/${tag}-${n}.png` });
  const click = async s => { await page.locator(s).first().scrollIntoViewIfNeeded(); await page.locator(s).first().click(); await wt(140); };
  const OVF = []; const ovf = async name => { const r = await ev(() => __ovf()); if (r.length) OVF.push([name, r]); };
  const bb = () => ev(() => window.__bb.slice(-1)[0]);
  const DATA = await ev(() => ({ rules: MD_DATA.rules.map(r => ({ id: r.id, n: r.quiz.length })), words: MD_DATA.words.length, qs: MD_DATA.qs.length, lessons: MD.path().length }));
  const TOTAL = DATA.rules.reduce((a, r) => a + r.n, 0);

  /* 1. старт, перенос 1.1, облако, вид */
  let r = await ev(() => ({ skin: document.documentElement.dataset.skin, hc: window.__hc, tab: document.querySelector('#tabs .on span').textContent, tabs: document.querySelectorAll('#tabs button').length,
    top: document.querySelector('.pth-top').textContent, ls: Object.keys(MD.S().ls), my: MD.S().my.map(x => x.w), done: document.querySelectorAll('.node.done').length,
    cur: document.querySelectorAll('.node.cur').length, lock: document.querySelectorAll('.node.lock').length, rest: (document.querySelector('.prest') || {}).textContent }));
  ok('старт: 3 вкладки, «Учить», вид из настроек, шапка Телеграма под вид', r.tabs === 3 && r.tab === 'Учить' && r.skin === SKIN && r.hc.length > 0, r);
  ok('перенос 1.1: урок du-form пройден (все задания были в повторении), облако слилось', r.ls.includes('r:du-form') && r.my.includes('Feierabend') && /Урок 2 из \d+/.test(r.top), r);
  ok('путь — только текущий шаг: 1 пройденный, 1 текущий крупно, 2 замка, «и ещё N уроков»', r.done === 1 && r.cur === 1 && r.lock === 2 && /ещё \d+/.test(r.rest || ''), r);
  ok('«назад» Телеграма на корне вкладки скрыта', (await bb()) === 0);
  await shot('01-path'); await ovf('путь');
  await click('.node.lock'); r = await ev(() => (document.querySelector('.toast') || {}).textContent); ok('тап по замку — подсказка, урок не открылся', /Сначала пройди/.test(r || '') && await ev(() => !MD.LS()), r);

  /* 2. новое правило из вопроса встаёт следующим уроком */
  r = await ev(() => { const d = new Date(), s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    MD_DATA.qs.push({ d: s, q: 'тест', r: ['bevor'] }); MD.render(); const c = document.querySelector('.node.cur'); const o = { t: c.querySelector('.nc b').textContent, k: c.querySelector('.nc small').textContent, q: c.classList.contains('k-q') }; MD_DATA.qs.pop(); MD.render(); return o; });
  ok('вопрос после первого запуска → его правило следующим уроком, «Из твоего вопроса»', /bevor/.test(r.t) && /Из твоего вопроса/.test(r.k) && r.q, r);

  /* 3. урок-правило по шагам вручную: ✕ посреди, конспект, звук */
  // путь: du-form пройден → текущий — первая пачка слов; откроем правило ist-sind из справочника позже. Сначала — пачка слов.
  r = await ev(() => document.querySelector('.node.cur .nc small').textContent); ok('текущий урок после du-form — слова (правило, слова, слова…)', /Слова/.test(r), r);
  await click('.node.cur [data-lsn]');
  r = await ev(() => ({ k: MD.LS().st[0].k, n: MD.LS().st.length, w: document.querySelector('.wbig').textContent, said: window.__said.slice(-1)[0], bb: window.__bb.slice(-1)[0], tabs: getComputedStyle(document.querySelector('#tabs')).display }));
  ok('урок-слова: карточка слова на весь экран, слово звучит само, вкладки спрятаны, «назад» видна', r.k === 'word' && r.n === 5 && r.said && r.w.includes(r.said[0].split(' ').pop()) && r.bb === 1 && r.tabs === 'none', r);
  await shot('02-word'); await ovf('карточка слова');
  await click('[data-star]'); r = await ev(() => ({ t: document.querySelector('[data-star]').textContent, my: MD.S().my.map(x => [x.w, x.src]) }));
  ok('☆ на карточке слова → «★ В моих словах», слово с источником', /★/.test(r.t) && r.my.some(x => /^w:/.test(x[1])), r);
  await click('#lsNx'); await click('#lsNx');
  ok('шаг 3 из 5', await ev(() => MD.LS().i === 2));
  await ev(() => window.__back()); await wt(150);
  r = await ev(() => ({ ls: !!MD.LS(), cur: document.querySelector('.node.cur .nc b').textContent, done: Object.keys(MD.S().ls).length }));
  ok('✕ / «назад» посреди урока → путь, урок не засчитан', !r.ls && r.done === 1, r);
  // пройти эту пачку целиком
  await click('.node.cur [data-lsn]');
  r = await ev(() => __lesson());
  ok('урок-слова: 5 карточек, задания (der/die/das, «что значит», «как по-немецки»), итог', r.steps.length === 5 && !r.bad.length && r.tasks.length >= 7 && r.tasks.some(t => /rev/.test(t)) && /Урок пройден/.test(r.end || ''), r);
  ok('урок-слова: на каждой карточке звучит слово', r.said >= 4, r.said);
  await shot('03-end'); await ovf('итог урока');
  r = await ev(() => { const S = MD.S(), p = MD.PACKS[0]; return { srs: p.ws.every(w => S.srs['w:' + w.id]), ls: !!S.ls[p.id] }; });
  ok('слова пачки ушли в повторение, урок отмечен', r.srs && r.ls, r);
  await click('#lsNext'); await wt(300);
  r = await ev(() => ({ top: document.querySelector('.pth-top').textContent, pop: !!document.querySelector('.node.cur.pop'), tab: document.querySelector('#tabs .on span').textContent }));
  ok('«Дальше по пути» → путь: «Урок 3», новая карточка выпрыгивает', /Урок 3 из/.test(r.top) && r.pop && r.tab === 'Учить', r);
  await shot('04-path2');

  /* 4. весь путь до конца */
  const kinds = {}, taskT = {}; let lessons = 0, badL = [], said = 0;
  for (let g = 0; g < 60; g++) {
    const has = await ev(() => !!document.querySelector('.node.cur [data-lsn]')); if (!has) break;
    const before = await ev(() => document.querySelector('.pth-top').textContent);
    await ev(() => document.querySelector('.node.cur [data-lsn]').click()); await wt(20);
    const shotNow = lessons === 0 || lessons === 1;
    if (shotNow) { await shot(`05-step-${lessons}`); }
    const rr = await ev(() => __lesson());
    rr.steps.forEach(s => kinds[s.split(':')[0]] = (kinds[s.split(':')[0]] || 0) + 1); rr.tasks.forEach(t => taskT[t] = (taskT[t] || 0) + 1); said += rr.said;
    if (rr.bad.length || !/Урок пройден/.test(rr.end || '')) badL.push([before, rr.bad, rr.end]);
    rr.ovf.forEach(o => OVF.push(['урок ' + before, o]));
    await ev(() => document.querySelector('#lsNext').click()); await wt(30); lessons++;
  }
  r = await ev(() => ({ fin: !!document.querySelector('.pfin'), top: document.querySelector('.pth-top').textContent, ls: Object.keys(MD.S().ls).length }));
  ok(`весь путь пройден по шагам: ${lessons} уроков, «Все уроки пройдены»`, !badL.length && r.fin && r.ls === DATA.lessons && /Все уроки/.test(r.top), { badL: badL.slice(0, 3), r });
  ok('шаги всех видов: суть, схема, когда что (по одному), примеры (по одному), ошибка (вторым нажатием), слова', ['sut', 'tbl', 'when', 'ex', 'mis', 'word'].every(k => kinds[k] > 0), kinds);
  ok('задания всех типов в уроках: выбери, собери, найди ошибку, что значит, der/die/das, как по-немецки', ['pick', 'build', 'err', 'mean', 'art', 'mean-rev'].every(k => taskT[k] > 0), taskT);
  ok('в уроках звучит немецкий (примеры, ошибки, слова)', said > lessons * 2, said);
  await shot('06-path-done'); await ovf('путь пройден');
  r = await ev(() => { const S = MD.S(), q = Object.keys(S.srs).filter(k => k.startsWith('q:')); return { q: q.length, w: Object.keys(S.srs).filter(k => k.startsWith('w:')).length }; });
  ok(`в повторении: задания правил (кроме du-form из 1.1 — там уже были) и все ${DATA.words} слов`, r.q === TOTAL && r.w === DATA.words, r);

  /* 5. справочник: правила по шагам, конспект, пачки слов, вопросы */
  await click('[data-tab="ref"]');
  r = await ev(() => [...document.querySelectorAll('.stabs [data-ref]')].map(b => b.textContent)); ok('справочник: «Мои слова · Правила · Слова · Вопросы»', r.length === 4 && /Мои слова/.test(r[0]), r);
  await click('[data-ref="rules"]');
  r = await ev(() => ({ n: document.querySelectorAll('.rr').length, ok: document.querySelectorAll('.rr .okm').length, h: [...document.querySelectorAll('.refb h2')].map(x => x.textContent) }));
  ok('правила списком по уровням, все с ✓', r.n === DATA.rules.length && r.ok === r.n && r.h.length >= 3, r);
  await shot('07-ref-rules'); await ovf('справочник правила');
  await click('.rr[data-lsn="r:du-form"]');
  r = await ev(() => ({ k: MD.LS().st.map(s => s.k), from: MD.LS().from }));
  ok('правило из справочника открывается по шагам', r.k[0] === 'sut' && r.from === 'ref', r);
  await click('#lsFull'); r = await ev(() => ({ h: document.querySelector('h1.pt').textContent, ex: document.querySelectorAll('.pg .ex').length, bar: !!document.querySelector('#rQuiz') }));
  ok('«Конспект» — правило целиком (справка)', /ты/.test(r.h) && r.ex >= 6 && r.bar, r);
  await shot('08-konspekt'); await ovf('конспект');
  await ev(() => window.scrollTo(0, 1e6)); await wt(60);
  r = await ev(() => { const kids = [...document.querySelector('.pg').children].filter(x => !x.classList.contains('bar')), last = kids[kids.length - 1].getBoundingClientRect(), bar = document.querySelector('.bar .in').getBoundingClientRect(); return { last: Math.round(last.bottom), bar: Math.round(bar.top) }; });
  ok('конец конспекта не под кнопкой', r.last <= r.bar, r);
  await ev(() => window.__back()); await wt(100);
  r = await ev(() => ({ ls: !!MD.LS(), k: MD.LS() && MD.LS().st[MD.LS().i].k })); ok('назад из конспекта → тот же шаг урока', r.ls && r.k === 'sut', r);
  r = await ev(() => __lesson()); ok('du-form из справочника пройден целиком (задания 1.1 правила тоже)', !r.bad.length && /Урок пройден/.test(r.end || '') && r.tasks.length === 6, r);
  r = await ev(() => document.querySelector('#lsNext').textContent); ok('из справочника итог — «Готово» (обратно в справочник)', r === 'Готово', r);
  await click('#lsNext'); ok('«Готово» → справочник', await ev(() => !!document.querySelector('.rr')));
  await click('[data-ref="words"]');
  r = await ev(() => ({ cats: document.querySelectorAll('details.cat').length, open: document.querySelectorAll('details.cat[open]').length }));
  ok('слова: 4 раздела, все свёрнуты', r.cats === 4 && r.open === 0, r);
  await click('details.cat[data-c="live"] summary');
  r = await ev(() => ({ packs: document.querySelectorAll('details.cat[data-c="live"] .pk').length, ok: document.querySelectorAll('details.cat[data-c="live"] .okm').length, want: MD.PACKS.filter(p => p.cat === 'live').length }));
  ok('раскрыл «Живой немецкий» — пачки по 5 с ✓', r.packs === r.want && r.ok === r.packs, r);
  await shot('09-ref-words'); await ovf('справочник слова');
  await click('details.cat[data-c="live"] .pk');
  r = await ev(() => ({ k: MD.LS().st[0].k, n: MD.LS().st.length })); ok('пачка → карточки по одной', r.k === 'word' && r.n >= 4, r);
  await ev(() => window.__back()); await wt(100);
  ok('назад → справочник, раздел остался раскрыт', await ev(() => !!document.querySelector('details.cat[data-c="live"][open]')));
  // все 132 карточки слов через пачки: слово, перевод, пример
  r = await ev(() => { const bad = []; let n = 0; for (const p of MD.PACKS) { MD.lessonOpen(p.id); for (let i = 0; i < p.ws.length; i++) { const L = MD.LS(); const w = p.ws[L.i];
      const t = document.querySelector('.stp').innerText; if (!t.includes(w.w) || !t.includes(w.ru) || !document.querySelector('.stp .ex')) bad.push(w.id); n++; if (L.i < p.ws.length - 1) document.querySelector('#lsNx').click(); } MD.back(); } return { n, bad }; });
  ok(`все ${DATA.words} слов — карточками в пачках: слово, перевод, пример`, r.n === DATA.words && !r.bad.length, r);
  await click('[data-ref="qs"]');
  r = await ev(() => ({ n: document.querySelectorAll('.qi').length, d: [...document.querySelectorAll('.refb h2')].map(x => x.textContent) }));
  ok(`вопросы: ${DATA.qs}, по датам, новые сверху`, r.n === DATA.qs && r.d[0] === '13 октября 2026', r);
  await ovf('справочник вопросы');
  await click('.ql [data-rule="bevor"]'); r = await ev(() => MD.LS() && MD.LS().l.id); ok('вопрос → урок по правилу', r === 'r:bevor', r);
  await ev(() => window.__back()); await wt(100);

  /* 6. «Мои слова» как в кино */
  await click('[data-ref="my"]');
  r = await ev(() => ({ what: document.querySelector('.dm-what').textContent, n: document.querySelectorAll('.dm').length, now: (document.querySelector('#dmNow') || document.querySelector('#dmTrain') || {}).textContent, seg: document.querySelector('.seg').textContent }));
  ok('«Мои слова»: объяснение, главная кнопка, «Учу / Выучено»', /сохранил сам/.test(r.what) && r.n === 2 && /Повторить сейчас|Проверить себя/.test(r.now || '') && /Учу/.test(r.seg) && /Выучено/.test(r.seg), r);
  await shot('10-my'); await ovf('мои слова');
  // ☆/★ в окошке слова (из конспекта)
  await ev(() => MD.konspekt('du-form')); await wt(100);
  await click('.ex .w:text-is("wohnst")');
  r = await ev(() => ({ t: document.querySelector('#addMy').textContent, s: document.querySelector('.sh').innerText }));
  ok('окошко слова: wohnen, «(ты) живёшь», «☆ В мои слова»', /wohnen/.test(r.s) && /живёшь/.test(r.s) && /☆/.test(r.t), r);
  await shot('11-wordpop'); await ovf('окошко слова');
  await click('#addMy'); r = await ev(() => ({ t: document.querySelector('#addMy').textContent, x: MD.S().my.find(x => x.w === 'wohnen') }));
  ok('☆ → ★, слово сохранено с источником (правило)', /★/.test(r.t) && r.x && r.x.src === 'r:du-form', r);
  await click('#addMy'); r = await ev(() => ({ t: document.querySelector('#addMy').textContent, has: MD.S().my.some(x => x.w === 'wohnen'), del: MD.S().del.length }));
  ok('★ ещё раз → убрано (и помечено удалённым для облака)', /☆/.test(r.t) && !r.has && r.del >= 1, r);
  await click('#addMy'); await page.keyboard.press('Escape'); await wt(300);
  await ev(() => window.__back()); await wt(150);
  r = await ev(() => ({ n: document.querySelectorAll('.dm').length, g: [...document.querySelectorAll('#dmL h2')].map(x => x.textContent) }));
  ok('в «Моих словах» 3 слова, сгруппированы по источнику', r.n === 3 && r.g.length >= 2, r);
  // ＋ Своё с тегом
  await click('#dmAddB');
  await page.fill('#dmAdd [name="w"]', 'die Kneipe'); await page.fill('#dmAdd [name="ru"]', 'пивная'); await page.fill('#dmAdd [name="tag"]', '#Город');
  await click('#dmAdd [type="submit"]');
  r = await ev(() => ({ x: MD.S().my.find(x => x.w === 'die Kneipe'), tags: [...document.querySelectorAll('[data-mytag]')].map(b => b.dataset.mytag) }));
  ok('＋ Своё: слово с переводом и #тегом, чип тега появился', r.x && r.x.own && r.x.tags[0] === 'город' && r.tags.includes('город') && r.tags.includes('добавлено мной'), r);
  await click('[data-mytag="город"]'); r = await ev(() => [...document.querySelectorAll('.dm b')].map(x => x.textContent)); ok('фильтр по тегу', r.length === 1 && r[0] === 'die Kneipe', r);
  await click('[data-mytag="город"]');
  await page.fill('#dmQ', 'feier'); await wt(100); r = await ev(() => ({ n: document.querySelectorAll('.dm').length, f: document.activeElement.id })); ok('поиск в моих словах, поле не теряет фокус', r.n === 1 && r.f === 'dmQ', r);
  await page.fill('#dmQ', ''); await wt(100);
  // статусы и «Выучено»
  await ev(() => { const S = MD.S(), x = S.my.find(x => x.w === 'Feierabend'); S.srs['m:' + x.id] = [3, Date.now() + 5 * 864e5, Date.now()]; MD.render(); });
  r = await ev(() => [...document.querySelectorAll('.dm-st')].map(x => x.textContent)); ok('статусы словами: «повторить сегодня»', r.includes('повторить сегодня'), r);
  await click('[data-myt="lrn"]'); r = await ev(() => ({ b: [...document.querySelectorAll('.dm b')].map(x => x.textContent), st: (document.querySelector('.dm-st') || {}).textContent, dots: document.querySelectorAll('.dm .dots i.on').length }));
  ok('«Выучено»: Feierabend, статус «выучено», 3 точки из 5', r.b.length === 1 && r.b[0] === 'Feierabend' && r.st === 'выучено' && r.dots === 3, r);
  await click('[data-myt="rep"]');
  // добавим ещё слов, чтобы были пары
  await ev(() => { ['der Kollege|коллега', 'die Rechnung|счёт', 'gemütlich|уютный'].forEach(s => { const [w, ru] = s.split('|'); const f = document.querySelector('#dmAdd'); f.hidden = false; f.w.value = w; f.ru.value = ru; f.tag.value = ''; f.requestSubmit(); }); });
  await wt(150);
  r = await ev(() => (document.querySelector('#dmNow') || {}).textContent); ok('«Повторить сейчас · N слов →»', /Повторить сейчас · \d+ слов/.test(r || ''), r);
  await click('#dmNow');
  r = await ev(() => ({ t: MD.QZ().items.map(i => i.task.t), k: document.querySelector('.qk').textContent }));
  ok('тренировка: сначала «Соедини пары», потом «Что значит?»', r.t[0] === 'pairs' && r.t.slice(1).every(t => t === 'mean') && /пары/.test(r.k), r);
  await shot('12-pairs'); await ovf('пары');
  // в парах сначала ошибка, потом верно
  await ev(() => { document.querySelector('[data-pl="0"]').click(); document.querySelector('[data-pr="1"]').click(); });
  r = await ev(() => document.querySelector('[data-pr="1"]').classList.contains('bad')); ok('пары: неверная пара подсвечивается красным', r);
  await ev(() => __solve()); r = await ev(() => document.querySelector('.fb .h').textContent); ok('пары собраны — «ошибок: 1»', /ошибок: 1/.test(r), r);
  await ev(() => document.querySelector('#nx').click()); await wt(30);
  await ev(() => __solve()); await wt(30);
  r = await ev(() => { const o = [...document.querySelectorAll('.opt')].map(b => b.textContent); return { n: o.length, uniq: new Set(o).size }; }); ok('«Что значит?» — 4 разных варианта', r.n === 4 && r.uniq === 4, r);
  await shot('13-mean');
  await ev(() => document.querySelector('#nx').click());
  while (!(await ev(() => !!document.querySelector('.res')))) { await ev(() => __solve()); await ev(() => document.querySelector('#nx').click()); await wt(20); }
  r = await ev(() => ({ big: document.querySelector('.res .big').textContent, again: !!document.querySelector('#qAgain'), srs: MD.S().my.filter(x => x.ru).map(x => (MD.S().srs['m:' + x.id] || [])[0]) }));
  ok('итог тренировки, «Ещё раз», расписание сдвинулось', /\d+ \/ \d+/.test(r.big) && r.again && r.srs.some(s => s >= 1), r);
  await click('#qAgain'); r = await ev(() => MD.QZ() && MD.QZ().items.length); ok('«Ещё раз» — новая тренировка', r > 0, r);
  await ev(() => window.__back()); await wt(150);
  ok('выход из тренировки → «Мои слова»', await ev(() => !!document.querySelector('.dm-what')));
  // ✕ убрать
  const before = await ev(() => MD.S().my.length);
  const delId = await ev(() => document.querySelector('.dm [data-mdel]').dataset.mdel);
  await click('.dm [data-mdel]'); r = await ev(id => ({ n: MD.S().my.length, row: !!document.querySelector(`.dm[data-id="${id}"]`), del: MD.S().del.includes(id) }), delId); ok('✕ убирает слово (и помечает удалённым для облака)', r.n === before - 1 && !r.row && r.del, r);

  /* 7. «Повторить» */
  await click('[data-tab="rep"]');
  r = await ev(() => ({ due: document.querySelector('#due').hidden ? 0 : +document.querySelector('#due').textContent, n: MD.dueKeys().length }));
  ok('«Повторить»: значок = числу заданий на сегодня', r.due === Math.min(r.n, 99), r);
  await ev(() => { const S = MD.S(); Object.keys(S.srs).forEach(k => S.srs[k][1] -= 2 * 864e5); MD.render(); });
  r = await ev(() => ({ big: +document.querySelector('.rep .big').textContent, n: MD.dueKeys().length, go: document.querySelector('#go').textContent }));
  ok('через 2 дня — много на сегодня, «Начать · 8»', r.n > 50 && r.big === r.n && /Начать · 8/.test(r.go), r);
  await shot('14-rep'); await ovf('повторить');
  const before8 = r.n;
  await click('#go'); while (!(await ev(() => !!document.querySelector('.res')))) { await ev(() => __solve()); await ev(() => document.querySelector('#nx').click()); await wt(20); }
  r = await ev(() => document.querySelector('.res .big').textContent); ok('сессия 8 / 8', r === '8 / 8', r);
  await click('.bar [data-back]'); r = await ev(() => MD.dueKeys().length); ok('на сегодня стало на 8 меньше', r === before8 - 8, { r, before8 });

  /* 8. все задания всех правил: кубиками уже в пути; теперь — вводом текста; ошибки */
  await click('[data-act="set"]'); await shot('15-settings'); await ovf('настройки');
  await click('[data-opt="type"]'); await page.keyboard.press('Escape'); await wt(300);
  await ev(() => MD.runQuiz(MD_DATA.rules.flatMap(R => R.quiz.map((q, i) => ({ key: 'q:' + R.id + ':' + i, task: q, rule: R }))).filter(x => x.task.t === 'build'), 'ввод'));
  const NB = await ev(() => MD.QZ().items.length); let tOk = 0;
  await wt(120); r = await ev(() => document.activeElement && document.activeElement.id); ok('ввод текста: поле само в фокусе', r === 'typ', r);
  for (let k = 0; k < NB; k++) {
    if (k === 0) await ev(() => { const t = MD.QZ().items[0].task; const v = t.de.toLowerCase().replace(/[.,!?]/g, ''); const i = v.search(/[a-z]{4}/) + 2; document.querySelector('#typ').value = v.slice(0, i) + (v[i] === 'x' ? 'y' : 'x') + v.slice(i + 1); document.querySelector('#chk').click(); });
    else if (k === 1) { await ev(() => { document.querySelector('#typ').value = 'quatsch quatsch'; document.querySelector('#chk').click(); }); r = await ev(() => document.querySelector('#typ').classList.contains('bad') && !document.querySelector('.fb')); ok('ввод: неверно — красная рамка, можно ещё раз', r); await ev(() => __solve()); }
    else await ev(() => __solve());
    r = await ev(() => document.querySelector('.fb .h').textContent);
    if (k === 0) ok('ввод: опечатка в одну букву засчитана', r === 'Верно!', r);
    if (k === 1) ok('ввод: со второй попытки', /второй/.test(r), r);
    if (/Верно/.test(r)) tOk++;
    await ev(() => document.querySelector('#nx').click()); await wt(15);
  }
  ok(`ввод текста: все ${NB} «собери фразу» засчитаны`, tOk === NB, { tOk, NB });
  while (!(await ev(() => !!document.querySelector('.res')))) { await ev(() => __solve()); await ev(() => document.querySelector('#nx').click()); await wt(15); }
  await click('.bar [data-back]');
  await click('[data-act="set"]'); await click('[data-opt="type"]'); await page.keyboard.press('Escape'); await wt(300);
  // ошибки: неверно → разбор, задание вернётся, повтор завтра
  await ev(() => { const R = MD.RBY['du-form'], it = i => ({ key: 'q:du-form:' + i, task: R.quiz[i], rule: R }); MD.runQuiz([0, 4, 5].map(it), 'ош'); });
  for (let k = 0; k < 3; k++) {
    const t = await ev(() => { const Q = MD.QZ(), t = Q.items[Q.i].task, W = s => s.match(/[A-Za-zÄÖÜäöüß0-9']+(?:-[A-Za-zÄÖÜäöüß]+)*/g);
      if (t.t === 'pick') document.querySelector(`[data-o="${(t.a + 1) % t.o.length}"]`).click();
      if (t.t === 'err') { const ws = W(t.q), i = ws.findIndex(w => w !== t.bad); document.querySelector(`[data-e="${i}"]`).click(); }
      if (t.t === 'build') { const tl = [...document.querySelectorAll('#tiles .tile')].reverse(); for (let a = 0; a < 2; a++) { tl.forEach(x => x.click()); document.querySelector('#chk').click(); if (document.querySelector('.fb')) break; document.querySelectorAll('#slots .tile').forEach(() => document.querySelector('#slots .tile').click()); } }
      return t.t; });
    if (t === 'err') { await wt(40); r = await ev(() => ({ toast: (document.querySelector('.toast') || {}).textContent, fb: !!document.querySelector('.fb') })); ok('ошибка: не то слово — «ещё раз»', /Ещё раз/.test(r.toast || '') && !r.fb, r); await ev(() => __solve()); }
    r = await ev(() => ({ fb: document.querySelector('.fb').className, h: document.querySelector('.fb .h').textContent, n: MD.QZ().items.length }));
    ok(`ошибка в «${t}»: разбор, задание вернётся в конец`, (t === 'err' ? /второй/.test(r.h) : /bad/.test(r.fb)) && r.n === 3 + k + 1, r);
    if (k === 0) { await shot('16-wrong'); await ovf('ошибка'); }
    await ev(() => document.querySelector('#nx').click()); await wt(30);
  }
  while (!(await ev(() => !!document.querySelector('.res')))) { await ev(() => __solve()); await ev(() => document.querySelector('#nx').click()); await wt(20); }
  r = await ev(() => ({ big: document.querySelector('.res .big').textContent, srs: [0, 4, 5].map(i => MD.S().srs['q:du-form:' + i]).map(e => [e[0], Math.round((e[1] - Date.now()) / 36e5)]) }));
  ok('итог 0 / 3, ошибки — завтра (шаг 0)', r.big === '0 / 3' && r.srs.every(e => e[0] === 0 && e[1] > 0 && e[1] <= 24), r);
  await click('.bar [data-back]');

  /* 9. поиск */
  await click('[data-act="search"]'); await wt(150);
  r = await ev(() => ({ f: document.activeElement.id, bb: window.__bb.slice(-1)[0] })); ok('поиск: своя страница, поле в фокусе, «назад» видна', r.f === 'q' && r.bb === 1, r);
  await page.fill('#q', 'bevor'); await wt(150); r = await ev(() => [...document.querySelectorAll('#sr h2')].map(x => x.textContent)); ok('поиск «bevor»: правила и примеры', r.some(x => /Правила/.test(x)) && r.some(x => /Примеры/.test(x)), r);
  await shot('17-search'); await ovf('поиск');
  await page.fill('#q', 'щедрый'); await wt(150); r = await ev(() => document.querySelector('#sr').innerText); ok('по-русски «щедрый» → großzügig', /großzügig/.test(r));
  await page.fill('#q', 'gross'); await wt(150); r = await ev(() => document.querySelector('#sr').innerText); ok('без ß «gross» → groß', /groß/.test(r));
  await page.fill('#q', 'Dativ'); await wt(150); await click('#sr .rc'); r = await ev(() => MD.LS() && MD.LS().l.id); ok('из поиска → урок по правилу', /^r:/.test(r || ''), r);
  await ev(() => window.__back()); await wt(100); r = await ev(() => document.querySelector('#q').value); ok('назад → тот же поиск', r === 'Dativ', r);
  await page.keyboard.press('Escape'); await wt(100); ok('Esc → вкладка, «назад» спрятана', await ev(() => !document.body.classList.contains('sub')) && (await bb()) === 0);

  /* 10. каждое слово во всех примерах нажимается и переводится */
  const miss = await ev(() => {
    const out = [];
    for (const R of MD_DATA.rules) { MD.konspekt(R.id); document.querySelectorAll('.pg .ex .w').forEach(w => { w.click(); if (/пока нет/.test(document.querySelector('.sh .ru').textContent)) out.push(R.id + ': ' + w.textContent); }); MD.back(); MD.back(); }
    for (const W of MD_DATA.words) { const n = (() => { const t = document.createElement('button'); t.dataset.word = W.id; document.body.appendChild(t); t.click(); t.remove(); return document.querySelectorAll('.sh .ex .w').length; })();
      for (let j = 0; j < n; j++) { const t = document.createElement('button'); t.dataset.word = W.id; document.body.appendChild(t); t.click(); t.remove(); const w = document.querySelectorAll('.sh .ex .w')[j]; w.click(); if (/пока нет/.test(document.querySelector('.sh .ru').textContent)) out.push(W.id + ': ' + w.textContent); } }
    return out; });
  ok('каждое слово во всех примерах правил и слов — с переводом', !miss.length, miss.slice(0, 10));
  await page.keyboard.press('Escape'); await wt(300);
  for (const R of DATA.rules) { await ev(id => MD.konspekt(id), R.id); await wt(20); await ovf('конспект ' + R.id); await ev(() => MD.back()); }

  /* 11. вид в настройках, напоминание, облако, сброс */
  await click('[data-tab="learn"]');
  await click('[data-act="set"]');
  const other = SKIN === 'book' ? 'duo' : 'book';
  await click(`[data-skin="${other}"]`);
  r = await ev(() => ({ s: document.documentElement.dataset.skin, o: MD.S().opt.skin, hc: window.__hc.slice(-3) })); ok('вид переключается сразу и красит шапку Телеграма', r.s === other && r.o === other && r.hc.some(c => /F4EEE1|FFFFFF/i.test(c)), r);
  await click(`[data-skin="${SKIN}"]`);
  ok('при запуске приложение сообщило боту время напоминания', remind.length >= 1 && remind[0].init && remind[0].hh >= 6 && remind[0].tz, remind[0]);
  await page.selectOption('#hh', '9'); await wt(300);
  r = await ev(() => (document.querySelector('.toast') || {}).textContent); ok('сменил час → «Напомню в 09:00»', /09:00/.test(r || '') && remind.slice(-1)[0].hh === 9, r);
  await wt(1400);
  r = await ev(() => { try { const s = JSON.parse([...Array(+window.__cloud.md_n)].map((_, i) => window.__cloud['md_' + i]).join('')); return { ls: Object.keys(s.ls).length, t0: !!s.t0, my: s.my.length, skin: s.opt.skin }; } catch (e) { return { e: e.message }; } });
  ok('облако: уроки, «Мои слова», вид — записаны', r.ls === DATA.lessons && r.t0 && r.my >= 4 && r.skin === SKIN, r);
  await click('#rst'); await click('#rst'); await wt(300);
  r = await ev(() => ({ srs: Object.keys(MD.S().srs).length, my: MD.S().my.length, ls: Object.keys(MD.S().ls).length, top: document.querySelector('.pth-top').textContent, skin: MD.S().opt.skin }));
  ok('сброс: с нуля («Урок 1»), настройки и вид остались', r.srs === 0 && r.my === 0 && r.ls === 0 && /Урок 1 из/.test(r.top) && r.skin === SKIN, r);
  await page.keyboard.press('Escape'); await wt(300);
  await ev(() => window.scrollTo(0, 1e6)); await wt(60);
  r = await ev(() => { const n = [...document.querySelectorAll('.path > *')].pop().getBoundingClientRect(), t = document.querySelector('#tabs').getBoundingClientRect(); return { n: Math.round(n.bottom), t: Math.round(t.top) }; });
  ok('низ пути не под вкладками', r.n <= r.t, r);
  await shot('18-path-new');

  ok('ничего не вылезает за край экрана (все экраны)', !OVF.length, OVF.slice(0, 6));
  ok('консоль без ошибок', !errs.length, errs.slice(0, 3));
  console.log(fails ? `ИТОГ ${tag}: FAIL ${fails}, PASS ${passes}` : `ИТОГ ${tag}: всё PASS (${passes})`); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
