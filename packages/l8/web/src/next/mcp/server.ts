import 'server-only'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { authorRecipe } from '@eat-yeet/l4-content-build/authoring.mjs'
import { contentServices } from '@eat-yeet/l4-content-cms/service'
import {
  createTrialRecipe, deleteTrialRecipe, findTrialMedia, listTrialRecipes, readTrialRecipe, setTrialRecipeStatus, updateTrialRecipe,
  type TrialFailure, type TrialRecipe, type TrialStatus,
} from '@eat-yeet/l4-content-cms/trial'
import {
  createKitchenFormula, deleteKitchenFormula, duplicateKitchenFormula, listKitchenFormulas, readKitchenFormula,
  purgeKitchenFormula, restoreKitchenRevision, saveKitchenFormula, undeleteKitchenFormula, type KitchenFailure,
} from '@eat-yeet/l4-content-cms/kitchen'
import { deleteRecipeRating, deleteRecipeReply, recipeRatings, replyToRecipeRating, saveRecipeRating } from '@eat-yeet/l4-content-cms/ratings'
import { cms, publicMedia, runtimeSettings, siteData } from '../cms'
import { appRemixIndex, appRemixRecipe, appRemixResolve } from '../app-api'
import { refreshPublicCaches } from './freshness'
import { ImageError, imageFromBase64, imageFromUrl, imageRef, importStockPhoto, searchStockPhotos, stockProviders } from './images'
import type { McpMember } from './oauth'
import { STYLE_GUIDE, styleExamples } from './style-guide'
import { RECIPE_WIDGET_HTML, RECIPE_WIDGET_MIME, RECIPE_WIDGET_URI, type RecipeCard } from './widget'

/**
 * The Eat / Yeet MCP tools. Every signed-in member can read recipes, rate and
 * review, and keep their own Remix formulas, through the same services the site
 * uses. Only the owner's server also registers the recipe-writing tools: trial
 * recipes (this connector's own) can be created, edited, published and deleted;
 * Git recipes stay read-only. Every tool is a thin adapter: validation lives in those services.
 */
type Result = { content: { type: 'text'; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean }
const ok = (summary: string, data: Record<string, unknown>): Result => ({ content: [{ type: 'text', text: `${summary}\n\n${JSON.stringify(data, null, 2)}` }], structuredContent: data })
const fail = (message: string): Result => ({ content: [{ type: 'text', text: message }], isError: true })
const read = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const
const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const
const destroy = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const

const url = (path: string) => new URL(path, runtimeSettings().origin).href
const recipeUrl = (slug: string) => url(`/recipes/${slug}`)
const stripTags = (html: string) => String(html ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

// --- Recipe authoring shape ------------------------------------------------------

const item = z.union([z.string(), z.object({
  id: z.string().optional().describe('Stable kebab-case ID, e.g. "flour". Needed on ingredients that steps reference.'),
  text: z.string().describe('Markdown, one line. Ingredients lead with the amount: "500g bread flour".'),
  uses: z.array(z.union([z.string(), z.object({ id: z.string(), amount: z.string().optional(), label: z.string().optional() })])).optional()
    .describe('Steps only: IDs of the ingredients this step uses. A divided ingredient lists an amount in every step that uses it.'),
})])
const section = z.object({ title: z.string().default('').describe('Section heading, e.g. "Dough" or "Sauce"; empty for a single unnamed section.'), items: z.array(item).min(1) })
const extraBlock = z.object({
  type: z.enum(['markdown', 'callout', 'image', 'youtube']),
  markdown: z.string().optional().describe('markdown/callout: the text.'),
  tone: z.enum(['note', 'tip', 'warning']).optional().describe('callout only.'),
  title: z.string().optional().describe('callout only.'),
  images: z.array(z.object({ src: z.string().describe('An image reference from import_stock_photo/upload_image, e.g. "trial/<hash>.webp".'), alt: z.string(), caption: z.string().optional() })).optional(),
  id: z.string().optional().describe('youtube only: the video ID.'),
}).passthrough()

const recipeShape = {
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500).describe('The recipe’s intro: one or two sentences shown under the title, on cards and in search. There is no other intro.'),
  category: z.enum(['savory', 'sweet']),
  prepMinutes: z.number().int().min(0),
  cookMinutes: z.number().int().min(0),
  totalMinutes: z.number().int().min(1).describe('Including rests, marinating and proofing.'),
  prepLabel: z.string().optional().describe('Shown instead of the minutes, e.g. "Overnight".'),
  cookLabel: z.string().optional(),
  totalLabel: z.string().optional(),
  yieldAmount: z.union([z.number(), z.string()]),
  yieldUnit: z.string().min(1).describe('e.g. "servings", "cookies", "loaves".'),
  image: z.string().regex(/^trial\/[a-f0-9]{64}\.webp$/).describe('Hero photo: the `image` returned by import_stock_photo or upload_image.'),
  courses: z.array(z.string()).min(1).describe('Use values from list_categories where they fit, e.g. "mains", "desserts".'),
  cuisines: z.array(z.string()).default([]),
  methods: z.array(z.string()).default([]).describe('Cooking methods, e.g. "baking", "grilling".'),
  restrictions: z.array(z.string()).default([]),
  occasions: z.array(z.string()).default([]),
  ingredientTypes: z.array(z.string()).default([]),
  equipment: z.array(section).default([]),
  ingredients: z.array(section).min(1),
  steps: z.array(section).min(1),
  tips: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  extraBlocks: z.array(extraBlock).default([]).describe('Optional, shown after the recipe card: callouts, image galleries, YouTube, or a markdown block for a real story or background worth reading. Usually leave empty; never repeat the description.'),
}
const recipeInput = z.object(recipeShape)
type RecipeInput = z.infer<typeof recipeInput>

/** The YAML source shape Git recipes use, so trial recipes can move to Git (or Git to this) unchanged. */
function sourceFor(slug: string, input: RecipeInput, created: string) {
  const { equipment, ingredients, steps, tips, notes, extraBlocks, ...facts } = input
  return {
    slug, ...facts, created,
    blocks: [
      { type: 'recipe', equipment, ingredients, steps, tips, notes },
      ...extraBlocks,
    ],
  }
}

const slugify = (title: string) => title.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

async function heroCheck(input: RecipeInput) {
  const payload = await cms()
  const refs = [input.image, ...input.extraBlocks.flatMap((b) => (b.images ?? []).map((i) => i.src))]
  for (const ref of refs) {
    const hash = /^trial\/([a-f0-9]{64})\.webp$/.exec(ref)?.[1]
    if (!hash || !await findTrialMedia(payload, { hash })) return `Image "${ref}" isn’t imported. Use import_stock_photo or upload_image first and pass its \`image\` value.`
  }
  return null
}

function author(source: Record<string, unknown>) {
  try {
    const content = authorRecipe(source)
    const hash = /^trial\/([a-f0-9]{64})\.webp$/.exec(String(content.image))?.[1]
    return { content: { ...content, imageHash: hash ? hash.slice(0, 8) : '' } }
  } catch (error) { return { error: (error as Error).message } }
}

const trialFailure = (failure: TrialFailure) => fail(failure.message)
/** The site's own photo of a recipe as an absolute URL chat clients can show (never a web image). */
async function recipePhotos() {
  const media = await publicMedia()
  return (image: unknown, title: string) => {
    const m = typeof image === 'string' && image ? media['/images/' + image] : undefined
    return m ? { url: url(m.url), width: m.width, height: m.height, alt: m.alt || title } : undefined
  }
}

const duration = (minutes: unknown) => {
  const m = Number(minutes)
  if (!Number.isFinite(m) || m <= 0) return ''
  if (m >= 1440) { const d = Math.round(m / 1440); return `${d} day${d === 1 ? '' : 's'}` }
  const h = Math.floor(m / 60), rest = Math.round(m % 60)
  return h ? `${h} hr${rest ? ` ${rest} min` : ''}` : `${rest} min`
}
/** The widget's view of a recipe (summary or view model): no HTML, absolute URLs only. */
const recipeCard = (r: any, photo: ReturnType<Awaited<ReturnType<typeof recipePhotos>>>): RecipeCard => {
  // "3 × 16-inch pizzas" when the unit starts with a number, else "4 servings".
  const made = `${r.yieldAmount ?? ''}${/^\d/.test(String(r.yieldUnit ?? '')) ? ' ×' : ''} ${r.yieldUnit ?? ''}`.trim()
  const time = r.totalLabel || duration(r.totalMinutes)
  return { title: String(r.title), description: stripTags(r.description), url: recipeUrl(r.slug), trial: !!r.trial || undefined,
    meta: [made && `Makes ${made}`, time].filter(Boolean).join(' · '), ...(photo ? { photo } : {}) }
}
/** Links a read tool to the recipe card widget (MCP Apps key plus ChatGPT's alias). */
const cardTool = (invoking: string, invoked: string) => ({
  ui: { resourceUri: RECIPE_WIDGET_URI }, 'openai/outputTemplate': RECIPE_WIDGET_URI,
  'openai/toolInvocation/invoking': invoking, 'openai/toolInvocation/invoked': invoked,
})

const trialSummary = (recipe: TrialRecipe) => ({ slug: recipe.slug, title: recipe.title, status: recipe.status, revision: recipe.revision, url: recipeUrl(recipe.slug), updatedAt: recipe.updatedAt })

async function published(change: string, recipe: TrialRecipe) {
  const caches = await refreshPublicCaches()
  const note = recipe.status === 'published'
    ? caches === 'deferred' ? ' It may take up to a day to show everywhere (a deploy is running).' : ''
    : ' It’s a draft: publish_recipe makes it public.'
  return ok(`${change} “${recipe.title}”.${note}`, { recipe: trialSummary(recipe), caches })
}

const kitchenMessage: Record<KitchenFailure['error'], string> = {
  'not-found': 'No such remix, or the recipe has no Remix calculator.',
  invalid: 'The remix values are invalid. Check them with preview_remix first.',
  'name-taken': 'You already have a remix with that name.',
  conflict: 'The remix changed since that revision. Read it again (get_remix) and retry with the new revision.',
  limit: 'You’ve reached the remix limit.',
}

export function createMcpServer(member: McpMember) {
  const server = new McpServer({ name: 'eat-yeet', title: 'Eat / Yeet', version: '1.0.0', websiteUrl: url('/'),
    icons: [{ src: url('/icon-512.png'), mimeType: 'image/png', sizes: ['512x512'] }, { src: url('/donut-icon.svg'), mimeType: 'image/svg+xml', sizes: ['any'] }] }, {
    instructions: [
      'Eat / Yeet (eatyeet.com) is a recipe site: practical, tested recipes for home cooks, plus Remix, a calculator for changing dough formulas.',
      'Use search_recipes and get_recipe to find and read recipes; link people to the recipe url.',
      'search_recipes and get_recipe show recipe cards with the site’s own photos. Don’t add images from the web or redraw the cards; summarize or answer around them.',
      'Signed-in people can rate and review recipes and save their own Remix formulas (list_remix_recipes → get_remix_recipe → preview_remix → create_remix).',
      ...(member.owner ? [
        'You are working for the site owner, who can also write recipes. Recipes created here are "trial" recipes: public when published, marked Trial, never indexed by search engines. Git-authored recipes are read-only.',
        'Before writing or editing a recipe, call get_style_guide and follow it: recipes must read like the published ones.',
        'Photos: ask the owner for their own photo of the finished dish first. Offer to clean up the background for an elegant food-blog look while keeping the food exactly as photographed, show the original and the edit side by side, and upload (upload_image) only after the owner approves. Stock photos (search_stock_photos → import_stock_photo) are a fallback for when the owner has no photo.',
        'To post: get_style_guide → photo (upload_image, or stock as fallback) → create_recipe with the returned `image` and publish: true.',
        'The description is the only intro text (it sits under the title). Don’t add text above the recipe; put a genuine story, if there is one, in extraBlocks after it.',
        'Use list_categories to pick course/cuisine values the site already uses.',
      ] : []),
    ].join('\n'),
  })

  // Recipe writing and photos are the owner's alone: other members' servers never register these tools.
  const ownerTool = (member.owner ? server.registerTool.bind(server) : () => undefined) as typeof server.registerTool
  const ownerPrompt = (member.owner ? server.registerPrompt.bind(server) : () => undefined) as typeof server.registerPrompt

  const { origin, mediaOrigin } = runtimeSettings()
  const domains = [...new Set([origin, mediaOrigin].filter(Boolean))]
  server.registerResource('recipe-cards', RECIPE_WIDGET_URI, { title: 'Eat / Yeet recipe cards', mimeType: RECIPE_WIDGET_MIME }, async () => ({
    contents: [{ uri: RECIPE_WIDGET_URI, mimeType: RECIPE_WIDGET_MIME, text: RECIPE_WIDGET_HTML, _meta: {
      ui: { prefersBorder: false, domain: origin, csp: { connectDomains: [], resourceDomains: domains } },
      'openai/widgetCSP': { connect_domains: [], resource_domains: domains, redirect_domains: [origin] },
      'openai/widgetDescription': 'Shows the matching Eat / Yeet recipes as cards with the site’s own photos, yield and time; each opens the recipe on eatyeet.com. Don’t repeat the cards; add only what helps.',
    } }],
  }))

  // --- Discover -------------------------------------------------------------------

  ownerTool('get_style_guide', {
    title: 'Get the recipe style guide',
    description: 'How Eat / Yeet recipes are written (voice, ingredient and step format, photos), with two published recipes as examples in create_recipe’s shape. Read it before writing or editing a recipe.',
    inputSchema: {},
    annotations: read,
  }, async () => ({
    content: [{ type: 'text', text: STYLE_GUIDE }, { type: 'text', text: `Examples (published recipes, in create_recipe's shape):\n${JSON.stringify(await styleExamples(), null, 2)}` }],
  }))

  ownerPrompt('write_recipe', {
    title: 'Write a recipe for Eat / Yeet',
    description: 'Turn a dish (and your photo) into a recipe in the site’s style.',
    argsSchema: { dish: z.string().describe('What to make, or your notes for it.') },
  }, async ({ dish }) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `${STYLE_GUIDE}\n\nExamples:\n${JSON.stringify(await styleExamples(), null, 2)}\n\nWrite an Eat / Yeet recipe for: ${dish}\nAsk me for my photo first.` } }],
  }))

  server.registerTool('search_recipes', {
    title: 'Search recipes',
    description: 'Search every published recipe (Git and trial) by words in the title, description, ingredients and steps. Empty query lists all.',
    inputSchema: { query: z.string().default(''), category: z.enum(['savory', 'sweet']).optional(), limit: z.number().int().min(1).max(100).default(25) },
    annotations: read,
    _meta: cardTool('Searching Eat / Yeet…', 'Found recipes'),
  }, async ({ query, category, limit }) => {
    const { recipes } = await contentServices(await cms()).recipes.listRecipes()
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const matches = (recipes as any[]).filter((r) => (!category || r.category === category) && words.every((w) => String(r.searchText ?? r.title).toLowerCase().includes(w)))
    const photo = await recipePhotos()
    const results = matches.slice(0, limit).map((r) => ({ slug: r.slug, title: r.title, description: stripTags(r.description), category: r.category,
      totalMinutes: r.totalMinutes, yield: `${r.yieldAmount ?? ''} ${r.yieldUnit ?? ''}`.trim(), source: r.trial ? 'trial' : 'git', url: recipeUrl(r.slug), photo: photo(r.image, r.title) }))
    const cards = matches.slice(0, 6).map((r) => recipeCard(r, photo(r.image, r.title)))
    return ok(`${matches.length} recipe${matches.length === 1 ? '' : 's'}${query ? ` match “${query}”` : ''}.`, { total: matches.length, recipes: results, cards })
  })

  server.registerTool('get_recipe', {
    title: 'Get a recipe',
    description: 'A recipe in full, with `photo`: the site’s own picture of the dish to show (absolute URL). Trial recipes also return their editable source and revision (pass both to update_recipe). Git recipes are read-only.',
    inputSchema: { slug: z.string() },
    annotations: read,
    _meta: cardTool('Opening the recipe…', 'Opened the recipe'),
  }, async ({ slug }) => {
    const payload = await cms()
    const photos = await recipePhotos()
    const trial = await readTrialRecipe(payload, slug)
    if (trial) return ok(`Trial recipe “${trial.title}” (${trial.status}, revision ${trial.revision}).`, { source: 'trial', ...trialSummary(trial), photo: photos(trial.source?.image, trial.title),
      cards: [recipeCard({ ...trial.content, slug: trial.slug, trial: true }, photos(trial.source?.image, trial.title))], recipe: trial.source })
    const { recipe } = await contentServices(payload).recipes.getRecipe({ slug })
    if (!recipe) return fail(`No recipe "${slug}". Use search_recipes to find slugs.`)
    return ok(`Git recipe “${recipe.title}” (read-only).`, { source: 'git', url: recipeUrl(slug), photo: photos((recipe as any).image, recipe.title),
      cards: [recipeCard(recipe, photos((recipe as any).image, recipe.title))], recipe })
  })

  server.registerTool('list_categories', {
    title: 'List categories',
    description: 'The site’s browse categories and every course, cuisine, method, restriction, occasion and ingredient type recipes already use.',
    inputSchema: {},
    annotations: read,
  }, async () => {
    const site = await siteData()
    const { recipes } = await contentServices(await cms()).recipes.listRecipes()
    const facets: Record<string, string[]> = {}
    for (const facet of ['courses', 'cuisines', 'methods', 'restrictions', 'occasions', 'ingredientTypes'])
      facets[facet] = [...new Set((recipes as any[]).flatMap((r) => r[facet] ?? []))].sort()
    const categories = (site.categories ?? []).map((c: any) => ({ label: c.label, facet: c.facet, value: c.value }))
    return ok('Categories and the values recipes use.', { categories, facets, recipeCategories: ['savory', 'sweet'] })
  })

  ownerTool('list_trial_recipes', {
    title: 'List my trial recipes',
    description: 'Every recipe written through this connector, drafts included, newest first.',
    inputSchema: {},
    annotations: read,
  }, async () => {
    const recipes = (await listTrialRecipes(await cms())).map((r) => ({ ...r, url: recipeUrl(r.slug) }))
    return ok(`${recipes.length} trial recipe${recipes.length === 1 ? '' : 's'}.`, { recipes })
  })

  // --- Write recipes ----------------------------------------------------------------

  ownerTool('create_recipe', {
    title: 'Create a recipe',
    description: 'Create a trial recipe written to the site’s style (call get_style_guide first). Needs a hero image from upload_image (the owner’s own photo, preferred) or import_stock_photo. Set publish: true to make it public now.',
    inputSchema: { ...recipeShape, slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional().describe('URL slug; defaults to one made from the title.'), publish: z.boolean().default(false) },
    annotations: write,
  }, async ({ slug: requested, publish, ...input }) => {
    const missing = await heroCheck(input as RecipeInput)
    if (missing) return fail(missing)
    const slug = requested ?? slugify(input.title)
    if (!slug) return fail('Give the recipe a slug (lowercase words joined by hyphens).')
    const source = sourceFor(slug, input as RecipeInput, new Date().toISOString().slice(0, 10))
    const authored = author(source)
    if ('error' in authored) return fail(`The recipe isn’t valid: ${authored.error}`)
    const payload = await cms()
    const { recipe: git } = await contentServices(payload).recipes.getRecipe({ slug })
    const result = await createTrialRecipe(payload, { source, content: authored.content, status: publish ? 'published' : 'draft', gitSlugTaken: Boolean(git && !(git as any).trial) })
    if ('error' in result) return trialFailure(result)
    return published(publish ? 'Published' : 'Saved a draft of', result.ok)
  })

  ownerTool('update_recipe', {
    title: 'Update a recipe',
    description: 'Replace a trial recipe with a full new version. Pass the revision from get_recipe; if someone saved since, nothing is overwritten. The slug stays the same.',
    inputSchema: { ...recipeShape, slug: z.string(), expectedRevision: z.number().int().min(1) },
    annotations: write,
  }, async ({ slug, expectedRevision, ...input }) => {
    const payload = await cms()
    const existing = await readTrialRecipe(payload, slug)
    if (!existing) return fail(`No trial recipe "${slug}". Git recipes can’t be edited here.`)
    const missing = await heroCheck(input as RecipeInput)
    if (missing) return fail(missing)
    const source = sourceFor(slug, input as RecipeInput, String((existing.source as any).created ?? new Date().toISOString().slice(0, 10)))
    const authored = author(source)
    if ('error' in authored) return fail(`The recipe isn’t valid: ${authored.error}`)
    const result = await updateTrialRecipe(payload, slug, { expectedRevision, source, content: authored.content })
    if ('error' in result) return trialFailure(result)
    return published('Updated', result.ok)
  })

  for (const [name, status, title] of [['publish_recipe', 'published', 'Publish a recipe'], ['unpublish_recipe', 'draft', 'Unpublish a recipe']] as const)
    ownerTool(name, {
      title,
      description: status === 'published' ? 'Make a trial recipe public on the site and in the app.' : 'Take a trial recipe off the site (it stays as a draft).',
      inputSchema: { slug: z.string() },
      annotations: write,
    }, async ({ slug }) => {
      const result = await setTrialRecipeStatus(await cms(), slug, status as TrialStatus)
      if ('error' in result) return trialFailure(result)
      return published(status === 'published' ? 'Published' : 'Unpublished', result.ok)
    })

  ownerTool('delete_recipe', {
    title: 'Delete a recipe',
    description: 'Delete a trial recipe permanently. Git recipes can’t be deleted here.',
    inputSchema: { slug: z.string() },
    annotations: destroy,
  }, async ({ slug }) => {
    const result = await deleteTrialRecipe(await cms(), slug)
    if ('error' in result) return trialFailure(result)
    const caches = await refreshPublicCaches()
    return ok(`Deleted “${slug}”.`, { slug, caches })
  })

  // --- Images -------------------------------------------------------------------------

  const imageResult = (media: { hash: string; alt: string; manifest: any; credit: any }, summary: string) => ok(summary, {
    image: imageRef(media.hash), alt: media.alt, width: media.manifest.width, height: media.manifest.height,
    preview: url(media.manifest.url), credit: media.credit,
  })
  const imageFailure = (error: unknown) => {
    if (error instanceof ImageError) return fail(error.message)
    console.error('MCP image failed', error)
    return fail('The image couldn’t be processed. Try another photo.')
  }

  ownerTool('search_stock_photos', {
    title: 'Search stock photos',
    description: `Fallback only: find free stock food photos (${stockProviders().join(' and ') || 'no provider configured'}) when the owner has no photo of their own. Ask for their photo first. Pass a result’s provider and id to import_stock_photo.`,
    inputSchema: { query: z.string().min(1).max(100), provider: z.enum(['pexels', 'unsplash']).optional(), page: z.number().int().min(1).default(1), perPage: z.number().int().min(1).max(30).default(10) },
    annotations: { ...read, openWorldHint: true },
  }, async ({ query, provider, page, perPage }) => {
    try {
      const { photos, errors } = await searchStockPhotos(query, { provider, page, perPage })
      return ok(`${photos.length} photo${photos.length === 1 ? '' : 's'} for “${query}”.${errors.length ? ` (${errors.join('; ')})` : ''}`, { photos })
    } catch (error) { return imageFailure(error) }
  })

  ownerTool('import_stock_photo', {
    title: 'Import a stock photo',
    description: 'Fallback only (the owner has no photo): copy a Pexels or Unsplash photo onto the site (all sizes) and return its `image` reference for create_recipe or update_recipe. Importing the same photo again returns the same reference.',
    inputSchema: { provider: z.enum(['pexels', 'unsplash']), id: z.string(), alt: z.string().max(300).default('').describe('What the photo shows, for people who can’t see it. Defaults to the provider’s description.') },
    annotations: { ...write, openWorldHint: true },
  }, async ({ provider, id, alt }) => {
    try { return imageResult(await importStockPhoto(provider, id, alt), 'Imported. Use `image` as the recipe’s image.') }
    catch (error) { return imageFailure(error) }
  })

  ownerTool('upload_image', {
    title: 'Upload an image',
    description: 'Put the owner’s own photo on the site (all sizes) and return its `image` reference. The preferred hero. If you cleaned up the background, upload only the version the owner approved after seeing it next to the original, with the food unchanged. Pass the chat file as `photo`, or an https `url`, or `base64` (JPEG, PNG, WebP, AVIF or HEIC, at least 640px wide, up to 20 MB).',
    inputSchema: {
      photo: z.object({ download_url: z.string().url(), file_id: z.string().optional() }).optional().describe('A file from the conversation (the owner’s photo or the approved edit).'),
      url: z.string().url().optional(), base64: z.string().optional(), alt: z.string().min(1).max(300),
    },
    _meta: { 'openai/fileParams': ['photo'] },
    annotations: { ...write, openWorldHint: true },
  }, async ({ photo, url: link, base64, alt }) => {
    const from = photo?.download_url ?? link
    if ([photo, link, base64].filter(Boolean).length !== 1) return fail('Give exactly one of photo, url or base64.')
    try { return imageResult(from ? await imageFromUrl(from, alt) : await imageFromBase64(base64!, alt), 'Uploaded. Use `image` as the recipe’s image.') }
    catch (error) { return imageFailure(error) }
  })

  // --- Remix ------------------------------------------------------------------------

  // The bake sheet, like the site's kitchenPath(slug, id, true).
  const formulaUrl = (recipeSlug: string, id: string) => url(`/remix/${recipeSlug}/${id}/bake`)

  server.registerTool('list_remix_recipes', {
    title: 'List Remix recipes',
    description: 'Recipes with a Remix calculator (doughs) that a remix can start from.',
    inputSchema: {},
    annotations: read,
  }, async () => {
    const index = await appRemixIndex(runtimeSettings().origin)
    return ok(`${index.recipes.length} recipes can be remixed.`, { recipes: index.recipes.map(({ slug, title, label, facts }) => ({ slug, title, label, facts })) })
  })

  server.registerTool('get_remix_recipe', {
    title: 'Get a Remix starting point',
    description: 'A recipe’s Remix calculator: its default state (the formula as written), methods and sizes. Edit the state, check it with preview_remix, then create_remix.',
    inputSchema: { recipeSlug: z.string() },
    annotations: read,
  }, async ({ recipeSlug }) => {
    const remix = await appRemixRecipe(recipeSlug, runtimeSettings().origin)
    if (!remix) return fail(`"${recipeSlug}" has no Remix calculator. Use list_remix_recipes.`)
    const { images: _images, ...rest } = remix as any
    return ok(`Remix starting point for “${remix.title}”.`, rest)
  })

  server.registerTool('preview_remix', {
    title: 'Preview a remix',
    description: 'Check a Remix state without saving: validity, totals, what changed from the recipe as written, and the projected recipe.',
    inputSchema: { recipeSlug: z.string(), state: z.record(z.string(), z.unknown()) },
    annotations: read,
  }, async ({ recipeSlug, state }) => {
    const resolution = await appRemixResolve(recipeSlug, state)
    if (!resolution) return fail(`"${recipeSlug}" has no Remix calculator.`)
    return ok(resolution.valid ? `Valid. ${resolution.facts}` : `Invalid: ${resolution.errors.join(' ')}`, resolution as any)
  })

  server.registerTool('list_remixes', {
    title: 'List my remixes',
    description: 'Your saved remixes, including recently deleted ones.',
    inputSchema: {},
    annotations: read,
  }, async () => {
    const { formulas, deleted } = await listKitchenFormulas(await cms(), member.id)
    const view = (f: any) => ({ id: f.id, name: f.name, recipeSlug: f.recipeSlug, revision: f.revision, updatedAt: f.updatedAt, deletedAt: f.deletedAt, url: formulaUrl(f.recipeSlug, f.id) })
    return ok(`${formulas.length} remix${formulas.length === 1 ? '' : 'es'}${deleted.length ? `, ${deleted.length} recently deleted` : ''}.`, { remixes: formulas.map(view), recentlyDeleted: deleted.map(view) })
  })

  const kitchen = async (summary: (formula: any) => string, run: () => Promise<any>) => {
    const result = await run()
    if ('error' in result) return fail(kitchenMessage[result.error as KitchenFailure['error']])
    const formula = result.ok
    return ok(summary(formula), { remix: { ...formula, url: formula.id && formula.recipeSlug ? formulaUrl(formula.recipeSlug, formula.id) : undefined } })
  }

  server.registerTool('get_remix', {
    title: 'Get a remix', description: 'A remix with its state, notes, revision and History.',
    inputSchema: { id: z.string() }, annotations: read,
  }, ({ id }) => kitchen((f) => `“${f.name}”, revision ${f.revision}.`, async () => readKitchenFormula(await cms(), member.id, id)))

  server.registerTool('create_remix', {
    title: 'Save a remix', description: 'Save a new remix of a recipe from a state (start from get_remix_recipe’s defaultState).',
    inputSchema: { recipeSlug: z.string(), name: z.string().min(1).max(80), state: z.record(z.string(), z.unknown()), notes: z.string().max(2000).default('') }, annotations: write,
  }, ({ recipeSlug, name, state, notes }) => kitchen((f) => `Saved “${f.name}”.`, async () => createKitchenFormula(await cms(), member.id, { recipeSlug, name, state, notes })))

  server.registerTool('save_remix', {
    title: 'Update a remix', description: 'Save new values, name or notes. Pass the revision from get_remix; a newer revision means it changed elsewhere and nothing is overwritten.',
    inputSchema: { id: z.string(), baseRevision: z.number().int(), name: z.string().min(1).max(80), state: z.record(z.string(), z.unknown()), notes: z.string().max(2000).default('') }, annotations: write,
  }, ({ id, baseRevision, name, state, notes }) => kitchen((f) => `Saved “${f.name}” (revision ${f.revision}).`, async () => saveKitchenFormula(await cms(), member.id, id, { baseRevision, name, state, notes })))

  server.registerTool('duplicate_remix', {
    title: 'Duplicate a remix', description: 'Copy a remix under a new name (or “<name> copy”).',
    inputSchema: { id: z.string(), name: z.string().max(80).optional() }, annotations: write,
  }, ({ id, name }) => kitchen((f) => `Duplicated as “${f.name}”.`, async () => duplicateKitchenFormula(await cms(), member.id, id, name)))

  server.registerTool('restore_remix_revision', {
    title: 'Restore a remix version', description: 'Restore a version from the remix’s History (as a new version).',
    inputSchema: { id: z.string(), revisionId: z.string() }, annotations: write,
  }, ({ id, revisionId }) => kitchen((f) => `Restored “${f.name}”.`, async () => restoreKitchenRevision(await cms(), member.id, id, revisionId)))

  server.registerTool('delete_remix', {
    title: 'Delete a remix', description: 'Move a remix to Recently deleted (kept 30 days; undelete_remix brings it back).',
    inputSchema: { id: z.string() }, annotations: destroy,
  }, ({ id }) => kitchen((f) => `Deleted “${f.name}”. It can be restored for 30 days.`, async () => deleteKitchenFormula(await cms(), member.id, id)))

  server.registerTool('undelete_remix', {
    title: 'Undelete a remix', description: 'Bring back a recently deleted remix.',
    inputSchema: { id: z.string() }, annotations: write,
  }, ({ id }) => kitchen((f) => `Restored “${f.name}”.`, async () => undeleteKitchenFormula(await cms(), member.id, id)))

  server.registerTool('delete_remix_forever', {
    title: 'Delete a remix forever',
    description: 'Permanently remove a remix that is already in Recently deleted, with its History. It can’t be brought back. Only when the person asks to delete it for good.',
    inputSchema: { id: z.string() }, annotations: destroy,
  }, ({ id }) => kitchen(() => 'Deleted for good, with its History.', async () => purgeKitchenFormula(await cms(), member.id, id)))

  // --- Reviews ------------------------------------------------------------------------

  const ratings = async (slug: string, summary: string, run: () => Promise<any>) => {
    try {
      const result = await run()
      if (!result) return fail(`No published Git recipe "${slug}". Ratings and reviews work on Git recipes.`)
      return ok(`${summary} ${result.count ?? 0} rating${result.count === 1 ? '' : 's'}${result.average ? `, average ${Number(result.average).toFixed(1)}` : ''}.`, { slug, ratings: result })
    } catch (error) { return fail((error as Error).message) }
  }

  server.registerTool('get_ratings', {
    title: 'Get ratings and reviews', description: 'A recipe’s ratings, reviews and replies. `own` marks yours.',
    inputSchema: { slug: z.string() }, annotations: read,
  }, ({ slug }) => ratings(slug, '', async () => recipeRatings(await cms(), slug, member.id)))

  server.registerTool('rate_recipe', {
    title: 'Rate a recipe', description: 'Rate 1–5 with an optional review (one per recipe; rating again replaces it).',
    inputSchema: { slug: z.string(), score: z.number().int().min(1).max(5), review: z.string().max(2000).default('') }, annotations: write,
  }, ({ slug, score, review }) => ratings(slug, 'Saved your rating.', async () => saveRecipeRating(await cms(), slug, member.id, { score, reviewText: review })))

  server.registerTool('delete_rating', {
    title: 'Delete my rating', description: 'Remove your rating and its review thread.',
    inputSchema: { slug: z.string() }, annotations: destroy,
  }, ({ slug }) => ratings(slug, 'Deleted your rating.', async () => deleteRecipeRating(await cms(), slug, member.id)))

  server.registerTool('reply_to_review', {
    title: 'Reply to a review', description: 'Reply to a review (by its id from get_ratings).',
    inputSchema: { slug: z.string(), reviewId: z.string(), reply: z.string().min(1).max(1000) }, annotations: write,
  }, ({ slug, reviewId, reply }) => ratings(slug, 'Replied.', async () => replyToRecipeRating(await cms(), slug, member.id, { reviewId, body: reply })))

  server.registerTool('delete_reply', {
    title: 'Delete my reply', description: 'Remove one of your replies.',
    inputSchema: { slug: z.string(), replyId: z.string() }, annotations: destroy,
  }, ({ slug, replyId }) => ratings(slug, 'Deleted your reply.', async () => deleteRecipeReply(await cms(), slug, member.id, replyId)))

  return server
}
