/**
 * Await prefetch only for SSR. Client navigation can render immediately and
 * let React Query fill data from cache or the configured query function.
 */
export function ssrPrefetch(promise: Promise<unknown>): Promise<void> {
  if (typeof window !== 'undefined') return Promise.resolve()
  return promise.then(() => undefined)
}
