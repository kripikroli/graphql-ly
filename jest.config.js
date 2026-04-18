module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: { '^vscode$': '<rootDir>/src/__mocks__/vscode.ts' },
};
