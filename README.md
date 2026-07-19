<div align="center">

# 知微 · ZhiWei

**数据驱动的选题命中与多平台发布分析 SaaS**
*Data-driven topic hit-rate & multi-platform publishing analytics*

[![Live](https://img.shields.io/badge/live-topic.yeranyang.com-1D9E75)](https://topic.yeranyang.com)
[![Platform](https://img.shields.io/badge/platform-EdgeOne%20Makers-635bff)](https://edgeone.ai)
[![Powered by](https://img.shields.io/badge/powered%20by-WorkBuddy-5e6ad2)](https://codebuddy.ai)
[![License](https://img.shields.io/badge/license-MIT-888)](./LICENSE)

[官网 Website](https://topic.yeranyang.com) · [实时看板 Dashboard](https://topic.yeranyang.com/dashboard) · [文档 Docs](https://topic.yeranyang.com/docs)

</div>

---

## 这是什么 / What is it

知微（ZhiWei）帮助内容创作者和品牌市场团队回答一个核心问题：**下一篇内容，写什么、什么时候发、发到哪个平台，命中率最高？**

它不靠"感觉"，而是把历史内容的真实表现（阅读、互动、命中与否）沉淀成数据，用一个可解释的评分引擎，为每个候选选题给出**命中概率评分 + 最佳发布时段 + 关键词置信度 + 多平台改写建议**。

ZhiWei answers one question for creators and brand teams: **what to write next, when to publish, and on which platform — for the highest hit-rate.** It turns your historical content performance into an explainable scoring engine, no guesswork.

## 四层架构 / Four-layer architecture

| 层 Layer | 内容 |
|---|---|
| 应用层 Application | 双语 SaaS 官网 + 实时选题看板（本仓库 `app/`） |
| 数据层 Data | 存储抽象层（EdgeOne KV / 本地文件降级）+ 纯函数分析引擎 |
| 智能层 Intelligence | WorkBuddy Expert（选题评分官）+ 3 个 Skills |
| 自动化层 Automation | 定时生成每日选题简报 / 每周复盘 |

## 能力边界（诚实标注）/ Capability boundaries

我们坚持 **"清楚知道边界、架构已预留"**，而非"假装全都真实"：

- ✅ **已跑通 Live**：选题评分引擎、国内内容表现分析、多平台改写逻辑、双语官网、自动化报告。
- 🔧 **架构已预留 Architected**：多数据源接入抽象层（海外社媒 X / LinkedIn / YouTube）。
- 🗺️ **Roadmap**：海外真实舆情抓取管线、企业品牌内容中台多租户。

## 快速开始 / Quick start

```bash
cd app
npm install          # 安装 EdgeOne CLI 等依赖
npm run dev          # 本地开发（含目录路由 + 本地 KV 降级）
npm run deploy       # 部署到 EdgeOne Makers
```

## 目录结构 / Structure

```
app/                 EdgeOne Makers 部署根
├─ index.html        首页 Landing
├─ dashboard.html    实时选题看板
├─ product.html      产品能力详解
├─ solution.html     解决方案（个人创作者 / 品牌市场）
├─ docs.html         文档
├─ blog.html         Blog
├─ resources.html    资源下载
├─ about.html        关于 & 开源
├─ assets/           设计系统 CSS + i18n 双语 + 站点 JS
├─ functions/        EdgeOne 边缘函数（API）
└─ data/             种子数据
docs/                方案书、架构图等交付物
```

## 技术栈 / Tech stack

原生多页 HTML + 轻量 JS · EdgeOne Makers 边缘 Serverless · Edge KV · i18n JSON 双语 · Chart 可视化。零重框架，边缘直推，加载最快。

## License

MIT © 2026 [guangyang1206](https://github.com/guangyang1206)
