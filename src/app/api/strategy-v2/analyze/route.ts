import { NextRequest, NextResponse } from "next/server";

/** 部署在 Vercel 等环境时放宽上限，避免「五步 + 多模型」在 60s 被平台掐断 */
export const maxDuration = 300;
import {
  fetchPageContentSummary,
  type PageContentSummary,
} from "@/lib/strategy/pageContentSummary";
import {
  assertOpenAiConfigured,
  runLayer1AiAnalysis,
  runLayer2AiAnalysis,
  runLayer3AiAnalysis,
  runLayer4AiAnalysis,
  runLayer5AiControlSignals,
} from "@/lib/strategy/strategyV2AiLayers";
import {
  buildContentFormRouting,
  defaultCanonicalForPrimary,
  type ContentGranularityInput,
} from "@/lib/strategy/contentFormRouting";

/** 对自然结果前 N 名抓取落地页 HTML，抽取结构信号（与老版 /strategy 一致为 5 条，顺序执行避免并发风暴） */
const ORGANIC_CONTENT_FETCH_TOP = 5;

type OrganicRow = {
  rank: number;
  title: string;
  url: string;
  domain: string;
  description?: string;
  contentSummary?: PageContentSummary;
  contentFetchError?: string;
};

async function enrichOrganicWithContentSummaries(rows: OrganicRow[]): Promise<OrganicRow[]> {
  const out = rows.map((r) => ({ ...r }));
  const slice = out.slice(0, ORGANIC_CONTENT_FETCH_TOP);
  await Promise.all(
    slice.map(async (row) => {
      if (!row.url) return;
      try {
        row.contentSummary = await fetchPageContentSummary(row.url);
      } catch (e) {
        row.contentFetchError = e instanceof Error ? e.message : String(e);
      }
    }),
  );
  return out;
}

/** 将 Layer1 抓取的正文结构字段合并回 Layer2 的竞品行（避免模型漏传） */
function mergeLayer2OrganicFields(layer1Data: any, layer2Data: any) {
  const org = (layer1Data?.organicResults ?? []) as OrganicRow[];
  const byRank = new Map(org.map((o) => [o.rank, o]));
  const list = layer2Data?.pageTypeRecognition?.classifiedCompetitors;
  if (!Array.isArray(list)) return layer2Data;
  layer2Data.pageTypeRecognition.classifiedCompetitors = list.map((c: any) => {
    const o = byRank.get(c.rank);
    if (!o) return c;
    return {
      ...c,
      title: c.title || o.title,
      url: c.url || o.url,
      domain: c.domain || o.domain,
      contentSummary: o.contentSummary,
      contentFetchError: o.contentFetchError,
    };
  });
  return layer2Data;
}

/** 仅补齐可客观统计的指标（非策略推断） */
function enrichLayer4CompetitorFacts(layer1Data: any, layer4Data: any) {
  const comps = (layer1Data?.organicResults ?? []) as OrganicRow[];
  const withC = comps.filter((c) => c.contentSummary);
  const ca = (layer4Data?.competitorAnalysis ?? {}) as Record<string, unknown>;
  ca.totalAnalyzed = comps.length;
  ca.avgTitleLength =
    comps.reduce((s, c) => s + (c.title?.length ?? 0), 0) / (comps.length || 1);
  ca.domains = comps.map((c) => c.domain);
  ca.contentFetchSuccess = withC.length;
  ca.avgEstimatedWordCount =
    withC.length > 0
      ? Math.round(
          withC.reduce((s, c) => s + (c.contentSummary?.wordCount ?? 0), 0) / withC.length,
        )
      : null;
  layer4Data.competitorAnalysis = ca;
  return layer4Data;
}

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
    signal: AbortSignal.timeout(60_000),
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
    signal: AbortSignal.timeout(60_000),
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
    })).slice(0, 10) as OrganicRow[],
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

  const organicWithContent = await enrichOrganicWithContentSummaries(base.organicResults);

  assertOpenAiConfigured();
  const organicForAi = organicWithContent.map((r) => {
    if (!r.contentSummary) return { ...r };
    return {
      ...r,
      contentSummary: {
        ...r.contentSummary,
        headings: r.contentSummary.headings.slice(0, 8),
        metaDescription: r.contentSummary.metaDescription.slice(0, 220),
      },
    };
  });
  const facts = {
    ...base,
    organicResults: organicForAi,
  };
  const ai1 = await runLayer1AiAnalysis({
    keyword,
    language,
    location,
    facts,
  });

  return {
    ...base,
    organicResults: organicWithContent,
    serpSummary: ai1.serpSummary,
    serpFeaturesSummary: ai1.serpFeaturesSummary,
    competitorContentInsights: ai1.competitorContentInsights,
    systematicAnalysis: ai1.systematicAnalysis,
    _analysisSource: "openai",
  };
}

/**
 * Layer 2: SERP 预判层
 * - 页面类型识别
 * - Query Pattern 分类
 * - Intent Split 检测
 * - Keyword Viability Gate
 */
async function processLayer2(keyword: string, location: string, language: string, layer1Data: any) {
  const raw = await runLayer2AiAnalysis({ keyword, language, layer1: layer1Data });
  mergeLayer2OrganicFields(layer1Data, raw);
  return { ...raw, _analysisSource: "openai" };
}

/**
 * Layer 3: 资产路由层
 * - Asset Fit Scoring
 * - Primary Asset + Support Assets 决策
 */
async function processLayer3(keyword: string, location: string, language: string, layer1Data: any, layer2Data: any) {
  const raw = (await runLayer3AiAnalysis({ keyword, layer1: layer1Data, layer2: layer2Data })) as Record<string, unknown>;
  const d = raw.decision as { primaryAsset?: string; supportAssets?: string[] } | undefined;
  const pa = d?.primaryAsset ?? "Article / Guide";
  const sup = Array.isArray(d?.supportAssets) ? d!.supportAssets! : [];
  if (!raw.contentFormDirective || typeof raw.contentFormDirective !== "object") {
    raw.contentFormDirective = {
      headline: `你要做的内容形态：主推荐为「${pa}」（模型未返回 headline 时的兜底）`,
      doThis: `请优先把「${keyword}」做成 ${pa} 类型的主落地页；章节与转化路径按该形态设计。${sup.length ? ` 可搭配：${sup.join("、")}。` : ""}`,
      notThisFirst: "建议重新跑一次分析以获取「暂不要优先做」的细项说明。",
      pairWith: sup.slice(0, 2).map((a) => `同步规划「${a}」作为辅助承接页或站内链接目的地。`),
    };
  }
  if (!raw.contentGranularity || typeof raw.contentGranularity !== "object") {
    raw.contentGranularity = {
      canonicalSurface: defaultCanonicalForPrimary(pa),
      explainForOperator:
        pa === "Product Page"
          ? "未返回细分：「Product Page」可能是类目列表、单品商详或店铺馆，请结合 TOP 结果 URL 再判。"
          : "未返回 contentGranularity，已按主资产给出保守默认。",
      productIfApplicable:
        pa === "Product Page"
          ? { isSingleSkuDetail: false, isCategoryListing: false, isStoreOrBrandHub: false }
          : null,
    };
  }
  const gran = raw.contentGranularity as ContentGranularityInput | undefined;
  raw.contentFormRouting = buildContentFormRouting(pa, gran);
  return { ...raw, _analysisSource: "openai" };
}

/**
 * Layer 4: 分支策略层
 * 根据 Primary Asset 调用对应的 Strategist
 */
async function processLayer4(keyword: string, location: string, language: string, layer1Data: any, layer2Data: any, layer3Data: any) {
  const raw = (await runLayer4AiAnalysis({
    keyword,
    language,
    layer1: layer1Data,
    layer2: layer2Data,
    layer3: layer3Data,
  })) as Record<string, unknown>;
  enrichLayer4CompetitorFacts(layer1Data, raw);
  return { ...raw, _analysisSource: "openai" };
}

/**
 * Layer 5: 控制信号生成层（全程由大模型根据前四层结论与事实生成）
 */
async function processLayer5(keyword: string, location: string, language: string, layer1Data: any, layer2Data: any, layer3Data: any, layer4Data: any) {
  const primaryAsset = layer3Data?.decision?.primaryAsset ?? "Article / Guide";
  const viabilityGate = layer2Data?.viabilityGate ?? {};

  const modelTag = process.env.OPENAI_STRATEGY_MODEL?.trim() || "gpt-4.1-mini";
  const control = (await runLayer5AiControlSignals({
    keyword,
    language,
    layer1: layer1Data,
    layer2: layer2Data,
    layer3: layer3Data,
    layer4: layer4Data,
  })) as Record<string, unknown>;

  const finalStrategy = {
    ...control,
    pageType: (control.pageType as string) || primaryAsset,
    _source: `OpenAI · ${modelTag}`,
  };

  const fallbackStrategy = { ...finalStrategy };
  const playbook = layer4Data?.playbook ?? null;
  const serpSummary = layer1Data?.serpSummary ?? null;
  const serpFeaturesSummary = layer1Data?.serpFeaturesSummary ?? null;
  const competitorContentInsights = layer1Data?.competitorContentInsights ?? null;

  const contentFormDirective = layer3Data?.contentFormDirective ?? null;
  const contentGranularity = layer3Data?.contentGranularity ?? null;
  const contentFormRouting =
    (layer3Data?.contentFormRouting as Record<string, unknown> | undefined) ??
    buildContentFormRouting(primaryAsset, contentGranularity as ContentGranularityInput | null);

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
    competitorContentInsights,
    contentFormDirective,
    contentGranularity,
    contentFormRouting,
    playbook,
    controlSignals: finalStrategy,
    viabilityGate,
  };

  return {
    fallbackStrategy,
    gptStrategy: control,
    finalStrategy,
    viabilityGate,
    playbook,
    serpSummary,
    serpFeaturesSummary,
    finalBundle,
    /** 给下游内容生成直接粘贴的完整 JSON 字符串 */
    finalBundleJson: JSON.stringify(finalBundle, null, 2),
    _analysisSource: "openai",
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

type PreviousLayersPayload = {
  layer1?: Record<string, unknown>;
  layer2?: Record<string, unknown>;
  layer3?: Record<string, unknown>;
  layer4?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, location, language, layer, previousLayers } = body as {
      keyword: string;
      location?: string;
      language?: string;
      layer?: string;
      /** 与「渐进式 UI」配合：请求 layer2+ 时传入已算好的前几层，避免重复打 DataForSEO / 重复抓落地页 */
      previousLayers?: PreviousLayersPayload;
    };

    if (!keyword) {
      return NextResponse.json({ error: "关键词不能为空" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(
        {
          error:
            "strategy-v2 各步结论均由大模型生成：请先在环境变量中配置 OPENAI_API_KEY（可选 OPENAI_STRATEGY_MODEL 覆盖默认模型）。",
        },
        { status: 400 },
      );
    }

    const loc = location ?? "2156";
    const lang = language ?? "zh-cn";
    const kw = keyword.trim();

    if (layer === "all") {
      const layers = await runStrategyV2Pipeline(kw, loc, lang);
      return NextResponse.json({ mode: "all" as const, layers });
    }

    let data: any;

    const pl = previousLayers ?? {};

    switch (layer) {
      case "layer1":
        data = await processLayer1(kw, loc, lang);
        break;
      case "layer2": {
        const l1 = pl.layer1 ?? (await processLayer1(kw, loc, lang));
        data = await processLayer2(kw, loc, lang, l1);
        break;
      }
      case "layer3": {
        const l1 = pl.layer1 ?? (await processLayer1(kw, loc, lang));
        const l2 = pl.layer2 ?? (await processLayer2(kw, loc, lang, l1));
        data = await processLayer3(kw, loc, lang, l1, l2);
        break;
      }
      case "layer4": {
        const l1 = pl.layer1 ?? (await processLayer1(kw, loc, lang));
        const l2 = pl.layer2 ?? (await processLayer2(kw, loc, lang, l1));
        const l3 = pl.layer3 ?? (await processLayer3(kw, loc, lang, l1, l2));
        data = await processLayer4(kw, loc, lang, l1, l2, l3);
        break;
      }
      case "layer5": {
        const l1 = pl.layer1 ?? (await processLayer1(kw, loc, lang));
        const l2 = pl.layer2 ?? (await processLayer2(kw, loc, lang, l1));
        const l3 = pl.layer3 ?? (await processLayer3(kw, loc, lang, l1, l2));
        const l4 = pl.layer4 ?? (await processLayer4(kw, loc, lang, l1, l2, l3));
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
