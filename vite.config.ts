import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';

// `vite build --mode offline` inlines all JS and CSS into one index.html that runs from file://.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'offline' ? [viteSingleFile()] : [],
  build: mode === 'offline' ? { outDir: 'dist-offline' } : {},
  test: {
    include: ['tests/**/*.test.ts'],
  },
}));
