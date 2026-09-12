/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // Gates only core/: it's the module with an enforceable, meaningful bar
  // (pure functions, no RN). Without this, coverage can silently regress —
  // it was measured (correctly, for once) at ~94% before these thresholds
  // existed; set a bit below the current ~98.5% so real drops fail CI.
  collectCoverageFrom: ['src/core/**/*.ts', '!src/core/**/index.ts'],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|nativewind|react-native-reanimated|react-native-safe-area-context|react-native-screens))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
  },
  // Core tests have zero RN deps — run them with ts-jest directly for speed.
  projects: [
    {
      displayName: 'core',
      testMatch: ['<rootDir>/src/core/**/__tests__/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
      },
    },
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/features/**/__tests__/**/*.test.ts',
        '<rootDir>/src/ui/**/__tests__/**/*.test.ts',
      ],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: {
        '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/jest/assetMock.js',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@features/(.*)$': '<rootDir>/src/features/$1',
        '^@ui/(.*)$': '<rootDir>/src/ui/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@theme/(.*)$': '<rootDir>/src/theme/$1',
        '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
      },
    },
    // Only project with a real RN environment (jest-expo) — for components
    // that render, not just pure logic. `core`/`unit` above can't touch these
    // at all (testEnvironment: 'node', no RN runtime).
    {
      displayName: 'components',
      preset: 'jest-expo',
      testMatch: [
        '<rootDir>/src/features/**/__tests__/**/*.test.tsx',
        '<rootDir>/src/ui/**/__tests__/**/*.test.tsx',
        '<rootDir>/app/**/__tests__/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@features/(.*)$': '<rootDir>/src/features/$1',
        '^@ui/(.*)$': '<rootDir>/src/ui/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@theme/(.*)$': '<rootDir>/src/theme/$1',
        '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
      },
    },
  ],
};
