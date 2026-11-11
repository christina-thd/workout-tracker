// Sheet for editing a person's players and clubs lists.
import { sendAction } from '../shared/api.js';
import { $, closest, escapeHtml } from '../shared/dom.js';
import { LISTS } from '../shared/sports.js';
import { icon } from '../ui/icons.js';
import { createSheet } from '../ui/sheet.js';
import { toast, toastError } from '../ui/toast.js';

/** @typedef {import('../shared/workouts.js').Person} Person */

/** @param {{ getPerson(): Person | undefined }} options */
export function createListsSheet({ getPerson }) {
  const name = /** @type {HTMLInputElement} */ ($('listsName'));
  let list = LISTS[0].id;
  // Like tap-twice.js, but the armed name is tracked here because the list re-renders on every change.
  let asking = null;
  let askingTimer = null;
  function stopAsking() {
    clearTimeout(askingTimer);
    asking = null;
  }

  const sheet = createSheet($('listsLayer'), { onClose: () => name.blur() });
  const current = () => LISTS.find((l) => l.id === list);

  function render() {
    const person = getPerson();
    if (!person) return;
    $('listsTabs').innerHTML = LISTS.map((l) =>
      `<button type="button" role="tab" data-list="${l.id}" class="${l.id === list ? 'selected' : ''}" aria-selected="${l.id === list}">
        ${l.label} <span class="count">${person[l.id].length}</span></button>`).join('');
    name.placeholder = `Add a ${current().one}`;
    const names = [...person[list]].sort((a, b) => a.localeCompare(b));
    $('listsNames').innerHTML = names.length
      ? names.map((n) => `<li class="name-row-item"><span>${escapeHtml(n)}</span>
          <button type="button" class="name-remove${n === asking ? ' armed' : ''}" data-remove="${escapeHtml(n)}"
            aria-label="Remove ${escapeHtml(n)}">${n === asking ? 'Remove?' : icon('close')}</button></li>`).join('')
      : `<li class="name-empty">No ${current().label.toLowerCase()} yet</li>`;
  }

  $('listsTabs').addEventListener('click', (e) => {
    const tab = closest(e, '[data-list]');
    if (!tab) return;
    list = tab.dataset.list;
    stopAsking();
    render();
  });

  $('listsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = name.value.trim();
    const person = getPerson();
    if (!value || !person) return name.focus();
    try {
      await sendAction({ type: 'addToList', personId: person.id, list, name: value });
      name.value = '';
      name.focus();
    } catch (err) {
      toastError(err);
    }
  });

  $('listsNames').addEventListener('click', async (e) => {
    const button = closest(e, '[data-remove]');
    const person = getPerson();
    if (!button || !person) return;
    const removed = button.dataset.remove;
    if (removed !== asking) {
      stopAsking();
      asking = removed;
      askingTimer = setTimeout(() => {
        stopAsking();
        render();
      }, 3000);
      return render();
    }
    stopAsking();
    const from = list;
    try {
      await sendAction({ type: 'removeFromList', personId: person.id, list: from, name: removed });
      toast(`Removed ${removed}`, {
        action: { label: 'Undo', run: () => sendAction({ type: 'addToList', personId: person.id, list: from, name: removed }).catch(toastError) },
      });
    } catch (err) {
      toastError(err);
    }
  });

  $('listsAdd').innerHTML = icon('plus');

  return {
    open(listId = LISTS[0].id) {
      list = listId;
      name.value = '';
      stopAsking();
      render();
      sheet.open();
    },
    refresh() {
      if (sheet.isOpen) render();
    },
  };
}
