// Emoji picker: a grid of suggestions plus a field for typing any emoji.
import { closest, escapeHtml } from '../shared/dom.js';
import { firstEmoji } from '../shared/workouts.js';
import { emoji } from './emoji.js';

/**
 * @param {{ grid: HTMLElement, custom: HTMLInputElement, choices: readonly string[], onPick(emoji: string): void }} options
 *   onPick is not called by set()
 */
export function createEmojiPicker({ grid, custom, choices, onPick }) {
  let value = '';

  function render() {
    // include a hand-typed current value
    const offered = choices.includes(value) || !value ? choices : [value, ...choices];
    grid.innerHTML = offered.map((e) => `<button type="button" class="emoji${e === value ? ' selected' : ''}"
      data-emoji="${escapeHtml(e)}" role="radio" aria-checked="${e === value}" aria-label="${escapeHtml(e)}">${emoji(e)}</button>`).join('');
  }

  function pick(picked) {
    value = picked;
    render();
    onPick(picked);
  }

  grid.addEventListener('click', (e) => {
    const button = closest(e, '[data-emoji]');
    if (button) pick(button.dataset.emoji);
  });

  custom.addEventListener('input', () => {
    const typed = firstEmoji(custom.value);
    if (!typed) return;
    custom.value = '';
    pick(typed);
  });

  return {
    get value() {
      return value;
    },
    set(picked) {
      value = picked;
      custom.value = '';
      render();
    },
  };
}
