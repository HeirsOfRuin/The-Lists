// The Hearth tab: your wife and children, the ladies of the realm and how
// your suit stands with each, and the ways to a title. Reads the engine;
// computes nothing.

import { MATCHES, VALUES, TITLES, RIVALS } from '../data/hearth.data.js';
import { TOWNS, FACTION_LABELS } from '../data/world.data.js';
import {
  ladyName, hasMet, heartFree, ladyTerms, canAsk, canElope, approachesFor,
} from '../engine/hearth.js';
import { courtOption, isFree } from '../engine/season.js';
import { petitionTerms, canPetition, petitionChance } from '../engine/title.js';
import { knightById } from '../engine/field.js';
import { lsd } from '../engine/money.js';
import { esc, pct, cap, ordinal, days } from './view.js';

const tick = (ok) => `<span class="${ok ? 'pos' : 'faint'}">${ok ? '✓' : '○'}</span>`;

export function renderHearth(state, ui) {
  return `${renderHouse(state)}${renderTitle(state)}${renderLadies(state, ui)}`;
}

function renderHouse(state) {
  const sp = state.spouse;
  const kids = state.children || [];
  const engaged = state.engaged ? state.ladies.find((l) => l.id === state.engaged.id) : null;
  let body;
  if (sp) {
    body = `<p class="voice">${sp.alive ? 'Your wife' : 'Your late wife'}, ${esc(sp.name)}${MATCHES[sp.kind] ? `, ${esc(MATCHES[sp.kind].label)}` : ''}. Married in the ${ordinal(sp.since)} year${sp.how === 'elope' ? ', without her family’s leave' : ''}.${sp.alive ? '' : ' She died in childbed.'}</p>
      ${kids.length ? `<p class="small">Your children: ${kids.map((c) => `${esc(c.name)} (${c.son ? 'a son' : 'a daughter'}, born in year ${c.born})`).join(', ')}.</p>` : `<p class="small muted">${sp.alive ? 'No children yet.' : ''}</p>`}
      ${sp.alive ? '<p class="small muted">She keeps your household and the rolls of your manors: her household costs £2 a winter, and her stewardship brings £1 a manor.</p>' : ''}`;
  } else if (engaged) {
    body = `<p class="voice">You are betrothed to ${esc(ladyName(engaged))}. The wedding is at Candlemas.</p>`;
  } else if (state.heart === 'promised') {
    body = `<p class="voice">You are promised to the lady ${esc(state.betrothed)}, as your family arranged. The wedding waits on her family’s letter.</p>`;
  } else if (state.heart === 'secret') {
    body = '<p class="voice">Your heart is given, to a lady you cannot name. Nobody here can know.</p>';
  } else {
    body = '<p class="small muted">You are unmarried. A wife brings a dowry and often land, her family’s goodwill, a household and heirs. Marriage in Lothmere is land and alliance first; but a lady chooses too.</p>';
  }
  return `<section class="card lift stack">
    <div class="heading">Hearth</div>
    ${body}
  </section>`;
}

function renderTitle(state) {
  if (state.title) {
    const how = { war: 'for your part in the war', petition: 'by letters patent, on your petition', marriage: 'by right of your wife' }[state.title.how];
    return `<section class="card stack">
      <div class="eyebrow">Your title</div>
      <p class="voice">Lord ${esc(state.title.seat)}, a baron of the realm, since the ${ordinal(state.title.since)} year, ${how}.</p>
      <p class="small muted">A lord is bidden to every great tourney and counts for more when the realm divides. He keeps a lord’s household (${lsd(TITLES.household)} a winter), and answers the summons to the great council at Kingsmead each April in peace, or the Crown remembers.</p>
    </section>`;
  }
  const r = state.realm;
  const ward = (state.ladies || []).find((l) => l.kind === 'ward' && l.status === 'free');
  const terms = petitionTerms(state);
  const war = r?.war?.done ? 'The war is decided.' : r?.war ? 'The war is being fought now.' : 'The war is still to come.';
  return `<section class="card stack">
    <div class="eyebrow">The ways to a title</div>
    <p class="small"><b>By the war.</b> The new crown makes barons of the men who won it the deciding battle: its councillors of war who fought there rather than kept to the reserve, and its captains who led the charge there and hold ${TITLES.war.captainManors} manors. ${war}</p>
    <div class="small"><b>By petition.</b> In any winter of peace, a knight may petition the king’s council for letters patent. The council hears one who holds:
      <ul class="terms">${terms.map((t) => `<li>${tick(t.ok)} ${esc(t.label)} <span class="faint">(you have ${t.have})</span></li>`).join('')}</ul>
      ${canPetition(state).ok ? `<span class="pos">You may petition this winter: the council would grant it at about ${pct(petitionChance(state))}.</span>` : ''}</div>
    <p class="small"><b>By marriage.</b> ${ward ? `${esc(cap(ladyName(ward)))} is heiress to the barony of ${esc(ward.barony)}, and a ward of the Crown at Kingsmead. Her husband will be Lord ${esc(ward.barony)}.` : 'The barony in the Crown’s wardship has been given in marriage.'}</p>
  </section>`;
}

function renderLadies(state, ui) {
  const free = heartFree(state);
  const ladies = (state.ladies || []).filter((l) => l.status === 'free' && !l.jilted);
  const married = (state.ladies || []).filter((l) => l.status === 'married');
  const order = [...ladies].sort((a, b) => (hasMet(state, b) - hasMet(state, a)) || b.affection - a.affection);
  return `<section class="stack">
    <div class="eyebrow">The ladies of the realm</div>
    ${free.ok ? '<p class="small muted">You meet the ladies of every town you go to. Court her at her family’s house, or ride in her colours where she can see it; her family has its terms, and she has her own mind. Every lady has another suitor, and her family will not wait for ever.</p>'
      : `<p class="small muted">${esc(free.reason)}</p>`}
    ${order.map((l) => renderLady(state, l, ui, free.ok)).join('')}
    ${married.length ? `<div class="card stack"><div class="eyebrow">Married elsewhere</div>
      <ul class="notes">${married.map((l) => `<li>${esc(cap(ladyName(l)))}, to ${esc(knightById(state, l.husband)?.name || 'a knight')}</li>`).join('')}</ul></div>` : ''}
  </section>`;
}

function renderLady(state, l, ui, free) {
  const M = MATCHES[l.kind] || {};
  const met = hasMet(state, l);
  const open = ui.lady === l.id;
  const rival = l.rival ? knightById(state, l.rival.id) : null;
  const brings = [];
  if (l.pounds) brings.push(`£${l.pounds}`);
  if (l.manors) brings.push(`${l.manors} manor${l.manors === 1 ? '' : 's'}`);
  if (l.barony) brings.push(`the barony of ${l.barony}`);
  if (M.brings?.favour && l.faction) brings.push(`the goodwill of ${FACTION_LABELS[l.faction]}`);
  const terms = ladyTerms(state, l);
  const ask = canAsk(state, l);
  const elope = canElope(state, l);
  const court = courtOption(state, l.id);
  const pick = ui.approach?.[l.id] || null;
  return `<details class="card lady stack" ${open ? 'open' : ''}>
    <summary data-lady-open="${l.id}"><span class="subhead">${esc(cap(ladyName(l)))}</span>
      <span class="small muted">${esc(M.label || '')}, ${l.age}, at ${esc(TOWNS[l.town].name)}${met ? ` · affection ${Math.round(l.affection)}` : ' · not yet met'}</span></summary>
    <p class="small muted">${esc(M.blurb || '')}</p>
    <p class="small">She brings ${esc(brings.join(', ') || 'herself')}. She values ${esc(VALUES[l.value].label)}.</p>
    ${met ? `<div class="meter affection" title="Her affection ${Math.round(l.affection)} of 100"><i style="width:${Math.round(l.affection)}%"></i></div>` : `<p class="small faint">You have not met her. Her family is at ${esc(TOWNS[l.town].name)}: go there for a tourney or to court, and you will.</p>`}
    <div class="small">Before her family will hear you, and she will say yes:
      <ul class="terms">${terms.map((t) => `<li>${tick(t.ok)} ${esc(t.label)} <span class="faint">(${t.hers ? 'hers' : 'you have'} ${t.have})</span></li>`).join('')}</ul></div>
    ${rival ? `<p class="small">${esc(rival.name)} is courting her too: his suit stands at ${l.rival.suit} of ${RIVALS.wins}. If it reaches ${RIVALS.wins} while it stands above her affection for you, her family gives her to him.</p>` : ''}
    ${free && met ? `
      <div class="stack">
        <div class="eyebrow">A month at her family’s house</div>
        ${approachesFor(state, l).map((a) => `<button class="option" data-approach="${l.id}:${a.id}" aria-pressed="${pick === a.id}">
          <span class="t">${esc(a.label)} · ${a.check ? pct(a.chance) : 'certain'}</span>
          <span class="small muted">${esc(a.does)} Affection +${a.gain}${a.loss ? `, or −${a.loss} if it goes wrong` : ''}${a.cost ? `; costs ${lsd(a.cost)}` : ''}.${a.valued ? ' She values this.' : ''}${a.used ? ` Tried ${a.used} time${a.used === 1 ? '' : 's'} already.` : ''}</span>
        </button>`).join('')}
        ${court.open
          ? `<button class="btn primary" data-court-lady="${l.id}" ${pick ? '' : 'disabled'}>${pick ? `Spend the month courting her at ${esc(TOWNS[l.town].name)}${court.days ? ` (${days(court.days)}, ${lsd(court.road)})` : ''}` : 'Choose how to court her'}</button>`
          : `<p class="small faint">${esc(court.reason || '')}</p>`}
      </div>
      <button class="btn" data-ask-hand="${l.id}" ${ask.ok ? '' : 'disabled'}>Ask her family for her hand</button>
      ${ask.ok ? '' : `<p class="small faint">${esc(ask.reason)}</p>`}
      ${elope.ok ? `<button class="btn quiet" data-elope="${l.id}" ${isFree(state) ? '' : 'disabled'}>Marry her without her family’s leave (honour −3; no dowry)</button>` : ''}` : ''}
  </details>`;
}

/** A compact line for the month's screen: whom you court, and the council if it sits. */
export function renderHeartLine(state) {
  const best = (state.ladies || []).filter((l) => l.status === 'free' && l.affection > 0).sort((a, b) => b.affection - a.affection)[0];
  if (!best || !heartFree(state).ok) return '';
  const rival = best.rival ? knightById(state, best.rival.id) : null;
  return `<section class="card stack heartline">
    <div class="spread"><span class="eyebrow">Your suit</span><button class="linkbtn small" data-tab="hearth">Hearth</button></div>
    <p class="small">${esc(cap(ladyName(best)))}: her affection ${Math.round(best.affection)}${rival ? `; ${esc(rival.name)}’s suit ${best.rival.suit} of ${RIVALS.wins}` : ''}.</p>
  </section>`;
}

/** The ladies at a tourney, on the arrival screen: whose colours you might ride in. */
export function renderColours(state, ladies, check) {
  const ev = state.event;
  if (!ladies.length) return '';
  const wearing = ev.colours ? state.ladies.find((l) => l.id === ev.colours) : null;
  return `<section class="card stack">
    <div class="eyebrow">In the gallery</div>
    ${wearing ? `<p class="small">You ride in the colours of ${esc(ladyName(wearing))}. She will see every course.</p>` : `
    ${ladies.map((l) => {
      const c = check(l);
      return `<div class="rider"><div style="flex:1"><div class="nm">${esc(cap(ladyName(l)))}</div>
        <div class="small muted">${c.ok ? 'She might give you her sleeve to wear.' : esc(c.reason)}</div></div>
        ${c.ok ? `<button class="btn" data-colours="${l.id}">Ask for her sleeve</button>` : ''}</div>`;
    }).join('')}
    <p class="small faint">A sleeve on your helm: every bout you win in it, she sees; a prize won in it is worth more than the prize. Beaten in the first round, she sees that too.</p>`}
  </section>`;
}

