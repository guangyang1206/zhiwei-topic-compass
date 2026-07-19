// 选题罗盘 · 分析与评分引擎（纯函数，无 IO，便于独立测试）
// ----------------------------------------------------------------------------
// 输入：历史发布记录 posts[]（见 data/schema）；候选选题 candidates[]
// 输出：命中率统计 stats / 选题评分 scores（含可解释理由）
//
// 设计原则：评分必须「可解释」——每一分都能说出为什么，这是答辩的关键卖点。

/** 互动热度综合分：不同行为按传播价值加权 */
export function engagementScore(p) {
  const read = num(p.read);
  const like = num(p.like);
  const looking = num(p.looking);   // 微信「在看」
  const share = num(p.share);
  const comment = num(p.comment);
  const followGain = num(p.followGain);
  // 分享 > 在看 > 评论 > 点赞，阅读做基数（弱权重）
  return Math.round(
    read * 0.01 +
    like * 1 +
    looking * 2 +
    comment * 2 +
    share * 3 +
    followGain * 4
  );
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

/** 从标题提取特征（用于规律学习） */
export function titleFeatures(title = '') {
  const t = String(title);
  return {
    hasNumber: /\d/.test(t),
    hasQuestion: /[?？]/.test(t),
    hasColon: /[:：]/.test(t),
    // 常见「痛点/情绪」触发词
    hasPain: /(踩坑|避坑|误区|别再|终于|居然|竟然|真相|复盘|血泪|后悔|必看|干货|保姆|手把手|一文|指南)/.test(t),
    len: t.length,
  };
}

/** 发布时段分桶 */
export function timeBucket(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return 'unknown';
  const h = d.getHours();
  if (h < 6) return 'dawn';        // 0-6
  if (h < 11) return 'morning';    // 6-11
  if (h < 14) return 'noon';       // 11-14
  if (h < 18) return 'afternoon';  // 14-18
  if (h < 22) return 'evening';    // 18-22
  return 'night';                  // 22-24
}

/**
 * 主分析：把 posts 聚合成规律模型。
 * 爆款阈值 = 历史 engagementScore 的 70 分位。
 */
export function analyze(posts) {
  const scored = posts.map(p => ({ ...p, _score: engagementScore(p) }));
  const sorted = [...scored].map(p => p._score).sort((a, b) => a - b);
  const hitThreshold = percentile(sorted, 0.7);

  const withHit = scored.map(p => ({ ...p, _hit: p._score >= hitThreshold && p._score > 0 }));
  const total = withHit.length;
  const hits = withHit.filter(p => p._hit).length;

  // 各维度命中率
  const byKeyword = groupHitRate(withHit, p => (p.keywords || []));
  const byTime = groupHitRate(withHit, p => [timeBucket(p.publishedAt)]);
  const byTitle = titleFeatureHitRate(withHit);

  return {
    total,
    hits,
    hitRate: total ? +(hits / total).toFixed(3) : 0,
    hitThreshold,
    avgScore: total ? Math.round(sorted.reduce((a, b) => a + b, 0) / total) : 0,
    topKeywords: byKeyword.slice(0, 12),
    byTime,
    byTitle,
    _posts: withHit,
  };
}

function percentile(sortedAsc, q) {
  if (!sortedAsc.length) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * q));
  return sortedAsc[idx];
}

/** 按某个「多值维度」（如关键词数组）统计命中率 */
function groupHitRate(posts, keyFn) {
  const map = new Map();
  for (const p of posts) {
    for (const key of keyFn(p)) {
      if (!key) continue;
      const e = map.get(key) || { key, count: 0, hit: 0, scoreSum: 0 };
      e.count++; if (p._hit) e.hit++; e.scoreSum += p._score;
      map.set(key, e);
    }
  }
  return [...map.values()]
    .map(e => ({
      key: e.key,
      count: e.count,
      hit: e.hit,
      hitRate: +(e.hit / e.count).toFixed(3),
      avgScore: Math.round(e.scoreSum / e.count),
    }))
    .filter(e => e.count >= 1)
    .sort((a, b) => b.hitRate - a.hitRate || b.avgScore - a.avgScore);
}

function titleFeatureHitRate(posts) {
  const feats = ['hasNumber', 'hasQuestion', 'hasColon', 'hasPain'];
  const res = {};
  for (const f of feats) {
    const sub = posts.filter(p => titleFeatures(p.title)[f]);
    const hit = sub.filter(p => p._hit).length;
    res[f] = { count: sub.length, hit, hitRate: sub.length ? +(hit / sub.length).toFixed(3) : 0 };
  }
  return res;
}

/**
 * 给候选选题打分（0-100）+ 可解释理由。
 * @param candidates [{ topic, keywords?[], plannedTime?, plannedTitle? }]
 * @param model analyze() 的输出
 */
export function scoreCandidates(candidates, model) {
  const kwMap = new Map(model.topKeywords.map(k => [k.key, k]));
  const timeMap = new Map(model.byTime.map(t => [t.key, t]));
  const baseline = model.hitRate || 0.3;

  return candidates.map(c => {
    const reasons = [];
    let score = 40; // 基线分

    // 1) 关键词匹配历史高命中词
    const kws = c.keywords && c.keywords.length ? c.keywords : autoKeywords(c.topic);
    let kwBoost = 0, matched = [];
    for (const kw of kws) {
      const stat = kwMap.get(kw);
      if (stat && stat.hitRate > baseline) {
        const delta = Math.round((stat.hitRate - baseline) * 60);
        kwBoost += delta; matched.push(`${kw}(命中率${pct(stat.hitRate)})`);
      }
    }
    if (kwBoost) { score += Math.min(30, kwBoost); reasons.push(`选题关键词踩中历史高命中主题：${matched.join('、')}`); }
    else reasons.push('选题关键词与历史高命中主题重合度低，命中不确定性较高');

    // 2) 发布时段
    const tb = c.plannedTime ? timeBucket(c.plannedTime) : null;
    if (tb) {
      const stat = timeMap.get(tb);
      if (stat && stat.hitRate > baseline) {
        score += 10; reasons.push(`计划发布时段「${zhTime(tb)}」历史命中率 ${pct(stat.hitRate)}，优于平均`);
      } else if (stat) {
        score -= 5; reasons.push(`计划发布时段「${zhTime(tb)}」历史表现偏弱，建议换时段`);
      }
    }

    // 3) 标题特征
    if (c.plannedTitle) {
      const f = titleFeatures(c.plannedTitle);
      const tf = model.byTitle || {};
      if (f.hasPain && tf.hasPain && tf.hasPain.hitRate > baseline) { score += 8; reasons.push('标题含痛点/情绪词，历史此类标题命中率更高'); }
      if (f.hasNumber && tf.hasNumber && tf.hasNumber.hitRate > baseline) { score += 5; reasons.push('标题含数字，历史此类标题更易命中'); }
      if (f.len > 30) { score -= 4; reasons.push('标题偏长（>30 字），建议精简'); }
    } else {
      reasons.push('未提供拟定标题，建议补充以获得标题维度评分');
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    return {
      topic: c.topic,
      score,
      level: score >= 75 ? '强推' : score >= 60 ? '可做' : score >= 45 ? '谨慎' : '不建议',
      keywords: kws,
      reasons,
    };
  }).sort((a, b) => b.score - a.score);
}

function autoKeywords(topic = '') {
  // 极简分词：按非中文/字母切分 + 抽取 2-4 字中文片段
  const s = String(topic);
  const parts = s.split(/[\s,，、。:：/|]+/).filter(Boolean);
  const zh = (s.match(/[\u4e00-\u9fa5]{2,4}/g) || []);
  return [...new Set([...parts, ...zh])].slice(0, 6);
}

function pct(x) { return Math.round(x * 100) + '%'; }
function zhTime(b) {
  return ({ dawn: '凌晨', morning: '上午', noon: '午间', afternoon: '下午', evening: '晚间', night: '深夜', unknown: '未知' })[b] || b;
}
