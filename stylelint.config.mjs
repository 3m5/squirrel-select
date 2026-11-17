/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'declaration-no-important': true,
    // public tokens are only read, never declared; private ones are --_sqs-*
    'property-disallowed-list': ['/^--sqs-/'],
    'custom-property-pattern': '^_?sqs(-[a-z0-9]+)+$',
    // rules are grouped by state; reordering by specificity would not change the cascade
    'no-descending-specificity': null,
  },
}
