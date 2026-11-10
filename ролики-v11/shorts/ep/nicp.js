// v12 — рисовка «место с глубиной» (Claude Fable, 10.11 вечер). Отзыв Андрея на v11.3: «анимация далека от первоисточника».
// У оригиналов каждая фраза — нарисованное место (магазин, кабинет, лаборатория), свет и тени, руки что-то делают, камера едет.
// Здесь: 1) у каждой эпохи свой мир одного тона: 1973 — бордо, архив — тёмно-синий, 2015 — бирюза; свет — янтарь и бумага;
//        2) сцена = слои с разной глубиной (стена → стол → предметы → руки), камера наезжает, слои едут с разной скоростью;
//        3) всё время что-то живёт: свет из жалюзи, дым, каретка машинки, пальцы, лампы гаснут по одной, дверь открывается.
// Предметы-значки (записка, кристалл, одноразка) — из ep/nicf.js (window.NICF). Сцены собраны функциями office() и corridor() —
// из них же делаются лаборатория, комната студентов, переговорная и школьный коридор.
(function () {
  'use strict';
  const { K, cue, ln, sh, ht, clip, pop, lab, big, crystal, SKIN, SKIN2, MONO, smokeD } = NICF;
  const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k)).toString(16).padStart(2, '0')).join('') };
  const WORLD = {
    red: { d0: '#1F0810', d1: '#3A0F1B', d2: '#5E1727', d3: '#8A2437', d4: '#B5364A', light: K.amber },
    navy: { d0: '#060818', d1: '#0C1130', d2: '#161D47', d3: '#232D68', d4: '#3A4792', light: K.paper },
    teal: { d0: '#061A1C', d1: '#0B2E30', d2: '#124A4A', d3: '#1C6B66', d4: '#2FA98A', light: K.paper },
  };
  // прямоугольник и многоугольник с градиентом (свет): c1 → c2 сверху вниз или по вектору
  const grect = (x, y, w, h, c1, c2, o = {}) => { const [id, d] = lgrad([[0, c1, o.a1], [1, c2, o.a2]], o.x1 ?? 0, o.y1 ?? 0, o.x2 ?? 0, o.y2 ?? 1); return d + `<rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h)}" fill="url(#${id})"${o.rx ? ` rx="${o.rx}"` : ''}/>` };
  const gpoly = (p, c, a1, a2, x1, y1, x2, y2) => { const [id, d] = lgrad([[0, c, a1], [1, c, a2]], x1, y1, x2, y2, true); return d + `<path d="${D_.poly(p)}" fill="url(#${id})"/>` };
  const poly = (p, c, op = 1) => fill(D_.poly(p), c, op);
  const D = {}, DEFS0 = window.EP.defs;
  let Q = null;

  // рука в пиджаке над клавишами: x, y — костяшки; side: -1 левая, 1 правая; dn — нажатие 0…1
  function typingHand(x, y, side, dn, W0) {
    const FL = [80, 100, 94, 70], FX = [-36, 6, 48, 88], FR = [-9, -3, 3, 10], hot = side > 0 ? 1 : 2;
    let q = poly([[-78, 540], [176, 540], [132, 118], [-44, 118]], W0.d0) + poly([[-20, 540], [40, 540], [30, 150], [-4, 150]], '#000', .18) +
      poly([[-48, 152], [136, 152], [130, 92], [-42, 92]], K.paper) + ln('M-48 152H136', 1, K.paper2, 4) + fill(D_.circ(104, 124, 9), K.amber);
    q += g(sh(D_.rr(-22, -40, 44, 96, 22), SKIN, SKIN2, 4), at(-66, 70, 1, 28));
    FL.forEach((l, i) => { const p = i === hot ? dn * 14 : 0; q += g(sh(D_.rr(-18, -l + p, 36, l + 20, 18), SKIN, SKIN2, 4) + fill(D_.rr(-11, -l + p + 6, 22, 20, 9), K.paper, .45), at(FX[i], -22, 1, FR[i])) });
    q += sh('M-52 104C-66 40 -58 -8 -40 -30H104C122 -8 128 40 116 104Z', SKIN, SKIN2, 4) + ln('M-22 -14q12 -10 24 0M20 -18q12 -10 24 0M62 -16q12 -10 24 0', 1, SKIN2, 4);
    return g(q, `translate(${R(x)} ${R(y + dn * 6)}) rotate(${side * -6}) scale(${side > 0 ? 1 : -1} 1)` + (side > 0 ? '' : ' translate(-60 0)'))
  }

  // ---------- КАБИНЕТ 1973: стена с панелями, свет из жалюзи, календарь, стол, пишущая машинка, руки печатают план ----------
  const PLAN = ['ЧТОБЫ ВЫЖИТЬ,', 'МЫ ДОЛЖНЫ ПОЛУЧИТЬ', 'СВОЮ ДОЛЮ', 'МОЛОДЁЖНОГО РЫНКА.'], PLAN_N = PLAN.join('').length;
  function office(t) {
    const q = Q, W0 = WORLD.red, a = q.plan, cam = E(t, a, q.planE - a + .4, 'io'), zi = E(t, q.quote - .5, 1.2), n = PLAN_N * P01(t, q.quote + .1, Math.max(1, q.quoteE - q.quote - .9)), rk = E(t, q.mol - .1, .7);
    const tick = Math.floor(t * 9), dn = (t * 9) % 1 < .45 ? 1 : 0, typing = (t > a + .5 && t < q.sekr - .1) || (t > q.quote && n < PLAN_N), px = lerp(-36, 36, cam);
    const hdr = clamp((t - a - .6) * 2.2);  // шапка печатается первой
    // --- стена (дальний слой)
    let wall = grect(-300, -200, 1680, 1560, W0.d1, W0.d2);
    for (let i = 0; i < 10; i++) wall += ln(`M${-200 + i * 150} -200V1300`, 1, W0.d0, 5, { op: .28 });
    wall += grect(-300, 1030, 1680, 330, W0.d2, W0.d1) + ln('M-300 1030H1380', 1, W0.d3, 5) + ln('M-300 1048H1380', 1, W0.d0, 4, { op: .5 });
    // окно с жалюзи
    const wx = 650, wy = 250, ww = 340, wh = 520, fl = .9 + .1 * Math.sin(t * 1.3) * Math.sin(t * .37);
    wall += glow(wx + ww / 2, wy + wh / 2, 560, K.amber, .22 * fl) + grect(wx, wy, ww, wh, '#FFE2A6', K.amber);
    for (let i = 0; i < 12; i++) wall += poly([[wx, wy + i * 44], [wx + ww, wy + i * 44 - 5], [wx + ww, wy + i * 44 + 23], [wx, wy + i * 44 + 28]], W0.d1);
    wall += ln(D_.rr(wx - 8, wy - 8, ww + 16, wh + 16, 4), 1, W0.d0, 16) + ln(`M${wx + ww * .82} ${wy}V${wy + wh + 60}`, 1, W0.d0, 3);
    // полосы света от жалюзи через стену
    for (let i = 0; i < 9; i++) wall += gpoly([[wx - 30, wy + 60 + i * 52], [wx - 30, wy + 82 + i * 52], [-200, wy + 500 + i * 52 + 22], [-200, wy + 500 + i * 52]], K.amber, .2 * fl, .02, wx, 0, -200, 0);
    // календарь
    wall += g(fill(D_.rr(10, 12, 200, 250, 6), W0.d0, .5) + fill(D_.rr(0, 0, 200, 250, 6), K.paper) + fill(D_.rr(0, 0, 200, 62, 6), K.coral) + tx('ФЕВРАЛЬ', 100, 43, { f: 'O', w: 700, s: 30, c: K.paper, ls: 4 }) + tx('1973', 100, 150, { f: 'U', w: 800, s: 58, c: K.ink }) +
      [0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${26 + i * 25}" cy="200" r="5" fill="${i === 4 ? K.coral : K.paper2}"/>`).join(''), at(130, 330, 1, -2));
    wall += g(fill(D_.circ(6, 8, 78), W0.d0, .5) + sh(D_.circ(0, 0, 78), K.paper, W0.d0, 10) + [0, 3, 6, 9].map(i => ln(`M${R(Math.sin(i * Math.PI / 6) * 58)} ${R(-Math.cos(i * Math.PI / 6) * 58)}L${R(Math.sin(i * Math.PI / 6) * 66)} ${R(-Math.cos(i * Math.PI / 6) * 66)}`, 1, K.ink, 6)).join('') + g(ln('M0 0V-36', 1, K.ink, 8), 'rotate(-62)') + g(ln('M0 0V-54', 1, K.ink, 5), `rotate(${R(40 + t * 3)})`) + g(ln('M0 10V-58', 1, K.coral, 3), `rotate(${Math.floor(t * 1) * 6})`) + fill(D_.circ(0, 0, 7), K.ink), at(470, 300));
    // --- стол (средний слой)
    let desk = gpoly([[-300, 1215], [1380, 1215], [1480, 1640], [-400, 1640]], W0.d3, 1, 1, 0, 1215, 0, 1640) + grect(-400, 1215, 1880, 430, W0.d3, W0.d1) + ln('M-300 1215H1380', 1, W0.d4, 5) + grect(-400, 1640, 1880, 400, W0.d0, W0.d0);
    // лампа: свет на стол
    desk += gpoly([[120, 930], [250, 930], [470, 1330], [-120, 1330]], K.amber, .34, .03, 0, 930, 0, 1330) + softShadow(180, 1330, 330, 60, .28, K.amber);
    desk += ln('M60 1300L60 1010L170 900', 1, W0.d0, 16) + poly([[90, 870], [250, 850], [290, 940], [80, 950]], K.coral) + poly([[170, 859], [250, 850], [290, 940], [200, 944]], W0.d3, .55) + fill(D_.ell(60, 1306, 86, 22), W0.d0);
    desk += softShadow(1000, 1262, 150, 22, .5) + [0, 1, 2].map(i => fill(D_.rr(900 + i * 6, 1232 - i * 26, 210, 24, 4), i === 1 ? K.paper2 : K.paper) + fill(D_.rr(900 + i * 6, 1232 - i * 26, 46, 24, 4), i === 2 ? K.coral : W0.d3)).join('');
    // пепельница, сигарета, дым
    desk += softShadow(945, 1420, 130, 30, .5) + fill(D_.ell(940, 1390, 96, 30), W0.d0) + fill(D_.ell(940, 1382, 80, 20), W0.d2) + g(fill(D_.rr(-70, -9, 120, 18, 5), K.paper) + fill(D_.rr(-88, -9, 22, 18, 5), K.amber) + fill(D_.rr(34, -9, 30, 18, 5), '#E8A04A'), at(945, 1370, 1, -14)) +
      ln(smokeD(868, 1388, 700, t, 46, 110), 1, K.paper, 6, { op: .32 }) + ln(smokeD(872, 1386, 580, t + 2, 30, 60), 1, K.paper, 4, { op: .2 });
    // --- машинка: лист, валик, корпус, клавиши
    const lines = Math.min(3, Math.floor(P01(t, q.quote + .1, Math.max(1, q.quoteE - q.quote - .9)) * 4)), feed = 52 * (hdr >= 1 ? 1 : 0) + lines * 56, py = 700 - feed;
    let nn = t < q.quote ? 0 : n, tw0 = '';
    PLAN.forEach((s0, i) => { const m = Math.max(0, Math.min(s0.length, Math.floor(nn))); nn -= s0.length; if (m > 0) tw0 += tx(s0.slice(0, m), 352, py + 250 + i * 60, { f: MONO, w: 700, s: 31, c: K.ink, a: 'start' }) });
    const yy = py + 242 + 3 * 60;
    let paper = fill(D_.rr(334, py + 14, 430, 620, 4), W0.d0, .45) + fill(D_.rr(322, py, 430, 620, 4), K.paper) + clip(D_.rr(322, py, 430, 620, 4), ht(D_.poly([[600, py + 620], [752, py + 380], [752, py + 620]]), 'navy', .12)) +
      tx('ПЛАН'.slice(0, Math.ceil(hdr * 4)), 352, py + 92, { f: MONO, w: 700, s: 66, c: K.coral, a: 'start' }) + (hdr >= 1 ? tx('R.J. REYNOLDS TOBACCO CO.', 352, py + 136, { f: MONO, w: 700, s: 21, c: K.navy, a: 'start', op: .8 }) + tx('2 ФЕВРАЛЯ 1973 · СЕКРЕТНО', 352, py + 164, { f: MONO, w: 700, s: 21, c: K.navy, a: 'start', op: .8 }) + ln(`M352 ${py + 186}H722`, 1, K.navy, 3, { op: .45 }) : '') + tw0;
    if (rk > 0) paper += ln(`M346 ${yy - 22}C440 ${yy - 44} 690 ${yy - 42} 742 ${yy - 10}C768 ${yy + 22} 640 ${yy + 40} 500 ${yy + 38}C390 ${yy + 36} 320 ${yy + 22} 338 ${yy - 14}C346 ${yy - 28} 380 ${yy - 36} 420 ${yy - 39}`, rk, K.coral, 7);
    let cl = hdr < 1 ? hdr * 4 : 0; { let k = t < q.quote ? 0 : n; for (const s0 of PLAN) { if (k <= 0) break; cl = Math.min(k, s0.length); k -= s0.length } }
    const car = typing ? 70 - cl * 8 : 0;  // каретка: лист едет влево по мере печати, на новой строке возвращается
    let tw = g(clip(D_.rr(250, 300, 580, 716, 0), paper), `translate(${car} 0)`);
    tw += g(fill(D_.rr(236, 1000, 608, 62, 31), W0.d0) + ln('M270 1016H810', 1, W0.d3, 4, { op: .7 }) + fill(D_.circ(222, 1031, 34), W0.d0) + fill(D_.circ(858, 1031, 34), W0.d0) + ln('M858 1031h54', 1, W0.d0, 12) + fill(D_.circ(222, 1031, 12), W0.d3), `translate(${car} 0)`);
    tw += softShadow(540, 1345, 470, 46, .55) + gpoly([[200, 1058], [880, 1058], [950, 1330], [130, 1330]], '#0A0D22', 1, 1, 0, 0, 0, 1) + poly([[200, 1058], [880, 1058], [950, 1330], [130, 1330]], '#0B0E24') + poly([[200, 1058], [880, 1058], [896, 1100], [184, 1100]], '#1B2148') + ln('M200 1058H880', 1, '#3A4792', 4) +
      fill(D_.rr(440, 1068, 200, 24, 6), K.amber, .9) + tx('R E Y N O L D S', 540, 1087, { f: 'O', w: 700, s: 17, c: '#0B0E24' });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 10 - r; c++) { const kx = 236 + r * 30 + c * 66, ky = 1146 + r * 62, hit = typing && dn && ((tick * 7 + r * 3) % (10 - r) === c) && (tick % 3 === r); tw += fill(D_.ell(kx, ky + (hit ? 8 : 0) + 7, 25, 19), '#05071A') + fill(D_.ell(kx, ky + (hit ? 8 : 0), 25, 19), hit ? K.amber : '#1B2148') + ln(D_.ell(kx, ky + (hit ? 8 : 0), 25, 19), 1, K.paper2, 2.5, { op: .8 }) }
    if (typing && dn) tw += ln(`M${500 + (tick % 4) * 26} 1072L540 ${1004}`, 1, '#3A4792', 5) + fill(D_.circ(540, 1002, 7), K.paper2);
    // --- руки (ближний слой)
    const hl = typing && dn && tick % 2 === 0 ? 1 : 0, hr = typing && dn && tick % 2 === 1 ? 1 : 0;
    const hands = typingHand(330, 1370, -1, hl, W0) + typingHand(640, 1376, 1, hr, W0);
    // пылинки в луче
    let dust = ''; for (let i = 0; i < 14; i++) { const u = (rnd(i + 3) + t * (.012 + rnd(i) * .02)) % 1; dust += `<circle cx="${R(80 + rnd(i + 20) * 620 + Math.sin(t * .6 + i) * 14)}" cy="${R(1150 - u * 800)}" r="${R(2 + rnd(i + 7) * 3)}" fill="${K.amber}" opacity="${R(.5 * Math.sin(Math.PI * u))}"/>` }
    if (typing && dn && tick % 2 === 0) cue(Math.floor(t * 9) / 9, 'tick', .35, (tick % 3 - 1) * .3);
    cue(q.mol - .1, 'quill', .6);
    // камера: наезд на лист, слои едут с разной скоростью
    const Z = 1 + .1 * cam + .62 * zi, fy = lerp(900, py + 330, zi);
    return g(g(wall, `translate(${R(px * .35)} 0)`) + dust + g(desk, `translate(${R(px * .75)} 0)`) + g(tw, `translate(${R(px)} 0)`) + g(hands, `translate(${R(px * 1.5)} ${R(520 * EZ.i(zi))})`), about(540, fy, Z))
  }

  // ---------- АРХИВ: коридор стеллажей в одну точку, лампы гаснут по одной; потом дверь в конце открывается ----------
  const VP = [540, 800], DD = 1.7, NS = 7;
  const sc = d => 1 / (1 + 3.3 * d), PP = (x, y, d) => [VP[0] + (x - VP[0]) * sc(d), VP[1] + (y - VP[1]) * sc(d)];
  function corridor(t) {
    const q = Q, W0 = WORLD.navy, a = q.arch, put = E(t, a + .1, 1.1, 'io'), mk = P01(t, q.mln - .1, 1.4), opn = E(t, q.otkr - .25, 1.1, 'o'), dolly = E(t, a, q.archE - a + .5, 'io');
    const XL = -170, XR = 1250, YT = 40, YB = 1660;
    const lit = i => clamp(1 - clamp((t - (q.arh - .15) - (NS - 1 - i) * .16) * 5) + opn * (.25 + .5 * (i / NS)));   // лампы гаснут от дальней к ближней
    let s = grect(-300, -200, 1680, 2300, W0.d0, W0.d0);
    s += grect(-300, YB - 4, 1680, 700, mix(W0.d0, W0.d3, .18 + .82 * lit(0)), W0.d0);
    // дальняя стена и дверь
    const b0 = PP(XL, YT, DD), b1 = PP(XR, YB, DD), dw = (b1[0] - b0[0]) * .42, dh = (b1[1] - b0[1]) * .62;
    s += poly([b0, [b1[0], b0[1]], b1, [b0[0], b1[1]]], mix(W0.d1, W0.d3, .3 * lit(NS - 1)));
    const dx0 = VP[0] - dw / 2, dy0 = b1[1] - dh, od = dw * opn;
    s += fill(D_.rr(dx0, dy0, dw, dh, 2), W0.d0) + (opn > 0 ? glow(VP[0], dy0 + dh / 2, 420 * opn, K.paper, .5 * opn) + fill(D_.rr(VP[0] - od / 2, dy0, od, dh, 0), K.paper) : '') + ln(D_.rr(dx0, dy0, dw, dh, 2), 1, W0.d3, 3);
    for (let i = NS - 1; i >= 0; i--) {
      const d0 = i * DD / NS, d1 = (i + 1) * DD / NS, dm = (d0 + d1) / 2, L = lit(i), tone = k => mix(W0.d0, mix(W0.d2, W0.d4, k), .18 + .82 * L);
      // пол и потолок
      s += poly([PP(XL, YB, d0), PP(XR, YB, d0), PP(XR, YB, d1), PP(XL, YB, d1)], tone(.15)) + poly([PP(XL, YT, d0), PP(XR, YT, d0), PP(XR, YT, d1), PP(XL, YT, d1)], tone(0));
      for (const side of [0, 1]) {
        const X = side ? XR : XL, Xi = side ? XR - 250 : XL + 250;   // стеллаж выступает от стены на 250
        s += poly([PP(X, YT, d0), PP(X, YB, d0), PP(X, YB, d1), PP(X, YT, d1)], tone(.05));
        // торец стеллажа (к зрителю) и его лицо с коробками
        s += poly([PP(X, YT + 120, d0 + .02), PP(Xi, YT + 120, d0 + .02), PP(Xi, YB, d0 + .02), PP(X, YB, d0 + .02)], tone(.5));
        s += poly([PP(Xi, YT + 120, d0 + .02), PP(Xi, YB, d0 + .02), PP(Xi, YB, d1 - .03), PP(Xi, YT + 120, d1 - .03)], tone(.3));
        for (let lv = 0; lv < 5; lv++) {
          const y0 = YT + 150 + lv * 300, y1 = y0 + 250;
          for (let b = 0; b < 2; b++) {
            const e0 = d0 + .03 + b * (d1 - d0 - .06) / 2 + .008, e1 = e0 + (d1 - d0 - .06) / 2 - .016, our = side === 1 && i === 1 && lv === 2 && b === 0;
            s += poly([PP(Xi, y0, e0), PP(Xi, y1, e0), PP(Xi, y1, e1), PP(Xi, y0, e1)], our ? mix(W0.d3, K.coral, .25 + .75 * put) : tone(.55 + .4 * rnd(i * 31 + lv * 7 + b * 3 + side)));
            const m0 = e0 + (e1 - e0) * .28, m1 = e0 + (e1 - e0) * .72;
            s += poly([PP(Xi, y0 + 90, m0), PP(Xi, y0 + 150, m0), PP(Xi, y0 + 150, m1), PP(Xi, y0 + 90, m1)], our ? K.paper : mix(W0.d0, K.paper, clamp(.1 + .5 * L + .5 * clamp(mk * 2.2 - (NS - i) * .16))), our ? put : 1)
          }
        }
      }
      // лампа и её свет
      const lp = PP(540, YT + 6, dm), fl = PP(540, YB, dm), r0 = 300 * sc(dm);
      s += fill(D_.rr(lp[0] - 70 * sc(dm), lp[1], 140 * sc(dm), 26 * sc(dm), 4), mix(W0.d2, K.paper, L));
      if (L > .02) s += gpoly([[lp[0] - 50 * sc(dm), lp[1]], [lp[0] + 50 * sc(dm), lp[1]], [fl[0] + r0, fl[1]], [fl[0] - r0, fl[1]]], K.paper, .16 * L, .02, 0, lp[1], 0, fl[1]) + softShadow(fl[0], fl[1], r0 * 1.2, r0 * .22, .35 * L, K.paper);
    }
    // свет из двери по полу
    if (opn > 0) { const dl = PP(VP[0] - 300, YB, DD), dr = PP(VP[0] + 300, YB, DD); s += gpoly([[VP[0] - od / 2, b1[1]], [VP[0] + od / 2, b1[1]], [VP[0] + 520 * opn + 60, 1700], [VP[0] - 520 * opn - 60, 1700]], K.paper, .55 * opn, .04, 0, b1[1], 0, 1700) }
    // год
    if (opn > .5) { const fy = b1[1], k2 = E(t, q.otkr + .5, .6, 'o'), u = dh * .62; for (const dx of [-.16, .15]) s += g(fill('M-120 170C-120 90 -80 55 -38 48C-68 28 -78 -9 -73 -40C-63 -103 63 -103 73 -40C78 -9 68 28 38 48C80 55 120 90 120 170V560H-120Z', W0.d0), at(VP[0] + dw * dx, fy - u * k2 + u * .2, u / 560)) }
    s += mk > 0 ? g(odo(lerp(0, 14e6, EZ.o(mk)), 540, 320, { f: 'U', w: 800, s: 92, sep: ' ', c: K.paper }) + lab('ДОКУМЕНТОВ', 540, 384, K.paper, 40, { ls: 12 }), '', clamp(mk * 5)) : g(big(opn > .1 ? '1998' : '1979', 540, 330, K.paper, 150), '', .92);
    // рука в пиджаке несёт папку к полке
    if (put < 1) {
      const tp = PP(XR - 250, YT + 150 + 2 * 300 + 120, 1 * DD / NS + .08), hx0 = lerp(1250, tp[0] + 40, put), hy0 = lerp(1560, tp[1] + 30, put), hs = lerp(1.15, .34, put);
      s += g(poly([[60, 60], [520, 300], [560, 420], [40, 200]], '#05071A') + poly([[40, 40], [110, 76], [104, 150], [28, 112]], K.paper) + sh(D_.rr(-70, -40, 150, 130, 40), SKIN, W0.d0, 5) +
        g(sh('M-300 -210H-110L-70 -262H300V230H-300Z', K.paper2, W0.d0, 6) + sh(D_.rr(-300, -160, 600, 390, 12), K.paper, W0.d0, 6) + tx('ПЛАН', 0, 60, { f: MONO, w: 700, s: 130, c: K.coral }), at(-150, -90, .62, -12)) + sh(D_.rr(-64, -30, 60, 110, 28), SKIN, W0.d0, 5), at(hx0, hy0, hs, 0), clamp((1 - put) * 5));
    }
    cue(a + .1, 'swish', .5); cue(a + 1.1, 'thud', .7); for (let i = 0; i < NS; i++) cue(q.arh - .15 + i * .16, 'tick', .45, 0); cue(q.otkr - .25, 'whirr', .7);
    return g(s, about(VP[0], VP[1], 1 + .16 * dolly + .1 * opn))
  }

  D.plan = office; D.arch = corridor;
  window.NICP = { office, corridor, WORLD, mix, grect, gpoly, poly, typingHand };
  window.EP = {
    P, D, clean: true, lead: .1, tr: { plan: 'wipe' }, trCol: { plan: K.coral }, trDef: 'cut',
    cap: { size: 54, top: 1370, font: 'U', hi: K.amber, st: K.ink },
    defs: DEFS0,
    init(tl, SC) {
      const T = {}; SC.forEach(S => { T[S.key] = S.T });
      Q = { plan: T.plan.s(0), sekr: T.plan.c('секретный'), planE: T.plan.se(1), quote: T.plan.c('получить') - .3, quoteE: T.plan.se(1), mol: T.plan.c('молодёжного'),
        arch: T.arch.s(0), arh: T.arch.c('архив') + .45, otkr: T.arch.c('открыть'), mln: T.arch.c('Четырнадцать'), archE: T.arch.se(1) };
      document.getElementById('cap').style.textTransform = 'uppercase';
    }
  };
})();
