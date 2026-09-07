import { sourdoughTimeline, type SourdoughProcess } from '@eat-yeet/l2-recipe-domain/sourdough-process'
import type { Section } from '@eat-yeet/l4-content-model/recipes'

export interface SourdoughProcessSections {
  autolyse: string
  bulk: string
  levain: string
}

/** The plugin replaces explicitly bound sections; it never guesses from prose. */
export function resolveSourdoughSteps(sections: Section[], bindings: SourdoughProcessSections, process: SourdoughProcess, levainIngredients?: string): Section[] {
  const hand = process.mixingMethod === 'hand'
  const timeline = sourdoughTimeline(process)
  return sections.map((section) => {
    if (section.id === bindings.levain && levainIngredients) return {
      ...section, items: [`Mix ${levainIngredients}.`, ...section.items.slice(1)],
    }
    if (section.id === bindings.autolyse) return {
      ...section, title: 'Autolyse', itemIds: ['autolyse-water'],
      items: [`Mix flour and the first portion of water ({{initialWaterGrams}}) ${hand ? 'by hand' : 'in a spiral mixer on low speed'} until no dry flour remains. ${process.autolyseMinutes ? `Cover and rest for ${process.autolyseMinutes} min before starting bulk fermentation.` : 'Continue directly to mixing in the levain.'}`],
    }
    if (section.id !== bindings.bulk) return section
    return {
      ...section, itemIds: timeline.map((event) => event.id),
      items: timeline.map((event, index) => {
        const stamp = `<strong>[${event.atMinutes} min elapsed]</strong>`
        const next = timeline[index + 1]
        const rest = next ? ` Cover until the next step at ${next.atMinutes} min elapsed.` : ''
        if (event.kind === 'mix') return `${stamp} Mix in the ripe levain ${hand ? 'by hand, squeezing and folding until evenly incorporated' : 'in a spiral mixer on low speed until evenly incorporated'}.${rest}`
        if (event.kind === 'salt') return `${stamp} Add salt and the remaining water ({{remainingWaterGrams}}). ${hand ? 'Pinch and fold by hand until incorporated and the dough starts to gain strength.' : 'Mix on low speed to incorporate, then medium speed until the dough gains moderate strength.'}${rest}`
        if (event.kind === 'fold') return `${stamp} Perform one set of ${process.foldMethod === 'coil-fold' ? 'coil folds' : 'stretch and folds'}, working gently around the dough.${rest}`
        return `${stamp} Check the dough for the recipe’s target rise (approximately doubled), aeration, and strength. This is your planned end of bulk fermentation; extend or shorten the rest according to the dough, then continue to shaping.`
      }),
    }
  })
}
