/**
 * 自动记住的触发判定。
 *
 * 三种模式共用一个入口 `shouldCapture`，返回是否该在「这一轮」提示模型去记。
 * 这里只做判定，不做写入——写入永远走 records.remember，保持单一写路径。
 *
 * 设计取舍：
 * - 判定除时间外是纯函数，便于测试，且不阻塞主流程。
 * - 任何异常都不得影响会话：调用方捕获后按「不触发」处理。
 * - 触发只是「提示模型可以记」，绝不代替模型写入，也不静默写。
 */

/** 每会话运行时状态，不落盘（重启即重置，避免陈旧节流）。 */
const sessions = new Map();

function stateFor(sessionId) {
  let state = sessions.get(sessionId);
  if (!state) {
    state = {
      capturedCount: 0,
      lastModelPromptAt: 0,
      lastIntervalSlot: -Infinity,
      lastContextPromptAt: 0,
      lastTrigger: null,
    };
    sessions.set(sessionId, state);
  }
  return state;
}

/** 把时间向下取整到 intervalHours 的整数倍（即「整点」边界）。 */
export function currentIntervalSlot(now, intervalHours) {
  const hours = Number.isSafeInteger(intervalHours) && intervalHours > 0 ? intervalHours : 4;
  const ms = hours * 3600_000;
  return Math.floor(now / ms) * ms;
}

function sessionBudget(capture) {
  return Number.isSafeInteger(capture?.maxPerSession) ? capture.maxPerSession : 20;
}

/**
 * 判定本轮是否应触发自动记住。
 *
 * @param {object} p
 * @param {object} p.capture          settings.capture
 * @param {string} p.sessionId
 * @param {number} [p.now]            当前时间戳，便于测试
 * @param {number} [p.contextPercent] context 模式：上下文剩余百分比（0-100）
 * @returns {{trigger: boolean, mode: string|null, reason: string}}
 */
export function shouldCapture({ capture, sessionId, now = Date.now(), contextPercent } = {}) {
  if (!capture || capture.enabled !== true) {
    return { trigger: false, mode: null, reason: 'auto_capture_disabled' };
  }
  const state = stateFor(sessionId);

  if (state.capturedCount >= sessionBudget(capture)) {
    return { trigger: false, mode: capture.mode, reason: 'session_budget_exhausted' };
  }

  switch (capture.mode) {
    case 'model': {
      // 模型判断模式：不拦，但要节流，避免每轮都催。
      if (now - state.lastModelPromptAt < 30 * 60_000) {
        return { trigger: false, mode: 'model', reason: 'throttled' };
      }
      return { trigger: true, mode: 'model', reason: 'model_may_decide' };
    }

    case 'interval': {
      const slot = currentIntervalSlot(now, capture.intervalHours);
      if (slot <= state.lastIntervalSlot) {
        return { trigger: false, mode: 'interval', reason: 'waiting_for_next_slot' };
      }
      return { trigger: true, mode: 'interval', reason: `interval_${capture.intervalHours}h` };
    }

    case 'context': {
      const threshold = Number.isSafeInteger(capture.contextThresholdPercent)
        ? capture.contextThresholdPercent : 20;
      if (!Number.isFinite(contextPercent)) {
        return { trigger: false, mode: 'context', reason: 'context_unknown' };
      }
      if (contextPercent > threshold) {
        return { trigger: false, mode: 'context', reason: 'context_healthy' };
      }
      // 同一压缩窗口内只提示一次，避免压缩过程中反复催。
      if (now - state.lastContextPromptAt < 10 * 60_000) {
        return { trigger: false, mode: 'context', reason: 'throttled' };
      }
      return { trigger: true, mode: 'context', reason: `context_below_${threshold}pct` };
    }

    default:
      return { trigger: false, mode: capture.mode, reason: 'unknown_mode' };
  }
}

/**
 * 提示被实际下发后记账，推进各模式的水位。
 * 注意：watermark 必须在「提示已下发」之后调用，不能在判定时调用，
 * 否则一次未生效的判定会白白耗掉一个窗口。
 */
export function recordCapture({ capture, sessionId, now = Date.now() }) {
  const state = stateFor(sessionId);
  const mode = capture?.mode;
  state.capturedCount += 1;
  state.lastTrigger = mode;
  if (mode === 'model') state.lastModelPromptAt = now;
  if (mode === 'interval') state.lastIntervalSlot = currentIntervalSlot(now, capture.intervalHours);
  if (mode === 'context') state.lastContextPromptAt = now;
  return { ...state };
}

/** 供测试与设置变更时清理。 */
export function resetCaptureState(sessionId) {
  if (sessionId === undefined) sessions.clear();
  else sessions.delete(sessionId);
}

/**
 * 生成给模型看的自动记住提示。返回 null 表示不提示。
 * 提示刻意简短，并明确边界：是否记录由模型判断，不是强制写入。
 */
export function captureHint({ capture, sessionId, now = Date.now(), contextPercent } = {}) {
  const verdict = shouldCapture({ capture, sessionId, now, contextPercent });
  if (!verdict.trigger) return null;
  const texts = {
    model: '自动记忆已开启（模型判断）：若本轮出现了值得长期保留的决策、结论或用户偏好，可调用 strata_remember 记录；无价值则忽略本提示。',
    interval: `自动记忆已开启（每 ${capture.intervalHours} 小时）：请回顾截至目前值得保留的要点，必要时调用 strata_remember 记录；无价值则忽略。`,
    context: '自动记忆已开启（上下文临近压缩）：请把本轮仍需长期保留的结论用 strata_remember 记录下来，以免压缩后丢失；无价值则忽略。',
  };
  return { mode: capture.mode, text: texts[capture.mode] ?? texts.model, reason: verdict.reason };
}
