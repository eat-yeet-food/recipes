import type { NextRequest } from 'next/server'
import { deleteRecipeRating, recipeRatings, saveRecipeRating } from '@eat-yeet/l4-content-cms/ratings'
import { cms } from '../../../../../../next/cms'
import { currentMember, failure, readJSON, reply, sameOrigin } from '../../../../../../next/account'

export const dynamic = 'force-dynamic'
type RouteContext = { params: Promise<{ slug: string }> }
const validSlug = (slug: string) => /^[a-z0-9-]{1,160}$/.test(slug)

// Anyone can read the aggregate; the member cookie only adds ownership flags.
export async function GET(request: NextRequest, route: RouteContext) {
  const { slug } = await route.params
  if (!validSlug(slug)) return failure('Recipe not found.', 404)
  try {
    const result = await recipeRatings(await cms(), slug, (await currentMember(request))?.id)
    return result ? reply(result) : failure('Recipe not found.', 404)
  } catch (error) {
    console.error('Ratings request failed', error)
    return failure('Ratings are unavailable. Please try again.', 503)
  }
}

async function write(request: NextRequest, route: RouteContext, remove: boolean) {
  const { slug } = await route.params
  if (!validSlug(slug)) return failure('Recipe not found.', 404)
  if (!sameOrigin(request)) return failure('Please use the form on this recipe page.', 403)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to rate this recipe.', 401)
  let input: { score: number; reviewText: string } | null = null
  if (!remove) {
    const data = await readJSON(request, ['reviewText', 'score'])
    if (!data || !Number.isInteger(data.score) || Number(data.score) < 1 || Number(data.score) > 5 ||
      typeof data.reviewText !== 'string' || data.reviewText.length > 2000) return failure('Choose 1 to 5 stars and keep reviews under 2,000 characters.', 400)
    input = { score: Number(data.score), reviewText: data.reviewText }
  }
  try {
    const payload = await cms()
    const result = input ? await saveRecipeRating(payload, slug, member.id, input) : await deleteRecipeRating(payload, slug, member.id)
    return result ? reply(result) : failure('Recipe not found.', 404)
  } catch (error) {
    console.error('Rating write failed', error)
    return failure('Your rating could not be saved. Please try again.', 503)
  }
}
export const PUT = (request: NextRequest, route: RouteContext) => write(request, route, false)
export const DELETE = (request: NextRequest, route: RouteContext) => write(request, route, true)
