import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeState, SCHEMA_VERSION } from '../src/workouts/state.js';

test('nothing saved yet: an empty state', () => {
  for (const raw of [null, undefined, 'text', 42]) {
    assert.deepEqual(normalizeState(raw), { schema: SCHEMA_VERSION, people: [], sessions: [], purchases: [] });
  }
});

test('schema 1 (no lists): the names its sessions used fill the person\'s lists', () => {
  const state = normalizeState({
    schema: 1,
    people: [{ id: 'a1', name: 'Alex' }],
    sessions: [
      { id: 'b1', personId: 'a1', sport: 'padel', date: '2026-11-10', minutes: 90,
        details: { type: 'lesson', partner: 'Kim', opponents: 'Jo and Lee', venue: 'Riverside Courts' } },
    ],
  });
  assert.deepEqual(state.people[0].players, ['Kim', 'Jo and Lee']);
  assert.deepEqual(state.people[0].clubs, ['Riverside Courts']);
  // legacy single-string opponents are kept as one name
  assert.deepEqual(state.sessions[0].details.opponents, ['Jo and Lee']);
});

test('purchases without an item, a cost or a person are dropped; an unknown kind is other', () => {
  const state = normalizeState({
    schema: 2,
    people: [{ id: 'a1', name: 'Alex' }],
    purchases: [
      { id: 'c1', personId: 'a1', sport: 'padel', date: '2026-11-01', item: 'Racket', cost: 150, category: 'boat' },
      { id: 'c2', personId: 'a1', sport: 'padel', date: '2026-11-01', item: '', cost: 10 },
      { id: 'c3', personId: 'a1', sport: 'padel', date: '2026-11-01', item: 'Balls' },
      { id: 'c4', personId: 'ghost', sport: 'padel', date: '2026-11-01', item: 'Balls', cost: 9 },
    ],
  });
  assert.deepEqual(state.purchases.map((p) => [p.id, p.category]), [['c1', 'other']]);
});

test('odd saved data is repaired, unusable entries dropped', () => {
  const raw = {
    people: [
      { id: 'a1', name: ' Alex ', emoji: 'not an emoji' },
      { id: 'a2', name: 'alex' },                         // same name: dropped
      { id: 'a3', name: '' },                              // no name: dropped
    ],
    sessions: [
      { id: 'b1', personId: 'a1', sport: 'padel', date: '2026-11-10', minutes: 90, feel: 'weird', cost: -5, avgHr: 500,
        details: { type: 'nope', partner: 'Sam' } },
      { id: 'b1', personId: 'a1', sport: 'padel', date: '2026-11-10', minutes: 60 },   // same id: dropped
      { id: 'b2', personId: 'ghost', sport: 'padel', date: '2026-11-10', minutes: 60 }, // nobody's: dropped
      { id: 'b3', personId: 'a1', sport: 'chess', date: '2026-11-10', minutes: 60 },    // unknown sport: dropped
      { id: 'b4', personId: 'a1', sport: 'padel', date: '2026-02-31', minutes: 60 },    // no such day: dropped
      { id: 'b5', personId: 'a1', sport: 'padel', date: '2026-11-10' },                 // no minutes: dropped
    ],
  };
  const state = normalizeState(raw, 5000);
  assert.equal(state.people.length, 1);
  assert.equal(state.people[0].name, 'Alex');
  assert.ok(state.people[0].emoji);
  assert.equal(state.sessions.length, 1);
  const [s] = state.sessions;
  assert.equal(s.feel, 'good');
  assert.equal(s.cost, null);
  assert.equal(s.avgHr, null);
  assert.deepEqual(s.details, { type: 'match', partner: 'Sam' });
  assert.equal(s.createdAt, 5000);
});
