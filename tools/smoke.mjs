// Drive the real page in a real browser, at phone width.
//
// The suite in test/ cannot see any of what this checks: whether the page
// throws, whether a button does nothing, whether a screen renders empty,
// whether the layout scrolls sideways on a phone, whether an old save opens.
//
//   node tools/smoke.mjs                 # serves the repo, plays a year and more
//   SHOTS=/some/dir node tools/smoke.mjs # where the screenshots go

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
if (!chromium) throw new Error(`Could not load chromium from ${PW}`);
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { newGame, serialize } from '../src/engine/state.js';
import { randomAnswers, randomName } from '../src/engine/knight.js';
import { makeRng } from '../src/engine/rng.js';
import { step } from '../sim/bot.js';

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
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const has = async (sel) => (await page.locator(sel).count()) > 0;
const text = async (sel) => (await page.locator(sel).first().innerText()).trim();

await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.reload({ waitUntil: 'load' });
check('title screen renders', await has('[data-act="new"]'));
report('load');

// Creation.
await page.click('[data-act="new"]');
await page.fill('#given', 'Smoke');
await page.click('[data-act="name-next"]');
let asked = 0;
for (let q = 0; q < 12; q++) {
  const opts = page.locator('[data-opt]');
  const n = await opts.count();
  if (!n) break;
  if (q === 0) await page.screenshot({ path: `${SHOTS}/0-question.png`, fullPage: true });
  await opts.nth(q % n).click();
  asked += 1;
}
check('creation asks six questions', asked === 6, `${asked} asked`);
check('creation reaches the roll', await has('[data-act="ride-out"]'));
check('no sideways scroll on the roll', (await overflow()) <= 1);
await page.click('[data-act="ride-out"]');
check('the month opens with a map', await has('svg.map'));
await page.screenshot({ path: `${SHOTS}/1-month.png`, fullPage: true });
report('creation');

// Play: whatever the screen offers, in a fixed order of preference.
const seen = new Set();
const shot = async (kind) => {
  if (seen.has(kind)) return;
  seen.add(kind);
  await page.screenshot({ path: `${SHOTS}/screen-${kind}.png`, fullPage: true });
  const o = await overflow();
  check(`no sideways scroll: ${kind}`, o <= 1, o > 1 ? `${o}px` : '');
};
const startYear = await text('.banner .fact:last-child .k');
let steps = 0;
let courses = 0;
let cards = 0;
let winters = 0;
for (; steps < 400; steps++) {
  if (await has('[data-answer]')) { await shot('card'); await page.locator('[data-answer]').first().click(); cards += 1; continue; }
  if (await has('[data-act="enter"]')) { await shot('arrival'); await page.click('[data-act="enter"]'); continue; }
  if (await has('[data-act="run"]')) {
    await shot('bout');
    if (courses % 4 === 0) { await page.click('[data-act="run"]'); await page.waitForTimeout(700); }
    else await page.click('[data-act="auto"]');
    courses += 1;
    continue;
  }
  if (await has('[data-act="continue"]')) { await shot('result'); await page.click('[data-act="continue"]'); continue; }
  if (await has('[data-act="leave"]')) {
    await shot('done');
    const entry = await text('.entry');
    if (/undefined|NaN/.test(entry)) check('the herald writes a clean entry', false, entry);
    await page.click('[data-act="leave"]');
    continue;
  }
  if (await has('[data-act="spring"]')) {
    await shot('winter');
    if (await has('[data-squire]')) await page.locator('[data-squire]').first().click();
    await page.click('[data-act="spring"]');
    winters += 1;
    if (winters >= 2) break;
    continue;
  }
  if (await has('[data-ride]')) { await page.locator('[data-ride]').first().click(); continue; }
  if (await has('[data-act="train"]')) { await page.click('[data-act="train"]'); continue; }
  if (await has('[data-act="new-after-end"]')) { check('career ended (a legitimate outcome)', true); break; }
  check('some way forward is always offered', false, (await page.locator('main').innerText()).slice(0, 200));
  break;
}
check('played through winter in the browser', winters >= 1, `${steps} steps, ${courses} bouts or courses, ${cards} cards, ${winters} winters`);
check('cards came up in play', cards >= 3);
const endYear = await text('.banner .fact:last-child .k');
check('the year advanced', endYear !== startYear, `${startYear} -> ${endYear}`);
report('play');

for (const t of ['knight', 'field', 'book']) {
  await page.click(`[data-tab="${t}"]`);
  await page.waitForTimeout(60);
  const body = (await page.locator('main').innerText()).trim();
  check(`tab "${t}" has content`, body.length > 100, `${body.length} chars`);
  await page.screenshot({ path: `${SHOTS}/tab-${t}.png`, fullPage: true });
  check(`no sideways scroll on "${t}"`, (await overflow()) <= 1);
}
report('tabs');

// Reload: the career must come back from storage.
await page.reload({ waitUntil: 'load' });
check('a reload resumes the career', await has('.banner .name'));

// A phase-one save opens in this build.
const v1 = await readFile(join(ROOT, 'test/fixtures/v1-save.json'), 'utf8');
await page.evaluate((raw) => localStorage.setItem('the-lists.save.v1', raw), v1);
await page.reload({ waitUntil: 'load' });
const name = await has('.banner .name') ? await text('.banner .name') : '';
check('a phase-one save opens and resumes', /David/.test(name), name);
check('it opens on the map', await has('svg.map'));
await page.screenshot({ path: `${SHOTS}/2-migrated.png`, fullPage: true });
report('migration');

// The tenth year: a career played by the reference bot up to Lady Day, then
// the king's death, the muster, the ford, the siege and the battle in the page.
function warSave() {
  for (let seed = 5; seed < 40; seed++) {
    const rng = makeRng(seed * 7919 + 1);
    const s = newGame({ seed, answers: randomAnswers(rng), name: randomName(rng) });
    while (s.status === 'active' && !s.realm.war) step(s, 'squire', rng);
    if (s.status === 'active' && s.pending) return serialize(s);
  }
  throw new Error('no career reached the war');
}
await page.evaluate((raw) => localStorage.setItem('the-lists.save.v1', raw), warSave());
await page.reload({ waitUntil: 'load' });
check('a career at war opens', await has('.cardscene'));
check('the king is dead', /king is dead/i.test(await text('.cardscene')));
await page.screenshot({ path: `${SHOTS}/4-war-card.png`, fullPage: true });
let battleSeen = false;
let warSteps = 0;
for (; warSteps < 60; warSteps++) {
  if (await has('[data-answer]')) {
    const scene = await text('.cardscene');
    if (/shallow valley|banners from the hill/.test(scene)) {
      battleSeen = true;
      check('the battle shows its odds on the button', /chance of the field: \d+%/.test(scene));
      check('and the risk of death', /Risk of death: \d+%|No risk to you/.test(scene));
      await page.screenshot({ path: `${SHOTS}/5-battle.png`, fullPage: true });
    }
    await page.locator('[data-answer]').last().click();
    continue;
  }
  if (battleSeen && await has('.realm')) break;
  if (await has('[data-act="new-after-end"]')) { check('the war ended the career (a legitimate outcome)', true); break; }
  if (await has('.realm') && !battleSeen) {
    if (warSteps === 1 || warSteps === 2) await page.screenshot({ path: `${SHOTS}/6-realm.png`, fullPage: true });
    await page.click('[data-act="pass"]');
    continue;
  }
  if (await has('[data-act="spring"]')) break;
  check('some way forward is offered in the war', false, (await page.locator('main').innerText()).slice(0, 200));
  break;
}
check('the battle was reached in the page', battleSeen, `${warSteps} steps`);
check('no sideways scroll in the war', (await overflow()) <= 1);
await page.click('[data-tab="knight"]');
await page.waitForTimeout(60);
check('the Knight tab shows standing in the realm', /Standing in the realm/i.test(await page.locator('main').innerText()));
await page.screenshot({ path: `${SHOTS}/7-standing.png`, fullPage: true });
await page.click('[data-tab="now"]');
report('war');

await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(80);
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('dark theme paints its own ground', bg === 'rgb(14, 26, 47)', bg);
await page.screenshot({ path: `${SHOTS}/3-dark.png`, fullPage: true });
report('dark');

await browser.close();
server.close();
console.log(`\nscreenshots in ${SHOTS}`);
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('all checks passed');
