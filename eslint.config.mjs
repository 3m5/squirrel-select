import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**'] },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'indent': [ 'error', 2 ],
      'key-spacing': 'error',
      'keyword-spacing': 'error',
      'no-multi-spaces': 'error',
      'object-curly-spacing': [ 'error', 'always' ],
      'quotes': [ 'error', 'single' ],
      'semi': [ 'error', 'never' ],
      'space-before-blocks': 'error',
      'space-in-parens': 'error',
      'switch-colon-spacing': 'error',
    },
  },
)
