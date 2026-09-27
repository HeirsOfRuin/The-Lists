// The knight's household: squire, retinue, harness, horses, and what a year
// costs. Logic-free. All money in pence (240d = £1).

// The retinue. Each role costs a wage every winter and does one thing.
export const RETINUE = {
  groom: {
    id: 'groom', label: 'Groom', wage: 240,
    does: 'Your horse recovers between rounds, and a colt comes on faster.',
  },
  armourer: {
    id: 'armourer', label: 'Armourer', wage: 480,
    does: 'Keeps your harness in repair: wounds are rarer, and it does not wear.',
  },
  pursuivant: {
    id: 'pursuivant', label: 'Pursuivant', wage: 480,
    does: 'A herald’s apprentice in your livery. You know every rider’s habits on arrival.',
  },
  minstrel: {
    id: 'minstrel', label: 'Minstrel', wage: 360,
    does: 'Sings your deeds: one renown more for every tourney in which you win a bout.',
  },
};
export const RETINUE_ORDER = ['groom', 'armourer', 'pursuivant', 'minstrel'];

// A knight of standing is expected to arrive attended. Short of this at a
// high or grand tourney costs honour: the snowball brake on fame.
export const RETINUE_EXPECTED = [
  { renown: 20, size: 1 },
  { renown: 35, size: 2 },
  { renown: 55, size: 3 },
];

// Travel, per day on the road.
export const TRAVEL = {
  knight: 6,        // you and your horse: bed, board, fodder
  perFollower: 3,   // each squire or retainer
  tiredAfter: 6,    // more days than this and you arrive with fatigue
  roadCardBase: 0.25,
  roadCardPerDay: 0.06,
  roadCardMax: 0.7,
};

// A year's keep, charged each winter.
export const UPKEEP = {
  living: 3 * 240,  // your own keep between tourneys
  horse: 30 * 12,   // fodder, shoeing and stabling for your destrier: 30s
  harness: 60,      // repairs, if no armourer
};

// A month's paid service — escort, garrison, a lord's household. Steady money,
// and no renown at all: the landless knight's other living.
export const SERVICE = { wage: 240, renownFloor: 0 };

// What your family sends each winter, by the advantage you were born to.
export const ALLOWANCE = {
  wealth: 10 * 240,
  fame: 2 * 240,
  favour: 4 * 240,
  oldblood: 1 * 240,
  heirBonus: 3 * 240, // the eldest son, on top
};

// Jousting harness: armour made for the tilt and nothing else.
export const HARNESS = {
  start: 9,
  wearEveryYears: 2, // loses a point this often without an armourer
  woundPerPoint: 0.05, // wound chance falls by this share per point over 9
  market: [
    { id: 'harness12', label: 'A harness from the armourers of Merrow', quality: 12, price: 8 * 240 },
    { id: 'harness15', label: 'A Milanese harness, made to your measure', quality: 15, price: 20 * 240 },
    { id: 'harness18', label: 'A harness from the royal workshops at Kingsmead', quality: 18, price: 45 * 240 },
  ],
};

// A horse's condition, out of 10. Every bout and every long road wears him;
// a month without a tourney brings him back. Below 6 he rides as a worse
// horse, a point of quality for every point short — which is why a knight
// cannot simply ride every tourney in the calendar.
export const CONDITION = {
  max: 10,
  perBout: 1,
  longRoadDays: 5,     // a road longer than this costs a point more
  recoverMonth: 3,
  recoverGroom: 1,     // more, with a groom
  soundAt: 6,
};

// Horses at the winter fair. Price rises steeply with quality.
export const HORSE_MARKET = {
  pricePerQualitySq: 26, // price = quality^2 * this, in pence
  sellShare: 0.6,        // a dealer pays this share of value
  qualities: [11, 13, 15, 17],
  oldAge: 15,            // declines a point a year from here
  retireAge: 20,
};

// Training. A month's training puts one mark against a skill; a skill rises a
// point when its marks reach the cost, which grows as the skill does.
export const TRAINING = {
  monthMarks: 1,
  winterMarks: 2,
  boutMarks: 0.1,        // lance and seat, for every bout ridden
  costBase: 3,           // marks to rise from 8 to 9
  costStep: 2,           // one more mark for every this many points above 8
  peakFrom: 24,
  declineFrom: 34,       // lance, seat and vigour slip after this age
  declineChance: 0.5,    // per skill per winter past it
};

// Squires. Candidates come from three kinds of family.
export const SQUIRE_ORIGINS = {
  lordsSon: {
    id: 'lordsSon', label: 'A lord’s younger son',
    fee: 3 * 240, // his father pays you to train him
    blurb: 'His father pays you three pounds a year to make a knight of him, and will want to see it done.',
  },
  merchantsSon: {
    id: 'merchantsSon', label: 'A merchant’s son',
    fee: 1 * 240,
    blurb: 'Money wanting a name. His father pays a pound a year, and the guilds will notice.',
  },
  poorKin: {
    id: 'poorKin', label: 'A poor cousin',
    fee: -2 * 240, // you keep him
    blurb: 'Your own blood, with nothing. You feed him; he will follow you anywhere.',
  },
};
export const SQUIRE = {
  knightAt: 5,         // years of service before he can be dubbed
  scoutBase: 0.3,      // chance he learns an unknown rider's habits before your bout
  scoutPerWits: 0.04,  // per point of wits over 8
  maxSkill: 16,
};

// The Roll of Arms is published each winter.
export const ROLL_LENGTH = 20;
