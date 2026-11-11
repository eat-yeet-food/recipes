import { appRemixResolve, APP_API_HEADERS, REMIX_STATE_BYTES } from '../../../../../../../../next/app-api'
export const dynamic = 'force-dynamic'
const fail = (error: string, status: number) => Response.json({ error }, { status, headers: APP_API_HEADERS })

/** Computes a Remix state's bake sheet. Public and stateless: nothing is read from or written to accounts. */
export async function POST(request: Request, route: { params: Promise<{ slug: string }> }) {
  const { slug } = await route.params
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return fail('Recipe not found.', 404)
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return fail('Unsupported request.', 400)
  const text = await request.text()
  if (text.length > REMIX_STATE_BYTES) return fail('Unsupported request.', 400)
  let body: any
  try { body = JSON.parse(text) } catch { return fail('Unsupported request.', 400) }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).join() !== 'state' || !body.state || typeof body.state !== 'object') return fail('Unsupported request.', 400)
  const result = await appRemixResolve(slug, body.state)
  return result ? Response.json(result, { headers: APP_API_HEADERS }) : fail('Recipe not found.', 404)
}
