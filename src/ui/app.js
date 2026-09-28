// The controller: which screen is up, what the player has provisionally
// picked, and handing each decision to the engine.
//
// No number is computed here. The odds, the reckoning, the ledgers and the
// chances on every card come from the engine, so what the player is shown and
// what resolves are the same arithmetic. Every action goes through one
// function in src/engine/season.js, and a refused action says why.

import { newGame, STATUS, saveToStorage, loadFromStorage, clearStorage } from '../engine/state.js';
import { QUESTIONS } from '../data/creation.data.js';
import { optionLines, availableOptions, randomName, fullName, prefaceFor, biography } from '../engine/knight.js';
import { makeRng } from '../engine/rng.js';
import { buyHeraldRead, STAGE } from '../engine/tourney.js';
import { reckonNow } from '../engine/derive.js';
import {
  rideTo, enter, withdraw, ride, rideOutBout, onward, leave, train, serve, rest, visitCourt, passMonth,
  answer, setFocus, setSquireFocus, takeSquire, dubSquire, hire, dismiss, buyHarness, buyHorse,
  keepBorrowedHorse, endWinter, PHASE, answerSummons, pilgrimage, resignService, buyManor, hireMan, dismissMan,
  rideDay, standDownDay, meleeTurn, ransom, exchange, fightOutFoot, footOnward, mercy,
  shoot, race, leaveFair, campaign, lookToLands, retireNow, feastCompanions, vow, unvow, hireArcher, dismissArcher,
} from '../engine/season.js';
import { obituary } from '../engine/ending.js';
import { renderFair } from './fair.js';
import { hintCard, dismissHint, setHints } from './hints.js';
import { footSquireCall } from '../engine/derive.js';
import { meleeMenOption } from '../engine/tourney.js';
import { renderDay, renderMelee, renderRansom, renderFoot, renderFootResult } from './days.js';
import { renderWorld } from './world.js';
import { WORLD, MONTHS, TOWNS } from '../data/world.data.js';
import { lsd } from '../engine/money.js';
import { esc, ordinal, resetIds, shield } from './view.js';
import { renderMonth, renderWinter } from './hub.js';
import { renderArrival, renderBout, renderResult, renderDone } from './lists.js';
import { renderSheet, renderField, renderBook, renderCard, renderResultNote } from './sheet.js';

const app = document.getElementById('app');

let state = null;
let screen = 'title'; // title | create | game
let create = null;
const ui = {
  tab: 'now',
  pick: { aim: 'shield', seat: 'balanced' },
  foot: { stroke: 'thrust', guard: 'stand' },
  men: null,
  trainSkill: 'lance',
  selected: null,
  charging: false,
  confirmAbandon: false,
  confirmRetire: false,
  shot: { target: 'wing', lull: false },
  refusal: null,
};

function save() { if (state) saveToStorage(state); }

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
        <div class="muted small">Year ${s.year} · ${s.career.tourneys} tourney${s.career.tourneys === 1 ? '' : 's'} ridden · ${lsd(s.purse)}${s.status !== STATUS.ACTIVE ? ` · ${ENDING_WORD[s.status] || 'over'}` : ''}</div></div>
      </div>
      <button class="btn primary" data-act="resume">${s.status === STATUS.ACTIVE ? 'Ride on' : 'See how it ended'}</button>
    </section>` : ''}
    ${!saved.ok && !/no saved|no storage/.test(saved.reason) ? `<p class="small neg">A saved knight could not be read: ${esc(saved.reason)}</p>` : ''}
    <button class="btn ${s ? '' : 'primary'} wide" data-act="new">A new knight</button>
    <p class="small faint build-note">A whole life, from your spurs to the last page of your Book of Feats: the circuit
      and its rivals, the mêlée and the barriers, the court, ten years to a civil war, the Company of the Swan, vows, the
      fairs, and the Book of Lothmere.</p>
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
    <div class="stack-lg create">
      ${progressBar()}
      <div class="stack">
        <div class="eyebrow">${ROMAN[step - 1]} · ${esc(q.chapter)}</div>
        <p class="preface">${esc(prefaceFor(q.id, create.answers))}</p>
        <p class="question">${esc(q.prompt)}</p>
      </div>
      <div class="stack">
        ${opts.map((o) => {
          const l = optionLines(o);
          return `
        <button class="option" data-opt="${o.id}" aria-pressed="${create.answers[q.id] === o.id}">
          <span class="t">${esc(o.title)}</span>
          <span class="b">${esc(o.blurb)}</span>
          ${l.threads.map((t) => `<span class="thread-line">${esc(t)}</span>`).join('')}
          ${l.gives.length ? `<span class="gives">${esc(l.gives.join(' · '))}</span>` : ''}
        </button>`;
        }).join('')}
      </div>
      <button class="btn quiet" data-act="back">Back</button>
    </div>`;
    return;
  }
  const preview = newGame({ seed: create.seed, answers: create.answers, name: create.name });
  create.preview = preview;
  const bio = biography(create.answers);
  app.innerHTML = `
  <div class="stack-lg create">
    ${progressBar()}
    <section class="card lift stack-lg">
      <div class="arms-block">${shield(preview.arms, 64)}
        <div class="stack" style="gap:4px"><div class="eyebrow">The heralds’ roll</div>
        <div class="subhead">${esc(fullName(preview.knight))}</div></div></div>
      ${bio.paragraphs.map((p) => `<p class="bio">${esc(p)}</p>`).join('')}
      <div class="stack">
        <div class="eyebrow">What waits for you</div>
        <ul class="ahead">${bio.ahead.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      </div>
    </section>
    <button class="btn primary wide" data-act="ride-out">Ride out from ${esc(TOWNS[preview.location].name)}</button>
    <details class="card sheet-details"><summary>The knight who rides out: skills, horse and standing</summary>
      ${renderSheet(preview, { inGame: false })}
    </details>
    <button class="btn quiet" data-act="restart-answers">Change my answers</button>
  </div>`;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function chooseOption(id) {
  const q = QUESTIONS[create.step - 1];
  create.answers[q.id] = id;
  for (const later of QUESTIONS.slice(create.step)) {
    const a = create.answers[later.id];
    if (a && !availableOptions(later.id, create.answers).some((o) => o.id === a)) delete create.answers[later.id];
  }
  create.step += 1;
}

// ---------------------------------------------------------------------------
// The game shell
// ---------------------------------------------------------------------------

function banner() {
  const s = state;
  const fact = (k, v, cls = '') => `<span class="fact"><span class="k">${k}</span><span class="v ${cls}">${v}</span></span>`;
  const tabBtn = (id, label) => `<button class="tab" role="tab" data-tab="${id}" aria-selected="${ui.tab === id}">${label}</button>`;
  const when = s.phase === PHASE.WINTER ? 'Winter' : MONTHS[s.month];
  return `
  <header class="banner">
    <div class="who">
      ${shield(s.arms, 30)}
      <div>
        <div class="name">${esc(fullName(s.knight))}</div>
        <div class="facts">
          ${fact('Purse', lsd(s.purse))}
          ${fact('Renown', s.renown)}
          ${fact('Honour', s.honour, s.honour < 8 ? 'neg' : '')}
          ${fact(`Year ${s.year}`, when)}
        </div>
      </div>
    </div>
    <nav class="tabs" role="tablist">
      ${tabBtn('now', 'Now')}${tabBtn('knight', 'Knight')}${tabBtn('field', 'Field')}${tabBtn('book', 'Book')}${tabBtn('world', 'World')}
    </nav>
  </header>`;
}

/** Which first-time hint belongs to the screen in front of the player. */
function hintKey() {
  if (state.pending) return 'card';
  if (state.fair) return 'fair';
  const st = state.event?.stage;
  if (st) return { [STAGE.ARRIVAL]: 'arrival', [STAGE.BOUT]: 'bout', [STAGE.DAY]: 'day', [STAGE.MELEE]: 'melee', [STAGE.FOOT]: 'foot' }[st] || null;
  return state.phase === PHASE.WINTER ? 'winter' : 'month';
}

function renderNow() {
  if (state.status !== STATUS.ACTIVE) return renderEnding();
  const refusal = `${ui.refusal ? `<p class="refusal">${esc(ui.refusal)}</p>` : ''}${hintCard(hintKey())}`;
  if (state.pending) {
    // A moment in the lists keeps the tilt in view above it.
    return `${refusal}${renderCard(state)}`;
  }
  const note = renderResultNote(state);
  if (state.event) {
    const ev = state.event;
    let body = '';
    if (ev.stage === STAGE.ARRIVAL) body = renderArrival(state);
    else if (ev.stage === STAGE.BOUT) body = renderBout(state, ui);
    else if (ev.stage === STAGE.RESULT) body = renderResult(state, ui);
    else if (ev.stage === STAGE.DONE) body = renderDone(state);
    else if (ev.stage === STAGE.DAY) body = renderDay(state, ui);
    else if (ev.stage === STAGE.MELEE) body = renderMelee(state);
    else if (ev.stage === STAGE.RANSOM) body = renderRansom(state);
    else if (ev.stage === STAGE.FOOT) body = renderFoot(state, ui);
    else if (ev.stage === STAGE.FOOT_RESULT) body = renderFootResult(state);
    else body = `<section class="card"><p class="empty">The tourney is at a stage this build does not show (${esc(ev.stage)}). Reload the page.</p></section>`;
    return `${refusal}${note}${body}`;
  }
  if (state.fair) return `${refusal}${note}${renderFair(state, ui)}`;
  if (state.phase === PHASE.WINTER) return `${refusal}${note}${renderWinter(state, ui)}`;
  return `${refusal}${note}${renderMonth(state, ui)}`;
}

const ENDING_WORD = { ruined: 'ruined', dead: 'dead', exiled: 'exiled', retired: 'retired' };
const ENDING_TITLE = { ruined: 'Ruined', dead: 'Dead in the war', exiled: 'Exiled' };

function renderEnding() {
  const o = state.outcome;
  const retired = state.status === STATUS.RETIRED;
  const paragraphs = retired ? o.paragraphs : obituary(state, o?.text || 'The career is over.');
  const title = retired ? o.title : ENDING_TITLE[state.status] || 'The end';
  return `
  <section class="card lift stack-lg">
    <div class="stack">
      <div class="arms-block">${shield(state.arms, 64)}
        <div class="stack" style="gap:4px"><div class="eyebrow">The last page of the Book of Feats</div>
        <div class="subhead">${esc(fullName(state.knight))}</div></div></div>
      <div class="verdict">${esc(title)}</div>
      ${retired && o.also?.length ? `<p class="small muted">And also: ${esc(o.also.join(', '))}.</p>` : ''}
    </div>
    ${paragraphs.map((p, i) => `<p class="${i === 0 ? 'entry' : 'bio'}">${esc(p)}</p>`).join('')}
    <dl class="kv">
      <dt>Years a knight</dt><dd>${state.year}</dd>
      <dt>Tourneys</dt><dd>${state.career.tourneys}, ${state.career.championships} won</dd>
      <dt>Renown</dt><dd>${state.renown}</dd>
      <dt>Honour</dt><dd>${state.honour}</dd>
    </dl>
    <p class="small faint">The whole of it is in the Book of Feats and the chronicle, on the tabs above.</p>
    <button class="btn primary wide" data-act="new-after-end">A new knight</button>
  </section>`;
}

function renderGame() {
  let body = '';
  if (ui.tab === 'knight') body = renderSheet(state, { inGame: true, confirmAbandon: ui.confirmAbandon });
  else if (ui.tab === 'field') body = renderField(state);
  else if (ui.tab === 'book') body = renderBook(state);
  else if (ui.tab === 'world') body = renderWorld(state);
  else body = renderNow();
  app.innerHTML = `${banner()}<main class="stack-lg">${body}</main>`;
}

function render() {
  resetIds();
  if (screen === 'title') renderTitle();
  else if (screen === 'create') renderCreate();
  else renderGame();
}

function toTop() {
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { window.scrollTo(0, 0); }
}
function reducedMotion() { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }

/** Run an engine action; show its refusal if it refuses. */
function act(fn, ...args) {
  const r = fn(state, ...args);
  ui.refusal = r && r.ok === false ? r.reason : null;
  save();
  return r;
}

function runCourse() {
  if (ui.charging) return;
  const go = () => {
    act(ride, ui.pick);
    ui.charging = false;
    render();
    if (state.pending) toTop();
  };
  toTop();
  if (reducedMotion()) { go(); return; }
  ui.charging = true;
  render();
  setTimeout(go, 560);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act],[data-opt],[data-aim],[data-seat],[data-tab],[data-read],[data-ride],[data-sel],[data-train-pick],[data-court],[data-answer],[data-focus],[data-sqfocus],[data-squire],[data-hire],[data-dismiss],[data-harness],[data-horse],[data-men],[data-melee],[data-ransom],[data-stroke],[data-guard],[data-mark],[data-lull],[data-race],[data-vow],[data-hint]');
  if (!t || t.disabled) return;
  const d = t.dataset;
  let top = true;

  if (d.tab) { ui.tab = d.tab; ui.confirmAbandon = false; ui.refusal = null; }
  else if (d.opt) chooseOption(d.opt);
  else if (d.aim) { ui.pick.aim = d.aim; top = false; }
  else if (d.seat) { ui.pick.seat = d.seat; top = false; }
  else if (d.read) { act(buyHeraldRead, d.read); top = false; }
  else if (d.ride) { act(rideTo, d.ride); ui.pick = { aim: 'shield', seat: 'balanced' }; }
  else if (d.sel) { ui.selected = d.sel; top = false; }
  else if (d.trainPick) { ui.trainSkill = d.trainPick; top = false; }
  else if (d.court) act(visitCourt, d.court);
  else if (d.answer != null) act(answer, Number(d.answer));
  else if (d.focus) { act(setFocus, d.focus); top = false; }
  else if (d.sqfocus) { act(setSquireFocus, d.sqfocus); top = false; }
  else if (d.squire != null) { act(takeSquire, Number(d.squire)); top = false; }
  else if (d.hire) { act(hire, d.hire); top = false; }
  else if (d.dismiss) { act(dismiss, d.dismiss); top = false; }
  else if (d.harness) { act(buyHarness, d.harness); top = false; }
  else if (d.horse) { act(buyHorse, d.horse); top = false; }
  else if (d.men != null) { ui.men = Number(d.men); top = false; }
  else if (d.melee) { const [i, a] = d.melee.split(':'); act(meleeTurn, Number(i), a); }
  else if (d.ransom) act(ransom, d.ransom);
  else if (d.stroke) { ui.foot.stroke = d.stroke; top = false; }
  else if (d.guard) { ui.foot.guard = d.guard; top = false; }
  else if (d.mark) { ui.shot.target = d.mark; top = false; }
  else if (d.lull != null) { ui.shot.lull = d.lull === '1'; top = false; }
  else if (d.race) act(race, d.race);
  else if (d.vow) { act(vow, d.vow); top = false; }
  else if (d.hint) { dismissHint(d.hint); top = false; }
  else {
    switch (d.act) {
      case 'resume': {
        const r = loadFromStorage();
        if (r.ok) { state = r.state; screen = 'game'; ui.tab = 'now'; }
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
        ui.tab = 'now';
        save();
        break;
      case 'enter': act(enter); ui.pick = { aim: 'shield', seat: 'balanced' }; break;
      case 'withdraw': act(withdraw); break;
      case 'squire': {
        const r = reckonNow(state);
        if (r) ui.pick = { aim: r.best.aim, seat: r.best.seat };
        top = false;
        break;
      }
      case 'run': runCourse(); return;
      case 'auto': act(rideOutBout); break;
      case 'continue': act(onward); ui.pick = { aim: 'shield', seat: 'balanced' }; break;
      case 'leave': act(leave); break;
      case 'day-ride': {
        const men = Math.min(ui.men ?? meleeMenOption(state).max, meleeMenOption(state).max);
        act(rideDay, { men });
        ui.men = null;
        ui.foot = { stroke: 'thrust', guard: 'stand' };
        break;
      }
      case 'day-stand': act(standDownDay); break;
      case 'foot-go': act(exchange, { ...ui.foot }); break;
      case 'foot-call': { const c = footSquireCall(state); if (c) ui.foot = { stroke: c.stroke, guard: c.guard }; top = false; break; }
      case 'foot-auto': act(fightOutFoot); break;
      case 'foot-on': act(footOnward); ui.foot = { stroke: 'thrust', guard: 'stand' }; break;
      case 'spare': act(mercy, true); break;
      case 'finish': act(mercy, false); break;
      case 'train': act(train, ui.trainSkill); break;
      case 'serve': act(serve); break;
      case 'rest': act(rest); break;
      case 'summons': act(answerSummons); break;
      case 'pilgrimage': act(pilgrimage); break;
      case 'resign': act(resignService); top = false; break;
      case 'pass': act(passMonth); break;
      case 'dub': act(dubSquire); top = false; break;
      case 'keep-horse': act(keepBorrowedHorse); top = false; break;
      case 'buy-manor': act(buyManor); top = false; break;
      case 'hire-man': act(hireMan); top = false; break;
      case 'dismiss-man': act(dismissMan); top = false; break;
      case 'spring': act(endWinter); ui.confirmRetire = false; break;
      case 'shoot': act(shoot, { ...ui.shot }); top = false; break;
      case 'fair-leave': act(leaveFair); ui.shot = { target: 'wing', lull: false }; break;
      case 'campaign': act(campaign); break;
      case 'lands': act(lookToLands); break;
      case 'swan-table': act(feastCompanions); top = false; break;
      case 'unvow': act(unvow); top = false; break;
      case 'hire-archer': act(hireArcher); top = false; break;
      case 'dismiss-archer': act(dismissArcher); top = false; break;
      case 'hints-off': setHints(false); top = false; break;
      case 'hints-on': setHints(true); ui.tab = 'now'; break;
      case 'retire': ui.confirmRetire = true; top = false; break;
      case 'retire-no': ui.confirmRetire = false; top = false; break;
      case 'retire-yes': act(retireNow); ui.confirmRetire = false; break;
      case 'abandon': ui.confirmAbandon = true; top = false; break;
      case 'abandon-no': ui.confirmAbandon = false; top = false; break;
      case 'abandon-yes':
        clearStorage();
        state = null;
        ui.confirmAbandon = false;
        startCreate();
        screen = 'create';
        break;
      default: return;
    }
  }
  render();
  if (top) toTop();
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
  save(); // a migrated save is written back in its new shape
}
render();

