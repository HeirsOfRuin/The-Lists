// Does the single-file build actually work when opened from disk?
//
// A bundler that emits a file is not a bundler that emits a WORKING file, and
// file:// has its own rules. This opens dist/the-lists.html the way a phone
// would open it from its downloads folder, makes a knight, and rides a course.

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { resolve } from 'node:path';

const file = 'file://' + resolve(process.cwd(), 'dist/the-lists.html');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(file, { waitUntil: 'load' });
await page.waitForTimeout(200);
const title = await page.locator('[data-act="new"]').count();
console.log('title renders from file://        ', title ? 'yes' : 'NO');
if (title) {
  await page.click('[data-act="new"]');
  await page.click('[data-act="name-next"]');
  while (await page.locator('[data-opt]').count()) await page.locator('[data-opt]').first().click();
  await page.click('[data-act="ride-out"]');
  const map = await page.locator('svg.map').count();
  console.log('the month opens on the map         ', map ? 'yes' : 'NO');
  if (!map) errors.push('no map');
  // Ride to the first tourney on offer (or train until one is), answering
  // whatever comes up, until a course has been run.
  let ran = false;
  for (let i = 0; i < 60 && !ran; i++) {
    const has = async (sel) => (await page.locator(sel).count()) > 0;
    if (await has('[data-answer]')) await page.locator('[data-answer]').first().click();
    else if (await has('[data-act="enter"]')) await page.click('[data-act="enter"]');
    else if (await has('[data-act="run"]')) { await page.click('[data-act="run"]'); await page.waitForTimeout(700); ran = true; }
    else if (await has('[data-act="continue"]')) await page.click('[data-act="continue"]');
    else if (await has('[data-act="leave"]')) await page.click('[data-act="leave"]');
    else if (await has('[data-ride]')) await page.locator('[data-ride]').first().click();
    else if (await has('[data-act="train"]')) await page.click('[data-act="train"]');
    else break;
  }
  console.log('rode a course                      ', ran ? 'yes' : 'NO');
  if (!ran) errors.push('a course did not run');
}
await browser.close();
if (errors.length) {
  console.log(`\n!! ${errors.length} error(s) in the bundled file:`);
  for (const e of [...new Set(errors)].slice(0, 6)) console.log('   ' + e);
  process.exit(1);
}
console.log('no console errors — the single file works standalone');
