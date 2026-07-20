// 临时诊断端点 —— 路由: /api/debug-env
// 验证假设：EdgeOne KV 绑定变量名(TOPIC_KV)是作为全局变量注入函数作用域，
// 而非挂在 context.env 上（官方文档 Example 里直接裸用 my_kv）。
// 诊断完成后应删除本文件。

export function onRequest(context) {
  const env = context.env || {};

  // 探测各种可能的 KV 挂点
  const probes = {};

  // 1) globalThis.TOPIC_KV
  try {
    const g = globalThis.TOPIC_KV;
    probes.globalThis_TOPIC_KV = g ? { type: typeof g, hasGet: typeof g.get === 'function', hasPut: typeof g.put === 'function' } : null;
  } catch (e) { probes.globalThis_TOPIC_KV = { err: String(e) }; }

  // 2) 裸标识符 TOPIC_KV（通过 eval 探测全局作用域）
  try {
    // eslint-disable-next-line no-eval
    const bare = eval('typeof TOPIC_KV !== "undefined" ? TOPIC_KV : undefined');
    probes.bare_TOPIC_KV = bare ? { type: typeof bare, hasGet: typeof bare.get === 'function', hasPut: typeof bare.put === 'function' } : null;
  } catch (e) { probes.bare_TOPIC_KV = { err: String(e) }; }

  // 3) env.TOPIC_KV
  probes.env_TOPIC_KV = env.TOPIC_KV ? { type: typeof env.TOPIC_KV } : null;

  // 4) globalThis 上所有像 KV 的对象
  const kvLikeGlobals = [];
  try {
    for (const k of Object.keys(globalThis)) {
      try {
        const v = globalThis[k];
        if (v && typeof v === 'object' && typeof v.get === 'function' && typeof v.put === 'function' && typeof v.list === 'function') {
          kvLikeGlobals.push(k);
        }
      } catch {}
    }
  } catch (e) { kvLikeGlobals.push('__enum_err:' + String(e)); }
  probes.kvLikeGlobals = kvLikeGlobals;

  return new Response(JSON.stringify({ ok: true, probes, time: new Date().toISOString() }, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });
}
