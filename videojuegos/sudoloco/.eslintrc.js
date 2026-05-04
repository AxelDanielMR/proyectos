/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'web-build/'],
  rules: {
    'import/order': [
      'warn',
      {
        groups: [
          ['builtin', 'external'],
          ['internal', 'parent', 'sibling', 'index'],
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
  },
};
