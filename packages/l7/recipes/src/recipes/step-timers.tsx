const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')

const DURATION = /(\d+(?:\.\d+)?)(?:\s*(?:–|-|to)\s*(\d+(?:\.\d+)?))?\s*(minutes?|mins?|hours?|hrs?)\b/gi
/** Times written in a step ("bake 13–15 minutes") become timers set to the shorter end of the range. */
export function stepTimers(html: string): { label: string; minutes: number }[] {
  const seen = new Set<string>()
  return [...plain(html).matchAll(DURATION)].flatMap((match) => {
    const hours = /^h/i.test(match[3])
    const minutes = Number(match[1]) * (hours ? 60 : 1)
    const label = `${match[1]}${match[2] ? `–${match[2]}` : ''} ${hours ? 'hr' : 'min'}`
    if (!minutes || seen.has(label)) return []
    seen.add(label)
    return [{ label, minutes }]
  })
}

