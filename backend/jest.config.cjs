/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    moduleDirectories: ['node_modules', '<rootDir>/src'],
    setupFiles: ['<rootDir>/tests/jest.setup.ts'],
    clearMocks: true,
};
