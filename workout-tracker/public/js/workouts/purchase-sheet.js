// Sheet for adding, editing and deleting a gear purchase.
import { sendAction } from '../shared/api.js';
import { $, closest, escapeHtml, numberValue } from '../shared/dom.js';
import { currencySymbol } from '../shared/format.js';
import { sportOf } from '../shared/sports.js';
import { isDate, localDate, MAX_COST } from '../shared/workouts.js';
import { emoji } from '../ui/emoji.js';
import { icon } from '../ui/icons.js';
import { createSheet } from '../ui/sheet.js';
import { tapTwice } from '../ui/tap-twice.js';
import { toast, toastError } from '../ui/toast.js';

/** @typedef {import('../shared/workouts.js').Purchase} Purchase */
/** @typedef {import('../shared/sports.js').Sport} Sport */

/** Copied back into addPurchase to undo a delete. */
const PURCHASE_FIELDS = ['personId', 'sport', 'date', 'item', 'category', 'cost', 'note'];

/** @param {{ getPurchases(): Purchase[], getCurrency(): string }} options */
export function createPurchaseSheet({ getPurchases, getCurrency }) {
  const form = $('purchaseForm');
  const item = /** @type {HTMLInputElement} */ ($('purchaseItem'));
  const cost = /** @type {HTMLInputElement} */ ($('purchaseCost'));
  const date = /** @type {HTMLInputElement} */ ($('purchaseDate'));
  const note = /** @type {HTMLTextAreaElement} */ ($('purchaseNote'));

  /** @type {Sport | null} */
  let sport = null;
  let personId = null;
  let purchaseId = null; // null: new
  let category = 'other';
  let busy = false;
  let opened = ''; // draft() when the sheet opened

  const draft = () => JSON.stringify([item.value, category, cost.value, date.value, note.value]);

  const sheet = createSheet($('purchaseLayer'), {
    onClose: () => /** @type {HTMLElement} */ (document.activeElement)?.blur?.(),
    hasChanges: () => draft() !== opened,
  });

  function renderCategories() {
    $('purchaseCategory').innerHTML = sport.gear.map((g) =>
      `<button type="button" class="chip${g.id === category ? ' selected' : ''}" role="radio" aria-checked="${g.id === category}"
        data-category="${g.id}">${escapeHtml(g.label)}</button>`).join('');
  }
  $('purchaseCategory').addEventListener('click', (e) => {
    const chip = closest(e, '[data-category]');
    if (!chip) return;
    category = chip.dataset.category;
    renderCategories();
  });

  function showError(message, field = null) {
    $('purchaseError').textContent = message;
    $('purchaseError').hidden = !message;
    if (field) {
      field.classList.add('invalid');
      field.focus();
    }
  }

  function collect() {
    for (const el of form.querySelectorAll('.invalid')) el.classList.remove('invalid');
    if (!item.value.trim()) return showError('What did you buy?', item), null;
    const money = numberValue(cost);
    if (money == null || !(money >= 0 && money <= MAX_COST)) return showError('How much did it cost?', cost), null;
    if (!isDate(date.value)) return showError('Pick the day you bought it.', date), null;
    showError('');
    return { date: date.value, item: item.value.trim(), category, cost: Math.round(money * 100) / 100, note: note.value.trim() };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const values = collect();
    if (!values) return;
    busy = true;
    try {
      if (purchaseId) {
        await sendAction({ type: 'editPurchase', purchaseId, ...values });
        sheet.close({ force: true });
        toast('Saved', { icon: 'check' });
      } else {
        const { purchaseId: created } = await sendAction({ type: 'addPurchase', personId, sport: sport.id, ...values });
        sheet.close({ force: true });
        toast(`Added ${values.item}`, {
          icon: 'check',
          action: { label: 'Undo', run: () => sendAction({ type: 'removePurchase', purchaseId: created }).catch(toastError) },
        });
      }
    } catch (err) {
      showError(err.message);
    } finally {
      busy = false;
    }
  });

  const remove = tapTwice($('purchaseDelete'), {
    ask: `${icon('trash')}<span>Tap again to delete</span>`,
    onConfirm: () => deletePurchase(),
  });
  async function deletePurchase() {
    const purchase = getPurchases().find((p) => p.id === purchaseId);
    if (!purchase) return;
    purchaseId = null;
    sheet.close({ force: true });
    try {
      await sendAction({ type: 'removePurchase', purchaseId: purchase.id });
      const again = Object.fromEntries(PURCHASE_FIELDS.map((key) => [key, purchase[key]]));
      toast(`Deleted ${purchase.item}`, {
        icon: 'trash',
        action: { label: 'Undo', run: () => sendAction({ type: 'addPurchase', ...again }).catch(toastError) },
      });
    } catch (err) {
      toastError(err);
    }
  }

  return {
    /**
     * @param {{ personId: string, sportId: string, purchaseId?: string | null }} options
     */
    open({ personId: who, sportId, purchaseId: id = null }) {
      const purchase = id ? getPurchases().find((p) => p.id === id) : null;
      sport = sportOf(purchase?.sport ?? sportId);
      if (!sport) return;
      personId = purchase?.personId ?? who;
      purchaseId = purchase?.id ?? null;
      category = purchase?.category ?? sport.gear[0].id;
      item.value = purchase?.item ?? '';
      cost.value = purchase ? String(purchase.cost) : '';
      date.value = purchase?.date ?? localDate();
      note.value = purchase?.note ?? '';
      for (const symbol of form.querySelectorAll('[data-currency]')) symbol.textContent = currencySymbol(getCurrency());
      $('purchaseTitle').innerHTML = `${emoji(sport.emoji)} ${escapeHtml(purchase ? 'Purchase' : `New ${sport.name.toLowerCase()} purchase`)}`;
      $('purchaseSave').textContent = purchase ? 'Save' : 'Add purchase';
      remove.reset();
      $('purchaseDelete').innerHTML = `${icon('trash')}<span>Delete</span>`;
      $('purchaseDelete').hidden = !purchase;
      showError('');
      renderCategories();
      sheet.open();
      opened = draft();
      if (!purchase) setTimeout(() => item.focus(), 320); // after the slide-in
    },

    /** It may have been deleted on another device. */
    refresh() {
      if (sheet.isOpen && purchaseId && !getPurchases().some((p) => p.id === purchaseId)) {
        purchaseId = null;
        sheet.close({ force: true });
      }
    },
  };
}
