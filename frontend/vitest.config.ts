import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.spec.ts'],
  },
  css: {
    // Avoid loading project PostCSS/Tailwind during unit tests
    postcss: null as any,
  },
});


