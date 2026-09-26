// The kingdom, its money and its powers. Logic-free.
//
// "Lothmere" is a working name. It is written here and nowhere else; every
// screen and every line the herald writes reads it from this table, so the
// kingdom can be renamed by changing one string.

export const WORLD = {
  kingdom: 'Lothmere',
  king: 'Aldric the Second',
  // The treaty that ended the war your master's generation fought. The game
  // opens in the twentieth year of the peace.
  peaceYear: 20,
  capital: 'Kingsmead',
};

// Money is held in pence, as integers. Twelve pence to the shilling, twenty
// shillings to the pound — the reckoning of fifteenth-century England.
export const PENCE_PER_SHILLING = 12;
export const SHILLINGS_PER_POUND = 20;
export const PENCE_PER_POUND = PENCE_PER_SHILLING * SHILLINGS_PER_POUND;

export const PROVINCES = {
  march: {
    id: 'march',
    name: 'the Harrow March',
    blurb: 'The northern border. Horse country, hard winters, and men who still remember the war.',
    towns: ["Wystan's Ford", 'Castle Brede', 'Othery', 'Hollin Moor'],
  },
  court: {
    id: 'court',
    name: 'Kingsmead',
    blurb: 'The crown province around the capital, where a bow in the wrong place is remembered longer than a broken lance.',
    towns: ['Kingsmead Green', 'Ambry Cross', 'Sallowfield', 'Queenshythe'],
  },
  coast: {
    id: 'coast',
    name: 'the Saltings',
    blurb: 'The merchant coast. Wool, wine and guild money, and city tourneys that pay better than any lord.',
    towns: ['Port Lessing', 'Merrow', 'Saltings Quay', 'Fennick'],
  },
};

// The two great houses whose rivalry over the succession is the story's
// engine (from the Court build on). Named now because a family's favour
// can already be owed to one of them.
export const GREAT_HOUSES = {
  aumbry: { id: 'aumbry', name: 'the Duke of Aumbry', short: 'Aumbry' },
  stane: { id: 'stane', name: 'the Earl of Stane', short: 'Stane' },
};

export const FACTIONS = ['crown', 'aumbry', 'stane', 'church', 'cities'];
export const FACTION_LABELS = {
  crown: 'the Crown', aumbry: 'Aumbry', stane: 'Stane', church: 'the Church', cities: 'the Cities',
};

// Feasts the provincial circuit keeps. A season runs from spring to autumn.
export const FEASTS = ['Eastertide', 'St George', 'Whitsun', 'Midsummer', 'Lammas', 'Michaelmas'];
