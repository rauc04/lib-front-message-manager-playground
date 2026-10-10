/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Library is resolved via node_modules through the `file:` link in package.json,
// so no special aliases are needed here.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__test__/setup.ts'],
    include: ['__test__/**/*.{test,spec}.{ts,tsx}'],
  },
});
