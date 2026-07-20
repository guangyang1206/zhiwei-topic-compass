// 临时诊断端点 —— 路由: /api/debug-env
// 目的：在生产运行时列出 context.env 挂了哪些 key（只列名字，不泄露值），
// 用于定位 KV 绑定 TOPIC_KV 到底注入在哪里、以什么形式存在。
// 诊断完成后应删除本文件。

export function onRequest(context) {
  const env = context.env || {};
  const keys = [];
  for (const k of Object.keys(env)) {
    const v = env[k];
    let kind = typeof v;
    // 探测是否像 KV 后端（有 get/put/list 方法）
    const looksKV = v && typeof v === 'object'
      && typeof v.get === 'function'
      && typeof v.put === 'function'
      && typeof v.list === 'function';
    keys.push({ name: k, type: kind, looksKV });
  }

  const body = {
    ok: true,
    envKeyCount: keys.length,
    keys,
    has_TOPIC_KV: 'TOPIC_KV' in env,
    TOPIC_KV_type: typeof env.TOPIC_KV,
    // 有些运行时把绑定挂在 context 顶层或 context.kv 上
    contextTopLevelKeys: Object.keys(context).filter((k) => k !== 'env'),
    time: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}
