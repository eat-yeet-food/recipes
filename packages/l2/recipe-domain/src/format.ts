/**
 * Display formatting.
 *
 * Keep these display strings stable: `humanizeMinutes` keeps minutes alongside
 * days ("4 days 4 hr 37 min") and `formatYield` does not pluralize
 * ("2 16-inch pizza"). Changing either changes visible recipe copy.
 */

/** `breakfast_and_brunch` -> `Breakfast & Brunch`, matching the label maps. */
export function labelize(value: string): string {
  if (!value) return ''
  return String(value)
    .split('_')
    .map((word) => (word === 'and' ? '&' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

/**
 * Display times: a day or more shows whole days; shorter times round to the nearest 5 minutes.
 * Times under 5 minutes stay exact so short steps never read as zero.
 */
export function humanizeMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return ''
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    return days === 1 ? '1 day' : `${days} days`
  }
  const rounded = minutes < 5 ? minutes : Math.round(minutes / 5) * 5
  const hrs = Math.floor(rounded / 60)
  const mins = rounded % 60
  const parts: string[] = []
  if (hrs > 0) parts.push(`${hrs} hr`)
  if (mins > 0) parts.push(`${mins} min`)
  return parts.join(' ')
}

/** Deliberately does not pluralize the unit. */
export function formatYield(amount: number | string | null | undefined, unit: string): string {
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

const decodeEntities = (text: string) =>
  text.replace(/&(#\d+|#x[\da-f]+|amp|lt|gt|quot|apos);/gi, (entity, body: string) => {
    const name = body.toLowerCase()
    if (name === 'amp') return '&'
    if (name === 'lt') return '<'
    if (name === 'gt') return '>'
    if (name === 'quot') return '"'
    if (name === 'apos') return "'"
    const code = name.startsWith('#x')
      ? Number.parseInt(name.slice(2), 16)
      : Number.parseInt(name.slice(1), 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : entity
  })

/** Markdown was rendered at build time; search and JSON-LD want it plain. */
export const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, ''))
