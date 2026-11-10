// Никотин v11 (nicf), вторая половина: сейф → архив → Стэнфорд → «Джул» → картридж → школьники → сделка → «домой» → «вас выбрали».
// Азбука и предметы — из ep/nicf.js (window.NICF). Грузится после него (stage.html: loadEp).
(function () {
  'use strict';
  const { SKIN, SKIN2, teen, face, stamper, ghost, K, beat, cue, bgc, ln, sh, ht, clip, hexD, pop, lab, big, flow, smokeD, cam, vape, crystal, cig, memo, flask, BUST, MONO } = NICF;
  let Q = null;

  // ---------- предметы ----------
  function folder(x, y, s = 1, r = 0, o = {}) {
    const back = 'M-300 -210H-110L-70 -262H300V230H-300Z', front = D_.rr(-300, -160, 600, 390, 12), c = o.c || K.navy;
    let q = sh(back, K.paper2, c, 6) + (o.inner || '') + fill(front, K.paper) + clip(front, ht(D_.poly([[40, 230], [300, -60], [300, 230]]), 'navy', .16)) + ln(front, 1, c, 6);
    if (!o.mini) q += ln(D_.rr(-250, -110, 300, 78, 6), 1, c, 4) + tx('ОТЧЁТ · 1979', -100, -58, { f: MONO, w: 700, s: 32, c: K.navy });
    return g(q + (o.top || ''), at(x, y, s, r))
  }
  // «Джул»: палочка с картриджем справа; o.cr — сколько кристаллов видно в картридже (0…3)
  function stick(x, y, s = 1, r = 0, o = {}) {
    const body = D_.rr(-330, -52, 540, 104, 20), pod = D_.rr(196, -52, 134, 104, 26), c = o.c || K.paper;
    let q = fill(body, o.f || K.navy3) + clip(body, ht(D_.rr(-330, 0, 540, 60, 0), 'ink', .3)) + ln(body, 1, c, 6) + fill(pod, o.pod || K.mint) + clip(pod, ht(D_.rr(196, 0, 134, 60, 0), 'ink', .18)) + ln(pod, 1, c, 6) +
      ln('M-250 -24H60', 1, K.paper, 5, { op: .45 }) + `<circle cx="-282" cy="0" r="10" fill="${o.led || K.mint}"/>`;
    for (let i = 0; i < 3; i++) q += crystal(230 + i * 34, i % 2 ? 16 : -16, .21 * clamp((o.cr || 0) - i), { c: K.navy });
    return g(q, at(x, y, s, r))
  }
  function pack(x, y, s = 1, r = 0, o = {}) {
    const body = D_.rr(-150, -200, 300, 420, 14), c = o.c || K.paper; let q = '';
    for (let i = 0; i < 10; i++) { const p = pop(o.n ?? 20, i * 2, 2); if (p > 0) q += fill(D_.rr(-132 + i * 27, -200 - 130 * p, 23, 160, 5), K.paper) + fill(D_.rr(-132 + i * 27, -200 - 130 * p, 23, 44, 5), K.amber) }
    q += fill(body, o.f || K.navy) + clip(body, ht(D_.rr(20, -200, 130, 420, 0), 'ink', .3)) + ln(body, 1, c, 6) + ln('M-150 -84H150', 1, c, 5);
    return g(q, at(x, y, s, r))
  }
  function laptop(x, y, s = 1, o = {}) {
    const scr = D_.rr(-330, -240, 660, 450, 20), inn = D_.rr(-300, -212, 600, 392, 6), c = o.c || K.navy;
    return g(sh(scr, K.navy3, c, 6) + fill(inn, K.paper) + (o.inner || '') + sh('M-410 216H410L376 256H-376Z', K.paper2, c, 6), at(x, y, s))
  }
  const MANGO = 'M-110 0C-118 -80 -40 -130 30 -110C110 -88 140 -10 110 60C80 120 -20 130 -70 90C-96 70 -106 40 -110 0Z';
  const mango = (x, y, s, r = 0) => s <= 0 ? '' : g(fill(MANGO, K.amber) + clip(MANGO, ht('M10 -140H150V140H10Z', 'ink', .22)) + ln('M-60 -40C-40 -76 0 -90 30 -84', 1, K.paper, 7) + fill(D_.leaf(36, -108, 90, 28, -24), K.mint) + ln('M28 -104C36 -122 40 -128 46 -136', 1, K.mint2, 7), at(x, y, s, r));
  // рука держит одноразку: back — ладонь и предплечье (за предметом), front — пальцы (перед предметом)
  function handBack(c = K.navy) { return sh('M-10 300L190 260L440 1200H100Z', K.coral, c, 6) + sh('M-14 300L192 258L206 318L0 362Z', K.coral2, c, 6) + sh(D_.rr(-150, 20, 300, 300, 80), SKIN, c, 6) + sh(D_.rr(-178, 40, 70, 170, 35), SKIN, c, 6) }
  function handFront(c = K.navy) { let q = ''; for (let i = 0; i < 4; i++) q += sh(D_.rr(-118 + i * 6, 74 + i * 60, 236 - i * 14, 54, 27), SKIN, c, 6); return q }

  // ================= БИТЫ =================
  // 8. Соль в сигареты не попала → 1979: отчёт в папку, штамп, в архив
  function bSafe(t) {
    const q = Q, a = q.safe, k = E(t, a + .1, .7, 'o'), no = E(t, q.nep - .25, .45), dr = E(t, q.s79 - .2, .7), cl = E(t, q.zasek - .35, .4), go = E(t, q.arch - .45, .8, 'i');
    let s = bgc(K.coral) + fill(D_.poly([[-200, -200], [1280, -200], [1280, 500], [-200, 1050]]), K.coral2) + ht(D_.poly([[-200, 850], [1280, 300], [1280, 500], [-200, 1050]]), 'ink', .16);
    s += g(cig(lerp(-500, 330, k), 720, 1.25, 4, { ember: K.navy }) + ln('M712 640L872 830M872 640L712 830', no, K.navy, 18), '', 1 - dr);
    const cx = lerp(lerp(1400, 900, k) - 60 * Math.sin(Math.PI * no), 540, dr), cy = lerp(745, 930, EZ.i(dr));
    const fo = E(t, q.s79 - .45, .6, 'o'), fy = lerp(2300, 1000, fo);
    if (dr < .98) s += crystal(cx, cy, lerp(1.05, .7, dr), { c: K.navy });
    if (fo > 0) {
      const inner = dr >= .98 ? crystal(0, lerp(-70, 30, cl), .7, { c: K.navy }) : '';
      s += g(folder(540, fy, 1.3, -3, { inner, top: stamp('КОНФИДЕНЦИАЛЬНО', 20, 70, t, q.zasek - .05, { c: K.coral, s: 52, r: -10, ls: 3 }) }), about(540, 1000, 1 - .62 * go) + ` translate(${R(700 * go)} ${R(-240 * go)})`, 1);
      s += g(big('1979', 540, 420, K.navy, 190), '', clamp(fo * 2) * (1 - go));
    }
    s += stamper(566, 1130, t, q.zasek - .05);
    cue(a + .1, 'swish', .5); cue(q.nep - .2, 'thud', .6); cue(q.zasek - .05, 'stamp', 1); cue(q.arch - .4, 'whoosh', .5);
    return s
  }
  // 9. Архив: стена ящиков, год докатывается до 1998, молоток судьи — ящики открываются
  function bArch(t) {
    const q = Q, a = q.archA, yk = P01(t, a + .2, Math.max(.8, q.sud - a - .3)), hit = P01(t, q.sud, .22), op = P01(t, q.otkr - .2, 1.1);
    let s = bgc(K.navy), W0 = 250, H0 = 190;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) {
      const x = 40 + c * W0, y = 560 + r * H0, ours = r === 1 && c === 2, o = clamp(op * 2.2 - (r * .16 + c * .09)), e = EZ.o(o);
      if (e > 0) s += fill(D_.rr(x + 30, y + 20 - 120 * e, W0 - 80, 150, 6), ours ? K.paper : K.paper2) + (ours ? ln(`M${x + 60} ${y + 70 - 120 * e}h110`, 1, K.coral, 7) : '');
      s += sh(D_.rr(x + 10, y + 10 + 46 * e, W0 - 20, H0 - 20, 10), K.navy2, K.paper, 5) + ln(`M${x + 90} ${y + 110 + 46 * e}h70`, 1, K.paper, 7) + sh(D_.rr(x + 80, y + 40 + 46 * e, 90, 40, 4), ours ? K.coral : K.navy3, K.paper, 4);
    }
    s += fill(D_.rr(-50, -50, 1180, 590, 0), K.navy) + ht(D_.rr(-50, 480, 1180, 80, 0), 'ink', .5);
    s += odo(lerp(1979, 1998, EZ.io(yk)), 330, 410, { f: 'U', w: 800, s: 140, sep: '', c: K.paper });
    // молоток
    const ang = lerp(-58, 0, EZ.i(hit)) + (hit >= 1 ? -10 * Math.max(0, 1 - (t - q.sud - .22) / .3) : 0);
    s += g(ln('M0 0L-250 0', 1, K.paper, 22) + sh(D_.rr(-330, -80, 130, 160, 22), K.coral, K.paper, 6), at(1070, 360, 1, ang), clamp((t - a) * 3));
    if (hit >= 1) { const pk = P01(t, q.sud + .22, .6); if (pk < 1) s += `<circle cx="805" cy="440" r="${R(40 + pk * 520)}" fill="none" stroke="${K.paper}" stroke-width="${R(14 * (1 - pk))}"/>` }
    cue(a + .25, 'tick', .4); cue(a + .7, 'tick', .4); cue(q.sud + .2, 'impact', .9); cue(q.otkr - .15, 'scuttle', .5);
    return cam(s, t, a, { z: .05, d: 3.5, y: 900 })
  }
  // 10. Стэнфорд: двое со спины читают отчёт
  function bStud(t) {
    const q = Q, a = q.stud, k = E(t, a + .05, .7, 'o'), rd = E(t, q.proch - .1, .8), rk = E(t, q.stan - .5, .6);
    let s = bgc(K.mint) + fill(D_.circ(540, 700, 560), K.mint2) + ht(D_.circ(540, 700, 560), 'ink', .1);
    let inner = tx('R.J. REYNOLDS · 1979', -270, -150, { f: MONO, w: 700, s: 26, c: K.navy, a: 'start' });
    for (let i = 0; i < 6; i++) inner += ln(`M-270 ${-100 + i * 40}h${[300, 260, 310, 220, 290, 180][i]}`, clamp(rd * 6 - i), K.navy, 6, { op: .55 });
    inner += crystal(180, 20, .9 * pop(t, a + .5, .5), { c: K.navy }) + ln('M-284 -6C-200 -40 20 -36 46 -4C60 30 -120 44 -220 36C-290 30 -306 6 -270 -14', rk, K.coral, 6);
    s += laptop(540, lerp(1500, 720, k), 1.25, { inner });
    s += g(lab('СТЭНФОРД · 2005', 540, 330, K.navy, 44, { ls: 10 }), '', k);
    for (const [x, y, sc, d] of [[300, 1330, 2.3, .15], [790, 1370, 2.5, .28]]) { const p = E(t, a + d, .6, 'o'); s += g(fill(BUST, K.navy) + clip(BUST, ht('M0 -110H130V180H0Z', 'navy3', .6)), at(x, y + 500 * (1 - p), sc)) }
    cue(a + .05, 'swish', .5); cue(q.stan - .5, 'quill', .5);
    return cam(s, t, a, { z: .05, d: 3 })
  }
  // 11. «Джул»: палочка как флешка → внутри та самая соль → в патенте сноска на «Рейнольдс»
  function bJuul(t) {
    const q = Q, a = q.juul, k = E(t, q.dj - .3, .7, 'o'), usb = E(t, q.flesh - .45, .55), zi = E(t, q.vnutri - .2, .8), pt = E(t, q.pat - .25, .7, 'o'), rk = E(t, q.rey2 - .25, .6);
    let s = bgc(K.navy) + fill(D_.circ(540, 800, lerp(380, 620, zi)), K.navy2);
    s += g(big('2015', 540, 420, K.mint, 190), '', 1 - zi);
    // порт (край ноутбука) слева: палочка втыкается как флешка
    const px = lerp(-420, 0, EZ.o(P01(t, q.flesh - .9, .5))) - 500 * zi;
    s += g(sh(D_.rr(-260, 560, 330, 480, 26), K.navy3, K.paper, 6) + fill(D_.rr(20, 742, 50, 116, 8), K.ink) + ln('M-200 640h180M-200 700h120', 1, K.paper, 6, { op: .4 }), `translate(${R(px)} 0)`);
    const sx = lerp(lerp(1500, 600, k), 398, usb);
    const st = stick(sx, 800, 1.15, 0, { cr: 3 * P01(t, q.vnutri, .6), led: usb > .9 && Math.sin(t * 14) > 0 ? K.paper : K.mint });
    s += g(st, about(sx + 300, 800, 1 + 2.3 * zi) + ` translate(${R(-(sx + 300 - 540) * zi / (1 + 2.3 * zi) * 0)} 0)`, 1);
    if (zi > 0) s = g(s, `translate(${R((540 - (sx + 300)) * zi)} ${R(-140 * pt)})`);
    if (pt > 0) { // патент
      const y0 = lerp(2100, 1130, pt);
      let p = fill(D_.rr(-330 + 16, -200 + 18, 660, 700, 6), K.ink, .5) + fill(D_.rr(-330, -200, 660, 700, 6), K.paper) + tx('US PATENT · 2015', -284, -128, { f: MONO, w: 700, s: 32, c: K.navy, a: 'start' });
      for (let i = 0; i < 3; i++) p += ln(`M-284 ${-70 + i * 40}h${[540, 470, 520][i]}`, 1, K.navy, 6, { op: .4 });
      p += tx('[1] R.J. REYNOLDS, 1989', -284, 96, { f: MONO, w: 700, s: 36, c: K.ink, a: 'start' }) + ln('M-290 122C-150 110 60 128 240 114', rk, K.coral, 9);
      s += g(p, at(540, y0, 1, 3));
    }
    cue(q.dj - .3, 'swish', .5); cue(q.flesh - .1, 'tick', .7); cue(q.vnutri - .2, 'dive', .5); cue(q.pat - .25, 'swish', .5); cue(q.rey2 - .2, 'quill', .6);
    return s
  }
  // 12. Картридж = пачка. Вкус — манго
  function bPod(t) {
    const q = Q, a = q.pod, k = E(t, a + .05, .6, 'o'), cnt = 20 * P01(t, q.pach - .5, 1.1), mg = P01(t, q.mango - .45, .5), land = mg >= 1 ? 1 : 0;
    let s = bgc(K.paper) + fill(D_.poly([[-200, 2200], [-200, 1150], [1280, 760], [1280, 2200]]), K.paper2) + ht(D_.poly([[-200, 1150], [1280, 760], [1280, 960], [-200, 1350]]), 'navy', .1);
    const POD = D_.rr(-150, -200, 300, 420, 60);
    let pd = fill(POD, land ? K.amber : K.paper) + clip(POD, ht(D_.rr(20, -200, 130, 420, 0), 'navy', .16)) + ln(POD, 1, K.navy, 7) + sh(D_.rr(-70, -260, 140, 70, 14), K.navy, K.navy, 6);
    for (let i = 0; i < 5; i++) pd += crystal([-60, 60, 0, -60, 60][i], [-90, -90, 10, 110, 110][i], .42 * pop(t, a + .2 + i * .07, .4), { c: K.navy });
    const sq = land ? 1 + .1 * Math.max(0, 1 - (t - q.mango - .05) / .3) : 1;
    s += g(pd, at(280, lerp(1700, 860, k), 1.05 * sq)) + g(big('=', 540, 900, K.navy, 130), '', E(t, q.kak - .1, .3));
    s += pack(800, 860 + 600 * (1 - E(t, q.kak - .2, .6, 'o')), 1.05, 0, { n: cnt, f: K.coral, c: K.navy });
    if (cnt > 0) s += g(odo(Math.min(20, cnt), 800, 470, { f: 'U', w: 800, s: 120, sep: '', c: K.navy }), '', clamp(cnt));
    if (mg > 0) s += mango(280, lerp(-200, 440, EZ.i(mg)) + (land ? -40 * Math.abs(Math.sin((t - q.mango - .05) * 9)) * Math.max(0, 1 - (t - q.mango) / .7) : 0), 1.25, lerp(-40, 8, mg));
    cue(a + .1, 'swish', .4); cue(q.pach - .5, 'scuttle', .5); cue(q.mango + .05, 'drip', .9);
    return cam(s, t, a, { z: .04, d: 4 })
  }
  // 13. Школьники: каждый четвёртый — коралловый; записка возвращается, нити — к ним
  const HOT = [1, 6, 8, 15];
  function bTeens(t) {
    const q = Q, a = q.teens, hk = P01(t, q.chetv - .1, .9), mk = E(t, q.rynok - .15, .7, 'o'), rk = E(t, q.rynok + .25, .6), thr = P01(t, q.zap2 - .7, .9), dn = 150 * mk;
    let s = bgc(K.navy) + fill(D_.poly([[-200, -200], [1280, -200], [1280, 560], [-200, 1000]]), K.navy2) + ghost('lockers', K.navy3, .5), th = '';
    s += g(lab('США · 2019', 540, 330, K.paper, 44, { ls: 10 }), '', (1 - mk) * clamp((t - a) * 3));
    for (let i = 0; i < 16; i++) {
      const c = i % 4, r = Math.floor(i / 4), x = 150 + c * 260 + (r % 2 ? 40 : -40), y = 640 + r * 190 + dn, p = pop(t, a + .1 + i * .035, .4); if (p <= 0) continue;
      const hi = HOT.indexOf(i), hot = hi >= 0 ? clamp(hk * 4 - hi * .8) : 0;
      s += g(fill(BUST, hot > .5 ? K.coral : K.paper2) + clip(BUST, ht('M0 -110H130V180H0Z', hot > .5 ? 'ink' : 'navy', .3)) + fill(D_.circ(0, -30, 62), SKIN) + face([K.ink, K.navy3, K.coral2, K.navy][i % 4]), at(x, y + 60 * (1 - p), 1.05 * (1 + .12 * Math.sin(Math.PI * clamp(hot)))));
      if (hot > .5) { s += ln(smokeD(x + 60, y - 30, 120, t + i, 14, 30, 10), clamp(hot * 2 - 1), K.paper, 5); if (thr > 0) th += ln(`M540 620C${540 + (x - 540) * .3} ${700 + dn} ${x} ${y - 260} ${x} ${y - 96}`, clamp(thr * 1.6 - hi * .15), K.coral, 6) }
    }
    if (mk > 0) s += th + memo(540, lerp(-500, 500, mk), .62, lerp(-14, 4, mk), { ring: rk, st: true }, t);
    HOT.forEach((_, i) => cue(q.chetv - .1 + i * .2, 'puff', .45, i % 2 ? .4 : -.4)); cue(q.rynok - .15, 'swish', .6); cue(q.zap2 - .6, 'whip', .5);
    return s
  }
  // 14. Сделка: треть — производителю «Мальборо», 12,8 млрд $
  function bDeal(t) {
    const q = Q, a = q.deal, k = E(t, a + .05, .6, 'o'), sl = E(t, q.kupil - .3, .7), mn = P01(t, q.pochti - .1, Math.max(1, q.doll - q.pochti));
    let s = bgc(K.coral) + fill(D_.poly([[-200, 2200], [-200, 1300], [1280, 820], [1280, 2200]]), K.coral2);
    const R0 = 300, cx = 500, cy = 860, a0 = -90, a1 = 36, rad = d => d * Math.PI / 180;
    const slice = `M0 0L${R(R0 * Math.cos(rad(a0)))} ${R(R0 * Math.sin(rad(a0)))}A${R0} ${R0} 0 0 1 ${R(R0 * Math.cos(rad(a1)))} ${R(R0 * Math.sin(rad(a1)))}Z`, mid = rad((a0 + a1) / 2);
    s += g(fill(D_.circ(0, 0, R0), K.paper) + ht('M-300 0A300 300 0 0 0 300 0Z', 'navy', .14) + g(stick(-60, 110, .42, -20, { f: K.navy, c: K.navy, cr: 3 }), ''), at(cx, lerp(2000, cy, k), 1));
    s += g(sh(slice, K.navy, K.paper, 6) + tx('35 %', 150 * Math.cos(mid), 150 * Math.sin(mid) + 22, { f: 'U', w: 800, s: 62, c: K.paper }), at(cx + 150 * sl * Math.cos(mid), lerp(2000, cy, k) + 150 * sl * Math.sin(mid), 1));
    s += pack(880, lerp(-400, 420, E(t, q.proizv - .3, .6, 'o')), .78, 8, { n: 20, f: K.navy, c: K.paper });
    if (mn > 0) s += g(fill(D_.rr(90, 1150, 900, 130, 65), K.navy) + odo(lerp(0, 12.8e9, EZ.o(mn)), 540, 1242, { f: 'U', w: 800, s: 60, sep: ' ', c: K.amber, pre: '$ ' }), '', clamp(mn * 5));
    cue(a + .05, 'swish', .5); cue(q.kupil - .25, 'thud', .6); cue(q.pochti, 'coins', .7);
    return cam(s, t, a, { z: .04, d: 4 })
  }
  // 15. «Формула вернулась домой»: нить обходит всю историю и замыкается
  function bHome(t) {
    const q = Q, a = q.home, lk = P01(t, a + .05, Math.max(.5, q.domoy - a + .05)), hit = P01(t, q.domoy + .08, .5), RR = 330, cx = 540, cy = 820;
    let s = bgc(K.navy) + fill(D_.circ(cx, cy, 470), K.navy2);
    const N = 6, pos = i => { const an = (-90 + i * 60) * Math.PI / 180; return [cx + Math.cos(an) * RR, cy + Math.sin(an) * RR] };
    const icons = [
      (x, y, p) => memo(x, y, .2 * p, -6, { ring: 1 }, t), (x, y, p) => g(flask(0, 30, 54, { lv: .6 }), at(x, y, p)), (x, y, p) => folder(x, y, .27 * p, 4, { mini: 1, c: K.paper }),
      (x, y, p) => laptop(x, y, .22 * p, { c: K.paper }), (x, y, p) => stick(x, y, .3 * p, -24, { cr: 3 }), (x, y, p) => pack(x, y + 10, .34 * p, 6, { n: 20, f: K.coral })];
    s += ln(D_.circ(cx, cy, RR), 1, K.navy3, 4, { da: '6 16' });
    const d0 = `M${cx} ${cy - RR}A${RR} ${RR} 0 1 1 ${cx - .5} ${cy - RR}`;
    s += ln(d0, EZ.io(lk), K.coral, 9);
    for (let i = 0; i < N; i++) { const [x, y] = pos(i), p = pop(t, a + .05 + (q.domoy - a) * i / N * .9, .35); if (p > 0) s += fill(D_.circ(x, y, 104 * p), K.navy) + ln(D_.circ(x, y, 104 * p), 1, lk > i / N ? K.coral : K.paper, 6) + icons[i](x, y, p * (1 + .15 * Math.sin(Math.PI * hit))) }
    const cp = pop(t, q.domoy, .45); if (cp > 0) s += crystal(cx, cy, 1.35 * cp, { c: K.coral });
    if (hit > 0 && hit < 1) s += `<circle cx="${cx}" cy="${cy}" r="${R(150 + hit * 900)}" fill="none" stroke="${K.coral}" stroke-width="${R(26 * (1 - hit))}"/>` + `<rect width="1080" height="1920" fill="${K.paper}" opacity="${R(.5 * (1 - hit) * (hit < .25 ? 1 : 0))}"/>`;
    cue(a + .05, 'whip', .5); cue(q.domoy + .05, 'impact', 1.2); cue(q.domoy + .05, 'bell', .5);
    return s
  }
  // 16. Финал: 7 из 8 одноразок с солью → одна в руке → нити сверху → записка 1973 → «она и сейчас у вас в руке?»
  function bYou(t) {
    const q = Q, a = q.you, one = E(t, q.kazh - .2, .8), hd = E(t, q.vybr - .35, .7, 'o'), st = P01(t, q.no - .1, .7), up = E(t, q.ran - .15, .9) - E(t, q.nuchto - .35, .9), fin = E(t, q.vruke - .1, .9), pan = 720 * up;
    let s = bgc(K.navy) + fill(D_.circ(540, 860, lerp(520, 470, fin)), K.navy2);
    s += g(ghost('shelves', K.navy3, .7), '', 1 - one);
    // полка: 8 одноразок, в 7 — соль
    if (one < 1) for (let i = 0; i < 8; i++) {
      if (i === 5) continue; const c = i % 4, r = Math.floor(i / 4), x = 165 + c * 250, y = 600 + r * 520, p = pop(t, a + .05 + i * .05, .4), has = i !== 2, kx = has ? clamp((t - (q.sol - .2) - i * .07) * 3) : 0;
      if (p > 0) s += g(vape(x, y + (r ? 1 : -1) * 1400 * EZ.i(one), .62 * p, 0, { x: 1, f: K.navy2, in: has && kx > 0 ? K.navy3 : K.navy2 }) + (has ? '' : ''), '', has ? 1 : .45);
      if (has && kx > 0 && one < .3) s += `<circle cx="${x}" cy="${R(y + 22)}" r="${R(30 + 60 * kx)}" fill="none" stroke="${K.amber}" stroke-width="4" opacity="${R((1 - kx) * .9)}"/>`;
    }
    // записка наверху (мир выше кадра) и нити
    const vx = lerp(415, 540, one), vy = lerp(1120, 900, one), vs = lerp(.62, 1.3, one), vr = lerp(0, -9, fin);
    let w = '';
    if (up > 0 || st > 0) {
      w += g(big('1973', 290, -290, K.coral, 130) + memo(770, -200, .62, 6, { ring: 1, st: true }, t), '', clamp(up * 3 + .001));
      const k3 = EZ.io(st), sway = wob(t, .35, 10);
      [[-90, 330, 680], [10, 150, 770], [110, 420, 830]].forEach(([dx, hy, x0], i) => { w += ln(`M${x0} -40C${x0 + sway} 300 ${vx + dx - sway} 400 ${vx + dx} ${vy + hy}`, clamp(k3 * 1.3 - i * .12), K.coral, 6) });
    }
    // рука + одноразка (i = 5 — «наша»)
    const p5 = pop(t, a + .3, .4), hy = 1500 * (1 - hd);
    let hv = '';
    const lk = [1 - up - fin, -.7 - .3 * up + .7 * fin];
    if (hd > 0) hv += g(NICF2H.back(), at(vx + 40, vy + 20 + hy, vs / 1.3 * 1.25, 0));
    hv += vape(vx, vy, vs * (one > 0 ? 1 : p5), vr, { x: 1 - one, f: K.amber, in: K.navy3 });
    if (hd > 0) hv += g(NICF2H.front(), at(vx + 40, vy + 20 + hy, vs / 1.3 * 1.25, 0));
    const mgp = pop(t, q.mango2 - .3, .5) * (1 - E(t, q.no - .2, .4));
    if (mgp > 0) hv += mango(850, 520, .95 * mgp, 10 + wob(t, .4, 4));
    // финальный вопрос: дым складывается в «?»
    if (fin > 0) { const tx0 = vx + 252 * vs * Math.sin(vr * Math.PI / 180) - 4, ty0 = vy - 252 * vs * Math.cos(vr * Math.PI / 180); hv += ln(`M${R(tx0)} ${R(ty0 - 10)}C${R(tx0)} ${R(ty0 - 90)} ${R(tx0 + 10)} ${R(ty0 - 130)} ${R(tx0 + 60)} ${R(ty0 - 180)}C${R(tx0 + 130)} ${R(ty0 - 250)} ${R(tx0 + 150)} ${R(ty0 - 330)} ${R(tx0 + 90)} ${R(ty0 - 400)}C${R(tx0 + 30)} ${R(ty0 - 460)} ${R(tx0 - 80)} ${R(ty0 - 440)} ${R(tx0 - 110)} ${R(ty0 - 360)}`, fin, K.coral, 9) }
    s += g(w + hv, `translate(0 ${R(pan)})`);
    cue(a + .1, 'scuttle', .4); cue(q.sol - .2, 'shimmer', .5); cue(q.kazh - .2, 'whoosh', .5); cue(q.vybr - .3, 'swish', .4); cue(q.no - .1, 'whip', .8); cue(q.ran - .1, 'dive', .5);
    cue(q.s73, 'impact', .9); cue(q.vruke, 'eyes', .6);
    return s
  }
  window.NICF2H = { back: handBack, front: handFront };

  window.NICF2 = function (T, Q0) {
    const c = (k, w, n = 0) => T[k].c(w, n);
    Q = Object.assign(Q0, {
      safe: T.safe.s(0), nep: c('safe', 'попала'), s79: T.safe.s(1), zasek: c('safe', 'засекретили'), arch: c('safe', 'архив'),
      archA: T.archive.s(0), sud: c('archive', 'суд'), otkr: c('archive', 'открыть'),
      stud: T.students.s(0), proch: c('students', 'прочитали'), stan: c('students', 'Стэнфорда'),
      juul: T.juul.s(0), dj: c('juul', 'Джул'), flesh: c('juul', 'флешку'), vnutri: T.juul.s(1), pat: c('juul', 'патенте'), rey2: c('juul', 'Рейнольдс'),
      pod: T.pod.s(0), kak: c('pod', 'как'), pach: c('pod', 'пачке'), mango: c('pod', 'манго'),
      teens: T.teens.s(0), chetv: c('teens', 'четвёртый'), rynok: T.teens.s(1), zap2: c('teens', 'записке'),
      deal: T.deal.s(0), kupil: c('deal', 'купил'), proizv: c('deal', 'производитель'), pochti: c('deal', 'Почти'), doll: c('deal', 'долларов'),
      home: T.deal.s(1), domoy: c('deal', 'домой'),
      you: T.you.s(0), sol: c('you', 'соль'), kazh: T.you.s(1), mango2: c('you', 'манго'), vybr: c('you', 'выбрали', 0), no: T.you.s(2), ran: c('you', 'раньше'), s73: c('you', 'семьдесят'), nuchto: T.you.s(3), vruke: c('you', 'руке'),
    });
    beat(Q.safe - .1, bSafe, { kind: 'down', band: K.paper, d: .6 });
    beat(Q.archA - .1, bArch, { kind: 'diag', band: K.navy3, d: .55 });
    beat(Q.stud - .1, bStud, { kind: 'up', band: K.paper, d: .6 });
    beat(Q.juul - .1, bJuul, { kind: 'diag', band: K.mint2, d: .55 });
    beat(Q.pod - .1, bPod, { kind: 'circ', band: K.amber, d: .6, x: 540, y: 800 });
    beat(Q.teens - .1, bTeens, { kind: 'up', band: K.coral, d: .6 });
    beat(Q.deal - .1, bDeal, { kind: 'down', band: K.paper, d: .6 });
    beat(Q.home - .12, bHome, { kind: 'circ', band: K.coral, d: .5, x: 540, y: 820 });
    beat(Q.you - .1, bYou, { kind: 'up', band: K.navy3, d: .6 });
  };
})();
