import {
  writeFileSync,
  mkdirSync,
  openSync,
  closeSync,
  unlinkSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { openLocalCMS } from './cms-local'
import { ACTIVE_APP } from '#site-config'
import { pathToFileURL } from 'node:url'
import { toStoredRecord } from '@eat-yeet/l4-content-model/storage'
import { sourceContent } from './content-source.mjs'
import { syncMediaItem } from '../packages/l4/content-build/src/media-sync.mjs'
import { prepareImage } from '../packages/l4/content-build/src/images.mjs'
import {
  planUpserts,
  applyUpserts,
  canonical,
  hashContent,
} from '../packages/l4/content-build/src/sync.mjs'
import { stateDir, updateOwner } from './local-runtime.mjs'
const action = process.argv[2]
if (
  !['plan', 'sync', 'migrate', 'owner', 'recover', 'migration:create'].includes(
    action,
  )
)
  throw new Error('Unknown content command')
// Validate the complete source set before connecting or writing any content.
const source = ['plan', 'sync'].includes(action) ? sourceContent() : null
const lock = resolve(stateDir, 'content-sync.lock')
if (action === 'sync') {
  try {
    const fd = openSync(lock, 'wx', 0o600)
    writeFileSync(fd, String(process.pid))
    closeSync(fd)
  } catch {
    throw new Error(
      'Another sync owns ' +
        lock +
        '. If interrupted, verify its PID is no longer running before removing the lock.',
    )
  }
}
let cms: Awaited<ReturnType<typeof openLocalCMS>>
try {
  cms = await openLocalCMS(action === 'migrate')


  if (action === 'migration:create')
    await cms.payload.db.createMigration({
      payload: cms.payload,
      migrationName: process.argv[3] || 'schema_change',
      forceAcceptWarning: true,
    })
  if (action === 'migrate') {
    await cms.payload.db.migrate()
    console.log(
      'Local migrations applied. Next run owner:bootstrap and content:sync.',
    )
  }
  if (action === 'owner' || action === 'recover') {
    const rl = createInterface({ input: stdin, output: stdout })
    const email = (
      process.env.OWNER_BOOTSTRAP_EMAIL || (await rl.question('Owner email: '))
    )
      .trim()
      .toLowerCase()
    rl.close()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error('Valid email required')
    let password = process.env.OWNER_BOOTSTRAP_PASSWORD
    if (!password) {
      if (!stdin.isTTY)
        throw new Error(
          'Use an interactive terminal or supply OWNER_BOOTSTRAP_PASSWORD via the environment',
        )
      stdout.write('Owner password (hidden): ')
      stdin.setRawMode(true)
      stdin.resume()
      password = await new Promise<string>((resolve, reject) => {
        let value = ''
        const onData = (b: Buffer) => {
          const s = b.toString()
          if (s === '\u0003') {
            cleanup()
            reject(new Error('Cancelled'))
          } else if (s === '\r' || s === '\n') {
            cleanup()
            stdout.write('\n')
            resolve(value)
          } else if (s === '\u007f') value = value.slice(0, -1)
          else value += s
        }
        const cleanup = () => {
          stdin.off('data', onData)
          stdin.setRawMode(false)
          stdin.pause()
        }
        stdin.on('data', onData)
      })
    }
    if (password.length < 9)
      throw new Error('Use a unique password of at least 9 characters')
    const { docs } = await cms.payload.find({
      collection: 'owners',
      overrideAccess: true,
      limit: 2,
    })
    if (action === 'owner' && docs.length)
      throw new Error('Owner already exists; use owner:recover')
    if (action === 'recover' && (!docs[0] || docs[0].email !== email))
      throw new Error('Recovery must match the existing owner')
    if (action === 'owner')
      await cms.payload.create({
        collection: 'owners',
        overrideAccess: true,
        data: { email, password },
      })
    else
      await cms.payload.update({
        collection: 'owners',
        id: docs[0].id,
        overrideAccess: true,
        data: { password, sessions: [], loginAttempts: 0, lockUntil: null },
      })
    updateOwner(email)
    console.log(
      'Owner configured. Restart running servers to load the owner identity.',
    )
  }
  if (source) {
    // Validate workbench configuration with the actual app-owned plugin registry.
    const { recipeWorkbenchRegistry } = await import(
      pathToFileURL(resolve('apps', ACTIVE_APP.id, 'src/recipe-workbenches.ts'))
        .href
    )
    for (const { data } of source.records) {
      const w = data.content.workbench
      if (w) {
        const p = recipeWorkbenchRegistry.get(w.id)
        if (!p || !p.defaultState(w.config))
          throw new Error(`Invalid workbench: ${data.sourceId}`)
        p.resolveRecipe(data.content, w.config, p.defaultState(w.config))
      }
    }
    const manifests = []
    for (const image of source.images) {
      const manifest = await prepareImage(
        image.path,
        resolve(stateDir, 'images'),
        image.focalPoint,
      )
      manifests.push({ ...image, manifest })
    }
    const imageReferences = Object.fromEntries(
      manifests.map((m) => [m.name, m.manifest.hash]),
    )
    source.site.mediaReferences = Object.fromEntries(
      manifests.filter((m) => m.public).map((m) => [m.name, m.manifest.hash]),
    )
    for (const { data } of source.records) {
      const names = new Set<string>()
      const visit = (v: any) => {
        if (!v || typeof v !== 'object') return
        for (const [key, value] of Object.entries(v)) {
          if (
            ['image', 'src'].includes(key) &&
            typeof value === 'string' &&
            value
          )
            names.add(value.replace(/^\/images\//, '').split('?')[0])
          else visit(value)
        }
      }
      visit(data.content)
      visit(data.seo)
      data.content.mediaReferences = Object.fromEntries(
        [...names].map((name) => [name, imageReferences[name]]),
      )
      if (data.content.image)
        data.content.imageHash =
          imageReferences[data.content.image.replace(/^\/images\//, '')] ?? ''
      const { sourceHash, gitRevision, ...managed } = data
      data.sourceHash = hashContent(managed)
    }
    const plan = await planUpserts(
      cms.payload,
      source.records.map(toStoredRecord),
    )
    for (const item of plan)
      console.log(
        `${action === 'sync' ? 'planned ' : ''}${item.action} ${item.data.sourceId}`,
      )
    const merged = new Map<string, any>()
    for (const item of manifests) {
      const key = item.manifest.hash
      const old = merged.get(key)
      merged.set(key, {
        ...item,
        public: Boolean(item.public || old?.public),
        names: [...(old?.names ?? []), item.name],
      })
    }
    for (const item of merged.values()) {
      const manifest = { ...item.manifest, names: item.names, alt: item.alt }
      const { docs } = await cms.payload.find({
        collection: 'media',
        overrideAccess: true,
        where: { sourceId: { equals: manifest.hash } },
        limit: 1,
      })
      const old = docs[0]
      const changed =
        !old ||
        canonical(old.manifest) !== canonical(manifest) ||
        old.public !== item.public
      console.log(
        `${!old ? 'create' : changed ? 'update' : 'unchanged'} media:${item.names.join(',')}`,
      )
      if (action === 'sync')
        await syncMediaItem(
          cms.payload,
          cms.bucket,
          { ...item, manifest },
          old,
          changed,
          resolve(stateDir, 'images'),
        )
    }

    const current = await cms.payload.findGlobal({
      slug: 'site',
      overrideAccess: true,
      depth: 0,
    })
    const siteChanged = canonical(current.content) !== canonical(source.site)
    console.log(`${siteChanged ? 'update' : 'unchanged'} site`)
    if (action === 'sync') {
      await applyUpserts(cms.payload, plan)
      if (siteChanged)
        await cms.payload.updateGlobal({
          slug: 'site',
          overrideAccess: true,
          data: {
            content: source.site,
            sourceHash: hashContent(source.site),
            gitRevision: source.gitRevision,
          },
        })
    }
    mkdirSync(resolve('dist'), { recursive: true })
    const counts = {
      created: plan.filter((x) => x.action === 'create').length,
      updated: plan.filter((x) => x.action === 'update').length,
      unchanged: plan.filter((x) => x.action === 'unchanged').length,
      retired: plan.filter((x) => x.action === 'retired').length,
    }
    if (action === 'sync') console.log('Sync completed:', counts)
    writeFileSync(
      resolve('dist', `content-${action}.json`),
      JSON.stringify(
        {
          status: 'complete',
          counts,
          gitRevision: source.gitRevision,
          records: plan.map(({ data, action }) => ({
            sourceId: data.sourceId,
            action,
          })),
          images: manifests.map(({ name, manifest }) => ({
            name,
            ...manifest,
          })),
        },
        null,
        2,
      ),
    )
  }
} catch (error) {
  if (source) {
    mkdirSync('dist', { recursive: true })
    writeFileSync(
      resolve('dist', `content-${action}.json`),
      JSON.stringify({
        status: 'failed',
        gitRevision: source.gitRevision,
        error: error instanceof Error ? error.message : 'Sync failed',
      }),
    )
  }
  throw error
} finally {
  if (cms!) await cms.close()
  if (action === 'sync') unlinkSync(lock)
}
