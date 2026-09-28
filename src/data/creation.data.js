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
//   lance, seat, sword, vigour, courtesy, lore — skills, on a 1-20 scale
//   purse                                 — pence
//   renown, honour, lineage               — standing
//   favour: { crown, aumbry, stane, church, cities }
//   traits: { valorous, generous, merciful, pious, honest, constant }
//            each is the first of a pair that sums to 20 (valorous/cautious…)
//   horseQuality                          — added to the horse you choose
// `sets` replaces a value outright; `flags` are plot threads for later builds.

export const BASE_KNIGHT = {
  age: 21,
  stats: { lance: 8, seat: 8, sword: 8, vigour: 8, courtesy: 8, lore: 8 },
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
  lance: 'Lance', seat: 'Seat', sword: 'Sword', vigour: 'Vigour', courtesy: 'Courtesy', lore: 'Lore',
};

// What each skill does in the lists TODAY. Shown on the knight's sheet, so a
// player can see which numbers are live and which are waiting on a later build.
export const STAT_USES = {
  lance: 'How often your lance lands, and how hard.',
  seat: 'Keeping your saddle, and keeping your lance off the tilt.',
  sword: 'Sword and axe: landing your strokes on foot at the barriers, and holding your own in the press of the mêlée.',
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

// Six chapters of a life, each asking one thing. A chapter opens with a
// scene (`preface`), which may answer to something said before it
// (`prefaceBy`: { questionId: { optionId: text } }); {master} is filled in.
// Every answer is said in the knight's own voice, tells its small story in
// `blurb`, and leaves a line for the heralds' roll in `told`, from which the
// knight's biography is written when he rides out.
export const QUESTIONS = [
  {
    id: 'people',
    chapter: 'Blood',
    preface: 'Every knight is somebody’s son. Before the heralds cry your name they will want to know whose, and they will write it down.',
    prompt: 'Into what house were you born?',
    options: [
      {
        id: 'heir', title: 'My father’s eldest son, and his heir.',
        blurb: 'The wool money came a generation back, and the arms were bought with it. One day the hall is yours, and the name, and every debt of honour tied to them. Until then your father pays for everything, and watches everything you do.',
        told: 'You were born the eldest son of a house made rich by wool, heir to its hall and its name',
        effects: { lineage: 4, purse: 30 * 240, courtesy: 1, traits: { constant: 2 } },
        sets: { cadency: 'label', birth: 'eldest', advantage: 'wealth' },
        flags: ['heir'],
      },
      {
        id: 'younger', title: 'A younger son of a famous name.',
        blurb: 'Your grandfather’s lance is still toasted at feasts, and his quarrels are still remembered by the families on the other side of them. You will inherit nothing but his name, and men will expect you to live up to it.',
        told: 'You were born a younger son of a famous house, heir to nothing but your grandfather’s name and his old quarrels',
        effects: { lineage: 2, lance: 1, vigour: 1, renown: 8, purse: 6 * 240, traits: { valorous: 2 } },
        sets: { cadency: 'crescent', birth: 'younger', advantage: 'fame' },
        flags: ['grandfatherLegend'],
      },
      {
        id: 'bastard', title: 'My father’s bastard, and he owned me.',
        blurb: 'He armed you, and gave you his arms with the baton sinister across them so that nobody would forget. The Duke of Aumbry owes your father a debt from the war, and knows that you are its only heir.',
        told: 'You were born your father’s bastard, and he owned you: you carry his arms with the baton sinister, and the Duke of Aumbry’s debt to him',
        effects: { lineage: -3, lance: 1, seat: 1, vigour: 1, purse: 8 * 240, favour: { aumbry: 10 }, traits: { valorous: 2, honest: -2 } },
        sets: { cadency: 'baton', birth: 'bastard', advantage: 'favour' },
        flags: ['bastard', 'patronOwes'],
      },
      {
        id: 'fallen', title: 'The last of a fallen house.',
        blurb: 'Sixteen quarterings, a hall with the roof fallen in, and a chest of charters for lands nobody has let your family hold since the war. The heralds will never question your blood. Nobody will lend you a penny against it, either.',
        told: 'You were born the last of a fallen house, with sixteen quarterings, a roofless hall, and a chest of charters for lands your family lost in the war',
        effects: { lineage: 10, honour: 5, purse: -1 * 240, courtesy: 1, lore: 1, traits: { constant: 2 } },
        sets: { cadency: 'none', birth: 'fallen', advantage: 'oldblood' },
        flags: ['dormantClaim'],
      },
    ],
  },
  {
    id: 'country',
    chapter: 'Boyhood',
    preface: 'Before you could read, you could ride. Every knight can say that. What matters is where, and on what.',
    prefaceBy: {
      people: {
        heir: 'Your father could afford a master for everything. The one thing he taught you himself was the horse.',
        younger: 'Your elder brothers had the good horses. You had whatever was left, and you learned more from it than they did.',
        bastard: 'Nobody at your father’s table taught you to ride. The grooms did, and they were better at it.',
        fallen: 'There was one horse left in your family’s stable, and it was older than you. You learned on it anyway.',
      },
    },
    prompt: 'Where did you learn to ride?',
    options: [
      {
        id: 'march', title: 'On the Harrow March, where the raiders come over the hills.',
        blurb: 'Border country, the Earl of Stane’s, where boys ride out after Scarrow cattle-thieves at twelve. When you left, your father gave you a colt from the March herds: hot, unschooled, and the best-bred horse you will ever own, if you can make him.',
        told: 'grew up in the saddle on the Harrow March, and rode out from it on a green colt of the March herds',
        effects: { seat: 2, vigour: 1, horseQuality: 1, favour: { stane: 3 } },
        sets: { province: 'march', horse: 'green' },
      },
      {
        id: 'court', title: 'In the tiltyards of Kingsmead, under the heralds’ eyes.',
        blurb: 'The crown’s own province, where you learned which fork, which bow, and which lord not to seat beside which. A friend of your father’s at court has lent you a fine, steady horse to ride out on. He will want him back by winter, or paid for.',
        told: 'learned the tiltyards and the manners of Kingsmead, and rode out on a borrowed horse',
        effects: { courtesy: 2, lore: 1, favour: { crown: 3 } },
        sets: { province: 'court', horse: 'borrowed' },
        flags: ['borrowedHorse'],
      },
      {
        id: 'coast', title: 'On the strand at the Saltings, among merchants’ sons.',
        blurb: 'The coast, where the guilds pay for the tourneys and remember who rode well in them. Wool money bought you an honest old warhorse with three campaigns behind him, and perhaps three seasons left in him.',
        told: 'grew up among the guild towns of the Saltings, and rode out on an old warhorse from the market',
        effects: { purse: 6 * 240, lore: 1, favour: { cities: 5 } },
        sets: { province: 'coast', horse: 'old' },
      },
    ],
  },
  {
    id: 'master',
    chapter: 'Squire',
    preface: 'At fourteen every knight’s son is sent from home to serve a knight: to arm him, to feed his horse, to carry his lances, and to watch.',
    prefaceBy: {
      country: {
        march: 'You left the March at fourteen with a bundle, a letter of introduction, and your father’s advice, which was to keep your mouth shut.',
        court: 'At fourteen you crossed Kingsmead from your father’s lodgings to another man’s, and that was the whole of the journey.',
        coast: 'At fourteen your father found you a master the way he found everything: by asking what it would cost.',
      },
    },
    prompt: 'Whose lances did you carry?',
    options: [
      {
        id: 'champion', title: 'Sir Tancred Vane’s, twice champion of the realm.',
        blurb: 'The best lance of his generation, and he knew it. He taught by example and hardly ever in words. You carried his lances and learned how he chose where to put them. His old rivals will know your face.',
        told: 'You were squire to Sir Tancred Vane, twice champion of the realm',
        effects: { lance: 2, renown: 3 },
        sets: { master: 'champion' },
        flags: ['masterChampion'],
      },
      {
        id: 'courtier', title: 'Sir Amaury de Lisle’s, of the king’s chamber.',
        blurb: 'More feasts than fights. He knew everyone at court and what everyone wanted, and he taught you to know it too.',
        told: 'You were squire to Sir Amaury de Lisle of the king’s chamber',
        effects: { courtesy: 3, lore: 1, favour: { crown: 2 } },
        sets: { master: 'courtier' },
      },
      {
        id: 'disgraced', title: 'Sir Osbert Grayle’s, who lost his spurs at Ambry Cross.',
        blurb: 'Twenty years ago, at the tourney that celebrated the peace, a lance struck Lord Ranulf of Aumbry’s horse, and the horse fell on him and killed him. The heralds said the lance was Sir Osbert’s. He swore it was not. He is still the finest lance you ever saw.',
        told: 'You were squire to Sir Osbert Grayle, who lost his spurs at Ambry Cross',
        effects: { lance: 2, seat: 1, honour: -3 },
        sets: { master: 'disgraced' },
        flags: ['masterDisgraced'],
      },
      {
        id: 'veteran', title: 'Sir Warin Hollin’s, who held the March in the war.',
        blurb: 'He held Hollin Moor against the Scarrow for a winter with forty men, and brought eleven home. He taught you to last, and not much about mercy.',
        told: 'You were squire to Sir Warin Hollin, who held the March in the Scarrow war',
        effects: { vigour: 2, sword: 1, traits: { merciful: -2, valorous: 1 } },
        sets: { master: 'veteran' },
      },
      {
        id: 'pious', title: 'Sir Everard Challon’s, who went to Jerusalem.',
        blurb: 'He went to the Holy Sepulchre after the war and came back quieter. The Church still says the tourney is a sin; he rode in them anyway, and prayed before every course.',
        told: 'You were squire to Sir Everard Challon, who went to the Holy Sepulchre and came back quieter',
        effects: { honour: 3, courtesy: 1, favour: { church: 5 }, traits: { pious: 4, merciful: 3 } },
        sets: { master: 'pious' },
      },
    ],
  },
  {
    id: 'taught',
    chapter: 'Learning',
    preface: 'Seven years is long enough to learn a man’s whole trade, and one part of it better than he knew it himself.',
    prefaceBy: {
      master: {
        champion: 'Sir Tancred never explained anything twice. But there was one thing he showed you over and over, until you had it.',
        courtier: 'Sir Amaury taught a great deal, most of it over supper. One lesson he gave you with his whole heart.',
        disgraced: 'Sir Osbert had nothing left but his skill, and he gave you all of it. One part of it most of all.',
        veteran: 'Sir Warin taught the way the war had taught him: hard, and once.',
        pious: 'Sir Everard taught you to pray before the lists. Then he taught you the lists.',
      },
    },
    prompt: 'What did he teach you best?',
    options: [
      {
        id: 'lance', title: 'Where to put the point, and when to drop it.',
        blurb: 'A lance is aimed long before it arrives. He taught you to see the mark before your horse had taken three strides.',
        told: 'and he taught you the lance',
        effects: { lance: 2 },
      },
      {
        id: 'horse', title: 'To sit a charge as if the saddle were part of me.',
        blurb: 'A man who cannot be moved cannot be beaten. You can sit a horse through a blow that would put another man in the sand.',
        told: 'and he taught you to sit a charge',
        effects: { seat: 2 },
      },
      {
        id: 'barriers', title: 'The pollaxe, and the wind to use it.',
        blurb: 'Foot combat at the barriers, and the sword in the press of the mêlée. Hours of it, every day, until you could swing on long after other men were done.',
        told: 'and he taught you the pollaxe and the sword',
        effects: { sword: 2, vigour: 1 },
      },
      {
        id: 'manners', title: 'How to speak to a herald, and to a lady.',
        blurb: 'Precedence, the dance, the right word to the right man at the right time. Heralds charge less to a knight they like.',
        told: 'and he taught you the manners of a great hall',
        effects: { courtesy: 2 },
      },
      {
        id: 'letters', title: 'To read, to reckon, and to know a man by his arms.',
        blurb: 'You can read a charter and a roll of arms. You know how a rider rides before he has put his helm on.',
        told: 'and he taught you letters and heraldry',
        effects: { lore: 2 },
      },
    ],
  },
  {
    id: 'spurs',
    chapter: 'Spurs',
    preface: 'Seven years you served {master}. Then the day came, as it does for some squires and not for others.',
    prompt: 'How did you win your spurs?',
    options: [
      {
        id: 'field', title: 'At his side, in a fight on the border.',
        blurb: 'Scarrow raiders over the March, the only fighting the peace allows. You held his flank until it was over, and he knighted you there in the mud with his own sword. Whatever he was, you stood by him.',
        told: 'He knighted you in the mud after a border fight, for holding his flank',
        effects: { renown: 4, honour: 2, traits: { valorous: 2, constant: 2 } },
      },
      {
        id: 'deathbed', title: 'At his deathbed.',
        blurb: 'He called for his sword with the last of his strength and gave you the accolade lying down. Whatever his story was, it is yours to finish now.',
        told: 'He knighted you on his deathbed, and left his story to you',
        effects: { honour: 3, traits: { constant: 3 } },
        sets: { masterFate: 'dead' },
      },
      {
        id: 'reported', title: 'After I told the heralds what he did.',
        blurb: 'You saw him strike a knight who had already yielded, and you went to the heralds. He turned you out. The Crown remembered a squire who did the right thing, and you were dubbed with sixty others on the king’s birthday.',
        told: 'When he struck a man who had yielded you told the heralds, and he turned you out; you were dubbed with sixty others on the king’s birthday',
        effects: { honour: 2, courtesy: 1, favour: { crown: 3 }, traits: { honest: 3, constant: -3 } },
        flags: ['reportedMaster'],
      },
      {
        id: 'confronted', title: 'With my family’s money, after we quarrelled.',
        blurb: 'You saw him strike a knight who had already yielded, and told him so to his face. He did not strike you. He never spoke to you again. Your family paid the fee for your spurs, and you spent your last squire’s years at the tilt instead of at his side.',
        told: 'You quarrelled with him over a yielded man he struck, and your family bought your spurs',
        effects: { purse: -3 * 240, lance: 1, seat: 1, traits: { honest: 3, valorous: 2 } },
        flags: ['masterStrained'],
      },
    ],
  },
  {
    id: 'heart',
    chapter: 'The road',
    preface: 'The morning you ride out you are twenty-one, with a horse, a harness, a name and a purse. The king is old and has no son, and the circuit is full of men who want something. So do you.',
    prompt: 'What do you ride out for?',
    options: [
      {
        id: 'champion', title: 'To be the first lance of Lothmere.',
        blurb: 'Champion of the Realm: the name the heralds cry first. Nobody waits for you at home, and you would not want them to.',
        told: 'You rode out to be the first lance of Lothmere, and nobody waited for you',
        effects: { traits: { valorous: 1 } }, steers: true,
        sets: { heart: 'free', ambition: 'champion' },
      },
      {
        id: 'lordship', title: 'A hall of my own, and the lady who comes with it.',
        blurb: 'You are betrothed to a lady whose house expects you to rise. You want a name that is yours and not your father’s, and land to put it on.',
        told: 'You rode out betrothed, wanting a hall and a name of your own',
        effects: { traits: { constant: 2 } }, steers: true,
        sets: { heart: 'promised', ambition: 'lordship' },
        flags: ['betrothed'],
      },
      {
        id: 'love', title: 'Her.',
        blurb: 'You love someone you cannot name. Everything else is only the road to her.',
        told: 'You rode out for a lady whose name you could not say',
        effects: { traits: { constant: 2, honest: -1 } }, steers: true,
        sets: { heart: 'secret', ambition: 'love' },
        flags: ['secretLove'],
      },
      {
        id: 'order', title: 'A seat among the Companions of the Swan.',
        blurb: 'Twenty-four companions, chosen by their chapter under the king. A seat falls empty only when a companion dies or is disgraced, and only a knight without reproach is chosen to fill it.',
        told: 'You rode out wanting a seat among the Companions of the Swan',
        effects: { honour: 1, traits: { pious: 1 } }, steers: true,
        sets: { heart: 'free', ambition: 'order' },
      },
      {
        id: 'clearName', title: 'My master’s name.',
        blurb: 'Somebody knows what really happened at Ambry Cross. Nothing else matters until you do.', steers: true,
        told: 'You rode out to clear your master’s name',
        effects: { traits: { constant: 2 } },
        sets: { heart: 'free', ambition: 'clearName' },
        requires: { flag: 'masterDisgraced' },
      },
    ],
  },
];

// What lies ahead, for the heralds' roll: one line for each thread a knight
// rides out with, and the one every knight rides out under.
export const HOOKS = {
  heir: 'Your father expects you home a credit to the name, and will say so in every letter.',
  grandfatherLegend: 'Your grandfather’s enemies are still riding, and some of them have sons.',
  patronOwes: 'The Duke of Aumbry owes your father a debt. He knows you are its heir, and so will his rivals.',
  dormantClaim: 'Your family’s charters are in a chest. One day the king’s justices might hear them.',
  masterChampion: 'Sir Tancred’s old rivals will know you by your master, and some of them never forgave him.',
  masterDisgraced: 'Somebody in the field knows whose lance it really was at Ambry Cross.',
  reportedMaster: 'The heralds remember the squire who spoke up. So does the man you spoke against.',
  masterStrained: 'Your master rides the same circuit, and he does not speak to you.',
  borrowedHorse: 'The horse must go back to his owner by winter, or be paid for.',
  betrothed: 'Your lady is waiting for you to rise, and so is her father.',
  secretLove: 'Nobody can know. Somebody will.',
  realm: 'The king is old and has no son. Everyone at court is counting on something.',
};

export const HEART_LABELS = {
  free: 'free', promised: 'promised', secret: 'a secret', married: 'married',
};
export const AMBITION_LABELS = {
  champion: 'to be Champion of the Realm',
  lordship: 'land of your own',
  love: 'her',
  order: 'a seat among the Companions of the Swan',
  clearName: 'to clear your master’s name',
};

export function question(id) {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Unknown creation question: ${id}`);
  return q;
}
