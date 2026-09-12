import { toStoredRecord, storedSEO } from '@eat-yeet/l4-content-model/storage'
import { encodeFields, seoShape } from '@eat-yeet/l4-content-model/field-shapes'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
// This suite owns an isolated database; it never changes the development owner or sources.
mkdirSync('.local', { recursive: true })
process.env.LOCAL_STATE_DIR = mkdtempSync(resolve('.local', 'acceptance-'))
const { openLocalCMS } = await import('../scripts/cms-local')
const { updateOwner } = await import('../scripts/local-runtime.mjs')
const { sourceContent } = await import('../scripts/content-source.mjs')
const { planUpserts, applyUpserts, hashContent } =
  await import('../packages/l4/content-build/src/sync.mjs')
const { validateAuthored } =
  await import('../packages/l4/content-build/src/source-validation.mjs')
const { startApp } = await import('./app-server.mjs')
const evidence: string[] = []
const cms = await openLocalCMS(true),
  p = cms.payload
let server: any
try {
  await p.db.migrate()
  const source = sourceContent()
  source.records = source.records.map(toStoredRecord)
  const email = 'owner@local.example',
    password = 'acceptance-only-password-8492'
  updateOwner(email)
  process.env.OWNER_EMAIL = email
  const owner = await p.create({
    collection: 'owners',
    overrideAccess: true,
    data: { email, password },
  })
  await p.create({
    collection: 'owners',
    overrideAccess: true,
    data: { email: 'non-owner@local.example', password },
  })
  await p.updateGlobal({
    slug: 'site',
    overrideAccess: true,
    data: { content: source.site, sourceHash: hashContent(source.site) },
  })
  const recipeRecords = source.records.filter((r) => r.collection === 'recipes')
  const records = recipeRecords.slice(0, 2)
  let plan = await planUpserts(p, records)
  assert(plan.every((x) => x.action === 'create'))
  await applyUpserts(p, plan)
  const get = async () =>
    (
      await p.find({
        collection: 'recipes',
        overrideAccess: true,
        where: { sourceId: { equals: records[0].data.sourceId } },
      })
    ).docs[0]
  const initial = await get(),
    versions = await p.findVersions({
      collection: 'recipes',
      overrideAccess: true,
      pagination: false,
    })
  plan = await planUpserts(p, records)
  assert(plan.every((x) => x.action === 'unchanged'))
  await applyUpserts(p, plan)
  assert.equal(
    (
      await p.findVersions({
        collection: 'recipes',
        overrideAccess: true,
        pagination: false,
      })
    ).totalDocs,
    versions.totalDocs,
  )
  evidence.push(
    'Initial import and identical rerun preserve IDs and revision counts',
  )
  await p.update({
    collection: 'recipes',
    overrideAccess: true,
    id: initial.id,
    data: {
      title: 'Unexpected drift',
      searchAppearance: encodeFields(seoShape, { title: 'Removed override' }),
    },
  })
  plan = await planUpserts(p, records)
  assert.equal(plan[0].action, 'update')
  await applyUpserts(p, plan)
  assert.equal((await get()).id, initial.id)
  assert.equal(storedSEO(await get()), null)
  assert.equal((await get()).title, records[0].data.title)
  const retired = structuredClone(records)
  retired[0].data.status = 'archived'
  retired[0].data.sourceHash = hashContent(retired[0].data)
  plan = await planUpserts(p, retired)
  assert.equal(plan[0].action, 'retired')
  await applyUpserts(p, plan)
  assert(
    !(
      await p.find({ collection: 'recipes', overrideAccess: false, user: null })
    ).docs.some((d) => d.id === initial.id),
  )
  await applyUpserts(p, await planUpserts(p, records))
  assert.equal(
    (await p.find({ collection: 'recipes', overrideAccess: true })).totalDocs,
    2,
  )
  await applyUpserts(p, await planUpserts(p, records.slice(0, 1)))
  assert.equal(
    (await p.find({ collection: 'recipes', overrideAccess: true })).totalDocs,
    2,
  )
  evidence.push(
    'Drift repair, optional-field clearing, explicit retirement and missing-source retention',
  )
  const interrupted = await planUpserts(p, recipeRecords.slice(2, 4))
  let writes = 0
  await assert.rejects(
    () =>
      applyUpserts(
        {
          ...p,
          create: async (args: any) => {
            if (++writes === 2) throw new Error('Simulated interrupted write')
            return p.create(args)
          },
        } as any,
        interrupted,
      ),
    /interrupted/,
  )
  const retry = await planUpserts(p, recipeRecords.slice(2, 4))
  assert.deepEqual(
    retry.map((x) => x.action),
    ['unchanged', 'create'],
  )
  await applyUpserts(p, retry)
  evidence.push('Interrupted imports resume without duplicate records')
  for (const bad of ['<script>alert(1)</script>', '[x](javascript:alert(1))'])
    assert.throws(() => validateAuthored({ text: bad }))
  assert.throws(() => validateAuthored({ blocks: [{ type: 'executable' }] }))
  assert.throws(() => validateAuthored({ items: [{ id: 'a' }, { id: 'a' }] }))
  const draft = { ...records[0].data, status: 'draft' }
  await p.update({
    collection: 'recipes',
    overrideAccess: true,
    id: initial.id,
    data: draft,
  })
  server = await startApp()
  const origin = server.url.replace(/\/$/, '')
  const request = async (
    path: string,
    method = 'GET',
    body?: any,
    cookie?: string,
    extra = {},
  ) => {
    const response = await fetch(origin + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie, Origin: origin } : {}),
        ...extra,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    // Drain the network body even for status-only assertions, then give callers
    // an in-memory response. Unread large pages can keep Node sockets alive.
    const bytes = await response.arrayBuffer()
    return new Response(bytes, {
      status: response.status,
      headers: response.headers,
    })
  }
  assert.equal(
    (
      await request('/api/owners/login', 'POST', {
        email: 'non-owner@local.example',
        password,
      })
    ).ok,
    false,
  )
  const login = await request('/api/owners/login', 'POST', { email, password })
  assert.equal(login.status, 200, await login.clone().text())
  const setCookie = login.headers.get('set-cookie')!
  assert.match(setCookie, /HttpOnly/i)
  assert.match(setCookie, /SameSite=Lax/i)
  const cookie = setCookie.split(';')[0]
  assert(!('token' in (await login.json())))
  assert.equal(
    (await request('/api/owners/me', 'GET', undefined, cookie)).status,
    200,
  )
  assert.equal((await request('/api/recipes/' + initial.id, 'GET')).status, 404)
  assert.equal(
    (await request('/api/recipes/' + initial.id, 'GET', undefined, cookie))
      .status,
    200,
  )
  for (const [path, method, body] of [
    [`/api/recipes/${initial.id}`, 'PATCH', { title: 'Forbidden' }],
    [`/api/recipes/${initial.id}`, 'DELETE', {}],
    ['/api/owners', 'POST', { email: 'extra@example.com', password }],
    ['/api/media', 'POST', {}],
    ['/api/globals/site', 'POST', { content: {} }],
    [`/api/owners/${owner.id}`, 'PATCH', { email: 'stolen@example.com' }],
  ] as const) {
    const r = await request(path, method, body, cookie)
    assert([401, 403].includes(r.status), path + ' ' + r.status)
  }
  assert.equal(
    (await request('/api/recipes/versions', 'GET', undefined, cookie)).status,
    200,
  )
  assert.equal(
    (
      await request(
        `/preview/recipes/${initial.slug}`,
        'GET',
        undefined,
        cookie,
      )
    ).status,
    200,
  )
  assert.equal((await request(`/recipes/${initial.slug}`)).status, 404)
  assert(
    !(await (await request('/sitemap.xml')).text()).includes(
      String(initial.slug),
    ),
  )
  await p.update({
    collection: 'recipes',
    overrideAccess: true,
    id: initial.id,
    data: { status: 'published' },
  })
  assert.equal((await request(`/recipes/${initial.slug}`)).status, 200)
  assert(
    (await (await request('/sitemap.xml')).text()).includes(
      String(initial.slug),
    ),
  )
  const { default: sharp } = await import('sharp')
  const imageBytes = await sharp({
    create: { width: 160, height: 120, channels: 3, background: '#f5cf00' },
  })
    .webp()
    .toBuffer()
  const mediaHash = 'e'.repeat(64),
    key = mediaHash + '/160.webp',
    url = '/media/' + key
  await cms.bucket.put(key, imageBytes, {
    httpMetadata: { contentType: 'image/webp' },
  })
  const media = await p.create({
    collection: 'media',
    overrideAccess: true,
    data: {
      sourceId: mediaHash,
      public: false,
      alt: 'Private test image',
      manifest: {
        hash: mediaHash,
        names: ['private-test.webp'],
        variants: [
          {
            key,
            url,
            width: 160,
            height: 120,
            format: 'webp',
            bytes: imageBytes.length,
          },
        ],
        social: { key, url, format: 'webp' },
        url,
        width: 160,
        height: 120,
      },
    },
    file: {
      data: imageBytes,
      name: mediaHash + '.webp',
      mimetype: 'image/webp',
      size: imageBytes.length,
    },
  })
  assert.equal((await request(url)).status, 404)
  const privateImage = await request(url, 'GET', undefined, cookie)
  assert.equal(privateImage.status, 200)
  assert.equal(privateImage.headers.get('cache-control'), 'private, no-store')
  await p.update({
    collection: 'media',
    id: media.id,
    overrideAccess: true,
    data: { public: true },
  })
  assert.equal((await request(url)).status, 200)
  await cms.bucket.delete(key)
  const missingImage = await request(url)
  assert.equal(missingImage.status, 404)
  assert.equal(missingImage.headers.get('cache-control'), 'no-store')
  evidence.push(
    'Private media authorization, explicit public visibility and missing-object no-store behavior',
  )
  const { chromium } = await import('playwright'),
    browser = await chromium.launch()
  try {
    const context = await browser.newContext()
    const [name, ...value] = cookie.split('=')
    await context.addCookies([{ name, value: value.join('='), url: origin }])
    const page = await context.newPage()
    const adminErrors: string[] = []
    page.on('pageerror', (error) => adminErrors.push(error.message))
    const response = await page.goto(
      origin + '/admin/collections/recipes/' + initial.id,
      { waitUntil: 'networkidle' },
    )
    assert.equal(response?.status(), 200)
    assert(!page.url().includes('/login'))
    const field = page.locator('#field-title')
    assert(await field.count(), 'Admin title field renders')
    assert(
      await field.evaluate(
        (input: HTMLInputElement) => input.readOnly || input.disabled,
      ),
    )
    assert.equal(
      await page.getByRole('button', { name: 'Save', exact: true }).count(),
      0,
    )
    await page.screenshot({
      path: 'dist/admin-named-fields.png',
      fullPage: false,
    })
    assert.equal(
      await page.locator('#field-content').isVisible(),
      false,
      'No visible raw content JSON field',
    )
    assert(
      await page.getByLabel('Description', { exact: true }).first().isVisible(),
    )
    assert.equal(adminErrors.length, 0, adminErrors.join('\n'))
    await page.screenshot({ path: 'dist/admin-read-only.png', fullPage: false })
  } finally {
    await browser.close()
  }
  evidence.push(
    'Authenticated admin renders named description/shared block fields, no raw content JSON, a read-only title and no Save action',
  )
  await p.update({
    collection: 'owners',
    overrideAccess: true,
    id: owner.id,
    data: { sessions: [] },
  })
  const revoked = await (
    await request('/api/owners/me', 'GET', undefined, cookie)
  ).json()
  assert.equal(revoked.user, null)
  for (let i = 0; i < 5; i++)
    await request('/api/owners/login', 'POST', {
      email,
      password: 'wrong-password',
    })
  assert(
    [401, 403].includes(
      (await request('/api/owners/login', 'POST', { email, password })).status,
    ),
  )
  const locked = await p.findByID({
    collection: 'owners',
    id: owner.id,
    overrideAccess: true,
    showHiddenFields: true,
  })
  assert(
    new Date(locked.lockUntil as string).getTime() > Date.now() + 9 * 60 * 1000,
  )
  assert.equal(
    (
      await p.findByID({
        collection: 'owners',
        id: owner.id,
        overrideAccess: true,
      })
    ).email,
    email,
  )
  evidence.push(
    'Owner cookies, mutation denials, non-owner denial, private drafts/versions, publication without rebuild, revoked sessions and failed-login lockout',
  )
  writeFileSync(
    'dist/content-acceptance.json',
    JSON.stringify({ state: process.env.LOCAL_STATE_DIR, evidence }, null, 2),
  )
  console.log(evidence.join('\n'))
} finally {
  console.log('Closing isolated preview')
  await server?.close()
  console.log('Closing isolated D1/R2')
  await cms.close()
  console.log('Isolated content checks completed')
}
