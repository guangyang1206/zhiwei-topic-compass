// 种子数据 —— 模拟一个「AI/效率/职场」向公众号的历史发布记录
// 设计意图：让「命中规律」可被算法学出来 ——
//   · AI 工具实操 / 效率干货 / 避坑复盘 类：普遍高互动（爆款集中区）
//   · 泛泛而谈 / 情绪碎碎念 / 蹭热点无干货：普遍低互动
//   · 时段：晚间(evening)、午间(noon) 表现好；深夜(night) 差
//   · 标题：带数字、痛点词的更易爆
// 数据量 ~32 篇，覆盖足够维度。

export const SEED_POSTS = [
  // —— 高命中区：AI 工具实操 + 数字/痛点标题 + 晚间 ——
  { topic: 'AI工具实操', title: '我用这3个AI工具，把周报时间从2小时压到10分钟', platform: 'wechat', publishedAt: '2026-05-06T20:30:00+08:00', keywords: ['AI工具', '效率', '职场'], read: 18200, like: 420, looking: 380, comment: 96, share: 540, followGain: 210 },
  { topic: 'AI工具实操', title: 'ChatGPT提示词的5个致命误区，90%的人第一个就踩', platform: 'wechat', publishedAt: '2026-05-13T21:00:00+08:00', keywords: ['提示词', 'AI工具', '避坑'], read: 22400, like: 510, looking: 460, comment: 130, share: 720, followGain: 290 },
  { topic: '效率方法', title: '一文讲透：如何用AI把一篇长文拆成10条短内容', platform: 'wechat', publishedAt: '2026-05-20T20:15:00+08:00', keywords: ['效率', '内容创作', 'AI工具'], read: 16800, like: 380, looking: 340, comment: 78, share: 480, followGain: 175 },
  { topic: '避坑复盘', title: '做了3年自媒体，这4个坑让我少涨了10万粉', platform: 'wechat', publishedAt: '2026-05-27T20:45:00+08:00', keywords: ['避坑', '自媒体', '复盘'], read: 25100, like: 620, looking: 540, comment: 168, share: 810, followGain: 340 },
  { topic: 'AI工具实操', title: '手把手教你搭一个自动写公众号的工作流（附模板）', platform: 'wechat', publishedAt: '2026-06-03T20:00:00+08:00', keywords: ['AI工具', '工作流', '自动化'], read: 19600, like: 450, looking: 410, comment: 104, share: 610, followGain: 250 },
  { topic: '效率方法', title: '为什么你越努力越低效？这个方法帮我把产出翻了3倍', platform: 'wechat', publishedAt: '2026-06-10T21:10:00+08:00', keywords: ['效率', '方法论', '职场'], read: 20300, like: 480, looking: 420, comment: 112, share: 650, followGain: 265 },

  // —— 中等区：话题不错但标题平淡 / 时段一般 ——
  { topic: 'AI行业观察', title: '关于最近很火的AI Agent，说几点我的看法', platform: 'wechat', publishedAt: '2026-05-09T14:00:00+08:00', keywords: ['AI行业', 'Agent', '观察'], read: 9800, like: 180, looking: 150, comment: 42, share: 160, followGain: 68 },
  { topic: '内容创作', title: '写作这件事，我的一些心得', platform: 'wechat', publishedAt: '2026-05-16T13:30:00+08:00', keywords: ['写作', '内容创作'], read: 7200, like: 120, looking: 90, comment: 28, share: 88, followGain: 40 },
  { topic: 'AI行业观察', title: 'AI会不会取代内容创作者？我的三个判断', platform: 'wechat', publishedAt: '2026-05-23T12:30:00+08:00', keywords: ['AI行业', '内容创作', '判断'], read: 11200, like: 210, looking: 175, comment: 56, share: 210, followGain: 82 },
  { topic: '职场成长', title: '30岁转行做AI，我踩过的那些弯路', platform: 'wechat', publishedAt: '2026-05-30T19:30:00+08:00', keywords: ['职场', '转行', 'AI'], read: 13400, like: 260, looking: 230, comment: 70, share: 280, followGain: 110 },
  { topic: '效率方法', title: '推荐几个我常用的效率App', platform: 'wechat', publishedAt: '2026-06-06T11:20:00+08:00', keywords: ['效率', '工具', 'App'], read: 8600, like: 150, looking: 120, comment: 30, share: 130, followGain: 55 },
  { topic: '内容创作', title: '选题这件事，聊聊我的思路', platform: 'wechat', publishedAt: '2026-06-13T13:00:00+08:00', keywords: ['选题', '内容创作'], read: 9100, like: 165, looking: 140, comment: 38, share: 145, followGain: 60 },

  // —— 低命中区：泛泛/情绪/深夜/无干货 ——
  { topic: '随笔感悟', title: '这个周末，我想说说心里话', platform: 'wechat', publishedAt: '2026-05-10T23:30:00+08:00', keywords: ['随笔', '感悟'], read: 3200, like: 60, looking: 40, comment: 18, share: 22, followGain: 8 },
  { topic: '随笔感悟', title: '深夜emo，随便写写', platform: 'wechat', publishedAt: '2026-05-17T23:50:00+08:00', keywords: ['随笔', '情绪'], read: 2800, like: 48, looking: 30, comment: 22, share: 15, followGain: 5 },
  { topic: '蹭热点', title: '关于最近那个热搜，我也来蹭一波', platform: 'wechat', publishedAt: '2026-05-24T22:40:00+08:00', keywords: ['热点', '随笔'], read: 4100, like: 55, looking: 35, comment: 20, share: 28, followGain: 6 },
  { topic: '随笔感悟', title: '今天天气不错', platform: 'wechat', publishedAt: '2026-05-31T22:10:00+08:00', keywords: ['随笔', '日常'], read: 2400, like: 40, looking: 25, comment: 10, share: 12, followGain: 3 },
  { topic: '公告通知', title: '公众号改名通知', platform: 'wechat', publishedAt: '2026-06-07T09:00:00+08:00', keywords: ['公告', '通知'], read: 3600, like: 45, looking: 28, comment: 14, share: 18, followGain: 4 },
  { topic: '蹭热点', title: '大家都在聊的那件事，简单说两句', platform: 'wechat', publishedAt: '2026-06-14T23:20:00+08:00', keywords: ['热点', '随笔'], read: 3900, like: 52, looking: 33, comment: 16, share: 24, followGain: 7 },

  // —— 更多高命中样本，强化「AI工具实操/避坑/数字标题/晚间」规律 ——
  { topic: 'AI工具实操', title: '7个被低估的AI神器，第4个直接封神', platform: 'wechat', publishedAt: '2026-06-17T20:20:00+08:00', keywords: ['AI工具', '效率'], read: 23800, like: 560, looking: 490, comment: 142, share: 760, followGain: 305 },
  { topic: '避坑复盘', title: '别再这样用AI写作了！这5个习惯正在毁掉你的号', platform: 'wechat', publishedAt: '2026-06-20T21:00:00+08:00', keywords: ['避坑', 'AI工具', '内容创作'], read: 26700, like: 640, looking: 570, comment: 180, share: 850, followGain: 360 },
  { topic: 'AI工具实操', title: '保姆级教程：用AI 30分钟做出一份专业数据报告', platform: 'wechat', publishedAt: '2026-06-24T20:10:00+08:00', keywords: ['AI工具', '数据', '教程'], read: 21200, like: 495, looking: 440, comment: 118, share: 690, followGain: 278 },
  { topic: '效率方法', title: '我把工作流全自动化后，每天多出3小时', platform: 'wechat', publishedAt: '2026-06-27T20:40:00+08:00', keywords: ['效率', '自动化', '工作流'], read: 18900, like: 440, looking: 395, comment: 100, share: 590, followGain: 240 },

  // —— 平台差异样本：视频号/小红书（互动结构不同，量级偏小） ——
  { topic: 'AI工具实操', title: '3个AI工具帮你告别加班', platform: 'shipinhao', publishedAt: '2026-06-11T19:00:00+08:00', keywords: ['AI工具', '效率'], read: 45000, like: 1200, looking: 0, comment: 210, share: 380, followGain: 150 },
  { topic: 'AI工具实操', title: 'AI提示词技巧｜收藏这一篇就够了', platform: 'xiaohongshu', publishedAt: '2026-06-18T21:30:00+08:00', keywords: ['提示词', 'AI工具'], read: 32000, like: 2100, looking: 0, comment: 160, share: 290, followGain: 220 },
  { topic: '随笔感悟', title: '记录一下今天的生活', platform: 'xiaohongshu', publishedAt: '2026-06-01T23:00:00+08:00', keywords: ['随笔', '生活'], read: 3400, like: 90, looking: 0, comment: 12, share: 8, followGain: 6 },

  // —— 补充中低样本，让分布更真实 ——
  { topic: 'AI行业观察', title: '大模型价格战打到今天，普通人能得到什么', platform: 'wechat', publishedAt: '2026-06-04T15:00:00+08:00', keywords: ['AI行业', '大模型'], read: 10400, like: 195, looking: 160, comment: 48, share: 190, followGain: 76 },
  { topic: '职场成长', title: '在一家科技公司做AI项目，我学到的3件事', platform: 'wechat', publishedAt: '2026-06-21T20:30:00+08:00', keywords: ['职场', 'AI', '成长'], read: 15600, like: 340, looking: 300, comment: 82, share: 360, followGain: 145 },
  { topic: '内容创作', title: '爆款标题的6个套路，学会了随手10万+', platform: 'wechat', publishedAt: '2026-06-25T21:20:00+08:00', keywords: ['标题', '内容创作', '爆款'], read: 24500, like: 590, looking: 520, comment: 155, share: 790, followGain: 320 },
  { topic: '随笔感悟', title: '一些零碎的想法', platform: 'wechat', publishedAt: '2026-06-08T22:50:00+08:00', keywords: ['随笔'], read: 2600, like: 42, looking: 28, comment: 9, share: 14, followGain: 4 },
  { topic: '效率方法', title: '时间管理的本质，其实就一句话', platform: 'wechat', publishedAt: '2026-06-15T13:40:00+08:00', keywords: ['效率', '时间管理'], read: 9700, like: 175, looking: 148, comment: 40, share: 155, followGain: 62 },
  { topic: 'AI工具实操', title: '4个AI副业方向，我靠第2个月入过万', platform: 'wechat', publishedAt: '2026-06-28T20:25:00+08:00', keywords: ['AI工具', '副业'], read: 27900, like: 680, looking: 600, comment: 195, share: 880, followGain: 385 },
];
