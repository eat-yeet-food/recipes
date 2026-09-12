/** Shared static transport mechanics; recipe/article service contracts stay independent. */
export type GeneratedBodyModules<Body> = Record<string, () => Promise<{ default: Body }>>

export function listGenerated<Summary>(index: Summary[], request: { limit?: number } = {}) {
  const limit = request.limit && request.limit > 0 ? request.limit : undefined
  return limit ? index.slice(0, limit) : index
}

export async function getGenerated<Body>(bodies: GeneratedBodyModules<Body>, directory: string, slug: string): Promise<Body | null> {
  const key = `${directory}/${slug}.json`
  if (!Object.hasOwn(bodies, key)) return null
  return (await bodies[key]()).default
}
