// Cards for the road, the lists, the prize-giving, winter and court.
// Logic-free. See cards.court.data.js for the shape.

export const ROAD_CARDS = [
  {
    id: 'road.bridge', context: 'road', weight: 3,
    cast: { rival: { from: 'roster', notInField: true } },
    text: 'At a bridge on the road to {town}, {rival} has hung a shield from a thorn tree. Whoever would cross must run three courses against him, or leave a spur.',
    choices: [
      { label: 'Touch the shield.', effects: { pas: 'rival', traits: { valorous: 1 } },
        result: 'He takes up his lance. The ferryman sits down to watch.' },
      { label: 'Leave a spur, and cross.', effects: { purse: -24, honour: -1 },
        result: 'He hangs it from the tree with the others. There are a good many.' },
      { label: 'Ride the long way round.', effects: { travelDays: 2, traits: { valorous: -1 } },
        result: 'Two days more, and nobody to see you do it.' },
    ],
  },
  {
    id: 'road.outlaws', context: 'road', weight: 2,
    text: 'Three men step out of the trees at a ford. Deserters, by their jacks. The peace has not been kind to everyone.',
    choices: [
      { label: 'Draw.', check: { stat: 'vigour', dc: 11 },
        success: { effects: { renown: 2, honour: 1 }, result: 'Two run. The third you send to the sheriff at {town}, where the story arrives before you do.' },
        failure: { effects: { wound: 'light', purse: -60 }, result: 'You win, just. They take your purse with them as they go.' } },
      { label: 'Pay them off.', effects: { purse: -48, traits: { valorous: -1 } },
        result: 'Four shillings. They count it twice.' },
      { label: 'Offer them work.', effects: { purse: -24, honour: 1, traits: { merciful: 2 } },
        result: 'Two take the shilling and a letter to your father’s steward. The third laughs and goes back into the trees.' },
    ],
  },
  {
    id: 'road.lame', context: 'road', weight: 2,
    text: '{horse} comes up lame on the second day.',
    choices: [
      { label: 'Rest a day and walk him.', effects: { travelDays: 1 },
        result: 'A day lost, and a sound horse at the end of it.' },
      { label: 'Ride on.', effects: { fatigue: 2, traits: { merciful: -1 } },
        result: 'He carries you in, and you both arrive the worse for it.' },
    ],
  },
  {
    id: 'road.inn', context: 'road', weight: 3,
    text: 'The inn at the crossroads is full of heralds on their way to {town}.',
    choices: [
      { label: 'Stand them a round.', effects: { purse: -18, intelField: 2, traits: { generous: 1 } },
        result: 'Heralds drink like knights and talk like fishwives. By midnight you know how two of tomorrow’s riders sit their horses.' },
      { label: 'Go to bed early.', effects: { fatigue: -1 },
        result: 'You arrive fresher than anyone who stayed up.' },
    ],
  },
  {
    id: 'road.friar', context: 'road', weight: 2,
    text: 'A friar on the road asks alms for the lazar-house at {town}.',
    choices: [
      { label: 'Give him a shilling.', effects: { purse: -12, honour: 1, traits: { pious: 1, generous: 1 } },
        result: 'He blesses your lance, your horse and, after a pause, your squire.' },
      { label: 'Give him a penny.', effects: { purse: -1, traits: { generous: -1 } },
        result: 'He blesses you anyway. It is his trade.' },
      { label: 'Kneel with him in the road, and ask him to pray for your master.', when: { minTrait: { pious: 14 } },
        effects: { purse: -12, honour: 2, traits: { pious: 1 } },
        result: 'You kneel in the dust together. A cart has to go round you. Nobody on it laughs.' },
      { label: 'Ride past.', effects: { traits: { pious: -1, generous: -1 } },
        result: 'He says something in Latin that is probably not a blessing.' },
    ],
  },
  {
    id: 'road.lady', context: 'road', weight: 2,
    cast: { lady: 'any' },
    text: 'The lady {lady}’s litter has lost a wheel in the mud, and her escort is one old man.',
    choices: [
      { label: 'Get down and help.', effects: { fatigue: 1, renown: 1, marks: { courtesy: 1 } },
        result: 'You arrive muddy to the knee. She will tell the story at every feast this summer.' },
      { label: 'Send your squire.', when: { hasSquire: true }, effects: { squire: { loyalty: 1 } },
        result: 'The story gets told with {squire} in it, which he will never let you forget.' },
      { label: 'Ride on.', effects: { traits: { merciful: -1 } },
        result: 'Someone else stops. Someone always does.' },
    ],
  },
  {
    id: 'road.convoy', context: 'road', weight: 2,
    text: 'A wool convoy bound for {town} offers a pound if you will ride with it.',
    choices: [
      { label: 'Ride with them.', effects: { purse: 240, fatigue: 1, favour: { cities: 1 }, traits: { pious: -1 } },
        result: 'Slow going, a pound in your purse, and a mercer who will remember your name.' },
      { label: 'Decline.', effects: {},
        result: 'You ride on at your own pace.' },
    ],
  },
  {
    id: 'road.ferry', context: 'road', weight: 3,
    cast: { rival: { from: 'roster', regardMax: -2, notInField: false } },
    text: 'You meet {rival} at a ferry. There is room on the boat for one of you and his horse.',
    choices: [
      { label: 'Yield him the boat.', effects: { honour: 1, regard: { rival: 2 }, travelDays: 1 },
        result: 'He crosses. You wait. On the far bank he raises a hand, which is more than you expected.' },
      { label: 'Take it.', effects: { regard: { rival: -2 }, traits: { valorous: 1, merciful: -1 } },
        result: 'You cross first. He will remember the ferry.' },
      { label: 'Suggest you share it, and the silence.', check: { stat: 'courtesy', dc: 12 },
        success: { effects: { regard: { rival: 3 } }, result: 'Somewhere in the middle of the river, one of you laughs.' },
        failure: { effects: { regard: { rival: -1 } }, result: 'The silence is long and the river is wide.' } },
    ],
  },
  {
    id: 'road.friend', context: 'road', weight: 3,
    cast: { rival: { from: 'roster', regardMin: 4 } },
    text: 'You fall in with {rival} on the road, and ride two days together.',
    choices: [
      { label: 'Talk of the lists.', effects: { intelField: 2, regard: { rival: 1 } },
        result: 'He knows half the field at {town}, and tells you about them.' },
      { label: 'Race him to the next inn.', check: { stat: 'seat', dc: 11 },
        success: { effects: { renown: 1, regard: { rival: 1 } }, result: 'You win by a length. He pays for supper.' },
        failure: { effects: { purse: -12, regard: { rival: 1 } }, result: 'He wins by a length. You pay for supper.' } },
    ],
  },
  {
    id: 'road.rain', context: 'road', weight: 2,
    text: 'Rain for four days. The road to {town} is a river.',
    choices: [
      { label: 'Push through.', effects: { fatigue: 2 },
        result: 'You arrive on time and soaked to the bone.' },
      { label: 'Wait it out.', effects: { travelDays: 2 },
        result: 'Two days at an inn, at your own expense.' },
    ],
  },
];

export const MOMENT_CARDS = [
  {
    id: 'moment.unhorsed', context: 'moment.unhorsed', weight: 1,
    cast: { opponent: true },
    text: '{opponent} is on his back in the sand, and not yet moving.',
    choices: [
      { label: 'Dismount and help him up.', effects: { honour: 1, regard: { opponent: 3 }, traits: { merciful: 1 }, memory: { opponent: 'You helped him up when you bore him down at {town}.' } },
        result: 'He takes your hand. The stands like that more than the fall.' },
      { label: 'Salute him with your lance.', effects: { regard: { opponent: 1 } },
        result: 'Correct, and no more than correct.' },
      { label: 'Ride your lap before the ladies.', effects: { renown: 1, regard: { opponent: -3 }, traits: { merciful: -1, valorous: 1 }, memory: { opponent: 'You rode your lap while he lay in the sand at {town}.' } },
        result: 'The stands roar. He hears them from the ground.' },
      { label: 'Tell him to stay down.', when: { maxTrait: { merciful: 6 } },
        effects: { renown: 1, honour: -1, regard: { opponent: -5 }, traits: { merciful: -1 }, memory: { opponent: 'You told him to stay down, at {town}.' } },
        result: 'He stays down. The crowd goes quiet, and then it cheers you anyway. Crowds do.' },
    ],
  },
  {
    id: 'moment.forfeit', context: 'moment.forfeit', weight: 1,
    cast: { opponent: true },
    text: '{opponent}’s lance took your horse in the chest. The heralds award you the bout, and the crowd waits to see how you take it.',
    choices: [
      { label: 'Accept it quietly.', effects: { honour: 1, regard: { opponent: 2 } },
        result: 'You make nothing of it. He will not forget that you did not.' },
      { label: 'Ask the heralds to strike his fault from the roll.', check: { stat: 'courtesy', dc: 11 },
        success: { effects: { honour: 2, regard: { opponent: 4 }, memory: { opponent: 'You asked the heralds to strike his fault at {town}.' } }, result: 'The heralds agree. It is the talk of the feast.' },
        failure: { effects: { honour: 1 }, result: 'The heralds refuse: the ordinance is the ordinance. It was well meant, and seen to be.' } },
      { label: 'Claim it loudly.', effects: { renown: 1, regard: { opponent: -3 }, traits: { merciful: -1 } },
        result: 'You make sure the stands know whose horse it was.' },
    ],
  },
  {
    id: 'moment.beaten', context: 'moment.beaten', weight: 1,
    cast: { opponent: true },
    text: 'You are on your back, looking at the sky, and {opponent} is looking down at you.',
    choices: [
      { label: 'Rise, and salute him.', effects: { honour: 1, regard: { opponent: 2 } },
        result: 'It hurts to lift your arm. You lift it.' },
      { label: 'Say it was the horse.', effects: { honour: -1, regard: { opponent: -1 }, traits: { honest: -2 } },
        result: '{horse} says nothing, which is to his credit.' },
      { label: 'Say nothing, and walk off.', effects: { traits: { constant: 1 } },
        result: 'Your squire catches up with you at the tent.' },
      { label: 'Tell the heralds he rode the better course.', when: { minTrait: { honest: 14 } },
        effects: { honour: 2, regard: { opponent: 3 }, traits: { honest: 1 } },
        result: 'Losers do not usually say so. The heralds write down that this one did.' },
    ],
  },
  {
    id: 'moment.hurt', context: 'moment.hurt', weight: 1,
    cast: { opponent: true },
    text: '{opponent} does not get up. His people carry him to his tent.',
    choices: [
      { label: 'Send your own surgeon.', effects: { purse: -60, honour: 1, regard: { opponent: 4 }, traits: { merciful: 1 }, memory: { opponent: 'You sent your surgeon when he was hurt at {town}.' } },
        result: 'The surgeon comes back at midnight and says he will ride again, in time.' },
      { label: 'Leave it to his people.', effects: { traits: { merciful: -1 } },
        result: 'You hear in the morning that he will live.' },
    ],
  },
];

export const PRIZE_CARDS = [
  {
    id: 'prize.largesse', context: 'prize', weight: 1,
    text: 'The heralds cry your name, and the minstrels are waiting to learn what that is worth to them.',
    choices: [
      { label: 'A tenth of the prize, as custom asks.', effects: { largesse: 0.1 },
        result: 'Custom is satisfied, and so are they, mostly.' },
      { label: 'A quarter, and let them sing it.', effects: { largesse: 0.25, renown: 2, honour: 1, traits: { generous: 2 } },
        result: '“Largesse!” they cry, and they cry your name after it.' },
      { label: 'Nothing beyond the entry’s share.', effects: { renown: -1, traits: { generous: -2 } },
        result: 'The minstrels find a rhyme for your name. It is not a kind one.' },
    ],
  },
];

export const WINTER_CARDS = [
  {
    id: 'winter.roof', context: 'winter', weight: 3,
    when: { flag: 'heir' },
    text: 'Your father writes: the roof of the great hall will not see another winter, and he wonders whether the heir might help.',
    choices: [
      { label: 'Send five pounds.', when: { minPurse: 1200 }, effects: { purse: -1200, honour: 1, traits: { generous: 1, constant: 1 } },
        result: 'The roof is mended by Easter. Your father does not write to thank you, which is how you know he is pleased.' },
      { label: 'Send what advice you have.', effects: { traits: { generous: -1 } },
        result: 'He does not take it.' },
    ],
  },
  {
    id: 'winter.master', context: 'winter', weight: 4, once: true,
    when: { master: 'disgraced', masterFate: 'living' },
    text: '{master} writes from the priory where he lives now. He has heard of you. He asks nothing, which is how you know he wants to see you.',
    choices: [
      { label: 'Ride to see him.', effects: { purse: -24, marks: { lance: 2 }, flags: ['visitedMaster'] },
        result: 'He is thinner. He watches you ride in the priory yard and tells you three things you have been doing wrong.' },
      { label: 'Write back.', effects: { traits: { constant: 1 } },
        result: 'You write a long letter, and burn the first two drafts.' },
    ],
  },
  {
    id: 'winter.retainer', context: 'winter', weight: 5, once: true,
    when: { flag: 'patronOwes', minRenown: 12, noPatron: true },
    text: 'Aumbry’s steward writes: the Duke remembers what he owes your father, and would have you in his household. Ten pounds a year, and his livery.',
    choices: [
      { label: 'Accept.', effects: { serve: 'aumbry', favour: { stane: -3 }, purse: 2400 },
        result: 'You ride in Aumbry’s colours now, and the first year’s fee rides with you. Stane’s men will have noticed.' },
      { label: 'Decline, with thanks.', effects: { favour: { aumbry: -2 }, honour: 1 },
        result: 'The steward writes that the Duke is patient. It does not read like a comfort.' },
    ],
  },
  {
    id: 'winter.betrothal', context: 'winter', weight: 3, once: true,
    when: { heart: 'promised', minYear: 2 },
    text: 'Your betrothed’s family writes to ask when the wedding will be.',
    choices: [
      { label: '“When the lists allow, and soon.”', effects: { flags: ['weddingSet'], traits: { constant: 1 } },
        result: 'They set a date, and a dowry. The wedding itself belongs to a later build.' },
      { label: '“When I have a name worth giving her.”', effects: { traits: { constant: -1, valorous: 1 } },
        result: 'Her father writes back two lines. The second is not polite.' },
    ],
  },
  {
    id: 'winter.fever', context: 'winter', weight: 2,
    text: 'A fever at Candlemas. For a week you do not know what day it is.',
    choices: [
      { label: 'Keep to your bed.', check: { stat: 'vigour', dc: 9 },
        success: { effects: {}, result: 'It breaks on the eighth day. You are thin, and sound.' },
        failure: { effects: { stats: { vigour: -1 } }, result: 'It breaks, but something of it stays with you.' } },
      { label: 'Send for a physician.', effects: { purse: -60 },
        result: 'He bleeds you, charges you five shillings, and you recover anyway.' },
    ],
  },
  {
    id: 'winter.squireFather', context: 'winter', weight: 3,
    when: { squireOrigin: 'lordsSon' },
    text: '{squire}’s father writes to ask whether his son will be knighted by your hand, or another’s.',
    choices: [
      { label: '“By mine, when he is ready.”', effects: { squire: { loyalty: 1 }, traits: { constant: 1 } },
        result: 'His father writes back warmly, and the fee arrives early.' },
      { label: '“He needs longer than you think.”', effects: { squire: { loyalty: -1 }, traits: { honest: 1 } },
        result: 'His father does not reply. {squire} reads the letter over your shoulder.' },
    ],
  },
  {
    id: 'winter.rival', context: 'winter', weight: 3,
    cast: { rival: { from: 'roster', regardMax: -5 } },
    text: 'A letter under {rival}’s seal. He writes that he will be at every tourney you ride this year, and that he will look for you.',
    choices: [
      { label: 'Write back that you will be easy to find.', effects: { renown: 1, regard: { rival: -1 }, traits: { valorous: 1 } },
        result: 'Your herald reads it aloud in three halls before spring.' },
      { label: 'Write back offering peace.', check: { stat: 'courtesy', dc: 13 },
        success: { effects: { regard: { rival: 5 }, honour: 1 }, result: 'His answer takes a month. When it comes, it is a single line: “At Whitsun, then, as friends.”' },
        failure: { effects: { traits: { valorous: -1 } }, result: 'He does not answer. He tells people you wrote.' } },
      { label: 'Burn it.', effects: {},
        result: 'It burns like any other letter.' },
    ],
  },
];

export const COURT_CARDS = [
  {
    id: 'court.audience', context: 'court', weight: 3,
    text: 'You wait three days at {town} for a word with {host}. On the fourth, you get one.',
    choices: [
      { label: 'Speak of your service, and your hopes.', check: { stat: 'courtesy', dc: 12 },
        success: { effects: { favour: { host: 3 } }, result: 'You are listened to, and remembered.' },
        failure: { effects: { favour: { host: 1 } }, result: 'You are listened to, and perhaps remembered.' } },
      { label: 'Speak of the lists, and nothing else.', effects: { favour: { host: 1 }, renown: 1 },
        result: 'It turns out the great are as fond of a good fall as anyone.' },
    ],
  },
  {
    id: 'court.petition', context: 'court', weight: 2,
    text: 'A miller in the courtyard at {town} begs you to carry his grievance to someone who matters. His lord has taken his mill.',
    choices: [
      { label: 'Carry it.', effects: { favour: { host: -1 }, honour: 2, traits: { merciful: 1, honest: 1 } },
        result: 'It does him some good, and you some harm. Such is justice.' },
      { label: 'Tell him you have no such voice.', effects: { traits: { merciful: -1 } },
        result: 'He thanks you anyway, which is worse.' },
    ],
  },
  {
    id: 'court.ladies', context: 'court', weight: 2,
    cast: { lady: 'any' },
    text: 'The ladies of the household are at their needlework, and the lady {lady} asks whether you would read to them.',
    choices: [
      { label: 'Read to them.', check: { stat: 'lore', dc: 10 },
        success: { effects: { renown: 1, marks: { courtesy: 1 } }, result: 'You read them Lancelot. They make you read the sad part twice.' },
        failure: { effects: {}, result: 'Your Latin is not what it was. They are kind about it.' } },
      { label: 'Excuse yourself to the stables.', effects: { marks: { seat: 1 } },
        result: 'The horses do not mind your Latin.' },
    ],
  },
  {
    id: 'court.succession', context: 'court', weight: 3,
    text: 'An Aumbry man and a Stane man are arguing about the succession within your hearing, and both look at you.',
    choices: [
      { label: 'Side with Aumbry.', effects: { favour: { aumbry: 2, stane: -2 } },
        result: 'The Aumbry man claps your shoulder. The Stane man writes something down.' },
      { label: 'Side with Stane.', effects: { favour: { stane: 2, aumbry: -2 } },
        result: 'The Stane man nods, as if you had passed a test.' },
      { label: 'Say the king is in excellent health.', effects: { favour: { crown: 1 }, traits: { honest: -1 } },
        result: 'Both of them laugh, which is the safest thing that could have happened.' },
    ],
  },
];
