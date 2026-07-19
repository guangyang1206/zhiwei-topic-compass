// 本地开发服务器 —— 模拟 EdgeOne Makers 的静态托管 + /functions 路由 + KV 绑定
// 仅用于本地验证（部署时改用 `edgeone makers deploy`，生产 KV 由控制台绑定注入）
// 用法: node dev-server.mjs  → http://localhost:8788

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { LocalKV } from './dev-kv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8788;

// 本地注入的 env：把本地 KV 挂到 TOPIC_KV（与生产绑定变量名一致）
const env = { TOPIC_KV: new LocalKV(join(__dirname, 'data', 'kv.json')) };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// 把 /api/xxx 解析到对应的 function 文件：
//   /api/hello        -> functions/api/hello.js
//   /api/posts        -> functions/api/posts/index.js  (目录式)
//   /api/posts        -> functions/api/posts.js        (单文件，回退)
function resolveFnPath(pathname) {
  const rel = pathname.slice(1); // 去掉开头 /
  const candidates = [
    join(__dirname, 'functions', rel + '.js'),
    join(__dirname, 'functions', rel, 'index.js'),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

async function runFunction(fnPath, req, url) {
  const mod = await import(pathToFileURL(fnPath).href + `?t=${Date.now()}`);
  const handler = mod.onRequest || mod.default;
  if (typeof handler !== 'function') return null;

  // 读取 body（POST/PUT）
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve(data || undefined));
    });
  }

  const request = new Request(url.href, {
    method: req.method,
    headers: req.headers,
    body,
  });
  return handler({ request, env, params: {} });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    const fnPath = resolveFnPath(pathname);
    if (fnPath) {
      try {
        const webRes = await runFunction(fnPath, req, url);
        const buf = Buffer.from(await webRes.arrayBuffer());
        res.writeHead(webRes.status, Object.fromEntries(webRes.headers));
        return res.end(buf);
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, error: String(e && e.stack || e) }));
      }
    }
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: false, error: 'No function for ' + pathname }));
  }

  // 静态资源
  if (pathname === '/') pathname = '/index.html';
  const filePath = join(__dirname, pathname);
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    try {
      const data = await readFile(filePath);
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
      return res.end(data);
    } catch { /* fallthrough */ }
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`TopicCompass dev server: http://localhost:${PORT}`);
  console.log(`  GET  /api/hello`);
  console.log(`  GET  /api/posts   POST /api/posts`);
  console.log(`  GET  /api/stats`);
  console.log(`  POST /api/score`);
});
