// «Мой немецкий»: прогон всех экранов приложения в браузере.
// Запуск: python3 -m http.server 8090 (в корне репо), потом NODE_PATH=/opt/node-tools/node_modules node tests/app.js ph|pc [dark]
// Скрины — в tests/shots/ (папка в .gitignore).
const { chromium } = require('playwright');
const dev = process.argv[2] || 'ph', dark = process.argv[3] === 'dark';
const D = require('path').join(__dirname, 'shots'); require('fs').mkdirSync(D, { recursive: true });
let fails = 0; const ok = (n, c, d) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, d === undefined ? '' : JSON.stringify(d)); };
// фейковый Telegram: платформа ios, облако в памяти, BackButton считаем
const fakeTG = cloud => `(()=>{window.__cloud=${JSON.stringify(cloud || {})};window.__bb=[];const noop=()=>{};const ev={};
 window.Telegram={WebApp:{platform:'ios',version:'8.0',initData:'',initDataUnsafe:{user:{id:1,first_name:'Андрей'}},colorScheme:'${dark ? 'dark' : 'light'}',themeParams:{},
  ready:noop,expand:noop,setHeaderColor:noop,setBackgroundColor:noop,disableVerticalSwipes:noop,isVersionAtLeast:()=>true,onEvent(e,f){(ev[e]=ev[e]||[]).push(f)},
  BackButton:{show(){window.__bb.push(1)},hide(){window.__bb.push(0)},onClick(f){window.__back=f}},HapticFeedback:{notificationOccurred:noop,selectionChanged:noop,impactOccurred:noop},
  CloudStorage:{getItem(k,cb){setTimeout(()=>cb(null,window.__cloud[k]==null?'':window.__cloud[k]),10)},getItems(ks,cb){setTimeout(()=>{const r={};ks.forEach(k=>r[k]=window.__cloud[k]||'');cb(null,r)},10)},setItem(k,v,cb){window.__cloud[k]=v;cb&&cb(null,true)}}}};
 window.__said=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel:noop,speak(u){window.__said.push([u.text,u.rate,u.lang])},getVoices:()=>[{lang:'de-DE',name:'Anna'}],onvoiceschanged:null}});
 Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,writable:true,value:function(t){this.text=t}});})();`;
(async () => {
  const b = await chromium.launch();
  const vp = dev === 'ph' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const ctx = await b.newContext({ viewport: vp, hasTouch: dev === 'ph', isMobile: dev === 'ph', colorScheme: dark ? 'dark' : 'light' });
  await ctx.route('https://telegram.org/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  // в облаке — прогресс «с другого устройства»: одно задание выучено, одно своё слово
  const cloudS = JSON.stringify({ v: 1, srs: { 'q:bevor:0': [5, Date.now() + 9e9, Date.now()] }, my: [{ id: 'mcloud', w: 'Feierabend', ru: 'конец рабочего дня', t: Date.now() }], del: [], seen: {}, opt: { type: false, rem: true, hh: 9 }, sv: Date.now() - 1000 });
  await ctx.addInitScript(fakeTG({ md_n: '1', md_0: cloudS }));
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8090/'); await page.waitForTimeout(700);
  const ev = (f, a) => page.evaluate(f, a), shot = n => page.screenshot({ path: `${D}/${dev}${dark ? '-dark' : ''}-${n}.png` });
  const click = async s => { await page.locator(s).first().scrollIntoViewIfNeeded(); await page.locator(s).first().click(); await page.waitForTimeout(250); };

  let r = await ev(() => ({ cards: document.querySelectorAll('.rc').length, tab: document.querySelector('#tabs .on span').textContent, my: MD.S().my.length, srs: Object.keys(MD.S().srs).length, theme: document.documentElement.dataset.theme }));
  ok('старт: 12 правил, вкладка «Правила», облако слилось (своё слово и выученное задание)', r.cards === 12 && r.tab === 'Правила' && r.my === 1 && r.srs === 1 && r.theme === (dark ? 'dark' : 'light'), r);
  await shot('1-rules');
  await click('[data-lvl="B1"]'); r = await ev(() => document.querySelectorAll('.rc').length); ok('фильтр B1', r === 1, r);
  await click('[data-lvl=""]'); await click('[data-tg="падежи"]'); r = await ev(() => document.querySelectorAll('.rc').length); ok('фильтр #падежи', r === 2, r);
  await click('[data-tg="падежи"]');

  // страница правила
  await click('.rc[data-rule="du-form"]');
  r = await ev(() => ({ sub: document.body.classList.contains('sub'), ex: document.querySelectorAll('.ex').length, tbl: !!document.querySelector('.tbl'), bar: !!document.querySelector('#rQuiz'), bb: window.__bb.slice(-1)[0] }));
  ok('правило: примеры, таблица, кнопка «Проверить себя», «назад» Телеграма показана', r.sub && r.ex === 8 && r.tbl && r.bar && r.bb === 1, r);
  r = await ev(() => { const b = document.querySelector('#rQuiz').getBoundingClientRect(); return b.bottom <= innerHeight && b.top > 0; }); ok('главная кнопка видна без прокрутки', r);
  await shot('2-rule');
  await click('.ex .w:text-is("wohnst")');
  r = await ev(() => ({ open: document.querySelector('#ov').classList.contains('open'), t: document.querySelector('.sh').innerText }));
  ok('нажал «wohnst» — окошко: wohnen, «(ты) живёшь»', r.open && /wohnen/.test(r.t) && /живёшь/.test(r.t), r.t.slice(0, 120));
  await shot('3-word');
  await click('#addMy'); r = await ev(() => MD.S().my.map(x => x.w)); ok('«В мои слова» — добавлено', r.includes('wohnen'), r);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await click('.ex .w:text-is("Zeit")'); r = await ev(() => document.querySelector('.sh').innerText); ok('выражение в примере: «Zeit haben»', /Zeit haben/.test(r), r.slice(0, 160));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await click('.ex [data-slow]'); r = await ev(() => window.__said.slice(-1)[0]); ok('🐢 — медленно, de-DE', r && r[1] < 0.8 && r[2] === 'de-DE', r);

  // проверить себя — все верно
  await click('#rQuiz');
  for (let k = 0; k < 6; k++) {
    const t = await ev(() => { const Q = document.querySelector('.qz'); return Q && (document.querySelector('[data-o]') ? 'o' : document.querySelector('#tiles') ? 'b' : document.querySelector('[data-e]') ? 'e' : '?'); });
    const it = await ev(() => { const n = document.querySelector('.qtop span').textContent; return n; });
    if (t === 'o') { const a = await ev(() => { const r = MD.RBY['du-form']; return null; }); void a;
      await ev(() => { const txt = document.querySelector('.qk').textContent; return txt; });
      // правильный ответ берём из данных по тексту вопроса
      await ev(() => { const q = document.querySelector('.qq').textContent.replace(/\s/g, ''); const T = MD.RBY['du-form'].quiz.find(x => x.q && x.q.replace('___', '').replace(/\s/g, '') === q.replace(/ /g, '')); document.querySelectorAll('[data-o]')[T.a].click(); });
    } else if (t === 'b') {
      await ev(() => { const de = MD.RBY['du-form'].quiz.find(x => x.t === 'build').de.match(/[A-Za-zÄÖÜäöüß']+/g); const used = new Set(); de.forEach(w => { const b = [...document.querySelectorAll('#tiles .tile')].find(x => x.textContent === w && !used.has(x)); used.add(b); b.click(); }); document.querySelector('#chk').click(); });
    } else if (t === 'e') { await ev(() => [...document.querySelectorAll('[data-e]')].find(x => x.textContent === 'heißest').click()); }
    await page.waitForTimeout(200);
    if (k === 0) await shot('4-quiz-answer');
    const fb = await ev(() => document.querySelector('.fb') && document.querySelector('.fb').className);
    if (!/ok/.test(fb || '')) ok('ответ ' + it + ' засчитан', false, fb);
    await click('#nx');
  }
  r = await ev(() => document.querySelector('.res') && document.querySelector('.res .big').textContent); ok('итог 6 / 6', r === '6 / 6', r);
  await shot('5-result');
  await click('.bar [data-back]');
  r = await ev(() => { const S = MD.S(); const k = Object.keys(S.srs).filter(k => k.startsWith('q:du-form')); return { n: k.length, step: k.map(x => S.srs[x][0]), dueTomorrow: k.every(x => S.srs[x][1] > Date.now()) }; });
  ok('6 заданий в повторении, шаг 1, следующее — завтра', r.n === 6 && r.step.every(s => s === 1) && r.dueTomorrow, r);
  await ev(() => { while (document.body.classList.contains('sub')) window.__back(); });

  // «Повторить»
  await click('[data-tab="rep"]');
  r = await ev(() => ({ due: document.querySelector('#due').textContent, big: document.querySelector('.card div').textContent }));
  ok('«Повторить»: на сегодня 1 (wohnen; слово из облака без расписания)', r.due === '1', r);
  await shot('6-rep');
  // сдвигаем время на 2 дня — задания du-form становятся «на сегодня»
  await ev(() => { const S = MD.S(); Object.keys(S.srs).forEach(k => S.srs[k][1] -= 2 * 864e5); MD.render(); });
  r = await ev(() => document.querySelector('#due').textContent); ok('через 2 дня: на сегодня 7 (выученное не просрочено ещё)', r === '7', r);
  await click('#go');
  r = await ev(() => document.querySelector('.qtop span').textContent); ok('сессия — 7 заданий', /\/7$/.test(r), r);
  // ответить на первое неверно
  const kind = await ev(() => document.querySelector('[data-o]') ? 'o' : document.querySelector('[data-art]') ? 'a' : document.querySelector('#tiles') ? 'b' : 'e');
  await ev(k => { if (k === 'o') { const o = [...document.querySelectorAll('[data-o]')]; o[(+o.findIndex(x => true) + 1) % o.length].click(); } }, kind);
  await page.waitForTimeout(200); await shot('7-rep-task');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  // «Слова»
  await click('[data-tab="words"]');
  r = await ev(() => ({ h: [...document.querySelectorAll('main h2')].map(x => x.textContent), n: document.querySelectorAll('.wr').length }));
  ok('«Слова» → Живой немецкий: 6 разделов', r.h.length === 6 && r.n > 40, r);
  await shot('8-words');
  await click('[data-cat="base"]'); await click('.wr[data-word="firma"]');
  r = await ev(() => document.querySelector('.sh').innerText); ok('карточка Firma: die, мн. ч. Firmen', /die/.test(r) && /Firmen/.test(r), r.slice(0, 80));
  await shot('9-wordcard');
  await click('#wRep'); r = await ev(() => !!MD.S().srs['w:firma']); ok('«В повторение»', r);
  await click('[data-cat="my"]'); r = await ev(() => document.querySelectorAll('.wr').length); ok('«Мои»: 3 (wohnen, Feierabend, Firma)', r === 3, r);
  await click('[data-cat="live"]'); await click('.wr[data-word="haste"]'); r = await ev(() => document.querySelector('.sh').innerText); ok('сокращение: «как звучит»', /хасте/.test(r), r.slice(0, 80));
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  await click('[data-cat="b2"]'); await shot('10-b2');

  // «Мои вопросы»
  await click('[data-tab="qs"]');
  r = await ev(() => ({ n: document.querySelectorAll('main .card').length, d: [...document.querySelectorAll('main h2')].map(x => x.textContent) }));
  ok('«Мои вопросы»: 11, по датам (новые сверху)', r.n === 11 && r.d[0] === '13 октября 2026', r);
  await shot('11-qs');
  await click('main .card [data-rule="bevor"]'); r = await ev(() => document.querySelector('h1').textContent); ok('вопрос → правило bevor', /bevor/.test(r), r);
  await ev(() => window.__back()); await page.waitForTimeout(200);

  // поиск
  await page.fill('#q', 'bevor'); await page.waitForTimeout(250);
  r = await ev(() => [...document.querySelectorAll('main h2')].map(x => x.textContent)); ok('поиск «bevor»: правила и примеры', r.some(x => /Правила/.test(x)) && r.some(x => /Примеры/.test(x)), r);
  await shot('12-search');
  await page.fill('#q', 'щедрый'); await page.waitForTimeout(250); r = await ev(() => document.querySelector('main').innerText); ok('поиск по-русски «щедрый» → großzügig', /großzügig/.test(r));
  await page.fill('#q', 'gross'); await page.waitForTimeout(250); r = await ev(() => document.querySelector('main').innerText); ok('поиск без ß «gross» → groß', /groß/.test(r));
  await click('#qx');

  // настройки: ввод текста
  await click('#set'); await shot('13-settings');
  await click('[data-opt="type"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  r = await ev(() => MD.S().opt.type); ok('настройка «ввод текста» сохранена', r === true);
  await ev(() => MD.runQuiz([{ key: 'q:perfekt:4', task: MD.RBY.perfekt.quiz[4], rule: MD.RBY.perfekt }], 't')); await page.waitForTimeout(200);
  await page.fill('#typ', 'ich habe einen film gesehen'); await click('#chk');
  r = await ev(() => document.querySelector('.fb').className); ok('ввод текста: регистр и точка не важны', /ok/.test(r), r);
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);

  // облако: записалось кусками
  await page.waitForTimeout(1500);
  r = await ev(() => ({ n: window.__cloud.md_n, has: (window.__cloud.md_0 || '').includes('wohnen') })); ok('облако: записано', r.n >= 1 && r.has, r);
  ok('консоль без ошибок', !errs.length, errs.slice(0, 3));
  console.log(fails ? `ИТОГ: FAIL ${fails}` : 'ИТОГ: всё PASS'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
