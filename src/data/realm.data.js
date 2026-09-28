// The realm: the succession, the ten years to war, lands, the company a
// knight can bring, what makes him matter, and the war itself. Logic-free.

// The question the whole career turns on. King Aldric has no son and has named
// no heir. His daughter is married into Stane; his cousin is Aumbry.
export const CLAIMANTS = {
  aumbry: {
    id: 'aumbry', name: 'Duke Robert of Aumbry', short: 'Duke Robert', crowned: 'King Robert',
    claim: 'the king’s cousin, who claims by the male line',
  },
  stane: {
    id: 'stane', name: 'the Princess Isabeau', short: 'Isabeau', crowned: 'Queen Isabeau',
    claim: 'the king’s only daughter, wife to Stane’s heir, who claims by blood',
  },
};

export const WAR_YEAR = 10;          // the king dies at Lady Day of this year
export const WAR_MONTH = 3;

// Tension by year: the baseline the rumours and the posturing read. It rises
// whatever you do; war comes in year ten.
export const TENSION = { 1: 8, 2: 16, 3: 24, 4: 33, 5: 44, 6: 55, 7: 66, 8: 76, 9: 88, 10: 100 };
export const PARTISAN_AT = 55;       // from here, a house will not invite its rival's sworn men

// Who the heralds invite to the great tourneys. A letter comes a month ahead.
// Any one of these is enough; a disgraced knight gets none.
export const INVITATIONS = {
  high: { renown: 20, favour: 8, lineage: 16 }, // the host's favour, being his man, or old enough blood
  grand: { renown: 35, favour: 8, train: 12 }, // the Crown's favour, the Crown's service,
                                               // or a patron who thinks this well of you
};

// The proxy war on the circuit: who wins the great tourneys shifts the realm.
// Positive favours Aumbry, negative Stane.
export const BALANCE = {
  max: 60,
  high: 2,          // a high tourney won by a house's man
  grand: 4,         // the King's Tourney
  yours: 1.5,       // your own wins count this much more, for the side you are sworn to
  willTowardAumbry: 15, // the king's will names Aumbry's claimant only if the balance is above this
};

// A manor: a place, an income every winter, and men who follow you to war.
export const MANORS = [
  { id: 'm1', name: 'Harrowdene', province: 'march', income: 6, men: 4 },
  { id: 'm2', name: 'Coldharbour', province: 'march', income: 5, men: 3 },
  { id: 'm3', name: 'Brede Minor', province: 'march', income: 7, men: 4 },
  { id: 'm4', name: 'Ashby Lacy', province: 'court', income: 8, men: 3 },
  { id: 'm5', name: 'Wyvenhoe', province: 'court', income: 6, men: 3 },
  { id: 'm6', name: 'Sallow Hall', province: 'court', income: 7, men: 3 },
  { id: 'm7', name: 'Fennick Grange', province: 'coast', income: 6, men: 2 },
  { id: 'm8', name: 'Merrow Wick', province: 'coast', income: 8, men: 2 },
  { id: 'm9', name: 'Saltcote', province: 'coast', income: 5, men: 2 },
  { id: 'm10', name: 'Othery Court', province: 'march', income: 9, men: 5 },
  { id: 'm11', name: 'Kingsmead Parva', province: 'court', income: 9, men: 4 },
  { id: 'm12', name: 'Port Lessing Fee', province: 'coast', income: 10, men: 3 },
];
export const LANDS = {
  pricePerIncome: 14,     // a manor sells for about fourteen years' income, in pounds
  patronYears: 3,         // years of faithful service before a patron grants a manor
  patronFavour: 14,
  claimFavour: 6,         // Crown favour to petition for a fallen house's lands
  claimCost: 5 * 240,
  royalGrantRenown: 40,   // the champion of the King's Tourney at this renown is granted a manor
};

// Men-at-arms: your company. They do not ride the circuit with you; they are
// kept at your manors, and they are what you bring to a war.
export const COMPANY = {
  wage: 3 * 240,          // a year, each
  base: 2,                // you can keep this many with no land
  perManor: 3,            // and this many more for every manor
};

// How much a knight matters when the realm divides. The score is a sum the
// Knight tab shows term by term; the rank is where it falls. Renown counts,
// but only so far: past a point, a lord wants your men and your land, not
// another cup. Land and the men it feeds are what make a banner.
export const IMPORTANCE = {
  renown: 1 / 10, renownCap: 150,
  honour: 1 / 4, lineage: 1 / 2,
  manor: 5, man: 1.5, patron: 5, favour: 1 / 4, virtue: 2,
  prize: 1.5, prizeCap: 10,
};
export const RANKS = [
  { id: 'hedge', min: 0, label: 'A hedge knight', does: 'One more lance in somebody else\u2019s company.', strength: 2, peril: 1 },
  { id: 'household', min: 15, label: 'A household knight', does: 'Known to your lord, and riding in his company.', strength: 5, peril: 1 },
  { id: 'banneret', min: 30, label: 'A knight banneret', does: 'Your own banner, and your own men under it.', strength: 10, peril: 1.2 },
  { id: 'captain', min: 48, label: 'A captain', does: 'You command a wing, and men die by your orders.', strength: 18, peril: 1.3 },
  { id: 'councillor', min: 70, label: 'A councillor of war', does: 'Your voice is heard in the claimant\u2019s tent.', strength: 25, peril: 0.8 },
];

// The battle. Each side's strength is a base, the renown of its knights, the
// Crown's knights if the will named its claimant, the circuit's balance, and
// what you bring.
export const BATTLE = {
  base: 100,
  renownShare: 0.5,       // of the summed renown of a side's sworn knights
  crownShare: 0.5,        // of the Crown's knights, to the side the will names
  balanceShare: 1,
  decisiveMargin: 0.14,   // a win by less than this share of the field drags the war into another year
  capture: { hedge: 0.15, household: 0.25, banneret: 0.35, captain: 0.4, councillor: 0.3 },
  ransom: { hedge: 5, household: 10, banneret: 20, captain: 35, councillor: 50 }, // pounds
  fallenShare: 0.12,      // of the losing side's knights, fallen or attainted
};

// What the victor gives, by rank. Pounds, renown, and manors.
export const SPOILS = {
  hedge: { pounds: 8, renown: 4, manors: 0 },
  household: { pounds: 15, renown: 6, manors: 0 },
  banneret: { pounds: 20, renown: 10, manors: 1 },
  captain: { pounds: 30, renown: 14, manors: 1 },
  councillor: { pounds: 40, renown: 20, manors: 2 },
};
// What the vanquished pay: the chance of attainder by rank, and the fine to be pardoned.
export const ATTAINDER = {
  chance: { hedge: 0.05, household: 0.15, banneret: 0.35, captain: 0.55, councillor: 0.75 },
  fine: { hedge: 4, household: 10, banneret: 20, captain: 35, councillor: 50 },
};

// What they are saying in the halls. By tension band; {aumbry} {stane} {king}
// {leader} are filled in. A line whose `when` is 'aumbryAhead' or
// 'staneAhead' only comes up when the balance leans that way.
export const RUMOURS = [
  { band: 0, text: 'The king rode to hounds at Candlemas and outran men half his age, they say.' },
  { band: 0, text: 'The Princess Isabeau is said to read Vegetius. Her women say she reads it aloud.' },
  { band: 0, text: 'Duke Robert of Aumbry has bought a Milanese harness for a man who does not joust.' },
  { band: 0, text: 'A pedlar at Merrow swears the king has a son in Gascony. Nobody believes him.' },
  { band: 1, text: 'The king coughed through the whole of the Easter mass. The bishop pretended not to notice.' },
  { band: 1, text: 'Stane’s men drink the Princess’s health standing. Aumbry’s men drink it sitting down.' },
  { band: 1, text: 'They say the king’s physician has been dismissed, and that nobody will say by whom.' },
  { band: 1, when: 'aumbryAhead', text: 'Aumbry’s knights have had the better of the great tourneys. At court they are saying it is a sign.' },
  { band: 1, when: 'staneAhead', text: 'Stane’s knights have had the better of the great tourneys. The Princess sends her favour to every one.' },
  { band: 2, text: 'Carpenters have been seen at Ambry Cross. Nobody builds a gatehouse for a tourney.' },
  { band: 2, text: 'The Earl of Stane has sent to Flanders for crossbows, and says they are for the deer.' },
  { band: 2, text: 'A herald was beaten in the road for wearing the wrong house’s tabard. Heralds are supposed to wear nobody’s.' },
  { band: 2, text: 'The regency council met twice this month, and both times Aumbry and Stane left by different doors.' },
  { band: 2, when: 'aumbryAhead', text: 'The Crown’s household knights have started dining with Aumbry’s. People count who sits where.' },
  { band: 2, when: 'staneAhead', text: 'The Crown’s household knights have started riding with Stane’s. People count who rides where.' },
  { band: 3, text: 'They say the king does not know his own chamberlain any more.' },
  { band: 3, text: 'Every smith between Kingsmead and the March has more orders than he can fill, and none of them are for horseshoes.' },
  { band: 3, text: 'A Stane knight and an Aumbry knight fought with sharp swords in a churchyard at Sallowfield. Neither will say over what.' },
  { band: 3, text: 'The guilds of Port Lessing have closed their purses to both houses. Merchants can smell a war sooner than soldiers.' },
  { band: 3, when: 'aumbryAhead', text: 'It is said the king’s will is being rewritten, and that Aumbry’s chancellor holds the pen.' },
  { band: 3, when: 'staneAhead', text: 'It is said the king has sworn before the archbishop that his daughter will have the crown.' },
];

// Swearing. An oath to a house is worth its favour and costs its rival's;
// breaking an earlier oath costs honour, and the favour of the house betrayed.
export const OATH = { favour: 2, turncoatHonour: 2, turncoatFavour: 5 };

// Where a knight dies, when a card's danger comes true.
export const DEATHS = {
  default: 'in the war',
  'war.skirmish': 'at a ford whose name nobody remembers',
  'war.siege': 'under the walls of a castle he did not take',
  'war.neutral.raiders': 'riding out against deserters, for villagers who were not his',
};

// What they are saying once the swords are out, and after.
export const WAR_RUMOURS = [
  'They say the bridge at Kingsmead has been broken down, and that both sides claim the credit.',
  'A troop of Aumbry’s crossbowmen took a Stane manor at Brede and drank its cellar dry in a night.',
  'The Cities have shut their gates to both armies, and are selling bread to each over the walls.',
  'The archbishop has excommunicated nobody yet. People say he is waiting to see who wins.',
  'Half the heralds have gone to one camp and half to the other, and they are writing each other’s names down.',
  'A knight who rode in the King’s Tourney two years ago was hanged at a crossroads for a horse thief.',
];
export const PEACE_RUMOURS = [
  'The new crown’s treasurer is counting what the war cost. Everyone who owes it is being very polite.',
  'The heralds have repainted the lists at Kingsmead. Some of the arms on the old boards have been painted out.',
  'Widows of the war are marrying again. The dowries are smaller than they were.',
];

// Where the rumours band sits: 0 below 25 tension, 1 below 50, 2 below 75, 3 above.
export const RUMOUR_BANDS = [25, 50, 75];
