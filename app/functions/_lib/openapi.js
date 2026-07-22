// OpenAPI 3.0.3 规格 —— 知微 ZhiWei 选题罗盘 API 的单一真源。
// 方案A（Edge Functions 不支持 npm，无法用 zod-openapi）下手写维护。
// 由 /api/openapi.json 端点直接返回；/api/docs 的 Swagger UI 读取它。
// 维护约定：任何端点的请求/响应结构变化，都要同步更新此文件。

export const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: '知微 ZhiWei · 选题罗盘 API',
    version: '0.2.0',
    description:
      '面向内容创作者的选题决策 API。基于历史发布数据（EdgeOne KV）计算命中率、关键词/时段规律（含 Wilson 置信度），并对候选选题给出可解释评分。\n\n所有响应统一信封：成功 `{ "ok": true, ... }`，失败 `{ "ok": false, "error": "..." }`。',
  },
  servers: [{ url: '/', description: '当前部署（同域）' }],
  tags: [
    { name: '系统', description: '健康检查与运行时状态' },
    { name: '统计', description: '选题命中率与规律分析' },
    { name: '内容', description: '历史发布内容' },
    { name: '评分', description: '候选选题打分引擎' },
    { name: '管理', description: '数据初始化（需令牌）' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['系统'],
        summary: '健康检查',
        description: '返回服务名、版本、运行时与 KV 绑定状态。',
        responses: {
          200: {
            description: '服务正常',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
                example: {
                  ok: true,
                  name: '知微 ZhiWei',
                  version: '0.2.0',
                  runtime: 'edgeone-pages-edge',
                  kv: true,
                  time: '2026-07-20T12:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
    '/api/stats': {
      get: {
        tags: ['统计'],
        summary: '选题统计',
        description:
          '基于全部历史内容计算总体命中率、Top 关键词（含 Wilson 95% 置信下界）、时段分布，以及按选题聚合的排名。',
        responses: {
          200: {
            description: '统计结果',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatsResponse' },
              },
            },
          },
          503: {
            description: 'KV 未绑定',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/posts': {
      get: {
        tags: ['内容'],
        summary: '历史内容列表',
        description: '返回全部已发布内容及真实互动数据（阅读/点赞/在看/评论/转发/涨粉）。',
        responses: {
          200: {
            description: '内容列表',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 31 },
                    posts: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
                  },
                },
              },
            },
          },
          503: {
            description: 'KV 未绑定',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      post: {
        tags: ['内容'],
        summary: '新增内容',
        description: '录入一篇已发布内容及其互动数据。系统自动生成 id、计算互动分（engagement）并纳入统计与评分。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PostInput' },
              example: {
                topic: 'AI 副业', title: '4个AI副业方向，我靠第2个月入过万', platform: 'wechat',
                keywords: 'AI, 副业, 变现', publishedAt: '2026-07-21T20:30:00+08:00',
                read: 12000, like: 800, comment: 120, share: 60, followGain: 45,
              },
            },
          },
        },
        responses: {
          200: {
            description: '新增成功',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, post: { $ref: '#/components/schemas/Post' } } } } },
          },
          400: { description: '缺少必填字段', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          503: { description: 'KV 未绑定', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['内容'],
        summary: '编辑内容',
        description: '按 id 更新一篇内容。保留 createdAt，刷新 updatedAt 并重算互动分。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { allOf: [{ $ref: '#/components/schemas/PostInput' }, { required: ['id'] }] },
              example: { id: '1784701045606_x5zwe', topic: 'AI 副业', title: '修改后的标题', read: 99999 },
            },
          },
        },
        responses: {
          200: {
            description: '更新成功',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, post: { $ref: '#/components/schemas/Post' } } } } },
          },
          400: { description: '缺少 id 或必填字段', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: '内容不存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['内容'],
        summary: '删除内容',
        description: '按 id 删除一篇内容。id 可放 body 或 query（?id=）。',
        parameters: [{ name: 'id', in: 'query', required: false, schema: { type: 'string' }, description: '内容 id（也可放在请求体）' }],
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' } } }, example: { id: '1784701045606_x5zwe' } } },
        },
        responses: {
          200: {
            description: '删除成功',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, deleted: { type: 'string' } } } } },
          },
          400: { description: '缺少 id', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: '内容不存在', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/score': {
      post: {
        tags: ['评分'],
        summary: '选题评分',
        description:
          '对候选选题基于历史规律给出 0-100 命中评分与分级（强推/可做/谨慎/不建议），并附可解释的评分依据。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ScoreRequest' },
              example: {
                candidates: [
                  {
                    topic: 'AI 编程避坑指南',
                    plannedTitle: '我踩过的 10 个 AI 编程大坑',
                    plannedTime: '2026-07-21T20:00:00',
                  },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: '评分结果',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ScoreResponse' } },
            },
          },
          400: {
            description: '参数错误（缺少 candidates）',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          503: {
            description: 'KV 未绑定',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/admin/seed': {
      get: {
        tags: ['管理'],
        summary: '灌入种子数据',
        description: '把内置的种子内容写入 KV。需正确令牌。默认幂等（已存在则跳过），`force=1` 覆盖。',
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: '管理令牌（env.SEED_TOKEN）',
          },
          {
            name: 'force',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['1'] },
            description: '=1 时覆盖已存在记录',
          },
        ],
        responses: {
          200: {
            description: '写入结果',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    written: { type: 'integer', example: 31 },
                    skipped: { type: 'integer', example: 0 },
                  },
                },
              },
            },
          },
          401: {
            description: '令牌缺失或错误',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: false },
          error: { type: 'string', example: 'KV 未绑定：变量名 TOPIC_KV' },
        },
      },
      Health: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          name: { type: 'string' },
          version: { type: 'string' },
          runtime: { type: 'string' },
          kv: { type: 'boolean' },
          time: { type: 'string', format: 'date-time' },
        },
      },
      KeywordStat: {
        type: 'object',
        properties: {
          key: { type: 'string', example: '避坑' },
          count: { type: 'integer', example: 3 },
          hit: { type: 'integer', example: 3 },
          hitRate: { type: 'number', format: 'float', example: 1.0 },
          confidence: { type: 'number', format: 'float', example: 0.438, description: 'Wilson 95% 置信下界' },
          avgScore: { type: 'number', format: 'float', example: 82.5 },
        },
      },
      TimeStat: {
        type: 'object',
        properties: {
          key: { type: 'string', example: 'evening' },
          count: { type: 'integer' },
          hit: { type: 'integer' },
          hitRate: { type: 'number', format: 'float' },
          confidence: { type: 'number', format: 'float' },
          avgScore: { type: 'number', format: 'float' },
        },
      },
      TopicStat: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          count: { type: 'integer' },
          hit: { type: 'integer' },
          hitRate: { type: 'number', format: 'float' },
          avgScore: { type: 'number', format: 'float' },
        },
      },
      StatsResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          summary: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 31 },
              hits: { type: 'integer', example: 10 },
              hitRate: { type: 'number', format: 'float', example: 0.323 },
              hitThreshold: { type: 'number', format: 'float' },
              avgScore: { type: 'number', format: 'float' },
              topKeywords: { type: 'array', items: { $ref: '#/components/schemas/KeywordStat' } },
              byTime: { type: 'array', items: { $ref: '#/components/schemas/TimeStat' } },
              byTitle: { type: 'object', additionalProperties: true },
            },
          },
          byTopic: { type: 'array', items: { $ref: '#/components/schemas/TopicStat' } },
        },
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          topic: { type: 'string' },
          title: { type: 'string' },
          platform: { type: 'string', example: '微信公众号' },
          publishedAt: { type: 'string', format: 'date-time' },
          keywords: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' },
          read: { type: 'integer' },
          like: { type: 'integer' },
          looking: { type: 'integer' },
          comment: { type: 'integer' },
          share: { type: 'integer' },
          followGain: { type: 'integer' },
          engagement: { type: 'integer', description: '综合互动分（系统计算）' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PostInput: {
        type: 'object',
        required: ['topic', 'title'],
        properties: {
          id: { type: 'string', description: '编辑时必填；新增时留空由系统生成' },
          topic: { type: 'string', description: '选题方向' },
          title: { type: 'string', description: '标题' },
          platform: { type: 'string', default: 'wechat' },
          publishedAt: { type: 'string', format: 'date-time' },
          keywords: {
            oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
            description: '数组，或逗号/顿号/空格分隔的字符串',
          },
          summary: { type: 'string' },
          read: { type: 'integer' },
          like: { type: 'integer' },
          looking: { type: 'integer' },
          comment: { type: 'integer' },
          share: { type: 'integer' },
          followGain: { type: 'integer' },
        },
      },
      Candidate: {
        type: 'object',
        required: ['topic'],
        properties: {
          topic: { type: 'string', description: '选题方向' },
          keywords: { type: 'array', items: { type: 'string' } },
          plannedTitle: { type: 'string', description: '拟定标题' },
          plannedTime: { type: 'string', description: '计划发布时间（ISO）' },
        },
      },
      ScoreRequest: {
        type: 'object',
        required: ['candidates'],
        properties: {
          candidates: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/Candidate' } },
        },
      },
      ScoreItem: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          title: { type: 'string', description: '拟定标题（回显）' },
          score: { type: 'integer', example: 72 },
          level: { type: 'string', enum: ['强推', '可做', '谨慎', '不建议'] },
          keywords: { type: 'array', items: { type: 'string' } },
          reasons: { type: 'array', items: { type: 'string' }, description: '可解释的评分依据（文本）' },
          breakdown: {
            type: 'object',
            description: '评分构成：基线 + 各维度贡献（可为负）',
            properties: {
              base: { type: 'integer', example: 40 },
              keyword: { type: 'integer', example: 20 },
              time: { type: 'integer', example: 10 },
              title: { type: 'integer', example: 5 },
            },
          },
          suggestions: { type: 'array', items: { type: 'string' }, description: '可操作的发布建议' },
        },
      },
      ScoreResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          basedOn: {
            type: 'object',
            properties: {
              posts: { type: 'integer', example: 31 },
              hitRate: { type: 'number', format: 'float', example: 0.323 },
            },
          },
          scores: { type: 'array', items: { $ref: '#/components/schemas/ScoreItem' } },
        },
      },
    },
  },
};
