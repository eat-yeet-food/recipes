import assert from 'node:assert/strict'
import type { Payload } from 'payload'
import { upsertGoogleMember } from './members'

type RatingResponse = {
  average: number | null
  count: number
  ownRating: number | null
  ownReview: string
  starDistribution: number[]
  reviews: Array<{ id: string; name: string; score: number; reviewText: string; own: boolean
    replies: Array<{ id: string; name: string; body: string; own: boolean }> }>
}

/**
 * Exercises the member account API against the running app: email sign-up
 * with required confirmation, sessions, lockout, reset, Google linking rules,
 * member-owned ratings/replies, saved workbench sync, and Payload denial.
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
  const cookieOf = (response: Response) => {
    const header = response.headers.get('set-cookie') ?? ''
    assert.match(header, /eatyeet-member=/)
    assert.match(header, /HttpOnly/i)
    assert.match(header, /Path=\/api\/public\/account/i)
    assert.match(header, /SameSite=lax/i)
    return header.split(';')[0]!
  }
  const ageEmailThrottle = (id: string | number) =>
    payload.db.updateOne({ collection: 'members', id, data: { emailSentAt: new Date(Date.now() - 120000).toISOString() }, returning: false })

  // Anonymous session reads are free of cookies and personal data.
  const anonymous = await call('/session')
  assert.equal(anonymous.status, 200)
  assert.match(anonymous.headers.get('cache-control')!, /private, no-store/)
  assert.equal(anonymous.headers.get('set-cookie'), null)
  assert.deepEqual((await anonymous.json()).member, null)

  // Registration requires confirmation before sign-in.
  const alice = { displayName: 'Alice A.', email: 'Alice@Example.com', password: 'alice-password-1' }
  assert.equal((await call('/register', 'POST', alice)).status, 200)
  const pending = await raw('alice@example.com')
  assert.equal(pending._verified, false)
  assert.match(pending._verificationToken, /^[a-f0-9]{40}$/)
  const unverified = await json(await call('/login', 'POST', { email: alice.email, password: alice.password }))
  assert.equal(unverified.status, 403)
  assert.match(unverified.body.error, /Confirm your email/)
  // A repeat registration of an unconfirmed address replaces its password and link.
  await ageEmailThrottle(pending.id)
  assert.equal((await call('/register', 'POST', { ...alice, password: 'alice-password-2' })).status, 200)
  const reissued = await raw('alice@example.com')
  assert.notEqual(reissued._verificationToken, pending._verificationToken)
  assert.equal((await call('/verify', 'POST', { token: pending._verificationToken })).status, 400)
  assert.equal((await call('/verify', 'POST', { token: reissued._verificationToken })).status, 200)
  assert.equal((await call('/verify', 'POST', { token: reissued._verificationToken })).status, 400)
  // A confirmed account cannot be replaced by another registration.
  assert.equal((await call('/register', 'POST', { ...alice, password: 'attacker-password' })).status, 200)
  assert.equal((await call('/login', 'POST', { email: alice.email, password: 'attacker-password' })).status, 401)

  const signedIn = await call('/login', 'POST', { email: 'alice@example.com', password: 'alice-password-2' })
  assert.equal(signedIn.status, 200)
  const aliceCookie = cookieOf(signedIn)
  const aliceSession = await json(await call('/session', 'GET', undefined, aliceCookie))
  assert.equal(aliceSession.body.member.email, 'alice@example.com')
  assert.equal(aliceSession.body.member.displayName, 'Alice A.')
  assert.equal(JSON.stringify(aliceSession.body).includes('hash'), false)

  // Input validation, cross-origin and oversized requests.
  for (const body of [{ ...alice, email: 'not-an-email' }, { ...alice, password: 'short' }, { ...alice, displayName: '' }, { email: alice.email }])
    assert.equal((await call('/register', 'POST', body)).status, 400)
  assert.equal((await call('/login', 'POST', { email: alice.email, password: 'x' }, undefined, { Origin: 'https://other.example' })).status, 403)
  assert.equal((await call('/session', 'PATCH', { displayName: 'x'.repeat(81) }, aliceCookie)).status, 400)
  assert.equal((await call('/session', 'PATCH', { displayName: 'Mallory' }, aliceCookie, { Origin: 'https://other.example' })).status, 403)

  // Member-owned ratings.
  const ratings = `/ratings/${slug}`
  const empty = await json(await call(ratings))
  assert.equal(empty.status, 200)
  assert.equal(empty.body.count, 0)
  assert.equal((await call(ratings, 'PUT', { score: 5, reviewText: '' })).status, 401)
  const first = await json(await call(ratings, 'PUT', { score: 5, reviewText: 'Excellent crust.' }, aliceCookie))
  assert.equal(first.status, 200)
  assert.equal(first.body.ownRating, 5)
  assert.equal(first.body.reviews[0].name, 'Alice A.')
  assert.equal(first.body.reviews[0].own, true)
  const edited = await json(await call(ratings, 'PUT', { score: 3, reviewText: 'Good after reheating.' }, aliceCookie)) as { body: RatingResponse }
  assert.equal(edited.body.count, 1)
  assert.equal(edited.body.average, 3)
  const reviewId = edited.body.reviews[0]!.id
  for (const score of [0, 6, 2.5, '5', null])
    assert.equal((await call(ratings, 'PUT', { score, reviewText: '' }, aliceCookie)).status, 400)
  assert.equal((await call(ratings, 'PUT', { score: 5, reviewText: 'x'.repeat(9000) }, aliceCookie)).status, 400)
  assert.equal((await call(ratings, 'PUT', { score: 5, reviewText: '' }, aliceCookie, { Origin: 'https://other.example' })).status, 403)

  // Renaming updates every review.
  await call('/session', 'PATCH', { displayName: 'Alice Baker' }, aliceCookie)
  const renamed = await json(await call(ratings, 'GET', undefined, aliceCookie))
  assert.equal(renamed.body.reviews[0].name, 'Alice Baker')
  const anonymousRead = await json(await call(ratings))
  assert.equal(anonymousRead.body.ownRating, null)
  assert.equal(anonymousRead.body.reviews[0].own, false)
  assert.equal(JSON.stringify(anonymousRead.body).includes('alice@example.com'), false)

  // Google creates a verified member, links by subject afterwards, and never
  // links an unverified Google address.
  assert.equal(await upsertGoogleMember(payload, { sub: 'g-bob', email: 'bob@example.com', emailVerified: false, name: 'Bob' }), null)
  const bob = await upsertGoogleMember(payload, { sub: 'g-bob', email: 'Bob@Example.com', emailVerified: true, name: 'Bob Builder' })
  assert(bob && bob.google && !bob.hasPassword && !bob.displayNameConfirmed)
  assert.equal((await raw('bob@example.com'))._verified, true)
  assert.equal((await upsertGoogleMember(payload, { sub: 'g-bob', email: 'changed@example.com', emailVerified: true, name: 'B' }))?.id, bob.id)
  // An unconfirmed password account for the same address is claimed and its password discarded.
  assert.equal((await call('/register', 'POST', { displayName: 'Squatter', email: 'carol@example.com', password: 'squatter-password' })).status, 200)
  const carol = await upsertGoogleMember(payload, { sub: 'g-carol', email: 'carol@example.com', emailVerified: true, name: 'Carol' })
  assert(carol && !carol.hasPassword && carol.displayName === 'Carol')
  assert.equal((await call('/login', 'POST', { email: 'carol@example.com', password: 'squatter-password' })).status, 401)
  // A confirmed password account gains Google sign-in and keeps its password.
  const linked = await upsertGoogleMember(payload, { sub: 'g-alice', email: 'alice@example.com', emailVerified: true, name: 'Other' })
  assert(linked && linked.hasPassword && linked.google && linked.displayName === 'Alice Baker')

  // Replies and deletion.
  const bobLogin = await payload.db.findOne({ collection: 'members', where: { email: { equals: 'bob@example.com' } } }) as any
  const { createSession } = await import('./members')
  const bobCookie = `eatyeet-member=${(await createSession(payload, bobLogin.id)).token}`
  const replied = await json(await call(`${ratings}/replies`, 'POST', { reviewId, body: 'The cold ferment helped mine too.' }, bobCookie))
  assert.equal(replied.status, 200)
  const reply = replied.body.reviews[0].replies[0]
  assert.deepEqual({ name: reply.name, body: reply.body, own: reply.own }, { name: 'Bob Builder', body: 'The cold ferment helped mine too.', own: true })
  assert.equal((await call(`${ratings}/replies`, 'POST', { reviewId, body: 'Anonymous' })).status, 401)
  // Only the author can delete a reply.
  const notMine = await json(await call(`${ratings}/replies/${reply.id}`, 'DELETE', undefined, aliceCookie))
  assert.equal(notMine.body.reviews[0].replies.length, 1)
  const removedReply = await json(await call(`${ratings}/replies/${reply.id}`, 'DELETE', undefined, bobCookie))
  assert.equal(removedReply.body.reviews[0].replies.length, 0)
  await call(`${ratings}/replies`, 'POST', { reviewId, body: 'Second reply.' }, bobCookie)
  const bobRating = await json(await call(ratings, 'PUT', { score: 5, reviewText: '' }, bobCookie))
  assert.equal(bobRating.body.count, 2)
  const deleted = await json(await call(ratings, 'DELETE', undefined, aliceCookie))
  assert.equal(deleted.status, 200)
  assert.equal(deleted.body.count, 1)
  assert.equal(deleted.body.ownRating, null)
  assert.equal(deleted.body.reviews.length, 0)
  assert.equal((await payload.find({ collection: 'recipe-review-replies', overrideAccess: true, where: { review: { equals: reviewId } } })).totalDocs, 0)

  // Saved workbench formulas belong to one member.
  const scope = '/workbench/127.0.0.1:recipe-workbench:v1'
  const store = { modes: {}, presets: [{ id: 'p1', name: 'Weekend pizza', formula: { family: 'pizza' } }], starterProfiles: [], defaults: {} }
  assert.equal((await call(scope)).status, 401)
  assert.deepEqual((await json(await call(scope, 'GET', undefined, aliceCookie))).body, { store: null })
  assert.equal((await call(scope, 'PUT', { store }, aliceCookie)).status, 200)
  assert.equal((await call(scope, 'PUT', { store }, aliceCookie)).status, 200)
  assert.deepEqual((await json(await call(scope, 'GET', undefined, aliceCookie))).body.store, store)
  assert.deepEqual((await json(await call(scope, 'GET', undefined, bobCookie))).body.store, null)
  assert.equal((await call(scope, 'PUT', { store: { presets: 'nope' } }, aliceCookie)).status, 400)
  assert.equal((await call(scope, 'PUT', { store: { ...store, presets: Array.from({ length: 201 }, (_, i) => ({ id: `p${i}`, name: 'n', formula: {} })) } }, aliceCookie)).status, 400)
  assert.equal((await call('/workbench/../../evil', 'GET', undefined, aliceCookie)).status, 404)

  // Password reset confirms control of the address and signs out every device.
  await ageEmailThrottle((await raw('alice@example.com')).id)
  assert.equal((await call('/forgot', 'POST', { email: 'nobody@example.com' })).status, 200)
  assert.equal((await call('/forgot', 'POST', { email: 'alice@example.com' })).status, 200)
  const resetToken = (await raw('alice@example.com')).resetPasswordToken
  assert.match(resetToken, /^[a-f0-9]+$/)
  assert.equal((await call('/reset', 'POST', { token: resetToken, password: 'short' })).status, 400)
  assert.equal((await call('/reset', 'POST', { token: 'f'.repeat(40), password: 'alice-password-3' })).status, 400)
  assert.equal((await call('/reset', 'POST', { token: resetToken, password: 'alice-password-3' })).status, 200)
  assert.equal((await json(await call('/session', 'GET', undefined, aliceCookie))).body.member, null)
  // A used reset link cannot be replayed, and outgoing mail is throttled per address.
  assert.equal((await call('/reset', 'POST', { token: resetToken, password: 'alice-password-4' })).status, 400)
  const beforeThrottle = (await raw('alice@example.com')).resetPasswordToken
  assert.equal((await call('/forgot', 'POST', { email: 'alice@example.com' })).status, 200)
  assert.equal((await raw('alice@example.com')).resetPasswordToken, beforeThrottle)

  // Lockout after repeated failures.
  for (let i = 0; i < 5; i++) await call('/login', 'POST', { email: 'alice@example.com', password: 'wrong-password' })
  const locked = await json(await call('/login', 'POST', { email: 'alice@example.com', password: 'alice-password-3' }))
  assert.equal(locked.status, 403)
  assert.match(locked.body.error, /Too many attempts/)
  await payload.db.updateOne({ collection: 'members', id: (await raw('alice@example.com')).id, data: { loginAttempts: 0, lockUntil: null }, returning: false })

  // Sign out revokes only that session.
  const again = cookieOf(await call('/login', 'POST', { email: 'alice@example.com', password: 'alice-password-3' }))
  assert.equal((await call('/session', 'DELETE', undefined, again, { Origin: 'https://other.example' })).status, 403)
  const signedOut = await call('/session', 'DELETE', undefined, again)
  assert.match(signedOut.headers.get('set-cookie') ?? '', /eatyeet-member=;/)
  assert.equal((await json(await call('/session', 'GET', undefined, again))).body.member, null)
  assert.equal((await json(await call('/session', 'GET', undefined, bobCookie))).body.member.email, 'bob@example.com')
  assert.equal((await json(await call('/session', 'GET', undefined, 'eatyeet-member=forged'))).body.member, null)

  // Password change requires the current password and revokes other sessions.
  const phone = cookieOf(await call('/login', 'POST', { email: 'alice@example.com', password: 'alice-password-3' }))
  const laptop = cookieOf(await call('/login', 'POST', { email: 'alice@example.com', password: 'alice-password-3' }))
  assert.equal((await call('/password', 'POST', { currentPassword: 'wrong-password', password: 'alice-password-5' }, laptop)).status, 403)
  assert.equal((await call('/password', 'POST', { currentPassword: 'alice-password-3', password: 'short' }, laptop)).status, 400)
  assert.equal((await call('/password', 'POST', { currentPassword: 'alice-password-3', password: 'alice-password-5' }, laptop, { Origin: 'https://other.example' })).status, 403)
  const changed = await call('/password', 'POST', { currentPassword: 'alice-password-3', password: 'alice-password-5' }, laptop)
  assert.equal(changed.status, 200)
  const laptopAfter = cookieOf(changed)
  assert.equal((await json(await call('/session', 'GET', undefined, phone))).body.member, null)
  assert.equal((await json(await call('/session', 'GET', undefined, laptopAfter))).body.member.email, 'alice@example.com')
  // A Google-only member adds a password without a current one.
  const carolCookie = `eatyeet-member=${(await createSession(payload, carol.id)).token}`
  assert.equal((await call('/password', 'POST', { currentPassword: null, password: 'carol-password-1' }, carolCookie)).status, 200)
  assert.equal((await call('/login', 'POST', { email: 'carol@example.com', password: 'carol-password-1' })).status, 200)
  // Sign out everywhere.
  const other = cookieOf(await call('/login', 'POST', { email: 'alice@example.com', password: 'alice-password-5' }))
  assert.equal((await call('/sessions', 'DELETE', undefined, laptopAfter)).status, 200)
  for (const cookie of [other, laptopAfter]) assert.equal((await json(await call('/session', 'GET', undefined, cookie))).body.member, null)

  // Account deletion requires the exact email and removes everything the member owns.
  await call(ratings, 'PUT', { score: 4, reviewText: 'Bob again.' }, bobCookie)
  await call(scope, 'PUT', { store }, bobCookie)
  assert.equal((await call('/delete', 'POST', { email: 'someone@example.com' }, bobCookie)).status, 400)
  assert.equal((await call('/delete', 'POST', { email: 'bob@example.com' }, bobCookie, { Origin: 'https://other.example' })).status, 403)
  assert.equal((await call('/delete', 'POST', { email: 'bob@example.com' }, bobCookie)).status, 200)
  assert.equal(await raw('bob@example.com'), null)
  for (const collection of ['recipe-reviews', 'recipe-review-replies', 'member-workbenches', 'member-sessions'] as const)
    assert.equal((await payload.find({ collection, overrideAccess: true, where: { member: { equals: bob.id } } })).totalDocs, 0, collection)
  assert.equal((await json(await call(ratings))).body.count, 0)

  const carolLater = `eatyeet-member=${(await createSession(payload, carol.id)).token}`
  // Google entry points without configuration fail closed; a forged callback is rejected.
  assert.equal((await call('/google?returnTo=/')).status, 503)
  const callback = await call('/google/callback?code=x&state=y')
  assert.equal(callback.status, 303)
  assert.match(callback.headers.get('location')!, /\/account\/sign-in\?error=google$/)

  // Member records and their content are unreachable through Payload REST.
  for (const collection of ['members', 'member-sessions', 'member-workbenches', 'recipe-reviews', 'recipe-review-replies', 'recipe-ratings', 'recipe-rating-replies']) {
    for (const [method, path] of [['GET', ''], ['POST', ''], ['POST', '/login'], ['POST', '/forgot-password'], ['GET', '/me']]) {
      const response = await fetch(`${origin}/api/${collection}${path}`, { method, headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: carolLater },
        ...(method === 'POST' ? { body: JSON.stringify({ email: 'bob@example.com', password: 'x', recipe: recipeId, score: 5 }) } : {}) })
      assert(response.status >= 400, `${method} /api/${collection}${path} returned ${response.status}`)
      await response.text()
    }
  }
  assert.equal((await fetch(`${origin}/api/owners/me`, { headers: { Cookie: carolLater } }).then((r) => r.json()))?.user ?? null, null)

  // Drafts hide ratings from everyone.
  await payload.update({ collection: 'recipes', id: recipeId, overrideAccess: true, data: { status: 'draft' } })
  try {
    assert.equal((await call(ratings)).status, 404)
    assert.equal((await call(ratings, 'PUT', { score: 5, reviewText: '' }, carolLater)).status, 404)
  } finally {
    await payload.update({ collection: 'recipes', id: recipeId, overrideAccess: true, data: { status: 'published' } })
  }
}
