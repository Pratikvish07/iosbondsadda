/**
 * Live API contract tests (npm run test:api). Runs in plain Node so requests use Node's real
 * fetch instead of the React Native/Expo fetch mocks installed by the jest-expo preset.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.contract.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // babel-preset-expo inlines EXPO_PUBLIC_* via expo/virtual/env, which ships as ESM.
  transformIgnorePatterns: ['/node_modules/(?!expo/virtual/)'],
  testTimeout: 60000,
};
