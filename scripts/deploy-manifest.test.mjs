import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { assertDeployManifest, deploymentIdentity, writeDeployManifest } from './deploy-manifest.mjs'

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'eat-yeet-deploy-manifest-'))
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('deploy manifest accepts the matching app identity', () => {
  withTempDir((dir) => {
    const identity = deploymentIdentity({
      appId: 'eatyeet',
      cloudflareProject: 'eatyeet',
      siteUrl: 'https://eatyeet.com',
    })

    writeDeployManifest(dir, identity)

    assert.deepEqual(assertDeployManifest(dir, identity), identity)
  })
})

test('deploy manifest rejects a build for another app', () => {
  withTempDir((dir) => {
    writeDeployManifest(
      dir,
      deploymentIdentity({
        appId: 'dpizzaoven',
        cloudflareProject: 'dpizzaoven',
        siteUrl: 'https://dpizzaoven.com',
      }),
    )

    assert.throws(
      () =>
        assertDeployManifest(
          dir,
          deploymentIdentity({
            appId: 'eatyeet',
            cloudflareProject: 'eatyeet',
            siteUrl: 'https://eatyeet.com',
          }),
        ),
      /refusing to deploy build output for the wrong app/,
    )
  })
})
