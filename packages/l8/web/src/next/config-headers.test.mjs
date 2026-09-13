import test from 'node:test'
import assert from 'node:assert/strict'
import { withPayload } from '@payloadcms/next/withPayload'
import { scopePayloadClientHints } from './config-headers.mjs'

test('installed Payload client hints are scoped to admin without removing application security headers', async () => {
  const security = { source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }] }
  const rules = scopePayloadClientHints(await withPayload({ headers: async () => [security] }).headers())
  assert.deepEqual(rules[0], security)
  const publicHeaders = rules.filter((rule) => rule.source === '/:path*').flatMap((rule) => rule.headers)
  assert.ok(!publicHeaders.some(({ key }) => ['accept-ch', 'critical-ch', 'vary'].includes(key.toLowerCase())))
  const admin = rules.filter((rule) => rule.source === '/admin/:path*').flatMap((rule) => rule.headers)
  for (const key of ['Accept-CH', 'Critical-CH', 'Vary']) assert.equal(admin.find((header) => header.key === key)?.value, 'Sec-CH-Prefers-Color-Scheme')
})

test('unrelated and already scoped hint policies are preserved', () => {
  const rules = [{ source: '/admin/:path*', headers: [{ key: 'Critical-CH', value: 'Sec-CH-Prefers-Color-Scheme' }] },
    { source: '/:path*', headers: [{ key: 'Critical-CH', value: 'Other-Hint' }] }]
  assert.deepEqual(scopePayloadClientHints(rules), rules)
})
