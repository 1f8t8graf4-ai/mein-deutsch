// Тест бота без Cloudflare: KV в памяти, запросы в Telegram перехватываются. node tests/bot.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../bot/worker.js', import.meta.url), 'utf8');
const W = (await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'))).default;
let fails = 0; const ok = (n, c, d) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, d === undefined ? '' : JSON.stringify(d)); };
const store = new Map();
const KV = { get: async k => store.has(k) ? store.get(k) : null, put: async (k, v) => { store.set(k, v); },
  list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
const env = { BOT_TOKEN: '123:TEST', SETUP_SECRET: 'pw', APP_URL: 'https://example.github.io/mein-deutsch/', KV };
const calls = []; let blocked = new Set();
globalThis.fetch = async (url, o) => { const m = /bot[^/]+\/(\w+)/.exec(url)[1], b = JSON.parse(o.body); calls.push([m, b]);
  if (m === 'sendMessage' && blocked.has(b.chat_id)) return new Response(JSON.stringify({ ok: false, error_code: 403 }));
  return new Response(JSON.stringify({ ok: true })); };
const hookSecret = crypto.createHash('sha256').update('md:' + env.BOT_TOKEN).digest('hex').slice(0, 48);
const req = (path, body, h) => new Request('https://bot.example.workers.dev' + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(h || {}) }, body: body ? JSON.stringify(body) : undefined });
function initData(id, tok = env.BOT_TOKEN) { const p = new URLSearchParams(); p.set('auth_date', String(Math.floor(Date.now() / 1000))); p.set('user', JSON.stringify({ id, first_name: 'A' }));
  const dcs = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n'); const sec = crypto.createHmac('sha256', 'WebAppData').update(tok).digest();
  p.set('hash', crypto.createHmac('sha256', sec).update(dcs).digest('hex')); return p.toString(); }

let r = await W.fetch(req('/'), env); ok('/ — статус', /Токен: ✅/.test(await r.text()));
r = await W.fetch(req('/setup?secret=no'), env); ok('/setup без пароля — 403', r.status === 403);
r = await W.fetch(req('/setup?secret=pw'), env); const st = await r.json();
ok('/setup — вебхук с секретом, кнопка меню, команды', st.webhook.ok && calls.some(c => c[0] === 'setWebhook' && c[1].secret_token === hookSecret && c[1].url.endsWith('/tg')) && calls.some(c => c[0] === 'setChatMenuButton'));
r = await W.fetch(req('/tg', { message: { chat: { id: 5, type: 'private' }, text: '/start' } }), env); ok('вебхук без секрета — 403', r.status === 403);
calls.length = 0;
r = await W.fetch(req('/tg', { message: { chat: { id: 5, type: 'private' }, text: '/start' } }, { 'X-Telegram-Bot-Api-Secret-Token': hookSecret }), env);
ok('/start — сообщение с кнопкой web_app', calls[0][0] === 'sendMessage' && calls[0][1].reply_markup.inline_keyboard[0][0].web_app.url === env.APP_URL, calls[0]);
ok('/start — пользователь сохранён, напоминание вкл в 10', JSON.parse(store.get('u:5')).on === true && JSON.parse(store.get('u:5')).hh === 10);
r = await W.fetch(req('/api/remind', { init: initData(5, '999:OTHER'), on: true, hh: 8, tz: 'Europe/Moscow' }), env); ok('/api/remind — чужая подпись не проходит', r.status === 403);
r = await W.fetch(req('/api/remind', { init: initData(5), on: true, hh: 8, tz: 'Europe/Moscow' }), env); const j = await r.json();
ok('/api/remind — время 8:00 по Москве', j.ok && j.hh === 8 && j.tz === 'Europe/Moscow', j);
r = await W.fetch(req('/api/remind', { init: initData(6), on: true, hh: 9, tz: 'Bad/Zone' }), env); ok('кривой часовой пояс → Berlin', (await r.json()).tz === 'Europe/Berlin');
// cron: 05:00 UTC = 08:00 Москва → пользователю 5 уходит, 6 (9:00 Berlin = 07:00 UTC летом) — нет
calls.length = 0; const t = Date.UTC(2026, 9, 17, 5, 0);
await new Promise(res => W.scheduled({ scheduledTime: t }, env, { waitUntil: p => p.then(res) }));
ok('cron 08:00 МСК — напоминание пользователю 5', calls.filter(c => c[0] === 'sendMessage').map(c => c[1].chat_id).join() === '5', calls.map(c => c[1].chat_id));
calls.length = 0;
await new Promise(res => W.scheduled({ scheduledTime: t + 60e3 }, env, { waitUntil: p => p.then(res) }));
ok('второй раз в тот же день — не шлёт', calls.length === 0);
await W.fetch(req('/api/remind', { init: initData(5), on: false, hh: 8, tz: 'Europe/Moscow' }), env);
calls.length = 0; await new Promise(res => W.scheduled({ scheduledTime: t + 864e5 }, env, { waitUntil: p => p.then(res) }));
ok('выключил — на следующий день не шлёт', calls.length === 0);
blocked.add(6); calls.length = 0; await new Promise(res => W.scheduled({ scheduledTime: Date.UTC(2026, 9, 17, 7, 0) }, env, { waitUntil: p => p.then(res) }));
ok('заблокировал бота — напоминание само выключается', calls.length === 1 && JSON.parse(store.get('u:6')).on === false);
console.log(fails ? `ИТОГ: FAIL ${fails}` : 'ИТОГ: всё PASS'); process.exit(fails ? 1 : 0);
