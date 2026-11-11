// Gear tab: purchases by month, with per-category totals.
import { $, escapeHtml } from '../shared/dom.js';
import { dayLabel, money } from '../shared/format.js';
import { byNewest } from '../shared/stats.js';
import { icon } from '../ui/icons.js';
import { groupByMonth } from './rows.js';

/** @typedef {import('../shared/workouts.js').Purchase} Purchase */
/** @typedef {import('../shared/sports.js').Sport} Sport */

const total = (list) => Math.round(list.reduce((sum, p) => sum + p.cost, 0) * 100) / 100;

/** @param {{ sport: Sport, purchases: Purchase[], today: string, currency: string }} view */
export function renderGear({ sport, purchases, today, currency }) {
  if (!purchases.length) {
    $('gearList').innerHTML = `<p class="empty">Rackets, balls, shoes, lessons: add what you buy for
      ${escapeHtml(sport.name.toLowerCase())} with the + button, and it counts in your spending.</p>`;
    return;
  }
  const year = today.slice(0, 4);
  const kindOf = (id) => sport.gear.find((g) => g.id === id)?.label ?? id;
  const byKind = sport.gear
    .map((g) => ({ label: g.label, cost: total(purchases.filter((p) => p.category === g.id)) }))
    .filter((k) => k.cost > 0)
    .sort((a, b) => b.cost - a.cost);

  const summary = `<div class="tiles gear-tiles">
      <div class="tile"><span class="tile-label">${icon('bag')}All gear</span><span class="tile-value">${escapeHtml(money(total(purchases), currency))}</span>
        <span class="tile-sub">${purchases.length} bought</span></div>
      <div class="tile"><span class="tile-label">${icon('calendar')}This year</span>
        <span class="tile-value">${escapeHtml(money(total(purchases.filter((p) => p.date.startsWith(year))), currency))}</span>
        <span class="tile-sub">${year}</span></div>
    </div>
    <ul class="kind-totals">${byKind.map((k) => `<li><span>${escapeHtml(k.label)}</span><span>${escapeHtml(money(k.cost, currency))}</span></li>`).join('')}</ul>`;

  const rows = groupByMonth([...purchases].sort(byNewest), {
    summary: (month) => `<span>${escapeHtml(money(total(month), currency))}</span>`,
    html: (p) => `<li><button type="button" class="row" data-purchase="${p.id}">
      <span class="row-emoji">${icon('bag')}</span>
      <span class="row-main"><span class="row-title">${escapeHtml(p.item)}</span>
        <span class="row-meta"><span>${escapeHtml(kindOf(p.category))}</span><span>${escapeHtml(dayLabel(p.date, today))}</span>${p.note ? `<span>${icon('note')}</span>` : ''}</span></span>
      <span class="row-side"><span class="row-value">${escapeHtml(money(p.cost, currency))}</span></span>
    </button></li>`,
  });
  $('gearList').innerHTML = summary + rows;
}
