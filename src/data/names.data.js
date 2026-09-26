// Names for knights, houses, horses and masters. Logic-free.
//
// Anglo-Burgundian given names of the fifteenth century; house names are
// invented but built the way real ones were — from places, and from the
// French of the families who came over and stayed.

export const GIVEN_NAMES = [
  'Edmund', 'Humphrey', 'Walter', 'Roger', 'Hugh', 'Piers', 'Aymer', 'Gilbert',
  'Ralph', 'Geoffrey', 'Richard', 'Thomas', 'John', 'William', 'Henry', 'Robert',
  'Jehan', 'Guillaume', 'Thibaut', 'Raoul', 'Gilles', 'Philippe', 'Antoine', 'Olivier',
  'Tristan', 'Baudouin', 'Enguerrand', 'Jacques', 'Louis', 'Arnaud', 'Simon', 'Nicholas',
  'Alain', 'Bertrand', 'Amaury', 'Everard', 'Osbert', 'Warin', 'Fulk', 'Reynold',
];

export const HOUSE_NAMES = [
  'Ashcombe', 'Brackmere', 'Stavely', 'Hollin', 'Wyvenhoe', 'Corbet', 'Marlowe', 'Denholm',
  'Fenwick', 'Grayle', 'Harrowby', 'Kestrel', 'Lacy', 'Morrow', 'Norreys', 'Orme',
  'Pemberton', 'Quarles', 'Redvers', 'Sallow', 'Thorne', 'Umfray', 'Vane', 'Westmere',
  'de Montval', 'de Brisac', 'de Vauclair', 'de Rochemont', 'de Saint-Aubin', 'de Lisle',
  'de Coucy-Lessard', 'de Beaumaine', 'Aubrecy', 'Belcombe', 'Challon', 'Darnay',
  'Esterling', 'Fauconberg', 'Gournay', 'Haverill', 'Ingram', 'Kerville', 'Lovell', 'Mallory',
];

export const HORSE_NAMES = [
  'Bayard', 'Grisel', 'Morel', 'Liard', 'Ferrant', 'Blanchard', 'Sorrel', 'Hobb',
  'Vairon', 'Tempest', 'Ashlar', 'Gringolet', 'Brunel', 'Fauvel', 'Corbin', 'Ember',
  'Valiant', 'Rouncey', 'Pommel', 'Sable', 'Wick', 'Thistle', 'Mercer', 'Galloway',
];

// Your master, by the kind of man he was. Each carries a name so the story can
// speak of him; the option in creation.data.js carries what he taught.
export const MASTERS = {
  champion: { name: 'Sir Tancred Vane', epithet: 'twice champion of the realm' },
  courtier: { name: 'Sir Amaury de Lisle', epithet: 'gentleman of the king’s chamber' },
  disgraced: { name: 'Sir Osbert Grayle', epithet: 'who lost his spurs at Ambry Cross' },
  veteran: { name: 'Sir Warin Hollin', epithet: 'who held the March in the last war' },
  pious: { name: 'Sir Everard Challon', epithet: 'who went to the Holy Sepulchre and came back quieter' },
};

// Ladies' names, for the heart question and (later) the court.
export const LADY_NAMES = [
  'Isabeau', 'Margery', 'Alys', 'Joan', 'Eleanor', 'Cecily', 'Blanche', 'Mahaut',
  'Philippa', 'Agnes', 'Yolande', 'Katherine', 'Beatrice', 'Maud',
];
