import { once } from 'node:events';
import path from 'node:path';

// Opt-in verification through an already enabled, loopback-only DSH Inspector.
// Borrows an idle agent and uses a token-scoped hook with a temporary library.
// It does not create chats, post messages, or invoke a model or memory tool.
const endpoint = new URL(process.env.DSH_INSPECTOR_URL || 'http://127.0.0.1:9230');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)) throw new Error('Use a local DSH Inspector endpoint.');
const cwd = path.resolve(process.argv[2] || process.cwd());
const targets = await (await fetch(new URL('/json/list', endpoint))).json();
const target = targets.find(item => item.url === 'dsh://host');
if (!target) throw new Error('No running DSH Host Inspector target.');
const debuggerUrl = new URL(target.webSocketDebuggerUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(debuggerUrl.hostname)) throw new Error('Inspector target must be local.');

async function verifyInHost(wantedCwd) {
  const fs = process.getBuiltinModule('node:fs/promises');
  const path = process.getBuiltinModule('node:path');
  const os = process.getBuiltinModule('node:os');
  const { pathToFileURL } = process.getBuiltinModule('node:url');
  const table = globalThis[Symbol.for('dsh.inspector.realm-object-registries')];
  let ctx;
  if (table) outer: for (const registry of table.values()) for (const object of registry.retained.values()) {
    try { if (typeof object.get?.('pluginManager')?.listPlugins === 'function') { ctx = object; break outer; } } catch {}
  }
  if (!ctx) throw new Error('No live DSH context.');
  const agents = ctx.get('agents');
  const actualCwd = await fs.realpath(wantedCwd);
  let agent;
  for (const candidate of agents.list()) {
    if (candidate.status !== 'idle' || !candidate.session?.header?.cwd) continue;
    try { if (path.relative(actualCwd, await fs.realpath(candidate.session.header.cwd)) === '') { agent = candidate; break; } } catch {}
  }
  if (!agent) return { passed: false, skipped: true, reason: 'Open an idle DSH chat in the requested working directory, then retry.' };
  if (agents.get(agent.id) !== agent || agent.session.id !== agent.id || agent.session.header.id !== agent.id) throw new Error('Agent identity did not match the live registry.');
  const entry = [...ctx.loader.entries()].find(item => item.options.name === 'dsh-strata' && !item.disabled);
  if (!entry || entry.fiber?.state !== 2) throw new Error('The installed Strata plugin is not active.');
  const profile = ctx.get('profileContext');
  const installed = path.join(profile.dir, 'node_modules', 'dsh-strata');
  // Inspector evaluation has no dynamic-import callback. Node 22's require(ESM)
  // loads these synchronous module graphs through an explicit package anchor.
  const require = process.getBuiltinModule('node:module').createRequire(pathToFileURL(path.join(installed, 'package.json')));
  const { createApplication } = require('./src/application.mjs');
  const { createPromptMiddleware, CONTEXT_NAME } = require('./src/host/adapter.mjs');
  const version = JSON.parse(await fs.readFile(path.join(installed, 'package.json'), 'utf8')).version;
  const liveRoot = entry.options.config?.root || path.join(os.homedir(), '.dsh', 'strata');
  const headBefore = await fs.readFile(path.join(liveRoot, 'HEAD.json'), 'utf8');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'strata-live-l0-'));
  let owner;
  let probeMiddleware;
  const token = {};
  const marker = '蓝鲸七号 {{literal}}';
  const memoryText = assembly => assembly.contexts.find(item => item.name === CONTEXT_NAME && item.text.includes(marker));
  try {
    const app = await createApplication(path.join(temporary, 'memory'), { initialScope: {mode:'folder',path:actualCwd,includeSubfolders:false} });
    owner = await ctx.root.plugin({ name: 'strata-live-l0-probe', inject: ['agents'], apply(probeCtx) {
      const middleware = createPromptMiddleware(probeCtx, app);
      probeMiddleware = middleware;
      probeCtx.on('system-prompt/assemble', (assembly, context, next) => context?.__strataL0Probe === token ? middleware(assembly, context, next) : next());
    } });
    const prompt = ctx.get('systemPrompt');
    const context = {agent,scope:agent,__strataL0Probe:token};
    const empty = await prompt.assemble(context);
    await app.dispatch('records.remember', {record:{title:marker+' '+ '长中文标题🧠'.repeat(20),text:'端到端验证，仅临时库。'}}, {admin:true});
    const assembled = await prompt.assemble(context);
    const injected = memoryText(assembled);
    const refreshed = prompt.refreshContext(assembled, context);
    const fake = {id:agent.id,session:agent.session,status:agent.status};
    // Other host providers assume a complete Agent; test the authorization
    // rejection at the memory middleware instead of passing a forgery to them.
    const blank = {contexts:[],sections:[],tools:[]};
    const forged = await probeMiddleware(blank,{agent:fake,scope:fake},async()=>blank);
    const mismatched = await prompt.assemble({agent,scope:{},__strataL0Probe:token});
    const noAgent = await prompt.assemble({__strataL0Probe:token});
    const denied = path.join(temporary, 'other-project'); await fs.mkdir(denied);
    await app.store.updateSettings({scope:{mode:'folder',path:denied,includeSubfolders:false}});
    const outside = await prompt.assemble(context);
    const checks = {
      liveRegisteredAgent: agents.get(agent.id) === agent,
      emptyLibrarySkipsMarker: !memoryText(empty),
      longChineseTitleInjected: Boolean(injected),
      titleIsLiteral: injected?.interpolate === false && injected.text.includes('{{literal}}'),
      refreshPreservesMarker: Boolean(memoryText(refreshed)),
      forgedIdentityRejectedByMiddleware: !memoryText(forged),
      mismatchedScopeRejected: !memoryText(mismatched),
      agentlessAssemblySkipsMarker: !memoryText(noAgent),
      outOfRangeRejected: !memoryText(outside),
      permanentLibraryHeadUnchanged: headBefore === await fs.readFile(path.join(liveRoot, 'HEAD.json'), 'utf8'),
    };
    return {passed:Object.values(checks).every(Boolean),version,checks,library:'temporary',borrowedExistingIdleAgent:true,modelTestMessagesSent:0,memoryToolsInvoked:0};
  } finally {
    if (owner) await owner.dispose();
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(temporary));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(temporary).startsWith('strata-live-l0-')) throw new Error('Unsafe temporary directory cleanup path.');
    await fs.rm(temporary,{recursive:true,force:true});
  }
}

const socket = new WebSocket(debuggerUrl);
await once(socket, 'open');
try {
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Live L0 verification timed out.')), 60000);
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      clearTimeout(timer);
      if (message.error) return reject(new Error(message.error.message));
      const detail = message.result.exceptionDetails;
      if (detail) return reject(new Error(detail.exception?.description || detail.text));
      resolve(message.result.result.value);
    });
    socket.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:`(${verifyInHost.toString()})(${JSON.stringify(cwd)})`,returnByValue:true,awaitPromise:true}}));
  });
  console.log(JSON.stringify(result,null,2));
  if (!result.passed) process.exitCode = 1;
} finally { socket.close(); }
