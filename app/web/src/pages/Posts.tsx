import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Post } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Card } from '../components/ui';

type SortKey = 'publishedAt' | 'read' | 'engagement';

export default function Posts() {
  const { t } = useI18n();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['posts'], queryFn: api.posts });
  const [sortKey, setSortKey] = useState<SortKey>('publishedAt');
  const [kw, setKw] = useState('');

  const posts = data?.posts ?? [];

  const rows = useMemo(() => {
    let r = posts.slice();
    if (kw.trim()) {
      const q = kw.trim().toLowerCase();
      r = r.filter(
        (p) =>
          p.topic.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.keywords.some((k) => k.toLowerCase().includes(q)),
      );
    }
    r.sort((a, b) => {
      if (sortKey === 'publishedAt') return (b.publishedAt || '').localeCompare(a.publishedAt || '');
      if (sortKey === 'read') return (b.read || 0) - (a.read || 0);
      return (b.engagement || 0) - (a.engagement || 0);
    });
    return r;
  }, [posts, sortKey, kw]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium text-ink">{t('历史内容', 'Content History')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t('全部已发布内容与真实互动数据（来源 EdgeOne KV）', 'All published content with real engagement data (EdgeOne KV)')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="w-[200px] rounded-md border border-hairline-strong bg-canvas px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
            placeholder={t('搜索选题 / 标题 / 关键词', 'Search topic / title / keyword')}
            value={kw}
            onChange={(e) => setKw(e.target.value)}
          />
          <select
            className="rounded-md border border-hairline-strong bg-canvas px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="publishedAt">{t('按时间', 'By date')}</option>
            <option value="read">{t('按阅读', 'By reads')}</option>
            <option value="engagement">{t('按互动', 'By engagement')}</option>
          </select>
        </div>
      </div>

      {isLoading && <SkeletonTable />}
      {isError && <Card className="p-6 text-[13px] text-danger">{(error as Error).message}</Card>}

      {!isLoading && !isError && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-hairline text-left text-[12px] text-ink-tertiary">
                  <Th>{t('选题 / 标题', 'Topic / Title')}</Th>
                  <Th>{t('平台', 'Platform')}</Th>
                  <Th>{t('发布时间', 'Published')}</Th>
                  <Th className="text-right">{t('阅读', 'Reads')}</Th>
                  <Th className="text-right">{t('互动', 'Engage')}</Th>
                  <Th className="text-right">{t('涨粉', 'Follows')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <Row key={p.id} p={p} />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[13px] text-ink-tertiary">
                      {t('没有匹配的内容', 'No matching content')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-hairline px-4 py-2.5 text-[12px] text-ink-tertiary">
            {t(`共 ${rows.length} 篇`, `${rows.length} posts`)}
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ p }: { p: Post }) {
  const eng = p.engagement ?? p.like + p.looking + p.comment + p.share;
  return (
    <tr className="border-b border-hairline/60 transition-colors hover:bg-surface-2">
      <td className="max-w-[420px] px-4 py-3">
        <div className="truncate font-medium text-ink">{p.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-ink-subtle">{p.topic}</span>
          {p.keywords.slice(0, 3).map((k) => (
            <span key={k} className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-tertiary">
              {k}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-ink-muted">{p.platform}</td>
      <td className="mono px-4 py-3 text-[12px] text-ink-muted">{(p.publishedAt || '').slice(0, 10)}</td>
      <td className="mono px-4 py-3 text-right text-ink">{fmt(p.read)}</td>
      <td className="mono px-4 py-3 text-right text-ink">{fmt(eng)}</td>
      <td className="mono px-4 py-3 text-right" style={{ color: p.followGain > 0 ? 'var(--accent)' : 'var(--ink-tertiary)' }}>
        {p.followGain > 0 ? `+${fmt(p.followGain)}` : fmt(p.followGain)}
      </td>
    </tr>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 font-medium ${className}`}>{children}</th>;
}

function SkeletonTable() {
  return (
    <Card className="p-4">
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-surface-2" />
        ))}
      </div>
    </Card>
  );
}

function fmt(n: number) {
  if (n == null) return '—';
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1) + 'w';
  return n.toLocaleString();
}
