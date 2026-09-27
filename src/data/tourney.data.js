// What tourneys cost and pay, who may ride in them, and when they are held.
// Logic-free. All money in pence (240d = £1).
//
// Four tiers. A year holds one grand tourney, two high ones held by the great
// houses, a handful of regional lords' tourneys and an assortment of local
// jousts — far more than one knight can ride, so choosing is the game.

const COMMON_RENOWN = { boutWon: 0, unhorse: 0, helmPrize: 0, champion: 0, runnerUp: 0 };

export const TIERS = {
  local: {
    id: 'local',
    label: 'Local joust',
    entrants: 4,
    costs: { entry: 36, lodging: 12, stabling: 6, largesse: 0 },
    lancePrice: 8,
    prizes: { champion: 2 * 240, runnerUp: 6 * 12, helm: 0 },
    prizeLabels: { champion: 'a silver cup worth two pounds', runnerUp: 'six shillings', helm: '' },
    renown: { ...COMMON_RENOWN, champion: 1 },
    // Which of the field ride: renown band, and how strongly the home province is preferred.
    field: { minRenown: 0, maxRenown: 14, provinceWeight: 4 },
    eligibility: null,
    beneath: 30, // a knight of this renown gains nothing here, and is thought to be picking on boys
  },
  regional: {
    id: 'regional',
    label: 'Regional tourney',
    entrants: 8,
    costs: { entry: 120, lodging: 24, stabling: 12, largesse: 12 },
    lancePrice: 8,
    prizes: { champion: 6 * 240, runnerUp: 30 * 12, helm: 10 * 12 },
    prizeLabels: { champion: 'the gilt spur and six pounds', runnerUp: 'thirty shillings', helm: 'ten shillings' },
    renown: { boutWon: 1, unhorse: 1, helmPrize: 1, champion: 4, runnerUp: 2 },
    field: { minRenown: 0, maxRenown: 34, provinceWeight: 2 },
    eligibility: null,
    beneath: 60,
  },
  high: {
    id: 'high',
    label: 'High tourney',
    entrants: 8,
    costs: { entry: 240, lodging: 60, stabling: 24, largesse: 60 },
    lancePrice: 12,
    prizes: { champion: 15 * 240, runnerUp: 4 * 240, helm: 240 },
    prizeLabels: { champion: 'a gold collar and fifteen pounds', runnerUp: 'four pounds', helm: 'a pound' },
    renown: { boutWon: 2, unhorse: 2, helmPrize: 2, champion: 8, runnerUp: 4 },
    field: { minRenown: 8, maxRenown: 999, provinceWeight: 1 },
    // Any one of these admits you.
    invitation: true, // by letter: see INVITATIONS in realm.data.js
    retinueExpected: true,
    beneath: 999,
  },
  grand: {
    id: 'grand',
    label: 'The King’s Tourney',
    entrants: 16,
    costs: { entry: 480, lodging: 120, stabling: 36, largesse: 120 },
    lancePrice: 12,
    prizes: { champion: 40 * 240, runnerUp: 10 * 240, helm: 2 * 240 },
    prizeLabels: { champion: 'a ruby from the king’s hand and forty pounds', runnerUp: 'ten pounds', helm: 'two pounds' },
    renown: { boutWon: 3, unhorse: 3, helmPrize: 3, champion: 15, runnerUp: 8 },
    field: { minRenown: 12, maxRenown: 999, provinceWeight: 1 },
    invitation: true, // by letter: see INVITATIONS in realm.data.js
    retinueExpected: true,
    helmShow: true,
    beneath: 999,
  },
};

// Not a tourney at all: a knight holding a bridge on the road, as knights
// holding a pas d'armes did. Three courses, no fee, no purse; renown only.
TIERS.pas = {
  id: 'pas',
  label: 'A pas at the bridge',
  entrants: 2,
  costs: { entry: 0, lodging: 0, stabling: 0, largesse: 0 },
  lancePrice: 0,
  prizes: { champion: 0, runnerUp: 0, helm: 0 },
  prizeLabels: { champion: '', runnerUp: '', helm: '' },
  renown: { boutWon: 0, unhorse: 1, helmPrize: 0, champion: 3, runnerUp: 0 },
  field: null,
  eligibility: null,
  beneath: 999,
};

export const TIER_ORDER = ['local', 'regional', 'high', 'grand'];

// The shape of every year. Months are fixed for the great occasions; the
// regional and local ones are placed by lot each year.
export const CALENDAR = {
  grand: [{ month: 6, town: 'kingsmead', host: 'crown' }],
  high: [
    { month: 5, town: 'ambryCross', host: 'aumbry' },
    { month: 8, town: 'castleBrede', host: 'stane' },
  ],
  regional: { count: 4, months: [3, 4, 5, 7, 8, 9, 10] },
  local: { count: 7, months: [3, 4, 5, 6, 7, 8, 9, 10] },
};

// Who holds a local joust.
export const LOCAL_HOSTS = {
  city: ['the Guild of St Barbara', 'the Drapers’ Company', 'the mayor and aldermen'],
  town: ['the parish', 'the fair-wardens', 'the lord of the manor'],
};

export const WOUNDS = {
  unhorsed: 0.35,      // chance a fall leaves a mark, before harness
  perVigour: 0.015,    // less per point of vigour over 10
  helmStruck: 0.06,    // chance a helm strike leaves you stunned
  seriousShare: 0.2,   // of wounds, the share that end your tourney
  light: { lance: -1, seat: -1, label: 'bruised and ringing' },
  serious: { label: 'hurt badly enough to withdraw' },
  surgeon: 240,        // £1 for the surgeon, if it is serious
  seriousMonths: 2,    // a serious wound keeps a rider out this many months
};

// Lore at or above this knows every rider's habits on arrival.
export const LORE_KNOWS_HABITS = 12;

// The herald's read of a rider: his habits AND his tells. Cheaper for a
// well-mannered knight.
export const HERALD_READ = { base: 30, perCourtesy: 2, min: 6 };
