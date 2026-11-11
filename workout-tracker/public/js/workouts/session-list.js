// Sessions tab: sessions by month, newest first.
import { $, escapeHtml } from '../shared/dom.js';
import { dayLabel, duration, money, plural } from '../shared/format.js';
import { parseScore, resultField, scoreField } from '../shared/sports.js';
import { byNewest } from '../shared/stats.js';
import { feelOf } from '../shared/workouts.js';
import { emoji } from '../ui/emoji.js';
import { icon } from '../ui/icons.js';
import { groupByMonth } from './rows.js';

/** @typedef {import('../shared/workouts.js').Session} Session */
/** @typedef {import('../shared/sports.js').Sport} Sport */

function optionOf(sport, session, key) {
  const field = sport.fields.find((f) => f.key === key);
  return field?.kind === 'choice' ? field.options.find((o) => o.id === session.details[key]) ?? null : null;
}

/** e.g. "Match with Alex"; falls back to the sport name. */
export function sessionTitle(sport, session) {
  const first = sport.fields[0];
  const type = first?.kind === 'choice' ? optionOf(sport, session, first.key) : null;
  const name = type ? type.label : sport.name;
  return session.details.partner ? `${name} with ${session.details.partner}` : name;
}

function sessionRow(sport, s, today, currency) {
  const feel = feelOf(s.feel);
  const result = resultField(sport);
  const score = scoreField(sport);
  const opponents = [s.details.opponents ?? []].flat();
  const meta = [`<span>${escapeHtml(dayLabel(s.date, today))}</span>`];
  const sets = score ? parseScore(s.details[score.key], score.maxSets) : null;
  if (sets) meta.push(`<span class="score">${sets.map(([a, b, ta, tb]) => `<span>${a}–${b}${ta != null ? `<small>(${ta}–${tb})</small>` : ''}</span>`).join('')}</span>`);
  if (opponents.length) meta.push(`<span>vs ${escapeHtml(opponents.join(' & '))}</span>`);
  if (s.details.venue) meta.push(`<span>${escapeHtml(String(s.details.venue))}</span>`);
  if (s.cost != null) meta.push(`<span>${icon('coin')}${escapeHtml(money(s.cost, currency))}</span>`);
  if (s.avgHr != null) meta.push(`<span>${icon('heart')}${s.avgHr}</span>`);
  if (s.note) meta.push(`<span>${icon('note')}</span>`);
  const outcome = result ? s.details[result.key] : null;
  const label = outcome ? optionOf(sport, s, result.key)?.label : null;
  return `<li><button type="button" class="row" data-session="${s.id}">
    <span class="row-emoji" title="${escapeHtml(feel.label)}">${emoji(feel.emoji, feel.label)}</span>
    <span class="row-main"><span class="row-title">${escapeHtml(sessionTitle(sport, s))}</span><span class="row-meta">${meta.join('')}</span></span>
    <span class="row-side"><span class="row-value">${duration(s.minutes)}</span>${label ? `<span class="result ${outcome}">${escapeHtml(label)}</span>` : ''}</span>
  </button></li>`;
}

/** @param {{ sport: Sport, sessions: Session[], today: string, currency: string }} view */
export function renderSessions({ sport, sessions, today, currency }) {
  const list = [...sessions].sort(byNewest);
  $('sessionList').innerHTML = list.length
    ? groupByMonth(list, {
      summary: (month) => `<span>${plural(month.length, 'session')} · ${duration(month.reduce((t, s) => t + s.minutes, 0))}</span>`,
      html: (s) => sessionRow(sport, s, today, currency),
    })
    : `<p class="empty">Log your first ${escapeHtml(sport.name.toLowerCase())} session with the + button.</p>`;
}
