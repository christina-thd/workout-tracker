// Sport definitions and their per-sport session fields, shared by server validation and the session sheet.
// Adding a sport only needs a SPORTS entry. `when` shows a field only while other fields have those values;
// `result` marks the win-rate field; `partner` the teammate (for the partners stats); `remember` prefills from the
// last session.

/**
 * @typedef {{ id: string, label: string, emoji?: string }} Option
 * @typedef {{ key: string, label: string, when?: Record<string, string>, remember?: boolean }} BaseField
 * @typedef {BaseField & { kind: 'choice', options: readonly Option[], default?: string, result?: boolean }} ChoiceField
 * @typedef {BaseField & { kind: 'pick', list: 'players' | 'clubs' | 'places', count?: number, partner?: boolean }} PickField
 * @typedef {BaseField & { kind: 'score', sets: number, maxSets: number }} ScoreField
 * @typedef {ChoiceField | PickField | ScoreField} Field
 * @typedef {{ time?: boolean, feel?: boolean, cost?: boolean, watch?: boolean }} Tracks
 * @typedef {{ id: string, name: string, emoji: string, image?: string, fields: readonly Field[],
 *   gear: readonly Option[], tracks?: Tracks, durations?: readonly number[], defaultMinutes?: number }} Sport
 *   image: an icon of its own (relative to public/), for a sport Unicode has no emoji for; emoji is the text fallback;
 *   tracks: which fields every session has this sport leaves out (false): its duration, how it felt, its cost, the
 *   smartwatch numbers; gear: [] for none (no Gear tab); durations: its quick picks, in minutes (default DURATIONS);
 *   defaultMinutes: a first session's length (default 90)
 * @typedef {Record<string, string | string[]>} Details
 */

export const LISTS = Object.freeze([
  { id: 'players', label: 'Players', one: 'player' },
  { id: 'clubs', label: 'Clubs', one: 'club' },
  { id: 'places', label: 'Places', one: 'place' },
]);
export const LIST_IDS = Object.freeze(LISTS.map((l) => l.id));
export const MAX_LIST_NAME = 60;
export const MAX_LIST_SIZE = 200;

// ----- fields more than one racket sport has -----

/** @type {ChoiceField} */
const SESSION_TYPE = {
  key: 'type', label: 'Session', kind: 'choice', default: 'match',
  options: [
    { id: 'match', label: 'Match', emoji: '🏆' },
    { id: 'training', label: 'Training', emoji: '🎯' },
  ],
};

/** @type {ChoiceField} */
const RESULT = {
  key: 'result', label: 'Result', kind: 'choice', when: { type: 'match' }, result: true,
  options: [
    { id: 'win', label: 'Won' },
    { id: 'loss', label: 'Lost' },
    { id: 'draw', label: 'Draw' },
  ],
};

/** @type {ScoreField} */
const SCORE = { key: 'score', label: 'Score', kind: 'score', sets: 2, maxSets: 5, when: { type: 'match' } };

/** @type {PickField} */
const CLUB = { key: 'venue', label: 'Club', kind: 'pick', list: 'clubs', remember: true };

/** @type {ChoiceField} */
const COURT = {
  key: 'court', label: 'Court', kind: 'choice', remember: true,
  options: [
    { id: 'indoor', label: 'Indoor', emoji: '🏟️' },
    { id: 'outdoor', label: 'Outdoor', emoji: '☀️' },
  ],
};

/** @param {string[]} extra  the sport's own kinds, before the shared ones */
const racketGear = (extra) => [
  { id: 'racket', label: 'Racket' },
  ...extra.map((label) => ({ id: label.toLowerCase(), label })),
  { id: 'balls', label: 'Balls' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'grips', label: 'Grips' },
  { id: 'bag', label: 'Bag' },
  { id: 'lessons', label: 'Lessons' },
  { id: 'other', label: 'Other' },
];

/** @type {readonly Sport[]} */
export const SPORTS = Object.freeze([
  {
    id: 'padel',
    name: 'Padel',
    emoji: '🎾',
    image: 'img/sports/padel.svg',
    fields: [
      SESSION_TYPE,
      SCORE,
      RESULT,
      { key: 'partner', label: 'Partner', kind: 'pick', list: 'players', remember: true, partner: true },
      { key: 'opponents', label: 'Opponents', kind: 'pick', list: 'players', count: 2, when: { type: 'match' } },
      CLUB,
      COURT,
    ],
    gear: racketGear([]),
  },
  {
    id: 'tennis',
    name: 'Tennis',
    emoji: '🎾',
    image: 'img/sports/tennis.svg',
    fields: [
      SESSION_TYPE,
      {
        key: 'format', label: 'Format', kind: 'choice', default: 'singles',
        options: [
          { id: 'singles', label: 'Singles' },
          { id: 'doubles', label: 'Doubles' },
        ],
      },
      SCORE,
      RESULT,
      { key: 'partner', label: 'Partner', kind: 'pick', list: 'players', when: { format: 'doubles' }, partner: true },
      { key: 'opponent', label: 'Opponent', kind: 'pick', list: 'players', when: { type: 'match', format: 'singles' } },
      { key: 'opponents', label: 'Opponents', kind: 'pick', list: 'players', count: 2, when: { type: 'match', format: 'doubles' } },
      CLUB,
      {
        key: 'surface', label: 'Surface', kind: 'choice', remember: true,
        options: [
          { id: 'hard', label: 'Hard' },
          { id: 'clay', label: 'Clay' },
          { id: 'grass', label: 'Grass' },
          { id: 'carpet', label: 'Carpet' },
        ],
      },
      COURT,
    ],
    gear: racketGear(['Strings']),
  },
  {
    id: 'basketball',
    name: 'Basketball',
    emoji: '🏀',
    fields: [
      {
        key: 'type', label: 'Session', kind: 'choice', default: 'practice',
        options: [
          { id: 'practice', label: 'Practice', emoji: '🎯' },
          { id: 'game', label: 'Game', emoji: '🏆' },
        ],
      },
      {
        key: 'result', label: 'Result', kind: 'choice', when: { type: 'game' }, result: true,
        options: [
          { id: 'win', label: 'Won' },
          { id: 'loss', label: 'Lost' },
        ],
      },
      COURT,
    ],
    gear: [
      { id: 'ball', label: 'Ball' },
      { id: 'shoes', label: 'Shoes' },
      { id: 'clothing', label: 'Clothing' },
      { id: 'bag', label: 'Bag' },
      { id: 'lessons', label: 'Lessons' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'snowboard',
    name: 'Snowboard',
    emoji: '🏂',
    tracks: { watch: false },
    durations: [120, 180, 240, 360],
    defaultMinutes: 240,
    fields: [
      { key: 'venue', label: 'Place', kind: 'pick', list: 'places', remember: true },
    ],
    gear: [
      { id: 'board', label: 'Board' },
      { id: 'boots', label: 'Boots' },
      { id: 'bindings', label: 'Bindings' },
      { id: 'helmet', label: 'Helmet' },
      { id: 'goggles', label: 'Goggles' },
      { id: 'gloves', label: 'Gloves' },
      { id: 'clothing', label: 'Clothing' },
      { id: 'lessons', label: 'Lessons' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    // just that you trained, and what
    id: 'workout',
    name: 'Workout',
    emoji: '🏋️',
    image: 'img/sports/workout.svg',
    tracks: { time: false, feel: false, cost: false, watch: false },
    fields: [
      {
        key: 'focus', label: 'Focus', kind: 'choice', default: 'legs',
        options: [
          { id: 'legs', label: 'Legs', emoji: '🦵' },
          { id: 'arms', label: 'Arms', emoji: '💪' },
          { id: 'torso', label: 'Torso', emoji: '🏋️' },
        ],
      },
    ],
    gear: [],
  },
]);

export const SPORT_IDS = Object.freeze(SPORTS.map((s) => s.id));

/** @param {string} id */
export const sportOf = (id) => SPORTS.find((s) => s.id === id) ?? null;

/**
 * The sports someone has on (all but the ones they turned off).
 * @param {{ hiddenSports?: string[] } | null | undefined} person
 */
export const sportsFor = (person) => SPORTS.filter((s) => !person?.hiddenSports?.includes(s.id));

export const fieldShows = (field, details) =>
  !field.when || Object.entries(field.when).every(([key, value]) => details[key] === value);

export const resultField = (sport) => sport?.fields.find((f) => f.kind === 'choice' && f.result) ?? null;

export const scoreField = (sport) => sport?.fields.find((f) => f.kind === 'score') ?? null;

/**
 * Whether a sport's sessions have one of the fields every session can have (all do unless `tracks` says false).
 * @param {Sport | null} sport
 * @param {keyof Tracks} what
 */
export const tracks = (sport, what) => sport?.tracks?.[what] !== false;

export const hasWatch = (sport) => tracks(sport, 'watch');

/** The teammate field, if the sport has one (padel; tennis doubles). */
export const partnerField = (sport) => sport?.fields.find((f) => f.kind === 'pick' && f.partner) ?? null;

/** The names a session played against, from whichever opponent fields the sport has. */
export const opponentsOf = (sport, details) => sport.fields
  .filter((f) => f.kind === 'pick' && f.list === 'players' && !f.partner)
  .flatMap((f) => [details[f.key] ?? []].flat());

// ----- a match's score -----

export const MAX_GAMES = 7;
/** A tie-break runs until someone leads by two, so cap it generously. */
export const MAX_TIEBREAK = 30;
const SET = /^(\d{1,2})-(\d{1,2})(?:\((\d{1,2})-(\d{1,2})\))?$/;

/**
 * Your games, theirs, and tie-break points (yours, theirs) for a 7-6 set.
 * @typedef {[number, number] | [number, number, number, number]} GameSet
 */

export const isTiebreakSet = (a, b) => (a === 7 && b === 6) || (a === 6 && b === 7);

/**
 * "6-4 3-6 7-6(7-5)" → [[6, 4], [3, 6], [7, 6, 7, 5]]; null if invalid.
 * @param {unknown} text
 * @param {number} [maxSets]
 * @returns {GameSet[] | null}
 */
export function parseScore(text, maxSets = 5) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const parts = text.trim().split(' ');
  if (parts.length > maxSets) return null;
  /** @type {GameSet[]} */
  const sets = [];
  for (const part of parts) {
    const match = SET.exec(part);
    if (!match) return null;
    const [a, b, ta, tb] = match.slice(1).map((n) => (n === undefined ? null : Number(n)));
    if (a > MAX_GAMES || b > MAX_GAMES) return null;
    if (ta === null) {
      sets.push([a, b]);
      continue;
    }
    // tie-break rule: only on a 7-6 set, and won by the side with the 7
    if (!isTiebreakSet(a, b) || ta > MAX_TIEBREAK || tb > MAX_TIEBREAK || (a > b) !== (ta > tb) || ta === tb) return null;
    sets.push([a, b, ta, tb]);
  }
  return sets;
}

export const formatScore = (sets) =>
  sets.map(([a, b, ta, tb]) => `${a}-${b}${ta != null && tb != null ? `(${ta}-${tb})` : ''}`).join(' ');

/**
 * By sets won; 'draw' covers matches cut short by time. Tied sets don't count.
 * @param {GameSet[]} sets
 */
export function scoreResult(sets) {
  const won = sets.filter(([a, b]) => a > b).length;
  const lost = sets.filter(([a, b]) => b > a).length;
  if (!won && !lost) return null;
  return won > lost ? 'win' : lost > won ? 'loss' : 'draw';
}

// ----- cleaning up what's sent or saved -----

export const cleanName = (value) =>
  (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_LIST_NAME).trim() : '');

/**
 * Keeps only the sport's visible fields, with defaults for missing choices. Throws on invalid values.
 * @param {Sport} sport
 * @param {unknown} raw
 * @param {{ strict?: boolean }} [options]  strict: false drops bad values instead (for repairing saved data)
 * @returns {Details}
 */
export function cleanDetails(sport, raw, { strict = true } = {}) {
  const input = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
  /** @type {Details} */
  const details = {};
  const bad = (message) => {
    if (strict) throw new Error(message);
  };
  for (const field of sport.fields) {
    const value = input[field.key];
    if (field.kind === 'choice') {
      if (value == null || value === '') {
        if (field.default) details[field.key] = field.default;
      } else if (field.options.some((o) => o.id === value)) {
        details[field.key] = /** @type {string} */ (value);
      } else {
        bad(`${field.label.toLowerCase()} must be one of: ${field.options.map((o) => o.id).join(', ')}`);
        if (field.default) details[field.key] = field.default;
      }
    } else if (field.kind === 'pick') {
      if ((field.count ?? 1) > 1) {
        // older data stored a single string here
        const names = (Array.isArray(value) ? value : [value]).map(cleanName).filter(Boolean);
        const unique = names.filter((n, i) => names.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i);
        if (unique.length > field.count) bad(`${field.label.toLowerCase()}: at most ${field.count}`);
        if (unique.length) details[field.key] = unique.slice(0, field.count);
      } else {
        const name = cleanName(value);
        if (name) details[field.key] = name;
      }
    } else if (value != null && value !== '') {
      const sets = parseScore(value, field.maxSets);
      if (sets) details[field.key] = formatScore(sets);
      else bad(`score must be up to ${field.maxSets} sets like 6-4 3-6 7-5, at most ${MAX_GAMES} games a side`);
    }
  }
  for (const field of sport.fields) if (!fieldShows(field, details)) delete details[field.key];
  return details;
}
