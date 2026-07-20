import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ScoreItem } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Card, Button, LevelBadge } from '../components/ui';

export default function Score() {
  const { t } = useI18n();
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      api.score([{ topic: topic.trim(), plannedTitle: title.trim() || undefined, plannedTime: time || undefined }]),
  });

  const canSubmit = topic.trim().length > 0 && !mut.isPending;
  const result: ScoreItem | undefined = mut.data?.scores?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-medium text-ink">{t('选题评分', 'Topic Scoring')}</h1>
        <p className="mt-1 text-[13px] text-ink-subtle">
          {t('输入候选选题，基于历史规律给出可解释的命中评分', 'Score a candidate topic against your historical patterns')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 输入表单 */}
        <Card className="p-5">
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (canSubmit) mut.mutate(); }}
          >
            <Field label={t('选题方向 *', 'Topic *')}>
              <input
                className={inputCls}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('如：AI 编程避坑指南', 'e.g. AI coding pitfalls')}
              />
            </Field>
            <Field label={t('拟定标题', 'Planned title')}>
              <input
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('如：我踩过的 10 个 AI 编程大坑', 'e.g. 10 AI coding traps I fell into')}
              />
            </Field>
            <Field label={t('计划发布时间', 'Planned time')}>
              <input type="datetime-local" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Button type="submit" disabled={!canSubmit}>
              {mut.isPending ? t('评分中…', 'Scoring…') : t('开始评分', 'Score it')}
            </Button>
            {mut.isError && <p className="text-[12px] text-danger">{(mut.error as Error).message}</p>}
          </form>
        </Card>

        {/* 评分结果 */}
        <Card className="p-5">
          {!result && (
            <div className="flex h-full min-h-[220px] items-center justify-center text-[13px] text-ink-tertiary">
              {t('评分结果将显示在这里', 'Your score will appear here')}
            </div>
          )}
          {result && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-subtle">{t('命中评分', 'Hit score')}</span>
                <LevelBadge level={result.level} />
              </div>
              <div className="mono mt-2 flex items-baseline gap-1">
                <span className="text-[44px] font-medium leading-none" style={{ color: scoreColor(result.score) }}>
                  {result.score}
                </span>
                <span className="text-[16px] text-ink-tertiary">/ 100</span>
              </div>
              {mut.data && (
                <p className="mt-2 text-[12px] text-ink-tertiary">
                  {t(`基于 ${mut.data.basedOn.posts} 篇历史 · 基线命中率 ${Math.round(mut.data.basedOn.hitRate * 100)}%`,
                     `Based on ${mut.data.basedOn.posts} posts · baseline ${Math.round(mut.data.basedOn.hitRate * 100)}%`)}
                </p>
              )}
              <div className="mt-4 space-y-2 border-t border-hairline pt-4">
                <div className="text-[12px] font-medium text-ink-muted">{t('评分依据', 'Reasoning')}</div>
                <ul className="space-y-2">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-ink-muted">
                      <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] text-ink-muted">{label}</span>
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
