// /api/posts —— 历史发布记录（数据回流入口）
//   GET    列出全部（按发布时间倒序）
//   POST   新增一条
//   PUT    编辑一条（body 需带 id）
//   DELETE 删除一条（body 或 ?id= 带 id）
// 说明：EdgeOne Pages 目录式路由对动态段支持有限，这里统一用 body/query 传 id，
//       既与现有简洁路由一致，也避免线上 functions 探测的坑。
import { createStore, resolveBackend, K, slugify } from '../../_lib/store.js';
import { ok, fail, preflight, readBody } from '../../_lib/http.js';
import { engagementScore } from '../../_lib/analytics.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return preflight();

  const backend = resolveBackend(env);
  if (!backend) return fail('KV 未绑定：请在 EdgeOne 项目「数据存储」绑定命名空间，变量名 TOPIC_KV', 503);
  const store = createStore(backend);

  // ---- GET：列出全部 ----
  if (request.method === 'GET') {
    const posts = await store.listJSON(K.postPrefix);
    posts.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
    return ok({ count: posts.length, posts });
  }

  // ---- POST：新增 ----
  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.title || !body.topic) {
      return fail('缺少必填字段：title、topic');
    }
    const id = body.id || genId();
    const post = buildPost(body, id, null);
    await store.putJSON(K.post(id), post);
    await store.putJSON(K.topic(slugify(post.topic)), { topic: post.topic, updatedAt: post.createdAt });
    return ok({ post });
  }

  // ---- PUT：编辑 ----
  if (request.method === 'PUT') {
    const body = await readBody(request);
    if (!body || !body.id) return fail('缺少 id');
    if (!body.title || !body.topic) return fail('缺少必填字段：title、topic');
    const existing = await store.getJSON(K.post(body.id));
    if (!existing) return fail('内容不存在', 404);
    const post = buildPost(body, body.id, existing);
    await store.putJSON(K.post(body.id), post);
    await store.putJSON(K.topic(slugify(post.topic)), { topic: post.topic, updatedAt: post.updatedAt });
    return ok({ post });
  }

  // ---- DELETE：删除 ----
  if (request.method === 'DELETE') {
    let id;
    const body = await readBody(request);
    if (body && body.id) id = body.id;
    if (!id) {
      const u = new URL(request.url);
      id = u.searchParams.get('id');
    }
    if (!id) return fail('缺少 id');
    const existing = await store.getJSON(K.post(id));
    if (!existing) return fail('内容不存在', 404);
    await store.del(K.post(id));
    return ok({ deleted: id });
  }

  return fail('Method Not Allowed', 405);
}

// 统一构造 post 对象：新增时 prev=null；编辑时保留 createdAt、更新 updatedAt。
function buildPost(body, id, prev) {
  const now = new Date().toISOString();
  const post = {
    id,
    topic: String(body.topic).trim(),
    title: String(body.title).trim(),
    platform: body.platform || (prev && prev.platform) || 'wechat',
    publishedAt: body.publishedAt || (prev && prev.publishedAt) || now,
    keywords: normKeywords(body.keywords),
    summary: body.summary != null ? String(body.summary) : (prev && prev.summary) || '',
    read: numOr0(body.read),
    like: numOr0(body.like),
    looking: numOr0(body.looking),
    comment: numOr0(body.comment),
    share: numOr0(body.share),
    followGain: numOr0(body.followGain),
    createdAt: (prev && prev.createdAt) || now,
    updatedAt: now,
  };
  post.engagement = engagementScore(post);
  return post;
}

// keywords 兼容数组或「逗号/顿号/空格」分隔的字符串
function normKeywords(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') {
    return v.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function numOr0(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function genId() { return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
