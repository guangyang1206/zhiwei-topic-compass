// EdgeOne Pages Edge Function —— 路由: /api/openapi.json
// 返回手写维护的 OpenAPI 3.0.3 规格（单一真源），供 Swagger UI 与外部工具消费。
import { OPENAPI_SPEC } from '../../_lib/openapi.js';

export function onRequest({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,OPTIONS',
      },
    });
  }
  return new Response(JSON.stringify(OPENAPI_SPEC), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=300',
    },
  });
}
