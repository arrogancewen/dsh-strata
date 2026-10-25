import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  StrataStore, canonicalJson, sha256, normalizeImportedRecord, normalizeImportedEvidence, normalizeRecord,
  recordRevision, evidenceHash, scopeAllows, normalizeScope,
} from '../src/core/index.mjs';

async function fixture(t, scope = { mode: 'dsh' }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-strata-core-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = await StrataStore.open(path.join(root, 'store'), { initialScope: scope, lockTimeoutMs: 100 });
  return { root, store };
}

test('persistent CJK recall, negative queries, and idea isolation', async t => {
  const { root, store } = await fixture(t);
  await store.remember({ title: '数据库迁移', text: '数据库迁移前先校验索引，避免重复导入。', tags: ['运维'] }, { admin: true });
  const idea = await store.remember({ title: '也许可以用图谱', text: '图谱可能有用', kind: 'observation', epistemicStatus: 'supported' }, { sourceKind: 'generated_suggestion' });
  assert.equal(idea.kind, 'idea');
  assert.equal(idea.epistemicStatus, 'unverified');
  const reopened = await StrataStore.open(path.join(root, 'store'));
  assert.equal((await reopened.listRecords({ query: '迁移' })).total, 1);
  assert.equal((await reopened.listRecords({ query: '索引' })).total, 1);
  assert.equal((await reopened.listRecords({ query: '不存在的量子隧穿' })).total, 0);
  assert.equal((await reopened.listRecords({ query: '图谱' })).total, 0);
  assert.equal((await reopened.listRecords({ query: '图谱', kinds: ['idea'] })).total, 1);
});

test('history searches old revision text before selecting results and keeps current authorization', async t => {
  const { root, store } = await fixture(t);
  const first = await store.remember({ title: '项目数据库', text: '主数据库选择 PostgreSQL' }, { admin: true });
  const oldView = (await store.listRecords({})).viewId;
  const second = await store.remember({ id: first.id, title: '项目数据库', text: '主数据库改为 MySQL' }, { admin: true, expectedRevision: first.revision });
  assert.notEqual(first.revision, second.revision);
  assert.equal((await store.listRecords({ query: 'PostgreSQL' })).total, 0);
  const historical = await store.listRecords({ query: 'PostgreSQL', viewId: oldView });
  assert.equal(historical.records[0].revision, first.revision);
  assert.equal((await store.getRecord(first.id, { viewId: oldView })).text, first.text);
  await assert.rejects(store.remember({ id: first.id, title: '陈旧写入', text: '错误更新' }, { admin: true, expectedRevision: first.revision }), { code: 'revision_conflict' });
  const allowed = path.join(root, 'allowed');
  const outside = path.join(root, 'outside');
  await fs.mkdir(allowed); await fs.mkdir(outside);
  await store.updateSettings({ scope: { mode: 'folder', path: allowed } });
  await assert.rejects(store.getRecord(first.id, { viewId: oldView, cwd: outside }), { code: 'out_of_scope' });
  assert.equal((await store.getRecord(first.id, { viewId: oldView, cwd: allowed })).revision, first.revision);
});

test('folder scope respects real directory boundaries, children, missing cwd, and links', async t => {
  const { root } = await fixture(t);
  const allowed = path.join(root, 'project');
  const child = path.join(allowed, 'src');
  const sibling = path.join(root, 'project-old');
  await fs.mkdir(child, { recursive: true }); await fs.mkdir(sibling);
  const scope = await normalizeScope({ mode: 'folder', path: allowed, includeSubfolders: true });
  assert.equal(await scopeAllows(scope, child), true);
  assert.equal(await scopeAllows(scope, sibling), false);
  assert.equal(await scopeAllows(scope), false);
  assert.equal(await scopeAllows({ ...scope, includeSubfolders: false }, child), false);
  const alias = path.join(allowed, 'escape');
  await fs.symlink(sibling, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(await scopeAllows(scope, alias), false);
  await assert.rejects(normalizeScope({ mode: 'folder', path: path.join(root, 'WPSDrive', 'data') }), { code: 'cloud_path_blocked' });
});

test('reopening with an old profile initialScope cannot broaden current library policy', async t => {
  const { root, store } = await fixture(t);
  const folder = path.join(root, 'project'); await fs.mkdir(folder);
  await store.updateSettings({ scope: { mode: 'folder', path: folder, includeSubfolders: false } });
  const reopened = await StrataStore.open(store.root, { initialScope: { mode: 'dsh' } });
  assert.equal((await reopened.getSettings()).scope.mode, 'folder');
  await assert.rejects(reopened.listRecords({}), { code: 'out_of_scope' });
});

test('evidence is immutable and deep requires an authorized record binding', async t => {
  const { store } = await fixture(t);
  const record = await store.remember({ title: '测试结果', text: '测试返回三项', evidence: [{ id: 'proof-a', text: '逐字原文\n三项结果', event: { type: 'tool/result', value: 3 }, sessionId: 'session-a', seq: 42 }] }, { admin: true });
  assert.equal(record.provenance.length, 1);
  const deep = await store.deep('proof-a', { entryId: record.id });
  assert.equal(deep.text, '逐字原文\n三项结果');
  assert.equal(deep.status, 'verified');
  assert.equal(deep.hash, evidenceHash(deep));
  await assert.rejects(store.deep('proof-a'), { code: 'access_denied' });
  const other = await store.remember({ title: '别的记忆', text: '无该证据' }, { admin: true });
  await assert.rejects(store.deep('proof-a', { entryId: other.id }), { code: 'access_denied' });
  await assert.rejects(store.transaction(draft => { draft.evidence['proof-a'].text = '篡改'; }, { admin: true }), { code: 'hash_mismatch' });
  assert.equal((await store.deep('proof-a', { entryId: record.id })).text, deep.text);
});

test('record-level and evidence scopes also constrain an otherwise global library', async t => {
  const { root, store } = await fixture(t);
  const inside = path.join(root, 'inside'); const outside = path.join(root, 'outside');
  await fs.mkdir(inside); await fs.mkdir(outside);
  const record = await store.remember({ title: '项目内部', text: '内部细节', scope: { mode: 'folder', path: inside } }, { admin: true });
  assert.equal((await store.listRecords({ cwd: outside })).total, 0);
  assert.equal((await store.listRecords({ cwd: inside })).total, 1);
  await assert.rejects(store.getRecord(record.id, { cwd: outside }), { code: 'out_of_scope' });
  assert.equal((await store.exportState({ cwd: outside })).records.length, 0);
});

test('concurrent instances serialize writes and transactions fail atomically', async t => {
  const { store } = await fixture(t);
  const other = await StrataStore.open(store.root);
  await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? store : other).remember({ title: `记录 ${i}`, text: `正文 ${i}` }, { admin: true })));
  assert.equal((await store.status()).recordCount, 8);
  const before = await store.status();
  await assert.rejects(store.transaction(draft => { draft.settings.l0BudgetTokens = 900; throw new Error('cancel'); }, { admin: true }), /cancel/);
  assert.equal((await store.status()).commitSeq, before.commitSeq);
  assert.equal((await store.getSettings()).l0BudgetTokens, 250);
  await assert.rejects(store.transaction(draft => { draft.settings.l0BudgetTokens = 350; }, { admin: true, expectedCommitSeq: before.commitSeq - 1 }), { code: 'revision_conflict' });
  assert.equal((await store.status()).commitSeq, before.commitSeq);
});

test('empty transaction and idempotent ingestion do not create new revisions', async t => {
  const { store } = await fixture(t);
  const input = { title: '一轮摘要', text: '同一原始轮次', idempotencyKey: 'session-a-turn-10' };
  const first = await store.remember(input, { admin: true });
  const seq = (await store.status()).commitSeq;
  const second = await store.remember(input, { admin: true });
  assert.equal(first.id, second.id);
  assert.equal((await store.status()).commitSeq, seq);
  assert.equal(await store.transaction(() => 'read-only', { admin: true }), 'read-only');
  assert.equal((await store.status()).commitSeq, seq);
});

test('old task projections cannot reopen another session completed task', async t => {
  const { store } = await fixture(t);
  const first = await store.remember({ title: '迁移任务', text: '等待接口稳定', kind: 'task' }, { admin: true });
  const done = await store.remember({ id: first.id, taskStatus: 'done' }, { admin: true, expectedRevision: first.revision });
  await assert.rejects(store.remember({ id: first.id, taskStatus: 'open' }, { admin: true, expectedRevision: first.revision }), { code: 'revision_conflict' });
  await assert.rejects(store.remember({ id: first.id, taskStatus: 'open' }, { admin: true, expectedRevision: done.revision }), { code: 'invalid_transition' });
  const reopened = await store.remember({ id: first.id, taskStatus: 'open' }, { admin: true, expectedRevision: done.revision, reopen: true });
  assert.equal(reopened.taskStatus, 'open');
});

test('idempotent ingestion still checks the saved record current scope', async t => {
  const { root, store } = await fixture(t);
  const inside = path.join(root, 'inside'); const outside = path.join(root, 'outside');
  await fs.mkdir(inside); await fs.mkdir(outside);
  const input = { title: '项目秘密', text: '只允许当前目录', scope: { mode: 'folder', path: inside }, idempotencyKey: 'known-key' };
  const first = await store.remember(input, { cwd: inside });
  await assert.rejects(store.remember({ title: '重放', text: '', idempotencyKey: 'known-key' }, { cwd: outside }), { code: 'out_of_scope' });
  assert.equal((await store.remember(input, { cwd: inside })).id, first.id);
  assert.equal((await store.status()).commitSeq, 1);
});

test('migration helpers preserve origin, recompute target revisions and do not promote trust', async t => {
  const { store } = await fixture(t);
  const source = await store.remember({ title: '已观察结果', text: '有限条件下有效', epistemicStatus: 'supported' }, { admin: true, confirmedResult: true });
  const imported = normalizeImportedRecord(source, { id: 'imported-one', sourceId: 'foreign-store', parentRevision: null });
  assert.equal(imported.epistemicStatus, 'unverified');
  assert.equal(imported.sourceKind, 'imported');
  assert.equal(imported.origin.revision, source.revision);
  assert.equal(imported.origin.recordId, source.id);
  assert.equal(imported.parentRevision, null);
  assert.equal(imported.revision, recordRevision(imported));
  await store.transaction(draft => { draft.records[imported.id] = [imported]; draft.imports.package1 = { mapping: { a: imported.id } }; }, { admin: true });
  assert.equal((await store.getRecord(imported.id)).origin.sourceId, 'foreign-store');
  assert.ok((await store.exportState({ admin: true })).imports.package1);
  assert.equal(Object.hasOwn(await store.exportState({}), 'imports'), false);
  assert.throws(() => normalizeImportedEvidence({ id: 'bad-proof', text: 'a', hash: sha256('different') }), { code: 'hash_mismatch' });
  assert.throws(() => normalizeImportedRecord({ ...source, id: '../escape' }), { code: 'invalid_id' });
});

test('missing evidence is reported and corrupted HEAD never silently initializes or falls back', async t => {
  const { store } = await fixture(t);
  const record = await store.remember({ title: '原文尚不可用', text: '保留明确缺口', provenance: [{ evidenceId: 'missing-proof' }] }, { admin: true });
  const health = await store.health();
  assert.equal(health.ok, false);
  assert.equal(health.missingEvidence[0].recordId, record.id);
  await assert.rejects(store.deep('missing-proof', { entryId: record.id }), { code: 'source_unavailable' });
  await fs.writeFile(path.join(store.root, 'HEAD.json'), '{ broken');
  await assert.rejects(StrataStore.open(store.root), { code: 'store_corrupt' });
  assert.equal((await store.health()).ok, false);
});

test('historical commits are append-only and rebuild is a projection repair, not history mutation', async t => {
  const { store } = await fixture(t);
  const record = await store.remember({ title: '可读记忆', text: '正文' }, { admin: true });
  await assert.rejects(store.transaction(draft => { delete draft.records[record.id]; }, { admin: true }), { code: 'immutable_history' });
  const before = (await store.status()).commitSeq;
  await fs.unlink(path.join(store.root, 'memories', `${record.id}.md`));
  const rebuilt = await store.rebuild();
  assert.equal(rebuilt.commitSeq, before);
  assert.match(await fs.readFile(path.join(store.root, 'memories', `${record.id}.md`), 'utf8'), /正文/);
});

test('a separate live writer lock is never stolen on timeout', async t => {
  const { store } = await fixture(t);
  await fs.mkdir(store.lockPath);
  await fs.writeFile(path.join(store.lockPath, 'owner.json'), canonicalJson({ pid: process.pid, token: 'foreign-owner', acquiredAt: '2000-01-01T00:00:00.000Z' }));
  await assert.rejects(store.remember({ title: '不能抢占', text: '超时不代表死亡' }, { admin: true }), { code: 'writer_busy' });
  assert.equal(JSON.parse(await fs.readFile(path.join(store.lockPath, 'owner.json'), 'utf8')).token, 'foreign-owner');
  await fs.unlink(path.join(store.lockPath, 'owner.json')); await fs.rmdir(store.lockPath);
});

test('independent Node processes share exclusive commit ordering', async t => {
  const { store } = await fixture(t);
  const moduleUrl = new URL('../src/core/index.mjs', import.meta.url).href;
  const script = `import { StrataStore } from ${JSON.stringify(moduleUrl)}; const s=await StrataStore.open(process.argv[1],{lockTimeoutMs:5000}); await s.remember({title:process.argv[2],text:'separate process'},{admin:true});`;
  const run = title => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script, store.root, title], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr)));
  });
  await Promise.all([run('进程一'), run('进程二'), run('进程三')]);
  assert.equal((await store.status()).recordCount, 3);
  assert.equal((await store.status()).commitSeq, 3);
});

test('rule drafts and ideas cannot be promoted by changing the requested kind', async t => {
  const { store } = await fixture(t);
  const draft = await store.remember({ title: '未审核的规则', text: '先验证', kind: 'rule_draft' });
  const revised = await store.remember({ id: draft.id, kind: 'claim' }, { expectedRevision: draft.revision });
  assert.equal(revised.kind, 'rule_draft');
  const child = await store.remember({ title: '规则派生结论', text: '没有独立证据', kind: 'claim', derivedFrom: [draft.id] });
  assert.equal(child.kind, 'idea');
  const childDraft = await store.remember({ title: '候选规则', text: '仍待审核', kind: 'rule_draft', derivedFrom: [child.id] });
  assert.equal(childDraft.kind, 'rule_draft');
  assert.equal((await store.listRecords({})).total, 0);
});

test('session updates cannot widen record scope or remove lineage', async t => {
  const { root, store } = await fixture(t);
  const folder = path.join(root, 'private'); await fs.mkdir(folder);
  const parent = await store.remember({ title: '局部来源', text: '项目内部', scope: { mode: 'folder', path: folder } }, { admin: true });
  const child = await store.remember({ title: '派生摘要', text: '同样局部', derivedFrom: [parent.id] }, { cwd: folder });
  assert.equal(child.scope.path, await fs.realpath(folder));
  for (const scope of [null, { mode: 'dsh' }]) {
    await assert.rejects(store.remember({ id: child.id, scope }, { cwd: folder, expectedRevision: child.revision }), { code: 'access_denied' });
  }
  await assert.rejects(store.remember({ id: child.id, derivedFrom: [] }, { cwd: folder, expectedRevision: child.revision }), { code: 'invalid_reference' });
  const updated = await store.remember({ id: child.id, text: '正常更新', scope: { mode: 'folder', path: folder } }, { cwd: folder, expectedRevision: child.revision });
  assert.equal(updated.text, '正常更新');
  assert.equal(updated.scope.path, await fs.realpath(folder));
});

test('derived sources must exist and be authorized before inheriting their scope', async t => {
  const { root, store } = await fixture(t);
  const folder = path.join(root, 'private'); const outside = path.join(root, 'outside');
  const childFolder = path.join(folder, 'child');
  await fs.mkdir(childFolder, { recursive: true }); await fs.mkdir(outside);
  const parent = await store.remember({ title: '私有想法', text: '局部内容', kind: 'idea', scope: { mode: 'folder', path: folder } }, { admin: true });
  await assert.rejects(store.remember({ title: '越界派生', text: '不能引用', derivedFrom: [parent.id] }, { cwd: outside }), { code: 'out_of_scope' });
  await assert.rejects(store.remember({ title: '缺失派生', text: '来源不存在', derivedFrom: ['missing-parent'] }, { cwd: folder }), { code: 'invalid_reference' });
  const second = await store.remember({ title: '更窄来源', text: '子目录', scope: { mode: 'folder', path: childFolder } }, { admin: true });
  const inherited = await store.remember({ title: '最窄派生', text: '仍是想法', derivedFrom: [parent.id, second.id] }, { cwd: childFolder });
  assert.equal(inherited.scope.path, await fs.realpath(childFolder));
  assert.equal(inherited.kind, 'idea');
  await assert.rejects(store.getRecord(inherited.id, { cwd: folder }), { code: 'out_of_scope' });
  const unrelated = await store.remember({ title: '其它目录', text: '不可合并', scope: { mode: 'folder', path: outside } }, { admin: true });
  await assert.rejects(store.remember({ title: '不相交范围', text: '无法合并', derivedFrom: [parent.id, unrelated.id] }, { admin: true }), { code: 'incompatible_scope' });
});

test('later narrowing a parent scope immediately constrains existing descendants and historical views', async t => {
  const { root, store } = await fixture(t);
  const inside = path.join(root, 'inside'); const outside = path.join(root, 'outside');
  await fs.mkdir(inside); await fs.mkdir(outside);
  const parent = await store.remember({ title: '原本全局', text: '来源' }, { admin: true });
  const child = await store.remember({ title: '全局派生', text: '继承来源', derivedFrom: [parent.id] });
  const oldView = (await store.listRecords()).viewId;
  assert.ok(await store.getRecord(child.id, { cwd: outside }));
  await store.remember({ id: parent.id, scope: { mode: 'folder', path: inside } }, { admin: true, expectedRevision: parent.revision });
  await assert.rejects(store.getRecord(child.id, { cwd: outside, viewId: oldView }), { code: 'out_of_scope' });
  assert.equal((await store.listRecords({ cwd: outside })).total, 0);
  assert.equal((await store.getRecord(child.id, { cwd: inside })).id, child.id);
});

test('malformed imported lineage fails closed without blocking administrator inspection', async t => {
  const { store } = await fixture(t);
  const a = normalizeRecord({ id: 'cycle-a', title: '循环 A', text: '', derivedFrom: ['cycle-b'] });
  const b = normalizeRecord({ id: 'cycle-b', title: '循环 B', text: '', derivedFrom: ['cycle-a'] });
  const missing = normalizeRecord({ id: 'missing-child', title: '缺失父条目', text: '', derivedFrom: ['not-present'] });
  await store.transaction(draft => {
    draft.records[a.id] = [a]; draft.records[b.id] = [b]; draft.records[missing.id] = [missing];
  }, { admin: true });
  assert.equal((await store.listRecords()).total, 0);
  await assert.rejects(store.getRecord(a.id), { code: 'out_of_scope' });
  assert.equal((await store.listRecords({ admin: true })).total, 3);
});

test('exact revision lookup distinguishes multiple imported revisions in one commit', async t => {
  const { store } = await fixture(t);
  const emptyView = (await store.listRecords()).viewId;
  const first = normalizeRecord({ id: 'history-import', title: '迁移历史', text: '旧数据库 PostgreSQL' });
  const second = normalizeRecord({ ...first, text: '新数据库 MySQL' }, { parentRevision: first.revision });
  await store.transaction(draft => { draft.records[first.id] = [first, second]; }, { admin: true });
  assert.equal((await store.getRecord(first.id)).text, second.text);
  assert.equal((await store.getRecord(first.id, { revision: first.revision })).text, first.text);
  assert.equal(await store.getRecord(first.id, { revision: first.revision, viewId: emptyView }), null);
  assert.equal(await store.getRecord(first.id, { revision: 'r_' + '0'.repeat(64) }), null);
});
