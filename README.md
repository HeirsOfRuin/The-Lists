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

Phase 1 of 6 is the spine:

- **Character creation.** Ten questions: birth, family advantage, province,
  master, what he taught, your spurs, the incident, your horse, your heart, and
  your ambition. The line under each answer that says what it does is generated
  from the answer's effects, and a test holds the two to each other.
- **The joust.** Three courses under the Constable's Ordinance. For each course
  you choose an aim (helm, shield or low) and a seat (brace, balanced or press).
  The odds are shown before you commit, along with the squire's reckoning of
  your chance to carry the bout.
- **Rivals with habits.** Six rider types, each with tells, which are situational
  shifts in what he does. You learn a rider's habits by watching him ride, or
  from your lore. The herald's read tells you his tells.
- **The provincial circuit.** An eight-knight bracket with an entry fee, lodging,
  lances, largesse, prizes and wounds. The herald writes a Book of Feats entry
  after each tourney. There are five tourneys to a season, and the knight ages
  each winter. A knight who cannot pay to ride is ruined.

Phase 2 adds the season's economy (upkeep, harness, horses with lead times), the
persistent field of rivals and the Roll of Arms, and injury and aging with
teeth. The rest is laid out in DESIGN.md §10.

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

### What does a career on the provincial circuit look like?

`node sim/run.js --runs=200 --tourneys=25 --compare`: 200 random knights per
policy, 25 tourneys each (five seasons).

| policy | bouts won | tourneys won | ruined | median purse change |
|---|---|---|---|---|
| squire's call | 61% | 23% | 4.0% | +£18 |
| buys every read | 63% | 25% | 4.5% | +£16 |
| shield, balanced | 56% | 17.5% | 8.0% | +£9 |
| random | 51% | 13% | 9.0% | +£3 |

- A new knight is somewhat better than the average provincial rider, which is
  right for a debut tier.
- Buying the herald's read for every bout wins more bouts but earns less. The
  read is worth buying against a man you have never seen, and rarely after
  you have watched him.
- The provincial circuit alone is too comfortable over five seasons, because a
  season has no upkeep yet. Adding upkeep is the job of phase 2, and this table
  is the baseline it should move.

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

**Is it balanced?**

```
node sim/joust-curve.js --bouts=2000     # does choosing matter; is knowing worth paying for
node sim/run.js --runs=200 --compare     # careers, by policy
node tools/smoke.mjs                     # drive the real page at phone width
node tools/check-bundle.mjs              # does the single file work from disk
```

`sim/run.js` refuses to report on a career that entered no tourney, fought no
bout or ran no course. A harness that silently plays nothing reports green on
everything.

## Layout

```
src/engine/   pure, deterministic, no DOM
  joust.js      THE odds (strikeOdds), habits, the course, the bout, the squire's reckoning
  derive.js     every number the lists screen shows, from joust.js
  tourney.js    arrival, the draw, rounds, prizes, the ledger
  knight.js     creation: answers in, knight out, and the lines that describe it
  herald.js     the course called, and the Book of Feats entry
  heraldry.js   arms: generated, blazoned, drawn as SVG
  state.js      new career, the save contract (the-lists.save.v1)
  rng.js        named deterministic streams (from Centennial Farm)
src/data/      logic-free tables: creation, joust, tourney, names, world
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
