import { createHash } from 'node:crypto'
import { recipeRatings, replyToRecipeRating, type RatingWriteInput, type ReplyWriteInput } from '@eat-yeet/l4-content-cms/ratings'
import { cms, runtimeSettings } from '../../../../../next/cms'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
const cookieName = 'eatyeet-rater'
const cookiePath = '/api/public/ratings'
const posterKeyPattern = /^[a-f0-9]{64}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const reply = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
})
type RouteContext = { params: Promise<{ slug: string }> }
type ParsedWrite =
  | { kind: 'rating'; input: RatingWriteInput }
  | { kind: 'reply'; input: ReplyWriteInput }

function identity(nameValue: unknown, emailValue: unknown) {
  if (typeof nameValue !== 'string' || typeof emailValue !== 'string') return null
  const name = nameValue.trim()
  const email = emailValue.trim().toLowerCase()
  if (!name || name.length > 80 || !emailPattern.test(email) || email.length > 320) return null
  return { name, email, posterKey: createHash('sha256').update(email).digest('hex') }
}

async function parseWrite(request: NextRequest): Promise<ParsedWrite | null> {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return null
  const reader = request.body?.getReader()
  if (!reader) return null
  let body = '', length = 0
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > 8192) { await reader.cancel(); return null }
    body += decoder.decode(value, { stream: true })
  }
  try {
    const data = JSON.parse(body + decoder.decode())
    const poster = identity(data?.name, data?.email)
    if (!poster) return null
    if (data.kind === 'rating' && Object.keys(data).sort().join(',') === 'email,kind,name,reviewText,score' &&
      Number.isInteger(data.score) && data.score >= 1 && data.score <= 5 &&
      typeof data.reviewText === 'string' && data.reviewText.length <= 2000) {
      return { kind: 'rating', input: {
        score: data.score,
        reviewText: data.reviewText,
        posterKey: poster.posterKey,
        posterName: poster.name,
        posterEmail: poster.email,
      } }
    }
    if (data.kind === 'reply' && Object.keys(data).sort().join(',') === 'body,email,kind,name,reviewId' &&
      typeof data.reviewId === 'string' && /^\d+$/.test(data.reviewId) &&
      typeof data.body === 'string' && data.body.trim() && data.body.length <= 1000) {
      return { kind: 'reply', input: {
        reviewId: data.reviewId,
        body: data.body,
        posterKey: poster.posterKey,
        posterName: poster.name,
        posterEmail: poster.email,
      } }
    }
  } catch {}
  return null
}

async function handle(request: NextRequest, route: RouteContext, write: boolean) {
  const { slug } = await route.params
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return reply({ error: 'Recipe not found.' }, 404)
  const cookie = request.cookies.get(cookieName)?.value ?? ''
  const viewerKey = posterKeyPattern.test(cookie) ? cookie : undefined
  let parsed: ParsedWrite | null = null
  if (write) {
    if (request.headers.get('origin') !== runtimeSettings().origin || request.headers.get('sec-fetch-site') === 'cross-site')
      return reply({ error: 'Please use the form on this recipe page.' }, 403)
    parsed = await parseWrite(request)
    if (!parsed) return reply({ error: 'Enter a valid name and email, then complete the form.' }, 400)
  }
  try {
    const payload = await cms()
    const result = parsed?.kind === 'rating'
      ? await recipeRatings(payload, slug, parsed.input.posterKey, parsed.input)
      : parsed?.kind === 'reply'
        ? await replyToRecipeRating(payload, slug, parsed.input)
        : await recipeRatings(payload, slug, viewerKey)
    if (!result) return reply({ error: 'Recipe not found.' }, 404)
    const response = reply(result)
    if (parsed) response.cookies.set(cookieName, parsed.input.posterKey, { httpOnly: true, sameSite: 'strict',
      secure: runtimeSettings().origin.startsWith('https:'), path: cookiePath, maxAge: 60 * 60 * 24 * 365 })
    return response
  } catch (error) {
    console.error('Ratings request failed', error)
    return reply({ error: 'Ratings are unavailable. Please try again.' }, 503)
  }
}

export const GET = (request: NextRequest, context: RouteContext) => handle(request, context, false)
export const POST = (request: NextRequest, context: RouteContext) => handle(request, context, true)
