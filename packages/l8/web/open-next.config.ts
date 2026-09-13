import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache'

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: 'long-lived',
    // Public projections are immutable within an environment/schema/generation.
    // The uncached release guard changes the key on sync, restore and rollback.
    // No tag-based revalidation or cached HTML is used by this application.
    bypassTagCacheOnCacheHit: true,
    shouldLazilyUpdateOnCacheHit: false,
    defaultLongLivedTtlSec: 86400,
  }),
})
