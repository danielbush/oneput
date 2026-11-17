import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/production/refusal.test.ts'],
    expect: { requireAssertions: true }
  }
});
