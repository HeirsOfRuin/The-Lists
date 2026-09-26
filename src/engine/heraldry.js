// Coats of arms: generated, blazoned, and drawn.
//
// Pure functions, no DOM: arms are data in the save, the blazon is text the
// herald reads out, and the drawing is an SVG string the UI drops in.
//
// The rule of tincture holds — a metal is never laid on a metal nor a colour on
// a colour — because it is the first thing a herald would notice, and because
// it is what makes arms readable at the far end of the lists.

const METALS = ['or', 'argent'];
const COLOURS = ['gules', 'azure', 'vert', 'sable', 'purpure'];

export const TINCTURES = {
  or: '#d4a82a',
  argent: '#eeeae0',
  gules: '#b3262c',
  azure: '#24539e',
  vert: '#2f6b3a',
  sable: '#1d1b1a',
  purpure: '#6a2f6e',
};

// Divisions of the field, and ordinaries laid on it.
export const DIVISIONS = [
  'perPale', 'perFess', 'perBend', 'quarterly', 'perChevron',
  'fess', 'pale', 'bend', 'chevron', 'cross', 'saltire', 'chief',
];

const DIVISION_BLAZON = {
  perPale: (a, b) => `Per pale ${a} and ${b}`,
  perFess: (a, b) => `Per fess ${a} and ${b}`,
  perBend: (a, b) => `Per bend ${a} and ${b}`,
  quarterly: (a, b) => `Quarterly ${a} and ${b}`,
  perChevron: (a, b) => `Per chevron ${a} and ${b}`,
  fess: (a, b) => `${cap(a)}, a fess ${b}`,
  pale: (a, b) => `${cap(a)}, a pale ${b}`,
  bend: (a, b) => `${cap(a)}, a bend ${b}`,
  chevron: (a, b) => `${cap(a)}, a chevron ${b}`,
  cross: (a, b) => `${cap(a)}, a cross ${b}`,
  saltire: (a, b) => `${cap(a)}, a saltire ${b}`,
  chief: (a, b) => `${cap(a)}, a chief ${b}`,
};

// Marks of cadency: how a son's arms differ from his father's.
export const CADENCY = {
  label: 'a label',        // the eldest son
  crescent: 'a crescent',  // the second
  baton: 'a baton sinister', // acknowledged, and illegitimate
  none: null,              // the head of the house bears the arms plain
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
const isMetal = (t) => METALS.includes(t);

/** New arms from a generator. Cadency is added by the caller. */
export function randomArms(rng, cadency = 'none') {
  const metalFirst = rng.chance(0.5);
  const field = metalFirst ? rng.pick(METALS) : rng.pick(COLOURS);
  const charge = metalFirst ? rng.pick(COLOURS) : rng.pick(METALS);
  const division = rng.pick(DIVISIONS);
  return { field, charge, division, cadency, mark: markTincture(field, charge) };
}

// The mark lies on the chief of the field, so it must contrast with the field.
function markTincture(field, charge) {
  if (isMetal(field)) return charge === 'gules' ? 'azure' : 'gules';
  return charge === 'argent' ? 'or' : 'argent';
}

export function blazon(arms) {
  const base = DIVISION_BLAZON[arms.division](arms.field, arms.charge);
  const mark = CADENCY[arms.cadency];
  return mark ? `${base}, ${mark} ${arms.mark}` : base;
}

/** An SVG shield. `uid` keeps clip-path ids unique when several are on screen. */
export function shieldSvg(arms, { size = 48, uid = 'a' } = {}) {
  const f = TINCTURES[arms.field];
  const c = TINCTURES[arms.charge];
  const m = TINCTURES[arms.mark];
  const clip = `shield-${uid}`;
  const shape = 'M4,4 H96 V58 C96,90 72,108 50,116 C28,108 4,90 4,58 Z';
  let body = '';
  switch (arms.division) {
    case 'perPale': body = `<rect x="50" y="0" width="50" height="120" fill="${c}"/>`; break;
    case 'perFess': body = `<rect x="0" y="56" width="100" height="64" fill="${c}"/>`; break;
    case 'perBend': body = `<polygon points="0,0 100,120 0,120" fill="${c}"/>`; break;
    case 'quarterly':
      body = `<rect x="50" y="0" width="50" height="56" fill="${c}"/><rect x="0" y="56" width="50" height="64" fill="${c}"/>`;
      break;
    case 'perChevron': body = `<polygon points="0,110 50,48 100,110 100,120 0,120" fill="${c}"/>`; break;
    case 'fess': body = `<rect x="0" y="42" width="100" height="26" fill="${c}"/>`; break;
    case 'pale': body = `<rect x="37" y="0" width="26" height="120" fill="${c}"/>`; break;
    case 'bend': body = `<line x1="0" y1="0" x2="100" y2="120" stroke="${c}" stroke-width="24"/>`; break;
    case 'chevron': body = `<polyline points="2,100 50,44 98,100" fill="none" stroke="${c}" stroke-width="20"/>`; break;
    case 'cross':
      body = `<rect x="39" y="0" width="22" height="120" fill="${c}"/><rect x="0" y="42" width="100" height="22" fill="${c}"/>`;
      break;
    case 'saltire':
      body = `<line x1="0" y1="0" x2="100" y2="120" stroke="${c}" stroke-width="18"/><line x1="100" y1="0" x2="0" y2="120" stroke="${c}" stroke-width="18"/>`;
      break;
    case 'chief': body = `<rect x="0" y="0" width="100" height="34" fill="${c}"/>`; break;
    default: body = '';
  }
  let mark = '';
  if (arms.cadency === 'label') {
    mark = `<g fill="${m}"><rect x="22" y="12" width="56" height="6"/>` +
      `<rect x="27" y="16" width="7" height="12"/><rect x="46.5" y="16" width="7" height="12"/><rect x="66" y="16" width="7" height="12"/></g>`;
  } else if (arms.cadency === 'crescent') {
    mark = `<path d="M40,14 A11,11 0 1 0 60,14 A9,8 0 1 1 40,14 Z" fill="${m}"/>`;
  } else if (arms.cadency === 'baton') {
    mark = `<line x1="80" y1="14" x2="20" y2="96" stroke="${m}" stroke-width="8" stroke-linecap="round"/>`;
  }
  const h = Math.round(size * 1.2);
  return `<svg class="shield" width="${size}" height="${h}" viewBox="0 0 100 120" role="img" aria-label="${blazon(arms)}">` +
    `<defs><clipPath id="${clip}"><path d="${shape}"/></clipPath></defs>` +
    `<g clip-path="url(#${clip})"><rect width="100" height="120" fill="${f}"/>${body}${mark}</g>` +
    `<path d="${shape}" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="3"/></svg>`;
}
