import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Post, PostInput } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Card, Button, Modal, IconButton, EmptyState, ErrorState } from '../components/ui';
import { PostForm } from '../components/PostForm';

type SortKey = 'publishedAt' | 'read' | 'engagement';

export default function Posts() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['posts'], queryFn: api.posts });
  const [sortKey, setSortKey] = useState<SortKey>('publishedAt');
  const [kw, setKw] = useState('');

  // 表单：null=关闭，'new'=新增，Post=编辑
  const [editing, setEditing] = useState<Post | 'new' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['posts'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const createMut = useMutation({
    mutationFn: (v: PostInput) => api.createPost(v),
    onSuccess: () => { invalidate(); setEditing(null); },
  });
  const updateMut = useMutation({
    mutationFn: (v: PostInput) => api.updatePost(v),
    onSuccess: () => { invalidate(); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deletePost(id),
    onSuccess: () => { invalidate(); setPendingDelete(null); },
  });

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

  const formMut = editing === 'new' ? createMut : updateMut;

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
            className="w-[180px] rounded-md border border-hairline-strong bg-canvas px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
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
          <Button onClick={() => setEditing('new')}>+ {t('新增', 'Add')}</Button>
        </div>
      </div>

      {isLoading && <SkeletonTable />}
      {isError && (
        <ErrorState
          text={(error as Error).message}
          onRetry={() => qc.invalidateQueries({ queryKey: ['posts'] })}
          retryLabel={t('重试', 'Retry')}
        />
      )}

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
                  <Th className="text-right">{t('操作', 'Actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <Row key={p.id} p={p} onEdit={() => setEditing(p)} onDelete={() => setPendingDelete(p)} />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        title={kw ? t('没有匹配的内容', 'No matching content') : t('还没有任何内容', 'No content yet')}
                        hint={kw ? undefined : t('点击「新增」录入第一篇，系统会自动计算互动分并纳入统计与评分', 'Add your first post — engagement is computed and fed into stats & scoring')}
                        action={!kw && <Button onClick={() => setEditing('new')}>+ {t('新增内容', 'Add content')}</Button>}
                      />
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

      {/* 新增 / 编辑 表单 */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('新增内容', 'Add content') : t('编辑内容', 'Edit content')}
        width={640}
      >
        {editing !== null && (
          <>
            <PostForm
              initial={editing === 'new' ? null : editing}
              submitting={formMut.isPending}
              onSubmit={(v) => formMut.mutate(v)}
              onCancel={() => setEditing(null)}
            />
            {formMut.isError && (
              <p className="mt-3 text-[12px] text-danger">{(formMut.error as Error).message}</p>
            )}
          </>
        )}
      </Modal>

      {/* 删除确认 */}
      <Modal open={pendingDelete !== null} onClose={() => setPendingDelete(null)} title={t('删除内容', 'Delete content')} width={420}>
        {pendingDelete && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-muted">
              {t('确定删除这篇内容吗？此操作不可撤销。', 'Delete this post? This cannot be undone.')}
            </p>
            <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-ink">{pendingDelete.title}</p>
            {deleteMut.isError && <p className="text-[12px] text-danger">{(deleteMut.error as Error).message}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingDelete(null)}>{t('取消', 'Cancel')}</Button>
              <button
                onClick={() => deleteMut.mutate(pendingDelete.id)}
                disabled={deleteMut.isPending}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: 'var(--danger)' }}
              >
                {deleteMut.isPending ? t('删除中…', 'Deleting…') : t('确认删除', 'Delete')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ p, onEdit, onDelete }: { p: Post; onEdit: () => void; onDelete: () => void }) {
  const eng = p.engagement ?? p.like + p.looking + p.comment + p.share;
  return (
    <tr className="group border-b border-hairline/60 transition-colors hover:bg-surface-2">
      <td className="max-w-[380px] px-4 py-3">
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
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton title="编辑" onClick={onEdit}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </IconButton>
          <IconButton title="删除" danger onClick={onDelete}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </IconButton>
        </div>
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
