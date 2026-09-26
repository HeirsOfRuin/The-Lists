// Build a single, double-clickable HTML file from the module graph.
//
// No bundler, no dependencies. The game is authored as ES modules because that
// is what lets the engine run headless in Node for the tests and the balance
// harness; this collapses the same modules into one file so the game opens
// from a phone's downloads folder with no server and no install.
//
// The transform is deliberately small and explicit: each module becomes an
// IIFE in a registry, its imports become destructured lookups, and its exports
// become the returned object. It only handles the import and export forms this
// codebase actually uses, and it FAILS LOUDLY on anything else rather than
// silently emitting a file that does not work.
//
// (Carried over from Centennial Farm, where it was proven. The installable
// GitHub Pages build comes back in the polish phase.)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = 'src/ui/app.js';
const OUT = 'dist/the-lists.html';
const EMBED = 'dist/the-lists.embed.html';

const modules = new Map(); // path -> { code, deps, exports }

/** Everything a module exports, in the forms this codebase uses. */
function collectExports(code) {
  const names = new Set();
  for (const m of code.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  for (const m of code.matchAll(/^export\s+class\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  for (const m of code.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  for (const m of code.matchAll(/^export\s*\{([^}]*)\}\s*;?/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  if (/^export\s+default/m.test(code)) {
    throw new Error('default exports are not supported by this bundler');
  }
  return [...names];
}

async function load(relPath) {
  if (modules.has(relPath)) return;
  const abs = join(ROOT, relPath);
  let code;
  try {
    code = await readFile(abs, 'utf8');
  } catch {
    throw new Error(`Cannot read module: ${relPath}`);
  }

  const deps = [];
  // import { a, b } from './x.js'  |  import * as X from './x.js'
  code = code.replace(
    /^import\s+(?:(\*\s*as\s+[A-Za-z0-9_$]+)|(\{[^}]*\}))\s+from\s+['"]([^'"]+)['"]\s*;?/gm,
    (whole, star, named, spec) => {
      if (!spec.startsWith('.')) {
        throw new Error(`${relPath}: bare import "${spec}" cannot be bundled`);
      }
      const depPath = relative(ROOT, resolve(dirname(abs), spec)).split('\\').join('/');
      deps.push(depPath);
      const ref = `__m[${JSON.stringify(depPath)}]`;
      if (star) return `const ${star.replace(/\*\s*as\s*/, '')} = ${ref};`;
      // `import { a as b }` is not valid destructuring — that is `{ a: b }`.
      // Emitting it verbatim produced a bundle that failed to parse at all,
      // which is exactly why a bundler has to be checked by opening the file
      // rather than by seeing that it wrote one.
      const bindings = named
        .slice(1, -1)
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const alias = part.split(/\s+as\s+/);
          return alias.length === 2 ? `${alias[0].trim()}: ${alias[1].trim()}` : part;
        })
        .join(', ');
      return `const { ${bindings} } = ${ref};`;
    }
  );

  // Anything left that looks like an import is a form we do not handle.
  const leftover = code.match(/^import\s.+$/m);
  if (leftover) throw new Error(`${relPath}: unsupported import form -> ${leftover[0]}`);

  const exports = collectExports(code);
  // Strip the export keyword; the names are returned explicitly at the end.
  code = code.replace(/^export\s+(?=(?:async\s+)?function|class|const|let|var)/gm, '');
  code = code.replace(/^export\s*\{[^}]*\}\s*;?/gm, '');

  for (const d of deps) await load(d);
  modules.set(relPath, { code, deps, exports });
}

/** Depth-first order so a module is defined before anything that imports it. */
function order() {
  const out = [];
  const seen = new Set();
  const visiting = new Set();
  const walk = (p) => {
    if (seen.has(p)) return;
    if (visiting.has(p)) throw new Error(`Import cycle through ${p}`);
    visiting.add(p);
    for (const d of modules.get(p).deps) walk(d);
    visiting.delete(p);
    seen.add(p);
    out.push(p);
  };
  for (const p of modules.keys()) walk(p);
  return out;
}

const html = await readFile(join(ROOT, 'index.html'), 'utf8');
const css = await readFile(join(ROOT, 'src/ui/styles.css'), 'utf8');

// The home-screen icon and the manifest go INTO the file, so the single file
// needs nothing beside it.
async function dataUri(rel, type) {
  const buf = await readFile(join(ROOT, rel));
  return `data:${type};base64,${buf.toString('base64')}`;
}
const icon180 = await dataUri('assets/icon-180.png', 'image/png');
const icon512 = await dataUri('assets/icon-512.png', 'image/png');
const manifest = JSON.parse(await readFile(join(ROOT, 'assets/manifest.webmanifest'), 'utf8'));
manifest.icons = [
  { src: icon180, sizes: '180x180', type: 'image/png' },
  { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
];
const manifestUri = `data:application/manifest+json;base64,${
  Buffer.from(JSON.stringify(manifest)).toString('base64')}`;
await load(ENTRY);

const parts = ['const __m = {};'];
for (const p of order()) {
  const mod = modules.get(p);
  parts.push(
    `__m[${JSON.stringify(p)}] = (function () {\n${mod.code}\n` +
      `return { ${mod.exports.join(', ')} };\n})();`
  );
}

// Replacement FUNCTIONS, not strings: String.prototype.replace expands `$&`,
// `$'` and friends in a string replacement, and game code containing a dollar
// sign in a template literal once produced a bundle that would not parse.
const script = `<script type="module">\n${parts.join('\n\n')}\n</script>`;
const styleTag = `<style>\n${css}\n</style>`;
const STYLE_LINK = /<link rel="stylesheet" href="src\/ui\/styles\.css" \/>/;
const FONT_LINK = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/)?.[0];

let bundled = html;
const swaps = [
  ['stylesheet', STYLE_LINK, () => styleTag],
  ['script', /<script type="module"[^>]*><\/script>/, () => script],
  ['icon', /href="assets\/icon-180\.png"/, () => `href="${icon180}"`],
  ['manifest', /href="assets\/manifest\.webmanifest"/, () => `href="${manifestUri}"`],
];
// Assert every match: a scripted edit that matches nothing still "succeeds".
for (const [what, re, fn] of swaps) {
  if (!re.test(bundled)) throw new Error(`bundle: the ${what} tag was not found in index.html`);
  bundled = bundled.replace(re, fn);
}
if (!FONT_LINK) throw new Error('bundle: the font link was not found in index.html');

await mkdir(join(ROOT, 'dist'), { recursive: true });
await writeFile(join(ROOT, OUT), bundled, 'utf8');

// A second build for hosts that supply their own page skeleton (a published
// artifact). Content only: a <title>, the fonts, the styles, the root and the
// script. The host already pads the root by the safe-area insets, so the
// tokens are zeroed here and the sticky banner sits below the inset instead.
const embedded = [
  '<title>The Lists</title>',
  FONT_LINK,
  styleTag,
  '<style>:root { --sa-top: 0px; --sa-bottom: 0px; }',
  '  .banner { top: env(safe-area-inset-top, 0px); }</style>',
  '<div id="app"></div>',
  script,
].join('\n');
await writeFile(join(ROOT, EMBED), embedded, 'utf8');

console.log(`${OUT} \u2014 ${modules.size} modules, ${(bundled.length / 1024).toFixed(0)} KB, no dependencies`);
console.log(`${EMBED} \u2014 ${(embedded.length / 1024).toFixed(0)} KB, for a host that supplies the page`);
