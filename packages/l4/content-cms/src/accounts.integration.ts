import assert from 'node:assert/strict'
import type { Payload } from 'payload'
import { createSession, upsertGoogleMember } from './members'

/**
 * Exercises the member account API against the running app. Google itself is
 * outside the test, so members are created through the same upsert the OAuth
 * callback uses and receive sessions directly.
 */
export async function verifyAccounts(payload: Payload, origin: string, slug: string, recipeId: string | number) {
  const api = `${origin}/api/public/account`
  const call = (path: string, method = 'GET', body?: unknown, cookie?: string, headers: Record<string, string> = {}) => fetch(api + path, {
    method, redirect: 'manual',
    headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = async (response: Response) => ({ status: response.status, body: await response.json() as any })
  const raw = (email: string) => payload.db.findOne({ collection: 'members', where: { email: { equals: email } } }) as Promise<any>
  const session = async (id: string) => `eatyeet-member=${(await createSession(payload, id)).token}`

  // Anonymous session reads carry no cookie or personal data; only Google is offered.
  const anonymous = await call('/session')
  assert.equal(anonymous.status, 200)
  assert.match(anonymous.headers.get('cache-control')!, /private, no-store/)
  assert.equal(anonymous.headers.get('set-cookie'), null)
  assert.deepEqual(await anonymous.json(), { member: null, providers: { google: false } })

  // Email/password endpoints no longer exist.
  for (const path of ['/register', '/login', '/verify', '/forgot', '/reset', '/password'])
    assert([404, 405].includes((await call(path, 'POST', {})).status), path)

  // Google creates a verified member, links by subject afterwards, and never accepts an unverified address.
  assert.equal(await upsertGoogleMember(payload, { sub: 'g-alice', email: 'alice@example.com', emailVerified: false, name: 'Alice' }), null)
  const alice = (await upsertGoogleMember(payload, { sub: 'g-alice', email: 'Alice@Example.com', emailVerified: true, name: 'Alice A.' }))!
  assert(!alice.displayNameConfirmed)
  assert.equal((await raw('alice@example.com'))._verified, true)
  assert.equal((await upsertGoogleMember(payload, { sub: 'g-alice', email: 'changed@example.com', emailVerified: true, name: 'X' }))?.id, alice.id)
  const bob = (await upsertGoogleMember(payload, { sub: 'g-bob', email: 'bob@example.com', emailVerified: true, name: 'Bob Builder' }))!
  const aliceCookie = await session(alice.id)
  const bobCookie = await session(bob.id)

  const aliceSession = await json(await call('/session', 'GET', undefined, aliceCookie))
  assert.equal(aliceSession.body.member.email, 'alice@example.com')
  assert.equal(JSON.stringify(aliceSession.body).includes('hash'), false)
  assert.equal((await call('/session', 'PATCH', { displayName: 'x'.repeat(81) }, aliceCookie)).status, 400)
  assert.equal((await call('/session', 'PATCH', { displayName: 'Mallory' }, aliceCookie, { Origin: 'https://other.example' })).status, 403)
  const named = await json(await call('/session', 'PATCH', { displayName: 'Alice Baker' }, aliceCookie))
  assert.equal(named.body.member.displayName, 'Alice Baker')
  assert.equal(named.body.member.displayNameConfirmed, true)

  // Member-owned ratings.
  const ratings = `/ratings/${slug}`
  assert.equal((await json(await call(ratings))).body.count, 0)
  assert.equal((await call(ratings, 'PUT', { score: 5, reviewText: '' })).status, 401)
  const first = await json(await call(ratings, 'PUT', { score: 5, reviewText: 'Excellent crust.' }, aliceCookie))
  assert.equal(first.body.ownRating, 5)
  assert.deepEqual([first.body.reviews[0].name, first.body.reviews[0].own], ['Alice Baker', true])
  const edited = await json(await call(ratings, 'PUT', { score: 3, reviewText: 'Good after reheating.' }, aliceCookie))
  assert.deepEqual([edited.body.count, edited.body.average], [1, 3])
  const reviewId = edited.body.reviews[0].id
  for (const score of [0, 6, 2.5, '5', null])
    assert.equal((await call(ratings, 'PUT', { score, reviewText: '' }, aliceCookie)).status, 400)
  assert.equal((await call(ratings, 'PUT', { score: 5, reviewText: 'x'.repeat(9000) }, aliceCookie)).status, 400)
  assert.equal((await call(ratings, 'PUT', { score: 5, reviewText: '' }, aliceCookie, { Origin: 'https://other.example' })).status, 403)
  const anonymousRead = await json(await call(ratings))
  assert.equal(anonymousRead.body.ownRating, null)
  assert.equal(anonymousRead.body.reviews[0].own, false)
  assert.equal(JSON.stringify(anonymousRead.body).includes('alice@example.com'), false)

  // Replies: authors delete only their own; deleting a rating removes its thread.
  const replied = await json(await call(`${ratings}/replies`, 'POST', { reviewId, body: 'The cold ferment helped mine too.' }, bobCookie))
  const reply = replied.body.reviews[0].replies[0]
  assert.deepEqual({ name: reply.name, own: reply.own }, { name: 'Bob Builder', own: true })
  assert.equal((await call(`${ratings}/replies`, 'POST', { reviewId, body: 'Anonymous' })).status, 401)
  assert.equal((await json(await call(`${ratings}/replies/${reply.id}`, 'DELETE', undefined, aliceCookie))).body.reviews[0].replies.length, 1)
  assert.equal((await json(await call(`${ratings}/replies/${reply.id}`, 'DELETE', undefined, bobCookie))).body.reviews[0].replies.length, 0)
  await call(`${ratings}/replies`, 'POST', { reviewId, body: 'Second reply.' }, bobCookie)
  assert.equal((await json(await call(ratings, 'PUT', { score: 5, reviewText: '' }, bobCookie))).body.count, 2)
  const deleted = await json(await call(ratings, 'DELETE', undefined, aliceCookie))
  assert.deepEqual([deleted.body.count, deleted.body.ownRating, deleted.body.reviews.length], [1, null, 0])
  assert.equal((await payload.find({ collection: 'recipe-review-replies', overrideAccess: true, where: { review: { equals: reviewId } } })).totalDocs, 0)

  // Saved workbench formulas belong to one member.
  const scope = '/workbench/127.0.0.1:recipe-workbench:v1'
  const store = { modes: {}, presets: [{ id: 'p1', name: 'Weekend pizza', formula: { family: 'pizza' } }], starterProfiles: [], defaults: {} }
  assert.equal((await call(scope)).status, 401)
  assert.deepEqual((await json(await call(scope, 'GET', undefined, aliceCookie))).body, { store: null })
  assert.equal((await call(scope, 'PUT', { store }, aliceCookie)).status, 200)
  assert.equal((await call(scope, 'PUT', { store }, aliceCookie)).status, 200)
  assert.deepEqual((await json(await call(scope, 'GET', undefined, aliceCookie))).body.store, store)
  assert.equal((await json(await call(scope, 'GET', undefined, bobCookie))).body.store, null)
  assert.equal((await call(scope, 'PUT', { store: { presets: 'nope' } }, aliceCookie)).status, 400)
  assert.equal((await call(scope, 'PUT', { store: { ...store, presets: Array.from({ length: 201 }, (_, i) => ({ id: `p${i}`, name: 'n', formula: {} })) } }, aliceCookie)).status, 400)
  assert.equal((await call('/workbench/../../evil', 'GET', undefined, aliceCookie)).status, 404)

  // Sign out and sign out everywhere.
  const phone = await session(alice.id)
  assert.equal((await call('/session', 'DELETE', undefined, phone, { Origin: 'https://other.example' })).status, 403)
  assert.match((await call('/session', 'DELETE', undefined, phone)).headers.get('set-cookie') ?? '', /eatyeet-member=;/)
  assert.equal((await json(await call('/session', 'GET', undefined, phone))).body.member, null)
  assert.equal((await json(await call('/session', 'GET', undefined, aliceCookie))).body.member.email, 'alice@example.com')
  assert.equal((await call('/sessions', 'DELETE', undefined, aliceCookie)).status, 200)
  assert.equal((await json(await call('/session', 'GET', undefined, aliceCookie))).body.member, null)
  assert.equal((await json(await call('/session', 'GET', undefined, 'eatyeet-member=forged'))).body.member, null)

  // Account deletion requires the exact email and removes everything the member owns.
  await call(scope, 'PUT', { store }, bobCookie)
  assert.equal((await call('/delete', 'POST', { email: 'someone@example.com' }, bobCookie)).status, 400)
  assert.equal((await call('/delete', 'POST', { email: 'bob@example.com' }, bobCookie, { Origin: 'https://other.example' })).status, 403)
  assert.equal((await call('/delete', 'POST', { email: 'bob@example.com' }, bobCookie)).status, 200)
  assert.equal(await raw('bob@example.com'), null)
  for (const collection of ['recipe-reviews', 'recipe-review-replies', 'member-workbenches', 'member-sessions'] as const)
    assert.equal((await payload.find({ collection, overrideAccess: true, where: { member: { equals: bob.id } } })).totalDocs, 0, collection)
  assert.equal((await json(await call(ratings))).body.count, 0)

  // Google entry points without configuration fail closed; a forged callback is rejected.
  assert.equal((await call('/google?returnTo=/')).status, 503)
  const callback = await call('/google/callback?code=x&state=y')
  assert.equal(callback.status, 303)
  assert.match(callback.headers.get('location')!, /\/account\/sign-in\?error=google$/)

  // Member records and their content are unreachable through Payload REST.
  const carolCookie = await session((await upsertGoogleMember(payload, { sub: 'g-carol', email: 'carol@example.com', emailVerified: true, name: 'Carol' }))!.id)
  for (const collection of ['members', 'member-sessions', 'member-workbenches', 'recipe-reviews', 'recipe-review-replies', 'recipe-ratings', 'recipe-rating-replies']) {
    for (const [method, path] of [['GET', ''], ['POST', ''], ['POST', '/login'], ['POST', '/forgot-password'], ['GET', '/me']]) {
      const response = await fetch(`${origin}/api/${collection}${path}`, { method, headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: carolCookie },
        ...(method === 'POST' ? { body: JSON.stringify({ email: 'carol@example.com', password: 'x', recipe: recipeId, score: 5 }) } : {}) })
      assert(response.status >= 400, `${method} /api/${collection}${path} returned ${response.status}`)
      await response.text()
    }
  }
  assert.equal((await fetch(`${origin}/api/owners/me`, { headers: { Cookie: carolCookie } }).then((r) => r.json()))?.user ?? null, null)

  // Drafts hide ratings from everyone.
  await payload.update({ collection: 'recipes', id: recipeId, overrideAccess: true, data: { status: 'draft' } })
  try {
    assert.equal((await call(ratings)).status, 404)
    assert.equal((await call(ratings, 'PUT', { score: 5, reviewText: '' }, carolCookie)).status, 404)
  } finally {
    await payload.update({ collection: 'recipes', id: recipeId, overrideAccess: true, data: { status: 'published' } })
  }
}
