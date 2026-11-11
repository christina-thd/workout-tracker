// Home screen: one tile per person.
import { $, closest, escapeHtml } from '../shared/dom.js';
import { emoji } from '../ui/emoji.js';
import { icon } from '../ui/icons.js';

/** @typedef {import('../shared/workouts.js').Person} Person */

/**
 * @param {{ people: Person[], current: string | null }} view
 *   current: who this device last picked
 */
export function renderHome({ people, current }) {
  $('people').innerHTML = people.map((person) => {
    const selected = person.id === current;
    return `<div class="person${selected ? ' selected' : ''}">
      <button type="button" class="person-pick" data-person="${person.id}">
        <span class="person-emoji">${emoji(person.emoji)}</span>
        <span class="person-name">${escapeHtml(person.name)}</span>
      </button>
      <button type="button" class="person-edit" data-edit-person="${person.id}" aria-label="Edit ${escapeHtml(person.name)}">${icon('dots')}</button>
    </div>`;
  }).join('');
  $('addPerson').innerHTML = `${icon('plus')}<span>${people.length ? 'Add user' : 'Add the first user'}</span>`;
  $('addPerson').classList.toggle('primary', !people.length);
  $('addPerson').classList.toggle('ghost', people.length > 0);
}

/** @param {{ onPick(id: string): void, onEdit(id: string): void, onAdd(): void }} handlers */
export function wireHome({ onPick, onEdit, onAdd }) {
  $('people').addEventListener('click', (e) => {
    const edit = closest(e, '[data-edit-person]');
    if (edit) return onEdit(edit.dataset.editPerson);
    const pick = closest(e, '[data-person]');
    if (pick) onPick(pick.dataset.person);
  });
  $('addPerson').addEventListener('click', onAdd);
}
