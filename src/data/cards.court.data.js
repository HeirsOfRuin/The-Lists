// Cards for the feast on the eve of a tourney, and for arrival. Logic-free.
//
// A card is a situation and two or three answers. Every effect is data the
// engine applies and describes; every check is a skill or trait against a
// difficulty, and the chance shown is the chance rolled. The vocabulary of
// `when`, `cast` and `effects` is documented in src/engine/cards.js, and the
// test suite holds every card to it.
//
// Placeholders: {you} {rival} {opponent} {lady} {host} {town} {squire}
//               {master} {horse}

export const FEAST_CARDS = [
  {
    id: 'feast.precedence', context: 'feast', weight: 3,
    when: { minLineage: 9 },
    cast: { rival: { from: 'field', lineageBelowYou: true } },
    text: 'The steward seats you below {rival}, whose grandfather bought his arms from a herald who needed the money. The table notices.',
    choices: [
      { label: 'Say nothing, and eat.', effects: { traits: { constant: 1 } },
        result: 'You eat. The table forgets by the second remove.' },
      { label: 'A quiet word with the steward.', check: { stat: 'courtesy', dc: 12 },
        success: { effects: { renown: 1, favour: { host: 1 } }, result: 'The steward bows and moves you up without fuss. {rival} does not notice; {host} does.' },
        failure: { effects: { regard: { rival: -1 } }, result: 'The steward makes a show of it, and {rival} hears every word.' } },
      { label: 'Take the higher seat yourself.',
        effects: { renown: 1, honour: -1, regard: { rival: -3 }, memory: { rival: 'You took the seat above him at {town}.' }, traits: { merciful: -1 } },
        result: 'You sit where you belong. {rival} sits where you put him, and remembers it.' },
    ],
  },
  {
    id: 'feast.sleeve', context: 'feast', weight: 3,
    cast: { lady: 'any' },
    text: 'Between the courses the lady {lady} leans across to ask whether your lance carries a lady’s favour tomorrow. It does not, and she is holding out her sleeve.',
    choices: [
      { label: 'Take it, and wear it tomorrow.', when: { notHeart: ['promised', 'married'] },
        effects: { token: true, traits: { valorous: 1 } },
        result: 'You tie her sleeve to your helm. Half the hall saw you do it.' },
      { label: 'Take it, though you are not free to.', when: { heart: ['promised', 'married'] },
        effects: { token: true, honour: -1, traits: { constant: -2 } },
        result: 'You tie it on. Word will travel faster than you do.' },
      { label: 'Decline, with a compliment she will repeat.', check: { stat: 'courtesy', dc: 11 },
        success: { effects: { renown: 1, traits: { constant: 1 } }, result: 'She laughs, and tells the story against herself all evening. It does you nothing but good.' },
        failure: { effects: { renown: -1 }, result: 'She takes it as it was not meant, and says so.' } },
    ],
  },
  {
    id: 'feast.boast', context: 'feast', weight: 3,
    cast: { rival: { from: 'field', temperament: ['proud', 'rough'] } },
    text: '{rival} tells the high table he will have you out of the saddle before the second course is run. He says it loudly enough that you are meant to answer.',
    choices: [
      { label: 'Answer with wit.', check: { stat: 'courtesy', dc: 12 },
        success: { effects: { renown: 1, regard: { rival: -1 } }, result: 'The table laughs, and not with him.' },
        failure: { effects: { renown: -1 }, result: 'Your answer arrives a moment too late. He laughs, and so does the table.' } },
      { label: 'Vow before the table to bear him down.', effects: { vow: 'rival', traits: { valorous: 2 } },
        result: 'The heralds note the vow. If you meet him and he keeps his saddle, they will note that too.' },
      { label: 'Let it pass.', effects: { traits: { valorous: -1, constant: 1 } },
        result: 'He takes your silence for fear. Let him.' },
    ],
  },
  {
    id: 'feast.toast', context: 'feast', weight: 2,
    when: { tier: ['regional', 'high', 'grand'] },
    text: '{host} calls on you to give the toast to the ladies. The hall goes quiet.',
    choices: [
      { label: 'Rise and give it.', check: { stat: 'courtesy', dc: 11 },
        success: { effects: { renown: 1, favour: { host: 2 } }, result: 'It is short, it is graceful, and it is repeated at the next three tables.' },
        failure: { effects: { favour: { host: -1 } }, result: 'You toast the ladies and, by a slip of the tongue, the wrong duke.' } },
      { label: 'Beg off, pleading a dry throat.', effects: { favour: { host: -1 }, traits: { valorous: -1 } },
        result: 'Another knight gives it. He does it rather well.' },
    ],
  },
  {
    id: 'feast.dance', context: 'feast', weight: 2,
    cast: { lady: 'any' },
    text: 'The musicians strike up a basse danse, and the lady {lady} is without a partner.',
    choices: [
      { label: 'Ask her to dance.', check: { stat: 'courtesy', dc: 10 },
        success: { effects: { renown: 1, marks: { courtesy: 1 } }, result: 'You dance well enough to be watched, and not so well as to be laughed at.' },
        failure: { effects: { renown: -1 }, result: 'You tread on her train. Twice.' } },
      { label: 'Stay at table.', effects: { traits: { valorous: -1 } },
        result: 'A squire half your age asks her instead.' },
    ],
  },
  {
    id: 'feast.gossip', context: 'feast', weight: 3,
    cast: { rival: { from: 'field', unknown: true } },
    text: 'Two squires by the fire are talking about how {rival} rides, and not quietly.',
    choices: [
      { label: 'Listen.', effects: { intel: { rival: 1 }, traits: { honest: -1 } },
        result: 'You learn more about {rival} in a quarter hour than his own herald could tell you.' },
      { label: 'Let them know you can hear.', effects: { traits: { honest: 1 } },
        result: 'They go red, and go quiet.' },
    ],
  },
  {
    id: 'feast.wager', context: 'feast', weight: 2,
    when: { minPurse: 480 },
    text: 'A wool merchant from the Saltings offers you a pound against your pound that you lose your first bout.',
    choices: [
      { label: 'Take the wager.', effects: { wager: 240, traits: { valorous: 1 } },
        result: 'You shake on it. He writes it down; merchants always do.' },
      { label: 'Decline.', effects: {},
        result: 'He finds a squire who will take it, and loses a pound to him.' },
    ],
  },
  {
    id: 'feast.insult', context: 'feast', weight: 3,
    when: { maxLineage: 8 },
    cast: { rival: { from: 'field', temperament: ['proud', 'rough'] } },
    text: '{rival}, deep in his cups, wonders aloud whose son you are, exactly.',
    choices: [
      { label: 'Ask him whether he knows his own.', check: { stat: 'courtesy', dc: 13 },
        success: { effects: { renown: 1, regard: { rival: -2 } }, result: 'The hall roars. {rival} does not.' },
        failure: { effects: { honour: -1, regard: { rival: -2 } }, result: 'It comes out coarser than you meant, and the host frowns at you, not at him.' } },
      { label: 'Vow to answer him in the lists.', effects: { vow: 'rival', regard: { rival: -2 }, traits: { valorous: 1 } },
        result: 'You say it quietly. He hears it.' },
      { label: 'Strike him where he sits.', when: { minTrait: { valorous: 15 } },
        effects: { honour: -2, renown: 1, regard: { rival: -6 }, traits: { valorous: 1, merciful: -1 }, memory: { rival: 'You struck him at the high table at {town}.' } },
        result: 'Wine everywhere, and a bloody lip. The host has you both put out, and the story is all over the town by morning.' },
      { label: 'Leave the hall.', effects: { traits: { valorous: -2, constant: 1 } },
        result: 'You sleep badly, but you sleep sober.' },
    ],
  },
  {
    id: 'feast.witness', context: 'feast', weight: 4, once: true,
    when: { master: 'disgraced' },
    text: 'An old knight finds you after the meat. He was at Ambry Cross the day {master} lost his spurs, and he says it was not {master}’s lance that found the horse.',
    choices: [
      { label: 'Ask him to swear to it before a herald.', check: { stat: 'courtesy', dc: 12 },
        success: { effects: { flags: ['witnessSworn'], honour: 1 }, result: 'He swears. The herald writes it down, and looks at you for a long time afterwards.' },
        failure: { effects: { flags: ['witnessFound'] }, result: 'He will not swear, not yet. But he told you his name.' } },
      { label: 'Buy him wine and remember every word.', effects: { purse: -12, flags: ['witnessFound'] },
        result: 'By the third cup he has told you who held the other lance.' },
    ],
  },
  {
    id: 'feast.patron', context: 'feast', weight: 4,
    when: { flag: 'patronOwes', tier: ['regional', 'high', 'grand'] },
    text: 'A steward in Aumbry’s livery finds you. His lord remembers your father’s service, and would take it kindly if Stane’s men found tomorrow hard going.',
    choices: [
      { label: 'Tell him Aumbry may count on you.', effects: { favour: { aumbry: 3, stane: -2 }, flags: ['aumbryMan'] },
        result: 'He smiles like a man ticking a list.' },
      { label: 'Say you ride for no house yet.', effects: { favour: { aumbry: -1 }, honour: 1 },
        result: 'He says the Duke will be sorry to hear it. He does not say how sorry.' },
    ],
  },
  {
    id: 'feast.minstrel', context: 'feast', weight: 2,
    when: { minRenown: 10 },
    text: 'A minstrel has made a song of one of your jousts. He sings it badly, and looks at you when he finishes.',
    choices: [
      { label: 'Pay him handsomely.', effects: { purse: -24, renown: 1, traits: { generous: 1 } },
        result: 'He will sing it at every inn between here and the coast.' },
      { label: 'Give him a penny.', effects: { purse: -1, traits: { generous: -1 } },
        result: 'He changes a verse. You come off worse in it.' },
    ],
  },
  {
    id: 'feast.poorKnight', context: 'feast', weight: 3,
    cast: { rival: { from: 'field', maxRenown: 8 } },
    text: '{rival} cannot find the money for his entry, and is too proud to say so. His squire says it for him.',
    choices: [
      { label: 'Pay it for him.', effects: { purse: -120, regard: { rival: 4 }, honour: 1, traits: { generous: 2 }, memory: { rival: 'You paid his entry at {town} when he could not.' } },
        result: 'He thanks you stiffly. His squire thanks you properly.' },
      { label: 'Pay his entry and his lodging, and let nobody know it was you.', when: { minTrait: { generous: 14 } },
        effects: { purse: -168, regard: { rival: 6 }, honour: 1, traits: { generous: 1 }, memory: { rival: 'Someone paid his way at {town}. He found out who.' } },
        result: 'He finds out anyway, of course. He never mentions it, and he never forgets it.' },
      { label: 'Say nothing.', effects: { traits: { generous: -1 } },
        result: 'Someone else pays. You never find out who.' },
    ],
  },
  {
    id: 'feast.herald', context: 'feast', weight: 2,
    text: 'A young herald asks you to blazon your own arms for his roll, and waits with his pen.',
    choices: [
      { label: 'Blazon them.', check: { stat: 'lore', dc: 10 },
        success: { effects: { renown: 1, intelField: 1 }, result: 'He is delighted, and tells you in return what he has written about one of tomorrow’s riders.' },
        failure: { effects: {}, result: 'You call your own charge by the wrong name. He writes it down anyway.' } },
      { label: 'Tell him to ask your squire.', when: { hasSquire: true }, effects: { squire: { wits: 1 } },
        result: '{squire} gets it right, and grows an inch.' },
    ],
  },
  {
    id: 'feast.colours', context: 'feast', weight: 3,
    when: { city: true },
    text: 'A mercer of the town offers two pounds if you will wear his colours on your trapper tomorrow.',
    choices: [
      { label: 'Wear them.', effects: { purse: 480, honour: -1, favour: { cities: 2 }, traits: { pious: -1 } },
        result: 'Blue and yellow, and his mark on your horse’s rump. The guildsmen cheer you; the heralds do not.' },
      { label: 'Decline.', effects: { favour: { cities: -1 }, honour: 1 },
        result: 'He finds someone hungrier.' },
    ],
  },
  {
    id: 'feast.letter', context: 'feast', weight: 2,
    when: { heart: 'promised' },
    text: 'Your betrothed’s brother is at the high table, and has noticed you danced with nobody. He asks, pleasantly, whether you have written to his sister lately.',
    choices: [
      { label: 'Write tonight, and send it with him.', effects: { purse: -6, traits: { constant: 1 } },
        result: 'He takes the letter, and some of the chill goes out of him.' },
      { label: 'Say the lists leave little time for letters.', effects: { traits: { constant: -1, honest: -1 } },
        result: 'He says he will tell her so. You believe him.' },
    ],
  },
  {
    id: 'feast.friend', context: 'feast', weight: 3,
    cast: { rival: { from: 'field', regardMin: 4 } },
    text: '{rival} finds you in the crush and pours you wine. He has been watching the others ride.',
    choices: [
      { label: 'Ask what he has seen.', effects: { intelField: 2, regard: { rival: 1 } },
        result: 'He talks for an hour. Most of it is useful.' },
      { label: 'Talk of anything but the lists.', effects: { regard: { rival: 2 }, fatigue: -1 },
        result: 'You go to bed late, and easier in yourself than you have been all season.' },
    ],
  },
];

export const ARRIVAL_CARDS = [
  {
    id: 'arrival.helms', context: 'arrival', weight: 6,
    when: { tier: ['high', 'grand'], maxHonour: 6 },
    text: 'The helms are laid out in the cloister for the ladies to inspect, as the old custom is. A lady stops at yours, and speaks to the heralds.',
    choices: [
      { label: 'Submit to the heralds’ judgement.', effects: { wound: 'light', honour: 3 },
        result: 'You are beaten with the flat of a sword before the lists open, and afterwards you are forgiven.' },
      { label: 'Deny it before them all.', check: { trait: 'honest', dc: 11 },
        success: { effects: { honour: 1 }, result: 'Your word is taken. It is noted that it had to be.' },
        failure: { effects: { honour: -3, renown: -2 }, result: 'Nobody believes you, and now it is not one wrong but two.' } },
    ],
  },
  {
    id: 'arrival.proofs', context: 'arrival', weight: 6,
    when: { tier: ['grand'], maxLineage: 8 },
    text: 'The heralds ask for your proofs of nobility: four quarterings, attested.',
    choices: [
      { label: 'Produce what you have, and argue the rest.', check: { stat: 'lore', dc: 12 },
        success: { effects: { renown: 1 }, result: 'You know the descents better than the herald does. He admits you with something like respect.' },
        failure: { effects: { honour: -1, renown: -1 }, result: 'They let you ride, and make sure everyone knows they let you.' } },
      { label: 'Ask the Crown’s herald to vouch for you.', when: { minFavour: { crown: 5 } }, effects: { favour: { crown: -2 } },
        result: 'A word from the right man, and the question is never asked again.' },
    ],
  },
  {
    id: 'arrival.host', context: 'arrival', weight: 3,
    when: { tier: ['regional', 'high'] },
    text: '{host} greets the knights as they ride in, and has a word for you.',
    choices: [
      { label: 'Thank him for the honour of his invitation.', check: { stat: 'courtesy', dc: 10 },
        success: { effects: { favour: { host: 2 } }, result: 'He remembers your name at dinner, and uses it.' },
        failure: { effects: {}, result: 'He is already talking to the next man.' } },
      { label: 'Ask him who he fancies for the prize.', effects: { intelField: 1 },
        result: 'He tells you, and why. It is worth knowing.' },
    ],
  },
  {
    id: 'arrival.squireFight', context: 'arrival', weight: 2,
    when: { hasSquire: true },
    cast: { rival: { from: 'field' } },
    text: '{squire} has blacked the eye of {rival}’s squire in an argument over whose master rides better.',
    choices: [
      { label: 'Punish him before the other squires.', effects: { squire: { loyalty: -1 }, honour: 1, regard: { rival: 1 } },
        result: '{squire} takes it without a word. {rival} notices that.' },
      { label: 'Praise him, quietly.', effects: { squire: { loyalty: 1 }, regard: { rival: -2 } },
        result: '{squire} walks taller all day. {rival}’s squire does not.' },
      { label: 'Pay the other boy’s master for the trouble.', effects: { purse: -24, regard: { rival: 1 } },
        result: 'Money settles it. Everyone pretends it did not happen.' },
    ],
  },
  {
    id: 'arrival.squireCourse', context: 'arrival', weight: 2,
    when: { hasSquire: true },
    text: 'There is a squires’ course before the main lists, and {squire} wants to ride in it.',
    choices: [
      { label: 'Let him ride, on your spare horse.', effects: { purse: -6, squire: { lance: 1, loyalty: 1 } },
        result: '{squire} breaks a lance, falls off, and gets back on. It is the best thing that has happened to him.' },
      { label: 'Tell him his work is here.', effects: { squire: { loyalty: -1 }, fatigue: -1 },
        result: 'He sulks, but your horse has never been better turned out.' },
    ],
  },
];
