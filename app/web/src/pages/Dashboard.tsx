import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, LabelList,
} from 'recharts';
import { api, KeywordStat, TopicStat, TimeStat } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Card, StatCard } from '../components/ui';

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

  if (stats.isLoading) return <Loading text={t('加载实时数据…', 'Loading live data…')} />;
  if (stats.isError)
    return <ErrorBox text={(stats.error as Error).message} retry={() => stats.refetch()} t={t} />;

  const s = stats.data!.summary;
  const byTopic = stats.data!.byTopic;
  const pct = (x: number) => Math.round(x * 100) + '%';

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

        {/* 选题排名表 */}
        <Card className="p-5">
          <h2 className="mb-3 text-[15px] font-medium text-ink">{t('选题命中排名', 'Topic ranking')}</h2>
          <TopicTable data={byTopic} t={t} pct={pct} />
        </Card>
      </div>
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

function TopicTable({ data, t, pct }: { data: TopicStat[]; t: (z: string, e: string) => string; pct: (x: number) => string }) {
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
            <tr key={r.topic} className="border-b border-hairline/60">
              <td className="py-2 text-ink">{r.topic}</td>
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

const tooltipStyle = {
  background: 'var(--canvas)',
  border: '1px solid var(--hairline-strong)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--ink)',
};

function Loading({ text }: { text: string }) {
  return <div className="py-20 text-center text-[13px] text-ink-subtle">{text}</div>;
}
function ErrorBox({ text, retry, t }: { text: string; retry: () => void; t: (z: string, e: string) => string }) {
  return (
    <div className="py-20 text-center">
      <p className="text-[13px] text-danger">{text}</p>
      <button onClick={retry} className="mt-3 text-[13px] text-accent underline">
        {t('重试', 'Retry')}
      </button>
    </div>
  );
}
