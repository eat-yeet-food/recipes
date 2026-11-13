import 'server-only'
import { mcpSettings } from '../cms'

/**
 * After a trial write, start a new cache generation so cached pages, data
 * projections and listings show it. The write is conditional on the object we
 * read (a deploy writing at the same moment wins), and it only happens while
 * the site is `ready`, never during maintenance or acceptance. Locally there
 * is no release state or cache, so nothing to do.
 */
export async function refreshPublicCaches(): Promise<'refreshed' | 'local' | 'deferred'> {
  const operations = mcpSettings().operations
  if (!operations) return 'local'
  try {
    const object = await operations.get('control.json')
    if (!object) return 'deferred'
    const state = await object.json() as Record<string, unknown>
    if (state.status !== 'ready' || !state.generation) return 'deferred'
    const written = await operations.put('control.json', JSON.stringify({ ...state, generation: crypto.randomUUID() }),
      { onlyIf: { etagMatches: object.etag }, httpMetadata: { contentType: 'application/json' } })
    return written ? 'refreshed' : 'deferred'
  } catch (error) {
    console.error(JSON.stringify({ event: 'mcp_cache_refresh_failed', message: String(error) }))
    return 'deferred'
  }
}
