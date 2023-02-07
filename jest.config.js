module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  coverageThreshold: {
    global: {
      statements: 79,
      branches: 62,
      functions: 90,
      lines: 80,
    },
  },
};
