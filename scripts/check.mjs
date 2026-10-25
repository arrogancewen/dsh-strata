import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let checked = 0;
async function check(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  for (const entry of entries) {
    const item = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await check(item);
    else if (/\.(mjs|js)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', item], { encoding: 'utf8', windowsHide: true });
      if (result.status !== 0) throw new Error(result.stderr || `Cannot check ${item}`);
      checked++;
    }
  }
}
for (const dir of ['src', 'client', 'scripts', 'tests', 'lib']) await check(path.join(root, dir));
console.log(`Syntax checked ${checked} JavaScript files.`);
