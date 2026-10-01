// The tourney screens: arrival, the lists, a bout's result, the prize-giving.

import { ladiesAt, canAskColours } from '../engine/hearth.js';
import { renderColours } from './hearth.js';
import { TIERS, BARRIERS } from '../data/tourney.data.js';
import { MELEE_PRIZE_LABELS } from '../data/melee.data.js';
import { townLore } from '../engine/lore.js';
import { AIMS, SEATS, ORDINANCE } from '../data/joust.data.js';
import { TOWNS, FACTION_LABELS } from '../data/world.data.js';
import { TEMPERAMENTS } from '../data/field.data.js';
import {
  entryCost, heraldReadCost, canEnter, currentBout, roundName, roundCount, YOU,
} from '../engine/tourney.js';
import { coursePreview, reckonNow, knownOf, tellsInPlay } from '../engine/derive.js';
import { AIM_IDS, SEAT_IDS, choiceByKey, fatigueThreshold } from '../engine/joust.js';
import { callCourse, HOW } from '../engine/herald.js';
import { lsd, lsdSigned } from '../engine/money.js';
import { esc, cap, pct, shield, signed, tierChip } from './view.js';

const HOW_SHORT = {
  points: 'on points', unhorse: 'unhorsed him', forfeit: 'by forfeit',
  heralds: 'by the heralds’ judgement', walkover: 'by walkover',
};
export const PLACING = {
  champion: 'Champion',
  runnerUp: 'The last two',
  semi: 'The last four',
  quarter: 'The last eight',
  first: 'Put out in the first round',
};
const COST_LABELS = {
  entry: 'Entry to the heralds’ roll', lodging: 'Lodging', stabling: 'Stabling and the farrier', largesse: 'Largesse to the heralds',
};

function notes(ev) {
  return ev.notes.length ? `<ul class="notes">${ev.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
}

// ---------------------------------------------------------------------------
// Arrival
// ---------------------------------------------------------------------------

export function renderArrival(state) {
  const ev = state.event;
  const tier = TIERS[ev.tier];
  const costs = Object.entries(tier.costs).filter(([, v]) => v);
  return `
  <section class="card lift stack-lg event-head">
    <div class="stack">
      <div class="spread">${tierChip(ev.tier)}<span class="small muted">${ev.feast}</span></div>
      <div class="where">${esc(TOWNS[ev.town].name)}</div>
      <p class="voice subhead">${esc(ev.name)}, at the invitation of ${esc(ev.host.name)}. ${Object.keys(ev.riders).length} knights, ${roundCount(ev)} rounds, under ${esc(ORDINANCE.name)}.</p>
    </div>
    ${townLore(ev.town) && ev.tier !== 'trial' ? `<p class="town-lore">${esc(townLore(ev.town).text)}</p>` : ''}
    ${notes(ev)}
    ${daysBlock(ev)}
    <div class="stack">
      <div class="eyebrow">Prizes</div>
      <table class="ledger"><tbody>
        <tr><td>Champion: ${esc(tier.prizeLabels.champion)}</td><td>${lsd(tier.prizes.champion)}</td></tr>
        <tr><td>Runner-up</td><td>${lsd(tier.prizes.runnerUp)}</td></tr>
        ${tier.prizes.helm ? `<tr><td>The most helm strikes of the day, if one knight has them alone</td><td>${lsd(tier.prizes.helm)}</td></tr>` : ''}
      </tbody></table>
      <p class="small muted">Renown: ${tier.renown.champion} to the champion, ${tier.renown.boutWon} for each bout won, ${tier.renown.unhorse} for each man borne down.${state.renown >= tier.beneath ? ' <span class="neg">A knight of your renown gains nothing here.</span>' : ''}</p>
    </div>
    <div class="stack">
      <div class="eyebrow">To ride, you pay</div>
      <table class="ledger"><tbody>
        ${costs.map(([k, v]) => `<tr><td>${COST_LABELS[k]}</td><td>${lsd(v)}</td></tr>`).join('')}
        <tr class="total"><td>Now</td><td>${lsd(entryCost(ev.tier))}</td></tr>
      </tbody></table>
      <p class="small muted">The road cost you ${lsd(-ev.ledger.filter((l) => /road/i.test(l.label)).reduce((t, l) => t + l.amount, 0))} already. Lances you break are ${tier.lancePrice}d each, settled at the end. The herald’s read of a rider is ${lsd(heraldReadCost(state))} to you.</p>
    </div>
    ${canEnter(state)
      ? `<button class="btn primary wide" data-act="enter">Pay ${lsd(entryCost(ev.tier))} and ride</button>`
      : `<p class="neg">You have ${lsd(state.purse)} and cannot pay to ride.</p>`}
    <button class="btn quiet" data-act="withdraw">Turn for home without riding</button>
  </section>
  ${ev.tier === 'trial' ? '' : renderColours(state, ladiesAt(state, ev), (l) => canAskColours(state, ev, l))}
  ${renderField(state)}
  ${renderDraw(state)}`;
}

/** The days of a tourney, and what each offers. */
export function daysBlock(ev) {
  if (ev.days.length < 2 || ev.tier === 'greatpas') return '';
  const line = {
    joust: 'The jousts. The draw is made tonight; this is what you pay to enter.',
    melee: `The tourney in the field: two sides, prisoners for ransom, and ${MELEE_PRIZE_LABELS[ev.tier]} to the best of the day.`,
    barriers: `The barriers: the pollaxe on foot, four men by lot, and ${BARRIERS.prizeLabels[ev.tier]} to the last man standing.`,
  };
  return `<div class="stack"><div class="eyebrow">${ev.days.length} days</div>
    <ol class="small days-list">${ev.days.map((d) => `<li>${esc(line[d])}</li>`).join('')}</ol>
    <p class="small muted">The entry covers every day. After the jousts, each day is yours to ride in or to watch.</p></div>`;
}

export function riderLine(state, id, r) {
  const k = knownOf(state, id);
  const standing = (k.standing ? `<span class="tag ${k.standing === 'grudge' || k.standing === 'cool' ? 'warn' : 'good'}">${k.standing}</span>` : '')
    + (k.allegiance ? ` <span class="tag">${esc(FACTION_LABELS[k.allegiance])}\u2019s man</span>` : '')
    + (state.story?.culprit === id && !state.flags.includes('masterCleared') ? ' <span class="tag warn">Ambry Cross</span>' : '');
  return `<div class="rider">${shield(r.arms, 28)}<div style="flex:1;min-width:0">
    <div class="nm">${esc(r.name)} ${standing}</div>
    <div class="small muted">Lance ${r.lance} · Seat ${r.seat} · Horse ${r.horse.quality}${r.horse.temper === 'hot' ? ', hot' : ''} · Renown ${r.renown}</div>
    <div class="small ${k.level ? '' : 'faint'}">${k.level ? `${esc(cap(k.label))}: ${esc(k.habit)}` : 'Habits unknown'}${k.temperament ? ` · ${TEMPERAMENTS[k.temperament].label}` : ''}</div>
    ${k.memory.length ? `<div class="small memory">${esc(k.memory[k.memory.length - 1])}</div>` : ''}
  </div></div>`;
}

function renderField(state) {
  const ev = state.event;
  const ids = Object.keys(ev.riders).filter((id) => id !== YOU);
  return `
  <section class="card stack">
    <div class="eyebrow">The field</div>
    ${ids.some((id) => (state.intel[id] || 0) >= 1) ? '' : '<p class="small muted">You know none of these riders’ habits yet. You will learn them by watching them ride.</p>'}
    <div class="riders">${ids.map((id) => riderLine(state, id, ev.riders[id])).join('')}</div>
  </section>`;
}

export function renderDraw(state) {
  const ev = state.event;
  const name = (id) => (id === YOU ? 'You' : ev.riders[id].name);
  const rounds = [];
  for (let r = 0; r < roundCount(ev); r++) {
    const pairs = ev.rounds[r];
    const title = cap(roundName(ev, r));
    if (!pairs) { rounds.push(`<div class="draw-round"><div class="eyebrow">${title}</div><div class="small faint">To be drawn from the winners.</div></div>`); continue; }
    rounds.push(`<div class="draw-round"><div class="eyebrow">${title}</div>
      ${pairs.map((p) => {
        const mine = p.a === YOU || p.b === YOU;
        if (!p.winner) return `<div class="draw-line ${mine ? 'mine' : ''}"><span>${esc(name(p.a))}</span><span class="faint">v</span><span>${esc(name(p.b))}</span></div>`;
        const loser = p.winner === p.a ? p.b : p.a;
        const ws = p.winner === p.a ? 'a' : 'b';
        const ls = ws === 'a' ? 'b' : 'a';
        return `<div class="draw-line ${mine ? 'mine' : ''}"><span class="w">${esc(name(p.winner))}</span><span class="faint">beat</span><span>${esc(name(loser))}</span><span class="faint small">${HOW_SHORT[p.bout.how]}${p.bout.how !== 'walkover' ? `, ${p.bout.scores[ws]}–${p.bout.scores[ls]}` : ''}</span></div>`;
      }).join('')}</div>`);
  }
  return `<section class="card stack"><div class="eyebrow">The draw</div>${rounds.join('')}</section>`;
}

// ---------------------------------------------------------------------------
// In the lists
// ---------------------------------------------------------------------------

function riderTags(r) {
  const tags = [];
  if (r.fatigue > fatigueThreshold(r)) tags.push('<span class="tag warn">tiring</span>');
  if (r.wound === 'light') tags.push('<span class="tag warn">bruised</span>');
  if (r.grudge) tags.push('<span class="tag warn">grudge</span>');
  return tags.length ? `<div class="status-line">${tags.join('')}</div>` : '';
}

function pips(bout) {
  const out = [];
  const total = Math.max(ORDINANCE.courses, bout.course + (bout.done ? 0 : 1));
  for (let i = 0; i < total; i++) {
    const cls = i < bout.course ? 'done' : i === bout.course && !bout.done ? 'now' : '';
    out.push(`<i class="${cls} ${i >= ORDINANCE.courses ? 'extra' : ''}"></i>`);
  }
  return `<div class="pips" aria-label="Course ${bout.course + 1}">${out.join('')}</div>`;
}

export function tiltCard(state, cb, { showCall, charging }) {
  const { bout, you, him, roundName: rn } = cb;
  const ev = state.event;
  const courseLabel = bout.done ? `${bout.course} course${bout.course === 1 ? '' : 's'} run`
    : bout.course >= ORDINANCE.courses ? `Course ${bout.course + 1}: level, so they ride again` : `Course ${bout.course + 1} of ${ORDINANCE.courses}`;
  return `
  <section class="card lift stack" id="tilt">
    <div class="spread"><span class="eyebrow">${esc(cap(rn))} · ${esc(TOWNS[ev.town].name)}</span><span class="eyebrow">${courseLabel}</span></div>
    <div class="tilt ${charging ? 'charging' : ''}">
      <div class="side"><span class="shield-you">${shield(you.arms, 56)}</span>
        <span class="nm">You</span><span class="sk">Lance ${you.lance} · Seat ${you.seat} · Horse ${you.horse.quality}</span>${riderTags(you)}</div>
      <div class="score"><span class="n">${bout.scores.a}<span class="dash">–</span>${bout.scores.b}</span>${pips(bout)}</div>
      <div class="side"><span class="shield-him">${shield(him.arms, 56)}</span>
        <span class="nm">${esc(him.name)}</span><span class="sk">Lance ${him.lance} · Seat ${him.seat} · Horse ${him.horse.quality}</span>${riderTags(him)}</div>
      <div class="barrier" aria-hidden="true"></div>
    </div>
    ${showCall && ev.lastCourse && bout.course > 0 ? `
      <div class="call"><span class="eyebrow">Course ${ev.lastCourse.n}</span>
        ${callCourse(ev.lastCourse).map((l, i) => `<span class="${i ? 'hit' : 'muted'}">${esc(l)}</span>`).join('')}
      </div>` : ''}
  </section>`;
}

function oddsRow(label, o) {
  const foul = o.tilt + o.horse;
  const seg = (cls, p) => (p > 0.0005 ? `<i class="${cls}" style="width:${(p * 100).toFixed(2)}%"></i>` : '');
  const item = (cls, name, p) => (p > 0.0005 ? `<span><span class="sw ${cls}"></span>${name} <b>${pct(p)}</b></span>` : '');
  return `
  <div class="stack" style="gap:6px">
    <div class="who"><span class="eyebrow">${label}</span></div>
    <div class="bar" role="img" aria-label="${label}">${seg('helm', o.helm)}${seg('break', o.break)}${seg('unhorse', o.unhorse)}${seg('foul', foul)}</div>
    <div class="legend">
      ${item('helm', 'Helm, 2', o.helm)}${item('break', 'Breaks, 1', o.break)}${item('unhorse', 'Bears down', o.unhorse)}
      ${item('foul', o.horse > 0.0005 ? 'Foul (tilt or horse)' : 'Tilt, −1', foul)}${item('miss', 'Miss', o.miss)}
    </div>
  </div>`;
}

function renderIntel(state, him) {
  const k = knownOf(state, him.id);
  const live = tellsInPlay(state);
  const cost = heraldReadCost(state);
  const canBuy = k.level < 2 && state.purse >= cost;
  const buy = k.level < 2 ? `<button class="btn" data-read="${him.id}" ${canBuy ? '' : 'disabled'}>Pay the herald for his read, ${lsd(cost)}</button>` : '';
  let body;
  if (k.level === 0) {
    body = '<p class="muted">You have never seen him ride. The odds below assume the field’s usual habits, which may not be his.</p>';
  } else {
    body = `<p class="habit">${esc(cap(k.label))}: ${esc(k.habit)}</p>`;
    if (k.level >= 2) {
      body += k.noTells
        ? '<p class="small muted">The herald says he has no tells worth the name. What you see is what he rides.</p>'
        : `<ul class="small">${k.tells.map((t) => `<li class="${live.includes(t) ? 'live' : ''}">${esc(t)}${live.includes(t) ? ' — now' : ''}</li>`).join('')}</ul>`;
    } else {
      body += '<p class="small muted">You know his habits from watching him. The herald knows what he does when the bout turns.</p>';
    }
  }
  if (him.grudge) body += '<p class="small neg">He bears you a grudge, and rides at you harder and higher for it. The odds allow for it.</p>';
  if (k.memory.length) body += `<p class="small memory">${esc(k.memory[k.memory.length - 1])}</p>`;
  return `<section class="card intel"><div class="eyebrow">What you know of him</div>${body}${buy}</section>`;
}

export function renderBout(state, ui) {
  const cb = currentBout(state);
  const r = reckonNow(state);
  const choice = choiceByKey(`${ui.pick.aim}/${ui.pick.seat}`);
  const pv = coursePreview(state, choice, r);
  const basis = pv.intel >= 2 ? 'with the herald’s read of him'
    : pv.intel === 1 ? 'knowing his habits, not his tells'
    : 'assuming the field’s usual habits';
  const best = r.best;
  return `
  ${tiltCard(state, cb, { showCall: true, charging: ui.charging })}
  ${renderIntel(state, cb.him)}
  <section class="card stack-lg">
    <div class="stack">
      <div class="eyebrow">Aim</div>
      <div class="seg" role="group" aria-label="Aim">
        ${AIM_IDS.map((a) => `<button data-aim="${a}" aria-pressed="${ui.pick.aim === a}">${AIMS[a].label}</button>`).join('')}
      </div>
      <p class="choice-note">${esc(AIMS[ui.pick.aim].blurb)}</p>
    </div>
    <div class="stack">
      <div class="eyebrow">Seat</div>
      <div class="seg" role="group" aria-label="Seat">
        ${SEAT_IDS.map((s) => `<button data-seat="${s}" aria-pressed="${ui.pick.seat === s}">${SEATS[s].label}</button>`).join('')}
      </div>
      <p class="choice-note">${esc(SEATS[ui.pick.seat].blurb)}</p>
    </div>
    <div class="odds">
      ${oddsRow('Your lance', pv.mine)}
      ${oddsRow('His lance at you', pv.his)}
      <div class="reckon">
        <div><div class="eyebrow">Squire’s reckoning</div>
          <div class="small muted">Chance to carry the bout if you ride the rest well, ${basis}.</div></div>
        <div class="pct">${pct(pv.win)}</div>
      </div>
    </div>
    <div class="stack">
      <button class="btn primary wide" data-act="run">Run the course</button>
      <button class="btn wide" data-act="squire">Take the squire’s call: ${AIMS[best.aim].label.toLowerCase()}, ${SEATS[best.seat].label.toLowerCase()} (${pct(r.byChoice[best.key])})</button>
      <button class="btn quiet" data-act="auto">Ride the rest of this bout as the squire calls it</button>
    </div>
  </section>
  ${renderDraw(state)}`;
}

function outcomeWord(o) {
  return { miss: 'miss', tilt: 'the tilt', horse: 'the horse', break: 'broke', helm: 'helm', unhorse: 'bore him down' }[o];
}

export function renderResult(state, ui) {
  const ev = state.event;
  const p = ev.rounds[ev.round][ev.current];
  const b = p.bout;
  const won = p.winner === YOU;
  const cb = { bout: b, you: ev.riders[p.a], him: ev.riders[p.b], roundName: roundName(ev, ev.round) };
  const hurt = ev.withdrawn[YOU];
  const last = ev.round >= roundCount(ev) - 1;
  const next = won && !hurt ? (last ? 'To the prize-giving' : `On to ${roundName(ev, ev.round + 1)}`) : 'Watch the rest of the tourney';
  const reaction = ev.reactions.filter((x) => x.round === ev.round).pop();
  return `
  ${tiltCard(state, cb, { showCall: true, charging: false })}
  <section class="card stack-lg">
    <div class="stack">
      <div class="verdict ${won ? 'win' : ''}">${won ? 'You carry the bout' : 'Beaten'}</div>
      <p class="voice subhead">${won ? 'You won' : `${esc(cb.him.name)} won`} ${esc(HOW[b.how])}, ${b.scores.a} to ${b.scores.b}.</p>
      ${reaction ? `<p class="voice">${esc(reaction.text)}${reaction.regard ? ` <span class="small ${reaction.regard > 0 ? 'pos' : 'neg'}">(${signed(reaction.regard)} regard)</span>` : ''}</p>` : ''}
      ${hurt ? '<p class="neg">The surgeon will not let you ride again today.</p>' : ''}
    </div>
    <div class="table-wrap"><table class="courses">
      <thead><tr><th>#</th><th>You</th><th>Him</th><th class="sc">Score</th></tr></thead>
      <tbody>${b.courses.map((c) => `<tr>
        <td>${c.n}</td>
        <td>${AIMS[c.a.aim].label} / ${SEATS[c.a.seat].label}: ${esc(outcomeWord(c.a.out))}</td>
        <td>${AIMS[c.b.aim].label} / ${SEATS[c.b.seat].label}: ${esc(outcomeWord(c.b.out))}</td>
        <td class="sc">${c.scores.a}–${c.scores.b}</td></tr>`).join('')}</tbody>
    </table></div>
    <button class="btn primary wide" data-act="continue">${next}</button>
  </section>`;
}

export function renderDone(state) {
  const ev = state.event;
  const e = ev.entry;
  const pas = ev.tier === 'pas' || ev.tier === 'greatpas' || ev.tier === 'trial';
  const won = e.placing === 'champion' || e.foot?.champion;
  const verdict = ev.tier === 'pas' ? (e.placing === 'champion' ? 'You ride through' : 'Turned back')
    : ev.tier === 'trial' ? (e.placing === 'champion' ? 'God has judged for you' : 'Judged against')
    : ev.tier === 'greatpas' ? (won ? 'You have the better of the holder' : ev.touched ? 'Your name is in the book of the pas' : 'You leave the shields hanging')
    : PLACING[e.placing];
  const renownGained = ev.renownStart != null ? state.renown - ev.renownStart : e.renown;
  const onward = state.detour ? `Ride on to ${esc(TOWNS[state.detour.town].name)}` : 'Ride home for the month';
  return `
  <section class="card lift stack-lg">
    <div class="stack">
      <div class="spread">${tierChip(ev.tier)}<span class="small muted">${esc(TOWNS[ev.town].name)}, ${esc(ev.feast)}</span></div>
      <div class="verdict ${won ? 'win' : ''}">${verdict}</div>
    </div>
    <div class="stack">
      <div class="eyebrow">The Book of Feats</div>
      <p class="entry">${esc(e.text)}</p>
    </div>
    ${ev.ledger.length ? `<div class="stack">
      <div class="eyebrow">The reckoning</div>
      <table class="ledger"><tbody>
        ${ev.ledger.map((l) => `<tr><td>${esc(l.label)}</td><td class="${l.amount >= 0 ? 'pos' : 'neg'}">${lsdSigned(l.amount)}</td></tr>`).join('')}
        <tr class="total"><td>Net</td><td class="${e.net >= 0 ? 'pos' : 'neg'}">${lsdSigned(e.net)}</td></tr>
      </tbody></table></div>` : ''}
    <p class="small muted">Renown ${signed(renownGained || 0)}${e.honour ? ` · Honour ${signed(e.honour)}` : ''} · Purse now ${lsd(state.purse)} · ${esc(state.horse.name)} ${state.horse.condition}/10</p>
    <button class="btn primary wide" data-act="leave">${onward}</button>
  </section>
  ${pas ? '' : renderDraw(state)}`;
}

