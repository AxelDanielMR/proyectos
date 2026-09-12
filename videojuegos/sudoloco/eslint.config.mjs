import expoConfig from 'eslint-config-expo/flat.js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'android/**',
      'ios/**',
      'coverage/**',
    ],
  },
  ...expoConfig,
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // eslint-plugin-react's `version: 'detect'` calls context.getFilename(),
    // an API eslint-plugin-react@7.37.5 hasn't caught up to on eslint@10 —
    // it crashes the whole lint run. Pinning the version skips that
    // detection code path entirely.
    settings: {
      react: { version: '19.1.0' },
    },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    rules: {
      // The recommended preset ships this as 'warn'; a dependency-array bug
      // here has caused real production bugs (stale closures, missed saves),
      // so it's an error in this project.
      'react-hooks/exhaustive-deps': 'error',

      // NOT enabled: 'import/order'. eslint-plugin-import@2.x calls a
      // SourceCode API (getTokenOrCommentAfter) that eslint@10 removed —
      // the rule crashes the whole lint run. Re-enable once
      // eslint-plugin-import ships an eslint@10-compatible release.
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  prettierConfig,
];
