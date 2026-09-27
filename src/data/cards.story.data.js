// Cards for the court: patrons' offers and summons, the Church, and the story
// threads — Ambry Cross, and the betrothal. Logic-free. See
// cards.court.data.js for the shape; the vocabulary is in src/engine/cards.js.

export const PATRON_CARDS = [
  {
    id: 'court.offer', context: 'court', weight: 8,
    when: { noPatron: true, minHostFavour: 8, minRenown: 10 },
    text: '{host} has watched you ride. His steward offers you a place in the household: {fee} a year, and his livery. You would ride at his tourney every year, and come when he sends for you.',
    choices: [
      { label: 'Kneel, and take his livery.', effects: { serve: 'host', traits: { constant: 1 } },
        result: 'You put your hands between his. From today his friends are yours, and so are his enemies.' },
      { label: 'Ask for time to consider.', effects: {},
        result: 'The steward says the offer will not wait for ever. It will wait a while.' },
      { label: 'Decline: you ride for your own name.', effects: { favour: { host: -1 }, traits: { valorous: 1 } },
        result: 'He takes it well, for a great man. Which is to say, he will remember it.' },
    ],
  },
  {
    id: 'feast.guild', context: 'feast', weight: 6,
    when: { city: true, noPatron: true, minFavour: { cities: 8 }, minRenown: 8 },
    text: 'The wardens of the Guild of St Barbara have been watching you. They offer {fee} a year and their red and white, if you will ride for the guild and come when the guild sends.',
    choices: [
      { label: 'Take the guild’s colours.', effects: { serve: 'cities', honour: -1, traits: { pious: -1 } },
        result: 'Good money, honestly paid. Some of the old families will say a knight should not wear a merchant’s colours. They are not paying you.' },
      { label: 'Decline, courteously.', effects: { favour: { cities: -1 } },
        result: 'The wardens bow. Merchants are patient; there will be another offer.' },
    ],
  },
  {
    id: 'summons.escort', context: 'summons', weight: 3,
    when: { patron: ['crown', 'aumbry', 'stane'] },
    text: '{lord} sends for you: a kinswoman must be escorted to her marriage at Queenshythe, and he wants a knight people will recognise.',
    choices: [
      { label: 'Ride escort yourself.', effects: { favour: { patron: 3 }, purse: 240, marks: { courtesy: 1 } },
        result: 'A week of slow roads and fine manners. She gives you a ring at the church door; her uncle gives you a pound.' },
      { label: 'Send your squire with your livery.', when: { hasSquire: true }, effects: { favour: { patron: 1 }, squire: { loyalty: 1, wits: 1 } },
        result: '{squire} does it well enough that nobody complains, which is not the same as being pleased.' },
    ],
  },
  {
    id: 'summons.letter', context: 'summons', weight: 3,
    when: { patron: ['aumbry', 'stane'] },
    text: '{lord} gives you a sealed letter for the other house, and tells you it concerns the king’s health.',
    choices: [
      { label: 'Deliver it unread.', effects: { favour: { patron: 2 }, traits: { honest: 1 } },
        result: 'You hand it over and ride back. Whatever is in it, you can say truthfully that you do not know.' },
      { label: 'Read it first, and seal it again.', effects: { favour: { patron: 2 }, flags: ['readTheLetter'], traits: { honest: -2 } },
        result: 'It is about the succession, and it is not a letter the king would enjoy. You seal it carefully.' },
      { label: 'Tell him you are a knight, not a messenger.', effects: { favour: { patron: -2 }, traits: { valorous: 1 } },
        result: 'He sends a messenger. He does not forget.' },
    ],
  },
  {
    id: 'summons.champion', context: 'summons', weight: 4,
    when: { patron: ['aumbry', 'stane'] },
    cast: { rival: { from: 'roster', allegiance: 'patronRival', minRenown: 8 } },
    text: '{lord} names {rival}, the best lance the other house has, and says he would count it a service if you put him in the sand before the year is out.',
    choices: [
      { label: 'Swear to it.', effects: { patronTarget: 'rival', regard: { rival: -2 }, traits: { valorous: 1 } },
        result: 'Word of it reaches {rival} before you have left the hall.' },
      { label: 'Say you will ride against whoever the draw gives you.', effects: { favour: { patron: -1 }, traits: { honest: 1 } },
        result: 'He says that is an honest answer. He did not want an honest answer.' },
    ],
  },
  {
    id: 'summons.envoy', context: 'summons', weight: 3,
    when: { patron: ['crown', 'aumbry', 'stane'] },
    text: '{lord} receives an envoy from the other house, and wants his hall full of knights who know how to stand in it.',
    choices: [
      { label: 'Stand in the hall.', check: { stat: 'courtesy', dc: 12 },
        success: { effects: { favour: { patron: 3 } }, result: 'The envoy is seated, flattered and outmanoeuvred. Your lord notices who helped.' },
        failure: { effects: { favour: { patron: -1 } }, result: 'You bow to the envoy a moment before your lord does. Everyone sees.' } },
      { label: 'Keep to the back of the hall.', effects: { favour: { patron: 1 } },
        result: 'You were there. That was what was asked.' },
    ],
  },
  {
    id: 'summons.quarrel', context: 'summons', weight: 2,
    when: { patron: 'any' },
    text: 'Two of {lord}’s household knights have come to blows over a horse, and he wants it settled by someone of no party.',
    choices: [
      { label: 'Hear them both, and judge by the evidence.', check: { stat: 'lore', dc: 11 },
        success: { effects: { favour: { patron: 2 }, honour: 1 }, result: 'The bill of sale settles it. The loser shakes hands, eventually.' },
        failure: { effects: { favour: { patron: 1 } }, result: 'You cannot tell who is lying. You split the horse’s price, and both are unhappy.' } },
      { label: 'Find for the elder, as custom has it.', effects: { favour: { patron: 1 }, traits: { honest: -1, constant: 1 } },
        result: 'Custom is satisfied. The younger man is not.' },
    ],
  },
  {
    id: 'summons.guard', context: 'summons', weight: 4,
    when: { patron: 'crown' },
    text: 'The Crown calls you to a month in the king’s guard at Kingsmead.',
    choices: [
      { label: 'Stand your watches.', effects: { favour: { crown: 3 }, purse: 480, marks: { seat: 1 } },
        result: 'Long nights in the king’s colours. You see the king twice. He looks older than his portraits.' },
      { label: 'Ask to be excused for the lists.', effects: { favour: { crown: -2 } },
        result: 'You are excused. It is written down.' },
    ],
  },
  {
    id: 'summons.judge', context: 'summons', weight: 4,
    when: { patron: 'cities' },
    text: 'The guild asks you to judge its squires’ joust at Port Lessing, and to be seen doing it.',
    choices: [
      { label: 'Judge it fairly.', check: { stat: 'lore', dc: 10 },
        success: { effects: { favour: { cities: 3 }, purse: 240 }, result: 'Your judgements are argued over in every tavern in the town, which is the point.' },
        failure: { effects: { favour: { cities: 1 }, purse: 240 }, result: 'You give the prize to the mayor’s nephew. He did not deserve it. Everyone knows.' } },
      { label: 'Give the prize to the mayor’s nephew.', effects: { favour: { cities: 2 }, purse: 480, honour: -1, traits: { honest: -2 } },
        result: 'The mayor is grateful. The other squires are not.' },
    ],
  },
];

export const CHURCH_CARDS = [
  {
    id: 'feast.bishop', context: 'feast', weight: 3,
    when: { tier: ['regional', 'high', 'grand'] },
    text: 'The bishop has preached against the tourney from the cathedral steps, and says any who ride tomorrow ride in mortal sin.',
    choices: [
      { label: 'Ride anyway.', effects: { favour: { church: -2 }, traits: { pious: -1 } },
        result: 'Everyone else does. The bishop dines with the host that evening.' },
      { label: 'Go to him for absolution first.', effects: { purse: -12, favour: { church: 2 }, traits: { pious: 1 } },
        result: 'He absolves you, takes your shilling, and wishes you well in the lists.' },
      { label: 'Answer him from scripture, before the hall.', when: { minTrait: { pious: 14 } }, check: { stat: 'lore', dc: 12 },
        success: { effects: { favour: { church: 1 }, renown: 1 }, result: 'You quote Maccabees at him. He laughs, and concedes the point, and invites you to supper.' },
        failure: { effects: { favour: { church: -3 } }, result: 'You quote the wrong book. He does not laugh.' } },
    ],
  },
];

export const STORY_CARDS = [
  {
    id: 'court.records', context: 'court', weight: 6, once: false,
    when: { flag: 'witnessFound', notFlag: 'culpritKnown' },
    text: 'The heralds of {town} keep the rolls of every tourney since the war. The one for Ambry Cross is in a chest nobody has opened for twenty years.',
    choices: [
      { label: 'Read the rolls yourself.', check: { stat: 'lore', dc: 12 },
        success: { effects: { reveal: 'culprit' }, result: 'Two knights struck at that course. Only one lance is marked as broken on the horse, and it is not your master’s.' },
        failure: { effects: {}, result: 'Twenty years of heralds’ hands, and none of them could spell. You will have to come back.' } },
      { label: 'Pay a clerk to read them for you.', when: { minPurse: 240 }, effects: { purse: -240, reveal: 'culprit' },
        result: 'A pound, and a week, and the clerk brings you a name.' },
    ],
  },
  {
    id: 'winter.witness', context: 'winter', weight: 5,
    when: { flag: 'witnessSworn', notFlag: 'culpritKnown' },
    text: 'The witness from Ambry Cross writes to you at Candlemas. He has made his peace with God, he says, and will name the other lance.',
    choices: [
      { label: 'Ride to hear it.', effects: { purse: -24, reveal: 'culprit' },
        result: 'He tells you in the porch of his parish church, and makes you swear not to say where you heard it.' },
      { label: 'Ask him to write it.', effects: { reveal: 'culprit', traits: { valorous: -1 } },
        result: 'The letter comes in spring, one line long.' },
    ],
  },
  {
    id: 'feast.accuse', context: 'feast', weight: 10,
    when: { flag: 'culpritKnown', notFlag: 'masterCleared' },
    cast: { rival: { from: 'field', culprit: true } },
    text: '{rival} is at the high table tonight, laughing at something. It was his lance at Ambry Cross, and {master} has lived twenty years in disgrace for it.',
    choices: [
      { label: 'Accuse him before the heralds, with your witness.', when: { flag: 'witnessSworn' },
        effects: { clearMaster: true, regard: { rival: -10 }, memory: { rival: 'You proved it was his lance at Ambry Cross.' } },
        result: 'The witness’s oath is read out. {rival} does not deny it; he only says it was twenty years ago. The heralds write it down.' },
      { label: 'Accuse him on your own word.', check: { trait: 'honest', dc: 14 },
        success: { effects: { clearMaster: true, regard: { rival: -10 } }, result: 'Nobody who knows you believes you would lie. After a long silence, {rival} leaves the hall.' },
        failure: { effects: { honour: -3, regard: { rival: -6 } }, result: 'It is your word against his, and his is older. The heralds take no notice, and the host asks you to sit down.' } },
      { label: 'Vow to bear him down tomorrow, and let God judge.', effects: { vow: 'rival', flags: ['ordealVow'], traits: { valorous: 2, pious: 1 } },
        result: 'You say it before the whole hall. If God is just, he will be in the sand by noon.' },
      { label: 'Say nothing yet.', effects: { traits: { constant: 1 } },
        result: 'Not tonight. But he looked at you once, and he knows.' },
    ],
  },
  {
    id: 'winter.wedding', context: 'winter', weight: 8, once: true,
    when: { flag: 'weddingSet', notFlag: 'married', heart: 'promised' },
    text: 'The wedding is set for the Sunday after Candlemas. Her family has spent a great deal, and is waiting to see whether you will.',
    choices: [
      { label: 'Marry her.', effects: { heart: 'married', flags: ['married'], purse: 7200, honour: 1, traits: { constant: 2 } },
        result: 'You are married at the church door and feast for three days. Her dowry is thirty pounds, and her dower manor is yours to hold.' },
      { label: 'Break it off, and repay what her family spent.', effects: { heart: 'free', flags: ['betrothalBroken'], purse: -2400, honour: -3, traits: { constant: -3 } },
        result: 'Ten pounds, and a silence between two families that will last longer than you do.' },
    ],
  },
];
