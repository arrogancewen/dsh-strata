import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldCapture, recordCapture, resetCaptureState, captureHint, currentIntervalSlot, intervalTimesOfDay,
} from '../src/host/capture.mjs';

const HOUR = 3600_000;

/** 构造「服务器本地时间」的时间戳，断言与机器时区无关。 */
function local(year, month, day, hour, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

test('interval slots align to local midnight and never span days', () => {
  const y = 2026, m = 10, d = 26;
  // 设置 3 小时：0 点起算 → 3、6、9、12、15、18、21、24
  assert.equal(currentIntervalSlot(local(y, m, d, 0, 1), 3), local(y, m, d, 0));
  assert.equal(currentIntervalSlot(local(y, m, d, 2, 59), 3), local(y, m, d, 0));
  assert.equal(currentIntervalSlot(local(y, m, d, 3, 0), 3), local(y, m, d, 3));
  assert.equal(currentIntervalSlot(local(y, m, d, 23, 59), 3), local(y, m, d, 21));
  // 第二天 0 点必须是新锚点，不延续前一天
  assert.equal(currentIntervalSlot(local(y, m, d + 1, 0, 30), 3), local(y, m, d + 1, 0));

  // 设置 5 小时：5、10、15、20
  assert.equal(currentIntervalSlot(local(y, m, d, 4, 59), 5), local(y, m, d, 0));
  assert.equal(currentIntervalSlot(local(y, m, d, 5, 0), 5), local(y, m, d, 5));
  assert.equal(currentIntervalSlot(local(y, m, d, 21, 0), 5), local(y, m, d, 20));
});

test('interval times of day render the promised hours', () => {
  assert.deepEqual(intervalTimesOfDay(3), [3, 6, 9, 12, 15, 18, 21, 24]);
  assert.deepEqual(intervalTimesOfDay(5), [5, 10, 15, 20]);
  assert.deepEqual(intervalTimesOfDay(24), [24]);
  assert.deepEqual(intervalTimesOfDay(7), [7, 14, 21]);
});

test('auto capture stays off unless explicitly enabled', () => {
  resetCaptureState();
  assert.equal(shouldCapture({ capture: undefined, sessionId: 's1' }).trigger, false);
  assert.equal(shouldCapture({ capture: { enabled: false, mode: 'model' }, sessionId: 's1' }).trigger, false);
});

test('model mode triggers but throttles to one prompt per 30 minutes', () => {
  resetCaptureState();
  const capture = { enabled: true, mode: 'model', maxPerSession: 20 };
  const t0 = 1_000_000_000_000;
  assert.equal(shouldCapture({ capture, sessionId: 's', now: t0 }).trigger, true);
  // 未下发提示前重复判定仍为 true（水位只在真正下发时推进）
  assert.equal(shouldCapture({ capture, sessionId: 's', now: t0 }).trigger, true);
  recordCapture({ capture, sessionId: 's', now: t0 });
  assert.equal(shouldCapture({ capture, sessionId: 's', now: t0 + 60_000 }).trigger, false);
  assert.equal(shouldCapture({ capture, sessionId: 's', now: t0 + 31 * 60_000 }).trigger, true);
});

test('interval mode fires once per aligned slot, not once per call', () => {
  resetCaptureState();
  const capture = { enabled: true, mode: 'interval', intervalHours: 4, maxPerSession: 20 };
  // 对齐到 4 小时整点
  const slotStart = currentIntervalSlot(Date.UTC(2026, 9, 25, 8, 0, 0), 4);
  assert.equal(slotStart, Date.UTC(2026, 9, 25, 8, 0, 0));

  assert.equal(shouldCapture({ capture, sessionId: 'i', now: slotStart + 1000 }).trigger, true);
  recordCapture({ capture, sessionId: 'i', now: slotStart + 1000 });
  // 同一窗口内不再触发
  assert.equal(shouldCapture({ capture, sessionId: 'i', now: slotStart + 2 * HOUR }).trigger, false);
  // 进入下一个窗口后再次触发
  assert.equal(shouldCapture({ capture, sessionId: 'i', now: slotStart + 4 * HOUR + 1000 }).trigger, true);
});

test('context mode only fires below threshold and with a known percentage', () => {
  resetCaptureState();
  const capture = { enabled: true, mode: 'context', contextThresholdPercent: 20, maxPerSession: 20 };
  const t0 = 1_700_000_000_000;
  // 上下文未知：不触发（绝不猜）
  assert.equal(shouldCapture({ capture, sessionId: 'c', now: t0 }).trigger, false);
  // 健康：不触发
  assert.equal(shouldCapture({ capture, sessionId: 'c', now: t0, contextPercent: 80 }).trigger, false);
  // 低于阈值：触发
  assert.equal(shouldCapture({ capture, sessionId: 'c', now: t0, contextPercent: 10 }).trigger, true);
  recordCapture({ capture, sessionId: 'c', now: t0 });
  // 同一压缩窗口节流
  assert.equal(shouldCapture({ capture, sessionId: 'c', now: t0 + 60_000, contextPercent: 5 }).trigger, false);
});

test('per-session budget stops runaway capture in every mode', () => {
  for (const mode of ['model', 'interval', 'context']) {
    resetCaptureState();
    const capture = { enabled: true, mode, intervalHours: 1, contextThresholdPercent: 50, maxPerSession: 2 };
    let now = 1_700_000_000_000;
    let fired = 0;
    for (let i = 0; i < 10; i++) {
      now += 2 * HOUR; // 每轮都越过新窗口
      const v = shouldCapture({ capture, sessionId: 'b-' + mode, now, contextPercent: 1 });
      if (v.trigger) { fired += 1; recordCapture({ capture, sessionId: 'b-' + mode, now }); }
    }
    assert.equal(fired, 2, `${mode} 模式必须被 maxPerSession 截断`);
    const stop = shouldCapture({ capture, sessionId: 'b-' + mode, now, contextPercent: 1 });
    assert.equal(stop.reason, 'session_budget_exhausted');
  }
});

test('sessions are isolated from each other', () => {
  resetCaptureState();
  const capture = { enabled: true, mode: 'model', maxPerSession: 1 };
  const t0 = 1_700_000_000_000;
  assert.equal(shouldCapture({ capture, sessionId: 'a', now: t0 }).trigger, true);
  recordCapture({ capture, sessionId: 'a', now: t0 });
  assert.equal(shouldCapture({ capture, sessionId: 'a', now: t0 }).trigger, false);
  // 另一个会话不受影响
  assert.equal(shouldCapture({ capture, sessionId: 'b', now: t0 }).trigger, true);
});

test('captureHint returns localized guidance and null when not triggered', () => {
  resetCaptureState();
  const t0 = 1_700_000_000_000;
  assert.equal(captureHint({ capture: { enabled: false }, sessionId: 'h', now: t0 }), null);

  const model = captureHint({ capture: { enabled: true, mode: 'model', maxPerSession: 9 }, sessionId: 'h1', now: t0 });
  assert.equal(model.mode, 'model');
  assert.match(model.text, /strata_remember/);

  const interval = captureHint({ capture: { enabled: true, mode: 'interval', intervalHours: 9, maxPerSession: 9 }, sessionId: 'h2', now: t0 });
  assert.match(interval.text, /每天 9、18 点/);

  const context = captureHint({ capture: { enabled: true, mode: 'context', contextThresholdPercent: 20, maxPerSession: 9 }, sessionId: 'h3', now: t0, contextPercent: 3 });
  assert.match(context.text, /压缩/);
});
