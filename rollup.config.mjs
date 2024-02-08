import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'

import sass from 'sass'
import scss from 'rollup-plugin-scss'
import terser from '@rollup/plugin-terser'
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'

export default {
  input: 'src/index.ts',
  output:
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      plugins: [
        terser()
      ]
    },
  plugins: [
    peerDepsExternal(),
    resolve(),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
    postcss({
      extract: false,
      modules: true,
      use: ['sass'],
    }),
  ],
}