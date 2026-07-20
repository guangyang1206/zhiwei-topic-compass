// 选题罗盘 · Automation 执行体
// ----------------------------------------------------------------------------
// 两个定时任务共用这一个脚本：
//   node scripts/generate-reports.mjs daily    → 生成「每日选题简报」
//   node scripts/generate-reports.mjs weekly   → 生成「每周命中率复盘」
//   node scripts/generate-reports.mjs all       → 两份都生成（默认）
//
// 设计要点：
//   · 不依赖线上 KV / 不需要起 dev-server —— 直接复用本地分析引擎 + 数据，
//     保证定时任务稳定可跑（KV 就绪后可无缝切换数据源）。
//   · 数据源优先级：回流数据 data/posts.json（若存在）> 种子数据 seed.mjs。
//   · 输出到 reports/，文件名带日期，答辩时即「系统自动产出的物料」。

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analyze, scoreCandidates } from '../functions/_lib/analytics.js';
import { SEED_POSTS } from '../data/seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, '..');
const REPORTS_DIR = join(APP_DIR, 'reports');
const POSTS_JSON = join(APP_DIR, 'data', 'posts.json');

// ---- 候选选题池（模拟「选题雷达」抓取热点后产出的候选清单） ----
// 真实场景由 topic-radar Skill 产出；这里内置一批贴近账号定位的候选，保证可跑。
const CANDIDATE_POOL = [
  { topic: 'AI工具实操：5个提示词技巧', keywords: ['AI工具', '提示词', '避坑'], plannedTitle: '5个提示词技巧，第3个直接封神' },
  { topic: '避坑复盘：我用AI踩过的坑', keywords: ['避坑', 'AI工具', '复盘'], plannedTitle: '别再这样用AI了，这4个坑我替你踩过' },
  { topic: '爆款标题拆解', keywords: ['标题', '爆款', '内容创作'], plannedTitle: '爆款标题的6个套路，学会随手10万+' },
  { topic: 'AI副业方向盘点', keywords: ['AI工具', '副业'], plannedTitle: '4个AI副业方向，第2个我月入过万' },
  { topic: '效率工作流搭建', keywords: ['效率', '自动化', '工作流'], plannedTitle: '手把手搭一个自动写作工作流（附模板）' },
  { topic: 'AI行业趋势观察', keywords: ['AI行业', '趋势'], plannedTitle: '关于AI行业的一些看法' },
  { topic: '深夜随笔：聊聊心情', keywords: ['随笔', '情绪'], plannedTitle: '深夜emo，随便写写' },
  { topic: '周末生活记录', keywords: ['随笔', '生活'], plannedTitle: '记录一下今天的生活' },
];

// 每日给候选加一个「合理的晚间发布时间」（评分官会用到时段维度）
function withPlannedTime(candidates, baseDate) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + 1); // 面向「明天」的发布建议
  d.setHours(20, 30, 0, 0);   // 晚间黄金时段
  const iso = toLocalISO(d);
  return candidates.map(c => ({ ...c, plannedTime: iso }));
}

async function loadPosts() {
  if (existsSync(POSTS_JSON)) {
    try {
      const raw = await readFile(POSTS_JSON, 'utf8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return { posts: arr, source: '回流数据 data/posts.json' };
    } catch { /* fallthrough */ }
  }
  return { posts: SEED_POSTS, source: '种子数据 seed.mjs（KV 就绪后自动切换为线上回流数据）' };
}

function toLocalISO(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+08:00`;
}
function fmtDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function zhTime(b) {
  return ({ dawn: '凌晨', morning: '上午', noon: '午间', afternoon: '下午', evening: '晚间', night: '深夜', unknown: '未知' })[b] || b;
}
const LEVEL_BADGE = { '强推': '🟢 强推', '可做': '🔵 可做', '谨慎': '🟡 谨慎', '不建议': '⚪ 不建议' };

// ---- 每日选题简报 ----
function buildDailyReport(model, scores, source, now) {
  const top = scores.slice(0, 3);
  const dateStr = fmtDate(now);
  const lines = [];
  lines.push(`# 📮 每日选题简报 · ${dateStr}`);
  lines.push('');
  lines.push('> 由「选题罗盘」自动生成 —— 基于你自己的历史发布数据，为明天的选题给出命中分与拟标题。');
  lines.push('');
  lines.push(`**数据源**：${source}　|　**历史命中率基线**：${pct(model.hitRate)}（阈值 ${model.hitThreshold} 分）`);
  lines.push('');
  lines.push('## 🎯 今日 Top 3 推荐选题');
  lines.push('');
  top.forEach((s, i) => {
    lines.push(`### ${i + 1}. ${LEVEL_BADGE[s.level] || s.level}　${s.score} 分 · ${s.topic}`);
    lines.push(`- **拟定标题**：${scoreTitle(s)}`);
    lines.push(`- **命中理由**：`);
    s.reasons.forEach(r => lines.push(`  - ${r}`));
    lines.push('');
  });
  lines.push('## 📊 其余候选一览');
  lines.push('');
  lines.push('| 选题 | 分数 | 判定 |');
  lines.push('|---|---|---|');
  scores.slice(3).forEach(s => lines.push(`| ${s.topic} | ${s.score} | ${s.level} |`));
  lines.push('');
  lines.push('---');
  lines.push('💡 **行动建议**：优先做 Top1，晚间（18–22 点）发布；避免深夜/情绪类无干货选题。');
  lines.push('');
  lines.push(`_生成时间：${now.toLocaleString('zh-CN')}　·　选题罗盘 TopicCompass_`);
  return lines.join('\n');
}

function scoreTitle(s) {
  // 从候选池找回原始拟标题（scoreCandidates 未透传 plannedTitle）
  const c = CANDIDATE_POOL.find(x => x.topic === s.topic);
  return c && c.plannedTitle ? c.plannedTitle : '（建议补充标题）';
}

// ---- 每周命中率复盘 ----
function buildWeeklyReport(model, source, now) {
  const dateStr = fmtDate(now);
  const lines = [];
  lines.push(`# 📈 每周命中率复盘 · ${dateStr}`);
  lines.push('');
  lines.push('> 由「选题罗盘」自动生成 —— 从历史发布数据中提炼「有效模式」，指导下周创作。');
  lines.push('');
  lines.push(`**数据源**：${source}`);
  lines.push('');
  lines.push('## 一、总览');
  lines.push('');
  lines.push('| 指标 | 数值 |');
  lines.push('|---|---|');
  lines.push(`| 历史发布篇数 | ${model.total} |`);
  lines.push(`| 爆款篇数（≥70分位） | ${model.hits} |`);
  lines.push(`| **命中率** | **${pct(model.hitRate)}** |`);
  lines.push(`| 爆款阈值 | ${model.hitThreshold} 分 |`);
  lines.push(`| 平均互动分 | ${model.avgScore} |`);
  lines.push('');

  lines.push('## 二、高命中关键词 Top（选题往这些方向靠）');
  lines.push('');
  lines.push('> 按「置信度」排序：命中率 × 样本量权重，避免只出现一次的偶然高命中词误导决策。');
  lines.push('');
  lines.push('| 关键词 | 命中率 | 样本数 | 平均分 | 置信度 |');
  lines.push('|---|---|---|---|---|');
  const rankedKw = rankByConfidence(model.topKeywords);
  rankedKw.slice(0, 8).forEach(k => {
    lines.push(`| ${k.key} | ${pct(k.hitRate)} | ${k.count} | ${k.avgScore} | ${confBadge(k.count)} |`);
  });
  lines.push('');

  lines.push('## 三、发布时段规律');
  lines.push('');
  lines.push('| 时段 | 命中率 | 样本数 |');
  lines.push('|---|---|---|');
  [...model.byTime].sort((a, b) => b.hitRate - a.hitRate).forEach(t => {
    lines.push(`| ${zhTime(t.key)} | ${pct(t.hitRate)} | ${t.count} |`);
  });
  lines.push('');

  lines.push('## 四、标题特征规律');
  lines.push('');
  const tf = model.byTitle || {};
  const tfName = { hasNumber: '含数字', hasQuestion: '含疑问', hasColon: '含冒号', hasPain: '含痛点/情绪词' };
  lines.push('| 标题特征 | 命中率 | 样本数 |');
  lines.push('|---|---|---|');
  Object.entries(tf).forEach(([k, v]) => {
    lines.push(`| ${tfName[k] || k} | ${pct(v.hitRate)} | ${v.count} |`);
  });
  lines.push('');

  lines.push('## 五、下周行动建议（系统自动提炼）');
  lines.push('');
  const topKw = rankByConfidence(model.topKeywords).slice(0, 3).map(k => k.key).join('、');
  const bestTime = [...model.byTime].sort((a, b) => b.hitRate - a.hitRate)[0];
  const painRate = tf.hasPain ? pct(tf.hasPain.hitRate) : '—';
  const numRate = tf.hasNumber ? pct(tf.hasNumber.hitRate) : '—';
  lines.push(`1. **选题方向**：向高命中关键词靠拢 —— ${topKw}。`);
  if (bestTime) lines.push(`2. **发布时段**：优先「${zhTime(bestTime.key)}」（命中率 ${pct(bestTime.hitRate)}），避开表现差的时段。`);
  lines.push(`3. **标题打法**：带数字标题命中率 ${numRate}、带痛点/情绪词命中率 ${painRate}，可组合使用。`);
  lines.push('4. **减法**：泛泛而谈 / 情绪碎碎念 / 无干货蹭热点类选题命中率低，本周应减少。');
  lines.push('');
  lines.push('---');
  lines.push(`_生成时间：${now.toLocaleString('zh-CN')}　·　选题罗盘 TopicCompass_`);
  return lines.join('\n');
}

function pct(x) { return Math.round(x * 100) + '%'; }

// 置信度加权：命中率 × log 样本量因子 —— 让高样本关键词更靠前，
// 避免「只出现 1 次的 100% 命中词」误导选题决策（数据严谨性）。
// 统一采用引擎输出的 Wilson score 置信下界（analyze() 已计算 k.confidence），
// 与打分引擎、Dashboard 同源，保证全站置信度口径一致。
function rankByConfidence(keywords) {
  return [...keywords]
    .map(k => ({ ...k, _conf: k.confidence != null ? k.confidence : k.hitRate * Math.log2(k.count + 1) }))
    .sort((a, b) => b._conf - a._conf || b.avgScore - a.avgScore);
}
function confBadge(count) {
  if (count >= 3) return '★★★';
  if (count === 2) return '★★☆';
  return '★☆☆';
}

async function main() {
  const mode = (process.argv[2] || 'all').toLowerCase();
  const now = new Date();
  await mkdir(REPORTS_DIR, { recursive: true });

  const { posts, source } = await loadPosts();
  const model = analyze(posts);

  const outputs = [];

  if (mode === 'daily' || mode === 'all') {
    const candidates = withPlannedTime(CANDIDATE_POOL, now);
    const scores = scoreCandidates(candidates, model);
    const md = buildDailyReport(model, scores, source, now);
    const file = join(REPORTS_DIR, `daily-brief-${fmtDate(now)}.md`);
    await writeFile(file, md, 'utf8');
    await writeFile(join(REPORTS_DIR, 'latest-daily-brief.md'), md, 'utf8');
    outputs.push(file);
    console.log(`[daily] 已生成每日选题简报 → ${file}`);
    console.log(`        Top1: ${scores[0].score}分 · ${scores[0].topic}`);
  }

  if (mode === 'weekly' || mode === 'all') {
    const md = buildWeeklyReport(model, source, now);
    const file = join(REPORTS_DIR, `weekly-review-${fmtDate(now)}.md`);
    await writeFile(file, md, 'utf8');
    await writeFile(join(REPORTS_DIR, 'latest-weekly-review.md'), md, 'utf8');
    outputs.push(file);
    console.log(`[weekly] 已生成每周命中率复盘 → ${file}`);
    console.log(`         命中率 ${pct(model.hitRate)} · ${model.total} 篇 · Top关键词 ${rankByConfidence(model.topKeywords).slice(0,3).map(k=>k.key).join('、')}`);
  }

  console.log(`\n完成，共生成 ${outputs.length} 份报告。`);
}

main().catch(e => { console.error('生成失败：', e); process.exit(1); });
