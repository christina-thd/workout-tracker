import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanDetails, formatScore, parseScore, scoreResult, sportOf } from '../public/js/shared/sports.js';

const padel = sportOf('padel');

test('a score is read set by set, your games first', () => {
  assert.deepEqual(parseScore('6-4 3-6 7-6'), [[6, 4], [3, 6], [7, 6]]);
  assert.deepEqual(parseScore(' 7-5 '), [[7, 5]]);
  assert.deepEqual(parseScore('6-4 4-6 6-4 4-6 7-6', 5).length, 5);
  for (const bad of ['', '6:4', '6-4,6-3', '6-', 'six-four', '6-4 6-4 6-4 6-4', '8-6', '10-8', null]) {
    assert.equal(parseScore(bad, 3), null, String(bad));
  }
  assert.equal(formatScore([[6, 4], [3, 6]]), '6-4 3-6');
});

test('a 7-6 set can have its tie-break, written in brackets; no other set can', () => {
  assert.deepEqual(parseScore('6-4 6-7(5-7) 7-6(10-8)'), [[6, 4], [6, 7, 5, 7], [7, 6, 10, 8]]);
  assert.equal(formatScore([[7, 6, 7, 4], [6, 3]]), '7-6(7-4) 6-3');
  for (const bad of ['6-4(7-5)', '7-5(7-3)', '7-6(31-29)', '7-6(7-)']) assert.equal(parseScore(bad), null, bad);
  // tie-break rule: the side with 7 games must have more points
  for (const bad of ['7-6(5-7)', '6-7(7-5)', '7-6(6-6)']) assert.equal(parseScore(bad), null, bad);
  assert.equal(scoreResult([[7, 6, 7, 5], [3, 6], [6, 7, 2, 7]]), 'loss');
});

test('who won comes from the sets', () => {
  assert.equal(scoreResult([[6, 4], [3, 6], [7, 5]]), 'win');
  assert.equal(scoreResult([[2, 6], [4, 6]]), 'loss');
  assert.equal(scoreResult([[6, 4], [4, 6]]), 'draw'); // a set each when time ran out
  assert.equal(scoreResult([[5, 5]]), null);
});

test('cleaning details: defaults, choices, picks and fields that do not show', () => {
  assert.deepEqual(cleanDetails(padel, {}), { type: 'match' });
  assert.deepEqual(cleanDetails(padel, { opponents: [' Jo ', 'jo', 'Lee'] }), { type: 'match', opponents: ['Jo', 'Lee'] });
  assert.deepEqual(cleanDetails(padel, { type: 'training', opponents: ['Jo'], court: 'indoor' }), { type: 'training', court: 'indoor' });
  assert.throws(() => cleanDetails(padel, { court: 'roof' }));
  assert.deepEqual(cleanDetails(padel, { court: 'roof' }, { strict: false }), { type: 'match' });
});
