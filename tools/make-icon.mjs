// The home-screen icon, drawn rather than pasted in as a blob.
//
// iOS will not take an SVG for apple-touch-icon, so this has to be a real PNG.
// Committing the GENERATOR rather than just the image means the icon can be
// changed by editing a line here instead of being replaced wholesale.
//
//   node tools/make-icon.mjs          # writes assets/icon-180.png and icon-512.png

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A heater shield, azure, a bend or: the field of the night lists and the
// one accent, crossed by a lance.
const SVG = (s) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0e1a2f"/>
  <defs><clipPath id="c"><path d="M120,96 H392 V260 C392,360 330,414 256,440 C182,414 120,360 120,260 Z"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="512" height="512" fill="#24539e"/>
    <line x1="80" y1="60" x2="440" y2="480" stroke="#d4a82a" stroke-width="64"/>
  </g>
  <path d="M120,96 H392 V260 C392,360 330,414 256,440 C182,414 120,360 120,260 Z" fill="none" stroke="#eeeae0" stroke-width="12"/>
</svg>`;

const browser = await chromium.launch();
await mkdir(join(ROOT, 'assets'), { recursive: true });
for (const size of [180, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;padding:0;background:transparent}</style>${SVG(size)}`);
  const buf = await page.screenshot({ omitBackground: true });
  await writeFile(join(ROOT, 'assets', `icon-${size}.png`), buf);
  console.log(`assets/icon-${size}.png  ${(buf.length / 1024).toFixed(1)} KB`);
  await page.close();
}
await browser.close();
