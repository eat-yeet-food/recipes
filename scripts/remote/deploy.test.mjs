import test from 'node:test'
import assert from 'node:assert/strict'
import { deploy } from '../deploy.mjs'

test('both environments authenticate first, stop on staging failure, and cannot promote a different commit', async () => {
  for (const failure of [null, 'staging', 'changed']) {
    const events = []
    let revision = 'a'
    const run = deploy(['--env', 'both'], {
      revision: () => revision,
      credentials: (environment) => events.push(`credentials:${environment}`),
      authenticate: async () => { events.push('auth'); return 'private-session' },
      command: async (_program, args, options) => {
        const environment = args.at(-1)
        events.push(environment)
        assert.equal(options.env.EATYEET_ACCESS_TOKEN, environment === 'staging' ? 'private-session' : undefined)
        if (failure === 'staging') throw new Error('staging failed')
        if (failure === 'changed') revision = 'b'
      },
    })
    if (failure) await assert.rejects(run, /staging failed|commit changed/)
    else await run
    assert.deepEqual(events, ['credentials:staging', 'credentials:production', 'auth', 'staging', ...(!failure ? ['production'] : [])])
  }
})
