// /api/posts —— 历史发布记录：GET 列出全部，POST 录入一条（数据回流入口）
import { createStore, resolveBackend, K, slugify } from '../../_lib/store.js';
import { json, ok, fail, preflight, readBody } from '../../_lib/http.js';
import { engagementScore } from '../../_lib/analytics.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return preflight();

  const backend = resolveBackend(env);
  if (!backend) return fail('KV 未绑定：请在 EdgeOne 项目「数据存储」绑定命名空间，变量名 TOPIC_KV', 503);
  const store = createStore(backend);

  if (request.method === 'GET') {
    const posts = await store.listJSON(K.postPrefix);
    posts.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
    return ok({ count: posts.length, posts });
  }

  if (request.method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.title || !body.topic) {
      return fail('缺少必填字段：title、topic');
    }
    const id = body.id || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const post = {
      id,
      topic: body.topic,
      title: body.title,
      platform: body.platform || 'wechat',
      publishedAt: body.publishedAt || new Date().toISOString(),
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      summary: body.summary || '',
      read: numOr0(body.read),
      like: numOr0(body.like),
      looking: numOr0(body.looking),
      comment: numOr0(body.comment),
      share: numOr0(body.share),
      followGain: numOr0(body.followGain),
      createdAt: new Date().toISOString(),
    };
    post.engagement = engagementScore(post);
    await store.putJSON(K.post(id), post);
    // 顺带维护 topic 索引（可选，便于后续按选题聚合）
    await store.putJSON(K.topic(slugify(post.topic)), { topic: post.topic, updatedAt: post.createdAt });
    return ok({ post });
  }

  return fail('Method Not Allowed', 405);
}

function numOr0(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
