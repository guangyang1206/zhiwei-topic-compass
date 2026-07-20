// 临时诊断端点 —— 路由: /api/debug-env
// 目的：定位 KV 绑定 TOPIC_KV 在运行时的真实挂点。
// 关键发现：context 顶层有 eo 对象（新版 EdgeOne Pages 运行时入口）。
// 诊断完成后应删除本文件。

function describe(obj, depth) {
  if (obj == null) return { _null: true };
  if (typeof obj !== 'object' && typeof obj !== 'function') return { _type: typeof obj };
  const out = {};
  for (const k of Object.keys(obj)) {
    let v;
    try { v = obj[k]; } catch { out[k] = { _err: 'getter threw' }; continue; }
    const t = typeof v;
    const looksKV = v && typeof v === 'object'
      && typeof v.get === 'function'
      && typeof v.put === 'function'
      && typeof v.list === 'function';
    if ((t === 'object' || t === 'function') && depth > 0 && !looksKV) {
      out[k] = { _type: t, _keys: Object.keys(v || {}), looksKV };
    } else {
      out[k] = { _type: t, looksKV };
    }
  }
  return out;
}

export function onRequest(context) {
  const env = context.env || {};
  const eo = context.eo;

  const body = {
    ok: true,
    envKeys: Object.keys(env),
    has_env_TOPIC_KV: 'TOPIC_KV' in env,
    contextTopLevelKeys: Object.keys(context),
    eo_present: !!eo,
    eo_shape: eo ? describe(eo, 1) : null,
    eo_env_shape: (eo && eo.env) ? describe(eo.env, 1) : null,
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
