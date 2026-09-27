// The mêlée: the tourney in its old sense. Two sides, the holders and the
// comers, meet in the open field; knights take each other prisoner for
// ransom, and the heralds give a prize to the best of the day. Logic-free.
//
// Every number that decides an engagement is read by one function,
// engageOdds() in src/engine/melee.js, which the buttons and the resolver
// both call.

export const MELEE = {
  passes: [
    { id: 'charge', label: 'The charge', text: 'The trumpets go, and the two sides meet at the gallop. Lances break, and the field comes apart into knots of men.' },
    { id: 'press', label: 'The press', text: 'The field is all dust and noise. Men are dragging each other off by the bridle, and the recets are filling with the blown.' },
    { id: 'last', label: 'The last of the day', text: 'Horses are blown and so are men. The heralds are watching the light; there is time for one more.' },
  ],
  sideSize: { regional: 6, high: 8, grand: 10 },   // knights a side, you among them
  menCap: { regional: 2, high: 3, grand: 4 },      // of your own men-at-arms, how many may ride with you
  manFee: 24,                                      // pence: a man's keep and the hire of his horse for the day
  openings: 3,
  // One man in every pass is in trouble: cut off from his friends, his horse
  // blown or his helm knocked askew. Picking such men off is how the Marshal
  // made his fortune; this is the edge it gives, on the logit scale.
  straggler: 0.6,
  // How many men a knight of the field brings, by his renown.
  fieldMen: [{ renown: 40, men: 2 }, { renown: 15, men: 1 }],
};

// A knight's weight in the press: his sword and his seat, his horse, his men,
// less what the day has taken out of him.
export const POWER = {
  sword: 0.5,
  seat: 0.3,
  horse: 0.15,
  man: 1.0,
  fatiguePer: 0.4,        // per point past his threshold
  thresholdPerVigour: 0.5,
  wound: 2,
};
export const LOGIT_PER_POWER = 0.45;

export const ACTIONS = {
  take: {
    id: 'take', label: 'Take him',
    blurb: 'Seize his bridle and make him yield. A prisoner is a ransom; a man who overreaches is taken himself.',
    edge: 0, overreach: 0.35, fatigue: 2,
  },
  strike: {
    id: 'strike', label: 'Beat him and ride on',
    blurb: 'Unhorse him and leave him for the heralds. Renown and no ransom, and less risk.',
    edge: 0.6, overreach: 0.15, fatigue: 1.5,
  },
  rescue: {
    id: 'rescue', label: 'Ride to the rescue',
    blurb: 'Break into the men holding a knight of your side and bring him out.',
    edge: -0.2, overreach: 0.3, fatigue: 2,
  },
  recet: {
    id: 'recet', label: 'Ride to the recet',
    blurb: 'The roped-off ground where no man may be taken. Catch your wind and lose nothing.',
    rest: 4,
  },
};

// Each man riding with you takes this share of a capture meant for you,
// up to the cap. He is the one dragged off, and you pay his ransom instead.
export const MEN_SHIELD = { perMan: 0.3, max: 0.75 };

export const MELEE_HURT = { chance: 0.03, seriousShare: 0.3 };

// Ransom of a knight taken in the mêlée, in pence: a base by the tourney's
// standing, and more for a famous name. Your men come cheaper.
export const RANSOM = {
  base: { regional: 120, high: 240, grand: 360 },
  perRenown: 5,
  man: 120,
};

// The mêlée pays in money more than in name: a prisoner is a ransom, not a
// song. Renown decays a tenth a winter, so every point a year here would sit
// ten points higher on the Roll for good; the jousts stay the prestige event.
export const MELEE_RENOWN = { take: 0, strike: 1, rescue: 1, won: 0, prize: 2 };
export const MELEE_PRIZE = { regional: 240, high: 3 * 240, grand: 6 * 240 };
export const MELEE_PRIZE_LABELS = {
  regional: 'a gilt helm-crest and a pound',
  high: 'a jewelled sword and three pounds',
  grand: 'a destrier’s trapper of cloth of gold and six pounds',
};

// What to do with your prisoners when the day is over.
export const RANSOM_TERMS = {
  full: { id: 'full', label: 'Ransom them in full', share: 1 },
  half: { id: 'half', label: 'Take half, on their word', share: 0.5, generous: 1, regard: 2 },
  free: { id: 'free', label: 'Let them go without ransom', share: 0, generous: 2, honour: 1, regard: 4, renown: 1 },
};

// How a knight takes being your prisoner, by temperament.
export const TAKEN_REGARD = { courteous: 0, pious: 0, proud: -2, rough: -1 };
