import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { assert, StrataError } from './errors.mjs';
import {
  SCHEMA_VERSION, RECORD_KINDS, SOURCE_KINDS, EPISTEMIC_STATUSES, FACT_KINDS,
  canonicalJson, sha256, assertId, isoTime, textField, recordRevision, evidenceHash,
  normalizeRecord, normalizeImportedEvidence, lexicalScore,
} from './format.mjs';
import { physicalDirectory, normalizeScope, validateScopeShape, scopeAllows, requireScope } from './scope.mjs';

const writeQueues = new Map();
const MAX_STATE_BYTES = 64 * 1024 * 1024;
const DEFAULT_PROACTIVE = Object.freeze({ enabled: false, delivery: 'inbox', maxPerDay: 3, cooldownMinutes: 30, minTurnsBetween: 10, maxHintTokens: 120 });
const clone = value => structuredClone(value);

async function atomicWrite(destination, contents) {
  const temporary = `${destination}.tmp-${randomUUID()}`;
  let file;
  try {
    file = await fs.open(temporary, 'wx', 0o600);
    await file.writeFile(contents, 'utf8');
    await file.sync();
    await file.close();
    file = undefined;
    await fs.rename(temporary, destination);
  } finally {
    if (file) await file.close().catch(() => {});
    await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

function integer(value, name, min, max) {
  assert(Number.isSafeInteger(value) && value >= min && value <= max, 'invalid_settings', `${name} 必须介于 ${min} 和 ${max}。`);
  return value;
}

function validateSettings(settings) {
  assert(settings && typeof settings === 'object', 'invalid_settings', '设置格式无效。');
  validateScopeShape(settings.scope);
  integer(settings.l0BudgetTokens, 'l0BudgetTokens', 50, 2000);
  assert(typeof settings.captureEnabled === 'boolean', 'invalid_settings', 'captureEnabled 必须是布尔值。');
  const proactive = settings.proactive;
  assert(proactive && typeof proactive.enabled === 'boolean' && ['inbox', 'occasional'].includes(proactive.delivery), 'invalid_settings', '主动记忆设置无效。');
  integer(proactive.maxPerDay, 'maxPerDay', 0, 100);
  integer(proactive.cooldownMinutes, 'cooldownMinutes', 1, 10080);
  integer(proactive.minTurnsBetween, 'minTurnsBetween', 0, 1000);
  integer(proactive.maxHintTokens, 'maxHintTokens', 30, 1000);
}

function assertPlainMap(value, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'invalid_state', `${label} 必须是对象。`);
}

function lineageRecords(roots, state) {
  const records = []; const active = new Set(); const complete = new Set();
  function visit(record, depth) {
    assert(depth <= 32 && !active.has(record.id), 'invalid_reference', '派生链存在循环或层数超过限制。');
    const key = `${record.id}:${record.revision}`;
    if (complete.has(key)) return;
    assert(records.length < 256, 'invalid_reference', '派生链超过允许的读取范围。');
    active.add(record.id); records.push(record);
    for (const id of record.derivedFrom) {
      const parent = Object.hasOwn(state.records, id) ? state.records[id].at(-1) : null;
      assert(parent, 'invalid_reference', '派生来源尚不可用。');
      visit(parent, depth + 1);
    }
    active.delete(record.id); complete.add(key);
  }
  for (const record of roots.filter(Boolean)) visit(record, 0);
  return records;
}

async function intersectScope(left, right) {
  if (!left || left.mode === 'dsh') return right ?? left;
  if (!right || right.mode === 'dsh') return left;
  if (path.relative(left.path, right.path) === '') {
    return { ...left, includeSubfolders: left.includeSubfolders !== false && right.includeSubfolders !== false,
      ...(left.needsBinding || right.needsBinding ? { needsBinding: true } : {}) };
  }
  if (await scopeAllows(left, right.path)) return right;
  if (await scopeAllows(right, left.path)) return left;
  throw new StrataError('incompatible_scope', '派生来源的文件夹范围无法合并，请分别保存。');
}

export class StrataStore {
  static async open(root, options = {}) {
    const actualRoot = await physicalDirectory(path.resolve(root), { create: true });
    const store = new StrataStore(actualRoot, options);
    await store._exclusive(async () => {
      await fs.mkdir(store.commitsDir, { recursive: true });
      try {
        await fs.access(store.headPath);
        await store._readState();
        return;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      const existing = (await fs.readdir(store.commitsDir)).filter(name => name.endsWith('.json'));
      assert(existing.length === 0, 'head_missing', '记忆库存在历史提交但缺少 HEAD；为避免覆盖数据，已停止初始化。');
      const now = new Date().toISOString();
      const state = {
        schemaVersion: SCHEMA_VERSION,
        sourceId: randomUUID(),
        commitSeq: 0,
        committedAt: now,
        settings: {
          scope: await normalizeScope(options.initialScope ?? { mode: 'dsh' }),
          l0BudgetTokens: 250,
          captureEnabled: false,
          proactive: { ...DEFAULT_PROACTIVE },
        },
        records: {},
        evidence: {},
        imports: {},
        operations: {},
        timeline: [{ seq: 0, at: now }],
      };
      await store._publish(state);
    });
    return store;
  }

  constructor(root, options = {}) {
    this.root = root;
    this.commitsDir = path.join(root, '.history', 'commits');
    this.headPath = path.join(root, 'HEAD.json');
    this.lockPath = path.join(root, '.writer.lock');
    this.lockTimeoutMs = options.lockTimeoutMs ?? 1500;
    this._projectionWarning = null;
  }

  async _acquireLock() {
    const start = Date.now();
    while (true) {
      try {
        await fs.mkdir(this.lockPath);
        const owner = { token: randomUUID(), pid: process.pid, acquiredAt: new Date().toISOString() };
        try {
          const file = await fs.open(path.join(this.lockPath, 'owner.json'), 'wx', 0o600);
          try { await file.writeFile(canonicalJson(owner)); await file.sync(); } finally { await file.close(); }
        } catch (error) {
          await fs.rmdir(this.lockPath).catch(() => {});
          throw error;
        }
        return owner;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (Date.now() - start >= this.lockTimeoutMs) throw new StrataError('writer_busy', '记忆库正由另一个写入者占用；未抢占锁，也未跳过数据。');
        await delay(25);
      }
    }
  }

  async _releaseLock(owner) {
    const ownerPath = path.join(this.lockPath, 'owner.json');
    let actual;
    try { actual = JSON.parse(await fs.readFile(ownerPath, 'utf8')); }
    catch { throw new StrataError('lock_owner_changed', '写入锁所有权无法确认。'); }
    assert(actual.token === owner.token, 'lock_owner_changed', '写入锁所有权已经改变。');
    await fs.unlink(ownerPath);
    await fs.rmdir(this.lockPath);
  }

  async _exclusive(operation) {
    const previous = writeQueues.get(this.root) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      const owner = await this._acquireLock();
      try { return await operation(); }
      finally { await this._releaseLock(owner); }
    });
    const sentinel = current.catch(() => {});
    writeQueues.set(this.root, sentinel);
    try { return await current; }
    finally { if (writeQueues.get(this.root) === sentinel) writeQueues.delete(this.root); }
  }

  async _readState() {
    let pointer;
    try { pointer = JSON.parse(await fs.readFile(this.headPath, 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT') throw error;
      throw new StrataError('store_corrupt', '记忆库 HEAD 无法读取或解析，未回退覆盖旧版本。');
    }
    assert(pointer.schemaVersion === SCHEMA_VERSION && Number.isSafeInteger(pointer.commitSeq) && pointer.commitSeq >= 0
      && typeof pointer.file === 'string' && /^\d{12}-[a-f0-9]{64}\.json$/.test(pointer.file), 'store_corrupt', '记忆库 HEAD 格式无效。');
    const filePath = path.join(this.commitsDir, pointer.file);
    let bytes;
    try {
      const info = await fs.stat(filePath);
      assert(info.size <= MAX_STATE_BYTES, 'store_too_large', '记忆库提交超过当前版本允许的大小。');
      bytes = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error instanceof StrataError) throw error;
      throw new StrataError('store_corrupt', 'HEAD 指向的提交缺失或无法读取。', { reason: error.code });
    }
    assert(sha256(bytes) === pointer.hash, 'hash_mismatch', '记忆库提交校验失败，已停止读取。');
    let state;
    try { state = JSON.parse(bytes); } catch { throw new StrataError('store_corrupt', '提交内容不是有效 JSON。'); }
    this._validateState(state);
    assert(state.commitSeq === pointer.commitSeq, 'store_corrupt', '提交水位与 HEAD 不一致。');
    return state;
  }

  _validateState(state, previous) {
    assert(state.schemaVersion === SCHEMA_VERSION, 'unsupported_schema', '此记忆库版本不受支持。');
    assertId(state.sourceId, 'sourceId');
    assert(Number.isSafeInteger(state.commitSeq) && state.commitSeq >= 0, 'invalid_state', '提交水位无效。');
    isoTime(state.committedAt);
    validateSettings(state.settings);
    for (const key of ['records', 'evidence', 'imports', 'operations']) assertPlainMap(state[key], key);
    assert(Array.isArray(state.timeline) && state.timeline.length > 0, 'invalid_state', '缺少提交时间线。');
    assert(Object.keys(state.records).length <= 20000 && Object.keys(state.evidence).length <= 50000, 'store_too_large', '记录数超过当前版本上限。');
    for (const [id, history] of Object.entries(state.records)) {
      assertId(id);
      assert(Array.isArray(history) && history.length > 0, 'invalid_state', '记忆版本列表无效。');
      const revisions = new Set();
      for (const record of history) {
        assert(record.id === id && RECORD_KINDS.includes(record.kind) && SOURCE_KINDS.includes(record.sourceKind)
          && EPISTEMIC_STATUSES.includes(record.epistemicStatus), 'invalid_record', '记忆类型、来源或 ID 无效。');
        textField(record.title, 'title', 240);
        textField(record.text, 'text', 262144, { empty: true });
        assert(Array.isArray(record.tags) && Array.isArray(record.derivedFrom) && Array.isArray(record.evidenceRootIds)
          && Array.isArray(record.provenance), 'invalid_record', '记忆数组字段无效。');
        validateScopeShape(record.scope, { nullable: true });
        for (const time of ['createdAt', 'updatedAt', 'recordedAt']) isoTime(record[time]);
        assert(Number.isSafeInteger(record.commitSeq) && record.commitSeq >= 0 && record.commitSeq <= state.commitSeq, 'invalid_record', '记忆提交水位无效。');
        assert(record.revision === recordRevision(record), 'hash_mismatch', '记忆版本校验失败。', { id });
        assert(!revisions.has(record.revision), 'duplicate_revision', '同一记忆重复包含相同版本。', { id });
        revisions.add(record.revision);
        if (record.sourceKind === 'generated_suggestion') assert(record.kind === 'idea' || record.kind === 'rule_draft', 'invalid_record', '自动灵感不能作为事实入库。');
        if (record.sourceKind === 'imported') assert(record.epistemicStatus !== 'supported', 'invalid_record', '导入不能自行授予已验证状态。');
        if (record.kind === 'task') assert(['open', 'blocked', 'done', 'cancelled'].includes(record.taskStatus), 'invalid_record', '任务状态无效。');
        for (const ref of record.provenance) assertId(ref.evidenceId, 'evidenceId');
      }
    }
    for (const [id, evidence] of Object.entries(state.evidence)) {
      assertId(id, 'evidenceId');
      assert(evidence.id === id && typeof evidence.sourceId === 'string', 'invalid_evidence', '证据身份无效。');
      textField(evidence.text, 'evidence.text', 1048576, { empty: true });
      assert(evidence.hash === evidenceHash(evidence), 'hash_mismatch', '原文证据校验失败。', { evidenceId: id });
      validateScopeShape(evidence.scope, { nullable: true });
    }
    if (previous) {
      assert(state.sourceId === previous.sourceId, 'invalid_state', '事务不能更换记忆库身份。');
      for (const [id, history] of Object.entries(previous.records)) {
        const next = state.records[id];
        assert(Array.isArray(next) && next.length >= history.length && history.every((record, index) => canonicalJson(record) === canonicalJson(next[index])), 'immutable_history', '不能删除或覆盖已有记忆版本。', { id });
      }
      for (const [id, evidence] of Object.entries(previous.evidence)) assert(canonicalJson(state.evidence[id]) === canonicalJson(evidence), 'immutable_evidence', '不能删除或改写已归档原文。', { evidenceId: id });
    }
    canonicalJson(state);
  }

  async _publish(state) {
    this._validateState(state);
    const payload = canonicalJson(state);
    assert(Buffer.byteLength(payload) <= MAX_STATE_BYTES, 'store_too_large', '提交超过 64 MiB；事务未发布。');
    const hash = sha256(payload);
    const file = `${String(state.commitSeq).padStart(12, '0')}-${hash.slice(7)}.json`;
    const commitPath = path.join(this.commitsDir, file);
    try {
      const output = await fs.open(commitPath, 'wx', 0o600);
      try { await output.writeFile(payload); await output.sync(); } finally { await output.close(); }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      assert(sha256(await fs.readFile(commitPath, 'utf8')) === hash, 'hash_mismatch', '同名提交内容不一致。');
    }
    await atomicWrite(this.headPath, canonicalJson({ schemaVersion: SCHEMA_VERSION, commitSeq: state.commitSeq, file, hash }));
    // Markdown is a human-readable projection. A projection failure must not misreport an already committed transaction.
    try { await this._writeProjections(state); this._projectionWarning = null; }
    catch (error) { this._projectionWarning = `Markdown 视图待重建：${error.code ?? error.message}`; }
  }

  async _writeProjections(state) {
    const directory = path.join(this.root, 'memories');
    await fs.mkdir(directory, { recursive: true });
    for (const history of Object.values(state.records)) {
      const record = history.at(-1);
      const metadata = { id: record.id, revision: record.revision, kind: record.kind, epistemicStatus: record.epistemicStatus, sourceKind: record.sourceKind, createdAt: record.createdAt, updatedAt: record.updatedAt, tags: record.tags };
      const markdown = `---\n${Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n# ${record.title.replace(/[\r\n]+/g, ' ')}\n\n${record.text}\n`;
      await atomicWrite(path.join(directory, `${record.id}.md`), markdown);
    }
  }

  async transaction(mutator, options = {}) {
    assert(typeof mutator === 'function', 'invalid_transaction', '事务必须是函数。');
    return this._exclusive(async () => {
      const previous = await this._readState();
      if (!options.admin) await requireScope(previous.settings.scope, options.cwd);
      if (options.expectedCommitSeq !== undefined) assert(previous.commitSeq === options.expectedCommitSeq, 'revision_conflict', '记忆库在预览后发生变化，请重新预览。', { expected: options.expectedCommitSeq, actual: previous.commitSeq });
      const draft = clone(previous);
      const now = new Date().toISOString();
      const context = { commitSeq: previous.commitSeq + 1, recordedAt: now, sourceId: previous.sourceId };
      const result = await mutator(draft, context);
      if (canonicalJson(draft) === canonicalJson(previous)) return clone(result);
      draft.commitSeq = context.commitSeq;
      draft.committedAt = now;
      draft.timeline = [...previous.timeline, { seq: context.commitSeq, at: now }];
      for (const [id, versions] of Object.entries(draft.records)) {
        for (const record of versions.slice(previous.records[id]?.length ?? 0)) {
          record.commitSeq = context.commitSeq;
          record.recordedAt = now;
        }
      }
      this._validateState(draft, previous);
      if (!options.admin) {
        // Transaction authors cannot change scope/settings through the session-scoped route.
        assert(canonicalJson(draft.settings) === canonicalJson(previous.settings), 'access_denied', '修改设置需要管理权限。');
        for (const [id, versions] of Object.entries(draft.records)) {
          for (const record of versions.slice(previous.records[id]?.length ?? 0)) await requireScope(record.scope, options.cwd);
        }
      }
      await this._publish(draft);
      return result === undefined ? undefined : clone(result);
    });
  }

  async getSettings() { return clone((await this._readState()).settings); }

  async updateSettings(patch, { expectedCommitSeq } = {}) {
    assertPlainMap(patch, 'settings');
    for (const key of Object.keys(patch)) assert(['scope', 'proactive', 'l0BudgetTokens', 'captureEnabled'].includes(key), 'invalid_settings', `未知设置：${key}`);
    return this.transaction(async draft => {
      if (patch.scope !== undefined) draft.settings.scope = await normalizeScope(patch.scope);
      if (patch.proactive !== undefined) {
        assertPlainMap(patch.proactive, 'proactive');
        for (const key of Object.keys(patch.proactive)) assert(Object.hasOwn(DEFAULT_PROACTIVE, key), 'invalid_settings', `未知主动记忆设置：${key}`);
        draft.settings.proactive = { ...draft.settings.proactive, ...patch.proactive };
      }
      for (const key of ['l0BudgetTokens', 'captureEnabled']) if (patch[key] !== undefined) draft.settings[key] = patch[key];
      validateSettings(draft.settings);
      return draft.settings;
    }, { admin: true, expectedCommitSeq });
  }

  async status() {
    const state = await this._readState();
    const current = Object.values(state.records).map(history => history.at(-1));
    return {
      schemaVersion: state.schemaVersion, sourceId: state.sourceId, root: this.root, commitSeq: state.commitSeq,
      updatedAt: state.committedAt, recordCount: current.length, revisionCount: Object.values(state.records).reduce((total, history) => total + history.length, 0),
      evidenceCount: Object.keys(state.evidence).length, ideaCount: current.filter(record => record.kind === 'idea').length,
      settings: clone(state.settings), warnings: this._projectionWarning ? [this._projectionWarning] : [],
    };
  }

  _viewSeq(state, options) {
    let fromId;
    if (options.viewId) {
      const match = /^(.+)@(\d+)$/.exec(options.viewId);
      assert(match && match[1] === state.sourceId && Number(match[2]) <= state.commitSeq, 'invalid_view', '历史视图不属于此记忆库或已损坏。');
      fromId = Number(match[2]);
    }
    let fromTime;
    if (options.asOf) {
      const time = Date.parse(isoTime(options.asOf));
      const entries = state.timeline.filter(entry => Date.parse(entry.at) <= time);
      fromTime = entries.length ? entries.at(-1).seq : -1;
    }
    if (fromId !== undefined && fromTime !== undefined) assert(fromId === fromTime, 'invalid_view', 'viewId 与 asOf 不一致。');
    return fromId ?? fromTime ?? state.commitSeq;
  }

  async _recordReadable(record, latest, state, options) {
    if (options.admin) return true;
    if (!await scopeAllows(state.settings.scope, options.cwd)) return false;
    let lineage;
    try { lineage = lineageRecords([record, latest], state); }
    catch (error) { if (error.code === 'invalid_reference') return false; throw error; }
    for (const entry of lineage) {
      if (!await scopeAllows(entry.scope, options.cwd)) return false;
      for (const reference of entry.provenance) {
        const evidence = state.evidence[reference.evidenceId];
        if (evidence && !await scopeAllows(evidence.scope, options.cwd)) return false;
      }
    }
    return true;
  }

  async _finalAuthorization(records, options) {
    if (options.admin) return;
    const current = await this._readState();
    await requireScope(current.settings.scope, options.cwd);
    for (const record of records) assert(await this._recordReadable(record, current.records[record.id]?.at(-1), current, options), 'out_of_scope', '范围在读取期间变化，请刷新后重试。');
  }

  async listRecords(options = {}) {
    const state = await this._readState();
    if (!options.admin) await requireScope(state.settings.scope, options.cwd);
    const viewSeq = this._viewSeq(state, options);
    const kinds = options.kinds === 'all' ? RECORD_KINDS : options.kinds ?? FACT_KINDS;
    assert(Array.isArray(kinds) && kinds.every(kind => RECORD_KINDS.includes(kind)), 'invalid_query', '查询类型无效。');
    const query = options.query ?? '';
    textField(query, 'query', 2000, { empty: true });
    const records = [];
    for (const history of Object.values(state.records)) {
      const visible = history.filter(record => record.commitSeq <= viewSeq);
      const candidates = options.includeHistory ? visible : visible.slice(-1);
      for (const record of candidates) {
        if (!kinds.includes(record.kind) || (!options.includeHistory && ['refuted', 'superseded'].includes(record.epistemicStatus))) continue;
        if (!await this._recordReadable(record, history.at(-1), state, options)) continue;
        const score = lexicalScore(record, query);
        if (!score) continue;
        records.push({ ...clone(record), score, isHistorical: record.revision !== history.at(-1).revision });
      }
    }
    records.sort((left, right) => right.score - left.score || right.recordedAt.localeCompare(left.recordedAt) || left.id.localeCompare(right.id));
    const limit = options.limit === undefined ? 100 : integer(options.limit, 'limit', 1, 1000);
    const offset = options.offset === undefined ? 0 : integer(options.offset, 'offset', 0, 1000000);
    const page = records.slice(offset, offset + limit);
    await this._finalAuthorization(page, options);
    return { records: page, total: records.length, viewId: `${state.sourceId}@${Math.max(0, viewSeq)}` };
  }

  async getRecord(id, options = {}) {
    assertId(id);
    const state = await this._readState();
    if (!options.admin) await requireScope(state.settings.scope, options.cwd);
    const history = state.records[id];
    if (!history) return null;
    const visible = history.filter(entry => entry.commitSeq <= this._viewSeq(state, options));
    if (options.revision !== undefined) textField(options.revision, 'revision', 128);
    const record = options.revision === undefined ? visible.at(-1) : visible.find(entry => entry.revision === options.revision);
    if (!record) return null;
    assert(await this._recordReadable(record, history.at(-1), state, options), 'out_of_scope', '无权读取此记忆。');
    await this._finalAuthorization([record], options);
    return clone(record);
  }

  async remember(input, options = {}) {
    return this.transaction(async (draft, context) => {
      if (input.idempotencyKey && draft.operations[input.idempotencyKey]) {
        const saved = draft.operations[input.idempotencyKey];
        const history = draft.records[saved.id];
        const record = history?.find(entry => entry.revision === saved.revision);
        assert(record, 'invalid_state', '幂等操作引用的记忆版本已缺失。');
        assert(await this._recordReadable(record, history.at(-1), draft, options), 'out_of_scope', '无权读取此幂等操作保存的记忆。');
        return record;
      }
      const current = input.id ? draft.records[input.id]?.at(-1) : null;
      if (current) {
        assert(options.expectedRevision === current.revision || input.parentRevision === current.revision, 'revision_conflict', '修改前请提供当前版本，避免覆盖另一会话的更新。');
        assert(await this._recordReadable(current, current, draft, options), 'out_of_scope', '无权更新此记忆。');
      }
      const sourceKind = options.sourceKind ?? (options.admin ? 'user' : 'assistant');
      let raw = { ...(current ?? {}), ...input };
      const references = raw.derivedFrom ?? [];
      assert(Array.isArray(references) && references.length <= 100, 'invalid_reference', '派生来源必须是已有记忆 ID 数组。');
      const parents = [];
      for (const id of references) {
        assertId(id, 'derivedFrom');
        const parent = Object.hasOwn(draft.records, id) ? draft.records[id].at(-1) : null;
        assert(parent, 'invalid_reference', '派生来源尚不可用。');
        assert(await this._recordReadable(parent, parent, draft, options), 'out_of_scope', '无权使用此派生来源。');
        assert(id !== raw.id, 'invalid_reference', '记忆不能派生自自身。');
        parents.push(parent);
      }
      if (current && !options.admin) assert(current.derivedFrom.every(id => references.includes(id)), 'invalid_reference', '会话写入不能删除已有派生链。');
      const canPromote = Boolean(options.confirmedResult && options.admin);
      const inheritedIdea = parents.some(parent => ['idea', 'rule_draft'].includes(parent.kind));
      if (inheritedIdea && !canPromote) raw.kind = raw.kind === 'rule_draft' ? 'rule_draft' : 'idea';
      if (['idea', 'rule_draft'].includes(current?.kind) && !canPromote) raw.kind = current.kind;
      if (current?.kind === 'task' && ['done', 'cancelled'].includes(current.taskStatus) && ['open', 'blocked'].includes(raw.taskStatus)) {
        assert(options.reopen === true && (options.admin || options.confirmed), 'invalid_transition', '已完成或取消的任务只能明确重新打开。');
      }
      let scope = await normalizeScope(raw.scope ?? null, { nullable: true, allowUnbound: Boolean(options.admin) });
      if (current && !options.admin) assert(canonicalJson(scope) === canonicalJson(current.scope), 'access_denied', '会话写入不能改变已有记忆的使用范围。');
      const parentLineage = lineageRecords(parents, draft);
      assert(!parentLineage.some(parent => parent.id === raw.id), 'invalid_reference', '此修改会形成派生循环。');
      const lineage = lineageRecords([...parents, ...(!options.admin && current ? [current] : [])], draft);
      for (const parent of lineage) {
        scope = await intersectScope(scope, parent.scope);
        for (const reference of parent.provenance) {
          const evidence = draft.evidence[reference.evidenceId];
          if (evidence) scope = await intersectScope(scope, evidence.scope);
        }
      }
      const record = normalizeRecord(raw, {
        ...context, sourceKind, scope, parentRevision: current?.revision ?? null,
        createdAt: current?.createdAt, updatedAt: context.recordedAt,
        allowSupported: Boolean(options.confirmedResult && options.admin),
      });
      if (input.evidence) {
        assert(Array.isArray(input.evidence) && input.evidence.length <= 50, 'invalid_evidence', '最多一次附加 50 项证据。');
        for (const item of input.evidence) {
          const evidence = normalizeImportedEvidence(item, { sourceId: draft.sourceId, scope: await normalizeScope(item.scope ?? scope, { nullable: true, allowUnbound: Boolean(options.admin) }) });
          if (!options.admin) await requireScope(evidence.scope, options.cwd);
          if (draft.evidence[evidence.id]) assert(canonicalJson(draft.evidence[evidence.id]) === canonicalJson(evidence), 'evidence_conflict', '同一证据 ID 已存在不同内容。');
          else draft.evidence[evidence.id] = evidence;
          record.provenance.push({ evidenceId: evidence.id, sourceId: evidence.sourceId, eventHash: evidence.hash });
        }
      }
      for (const ref of record.provenance) {
        const evidence = draft.evidence[ref.evidenceId];
        if (evidence) {
          if (!options.admin) await requireScope(evidence.scope, options.cwd);
          if (ref.eventHash) assert(ref.eventHash === evidence.hash, 'hash_mismatch', '证据引用哈希不匹配。');
        }
      }
      record.revision = recordRevision(record);
      draft.records[record.id] ??= [];
      if (!draft.records[record.id].some(version => version.revision === record.revision)) draft.records[record.id].push(record);
      if (input.idempotencyKey) {
        textField(input.idempotencyKey, 'idempotencyKey', 300);
        assert(!['__proto__', 'constructor', 'prototype'].includes(input.idempotencyKey), 'invalid_record', '幂等键无效。');
        draft.operations[input.idempotencyKey] = { id: record.id, revision: record.revision };
      }
      return record;
    }, options);
  }

  async deep(evidenceId, options = {}) {
    assertId(evidenceId, 'evidenceId');
    let record;
    if (!options.admin) {
      assert(options.entryId, 'access_denied', '回读原文必须通过已授权记忆条目。');
      record = await this.getRecord(options.entryId, options);
      assert(record && record.provenance.some(ref => ref.evidenceId === evidenceId), 'access_denied', '该证据不属于所选记忆。');
    } else if (options.entryId) {
      record = await this.getRecord(options.entryId, options);
      assert(record && record.provenance.some(ref => ref.evidenceId === evidenceId), 'access_denied', '该证据不属于所选记忆。');
    }
    const state = await this._readState();
    if (!options.admin) await requireScope(state.settings.scope, options.cwd);
    const evidence = state.evidence[evidenceId];
    assert(evidence, 'source_unavailable', '原文证据尚未归档或源已不可用。');
    if (!options.admin) await requireScope(evidence.scope, options.cwd);
    assert(evidence.hash === evidenceHash(evidence), 'hash_mismatch', '原文证据校验失败。');
    if (record) await this._finalAuthorization([record], options);
    return { ...clone(evidence), status: 'verified' };
  }

  async exportState(options = {}) {
    const state = await this._readState();
    if (!options.admin) await requireScope(state.settings.scope, options.cwd);
    const records = [];
    const evidenceIds = new Set();
    for (const history of Object.values(state.records)) {
      for (const record of history) {
        if (!await this._recordReadable(record, history.at(-1), state, options)) continue;
        records.push(clone(record));
        for (const ref of record.provenance) evidenceIds.add(ref.evidenceId);
      }
    }
    const evidence = [...evidenceIds].map(id => state.evidence[id]).filter(Boolean).map(clone);
    await this._finalAuthorization(records, options);
    return {
      schemaVersion: SCHEMA_VERSION, sourceId: state.sourceId, commitSeq: state.commitSeq,
      exportedAt: new Date().toISOString(), settings: clone(state.settings), records, evidence,
      ...(options.admin ? { imports: clone(state.imports) } : {}),
    };
  }

  async health() {
    try {
      const state = await this._readState();
      const missing = [];
      for (const history of Object.values(state.records)) for (const record of history) {
        for (const ref of record.provenance) if (!state.evidence[ref.evidenceId]) missing.push({ recordId: record.id, revision: record.revision, evidenceId: ref.evidenceId });
      }
      return { ok: missing.length === 0 && !this._projectionWarning, ...await this.status(), missingEvidence: missing, issues: this._projectionWarning ? [this._projectionWarning] : [] };
    } catch (error) {
      return { ok: false, root: this.root, issues: [{ code: error.code ?? 'io_error', message: error.message }] };
    }
  }

  async rebuild() {
    return this._exclusive(async () => {
      const state = await this._readState();
      await this._writeProjections(state);
      this._projectionWarning = null;
      return { rebuilt: true, commitSeq: state.commitSeq, records: Object.keys(state.records).length };
    });
  }
}
