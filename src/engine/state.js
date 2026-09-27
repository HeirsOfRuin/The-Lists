// Game state: its shape, how a new career is built, and how it is saved.
//
// The save key is a contract, not a label. `the-lists.save.v1` is fixed from
// the first commit and carries an explicit version number inside it, because
// a save already sitting in somebody's browser refers to this string.
// Renaming the key would silently orphan every career in progress; changing
// the shape without bumping the version would silently corrupt them. So the
// key stays, the version inside moves, and migrate() carries old saves forward.

import { streamFor } from './rng.js';
import { buildKnight, fullName } from './knight.js';
import { generateRoster, seedHistory, assignAllegiance } from './field.js';
import { takeService } from './court.js';
import { yearCalendar } from './calendar.js';
import { WORLD, PROVINCES, FIRST_MONTH } from '../data/world.data.js';
import { HARNESS } from '../data/household.data.js';

export const SAVE_KEY = 'the-lists.save.v1';
export const SAVE_VERSION = 3;

export const STATUS = {
  ACTIVE: 'active',
  RUINED: 'ruined', // could not pay the winter accounts
};

function freshMarks() { return { lance: 0, seat: 0, vigour: 0, courtesy: 0, lore: 0 }; }

/** The parts of a career that phase two added, built from the seed. */
function worldFor(state) {
  state.roster = generateRoster(state.seed, `${state.knight.given} ${state.knight.house}`);
  seedHistory(state);
  state.calendar = yearCalendar(state.seed, state.year);
  state.location = PROVINCES[state.province].home;
  state.phase = 'month';
  state.intel = {};
  state.harness = { quality: HARNESS.start, years: 0, label: 'The harness you were knighted in' };
  state.retinue = [];
  state.squire = null;
  state.knight.marks = freshMarks();
  state.knight.injuredUntil = 0;
  state.pending = null;
  state.detour = null;
  state.monthRode = null;
  state.winter = null;
  state.news = [];
  state.cardsSeen = {};
}

/** The parts of a career that phase three added. */
function courtFor(state) {
  assignAllegiance(state);
  if (state.patron === undefined) state.patron = null;
  state.story = state.story || {};
  state.notices = state.notices || [];
}

/**
 * A new career. Everything about it is a pure function of
 * (seed, answers, name) and the choices made after, which is what makes a
 * seed reproducible and the balance harness meaningful.
 */
export function newGame({ seed = 1, answers, name }) {
  const rng = streamFor(seed, 0, 'creation');
  const built = buildKnight(answers, name, rng);
  const state = {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    status: STATUS.ACTIVE,
    answers: { ...answers },
    year: 1,
    month: FIRST_MONTH,
    eventsEntered: 0,
    eventSerial: 0,
    ...built,
    career: {
      tourneys: 0, bouts: 0, boutsWon: 0, courses: 0, lances: 0,
      unhorsed: 0, falls: 0, championships: 0,
    },
    event: null,
    book: [],
    log: [],
    outcome: null,
    lastResult: null,
  };
  worldFor(state);
  courtFor(state);
  state.lastResult = {
    title: `Spring, in the ${ordinal(WORLD.peaceYear)} year of the peace`,
    text: `${fullName(state.knight)} rides out on ${state.horse.name}, with ${state.master.name} ${state.master.fate === 'dead' ? 'in his grave' : 'still watching'}. The heralds have published the year’s tourneys.`,
    lines: [],
  };
  return state;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function isOver(state) {
  return state.status !== STATUS.ACTIVE;
}

// ---------------------------------------------------------------------------
// Saving. Nothing derived is stored: the state is already plain data.
// ---------------------------------------------------------------------------

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(json) {
  const raw = typeof json === 'string' ? JSON.parse(json) : json;
  return migrate(raw);
}

/**
 * Bring an older save forward, one version at a time, so a v1 save still
 * loads after v4 ships.
 */
export function migrate(s) {
  if (!s || !s.version) {
    throw new Error('Save has no version field; it cannot be safely loaded.');
  }
  if (s.version > SAVE_VERSION) {
    throw new Error(
      `Save is version ${s.version} but this build understands up to ${SAVE_VERSION}. ` +
        'It was written by a newer version of the game.'
    );
  }
  if (s.version === 1) {
    // Phase one had seasons of five tourneys and no world beyond the lists.
    // The knight, his purse, his renown and his Book of Feats carry over; the
    // world is built around him from his own seed; and he picks up in the
    // month that matches how far through the season he was.
    s.year = s.season || 1;
    s.month = Math.min(FIRST_MONTH + (s.eventInSeason || 0), 10);
    delete s.season;
    delete s.eventInSeason;
    s.eventSerial = s.eventsEntered || 0;
    const inProgress = s.event && s.event.stage !== 'done' && s.event.stage !== 'arrival';
    s.event = null;
    worldFor(s);
    for (const e of s.book) {
      e.year = e.year || e.season || 1;
      e.tier = e.tier || 'regional';
      if (e.placing === 'quarter') e.placing = 'first';
    }
    s.lastResult = {
      title: 'The world opens up',
      text: 'The heralds have published the year’s tourneys, and the knights of the field have noticed you. ' +
        'Your purse, renown and Book of Feats ride with you.' +
        (inProgress ? ' The tourney you were in the middle of is over; the heralds did not record it.' : ''),
      lines: [],
    };
    s.version = 2;
  }
  if (s.version === 2) {
    // Phase three: six creation questions set birth and family on the state
    // itself; the field swears to houses; Aumbry's retainer becomes service.
    s.honour = Math.max(-10, Math.min(20, s.honour));
    s.birth = s.birth || s.answers?.birth;
    s.advantage = s.advantage || s.answers?.advantage;
    courtFor(s);
    if (s.flags.includes('aumbryRetainer') && !s.patron) {
      // He was already Aumbry's man. Service now has obligations, shown on the
      // month's screen; the year has only begun, so he can meet them.
      takeService(s, 'aumbry');
      s.flags = s.flags.filter((f) => f !== 'aumbryRetainer');
    }
    s.version = 3;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Browser storage. Every access is wrapped: localStorage throws in private
// windows and returns null when site data has been cleared — and in a
// sandboxed frame even LOOKING UP localStorage can throw, so the lookup is
// wrapped too, not just the reads and writes.
// ---------------------------------------------------------------------------

function browserStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function saveToStorage(state, storage = browserStorage()) {
  if (!storage) return { ok: false, reason: 'no storage available' };
  try {
    storage.setItem(SAVE_KEY, serialize(state));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.message || 'storage write refused' };
  }
}

export function loadFromStorage(storage = browserStorage()) {
  if (!storage) return { ok: false, reason: 'no storage available' };
  let raw;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch (err) {
    return { ok: false, reason: err?.message || 'storage read refused' };
  }
  if (!raw) return { ok: false, reason: 'no saved career found' };
  try {
    return { ok: true, state: deserialize(raw) };
  } catch (err) {
    return { ok: false, reason: err?.message || 'saved career could not be read' };
  }
}

export function clearStorage(storage = browserStorage()) {
  try { storage?.removeItem(SAVE_KEY); return { ok: true }; }
  catch (err) { return { ok: false, reason: err?.message }; }
}
