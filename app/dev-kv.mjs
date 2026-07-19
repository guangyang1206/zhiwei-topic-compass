// 本地 KV 实现 —— 仅供 dev-server 使用，模拟 EdgeOne KV 的 get/put/delete/list 接口
// 数据持久化到 data/kv.json，重启不丢，方便本地反复验证。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class LocalKV {
  constructor(file) {
    this.file = file;
    this.map = new Map();
    if (existsSync(file)) {
      try {
        const obj = JSON.parse(readFileSync(file, 'utf-8'));
        for (const [k, v] of Object.entries(obj)) this.map.set(k, v);
      } catch { /* ignore corrupt */ }
    }
  }

  _persist() {
    const obj = Object.fromEntries(this.map);
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(obj, null, 2));
  }

  async get(key, opts) {
    const v = this.map.has(key) ? this.map.get(key) : null;
    if (v == null) return null;
    const type = typeof opts === 'string' ? opts : (opts && opts.type) || 'text';
    if (type === 'json') { try { return JSON.parse(v); } catch { return null; } }
    return v; // text
  }

  async put(key, value) {
    this.map.set(key, typeof value === 'string' ? value : String(value));
    this._persist();
  }

  async delete(key) {
    this.map.delete(key);
    this._persist();
  }

  async list({ prefix = '', limit = 256, cursor } = {}) {
    let keys = [...this.map.keys()].filter(k => k.startsWith(prefix)).sort();
    if (cursor) { const i = keys.indexOf(cursor); if (i >= 0) keys = keys.slice(i + 1); }
    const page = keys.slice(0, limit);
    const complete = page.length >= keys.length;
    return {
      keys: page.map(k => ({ key: k })),
      cursor: complete ? null : page[page.length - 1],
      complete,
    };
  }
}
