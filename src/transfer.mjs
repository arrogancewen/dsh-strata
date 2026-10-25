import { createHash, randomUUID } from 'node:crypto';
import { normalizeRecord, normalizeScope, normalizeImportedRecord, normalizeImportedEvidence, recordRevision, evidenceHash } from './core/index.mjs';
import { validateScopeShape } from './core/scope.mjs';

export const MAX_BUNDLE_BYTES = 12 * 1024 * 1024;
const FORMAT = 'dsh-strata/memory';
const PREVIEW_TTL = 10 * 60 * 1000;

export function fail(code, message, status = 400) {
  return Object.assign(new Error(message), { code, status });
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const digest = value => `sha256:${createHash('sha256').update(canonical(value)).digest('hex')}`;

function checkTree(value, depth = 0, budget = { n: 0 }) {
  if (++budget.n > 200000 || depth > 40) throw fail('bundle_too_complex', '迁移文件的嵌套或条目数量过多。');
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw fail('invalid_key', '迁移文件包含不允许的属性名。');
      checkTree(item, depth + 1, budget);
    }
  }
}
function seal(payload) { return { ...payload, integrity: { algorithm: 'sha256', digest: digest(payload) } }; }
function scopeIsFolder(scope) { return scope?.mode === 'folder'; }

function textBundle(text, filename = '导入的记忆.md') {
  if (!text.trim()) throw fail('empty_import', '文件内容为空。');
  if (Buffer.byteLength(text) > 512 * 1024 || text.length > 262144) throw fail('text_too_large', '单个文本文件最多 512 KiB / 262,144 字符，请拆分后导入。');
  const key = createHash('sha256').update(text).digest('hex');
  const sourceId = `text-${key.slice(0,24)}`;
  const evidenceId = `e-${key.slice(0,24)}`;
  // Stable identity and timestamps make a repeated text import idempotent.
  const now = '1970-01-01T00:00:00.000Z';
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() || filename.replace(/\.[^.]+$/, '');
  const evidence = { id: evidenceId, sourceId, text, event: null, hash: evidenceHash({ text, event: null }), createdAt: now, scope: null };
  return seal({ format: FORMAT, version: 1, mode: 'complete', exportedAt: now,
    source: { sourceId, label: filename, format: 'markdown' }, scope: null,
    records: [normalizeRecord({ id: `m-${key.slice(0,24)}`, kind: 'claim', title: title.slice(0,160), text,
      tags: ['导入'], sourceKind: 'imported', epistemicStatus: 'unverified', createdAt: now, updatedAt: now,
      derivedFrom: [], provenance: [{ evidenceId, sourceId }], scope: null }, {sourceKind:'imported',recordedAt:now})], evidence: [evidence],
  });
}

function parseBundle(input, filename) {
  let bundle = input;
  if (typeof input === 'string') {
    if (Buffer.byteLength(input) > MAX_BUNDLE_BYTES) throw fail('bundle_too_large', '迁移文件超过 12 MiB 限制。', 413);
    if (/\.(md|markdown|txt)$/i.test(filename || '')) bundle = textBundle(input, filename);
    else {
      try { bundle = JSON.parse(input); }
      catch { throw fail('invalid_json', '无法读取 JSON。文本记忆请使用 .md 或 .txt 文件。'); }
    }
  }
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) throw fail('invalid_bundle', '请选择 Strata 迁移包，或 Markdown / TXT 记忆文件。');
  if (Buffer.byteLength(JSON.stringify(bundle)) > MAX_BUNDLE_BYTES) throw fail('bundle_too_large', '迁移文件超过 12 MiB 限制。', 413);
  checkTree(bundle);
  if (bundle.format !== FORMAT || bundle.version !== 1) throw fail('unsupported_format', '暂不支持此迁移格式。请使用 Strata v1 JSON 包或 Markdown / TXT。');
  if (!['complete', 'reference'].includes(bundle.mode)) throw fail('invalid_mode', '迁移完整度字段无效。');
  if (!bundle.source?.sourceId || typeof bundle.source.sourceId !== 'string' || bundle.source.sourceId.length > 200) throw fail('invalid_source', '迁移包缺少有效来源。');
  if (!Array.isArray(bundle.records) || !Array.isArray(bundle.evidence) || bundle.records.length > 10000 || bundle.evidence.length > 10000) throw fail('invalid_records', '迁移包的记忆或证据列表无效，最多支持 10,000 个版本/证据。');
  const { integrity, ...payload } = bundle;
  if (integrity?.algorithm !== 'sha256' || integrity.digest !== digest(payload)) throw fail('checksum_mismatch', '迁移包校验失败，内容可能不完整或已被修改。');
  validateScopeShape(bundle.scope, { nullable: true });
  const evidenceIds = new Set();
  for (const evidence of bundle.evidence) {
    normalizeImportedEvidence(evidence);
    validateScopeShape(evidence.scope, { nullable: true });
    if (evidenceIds.has(evidence.id)) throw fail('duplicate_evidence', '迁移包包含重复的证据 ID。');
    evidenceIds.add(evidence.id);
  }
  const versions = new Set();
  const evidenceById = new Map(bundle.evidence.map(e=>[e.id,e]));
  for (const record of bundle.records) {
    if (!record || typeof record.id !== 'string' || typeof record.revision !== 'string') throw fail('invalid_record', '记忆缺少 ID 或版本。');
    normalizeImportedRecord(record, { sourceId: bundle.source.sourceId });
    validateScopeShape(record.scope, { nullable: true });
    if (record.revision !== recordRevision(record)) throw fail('revision_mismatch', '记忆版本与内容不一致。');
    const key = `${record.id}/${record.revision}`;
    if (versions.has(key)) throw fail('duplicate_revision', '迁移包包含重复记忆版本。');
    versions.add(key);
    for (const ref of record.provenance || []) {
      const evidence = evidenceById.get(ref.evidenceId);
      if (evidence && ((ref.eventHash && ref.eventHash !== evidence.hash) || (ref.sourceId && ref.sourceId !== evidence.sourceId))) throw fail('invalid_provenance', '原文引用的来源或哈希与归档证据不一致。');
    }
    if (bundle.mode === 'complete') {
      for (const ref of record.provenance || []) if (!evidenceIds.has(ref.evidenceId)) throw fail('incomplete_evidence', '完整迁移包缺少被引用的原文证据。');
    }
  }
  // A bundle represents a linear history per record; reject missing parents,
  // cycles and forks rather than choosing an arbitrary array order.
  const groups = new Map();
  for (const record of bundle.records) { if (!groups.has(record.id)) groups.set(record.id, []); groups.get(record.id).push(record); }
  const ordered = [];
  for (const versions of groups.values()) {
    const children = new Map();
    for (const record of versions) {
      const parent = record.parentRevision || null;
      if (children.has(parent)) throw fail('invalid_history', '迁移包包含分叉版本；请从源库重新导出。');
      children.set(parent, record);
    }
    let current = children.get(null); let visited = 0;
    while (current && visited < versions.length) { ordered.push(current); visited++; current = children.get(current.revision); }
    if (visited !== versions.length || current) throw fail('invalid_history', '迁移包版本链缺失、循环或不完整。');
  }
  bundle = { ...bundle, records: ordered };
  return structuredClone(bundle);
}

export class TransferService {
  constructor(store) { this.store = store; this.previews = new Map(); }

  async export({ mode = 'complete', cwd } = {}, auth = {}) {
    if (!['complete', 'reference'].includes(mode)) throw fail('invalid_mode', '请选择完整迁移或引用迁移。');
    const snapshot = await this.store.exportState({ cwd: auth.cwd || cwd, admin: auth.admin === true });
    const used = new Set(snapshot.records.flatMap(r => (r.provenance || []).map(p => p.evidenceId)));
    const evidence = snapshot.evidence.filter(e => used.has(e.id));
    const available = new Set(evidence.map(e => e.id));
    if (mode === 'complete' && [...used].some(id => !available.has(id))) throw fail('incomplete_evidence', '部分记忆原文缺失，无法作为完整包导出；可显式选择引用迁移。');
    const payload = {
      format: FORMAT, version: 1, mode, exportedAt: new Date().toISOString(),
      source: { sourceId: snapshot.sourceId, commitSeq: snapshot.commitSeq, label: 'Strata 记忆空间' },
      scope: snapshot.settings.scope,
      records: snapshot.records,
      evidence: mode === 'complete' ? evidence : [],
    };
    const bundle = seal(payload);
    if (Buffer.byteLength(JSON.stringify(bundle)) > MAX_BUNDLE_BYTES) throw fail('bundle_too_large', '当前迁移包超过 12 MiB，请缩小导出范围。');
    return { bundle, filename: `strata-${new Date().toISOString().slice(0,10)}.${mode}.strata.json`, counts: { records: new Set(snapshot.records.map(r => r.id)).size, revisions: snapshot.records.length, evidence: payload.evidence.length } };
  }

  async preview({ bundle: input, filename, mode = 'merge', targetScope } = {}) {
    if (!['merge', 'fork'].includes(mode)) throw fail('invalid_import_mode', '首版支持合并和另存为副本。');
    const bundle = parseBundle(input, filename);
    const snapshot = await this.store.exportState({ admin: true });
    const requestedScope = await normalizeScope(targetScope || snapshot.settings.scope);
    const folderRestricted = scopeIsFolder(bundle.scope) || bundle.records.some(r => scopeIsFolder(r.scope)) || bundle.evidence.some(e => scopeIsFolder(e.scope));
    const warnings = ['导入材料保留来源，未经本地验证的内容不会自动升级为已确认事实。'];
    if (bundle.mode === 'reference') warnings.push('这是引用迁移包；缺少源库时，原始证据可能无法读取。');
    if (folderRestricted && !scopeIsFolder(requestedScope)) return { canImport: false, requiresScopeBinding: true, warnings: ['源记忆限制在文件夹内，请选择导入后绑定的文件夹。'], source: bundle.source, sourceScope: bundle.scope, counts: { records: new Set(bundle.records.map(r => r.id)).size } };
    const sourceScopes = [...new Set([bundle.scope, ...bundle.records.map(r => r.scope), ...bundle.evidence.map(e => e.scope)].filter(scopeIsFolder).map(canonical))].map(s=>JSON.parse(s));
    if (sourceScopes.length > 1 && !targetScope) return { canImport:false, requiresScopeBinding:true, warnings:['来源包含多个文件夹限制，请明确选择统一导入的目标文件夹，或拆成独立迁移包。'], source:bundle.source, sourceScope:bundle.scope, sourceScopes, counts:{records:new Set(bundle.records.map(r=>r.id)).size} };
    if (folderRestricted) warnings.push('本次把来源的文件夹限制映射到下方目标文件夹；导入不会更改记忆空间的总范围。');
    // Core normalizers validate scope and record shape without modifying the store.
    const receiptKey = digest({ bundle: bundle.integrity.digest, mode, targetScope: requestedScope });
    const receipt = snapshot.imports?.[receiptKey];
    const counts = { records: new Set(bundle.records.map(r => r.id)).size, revisions: bundle.records.length, evidence: bundle.evidence.length, added: 0, updated: 0, skipped: 0, conflicts: 0 };
    const conflicts = [];
    const idMap = Object.create(null);
    const evidenceMap = Object.create(null);
    if (mode === 'merge') {
      for (const previous of Object.values(snapshot.imports || {})) {
        if (previous.mode === 'merge' && previous.source?.sourceId === bundle.source.sourceId && canonical(previous.targetScope) === canonical(requestedScope)) {
          Object.assign(idMap, previous.idMap || {});
          Object.assign(evidenceMap, previous.evidenceMap || {});
        }
      }
    }
    const byId = new Map();
    for (const record of bundle.records) { if (!byId.has(record.id)) byId.set(record.id, []); byId.get(record.id).push(record); }
    for (const [sourceId, versions] of byId) {
      const match = mode === 'merge' ? snapshot.records.find(r => (snapshot.sourceId === bundle.source.sourceId && r.id === sourceId) || (r.origin?.sourceId === bundle.source.sourceId && r.origin?.recordId === sourceId)) : undefined;
      idMap[sourceId] = match?.id || idMap[sourceId] || randomUUID();
      const localVersions = snapshot.records.filter(r => r.id === idMap[sourceId]);
      const seen = new Set(localVersions.map(r => r.origin?.sourceId === bundle.source.sourceId ? r.origin.revision : r.revision));
      const fresh = versions.filter(r => !seen.has(r.revision));
      if (receipt || fresh.length === 0) { counts.skipped++; continue; }
      if (!match) counts.added++;
      else {
        const current = localVersions.at(-1);
        const currentSourceRevision = current.origin?.sourceId === bundle.source.sourceId ? current.origin.revision : current.revision;
        const first = fresh[0];
        const localWasEdited = current.sourceKind !== 'imported' && snapshot.sourceId !== bundle.source.sourceId;
        if (localWasEdited || first.parentRevision !== currentSourceRevision || canonical(current.scope) !== canonical(requestedScope)) {
          counts.conflicts++;
          conflicts.push({ id: sourceId, title: versions.at(-1).title, message: '两边有不同修改；此条不会覆盖，可选择“另存为副本”。' });
        } else counts.updated++;
      }
    }
    if (receipt) { counts.added = 0; counts.updated = 0; counts.conflicts = 0; counts.skipped = byId.size; conflicts.length = 0; }
    for (const evidence of bundle.evidence) {
      const mapped = snapshot.evidence.find(e => e.id === evidenceMap[evidence.id]);
      if (mapped && (mapped.hash !== evidence.hash || mapped.sourceId !== evidence.sourceId)) throw fail('evidence_conflict', '同一来源的证据 ID 对应不同内容。');
      const same = snapshot.evidence.find(e => e.hash === evidence.hash && e.sourceId === evidence.sourceId && canonical(e.scope) === canonical(requestedScope));
      evidenceMap[evidence.id] ||= same?.id || randomUUID();
      normalizeImportedEvidence({ ...evidence, scope: requestedScope }, { id: evidenceMap[evidence.id] });
    }
    // Unavailable external references get isolated IDs. Never resolve them by a
    // coincidental ID in this library (including reference-only imports).
    for (const record of bundle.records) {
      for (const ref of record.provenance || []) evidenceMap[ref.evidenceId] ||= randomUUID();
      for (const ref of record.derivedFrom || []) idMap[ref] ||= randomUUID();
      for (const ref of record.evidenceRootIds || []) evidenceMap[ref] ||= randomUUID();
    }
    const unresolvedParents = new Set(bundle.records.flatMap(r=>r.derivedFrom || []).filter(id=>!byId.has(id) && !snapshot.records.some(r=>r.id===idMap[id])));
    if (unresolvedParents.size) warnings.push(`有 ${unresolvedParents.size} 项派生来源不在迁移包或本库中，相关记忆仅供管理员查看，普通会话不会召回。请补入相同来源的依赖记忆。`);
    for (const record of bundle.records) normalizeImportedRecord(record, { id: idMap[record.id], sourceId: bundle.source.sourceId, scope: requestedScope, commitSeq: snapshot.commitSeq + 1, recordedAt: new Date().toISOString() });
    const previewId = randomUUID();
    for (const [id, item] of this.previews) if (item.expiresAt < Date.now()) this.previews.delete(id);
    if (this.previews.size >= 20) this.previews.delete(this.previews.keys().next().value);
    const plan = { previewId, expiresAt: Date.now() + PREVIEW_TTL, bundle, mode, targetScope: requestedScope, baseCommitSeq: snapshot.commitSeq, receiptKey, idMap, evidenceMap, counts, conflicts };
    this.previews.set(previewId, plan);
    return { previewId, expiresAt: plan.expiresAt, counts, conflicts, warnings, source: bundle.source, sourceScope: bundle.scope, targetScope: requestedScope, canImport: counts.conflicts === 0, duplicate: Boolean(receipt) };
  }

  async import({ previewId } = {}) {
    const plan = this.previews.get(previewId);
    if (!plan || plan.expiresAt < Date.now()) throw fail('preview_expired', '导入预览已过期，请重新校验。', 409);
    if (plan.conflicts.length) throw fail('import_conflict', '存在冲突，请选择另存为副本，或先处理冲突。', 409);
    const checkedScope = await normalizeScope(plan.targetScope);
    if (canonical(checkedScope) !== canonical(plan.targetScope)) throw fail('scope_changed', '目标文件夹在预览后发生变化，请重新预览。', 409);
    const result = await this.store.transaction(draft => {
      if (Object.hasOwn(draft.imports, plan.receiptKey)) return { ...draft.imports[plan.receiptKey], duplicate: true };
      const now = new Date().toISOString();
      for (const source of plan.bundle.evidence) {
        const id = plan.evidenceMap[source.id];
        if (!Object.hasOwn(draft.evidence, id)) draft.evidence[id] = normalizeImportedEvidence({ ...source, scope: plan.targetScope }, { id });
      }
      const byId = new Map();
      for (const source of plan.bundle.records) { if (!byId.has(source.id)) byId.set(source.id, []); byId.get(source.id).push(source); }
      for (const [sourceId, versions] of byId) {
        const id = plan.idMap[sourceId];
        const local = draft.records[id] || [];
        const seen = new Set(local.map(r => r.origin?.sourceId === plan.bundle.source.sourceId ? r.origin.revision : r.revision));
        for (const source of versions) {
          if (seen.has(source.revision)) continue;
          const provenance = (source.provenance || []).map(ref => ({ ...ref, evidenceId: plan.evidenceMap[ref.evidenceId] }));
          const derivedFrom = (source.derivedFrom || []).map(ref => plan.idMap[ref]);
          const evidenceRootIds = (source.evidenceRootIds || []).map(ref => plan.evidenceMap[ref]);
          const next = normalizeImportedRecord({ ...source, provenance, derivedFrom, evidenceRootIds }, {
            id, sourceId: plan.bundle.source.sourceId, recordedAt: now,
            commitSeq: draft.commitSeq + 1, parentRevision: local.at(-1)?.revision || null, scope: plan.targetScope,
          });
          next.origin = { sourceId: plan.bundle.source.sourceId, recordId: sourceId, revision: source.revision, ...(source.parentRevision ? { parentRevision: source.parentRevision } : {}) };
          next.metadata = { ...(next.metadata || {}), strataImport: { previousOrigin: source.origin || null,
            originalProvenance: source.provenance || [], originalDerivedFrom: source.derivedFrom || [], originalEvidenceRootIds: source.evidenceRootIds || [] } };
          next.revision = recordRevision(next);
          local.push(next);
          seen.add(source.revision);
        }
        draft.records[id] = local;
      }
      const receipt = { counts: plan.counts, mode: plan.mode, importedAt: now, source: plan.bundle.source, idMap: plan.idMap, evidenceMap: plan.evidenceMap, targetScope: plan.targetScope };
      draft.imports[plan.receiptKey] = receipt;
      return receipt;
    }, { admin: true, expectedCommitSeq: plan.baseCommitSeq });
    this.previews.delete(previewId);
    return result;
  }
}
