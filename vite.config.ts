/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Library is resolved via node_modules through the `file:` link in package.json,
// so no special aliases are needed here.
//
// When building for the VS Code / Kiro webview we set VSCODE_WEBVIEW=1 so Vite
// emits RELATIVE asset paths (`./assets/...`) instead of absolute (`/assets/...`).
// A webview serves resources through special `vscode-webview://` URIs, so absolute
// root paths never resolve. The normal `dev`/`preview`/`build` flows are unaffected.
export default defineConfig({
  base: process.env.VSCODE_WEBVIEW === '1' ? './' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__test__/setup.ts'],
    include: ['__test__/**/*.{test,spec}.{ts,tsx}'],
  },
});
