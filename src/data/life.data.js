// A life: the Company of the Swan, vows, the fairs, archers, the war's months,
// and how a career ends. Logic-free.

// ---------------------------------------------------------------------------
// The Company of the Swan
// ---------------------------------------------------------------------------

// Twenty-four stalls in the chapel at Kingsmead. Eight are held by the great
// lords, sixteen by knights. A stall falls empty by death, by a field, or by
// disgrace, and the chapter fills it at Candlemas: each companion names one
// knight, and the king breaks a tie.
export const ORDER = {
  knightSeats: 16,
  eligible: { honour: 15, renown: 40, years: 8 }, // without reproach, known, and of eight years' standing
  degradeBelow: 8,                        // a companion whose honour falls here is put out
  candidates: 4,                          // the field's strongest put forward, besides you
  candidateRenown: 25,
  // How a companion weighs a candidate. Each adds a draw of `noise` to every
  // name, and names the one that comes out highest.
  vote: {
    renown: 0.03,        // per point of renown, to renownCap: past it the chapter is not impressed
    renownCap: 60,
    seniority: 0.2,      // per year a knight, to twenty
    knightedAt: 21,      // a knight of the field's years, from his age
    prizes: 0.25,        // per great prize or title, to five
    sameSide: 1.2,       // a man of his own house
    regard: 0.3,         // per point of a knight's regard for you
    honour: 0.3,         // per point of your honour past fifteen
    lineage: 0.08,       // per point of lineage past ten
    favour: 0.1,         // a lord: per point of his house's favour for you, to favourCap
    favourCap: 15,
    noise: 1.6,
  },
  // What the chapter credits a candidate from the field with, where it would
  // credit you with your own honour, regard and favour.
  fieldCandidate: { honour: 17, regard: 3, ownFavour: 12, favour: 5 },
  // Death among the companions, by age, each winter.
  death: { from: 45, base: 0.01, perYear: 0.008, max: 0.3 },
  table: { cost: 6 * 240, regard: 1 },    // a table kept for the companions at Candlemas
  elected: { renown: 8, honour: 1 },
  importance: 6,
  reckonSamples: 300,
};

// The lords of the Company at the start of a career. `faction` is the house
// whose interest they vote. After the war, the beaten house's lords are
// attainted and the new crown gives their stalls to its own.
export const ORDER_LORDS = [
  { id: 'aumbry', name: 'Duke Robert of Aumbry', faction: 'aumbry' },
  { id: 'vesci', name: 'Lord Edmund Vesci', faction: 'aumbry' },
  { id: 'stane', name: 'Godwin, Earl of Stane', faction: 'stane' },
  { id: 'geoffrey', name: 'Lord Geoffrey of Stane', faction: 'stane' },
  { id: 'constable', name: 'Sir Hugh Marwood, the Constable', faction: 'crown' },
  { id: 'chamberlain', name: 'Lord Walter Hythe, the Chamberlain', faction: 'crown' },
  { id: 'tallis', name: 'Lord Ranulf Tallis of the March', faction: 'crown' },
  { id: 'aske', name: 'Lord John Aske of the Saltings', faction: 'cities' },
];
// Who the new crown gives an attainted lord's stall to.
export const NEW_LORDS = {
  aumbry: ['Lord Piers Aumbry, the new duke’s cousin', 'Sir Giles Harcourt, the new king’s marshal', 'Lord Aylmer of Ambry Heath'],
  stane: ['Lord Tristram Brede, the queen’s steward', 'Sir Walter Vane, the queen’s marshal', 'Lord Osric of Brede Water'],
};

// ---------------------------------------------------------------------------
// Vows, taken on the swans at the Candlemas feast
// ---------------------------------------------------------------------------

// Each is judged from the Book of Feats at the next winter. `need` is what
// keeps it; `minRenown` who may credibly take it. A vow kept is renown and
// honour; a vow broken costs more than it would have paid.
export const VOWS = [
  {
    id: 'lances', title: 'To break fifteen lances before the year is out.',
    blurb: 'Nothing clever: ride often, and hit what you ride at.', need: 15, minRenown: 0,
    kept: { renown: 3, honour: 1 }, broken: { renown: -2, honour: -2 },
  },
  {
    id: 'unhorse', title: 'To bear three knights to the ground.',
    blurb: 'In the lists, at the tilt. Aim low and press, and pray.', need: 3, minRenown: 10,
    kept: { renown: 6, honour: 1 }, broken: { renown: -2, honour: -2 },
  },
  {
    id: 'champion', title: 'To carry off the prize of a tourney.',
    blurb: 'Any tourney of the lords’ circuit or better: win the jousts, the mêlée or the barriers.', need: 1, minRenown: 15,
    kept: { renown: 4, honour: 1 }, broken: { renown: -3, honour: -2 },
  },
  {
    id: 'great', title: 'To win a prize on the King’s circuit.',
    blurb: 'At a high tourney, the King’s, or the Great Pas. Few men make this vow twice.', need: 1, minRenown: 35,
    kept: { renown: 10, honour: 2 }, broken: { renown: -4, honour: -2 },
  },
  {
    id: 'mercy', title: 'To take no man’s ransom this year.',
    blurb: 'Take prisoners in the mêlée, and let every one of them go free. Untested, it counts for nothing.', need: 1, minRenown: 0,
    kept: { renown: 3, honour: 3 }, broken: { renown: -2, honour: -3 },
  },
  {
    id: 'shrine', title: 'To walk barefoot to St Wystan’s before the year is out.',
    blurb: 'A month on the road and the alms at the end of it. The cheapest vow, and the one the priests like best.', need: 1, minRenown: 0,
    kept: { renown: 1, honour: 2, pious: 2 }, broken: { renown: -1, honour: -2 },
  },
];

// ---------------------------------------------------------------------------
// The fairs: the popinjay at Saltings Quay, the Downs Race at Othery
// ---------------------------------------------------------------------------

export const FAIRS = {
  popinjay: {
    id: 'popinjay', month: 5, town: 'saltingsQuay', entry: 2 * 12,
    name: 'The popinjay of St Sebastian at Saltings Quay',
    host: 'the guild of St Sebastian',
    prize: 5 * 240, prizeLabel: 'a silver bird, and five pounds',
    renown: 3, favour: { cities: 2 }, archers: 2,
    peace: true, war: true,       // a guild town keeps its fair in a war
  },
  race: {
    id: 'race', month: 9, town: 'othery', entry: 5 * 12,
    name: 'The Downs Race at Othery',
    host: 'the horse-copers of Othery',
    prize: 10 * 240, prizeLabel: 'a purse of ten pounds',
    renown: 2, placed: 2 * 240,   // second place: two pounds
    condition: 3,                 // what two miles of down take out of a horse
    peace: true, war: false,
  },
};

// The popinjay. Three marks on the bird: the tail feathers, a wing, and the
// bird itself. Bring it down and the shoot is over.
export const POPINJAY = {
  rounds: 3,
  targets: {
    tail: { label: 'The tail feathers', points: 1, base: 0.62, does: 'A feather, and a point. Most shots are at the tail.' },
    wing: { label: 'A wing', points: 2, base: 0.36, does: 'Two points, if the bolt finds the joint.' },
    bird: { label: 'The bird itself', points: 0, base: 0.12, does: 'Bring it down, and you are King of the Popinjay whatever the tally.' },
  },
  perVigour: 0.012,      // a steady arm
  perLore: 0.01,         // a knight who knows the wind
  wind: {
    calm: { label: 'Calm', mod: 0, weight: 3 },
    fresh: { label: 'A fresh wind off the sea', mod: -0.07, weight: 4 },
    gusting: { label: 'Gusting', mod: -0.15, weight: 2 },
  },
  lull: 0.6,             // waiting for a lull takes this share of the wind's penalty away
  guildEdge: 0.04,       // a guild crossbowman shoots this much better than a gentleman
  field: 7,              // shooters besides you
  guildsmen: 5,
  minHit: 0.02, maxHit: 0.92,
};
export const GUILD_SHOOTERS = [
  'Wat Fletcher', 'Hob Salter', 'Jankin Bowyer', 'Simkin Tawney', 'Gib Marram', 'Dickon Reeve', 'Hal Cooper', 'Perkin Swale',
];

// The Downs Race: two miles of turf. Each horse's time is a normal draw: the
// better horse and the lighter hand are faster, the chosen plan moves both the
// mean and the spread. The chance shown on each plan is the chance the draw
// gives, computed by integration.
export const RACE = {
  base: 240,             // seconds, for a horse of quality 10
  perQuality: 1.2,
  perSeat: 0.35,         // the rider
  perCondition: 0.8,     // for each point a horse is below fresh
  sd: 3.6,
  field: 7,
  coperQuality: { mean: 10.5, sd: 1.5, min: 7, max: 15 },
  plans: {
    front: { label: 'Go from the front', does: 'Set the pace and dare them to catch you. Steady: the best horse should win this way.', mean: -0.3, sd: 0.5, fall: 0 },
    wait: { label: 'Sit in behind and come late', does: 'Save him for the last furlong. Surer, if he has the speed.', mean: -0.6, sd: 1, fall: 0 },
    rail: { label: 'Take the inside line on the turn', does: 'The shortest way round, and the most crowded. Horses go down on that turn.', mean: -0.9, sd: 1.6, fall: 0.1 },
  },
  hurt: 0.35,            // of a fall, the chance you are hurt
};
export const COPERS = [
  'Nick Garron’s grey', 'the Welsh coper’s bay', 'Tom Hurst’s chestnut', 'old Skelton’s roan', 'a black from the Brede stud',
  'Dame Alys’s mare', 'the Othery farrier’s colt', 'a dun from over the border', 'Rafe Dunning’s bay', 'the reeve’s grey gelding',
];

// ---------------------------------------------------------------------------
// Archers
// ---------------------------------------------------------------------------

// Bowmen for your company: cheaper than men-at-arms, and worth half of one in
// a battle line. They are kept at your manors like the men.
export const ARCHERS = {
  wage: 1 * 240 + 120,   // a pound and ten shillings a year, each
  base: 2,
  perManor: 2,
  strength: 0.5,         // of a man-at-arms
};

// ---------------------------------------------------------------------------
// The war's months
// ---------------------------------------------------------------------------

export const CAMPAIGN = {
  pay: 2 * 240,          // your lord's wage for a month in the field
  renown: 2,
  favour: 1,
  balance: 1,            // toward your side
  peril: 0.012,          // before harness and body
  prisoner: 0.2,         // the chance of taking a man worth a ransom
  ransom: { min: 3, max: 8 }, // pounds
};
export const CAMPAIGN_EPISODES = [
  'You ride with the vanguard for a month of burnt bridges and bad bread. Twice you see the enemy’s scouts; once you catch them.',
  'A month holding a ford nobody attacks. Your lord says it was the most important ford in the realm. He may be right.',
  'You escort the army’s pay-chests from Kingsmead, and lose none of it, which is rarer than it should be.',
  'A month of forage and skirmish in the March. You come back thinner, and so does your horse.',
  'You sit in a siege line for a month and watch the other side eat better than you do.',
  'A night attack on an enemy camp. It goes as night attacks go: badly for everybody, and worse for them.',
];
export const LANDS_GUARD = {
  raid: 0.3,             // in a war year, the chance an unwatched manor's rents are lost
  harvest: 1 * 240,      // per manor: what seeing to the harvest yourself brings in
};

// ---------------------------------------------------------------------------
// The end of a career
// ---------------------------------------------------------------------------

export const RETIREMENT = {
  from: 34,              // you may hang up your lance from this age
  always: 45,            // nobody lets you in the lists past this
  rollFirst: 3,          // winters at the head of the Roll, and a King's Tourney won, to be Champion of the Realm
  kingmaker: ['captain', 'councillor'],
  lordManors: 3,
  lordMarried: 2,
  featsChampionships: 6,
  featsGreat: 2,
};

// How a career ends, in the order the heralds would put it. The first that
// fits is the headline; everything else that fits is said too.
export const ENDINGS = {
  peer: {
    title: 'A baron of the realm',
    line: 'He was Lord {seat}, made a baron {how}, and his name was read out among the lords at every great council.',
    after: 'He kept a lord’s house at {seat}, sat in the council when it was summoned, and was called my lord by men who had called him Sir.',
  },
  disgrace: {
    title: 'Retired in disgrace',
    line: 'The heralds do not cry his name at his leaving. There is nobody to cry it to.',
    after: 'He went home to {home} and did not ride out again. People in the town were polite to him, which was worse.',
  },
  swan: {
    title: 'Companion of the Swan',
    line: 'His stall in the chapel at Kingsmead has his helm and crest above it, and will have until he dies.',
    after: 'He sat in the chapter at every Candlemas for the rest of his life, and voted, and was listened to.',
  },
  champion: {
    title: 'Champion of the Realm',
    line: 'For {rollFirst} winters the heralds cried his name first of all the knights in Lothmere, and the king gave him the ruby with his own hand.',
    after: 'Young knights came to {home} to ask how it was done. He told them, and they did not believe him.',
  },
  kingmaker: {
    title: 'Kingmaker',
    line: 'He stood where the crown was decided, as a {rank}, and the side he stood on won.',
    after: '{crowned} did not forget it. He sat on the council, and was feared a little, and liked it.',
  },
  lord: {
    title: 'Lord of lands',
    line: 'He held {lands} manors at his leaving, and the men of all of them owed him service.',
    after: 'He lived at {manor}, and heard his tenants’ quarrels at the hall door, and grew fat on the rents.',
  },
  feats: {
    title: 'A full Book of Feats',
    line: 'The heralds needed a second book for him.',
    after: 'He hung his lances in the hall at {home}, one for every prize, and ran out of wall.',
  },
  quiet: {
    title: 'A quiet retirement',
    line: 'The heralds wrote his name in the rolls, and one day somebody will read it.',
    after: 'He went home to {home}, and rode to hounds, and told the story of every tourney until his grandsons could tell it for him.',
  },
};

// Whether a knight got what he rode out for.
export const AMBITION_WORDS = {
  champion: { yes: 'He rode out to be the first lance of Lothmere, and for a while he was.', no: 'He rode out to be the first lance of Lothmere. Others were.' },
  lordship: { yes: 'He rode out wanting a hall of his own and the lady who came with it, and had both.', no: 'He rode out wanting a hall of his own and the lady who came with it. It did not come to that.' },
  love: { yes: 'He rode out for a lady whose name he could not say. In the end he said it, at a church door.', no: 'He rode out for a lady whose name he could not say, and never did say it.' },
  order: { yes: 'He rode out wanting a seat among the Companions of the Swan, and the chapter gave him one.', no: 'He rode out wanting a seat among the Companions of the Swan. The chapter never called his name.' },
  clearName: { yes: 'He rode out to clear his master’s name, and did.', no: 'He rode out to clear his master’s name. The matter of Ambry Cross stands as it was.' },
};
