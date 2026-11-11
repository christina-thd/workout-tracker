import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  bucketize, emptyBuckets, feelMix, heartRates, inRange, partnerRecords, summarize, weekStreak,
} from '../public/js/shared/stats.js';
import { isDate } from '../public/js/shared/workouts.js';

/** @typedef {import('../public/js/shared/workouts.js').Session} Session */

let n = 0;
/**
 * @param {string} date
 * @param {Partial<Session>} [extra]
 * @returns {Session}
 */
const session = (date, extra = {}) => ({
  id: String(++n), personId: 'p', sport: 'padel', date, minutes: 60, feel: 'good', cost: null, avgHr: null, maxHr: null,
  calories: null, note: '', details: {}, createdAt: n, updatedAt: n, ...extra,
});

const TODAY = '2026-11-11'; // a Wednesday

describe('ranges', () => {
  test('weeks start on Monday and end with this week', () => {
    const weeks = emptyBuckets('1m', TODAY);
    assert.equal(weeks.length, 5);
    assert.equal(weeks.at(-1).start, '2026-11-09');
    assert.equal(weeks.at(-1).end, '2026-11-15');
    assert.equal(weeks[0].start, '2026-10-12');
  });

  test('a year is twelve months, ending with this one', () => {
    const months = emptyBuckets('1y', TODAY);
    assert.equal(months.length, 12);
    assert.equal(months[0].start, '2025-12-01');
    assert.equal(months.at(-1).start, '2026-11-01');
    assert.equal(months.at(-1).end, '2026-11-30');
    assert.equal(emptyBuckets('1y', '2026-03-15').find((m) => m.start === '2026-02-01').end, '2026-02-28');
  });

  test('all: months from the first session, or years after two years', () => {
    assert.equal(emptyBuckets('all', TODAY, [session('2026-09-03')]).length, 3);
    assert.equal(emptyBuckets('all', TODAY, []).length, 1);
    const years = emptyBuckets('all', TODAY, [session('2023-05-01')]);
    assert.deepEqual(years.map((y) => y.label), ['2023', '2024', '2025', '2026']);
  });

  test('every bucket is a real day range', () => {
    for (const range of ['1m', '3m', '1y']) {
      for (const b of emptyBuckets(range, TODAY)) assert.ok(isDate(b.start) && isDate(b.end) && b.start <= b.end);
    }
  });

  test('inRange keeps the range\'s days only', () => {
    const list = [session('2026-10-11'), session('2026-10-12'), session('2026-11-15'), session('2026-11-16')];
    assert.deepEqual(inRange(list, '1m', TODAY).map((s) => s.date), ['2026-10-12', '2026-11-15']);
  });
});

test('bucketize adds up time, sessions and money per week', () => {
  const buckets = bucketize([
    session('2026-11-09', { minutes: 90, cost: 10 }), session('2026-11-11', { minutes: 60, cost: 2.5 }), session('2026-11-02'),
  ], '1m', TODAY);
  assert.deepEqual([buckets.at(-1).count, buckets.at(-1).minutes, buckets.at(-1).cost], [2, 150, 12.5]);
  assert.equal(buckets.at(-2).count, 1);
});

/** @returns {import('../public/js/shared/workouts.js').Purchase} */
const purchase = (date, cost) => ({
  id: String(++n), personId: 'p', sport: 'padel', date, item: 'Balls', category: 'balls', cost, note: '', createdAt: n, updatedAt: n,
});

test('bucketize keeps gear apart from what sessions cost', () => {
  const buckets = bucketize([session('2026-11-10', { cost: 10 })], '1m', TODAY, [purchase('2026-11-11', 150), purchase('2026-10-20', 9.5)]);
  assert.deepEqual([buckets.at(-1).cost, buckets.at(-1).gear], [10, 150]);
  assert.equal(buckets.find((b) => b.start === '2026-10-19').gear, 9.5);
});

test('all time starts at the first session or purchase, whichever is first', () => {
  const buckets = bucketize([session('2026-10-01')], 'all', TODAY, [purchase('2026-08-15', 20)]);
  assert.equal(buckets[0].start, '2026-08-01');
  assert.equal(buckets[0].gear, 20);
});

test('summarize: totals, averages and win rate', () => {
  const sum = summarize([
    session('2026-11-01', { cost: 10, avgHr: 140, maxHr: 170, details: { result: 'win' } }),
    session('2026-11-02', { cost: 0, avgHr: 150, maxHr: 182, details: { result: 'loss' } }),
    session('2026-11-03', { details: { result: 'win' } }),
    session('2026-11-04'),
  ], 'result');
  assert.equal(sum.count, 4);
  assert.equal(sum.minutes, 240);
  assert.equal(sum.cost, 10);
  assert.equal(sum.costCount, 2);
  assert.equal(sum.avgHr, 145);
  assert.equal(sum.maxHr, 182);
  assert.deepEqual(sum.results, { win: 2, loss: 1, draw: 0 });
  assert.equal(sum.winRate, 67);
  assert.equal(summarize([]).winRate, null);
  assert.deepEqual([summarize([], null, [purchase('2026-11-01', 9.99), purchase('2026-11-02', 20)]).gear], [29.99]);
});

test('partnerRecords: wins ÷ matches together, best first, more matches breaking a tie', () => {
  const m = (date, partner, result) => session(date, { details: { partner, result } });
  const records = partnerRecords([
    m('2026-11-01', 'Maria', 'win'), m('2026-11-02', 'maria', 'win'), m('2026-11-03', 'Maria', 'loss'),
    m('2026-11-04', 'Nick', 'win'), m('2026-11-05', 'Nick', 'draw'),
    m('2026-11-06', 'Jo', 'win'), m('2026-11-07', 'Jo', 'win'), m('2026-11-08', 'Jo', 'win'), m('2026-11-09', 'Jo', 'loss'),
    m('2026-11-10', 'Lee', 'win'), m('2026-11-11', 'Lee', 'win'), m('2026-11-12', 'Lee', 'win'),
    session('2026-11-13', { details: { partner: 'Lee' } }),           // no result: not counted
  ], 'result', 'partner');
  assert.deepEqual(records.map((r) => [r.name, r.win, r.played]), [['Lee', 3, 3], ['Jo', 3, 4], ['Maria', 2, 3], ['Nick', 1, 2]]);
  assert.equal(records[2].ratio, 2 / 3);
});

test('feelMix counts every feeling, in order', () => {
  const mix = feelMix([session('2026-11-01', { feel: 'intense' }), session('2026-11-02', { feel: 'intense' })]);
  assert.deepEqual(mix.map((f) => [f.id, f.count]), [['chill', 0], ['good', 0], ['intense', 2], ['exhausting', 0]]);
});

test('heartRates: sessions with a heart rate, oldest first', () => {
  const list = heartRates([session('2026-11-05', { avgHr: 150 }), session('2026-11-01'), session('2026-11-02', { maxHr: 170 })]);
  assert.deepEqual(list.map((s) => s.date), ['2026-11-02', '2026-11-05']);
});

test('weekStreak counts weeks in a row, this week or last week ending it', () => {
  assert.equal(weekStreak([session('2026-11-10'), session('2026-11-03'), session('2026-10-27'), session('2026-10-13')], TODAY), 3);
  assert.equal(weekStreak([session('2026-11-03'), session('2026-10-27')], TODAY), 2); // none yet this week
  assert.equal(weekStreak([session('2026-10-20')], TODAY), 0);
});
