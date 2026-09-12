import { writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { localEnvironment, ROOT, WEB, stateDir } from './local-runtime.mjs'
import { resolve } from 'node:path'
const command = process.argv[2]
const vars = localEnvironment({ create: command === 'setup' })
const commands = {
  worker: ['exec', 'opennextjs-cloudflare', 'build', '--skipNextBuild'],
  setup: ['exec', 'tsx', 'scripts/content-cli.ts', 'migrate'],
  dev: [
    'exec',
    'next',
    'dev',
    WEB,
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    new URL(vars.LOCAL_ORIGIN).port,
  ],
  build: ['exec', 'next', 'build', WEB, '--webpack'],
  start: [
    'exec',
    'next',
    'start',
    WEB,
    '--hostname',
    '127.0.0.1',
    '--port',
    new URL(vars.LOCAL_ORIGIN).port,
  ],
  preview: [
    'exec',
    'wrangler',
    'dev',
    '--config',
    resolve(WEB, 'wrangler.jsonc'),
    '--local',
    '--ip',
    '127.0.0.1',
    '--port',
    new URL(vars.LOCAL_ORIGIN).port,
    '--persist-to',
    resolve(stateDir, 'wrangler'),
  ],
}
if (!commands[command]) throw new Error('Unknown local command')
if (command === 'preview')
  writeFileSync(
    resolve(WEB, '.dev.vars'),
    Object.entries(vars)
      .filter(([k]) =>
        [
          'PAYLOAD_SECRET',
          'OWNER_EMAIL',
          'LOCAL_ORIGIN',
          'SITE_URL',
          'SEO_AUDIT',
        ].includes(k),
      )
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join('\n'),
    { mode: 0o600 },
  )
const child = spawn('pnpm', commands[command], {
  cwd: command === 'worker' ? WEB : ROOT,
  env: {
    ...process.env,
    ...vars,
    NODE_ENV: ['build', 'start', 'preview', 'worker'].includes(command)
      ? 'production'
      : 'development',
  },
  stdio: 'inherit',
})
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
