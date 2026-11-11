// A person's sport list, plus the link to their players and clubs.
import { $, closest, escapeHtml } from '../shared/dom.js';
import { duration, plural, shortDay } from '../shared/format.js';
import { LISTS, sportsFor, tracks } from '../shared/sports.js';
import { byNewest } from '../shared/stats.js';
import { sportIcon } from '../ui/emoji.js';
import { icon } from '../ui/icons.js';
import { renderPersonChip } from './person-chip.js';

/** @typedef {import('../shared/workouts.js').Person} Person */
/** @typedef {import('../shared/workouts.js').Session} Session */

/** @param {{ person: Person, sessions: Session[], today: string }} view */
export function renderSports({ person, sessions, today }) {
  renderPersonChip($('sportsPerson'), person);
  $('sportList').innerHTML = sportsFor(person).map((sport) => {
    const theirs = sessions.filter((s) => s.sport === sport.id).sort(byNewest);
    const minutes = theirs.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
    const summary = theirs.length
      ? [plural(theirs.length, 'session'), tracks(sport, 'time') && duration(minutes), shortDay(theirs[0].date, today)]
        .filter(Boolean).join(' · ')
      : 'Nothing logged yet';
    return `<button type="button" class="sport-row" role="listitem" data-sport="${sport.id}">
      <span class="sport-emoji">${sportIcon(sport)}</span>
      <span class="sport-text"><span class="sport-name">${escapeHtml(sport.name)}</span><span class="sport-summary">${escapeHtml(summary)}</span></span>
      ${icon('forward')}
    </button>`;
  }).join('');
  const names = LISTS.reduce((sum, l) => sum + person[l.id].length, 0);
  $('openLists').innerHTML = `${icon('users')}<span>Players, clubs and places</span><span class="link-row-count">${names || ''}</span>${icon('forward')}`;
}

/** @param {{ onPick(sportId: string): void, onSwitchPerson(): void, onLists(): void, onChooseSports(): void }} handlers */
export function wireSports({ onPick, onSwitchPerson, onLists, onChooseSports }) {
  $('sportList').addEventListener('click', (e) => {
    const row = closest(e, '[data-sport]');
    if (row) onPick(row.dataset.sport);
  });
  $('sportsPerson').addEventListener('click', onSwitchPerson);
  $('openLists').addEventListener('click', onLists);
  $('chooseSports').innerHTML = icon('settings');
  $('chooseSports').addEventListener('click', onChooseSports);
}
