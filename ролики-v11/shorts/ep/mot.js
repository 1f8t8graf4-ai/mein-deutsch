window.TAB = {"smoking": ["M3 14a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -2", "M8 13l0 4", "M16 5v.5a2 2 0 0 0 2 2a2 2 0 0 1 2 2v.5"], "flask": ["M9 3l6 0", "M10 9l4 0", "M10 3v6l-4 11a.7 .7 0 0 0 .5 1h11a.7 .7 0 0 0 .5 -1l-4 -11v-6"], "school": ["M22 9l-10 -4l-10 4l10 4l10 -4v6", "M6 10.6v5.4a6 3 0 0 0 12 0v-5.4"], "coin": ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M14.8 9a2 2 0 0 0 -1.8 -1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1 -1.8 -1", "M12 7v10"], "lock": ["M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6", "M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0", "M8 11v-4a4 4 0 1 1 8 0v4"], "file-text": ["M14 3v4a1 1 0 0 0 1 1h4", "M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2", "M9 9l1 0", "M9 13l6 0", "M9 17l6 0"], "dna-2": ["M17 3v1c-.01 3.352 -1.68 6.023 -5.008 8.014c-3.328 1.99 3.336 -2 .008 -.014c-3.328 1.99 -5 4.662 -5.008 8.014v1", "M17 21.014v-1c-.01 -3.352 -1.68 -6.023 -5.008 -8.014c-3.328 -1.99 3.336 2 .008 .014c-3.328 -1.991 -5 -4.662 -5.008 -8.014v-1", "M7 4h10", "M7 20h10", "M8 8h8", "M8 16h8"], "atom": ["M12 12v.01", "M19.071 4.929c-1.562 -1.562 -6 .337 -9.9 4.243c-3.905 3.905 -5.804 8.337 -4.242 9.9c1.562 1.561 6 -.338 9.9 -4.244c3.905 -3.905 5.804 -8.337 4.242 -9.9", "M4.929 4.929c-1.562 1.562 .337 6 4.243 9.9c3.905 3.905 8.337 5.804 9.9 4.242c1.561 -1.562 -.338 -6 -4.244 -9.9c-3.905 -3.905 -8.337 -5.804 -9.9 -4.242"], "pill": ["M4.5 12.5l8 -8a4.94 4.94 0 0 1 7 7l-8 8a4.94 4.94 0 0 1 -7 -7", "M8.5 8.5l7 7"], "device-usb": ["M7 8h10v8a5 5 0 0 1 -10 0l0 -8", "M9 8v-5h6v5"]};
// Тест движка «моушн-дизайн» (11.11, по гайду Gemini через Андрея), 9 с, без озвучки. Только lib.js.
// Что проверяем: 1) фон из слоёв: радиальный свет + сетка с параллаксом + кольца + большой год + пылинки, сверху виньетка и зерно (feTurbulence);
// 2) предмет в 2,5D: двухтоновая заливка, единый контур, блик, мягкая тень (feDropShadow), свечение активных линий;
// 3) движение: пружина с перелётом, линии рисуют сами себя, в кадре всегда живут 3 слоя, камера дрейфует и наезжает;
// 4) смена сцены — пролёт камерой насквозь (в штамп); 5) удар штампа со встряской; 6) плашка под подписью;
// 7) готовые векторные значки — Tabler Icons (MIT), window.TAB = {имя: [пути]} (вшиты сверху файла).
(function () {
  'use strict';
  const C = { n0: '#070B24', n1: '#1A2466', n2: '#2B3890', coral: '#EE4B5B', coral2: '#B92F45', paper: '#F6F0E6', paper2: '#D9CEBC', amber: '#FFB238', amber2: '#D9861A', mint: '#5FD3B3', mint2: '#2E9E84', ink: '#0B0F26' };
  P = { bg: C.n0, paper: C.paper, ink: C.ink, line: C.paper, a1: C.amber, a2: C.coral };
  const MONO = "FreeMono,'Liberation Mono',monospace";
  const spring = k => k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-6.5 * k) * Math.cos(11 * k);   // перелёт ≈ 1,1 и возврат
  const expoIn = k => k <= 0 ? 0 : Math.pow(2, 10 * (clamp(k) - 1));
  const sp = (t, a, d = .7) => spring((t - a) / d);
  const draw = (d, k, c, w = 5, glowOn = false, extra = '') => k <= 0 ? '' : `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${R(1000 * (1 - clamp(k))) / 1000}"${glowOn ? ' filter="url(#gl)"' : ''} ${extra}/>`;
  const icon = (name, x, y, s, k, c, op = 1) => g((window.TAB[name] || []).map((d, i) => draw(d, k * 1.3 - i * .12, c, 1.6)).join(''), `translate(${R(x - 12 * s)} ${R(y - 12 * s)}) scale(${s})`, op);
  const defs = () => `<filter id="ds" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000" flood-opacity=".5"/></filter>` +
    `<filter id="gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<radialGradient id="vg" cx=".5" cy=".46" r=".75"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>` +
    `<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".35" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient>`;
  // фон из слоёв; cx — сдвиг камеры (параллакс), yr — большой бледный текст
  function back(t, c0, c1, yr, cx = 0) {
    const [id, gd] = rgrad([[0, c1, 1], [1, c0, 1]]);
    let s = `<rect x="-400" y="-400" width="1880" height="2720" fill="${c0}"/>` + gd + `<ellipse cx="540" cy="820" rx="900" ry="1100" fill="url(#${id})"/>`;
    let gr = ''; const ox = (cx * .35 + t * 7) % 90, oy = (t * 4) % 90;
    for (let x = -90; x <= 1170; x += 90) gr += `M${R(x + ox)} -100V2020`; for (let y = -90; y <= 2010; y += 90) gr += `M-100 ${R(y + oy)}H1180`;
    s += `<path d="${gr}" stroke="${C.paper}" stroke-width="2" opacity=".06" fill="none"/>`;
    s += g([300, 430, 580].map((r, i) => `<circle cx="540" cy="820" r="${r}" fill="none" stroke="${C.paper}" stroke-width="2" stroke-dasharray="${6 + i * 6} ${18 + i * 10}" opacity=".1" transform="rotate(${R(t * (i % 2 ? -5 : 4) + i * 30)} 540 820)"/>`).join(''), `translate(${R(cx * .5)} 0)`);
    s += tx(yr, 540 + cx * .6, 1010, { f: 'U', w: 800, s: 400, c: C.paper, op: .055 });
    return s
  }
  function dust(t, n = 18) { let s = ''; for (let i = 0; i < n; i++) { const u = (rnd(i + 2) + t * (.02 + rnd(i) * .03)) % 1; s += `<circle cx="${R(rnd(i + 40) * 1080 + Math.sin(t * .7 + i) * 26)}" cy="${R(1900 - u * 1900)}" r="${R(2.5 + rnd(i + 9) * 4)}" fill="${C.paper}" opacity="${R((.15 + rnd(i + 5) * .15) * Math.sin(Math.PI * u))}"/>` } return s }
  const top = t => `<rect width="1080" height="1920" fill="url(#vg)"/><filter id="gn" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${Math.floor(t * 12) % 9 + 1}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .33 .33 .33 0 -.28"/></filter><rect width="1080" height="1920" filter="url(#gn)" opacity=".16"/>`;
  const caption = (s0, k) => k <= 0 ? '' : g(`<rect x="0" y="1260" width="1080" height="660" fill="url(#plate)"/>` + tx(s0, 540, 1470, { f: 'U', w: 800, s: s0.length > 18 ? 40 : 52, c: C.paper, st: C.ink, sw: 10 }), `translate(0 ${R(30 * (1 - clamp(k)))})`, clamp(k));

  // --- сцена A: секретная записка 1973 — лист в 2,5D, строки рисуются, маркер, штамп с ударом
  const DOC = 'M-270 -360H170L270 -260V360H-270Z', FOLD = 'M170 -360V-260H270Z';
  function sceneA(t) {
    const cam = 1 + .1 * clamp(t / 4), dx = Math.sin(t * .5) * 14, hit = 2.35, shk = t > hit && t < hit + .2 ? [(rnd(Math.floor(t * 60)) - .5) * 26, (rnd(Math.floor(t * 60) + 7) - .5) * 26] : [0, 0];
    let s = back(t, C.n0, C.n1, '1973', dx) + icon('smoking', 170, 420, 9, (t - .6) / 1.2, C.paper, .16) + icon('pill', 900, 1240, 8, (t - 1.0) / 1.2, C.paper, .14) + dust(t);
    const up = sp(t, .15, .9), y = lerp(2300, 860, up), rot = lerp(-14, -3, up) + Math.sin(t * .9) * .6;
    let d = `<g filter="url(#ds)"><path d="${DOC}" fill="${C.paper}"/></g>` + fill('M60 -360H170L270 -260V360H-40Z', C.paper2, .55) + fill(FOLD, C.paper2) + `<path d="${DOC}" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>` + draw('M170 -360V-260H270', 1, C.ink, 5) + draw('M-254 -344V344', 1, '#fff', 5, false, 'opacity=".7"');
    d += tx('R.J. REYNOLDS TOBACCO CO.', -226, -270, { f: MONO, w: 700, s: 27, c: C.ink, a: 'start', op: clamp((t - .9) * 3) }) + tx('2 ФЕВРАЛЯ 1973', -226, -232, { f: MONO, w: 700, s: 27, c: C.coral2, a: 'start', op: clamp((t - 1.05) * 3) });
    [[-170, 420], [-120, 360], [-70, 440], [-20, 300]].forEach(([yy, w], i) => { d += draw(`M-226 ${yy}h${w}`, (t - 1.0 - i * .12) / .35, C.ink, 7, false, 'opacity=".35"') });
    d += tx('МОЛОДЁЖНЫЙ РЫНОК', -226, 86, { f: MONO, w: 700, s: 40, c: C.ink, a: 'start', op: clamp((t - 1.5) * 4) }) + [[150, 380], [200, 300]].map(([yy, w], i) => draw(`M-226 ${yy}h${w}`, (t - 1.5 - i * .12) / .35, C.ink, 7, false, 'opacity=".35"')).join('');
    d += draw('M-244 76C-150 22 150 20 232 60C276 96 150 128 -30 126C-180 124 -280 104 -246 58', (t - 1.75) / .5, C.coral, 8, true);
    const st = clamp((t - hit + .18) / .18), stS = lerp(2.2, 1, st * st), stO = clamp(st * 3);   // штамп: 2,2 → 1 за 0,18 с
    if (st > 0) d += g(`<rect x="-200" y="-56" width="400" height="112" rx="12" fill="none" stroke="${C.coral}" stroke-width="10"/><rect x="-186" y="-42" width="372" height="84" rx="6" fill="none" stroke="${C.coral}" stroke-width="3"/>` + tx('СЕКРЕТНО', 0, 22, { f: 'O', w: 700, s: 66, c: C.coral, ls: 6 }), `translate(60 -150) rotate(-9) scale(${R(stS * 100) / 100})`, stO);
    if (t > hit) { const pk = (t - hit) / .5; if (pk < 1) d += `<circle cx="60" cy="-150" r="${R(120 + pk * 420)}" fill="none" stroke="${C.coral}" stroke-width="${R(12 * (1 - pk))}" opacity="${R(1 - pk)}"/>` }
    s += g(d, `translate(${R(540 + dx * 1.4)} ${R(y)}) rotate(${R(rot)}) scale(1.22)`) + caption('СЕКРЕТНАЯ ЗАПИСКА', (t - 1.2) / .3);
    return g(s, `translate(${R(shk[0])} ${R(shk[1])}) ` + about(540, 860, cam))
  }
  // --- сцена B: колба в 2,5D, жидкость с пузырями, струя кислоты, кристалл на пружине, выноски рисуются
  const FL = 'M-52 -330H52V-120L196 190C222 246 184 296 126 296H-126C-184 296 -222 246 -196 190L-52 -120Z';
  function sceneB(t, t0) {
    const u = t - t0, cam = 1.04 + .08 * clamp(u / 5), dx = Math.sin(t * .5 + 1) * 16, pour = clamp((u - 1.0) / 1.3), lv = lerp(120, 10, clamp((u - 1.1) / 1.6)), mixk = clamp((u - 1.6) / 1.0), cr = sp(t, t0 + 2.9, .8);
    let s = back(t, '#0A0E2C', C.n2, 'C10H14N2'.slice(0, 3), dx) + icon('atom', 180, 470, 9, (u - .3) / 1.2, C.paper, .16) + icon('dna-2', 900, 1260, 8, (u - .6) / 1.2, C.paper, .14) + dust(t);
    const en = sp(t, t0 + .05, .8), fx = 540 + dx * 1.4, fy = lerp(2400, 940, en), bob = Math.sin(t * 2) * 8;
    const liq = mixk > .5 ? C.paper : C.amber, liq2 = mixk > .5 ? C.paper2 : C.amber2, id = uid();
    let f = `<ellipse cx="0" cy="322" rx="230" ry="26" fill="#000" opacity=".35"/><clipPath id="${id}"><path d="${FL}"/></clipPath>`;
    f += `<path d="${FL}" fill="${C.paper}" opacity=".1"/><g clip-path="url(#${id})"><rect x="-240" y="${R(lv)}" width="480" height="400" fill="${liq}"/><rect x="0" y="${R(lv)}" width="240" height="400" fill="${liq2}"/><path d="M-240 ${R(lv)}q60 ${R(-14 - Math.sin(t * 4) * 8)} 120 0t120 0t120 0t120 0" fill="none" stroke="#fff" stroke-width="6" opacity=".5"/>`;
    for (let i = 0; i < 9; i++) { const b = (rnd(i) + t * (.35 + rnd(i + 3) * .3)) % 1; f += `<circle cx="${R(-150 + rnd(i + 11) * 300)}" cy="${R(290 - b * (290 - lv))}" r="${R(5 + rnd(i + 5) * 9)}" fill="none" stroke="#fff" stroke-width="3" opacity="${R(.55 * (1 - b))}"/>` }
    f += `</g><path d="${FL}" fill="none" stroke="${C.paper}" stroke-width="7" stroke-linejoin="round"/>` + draw('M-32 -310V-130L-168 180', 1, '#fff', 6, false, 'opacity=".4"') + `<ellipse cx="0" cy="-330" rx="62" ry="12" fill="none" stroke="${C.paper}" stroke-width="7"/>`;
    s += g(`<g filter="url(#ds)">${f}</g>`, `translate(${R(fx)} ${R(fy + bob)}) scale(1.05)`);
    // пробирка с кислотой наклоняется и льёт светящуюся струю
    const tk = sp(t, t0 + .5, .7), ang = lerp(0, -62, clamp((u - .8) / .5)), TX = fx + 300, TY = fy - 500 + bob;
    s += g(`<g filter="url(#ds)"><path d="M-34 -150V110A34 34 0 0 0 34 110V-150Z" fill="${C.paper}" opacity=".12"/><path d="M-34 ${R(-20 + pour * 110)}V110A34 34 0 0 0 34 110V${R(-20 + pour * 110)}Z" fill="${C.mint}"/><path d="M0 ${R(-20 + pour * 110)}V144A34 34 0 0 0 34 110V${R(-20 + pour * 110)}Z" fill="${C.mint2}"/><path d="M-34 -150V110A34 34 0 0 0 34 110V-150M-46 -150H46" fill="none" stroke="${C.paper}" stroke-width="7" stroke-linecap="round"/></g>`, `translate(${R(TX)} ${R(lerp(-400, TY, tk))}) rotate(${R(ang)})`);
    if (pour > 0 && pour < 1) s += draw(`M${R(TX - 150)} ${R(TY - 60)}C${R(TX - 250)} ${R(TY - 40)} ${R(fx + 10)} ${R(TY + 60)} ${R(fx)} ${R(fy - 300 + bob)}V${R(fy + lv + bob)}`, pour * 3, C.mint, 12, true);
    // выноски
    s += draw(`M${R(fx - 200)} ${R(fy + 180)}H${R(fx - 330)}V${R(fy + 60)}`, (u - .9) / .5, C.amber, 4, true) + tx('НИКОТИН', fx - 330, fy + 30, { f: 'O', w: 700, s: 38, c: C.amber, ls: 5, op: clamp((u - 1.3) * 3) });
    s += draw(`M${R(TX + 40)} ${R(TY + 60)}V${R(TY + 190)}`, (u - 1.2) / .4, C.mint, 4, true) + tx('КИСЛОТА', TX + 40, TY + 240, { f: 'O', w: 700, s: 38, c: C.mint, ls: 5, op: clamp((u - 1.5) * 3) });
    // кристалл соли: кубик с тремя гранями разного тона, вылетает на пружине
    if (cr > 0) {
      const cy0 = fy - 520 + bob - 40 * Math.sin(t * 2.2), pk = (u - 2.9) / .6;
      if (pk > 0 && pk < 1) s += `<circle cx="${R(fx)}" cy="${R(cy0)}" r="${R(90 + pk * 380)}" fill="none" stroke="${C.paper}" stroke-width="${R(10 * (1 - pk))}" opacity="${R(1 - pk)}"/>`;
      s += g(`<g filter="url(#ds)"><path d="M0 -120L104 -60L0 0L-104 -60Z" fill="#fff"/><path d="M-104 -60L0 0V120L-104 60Z" fill="${C.paper}"/><path d="M104 -60L0 0V120L104 60Z" fill="${C.paper2}"/><path d="M0 -120L104 -60V60L0 120L-104 60V-60ZM0 0V120M0 0L104 -60M0 0L-104 -60" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/><path d="M0 -44L38 -22L0 0L-38 -22Z" fill="${C.amber}" filter="url(#gl)"/></g>`, `translate(${R(fx)} ${R(cy0)}) scale(${R(cr * 1.15 * 100) / 100}) rotate(${R((1 - cr) * 40)})`);
    }
    s += caption('НИКОТИН + КИСЛОТА = СОЛЬ', (u - 3.0) / .3);
    return g(s, about(540, 900, cam))
  }
  const T0 = 4.2, ZA = 3.55;   // пролёт насквозь: наезд в штамп с ZA, новая сцена — с T0
  window.EP = { P, D: { a: t => {
    let s;
    if (t < T0) { const z = expoIn((t - ZA) / (T0 - ZA)); s = g(sceneA(t), about(630, 640, 1 + 34 * z)) + (z > 0 ? `<rect width="1080" height="1920" fill="${C.coral}" opacity="${R(clamp(z * 2.2))}"/>` : '') }
    else { const k = clamp((t - T0) / .55), e = spring(k); s = `<rect width="1080" height="1920" fill="${C.coral}"/>` + `<clipPath id="zc"><circle cx="540" cy="900" r="${R(1500 * expoIn(k * .6 + .4))}"/></clipPath><g clip-path="url(#zc)">${g(sceneB(t, T0), about(540, 900, lerp(1.5, 1, e)))}</g>` }
    return s + top(t)
  } }, clean: true, noCap: true, lead: 0, tr: {}, trDef: 'cut', defs };
})();
