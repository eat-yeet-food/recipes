/**
 * Enforce Nx layer metadata and import direction.
 *
 * Project names carry their architecture level (`l1-recipe-model`,
 * `l8-web`). Higher layers may import the same or lower layers; lower layers
 * may never import higher layers. This guard intentionally uses Nx
 * project.json metadata so the rule survives the package extraction work.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']
const IGNORED_DIRS = new Set([
  '.git',
  '.nx',
  '.output',
  '.tanstack',
  'dist',
  'node_modules',
  'storybook-static',
])

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function posix(path) {
  return path.split('\\').join('/')
}

function rel(path) {
  return posix(relative(ROOT, path)) || '.'
}

function isInside(child, parent) {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

function listProjectFiles() {
  const files = []
  const candidates = ['project.json', 'apps', 'packages']

  function walk(path) {
    if (!existsSync(path)) return
    const stats = statSync(path)
    if (stats.isFile()) {
      if (path.endsWith('/project.json')) files.push(path)
      return
    }
    if (!stats.isDirectory()) return
    if (IGNORED_DIRS.has(path.split('/').at(-1))) return
    for (const entry of readdirSync(path)) walk(join(path, entry))
  }

  for (const candidate of candidates) walk(join(ROOT, candidate))
  return files
}

function parseLayer(project) {
  const fromName = /^l(\d+)-/.exec(project.name ?? '')
  const fromTag = (project.tags ?? []).find((tag) => /^layer:l\d+$/.test(tag))
  const tagLayer = fromTag ? Number(fromTag.slice('layer:l'.length)) : null
  const nameLayer = fromName ? Number(fromName[1]) : null

  if (nameLayer == null) {
    throw new Error(`${project.name || '(unnamed project)'} must be named with an l<number>- prefix`)
  }
  if (tagLayer == null) {
    throw new Error(`${project.name} must have a matching layer:l${nameLayer} tag`)
  }
  if (tagLayer !== nameLayer) {
    throw new Error(`${project.name} tag ${fromTag} does not match its l${nameLayer}- name prefix`)
  }

  return nameLayer
}

function loadProjects() {
  return listProjectFiles().map((file) => {
    const config = readJson(file)
    const root = dirname(file)
    const sourceRoot = resolve(root, config.sourceRoot ?? '.')
    const tsConfig = config.metadata?.tsConfig ? resolve(root, config.metadata.tsConfig) : null
    return {
      name: config.name,
      root,
      sourceRoot,
      tsConfig,
      layer: parseLayer(config),
      packageName: existsSync(join(root, 'package.json')) ? readJson(join(root, 'package.json')).name : null,
    }
  }).sort((a, b) => b.sourceRoot.length - a.sourceRoot.length)
}

function findSourceFiles(root) {
  const files = []

  function walk(path) {
    const stats = statSync(path)
    if (stats.isDirectory()) {
      if (IGNORED_DIRS.has(path.split('/').at(-1))) return
      for (const entry of readdirSync(path)) walk(join(path, entry))
      return
    }
    if (SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext)) && !path.endsWith('.d.ts')) files.push(path)
  }

  if (existsSync(root)) walk(root)
  return files
}

function importSpecifiers(file) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const imports = []

  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      imports.push(node.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text)
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return imports
}

function existingFile(path) {
  const attempts = [path, ...SOURCE_EXTENSIONS.map((ext) => `${path}${ext}`)]
  for (const attempt of attempts) {
    if (existsSync(attempt) && statSync(attempt).isFile()) return attempt
  }
  for (const ext of SOURCE_EXTENSIONS) {
    const attempt = join(path, `index${ext}`)
    if (existsSync(attempt) && statSync(attempt).isFile()) return attempt
  }
  return null
}

function resolveImport(specifier, file, projects) {
  if (specifier.startsWith('.')) return existingFile(resolve(dirname(file), specifier))
  if (specifier.startsWith('@/')) return existingFile(resolve(ROOT, 'packages', 'l8', 'web', 'src', specifier.slice(2)))

  const byPackageName = projects.find((project) => (
    project.packageName &&
    (specifier === project.packageName || specifier.startsWith(`${project.packageName}/`))
  ))
  if (!byPackageName) return null

  const suffix = specifier === byPackageName.packageName ? '' : specifier.slice(byPackageName.packageName.length + 1)
  return existingFile(resolve(byPackageName.sourceRoot, suffix)) ?? byPackageName.sourceRoot
}

function owningProject(path, projects) {
  return projects.find((project) => isInside(path, project.sourceRoot) || isInside(path, project.root))
}

function tsconfigReferences(path) {
  const config = readJson(path)
  return new Set((config.references ?? []).map((ref) => resolve(dirname(path), ref.path)))
}

function validateTsReferences(projects) {
  const rootReferences = tsconfigReferences(join(ROOT, 'tsconfig.json'))
  for (const project of projects) {
    if (!project.tsConfig) throw new Error(`${project.name} metadata.tsConfig is required`)
    if (!existsSync(project.tsConfig)) throw new Error(`${project.name} metadata.tsConfig does not exist: ${rel(project.tsConfig)}`)
    if (!rootReferences.has(project.tsConfig)) {
      throw new Error(`root tsconfig.json must reference ${rel(project.tsConfig)} for ${project.name}`)
    }

    const config = readJson(project.tsConfig)
    if (config.compilerOptions?.composite !== true) {
      throw new Error(`${rel(project.tsConfig)} must set compilerOptions.composite=true`)
    }
  }
}

function validateImports(projects) {
  const errors = []
  const referencesByProject = new Map(projects.map((project) => [
    project.name,
    project.tsConfig ? tsconfigReferences(project.tsConfig) : new Set(),
  ]))

  for (const project of projects) {
    for (const file of findSourceFiles(project.sourceRoot)) {
      for (const specifier of importSpecifiers(file)) {
        const resolved = resolveImport(specifier, file, projects)
        if (!resolved) continue

        const target = owningProject(resolved, projects)
        if (!target || target.name === project.name) continue

        if (project.layer < target.layer) {
          errors.push(`${rel(file)} imports ${specifier} from ${target.name}; l${project.layer} cannot import l${target.layer}`)
        }

        if (project.tsConfig && target.tsConfig && !referencesByProject.get(project.name).has(target.tsConfig)) {
          errors.push(`${rel(project.tsConfig)} must reference ${rel(target.tsConfig)} because ${project.name} imports ${target.name}`)
        }
      }
    }
  }

  return errors
}

const projects = loadProjects()
validateTsReferences(projects)

const errors = validateImports(projects)
if (errors.length > 0) {
  console.error(errors.map((error) => `layer-imports: ${error}`).join('\n'))
  process.exit(1)
}

console.log(`layer-imports: ${projects.length} Nx project${projects.length === 1 ? '' : 's'} checked`)
