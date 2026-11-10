// v12.2 — тест первых трёх сцен по ТЗ Gemini (10.11): интро → меморандум 1973 → схема лаборатории. Без комнат, рук и людей.
// Рисовка: тёмный фон с точечной сеткой, тонкий контур со свечением, крупный предмет, новый план каждые 2,5–4 с, предмет влетает в предмет.
// Прошлый образец с комнатами — ep/nicp-rooms.js (не используется). Предметы и лента планов — из ep/nicf.js (window.NICF).
(function () {
  'use strict';
  const { K, B, beat, frame, cue, bgc, ln, sh, ht, clip, pop, lab, big, crystal, memo, flask, flow, vape, PROF, AIR, zig, MONO, smokeD } = NICF;
  const DEFS0 = window.EP.defs, D = {};
  let Q = null;
  const grid = (c = K.navy) => bgc(c) + ht('M-100 -100H1180V2020H-100Z', 'navy3', .55);
  const neon = (d, k = 1, c = K.paper, w = 5) => k <= 0 ? '' : ln(d, k, c, w * 3.4, { op: .16 }) + ln(d, k, c, w);
  const VB = D_.rr(-85, -190, 170, 430, 50), VM = 'M-54 -186L-44 -238C-44 -254 44 -254 44 -238L54 -186Z';
  const MANGO = 'M-110 0C-118 -80 -40 -130 30 -110C110 -88 140 -10 110 60C80 120 -20 130 -70 90C-96 70 -106 40 -110 0Z';

  // 1. Интро: контур одноразки, кольца пара, манго и мята → камера влетает в индикатор → бумага, годы отматываются
  function sIntro(t) {
    const q = Q, zk = E(t, q.claim - .1, 1.0, 'i'), vy = 820, sc = 1.5, ledY = vy + 196 * sc;
    let s = grid() + fill(D_.circ(540, vy, 520), K.navy2, .7);
    for (let i = 0; i < 3; i++) { const u = (t * .45 + i / 3) % 1; s += `<circle cx="540" cy="${R(vy - 260 * sc - u * 240)}" r="${R(40 + u * 230)}" fill="none" stroke="${K.paper}" stroke-width="4" opacity="${R((1 - u) * .45)}"/>` }
    s += g(neon(VB, E(t, .05, .7), K.mint, 5) + neon(VM, E(t, .4, .5), K.mint, 5) + neon(D_.rr(-52, -120, 104, 250, 24), E(t, .6, .6), K.paper, 3) + fill(D_.circ(0, 196, 12 + 3 * Math.sin(t * 9)), K.amber) + `<circle cx="0" cy="196" r="${R(26 + 8 * Math.sin(t * 9))}" fill="${K.amber}" opacity=".25"/>`, at(540, vy, sc, -6 + wob(t, .2, 1)));
    const pm = pop(t, q.mango - .15, .45), pl = pop(t, q.myata - .15, .45);
    if (pm > 0) s += g(fill(MANGO, K.amber) + clip(MANGO, ht('M10 -140H150V140H10Z', 'ink', .22)) + fill(D_.leaf(36, -108, 90, 28, -24), K.mint), at(200, 520, .9 * pm, -10 + wob(t, .4, 4)));
    if (pl > 0) s += g(fill(D_.leaf(0, 90, 220, 70, -70), K.mint) + ln('M0 90L74 -110', 1, K.navy, 5) + fill(D_.leaf(-10, 100, 150, 46, -130), K.mint2), at(870, 560, 1.05 * pl, wob(t, .35, 5)));
    s += g(lab('ЧТО ВЫ ЗНАЕТЕ ОБ', 540, 250, K.paper, 44, { ls: 12 }) + big('ОДНОРАЗКАХ?', 540, 350, K.paper, 86), '', clamp(t / .3) * (1 - zk * 3));
    if (zk > 0) { // влёт в индикатор: всё растёт из точки индикатора, экран становится бумагой
      s = g(s, about(540, ledY, 1 + 26 * zk * zk)) + `<rect width="1080" height="1920" fill="${K.amber}" opacity="${R(clamp(zk * 1.6 - .2))}"/>` + `<rect width="1080" height="1920" fill="${K.paper}" opacity="${R(clamp(zk * 2.4 - 1.2))}"/>`;
    }
    cue(.05, 'shimmer', .5); cue(q.mango - .15, 'drip', .5, -.4); cue(q.myata - .15, 'drip', .5, .4); cue(q.claim - .1, 'dive', .8);
    return s
  }
  // 2. Бумага: год отматывается 2026 → 1973 (цифры меняются целиком, без прокрутки)
  function sYears(t) {
    const q = Q, k = P01(t, q.claim + 1.3, Math.max(1.2, q.y50 + .7 - q.claim - 1.3)), yr = Math.round(lerp(2026, 1973, EZ.io(k)));
    let s = bgc(K.paper); for (let i = 0; i < 22; i++) s += ln(`M90 ${260 + i * 64}H990`, 1, K.navy, 2, { op: .12 });
    s += ht(D_.poly([[400, 1920], [1080, 900], [1080, 1920]]), 'navy', .12) + big(String(yr), 540, 760, k >= 1 ? K.coral : K.ink, 250) + g(lab('ТАБАЧНЫЕ КОМПАНИИ', 540, 880, K.navy, 46, { ls: 10 }), '', E(t, q.tab - .1, .3));
    if (k > 0 && k < 1) cue(t, 'tick', .3);
    return g(s, about(540, 760, 1 + .06 * P01(t, q.claim, 4)))
  }
  // 3. План А: валик машинки крупно, литеры выбивают шапку (без рук и клавиш; рычаг — под планкой)
  const HDR = ['R.J. REYNOLDS TOBACCO CO.', '2 ФЕВРАЛЯ 1973 · СЕКРЕТНО'];
  function sType(t) {
    const q = Q, a = q.plan, n = (HDR[0].length + HDR[1].length) * P01(t, a + .15, Math.max(1.2, q.poyav - a - .2)), l2 = n > HDR[0].length, cl = l2 ? n - HDR[0].length : n, hit = (t * 14) % 1 < .5 && n < HDR[0].length + HDR[1].length;
    const car = 220 - cl * 17, py = l2 ? 330 : 420;
    let s = grid('#0E1330');
    let pp = fill(D_.rr(150, py + 14, 800, 900, 4), K.ink, .5) + fill(D_.rr(138, py, 800, 900, 4), K.paper) + tx(HDR[0].slice(0, Math.floor(Math.min(n, HDR[0].length))), 190, py + 330, { f: MONO, w: 700, s: 46, c: K.ink, a: 'start' }) + (l2 ? tx(HDR[1].slice(0, Math.floor(cl)), 190, py + 420, { f: MONO, w: 700, s: 46, c: K.coral, a: 'start' }) : '');
    s += g(pp, `translate(${R(car)} 0)`);
    if (hit) s += ln('M540 1010L540 790', 1, K.navy3, 12) + fill(D_.rr(522, 762, 36, 30, 6), K.paper2);
    s += g(fill(D_.rr(-60, 800, 1200, 120, 60), '#05071A') + ln('M-20 832H1100', 1, K.navy3, 6) + fill(D_.circ(-40, 860, 80), '#05071A') + fill(D_.circ(1120, 860, 80), '#05071A'), `translate(${R(car * .5)} 0)`);
    s += fill(D_.rr(-100, 960, 1280, 1100, 0), '#0A0D22') + ln('M-100 960H1180', 1, K.navy3, 6) + fill(D_.rr(390, 1000, 300, 44, 10), K.amber) + tx('R E Y N O L D S', 540, 1033, { f: 'O', w: 700, s: 28, c: K.ink });
    if (hit) cue(Math.floor(t * 14) / 14, 'tick', .35, 0);
    return s
  }
  // 4. План Б: лист на весь экран под углом, цитата печатается, красная обводка, штамп
  function sMemo(t) {
    const q = Q, k = E(t, q.poyav - .05, .5, 'o'), n = 62 * P01(t, q.cel - .2, Math.max(1, q.mol - q.cel + .6)), rk = E(t, q.mol + .05, .6);
    let s = grid() + fill(D_.poly([[-200, 1500], [1280, 900], [1280, 2200], [-200, 2200]]), K.navy2, .8);
    s += g(big('1973', 540, 300, K.coral, 150), '', k);
    s += g(memo(540, 900, 1.42, lerp(10, -4, k), { n, ring: rk, st: q.rynok + .25 }, t), about(540, 1000, lerp(.7, 1, k) + .05 * P01(t, q.cel, 5)), k);
    cue(q.poyav - .05, 'swish', .6); cue(q.mol + .05, 'quill', .6); cue(q.rynok + .25, 'stamp', 1);
    return s
  }
  // 5. Схема проблемы: контур профиля, дым идёт в горло и царапает
  function sThroat(t) {
    const q = Q, a = q.lab, k1 = E(t, a + .15, .9), k2 = E(t, q.deret - .3, .6), hx = 420, hy = 760, sc = 1.42, sh0 = Math.sin(t * 46) * 6 * P01(t, q.deret, .12) * (1 - P01(t, q.deret + .5, .4));
    let s = grid() + fill(D_.circ(400, 880, 600), K.navy2, .7);
    let h = neon(PROF, E(t, a, .8), K.paper, 4) + ln(AIR, 1, K.navy3, 36) + ln(zig(AIR, 15), k2, K.coral, 9);
    if (k2 > .4) { const p = pts(AIR, 30)[12], pk = (t * 1.6) % 1; h += `<circle cx="${p[0]}" cy="${p[1]}" r="${R(30 + pk * 120)}" fill="none" stroke="${K.coral}" stroke-width="6" opacity="${R(1 - pk)}"/>` }
    s += g(h + neon('M1200 160C900 60 760 330 620 240C480 150 330 128 214 133', k1, K.amber, 6), at(hx + sh0, hy, sc));
    s += g(lab('ТАБАЧНЫЙ ДЫМ', 800, 560, K.amber, 40) + lab('ГОРЛО', 300, 1330, K.coral, 40, { op: k2 }), '', k1);
    cue(a + .15, 'puff', .5); cue(q.deret - .05, 'zap', .7);
    return s
  }
  // 6. Схема лаборатории (как у Coca-Cola): две колбы → трубки → змеевик над горелкой → кристалл соли, шкала дозы
  function sLab(t) {
    const q = Q, a = q.mix, dk = E(t, a, 1.0, 'o'), f1 = P01(t, q.nik - .2, 1.0), f2 = P01(t, q.kis - .3, 1.0), cf = P01(t, q.kis + .3, 1.1), cp = pop(t, q.sol - .15, .5), dz = E(t, q.doza - 1.0, 1.3, 'io');
    let s = grid();
    const L1 = 'M250 640V700C250 760 300 780 380 780H420C450 780 470 800 470 830', L2 = 'M690 640V700C690 760 640 780 560 780H520C490 780 470 800 470 830';
    let coil = 'M470 830'; for (let i = 1; i <= 60; i++) coil += `L${R(470 + Math.sin(i / 60 * Math.PI * 10) * 84)} ${R(830 + i * 5.2)}`; coil += 'L470 1190';
    s += flask(250, 540, 100, { lv: .62 * (1 - f1 * .75), liq: K.amber, k: dk }) + flask(690, 540, 100, { lv: .62 * (1 - f2 * .75), liq: K.mint, k: dk });
    s += neon(L1, dk, K.paper, 4) + neon(L2, dk, K.paper, 4) + neon(coil, E(t, a + .3, 1.0), K.paper, 4) + flow(L1, f1, K.amber, 12, 90) + flow(L2, f2, K.mint, 12, 90) + flow(coil, cf, K.paper, 12, 120);
    const fl = 1 + wob(t, 3.1, .08);
    s += g(fill(D_.drop(250, 1010, 50 * fl), K.coral) + fill(D_.drop(250, 1024, 24 * fl), K.amber) + neon('M190 1090H310M250 1090V1160M200 1160H300', 1, K.paper, 4) + ln('M320 1000h60', 1, K.coral, 4, { da: '6 10' }), '', dk);
    s += g(lab('НИКОТИН', 250, 330, K.amber, 38) + lab('КИСЛОТА', 690, 330, K.mint, 38), '', dk);
    if (cp > 0) { s += crystal(470, 1250, .95 * cp, { c: K.paper }) + lab('НИКОТИНОВАЯ', 215, 1240, K.paper, 34, { op: cp }) + lab('СОЛЬ', 215, 1290, K.paper, 34, { op: cp }); const pk = P01(t, q.sol - .15, .7); if (pk < 1) s += `<circle cx="470" cy="1250" r="${R(80 + pk * 300)}" fill="none" stroke="${K.paper}" stroke-width="${R(9 * (1 - pk))}"/>` }
    const bx = 930, by0 = 1290, bh = 800;
    s += g(clip(D_.rr(bx - 30, by0 - bh, 60, bh, 30), fill(D_.rr(bx - 30, by0 - bh * (.1 + .9 * dz), 60, bh, 0), K.amber)) + neon(D_.rr(bx - 30, by0 - bh, 60, bh, 30), 1, K.paper, 4) + [1, 2, 3, 4, 5, 6, 7].map(i => ln(`M${bx - 56} ${by0 - bh * i / 8}h${i % 2 ? 14 : 22}`, 1, K.paper, 4)).join('') + lab('ДОЗА', bx, by0 - bh - 30, K.paper, 34), '', E(t, q.sol + .2, .4));
    cue(q.nik - .2, 'drip', .5, -.4); cue(q.kis - .3, 'drip', .5, .3); cue(q.sol - .15, 'ding', .9); cue(q.doza - 1, 'whirr', .45, .5);
    return g(s, about(540, 800, 1 + .05 * P01(t, a, 6)))
  }

  window.EP = {
    P, D, clean: true, lead: .1, tr: {}, trDef: 'cut',
    cap: { size: 54, top: 1400, font: 'U', hi: K.amber, st: K.ink },
    defs: DEFS0,
    init(tl, SC) {
      const T = {}; SC.forEach(S => { T[S.key] = S.T; D[S.key] = frame });
      const c = (k, w, n = 0) => T[k].c(w, n);
      Q = { mango: c('shop', 'манго'), myata: c('shop', 'мяты'), claim: T.claim.s(0), tab: c('claim', 'табачные'), y50: c('claim', 'пятьдесят'),
        plan: T.plan.s(0), poyav: c('plan', 'появился'), cel: c('plan', 'целью'), mol: c('plan', 'молодёжного'), rynok: c('plan', 'рынка'),
        lab: T.lab.s(0), deret: c('lab', 'дерёт'), mix: T.lab.s(1), nik: c('lab', 'никотин'), kis: c('lab', 'кислотой'), sol: c('lab', 'соль'), doza: c('lab', 'дозе') };
      B.length = 0;
      beat(0, sIntro);
      beat(Q.claim + .9, sYears, { kind: 'circ', d: .01, x: 540, y: 1114 });
      beat(Q.plan - .1, sType, { kind: 'up', band: K.coral, d: .4 });
      beat(Q.poyav - .1, sMemo, { kind: 'diag', band: K.navy3, d: .4 });
      beat(Q.lab - .1, sThroat, { kind: 'up', band: K.coral, d: .45 });
      beat(Q.mix - .1, sLab, { kind: 'circ', band: K.amber, d: .5, x: 540, y: 900 });
      document.getElementById('cap').style.textTransform = 'uppercase';
    }
  };
})();
