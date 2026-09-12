import assert from 'node:assert/strict'
import { it } from 'node:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { checkWorkspace } from './check-layer-imports.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'layer-check-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (path, value) => {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), typeof value === 'string' ? value : JSON.stringify(value))
  }
  for (const layer of [0, 1]) {
    const base = `packages/l${layer}/example`
    write(`${base}/src/index.ts`, 'export const value = 1')
    write(`${base}/project.json`, { name: `l${layer}-example`, sourceRoot: 'src', tags: [`layer:l${layer}`], metadata: { tsConfig: 'tsconfig.json' } })
    write(`${base}/package.json`, { name: `@eat-yeet/l${layer}-example`, exports: { '.': './src/index.ts' }, dependencies: layer ? { '@eat-yeet/l0-example': 'workspace:*' } : {} })
    write(`${base}/tsconfig.json`, { compilerOptions: { composite: true }, references: layer ? [{ path: '../../l0/example/tsconfig.json' }] : [] })
  }
  write('tsconfig.json', { references: [0, 1].map(layer => ({ path: `./packages/l${layer}/example/tsconfig.json` })) })
  return { root, write, check: () => checkWorkspace(root).errors.join('\n') }
}

it('accepts declared downward imports and checks import types and reexports', (t) => {
  const f = fixture(t)
  f.write('packages/l1/example/src/index.ts', "export { value } from '@eat-yeet/l0-example'\ntype X = import('@eat-yeet/l0-example').Value")
  assert.equal(f.check(), '')
  f.write('packages/l1/example/package.json', { name: '@eat-yeet/l1-example' })
  assert.match(f.check(), /missing dependency @eat-yeet\/l0-example/)
})

it('rejects upward, root, app-alias, fixture, and unresolved imports', (t) => {
  const f = fixture(t)
  for (const [source, expected] of [
    ["import '@eat-yeet/l1-example'", /l0 cannot import l1/],
    ["import '../../../../site.config.mjs'", /escapes package\/app ownership/],
    ["import '#site-config'", /root app configuration/],
    ["import '@app/recipes'", /designated web composition/],
    ["import('@eat-yeet/missing')", /unresolved workspace import/],
    ["import '#web-test/static-server'", /test support/],
    ["import('@eat-yeet/' + name)", /unresolved workspace import/],
    ["import '@eat-yeet/l1-example/private'", /unresolved package export/],
    ["import.meta.glob('/apps/other/generated/*.json')", /ownership/],
  ]) {
    f.write('packages/l0/example/src/index.ts', source)
    assert.match(f.check(), expected)
  }
})

it('checks directory metadata and TypeScript references', (t) => {
  const f = fixture(t)
  f.write('packages/l1/example/src/index.ts', "import '@eat-yeet/l0-example'")
  f.write('packages/l1/example/tsconfig.json', { compilerOptions: { composite: true } })
  assert.match(f.check(), /must reference packages\/l0/)
  f.write('packages/l1/example/project.json', { name: 'l9-example', tags: ['layer:l9'] })
  assert.match(f.check(), /directory, project name and layer tag must agree/)
  assert.match(f.check(), /metadata.tsConfig is required/)
})

it('checks app imports while allowing an adapter to load its own generated data', (t) => {
  const f = fixture(t)
  for (const app of ['one', 'two']) {
    f.write(`apps/${app}/src/index.ts`, `import.meta.glob('/apps/${app}/generated/*.json')`)
    f.write(`apps/${app}/package.json`, { name: `@eat-yeet/app-${app}` })
    f.write(`apps/${app}/tsconfig.json`, { compilerOptions: { composite: true }, references: [{ path: '../../packages/l0/example/tsconfig.json' }] })
  }
  f.write('tsconfig.json', { references: ['packages/l0/example', 'packages/l1/example', 'apps/one', 'apps/two'].map(path => ({ path: `${path}/tsconfig.json` })) })
  assert.equal(f.check(), '')
  f.write('apps/one/src/index.ts', "import '@eat-yeet/l0-example'")
  assert.match(f.check(), /missing dependency/)
  f.write('apps/one/src/index.ts', "import.meta.glob('/apps/two/generated/*.json')")
  assert.match(f.check(), /belong to their app adapter/)
})
