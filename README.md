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

**Play it, or install it:** https://heirsofruin.github.io/The-Lists/

The same build also comes out as an installable web app in `dist/site/`: the
page, its manifest and icons, and a service worker that keeps it for offline
play. `.github/workflows/pages.yml` deploys it to GitHub Pages on every push
to the game's branch.
- *Installing it:*
  - iPhone: open the address in Safari, then Share > Add to Home Screen.
  - Android: open it in Chrome, then the menu > Install app.

  Open it once while online, so the offline copy is kept.
- *Updates:* every push redeploys. The installed app picks up the new build
  the next time it opens with a connection.
- *Saves* live in the browser that plays them. A career in the artifact
  version, or in Safari rather than the home-screen app, does not carry over.

For development, serve the directory and open `index.html`:

```
python3 -m http.server 8000
```

## What this build is

Phase 8 is the hearth: courtship, marriage, and the titles a knight might
rise to.

- **The ladies of the realm.** Nine ladies at the start of a career, five
  kinds of match:
  - two merchants' daughters (money, little else asked);
  - two lords' daughters (a house's goodwill, and its quarrels);
  - two heiresses and two widows (a manor each; a widow chooses for herself);
  - one heiress to a barony, a ward of the Crown (her husband will be a
    lord).

  Each has her own name, house, town and age. Each has a portion, family
  terms, and a thing she values in a suitor.
- **Courting.** You meet the ladies of every town you go to.
  - *A month at her family's house:* five ways to court her (a gift, a dance,
    letters, hawking, mass). Each shows its chance and what it is worth, and
    the way she values is worth half again. The same courtesy twice is worth
    less.
  - *Her colours:* at a tourney she attends, ask for her sleeve. Every bout
    you win in it she sees; a prize won in it counts double; beaten in the
    first round, she sees that too.
- **Her family's terms and her own mind.** The Hearth tab shows both as a
  checklist:
  - renown, honour, lineage;
  - her house's favour;
  - the Crown's leave for its ward, or the price of her marriage;
  - her own affection.
- **A rival.** Every lady has another suitor from the field, whose suit
  grows each winter. If it reaches its mark while it stands above her
  affection for you, her family gives her to him, and another lady comes of
  age.
- **Marriage.**
  - *The wedding* is at Candlemas: the dowry is in the winter's accounts,
    with her manors and her house's goodwill.
  - *Her years:* she keeps your household (£2 a winter) and the rolls of
    your manors (£1 a manor), and writes to you.
  - *Children* are born in the winters, and named in the epilogue: the
    eldest son inherits.
  - *A danger,* small and historical: a wife may die in childbed.
  - *Without her family's leave:* a lady who loves you enough will marry you
    anyway, at the cost of honour and the dowry.

  The betrothal and the secret love of your story now end in the same
  marriages.
- **Titles.** A knight may be made a baron, Lord of his seat, three ways:
  - **By the war.** The new crown ennobles the councillors of war who fought
    in the deciding battle, and the captains who led the charge there and hold
    two manors. A knight who kept to the reserve is not one of them.
  - **By petition,** in any winter of peace. It needs three manors, the
    Crown's favour at 10, honour 12 and renown 50. The council answers at
    Candlemas at the chance shown; the £20 in fees is paid only if it says
    yes.
  - **By marriage** to the Crown's ward, by right of your wife.

  A lord is bidden to every great tourney and counts for more in the realm.
  He keeps a lord's household, and answers the great council at Kingsmead
  each April (or the Crown remembers). An attainted lord loses his title.
  "A baron of the realm" heads the epilogue.

Phase 7 was balance and polish:
- **Renown's scale.** Renown fades a tenth each winter, and a quarter of
  whatever is over 100, for every knight.
- **The field keeps up.** Its famous knights buy better horses, and in the
  tourneys you do not ride, it earns renown from the mêlée and the barriers
  as you do.
- **An instrument for the backgrounds.** It checks that each creation answer
  does what it says.
- **First-time hints**, one for each kind of screen.
- **An installable web build for GitHub Pages**, playable offline.

The measurements are below, under "Renown and the Roll" and "The backgrounds".

Phase 6 was a life: how a career ends, and what fills it besides the lists.
It followed a rewrite of character creation and a written history for the
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
- **The Roll (addressed in phase 7; see "Renown and the Roll").** After the
  war the knight outgrew the field. The
  median rank at thirteen years is first, and 85 of 100 careers head the Roll
  at least once. This is why Champion of the Realm needs three winters at the
  head of the Roll and a King's Tourney won. Renown's scale is the first job
  of the balance phase.

### The hearth and titles (measured at phase 8)

The bot courts the best match it can reach. It rides in her colours when she
is at a tourney, courts her in months with no great tourney to ride, and asks
when her family's terms are met. It petitions whenever it may.

| run, 100 careers | married | titled | the endings |
|---|---|---|---|
| 8 years | 57% (median year 5) | 3% | Feats 40, lord 21, quiet 20, Champion 10, Swan 6, peer 3 |
| 13 years, careful in war | 96% | 19%: petition 16, marriage 3 | Swan 33, peer 19, Champion 15, exiled 13 |
| 13 years, bold in war | 96% | 39%: war 30, petition 6, marriage 3 | peer 39, Swan 20, dead 20, Champion 7 |
| 13 years, worldly, bold in war | 35% | 0% | disgrace 39, dead 21, Champion 12 |
| 25 years, careful, retiring at 40 | 98% | 28%: petition 24, marriage 4 | Swan 51, peer 26, exiled 13 |

- **Whom the bot marries.** A widow most often (37%), the secret love of its
  story (30%), its story's betrothal (13%), then merchants' daughters and
  heiresses. The ward, the hardest, goes in 3–4%.
- **Children:** about two per marriage by the thirteenth year, three by the
  twenty-fifth.
- **The rivals** marry off about eleven ladies in thirteen years. You cannot
  wait for every lady.
- **The worldly knight** marries a third as often. His honour fails every
  family's terms but the merchants' and the widows'. He is never ennobled:
  the petition needs honour 12, and too few worldly knights rise to
  councillor and fight on the winning side.
- **Titles depend on the role in the war.** The first version ennobled every
  councillor and landed captain on the winning side, which made the barony
  the commonest ending (45% at thirteen years). Now only those who fought in
  the deciding battle are ennobled. The bold knight is twice as often a
  baron, and four times as often dead.

### Renown and the Roll (measured at phase 7)

Phase 6 left the knight outgrowing the field after the war. The median
renown at thirteen years was 199, while the field's best stayed near 120. A
breakdown of where each point came from found three causes, and fixed each:

- **The field's horses never improved.** The player bought a quality-17 horse
  by midcareer. The field's best rode what they started on. Now a knight's
  horse comes up a step a winter toward what his renown can pay for.
- **The field earned only from the jousts** in the tourneys you did not ride.
  Now it earns the mêlée's prize and blows, and fights out the barriers, by
  the same table as yours.
- **Fame did not saturate.** Renown fades a tenth each winter, and now a
  quarter of whatever is over 100 fades too. The rule is the same for every
  knight and is shown on the winter screen.

| | before | after |
|---|---|---|
| median renown, 8 years | 129 | 110 |
| median renown, 13 years | 199 | 137 |
| median renown, 25 years | 307 | 147 |
| you and the field's best in years 6–10, near-perfect play | 116 v 133 | 104 v 112 |
| you and the field's best in years 11–16 | 201 v 133 | 139 v 107 |

- **A player who never decides at the tilt** (shield, balanced, every course)
  is typically third on the Roll at eight years, and heads it in a third of
  careers.
- **Still true:** over thirteen years, most players head the Roll at least
  once. That is 83% for the passive player and 90% for the bot. A long career
  at the top is supposed to get there, but not always and not every year. A
  "marked man" rule, where the field rides harder at the head of the Roll, is
  listed in DESIGN.md §10 if play shows it is still too easy.
- **Two changes to the reference bot came out of this,** because the
  backgrounds instrument was measuring the bot's mistakes:
  - It no longer rides the great tourneys before it has renown 12.
  - A knight of a fallen house now pleads his claim at Kingsmead.

### The backgrounds (measured at phase 7)

`node sim/verify-backgrounds.js --runs=40` plays each creation answer on the
same 40 seeds, with the other answers drawn as usual. It compares each answer
with its question's average at year 8, and reports only differences above two
standard errors.

- **The first pass found real imbalances:**
  - *Boyhood:* the March was worth +19 renown and +6% of bouts won, and
    Kingsmead −13.
  - *Blood:* the fallen house was worth −19 renown and −£19, and the
    bastard +13.
- **Five changes:**
  - *The March:* Seat +2 became +1, and its colt grows to 15.
  - *Kingsmead:* Lance +1, from the tiltyards.
  - *The coast:* its old horse is two years younger.
  - *The bastard:* loses Seat +1.
  - *The fallen house:* Lance +1, and £6 instead of a debt. Its old blood
    now brings letters to the high tourneys (lineage 16).
- **After them,** at year 8:

| question | spread in renown | notes |
|---|---|---|
| Blood | −13 to +6 | the heir's £30 becomes land by year 13 (+1.1 manors) |
| Boyhood | −2 to +8 | |
| Squire | −7 to +2 | the pious master gives honour and the Church's favour, not renown |
| Learning | +7 for the lance | the others change what they teach and nothing else measured |
| Spurs | +6 for the knight who confronted his master | |
| The road | ±0 renown | the betrothed knight's marriage is +11 standing and +0.7 manors |

- **The fallen house is the harder start, on purpose.** Its old blood and
  clean name count in the Swan's vote and bring the letters, and 18 of 40
  such knights win back the family manor by year 8 (most in years 5–6). The
  months spent pleading the claim cost bouts and practice. At thirteen years
  it trails by 8 renown, about 6%.
- **Social answers measure as nothing here.** Courtesy, lore, the courtier and
  the pious master act through cards, the court and the Swan, which these
  metrics do not see.

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
- Renown fades by the stated rule, never reversing an order, and the same for
  every knight.
- Fame buys the field better horses. A tourney you do not ride pays the field
  for its mêlée and barriers, reproducibly.
- Every first-time hint is written, and brief.
- The realm holds nine ladies of five kinds, each with a town and a living
  rival. A knight meets those of the towns he has been to.
- Every way of courting shows the chance it rolls, and a courtesy repeated is
  worth less.
- Her family answers by its stated terms, and the wedding is at Candlemas,
  with the dowry in the accounts. The Crown's ward is bought or granted, and
  her husband is a lord. Marrying without leave costs the dowry and honour,
  and never takes a ward.
- Her colours move her affection by the stated amounts.
- A rival at his mark marries her, unless she loves you more. Another lady
  comes of age in her place.
- A marriage's years bring her household, her stewardship and children. The
  story's betrothal card makes her your wife, and breaking it frees you.
- A petition: the terms, none in a war, the chance shown, and the fee only if
  granted. The new crown ennobles a councillor who fought; an attainted lord
  loses his title. The great council: attended, favour; missed, favour lost.
- A lord's epilogue is headed by his title, and every family line is written
  in full. A phase-six save opens with the ladies, and a married knight keeps
  his wife.

**Is it balanced?**

```
node sim/joust-curve.js --bouts=2000     # does choosing matter; is knowing worth paying for
node sim/foot-curve.js --bouts=1000      # the same question at the barriers
node sim/melee-curve.js --days=3000      # and in the mêlée
node sim/run.js --runs=100 --compare     # eight-year careers, by policy
node sim/run.js --years=25 --retire=40   # whole lives: the Swan, vows, fairs, endings
node sim/verify-backgrounds.js --runs=40 # does each creation answer do what it says
                                         # (also --war=careful|bold, --conduct=worldly, --vow=none|<id>)
node tools/smoke.mjs                     # drive the real page at phone width
node tools/check-bundle.mjs              # the single file from disk; the Pages build, installed and offline
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
  hearth.js     the ladies of the realm, courtship, her colours, marriage, children
  title.js      barony: by the war, by petition, by marriage; the great council
  checks.js     THE chance of any skill or trait check (cards and courtship alike)
  lore.js       the Book of Lothmere, the chronicle, letters from home
  herald.js     the course called, and the Book of Feats entry
  heraldry.js   arms: generated, blazoned, drawn as SVG
  state.js      new career, the save contract (the-lists.save.v1)
  rng.js        named deterministic streams (from Centennial Farm)
src/data/      logic-free tables: creation, joust, tourney, household, field, world,
               names, court, realm, lore, life, and the cards themselves
src/ui/        the screens; reads the engine, computes nothing
sim/           reference bot, career runner, the curves, the backgrounds check
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
