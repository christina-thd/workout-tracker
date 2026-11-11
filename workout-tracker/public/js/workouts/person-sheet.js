// Sheet for adding, editing and deleting a person.
import { sendAction } from '../shared/api.js';
import { $ } from '../shared/dom.js';
import { plural } from '../shared/format.js';
import { PERSON_EMOJIS, pickPersonEmoji } from '../shared/workouts.js';
import { confirmDelete } from '../ui/confirm.js';
import { emoji as emojiHtml } from '../ui/emoji.js';
import { createEmojiPicker } from '../ui/emoji-picker.js';
import { icon } from '../ui/icons.js';
import { createSheet } from '../ui/sheet.js';
import { toast, toastError } from '../ui/toast.js';

/** @typedef {import('../shared/workouts.js').Person} Person */
/** @typedef {import('../shared/workouts.js').Session} Session */

/**
 * @param {{ getPeople(): Person[], getSessions(): Session[], onCreated(personId: string): void,
 *   onDeleted(personId: string): void, onClose?: () => void }} options
 *   onClose: history steps back one at a time, so whatever opens next waits for this
 */
export function createPersonSheet({ getPeople, getSessions, onCreated, onDeleted, onClose }) {
  const name = /** @type {HTMLInputElement} */ ($('personName'));
  const custom = /** @type {HTMLInputElement} */ ($('personEmojiCustom'));
  const remove = $('personDelete');
  let personId = null; // null: adding someone new
  let edited = false;
  let before = null; // snapshot for Undo
  let busy = false;

  const sheet = createSheet($('personLayer'), {
    onClose: () => {
      name.blur();
      custom.blur();
      saveName(); // renames save however the sheet is closed
      onClose?.();
    },
  });

  const emoji = createEmojiPicker({
    grid: $('personEmojis'),
    custom,
    choices: PERSON_EMOJIS,
    onPick: (picked) => {
      $('personEmoji').innerHTML = emojiHtml(picked);
      if (!personId) return;
      edited = true;
      sendAction({ type: 'setPersonEmoji', personId, emoji: picked }).catch(toastError);
    },
  });

  function saveName() {
    const person = personId && getPeople().find((p) => p.id === personId);
    if (!person) return;
    const value = name.value.trim();
    const renamed = Boolean(value) && value !== person.name;
    if (renamed) sendAction({ type: 'renamePerson', personId, name: value }).catch(toastError);
    if (renamed || edited) {
      const old = before;
      toast(`Saved ${value || person.name}`, { icon: 'check', action: { label: 'Undo', run: () => restore(old) } });
    }
  }

  async function restore(old) {
    const person = getPeople().find((p) => p.id === old.id);
    if (!person) return;
    try {
      if (person.name !== old.name) await sendAction({ type: 'renamePerson', personId: old.id, name: old.name });
      if (person.emoji !== old.emoji) await sendAction({ type: 'setPersonEmoji', personId: old.id, emoji: old.emoji });
    } catch (err) {
      toastError(err);
    }
  }

  /** Refuses once they have sessions, so Undo can't silently delete data. */
  async function unadd(id) {
    if (getSessions().some((s) => s.personId === id)) return toast('They have sessions now: delete them from their ⋯ instead', { error: true });
    try {
      await sendAction({ type: 'removePerson', personId: id });
      onDeleted(id);
    } catch (err) {
      toastError(err);
    }
  }

  function renderDelete() {
    $('personExtra').hidden = !personId;
    remove.innerHTML = `${icon('trash')}<span>Delete user</span>`;
  }

  $('personForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = name.value.trim();
    if (!value || busy) return name.focus();
    busy = true;
    try {
      if (personId) {
        sheet.close(); // onClose saves the name
      } else {
        const { personId: created } = await sendAction({ type: 'addPerson', name: value, emoji: emoji.value });
        sheet.close();
        toast(`Added ${value}`, { icon: 'check', action: { label: 'Undo', run: () => unadd(created) } });
        onCreated(created);
      }
    } catch (err) {
      toastError(err);
    } finally {
      busy = false;
    }
  });

  remove.addEventListener('click', async () => {
    const person = personId && getPeople().find((p) => p.id === personId);
    if (!person) return;
    const sessions = getSessions().filter((s) => s.personId === person.id).length;
    const sure = await confirmDelete({
      title: 'Delete user?',
      text: `This deletes ${person.name}${sessions ? ` and their ${plural(sessions, 'session')}` : ''}, for good. It can't be undone.`,
      button: 'Delete user',
    });
    if (!sure || personId !== person.id) return;
    personId = null; // nothing to save on close
    sheet.close();
    sendAction({ type: 'removePerson', personId: person.id })
      .then(() => {
        toast(`Deleted ${person.name}`);
        onDeleted(person.id);
      })
      .catch(toastError);
  });

  return {
    open(id = null) {
      const person = id ? getPeople().find((p) => p.id === id) : null;
      personId = person?.id ?? null;
      before = person && { ...person };
      edited = false;
      const value = person?.emoji ?? pickPersonEmoji(getPeople());
      emoji.set(value);
      $('personEmoji').innerHTML = emojiHtml(value);
      name.value = person?.name ?? '';
      $('personTitle').textContent = person ? 'User' : 'New user';
      $('personSave').textContent = person ? 'Save' : 'Add user';
      renderDelete();
      sheet.open();
      if (!person) setTimeout(() => name.focus(), 320); // after the slide-in, so the page doesn't jump
    },

    /** They may have been deleted on another device. */
    refresh() {
      if (!sheet.isOpen || !personId) return;
      if (!getPeople().some((p) => p.id === personId)) {
        personId = null;
        sheet.close();
        return;
      }
      renderDelete();
    },
  };
}
