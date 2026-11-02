import assert from 'node:assert/strict';
import test from 'node:test';
import {
  eventText, isPrimarySessionHeader, needsContinuation,
  buildContinuation, collectEvidence, createContinuationCache,
  CONTINUATION_CONTEXT_NAME,
} from '../src/host/bridge.mjs';

function userEvent(seq, text, source = { kind: 'user' }) {
  return { type: 'user/message', seq, data: { content: [{ type: 'text', text }], source } };
}

function assistantEvent(seq, text) {
  return { type: 'assistant/message', seq, data: { message: { role: 'assistant', content: [{ type: 'text', text }] } } };
}

/** 最小 sessionQuery 桩：只实现桥接真正用到的那两个方法。 */
function fakeQuery({ sessions = [], surfaces = {} } = {}) {
  return {
    filterSessions: async () => sessions,
    readSurface: async id => {
      if (!surfaces[id]) throw new Error('missing session');
      return { session: { id }, inheritedEventCount: 0, capturedThroughSeq: null, events: surfaces[id] };
    },
  };
}

test('eventText keeps only text blocks and drops reasoning and tool payloads', () => {
  assert.equal(eventText(userEvent(1, '你好')), '你好');
  const mixed = {
    type: 'assistant/message', seq: 2,
    data: { message: { content: [{ type: 'reasoning', text: '内心独白' }, { type: 'text', text: '回答' }] } },
  };
  assert.equal(eventText(mixed), '回答');
  assert.equal(eventText({ type: 'assistant/message', seq: 3, data: { message: { content: [] } } }), '');
  assert.equal(eventText(null), '');
});

test('continuation skips subagent and seeded sessions instead of borrowing their monologue', () => {
  assert.equal(isPrimarySessionHeader({ id: 'a' }), true);
  assert.equal(isPrimarySessionHeader({ id: 'a', isSeeded: true }), false);
  assert.equal(isPrimarySessionHeader({ id: 'a', parentSession: 'p' }), false);
  // 子代理运行的 origin 是 subagent，不能当「上一次聊天」。
  assert.equal(isPrimarySessionHeader({ id: 'a', origin: 'subagent' }), false);
  assert.equal(isPrimarySessionHeader({ id: 'a', origin: 'user' }), true);
  assert.equal(isPrimarySessionHeader(null), false);
});

test('continuation is only injected into a young session', () => {
  const header = { id: 's', cwd: '/p' };
  assert.equal(needsContinuation({ session: { header, seq: 3 } }), true);
  assert.equal(needsContinuation({ session: { header, seq: 5000 } }), false);
  // 子会话永远不接续：它自己就是别人的上下文。
  assert.equal(needsContinuation({ session: { header: { id: 'x', parentSession: 'p' }, seq: 1 } }), false);
  assert.equal(needsContinuation(null), false);
});

test('continuation borrows the tail of the previous session and never the current one', async () => {
  const previous = { header: { id: 'old', cwd: '/p', createdAt: '2026-10-30T02:00:00.000Z' } };
  const current = { header: { id: 'now', cwd: '/p', createdAt: '2026-10-31T02:00:00.000Z' } };
  const query = fakeQuery({
    // 最新的就是当前会话，必须跳过它去找下一个。
    sessions: [current, previous],
    surfaces: {
      old: [userEvent(1, '预算那件事你记着吗'), assistantEvent(2, '记得，是三千'), userEvent(3, '对，别忘')],
      now: [userEvent(1, '我不该被自己续接')],
    },
  });
  const result = await buildContinuation(query, { sessionId: 'now', cwd: '/p' });
  assert.ok(result);
  assert.equal(result.sessionId, 'old');
  assert.match(result.text, /上一次会话|上一个会话/);
  assert.match(result.text, /预算那件事你记着吗/);
  assert.match(result.text, /记得，是三千/);
  assert.equal(result.text.includes('我不该被自己续接'), false);
});

test('continuation returns null rather than inventing a previous conversation', async () => {
  const only = { header: { id: 'now', cwd: '/p' } };
  assert.equal(await buildContinuation(fakeQuery({ sessions: [only] }), { sessionId: 'now', cwd: '/p' }), null);
  // 只有子会话时也不能拿它来续接。
  const sub = { header: { id: 'sub', cwd: '/p', parentSession: 'now' } };
  assert.equal(await buildContinuation(fakeQuery({ sessions: [sub] }), { sessionId: 'now', cwd: '/p' }), null);
  // 没有 sessionQuery 时降级为「不续接」，而不是抛错。
  assert.equal(await buildContinuation(null, { sessionId: 'now', cwd: '/p' }), null);
  assert.equal(await buildContinuation(fakeQuery({ sessions: [] }), { sessionId: 'now' }), null);
});

test('continuation keeps the newest messages when the budget is tight', async () => {
  const previous = { header: { id: 'old', cwd: '/p', createdAt: '2026-10-30T02:00:00.000Z' } };
  const events = [];
  for (let index = 0; index < 40; index += 1) events.push(userEvent(index + 1, `第${index}条很长的对话内容`.repeat(20)));
  const query = fakeQuery({ sessions: [previous], surfaces: { old: events } });
  const result = await buildContinuation(query, { sessionId: 'now', cwd: '/p', budgetBytes: 600 });
  assert.ok(result);
  assert.ok(Buffer.byteLength(result.text, 'utf8') < 1400);
  // 越新越重要：最后一句必须在，最早的一句不该占位。
  assert.match(result.text, /第39条/);
  assert.equal(result.text.includes('第0条'), false);
});

test('collectEvidence pins the exact seq range of the current conversation', async () => {
  const query = fakeQuery({
    surfaces: { s: [userEvent(9, '我决定用 SQLite'), assistantEvent(10, '好，记下'), userEvent(11, '明天再改索引')] },
  });
  const evidence = await collectEvidence(query, { sessionId: 's', now: Date.parse('2026-10-30T03:00:00.000Z') });
  assert.ok(evidence);
  assert.equal(evidence.seqStart, 9);
  assert.equal(evidence.seqEnd, 11);
  assert.match(evidence.text, /\[#9\] 用户：我决定用 SQLite/);
  assert.match(evidence.text, /\[#11\] 用户：明天再改索引/);
  // 同一段对话永远得到同一条证据，重复记住不该堆出几十份一样的原文。
  const again = await collectEvidence(query, { sessionId: 's', now: Date.parse('2026-10-31T03:00:00.000Z') });
  assert.equal(again.id, evidence.id);
  assert.equal(await collectEvidence(null, { sessionId: 's' }), null);
});

test('continuation cache remembers a miss so every assembly does not re-read the log', async () => {
  const cache = createContinuationCache(2);
  assert.equal(cache.get('a'), null);
  assert.equal(cache.has('a'), false);
  cache.set('a', null);
  assert.equal(cache.has('a'), true);
  assert.equal(cache.get('a'), null);
  cache.set('b', { text: 'x' });
  cache.set('c', { text: 'y' });
  assert.equal(cache.has('a'), false, '超出上限必须淘汰最旧的');
  assert.equal(cache.get('c').text, 'y');
});

test('continuation context name is stable so re-assembly replaces instead of stacking', () => {
  assert.equal(CONTINUATION_CONTEXT_NAME, 'dsh-strata:continuation');
});
