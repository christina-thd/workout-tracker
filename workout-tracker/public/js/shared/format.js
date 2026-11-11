// Display formatting for numbers, money and days.

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "45m", "1h 30m", "2h". */
export function duration(minutes) {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

export const hours = (minutes) => Math.round((minutes / 60) * 10) / 10;

const moneyFormats = new Map();
/**
 * Whole amounts drop the cents: "€12", "€12.50".
 * @param {number} amount
 * @param {string} currency  ISO code, e.g. EUR
 */
export function money(amount, currency) {
  const whole = Number.isInteger(amount);
  const key = `${currency}:${whole}`;
  if (!moneyFormats.has(key)) {
    try {
      moneyFormats.set(key, new Intl.NumberFormat(undefined, {
        style: 'currency', currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2,
      }));
    } catch {
      moneyFormats.set(key, { format: (n) => `${n.toFixed(whole ? 0 : 2)} ${currency}` });
    }
  }
  return moneyFormats.get(key).format(amount);
}

export function currencySymbol(currency) {
  try {
    const parts = new Intl.NumberFormat(undefined, { style: 'currency', currency }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/** Local midnight; `new Date('YYYY-MM-DD')` would be UTC. */
export function dayDate(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Today", "Yesterday", "Tue 4 Nov"; the year only when it differs. */
export function dayLabel(day, today) {
  if (day === today) return 'Today';
  const date = dayDate(day);
  const yesterday = dayDate(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** 7 Nov; with the year when it isn't this year's. */
export function shortDay(day, today) {
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return dayDate(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

export const monthLabel =(day) => dayDate(day).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** 950, 1.2K, 12K. */
export function compact(value) {
  if (Math.abs(value) < 10000) return String(Math.round(value * 10) / 10);
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
