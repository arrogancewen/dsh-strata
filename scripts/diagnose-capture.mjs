#!/usr/bin/env node
/**
 * 生产机自动记住体检。
 *
 * 只读：打开记忆库、读当前设置与各会话水位，然后按当前模式逐一判定
 * 「下一轮会不会被提示」。不写入、不重置、不动任何水位。
 *
 * 用法：
 *   node scripts/diagnose-capture.mjs                  # 默认 ~/.dsh/strata
 *   node scripts/diagnose-capture.mjs <库路径>
 *   node scripts/diagnose-capture.mjs <库路径> --now 2026-10-30T16:05:00+08:00
 *
 * 关键判据：旧版本（<=0.1.7）的 capturedCount 是「这辈子累计」，
 * 只要等于 maxPerSession 就会永久返回 session_budget_exhausted。
 * 0.1.8 起计数按本地日历日重置，旧水位在水合时会被认领为当天并归零。
 */
import os from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createApplication } from '../src/application.mjs';
import {
  shouldCapture, resetCaptureState, hydrateWatermark, budgetDayKey, intervalTimesOfDay,
} from '../src/host/capture.mjs';

const args = process.argv.slice(2);
const nowArg = args.indexOf('--now');
const now = nowArg >= 0 ? Date.parse(args[nowArg + 1]) : Date.now();
if (Number.isNaN(now)) {
  console.error('--now 必须是可解析的时间，例如 2026-10-30T16:05:00+08:00');
  process.exit(2);
}
// 位置参数是库路径。--now 的取值也要从候选里排除，否则会被当成路径。
// 注意：--now 不存在时 nowArg 为 -1，绝不能拿 nowArg + 1 当排除下标（会误杀第一个路径参数）。
const positional = args.filter((a, i) => !a.startsWith('--') && !(nowArg >= 0 && i === nowArg + 1));
if (positional.length > 1) {
  console.error(`只接受一个库路径，收到 ${positional.length} 个：${positional.join(', ')}`);
  process.exit(2);
}
const root = path.resolve(positional[0] ?? path.join(os.homedir(), '.dsh', 'strata'));

let app;
try {
  app = await createApplication(root, { initialScope: { mode: 'dsh' } });
} catch (error) {
  console.error(`无法打开记忆库：${root}`);
  console.error(`  ${error.code ?? error.name}: ${error.message}`);
  process.exit(1);
}

const state = await app.store._readState();
const settings = state.settings ?? {};
const capture = settings.capture ?? { enabled: false, mode: 'model', maxPerSession: 20 };
const watermarks = state.captureWatermarks ?? {};

console.log(`库路径      ${root}`);
console.log(`提交水位    commitSeq=${state.commitSeq}   ${state.committedAt ?? ''}`);
console.log(`记忆条数    ${Object.keys(state.records ?? {}).length}`);
console.log(`手动记住    ${settings.manualMemoryEnabled === false ? '关闭' : '开启'}`);
console.log(`自动记住    ${capture.enabled === true ? '开启' : '关闭'}   模式=${capture.mode}   每天上限=${capture.maxPerSession}`);
if (capture.mode === 'interval') {
  console.log(`触发时刻    每天 ${intervalTimesOfDay(capture.intervalHours).join('、')} 点（本地 0 点起算，不跨天）`);
}
if (capture.mode === 'context') console.log(`触发阈值    剩余上下文低于 ${capture.contextThresholdPercent}%`);
console.log(`判定时刻    ${new Date(now).toLocaleString('zh-CN')}   当天=${budgetDayKey(now)}`);
console.log('');

if (!capture.enabled) {
  console.log('自动记住是关闭的，不会有任何提示。到设置页「记忆写入」里打开它。');
  await app.store.close?.();
  process.exit(0);
}

const rows = Object.entries(watermarks);
if (rows.length === 0) {
  console.log('库里还没有任何会话水位——说明自动记住提示从未真正下发过。');
  console.log('若设置显示已开启，请确认插件版本 >= 0.1.6（更早版本的会话侧读不到设置）。');
  await app.store.close?.();
  process.exit(0);
}

const max = Number.isSafeInteger(capture.maxPerSession) ? capture.maxPerSession : 20;

// 「停摆」只指预算被永久耗尽；节流、等下一个窗口都属于正常等待。
const STALLED = new Set(['session_budget_exhausted']);

const parsed = rows
  .map(([sessionId, mark]) => ({ sessionId, mark: mark ?? {} }))
  .sort((a, b) => (b.mark.lastModelPromptAt ?? 0) - (a.mark.lastModelPromptAt ?? 0));

const stalled = [];
const legacyMarks = [];
const waiting = [];

console.log('会话水位（按最近提示时间倒序）：');
for (const { sessionId, mark } of parsed) {
  const legacy = typeof mark.budgetDay !== 'string' || !mark.budgetDay;
  if (legacy) legacyMarks.push({ sessionId, mark });

  // 必须用 0.1.8 的水合语义判定，才能回答「升级后会不会活」。
  resetCaptureState();
  hydrateWatermark({ sessionId, watermark: mark, now });
  const verdict = shouldCapture({ capture, sessionId, now });

  if (STALLED.has(verdict.reason)) stalled.push({ sessionId, mark, verdict });
  else if (!verdict.trigger) waiting.push({ sessionId, mark, verdict });

  const last = mark.lastModelPromptAt ? new Date(mark.lastModelPromptAt).toLocaleString('zh-CN') : '从未';
  const flag = verdict.trigger ? '可提示' : `等待(${verdict.reason})`;
  console.log(`  ${sessionId.slice(0, 26).padEnd(26)} 计数=${String(mark.capturedCount ?? 0).padStart(3)}/${max}  上次=${last}  ${flag}${legacy ? '  [旧格式]' : ''}`);
}

console.log('');
if (stalled.length === 0) {
  console.log(`没有会话因预算耗尽而停摆（检查了 ${parsed.length} 个会话）。`);
} else {
  console.log(`有 ${stalled.length} 个会话的预算已耗尽，当前不会收到提示：`);
  for (const { sessionId, mark } of stalled) {
    console.log(`  ${sessionId}   计数 ${mark.capturedCount}/${max}`);
  }
  const allLegacy = stalled.every(s => typeof s.mark.budgetDay !== 'string');
  if (allLegacy) {
    console.log('  这些水位数都没有 budgetDay，是 0.1.7 及更早写下的「这辈子累计」计数。');
    console.log('  升级到 0.1.8 并重启后会自动归零复活，不需要手工清库。');
  } else {
    console.log('  这些是当天预算用尽；次日本地 0 点后自动恢复。');
  }
}

if (waiting.length > 0) {
  console.log('');
  console.log(`另有 ${waiting.length} 个会话只是正常等待（节流 / 未到下一个窗口），不是故障。`);
}

if (legacyMarks.length > 0) {
  console.log('');
  console.log(`提示：${legacyMarks.length} 个会话的水位是旧格式（无 budgetDay），升级后首次判定时会认领当天并归零。`);
}

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
// 只有 0.1.8 之前才有「计数只增不减」的缺陷；0.1.8 起按天重置。
// 版本号是 0.1.x，比较必须带上 patch 位，只比 minor 会把 0.1.8 误判成有缺陷。
const numeric = pkg.version.split('-')[0].split('.').map(Number);
const hasLifetimeBudgetBug = numeric[0] === 0
  && (numeric[1] < 1 || (numeric[1] === 1 && (numeric[2] ?? 0) < 8));
console.log('');
console.log(`诊断脚本来自 dsh-strata ${pkg.version}。`);
if (hasLifetimeBudgetBug) {
  console.log('警告：0.1.7 及更早版本没有按天重置预算，计数只增不减，长会话必然永久停摆。请升级到 0.1.8+。');
}
await app.store.close?.();
