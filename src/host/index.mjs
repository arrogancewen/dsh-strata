import path from 'node:path';
import os from 'node:os';
import { createApplication } from '../application.mjs';
import { registerHost } from './adapter.mjs';

export const name = 'dsh-strata';
// sessionQuery 不在这里强注入：它是可选服务，拿不到时只是不续接、不挂原文，
// 插件必须照常起来。用 ctx.get('sessionQuery') 软取。
export const inject = ['connection', 'webServer', 'tools', 'systemPrompt', 'agents'];

/** Plain Cordis plugin. User-facing settings are managed by the Strata section. */
export async function apply(ctx, config = {}) {
  const root = config.root ?? path.join(os.homedir(), '.dsh', 'strata');
  if (typeof root !== 'string' || !path.isAbsolute(root)) throw new TypeError('dsh-strata.root 必须是绝对目录。');
  const app = await createApplication(root);
  if (typeof app.close === 'function') ctx.effect(() => () => app.close(), 'dsh-strata: application');
  registerHost(ctx, app);
}
