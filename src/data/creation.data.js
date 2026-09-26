// Character creation: ten questions, and what each answer does. Logic-free.
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

export const QUESTIONS = [
  {
    id: 'birth',
    prompt: 'How were you born?',
    options: [
      {
        id: 'eldest', title: 'The eldest son',
        blurb: 'Your father’s heir. The name is yours one day, and so is every obligation that comes with it.',
        effects: { lineage: 4, purse: 4 * 240, courtesy: 1, traits: { constant: 2 } },
        sets: { cadency: 'label' },
        flags: ['heir'],
      },
      {
        id: 'younger', title: 'A younger son',
        blurb: 'Landless. The lists are the only estate you will ever win, which is why the circuit is full of men like you.',
        effects: { lineage: 2, lance: 1, vigour: 1, traits: { valorous: 2 } },
        sets: { cadency: 'crescent' },
      },
      {
        id: 'bastard', title: 'An acknowledged bastard',
        blurb: 'Your father owned you, armed you, and gave you the bend sinister so that nobody would forget it.',
        effects: { lineage: -3, lance: 1, seat: 1, vigour: 1, traits: { valorous: 2, honest: -2 } },
        sets: { cadency: 'baton' },
        flags: ['bastard'],
      },
      {
        id: 'fallen', title: 'The last of a fallen house',
        blurb: 'Old blood gone to seed. No coin, a hall with the roof in, and a claim nobody else remembers.',
        effects: { lineage: 6, purse: -3 * 240, courtesy: 1, lore: 1, traits: { constant: 2 } },
        sets: { cadency: 'none' },
        flags: ['dormantClaim'],
      },
    ],
  },
  {
    id: 'advantage',
    prompt: 'What did your family give you to ride out with?',
    options: [
      {
        id: 'wealth', title: 'Wealth',
        blurb: 'Wool money, or a good marriage a generation back. Your purse is heavier than your name.',
        effects: { purse: 30 * 240 },
      },
      {
        id: 'fame', title: 'Fame',
        blurb: 'Your grandfather’s name is still cried at feasts. So are his old quarrels, and men will expect you to live up to him.',
        effects: { renown: 8, purse: 6 * 240 },
        flags: ['grandfatherLegend'],
      },
      {
        id: 'favour', title: 'Favour',
        blurb: 'The Duke of Aumbry owes your father a debt he has not forgotten. It will be repaid, and it will come with strings.',
        effects: { purse: 8 * 240, favour: { aumbry: 10 } },
        flags: ['patronOwes'],
      },
      {
        id: 'oldblood', title: 'Old blood',
        blurb: 'Sixteen quarterings and not a penny to show for them. The heralds will never ask you for proofs.',
        effects: { lineage: 4, honour: 5, purse: 2 * 240 },
      },
    ],
  },
  {
    id: 'province',
    prompt: 'Where were you raised?',
    options: [
      {
        id: 'march', title: 'The Harrow March',
        blurb: 'The northern border. You learned to ride before you could read, and the Earl of Stane holds the March.',
        effects: { seat: 2, vigour: 1, horseQuality: 1, favour: { stane: 3 } },
        sets: { province: 'march' },
      },
      {
        id: 'court', title: 'Kingsmead',
        blurb: 'The crown province. You know which fork, which bow, and which lord not to seat beside which.',
        effects: { courtesy: 2, lore: 1, favour: { crown: 3 } },
        sets: { province: 'court' },
      },
      {
        id: 'coast', title: 'The Saltings',
        blurb: 'The merchant coast, where the guilds pay for tourneys and remember who rode well in them.',
        effects: { purse: 6 * 240, lore: 1, favour: { cities: 5 } },
        sets: { province: 'coast' },
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
    prompt: 'How did you win your spurs?',
    options: [
      {
        id: 'field', title: 'On the field',
        blurb: 'After a border skirmish, the only fighting the peace allowed. Men who were there still speak of it.',
        effects: { renown: 4, honour: 2, traits: { valorous: 2 } },
      },
      {
        id: 'coronation', title: 'En masse, at the prince’s coming of age',
        blurb: 'One of sixty dubbed in a morning. The Crown remembers the day, if not which one you were.',
        effects: { courtesy: 1, favour: { crown: 3 } },
      },
      {
        id: 'deathbed', title: 'At your master’s deathbed',
        blurb: 'He knighted you with the last of his strength. Whatever his story was, it is yours to finish now.',
        effects: { honour: 3, traits: { constant: 3 } },
        sets: { masterFate: 'dead' },
      },
      {
        id: 'bought', title: 'Bought',
        blurb: 'Your family paid the fee and a lord tapped your shoulder. You spent the years other squires spent at war at the tilt instead.',
        effects: { purse: -3 * 240, honour: -2, lance: 1, seat: 1 },
      },
    ],
  },
  {
    id: 'incident',
    prompt: 'In your last year as a squire you saw your master strike a man who had already yielded. What did you do?',
    options: [
      {
        id: 'silent', title: 'Nothing. He was my master.',
        blurb: 'Loyalty is a virtue too. You have told yourself so ever since.',
        effects: { traits: { constant: 3, honest: -2, merciful: -1 } },
      },
      {
        id: 'confronted', title: 'I told him to his face.',
        blurb: 'He did not strike you. He did not speak to you for a month, either.',
        effects: { courtesy: -1, traits: { honest: 3, valorous: 2 } },
        flags: ['masterStrained'],
      },
      {
        id: 'reported', title: 'I told the heralds.',
        blurb: 'They wrote it down. The heralds remember a squire who did that; so do other masters.',
        effects: { honour: 3, traits: { honest: 3, constant: -3 } },
        flags: ['reportedMaster'],
      },
    ],
  },
  {
    id: 'horse',
    prompt: 'What do you ride?',
    options: [
      {
        id: 'old', title: 'An old destrier',
        blurb: 'Three campaigns behind him. Honest, strong, steady, and perhaps three seasons left in his legs.',
        effects: {},
        sets: { horse: 'old' },
      },
      {
        id: 'green', title: 'A green colt',
        blurb: 'Hot, unmade and the best-bred horse you will ever own, if you can make him. He grows in the Season build; today he is a handful.',
        effects: {},
        sets: { horse: 'green' },
      },
      {
        id: 'borrowed', title: 'A borrowed horse',
        blurb: 'A fine, steady horse lent by a friend of your father’s. You will be expected to give him back, or to buy him.',
        effects: {},
        sets: { horse: 'borrowed' },
        flags: ['borrowedHorse'],
      },
    ],
  },
  {
    id: 'heart',
    prompt: 'And your heart?',
    options: [
      {
        id: 'promised', title: 'Promised',
        blurb: 'Betrothed since childhood to a lady of a house that expects you to rise.',
        effects: { traits: { constant: 2 } },
        flags: ['betrothed'],
      },
      {
        id: 'free', title: 'Free',
        blurb: 'The circuit is full of feasts, and every feast is full of favours.',
        effects: { courtesy: 1 },
      },
      {
        id: 'secret', title: 'A secret',
        blurb: 'There is someone. Nobody can know who.',
        effects: { traits: { constant: 2, honest: -1 } },
        flags: ['secretLove'],
      },
    ],
  },
  {
    id: 'ambition',
    prompt: 'What do you want?',
    options: [
      {
        id: 'champion', title: 'To be Champion of the Realm',
        blurb: 'The first lance of Lothmere, crowned at the king’s own lists.', steers: true,
      },
      {
        id: 'lordship', title: 'Land of my own',
        blurb: 'A hall, a name that is yours and not your father’s, and men who hold of you.', steers: true,
      },
      {
        id: 'order', title: 'A seat in the Order',
        blurb: 'Twenty-four companions. A vacancy comes only when one of them dies.', steers: true,
      },
      {
        id: 'love', title: 'Her',
        blurb: 'Everything else is only the road to it.', steers: true,
      },
      {
        id: 'clearName', title: 'To clear my master’s name',
        blurb: 'Whatever happened at Ambry Cross, someone knows the truth.', steers: true,
        requires: { flag: 'masterDisgraced' },
      },
    ],
  },
];

export function question(id) {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Unknown creation question: ${id}`);
  return q;
}
