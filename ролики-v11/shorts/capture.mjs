// Кадры stage.html → ffmpeg (shorts v2). <ep> = mrbeast-en, nicotine-ru …
//   node capture.mjs <ep> shots 1.5,10,20      → out/<ep>/shots/*.png
//   node capture.mjs <ep> video [fps] [tabs]   → out/<ep>/video.mp4
// Основа — nightfabel/capture.mjs; здесь несколько вкладок рисуют кадры параллельно.
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs'; import path from 'path'; import url from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node-tools/node_modules', ...((process.env.NODE_PATH || '').split(':'))] }));
const here = path.dirname(url.fileURLToPath(import.meta.url));
const [ep, mode, arg, tabsArg] = process.argv.slice(2);
const OUT = path.join(here, 'out', ep);
const TL = JSON.parse(fs.readFileSync(path.join(OUT, 'timeline.json'), 'utf8'));
const b = await chromium.launch();
const errs = [];
async function page() {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file://' + path.join(here, 'stage.html'));
  await p.evaluate(ep => window.loadEp(ep), ep.replace(/-(en|ru)$/, ''));
  await p.evaluate(async () => {
    for (const f of ['600 10px M', '800 10px M', '500 10px O', '700 10px O', '700 10px U', '800 10px U']) { await document.fonts.load(f, 'aя'); }
    await document.fonts.ready;
  });
  await p.evaluate(tl => window.init(tl), TL);
  const sz = await p.evaluate(() => window.EP.size || null); if (sz) await p.setViewportSize({ width: sz[0], height: sz[1] });  // горизонтальный кадр
  return p
}
if (mode === 'cues') {
  // звуки по событиям: пройти все кадры без снимков (быстро) и собрать cue() → out/<ep>/cues.json
  const p = await page(), fps = Number(arg || 20), N = Math.ceil(TL.dur * fps);
  const cues = await p.evaluate(([N, fps]) => { for (let i = 0; i <= N; i++) window.render(i / fps); return Object.values(window.CUES || {}).sort((a, b) => a[0] - b[0]) }, [N, fps]);
  fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify(cues));
  console.log(ep, 'звуков по событиям:', cues.length);
} else if (mode === 'shots') {
  const p = await page();
  const dir = path.join(OUT, 'shots'); fs.mkdirSync(dir, { recursive: true });
  for (const t of arg.split(',').map(Number)) {
    await p.evaluate(t => window.render(t), t);
    await p.screenshot({ path: path.join(dir, `f${t.toFixed(2).padStart(6, '0')}.png`) });
  }
} else {
  const fps = Number(arg || 30), N = Math.ceil(TL.dur * fps), K = Number(tabsArg || 4);
  const P = await Promise.all([...Array(K)].map(page));
  const outf = path.join(OUT, 'video.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-r', String(fps), outf], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  // окно кадров: K вкладок рисуют i, i+1 … параллельно, пишем по порядку
  for (let i = 0; i < N; i += K) {
    const bufs = await Promise.all(P.map(async (p, j) => {
      const f = i + j; if (f >= N) return null;
      await p.evaluate(t => window.render(t), f / fps);
      return p.screenshot({ type: 'jpeg', quality: 92 })
    }));
    for (const buf of bufs) if (buf && !ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 < K) console.log(`${ep}: кадр ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)} с`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
if (errs.length) console.log('ОШИБКИ:', [...new Set(errs)].slice(0, 10).join('\n'));
await b.close();
