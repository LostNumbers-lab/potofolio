import { cp, mkdir, writeFile } from 'node:fs/promises';

// The chatbot is buildless; preserve its HTML, JSON and module paths together.
await cp(new URL('../chatbot/', import.meta.url), new URL('../dist/chatbot/', import.meta.url), { recursive: true });

await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../dist/server/index.js', import.meta.url),
  `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
`,
  'utf8',
);
