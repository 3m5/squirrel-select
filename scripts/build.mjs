import { readFileSync, rmSync } from 'node:fs'
import * as esbuild from 'esbuild'

const { name, version } = JSON.parse(readFileSync('package.json', 'utf8'))

/** @type {esbuild.BuildOptions} */
export const options = {
  entryPoints: ['src/squirrel-select.css'],
  bundle: true,
  minify: true,
  sourcemap: 'linked',
  outdir: 'dist',
  banner: { css: `/*! ${name} v${version} | MIT | https://github.com/3m5/squirrel-select */` },
  logLevel: 'info',
}

if (import.meta.main) {
  rmSync('dist', { recursive: true, force: true })
  await esbuild.build(options)
}
