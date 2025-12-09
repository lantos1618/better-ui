/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Node tests (tool.test.ts, rate-limiter.test.ts)
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src', '<rootDir>/lib'],
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
    // React tests (*.react.test.tsx, lib/__tests__/tools.test.tsx)
    {
      displayName: 'react',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src', '<rootDir>/lib'],
      testMatch: ['**/__tests__/**/*.react.test.tsx', '**/lib/__tests__/**/*.test.tsx'],
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
    // Next.js API route tests (Node environment)
    {
      displayName: 'api',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/app/api'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
      },
    },
    // Next.js component tests (jsdom environment)
    {
      displayName: 'components',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/app'],
      testMatch: ['**/__tests__/**/*.test.tsx'],
      testPathIgnorePatterns: ['/node_modules/', '/api/'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
      },
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    },
    // Integration tests
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/app/__tests__/integration'],
      testMatch: ['**/*.test.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
      },
    },
  ],
};
