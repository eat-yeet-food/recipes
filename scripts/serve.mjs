/**
 * Serve the prerendered build the way Cloudflare Pages does — clean URLs
 * resolve to their directory's index.html — so what you see locally is what
 * the deployed site does.
 *
 *   npm run serve            # http://127.0.0.1:4321
 *   PORT=5000 npm run serve
 */

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

import { startStatic } from '../test/static-server.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.output', 'public')

if (!existsSync(OUT)) {
  console.error('No build at .output/public — run `npm run build` first.')
  process.exit(1)
}

const port = Number(process.env.PORT ?? 4321)
const server = await startStatic(OUT, port)

console.log(`\n  Recipes  ->  ${server.url}\n`)
for (const path of ['', 'recipes', 'search', 'browse', 'recipes/charred-crust-pizza']) {
  console.log(`    ${server.url}${path}`)
}
console.log('\n  Ctrl-C to stop.\n')
