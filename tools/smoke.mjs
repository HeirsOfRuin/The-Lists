// Drive the real page in a real browser, at phone width.
//
// The suite in test/ cannot see any of what this checks: whether the page
// throws on load, whether a button does nothing, whether a screen renders
// empty, whether the layout scrolls sideways on a phone. Each of those is
// invisible to an engine test and obvious within seconds of opening the thing.
//
//   node tools/smoke.mjs                 # serves the repo, plays two tourneys
//   SHOTS=/some/dir node tools/smoke.mjs # where the screenshots go

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
if (!chromium) throw new Error(`Could not load chromium from ${PW}`);
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const SHOTS = process.env.SHOTS || '/tmp/shots';
const PORT = 8741;
await mkdir(SHOTS, { recursive: true });

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};
const server = createServer(async (req, res) => {
  try {
    const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const path = join(ROOT, rel === '/' ? 'index.html' : rel);
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
// Webfonts are a nicety with a fallback stack; a sandbox with no route to
// them is not a failure of the game.
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !/fonts\.g|ERR_FAILED|net::/.test(m.text())) errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : '!!  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures += 1;
}
function report(step) {
  if (!errors.length) return true;
  console.log(`\n!! ${errors.length} error(s) by "${step}":`);
  for (const e of [...new Set(errors)].slice(0, 8)) console.log('   ' + e);
  errors.length = 0;
  failures += 1;
  return false;
}
async function overflow() {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
async function textOf(sel) { return (await page.locator(sel).first().innerText()).trim(); }

await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.reload({ waitUntil: 'load' });
await page.screenshot({ path: `${SHOTS}/1-title.png` });
check('title screen renders', (await page.locator('[data-act="new"]').count()) === 1);
report('load');

// Creation: a name, then ten questions, taking a different option each time.
await page.click('[data-act="new"]');
check('name step renders', (await page.locator('#given').count()) === 1);
await page.fill('#given', 'Smoke');
await page.click('[data-act="name-next"]');
for (let q = 0; q < 10; q++) {
  const opts = page.locator('[data-opt]');
  const n = await opts.count();
  if (!n) { check(`question ${q + 1} offers options`, false); break; }
  if (q === 3) await page.screenshot({ path: `${SHOTS}/2-question.png` });
  await opts.nth(q % n).click();
}
check('creation reaches the roll', (await page.locator('[data-act="ride-out"]').count()) === 1);
const sheetName = await textOf('.subhead');
check('the roll names the knight', /Sir Smoke/.test(sheetName), sheetName);
await page.screenshot({ path: `${SHOTS}/3-roll.png`, fullPage: true });
check('no sideways scroll on the roll', (await overflow()) <= 1);
report('creation');

// Two tourneys, start to finish.
let courses = 0;
for (let t = 1; t <= 2; t++) {
  if (t === 1) await page.click('[data-act="ride-out"]');
  await page.waitForSelector('[data-act="enter"]', { timeout: 4000 });
  if (t === 1) await page.screenshot({ path: `${SHOTS}/4-arrival.png`, fullPage: true });
  const purseBefore = await textOf('.fact .v');
  await page.click('[data-act="enter"]');
  let guard = 0;
  let shotBout = false;
  while (guard++ < 60) {
    if (await page.locator('[data-act="run"]').count()) {
      const pct = await textOf('.reckon .pct');
      if (!/^[<>]?\d+%$/.test(pct)) check('the reckoning shows a percentage', false, pct);
      if (courses === 1 && !shotBout) {
        // Try the herald and the squire once each.
        if (await page.locator('[data-read]:not([disabled])').count()) await page.click('[data-read]');
        await page.click('[data-act="squire"]');
        await page.screenshot({ path: `${SHOTS}/5-bout.png`, fullPage: true });
        check('no sideways scroll in the lists', (await overflow()) <= 1);
        shotBout = true;
      } else if (courses % 3 === 0) {
        await page.click('[data-aim="helm"]');
        await page.click('[data-seat="press"]');
      }
      const scoreBefore = await textOf('.tilt .score .n');
      const pipsBefore = await page.locator('.pips i.done').count();
      await page.click('[data-act="run"]');
      await page.waitForTimeout(700);
      courses += 1;
      const pipsAfter = await page.locator('.pips i.done').count();
      if (pipsAfter <= pipsBefore && (await page.locator('[data-act="run"]').count())) {
        check('a course advances the bout', false, `score ${scoreBefore}`);
        break;
      }
    } else if (await page.locator('[data-act="continue"]').count()) {
      if (t === 1 && !(await page.locator('.verdict').count())) check('a bout result shows a verdict', false);
      await page.screenshot({ path: `${SHOTS}/6-result.png`, fullPage: true });
      await page.click('[data-act="continue"]');
    } else if (await page.locator('[data-act="ride-on"]').count()) {
      break;
    } else {
      check('some way forward is always offered', false, (await page.locator('main').innerText()).slice(0, 200));
      break;
    }
  }
  const done = (await page.locator('[data-act="ride-on"]').count()) === 1;
  check(`tourney ${t} reaches the prize-giving`, done);
  if (!done) break;
  const entry = await textOf('.entry');
  check(`tourney ${t} has a Book of Feats entry`, entry.length > 40 && !/undefined|NaN/.test(entry), entry.slice(0, 70) + '…');
  if (t === 1) await page.screenshot({ path: `${SHOTS}/7-done.png`, fullPage: true });
  const purseAfter = await textOf('.fact .v');
  check(`tourney ${t} moved the purse`, purseAfter !== purseBefore, `${purseBefore} -> ${purseAfter}`);
  await page.click('[data-act="ride-on"]');
  report(`tourney ${t}`);
}
check('courses were run in the browser', courses >= 2, `${courses} courses`);

// The other tabs, never silently empty.
for (const t of ['knight', 'book']) {
  await page.click(`[data-tab="${t}"]`);
  await page.waitForTimeout(80);
  const text = (await page.locator('main').innerText()).trim();
  check(`tab "${t}" has content`, text.length > 80, `${text.length} chars`);
  await page.screenshot({ path: `${SHOTS}/tab-${t}.png`, fullPage: true });
  check(`no sideways scroll on "${t}"`, (await overflow()) <= 1);
}
report('tabs');

// Reload: the career must come back from storage, mid-season.
await page.reload({ waitUntil: 'load' });
const resumed = (await page.locator('.banner .name').count()) === 1;
check('a reload resumes the career', resumed);

// Dark theme renders with its own ground.
await page.emulateMedia({ colorScheme: 'dark' });
await page.click('[data-tab="lists"]');
await page.waitForTimeout(80);
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('dark theme paints its own ground', bg === 'rgb(14, 26, 47)', bg);
await page.screenshot({ path: `${SHOTS}/8-dark.png`, fullPage: true });
report('dark');

await browser.close();
server.close();
console.log(`\nscreenshots in ${SHOTS}`);
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('all checks passed');
