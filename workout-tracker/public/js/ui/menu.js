// Custom dropdown, since native <select> lists can't be styled. Optional grid layout (score number pad).
import { $, escapeHtml } from '../shared/dom.js';

/**
 * @typedef {{ value: string, label: string, selected?: boolean, action?: boolean }} MenuOption
 *   action: a command like "Add new…" rather than a value
 */

const GAP = 6;
const EDGE = 8;

const menu = $('menu');
/** @type {{ anchor: HTMLElement, options: MenuOption[], onPick(value: string): void } | null} */
let open = null;

const optionButtons = () => /** @type {HTMLElement[]} */ ([...menu.querySelectorAll('.menu-option')]);

/** Below the anchor, or above when it doesn't fit; clamped to the viewport. */
function place(anchor) {
  const box = anchor.getBoundingClientRect();
  menu.style.minWidth = menu.classList.contains('grid') ? '' : `${box.width}px`;
  const { offsetWidth: width, offsetHeight: height } = menu;
  const fitsBelow = box.bottom + GAP + height <= innerHeight - EDGE;
  const top = fitsBelow || box.top - GAP - height < EDGE ? box.bottom + GAP : box.top - GAP - height;
  menu.style.top = `${Math.max(EDGE, top)}px`;
  menu.style.left = `${Math.min(Math.max(EDGE, box.left), innerWidth - width - EDGE)}px`;
}

/**
 * Toggles: opening again from the same anchor closes it.
 * @param {HTMLElement} anchor
 * @param {{ options: MenuOption[], label: string, columns?: number, onPick(value: string): void }} options
 */
export function openMenu(anchor, { options, label, columns = 1, onPick }) {
  if (open?.anchor === anchor) return closeMenu();
  closeMenu();
  menu.innerHTML = options.map((o, i) => `<button type="button" role="option" data-index="${i}" aria-selected="${Boolean(o.selected)}"
    class="menu-option${o.selected ? ' selected' : ''}${o.action ? ' action' : ''}">${escapeHtml(o.label)}</button>`).join('');
  menu.classList.toggle('grid', columns > 1);
  menu.style.setProperty('--columns', String(columns));
  menu.setAttribute('aria-label', label);
  menu.hidden = false;
  place(anchor);
  open = { anchor, options, onPick };
  anchor.setAttribute('aria-expanded', 'true');
  (optionButtons().find((b) => b.classList.contains('selected')) ?? optionButtons()[0])?.focus({ preventScroll: true });
}

export function closeMenu({ focus = false } = {}) {
  if (!open) return;
  const { anchor } = open;
  open = null;
  menu.hidden = true;
  anchor.setAttribute('aria-expanded', 'false');
  if (focus && anchor.isConnected) anchor.focus({ preventScroll: true });
}

menu.addEventListener('click', (e) => {
  const button = /** @type {Element} */ (e.target).closest('.menu-option');
  if (!(button instanceof HTMLElement) || !open) return;
  const { onPick, options } = open;
  closeMenu({ focus: true });
  onPick(options[Number(button.dataset.index)].value);
});

menu.addEventListener('keydown', (e) => {
  const buttons = optionButtons();
  const at = buttons.indexOf(/** @type {HTMLElement} */ (document.activeElement));
  const columns = Number(menu.style.getPropertyValue('--columns')) || 1;
  const move = { ArrowDown: columns, ArrowUp: -columns, ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (move !== undefined) {
    e.preventDefault();
    buttons[Math.min(Math.max(at + move, 0), buttons.length - 1)]?.focus();
  } else if (e.key === 'Escape' || e.key === 'Tab') {
    e.preventDefault();
    e.stopPropagation(); // keep the sheet underneath open
    closeMenu({ focus: true });
  }
});

// close on outside tap, and on scroll/resize since the panel is fixed-position
document.addEventListener('pointerdown', (e) => {
  const target = /** @type {Node} */ (e.target);
  if (open && !menu.contains(target) && !open.anchor.contains(target)) closeMenu();
}, true);
document.addEventListener('scroll', (e) => {
  if (open && !menu.contains(/** @type {Node} */ (e.target))) closeMenu();
}, true);
window.addEventListener('resize', () => closeMenu());
