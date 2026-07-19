// /api/score —— 给候选选题打命中分（评分官算法后端）
// POST { candidates: [{ topic, keywords?, plannedTime?, plannedTitle? }] }
import { createStore, resolveBackend, K } from '../../_lib/store.js';
import { ok, fail, preflight, readBody } from '../../_lib/http.js';
import { analyze, scoreCandidates } from '../../_lib/analytics.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') return fail('Method Not Allowed', 405);

  const backend = resolveBackend(env);
  if (!backend) return fail('KV 未绑定：请在 EdgeOne 项目「数据存储」绑定命名空间，变量名 TOPIC_KV', 503);
  const store = createStore(backend);

  const body = await readBody(request);
  const candidates = body && Array.isArray(body.candidates) ? body.candidates : null;
  if (!candidates || !candidates.length) {
    return fail('请在 body.candidates 传入候选选题数组，如 [{ "topic": "..." }]');
  }

  const posts = await store.listJSON(K.postPrefix);
  const model = analyze(posts);
  const scores = scoreCandidates(candidates, model);

  return ok({
    basedOn: { posts: model.total, hitRate: model.hitRate },
    scores,
  });
}
