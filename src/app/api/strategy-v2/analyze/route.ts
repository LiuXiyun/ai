import { NextRequest, NextResponse } from "next/server";

const DATAFORSEO_SERP_URL =
  "https://api.dataforseo.com/v3/serp/google/organic/live/regular";

const DATAFORSEO_KEYWORD_SUGGESTIONS_URL =
  "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live";

function getAuthHeader() {
  const cred = process.env.DATAFORSEO_CRED;
  if (!cred) {
    throw new Error("DATAFORSEO_CRED is not configured");
  }
  return `Basic ${cred}`;
}

/** Layer1：把 SERP 数据压缩成「人话总结」+「特色板块总结」 */
function buildSerpNarrativeSummaries(
  keyword: string,
  organicResults: Array<{ rank: number; title: string; domain: string; description?: string }>,
  counts: {
    organicCount: number;
    shoppingCount: number;
    paaCount: number;
    faqCount: number;
    relatedSearchCount: number;
    hasKnowledgeGraph: boolean;
  },
  rawSignals: Record<string, boolean>,
) {
  const top3 = organicResults.slice(0, 3);
  const domains = top3.map((c) => c.domain).filter(Boolean);
  const dominantTone =
    domains.length >= 2 && new Set(domains).size === 1
      ? `头部结果高度集中在「${domains[0]}」一类站点，说明该词可能被少数站点定义。`
      : domains.length > 0
        ? `前几名站点类型较分散（${domains.slice(0, 3).join("、")}），说明 SERP 对「谁算权威」尚未被单一类型垄断。`
        : "当前抓取到的自然结果较少，可能受地域/语言或抓取失败影响。";

  const serpSummary = {
    headline: `关于「${keyword}」，Google 第一页大致长这样`,
    paragraphs: [
      `本页共识别到 ${counts.organicCount} 条自然结果；通常你会和这些标题/域名抢同一屏注意力。`,
      dominantTone,
      counts.shoppingCount > 0
        ? `出现 ${counts.shoppingCount} 组购物/商品相关结果：用户除了看文章，也会直接被导向比价与下单路径。`
        : "未出现明显的购物结果块：更像信息检索或内容消费型 SERP。",
      counts.paaCount > 0
        ? `出现「大家还在问」(PAA) 共 ${counts.paaCount} 组：说明用户真实疑问很多，适合做 FAQ 与长尾覆盖。`
        : "未抓到 PAA：不代表没有，但第一页上「可借题发挥」的公开问题信号较弱。",
    ],
    topWinners: top3.map((c) => ({
      rank: c.rank,
      domain: c.domain,
      title: c.title,
    })),
  };

  const featureDefs: Array<{ key: keyof typeof rawSignals; label: string; hint: string }> = [
    { key: "shoppingResults", label: "购物/商品列表", hint: "更像交易或强对比决策" },
    { key: "peopleAlsoAsk", label: "大家还在问（PAA）", hint: "适合做 FAQ、短答与长尾问题" },
    { key: "featuredSnippet", label: "精选摘要", hint: "更偏「直接回答」与结构化段落" },
    { key: "knowledgeGraph", label: "知识图谱/实体卡片", hint: "品牌/实体词要更谨慎对齐事实" },
    { key: "video", label: "视频结果", hint: "可考虑视频脚本与关键帧信息" },
    { key: "imagePack", label: "图片聚合", hint: "视觉信息权重更高" },
    { key: "localPack", label: "本地包", hint: "地域、门店、服务半径信息更重要" },
    { key: "faq", label: "FAQ 富结果", hint: "结构化问答与可点击问题" },
    { key: "howTo", label: "HowTo 富结果", hint: "步骤型内容更容易被识别" },
    { key: "reviewStars", label: "评价星级展示", hint: "信任信号与口碑内容更关键" },
  ];

  const present = featureDefs.filter((f) => rawSignals[f.key]);

  const serpFeaturesSummary = {
    headline: "这一页有哪些「特色板块」？",
    present: present.map((f) => ({ name: f.label, meaning: f.hint })),
    interpretation:
      present.length === 0
        ? "第一页上未识别到常见富结果（PAA/购物/精选摘要等），竞争更偏传统标题与摘要比拼。"
        : `识别到 ${present.length} 类特色板块：它们会改变用户点击路径，也会影响你应该优先补齐的内容形态（例如 PAA→FAQ）。`,
    extraNotes: [
      counts.relatedSearchCount > 0 ? `底部相关搜索约 ${counts.relatedSearchCount} 组：可当作「主题扩展词」候选。` : "",
      counts.faqCount > 0 ? `出现 FAQ 富结果 ${counts.faqCount} 组：更像「问答型」SERP。` : "",
      counts.hasKnowledgeGraph ? "出现知识图谱：更像实体/品牌词，事实一致性要求更高。" : "",
    ].filter(Boolean),
  };

  return { serpSummary, serpFeaturesSummary };
}

/** Layer4：把分析落成「打法手册」 */
function buildStrategyPlaybook(
  keyword: string,
  layer1Data: any,
  layer2Data: any,
  layer3Data: any,
  strategist: any,
) {
  const organic: Array<{ title: string; domain: string }> = layer1Data?.organicResults ?? [];
  const paa: string[] = layer1Data?.paaQuestions ?? [];
  const queryPattern = layer2Data?.queryPattern ?? "Mixed";
  const viability = layer2Data?.viabilityGate ?? { score: 0, canProceed: true };
  const primary = layer3Data?.decision?.primaryAsset ?? "Article / Guide";
  const alignment = layer3Data?.pageTypeAlignment;

  const titleBlob = organic.map((o) => `${o.title}`).join(" ").toLowerCase();
  const tactics: string[] = [];
  if (queryPattern === "Transactional" || layer1Data?.shoppingCount > 0) {
    tactics.push("优先做「可下单/可对比」路径：规格、价格区间、适用人群、售后与风险点要写清。");
  }
  if (queryPattern === "Commercial Investigation" || /best|top|vs|compare|review/i.test(keyword)) {
    tactics.push("用「对比维度 + 结论」组织信息：先给结论，再给证据，最后给购买/选择建议。");
  }
  if (queryPattern === "How-To / Guide") {
    tactics.push("用「步骤 + 检查清单」组织信息：每一步给出可执行动作与常见失败原因。");
  }
  if (paa.length > 0) {
    tactics.push(`把 PAA 的前 5 个问题当作「必须回答清单」，用短答 + 可展开段落混排。`);
  }
  if (!tactics.length) {
    tactics.push("用「定义 → 关键概念 → 常见误区 → 可执行建议」的信息架构覆盖主意图。");
  }

  const competitorGaps: string[] = [];
  if (paa.length > 0 && !titleBlob.includes("faq") && !titleBlob.includes("question")) {
    competitorGaps.push("TOP 结果标题较少直接承诺「问答/FAQ」，但 PAA 显示用户问题很多：用 FAQ 模块更容易拿到增量。");
  }
  if (!/\b20(2[4-9]|3[0-9])\b/.test(titleBlob)) {
    competitorGaps.push("TOP 标题普遍缺少明确年份/版本信号：用「2026 更新/最新」做 freshness 差异化（前提是内容真能更新）。");
  }
  if (organic.length >= 5) {
    const longTitles = organic.filter((o) => (o.title?.length ?? 0) >= 42).length;
    if (longTitles <= 2) {
      competitorGaps.push("多数标题偏短、信息密度低：可用「更具体的承诺 + 量化结果」提升 CTR。");
    }
  }
  if (!competitorGaps.length) {
    competitorGaps.push("从标题上看差异点不极端：更需要从正文结构（表格/对比/清单）做体验型差异化。");
  }

  const problemsOrRisks: string[] = [];
  if (viability.canProceed === false) {
    problemsOrRisks.push("可行性评分偏低：强权威站点占比过高，直接硬碰主词可能成本高、周期长。");
  } else if (viability.score < 65) {
    problemsOrRisks.push("可行性一般：需要更窄的长尾词或更垂直的场景切入，否则容易陷入同质化。");
  }
  if (layer2Data?.intentSplit?.isSplit) {
    problemsOrRisks.push("意图分散：同一页要同时满足「了解 + 对比 + 购买」会更难，需要明确主 CTA 与副路径。");
  }
  if (alignment && alignment.aligned === false) {
    problemsOrRisks.push(`你偏好的主形态（${primary}）与 SERP 主流页面类型不完全一致：需要额外证明「为什么用户该点你」。`);
  }
  if (!problemsOrRisks.length) {
    problemsOrRisks.push("未发现「硬阻断级」问题：主要风险来自执行质量与内容可信度，而不是 SERP 形态本身。");
  }

  const yourActions: string[] = [
    `先按「${primary}」落地一版最小可用页面：把 H1、首屏承诺、目录结构一次性定稿。`,
    strategist?.mustCover?.length
      ? `把 ${strategist.mustCover.length} 条「必写点」逐条变成小节标题（不要只堆在文末）。`
      : "把「用户最关心的 3 个问题」写成前 3 个小节，并每节给出可执行结论。",
    paa.length ? "从 PAA 抽 5 个问题：每个问题写 60-120 字短答 + 链接到更深的段落。" : "补充「常见误解/反直觉点」：用来制造记忆点与分享点。",
    "把本页最终 JSON 复制到内容生成流程里，作为硬约束（必写/缺口/误区）。",
  ];

  return {
    angle: `主打法：${primary}（查询模式：${queryPattern}）`,
    tactics,
    competitorGaps,
    problemsOrRisks,
    yourActions,
  };
}

/**
 * Layer 1: 数据采集层
 * - SERP 抓取 (organic)
 * - Related Keywords 抓取
 * - Shopping / PAA / Suggest 信号提取
 */
async function processLayer1(keyword: string, location: string, language: string) {
  // 1a. SERP organic results
  const serpPayload = {
    keyword,
    location_code: parseInt(location ?? "2156"),
    language_code: language ?? "zh-cn",
    depth: 10,
  };

  const serpResponse = await fetch(DATAFORSEO_SERP_URL, {
    method: "POST",
    headers: {
      "Authorization": getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify([serpPayload]),
  });

  let serpItems: any[] = [];
  if (serpResponse.ok) {
    const serpJson = await serpResponse.json();
    serpItems = serpJson?.tasks?.[0]?.result?.[0]?.items ?? [];
  }

  // 1b. Keyword suggestions
  const keywordPayload = {
    keyword,
    location_code: parseInt(location ?? "2156"),
    language_code: language ?? "zh-cn",
    limit: 50,
  };

  const keywordResponse = await fetch(DATAFORSEO_KEYWORD_SUGGESTIONS_URL, {
    method: "POST",
    headers: {
      "Authorization": getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify([keywordPayload]),
  });

  let keywordSuggestions: string[] = [];
  if (keywordResponse.ok) {
    const keywordJson = await keywordResponse.json();
    keywordSuggestions =
      keywordJson?.tasks?.[0]?.result?.[0]?.items
        ?.slice(0, 10)
        ?.map((item: any) => item.keyword ?? "")
        ?.filter((k: string) => k.length > 0) ?? [];
  }

  // 1c. Extract signals from SERP items
  const organicResults = serpItems.filter((item: any) => item.type === "organic");
  const shoppingResults = serpItems.filter((item: any) => item.type === "shopping_results");
  const paaItems = serpItems.filter((item: any) => item.type === "people_also_ask");
  const faqItems = serpItems.filter((item: any) => item.type === "faq");
  const relatedSearches = serpItems.filter((item: any) => item.type === "related_searches");
  const knowledgeGraph = serpItems.filter((item: any) => item.type === "knowledge_graph");

  const base = {
    organicCount: organicResults.length,
    shoppingCount: shoppingResults.length,
    paaCount: paaItems.length,
    faqCount: faqItems.length,
    relatedSearchCount: relatedSearches.length,
    hasKnowledgeGraph: knowledgeGraph.length > 0,
    organicResults: organicResults.map((item: any) => ({
      rank: item.rank,
      title: item.title,
      url: item.url,
      domain: item.url ? (() => { try { return new URL(item.url).hostname.replace("www.", ""); } catch { return ""; } })() : "",
      description: item.description,
    })).slice(0, 10),
    shoppingSignals: shoppingResults.map((item: any) => ({
      title: item.title,
      price: item.price,
      source: item.source,
    })).slice(0, 5),
    paaQuestions: paaItems.flatMap((item: any) => item.items ?? []).map((q: any) => q.title ?? "").slice(0, 10),
    relatedKeywords: keywordSuggestions,
    rawSignals: {
      featuredSnippet: serpItems.some((i: any) => i.type === "featured_snippet"),
      peopleAlsoAsk: paaItems.length > 0,
      knowledgeGraph: knowledgeGraph.length > 0,
      video: serpItems.some((i: any) => i.type === "video"),
      imagePack: serpItems.some((i: any) => i.type === "image_pack"),
      localPack: serpItems.some((i: any) => i.type === "local_pack"),
      shoppingResults: shoppingResults.length > 0,
      faq: faqItems.length > 0,
      howTo: serpItems.some((i: any) => i.type === "how_to"),
      reviewStars: serpItems.some((i: any) => i.type === "review_stars"),
    },
  };

  const organicSlice = base.organicResults as Array<{ rank: number; title: string; domain: string; description?: string }>;
  const { serpSummary, serpFeaturesSummary } = buildSerpNarrativeSummaries(
    keyword,
    organicSlice,
    {
      organicCount: base.organicCount,
      shoppingCount: base.shoppingCount,
      paaCount: base.paaCount,
      faqCount: base.faqCount,
      relatedSearchCount: base.relatedSearchCount,
      hasKnowledgeGraph: base.hasKnowledgeGraph,
    },
    base.rawSignals,
  );

  return { ...base, serpSummary, serpFeaturesSummary };
}

/**
 * Layer 2: SERP 预判层
 * - 页面类型识别
 * - Query Pattern 分类
 * - Intent Split 检测
 * - Keyword Viability Gate
 */
async function processLayer2(keyword: string, location: string, language: string, layer1Data: any) {
  // Reuse classification logic from original strategy
  type PageType =
    | "Listicle" | "Content" | "Product" | "Tool"
    | "Homepage" | "Wiki" | "Forum" | "Documentation";

  function classifyPageType(url: string, title: string): PageType {
    const u = url.toLowerCase();
    const t = title.toLowerCase();
    if (u.includes("wikipedia.org") || u.includes("/wiki/") || u.includes("baike.")) return "Wiki";
    if (u.includes("reddit.com") || u.includes("quora.com") || u.includes("zhihu.com") || u.includes("forum") || u.includes("stackoverflow.com")) return "Forum";
    if (u.includes("/docs/") || u.includes("/documentation/") || u.includes("developer.") || u.includes("api.")) return "Documentation";
    if (u.endsWith("/") && (() => { try { return new URL(u).pathname === "/"; } catch { return false; } })()) return "Homepage";
    if (u.includes("/product/") || u.includes("/item/") || u.includes("/shop/") || u.includes("/p/") || u.includes("amazon.com") || u.includes("ebay.com") || u.includes("dhgate.com") || u.includes("aliexpress.com") || t.includes("buy") || t.includes("price") || t.includes("shop") || t.includes("$")) return "Product";
    if (u.includes("/tool") || u.includes("/calculator") || u.includes("/generator") || u.includes("/converter") || t.includes("tool") || t.includes("calculator") || t.includes("online")) return "Tool";
    if (t.includes("best") || t.includes("top ") || t.includes("top 10") || t.includes("vs") || t.includes("versus") || t.includes("comparison") || t.includes("compare") || t.includes("ranking") || u.includes("/best-") || u.includes("/top-")) return "Listicle";
    return "Content";
  }

  const pageTypeMap: Record<string, number> = {};
  const classifiedCompetitors: Array<{ rank: number; title: string; url: string; domain: string; pageType: string }> = [];

  for (const item of (layer1Data?.organicResults ?? [])) {
    const pageType = classifyPageType(item.url ?? "", item.title ?? "");
    pageTypeMap[pageType] = (pageTypeMap[pageType] ?? 0) + 1;
    classifiedCompetitors.push({
      rank: item.rank ?? classifiedCompetitors.length + 1,
      title: item.title ?? "",
      url: item.url ?? "",
      domain: item.domain ?? "",
      pageType,
    });
  }

  const total = classifiedCompetitors.length || 1;
  const pageTypeDistribution = Object.entries(pageTypeMap).map(([type, count]) => ({
    type,
    count,
    percentage: Math.round((count as number / total) * 100),
  }));

  // Query Pattern classification
  const queryPattern = (() => {
    const t = keyword.toLowerCase();
    if (t.startsWith("how to") || t.startsWith("how do") || t.includes("guide") || t.includes("tutorial")) return "How-To / Guide";
    if (t.startsWith("best") || t.startsWith("top") || t.includes("vs") || t.includes("compare") || t.includes("review")) return "Commercial Investigation";
    if (t.startsWith("what is") || t.startsWith("who is") || t.startsWith("why") || t.startsWith("when")) return "Informational / Knowledge";
    if (t.includes("buy") || t.includes("price") || t.includes("cheap") || t.includes("discount") || t.includes("deal")) return "Transactional";
    if (t.includes("near me") || t.includes("nearby") || t.includes("location")) return "Local";
    if (t.includes("alternative") || t.includes("similar") || t.includes("like")) return "Alternative Seeking";
    return "Mixed";
  })();

  // Intent Split detection
  const dominantType = pageTypeDistribution.sort((a, b) => b.percentage - a.percentage)[0];
  const intentSplit = {
    dominantIntent: dominantType?.type ?? "Unknown",
    dominantPercentage: dominantType?.percentage ?? 0,
    isSplit: pageTypeDistribution.filter((p: any) => p.percentage >= 20).length > 1,
    mixedIntents: pageTypeDistribution.filter((p: any) => p.percentage >= 20).map((p: any) => ({ type: p.type, percentage: p.percentage })),
  };

  // Keyword Viability Gate
  const strongDomains = ["wikipedia.org", "amazon.com", "zhihu.com", "baidu.com", "quora.com", "reddit.com", "medium.com", "nih.gov", "healthline.com", "forbes.com", "nytimes.com", "google.com"];
  const competitorDomains = classifiedCompetitors.map(c => c.domain);
  const strongCompetitorCount = competitorDomains.filter(d => strongDomains.some(sd => d.includes(sd))).length;

  const viabilityGate = {
    canProceed: true,
    score: Math.max(0, 100 - strongCompetitorCount * 10 - (intentSplit.isSplit ? 10 : 0)),
    warnings: [] as string[],
    blockers: [] as string[],
  };

  if (strongCompetitorCount >= 7) {
    viabilityGate.canProceed = false;
    viabilityGate.blockers.push("竞争极强：TOP 10 中有 7+ 个权威域名，不建议直接竞争");
  } else if (strongCompetitorCount >= 5) {
    viabilityGate.warnings.push("竞争激烈：TOP 10 中有 5+ 个权威域名，需要强差异化策略");
  }

  if (intentSplit.isSplit) {
    viabilityGate.warnings.push("意图分散：搜索结果包含多种页面类型，需明确主意图");
  }

  return {
    pageTypeRecognition: {
      distribution: pageTypeDistribution,
      classifiedCompetitors,
    },
    queryPattern,
    intentSplit,
    viabilityGate,
  };
}

/**
 * Layer 3: 资产路由层
 * - Asset Fit Scoring
 * - Primary Asset + Support Assets 决策
 */
async function processLayer3(keyword: string, location: string, language: string, layer1Data: any, layer2Data: any) {
  const queryPattern = layer2Data?.queryPattern ?? "";
  const pageTypeDist = layer2Data?.pageTypeRecognition?.distribution ?? [];
  const dominantPageType = pageTypeDist[0]?.type ?? "";

  // Asset types and their fit for different query patterns
  const assetScores: Record<string, Record<string, number>> = {
    "Article / Guide": {
      "How-To / Guide": 95,
      "Informational / Knowledge": 90,
      "Commercial Investigation": 60,
      "Transactional": 30,
      "Local": 40,
      "Alternative Seeking": 70,
      "Mixed": 65,
    },
    "Product Page": {
      "Transactional": 95,
      "Commercial Investigation": 50,
      "How-To / Guide": 20,
      "Informational / Knowledge": 15,
      "Local": 40,
      "Alternative Seeking": 60,
      "Mixed": 40,
    },
    "Collection / Bestlist": {
      "Commercial Investigation": 95,
      "Alternative Seeking": 85,
      "Transactional": 60,
      "How-To / Guide": 30,
      "Informational / Knowledge": 40,
      "Local": 30,
      "Mixed": 55,
    },
    "Comparison Page": {
      "Alternative Seeking": 95,
      "Commercial Investigation": 85,
      "Transactional": 50,
      "How-To / Guide": 20,
      "Informational / Knowledge": 30,
      "Local": 20,
      "Mixed": 45,
    },
    "QA / FAQ Page": {
      "Informational / Knowledge": 85,
      "How-To / Guide": 70,
      "Commercial Investigation": 40,
      "Transactional": 20,
      "Local": 50,
      "Alternative Seeking": 35,
      "Mixed": 50,
    },
    "Tool / Calculator": {
      "Transactional": 60,
      "Commercial Investigation": 40,
      "How-To / Guide": 50,
      "Informational / Knowledge": 30,
      "Local": 40,
      "Alternative Seeking": 25,
      "Mixed": 45,
    },
  };

  // Score each asset type for the current query pattern
  const scoredAssets = Object.entries(assetScores).map(([asset, scores]) => ({
    asset,
    score: scores[queryPattern] ?? 50,
  })).sort((a, b) => b.score - a.score);

  // Primary + Support assets decision
  const primaryAsset = scoredAssets[0]?.asset ?? "Article / Guide";
  const supportAssets = scoredAssets.slice(1, 3).map(a => a.asset);

  // Page type alignment check
  const pageTypeAlignment = {
    primaryAsset,
    dominantSerppageType: dominantPageType,
    aligned: (() => {
      const alignment: Record<string, string[]> = {
        "Listicle": ["Collection / Bestlist", "Comparison Page"],
        "Content": ["Article / Guide", "QA / FAQ Page"],
        "Product": ["Product Page"],
        "Tool": ["Tool / Calculator"],
        "Forum": ["QA / FAQ Page"],
        "Wiki": ["Article / Guide", "QA / FAQ Page"],
      };
      return (alignment[dominantPageType] ?? []).includes(primaryAsset);
    })(),
  };

  return {
    assetFitScoring: scoredAssets,
    decision: {
      primaryAsset,
      supportAssets,
      primaryScore: scoredAssets[0]?.score ?? 0,
    },
    pageTypeAlignment,
  };
}

/**
 * Layer 4: 分支策略层
 * 根据 Primary Asset 调用对应的 Strategist
 */
async function processLayer4(keyword: string, location: string, language: string, layer1Data: any, layer2Data: any, layer3Data: any) {
  const primaryAsset = layer3Data?.decision?.primaryAsset ?? "Article / Guide";
  const competitors = layer1Data?.organicResults ?? [];
  const pageTypeDist = layer2Data?.pageTypeRecognition?.distribution ?? [];
  const queryPattern = layer2Data?.queryPattern ?? "";

  // Common competitor analysis
  const competitorAnalysis = {
    totalAnalyzed: competitors.length,
    avgTitleLength: competitors.reduce((sum: number, c: any) => sum + (c.title?.length ?? 0), 0) / (competitors.length || 1),
    domains: competitors.map((c: any) => c.domain),
    commonPatterns: [] as string[],
  };

  // 10A. Article Strategist
  const articleStrategist = {
    asset: "Article / Guide",
    h1: `${keyword} - Complete Guide (2026)`,
    targetWordCount: 2200,
    mustCover: [
      `What is ${keyword} and why it matters`,
      `Key factors to consider when evaluating ${keyword}`,
      `Step-by-step breakdown`,
      `Common mistakes to avoid`,
      `Actionable recommendations`,
    ],
    structure: [
      "H1: Main title with primary keyword + year qualifier",
      "H2: Introduction + what readers will learn",
      "H2: Core concepts explained",
      "H2: Step-by-step guide or framework",
      "H2: Best practices and tips",
      "H2: Common mistakes",
      "H2: FAQ (6-8 questions from PAA)",
    ],
    seoSignals: [
      "Include primary keyword in H1, first 100 words, and 2-3 H2s",
      "Add HowTo or Article schema",
      "Internal link to related product/collection pages",
    ],
  };

  // 10B. Product Strategist
  const productStrategist = {
    asset: "Product Page",
    mustCover: [
      `Clear value proposition for ${keyword}`,
      `Key features and specifications`,
      `Social proof (reviews, ratings, testimonials)`,
      `Pricing and availability`,
      `Strong CTA above the fold`,
    ],
    structure: [
      "Hero: Product image + H1 + price + CTA",
      "Key features (3-5 bullet points)",
      "Detailed specifications",
      "Customer reviews section",
      "Related products / alternatives",
      "FAQ section",
    ],
    seoSignals: [
      "Product schema with price, availability, rating",
      "Primary keyword in H1 and meta title",
      "Fast load time (<3s) for Core Web Vitals",
    ],
  };

  // 10C. Collection/Bestlist Strategist
  const collectionStrategist = {
    asset: "Collection / Bestlist",
    mustCover: [
      `Curated list of top ${keyword} options`,
      `Comparison criteria and methodology`,
      `Individual product breakdowns with pros/cons`,
      `Comparison table`,
      `Buying guide / how to choose`,
    ],
    structure: [
      "H1: Best [Keyword] in [Year] - Top [N] Picks",
      "H2: Quick picks (top 3 summary)",
      "H2: Comparison methodology",
      "H2: Detailed reviews (each product: features, pros, cons, price)",
      "H2: Comparison table",
      "H2: Buying guide",
      "H2: FAQ",
    ],
    seoSignals: [
      "ItemList or FAQ schema",
      "Year qualifier in title for freshness",
      "Internal links to individual product pages",
    ],
  };

  // 10D. Comparison Strategist
  const comparisonStrategist = {
    asset: "Comparison Page",
    mustCover: [
      `Head-to-head comparison of ${keyword} options`,
      `Clear winner recommendation`,
      `Feature-by-feature breakdown`,
      `Use case recommendations`,
      `Price comparison`,
    ],
    structure: [
      "H1: [A] vs [B] vs [C] - Which [Keyword] Is Best?",
      "H2: Quick verdict",
      "H2: Detailed comparison (features, performance, price)",
      "H2: Comparison table",
      "H2: Who should choose which",
      "H2: FAQ",
    ],
    seoSignals: [
      "ComparisonTable schema if applicable",
      "Target long-tail '[A] vs [B]' keywords",
      "Internal links to individual product pages",
    ],
  };

  // 10E. QA Strategist
  const qaStrategist = {
    asset: "QA / FAQ Page",
    mustCover: [
      `Direct answers to top PAA questions about ${keyword}`,
      `Concise, scannable answers (40-60 words each)`,
      `Related questions and answers`,
      `Links to deeper content for follow-up`,
    ],
    structure: [
      "H1: [Keyword] - Frequently Asked Questions",
      "H2: Top questions (direct answers, 40-60 words)",
      "H2: Related questions",
      "H2: Deep-dive links to full articles",
    ],
    seoSignals: [
      "FAQPage schema for all Q&As",
      "Target featured snippet positions",
      "Each answer should be concise and direct",
    ],
  };

  // Select the right strategist based on primary asset
  const strategistMap: Record<string, any> = {
    "Article / Guide": articleStrategist,
    "Product Page": productStrategist,
    "Collection / Bestlist": collectionStrategist,
    "Comparison Page": comparisonStrategist,
    "QA / FAQ Page": qaStrategist,
    "Tool / Calculator": { asset: "Tool / Calculator", note: "Tool strategy - requires custom implementation" },
  };

  const selectedStrategist = strategistMap[primaryAsset] ?? articleStrategist;

  const playbook = buildStrategyPlaybook(keyword, layer1Data, layer2Data, layer3Data, selectedStrategist);

  return {
    primaryStrategist: selectedStrategist,
    allStrategists: {
      articleStrategist,
      productStrategist,
      collectionStrategist,
      comparisonStrategist,
      qaStrategist,
    },
    competitorAnalysis,
    playbook,
  };
}

/**
 * Layer 5: 控制信号生成层
 * - Fallback Rule Strategy
 * - GPT 生成控制信号
 */
async function processLayer5(keyword: string, location: string, language: string, layer1Data: any, layer2Data: any, layer3Data: any, layer4Data: any) {
  const primaryAsset = layer3Data?.decision?.primaryAsset ?? "Article / Guide";
  const strategist = layer4Data?.primaryStrategist ?? {};
  const pageTypeDist = layer2Data?.pageTypeRecognition?.distribution ?? [];
  const competitors = layer1Data?.organicResults ?? [];
  const paaQuestions = layer1Data?.paaQuestions ?? [];
  const viabilityGate = layer2Data?.viabilityGate ?? {};

  // Fallback Rule Strategy (rule-based, always available)
  const fallbackStrategy = {
    pageType: primaryAsset,
    entryPoint: strategist.mustCover?.[0] ?? `Create comprehensive content about ${keyword}`,
    mustWrite: strategist.mustCover ?? [],
    gaps: (() => {
      // Identify gaps: what competitors are missing
      const gaps: string[] = [];
      if (paaQuestions.length > 0 && !competitors.some((c: any) => c.title?.toLowerCase().includes("faq"))) {
        gaps.push(`TOP 10 results lack dedicated FAQ section despite ${paaQuestions.length} PAA questions`);
      }
      if (!competitors.some((c: any) => c.title?.toLowerCase().includes("2026") || c.title?.toLowerCase().includes("2025"))) {
        gaps.push("No results include year qualifier - add freshness signal");
      }
      return gaps;
    })(),
    misconceptions: (() => {
      // Placeholder - would need deeper content analysis
      return [] as string[];
    })(),
    titleSuggestions: [
      `${keyword} - Complete Guide (2026)`,
      `Best ${keyword}: Expert Review & Comparison`,
      `${keyword}: What You Need to Know`,
    ],
    contentStructure: strategist.structure ?? [],
    seoControls: strategist.seoSignals ?? [],
  };

  // GPT enhancement (if API key available)
  let gptStrategy = null;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const competitorsSummary = competitors.slice(0, 5).map((c: any, i: number) =>
        `#${i + 1}: ${c.title} (${c.domain})`
      ).join("\n");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `你是一个"生成控制信号"输出引擎。
输出不是内容草稿，而是给下游内容生成模型直接消费的控制信号。

规则：
1. 每个字段必须回答"这会如何影响后续生成"
2. 差异化必须基于 SERP 缺口，禁止通用建议
3. 禁止输出"加图片、加视频"等可套用到任何 query 的空泛建议
4. 优先输出：必写项 > 缺口项 > 误区项 > 结构项 > 首段项 > FAQ项

输出严格 JSON。`,
            },
            {
              role: "user",
              content: `关键词：${keyword}
查询模式：${layer2Data?.queryPattern ?? ""}
主要资产类型：${primaryAsset}
竞争对手：${competitorsSummary}
PAA问题：${paaQuestions.slice(0, 5).join(", ")}

请输出 JSON 格式的生成控制信号，包含：
- mustWrite: 必写项（基于竞品缺口）
- gaps: SERP 缺口项
- misconceptions: 误区纠正项
- titleSuggestions: 3-5个标题
- contentStructure: 内容结构
- seoControls: SEO 控制信号`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          gptStrategy = JSON.parse(content);
        }
      }
    } catch {
      // GPT failed, use fallback
    }
  }

  // Final output: merge GPT enhancement with fallback
  const finalStrategy = gptStrategy
    ? {
        ...fallbackStrategy,
        ...gptStrategy,
        _source: "GPT-4.1 mini enhanced",
      }
    : {
        ...fallbackStrategy,
        _source: "Rule-based fallback",
      };

  const playbook =
    layer4Data?.playbook ??
    buildStrategyPlaybook(keyword, layer1Data, layer2Data, layer3Data, strategist);

  const serpSummary = layer1Data?.serpSummary ?? null;
  const serpFeaturesSummary = layer1Data?.serpFeaturesSummary ?? null;

  const finalBundle = {
    meta: {
      keyword,
      location,
      language,
      generatedAt: new Date().toISOString(),
      queryPattern: layer2Data?.queryPattern ?? null,
      primaryAsset,
    },
    serpSummary,
    serpFeaturesSummary,
    playbook,
    controlSignals: finalStrategy,
    viabilityGate,
  };

  return {
    fallbackStrategy,
    gptStrategy,
    finalStrategy,
    viabilityGate,
    playbook,
    serpSummary,
    serpFeaturesSummary,
    finalBundle,
    /** 给下游内容生成直接粘贴的完整 JSON 字符串 */
    finalBundleJson: JSON.stringify(finalBundle, null, 2),
  };
}

/** 单次编排：只打一次 Layer1（SERP + 相关词），其后全程内存传递，不重复请求 DataForSEO */
async function runStrategyV2Pipeline(keyword: string, location: string, language: string) {
  const l1 = await processLayer1(keyword, location, language);
  const l2 = await processLayer2(keyword, location, language, l1);
  const l3 = await processLayer3(keyword, location, language, l1, l2);
  const l4 = await processLayer4(keyword, location, language, l1, l2, l3);
  const l5 = await processLayer5(keyword, location, language, l1, l2, l3, l4);
  return { layer1: l1, layer2: l2, layer3: l3, layer4: l4, layer5: l5 };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, location, language, layer } = body as {
      keyword: string;
      location?: string;
      language?: string;
      layer?: string;
    };

    if (!keyword) {
      return NextResponse.json({ error: "关键词不能为空" }, { status: 400 });
    }

    const loc = location ?? "2156";
    const lang = language ?? "zh-cn";
    const kw = keyword.trim();

    if (layer === "all") {
      const layers = await runStrategyV2Pipeline(kw, loc, lang);
      return NextResponse.json({ mode: "all" as const, layers });
    }

    let data: any;

    switch (layer) {
      case "layer1":
        data = await processLayer1(kw, loc, lang);
        break;
      case "layer2": {
        const l1 = await processLayer1(kw, loc, lang);
        data = await processLayer2(kw, loc, lang, l1);
        break;
      }
      case "layer3": {
        const l1 = await processLayer1(kw, loc, lang);
        const l2 = await processLayer2(kw, loc, lang, l1);
        data = await processLayer3(kw, loc, lang, l1, l2);
        break;
      }
      case "layer4": {
        const l1 = await processLayer1(kw, loc, lang);
        const l2 = await processLayer2(kw, loc, lang, l1);
        const l3 = await processLayer3(kw, loc, lang, l1, l2);
        data = await processLayer4(kw, loc, lang, l1, l2, l3);
        break;
      }
      case "layer5": {
        const l1 = await processLayer1(kw, loc, lang);
        const l2 = await processLayer2(kw, loc, lang, l1);
        const l3 = await processLayer3(kw, loc, lang, l1, l2);
        const l4 = await processLayer4(kw, loc, lang, l1, l2, l3);
        data = await processLayer5(kw, loc, lang, l1, l2, l3, l4);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown layer" }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error("Strategy V2 analysis error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "分析失败" },
      { status: 500 },
    );
  }
}
