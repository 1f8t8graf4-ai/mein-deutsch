/* «Мой немецкий» — бот (Cloudflare Worker, бесплатный план).
   Что умеет: /start с кнопкой «Открыть», кнопка меню, раз в день напоминание «5 заданий на сегодня»
   (время и вкл/выкл — из приложения, POST /api/remind).

   Настройка (Cloudflare → Workers → этот воркер → Settings):
   - Variables → Secret: BOT_TOKEN (токен из @BotFather), SETUP_SECRET (любое слово-пароль)
   - Variables → Text: APP_URL = https://1f8t8graf4-ai.github.io/mein-deutsch/
   - Bindings → KV namespace, имя привязки KV
   - Triggers → Cron: 0 * * * *  (каждый час)
   Потом открыть в браузере: https://<воркер>.workers.dev/setup?secret=<SETUP_SECRET> */

const TZ_DEF = 'Europe/Berlin';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' } });

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json().catch(() => ({ ok: false }));
}
const openBtn = (env, text) => ({ inline_keyboard: [[{ text: text || '📖 Открыть «Мой немецкий»', web_app: { url: env.APP_URL } }]] });

async function hex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? new TextEncoder().encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
}
// подпись мини-аппа: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
async function verifyInit(env, init) {
  if (!init) return null;
  const p = new URLSearchParams(init), hash = p.get('hash'); if (!hash) return null;
  p.delete('hash');
  const dcs = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n');
  const secret = await hmac('WebAppData', env.BOT_TOKEN);
  if (await hex(await hmac(secret, dcs)) !== hash) return null;
  if (Date.now() / 1000 - (+p.get('auth_date') || 0) > 30 * 86400) return null;
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
}
const hookSecret = async env => (await hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('md:' + env.BOT_TOKEN)))).slice(0, 48);

async function getU(env, id) { const s = await env.KV.get('u:' + id); return s ? JSON.parse(s) : null; }
const putU = (env, u) => env.KV.put('u:' + u.id, JSON.stringify(u));
const okTz = tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch (e) { return false; } };

async function onUpdate(env, up) {
  const m = up.message; if (!m || !m.chat || m.chat.type !== 'private') return;
  const id = m.chat.id, text = (m.text || '').trim();
  let u = await getU(env, id);
  if (!u) { u = { id, on: true, hh: 10, tz: TZ_DEF, last: '' }; await putU(env, u); }
  if (/^\/start/.test(text)) {
    return tg(env, 'sendMessage', { chat_id: id, reply_markup: openBtn(env),
      text: 'Hallo! 👋 Это твой учебник немецкого.\n\n📘 Правила — из твоих вопросов\n🗂 Слова — живой немецкий и обороты к telc B2\n🔁 Повторить — 5 заданий в день\n\nНапоминание приходит каждый день в ' + String(u.hh).padStart(2, '0') + ':00. Время и выключить — в приложении → ⚙.' });
  }
  if (/^\/remind/.test(text)) {
    return tg(env, 'sendMessage', { chat_id: id, reply_markup: openBtn(env, '⚙ Изменить в приложении'),
      text: u.on ? `Напоминание включено: каждый день в ${String(u.hh).padStart(2, '0')}:00 (${u.tz}).` : 'Напоминание выключено.' });
  }
  return tg(env, 'sendMessage', { chat_id: id, reply_markup: openBtn(env), text: 'Вопросы по немецкому задавай мне в чате с Claude — ответ появится страницей в приложении. А здесь — открыть учебник 👇' });
}

async function remindApi(req, env) {
  let b; try { b = await req.json(); } catch (e) { return json({ ok: false, err: 'bad json' }, 400); }
  const user = await verifyInit(env, b.init);
  if (!user || !user.id) return json({ ok: false, err: 'подпись не прошла' }, 403);
  const u = (await getU(env, user.id)) || { id: user.id, last: '' };
  u.on = !!b.on;
  u.hh = Math.max(0, Math.min(23, parseInt(b.hh, 10) || 10));
  if (typeof b.tz === 'string' && b.tz.length < 64 && okTz(b.tz)) u.tz = b.tz; else u.tz = u.tz || TZ_DEF;
  await putU(env, u);
  return json({ ok: true, on: u.on, hh: u.hh, tz: u.tz });
}

function local(tz, d) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  const o = {}; f.formatToParts(d).forEach(p => o[p.type] = p.value);
  return { day: `${o.year}-${o.month}-${o.day}`, hh: +o.hour };
}
async function cron(env, when) {
  const d = new Date(when || Date.now());
  let cursor, sent = 0;
  do {
    const L = await env.KV.list({ prefix: 'u:', cursor });
    for (const k of L.keys) {
      const u = JSON.parse((await env.KV.get(k.name)) || 'null'); if (!u || !u.on) continue;
      const t = local(okTz(u.tz) ? u.tz : TZ_DEF, d);
      if (t.hh !== u.hh || u.last === t.day) continue;
      const r = await tg(env, 'sendMessage', { chat_id: u.id, reply_markup: openBtn(env, '🔁 Начать'), text: '🇩🇪 Пора повторить немецкий — 5 заданий на сегодня. Пара минут!' });
      if (r && r.ok) { u.last = t.day; sent++; } else if (r && r.error_code === 403) u.on = false; // бота заблокировали
      await putU(env, u);
    }
    cursor = L.list_complete ? null : L.cursor;
  } while (cursor);
  return sent;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== await hookSecret(env)) return new Response('no', { status: 403 });
      const up = await req.json().catch(() => null);
      if (up) await onUpdate(env, up);
      return new Response('ok');
    }
    if (url.pathname === '/api/remind' && req.method === 'POST') return remindApi(req, env);
    if (url.pathname === '/setup') {
      if (!env.SETUP_SECRET || url.searchParams.get('secret') !== env.SETUP_SECRET) return new Response('нужен ?secret=…', { status: 403 });
      const res = {
        webhook: await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: await hookSecret(env), allowed_updates: ['message'] }),
        menu: await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Учебник', web_app: { url: env.APP_URL } } }),
        commands: await tg(env, 'setMyCommands', { commands: [{ command: 'start', description: 'Открыть учебник' }, { command: 'remind', description: 'Напоминание' }] }),
      };
      return json(res);
    }
    if (url.pathname === '/') {
      const okAll = !!(env.BOT_TOKEN && env.APP_URL && env.KV);
      return new Response(`Мой немецкий — бот 1.0\nТокен: ${env.BOT_TOKEN ? '✅' : '❌'}  APP_URL: ${env.APP_URL ? '✅' : '❌'}  KV: ${env.KV ? '✅' : '❌'}\n${okAll ? 'Всё подключено. Если ещё не делал — открой /setup?secret=…' : 'Не всё подключено — см. инструкцию.'}`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    return new Response('not found', { status: 404 });
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(cron(env, ev.scheduledTime)); },
};
