import { useState } from 'react';
import { Post, PostInput } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Button } from './ui';

const inputCls =
  'w-full rounded-md border border-hairline-strong bg-canvas px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-accent';

const PLATFORMS = ['wechat', 'xiaohongshu', 'zhihu', 'bilibili', 'douyin', 'weibo'];

// 把 ISO 时间转成 <input type=datetime-local> 需要的本地格式 yyyy-MM-ddTHH:mm
function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function PostForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: Post | null;
  submitting?: boolean;
  onSubmit: (v: PostInput) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [platform, setPlatform] = useState(initial?.platform ?? 'wechat');
  const [publishedAt, setPublishedAt] = useState(toLocalInput(initial?.publishedAt) || toLocalInput(new Date().toISOString()));
  const [keywords, setKeywords] = useState((initial?.keywords ?? []).join(', '));
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [read, setRead] = useState(String(initial?.read ?? ''));
  const [like, setLike] = useState(String(initial?.like ?? ''));
  const [looking, setLooking] = useState(String(initial?.looking ?? ''));
  const [comment, setComment] = useState(String(initial?.comment ?? ''));
  const [share, setShare] = useState(String(initial?.share ?? ''));
  const [followGain, setFollowGain] = useState(String(initial?.followGain ?? ''));

  const canSubmit = topic.trim() && title.trim() && !submitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const num = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };
    onSubmit({
      id: initial?.id,
      topic: topic.trim(),
      title: title.trim(),
      platform,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      keywords,
      summary: summary.trim(),
      read: num(read),
      like: num(like),
      looking: num(looking),
      comment: num(comment),
      share: num(share),
      followGain: num(followGain),
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('选题方向 *', 'Topic *')}>
          <input className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder={t('如：AI 副业', 'e.g. AI side hustle')} />
        </Field>
        <Field label={t('平台', 'Platform')}>
          <select className={inputCls} value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </div>

      <Field label={t('标题 *', 'Title *')}>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={t('如：4个AI副业方向，我靠第2个月入过万', 'e.g. 4 AI side hustles that made me money')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('发布时间', 'Published at')}>
          <input type="datetime-local" className={inputCls} value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
        </Field>
        <Field label={t('关键词（逗号分隔）', 'Keywords (comma separated)')}>
          <input className={inputCls} value={keywords} onChange={(e) => setKeywords(e.target.value)}
            placeholder={t('AI, 副业, 变现', 'AI, side hustle')} />
        </Field>
      </div>

      <Field label={t('摘要', 'Summary')}>
        <textarea className={inputCls + ' min-h-[64px] resize-y'} value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder={t('一句话描述内容', 'One-line description')} />
      </Field>

      <div>
        <div className="mb-2 text-[12px] font-medium text-ink-muted">{t('互动数据', 'Engagement metrics')}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label={t('阅读', 'Reads')} value={read} onChange={setRead} />
          <NumField label={t('点赞', 'Likes')} value={like} onChange={setLike} />
          <NumField label={t('在看', 'Looking')} value={looking} onChange={setLooking} />
          <NumField label={t('评论', 'Comments')} value={comment} onChange={setComment} />
          <NumField label={t('转发', 'Shares')} value={share} onChange={setShare} />
          <NumField label={t('涨粉', 'Follows')} value={followGain} onChange={setFollowGain} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-hairline pt-4">
        <Button variant="ghost" onClick={onCancel}>{t('取消', 'Cancel')}</Button>
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? t('保存中…', 'Saving…') : initial ? t('保存修改', 'Save changes') : t('新增内容', 'Add content')}
        </Button>
      </div>
    </form>
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

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-ink-tertiary">{label}</span>
      <input type="number" min="0" className={inputCls + ' mono'} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder="0" />
    </label>
  );
}
