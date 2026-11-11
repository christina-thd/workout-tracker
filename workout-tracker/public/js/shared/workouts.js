// Data model and limits shared by server validation and the page.

/**
 * @typedef {{ id: string, name: string, emoji: string, players: string[], clubs: string[], places: string[],
 *   hiddenSports: string[], createdAt: number }} Person
 *   hiddenSports: the sports they turned off (hidden, their data kept); new sports are on for everyone
 * @typedef {'chill' | 'good' | 'intense' | 'exhausting'} Feel
 * @typedef {{ id: string, personId: string, sport: string, date: string, minutes: number | null, feel: Feel | null,
 *   cost: number | null, avgHr: number | null, maxHr: number | null, calories: number | null, note: string,
 *   details: import('./sports.js').Details, createdAt: number, updatedAt: number }} Session
 *   date is a local calendar day with no time zone; cost null means not entered, 0 means free; minutes and feel are
 *   null for a sport that doesn't track them (sports.js `tracks`)
 * @typedef {{ id: string, personId: string, sport: string, date: string, item: string, category: string,
 *   cost: number, note: string, createdAt: number, updatedAt: number }} Purchase
 */

/** Easiest to hardest; pickers and charts use this order. */
export const FEELS = Object.freeze([
  { id: 'chill', emoji: '😌', label: 'Chill' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'intense', emoji: '🔥', label: 'Intense' },
  { id: 'exhausting', emoji: '🥵', label: 'Exhausting' },
]);
export const FEEL_IDS = Object.freeze(FEELS.map((f) => f.id));
export const DEFAULT_FEEL = 'good';

/** @param {string} feel */
export const feelOf = (feel) => FEELS.find((f) => f.id === feel) ?? FEELS.find((f) => f.id === DEFAULT_FEEL);

export const MAX_NAME = 40;
export const MAX_NOTE = 2000;
export const MAX_PEOPLE = 20;
export const MAX_SESSIONS = 20000;
export const MAX_PURCHASES = 5000;
export const MAX_ITEM = 80;
export const MAX_MINUTES = 24 * 60;
export const MAX_COST = 100000;

/** Anything outside these is treated as a typo. */
export const WATCH_LIMITS = Object.freeze({
  avgHr: { min: 30, max: 250 },
  maxHr: { min: 30, max: 250 },
  calories: { min: 0, max: 10000 },
});

export const DURATIONS = Object.freeze([60, 90, 120, 180]);

// ----- dates -----

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Rejects impossible days like 2026-02-30. */
export function isDate(value) {
  const match = typeof value === 'string' ? DATE.exec(value) : null;
  if (!match) return false;
  const [y, m, d] = match.slice(1).map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  return y >= 2000 && day.getUTCFullYear() === y && day.getUTCMonth() === m - 1 && day.getUTCDate() === d;
}

export function localDate(time = Date.now()) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ----- people -----

export const PERSON_EMOJIS = Object.freeze([
  '🦊', '🐻', '🐼', '🐸', '🐯', '🦁', '🐨', '🐰', '🐱', '🐶', '🦉', '🐙', '🦄', '🐝', '🐢', '🐧',
]);

function leastUsed(choices, taken) {
  const uses = (choice) => taken.filter((t) => t === choice).length;
  return choices.reduce((best, choice) => (uses(choice) < uses(best) ? choice : best), choices[0]);
}

export const pickPersonEmoji = (people) => leastUsed(PERSON_EMOJIS, people.map((p) => p.emoji));

// Emoji-presentation characters, VS16 sequences, flags and keycaps; text-default symbols like © don't count.
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️|\p{Regional_Indicator}{2}|^[#*0-9]️?⃣$/u;
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Exactly one grapheme, e.g. 👩‍💻 or 🇬🇷. */
export function isEmoji(value) {
  if (typeof value !== 'string' || !value || value.length > 16 || /\s/.test(value)) return false;
  return [...segmenter.segment(value)].length === 1 && EMOJI.test(value);
}

export function firstEmoji(text) {
  for (const { segment } of segmenter.segment(String(text ?? ''))) if (isEmoji(segment)) return segment;
  return '';
}
