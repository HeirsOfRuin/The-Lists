// The days after the jousts: the choice of the day, the mêlée, the ransoms,
// the barriers, and a man at your mercy. Reads the engine; computes nothing.

import { TIERS, BARRIERS } from '../data/tourney.data.js';
import { MELEE, ACTIONS, MELEE_PRIZE_LABELS, RANSOM } from '../data/melee.data.js';
import { STROKES, GUARDS, ARTICLES, OUTRANCE } from '../data/foot.data.js';
import { TOWNS } from '../data/world.data.js';
import { TEMPERAMENTS } from '../data/field.data.js';
import {
  YOU, DAY_LABEL, dayKind, meleeMenOption, currentFoot, ransomTerms, heraldReadCost,
} from '../engine/tourney.js';
import { openingOdds, blown, meleeThreshold, squireCounsel, ransomOf, standing } from '../engine/melee.js';
import { footPreview, footReckonNow, knownFootOf, footTellsInPlay, knownOf } from '../engine/derive.js';
import { STROKE_IDS, GUARD_IDS, footChoiceByKey, footThreshold } from '../engine/foot.js';
import { knightById } from '../engine/field.js';
import { lsd, lsdSigned } from '../engine/money.js';
import { esc, cap, pct, shield, tierChip, signed } from './view.js';

function notes(ev) {
  return ev.notes.length ? `<ul class="notes">${ev.notes.slice(-4).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
}

const ORDINAL_DAY = ['The first day', 'The second day', 'The third day'];

function youState(r, threshold) {
  const f = r.fatigue || 0;
  const word = f <= threshold * 0.5 ? 'fresh' : f <= threshold ? 'breathing hard' : 'blown';
  return `${word}${r.wound === 'light' ? ', bruised' : ''}`;
}

// ---------------------------------------------------------------------------
// The day
// ---------------------------------------------------------------------------

export function renderDay(state, ui) {
  const ev = state.event;
  const kind = dayKind(ev);
  const me = ev.riders[YOU];
  const pas = ev.tier === 'greatpas';
  const holder = pas ? ev.riders[Object.keys(ev.riders).find((id) => id !== YOU)] : null;
  let body = '';
  if (pas) {
    const shieldName = kind === 'joust' ? 'the black shield' : 'the white shield';
    const does = kind === 'joust' ? 'three courses of the lance with him, under the Constable’s Ordinance'
      : 'the pollaxe with him across the barrier, three exchanges under the articles';
    const k = kind === 'joust' ? knownOf(state, holder.id) : knownFootOf(state, holder.id);
    body = `
      <p class="voice">${esc(holder.name)} holds the fountain. On the tree beside it hang his shields; a comer who touches ${shieldName} will have ${does}.</p>
      <p class="small">${kind === 'joust' ? `Lance ${holder.lance} · Seat ${holder.seat} · Horse ${holder.horse.quality}` : `Sword ${holder.sword} · Vigour ${holder.vigour}`} · Renown ${holder.renown}. ${k.level ? `${esc(cap(k.label))}: ${esc(k.habit)}` : '<span class="faint">You do not know how he fights.</span>'}</p>
      <p class="small muted">Every man who touches a shield is given a gold ring and his name in the book of the pas (renown +${TIERS.greatpas.touched.renown}). To beat him: ${kind === 'joust' ? esc(TIERS.greatpas.prizeLabels.champion) : esc(BARRIERS.prizeLabels.greatpas)}, and renown +${kind === 'joust' ? TIERS.greatpas.renown.boutWon : BARRIERS.renown.win.greatpas}.</p>
      <button class="btn primary wide" data-act="day-ride">Touch ${shieldName}</button>
      <button class="btn quiet" data-act="day-stand">Leave it hanging</button>`;
  } else if (kind === 'melee') {
    const opt = meleeMenOption(state);
    const men = Math.min(ui.men ?? opt.max, opt.max);
    const size = MELEE.sideSize[ev.tier];
    const yours = ev.host.faction && state.patron?.id === ev.host.faction ? 'the holders, your lord’s side' : 'the comers';
    body = `
      <p class="voice">The tourney in the field: ${size} knights a side, three passes, and every man who yields is a ransom. You ride with ${yours}.</p>
      <p class="small muted">A knight taken pays his ransom; yours would be ${lsd(ransomOf(ev.tier, state.renown))}. The prize of the tourney: ${esc(MELEE_PRIZE_LABELS[ev.tier])}. It pays in money more than in renown; the jousts are where names are made.</p>
      <p class="small">You are ${esc(youState(me, meleeThreshold(me)))} from the jousts.</p>
      ${opt.cap ? `<div class="stack">
        <div class="eyebrow">Your men-at-arms</div>
        ${opt.max ? `<div class="seg" role="group" aria-label="Men riding with you" style="grid-template-columns:repeat(${opt.max + 1},1fr)">
          ${Array.from({ length: opt.max + 1 }, (_, n) => `<button data-men="${n}" aria-pressed="${men === n}">${n}</button>`).join('')}
        </div>
        <p class="small muted">Each man adds weight in the press, and takes a capture meant for you (and you pay his ransom, ${lsd(RANSOM.man)}, instead of yours). ${lsd(opt.fee)} each for the day.</p>`
        : `<p class="small muted">The articles allow ${opt.cap} of your own men-at-arms to ride with you. You keep none; they are hired in winter, as your land allows.</p>`}
      </div>` : ''}
      <button class="btn primary wide" data-act="day-ride">Ride in the mêlée${men ? ` with ${men} ${men === 1 ? 'man' : 'men'} (${lsdSigned(-men * opt.fee)})` : ''}</button>
      <button class="btn quiet" data-act="day-stand">Stand down, and watch</button>`;
  } else if (kind === 'barriers') {
    const tier = ev.tier;
    body = `
      <p class="voice">The barriers: four men by lot, on foot, with pollaxes across a barrier at the waist. Three exchanges under ${esc(ARTICLES.name)}; a man driven to his knee, or disarmed, loses outright.</p>
      <p class="small muted">The prize of the axe: ${esc(BARRIERS.prizeLabels[tier] || '')}. Renown +${BARRIERS.renown.win[tier]} for each combat won, +${BARRIERS.renown.champion[tier]} for the prize.</p>
      <p class="small">Your sword ${state.knight.stats.sword}, vigour ${state.knight.stats.vigour}. You are ${esc(youState(me, footThreshold(me)))}.</p>
      <button class="btn primary wide" data-act="day-ride">Fight at the barriers</button>
      <button class="btn quiet" data-act="day-stand">Stand down, and watch</button>`;
  }
  return `
  <section class="card lift stack-lg">
    <div class="stack">
      <div class="spread">${tierChip(ev.tier)}<span class="small muted">${esc(TOWNS[ev.town].name)}</span></div>
      <div class="eyebrow">${pas ? (kind === 'joust' ? 'The black shield' : 'The white shield') : `${ORDINAL_DAY[ev.day] || 'The next day'}: ${DAY_LABEL[kind]}`}</div>
    </div>
    ${notes(ev)}
    ${body}
  </section>`;
}

// ---------------------------------------------------------------------------
// The mêlée
// ---------------------------------------------------------------------------

const OUT_WORD = {
  win: { take: 'He yields', strike: 'He goes down', rescue: 'You bring him out' },
  repulsed: 'Beaten off',
  manTaken: 'A man taken',
  youTaken: 'You are taken',
};

function meleeOdds(o, action) {
  const seg = (cls, p) => (p > 0.0005 ? `<i class="${cls}" style="width:${(p * 100).toFixed(2)}%"></i>` : '');
  const item = (cls, name, p) => (p > 0.0005 ? `<span><span class="sw ${cls}"></span>${name} <b>${pct(p)}</b></span>` : '');
  return `<div class="bar" role="img" aria-label="Odds">${seg('break', o.win)}${seg('foul', o.manTaken)}${seg('unhorse', o.youTaken)}</div>
    <div class="legend">${item('break', OUT_WORD.win[action], o.win)}${item('miss', 'Beaten off', o.repulsed)}${item('foul', 'A man taken', o.manTaken)}${item('unhorse', 'You taken', o.youTaken)}<span>Wound <b>${pct(o.hurt)}</b></span></div>`;
}

function lastPass(state, m) {
  const r = m.last;
  if (!r) return '';
  const name = (id) => m.riders[id]?.name || 'a knight';
  let text;
  if (r.action === 'recet') text = 'You rode to the recet and got your wind back.';
  else if (r.outcome === 'win') text = r.action === 'take' ? `${name(r.target)} yielded to you: your prisoner.` : r.action === 'strike' ? `You beat ${name(r.target)} from the saddle and rode on.` : `You broke in and brought ${name(r.comrade)} out.`;
  else if (r.outcome === 'repulsed') text = `${name(r.target)} beat you off.`;
  else if (r.outcome === 'manTaken') text = `${name(r.target)}’s men dragged off one of yours.`;
  else text = `${name(r.target)} took you.`;
  if (r.hurt) text += r.hurt === 'serious' ? ' You are hurt, and out of it.' : ' You took a knock.';
  return `<div class="call"><span class="eyebrow">${esc(MELEE.passes[r.pass].label)}</span><span class="hit">${esc(text)}</span></div>`;
}

export function renderMelee(state) {
  const ev = state.event;
  const m = ev.melee;
  const me = m.riders[YOU];
  const pass = MELEE.passes[m.pass];
  const counsel = m.openings.length ? squireCounsel(m, ev.tier, state.renown) : { index: 0, action: 'recet' };
  const theirs = m.yourSide === 'holders' ? 'comers' : 'holders';
  const outOf = (side) => m.sides[side].filter((id) => !standing(m, id)).length;
  const isCounsel = (i, a) => counsel.action === a && (a === 'recet' || counsel.index === i);
  const tag = '<span class="tag good">your squire’s counsel</span>';
  return `
  <section class="card lift stack">
    <div class="spread"><span class="eyebrow">${esc(pass.label)} · pass ${m.pass + 1} of ${MELEE.passes.length}</span><span class="eyebrow">${esc(TOWNS[ev.town].name)}</span></div>
    <p class="voice">${esc(pass.text)}</p>
    ${lastPass(state, m)}
    <p class="small">You are ${esc(youState(me, meleeThreshold(me)))}${m.men[YOU] ? `, with ${m.men[YOU]} of your men` : ''}. Prisoners ${m.prisoners.length}${m.beaten.length ? ` · beaten ${m.beaten.length}` : ''}${m.rescued.length ? ` · rescued ${m.rescued.length}` : ''}. Out of the fight: your side ${outOf(m.yourSide)}, theirs ${outOf(theirs)}.</p>
  </section>
  <section class="stack">
    <div class="eyebrow">In front of you</div>
    ${m.openings.map((op, i) => {
      const him = m.riders[op.id];
      const acts = op.kind === 'rescue' ? ['rescue'] : ['take', 'strike'];
      const heading = op.kind === 'rescue'
        ? `${esc(m.riders[op.comrade]?.name || 'A knight of your side')} is held by ${esc(him.name)}${op.men > 1 ? ` and ${op.men - 1} men` : ''}`
        : op.straggler ? `${esc(him.name)}, cut off from his side` : `${esc(him.name)}${op.men ? `, with ${op.men} ${op.men === 1 ? 'man' : 'men'}` : ', alone'}`;
      return `<article class="opt stack">
        <div class="rider">${shield(him.arms, 28)}<div style="flex:1;min-width:0">
          <div class="nm">${heading}</div>
          <div class="small muted">Sword ${him.sword} · Seat ${him.seat} · Horse ${him.horse.quality} · Renown ${him.renown}${blown(him) ? ' · <span class="neg">blown</span>' : ''}${op.kind !== 'rescue' ? ` · ransom ${lsd(ransomOf(ev.tier, him.renown || 0))}` : ''}</div>
        </div></div>
        ${acts.map((a) => `<button class="answer" data-melee="${i}:${a}">
          <span class="t">${esc(ACTIONS[a].label)} ${isCounsel(i, a) ? tag : ''}</span>
          ${meleeOdds(openingOdds(m, op, a), a)}
        </button>`).join('')}
      </article>`;
    }).join('') || '<div class="card"><p class="empty">Nobody of the other side is still in the field near you.</p></div>'}
    <button class="answer" data-melee="0:recet"><span class="t">${esc(ACTIONS.recet.label)} ${isCounsel(0, 'recet') ? tag : ''}</span>
      <span class="small muted">${esc(ACTIONS.recet.blurb)}</span></button>
  </section>`;
}

export function renderRansom(state) {
  const ev = state.event;
  const r = ev.dayResults.melee;
  const terms = ransomTerms(state);
  const effects = { full: '', half: 'Generous +1 · their regard +2', free: 'Generous +2 · Honour +1 · Renown +1 · their regard +4' };
  return `
  <section class="card lift stack-lg">
    <div class="stack">
      <div class="eyebrow">The mêlée is over</div>
      <p class="voice">${esc(dayLine(r))}</p>
    </div>
    <div class="stack">
      <div class="eyebrow">Your prisoners: ${esc(r.prisoners.join(', '))}</div>
      ${terms.map((t) => `<button class="answer" data-ransom="${t.id}"><span class="t">${esc(t.label)}</span>
        <span class="chips"><span class="chip">Purse ${lsdSigned(t.amount)}</span>${effects[t.id] ? `<span class="chip">${esc(effects[t.id])}</span>` : ''}</span></button>`).join('')}
      <p class="small muted">William Marshal took a hundred and three knights in ten months and kept a clerk to count them. Some knights let their prisoners go for nothing, and were sung about for it.</p>
    </div>
  </section>`;
}

function dayLine(r) {
  const parts = [];
  if (r.prisoners.length) parts.push(`You took ${r.prisoners.join(' and ')}.`);
  if (r.beaten.length) parts.push(`You beat ${r.beaten.join(' and ')} from the saddle.`);
  if (r.rescued.length) parts.push(`You brought ${r.rescued.join(' and ')} out.`);
  if (r.takenBy) parts.push(`${r.takenBy} took you.`);
  parts.push(r.even ? 'The heralds judged the sides even.' : r.sideWon ? 'Your side carried the field.' : 'Your side was beaten.');
  if (r.prize) parts.push('The heralds give you the prize of the tourney.');
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// The barriers
// ---------------------------------------------------------------------------

function footOddsRow(label, o) {
  const ends = o.down + o.disarm;
  const seg = (cls, p) => (p > 0.0005 ? `<i class="${cls}" style="width:${(p * 100).toFixed(2)}%"></i>` : '');
  const item = (cls, name, p) => (p > 0.0005 ? `<span><span class="sw ${cls}"></span>${name} <b>${pct(p)}</b></span>` : '');
  return `
  <div class="stack" style="gap:6px">
    <div class="who"><span class="eyebrow">${label}</span></div>
    <div class="bar" role="img" aria-label="${label}">${seg('helm', o.head)}${seg('break', o.blow)}${seg('unhorse', ends)}${seg('foul', o.foul)}</div>
    <div class="legend">
      ${item('helm', 'The head, 2', o.head)}${item('break', 'The body, 1', o.blow)}${item('unhorse', o.disarm > 0.0005 ? 'Takes his axe' : 'Drops him', ends)}
      ${item('foul', 'Foul, −1', o.foul)}${item('miss', 'Nothing', o.miss)}
    </div>
  </div>`;
}

function footPips(bout, ord) {
  const out = [];
  const total = Math.max(ord.exchanges, bout.n + (bout.done ? 0 : 1));
  for (let i = 0; i < total; i++) {
    const cls = i < bout.n ? 'done' : i === bout.n && !bout.done ? 'now' : '';
    out.push(`<i class="${cls} ${i >= ord.exchanges ? 'extra' : ''}"></i>`);
  }
  return `<div class="pips">${out.join('')}</div>`;
}

const FOOT_OUT = {
  miss: 'finds nothing', foul: 'hooks below the barrier: a foul', blow: 'lands on the body', head: 'rings the helm',
  disarm: 'takes the axe out of his hands', down: 'drives him to his knee',
};

function footCard(state, cf) {
  const ev = state.event;
  const f = ev.foot;
  const { bout, you, him } = cf;
  const ord = f.ord === 'outrance' ? OUTRANCE : ARTICLES;
  const title = ev.tier === 'trial' ? 'Trial by combat, à outrance' : ev.tier === 'greatpas' ? 'The white shield' : cf.final ? 'The barriers: the last two' : 'The barriers: the first combat';
  const hurtLine = f.ord === 'outrance' ? `<span class="sk">Head blows taken ${bout.hurts.a}/2</span>` : '';
  const hisHurt = f.ord === 'outrance' ? `<span class="sk">Head blows taken ${bout.hurts.b}/2</span>` : '';
  const last = f.last && bout.n > 0 ? `<div class="call"><span class="eyebrow">Exchange ${f.last.n}</span>
      <span class="muted">You: ${esc(STROKES[f.last.you.stroke].label.toLowerCase())}, ${esc(GUARDS[f.last.you.guard].label.toLowerCase())}. He: ${esc(STROKES[f.last.him.stroke].label.toLowerCase())}, ${esc(GUARDS[f.last.him.guard].label.toLowerCase())}.</span>
      <span class="hit">Your axe ${esc(FOOT_OUT[f.last.you.out])}.</span><span class="hit">His axe ${esc(FOOT_OUT[f.last.him.out])}.</span></div>` : '';
  return `
  <section class="card lift stack">
    <div class="spread"><span class="eyebrow">${esc(title)}</span><span class="eyebrow">Exchange ${Math.min(bout.n + 1, ord.exchanges + ord.tieExchanges)}${f.ord === 'outrance' ? ` of ${ord.exchanges}` : ''}</span></div>
    <div class="tilt">
      <div class="side"><span class="shield-you">${shield(you.arms, 48)}</span><span class="nm">You</span><span class="sk">Sword ${you.sword} · Vigour ${you.vigour}</span>${hurtLine}</div>
      <div class="score"><span class="n">${bout.scores.a}<span class="dash">–</span>${bout.scores.b}</span>${footPips(bout, ord)}</div>
      <div class="side"><span class="shield-him">${shield(him.arms, 48)}</span><span class="nm">${esc(him.name)}</span><span class="sk">Sword ${him.sword} · Vigour ${him.vigour}</span>${hisHurt}</div>
    </div>
    ${last}
  </section>`;
}

function footIntel(state, him) {
  const k = knownFootOf(state, him.id);
  const live = footTellsInPlay(state);
  const cost = heraldReadCost(state);
  let body;
  if (!k.level) body = '<p class="muted">You have never seen him fight on foot. The odds below assume the usual ways of the barriers, which may not be his.</p>';
  else {
    body = `<p class="habit">${esc(cap(k.label))}: ${esc(k.habit)}</p>`;
    if (k.level >= 2) body += k.noTells ? '<p class="small muted">He has no tells worth the name.</p>' : `<ul class="small">${k.tells.map((t) => `<li class="${live.includes(t) ? 'live' : ''}">${esc(t)}${live.includes(t) ? ' — now' : ''}</li>`).join('')}</ul>`;
  }
  if (him.grudge) body += '<p class="small neg">He bears you a grudge, and swings for your head. The odds allow for it.</p>';
  const buy = k.level < 2 ? `<button class="btn" data-read="${him.id}" ${state.purse >= cost ? '' : 'disabled'}>Pay the herald for his read, ${lsd(cost)}</button>` : '';
  return `<section class="card intel"><div class="eyebrow">What you know of him</div>${body}${buy}</section>`;
}

export function renderFoot(state, ui) {
  const cf = currentFoot(state);
  const r = footReckonNow(state);
  const choice = footChoiceByKey(`${ui.foot.stroke}/${ui.foot.guard}`);
  const pv = footPreview(state, choice, r);
  const basis = pv.intel >= 2 ? 'with the herald’s read of him' : pv.intel === 1 ? 'knowing his ways, not his tells' : 'assuming the usual ways of the barriers';
  const best = r.best;
  return `
  ${footCard(state, cf)}
  ${footIntel(state, cf.him)}
  <section class="card stack-lg">
    <div class="stack">
      <div class="eyebrow">Stroke</div>
      <div class="seg" role="group" aria-label="Stroke">${STROKE_IDS.map((s) => `<button data-stroke="${s}" aria-pressed="${ui.foot.stroke === s}">${STROKES[s].label}</button>`).join('')}</div>
      <p class="choice-note">${esc(STROKES[ui.foot.stroke].blurb)}</p>
    </div>
    <div class="stack">
      <div class="eyebrow">Guard</div>
      <div class="seg" role="group" aria-label="Guard">${GUARD_IDS.map((g) => `<button data-guard="${g}" aria-pressed="${ui.foot.guard === g}">${GUARDS[g].label}</button>`).join('')}</div>
      <p class="choice-note">${esc(GUARDS[ui.foot.guard].blurb)}</p>
    </div>
    <div class="odds">
      ${footOddsRow('Your axe', pv.mine)}
      ${footOddsRow('His axe at you', pv.his)}
      <div class="reckon">
        <div><div class="eyebrow">Squire’s reckoning</div><div class="small muted">Chance to win the combat if you fight the rest well, ${basis}.</div></div>
        <div class="pct">${pct(pv.win)}</div>
      </div>
    </div>
    <div class="stack">
      <button class="btn primary wide" data-act="foot-go">Strike</button>
      <button class="btn wide" data-act="foot-call">Take the squire’s call: ${esc(STROKES[best.stroke].label.toLowerCase())}, ${esc(GUARDS[best.guard].label.toLowerCase())} (${pct(r.byChoice[best.key])})</button>
      <button class="btn quiet" data-act="foot-auto">Fight the rest of it as the squire calls it</button>
    </div>
  </section>`;
}

const HOW_FOOT = {
  points: 'on points', down: 'by driving his man to his knee', disarm: 'by taking the axe from his hands',
  hurt: 'by two blows to the head', judges: 'by the judges’ verdict', baton: 'when the king threw down his baton',
};

export function renderFootResult(state) {
  const ev = state.event;
  const f = ev.foot;
  const b = f.bout;
  const won = b.winner === 'a';
  const him = f.riders[b.b];
  const trial = ev.tier === 'trial';
  let after = '';
  if (f.mercy === 'pending') {
    const k = knightById(state, b.b);
    after = `<div class="stack">
      <p class="voice">${esc(him.name)} is on his knees before you, and the judges are waiting. It is yours to say.</p>
      <button class="answer" data-act="spare"><span class="t">Spare him</span><span class="chips"><span class="chip">Merciful +2</span><span class="chip">Honour +1</span><span class="chip">He lives, and remembers it</span></span></button>
      <button class="answer" data-act="finish"><span class="t">Finish it</span><span class="chips"><span class="chip bad">Merciful −3</span><span class="chip">${esc(k?.name || 'He')} dies</span></span></button>
    </div>`;
  } else {
    const next = trial ? 'Hear the judges' : won && f.round === 0 && f.other ? `On to the last two, against ${esc(f.riders[f.other.winner].name)}` : 'Leave the barriers';
    after = `<button class="btn primary wide" data-act="foot-on">${next}</button>`;
  }
  const verdict = trial ? (won ? 'God has judged for you' : 'Beaten') : won ? 'You win the combat' : 'Beaten';
  const yielded = trial && !won && ev.trial.outcome === 'yielded' ? `<p class="neg">You yield. ${esc(him.name)} lets you live.</p>` : '';
  return `
  ${footCard(state, { bout: b, you: f.riders[YOU], him, final: f.round > 0 })}
  <section class="card stack-lg">
    <div class="stack">
      <div class="verdict ${won ? 'win' : ''}">${verdict}</div>
      <p class="voice subhead">${won ? 'You won' : `${esc(him.name)} won`} ${esc(HOW_FOOT[b.how] || '')}, ${b.scores.a} to ${b.scores.b}.</p>
      ${yielded}
    </div>
    <div class="table-wrap"><table class="courses">
      <thead><tr><th>#</th><th>You</th><th>Him</th><th class="sc">Score</th></tr></thead>
      <tbody>${b.exchanges.map((x) => `<tr><td>${x.n}</td>
        <td>${STROKES[x.a.stroke].label} / ${GUARDS[x.a.guard].label}: ${esc(FOOT_OUT[x.a.out])}</td>
        <td>${STROKES[x.b.stroke].label} / ${GUARDS[x.b.guard].label}: ${esc(FOOT_OUT[x.b.out])}</td>
        <td class="sc">${x.scores.a}–${x.scores.b}</td></tr>`).join('')}</tbody>
    </table></div>
    ${after}
  </section>`;
}
