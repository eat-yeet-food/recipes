import type { Section, StepUse } from '@eat-yeet/l4-content-model/blocks'
import { HAND_REST_MINUTES, type PizzaMixingMethod, type PizzaProcess } from '@eat-yeet/l2-recipe-domain/pizza-process'
import { formatDuration, type ScheduleRow } from './sourdough-process.ts'

/**
 * The authored items this resolver reads. Item IDs are stable source
 * identities; a recipe without them keeps its steps as written.
 */
const ITEMS = {
  chill: 'steps-1-item-1', combine: 'combine-dough', mix: 'steps-1-item-3', ball: 'steps-1-item-4',
  divide: 'divide-dough', refrigerate: 'steps-1-item-6', warmUp: 'steps-3-item-1',
}

export const PIZZA_MIXING_LABELS: Record<PizzaMixingMethod, string> = { spiral: 'Spiral mixer', 'food-processor': 'Food processor', hand: 'By hand' }

const CHILL = 'Fill a pitcher with water and ice and let it chill down. Weigh out the water only; keep the ice out of the dough.'
const BALL = 'Transfer the dough to your bench, knead a couple of times and form a ball. Place it in a bowl and cover with saran wrap.'

/**
 * Rewrites the dough steps onto a time rail counted from the start of
 * mixing, for the chosen mixing method (mixing to the bulk temperature), and
 * the bake-day warm-up to match the cold ferment.
 */
export function resolvePizzaSteps(steps: Section[], process: PizzaProcess): Section[] {
  const find = (id: string) => {
    for (const section of steps) {
      const index = section.itemIds.indexOf(id)
      if (index >= 0) return { section, text: section.items[index] }
    }
    return null
  }
  const dough = find(ITEMS.combine)
  const divide = find(ITEMS.divide)
  const refrigerate = find(ITEMS.refrigerate)
  if (!dough || !divide || !refrigerate || divide.section !== dough.section || refrigerate.section !== dough.section) return steps
  const text = (id: string) => find(id)?.text ?? ''
  // A rail step that merges authored steps uses everything they used.
  const usesOf = (...ids: string[]) => {
    const seen = new Map<string, StepUse>()
    for (const id of ids) {
      const index = dough.section.itemIds.indexOf(id)
      for (const use of dough.section.itemUses?.[index] ?? []) if (!seen.has(use.id)) seen.set(use.id, use)
    }
    return [...seen.values()]
  }
  const temperature = `${process.bulkTemperatureF}°F`
  const bulk = formatDuration(process.bulkMinutes)
  const days = `${process.coldDays} days`
  const fridge = text(ITEMS.refrigerate).replace(/refrigerator for [^.]*\./, `refrigerator for ${days}.`)

  const timed: { id: string; text: string; uses?: StepUse[]; time: { label: string; minutes: number; emphasis?: boolean; rest?: string } }[] = []
  if (process.mixingMethod === 'spiral') {
    timed.push({ id: ITEMS.combine, uses: usesOf(ITEMS.chill, ITEMS.combine, ITEMS.mix, ITEMS.ball), text: [text(ITEMS.chill), text(ITEMS.combine), text(ITEMS.mix).replace(/\b\d+\s*°?F\b/, temperature), text(ITEMS.ball).replace(/\s*Bulk ferment[^.]*\./, '')].filter(Boolean).join(' '),
      time: { label: '0m', minutes: 0, emphasis: true, rest: `Bulk ferment at ${temperature} for ${bulk}.` } })
  } else if (process.mixingMethod === 'food-processor') {
    timed.push({ id: ITEMS.combine, uses: usesOf(ITEMS.chill, ITEMS.combine, ITEMS.mix, ITEMS.ball), text: `Use ice-cold water with no ice in it. Add the {{mixingIngredients}} to a food processor fitted with the dough blade and run on high until the dough reaches about ${temperature}. ${BALL}`,
      time: { label: '0m', minutes: 0, emphasis: true, rest: `Bulk ferment at ${temperature} for ${bulk}.` } })
  } else {
    timed.push({ id: ITEMS.combine, uses: usesOf(ITEMS.chill, ITEMS.combine), text: `${CHILL} Stir the {{mixingIngredients}} together in a large bowl until no dry flour remains.`,
      time: { label: '0m', minutes: 0, emphasis: true, rest: `Cover and rest for ${formatDuration(HAND_REST_MINUTES)}.` } })
    timed.push({ id: ITEMS.mix, uses: usesOf(ITEMS.mix, ITEMS.ball), text: `Knead on an unfloured bench for 8–10 minutes, until smooth and about ${temperature}. Form a ball, place it in a bowl and cover with saran wrap.`,
      time: { label: formatDuration(HAND_REST_MINUTES), minutes: HAND_REST_MINUTES, rest: `Bulk ferment at ${temperature} for ${formatDuration(process.bulkMinutes - HAND_REST_MINUTES)}.` } })
  }
  timed.push({ id: ITEMS.divide, uses: usesOf(ITEMS.divide, ITEMS.refrigerate), text: `${divide.text} ${fridge}`, time: { label: bulk, minutes: process.bulkMinutes, emphasis: true } })

  const used = new Set([ITEMS.chill, ITEMS.combine, ITEMS.mix, ITEMS.ball, ITEMS.divide, ITEMS.refrigerate])
  // Anything else the author added to the dough section stays, before the rail.
  const extra = dough.section.items.map((item, index) => ({ item, id: dough.section.itemIds[index] })).filter(({ id }) => !used.has(id))
  return steps.map((section) => {
    if (section === dough.section) {
      if (extra.length) return section
      return { ...section, items: timed.map((step) => step.text), itemIds: timed.map((step) => step.id), itemUses: dough.section.itemUses ? timed.map((step) => step.uses ?? []) : undefined, itemTimes: timed.map((step) => step.time), timeOrigin: 'Time since you start mixing' }
    }
    const index = section.itemIds.indexOf(ITEMS.warmUp)
    if (index < 0) return section
    const items = [...section.items]
    items[index] = `The day you plan to bake, remove the dough from the refrigerator and let it come to room temperature for ${formatDuration(process.warmUpMinutes)}.`
    return { ...section, items }
  })
}

/** The bake at a glance, for the result panel. */
export function pizzaSchedule(process: PizzaProcess): ScheduleRow[] {
  const rows: ScheduleRow[] = [{ id: 'mix', time: '0m', label: process.mixingMethod === 'hand' ? 'Mix by hand, then rest' : `Mix in the ${process.mixingMethod === 'spiral' ? 'spiral mixer' : 'food processor'}` }]
  if (process.mixingMethod === 'hand') rows.push({ id: 'knead', time: formatDuration(HAND_REST_MINUTES), label: 'Knead and ball' })
  rows.push({ id: 'divide', time: formatDuration(process.bulkMinutes), label: `Divide, ball and refrigerate ${process.coldDays} days` })
  rows.push({ id: 'warm-up', time: `Day ${process.coldDays + 1}`, label: `Out of the refrigerator ${formatDuration(process.warmUpMinutes)} before baking` })
  return rows
}
