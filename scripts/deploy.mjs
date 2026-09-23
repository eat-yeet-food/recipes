import { command, cleanRevision } from './remote/process.mjs'
import { deploymentCredentials } from './remote/operator.mjs'
import { ownerAccessSession } from './remote/access-session.mjs'
import { pathToFileURL } from 'node:url'

export async function deploy(args, context = {}) {
  args = args.flatMap((argument) => argument.startsWith('--env=') ? ['--env', argument.slice(6)] : [argument])
  const run = context.command ?? command, credentials = context.credentials ?? deploymentCredentials
  const authenticate = context.authenticate ?? ownerAccessSession, revision = context.revision ?? cleanRevision
  const environment = args.indexOf('--env')
  if (environment >= 0 && args[environment + 1] === 'both') {
    if (args.includes('--resume') || args.includes('--rollback')) throw new Error('Resume and rollback target one explicit environment')
    const candidate = revision()
    // Collect all interactive authentication before staging starts, so production
    // never discovers missing credentials after the operator has left.
    credentials('staging')
    credentials('production')
    const session = await authenticate('https://staging.eatyeet.com')
    for (const target of ['staging', 'production']) {
      if (revision() !== candidate) throw new Error('Source commit changed between environments; production was not started')
      const forwarded = [...args]; forwarded[environment + 1] = target
      await run('node', ['scripts/remote-cli.mjs', 'deploy', ...forwarded], {
        env: target === 'staging' ? { EATYEET_ACCESS_TOKEN: session } : {},
      })
    }
  } else await run('node', ['scripts/remote-cli.mjs', 'deploy', ...args])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await deploy(process.argv.slice(2))
