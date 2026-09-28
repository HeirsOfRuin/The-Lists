// Does the single-file build actually work when opened from disk?
//
// A bundler that emits a file is not a bundler that emits a WORKING file, and
// file:// has its own rules. This opens dist/the-lists.html the way a phone
// would open it from its downloads folder, makes a knight, and rides a course.
// Then it serves dist/site/ as GitHub Pages would, and checks the installable
// build: manifest, icons, the offline worker, and a reload with no network.

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { resolve, join, extname } from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

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
    else if (await has('[data-act="shoot"]')) await page.click('[data-act="shoot"]');
    else if (await has('[data-race]')) await page.locator('[data-race]').first().click();
    else if (await has('[data-act="fair-leave"]')) await page.click('[data-act="fair-leave"]');
    else if (await has('[data-ride]')) await page.locator('[data-ride]').first().click();
    else if (await has('[data-act="train"]')) await page.click('[data-act="train"]');
    else break;
  }
  console.log('rode a course                      ', ran ? 'yes' : 'NO');
  if (!ran) errors.push('a course did not run');
}

// The installable build, served as GitHub Pages would serve it: it must load,
// offer a manifest a browser can install from, register its worker, and open
// again with the network gone.
const SITE = resolve(process.cwd(), 'dist/site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const path = join(SITE, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(8743, r));
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const site = await ctx.newPage();
await site.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
site.on('pageerror', (e) => errors.push(`site: ${e.message}`));
await site.goto('http://localhost:8743/', { waitUntil: 'load' });
const siteTitle = await site.locator('[data-act="new"]').count();
console.log('the Pages build renders            ', siteTitle ? 'yes' : 'NO');
if (!siteTitle) errors.push('the Pages build did not render');
const manifestOk = await site.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]')?.href;
  const m = await (await fetch(href)).json();
  const icons = await Promise.all(m.icons.map((i) => fetch(new URL(i.src, href)).then((r) => r.ok)));
  return m.name === 'The Lists' && icons.every(Boolean);
});
console.log('its manifest and icons are served  ', manifestOk ? 'yes' : 'NO');
if (!manifestOk) errors.push('the manifest or its icons did not load');
const worker = await site.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active));
console.log('the offline worker is active       ', worker ? 'yes' : 'NO');
if (!worker) errors.push('the service worker did not activate');
await site.reload({ waitUntil: 'load' }); // let the worker control the page and cache it
await ctx.setOffline(true);
await site.reload({ waitUntil: 'load' });
const offline = await site.locator('[data-act="new"]').count();
console.log('it opens again offline             ', offline ? 'yes' : 'NO');
if (!offline) errors.push('the Pages build did not open offline');
server.close();

await browser.close();
if (errors.length) {
  console.log(`\n!! ${errors.length} error(s) in the bundled file:`);
  for (const e of [...new Set(errors)].slice(0, 6)) console.log('   ' + e);
  process.exit(1);
}
console.log('no console errors — the single file works standalone');
