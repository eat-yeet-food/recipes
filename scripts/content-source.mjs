import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import yaml from 'js-yaml'
import { ACTIVE_APP } from '#site-config'
import { parseRecipe, parseArticle } from '@eat-yeet/l4-content-build/parse'
import { safeImagePath } from '../packages/l4/content-build/src/images.mjs'
import { hashContent } from '../packages/l4/content-build/src/sync.mjs'
import { validateAuthored } from '../packages/l4/content-build/src/source-validation.mjs'
import { ROOT } from './local-runtime.mjs'
export function sourceContent({root = resolve(ROOT, 'apps', ACTIVE_APP.id)} = {}) {
  const site = yaml.safeLoad(readFileSync(resolve(root, 'site.yaml'), 'utf8'))
  validateAuthored(site, 'site')
  if (site.sourceId !== `site:${ACTIVE_APP.id}`)
    throw new Error('Invalid site identity')
  const imagesDir = resolve(root, 'public/images')
  const records = []
  const images = new Map()
  const identities = new Set()
  const slugs = new Set()
  const imageRefs = (value, isPublic) => {
    if (Array.isArray(value))
      return value.forEach((v) => imageRefs(v, isPublic))
    if (!value || typeof value !== 'object') return
    for (const [key, v] of Object.entries(value)) {
      if (
        typeof v === 'string' &&
        ['image', 'src', 'defaultOgImage'].includes(key)
      ) {
        if (!v) continue
        const name = v.replace(/^\/images\//, '').split('?')[0]
        const path = safeImagePath(imagesDir, name)
        const metadata = site.media?.[name] ?? {}
        if (
          metadata.focalPoint &&
          (!Array.isArray(metadata.focalPoint) ||
            metadata.focalPoint.length !== 2 ||
            !metadata.focalPoint.every(
              (n) => typeof n === 'number' && n >= 0 && n <= 1,
            ))
        )
          throw new Error(`Invalid focalPoint: ${name}`)
        images.set(name, {
          name,
          path,
          alt:
            metadata.alt ||
            value.alt ||
            value.imageAlt ||
            value.title ||
            name.replace(/[-.]/g, ' '),
          focalPoint: metadata.focalPoint,
          public: Boolean(images.get(name)?.public || isPublic),
        })
      } else imageRefs(v, isPublic)
    }
  }
  for (const collection of ['recipes', 'articles'])
    for (const file of readdirSync(resolve(root, 'fixtures', collection))
      .filter((f) => /\.ya?ml$/.test(f))
      .sort()) {
      const filename = resolve(root, 'fixtures', collection, file),
        source = readFileSync(filename, 'utf8'),
        raw = yaml.safeLoad(source)
      const fail = (m) => {
        throw new Error(`${filename}: ${m}`)
      }
      if (
        !raw ||
        typeof raw !== 'object' ||
        !raw.sourceId ||
        !raw.sourceId.startsWith(collection + ':')
      )
        fail('Explicit sourceId is required')
      if (identities.has(raw.sourceId)) fail('Duplicate sourceId')
      identities.add(raw.sourceId)
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.slug) ||
        slugs.has(collection + raw.slug)
      )
        fail('Invalid/duplicate slug')
      slugs.add(collection + raw.slug)
      if (
        typeof raw.title !== 'string' ||
        !raw.title.trim() ||
        !Array.isArray(raw.blocks)
      )
        fail('title and blocks are required')
      if (!['draft', 'published', 'archived'].includes(raw.status))
        fail('Explicit valid status required')
      for (const key of ['description', 'image', 'category', 'yieldUnit'])
        if (raw[key] != null && typeof raw[key] !== 'string')
          fail(`${key} must be text`)
      validateAuthored(raw, filename)
      const content = (collection === 'recipes' ? parseRecipe : parseArticle)(
        source,
        raw.slug,
      )
      if (raw.created && !content.created) fail('Invalid created date')
      if (raw.workbench && !['pizza', 'sourdough'].includes(raw.workbench.id))
        fail('Unknown workbench')
      const seo = raw.seo ?? null
      if (
        seo &&
        (typeof seo !== 'object' ||
          Object.keys(seo).some(
            (k) => !['title', 'description', 'image', 'noindex'].includes(k),
          ))
      )
        fail('Invalid SEO fields')
      for (const key of ['title', 'description', 'image'])
        if (seo?.[key] != null && typeof seo[key] !== 'string')
          fail(`seo.${key} must be text`)
      if (seo?.noindex != null && typeof seo.noindex !== 'boolean')
        fail('seo.noindex must be boolean')
      const data = {
        sourceId: raw.sourceId,
        slug: raw.slug,
        title: raw.title,
        status: raw.status,
        content,
        seo,
      }
      records.push({ collection, data })
      imageRefs(content, raw.status === 'published')
      imageRefs(seo, raw.status === 'published')
    }
  const articles = new Set(
    records.filter((r) => r.collection === 'articles').map((r) => r.data.slug),
  )
  const publicArticles = new Set(
    records
      .filter(
        (r) => r.collection === 'articles' && r.data.status === 'published',
      )
      .map((r) => r.data.slug),
  )
  function checkRefs(v, key = '', allowed = articles) {
    if (key === 'article' && typeof v === 'string' && !allowed.has(v))
      throw new Error(`Missing article reference ${v}`)
    if (key === 'methodArticles')
      for (const slug of Object.values(v ?? {}))
        if (!allowed.has(slug))
          throw new Error(`Missing method article ${slug}`)
    if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) checkRefs(x, k, allowed)
  }
  for (const record of records)
    checkRefs(
      record.data.content.learning,
      '',
      record.data.status === 'published' ? publicArticles : articles,
    )
  imageRefs(site, true)
  for (const category of site.categories) {
    if (
      !category.sourceId?.startsWith('categories:') ||
      identities.has(category.sourceId)
    )
      throw new Error('Invalid/duplicate category identity')
    identities.add(category.sourceId)
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.slug) ||
      slugs.has('categories' + category.slug)
    )
      throw new Error('Invalid/duplicate category slug')
    slugs.add('categories' + category.slug)
    records.push({
      collection: 'categories',
      data: {
        sourceId: category.sourceId,
        title: category.label,
        slug: category.slug,
        status: 'published',
        content: category,
        seo: null,
      },
    })
  }
  let gitRevision = 'unknown'
  try {
    gitRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim()
  } catch {}
  const order = { articles: 0, categories: 1, recipes: 2 }
  records.sort((a, b) => order[a.collection] - order[b.collection])
  const preparedRecords = records.map(({ collection, data }) => ({
    collection,
    data: { ...data, sourceHash: hashContent(data), gitRevision },
  }))
  const siteContent = site
  return {
    records: preparedRecords,
    images: [...images.values()],
    site: { ...siteContent, id: ACTIVE_APP.id, siteUrl: ACTIVE_APP.siteUrl },
    gitRevision,
  }
}
