# 知微 ZhiWei · API 与数据模型

> 本文档描述「选题罗盘」后端的 **全部 API 端点**、**数据模型** 与 **评分算法契约**，供前端联调、二次开发与答辩查证。
> 端点实现位于 `app/functions/api/`，业务逻辑在 `app/functions/_lib/`，前端类型定义在 `app/web/src/lib/api.ts`。
> 交互式文档（Swagger UI）：线上访问 `/api/docs`，OpenAPI 规范 `/api/openapi.json`。

---

## 0. 通用约定

### 返回信封

所有端点统一返回 JSON 信封：

- **成功**：`{ "ok": true, ...业务字段 }`
- **失败**：`{ "ok": false, "error": "错误描述" }`，并带对应 HTTP 状态码。

前端 `req()` 封装会在 `res.ok === false` 或 HTTP 非 2xx 时抛出 `Error(data.error)`。

### 状态码

| 码 | 含义 |
|---|---|
| `200` | 成功 |
| `400` | 参数错误（缺必填字段等） |
| `401` | 令牌无效（seed 端点） |
| `403` | 未配置令牌（seed 端点） |
| `404` | 资源不存在（编辑/删除不存在的内容） |
| `405` | 方法不允许 |
| `500` | 运行时错误 |
| `503` | KV 未绑定 |

### CORS

所有端点允许跨域（`Access-Control-Allow-Origin: *`），支持 `GET/POST/PUT/DELETE/OPTIONS`，`OPTIONS` 预检直接返回。

### 存储与运行时

- **运行时**：EdgeOne Pages Edge Functions（V8，非 Node）。目录即路由：`functions/api/health/index.js` → `/api/health`。
- **存储**：EdgeOne Edge KV，绑定变量名 **`TOPIC_KV`**（生产以全局变量注入，本地由 dev-server 注入到 `env`）。未绑定时数据类端点返回 `503`。
- **Key 约定**（KV key 仅允许 `[0-9a-zA-Z_]`，不允许冒号）：
  - 发布记录：`post_<id>`
  - 选题索引：`topic_<slug>`
  - 元信息：`meta_<name>`（如 `meta_seed` 记录灌数时间）

---

## 1. 端点总览

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| `GET` | `/api/health` | 健康检查（版本 / KV 绑定状态） | 无 |
| `GET` | `/api/stats` | 命中率统计与规律模型（看板数据源） | 无 |
| `GET` | `/api/posts` | 列出全部发布记录（按发布时间倒序） | 无 |
| `POST` | `/api/posts` | 新增一条发布记录 | 无 |
| `PUT` | `/api/posts` | 编辑一条（body 带 `id`） | 无 |
| `DELETE` | `/api/posts` | 删除一条（body 或 `?id=` 带 `id`） | 无 |
| `POST` | `/api/score` | 给候选选题打命中分（含理由 + 建议） | 无 |
| `POST`/`GET` | `/api/admin/seed` | 灌入种子数据（运维端点） | 令牌 |
| `GET` | `/api/openapi.json` | OpenAPI 3.0 规范 | 无 |
| `GET` | `/api/docs` | Swagger UI 交互文档 | 无 |

> **路由设计说明**：EdgeOne 目录式路由对动态路径段（如 `/api/posts/:id`）支持有限，故编辑/删除统一用 **body 或 query 传 `id`**，而非 REST 风格的路径参数。这是刻意取舍，保持线上路由稳定。

---

## 2. 数据模型：Post（发布记录）

一条历史发布记录。这是全系统的核心数据，命中率统计与评分都由它聚合而来。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 唯一标识（新增未传时自动生成 `<时间戳>_<随机>`） |
| `topic` | string | **必填**。选题（如「AI 工具测评」） |
| `title` | string | **必填**。文章标题 |
| `platform` | string | 平台，默认 `wechat`。可选：`wechat`/`xiaohongshu`/`zhihu`/`bilibili`/`douyin`/`weibo` |
| `publishedAt` | string(ISO) | 发布时间，未传取当前时间 |
| `keywords` | string[] | 关键词数组（输入时也接受逗号/顿号/空格分隔的字符串，后端规整为数组） |
| `summary` | string | 摘要，可空 |
| `read` | number | 阅读量 |
| `like` | number | 点赞 |
| `looking` | number | 微信「在看」 |
| `comment` | number | 评论 |
| `share` | number | 分享/转发 |
| `followGain` | number | 涨粉数 |
| `engagement` | number | **派生字段**，互动热度综合分（见 §5.1），写入时自动计算 |
| `createdAt` | string(ISO) | 创建时间（编辑时保留原值） |
| `updatedAt` | string(ISO) | 最后更新时间 |

### PostInput（写入入参）

新增/编辑时的入参与 `Post` 基本一致，差异：

- `id` 可选（编辑时必填）。
- `keywords` 接受 `string[]` **或** 字符串（`"AI, 工具、测评"` → `["AI","工具","测评"]`）。
- 6 个指标字段（`read`/`like`/…）可选，缺省为 `0`。

---

## 3. 端点详解

### 3.1 `GET /api/health`

健康检查，无需 KV。

**响应示例**

```json
{
  "ok": true,
  "name": "知微 ZhiWei",
  "version": "0.2.0",
  "runtime": "edgeone-pages-edge",
  "kv": true,
  "time": "2026-07-22T09:00:00.000Z"
}
```

`kv: false` 表示 KV 未绑定——此时数据类端点会返回 `503`。

---

### 3.2 `GET /api/stats`

看板数据源。读取全部 `post_*`，用 `analyze()` 聚合成规律模型 + 按选题排名。

**响应结构**

```json
{
  "ok": true,
  "summary": {
    "total": 31,
    "hits": 10,
    "hitRate": 0.323,
    "hitThreshold": 380,
    "avgScore": 210,
    "topKeywords": [
      { "key": "干货", "count": 5, "hit": 4, "hitRate": 0.8, "confidence": 0.376, "avgScore": 520 }
    ],
    "byTime": [
      { "key": "evening", "count": 8, "hit": 5, "hitRate": 0.625, "confidence": 0.31, "avgScore": 430 }
    ],
    "byTitle": {
      "hasNumber":   { "count": 7, "hit": 4, "hitRate": 0.571 },
      "hasQuestion": { "count": 5, "hit": 1, "hitRate": 0.2 },
      "hasColon":    { "count": 9, "hit": 3, "hitRate": 0.333 },
      "hasPain":     { "count": 5, "hit": 4, "hitRate": 0.8 }
    }
  },
  "byTopic": [
    { "topic": "AI 工具测评", "count": 6, "hit": 4, "hitRate": 0.667, "avgScore": 480 }
  ]
}
```

**字段说明**

- `summary.hitThreshold`：爆款阈值 = 历史 `engagement` 的 **70 分位**；`engagement ≥ threshold` 且 `> 0` 记为「命中」。
- `topKeywords` / `byTime`：**按 `confidence`（Wilson 置信下界）排序**，而非裸命中率——小样本自动打折（见 §5.2）。
- `byTime.key` 时段桶：`dawn`(0-6)/`morning`(6-11)/`noon`(11-14)/`afternoon`(14-18)/`evening`(18-22)/`night`(22-24)。
- `byTitle`：四种标题特征（数字/设问/冒号分层/痛点情绪词）各自的命中率对比。

---

### 3.3 `GET /api/posts`

列出全部发布记录，按 `publishedAt` 倒序。

**响应**

```json
{ "ok": true, "count": 31, "posts": [ /* Post[] */ ] }
```

---

### 3.4 `POST /api/posts` — 新增

**请求体**（`PostInput`，`topic`+`title` 必填）

```json
{
  "topic": "AI 工具测评",
  "title": "我用 3 个 AI 工具重构了工作流，效率翻倍",
  "platform": "wechat",
  "publishedAt": "2026-07-20T20:00:00.000Z",
  "keywords": "AI, 工具、效率",
  "summary": "实测三款工具……",
  "read": 12000, "like": 300, "looking": 80, "comment": 45, "share": 60, "followGain": 25
}
```

**响应**：`{ "ok": true, "post": { /* 完整 Post，含自动生成的 id/engagement/createdAt */ } }`

**错误**：缺 `title` 或 `topic` → `400 缺少必填字段：title、topic`。

---

### 3.5 `PUT /api/posts` — 编辑

**请求体**：同 `PostInput`，但 **必须带 `id`**。`createdAt` 保留原值，`updatedAt` 刷新，`engagement` 重算。

```json
{ "id": "1690000000000_ab12x", "topic": "AI 工具测评", "title": "改后的标题", "read": 15000 }
```

**响应**：`{ "ok": true, "post": { /* 更新后的 Post */ } }`

**错误**：缺 `id` → `400`；`id` 不存在 → `404 内容不存在`。

---

### 3.6 `DELETE /api/posts` — 删除

`id` 从 **body** 或 **`?id=`** 传入。

```
DELETE /api/posts?id=1690000000000_ab12x
```

或 body：`{ "id": "1690000000000_ab12x" }`

**响应**：`{ "ok": true, "deleted": "1690000000000_ab12x" }`

**错误**：缺 `id` → `400`；不存在 → `404`。

---

### 3.7 `POST /api/score` — 候选选题打分

评分官算法后端。读取全部历史 → `analyze()` 建模 → 对候选批量打分。

**请求体**

```json
{
  "candidates": [
    {
      "topic": "AI 工具测评",
      "keywords": ["AI", "效率"],
      "plannedTime": "2026-07-25T20:30:00.000Z",
      "plannedTitle": "3 个让你效率翻倍的 AI 工具（附避坑指南）"
    }
  ]
}
```

- `topic` 必填；`keywords` 可选（缺省时从 `topic` 自动抽词）；`plannedTime`/`plannedTitle` 可选（提供后才有对应维度得分）。

**响应**（`scores` 按 `score` 降序）

```json
{
  "ok": true,
  "basedOn": { "posts": 31, "hitRate": 0.323 },
  "scores": [
    {
      "topic": "AI 工具测评",
      "title": "3 个让你效率翻倍的 AI 工具（附避坑指南）",
      "score": 78,
      "level": "强推",
      "keywords": ["AI", "效率"],
      "reasons": [
        "选题关键词踩中历史高命中主题（已按样本量做置信度加权）：AI(命中率67%·置信38%·n=6)",
        "计划发布时段「晚间」历史命中率 63%（n=8），优于平均",
        "标题含痛点/情绪词，历史此类标题命中率更高（80%）",
        "标题含数字，历史此类标题更易命中（57%）"
      ],
      "breakdown": { "base": 40, "keyword": 20, "time": 10, "title": 13 },
      "suggestions": ["各维度均达标，可按计划发布"]
    }
  ]
}
```

**字段说明**（评分算法见 §5）

- `score`：0-100。`level` 分档：`≥75 强推` / `≥60 可做` / `≥45 谨慎` / `<45 不建议`。
- `breakdown`：评分构成，四维度贡献（`base` 基线 40 + `keyword` + `time` + `title`，后三者可为负）。前端据此画「评分构成」堆叠条。
- `reasons`：逐条可解释理由（这是产品核心卖点：每一分都说得出为什么）。
- `suggestions`：可操作的下一步建议（最佳时段、补标题、向高命中词靠拢等）。

---

### 3.8 `POST|GET /api/admin/seed` — 灌种子数据（运维）

KV 绑定后为空，调用本端点写入 `_lib/seed-data.js` 的 31 篇真实种子数据。

- **鉴权**：`?token=<SEED_TOKEN>` 或 `X-Seed-Token` 头，令牌来自环境变量 `SEED_TOKEN`。
- **幂等**：已存在的 key 默认跳过；`?force=1` 强制覆盖。
- **一次性**：灌完可在控制台移除 `SEED_TOKEN` 使端点失效。

**响应**：`{ "ok": true, "seeded": true, "total": 31, "written": 31, "skipped": 0, "force": false, "hint": "…" }`

> ⚠️ **多环境注意**：KV 为项目级共享（生产/预览同一 `TOPIC_KV`），**勿在预览环境重复灌数或 `force`**，以免污染生产数据。

---

## 4. 前端类型映射

前端 `app/web/src/lib/api.ts` 提供与上述契约一一对应的 TypeScript 类型与 `api` 客户端：

| 后端返回 | 前端类型 | 客户端方法 |
|---|---|---|
| `/api/health` | `Health` | `api.health()` |
| `/api/stats` | `StatsResponse`（`summary: StatsSummary` + `byTopic`） | `api.stats()` |
| `/api/posts` GET | `{ count, posts: Post[] }` | `api.posts()` |
| `/api/posts` POST/PUT/DELETE | `{ post }` / `{ deleted }` | `api.createPost/updatePost/deletePost` |
| `/api/score` | `ScoreResponse`（`scores: ScoreItem[]`） | `api.score(candidates)` |

---

## 5. 评分算法契约

实现见 `_lib/analytics.js`（纯函数、无 IO，便于独立测试）。

### 5.1 互动热度综合分 `engagement`

不同互动行为按「传播价值」加权，写入 Post 时自动计算：

```
engagement = read×0.01 + like×1 + looking×2 + comment×2 + share×3 + followGain×4
```

设计逻辑：分享 > 在看 ≈ 评论 > 点赞，阅读做基数（弱权重）。

### 5.2 Wilson 置信下界（可信度核心）

命中率统计不用「裸命中率」排序，而用 **Wilson score 95% 置信下界**：样本越小越向保守值收缩。

- 例：命中 3/3，裸命中率 100%，但 Wilson 下界 ≈ 44%（诚实反映「只有 3 个样本」）。
- 命中 10/10 时下界 ≈ 72%，比 3/3 更可信。

**目的**：不让创作者被「1 篇就 100%」的假高命中率误导。关键词/时段的 `confidence` 字段即此值，排序与加权都以它为准。

### 5.3 打分构成（0-100）

| 维度 | 起点/规则 | 得分 |
|---|---|---|
| **基线** | 所有候选起步 | `base = 40` |
| **关键词** | 命中历史高置信词（`confidence > baseline`），加权幅度 `(conf-baseline)×60`，上限 +30 | `keyword` 0~+30 |
| **时段** | `plannedTime` 落在高命中时段 +10；落在弱时段 −5 | `time` −5~+10 |
| **标题** | 含痛点词且历史高命中 +8；含数字且历史高命中 +5；标题 >30 字 −4 | `title` −4~+13 |

最终 `score = clamp(0, 100, round(base + keyword + time + title))`。

> `baseline` = 整体 `hitRate`（无数据时兜底 0.3）。「潜力信号」（裸命中率高但 n<3）只提示、不计高分。

---

## 6. 本地联调

```bash
cd app
npm install
npm run dev          # 前端 Vite(:5173) + 后端 dev-server(:8788)，vite 代理 /api → :8788
```

- 本地由 `dev-server.mjs` 模拟目录路由，并注入本地 KV（内存+文件）与 `SEED_TOKEN`。
- 修改 `_lib/*.js`（二级模块）后需 **重启 dev-server**（endpoint 文件有热重载，二级模块被 ESM 缓存）。

---

*最后更新：2026-07-22 · 对应版本 0.2.0*
