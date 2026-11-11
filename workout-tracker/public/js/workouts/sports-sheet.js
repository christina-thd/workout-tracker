// The user's sports, each with an on/off switch. Off only hides a sport: its sessions and purchases stay.
import { sendAction } from '../shared/api.js';
import { $, closest, escapeHtml } from '../shared/dom.js';
import { SPORTS, sportsFor } from '../shared/sports.js';
import { sportIcon } from '../ui/emoji.js';
import { createSheet } from '../ui/sheet.js';
import { toastError } from '../ui/toast.js';

/** @typedef {import('../shared/workouts.js').Person} Person */

/** @param {{ getPerson(): Person | undefined }} options  getPerson: who's using it */
export function createSportsSheet({ getPerson }) {
  const sheet = createSheet($('sportsLayer'));

  /** The last sport on can't be switched off. */
  function render() {
    const person = getPerson();
    if (!person) return;
    const onCount = sportsFor(person).length;
    $('sportToggles').innerHTML = SPORTS.map((sport) => {
      const on = !person.hiddenSports.includes(sport.id);
      const locked = on && onCount === 1;
      return `<li class="toggle-row">
        <span class="toggle-icon">${sportIcon(sport)}</span><span class="toggle-name">${escapeHtml(sport.name)}</span>
        <button type="button" class="switch" role="switch" aria-checked="${on}" data-sport="${sport.id}"
          aria-label="${escapeHtml(sport.name)}"${locked ? ' disabled title="Keep at least one sport on"' : ''}></button>
      </li>`;
    }).join('');
  }

  $('sportToggles').addEventListener('click', (e) => {
    const toggle = closest(e, '[data-sport]');
    const person = getPerson();
    if (!toggle || toggle.hasAttribute('disabled') || !person) return;
    const shown = toggle.getAttribute('aria-checked') !== 'true';
    toggle.setAttribute('aria-checked', String(shown)); // flips at once; the next update confirms it
    sendAction({ type: 'setSportShown', personId: person.id, sport: toggle.dataset.sport, shown }).catch((err) => {
      toastError(err);
      render();
    });
  });

  return {
    open() {
      render();
      sheet.open();
    },
    refresh() {
      if (sheet.isOpen) render();
    },
  };
}
