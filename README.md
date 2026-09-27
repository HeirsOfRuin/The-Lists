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
  - The high tourneys admit a knight with renown 15, or the host's favour, or
    lineage 14.
  - The King's admits one with renown 30, or renown 18 and lineage 12, or the
    Crown's favour.
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
  calendar.js   the year's tourneys, the roads, and who is admitted
  field.js      the 48 knights: careers, brackets you do not ride, regard, the Roll
  cards.js      the card engine: conditions, casting, checks, effects
  knight.js     creation: answers in, knight out, and the lines that describe it
  herald.js     the course called, and the Book of Feats entry
  heraldry.js   arms: generated, blazoned, drawn as SVG
  state.js      new career, the save contract (the-lists.save.v1)
  rng.js        named deterministic streams (from Centennial Farm)
src/data/      logic-free tables: creation, joust, tourney, household, field, world,
               names, and the cards themselves
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
