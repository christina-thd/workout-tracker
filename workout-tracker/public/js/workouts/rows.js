// Month-grouped row lists for the Sessions and Gear tabs.
import { escapeHtml } from '../shared/dom.js';
import { monthLabel } from '../shared/format.js';

/**
 * @template {{ date: string }} T
 * @param {T[]} list  newest first
 * @param {{ summary(month: T[]): string, html(entry: T): string }} row
 */
export function groupByMonth(list, row) {
  let html = '';
  for (let i = 0; i < list.length;) {
    const month = list[i].date.slice(0, 7);
    const inMonth = [];
    while (i < list.length && list[i].date.startsWith(month)) inMonth.push(list[i++]);
    html += `<h3 class="month-head"><span>${escapeHtml(monthLabel(inMonth[0].date))}</span>${row.summary(inMonth)}</h3>
      <ul class="row-list">${inMonth.map(row.html).join('')}</ul>`;
  }
  return html;
}
