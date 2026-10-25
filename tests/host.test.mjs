import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
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
    if (method === 'settings.get') return { capture: { enabled: false } };
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
  assert.equal(f.calls.find(call => call.method === 'settings.get').auth.admin, false);
  const unrelated = assembly();
  await middleware(unrelated, { agent: f.agent, scope: {} }, async () => unrelated);
  assert.equal(unrelated.contexts.length, 0);
  const afterUnrelated = f.calls.length;
  assert.equal(afterUnrelated, 2, '无关 scope 不应产生新的 dispatch');
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
