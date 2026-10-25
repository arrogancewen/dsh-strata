import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { startServer } from '../src/server.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'strata-browser-'));
const workspace = path.join(temporary, 'workspace');
const downloads = path.join(temporary, 'downloads');
const profile = path.join(temporary, 'chrome-profile');
const artifacts = path.join(project, '.artifacts');
await Promise.all([workspace, downloads, profile, artifacts].map(directory => mkdir(directory, { recursive: true })));
let instance;
let chrome;
let cdp;
const runtimeErrors = [];
const checkpoints = [];

async function eventually(action, description, timeout = 15000) {
  const end = Date.now() + timeout;
  let lastError;
  while (Date.now() < end) {
    try { const value = await action(); if (value) return value; } catch (error) { lastError = error; }
    await delay(80);
  }
  throw new Error(`Timed out: ${description}${lastError ? ` (${lastError.message})` : ''}`);
}

async function connect(url) {
  const socket = new WebSocket(url);
  await once(socket, 'open');
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    const call = pending.get(message.id);
    if (!call) return;
    pending.delete(message.id); clearTimeout(call.timer);
    if (message.error) call.reject(new Error(message.error.message)); else call.resolve(message.result);
  });
  socket.addEventListener('close', () => { for (const call of pending.values()) { clearTimeout(call.timer); call.reject(new Error('CDP connection closed')); } pending.clear(); });
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const callId = ++id;
        const timer = setTimeout(() => { pending.delete(callId); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        pending.set(callId, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: callId, method, params }));
      });
    },
    close() { socket.close(); },
  };
}

async function evaluate(expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const literal = value => JSON.stringify(value);
async function waitFor(expression, description = expression) { return eventually(() => evaluate(expression), description); }
async function clickText(text) {
  await waitFor(`Array.from(document.querySelectorAll('button')).some(e => e.textContent.trim() === ${literal(text)} && !e.disabled)`, `enabled button ${text}`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(e => e.textContent.trim() === ${literal(text)} && !e.disabled).click()`);
}
async function fill(selector, value) {
  await evaluate(`(() => { const e=document.querySelector(${literal(selector)}); if(!e) throw new Error('Missing field'); e.value=${literal(value)}; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); })()`);
}
async function selectFile(filename) {
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"]' });
  assert.ok(nodeId, 'file input is present');
  await cdp.send('DOM.setFileInputFiles', { nodeId, files: [filename] });
  await waitFor(`document.querySelector('.strata-dropzone')?.classList.contains('has-file')`, 'file read');
}
async function count() { return (await instance.app.dispatch('status', {}, { admin: true })).recordCount; }
async function preview() {
  const before = await count();
  await clickText('校验并预览');
  await waitFor(`document.querySelector('[data-transfer-preview]')?.textContent.includes('导入预览')`, 'import preview');
  assert.equal(await count(), before, 'preview must not write memory');
}
async function confirm(expected) {
  await clickText('确认导入');
  await eventually(async () => await count() === expected, 'expected record count after import');
  await waitFor(`!document.querySelector('[data-transfer-preview] .strata-panel')`, 'import completion');
}
async function screenshot(name) {
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await evaluate(`document.querySelector('.strata-notifications')?.replaceChildren()`);
  await evaluate('window.scrollTo(0,0)');
  const { cssContentSize } = await cdp.send('Page.getLayoutMetrics');
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: cssContentSize.width, height: Math.min(cssContentSize.height, 2400), scale: 1 } });
  await writeFile(path.join(artifacts, name), Buffer.from(data, 'base64'));
}
async function addMemory(title, text, kind = 'observation', opener = '记下一条') {
  const before = await count();
  await clickText(opener);
  await waitFor(`document.querySelector('dialog[open]')`, 'new memory dialog');
  await fill('dialog input[name="title"]', title);
  await fill('dialog select[name="kind"]', kind);
  await fill('dialog textarea[name="text"]', text);
  await fill('dialog input[name="tags"]', '产品设计, 记忆系统');
  await clickText('保存记忆');
  await waitFor(`!document.querySelector('dialog[open]')`, 'memory saved');
  await eventually(async () => await count() === before + 1, 'new record persisted');
}

try {
  instance = await startServer({ root: path.join(temporary, 'memory'), cwd: workspace, port: 0, initialScope: { mode: 'dsh' } });
  const executable = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
  chrome = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let chromeFailure;
  chrome.once('error', error => { chromeFailure = error; });
  chrome.stderr.resume();
  const debuggerPort = await eventually(async () => { if (chromeFailure) throw chromeFailure; return (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }, 'Chrome debugger');
  const pages = await (await fetch(`http://127.0.0.1:${debuggerPort}/json/list`)).json();
  cdp = await connect(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('DOM.enable');
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await cdp.send('Page.navigate', { url: instance.url });
  await waitFor(`document.querySelector('.strata-connection')?.textContent.includes('已连接')`, 'application ready');
  await addMemory('记忆需要保留来路', '每段经验都应能够找到来源。想法、观察与经过验证的结果，保留不同的状态。');
  await addMemory('项目记忆按文件夹使用', '已决定让项目记忆遵循会话目录；迁移时先检查范围，再显式绑定本地文件夹。', 'decision');
  await clickText('灵感设置');
  assert.equal(await evaluate(`document.querySelector('[role="switch"]').disabled`), true, 'unimplemented automatic insights disabled');
  await addMemory('把一次灵光一闪留下', '下次复盘时，比较相似的决定与它们的结果，也许能发现可复用的经验。', 'idea', '记下一个想法');
  await clickText('查看已保存的想法');
  await waitFor(`document.querySelectorAll('.strata-record').length === 1`, 'manual idea list');
  await fill('select[aria-label="筛选记忆类型"]', '');
  await waitFor(`document.querySelectorAll('.strata-record').length === 2`, 'ideas separated from default recall');
  await fill('input[aria-label="搜索记忆"]', '按文件夹');
  await waitFor(`document.querySelectorAll('.strata-record').length === 1 && document.querySelector('.strata-record').textContent.includes('按文件夹')`, 'memory search');
  await fill('input[aria-label="搜索记忆"]', '');
  await waitFor(`document.querySelectorAll('.strata-record').length === 2`, 'search cleared');
  await screenshot('settings-desktop.png');
  checkpoints.push('manual memory, search, idea separation, disabled automatic settings');

  await clickText('使用范围');
  await evaluate(`document.querySelector('input[value="folder"]').click()`);
  await fill('input[name="path"]', workspace);
  await evaluate(`document.querySelector('.strata-folder-fields input[type="checkbox"]').click()`);
  await clickText('保存使用范围');
  await eventually(async () => { const settings = await instance.app.dispatch('settings.get', {}, { admin: true }); return settings.scope.mode === 'folder' && settings.scope.includeSubfolders === false; }, 'folder scope persisted');
  await waitFor(`!Array.from(document.querySelectorAll('button')).some(e=>e.textContent.includes('正在保存'))`, 'scope save UI complete');
  await screenshot('settings-scope.png');
  checkpoints.push('folder scope and child-directory switch persisted');

  await clickText('迁移与导入');
  await clickText('导出记忆包');
  const exportedFile = await eventually(async () => (await readdir(downloads)).find(name => name.endsWith('.json')), 'JSON download');
  const exportedPath = path.join(downloads, exportedFile);
  const exported = JSON.parse(await readFile(exportedPath, 'utf8'));
  assert.equal(exported.format, 'dsh-strata/memory'); assert.equal(exported.scope.mode, 'folder');
  await clickText('使用范围');
  await evaluate(`document.querySelector('input[value="dsh"]').click()`);
  await clickText('保存使用范围');
  await eventually(async () => (await instance.app.dispatch('settings.get', {}, { admin: true })).scope.mode === 'dsh', 'global scope persisted');
  await waitFor(`!Array.from(document.querySelectorAll('button')).some(e=>e.textContent.includes('正在保存'))`, 'global scope UI complete');
  await clickText('迁移与导入');
  await selectFile(exportedPath);
  assert.equal(await evaluate(`document.querySelector('[aria-label="导入后使用范围"]').value`), 'folder', 'restricted source mapped to folder');
  assert.equal(await evaluate(`document.querySelector('[aria-label="导入记忆绑定的文件夹"]').value`), workspace);
  await fill('[aria-label="导入方式"]', 'fork');
  await fill('[aria-label="导入后使用范围"]', 'dsh');
  await preview();
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent==='确认导入').disabled`), true, 'restricted source cannot silently become global');
  await fill('[aria-label="导入后使用范围"]', 'folder');
  assert.equal(await evaluate(`document.querySelector('[data-transfer-preview] .strata-panel') === null`), true, 'scope edit invalidates preview');
  await preview();
  await screenshot('settings-transfer.png');
  await confirm(6);
  await selectFile(exportedPath); await preview(); await confirm(6);
  checkpoints.push('JSON export, scope mapping, preview without writes, fork import, idempotent retry');

  const markdown = path.join(temporary, '迁移检查.md');
  const markdownText = '# 从旧笔记接回记忆\n\n导入前审阅内容，确认后写入。\n\n<img src=x onerror="globalThis.STRATA_XSS=true">\n' + '迁移保留来源，不把引用当作已验证事实。\n'.repeat(600);
  await writeFile(markdown, markdownText, 'utf8');
  await selectFile(markdown); await fill('[aria-label="导入方式"]', 'merge');
  await preview(); await confirm(7);
  await selectFile(markdown); await preview(); await confirm(7);
  await clickText('记忆总览');
  await fill('input[aria-label="搜索记忆"]', '从旧笔记');
  await waitFor(`document.querySelectorAll('.strata-record').length===1`, 'Markdown import listed');
  await evaluate(`document.querySelector('.strata-record').click()`);
  assert.equal(await evaluate(`document.querySelector('.strata-record-detail').textContent.includes('<img')`), true, 'imported HTML is literal text');
  assert.equal(await evaluate(`document.querySelector('dialog img') !== null || globalThis.STRATA_XSS === true`), false, 'imported text cannot execute');
  await clickText('查看原文');
  await waitFor(`document.querySelector('.strata-evidence-text')?.textContent.length === 8000`, 'original evidence first page');
  await clickText('继续读取原文');
  await waitFor(`document.querySelector('.strata-evidence-text')?.textContent.length === ${markdownText.length}`, 'original evidence continuation');
  assert.equal(await evaluate(`document.querySelector('.strata-evidence-text').textContent`), markdownText, 'evidence pages reproduce original bytes as text');
  assert.equal(await evaluate(`document.querySelector('dialog img') !== null || globalThis.STRATA_XSS === true`), false, 'original evidence cannot execute HTML');
  await clickText('关闭');
  checkpoints.push('Markdown import, repeated merge, evidence paging, imported text rendered safely');

  await clickText('迁移与导入');
  const invalid = path.join(temporary, 'invalid.json'); await writeFile(invalid, '{broken');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"]' });
  await cdp.send('DOM.setFileInputFiles', { nodeId, files: [invalid] });
  await waitFor(`document.querySelector('.strata-dropzone')?.textContent.includes('文件读取失败')`, 'invalid JSON rejected');
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent==='校验并预览').disabled`), true);
  assert.equal(await count(), 7);
  await clickText('记忆总览'); await fill('input[aria-label="搜索记忆"]', '');
  await waitFor(`document.querySelectorAll('.strata-record').length===5`, 'memory overview restored');
  await evaluate(`document.querySelector('#app').style.width='560px'`);
  await waitFor(`getComputedStyle(document.querySelector('.strata-app')).gridTemplateColumns.split(' ').length===1`, 'container-responsive host layout');
  assert.ok(await evaluate(`document.querySelector('.strata-app').scrollWidth <= 560`), '560px host has no horizontal overflow');
  await screenshot('settings-host-560.png');
  await evaluate(`document.querySelector('#app').style.width=''`);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= 390`), 'mobile has no horizontal overflow');
  await screenshot('settings-mobile.png');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await screenshot('settings-dark.png');
  checkpoints.push('invalid upload recovery, 560px host, 390px mobile, dark theme');

  for (let index = 0; index < 53; index++) await instance.app.dispatch('records.remember', { record: { title: `PAGECASE ${index}`, text: `分页检查 ${index}`, kind: 'task' } }, { admin: true });
  await fill('input[aria-label="搜索记忆"]', 'PAGECASE');
  await fill('[aria-label="筛选记忆类型"]', 'task');
  await waitFor(`document.querySelectorAll('.strata-record').length===50 && document.querySelector('.strata-list-footer').textContent.includes('53')`, 'first records page');
  await instance.app.dispatch('records.remember', { record: { title: 'PAGECASE added between pages', text: '快照固定，刷新后可见。', kind: 'task' } }, { admin: true });
  await clickText('加载更多记忆');
  await waitFor(`document.querySelectorAll('.strata-record').length===53`, 'next page uses same view');
  assert.equal(await evaluate(`new Set(Array.from(document.querySelectorAll('.strata-record')).map(e=>e.getAttribute('aria-label'))).size`), 53, 'pagination has no duplicate records');
  await clickText('刷新');
  await waitFor(`document.querySelector('.strata-list-footer')?.textContent.includes('54')`, 'refresh includes latest record');
  assert.equal(await evaluate(`document.querySelector('[aria-label="搜索记忆"]').value`), 'PAGECASE');
  assert.equal(await evaluate(`document.querySelector('[aria-label="筛选记忆类型"]').value`), 'task');
  checkpoints.push('record pagination, pinned snapshot across writes, filters survive refresh');
  assert.deepEqual(runtimeErrors, [], 'no browser runtime errors');
  await writeFile(path.join(artifacts, 'browser-smoke.json'), JSON.stringify({ passed: true, checkpoints, recordCount: await count(), runtimeErrors }, null, 2));
  await rm(path.join(artifacts, 'settings-failure.png'), { force: true });
  console.log(`Browser smoke passed: ${checkpoints.length} groups; screenshots in .artifacts/settings-*.png`);
} catch (error) {
  if (cdp) { try { await screenshot('settings-failure.png'); } catch {} }
  throw error;
} finally {
  if (cdp) { try { await cdp.send('Browser.close'); } catch {} cdp.close(); }
  if (chrome && chrome.exitCode === null) { const finished = once(chrome, 'exit').catch(() => {}); chrome.kill(); await Promise.race([finished, delay(3000)]); }
  if (instance) await instance.close();
  const resolved = path.resolve(temporary);
  assert.ok(resolved.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`) && path.basename(resolved).startsWith('strata-browser-'), 'cleanup stays within the unique test directory');
  await rm(resolved, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 }).catch(error => console.warn(`Temporary test directory retained: ${error.code}`));
}
