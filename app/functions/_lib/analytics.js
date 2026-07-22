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

/**
 * Wilson score 命中率置信下界（95%）。
 * 这是产品「可信度」的核心：样本越小，越向保守值收缩。
 * 例：命中3/3 裸命中率=100%，但 Wilson 下界≈44%（诚实反映"只有3个样本"）；
 *     命中10/10 时下界≈72%，比 3/3 更可信。
 * 让创作者不被 "1篇就100%" 的假高命中率误导。
 */
export function wilsonLower(hit, count, z = 1.96) {
  if (!count) return 0;
  const p = hit / count;
  const z2 = z * z;
  const denom = 1 + z2 / count;
  const center = p + z2 / (2 * count);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * count)) / count);
  return Math.max(0, (center - margin) / denom);
}

/** 按某个「多值维度」（如关键词数组）统计命中率 + 置信度 */
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
      confidence: +wilsonLower(e.hit, e.count).toFixed(3), // 置信下界：小样本自动打折
      avgScore: Math.round(e.scoreSum / e.count),
    }))
    .filter(e => e.count >= 1)
    // 按置信度排序（而非裸命中率）：n=3 的 100% 排在 n=1 的 100% 前面
    .sort((a, b) => b.confidence - a.confidence || b.avgScore - a.avgScore);
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
    const BASE = 40;
    let score = BASE; // 基线分
    // 结构化维度贡献（供前端可视化「评分构成」）
    const breakdown = {
      base: BASE,
      keyword: 0,
      time: 0,
      title: 0,
    };

    // 1) 关键词匹配历史高命中词 —— 用置信下界(confidence)而非裸命中率，避免小样本虚高
    const kws = c.keywords && c.keywords.length ? c.keywords : autoKeywords(c.topic);
    let kwBoost = 0, matched = [], weakMatched = [];
    for (const kw of kws) {
      const stat = kwMap.get(kw);
      if (!stat) continue;
      const conf = stat.confidence != null ? stat.confidence : stat.hitRate;
      if (conf > baseline) {
        // 加权幅度由「置信下界」决定：样本足、命中稳的词加得多；1篇的高命中加得少
        const delta = Math.round((conf - baseline) * 60);
        kwBoost += delta;
        matched.push(`${kw}(命中率${pct(stat.hitRate)}·置信${pct(conf)}·n=${stat.count})`);
      } else if (stat.hitRate > baseline && stat.count < 3) {
        // 裸命中率高但样本不足：作为「潜力信号」提示，但不给分或少给分
        weakMatched.push(`${kw}(命中率${pct(stat.hitRate)}但仅n=${stat.count}，样本不足待验证)`);
      }
    }
    if (kwBoost) {
      const applied = Math.min(30, kwBoost);
      score += applied; breakdown.keyword += applied;
      reasons.push(`选题关键词踩中历史高命中主题（已按样本量做置信度加权）：${matched.join('、')}`);
    }
    if (weakMatched.length) reasons.push(`潜力信号（样本不足，未计入高分）：${weakMatched.join('、')}`);
    if (!kwBoost && !weakMatched.length) reasons.push('选题关键词与历史高命中主题重合度低，命中不确定性较高');

    // 2) 发布时段
    const tb = c.plannedTime ? timeBucket(c.plannedTime) : null;
    if (tb) {
      const stat = timeMap.get(tb);
      const tConf = stat ? (stat.confidence != null ? stat.confidence : stat.hitRate) : null;
      if (stat && tConf > baseline) {
        score += 10; breakdown.time += 10; reasons.push(`计划发布时段「${zhTime(tb)}」历史命中率 ${pct(stat.hitRate)}（n=${stat.count}），优于平均`);
      } else if (stat) {
        score -= 5; breakdown.time -= 5; reasons.push(`计划发布时段「${zhTime(tb)}」历史表现偏弱（命中率${pct(stat.hitRate)}，n=${stat.count}），建议换时段`);
      }
    }

    // 3) 标题特征
    if (c.plannedTitle) {
      const f = titleFeatures(c.plannedTitle);
      const tf = model.byTitle || {};
      if (f.hasPain && tf.hasPain && tf.hasPain.hitRate > baseline) { score += 8; breakdown.title += 8; reasons.push(`标题含痛点/情绪词，历史此类标题命中率更高（${pct(tf.hasPain.hitRate)}）`); }
      if (f.hasNumber && tf.hasNumber && tf.hasNumber.hitRate > baseline) { score += 5; breakdown.title += 5; reasons.push(`标题含数字，历史此类标题更易命中（${pct(tf.hasNumber.hitRate)}）`); }
      if (f.len > 30) { score -= 4; breakdown.title -= 4; reasons.push('标题偏长（>30 字），建议精简'); }
    } else {
      reasons.push('未提供拟定标题，建议补充以获得标题维度评分');
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const level = score >= 75 ? '强推' : score >= 60 ? '可做' : score >= 45 ? '谨慎' : '不建议';
    return {
      topic: c.topic,
      title: c.plannedTitle || '',
      score,
      level,
      keywords: kws,
      reasons,
      breakdown,
      suggestions: buildSuggestions({ score, breakdown, matched, weakMatched, tb, hasTitle: !!c.plannedTitle, model, baseline }),
    };
  }).sort((a, b) => b.score - a.score);
}

// 依据评分构成生成「发布建议」（可操作的下一步）
function buildSuggestions({ score, breakdown, weakMatched, tb, hasTitle, model, baseline }) {
  const tips = [];
  // 时段建议：给出历史最佳时段
  const bestTime = (model.byTime || []).slice().sort((a, b) => (b.confidence ?? b.hitRate) - (a.confidence ?? a.hitRate))[0];
  if (breakdown.time <= 0 && bestTime) {
    tips.push(`把发布时间安排到「${zhTime(bestTime.key)}」，历史命中率 ${pct(bestTime.hitRate)}（n=${bestTime.count}）最高`);
  }
  // 标题建议
  if (!hasTitle) {
    tips.push('补充拟定标题，并尝试加入具体数字或痛点/情绪词，可提升标题维度得分');
  } else if (breakdown.title <= 0) {
    tips.push('标题可尝试加入具体数字（如「3 个」「月入过万」）或痛点词，历史数据显示此类标题命中更高');
  }
  // 关键词建议：推荐 Top 高命中词
  if (breakdown.keyword <= 0) {
    const top = (model.topKeywords || []).filter(k => (k.confidence ?? k.hitRate) > baseline).slice(0, 3).map(k => k.key);
    if (top.length) tips.push(`选题可向历史高命中关键词靠拢：${top.join('、')}`);
  }
  if (weakMatched && weakMatched.length) {
    tips.push('部分关键词命中率高但样本不足，属潜力方向，可小步测试验证');
  }
  if (!tips.length) tips.push('各维度均达标，可按计划发布');
  return tips;
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

/**
 * 按选题聚合命中率（Dashboard 排名表用）。
 * 输入 analyze()._posts（已带 _hit / _score）。
 */
export function aggregateByTopic(posts) {
  const map = new Map();
  for (const p of posts) {
    const e = map.get(p.topic) || { topic: p.topic, count: 0, hit: 0, scoreSum: 0 };
    e.count++; if (p._hit) e.hit++; e.scoreSum += (p._score || 0);
    map.set(p.topic, e);
  }
  return [...map.values()]
    .map(e => ({
      topic: e.topic,
      count: e.count,
      hit: e.hit,
      hitRate: +(e.hit / e.count).toFixed(3),
      avgScore: Math.round(e.scoreSum / e.count),
    }))
    .sort((a, b) => b.hitRate - a.hitRate || b.avgScore - a.avgScore);
}
