# The Lists — design

A professional tourney knight's career in a fictional kingdom at peace. You come
out of squirehood with a name, a horse and whatever your family could give you,
and you ride the circuit: jousts, mêlées, feasts, patrons, rivals and heralds who
write down everything you do. One knight's life, roughly fourteen to eighteen
seasons, from dubbing to retirement or the grave.

The working name for the kingdom is **Lothmere**. It lives in one line of
`src/data/world.data.js` and nowhere else, so it can be changed.

---

## 1. The spine

This is a sports career game, and the other systems hang off it. Politics and
romance run on a shared event-card system and a small set of reputation
numbers. They are not separate simulations. If the joust is a coin flip,
everything else is decoration around a coin flip, so the joust is built first
and has to hold up on its own.

## 2. The lists: a real decision, three courses at a time

A bout at the tilt is three courses under the event's ordinance. For each course
you choose:

| Aim | What it is | Trade |
|---|---|---|
| **Helm** | the crest and visor | hardest to land, scores double |
| **Shield** | the standard mark | the honest middle |
| **Low** | the lower shield, toward the saddle | easiest to land, best chance of bearing him down, and the only aim that can foul the tilt or strike the horse |

| Seat | What it is | Trade |
|---|---|---|
| **Brace** | set deep, lance steady | hard to unhorse, worse aim |
| **Balanced** | as taught | none |
| **Press** | lean into the blow | truer and harder strike, but more exposed, especially at the helm, and more tiring |

Stats, horse and fatigue set the odds, and **the odds are shown before you
commit**. They come from the same function that resolves the course
(`strikeOdds` in `src/engine/joust.js`). The preview cannot disagree with the
result because there is no second copy of the arithmetic.

**Opponents have habits.** Each rival has a preferred aim and seat, plus *tells*:
situational shifts such as "goes for the helm when behind" or "braces against a
stronger man". What you know about him decides whether your odds are true:

- **Nothing known.** Odds are computed against the field's usual habits, and the
  screen says so.
- **His habits.** You watched him run earlier in the day, or your lore
  recognises his arms. Odds use his base tendencies.
- **His tells.** You paid the herald for his read. Odds are exact.

Scouting is not flavour. It is the difference between a number that is right and
a number that is a guess.

### The ordinance

Scoring follows the spirit of John Tiptoft's ordinances of 1466:

- A lance broken on the body or shield scores **1**.
- A strike on the helm scores **2**.
- Bearing a man to the ground **wins the bout outright**.
- Striking the tilt costs **1**.
- Striking the horse forfeits the bout and costs honour.

Ties after three courses run up to two more. After that the heralds decide:
fewer faults, then more helm strikes, then their own judgement. A bout always
ends with exactly one winner, and there is a test for it.

### Other kinds of combat (later builds)

- **Mêlée:** team rounds, taking prisoners for ransom, and retinue size matters.
  Rough, lucrative and lower in status.
- **Foot combat at the barriers:** pas d'armes challenges.
- **À plaisance versus à outrance:** blunted weapons versus sharp ones. Rare,
  chosen and high-stakes.

## 3. Money: historically, tourneying ruined knights

Honour costs money. Money comes from winning or from a patron. Winning costs
money, and patronage costs you your independence.

- **Costs:**
  - Entry fee.
  - Lodging.
  - Lances, which are consumed.
  - The farrier.
  - Largesse to the heralds who cry your name.
  - In later builds: the jousting harness, destrier and courser, squire, groom,
    armourer, liveries and surgeon.
- **Income:**
  - Prizes.
  - In later builds: ransoms and forfeited horses from the mêlée, a patron's
    retaining fee, estate rents, wagers and a marriage settlement.
- **Lead times:** armour commissioned in winter arrives in spring, and a green
  horse takes seasons to make.
- **A snowball brake:** as renown rises, so do expected largesse, the size of
  your retinue and the quality of your challengers.

Money is held in **pence** as integers and shown as £ s d (twenty shillings to
the pound, twelve pence to the shilling). Integer pence cannot drift.

## 4. Reputation, and who judges it

- **Renown:** prowess. It decays when you stop competing.
- **Honour:** conduct. Slow to gain, fast to lose.
- **Lineage:** your ancestry. Nearly fixed. It no longer gates the elite
  events (they are by invitation, on renown or a lord's favour), but it counts
  toward standing in the realm.
- **Favour:** standing with each faction (the Crown, the two great houses, the
  Church, the Cities).
- **Six paired traits, Pendragon-style.** Each pair sums to 20 and drifts with
  what you do:
  - Valorous / Cautious
  - Generous / Grasping
  - Merciful / Ruthless
  - Pious / Worldly
  - Honest / Cunning
  - Constant / Fickle

**The heralds are the judges.** Historically they proclaimed tourneys, recorded
feats and checked proofs of noble ancestry. René d'Anjou's treatise (c.1460)
describes the helms being displayed before the event, when a lady could point
out a knight who had wronged a lady, and he was beaten for it. The herald's
**Book of Feats** is written from what actually happened, the same way the farm
game's ledger is the year it resolved. At the end of the career the book is the
epilogue.

## 5. The circuit as an institution

- **The College of Heralds** runs the calendar, licenses events and publishes a
  **Roll of Arms** ranking each season.
- **A field of about forty rival knights** have careers of their own. They age,
  get injured, marry, rise and fall.
- **Rivals remember** insults, spared ransoms and fouls.

## 6. Character creation

Six questions, and every answer has mechanical weight. It was ten until
playtesting said it was too long. Four questions now answer two things at once
(birth and family, home and horse, spurs and the parting from your master,
ambition and heart), so each answer reads as a small story. The line describing
what an answer does is **generated from its effects**, so the copy cannot promise
something the numbers do not do.

1. **Your people.** The heir of a rich house, a younger son of a famous name, an
   acknowledged bastard (whose father Aumbry owes), or the last of a fallen house
   (old blood, no coin, a dormant claim).
2. **Your country and your horse.** The March on a green colt from your
   father's herd, Kingsmead on a borrowed horse, or the Saltings on an old
   destrier from the market.
3. **Your master:** the champion, the courtier, the disgraced, the veteran or the
   pious.
4. **What he taught best:** the lance, the horse, the axe at the barriers,
   manners, or letters and heraldry. Kept on its own so you choose your build.
5. **How you parted from him, and how you won your spurs:**
   - knighted on the field, loyal;
   - knighted at his deathbed;
   - you reported him to the heralds and were dubbed with sixty others;
   - you told him to his face, and your family bought your spurs.
6. **What you want, and who waits:**
   - Champion, and nobody waits;
   - land, and a betrothal;
   - her, and a secret;
   - the Order;
   - or your master's name cleared (offered only if he was disgraced).

## 7. The season (later builds)

- **Winter:** train, commission harness and horses, court, answer your patron,
  take vows.
- **The circuit:** five to seven events chosen from the season's calendar. Each
  one runs travel, arrival and the herald's show, the lists, then the feast.
- **Season's end:** the Roll of Arms, the Book of Feats, the accounts, aging and
  healing, and plot beats.

Minor bouts can be left to the squire's judgement. The squire uses the same
best-odds rule the reference bot plays with. Tentpole events are always played.

## 8. The story

Twenty years ago a treaty ended the war your master's generation fought. The
king is aging, the succession is contested, and the great houses fight it by
proxy on the circuit.

**The war comes in year ten, in every career.** What the player controls is
where they stand when it does, not whether it comes.

- *Tension* rises on a fixed schedule, read by the rumours and the eight
  scripted beats of the ten years.
- *The balance* between Aumbry and Stane moves with who wins the great
  tourneys and what knights say and do. It decides whose name is in the will,
  and so which side the Crown's knights ride for.
- *Standing* is renown (capped), honour, lineage, land, men, service, favour,
  byname and great prizes, summed and shown term by term. It decides the
  knight's rank in the war:
  - what they bring to the field;
  - which answers are open;
  - how exposed they are;
  - what the victor gives, or the vanquished take.
- *The war* is a muster, a ford, a siege and a battle, with a second year if
  the first battle is close or an upset.
- *The settlement* rewards by rank, forfeits land held of the loser, and
  attaints. Pardon or exile follows, and the new crown holds a coronation
  tourney.

Tentpoles:

1. The provincial debut.
2. The invitation to the royal circuit.
3. A great house offers to retain you.
4. The Great Pas d'Armes.
5. An accusation, and judicial combat à outrance.
6. The succession crisis.

Between the tentpoles, content is procedural.

Endings:

- Champion of the Realm.
- Companion of the Order.
- Lord by marriage.
- Kingmaker.
- Retired with a full Book of Feats.
- Disgraced exile, or attainted exile after the war (built).
- Ruined, and selling your sword (built).
- Dead in the lists, or in the war (built).

## 9. Grounding

The kingdom is fictional. Its systems are modelled on **c.1430–1470 Burgundy,
France and England**: the tilt, the pas d'armes, chivalric orders, heralds, and
city tourneys like Lille's Épinette. The older mêlée and its ransom economy
survive as the rough, lucrative event. René's treatise is itself about the
mêlée, so this is not an anachronism.

## 10. Build phases

Phase 2 was reshaped after playing phase 1. The joust held up, but on its own
it would get old fast. So the world around it (calendar, map, travel, the
field with memory, feasts, chivalric moments, squire and household) came
before the court, and the card engine planned for phase 3 arrived here.

1. **Spine**: done.
   - RNG, save contract, character creation, the joust resolver, and one kind of
     event (a provincial tourney) played repeatedly.
   - A single-file build that works on a phone.
   - The reference bot, the progress-asserting runner, the joust-curve
     instrument and the invariant suite.
2. **The world**: done.
   - A calendar with tiers and entry rules, the map and the road.
   - The field of 48 with memory and the Roll of Arms.
   - The card engine, with 45 cards.
   - Horse condition, training, winter accounts, the squire, the retinue, the
     harness and the fair.
   - Paid service, and the migration of phase-one saves.
3. **Court**: done.
   - Patrons with fees and obligations: their tourney, their summons, and
     dismissal after two strikes.
   - The heralds' judgement: four conduct ranks on a 0–20 honour scale, and
     pilgrimage.
   - Trait-gated answers and bynames.
   - The Ambry Cross and betrothal threads.
   - House allegiance in the field.
   - Creation cut to six questions.
4. **The realm and the war**: this build. Playing phase three showed the
   story needed a spine the player could see coming, so the succession
   crisis became it.
   - Tension on a schedule, rumours, and eight beats in the ten years.
   - The balance, moved by the great tourneys, deciding the will.
   - The great tourneys by invitation, with partisan exclusion from year six.
   - Land from six sources, men-at-arms kept as land allows, and standing as a
     visible sum and rank.
   - The war with odds, death and capture on every button, then the
     settlement, pardon or exile, and the coronation tourney.
5. **Story:** the remaining tentpoles (the Great Pas, the accusation à
   outrance), the master's threads, endings, and a reachability test.
6. **Breadth, balance and polish:** mêlée and ransom, pas d'armes, vows,
   romance, heraldry in full, the Order, then ablations, verifying the
   backgrounds, the tutorial, deploying to Pages, and sources.

## 11. Rules the code is organised around (inherited from Centennial Farm)

1. **One derivation, not two.** The number shown and the number resolved come
   from the same function.
2. **Nothing renders silently empty.** An empty panel says why it is empty.
3. **The save key is a contract.** `the-lists.save.v1` carries a version number.
   Migrations go in `migrate()`.
4. **Deterministic, with named streams.** A seed plus a sequence of choices
   reproduces a career exactly.
5. **Two instruments.** `test/` asks whether something is true. `sim/` asks
   whether it is balanced, and it refuses to report on a run that did not
   progress.
