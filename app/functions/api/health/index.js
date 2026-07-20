// EdgeOne Pages Edge Function —— 路由: /api/health
// 健康检查：返回服务名、版本、运行时与 KV 绑定状态。
import { resolveBackend } from '../../_lib/store.js';

export function onRequest({ request, env }) {
  const backend = resolveBackend(env);
  const body = {
    ok: true,
    name: '知微 ZhiWei',
    version: '0.2.0',
    runtime: 'edgeone-pages-edge',
    kv: !!backend,
    time: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}
