// scripts/copy-functions.mjs
// ----------------------------------------------------------------------------
// EdgeOne Pages 约定：当使用「框架构建 + 指定 outputDirectory（如 ./dist）」时，
// Edge Functions 目录（functions/）必须存在于「输出目录」内，否则 /api/* 探测不到（404）。
// 参考官方：「若手动构建，则需将 Pages Functions 相关文件夹放入输出目录（如 dist）」。
//
// 本脚本在 Vite 构建完成后，把 app/functions/ 完整复制到 app/dist/functions/。
// 纯 Node、跨平台，无第三方依赖。
import { cp, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');
const src = resolve(appRoot, 'functions');
const distFns = resolve(appRoot, 'dist', 'functions');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

if (!(await exists(src))) {
  console.error('[copy-functions] 未找到 functions/ 源目录：' + src);
  process.exit(1);
}
if (!(await exists(resolve(appRoot, 'dist')))) {
  console.error('[copy-functions] 未找到 dist/（请先执行 vite build）');
  process.exit(1);
}

// 清掉旧的 dist/functions 再复制，保证幂等
await rm(distFns, { recursive: true, force: true });
await cp(src, distFns, { recursive: true });
console.log('[copy-functions] functions/ → dist/functions/ 复制完成');
