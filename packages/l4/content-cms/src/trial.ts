import type { Access, CollectionConfig, Payload, Where } from 'payload'

/**
 * Trial recipes: written by the owner through the MCP connector, not Git.
 * Their tables (`trial_recipes`, `trial_media`) sit outside the prefixes
 * content sync owns, so `content:sync` never reads, rewrites or deletes them,
 * and `pnpm mcp:wipe` can drop them as a set. Each row keeps the authored
 * source (the YAML recipe shape, as JSON) and the normalized view model the
 * site renders. Only this service's unforgeable capability reaches them;
 * public reads go through `publishedTrialRecipes`/`publishedTrialRecipe`.
 */
const trialCapability = Symbol.for('eat-yeet.trial-content-service')
const permitted: Access = ({ req }) => req.context.trialCapability === trialCapability
const options = { overrideAccess: false, user: null, depth: 0, context: { trialCapability } } as const

export const TRIAL_LIMITS = { recipes: 500, sourceBytes: 256 * 1024, images: 10 } as const

export const trialRecipesCollection: CollectionConfig = {
  slug: 'trial-recipes',
  admin: { hidden: true },
  endpoints: false,
  access: { admin: () => false, create: permitted, read: permitted, update: permitted, delete: permitted },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, maxLength: 160 },
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    { name: 'status', type: 'select', required: true, options: ['draft', 'published'], defaultValue: 'draft', index: true },
    { name: 'revision', type: 'number', required: true, defaultValue: 1 },
    { name: 'source', type: 'json', required: true },
    { name: 'content', type: 'json', required: true },
  ],
}

export const trialMediaCollection: CollectionConfig = {
  slug: 'trial-media',
  admin: { hidden: true },
  endpoints: false,
  access: { admin: () => false, create: permitted, read: permitted, update: permitted, delete: permitted },
  fields: [
    { name: 'sourceId', type: 'text', required: true, unique: true },
    { name: 'public', type: 'checkbox', defaultValue: true },
    { name: 'alt', type: 'text', maxLength: 300 },
    { name: 'manifest', type: 'json', required: true },
    // Stock imports dedupe on provider + photo ID and keep the credit.
    { name: 'importKey', type: 'text', unique: true },
    { name: 'credit', type: 'json' },
  ],
}

export type TrialStatus = 'draft' | 'published'
export type TrialRecipe = { id: string; slug: string; title: string; status: TrialStatus; revision: number; source: Record<string, unknown>; content: any; updatedAt: string; createdAt: string }
export type TrialFailure = { error: 'not-found' | 'conflict' | 'slug-taken' | 'limit' | 'invalid'; message: string }
export type TrialResult<T> = { ok: T } | TrialFailure

const recipe = (doc: any): TrialRecipe => ({
  id: String(doc.id), slug: doc.slug, title: doc.title, status: doc.status, revision: Number(doc.revision),
  source: doc.source, content: doc.content, updatedAt: doc.updatedAt, createdAt: doc.createdAt,
})

/** The public view model: marked as a trial and never indexed. */
export const trialView = (doc: { content: any; updatedAt: string }) => ({ ...doc.content, trial: true })

export async function publishedTrialRecipes(payload: Payload) {
  const { docs } = await payload.find({ collection: 'trial-recipes', ...options, pagination: false,
    select: { content: true, updatedAt: true }, where: { status: { equals: 'published' } }, sort: '-createdAt' })
  return docs.map((doc: any) => ({ updatedAt: doc.updatedAt as string, content: trialView(doc) }))
}

export async function publishedTrialRecipe(payload: Payload, slug: string) {
  const { docs } = await payload.find({ collection: 'trial-recipes', ...options, limit: 1,
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] } })
  return docs[0] ? { updatedAt: (docs[0] as any).updatedAt as string, content: trialView(docs[0] as any) } : null
}

export async function listTrialRecipes(payload: Payload) {
  const { docs } = await payload.find({ collection: 'trial-recipes', ...options, pagination: false, sort: '-updatedAt',
    select: { slug: true, title: true, status: true, revision: true, updatedAt: true, createdAt: true } })
  return docs.map((doc: any) => ({ slug: doc.slug, title: doc.title, status: doc.status as TrialStatus, revision: Number(doc.revision), updatedAt: doc.updatedAt, createdAt: doc.createdAt }))
}

export async function readTrialRecipe(payload: Payload, slug: string): Promise<TrialRecipe | null> {
  const { docs } = await payload.find({ collection: 'trial-recipes', ...options, limit: 1, where: { slug: { equals: slug } } })
  return docs[0] ? recipe(docs[0]) : null
}

const sourceTooLarge = (source: unknown) => new TextEncoder().encode(JSON.stringify(source)).byteLength > TRIAL_LIMITS.sourceBytes

/** `content` is already normalized by the authoring pipeline; `gitSlugTaken` says whether Git owns the slug. */
export async function createTrialRecipe(payload: Payload, input: { source: Record<string, unknown>; content: any; status: TrialStatus; gitSlugTaken: boolean }): Promise<TrialResult<TrialRecipe>> {
  const slug = String(input.content.slug)
  if (sourceTooLarge(input.source)) return { error: 'limit', message: `The recipe is over ${TRIAL_LIMITS.sourceBytes / 1024} KB.` }
  if (input.gitSlugTaken || await readTrialRecipe(payload, slug)) return { error: 'slug-taken', message: `A recipe already uses the slug "${slug}". Pick another.` }
  const { totalDocs } = await payload.count({ collection: 'trial-recipes', ...options })
  if (totalDocs >= TRIAL_LIMITS.recipes) return { error: 'limit', message: `There are already ${TRIAL_LIMITS.recipes} trial recipes.` }
  const doc = await payload.create({ collection: 'trial-recipes', ...options,
    data: { slug, title: String(input.content.title), status: input.status, revision: 1, source: input.source, content: input.content } })
  return { ok: recipe(doc) }
}

/** Replaces the whole recipe. `expectedRevision` stops a stale edit from overwriting a newer one. The slug never changes. */
export async function updateTrialRecipe(payload: Payload, slug: string, input: { expectedRevision: number; source: Record<string, unknown>; content: any; status?: TrialStatus }): Promise<TrialResult<TrialRecipe>> {
  const existing = await readTrialRecipe(payload, slug)
  if (!existing) return { error: 'not-found', message: `No trial recipe "${slug}".` }
  if (existing.revision !== input.expectedRevision) return { error: 'conflict', message: `The recipe changed since revision ${input.expectedRevision}; it is now at ${existing.revision}. Read it again, then retry.` }
  if (input.content.slug !== slug) return { error: 'invalid', message: 'The slug can’t change. Create a new recipe instead.' }
  if (sourceTooLarge(input.source)) return { error: 'limit', message: `The recipe is over ${TRIAL_LIMITS.sourceBytes / 1024} KB.` }
  // The revision guard is also in the WHERE clause, so two concurrent writers can't both win.
  const { docs } = await payload.update({ collection: 'trial-recipes', ...options,
    where: { and: [{ id: { equals: existing.id } }, { revision: { equals: existing.revision } }] },
    data: { title: String(input.content.title), source: input.source, content: input.content, revision: existing.revision + 1, ...(input.status ? { status: input.status } : {}) } })
  if (docs.length !== 1) return { error: 'conflict', message: 'The recipe changed while saving. Read it again, then retry.' }
  return { ok: recipe(docs[0]) }
}

export async function setTrialRecipeStatus(payload: Payload, slug: string, status: TrialStatus): Promise<TrialResult<TrialRecipe>> {
  const existing = await readTrialRecipe(payload, slug)
  if (!existing) return { error: 'not-found', message: `No trial recipe "${slug}".` }
  const doc = await payload.update({ collection: 'trial-recipes', ...options, id: existing.id, data: { status, revision: existing.revision + 1 } })
  return { ok: recipe(doc) }
}

export async function deleteTrialRecipe(payload: Payload, slug: string): Promise<TrialResult<{ slug: string }>> {
  const existing = await readTrialRecipe(payload, slug)
  if (!existing) return { error: 'not-found', message: `No trial recipe "${slug}".` }
  await payload.delete({ collection: 'trial-recipes', ...options, id: existing.id })
  return { ok: { slug } }
}

export type TrialMedia = { hash: string; alt: string; manifest: any; credit: any }
const media = (doc: any): TrialMedia => ({ hash: doc.sourceId, alt: doc.alt ?? '', manifest: doc.manifest, credit: doc.credit ?? null })

export async function findTrialMedia(payload: Payload, by: { hash?: string; importKey?: string }) {
  const where: Where = by.hash ? { sourceId: { equals: by.hash } } : { importKey: { equals: String(by.importKey) } }
  const { docs } = await payload.find({ collection: 'trial-media', ...options, limit: 1, where })
  return docs[0] ? media(docs[0]) : null
}

/** Called only after every variant is in the bucket. */
export async function createTrialMedia(payload: Payload, input: { manifest: any; alt: string; importKey?: string; credit?: unknown }) {
  const existing = await findTrialMedia(payload, { hash: input.manifest.hash })
  if (existing) return existing
  return media(await payload.create({ collection: 'trial-media', ...options,
    data: { sourceId: input.manifest.hash, public: true, alt: input.alt, manifest: input.manifest, importKey: input.importKey ?? null, credit: input.credit ?? null } }))
}

export async function publicTrialMedia(payload: Payload) {
  const { docs } = await payload.find({ collection: 'trial-media', ...options, pagination: false, where: { public: { equals: true } } })
  return docs.map(media)
}

/** Everything, for `pnpm mcp:wipe`: rows go; the caller removes the R2 objects listed in the manifests. */
export async function wipeTrialContent(payload: Payload) {
  const all = await payload.find({ collection: 'trial-media', ...options, pagination: false })
  const keys = all.docs.flatMap((doc: any) => [...doc.manifest.variants, doc.manifest.social].map((v: any) => v.key as string))
  await payload.delete({ collection: 'trial-recipes', ...options, where: { id: { exists: true } } })
  await payload.delete({ collection: 'trial-media', ...options, where: { id: { exists: true } } })
  return { mediaKeys: keys }
}
