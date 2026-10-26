import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApplication } from '../src/application.mjs';
import {
  shouldCapture, recordCapture, resetCaptureState, hydrateWatermark, currentWatermark, currentIntervalSlot,
} from '../src/host/capture.mjs';

const HOUR = 3600_000;

test('interval watermark survives a process restart', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'strata-wm-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const sessionId = 'session-wm';
  const capture = { enabled: true, mode: 'interval', intervalHours: 4, maxPerSession: 20 };
  const t0 = Date.UTC(2026, 9, 26, 4, 0, 5); // 刚过 4 小时的整点边界
  const slot = currentIntervalSlot(t0, 4);

  // —— 第一次进程：触发并持久化水位 ——
  {
    const app = await createApplication(root, { initialScope: { mode: 'dsh' } });
    resetCaptureState();
    assert.equal(shouldCapture({ capture, sessionId, now: t0 }).trigger, true);
    recordCapture({ capture, sessionId, now: t0 });
    const mark = currentWatermark(sessionId);
    assert.equal(mark.lastIntervalSlot, slot);
    await app.dispatch('capture.watermark.set', { sessionId, watermark: mark }, { admin: true });
    await app.store.close?.();
  }

  // —— 第二次进程：模拟 DSH 重启，内存态清空 ——
  {
    const app = await createApplication(root, { initialScope: { mode: 'dsh' } });
    resetCaptureState(); // 关键：模拟重启后内存 Map 丢失

    // 没有水合时，会误判为「新窗口到了」而重复触发
    assert.equal(shouldCapture({ capture, sessionId, now: slot + HOUR }).trigger, true,
      '未水合时确实会误触发——这正是原来的 bug');

    // 水合持久水位后，同一窗口内不再触发
    const mark = await app.dispatch('capture.watermark.get', { sessionId }, { admin: true });
    assert.ok(mark, '重启后必须能从 store 读回水位');
    hydrateWatermark({ sessionId, watermark: mark });
    assert.equal(shouldCapture({ capture, sessionId, now: slot + HOUR }).trigger, false,
      '水合后同窗口不得重复触发');

    // 进入下一个 4 小时窗口后应再次触发
    assert.equal(shouldCapture({ capture, sessionId, now: slot + 4 * HOUR + 5000 }).trigger, true,
      '跨入新窗口后必须恢复触发');
  }
});

test('context watermark survives a process restart', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'strata-cwm-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sessionId = 'session-cwm';
  const capture = { enabled: true, mode: 'context', contextThresholdPercent: 20, maxPerSession: 20 };
  const t0 = Date.UTC(2026, 9, 26, 3, 0, 0);

  {
    const app = await createApplication(root, { initialScope: { mode: 'dsh' } });
    resetCaptureState();
    assert.equal(shouldCapture({ capture, sessionId, now: t0, contextPercent: 10 }).trigger, true);
    recordCapture({ capture, sessionId, now: t0 });
    await app.dispatch('capture.watermark.set', { sessionId, watermark: currentWatermark(sessionId) }, { admin: true });
  }
  {
    const app = await createApplication(root, { initialScope: { mode: 'dsh' } });
    resetCaptureState();
    const mark = await app.dispatch('capture.watermark.get', { sessionId }, { admin: true });
    hydrateWatermark({ sessionId, watermark: mark });
    // 重启后立刻又低上下文：10 分钟内应被节流
    assert.equal(shouldCapture({ capture, sessionId, now: t0 + 60_000, contextPercent: 5 }).trigger, false);
    // 超过节流窗口后恢复
    assert.equal(shouldCapture({ capture, sessionId, now: t0 + 11 * 60_000, contextPercent: 5 }).trigger, true);
  }
});

test('session-side watermark access is scoped to its own session', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'strata-wm-scope-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = await createApplication(root, { initialScope: { mode: 'dsh' } });

  // 会话 A 写自己的水位
  await app.dispatch('capture.watermark.set', {
    sessionId: 'session-A', watermark: { lastIntervalSlot: 111 },
  }, { admin: false, sessionId: 'session-A' });

  // 会话 B 读不到 A 的水位，只能拿到自己的（空）
  const bRead = await app.dispatch('capture.watermark.get', { sessionId: 'session-A' }, { admin: false, sessionId: 'session-B' });
  assert.equal(bRead, null, '会话不得读取其他会话的水位');

  // B 尝试写 A：实际写到 B 自己身上
  await app.dispatch('capture.watermark.set', {
    sessionId: 'session-A', watermark: { lastIntervalSlot: 999 },
  }, { admin: false, sessionId: 'session-B' });
  const aRead = await app.dispatch('capture.watermark.get', { sessionId: 'session-A' }, { admin: true });
  assert.equal(aRead.lastIntervalSlot, 111, '会话不得篡改其他会话的水位');
  const bReadAdmin = await app.dispatch('capture.watermark.get', { sessionId: 'session-B' }, { admin: true });
  assert.equal(bReadAdmin.lastIntervalSlot, 999);
});

test('watermark table is bounded', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'strata-wm-bound-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = await createApplication(root, { initialScope: { mode: 'dsh' } });
  for (let i = 0; i < 205; i++) {
    await app.dispatch('capture.watermark.set', { sessionId: `s-${i}`, watermark: { capturedCount: i } }, { admin: true });
  }
  const state = await app.store._readState();
  assert.ok(Object.keys(state.captureWatermarks).length <= 200, '水位表必须有上限');
});
