/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Node tests (tool.test.ts, etc.)
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: ['/node_modules/', '\\.react\\.test\\.'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.lib.json',
        }],
      },
    },
    // React tests (*.react.test.tsx)
    {
      displayName: 'react',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.react.test.tsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.lib.json',
        }],
      },
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    },
  ],
};
