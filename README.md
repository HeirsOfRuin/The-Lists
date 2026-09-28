# The Lists

A tourney knight's career in a kingdom at peace.

You come out of squirehood with a name, a horse, and whatever your family could
give you. You ride the tourney circuit, where a lance on the helm pays better
than a battle ever did and the heralds write down everything you do. This is one
knight's life, from dubbing to retirement or the grave.

The full design is in [DESIGN.md](DESIGN.md). This README covers what is built,
how to run it, and what the instruments measured.

## Playing it

```
node tools/make-icon.mjs      # once: draws assets/icon-*.png
node tools/bundle.js          # builds dist/the-lists.html
```

Open `dist/the-lists.html` in a browser, from anywhere, including a phone's
downloads folder. It needs no server and no install. It saves itself to that
browser after every course.

For development, serve the directory and open `index.html`:

```
python3 -m http.server 8000
```

## What this build is

Phase 6 is a life: how a career ends, and what fills it besides the lists.
It follows a rewrite of character creation and a written history for the
kingdom.

- **Creation as a story.** Six chapters of a life:
  1. Blood
  2. Boyhood
  3. Squire
  4. Learning
  5. Spurs
  6. The road

  Each opens with a preface in the story's voice, and the answers are first
  person. Each answer shows what it gives and what thread it opens. The last
  page is the heralds' roll: a short biography, and the threads waiting for
  the knight.
- **The Book of Lothmere** (the World tab). 43 pages on the kingdom, its
  powers, its twelve towns and the customs of the lists. A page opens when you
  go to the place or see the thing done. Each town's page is shown on arrival,
  and its first line on the month's tourney cards.
- **The chronicle.** Every winter the heralds write the year in a few lines:
  - the realm's beats and battles;
  - the great tourneys' champions, and yours;
  - who retired, who was chosen for the Swan, and who headed the Roll;
  - a sign of the times.

  Every year is kept.
- **Letters in winter:** from home (who writes depends on your birth), from
  your old master, and from your lady. Each is chosen by how the year went.
- **Hanging up your lance.** Any winter from 34 you may retire, and at 45 you
  must.
  - The winter screen shows what the heralds would write if you went now.
  - The epilogue is written from the Book of Feats, under the grandest of the
    named endings (DESIGN.md §8).
  - It says whether you got what you rode out for.
  - Deaths and exiles get the same record under their own first line.
- **The Company of the Swan.** 24 stalls: eight great lords and sixteen
  knights of the field.
  - *Vacancies.* A stall falls empty when its companion dies or is disgraced.
  - *Standing.* From your eighth year, with renown 40 and honour 15, the
    chapter hears your name at Candlemas.
  - *The vote.* You see the candidates, the heralds' reckoning of the vote,
    and your chance of a stall. A table kept for the companions costs £6 and
    shows what it would do to that chance.
  - *Holding a stall* brings invitations to every great tourney and counts
    toward your standing. Lose your honour and the chapter puts you out.
- **Vows on the swans.** Six vows, made at the Candlemas feast for the year
  and judged at the next winter from the Book of Feats:
  - lances broken;
  - knights borne down;
  - a prize;
  - a prize on the King's circuit;
  - no ransoms taken;
  - a walk to the shrine.

  Progress shows on the month's screen.
- **The fairs.**
  - *The popinjay* at Saltings Quay in May: three rounds of crossbow at a
    wooden bird.
    - Each round you choose the mark (tail, wing, or the bird itself) and
      whether to wait for a lull.
    - Waiting takes the wind out of your shot, but the guild shoots first and
      may bring the bird down before you. The screen shows the chance of that
      and of every shot.
    - Win it and you are King of the Popinjay, with two of the guild's
      crossbowmen.
  - *The Downs Race* at Othery in September.
    - Three ways to ride it: from the front, a late run, or the inside line
      (with a fall risk).
    - Each plan shows its chance to win and to place, found by integrating
      the same distributions the race is run with.
- **Archers** join your company alongside men-at-arms. They are cheaper, and
  count for half a man in the battle line.
- **The war's months.**
  - A sworn knight may ride with his side's army for a month: pay, renown and
    favour, with the chance of death on the button.
  - A landed knight may see to his manors. An unwatched manor may lose its
    rents to raiders in a war year.
- **The secret love** now has a way to end, one way or the other.
- **Saves carry forward.** A phase-five save opens with the Company filled
  from its field, and its knight's Book of Lothmere rebuilt from his Book of
  Feats.

Phase 5 added the other lists: the mêlée, foot combat at the barriers, the
Great Pas, and trial by combat.

- **Tourneys of several days.**
  - *Local* jousts are one day.
  - *Regional* tourneys add the mêlée on the second day.
  - *High* tourneys and the King's add the mêlée and then the barriers.

  One entry covers every day. After the jousts, each day is yours to ride in
  or watch. Fatigue carries over the night, less what sleep gives back, and a
  serious wound puts you in the stands. The month's tourney cards list each
  one's days, and the Book of Feats tells all of them.
- **A sixth skill, the sword**, for the mêlée and the barriers. It is trained
  like the others and practised in both.
  - Creation: "The axe at the barriers" now gives sword +2 and vigour +1, and
    the veteran master gives sword +1.
  - The field: every knight has a sword and a style at the barriers.
- **The mêlée.** Two sides: the host's men and the comers. There are three
  passes; in each you choose a man and what to do with him.
  - *The choices:* take him for ransom, beat him from the saddle, ride to rescue
    a comrade, or rest in the recet (the roped-off safe ground).
  - *The openings:* one man each pass is cut off from his side, and weaker for
    it.
  - *The risk:* a knight who overreaches is taken himself, and pays his
    ransom.
  - *Your men-at-arms* can ride with you, up to 2, 3 or 4 by tier. Each adds
    weight in the press and takes a capture meant for you.
  - *Every button* shows the chance of taking him, being beaten off, losing a
    man, being taken, and a wound. Those are the numbers rolled.
  - *The squire's counsel* marks the answer with the best expected return.
  - *Afterwards* you choose the terms for your prisoners: full ransom, half on
    their word, or free. Letting them go is generosity, honour and their
    regard.
  - *It pays in money,* not renown. The jousts stay the prestige event.
- **The barriers.** Foot combat with the pollaxe across a waist-high barrier:
  four men by lot, two rounds, and a prize.
  - Each exchange is a stroke (head, thrust or hook) and a guard (stand,
    close, or give ground).
  - A man driven to his knee or disarmed loses outright. A hook below the
    barrier is a foul.
  - Every man of the field has a style (axeman, wrestler, fencer, brawler, or
    schooled) with tells. What you know of a man covers his riding and his
    fighting on foot.
  - The odds preview and the squire's reckoning come from the same single
    function as the resolver, exactly as in the lists.
- **The Great Pas**, once, in July of the seventh year: the Pas of the
  Weeping Fountain at Hollin Moor, held by the first lance of the Roll. It is
  modelled on Jacques de Lalaing's Fountain of Tears.
  - Touch the black shield for three courses with him, the white for the axe,
    or both.
  - Every shield touched earns a gold ring and your name in the book of the
    pas. Beating him earns a golden lance-head or a golden axe.
- **Trial by combat à outrance.** Sharp axes; a man is beaten when he is down,
  disarmed, or twice struck on the head. If neither is beaten by the ninth
  exchange, the king throws down his baton.
  - *Two ways in:* accusing the man of Ambry Cross ("prove it on his body"), or
    a knight with a grudge accusing you at the helm-show.
  - *The accusation shows* your chance by the squire's reckoning, and the
    chance he kills you if he wins. The second is the number rolled.
  - *Win,* and he is at your mercy: spare him or finish it.
  - *Lose,* and you may not live. If you do, the accusation's verdict stands
    against you.
- **Saves carry forward.** A phase-four save opens with the sword skill, and
  the field fitted out for the barriers. A tourney in progress finishes as
  the one-day tourney it began as.

Phase 4 of 6 is the realm: ten years of a peace wearing thin, and then the war.

- **The succession.** King Aldric has no son. His cousin, Duke Robert of
  Aumbry, claims by the male line; his daughter Isabeau, married into Stane,
  claims by blood. He dies on Lady Day of your tenth year, every career, and
  his sealed will names one of them.
- **The ten years before.** Tension rises on a fixed schedule; nothing you do
  stops it. The Now screen shows how near it is, what they are saying in the
  halls that month, who leads, and where you stand. Eight scripted beats come
  whether you ride or not:
  - the Princess's wedding (year 2);
  - a gatehouse at Ambry Cross (3);
  - a brawl between the houses' men (4);
  - the king's collapse and the regency council (5);
  - the houses dividing the circuit (6);
  - the council's loan and the guilds' refusal (7);
  - the commissioners of array counting men (8);
  - the demand for oaths (9).
- **The proxy war on the circuit.** Every high tourney and King's Tourney won by
  a house's sworn knight moves the balance toward that house. Your own wins
  count half again. The balance decides whose name is in the will, and so which
  side the Crown's knights ride for. Stane is the default heir: Aumbry needs the
  balance clearly his way.
- **Invitations.** The high tourneys and the King's are by letter, sent a month
  ahead, and a letter once sent stands.
  - *High:* renown 20, the host's favour at 8, or being his man.
  - *The King's:* renown 35, the Crown's favour at 8, the Crown's service, or a
    patron whose favour reaches 12 bringing you in his train.
  - A disgraced knight gets none.
  - From year six, with the realm dividing, a great house invites none of its
    rival's sworn men, and the field is drawn the same way.
  - Lineage no longer opens doors; it counts toward standing instead.
- **Land and men.**
  - *Manors* come by marriage (the dower), by a patron after three faithful
    years with his favour at 14, by the king's hand to a King's Tourney
    champion of renown 40, by reclaiming a fallen house's charters, by purchase,
    or by war.
  - *Rents and men:* each manor pays rents every winter and has tenants who owe
    service.
  - *Men-at-arms:* you can hire them in winter, up to what your land can keep.
    A man who is not paid leaves rather than ruin you.
  - *Forfeiture:* land held of a lord falls with him.
- **Standing.** The Knight tab adds it up term by term: renown (capped),
  honour, lineage, manors, men, service, the favour of your side, a virtuous
  byname, and great prizes. It comes to a rank for when it comes to swords:
  hedge knight, household knight, banneret, captain, or councillor of war. Rank
  decides what you bring to a battle, which answers are open to you, how
  exposed you are, and what the victor gives or the vanquished take.
- **The war.** It lasts one year, or two if the first battle is close or an
  upset. Each step is a choice:
  - the king's death and the reading of the will, where the unsworn must choose;
  - the muster;
  - a ford;
  - a siege;
  - the battle.

  Every answer shows your side's chance of the field, your own risk of death,
  and, if your side loses, your chance of being taken and the ransom. Those are
  the numbers the battle is fought at. A neutral fends off deserters and
  requisitions, and can watch from the hill or ride in late.
- **The settlement.**
  - *The victor's men* are rewarded by rank: money, renown, and from banneret
    upward, manors.
  - *The vanquished* forfeit what they held of the losing house, and may be
    attainted. An attainted knight pays the fine, begs mercy, or goes into
    exile.
  - *Neutrals* lose a little renown and are remembered for it.
  - *The new crown* holds a coronation tourney the next spring.
- **New endings:** dead in the war, and exiled.
- **Saves carry forward.** A phase-three save opens at whatever year it has
  reached, with the houses even. A married knight's wife's lands become her
  dower manor.

Phase 3 of 6 is the court. Creation is also down to six questions, and each
answer tells a small story.

- **Six questions, not ten.** Four of them each answer two things:
  - your people: birth and what the family gave;
  - your country and your horse;
  - how you parted from your master and won your spurs;
  - what you want and who waits for you.

  Your master and what he taught you best stay separate, so you still choose
  your build.
- **Patrons.** The Crown, the Duke of Aumbry, the Earl of Stane or the Guild of
  St Barbara may take you into service once their favour reaches 8 and your
  renown reaches 10. A patron pays a fee every winter and puts you in his
  livery. In return:
  - You ride at his tourney every year.
  - You answer his summons within its two-month window. A summons is an escort,
    a letter, an envoy, a quarrel to settle, a month in the king's guard, or a
    rival of the house to put in the sand.
  - His knights think better of you, and his rival's knights think worse.
  - Miss two obligations and he lets you go, at a cost in honour.
- **The heralds' judgement.** Honour runs from 0 to 20 and sets how the heralds
  regard you:
  - *Without reproach* (16+): their read of a rider costs half.
  - *Of good name* (8–15).
  - *Questioned* (3–7): accusations at the helm-show.
  - *Disgraced* (2 or below): barred from the high tourneys and the King's
    until a pilgrimage begins to mend it.

  Each tourney's Book entry carries the heralds' view of your conduct there.
- **Character that shows.** Traits move slowly, and more slowly the further
  they are from the middle. Some answers are open only to a knight strong in
  one ("Open to you because you are generous"). At 18 the heralds give you a
  byname, such as the Generous, the Fox or the Hard, and a virtue that becomes a
  byname is sung for renown every winter.
- **The first story threads.**
  - *Ambry Cross*: a witness, the heralds' old rolls, the name of the man whose
    lance it really was, and the choice of accusing him before the heralds or
    letting God judge in the lists.
  - *The betrothal*: from a date set to a wedding, with a dowry and the lady's
    lands, or a broken promise.
- **Saves carry forward** from phases one and two. Aumbry's retainer becomes
  service, and the field swears itself to houses.

Phase 2 of 6 is the world around the lists. Phase 1 was the spine: creation and
the joust.

- **A calendar, not a treadmill.** The riding year runs from March to October.
  Each year has one King's Tourney, two high tourneys held by the great houses,
  four regional tourneys and seven local jousts. That is far more than one knight
  can ride, so you choose each month by entry rules, costs, prizes, distance and
  the field.
  - The high tourneys and the King's had renown, favour and lineage gates here.
    Phase 4 replaced them with invitations (above).
  - The heralds say exactly why they turn you away.
- **A map and the road.** Twelve towns in three provinces, with travel in days
  that costs money for every mouth in your train. Long roads bring road cards.
  One of them is a knight holding a bridge, and touching his shield means three
  courses before you may go on.
- **The field.** 48 knights with their own careers. They ride every tourney in
  the calendar whether you are there or not, they age and retire, and new ones
  come up. Their renown is earned in the same brackets as yours, so the Roll of
  Arms is a real table.
- **Rivals who remember you.** Each knight has a temperament and a regard for
  you, and remembers what you did.
  - A proud man you unhorse will hold it against you; a courteous one salutes.
  - A knight with a grudge rides at you harder and higher, and the odds allow
    for it.
  - Friends in the field tell you how the others ride.
  - Your squirehood, your master and your grandfather all start you with history.
- **Feasts, the road, and chivalric moments.** 45 situations with choices,
  running on one card engine:
  - the eve feast;
  - arrival, including the helm-show at the great tourneys;
  - the road;
  - the moment after a fall or a foul;
  - the prize-giving's largesse;
  - winter letters;
  - court.

  Some answers are trials of a skill or a trait, and the chance shown on the
  button is the chance rolled. Vows, wagers and a lady's favour on your lance
  are settled by what happens in the lists.
- **The month's other choices.** Train a skill, take a month's paid service for
  money and no renown, rest, or go to court at Kingsmead, Ambry Cross or Castle
  Brede.
- **Horse and kit.** Every bout wears your horse, and a month without a
  tourney brings him back. A tired horse rides as a worse one, which is why no
  knight rides every month. Your harness wears without an armourer.
- **Winter.**
  - The accounts: allowance, fees, keep and wages.
  - The Roll of Arms.
  - Aging, and decline after 34.
  - The winter's training.
  - A squire to take, teach for five years and knight; he joins the field as
    your friend.
  - A retinue to hire: groom, armourer, pursuivant and minstrel. A knight of
    renown is expected to arrive attended.
  - The armourers, and the horse fair.
- **Saves carry forward.** A phase-one save opens in this build, with the
  knight, his purse, his renown and his Book of Feats. The world is built around
  him from his own seed.

Phases 3 and 4 built the court (patrons, conduct, bynames, the story threads)
and the realm (ten years to a civil war, land and men, the battle and the
settlement). What comes next is in DESIGN.md §10.

## What the instruments found

### Does the choice in the lists matter?

`node sim/joust-curve.js --bouts=2000` pits a rider against every rival type at
a range of skill gaps. At 2000 bouts per cell, one standard error is 1.1 points,
so treat a gap under 2.2 as noise.

| policy | gap −4 | gap −2 | even | gap +2 | gap +4 |
|---|---|---|---|---|---|
| shield, balanced, every course | 33.5% | 42.1% | 52.3% | 63.3% | 71.8% |
| random | 30.1% | 38.5% | 46.2% | 57.0% | 65.6% |
| squire's call, rider unknown | 36.2% | 45.4% | 55.7% | 65.9% | 74.9% |
| squire's call, habits known | 37.8% | 46.7% | 58.8% | 69.0% | 77.3% |
| squire's call, herald's read | 39.6% | 48.4% | 59.3% | 70.0% | 77.5% |

- **Choosing well** is worth about 3 points over riding shield-balanced every
  course, even against a rider you know nothing about. It is worth 6 to 10
  points over choosing at random.
- **Knowing a rider's habits** is worth about 3 more. The **herald's read of his
  tells** adds another 0.5 to 2, mostly for the underdog.
- **A full read** is worth a little less than one point of skill. Two points of
  skill are worth about 10.

The first version of this table said the opposite. Scouting was worth nothing,
because the low aim was close to the best answer against everything and the helm
was never the best answer. Knowing the opponent could not change your choice,
so the information had no value. The payoff matrix was retuned so that the
opponent's seat decides your aim and his aim decides your seat:

- A pressing rider shows you his helm.
- A braced rider covers his low line.
- Rider habits were sharpened, so a hammer is really a hammer.

`sim/joust-curve.js` is the instrument that caught it, and it is the one to rerun
after any change to `src/data/joust.data.js`.

### What does a career look like? (measured at phase 2)

`node sim/run.js --runs=100 --years=8 --compare` runs 100 random knights per
joust policy, each for eight years of the full loop: calendar, road, cards,
winter, squire, retinue and fair.

| policy | bouts won | tourneys a year | King's Tourneys won | Roll rank, year 8 (median) | purse change |
|---|---|---|---|---|---|
| squire's call | 59% | 4.9 | 10% | 2nd | +£12 |
| buys every read | 60% | 4.9 | 11% | 2nd | +£12 |
| shield, balanced | 51% | 4.7 | 5% | 4th | about even |
| random | 49% | 4.8 | 5% | 4th | +£3 |

- **The arc.** A career ranks 7th on the Roll of Arms at year three (median),
  and reaches the top five around years five to seven, which is age 26 to 28.
  About half of optimal careers top the Roll by year eight. The bot plays the
  squire's call on every course and rides every month it can afford, so a human
  should take longer.
- **Knowledge now lasts.** What you learn of a rider is remembered, so buying
  every read barely beats the squire's call over a career. The read is worth
  buying against a man you have never seen.
- **Paid service** is why nobody is ruined. An early version had one career in
  five go under in its first winter: a poor start (old blood, a fallen house,
  £5) could not cover a winter's keep from local prizes. Paid service is the
  landless knight's other living, and the choice between money and fame is
  now a real one.
- **Training and horse wear were tuned by these runs.** Training was first so
  fast that lance reached 19 by year six, and every career topped the Roll.
  Horse condition turned out to be a real mechanic but a weak brake on its own.
  The field's best riders being too weak and too spread out was the larger
  cause.
- **Cards** come up about 15 times a year, two or three per tourney.

### Does conduct matter?

`node sim/run.js --runs=100 --years=8 --conduct=worldly` runs the same careers
with a knight who weighs money and renown and does not care about honour.

| character | honour, year 8 | disgraced | ruined | tourneys a year | Roll rank | purse | byname |
|---|---|---|---|---|---|---|---|
| chivalrous | 20 | 0% | 0% | 4.5 | 2nd | +£15 | Generous, Valiant |
| worldly | 4 | 10% | 4% | 3.8 | 3rd | +£10 | Valiant, Devout, Fox |

- **The worldly knight does worse on every count, including money.** A
  questioned name draws accusations at the helm-show. A disgraced one is shut
  out of the tourneys that pay.
- **The worldly knight who walks pilgrimages to mend his name ends up called
  "the Devout".** Nobody designed that; it falls out of the rules.
- **Three findings shaped the build:**
  - *Honour inflated to a median of 43* before it was given the same 0–20
    scale as a trait, so every knight was "without reproach" and the ranks
    meant nothing.
  - *Nine in ten knights were "the Valiant" by their first winter*, because
    a dozen bold answers each push valour. Starting traits are now held to
    15, bynames need 18, and traits resist moving away from the middle.
    Bynames now arrive around year five and vary with how you play.
  - *Ambry Cross finished in 2 careers of 17*, because the guilty knight
    rarely rode where you did. Once you know his name, he rides where you
    ride.

### The ten years and the war (measured at phase 4)

`node sim/run.js --runs=150 --years=13` plays careers through the war and past
it. `--conduct=worldly` swaps the honour-blind character in. `--war=careful`
makes the bot refuse risk it does not need.

**Invitations.**
- The first high tourney comes in year 2 (median) and the first King's in
  year 4.
- About 1 career in 50 never rides the King's in thirteen years.

**Standing at the outbreak (chivalrous bot, 150 careers).**

| rank | share |
|---|---|
| household knight | 24% |
| banneret | 31% |
| captain | 33% |
| councillor of war | 11% |

- 60% hold land at the outbreak.
- The median knight brings 5 men.
- **Conduct shows.** The worldly character reaches councillor half as often
  (9 against 17), and three of its careers are still hedge knights. Honour is
  a term in standing, and a disgraced name loses the invitations that build
  the rest.
- The bot is a strong jouster; a human who ignores land will stand lower. The
  first version of the standing sum made 30% of careers councillors, because
  renown counted without limit and honour counted double. Renown now counts
  only to 150, and land and men carry more weight.

**The war.**
- The will named Stane in 70% of careers, yet the bot swears to Aumbry two
  times in three.
  - *Why:* by year nine, Aumbry is the bot's patron three times as often as
    Stane (23 careers of 80 against 7), and its favour leads in 52 of 80. The
    Duke recruits harder on the circuit, and his cards come up more.
  - *Kept as the story:* Aumbry buys men while Stane has the law. It means
    siding with the likelier loser is the common case, which is where the war's
    stakes bite.
- Knights won on their side 55% of the time.
- The war ran to a second battle in 43% of careers.
- About 1 in 9 were attainted, and 1 in 20 ended in exile.
- **Death depends on how you fight:**

| how the bot fights | died in the war |
|---|---|
| bold: storms the walls, charges the ford | 13% |
| careful | 3% |

  A neutral who stays on the hill takes no risk at all. The risk is on every
  button before you press it.

### Do the other lists hold up? (measured at phase 5)

**The barriers.** `node sim/foot-curve.js --bouts=1000` runs the same
experiment as the joust curve: 1000 combats per cell, against all five
styles. One standard error is 1.6 points.

| policy | gap −4 | gap −2 | even | gap +2 | gap +4 |
|---|---|---|---|---|---|
| thrust, stand, every exchange | 40.0% | 47.7% | 56.6% | 63.6% | 72.3% |
| random | 26.7% | 34.8% | 43.4% | 50.9% | 60.6% |
| squire's call, man unknown | 42.2% | 51.6% | 62.1% | 65.0% | 74.6% |
| squire's call, habits known | 48.9% | 57.0% | 66.8% | 68.6% | 77.6% |
| squire's call, herald's read | 49.7% | 58.1% | 67.7% | 72.7% | 79.9% |

- **Knowing the man matters more on foot than in the saddle.** His habits are
  worth about 5 points here, against about 3 in the lists.
- **Choosing well** beats the fixed stroke by 2 to 5 points. Random choices
  cost 13.
- **The à outrance curve** is too slow to run in full: each reckoning looks
  nine exchanges ahead. The tests check its death roll and its outcomes
  instead.

**The mêlée.** `node sim/melee-curve.js --days=3000`: eight a side at a high
tourney, even skill.

| how the knight chooses | net a day | taken | prize |
|---|---|---|---|
| the squire's counsel | +58s | 29% | 25% |
| always the first man, to take him | +12s | 53% | 4% |
| at random | +4s | 24% | 2% |
| always the recet | 0 | 0% | 0% |

- **The choice is which man, and whether.** Weighing the openings is worth
  about 46 shillings a day over taking the first man you see.
- **Three passes of tuning:**
  - *Too harsh.* The first version took a careful knight prisoner half the
    time.
  - *Nothing to take.* A first-year knight met only veterans and could do
    nothing but rest. The man in trouble each pass fixed that.
  - *Too generous.* The man in trouble then made the mêlée pay more than the
    jousts. Ransoms were halved and the prizes cut. Before that cut, the
    money bought so much land and so many men that half the bot's careers
    were councillors of war by year ten.

**The career.** Eight-year careers bring home about £29, against £15 before
phase 5, and end with renown 123 against 88.
- **Renown fades a tenth each winter,** so a knight's renown settles near ten
  times what he earns in a year, and every point a year the new days add
  shows up tenfold.
- **Where the gap comes from:**
  - The mêlée's renown was cut to almost nothing, and it and the barriers no
    longer train the lance or the seat, which lifted the joust win rate at
    first. The joust win rate is back to 60%.
  - Most of what remains is the barriers (about 18 renown over eight years),
    the Great Pas, and money buying better horses and harness sooner.
- **Standing at the outbreak,** 100 careers of thirteen years:

| rank | before phase 5 | now |
|---|---|---|
| household knight | 24% | 13% |
| banneret | 31% | 27% |
| captain | 33% | 35% |
| councillor of war | 11% | 25% |

  The new days' money becomes land and men. That is the path the design
  intends, so the rank thresholds are unchanged.
- **The bot is a strong player,** and a human will gain less. Renown's scale
  is marked for the balance phase.

### A life (measured at phase 6)

`node sim/run.js` now also reports the Swan, vows, the fairs, the war's months,
the head of the Roll, and the ending the heralds would write. Each run is 100
careers.

**The ending each career would get.** For a career still in progress, this is
the headline if the knight retired at the end of the run.

| run | the endings |
|---|---|
| 8 years, chivalrous | full Book of Feats 44, quiet 25, Champion of the Realm 17, Swan 8, lord 6 |
| 13 years, chivalrous, careful in war | Swan 62, Champion 13, Feats 10, lord 5, exiled 5, Kingmaker 3, dead 2 |
| 13 years, worldly, bold in war | disgrace 33, Champion 21, dead 19, Feats 12, lord 5, Kingmaker 4, exiled 3, ruined 2 |
| 25 years, chivalrous, careful, retiring at 40 | Swan 91, exiled 5, Champion 2, dead 2 |

- **The Company of the Swan** is what an honourable knight gets for a long
  career.
  - In thirteen-year careers, 65 of 100 become companions. The median year is
    the twelfth, and a knight who stands wins about half the time.
  - The worldly knight is never heard: his honour keeps him off the list.
  - The table at Candlemas typically moves the chance 10 to 15 points.
- **Three tuning passes on the Swan.** The first version elected the bot in 95
  of 100 careers, by the tenth year. Three things caused it:
  - *A split vote.* A knight sworn to nobody took every house's second choice,
    while the field's candidates split by house.
  - *One-sided terms.* Only you were credited with honour, friends and favour.
  - *Too many empty stalls.* The war was killing companions.

  Four changes fixed it:
  - The field's candidates are now credited with those terms at a typical
    value.
  - Renown counts only to 60, and years of knighthood count.
  - The companions keep their oath and stay out of the battle.
  - Deaths start at 45.
- **Vows:** about half are kept. The bot makes the lances vow each winter
  and keeps it 53% of the time.
- **The fairs.**
  - *The popinjay:* the bot wins 3 to 9%. The guild shoots better than a
    gentleman, and its master shoots at the bird every round.
  - *The Downs Race:* the bot wins 25 to 35%, rising as its horses get better.
    Each plan is best for some horses: the inside line for a poor horse, the
    late run for a middling one, and going from the front for the best.
- **The war's months.** The worldly knight, bold in the war, rides with the
  army about 7 months a career, and 8 in 100 of those careers die of it. The
  chance of death is on the button every time.
- **The secret love** is fulfilled only by waiting: the widow's letter comes
  from the ninth year, to a knight who kept faith. In thirteen-year careers,
  30 of 33 honourable knights marry her, against 7 of 33 worldly ones.
- **Not fixed: the Roll.** After the war the knight outgrows the field. The
  median rank at thirteen years is first, and 85 of 100 careers head the Roll
  at least once. This is why Champion of the Realm needs three winters at the
  head of the Roll and a King's Tourney won. Renown's scale is the first job
  of the balance phase.

## The instruments

There are two separate things, answering two different questions (the same
split as Centennial Farm).

**Is it true?** Run `node --test "test/*.test.js"`. It asserts what cannot be
true:

- The preview odds are exactly the resolver's odds when you hold the read. This
  is checked by summation, and again by running the resolver 40,000 times and
  counting.
- Every bout ends with exactly one winner, within the ordinance.
- A tourney has one champion and every bout in it was ridden.
- The purse moves only through the ledger.
- Every creation effect targets a real field and is the change it describes.
- No set of answers builds a knight who cannot ride.
- A seed plus a sequence of choices reproduces a career exactly across a save.
- Every card is written in the engine's vocabulary. Every card can come up for
  some knight, and the check chance shown is the chance rolled.
- The calendar has the same shape every year. Every town is reachable. The
  heralds admit by the rules they state.
- Winter's accounts are the purse's change. A phase-one save loads and plays on.
- Eight-year careers leave nothing impossible behind.
- The great tourneys admit by the letters the heralds describe. A letter
  stands once sent, and a divided realm bars its rival's men, from the field
  as well.
- Tension follows its schedule. Every peace beat comes once, in its month. The
  king dies in the tenth year of every career. The war calendar keeps only the
  towns' jousts.
- A battle is won, a knight dies, and a knight is taken at the chances the
  button shows, counted over 400 battles. The second battle always decides.
- The settlement pays by rank, forfeits what was held of the loser, and ends
  the attainted in a paid pardon or exile. Oaths cost what they say.
- Land comes from patrons as stated, and men are kept only as land allows.
- A phase-three save opens in the realm and plays on into the war.
- Every tier runs its days in order, and the book tells all of them. You may
  stand down from any day but the jousts you came for.
- A mêlée engagement comes out at the odds its button shows (5000 draws per
  case). Men riding with you take the captures meant for you. Ransoms go
  through the ledger.
- Every exchange at the barriers sums to one. Every combat ends with one
  winner inside its ordinance. With the herald's read, the preview is the
  truth.
- The Great Pas comes in the seventh year, held by the first lance of the
  Roll.
- Beaten à outrance, a knight dies at the chance the accusation showed. Won,
  the man of Ambry Cross is at your mercy and the master's name is cleared.
- A phase-four save opens in the middle of a tourney and plays on.
- The Company holds 24 stalls, each held once. The chapter fills every empty
  one, and the same winter votes the same way. A table never lowers the
  chance. A companion who loses his honour is put out. No companion falls in
  the war.
- Every vow can be made, and is judged from the year's Book of Feats. A vow
  of mercy is broken by a ransom and counts for nothing untested.
- The popinjay's shown chance is the one rolled. Waiting for a lull never
  makes a shot worse, and never makes the bird safer.
- The race is a true distribution: every runner's chance of winning sums to
  one. A plan's shown chance matches 4000 races run from the same draws.
- The chance of death on campaign is the one on the button. Seeing to your
  lands keeps the raiders off the rents.
- A knight retires from 34, and must at 45. Every epilogue and obituary is
  written in full, with no gaps or stray braces.
- A phase-five save opens with a Company and a Book of Lothmere, and plays
  through its winter.

**Is it balanced?**

```
node sim/joust-curve.js --bouts=2000     # does choosing matter; is knowing worth paying for
node sim/foot-curve.js --bouts=1000      # the same question at the barriers
node sim/melee-curve.js --days=3000      # and in the mêlée
node sim/run.js --runs=100 --compare     # eight-year careers, by policy
node sim/run.js --years=25 --retire=40   # whole lives: the Swan, vows, fairs, endings
                                         # (also --war=careful|bold, --conduct=worldly, --vow=none|<id>)
node tools/smoke.mjs                     # drive the real page at phone width
node tools/check-bundle.mjs              # does the single file work from disk
```

`sim/run.js` refuses to report on a career that never reached a winter, entered
no tourney, fought no bout, ran no course, or met no card in two years. A harness that silently plays nothing reports green on
everything.

## Layout

```
src/engine/   pure, deterministic, no DOM
  joust.js      THE odds (strikeOdds), habits, the course, the bout, the squire's reckoning
  foot.js       the barriers: THE odds (footOdds), styles, the exchange, both ordinances, the reckoning
  melee.js      the mêlée: THE odds (engageOdds), openings, passes, ransoms, the squire's counsel
  derive.js     every number the lists screen shows, from joust.js
  tourney.js    the road, arrival, the draw, rounds, the days after, prizes, the ledger, trials
  season.js     the months and winter: every action a player can take
  calendar.js   the year's tourneys and the roads
  realm.js      the succession: tension, balance, invitations, land, standing, the war, the settlement
  court.js      patrons, conduct, bynames, the story threads
  field.js      the 48 knights: careers, brackets you do not ride, regard, the Roll
  cards.js      the card engine: conditions, casting, checks, effects
  knight.js     creation: answers in, knight out, and the lines that describe it
  order.js      the Company of the Swan: stalls, deaths, eligibility, the vote and its reckoning
  vows.js       vows on the swans, judged from the Book of Feats
  fair.js       the popinjay (THE odds: popinjayOdds) and the Downs Race (finishChances)
  ending.js     retirement, the endings, the epilogue and the obituary
  lore.js       the Book of Lothmere, the chronicle, letters from home
  herald.js     the course called, and the Book of Feats entry
  heraldry.js   arms: generated, blazoned, drawn as SVG
  state.js      new career, the save contract (the-lists.save.v1)
  rng.js        named deterministic streams (from Centennial Farm)
src/data/      logic-free tables: creation, joust, tourney, household, field, world,
               names, court, realm, lore, life, and the cards themselves
src/ui/        the screens; reads the engine, computes nothing
sim/           reference bot, career runner, joust curve
test/          invariants
tools/         bundler, icon, browser smoke test, bundle check
```

The rules are carried over from Centennial Farm:

1. **One derivation, not two.** The odds the player reads and the odds the
   course resolves on come from one function.
2. **Nothing renders silently empty.** An empty panel says why it is empty and
   what would fill it.
3. **The save key is a contract.** `the-lists.save.v1` has a version number.
   Migrations go in `migrate()`.

## Sources

The kingdom of Lothmere is fictional. Its tourney is modelled on c.1430–1470
Burgundy, France and England.

- **Scoring** is modelled on John Tiptoft's ordinances for jousts of peace (1466).
- **The heralds' role** in proclaiming, recording and judging comes from René
  d'Anjou's *Traité de la forme et devis d'un tournoi* (c.1460).
- **The pas d'armes and vows** come from Jacques de Lalaing's *Fontaine des
  Pleurs* (1449–50) and Suero de Quiñones's *Paso Honroso* (1434).
- **Vows made on birds at a feast** come from the Feast of the Swans (1306),
  where Edward I's knights vowed on two swans, and the Feast of the Pheasant
  at Lille (1454).
- **The Company of the Swan** is modelled on the Order of the Garter: a fixed
  number of stalls, with vacancies filled by the companions' nominations and
  the sovereign's choice. It also borrows the Golden Fleece's rule that
  companions may not bear arms against one another, and the ritual of
  degrading a companion by throwing his helm down.
- **The popinjay** is the shoot of the crossbow guilds of the Low Countries
  and northern France. The King of the Popinjay held his title for the year.
- **The Downs Race** is loosely after the horse-copers' races at medieval
  horse fairs such as Smithfield's, described by William FitzStephen (c.1174).
- **The mêlée ransom economy** comes from the *Histoire de Guillaume le
  Maréchal*.
- **Money** is reckoned in pounds, shillings and pence, and prices are rounded to
  what a game needs.
