import { randomBytes } from 'node:crypto';
import { cleanDetails, cleanName, LISTS, MAX_LIST_SIZE, sportOf } from '../../public/js/shared/sports.js';
import {
  DEFAULT_FEEL, FEEL_IDS, isDate, isEmoji, MAX_COST, MAX_ITEM, MAX_MINUTES, MAX_NAME, MAX_NOTE, MAX_PEOPLE,
  MAX_PURCHASES, MAX_SESSIONS, pickPersonEmoji, WATCH_LIMITS,
} from '../../public/js/shared/workouts.js';

/**
 * Saved state: { schema, people, sessions, purchases } (types in public/js/shared/workouts.js).
 * Schema 1 had no lists or purchases; lists are back-filled from session names.
 */
export const SCHEMA_VERSION = 2;

const ID = /^[a-f0-9]{1,32}$/;
const isId = (value) => typeof value === 'string' && ID.test(value);

export const newId = () => randomBytes(6).toString('hex');

export function createInitialState() {
  return { schema: SCHEMA_VERSION, people: [], sessions: [], purchases: [] };
}

export const findPerson = (state, personId) => state.people.find((p) => p.id === personId);
export const findSession = (state, sessionId) => state.sessions.find((s) => s.id === sessionId);
export const findPurchase = (state, purchaseId) => state.purchases.find((p) => p.id === purchaseId);

/** '' for non-strings; line breaks survive only when `multiline`. */
export function cleanText(value, max, { multiline = false } = {}) {
  if (typeof value !== 'string') return '';
  const text = multiline ? value.replace(/\r\n?/g, '\n') : value.replace(/\s+/g, ' ');
  return text.trim().slice(0, max).trim();
}

export const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

const toTime = (value, fallback) => (Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback);

export function wholeOrNull(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

export function costOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_COST
    ? Math.round(value * 100) / 100
    : null;
}

/** Deduplicated ignoring case. */
export function cleanList(value) {
  const names = [];
  for (const raw of Array.isArray(value) ? value : []) {
    const name = cleanName(raw);
    if (name && !names.some((n) => sameName(n, name))) names.push(name);
  }
  return names.slice(0, MAX_LIST_SIZE);
}

function normalizePerson(raw, now, taken) {
  if (!raw || typeof raw !== 'object') return null;
  const name = cleanText(raw.name, MAX_NAME);
  if (!name) return null;
  return {
    id: isId(raw.id) ? raw.id : newId(),
    name,
    emoji: isEmoji(raw.emoji) ? raw.emoji : pickPersonEmoji(taken),
    ...Object.fromEntries(LISTS.map((l) => [l.id, cleanList(raw[l.id])])),
    createdAt: toTime(raw.createdAt, now),
  };
}

function normalizeSession(raw, now, personIds) {
  if (!raw || typeof raw !== 'object' || !personIds.has(raw.personId)) return null;
  const sport = sportOf(raw.sport);
  const minutes = wholeOrNull(raw.minutes, 1, MAX_MINUTES);
  if (!sport || !isDate(raw.date) || minutes == null) return null;
  const createdAt = toTime(raw.createdAt, now);
  return {
    id: isId(raw.id) ? raw.id : newId(),
    personId: raw.personId,
    sport: sport.id,
    date: raw.date,
    minutes,
    feel: FEEL_IDS.includes(raw.feel) ? raw.feel : DEFAULT_FEEL,
    cost: costOrNull(raw.cost),
    avgHr: wholeOrNull(raw.avgHr, WATCH_LIMITS.avgHr.min, WATCH_LIMITS.avgHr.max),
    maxHr: wholeOrNull(raw.maxHr, WATCH_LIMITS.maxHr.min, WATCH_LIMITS.maxHr.max),
    calories: wholeOrNull(raw.calories, WATCH_LIMITS.calories.min, WATCH_LIMITS.calories.max),
    note: cleanText(raw.note, MAX_NOTE, { multiline: true }),
    details: cleanDetails(sport, raw.details, { strict: false }),
    createdAt,
    updatedAt: toTime(raw.updatedAt, createdAt),
  };
}

function normalizePurchase(raw, now, personIds) {
  if (!raw || typeof raw !== 'object' || !personIds.has(raw.personId)) return null;
  const sport = sportOf(raw.sport);
  const item = cleanText(raw.item, MAX_ITEM);
  const cost = costOrNull(raw.cost);
  if (!sport || !isDate(raw.date) || !item || cost == null) return null;
  const createdAt = toTime(raw.createdAt, now);
  return {
    id: isId(raw.id) ? raw.id : newId(),
    personId: raw.personId,
    sport: sport.id,
    date: raw.date,
    item,
    category: sport.gear.some((g) => g.id === raw.category) ? raw.category : 'other',
    cost,
    note: cleanText(raw.note, MAX_NOTE, { multiline: true }),
    createdAt,
    updatedAt: toTime(raw.updatedAt, createdAt),
  };
}

/** Schema 1 migration: lists are built from the names sessions used. */
function fillListsFromSessions(people, sessions) {
  for (const person of people) {
    for (const session of sessions.filter((s) => s.personId === person.id)) {
      for (const field of sportOf(session.sport).fields) {
        if (field.kind !== 'pick') continue;
        const value = session.details[field.key];
        person[field.list] = cleanList([...person[field.list], ...(Array.isArray(value) ? value : [value])]);
      }
    }
  }
}

function uniqueById(list, max) {
  const seen = new Set();
  return list.filter((x) => x && !seen.has(x.id) && seen.add(x.id)).slice(0, max);
}

/** Unusable entries are dropped rather than rejected. */
export function normalizeState(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return createInitialState();

  const people = [];
  for (const p of Array.isArray(raw.people) ? raw.people : []) {
    const person = normalizePerson(p, now, people);
    if (person && !people.some((x) => x.id === person.id || sameName(x.name, person.name))) people.push(person);
  }
  people.splice(MAX_PEOPLE);

  const personIds = new Set(people.map((p) => p.id));
  const list = (key) => (Array.isArray(raw[key]) ? raw[key] : []);
  const sessions = uniqueById(list('sessions').map((s) => normalizeSession(s, now, personIds)), MAX_SESSIONS);
  const purchases = uniqueById(list('purchases').map((p) => normalizePurchase(p, now, personIds)), MAX_PURCHASES);
  if (!(raw.schema >= 2)) fillListsFromSessions(people, sessions);
  return { schema: SCHEMA_VERSION, people, sessions, purchases };
}

export function toView(state, config) {
  return {
    version: config.version, currency: config.currency,
    people: state.people, sessions: state.sessions, purchases: state.purchases,
  };
}
