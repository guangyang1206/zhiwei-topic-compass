// /api/stats —— 命中率统计与规律模型（Dashboard 数据源）
import { createStore, resolveBackend, K } from '../../_lib/store.js';
import { ok, fail, preflight } from '../../_lib/http.js';
import { analyze } from '../../_lib/analytics.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'GET') return fail('Method Not Allowed', 405);

  const backend = resolveBackend(env);
  if (!backend) return fail('KV 未绑定：请在 EdgeOne 项目「数据存储」绑定命名空间，变量名 TOPIC_KV', 503);
  const store = createStore(backend);

  try {
    const posts = await store.listJSON(K.postPrefix);
    const model = analyze(posts);

    // 精简掉内部 _posts，只返回展示需要的
    const { _posts, ...summary } = model;

    // 额外：按选题聚合排名（Dashboard 表格用）
    const byTopic = aggregateByTopic(_posts);

    return ok({ summary, byTopic });
  } catch (e) {
    // 临时：把真实错误暴露出来定位 545
    return fail('stats 运行时错误: ' + (e && e.message ? e.message : String(e)) + ' | stack: ' + (e && e.stack ? String(e.stack).slice(0, 300) : 'n/a'), 500);
  }
}

function aggregateByTopic(posts) {
  const map = new Map();
  for (const p of posts) {
    const e = map.get(p.topic) || { topic: p.topic, count: 0, hit: 0, scoreSum: 0 };
    e.count++; if (p._hit) e.hit++; e.scoreSum += (p._score || 0);
    map.set(p.topic, e);
  }
  return [...map.values()]
    .map(e => ({
      topic: e.topic,
      count: e.count,
      hit: e.hit,
      hitRate: +(e.hit / e.count).toFixed(3),
      avgScore: Math.round(e.scoreSum / e.count),
    }))
    .sort((a, b) => b.hitRate - a.hitRate || b.avgScore - a.avgScore);
}
