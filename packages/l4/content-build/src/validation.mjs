/** Validate identities before they become URLs or output filenames. */
export function validateSlug(slug, source, collection = 'recipes') {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`${source}: invalid slug ${JSON.stringify(slug)}; expected lowercase kebab-case`)
  }
  if (collection === 'articles' && slug === 'index') {
    throw new Error(`${source}: reserved article slug "index"`)
  }
  return slug
}

export function validateCollection(records, source, collection) {
  if (!Array.isArray(records)) throw new Error(`${source}: expected a content array`)
  const seen = new Set()
  for (const record of records) {
    const slug = validateSlug(record?.slug, source, collection)
    if (seen.has(slug)) throw new Error(`${source}: duplicate slug "${slug}"`)
    seen.add(slug)
  }
}
