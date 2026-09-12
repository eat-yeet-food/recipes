import { spawn, execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const digest = (value) => createHash('sha256').update(value).digest('hex')
export function cleanRevision() {
  if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) throw new Error('Remote releases require a clean committed checkout')
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
}
export function migrationManifest() {
  return Object.fromEntries(readdirSync('packages/l8/web/migrations').filter((name) => /^\d.*\.ts$/.test(name)).sort().map((name) => [name, digest(readFileSync(`packages/l8/web/migrations/${name}`))]))
}
export function assertCompatible(previous, next) {
  for (const [name, checksum] of Object.entries(previous ?? {})) if (next[name] !== checksum) throw new Error(`Previously released migration changed or disappeared: ${name}`)
  for (const name of Object.keys(next).filter((name) => !previous?.[name])) {
    const up = readFileSync(`packages/l8/web/migrations/${name}`, 'utf8').split('export async function down')[0]
    if (/\bDROP\s+(?:TABLE|COLUMN)|\bDELETE\s+FROM|\bTRUNCATE\b/i.test(up)) throw new Error(`Destructive migration requires a separately reviewed maintenance procedure: ${name}`)
  }
}
export function command(program, args, { env = {}, cwd, signal, input, capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd, env: { ...process.env, ...env }, signal,
      stdio: [input == null ? 'inherit' : 'pipe', capture ? 'pipe' : 'inherit', 'inherit'] })
    let output = ''
    if (capture) child.stdout.on('data', (bytes) => { output += bytes.toString() })
    if (input != null) child.stdin.end(input)
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve(output) : reject(new Error(`${program} ${args[0]} failed (${code ?? 'signal'})`)))
  })
}
