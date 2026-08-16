/**
 * Display formatting.
 *
 * `humanizeMinutes` and `formatYield` are exact ports of `formatTime` and
 * `formatYield` from the original site's `features/recipes/lib/recipes.ts`.
 * Keep them byte-compatible: `formatTime` keeps minutes alongside days
 * ("4 days 4 hr 37 min") and `formatYield` does not pluralize ("2 16-inch
 * pizza"). Changing either breaks visual parity with the original rendering.
 */

/** `breakfast_and_brunch` -> `Breakfast & Brunch`, matching the label maps. */
export function labelize(value: string): string {
  if (!value) return ''
  return String(value)
    .split('_')
    .map((word) => (word === 'and' ? '&' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

/** Port of formatTime(). Minutes are kept even when days are present. */
export function humanizeMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return ''
  const days = Math.floor(minutes / 1440)
  const hrs = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60

  const parts: string[] = []
  if (days > 0) parts.push(days === 1 ? '1 day' : `${days} days`)
  if (hrs > 0) parts.push(hrs === 1 ? '1 hr' : `${hrs} hr`)
  if (mins > 0) parts.push(`${mins} min`)
  return parts.join(' ')
}

/** Port of formatYield(). Deliberately does not pluralize the unit. */
export function formatYield(amount: number | null | undefined, unit: string): string {
  const a = String(amount ?? '').trim()
  const u = String(unit ?? '').trim()
  if (!a && !u) return ''
  if (!a) return u
  if (!u) return a
  return `${a} ${u}`
}

/** Minutes -> an ISO 8601 duration, for schema.org Recipe timings. */
export function isoDuration(minutes: number | null | undefined): string | undefined {
  if (minutes == null || minutes <= 0) return undefined
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `PT${hrs > 0 ? `${hrs}H` : ''}${mins > 0 ? `${mins}M` : ''}`
}

/** Markdown was rendered at build time; search and JSON-LD want it plain. */
export const stripTags = (html: string) => html.replace(/<[^>]*>/g, '')
