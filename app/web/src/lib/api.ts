// API 客户端：统一封装 fetch，处理 { ok, error } 信封。
// 本地开发经 vite proxy 打到 Hono dev-server；生产同域直连 /api。

export interface KeywordStat {
  key: string;
  count: number;
  hit: number;
  hitRate: number;
  confidence: number;
  avgScore: number;
}

export interface StatsSummary {
  total: number;
  hits: number;
  hitRate: number;
  hitThreshold: number;
  avgScore: number;
  topKeywords: KeywordStat[];
  byTime: TimeStat[];
  byTitle: Record<string, { count: number; hit: number; hitRate: number }>;
}

export interface TimeStat {
  key: string;
  count: number;
  hit: number;
  hitRate: number;
  confidence: number;
  avgScore: number;
}

export interface TopicStat {
  topic: string;
  count: number;
  hit: number;
  hitRate: number;
  avgScore: number;
}

export interface StatsResponse {
  ok: true;
  summary: StatsSummary;
  byTopic: TopicStat[];
}

export interface Post {
  id: string;
  topic: string;
  title: string;
  platform: string;
  publishedAt: string;
  keywords: string[];
  summary: string;
  read: number;
  like: number;
  looking: number;
  comment: number;
  share: number;
  followGain: number;
  engagement?: number;
}

export interface Candidate {
  topic: string;
  keywords?: string[];
  plannedTime?: string;
  plannedTitle?: string;
}

export interface ScoreItem {
  topic: string;
  score: number;
  level: '强推' | '可做' | '谨慎' | '不建议';
  keywords: string[];
  reasons: string[];
}

export interface ScoreResponse {
  ok: true;
  basedOn: { posts: number; hitRate: number };
  scores: ScoreItem[];
}

export interface Health {
  ok: true;
  name: string;
  version: string;
  runtime: string;
  kv: boolean;
  time: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data as T;
}

export const api = {
  health: () => req<Health>('/api/health'),
  stats: () => req<StatsResponse>('/api/stats'),
  posts: () => req<{ ok: true; count: number; posts: Post[] }>('/api/posts'),
  score: (candidates: Candidate[]) =>
    req<ScoreResponse>('/api/score', { method: 'POST', body: JSON.stringify({ candidates }) }),
};
