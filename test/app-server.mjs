/** Production Next preview with persistent local D1/R2. Never accepts a remote test origin. */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
export async function startApp() {
  if (process.env.TEST_ORIGIN) {
    const url = new URL(process.env.TEST_ORIGIN)
    if (url.hostname !== '127.0.0.1') throw new Error('Tests require loopback')
    return { url: url.href, close: async () => {} }
  }
  const probe = createServer()
  await new Promise((r) => probe.listen(0, '127.0.0.1', r))
  const port = probe.address().port
  await new Promise((r) => probe.close(r))
  const url = `http://127.0.0.1:${port}/`
  const child = spawn(process.execPath, ['scripts/local.mjs', 'start'], {
    detached: process.platform !== 'win32',
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, LOCAL_ORIGIN: url.slice(0, -1), SEO_AUDIT: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (b) => (output += b))
  child.stderr.on('data', (b) => (output += b))
  const close = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return
    const exited = new Promise((r) => child.once('exit', r))
    const signal = (name) => {
      try {
        if (process.platform === 'win32') child.kill(name)
        else process.kill(-child.pid, name)
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
    signal('SIGTERM')
    const force = setTimeout(() => signal('SIGKILL'), 5000)
    try {
      await exited
    } finally {
      clearTimeout(force)
    }
  }
  try {
    for (let i = 0; i < 120; i++) {
      if (child.exitCode !== null) throw new Error(output)
      try {
        const response = await fetch(url)
        await response.body?.cancel()
        if (response.ok) return { url, close }
      } catch {}
      await new Promise((r) => setTimeout(r, 250))
    }
    throw new Error('Local preview did not become ready: ' + output)
  } catch (error) {
    await close()
    throw error
  }
}
