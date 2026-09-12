/** Enforce workspace ownership, package dependencies, and layer direction. */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json']
const IGNORED = new Set(['node_modules', 'generated', 'dist', '.nx', '.git', '.output', 'storybook-static'])
const APP_IMPORTS = {
  'packages/l8/web/src/next/interactive.tsx': new Set(['@app/page-blocks', '@app/recipe-workbenches']),
  'packages/l8/web/src/lib/api.ts': new Set(['@app/articles', '@app/recipes']),
  'packages/l8/web/src/routes/recipes/$slug/index.tsx': new Set(['@app/page-blocks', '@app/recipe-workbenches']),
  'packages/l8/web/src/stories/dough-workbench.stories.tsx': new Set(['@app/recipe-workbenches']),
}
const inside = (file, root) => {
  const rel = relative(root, file)
  return rel === '' || (rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel))
}
const json = (file) => JSON.parse(readFileSync(file, 'utf8'))
const posix = (path) => path.split('\\').join('/')

export function sourceFiles(root) {
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORED.has(entry.name)) return []
    const path = join(root, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : /\.[cm]?[jt]sx?$/.test(path) ? [path] : []
  })
}

export function importSpecifiers(file) {
  const text = readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const imports = []
  function add(node) { if (node && ts.isStringLiteralLike(node)) imports.push(node.text) }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier)
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal)
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
        if (node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) add(node.arguments[0])
        else imports.push('#nonliteral-import')
      }
      if (node.expression.getText(source) === 'import.meta.glob') {
        const arg = node.arguments[0]
        if (arg && ts.isArrayLiteralExpression(arg)) arg.elements.forEach(add)
        else if (arg && ts.isStringLiteralLike(arg)) add(arg)
        else imports.push('#nonliteral-glob')
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  // JSDoc import types on Node build modules also declare architectural dependencies.
  for (const comment of text.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
    for (const match of comment[0].matchAll(/import\(['"]([^'"]+)['"]\)/g)) imports.push(match[1])
  }
  return [...new Set(imports)]
}

function existingFile(path) {
  for (const candidate of [path, ...EXTENSIONS.map((ext) => `${path}${ext}`), ...EXTENSIONS.map((ext) => join(path, `index${ext}`))]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  // TypeScript resolves .js imports to their authored .ts files.
  if (/\.js$/.test(path) && existsSync(path.slice(0, -3) + '.ts')) return path.slice(0, -3) + '.ts'
  return null
}

export function checkWorkspace(root) {
  root = resolve(root)
  const errors = []
  const projects = []
  const rel = (path) => posix(relative(root, path))
  const fail = (message) => errors.push(message)
  for (const layerDir of existsSync(join(root, 'packages')) ? readdirSync(join(root, 'packages'), { withFileTypes: true }) : []) {
    if (!layerDir.isDirectory() || !/^l\d+$/.test(layerDir.name)) continue
    const layer = Number(layerDir.name.slice(1))
    for (const entry of readdirSync(join(root, 'packages', layerDir.name), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const path = join(root, 'packages', layerDir.name, entry.name)
      if (!existsSync(join(path, 'project.json'))) { fail(`${rel(path)} missing project.json`); continue }
      const config = json(join(path, 'project.json'))
      if (!config.metadata?.tsConfig) fail(`${rel(path)}/project.json metadata.tsConfig is required`)
      if (!config.name?.startsWith(`l${layer}-`) || (config.tags ?? []).filter((tag) => /^layer:/.test(tag)).join() !== `layer:l${layer}`) {
        fail(`${rel(path)} directory, project name and layer tag must agree`)
      }
      projects.push({ root: path, sourceRoot: resolve(path, config.sourceRoot ?? 'src'), layer, kind: 'package', name: config.name, tsConfig: resolve(path, config.metadata?.tsConfig ?? 'tsconfig.json') })
    }
  }
  for (const entry of existsSync(join(root, 'apps')) ? readdirSync(join(root, 'apps'), { withFileTypes: true }) : []) {
    if (!entry.isDirectory()) continue
    const path = join(root, 'apps', entry.name)
    projects.push({ root: path, sourceRoot: join(path, 'src'), kind: 'app', name: entry.name, tsConfig: join(path, 'tsconfig.json') })
  }
  const refs = (path) => new Set((json(path).references ?? []).map((ref) => {
    const target = resolve(dirname(path), ref.path)
    return target.endsWith('.json') ? target : join(target, 'tsconfig.json')
  }))
  const rootReferences = refs(join(root, 'tsconfig.json'))
  for (const project of projects) {
    const manifest = join(project.root, 'package.json')
    project.manifest = existsSync(manifest) ? json(manifest) : {}
    if (!project.manifest.name) fail(`${rel(project.root)} missing named package.json`)
    if (!inside(project.sourceRoot, project.root)) fail(`${project.name}: sourceRoot must belong to its project`)
    if (!inside(project.tsConfig, project.root)) fail(`${project.name}: tsConfig must belong to its project`)
    if (!existsSync(project.tsConfig)) { fail(`${project.name} missing tsconfig.json`); project.references = new Set(); continue }
    if (!rootReferences.has(project.tsConfig)) fail(`root tsconfig.json must reference ${rel(project.tsConfig)}`)
    if (json(project.tsConfig).compilerOptions?.composite !== true) fail(`${rel(project.tsConfig)} must set composite=true`)
    project.references = refs(project.tsConfig)
  }
  const owner = (file) => projects.find((project) => inside(file, project.root))
  for (const project of projects) {
    if (!inside(project.sourceRoot, project.root)) continue
    for (const file of sourceFiles(project.sourceRoot)) {
      const fileName = rel(file)
      for (let specifier of importSpecifiers(file)) {
        specifier = specifier.replace(/^!/, '')
        if (specifier.startsWith('@app/')) {
          if (!APP_IMPORTS[fileName]?.has(specifier)) fail(`${fileName}: @app imports are only allowed at designated web composition points`)
          continue
        }
        if (specifier.startsWith('#web-test/')) {
          if (project.name !== 'l8-web' || !/\.test\.[cm]?[jt]sx?$/.test(file)) fail(`${fileName}: test support cannot be imported by runtime source`)
          continue
        }
        if (specifier === '#site-config') { fail(`${fileName}: runtime source cannot import root app configuration`); continue }
        let targetPath
        let target
        if (specifier.startsWith('.')) targetPath = resolve(dirname(file), specifier.split('?')[0])
        else if (specifier.startsWith('@/')) targetPath = resolve(root, 'packages/l8/web/src', specifier.slice(2))
        else if (specifier.startsWith('/')) targetPath = resolve(root, '.' + specifier)
        else {
          target = projects.find((p) => p.manifest.name && (specifier === p.manifest.name || specifier.startsWith(p.manifest.name + '/')))
          if (target) {
            const key = specifier === target.manifest.name ? '.' : '.' + specifier.slice(target.manifest.name.length)
            let exported = target.manifest.exports?.[key]
            if (!exported) {
              for (const [pattern, value] of Object.entries(target.manifest.exports ?? {}).sort(([a], [b]) => b.length - a.length)) {
                if (!pattern.includes('*') || typeof value !== 'string') continue
                const [prefix, suffix] = pattern.split('*')
                if (key.startsWith(prefix) && key.endsWith(suffix)) {
                  exported = value.replaceAll('*', key.slice(prefix.length, suffix ? -suffix.length : undefined))
                  break
                }
              }
            }
            if (typeof exported !== 'string') { fail(`${fileName}: unresolved package export ${specifier}`); continue }
            targetPath = resolve(target.root, exported)
            if (!existingFile(targetPath)) { fail(`${fileName}: package export does not exist: ${specifier}`); continue }
            if (!inside(targetPath, target.root)) { fail(`${fileName}: package export escapes its owner: ${specifier}`); continue }
          }
          else if (specifier.startsWith('@eat-yeet/') || specifier.startsWith('#')) { fail(`${fileName}: unresolved workspace import ${specifier}`); continue }
          else continue
        }
        target ??= owner(targetPath)
        if (!target) { fail(`${fileName}: import ${specifier} escapes package/app ownership`); continue }
        const dataImport = /\/(generated|fixtures)(\/|$)/.test(posix(targetPath))
        if (dataImport && (project.kind !== 'app' || target !== project)) fail(`${fileName}: generated data and fixtures belong to their app adapter`)
        if (target.kind === 'app' && target !== project) fail(`${fileName}: concrete app imports are forbidden; use the selected adapter`)
        if (project.kind === 'app' && target.layer === 8) fail(`${fileName}: app adapters cannot depend on web composition`)
        if (target === project) {
          if (!dataImport && specifier.startsWith('.') && !existingFile(targetPath) && !/[?*]/.test(specifier)) fail(`${fileName}: unresolved relative import ${specifier}`)
          continue
        }
        if (project.kind === 'package' && target.kind === 'package' && project.layer < target.layer) fail(`${fileName}: l${project.layer} cannot import l${target.layer}`)
        if (!project.references.has(target.tsConfig)) fail(`${rel(project.tsConfig)} must reference ${rel(target.tsConfig)}`)
        const manifest = project.manifest
        if (![manifest.dependencies, manifest.devDependencies, manifest.peerDependencies].some((deps) => deps?.[target.manifest.name])) fail(`${rel(project.root)}/package.json missing dependency ${target.manifest.name}`)
      }
    }
  }
  return { errors: [...new Set(errors)], projectCount: projects.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkWorkspace(process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url)))
  if (result.errors.length) {
    console.error(result.errors.map((error) => `layer-imports: ${error}`).join('\n'))
    process.exitCode = 1
  } else console.log(`layer-imports: ${result.projectCount} package/app owners checked`)
}
