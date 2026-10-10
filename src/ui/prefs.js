// What this browser remembers about how you like the screens: small things,
// kept apart from the save. Losing them loses nothing but a preference.

const KEY = 'the-lists.prefs';

function read() {
  try { return JSON.parse(globalThis.localStorage?.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

export function pref(name, fallback) {
  const v = read()[name];
  return v === undefined ? fallback : v;
}

export function setPref(name, value) {
  const p = read();
  p[name] = value;
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: for this visit only */ }
}
