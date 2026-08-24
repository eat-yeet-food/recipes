/**
 * One-time conversion: seeds/fixtures.sql -> active app recipe YAML
 *
 * Reads the Postgres COPY blocks out of the yeet seed dump and rewrites each
 * published recipe as a YAML document. Structured
 * ingredient columns (quantity/unit/brand/ingredient_id) are intentionally
 * dropped: recipe_items.description already carries the full human line,
 * including any inline Markdown links.
 *
 * Usage: node scripts/convert-fixtures.mjs [path/to/fixtures.sql]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { APP_ID, APP_PATHS } from '#site-config'
import { RESOLVED_APP_PATHS } from './app-paths.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SQL_PATH = process.argv[2] || join(ROOT, '..', 'yeet', 'seeds', 'fixtures.sql')
const OUT_DIR = RESOLVED_APP_PATHS.fixtures

// --- Postgres COPY text-format decoding ---------------------------------

const ESCAPES = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\' }

/** Decode one COPY field. Returns null for the \N null marker. */
function decodeField(raw) {
  if (raw === '\\N') return null
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== '\\') {
      out += raw[i]
      continue
    }
    const next = raw[++i]
    if (next in ESCAPES) out += ESCAPES[next]
    else if (next === 'x') {
      const hex = /^[0-9a-fA-F]{1,2}/.exec(raw.slice(i + 1))?.[0] ?? ''
      out += String.fromCharCode(parseInt(hex, 16))
      i += hex.length
    } else if (next >= '0' && next <= '7') {
      const oct = /^[0-7]{1,3}/.exec(raw.slice(i))?.[0] ?? ''
      out += String.fromCharCode(parseInt(oct, 8))
      i += oct.length - 1
    } else {
      out += next
    }
  }
  return out
}

/** Parse a Postgres array literal: {}, {mains}, {"has space",plain} */
function decodeArray(raw) {
  if (raw == null) return []
  const body = raw.replace(/^\{|\}$/g, '')
  if (body === '') return []
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (quoted) {
      if (ch === '\\') cur += body[++i]
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

/**
 * Extract every `COPY public.<table> (cols) FROM stdin;` block as an array of
 * row objects keyed by column name.
 */
function readCopyBlocks(sql) {
  const tables = {}
  const lines = sql.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const header = /^COPY public\.([a-z_]+) \(([^)]+)\) FROM stdin;$/.exec(lines[i])
    if (!header) continue
    const [, table, colList] = header
    const cols = colList.split(',').map((c) => c.trim())
    const rows = []
    for (i++; i < lines.length && lines[i] !== '\\.'; i++) {
      const fields = lines[i].split('\t')
      const row = {}
      cols.forEach((col, idx) => {
        row[col] = decodeField(fields[idx] ?? '\\N')
      })
      rows.push(row)
    }
    tables[table] = rows
  }
  return tables
}

// --- YAML emission -------------------------------------------------------

const GENERIC_TITLE = {
  ingredients: 'Ingredients',
  instructions: 'Instructions',
  equipment: 'Equipment',
}

const bySortOrder = (a, b) => Number(a.sort_order) - Number(b.sort_order)

function recipeScalars(recipe) {
  const doc = {
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description ?? '',
    category: recipe.category_type ?? '',
    courses: decodeArray(recipe.courses),
    cuisines: decodeArray(recipe.cuisines),
    methods: decodeArray(recipe.methods),
    restrictions: decodeArray(recipe.restrictions),
    occasions: decodeArray(recipe.occasions),
    ingredientTypes: decodeArray(recipe.ingredient_types),
  }
  for (const [key, col] of [
    ['prepMinutes', 'prep_minutes'],
    ['cookMinutes', 'cook_minutes'],
    ['totalMinutes', 'total_minutes'],
    ['yieldAmount', 'yield_amount'],
  ]) {
    if (recipe[col] != null && recipe[col] !== '') doc[key] = Number(recipe[col])
  }
  if (recipe.yield_unit) doc.yieldUnit = recipe.yield_unit
  if (recipe.created_at) doc.created = recipe.created_at.slice(0, 10)
  return doc
}

function sectionList(sections, itemsBySection) {
  return sections
    .map((section) => {
      const items = (itemsBySection.get(section.id) ?? []).slice().sort(bySortOrder)
      if (items.length === 0) return null
      return {
        title: section.title && section.title !== GENERIC_TITLE[section.type] ? section.title : '',
        items: items
          .map((item) => {
            const text = (item.description ?? '').trim()
            const comment = (item.comment ?? '').trim()
            return comment ? `${text} — ${comment}` : text
          })
          .filter(Boolean),
      }
    })
    .filter(Boolean)
}

function tipList(tips) {
  return tips
    .slice()
    .sort(bySortOrder)
    .map((t) => (t.description ?? '').trim())
    .filter(Boolean)
}

function toRecipeYaml(recipe, sections, itemsBySection, tips) {
  const ofType = (type) => sections.filter((s) => s.type === type).sort(bySortOrder)
  const doc = {
    ...recipeScalars(recipe),
    blocks: [
      {
        type: 'recipe',
        equipment: sectionList(ofType('equipment'), itemsBySection),
        ingredients: sectionList(ofType('ingredients'), itemsBySection),
        steps: sectionList(ofType('instructions'), itemsBySection),
        notes: tipList(tips.filter((t) => t.type === 'note')),
        tips: tipList(tips.filter((t) => t.type === 'tip')),
      },
    ],
  }
  return yaml.dump(doc, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
  })
}

// --- Main ----------------------------------------------------------------

const tables = readCopyBlocks(readFileSync(SQL_PATH, 'utf8'))

const groupBy = (rows, key) => {
  const map = new Map()
  for (const row of rows ?? []) {
    if (!map.has(row[key])) map.set(row[key], [])
    map.get(row[key]).push(row)
  }
  return map
}

const sectionsByRecipe = groupBy(tables.recipe_sections, 'recipe_id')
const itemsBySection = groupBy(tables.recipe_items, 'section_id')
const tipsByRecipe = groupBy(tables.recipe_tips, 'recipe_id')

mkdirSync(OUT_DIR, { recursive: true })

const published = (tables.recipes ?? []).filter((r) => r.status === 'published')
for (const recipe of published) {
  const source = toRecipeYaml(
    recipe,
    sectionsByRecipe.get(recipe.id) ?? [],
    itemsBySection,
    tipsByRecipe.get(recipe.id) ?? [],
  )
  writeFileSync(join(OUT_DIR, `${recipe.slug}.yaml`), source)
  console.log(`  ${recipe.slug}.yaml`)
}

console.log(`\nWrote ${published.length} recipes to ${APP_ID}: ${APP_PATHS.fixtures}/`)
