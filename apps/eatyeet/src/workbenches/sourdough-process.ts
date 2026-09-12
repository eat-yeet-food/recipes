import { sourdoughTimeline, type SourdoughProcess } from '@eat-yeet/l2-recipe-domain/sourdough-process'
import type { Section } from '@eat-yeet/l4-content-model/recipes'

export interface SourdoughProcessSections {
  autolyse: string
  bulk: string
  levain: string
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}:${String(remainder).padStart(2, '0')}h` : `${hours}h`
}

/** The plugin replaces explicitly bound sections; it never guesses from prose. */
export function resolveSourdoughSteps(sections: Section[], bindings: SourdoughProcessSections, process: SourdoughProcess, levainIngredients?: string, mixer?: SpiralMixerProfile): Section[] {
  const hand = process.mixingMethod === 'hand'
  const timeline = sourdoughTimeline(process)
  const initialMix = hand ? 'by hand until no dry flour remains.' : mixer
    ? `using cool water in the ${mixer.name} at ${mixer.initialRpm} RPM for about ${mixer.initialMinutes[0]}–${mixer.initialMinutes[1]} min, until the dough reaches ${mixer.targetTemperatureF}°F.`
    : 'in a spiral mixer until no dry flour remains.'
  const levainMix = hand ? 'by hand, squeezing and folding until evenly incorporated' : mixer
    ? `in the ${mixer.name} at ${mixer.initialRpm} RPM until evenly incorporated`
    : 'in a spiral mixer until evenly incorporated'
  const saltMix = hand ? 'Pinch and fold by hand until incorporated and the dough starts to gain strength.' : mixer
    ? `Mix at ${mixer.saltRpm} RPM for ${mixer.saltMinutes} min while the fine sea salt incorporates, then increase to ${mixer.finishRpm} RPM for about ${mixer.finishMinutes} min.`
    : 'Mix to incorporate, then continue until the dough gains moderate strength.'
  return sections.map((section) => {
    if (section.id === bindings.levain && levainIngredients) return {
      ...section, items: [`Mix ${levainIngredients}.`, ...section.items.slice(1)],
    }
    if (section.id === bindings.autolyse) return {
      ...section, title: 'Autolyse', itemIds: ['autolyse-water'],
      items: [`Mix flour and the first portion of water ({{initialWaterGrams}}) ${initialMix} ${process.autolyseMinutes ? `Cover and rest for ${formatDuration(process.autolyseMinutes)} before starting bulk fermentation.` : 'Continue directly to mixing in the levain.'}`],
    }
    if (section.id !== bindings.bulk) return section
    return {
      ...section, itemIds: timeline.map((event) => event.id),
      items: timeline.map((event, index) => {
        const stamp = `<strong>[${formatDuration(event.atMinutes)} elapsed]</strong>`
        const next = timeline[index + 1]
        const rest = next ? ` Cover until the next step at ${formatDuration(next.atMinutes)} elapsed.` : ''
        if (event.kind === 'mix') return `${stamp} Mix in the ripe levain ${levainMix}.${rest}`
        if (event.kind === 'salt') return `${stamp} Add fine sea salt and the remaining water ({{remainingWaterGrams}}). ${saltMix}${rest}`
        if (event.kind === 'fold') {
          if (event.method === 'lamination') return `${stamp} Laminate the dough: gently stretch it into a thin sheet on a damp work surface without tearing, then fold it back over itself and return it to the bulk container.${rest}`
          return `${stamp} Perform one set of ${event.method === 'coil-fold' ? 'coil folds' : 'stretch and folds'}, working gently around the dough.${rest}`
        }
        return `${stamp} Check the dough for the recipe’s target rise (approximately doubled), aeration, and strength. This is your planned end of bulk fermentation; extend or shorten the rest according to the dough, then continue to shaping.`
      }),
    }
  })
}
