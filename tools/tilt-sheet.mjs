// A contact sheet of the lists: every kind of course, frozen at the moments
// that matter, at about the size a phone shows them. For looking, not testing:
// a course that animates wrongly passes every test in test/.
//
//   node tools/tilt-sheet.mjs [out.png]     # default /tmp/tilt-sheet.png

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || '/tmp/tilt-sheet.png';
const PORT = 8743;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  try {
    const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const path = join(ROOT, rel);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(PORT, r));

const CASES = [
  ['break', 'miss'], ['helm', 'break'], ['unhorse', 'break'], ['miss', 'unhorse'],
  ['tilt', 'miss'], ['horse', 'break'], ['break', 'break'], ['miss', 'miss'],
];
const FRAMES = (process.env.FRAMES || '0,500,950,1080,1450,1800').split(",").map(Number);
const CELL = Number(process.env.CELL || 290);
const ONLY = process.env.ONLY ? process.env.ONLY.split(",").map(Number) : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 3000, height: 1200 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(`http://localhost:${PORT}/index.html`);
await page.evaluate(async ({ CASES, FRAMES, CELL }) => {
  const { renderScene, playTilt } = await import('/src/ui/tilt.js');
  const { courseCry } = await import('/src/engine/herald.js');
  const near = { field: 'azure', charge: 'or', division: 'perPale', cadency: 'label', mark: 'gules' };
  const far = { field: 'gules', charge: 'argent', division: 'chevron', cadency: 'none', mark: 'or' };
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;padding:10px;background:#ddd;font:12px sans-serif';
  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:110px repeat(${FRAMES.length}, ${CELL}px);gap:6px;align-items:center`;
  document.body.append(grid);
  grid.insertAdjacentHTML('beforeend', `<b></b>${FRAMES.map((t) => `<b>${t} ms</b>`).join('')}`);
  const realTimeout = window.setTimeout;
  for (const [you, him] of CASES) {
    grid.insertAdjacentHTML('beforeend', `<b>you ${you}<br>him ${him}</b>`);
    const course = { you: { aim: 'shield', seat: 'balanced', out: you }, him: { aim: 'helm', seat: 'press', out: him }, wounds: {} };
    for (const t of FRAMES) {
      const cell = document.createElement('div');
      cell.innerHTML = renderScene({ near, far, cry: courseCry(course), playing: true, uid: `c${Math.random().toString(36).slice(2, 7)}` });
      grid.append(cell);
      const wrap = cell.querySelector('.scene-wrap');
      window.setTimeout = () => 0; // the sheet keeps every course where it is put
      playTilt(wrap, course, { cheer: true });
      window.setTimeout = realTimeout;
      for (const a of wrap.getAnimations({ subtree: true })) { a.pause(); a.currentTime = t; }
    }
  }
}, { CASES: ONLY ? CASES.filter((_, i) => ONLY.includes(i)) : CASES, FRAMES, CELL });
await page.waitForTimeout(300);
const box = await page.evaluate(() => { const r = document.body.getBoundingClientRect(); return { w: Math.ceil(r.width), h: Math.ceil(document.body.scrollHeight) }; });
await page.setViewportSize({ width: Math.min(box.w, 3000), height: box.h });
await page.screenshot({ path: OUT, fullPage: true });
console.log(`${OUT}  ${CASES.length} courses x ${FRAMES.length} moments`);
await browser.close();
server.close();
