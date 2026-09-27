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

Phase 3 brings the court properly: factions and patrons with obligations, the
herald's judgement of conduct, and the first story threads the flags already
record. The rest is laid out in DESIGN.md §10.

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

**Is it balanced?**

```
node sim/joust-curve.js --bouts=2000     # does choosing matter; is knowing worth paying for
node sim/run.js --runs=100 --compare     # eight-year careers, by policy
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
  derive.js     every number the lists screen shows, from joust.js
  tourney.js    the road, arrival, the draw, rounds, prizes, the ledger, for every tier
  season.js     the months and winter: every action a player can take
  calendar.js   the year's tourneys and the roads
  realm.js      the succession: tension, balance, invitations, land, standing, the war, the settlement
  court.js      patrons, conduct, bynames, the story threads
  field.js      the 48 knights: careers, brackets you do not ride, regard, the Roll
  cards.js      the card engine: conditions, casting, checks, effects
  knight.js     creation: answers in, knight out, and the lines that describe it
  herald.js     the course called, and the Book of Feats entry
  heraldry.js   arms: generated, blazoned, drawn as SVG
  state.js      new career, the save contract (the-lists.save.v1)
  rng.js        named deterministic streams (from Centennial Farm)
src/data/      logic-free tables: creation, joust, tourney, household, field, world,
               names, court, realm, and the cards themselves
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
- **The pas d'armes and vows** planned for later builds come from Jacques de
  Lalaing's *Fontaine des Pleurs* (1449–50) and Suero de Quiñones's *Paso
  Honroso* (1434).
- **The mêlée ransom economy** comes from the *Histoire de Guillaume le
  Maréchal*.
- **Money** is reckoned in pounds, shillings and pence, and prices are rounded to
  what a game needs.
