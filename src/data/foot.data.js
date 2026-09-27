// Foot combat at the barriers: strokes, guards, habits, and the articles.
// Logic-free.
//
// Two knights on foot with pollaxes, a waist-high barrier between them, and
// judges with a baton to throw down. Every number that decides an exchange is
// read by exactly one function, footOdds() in src/engine/foot.js, which the
// preview and the resolver both call. Values are logits, as in the lists.

export const STROKES = {
  head: {
    id: 'head', label: 'Head',
    blurb: 'A full swing of the axe at the helm. Hardest to land; scores double, and can drop him.',
    hit: -1.0,     // ~27% for two even men standing square
    points: 2,
    down: -2.3,    // given a hit: he goes to his knee, and the judges stop it
  },
  thrust: {
    id: 'thrust', label: 'Thrust',
    blurb: 'The spike of the axe at his body. The steady stroke.',
    hit: 0.3,      // ~57%
    points: 1,
    down: -3.2,
  },
  hook: {
    id: 'hook', label: 'Hook',
    blurb: 'The beak at his haft or his knee. Scores nothing on its own, but it can take his axe out of his hands, which ends it. A hook that goes below the barrier is a foul.',
    hit: -0.4,
    points: 0,
    take: -0.5,    // given a hit: his axe is gone
    foul: -2.6,    // ~7% before skill and guard
  },
};

export const GUARDS = {
  stand: {
    id: 'stand', label: 'Stand',
    blurb: 'Square at the barrier, as the masters teach.',
    strike: { head: 0, thrust: 0, hook: 0 }, stability: 0, foul: 0, fatigue: 1.0,
  },
  close: {
    id: 'close', label: 'Close',
    blurb: 'Step into the bind. Your thrust and your hook bite; there is no room to swing, for you or for him.',
    strike: { head: -0.7, thrust: 0.3, hook: 0.45 }, stability: -0.35, foul: 0.4, fatigue: 1.5,
  },
  give: {
    id: 'give', label: 'Give ground',
    blurb: 'Step back out of his reach and get your wind. Your own strokes fall short.',
    strike: { head: -0.3, thrust: -0.5, hook: -0.6 }, stability: 0.55, foul: -0.3, fatigue: 0.2,
  },
};

// How the DEFENDER's guard changes each stroke. A man in the bind is inside
// your swing; a man stepping back is at the end of it, and out of reach of
// your spike and your hook.
export const REACH = {
  head: { stand: 0, close: -0.9, give: 0.55 },
  thrust: { stand: 0, close: 0.5, give: -0.8 },
  hook: { stand: -0.2, close: 0.8, give: -1.2 },
};

// Per point away from 10, on the logit scale.
export const FOOT_SKILL = {
  swordAim: 0.15,      // your sword, on landing
  guard: 0.05,         // his sword, on your landing
  swordForce: 0.10,    // your sword, on dropping him or taking his axe
  vigourResist: 0.12,  // his vigour, on staying on his feet
  swordResist: 0.08,   // his sword, on keeping hold of his axe
  swordFoul: 0.10,     // your sword, on keeping the hook above the barrier
  fatigueAim: 0.08,    // per point of fatigue past your threshold
};

export const FOOT_FATIGUE = {
  perExchange: 1.2,         // on top of the guard's own cost
  thresholdPerVigour: 1 / 3,
};

// The articles of a pas at the barriers: blunted axes, a fixed number of
// exchanges, points as the judges count them. A man driven to his knee, or
// disarmed, loses outright; a hook below the barrier costs a point.
export const ARTICLES = {
  id: 'articles',
  name: 'the articles of the barriers',
  exchanges: 3,
  tieExchanges: 2,
  points: { miss: 0, foul: -1, blow: 1, head: 2, disarm: 0, down: 0 },
};

// À outrance: sharp axes, before the judges of the field. Points do not win
// it: a man is beaten when he is down, disarmed, or has taken two blows to the
// head. If neither is beaten by the ninth exchange the king throws down his
// baton and the judges decide on the blows landed.
export const OUTRANCE = {
  id: 'outrance',
  name: 'à outrance, before the judges of the field',
  exchanges: 9,
  tieExchanges: 0,
  hurtsToFall: 2,
  points: { miss: 0, foul: -1, blow: 1, head: 2, disarm: 0, down: 0 },
};

export const FOOT_OUTCOMES = ['miss', 'foul', 'blow', 'head', 'disarm', 'down'];

export const FOOT_OUTCOME_LABELS = {
  miss: 'finds nothing', foul: 'hooks below the barrier', blow: 'lands on the body',
  head: 'rings the helm', disarm: 'takes the axe from his hands', down: 'drives him to his knee',
};

// What an unknown man is assumed to do at the barriers.
export const FIELD_FOOT_HABITS = {
  stroke: { head: 0.3, thrust: 0.5, hook: 0.2 },
  guard: { stand: 0.55, close: 0.2, give: 0.25 },
};

// Styles at the barriers. Every knight of the field has one, as he has a way
// of riding; what you know of a man covers both.
//   when: ahead | behind | level | lastCourse | vsStronger | vsWeaker
export const FOOT_STYLES = [
  {
    id: 'axeman', label: 'an axeman',
    habit: 'Swings for the head, and steps back to make room for it.',
    stroke: { head: 0.6, thrust: 0.3, hook: 0.1 },
    guard: { stand: 0.45, close: 0.05, give: 0.5 },
    tells: [
      { when: 'behind', text: 'Behind, he stops giving ground and stands to trade blows.', guard: { stand: 6, give: 0.2 } },
    ],
  },
  {
    id: 'wrestler', label: 'a wrestler',
    habit: 'Closes to the bind and hooks for your axe.',
    stroke: { head: 0.1, thrust: 0.35, hook: 0.55 },
    guard: { stand: 0.3, close: 0.65, give: 0.05 },
    tells: [
      { when: 'vsStronger', text: 'Against a better man he will not close; he gives ground and waits.', guard: { give: 12, close: 0.1 }, stroke: { thrust: 3, hook: 0.3 } },
    ],
  },
  {
    id: 'fencer', label: 'a fencer',
    habit: 'Keeps his distance and thrusts.',
    stroke: { head: 0.15, thrust: 0.7, hook: 0.15 },
    guard: { stand: 0.45, close: 0.05, give: 0.5 },
    tells: [
      { when: 'ahead', text: 'Once he is ahead he gives ground every exchange and lets you come to him.', guard: { give: 10, stand: 0.3 } },
    ],
  },
  {
    id: 'brawler', label: 'a brawler',
    habit: 'Stands square and trades blows.',
    stroke: { head: 0.35, thrust: 0.55, hook: 0.1 },
    guard: { stand: 0.8, close: 0.15, give: 0.05 },
    tells: [
      { when: 'behind', text: 'Behind, he goes for the bind and the hook.', guard: { close: 10 }, stroke: { hook: 8 } },
    ],
  },
  {
    id: 'schooled', label: 'a schooled man',
    habit: 'Thrusts from the stand, exactly as the masters teach.',
    stroke: { head: 0.1, thrust: 0.8, hook: 0.1 },
    guard: { stand: 0.8, close: 0.1, give: 0.1 },
    tells: [],
  },
];

// How likely a man who has you down, sharp axe in hand, is to finish it. By
// his temperament; shown before you accuse him, and rolled when it happens.
export const NO_QUARTER = { courteous: 0.05, pious: 0.1, proud: 0.35, rough: 0.6, grudge: 0.15 };

// A man with a grudge against you swings harder and for the head.
export const FOOT_GRUDGE = {
  when: 'grudge',
  text: 'He bears you a grudge, and swings for your head.',
  stroke: { head: 2.5 },
  guard: { stand: 1.5 },
};
