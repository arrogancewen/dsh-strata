import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/server.mjs';
import { StrataStore } from '../src/core/index.mjs';

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-strata-http-'));
  const instance = await startServer({ root: path.join(directory, 'store'), cwd: directory, port: 0 });
  t.after(async () => { await instance.close(); await fs.rm(directory, { recursive: true, force: true }); });
  return { ...instance, directory };
}

function request(instance, { route = '/api/strata', method = 'POST', token = instance.token, origin, host, contentType = 'application/json', body = { method: 'status' } } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(route, instance.url);
    const headers = {};
    if (token !== null) headers['x-strata-token'] = token;
    if (origin !== undefined) headers.Origin = origin;
    if (host !== undefined) headers.Host = host;
    if (contentType !== null) headers['Content-Type'] = contentType;
    const req = http.request(url, { method, headers, agent: false }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        resolve({ status: res.statusCode, headers: res.headers, data });
      });
    });
    req.on('error', reject);
    if (method !== 'GET' && body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

test('HTTP API checks token before granting administrative access', async t => {
  const instance = await fixture(t);
  for (const token of [null, 'wrong-token', 'f'.repeat(64), 'é'.repeat(64)]) {
    const response = await request(instance, { token });
    assert.equal(response.status, 403);
    assert.equal(response.data.error.code, 'invalid_token');
  }
  const good = await request(instance, { origin: instance.url });
  assert.equal(good.status, 200);
  assert.equal(good.data.result.capabilities.manualMemory, true);
});

test('HTTP rejects cross-origin and hostile Host requests even with the right token', async t => {
  const instance = await fixture(t);
  for (const origin of ['http://evil.test', 'null', 'http://127.0.0.1:1']) {
    const response = await request(instance, { origin });
    assert.equal(response.status, 403);
    assert.equal(response.data.error.code, 'invalid_origin');
  }
  for (const host of ['evil.test', '127.0.0.1:1']) {
    const response = await request(instance, { host });
    assert.equal(response.status, 403);
    assert.equal(response.data.error.code, 'invalid_host');
  }
  assert.equal((await request(instance, { origin: instance.url, host: new URL(instance.url).host })).status, 200);
  assert.equal((await request(instance, { route: '/', method: 'GET', host: 'evil.test' })).status, 403);
});

test('HTTP serves the actual settings page with bounded static routes and security headers', async t => {
  const instance = await fixture(t);
  const page = await request(instance, { route: '/', method: 'GET', token: null });
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'], /^text\/html/);
  assert.ok(page.data.includes(`<meta name="strata-token" content="${instance.token}">`));
  assert.equal(page.headers['cache-control'], 'no-store');
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.match(page.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal((await request(instance, { route: '/settings.mjs', method: 'GET' })).status, 200);
  assert.equal((await request(instance, { route: '/HEAD.json', method: 'GET' })).status, 404);
  assert.equal((await request(instance, { method: 'GET' })).status, 405);
});

test('HTTP validates JSON input and exposes actual persisted changes on a new store instance', async t => {
  const instance = await fixture(t);
  assert.equal((await request(instance, { contentType: 'text/plain' })).status, 415);
  const malformed = await request(instance, { body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.data.error.code, 'invalid_json');
  const settings = await request(instance, { body: { method: 'settings.update', params: { patch: { l0BudgetTokens: 375, scope: { mode: 'dsh' } } } } });
  assert.equal(settings.status, 200);
  const save = await request(instance, { body: { method: 'records.remember', params: { record: { title: '通过页面保存', text: '服务端真实保存并可重读', kind: 'claim' } } } });
  assert.equal(save.status, 200);
  const reopened = await StrataStore.open(instance.app.store.root);
  assert.equal((await reopened.getSettings()).l0BudgetTokens, 375);
  assert.equal((await reopened.getSettings()).scope.mode, 'dsh');
  assert.equal((await reopened.getRecord(save.data.result.id)).text, '服务端真实保存并可重读');
  const listed = await request(instance, { body: { method: 'records.recall', params: { query: '重读' } } });
  assert.equal(listed.status, 200);
  assert.equal(listed.data.result.total, 1);
});
