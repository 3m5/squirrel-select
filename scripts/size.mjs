import { appendFileSync, readFileSync } from 'node:fs'
import { brotliCompressSync, gzipSync } from 'node:zlib'

/** @type {Record<string, { budget: number | null, max: number }>} */
const limits = JSON.parse(readFileSync('size-budget.json', 'utf8'))
const rows = ['| File | gzip | brotli | budget | max | |', '|---|---|---|---|---|---|']
let failed = false

for (const [file, { budget, max }] of Object.entries(limits)) {
  const data = readFileSync(file)
  const gzip = gzipSync(data, { level: 9 }).length
  const brotli = brotliCompressSync(data).length
  const problems = []
  if (gzip > max) problems.push('over max')
  if (budget !== null && gzip > budget) problems.push('over budget')
  if (budget !== null && budget > max) problems.push('budget above max')
  if (problems.length) failed = true
  rows.push(`| ${file} | ${gzip} B | ${brotli} B | ${budget === null ? 'not set' : `${budget} B`} | ${max} B | ${problems.join(', ') || 'ok'} |`)
}

const table = rows.join('\n')
console.log(table)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`)
if (failed) process.exit(1)
