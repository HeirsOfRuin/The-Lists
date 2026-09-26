// The lists: aims, seats, habits, and the ordinance. Logic-free.
//
// Every number that decides a course lives here, and every one of them is
// read by exactly one function — strikeOdds() in src/engine/joust.js — which
// both the odds preview and the resolver call. Tune here; never in the UI.
//
// Values are logits (log-odds), because skill differences add naturally on
// that scale and a probability can never leave [0, 1] however they stack.
// For orientation: logit 0 is 50%, -1.4 is about 20%, -3 about 5%.

export const AIMS = {
  helm: {
    id: 'helm', label: 'Helm',
    blurb: 'The crest and visor. Hardest to land; scores double.',
    hit: -1.10,     // ~25% for two even knights riding balanced
    points: 2,
    unhorse: -2.4,  // given a hit
    foul: null,     // a lance raised at the helm does not find the tilt or the horse
    horseShare: 0,
  },
  shield: {
    id: 'shield', label: 'Shield',
    blurb: 'The standard mark. The honest middle.',
    hit: 0.25,      // ~56%
    points: 1,
    unhorse: -3.0,
    foul: -4.6,     // ~1%
    horseShare: 0,
  },
  low: {
    id: 'low', label: 'Low',
    blurb: 'The lower shield, toward the saddle. Easiest to land and likeliest to bear him down — and the only aim that can foul the tilt or strike his horse.',
    hit: 0.35,      // ~59%
    points: 1,
    unhorse: -2.2,
    foul: -2.3,     // ~9% before seat and horse
    horseShare: 0.2, // of fouls, the share that strike the horse rather than the tilt
  },
};

export const SEATS = {
  brace: {
    id: 'brace', label: 'Brace',
    blurb: 'Set deep, lance steady. Hard to unhorse; your aim suffers.',
    aim: -0.30, force: -0.30, stability: 0.90, foul: -0.30, fatigue: 1.0,
  },
  balanced: {
    id: 'balanced', label: 'Balanced',
    blurb: 'As you were taught.',
    aim: 0, force: 0, stability: 0, foul: 0, fatigue: 1.0,
  },
  press: {
    id: 'press', label: 'Press',
    blurb: 'Lean into the blow. A truer, harder strike — and you are more exposed, most of all at the helm. Tiring.',
    aim: 0.25, force: 0.50, stability: -0.60, foul: 0.40, fatigue: 1.6,
  },
};

// How the DEFENDER's seat changes each target. A man leaning into his charge
// shows you his helm; a man sitting deep behind his shield does not.
export const EXPOSURE = {
  helm: { brace: -0.45, balanced: 0, press: 0.80 },
  shield: { brace: 0.25, balanced: 0, press: -0.15 },
  low: { brace: -0.55, balanced: 0, press: 0.25 },
};

export const TEMPERS = {
  steady: { id: 'steady', label: 'steady', foulMult: 0.7, pressAim: 0 },
  hot: { id: 'hot', label: 'hot', foulMult: 1.3, pressAim: 0.15 },
};

// Per point of skill away from 10, on the logit scale.
export const SKILL = {
  lanceAim: 0.14,     // your lance, on landing
  horseAim: 0.05,     // your horse, on landing
  guard: 0.04,        // his seat, on your landing
  lanceForce: 0.10,   // your lance, on bearing him down
  horseForce: 0.08,   // your horse, on bearing him down
  seatResist: 0.14,   // his seat, on staying up
  horseResist: 0.06,  // his horse, on staying up
  seatFoul: 0.10,     // your seat, on keeping the point off the tilt
  fatigueAim: 0.06,   // per point of fatigue past your threshold
};

export const FATIGUE = {
  thresholdPerVigour: 1 / 3, // fatigue tells past vigour / 3
  recoveryBase: 2,           // recovered between rounds
  recoveryPerVigour: 0.2,
};

// The Constable's Ordinance: scoring in the spirit of John Tiptoft's
// ordinances of 1466, which counted lances broken, the helm above the body,
// bearing a man down above all, and penalised the tilt and the horse.
export const ORDINANCE = {
  name: 'the Constable’s Ordinance',
  courses: 3,
  tieCourses: 2, // run up to two more if level; after that, the heralds decide
  points: { miss: 0, tilt: -1, horse: 0, break: 1, helm: 2, unhorse: 3 },
};

export const OUTCOMES = ['miss', 'tilt', 'horse', 'break', 'helm', 'unhorse'];

export const OUTCOME_LABELS = {
  miss: 'miss', tilt: 'strikes the tilt', horse: 'strikes the horse',
  break: 'breaks on the shield', helm: 'takes the helm', unhorse: 'bears him down',
};

// What an unscouted rider is assumed to do: the field's usual habits.
export const FIELD_HABITS = {
  aim: { helm: 0.2, shield: 0.5, low: 0.3 },
  seat: { brace: 0.25, balanced: 0.5, press: 0.25 },
};

// Rivals' habits. `aim` and `seat` are base weights; `tells` multiply them
// when their condition holds. The herald's read reveals the tells.
//   when: ahead | behind | level | lastCourse | vsStronger | vsWeaker
export const ARCHETYPES = [
  {
    id: 'hammer', label: 'a hammer',
    habit: 'Rides low and leans into it.',
    aim: { helm: 0.05, shield: 0.20, low: 0.75 },
    seat: { brace: 0.10, balanced: 0.25, press: 0.65 },
    tells: [
      { when: 'ahead', text: 'Once he is ahead he sits back, braces, and aims for the shield.', seat: { brace: 12, press: 0.1 }, aim: { shield: 6, low: 0.3 } },
    ],
  },
  {
    id: 'peacock', label: 'a show rider',
    habit: 'Goes for the helm; the ladies are watching.',
    aim: { helm: 0.65, shield: 0.30, low: 0.05 },
    seat: { brace: 0.10, balanced: 0.55, press: 0.35 },
    tells: [
      { when: 'lastCourse', text: 'On the last course it is the helm or nothing, and he leans into it.', aim: { helm: 8, shield: 0.3, low: 0.1 }, seat: { press: 6 } },
    ],
  },
  {
    id: 'rock', label: 'a rock',
    habit: 'Braces, and aims true at the shield.',
    aim: { helm: 0.05, shield: 0.80, low: 0.15 },
    seat: { brace: 0.75, balanced: 0.20, press: 0.05 },
    tells: [
      { when: 'behind', text: 'Behind, he finally presses, and goes low for the fall.', seat: { press: 20, brace: 0.2 }, aim: { low: 8 } },
    ],
  },
  {
    id: 'gambler', label: 'a gambler',
    habit: 'Rides as he was taught — until he is losing.',
    aim: { helm: 0.10, shield: 0.60, low: 0.30 },
    seat: { brace: 0.20, balanced: 0.65, press: 0.15 },
    tells: [
      { when: 'behind', text: 'Behind, he throws everything at the helm.', aim: { helm: 10 }, seat: { press: 6 } },
    ],
  },
  {
    id: 'wary', label: 'a careful man',
    habit: 'Measures his man before he rides.',
    aim: { helm: 0.10, shield: 0.60, low: 0.30 },
    seat: { brace: 0.35, balanced: 0.50, press: 0.15 },
    tells: [
      { when: 'vsStronger', text: 'Against a better lance he braces and hopes.', seat: { brace: 10, press: 0.2 } },
      { when: 'vsWeaker', text: 'Against a weaker lance he presses for the fall.', seat: { press: 8 }, aim: { low: 5 } },
    ],
  },
  {
    id: 'plain', label: 'an honest lance',
    habit: 'Shield, balanced, every course.',
    aim: { helm: 0.05, shield: 0.85, low: 0.10 },
    seat: { brace: 0.10, balanced: 0.80, press: 0.10 },
    tells: [],
  },
];

// A rider counts as stronger or weaker than another when their ratings differ
// by more than this (rating is roughly the mean of lance and seat).
export const RATING_MARGIN = 1;
