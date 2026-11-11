// Dashboard numbers: range filtering, totals and chart series. Pure, so testable without a page.
import { FEELS } from './workouts.js';

/** @typedef {import('./workouts.js').Session} Session */
/** @typedef {import('./workouts.js').Purchase} Purchase */

const DAY_MS = 86_400_000;

/** Days since the epoch, computed in UTC so time zones can't shift the day. */
export const dayNumber = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};
export const dayString = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** Weeks start on Monday. */
const weekStart = (n) => n - ((new Date(n * DAY_MS).getUTCDay() + 6) % 7);

function monthStart(day, months = 0) {
  const [y, m] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  return date.toISOString().slice(0, 10);
}

/** `count` buckets ending with today's; null ('all') starts at the first entry. */
export const RANGES = Object.freeze([
  { id: '1m', label: 'Month', unit: 'week', count: 5 },
  { id: '3m', label: '3 months', unit: 'week', count: 13 },
  { id: '1y', label: 'Year', unit: 'month', count: 12 },
  { id: 'all', label: 'All', unit: 'month', count: null },
]);
export const RANGE_IDS = Object.freeze(RANGES.map((r) => r.id));

/**
 * @typedef {{ start: string, end: string, label: string, title: string, count: number, minutes: number,
 *   cost: number, gear: number }} Bucket
 */

const monthName = (day, style) => new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, { month: style, timeZone: 'UTC' });
const dayMonth = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * Oldest first.
 * @param {string} rangeId
 * @param {string} today
 * @param {{ date: string }[]} dated  used by 'all' to find where it starts
 * @returns {Bucket[]}
 */
export function emptyBuckets(rangeId, today, dated = []) {
  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[0];
  const make = (start, end, label, title) => ({ start, end, label, title, count: 0, minutes: 0, cost: 0, gear: 0 });

  if (range.unit === 'week') {
    const last = weekStart(dayNumber(today));
    return Array.from({ length: range.count }, (_, i) => {
      const start = last - (range.count - 1 - i) * 7;
      return make(dayString(start), dayString(start + 6), dayMonth(dayString(start)), `Week of ${dayMonth(dayString(start))}`);
    });
  }

  let months = range.count;
  if (months == null) {
    const first = dated.reduce((min, s) => (s.date < min ? s.date : min), today);
    const [fy, fm] = first.split('-').map(Number);
    const [ty, tm] = today.split('-').map(Number);
    months = Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
    // past two years, bar per year instead
    if (months > 24) {
      return Array.from({ length: ty - fy + 1 }, (_, i) => {
        const year = String(fy + i);
        return make(`${year}-01-01`, `${year}-12-31`, year, year);
      });
    }
  }
  return Array.from({ length: months }, (_, i) => {
    const start = monthStart(today, i - months + 1);
    const end = dayString(dayNumber(monthStart(start, 1)) - 1);
    const year = start.slice(0, 4);
    return make(start, end, monthName(start, 'short'), `${monthName(start, 'long')} ${year}`);
  });
}

/**
 * Future dates beyond today's bucket are excluded.
 * @template T
 * @param {(T & { date: string })[]} dated
 * @param {string} rangeId
 * @param {string} today
 * @returns {T[]}
 */
export function inRange(dated, rangeId, today) {
  const buckets = emptyBuckets(rangeId, today, dated);
  const start = buckets[0].start;
  const end = buckets.at(-1).end;
  return dated.filter((s) => s.date >= start && s.date <= end);
}

const cents = (amount) => Math.round(amount * 100) / 100;

/**
 * `cost` is session fees; `gear` is purchases.
 * @param {Session[]} sessions
 * @param {string} rangeId
 * @param {string} today
 * @param {Purchase[]} [purchases]
 */
export function bucketize(sessions, rangeId, today, purchases = []) {
  const buckets = emptyBuckets(rangeId, today, [...sessions, ...purchases]);
  const bucketOf = (date) => buckets.find((b) => date >= b.start && date <= b.end);
  for (const s of sessions) {
    const bucket = bucketOf(s.date);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.minutes += s.minutes ?? 0;
    bucket.cost += s.cost ?? 0;
  }
  for (const p of purchases) {
    const bucket = bucketOf(p.date);
    if (bucket) bucket.gear += p.cost;
  }
  for (const b of buckets) {
    b.cost = cents(b.cost);
    b.gear = cents(b.gear);
  }
  return buckets;
}

/**
 * @param {Session[]} sessions  already in range
 * @param {string | null} resultKey
 * @param {Purchase[]} [purchases]  already in range
 */
export function summarize(sessions, resultKey = null, purchases = []) {
  const withHr = sessions.filter((s) => s.avgHr != null);
  const maxHrs = sessions.map((s) => s.maxHr).filter((v) => v != null);
  const costs = sessions.filter((s) => s.cost != null);
  const results = { win: 0, loss: 0, draw: 0 };
  if (resultKey) {
    for (const s of sessions) {
      const r = s.details?.[resultKey];
      if (typeof r === 'string' && r in results) results[r] += 1;
    }
  }
  const played = results.win + results.loss + results.draw;
  return {
    count: sessions.length,
    minutes: sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0),
    cost: cents(costs.reduce((sum, s) => sum + s.cost, 0)),
    costCount: costs.length,
    gear: cents(purchases.reduce((sum, p) => sum + p.cost, 0)),
    gearCount: purchases.length,
    avgHr: withHr.length ? Math.round(withHr.reduce((sum, s) => sum + s.avgHr, 0) / withHr.length) : null,
    maxHr: maxHrs.length ? Math.max(...maxHrs) : null,
    calories: sessions.reduce((sum, s) => sum + (s.calories ?? 0), 0),
    results,
    played,
    winRate: played ? Math.round((results.win / played) * 100) : null,
  };
}

export function feelMix(sessions) {
  return FEELS.map((f) => ({ ...f, count: sessions.filter((s) => s.feel === f.id).length }));
}

/** The latest `limit`, oldest first. */
export function heartRates(sessions, limit = 40) {
  return sessions
    .filter((s) => s.avgHr != null || s.maxHr != null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .slice(-limit);
}

/**
 * @typedef {{ name: string, played: number, win: number, loss: number, draw: number, ratio: number }} PartnerRecord
 */

/**
 * Each partner's matches with a result: ratio = wins ÷ matches played together. Best ratio first; on a tie, the
 * partner with more matches. Names are matched ignoring case.
 * @param {Session[]} sessions
 * @param {string} resultKey
 * @param {string} partnerKey
 * @returns {PartnerRecord[]}
 */
export function partnerRecords(sessions, resultKey, partnerKey) {
  /** @type {Map<string, PartnerRecord>} */
  const records = new Map();
  for (const s of sessions) {
    const partner = s.details?.[partnerKey];
    const result = s.details?.[resultKey];
    if (typeof partner !== 'string' || (result !== 'win' && result !== 'loss' && result !== 'draw')) continue;
    const key = partner.toLowerCase();
    const record = records.get(key) ?? { name: partner, played: 0, win: 0, loss: 0, draw: 0, ratio: 0 };
    record.played += 1;
    record[result] += 1;
    record.ratio = record.win / record.played;
    records.set(key, record);
  }
  return [...records.values()].sort((a, b) => b.ratio - a.ratio || b.played - a.played || a.name.localeCompare(b.name));
}

/**
 * An empty current week doesn't break the streak yet.
 * @param {Session[]} sessions  all of them, not just the range's
 * @param {string} today
 */
export function weekStreak(sessions, today) {
  const weeks = new Set(sessions.map((s) => weekStart(dayNumber(s.date))));
  let week = weekStart(dayNumber(today));
  if (!weeks.has(week)) week -= 7;
  let streak = 0;
  while (weeks.has(week)) {
    streak += 1;
    week -= 7;
  }
  return streak;
}

export const byNewest = (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
