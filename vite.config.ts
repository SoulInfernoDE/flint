import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// overLay loads the mod from mod://localhost/<id>/, so every asset URL must be relative.
// `public/` (overlay.json, locales/) is copied into dist/ unchanged.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        battlegrounds: fileURLToPath(new URL('./index.html', import.meta.url)),
        minions: fileURLToPath(new URL('./minions.html', import.meta.url)),
        history: fileURLToPath(new URL('./history.html', import.meta.url)),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
