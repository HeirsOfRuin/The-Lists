// What a tourney costs and pays. Logic-free. All money in pence.
//
// Orientation: 240d = £1. A provincial tourney costs a knight about seventeen
// shillings to ride in and pays six pounds to the man who wins it. An
// average rider roughly breaks even over a season; a good one profits; a
// poor one is slowly ruined, which is what the circuit historically did to
// most of the men who rode it.

export const PROVINCIAL = {
  tier: 'provincial',
  label: 'provincial tourney',
  entrants: 8,
  costs: {
    entry: 120,       // 10s to the heralds' roll
    lodging: 24,      // three nights at 8d
    stabling: 12,     // the farrier and the stable
    largesse: 12,     // to the heralds who cry your name
  },
  lancePrice: 8,      // each lance you break, 8d
  prizes: {
    champion: 6 * 240,   // six pounds and the gilt spur
    runnerUp: 30 * 12,   // thirty shillings
    helm: 10 * 12,       // ten shillings to the knight with the most helm strikes, if there is one
  },
  prizeLabels: {
    champion: 'the gilt spur and six pounds',
    runnerUp: 'thirty shillings for the last two',
    helm: 'ten shillings for the most helm strikes',
  },
  // The herald's read of a rider: his habits AND his tells. Cheaper for a
  // well-mannered knight.
  heraldRead: { base: 30, perCourtesy: 2, min: 6 },
  // Lore at or above this knows every rider's habits on arrival.
  loreKnowsHabits: 12,
  rivals: {
    lance: { mean: 10, sd: 2.2, min: 5, max: 16 },
    seat: { mean: 10, sd: 2.2, min: 5, max: 16 },
    vigour: { mean: 10, sd: 2, min: 5, max: 16 },
    horse: { mean: 10, sd: 2, min: 5, max: 16 },
    renown: { mean: 4, sd: 4, min: 0, max: 18 },
    hotShare: 0.3,
  },
  renown: { boutWon: 1, unhorse: 1, helmPrize: 1, champion: 4, runnerUp: 2 },
  honour: { horseStrike: -4 },
};

export const WOUNDS = {
  unhorsed: 0.35,      // chance a fall leaves a mark
  perVigour: 0.015,    // less per point of vigour over 10
  helmStruck: 0.06,    // chance a helm strike leaves you stunned
  seriousShare: 0.2,   // of wounds, the share that end your tourney
  light: { lance: -1, seat: -1, label: 'bruised and ringing' },
  serious: { label: 'hurt badly enough to withdraw' },
  surgeon: 240,        // £1 for the surgeon, if it is serious
};

// Events in a season before winter comes and the knight ages a year.
export const EVENTS_PER_SEASON = 5;
