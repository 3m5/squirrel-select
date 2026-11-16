import * as esbuild from 'esbuild'
import { options } from './build.mjs'

const ctx = await esbuild.context({ ...options, outdir: 'site/dist' })
await ctx.watch()
const { port } = await ctx.serve({ servedir: 'site', host: '127.0.0.1', port: 8000 })
console.log(`http://127.0.0.1:${port}/`)
