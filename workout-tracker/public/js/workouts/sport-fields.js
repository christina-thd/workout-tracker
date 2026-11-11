// Sport-specific session fields (choice chips, name pickers, score grid), built from sports.js definitions.
import { closest, escapeHtml } from '../shared/dom.js';
import {
  fieldShows, formatScore, isTiebreakSet, LISTS, MAX_GAMES, parseScore, partnerField, scoreResult,
} from '../shared/sports.js';
import { emoji } from '../ui/emoji.js';
import { icon } from '../ui/icons.js';
import { openMenu } from '../ui/menu.js';
import { toastError } from '../ui/toast.js';

/** @typedef {import('../shared/sports.js').Sport} Sport */
/** @typedef {import('../shared/sports.js').Field} Field */
/** @typedef {import('../shared/sports.js').Details} Details */
/** @typedef {import('../shared/sports.js').GameSet} GameSet */

// Names are prefixed so no real name can clash with NEW or ''.
const NAME = 'name:';
const NEW = 'new';
/** "player", "club", "place". */
const oneOf = (list) => LISTS.find((l) => l.id === list)?.one ?? 'name';
const GAMES = Array.from({ length: MAX_GAMES + 1 }, (_, i) => i);
const TIEBREAK_POINTS = Array.from({ length: 21 }, (_, i) => i); // higher saved values still load

/**
 * @param {{ root: HTMLElement, getNames(list: string): string[], addName(list: string, name: string): Promise<string> }} options
 *   addName resolves to the name as saved
 */
export function createSportFields({ root, getNames, addName }) {
  /** @type {Sport | null} */
  let sport = null;
  /** @type {Details} */
  let details = {};
  /**
   * Per set: [your games, theirs, your tie-break points, theirs].
   * @type {(number | null)[][]}
   */
  let grid = [];
  const completeSets = () => /** @type {GameSet[]} */ (grid
    .filter(([a, b]) => a != null && b != null)
    .map(([a, b, ta, tb]) => (isTiebreakSet(a, b) && ta != null && tb != null ? [a, b, ta, tb] : [a, b])));
  /**
   * Only a 7-6 set (or 7 vs. not yet filled) gets a tie-break column.
   * @param {(number | null)[]} set
   */
  const hasTiebreak = ([a, b]) => (a === 7 && (b == null || b === 6)) || (b === 7 && (a == null || a === 6));

  /**
   * Tie-break rule: the side with 7 games must have more points, so each side limits the other.
   * @param {(number | null)[]} set  [games, games, points, points]
   * @param {number} side  2: your team's points, 3: the opponents'
   */
  function tiebreakChoices(set, side) {
    const winner = set[0] === 7 ? 2 : 3;
    const other = set[side === 2 ? 3 : 2];
    if (other == null) return side === winner ? TIEBREAK_POINTS.slice(1) : TIEBREAK_POINTS.slice(0, -1);
    return TIEBREAK_POINTS.filter((p) => (side === winner ? p > other : p < other));
  }

  /** Clears a tie-break that no longer fits the games. */
  function keepTiebreakValid(set) {
    if (!hasTiebreak(set)) {
      set[2] = set[3] = null;
      return;
    }
    const [a, , ta, tb] = set;
    if (ta != null && tb != null && (a === 7) !== (ta > tb)) set[2] = set[3] = null;
  }
  let adding = null; // `${key}:${index}` of the picker in "Add new…" mode

  const scoreOf = () => sport.fields.find((f) => f.kind === 'score');

  /** Also fills in the result when the score decides it. */
  function scoreChanged() {
    const field = scoreOf();
    const sets = completeSets();
    if (sets.length) details[field.key] = formatScore(sets);
    else delete details[field.key];
    const result = sport.fields.find((f) => f.kind === 'choice' && f.result);
    const outcome = sets.length ? scoreResult(sets) : null;
    if (result && outcome) details[result.key] = outcome;
  }

  // ----- drawing -----

  function choiceHtml(field) {
    const chips = field.options.map((o) => {
      const on = details[field.key] === o.id;
      return `<button type="button" class="chip${on ? ' selected' : ''}" role="radio" aria-checked="${on}"
        data-field="${field.key}" data-option="${o.id}">${o.emoji ? emoji(o.emoji) : ''}${escapeHtml(o.label)}</button>`;
    }).join('');
    return `<div class="chips" role="radiogroup" aria-label="${escapeHtml(field.label)}">${chips}</div>`;
  }

  const placeholder = (field, index) => ((field.count ?? 1) > 1
    ? `${index === 0 ? 'First' : 'Second'} ${oneOf(field.list)}`
    : 'None');

  function pickHtml(field) {
    const count = field.count ?? 1;
    const picked = [details[field.key] ?? []].flat();
    const buttons = Array.from({ length: count }, (_, i) => {
      const value = picked[i] ?? '';
      const id = `${field.key}:${i}`;
      if (adding === id) {
        return `<div class="inline-add" data-adding="${id}">
          <input type="text" class="text-input" maxlength="60" enterkeyhint="done" placeholder="New ${oneOf(field.list)}" aria-label="New name">
          <button type="button" class="pill primary" data-add-save>Add</button>
          <button type="button" class="pill ghost" data-add-cancel>Cancel</button></div>`;
      }
      const label = count > 1 ? `${field.label} ${i + 1}` : field.label;
      return `<button type="button" class="select${value ? '' : ' empty'}" data-pick="${field.key}" data-index="${i}"
        aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(label)}">${escapeHtml(value || placeholder(field, i))}</button>`;
    }).join('');
    return `<div class="${count > 1 ? 'pick-pair' : 'pick-one'}">${buttons}</div>`;
  }

  /** Includes the current value even if it has since been removed from the list. */
  function openPick(button) {
    const field = sport.fields.find((f) => f.key === button.dataset.pick);
    if (field?.kind !== 'pick') return;
    const index = Number(button.dataset.index);
    const value = [details[field.key] ?? []].flat()[index] ?? '';
    const names = [...new Set([...getNames(field.list), ...(value ? [value] : [])])].sort((a, b) => a.localeCompare(b));
    openMenu(button, {
      label: button.getAttribute('aria-label'),
      options: [
        { value: '', label: (field.count ?? 1) > 1 ? 'Nobody' : 'None', selected: !value },
        ...names.map((n) => ({ value: NAME + n, label: n, selected: n === value })),
        { value: NEW, label: 'Add new…', action: true },
      ],
      onPick: (picked) => {
        if (picked === NEW) adding = `${field.key}:${index}`;
        else setPick(field, index, picked.slice(NAME.length));
        render();
      },
    });
  }

  function scoreHtml(field) {
    // with no teammate (tennis singles) it's you against one opponent
    const partner = partnerField(sport);
    const [mine, theirs] = partner && fieldShows(partner, details) ? ['Your team', 'Opponents'] : ['You', 'Opponent'];
    // sides 0/1 are games, 2/3 tie-break points
    const cell = (set, side) => {
      const value = grid[set][side];
      const tiebreak = side > 1;
      const who = (side % 2 ? theirs : mine).toLowerCase();
      return `<button type="button" class="select score-cell${tiebreak ? ' tiebreak' : ''}${value == null ? ' empty' : ''}"
        data-set="${set}" data-side="${side}" aria-haspopup="listbox" aria-expanded="false"
        aria-label="Set ${set + 1}${tiebreak ? ' tie-break' : ''}, ${who}">${value ?? '–'}</button>`;
    };
    const head = (set) => `<span class="score-head">Set ${set + 1}</span>`;
    const columns = (render) => grid.map((s, i) => render(i) + (hasTiebreak(s) ? render(i, true) : '')).join('');
    const template = ['14px', ...grid.map((s) => (hasTiebreak(s) ? '54px 48px' : '54px'))].join(' ');
    const row = (side) => columns((set, tiebreak) => cell(set, tiebreak ? side + 2 : side));
    const canAdd = grid.length < field.maxSets;
    const canRemove = grid.length > field.sets;
    const done = completeSets();
    const won = done.filter(([a, b]) => a > b).length;
    const lost = done.filter(([a, b]) => b > a).length;
    return `<div class="score-card">
      <div class="score-card-head">
        <span class="settings-label">${escapeHtml(field.label)}</span>
        <span class="score-set-buttons">
          ${canRemove ? `<button type="button" class="score-add" data-remove-set aria-label="Remove the last set">${icon('minus')}Set</button>` : ''}
          ${canAdd ? `<button type="button" class="score-add" data-add-set aria-label="Add a set">${icon('plus')}Set</button>` : ''}
        </span>
      </div>
      <div class="score-grid" style="grid-template-columns:${template}">
        <span></span>${columns((set, tiebreak) => (tiebreak ? '<span class="score-head tiebreak-head" title="Tie-break">TB</span>' : head(set)))}
        <span class="score-dot mine" title="${mine}"></span>${row(0)}
        <span class="score-dot theirs" title="${theirs}"></span>${row(1)}
      </div>
      <div class="score-card-foot">
        <span class="score-key"><span class="score-dot mine"></span>${mine}</span>
        <span class="score-key"><span class="score-dot theirs"></span>${theirs}</span>
        <span class="score-summary">${done.length ? `Sets ${won}–${lost}` : ''}</span>
      </div>
    </div>`;
  }

  function render() {
    root.innerHTML = sport.fields.map((field) => {
      if (!fieldShows(field, details)) return '';
      if (field.kind === 'score') return scoreHtml(field); // has its own title
      const body = field.kind === 'choice' ? choiceHtml(field) : pickHtml(field);
      return `<div class="field"><span class="settings-label">${escapeHtml(field.label)}</span>${body}</div>`;
    }).join('');
    /** @type {HTMLInputElement | null} */ (root.querySelector('[data-adding] input'))?.focus();
  }

  // ----- editing -----

  function setPick(field, index, name) {
    if ((field.count ?? 1) === 1) {
      if (name) details[field.key] = name;
      else delete details[field.key];
      return;
    }
    const names = [details[field.key] ?? []].flat();
    names[index] = name;
    const kept = names.filter(Boolean);
    if (kept.length) details[field.key] = kept;
    else delete details[field.key];
  }

  root.addEventListener('click', async (e) => {
    const pick = closest(e, '[data-pick]');
    if (pick) return openPick(pick);
    const cell = closest(e, '[data-set]');
    if (cell) return openScoreCell(cell);
    if (closest(e, '[data-add-set]')) {
      grid.push([null, null, null, null]);
      return render();
    }
    if (closest(e, '[data-remove-set]')) {
      grid.pop();
      scoreChanged();
      return render();
    }
    const chip = closest(e, '[data-option]');
    if (chip) {
      const field = sport.fields.find((f) => f.key === chip.dataset.field);
      // re-tapping clears it, unless the field has a default
      if (details[field.key] === chip.dataset.option && field.kind === 'choice' && !field.default) delete details[field.key];
      else details[field.key] = chip.dataset.option;
      return render();
    }
    const box = closest(e, '[data-adding]');
    if (!box) return;
    if (closest(e, '[data-add-cancel]')) {
      adding = null;
      return render();
    }
    if (closest(e, '[data-add-save]')) await saveNew(box);
  });

  root.addEventListener('keydown', (e) => {
    const box = closest(e, '[data-adding]');
    if (!box || e.key !== 'Enter') return;
    e.preventDefault(); // don't submit the session form
    saveNew(box);
  });

  async function saveNew(box) {
    const input = /** @type {HTMLInputElement} */ (box.querySelector('input'));
    const typed = input.value.trim();
    if (!typed) return input.focus();
    const [key, index] = box.dataset.adding.split(':');
    const field = sport.fields.find((f) => f.key === key);
    if (field.kind !== 'pick') return;
    try {
      setPick(field, Number(index), await addName(field.list, typed));
      adding = null;
      render();
    } catch (err) {
      toastError(err);
    }
  }

  function openScoreCell(button) {
    const set = grid[Number(button.dataset.set)];
    const side = Number(button.dataset.side);
    const value = set[side];
    const choices = side > 1 ? tiebreakChoices(set, side) : GAMES;
    openMenu(button, {
      label: button.getAttribute('aria-label'),
      columns: side > 1 ? 5 : 4, // games: 0–3 above 4–7
      options: [
        ...choices.map((n) => ({ value: String(n), label: String(n), selected: n === value })),
        ...(value == null ? [] : [{ value: '', label: 'Clear', action: true }]),
      ],
      onPick: (picked) => {
        set[side] = picked === '' ? null : Number(picked);
        keepTiebreakValid(set);
        scoreChanged();
        render();
      },
    });
  }

  return {
    open(forSport, values) {
      sport = forSport;
      details = structuredClone(values);
      adding = null;
      const field = scoreOf();
      const sets = field ? parseScore(details[field.key], field.maxSets) ?? [] : [];
      grid = Array.from({ length: field ? Math.max(field.sets, sets.length) : 0 }, (_, i) => {
        const [a = null, b = null, ta = null, tb = null] = sets[i] ?? [];
        return [a, b, ta, tb];
      });
      render();
    },

    /** Only visible, non-empty fields. */
    get value() {
      /** @type {Details} */
      const clean = {};
      for (const field of sport.fields) {
        const value = details[field.key];
        if (value == null || !fieldShows(field, details)) continue;
        if (Array.isArray(value) ? value.length : value !== '') clean[field.key] = value;
      }
      return clean;
    },

    get isAdding() {
      return adding !== null;
    },

    /** Everything being edited, half-filled score included, for spotting unsaved changes. */
    get draft() {
      return JSON.stringify({ details: this.value, grid });
    },
  };
}
