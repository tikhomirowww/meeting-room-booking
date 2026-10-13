#!/usr/bin/env node
/**
 * FSD import boundaries and business-rule purity (AGENTS.md invariants 2 and 8).
 *
 * Every import is resolved to a real path (`@/…` and relative alike), so there are no
 * glob patterns to get wrong (lessons L-013). Usage:
 *   node scripts/check-boundaries.mjs            # whole src/
 *   node scripts/check-boundaries.mjs <file>...  # specific files (used by the edit hook)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const LAYERS = ['shared', 'entities', 'features', 'widgets', 'pages', 'app']

/** Slices allowed to import from outside the layers (mocks/), besides tests. */
const MOCKS_ALLOWED_FROM = ['features/mock-controls']

/** A business-rules model file may import only these (plus files in its own folder). */
const MODEL_ALLOWED = [/^shared\/config$/, /^shared\/lib\/[^/]+$/]

const IMPORT_RE = /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g

const isTest = (file) => /\.test\.tsx?$/.test(file)
const isModelFile = (file) => /^entities\/[^/]+\/model\/[^/]+\.ts$/.test(file) && !isTest(file)

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

/** Where a src-relative module path sits. `rest` is the part below the slice's public API. */
export function locate(modulePath) {
  const clean = modulePath.replace(/\.(tsx?|jsx?)$/, '').replace(/\/index$/, '')
  const [top, ...rest] = clean.split('/')
  if (!LAYERS.includes(top)) return { layer: null, area: top, slice: null, rest }
  if (top === 'app') return { layer: 'app', slice: 'app', rest }
  if (top === 'shared') {
    // shared is split into segments (api, config, ui) and lib into libraries (lib/time).
    const depth = rest[0] === 'lib' ? 2 : 1
    return { layer: 'shared', slice: `shared/${rest.slice(0, depth).join('/')}`, rest: rest.slice(depth) }
  }
  return { layer: top, slice: `${top}/${rest[0]}`, rest: rest.slice(1) }
}

/** Resolves a specifier to a src-relative path, or null for packages. */
function resolve(importer, specifier) {
  if (specifier.startsWith('@/')) return specifier.slice(2)
  if (specifier.startsWith('.')) return path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier))
  return null
}

const lineOf = (source, index) => source.slice(0, index).split('\n').length

/**
 * @param {{ file: string, source: string }} input  file is relative to src/, e.g. "features/x/ui/A/A.tsx"
 * @returns {{ file: string, line: number, message: string }[]}
 */
export function checkFile({ file, source }) {
  if (isTest(file)) return []
  const from = locate(file)
  if (!from.layer) return [] // mocks/, test/, main.tsx: outside the layers
  const code = stripComments(source)
  const violations = []
  const report = (index, message) => violations.push({ file, line: lineOf(code, index), message })

  for (const match of code.matchAll(IMPORT_RE)) {
    const specifier = match[1] ?? match[2]
    const target = resolve(file, specifier)

    if (isModelFile(file)) {
      const ownFolder = target !== null && path.posix.dirname(target) === path.posix.dirname(file)
      const allowed = target !== null && (ownFolder || MODEL_ALLOWED.some((re) => re.test(locate(target).slice ?? '')))
      if (!allowed) {
        report(match.index, `'${specifier}': business rules are pure and may import only shared/config, shared/lib/* and their own folder (invariant 2)`)
        continue
      }
    }
    if (target === null) continue

    if (target.startsWith('..')) {
      report(match.index, `'${specifier}': resolves outside src/`)
      continue
    }
    const to = locate(target)
    if (!to.layer) {
      const allowedMocks = to.area === 'mocks' && MOCKS_ALLOWED_FROM.includes(from.slice)
      if (!allowedMocks) report(match.index, `'${specifier}': only tests${to.area === 'mocks' ? ' and features/mock-controls' : ''} may import from ${to.area}/ (invariant 8)`)
      continue
    }
    if (to.slice === from.slice) continue // inside the same slice

    const fromRank = LAYERS.indexOf(from.layer)
    const toRank = LAYERS.indexOf(to.layer)
    if (toRank > fromRank) {
      report(match.index, `'${specifier}': ${from.layer} must not import from the higher layer ${to.layer} (invariant 8)`)
    } else if (toRank === fromRank && from.layer !== 'shared') {
      report(match.index, `'${specifier}': ${from.slice} must not import another ${to.layer} slice (invariant 8)`)
    } else if (to.rest.length > 0) {
      report(match.index, `'${specifier}': import ${to.slice} through its public index, not its internals (invariant 8)`)
    }
  }

  if (isModelFile(file)) {
    for (const match of code.matchAll(/\bnew\s+Date\b|\bDate\s*\./g)) {
      report(match.index, `'${match[0].trim()}': business rules get "now" through ValidationContext and dates via shared/lib/time (invariant 2)`)
    }
  }
  return violations
}

function listSourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return listSourceFiles(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

export function checkProject(root) {
  const src = path.join(root, 'src')
  return listSourceFiles(src).flatMap((full) =>
    checkFile({ file: path.relative(src, full).split(path.sep).join('/'), source: readFileSync(full, 'utf8') }),
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const src = path.join(root, 'src')
  const args = process.argv.slice(2)
  const violations = args.length
    ? args
        .map((f) => path.resolve(f))
        .filter((f) => f.startsWith(src + path.sep) && /\.tsx?$/.test(f))
        .flatMap((f) => checkFile({ file: path.relative(src, f).split(path.sep).join('/'), source: readFileSync(f, 'utf8') }))
    : checkProject(root)

  for (const v of violations) console.error(`src/${v.file}:${v.line}  ${v.message}`)
  if (violations.length) {
    console.error(`\n${violations.length} boundary violation(s). See AGENTS.md invariants 2 and 8.`)
    process.exit(1)
  }
}
