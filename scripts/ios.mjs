#!/usr/bin/env node
// Drives the native iOS app in mobile/ios. Every subcommand ends with one JSON line:
// {"ok":true,"step":"sim","ms":1234,"artifact":"…"}.
//
//   pnpm ios gen                     regenerate the Xcode project (XcodeGen)
//   pnpm ios build [--device]        incremental build for the pinned Simulator or the phone
//   pnpm ios test [--ui]             unit tests (add --ui for the XCUITest smoke + a11y audit)
//   pnpm ios sim [url]               build, install, launch, open a deep link, screenshot
//   pnpm ios shot [url]              screenshot the running Simulator (optionally after a deep link)
//   pnpm ios device [url]            build, install and launch on the phone (USB or same Wi-Fi)
//   pnpm ios record <seconds> [url]  record a Simulator video
//   pnpm ios resign [--force]        reinstall on the phone when the free profile has < 2 days left
//   pnpm ios team                    write Config/Signing.local.xcconfig from Xcode's Personal Team
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const ios = join(root, 'mobile/ios')
const derived = join(ios, 'build/DerivedData')
const out = join(root, 'dist/ios')
const bundleId = 'com.phoganuci.eatyeet'
const simulator = process.env.IOS_SIMULATOR ?? 'E597190D-1926-43B1-A79D-B350E9CECE23' // iPhone 17 Pro
const device = process.env.IOS_DEVICE ?? 'B9B688DD-6FE1-5DE9-9421-664453D23B23' // the owner's iPhone 15 Pro
const started = Date.now()

const [command = 'help', ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((arg) => arg.startsWith('--')))
const args = rest.filter((arg) => !arg.startsWith('--'))

function finish(ok, extra = {}) {
  console.log(JSON.stringify({ ok, step: command, ms: Date.now() - started, ...extra }))
  process.exit(ok ? 0 : 1)
}

function run(cmd, cmdArgs, { quiet = false, allowFail = false, cwd = ios } = {}) {
  const result = spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', stdio: quiet ? 'pipe' : ['ignore', 'pipe', 'pipe'] })
  if (!quiet && result.stdout) process.stderr.write(result.stdout)
  if (result.status !== 0 && !allowFail) {
    process.stderr.write(result.stderr ?? '')
    finish(false, { error: `${cmd} ${cmdArgs.slice(0, 3).join(' ')} exited ${result.status}` })
  }
  return result
}

function xcodebuild(xcArgs, cwd = ios) {
  // Pipe through xcbeautify so agent output stays short; keep the raw log for failures.
  mkdirSync(out, { recursive: true })
  const log = join(out, 'xcodebuild.log')
  const script = `set -o pipefail; xcodebuild ${xcArgs.map((a) => `'${a}'`).join(' ')} 2>&1 | tee '${log}' | xcbeautify --quiet --disable-logging`
  const result = spawnSync('zsh', ['-c', script], { cwd, encoding: 'utf8' })
  process.stderr.write((result.stdout ?? '').split('\n').filter((l) => /error|warning: |Failed|❌/.test(l)).slice(0, 40).join('\n'))
  if (result.status !== 0) finish(false, { error: 'xcodebuild failed', log })
}

function generate() {
  const placeholder = join(ios, 'build/generated/BuildInfo.swift')
  if (!existsSync(placeholder)) {
    mkdirSync(join(ios, 'build/generated'), { recursive: true })
    writeFileSync(placeholder, 'import EatYeetCore\nextension BuildInfo {\n  static let current = BuildInfo(gitSHA: "dev", dirty: true, builtAt: "unknown")\n}\n')
  }
  run('xcodegen', ['generate', '--quiet', '--spec', 'project.yml'])
}

function ensureProject() {
  if (!existsSync(join(ios, 'EatYeet.xcodeproj'))) generate()
}

function build({ forDevice = false } = {}) {
  ensureProject()
  // The OpenAPI generator is a build plugin; trust it non-interactively.
  const common = ['-project', 'EatYeet.xcodeproj', '-scheme', 'EatYeet', '-derivedDataPath', derived, '-skipPackagePluginValidation']
  if (forDevice) {
    if (!existsSync(join(ios, 'Config/Signing.local.xcconfig'))) {
      finish(false, { error: 'No signing team. Add your Apple ID in Xcode → Settings → Accounts, then run `pnpm ios team`.' })
    }
    xcodebuild([...common, '-destination', 'generic/platform=iOS', '-allowProvisioningUpdates', 'build'])
    return join(derived, 'Build/Products/Debug-iphoneos/EatYeet.app')
  }
  xcodebuild([...common, '-destination', `id=${simulator}`, 'CODE_SIGNING_ALLOWED=NO', 'build'])
  return join(derived, 'Build/Products/Debug-iphonesimulator/EatYeet.app')
}

function bootSimulator() {
  run('xcrun', ['simctl', 'boot', simulator], { quiet: true, allowFail: true })
  run('xcrun', ['simctl', 'bootstatus', simulator, '-b'], { quiet: true })
  run('open', ['-g', '-a', 'Simulator'], { quiet: true, allowFail: true })
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

async function screenshot(name = 'ios-shot.png') {
  mkdirSync(out, { recursive: true })
  const file = join(out, name)
  run('xcrun', ['simctl', 'io', simulator, 'screenshot', file], { quiet: true })
  return file
}

// Relaunch with the deep link as a launch argument: `simctl openurl` shows an "Open in…?" prompt.
async function launchSim(url) {
  run('xcrun', ['simctl', 'terminate', simulator, bundleId], { quiet: true, allowFail: true })
  const launchArgs = [...(url ? ['-openURL', url] : []), ...(process.env.IOS_LOCAL_ORIGIN ? ['-localOrigin', process.env.IOS_LOCAL_ORIGIN] : [])]
  run('xcrun', ['simctl', 'launch', simulator, bundleId, ...launchArgs], { quiet: true })
  await sleep(2000)
}

async function openURL(url) {
  if (url) await launchSim(url)
}

function deviceState() {
  const file = join(out, 'devices.json')
  mkdirSync(out, { recursive: true })
  run('xcrun', ['devicectl', 'list', 'devices', '--json-output', file], { quiet: true, allowFail: true })
  try {
    const devices = JSON.parse(readFileSync(file, 'utf8')).result.devices
    const phone = devices.find((d) => d.identifier === device)
    return phone?.connectionProperties?.tunnelState ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function requireDevice() {
  const state = deviceState()
  if (state === 'unavailable' || state === 'unknown') {
    finish(false, {
      error: `iPhone is ${state}. Connect it by USB or join the same Wi-Fi (with "Connect via network" on), then retry. Use \`pnpm ios sim\` meanwhile.`,
    })
  }
}

function launchOnDevice(url) {
  const launch = ['devicectl', 'device', 'process', 'launch', '--device', device, '--terminate-existing']
  if (url) launch.push('--payload-url', url)
  run('xcrun', [...launch, bundleId], { quiet: true })
}

function profileDaysLeft(app) {
  const profile = join(app, 'embedded.mobileprovision')
  if (!existsSync(profile)) return null
  const plist = execFileSync('security', ['cms', '-D', '-i', profile], { encoding: 'utf8' })
  const match = plist.match(/<key>ExpirationDate<\/key>\s*<date>([^<]+)<\/date>/)
  return match ? (new Date(match[1]).getTime() - Date.now()) / 86_400_000 : null
}

switch (command) {
  case 'gen':
    generate()
    finish(true, { artifact: 'mobile/ios/EatYeet.xcodeproj' })
    break
  case 'build': {
    const app = build({ forDevice: flags.has('--device') })
    finish(true, { artifact: app })
    break
  }
  case 'test': {
    ensureProject()
    bootSimulator()
    const bundle = join(out, `test-${Date.now()}.xcresult`)
    const only = flags.has('--ui') ? [] : ['-only-testing:EatYeetTests']
    xcodebuild(['-project', 'EatYeet.xcodeproj', '-scheme', 'EatYeet', '-derivedDataPath', derived,
      '-destination', `id=${simulator}`, '-resultBundlePath', bundle, '-skipPackagePluginValidation', 'CODE_SIGNING_ALLOWED=NO', ...only, 'test'])
    // Core package tests run through SwiftPM on the Simulator SDK.
    xcodebuild(['-scheme', 'EatYeetCore', '-destination', `id=${simulator}`, '-derivedDataPath', join(ios, 'build/PackageData'), 'test'],
      join(ios, 'Packages/EatYeetCore'))
    finish(true, { artifact: bundle })
    break
  }
  case 'sim': {
    const app = build()
    bootSimulator()
    run('xcrun', ['simctl', 'install', simulator, app], { quiet: true })
    await launchSim(args[0])
    finish(true, { artifact: await screenshot() })
    break
  }
  case 'shot':
    await openURL(args[0])
    finish(true, { artifact: await screenshot(args[1] ?? 'ios-shot.png') })
    break
  case 'device': {
    requireDevice()
    const app = build({ forDevice: true })
    run('xcrun', ['devicectl', 'device', 'install', 'app', '--device', device, app], { quiet: true })
    launchOnDevice(args[0])
    finish(true, { artifact: app, note: 'If iOS refuses to open the app, trust the developer under Settings → General → VPN & Device Management.' })
    break
  }
  case 'record': {
    const seconds = Number(args[0] ?? 8)
    bootSimulator()
    mkdirSync(out, { recursive: true })
    const file = join(out, `ios-${Date.now()}.mp4`)
    const recorder = spawn('xcrun', ['simctl', 'io', simulator, 'recordVideo', '--codec', 'h264', '--force', file], { stdio: 'ignore' })
    await sleep(800)
    await openURL(args[1])
    await sleep(seconds * 1000)
    recorder.kill('SIGINT')
    await new Promise((done) => recorder.on('exit', done))
    finish(true, { artifact: file })
    break
  }
  case 'resign': {
    const app = join(derived, 'Build/Products/Debug-iphoneos/EatYeet.app')
    const days = existsSync(app) ? profileDaysLeft(app) : null
    if (!flags.has('--force') && days !== null && days > 2) finish(true, { skipped: `profile valid for ${days.toFixed(1)} more days` })
    requireDevice()
    run('rm', ['-rf', join(app, 'embedded.mobileprovision')], { quiet: true })
    const rebuilt = build({ forDevice: true })
    run('xcrun', ['devicectl', 'device', 'install', 'app', '--device', device, rebuilt], { quiet: true })
    finish(true, { artifact: rebuilt, daysLeft: profileDaysLeft(rebuilt) })
    break
  }
  case 'team': {
    const raw = run('defaults', ['read', 'com.apple.dt.Xcode', 'IDEProvisioningTeamByIdentifier'], { quiet: true, allowFail: true }).stdout ?? ''
    const team = raw.match(/teamID = ([A-Z0-9]{10});/)?.[1]
    if (!team) finish(false, { error: 'No Personal Team found. Add your Apple ID in Xcode → Settings → Accounts first.' })
    writeFileSync(join(ios, 'Config/Signing.local.xcconfig'), `DEVELOPMENT_TEAM = ${team}\n`)
    finish(true, { artifact: 'mobile/ios/Config/Signing.local.xcconfig', team })
    break
  }
  default:
    console.error(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).join('\n'))
    finish(command === 'help')
}

