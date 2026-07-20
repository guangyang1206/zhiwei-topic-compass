// 知微 ZhiWei — 文档构建脚本 (可复用工作流)
// ----------------------------------------------------------------------------
// 把 Markdown 中间文件（方案书 / 命中复盘等）转成套用官网 doc 模板的 HTML，
// 视觉与全站统一（design.css + site.js 注入 nav/footer），自动生成侧边 TOC。
//
// 用法：node scripts/build-docs.mjs
// 依赖：marked（安装在 node workspace，运行时通过 NODE_PATH 注入）

import { marked } from '/Users/yangguang/.workbuddy/binaries/node/workspace/node_modules/marked/lib/marked.esm.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from '../functions/_lib/analytics.js';
import { SEED_POSTS } from '../data/seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = resolve(__dirname, '..');            // app/
const ROOT = resolve(APP, '..');                 // 项目根

/** 把 md 里的 h2/h3 抽出来做 TOC，并给对应标题注入 id（slug） */
function buildTocAndIds(tokens) {
  const toc = [];
  let n = 0;
  for (const tk of tokens) {
    if (tk.type === 'heading' && (tk.depth === 2 || tk.depth === 3)) {
      const id = 'sec-' + (++n);
      tk._id = id;
      toc.push({ id, depth: tk.depth, text: tk.text.replace(/<[^>]+>/g, '') });
    }
  }
  return toc;
}

/** 自定义 renderer：给 h2/h3 加 id */
function makeRenderer(headingIds) {
  const renderer = new marked.Renderer();
  let idx = 0;
  const orig = renderer.heading.bind(renderer);
  renderer.heading = function (text, level, raw) {
    if (level === 2 || level === 3) {
      const id = headingIds[idx++];
      return `<h${level} id="${id}">${text}</h${level}>\n`;
    }
    return orig(text, level, raw);
  };
  return renderer;
}

/** 内联并数据绿化架构图 SVG */
function loadArchSvg() {
  try {
    let svg = readFileSync(resolve(ROOT, 'docs/架构图_选题罗盘.svg'), 'utf8');
    // 统一到数据绿体系（原为蓝紫 #1a3b8b / #4a2f9e）
    svg = svg
      .replace(/#1a3b8b/gi, '#0F6E56')
      .replace(/#4a2f9e/gi, '#1D9E75')
      .replace(/#e8f0fb/gi, '#E1F5EE')
      .replace(/#c9d9f3/gi, '#9FE1CB')
      .replace(/#3b82f6/gi, '#1D9E75');
    return svg;
  } catch { return ''; }
}

const PAGE_TEMPLATE = ({ title, kicker, sub, meta, toc, body, lang }) => `<!DOCTYPE html>
<html lang="${lang || 'zh'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} · 知微 ZhiWei</title>
<meta name="description" content="${sub.replace(/"/g, '&quot;')}">
<link rel="stylesheet" href="assets/design.css">
</head>
<body>
<header id="nav"></header>

<section class="doc-hero">
  <div class="container">
    <div class="doc-kicker">${kicker}</div>
    <h1>${title}</h1>
    <p class="doc-sub">${sub}</p>
    <div class="doc-meta">${meta.map(m => `<span class="chip">${m}</span>`).join('')}</div>
  </div>
</section>

<div class="container doc-layout">
  <aside class="doc-toc">
    <div class="toc-title">目录 · Contents</div>
    <nav>
      ${toc.map(t => `<a class="lvl-${t.depth}" href="#${t.id}">${t.text}</a>`).join('\n      ')}
    </nav>
  </aside>
  <article class="doc-body">
${body}
  </article>
</div>

<footer id="footer"></footer>
<script src="assets/site.js"></script>
</body>
</html>`;

function build({ src, out, title, kicker, sub, meta, archInline, prepend, stripTail }) {
  let md = readFileSync(resolve(ROOT, src), 'utf8');
  // 去掉 md 里的一级标题（h1）——标题由 doc-hero 统一承载，避免重复
  md = md.replace(/^#\s+.*$/m, '').trimStart();
  if (stripTail) {
    // 去掉自动生成报告尾部的旧品牌签名行（避免出现「选题罗盘 TopicCompass」旧名）
    md = md.replace(/_生成时间[\s\S]*$/m, '').trimEnd();
  }
  // 全局统一旧品牌名 → 知微（源文件历史遗留）
  // 注意：先保护 markdown 图片/链接的 URL 目标（如 ./架构图_选题罗盘.svg），
  // 否则品牌替换会往文件名里塞进空格「知微 ZhiWei」导致路径失效、图片无法解析。
  const LINK_RE = /(!?\[[^\]]*\]\()([^)]+)(\))/g;
  const guards = [];
  md = md.replace(LINK_RE, (_m, open, url, close) => {
    guards.push(url);
    return `${open}\u0000${guards.length - 1}\u0000${close}`;
  });
  md = md.replace(/选题罗盘\s*(TopicCompass)?/g, '知微 ZhiWei').replace(/TopicCompass/g, 'ZhiWei');
  // 还原被保护的 URL（保持原始文件名不变）
  md = md.replace(/\u0000(\d+)\u0000/g, (_m, i) => guards[Number(i)]);
  const tokens = marked.lexer(md);
  const headingIds = buildTocAndIds(tokens);
  const toc = headingIds;
  const renderer = makeRenderer(headingIds.map(t => t.id));
  let body = marked.parser(tokens, { renderer });

  // 把 md 里引用的架构图 <img ...svg> 替换成内联 SVG（figure 包裹）
  if (archInline) {
    const svg = loadArchSvg();
    body = body.replace(/<img[^>]*架构图[^>]*>/i,
      `<figure class="doc-figure">${svg}<figcaption>知微 ZhiWei · 四层系统架构（应用层 / 智能层 / 数据层 / 自动化层）</figcaption></figure>`);
    body = body.replace(/<img[^>]*\.svg[^>]*>/i,
      `<figure class="doc-figure">${svg}<figcaption>知微 ZhiWei · 四层系统架构</figcaption></figure>`);
  }

  if (prepend) body = prepend + '\n' + body;

  const html = PAGE_TEMPLATE({ title, kicker, sub, meta, toc, body, lang: 'zh' });
  writeFileSync(resolve(APP, out), html, 'utf8');
  console.log(`[build] ${src} → app/${out}  (TOC ${toc.length} 项, ${html.length} bytes)`);
}

/** 命中复盘：用真实分析引擎输出一个数据可视化摘要区（置信度条 + 时段热力） */
function reviewDataSummary() {
  const m = analyze(SEED_POSTS);
  const pct = x => Math.round(x * 100) + '%';
  const kw = m.topKeywords.slice(0, 6);
  const maxConf = Math.max(...kw.map(k => k.confidence), 0.01);
  const kwBars = kw.map(k => {
    const w = Math.round((k.confidence / maxConf) * 100);
    const nBadge = k.count >= 3 ? '样本充足' : k.count === 2 ? '样本偏少' : '样本不足';
    const nCls = k.count >= 3 ? 'ok' : k.count === 2 ? 'arch' : 'road';
    return `<div class="kwc-row">
      <div class="kwc-key">${k.key}</div>
      <div class="kwc-track"><i style="width:${w}%"></i></div>
      <div class="kwc-meta">命中${pct(k.hitRate)} · 置信${pct(k.confidence)} · <span class="tag ${nCls}">n=${k.count} ${nBadge}</span></div>
    </div>`;
  }).join('\n');

  const times = [...m.byTime].sort((a, b) => b.hitRate - a.hitRate);
  const zhTime = b => ({ dawn: '凌晨', morning: '上午', noon: '午间', afternoon: '下午', evening: '晚间', night: '深夜' })[b] || b;
  const maxT = Math.max(...times.map(t => t.hitRate), 0.01);
  const timeBars = times.map(t => {
    const w = Math.max(3, Math.round((t.hitRate / maxT) * 100));
    return `<div class="kwc-row">
      <div class="kwc-key">${zhTime(t.key)}</div>
      <div class="kwc-track"><i class="hit" style="width:${w}%"></i></div>
      <div class="kwc-meta">${pct(t.hitRate)} · n=${t.count}</div>
    </div>`;
  }).join('\n');

  return `<div class="review-kpis" data-reveal-stagger>
    <div class="rk"><div class="rk-fig" data-count="${m.total}">0</div><div class="rk-lbl">历史发布篇数</div></div>
    <div class="rk"><div class="rk-fig" data-count="${m.hits}">0</div><div class="rk-lbl">爆款篇数（≥70分位）</div></div>
    <div class="rk"><div class="rk-fig accent" data-count="${Math.round(m.hitRate * 100)}"><span class="unit">%</span></div><div class="rk-lbl">整体命中率</div></div>
    <div class="rk"><div class="rk-fig" data-count="${m.avgScore}">0</div><div class="rk-lbl">平均互动分</div></div>
  </div>

  <div class="review-viz" data-reveal>
    <div class="rv-card">
      <h3 style="margin-top:0">高命中关键词 · 按置信度排序</h3>
      <p style="font-size:13.5px;color:var(--ink-subtle);margin:0 0 14px">采用 Wilson score 置信下界：样本越少、越向保守值收缩，避免「1 篇 100%」的偶然高命中误导选题。</p>
      ${kwBars}
    </div>
    <div class="rv-card">
      <h3 style="margin-top:0">发布时段命中率</h3>
      <p style="font-size:13.5px;color:var(--ink-subtle);margin:0 0 14px">晚间是绝对高地，深夜/午间为低效时段。</p>
      ${timeBars}
    </div>
  </div>`;
}

// ---- 构建清单 ----
build({
  src: 'docs/项目方案书_选题罗盘.md',
  out: 'proposal.html',
  title: '项目方案书',
  kicker: 'Project Proposal',
  sub: '数据驱动的选题命中系统 —— 面向个人创作者的选题命中与多平台发布分析。别人的工具帮你把内容写出来，知微帮你决定写什么最值得写。',
  meta: ['AI 黑客松 · 方向 B', '基于 WorkBuddy + EdgeOne Makers', '个人参赛'],
  archInline: true,
});

build({
  src: 'app/reports/latest-weekly-review.md',
  out: 'review.html',
  title: '命中率复盘周报',
  kicker: 'Weekly Hit-Rate Review',
  sub: '由 WorkBuddy Automation 每周自动生成 —— 从历史发布数据中提炼「有效模式」，用 Wilson 置信下界抑制小样本虚高，指导下周创作。这是「命中率复盘」Skill 的真实产出。',
  meta: ['自动化产出 · 每周一 09:00', '数据源：31 篇历史发布', '置信度加权'],
  prepend: reviewDataSummary(),
  stripTail: true,
});

console.log('\n完成。');
