module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/test/**/*.test.[jt]s?(x)',
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)',
  ],
  coverageThreshold: {
    global: {
      statements: 79,
      branches: 62,
      functions: 90,
      lines: 80,
    },
  },
};
