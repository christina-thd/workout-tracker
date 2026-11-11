// "Discard changes?" dialog, shown when a sheet with unsaved changes is closed (js/ui/sheet.js).
import { $ } from '../shared/dom.js';

const layer = $('discardLayer');
let answer = null;

function finish(discard) {
  layer.hidden = true;
  const resolve = answer;
  answer = null;
  resolve?.(discard);
}

$('discardKeep').addEventListener('click', () => finish(false));
$('discardGo').addEventListener('click', () => finish(true));
layer.addEventListener('click', (e) => {
  if (e.target === layer) finish(false);
});
layer.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  e.stopPropagation(); // not the sheet under it
  finish(false);
});

/** @returns {Promise<boolean>} true to discard, false to keep editing */
export function confirmDiscard() {
  if (answer) return Promise.resolve(false);
  layer.hidden = false;
  $('discardKeep').focus();
  return new Promise((resolve) => {
    answer = resolve;
  });
}
