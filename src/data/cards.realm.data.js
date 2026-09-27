// Cards for the realm: the ten years to war, the war, and what comes after.
// Logic-free. The vocabulary is in src/engine/cards.js; beats are scheduled
// by REALM_BEATS below and fire as the month opens.
//
// Extra placeholders here: {heir} (whom the will names), {other} (the other
// claimant), {leader} (the claimant you are sworn to).

// When each beat comes. `cards` are tried in order; the first that can come up
// for this knight is shown. A beat that fits nobody passes silently. Peace
// beats are keyed by the year of your career; war beats by the year of the
// war (0 is the year the king dies), and only while the war is undecided.
// A beat marked `battle` is fought whether or not you are there.
export const REALM_BEATS = [
  { year: 2, month: 4, cards: ['realm.wedding'] },
  { year: 3, month: 5, cards: ['realm.fortify'] },
  { year: 4, month: 7, cards: ['realm.brawl'] },
  { year: 5, month: 6, cards: ['realm.illness'] },
  { year: 6, month: 3, cards: ['realm.declare', 'realm.forbid'] },
  { year: 7, month: 5, cards: ['realm.loans'] },
  { year: 8, month: 4, cards: ['realm.array'] },
  { year: 9, month: 9, cards: ['realm.oath'] },
  { war: 0, month: 3, cards: ['realm.kingDead.sworn', 'realm.kingDead.free'] },
  { war: 0, month: 4, cards: ['war.muster', 'war.neutral.raiders'] },
  { war: 0, month: 5, cards: ['war.skirmish', 'war.neutral.requisition'] },
  { war: 0, month: 7, cards: ['war.siege'] },
  { war: 0, month: 8, cards: ['war.battle', 'war.neutral.battle'], battle: true },
  { war: 1, month: 5, cards: ['war.skirmish', 'war.neutral.raiders'] },
  { war: 1, month: 8, cards: ['war.battle', 'war.neutral.battle'], battle: true },
];

export const REALM_CARDS = [
  {
    id: 'realm.wedding', context: 'realm', weight: 1,
    text: 'At Kingsmead the Princess Isabeau is married to Lord Geoffrey, the Earl of Stane’s heir. The whole realm is bidden to the feast. The Duke of Aumbry sends a silver ewer, and does not come.',
    choices: [
      { label: 'Send a gift, and your congratulations.', effects: { purse: -60, favour: { stane: 2 } },
        result: 'Five shillings of Venetian glass, and a letter in your best hand. Stane’s steward writes your name in a book.' },
      { label: 'Drink her health, and say nothing.', effects: {},
        result: 'Half the realm does the same. Silence is still the safest thing to say.' },
      { label: 'Say what Aumbry’s men say: a woman cannot hold a crown.', effects: { favour: { aumbry: 2, stane: -2 }, balance: 1, traits: { honest: -1 } },
        result: 'It is repeated, with your name on it, in the right houses and the wrong ones.' },
    ],
  },
  {
    id: 'realm.fortify', context: 'realm', weight: 1,
    text: 'Masons at Ambry Cross, and a new gatehouse facing the Kingsmead road. The Duke says it is for the peace. Nobody builds a gatehouse for the peace.',
    choices: [
      { label: 'Carry word of it to the Crown.', effects: { favour: { crown: 2, aumbry: -2 }, balance: -1 },
        result: 'The chamberlain thanks you and says the council is aware. It was not.' },
      { label: 'Keep your own counsel.', effects: { traits: { constant: 1 } },
        result: 'Everyone will know soon enough.' },
      { label: 'Let Aumbry know your lance is his, if it comes to that.', effects: { favour: { aumbry: 2, stane: -1 }, balance: 1 },
        result: 'The Duke’s steward shakes your hand for a long time.' },
    ],
  },
  {
    id: 'realm.brawl', context: 'realm', weight: 1,
    text: 'At the summer fair, Aumbry’s men and Stane’s are at each other with cudgels, and a boy who belongs to neither is down in the mud.',
    choices: [
      { label: 'Wade in and part them.', check: { stat: 'vigour', dc: 11 },
        success: { effects: { honour: 1, renown: 1 }, result: 'You get the boy out and knock two heads together. Both houses curse you, and both remember you.' },
        failure: { effects: { honour: 1, purse: -24 }, result: 'You get the boy out and a cudgel across the ribs for it. The surgeon charges two shillings.' } },
      { label: 'Take your own house’s side.', when: { side: ['aumbry', 'stane'] }, effects: { favour: { side: 2 }, honour: -1, lean: 1 },
        result: 'Your side wins the brawl. It will not be the last.' },
      { label: 'Ride on.', effects: { traits: { merciful: -1 } },
        result: 'The boy lives. You find out later.' },
    ],
  },
  {
    id: 'realm.illness', context: 'realm', weight: 1,
    text: 'The king fell at mass on Whitsunday. He lives, but a regency council now rules in his name: the Duke of Aumbry, the Earl of Stane, and the archbishop sitting between them.',
    choices: [
      { label: 'Pray for him.', effects: { favour: { church: 1 }, traits: { pious: 1 } },
        result: 'Every church in Lothmere is praying for him, and some of them mean it.' },
      { label: 'Ride to Kingsmead and offer your service to the council.', effects: { purse: -24, favour: { crown: 2 } },
        result: 'You are thanked, written down, and sent home. The council has a great many offers.' },
      { label: 'Find out who holds the council’s ear.', check: { stat: 'lore', dc: 11 },
        success: { effects: { marks: { lore: 1 } }, result: 'Aumbry’s chancellor writes the council’s letters; Stane’s man reads them before they are sent. You understand the kingdom better than you did.' },
        failure: { effects: {}, result: 'Everyone you ask tells you something different, which is its own answer.' } },
    ],
  },
  {
    id: 'realm.declare', context: 'realm', weight: 1,
    when: { noOath: true, noPatron: true },
    text: 'Both houses have let it be known that their men will not ride against the other’s at their own tourneys. The circuit is dividing, and a knight who has not chosen will be asked.',
    choices: [
      { label: 'Declare for Duke Robert and Aumbry.', effects: { oath: 'aumbry', favour: { aumbry: 3, stane: -3 } },
        result: 'You wear Aumbry’s blue at the next feast. People notice who sits beside you.' },
      { label: 'Declare for the Princess and Stane.', effects: { oath: 'stane', favour: { stane: 3, aumbry: -3 } },
        result: 'You wear Stane’s gold at the next feast. People notice who sits beside you.' },
      { label: 'Stay your own man, for now.', effects: { traits: { constant: 1 } },
        result: 'Both houses will keep asking. The asking will get less polite.' },
    ],
  },
  {
    id: 'realm.forbid', context: 'realm', weight: 1,
    when: { patron: ['aumbry', 'stane'] },
    text: '{lord} forbids his men to ride against his rival’s at his own tourneys, and his rival has done the same. The circuit is dividing.',
    choices: [
      { label: 'Obey.', effects: { favour: { patron: 1 }, traits: { constant: 1 } },
        result: 'You will not meet the other house’s men at your lord’s tourney. You will meet them everywhere else.' },
      { label: 'Say you will ride against whoever the draw gives you.', effects: { favour: { patron: -2 }, traits: { honest: 1, valorous: 1 } },
        result: 'He says nothing. His steward writes something down.' },
    ],
  },
  {
    id: 'realm.loans', context: 'realm', weight: 1,
    text: 'The regency council has asked the Cities for a loan “for the defence of the realm”. The guilds have refused, and the council is not pleased.',
    choices: [
      { label: 'Speak for the guilds at court.', effects: { favour: { cities: 3, crown: -2 } },
        result: 'The wardens send you a cask of Gascon wine. The chamberlain sends you nothing.' },
      { label: 'Speak for the council.', effects: { favour: { crown: 2, cities: -2 } },
        result: 'The council is grateful, briefly.' },
      { label: 'Lend the council ten pounds yourself.', when: { minPurse: 2400 }, effects: { purse: -2400, favour: { crown: 4 }, honour: 1 },
        result: 'You get a tally stick and a promise. You will see how good the promise is.' },
    ],
  },
  {
    id: 'realm.array', context: 'realm', weight: 1,
    text: 'The lords are counting their men. A commissioner of array rides into your yard with a clerk and a ledger, and asks how many you can bring.',
    choices: [
      { label: 'Tell him the truth.', effects: { traits: { honest: 1 }, lean: 1 },
        result: 'He writes it down. It is less than some and more than others.' },
      { label: 'Promise more than you have.', effects: { flags: ['promisedMen'], lean: 2, traits: { honest: -2 } },
        result: 'He writes that down too. When the muster comes, he will count.' },
      { label: 'Promise nothing, to anyone.', effects: { traits: { constant: -1 }, favour: { crown: -1 } },
        result: 'He rides away unimpressed. You have kept your choices open, for another year.' },
    ],
  },
  {
    id: 'realm.oath', context: 'realm', weight: 1,
    text: 'Before Christmas both houses demand oaths: to Duke Robert as the rightful heir by the male line, or to the Princess Isabeau by blood. The Crown’s household swears to the king’s will, sealed and unread. Every knight in Lothmere will be asked, and you are asked now.',
    choices: [
      { label: 'Swear to Duke Robert of Aumbry.', effects: { oath: 'aumbry' },
        result: 'You kneel in Aumbry’s chapel with forty others. The Duke looks each of you in the eye.' },
      { label: 'Swear to the Princess Isabeau.', effects: { oath: 'stane' },
        result: 'You kneel before her at Castle Brede. She is younger than you expected, and steadier.' },
      { label: 'Swear to the king’s will, whatever it says.', effects: { oath: 'crown', favour: { crown: 3 } },
        result: 'The chamberlain takes your oath on the sealed will itself. You have sworn to a name you do not know.' },
      { label: 'Swear to nobody.', effects: { oath: 'none', traits: { valorous: -1 } },
        result: 'You will not choose between them. Neither of them will forget it.' },
    ],
  },
  {
    id: 'realm.kingDead.sworn', context: 'realm', weight: 1,
    when: { oathSet: true },
    text: 'Lady Day. The king is dead. At Kingsmead the archbishop breaks the seal on his will and reads it aloud: he names {heir}. By nightfall {other} has raised a standard, and the realm is at war.',
    choices: [
      { label: 'Ride to {leader}’s muster.', when: { side: ['aumbry', 'stane'] }, effects: {},
        result: 'You ride out with your men behind you and your oath in front.' },
      { label: 'Keep to your manor, and your oath to nobody.', when: { side: 'none' }, effects: {},
        result: 'You bar the gate and count your stores. The war will come past your door either way.' },
    ],
  },
  {
    id: 'realm.kingDead.free', context: 'realm', weight: 1,
    when: { noOath: true },
    text: 'Lady Day. The king is dead. The archbishop reads his will: he names {heir}. By nightfall {other} has raised a standard. You have sworn to nobody, and now you must.',
    choices: [
      { label: 'Swear to {heir}, the king’s named heir.', effects: { oath: 'heir' },
        result: 'You ride to Kingsmead and kneel with the late king’s household.' },
      { label: 'Swear to {other}.', effects: { oath: 'other' },
        result: 'You ride to the other standard. The will is one thing; the swords are another.' },
      { label: 'Stand aside.', effects: { oath: 'none' },
        result: 'You bar the gate and count your stores.' },
    ],
  },
  {
    id: 'war.muster', context: 'war', weight: 1,
    when: { side: ['aumbry', 'stane'] },
    text: '{leader}’s muster. Every lord brings his men under his own banner, and the heralds count them as they ride past.',
    choices: [
      { label: 'Ride past with every man you have.', effects: { lean: 1, renown: 1 },
        result: 'The heralds cry your name. Somewhere in the ranks your men stand straighter for it.' },
      { label: 'Explain why you have brought fewer men than you promised.', when: { flag: 'promisedMen' }, effects: { honour: -2, favour: { side: -2 } },
        result: 'The commissioner reads your promise back to you, in front of everyone.' },
      { label: 'Leave men to guard your manors.', when: { hasLands: true }, effects: { traits: { valorous: -1 } },
        result: 'Your lands will be safe. Your lord notices the gap in the column.' },
    ],
  },
  {
    id: 'war.skirmish', context: 'war', weight: 1,
    when: { side: ['aumbry', 'stane'] },
    text: 'Outriders of the other side hold a ford ahead of the army. Your captain looks at you.',
    choices: [
      { label: 'Lead the charge across the ford.', check: { stat: 'lance', dc: 12 },
        success: { effects: { renown: 3, lean: 2, peril: 0.03 }, result: 'Water to the girths and a lance through the first man. The ford is yours.' },
        failure: { effects: { renown: 1, peril: 0.05 }, result: 'You take the ford, but not cleanly, and not without cost.' } },
      { label: 'Hold the bank and let them come to you.', effects: { lean: 1, peril: 0.02 },
        result: 'They come, and they go back the way they came, fewer.' },
      { label: 'Send your men-at-arms, and watch.', when: { minMen: 3 }, effects: { lean: 1, renown: -1 },
        result: 'Your men do the work. They will not forget who watched.' },
    ],
  },
  {
    id: 'war.siege', context: 'war', weight: 1,
    when: { side: ['aumbry', 'stane'] },
    text: 'The siege of the other house’s castle is in its sixth week. The walls are sound, the food is not, and the council of war is arguing.',
    choices: [
      { label: 'Volunteer for the storming party.', check: { stat: 'vigour', dc: 12 },
        success: { effects: { renown: 4, lean: 3, peril: 0.05 }, result: 'You are the third man on the wall. The first two are not there any more.' },
        failure: { effects: { renown: 1, peril: 0.07 }, result: 'The ladder breaks. You are carried back, and the wall holds.' } },
      { label: 'Argue for starving them out.', when: { minRank: 'household' }, check: { stat: 'courtesy', dc: 11 },
        success: { effects: { favour: { side: 2 }, lean: 1 }, result: 'They agree with you, and the castle surrenders at Lammas.' },
        failure: { effects: { favour: { side: -1 } }, result: 'Nobody listens. The storm goes in without you, and fails.' } },
      { label: 'Offer to go under a flag of truce and parley.', when: { minRank: 'banneret' }, check: { stat: 'courtesy', dc: 12 },
        success: { effects: { lean: 3, honour: 2 }, result: 'You bring the garrison out with their swords and their lives. Nobody dies on the walls this week.' },
        failure: { effects: { honour: -1, favour: { side: -1 } }, result: 'They shoot at the flag. You come back with an arrow in your shield and nothing else.' } },
      { label: 'Keep to your post in the lines.', effects: { traits: { valorous: -1 } },
        result: 'You stand your watches and keep your head below the gabions. Other men climb the ladders.' },
    ],
  },
  {
    id: 'war.battle', context: 'war', weight: 1,
    when: { side: ['aumbry', 'stane'] },
    text: 'The armies draw up on either side of a shallow valley, with {leader}’s standard behind you. Where do you stand?',
    choices: [
      { label: 'Lead the charge.', when: { minRank: 'banneret' }, check: { stat: 'lance', dc: 12 },
        success: { effects: { battle: 'charge' }, result: 'Your charge goes home.' },
        failure: { effects: { battle: 'chargeFail' }, result: 'Your charge breaks on their line.' } },
      { label: 'Hold the line with your men.', effects: { battle: 'hold' },
        result: 'You hold.' },
      { label: 'Guard the claimant’s standard.', when: { minRank: 'councillor' }, effects: { battle: 'standard' },
        result: 'You stand at the standard all day.' },
      { label: 'Keep to the reserve.', effects: { battle: 'reserve', honour: -2 },
        result: 'You watch most of it.' },
    ],
  },
  {
    id: 'war.neutral.raiders', context: 'war', weight: 1,
    when: { side: 'none' },
    text: 'Deserters from both armies are burning the villages near your home. The villagers come to your gate.',
    choices: [
      { label: 'Ride out against them.', check: { stat: 'vigour', dc: 11 },
        success: { effects: { renown: 2, honour: 1, peril: 0.02 }, result: 'Six of them hang at the crossroads. The villagers bring you a cheese.' },
        failure: { effects: { honour: 1, peril: 0.04 }, result: 'You drive them off, and bury two of your own.' } },
      { label: 'Pay them to go elsewhere.', effects: { purse: -60 },
        result: 'They go elsewhere. Somebody else’s village burns.' },
      { label: 'Bar the gate.', effects: { honour: -1, traits: { merciful: -1 } },
        result: 'You hear it all night. The villagers do not come to your gate again.' },
    ],
  },
  {
    id: 'war.neutral.requisition', context: 'war', weight: 1,
    when: { side: 'none' },
    text: 'Commissioners from both armies arrive on the same day, each with a warrant for your horses and your grain.',
    choices: [
      { label: 'Give each of them half.', effects: { purse: -120, favour: { aumbry: 1, stane: 1 } },
        result: 'Neither is satisfied. Neither burns your barn.' },
      { label: 'Give it all to the king’s named heir.', effects: { purse: -120, oath: 'heir' },
        result: 'You have chosen after all. The other commissioner rides off to tell his lord.' },
      { label: 'Refuse them both.', check: { stat: 'courtesy', dc: 13 },
        success: { effects: {}, result: 'You talk them both out of it. They leave, puzzled at how.' },
        failure: { effects: { purse: -240, favour: { aumbry: -2, stane: -2 } }, result: 'They take it all anyway, and your name goes on two lists.' } },
    ],
  },
  {
    id: 'war.neutral.battle', context: 'war', weight: 1,
    when: { side: 'none' },
    text: 'The armies meet in a valley a day’s ride from your gate. You can see the banners from the hill.',
    choices: [
      { label: 'Stay on the hill.', effects: { battle: 'absent' },
        result: 'You watch the whole of it. You will remember it longer than the men who fought.' },
      { label: 'Ride in, late, for {heir}, the king’s named heir.', effects: { battle: 'lateHeir', honour: 1 },
        result: 'You come down the hill with your men.' },
      { label: 'Ride in, late, for whichever side is winning.', effects: { battle: 'lateWinner', honour: -3 },
        result: 'You wait until you can see which way it will go.' },
    ],
  },
];

export const SETTLEMENT_CARDS = [
  {
    id: 'winter.pardon', context: 'winter', weight: 20,
    when: { flag: 'attainted' },
    text: 'Your name is on the new crown’s list of the attainted. A pardon can be bought, or begged, or refused.',
    choices: [
      { label: 'Pay the fine.', when: { canPayFine: true }, effects: { pardon: 'pay' },
        result: 'You pay. The clerk strikes your name through with a single line.' },
      { label: 'Throw yourself on the new crown’s mercy.', check: { stat: 'courtesy', dc: 14 },
        success: { effects: { pardon: 'mercy' }, result: 'You kneel in the hall at Kingsmead. The pardon comes without the fine, and with a look you will not forget.' },
        failure: { effects: { pardon: 'exile' }, result: 'The new crown is not merciful this winter. You have a month to leave Lothmere.' } },
      { label: 'Refuse it, and go into exile.', effects: { pardon: 'exile' },
        result: 'You will not buy your name back from them. The ship leaves Port Lessing at Candlemas.' },
    ],
  },
  {
    id: 'court.claim', context: 'court', weight: 8,
    when: { flag: 'dormantClaim', notFlag: 'claimRestored', minFavour: { crown: 6 }, hostIs: 'crown' },
    text: 'The Crown’s justices hear petitions at Kingsmead. Your family’s old lands were taken in the last war; the charters are in a chest in your hall, and the justices have heard it all before.',
    choices: [
      { label: 'Plead it yourself, from the charters.', check: { stat: 'lore', dc: 13 },
        success: { effects: { manor: 'claim', flags: ['claimRestored'] }, result: 'The justices read every charter, and find for you. Your family’s hall is yours again, roof and all.' },
        failure: { effects: { purse: -240 }, result: 'A clerk finds a flaw in the third charter. A pound in fees, and you must come back.' } },
      { label: 'Pay a serjeant-at-law to plead it.', when: { minPurse: 1200 }, effects: { purse: -1200, manor: 'claim', flags: ['claimRestored'] },
        result: 'Five pounds, and a month of his Latin, and the justices find for you.' },
    ],
  },
];
