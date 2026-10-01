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
import { passMonth, answer, monthOptions, rideTo } from '../src/engine/season.js';
import { cardById, holds } from '../src/engine/cards.js';

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
  await page.screenshot({ path: `${SHOTS}/0-question-${q + 1}.png`, fullPage: true });
  await opts.nth(q % n).click();
  asked += 1;
}
check('creation asks six questions', asked === 6, `${asked} asked`);
check('creation reaches the roll', await has('[data-act="ride-out"]'));
check('the roll tells a life, not a sheet', (await page.locator('p.bio').count()) >= 3);
await page.screenshot({ path: `${SHOTS}/0-roll.png`, fullPage: true });
check('no sideways scroll on the roll', (await overflow()) <= 1);
await page.click('[data-act="ride-out"]');
check('the month opens with a map', await has('svg.map'));
check('a new player is shown a hint for the month', await has('.hint [data-hint="month"]'));
await page.screenshot({ path: `${SHOTS}/1-month.png`, fullPage: true });
await page.click('[data-hint="month"]');
check('a hint read is gone', !(await has('[data-hint="month"]')));
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
let melees = 0;
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
  if (await has('[data-act="day-ride"]')) { await shot('day'); await page.click('[data-act="day-ride"]'); continue; }
  if (await has('[data-melee]')) { await shot('melee'); melees += 1; await page.locator('[data-melee]').first().click(); continue; }
  if (await has('[data-ransom]')) { await shot('ransom'); await page.locator('[data-ransom]').first().click(); continue; }
  if (await has('[data-act="foot-go"]')) { await shot('foot'); await page.click('[data-act="foot-auto"]'); continue; }
  if (await has('[data-act="spare"]')) { await page.click('[data-act="spare"]'); continue; }
  if (await has('[data-act="foot-on"]')) { await shot('foot-result'); await page.click('[data-act="foot-on"]'); continue; }
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
  if (await has('[data-act="shoot"]')) { await shot('popinjay'); await page.click('[data-act="shoot"]'); continue; }
  if (await has('[data-race]')) { await shot('race'); await page.locator('[data-race]').first().click(); continue; }
  if (await has('[data-act="fair-leave"]')) { await shot('fair-done'); await page.click('[data-act="fair-leave"]'); continue; }
  if (await has('[data-ride]')) { await page.locator('[data-ride]').first().click(); continue; }
  if (await has('[data-act="train"]')) { await page.click('[data-act="train"]'); continue; }
  if (await has('[data-act="new-after-end"]')) { check('career ended (a legitimate outcome)', true); break; }
  check('some way forward is always offered', false, (await page.locator('main').innerText()).slice(0, 200));
  break;
}
check('played through winter in the browser', winters >= 1, `${steps} steps, ${courses} bouts or courses, ${cards} cards, ${winters} winters`);
check('cards came up in play', cards >= 3);
check('the mêlée was ridden in the page', melees >= 1, `${melees} passes`);
const endYear = await text('.banner .fact:last-child .k');
check('the year advanced', endYear !== startYear, `${startYear} -> ${endYear}`);
report('play');

for (const t of ['knight', 'hearth', 'field', 'book', 'world']) {
  await page.click(`[data-tab="${t}"]`);
  await page.waitForTimeout(60);
  const body = (await page.locator('main').innerText()).trim();
  check(`tab "${t}" has content`, body.length > 100, `${body.length} chars`);
  await page.screenshot({ path: `${SHOTS}/tab-${t}.png`, fullPage: true });
  check(`no sideways scroll on "${t}"`, (await overflow()) <= 1);
}
check('the Book of Lothmere has pages known', (await page.locator('details.lore').count()) >= 10);
check('the chronicle has a year in it', (await page.locator('.chron-year').count()) >= 1);
report('tabs');

// Reload: the career must come back from storage.
await page.reload({ waitUntil: 'load' });
check('a reload resumes the career', await has('.banner .name'));
check('and a hint once read stays read', !(await has('[data-hint="month"]')));

// A phase-one save opens in this build.
const v1 = await readFile(join(ROOT, 'test/fixtures/v1-save.json'), 'utf8');
await page.evaluate((raw) => localStorage.setItem('the-lists.save.v1', raw), v1);
await page.reload({ waitUntil: 'load' });
const name = await has('.banner .name') ? await text('.banner .name') : '';
check('a phase-one save opens and resumes', /David/.test(name), name);
check('it opens on the map', await has('svg.map'));
await page.screenshot({ path: `${SHOTS}/2-migrated.png`, fullPage: true });
report('migration');

// The barriers: a career played by the bot to the day of foot combat at a
// great tourney, then fought in the page.
function barriersSave() {
  for (let seed = 5; seed < 40; seed++) {
    const rng = makeRng(seed * 7919 + 1);
    const s = newGame({ seed, answers: randomAnswers(rng), name: randomName(rng) });
    let guard = 0;
    while (s.status === 'active' && guard++ < 20000) {
      if (s.event?.stage === 'day' && s.event.days[s.event.day] === 'barriers' && !s.pending) return serialize(s);
      step(s, 'squire', rng);
    }
  }
  throw new Error('no career reached the barriers');
}
await page.evaluate((raw) => localStorage.setItem('the-lists.save.v1', raw), barriersSave());
await page.reload({ waitUntil: 'load' });
check('a career opens on the day of the barriers', await has('[data-act="day-ride"]'));
await page.click('[data-act="day-ride"]');
check('the barriers show their odds and the squire\u2019s reckoning', /Squire.s reckoning/i.test(await page.locator('main').innerText()));
await page.screenshot({ path: `${SHOTS}/8-barriers.png`, fullPage: true });
check('no sideways scroll at the barriers', (await overflow()) <= 1);
await page.click('[data-act="foot-call"]');
await page.click('[data-act="foot-go"]');
let footSteps = 0;
while (footSteps++ < 30) {
  if (await has('[data-act="foot-go"]')) { await page.click('[data-act="foot-go"]'); continue; }
  if (await has('[data-act="spare"]')) { await page.click('[data-act="spare"]'); continue; }
  if (await has('[data-act="foot-on"]')) { await page.screenshot({ path: `${SHOTS}/9-barriers-result.png`, fullPage: true }); await page.click('[data-act="foot-on"]'); continue; }
  if (await has('[data-answer]')) { await page.locator('[data-answer]').first().click(); continue; }
  break;
}
check('the barriers ran to the end of the tourney', await has('[data-act="leave"]'), `${footSteps} steps`);
const book = await text('.entry');
check('the herald writes the barriers into the book', /barriers/.test(book), book.slice(0, 120));
report('barriers');

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

// A life: the fairs, the Company of the Swan, a vow, and the last page.
function answerFirst(s) {
  const inst = s.pending.inst;
  const i = cardById(inst.id).choices.findIndex((ch) => holds(s, ch.when, inst.ctx));
  answer(s, i);
}
function monthSave(seed, month, tweak = () => {}) {
  const rng = makeRng(seed * 131 + 7);
  const s = newGame({ seed, answers: randomAnswers(rng), name: randomName(rng) });
  tweak(s);
  for (let g = 0; g < 40 && (s.month < month || s.pending) && s.phase === 'month'; g++) {
    if (s.pending) answerFirst(s); else passMonth(s);
  }
  return s;
}
for (const [fair, month] of [['popinjay', 5], ['race', 9]]) {
  const s = monthSave(6, month, (x) => { x.purse = 60 * 240; });
  await page.evaluate((raw) => localStorage.setItem('the-lists.save.v1', raw), serialize(s));
  await page.reload({ waitUntil: 'load' });
  const id = `y1f${fair}`;
  check(`the ${fair} is on the month’s list`, await has(`[data-ride="${id}"]`));
  await page.click(`[data-ride="${id}"]`);
  if (fair === 'popinjay') {
    check('the popinjay shows the chance at every mark', /The bird itself · [<>]?\d+%/.test(await page.locator('main').innerText()));
    await page.click('[data-mark="bird"]');
    await page.click('[data-lull="1"]');
    await page.screenshot({ path: `${SHOTS}/10-popinjay.png`, fullPage: true });
    check('no sideways scroll at the butts', (await overflow()) <= 1);
    for (let g = 0; g < 5 && await has('[data-act="shoot"]'); g++) await page.click('[data-act="shoot"]');
  } else {
    check('each plan shows its chance to win', (await page.locator('main').innerText()).match(/To win [<>]?\d+%/g)?.length === 3);
    await page.screenshot({ path: `${SHOTS}/11-race.png`, fullPage: true });
    await page.locator('[data-race]').first().click();
  }
  check(`the ${fair} comes to an end`, await has('[data-act="fair-leave"]'));
  await page.screenshot({ path: `${SHOTS}/12-${fair}-done.png`, fullPage: true });
  await page.click('[data-act="fair-leave"]');
  check(`home from the ${fair}, and the month moves on`, await has('svg.map') || await has('.cardscene'));
}
report('fairs');

{
  const s = monthSave(8, 11, (x) => {
    x.year = 9; x.renown = 80; x.honour = 18; x.knight.age = 36; x.purse = 80 * 240;
    for (const f of Object.keys(x.favour)) x.favour[f] = 8;
    const st = x.order.stalls.find((y) => y.holder.kind === 'knight');
    st.was = x.roster.knights.find((k) => k.id === st.holder.id).name; st.holder = null;
  });
  while (s.pending) answerFirst(s);
  await page.evaluate((raw) => localStorage.setItem('the-lists.save.v1', raw), serialize(s));
  await page.reload({ waitUntil: 'load' });
  const body = await page.locator('main').innerText();
  check('a winter with an empty stall puts your name before the chapter', /reckon your chance of a stall at \d+%/.test(body));
  check('the vows are offered on the swans', await has('details.vows'));
  await page.click('details.vows > summary');
  await page.locator('[data-vow]').first().click();
  check('a vow made shows what it will be', /You will vow/.test(await page.locator('main').innerText()));
  await page.screenshot({ path: `${SHOTS}/13-swan-winter.png`, fullPage: true });
  check('no sideways scroll in a long winter', (await overflow()) <= 1);
  check('a knight of thirty-six may hang up his lance', await has('[data-act="retire"]'));
  await page.click('[data-act="retire"]');
  await page.click('[data-act="retire-yes"]');
  const last = await page.locator('main').innerText();
  check('the last page of the Book of Feats is written', /last page of the Book of Feats/i.test(last) && (await page.locator('p.bio').count()) >= 2);
  check('it is written in full', !/undefined|NaN|\{/.test(last));
  await page.screenshot({ path: `${SHOTS}/14-last-page.png`, fullPage: true });
  report('a life');
}

// The hearth: a free knight who has met a lady courts her, rides in her
// colours, and asks for her hand.
{
  const s = monthSave(12, 4, (x) => { x.heart = 'free'; x.ladies = x.ladies.filter((l) => l.kind !== 'betrothed'); x.purse = 80 * 240; });
  while (s.pending) answerFirst(s);
  const l = s.ladies.find((x) => x.kind === 'widow');
  if (!s.visited.includes(l.town)) s.visited.push(l.town);
  l.affection = 30;
  await page.evaluate((raw) => localStorage.setItem('the-lists.save.v1', raw), serialize(s));
  await page.reload({ waitUntil: 'load' });
  await page.click('[data-tab="hearth"]');
  check('the Hearth tab lists the ladies of the realm', (await page.locator('details.lady').count()) >= 9);
  await page.click(`[data-lady-open="${l.id}"]`);
  check('her terms and her rival are shown', /Before her family will hear you/.test(await page.locator('main').innerText()) && /courting her too/.test(await page.locator('main').innerText()));
  await page.click(`[data-approach="${l.id}:dance"]`);
  check('a way to court her shows its chance', /Dance with her at her father’s table · \d+%/.test(await page.locator('main').innerText()));
  await page.screenshot({ path: `${SHOTS}/15-hearth.png`, fullPage: true });
  check('no sideways scroll on the Hearth', (await overflow()) <= 1);
  await page.click(`[data-court-lady="${l.id}"]`);
  check('a month courting her is told on the month', /Her affection/.test(await page.locator('main').innerText()));
  // Her family's terms met: ask, and the betrothal is made.
  const t = monthSave(12, 4, (x) => { x.heart = 'free'; x.ladies = x.ladies.filter((y) => y.kind !== 'betrothed'); x.purse = 80 * 240; x.renown = 40; x.honour = 15; });
  while (t.pending) answerFirst(t);
  const m = t.ladies.find((x) => x.kind === 'widow');
  if (!t.visited.includes(m.town)) t.visited.push(m.town);
  m.affection = 70;
  await page.evaluate((raw) => localStorage.setItem('the-lists.save.v1', raw), serialize(t));
  await page.reload({ waitUntil: 'load' });
  await page.click('[data-tab="hearth"]');
  await page.click(`[data-lady-open="${m.id}"]`);
  await page.click(`[data-ask-hand="${m.id}"]`);
  check('her family consents, and the wedding is set', /betrothed to/.test(await page.locator('main').innerText()));
  // Her colours at a tourney in her town.
  const u = monthSave(13, 3, (x) => { x.heart = 'free'; x.ladies = x.ladies.filter((y) => y.kind !== 'betrothed'); x.purse = 80 * 240; });
  while (u.pending) answerFirst(u);
  const opt = monthOptions(u).find((o) => o.open && o.cal.tier !== 'fair');
  if (opt) {
    const lady = u.ladies[0];
    lady.town = opt.cal.town;
    lady.affection = 30;
    rideTo(u, opt.cal.id);
    while (u.pending) answerFirst(u);
    if (u.event?.stage === 'arrival') {
      await page.evaluate((raw) => localStorage.setItem('the-lists.save.v1', raw), serialize(u));
      await page.reload({ waitUntil: 'load' });
      check('the ladies in the gallery are shown on arrival', await has(`[data-colours="${lady.id}"]`));
      await page.click(`[data-colours="${lady.id}"]`);
      check('and you may ride in her colours', /You ride in the colours of/.test(await page.locator('main').innerText()));
      await page.screenshot({ path: `${SHOTS}/16-colours.png`, fullPage: true });
    }
  }
  report('hearth');
}

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
