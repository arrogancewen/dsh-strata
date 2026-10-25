import { createHash, randomUUID } from 'node:crypto';
import { assert, StrataError } from './errors.mjs';

export const SCHEMA_VERSION = 1;
export const RECORD_KINDS = Object.freeze(['observation', 'claim', 'decision', 'task', 'idea', 'outcome', 'rule_draft']);
export const SOURCE_KINDS = Object.freeze(['user', 'assistant', 'tool', 'imported', 'generated_suggestion']);
export const EPISTEMIC_STATUSES = Object.freeze(['unverified', 'supported', 'disputed', 'refuted', 'superseded']);
export const FACT_KINDS = Object.freeze(RECORD_KINDS.filter(kind => !['idea', 'rule_draft'].includes(kind)));
export const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function canonicalJson(value) {
  const active = new Set();
  function visit(item, depth) {
    assert(depth <= 48, 'invalid_data', '数据嵌套超过允许深度。');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
    if (typeof item === 'number') {
      assert(Number.isFinite(item), 'invalid_data', '数字必须是有限值。');
      return item;
    }
    assert(item && typeof item === 'object', 'invalid_data', '仅支持 JSON 数据。');
    assert(!active.has(item), 'invalid_data', '数据不能含循环引用。');
    const prototype = Object.getPrototypeOf(item);
    assert(Array.isArray(item) || prototype === Object.prototype || prototype === null, 'invalid_data', '不支持非 JSON 对象。');
    active.add(item);
    let result;
    if (Array.isArray(item)) result = item.map(entry => visit(entry, depth + 1));
    else {
      result = Object.create(null);
      for (const key of Object.keys(item).sort()) {
        assert(!FORBIDDEN_KEYS.has(key), 'invalid_data', `不允许对象字段 ${key}。`);
        if (item[key] !== undefined) result[key] = visit(item[key], depth + 1);
      }
    }
    active.delete(item);
    return result;
  }
  return JSON.stringify(visit(value, 0));
}

export function sha256(value) {
  return `sha256:${createHash('sha256').update(typeof value === 'string' ? value : canonicalJson(value)).digest('hex')}`;
}

export function assertId(value, label = 'id') {
  assert(typeof value === 'string' && ID_PATTERN.test(value), 'invalid_id', `${label} 必须是 1–96 位字母、数字、短横线或下划线，且以字母或数字开头。`);
  return value;
}

export function textField(value, name, maxLength, { optional = false, empty = false } = {}) {
  if (value == null && optional) return undefined;
  assert(typeof value === 'string' && value.length <= maxLength && (empty || value.trim().length > 0), 'invalid_record', `${name} 无效或超过长度限制。`);
  assert(!value.includes('\u0000'), 'invalid_record', `${name} 不允许 NUL 字符。`);
  return value;
}

export function isoTime(value, fallback = new Date().toISOString()) {
  if (value == null) return fallback;
  assert(typeof value === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)), 'invalid_time', '时间必须是含时区的 ISO 时间。');
  return new Date(value).toISOString();
}

export function evidenceHash({ text, event }) {
  return sha256({ text: text ?? '', event: event ?? null });
}

export function recordRevision(record) {
  const payload = {};
  for (const [key, value] of Object.entries(record)) {
    if (!['revision', 'commitSeq', 'recordedAt', 'score', 'isHistorical'].includes(key) && value !== undefined) payload[key] = value;
  }
  return `r_${sha256(payload).slice(7)}`;
}

function stringList(value, name, max = 100) {
  if (value == null) return [];
  assert(Array.isArray(value) && value.length <= max, 'invalid_record', `${name} 必须是数组且最多 ${max} 项。`);
  return [...new Set(value.map(item => textField(item, name, 300)))];
}

export function normalizeProvenance(provenance) {
  if (provenance == null) return [];
  assert(Array.isArray(provenance) && provenance.length <= 100, 'invalid_record', '证据引用最多 100 项。');
  return provenance.map(ref => {
    assert(ref && typeof ref === 'object', 'invalid_record', '证据引用格式错误。');
    const result = { evidenceId: assertId(ref.evidenceId, 'evidenceId') };
    for (const key of ['sourceId', 'sessionId', 'eventHash', 'contextStampId']) {
      if (ref[key] != null) result[key] = textField(ref[key], key, 300);
    }
    for (const key of ['seqStart', 'seqEnd']) {
      if (ref[key] != null) {
        assert(Number.isSafeInteger(ref[key]) && ref[key] >= 0, 'invalid_record', `${key} 无效。`);
        result[key] = ref[key];
      }
    }
    if (result.seqStart != null && result.seqEnd != null) assert(result.seqEnd >= result.seqStart, 'invalid_record', '证据序号范围无效。');
    return result;
  });
}

export function normalizeRecord(raw, options = {}) {
  assert(raw && typeof raw === 'object' && !Array.isArray(raw), 'invalid_record', '记忆必须是对象。');
  const now = isoTime(options.recordedAt);
  const sourceKind = options.sourceKind ?? 'assistant';
  assert(SOURCE_KINDS.includes(sourceKind), 'invalid_record', '来源类型无效。');
  let kind = raw.kind ?? (sourceKind === 'user' ? 'observation' : 'claim');
  assert(RECORD_KINDS.includes(kind), 'invalid_record', '记忆类型无效。');
  if (sourceKind === 'generated_suggestion' && kind !== 'rule_draft') kind = 'idea';
  let epistemicStatus = raw.epistemicStatus ?? 'unverified';
  assert(EPISTEMIC_STATUSES.includes(epistemicStatus), 'invalid_record', '认知状态无效。');
  if (!options.allowSupported && epistemicStatus === 'supported') epistemicStatus = 'unverified';
  const result = {
    id: assertId(options.id ?? raw.id ?? randomUUID()),
    parentRevision: options.parentRevision !== undefined ? options.parentRevision : raw.parentRevision ?? null,
    kind,
    title: textField(raw.title, 'title', 240),
    text: textField(raw.text ?? raw.gist ?? '', 'text', 262144, { empty: true }),
    tags: stringList(raw.tags, 'tags', 30),
    createdAt: isoTime(options.createdAt ?? raw.createdAt, now),
    updatedAt: isoTime(options.updatedAt ?? raw.updatedAt, now),
    recordedAt: now,
    commitSeq: options.commitSeq ?? 0,
    epistemicStatus,
    sourceKind,
    derivedFrom: stringList(raw.derivedFrom, 'derivedFrom'),
    evidenceRootIds: stringList(raw.evidenceRootIds, 'evidenceRootIds'),
    provenance: normalizeProvenance(raw.provenance),
    scope: options.scope !== undefined ? structuredClone(options.scope) : structuredClone(raw.scope ?? null),
  };
  if (result.parentRevision != null) textField(result.parentRevision, 'parentRevision', 128);
  if (raw.metadata !== undefined) {
    assert(Buffer.byteLength(canonicalJson(raw.metadata)) <= 65536, 'invalid_record', 'metadata 过大。');
    result.metadata = structuredClone(raw.metadata);
  }
  if (kind === 'task') {
    result.taskStatus = raw.taskStatus ?? 'open';
    assert(['open', 'blocked', 'done', 'cancelled'].includes(result.taskStatus), 'invalid_record', '任务状态无效。');
  }
  if (options.origin) result.origin = structuredClone(options.origin);
  result.revision = recordRevision(result);
  return result;
}

export function normalizeImportedRecord(raw, options = {}) {
  const sourceId = options.sourceId ?? raw.origin?.sourceId ?? 'unknown-source';
  const origin = {
    sourceId: textField(sourceId, 'origin.sourceId', 300),
    recordId: assertId(raw.id, 'origin.recordId'),
    revision: textField(raw.revision ?? recordRevision(raw), 'origin.revision', 128),
  };
  if (raw.parentRevision) origin.parentRevision = textField(raw.parentRevision, 'origin.parentRevision', 128);
  const protectedRaw = raw.sourceKind === 'generated_suggestion' && raw.kind !== 'rule_draft' ? { ...raw, kind: 'idea' } : raw;
  return normalizeRecord(protectedRaw, { ...options, sourceKind: 'imported', allowSupported: false, origin });
}

export function normalizeImportedEvidence(raw, options = {}) {
  assert(raw && typeof raw === 'object', 'invalid_evidence', '证据必须是对象。');
  const result = {
    id: assertId(options.id ?? raw.id ?? randomUUID(), 'evidenceId'),
    sourceId: textField(options.sourceId ?? raw.sourceId ?? 'unknown-source', 'sourceId', 300),
    text: textField(raw.text ?? '', 'evidence.text', 1048576, { empty: true }),
    createdAt: isoTime(raw.createdAt),
    scope: options.scope !== undefined ? structuredClone(options.scope) : structuredClone(raw.scope ?? null),
  };
  if (raw.event !== undefined) {
    assert(Buffer.byteLength(canonicalJson(raw.event)) <= 1048576, 'invalid_evidence', '单个事件超过 1 MiB。');
    result.event = structuredClone(raw.event);
  }
  if (raw.sessionId != null) result.sessionId = textField(raw.sessionId, 'sessionId', 300);
  if (raw.seq != null) {
    assert(Number.isSafeInteger(raw.seq) && raw.seq >= 0, 'invalid_evidence', '证据 seq 无效。');
    result.seq = raw.seq;
  }
  result.hash = evidenceHash(result);
  if (raw.hash != null && raw.hash !== result.hash) throw new StrataError('hash_mismatch', '证据校验和不匹配。', { evidenceId: result.id });
  return result;
}

export function tokenize(query) {
  const runs = String(query).normalize('NFKC').toLocaleLowerCase('en-US').match(/[\p{Script=Han}]+|[\p{L}\p{N}_]+/gu) ?? [];
  const tokens = [];
  for (const run of runs) {
    if (/^\p{Script=Han}+$/u.test(run)) {
      const points = [...run];
      if (points.length === 1) tokens.push(run);
      else for (let index = 0; index < points.length - 1; index++) tokens.push(points[index] + points[index + 1]);
    } else tokens.push(run);
  }
  return [...new Set(tokens)];
}

export function lexicalScore(record, query) {
  const tokens = tokenize(query);
  if (!tokens.length) return query.trim() ? 0 : 1;
  const title = `${record.title} ${(record.tags ?? []).join(' ')}`.normalize('NFKC').toLocaleLowerCase('en-US');
  const text = record.text.normalize('NFKC').toLocaleLowerCase('en-US');
  // All query grams must exist. No OR fallback that turns an unanswered query into a false hit.
  if (!tokens.every(token => title.includes(token) || text.includes(token))) return 0;
  const exact = query.normalize('NFKC').toLocaleLowerCase('en-US');
  return tokens.reduce((score, token) => score + (title.includes(token) ? 3 : 1), 0)
    + (title.includes(exact) ? 6 : text.includes(exact) ? 3 : 0);
}
