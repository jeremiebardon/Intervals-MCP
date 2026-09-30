import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Loads next.config.ts and .env* files into the test environment.
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  // jest-environment-jsdom strips the Node globals MSW v2 needs (fetch,
  // Response, TextEncoder, ReadableStream, BroadcastChannel) and makes
  // msw/node resolve to the browser build. jest-fixed-jsdom restores them
  // and sets customExportConditions: [''], which fixes both halves.
  testEnvironment: 'jest-fixed-jsdom',
  testEnvironmentOptions: {
    // Pinned so relative-path MSW handlers match deterministically.
    url: 'http://localhost:3000/',
  },

  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  clearMocks: true,
  restoreMocks: true,

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/mocks/**',
    '!src/app/**/layout.tsx',
  ],
};

export default createJestConfig(config);
