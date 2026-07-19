// 导入种子数据到运行中的 dev-server（通过 POST /api/posts）
// 用法: node seed-import.mjs   (需先启动 dev-server)
import { SEED_POSTS } from './data/seed.mjs';

const BASE = process.env.BASE || 'http://localhost:8788';

let okCount = 0, failCount = 0;
for (const p of SEED_POSTS) {
  try {
    const res = await fetch(`${BASE}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    const data = await res.json();
    if (data.ok) { okCount++; } else { failCount++; console.error('FAIL:', p.title, data.error); }
  } catch (e) {
    failCount++; console.error('ERR:', p.title, String(e));
  }
}
console.log(`\n导入完成：成功 ${okCount} / 失败 ${failCount} / 共 ${SEED_POSTS.length}`);
