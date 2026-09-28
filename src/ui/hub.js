// The month: the map, this month's tourneys, and the other ways to spend it.
// And winter: the accounts, the Roll, the squire, the retinue, the fair.

import { TOWNS, ROADS, MONTHS, FIRST_MONTH, LAST_MONTH, WORLD, FACTION_LABELS } from '../data/world.data.js';
import { TIERS } from '../data/tourney.data.js';
import { RETINUE, RETINUE_ORDER, HARNESS, SQUIRE_ORIGINS, SQUIRE, CONDITION, SERVICE } from '../data/household.data.js';
import { STAT_LABELS } from '../data/creation.data.js';
import { monthOptions, courtOptions, injured, borrowedHorsePrice, horseTradeIn, summonsOption, campaignOption, landsOption, shrineVowOpen } from '../engine/season.js';
import { FAIRS, ORDER, ARCHERS, CAMPAIGN } from '../data/life.data.js';
import { vacancies, eligibility, chapterCandidates, reckonChapter, holderName, YOU_SEAT } from '../engine/order.js';
import { vowOptions, vowProgress, vowDef } from '../engine/vows.js';
import { retirement, endingFor } from '../engine/ending.js';
import { patronDef, isPatronTourney, canPilgrimage, conductOf } from '../engine/court.js';
import { knightById } from '../engine/field.js';
import { ROSTER } from '../data/field.data.js';
import { PILGRIMAGE, PATRONAGE } from '../data/court.data.js';
import { route } from '../engine/calendar.js';
import { rollOfArms } from '../engine/field.js';
import { markCost, expectedRetinue, horseOnTheDay } from '../engine/tourney.js';
import { STAT_KEYS } from '../engine/knight.js';
import { lsd, lsdSigned } from '../engine/money.js';
import {
  balanceWords, importance, sideOf, warSide, atWar, menOf, companyMax, manorDef, archersMax,
} from '../engine/realm.js';
import { CLAIMANTS, COMPANY } from '../data/realm.data.js';
import { townLore } from '../engine/lore.js';
import { renderLetters, renderChronicle } from './world.js';
import { esc, ordinal, cap, days, tierChip, shield, pct, signed } from './view.js';

const TIER_COLOUR = { local: 'var(--tier-local)', regional: 'var(--tier-regional)', high: 'var(--tier-high)', grand: 'var(--tier-grand)', greatpas: 'var(--gules)', fair: 'var(--good)' };

// ---------------------------------------------------------------------------
// The map
// ---------------------------------------------------------------------------

export function renderMap(state, { events = [], selected = null } = {}) {
  const here = TOWNS[state.location];
  const sel = events.find((e) => e.id === selected);
  const path = sel ? route(state.location, sel.town).path : null;
  const roads = ROADS.map(([a, b]) => {
    const A = TOWNS[a];
    const B = TOWNS[b];
    return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="road"/>`;
  }).join('');
  let routeLine = '';
  let routeDays = '';
  if (path && path.length > 1) {
    routeLine = `<polyline class="route" points="${path.map((id) => `${TOWNS[id].x},${TOWNS[id].y}`).join(' ')}"/>`;
    for (let i = 1; i < path.length; i++) {
      const A = TOWNS[path[i - 1]];
      const B = TOWNS[path[i]];
      const d = ROADS.find(([a, b]) => (a === path[i - 1] && b === path[i]) || (b === path[i - 1] && a === path[i]))[2];
      routeDays += `<text class="daylabel" x="${(A.x + B.x) / 2}" y="${(A.y + B.y) / 2 - 4}">${d}d</text>`;
    }
  }
  const rings = events.map((e) => {
    const t = TOWNS[e.town];
    return `<circle class="ring ${e.id === selected ? 'sel' : ''}" data-sel="${e.id}" cx="${t.x}" cy="${t.y}" r="11" stroke="${TIER_COLOUR[e.tier]}"/>`;
  }).join('');
  const towns = Object.values(TOWNS).map((t) => {
    const right = t.x < 250;
    const label = `<text class="townlabel" x="${right ? t.x + 9 : t.x - 9}" y="${t.y + 4}" text-anchor="${right ? 'start' : 'end'}">${esc(t.name)}</text>`;
    const mark = t.seat
      ? `<rect class="seat" x="${t.x - 4}" y="${t.y - 4}" width="8" height="8"/>`
      : t.city ? `<circle class="city" cx="${t.x}" cy="${t.y}" r="4.5"/>` : `<circle class="town" cx="${t.x}" cy="${t.y}" r="3.5"/>`;
    return mark + label;
  }).join('');
  const you = `<g class="you" transform="translate(${here.x},${here.y})"><path d="M0,0 V-20"/><path class="flag" d="M0,-20 L13,-15.5 L0,-11 Z"/></g>`;
  return `
  <svg class="map" viewBox="0 0 360 460" role="img" aria-label="Map of ${esc(WORLD.kingdom)}. You are at ${esc(here.name)}.">
    <rect width="360" height="460" class="sea"/>
    <path class="land" d="M16,16 L344,14 L348,150 L334,250 L350,330 L332,400 L270,438 L196,450 L118,434 L36,424 L14,300 L20,160 Z"/>
    <path class="border" d="M16,186 C110,172 240,198 346,180"/>
    <path class="border" d="M16,318 C120,306 250,328 342,312"/>
    <text class="province" x="24" y="176">The Harrow March</text>
    <text class="province" x="24" y="308">Kingsmead</text>
    <text class="province" x="24" y="340">The Saltings</text>
    ${roads}${routeLine}${rings}${towns}${routeDays}${you}
  </svg>`;
}

// ---------------------------------------------------------------------------
// The month
// ---------------------------------------------------------------------------

function horseLine(state) {
  const c = state.horse.condition ?? CONDITION.max;
  const q = horseOnTheDay(state);
  const word = c >= 9 ? 'fresh' : c >= CONDITION.soundAt ? 'sound' : c >= 3 ? 'tired' : 'worn out';
  return `${esc(cap(state.horse.name))} is ${word} (${c}/10)${q < state.horse.quality ? `, riding as quality ${q} not ${state.horse.quality}` : ''}`;
}

function fairCard(state, o, selected) {
  const F = FAIRS[o.cal.fair];
  const sel = o.cal.id === selected;
  const what = o.cal.fair === 'popinjay'
    ? 'Three rounds of crossbow at the wooden bird. No horse, no lance; a steady arm and a feel for the wind.'
    : `Two miles of down against the copers’ horses. ${cap(state.horse.name)} is quality ${state.horse.quality}, condition ${state.horse.condition ?? CONDITION.max}/10.`;
  return `
  <article class="opt ${sel ? 'sel' : ''} ${o.open ? '' : 'closed'}" data-sel="${o.cal.id}">
    <div class="spread">${tierChip('fair')}<span class="small muted">${o.cal.fair === 'popinjay' ? 'the guild and all comers' : 'the copers and any gentleman'}</span></div>
    <div class="subhead">${esc(o.cal.name)}</div>
    <div class="small muted">${esc(TOWNS[o.cal.town].name)} · ${esc(o.cal.host.name)} · ${o.days ? `${days(o.days)}’ ride` : 'here'}</div>
    <div class="small">${esc(what)}</div>
    <div class="small">Road ${lsd(o.road)} · Entry ${lsd(o.entry)} · ${esc(F.prizeLabel)} to the winner</div>
    ${o.open
      ? `<button class="btn primary wide" data-ride="${o.cal.id}">Ride to ${esc(TOWNS[o.cal.town].name)}</button>`
      : `<p class="small neg">${esc(o.reason)}</p>`}
  </article>`;
}

function optionCard(state, o, selected) {
  if (o.cal.tier === 'fair') return fairCard(state, o, selected);
  const t = TIERS[o.cal.tier];
  const sel = o.cal.id === selected;
  const prize = o.cal.tier === 'greatpas' ? `a gold ring for every shield touched, ${lsd(t.prizes.champion)} to beat him`
    : t.prizes.champion ? `${lsd(t.prizes.champion)} to the winner` : 'Renown only';
  const dayWord = { joust: 'jousts', melee: 'mêlée', barriers: 'barriers' };
  const who = o.cal.tier === 'greatpas' ? 'one holder, all comers' : `${t.entrants} riders`;
  return `
  <article class="opt ${sel ? 'sel' : ''} ${o.open ? '' : 'closed'}" data-sel="${o.cal.id}">
    <div class="spread">${tierChip(o.cal.tier)}<span class="small muted">${who}${t.days.length > 1 && o.cal.tier !== 'greatpas' ? ` · ${t.days.map((d) => dayWord[d]).join(', ')}` : ''}</span></div>
    <div class="subhead">${esc(o.cal.name)}</div>
    ${state.patron && isPatronTourney(state, o.cal) ? `<div class="small patronmark">${esc(cap(patronDef(state).name))} expects you here${state.patron.attended ? ' (you have already ridden for him this year)' : ''}.</div>` : ''}
    <div class="small muted">${esc(TOWNS[o.cal.town].name)} · ${esc(o.cal.host.name)} · ${o.days ? `${days(o.days)}’ ride` : 'here'}</div>
    ${townLore(o.cal.town) ? `<div class="small faint town-line">${esc(townLore(o.cal.town).line)}</div>` : ''}
    <div class="small">Road ${lsd(o.road)} · Entry ${lsd(o.entry)} · ${prize}</div>
    ${o.invite ? `<div class="small patronmark">By invitation. ${esc(o.invite)}</div>` : ''}
    ${o.open
      ? `<button class="btn primary wide" data-ride="${o.cal.id}">Ride to ${esc(TOWNS[o.cal.town].name)}</button>`
      : `<p class="small neg">${esc(o.reason)}</p>`}
  </article>`;
}

function nextTourney(state) {
  const later = state.calendar.filter((e) => e.month > state.month);
  return later[0] || null;
}

export function renderMonth(state, ui) {
  const opts = monthOptions(state);
  const events = opts.map((o) => o.cal);
  const selected = ui.selected && events.some((e) => e.id === ui.selected) ? ui.selected : (opts.find((o) => o.open)?.cal.id || events[0]?.id || null);
  const next = nextTourney(state);
  const hurt = injured(state);
  const skill = ui.trainSkill;
  const k = state.knight;
  const news = (state.news || []).map((n) => {
    const cal = state.calendar.find((e) => e.id === n.calId);
    return cal ? `${esc(n.champion)} won ${esc(cal.name.charAt(0).toLowerCase() + cal.name.slice(1))}.` : '';
  }).filter(Boolean);
  return `
  <section class="card lift stack">
    <div class="spread"><span class="eyebrow">Year ${state.year} · ${esc(eraLine(state))}</span></div>
    <div class="month-head"><span class="heading">${MONTHS[state.month]}</span>
      <span class="small muted">At ${esc(TOWNS[state.location].name)}</span></div>
    <p class="small muted">${horseLine(state)}.${hurt ? ' <span class="neg">You are still recovering from a wound.</span>' : ''}</p>
    ${renderMap(state, { events, selected })}
    <div class="legend map-legend small muted">
      <span><i class="key key-local"></i>Local</span><span><i class="key key-regional"></i>Regional</span>
      <span><i class="key key-high"></i>High</span><span><i class="key key-grand"></i>The King’s</span>
      <span><i class="key key-fair"></i>A fair</span><span><i class="key key-seat"></i>A great house</span>
    </div>
    ${news.length ? `<p class="small muted">Last month: ${news.join(' ')}</p>` : ''}
  </section>

  ${renderRealm(state)}

  ${renderPatron(state)}

  ${renderVow(state)}

  <section class="stack">
    <div class="eyebrow">Tourneys this month</div>
    ${opts.length
      ? opts.map((o) => optionCard(state, o, selected)).join('')
      : `<div class="card"><p class="empty">No tourney is held in ${MONTHS[state.month]}.${next ? ` The next is ${esc(next.name)}, in ${MONTHS[next.month]}.` : ' The riding year is nearly over.'}</p></div>`}
  </section>

  ${renderWarMonth(state)}

  <section class="card stack-lg">
    <div class="eyebrow">Or spend the month</div>
    <div class="stack">
      <div class="small muted">Train a skill. Marks count towards the next point; each point costs more than the last.</div>
      <div class="skillgrid" role="group" aria-label="Skill to train">
        ${STAT_KEYS.map((s) => `<button data-train-pick="${s}" aria-pressed="${skill === s}">
          <span class="n">${STAT_LABELS[s]} ${k.stats[s]}</span>
          <span class="small faint">${fmtMarks(k.marks[s])}/${markCost(k.stats[s])}</span></button>`).join('')}
      </div>
      <button class="btn wide" data-act="train">Train ${STAT_LABELS[skill].toLowerCase()} for the month</button>
    </div>
    <div class="row">
      <button class="btn" data-act="serve" ${hurt ? 'disabled' : ''}>Take paid service (${lsdSigned(SERVICE.wage)})</button>
      <button class="btn" data-act="rest">Rest</button>
    </div>
    ${canPilgrimage(state) || shrineVowOpen(state) ? `<div class="stack">
      <div class="small muted">${shrineVowOpen(state) ? 'You vowed on the swans to walk to the shrine this year.' : `Your name is ${esc(conductOf(state.honour).label.toLowerCase())}. ${esc(conductOf(state.honour).does)}`}</div>
      <button class="btn" data-act="pilgrimage" ${state.purse >= PILGRIMAGE.cost ? '' : 'disabled'}>Go on pilgrimage to ${esc(PILGRIMAGE.shrine)} (${lsdSigned(-PILGRIMAGE.cost)}, honour +${PILGRIMAGE.honour})</button>
    </div>` : ''}
    <div class="stack">
      <div class="small muted">Go to court: favour with the great is won in their halls.</div>
      ${courtOptions(state).map((c) => `<button class="btn quiet left" data-court="${c.town}" ${c.open ? '' : 'disabled'}>
        ${esc(cap(c.host))} at ${esc(TOWNS[c.town].name)} · ${c.days ? `${days(c.days)}, ${lsd(c.cost)}` : 'here'} · favour ${state.favour[c.faction] || 0}</button>`).join('')}
    </div>
    <button class="btn quiet" data-act="pass">Let the month pass</button>
  </section>

  ${renderCalendar(state)}`;
}

function fmtMarks(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

/** The vow made on the swans, and how it stands. */
function renderVow(state) {
  if (!state.vow || state.vow.year !== state.year) return '';
  const p = vowProgress(state);
  const word = p.status === 'kept' ? '<span class="pos">Kept.</span>' : p.status === 'broken' ? '<span class="neg">Broken.</span>' : '';
  const count = p.vow.id === 'mercy'
    ? (p.have ? `${p.have} mêlée${p.have === 1 ? '' : 's'} with prisoners freed.` : 'Not yet tested: take a prisoner in the mêlée and let him go.')
    : p.vow.id === 'shrine' ? (p.have ? 'You have walked it.' : 'Not yet walked.') : `${p.have} of ${p.need}.`;
  return `<section class="card stack vow">
    <div class="spread"><span class="eyebrow">Your vow on the swans</span><span class="small muted">judged at winter</span></div>
    <p class="voice">${esc(p.vow.title)}</p>
    <p class="small">${count} ${word}</p>
  </section>`;
}

/** In the war: ride with the army, or see to your lands. */
function renderWarMonth(state) {
  const camp = campaignOption(state);
  const lands = landsOption(state);
  if (!camp && !lands) return '';
  return `<section class="card stack">
    <div class="eyebrow">The war’s work</div>
    ${camp ? `<p class="small muted">${esc(camp.leader)}’s army is in the field. A month with it pays ${lsd(CAMPAIGN.pay)}, and wins you renown and ${esc(camp.leader)}’s goodwill. There is no ordinance in a skirmish.</p>
      ${camp.open ? `<button class="btn primary" data-act="campaign">Ride with the army for the month (chance of death ${pct(camp.peril)})</button>` : `<p class="small neg">${esc(camp.reason)}</p>`}` : ''}
    ${lands ? `<p class="small muted">Raiders are burning barns in a war year. An unwatched manor has a ${pct(lands.raid || 0.3)} chance of losing its rents this winter.</p>
      ${lands.open ? `<button class="btn" data-act="lands">See to your lands for the month (harvest ${lsdSigned(lands.harvest)}; no rents lost this year)</button>` : `<p class="small faint">${esc(lands.reason)}</p>`}` : ''}
  </section>`;
}

/** Which year this is, as the realm counts it. */
export function eraLine(state) {
  const r = state.realm;
  if (atWar(state)) return `the ${ordinal(state.year - r.war.year + 1)} year of the war`;
  if (r.ruler) return `the ${ordinal(Math.max(1, state.year - r.coronationYear + 1))} year of ${CLAIMANTS[r.ruler].crowned}`;
  return `the ${ordinal(WORLD.peaceYear + state.year - 1)} year of the peace`;
}

function tensionWord(t) {
  if (t >= 100) return 'At war';
  if (t >= 75) return 'On the edge';
  if (t >= 50) return 'Dividing';
  if (t >= 25) return 'Uneasy';
  return 'Quiet';
}

/** The realm: how near the war is, who leads, what they are saying, and where you stand. */
function renderRealm(state) {
  const r = state.realm;
  const imp = importance(state);
  if (r.ruler && !atWar(state)) {
    return `<section class="card stack realm">
      <div class="spread"><span class="eyebrow">The realm</span><span class="small muted">At peace</span></div>
      <p class="small">${esc(CLAIMANTS[r.ruler].crowned)} reigns. ${r.war?.side === r.ruler ? 'You fought for the crown, and it remembers.' : r.war?.side ? 'You fought against the crown, and it remembers that too.' : 'You stood aside, and the crown remembers that as well.'}</p>
    </section>`;
  }
  const side = r.war ? warSide(state) : sideOf(state);
  const sworn = r.oath === 'none' ? 'You have sworn to nobody.'
    : r.oath === 'crown' ? `You are sworn to the king’s will${r.will ? `: to ${CLAIMANTS[r.will].name}` : ', whatever it says'}.`
    : r.oath ? `You are sworn to ${CLAIMANTS[r.oath].name}.`
    : side && side !== 'crown' ? `You are counted ${FACTION_LABELS[side]}’s man, as your patron’s. You have sworn no oath.`
    : 'You have sworn no oath, and nobody counts you as theirs.';
  let war = '';
  if (atWar(state)) {
    const bs = r.war.battles;
    war = `<p class="small"><b>The king is dead.</b> His will named ${esc(CLAIMANTS[r.will].name)}. ${bs.length
      ? bs.map((b) => `${esc(cap(b.name))}: ${esc(CLAIMANTS[b.victor].short)} carried the field.`).join(' ')
      : 'No battle has been fought yet.'} ${r.war.decided ? 'The war is decided; the reckoning comes in winter.' : ''}</p>`;
  }
  return `<section class="card stack realm">
    <div class="spread"><span class="eyebrow">The realm</span><span class="small muted">${tensionWord(r.tension)}</span></div>
    ${atWar(state) ? '' : `<div class="meter tension" title="Tension ${r.tension} of 100"><i style="width:${r.tension}%"></i></div>`}
    ${war}
    ${r.rumour ? `<p class="voice small rumour">${esc(r.rumour)}</p>` : ''}
    <p class="small muted">${esc(balanceWords(state))} ${esc(sworn)}</p>
    <p class="small">If it came to swords: <b>${esc(imp.rank.label)}</b>. ${esc(imp.rank.does)} <span class="faint">(standing ${imp.score}${imp.next ? `; ${imp.next.min} makes you ${imp.next.label.toLowerCase()}` : ''}; the Knight tab shows why)</span></p>
  </section>`;
}

/** Your patron: what he pays, what he expects, and how you stand with him. */
function renderPatron(state) {
  const p = patronDef(state);
  if (!p) return '';
  const pt = state.patron;
  const sm = pt.summons;
  const opt = summonsOption(state);
  const target = pt.target ? knightById(state, pt.target) : null;
  const tick = (done) => `<span class="${done ? 'pos' : 'faint'}">${done ? '\u2713' : '\u25cb'}</span>`;
  let summons;
  if (!sm) summons = '<span class="faint">No summons this year, or none still to come.</span>';
  else if (sm.answered) summons = `${tick(true)} You answered his summons.`;
  else if (opt) summons = `${tick(false)} <b>His summons has come.</b> Answer it by the end of ${MONTHS[sm.until]}.`;
  else summons = `${tick(false)} A summons will come in ${MONTHS[sm.month]}; you will have until the end of ${MONTHS[sm.until]}.`;
  return `
  <section class="card stack patron">
    <div class="spread"><span class="eyebrow">In ${esc(p.livery)}</span><span class="small muted">${lsd(p.fee)} a year</span></div>
    <div class="small">${tick(pt.attended)} Ride at ${esc(p.tourneyLabel)}${pt.attended ? ': done this year.' : '.'}</div>
    <div class="small">${summons}</div>
    ${target ? `<div class="small">${tick(false)} Beat ${esc(target.name)} before the year is out.</div>` : ''}
    <div class="small ${pt.strikes ? 'neg' : 'muted'}">${pt.strikes ? `${pt.strikes} of ${PATRONAGE.strikes} obligations missed. Another and he lets you go.` : 'You have missed nothing he asked of you.'}</div>
    ${opt ? `<button class="btn primary" data-act="summons" ${opt.open ? '' : 'disabled'}>Answer the summons at ${esc(TOWNS[opt.town].name)}${opt.days ? ` (${days(opt.days)}, ${lsd(opt.cost)})` : ''}</button>` : ''}
  </section>`;
}

function renderCalendar(state) {
  const rows = [];
  for (let m = FIRST_MONTH; m <= LAST_MONTH; m++) {
    const evs = state.calendar.filter((e) => e.month === m);
    const cls = m < state.month ? 'past' : m === state.month ? 'now' : '';
    rows.push(`<div class="cal-row ${cls}"><span class="m">${MONTHS[m].slice(0, 3)}</span><span class="evs">${
      evs.length ? evs.map((e) => `<span class="cal-ev">${tierChip(e.tier)} ${esc(TOWNS[e.town].name)}</span>`).join('') : '<span class="faint small">no tourney</span>'
    }</span></div>`);
  }
  return `<section class="card stack"><div class="eyebrow">The year’s calendar</div><div class="cal">${rows.join('')}</div></section>`;
}

// ---------------------------------------------------------------------------
// Winter
// ---------------------------------------------------------------------------

export function renderWinter(state, ui = {}) {
  const w = state.winter;
  const net = w.ledger.reduce((t, l) => t + l.amount, 0);
  const roll = rollOfArms(state, 10);
  const expected = expectedRetinue(state.renown);
  const sq = state.squire;
  return `
  <section class="card lift stack-lg">
    <div class="stack">
      <div class="eyebrow">The end of the ${ordinal(state.year)} year</div>
      <div class="heading">Winter</div>
    </div>
    <div class="stack">
      <div class="eyebrow">The accounts</div>
      <table class="ledger"><tbody>
        ${w.ledger.map((l) => `<tr><td>${esc(l.label)}</td><td class="${l.amount >= 0 ? 'pos' : 'neg'}">${lsdSigned(l.amount)}</td></tr>`).join('')}
        <tr class="total"><td>The year closes</td><td class="${net >= 0 ? 'pos' : 'neg'}">${lsdSigned(net)}</td></tr>
      </tbody></table>
      <p class="small muted">Purse now ${lsd(state.purse)}. Renown fades a tenth each winter, yours and everyone’s, and a quarter of whatever is over ${ROSTER.fame.past}: fame must be kept up.</p>
    </div>
    ${w.notes.length ? `<ul class="notes">${w.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${w.bought.length ? `<ul class="notes">${w.bought.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
  </section>

  ${renderLetters(w.letters)}
  ${renderChronicle(w.chronicle)}

  <section class="card stack">
    <div class="eyebrow">The Roll of Arms</div>
    <p class="small muted">The heralds publish it at Candlemas. You stand ${ordinal(roll.rank)} of ${roll.of}.</p>
    ${rollTable(roll.rows)}
  </section>

  ${renderSwan(state)}

  ${renderVows(state)}

  <section class="card stack">
    <div class="eyebrow">The winter’s training</div>
    <div class="skillgrid" role="group" aria-label="Winter training">
      ${STAT_KEYS.map((s) => `<button data-focus="${s}" aria-pressed="${w.focus === s}"><span class="n">${STAT_LABELS[s]} ${state.knight.stats[s]}</span>
        <span class="small faint">${fmtMarks(state.knight.marks[s])}/${markCost(state.knight.stats[s])}</span></button>`).join('')}
    </div>
    <p class="small muted">Two marks of practice over the winter, in the skill you choose.</p>
  </section>

  <section class="card stack">
    <div class="eyebrow">Your squire</div>
    ${sq ? `
      <p><span class="voice subhead">${esc(sq.name)}</span>, ${sq.age}, ${esc(SQUIRE_ORIGINS[sq.origin].label.toLowerCase())}. ${sq.years} of ${SQUIRE.knightAt} years served.</p>
      <p class="small">Lance ${sq.lance} · Seat ${sq.seat} · Wits ${sq.wits} · Loyalty ${sq.loyalty}</p>
      <div class="seg" role="group" aria-label="Teach your squire">
        ${['lance', 'seat', 'wits'].map((f) => `<button data-sqfocus="${f}" aria-pressed="${sq.focus === f}">Teach ${f}</button>`).join('')}
      </div>
      <p class="small muted">He learns a point a year in what you teach, two if you are good at it yourself. With wits, he finds out how unknown riders ride before your bouts.</p>
      ${sq.years >= SQUIRE.knightAt
        ? '<button class="btn primary" data-act="dub">Dub him a knight</button>'
        : ''}`
    : w.candidates.length ? `
      <p class="small muted">A squire costs his keep or brings his father’s fee, eats on the road, and learns what you teach. He asks among the grooms how unknown riders ride. After ${SQUIRE.knightAt} years you may knight him.</p>
      ${w.candidates.map((c, i) => `<article class="opt">
        <div class="subhead">${esc(c.name)}, ${c.age}</div>
        <div class="small muted">${esc(SQUIRE_ORIGINS[c.origin].blurb)}</div>
        <div class="small">Lance ${c.lance} · Seat ${c.seat} · Wits ${c.wits} · ${SQUIRE_ORIGINS[c.origin].fee >= 0 ? `His father pays ${lsd(SQUIRE_ORIGINS[c.origin].fee)} a year` : `Costs you ${lsd(-SQUIRE_ORIGINS[c.origin].fee)} a year`}</div>
        <button class="btn" data-squire="${i}">Take ${esc(c.name)}</button></article>`).join('')}`
    : '<p class="empty">No boy has been offered to you this winter.</p>'}
  </section>

  ${state.patron ? `<section class="card stack">
    <div class="eyebrow">Your patron</div>
    <p class="small">You ride in ${esc(patronDef(state).livery)}. He paid you ${lsd(patronDef(state).fee)} this winter. ${state.patron.strikes ? `You have missed ${state.patron.strikes} of what he asked.` : 'You have missed nothing he asked.'}</p>
    <button class="btn quiet" data-act="resign">Leave his service (his favour \u2212${-PATRONAGE.resignFavour})</button>
  </section>` : ''}

  ${renderLands(state)}

  <section class="card stack">
    <div class="eyebrow">Your retinue</div>
    <p class="small muted">${expected ? `A knight of renown ${state.renown} is expected at the great tourneys with ${expected} in his retinue; you keep ${state.retinue.length}.` : 'Nobody yet expects you to arrive attended.'} Wages are paid a year in advance.</p>
    ${RETINUE_ORDER.map((r) => {
      const def = RETINUE[r];
      const has = state.retinue.includes(r);
      return `<div class="rider"><div style="flex:1"><div class="nm">${def.label} <span class="small muted">${lsd(def.wage)} a year</span></div>
        <div class="small muted">${esc(def.does)}</div></div>
        ${has ? `<button class="btn quiet" data-dismiss="${r}">Let go</button>` : `<button class="btn" data-hire="${r}">Hire</button>`}</div>`;
    }).join('')}
  </section>

  <section class="card stack">
    <div class="eyebrow">The armourers</div>
    <p class="small">${esc(state.harness.label || 'Your harness')}: quality ${state.harness.quality}. Every point over 9 makes a fall a twentieth less likely to hurt you.</p>
    ${HARNESS.market.filter((h) => h.quality > state.harness.quality).map((h) => `<div class="rider"><div style="flex:1">
      <div class="nm">${esc(h.label)}</div><div class="small muted">Quality ${h.quality} · ${lsd(h.price)} · ready by spring</div></div>
      <button class="btn" data-harness="${h.id}">Order it</button></div>`).join('') || '<p class="empty">No armourer in Lothmere can better what you wear.</p>'}
  </section>

  <section class="card stack">
    <div class="eyebrow">The horse fair</div>
    <p class="small">${esc(state.horse.name)}: quality ${state.horse.quality}${state.horse.potential > state.horse.quality ? ` (can grow to ${state.horse.potential})` : ''}, ${state.horse.age} years old, ${state.horse.temper}.
      ${state.horse.borrowed ? '' : `A dealer would give ${lsd(horseTradeIn(state))} for him.`}</p>
    ${state.horse.borrowed ? `<div class="card inset stack"><p class="small">${esc(state.horse.name)} is borrowed, and his owner wants him back by spring.</p>
      <button class="btn" data-act="keep-horse">Buy him for ${lsd(borrowedHorsePrice(state))}</button>
      <p class="small muted">Or buy another below. If you do neither, you ride a hired hack of quality 7 until you do.</p></div>` : ''}
    ${w.horses.map((h) => `<div class="rider"><div style="flex:1">
      <div class="nm">${esc(h.name)} <span class="small muted">quality ${h.quality}</span></div>
      <div class="small muted">${h.age} years old, ${h.temper} · ${lsd(h.price)}${horseTradeIn(state) ? `, ${lsd(h.price - horseTradeIn(state))} with yours in part-exchange` : ''}</div></div>
      <button class="btn" data-horse="${h.id}">Buy</button></div>`).join('')}
  </section>

  ${renderRetire(state, ui)}

  ${retirement(state).must
    ? '<button class="btn primary wide" data-act="spring">Hang up your lance</button>'
    : '<button class="btn primary wide" data-act="spring">Ride out in spring</button>'}`;
}

/** The Company of the Swan at Candlemas. */
function renderSwan(state) {
  const o = state.order;
  if (!o) return '';
  const empty = vacancies(state);
  const el = eligibility(state);
  const held = 24 - empty.length;
  let body = '';
  if (o.companion) {
    body = `<p class="small">You hold a stall in the chapel at Kingsmead, since the ${ordinal(o.since)} year. Your helm and crest hang above it. Keep your honour above ${ORDER.degradeBelow - 1}, or the chapter will put you out.</p>`;
  } else if (!empty.length) {
    body = `<p class="small muted">Every stall is filled this winter. ${el.ok ? 'The chapter would hear your name if one fell empty.' : esc(el.reason)}</p>`;
  } else if (!el.ok) {
    body = `<p class="small muted">${esc(el.reason)}</p>`;
  }
  let chapter = '';
  const plain = reckonChapter(state);
  if (plain) {
    const fed = o.table === state.year ? null : reckonChapter(state, { table: true });
    const ids = chapterCandidates(state);
    chapter = `
      <p class="small">The chapter meets at Candlemas, and the heralds have put your name before it. <b>They reckon your chance of a stall at ${pct(plain.chance)}.</b></p>
      <div class="table-wrap"><table class="roll"><tbody>
        ${ids.map((id) => {
          if (id === YOU_SEAT) return `<tr class="me"><td>You</td><td class="small">renown ${state.renown}, ${state.year} years a knight</td><td class="rn">${plain.votes[id].toFixed(1)}</td></tr>`;
          const k = state.roster.knights.find((x) => x.id === id);
          return `<tr><td>${esc(k.name)}</td><td class="small">renown ${k.renown}, ${Math.max(0, k.age - ORDER.vote.knightedAt)} years${k.allegiance ? `, ${esc(FACTION_LABELS[k.allegiance])}’s man` : ''}</td><td class="rn">${plain.votes[id].toFixed(1)}</td></tr>`;
        }).join('')}
      </tbody></table></div>
      <p class="small faint">The last column is the heralds’ reckoning of the first vote, out of ${plain.voters} voices. The lords vote their houses; the knights vote renown, years, their own house, and their friends. Your honour and your favour with the great houses count for you.</p>
      ${o.table === state.year ? '<p class="small">You have kept a table for the companions.</p>'
        : `<button class="btn" data-act="swan-table" ${state.purse >= ORDER.table.cost ? '' : 'disabled'}>Keep a table for the companions at Candlemas (${lsdSigned(-ORDER.table.cost)}; your chance becomes ${pct(fed.chance)})</button>`}`;
  }
  return `<section class="card stack">
    <div class="spread"><span class="eyebrow">The Company of the Swan</span><span class="small muted">${held} of 24 stalls held</span></div>
    ${empty.length ? `<p class="small">${empty.length === 1 ? 'One stall is' : `${empty.length} stalls are`} empty: ${esc(empty.map((st) => `${st.was}’s`).join(', '))}.</p>` : ''}
    ${body}
    ${chapter}
  </section>`;
}

/** A vow on the swans for the coming year. */
function renderVows(state) {
  const next = state.vow && state.vow.year > state.year ? vowDef(state.vow.id) : null;
  if (next) {
    return `<section class="card stack">
      <div class="eyebrow">A vow on the swans</div>
      <p class="voice">You will vow ${esc(next.title.charAt(0).toLowerCase() + next.title.slice(1))}</p>
      <p class="small muted">Kept: renown ${signed(next.kept.renown)}, honour ${signed(next.kept.honour)}. Broken: renown ${signed(next.broken.renown)}, honour ${signed(next.broken.honour)}.</p>
      <button class="btn quiet" data-act="unvow">Think better of it before Candlemas</button>
    </section>`;
  }
  return `<section class="card stack">
    <div class="eyebrow">A vow on the swans</div>
    <p class="small muted">At the Candlemas feast two swans are carried in on a silver dish, and the knights make their vows on them for the year. None is required. A vow kept is renown and honour; a vow broken costs more than it would have paid.</p>
    <details class="vows">
      <summary>The vows a knight might make</summary>
      ${vowOptions(state).map((v) => `
      <article class="opt stack">
        <div class="subhead">${esc(v.title)}</div>
        <div class="small muted">${esc(v.blurb)}</div>
        <div class="small">Kept: renown ${signed(v.kept.renown)}, honour ${signed(v.kept.honour)}. Broken: renown ${signed(v.broken.renown)}, honour ${signed(v.broken.honour)}.</div>
        ${v.open ? `<button class="btn" data-vow="${v.id}">Make this vow</button>` : `<p class="small faint">${esc(v.reason)}</p>`}
      </article>`).join('')}
    </details>
  </section>`;
}

/** Hanging up the lance. */
function renderRetire(state, ui = {}) {
  const r = retirement(state);
  const e = endingFor(state);
  if (!r.may) return `<p class="small faint center">You are ${state.knight.age}. A knight may hang up his lance from ${r.from}; past ${r.always} the heralds will not enter his name.</p>`;
  return `<section class="card stack">
    <div class="eyebrow">${r.must ? 'Your last winter in the lists' : 'Hang up your lance'}</div>
    <p class="small">${r.must
      ? `You are ${state.knight.age}. The heralds will not enter your name again. When you leave this winter, it is for home.`
      : `You are ${state.knight.age}. You may ride another season, or ${r.years} more at most, or go home now while the heralds still cry your name.`}</p>
    <p class="small">If you retired now, the heralds would write: <b>${esc(e.title)}</b>.</p>
    ${r.must ? '' : ui.confirmRetire
      ? `<div class="confirm"><button class="btn danger" data-act="retire-yes">Hang up my lance</button><button class="btn quiet" data-act="retire-no">One more season</button></div>`
      : '<button class="btn quiet" data-act="retire">Hang up your lance</button>'}
  </section>`;
}

/** Land and men: what you hold, of whom, and the company it keeps. */
function renderLands(state) {
  const w = state.winter;
  const lands = state.lands || [];
  const max = companyMax(state);
  const heldOf = (l) => (l.heldOf ? `held of ${FACTION_LABELS[l.heldOf]}` : 'your own');
  const offer = w.manor;
  return `<section class="card stack">
    <div class="eyebrow">Lands and men</div>
    ${lands.length ? lands.map((l) => {
      const m = manorDef(l.id);
      return `<div class="rider"><div style="flex:1"><div class="nm">${esc(m.name)} <span class="small muted">${esc(heldOf(l))}</span></div>
        <div class="small muted">Rents ${lsd(m.income * 240)} a year · ${m.men} men owe you service</div></div></div>`;
    }).join('') : '<p class="small muted">You hold no land. Land comes by marriage, by a lord’s grant after years of service, by the king’s hand, by purchase, or by war. Land held of a lord falls with him.</p>'}
    <p class="small">Men-at-arms of your own: <b>${state.company || 0}</b> of the ${max} your lands can keep, at ${lsd(COMPANY.wage)} a year each. With your tenants you would bring <b>${menOf(state)}</b> men to a muster.</p>
    <div class="row">
      <button class="btn" data-act="hire-man" ${(state.company || 0) < max && state.purse >= COMPANY.wage ? '' : 'disabled'}>Take on a man (${lsdSigned(-COMPANY.wage)})</button>
      <button class="btn quiet" data-act="dismiss-man" ${state.company ? '' : 'disabled'}>Let one go</button>
    </div>
    <p class="small">Archers: <b>${state.archers || 0}</b> of the ${archersMax(state)} your lands can keep, at ${lsd(ARCHERS.wage)} a year each. An archer counts for half a man-at-arms in a battle line.</p>
    <div class="row">
      <button class="btn" data-act="hire-archer" ${(state.archers || 0) < archersMax(state) && state.purse >= ARCHERS.wage ? '' : 'disabled'}>Take on an archer (${lsdSigned(-ARCHERS.wage)})</button>
      <button class="btn quiet" data-act="dismiss-archer" ${state.archers ? '' : 'disabled'}>Let one go</button>
    </div>
    ${offer ? `<div class="card inset stack"><p class="small"><b>For sale:</b> the manor of ${esc(offer.name)}. Rents ${lsd(offer.income * 240)} a year, ${offer.men} men owe service, room for ${COMPANY.perManor} more of your own. ${lsd(offer.price)}.</p>
      <button class="btn" data-act="buy-manor" ${state.purse >= offer.price ? '' : 'disabled'}>Buy ${esc(offer.name)}</button></div>`
      : `<p class="small faint">${atWar(state) ? 'Nobody sells land in a war.' : 'No manor is for sale this winter.'}</p>`}
  </section>`;
}

export function rollTable(rows) {
  return `<div class="table-wrap"><table class="roll"><tbody>${rows.map((r, i) => `
    <tr class="${r.id === 'you' ? 'me' : ''}"><td class="rk">${i + 1}</td><td>${shield(r.arms, 16)}</td>
    <td>${esc(r.name)}${r.titles ? ` <span class="small faint">${r.titles} prize${r.titles === 1 ? '' : 's'}</span>` : ''}</td><td class="rn">${r.renown}</td></tr>`).join('')}
  </tbody></table></div>`;
}

