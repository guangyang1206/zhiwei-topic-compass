import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, LabelList,
} from 'recharts';
import { api, KeywordStat, TopicStat, TimeStat, StatsSummary, Post } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Card, StatCard, Drawer, LevelBadge, PageLoader, ErrorState } from '../components/ui';

const TIME_ZH: Record<string, string> = {
  dawn: '凌晨', morning: '上午', noon: '午间', afternoon: '下午', evening: '晚间', night: '深夜', unknown: '未知',
};
const TIME_EN: Record<string, string> = {
  dawn: 'Dawn', morning: 'Morning', noon: 'Noon', afternoon: 'Afternoon', evening: 'Evening', night: 'Night', unknown: 'N/A',
};

export default function Dashboard() {
  const { t, lang } = useI18n();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats });
  // 复用内容列表缓存作为详情抽屉数据源（Posts 页已预热此查询）
  const posts = useQuery({ queryKey: ['posts'], queryFn: api.posts });

  // 详情抽屉：当前钻取的选题
  const [drillTopic, setDrillTopic] = useState<string | null>(null);

  if (stats.isLoading) return <PageLoader text={t('加载实时数据…', 'Loading live data…')} />;
  if (stats.isError)
    return <ErrorState text={(stats.error as Error).message} onRetry={() => stats.refetch()} retryLabel={t('重试', 'Retry')} />;

  const s = stats.data!.summary;
  const byTopic = stats.data!.byTopic;
  const pct = (x: number) => Math.round(x * 100) + '%';

  const drillPosts = drillTopic
    ? (posts.data?.posts || []).filter((p) => p.topic === drillTopic)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-medium text-ink">{t('命中率看板', 'Hit-rate Dashboard')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t('数据驱动的选题命中分析', 'Data-driven topic hit analysis')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: health.data?.kv ? 'var(--accent)' : 'var(--danger)' }}
          />
          <span className="text-ink-subtle">
            {health.data?.kv
              ? t('实时数据 · EdgeOne KV', 'Live · EdgeOne KV')
              : t('KV 未连接', 'KV offline')}
          </span>
        </div>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t('历史发布', 'Total posts')} value={s.total} />
        <StatCard label={t('爆款命中', 'Hits')} value={s.hits} accent />
        <StatCard
          label={t('总体命中率', 'Hit rate')}
          value={pct(s.hitRate)}
          accent
          hint={t(`爆款阈值 热度≥${s.hitThreshold}`, `Threshold ≥${s.hitThreshold}`)}
        />
        <StatCard label={t('平均热度', 'Avg engagement')} value={s.avgScore} />
      </div>

      {/* 关键词命中率（按 Wilson 置信度排序）*/}
      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-ink">
            {t('高命中关键词', 'Top keywords by confidence')}
          </h2>
          <span className="text-[12px] text-ink-tertiary">
            {t('按 Wilson 置信下界排序（小样本自动打折）', 'Ranked by Wilson lower bound')}
          </span>
        </div>
        <KeywordChart data={s.topKeywords.slice(0, 8)} lang={lang} />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 时段命中率 */}
        <Card className="p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[15px] font-medium text-ink">
              {t('发布时段命中率', 'Hit rate by time slot')}
            </h2>
            <span className="text-[11px] text-ink-tertiary">
              {t('浅柱=发布量 · 绿柱=命中率', 'light=volume · green=hit rate')}
            </span>
          </div>
          <TimeChart data={s.byTime} lang={lang} />
        </Card>

        {/* 标题模式命中率 */}
        <Card className="p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[15px] font-medium text-ink">
              {t('标题模式命中率', 'Hit rate by title pattern')}
            </h2>
            <span className="text-[11px] text-ink-tertiary">
              {t('哪种标题写法更易爆', 'which style hits more')}
            </span>
          </div>
          <TitlePatternChart data={s.byTitle} baseline={s.hitRate} lang={lang} t={t} />
        </Card>
      </div>

      {/* 选题排名表（可点击钻取详情） */}
      <Card className="p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-medium text-ink">{t('选题命中排名', 'Topic ranking')}</h2>
          <span className="text-[11px] text-ink-tertiary">{t('点击行查看内容明细', 'click a row for details')}</span>
        </div>
        <TopicTable data={byTopic} t={t} pct={pct} onPick={setDrillTopic} />
      </Card>

      {/* 内容详情抽屉 */}
      <Drawer
        open={!!drillTopic}
        onClose={() => setDrillTopic(null)}
        title={drillTopic || ''}
        subtitle={t(`${drillPosts.length} 篇历史内容`, `${drillPosts.length} posts`)}
        width={460}
      >
        <TopicDetail posts={drillPosts} loading={posts.isLoading} lang={lang} t={t} threshold={s.hitThreshold} />
      </Drawer>
    </div>
  );
}

function KeywordChart({ data, lang }: { data: KeywordStat[]; lang: string }) {
  const rows = data.map((d) => ({
    name: d.key,
    confidence: Math.round(d.confidence * 100),
    hitRate: Math.round(d.hitRate * 100),
    count: d.count,
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={72}
          tick={{ fontSize: 12, fill: 'var(--ink-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)' }}
          contentStyle={tooltipStyle}
          formatter={(v: number, n: string) => [
            n === 'confidence' ? v + '%' : v + '%',
            n === 'confidence' ? (lang === 'zh' ? '置信下界' : 'Confidence') : lang === 'zh' ? '裸命中率' : 'Raw rate',
          ]}
        />
        <Bar dataKey="confidence" radius={[0, 4, 4, 0]} barSize={16}>
          {rows.map((_, i) => (
            <Cell key={i} fill="var(--accent)" />
          ))}
          <LabelList dataKey="confidence" position="right" formatter={(v: number) => v + '%'} style={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 时段固定按一天的时序排列，保证坐标轴语义正确、缺失时段也占位
const TIME_ORDER = ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night'];

function TimeChart({ data, lang }: { data: TimeStat[]; lang: string }) {
  const map = lang === 'zh' ? TIME_ZH : TIME_EN;
  const byKey = new Map(data.map((d) => [d.key, d]));
  // 以固定时序补全所有时段（含 count=0 的空档），命中率归一化到「篇数背景」上
  const rows = TIME_ORDER.map((key) => {
    const d = byKey.get(key);
    return {
      name: map[key] || key,
      rate: d ? Math.round(d.hitRate * 100) : 0,
      count: d ? d.count : 0,
    };
  });
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={rows} margin={{ left: -18, right: 12, top: 20, bottom: 4 }} barGap={0} barCategoryGap="28%">
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--ink-muted)' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--ink-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v + '%'} />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)' }}
          contentStyle={tooltipStyle}
          formatter={(v: number, n: string) =>
            n === 'volume'
              ? [Math.round((v / 100) * maxCount) + (lang === 'zh' ? ' 篇' : ' posts'), lang === 'zh' ? '发布量' : 'Volume']
              : [v + '%', lang === 'zh' ? '命中率' : 'Hit rate']
          }
        />
        {/* 背景柱：发布量占比（浅色），提供「这个时段发了多少」的语境 */}
        <Bar dataKey={(r: { count: number }) => Math.round((r.count / maxCount) * 100)} name="volume" radius={[4, 4, 0, 0]} barSize={30} fill="var(--surface-3)" isAnimationActive={false} />
        {/* 前景柱：命中率（品牌绿），叠在背景柱之上 */}
        <Bar dataKey="rate" name="rate" radius={[4, 4, 0, 0]} barSize={30}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.rate >= 40 ? 'var(--accent)' : r.rate > 0 ? 'var(--accent-weak)' : 'transparent'} />
          ))}
          <LabelList
            dataKey="rate"
            position="top"
            formatter={(v: number) => (v > 0 ? v + '%' : '')}
            style={{ fontSize: 11, fill: 'var(--ink-muted)', fontWeight: 500 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 标题特征的中英文标签与解释
const TITLE_FEATURES: { key: keyof StatsSummary['byTitle']; zh: string; en: string; tipZh: string; tipEn: string }[] = [
  { key: 'hasNumber', zh: '含数字', en: 'Number', tipZh: '如「3个技巧」', tipEn: 'e.g. "3 tips"' },
  { key: 'hasQuestion', zh: '设问式', en: 'Question', tipZh: '带「?」制造悬念', tipEn: 'with "?"' },
  { key: 'hasColon', zh: '冒号分层', en: 'Colon', tipZh: '「主标题：副标题」', tipEn: '"Main: sub"' },
  { key: 'hasPain', zh: '痛点/干货', en: 'Pain/Value', tipZh: '避坑·复盘·保姆级', tipEn: 'pitfalls · guide' },
];

function TitlePatternChart({
  data, baseline, lang, t,
}: {
  data: StatsSummary['byTitle'];
  baseline: number;
  lang: string;
  t: (z: string, e: string) => string;
}) {
  const rows = TITLE_FEATURES.map((f) => {
    const d = data?.[f.key];
    return {
      name: lang === 'zh' ? f.zh : f.en,
      tip: lang === 'zh' ? f.tipZh : f.tipEn,
      rate: d ? Math.round(d.hitRate * 100) : 0,
      count: d ? d.count : 0,
    };
  });
  const base = Math.round(baseline * 100);

  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 52, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={72}
          tick={{ fontSize: 12, fill: 'var(--ink-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)' }}
          contentStyle={tooltipStyle}
          formatter={(v: number, _n: string, p: { payload?: { count: number } }) => [
            v + '%' + (p?.payload ? (lang === 'zh' ? ` · ${p.payload.count} 篇` : ` · ${p.payload.count} posts`) : ''),
            lang === 'zh' ? '命中率' : 'Hit rate',
          ]}
        />
        {/* 命中率 ≥ 整体基准 → 品牌绿高亮，否则灰色（一眼看出哪种写法加分） */}
        <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={18}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.rate >= base ? 'var(--accent)' : 'var(--surface-3)'} />
          ))}
          <LabelList
            dataKey="rate"
            position="right"
            formatter={(v: number) => v + '%'}
            style={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopicTable({
  data, t, pct, onPick,
}: {
  data: TopicStat[];
  t: (z: string, e: string) => string;
  pct: (x: number) => string;
  onPick: (topic: string) => void;
}) {
  return (
    <div className="overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-hairline text-left text-[12px] text-ink-tertiary">
            <th className="pb-2 font-normal">{t('选题', 'Topic')}</th>
            <th className="pb-2 text-right font-normal">{t('篇数', 'N')}</th>
            <th className="pb-2 text-right font-normal">{t('命中率', 'Rate')}</th>
            <th className="pb-2 text-right font-normal">{t('平均热度', 'Avg')}</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 8).map((r) => (
            <tr
              key={r.topic}
              onClick={() => onPick(r.topic)}
              className="cursor-pointer border-b border-hairline/60 transition-colors hover:bg-surface-2"
            >
              <td className="py-2 text-ink">
                <span className="inline-flex items-center gap-1.5">
                  {r.topic}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-tertiary opacity-0 transition-opacity group-hover:opacity-100"><path d="M9 18l6-6-6-6" /></svg>
                </span>
              </td>
              <td className="py-2 text-right text-ink-subtle mono">{r.count}</td>
              <td className="py-2 text-right mono" style={{ color: r.hitRate >= 0.4 ? 'var(--accent)' : 'var(--ink-subtle)' }}>
                {pct(r.hitRate)}
              </td>
              <td className="py-2 text-right text-ink-subtle mono">{r.avgScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 抽屉内的选题详情：文章明细列表
function TopicDetail({
  posts, loading, lang, t, threshold,
}: {
  posts: Post[];
  loading: boolean;
  lang: string;
  t: (z: string, e: string) => string;
  threshold: number;
}) {
  if (loading) return <div className="py-10 text-center text-[13px] text-ink-subtle">{t('加载中…', 'Loading…')}</div>;
  if (!posts.length)
    return <div className="py-10 text-center text-[13px] text-ink-tertiary">{t('暂无该选题的内容', 'No posts for this topic')}</div>;

  const sorted = [...posts].sort((a, b) => (b.engagement || 0) - (a.engagement || 0));
  const hits = sorted.filter((p) => (p.engagement || 0) >= threshold).length;
  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="space-y-4">
      {/* 小结条 */}
      <div className="flex items-center gap-4 rounded-md bg-surface-2 px-3 py-2.5 text-[12px]">
        <span className="text-ink-subtle">{t('命中', 'Hits')} <b className="text-accent mono">{hits}</b>/{sorted.length}</span>
        <span className="text-ink-subtle">
          {t('平均热度', 'Avg')} <b className="mono text-ink">{Math.round(sorted.reduce((a, p) => a + (p.engagement || 0), 0) / sorted.length)}</b>
        </span>
      </div>

      {/* 文章明细 */}
      <ul className="space-y-2.5">
        {sorted.map((p) => {
          const hit = (p.engagement || 0) >= threshold;
          return (
            <li key={p.id} className="rounded-lg border border-hairline px-3.5 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] leading-snug text-ink">{p.title}</p>
                {hit && <LevelBadge level={t('爆', 'Hit')} />}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-tertiary">
                <span>{p.platform || '—'}</span>
                <span>{fmtDate(p.publishedAt)}</span>
                <span className="mono">{t('热度', 'Eng')} {p.engagement ?? 0}</span>
                <span className="mono">{t('阅读', 'Read')} {p.read ?? 0}</span>
              </div>
              {p.keywords?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.keywords.slice(0, 4).map((k) => (
                    <span key={k} className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-subtle">{k}</span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const tooltipStyle = {
  background: 'var(--canvas)',
  border: '1px solid var(--hairline-strong)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--ink)',
};
