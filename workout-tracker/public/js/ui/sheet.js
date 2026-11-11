// Stackable bottom sheets that close via history (back button), [data-close], or dragging [data-drag] down.
import { closest } from '../shared/dom.js';
import { goBack, pushBack } from './back.js';
import { confirmDiscard } from './discard.js';

const DRAG_START_PX = 8; // below this it's still a tap
const CLOSE_DISTANCE_PX = 110;
const CLOSE_SPEED = 0.6; // px/ms: a quick flick closes even when short

let open = 0;
const stack = [];
let pageY = 0;

function lockPage() {
  pageY = window.scrollY;
  document.body.style.top = `-${pageY}px`;
  document.body.classList.add('locked');
}

function unlockPage() {
  document.body.classList.remove('locked');
  document.body.style.top = '';
  window.scrollTo(0, pageY);
}

function enableDragToClose(panel, close) {
  let drag = null;
  let justDragged = false;

  panel.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || !closest(e, '[data-drag]')) return;
    drag = { id: e.pointerId, startY: e.clientY, startTime: e.timeStamp, moved: false, dy: 0 };
  });

  panel.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = Math.max(0, e.clientY - drag.startY);
    if (!drag.moved) {
      if (dy < DRAG_START_PX) return;
      drag.moved = true;
      try {
        panel.setPointerCapture(e.pointerId);
      } catch {
        // pointer already gone; the drag still works over the sheet
      }
      panel.classList.add('dragging');
      /** @type {HTMLElement} */ (document.activeElement)?.blur?.(); // dismiss the keyboard
    }
    drag.dy = dy;
    panel.style.transform = `translateY(${dy}px)`;
  });

  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved, dy, startTime } = drag;
    drag = null;
    if (!moved) return;
    justDragged = true; // swallow the click that follows
    panel.classList.remove('dragging');
    const speed = dy / Math.max(1, e.timeStamp - startTime);
    if (dy > CLOSE_DISTANCE_PX || speed > CLOSE_SPEED) {
      panel.style.transform = 'translateY(100%)';
      close();
    } else {
      panel.style.transform = '';
    }
  }
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', end);

  panel.addEventListener('click', (e) => {
    if (!justDragged) return;
    justDragged = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
}

/**
 * @param {HTMLElement} layer
 * @param {{ onClose?: () => void, hasChanges?: () => boolean }} [options]
 *   hasChanges: when true, closing asks before discarding them (js/ui/discard.js)
 */
export function createSheet(layer, { onClose, hasChanges } = {}) {
  const panel = /** @type {HTMLElement} */ (layer.querySelector('.sheet'));
  let isOpen = false;
  let closing = false; // history.back() is async; guard against a double goBack
  let asking = false;

  /** Asks before discarding unsaved changes; true when it's fine to close. */
  async function mayClose() {
    if (!hasChanges?.()) return true;
    asking = true;
    const discard = await confirmDiscard();
    asking = false;
    if (!discard) panel.style.transform = ''; // a swipe that was cancelled springs back
    return discard;
  }

  function hide() {
    if (!closing && hasChanges?.()) {
      // the back button: history has already gone back, so put the sheet's entry back while asking (after back.js
      // has finished running its handlers, or it would run this one again)
      setTimeout(() => pushBack(hide), 0);
      if (!asking) {
        mayClose().then((discard) => {
          if (!discard) return;
          closing = true;
          goBack();
        });
      }
      return;
    }
    isOpen = false;
    closing = false;
    stack.splice(stack.indexOf(sheet), 1);
    if (--open === 0) unlockPage();
    layer.classList.remove('open');
    const done = () => {
      if (isOpen) return;
      layer.hidden = true;
      panel.style.transform = '';
    };
    panel.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 400); // transitionend may never fire
    onClose?.();
  }

  const sheet = {
    get isOpen() {
      return isOpen;
    },

    open() {
      if (isOpen) return;
      isOpen = true;
      if (open++ === 0) lockPage();
      stack.push(sheet);
      pushBack(hide);
      panel.style.transform = '';
      layer.hidden = false;
      for (const body of panel.querySelectorAll('.sheet-body')) body.scrollTop = 0; // not where it was last time
      void panel.offsetHeight; // force reflow so it slides in
      layer.classList.add('open');
    },

    /**
     * Goes through history so open()'s entry is popped too. Asks first when there are unsaved changes, unless
     * `force` (after saving or deleting).
     */
    async close({ force = false } = {}) {
      if (!isOpen || closing || asking) return;
      if (!force && !(await mayClose())) return;
      closing = true;
      goBack();
    },
  };

  layer.addEventListener('click', (e) => {
    if (closest(e, '[data-close]')) sheet.close();
  });
  enableDragToClose(panel, () => sheet.close());

  return sheet;
}

export function closeTopSheet() {
  stack.at(-1)?.close();
}
