// Dashboard SVG charts, drawn at display size so text stays the same size on any screen.
import { $, escapeHtml } from '../shared/dom.js';
import { emoji } from '../ui/emoji.js';

const PAD = { top: 20, right: 6, bottom: 22, left: 36 };

/** Rounds up to 1, 2, 2.5, 5 or 10 × 10^n. */
export function niceMax(max) {
  if (!(max > 0)) return 1;
  const exp = 10 ** Math.floor(Math.log10(max));
  const f = max / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

const r1 = (n) => Math.round(n * 10) / 10;

/** Rounded top, square bottom. */
function columnPath(x, base, w, h) {
  const r = Math.min(4, h, w / 2);
  const top = base - h;
  return `M${r1(x)},${r1(base)}V${r1(top + r)}Q${r1(x)},${r1(top)} ${r1(x + r)},${r1(top)}H${r1(x + w - r)}`
    + `Q${r1(x + w)},${r1(top)} ${r1(x + w)},${r1(top + r)}V${r1(base)}Z`;
}

/** Thins x labels so they don't overlap. */
const labelStep = (count, plotWidth, labelWidth = 46) => Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotWidth / labelWidth))));

function grid(width, plotH, top, format) {
  const left = PAD.left;
  return [0, 0.5, 1].map((f) => {
    const y = r1(PAD.top + plotH * (1 - f));
    return `<line class="${f === 0 ? 'baseline' : 'grid'}" x1="${left}" x2="${width - PAD.right}" y1="${y}" y2="${y}"/>`
      + `<text x="${left - 7}" y="${y + 4}" text-anchor="end">${escapeHtml(format(top * f))}</text>`;
  }).join('');
}

/**
 * Stacked when there's more than one series.
 * @param {{ width: number, height?: number, items: { label: string, values: number[], tip: string }[],
 *   series: { name: string, color: string }[], axis(value: number): string, valueLabel(value: number): string }} options
 *   values: one per series, bottom first; valueLabel: shown on the tallest column
 */
export function columnChart({ width, height = 160, items, series, axis, valueLabel }) {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const totals = items.map((i) => i.values.reduce((sum, v) => sum + v, 0));
  const max = Math.max(0, ...totals);
  const top = niceMax(max);
  const band = plotW / items.length;
  const barW = Math.max(3, Math.min(24, band * 0.62));
  const base = PAD.top + plotH;
  const step = labelStep(items.length, plotW);
  const tallest = totals.indexOf(max);

  const marks = items.map((item, i) => {
    const x0 = PAD.left + i * band;
    const x = x0 + (band - barW) / 2;
    const parts = item.values.map((v, k) => ({ h: (v / top) * plotH, color: series[k].color })).filter((p) => p.h > 0);
    let y = base;
    const bars = parts.map((part, k) => {
      const h = Math.max(part.h, 2);
      y -= h;
      // only the top part is rounded; lower parts end 2px short to leave a gap
      return k === parts.length - 1
        ? `<path d="${columnPath(x, y + h, barW, h)}" style="fill:${part.color}" pointer-events="none"/>`
        : `<rect x="${r1(x)}" y="${r1(y + 2)}" width="${r1(barW)}" height="${r1(Math.max(h - 2, 1))}" style="fill:${part.color}" pointer-events="none"/>`;
    }).join('');
    const hit = `<rect class="hit" x="${r1(x0)}" y="${PAD.top}" width="${r1(band)}" height="${plotH}" data-tip="${escapeHtml(item.tip)}"/>`;
    const label = (items.length - 1 - i) % step === 0
      ? `<text x="${r1(x0 + band / 2)}" y="${height - 6}" text-anchor="middle">${escapeHtml(item.label)}</text>` : '';
    const value = i === tallest && max > 0
      ? `<text class="value-label" x="${r1(x0 + band / 2)}" y="${r1(y - 6)}" text-anchor="middle">${escapeHtml(valueLabel(totals[i]))}</text>` : '';
    return hit + bars + label + value;
  }).join('');

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">${grid(width, plotH, top, axis)}${marks}</svg>`;
  return series.length > 1 ? svg + legend(series) : svg;
}

export const legend = (series, { line = false } = {}) =>
  `<ul class="legend">${series.map((s) => `<li><span class="swatch${line ? ' line' : ''}" style="background:${s.color}"></span>${escapeHtml(s.name)}</li>`).join('')}</ul>`;

/**
 * Evenly spaced points; all series share one axis.
 * @param {{ width: number, height?: number, points: { tip: string, values: (number | null)[] }[],
 *   series: { name: string, color: string }[] }} options
 */
export function lineChart({ width, height = 180, points, series }) {
  const plotW = width - PAD.left - PAD.right - 30; // room for end labels
  const plotH = height - PAD.top - PAD.bottom;
  const all = points.flatMap((p) => p.values).filter((v) => v != null);
  const lo = Math.floor((Math.min(...all) - 5) / 10) * 10;
  const hi = Math.ceil((Math.max(...all) + 5) / 10) * 10;
  const x = (i) => PAD.left + 8 + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * (plotW - 16));
  const y = (v) => PAD.top + plotH * (1 - (v - lo) / (hi - lo));

  const gridLines = [0, 0.5, 1].map((f) => {
    const value = lo + (hi - lo) * f;
    const yy = r1(y(value));
    return `<line class="${f === 0 ? 'baseline' : 'grid'}" x1="${PAD.left}" x2="${width - PAD.right}" y1="${yy}" y2="${yy}"/>`
      + `<text x="${PAD.left - 7}" y="${yy + 4}" text-anchor="end">${Math.round(value)}</text>`;
  }).join('');

  const showDots = points.length <= 24;
  const ends = [];
  const lines = series.map((s, k) => {
    const pts = points.map((p, i) => (p.values[k] == null ? null : [x(i), y(p.values[k]), p.values[k]])).filter(Boolean);
    if (!pts.length) return '';
    const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${r1(px)},${r1(py)}`).join('');
    const dots = (showDots ? pts : [pts.at(-1)]).map(([px, py]) =>
      `<circle cx="${r1(px)}" cy="${r1(py)}" r="4" style="fill:${s.color};stroke:var(--surface)" stroke-width="2" pointer-events="none"/>`).join('');
    const [ex, ey, ev] = pts.at(-1);
    ends.push({ x: ex, y: ey, value: ev });
    return `<path d="${d}" style="fill:none;stroke:${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>${dots}`;
  }).join('');

  // skip end labels if they'd overlap; tooltips still show the values
  const apart = ends.every((a, i) => ends.every((b, j) => i === j || Math.abs(a.y - b.y) >= 14));
  const endLabels = apart
    ? ends.map((e) => `<text class="value-label" x="${r1(e.x + 9)}" y="${r1(e.y + 4)}">${e.value}</text>`).join('') : '';

  const band = points.length === 1 ? plotW : (plotW - 16) / (points.length - 1);
  const hits = points.map((p, i) =>
    `<rect class="hit" x="${r1(x(i) - band / 2)}" y="${PAD.top}" width="${r1(band)}" height="${plotH}" data-tip="${escapeHtml(p.tip)}"/>`).join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">${gridLines}${lines}${endLabels}${hits}</svg>`;
}

/**
 * Horizontal parts-of-a-whole bar with a legend.
 * @param {{ width: number, parts: { name: string, emoji?: string, count: number, color: string, light?: boolean,
 *   tip: string }[] }} options
 *   light: light fill, so the text on it is dark
 */
export function splitBar({ width, parts }) {
  const total = parts.reduce((sum, p) => sum + p.count, 0);
  const shown = parts.filter((p) => p.count > 0);
  const gaps = (shown.length - 1) * 2;
  const blocks = shown.map((p) => {
    const share = Math.round((p.count / total) * 100);
    const text = `${share}%`;
    const fits = ((width - gaps) * p.count) / total >= text.length * 7.5 + 14;
    return `<div class="split-part ${p.light ? 'light-fill' : 'dark-fill'}" style="flex-grow:${p.count};background:${p.color}"
      data-tip="${escapeHtml(`${p.tip}\n${p.count} of ${total} · ${share}%`)}">${fits ? text : ''}</div>`;
  }).join('');
  const legend = parts.map((p) =>
    `<li><span class="swatch" style="background:${p.color}"></span>${p.emoji ? emoji(p.emoji) : ''}${escapeHtml(p.name)} <span class="count">${p.count}</span></li>`).join('');
  return `<div class="split" role="img" aria-label="${escapeHtml(parts.map((p) => `${p.name}: ${p.count}`).join(', '))}">${blocks}</div>
    <ul class="legend">${legend}</ul>`;
}

/**
 * Hover tooltips for [data-tip] on mouse; tap to show on touch.
 * @param {HTMLElement} root
 */
export function wireTooltips(root) {
  const tip = $('chartTip');
  let target = null;

  function show(el, clientX, clientY) {
    target = el;
    const [first, ...rest] = el.dataset.tip.split('\n');
    tip.innerHTML = `<b>${escapeHtml(first)}</b>${rest.length ? `\n${escapeHtml(rest.join('\n'))}` : ''}`;
    tip.hidden = false;
    const { width, height } = tip.getBoundingClientRect();
    const left = Math.min(Math.max(8, clientX - width / 2), innerWidth - width - 8);
    const top = clientY - height - 14 < 8 ? clientY + 18 : clientY - height - 14;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  function hide() {
    target = null;
    tip.hidden = true;
  }

  root.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = /** @type {Element} */ (e.target).closest('[data-tip]');
    if (el instanceof HTMLElement || el instanceof SVGElement) show(/** @type {any} */ (el), e.clientX, e.clientY);
    else if (target) hide();
  });
  root.addEventListener('pointerleave', hide);
  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const el = /** @type {Element} */ (e.target).closest('[data-tip]');
    if (el) show(/** @type {any} */ (el), e.clientX, e.clientY);
  });
  document.addEventListener('pointerdown', (e) => {
    if (target && !root.contains(/** @type {Node} */ (e.target))) hide();
  });
  window.addEventListener('scroll', hide, { passive: true });
}
