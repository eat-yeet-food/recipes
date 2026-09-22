import assert from 'node:assert/strict'
import type { Payload } from 'payload'

type RatingResponse = {
  average: number | null
  count: number
  eatPercentage: number | null
  starDistribution: number[]
  ownRating: number | null
  ownReview: string
  reviews: Array<{
    id: string
    name: string
    score: number
    reviewText: string
    own: boolean
    replies: Array<{ id: string; name: string; body: string; own: boolean }>
  }>
}

export async function verifyRatings(payload: Payload, origin: string, slug: string, recipeId: string | number) {
  const url = `${origin}/api/public/ratings/${slug}`
  const read = await fetch(url)
  assert.equal(read.status, 200)
  assert.match(read.headers.get('cache-control')!, /private, no-store/)
  assert.deepEqual(await read.json(), {
    average: null, count: 0, eatPercentage: null, starDistribution: [0, 0, 0, 0, 0],
    ownRating: null, ownReview: '', reviews: [],
  })
  assert.equal(read.headers.get('set-cookie'), null)

  const post = (value: unknown, cookie?: string, extra = {}) => fetch(url, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra },
    body: JSON.stringify(value),
  })
  const rating = (name: string, email: string, score: unknown, reviewText = '') => ({ kind: 'rating', name, email, score, reviewText })

  const saved = await post(rating('Alice', 'alice@example.com', 5, 'Excellent crust.'))
  assert.equal(saved.status, 200, await saved.clone().text())
  const aliceCookie = saved.headers.get('set-cookie')!.split(';')[0]
  const first = await saved.json() as RatingResponse
  assert.equal(first.count, 1)
  assert.equal(first.average, 5)
  assert.equal(first.ownRating, 5)
  assert.equal(first.ownReview, 'Excellent crust.')
  assert.deepEqual(first.starDistribution, [0, 0, 0, 0, 1])
  assert.equal(first.reviews[0]?.name, 'Alice')
  const aliceReviewId = first.reviews[0]!.id

  const updated = await post(rating('Alice A.', 'ALICE@example.com', 3, 'Good after reheating.'), aliceCookie)
  const updateBody = await updated.json() as RatingResponse
  assert.equal(updateBody.count, 1)
  assert.equal(updateBody.average, 3)
  assert.equal(updateBody.ownRating, 3)
  assert.equal(updateBody.reviews[0]?.name, 'Alice A.')

  const restored = await fetch(url, { headers: { Cookie: aliceCookie } })
  const restoredBody = await restored.json() as RatingResponse
  assert.equal(restoredBody.ownRating, 3)
  assert.equal(restoredBody.ownReview, 'Good after reheating.')
  const anonymous = await fetch(url)
  const anonymousBody = await anonymous.json() as RatingResponse
  assert.equal(anonymousBody.count, 1)
  assert.equal(anonymousBody.ownRating, null)

  const second = await post(rating('Bob', 'bob@example.com', 5, 'Would make again.'))
  const bobCookie = second.headers.get('set-cookie')!.split(';')[0]
  const secondBody = await second.json() as RatingResponse
  assert.equal(secondBody.count, 2)
  assert.equal(secondBody.average, 4)
  assert.equal(secondBody.ownRating, 5)

  const duplicate = await post(rating('Bobby', 'BOB@example.com', 4, 'Still great.'), bobCookie)
  const duplicateBody = await duplicate.json() as RatingResponse
  assert.equal(duplicateBody.count, 2)
  assert.equal(duplicateBody.ownRating, 4)

  const replied = await post({
    kind: 'reply', name: 'Casey', email: 'casey@example.com', reviewId: aliceReviewId,
    body: 'The cold ferment helped mine too.',
  })
  assert.equal(replied.status, 200, await replied.clone().text())
  const repliedBody = await replied.json() as RatingResponse
  const aliceReview = repliedBody.reviews.find((review) => review.id === aliceReviewId)
  assert.deepEqual(aliceReview?.replies.map(({ name, body }) => ({ name, body })), [
    { name: 'Casey', body: 'The cold ferment helped mine too.' },
  ])

  const beforeSync = await payload.find({ collection: 'recipe-ratings', overrideAccess: true, where: { recipe: { equals: recipeId } } })
  assert.equal(beforeSync.totalDocs, 2)
  for (const value of [0, 6, 2.5, '5', null]) {
    const response = await post(rating('Invalid', 'invalid@example.com', value))
    assert.equal(response.status, 400)
    await response.text()
  }
  const crossOrigin = await post(rating('Mallory', 'mallory@example.com', 5), undefined, { Origin: 'https://other.example' })
  assert.equal(crossOrigin.status, 403)
  await crossOrigin.text()
  const oversized = await post(rating('Large', 'large@example.com', 5, 'x'.repeat(9000)))
  assert.equal(oversized.status, 400)
  await oversized.text()

  // The raw collections cannot disclose visitor identifiers or accept forged context.
  for (const collection of ['recipe-ratings', 'recipe-rating-replies']) {
    for (const method of ['GET', 'POST']) {
      const response = await fetch(`${origin}/api/${collection}`, { method,
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({ ratingKey: 'forged', recipe: recipeId, score: 5 }) } : {}) })
      assert([401, 403].includes(response.status))
      await response.text()
    }
  }
  await payload.update({ collection: 'recipes', id: recipeId, overrideAccess: true, data: { status: 'draft' } })
  try {
    for (const response of [await fetch(url), await post(rating('Alice', 'alice@example.com', 5))]) {
      assert.equal(response.status, 404)
      await response.text()
    }
  } finally {
    await payload.update({ collection: 'recipes', id: recipeId, overrideAccess: true, data: { status: 'published' } })
  }
}
