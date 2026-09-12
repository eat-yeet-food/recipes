import { command } from './remote/process.mjs'
await command('node', ['scripts/remote-cli.mjs', 'deploy', ...process.argv.slice(2)])
