/** Normalize the YAML adapter's authored records into content view models. */
import { renderMarkdown, renderMarkdownBlock, stripTags, isSafeUrl } from './markdown.mjs'
import { validateSlug } from './validation.mjs'

const SECTIONED = new Set(['equipment', 'ingredients', 'steps'])
const LEGACY_BODY_FIELDS = new Set(['equipment', 'ingredients', 'steps', 'notes', 'tips'])
const IMAGE_LAYOUTS = new Set(['vertical', 'flex', 'grid'])
const IMAGE_ASPECTS = new Set(['natural', 'landscape', 'square', 'portrait'])
const SECTION_LAYOUTS = new Set(['prose', 'split', 'feature'])
const CALLOUT_TONES = new Set(['note', 'tip', 'warning'])
const ARTICLE_TYPES = new Set(['guide', 'technique', 'reference'])
const MIXING_METHODS = new Set(['hand', 'planetary', 'spiral'])
const DOUGH_DEVELOPMENT_METHODS = new Set([
  'stretch-and-folds',
  'coil-folds',
  'slap-and-folds',
  'rubaud',
  'bassinage',
])
const list = (value) => (Array.isArray(value) ? value : [])
const num = (value) => (typeof value === 'number' ? value : null)
const yieldAmount = (value) => (typeof value === 'number' || typeof value === 'string' ? value : null)
const text = (value) => String(value ?? '').trim()

function labelFromId(value) {
  return text(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

function identifier(value, fallback) {
  return text(value)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || fallback
}

function normalizeSectioned(value, field) {
  return list(value)
    .map((section, sectionIndex) => {
      const title = typeof section === 'string' ? '' : renderMarkdown(section?.title)
      const id = identifier(typeof section === 'string' ? '' : section?.id, `${field}-${sectionIndex + 1}`)
      const rawItems = typeof section === 'string' ? [section] : list(section?.items)
      const normalizedItems = rawItems
        .map((item, itemIndex) => {
          const source = typeof item === 'string' ? item : item?.text ?? item?.description ?? ''
          const html = renderMarkdown(source)
          return html ? {
            id: identifier(typeof item === 'string' ? '' : item?.id, `${id}-item-${itemIndex + 1}`),
            html,
          } : null
        })
        .filter(Boolean)
      return {
        id,
        title,
        items: normalizedItems.map((item) => item.html),
        itemIds: normalizedItems.map((item) => item.id),
      }
    })
    .filter((section) => section.title || section.items.length > 0)
}

function normalizeFlat(value) {
  return list(value).map(renderMarkdown).filter(Boolean)
}

function normalizeRecipePayload(value = {}) {
  const sectioned = Object.fromEntries(
    [...SECTIONED].map((field) => [field, normalizeSectioned(value[field], field)]),
  )
  return {
    equipment: sectioned.equipment,
    ingredients: sectioned.ingredients,
    steps: sectioned.steps,
    notes: normalizeFlat(value.notes),
    tips: normalizeFlat(value.tips),
  }
}

const sectionText = (sections) =>
  sections.flatMap((s) => [s.title, ...s.items.map(stripTags)]).join(' ')

function recipeBlock(body) {
  return { type: 'recipe', ...body }
}

function normalizeImageLayout(layout = {}) {
  const value = layout && typeof layout === 'object' ? layout : {}
  const mode = IMAGE_LAYOUTS.has(value.mode) ? value.mode : 'vertical'
  const columns = [1, 2, 3].includes(value.columns) ? value.columns : undefined
  const aspect = IMAGE_ASPECTS.has(value.aspect) ? value.aspect : undefined
  return { mode, ...(columns ? { columns } : {}), ...(aspect ? { aspect } : {}) }
}

function normalizeImageBlock(block) {
  const images = list(block.images ?? (block.src ? [block] : []))
    .map((image) => ({
      src: String(image?.src ?? '').trim(),
      alt: String(image?.alt ?? '').trim(),
      ...(image?.caption ? { caption: renderMarkdown(image.caption) } : {}),
    }))
    .filter((image) => image.src && image.alt)

  return images.length > 0
    ? { type: 'image', layout: normalizeImageLayout(block.layout), images }
    : null
}

function normalizeSectionBlock(block) {
  const layout = SECTION_LAYOUTS.has(block.layout) ? block.layout : 'prose'
  const columns = list(block.columns ?? (block.blocks ? [{ blocks: block.blocks }] : []))
    .map((column) => {
      const blocks = normalizeNestedBlocks(column?.blocks ?? column)
      return blocks.length > 0 ? { blocks } : null
    })
    .filter(Boolean)

  return columns.length > 0 ? { type: 'section', layout, columns } : null
}

function normalizeCalloutBlock(block) {
  const title = renderMarkdown(block.title)
  const html = renderMarkdownBlock(block.markdown ?? block.text ?? '')
  const tone = CALLOUT_TONES.has(block.tone) ? block.tone : 'note'

  return title || html ? { type: 'callout', tone, title, html } : null
}

function normalizeStepsBlock(block) {
  const items = list(block.items)
    .map((item) => {
      if (typeof item === 'string') {
        const html = renderMarkdownBlock(item)
        return html ? { title: '', html } : null
      }

      const title = renderMarkdown(item?.title)
      const html = renderMarkdownBlock(item?.markdown ?? item?.text ?? item?.description ?? '')
      return title || html ? { title, html } : null
    })
    .filter(Boolean)

  return items.length > 0
    ? {
        type: 'steps',
        title: renderMarkdown(block.title),
        ...(block.headingLevel === 3 ? { headingLevel: 3 } : {}),
        items,
      }
    : null
}

function normalizeComparisonBlock(block) {
  const columns = list(block.columns).map(renderMarkdown).filter(Boolean)
  const rows = list(block.rows)
    .map((row) => {
      const label = renderMarkdown(row?.label)
      const values = list(row?.values).map(renderMarkdownBlock).filter(Boolean)
      return label && values.length > 0 ? { label, values } : null
    })
    .filter(Boolean)

  return columns.length > 0 && rows.length > 0
    ? { type: 'comparison', title: renderMarkdown(block.title), columns, rows }
    : null
}

function normalizeFootnotesBlock(block) {
  const seen = new Set()
  const items = list(block.items)
    .map((item) => {
      const id = text(item?.id)
      const html = renderMarkdown(item?.title ?? item?.text ?? '')
      const url = text(item?.url)
      if (!/^[\w-]+$/.test(id) || seen.has(id) || !html || !url || !isSafeUrl(url)) return null
      seen.add(id)
      return { id, html, url }
    })
    .filter(Boolean)

  return items.length > 0
    ? { type: 'footnotes', title: renderMarkdown(block.title) || 'Sources', items }
    : null
}

function normalizeYouTubeId(value) {
  const text = String(value ?? '').trim()
  return /^[\w-]{6,}$/.test(text) ? text : ''
}

function normalizeBlock(block) {
  switch (block?.type) {
    case 'markdown': {
      const html = renderMarkdownBlock(block.markdown ?? block.text ?? '')
      return html ? { type: 'markdown', html } : null
    }
    case 'image':
      return normalizeImageBlock(block)
    case 'section':
      return normalizeSectionBlock(block)
    case 'callout':
      return normalizeCalloutBlock(block)
    case 'steps':
      return normalizeStepsBlock(block)
    case 'comparison':
      return normalizeComparisonBlock(block)
    case 'footnotes':
      return normalizeFootnotesBlock(block)
    case 'recipe': {
      const body = normalizeRecipePayload(block)
      return body.equipment.length || body.ingredients.length || body.steps.length || body.notes.length || body.tips.length
        ? recipeBlock(body)
        : null
    }
    case 'youtube': {
      const id = normalizeYouTubeId(block.id)
      const title = String(block.title ?? '').trim() || 'Recipe video'
      return id ? { type: 'youtube', id, title } : null
    }
    default:
      return null
  }
}

function mergeAdjacentMarkdownBlocks(blocks) {
  return blocks.reduce((merged, block) => {
    const previous = merged.at(-1)
    if (previous?.type === 'markdown' && block.type === 'markdown') {
      merged[merged.length - 1] = {
        type: 'markdown',
        html: `${previous.html}\n${block.html}`,
      }
    } else {
      merged.push(block)
    }
    return merged
  }, [])
}

function normalizeNestedBlocks(value) {
  return mergeAdjacentMarkdownBlocks(list(value).map(normalizeBlock).filter(Boolean))
}

function normalizeBlocks(value, slug) {
  const blocks = normalizeNestedBlocks(value)
  if (blocks.length === 0) {
    throw new Error(`${slug}: recipe fixtures must define at least one valid block`)
  }
  return blocks
}

function normalizeMethod(method, data, baseBlocks, fallbackId) {
  const id = text(method?.id) || fallbackId
  if (!id) return null

  const rawBlocks = Array.isArray(method?.blocks) ? method.blocks : null
  const blocks = rawBlocks ? normalizeBlocks(rawBlocks, `${data.slug ?? fallbackId} method ${id}`) : baseBlocks

  return {
    id,
    label: text(method?.label) || labelFromId(id),
    description: text(method?.description) || (data.description ?? ''),
    prepMinutes: num(method?.prepMinutes) ?? num(data.prepMinutes),
    cookMinutes: num(method?.cookMinutes) ?? num(data.cookMinutes),
    totalMinutes: num(method?.totalMinutes) ?? num(data.totalMinutes),
    yieldAmount: yieldAmount(method?.yieldAmount) ?? yieldAmount(data.yieldAmount),
    yieldUnit: method?.yieldUnit ?? data.yieldUnit ?? '',
    blocks,
  }
}

function normalizeMethods(value, data, baseBlocks, slug) {
  return list(value)
    .map((method, index) => normalizeMethod(method, data, baseBlocks, `method-${index + 1}`))
    .filter(Boolean)
}

function normalizeWorkbench(value) {
  if (!value || typeof value !== 'object') return undefined
  const id = text(value.id)
  const config = value.config && typeof value.config === 'object' && !Array.isArray(value.config) ? value.config : null
  return id && config ? { id, config } : undefined
}

function oneOf(value, allowed, fallback = '') {
  const normalized = text(value)
  return allowed.has(normalized) ? normalized : fallback
}

function normalizeMixingLearning(value) {
  if (!value || typeof value !== 'object') return undefined
  const allowedMethods = list(value.allowedMethods).map((method) => oneOf(method, MIXING_METHODS)).filter(Boolean)
  const defaultMethod = oneOf(value.defaultMethod, MIXING_METHODS, allowedMethods[0] ?? '')
  const article = text(value.article)
  const methodArticles =
    value.methodArticles && typeof value.methodArticles === 'object'
      ? Object.fromEntries(
          Object.entries(value.methodArticles)
            .map(([method, slug]) => [oneOf(method, MIXING_METHODS), text(slug)])
            .filter(([method, slug]) => method && slug),
        )
      : {}

  if (!defaultMethod || allowedMethods.length === 0 || !article) return undefined

  return {
    defaultMethod,
    allowedMethods: allowedMethods.includes(defaultMethod) ? allowedMethods : [defaultMethod, ...allowedMethods],
    targetDevelopment: text(value.targetDevelopment),
    article,
    methodArticles,
  }
}

function normalizeDoughStrengthLearning(value) {
  if (!value || typeof value !== 'object') return undefined
  const methods = list(value.methods).map((method) => oneOf(method, DOUGH_DEVELOPMENT_METHODS)).filter(Boolean)
  const article = text(value.article)
  const methodArticles =
    value.methodArticles && typeof value.methodArticles === 'object'
      ? Object.fromEntries(
          Object.entries(value.methodArticles)
            .map(([method, slug]) => [oneOf(method, DOUGH_DEVELOPMENT_METHODS), text(slug)])
            .filter(([method, slug]) => method && slug),
        )
      : {}

  return methods.length > 0 && article ? { methods, article, methodArticles } : undefined
}

function normalizeLearningReference(value) {
  if (!value || typeof value !== 'object') return null
  const article = text(value.article)
  const label = text(value.label)
  return article && label ? { article, label } : null
}

function normalizeFinalDoughTemperature(value) {
  if (!value || typeof value !== 'object') return undefined
  const article = text(value.article)
  const range = list(value.rangeF)
  const rangeF =
    range.length === 2 && range.every((part) => typeof part === 'number')
      ? [range[0], range[1]]
      : null

  if (!article) return undefined

  return {
    targetF: num(value.targetF),
    rangeF,
    reason: text(value.reason),
    article,
  }
}

function normalizeLearning(value) {
  if (!value || typeof value !== 'object') return undefined
  const learning = {
    mixing: normalizeMixingLearning(value.mixing),
    doughStrength: normalizeDoughStrengthLearning(value.doughStrength),
    handling: list(value.handling).map(normalizeLearningReference).filter(Boolean),
    finalDoughTemperature: normalizeFinalDoughTemperature(value.finalDoughTemperature),
  }

  return learning.mixing || learning.doughStrength || learning.handling.length || learning.finalDoughTemperature
    ? learning
    : undefined
}

function searchTextForBlocks(blocks) {
  return blocks.flatMap((block) => {
    switch (block.type) {
      case 'markdown':
        return [stripTags(block.html)]
      case 'image':
        return block.images.flatMap((image) => [image.alt, stripTags(image.caption ?? '')])
      case 'section':
        return block.columns.flatMap((column) => searchTextForBlocks(column.blocks))
      case 'callout':
        return [block.title, stripTags(block.html)]
      case 'steps':
        return [
          block.title,
          ...block.items.flatMap((item) => [item.title, stripTags(item.html)]),
        ]
      case 'comparison':
        return [
          block.title,
          ...block.columns,
          ...block.rows.flatMap((row) => [row.label, ...row.values.map(stripTags)]),
        ]
      case 'footnotes':
        return [block.title, ...block.items.map((item) => stripTags(item.html))]
      case 'recipe':
        return [
          sectionText(block.ingredients),
          sectionText(block.equipment),
          sectionText(block.steps),
          block.notes.map(stripTags).join(' '),
          block.tips.map(stripTags).join(' '),
        ]
      case 'youtube':
        return [block.title]
      default:
        return []
    }
  }).join(' ')
}

/** Everything a text query should be able to match. */
function searchTextFor(data) {
  return [
    data.title,
    data.description,
    searchTextForBlocks(data.blocks),
    ...list(data.methodOptions).flatMap((method) => [
      method.label,
      method.description,
      searchTextForBlocks(method.blocks),
    ]),
  ]
    .join(' ')
    .toLowerCase()
}

/**
 * YAML parses an unquoted `2026-01-14` into a Date, and `String(date)` gives
 * "Tue Jan 14 2026 …" — sliced to ten characters that was "Tue Jan 14", which
 * sorted recipes by weekday name and produced an invalid schema.org
 * datePublished. Always emit ISO YYYY-MM-DD.
 */
function isoDate(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

export function normalizeRecipe(data, fallbackSlug) {
  const slug = validateSlug(data.slug ?? fallbackSlug, fallbackSlug)
  const legacyFields = Object.keys(data).filter((key) => LEGACY_BODY_FIELDS.has(key))

  if (legacyFields.length > 0) {
    throw new Error(`${slug}: recipe body fields must live under blocks, not top level: ${legacyFields.join(', ')}`)
  }

  const blocks = normalizeBlocks(data.blocks, slug)
  const methodOptions = normalizeMethods(data.methodOptions, { ...data, slug }, blocks, slug)
  const defaultMethod =
    text(data.defaultMethod) && methodOptions.some((method) => method.id === text(data.defaultMethod))
      ? text(data.defaultMethod)
      : methodOptions[0]?.id ?? ''

  const recipe = {
    slug,
    title: data.title ?? fallbackSlug,
    order: num(data.order),
    description: data.description ?? '',
    category: data.category ?? '',
    defaultMethod,
    methodOptions,
    workbench: normalizeWorkbench(data.workbench),
    courses: list(data.courses),
    cuisines: list(data.cuisines),
    methods: list(data.methods),
    restrictions: list(data.restrictions),
    occasions: list(data.occasions),
    ingredientTypes: list(data.ingredientTypes),
    prepMinutes: num(data.prepMinutes),
    cookMinutes: num(data.cookMinutes),
    totalMinutes: num(data.totalMinutes),
    yieldAmount: yieldAmount(data.yieldAmount),
    yieldUnit: data.yieldUnit ?? '',
    image: data.image ?? '',
    created: isoDate(data.created),
    blocks,
    learning: normalizeLearning(data.learning),
  }

  recipe.searchText = searchTextFor(recipe)
  return recipe
}

function articleSearchTextFor(data) {
  return [
    data.title,
    data.description,
    data.type,
    data.category,
    ...list(data.tags),
    searchTextForBlocks(data.blocks),
  ]
    .join(' ')
    .toLowerCase()
}

export function normalizeArticle(data, fallbackSlug) {
  const slug = validateSlug(data.slug ?? fallbackSlug, fallbackSlug, 'articles')
  const blocks = normalizeBlocks(data.blocks, slug)
  const article = {
    slug,
    title: text(data.title) || labelFromId(fallbackSlug),
    order: num(data.order),
    description: text(data.description),
    type: oneOf(data.type, ARTICLE_TYPES, 'guide'),
    category: text(data.category),
    tags: list(data.tags).map(text).filter(Boolean),
    image: text(data.image),
    created: isoDate(data.created),
    blocks,
  }

  article.searchText = articleSearchTextFor(article)
  return article
}

