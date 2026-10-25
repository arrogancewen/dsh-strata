import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['client/host-entry.mjs'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['react', 'react-dom'],
  loader: { '.css': 'text' },
  write: false,
  legalComments: 'none',
});
const code = `window.__ModuleLoader__.load({id:'dsh-strata',factory:function(require){\nvar module={exports:{}};var exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;\n}});\n`;
await mkdir(path.join(root, 'lib'), { recursive: true });
await writeFile(path.join(root, 'lib/client.js'), code, 'utf8');
console.log(`Built lib/client.js (${Buffer.byteLength(code)} bytes)`);
