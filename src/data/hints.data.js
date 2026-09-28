// The hints a new player sees the first time each kind of screen comes up.
// Logic-free. Each is short: what the screen is for, and the one thing about
// it that is not obvious.

export const HINTS = {
  month: {
    title: 'Your month',
    lines: [
      'Each month you ride to one tourney, or spend it another way: training, paid service, rest, or a visit to court.',
      'Pick a tourney on the map or the list. Its card shows the road, the entry, the days it runs and the prize. Local jousts are for the untried; the lords’ tourneys pay and cost more.',
      'Every bout tires your horse, and a month without one brings him back. After October comes winter, and its accounts: keep something in your purse for them.',
    ],
  },
  arrival: {
    title: 'Before you pay',
    lines: [
      'You see the field before you pay the entry, and you can still turn for home. Friends in the field tell you how some of them ride.',
      'A herald’s read shows you how a man rides for a few pence. What you know of him changes the odds your squire reckons.',
    ],
  },
  bout: {
    title: 'In the lists',
    lines: [
      'A bout is three courses. For each, choose where to aim and how to sit. The bar shows the chance of every outcome, and those are the chances the course is run with.',
      'The helm scores more and is harder to land. The low aim bears men down, but can foul the tilt. Pressing strikes harder and leaves you easier to unhorse.',
      'Your squire’s reckoning picks the best odds for what you know of the man. Ride it out if you would rather not choose.',
    ],
  },
  card: {
    title: 'A moment',
    lines: [
      'Between the lists, things happen. Your answer moves your honour, your traits, your standing with the great houses and what the field thinks of you.',
      'An answer marked as a trial shows its chance of success; that is the chance rolled.',
    ],
  },
  day: {
    title: 'The days after the jousts',
    lines: [
      'One entry covers every day of a tourney. After the jousts you may ride in the mêlée or at the barriers, or watch from the stands.',
      'Fatigue carries over the night, less what sleep gives back, and a serious wound keeps you out.',
    ],
  },
  melee: {
    title: 'The mêlée',
    lines: [
      'Two sides, three passes. Each pass, choose a man and what to do with him: take him for ransom, beat him down, ride to a comrade, or rest in the recet.',
      'Every button shows the chance of taking him and of being taken yourself. The man cut off from his side is the easiest prize; your squire’s counsel weighs them all.',
    ],
  },
  foot: {
    title: 'At the barriers',
    lines: [
      'On foot, with the axe, over a wooden barrier. Each exchange, choose a stroke and a guard. As at the tilt, the odds shown are the odds rolled.',
    ],
  },
  winter: {
    title: 'Winter',
    lines: [
      'The accounts are settled, the heralds publish the Roll, and you are a year older. Letters come from home, and the chronicle records the year.',
      'Choose what to train, take or teach a squire, hire men, and buy a horse or harness for spring. Later, the Company of the Swan and your vows are settled here too.',
    ],
  },
  fair: {
    title: 'A fair',
    lines: [
      'Not a tourney: no lance, no ransom. The chance on every choice is the one it is rolled at.',
    ],
  },
};
