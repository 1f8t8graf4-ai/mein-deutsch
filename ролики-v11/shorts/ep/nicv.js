// v13 — «Что вы знаете об одноразках?» (nicv), 10.11 ночь. Рисовка — язык Coca-Cola из ep/nicf.js + nicf2.js (3 цвета, линия + заливка, растр),
// но на одном дыхании: сцена влетает в предмет прошлой сцены (смена кругом с наездом, tr.zoom), шкала времени сверху, шеврон у пачки.
// Здесь только: времена сцен из слов нового текста, порядок сцен и одна новая — «раздел фармацевтики» (сигарета превращается в капсулу).
(function () {
  'use strict';
  const { K, B, beat, frame, cue, bgc, ln, sh, ht, clip, pop, lab, big, cig, cam } = NICF, BT = NICF.beats, B2 = NICF2B;
  const E0 = window.EP, D = {};
  let Q = null;
  NICF.title = ['ЧТО ВЫ ЗНАЕТЕ ОБ', 'ОДНОРАЗКАХ?', 86]; NICF.noYear79 = true; NICF.chevron = true;

  // «…называл табачный бизнес особым разделом фармацевтики»: сигарета сжимается в капсулу, рядом вырастает аптечный крест
  function bPharma(t) {
    const q = Q, a = q.pharma, k = E(t, a + .1, .7, 'o'), m = E(t, q.tabbiz - .1, .8, 'io'), cr = pop(t, q.farm - .25, .5);
    let s = bgc(K.paper) + fill(D_.circ(540, 820, 520), K.paper2) + ht(D_.circ(540, 820, 520), 'navy', .1);
    const cap = D_.rr(-250, -80, 500, 160, 80), half = D_.rr(-250, -80, 250, 160, 0);
    s += g(cig(0, 0, 1.25 * (1 - m * .35), 0, { ember: K.navy }), at(lerp(-600, 540, k), 820, 1, -8 * (1 - m)), 1 - m);
    if (m > 0) s += g(fill(cap, K.coral) + clip(cap, fill(half, K.navy) + ht(D_.rr(-250, 0, 500, 80, 0), 'ink', .2)) + ln(cap, 1, K.navy, 7) + ln('M-190 -44H-60', 1, K.paper, 8, { op: .8 }), at(540, 820, lerp(.6, 1.15, EZ.back(m)), -18), m);
    if (cr > 0) s += g(fill('M-40 -120H40V-40H120V40H40V120H-40V40H-120V-40H-40Z', K.mint) + ln('M-40 -120H40V-40H120V40H40V120H-40V40H-120V-40H-40Z', 1, K.navy, 7), at(540, 420, .9 * cr, 0));
    s += g(lab('К. ТИГ · R.J. REYNOLDS · 1972', 540, 1180, K.navy, 36, { ls: 6 }), '', E(t, q.avtor - .1, .4));
    cue(a + .1, 'swish', .5); cue(q.tabbiz, 'whoosh', .5); cue(q.farm - .25, 'ding', .7);
    return cam(s, t, a, { z: .05, d: 5 })
  }

  window.EP = {
    P, D, clean: true, lead: .1, tr: {}, trDef: 'cut',
    cap: { size: 54, top: 1370, font: 'U', hi: K.amber, st: K.ink },
    over: t => NICF.hud(t), defs: NICF.defs,
    init(tl, SC) {
      const T = {}; SC.forEach(S => { T[S.key] = S.T; D[S.key] = frame });
      const c = (k, w, n = 0) => T[k].c(w, n), X = 1e9;
      Q = {
        xray: c('claim', 'одноразку') - .1, y50: X, tob: c('claim', 'табачные') - .15,
        memo: T.memo.s(0), sekr: c('memo', 'секретную') + .25, quote: c('memo', 'цель'), quoteE: T.memo.se(0), molR: c('memo', 'молодёжного'),
        pharma: T.pharma.s(0), avtor: c('pharma', 'автор'), tabbiz: c('pharma', 'табачный'), farm: c('pharma', 'фармацевтики'),
        harsh: T.harsh.s(0), deret: c('harsh', 'дерёт'),
        lab: T.lab.s(0), nik: c('lab', 'никотин'), kis: c('lab', 'кислотой'), salt: c('lab', 'соль') - .15, smooth: c('lab', 'проходит') - .1, doza: c('lab', 'дозе'),
        safe: T.safe.s(0), nep: c('safe', 'подошла'), s79: c('safe', 'формулу') - .3, zasek: c('safe', 'отправили') + .25, arch: c('safe', 'архив') + .55,
        archA: T.archive.s(0), sud: c('archive', 'суд'), otkr: c('archive', 'открыть'),
        stud: T.students.s(0), proch: c('students', 'нашли'), stan: c('students', 'Стэнфорда'),
        juul: T.juul.s(0), dj: c('juul', 'электронную'), flesh: c('juul', 'заряжать') + .35, vnutri: X, pat: X, rey2: X,
        pod: T.pod.s(0), kak: c('pod', 'столько'), pach: c('pod', 'пачке'), mango: X,
        teens: T.teens.s(0), chetv: c('teens', 'четвёртый'), rynok: X, zap2: X,
        deal: T.deal.s(0), kupil: c('deal', 'треть') + .2, proizv: c('deal', 'производитель') - .2, pochti: c('deal', 'тринадцать') - .2, doll: c('deal', 'долларов'),
        you: T.you.s(0), sol: c('you', 'соль'), kazh: T.you.s(1) - .15, mango2: X, vybr: c('you', 'сейчас') - .1, no: c('you', 'держите') - .1, ran: X, s73: X, nuchto: X, vruke: c('you', 'руке') - .2,
      };
      Q.rey = Q.memo + .3;
      NICF.setQ(Q); B2.setQ(Q);
      B.length = 0;
      beat(0, BT.bHook);
      beat(Q.tob, BT.bTob, { kind: 'circ', band: K.paper, d: .55, x: 540, y: 900, zoom: 2.2 });       // влёт в кристалл соли → коралл
      beat(Q.memo - .1, BT.bMemo, { kind: 'diag', band: K.navy3, d: .5 });
      beat(Q.pharma - .1, bPharma, { kind: 'circ', band: K.coral, d: .55, x: 540, y: 1130, zoom: 2.4 });   // влёт в красную обводку на листе
      beat(Q.harsh - .1, BT.bHarsh, { kind: 'circ', band: K.coral, d: .5, x: 540, y: 820, zoom: 1.6 });    // влёт в капсулу
      beat(Q.lab - .1, BT.bLab, { kind: 'diag', band: K.coral, d: .5 });
      beat(Q.smooth - .15, BT.bSmooth, { kind: 'circ', band: K.amber, d: .55, x: 540, y: 800, zoom: 2 }); // влёт в кристалл
      beat(Q.safe - .1, B2.bSafe, { kind: 'down', band: K.paper, d: .5 });
      beat(Q.archA - .1, B2.bArch, { kind: 'diag', band: K.navy3, d: .5 });
      beat(Q.stud - .1, B2.bStud, { kind: 'up', band: K.paper, d: .5 });
      beat(Q.juul - .1, B2.bJuul, { kind: 'circ', band: K.mint2, d: .55, x: 540, y: 720, zoom: 2.4 });    // влёт в экран ноутбука
      beat(Q.pod - .1, B2.bPod, { kind: 'circ', band: K.amber, d: .55, x: 700, y: 800, zoom: 2.2 });      // влёт в картридж
      beat(Q.teens - .1, B2.bTeens, { kind: 'up', band: K.coral, d: .5 });
      beat(Q.deal - .1, B2.bDeal, { kind: 'down', band: K.paper, d: .5 });
      beat(Q.you - .1, B2.bYou, { kind: 'circ', band: K.navy3, d: .55, x: 880, y: 420, zoom: 2.2 });      // влёт в пачку
      const st = [[Q.memo + .6, 0], [Q.safe + 1.2, 1], [Q.archA + 1.4, 2], [Q.stud + .6, 3], [Q.juul + .6, 4], [Q.chetv - .6, 5], [Q.you + .5, 6]], HK = [[0, 1], [Q.tob, 1]];
      st.forEach(([tt, i], j) => { if (j) HK.push([tt - .6, (i - 1) / 6]); HK.push([tt, i / 6]) }); NICF.setHud(HK);
      document.getElementById('cap').style.textTransform = 'uppercase';
    }
  };
})();
