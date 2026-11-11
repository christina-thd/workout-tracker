import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cleanDetails, formatScore, hasWatch, opponentsOf, parseScore, partnerField, scoreResult, sportOf, tracks,
} from '../public/js/shared/sports.js';

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

test('tennis is singles unless doubles is picked: one opponent, or a partner and two opponents', () => {
  const tennis = sportOf('tennis');
  const all = { partner: 'Kim', opponent: 'Jo', opponents: ['Jo', 'Lee'] };
  assert.deepEqual(cleanDetails(tennis, all), { type: 'match', format: 'singles', opponent: 'Jo' });
  assert.deepEqual(cleanDetails(tennis, { ...all, format: 'doubles' }),
    { type: 'match', format: 'doubles', partner: 'Kim', opponents: ['Jo', 'Lee'] });
  assert.deepEqual(cleanDetails(tennis, { ...all, type: 'training', format: 'doubles' }),
    { type: 'training', format: 'doubles', partner: 'Kim' });
  assert.deepEqual(opponentsOf(tennis, { opponent: 'Jo' }), ['Jo']);
  assert.equal(partnerField(tennis).key, 'partner');
  assert.throws(() => cleanDetails(tennis, { format: 'mixed' }));
});

test('basketball is practice unless it is a game; only a game has a result, and no draws', () => {
  const basketball = sportOf('basketball');
  assert.deepEqual(cleanDetails(basketball, { result: 'win', court: 'outdoor', partner: 'Kim' }), { type: 'practice', court: 'outdoor' });
  assert.deepEqual(cleanDetails(basketball, { type: 'game', result: 'loss' }), { type: 'game', result: 'loss' });
  assert.throws(() => cleanDetails(basketball, { type: 'game', result: 'draw' }));
  assert.equal(partnerField(basketball), null);
});

test('snowboard: just the place, and no smartwatch', () => {
  const snowboard = sportOf('snowboard');
  assert.deepEqual(cleanDetails(snowboard, { venue: ' Kaimaktsalan ', type: 'match', court: 'indoor' }), { venue: 'Kaimaktsalan' });
  assert.equal(hasWatch(snowboard), false);
  assert.equal(hasWatch(sportOf('padel')), true);
});

test('workout: just the focus; no time, feel, cost, smartwatch or gear', () => {
  const workout = sportOf('workout');
  assert.deepEqual(cleanDetails(workout, {}), { focus: 'legs' });
  assert.deepEqual(cleanDetails(workout, { focus: 'arms' }), { focus: 'arms' });
  for (const what of /** @type {const} */ (['time', 'feel', 'cost', 'watch'])) assert.equal(tracks(workout, what), false, what);
  assert.equal(tracks(sportOf('padel'), 'time'), true);
  assert.equal(workout.gear.length, 0);
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
