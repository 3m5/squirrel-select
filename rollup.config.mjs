import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import terser from '@rollup/plugin-terser'
import postcss from 'rollup-plugin-postcss'
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

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
    serve({
      open: true,
      contentBase: ['dist', 'public'],
      host: '0.0.0.0',
      port: 8080
    }),
    livereload({
      watch: 'dist',
    })
  ],
}