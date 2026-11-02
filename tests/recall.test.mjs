import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApplication } from '../src/application.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-strata-recall-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const app = await createApplication(path.join(root, 'store'), { initialScope: { mode: 'dsh' } });
  return { root, app };
}

/** 依次写入三条记忆，间隔 1 天，方便验证时间倒序。 */
async function seed(app) {
  const first = await app.dispatch('records.remember', { record: { title: '预算定下来了', text: '这个季度预算三千，不再改' } });
  const second = await app.dispatch('records.remember', { record: { title: '索引优化', text: '索引优化是这个季度重点' } });
  const third = await app.dispatch('records.remember', { record: { title: '部署窗口', text: '发布窗口挪到周三晚上' } });
  return { first, second, third };
}

test('deictic queries fall back to time order instead of returning nothing', async t => {
  const { app } = await fixture(t);
  const { first, second, third } = await seed(app);

  // 这四句在关键词层面必然全灭：切成 2-gram 后全是虚词。
  for (const query of ['昨天你说那句话', '昨天', '你说过什么', '上次那个预算的事']) {
    const page = await app.dispatch('records.recall', { query });
    assert.ok(page.total > 0, `「${query}」不应返回空`);
    assert.equal(page.degraded, 'time_order');
    assert.match(page.hint, /时间倒序/);
    // 时间倒序：最新写入的排在前面。
    assert.equal(page.records[0].id, third.id);
  }
  assert.ok(first.id && second.id);
});

test('keyword hits never degrade to time order', async t => {
  const { app } = await fixture(t);
  await seed(app);
  const page = await app.dispatch('records.recall', { query: '索引优化' });
  assert.equal(page.degraded, undefined, '命中时不得标降级');
  assert.equal(page.total, 1);
  assert.equal(page.records[0].title, '索引优化');
});

test('a deictic query with no memories stays empty rather than fabricating', async t => {
  const { app } = await fixture(t);
  const page = await app.dispatch('records.recall', { query: '昨天你说那句话' });
  assert.equal(page.total, 0);
  assert.equal(page.records.length, 0);
  assert.equal(page.degraded, 'time_order');
});

test('an ordinary unmatched query still reports a real miss', async t => {
  const { app } = await fixture(t);
  await seed(app);
  // 没有指代标记，就是单纯的没提过——不能拿时间倒序假装命中。
  const page = await app.dispatch('records.recall', { query: '量子纠缠' });
  assert.equal(page.total, 0);
  assert.equal(page.degraded, undefined);
});

test('L0 accepts the full 2000-byte budget the settings validator allows', async t => {
  const { app } = await fixture(t);
  // 12 条独立记忆，每条标题都是唯一且够长，只有放开到 2000 才能全部塞进 L0。
  const ids = [];
  for (let index = 0; index < 12; index += 1) {
    const record = await app.dispatch('records.remember', {
      record: { title: `第${index}号记忆的标题里带有中文内容与细节`, text: `正文${index}` },
    });
    ids.push(record.id);
  }
  await app.dispatch('settings.update', { patch: { l0BudgetTokens: 2000 } }, { admin: true });

  const index = await app.dispatch('context.l0', {});
  assert.equal(index.scopeAllowed, true);
  const bytes = Buffer.byteLength(index.text, 'utf8');
  assert.ok(bytes <= 2000, `L0 必须不超过 2000 字节，实际 ${bytes}`);
  // 关键回归：过去 budget 被硬钳在 1000，2000 会静默只给 1000。
  assert.ok(bytes > 1000, `2000 预算必须真的生效（实际 ${bytes} 字节）`);
  const shown = ids.filter(id => index.text.includes(id)).length;
  assert.ok(shown >= 10, `2000 预算至少应显示 10 条，实际 ${shown}`);
  assert.equal(index.text.includes('\ufffd'), false);
});

test('evidence attached by the host makes strata_deep return the real conversation', async t => {
  const { app } = await fixture(t);
  const record = await app.dispatch('records.remember', {
    record: { title: '决定用 SQLite', text: '本地优先，避免外部服务' },
  }, { sessionId: 'session-x', cwd: process.cwd() });

  // 会话侧直接写 evidence 仍必须被拒——防伪造原则不变。
  await assert.rejects(
    app.dispatch('records.remember', { record: { title: '伪造', text: '证据', evidence: [{ text: '我编的原话' }] } }, { sessionId: 'session-x' }),
    { code: 'forbidden' },
  );

  const attached = await app.dispatch('records.attachEvidence', {
    entryId: record.id,
    evidence: [{
      id: 'ev_test123', text: '[#9] 用户：就用 SQLite\n[#10] 助手：好',
      sessionId: 'session-x', seq: 10, seqStart: 9, seqEnd: 10,
      createdAt: '2026-10-30T02:00:00.000Z',
    }],
  }, { sessionId: 'session-x', cwd: process.cwd() });

  assert.equal(attached.provenance.length, 1);
  assert.equal(attached.provenance[0].evidenceId, 'ev_test123');
  assert.equal(attached.provenance[0].seqStart, 9);
  assert.equal(attached.provenance[0].seqEnd, 10);

  const deep = await app.dispatch('records.deep', { entryId: attached.id }, { sessionId: 'session-x', cwd: process.cwd() });
  assert.equal(deep.integrity, 'verified');
  assert.match(deep.text, /就用 SQLite/);
});

test('a session cannot attach evidence that belongs to another session', async t => {
  const { app } = await fixture(t);
  const record = await app.dispatch('records.remember', { record: { title: '私有', text: '只属于 session-a' } }, { sessionId: 'session-a' });
  await assert.rejects(
    app.dispatch('records.attachEvidence', {
      entryId: record.id,
      evidence: [{ id: 'ev_other', text: '别人的原话', sessionId: 'session-b', seq: 1, seqStart: 1, seqEnd: 1 }],
    }, { sessionId: 'session-a' }),
    { code: 'forbidden' },
  );
});

test('attaching the same evidence twice is idempotent and does not grow provenance', async t => {
  const { app } = await fixture(t);
  const record = await app.dispatch('records.remember', { record: { title: '幂等', text: '同一段原文只挂一次' } }, { sessionId: 'session-x' });
  const payload = {
    entryId: record.id,
    evidence: [{ id: 'ev_same', text: '同一段原话', sessionId: 'session-x', seq: 5, seqStart: 4, seqEnd: 5 }],
  };
  const first = await app.dispatch('records.attachEvidence', payload, { sessionId: 'session-x', cwd: process.cwd() });
  const second = await app.dispatch('records.attachEvidence', payload, { sessionId: 'session-x', cwd: process.cwd() });
  assert.equal(first.provenance.length, 1);
  assert.equal(second.provenance.length, 1);
  assert.equal(second.revision, first.revision);
});
