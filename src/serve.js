/**
 * Dev server. Re-reads the fixtures and re-renders on every request, so
 * editing a markdown file and refreshing is the whole authoring loop.
 *
 * Serves exactly what the build writes — same `render()`, same single file —
 * so what you see here is what lands in dist/recipes.html.
 */

import { createServer } from 'node:http'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadRecipes } from './parse.js'
import { render } from './render.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES = join(ROOT, 'fixtures', 'recipes')
const PORT = Number(process.env.PORT ?? 4321)

createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(204).end()
    return
  }
  try {
    const html = render(loadRecipes(FIXTURES))
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(html)
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`Render failed:\n\n${error.stack}`)
  }
}).listen(PORT, () => {
  console.log(`Recipes dev server -> http://localhost:${PORT}`)
})
