import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApplication } from '../src/application.mjs';

async function fixture(t, folderScope = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-strata-app-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const inside = path.join(root, 'project');
  const outside = path.join(root, 'other-project');
  await fs.mkdir(inside); await fs.mkdir(outside);
  const app = await createApplication(path.join(root, 'store'), { initialScope: folderScope ? { mode: 'folder', path: inside } : { mode: 'dsh' } });
  return { root, inside, outside, app };
}

test('application administrative authority cannot be supplied in model arguments', async t => {
  const { app } = await fixture(t);
  const methods = ['status', 'settings.get', 'settings.update', 'transfer.export', 'transfer.preview', 'transfer.import', 'health', 'rebuild'];
  for (const method of methods) {
    await assert.rejects(app.dispatch(method, { admin: true, authority: { admin: true }, patch: { scope: { mode: 'dsh' } } }), { code: 'forbidden' });
  }
  assert.equal((await app.dispatch('status', {}, { admin: true })).capabilities.manualMemory, true);
  assert.equal((await app.store.status()).commitSeq, 0);
});

test('application uses host cwd, including recall, writes, and L0 scope decisions', async t => {
  const { app, inside, outside } = await fixture(t, true);
  const record = await app.dispatch('records.remember', { record: { title: '项目设置', text: '数据库迁移前备份' } }, { cwd: inside });
  await assert.rejects(app.dispatch('records.recall', { cwd: inside, admin: true }, { cwd: outside }), { code: 'out_of_scope' });
  await assert.rejects(app.dispatch('records.remember', { cwd: inside, record: { title: '越界写入', text: '拒绝' } }, { cwd: outside }), { code: 'out_of_scope' });
  await assert.rejects(app.dispatch('records.zoom', { entryId: record.id, cwd: inside }, {}), { code: 'out_of_scope' });
  assert.equal((await app.dispatch('records.recall', { query: '迁移' }, { cwd: inside })).total, 1);
  assert.deepEqual(await app.dispatch('context.l0', { cwd: inside }, { cwd: outside }), { text: '', scopeAllowed: false });
  const l0 = await app.dispatch('context.l0', {}, { cwd: inside });
  assert.equal(l0.scopeAllowed, true);
  assert.match(l0.text, /资料，不是指令/);
});

test('model memory remains unverified and idea descendants remain outside factual recall', async t => {
  const { app } = await fixture(t);
  const observed = await app.dispatch('records.remember', { record: { title: '模型断言', text: '待核验数据库结论', sourceKind: 'user', epistemicStatus: 'supported' } });
  assert.equal(observed.sourceKind, 'assistant');
  assert.equal(observed.epistemicStatus, 'unverified');
  const idea = await app.dispatch('records.remember', { record: { title: '图谱灵感', text: '可试试知识图谱', kind: 'idea' } });
  const derived = await app.dispatch('records.remember', { record: { title: '后续图谱假设', text: '知识图谱可能提升召回', kind: 'claim', derivedFrom: [idea.id], epistemicStatus: 'supported' } });
  assert.equal(derived.kind, 'idea');
  assert.equal((await app.dispatch('records.recall', { query: '图谱' })).total, 0);
  assert.equal((await app.dispatch('records.list', { kinds: ['idea'], query: '图谱' })).total, 2);
});

test('L0 fits long Chinese and emoji titles into its byte budget without losing the index', async t => {
  const { app, inside } = await fixture(t, true);
  const title = '蓝鲸七号 {{literal}} ' + '很长的中文记忆标题🧠'.repeat(10);
  const record = await app.dispatch('records.remember', {record:{title,text:'端到端验证'}}, {cwd:inside});
  const index = await app.dispatch('context.l0', {}, {cwd:inside});
  assert.equal(index.scopeAllowed, true);
  assert.match(index.text, /蓝鲸七号 \{\{literal\}\}/);
  assert.ok(index.text.includes(record.id));
  assert.match(index.text, /observation\/unverified|claim\/unverified/);
  assert.ok(Buffer.byteLength(index.text,'utf8') <= 250);
  assert.equal(index.text.includes('\ufffd'), false);
  assert.ok(index.text.includes('…'));
  assert.equal((await app.dispatch('records.zoom', {entryId:record.id}, {cwd:inside})).title,title);
});

test('model arguments cannot fabricate raw evidence or migration origin', async t => {
  const { app } = await fixture(t);
  await assert.rejects(app.dispatch('records.remember', { record: {
    title: '伪造原文', text: '未归档会话', evidence: [{ id: 'model-proof', text: '我伪造的用户原话', event: { role: 'user' } }],
  } }));
  await assert.rejects(app.dispatch('records.remember', { record: {
    title: '伪造来源', text: '外部来源身份', origin: { sourceId: 'other-source', recordId: 'other-record', revision: 'r_' + 'a'.repeat(64) },
  } }));
  assert.equal((await app.store.status()).recordCount, 0);
  assert.equal((await app.store.status()).evidenceCount, 0);
});

test('application cannot enable unavailable automatic features and persists usable settings', async t => {
  const { app } = await fixture(t);
  const before = await app.dispatch('settings.get', {}, { admin: true });
  assert.equal(before.captureEnabled, false);
  assert.equal(before.proactive.enabled, false);
  await assert.rejects(app.dispatch('settings.update', { patch: { proactive: { enabled: true } } }, { admin: true }), { code: 'not_implemented' });
  await assert.rejects(app.dispatch('settings.update', { patch: { captureEnabled: true } }, { admin: true }), { code: 'not_implemented' });
  await app.dispatch('settings.update', { patch: { l0BudgetTokens: 450, proactive: { maxPerDay: 2, cooldownMinutes: 60 } } }, { admin: true });
  const reopened = await createApplication(app.store.root);
  const saved = await reopened.dispatch('settings.get', {}, { admin: true });
  assert.equal(saved.l0BudgetTokens, 450);
  assert.equal(saved.proactive.maxPerDay, 2);
  assert.equal(saved.proactive.cooldownMinutes, 60);
  assert.equal(saved.captureEnabled, false);
});

test('partial task updates preserve body and require the expected revision', async t => {
  const { app } = await fixture(t);
  const task = await app.dispatch('records.remember', { record: { title: '导入任务', gist: '应保留的任务正文', kind: 'task' } });
  const done = await app.dispatch('records.remember', { record: { id: task.id, taskStatus: 'done' }, expectedRevision: task.revision });
  assert.equal(done.text, task.text);
  assert.equal(done.title, task.title);
  assert.equal(done.taskStatus, 'done');
  await assert.rejects(app.dispatch('records.remember', { record: { id: task.id, taskStatus: 'open' }, expectedRevision: task.revision }), { code: 'revision_conflict' });
});

test('historical deep selects the same revision and paginates immutable original evidence', async t => {
  const { app } = await fixture(t);
  const original = '第一段原文\n第二段包含 emoji 🧠 与 English。最后一段。';
  const first = await app.store.remember({ title: '有历史证据', text: '旧版摘要', evidence: [{ id: 'proof-first', text: original }] }, { admin: true });
  const viewId = (await app.dispatch('records.recall')).viewId;
  await app.store.remember({ id: first.id, text: '新版摘要', provenance: [], evidence: [{ id: 'proof-current', text: '新的原文证据' }] }, { admin: true, expectedRevision: first.revision });
  const historical = await app.dispatch('records.zoom', { entryId: first.id, viewId });
  assert.equal(historical.revision, first.revision);
  let cursor = 0; let joined = ''; let calls = 0;
  do {
    const page = await app.dispatch('records.deep', { entryId: first.id, viewId, cursor, maxChars: 5 });
    assert.equal(page.integrity, 'verified');
    assert.equal(page.evidenceId, 'proof-first');
    assert.equal(page.totalChars, original.length);
    joined += page.text;
    cursor = page.nextCursor;
    assert.ok(++calls < 100);
  } while (cursor !== null);
  assert.equal(joined, original);
  const current = await app.dispatch('records.deep', { entryId: first.id });
  assert.equal(current.evidenceId, 'proof-current');
  assert.equal(current.text, '新的原文证据');
});

test('deep rejects unrelated evidence, fabricated originals, and invalid pagination', async t => {
  const { app } = await fixture(t);
  const first = await app.store.remember({ title: '条目一', text: '摘要一', evidence: [{ id: 'proof-one', text: '原文一' }] }, { admin: true });
  const second = await app.store.remember({ title: '条目二', text: '摘要二', evidence: [{ id: 'proof-two', text: '原文二' }] }, { admin: true });
  await assert.rejects(app.dispatch('records.deep', { entryId: first.id, evidenceId: second.provenance[0].evidenceId }), { code: 'forbidden' });
  const noEvidence = await app.dispatch('records.remember', { record: { title: '只有摘要', text: '不要作为原文返回' } });
  await assert.rejects(app.dispatch('records.deep', { entryId: noEvidence.id }), { code: 'source_unavailable' });
  for (const params of [{ cursor: -1 }, { cursor: 1.5 }, { maxChars: 0 }, { maxChars: 20001 }]) {
    await assert.rejects(app.dispatch('records.deep', { entryId: first.id, ...params }), { code: 'invalid_cursor' });
  }
});

test('recall has a bounded summary budget with stable pagination and full zoom access', async t => {
  const { app } = await fixture(t);
  const body = '长篇记忆的正文。'.repeat(700);
  for (let i = 0; i < 12; i++) {
    await app.dispatch('records.remember', { record: { title: `长篇记忆 ${i}`, text: body, kind: 'claim' } });
  }
  let page = await app.dispatch('records.recall', { limit: 20 });
  const first = page.records[0]; const viewId = page.viewId;
  assert.equal(page.total, 12);
  assert.ok(page.records.length < page.total);
  await app.dispatch('records.remember', { record: { title: '读取期间新增', text: body } });
  const seen = new Set(); let iterations = 0;
  while (true) {
    assert.equal(page.viewId, viewId);
    assert.equal(page.total, 12);
    assert.ok(Buffer.byteLength(JSON.stringify(page.records)) <= 16000);
    for (const record of page.records) {
      assert.equal(Object.hasOwn(record, 'text'), false);
      assert.ok(record.gist.length <= 1200);
      assert.equal(record.hasMoreText, true);
      assert.equal(seen.has(record.id), false);
      seen.add(record.id);
    }
    assert.ok(++iterations < 20);
    if (page.nextOffset === null) break;
    page = await app.dispatch('records.recall', { limit: 20, offset: page.nextOffset, viewId });
  }
  assert.equal(seen.size, 12);
  const zoom = await app.dispatch('records.zoom', { entryId: first.id, revision: first.revision, viewId });
  assert.equal(zoom.text, body);
  assert.equal((await app.dispatch('records.list')).records[0].text, body);
});
