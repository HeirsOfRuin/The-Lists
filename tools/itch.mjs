// Package the game for itch.io.
//
//   node tools/bundle.js && node tools/itch.mjs          # the two zips
//   node tools/bundle.js && node tools/itch.mjs --art    # and the cover and screenshots
//
// Writes dist/itch/:
//   the-lists-web.zip       index.html at its root: upload as "played in the browser"
//   the-lists-offline.zip   the single file and a note: upload as a download
//   description.html        the store page, for the description editor's HTML view
//   cover.png               630x500 at 2x (with --art)
//   screenshot-1..5.png     phone-sized screens from real careers (with --art)
//
// The zips are written here with Node's own deflate, so packaging needs
// nothing installed. The pictures need Playwright, as the smoke test does.

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'dist/itch');
const ART = process.argv.includes('--art');

// ---------------------------------------------------------------------------
// A zip, by the book: local headers, deflated data, a central directory.
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** files: [{ name, data: Buffer }] -> Buffer. A fixed timestamp, so a rebuild of the same game is the same zip. */
function zip(files) {
  const DOS_TIME = 0; // 00:00:00
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 1 January 2026
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const data = deflateRawSync(f.data, { level: 9 });
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);        // version needed
    local.writeUInt16LE(0x0800, 6);    // flags: names in UTF-8
    local.writeUInt16LE(8, 8);         // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);      // made by
    central.writeUInt16LE(20, 6);      // needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(0, 30);      // extra, comment lengths
    central.writeUInt32LE(0, 34);      // disk, internal attributes
    central.writeUInt32LE(0, 38);      // external attributes
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

// ---------------------------------------------------------------------------
// The two uploads
// ---------------------------------------------------------------------------

const README = `THE LISTS
A tourney knight's whole life.

To play: open "The Lists.html" in any web browser (Chrome, Firefox, Safari, Edge).
No install, no account. The game is this one file.

Your career saves itself in that browser after every course. Open the file in
the same browser to carry on. Saves made in the itch.io page, or in another
browser, are kept separately and do not carry over.

The page uses period typefaces from Google Fonts when it is online. Offline it
falls back to the fonts on your machine and plays the same.
`;

await mkdir(OUT, { recursive: true });
let html;
try {
  html = await readFile(join(ROOT, 'dist/the-lists.html'));
} catch {
  console.error('dist/the-lists.html is missing: run node tools/bundle.js first.');
  process.exit(1);
}
const web = zip([{ name: 'index.html', data: html }]);
const offline = zip([
  { name: 'The Lists/The Lists.html', data: html },
  { name: 'The Lists/README.txt', data: Buffer.from(README.replace(/\n/g, '\r\n'), 'utf8') },
]);
await writeFile(join(OUT, 'the-lists-web.zip'), web);
await writeFile(join(OUT, 'the-lists-offline.zip'), offline);
await copyFile(join(ROOT, 'tools/itch/description.html'), join(OUT, 'description.html'));
console.log(`dist/itch/the-lists-web.zip      ${(web.length / 1024).toFixed(0)} KB  index.html at the root`);
console.log(`dist/itch/the-lists-offline.zip  ${(offline.length / 1024).toFixed(0)} KB  The Lists.html and a README`);
console.log('dist/itch/description.html       the store page, for the HTML view of the description editor');

if (ART) await art();

// ---------------------------------------------------------------------------
// The cover and the screenshots
// ---------------------------------------------------------------------------

async function art() {
  const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
  const pw = await import(PW);
  const chromium = pw.chromium || pw.default?.chromium;
  const { shieldSvg, randomArms } = await import(resolve(ROOT, 'src/engine/heraldry.js'));
  const { makeRng } = await import(resolve(ROOT, 'src/engine/rng.js'));
  const browser = await chromium.launch();

  // The game's typefaces come from Google Fonts. A headless browser may not
  // reach them where curl can (behind a proxy, say), so font requests are
  // fetched with curl, certificates checked as usual, and handed to the page.
  // Without curl or a network the pictures fall back to local faces.
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  const fonts = new Map();
  const routeFonts = (page) => page.route(/fonts\.(googleapis|gstatic)\.com/, async (route) => {
    const url = route.request().url();
    try {
      if (!fonts.has(url)) fonts.set(url, execFileSync('curl', ['-sfL', '-A', UA, url], { maxBuffer: 1 << 25 }));
      const type = /googleapis/.test(url) ? 'text/css' : /\.woff2/.test(url) ? 'font/woff2' : 'font/ttf';
      await route.fulfill({ body: fonts.get(url), contentType: type, headers: { 'access-control-allow-origin': '*' } });
    } catch {
      await route.abort();
    }
  });

  // The cover: the helm-show. Shields of the field hung along the lists,
  // two lances crossed behind the title.
  const rng = makeRng(1466);
  const cadencies = ['none', 'label', 'crescent', 'none', 'none'];
  const shields = cadencies.map((c, i) => shieldSvg(randomArms(rng, c), { size: 64, uid: `c${i}` })).join('');
  const cover = await browser.newPage({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 2 });
  await routeFonts(cover);
  await cover.setContent(`<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=UnifrakturMaguntia&family=Alegreya+Sans:wght@500;700&display=block">
<style>
  html, body { margin: 0; width: 630px; height: 500px; overflow: hidden; }
  body { background: radial-gradient(ellipse at 50% 38%, #1d3156 0%, #0e1a2f 62%, #08101e 100%); color: #efe6cf; font-family: 'IM Fell English', Georgia, serif; position: relative; }
  .lances { position: absolute; inset: 0; }
  .title { position: absolute; top: 96px; width: 100%; text-align: center; font-family: 'UnifrakturMaguntia', serif; font-size: 112px; color: #d9a93a; text-shadow: 0 3px 0 #000a, 0 0 28px #0008; letter-spacing: 1px; }
  .tag { position: absolute; top: 254px; width: 100%; text-align: center; font-style: italic; font-size: 25px; color: #e9dcbc; }
  .rail { position: absolute; left: 36px; right: 36px; top: 346px; height: 10px; background: linear-gradient(#7a5a2e, #4a3418); border-radius: 2px; box-shadow: 0 2px 0 #0006; }
  .shields { position: absolute; top: 312px; width: 100%; display: flex; justify-content: center; gap: 30px; }
  .shields svg { filter: drop-shadow(0 4px 3px #0009); }
  .foot { position: absolute; bottom: 30px; width: 100%; text-align: center; font-family: 'Alegreya Sans', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: .32em; color: #b9a983; text-transform: uppercase; }
  .frame { position: absolute; inset: 12px; border: 1px solid #d9a93a55; }
</style></head><body>
<svg class="lances" viewBox="0 0 630 500" aria-hidden="true">
  <g stroke-linecap="round" opacity=".55">
    <line x1="60" y1="420" x2="300" y2="60" stroke="#5b4426" stroke-width="11"/>
    <line x1="60" y1="420" x2="300" y2="60" stroke="#c9b48a" stroke-width="6" stroke-dasharray="24 16"/>
    <line x1="570" y1="420" x2="330" y2="60" stroke="#5b4426" stroke-width="11"/>
    <line x1="570" y1="420" x2="330" y2="60" stroke="#a3242c" stroke-width="6" stroke-dasharray="24 16"/>
  </g>
</svg>
<div class="frame"></div>
<div class="title">The Lists</div>
<div class="tag">A tourney knight’s life, from his spurs to the last page</div>
<div class="rail"></div>
<div class="shields">${shields}</div>
<div class="foot">Joust · Court · Marry · Choose a side</div>
</body></html>`, { waitUntil: 'networkidle' });
  await cover.evaluate(() => document.fonts.ready);
  await cover.screenshot({ path: join(OUT, 'cover.png') });
  await cover.close();
  console.log('dist/itch/cover.png               1260x1000 (630x500 at 2x)');

  // The screenshots: real screens of the single-file build, from careers
  // the reference bot has played to the right moment.
  const { newGame, serialize } = await import(resolve(ROOT, 'src/engine/state.js'));
  const { randomAnswers, randomName } = await import(resolve(ROOT, 'src/engine/knight.js'));
  const { step, setRetireAge, setWar } = await import(resolve(ROOT, 'sim/bot.js'));
  const file = 'file://' + resolve(ROOT, 'dist/the-lists.html');
  const page = await browser.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
  await routeFonts(page);
  const load = async (state) => {
    await page.goto(file, { waitUntil: 'load' });
    await page.evaluate((raw) => {
      localStorage.setItem('the-lists.hints', JSON.stringify({ off: true, seen: [] }));
      if (raw) localStorage.setItem('the-lists.save.v1', raw); else localStorage.removeItem('the-lists.save.v1');
    }, state ? serialize(state) : null);
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
  };
  const play = (seed, until, opts = {}) => {
    setWar(opts.war || 'careful');
    setRetireAge(opts.retire || 99);
    const r = makeRng(seed * 7919 + 1);
    const s = newGame({ seed, answers: randomAnswers(r), name: randomName(r) });
    for (let g = 0; g < 60000 && s.status === 'active' && !until(s); g++) step(s, 'squire', r);
    return s;
  };
  // A shot from the top, or with a section brought up under the sticky banner.
  const shot = async (n, section = null) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    if (section) {
      await section.first().evaluate((el) => {
        const banner = document.querySelector('.banner')?.getBoundingClientRect().height || 0;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - banner - 12);
      });
    }
    await page.screenshot({ path: join(OUT, `screenshot-${n}.png`) });
    console.log(`dist/itch/screenshot-${n}.png       800x1720`);
  };

  // 1. The joust: a bout in the lists, the odds on every choice.
  await load(play(5, (s) => s.year >= 3 && s.event?.stage === 'bout' && ['regional', 'high'].includes(s.event.tier) && !s.pending));
  await page.click('[data-act="squire"]').catch(() => {});
  await shot(1, page.locator('section.card', { hasText: /Course \d of 3/ }));
  // 2. The month: the map, the realm, the tourneys on offer.
  await load(play(7, (s) => s.year === 4 && s.month === 5 && s.phase === 'month' && !s.event && !s.pending && !s.fair));
  await shot(2, page.locator('section.card', { has: page.locator('.month-head') }));
  // 3. Character creation: the first chapter of a life.
  await load(null);
  await page.click('[data-act="new"]');
  await page.click('[data-act="name-next"]');
  await shot(3);
  // 4. The hearth: a lady, her family's terms, and her rival.
  const h = play(9, (s) => s.year === 3 && s.month === 4 && s.phase === 'month' && !s.event && !s.pending && !s.fair);
  h.heart = 'free';
  h.spouse = null;
  h.engaged = null;
  const lady = h.ladies.find((l) => l.status === 'free' && l.kind === 'widow') || h.ladies.find((l) => l.status === 'free');
  if (!h.visited.includes(lady.town)) h.visited.push(lady.town);
  lady.affection = Math.max(lady.affection, 34);
  await load(h);
  await page.click('[data-tab="hearth"]');
  await page.click(`[data-lady-open="${lady.id}"]`);
  await shot(4, page.locator('details.lady[open]'));
  // 5. The last page: a whole career, retired a baron and written up.
  await load(play(10, (s) => s.status !== 'active', { retire: 38 }));
  await page.click('[data-act="resume"]');
  await page.evaluate(() => document.fonts.ready);
  await shot(5);

  await browser.close();
}
