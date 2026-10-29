import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: {
        game: resolve(projectRoot, 'index.html'),
        landing: resolve(projectRoot, 'landing.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
