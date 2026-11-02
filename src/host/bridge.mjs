import { createHash } from 'node:crypto';

/**
 * 会话桥：把「上一个会话说过什么」和「这条记忆是在哪句原话旁边写下的」
 * 从 DSH 的 sessionQuery 里取出来，交给提示词中间件与写入路径。
 *
 * 两个原则：
 * 1. 只读。绝不改写会话日志。
 * 2. 取原文只能走 sessionQuery 的公开读接口，不自己解磁盘上的 .zstd。
 */

export const CONTINUATION_CONTEXT_NAME = 'dsh-strata:continuation';

/** 新会话开头注入的上一段尾巴：约 1400 字节，最多 8 条消息。 */
const CONTINUATION_BYTES = 1400;
const CONTINUATION_MESSAGES = 8;
/** 一条记忆挂的原文证据：约 6000 字节。 */
const EVIDENCE_BYTES = 6000;
const EVIDENCE_MESSAGES = 24;
/** 会话自己的事件数超过这个量级就不再注入尾巴。 */
const MAX_FRESH_EVENTS = 400;

/** 取出一个消息事件的纯文本；非文本块（reasoning、tool_use 等）一律丢弃。 */
export function eventText(event) {
  if (!event || typeof event !== 'object') return '';
  const data = event.data;
  if (!data || typeof data !== 'object') return '';
  const content = event.type === 'assistant/message' ? data.message?.content : data.content;
  if (!Array.isArray(content)) return '';
  const parts = [];
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string' && block.text.trim()) parts.push(block.text.trim());
  }
  return parts.join('\n');
}

/** 只保留人说的和模型说的；系统提示、工具结果、压缩检查点都不算「原话」。 */
function projectEvents(events) {
  const projected = [];
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    if (event.type === 'user/message') {
      if (event.data?.source?.kind !== 'user') continue;
      const text = eventText(event);
      if (text) projected.push({ seq: event.seq, role: 'user', text });
      continue;
    }
    if (event.type === 'assistant/message') {
      const text = eventText(event);
      if (text) projected.push({ seq: event.seq, role: 'assistant', text });
    }
  }
  return projected;
}

/** 从尾部往前收，直到字节数或条数用满。越新的越重要，所以从后往前。 */
function tailWithin(items, maxBytes, maxMessages) {
  const kept = [];
  let bytes = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (kept.length >= maxMessages) break;
    const size = Buffer.byteLength(items[index].text, 'utf8');
    if (bytes + size > maxBytes) break;
    kept.unshift(items[index]);
    bytes += size;
  }
  return kept;
}

/**
 * 是不是一个「普通会话」。子代理会话、种子会话、续接出来的子会话都不算——
 * 否则同一目录下跑一次 explore，尾巴就变成了子代理的内心独白。
 */
export function isPrimarySessionHeader(header) {
  if (!header || typeof header !== 'object') return false;
  if (header.isSeeded === true) return false;
  if (header.parentSession) return false;
  if (typeof header.origin === 'string' && header.origin && header.origin !== 'user') return false;
  return true;
}

function renderContinuation(previous, messages) {
  const when = new Date(previous.createdAt).toLocaleString('zh-CN', { hour12: false });
  const lines = [`上一个会话在这里结束（${when}）：`];
  for (const message of messages) {
    lines.push(`${message.role === 'user' ? '用户' : '助手'}：${message.text}`);
  }
  return lines.join('\n');
}

/**
 * 找出同目录下最近的一个**别的**普通会话，取它末尾几轮对话。
 * 找不到就返回 null——宁可什么都不注入，也不要编造一段「上次」。
 */
export async function buildContinuation(sessionQuery, { sessionId, cwd, budgetBytes = CONTINUATION_BYTES, maxMessages = CONTINUATION_MESSAGES } = {}) {
  if (!sessionQuery || typeof sessionQuery.filterSessions !== 'function' || typeof sessionQuery.readSurface !== 'function') return null;
  if (typeof cwd !== 'string' || !cwd) return null;
  let candidates;
  try {
    candidates = await sessionQuery.filterSessions([{ kind: 'cwd', values: [cwd] }]);
  } catch {
    return null;
  }
  if (!Array.isArray(candidates)) return null;
  const previous = candidates.find(item => item?.header && item.header.id !== sessionId && isPrimarySessionHeader(item.header));
  if (!previous) return null;
  let surface;
  try {
    surface = await sessionQuery.readSurface(previous.header.id);
  } catch {
    return null;
  }
  if (!surface || !Array.isArray(surface.events)) return null;
  const messages = tailWithin(projectEvents(surface.events), budgetBytes, maxMessages);
  if (!messages.length) return null;
  return {
    sessionId: previous.header.id,
    createdAt: previous.header.createdAt,
    messages: messages.length,
    text: renderContinuation(previous.header, messages),
  };
}

/**
 * 会话刚开始时才有必要接上一段；跑了几十轮的会话自己就有上下文。
 *
 * 注意：DSH 的 Session 没有 `seq` 字段（只有 header、surface、inheritedEventCount、
 * firstLiveSeq）。最早一版按 `session.seq` 判年龄，拿到的永远是 undefined，
 * `undefined > 400` 恒为假 —— 守卫看着在，其实从没生效过，每个会话都会被续接。
 * 现在按模型可见事件数（surface.nodes）数，并且数不出来时按「年轻」处理：
 * 宁可在长会话里多接一次尾巴，也不要让新会话继续翻日记。
 */
export function needsContinuation(agent, limit = MAX_FRESH_EVENTS) {
  const header = agent?.session?.header;
  if (!header || !isPrimarySessionHeader(header)) return false;
  const session = agent?.session;
  const nodes = session?.surface?.nodes;
  if (Array.isArray(nodes)) return nodes.length <= limit;
  // 兼容旧字段（真实 DSH 上不存在），只为不把测试桩和未来版本写死。
  const seq = session?.seq;
  if (typeof seq === 'number') return seq <= limit;
  return true;
}

/**
 * 把当前会话末尾的原文打成一条证据，供 strata_deep 回读。
 * 序号范围用真实事件 seq，所以「这条记忆出自哪几句话」是可核对的。
 */
export async function collectEvidence(sessionQuery, { sessionId, budgetBytes = EVIDENCE_BYTES, maxMessages = EVIDENCE_MESSAGES, now = Date.now() } = {}) {
  if (!sessionQuery || typeof sessionQuery.readSurface !== 'function') return null;
  let surface;
  try {
    surface = await sessionQuery.readSurface(sessionId);
  } catch {
    return null;
  }
  if (!surface || !Array.isArray(surface.events)) return null;
  const messages = tailWithin(projectEvents(surface.events), budgetBytes, maxMessages);
  if (!messages.length) return null;
  const text = messages.map(message => `[#${message.seq}] ${message.role === 'user' ? '用户' : '助手'}：${message.text}`).join('\n');
  if (!text.trim()) return null;
  const seqStart = messages[0].seq;
  const seqEnd = messages[messages.length - 1].seq;
  // 同一段对话永远得到同一条证据，重复记住不会堆出几十份一样的原文。
  const id = `ev_${createHash('sha256').update(`${sessionId}\u0000${seqStart}\u0000${seqEnd}\u0000${text}`).digest('hex').slice(0, 32)}`;
  return { id, text, sessionId, seq: seqEnd, seqStart, seqEnd, createdAt: new Date(now).toISOString() };
}

/** 每次组装都调 sessionQuery 太重：尾巴按会话缓存，进程内不重复读。 */
export function createContinuationCache(limit = 64) {
  const cache = new Map();
  return {
    get(sessionId) { return cache.get(sessionId)?.value ?? null; },
    set(sessionId, value) {
      cache.delete(sessionId);
      cache.set(sessionId, { value });
      while (cache.size > limit) cache.delete(cache.keys().next().value);
      return value;
    },
    has(sessionId) { return cache.has(sessionId); },
  };
}
