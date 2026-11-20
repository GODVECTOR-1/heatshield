import { defineConfig } from 'vitest/config';

// Time-zone matrix (spec 10): every test runs with the device clock in UTC and in New York.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'lib/**/*.test.ts'],
    projects: [
      { extends: true, test: { name: 'utc', env: { TZ: 'UTC' } } },
      { extends: true, test: { name: 'new-york', env: { TZ: 'America/New_York' } } },
    ],
  },
});
