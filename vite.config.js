import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this project beneath /MAX-FPS/; local dev remains rooted at /.
  base: process.env.PAGES_BASE_PATH || '/',
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
});
