import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createApplication } from './application.mjs';
import { MAX_BUNDLE_BYTES } from './transfer.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/settings.mjs', ['settings.mjs', 'text/javascript; charset=utf-8']],
  ['/settings.css', ['settings.css', 'text/css; charset=utf-8']],
  ['/preview.mjs', ['preview.mjs', 'text/javascript; charset=utf-8']],
  ['/preview.css', ['preview.css', 'text/css; charset=utf-8']],
]);

export async function startServer({ root = path.join(project, '.local', 'memory'), port = 4318, cwd = project, initialScope } = {}) {
  const app = await createApplication(path.resolve(root), { initialScope: initialScope || { mode: 'folder', path: path.resolve(cwd), includeSubfolders: true } });
  const token = randomBytes(32).toString('hex');
  let baseUrl;
  const server = http.createServer(async (req, res) => {
    const json = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const expectedHost = new URL(baseUrl).host;
      if (req.headers.host !== expectedHost) return json(403, { error: { code: 'invalid_host', message: '仅允许本机访问。' } });
      if (req.headers.origin && req.headers.origin !== baseUrl) return json(403, { error: { code: 'invalid_origin', message: '不允许跨站请求。' } });
      const pathname = new URL(req.url, baseUrl).pathname;
      if (pathname === '/api/strata') {
        if (req.method !== 'POST') return json(405, { error: { message: '请使用 POST。' } });
        const supplied = String(req.headers['x-strata-token'] || '');
        if (!/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) return json(403, { error: { code: 'invalid_token', message: '页面授权已失效，请刷新后重试。' } });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: { message: '需要 JSON 请求。' } });
        let bytes = 0; const chunks = [];
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > MAX_BUNDLE_BYTES + 1024 * 1024) { json(413, { error: { code: 'request_too_large', message: '上传内容过大。' } }); return; }
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch { return json(400, { error: { code: 'invalid_json', message: '请求 JSON 无效。' } }); }
        const result = await app.dispatch(body.method, body.params || {}, { admin: true, cwd });
        return json(200, { result });
      }
      if (req.method !== 'GET' || !staticFiles.has(pathname)) return json(404, { error: { message: '未找到页面。' } });
      const [filename, contentType] = staticFiles.get(pathname);
      let content = await readFile(path.join(project, 'client', filename), 'utf8');
      if (filename === 'index.html') {
        const escape = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        content = content.replace('<head>', `<head>\n<meta name="strata-token" content="${token}">\n<meta name="strata-cwd" content="${escape(cwd)}">`);
      }
      res.writeHead(200, { 'Content-Type': contentType }); res.end(content);
    } catch (error) {
      const status = error.status || (['out_of_scope','forbidden'].includes(error.code) ? 403 : error.code?.includes('conflict') ? 409 : 400);
      json(status, { error: { code: error.code || 'operation_failed', message: error.message || '操作未完成。' } });
    }
  });
  server.requestTimeout = 30000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { app, server, url: baseUrl, token, close: () => new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const get = (name, fallback) => { const index = args.indexOf(`--${name}`); return index < 0 ? fallback : args[index + 1]; };
  const instance = await startServer({ root: get('root', undefined), port: Number(get('port', 4318)), cwd: get('cwd', project) });
  console.log(`Strata settings: ${instance.url}`);
  const stop = () => instance.close().then(() => process.exit(0));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
