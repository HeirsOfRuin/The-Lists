// Character creation: six questions, and what each answer does. Logic-free.
//
// Every option carries its mechanical consequences as data. The line a player
// reads under an option ("Lance +2, Purse +£30") is GENERATED from these
// effects by the engine, never written by hand, so the copy cannot promise
// something the numbers do not do. An option whose only weight is narrative
// says so with `steers`, and the test suite holds every other option to
// having at least one real effect.
//
// Effect keys (all additive unless under `sets`):
//   lance, seat, vigour, courtesy, lore   — skills, on a 1-20 scale
//   purse                                 — pence
//   renown, honour, lineage               — standing
//   favour: { crown, aumbry, stane, church, cities }
//   traits: { valorous, generous, merciful, pious, honest, constant }
//            each is the first of a pair that sums to 20 (valorous/cautious…)
//   horseQuality                          — added to the horse you choose
// `sets` replaces a value outright; `flags` are plot threads for later builds.

export const BASE_KNIGHT = {
  age: 21,
  stats: { lance: 8, seat: 8, vigour: 8, courtesy: 8, lore: 8 },
  purse: 6 * 240, // six pounds: what a landless knight might ride out with
  renown: 0,
  honour: 10,
  lineage: 8,
  favour: { crown: 0, aumbry: 0, stane: 0, church: 0, cities: 0 },
  traits: { valorous: 10, generous: 10, merciful: 10, pious: 10, honest: 10, constant: 10 },
};

export const TRAIT_PAIRS = [
  ['valorous', 'cautious'],
  ['generous', 'grasping'],
  ['merciful', 'ruthless'],
  ['pious', 'worldly'],
  ['honest', 'cunning'],
  ['constant', 'fickle'],
];

export const STAT_LABELS = {
  lance: 'Lance', seat: 'Seat', vigour: 'Vigour', courtesy: 'Courtesy', lore: 'Lore',
};

// What each skill does in the lists TODAY. Shown on the knight's sheet, so a
// player can see which numbers are live and which are waiting on a later build.
export const STAT_USES = {
  lance: 'How often your lance lands, and how hard.',
  seat: 'Keeping your saddle, and keeping your lance off the tilt.',
  vigour: 'How long before fatigue tells, and how well you take a fall.',
  courtesy: 'The heralds like a well-mannered knight: their read of a rival costs you less.',
  lore: 'Knowing arms and reputations: at 12 or more you know every rival’s habits on arrival.',
};

export const HORSES = {
  old: {
    id: 'old', label: 'An old destrier', quality: 13, potential: 13, age: 14, temper: 'steady',
  },
  green: {
    id: 'green', label: 'A green colt', quality: 9, potential: 16, age: 5, temper: 'hot',
  },
  borrowed: {
    id: 'borrowed', label: 'A borrowed horse', quality: 15, potential: 15, age: 9, temper: 'steady',
    borrowed: true,
  },
};

// Six questions. Each of the first, second, fifth and sixth answers two things
// at once — birth and what the family gave, home and the horse, how you won
// your spurs and how you parted from your master, what you want and who waits
// for you — so every answer is a small story rather than a form field.
export const QUESTIONS = [
  {
    id: 'people',
    prompt: 'Who are your people?',
    options: [
      {
        id: 'heir', title: 'The heir of a rich house',
        blurb: 'Your father’s eldest, and wool money a generation back. The name is yours one day, and so is every obligation that comes with it.',
        effects: { lineage: 4, purse: 30 * 240, courtesy: 1, traits: { constant: 2 } },
        sets: { cadency: 'label', birth: 'eldest', advantage: 'wealth' },
        flags: ['heir'],
      },
      {
        id: 'younger', title: 'A younger son of a famous name',
        blurb: 'Landless, like half the circuit — but your grandfather’s name is still cried at feasts. So are his old quarrels, and men will expect you to live up to him.',
        effects: { lineage: 2, lance: 1, vigour: 1, renown: 8, purse: 6 * 240, traits: { valorous: 2 } },
        sets: { cadency: 'crescent', birth: 'younger', advantage: 'fame' },
        flags: ['grandfatherLegend'],
      },
      {
        id: 'bastard', title: 'An acknowledged bastard',
        blurb: 'Your father owned you, armed you, and gave you the bend sinister so nobody would forget it. The Duke of Aumbry owes him a debt, and knows you are its only heir.',
        effects: { lineage: -3, lance: 1, seat: 1, vigour: 1, purse: 8 * 240, favour: { aumbry: 10 }, traits: { valorous: 2, honest: -2 } },
        sets: { cadency: 'baton', birth: 'bastard', advantage: 'favour' },
        flags: ['bastard', 'patronOwes'],
      },
      {
        id: 'fallen', title: 'The last of a fallen house',
        blurb: 'Sixteen quarterings, a hall with the roof in, and not a penny. The heralds will never ask you for proofs — and there is a claim to your family’s old lands that nobody else remembers.',
        effects: { lineage: 10, honour: 5, purse: -1 * 240, courtesy: 1, lore: 1, traits: { constant: 2 } },
        sets: { cadency: 'none', birth: 'fallen', advantage: 'oldblood' },
        flags: ['dormantClaim'],
      },
    ],
  },
  {
    id: 'country',
    prompt: 'Where were you raised, and what do you ride?',
    options: [
      {
        id: 'march', title: 'The Harrow March, on a colt from my father’s herd',
        blurb: 'The northern border, where you rode before you could read. The colt is hot and unmade and the best-bred horse you will ever own, if you can make him. The Earl of Stane holds the March.',
        effects: { seat: 2, vigour: 1, horseQuality: 1, favour: { stane: 3 } },
        sets: { province: 'march', horse: 'green' },
      },
      {
        id: 'court', title: 'Kingsmead, on a borrowed horse',
        blurb: 'The crown province: you know which fork, which bow, and which lord not to seat beside which. A friend of your father’s at court has lent you a fine, steady horse. He will want him back, or paid for.',
        effects: { courtesy: 2, lore: 1, favour: { crown: 3 } },
        sets: { province: 'court', horse: 'borrowed' },
        flags: ['borrowedHorse'],
      },
      {
        id: 'coast', title: 'The Saltings, on an old destrier from the market',
        blurb: 'The merchant coast, where the guilds pay for tourneys and remember who rode well in them. Money bought you an honest old warhorse with three campaigns behind him and perhaps three seasons left.',
        effects: { purse: 6 * 240, lore: 1, favour: { cities: 5 } },
        sets: { province: 'coast', horse: 'old' },
      },
    ],
  },
  {
    id: 'master',
    prompt: 'Whose squire were you?',
    options: [
      {
        id: 'champion', title: 'A champion',
        blurb: 'Sir Tancred Vane, twice champion of the realm. You carried his lances and learned how he chose where to put them.',
        effects: { lance: 2, renown: 3 },
        sets: { master: 'champion' },
        flags: ['masterChampion'],
      },
      {
        id: 'courtier', title: 'A courtier',
        blurb: 'Sir Amaury de Lisle, of the king’s chamber. More feasts than fights, and you learned from both.',
        effects: { courtesy: 3, lore: 1, favour: { crown: 2 } },
        sets: { master: 'courtier' },
      },
      {
        id: 'disgraced', title: 'A disgraced knight',
        blurb: 'Sir Osbert Grayle, stripped of his spurs at Ambry Cross for a thing he swore he did not do. The finest lance you ever saw.',
        effects: { lance: 2, seat: 1, honour: -3 },
        sets: { master: 'disgraced' },
        flags: ['masterDisgraced'],
      },
      {
        id: 'veteran', title: 'A veteran of the war',
        blurb: 'Sir Warin Hollin held the March in the last war. He taught you to last, and not much about mercy.',
        effects: { vigour: 2, seat: 1, traits: { merciful: -2, valorous: 1 } },
        sets: { master: 'veteran' },
      },
      {
        id: 'pious', title: 'A pious knight',
        blurb: 'Sir Everard Challon went to the Holy Sepulchre and came back quieter. The Church still thinks tourneys are sinful; he rode in them anyway.',
        effects: { honour: 3, courtesy: 1, favour: { church: 5 }, traits: { pious: 4, merciful: 3 } },
        sets: { master: 'pious' },
      },
    ],
  },
  {
    id: 'taught',
    prompt: 'What did he teach you best?',
    options: [
      {
        id: 'lance', title: 'The lance', blurb: 'Where to put the point, and when to drop it.',
        effects: { lance: 2 },
      },
      {
        id: 'horse', title: 'The horse', blurb: 'To sit a charge as if the saddle were built around you.',
        effects: { seat: 2 },
      },
      {
        id: 'barriers', title: 'The axe at the barriers',
        blurb: 'Foot combat, and the wind to last it. The barriers themselves come to the circuit in a later build; the wind is yours now.',
        effects: { vigour: 2 },
      },
      {
        id: 'manners', title: 'Manners', blurb: 'Precedence, the dance, and how to speak to a herald.',
        effects: { courtesy: 2 },
      },
      {
        id: 'letters', title: 'Letters and heraldry', blurb: 'To read, to reckon, and to know a man by his arms.',
        effects: { lore: 2 },
      },
    ],
  },
  {
    id: 'spurs',
    prompt: 'How did you part from your master, and how did you win your spurs?',
    options: [
      {
        id: 'field', title: 'He knighted me on the field',
        blurb: 'After a border skirmish, the only fighting the peace allowed. You stood by him that day and every day before it. Whatever he was, you were loyal.',
        effects: { renown: 4, honour: 2, traits: { valorous: 2, constant: 2 } },
      },
      {
        id: 'deathbed', title: 'He knighted me on his deathbed',
        blurb: 'With the last of his strength. Whatever his story was, it is yours to finish now.',
        effects: { honour: 3, traits: { constant: 3 } },
        sets: { masterFate: 'dead' },
      },
      {
        id: 'reported', title: 'I reported him, and the prince dubbed me with sixty others',
        blurb: 'You saw him strike a man who had already yielded, and you told the heralds. He turned you out. The Crown remembered the squire who did the right thing, if not which of the sixty you were.',
        effects: { honour: 2, courtesy: 1, favour: { crown: 3 }, traits: { honest: 3, constant: -3 } },
        flags: ['reportedMaster'],
      },
      {
        id: 'confronted', title: 'I told him to his face, and my family bought my spurs',
        blurb: 'You saw him strike a man who had already yielded, and said so. He did not strike you. He did not speak to you again, either. Your family paid the fee, and you spent the years other squires spent at war at the tilt.',
        effects: { purse: -3 * 240, lance: 1, seat: 1, traits: { honest: 3, valorous: 2 } },
        flags: ['masterStrained'],
      },
    ],
  },
  {
    id: 'heart',
    prompt: 'What do you want, and who waits for you?',
    options: [
      {
        id: 'champion', title: 'To be Champion of the Realm. Nobody waits.',
        blurb: 'The first lance of Lothmere, crowned at the king’s own lists. The circuit is full of feasts, and every feast is full of favours.',
        effects: { traits: { valorous: 1 } }, steers: true,
        sets: { heart: 'free', ambition: 'champion' },
      },
      {
        id: 'lordship', title: 'Land of my own, and the marriage that brings it',
        blurb: 'A hall, a name that is yours and not your father’s. You are betrothed to a lady of a house that expects you to rise.',
        effects: { traits: { constant: 2 } }, steers: true,
        sets: { heart: 'promised', ambition: 'lordship' },
        flags: ['betrothed'],
      },
      {
        id: 'love', title: 'Her. Nobody can know who.',
        blurb: 'Everything else is only the road to it.',
        effects: { traits: { constant: 2, honest: -1 } }, steers: true,
        sets: { heart: 'secret', ambition: 'love' },
        flags: ['secretLove'],
      },
      {
        id: 'order', title: 'A seat in the Order',
        blurb: 'Twenty-four companions. A vacancy comes only when one of them dies, and only the spotless are chosen.',
        effects: { honour: 1, traits: { pious: 1 } }, steers: true,
        sets: { heart: 'free', ambition: 'order' },
      },
      {
        id: 'clearName', title: 'To clear my master’s name',
        blurb: 'Whatever happened at Ambry Cross, someone knows the truth. Nothing else matters yet.', steers: true,
        effects: { traits: { constant: 2 } },
        sets: { heart: 'free', ambition: 'clearName' },
        requires: { flag: 'masterDisgraced' },
      },
    ],
  },
];

export const HEART_LABELS = {
  free: 'free', promised: 'promised', secret: 'a secret', married: 'married',
};
export const AMBITION_LABELS = {
  champion: 'to be Champion of the Realm',
  lordship: 'land of your own',
  love: 'her',
  order: 'a seat in the Order',
  clearName: 'to clear your master’s name',
};

export function question(id) {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Unknown creation question: ${id}`);
  return q;
}
