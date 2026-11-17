import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const expectedFiles = ['LICENSE', 'README.md', 'dist/squirrel-select.css', 'dist/squirrel-select.css.map', 'package.json']
const mustResolve = ['@3m5-de/squirrel-select/squirrel-select.css', '@3m5-de/squirrel-select/package.json']
const mustFail = ['@3m5-de/squirrel-select']

const tmp = mkdtempSync(join(tmpdir(), 'sqs-pack-'))
try {
  const [pack] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', tmp], { encoding: 'utf8' }))
  /** @type {string[]} */
  const files = pack.files.map((/** @type {{ path: string }} */ f) => f.path).sort()
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
    throw new Error(`unexpected package contents:\n  got      ${files.join(', ')}\n  expected ${expectedFiles.join(', ')}`)
  }

  const target = join(tmp, 'node_modules', pack.name)
  mkdirSync(target, { recursive: true })
  execFileSync('tar', ['xzf', join(tmp, pack.filename), '-C', target, '--strip-components=1'])
  writeFileSync(join(tmp, 'package.json'), '{ "type": "module" }')

  const probe = `
    import { existsSync } from 'node:fs'
    import { fileURLToPath } from 'node:url'
    const ok = ${JSON.stringify(mustResolve)}.map(s => [s, existsSync(fileURLToPath(import.meta.resolve(s)))])
    const fail = ${JSON.stringify(mustFail)}.map(s => { try { import.meta.resolve(s); return [s, false] } catch (e) { return [s, e.code] } })
    console.log(JSON.stringify({ ok, fail }))`
  const { ok, fail } = JSON.parse(execFileSync('node', ['--input-type=module', '-e', probe], { cwd: tmp, encoding: 'utf8' }))

  for (const [spec, exists] of ok) if (!exists) throw new Error(`${spec} does not resolve to a file`)
  for (const [spec, code] of fail) if (code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw new Error(`${spec} should not be importable (got ${code})`)
  console.log(`package ok: ${files.length} files, ${ok.length} paths resolve, ${fail.length} blocked as expected`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
