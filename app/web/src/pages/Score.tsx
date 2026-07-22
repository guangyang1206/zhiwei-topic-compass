import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ScoreItem, Candidate } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Card, Button, LevelBadge, IconButton, EmptyState } from '../components/ui';

interface Row {
  topic: string;
  title: string;
  time: string;
}

const emptyRow = (): Row => ({ topic: '', title: '', time: '' });

export default function Score() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  const mut = useMutation({
    mutationFn: (candidates: Candidate[]) => api.score(candidates),
  });

  const validRows = rows.filter((r) => r.topic.trim());
  const canSubmit = validRows.length > 0 && !mut.isPending;

  function submit() {
    const candidates: Candidate[] = validRows.map((r) => ({
      topic: r.topic.trim(),
      plannedTitle: r.title.trim() || undefined,
      plannedTime: r.time || undefined,
    }));
    mut.mutate(candidates);
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() { setRows((rs) => [...rs, emptyRow()]); }
  function removeRow(i: number) { setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i))); }

  const results = mut.data?.scores ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-medium text-ink">{t('选题评分', 'Topic Scoring')}</h1>
        <p className="mt-1 text-[13px] text-ink-subtle">
          {t('批量输入候选选题，基于历史规律给出可解释的命中评分、评分构成与发布建议', 'Score candidate topics against historical patterns — with score breakdown and actionable suggestions')}
        </p>
      </div>

      {/* 候选输入区 */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-ink">{t('候选选题', 'Candidates')}</h2>
          <span className="text-[12px] text-ink-tertiary">{t(`${validRows.length} 个有效`, `${validRows.length} valid`)}</span>
        </div>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-hairline p-3 sm:grid-cols-[1.1fr_1.4fr_1fr_auto] sm:items-end sm:border-0 sm:p-0">
              <Field label={i === 0 ? t('选题方向 *', 'Topic *') : ''}>
                <input className={inputCls} value={r.topic} onChange={(e) => update(i, { topic: e.target.value })}
                  placeholder={t('如：AI 编程避坑', 'e.g. AI coding pitfalls')} />
              </Field>
              <Field label={i === 0 ? t('拟定标题', 'Planned title') : ''}>
                <input className={inputCls} value={r.title} onChange={(e) => update(i, { title: e.target.value })}
                  placeholder={t('如：我踩过的 10 个 AI 编程大坑', 'e.g. 10 AI coding traps')} />
              </Field>
              <Field label={i === 0 ? t('计划时间', 'Planned time') : ''}>
                <input type="datetime-local" className={inputCls} value={r.time} onChange={(e) => update(i, { time: e.target.value })} />
              </Field>
              <div className="flex justify-end pb-0.5">
                <IconButton title={t('删除', 'Remove')} danger onClick={() => removeRow(i)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
                </IconButton>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
          <button onClick={addRow} className="text-[13px] text-accent transition-opacity hover:opacity-80">
            + {t('添加候选', 'Add candidate')}
          </button>
          <Button onClick={submit} disabled={!canSubmit}>
            {mut.isPending ? t('评分中…', 'Scoring…') : t(`评分 ${validRows.length} 个选题`, `Score ${validRows.length}`)}
          </Button>
        </div>
        {mut.isError && <p className="mt-3 text-[12px] text-danger">{(mut.error as Error).message}</p>}
      </Card>

      {/* 结果区 */}
      {mut.data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-ink">{t('评分结果', 'Results')}</h2>
            <span className="text-[12px] text-ink-tertiary">
              {t(`基于 ${mut.data.basedOn.posts} 篇历史 · 基线命中率 ${Math.round(mut.data.basedOn.hitRate * 100)}%`,
                 `Based on ${mut.data.basedOn.posts} posts · baseline ${Math.round(mut.data.basedOn.hitRate * 100)}%`)}
            </span>
          </div>
          {results.length === 0 && <Card><EmptyState title={t('没有评分结果', 'No results')} /></Card>}
          {results.map((r, i) => <ResultCard key={i} r={r} rank={i} />)}
        </div>
      )}
    </div>
  );
}

function ResultCard({ r, rank }: { r: ScoreItem; rank: number }) {
  const { t } = useI18n();
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {rank === 0 && r.score >= 60 && (
              <span className="rounded-sm px-1.5 py-0.5 text-[11px] font-medium" style={{ color: 'var(--accent)', background: 'var(--accent-weak)' }}>
                {t('最优', 'Best')}
              </span>
            )}
            <span className="truncate text-[15px] font-medium text-ink">{r.topic}</span>
            <LevelBadge level={r.level} />
          </div>
          {r.title && <div className="mt-1 truncate text-[13px] text-ink-subtle">{r.title}</div>}
        </div>
        <div className="mono flex items-baseline gap-1">
          <span className="text-[32px] font-medium leading-none" style={{ color: scoreColor(r.score) }}>{r.score}</span>
          <span className="text-[13px] text-ink-tertiary">/ 100</span>
        </div>
      </div>

      {/* 评分构成条 */}
      {r.breakdown && <Breakdown b={r.breakdown} score={r.score} />}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* 评分依据 */}
        <div>
          <div className="mb-2 text-[12px] font-medium text-ink-muted">{t('评分依据', 'Reasoning')}</div>
          <ul className="space-y-1.5">
            {r.reasons.map((x, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-ink-muted">
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--ink-tertiary)' }} />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* 发布建议 */}
        {r.suggestions && r.suggestions.length > 0 && (
          <div>
            <div className="mb-2 text-[12px] font-medium text-ink-muted">{t('发布建议', 'Suggestions')}</div>
            <ul className="space-y-1.5">
              {r.suggestions.map((x, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-ink-muted">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" className="mt-0.5 shrink-0">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

// 评分构成堆叠条：基线 + 关键词 + 时段 + 标题（负贡献单独标红）
function Breakdown({ b, score }: { b: NonNullable<ScoreItem['breakdown']>; score: number }) {
  const { t } = useI18n();
  const parts = [
    { key: t('基线', 'Base'), val: b.base, color: 'var(--hairline-strong)' },
    { key: t('关键词', 'Keyword'), val: b.keyword, color: 'var(--accent)' },
    { key: t('时段', 'Time'), val: b.time, color: 'var(--violet)' },
    { key: t('标题', 'Title'), val: b.title, color: 'var(--arch, #BA7517)' },
  ];
  const positives = parts.filter((p) => p.val > 0);
  const negativeTotal = parts.filter((p) => p.val < 0).reduce((s, p) => s + p.val, 0);
  const denom = Math.max(100, score);

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink-tertiary">
        <span>{t('评分构成', 'Score breakdown')}</span>
        {negativeTotal < 0 && <span style={{ color: 'var(--danger)' }}>{t('扣分', 'Penalty')} {negativeTotal}</span>}
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
        {positives.map((p, i) => (
          <div key={i} title={`${p.key} +${p.val}`} style={{ width: `${(p.val / denom) * 100}%`, background: p.color }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[11px]" style={{ color: p.val < 0 ? 'var(--danger)' : 'var(--ink-subtle)' }}>
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.val < 0 ? 'var(--danger)' : p.color }} />
            {p.key} {p.val >= 0 ? `+${p.val}` : p.val}
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[12px] text-ink-muted">{label}</span>}
      {children}
    </label>
  );
}

function scoreColor(s: number) {
  if (s >= 75) return 'var(--accent)';
  if (s >= 60) return 'var(--violet)';
  if (s >= 45) return 'var(--arch, #BA7517)';
  return 'var(--danger)';
}

const inputCls =
  'w-full rounded-md border border-hairline-strong bg-canvas px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-accent';
