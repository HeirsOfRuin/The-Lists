// The kingdom, its money, its powers and its roads. Logic-free.
//
// "Lothmere" is a working name. It is written here and nowhere else; every
// screen and every line the herald writes reads it from this table, so the
// kingdom can be renamed by changing one string.

export const WORLD = {
  kingdom: 'Lothmere',
  king: 'Aldric the Second',
  // The treaty that ended the war your master's generation fought. A career
  // opens in the twentieth year of the peace.
  peaceYear: 20,
  capital: 'kingsmead',
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
    home: 'wystansFord',
  },
  court: {
    id: 'court',
    name: 'Kingsmead',
    blurb: 'The crown province around the capital, where a bow in the wrong place is remembered longer than a broken lance.',
    home: 'queenshythe',
  },
  coast: {
    id: 'coast',
    name: 'the Saltings',
    blurb: 'The merchant coast. Wool, wine and guild money, and city tourneys that pay better than any lord.',
    home: 'merrow',
  },
};

// Towns, on a map 360 wide and 460 tall, north at the top. `seat` marks a
// great house's hall; `city` a guild town that holds its own jousts.
export const TOWNS = {
  wystansFord: { id: 'wystansFord', name: 'Wystan’s Ford', province: 'march', x: 78, y: 92 },
  castleBrede: { id: 'castleBrede', name: 'Castle Brede', province: 'march', x: 196, y: 48, seat: 'stane' },
  othery: { id: 'othery', name: 'Othery', province: 'march', x: 296, y: 104 },
  hollinMoor: { id: 'hollinMoor', name: 'Hollin Moor', province: 'march', x: 150, y: 150 },
  ambryCross: { id: 'ambryCross', name: 'Ambry Cross', province: 'court', x: 58, y: 226, seat: 'aumbry' },
  kingsmead: { id: 'kingsmead', name: 'Kingsmead', province: 'court', x: 186, y: 232, seat: 'crown', city: true },
  sallowfield: { id: 'sallowfield', name: 'Sallowfield', province: 'court', x: 300, y: 204 },
  queenshythe: { id: 'queenshythe', name: 'Queenshythe', province: 'court', x: 250, y: 292 },
  fennick: { id: 'fennick', name: 'Fennick', province: 'coast', x: 60, y: 372 },
  merrow: { id: 'merrow', name: 'Merrow', province: 'coast', x: 158, y: 340 },
  saltingsQuay: { id: 'saltingsQuay', name: 'Saltings Quay', province: 'coast', x: 214, y: 414, city: true },
  portLessing: { id: 'portLessing', name: 'Port Lessing', province: 'coast', x: 306, y: 380, city: true },
};

// Roads, in days on horseback.
export const ROADS = [
  ['wystansFord', 'castleBrede', 3],
  ['castleBrede', 'othery', 3],
  ['wystansFord', 'hollinMoor', 2],
  ['castleBrede', 'hollinMoor', 3],
  ['othery', 'sallowfield', 3],
  ['hollinMoor', 'kingsmead', 3],
  ['hollinMoor', 'ambryCross', 3],
  ['ambryCross', 'kingsmead', 3],
  ['kingsmead', 'sallowfield', 2],
  ['kingsmead', 'queenshythe', 2],
  ['sallowfield', 'queenshythe', 2],
  ['queenshythe', 'portLessing', 3],
  ['queenshythe', 'merrow', 3],
  ['kingsmead', 'merrow', 3],
  ['ambryCross', 'fennick', 4],
  ['merrow', 'fennick', 3],
  ['merrow', 'saltingsQuay', 2],
  ['saltingsQuay', 'portLessing', 2],
];

// The two great houses whose rivalry over the succession is the story's
// engine, and the Crown above them.
export const GREAT_HOUSES = {
  aumbry: { id: 'aumbry', name: 'the Duke of Aumbry', short: 'Aumbry', seat: 'ambryCross' },
  stane: { id: 'stane', name: 'the Earl of Stane', short: 'Stane', seat: 'castleBrede' },
};

export const FACTIONS = ['crown', 'aumbry', 'stane', 'church', 'cities'];
export const FACTION_LABELS = {
  crown: 'the Crown', aumbry: 'Aumbry', stane: 'Stane', church: 'the Church', cities: 'the Cities',
};

// The riding year runs March to October; winter is one long turn.
export const FIRST_MONTH = 3;
export const LAST_MONTH = 10;
export const MONTHS = {
  3: 'March', 4: 'April', 5: 'May', 6: 'June', 7: 'July', 8: 'August', 9: 'September', 10: 'October',
};
export const FEASTS = {
  3: 'Lady Day', 4: 'Eastertide', 5: 'Whitsun', 6: 'Midsummer', 7: 'St James',
  8: 'Lammas', 9: 'Michaelmas', 10: 'St Luke',
};
