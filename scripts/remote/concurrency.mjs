// Do not abandon in-flight mutations when one operation fails.
export async function concurrent(items, apply, limit = 8) {
  for (let offset = 0; offset < items.length; offset += limit) {
    const results = await Promise.allSettled(items.slice(offset, offset + limit).map(apply))
    const failed = results.find((result) => result.status === 'rejected')
    if (failed) throw failed.reason
  }
}
