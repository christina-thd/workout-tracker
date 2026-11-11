// Current-person chip in the header; tapping it switches user.
import { escapeHtml } from '../shared/dom.js';
import { emoji } from '../ui/emoji.js';

/**
 * @param {HTMLElement} button
 * @param {import('../shared/workouts.js').Person} person
 */
export function renderPersonChip(button, person) {
  button.innerHTML = `${emoji(person.emoji)}<span>${escapeHtml(person.name)}</span>`;
  button.title = 'Switch user';
  button.setAttribute('aria-label', `${person.name}: switch user`);
}
