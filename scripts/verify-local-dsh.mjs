import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as host from '../src/host/index.mjs';

// This harness creates isolated Cordis services; it never boots or changes a DSH profile.
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedSdk = process.argv[2] ?? process.env.DSH_SDK_ROOT;
const candidates = requestedSdk ? [path.resolve(requestedSdk)] : [
  path.join(os.homedir(), '.dsh', 'profiles', 'node_modules'),
  path.join(path.dirname(process.execPath), 'node_modules', '@deepseek-ai', 'dsh', 'node_modules'),
];
let sdkRoot;
for (const candidate of candidates) {
  try {
    await fs.access(path.join(candidate, '@deepseek-ai', 'cordis', 'lib', 'index.js'));
    sdkRoot = candidate;
    break;
  } catch {}
}
if (!sdkRoot) {
  console.log('SKIP: 本地 DSH SDK 未找到。设置 DSH_SDK_ROOT，或运行 node scripts/verify-local-dsh.mjs <DSH 的 node_modules 目录>。');
  process.exit(0);
}
const sdkFile = (name, file = 'lib/index.js') => path.join(sdkRoot, '@deepseek-ai', name, file);
try {
  await fs.access(sdkFile('cordis'));
  await fs.access(sdkFile('dsh-system-prompt'));
  await fs.access(sdkFile('dsh-tools'));
} catch {
  console.log(`SKIP: 本地 DSH SDK 不存在：${sdkRoot}\n可指定 node scripts/verify-local-dsh.mjs <DSH 的 node_modules 目录>`);
  process.exit(0);
}

const sdkImport = name => import(pathToFileURL(sdkFile(name)).href);
const [{ Context }, { default: SystemPrompt }, { default: ToolRuntime }, boot, { HostConnectionService }] = await Promise.all([
  sdkImport('cordis'), sdkImport('dsh-system-prompt'), sdkImport('dsh-tools'), sdkImport('dsh-app-boot'), sdkImport('dsh-client-connection'),
]);
const sdkManifest = JSON.parse(await fs.readFile(sdkFile('dsh-client-connection', 'package.json'), 'utf8'));
const entries = boot.composeEntries([boot.loadOverlayPatches('dsh', path.join(packageRoot, 'cordis.patch.yml'))]);
assert.equal(entries.length, 1);
assert.equal(entries[0].id, 'dsh-strata');
assert.equal(entries[0].name, 'dsh-strata');

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-strata-host-'));
const ctx = new Context();
const fibers = [];
let registeredRoute;
const server = http.createServer((request, response) => {
  if (!registeredRoute) { response.writeHead(404); response.end(); return; }
  Promise.resolve(registeredRoute.handler(request, response)).catch(error => { response.writeHead(500); response.end(error.stack); });
});
try {
  const cwd = path.join(temporaryRoot, 'project');
  await fs.mkdir(cwd);
  const agent = { id: 'host-fixture', status: 'running', session: { id: 'host-fixture', header: { id: 'host-fixture', cwd } } };
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  fibers.push(await ctx.plugin({ apply(c) {
    c.provide('agents', { get: id => id === agent.id ? agent : undefined, currentInitiator: () => agent });
    c.provide('webServer', { host: '127.0.0.1', protocol: 'http:', register(route) {
      assert.equal(route.path, '/strata');
      registeredRoute = route;
      return () => { registeredRoute = undefined; };
    } });
  } }));
  fibers.push(await ctx.plugin({ apply(c) {
    // Only admission is simulated. The real Connection service handles its
    // Context-scoped registration and the complete HTTP/RPC envelope path.
    new HostConnectionService(c, [], {
      isAuthenticated: request => request.headers['x-smoke-owner'] === 'yes',
      authenticateApi: () => undefined,
    });
  } }));
  fibers.push(await ctx.plugin(SystemPrompt, { includeHarnessIdentity: false }));
  fibers.push(await ctx.plugin(ToolRuntime, { mode: 'native' }));
  fibers.push(await ctx.plugin(host, { root: path.join(temporaryRoot, 'memory') }));

  assert.ok(registeredRoute, 'real Connection registered the Strata HTTP route');
  async function handler(method, payload, admitted = true) {
    const response = await fetch(`${baseUrl}/strata/${method}`, { method: 'POST', headers: {
      'content-type': 'application/json', ...(admitted ? {'x-smoke-owner':'yes'} : {}),
    }, body: JSON.stringify({type:'client-request',rpcId:'smoke',method,payload}) });
    if (!admitted) return response;
    assert.equal(response.status, 200, await response.clone().text());
    const envelope = await response.json();
    assert.equal(envelope.type,'server-response');
    return envelope.result;
  }
  assert.equal((await handler('status', {}, false)).status, 401);
  const settings = await handler('settings.update', { patch: { scope: { mode: 'folder', path: cwd, includeSubfolders: true } } });
  assert.equal(settings.ok, true, JSON.stringify(settings));
  const note = await handler('records.remember', { record: { title: 'Fixture {{literal}}', text: 'Isolated memory', kind: 'claim' } });
  assert.equal(note.ok, true, JSON.stringify(note));
  const assembly = await ctx.get('systemPrompt').assemble({ agent, scope: agent });
  assert.deepEqual(assembly.tools.map(tool => tool.name).sort(), ['strata_deep', 'strata_recall', 'strata_remember', 'strata_zoom']);
  assert.equal(assembly.contexts.length, 1);
  assert.match(assembly.contexts[0].text, /Fixture/);
  assert.equal(assembly.contexts[0].interpolate, false);
  assert.equal((await ctx.get('systemPrompt').assemble({ agent, scope: {} })).contexts.length, 0);

  const clientBundle = path.join(packageRoot, 'lib/client.js');
  let clientStatus = 'SKIP: run npm run build to verify the client bundle';
  try {
    await fs.access(clientBundle);
    // React is supplied by DSH's browser module table, not necessarily installed
    // as a Node dependency. This checks the module/slot contract only; browser
    // rendering is covered by the separate Chrome UI smoke test.
    const browserReact = Object.freeze(Object.fromEntries(['createElement', 'useEffect', 'useRef'].map(name => [name, () => {
      throw new Error(`Structural client smoke must not render React (${name}).`);
    }])));
    let definition;
    vm.runInNewContext(await fs.readFile(clientBundle, 'utf8'), { window: { __ModuleLoader__: { load(value) { definition = value; } } } });
    assert.equal(definition.id, 'dsh-strata');
    const client = definition.factory(specifier => {
      assert.equal(specifier, 'react');
      return browserReact;
    });
    let registration;
    client.apply({ connection: { rpc: {} }, slots: {
      inject(slot, callback) { assert.equal(slot, 'settings.section'); return callback(); },
      register(options, component) { registration = options; assert.equal(typeof component, 'function'); },
    } });
    assert.equal(registration.name, 'settings.section');
    assert.equal(registration.id, 'dsh-strata');
    clientStatus = 'PASS: structural ModuleLoader/React mock and settings.section registration (not rendering)';
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  console.log(JSON.stringify({
    sdk: sdkManifest.version,
    host: 'PASS: real HostConnectionService registration and HTTP envelope, simulated owner admission, scoped store, literal L0, four tool schemas',
    patch: 'PASS: SDK patch parser and composition',
    client: clientStatus,
    actualProfileChanged: false,
  }, null, 2));
} finally {
  await new Promise(resolve => server.close(resolve));
  for (const fiber of fibers.reverse()) await fiber.dispose();
  const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(temporaryRoot));
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(temporaryRoot).startsWith('dsh-strata-host-'));
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}
