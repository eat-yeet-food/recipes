import assert from 'node:assert/strict'
import type { Payload } from 'payload'
import { createSession, upsertGoogleMember } from './members'
import { KITCHEN_LIMITS } from './kitchen'

/**
 * Exercises the Test Kitchen API against the running app: ownership,
 * validation, autosave conflicts, history, restore, duplicate and soft
 * delete. `slug` names a published recipe with a pizza calculator.
 */
export async function verifyKitchen(payload: Payload, origin: string, slug: string, otherSlug: string) {
  const api = `${origin}/api/public/account/kitchen/formulas`
  const call = (path: string, method = 'GET', body?: unknown, cookie?: string, headers: Record<string, string> = {}) => fetch(api + path, {
    method, redirect: 'manual',
    headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = async (response: Response) => ({ status: response.status, body: await response.json() as any })
  const cook = async (sub: string, email: string) => {
    const member = (await upsertGoogleMember(payload, { sub, email, emailVerified: true, name: sub }))!
    return { member, cookie: `eatyeet-member=${(await createSession(payload, member.id)).token}` }
  }
  const dana = await cook('g-dana', 'dana@example.com')
  const eli = await cook('g-eli', 'eli@example.com')

  const state = {
    version: 1, methodId: 'outdoor-oven',
    batch: { count: 3, pieceWeightGrams: 480, diameterInches: 16, pieceLabel: 'ball' },
    formula: { family: 'pizza', hydrationPercent: 65, saltPercent: 2, oilPercent: 0, sugarPercent: 0, maltPercent: 0, yeastPercent: 0.25, levainPercent: 0,
      flour: [{ id: 'all-purpose', name: 'All-purpose flour', percent: 100 }] },
  }
  const create = (body: Record<string, unknown>, cookie = dana.cookie) => call('', 'POST', { recipeSlug: slug, name: 'Friday pies', state, notes: '', ...body }, cookie)

  // Signed out, cross-origin and malformed requests are refused before any write.
  assert.equal((await call('')).status, 401)
  assert.equal((await call('', 'POST', { recipeSlug: slug, name: 'x', state, notes: '' })).status, 401)
  assert.equal((await call('', 'POST', { recipeSlug: slug, name: 'Other', state, notes: '' }, dana.cookie, { Origin: 'https://other.example' })).status, 403)
  assert.equal((await create({})).status, 201)
  const listed = await json(await call('', 'GET', undefined, dana.cookie))
  assert.match((await call('', 'GET', undefined, dana.cookie)).headers.get('cache-control')!, /private, no-store/)
  assert.equal(listed.body.formulas.length, 1)
  const friday = listed.body.formulas[0]
  assert.match(friday.id, /^[A-Za-z0-9_-]{16}$/)
  for (const [body, status] of [
    [{ name: '' }, 400],
    [{ name: 'x'.repeat(81) }, 400],
    [{ notes: 'x'.repeat(2001) }, 400],
    [{ state: { ...state, version: 2 } }, 400],
    [{ state: { ...state, formula: { ...state.formula, flour: [{ id: 'a', name: 'A', percent: 90 }] } } }, 400],
    [{ state: { ...state, formula: { ...state.formula, family: 'sourdough' } } }, 400],
    [{ recipeSlug: 'missing-recipe', name: 'Missing' }, 404],
    [{ recipeSlug: otherSlug, name: 'No calculator' }, 404],
  ] as const) assert.equal((await create(body)).status, status, JSON.stringify(body).slice(0, 80))
  assert.equal((await call('', 'POST', { recipeSlug: slug, name: 'Extra', state, notes: '', admin: true }, dana.cookie)).status, 400)

  // Other members can neither see nor change the formula.
  assert.equal((await json(await call('', 'GET', undefined, eli.cookie))).body.formulas.length, 0)
  assert.equal((await call(`/${friday.id}`, 'GET', undefined, eli.cookie)).status, 404)
  assert.equal((await call(`/${friday.id}`, 'PATCH', { baseRevision: 1, name: 'Mine', state, notes: '' }, eli.cookie)).status, 404)
  assert.equal((await call(`/${friday.id}`, 'DELETE', undefined, eli.cookie)).status, 404)
  assert.equal((await call(`/${friday.id}/duplicate`, 'POST', { name: 'Stolen' }, eli.cookie)).status, 404)
  assert.equal((await call('/not-a-formula-id', 'GET', undefined, dana.cookie)).status, 404)

  // Autosave: a stale revision never overwrites; quick edits after the first save share one History entry.
  const save = (body: Record<string, unknown>) => call(`/${friday.id}`, 'PATCH', { name: 'Friday pies', state, notes: '', ...body }, dana.cookie)
  const hydrated = (value: number) => ({ ...state, formula: { ...state.formula, hydrationPercent: value } })
  let saved = await json(await save({ baseRevision: 1, state: hydrated(66) }))
  assert.equal(saved.status, 200)
  assert.equal(saved.body.revision, 2)
  assert.equal(saved.body.revisions.length, 2, 'the created entry stays separate')
  saved = await json(await save({ baseRevision: 2, state: hydrated(68) }))
  assert.deepEqual([saved.body.revision, saved.body.revisions.length, saved.body.revisions[0].state.formula.hydrationPercent], [3, 2, 68])
  const conflict = await json(await save({ baseRevision: 2, state: hydrated(70) }))
  assert.deepEqual([conflict.status, conflict.body.code], [409, 'conflict'])
  assert.equal((await json(await call(`/${friday.id}`, 'GET', undefined, dana.cookie))).body.state.formula.hydrationPercent, 68)

  // Restore writes a new entry, so it can be undone.
  const created = saved.body.revisions.at(-1)
  const restored = await json(await call(`/${friday.id}/restore`, 'POST', { revisionId: created.id }, dana.cookie))
  assert.deepEqual([restored.status, restored.body.state.formula.hydrationPercent, restored.body.revisions.length], [200, 65, 3])
  assert.equal((await call(`/${friday.id}/restore`, 'POST', { revisionId: '999999' }, dana.cookie)).status, 404)

  // History keeps the last 100 versions.
  const formulaDoc = (await payload.find({ collection: 'kitchen-formulas', overrideAccess: true, where: { formulaId: { equals: friday.id } } })).docs[0]!
  const old = new Date(Date.now() - 10 * 60000).toISOString()
  await payload.update({ collection: 'kitchen-revisions', overrideAccess: true, where: { formula: { equals: formulaDoc.id } }, data: { createdAt: old } as any })
  for (let index = 0; index < KITCHEN_LIMITS.revisions; index++)
    await payload.create({ collection: 'kitchen-revisions', overrideAccess: true, data: { formula: formulaDoc.id, member: Number(dana.member.id), name: 'Friday pies', state, notes: '' } as any })
  await payload.update({ collection: 'kitchen-revisions', overrideAccess: true, where: { formula: { equals: formulaDoc.id } }, data: { createdAt: old } as any })
  let current = (await json(await call(`/${friday.id}`, 'GET', undefined, dana.cookie))).body
  saved = await json(await save({ baseRevision: current.revision, state: hydrated(67) }))
  assert.equal(saved.status, 200)
  assert.equal((await payload.count({ collection: 'kitchen-revisions', overrideAccess: true, where: { formula: { equals: formulaDoc.id } } })).totalDocs, KITCHEN_LIMITS.revisions)
  assert.equal(saved.body.revisions[0].state.formula.hydrationPercent, 67)

  // New copies take the next free name; rename collisions are refused.
  const numbered = await json(await call(`/${friday.id}/duplicate`, 'POST', { name: 'friday PIES' }, dana.cookie))
  assert.deepEqual([numbered.status, numbered.body.name], [201, 'friday PIES 2'])
  assert.equal((await call(`/${numbered.body.id}`, 'DELETE', undefined, dana.cookie)).status, 200)
  await payload.delete({ collection: 'kitchen-revisions', overrideAccess: true, where: { formula: { equals: (await payload.find({ collection: 'kitchen-formulas', overrideAccess: true, where: { formulaId: { equals: numbered.body.id } } })).docs[0].id } } })
  await payload.delete({ collection: 'kitchen-formulas', overrideAccess: true, where: { formulaId: { equals: numbered.body.id } } })
  const copy = await json(await call(`/${friday.id}/duplicate`, 'POST', { name: 'Friday pies, 70%' }, dana.cookie))
  assert.deepEqual([copy.status, copy.body.revisions.length, copy.body.state.formula.hydrationPercent], [201, 1, 67])
  current = (await json(await call(`/${friday.id}`, 'GET', undefined, dana.cookie))).body
  assert.equal((await json(await save({ baseRevision: current.revision, name: 'Friday pies, 70%', state: hydrated(67) }))).body.code, 'name-taken')

  // Delete is soft: the name is released, the formula restorable, other members unaffected.
  const removed = await json(await call(`/${copy.body.id}`, 'DELETE', undefined, dana.cookie))
  assert.equal(removed.status, 200)
  assert(removed.body.deletedAt)
  let library = (await json(await call('', 'GET', undefined, dana.cookie))).body
  assert.deepEqual([library.formulas.length, library.deleted.length], [1, 1])
  assert.equal((await call(`/${copy.body.id}`, 'PATCH', { baseRevision: copy.body.revision, name: 'x', state, notes: '' }, dana.cookie)).status, 404)
  const reused = await json(await create({ name: 'Friday pies, 70%' }))
  assert.equal(reused.status, 201)
  const back = await json(await call(`/${copy.body.id}/undelete`, 'POST', undefined, dana.cookie))
  assert.deepEqual([back.status, back.body.name, back.body.deletedAt], [200, 'Friday pies, 70% 2', null])

  // Deletions older than 30 days are purged on the next list.
  await call(`/${reused.body.id}`, 'DELETE', undefined, dana.cookie)
  await payload.update({ collection: 'kitchen-formulas', overrideAccess: true, where: { formulaId: { equals: reused.body.id } }, data: { deletedAt: new Date(Date.now() - 31 * 86400000).toISOString() } })
  library = (await json(await call('', 'GET', undefined, dana.cookie))).body
  assert.equal(library.deleted.length, 0)
  assert.equal((await payload.count({ collection: 'kitchen-formulas', overrideAccess: true, where: { formulaId: { equals: reused.body.id } } })).totalDocs, 0)

  // Kitchen collections are unreachable through Payload REST.
  for (const collection of ['kitchen-formulas', 'kitchen-revisions'])
    for (const [method, path] of [['GET', ''], ['POST', ''], ['GET', `/${formulaDoc.id}`]]) {
      const response = await fetch(`${origin}/api/${collection}${path}`, { method, headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: dana.cookie },
        ...(method === 'POST' ? { body: JSON.stringify({ formulaId: 'x', member: dana.member.id, name: 'x', state }) } : {}) })
      assert(response.status >= 400, `${method} /api/${collection}${path} returned ${response.status}`)
      await response.text()
    }

  // Account deletion removes every formula and its history.
  const deleted = await fetch(`${origin}/api/public/account/delete`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: dana.cookie }, body: JSON.stringify({ email: 'dana@example.com' }) })
  assert.equal(deleted.status, 200)
  for (const collection of ['kitchen-formulas', 'kitchen-revisions'] as const)
    assert.equal((await payload.count({ collection, overrideAccess: true, where: { member: { equals: Number(dana.member.id) } } })).totalDocs, 0, collection)
}
