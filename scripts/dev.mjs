import { watch } from 'node:fs'
import * as esbuild from 'esbuild'
import { options } from './build.mjs'
import { buildSite } from './site.mjs'

async function rebuild() {
  try {
    await esbuild.build({ ...options, logLevel: 'warning' })
    buildSite()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
  }
}

/** @type {NodeJS.Timeout | undefined} */
let timer
const schedule = () => {
  clearTimeout(timer)
  timer = setTimeout(rebuild, 100)
}

await rebuild()
for (const dir of ['src', 'site']) watch(dir, { recursive: true }, schedule)
const ctx = await esbuild.context({})
const { port } = await ctx.serve({ servedir: '_site', host: '127.0.0.1', port: 8000 })
console.log(`http://127.0.0.1:${port}/`)
