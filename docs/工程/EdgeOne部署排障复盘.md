# EdgeOne 部署排障复盘 · GitHub 集成后全链路打通

> 记录一次把「知微 ZhiWei」从 **关联 GitHub 后全站 404** 修复到 **线上真实 KV 数据全链路跑通** 的完整排障过程。
> 时间：2026-07-20 ｜ 环境：EdgeOne Pages（GitHub Provider）+ Edge KV + Functions
> 线上：<https://topic.yeranyang.com>

---

## 0. 背景

项目最初以 **Upload（直传）** 方式部署到 EdgeOne，通过 CLI `npm run deploy` 推送。
后来为了 CI 化，把项目 **关联到了 GitHub 仓库**（`guangyang1206/zhiwei-topic-compass`），
项目类型随之从 **Upload** 静默转为 **GitHub Provider**。

这一转变触发了一连串连环坑：CLI 部署失效 → 全站 404 → KV 拿不到 → 运行时报错。
下面按「发现顺序」逐个复盘。

---

## 1. 四个连环坑总览

| # | 现象 | 根因 | 修复 |
|---|------|------|------|
| 1 | 全站 404（静态页 + `/api/*`） | 网站文件在 `app/` 子目录，GitHub 构建**默认以仓库根为站点根**；`edgeone.json` **没有 rootDirectory 字段** | 控制台把**根目录（Root Directory）设为 `app`** |
| 2 | `/api/stats` 503「KV 未绑定」 | EdgeOne Pages 的 **KV 绑定以「全局变量」注入**函数作用域，**不挂在 `context.env`** 上 | `store.js` 补 `globalThis.TOPIC_KV` 兜底 |
| 3 | `/api/stats` 545「Error return from script」 | 生产 KV 的 `list()` **不接受 `cursor: undefined`**（严格类型校验），本地实现却容忍 | `listKeys` 首页不传 cursor 字段 |
| 4 | 反复测都是 404（干扰项） | 一直在测**旧的失效域名** `topic-compass.edgeone.app` | 认准自定义域名 `topic.yeranyang.com` |

---

## 2. 坑 #1：全站 404 —— 根目录不对

### 现象

关联 GitHub 后，控制台显示构建「成功」，但线上所有页面和 API 全部 404：

```
/               → 404
/dashboard.html → 404
/api/hello      → 404  (server: edgeone-pages, "The site does not exist")
```

### 诊断

仓库结构是「单仓多目录」，网站真正的文件都在 `app/` 子目录：

```
仓库根/                ← GitHub 构建默认把这里当站点根（这里没有 index.html）
├── README.md
├── LICENSE
├── docs/
└── app/               ← 网站真正的文件全在这里
    ├── index.html
    ├── dashboard.html
    ├── functions/     ← 边缘函数（API）
    └── edgeone.json
```

EdgeOne Pages 的 GitHub 构建默认把**仓库根**当站点根，于是在根目录既找不到 `index.html`，
也找不到 `functions/`，导致静态页 + API 全 404。

### 关键结论（查官方文档确认）

- 静态输出目录可用 `edgeone.json` 的 `outputDirectory` 覆盖；
- **但「根目录 / rootDirectory」在 `edgeone.json` 里没有对应字段**，只能在控制台设置；
- 而 `functions/` 的探测基点是**根目录**，不是 `outputDirectory`。

所以「只改 `edgeone.json`、不碰控制台」这条路走不通——静态页能救活，但 `functions/`（API）会因为
根目录仍是仓库根而找不到。

### 修复

在 EdgeOne 控制台：**项目设置 → 构建部署配置 → 根目录（Root Directory）= `app`**，保存后触发一次新部署。

设为 `app` 后，静态文件、`functions/`、`edgeone.json` **全部对齐到 `app/` 基准**，一次解决。
对应的 `app/edgeone.json` 保持 `outputDirectory: "./"`（相对根目录 = app 本身）：

```json
{
  "outputDirectory": "./"
}
```

> ✅ 这样做既救活全站，又**完整保留 GitHub push 自动部署**，以后只需 `git push` 即自动构建。

---

## 3. 坑 #2：KV 绑定不在 `context.env` 上 —— 是全局变量

### 现象

全站活了（200），但 `/api/stats` 返回 **503「KV 未绑定：变量名 TOPIC_KV」**。
控制台里 KV 绑定明明显示「运行中」（命名空间 `zhiwei_topic_compass_kv` → 变量名 `TOPIC_KV`）。

### 诊断（临时诊断端点）

临时加了一个 `/api/debug-env` 端点，只列 key 名、不泄露值，逐步收敛：

1. `context.env` 里 **有 `SEED_TOKEN`**（普通环境变量注入正常），但**没有 `TOPIC_KV`**；
2. `context` 顶层有个 `eo` 对象 → 挖开后发现只是边缘请求上下文（geo/tls/ip），**里面没有 KV**；
3. 直接探测全局作用域：**`globalThis.TOPIC_KV` 存在，且有 `get/put` 方法**！

### 根因

对照 EdgeOne Pages 官方文档的 KV Example：

```js
export async function onRequest({ request, params, env }) {
  // 变量名为 my_kv 的命名空间：直接裸用 my_kv，不是 env.my_kv！
  let count = await my_kv.get("count");
}
```

**EdgeOne Pages 的 KV 绑定变量名是作为「全局变量」注入函数作用域的，不挂在 `context.env` 上。**
而普通环境变量（`SEED_TOKEN`）才在 `env` 上。

之前代码按旧版 Makers 约定写的 `env.TOPIC_KV`，所以永远拿不到 → 报「KV 未绑定」。

### 修复（`app/functions/_lib/store.js`）

`resolveBackend` 增加 `globalThis.TOPIC_KV` 兜底，做到本地 / 生产双兼容：

```js
export function resolveBackend(env) {
  if (env && env.TOPIC_KV) return env.TOPIC_KV;         // 本地 dev-server 注入到 env
  try {
    if (typeof globalThis !== 'undefined' && globalThis.TOPIC_KV) return globalThis.TOPIC_KV; // 生产：全局注入
  } catch { /* ignore */ }
  if (env && env.KV) return env.KV;
  try {
    if (typeof globalThis !== 'undefined' && globalThis.KV) return globalThis.KV;
  } catch { /* ignore */ }
  return null;
}
```

---

## 4. 坑 #3：`list()` 的 cursor 严格类型校验 —— 545

### 现象

补了全局兜底后，503 变成 **545「Error return from script」**。
状态码变化本身是好事：说明**已经拿到 KV**，代码往下跑到真正读 KV 的逻辑，只是那里抛了错。

### 诊断

给 stats 端点临时包一层 try/catch，把真实错误暴露出来（EdgeOne 默认会把它吞成 545）：

```
cursor type invalid. expect: 'string' get: 'undefined'
    at listKeys ... at listJSON
```

### 根因

生产 EdgeOne KV 的 `list({ prefix, limit, cursor })` 对 `cursor` 做**严格类型校验**，
`cursor` 为 `undefined`（首次翻页时）会直接抛错。本地内存实现能容忍 `undefined`，所以本地测不出来。

### 修复（`app/functions/_lib/store.js` 的 `listKeys`）

首页不传 `cursor` 字段，只有拿到游标后才带上：

```js
async listKeys(prefix) {
  const out = [];
  let cursor;
  for (let i = 0; i < 1000; i++) {
    const opts = { prefix, limit: 256 };
    if (cursor) opts.cursor = cursor;   // ← 关键：首页不传 cursor
    const res = await backend.list(opts);
    const keys = (res && res.keys) || [];
    for (const k of keys) out.push(typeof k === 'string' ? k : k.key);
    if (!res || res.complete || !res.cursor) break;
    cursor = res.cursor;
  }
  return out;
}
```

> 这个修复在 `store.js` 层面统一解决，所有用到 `listKeys` 的端点（stats / posts）一并生效。

---

## 5. 坑 #4：测错了域名（干扰项）

整个过程中一直在测 `topic-compass.edgeone.app`，它是**旧 Upload 项目的失效域名**，一直返回
`The site does not exist`，误导了很久。真正的访问域名是**自定义域名 `topic.yeranyang.com`**。

> 教训：项目转 Provider / 重建后，务必以**控制台「域名管理」里显示的当前域名**为准，别用记忆里的旧域名。

---

## 6. 灌种子数据 & 最终验证

链路打通后，调用受 token 保护的 seed 端点写入 31 篇真实历史数据：

```bash
# 无 token → 401（安全校验）
curl -o /dev/null -w "%{http_code}\n" "https://topic.yeranyang.com/api/admin/seed"

# 正确 token → 写入 31 条
curl "https://topic.yeranyang.com/api/admin/seed?token=<SEED_TOKEN>"
# → { ok:true, written:31, skipped:0 }
```

最终实测状态：

- **全站 8 页**（`/`、product、dashboard、proposal、review、docs、blog）→ 全 200
- **API**（`/api/hello`、`/api/stats`、`/api/posts`、`/api/score`）→ 全 200，真实数据
- **`/api/stats`** → `total:31 / hits:10 / hitRate:32.3%`，关键词带 Wilson 置信度下界
- **Dashboard** → 已切到「实时数据 · EdgeOne KV」

---

## 7. 经验总结（可复用）

1. **单仓多目录 + GitHub 构建**：网站在子目录时，用控制台 **根目录（Root Directory）** 指向该子目录，
   一次让静态 / functions / edgeone.json 全部对齐。`edgeone.json` 无 rootDirectory 字段，别指望配置文件搞定。
2. **EdgeOne Pages 的 KV 是全局变量注入**，不在 `context.env`。代码里做 `env.X → globalThis.X` 双兜底，
   本地与生产都能跑。普通环境变量（如 token）才在 `env` 上。
3. **生产 KV `list()` 严格校验 cursor 类型**，首页不要传 `cursor: undefined`。本地实现要模拟这个严格性，
   否则本地测不出。
4. **状态码是路标**：503（拿不到后端）→ 545（拿到了但运行时报错）→ 200，每一步状态码变化都指示问题在往下推进。
5. **善用临时诊断端点**：只列 key 名 / 只回错误 message，快速定位运行时环境差异，用完即删。
6. **认准当前域名**：项目重建 / 转 Provider 后以控制台域名管理为准，避免被旧失效域名误导。

---

## 附：相关提交

| Commit | 说明 |
|---|---|
| `3d13564` | 适配根目录=app 的 GitHub 构建（edgeone.json outputDirectory=./ + 品牌名修正） |
| `e4eb78e` | 修复 KV 解析 — 绑定作为全局变量注入而非 env（补 globalThis 兜底）+ 移除临时诊断端点 |
| `118ca19` | 修复生产 KV list() cursor 严格类型校验 — 首页不传 cursor 字段（本地/生产双兼容） |
