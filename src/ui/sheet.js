// The knight's sheet, the field, the Book of Feats, and the cards.

import { QUESTIONS, STAT_LABELS, STAT_USES, TRAIT_PAIRS, HORSES } from '../data/creation.data.js';
import { FACTION_LABELS, TOWNS } from '../data/world.data.js';
import { RETINUE, SQUIRE, CONDITION } from '../data/household.data.js';
import { lsdSigned } from '../engine/money.js';
import { TEMPERAMENTS } from '../data/field.data.js';
import { TEMPERS, ARCHETYPES } from '../data/joust.data.js';
import { fullName, provinceName, FLAG_LABELS, STAT_KEYS } from '../engine/knight.js';
import { blazon } from '../engine/heraldry.js';
import { rollOfArms, regardLabel } from '../engine/field.js';
import { markCost } from '../engine/tourney.js';
import { cardById, fill, choicesView } from '../engine/cards.js';
import { esc, cap, pct, shield, signed, chips, tierChip, ordinal } from './view.js';
import { rollTable } from './hub.js';

// ---------------------------------------------------------------------------
// The sheet
// ---------------------------------------------------------------------------

export function renderSheet(s, { inGame, confirmAbandon = false }) {
  const k = s.knight;
  const h = s.horse;
  const horseDef = HORSES[h.kind];
  const ambition = QUESTIONS.find((q) => q.id === 'ambition').options.find((o) => o.id === s.ambition);
  const heart = QUESTIONS.find((q) => q.id === 'heart').options.find((o) => o.id === s.heart);
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
      <p><span class="voice" style="font-size:1.1rem">${esc(h.name)}</span>${horseDef ? `, ${esc(horseDef.label.toLowerCase())}` : ''}.
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
        <dt>Renown</dt><dd>${s.renown} <span class="small faint">— won in the lists; a tenth fades each winter</span></dd>
        <dt>Honour</dt><dd>${s.honour} <span class="small faint">— lost by conduct; the heralds remember</span></dd>
        <dt>Lineage</dt><dd>${s.lineage} <span class="small faint">— opens the high tourneys at 14</span></dd>
        ${favours.length ? `<dt>Favour</dt><dd>${favours.map(([f, v]) => `${esc(FACTION_LABELS[f])} ${signed(v)}`).join(', ')}</dd>` : ''}
      </dl>
    </div>

    <div class="stack">
      <div class="eyebrow">Character</div>
      <div class="traits">
        ${TRAIT_PAIRS.map(([a, b]) => `
          <span class="l">${cap(a)} ${k.traits[a]}</span>
          <span class="traitbar" title="${cap(a)} ${k.traits[a]}, ${cap(b)} ${20 - k.traits[a]}"><i style="left:${100 - (k.traits[a] / 20) * 100}%"></i></span>
          <span>${cap(b)} ${20 - k.traits[a]}</span>`).join('')}
      </div>
      <p class="small faint">Your choices move these, and some trials test them: a denial before the heralds is judged on honesty.</p>
    </div>

    <div class="stack">
      <div class="eyebrow">Your story</div>
      <p class="voice">Squire to ${esc(s.master.name)}, ${esc(s.master.epithet)}${s.master.fate === 'dead' ? ', now in his grave' : ''}.</p>
      ${heart ? `<p class="voice">Your heart: ${esc(heart.title.toLowerCase())}${s.betrothed ? `, to the lady ${esc(s.betrothed)}` : ''}.</p>` : ''}
      ${ambition ? `<p class="voice">You want ${esc(ambition.title.charAt(0).toLowerCase() + ambition.title.slice(1))}.</p>` : ''}
      ${s.flags.length ? `<ul class="small muted" style="margin:0;padding-left:18px">${s.flags.map((f) => `<li>${esc(FLAG_LABELS[f] || f)}</li>`).join('')}</ul>` : ''}
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
    </div>` : ''}
  </section>`;
}

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
        <div class="nm">${esc(k.name)} ${st ? `<span class="tag ${st === 'grudge' || st === 'cool' ? 'warn' : 'good'}">${st}</span>` : ''}${k.active ? '' : ' <span class="small faint">retired</span>'}</div>
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
  winter: 'Winter', court: 'At court',
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
          ${v.check ? `<span class="check">${esc(v.check.label)} ${v.check.value} against ${v.check.dc}: <b>${pct(v.check.chance)}</b></span>
            <span class="branch"><span class="small faint">If it goes well</span>${chips(v.success)}</span>
            <span class="branch"><span class="small faint">If not</span>${chips(v.failure, 'bad')}</span>`
          : chips(v.effects)}
        </button>`).join('')}
    </div>
  </section>`;
}

export function renderResultNote(state) {
  const r = state.lastResult;
  if (!r) return '';
  return `
  <section class="card resultnote stack">
    ${r.title ? `<div class="eyebrow">${esc(r.title)}</div>` : r.chose ? `<div class="eyebrow">You chose: ${esc(r.chose)}</div>` : ''}
    ${r.success != null ? `<div class="small ${r.success ? 'pos' : 'neg'}">${r.success ? 'It went well.' : 'It did not go your way.'}</div>` : ''}
    <p class="voice">${esc(r.text)}</p>
    ${chips(r.lines)}
  </section>`;
}
