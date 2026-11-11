import {
  cleanDetails, cleanName, hasWatch, LIST_IDS, MAX_LIST_SIZE, sportOf, SPORT_IDS, tracks,
} from '../../public/js/shared/sports.js';
import {
  DEFAULT_FEEL, FEEL_IDS, isDate, isEmoji, MAX_COST, MAX_ITEM, MAX_MINUTES, MAX_NAME, MAX_NOTE, MAX_PEOPLE,
  MAX_PURCHASES, MAX_SESSIONS, pickPersonEmoji, WATCH_LIMITS,
} from '../../public/js/shared/workouts.js';
import { cleanText, findPerson, findPurchase, findSession, newId, sameName } from './state.js';

/** A rejected action. `status` is the HTTP status the API answers with. */
export class ActionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ActionError';
    this.status = status;
  }
}

// ----- input helpers -----

function found(thing, what, id) {
  if (!thing) throw new ActionError(`No ${what} ${id}`, 404);
  return thing;
}
const getPerson = (state, id) => found(findPerson(state, id), 'person', id);
const getSession = (state, id) => found(findSession(state, id), 'session', id);
const getPurchase = (state, id) => found(findPurchase(state, id), 'purchase', id);

function getSport(id) {
  const sport = sportOf(id);
  if (!sport) throw new ActionError(`sport must be one of: ${SPORT_IDS.join(', ')}`);
  return sport;
}

/** Required, and unique among people ignoring case. */
function personName(state, value, exceptId = null) {
  const name = cleanText(value, MAX_NAME);
  if (!name) throw new ActionError('name is required');
  const same = state.people.find((x) => x.id !== exceptId && sameName(x.name, name));
  if (same) throw new ActionError(`There is already someone called "${same.name}"`, 409);
  return name;
}

function emojiOrNull(emoji) {
  if (emoji != null && !isEmoji(emoji)) throw new ActionError('emoji must be a single emoji');
  return emoji ?? null;
}

/** null or '' mean none, allowed only when `optional`. */
function whole(value, name, min, max, { optional = true } = {}) {
  if (optional && (value == null || value === '')) return null;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ActionError(`${name} must be a whole number from ${min} to ${max}`);
  }
  return value;
}

function money(value, { optional = true } = {}) {
  if (optional && (value == null || value === '')) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_COST) {
    throw new ActionError(`cost must be an amount from 0 to ${MAX_COST}`);
  }
  return Math.round(value * 100) / 100;
}

function date(value) {
  if (!isDate(value)) throw new ActionError('date must be a day, like 2026-11-11');
  return value;
}

function feel(value) {
  if (value == null) return DEFAULT_FEEL;
  if (!FEEL_IDS.includes(value)) throw new ActionError(`feel must be one of: ${FEEL_IDS.join(', ')}`);
  return value;
}

function details(sport, value) {
  try {
    return cleanDetails(sport, value);
  } catch (err) {
    throw new ActionError(err.message);
  }
}

function listId(value) {
  if (!LIST_IDS.includes(value)) throw new ActionError(`list must be one of: ${LIST_IDS.join(', ')}`);
  return value;
}

/**
 * Validates everything up front so a bad input throws before anything changes. What the sport doesn't track
 * (`tracks` in sports.js: a workout's time, feel and cost; snowboard's smartwatch) isn't kept.
 */
function sessionFields(sport, input) {
  if (!hasWatch(sport)) input = { ...input, avgHr: null, maxHr: null, calories: null };
  const fields = {
    date: date(input.date),
    minutes: tracks(sport, 'time') ? whole(input.minutes, 'minutes', 1, MAX_MINUTES, { optional: false }) : null,
    feel: tracks(sport, 'feel') ? feel(input.feel) : null,
    cost: tracks(sport, 'cost') ? money(input.cost) : null,
    avgHr: whole(input.avgHr, 'average heart rate', WATCH_LIMITS.avgHr.min, WATCH_LIMITS.avgHr.max),
    maxHr: whole(input.maxHr, 'max heart rate', WATCH_LIMITS.maxHr.min, WATCH_LIMITS.maxHr.max),
    calories: whole(input.calories, 'calories', WATCH_LIMITS.calories.min, WATCH_LIMITS.calories.max),
    note: cleanText(input.note, MAX_NOTE, { multiline: true }),
  };
  if (fields.avgHr != null && fields.maxHr != null && fields.maxHr < fields.avgHr) {
    throw new ActionError('max heart rate is lower than the average');
  }
  return fields;
}

function purchaseFields(sport, input) {
  const item = cleanText(input.item, MAX_ITEM);
  if (!item) throw new ActionError('item is required: what was bought');
  const category = input.category ?? 'other';
  if (!sport.gear.some((g) => g.id === category)) {
    throw new ActionError(`category must be one of: ${sport.gear.map((g) => g.id).join(', ')}`);
  }
  return {
    date: date(input.date),
    item,
    category,
    cost: money(input.cost, { optional: false }),
    note: cleanText(input.note, MAX_NOTE, { multiline: true }),
  };
}

function remember(person, list, name) {
  if (person[list].some((n) => sameName(n, name))) return;
  if (person[list].length >= MAX_LIST_SIZE) throw new ActionError(`At most ${MAX_LIST_SIZE} names on a list`);
  person[list].push(name);
}

/** Picked names go on the person's lists so the dropdowns offer them next time. */
function rememberPicks(person, sport, picked) {
  for (const field of sport.fields) {
    if (field.kind !== 'pick' || picked[field.key] == null) continue;
    for (const name of [picked[field.key]].flat()) remember(person, field.list, name);
  }
}

// ----- actions -----
// Handlers mutate `state` in place and may return a result.

const handlers = {
  addPerson(state, { name, emoji }, now) {
    if (state.people.length >= MAX_PEOPLE) throw new ActionError(`At most ${MAX_PEOPLE} people`);
    const person = {
      id: newId(),
      name: personName(state, name),
      emoji: emojiOrNull(emoji) ?? pickPersonEmoji(state.people),
      ...Object.fromEntries(LIST_IDS.map((list) => [list, []])),
      hiddenSports: [],
      createdAt: now,
    };
    state.people.push(person);
    return { personId: person.id };
  },

  renamePerson(state, { personId, name }) {
    const person = getPerson(state, personId);
    person.name = personName(state, name, person.id);
  },

  setPersonEmoji(state, { personId, emoji }) {
    const person = getPerson(state, personId);
    if (!isEmoji(emoji)) throw new ActionError('emoji must be a single emoji');
    person.emoji = emoji;
  },

  /** Turns a sport on or off for someone. Off only hides it: its sessions and purchases are kept. */
  setSportShown(state, { personId, sport, shown }) {
    const person = getPerson(state, personId);
    const id = getSport(sport).id;
    if (typeof shown !== 'boolean') throw new ActionError('shown must be true or false');
    const hidden = person.hiddenSports.filter((s) => s !== id);
    if (!shown) hidden.push(id);
    if (hidden.length >= SPORT_IDS.length) throw new ActionError('Keep at least one sport on');
    person.hiddenSports = SPORT_IDS.filter((s) => hidden.includes(s));
  },

  removePerson(state, { personId }) {
    getPerson(state, personId);
    state.people = state.people.filter((p) => p.id !== personId);
    state.sessions = state.sessions.filter((s) => s.personId !== personId);
    state.purchases = state.purchases.filter((p) => p.personId !== personId);
  },

  /** Returns the name as saved, which may differ in case from the one sent. */
  addToList(state, { personId, list, name }) {
    const person = getPerson(state, personId);
    const clean = cleanName(name);
    if (!clean) throw new ActionError('name is required');
    remember(person, listId(list), clean);
    return { name: person[list].find((n) => sameName(n, clean)) };
  },

  /** Sessions that used the name keep it. */
  removeFromList(state, { personId, list, name }) {
    const person = getPerson(state, personId);
    const clean = cleanName(name);
    person[listId(list)] = person[list].filter((n) => !sameName(n, clean));
  },

  addSession(state, input, now) {
    const person = getPerson(state, input.personId);
    if (state.sessions.length >= MAX_SESSIONS) throw new ActionError(`At most ${MAX_SESSIONS} sessions`);
    const sport = getSport(input.sport);
    const session = {
      id: newId(),
      personId: person.id,
      sport: sport.id,
      ...sessionFields(sport, input),
      details: details(sport, input.details),
      createdAt: now,
      updatedAt: now,
    };
    rememberPicks(person, sport, session.details);
    state.sessions.push(session);
    return { sessionId: session.id };
  },

  /** Replaces every field; the session sheet always sends them all. */
  editSession(state, input, now) {
    const session = getSession(state, input.sessionId);
    const sport = sportOf(session.sport);
    const fields = sessionFields(sport, input);
    const cleaned = details(sport, input.details);
    rememberPicks(getPerson(state, session.personId), sport, cleaned);
    Object.assign(session, fields, { details: cleaned, updatedAt: now });
  },

  removeSession(state, { sessionId }) {
    getSession(state, sessionId);
    state.sessions = state.sessions.filter((s) => s.id !== sessionId);
  },

  addPurchase(state, input, now) {
    const person = getPerson(state, input.personId);
    if (state.purchases.length >= MAX_PURCHASES) throw new ActionError(`At most ${MAX_PURCHASES} purchases`);
    const sport = getSport(input.sport);
    const purchase = {
      id: newId(), personId: person.id, sport: sport.id, ...purchaseFields(sport, input), createdAt: now, updatedAt: now,
    };
    state.purchases.push(purchase);
    return { purchaseId: purchase.id };
  },

  editPurchase(state, input, now) {
    const purchase = getPurchase(state, input.purchaseId);
    Object.assign(purchase, purchaseFields(sportOf(purchase.sport), input), { updatedAt: now });
  },

  removePurchase(state, { purchaseId }) {
    getPurchase(state, purchaseId);
    state.purchases = state.purchases.filter((p) => p.id !== purchaseId);
  },
};

export const ACTION_TYPES = Object.freeze(Object.keys(handlers));

/** Mutates `state`; on ActionError the state is left unchanged. */
export function applyAction(state, action, now = Date.now()) {
  if (!action || typeof action !== 'object') throw new ActionError('Action must be a JSON object');
  if (!Object.hasOwn(handlers, action.type)) throw new ActionError(`Unknown action: ${action.type}`);
  return handlers[action.type](state, action, now) ?? { ok: true };
}
