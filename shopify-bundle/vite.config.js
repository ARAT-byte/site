import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/areeq-hero.js'),
      name: 'AreeqHero',
      fileName: 'areeq-hero',
      formats: ['iife'],
    },
    outDir: 'dist',
    rollupOptions: {
      // Inline all dependencies (Three.js) into the single bundle
      external: [],
    },
  },
});
