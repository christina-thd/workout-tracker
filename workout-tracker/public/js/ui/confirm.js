// Type-"delete"-to-confirm sheet for irreversible deletes; stacks on top of the sheet that asked.
import { $ } from '../shared/dom.js';
import { createSheet } from './sheet.js';

let resolveOpen = null;
let confirmed = false;
const WORD = 'delete';

const input = /** @type {HTMLInputElement} */ ($('confirmInput'));
const go = /** @type {HTMLButtonElement} */ ($('confirmGo'));

const sheet = createSheet($('confirmLayer'), {
  // resolve only after our history entry is gone, so the caller can then close its own sheet
  onClose: () => {
    input.blur();
    resolveOpen?.(confirmed);
    resolveOpen = null;
  },
});

const matches = () => input.value.trim().toLowerCase() === WORD;

input.addEventListener('input', () => {
  go.disabled = !matches();
});

$('confirmForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!matches()) return input.focus();
  confirmed = true;
  sheet.close();
});

/**
 * Resolves false on any kind of cancel (button, swipe, back, Escape).
 * @param {{ title: string, text: string, button: string }} options
 * @returns {Promise<boolean>}
 */
export function confirmDelete({ title, text, button }) {
  confirmed = false;
  $('confirmTitle').textContent = title;
  $('confirmText').textContent = text;
  $('confirmLabel').textContent = `Type "${WORD}" to confirm`;
  input.value = '';
  go.textContent = button;
  go.disabled = true;
  return new Promise((resolve) => {
    resolveOpen = resolve;
    sheet.open();
    setTimeout(() => input.focus(), 320); // after the slide-in
  });
}
