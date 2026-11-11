import { foldGroups, sourdoughTimeline, targetRisePercent, type SourdoughProcess } from '@eat-yeet/l2-recipe-domain/sourdough-process'
import type { Section } from '@eat-yeet/l4-content-model/recipes'

export interface SourdoughProcessSections {
  autolyse: string
  bulk: string
  levain: string
  /** Optional: the Shape section the time rail replaces; its last item is the refrigerate instruction. */
  shape?: string | null
}

export interface SpiralMixerProfile {
  name: string
  initialRpm: number
  initialMinutes: [number, number]
  targetTemperatureF: number
  saltRpm: number
  saltMinutes: number
  finishRpm: number
  finishMinutes: number
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}:${String(remainder).padStart(2, '0')}h` : `${hours}h`
}

/**
 * The plugin replaces explicitly bound sections; it never guesses from prose.
 * Autolyse and fermentolyse are optional: a zero-minute rest removes its step
 * and folds its mixing into the neighboring step. Bulk steps carry their
 * elapsed times as structured `itemTimes` for the recipe's time rail.
 */
export function resolveSourdoughSteps(sections: Section[], bindings: SourdoughProcessSections, process: SourdoughProcess, levainIngredients?: string, mixer?: SpiralMixerProfile): Section[] {
  const hand = process.mixingMethod === 'hand'
  const autolyse = process.autolyseMinutes > 0
  const fermentolyse = process.saltDelayMinutes > 0
  const timeline = sourdoughTimeline(process)
  const initialMix = hand ? 'by hand until no dry flour remains.' : mixer
    ? `using cool water in the ${mixer.name} at ${mixer.initialRpm} RPM for about ${mixer.initialMinutes[0]}–${mixer.initialMinutes[1]} min, until the dough reaches ${mixer.targetTemperatureF}°F.`
    : 'in a spiral mixer until no dry flour remains.'
  const levainMix = hand ? 'by hand, squeezing and folding until evenly incorporated.' : mixer
    ? `in the ${mixer.name} at ${mixer.initialRpm} RPM until evenly incorporated.`
    : 'in a spiral mixer until evenly incorporated.'
  const saltMix = hand ? 'Pinch and fold by hand until incorporated and the dough starts to gain strength.' : mixer
    ? `Mix at ${mixer.saltRpm} RPM for ${mixer.saltMinutes} min while the fine sea salt incorporates, then increase to ${mixer.finishRpm} RPM for about ${mixer.finishMinutes} min.`
    : 'Mix to incorporate, then continue until the dough gains moderate strength.'
  const temperature = process.bulkTemperatureF
  const bench = process.benchMinutes ?? 0
  const fridge = process.bulkMinutes + bench
  const preshape = process.preshapeMinutes ?? 0
  const split = bench > 0 && process.preshapeMinutes != null && preshape > 0 && preshape < bench
  const shapeSection = bindings.shape ? sections.find((section) => section.id === bindings.shape) : undefined
  const refrigerate = shapeSection?.items.at(-1)
  const rise = temperature ? `about ${targetRisePercent(temperature)}% rise in volume` : 'the recipe’s target rise'
  const salt = 'Add fine sea salt and the remaining water ({{remainingWaterGrams}}).'
  const firstStep = autolyse
    ? fermentolyse ? `Mix in the ripe levain ${levainMix}` : `Mix in the ripe levain ${levainMix} ${salt} ${saltMix}`
    : fermentolyse ? `Mix the flour, the first portion of water ({{initialWaterGrams}}) and the ripe levain ${initialMix}`
    : `Mix the flour, all of the water ({{addedWaterGrams}}), the ripe levain and fine sea salt ${initialMix} ${saltMix}`
  const steps = timeline.filter((event) => fermentolyse || event.kind !== 'salt').map((event) => {
    if (event.kind === 'mix') return { id: event.id, atMinutes: 0, emphasis: true, text: firstStep }
    if (event.kind === 'salt') return { id: event.id, atMinutes: event.atMinutes, emphasis: true, text: `${salt} ${saltMix}` }
    if (event.kind === 'fold') return {
      id: event.id, atMinutes: event.atMinutes, emphasis: false,
      text: event.method === 'lamination'
        ? 'Laminate the dough: gently stretch it into a thin sheet on a damp work surface without tearing, then fold it back over itself and return it to the bulk container.'
        : `Perform one set of ${event.method === 'coil-fold' ? 'coil folds' : 'stretch and folds'}, working gently around the dough.`,
    }
    return { id: event.id, atMinutes: event.atMinutes, emphasis: true, text: split
      ? `Divide into {{pieceCount}} {{pieceLabelPlural}} ({{pieceWeightGrams}} each) and preshape. Aim for ${rise} by the time the dough goes into the refrigerator, with good aeration and strength; divide earlier or later according to the dough.`
      : bench
      ? `Divide and shape. Aim for ${rise} by the time the dough goes into the refrigerator, with good aeration and strength; divide earlier or later according to the dough.`
      : `Divide, shape and refrigerate. Aim for ${rise} by now, with good aeration and strength; divide earlier or later according to the dough.` }
  })
  if (split) steps.push({ id: 'shape', atMinutes: process.bulkMinutes + preshape, emphasis: true, text: 'Shape and place in banneton.' })
  if (bench) steps.push({ id: 'into-refrigerator', atMinutes: fridge, emphasis: true, text: refrigerate ?? 'Cover and place in the refrigerator. Bulk fermentation ends here.' })
  const rest = (from: number, to: number, index: number) => {
    if (steps[index].id === 'end-bulk' && !split) return `Preshape and shaping rests: ${formatDuration(to - from)}.`
    if (steps[index].id === 'end-bulk' || steps[index].id === 'shape') return `Rest${temperature ? ` at ${temperature}°F` : ''} for ${formatDuration(to - from)}.`
    return `Cover${temperature ? ` at ${temperature}°F` : ''} for ${formatDuration(to - from)}.`
  }
  return sections.flatMap((section) => {
    if (section.id === bindings.levain && levainIngredients) return [{
      ...section, items: [`Mix ${levainIngredients}.`, ...section.items.slice(1)],
    }]
    if (section.id === bindings.autolyse) return autolyse ? [{
      ...section, title: 'Autolyse', itemIds: ['autolyse-water'], itemUses: undefined,
      items: [`Mix flour and the first portion of water ({{initialWaterGrams}}) ${initialMix} Cover and rest for ${formatDuration(process.autolyseMinutes)} before mixing in the levain.`],
    }] : []
    if (shapeSection && section.id === shapeSection.id) return []
    if (section.id !== bindings.bulk) return [section]
    return [{
      ...section,
      itemIds: steps.map((step) => step.id),
      items: steps.map((step) => step.text),
      // Generated steps keep the uses of an authored step with the same ID.
      itemUses: section.itemUses ? steps.map((step) => section.itemUses?.[section.itemIds.indexOf(step.id)] ?? []) : undefined,
      timeOrigin: 'Time since mixing in the levain',
      itemTimes: steps.map((step, index) => {
        const next = steps[index + 1]
        return { label: formatDuration(step.atMinutes), minutes: step.atMinutes, emphasis: step.emphasis, ...(next ? { rest: rest(step.atMinutes, next.atMinutes, index) } : {}) }
      }),
    }]
  })
}

export interface ScheduleRow { id: string; time: string; label: string; problem?: string }

const FOLD_NAMES = { 'stretch-and-fold': ['stretch and fold', 'stretch and folds'], 'coil-fold': ['coil fold', 'coil folds'], lamination: ['lamination', 'laminations'] } as const

/** The bake at a glance, for the result panel: rests, fold groups, divide and refrigerator. */
export function sourdoughSchedule(process: SourdoughProcess): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  if (process.autolyseMinutes > 0) rows.push({ id: 'autolyse', time: 'Before', label: `Autolyse, ${formatDuration(process.autolyseMinutes)}` })
  rows.push({ id: 'mix', time: '0m', label: process.saltDelayMinutes > 0 ? 'Mix in the levain' : 'Mix in the levain and salt' })
  if (process.saltDelayMinutes > 0) rows.push({ id: 'salt', time: formatDuration(process.saltDelayMinutes), label: 'Salt and remaining water' })
  let start = 0
  for (const [index, group] of foldGroups(process).groups.entries()) {
    const folds = process.folds.slice(start, start + group.count)
    start += group.count
    const last = folds.at(-1)!.atMinutes
    const name = FOLD_NAMES[group.method][group.count === 1 ? 0 : 1]
    rows.push({
      id: `folds-${index}`, time: formatDuration(folds[0].atMinutes),
      label: group.count === 1 ? `1 × ${name}` : `${group.count} × ${name}, every ${formatDuration(group.everyMinutes)}`,
      ...(last >= process.bulkMinutes ? { problem: `The last fold is at ${formatDuration(last)}, after dividing at ${formatDuration(process.bulkMinutes)}. Remove a set or start earlier.` } : {}),
    })
  }
  const bench = process.benchMinutes ?? 0
  const preshape = process.preshapeMinutes ?? 0
  const split = bench > 0 && preshape > 0 && preshape < bench
  rows.push({ id: 'divide', time: formatDuration(process.bulkMinutes), label: split ? 'Divide and preshape' : bench ? 'Divide, preshape and shape' : 'Divide, shape and refrigerate' })
  if (split) rows.push({ id: 'shape', time: formatDuration(process.bulkMinutes + preshape), label: 'Shape' })
  if (bench) rows.push({ id: 'fridge', time: formatDuration(process.bulkMinutes + bench), label: split ? 'Stitch and refrigerate' : 'Into the refrigerator' })
  return rows
}
