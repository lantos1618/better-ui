const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  // Most suites (API routes, rate limiter, audit) run in Node and rely on the
  // Web Fetch globals (Request/Response). React component tests opt into jsdom
  // via a per-file `@jest-environment jsdom` docblock.
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // The helpers dir holds shared test utilities, not test suites.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/app/__tests__/helpers/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // ESM-only rendering deps the compiled library requires — stubbed because
    // route/logic tests never render Markdown/CodeBlock views.
    '^react-markdown$': '<rootDir>/__mocks__/esm-stub.js',
    '^remark-gfm$': '<rootDir>/__mocks__/esm-stub.js',
    '^shiki$': '<rootDir>/__mocks__/esm-stub.js',
  },
};

module.exports = createJestConfig(customJestConfig);
