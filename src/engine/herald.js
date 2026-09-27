// What the herald says: a course called as it was ridden, and the entry he
// writes in the Book of Feats. Written FROM the record of what happened, so
// the book cannot describe a tourney that did not take place.

import { AIMS, SEATS } from '../data/joust.data.js';

const YOUR_LANCE = {
  miss: 'Your lance missed.',
  tilt: 'Your point dropped onto the tilt — a fault, and a point lost.',
  horse: 'Your lance struck his horse. The heralds’ batons come down: the bout is forfeit.',
  break: 'Your lance broke fair on his shield.',
  helm: 'You took him on the helm!',
  unhorse: 'You bore him out of the saddle!',
};

const HIS_LANCE = {
  miss: 'His lance missed you.',
  tilt: 'His point struck the tilt — a fault.',
  horse: 'He struck your horse. He forfeits the bout.',
  break: 'His lance broke on your shield.',
  helm: 'He took you on the helm.',
  unhorse: 'He bore you out of the saddle.',
};

const WOUND_YOU = {
  light: 'You are bruised and your head is ringing: your lance and seat will suffer for the rest of the day.',
  serious: 'You are hurt badly enough that the surgeon will not let you ride again today.',
};
const WOUND_HIM = {
  light: 'He is shaken and will ride worse for it.',
  serious: 'He is carried from the lists and will not ride again today.',
};

function rode(c) {
  return `${AIMS[c.aim].label.toLowerCase()}, ${SEATS[c.seat].label.toLowerCase()}`;
}

/** The lines the herald calls for one course of your bout. */
export function callCourse(course) {
  const lines = [
    `You rode ${rode(course.you)}; he rode ${rode(course.him)}.`,
    YOUR_LANCE[course.you.out],
    HIS_LANCE[course.him.out],
  ];
  if (course.wounds.you) lines.push(WOUND_YOU[course.wounds.you]);
  if (course.wounds.him) lines.push(WOUND_HIM[course.wounds.him]);
  return lines;
}

export const HOW = {
  points: 'on points',
  unhorse: 'by bearing his man down',
  forfeit: 'by forfeit, for a lance on the horse',
  heralds: 'by the heralds’ judgement',
  walkover: 'without a course run',
};

function list(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function times(n) { return n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`; }

/** The Book of Feats entry for one tourney, or one pas at a bridge. */
export function heraldEntry(e, name) {
  let opening;
  if (e.tier === 'pas') {
    opening = e.placing === 'champion'
      ? `On the road to ${e.town}, ${name} touched the shield of ${e.host} at a bridge, and rode through.`
      : `On the road to ${e.town}, ${name} touched the shield of ${e.host} at a bridge, and was turned back.`;
  } else {
    const where = `At ${e.town}, for ${e.feast}`;
    opening = {
      champion: `${where}, ${name} carried the prize.`,
      runnerUp: `${where}, ${name} rode to the last two, and was beaten there by ${e.beatenBy}.`,
      semi: `${where}, ${name} reached the last four before ${e.beatenBy} put him out.`,
      quarter: `${where}, ${name} reached the last eight before ${e.beatenBy} put him out.`,
      first: `${where}, ${name} rode in the first round and was put out by ${e.beatenBy}.`,
    }[e.placing];
  }

  const feats = [];
  if (e.lances) feats.push(`broke ${e.lances} lance${e.lances === 1 ? '' : 's'}`);
  if (e.helms) feats.push(`struck the helm ${times(e.helms)}`);
  if (e.unhorsed.length) feats.push(`bore ${list(e.unhorsed)} to the ground`);
  const parts = [opening];
  if (feats.length) parts.push(`He ${list(feats)}.`);
  else parts.push('He broke no lance.');
  if (e.fellTo) parts.push(`He was himself borne down by ${e.fellTo}.`);
  if (e.withdrew) parts.push('He was carried from the lists and the surgeon was sent for.');
  if (e.horseStrikes) parts.push('To his shame, his lance found a horse, and the heralds wrote that down too.');
  for (const v of e.vows || []) {
    if (v.kept === true) parts.push(`He kept his vow to bear ${v.name} down.`);
    else if (v.kept === false) parts.push(`He vowed to bear ${v.name} down, and did not.`);
  }
  if (e.helmPrize) parts.push('The heralds gave him the prize for the most helm strikes of the day.');
  if (e.beneath) parts.push('It was thought a small field for a knight of his name.');
  if (e.placing !== 'champion' && e.tier !== 'pas') parts.push(`The prize went to ${e.champion}.`);
  return parts.join(' ');
}
