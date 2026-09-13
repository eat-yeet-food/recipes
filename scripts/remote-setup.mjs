import { parseArgs } from 'node:util'
import { readFileSync } from 'node:fs'
import { setupOperator, restoreOperator } from './remote/operator.mjs'
import { hiddenInput, unseal } from './remote/credentials.mjs'
import { command } from './remote/process.mjs'

const { values } = parseArgs({ options: { from: { type: 'string' }, restore: { type: 'string' } } })
if (values.from && values.restore) throw new Error('Choose --from or --restore')
if (values.restore) {
  restoreOperator(unseal(JSON.parse(readFileSync(values.restore, 'utf8')), await hiddenInput('Recovery passphrase')))
  console.log('Operator and environment credentials restored to Keychain.')
} else await setupOperator({ from: values.from })
await command('node', ['scripts/remote-cli.mjs', 'bootstrap', '--env', 'bootstrap'])
console.log('Setup complete. Deploy with pnpm run deploy --env staging|production.')
