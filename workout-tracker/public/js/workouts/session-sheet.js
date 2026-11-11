// Sheet for logging, editing and deleting a session. Sport-specific fields come from sport-fields.js.
import { sendAction } from '../shared/api.js';
import { $, closest, escapeHtml, numberValue } from '../shared/dom.js';
import { currencySymbol, duration } from '../shared/format.js';
import { hasWatch, sportOf, tracks } from '../shared/sports.js';
import { byNewest } from '../shared/stats.js';
import { DEFAULT_FEEL, DURATIONS, FEELS, isDate, localDate, MAX_MINUTES, WATCH_LIMITS } from '../shared/workouts.js';
import { emoji, sportIcon } from '../ui/emoji.js';
import { icon } from '../ui/icons.js';
import { createSheet } from '../ui/sheet.js';
import { tapTwice } from '../ui/tap-twice.js';
import { toast, toastError } from '../ui/toast.js';
import { createSportFields } from './sport-fields.js';

/** @typedef {import('../shared/workouts.js').Person} Person */
/** @typedef {import('../shared/workouts.js').Session} Session */
/** @typedef {import('../shared/sports.js').Sport} Sport */
/** @typedef {import('../shared/sports.js').Details} Details */

const input = (id) => /** @type {HTMLInputElement} */ ($(id));

/** Copied back into addSession to undo a delete. */
const LOGGED_FIELDS = ['personId', 'sport', 'date', 'minutes', 'feel', 'cost', 'avgHr', 'maxHr', 'calories', 'note', 'details'];

/**
 * @param {{ getPeople(): Person[], getSessions(): Session[], getCurrency(): string }} options
 */
export function createSessionSheet({ getPeople, getSessions, getCurrency }) {
  const form = $('sessionForm');
  const date = input('sessionDate');
  const minutes = input('sessionMinutes');
  const cost = input('sessionCost');
  const avgHr = input('sessionAvgHr');
  const maxHr = input('sessionMaxHr');
  const calories = input('sessionCalories');
  const note = /** @type {HTMLTextAreaElement} */ ($('sessionNote'));
  const watchFields = [
    { key: 'avgHr', el: avgHr, name: 'average heart rate' },
    { key: 'maxHr', el: maxHr, name: 'max heart rate' },
    { key: 'calories', el: calories, name: 'calorie count' },
  ];

  /** @type {Sport | null} */
  let sport = null;
  let personId = null;
  let sessionId = null; // null: new
  let feel = DEFAULT_FEEL;
  let busy = false;
  let opened = ''; // draft() when the sheet opened

  /** All the sheet's values, to compare with when it opened. */
  const draft = () => JSON.stringify([date.value, minutes.value, feel, cost.value, avgHr.value, maxHr.value,
    calories.value, note.value, fields.draft]);

  const sheet = createSheet($('sessionLayer'), {
    onClose: () => /** @type {HTMLElement} */ (document.activeElement)?.blur?.(),
    hasChanges: () => draft() !== opened,
  });

  const fields = createSportFields({
    root: $('sportFields'),
    getNames: (list) => getPeople().find((p) => p.id === personId)?.[list] ?? [],
    addName: async (list, name) => (await sendAction({ type: 'addToList', personId, list, name })).name,
  });

  // ----- duration -----

  function renderDurations() {
    const value = Number(minutes.value);
    $('sessionDurations').innerHTML = (sport?.durations ?? DURATIONS).map((m) =>
      `<button type="button" class="chip${m === value ? ' selected' : ''}" data-minutes="${m}">${duration(m)}</button>`).join('');
  }
  $('sessionDurations').addEventListener('click', (e) => {
    const chip = closest(e, '[data-minutes]');
    if (!chip) return;
    minutes.value = chip.dataset.minutes;
    minutes.classList.remove('invalid');
    renderDurations();
  });
  minutes.addEventListener('input', () => {
    minutes.classList.remove('invalid');
    renderDurations();
  });
  date.addEventListener('input', () => date.classList.remove('invalid'));

  // ----- feel -----

  function renderFeels() {
    $('sessionFeel').innerHTML = FEELS.map((f) =>
      `<button type="button" class="feel${f.id === feel ? ' selected' : ''}" role="radio" aria-checked="${f.id === feel}" data-feel="${f.id}">
        <span class="feel-emoji">${emoji(f.emoji)}</span>${escapeHtml(f.label)}</button>`).join('');
  }
  $('sessionFeel').addEventListener('click', (e) => {
    const button = closest(e, '[data-feel]');
    if (!button) return;
    feel = button.dataset.feel;
    renderFeels();
  });

  // ----- smartwatch -----

  function setWatchOpen(open) {
    $('watchFields').hidden = !open;
    $('watchToggle').setAttribute('aria-expanded', String(open));
  }
  $('watchToggle').innerHTML = `${icon('watch')}<span>Smartwatch</span><span class="chevron">${icon('chevron')}</span>`;
  $('watchToggle').addEventListener('click', () => setWatchOpen($('watchFields').hidden));

  // ----- saving -----

  function showError(message, field = null) {
    $('sessionError').textContent = message;
    $('sessionError').hidden = !message;
    if (field) {
      field.classList.add('invalid');
      field.focus();
    }
  }

  /** null after showing the first validation error. */
  function collect() {
    for (const el of form.querySelectorAll('.invalid')) el.classList.remove('invalid');
    if (!isDate(date.value)) return showError('Pick the day of the session.', date), null;
    const timed = tracks(sport, 'time');
    const mins = timed ? numberValue(minutes) : null;
    if (timed && !(Number.isInteger(mins) && mins >= 1 && mins <= MAX_MINUTES)) {
      return showError('How long was it, in minutes?', minutes), null;
    }
    const money = tracks(sport, 'cost') ? numberValue(cost) : null;
    if (money != null && !(money >= 0)) return showError("The cost isn't a number.", cost), null;
    const watch = { avgHr: null, maxHr: null, calories: null };
    for (const { key, el, name } of hasWatch(sport) ? watchFields : []) {
      const value = numberValue(el);
      const { min, max } = WATCH_LIMITS[key];
      if (value != null && !(Number.isInteger(value) && value >= min && value <= max)) {
        setWatchOpen(true);
        return showError(`That ${name} doesn't look right: it's a whole number from ${min} to ${max}.`, el), null;
      }
      watch[key] = value;
    }
    if (watch.avgHr != null && watch.maxHr != null && watch.maxHr < watch.avgHr) {
      setWatchOpen(true);
      return showError('The max heart rate is lower than the average.', maxHr), null;
    }
    if (fields.isAdding) return showError('Add the new name first, or cancel it.'), null;
    showError('');
    return {
      date: date.value, minutes: mins, feel: tracks(sport, 'feel') ? feel : null,
      cost: money == null ? null : Math.round(money * 100) / 100,
      ...watch, note: note.value.trim(), details: fields.value,
    };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const values = collect();
    if (!values) return;
    busy = true;
    try {
      if (sessionId) {
        await sendAction({ type: 'editSession', sessionId, ...values });
        sheet.close({ force: true });
        toast('Saved', { icon: 'check' });
      } else {
        const { sessionId: created } = await sendAction({ type: 'addSession', personId, sport: sport.id, ...values });
        sheet.close({ force: true });
        toast('Session logged', {
          icon: 'check',
          action: { label: 'Undo', run: () => sendAction({ type: 'removeSession', sessionId: created }).catch(toastError) },
        });
      }
    } catch (err) {
      showError(err.message);
    } finally {
      busy = false;
    }
  });

  // Undo re-adds it as a new session with the same fields.
  const remove = tapTwice($('sessionDelete'), {
    ask: `${icon('trash')}<span>Tap again to delete</span>`,
    onConfirm: () => deleteSession(),
  });
  async function deleteSession() {
    const session = getSessions().find((s) => s.id === sessionId);
    if (!session) return;
    sessionId = null;
    sheet.close({ force: true });
    try {
      await sendAction({ type: 'removeSession', sessionId: session.id });
      const again = Object.fromEntries(LOGGED_FIELDS.map((key) => [key, session[key]]));
      toast('Session deleted', {
        icon: 'trash',
        action: { label: 'Undo', run: () => sendAction({ type: 'addSession', ...again }).catch(toastError) },
      });
    } catch (err) {
      toastError(err);
    }
  }

  // ----- opening -----

  /** Prefills `remember` fields from the person's last session of this sport. */
  function startFrom(last) {
    /** @type {Details} */
    const start = {};
    for (const field of sport.fields) {
      if (field.kind === 'choice' && field.default) start[field.key] = field.default;
      if (field.remember && last?.details[field.key]) start[field.key] = last.details[field.key];
    }
    return start;
  }

  return {
    /**
     * @param {{ personId: string, sportId: string, sessionId?: string | null, today?: string }} options
     */
    open({ personId: who, sportId, sessionId: id = null, today = localDate() }) {
      const session = id ? getSessions().find((s) => s.id === id) : null;
      sport = sportOf(session?.sport ?? sportId);
      if (!sport) return;
      personId = session?.personId ?? who;
      sessionId = session?.id ?? null;
      const last = session ? null : getSessions().filter((s) => s.personId === personId && s.sport === sport.id).sort(byNewest)[0];

      date.value = session?.date ?? today;
      date.max = localDate(Date.now() + 366 * 86_400_000);
      minutes.value = String(session?.minutes ?? last?.minutes ?? sport.defaultMinutes ?? 90);
      feel = session?.feel ?? DEFAULT_FEEL;
      cost.value = session?.cost == null ? '' : String(session.cost);
      avgHr.value = session?.avgHr == null ? '' : String(session.avgHr);
      maxHr.value = session?.maxHr == null ? '' : String(session.maxHr);
      calories.value = session?.calories == null ? '' : String(session.calories);
      note.value = session?.note ?? '';
      for (const symbol of form.querySelectorAll('[data-currency]')) symbol.textContent = currencySymbol(getCurrency());
      // only the fields this sport tracks (sports.js `tracks`)
      for (const el of form.querySelectorAll('[data-tracks]')) {
        if (el instanceof HTMLElement) el.hidden = !tracks(sport, /** @type {any} */ (el.dataset.tracks));
      }
      form.querySelector('.field-row').classList.toggle('single', !tracks(sport, 'time'));
      $('watchToggle').hidden = !hasWatch(sport);
      setWatchOpen(hasWatch(sport) && Boolean(session && (session.avgHr != null || session.maxHr != null || session.calories != null)));

      $('sessionTitle').innerHTML = `${sportIcon(sport)}<span>${escapeHtml(session ? `${sport.name} session` : `New ${sport.name.toLowerCase()} session`)}</span>`;
      $('sessionSave').textContent = session ? 'Save' : 'Log session';
      remove.reset();
      $('sessionDelete').innerHTML = `${icon('trash')}<span>Delete</span>`;
      $('sessionDelete').hidden = !session;
      showError('');
      for (const el of form.querySelectorAll('.invalid')) el.classList.remove('invalid');
      renderDurations();
      renderFeels();
      fields.open(sport, session ? session.details : startFrom(last));
      sheet.open();
      opened = draft();
    },

    /** It may have been deleted on another device. */
    refresh() {
      if (sheet.isOpen && sessionId && !getSessions().some((s) => s.id === sessionId)) {
        sessionId = null;
        sheet.close({ force: true });
      }
    },
  };
}
