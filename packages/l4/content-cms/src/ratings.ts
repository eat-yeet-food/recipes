import type { Access, CollectionConfig, Payload } from 'payload'
import { memberNames, memberRef } from './members'

// The global registry keeps Payload's access closure and this service aligned across dev hot reloads.
// The symbol itself still cannot be supplied through Payload's public REST API.
const ratingCapability = Symbol.for('eat-yeet.recipe-rating-service')
const permitted: Access = ({ req }) => req.context.ratingCapability === ratingCapability
const context = { ratingCapability }

export const ratingsCollection: CollectionConfig = {
  slug: 'recipe-reviews',
  admin: { hidden: true },
  endpoints: false,
  access: { create: permitted, read: permitted, update: permitted, delete: permitted },
  fields: [
    { name: 'reviewKey', type: 'text', required: true, unique: true },
    { name: 'recipe', type: 'relationship', relationTo: 'recipes', required: true, index: true },
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'score', type: 'number', required: true, min: 1, max: 5,
      validate: (value: unknown) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5 || 'Choose 1 to 5 stars.' },
    { name: 'reviewText', type: 'textarea', maxLength: 2000 },
  ],
}

export const ratingRepliesCollection: CollectionConfig = {
  slug: 'recipe-review-replies',
  admin: { hidden: true },
  endpoints: false,
  access: { create: permitted, read: permitted, update: () => false, delete: permitted },
  fields: [
    { name: 'recipe', type: 'relationship', relationTo: 'recipes', required: true, index: true },
    { name: 'review', type: 'relationship', relationTo: 'recipe-reviews', required: true, index: true },
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'body', type: 'textarea', required: true, maxLength: 1000 },
  ],
}

export type RatingWriteInput = { score: number; reviewText: string }
const idPattern = /^\d{1,15}$/

async function publishedRecipe(payload: Payload, slug: string) {
  const { docs } = await payload.find({ collection: 'recipes', overrideAccess: false, user: null,
    depth: 0, limit: 1, select: { slug: true },
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] } })
  return docs[0]
}

const reviewOptions = { collection: 'recipe-reviews', overrideAccess: false, user: null, context, depth: 0 } as const
const replyOptions = { collection: 'recipe-review-replies', overrideAccess: false, user: null, context, depth: 0 } as const
const ownReview = async (payload: Payload, recipeId: string | number, memberId: string) =>
  (await payload.find({ ...reviewOptions, limit: 1, where: { reviewKey: { equals: `${recipeId}:${memberId}` } } })).docs[0]

async function summary(payload: Payload, recipeId: string | number, viewerId?: string) {
  let count = 0, total = 0, page = 1, more = true
  const starDistribution = [0, 0, 0, 0, 0]
  const written: Array<{ id: string; member: string; score: number; reviewText: string }> = []
  let own: any
  while (more) {
    const result = await payload.find({ ...reviewOptions, page, limit: 500, sort: 'id',
      select: { score: true, reviewText: true, member: true }, where: { recipe: { equals: recipeId } } })
    for (const rating of result.docs as any[]) {
      const score = Number(rating.score)
      count++
      total += score
      starDistribution[score - 1]++
      if (viewerId && String(rating.member) === viewerId) own = rating
      const reviewText = String(rating.reviewText ?? '').trim()
      if (reviewText) written.push({ id: String(rating.id), member: String(rating.member), score, reviewText })
    }
    more = result.hasNextPage
    page++
  }
  const shown = written.slice(-20).reverse()
  const shownIds = new Set(shown.map((review) => review.id))
  const replies: Array<{ id: string; review: string; member: string; body: string }> = []
  page = 1
  more = true
  while (more) {
    const result = await payload.find({ ...replyOptions, page, limit: 500, sort: 'id',
      select: { review: true, member: true, body: true }, where: { recipe: { equals: recipeId } } })
    for (const reply of result.docs as any[]) if (shownIds.has(String(reply.review)))
      replies.push({ id: String(reply.id), review: String(reply.review), member: String(reply.member), body: String(reply.body) })
    more = result.hasNextPage
    page++
  }
  const names = await memberNames(payload, [...shown.map((review) => review.member), ...replies.map((reply) => reply.member)])
  const name = (member: string) => names.get(member) || 'Community cook'
  const eatCount = starDistribution[3] + starDistribution[4]
  return {
    count,
    average: count ? total / count : null,
    eatPercentage: count ? Math.round((eatCount / count) * 100) : null,
    starDistribution,
    ownRating: own ? Number(own.score) : null,
    ownReview: String(own?.reviewText ?? ''),
    reviews: shown.map((review) => ({
      id: review.id,
      name: name(review.member),
      score: review.score,
      reviewText: review.reviewText,
      own: review.member === viewerId,
      replies: replies.filter((reply) => reply.review === review.id).map((reply) => ({
        id: reply.id, name: name(reply.member), body: reply.body, own: reply.member === viewerId })),
    })),
  }
}

// Always check publication directly; ratings must not use the release projection cache.
export async function recipeRatings(payload: Payload, slug: string, viewerId?: string) {
  const recipe = await publishedRecipe(payload, slug)
  return recipe ? summary(payload, recipe.id, viewerId) : null
}

export async function saveRecipeRating(payload: Payload, slug: string, memberId: string, input: RatingWriteInput) {
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5 || input.reviewText.length > 2000)
    throw new Error('Invalid rating')
  const recipe = await publishedRecipe(payload, slug)
  if (!recipe) return null
  const data = { score: input.score, reviewText: input.reviewText.trim() || null }
  const existing = await ownReview(payload, recipe.id, memberId)
  if (existing) await payload.update({ ...reviewOptions, id: existing.id, data })
  else {
    try { await payload.create({ ...reviewOptions, data: { ...data, recipe: recipe.id, member: memberRef(memberId), reviewKey: `${recipe.id}:${memberId}` } }) }
    catch (error) {
      // The member-derived key prevents duplicate votes from simultaneous tabs/retries.
      const raced = await ownReview(payload, recipe.id, memberId)
      if (!raced) throw error
      await payload.update({ ...reviewOptions, id: raced.id, data })
    }
  }
  return summary(payload, recipe.id, memberId)
}

/** Deleting a rating removes its whole thread, including replies from others. */
export async function deleteRecipeRating(payload: Payload, slug: string, memberId: string) {
  const recipe = await publishedRecipe(payload, slug)
  if (!recipe) return null
  const existing = await ownReview(payload, recipe.id, memberId)
  if (existing) {
    await payload.delete({ ...replyOptions, where: { review: { equals: existing.id } } })
    await payload.delete({ ...reviewOptions, id: existing.id })
  }
  return summary(payload, recipe.id, memberId)
}

export async function replyToRecipeRating(payload: Payload, slug: string, memberId: string, input: { reviewId: string; body: string }) {
  if (!idPattern.test(input.reviewId) || !input.body.trim() || input.body.trim().length > 1000) throw new Error('Invalid reply')
  const recipe = await publishedRecipe(payload, slug)
  if (!recipe) return null
  const review = (await payload.find({ ...reviewOptions, limit: 1,
    where: { and: [{ id: { equals: input.reviewId } }, { recipe: { equals: recipe.id } }] } })).docs[0]
  if (!review || !String(review.reviewText ?? '').trim()) throw new Error('Review not found')
  await payload.create({ ...replyOptions, data: { recipe: recipe.id, review: review.id, member: memberRef(memberId), body: input.body.trim() } })
  return summary(payload, recipe.id, memberId)
}

export async function deleteRecipeReply(payload: Payload, slug: string, memberId: string, replyId: string) {
  if (!idPattern.test(replyId)) throw new Error('Invalid reply')
  const recipe = await publishedRecipe(payload, slug)
  if (!recipe) return null
  await payload.delete({ ...replyOptions, where: { and: [{ id: { equals: replyId } }, { recipe: { equals: recipe.id } }, { member: { equals: memberRef(memberId) } }] } })
  return summary(payload, recipe.id, memberId)
}

// Retired anonymous name/email ratings. Declared only so the shared schema
// stays additive for online releases; nothing reads or writes them. Dropping
// the tables is a separately reviewed maintenance operation.
const retired = { admin: { hidden: true }, endpoints: false as const,
  access: { create: () => false, read: () => false, update: () => false, delete: () => false } }
export const retiredRatingCollections: CollectionConfig[] = [
  { slug: 'recipe-ratings', ...retired, fields: [
    { name: 'ratingKey', type: 'text', required: true, unique: true },
    { name: 'recipe', type: 'relationship', relationTo: 'recipes', required: true, index: true },
    { name: 'reviewerName', type: 'text' },
    { name: 'reviewerEmail', type: 'email' },
    { name: 'score', type: 'number', required: true },
    { name: 'reviewText', type: 'textarea' },
  ] },
  { slug: 'recipe-rating-replies', ...retired, fields: [
    { name: 'recipe', type: 'relationship', relationTo: 'recipes', required: true, index: true },
    { name: 'rating', type: 'relationship', relationTo: 'recipe-ratings', required: true, index: true },
    { name: 'posterKey', type: 'text', required: true, index: true },
    { name: 'posterName', type: 'text', required: true },
    { name: 'posterEmail', type: 'email', required: true },
    { name: 'body', type: 'textarea', required: true },
  ] },
]
