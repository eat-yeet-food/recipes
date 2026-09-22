import type { Access, CollectionConfig, Payload } from 'payload'

// The global registry keeps Payload's access closure and this service aligned across dev hot reloads.
// The symbol itself still cannot be supplied through Payload's public REST API.
const ratingCapability = Symbol.for('eat-yeet.recipe-rating-service')
const permitted: Access = ({ req }) => req.context.ratingCapability === ratingCapability
const context = { ratingCapability }

export const ratingsCollection: CollectionConfig = {
  slug: 'recipe-ratings',
  admin: { hidden: true },
  access: { create: permitted, read: permitted, update: permitted, delete: () => false },
  fields: [
    { name: 'ratingKey', type: 'text', required: true, unique: true },
    { name: 'recipe', type: 'relationship', relationTo: 'recipes', required: true, index: true },
    { name: 'reviewerName', type: 'text', maxLength: 80 },
    { name: 'reviewerEmail', type: 'email', admin: { hidden: true } },
    { name: 'score', type: 'number', required: true, min: 1, max: 5,
      validate: (value: unknown) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5 || 'Choose 1 to 5 stars.' },
    { name: 'reviewText', type: 'textarea', maxLength: 2000 },
  ],
}

export const ratingRepliesCollection: CollectionConfig = {
  slug: 'recipe-rating-replies',
  admin: { hidden: true },
  access: { create: permitted, read: permitted, update: () => false, delete: () => false },
  fields: [
    { name: 'recipe', type: 'relationship', relationTo: 'recipes', required: true, index: true },
    { name: 'rating', type: 'relationship', relationTo: 'recipe-ratings', required: true, index: true },
    { name: 'posterKey', type: 'text', required: true, index: true },
    { name: 'posterName', type: 'text', required: true, maxLength: 80 },
    { name: 'posterEmail', type: 'email', required: true, admin: { hidden: true } },
    { name: 'body', type: 'textarea', required: true, maxLength: 1000 },
  ],
}

export type RatingWriteInput = {
  score: number
  reviewText: string
  posterKey: string
  posterName: string
  posterEmail: string
}

export type ReplyWriteInput = {
  reviewId: string
  body: string
  posterKey: string
  posterName: string
  posterEmail: string
}

async function publishedRecipe(payload: Payload, slug: string) {
  const { docs } = await payload.find({ collection: 'recipes', overrideAccess: false, user: null,
    depth: 0, limit: 1, select: { slug: true },
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] } })
  return docs[0]
}

export async function recipeRatings(payload: Payload, slug: string, viewerKey?: string, input?: RatingWriteInput) {
  if (input && (!Number.isInteger(input.score) || input.score < 1 || input.score > 5 ||
    !input.posterName.trim() || input.posterName.trim().length > 80 ||
    !input.posterEmail.trim() || input.posterEmail.length > 320 || input.reviewText.length > 2000))
    throw new Error('Invalid rating')
  // Always check publication directly; ratings must not use the release projection cache.
  const recipe = await publishedRecipe(payload, slug)
  if (!recipe) return null
  const options = { collection: 'recipe-ratings', overrideAccess: false, user: null, context, depth: 0 } as const
  const byKey = async (posterKey: string) => (await payload.find({ ...options, limit: 1,
    where: { ratingKey: { equals: `${recipe.id}:${posterKey}` } } })).docs[0]

  const ownKey = input?.posterKey ?? viewerKey
  let own = ownKey ? await byKey(ownKey) : undefined
  if (input) {
    const reviewText = input.reviewText.trim()
    const data = {
      ratingKey: `${recipe.id}:${input.posterKey}`,
      reviewerName: input.posterName.trim(),
      reviewerEmail: input.posterEmail.trim(),
      score: input.score,
      reviewText: reviewText || null,
    }
    if (own) {
      own = await payload.update({ ...options, id: own.id, data })
    } else {
      try { own = await payload.create({ ...options, data: { recipe: recipe.id, ...data } }) }
      catch (error) {
        // The email-derived key prevents duplicate votes from simultaneous tabs/retries.
        own = await byKey(input.posterKey)
        if (!own) throw error
        own = await payload.update({ ...options, id: own.id, data })
      }
    }
  }

  let count = 0, total = 0, page = 1, more = true
  const starDistribution = [0, 0, 0, 0, 0]
  const reviews: Array<{ id: string; name: string; score: number; reviewText: string; own: boolean }> = []
  while (more) {
    const result = await payload.find({ ...options, page, limit: 500, sort: 'id',
      select: { score: true, reviewText: true, reviewerName: true },
      where: { recipe: { equals: recipe.id } } })
    for (const rating of result.docs) {
      const ratingScore = Number(rating.score)
      count++
      total += ratingScore
      starDistribution[ratingScore - 1]++
      const reviewText = String(rating.reviewText ?? '').trim()
      if (reviewText) reviews.push({
        id: String(rating.id),
        name: String(rating.reviewerName ?? '').trim() || 'Community cook',
        score: ratingScore,
        reviewText,
        own: rating.id === own?.id,
      })
    }
    more = result.hasNextPage
    page++
  }

  const repliesByReview = new Map<string, Array<{ id: string; name: string; body: string; own: boolean }>>()
  page = 1
  more = true
  const replyOptions = { collection: 'recipe-rating-replies', overrideAccess: false, user: null, context, depth: 0 } as const
  while (more) {
    const result = await payload.find({ ...replyOptions, page, limit: 500, sort: 'id',
      select: { rating: true, posterKey: true, posterName: true, body: true },
      where: { recipe: { equals: recipe.id } } })
    for (const reply of result.docs) {
      const reviewId = String(reply.rating)
      const replies = repliesByReview.get(reviewId) ?? []
      replies.push({
        id: String(reply.id),
        name: String(reply.posterName),
        body: String(reply.body),
        own: Boolean(viewerKey && reply.posterKey === viewerKey),
      })
      repliesByReview.set(reviewId, replies)
    }
    more = result.hasNextPage
    page++
  }

  const eatCount = starDistribution[3] + starDistribution[4]
  return {
    count,
    average: count ? total / count : null,
    eatPercentage: count ? Math.round((eatCount / count) * 100) : null,
    starDistribution,
    ownRating: own ? Number(own.score) : null,
    ownReview: String(own?.reviewText ?? ''),
    reviews: reviews.slice(-20).reverse().map((review) => ({
      ...review,
      replies: repliesByReview.get(review.id) ?? [],
    })),
  }
}

export async function replyToRecipeRating(payload: Payload, slug: string, input: ReplyWriteInput) {
  if (!/^\d+$/.test(input.reviewId) || !input.body.trim() || input.body.trim().length > 1000 ||
    !input.posterName.trim() || input.posterName.trim().length > 80 ||
    !input.posterEmail.trim() || input.posterEmail.length > 320)
    throw new Error('Invalid reply')
  const recipe = await publishedRecipe(payload, slug)
  if (!recipe) return null
  const ratings = await payload.find({ collection: 'recipe-ratings', overrideAccess: false, user: null, context,
    depth: 0, limit: 1, where: { and: [{ id: { equals: input.reviewId } }, { recipe: { equals: recipe.id } }] } })
  const rating = ratings.docs[0]
  if (!rating || !String(rating.reviewText ?? '').trim()) throw new Error('Review not found')
  await payload.create({
    collection: 'recipe-rating-replies',
    overrideAccess: false,
    user: null,
    context,
    depth: 0,
    data: {
      recipe: recipe.id,
      rating: rating.id,
      posterKey: input.posterKey,
      posterName: input.posterName.trim(),
      posterEmail: input.posterEmail.trim(),
      body: input.body.trim(),
    },
  })
  return recipeRatings(payload, slug, input.posterKey)
}
