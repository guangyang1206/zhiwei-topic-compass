// /api/admin/seed —— 一次性把种子发布数据灌入生产 Edge KV
// ----------------------------------------------------------------------------
// 用途：KV 审批通过并绑定后，KV 是空的；调用本端点把 data/kv.json 里的 31 篇
//       真实种子发布数据写入生产 KV，之后 /api/stats、/api/score 即返回真实数据。
// 安全：必须带正确令牌（?token= 或 X-Seed-Token 头）才执行；令牌来自 env.SEED_TOKEN。
//       幂等：已存在的 key 默认跳过；?force=1 强制覆盖。
//       这是运维端点，灌完可在控制台移除 SEED_TOKEN 使其失效。
import { createStore, resolveBackend, K } from '../../../_lib/store.js';
import { ok, fail, preflight } from '../../../_lib/http.js';
import { SEED_POSTS } from '../../../_lib/seed-data.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST' && request.method !== 'GET') return fail('Method Not Allowed', 405);

  // ---- 令牌校验 ----
  const url = new URL(request.url);
  const expected = (env && env.SEED_TOKEN) || '';
  const provided = url.searchParams.get('token') || request.headers.get('X-Seed-Token') || '';
  if (!expected) return fail('未配置 SEED_TOKEN：请在 EdgeOne 项目环境变量设置 SEED_TOKEN 后再调用', 403);
  if (provided !== expected) return fail('令牌无效', 401);

  // ---- KV 后端 ----
  const backend = resolveBackend(env);
  if (!backend) return fail('KV 未绑定：请在 EdgeOne 项目「数据存储」绑定命名空间，变量名 TOPIC_KV', 503);
  const store = createStore(backend);

  const force = url.searchParams.get('force') === '1';
  let written = 0, skipped = 0;
  const errors = [];

  for (const post of SEED_POSTS) {
    const key = K.post(post.id);
    try {
      if (!force) {
        const existing = await store.getJSON(key);
        if (existing) { skipped++; continue; }
      }
      await store.putJSON(key, post);
      written++;
    } catch (e) {
      errors.push({ key, error: String(e && e.message || e) });
    }
  }

  // 写一个 meta 标记，便于确认灌数时间
  try { await store.putJSON(K.meta('seed'), { at: new Date().toISOString(), total: SEED_POSTS.length, written, skipped }); } catch {}

  return ok({
    seeded: true,
    total: SEED_POSTS.length,
    written,
    skipped,
    force,
    errors: errors.length ? errors : undefined,
    hint: written > 0
      ? '真实数据已写入 KV，刷新 /dashboard.html 即可看到「实时数据 · EdgeOne KV」。'
      : (skipped > 0 ? 'KV 中已存在数据（如需覆盖用 ?force=1）。' : '未写入任何数据。'),
  });
}
