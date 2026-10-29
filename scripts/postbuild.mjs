import { cp, mkdir, writeFile } from 'node:fs/promises';

// file:// 호환용 defer 스크립트는 Vite가 번들링하지 않으므로 직접 포함합니다.
await cp(new URL('../js/', import.meta.url), new URL('../dist/js/', import.meta.url), { recursive: true });

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
