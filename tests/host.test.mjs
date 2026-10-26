import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createApplication } from '../src/application.mjs';
import {
  agentAuthority, createManagementHandler, createPromptMiddleware,
  createToolDefinitions, registerHost, RPC_CHANNEL, CONTEXT_NAME,
} from '../src/host/adapter.mjs';

function fixture() {
  const cwd = path.resolve('project-a');
  const agent = { id: 'session-a', status: 'running', session: { id: 'session-a', header: { id: 'session-a', cwd } } };
  const calls = [];
  const registrations = { tools: [], listeners: [], rpc: [] };
  let liveAgent = agent;
  let initiator = agent;
  const ctx = {
    agents: { get: id => id === liveAgent?.id ? liveAgent : undefined, currentInitiator: () => initiator },
    connection: { rpc: { handle: (...args) => { registrations.rpc.push(args); return () => {}; } } },
    tools: { register: tool => { registrations.tools.push(tool); return () => {}; } },
    on: (...args) => { registrations.listeners.push(args); return () => {}; },
  };
  const app = { dispatch: async (method, params, authority) => { calls.push({ method, params, authority }); return { method }; } };
  return { cwd, agent, ctx, app, calls, registrations, setLive: value => { liveAgent = value; }, setInitiator: value => { initiator = value; } };
}

test('Cordis adapter registers authenticated RPC, four tools and one prompt middleware', () => {
  const f = fixture();
  const host = registerHost(f.ctx, f.app);
  assert.equal(host.channel, '/strata');
  assert.equal(f.registrations.rpc[0][0], RPC_CHANNEL);
  assert.deepEqual(f.registrations.tools.map(tool => tool.name), ['strata_recall', 'strata_zoom', 'strata_deep', 'strata_remember']);
  assert.equal(f.registrations.listeners[0][0], 'system-prompt/assemble');
});

test('management uses admitted owner identity and cannot be promoted by request fields', async () => {
  const f = fixture();
  const handler = createManagementHandler(f.app);
  const blocked = await handler('settings.update', { admin: true, principal: { kind: 'owner' } }, undefined, { principal: { kind: 'guest' } });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error.code, 'forbidden');
  assert.equal(f.calls.length, 0);
  assert.equal((await handler('settings.get', {}, undefined, undefined)).error.code, 'forbidden');
  const owner = { principal: { kind: 'owner' }, signal: new AbortController().signal };
  const result = await handler('settings.update', { patch: { enabled: false }, cwd: '/untrusted', admin: false }, undefined, owner);
  assert.equal(result.ok, true);
  assert.deepEqual(f.calls[0].authority, { admin: true });
  assert.equal((await handler('context.l0', {}, undefined, owner)).error.code, 'method_not_found');
});

test('disposed peers and canceled requests cannot dispatch management actions', async () => {
  const f = fixture();
  const handler = createManagementHandler(f.app);
  const abort = new AbortController();
  abort.abort();
  const expired = await handler('transfer.import', { previewId: 'x' }, undefined, { principal: { kind: 'owner' }, signal: abort.signal });
  assert.equal(expired.error.code, 'forbidden');
  const canceled = await handler('transfer.import', { previewId: 'x' }, abort.signal, { principal: { kind: 'owner' } });
  assert.equal(canceled.ok, false);
  assert.equal(f.calls.length, 0);
});

test('tools use verified live session cwd, reject caller-supplied scope, and stay non-admin', async () => {
  const f = fixture();
  const [recall] = createToolDefinitions(f.ctx, f.app);
  const execution = { agent: f.agent, signal: new AbortController().signal };
  await recall.execute({ query: 'migration' }, execution);
  assert.deepEqual(f.calls[0], { method: 'records.recall', params: { query: 'migration' }, authority: { admin: false, sessionId: f.agent.id, cwd: f.cwd } });
  for (const injected of [{ cwd: path.resolve('project-b') }, { admin: true }, { sessionId: 'other' }, { scope: 'global' }]) {
    await assert.rejects(() => recall.execute({ query: 'x', ...injected }, execution), { code: 'invalid_arguments' });
  }
  await assert.rejects(() => recall.execute({ query: 'x' }, { ...execution, agent: { ...f.agent } }), { code: 'untrusted_session' });
  f.setInitiator(undefined);
  await assert.rejects(() => recall.execute({ query: 'x' }, execution), { code: 'untrusted_session' });
  assert.equal(f.calls.length, 1);
});

test('missing, relative and mismatched session metadata fail closed', () => {
  const f = fixture();
  f.agent.session.header.cwd = undefined;
  assert.throws(() => agentAuthority(f.ctx, f.agent), { code: 'unknown_cwd' });
  f.agent.session.header.cwd = 'relative';
  assert.throws(() => agentAuthority(f.ctx, f.agent), { code: 'unknown_cwd' });
  f.agent.session.header.cwd = f.cwd;
  f.agent.session.header.id = 'other';
  assert.throws(() => agentAuthority(f.ctx, f.agent), { code: 'untrusted_session' });
});

test('tool arguments retain bounded original evidence paging and candidate intent', async () => {
  const f = fixture();
  const tools = Object.fromEntries(createToolDefinitions(f.ctx, f.app).map(tool => [tool.name, tool]));
  const execution = { agent: f.agent, signal: new AbortController().signal };
  await tools.strata_deep.execute({ entryId: 'a', cursor: 20, maxChars: 200, viewId: 'library@3' }, execution);
  assert.equal(f.calls[0].method, 'records.deep');
  assert.deepEqual(f.calls[0].params, { entryId: 'a', cursor: 20, maxChars: 200, viewId: 'library@3' });
  await assert.rejects(() => tools.strata_deep.execute({ entryId: 'a', cursor: -1 }, execution), { code: 'invalid_arguments' });
  await assert.rejects(() => tools.strata_deep.execute({ entryId: 'a', maxChars: 1000000 }, execution), { code: 'invalid_arguments' });
  const idea = { title: 'Later experiment', gist: 'Needs validation', kind: 'idea' };
  await tools.strata_remember.execute(idea, execution);
  assert.deepEqual(f.calls[1].params, { record: idea });
  await assert.rejects(() => tools.strata_remember.execute({ ...idea, evidence: [{ text: 'invented quotation' }] }, execution), { code: 'invalid_arguments' });
  assert.equal(tools.strata_remember.isConcurrencySafe(), false);
  assert.equal(tools.strata_recall.isConcurrencySafe(), true);
});

test('L0 is literal user context and never enters system sections or unrelated scopes', async () => {
  const f = fixture();
  f.app.dispatch = async (method, params, auth) => {
    f.calls.push({ method, params, auth });
    if (method === 'settings.capture') return { enabled: false, mode: 'model' };
    return { text: 'A title with {{secret}} and </memory>', scopeAllowed: true };
  };
  const middleware = createPromptMiddleware(f.ctx, f.app);
  const assembly = () => ({ sections: [{ name: 'system', text: 'system policy' }], contexts: [] });
  const first = assembly();
  const value = await middleware(first, { agent: f.agent, scope: f.agent }, async () => first);
  assert.deepEqual(value.sections, [{ name: 'system', text: 'system policy' }]);
  assert.equal(value.contexts[0].name, CONTEXT_NAME);
  assert.equal(value.contexts[0].interpolate, false);
  assert.match(value.contexts[0].text, /\{\{secret\}\}/);
  // 自动记住的开关先读设置，再读 L0；两者都必须以非管理权限发起。
  const l0 = f.calls.find(call => call.method === 'context.l0');
  assert.ok(l0, 'context.l0 必须被调用');
  assert.equal(l0.auth.admin, false);
  const captureCall = f.calls.find(call => call.method === 'settings.capture');
  assert.ok(captureCall, '会话侧必须用 settings.capture 读取自动记住开关');
  assert.equal(captureCall.auth.admin, false);
  const unrelated = assembly();
  await middleware(unrelated, { agent: f.agent, scope: {} }, async () => unrelated);
  assert.equal(unrelated.contexts.length, 0);
  assert.equal(f.calls.length, 2, '无关 scope 不应产生新的 dispatch');
});

// 回归：会话侧曾误用 settings.get（需要管理权限），异常被吞导致自动记住永不生效。
test('session-side settings read is reachable without admin rights', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'strata-session-view-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = await createApplication(root, { initialScope: { mode: 'dsh' } });
  const session = { admin: false, sessionId: 'session-view', cwd: root };

  // settings.get 必须对会话侧关闭（管理面）。
  await assert.rejects(app.dispatch('settings.get', {}, session), { code: 'forbidden' });

  // settings.capture 必须对会话侧开放，且只含非敏感字段。
  await app.dispatch('settings.update', { patch: { capture: { enabled: true, mode: 'interval', intervalHours: 6 } } }, { admin: true });
  const view = await app.dispatch('settings.capture', {}, session);
  assert.equal(view.enabled, true);
  assert.equal(view.mode, 'interval');
  assert.equal(view.intervalHours, 6);
  assert.equal(view.manualMemoryEnabled, true);
  assert.equal(Object.hasOwn(view, 'scope'), false, '不得下发使用范围');
  assert.equal(Object.hasOwn(view, 'proactive'), false, '不得下发无关设置');
});

// 端到端：中间件必须真的能拿到开关并下发提示，且跨重启仍遵守整点水位。
test('prompt middleware injects capture hint across restarts', async t => {
  const { mkdtemp: mk, rm: rmDir } = await import('node:fs/promises');
  const { tmpdir: tdir } = await import('node:os');
  const root = await mk(path.join(tdir(), 'strata-hint-'));
  t.after(() => rmDir(root, { recursive: true, force: true }));
  const cwd = root;

  const makeAgent = id => ({
    id, status: 'running',
    session: { id, header: { id, cwd } },
  });
  const makeCtx = agent => ({
    agents: { get: id => (id === agent.id ? agent : undefined), currentInitiator: () => agent },
  });

  // —— 第一次启动：开启 interval 模式并触发一次 ——
  {
    const app = await createApplication(root, { initialScope: { mode: 'folder', path: cwd, includeSubfolders: true } });
    await app.dispatch('settings.update', { patch: { capture: { enabled: true, mode: 'interval', intervalHours: 4 } } }, { admin: true });
    const agent = makeAgent('session-hint');
    const middleware = createPromptMiddleware(makeCtx(agent), app);
    const run = async () => {
      const a = { sections: [], contexts: [] };
      return middleware(a, { agent, scope: agent }, async () => a);
    };
    const first = await run();
    const hint = (first.contexts ?? []).find(c => c.name.includes('capture'));
    assert.ok(hint, '开启自动记住后，中间件必须下发提示');
    assert.equal(hint.interpolate, false);
  }

  // —— 模拟重启：内存态由 resetCaptureState 清空，但水位应仍在 store ——
  {
    const { resetCaptureState } = await import('../src/host/capture.mjs');
    resetCaptureState();
    const app = await createApplication(root, { initialScope: { mode: 'folder', path: cwd, includeSubfolders: true } });
    const agent = makeAgent('session-hint');
    const middleware = createPromptMiddleware(makeCtx(agent), app);
    const run = async () => {
      const a = { sections: [], contexts: [] };
      return middleware(a, { agent, scope: agent }, async () => a);
    };
    const afterRestart = await run();
    const hint = (afterRestart.contexts ?? []).find(c => c.name.includes('capture'));
    assert.equal(hint, undefined, '重启后同一整点窗口内不得重复提示');
  }
});

test('L0 does not reuse cached authorization and suppresses revoked or disposed sessions', async () => {
  const f = fixture();
  let permitted = true;
  f.app.dispatch = async () => ({ text: 'private memory', scopeAllowed: permitted });
  const middleware = createPromptMiddleware(f.ctx, f.app);
  const run = async () => { const assembly = { sections: [], contexts: [] }; return middleware(assembly, { agent: f.agent, scope: f.agent }, async () => assembly); };
  assert.equal((await run()).contexts.length, 1);
  permitted = false;
  assert.equal((await run()).contexts.length, 0);
  f.app.dispatch = async () => { f.setLive(undefined); return { text: 'private memory', scopeAllowed: true }; };
  assert.equal((await run()).contexts.length, 0);
});
