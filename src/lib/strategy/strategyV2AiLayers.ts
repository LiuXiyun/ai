/**
 * strategy-v2：各层「系统性解读」全部由 OpenAI JSON 输出驱动；
 * 上游仅提供事实数据（SERP、落地页结构信号），不做规则引擎式的策略结论。
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function strategyModel() {
  return process.env.OPENAI_STRATEGY_MODEL?.trim() || "gpt-4.1-mini";
}

export function assertOpenAiConfigured(): void {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error(
      "未配置 OPENAI_API_KEY：strategy-v2 各步策略解读依赖大模型，请在环境变量中配置后再试。",
    );
  }
}

async function chatJsonObject(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<Record<string, unknown>> {
  assertOpenAiConfigured();
  const key = process.env.OPENAI_API_KEY!.trim();
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: strategyModel(),
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: 0.35,
      max_tokens: params.maxTokens ?? 2800,
      response_format: { type: "json_object" },
    }),
    /** 单次调用过久多为网络/供应商问题，避免路由无限挂起 */
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI 请求失败 HTTP ${res.status}: ${t.slice(0, 400)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI 返回空内容");
  return JSON.parse(content) as Record<string, unknown>;
}

function jsonFacts(obj: unknown, maxChars = 28000): string {
  const s = JSON.stringify(obj, null, 0);
  if (s.length <= maxChars) return s;
  return `${s.slice(0, maxChars)}\n…(已截断，优先保留前段事实)`;
}

/** 第 1 步：SERP + 落地页结构 → 叙事总结与洞察（禁止编造未提供的数据） */
export async function runLayer1AiAnalysis(params: {
  keyword: string;
  language: string;
  location: string;
  facts: Record<string, unknown>;
}): Promise<{
  serpSummary: unknown;
  serpFeaturesSummary: unknown;
  competitorContentInsights: unknown;
  systematicAnalysis: unknown;
}> {
  const system = `你是资深 SEO / 内容策略顾问。下面 USER 消息中是「原始事实 JSON」（SERP 计数、特色块布尔、自然结果列表、部分落地页 HTML 抽取的结构信号等）。
你的任务：只做系统性解读与策略含义阐述，禁止编造未在事实中出现的数据（例如未抓取的域名正文）。
输出严格 JSON，键必须为：
{
  "serpSummary": { "headline": string, "paragraphs": string[] (3-6 条，中文), "topWinners": [{ "rank", "domain", "title" }] },
  "serpFeaturesSummary": { "headline": string, "present": [{ "name", "meaning" }] (仅针对事实中为 true 的特色块，可改写 meaning 为策略含义), "interpretation": string, "extraNotes": string[] },
  "competitorContentInsights": {
    "headline": string,
    "bullets": string[] (4-8 条中文，必须结合落地页结构事实与 SERP),
    "fetchedCount": number,
    "failedCount": number,
    "avgWordCount": number | null (仅基于成功抓取条目的 wordCount 计算，不得臆造),
    "perPageNotes": [
      成功抓取: { "rank", "domain", "title", "ok": true, "wordCount", "headingCount", "hasFAQ", "hasTable", "hasVideo", "outlinePreview", "howTheyWrite": string (中文：对方怎么组织内容), "yourDifferentiation": string (中文：你可怎么差异化) },
      失败: { "rank", "domain", "title", "ok": false, "error": string, "fallbackStrategy": string (在无正文时仍可给的判断) }
    ]
  },
  "systematicAnalysis": { "overview": string (中文总览), "riskPoints": string[], "nextStepFocus": string[] }
}
perPageNotes 必须与事实列表 organicResults 的 rank 对齐；数值字段必须与事实中的 contentSummary 一致（失败条用 contentFetchError）。`;

  const user = `关键词: ${params.keyword}
语言代码: ${params.language}
地域代码: ${params.location}

事实 JSON:
${jsonFacts(params.facts)}`;

  const out = await chatJsonObject({ system, user, maxTokens: 3500 });
  const serpSummary = out.serpSummary;
  const serpFeaturesSummary = out.serpFeaturesSummary;
  const competitorContentInsights = out.competitorContentInsights;
  const systematicAnalysis = out.systematicAnalysis;
  if (!serpSummary || !serpFeaturesSummary || !competitorContentInsights) {
    throw new Error("第1步 AI 返回缺少 serpSummary / serpFeaturesSummary / competitorContentInsights");
  }
  return { serpSummary, serpFeaturesSummary, competitorContentInsights, systematicAnalysis };
}

/** 第 2 步：意图、页面类型分布、可行性（全部由模型判断，但须引用 layer1 事实） */
export async function runLayer2AiAnalysis(params: {
  keyword: string;
  language: string;
  layer1: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const system = `你是搜索意图与竞争可行性分析师。根据 USER 中的 layer1（含 AI 总结与 organic 等事实），输出严格 JSON：
{
  "pageTypeRecognition": {
    "distribution": [{ "type": "Listicle"|"Content"|"Product"|"Tool"|"Homepage"|"Wiki"|"Forum"|"Documentation", "count": number, "percentage": number }],
    "classifiedCompetitors": [{ "rank", "title", "url", "domain", "pageType": 同上枚举, "contentSummary"?: object, "contentFetchError"?: string }]
  },
  "queryPattern": "How-To / Guide" | "Commercial Investigation" | "Transactional" | "Informational / Knowledge" | "Local" | "Alternative Seeking" | "Mixed",
  "intentSplit": { "dominantIntent": string, "dominantPercentage": number, "isSplit": boolean, "mixedIntents": [{ "type": string, "percentage": number }] },
  "viabilityGate": { "canProceed": boolean, "score": number (0-100), "warnings": string[], "blockers": string[] },
  "systematicAnalysis": { "overview": string, "whyThisPattern": string[], "whatToWatch": string[] }
}
要求：classifiedCompetitors 条数与 layer1.organicResults 一致（按 rank）；percentage 之和应为 100；可行性须结合权威域名、意图分散度、SERP 形态解释，用中文写 warnings/blockers。`;

  const user = `关键词: ${params.keyword}\nlayer1:\n${jsonFacts(params.layer1)}`;
  return chatJsonObject({ system, user, maxTokens: 3200 });
}

/** 第 3 步：资产形态打分与主形态选择 */
export async function runLayer3AiAnalysis(params: {
  keyword: string;
  layer1: Record<string, unknown>;
  layer2: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const system = `你是内容资产路由顾问。根据 layer1+layer2，输出严格 JSON：
{
  "assetFitScoring": [{ "asset": "Article / Guide"|"Product Page"|"Collection / Bestlist"|"Comparison Page"|"QA / FAQ Page"|"Tool / Calculator", "score": number (0-100) }],
  "decision": { "primaryAsset": string (必须从上一行 asset 枚举中选), "supportAssets": string[] (1-2 个), "primaryScore": number },
  "pageTypeAlignment": { "primaryAsset": string, "dominantSerppageType": string, "aligned": boolean, "alignmentNote": string },
  "contentFormDirective": {
    "headline": string (中文，固定格式：「你要做的内容形态：……」把主形态用通俗中文写进省略号，括号内可保留英文枚举名),
    "doThis": string (中文 2-4 句，祈使/指导语气，明确写「请做 / 建议做」哪一类落地页、读者点进来应完成什么任务、首屏与目录应长什么样),
    "notThisFirst": string (中文 1-2 句：当前阶段不建议优先做哪种形态及一句原因，避免用户选错),
    "pairWith": string[] (0-2 条：辅助形态如何配合主形态，可执行)
  },
  "contentGranularity": {
    "canonicalSurface": "article_longform" | "listicle_collection" | "comparison_page" | "pdp_single_sku" | "qa_faq_hub" | "tool_interactive" | "unspecified",
    "explainForOperator": string (中文 1 句，给工程/程序化用：明确是「单品商详 / 导购清单 / 对比页」等哪一种),
    "productIfApplicable": null | {
      "isSingleSkuDetail": boolean,
      "isCategoryListing": boolean,
      "isStoreOrBrandHub": boolean
    }
  },
  "systematicAnalysis": { "overview": string, "whyPrimary": string[], "whenToPivot": string[] }
}
assetFitScoring 必须 6 条全有且按 score 降序；用中文写 alignmentNote、contentFormDirective 与 systematicAnalysis。
contentFormDirective 必须与 decision.primaryAsset 一致，禁止泛泛「做优质内容」类空话。
强约束：Product Page 仅代表「单品详情页（PDP）」；当 decision.primaryAsset 为 Product Page 时，canonicalSurface 必须为 pdp_single_sku，且 productIfApplicable 必须为 { isSingleSkuDetail: true, isCategoryListing: false, isStoreOrBrandHub: false }。
若判断为「多商品列表/类目页/店铺聚合页」，primaryAsset 必须改为 Collection / Bestlist（不可标为 Product Page）。
当 primary 为 Collection / Bestlist 时 canonicalSurface 一般为 listicle_collection；Article / Guide → article_longform；Comparison Page → comparison_page；QA / FAQ → qa_faq_hub；Tool → tool_interactive。`;

  const user = `关键词: ${params.keyword}\nlayer1:\n${jsonFacts(params.layer1)}\n\nlayer2:\n${jsonFacts(params.layer2)}`;
  return chatJsonObject({ system, user, maxTokens: 2600 });
}

/** 第 4 步：主 strategist + playbook + 竞品分析叙述 */
export async function runLayer4AiAnalysis(params: {
  keyword: string;
  language: string;
  layer1: Record<string, unknown>;
  layer2: Record<string, unknown>;
  layer3: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const system = `你是内容战役策划。根据 layer1-3，为「当前应做的主资产」产出可执行方案。输出严格 JSON：
{
  "primaryStrategist": {
    "asset": string (须等于 layer3.decision.primaryAsset),
    "h1": string,
    "targetWordCount": number,
    "mustCover": string[] (5-10 条，中文或中英混合，必须可执行),
    "structure": string[] (章节级大纲),
    "seoSignals": string[]
  },
  "playbook": {
    "angle": string,
    "tactics": string[],
    "competitorGaps": string[],
    "problemsOrRisks": string[],
    "yourActions": string[]
  },
  "competitorAnalysis": {
    "totalAnalyzed": number,
    "avgTitleLength": number,
    "domains": string[],
    "commonPatterns": string[] (中文：从标题+落地页结构归纳的共性写法),
    "contentFetchSuccess": number,
    "avgEstimatedWordCount": number | null
  },
  "allStrategists": { "note": string },
  "systematicAnalysis": { "executiveSummary": string, "contentBattlePlan": string[] }
}
commonPatterns、playbook 必须体现 layer1 落地页事实与 PAA，禁止空泛套话；playbook.angle 必须与 layer3.contentFormDirective.headline / doThis 指向的「你要做的形态」一致，不得改口成另一种主形态；章节结构须与 layer3.contentGranularity.canonicalSurface 一致（例如 pdp_single_sku 与 plp_category_or_search 的模块顺序不同）。allStrategists 仅保留简短 note 即可（本管线只深度生成 primary）。`;

  const user = `关键词: ${params.keyword}\n语言: ${params.language}\nlayer1:\n${jsonFacts(params.layer1)}\n\nlayer2:\n${jsonFacts(params.layer2)}\n\nlayer3:\n${jsonFacts(params.layer3)}`;
  return chatJsonObject({ system, user, maxTokens: 4000 });
}

/** 第 5 步：下游可用的控制信号（可与第 4 步对齐并收紧） */
export async function runLayer5AiControlSignals(params: {
  keyword: string;
  language: string;
  layer1: Record<string, unknown>;
  layer2: Record<string, unknown>;
  layer3: Record<string, unknown>;
  layer4: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const system = `你是「生成控制信号」引擎：输出给下游写稿模型消费的 JSON，不是正文草稿。
规则：必须基于 USER 内各层事实与前序结论；禁止忽略落地页结构摘要；禁止输出可套用到任意关键词的空话。
输出严格 JSON，键为：
{
  "pageType": string,
  "entryPoint": string,
  "mustWrite": string[],
  "gaps": string[],
  "misconceptions": string[],
  "titleSuggestions": string[],
  "contentStructure": string[],
  "seoControls": string[]
}`;

  const user = `关键词: ${params.keyword}\n语言: ${params.language}

layer1:\n${jsonFacts(params.layer1, 22000)}

layer2:\n${jsonFacts(params.layer2, 12000)}

layer3:\n${jsonFacts(params.layer3, 8000)}

layer4:\n${jsonFacts(params.layer4, 14000)}`;

  return chatJsonObject({ system, user, maxTokens: 3200 });
}
