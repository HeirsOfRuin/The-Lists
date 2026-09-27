// The court: patrons and what they expect, how the heralds judge conduct,
// the names the heralds give a knight, and the story threads. Logic-free.

// A patron pays a fee every winter and puts you in his livery. In return you
// ride at his own tourney every year and answer his summons when it comes.
// `tourney` says which calendar event is his: by host faction, by tier, or any
// tourney held in a guild town.
export const PATRONS = {
  crown: {
    id: 'crown', name: 'the Crown', lord: 'the King', fee: 12 * 240, seat: 'kingsmead',
    livery: 'the king’s colours', tourney: { tier: 'grand' }, rival: null,
    tourneyLabel: 'the King’s Tourney at Midsummer',
  },
  aumbry: {
    id: 'aumbry', name: 'the Duke of Aumbry', lord: 'the Duke', fee: 10 * 240, seat: 'ambryCross',
    livery: 'Aumbry’s blue and silver', tourney: { hostFaction: 'aumbry' }, rival: 'stane',
    tourneyLabel: 'the Duke’s tourney at Ambry Cross in May',
  },
  stane: {
    id: 'stane', name: 'the Earl of Stane', lord: 'the Earl', fee: 10 * 240, seat: 'castleBrede',
    livery: 'Stane’s black and gold', tourney: { hostFaction: 'stane' }, rival: 'aumbry',
    tourneyLabel: 'the Earl’s tourney at Castle Brede in August',
  },
  cities: {
    id: 'cities', name: 'the Guild of St Barbara', lord: 'the Guild', fee: 6 * 240, seat: 'portLessing',
    livery: 'the guild’s red and white', tourney: { city: true }, rival: null,
    tourneyLabel: 'any tourney held in a guild town',
  },
};

export const PATRONAGE = {
  offerFavour: 8,       // a house offers service at this favour
  offerRenown: 10,      // ...to a knight of at least this renown
  strikes: 2,           // obligations missed before you are let go
  missFavour: -5,       // favour lost for each one missed
  dismissHonour: -3,    // honour lost when you are let go
  resignFavour: -5,     // favour lost when you leave service yourself
  houseRegard: 2,       // his own knights think better of you
  rivalRegard: -2,      // his rival's knights, worse
  summonsWindow: 2,     // months you have to answer a summons
  summonsMonths: [4, 5, 6, 7, 8, 9], // when a summons may come
  targetFavour: 4,      // favour for beating the man he named
  targetRenown: 2,
};

// How the heralds regard your conduct, by honour.
export const CONDUCT = [
  { id: 'spotless', min: 16, label: 'Without reproach',
    does: 'The heralds give you their read of a rider at half price.' },
  { id: 'good', min: 8, label: 'Of good name', does: 'Nothing is said against you.' },
  { id: 'questioned', min: 3, label: 'Questioned',
    does: 'Your name is spoken about. At the great tourneys a lady may accuse you at the helm-show.' },
  { id: 'disgraced', min: -999, label: 'Disgraced',
    does: 'The heralds will not cry your name at a high tourney or the King’s. A pilgrimage would begin to mend it.' },
];

export const PILGRIMAGE = {
  below: 8,          // offered while honour is below this
  cost: 2 * 240,     // alms, and the road
  honour: 3,
  pious: 2,
  shrine: 'the shrine of St Wystan',
};

// The name the heralds give a knight whose character has become his
// reputation. The first of each pair is a chivalric virtue, and a virtue that
// has become a byname is sung: one renown more each winter.
export const EPITHETS = {
  valorous: 'the Valiant', cautious: 'the Wary',
  generous: 'the Generous', grasping: 'the Grasping',
  merciful: 'the Merciful', ruthless: 'the Hard',
  pious: 'the Devout', worldly: 'the Worldly',
  honest: 'the True', cunning: 'the Fox',
  constant: 'the Constant', fickle: 'the Fickle',
};
export const EPITHET_AT = 18;

// A marriage brings a dowry and the income of the lady's own lands.
export const MARRIAGE = { dowry: 30 * 240, lands: 5 * 240, breakCost: 10 * 240 };

// Story threads, shown on the knight's sheet. Each stage is reached when its
// flag is set; the sheet shows the furthest. {culprit} {master} {lady} are
// filled from the state.
export const THREADS = [
  {
    id: 'ambryCross', title: 'Ambry Cross', when: { master: 'disgraced' },
    stages: [
      { flag: null, text: '{master} lost his spurs at Ambry Cross for a lance on a horse he swore was not his.' },
      { flag: 'witnessFound', text: 'You know the name of a man who saw it, and says it was another lance.' },
      { flag: 'witnessSworn', text: 'The witness has sworn to it before a herald.' },
      { flag: 'culpritKnown', text: 'You know whose lance it was: {culprit}.' },
      { flag: 'masterCleared', text: '{master} has his spurs again, and the heralds have written why.' },
    ],
  },
  {
    id: 'betrothal', title: 'The betrothal', when: { flag: 'betrothed' },
    stages: [
      { flag: null, text: 'You are promised to the lady {lady}.' },
      { flag: 'weddingSet', text: 'The wedding has a date.' },
      { flag: 'married', text: 'You are married to {lady}. Her lands pay you every winter.' },
      { flag: 'betrothalBroken', text: 'You broke your promise to {lady}. Her family has not forgotten.' },
    ],
  },
];
