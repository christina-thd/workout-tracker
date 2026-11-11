// A person's dashboard for one sport: Stats, Sessions and Gear tabs.
import { $, closest, escapeHtml } from '../shared/dom.js';
import { compact, dayLabel, duration, hours, money, plural } from '../shared/format.js';
import { hasWatch, partnerField, resultField, tracks } from '../shared/sports.js';
import { bucketize, feelMix, heartRates, inRange, partnerRecords, RANGES, summarize, weekStreak } from '../shared/stats.js';
import { sportIcon } from '../ui/emoji.js';
import { icon } from '../ui/icons.js';
import { columnChart, legend, lineChart, splitBar, wireTooltips } from './charts.js';
import { renderGear } from './gear-list.js';
import { renderSessions, sessionTitle } from './session-list.js';

/** @typedef {import('../shared/workouts.js').Session} Session */
/** @typedef {import('../shared/workouts.js').Purchase} Purchase */
/** @typedef {import('../shared/sports.js').Sport} Sport */

export const TABS = Object.freeze(['stats', 'sessions', 'gear']);

/** The tab to show: Stats instead of Gear for a sport without gear (a workout). */
export const tabFor = (sport, tab) => (tab === 'gear' && !sport.gear.length ? 'stats' : tab);

// chart colors come from CSS tokens
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const COLORS = {
  time: css('--series-1'),
  sessionCost: css('--series-3'),
  gear: css('--series-4'),
  avgHr: css('--series-1'),
  maxHr: css('--series-2'),
  win: css('--series-1'),
  draw: css('--series-neutral'),
  loss: css('--series-loss'),
  feels: { chill: css('--feel-chill'), good: css('--feel-good'), intense: css('--feel-intense'), exhausting: css('--feel-exhausting') },
};
const LIGHT_FEELS = new Set(['intense', 'exhausting']); // need dark text

function tile(label, iconName, value, sub) {
  return `<div class="tile"><span class="tile-label">${icon(iconName)}${escapeHtml(label)}</span>
    <span class="tile-value">${escapeHtml(value)}</span><span class="tile-sub">${escapeHtml(sub)}</span></div>`;
}

function chartCard(title, sub, body) {
  return `<article class="chart"><div class="chart-head"><h3 class="chart-title">${escapeHtml(title)}</h3>
    <span class="chart-sub">${escapeHtml(sub)}</span></div><div class="chart-plot">${body}</div></article>`;
}
const emptyChart = (text) => `<p class="chart-empty">${escapeHtml(text)}</p>`;

/** One row per partner: name, a bar for the share of matches won together, and the numbers. */
function partnerBars(records) {
  return `<ul class="partners">${records.map((r) => {
    const percent = Math.round(r.ratio * 100);
    const tip = `${r.name}\n${r.win}W · ${r.loss}L${r.draw ? ` · ${r.draw}D` : ''} in ${r.played} ${r.played === 1 ? 'match' : 'matches'}`;
    return `<li class="partner" data-tip="${escapeHtml(tip)}">
      <span class="partner-name">${escapeHtml(r.name)}</span>
      <span class="partner-track"><span class="partner-bar" style="width:${percent}%;background:${COLORS.win}"></span></span>
      <span class="partner-value">${percent}% <span class="partner-count">· ${r.win} of ${r.played}</span></span>
    </li>`;
  }).join('')}</ul>`;
}

/**
 * @param {{ sport: Sport, tab: string, sessions: Session[], purchases: Purchase[], range: string, today: string,
 *   currency: string }} view  sessions, purchases: unfiltered by range
 */
export function renderDashboard({ sport, tab, sessions, purchases, range, today, currency }) {
  $('sportButton').innerHTML = `${icon('back')}${sportIcon(sport)}<span>${escapeHtml(sport.name)}</span>`;
  for (const button of $('viewTabs').querySelectorAll('[data-tab]')) {
    if (!(button instanceof HTMLElement)) continue;
    button.hidden = button.dataset.tab === 'gear' && !sport.gear.length;
    button.classList.toggle('selected', button.dataset.tab === tab);
    button.setAttribute('aria-selected', String(button.dataset.tab === tab));
  }
  for (const panel of document.querySelectorAll('[data-panel]')) {
    if (panel instanceof HTMLElement) panel.hidden = panel.dataset.panel !== tab;
  }
  $('addButton').setAttribute('aria-label', tab === 'gear' ? 'Add a purchase' : 'Log a session');

  if (tab === 'sessions') return renderSessions({ sport, sessions, today, currency });
  if (tab === 'gear') return renderGear({ sport, purchases, today, currency });
  renderStats({ sport, sessions, purchases, range, today, currency });
}

function renderStats({ sport, sessions, purchases, range, today, currency }) {
  $('rangeTabs').innerHTML = RANGES.map((r) =>
    `<button type="button" role="radio" data-range="${r.id}" class="${r.id === range ? 'selected' : ''}" aria-checked="${r.id === range}">${r.label}</button>`).join('');

  const result = resultField(sport);
  const shown = inRange(sessions, range, today);
  const bought = inRange(purchases, range, today);
  const sum = summarize(shown, result?.key ?? null, bought);
  const rangeName = RANGES.find((r) => r.id === range)?.label ?? '';
  const perRange = range === 'all' ? 'all time' : range === '1m' ? 'last 5 weeks' : range === '3m' ? 'last 13 weeks' : 'last 12 months';

  // ----- tiles -----
  const streak = weekStreak(sessions, today);
  const spent = sum.cost + sum.gear;
  // what the sport tracks decides the tiles and charts (a workout: just sessions and the streak)
  const timed = tracks(sport, 'time');
  const costs = tracks(sport, 'cost') || sport.gear.length > 0;
  const tiles = [tile('Sessions', 'calendar', String(sum.count), perRange)];
  if (timed) {
    tiles.push(tile('Time played', 'clock', sum.count ? duration(sum.minutes) : '0h', sum.count ? `${duration(sum.minutes / sum.count)} a session` : perRange));
  }
  if (costs) {
    tiles.push(tile('Spent', 'coin', money(Math.round(spent * 100) / 100, currency),
      spent ? `${money(sum.cost, currency)} play · ${money(sum.gear, currency)} gear` : 'nothing logged'));
  }
  if (result) {
    tiles.push(tile('Win rate', 'trophy', sum.winRate == null ? '–' : `${sum.winRate}%`,
      sum.played ? `${sum.results.win}W · ${sum.results.loss}L${sum.results.draw ? ` · ${sum.results.draw}D` : ''}` : 'no results yet'));
  }
  if (hasWatch(sport)) {
    tiles.push(tile('Avg heart rate', 'heart', sum.avgHr == null ? '–' : `${sum.avgHr} bpm`, sum.maxHr == null ? 'from your watch' : `max ${sum.maxHr} bpm`));
  }
  tiles.push(tile('Streak', 'streak', plural(streak, 'week'), streak ? 'in a row' : 'play to start one'));
  $('tiles').innerHTML = tiles.join('');

  // ----- charts -----
  const charts = $('charts');
  const columns = matchMedia('(min-width: 900px)').matches ? 2 : 1;
  const width = Math.max(240, Math.floor((charts.clientWidth - (columns - 1) * 12) / columns) - 30);
  const buckets = bucketize(shown, range, today, bought);
  const cards = [];

  if (timed) {
    cards.push(chartCard('Time played', `${hours(sum.minutes)}h · ${rangeName.toLowerCase()}`, sum.count
      ? columnChart({
        width,
        series: [{ name: 'Time played', color: COLORS.time }],
        items: buckets.map((b) => ({ label: b.label, values: [hours(b.minutes)], tip: `${b.title}\n${b.count ? `${plural(b.count, 'session')} · ${duration(b.minutes)}` : 'No sessions'}` })),
        axis: (v) => `${compact(v)}h`,
        valueLabel: (v) => `${compact(v)}h`,
      })
      : emptyChart('No sessions in this range yet.')));
  } else {
    // no time to chart: how many sessions, per week or month
    cards.push(chartCard('Sessions', `${plural(sum.count, 'session')} · ${rangeName.toLowerCase()}`, sum.count
      ? columnChart({
        width,
        series: [{ name: 'Sessions', color: COLORS.time }],
        items: buckets.map((b) => ({ label: b.label, values: [b.count], tip: `${b.title}\n${b.count ? plural(b.count, 'session') : 'No sessions'}` })),
        axis: (v) => (Number.isInteger(v) ? String(v) : ''), // whole sessions only
        valueLabel: (v) => String(v),
      })
      : emptyChart('No sessions in this range yet.')));
  }

  if (costs) {
    cards.push(chartCard('Spending', money(Math.round(spent * 100) / 100, currency), spent
      ? columnChart({
        width,
        series: [{ name: 'Sessions', color: COLORS.sessionCost }, { name: 'Gear', color: COLORS.gear }],
        items: buckets.map((b) => ({
          label: b.label,
          values: [b.cost, b.gear],
          tip: `${b.title}\n${money(Math.round((b.cost + b.gear) * 100) / 100, currency)}${b.gear ? ` · ${money(b.cost, currency)} play, ${money(b.gear, currency)} gear` : ''}`,
        })),
        axis: (v) => compact(v),
        valueLabel: (v) => money(Math.round(v * 100) / 100, currency),
      })
      : emptyChart('Add what sessions cost, or what you buy in Gear, to see your spending.')));
  }

  if (tracks(sport, 'feel')) {
    const feels = feelMix(shown);
    cards.push(chartCard('How it felt', plural(sum.count, 'session'), sum.count
      ? splitBar({
        width,
        parts: feels.map((f) => ({ name: f.label, emoji: f.emoji, count: f.count, color: COLORS.feels[f.id], light: LIGHT_FEELS.has(f.id), tip: f.label })),
      })
      : emptyChart('No sessions in this range yet.')));
  }

  if (result) {
    // won, drawn, lost: only the outcomes the sport has (basketball has no draws)
    const outcomes = ['win', 'draw', 'loss']
      .map((id) => result.options.find((o) => o.id === id))
      .filter(Boolean);
    cards.push(chartCard('Results', sum.played ? `${sum.winRate}% won` : '', sum.played
      ? splitBar({
        width,
        parts: outcomes.map((o) => ({ name: o.label, count: sum.results[o.id], color: COLORS[o.id], tip: o.label })),
      })
      : emptyChart('Add your results to see how you do.')));

    const partner = partnerField(sport);
    if (partner) {
      const records = partnerRecords(shown, result.key, partner.key);
      cards.push(chartCard('Partners', records.length ? `Best: ${records[0].name}` : '', records.length
        ? partnerBars(records)
        : emptyChart('Pick your partner and the result of your matches to see who you win with most.')));
    }
  }

  if (hasWatch(sport)) {
    const hr = heartRates(shown);
    const series = [{ name: 'Average', color: COLORS.avgHr }, { name: 'Max', color: COLORS.maxHr }];
    cards.push(chartCard('Heart rate', hr.length ? `${plural(hr.length, 'session')} · bpm` : '', hr.length
      ? lineChart({
        width,
        series,
        points: hr.map((s) => ({
          values: [s.avgHr, s.maxHr],
          tip: `${dayLabel(s.date, today)} · ${sessionTitle(sport, s)}\n${[s.avgHr != null && `avg ${s.avgHr} bpm`, s.maxHr != null && `max ${s.maxHr} bpm`, s.calories != null && `${s.calories} kcal`].filter(Boolean).join(' · ')}`,
        })),
      }) + legend(series, { line: true })
      : emptyChart("Add your smartwatch's heart rate to a session to see it here.")));
  }

  charts.innerHTML = cards.join('');
}

/**
 * @param {{ onTab(tab: string): void, onRange(range: string): void, onOpenSession(id: string): void,
 *   onOpenPurchase(id: string): void, onBack(): void }} handlers
 */
export function wireDashboard({ onTab, onRange, onOpenSession, onOpenPurchase, onBack }) {
  $('viewTabs').addEventListener('click', (e) => {
    const tab = closest(e, '[data-tab]');
    if (tab) onTab(tab.dataset.tab);
  });
  $('rangeTabs').addEventListener('click', (e) => {
    const button = closest(e, '[data-range]');
    if (button) onRange(button.dataset.range);
  });
  $('sessionList').addEventListener('click', (e) => {
    const row = closest(e, '[data-session]');
    if (row) onOpenSession(row.dataset.session);
  });
  $('gearList').addEventListener('click', (e) => {
    const row = closest(e, '[data-purchase]');
    if (row) onOpenPurchase(row.dataset.purchase);
  });
  $('sportButton').addEventListener('click', onBack);
  wireTooltips($('charts'));
}
