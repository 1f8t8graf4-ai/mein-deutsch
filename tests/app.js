// «Мой немецкий»: полный прогон приложения в браузере.
// Запуск: python3 -m http.server 8090 (в корне репо), потом NODE_PATH=/opt/node-tools/node_modules node tests/app.js ph|pc|360
// ph — iPhone 390×844, 360 — узкий Android 360×740, pc — 1440×900. Скрины — в tests/shots/ (папка в .gitignore).
// Что проверяется: все задания всех правил (кубики и ввод текста), ошибки и повтор, все карточки слов,
// перевод у каждого слова во всех примерах, навигация и «назад» Телеграма, вёрстка без вылезания вбок, облако, напоминание.
const { chromium } = require('playwright');
const dev = process.argv[2] || 'ph';
const VP = { ph: { width: 390, height: 844 }, 360: { width: 360, height: 740 }, pc: { width: 1440, height: 900 } }[dev];
const mob = dev !== 'pc';
const D = require('path').join(__dirname, 'shots'); require('fs').mkdirSync(D, { recursive: true });
let fails = 0, passes = 0;
const ok = (n, c, d) => { if (!c) fails++; else passes++; if (!c || process.env.V) console.log(c ? 'PASS' : 'FAIL', n, d === undefined ? '' : JSON.stringify(d).slice(0, 400)); else console.log('PASS', n); };
const API = 'https://mein-deutsch-bot.1f8t8graf4.workers.dev';
// фейковый Telegram: ios, облако в памяти, BackButton и цвет шапки запоминаем
const fakeTG = cloud => `(()=>{window.__cloud=${JSON.stringify(cloud || {})};window.__bb=[];window.__hc=[];const noop=()=>{};
 window.Telegram={WebApp:{platform:'ios',version:'8.0',initData:'query_id=1&user=%7B%22id%22%3A1%7D&hash=x',initDataUnsafe:{user:{id:1,first_name:'Андрей'}},colorScheme:'light',themeParams:{bg_color:'#ffffff',button_color:'#2481cc'},
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
  else if(t.t==='build'){ if($('#typ')){ $('#typ').value=t.de.toLowerCase().replace(/[.,!?]/g,''); $('#chk').click(); }
    else { W(t.de).forEach(w=>[...document.querySelectorAll('#tiles .tile')].find(x=>x.textContent===w&&!x.classList.contains('used')).click()); $('#chk').click(); } }
  return t.t; };
 window.__ovf=()=>{ // что вылезает за край экрана по ширине
  const Wd=innerWidth, bad=[]; if(document.documentElement.scrollWidth>Wd) bad.push('scrollWidth '+document.documentElement.scrollWidth);
  document.querySelectorAll('body *').forEach(el=>{ if(el.closest('.stabs>*,.tbl>*')) return; const r=el.getBoundingClientRect(); if(!r.width||!r.height) return;
   const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.opacity==='0') return;
   if(r.right>Wd+1||r.left<-1) bad.push(el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]+' '+Math.round(r.left)+'..'+Math.round(r.right)); });
  document.querySelectorAll('.btn').forEach(b=>{ const r=b.getBoundingClientRect(); if(r.width&&(b.scrollWidth>b.clientWidth+1||r.height>60)) bad.push('кнопка не влезла: '+b.textContent.trim()); });
  return bad.slice(0,6); };
})();`;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: VP, hasTouch: mob, isMobile: mob });
  await ctx.route('https://telegram.org/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const remind = [];
  await ctx.route(API + '/**', r => { const j = JSON.parse(r.request().postData() || '{}'); remind.push(j); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, on: j.on, hh: j.hh, tz: j.tz }) }); });
  // в облаке — прогресс «с другого устройства»: одно задание выучено, одно своё слово
  const cloudS = JSON.stringify({ v: 1, srs: { 'q:bevor:0': [5, Date.now() + 9e9, Date.now()] }, my: [{ id: 'mcloud', w: 'Feierabend', ru: 'конец рабочего дня', t: Date.now() }], del: [], seen: {}, opt: { type: false, rem: true, hh: 10 }, sv: Date.now() - 1000 });
  await ctx.addInitScript(fakeTG({ md_n: '1', md_0: cloudS }));
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8090/'); await page.waitForTimeout(800);
  const ev = (f, a) => page.evaluate(f, a), wt = n => page.waitForTimeout(n || 60);
  const shot = n => page.screenshot({ path: `${D}/${dev}-${n}.png` });
  const click = async s => { await page.locator(s).first().scrollIntoViewIfNeeded(); await page.locator(s).first().click(); await wt(120); };
  const OVF = []; const ovf = async name => { const r = await ev(() => __ovf()); if (r.length) OVF.push([name, r]); };
  const bb = () => ev(() => window.__bb.slice(-1)[0]);
  const DATA = await ev(() => ({ rules: MD_DATA.rules.map(r => ({ id: r.id, lvl: r.lvl, n: r.quiz.length, b: r.quiz.filter(q => q.t === 'build').length })), words: MD_DATA.words.map(w => ({ id: w.id, cat: w.cat, art: w.art || '' })), qs: MD_DATA.qs.length }));
  const TOTAL = DATA.rules.reduce((a, r) => a + r.n, 0);

  /* 1. старт */
  let r = await ev(() => ({ rows: document.querySelectorAll('.rc').length, tab: document.querySelector('#tabs .on span').textContent, h1: document.querySelector('.hd h1').textContent,
    my: MD.S().my.length, srs: Object.keys(MD.S().srs).length, bg: getComputedStyle(document.documentElement).backgroundColor, font: getComputedStyle(document.querySelector('.hd h1')).fontFamily, hc: window.__hc }));
  ok('старт: 12 правил, «Правила», облако слилось', r.rows === DATA.rules.length && r.tab === 'Правила' && r.h1 === 'Правила' && r.my === 1 && r.srs === 1, r);
  ok('тёмный вид как в кино: фон #0b0b0d, заголовки Playfair, шапка Телеграма тёмная', r.bg === 'rgb(11, 11, 13)' && /Playfair/.test(r.font) && r.hc.includes('#0b0b0d') && r.hc.includes('bg:#0b0b0d'), r);
  ok('«назад» Телеграма на корне вкладки скрыта', (await bb()) === 0);
  await shot('01-rules'); await ovf('правила');

  /* 2. подвкладки уровней */
  const lvls = await ev(() => [...document.querySelectorAll('.stabs [data-lvl]')].map(b => [b.dataset.lvl, b.textContent]));
  for (const [l] of lvls) {
    await click(`.stabs [data-lvl="${l}"]`);
    r = await ev(() => ({ n: document.querySelectorAll('.rc').length, on: document.querySelector('.stabs .on').dataset.lvl, lv: [...document.querySelectorAll('.rc .lv')].map(x => x.textContent) }));
    const want = l ? DATA.rules.filter(x => x.lvl === l).length : DATA.rules.length;
    ok(`подвкладка «${l || 'Все'}»: ${want} правил`, r.n === want && r.on === l && (!l || r.lv.every(x => x === l)), r);
    await ovf('правила ' + (l || 'все'));
  }
  // правило из A2 → назад: тот же уровень и та же прокрутка
  await click('.stabs [data-lvl="A2"]'); await ev(() => window.scrollTo(0, 260)); await wt(80);
  const y0 = await ev(() => window.scrollY);
  await ev(() => document.querySelectorAll('.rc')[3].click()); await wt(100);
  ok('правило открылось, «назад» Телеграма видна, нижние вкладки спрятаны', await ev(() => document.body.classList.contains('sub') && !!document.querySelector('h1.pt') && getComputedStyle(document.querySelector('#tabs')).display === 'none') && (await bb()) === 1);
  await click('.pgh [data-back]');
  r = await ev(() => ({ on: document.querySelector('.stabs .on').dataset.lvl, y: window.scrollY }));
  ok('«‹» → обратно в A2 и на то же место', r.on === 'A2' && Math.abs(r.y - y0) < 24, { r, y0 }); // точка «новое» у открытого правила пропала — строка чуть короче
  await click('.stabs [data-lvl=""]'); await ev(() => window.scrollTo(0, 0));
  // низ списка не прячется под вкладками
  await ev(() => window.scrollTo(0, 1e6)); await wt(80);
  r = await ev(() => { const m = document.querySelector('main').lastElementChild.lastElementChild.getBoundingClientRect(), t = document.querySelector('#tabs').getBoundingClientRect(); return { last: Math.round(m.bottom), tabs: Math.round(t.top) }; });
  ok('последнее правило видно над вкладками', r.last <= r.tabs, r);
  await ev(() => window.scrollTo(0, 0));

  /* 3. страница правила */
  await click('.rc[data-rule="du-form"]');
  r = await ev(() => ({ ex: document.querySelectorAll('.ex').length, tbl: !!document.querySelector('.tbl table'), when: document.querySelectorAll('ul.when li').length, mis: document.querySelectorAll('.mis').length, q: document.querySelector('#rQuiz').textContent }));
  ok('правило du-form: примеры, схема, «когда что», ошибки, кнопка', r.ex === 8 && r.tbl && r.when > 2 && r.mis > 0 && /Проверить · 6/.test(r.q), r);
  r = await ev(() => { const b = document.querySelector('#rQuiz').getBoundingClientRect(); return b.bottom <= innerHeight && b.top > innerHeight / 2; }); ok('«Проверить» внизу, видна без прокрутки', r);
  await shot('02-rule'); await ovf('правило du-form');
  await ev(() => window.scrollTo(0, 1e6)); await wt(80);
  r = await ev(() => { const kids = [...document.querySelector('.pg').children].filter(x => !x.classList.contains('bar')), last = kids[kids.length - 1].getBoundingClientRect(), bar = document.querySelector('.bar .in').getBoundingClientRect(); return { last: Math.round(last.bottom), bar: Math.round(bar.top) }; });
  ok('конец страницы правила не прячется под кнопками', r.last <= r.bar, r);
  await shot('03-rule-end'); await ev(() => window.scrollTo(0, 0));
  await click('.ex .w:text-is("wohnst")');
  r = await ev(() => ({ open: document.querySelector('#ov').classList.contains('open'), t: document.querySelector('.sh').innerText }));
  ok('нажал «wohnst» — окошко: wohnen, «(ты) живёшь»', r.open && /wohnen/.test(r.t) && /живёшь/.test(r.t), r.t.slice(0, 120));
  ok('окошко открыто — «назад» Телеграма видна', (await bb()) === 1);
  await shot('04-word'); await ovf('окошко слова');
  await click('#addMy'); r = await ev(() => MD.S().my.map(x => x.w)); ok('«В мои слова» — добавлено', r.includes('wohnen'), r);
  await ev(() => window.__back()); await wt(300);
  r = await ev(() => ({ open: document.querySelector('#ov').classList.contains('open'), sub: document.body.classList.contains('sub') }));
  ok('«назад» Телеграма сначала закрывает окошко, страница остаётся', !r.open && r.sub, r);
  await click('.ex .w:text-is("Zeit")'); r = await ev(() => document.querySelector('.sh').innerText); ok('выражение в примере: «Zeit haben»', /Zeit haben/.test(r), r.slice(0, 160));
  await page.keyboard.press('Escape'); await wt(300);
  ok('Esc закрывает окошко', !(await ev(() => document.querySelector('#ov').classList.contains('open'))));
  await click('.ex [data-slow]'); r = await ev(() => window.__said.slice(-1)[0]); ok('🐢 — медленно, de-DE', r && r[1] < 0.8 && r[2] === 'de-DE', r);
  await click('.ex [data-say]:not([data-slow])'); r = await ev(() => window.__said.slice(-1)[0]); ok('🔊 — обычная скорость', r && r[1] > 0.9, r);
  await click('.pgh [data-back]');

  /* 4. все задания всех правил — верно с первого раза */
  const types = {}; let done = 0, said = 0, cyr = 0;
  for (const R of DATA.rules) {
    await ev(id => document.querySelector(`.rc[data-rule="${id}"]`).click(), R.id); await wt(60);
    await ev(() => document.querySelector('#rQuiz').click()); await wt(60);
    let guard = 0;
    while (guard++ < 40) {
      if (await ev(() => !!document.querySelector('.res'))) break;
      const s0 = await ev(() => window.__said.length);
      const t = await ev(() => __solve()); types[t] = (types[t] || 0) + 1;
      r = await ev(() => ({ fb: (document.querySelector('.fb') || {}).className || '', nx: !document.querySelector('#nxB').hidden, said: window.__said.slice(-1)[0] }));
      if (!/ok/.test(r.fb) || !r.nx) ok(`${R.id}: задание ${guard} (${t}) засчитано`, false, r);
      if (await ev(n => window.__said.length > n, s0)) { said++; if (/[а-яё]/i.test(r.said[0]) || /ничего/.test(r.said[0])) cyr++; }
      if (guard === 1 || t === 'build' || t === 'err') await ovf(`задание ${R.id} ${guard} ${t}`);
      if (R.id === 'du-form' && guard <= 4) await shot(`05-quiz-${guard}-${t}`);
      await ev(() => document.querySelector('#nx').click()); await wt(20); done++;
    }
    r = await ev(() => document.querySelector('.res .big') && document.querySelector('.res .big').textContent);
    if (r !== `${R.n} / ${R.n}`) ok(`${R.id}: итог ${R.n} / ${R.n}`, false, r);
    if (R.id === 'du-form') await shot('06-result');
    await ev(() => document.querySelector('.bar [data-back]').click()); await wt(40);
    await ev(() => document.querySelector('.pgh [data-back]').click()); await wt(40);
  }
  ok(`все ${TOTAL} заданий ${DATA.rules.length} правил решены верно, итог N / N у каждого`, done === TOTAL, { done, types });
  ok('после ответа фраза звучит по-немецки (без русского и «(ничего)»)', said >= ((types.pick || 0) + (types.build || 0)) * 0.8 && cyr === 0, { said, cyr, types });
  r = await ev(() => { const S = MD.S(), k = Object.keys(S.srs).filter(k => k.startsWith('q:')); return { n: k.length, low: k.filter(x => S.srs[x][0] < 1).length, today: k.filter(x => S.srs[x][1] <= Date.now()).length }; });
  ok(`в повторении все ${TOTAL} заданий, шаг ≥ 1, ни одно не на сегодня`, r.n === TOTAL && !r.low && !r.today, r);

  /* 5. ошибки: неверно → разбор, задание вернётся, повтор завтра */
  await ev(() => { const R = MD.RBY['du-form'], it = i => ({ key: 'q:du-form:' + i, task: R.quiz[i], rule: R }); MD.runQuiz([0, 1, 2, 3, 4, 5].map(it).filter(x => ['pick', 'build', 'err'].includes(x.task.t)), 'ош'); });
  const EK = await ev(() => MD.QZ().items.map(x => x.key)); const n0 = EK.length;
  for (let k = 0; k < n0; k++) {
    const t = await ev(() => { const Q = MD.QZ(), t = Q.items[Q.i].task, W = s => s.match(/[A-Za-zÄÖÜäöüß0-9']+(?:-[A-Za-zÄÖÜäöüß]+)*/g);
      if (t.t === 'pick') document.querySelector(`[data-o="${(t.a + 1) % t.o.length}"]`).click();
      if (t.t === 'err') { const ws = W(t.q), i = ws.findIndex(w => w !== t.bad); document.querySelector(`[data-e="${i}"]`).click(); }
      if (t.t === 'build') { const tl = [...document.querySelectorAll('#tiles .tile')].reverse(); for (let a = 0; a < 2; a++) { tl.forEach(x => x.click()); document.querySelector('#chk').click(); if (document.querySelector('.fb')) break; document.querySelectorAll('#slots .tile').forEach(() => document.querySelector('#slots .tile').click()); } }
      return t.t; });
    if (t === 'err') { await wt(60); r = await ev(() => ({ toast: (document.querySelector('.toast') || {}).textContent, fb: !!document.querySelector('.fb') })); ok('ошибка: не то слово — подсказка «ещё раз», задание не закончено', /Ещё раз/.test(r.toast || '') && !r.fb, r); await ev(() => __solve()); }
    r = await ev(() => ({ fb: document.querySelector('.fb').className, h: document.querySelector('.fb .h').textContent, rl: !!document.querySelector('.fb .rl'), n: MD.QZ().items.length }));
    ok(`ошибка в «${t}»: разбор показан, правило под ним, задание вернётся в конец`, (t === 'err' ? /второй/.test(r.h) : /bad/.test(r.fb)) && r.rl && r.n === n0 + k + 1, r);
    if (k === 0) { await shot('07-wrong'); await ovf('ошибка'); }
    await ev(() => document.querySelector('#nx').click()); await wt(30);
  }
  while (!(await ev(() => !!document.querySelector('.res')))) { await ev(() => __solve()); await ev(() => document.querySelector('#nx').click()); await wt(20); }
  r = await ev(ks => ({ big: document.querySelector('.res .big').textContent, srs: ks.map(k => MD.S().srs[k]).map(e => [e[0], Math.round((e[1] - Date.now()) / 36e5)]) }), EK);
  ok(`итог 0 / ${n0}, повтор ошибок — завтра (шаг 0)`, r.big === `0 / ${n0}` && n0 >= 3 && r.srs.every(e => e[0] === 0 && e[1] > 0 && e[1] <= 24), r);
  await ev(() => document.querySelector('.bar [data-back]').click()); await wt(40);

  /* 6. ввод текста вместо кубиков: все «собери фразу» всех правил */
  await click('[data-act="set"]'); await shot('08-settings'); await ovf('настройки');
  await click('[data-opt="type"]'); await page.keyboard.press('Escape'); await wt(300);
  ok('настройка «ввод текста» сохранена', await ev(() => MD.S().opt.type === true));
  await ev(() => MD.runQuiz(MD_DATA.rules.flatMap(R => R.quiz.map((q, i) => ({ key: 'q:' + R.id + ':' + i, task: q, rule: R }))).filter(x => x.task.t === 'build'), 'ввод'));
  const NB = await ev(() => MD.QZ().items.length);
  r = await ev(() => document.activeElement && document.activeElement.id); ok('поле ввода само в фокусе', r === 'typ' || (await (async () => { await wt(120); return ev(() => document.activeElement.id === 'typ'); })()), r);
  await shot('09-typed');
  let tOk = 0;
  for (let k = 0; k < NB; k++) {
    if (k === 0) { // опечатка в одну букву прощается
      await ev(() => { const t = MD.QZ().items[0].task; const v = t.de.toLowerCase().replace(/[.,!?]/g, ''); const i = v.search(/[a-z]{4}/) + 2; document.querySelector('#typ').value = v.slice(0, i) + (v[i] === 'x' ? 'y' : 'x') + v.slice(i + 1); document.querySelector('#chk').click(); });
    } else if (k === 1) { // ерунда: сначала «ещё раз», потом верно → «со второй попытки»
      await ev(() => { document.querySelector('#typ').value = 'quatsch quatsch'; document.querySelector('#chk').click(); });
      r = await ev(() => ({ fb: !!document.querySelector('.fb'), bad: document.querySelector('#typ').classList.contains('bad') }));
      ok('ввод: неверно — красная рамка, можно ещё раз', !r.fb && r.bad, r);
      await ev(() => __solve());
    } else await ev(() => __solve());
    r = await ev(() => document.querySelector('.fb .h').textContent);
    if (k === 0) ok('ввод: опечатка в одну букву засчитана', r === 'Верно!', r);
    if (k === 1) ok('ввод: со второй попытки — «Верно — со второй попытки»', /второй/.test(r), r);
    if (/Верно/.test(r)) tOk++;
    await ev(() => document.querySelector('#nx').click()); await wt(20);
  }
  ok(`ввод текста: все ${NB} фраз «собери» засчитаны`, tOk === NB, { tOk, NB });
  while (!(await ev(() => !!document.querySelector('.res')))) { await ev(() => __solve()); await ev(() => document.querySelector('#nx').click()); await wt(20); }
  await ev(() => document.querySelector('.bar [data-back]').click()); await wt(40);
  await click('[data-act="set"]'); await click('[data-opt="type"]'); await page.keyboard.press('Escape'); await wt(300);

  /* 7. слова: подвкладки, все карточки */
  await click('[data-tab="words"]');
  const cats = await ev(() => [...document.querySelectorAll('.stabs [data-cat]')].map(b => b.dataset.cat));
  let cards = 0; const badCards = [];
  for (const c of cats) {
    await click(`.stabs [data-cat="${c}"]`);
    r = await ev(() => ({ on: document.querySelector('.stabs .on').dataset.cat, rows: [...document.querySelectorAll('.wr[data-word]')].map(x => x.dataset.word), lead: document.querySelector('main .lead').textContent, onVis: (() => { const o = document.querySelector('.stabs .on').getBoundingClientRect(); return o.left >= 0 && o.right <= innerWidth; })() }));
    ok(`слова «${c}»: подвкладка выбрана и видна, есть пояснение`, r.on === c && r.lead.length > 10 && r.onVis, r);
    if (c !== 'my') ok(`слова «${c}»: все ${DATA.words.filter(w => w.cat === c).length} слов на месте`, r.rows.length === DATA.words.filter(w => w.cat === c).length, r.rows.length);
    await ovf('слова ' + c); if (c === 'live') await shot('10-words'); if (c === 'b2') await shot('11-words-b2');
    if (c === 'my') continue;
    const bad = await ev(ids => { const out = []; ids.forEach(id => { document.querySelector(`.wr[data-word="${id}"]`).click(); const sh = document.querySelector('.sh'), w = MD_DATA.words.find(x => x.id === id);
      const h = sh.querySelector('h3').textContent, ru = sh.querySelector('.ru').textContent, ex = sh.querySelectorAll('.ex .w').length, btn = sh.querySelector('#wRep');
      if (!h.includes(w.w) || !ru.trim() || !ex || !btn || (w.art && !sh.querySelector('h3 .art-' + w.art))) out.push(id); }); return out; }, r.rows);
    cards += r.rows.length; badCards.push(...bad);
    await page.keyboard.press('Escape'); await wt(280);
  }
  ok(`все ${DATA.words.length} карточек слов: слово, артикль цветом, перевод, пример, кнопка «В повторение»`, cards === DATA.words.length && !badCards.length, { cards, badCards });
  await click('.stabs [data-cat="base"]'); await click('.wr[data-word="firma"]');
  ok('карточка со списка слов — «назад» Телеграма видна', (await bb()) === 1);
  r = await ev(() => document.querySelector('.sh').innerText); ok('карточка Firma: die, мн. ч. Firmen', /die/.test(r) && /Firmen/.test(r), r.slice(0, 80));
  await shot('12-wordcard'); await ovf('карточка слова');
  await click('#wRep'); ok('«В повторение»', await ev(() => !!MD.S().srs['w:firma']));
  r = await ev(() => ({ row: (document.querySelector('.wr[data-word="firma"] .in-rep') || {}).textContent }));
  ok('у слова в списке — «повторить сегодня»', /повторить сегодня/.test(r.row || ''), r);
  await click('.stabs [data-cat="my"]');
  r = await ev(() => ({ n: document.querySelectorAll('.wr').length, tab: document.querySelector('.stabs .on small').textContent }));
  ok('«Мои»: 3 (wohnen, Feierabend, Firma), число на подвкладке', r.n === 3 && r.tab === '3', r);
  await click('.wr[data-my]'); r = await ev(() => !!document.querySelector('#myDel')); ok('своё слово открывается, можно убрать', r);
  await page.keyboard.press('Escape'); await wt(280);
  await click('.stabs [data-cat="live"]');
  r = await ev(() => ({ r: document.querySelectorAll('.st-r').length, s: document.querySelectorAll('.st-s').length })); ok('«Живой»: метка «разг.» не повторяется, «сленг» видно', r.r === 0 && r.s > 0, r);
  await click('.stabs [data-cat="b2"]'); r = await ev(() => document.querySelectorAll('.st-o').length); ok('«B2»: метка «офиц.» не повторяется на каждой строке', r === 0, r);
  await click('.stabs [data-cat="live"]');
  await click('.wr[data-word="haste"]'); r = await ev(() => document.querySelector('.sh').innerText); ok('сокращение: «как звучит»', /хасте/.test(r), r.slice(0, 80));
  await page.keyboard.press('Escape'); await wt(280);

  /* 8. задания по словам: der/die/das и «что значит» */
  await ev(() => MD.runQuiz(MD_DATA.words.map(w => MD.itemOf('w:' + w.id)).concat([MD.itemOf('m:mcloud')]).filter(Boolean), 'слова'));
  const NW = await ev(() => MD.QZ().items.length); const wt2 = {}; let artSay = 0;
  for (let k = 0; k < NW; k++) {
    const t = await ev(() => __solve()); wt2[t] = (wt2[t] || 0) + 1;
    if (t === 'art') { const s = await ev(() => window.__said.slice(-1)[0][0]); if (/^(der|die|das) /.test(s)) artSay++; if (wt2.art === 1) { await shot('13-art'); await ovf('der/die/das'); } }
    if (t === 'mean' && wt2.mean === 1) { await shot('14-mean'); await ovf('что значит'); }
    if (!(await ev(() => /ok/.test(document.querySelector('.fb').className)))) ok('слово ' + k + ' засчитано', false, t);
    await ev(() => document.querySelector('#nx').click()); await wt(15);
  }
  r = await ev(() => document.querySelector('.res .big').textContent);
  ok(`задания по ${NW} словам: der/die/das и «что значит», все верно`, r === `${NW} / ${NW}` && wt2.art > 3 && wt2.mean > 3, { r, wt2 });
  ok('der/die/das: после ответа звучит слово с артиклем', artSay === wt2.art, { artSay });
  await ev(() => document.querySelector('.bar [data-back]').click()); await wt(40);

  /* 9. «Повторить» */
  await click('[data-tab="rep"]');
  r = await ev(() => ({ due: document.querySelector('#due').hidden ? 0 : +document.querySelector('#due').textContent, n: MD.dueKeys().length, stats: [...document.querySelectorAll('.stats b')].map(x => +x.textContent) }));
  ok('«Повторить»: значок = числу заданий на сегодня, три цифры прогресса', r.due === Math.min(r.n, 99) && r.stats.length === 3, r);
  await shot('15-rep'); await ovf('повторить');
  await ev(() => { const S = MD.S(); Object.keys(S.srs).forEach(k => S.srs[k][1] -= 2 * 864e5); MD.render(); });
  r = await ev(() => ({ due: +document.querySelector('#due').textContent, big: +document.querySelector('.rep .big').textContent, n: MD.dueKeys().length, go: document.querySelector('#go').textContent }));
  ok('через 2 дня: на сегодня — все, кроме выученного', r.n > 50 && r.big === r.n && /Начать · 8/.test(r.go), r);
  const before = r.n;
  await click('#go');
  r = await ev(() => document.querySelector('.qn').textContent); ok('сессия — 8 заданий', /^1\/8$/.test(r), r);
  while (!(await ev(() => !!document.querySelector('.res')))) { await ev(() => __solve()); await ev(() => document.querySelector('#nx').click()); await wt(20); }
  r = await ev(() => document.querySelector('.res .big').textContent); ok('сессия пройдена 8 / 8', r === '8 / 8', r);
  await shot('16-rep-result');
  await ev(() => document.querySelector('.bar [data-back]').click()); await wt(60);
  r = await ev(() => ({ big: +document.querySelector('.rep .big').textContent, n: MD.dueKeys().length })); ok('на сегодня стало на 8 меньше', r.big === r.n && r.n === before - 8, { r, before });

  /* 10. «Мои вопросы» */
  await click('[data-tab="qs"]');
  r = await ev(() => ({ n: document.querySelectorAll('.qi').length, d: [...document.querySelectorAll('main h2')].map(x => x.textContent), links: document.querySelectorAll('.ql [data-rule]').length }));
  ok(`«Мои вопросы»: ${DATA.qs}, по датам (новые сверху), ссылки на правила`, r.n === DATA.qs && r.d[0] === '13 октября 2026' && r.links >= r.n, r);
  r = await ev(() => [...document.querySelectorAll('.ql button')].map(b => b.textContent).filter(t => !/\u00a0›$/.test(t))); ok('«›» приклеен к названию правила (не висит один на строке)', !r.length, r);
  await shot('17-qs'); await ovf('мои вопросы');
  await click('.ql [data-rule="bevor"]'); r = await ev(() => document.querySelector('h1.pt').textContent); ok('вопрос → правило bevor', /bevor/.test(r), r);
  await ev(() => window.__back()); await wt(100);
  ok('«назад» Телеграма → снова «Мои вопросы», кнопка «назад» спрятана', await ev(() => !!document.querySelector('.qi')) && (await bb()) === 0);

  /* 11. поиск */
  await click('[data-act="search"]'); await wt(150);
  r = await ev(() => ({ f: document.activeElement.id, tags: document.querySelectorAll('[data-tq]').length, bb: window.__bb.slice(-1)[0], tabs: getComputedStyle(document.querySelector('#tabs')).display }));
  ok('поиск: отдельная страница, поле в фокусе, темы-подсказки, «назад» видна', r.f === 'q' && r.tags > 3 && r.bb === 1 && r.tabs === 'none', r);
  await shot('18-search-empty'); await ovf('поиск пустой');
  await click('[data-tq="падежи"]'); r = await ev(() => ({ v: document.querySelector('#q').value, n: document.querySelectorAll('#sr .rc').length })); ok('тема «#падежи» → поиск по ней', r.v === 'падежи' && r.n >= 1, r);
  await page.fill('#q', 'bevor'); await wt(150);
  r = await ev(() => ({ h: [...document.querySelectorAll('#sr h2')].map(x => x.textContent), keep: document.activeElement.id }));
  ok('поиск «bevor»: словарик, правила, примеры; поле не теряет фокус', r.h.some(x => /Правила/.test(x)) && r.h.some(x => /Примеры/.test(x)) && r.keep === 'q', r);
  await shot('19-search'); await ovf('поиск bevor');
  await page.fill('#q', 'щедрый'); await wt(150); r = await ev(() => document.querySelector('#sr').innerText); ok('поиск по-русски «щедрый» → großzügig', /großzügig/.test(r));
  await page.fill('#q', 'gross'); await wt(150); r = await ev(() => document.querySelector('#sr').innerText); ok('поиск без ß «gross» → groß', /groß/.test(r));
  await page.fill('#q', 'ыыыыы'); await wt(150); r = await ev(() => document.querySelector('#sr').innerText); ok('ничего не нашлось — подсказка спросить в чате', /Спроси меня/.test(r), r);
  await page.fill('#q', 'Dativ'); await wt(150);
  await click('#sr .rc'); r = await ev(() => !!document.querySelector('h1.pt')); ok('из поиска → правило', r);
  await click('.pgh [data-back]'); r = await ev(() => ({ v: document.querySelector('#q').value, n: document.querySelectorAll('#sr .rc').length }));
  ok('назад из правила → тот же поиск', r.v === 'Dativ' && r.n >= 1, r);
  await click('#qx'); r = await ev(() => ({ v: document.querySelector('#q').value, hint: !!document.querySelector('[data-tq]') })); ok('✕ очищает поиск', r.v === '' && r.hint, r);
  await page.keyboard.press('Escape'); await wt(100);
  ok('Esc → обратно на вкладку, «назад» спрятана', await ev(() => !document.body.classList.contains('sub')) && (await bb()) === 0);

  /* 12. каждое слово во всех примерах нажимается и переводится */
  const miss = await ev(async () => {
    const out = [], sleep = n => new Promise(r => setTimeout(r, n));
    for (const R of MD_DATA.rules) {
      document.querySelector('[data-tab="rules"]').click();
      document.querySelector(`.rc[data-rule="${R.id}"]`).click();
      const ws = [...document.querySelectorAll('.pg .ex .w')];
      for (const w of ws) { w.click(); const ru = document.querySelector('.sh .ru').textContent; if (/пока нет/.test(ru)) out.push(R.id + ': ' + w.textContent); }
      document.querySelector('.pgh [data-back]').click(); await sleep(0);
    }
    for (const W of MD_DATA.words) {
      const tmp = document.createElement('button'); tmp.dataset.word = W.id; document.body.appendChild(tmp); tmp.click(); tmp.remove();
      const n = document.querySelectorAll('.sh .ex .w').length;
      for (let j = 0; j < n; j++) {
        const t2 = document.createElement('button'); t2.dataset.word = W.id; document.body.appendChild(t2); t2.click(); t2.remove();
        const w = document.querySelectorAll('.sh .ex .w')[j]; w.click(); if (/пока нет/.test(document.querySelector('.sh .ru').textContent)) out.push(W.id + ': ' + w.textContent);
      }
    }
    return out;
  });
  ok('каждое слово во всех примерах правил и карточек — с переводом', !miss.length, miss.slice(0, 10));
  await page.keyboard.press('Escape'); await wt(300);

  /* 13. вёрстка всех страниц правил */
  for (const R of DATA.rules) {
    await ev(id => { document.querySelector('[data-tab="rules"]').click(); document.querySelector(`.rc[data-rule="${id}"]`).click(); }, R.id); await wt(30);
    await ovf('правило ' + R.id);
    await ev(() => document.querySelector('.pgh [data-back]').click());
  }

  /* 14. вкладки: повторное нажатие — наверх; переключение сбрасывает подстраницы */
  await click('[data-tab="words"]'); await ev(() => window.scrollTo(0, 600)); await wt(50);
  await click('[data-tab="words"]'); await wt(500); r = await ev(() => window.scrollY); ok('повторное нажатие на вкладку — наверх', r < 5, r);
  await click('[data-tab="qs"]');

  /* 15. напоминание и сброс */
  ok('при запуске приложение сообщило боту время напоминания (подпись, час, пояс)', remind.length >= 1 && remind[0].init && remind[0].hh >= 6 && remind[0].tz, remind[0]);
  await click('[data-act="set"]');
  await page.selectOption('#hh', '9'); await wt(300);
  r = await ev(() => (document.querySelector('.toast') || {}).textContent); ok('сменил час → «Напомню в 09:00», бот получил hh=9', /09:00/.test(r || '') && remind.slice(-1)[0].hh === 9, { r, last: remind.slice(-1)[0] });
  await click('[data-opt="rem"]'); await wt(300); ok('выключил напоминание → бот получил on=false', remind.slice(-1)[0].on === false);
  await click('[data-opt="rem"]'); await wt(200);
  // облако записано
  await wt(1400);
  r = await ev(() => ({ n: +window.__cloud.md_n, ok: (() => { try { const s = JSON.parse([...Array(+window.__cloud.md_n)].map((_, i) => window.__cloud['md_' + i]).join('')); return s.my.some(x => x.w === 'wohnen') && Object.keys(s.srs).length > 60; } catch (e) { return false; } })() }));
  ok('облако: всё записано кусками и читается', r.n >= 1 && r.ok, r);
  await click('#rst'); r = await ev(() => document.querySelector('#rst').textContent); ok('сброс: первое нажатие спрашивает «Точно?»', /Точно/.test(r), r);
  await click('#rst'); await wt(300);
  r = await ev(() => ({ srs: Object.keys(MD.S().srs).length, my: MD.S().my.length, hh: MD.S().opt.hh })); ok('сброс: прогресс с нуля, настройки остались', r.srs === 0 && r.my === 0 && r.hh === 9, r);

  /* итог */
  ok('ничего не вылезает за край экрана (все экраны)', !OVF.length, OVF.slice(0, 6));
  ok('консоль без ошибок', !errs.length, errs.slice(0, 3));
  console.log(fails ? `ИТОГ ${dev}: FAIL ${fails}, PASS ${passes}` : `ИТОГ ${dev}: всё PASS (${passes})`); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
