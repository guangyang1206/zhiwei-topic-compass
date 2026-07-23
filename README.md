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
| 应用层 Application | 双语 SaaS 前端（Vite + React + TS）：命中率看板 / 批量选题评分 / 发布记录 CRUD / 交互式 API 文档（`app/web/`） |
| 数据层 Data | EdgeOne Edge Functions（7 个 API 端点）+ 存储抽象层（EdgeOne KV / 本地文件降级）+ 纯函数分析引擎（Wilson 置信度评分） |
| 智能层 Intelligence | WorkBuddy Expert（选题评分官）+ 3 个 Skills |
| 自动化层 Automation | 定时生成每日选题简报 / 每周复盘 |

> 当前版本 **0.2.0**：已从静态多页 HTML 演示升级为真·SaaS 前后端架构（React SPA + 边缘 Serverless API + KV 存储 + OpenAPI 文档）。

## 能力边界（诚实标注）/ Capability boundaries

我们坚持 **"清楚知道边界、架构已预留"**，而非"假装全都真实"：

- ✅ **已跑通 Live**：选题评分引擎、国内内容表现分析、多平台改写逻辑、双语官网、自动化报告。
- 🔧 **架构已预留 Architected**：多数据源接入抽象层（海外社媒 X / LinkedIn / YouTube）。
- 🗺️ **Roadmap**：海外真实舆情抓取管线、企业品牌内容中台多租户。

## 核心能力 / Core features

- **命中率看板 Dashboard**：整体命中率 / 高置信关键词（Wilson 下界排序）/ 时段命中规律 / **标题模式命中率对比**（数字·设问·冒号·痛点）/ 选题排名，点击选题行可**钻取抽屉**看该选题下每篇明细。
- **批量选题评分 Score**：一次为多个候选选题打命中分（0-100），每个结果给出**评分构成拆解**（基础 40 + 关键词 / 时段 / 标题四维度贡献的堆叠条）+ 命中理由 + 可执行发布建议。
- **发布记录 CRUD**：新增 / 编辑 / 删除历史发布记录，热度分（engagement）自动计算，写入后看板与列表实时联动。
- **交互式 API 文档**：手写维护的 OpenAPI 3.0.3 单一真源 + 品牌化 Swagger UI（`/api/docs`）。端点契约、数据模型与评分算法详见 [API 与数据模型](./docs/工程/API与数据模型.md)。

## 快速开始 / Quick start

需要两个进程：边缘函数 dev-server（提供 `/api`）+ Vite 前端（自动代理 `/api` 到 dev-server）。

```bash
cd app
npm install               # 安装前端工作区依赖

# 终端 A：启动本地边缘函数（含目录路由 + 本地 KV 降级），监听 :8788
npm run dev

# 终端 B：启动前端（Vite，:5173，/api 已代理到 :8788）
npm run dev:web
```

打开 http://localhost:5173 即可。首次本地无数据时，可用种子：`node data/seed.mjs`（或访问受令牌保护的 `/api/admin/seed`）。

**贡献者**：本仓库用 `develop` 作为集成/预览主干，并配有两段敏感信息扫描钩子（`pre-commit` 提交前 + `pre-push` 推送前）。clone 后请先启用一次（钩子随仓库分发，Git 出于安全不会自动启用）：

```bash
git config core.hooksPath .githooks && chmod +x .githooks/*
```

发布前请逐项核对 [发布前合规自查清单](./docs/工程/分支模型与安全钩子.md#四发布前合规自查清单对齐腾讯规范)（凭据 / 公司内部信息 / 个人路径 / PII / 依赖可复现）。

详见 [分支模型与安全钩子](./docs/工程/分支模型与安全钩子.md)。

部署：本仓库已关联 GitHub。`main` → **生产**（`topic.yeranyang.com`）；其余任何分支（含 `develop`）push 后 EdgeOne 自动构建**预览环境**。项目根目录 = `app`，构建走 `edgeone.json`（`npm run build` → Vite 产物到 `dist/` + 复制 `functions/` 进 `dist/functions/`）。
> 集成过程中踩过的坑与多环境模型见 [EdgeOne 部署排障复盘](./docs/工程/EdgeOne部署排障复盘.md)。

## 目录结构 / Structure

```
app/                      EdgeOne Pages 部署根（控制台 Root Directory = app）
├─ edgeone.json           构建配置（install/build 命令、outputDir、Node 版本）
├─ package.json           workspaces=["web"]，聚合前端 + 本地 dev 脚本
├─ dev-server.mjs         本地边缘函数模拟（目录路由 + 注入本地 KV）
├─ web/                   前端应用（Vite + React + TS）
│  ├─ src/pages/          Dashboard / Score / Posts / ApiDocs（React.lazy 路由分包）
│  ├─ src/components/     TopBar / PostForm / ui（Card/Drawer/Modal/状态组件…）
│  ├─ src/lib/            api.ts（类型 + 客户端）、i18n.tsx（中英双语）
│  ├─ vite.config.ts      dev :5173，/api 代理到 :8788；产物输出 ../dist
│  └─ index.html          SPA 入口 + SEO/Open Graph meta + favicon
├─ functions/             EdgeOne Edge Functions（API）
│  ├─ api/                health / stats / posts / score / admin/seed / docs / openapi.json
│  └─ _lib/               store（存储抽象）/ analytics（评分引擎）/ http / openapi / seed-data
├─ scripts/               copy-functions / build-docs / generate-reports
├─ data/                  种子数据（seed.mjs）与本地 KV 落地（kv.json）
└─ reports/               Automation 产出（每日简报 / 每周复盘）
docs/                     方案书、提交材料、封面/架构图等交付物
└─ 工程/                  工程文档（API与数据模型 / 部署排障复盘 / 分支模型与安全钩子）
.githooks/                pre-commit（提交前）+ pre-push（推送前）敏感信息扫描钩子
```

> 注：`app/` 根目录下另有一套旧的静态多页 HTML（`index.html`、`dashboard.html` 等，由 `scripts/build-docs.mjs` 从 Markdown 生成），是 0.1 演示期产物；**当前主线是 `web/` 下的 React SPA**。

## 技术栈 / Tech stack

- **前端**：Vite 6 · React 18 · TypeScript（strict）· react-router-dom（路由分包）· TanStack Query（数据/缓存）· Recharts（可视化）· Tailwind CSS（CSS 变量设计系统 + 明暗主题）· 中英双语。
- **后端**：EdgeOne Pages Edge Functions（V8 边缘 Serverless，无 npm 依赖）· 目录式路由 · Edge KV（本地文件降级）· 纯函数分析引擎（Wilson 置信度）。
- **文档**：手写 OpenAPI 3.0.3 单一真源 + 品牌化 Swagger UI。
- **工程**：GitHub → EdgeOne 多环境自动部署（main=生产 / 其余=预览）· pre-commit + pre-push 密钥扫描钩子 · develop 集成主干分支模型 · 发布前合规自查清单。

## License

MIT © 2026 [guangyang1206](https://github.com/guangyang1206)
