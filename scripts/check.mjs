#!/usr/bin/env node
/**
 * Fast local loop (`pnpm check`): static checks in parallel, one production
 * build, one app server, and the recipe/Notebook/interaction browser suites
 * in parallel against it. The full gate (Storybook render, a11y sweep,
 * Lighthouse, shots, parity, content/remote integration) stays in
 * `pnpm verify` before deploys.
 */
import { execFileSync, spawn } from 'node:child_process'
import { startApp } from '../test/app-server.mjs'

const started = Date.now()
const seconds = (from) => `${((Date.now() - from) / 1000).toFixed(1)}s`

function run(name, command, args, env = {}) {
  const t = Date.now()
  return new Promise((resolve) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk })
    child.stderr.on('data', (chunk) => { output += chunk })
    child.on('exit', (code) => {
      const ok = code === 0
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${seconds(t)})`)
      if (!ok) console.log(output.slice(-3000))
      resolve(ok)
    })
  })
}

const node = process.execPath
const pnpm = 'pnpm'
const failures = []
const record = (results) => results.forEach(([name, ok]) => { if (!ok) failures.push(name) })

const stage = async (jobs) => record(await Promise.all(jobs.map(async ([name, cmd, args, env]) => [name, await run(name, cmd, args, env)])))

await stage([
  ['design system', pnpm, ['-s', 'test:design-system']],
  ['unit', pnpm, ['-s', 'test:unit']],
  ['boundaries', pnpm, ['-s', 'boundaries']],
  ['typecheck', pnpm, ['-s', 'typecheck:ts']],
])
if (failures.length) finish()

await stage([['build', pnpm, ['-s', 'build']]])
if (failures.length) finish()

const server = await startApp()
try {
  // Each suite signs in as its own test member: creating a test session
  // clears that member's Notebook formulas, so a shared member races.
  const env = { TEST_ORIGIN: server.url }
  // One session per suite, created sequentially: concurrent local CMS opens fail.
  const session = (lane) => execFileSync('pnpm', ['-s', 'exec', 'tsx', 'scripts/test-member-session.ts'], { env: { ...process.env, TEST_MEMBER: lane }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim().split('\n').at(-1)
  const lanes = Object.fromEntries(['recipes', 'notebook', 'interaction'].map((lane) => [lane, { TEST_MEMBER: lane, TEST_MEMBER_TOKEN: session(lane) }]))
  await stage([
    ['recipe pages', node, ['packages/l8/web/src/routes/recipes/$slug/recipe-pages.test.mjs'], { ...env, ...lanes.recipes }],
    ['notebook', node, ['packages/l8/web/src/routes/notebook/notebook.test.mjs'], { ...env, ...lanes.notebook }],
    ['interaction', node, ['packages/l8/web/src/routes/interact.test.mjs'], { ...env, ...lanes.interaction }],
  ])
} finally {
  await server.close()
}
finish()

function finish() {
  console.log(failures.length ? `\ncheck FAILED in ${seconds(started)}: ${failures.join(', ')}` : `\ncheck passed in ${seconds(started)}`)
  process.exit(failures.length ? 1 : 0)
}
