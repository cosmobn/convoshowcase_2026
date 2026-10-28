/** A small accessible pie chart for quiz answers, rendered as an HTML string. */
// Categorical colours in fixed order, validated (scripts in the dataviz guide) for colour-blind
// separation on the dark glass panel, including the first/last pair that meet around the pie.
export const PIE_COLORS = ['#3987E5', '#D95926', '#199E70', '#C98500', '#D55181'];
// "None of these" is a neutral grey, never a series colour.
export const PIE_NONE = '#8B8A82';
const SURFACE = '#2A3361';
const SIZE = 168;
const R = SIZE / 2;

const point = turn => [R + R * Math.sin(turn * 2 * Math.PI), R - R * Math.cos(turn * 2 * Math.PI)].map(value => value.toFixed(2));

/** `slices` is [{ key, label, value, color }]; colour follows the entity, never its rank. */
export function pieChart({ slices, label, esc }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const percent = value => Math.round(value / total * 100);
  const describe = slice => `${slice.label}: ${slice.value} of ${total} (${percent(slice.value)}%)`;
  const shapes = slices.filter(slice => slice.value > 0).reduce((list, slice) => {
    const start = list.at(-1)?.end ?? 0;
    return [...list, { slice, start, end: start + slice.value / total }];
  }, []);
  const marks = shapes.map(({ slice, start, end }) => {
    const attrs = `class="pie-slice" data-pie-key="${esc(slice.key)}" fill="${slice.color}" stroke="${SURFACE}" stroke-width="2"`;
    if (end - start >= 1) return `<circle ${attrs} cx="${R}" cy="${R}" r="${R - 1}"><title>${esc(describe(slice))}</title></circle>`;
    const [x1, y1] = point(start), [x2, y2] = point(end);
    return `<path ${attrs} d="M${R} ${R}L${x1} ${y1}A${R} ${R} 0 ${end - start > .5 ? 1 : 0} 1 ${x2} ${y2}Z"><title>${esc(describe(slice))}</title></path>`;
  }).join('');
  const legend = slices.map(slice => `<li data-pie-key="${esc(slice.key)}"><i style="background:${slice.color}" aria-hidden="true"></i><strong>${esc(slice.label)}</strong><span>${percent(slice.value)}% · ${slice.value} of ${total}</span></li>`).join('');
  return `<div class="pie-chart"><svg class="pie-svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="${esc(`${label}: ${slices.map(describe).join(', ')}`)}">${marks}</svg><ul class="pie-legend">${legend}</ul></div>`;
}

/** Highlights one slice and its legend row while the pointer is over either. */
export function highlightPie(event) {
  const target = event.target.closest?.('[data-pie-key]');
  const chart = event.target.closest?.('.pie-chart');
  if (!chart) return;
  const key = event.type === 'pointerover' && target ? target.dataset.pieKey : '';
  chart.classList.toggle('is-focused', !!key);
  for (const item of chart.querySelectorAll('[data-pie-key]')) item.classList.toggle('is-active', item.dataset.pieKey === key);
}
