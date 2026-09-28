// The knight's sheet, the field, the Book of Feats, and the cards.

import { STAT_LABELS, STAT_USES, TRAIT_PAIRS, HORSES, HEART_LABELS, AMBITION_LABELS } from '../data/creation.data.js';
import { FACTION_LABELS, TOWNS } from '../data/world.data.js';
import { RETINUE, SQUIRE, CONDITION } from '../data/household.data.js';
import { lsdSigned } from '../engine/money.js';
import { TEMPERAMENTS } from '../data/field.data.js';
import { TEMPERS, ARCHETYPES } from '../data/joust.data.js';
import { fullName, provinceName, FLAG_LABELS, STAT_KEYS } from '../engine/knight.js';
import { blazon } from '../engine/heraldry.js';
import { rollOfArms, regardLabel } from '../engine/field.js';
import { conductOf, patronDef, threadsOf } from '../engine/court.js';
import { THREADS } from '../data/court.data.js';
import { markCost } from '../engine/tourney.js';
import { cardById, fill, choicesView } from '../engine/cards.js';
import { importance, manorDef } from '../engine/realm.js';
import { eligibility } from '../engine/order.js';
import { vowDef } from '../engine/vows.js';
import { CLAIMANTS } from '../data/realm.data.js';
import { esc, cap, pct, shield, signed, chips, tierChip, ordinal } from './view.js';
import { rollTable } from './hub.js';

// ---------------------------------------------------------------------------
// The sheet
// ---------------------------------------------------------------------------

export function renderSheet(s, { inGame, confirmAbandon = false }) {
  const k = s.knight;
  const h = s.horse;
  const horseDef = HORSES[h.kind];
  const ambition = AMBITION_LABELS[s.ambition];
  const heart = HEART_LABELS[s.heart];
  const favours = Object.entries(s.favour).filter(([, v]) => v !== 0);
  const c = s.career;
  const marks = k.marks || {};
  return `
  <section class="card stack-lg">
    <div class="arms-block">
      ${shield(s.arms, 84)}
      <div class="stack" style="gap:4px">
        <div class="subhead">${esc(fullName(k))}</div>
        <div class="muted small">Of ${esc(provinceName(s.province))}, aged ${k.age}</div>
        <div class="blazon small">${esc(blazon(s.arms))}</div>
      </div>
    </div>

    <div class="stack">
      <div class="eyebrow">Skills, out of 20</div>
      <div class="statlist">
        ${STAT_KEYS.map((key) => `
          <span class="n">${STAT_LABELS[key]}</span>
          <span class="meter"><i style="width:${(k.stats[key] / 20) * 100}%"></i></span>
          <span class="v">${k.stats[key]}</span>
          <span class="use">${esc(STAT_USES[key])}${inGame ? ` <span class="faint">Practice ${Number.isInteger(marks[key]) ? marks[key] : (marks[key] || 0).toFixed(1)} of ${markCost(k.stats[key])} to the next point.</span>` : ''}</span>`).join('')}
      </div>
    </div>

    <div class="stack">
      <div class="eyebrow">Horse and harness</div>
      <p><span class="voice" style="font-size:1.1rem">${esc(cap(h.name))}</span>${horseDef ? `, ${esc(horseDef.label.toLowerCase())}` : ''}.
        Quality ${h.quality}${h.potential > h.quality ? ` (can grow to ${h.potential})` : ''}, ${TEMPERS[h.temper].label}, ${h.age} years old${inGame ? `, condition ${h.condition ?? CONDITION.max}/10` : ''}.</p>
      <p class="small muted">${h.temper === 'hot'
        ? 'A hot horse gives a pressed charge more bite, and puts more lances on the tilt.'
        : 'A steady horse keeps your point off the tilt.'}${h.borrowed ? ' He is borrowed, and must be bought or returned in your first winter.' : ''}
        Every bout wears him; a month without a tourney brings him back.</p>
      ${inGame ? `<p class="small">${esc(s.harness.label || 'Your harness')}: quality ${s.harness.quality}.</p>` : ''}
    </div>

    ${inGame ? `
    <div class="stack">
      <div class="eyebrow">Household</div>
      ${s.squire ? `<p>Your squire, <span class="voice">${esc(s.squire.name)}</span>, ${s.squire.age}: lance ${s.squire.lance}, seat ${s.squire.seat}, wits ${s.squire.wits}. ${s.squire.years} of ${SQUIRE.knightAt} years served; you are teaching him ${s.squire.focus}.</p>`
        : '<p class="small muted">No squire yet. Boys are offered in winter.</p>'}
      ${s.retinue.length ? `<p>Retinue: ${s.retinue.map((r) => RETINUE[r].label.toLowerCase()).join(', ')}.</p>` : '<p class="small muted">No retinue. Retainers are hired in winter.</p>'}
    </div>` : ''}

    <div class="stack">
      <div class="eyebrow">Standing</div>
      <dl class="kv">
        <dt>Renown</dt><dd>${s.renown} <span class="small faint">— won in the lists; a tenth fades each winter, and a quarter of anything over 100</span></dd>
        <dt>Honour</dt><dd>${s.honour} \u00b7 <b>${esc(conductOf(s.honour).label)}</b> <span class="small faint">\u2014 ${esc(conductOf(s.honour).does)}</span></dd>
        ${inGame ? `<dt>Service</dt><dd>${s.patron ? `${esc(cap(patronDef(s).name))}, in ${esc(patronDef(s).livery)}, since year ${s.patron.since}` : 'You serve no one'}</dd>` : ''}
        <dt>Lineage</dt><dd>${s.lineage} <span class="small faint">— counts toward your standing in the realm</span></dd>
        ${favours.length ? `<dt>Favour</dt><dd>${favours.map(([f, v]) => `${esc(FACTION_LABELS[f])} ${signed(v)}`).join(', ')}</dd>` : ''}
        ${inGame && s.order ? `<dt>The Swan</dt><dd>${s.order.companion ? `A companion, since the ${ordinal(s.order.since)} year` : s.order.degraded ? 'Put out of the Company' : esc(swanWords(s))}</dd>` : ''}
        ${inGame && s.vow ? `<dt>Vow</dt><dd>${esc(vowDef(s.vow.id).title)} <span class="small faint">(for year ${s.vow.year})</span></dd>` : ''}
        ${inGame && s.career.rollFirst ? `<dt>The Roll</dt><dd>First of all the knights in Lothmere, ${s.career.rollFirst} winter${s.career.rollFirst === 1 ? '' : 's'}</dd>` : ''}
      </dl>
    </div>

    ${inGame ? renderStanding(s) : ''}

    <div class="stack">
      <div class="eyebrow">Character</div>
      <div class="traits">
        ${TRAIT_PAIRS.map(([a, b]) => `
          <span class="l">${cap(a)} ${Math.round(k.traits[a])}</span>
          <span class="traitbar" title="${cap(a)} ${Math.round(k.traits[a])}, ${cap(b)} ${Math.round(20 - k.traits[a])}"><i style="left:${100 - (k.traits[a] / 20) * 100}%"></i></span>
          <span>${cap(b)} ${Math.round(20 - k.traits[a])}</span>`).join('')}
      </div>
      <p class="small faint">Your choices move these, slowly, and the further from the middle the slower. Some answers are open only to a knight strong in one; some trials test them. At 18 the heralds give you a byname.</p>
    </div>

    <div class="stack">
      <div class="eyebrow">Your story</div>
      <p class="voice">Squire to ${esc(s.master.name)}, ${esc(s.master.epithet)}${s.master.fate === 'dead' ? ', now in his grave' : ''}.</p>
      ${heart ? `<p class="voice">Your heart: ${esc(heart)}${s.betrothed && (s.heart === 'promised' || s.heart === 'married') ? `, to the lady ${esc(s.betrothed)}` : ''}.</p>` : ''}
      ${ambition ? `<p class="voice">You want ${esc(ambition)}.</p>` : ''}
      ${threadsOf(s).map((t) => `<div class="thread"><span class="eyebrow">${esc(t.title)}</span><p class="voice">${esc(t.text)}</p></div>`).join('')}
      ${otherFlags(s).length ? `<ul class="small muted" style="margin:0;padding-left:18px">${otherFlags(s).map((f) => `<li>${esc(FLAG_LABELS[f] || f)}</li>`).join('')}</ul>` : ''}
    </div>

    ${inGame ? `
    <div class="stack">
      <div class="eyebrow">Career</div>
      <dl class="kv">
        <dt>Tourneys</dt><dd>${c.tourneys}${c.championships ? `, ${c.championships} won` : ''}</dd>
        <dt>Bouts</dt><dd>${c.boutsWon} won of ${c.bouts}</dd>
        <dt>Lances broken</dt><dd>${c.lances} in ${c.courses} courses</dd>
        <dt>Borne down</dt><dd>${c.unhorsed} rider${c.unhorsed === 1 ? '' : 's'}; you fell ${c.falls} time${c.falls === 1 ? '' : 's'}</dd>
      </dl>
    </div>
    <div class="stack">
      ${confirmAbandon ? `
        <p class="small">Abandon ${esc(fullName(k))}? The saved career on this device will be gone.</p>
        <div class="confirm"><button class="btn danger" data-act="abandon-yes">Abandon him</button>
        <button class="btn quiet" data-act="abandon-no">Keep riding</button></div>`
      : '<button class="btn quiet" data-act="abandon">Abandon this knight and start another</button>'}
      <button class="btn quiet" data-act="hints-on">Show the first-time hints again</button>
    </div>` : ''}
  </section>`;
}

function swanWords(s) {
  const el = eligibility(s);
  return el.ok ? 'The chapter would hear your name for an empty stall.' : el.reason;
}

/** Where you would stand if the realm came to swords, and why, term by term. */
function renderStanding(s) {
  const imp = importance(s);
  const r = s.realm;
  const lands = s.lands || [];
  return `
    <div class="stack">
      <div class="eyebrow">Standing in the realm</div>
      <p><b>${esc(imp.rank.label)}</b>. ${esc(imp.rank.does)}</p>
      <table class="ledger terms"><tbody>
        ${imp.terms.map((t) => `<tr><td>${esc(t.label)}</td><td>${t.value ? `+${Math.round(t.value * 10) / 10}` : '<span class="faint">0</span>'}</td></tr>`).join('')}
        <tr class="total"><td>Standing</td><td>${imp.score}</td></tr>
      </tbody></table>
      <p class="small muted">${imp.next ? `At ${imp.next.min}, ${esc(imp.next.label.toLowerCase())}: ${esc(imp.next.does.toLowerCase())}` : 'There is no higher place in a claimant’s counsel.'} Land and the men it keeps count for most; renown counts only so far.</p>
      ${lands.length ? `<p class="small">Lands: ${lands.map((l) => `${esc(manorDef(l.id).name)}${l.heldOf ? ` (of ${esc(FACTION_LABELS[l.heldOf])})` : ''}`).join(', ')}.</p>` : ''}
      ${r.war?.battles?.length ? `<p class="small">The war: ${r.war.battles.map((b) => `${esc(cap(b.name))}, won by ${esc(CLAIMANTS[b.victor].short)}${b.side ? (b.side === b.victor ? ', your side' : ', against your side') : ''}`).join('; ')}.</p>` : ''}
    </div>`;
}

// Story flags the threads above already tell; the list shows only the rest.
const THREAD_FLAGS = new Set([
  ...THREADS.flatMap((t) => t.stages.map((st) => st.flag).filter(Boolean)),
  'betrothed', 'masterDisgraced', 'ordealVow', 'aumbryRetainer', 'aumbryMan',
]);
function otherFlags(s) { return s.flags.filter((f) => !THREAD_FLAGS.has(f)); }

// ---------------------------------------------------------------------------
// The field
// ---------------------------------------------------------------------------

export function renderField(state) {
  const roll = rollOfArms(state, 20);
  const known = state.roster.knights
    .filter((k) => (state.intel[k.id] || 0) > 0 || k.regard !== 0 || k.memory.length)
    .sort((a, b) => Math.abs(b.regard) - Math.abs(a.regard) || b.renown - a.renown);
  const archOf = (k) => ARCHETYPES.find((a) => a.id === k.archetype);
  return `
  <section class="card stack">
    <div class="heading">The Roll of Arms</div>
    <p class="small muted">The field by renown. You stand ${ordinal(roll.rank)} of ${roll.of}.</p>
    ${rollTable(roll.rows)}
  </section>
  <section class="card stack">
    <div class="eyebrow">Knights you know</div>
    ${known.length ? known.map((k) => {
      const lvl = state.intel[k.id] || 0;
      const st = regardLabel(k.regard);
      return `<div class="rider">${shield(k.arms, 28)}<div style="flex:1;min-width:0">
        <div class="nm">${esc(k.name)} ${st ? `<span class="tag ${st === 'grudge' || st === 'cool' ? 'warn' : 'good'}">${st}</span>` : ''}${k.allegiance ? ` <span class="tag">${esc(FACTION_LABELS[k.allegiance])}\u2019s man</span>` : ''}${k.active ? '' : ' <span class="small faint">retired</span>'}</div>
        <div class="small muted">${k.age} · renown ${k.renown} · lance ${k.lance}, seat ${k.seat} · ${TEMPERAMENTS[k.temperament].label} · of ${esc(provinceName(k.province))}</div>
        <div class="small">${lvl ? `${esc(cap(archOf(k).label))}: ${esc(archOf(k).habit)}${lvl >= 2 && archOf(k).tells.length ? ` ${esc(archOf(k).tells.map((t) => t.text).join(' '))}` : ''}` : '<span class="faint">Habits unknown</span>'}</div>
        ${k.memory.map((m) => `<div class="small memory">${esc(m)}</div>`).join('')}
      </div></div>`;
    }).join('') : '<p class="empty">You know nobody yet. Ride, watch, and they will get to know you.</p>'}
  </section>`;
}

// ---------------------------------------------------------------------------
// The Book of Feats
// ---------------------------------------------------------------------------

export function renderBook(state) {
  if (!state.book.length) {
    return '<section class="card"><p class="empty">The heralds have written nothing yet. Ride in a tourney and they will.</p></section>';
  }
  return `
  <section class="card stack-lg">
    <div class="heading">The Book of Feats</div>
    ${[...state.book].reverse().map((e) => `
      <article class="book-entry">
        <div class="spread"><span class="eyebrow">Year ${e.year || e.season || 1}${e.feast ? ` · ${esc(e.feast)}` : ''}</span>
          ${e.tier && e.tier !== 'dubbing' ? tierChip(e.tier) : ''}</div>
        <p class="entry">${esc(e.text)}</p>
        ${e.net ? `<span class="small ${e.net >= 0 ? 'pos' : 'neg'}">${lsdSigned(e.net)}</span>` : ''}
      </article>`).join('')}
  </section>`;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

const CONTEXT_LABEL = {
  feast: 'The eve feast', arrival: 'On arrival', road: 'On the road', prize: 'The prize-giving',
  winter: 'Winter', court: 'At court', realm: 'The realm', war: 'The war',
};

export function renderCard(state) {
  const inst = state.pending.inst;
  const card = cardById(inst.id);
  const where = inst.ctx.town ? ` · ${esc(TOWNS[inst.ctx.town].name)}` : '';
  const label = CONTEXT_LABEL[inst.context] || 'In the lists';
  const views = choicesView(state, inst);
  return `
  <section class="card lift stack-lg cardscene">
    <div class="eyebrow">${label}${where}</div>
    <p class="scene">${esc(fill(state, inst, card.text))}</p>
    <div class="stack">
      ${views.filter((v) => v.open).map((v) => `
        <button class="answer" data-answer="${v.index}">
          <span class="t">${esc(fill(state, inst, v.label))}</span>
          ${v.gate ? `<span class="gate">Open to you because you are ${esc(v.gate.trait)} (${Math.round(v.gate.value)})</span>` : ''}
          ${v.check ? `<span class="check">${esc(v.check.label)} ${Math.round(v.check.value)} against ${v.check.dc}: <b>${pct(v.check.chance)}</b></span>
            <span class="branch"><span class="small faint">If it goes well</span>${chips(v.success)}</span>
            <span class="branch"><span class="small faint">If not</span>${chips(v.failure, 'bad')}</span>`
          : chips(v.effects)}
        </button>`).join('')}
    </div>
  </section>`;
}

export function renderResultNote(state) {
  const r = state.lastResult;
  const notices = (state.notices || []).length
    ? `<section class="card resultnote warnnote stack"><div class="eyebrow">Word comes</div>${state.notices.map((n) => `<p class="small">${esc(n)}</p>`).join('')}</section>`
    : '';
  if (!r) return notices;
  return `${notices}
  <section class="card resultnote stack">
    ${r.title ? `<div class="eyebrow">${esc(r.title)}</div>` : r.chose ? `<div class="eyebrow">You chose: ${esc(r.chose)}</div>` : ''}
    ${r.success != null ? `<div class="small ${r.success ? 'pos' : 'neg'}">${r.success ? 'It went well.' : 'It did not go your way.'}</div>` : ''}
    <p class="voice">${esc(r.text)}</p>
    ${chips(r.lines)}
  </section>`;
}
