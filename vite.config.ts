import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [sites()],
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
