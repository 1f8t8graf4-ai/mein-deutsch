// «Мой немецкий» 1.4: будильники (remind.js) в браузере.
// Запуск: python3 -m http.server 8090 (в корне репо), потом
//   NODE_PATH=/opt/node-tools/node_modules node tests/remind.js ph|360|pc [kino|book|duo]
// Что проверяется: колокольчик в шапке всех вкладок, шторка «Будильники» (пусто → «Новый будильник»), редактор
// (время по умолчанию — ближайшие 5 минут, колёса часов и минут, подпись, дни), порядок по времени, выключатель и точка
// на колокольчике, правка и удаление; звонок на весь экран в своё время (звук, «Стоп», в ту же минуту второй раз — нет,
// «Отложить» — снова через 5 минут, «назад» Телеграма = «Стоп», выключенный и не в свой день — тишина);
// «Сообщение от бота» = «Напоминание в боте» из настроек (POST /api/remind, час); неделя — точки от ответов;
// «назад» Телеграма и Esc закрывают шторку; тёмная в «Кино», светлая в «Учебнике» и «Ярком»; ничего не вылезает за край;
// консоль без ошибок. Скрины — tests/shots/rem-*.png. Время в странице — page.clock (вторник, 27.10.2026).
const { chromium } = require('playwright');
const dev = process.argv[2] || 'ph', SKIN = process.argv[3] || 'kino';
const VP = { ph: { width: 390, height: 844 }, 360: { width: 360, height: 740 }, pc: { width: 1440, height: 900 } }[dev];
const mob = dev !== 'pc';
const D = require('path').join(__dirname, 'shots'); require('fs').mkdirSync(D, { recursive: true });
let fails = 0, passes = 0;
const ok = (n, c, d) => { if (!c) fails++; else passes++; console.log(c ? 'PASS' : 'FAIL', n, !c && d !== undefined ? JSON.stringify(d).slice(0, 400) : ''); };
const API = 'https://mein-deutsch-bot.1f8t8graf4.workers.dev';
const fakeTG = local => `(()=>{window.__bb=[];window.__hap=[];const noop=()=>{};
 if(!sessionStorage.getItem('t-init')){sessionStorage.setItem('t-init','1');localStorage.setItem('md_v1',${JSON.stringify(local)});}
 window.Telegram={WebApp:{platform:'ios',version:'8.0',initData:'query_id=1&user=%7B%22id%22%3A1%7D&hash=x',initDataUnsafe:{user:{id:1,first_name:'Андрей'}},colorScheme:'light',themeParams:{},
  ready:noop,expand:noop,setHeaderColor:noop,setBackgroundColor:noop,setBottomBarColor:noop,disableVerticalSwipes:noop,isVersionAtLeast:()=>true,onEvent:noop,
  BackButton:{show(){window.__bb.push(1)},hide(){window.__bb.push(0)},onClick(f){window.__back=f}},
  HapticFeedback:{notificationOccurred(k){window.__hap.push(k)},selectionChanged(){window.__hap.push('sel')},impactOccurred(k){window.__hap.push(k)}},
  CloudStorage:{getItem(k,cb){setTimeout(()=>cb(null,''),5)},getItems(ks,cb){setTimeout(()=>cb(null,{}),5)},setItem(k,v,cb){cb&&cb(null,true)}}}};
 // звук: что играет и заглушён ли (play заглушённого — «разблокировка» для iPhone, не звонок)
 window.__play=[];const P=HTMLMediaElement.prototype,pl=P.play,pa=P.pause;
 P.play=function(){window.__play.push([String(this.src).split('/').pop(),!!this.muted,'play']);try{const r=pl.call(this);if(r&&r.catch)r.catch(()=>{});}catch(e){}return Promise.resolve();};
 P.pause=function(){window.__play.push([String(this.src).split('/').pop(),!!this.muted,'pause']);return pa.call(this);};
})();`;

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: VP, hasTouch: mob, isMobile: mob });
  await ctx.route('https://telegram.org/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const remind = [];
  await ctx.route(API + '/**', r => { const j = JSON.parse(r.request().postData() || '{}'); remind.push(j); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, on: j.on, hh: j.hh }) }); });
  await ctx.addInitScript(fakeTG(JSON.stringify({ v: 1, srs: {}, my: [], del: [], seen: {}, ls: {}, t0: 1, opt: { type: false, rem: true, hh: 10, skin: SKIN }, sv: 1 })));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon\.ico$/.test(r.url())) errs.push(r.status() + ' ' + r.url()); }); // файлы приложения (значок вкладки не нужен)
  await page.clock.install({ time: new Date(2026, 9, 27, 7, 57, 10) }); // вторник, 07:57:10
  await page.goto('http://127.0.0.1:8090/'); await page.waitForTimeout(900);
  const W = ms => page.waitForTimeout(ms);
  const ev = (f, a) => page.evaluate(f, a);
  const shot = n => page.screenshot({ path: `${D}/rem-${dev}-${SKIN}-${n}.png` });
  const tap = async s => { await page.click(s); await W(450); };
  const sheetOn = () => ev(() => !!document.querySelector('#rmRoot .rm-sheet.on'));
  const ringing = () => ev(() => !!document.querySelector('#rmRoot .rm-alarm.on'));
  const lastBB = () => ev(() => window.__bb[window.__bb.length - 1]);
  const rows = () => ev(() => [...document.querySelectorAll('#rmRoot [data-rm]')].map(r => [r.querySelector('.rm-time').textContent, r.querySelector('.rm-info b').textContent, r.querySelector('.rm-info small').textContent, !r.classList.contains('rm-off')]));
  const bellHas = () => ev(() => [...document.querySelectorAll('.hd [data-act="remind"]')].map(x => x.classList.contains('has')));
  const lastPlay = () => ev(() => window.__play.filter(p => p[0] === 'alarm.mp3').slice(-1)[0] || null);
  // всё в шторке — внутри экрана по ширине (анимации сначала доводим до конца)
  const ovf = () => ev(() => { document.getAnimations().forEach(a => { try { if (isFinite(a.effect.getComputedTiming().endTime)) a.finish(); } catch (e) {} });
    const w = innerWidth; return [...document.querySelectorAll('#rmRoot *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > w + 1) && !e.closest('.rm-wh'); }).map(e => e.className || e.tagName).slice(0, 6); });
  // выбрать значение колеса (как пальцем: прокрутка до пункта)
  const wheelTo = (cls, v) => ev(([c, v]) => { const w = document.querySelector('#rmRoot .' + c), i = [...w.children].findIndex(x => x.dataset.v === v); w.scrollTop = i * 40; w.dispatchEvent(new Event('scroll')); }, [cls, v]);
  const wheelVal = cls => ev(c => { const w = document.querySelector('#rmRoot .' + c); return w.children[Math.round(w.scrollTop / 40)].dataset.v; }, cls);
  // часы страницы: перевести время (таймеры не срабатывают) и подождать 20 с — проверка будильников идёт раз в 10 с
  const at = async (d, h, m, s) => { await page.clock.setSystemTime(new Date(2026, 9, d, h, m, s)); await page.clock.fastForward(20000); await W(450); };

  // 1. колокольчик в шапке всех вкладок
  for (const t of ['learn', 'rep', 'ref']) {
    await ev(t => MD.tab(t), t); await W(150);
    const h = await ev(() => { const hd = document.querySelector('.hd'), b = hd && hd.querySelector('[data-act="remind"]'), h1 = hd && hd.querySelector('h1'); return b && { r: hd.getBoundingClientRect().right, w: innerWidth, h1: h1.getBoundingClientRect().width, h1s: h1.scrollWidth - h1.clientWidth, n: hd.querySelectorAll('.ic').length }; });
    ok(`колокольчик в шапке: ${t}`, h && h.n === 3 && h.r <= h.w + 1 && h.h1 > 60 && h.h1s <= 1, h);
  }
  ok('точки на колокольчике нет — будильников нет', (await bellHas()).every(x => !x));
  await ev(() => MD.tab('learn')); await W(150);

  // 2. шторка: пусто, бот, неделя, вид
  await tap('.hd [data-act="remind"]');
  ok('шторка «Будильники» открылась', await sheetOn());
  ok('пусто — «Пока ничего не стоит» и «Новый будильник»', await ev(() => /Пока ничего не стоит/.test(document.querySelector('#rmRoot .rm-empty').textContent) && !!document.querySelector('#rmPlus')));
  ok('«назад» Телеграма показан', (await lastBB()) === 1);
  ok('«Сообщение от бота» = настройке (вкл, 10:00)', await ev(() => document.querySelector('#rmBot .rm-sw').classList.contains('on') && document.querySelector('#rmBotH').value === '10'));
  ok('неделя — 7 дней, сегодня обведён', await ev(() => document.querySelectorAll('#rmRoot .rm-week .rm-wd i').length === 7 && document.querySelectorAll('#rmRoot .rm-week .rm-wd i.td').length === 1));
  ok(`вид: ${SKIN === 'kino' ? 'тёмный' : 'светлый'}`, await ev(k => document.querySelector('#rmRoot').classList.contains('dk') === (k === 'kino'), SKIN));
  if (!mob) ok('ПК: окно по центру', await ev(() => { const r = document.querySelector('#rmRoot .rm-sheet').getBoundingClientRect(); return r.top > 30 && r.bottom < innerHeight - 30 && Math.abs(r.left + r.width / 2 - innerWidth / 2) < 2; }));
  ok('ничего не вылезает (список)', !(await ovf()).length, await ovf());
  await shot('1-list');

  // 3. новый будильник: время по умолчанию, колёса, подпись, дни
  await tap('#rmPlus');
  ok('редактор: колёса часов и минут', await ev(() => document.querySelectorAll('#rmRoot .rm-wh').length === 2 && document.querySelector('#rmRoot .rm-head b').textContent === 'Будильник'));
  await W(200);
  ok('по умолчанию — ближайшие 5 минут (07:57 → 08:00)', (await wheelVal('wh')) === '08' && (await wheelVal('wm')) === '00', [await wheelVal('wh'), await wheelVal('wm')]);
  ok('дни и «Проверить звук» — подписи по центру', await ev(() => [...document.querySelectorAll('#rmRoot .rm-day, #rmTest')].every(x => getComputedStyle(x).textAlign === 'center')));
  ok('дни — все включены', await ev(() => document.querySelectorAll('#rmRoot .rm-day.on').length === 7));
  ok('ничего не вылезает (редактор)', !(await ovf()).length, await ovf());
  await shot('2-edit');
  await page.fill('#rmLbl', 'Немецкий: 5 заданий');
  await tap('#rmSave');
  ok('сохранён: 08:00, подпись, каждый день', JSON.stringify(await rows()) === JSON.stringify([['08:00', 'Немецкий: 5 заданий', 'Каждый день', true]]), await rows());
  // второй — 07:30 по выходным (колёсами), без подписи
  await tap('#rmPlus'); await W(150);
  await wheelTo('wh', '07'); await wheelTo('wm', '30'); await W(300);
  ok('колесо: выбранный пункт подсвечен', await ev(() => document.querySelector('#rmRoot .wh .on').dataset.v === '07' && document.querySelector('#rmRoot .wm .on').dataset.v === '30'));
  for (const d of [1, 2, 3, 4, 5]) await page.click(`#rmRoot .rm-day[data-d="${d}"]`);
  await tap('#rmSave');
  ok('порядок по времени, «По выходным», подпись по умолчанию', JSON.stringify(await rows()) === JSON.stringify([['07:30', 'Пора учить немецкий', 'По выходным', true], ['08:00', 'Немецкий: 5 заданий', 'Каждый день', true]]), await rows());
  await shot('3-two');
  await tap('#rmDone');
  ok('закрылась по «Готово», «назад» спрятан', !(await sheetOn()) && (await lastBB()) === 0);
  ok('точка на колокольчике — что-то стоит', (await bellHas()).every(Boolean));

  // 4. звонок в своё время
  await page.clock.fastForward('03:00'); await W(500); // 08:00:1x
  ok('08:00 — звонит на весь экран', await ringing());
  ok('время на звонке крупно', await ev(() => parseFloat(getComputedStyle(document.querySelector('#rmRoot .rm-big')).fontSize) >= 80));
  ok('время и подпись на экране', await ev(() => document.querySelector('#rmRoot .rm-alarm .rm-big').textContent === '08:00' && document.querySelector('#rmRoot .rm-alarm .rm-lbl').textContent === 'Немецкий: 5 заданий'));
  ok('звук играет (не заглушён)', JSON.stringify(await lastPlay()) === JSON.stringify(['alarm.mp3', false, 'play']), await lastPlay());
  ok('вибрация (Telegram)', await ev(() => window.__hap.includes('warning')));
  ok('«назад» Телеграма показан во время звонка', (await lastBB()) === 1);
  await shot('4-alarm');
  await tap('#rmStop');
  ok('«Стоп» — тихо, экран ушёл', !(await ringing()) && JSON.stringify(await lastPlay()) === JSON.stringify(['alarm.mp3', false, 'pause']));
  await page.clock.fastForward(20000); await W(400);
  ok('в ту же минуту второй раз не звонит', !(await ringing()));

  // 5. «Отложить» — через 5 минут снова; «назад» Телеграма = «Стоп»
  await ev(() => RMIND._fire({ label: 'Проверка' })); await W(400);
  await tap('#rmZzz');
  ok('«Отложить» — тихо', !(await ringing()));
  await page.clock.fastForward('02:00'); await W(300);
  ok('через 2 минуты — ещё тихо', !(await ringing()));
  await page.clock.fastForward('03:10'); await W(500);
  ok('через 5 минут — снова звонит', await ringing() && await ev(() => document.querySelector('#rmRoot .rm-alarm .rm-lbl').textContent === 'Проверка'));
  await ev(() => window.__back()); await W(450);
  ok('«назад» Телеграма = «Стоп»', !(await ringing()) && (await lastPlay())[2] === 'pause');

  // 6. дни недели и выключатель
  await at(28, 7, 29, 55); // среда 07:30
  ok('по выходным — в среду тихо', !(await ringing()));
  await at(31, 7, 29, 55); // суббота 07:30
  ok('по выходным — в субботу звонит', await ringing());
  await tap('#rmStop');
  await tap('.hd [data-act="remind"]');
  await page.click('#rmRoot [data-rm]:nth-child(2) [data-sw]'); await W(200);
  ok('выключатель: 08:00 выключен (серый)', JSON.stringify((await rows()).map(r => r[3])) === '[true,false]', await rows());
  await tap('#rmDone');
  await at(31, 7, 59, 55);
  ok('выключенный — тихо', !(await ringing()));
  await tap('.hd [data-act="remind"]');
  await page.click('#rmRoot [data-rm]:nth-child(1) [data-sw]'); await W(200);
  await tap('#rmDone');
  ok('всё выключено — точки на колокольчике нет', (await bellHas()).every(x => !x));

  // 7. правка и удаление
  await tap('.hd [data-act="remind"]');
  await tap('#rmRoot [data-rm]:nth-child(2) .rm-info');
  ok('правка: «Изменить», время и дни на месте', await ev(() => document.querySelector('#rmRoot .rm-head b').textContent === 'Изменить' && document.querySelectorAll('#rmRoot .rm-day.on').length === 7) && (await wheelVal('wh')) === '08' && (await wheelVal('wm')) === '00');
  await page.fill('#rmLbl', 'Wortschatz');
  await tap('#rmSave');
  ok('правка сохранена и включила будильник', JSON.stringify((await rows())[1]) === JSON.stringify(['08:00', 'Wortschatz', 'Каждый день', true]), await rows());
  await tap('#rmRoot [data-rm]:nth-child(1) .rm-info');
  ok('«Удалить будильник» есть в правке', await ev(() => !!document.querySelector('#rmDel')));
  await tap('#rmDel');
  ok('удалён — остался один', JSON.stringify((await rows()).map(r => r[0])) === '["08:00"]', await rows());
  await tap('#rmPlus'); await tap('#rmCancel');
  ok('«Отмена» — назад к списку без изменений', (await rows()).length === 1 && await sheetOn());

  // 8. «Сообщение от бота» — та же настройка, что в ⚙
  const n0 = remind.length;
  await page.click('#rmBot'); await W(400);
  ok('бот: выключил — ушло на сервер', remind.length === n0 + 1 && remind[remind.length - 1].on === false && (await ev(() => MD.S().opt.rem)) === false, remind.slice(-1));
  await page.selectOption('#rmBotH', '9'); await W(400);
  ok('бот: 09:00 — включил и ушло на сервер', remind.length === n0 + 2 && remind[remind.length - 1].on === true && remind[remind.length - 1].hh === 9 && await ev(() => document.querySelector('#rmBot .rm-sw').classList.contains('on')), remind.slice(-1));
  await tap('#rmDone');
  await tap('.hd [data-act="set"]');
  ok('в настройках то же: вкл, 09:00', await ev(() => document.querySelector('.sw[data-opt="rem"]').classList.contains('on') && document.querySelector('#hh').value === '9'));
  await ev(() => window.__back()); await W(350);

  // 9. неделя — точки от ответов
  const rk = await ev(() => Object.keys(MD.RBY)[0]);
  await ev(k => { for (let i = 0; i < 5; i++) MD.grade('q:' + k + ':0', true); }, rk);
  await tap('.hd [data-act="remind"]');
  ok('неделя: сегодня 5 ответов — зелёная точка', await ev(() => { const td = document.querySelector('#rmRoot .rm-week .rm-wd i.td'); return td.classList.contains('f') && /занимался 1 день из 7/.test(document.querySelector('#rmRoot .rm-week .rm-wt small').textContent); }));
  await shot('5-week');

  // 10. «назад» Телеграма и Esc закрывают шторку
  await ev(() => window.__back()); await W(450);
  ok('«назад» Телеграма закрыл шторку', !(await sheetOn()) && (await lastBB()) === 0);
  await tap('.hd [data-act="remind"]');
  await page.keyboard.press('Escape'); await W(450);
  ok('Esc закрыл шторку', !(await sheetOn()));
  await tap('.hd [data-act="remind"]');
  await page.mouse.click(VP.width / 2, 8); await W(450);
  ok('тап мимо (по затемнению) закрыл шторку', !(await sheetOn()));

  ok('консоль без ошибок', !errs.length, errs);
  console.log(`\n${dev} ${SKIN}: ${passes} PASS, ${fails} FAIL`);
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
