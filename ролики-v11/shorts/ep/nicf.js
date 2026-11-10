// Никотин v11 (nicf) — Claude Fable, 10.11.2026. Рисовка заново, один язык на весь ролик (по «ОТКРОЙ ГЛАЗА на Coca-Cola»):
//   • 3 цвета + акцент: тёмно-синий, коралловый, бумага; янтарь — только никотин и приманка; мята — только «новое время» (Стэнфорд, «Джул», яблоко);
//   • тонкая линия + плоская заливка, тень — растр точками; людей с лицами нет — силуэты и руки;
//   • сцены сменяет цветовое поле (волна, диагональ, круг из предмета), а не «переход»;
//   • через ролик идёт одна коралловая линия: дым → обводка в записке → царапины в горле → сноска в патенте → нити к школьникам → нити к руке.
// Грузится без v5/v8 — только lib.js. Весь ролик — одна лента «битов» (beat), время битов — из слов диктора (Q).
(function () {
  'use strict';
  const K = { navy: '#141A3A', navy2: '#202A5C', navy3: '#2E3A78', coral: '#EF4B5B', coral2: '#C9354A', paper: '#F6F0E6', paper2: '#DDD3C4',
    amber: '#FFB238', amber2: '#E08A12', mint: '#5FD3B3', mint2: '#2FA98A', ink: '#0B0F26' };
  P = { bg: K.navy, paper: K.paper, ink: K.ink, line: K.paper, a1: K.amber, a2: K.coral };
  const MONO = "FreeMono,'Liberation Mono','DejaVu Sans Mono',monospace";
  window.CUES = window.CUES || {};
  function cue(t0, name, gain = 1, pan = 0) {
    if (!(t0 >= 0) || !name) return;
    const k = name + '@' + Math.round(t0 * 40);
    if (!(k in CUES)) CUES[k] = [Math.round(t0 * 1000) / 1000, name, Math.round(gain * 100) / 100, Math.round(clamp(pan, -1, 1) * 100) / 100];
  }
  const D = {}, B = [];
  let Q = null;

  // ---------- азбука ----------
  const bgc = c => `<rect x="-600" y="-600" width="2280" height="3120" fill="${c}"/>`;
  const ln = (d, k = 1, c = K.paper, w = 6, o = {}) => line(d, k, Object.assign({ c, w }, o));
  const sh = (d, f, c = K.paper, w = 6) => fill(d, f) + ln(d, 1, c, w);
  const ht = (d, n = 'ink', op = .3, tr = '') => `<path d="${d}" fill="url(#ht_${n})" opacity="${op}"${tr ? ` transform="${tr}"` : ''}/>`;
  function clip(d, inner, tr = '') { const id = uid(); return `<clipPath id="${id}"><path d="${d}"${tr ? ` transform="${tr}"` : ''}/></clipPath><g clip-path="url(#${id})">${inner}</g>` }
  const defs = () => ['paper', 'navy', 'ink', 'coral', 'amber', 'navy3'].map(n => `<pattern id="ht_${n}" width="17" height="17" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="8.5" cy="8.5" r="3.3" fill="${K[n]}"/></pattern>`).join('');
  const hexD = (r, cx = 0, cy = 0) => D_.poly([...Array(6)].map((_, i) => { const a = (-90 + i * 60) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] }));
  const pop = (t, t0, d = .45) => { const k = P01(t, t0, d); return k <= 0 ? 0 : EZ.back(k) };
  const lab = (s, x, y, c = K.paper, sz = 34, o = {}) => tx(s, x, y, Object.assign({ f: 'O', w: 500, s: sz, c, ls: 6 }, o));
  const big = (s, x, y, c = K.paper, sz = 150, o = {}) => tx(s, x, y, Object.assign({ f: 'U', w: 800, s: sz, c }, o));
  // кусок пути длиной seg, который едет по пути (жидкость в трубке, искра по нити)
  function flow(d, k, c, w = 8, seg = 70) { if (k <= 0 || k >= 1) return ''; const L0 = plen(d); return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${seg} ${R(L0 + seg)}" stroke-dashoffset="${R(seg - k * (L0 + seg))}"/>` }
  // дым: живая линия вверх от точки
  function smokeD(x, y, len, t, amp = 30, dx = 0, n = 26) {
    let d = `M${R(x)} ${R(y)}`;
    for (let i = 1; i <= n; i++) { const u = i / n; d += `L${R(x + dx * u * u + Math.sin(i * .55 - t * 2.4) * amp * u)} ${R(y - len * u)}` }
    return d
  }

  // ---------- цветовые поля (смена сцен) ----------
  function fieldD(kind, k, o = {}) {
    if (kind === 'circ') return D_.circ(o.x ?? 540, o.y ?? 800, 2300 * k);
    if (kind === 'diag') { const x = lerp(-900, 2300, k); return D_.poly([[-1500, -200], [x, -200], [x - 760, 2120], [-1500, 2120]]) }
    const up = kind === 'up', y = up ? lerp(H + 170, -170, k) : lerp(-170, H + 170, k), ph = (o.ph || 0) + k * 3;
    let d = up ? `M-80 ${H + 300}L-80 ${R(y)}` : `M-80 -300L-80 ${R(y)}`;
    for (let x = -80; x <= 1160; x += 62) d += `L${x} ${R(y + Math.sin(x / 1080 * 6.6 + ph) * 78)}`;
    return d + (up ? `L1160 ${H + 300}Z` : 'L1160 -300Z')
  }
  function reveal(tr, k, inner) {
    const e = EZ.io(k), lead = clamp(e + .11 * Math.sin(Math.PI * k));
    return (tr.band ? fill(fieldD(tr.kind, lead, tr), tr.band) : '') + clip(fieldD(tr.kind, e, tr), inner)
  }
  const beat = (a, draw, tr) => B.push({ a, draw, tr });
  function frame(t) {
    let i = 0; while (i < B.length - 1 && t >= B[i + 1].a) i++;
    const b = B[i]; let out = b.draw(t);
    if (i && b.tr && b.tr.kind) { const k = (t - b.a) / (b.tr.d || .6); if (k < 1) out = B[i - 1].draw(t) + reveal(b.tr, k, out) }
    return out
  }
  // камера: медленный наезд, чтобы кадр не стоял
  const cam = (inner, t, a, o = {}) => g(inner, about(o.x ?? 540, o.y ?? 800, 1 + (o.z ?? .05) * clamp((t - a) / (o.d ?? 5))));

  // ---------- предметы ----------
  const VB = D_.rr(-85, -190, 170, 430, 50), VM = 'M-54 -186L-44 -238C-44 -254 44 -254 44 -238L54 -186Z';
  // одноразка: o.x — 0…1 «рентген» (янтарь уходит, внутри виден кристалл соли)
  function vape(x, y, s = 1, r = 0, o = {}) {
    const xr = o.x || 0, c = o.c || K.paper;
    let q = sh(VM, o.mouth || K.navy3, c, 6) + fill(VB, o.f || K.amber);
    if (xr > 0) q += fill(VB, o.in || K.navy2, xr);
    q += clip(VB, ht(D_.rr(15, -200, 90, 450, 0), xr > .5 ? 'navy3' : 'ink', .3)) + ln(VB, 1, c, 6);
    if (xr < 1) q += g(ln('M-50 -130V70', 1, K.paper, 7) + `<circle cx="0" cy="196" r="9" fill="${K.paper}"/>`, '', 1 - xr);
    if (xr > 0) q += g(ln(D_.rr(-56, -120, 112, 270, 26), 1, K.paper, 4, { da: '10 12', op: .7 }) + crystal(0, 20, .5 * pop(xr, .3, .7)), '', xr);
    return g(q, at(x, y, s, r))
  }
  // кристалл соли: кубик в изометрии, внутри янтарное ядро — никотин
  function crystal(x, y, s = 1, o = {}) {
    if (s <= 0) return '';
    const q = fill(hexD(100), o.f || K.paper) + clip(hexD(100), ht('M0 0L0 100L86.6 50L86.6 -50Z', o.dot || 'navy', .32)) +
      ln('M0 0L0 100M0 0L86.6 -50M0 0L-86.6 -50', 1, o.l || K.navy, 5) + fill(hexD(34, 0, 0), o.core || K.amber) + (o.c ? ln(hexD(100), 1, o.c, 6) : '');
    return g(q, at(x, y, s, o.r || 0))
  }
  // сигарета (горизонтально, фильтр справа, уголёк слева)
  function cig(x, y, s = 1, r = 0, o = {}) {
    const body = D_.rr(-300, -34, 470, 68, 8), filt = D_.rr(150, -34, 150, 68, 12);
    const q = fill(body, K.paper) + fill(filt, o.filt || K.amber) + clip(filt, ht(D_.rr(150, 0, 150, 40, 0), 'ink', .3)) + clip(body, ht(D_.rr(-300, 4, 470, 34, 0), 'navy', .16)) +
      ln('M150 -34V34M178 -34V34', 1, o.c || K.navy, 4, { op: .5 }) + fill(D_.rr(-318, -34, 34, 68, 10), o.ember || K.navy) + fill(D_.rr(-318, -34, 14, 68, 7), K.amber);
    return g(q, at(x, y, s, r))
  }
  const MEMO = ['ЧТОБЫ ВЫЖИТЬ,', 'МЫ ДОЛЖНЫ ПОЛУЧИТЬ', 'СВОЮ ДОЛЮ', 'МОЛОДЁЖНОГО РЫНКА.'], MEMO_N = MEMO.join('').length;
  // записка 1973: o.n — сколько букв напечатано, o.ring — обводка 0…1, o.st — время штампа (или true)
  function memo(x, y, s = 1, r = 0, o = {}, t = 0) {
    const w = 560, h = 700; let n = o.n ?? 1e9;
    let q = fill(D_.rr(-w / 2 + 18, -h / 2 + 20, w, h, 6), K.ink, .5) + fill(D_.rr(-w / 2, -h / 2, w, h, 6), K.paper) +
      clip(D_.rr(-w / 2, -h / 2, w, h, 6), ht(D_.poly([[w / 2 - 200, h / 2], [w / 2, h / 2 - 260], [w / 2, h / 2]]), 'navy', .14));
    q += tx('R.J. REYNOLDS TOBACCO CO.', -w / 2 + 44, -h / 2 + 74, { f: MONO, w: 700, s: 25, c: K.navy, a: 'start', op: .8 }) +
      tx('2 ФЕВРАЛЯ 1973', -w / 2 + 44, -h / 2 + 110, { f: MONO, w: 700, s: 25, c: K.navy, a: 'start', op: .8 }) + ln(`M${-w / 2 + 44} ${-h / 2 + 140}H${w / 2 - 44}`, 1, K.navy, 3, { op: .5 });
    MEMO.forEach((s0, i) => { const m = Math.max(0, Math.min(s0.length, Math.floor(n))); n -= s0.length; if (m > 0) q += tx(s0.slice(0, m), -w / 2 + 44, -h / 2 + 262 + i * 92, { f: MONO, w: 700, s: 41, c: K.ink, a: 'start' }) });
    const yy = -h / 2 + 250 + 3 * 92;
    if (o.ring > 0) q += ln(`M-248 ${yy - 40}C-120 ${yy - 78} 180 ${yy - 74} 256 ${yy - 22}C300 ${yy + 22} 150 ${yy + 56} -40 ${yy + 54}C-200 ${yy + 52} -300 ${yy + 30} -262 ${yy - 30}C-250 ${yy - 50} -200 ${yy - 62} -150 ${yy - 66}`, o.ring, K.coral, 8);
    if (o.st != null) q += stamp('СЕКРЕТНО', w / 2 - 150, -h / 2 + 96, t, o.st === true ? -9 : o.st, { c: K.coral, s: 50, r: 9, ls: 5 });
    return g(q, at(x, y, s, r))
  }
  // профиль (смотрит вправо), рот — (200,133); AIR — путь воздуха от рта в грудь
  const PROF = 'M-70 320V170C-150 130 -200 40 -190 -60C-178 -180 -80 -250 30 -240C130 -230 190 -160 190 -70C190 -50 188 -34 184 -20C200 10 222 44 232 64C238 76 230 84 216 84L196 86C198 98 200 110 196 120C206 128 204 140 194 146C198 168 190 190 166 196C140 202 110 200 86 196V320Z';
  const SHOULD = 'M-380 760C-380 500 -250 360 -70 316H86C230 350 330 480 330 760Z';
  const AIR = 'M214 133C150 136 96 140 62 172C34 200 20 250 14 330C10 420 10 520 10 640';
  function head(x, y, s, o = {}, t = 0) {
    const f = o.f || K.coral, ch = o.ch || K.navy;
    let q = fill(SHOULD, o.f2 || f) + clip(SHOULD, ht('M-380 760V300H330V760Z', o.dot || 'ink', .22)) + fill(PROF, f) + clip(PROF, ht('M-260 -260H-20L-90 330H-260Z', o.dot || 'ink', .2));
    q += ln(AIR, 1, ch, 40) + (o.air || '') + fill('M-196 -40C-200 -190 -90 -262 30 -250C120 -242 176 -190 190 -120C120 -170 40 -176 -30 -150C-80 -130 -96 -60 -110 40C-150 30 -190 0 -196 -40Z', o.hair || K.ink) + (o.eye ? fill(D_.ell(118, -52, 13, o.eye), o.hair || K.ink) + ln('M92 -86L146 -80', 1, o.hair || K.ink, 7) : '');
    return g(q, at(x, y, s, o.r || 0))
  }
  function zig(d, amp, n = 34) { const p = pts(d, n + 1); let s = ''; for (let i = 0; i < p.length; i++) { const a = p[Math.min(i + 1, p.length - 1)], b = p[Math.max(i - 1, 0)], dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1, o = i % 2 ? amp : -amp; s += (i ? 'L' : 'M') + R(p[i][0] - dy / l * o) + ' ' + R(p[i][1] + dx / l * o) } return s }
  const BUST = 'M-120 170C-120 90 -80 55 -38 48C-68 28 -78 -9 -73 -40C-63 -103 63 -103 73 -40C78 -9 68 28 38 48C80 55 120 90 120 170Z';
  // колба: круглая, с горлом вверх; lv — уровень 0…1
  function flask(x, y, r, o = {}) {
    const d = `M${-r * .26} ${-r * 1.9}V${-r * .96}A${r} ${r} 0 1 0 ${r * .26} ${-r * .96}V${-r * 1.9}`, body = D_.circ(0, 0, r);
    let q = '';
    if (o.lv > 0) q += clip(body, fill(D_.rr(-r, r - 2 * r * o.lv, 2 * r, 2 * r, 0), o.liq || K.amber) + ht(D_.rr(0, -r, r, 2 * r, 0), 'ink', .22));
    q += ln(d, o.k ?? 1, o.c || K.paper, 6) + ln(`M${-r * .4} ${-r * 1.9}H${r * .4}`, o.k ?? 1, o.c || K.paper, 6);
    return g(q, at(x, y, 1, o.r || 0))
  }

  // ---------- по всем 13 оригиналам (10.11): герой с лицом, руки «в костюме», место действия контуром на фоне ----------
  const SKIN = '#F4C7A1', SKIN2 = '#DDA57C';
  // подросток по плечи, лицом к зрителю: o.h — худи, o.look — зрачки [-1…1, -1…1], o.m — рот: 0 ровно, 1 улыбка, -1 «о»
  function teen(x, y, s = 1, o = {}) {
    const body = 'M-200 330C-200 205 -135 152 -62 138H62C135 152 200 205 200 330Z', hd = D_.rr(-92, -124, 184, 214, 86), lk = o.look || [0, 0];
    let q = fill(body, o.h || K.coral) + clip(body, ht('M0 100H210V340H0Z', 'ink', .22)) + ln('M-26 150V214M26 150V214', 1, K.paper, 5, { op: .8 });
    q += fill(D_.rr(-36, 56, 72, 100, 20), SKIN2) + fill(D_.circ(-94, 0, 20), SKIN) + fill(D_.circ(94, 0, 20), SKIN) + fill(hd, SKIN) + clip(hd, ht('M20 -130H100V100H20Z', 'coral', .16));
    q += fill('M-100 -30C-112 -150 -34 -178 28 -168C102 -158 114 -92 100 -24C84 -66 44 -98 -18 -94C-58 -90 -84 -66 -100 -30Z', o.hair || K.ink);
    q += `<circle cx="${R(-36 + lk[0] * 5)}" cy="${R(-6 + lk[1] * 4)}" r="9" fill="${K.ink}"/><circle cx="${R(36 + lk[0] * 5)}" cy="${R(-6 + lk[1] * 4)}" r="9" fill="${K.ink}"/>` + ln('M-52 -34L-22 -30M22 -30L52 -34', 1, K.ink, 5) + ln('M2 4L-8 30L6 32', 1, SKIN2, 5);
    q += o.m === -1 ? fill(D_.ell(0, 60, 11, 13), K.ink) : ln(o.m === 1 ? 'M-20 54C-8 66 8 66 20 54' : 'M-18 58H18', 1, K.ink, 5);
    return g(q, at(x, y, s, o.r || 0))
  }
  // лицо для маленьких силуэтов BUST: волосы и глаза
  const face = (hair = K.ink) => fill('M-75 -42C-72 -110 72 -110 75 -42C52 -76 -52 -76 -75 -42Z', hair) + `<circle cx="-24" cy="-28" r="6" fill="${K.ink}"/><circle cx="24" cy="-28" r="6" fill="${K.ink}"/>`;
  // рука в костюме ставит штамп: опускается к t0, уходит вверх. (x, y) — куда бьёт
  function stamper(x, y, t, t0) {
    const dn = EZ.i(P01(t, t0 - .34, .34)), up = EZ.io(P01(t, t0 + .16, .45)); if (dn <= 0 || up >= 1) return '';
    const q = sh('M40 -1100L300 -1100L196 -168L16 -190Z', K.ink, K.paper, 6) + sh('M12 -252L200 -230L188 -158L6 -180Z', K.paper, K.navy, 5) + sh(D_.rr(-36, -120, 150, 80, 20), K.coral2, K.navy, 6) +
      sh(D_.rr(-74, -204, 236, 150, 62), SKIN, K.navy, 6) + ln('M-30 -150H110M-30 -110H110', 1, K.navy, 5, { op: .5 }) + sh(D_.rr(-96, -46, 270, 46, 10), K.navy, K.paper, 5);
    return g(q, at(x, y - 1000 * (1 - dn) - 1000 * up, 1, 0))
  }
  // место действия тонким контуром на фоне (как кирпичи и облака у Starbucks и Хованского)
  function ghost(kind, c = K.navy3, op = .55) {
    let d = '';
    if (kind === 'bricks') for (let i = 0; i < 16; i++) { const x = rnd(i) * 1000, y = 180 + rnd(i + 40) * 1500, w = 70 + rnd(i + 9) * 50; d += `M${R(x)} ${R(y)}h${R(w)}v34h${R(-w)}Z` + (i % 2 ? `M${R(x + w + 12)} ${R(y)}h${R(w * .6)}v34h${R(-w * .6)}Z` : '') }
    if (kind === 'blinds') { for (let i = 0; i < 10; i++) d += `M70 ${210 + i * 44}H420`; d += 'M50 180H440V660H50ZM650 1260h380M700 1260v-150h280v150M840 1110v-60' }
    if (kind === 'lockers') for (let i = 0; i < 6; i++) d += `M${40 + i * 200} 400V1700M${90 + i * 200} 470h80M${90 + i * 200} 500h80M${90 + i * 200} 530h80M${196 + i * 200} 900v60`;
    if (kind === 'tiles') { for (let i = 1; i < 6; i++) d += `M${i * 180} 0V1920`; for (let i = 1; i < 11; i++) d += `M0 ${i * 180}H1080` }
    if (kind === 'shelves') for (let i = 0; i < 2; i++) d += `M60 ${762 + i * 520}H1020M60 ${780 + i * 520}H1020M90 ${780 + i * 520}v40M990 ${780 + i * 520}v40`;
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity="${op}"/>`
  }

  // ================= БИТЫ =================
  // 1. Завязка: одноразка → миллиард точек → рентген: внутри соль → год катится назад
  function bHook(t) {
    const q = Q, xr = E(t, q.xray, .6), yr = P01(t, q.y50 - .15, 1.1), vx = 540;
    let s = bgc(K.navy) + fill(D_.circ(540, 860, 470 * (1 + .5 * xr)), K.navy2);
    const sc = lerp(1.3, 1.75, xr), rot = lerp(-9, 0, xr), vy = lerp(900, 860, xr) + 130 * EZ.io(yr), hk = 1500 * EZ.i(xr);
    // нити сверху — с первого кадра: кто-то держит (те же, что в финале)
    const so = clamp(t / .25) * (1 - xr), sway = wob(t, .35, 10);
    if (so > 0) [[-90, 330, 680], [10, 150, 770], [110, 420, 830]].forEach(([dx, hy, x0]) => { s += ln(`M${x0} -120C${x0 + sway} 300 ${vx + dx - sway} 400 ${vx + dx} ${900 + hy + hk}`, 1, K.coral, 6, { op: so }) });
    if (xr < 1 && window.NICF2H) s += g(NICF2H.back(), at(580, 920 + hk, 1.25, 0));
    s += vape(vx, vy, sc, rot, { x: xr });
    if (xr < 1 && window.NICF2H) s += g(NICF2H.front(), at(580, 920 + hk, 1.25, 0));
    if (xr > .05) { const pk = (t * .9) % 1; s += `<circle cx="540" cy="${R(vy + 35)}" r="${R(60 + pk * 190)}" fill="none" stroke="${K.amber}" stroke-width="5" opacity="${R(xr * (1 - pk) * .8)}"/>` }
    const to = 1 - xr;
    if (to > 0) s += g(lab('ЧТО ВЫ ЗНАЕТЕ О', 540, 352, K.paper, 44, { ls: 12 }) + big('НИКОТИНЕ?', 540, 468, K.paper, 104), '', to);
    if (yr > 0) s += g(odo(lerp(2026, 1973, EZ.io(yr)), 540, 470, { f: 'U', w: 800, s: 190, sep: '', c: K.paper }), `translate(0 ${R(-40 * (1 - EZ.o(P01(yr, 0, .25))))})`, clamp(yr * 5));
    cue(q.xray, 'shimmer', .5); cue(q.y50, 'tick', .5); cue(q.y50 + .3, 'tick', .5); cue(q.y50 + .6, 'tick', .5);
    return s
  }
  // 2. «В табачной компании. Для молодых.» — коралл, сигарета больше кадра, дым тянется к трём силуэтам
  function bTob(t) {
    const q = Q, a = q.tob, k = E(t, a, .8, 'o'), m = 0;
    let s = bgc(K.coral) + ghost('bricks', K.coral2, .7) + fill(D_.circ(760, 760, 430), K.coral2) + ht(D_.circ(760, 760, 430), 'ink', .16);
    s += big('1973', 540, 470, K.navy, 190);
    const cx = lerp(1500, 640, k), cy = 800 - 60 * m;
    s += ln(smokeD(cx - 318 * 1.7 * Math.cos(-.14) - 0, cy + 318 * 1.7 * Math.sin(.14) - 30, 520, t, 40, -120 - 260 * m), E(t, a + .4, 1.2), K.paper, 8);
    s += cig(cx, cy, 1.7, -8, { ember: K.navy });
        cue(a, 'wave', .7);
    return cam(s, t, a, { z: .06, d: 3 })
  }
  // 3. Записка: лист въезжает, машинка печатает цитату, обводка — та самая красная линия
  function bMemo(t) {
    const q = Q, a = q.memo, k = E(t, q.rey - .25, .7, 'o'), n = MEMO_N * P01(t, q.quote + .05, Math.max(.8, q.quoteE - q.quote - .9)), rk = E(t, q.molR - .1, .7), zi = E(t, q.molR - .2, 1.2);
    let s = bgc(K.navy) + fill(D_.poly([[-200, 1500], [1280, 900], [1280, 2200], [-200, 2200]]), K.navy2) + ht(D_.poly([[-200, 1500], [1280, 900], [1280, 1100], [-200, 1700]]), 'ink', .3);
    s += g(ghost('blinds'), '', 1 - zi) + g(big('1973', 540, 420, K.coral, 190), '', 1 - zi);
    const mm = memo(lerp(1500, 540, k), lerp(700, 880, k), 1.22, lerp(16, -3, k), { n: t < q.quote ? 0 : n, ring: rk, st: q.sekr }, t);
    s += g(mm, about(540, 1010, 1 + .32 * zi) + ` translate(0 ${R(-150 * zi)})`);
    s += stamper(700, 610, t, q.sekr);
    cue(q.rey - .25, 'swish', .6); cue(q.sekr, 'stamp', .9);
    for (let i = 0; i < 9; i++) cue(q.quote + .1 + i * (q.quoteE - q.quote - 1) / 9, 'tick', .3, (i % 3 - 1) * .3);
    cue(q.molR - .1, 'quill', .6);
    return s
  }
  // 4. «Дым дерёт горло»: профиль, дым входит в рот и царапает
  function bHarsh(t) {
    const q = Q, a = q.harsh, k1 = E(t, a + .1, .8, 'io'), k2 = E(t, q.deret - .25, .6), shk = Math.sin(t * 46) * 7 * P01(t, q.deret, .12) * (1 - P01(t, q.deret + .5, .4));
    let s = bgc(K.navy) + fill(D_.circ(380, 900, 620), K.navy2) + ghost('bricks');
    const hx = 400 + shk, hy = 760, sc = 1.42;
    const inD = 'M1200 160C900 60 760 330 620 240C480 150 330 128 214 133';
    const air = ln(zig(AIR, 15), k2, K.coral, 9) + (k2 > .2 ? [0, 1, 2, 3].map(i => { const p = pts(AIR, 30)[8 + i * 5], kk = pop(t, q.deret + i * .07, .3); return kk > 0 ? ln(D_.star(p[0], p[1], 34 * kk, 12 * kk, 6, i * 17), 1, K.coral, 5) : '' }).join('') : '');
    s += head(hx, hy, sc, { air, eye: k2 > .5 ? 4 : 14 }, t);
    s += g(ln(inD, k1, K.paper, 8), at(hx, hy, sc));
    if (k2 > .3) for (let i = 0; i < 5; i++) { const kk = P01(t, q.deret + .05 + i * .05, .35), ang = (-50 + i * 25) * Math.PI / 180, x0 = hx + 250 * sc * .62 + 40, y0 = hy + 250; if (kk > 0 && kk < 1) s += ln(`M${R(x0 + Math.cos(ang) * (60 + kk * 60))} ${R(y0 + Math.sin(ang) * (60 + kk * 60))}L${R(x0 + Math.cos(ang) * (110 + kk * 90))} ${R(y0 + Math.sin(ang) * (110 + kk * 90))}`, 1, K.coral, 7, { op: 1 - kk }) }
    cue(a + .1, 'puff', .5); cue(q.deret - .05, 'zap', .6);
    return cam(s, t, a, { z: .05, d: 3, x: 400 })
  }
  // 5. Лаборатория: никотин + кислота → по трубкам → кристалл соли
  function bLab(t) {
    const q = Q, a = q.lab, dk = E(t, a + .05, .9, 'o'), f1 = P01(t, q.nik - .15, .9), f2 = P01(t, q.kis - .35, .9), mix = E(t, q.kis + .15, .6), out = E(t, q.salt - .25, .7);
    let s = bgc(K.navy) + fill(D_.poly([[-200, -200], [1280, -200], [1280, 420], [-200, 980]]), K.navy2) + ghost('tiles', K.navy3, .3);
    const L1 = 'M270 640V720C270 800 330 820 420 820H470C520 820 540 846 540 890V930', L2 = 'M810 640V720C810 800 750 820 660 820H610C560 820 540 846 540 890V930';
    let gl = flask(270, 540, 100, { lv: .62 * (1 - f1 * .7), liq: K.amber, k: dk }) + flask(810, 540, 100, { lv: .62 * (1 - f2 * .7), liq: K.paper, k: dk }) +
      ln(L1, dk, K.paper, 6) + ln(L2, dk, K.paper, 6) + flow(L1, f1, K.amber, 12, 90) + flow(L2, f2, K.paper, 12, 90) + flask(540, 1110, 150, { lv: .15 + .5 * Math.max(f1, f2) * (1 - mix * .4), liq: mix > .5 ? K.paper2 : K.amber2, k: dk, c: K.paper }) +
      g(lab('НИКОТИН', 270, 300, K.amber, 36) + lab('КИСЛОТА', 810, 300, K.paper, 36), '', dk);
    // горелка
    const fl = 1 + wob(t, 3.1, .08);
    gl += g(fill(D_.drop(540, 1345, 46 * fl), K.coral) + fill(D_.drop(540, 1358, 22 * fl), K.amber) + ln('M450 1420H630', 1, K.paper, 6), '', dk);
    s += g(gl, about(540, 1110, 1 + .1 * out), 1 - out * .85);
    const cp = pop(t, q.kis + .2, .5), cs = lerp(.75, 2.1, out), cyy = lerp(1130, 800, out);
    if (cp > 0) { s += crystal(540, cyy, cs * cp, { r: lerp(0, 0, out) }); const pk = P01(t, q.kis + .2, .7); if (pk < 1) s += `<circle cx="540" cy="${cyy}" r="${R(90 + pk * 380)}" fill="none" stroke="${K.paper}" stroke-width="${R(10 * (1 - pk))}"/>` }
    if (out > .3) s += big('СОЛЬ', 540, 1180, K.paper, 110, { op: (out - .3) / .7, ls: 16 });
    cue(a + .05, 'drip', .5, -.4); cue(q.kis - .3, 'drip', .5, .4); cue(q.kis + .2, 'ding', .8); cue(q.salt - .25, 'whoosh', .4);
    return s
  }
  // 6. «Не дерёт даже в огромной дозе»: светлая сцена, тот же профиль, линия идёт гладко, шкала дозы растёт
  function bSmooth(t) {
    const q = Q, a = q.smooth, k1 = E(t, a + .15, 1.0), dz = E(t, q.doza - .9, 1.3, 'io');
    let s = bgc(K.paper) + fill(D_.circ(380, 900, 620), K.paper2) + ht(D_.circ(380, 900, 620), 'navy', .1);
    const air = ln(AIR, k1, K.amber, 12) + flow(AIR, (t * .8) % 1, K.paper, 6, 40);
    s += head(330, 780, 1.36, { f: K.navy, ch: K.navy3, dot: 'navy3', air, hair: K.coral, eye: 14 }, t);
    s += g(ln('M1200 160C900 60 760 330 620 240C480 150 330 128 214 133', 1, K.amber, 12), at(330, 780, 1.36));
    const bx = 960, by0 = 1180, bh = 760;
    s += fill(D_.rr(bx - 34, by0 - bh, 68, bh, 34), K.paper2) + clip(D_.rr(bx - 34, by0 - bh, 68, bh, 34), fill(D_.rr(bx - 34, by0 - bh * (.12 + .88 * dz), 68, bh, 0), K.amber) + ht(D_.rr(bx, by0 - bh, 34, bh, 0), 'ink', .2)) + ln(D_.rr(bx - 34, by0 - bh, 68, bh, 34), 1, K.navy, 6);
    for (let i = 1; i < 8; i++) s += ln(`M${bx + 50} ${by0 - bh * i / 8}h${i % 2 ? 22 : 36}`, 1, K.navy, 5);
    s += lab('ДОЗА', bx, by0 + 60, K.navy, 36);
    cue(q.doza - .9, 'whirr', .45, .5);
    return cam(s, t, a, { z: .05, d: 3.5, x: 400 })
  }
  // 7. Тридцать вариантов — один пахнет зелёным яблоком
  const APPLE = 'M0 -70C-40 -110 -130 -90 -130 0C-130 80 -70 130 -30 120C-12 116 -6 110 0 110C6 110 12 116 30 120C70 130 130 80 130 0C130 -90 40 -110 0 -70Z';
  function bTubes(t) {
    const q = Q, a = q.tubes, one = E(t, q.odin - .1, .5), ap = pop(t, q.yabl - .35, .55);
    let s = bgc(K.navy) + fill(D_.poly([[-200, 2200], [-200, 1250], [1280, 700], [1280, 2200]]), K.navy2) + ghost('tiles', K.navy3, .3);
    const cnt = 30 * P01(t, a + .15, Math.max(.6, q.t30 - a + .1)), HOT = 17;
    for (let i = 0; i < 30; i++) {
      const c = i % 6, r = Math.floor(i / 6), x = 165 + c * 150, y = 560 + r * 172, p = pop(cnt, i, 1.2); if (p <= 0) continue;
      const tube = 'M-26 -62V34A26 26 0 0 0 26 34V-62', inn = 'M-26 -20V34A26 26 0 0 0 26 34V-20Z', hot = i === HOT;
      const lq = hot ? [K.amber, K.mint][one > .5 ? 1 : 0] : K.amber, dim = hot ? 1 : 1 - .72 * one;
      s += g(fill(inn, lq, hot ? 1 : .9) + ht('M0 -20H26V60H0Z', 'ink', .25) + ln(tube, 1, K.paper, 5) + ln('M-34 -62H34', 1, K.paper, 5), at(x, y + (hot ? -14 * one : 0), p * (hot ? 1 + .25 * one : 1)), dim);
    }
    s += g(odo(Math.min(30, cnt), 540, 400, { f: 'U', w: 800, s: 170, sep: '', c: K.paper }), '', 1 - one);
    if (ap > 0) {
      const hx = 165 + (HOT % 6) * 150, hy = 560 + Math.floor(HOT / 6) * 172;
      s += ln(`M${hx} ${hy - 90}C${hx + 30} ${hy - 200} ${hx - 150} ${hy - 300} 560 560`, E(t, q.yabl - .45, .5), K.mint, 6, { da: '4 16' });
      s += g(fill(APPLE, K.mint) + clip(APPLE, ht('M0 -120H140V140H0Z', 'ink', .22)) + ln('M0 -70C4 -110 20 -130 40 -140', 1, K.paper, 7) + fill(D_.leaf(10, -112, 80, 26, -30), K.mint2), at(540, 450, 1.15 * ap, wob(t, .5, 3)));
    }
    cue(a + .2, 'scuttle', .4); cue(q.odin - .05, 'ding', .5); cue(q.yabl - .35, 'chomp', .5);
    return cam(s, t, a, { z: .04, d: 4 })
  }

  // Шкала времени сверху — держит зрителя, как счётчик затяжек у klin_situation: в завязке отматывается с «сейчас» в 1973 и идёт обратно к «сейчас».
  const YEARS = ['1973', '1979', '1998', '2005', '2015', '2019', 'СЕЙЧАС'];
  let HUDK = null;
  function hud(t) {
    if (!HUDK) return '';
    let p = HUDK[0][1];
    for (let i = 0; i < HUDK.length - 1; i++) { const [a, pa] = HUDK[i], [b, pb] = HUDK[i + 1]; if (t >= a) p = t >= b ? pb : lerp(pa, pb, EZ.io((t - a) / (b - a))) }
    const x0 = 120, x1 = 960, y = 222, x = lerp(x0, x1, p), lb = YEARS[Math.round(p * 6)], w = tw(lb, { f: 'O', w: 700, s: 32, ls: 2 }) + 40, cx = clamp(x, x0 + w / 2 - 30, x1 - w / 2 + 30);
    let s = fill(D_.rr(60, 176, 960, 92, 46), K.ink, .85) + ln(`M${x0} ${y}H${x1}`, 1, K.paper, 4, { op: .3 }) + ln(`M${x0} ${y}H${R(x)}`, 1, K.coral, 6);
    for (let i = 0; i < 7; i++) s += `<circle cx="${R(lerp(x0, x1, i / 6))}" cy="${y}" r="7" fill="${i / 6 <= p + .001 ? K.coral : K.navy3}"/>`;
    return s + fill(D_.rr(cx - w / 2, y - 27, w, 54, 27), K.coral) + tx(lb, cx, y + 11, { f: 'O', w: 700, s: 32, c: K.paper, ls: 2 })
  }

  D._ = frame;
  window.NICF = { SKIN, SKIN2, teen, face, stamper, ghost, K, B, beat, frame, cue, bgc, ln, sh, ht, clip, hexD, pop, lab, big, flow, smokeD, cam, vape, crystal, cig, memo, head, flask, BUST, PROF, MONO, AIR, zig, APPLE,
    beats: { bHook, bTob, bMemo, bHarsh, bLab, bSmooth, bTubes }, setQ: q => { Q = q }, getQ: () => Q };
  window.EP = {
    P, D, clean: true, lead: .1, tr: {}, trDef: 'cut',
    cap: { size: 54, top: 1370, font: 'U', hi: K.amber, st: K.ink },
    over: t => hud(t),
    defs,
    init(tl, SC) {
      const T = {}; SC.forEach(S => { T[S.key] = S.T; D[S.key] = frame });
      const c = (k, w, n = 0) => T[k].c(w, n);
      Q = {
        xray: T.hook.a + .75, y50: c('hook', 'пятьдесят'), tob: T.hook.s(1), memo: c('hook', 'секретной') - .05, sekr: c('hook', 'записке') + .2,
        quote: c('memo', 'Чтобы'), quoteE: T.memo.se(0), molR: c('memo', 'молодёжного'),
        harsh: T.harsh.s(0), deret: c('harsh', 'дерёт'),
        lab: T.lab.s(0), nik: c('lab', 'никотин'), kis: c('lab', 'кислотой'), salt: T.lab.s(1), smooth: c('lab', 'не', 0), doza: c('lab', 'дозе'), tubes: T.lab.s(2), yabl: c('lab', 'яблоком'),
      };
      Q.rey = Q.memo + .3; Q.t30 = Q.tubes + .6; Q.odin = c('lab', 'образец') + .15;
      const ce = document.getElementById('cap'); ce.style.textTransform = 'uppercase';  // субтитры как у TikTok-примеров: крупно, капсом
      B.length = 0;
      beat(0, bHook);
      beat(Q.tob - .12, bTob, { kind: 'up', band: K.paper, d: .5 });
      beat(Q.memo, bMemo, { kind: 'diag', band: K.navy3, d: .45 });
      beat(Q.harsh - .1, bHarsh, { kind: 'up', band: K.coral, d: .6 });
      beat(Q.lab - .1, bLab, { kind: 'diag', band: K.coral, d: .6 });
      beat(Q.smooth - .15, bSmooth, { kind: 'circ', band: K.amber, d: .6, x: 540, y: 800 });
      beat(Q.tubes - .1, bTubes, { kind: 'up', band: K.amber, d: .6 });
      if (window.NICF2) window.NICF2(T, Q);
      const st = [[Q.y50 + 1.0, 0], [Q.s79 + .3, 1], [Q.archA + 1.6, 2], [Q.stud + .5, 3], [Q.juul + .6, 4], [Q.chetv - .6, 5], [Q.you + .5, 6]];
      HUDK = [[0, 1], [Q.y50 - .1, 1]]; st.forEach(([tt, i], j) => { if (j) HUDK.push([tt - .6, (i - 1) / 6]); HUDK.push([tt, i / 6]) });
    }
  };
})();
