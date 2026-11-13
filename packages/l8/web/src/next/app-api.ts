import 'server-only'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
import { authoredRecipe } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { recipeFactItems } from '@eat-yeet/l7-recipes/recipes/recipe-fact-items'
import { INGREDIENT_AMOUNT, stepNeeds } from '@eat-yeet/l7-recipes/recipes/step-needs'
import { stepTimers } from '@eat-yeet/l7-recipes/recipes/step-timers'
import type { RecipeBlock, Section } from '@eat-yeet/l4-content-model/blocks'
import type { AppHome, AppImage, AppRecipeDetail, AppRecipeIndex, AppRecipeSummary, AppRemixIndex, AppRemixRecipe, AppRemixResolution } from '@eat-yeet/l3-app-api/types'
import { formatYield, humanizeMinutes } from '@eat-yeet/l2-recipe-domain/format'
import { pizzaBallWeight } from '@eat-yeet/l2-recipe-domain/pizza-sizing'
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
  courses: recipe.courses ?? [], methods: recipe.methods ?? [], cuisines: recipe.cuisines ?? [], restrictions: recipe.restrictions ?? [], searchText: recipe.searchText ?? '', order: recipe.order ?? 0,
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

const imageName = (path?: string) => (path ?? '').replace(/^\/images\//, '')

/** The home page: hero, What's New (the newest six, by published date), featured categories and the menu. */
export async function appHome(origin: string): Promise<AppHome> {
  const site = await siteData()
  const copy = site.copy ?? {}
  const { recipes } = await (await services()).recipes.listRecipes()
  const latest = [...(recipes as any[])]
    .sort((a, b) => String(b.created ?? '').localeCompare(String(a.created ?? '')) || a.title.localeCompare(b.title))
    .slice(0, 6).map(summary)
  const categories = ((site.categories ?? []) as any[]).filter((c) => c.featured)
    .map((c) => ({ slug: c.slug, label: c.label, facet: c.facet, value: c.value, image: imageName(c.image) }))
  const hero = copy.hero ?? {}
  return {
    wordmark: { first: copy.wordmark?.first ?? 'Eat', second: copy.wordmark?.second ?? 'Yeet' },
    hero: {
      image: imageName(hero.image), imageAlt: hero.imageAlt ?? '', headline: hero.headline ?? '',
      sticker: hero.headlineSticker ?? '', kicker: hero.kicker ?? '', motto: hero.motto ?? '', cta: hero.cta ?? '',
    },
    latest: { eyebrow: copy.home?.eyebrow ?? '', title: copy.home?.latestTitle ?? '', recipes: latest },
    browse: { eyebrow: copy.home?.browseEyebrow ?? '', title: copy.home?.browseTitle ?? '', categories },
    // The site's phone menu: entries not marked `mobile: false`.
    navigation: ((site.navigation ?? []) as any[]).filter((n) => n.mobile !== false).map((n) => ({ label: n.label, href: n.href })),
    images: await imagesFor([imageName(hero.image), ...latest.map((r) => r.image), ...categories.map((c) => c.image)], origin),
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

/** A projected recipe page as the app's Recipe view model. */
function recipeView(page: any) {
  const blocks = (page.blocks ?? []).filter((b: any) => b.type === 'recipe') as RecipeBlock[]
  return {
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
  }
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
  return {
    recipe: recipeView(page),
    ...(plugin && authored !== null
      ? { batch: { count, noun: plugin.batchNoun(authored, count), plural: plugin.batchNoun(authored, 2) } }
      : {}),
    images: await imagesFor([page.image], origin),
  }
}

// ---- Remix (the site's /remix): editing happens in the app, every calculation here. ----

async function remixSource(slug: string) {
  const { recipe } = await (await services()).recipes.getRecipe({ slug })
  const source = recipe as any
  const plugin = source?.workbench ? (recipeWorkbenchRegistry.get(source.workbench.id) as any) : undefined
  const defaultState = plugin ? plugin.defaultState(source.workbench.config) : null
  return plugin && defaultState !== null ? { source, plugin, config: source.workbench.config, defaultState } : null
}

/** Recipes Remix can start from, with the facts the site's "Start from a recipe" cards show. */
export async function appRemixIndex(origin: string): Promise<AppRemixIndex> {
  const { recipes } = await (await services()).recipes.listRecipes()
  const out: AppRemixIndex['recipes'] = []
  for (const listed of recipes as any[]) {
    const remix = await remixSource(listed.slug)
    if (!remix) continue
    out.push({ slug: listed.slug, title: listed.title, image: listed.image ?? '', family: remix.plugin.id, label: remix.plugin.label,
      facts: remix.plugin.facts(remix.source, remix.config, remix.defaultState) })
  }
  return { recipes: out, images: await imagesFor(out.map((r) => r.image), origin) }
}

/** What the editor needs: the recipe as written and the choices its calculator offers. */
export async function appRemixRecipe(slug: string, origin: string): Promise<AppRemixRecipe | null> {
  const remix = await remixSource(slug)
  if (!remix) return null
  const { source, plugin, config, defaultState } = remix
  return {
    slug, title: source.title, image: source.image ?? '', family: plugin.id, label: plugin.label, defaultState,
    methods: (source.methodOptions ?? []).map((m: any) => ({ id: m.id, label: m.label })),
    pizzaSizes: (config.pizzaSizing?.diametersInches ?? []).map((inches: number) => ({ inches, ballGrams: pizzaBallWeight(inches, config.pizzaSizing) })),
    images: await imagesFor([source.image], origin),
  }
}

export const REMIX_STATE_BYTES = 32 * 1024

/**
 * Validates an edited state and returns everything the editor and bake sheet show:
 * facts, totals, the changes from the recipe as written, and the projected recipe.
 */
export async function appRemixResolve(slug: string, state: unknown): Promise<AppRemixResolution | null> {
  const remix = await remixSource(slug)
  if (!remix) return null
  const { source, plugin, config, defaultState } = remix
  const decoded = plugin.decodeState(state, config, source)
  if (decoded === null) return { valid: false, errors: ['Some values are out of range. Check the highlighted fields.'], facts: '', total: '', totalDetail: '', changes: [], batchNoun: '' }
  const totals = plugin.totals(source, config, decoded)
  return {
    valid: true, errors: [],
    facts: plugin.facts(source, config, decoded),
    total: totals.total, totalDetail: totals.detail,
    changes: plugin.changes(source, config, defaultState, decoded),
    batchNoun: plugin.batchNoun(decoded, plugin.batchCount(decoded)),
    recipe: recipeView(plugin.resolveRecipe(source, config, decoded)),
    ...(plugin.summary ? { summary: plugin.summary(source, config, decoded) } : {}),
  }
}
