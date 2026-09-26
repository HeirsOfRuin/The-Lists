// The controller: which screen is up, what the player has provisionally
// picked, and handing each decision to the engine.
//
// No number in the lists is computed here. The odds, the squire's reckoning
// and the ledger all come from the engine (derive.js, tourney.js), so what the
// player is shown and what the course resolves are the same arithmetic.

import { newGame, STATUS, saveToStorage, loadFromStorage, clearStorage } from '../engine/state.js';
import { QUESTIONS, STAT_LABELS, STAT_USES, TRAIT_PAIRS, HORSES } from '../data/creation.data.js';
import {
  describeOption, availableOptions, randomName, fullName, provinceName, FLAG_LABELS, STAT_KEYS,
} from '../engine/knight.js';
import { makeRng } from '../engine/rng.js';
import {
  enterTourney, playCourse, continueTourney, rideOn, buyHeraldRead, heraldReadCost, entryCost,
  canEnter, currentBout, STAGE, YOU, ROUND_NAMES,
} from '../engine/tourney.js';
import { coursePreview, reckonNow, knownOf, tellsInPlay } from '../engine/derive.js';
import { AIM_IDS, SEAT_IDS, choiceByKey, fatigueThreshold } from '../engine/joust.js';
import { AIMS, SEATS, ORDINANCE, TEMPERS } from '../data/joust.data.js';
import { PROVINCIAL, EVENTS_PER_SEASON } from '../data/tourney.data.js';
import { WORLD, FACTION_LABELS } from '../data/world.data.js';
import { shieldSvg, blazon } from '../engine/heraldry.js';
import { lsd, lsdSigned } from '../engine/money.js';
import { callCourse, HOW } from '../engine/herald.js';

const app = document.getElementById('app');

let state = null;
let screen = 'title'; // title | create | game
let tab = 'lists';    // lists | knight | book
let create = null;    // { step, answers, name, seed, nameSeed }
let pick = { aim: 'shield', seat: 'balanced' };
let charging = false;
let confirmAbandon = false;
let uid = 0;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function pct(p) {
  if (p > 0 && p < 0.005) return '<1%';
  if (p < 1 && p > 0.995) return '>99%';
  return `${Math.round(p * 100)}%`;
}
function shield(arms, size) { return shieldSvg(arms, { size, uid: `s${++uid}` }); }
function signed(n) { return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0'; }
function save() { if (state) saveToStorage(state); }

const HOW_SHORT = {
  points: 'on points', unhorse: 'unhorsed him', forfeit: 'by forfeit',
  heralds: 'by the heralds’ judgement', walkover: 'by walkover',
};
const PLACING = {
  champion: 'Champion',
  runnerUp: 'The last two',
  semi: 'The last four',
  quarter: 'Put out in the first round',
};

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

function renderTitle() {
  const saved = loadFromStorage();
  const s = saved.ok ? saved.state : null;
  app.innerHTML = `
  <div class="title-screen stack-lg">
    <div class="stack">
      <div class="eyebrow">${esc(WORLD.kingdom)} · the ${ordinal(WORLD.peaceYear)} year of the peace</div>
      <h1>The Lists</h1>
    </div>
    <p class="lede">The war is twenty years over. The knights who fought it have taught their squires
      the only fighting left: a circuit of tourneys where a lance on the helm pays better than a battle
      ever did, and the heralds write down everything you do.</p>
    ${s ? `
    <section class="card stack">
      <div class="eyebrow">Carry on</div>
      <div class="arms-block">${shield(s.arms, 44)}
        <div><div class="subhead">${esc(fullName(s.knight))}</div>
        <div class="muted small">Season ${s.season} · ${s.eventsEntered} tourney${s.eventsEntered === 1 ? '' : 's'} ridden · ${lsd(s.purse)}${s.status !== STATUS.ACTIVE ? ' · ruined' : ''}</div></div>
      </div>
      <button class="btn primary" data-act="resume">${s.status === STATUS.ACTIVE ? 'Ride on' : 'See how it ended'}</button>
    </section>` : ''}
    ${!saved.ok && !/no saved/.test(saved.reason) ? `<p class="small neg">A saved knight could not be read: ${esc(saved.reason)}</p>` : ''}
    <button class="btn ${s ? '' : 'primary'} wide" data-act="new">A new knight</button>
    <p class="small faint build-note">This is the first of six builds: your knight, and the provincial
      circuit. The season’s accounts, the court, the story and the mêlée come after.</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

function startCreate() {
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  create = { step: 0, answers: {}, name: randomName(makeRng(seed)), seed, nameSeed: seed };
}

function progressBar() {
  const n = QUESTIONS.length + 1;
  let out = '';
  for (let i = 0; i < n; i++) out += `<span class="${i < create.step ? 'on' : ''}"></span>`;
  return `<div class="progress" aria-hidden="true">${out}</div>`;
}

function renderCreate() {
  const step = create.step;
  if (step === 0) {
    app.innerHTML = `
    <div class="stack-lg">
      ${progressBar()}
      <div class="stack">
        <div class="eyebrow">Your name</div>
        <p class="question">You knelt a squire and rose a knight. What will the heralds cry?</p>
      </div>
      <div class="stack">
        <div class="field"><label for="given">Given name</label>
          <input id="given" autocomplete="off" value="${esc(create.name.given)}" /></div>
        <div class="field"><label for="house">House</label>
          <input id="house" autocomplete="off" value="${esc(create.name.house)}" /></div>
        <button class="btn quiet" data-act="another-name">Another name</button>
      </div>
      <button class="btn primary wide" data-act="name-next">Answer for yourself</button>
      <button class="btn quiet" data-act="title">Back to the title</button>
    </div>`;
    return;
  }
  if (step <= QUESTIONS.length) {
    const q = QUESTIONS[step - 1];
    const opts = availableOptions(q.id, create.answers);
    app.innerHTML = `
    <div class="stack-lg">
      ${progressBar()}
      <div class="stack">
        <div class="eyebrow">Question ${step} of ${QUESTIONS.length}</div>
        <p class="question">${esc(q.prompt)}</p>
      </div>
      <div class="stack">
        ${opts.map((o) => `
        <button class="option" data-opt="${o.id}" aria-pressed="${create.answers[q.id] === o.id}">
          <span class="t">${esc(o.title)}</span>
          <span class="b">${esc(o.blurb)}</span>
          <span class="chips">${describeOption(o).map((l) => `<span class="chip ${/^Story|^Steers/.test(l) ? 'story' : ''}">${esc(l)}</span>`).join('')}</span>
        </button>`).join('')}
      </div>
      <button class="btn quiet" data-act="back">Back</button>
    </div>`;
    return;
  }
  const preview = newGame({ seed: create.seed, answers: create.answers, name: create.name });
  create.preview = preview;
  app.innerHTML = `
  <div class="stack-lg">
    ${progressBar()}
    <div class="stack">
      <div class="eyebrow">The heralds’ roll</div>
      <p class="question">This is the knight who rides out.</p>
    </div>
    ${renderSheet(preview, { inGame: false })}
    <button class="btn primary wide" data-act="ride-out">Ride to ${esc(preview.event.town)}</button>
    <button class="btn quiet" data-act="restart-answers">Change my answers</button>
  </div>`;
}

function chooseOption(id) {
  const q = QUESTIONS[create.step - 1];
  create.answers[q.id] = id;
  // A later answer that this one no longer allows is dropped, not kept silently.
  for (const later of QUESTIONS.slice(create.step)) {
    const a = create.answers[later.id];
    if (a && !availableOptions(later.id, create.answers).some((o) => o.id === a)) delete create.answers[later.id];
  }
  create.step += 1;
}

// ---------------------------------------------------------------------------
// The knight's sheet (creation summary and the "Your knight" tab)
// ---------------------------------------------------------------------------

function renderSheet(s, { inGame }) {
  const k = s.knight;
  const h = s.horse;
  const horseDef = HORSES[h.kind];
  const ambition = QUESTIONS.find((q) => q.id === 'ambition').options.find((o) => o.id === s.ambition);
  const heart = QUESTIONS.find((q) => q.id === 'heart').options.find((o) => o.id === s.heart);
  const favours = Object.entries(s.favour).filter(([, v]) => v !== 0);
  const c = s.career;
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
          <span class="use">${esc(STAT_USES[key])}</span>`).join('')}
      </div>
    </div>

    <div class="stack">
      <div class="eyebrow">Horse</div>
      <p><span class="voice" style="font-size:1.1rem">${esc(h.name)}</span>, ${esc(horseDef.label.toLowerCase())}.
        Quality ${h.quality}${h.potential > h.quality ? ` (can grow to ${h.potential})` : ''},
        ${TEMPERS[h.temper].label}, ${h.age} years old.</p>
      <p class="small muted">${h.temper === 'hot'
        ? 'A hot horse gives a pressed charge more bite, and puts more lances on the tilt.'
        : 'A steady horse keeps your point off the tilt.'}${h.borrowed ? ' He is borrowed.' : ''}</p>
    </div>

    <div class="stack">
      <div class="eyebrow">Standing</div>
      <dl class="kv">
        <dt>Renown</dt><dd>${s.renown} <span class="small faint">— won in the lists</span></dd>
        <dt>Honour</dt><dd>${s.honour} <span class="small faint">— lost by conduct</span></dd>
        <dt>Lineage</dt><dd>${s.lineage} <span class="small faint">— gates the royal circuit, in the Season build</span></dd>
        ${favours.length ? `<dt>Favour</dt><dd>${favours.map(([f, v]) => `${esc(FACTION_LABELS[f])} ${signed(v)}`).join(', ')}</dd>` : ''}
      </dl>
    </div>

    <div class="stack">
      <div class="eyebrow">Character</div>
      <div class="traits">
        ${TRAIT_PAIRS.map(([a, b]) => `
          <span class="l">${cap(a)}</span>
          <span class="traitbar" title="${cap(a)} ${k.traits[a]}, ${cap(b)} ${20 - k.traits[a]}"><i style="left:${100 - (k.traits[a] / 20) * 100}%"></i></span>
          <span>${cap(b)}</span>`).join('')}
      </div>
      <p class="small faint">The heralds will judge these from the Court build on. They are set now by who you were.</p>
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
      : `<button class="btn quiet" data-act="abandon">Abandon this knight and start another</button>`}
    </div>` : ''}
  </section>`;
}

// ---------------------------------------------------------------------------
// The game shell
// ---------------------------------------------------------------------------

function banner() {
  const s = state;
  const fact = (k, v, cls = '') => `<span class="fact"><span class="k">${k}</span><span class="v ${cls}">${v}</span></span>`;
  const tabBtn = (id, label) => `<button class="tab" role="tab" data-tab="${id}" aria-selected="${tab === id}">${label}</button>`;
  return `
  <header class="banner">
    <div class="who">
      ${shield(s.arms, 30)}
      <div>
        <div class="name">${esc(fullName(s.knight))}</div>
        <div class="facts">
          ${fact('Purse', lsd(s.purse))}
          ${fact('Renown', s.renown)}
          ${fact('Honour', s.honour, s.honour < 10 ? 'neg' : '')}
          ${fact(`Season ${s.season}`, `${s.eventInSeason + 1} of ${EVENTS_PER_SEASON}`)}
        </div>
      </div>
    </div>
    <nav class="tabs" role="tablist">
      ${tabBtn('lists', 'The lists')}${tabBtn('knight', 'Your knight')}${tabBtn('book', `Book of Feats${s.book.length ? ` (${s.book.length})` : ''}`)}
    </nav>
  </header>`;
}

function renderGame() {
  let body = '';
  if (tab === 'knight') body = renderSheet(state, { inGame: true });
  else if (tab === 'book') body = renderBook();
  else body = renderLists();
  app.innerHTML = `${banner()}<main class="stack-lg">${body}</main>`;
}

function renderBook() {
  if (!state.book.length) {
    return `<section class="card"><p class="empty">The heralds have written nothing yet. Ride in a tourney and they will.</p></section>`;
  }
  return `
  <section class="card stack-lg">
    <div class="heading">The Book of Feats</div>
    ${[...state.book].reverse().map((e) => `
      <article class="book-entry">
        <div class="spread"><span class="eyebrow">Season ${e.season} · ${esc(e.feast)}</span>
          <span class="small ${e.net >= 0 ? 'pos' : 'neg'}">${lsdSigned(e.net)}</span></div>
        <p class="entry">${esc(e.text)}</p>
      </article>`).join('')}
  </section>`;
}

function renderLists() {
  if (state.status !== STATUS.ACTIVE) return renderEnding();
  const ev = state.event;
  switch (ev.stage) {
    case STAGE.ARRIVAL: return renderArrival(ev);
    case STAGE.BOUT: return renderBout(ev);
    case STAGE.RESULT: return renderResult(ev);
    case STAGE.DONE: return renderDone(ev);
    default: return `<section class="card"><p class="empty">The lists are empty: the tourney is in a state this build does not know (${esc(ev.stage)}).</p></section>`;
  }
}

function renderEnding() {
  const o = state.outcome;
  return `
  <section class="card lift stack-lg">
    <div class="verdict">Ruined</div>
    <p class="entry">${esc(o?.text || 'The career is over.')}</p>
    <dl class="kv">
      <dt>Seasons</dt><dd>${state.season}</dd>
      <dt>Tourneys</dt><dd>${state.career.tourneys}, ${state.career.championships} won</dd>
      <dt>Renown</dt><dd>${state.renown}</dd>
    </dl>
    <button class="btn primary wide" data-act="new-after-end">A new knight</button>
  </section>`;
}

// ---------------------------------------------------------------------------
// Arrival
// ---------------------------------------------------------------------------

function renderArrival(ev) {
  const costs = Object.entries(PROVINCIAL.costs);
  const labels = { entry: 'Entry to the heralds’ roll', lodging: 'Lodging, three nights', stabling: 'Stabling and the farrier', largesse: 'Largesse to the heralds' };
  const afford = canEnter(state);
  return `
  <section class="card lift stack-lg event-head">
    <div class="stack">
      <div class="eyebrow">Your ${ordinal(ev.serial)} tourney · ${esc(provinceName(ev.province))}</div>
      <div class="where">${esc(ev.town)}</div>
      <p class="voice subhead">For ${esc(ev.feast)}, at the invitation of ${esc(ev.host)}. Eight knights, three rounds, under ${esc(ORDINANCE.name)}.</p>
    </div>
    <div class="stack">
      <div class="eyebrow">The ordinance</div>
      <p class="small muted">A lance broken on the shield scores 1, on the helm 2. Bearing a man down wins the bout outright. A point on the tilt costs 1; a lance on the horse forfeits. Three courses, two more if level, then the heralds decide.</p>
    </div>
    <div class="stack">
      <div class="eyebrow">Prizes</div>
      <table class="ledger"><tbody>
        <tr><td>Champion: ${esc(PROVINCIAL.prizeLabels.champion)}</td><td>${lsd(PROVINCIAL.prizes.champion)}</td></tr>
        <tr><td>Runner-up</td><td>${lsd(PROVINCIAL.prizes.runnerUp)}</td></tr>
        <tr><td>The most helm strikes of the day, if one knight has them alone</td><td>${lsd(PROVINCIAL.prizes.helm)}</td></tr>
      </tbody></table>
    </div>
    <div class="stack">
      <div class="eyebrow">To ride, you pay</div>
      <table class="ledger"><tbody>
        ${costs.map(([k, v]) => `<tr><td>${labels[k]}</td><td>${lsd(v)}</td></tr>`).join('')}
        <tr class="total"><td>Now</td><td>${lsd(entryCost())}</td></tr>
      </tbody></table>
      <p class="small muted">Lances you break are ${PROVINCIAL.lancePrice}d each, settled at the end. The herald’s read of a rider is ${lsd(heraldReadCost(state))} to you.</p>
    </div>
    ${afford
      ? `<button class="btn primary wide" data-act="enter">Pay ${lsd(entryCost())} and ride</button>`
      : `<p class="neg">You have ${lsd(state.purse)} and cannot pay to ride.</p>`}
  </section>
  ${renderField(ev)}
  ${renderDraw(ev)}`;
}

function renderField(ev) {
  const ids = Object.keys(ev.riders).filter((id) => id !== YOU);
  const anyKnown = ids.some((id) => ev.intel[id] >= 1);
  return `
  <section class="card stack">
    <div class="eyebrow">The field</div>
    ${anyKnown ? '' : `<p class="small muted">You know none of these riders’ habits yet. You will learn them by watching them ride${state.knight.stats.lore < PROVINCIAL.loreKnowsHabits ? `, or know them on arrival once your lore reaches ${PROVINCIAL.loreKnowsHabits}` : ''}.</p>`}
    <div class="riders">
      ${ids.map((id) => {
        const r = ev.riders[id];
        const k = knownOf(state, id);
        return `<div class="rider">${shield(r.arms, 28)}<div>
          <div class="nm">${esc(r.name)}</div>
          <div class="small muted">Lance ${r.lance} · Seat ${r.seat} · Horse ${r.horse.quality}${r.horse.temper === 'hot' ? ', hot' : ''} · Renown ${r.renown}</div>
          <div class="small ${k.level ? '' : 'faint'}">${k.level ? `${esc(cap(k.label))}: ${esc(k.habit)}` : 'Habits unknown'}</div>
        </div></div>`;
      }).join('')}
    </div>
  </section>`;
}

function renderDraw(ev) {
  const name = (id) => (id === YOU ? 'You' : ev.riders[id].name);
  const rounds = [0, 1, 2].map((r) => {
    const pairs = ev.rounds[r];
    const title = cap(ROUND_NAMES[r]);
    if (!pairs) return `<div class="draw-round"><div class="eyebrow">${title}</div><div class="small faint">To be drawn from the winners.</div></div>`;
    return `<div class="draw-round"><div class="eyebrow">${title}</div>
      ${pairs.map((p) => {
        const mine = p.a === YOU || p.b === YOU;
        if (!p.winner) return `<div class="draw-line ${mine ? 'mine' : ''}"><span>${esc(name(p.a))}</span><span class="faint">v</span><span>${esc(name(p.b))}</span></div>`;
        const loser = p.winner === p.a ? p.b : p.a;
        return `<div class="draw-line ${mine ? 'mine' : ''}"><span class="w">${esc(name(p.winner))}</span><span class="faint">beat</span><span>${esc(name(loser))}</span><span class="faint small">${HOW_SHORT[p.bout.how]}${p.bout.how !== 'walkover' ? `, ${p.bout.scores[p.winner === p.a ? 'a' : 'b']}–${p.bout.scores[p.winner === p.a ? 'b' : 'a']}` : ''}</span></div>`;
      }).join('')}</div>`;
  });
  return `<section class="card stack"><div class="eyebrow">The draw</div>${rounds.join('')}</section>`;
}

// ---------------------------------------------------------------------------
// In the lists
// ---------------------------------------------------------------------------

function riderTags(r) {
  const tags = [];
  if (r.fatigue > fatigueThreshold(r)) tags.push('<span class="tag warn">tiring</span>');
  if (r.wound === 'light') tags.push('<span class="tag warn">bruised</span>');
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

function tiltCard(cb, { showCall }) {
  const { bout, you, him, roundName } = cb;
  const ev = state.event;
  const courseLabel = bout.done ? `${bout.course} course${bout.course === 1 ? '' : 's'} run`
    : bout.course >= ORDINANCE.courses ? `Course ${bout.course + 1}: level, so they ride again` : `Course ${bout.course + 1} of ${ORDINANCE.courses}`;
  return `
  <section class="card lift stack" id="tilt">
    <div class="spread"><span class="eyebrow">${esc(cap(roundName))}</span><span class="eyebrow">${courseLabel}</span></div>
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

function renderIntel(him) {
  const k = knownOf(state, him.id);
  const live = tellsInPlay(state);
  const cost = heraldReadCost(state);
  const canBuy = k.level < 2 && state.purse >= cost;
  const buy = k.level < 2 ? `<button class="btn" data-read="${him.id}" ${canBuy ? '' : 'disabled'}>Pay the herald for his read, ${lsd(cost)}</button>` : '';
  let body;
  if (k.level === 0) {
    body = `<p class="muted">You have never seen him ride. The odds below assume the field’s usual habits, which may not be his.</p>`;
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
  return `<section class="card intel"><div class="eyebrow">What you know of him</div>${body}${buy}</section>`;
}

function renderBout(ev) {
  const cb = currentBout(state);
  const r = reckonNow(state);
  const choice = choiceByKey(`${pick.aim}/${pick.seat}`);
  const pv = coursePreview(state, choice, r);
  const basis = pv.intel >= 2 ? 'with the herald’s read of him'
    : pv.intel === 1 ? 'knowing his habits, not his tells'
    : 'assuming the field’s usual habits';
  const best = r.best;
  return `
  ${tiltCard(cb, { showCall: true })}
  ${renderIntel(cb.him)}
  <section class="card stack-lg">
    <div class="stack">
      <div class="eyebrow">Aim</div>
      <div class="seg" role="group" aria-label="Aim">
        ${AIM_IDS.map((a) => `<button data-aim="${a}" aria-pressed="${pick.aim === a}">${AIMS[a].label}</button>`).join('')}
      </div>
      <p class="choice-note">${esc(AIMS[pick.aim].blurb)}</p>
    </div>
    <div class="stack">
      <div class="eyebrow">Seat</div>
      <div class="seg" role="group" aria-label="Seat">
        ${SEAT_IDS.map((s) => `<button data-seat="${s}" aria-pressed="${pick.seat === s}">${SEATS[s].label}</button>`).join('')}
      </div>
      <p class="choice-note">${esc(SEATS[pick.seat].blurb)}</p>
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
    </div>
  </section>
  ${renderDraw(ev)}`;
}

function renderResult(ev) {
  const p = ev.rounds[ev.round][ev.current];
  const b = p.bout;
  const won = p.winner === YOU;
  const cb = { bout: b, you: ev.riders[p.a], him: ev.riders[p.b], roundName: ROUND_NAMES[ev.round] };
  const hurt = ev.withdrawn[YOU];
  let next;
  if (won && !hurt) next = ev.round < 2 ? `On to ${ROUND_NAMES[ev.round + 1]}` : 'To the prize-giving';
  else next = 'Watch the rest of the tourney';
  return `
  ${tiltCard(cb, { showCall: true })}
  <section class="card stack-lg">
    <div class="stack">
      <div class="verdict ${won ? 'win' : ''}">${won ? 'You carry the bout' : 'Beaten'}</div>
      <p class="voice subhead">${won ? 'You won' : `${esc(cb.him.name)} won`} ${esc(HOW[b.how])}, ${b.scores.a} to ${b.scores.b}.</p>
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

function outcomeWord(o) {
  return { miss: 'miss', tilt: 'the tilt', horse: 'the horse', break: 'broke', helm: 'helm', unhorse: 'bore him down' }[o];
}

function renderDone(ev) {
  const e = ev.entry;
  const winter = state.eventInSeason + 1 >= EVENTS_PER_SEASON;
  return `
  <section class="card lift stack-lg">
    <div class="stack">
      <div class="eyebrow">${esc(ev.town)}, for ${esc(ev.feast)}</div>
      <div class="verdict ${e.placing === 'champion' ? 'win' : ''}">${PLACING[e.placing]}</div>
    </div>
    <div class="stack">
      <div class="eyebrow">The Book of Feats</div>
      <p class="entry">${esc(e.text)}</p>
    </div>
    <div class="stack">
      <div class="eyebrow">The reckoning</div>
      <table class="ledger"><tbody>
        ${ev.ledger.map((l) => `<tr><td>${esc(l.label)}</td><td class="${l.amount >= 0 ? 'pos' : 'neg'}">${lsdSigned(l.amount)}</td></tr>`).join('')}
        <tr class="total"><td>Net</td><td class="${e.net >= 0 ? 'pos' : 'neg'}">${lsdSigned(e.net)}</td></tr>
      </tbody></table>
      <p class="small muted">Renown ${signed(e.renown)}${e.honour ? ` · Honour ${signed(e.honour)}` : ''} · Purse now ${lsd(state.purse)}</p>
    </div>
    <button class="btn primary wide" data-act="ride-on">${winter ? 'Winter, and then the new season' : 'Ride on to the next tourney'}</button>
  </section>
  ${renderDraw(ev)}`;
}

// ---------------------------------------------------------------------------
// Rendering and events
// ---------------------------------------------------------------------------

function render() {
  uid = 0;
  if (screen === 'title') renderTitle();
  else if (screen === 'create') renderCreate();
  else renderGame();
}

function toTop() {
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { window.scrollTo(0, 0); }
}

function reducedMotion() {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function runCourse() {
  if (charging) return;
  const go = () => {
    playCourse(state, pick);
    charging = false;
    save();
    render();
  };
  if (reducedMotion()) { go(); toTop(); return; }
  toTop();
  charging = true;
  render();
  setTimeout(go, 560);
}

app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act],[data-opt],[data-aim],[data-seat],[data-tab],[data-read]');
  if (!t || t.disabled) return;
  const d = t.dataset;

  if (d.tab) { tab = d.tab; confirmAbandon = false; render(); toTop(); return; }
  if (d.opt) { chooseOption(d.opt); render(); toTop(); return; }
  if (d.aim) { pick.aim = d.aim; render(); return; }
  if (d.seat) { pick.seat = d.seat; render(); return; }
  if (d.read) { buyHeraldRead(state, d.read); save(); render(); return; }

  switch (d.act) {
    case 'resume': {
      const r = loadFromStorage();
      if (r.ok) { state = r.state; screen = 'game'; tab = 'lists'; }
      break;
    }
    case 'new':
    case 'new-after-end':
      startCreate();
      screen = 'create';
      break;
    case 'title': screen = 'title'; break;
    case 'another-name':
      create.nameSeed = (create.nameSeed + 1) >>> 0;
      create.name = randomName(makeRng(create.nameSeed));
      break;
    case 'name-next': {
      const g = document.getElementById('given')?.value.trim();
      const h = document.getElementById('house')?.value.trim();
      create.name = { given: g || create.name.given, house: h || create.name.house };
      create.step = 1;
      break;
    }
    case 'back': create.step = Math.max(0, create.step - 1); break;
    case 'restart-answers': create.step = 1; break;
    case 'ride-out':
      state = create.preview;
      create = null;
      screen = 'game';
      tab = 'lists';
      save();
      break;
    case 'enter':
      enterTourney(state);
      pick = { aim: 'shield', seat: 'balanced' };
      save();
      break;
    case 'squire': {
      const r = reckonNow(state);
      if (r) pick = { aim: r.best.aim, seat: r.best.seat };
      render();
      return;
    }
    case 'run': runCourse(); return;
    case 'continue':
      continueTourney(state);
      pick = { aim: 'shield', seat: 'balanced' };
      save();
      break;
    case 'ride-on':
      rideOn(state);
      save();
      break;
    case 'abandon': confirmAbandon = true; render(); return;
    case 'abandon-no': confirmAbandon = false; render(); return;
    case 'abandon-yes':
      clearStorage();
      state = null;
      confirmAbandon = false;
      startCreate();
      screen = 'create';
      break;
    default: return;
  }
  render();
  toTop();
});

// Keep typed names without re-rendering under the cursor.
app.addEventListener('input', (e) => {
  if (!create) return;
  if (e.target.id === 'given') create.name.given = e.target.value;
  if (e.target.id === 'house') create.name.house = e.target.value;
});

// Resume straight into a career in progress; otherwise the title.
const boot = loadFromStorage();
if (boot.ok && boot.state.status === STATUS.ACTIVE) {
  state = boot.state;
  screen = 'game';
}
render();
