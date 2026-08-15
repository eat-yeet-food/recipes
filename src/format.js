/**
 * Display formatting. Isomorphic — runs at build time and in the browser.
 *
 * `humanizeMinutes` and `formatYield` are exact ports of `formatTime` and
 * `formatYield` from the original site's
 * `features/recipes/lib/recipes.ts`. Keep them byte-compatible: the card and
 * detail headers are compared against the original rendering.
 */

/** `breakfast_and_brunch` -> `Breakfast & Brunch`, matching the label maps. */
export function labelize(value) {
  if (!value) return ''
  return String(value)
    .split('_')
    .map((word) => (word === 'and' ? '&' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

/** Port of formatTime(). Minutes are kept even when days are present. */
export function humanizeMinutes(minutes) {
  if (minutes == null || minutes <= 0) return ''
  const days = Math.floor(minutes / 1440)
  const hrs = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60

  const parts = []
  if (days > 0) parts.push(days === 1 ? '1 day' : `${days} days`)
  if (hrs > 0) parts.push(hrs === 1 ? '1 hr' : `${hrs} hr`)
  if (mins > 0) parts.push(`${mins} min`)
  return parts.join(' ')
}

/** Port of formatYield(). Deliberately does not pluralize the unit. */
export function formatYield(amount, unit) {
  const a = String(amount ?? '').trim()
  const u = String(unit ?? '').trim()
  if (!a && !u) return ''
  if (!a) return u
  if (!u) return a
  return `${a} ${u}`
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
