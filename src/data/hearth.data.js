// The hearth: the ladies of the realm, courtship, marriage, children, and the
// titles a knight might rise to. Logic-free.
//
// Marriage in the fifteenth century was land, money and alliance first. A
// knight courted the lady and treated with her family: an heiress brought
// manors, a widow her jointure, a merchant's daughter coin, a lord's daughter
// her father's goodwill. The Crown sold the marriages of its wards. Courtly
// love — a lady's sleeve on your helm — was a separate thing, and a public one.

// The kinds of match. `count` ladies of each kind are in the realm at the
// start of a career; when one marries, another comes of age to take her place.
// `brings`: her portion. `wants`: what her family asks of a suitor before they
// will hear him. `consent`: the affection she must have for you before she says
// yes herself. A widow answers for herself; a ward's marriage is the Crown's.
export const MATCHES = {
  merchant: {
    label: 'a merchant’s daughter', count: 2, age: [17, 22],
    brings: { pounds: [40, 60], manors: 0 },
    wants: { renown: 15, honour: 6 },
    consent: 50, faction: 'cities', towns: ['portLessing', 'saltingsQuay', 'kingsmead', 'merrow'],
    blurb: 'Her father is an alderman of the guilds, with ships in the Narrow Sea and no sons. He wants a knight’s name in the family, and will pay for it.',
  },
  lord: {
    label: 'a lord’s daughter', count: 2, age: [16, 21],
    brings: { pounds: [20, 30], manors: 0, favour: 8 },
    wants: { renown: 35, honour: 12, lineage: 10, favour: 6 },
    consent: 50, faction: 'house', towns: ['ambryCross', 'castleBrede'],
    blurb: 'Her father sits at one of the great houses’ tables. A marriage into his family is a marriage into his quarrels.',
  },
  heiress: {
    label: 'an heiress', count: 2, age: [17, 23],
    brings: { pounds: [12, 20], manors: 1 },
    wants: { renown: 45, honour: 12, lineage: 9 },
    consent: 50, faction: null, towns: ['hollinMoor', 'sallowfield', 'othery', 'fennick', 'queenshythe', 'wystansFord'],
    blurb: 'Her father had no son. Whoever marries her holds her manor, and her guardians know exactly what that is worth.',
  },
  widow: {
    label: 'a widow', count: 2, age: [24, 34],
    brings: { pounds: [15, 25], manors: 1 },
    wants: { renown: 25, honour: 6 },
    consent: 60, faction: null, towns: ['merrow', 'queenshythe', 'sallowfield', 'fennick', 'hollinMoor'],
    blurb: 'Her husband died and left her a jointure and a manor for her life. She answers to nobody now, and chooses for herself.',
  },
  ward: {
    label: 'heiress to a barony, and a ward of the Crown', count: 1, age: [17, 20],
    brings: { pounds: [25, 35], manors: 2, barony: true },
    wants: { renown: 60, honour: 14, lineage: 10 },
    crown: { favour: 10, price: 40 * 240 }, // the Crown's leave: its favour, or the price of her marriage
    consent: 55, faction: 'crown', towns: ['kingsmead'],
    blurb: 'The last of an old barony, in the king’s wardship since her father died. Her marriage is the king’s to give, or to sell, and the man who has it will be a lord.',
  },
};

// What a lady values in a suitor. Courting her in the way she likes goes
// further.
export const VALUES = {
  valorous: { label: 'courage', approach: 'colours' },
  pious: { label: 'piety', approach: 'mass' },
  generous: { label: 'generosity', approach: 'gift' },
  courtesy: { label: 'courtesy', approach: 'dance' },
  lore: { label: 'wit and letters', approach: 'letters' },
  seat: { label: 'horsemanship', approach: 'hawking' },
};

// A month spent courting her, at her family's house. Each way shows its chance
// (a check, rolled as shown) and what it is worth. The way she values is worth
// half again.
export const APPROACHES = {
  gift: { label: 'A gift worth giving', does: 'A girdle of silver-gilt, or a book of hours. Certain, and dear.', cost: 4 * 240, gain: 8, loss: 0 },
  dance: { label: 'Dance with her at her father’s table', does: 'A basse danse in front of her whole family.', check: { stat: 'courtesy', dc: 11 }, gain: 12, loss: 3 },
  letters: { label: 'Write to her, and read to her', does: 'Verses of your own, or somebody’s. She will know which.', check: { stat: 'lore', dc: 11 }, gain: 12, loss: 2 },
  hawking: { label: 'Ride out hawking with her', does: 'A day on the downs with her falcons, and her brothers watching your seat.', check: { stat: 'seat', dc: 11 }, gain: 11, loss: 2 },
  mass: { label: 'Hear mass with her family', does: 'Kneel beside her father, and give to the poor at the door.', check: { trait: 'pious', dc: 11 }, gain: 10, loss: 2 },
};
export const VALUED_BONUS = 1.5;
// Each time a way of courting her has been tried, it is worth less: gain / (1 + REPEAT × times).
export const REPEAT = 0.6;

// Riding in her colours: her sleeve on your helm at a tourney she attends.
export const COLOURS = {
  ask: 15,          // she gives her sleeve to a suitor she likes this much
  boutWon: 3,       // affection, for every bout you win in her colours
  champion: 12,     // and for a prize carried off in them
  beatenFirst: -3,  // beaten in your first bout, in front of her
};

// Rival suitors: each lady has one, a knight of the field. His suit grows each
// winter; when it reaches `wins` and stands higher than her affection for you,
// her family gives her to him.
export const RIVALS = { start: [0, 30], perWinter: [8, 20], renownBonus: 5, wins: 100 };

// Asking for her hand, and the other way.
export const HAND = {
  refusedAffection: -5,   // asked before her family is ready
  elope: { affection: 75, honour: -3, favour: -6 },
};

// Marriage.
export const MARRIAGE_LIFE = {
  household: 2 * 240,      // her household, each winter
  stewardship: 240,        // what her keeping of the rolls adds, per manor, each winter
  houseFavour: 1,          // her family's house's goodwill, each winter
  childChance: 0.32,       // a child born in a winter, while she is under 40
  childbedDeath: 0.015,    // the oldest danger there is
  importance: 2,
};

// Titles. A knight may be created a baron: by the new crown for his part in the
// war, by letters patent on a petition once he holds enough land and the
// Crown's goodwill, or by right of a wife who is heiress to a barony.
export const TITLES = {
  baron: { label: 'Baron', style: 'Lord' },
  // A councillor of war who fought in the deciding battle on the winning side,
  // or a captain who led the charge there and holds two manors.
  war: { ranks: ['councillor'], fought: ['charge', 'chargeFail', 'hold', 'standard'], captainManors: 2 },
  petition: {
    manors: 3, crownFavour: 10, honour: 12, renown: 50,
    fee: 20 * 240,            // the letters patent, the heralds and the chancery; paid when they are sealed
    base: 0.3, perFavour: 0.04, perManor: 0.08, newReign: 0.2, max: 0.9,
  },
  created: { renown: 10, honour: 1 },
  importance: 10,
  household: 4 * 240,       // a lord keeps a lord's household
  council: { month: 4, favour: 2, missed: -3 },
};

// The baronies the Crown holds in wardship, named for their chief manors.
export const BARONIES = ['Ravensholme', 'Coldridge', 'Morleigh', 'Hautbois', 'Wraxall'];

// How a lady is styled: a merchant's daughter is Mistress, a knight's widow
// Dame, and a lord's daughter, an heiress or a ward the lady.
export const STYLE = { merchant: 'Mistress', widow: 'Dame', lord: 'the lady', heiress: 'the lady', ward: 'the lady', betrothed: 'the lady', secret: 'the lady' };
