// Two-tap delete button: the first tap arms it for a few seconds, the second confirms.

const ARMED_MS = 3000;

/**
 * @param {HTMLElement} button
 * @param {{ ask: string, onConfirm(): void }} options  ask: armed label (HTML)
 * @returns {{ reset(): void }}
 */
export function tapTwice(button, { ask, onConfirm }) {
  let timer = null;
  let before = '';

  function reset() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    button.classList.remove('armed');
    button.innerHTML = before;
  }

  button.addEventListener('click', () => {
    if (timer) {
      reset();
      onConfirm();
      return;
    }
    before = button.innerHTML;
    button.innerHTML = ask;
    button.classList.add('armed');
    timer = setTimeout(reset, ARMED_MS);
  });

  return { reset };
}
