/* 1.4: БУДИЛЬНИКИ в стиле iPhone (Андрей: «кнопочка, чтобы я мог себе напоминания ставить или будильники, всё в стиле айфона»).
   Модуль сделала Зетка для «Языков по кино» (ветка zai/de-reminders), сюда перенёс Claude. Свой стор и свои стили.
   • колокольчик в шапке → шторка «Будильники»: список с переключателями, «+», неделя, «Сообщение от бота»;
   • новый будильник: колёса часов и минут (шаг 5 мин, как в Таймере iPhone), подпись, дни недели, «Проверить звук»;
   • пока приложение открыто — в своё время звонит на весь экран: время, подпись, звук и вибрация, «Стоп» / «Отложить 5 мин»;
   • приложение закрыто — пишет бот (то же, что «Напоминание в боте» в настройках: раз в день, в выбранный час).
     Выгрузки в календарь iPhone (.ics у Зетки) нет: из мини-аппа файл туда не положить без своего сервера.
   Связь с app.js — через window.MD: rem(), remSet(on, hh), backSync(). app.js зовёт RMIND.mark() при каждом ответе
   и RMIND.close() по «назад». Будильники и неделя — только на этом устройстве (localStorage), в облако не уходят. */
(function () {
'use strict';
var KEY = 'md_rem_v1', HKEY = 'md_day_v1';
var DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];   // getDay(): 0 — воскресенье
var ALARM = 'snd/alarm.mp3', TICK = 'snd/tick.mp3';
var Z = 70;                                              // выше шторок приложения (#ov — 50, вкладки — 30)
var TG = window.Telegram && Telegram.WebApp;

/* ---------- стор ---------- */
function load() { try { var v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function save(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} }
function anyOn() { return load().some(function (r) { return r.on !== false; }); }
function hist() { try { var v = JSON.parse(localStorage.getItem(HKEY)); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
function dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function hap(k) { try { var H = TG && TG.HapticFeedback; if (!H) return; if (k === 'ok') H.notificationOccurred('success'); else if (k === 'warn') H.notificationOccurred('warning'); else if (k === 'sel') H.selectionChanged(); else H.impactOccurred(k || 'light'); } catch (e) {} }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ---------- звук: на iPhone играть без касания можно только тому, кто уже играл после касания — «будим» его первым касанием, без звука ---------- */
var AUD = null, TK = null, UNL = false, BUZ = 0, RING = false;
function unlock() {
  if (UNL) return; UNL = true;
  try { AUD = new Audio(ALARM); AUD.loop = true; AUD.muted = true; var p = AUD.play(); if (p && p.then) p.then(function () { AUD.pause(); AUD.currentTime = 0; AUD.muted = false; }, function () { AUD.muted = false; UNL = false; }); else { AUD.pause(); AUD.muted = false; } } catch (e) { UNL = false; }
}
function tick() { try { TK = TK || new Audio(TICK); TK.volume = .3; TK.currentTime = 0; var p = TK.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
function ring() {
  try { if (!AUD) AUD = new Audio(ALARM); AUD.loop = true; AUD.muted = false; AUD.volume = .9; AUD.currentTime = 0; var p = AUD.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  clearInterval(BUZ); var buzz = function () { try { if (navigator.vibrate) navigator.vibrate([500, 250, 500]); } catch (e) {} hap('warn'); };
  buzz(); BUZ = setInterval(buzz, 1500);
}
function hush() { try { if (AUD) { AUD.pause(); AUD.currentTime = 0; } } catch (e) {} clearInterval(BUZ); try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) {} }
// на iPhone «касание» для звука — это отпускание пальца (touchend / click), не pointerdown
['touchend', 'click', 'keydown'].forEach(function (e) { document.addEventListener(e, unlock, { passive: true, capture: true }); });

/* ---------- стили: как в iOS, тёмные в виде «Кино», светлые в «Учебнике» и «Ярком» ---------- */
var CSS = [
'#rmRoot{--rm-bg:#F2F2F7;--rm-card:#fff;--rm-tx:#000;--rm-mut:#8E8E93;--rm-sep:rgba(60,60,67,.14);--rm-blue:#007AFF;--rm-sw:#E9E9EA;--rm-dim:rgba(0,0,0,.4);--rm-red:#FF3B30;--rm-green:#34C759}',
'#rmRoot.dk{--rm-bg:#1C1C1E;--rm-card:#2C2C2E;--rm-tx:#fff;--rm-mut:#8E8E93;--rm-sep:rgba(84,84,88,.55);--rm-blue:#0A84FF;--rm-sw:#39393D;--rm-dim:rgba(0,0,0,.6);--rm-red:#FF453A;--rm-green:#30D158}',
'#rmRoot *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}',
'#rmRoot button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:center}',
'.rm-dim{position:fixed;inset:0;z-index:' + Z + ';background:var(--rm-dim);opacity:0;transition:opacity .28s}',
'.rm-dim.on{opacity:1}',
'.rm-sheet{position:fixed;left:50%;bottom:0;z-index:' + (Z + 1) + ';width:min(560px,100%);max-height:88vh;display:flex;flex-direction:column;background:var(--rm-bg);color:var(--rm-tx);border-radius:22px 22px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.28);transform:translate(-50%,105%);transition:transform .34s cubic-bezier(.32,.72,.28,1);font:15px/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;padding-bottom:env(safe-area-inset-bottom)}',
'.rm-sheet.on{transform:translate(-50%,0)}',
'@media (min-width:760px){.rm-sheet{top:50%;bottom:auto;border-radius:22px;opacity:0;transform:translate(-50%,-46%);transition:transform .3s cubic-bezier(.32,.72,.28,1),opacity .22s}.rm-sheet.on{opacity:1;transform:translate(-50%,-50%)}.rm-grab{visibility:hidden}}',
'.rm-grab{flex:none;width:38px;height:5px;border-radius:3px;background:var(--rm-sep);margin:8px auto 2px}',
'.rm-head{flex:none;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:8px 16px 6px}',
'.rm-head b{grid-column:2;font-size:17px;font-weight:600;letter-spacing:-.2px}',
'#rmRoot .rm-act{color:var(--rm-blue);font-size:17px;padding:6px 2px}',
'#rmRoot .rm-act.l{justify-self:start}#rmRoot .rm-act.r{justify-self:end;font-weight:600}',
'.rm-body{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 16px 20px}',
'.rm-lab{font-size:13px;color:var(--rm-mut);text-transform:uppercase;letter-spacing:.3px;margin:16px 16px 7px}',
'.rm-lab:first-child{margin-top:4px}',
'.rm-card{background:var(--rm-card);border-radius:12px;overflow:hidden}',
'#rmRoot .rm-row{position:relative;display:flex;align-items:center;gap:12px;width:100%;min-height:58px;padding:10px 16px;text-align:left}',
'.rm-row+.rm-row::before{content:"";position:absolute;left:16px;right:0;top:0;height:.5px;background:var(--rm-sep)}',
'.rm-time{flex:none;min-width:84px;font-size:34px;font-weight:300;letter-spacing:-.5px;font-variant-numeric:tabular-nums;line-height:1}',
'.rm-info{flex:1;min-width:0;display:grid;gap:2px}',
'.rm-info b{font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.rm-info small{font-size:13px;color:var(--rm-mut)}',
'.rm-off .rm-time,.rm-off .rm-info b{color:var(--rm-mut)}',
'.rm-sw{position:relative;flex:none;width:51px;height:31px;border-radius:16px;background:var(--rm-sw);transition:background .22s}',
'.rm-sw::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.18),0 0 0 .5px rgba(0,0,0,.04);transition:transform .25s cubic-bezier(.3,1.3,.6,1)}',
'.rm-sw.on{background:var(--rm-green)}.rm-sw.on::after{transform:translateX(20px)}',
'.rm-empty{padding:26px 18px;text-align:center;color:var(--rm-mut);line-height:1.45}',
'.rm-empty b{display:block;font-size:17px;font-weight:600;color:var(--rm-tx);margin-bottom:4px}',
'#rmRoot .rm-plus{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:50px;margin-top:10px;border-radius:12px;background:var(--rm-card);color:var(--rm-blue);font-size:17px}',
'#rmRoot .rm-plus span{font-size:24px;line-height:1;margin-top:-2px}',
'.rm-foot{margin:7px 16px 0;font-size:13px;color:var(--rm-mut);line-height:1.4}',
'.rm-sel{appearance:none;-webkit-appearance:none;border:0;background:none;color:var(--rm-mut);font:inherit;font-size:16px;text-align:right;padding:4px 18px 4px 4px;background-image:linear-gradient(45deg,transparent 50%,var(--rm-mut) 50%),linear-gradient(135deg,var(--rm-mut) 50%,transparent 50%);background-position:right 7px center,right 2px center;background-size:5px 5px;background-repeat:no-repeat}',
'.rm-week{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--rm-card);border-radius:12px}',
'.rm-wt{flex:1;min-width:0;display:grid;gap:2px}.rm-wt b{font-size:15px;font-weight:500}.rm-wt small{font-size:13px;color:var(--rm-mut)}',
'.rm-wd{display:flex;gap:6px}',
'.rm-wd span{display:grid;justify-items:center;gap:4px;font-size:10px;color:var(--rm-mut)}',
'.rm-wd i{width:12px;height:12px;border-radius:50%;background:var(--rm-sep)}',
'.rm-wd i.h{background:linear-gradient(90deg,#FF9F0A 50%,var(--rm-sep) 50%)}.rm-wd i.f{background:var(--rm-green)}',
'.rm-wd i.td{box-shadow:0 0 0 2px var(--rm-card),0 0 0 3.5px var(--rm-mut)}',
/* редактор: колёса */
'.rm-pick{position:relative;display:flex;justify-content:center;gap:4px;height:200px;margin:6px 0 4px}',
'.rm-pick::before{content:"";position:absolute;left:12px;right:12px;top:calc(50% - 20px);height:40px;border-radius:9px;background:var(--rm-sw);opacity:.75;pointer-events:none}',
'.rm-pick i{position:relative;align-self:center;font-style:normal;font-size:26px;font-weight:300}',
'.rm-wh{position:relative;flex:none;width:84px;height:100%;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;padding:80px 0;-webkit-mask-image:linear-gradient(transparent,#000 30%,#000 70%,transparent);mask-image:linear-gradient(transparent,#000 30%,#000 70%,transparent)}',
'.rm-wh::-webkit-scrollbar{display:none}',
'.rm-wh div{height:40px;line-height:40px;text-align:center;font-size:23px;font-variant-numeric:tabular-nums;scroll-snap-align:center;color:var(--rm-mut);cursor:pointer;transition:color .15s}',
'.rm-wh div.on{color:var(--rm-tx)}',
'.rm-inp{width:100%;height:46px;padding:0 14px;border-radius:12px;border:0;background:var(--rm-card);color:var(--rm-tx);font:inherit;font-size:16px;outline:none}',
'.rm-inp::placeholder{color:var(--rm-mut)}',
'.rm-days{display:flex;justify-content:space-between;gap:4px}',
'#rmRoot .rm-day{width:40px;height:40px;border-radius:50%;background:var(--rm-card);font-size:13px;font-weight:600}',
'#rmRoot .rm-day.on{background:var(--rm-blue);color:#fff}',
'#rmRoot .rm-wide{width:100%;height:50px;margin-top:12px;border-radius:12px;background:var(--rm-card);font-size:17px;color:var(--rm-blue)}',
'#rmRoot .rm-wide.del{color:var(--rm-red)}',
/* будильник на весь экран */
'.rm-alarm{position:fixed;inset:0;z-index:' + (Z + 2) + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;background:#0b0b0d;color:#fff;opacity:0;transition:opacity .3s;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,sans-serif}',
'.rm-alarm.on{opacity:1}',
'.rm-alarm small{font-size:15px;color:rgba(255,255,255,.55);letter-spacing:.4px;text-transform:uppercase}',
'.rm-big{font-size:min(96px,24vw);font-weight:200;letter-spacing:-2px;font-variant-numeric:tabular-nums;line-height:1}',
'.rm-lbl{max-width:320px;margin-bottom:30px;font-size:21px;font-weight:600;text-align:center}',
'.rm-btns{display:flex;align-items:center;gap:18px}',
'#rmRoot .rm-ab{height:50px;padding:0 26px;border-radius:25px;font-size:17px;font-weight:600}',
'#rmRoot .rm-ab.stop{height:56px;padding:0 40px;border-radius:28px;background:#FF9F0A;color:#000;font-size:19px}',
'#rmRoot .rm-ab.zzz{background:rgba(255,255,255,.14);color:#fff}',
'.rm-bellsvg{width:64px;height:64px;margin-bottom:6px;fill:none;stroke:#FF9F0A;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;animation:rmshake 1s ease-in-out infinite}',
'@keyframes rmshake{0%,100%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-12deg)}45%{transform:rotate(8deg)}60%{transform:rotate(-4deg)}75%{transform:rotate(0)}}'
].join('\n');
var BELL = '<svg class="rm-bellsvg" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';

/* ---------- шторки ---------- */
var ROOT = null, OPEN = false;
function root() {
  if (!document.getElementById('rmCss')) { var st = document.createElement('style'); st.id = 'rmCss'; st.textContent = CSS; document.head.appendChild(st); }
  if (!ROOT) { ROOT = document.createElement('div'); ROOT.id = 'rmRoot'; document.body.appendChild(ROOT); }
  ROOT.classList.toggle('dk', (document.documentElement.dataset.skin || 'kino') === 'kino');
  return ROOT;
}
function backSync() { try { if (window.MD && MD.backSync) MD.backSync(); } catch (e) {} }
function show(html) {
  var R = root(), was = OPEN && R.querySelector('.rm-sheet');
  R.innerHTML = '<div class="rm-dim' + (was ? ' on' : '') + '"></div>' + html;
  OPEN = true;
  var d = R.querySelector('.rm-dim'), s = R.querySelector('.rm-sheet');
  if (was) s.classList.add('on'); else requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('on'); s.classList.add('on'); }); });
  d.onclick = close;
  backSync();
  return s;
}
function close() {
  if (!OPEN || !ROOT) return false;
  OPEN = false;
  var R = ROOT, d = R.querySelector('.rm-dim'), s = R.querySelector('.rm-sheet');
  if (d) d.classList.remove('on'); if (s) s.classList.remove('on');
  setTimeout(function () { if (!OPEN && !R.querySelector('.rm-alarm')) R.innerHTML = ''; }, 360);
  backSync(); badge();
  return true;
}
function daysStr(r) { var d = r.days || []; if (!d.length || d.length >= 7) return 'Каждый день'; if (d.length === 5 && [1, 2, 3, 4, 5].every(function (x) { return d.indexOf(x) >= 0; })) return 'По будням'; if (d.length === 2 && d.indexOf(0) >= 0 && d.indexOf(6) >= 0) return 'По выходным'; return [1, 2, 3, 4, 5, 6, 0].filter(function (x) { return d.indexOf(x) >= 0; }).map(function (x) { return DAYS[x]; }).join(', '); }

/* неделя: сколько ответов в заданиях было за день (app.js зовёт mark() на каждый ответ) */
function weekHTML() {
  var h = hist(), out = '', n = 0, t = new Date();
  for (var i = 6; i >= 0; i--) {
    var dt = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i), v = h[dkey(dt)] || 0;
    if (v) n++;
    out += '<span><i class="' + (v >= 5 ? 'f' : v ? 'h' : '') + (i === 0 ? ' td' : '') + '"></i>' + DAYS[dt.getDay()] + '</span>';
  }
  return '<div class="rm-week"><span class="rm-wt"><b>Неделя</b><small>' + (n ? 'занимался ' + n + ' ' + (n === 1 ? 'день' : n < 5 ? 'дня' : 'дней') + ' из 7' : 'на этой неделе ещё не занимался') + '</small></span><span class="rm-wd">' + out + '</span></div>';
}
function botHTML() {
  var b = window.MD && MD.rem ? MD.rem() : null;
  if (!b) return '';
  var opts = ''; for (var h = 6; h <= 23; h++) opts += '<option value="' + h + '"' + (b.hh === h ? ' selected' : '') + '>' + pad(h) + ':00</option>';
  return '<div class="rm-lab">Если приложение закрыто</div><div class="rm-card">'
    + '<button class="rm-row" id="rmBot"><span class="rm-info"><b>Сообщение от бота</b><small>' + (b.api ? 'раз в день: «5 заданий на сегодня»' : 'заработает, когда подключим бота') + '</small></span><span class="rm-sw' + (b.on ? ' on' : '') + '"></span></button>'
    + '<div class="rm-row"><span class="rm-info"><b>Во сколько</b></span><select class="rm-sel" id="rmBotH">' + opts + '</select></div></div>'
    + '<p class="rm-foot">Будильник звонит, пока приложение открыто. Закрыл — напомнит бот сообщением в Telegram.</p>';
}
function listHTML(L) {
  return '<div class="rm-sheet" role="dialog" aria-label="Будильники"><div class="rm-grab"></div>'
    + '<div class="rm-head"><b>Будильники</b><button class="rm-act r" id="rmDone">Готово</button></div><div class="rm-body">'
    + weekHTML()
    + '<div class="rm-lab">Будильники</div>'
    + (L.length ? '<div class="rm-card">' + L.map(function (r) {
        return '<button class="rm-row' + (r.on === false ? ' rm-off' : '') + '" data-rm="' + esc(r.id) + '"><span class="rm-time">' + pad(r.h) + ':' + pad(r.m) + '</span>'
          + '<span class="rm-info"><b>' + esc(r.label || 'Пора учить немецкий') + '</b><small>' + daysStr(r) + '</small></span><span class="rm-sw' + (r.on === false ? '' : ' on') + '" data-sw="1"></span></button>';
      }).join('') + '</div>'
      : '<div class="rm-card"><div class="rm-empty"><b>Пока ничего не стоит</b>Поставь будильник — напомню учить немецкий.</div></div>')
    + '<button class="rm-plus" id="rmPlus"><span>+</span> Новый будильник</button>'
    + botHTML()
    + '</div></div>';
}
function openList() {
  var s = show(listHTML(load()));
  s.querySelector('#rmDone').onclick = close;
  s.querySelector('#rmPlus').onclick = function () { hap('light'); openEditor(null); };
  [].forEach.call(s.querySelectorAll('[data-rm]'), function (b) {
    b.onclick = function (e) {
      var L = load(), r = L.filter(function (x) { return x.id === b.dataset.rm; })[0]; if (!r) return;
      if (e.target.closest('[data-sw]')) { r.on = r.on === false; save(L); hap(r.on ? 'ok' : 'light'); var sw = b.querySelector('.rm-sw'); sw.classList.toggle('on', r.on); b.classList.toggle('rm-off', !r.on); badge(); return; }
      hap('light'); openEditor(r);
    };
  });
  var bot = s.querySelector('#rmBot'), bh = s.querySelector('#rmBotH');
  if (bot) bot.onclick = function () { var b = MD.rem(), on = !b.on; MD.remSet(on, b.hh); bot.querySelector('.rm-sw').classList.toggle('on', on); hap(on ? 'ok' : 'light'); };
  if (bh) bh.onchange = function () { MD.remSet(true, +bh.value); var sw = bot && bot.querySelector('.rm-sw'); if (sw) sw.classList.add('on'); hap('sel'); };
}

/* редактор: колёса часов и минут */
var HRS = [], MIN = []; (function () { for (var h = 0; h < 24; h++) HRS.push(pad(h)); for (var m = 0; m < 60; m += 5) MIN.push(pad(m)); })();
var IH = 40;   // высота пункта колеса
function wheel(cls, vals, sel) { return '<div class="rm-wh ' + cls + '">' + vals.map(function (v) { return '<div data-v="' + v + '"' + (v === sel ? ' class="on"' : '') + '>' + v + '</div>'; }).join('') + '</div>'; }
function editorHTML(r) {
  var days = r.days || [0, 1, 2, 3, 4, 5, 6];
  return '<div class="rm-sheet" role="dialog" aria-label="Будильник"><div class="rm-grab"></div>'
    + '<div class="rm-head"><button class="rm-act l" id="rmCancel">Отмена</button><b>' + (r.id ? 'Изменить' : 'Будильник') + '</b><button class="rm-act r" id="rmSave">Сохранить</button></div><div class="rm-body">'
    + '<div class="rm-pick">' + wheel('wh', HRS, pad(r.h)) + '<i>:</i>' + wheel('wm', MIN, pad(r.m)) + '</div>'
    + '<div class="rm-lab">Подпись</div><input class="rm-inp" id="rmLbl" maxlength="40" placeholder="Пора учить немецкий" value="' + esc(r.label || '') + '">'
    + '<div class="rm-lab">Повтор</div><div class="rm-days">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<button class="rm-day' + (days.indexOf(d) >= 0 ? ' on' : '') + '" data-d="' + d + '">' + DAYS[d] + '</button>'; }).join('') + '</div>'
    + '<button class="rm-wide" id="rmTest">Проверить звук</button>'
    + (r.id ? '<button class="rm-wide del" id="rmDel">Удалить будильник</button>' : '')
    + '</div></div>';
}
function wheelInit(w, val) {
  var kids = w.children, idx = 0;
  for (var i = 0; i < kids.length; i++) if (kids[i].dataset.v === val) idx = i;
  var set = function () { w.scrollTop = idx * IH; };
  set(); requestAnimationFrame(set); setTimeout(set, 90);
  var t = 0, last = idx;
  var mark = function () { var i2 = Math.max(0, Math.min(kids.length - 1, Math.round(w.scrollTop / IH))); [].forEach.call(kids, function (x, j) { x.classList.toggle('on', j === i2); }); if (i2 !== last) { last = i2; tick(); hap('sel'); } };
  w.addEventListener('scroll', function () { mark(); clearTimeout(t); t = setTimeout(function () { var i2 = Math.round(w.scrollTop / IH); if (Math.abs(w.scrollTop - i2 * IH) > 1) w.scrollTo({ top: i2 * IH, behavior: 'smooth' }); }, 140); }, { passive: true });
  w.addEventListener('click', function (e) { var it = e.target.closest('[data-v]'); if (!it) return; w.scrollTo({ top: [].indexOf.call(kids, it) * IH, behavior: 'smooth' }); });
}
function wheelVal(w) { var k = w.children, i = Math.max(0, Math.min(k.length - 1, Math.round(w.scrollTop / IH))); return +k[i].dataset.v; }
function openEditor(r) {
  var n = new Date(Math.ceil(Date.now() / 300000) * 300000);   // новый — на ближайшие 5 минут вперёд (10:58 → 11:00)
  r = r || { id: null, h: n.getHours(), m: n.getMinutes(), label: '', days: [0, 1, 2, 3, 4, 5, 6], on: true };
  var s = show(editorHTML(r)), wh = s.querySelector('.wh'), wm = s.querySelector('.wm'), days = (r.days || [0, 1, 2, 3, 4, 5, 6]).slice();
  wheelInit(wh, pad(r.h)); wheelInit(wm, pad(r.m));
  [].forEach.call(s.querySelectorAll('.rm-day'), function (b) {
    b.onclick = function () { var d = +b.dataset.d, i = days.indexOf(d); if (i >= 0) days.splice(i, 1); else days.push(d); b.classList.toggle('on', i < 0); hap('sel'); };
  });
  s.querySelector('#rmCancel').onclick = function () { hap('light'); openList(); };
  s.querySelector('#rmTest').onclick = function () { ring(); hap('ok'); setTimeout(hush, 2600); };
  var del = s.querySelector('#rmDel');
  if (del) del.onclick = function () { save(load().filter(function (x) { return x.id !== r.id; })); hap('heavy'); openList(); badge(); };
  s.querySelector('#rmSave').onclick = function () {
    var L = load(), lbl = s.querySelector('#rmLbl').value.trim();
    var rec = { id: r.id || ('r' + Date.now()), h: wheelVal(wh), m: wheelVal(wm), label: lbl || 'Пора учить немецкий', days: days.length ? days.sort() : [0, 1, 2, 3, 4, 5, 6], on: true };
    var i = -1; L.forEach(function (x, j) { if (x.id === rec.id) i = j; });
    if (i >= 0) L[i] = rec; else L.push(rec);
    L.sort(function (a, b) { return a.h * 60 + a.m - (b.h * 60 + b.m); });
    save(L); hap('ok'); openList(); badge();
  };
}

/* ---------- будильник на весь экран ---------- */
var SNZ = 0, SNZR = null;
function fire(r) {
  var R = root(); OPEN = false; RING = true; hush(); ring();
  var n = new Date();
  R.innerHTML = '<div class="rm-alarm" role="alertdialog" aria-label="Будильник">' + BELL + '<small>Будильник</small><div class="rm-big">' + pad(n.getHours()) + ':' + pad(n.getMinutes()) + '</div><div class="rm-lbl">' + esc(r.label || 'Пора учить немецкий') + '</div>'
    + '<div class="rm-btns"><button class="rm-ab zzz" id="rmZzz">Отложить</button><button class="rm-ab stop" id="rmStop">Стоп</button></div></div>';
  var a = R.querySelector('.rm-alarm');
  requestAnimationFrame(function () { a.classList.add('on'); });
  var off = function () { RING = false; hush(); a.classList.remove('on'); setTimeout(function () { if (!OPEN && R.querySelector('.rm-alarm')) R.innerHTML = ''; }, 320); backSync(); };
  R.querySelector('#rmStop').onclick = function () { hap('ok'); off(); };
  R.querySelector('#rmZzz').onclick = function () { hap('light'); off(); SNZ = Date.now() + 5 * 60000; SNZR = r; };
  backSync();
}
function check() {
  var n = new Date(), key = dkey(n) + ' ' + pad(n.getHours()) + ':' + pad(n.getMinutes());
  if (SNZ && Date.now() >= SNZ) { SNZ = 0; var s = SNZR; SNZR = null; if (s) fire(s); return; }
  var L = load();
  for (var i = 0; i < L.length; i++) {
    var r = L[i];
    if (r.on === false || r.h !== n.getHours() || r.m !== n.getMinutes()) continue;
    if (Array.isArray(r.days) && r.days.length && r.days.length < 7 && r.days.indexOf(n.getDay()) < 0) continue;
    if (r.fired === key) continue;
    r.fired = key; save(L); fire(r); return;
  }
}

/* ---------- неделя и значок ---------- */
function mark() { var h = hist(), t = dkey(); h[t] = (h[t] || 0) + 1; var ks = Object.keys(h).sort(); if (ks.length > 60) ks.slice(0, ks.length - 60).forEach(function (k) { delete h[k]; }); try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch (e) {} }
function badge() { var on = anyOn(); [].forEach.call(document.querySelectorAll('[data-act="remind"]'), function (b) { b.classList.toggle('has', on); }); }
var STARTED = false;
function start() { if (STARTED) return; STARTED = true; setInterval(function () { try { check(); } catch (e) {} }, 10000); setTimeout(check, 1500); }

window.RMIND = {
  open: function () { unlock(); start(); openList(); },
  close: function () { if (RING && ROOT) { var b = ROOT.querySelector('#rmStop'); if (b) { b.click(); return true; } } return close(); },   // «назад» во время звонка = «Стоп»
  isOpen: function () { return OPEN || RING; },
  anyOn: anyOn, mark: mark, badge: badge, list: load,
  _fire: function (r) { fire(r || { label: 'Проверка' }); }   // для проверки (tests)
};
if (document.readyState !== 'loading') start(); else document.addEventListener('DOMContentLoaded', start);
})();
