import * as fs from 'node:fs/promises';
import path from 'node:path';
import { assert, StrataError } from './errors.mjs';

const CLOUD_SEGMENT = /^(?:WPSDrive|WPS Cloud|WPS Cloud Files|WXDrive|OneDrive.*)$/i;

export function assertNotCloudPath(target) {
  assert(typeof target === 'string' && !target.includes('\u0000'), 'invalid_path', '路径格式无效。');
  assert(!target.split(/[\\/]+/).some(segment => CLOUD_SEGMENT.test(segment)), 'cloud_path_blocked', '此目录可能是云盘按需目录，禁止自动读取。');
}

export async function physicalDirectory(directory, { create = false } = {}) {
  assertNotCloudPath(directory);
  assert(path.isAbsolute(directory), 'invalid_path', '必须使用绝对目录路径。');
  const absolute = path.resolve(directory);
  // Check the nearest existing ancestor before mkdir, so a link cannot redirect creation into a cloud root.
  let ancestor = absolute;
  while (true) {
    try {
      const resolved = await fs.realpath(ancestor);
      assertNotCloudPath(resolved);
      break;
    } catch (error) {
      if (error instanceof StrataError) throw error;
      if (error.code !== 'ENOENT') throw new StrataError('path_unavailable', '无法解析目录。', { path: directory, reason: error.code });
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw new StrataError('path_unavailable', '目录不可用。');
      ancestor = parent;
    }
  }
  if (create) await fs.mkdir(absolute, { recursive: true });
  let real;
  try {
    real = await fs.realpath(absolute);
    assertNotCloudPath(real);
    assert((await fs.stat(real)).isDirectory(), 'invalid_path', '路径必须是目录。');
  } catch (error) {
    if (error instanceof StrataError) throw error;
    throw new StrataError('path_unavailable', '目录不存在或无法访问。', { path: directory, reason: error.code });
  }
  return real;
}

export function validateScopeShape(scope, { nullable = false } = {}) {
  if (scope === null && nullable) return;
  assert(scope && typeof scope === 'object' && !Array.isArray(scope), 'invalid_scope', '会话范围格式无效。');
  assert(['dsh', 'folder'].includes(scope.mode), 'invalid_scope', '会话范围只能为 dsh 或 folder。');
  if (scope.mode === 'folder') {
    assert(typeof scope.path === 'string' && scope.path.length > 0 && scope.path.length <= 4096, 'invalid_scope', '文件夹范围必须指定路径。');
    assertNotCloudPath(scope.path);
    assert(scope.includeSubfolders === undefined || typeof scope.includeSubfolders === 'boolean', 'invalid_scope', 'includeSubfolders 必须为布尔值。');
  }
  assert(scope.needsBinding === undefined || typeof scope.needsBinding === 'boolean', 'invalid_scope', 'needsBinding 必须为布尔值。');
}

export async function normalizeScope(scope, { allowUnbound = false, nullable = false } = {}) {
  validateScopeShape(scope, { nullable });
  if (scope === null) return null;
  if (scope.needsBinding) {
    assert(allowUnbound, 'needs_binding', '请先为导入的范围绑定本机目录。');
    return { mode: scope.mode, ...(scope.mode === 'folder' ? { path: scope.path, includeSubfolders: scope.includeSubfolders !== false } : {}), needsBinding: true };
  }
  if (scope.mode === 'dsh') return { mode: 'dsh' };
  return { mode: 'folder', path: await physicalDirectory(scope.path), includeSubfolders: scope.includeSubfolders !== false };
}

export async function scopeAllows(scope, cwd) {
  if (scope == null) return true;
  validateScopeShape(scope);
  if (scope.needsBinding) return false;
  if (scope.mode === 'dsh') return true;
  if (typeof cwd !== 'string' || !cwd) return false;
  try {
    const [root, actual] = await Promise.all([physicalDirectory(scope.path), physicalDirectory(cwd)]);
    // realpath resolves junctions. Compare path components, never a textual prefix.
    const relative = path.relative(root, actual);
    if (!relative) return true;
    return scope.includeSubfolders !== false && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  } catch (error) {
    if (error instanceof StrataError || error.code) return false;
    throw error;
  }
}

export async function requireScope(scope, cwd) {
  if (scope?.needsBinding) throw new StrataError('needs_binding', '此范围尚未绑定到本机目录。');
  if (!await scopeAllows(scope, cwd)) throw new StrataError('out_of_scope', '当前会话不在允许使用的目录范围内。');
}
