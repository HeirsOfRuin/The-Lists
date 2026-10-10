// Every sound in the game, rendered to one WAV file, to listen to without
// playing: the trumpets, then a course of each kind. Made by the same code
// the game runs (src/ui/sound.js), in an offline audio context.
//
//   node tools/sound-preview.mjs [out.wav]     # default /tmp/the-lists-sounds.wav

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || '/tmp/the-lists-sounds.wav';
const server = createServer(async (req, res) => {
  try {
    const path = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
    res.writeHead(200, { 'Content-Type': extname(path) === '.js' ? 'text/javascript' : 'text/html' });
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(8744, r));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:8744/index.html');
const b64 = await page.evaluate(async () => {
  // In order: the trumpets, then each kind of course, three and a half seconds apiece.
  const cues = [['fanfare'], ['break', 'miss', 'good'], ['helm', 'break', 'good'], ['unhorse', 'break', 'good'],
    ['miss', 'unhorse', 'bad'], ['tilt', 'miss', 'bad'], ['horse', 'break', 'bad'], ['break', 'break', 'even'], ['miss', 'miss', 'even']];
  const rate = 44100;
  const slot = 3.5;
  const off = new OfflineAudioContext(1, Math.ceil(rate * slot * cues.length), rate);
  window.AudioContext = function () { return off; };
  localStorage.removeItem('the-lists.sound');
  const sound = await import('/src/ui/sound.js');
  cues.forEach(([a, b, tone], i) => {
    const play = () => (a === 'fanfare' ? sound.fanfare() : sound.courseSound({ you: { out: a }, him: { out: b } }, { tone }));
    if (i === 0) play();
    else off.suspend(i * slot).then(() => { play(); off.resume(); });
  });
  const data = (await off.startRendering()).getChannelData(0);
  const bytes = new DataView(new ArrayBuffer(44 + data.length * 2));
  const str = (o, s) => [...s].forEach((c, k) => bytes.setUint8(o + k, c.charCodeAt(0)));
  str(0, 'RIFF'); bytes.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVEfmt ');
  bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 1, true);
  bytes.setUint32(24, rate, true); bytes.setUint32(28, rate * 2, true); bytes.setUint16(32, 2, true); bytes.setUint16(34, 16, true);
  str(36, 'data'); bytes.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) bytes.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
  let bin = '';
  const u8 = new Uint8Array(bytes.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(bin);
});
await writeFile(OUT, Buffer.from(b64, 'base64'));
console.log(`${OUT}  the trumpets, then eight courses: break, helm, unhorse, borne down, tilt, horse, both break, both miss`);
await browser.close();
server.close();
