import type { NextRequest } from 'next/server'
import { replyToRecipeRating } from '@eat-yeet/l4-content-cms/ratings'
import { cms } from '../../../../../../../next/cms'
import { currentMember, failure, readJSON, reply, sameOrigin } from '../../../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, route: { params: Promise<{ slug: string }> }) {
  const { slug } = await route.params
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return failure('Recipe not found.', 404)
  if (!sameOrigin(request)) return failure('Please use the form on this recipe page.', 403)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to reply.', 401)
  const data = await readJSON(request, ['body', 'reviewId'])
  if (typeof data?.reviewId !== 'string' || !/^\d{1,15}$/.test(data.reviewId) || typeof data.body !== 'string' ||
    !data.body.trim() || data.body.length > 1000) return failure('Replies must be 1 to 1,000 characters.', 400)
  try {
    const result = await replyToRecipeRating(await cms(), slug, member.id, { reviewId: data.reviewId, body: data.body })
    return result ? reply(result) : failure('Recipe not found.', 404)
  } catch (error) {
    if (error instanceof Error && error.message === 'Review not found') return failure('That review is no longer available.', 404)
    console.error('Reply failed', error)
    return failure('Your reply could not be posted. Please try again.', 503)
  }
}
