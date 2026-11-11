/**
 * @param {string} id
 * @returns {HTMLElement}
 */
export const $ = (id) => document.getElementById(id);

/**
 * For event delegation.
 * @param {Event} event
 * @param {string} selector
 * @returns {HTMLElement | null}
 */
export const closest = (event, selector) => /** @type {Element} */ (event.target).closest(selector);

/**
 * null when empty, NaN when not a number.
 * @param {HTMLInputElement} input
 */
export function numberValue(input) {
  const text = input.value.trim();
  return text === '' ? null : Number(text);
}

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** All user-entered text goes through this before reaching innerHTML. */
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]);
