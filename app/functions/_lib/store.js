// 选题罗盘 · 存储抽象层
// ----------------------------------------------------------------------------
// 目标：同一套业务代码，在两种环境无缝运行：
//   1) 生产（EdgeOne Makers）：使用绑定到项目的 Edge KV 命名空间（变量名 TOPIC_KV）
//   2) 本地 / 降级：使用内存 + 文件的等价实现（本地 dev-server 注入）
//
// EdgeOne KV 官方 API（供参照）：
//   put(key, value)                      写入（value ≤ 25MB，key ≤ 512B 且仅 [0-9a-zA-Z_]）
//   get(key, { type: 'json' | 'text' })  读取，不存在返回 null
//   delete(key)                          删除
//   list({ prefix, limit, cursor })      遍历 -> { keys:[{key}], cursor, complete }
//
// 说明：EdgeOne 的 key 命名限制不允许冒号，故这里统一用下划线分隔（post_xxx / topic_xxx）。

/**
 * 把任意后端（EdgeOne KV binding 或本地实现）包一层统一接口，
 * 并补上 JSON 读写、按前缀全量遍历等便捷方法。
 */
export function createStore(backend) {
  if (!backend) {
    throw new Error('[store] 未找到 KV 后端。生产环境请在项目「数据存储」绑定命名空间，变量名 TOPIC_KV；本地由 dev-server 注入。');
  }

  return {
    raw: backend,

    async getJSON(key) {
      // 优先用后端原生 json 类型；本地实现也兼容
      try {
        const v = await backend.get(key, { type: 'json' });
        return v ?? null;
      } catch {
        const text = await backend.get(key);
        if (text == null) return null;
        try { return JSON.parse(text); } catch { return null; }
      }
    },

    async putJSON(key, obj) {
      await backend.put(key, JSON.stringify(obj));
      return obj;
    },

    async del(key) {
      await backend.delete(key);
    },

    /** 遍历某前缀下的所有 key（自动翻页），返回 key 字符串数组 */
    async listKeys(prefix) {
      const out = [];
      let cursor;
      // 防御式循环上限，避免异常游标导致死循环
      for (let i = 0; i < 1000; i++) {
        // 注意（踩坑）：生产 EdgeOne KV 的 list() 对 cursor 做严格类型校验，
        // cursor 为 undefined 会抛 "cursor type invalid. expect: 'string'"。
        // 因此首页不传 cursor 字段，只有拿到游标后才带上。
        const opts = { prefix, limit: 256 };
        if (cursor) opts.cursor = cursor;
        const res = await backend.list(opts);
        const keys = (res && res.keys) || [];
        for (const k of keys) out.push(typeof k === 'string' ? k : k.key);
        if (!res || res.complete || !res.cursor) break;
        cursor = res.cursor;
      }
      return out;
    },

    /** 遍历某前缀下的所有对象（JSON） */
    async listJSON(prefix) {
      const keys = await this.listKeys(prefix);
      const items = [];
      for (const key of keys) {
        const obj = await this.getJSON(key);
        if (obj) items.push(obj);
      }
      return items;
    },
  };
}

/**
 * 从 EdgeOne Functions 运行时解析出 KV 后端。
 *
 * 重要（踩坑记录）：EdgeOne Pages 的 KV 绑定变量名（如 TOPIC_KV）是以
 * **全局变量**形式注入到函数作用域的（官方文档 Example 里直接裸用 my_kv），
 * 而 **不会** 挂在 context.env 上。普通环境变量（如 SEED_TOKEN）才在 env 上。
 * 因此这里的解析顺序：
 *   1) context.env.TOPIC_KV —— 本地 dev-server 走这条（注入到 env）
 *   2) globalThis.TOPIC_KV  —— 生产 EdgeOne Pages 走这条（全局注入）
 *   3) 常见备用命名 KV
 */
export function resolveBackend(env) {
  if (env && env.TOPIC_KV) return env.TOPIC_KV;
  // 生产：KV 绑定作为全局变量注入
  try {
    if (typeof globalThis !== 'undefined' && globalThis.TOPIC_KV) return globalThis.TOPIC_KV;
  } catch { /* ignore */ }
  // 兼容其他常见命名
  if (env && env.KV) return env.KV;
  try {
    if (typeof globalThis !== 'undefined' && globalThis.KV) return globalThis.KV;
  } catch { /* ignore */ }
  return null;
}

// ---- 领域 key 约定（集中管理，避免散落）----
export const K = {
  post: (id) => `post_${id}`,
  postPrefix: 'post_',
  topic: (slug) => `topic_${slug}`,
  topicPrefix: 'topic_',
  meta: (name) => `meta_${name}`,
};

/**
 * 把选题名转成合法 slug（仅 [0-9a-zA-Z_]，中文转拼音代价高，这里用 hash 后缀保证唯一 + 可读前缀）。
 */
export function slugify(topic) {
  const ascii = String(topic).toLowerCase().replace(/[^0-9a-z]+/g, '_').replace(/^_+|_+$/g, '');
  let hash = 0;
  const s = String(topic);
  for (let i = 0; i < s.length; i++) { hash = (hash * 31 + s.charCodeAt(i)) >>> 0; }
  const suffix = hash.toString(36);
  return (ascii ? ascii.slice(0, 24) + '_' : '') + suffix;
}
