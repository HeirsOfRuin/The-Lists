// The reference player. It does not need to play WELL; it needs to play
// CONSISTENTLY, so two runs are comparable, and it must touch every system a
// player can: the calendar, the road, the feast, the lists, the moments,
// winter, the squire, the retinue, the fair.
//
// Joust policies (for the curve and for careers):
//   squire   — the squire's call every course (the best-odds rule the UI offers)
//   read     — buys the herald's read of every opponent it can afford, then the squire's call
//   shield   — shield, balanced, every course: the player who never decides
//   random   — any of the nine, uniformly

import { CHOICES, choiceByKey } from '../src/engine/joust.js';
import { squireCall, footSquireCall } from '../src/engine/derive.js';
import { currentBout, buyHeraldRead, canEnter, STAGE, meleeMenOption } from '../src/engine/tourney.js';
import { squireCounsel } from '../src/engine/melee.js';
import {
  monthOptions, rideTo, enter, withdraw, ride, onward, leave, train, serve, answer, isFree, PHASE,
  summonsOption, answerSummons, pilgrimage, visitCourt, courtOptions,
  setFocus, setSquireFocus, takeSquire, dubSquire, hire, buyHarness, buyHorse, keepBorrowedHorse,
  borrowedHorsePrice, horseTradeIn, endWinter,
  rideDay, standDownDay, meleeTurn, ransom, exchange, footOnward, mercy,
  shoot, race, leaveFair, campaignOption, campaign, landsOption, lookToLands, shrineVowOpen,
  vow, feastCompanions, hireArcher, retireNow,
} from '../src/engine/season.js';
import { popinjayPreview, raceOdds } from '../src/engine/fair.js';
import { reckonChapter } from '../src/engine/order.js';
import { vowOptions } from '../src/engine/vows.js';
import { retirement } from '../src/engine/ending.js';
import { ARCHERS, ORDER, POPINJAY } from '../src/data/life.data.js';
import { cardById, holds } from '../src/engine/cards.js';
import { oathTerms, riskOf, battlePreview, companyMax, archersMax } from '../src/engine/realm.js';
import { COMPANY } from '../src/data/realm.data.js';
import { buyManor, hireMan } from '../src/engine/season.js';
import { isPatronTourney, isDisgraced, canPilgrimage } from '../src/engine/court.js';
import { TIER_ORDER } from '../src/data/tourney.data.js';
import { HARNESS, SQUIRE } from '../src/data/household.data.js';

export const POLICIES = ['squire', 'read', 'shield', 'random'];

export function chooseCourse(state, policy, rng) {
  switch (policy) {
    case 'squire':
    case 'read':
      return squireCall(state);
    case 'shield':
      return choiceByKey('shield/balanced');
    case 'random':
      return rng.pick(CHOICES);
    default:
      throw new Error(`Unknown policy: ${policy}`);
  }
}

// A crude reading of what an answer is worth, from its effects. Consistent,
// which is all a reference player needs to be. Two characters: the
// chivalrous knight weighs honour; the worldly one does not care about it.
let conduct = 'chivalrous';
export function setConduct(c) { conduct = c; }
// In the war: 'bold' takes a 1% chance of death for about half a point of
// renown; 'careful' wants ten times as much.
let war = 'bold';
export function setWar(w) { war = w; }
const perilWeight = () => (war === 'careful' ? 800 : 80);
// The vow it makes each winter ('none', or a vow id), and the age it hangs up its lance.
let vowPolicy = 'lances';
export function setVow(v) { vowPolicy = v; }
let retireAge = 99;
export function setRetireAge(a) { retireAge = a; }

function worth(state, e = {}) {
  let v = 0;
  const honourWeight = conduct === 'worldly' ? -0.5 : 1.5;
  v += (e.renown || 0) * 2 + (e.honour || 0) * honourWeight + (e.purse || 0) / 240;
  for (const x of Object.values(e.favour || {})) v += x * 0.3;
  for (const x of Object.values(e.regard || {})) v += x * 0.15;
  if (e.intelField) v += e.intelField * 0.5;
  if (e.intel) v += 0.5;
  if (e.wound) v -= 2;
  if (e.fatigue) v -= e.fatigue * 0.5;
  if (e.travelDays) v -= e.travelDays * 0.3;
  if (e.largesse) v -= e.largesse * 10;
  if (e.serve) v += 4;
  if (e.clearMaster) v += 10;
  if (e.reveal) v += 2;
  if (e.heart === 'married') v += 3;
  // The realm: swear where your bread is, and fight where you can live.
  if (e.oath) v += oathWorth(state, e.oath);
  if (e.lean) v += e.lean * 0.5;
  if (e.manor) v += 6;
  if (e.peril) v -= riskOf(state, e.peril) * perilWeight();
  if (e.battle) {
    const b = battlePreview(state, e.battle);
    v += (b.win ?? 0.5) * 6 - b.peril * perilWeight();
  }
  if (e.pardon === 'pay') v += 10;
  if (e.pardon === 'mercy') v += 8;
  if (e.pardon === 'exile') v -= 40;
  return v;
}

/** The bot's oath: its patron's house, else the house that likes it better, else the king's will. */
function oathWorth(state, which) {
  const t = oathTerms(state, which);
  let v = t.turncoat ? -3 : 0;
  if (t.breaksService) v -= 4;
  const p = state.patron?.id;
  const a = state.favour.aumbry || 0;
  const b = state.favour.stane || 0;
  let want;
  if (p === 'aumbry' || p === 'stane') want = p;
  else if (p === 'crown') want = state.realm.will || 'crown';
  else if (Math.abs(a - b) >= 3) want = a > b ? 'aumbry' : 'stane';
  else if (state.realm.will) want = state.realm.will;
  else want = state.seed % 3 === 0 ? 'crown' : state.seed % 3 === 1 ? 'aumbry' : 'stane';
  const now = t.oath === 'crown' ? (state.realm.will || 'crown') : t.oath;
  if (now === want) v += 4;
  return v;
}

export function answerPolicy(state) {
  const inst = state.pending.inst;
  const card = cardById(inst.id);
  let best = null;
  card.choices.forEach((ch, i) => {
    if (!holds(state, ch.when, inst.ctx)) return;
    const v = ch.check ? 0.5 * worth(state, ch.success.effects) + 0.5 * worth(state, ch.failure.effects) : worth(state, ch.effects);
    if (!best || v > best.v) best = { i, v };
  });
  return best.i;
}

/** Winter upkeep the bot keeps in hand before riding anywhere. */
function reserve(state) {
  return 10 * 240 + state.retinue.length * 480;
}

function chooseMonth(state) {
  // A vow to walk to the shrine is kept in the summer.
  if (shrineVowOpen(state) && state.month >= 7 && state.purse > 4 * 240) return { kind: 'pilgrimage' };
  // The war's months: see to the lands once, and otherwise ride with the army.
  const lands = landsOption(state);
  if (lands?.open && state.month >= 6) return { kind: 'lands' };
  const camp = campaignOption(state);
  if (camp?.open && camp.peril * perilWeight() < 4) return { kind: 'campaign' };
  // The patron's summons comes first: missing it is a strike.
  const summons = summonsOption(state);
  if (summons && summons.open) return { kind: 'summons' };
  // So does his tourney, when it is this month.
  const his = monthOptions(state).find((o) => o.open && state.patron && isPatronTourney(state, o.cal));
  if (his) return { kind: 'ride', id: his.cal.id };
  // A disgraced name is mended before anything else.
  if (isDisgraced(state) && canPilgrimage(state) && state.purse > 4 * 240) return { kind: 'pilgrimage' };
  // Short of next winter's keep: earn it first.
  if (state.purse < reserve(state) * 0.6) return { kind: 'serve' };
  // Once a year, in a quiet month, go to court where favour is best.
  if (!state.patron && state.renown >= 10 && state.month === 4 && !monthOptions(state).some((o) => o.open && o.cal.tier !== 'local')) {
    const c = courtOptions(state).filter((o) => o.open).sort((a, b) => (state.favour[b.faction] || 0) - (state.favour[a.faction] || 0))[0];
    if (c) return { kind: 'court', town: c.town };
  }
  const opts = monthOptions(state).filter((o) => o.open && state.purse - o.total >= reserve(state) * 0.4);
  if (opts.length) {
    // Highest tier the knight has a fair chance in: never local once famous.
    opts.sort((a, b) => TIER_ORDER.indexOf(b.cal.tier) - TIER_ORDER.indexOf(a.cal.tier));
    const pick = opts.find((o) => !(o.cal.tier === 'local' && state.renown >= 30)) || null;
    if (pick) return { kind: 'ride', id: pick.cal.id };
  }
  const k = state.knight.stats;
  return { kind: 'train', skill: k.lance <= k.seat ? 'lance' : 'seat' };
}

function winter(state) {
  const w = state.winter;
  const k = state.knight.stats;
  setFocus(state, k.lance <= k.seat ? 'lance' : 'seat');
  if (state.squire) {
    setSquireFocus(state, state.squire.lance <= state.squire.seat ? 'lance' : 'seat');
    if (state.squire.years >= SQUIRE.knightAt) dubSquire(state);
  } else if (w.candidates.length) {
    const i = w.candidates.findIndex((c) => c.origin === 'lordsSon');
    takeSquire(state, Math.max(0, i));
  }
  if (state.horse.borrowed && state.purse > borrowedHorsePrice(state) + reserve(state)) keepBorrowedHorse(state);
  if (state.renown >= 15 && !state.retinue.includes('groom') && state.purse > 20 * 240) hire(state, 'groom');
  if (state.renown >= 30 && !state.retinue.includes('armourer') && state.purse > 30 * 240) hire(state, 'armourer');
  const better = HARNESS.market.find((h) => h.quality > state.harness.quality && state.purse - h.price > reserve(state) * 2);
  if (better) buyHarness(state, better.id);
  const horse = [...w.horses].reverse().find((h) => h.quality > state.horse.quality + 1
    && state.purse + horseTradeIn(state) - h.price > reserve(state) * 2);
  if (horse) buyHorse(state, horse.id);
  // Land when it can be afforded twice over; men to fill it.
  if (w.manor && state.purse - w.manor.price > reserve(state) * 2) buyManor(state);
  while (state.year >= 3 && state.company < companyMax(state) && state.purse > reserve(state) * 2 + COMPANY.wage * 3) {
    if (!hireMan(state).ok) break;
  }
  while (state.year >= 5 && (state.archers || 0) < archersMax(state) && state.purse > reserve(state) * 2 + ARCHERS.wage * 4) {
    if (!hireArcher(state).ok) break;
  }
  // The Company of the Swan: a table at Candlemas when it moves the vote.
  const plain = reckonChapter(state);
  if (plain && state.purse > reserve(state) + ORDER.table.cost) {
    const fed = reckonChapter(state, { table: true });
    if (fed.chance - plain.chance > 0.04) feastCompanions(state);
  }
  // A vow on the swans, if it has one it can make.
  if (vowPolicy !== 'none') {
    const open = vowOptions(state).filter((v) => v.open);
    const want = open.find((v) => v.id === vowPolicy) || open.find((v) => v.id === 'lances');
    if (want) vow(state, want.id);
  }
  if (state.knight.age >= retireAge && retirement(state).may) { retireNow(state); return; }
  endWinter(state);
}

/** At the popinjay: the mark and moment with the best expected feathers, the bird worth five. */
function shootPolicy(state) {
  const p = popinjayPreview(state);
  let best = null;
  for (const lull of [false, true]) {
    const o = lull ? p.lull : p.now;
    for (const [t, hit] of Object.entries(o.marks)) {
      const pts = t === 'bird' ? 5 : POPINJAY.targets[t].points;
      const v = (1 - o.risk) * hit * pts;
      if (!best || v > best.v) best = { v, target: t, lull };
    }
  }
  return { target: best.target, lull: best.lull };
}

/**
 * Take one step of a career: whatever is in front of the knight. Returns a
 * word for what was done, so the runner can count it.
 */
export function step(state, policy, rng) {
  if (state.pending) { answer(state, answerPolicy(state)); return 'card'; }
  if (state.phase === PHASE.WINTER) { winter(state); return 'winter'; }
  const f = state.fair;
  if (f) {
    if (f.stage === 'done') { leaveFair(state); return 'leaveFair'; }
    if (f.kind === 'popinjay') { shoot(state, shootPolicy(state)); return 'shoot'; }
    const best = raceOdds(state).sort((a, b) => b.win - a.win)[0];
    race(state, best.id);
    return 'race';
  }
  const ev = state.event;
  if (ev) {
    switch (ev.stage) {
      case STAGE.ARRIVAL:
        if (canEnter(state)) { enter(state); return 'enter'; }
        withdraw(state); return 'withdraw';
      case STAGE.BOUT: {
        const cb = currentBout(state);
        if (policy === 'read' && cb.bout.course === 0) buyHeraldRead(state, cb.him.id);
        ride(state, chooseCourse(state, policy, rng));
        return 'course';
      }
      case STAGE.RESULT: onward(state); return 'onward';
      case STAGE.DAY: {
        // Every day it is fit for; its men-at-arms ride in the mêlée if it keeps any.
        const men = ev.days[ev.day] === 'melee' ? meleeMenOption(state).max : 0;
        if (rideDay(state, { men }).ok) return 'day';
        standDownDay(state); return 'standDown';
      }
      case STAGE.MELEE: {
        const m = ev.melee;
        const c = m.openings.length ? squireCounsel(m, ev.tier, state.renown) : { index: 0, action: 'recet' };
        meleeTurn(state, c.index, c.action);
        return 'melee';
      }
      // Full ransom, always: the neutral answer, so the bot's own habits do not make its bynames.
      case STAGE.RANSOM: ransom(state, 'full'); return 'ransom';
      case STAGE.FOOT: exchange(state, footSquireCall(state)); return 'exchange';
      case STAGE.FOOT_RESULT:
        if (ev.foot.mercy === 'pending') mercy(state, conduct !== 'worldly');
        footOnward(state);
        return 'footOnward';
      case STAGE.DONE: leave(state); return 'leave';
      default: throw new Error(`The bot does not know what to do at stage ${ev.stage}`);
    }
  }
  if (isFree(state)) {
    const m = chooseMonth(state);
    if (m.kind === 'ride') { const r = rideTo(state, m.id); if (r.ok) return 'ride'; }
    if (m.kind === 'summons' && answerSummons(state).ok) return 'summons';
    if (m.kind === 'pilgrimage' && pilgrimage(state).ok) return 'pilgrimage';
    if (m.kind === 'lands' && lookToLands(state).ok) return 'lands';
    if (m.kind === 'campaign' && campaign(state).ok) return 'campaign';
    if (m.kind === 'court' && visitCourt(state, m.town).ok) return 'court';
    if (m.kind === 'serve' && serve(state).ok) return 'serve';
    train(state, m.kind === 'train' ? m.skill : 'lance');
    return 'train';
  }
  throw new Error('The bot is stuck: nothing in hand, and not free.');
}
