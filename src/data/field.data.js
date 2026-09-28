// The field: the knights of Lothmere who ride the circuit with you, and how
// they take what you do to them. Logic-free.

export const ROSTER = {
  size: 48,
  perProvince: 16,
  age: { min: 19, max: 40 },
  talent: { mean: 10.5, sd: 2.2 },
  statMax: 18,
  lineage: { mean: 10, sd: 3, min: 2, max: 18 },
  retireFrom: 38,        // may retire from this age
  retireChance: 0.25,    // per winter, from retireFrom
  retireAlways: 45,
  renownDecay: 0.9,      // everyone's renown each winter: fame must be kept up
  // ...and fame past a point is harder to keep: a further share of whatever
  // is over `past` fades too. The same rule for every knight, you included.
  fame: { past: 100, extra: 0.25 },
  // The horse a knight's renown can pay for: base + renown / perRenown. He
  // buys toward it a step a winter.
  horse: { base: 10, perRenown: 15 },
};

// Friend and grudge thresholds on a rider's regard for you (−10 to +10).
export const REGARD = { friend: 5, grudge: -5, min: -10, max: 10 };

export const TEMPERAMENTS = {
  courteous: { id: 'courteous', label: 'courteous' },
  proud: { id: 'proud', label: 'proud' },
  rough: { id: 'rough', label: 'rough' },
  pious: { id: 'pious', label: 'devout' },
};

// How a rider takes the result of his bout against you. `regard` is added to
// what he thinks of you; the text is what the crowd sees.
export const REACTIONS = {
  courteous: {
    lostFall: { regard: 0, text: '{name} gets to his feet and salutes you before his squire reaches him.' },
    lost: { regard: 1, text: '{name} raises his broken lance to you as he rides off.' },
    won: { regard: 1, text: '{name} rides back down the tilt to offer you his hand.' },
  },
  proud: {
    lostFall: { regard: -3, text: '{name} will not look at you as they help him up.' },
    lost: { regard: -2, text: '{name} rides off the field without a word.' },
    won: { regard: 0, text: '{name} rides his lap to the stands and does not look your way.' },
  },
  rough: {
    lostFall: { regard: -2, text: '{name} spits sand and swears you will meet again.' },
    lost: { regard: -1, text: '{name} curses your horse, your lance and your mother, in that order.' },
    won: { regard: 0, text: '{name} laughs at you from the saddle.' },
  },
  pious: {
    lostFall: { regard: 0, text: '{name} crosses himself where he lies.' },
    lost: { regard: 1, text: '{name} bows his head to you, and to the heralds.' },
    won: { regard: 1, text: '{name} thanks God for the course, and you for riding it straight.' },
  },
};

// A universal tell: a rider who bears you a grudge rides at you harder.
export const GRUDGE_TELL = {
  when: 'grudge',
  text: 'He bears you a grudge, and rides at you harder and higher for it.',
  aim: { helm: 2 },
  seat: { press: 2.5 },
};
