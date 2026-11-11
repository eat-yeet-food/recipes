import 'server-only'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
import { authoredRecipe } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { recipeFactItems } from '@eat-yeet/l7-recipes/recipes/recipe-fact-items'
import { INGREDIENT_AMOUNT, stepNeeds } from '@eat-yeet/l7-recipes/recipes/step-needs'
import { stepTimers } from '@eat-yeet/l7-recipes/recipes/step-timers'
import type { RecipeBlock, Section } from '@eat-yeet/l4-content-model/blocks'
import type { AppImage, AppRecipeDetail, AppRecipeIndex, AppRecipeSummary } from '@eat-yeet/l3-app-api/types'
import { formatYield, humanizeMinutes } from '@eat-yeet/l2-recipe-domain/format'
import { deliveryMedia, publicMedia, services, siteData } from './cms'

/**
 * The iOS app API (`/api/public/app/v1`). It returns fully resolved view models: the
 * app renders them and never re-implements recipe, calculator or plugin logic.
 * Contract: packages/l3/app-api/openapi.yaml. Read-only, public, no member data.
 */
export const APP_API_HEADERS = { 'Cache-Control': 'no-store' }

async function imagesFor(names: string[], origin: string): Promise<Record<string, AppImage>> {
  const media = deliveryMedia(await publicMedia())
  const absolute = (url: string) => new URL(url, origin).href
  const out: Record<string, AppImage> = {}
  for (const name of new Set(names.filter(Boolean))) {
    const manifest = media['/images/' + name]
    if (manifest) out[name] = { ...manifest, url: absolute(manifest.url), variants: manifest.variants.map((v: any) => ({ ...v, url: absolute(v.url) })) }
  }
  return out
}

const summary = (recipe: any): AppRecipeSummary => ({
  slug: recipe.slug, title: recipe.title, description: recipe.description ?? '', category: recipe.category ?? '',
  image: recipe.image ?? '', totalLabel: recipe.totalLabel ?? '', prepLabel: recipe.prepLabel ?? '', cookLabel: recipe.cookLabel ?? '',
  timeLabel: recipe.totalLabel || humanizeMinutes(recipe.totalMinutes) || '', yieldLabel: formatYield(recipe.yieldAmount, recipe.yieldUnit) || '',
  courses: recipe.courses ?? [], methods: recipe.methods ?? [], searchText: recipe.searchText ?? '', order: recipe.order ?? 0,
})

export async function appRecipeIndex(origin: string): Promise<AppRecipeIndex> {
  const { recipes } = await (await services()).recipes.listRecipes()
  const list = (recipes as any[]).map(summary).sort((a, b) => a.order - b.order)
  const pages = (await siteData()).copy?.pages ?? {}
  return {
    heading: { title: pages.recipesHeading ?? 'All Recipes', intro: pages.recipesIntro ?? '' },
    recipes: list, images: await imagesFor(list.map((r) => r.image), origin),
  }
}

const sections = (list: Section[] = []) => list.map((section) => ({
  id: section.id, title: section.title,
  items: section.items.map((html, index) => ({ id: section.itemIds[index] ?? String(index), html })),
}))

/** Ingredients split their leading amount, which the site shows bold pink (`emphasizeAmount`). */
const ingredientSections = (list: Section[] = []) => list.map((section) => ({
  id: section.id, title: section.title,
  items: section.items.map((html, index) => {
    const amount = html.match(INGREDIENT_AMOUNT)?.[1] ?? ''
    return { id: section.itemIds[index] ?? String(index), html: html.slice(amount.length).trimStart(), amount }
  }),
}))

export function clampCount(raw: string | null): number {
  const n = Number(raw ?? 1)
  return Number.isInteger(n) ? Math.min(99, Math.max(1, n)) : 1
}

export async function appRecipe(slug: string, count: number, origin: string): Promise<AppRecipeDetail | null> {
  const { recipe } = await (await services()).recipes.getRecipe({ slug })
  if (!recipe) return null
  const source = recipe as any
  // Same projection as the recipe page (packages/l8/web/src/next/interactive.tsx).
  const plugin = source.workbench ? (recipeWorkbenchRegistry.get(source.workbench.id) as any) : undefined
  const authored = plugin ? plugin.defaultState(source.workbench.config) : null
  const page = plugin && authored !== null
    ? plugin.resolveRecipe(source, source.workbench.config, plugin.withBatchCount(authored, count))
    : authoredRecipe(source, recipeWorkbenchRegistry)
  const blocks = (page.blocks ?? []).filter((b: any) => b.type === 'recipe') as RecipeBlock[]
  return {
    recipe: {
      ...summary(page),
      // The site's header facts (Active Time, Cook Time, Total Time, Yield), skipping empty values.
      facts: recipeFactItems(page).map(([label, value]) => ({ label, value })),
      blocks: blocks.map((block) => ({
        ingredients: ingredientSections(block.ingredients),
        equipment: sections(block.equipment),
        steps: (block.steps ?? []).map((section) => ({
          id: section.id, title: section.title, timeOrigin: section.timeOrigin ?? null,
          // Timed rails only when every step has a time, as on the site.
          timed: section.itemTimes?.length === section.items.length,
          items: section.items.map((html, index) => ({
            id: section.itemIds[index] ?? String(index), html,
            needs: stepNeeds(section.itemUses?.[index] ?? [], block.ingredients ?? []),
            time: section.itemTimes?.[index]?.label ?? null,
            minutes: section.itemTimes?.[index]?.minutes ?? null,
            rest: section.itemTimes?.[index]?.rest ?? null,
            emphasis: section.itemTimes?.[index]?.emphasis ?? false,
            timers: stepTimers(html),
          })),
        })),
        notes: (block as any).notes ?? [], tips: (block as any).tips ?? [],
      })),
    },
    ...(plugin && authored !== null
      ? { batch: { count, noun: plugin.batchNoun(authored, count), plural: plugin.batchNoun(authored, 2) } }
      : {}),
    images: await imagesFor([page.image], origin),
  }
}
