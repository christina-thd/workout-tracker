// Twemoji images (CC-BY 4.0, https://github.com/jdecked/twemoji) so emoji look the same on every platform;
// falls back to the character when offline.
import { escapeHtml } from '../shared/dom.js';

const BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/';
const VARIATION = /\uFE0F/g;
const JOINER = '\u200D';

/**
 * Twemoji file names drop U+FE0F except in ZWJ sequences (👩‍💻).
 * @param {string} char
 */
export function emojiUrl(char) {
  const text = char.includes(JOINER) ? char : char.replace(VARIATION, '');
  return `${BASE}${[...text].map((c) => c.codePointAt(0).toString(16)).join('-')}.svg`;
}

/**
 * @param {string} char
 * @param {string} [label]  for screen readers; omit when adjacent text already says it
 */
export function emoji(char, label = '') {
  const alt = escapeHtml(char);
  return `<img class="emoji-img" src="${emojiUrl(char)}" alt="${alt}" draggable="false"${label ? ` title="${escapeHtml(label)}"` : ' aria-hidden="true"'}>`;
}

/** Call once at startup. */
export function showTextWhenMissing() {
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img instanceof HTMLImageElement && img.classList.contains('emoji-img')) {
      const text = document.createElement('span');
      text.className = 'emoji-text';
      text.textContent = img.alt;
      img.replaceWith(text);
    }
  }, true);
}
