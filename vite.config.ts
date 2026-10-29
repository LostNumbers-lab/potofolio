import { sites } from '@openai/sites-vite-plugin';
import { defineConfig, loadEnv } from 'vite';
import { handleOffices } from './server/busan-offices.mjs';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [sites(), {
    name: 'busan-offices-api',
    configureServer(server) {
      server.middlewares.use('/api/busan-offices', (req, res) => handleOffices(req, res, loadEnv(server.config.mode, server.config.root, 'BUSAN_')));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/busan-offices', (req, res) => handleOffices(req, res, loadEnv(server.config.mode, server.config.root, 'BUSAN_')));
    },
  }],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        report: resolve(__dirname, 'report.html'),
        contents: resolve(__dirname, 'contents.html'),
        sns: resolve(__dirname, 'sns.html'),
        final: resolve(__dirname, 'final.html'),
        routeRecipe: resolve(__dirname, 'route-recipe.html'),
      },
    },
  },
});
