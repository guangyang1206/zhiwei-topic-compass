import { useI18n } from '../lib/i18n';
import { Card } from '../components/ui';

// 后端 Hono + zod-openapi 自动生成的交互式文档页（Swagger UI）。
// 用 iframe 内嵌，隔离 Swagger UI 自带样式，不污染主应用主题。
const DOCS_URL = '/api/docs';
const SPEC_URL = '/api/openapi.json';

const endpoints = [
  { method: 'GET', path: '/api/health', descZh: '健康检查 · 运行时与 KV 状态', descEn: 'Health check · runtime & KV status' },
  { method: 'GET', path: '/api/stats', descZh: '选题统计 · 命中率 / 关键词 / 时段（含 Wilson 置信度）', descEn: 'Topic stats · hit-rate / keywords / time buckets (Wilson CI)' },
  { method: 'GET', path: '/api/posts', descZh: '历史内容列表 · 全部已发布内容与互动数据', descEn: 'Post list · all published content with engagement' },
  { method: 'POST', path: '/api/score', descZh: '选题评分 · 基于历史规律的可解释打分', descEn: 'Topic scoring · explainable score from historical patterns' },
  { method: 'GET', path: '/api/admin/seed', descZh: '灌入种子数据（需 token）', descEn: 'Seed data (token required)' },
];

const methodColor: Record<string, string> = {
  GET: 'var(--accent)',
  POST: 'var(--violet)',
};

export default function ApiDocs() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium text-ink">{t('API 文档', 'API Reference')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t(
              '由后端 Zod Schema 自动生成 · 单一真源 · 可直接调试',
              'Auto-generated from backend Zod schemas · single source of truth · try it out',
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={SPEC_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-hairline-strong px-3 py-2 text-[13px] text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            {t('OpenAPI JSON', 'OpenAPI JSON')}
          </a>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-2 text-[13px] font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            {t('全屏打开', 'Open full page')}
          </a>
        </div>
      </div>

      {/* 接口速览（品牌风格，快速一览所有端点） */}
      <Card className="p-2">
        <div className="divide-y divide-hairline">
          {endpoints.map((e) => (
            <div key={e.method + e.path} className="flex items-center gap-3 px-3 py-2.5">
              <span
                className="mono inline-flex w-[52px] justify-center rounded-sm px-2 py-0.5 text-[11px] font-semibold"
                style={{ color: methodColor[e.method], background: `color-mix(in srgb, ${methodColor[e.method]} 12%, transparent)` }}
              >
                {e.method}
              </span>
              <code className="mono text-[13px] text-ink">{e.path}</code>
              <span className="ml-auto truncate text-[12px] text-ink-tertiary">{t(e.descZh, e.descEn)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 内嵌交互式 Swagger UI */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
          <span className="text-[13px] font-medium text-ink-muted">{t('交互式调试（Swagger UI）', 'Interactive (Swagger UI)')}</span>
          <span className="mono text-[11px] text-ink-tertiary">powered by Hono + zod-openapi</span>
        </div>
        <iframe
          title="Swagger UI"
          src={DOCS_URL}
          className="w-full"
          style={{ height: '72vh', border: 'none', background: '#fff' }}
        />
      </Card>
    </div>
  );
}
