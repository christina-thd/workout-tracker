import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { ActionError, applyAction } from '../src/workouts/actions.js';
import { createInitialState } from '../src/workouts/state.js';

let state;
let personId;
const act = (action, now = 1000) => applyAction(state, action, now);
const padel = (extra = {}) => ({ type: 'addSession', personId, sport: 'padel', date: '2026-11-10', minutes: 90, ...extra });

beforeEach(() => {
  state = createInitialState();
  ({ personId } = act({ type: 'addPerson', name: 'Alex' }));
});

describe('people', () => {
  test('names are unique, ignoring case', () => {
    assert.throws(() => act({ type: 'addPerson', name: ' alex ' }), (err) => err instanceof ActionError && err.status === 409);
  });

  test('a new person gets an emoji nobody has', () => {
    act({ type: 'addPerson', name: 'Sam' });
    assert.notEqual(state.people[0].emoji, state.people[1].emoji);
  });

  test('removing someone removes their sessions, not anyone else\'s', () => {
    const { personId: other } = act({ type: 'addPerson', name: 'Sam' });
    act(padel());
    act(padel({ personId: other }));
    act({ type: 'removePerson', personId });
    assert.equal(state.sessions.length, 1);
    assert.equal(state.sessions[0].personId, other);
  });
});

describe('sessions', () => {
  test('a session gets its defaults: feeling good, padel type match', () => {
    const { sessionId } = act(padel());
    const session = state.sessions.find((s) => s.id === sessionId);
    assert.equal(session.feel, 'good');
    assert.deepEqual(session.details, { type: 'match' });
    assert.equal(session.cost, null);
    assert.equal(session.avgHr, null);
  });

  test('cost is rounded to cents', () => {
    act(padel({ cost: 12.345 }));
    assert.equal(state.sessions[0].cost, 12.35);
  });

  test('a result, score and opponents only stay on a match', () => {
    act(padel({ details: { type: 'training', result: 'win', score: '6-0', opponents: ['Kim'] } }));
    assert.deepEqual(state.sessions[0].details, { type: 'training' });
  });

  test('a score is kept as sets, written the same way', () => {
    act(padel({ details: { score: ' 6-4 3-6 7-5 6-7 ' } }));
    assert.equal(state.sessions[0].details.score, '6-4 3-6 7-5 6-7');
  });

  test('details that are not the sport\'s are dropped, names are trimmed to their length', () => {
    act(padel({ details: { partner: `  ${'N'.repeat(100)} `, secret: 'x' } }));
    assert.equal(state.sessions[0].details.partner.length, 60);
    assert.equal('secret' in state.sessions[0].details, false);
  });

  test('the names a session picks go on the person\'s lists, once', () => {
    act(padel({ details: { partner: 'Kim', opponents: ['Jo', 'Lee'], venue: 'Riverside Courts' } }));
    act(padel({ details: { partner: 'kim', opponents: ['Jo'] } }));
    const person = state.people[0];
    assert.deepEqual(person.players, ['Kim', 'Jo', 'Lee']);
    assert.deepEqual(person.clubs, ['Riverside Courts']);
  });

  test('a sport without a smartwatch keeps no heart rate or calories, and its place goes on the places list', () => {
    act(padel({ sport: 'snowboard', minutes: 240, avgHr: 140, maxHr: 170, calories: 900, details: { venue: 'Kaimaktsalan' } }));
    assert.deepEqual([state.sessions[0].avgHr, state.sessions[0].maxHr, state.sessions[0].calories], [null, null, null]);
    assert.deepEqual(state.people[0].places, ['Kaimaktsalan']);
  });

  test('a workout keeps no minutes, feel or cost, and needs no minutes', () => {
    act({ type: 'addSession', personId, sport: 'workout', date: '2026-11-10', feel: 'intense', cost: 5, details: { focus: 'torso' } });
    const [s] = state.sessions;
    assert.deepEqual([s.minutes, s.feel, s.cost, s.details.focus], [null, null, null, 'torso']);
  });

  test('bad values are refused and nothing changes', () => {
    for (const bad of [
      { date: '2026-13-01' }, { date: 'yesterday' }, { minutes: 0 }, { minutes: 1.5 }, { minutes: 2000 }, { feel: 'meh' },
      { cost: -1 }, { cost: '12' }, { avgHr: 10 }, { maxHr: 300 }, { calories: 1.2 }, { sport: 'chess' },
      { details: { type: 'lesson' } }, { avgHr: 160, maxHr: 150 }, { details: { score: '6:4' } },
      { details: { score: '6-4 6-4 6-4 6-4 6-4 6-4' } }, { details: { score: '8-3' } }, { details: { opponents: ['A', 'B', 'C'] } },
    ]) {
      assert.throws(() => act(padel(bad)), ActionError, JSON.stringify(bad));
    }
    assert.equal(state.sessions.length, 0);
  });

  test('editing replaces the fields and keeps who and what sport', () => {
    const { sessionId } = act(padel({ cost: 10, note: 'first' }));
    act({ type: 'editSession', sessionId, date: '2026-11-09', minutes: 60, feel: 'chill', details: { type: 'training' } }, 2000);
    const session = state.sessions[0];
    assert.equal(session.minutes, 60);
    assert.equal(session.cost, null);
    assert.equal(session.note, '');
    assert.equal(session.personId, personId);
    assert.equal(session.sport, 'padel');
    assert.equal(session.updatedAt, 2000);
    assert.equal(session.createdAt, 1000);
  });

  test('a rejected edit leaves the session as it was', () => {
    const { sessionId } = act(padel({ minutes: 45 }));
    assert.throws(() => act({ type: 'editSession', sessionId, date: '2026-11-09', minutes: 60, avgHr: 5 }), ActionError);
    assert.equal(state.sessions[0].minutes, 45);
  });

  test('removing a session', () => {
    const { sessionId } = act(padel());
    act({ type: 'removeSession', sessionId });
    assert.equal(state.sessions.length, 0);
    assert.throws(() => act({ type: 'removeSession', sessionId }), (err) => err instanceof ActionError && err.status === 404);
  });
});

describe('sports on and off', () => {
  test('turning a sport off hides it and keeps its sessions; on again brings it back', () => {
    act(padel());
    act({ type: 'setSportShown', personId, sport: 'padel', shown: false });
    assert.deepEqual(state.people[0].hiddenSports, ['padel']);
    assert.equal(state.sessions.length, 1);
    act({ type: 'setSportShown', personId, sport: 'padel', shown: true });
    assert.deepEqual(state.people[0].hiddenSports, []);
  });

  test('the last sport on stays on, and only known sports count', () => {
    const others = ['padel', 'tennis', 'basketball', 'snowboard'];
    for (const sport of others) act({ type: 'setSportShown', personId, sport, shown: false });
    assert.throws(() => act({ type: 'setSportShown', personId, sport: 'workout', shown: false }), ActionError);
    assert.throws(() => act({ type: 'setSportShown', personId, sport: 'chess', shown: false }), ActionError);
    assert.throws(() => act({ type: 'setSportShown', personId, sport: 'padel', shown: 'no' }), ActionError);
    assert.deepEqual(state.people[0].hiddenSports, others);
  });
});

describe('players and clubs', () => {
  test('adding a name: trimmed, once (ignoring case), and the name as saved comes back', () => {
    assert.deepEqual(act({ type: 'addToList', personId, list: 'players', name: '  Kim  Lee ' }), { name: 'Kim Lee' });
    assert.deepEqual(act({ type: 'addToList', personId, list: 'players', name: 'kim lee' }), { name: 'Kim Lee' });
    assert.deepEqual(state.people[0].players, ['Kim Lee']);
  });

  test('removing a name keeps it on the sessions that used it', () => {
    act(padel({ details: { venue: 'Riverside Courts' } }));
    act({ type: 'removeFromList', personId, list: 'clubs', name: 'riverside courts' });
    assert.deepEqual(state.people[0].clubs, []);
    assert.equal(state.sessions[0].details.venue, 'Riverside Courts');
  });

  test('only the known lists, and a name is needed', () => {
    assert.throws(() => act({ type: 'addToList', personId, list: 'coaches', name: 'Kim' }), ActionError);
    assert.throws(() => act({ type: 'addToList', personId, list: 'players', name: '   ' }), ActionError);
  });
});

describe('purchases', () => {
  const buy = (extra = {}) => act({ type: 'addPurchase', personId, sport: 'padel', date: '2026-11-01', item: 'Racket', category: 'racket', cost: 149.999, ...extra });

  test('a purchase is saved with its cost in cents', () => {
    const { purchaseId } = buy();
    assert.equal(state.purchases[0].id, purchaseId);
    assert.equal(state.purchases[0].cost, 150);
  });

  test('item, cost and a known kind are needed', () => {
    for (const bad of [{ item: ' ' }, { cost: null }, { cost: -5 }, { category: 'boat' }, { date: '2026-02-30' }]) {
      assert.throws(() => buy(bad), ActionError, JSON.stringify(bad));
    }
    assert.equal(state.purchases.length, 0);
  });

  test('editing and removing', () => {
    const { purchaseId } = buy();
    act({ type: 'editPurchase', purchaseId, date: '2026-11-02', item: 'Balls', category: 'balls', cost: 9 }, 3000);
    assert.equal(state.purchases[0].item, 'Balls');
    assert.equal(state.purchases[0].updatedAt, 3000);
    act({ type: 'removePurchase', purchaseId });
    assert.equal(state.purchases.length, 0);
  });

  test('removing someone removes their purchases', () => {
    buy();
    act({ type: 'removePerson', personId });
    assert.equal(state.purchases.length, 0);
  });
});

test('unknown actions are refused', () => {
  assert.throws(() => act({ type: 'nope' }), ActionError);
  assert.throws(() => applyAction(state, null), ActionError);
});
