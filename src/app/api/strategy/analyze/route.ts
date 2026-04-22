import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

type PageType =
  | "列表页 (Listicle)"
  | "内容页 (Content)"
  | "产品页 (Product)"
  | "功能页 (Tool)"
  | "首页 (Homepage)"
  | "百科页 (Wiki)"
  | "论坛页 (Forum)"
  | "文档页 (Documentation)";

function classifyPageType(url: string, title: string): PageType {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();

  // Wiki pages
  if (
    urlLower.includes("wikipedia.org") ||
    urlLower.includes("/wiki/") ||
    urlLower.includes("baike.")
  ) {
    return "百科页 (Wiki)";
  }

  // Forum pages
  if (
    urlLower.includes("reddit.com") ||
    urlLower.includes("quora.com") ||
    urlLower.includes("zhihu.com") ||
    urlLower.includes("forum") ||
    urlLower.includes("stackoverflow.com")
  ) {
    return "论坛页 (Forum)";
  }

  // Documentation pages
  if (
    urlLower.includes("/docs/") ||
    urlLower.includes("/documentation/") ||
    urlLower.includes("developer.") ||
    urlLower.includes("api.")
  ) {
    return "文档页 (Documentation)";
  }

  // Homepage
  if (
    urlLower.endsWith("/") &&
    new URL(urlLower).pathname === "/"
  ) {
    return "首页 (Homepage)";
  }

  // Product pages
  if (
    urlLower.includes("/product/") ||
    urlLower.includes("/item/") ||
    urlLower.includes("/shop/") ||
    urlLower.includes("/p/") ||
    urlLower.includes("/prd/") ||
    urlLower.includes("amazon.com") ||
    urlLower.includes("ebay.com") ||
    urlLower.includes("dhgate.com") ||
    urlLower.includes("aliexpress.com") ||
    titleLower.includes("buy") ||
    titleLower.includes("price") ||
    titleLower.includes("shop") ||
    titleLower.includes("$")
  ) {
    return "产品页 (Product)";
  }

  // Tool pages
  if (
    urlLower.includes("/tool") ||
    urlLower.includes("/calculator") ||
    urlLower.includes("/generator") ||
    urlLower.includes("/converter") ||
    titleLower.includes("tool") ||
    titleLower.includes("calculator") ||
    titleLower.includes("generator") ||
    titleLower.includes("online")
  ) {
    return "功能页 (Tool)";
  }

  // Listicle pages
  if (
    titleLower.includes("best") ||
    titleLower.includes("top ") ||
    titleLower.includes("top 10") ||
    titleLower.includes("top 20") ||
    titleLower.includes("vs") ||
    titleLower.includes("versus") ||
    titleLower.includes("comparison") ||
    titleLower.includes("compare") ||
    titleLower.includes("ranking") ||
    urlLower.includes("/best-") ||
    urlLower.includes("/top-") ||
    urlLower.includes("/vs-")
  ) {
    return "列表页 (Listicle)";
  }

  // Content pages (default)
  if (
    titleLower.includes("how to") ||
    titleLower.includes("guide") ||
    titleLower.includes("tutorial") ||
    titleLower.includes("what is") ||
    titleLower.includes("complete guide") ||
    urlLower.includes("/guide/") ||
    urlLower.includes("/blog/") ||
    urlLower.includes("/article/")
  ) {
    return "内容页 (Content)";
  }

  // Default to content page
  return "内容页 (Content)";
}

function determineSearchIntent(
  pageTypeDistribution: Array<{ type: string; percentage: number }>,
  serpFeatures: string[],
): string {
  const listicle =
    pageTypeDistribution.find((p) => p.type.includes("列表页"))?.percentage ?? 0;
  const content =
    pageTypeDistribution.find((p) => p.type.includes("内容页"))?.percentage ?? 0;
  const product =
    pageTypeDistribution.find((p) => p.type.includes("产品页"))?.percentage ?? 0;
  const tool =
    pageTypeDistribution.find((p) => p.type.includes("功能页"))?.percentage ?? 0;

  // Shopping results or many product pages indicate transactional intent
  if (
    serpFeatures.includes("shopping_results") ||
    product >= 40
  ) {
    return "交易型意图：用户想购买或比较具体产品，适合做产品页或功能页";
  }

  // Listicle pages indicate commercial investigation
  if (listicle >= 40) {
    return "商业调查意图：用户在寻找推荐和对比，适合做列表页或测评页";
  }

  // Tool pages indicate tool-seeking intent
  if (tool >= 40) {
    return "工具型意图：用户在寻找工具或计算器，适合做功能页";
  }

  // Content pages indicate informational intent
  if (content >= 40) {
    return "信息型意图：用户想了解知识或解决问题，适合做内容页或教程页";
  }

  return "混合意图：搜索结果类型较分散，建议采用混合页策略（内容+列表或内容+工具）";
}

function assessCompetitionLevel(
  competitors: Array<{ domain: string; pageType: string }>,
): string {
  const strongDomains = [
    "wikipedia.org",
    "amazon.com",
    "zhihu.com",
    "baidu.com",
    "quora.com",
    "reddit.com",
    "medium.com",
    "nih.gov",
    "healthline.com",
    "forbes.com",
    "nytimes.com",
  ];

  let strongCount = 0;
  for (const c of competitors) {
    if (strongDomains.some((d) => c.domain.includes(d))) {
      strongCount++;
    }
  }

  if (strongCount >= 7) return "极强";
  if (strongCount >= 5) return "强";
  if (strongCount >= 3) return "中等";
  return "弱";
}

/**
 * Fetch a webpage and extract key content metrics for competitor analysis
 * Only extracts: word count, headings (H1-H3), meta description, image count, FAQ/table/video presence
 */
async function fetchPageContentSummary(url: string): Promise<{
  wordCount: number;
  headings: string[];
  metaDescription: string;
  imageCount: number;
  hasFAQ: boolean;
  hasTable: boolean;
  hasVideo: boolean;
}> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    // Timeout after 5 seconds
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  // Extract meta description
  const metaDescMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
  );
  const metaDescription = metaDescMatch?.[1] ?? "";

  // Extract headings (H1-H3)
  const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
  const headings: string[] = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    // Strip HTML tags from heading content
    const text = match[1].replace(/<[^>]*>/g, "").trim();
    if (text) {
      headings.push(text);
    }
  }

  // Count images
  const imageMatches = html.match(/<img[^>]*>/gi);
  const imageCount = imageMatches?.length ?? 0;

  // Check for FAQ section
  const hasFAQ =
    /faq|frequently asked question|常见问题|常见问题解答/i.test(html);

  // Check for tables
  const hasTable = /<table/i.test(html);

  // Check for videos
  const hasVideo =
    /<iframe[^>]*(youtube|vimeo)|<video|<source[^>]*type=["']video/i.test(html);

  // Estimate word count (rough: count text content, strip HTML)
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = textContent.split(/\s+/).filter((w) => w.length > 0).length;

  return {
    wordCount,
    headings: headings.slice(0, 20), // Limit to top 20 headings
    metaDescription,
    imageCount,
    hasFAQ,
    hasTable,
    hasVideo,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, location, language } = body as {
      keyword: string;
      location?: string;
      language?: string;
    };

    if (!keyword) {
      return NextResponse.json(
        { error: "关键词不能为空" },
        { status: 400 },
      );
    }

    // Create analysis record
    const analysis = await prisma.strategyAnalysis.create({
      data: {
        keyword,
        location: location ?? "2156",
        language: language ?? "zh-cn",
        status: "running",
      },
    });

    // Call DataForSEO SERP API
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

    if (!serpResponse.ok) {
      const errorText = await serpResponse.text();
      throw new Error(
        `DataForSEO SERP API failed: ${serpResponse.status} - ${errorText}`,
      );
    }

    const serpJson = await serpResponse.json();
    const serpResults = serpJson?.tasks?.[0]?.result?.[0]?.items ?? [];

    // Call DataForSEO Keyword Suggestions API
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

    // Extract organic results
    const organicResults = serpResults.filter(
      (item: any) => item.type === "organic",
    );

    // Classify page types and fetch page content
    const competitors: Array<{
      rank: number;
      title: string;
      url: string;
      domain: string;
      pageType: string;
      contentSummary?: {
        wordCount: number;
        headings: string[];
        metaDescription: string;
        imageCount: number;
        hasFAQ: boolean;
        hasTable: boolean;
        hasVideo: boolean;
      };
    }> = [];
    const pageTypeMap: Record<string, number> = {};

    for (let i = 0; i < Math.min(organicResults.length, 10); i++) {
      const item = organicResults[i];
      const pageType = classifyPageType(item.url ?? "", item.title ?? "");
      pageTypeMap[pageType] = (pageTypeMap[pageType] ?? 0) + 1;

      let domain = "";
      try {
        domain = new URL(item.url).hostname.replace("www.", "");
      } catch {
        domain = item.url ?? "";
      }

      // Fetch page content for analysis (top 5 only to avoid rate limiting)
      let contentSummary = undefined;
      if (i < 5) {
        try {
          contentSummary = await fetchPageContentSummary(item.url ?? "");
        } catch (e) {
          console.warn(`Failed to fetch content for ${item.url}:`, e);
        }
      }

      competitors.push({
        rank: i + 1,
        title: item.title ?? "",
        url: item.url ?? "",
        domain,
        pageType,
        contentSummary,
      });
    }

    // Build page type distribution
    const totalCompetitors = competitors.length || 1;
    const pageTypeDistribution = Object.entries(pageTypeMap).map(
      ([type, count]) => ({
        type,
        label: type,
        count,
        percentage: Math.round((count / totalCompetitors) * 100),
      }),
    );

    // Extract SERP features
    const serpFeatures: string[] = [];
    const featureMap: Record<string, string> = {
      featured_snippet: "featured_snippet (精选摘要)",
      people_also_ask: "people_also_ask (相关提问)",
      knowledge_graph: "knowledge_graph (知识面板)",
      video: "video (视频)",
      image_pack: "image_pack (图片包)",
      local_pack: "local_pack (本地包)",
      shopping_results: "shopping_results (购物结果)",
      related_searches: "related_searches (相关搜索)",
      sitelinks: "sitelinks (子链接)",
      faq: "faq (常见问题)",
      how_to: "how_to (操作指南)",
      review_stars: "review_stars (评价星级)",
    };

    const allTypes = serpResults.map((item: any) => item.type);
    for (const [key, label] of Object.entries(featureMap)) {
      if (allTypes.includes(key)) {
        serpFeatures.push(label);
      }
    }

    // Determine search intent
    const searchIntent = determineSearchIntent(pageTypeDistribution, serpFeatures);

    // Assess competition level
    const competitionLevel = assessCompetitionLevel(competitors);

    // Generate recommended strategy using rule-based logic first
    const recommendedStrategy = generateRecommendedStrategy(
      pageTypeDistribution,
      competitionLevel,
      serpFeatures,
      competitors,
    );

    // Enhance strategy with GPT-4.1 mini
    let enhancedStrategy = recommendedStrategy;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        enhancedStrategy = await generateStrategyWithGPT({
          keyword,
          searchIntent,
          pageTypeDistribution,
          serpFeatures,
          competitionLevel,
          competitors,
          relatedKeywords: keywordSuggestions,
        });
      } catch (e) {
        console.warn("GPT strategy generation failed, using rule-based fallback:", e);
        // Keep using rule-based strategy
      }
    }

    // Build JSON output for content generation
    const jsonOutput = {
      keyword,
      searchIntent,
      competitionLevel,
      pageTypeDistribution,
      serpFeatures,
      topCompetitors: competitors.slice(0, 5).map(c => ({
        title: c.title,
        url: c.url,
        domain: c.domain,
        pageType: c.pageType,
      })),
      recommendedStrategy: enhancedStrategy,
      relatedKeywords: keywordSuggestions,
      contentPrompt: `基于以上SERP分析，为关键词"${keyword}"生成内容策略。
推荐页面类型：${enhancedStrategy.pageType}
切入点：${enhancedStrategy.entryPoint}
差异化方向：${enhancedStrategy.differentiation.join("、")}
标题建议：${enhancedStrategy.titleSuggestions.join("、")}`,
    };

    // Save results
    await prisma.strategyAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: "completed",
        serpResults: JSON.stringify(serpResults.slice(0, 20)),
        pageTypeDistribution: JSON.stringify(pageTypeDistribution),
        competitors: JSON.stringify(competitors),
        strategy: JSON.stringify({
          searchIntent,
          serpFeatures,
          competitionLevel,
          recommendedStrategy: enhancedStrategy,
          relatedKeywords: keywordSuggestions,
          jsonOutput,
        }),
      },
    });

    return NextResponse.json({
      data: {
        id: analysis.id,
        keyword,
        searchIntent,
        pageTypeDistribution,
        serpFeatures,
        competitors,
        competitionLevel,
        recommendedStrategy: enhancedStrategy,
        relatedKeywords: keywordSuggestions,
        jsonOutput: JSON.stringify(jsonOutput, null, 2),
      },
    });
  } catch (e) {
    console.error("Strategy analysis error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "分析失败" },
      { status: 500 },
    );
  }
}

function generateRecommendedStrategy(
  pageTypeDistribution: Array<{ type: string; percentage: number }>,
  competitionLevel: string,
  serpFeatures: string[],
  competitors: Array<{ domain: string; pageType: string }>,
): {
  pageType: string;
  entryPoint: string;
  mustWrite: string[];
  gaps: string[];
  misconceptions: string[];
  titleSuggestions: string[];
  contentStructure: object;
  seoControls: string[];
  differentiation: string[];
  seoOptimization: string[];
  actionSteps: string[];
} {
  const sorted = [...pageTypeDistribution].sort(
    (a, b) => b.percentage - a.percentage,
  );
  const dominantType = sorted[0];

  let pageType = "";
  let entryPoint = "";
  const differentiation: string[] = [];
  const titleSuggestions: string[] = [];
  const contentStructure: string[] = [];
  const seoOptimization: string[] = [];
  const actionSteps: string[] = [];

  // Determine page type based on distribution
  if (dominantType.type.includes("列表页")) {
    pageType = "列表页 (Listicle)";
    entryPoint =
      "做差异化的测评对比页，加入真实用户反馈和数据支撑";
    differentiation.push(
      "加入真实测评数据和用户评价",
      "提供对比表格和选购指南",
      "增加FAQ模块覆盖People Also Ask",
    );
    titleSuggestions.push(
      `2026年最佳推荐（真实测评+对比）`,
      `十大横评：谁是性价比之王？`,
    );
    contentStructure.push(
      "H1: 主标题（包含年份+最佳+核心关键词）",
      "H2: 快速推荐（Top 3 一览）",
      "H2: 测评标准和方法论",
      "H2: 详细测评（每个产品：优缺点、适用场景、价格）",
      "H2: 对比表格（规格、价格、评分）",
      "H2: 选购指南（如何选择）",
      "H2: FAQ（6-8个相关问题）",
    );
    seoOptimization.push(
      "标题包含年份和'最佳'关键词",
      "使用FAQ Schema标记",
      "添加Product/Review Schema",
      "内链到相关产品页和教程页",
    );
    actionSteps.push(
      "第一步：收集TOP 10竞品的产品信息",
      "第二步：设计测评维度和打分标准",
      "第三步：撰写每个产品的详细测评",
      "第四步：生成对比表格和FAQ",
      "第五步：添加Schema Markup和内链",
    );
  } else if (dominantType.type.includes("内容页")) {
    pageType = "内容页 (Content)";
    entryPoint =
      "做深度教程或指南，比现有内容更全面、更有数据支撑";
    differentiation.push(
      "提供完整的步骤指南和案例",
      "加入数据图表和实证分析",
      "增加视频或图文演示",
    );
    titleSuggestions.push(
      `完全指南（2026最新版）`,
      `从零到精通：详细教程`,
    );
    contentStructure.push(
      "H1: 主标题（包含'指南'或'教程'）",
      "H2: 什么是XXX（基础概念）",
      "H2: 为什么重要（价值和好处）",
      "H2: 详细步骤（Step 1, 2, 3...）",
      "H2: 最佳实践和技巧",
      "H2: 常见错误和避坑指南",
      "H2: 案例研究（真实数据）",
      "H2: FAQ",
    );
    seoOptimization.push(
      "标题使用'完全指南'或'从零到精通'",
      "使用HowTo Schema标记",
      "添加Table of Contents",
      "每个H2包含数据点或案例",
    );
    actionSteps.push(
      "第一步：收集行业数据和案例",
      "第二步：设计教程的章节结构",
      "第三步：撰写每个章节（至少2200汉字）",
      "第四步：添加数据图表和截图",
      "第五步：生成Schema Markup",
    );
  } else if (dominantType.type.includes("产品页")) {
    pageType = "产品页 (Product)";
    entryPoint =
      "做产品推荐或替代方案对比页，帮助用户决策";
    differentiation.push(
      "提供多维度产品对比",
      "加入用户评价和使用场景",
      "提供购买建议和优惠信息",
    );
    titleSuggestions.push(
      `选购指南（2026推荐）`,
      `别急着买！先看这份选购指南`,
    );
    contentStructure.push(
      "H1: 主标题（产品名称+评测/推荐）",
      "H2: 产品概述（核心卖点）",
      "H2: 详细规格和功能",
      "H2: 使用场景和适合人群",
      "H2: 优缺点分析",
      "H2: 竞品对比",
      "H2: 购买建议和优惠信息",
      "H2: FAQ",
    );
    seoOptimization.push(
      "标题包含产品名称和'评测'或'推荐'",
      "使用Product Schema",
      "添加价格、评分、可用性信息",
      "内链到购买页面",
    );
    actionSteps.push(
      "第一步：收集产品规格和用户评价",
      "第二步：撰写产品概述和卖点",
      "第三步：完成详细评测和对比",
      "第四步：添加购买链接和优惠信息",
      "第五步：生成Product Schema",
    );
  } else if (dominantType.type.includes("功能页")) {
    pageType = "功能页 (Tool)";
    entryPoint =
      "提供在线工具+内容解释，比纯工具更有价值";
    differentiation.push(
      "工具+内容混合设计",
      "提供使用案例和教程",
      "加入数据可视化",
    );
    titleSuggestions.push(
      `免费工具（附使用指南）`,
      `2026最好用的在线工具`,
    );
    contentStructure.push(
      "H1: 主标题（工具名称+免费/在线）",
      "H2: 工具使用界面",
      "H2: 如何使用（Step by Step）",
      "H2: 工具的优势和特点",
      "H2: 使用案例和场景",
      "H2: 常见问题解答",
    );
    seoOptimization.push(
      "标题包含'免费'和'在线'关键词",
      "工具页面需要快速加载（<3秒）",
      "添加FAQ Schema",
      "内链到相关教程和内容页",
    );
    actionSteps.push(
      "第一步：设计工具的核心功能",
      "第二步：开发工具前端界面",
      "第三步：撰写使用教程和案例",
      "第四步：优化页面性能和SEO",
      "第五步：添加FAQ和Schema",
    );
  } else {
    pageType = "混合页 (Hybrid)";
    entryPoint =
      "搜索结果较分散，建议做内容+列表或内容+工具的混合页";
    differentiation.push(
      "内容深度+列表广度结合",
      "加入工具提升实用性",
      "覆盖多种搜索意图",
    );
    titleSuggestions.push(
      `终极指南+推荐清单`,
      `一文读懂（含推荐+工具）`,
    );
    contentStructure.push(
      "H1: 主标题（综合关键词）",
      "H2: 基础知识（信息型内容）",
      "H2: 推荐清单（商业调查）",
      "H2: 详细教程/工具（工具型）",
      "H2: 对比和评测",
      "H2: FAQ",
    );
    seoOptimization.push(
      "标题覆盖多种搜索意图",
      "使用多种Schema标记",
      "添加Table of Contents",
      "内链到各类子页面",
    );
    actionSteps.push(
      "第一步：确定混合页的主要结构",
      "第二步：撰写各部分内容",
      "第三步：设计对比表格或工具",
      "第四步：整合并优化SEO",
      "第五步：添加Schema和内链",
    );
  }

  // Adjust for competition level
  if (competitionLevel === "极强" || competitionLevel === "强") {
    differentiation.push(
      "竞争激烈，需要从细分角度切入",
      "加入独家数据或调研结果",
    );
  }

  return {
    pageType,
    entryPoint,
    mustWrite: differentiation,
    gaps: [],
    misconceptions: [],
    titleSuggestions,
    contentStructure,
    seoControls: seoOptimization,
    differentiation,
    seoOptimization,
    actionSteps,
  };
}

async function generateStrategyWithGPT(params: {
  keyword: string;
  searchIntent: string;
  pageTypeDistribution: Array<{ type: string; percentage: number }>;
  serpFeatures: string[];
  competitionLevel: string;
  competitors: Array<{
    domain: string;
    pageType: string;
    title: string;
    url: string;
    contentSummary?: {
      wordCount: number;
      headings: string[];
      metaDescription: string;
      imageCount: number;
      hasFAQ: boolean;
      hasTable: boolean;
      hasVideo: boolean;
    };
  }>;
  relatedKeywords: string[];
}): Promise<{
  pageType: string;
  entryPoint: string;
  mustWrite: string[];
  gaps: string[];
  misconceptions: string[];
  titleSuggestions: string[];
  contentStructure: object;
  seoControls: string[];
  // Legacy fields
  differentiation: string[];
  seoOptimization: string[];
  actionSteps: string[];
}> {
  const { keyword, searchIntent, pageTypeDistribution, serpFeatures, competitionLevel, competitors, relatedKeywords } = params;

  const competitorsSummary = competitors.slice(0, 5).map((c, i) => {
    let summary = `#${i + 1}: ${c.title} (${c.domain}) - ${c.pageType}`;
    if (c.contentSummary) {
      summary += `\n    字数: ~${c.contentSummary.wordCount}词, 图片: ${c.contentSummary.imageCount}张, FAQ: ${c.contentSummary.hasFAQ ? "有" : "无"}, 表格: ${c.contentSummary.hasTable ? "有" : "无"}, 视频: ${c.contentSummary.hasVideo ? "有" : "无"}`;
      summary += `\n    大纲: ${c.contentSummary.headings.slice(0, 8).join(" → ")}`;
    }
    return summary;
  }).join("\n");

  const pageTypeSummary = pageTypeDistribution.map(p =>
    `${p.type}: ${p.count}个 (${p.percentage}%)`
  ).join("\n");

  const systemPrompt = `你是一个"生成控制信号"输出引擎，不是内容策划师。
你的输出不是给人看的策划稿，而是给下游内容生成模型直接消费的控制信号。

【核心规则】
规则 1：输出不是内容草稿，而是写作控制信号。
避免长篇解释，优先输出可被下游模型直接消费的结构化字段。

规则 2：每个字段都要回答"这会如何影响后续生成"。
如果一个建议无法改变后续写法，就不要输出。

规则 3：优先级排序
高优先级（必输出）：
- 必写项：TOP 竞争对手都覆盖、但我们的内容必须写得更好的具体点
- 缺口项：TOP 竞争对手全部缺失、但用户搜索意图强烈需要的内容
- 误区项：竞争对手传播的错误/过时/片面信息，我们的内容必须纠正
- 结构项：页面必须包含的 H1-H3 框架，精确到标题级别
- 首段项：首段/开头必须传达的核心信息和钩子
- FAQ项：基于 People Also Ask 和竞品缺口，必须回答的具体问题

低优先级（只在有 SERP 依据时输出）：
- 通用 SEO 建议（除非有关键词级别的具体策略）
- 审美类建议（如"加图片、加视频"——除非说明其具体竞争价值）
- 项目执行步骤（如"收数据、写内容"——这不是生成控制信号）

规则 4：差异化必须基于 SERP 缺口。
禁止输出"加图片、加视频、加FAQ"这类可套用到任何 query 的空泛建议。
每个差异化建议必须引用具体的竞争事实，例如："TOP 5 中有 4 个未覆盖XX，但搜索意图显示用户需要"。

【输出格式】
严格输出 JSON，包含以下字段：

{
  "pageType": "推荐的页面类型（如：列表页 (Listicle)）",
  "entryPoint": "一句话切入点，说明用什么角度赢过现有结果",

  "mustWrite": [
    "必写项 1：具体、可验证的内容点（如：必须包含'2026年最新价格对比表'，因为TOP 5中有4个数据超过12个月未更新）",
    "必写项 2：..."
  ],

  "gaps": [
    "缺口项 1：TOP竞争对手全缺失但用户需要的具体内容（如：无人提及'XX场景下的实际表现'，但PAA中该问题出现3次）",
    "缺口项 2：..."
  ],

  "misconceptions": [
    "误区项 1：竞争对手传播的错误/片面信息，我们的内容需要纠正（如：多数文章声称XX，但最新数据表明YY）",
    "误区项 2：如果没有明显误区，可以省略此数组"
  ],

  "titleSuggestions": [
    "标题建议 1（包含核心关键词+差异化元素）",
    "标题建议 2",
    "标题建议 3"
  ],

  "contentStructure": {
    "h1": "精确的 H1 标题（包含核心关键词）",
    "intro": "首段必须传达的信息（3-5个要点，包含钩子和核心结论）",
    "sections": [
      {
        "h2": "第一个 H2 标题",
        "mustCover": ["此章节必须覆盖的具体内容点 1", "内容点 2"],
        "avoid": ["此章节需要避免的写法（如有竞品误区或重复内容）"]
      },
      {
        "h2": "第二个 H2 标题",
        "mustCover": ["具体内容点"],
        "avoid": []
      }
    ],
    "faq": [
      {"q": "必须回答的具体问题 1（来自 PAA 或搜索意图）", "a": "答案的核心要点（2-3句话，不含废话）"},
      {"q": "必须回答的具体问题 2", "a": "答案核心要点"}
    ]
  },

  "seoControls": [
    "SEO 控制信号 1：关键词级别的具体策略（如：H2中必须出现长尾词'XX vs YY'）",
    "SEO 控制信号 2"
  ]
}

【禁止行为】
- 不要输出"加图片"、"加视频"、"加表格"等通用建议，除非有具体竞争依据
- 不要输出"收集数据"、"撰写内容"、"进行优化"等执行步骤
- 不要输出泛泛而谈的"提升用户体验"类建议
- 每个建议必须有 SERP 数据或竞品分析依据

语言：使用中文输出。`;

  const userPrompt = `关键词：${keyword}

搜索意图：${searchIntent}

页面类型分布：
${pageTypeSummary}

SERP特色区块：${serpFeatures.join(", ")}

竞争强度：${competitionLevel}

TOP 5 竞争对手（含页面内容分析）：
${competitorsSummary}

相关关键词：${relatedKeywords.join(", ")}

请基于以上数据（特别是竞争对手页面的实际内容结构和元素）生成详细的推荐策略。`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content from OpenAI");
  }

  try {
    const parsed = JSON.parse(content);
    return {
      pageType: parsed.pageType ?? "内容页 (Content)",
      entryPoint: parsed.entryPoint ?? "",
      mustWrite: Array.isArray(parsed.mustWrite) ? parsed.mustWrite : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      misconceptions: Array.isArray(parsed.misconceptions) ? parsed.misconceptions : [],
      titleSuggestions: Array.isArray(parsed.titleSuggestions) ? parsed.titleSuggestions : [],
      contentStructure: parsed.contentStructure ?? {},
      seoControls: Array.isArray(parsed.seoControls) ? parsed.seoControls : [],
      // Legacy fields for backward compatibility with existing UI
      differentiation: Array.isArray(parsed.mustWrite) ? parsed.mustWrite : [],
      seoOptimization: Array.isArray(parsed.seoControls) ? parsed.seoControls : [],
      actionSteps: [],
    };
  } catch {
    throw new Error("Failed to parse GPT response as JSON");
  }
}
