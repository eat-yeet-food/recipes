import { LocalWorkspace } from '@pulumi/pulumi/automation/index.js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

export async function infrastructure(config, credentials) {
  const pin = JSON.parse(readFileSync('infra/cloudflare/toolchain.json', 'utf8')).pulumi
  if (execFileSync('pulumi', ['version'], { encoding: 'utf8' }).trim() !== `v${pin}`) throw new Error(`Use pinned Pulumi ${pin}`)
  // The pinned CLI uses Go CDK 0.37: SDK v2 accepts an explicit HTTPS endpoint,
  // but neither of the path-style query options supported by newer versions.
  const endpoint = encodeURIComponent(`https://${config.accountId}.r2.cloudflarestorage.com`)
  const stack = await LocalWorkspace.createOrSelectStack({ stackName: config.environment, workDir: resolve('infra/cloudflare') }, {
    envVars: {
      PULUMI_BACKEND_URL: `s3://${config.stateBucket}/pulumi?endpoint=${endpoint}&region=auto&awssdk=v2`,
      PULUMI_CONFIG_PASSPHRASE: credentials.PULUMI_CONFIG_PASSPHRASE,
      AWS_ACCESS_KEY_ID: credentials.R2_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY: credentials.R2_SECRET_ACCESS_KEY,
      AWS_REGION: 'auto', AWS_EC2_METADATA_DISABLED: 'true',
      CLOUDFLARE_API_TOKEN: credentials.CLOUDFLARE_API_TOKEN,
      PAYLOAD_SECRET: credentials.PAYLOAD_SECRET, RELEASE_VERIFY_SECRET: credentials.RELEASE_VERIFY_SECRET,
    },
    secretsProvider: 'passphrase',
  })
  await stack.setConfig('eatyeet:settings', { value: JSON.stringify(config) })
  return stack
}
export async function saveOutputs(stack, environment) {
  const output = (await stack.outputs()).resources?.value
  if (!output) throw new Error('Infrastructure outputs are unavailable')
  const directory = resolve('.local/remote', environment)
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  writeFileSync(resolve(directory, 'outputs.json'), JSON.stringify(output, null, 2), { mode: 0o600 })
  return output
}
export function readOutputs(environment) {
  try { return JSON.parse(readFileSync(resolve('.local/remote', environment, 'outputs.json'), 'utf8')) }
  catch { throw new Error('Run remote:infra up to provision and record verified bindings first') }
}
