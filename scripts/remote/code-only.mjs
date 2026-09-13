export function assertCodeOnly(previous, migrations, plan) {
  if (previous?.status !== 'ready' || !previous.releaseId) throw new Error('Code-only release requires an existing healthy application')
  if (JSON.stringify(previous.migrations) !== JSON.stringify(migrations)) throw new Error('Code-only release cannot change migrations; use a full release')
  if (plan && (plan.status !== 'complete' || !['created', 'updated', 'retired'].every((name) => plan.counts?.[name] === 0) ||
    plan.siteChanged !== false || plan.mediaChanges !== 0)) throw new Error('Code-only release requires an unchanged content/media plan; use a full release')
}

// Verify existing immutable bytes with bounded concurrent HEAD requests, instead
// of uploading or walking every object serially. Settle every read before exit.
export async function verifyExistingMedia(store, objects) {
  for (let start = 0; start < objects.length; start += 8) {
    const results = await Promise.allSettled(objects.slice(start, start + 8).map(async ({ key, bytes, contentType }) => {
      if (!await store.matches(key, bytes(), contentType)) throw new Error(`Missing or changed media ${key}; use a full release to repair it`)
    }))
    const failed = results.find((result) => result.status === 'rejected')
    if (failed) throw failed.reason
  }
}
