"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type AnalysisLayer = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "active" | "completed" | "error";
  data: Record<string, unknown>;
};

type SerpSummaryBlock = { headline?: string; paragraphs?: string[]; topWinners?: Array<{ rank: number; domain: string; title: string }> };
type SerpFeaturesBlock = { headline?: string; interpretation?: string; present?: Array<{ name: string; meaning: string }>; extraNotes?: string[] };
type CompetitorContentInsights = {
  headline?: string;
  bullets?: string[];
  fetchedCount?: number;
  failedCount?: number;
  avgWordCount?: number;
  perPageNotes?: Array<
    | {
        rank: number;
        domain: string;
        title: string;
        ok: true;
        wordCount: number;
        headingCount: number;
        hasFAQ: boolean;
        hasTable: boolean;
        hasVideo: boolean;
        outlinePreview: string;
        howTheyWrite?: string;
        yourDifferentiation?: string;
      }
    | { rank: number; domain: string; title: string; ok: false; error: string; fallbackStrategy?: string }
  >;
};

type SystematicBlock = {
  overview?: string;
  riskPoints?: string[];
  nextStepFocus?: string[];
  whyThisPattern?: string[];
  whatToWatch?: string[];
  whyPrimary?: string[];
  whenToPivot?: string[];
  executiveSummary?: string;
  contentBattlePlan?: string[];
  rationale?: string;
  tradeoffs?: string[];
};

function Layer1Report({ data }: { data: Record<string, unknown> }) {
  const organicCount = (data.organicCount as number) ?? 0;
  const shoppingCount = (data.shoppingCount as number) ?? 0;
  const paaCount = (data.paaCount as number) ?? 0;
  const signals = data.rawSignals as Record<string, boolean> | undefined;
  const paa = data.paaQuestions as string[] | undefined;
  const organic = data.organicResults as Array<{ rank: number; title: string; domain: string }> | undefined;
  const hasShopping = shoppingCount > 0;
  const hasPAA = paaCount > 0;
  const activeSignals = signals ? Object.entries(signals).filter(([, v]) => v).map(([k]) => k) : [];
  const serpSummary = data.serpSummary as SerpSummaryBlock | undefined;
  const serpFeatures = data.serpFeaturesSummary as SerpFeaturesBlock | undefined;
  const contentInsights = data.competitorContentInsights as CompetitorContentInsights | undefined;
  const sys1 = data.systematicAnalysis as SystematicBlock | undefined;

  return (
    <div className="space-y-6">
      {serpSummary && (
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white px-4 py-4">
          <div className="text-sm font-semibold text-indigo-950">SERP 总结</div>
          {serpSummary.headline && <div className="mt-2 text-sm font-medium text-indigo-900">{serpSummary.headline}</div>}
          {serpSummary.paragraphs && (
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-indigo-900/90">
              {serpSummary.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </div>
      )}
      {serpFeatures && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-4">
          <div className="text-sm font-semibold text-violet-950">特色板块总结</div>
          {serpFeatures.headline && <div className="mt-2 text-xs font-medium uppercase tracking-wide text-violet-700/80">{serpFeatures.headline}</div>}
          {serpFeatures.interpretation && <p className="mt-2 text-sm text-violet-900">{serpFeatures.interpretation}</p>}
          {serpFeatures.present && serpFeatures.present.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {serpFeatures.present.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-violet-900">
                  <span className="shrink-0 rounded bg-violet-200/80 px-2 py-0.5 text-xs font-semibold text-violet-900">{f.name}</span>
                  <span className="text-violet-800/90">{f.meaning}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-violet-800">本页未识别到 PAA / 购物块等常见富结果，竞争更偏传统标题与摘要。</p>
          )}
          {serpFeatures.extraNotes && serpFeatures.extraNotes.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-violet-800">
              {serpFeatures.extraNotes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </div>
      )}
      {sys1?.overview && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <div className="text-sm font-semibold text-zinc-900">AI 系统性解读（第 1 步）</div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-800">{sys1.overview}</p>
          {sys1.riskPoints && sys1.riskPoints.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-amber-800">风险点</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900/90">{sys1.riskPoints.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {sys1.nextStepFocus && sys1.nextStepFocus.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-emerald-800">下一步关注点</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-emerald-900/90">{sys1.nextStepFocus.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      {contentInsights && (contentInsights.bullets?.length || contentInsights.perPageNotes?.length) && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-4">
          <div className="text-sm font-semibold text-sky-950">{contentInsights.headline ?? "竞品落地页结构"}</div>
          {(contentInsights.fetchedCount !== undefined || contentInsights.failedCount !== undefined) && (
            <p className="mt-1 text-xs text-sky-800/90">
              成功抓取结构约 <strong>{contentInsights.fetchedCount ?? 0}</strong> 条
              {typeof contentInsights.avgWordCount === "number" && contentInsights.fetchedCount ? (
                <>，估算正文平均约 <strong>{contentInsights.avgWordCount}</strong> 词（英文按空格分词，中文页仅供参考）</>
              ) : null}
              {(contentInsights.failedCount ?? 0) > 0 ? <>；失败或未拉取 <strong>{contentInsights.failedCount}</strong> 条（多为反爬或超时）。</> : "。"}
            </p>
          )}
          {contentInsights.bullets && contentInsights.bullets.length > 0 && (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-sky-900">
              {contentInsights.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
          {contentInsights.perPageNotes && contentInsights.perPageNotes.length > 0 && (
            <details className="mt-3 rounded-lg border border-sky-200/80 bg-white/70">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-sky-900">逐条结果：标题大纲与形态信号</summary>
              <div className="space-y-3 border-t border-sky-100 px-3 py-3 text-xs text-sky-900">
                {contentInsights.perPageNotes.map((row) => (
                  <div key={row.rank} className="border-b border-sky-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="rounded bg-sky-200/90 px-1.5 py-0.5 font-semibold text-sky-950">#{row.rank}</span>
                      <span className="font-medium text-zinc-900">{row.domain}</span>
                    </div>
                    <div className="mt-0.5 text-zinc-700">{row.title}</div>
                    {row.ok ? (
                      <div className="mt-1 space-y-1 text-sky-900/90">
                        <div>词数约 {row.wordCount} · 标题条数 {row.headingCount} · FAQ {row.hasFAQ ? "有" : "无"} · 表 {row.hasTable ? "有" : "无"} · 视频 {row.hasVideo ? "有" : "无"}</div>
                        <div className="text-zinc-600">大纲：{row.outlinePreview}</div>
                        {row.howTheyWrite && <div className="text-zinc-800"><span className="font-semibold text-sky-950">对方写法：</span>{row.howTheyWrite}</div>}
                        {row.yourDifferentiation && <div className="text-zinc-800"><span className="font-semibold text-sky-950">你可差异化：</span>{row.yourDifferentiation}</div>}
                      </div>
                    ) : (
                      <div className="mt-1 space-y-1">
                        <div className="text-amber-800">抓取：{row.error}</div>
                        {"fallbackStrategy" in row && row.fallbackStrategy && (
                          <div className="text-sm text-zinc-700"><span className="font-semibold">无正文时策略：</span>{row.fallbackStrategy}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3">
        <div className="text-sm font-semibold text-indigo-900">关键发现</div>
        <div className="mt-1 text-sm text-indigo-800">
          Google 返回了 <strong>{organicCount}</strong> 个有机结果、
          <strong>{shoppingCount}</strong> 个购物结果、<strong>{paaCount}</strong> 个 PAA 问题。
          {hasShopping && " 存在购物结果，说明该词有明确的交易意图。"}
          {hasPAA && " 存在 PAA 问题，说明用户有多个相关疑问。"}
        </div>
      </div>
      <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
        <div className="text-sm font-semibold text-amber-900">对下一步的影响</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
          {hasShopping && <li key="shop">存在购物结果 → 下一步「选对页面形态」会提高「产品详情页」的推荐权重</li>}
          {hasPAA && <li key="paa">存在 PAA 问题 → 后面的「打法大纲 / 控制指令」会更强调 FAQ 与短答结构</li>}
          {activeSignals.includes("featuredSnippet") && <li key="fs">存在精选摘要 → 内容需要针对 featured snippet 优化</li>}
          {activeSignals.includes("peopleAlsoAsk") && <li key="paa2">存在 PAA → 内容必须包含 FAQ 模块</li>}
          {activeSignals.length === 0 && <li key="plain">无明显 SERP 特色 → 竞争相对平缓</li>}
        </ul>
      </div>
      <div className="rounded-xl border-l-4 border-green-500 bg-green-50 px-4 py-3">
        <div className="text-sm font-semibold text-green-900">建议</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-800">
          {paa && paa.length > 0 && <li key="paa-rec">记录 PAA 问题，后续内容必须逐一回答</li>}
          {organic && organic.length > 0 && <li key="top3">关注 TOP 3 竞争对手，后续需要做差异化</li>}
          <li key="next">继续下一步：判断这个词值不值得投入、以及竞争难度</li>
        </ul>
      </div>
      {paa && paa.length > 0 && (
        <details className="rounded-xl border border-zinc-200 bg-zinc-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-700">PAA 问题（{paa.length}个）</summary>
          <ol className="px-4 pb-3 list-decimal space-y-1 pl-8 text-sm text-zinc-600">
            {paa.map((q, i) => <li key={i}>{q}</li>)}
          </ol>
        </details>
      )}
      {organic && organic.length > 0 && (
        <details className="rounded-xl border border-zinc-200 bg-zinc-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-700">TOP 3 竞争对手</summary>
          <div className="px-4 pb-3 space-y-2">
            {organic.slice(0, 3).map((c) => (
              <div key={c.rank} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">#{c.rank}</span>
                <div>
                  <div className="font-medium text-zinc-900">{c.title}</div>
                  <div className="text-xs text-zinc-500">{c.domain}</div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

const queryPatternCn: Record<string, string> = {
  "How-To / Guide": "教程/指南型（想学怎么做）",
  "Commercial Investigation": "选购调研型（在对比、看评测）",
  "Transactional": "交易型（更接近购买）",
  "Informational / Knowledge": "知识科普型（想搞懂概念）",
  "Local": "本地服务型",
  "Alternative Seeking": "寻找替代品型",
  "Mixed": "混合型（意图不够单一）",
};

function Layer2Report({ data }: { data: Record<string, unknown> }) {
  const queryPattern = data.queryPattern as string | undefined;
  const recog = data.pageTypeRecognition as { distribution: Array<{ type: string; count: number; percentage: number }> } | undefined;
  const intent = data.intentSplit as { dominantIntent: string; dominantPercentage: number; isSplit: boolean } | undefined;
  const viability = data.viabilityGate as { canProceed: boolean; score: number; warnings: string[]; blockers: string[] } | undefined;
  const dominantPageType = recog?.distribution?.[0];
  const warnings = viability?.warnings ?? [];
  const blockers = viability?.blockers ?? [];
  const patternLabel = queryPattern ? (queryPatternCn[queryPattern] ?? queryPattern) : "未知";
  const sys2 = data.systematicAnalysis as SystematicBlock | undefined;

  return (
    <div className="space-y-6">
      {sys2?.overview && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <div className="text-sm font-semibold text-zinc-900">AI 系统性解读（第 2 步）</div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-800">{sys2.overview}</p>
          {sys2.whyThisPattern && sys2.whyThisPattern.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-indigo-800">为何形成这种 SERP 格局</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-800">{sys2.whyThisPattern.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {sys2.whatToWatch && sys2.whatToWatch.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-amber-800">执行时要盯紧</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900/90">{sys2.whatToWatch.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3">
        <div className="text-sm font-semibold text-indigo-900">关键发现</div>
        <div className="mt-1 text-sm text-indigo-800 space-y-1">
          <div>用户搜索意图（自动归类）: <strong>{patternLabel}</strong></div>
          {dominantPageType && (
            <div>SERP 主导页面类型: <strong>{dominantPageType.type}</strong>（占 {dominantPageType.percentage}%）</div>
          )}
          {intent && (
            <div>意图{intent.isSplit ? "分散" : "集中"}: 主导 {intent.dominantIntent}（{intent.dominantPercentage}%）</div>
          )}
          {viability && (
            <div>可行性评分: <strong className={viability.canProceed ? "text-green-700" : "text-red-700"}>{viability.score}/100</strong>
              {viability.canProceed ? "（可以做）" : "（不建议直接竞争）"}
            </div>
          )}
        </div>
      </div>
      <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
        <div className="text-sm font-semibold text-amber-900">对下一步的影响</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
          {queryPattern === "Commercial Investigation" && <li>下一步会更倾向推荐「清单/合集页」作为主战场</li>}
          {queryPattern === "How-To / Guide" && <li>下一步会更倾向推荐「深度文章/教程」作为主战场</li>}
          {queryPattern === "Transactional" && <li>下一步会更倾向推荐「产品详情页」作为主战场</li>}
          {queryPattern === "Informational / Knowledge" && <li>下一步会更倾向推荐「文章」或「问答页」作为主战场</li>}
          {intent?.isSplit && <li>意图分散 → 「选对页面形态」时整体适配分会被压低（更难一招吃遍）</li>}
          {!intent?.isSplit && <li>意图集中 → 更容易选到单一、清晰的主页面形态</li>}
          {viability?.canProceed === false && <li>可行性评分过低，执行风险高</li>}
        </ul>
      </div>
      <div className="rounded-xl border-l-4 border-green-500 bg-green-50 px-4 py-3">
        <div className="text-sm font-semibold text-green-900">建议</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-800">
          {blockers.length > 0 && blockers.map((b, i) => <li key={i} className="text-red-700">{b}</li>)}
          {warnings.length > 0 && warnings.map((w, i) => <li key={i} className="text-amber-700">{w}</li>)}
          {blockers.length === 0 && warnings.length === 0 && <li>无明显风险，继续下一步</li>}
          {dominantPageType && dominantPageType.percentage >= 40 && <li>主导类型占 {dominantPageType.percentage}% ≥ 40%，建议跟进</li>}
          {dominantPageType && dominantPageType.percentage < 40 && <li>主导类型仅 {dominantPageType.percentage}%，可用差异化策略突围</li>}
        </ul>
      </div>
    </div>
  );
}

/** 与 API 枚举一致，用于无模型 directive 时的兜底展示 */
const primaryAssetPlainZh: Record<string, string> = {
  "Article / Guide": "深度文章 / 指南页（分章节讲清楚一件事，可配目录与 FAQ）",
  "Product Page": "电商「商品向」落地页（可能是类目/筛选列表、单品商详或店铺馆——请看下方细分形态）",
  "Collection / Bestlist": "清单 / 合集页（多选项对比、排行或「Top N」结构）",
  "Comparison Page": "对比页（A vs B、维度表、结论与适用人群）",
  "QA / FAQ Page": "问答 / FAQ 页（短答优先，可抢精选摘要与长尾问句）",
  "Tool / Calculator": "工具 / 计算器页（交互为主，辅以说明与示例）",
};

type ContentFormDirective = {
  headline?: string;
  doThis?: string;
  notThisFirst?: string;
  pairWith?: string[];
};

const canonicalSurfaceZh: Record<string, string> = {
  article_longform: "深度长文 / 教程",
  listicle_collection: "清单 / 合集 / 导购排行",
  comparison_page: "对比页（vs / 维度表）",
  pdp_single_sku: "单品商详（PDP）",
  plp_category_or_search: "类目或筛选列表（PLP，多商品卡片）",
  store_brand_hub: "店铺 / 品牌馆（多 SKU 聚合）",
  qa_faq_hub: "问答 / FAQ 聚合",
  tool_interactive: "工具 / 计算器交互页",
  unspecified: "未细分（需结合 URL 再判）",
};

function Layer3Report({ data }: { data: Record<string, unknown> }) {
  const decision = data.decision as { primaryAsset: string; supportAssets: string[]; primaryScore: number } | undefined;
  const scoring = data.assetFitScoring as Array<{ asset: string; score: number }> | undefined;
  const alignment = data.pageTypeAlignment as { primaryAsset: string; dominantSerppageType: string; aligned: boolean; alignmentNote?: string } | undefined;
  const sys3 = data.systematicAnalysis as SystematicBlock | undefined;
  const directive = data.contentFormDirective as ContentFormDirective | undefined;
  const routing = data.contentFormRouting as {
    canonicalSurface?: string;
    contentShapeBucket?: string;
    operatorHint?: string;
    flags?: Record<string, boolean>;
  } | undefined;
  const granularity = data.contentGranularity as {
    canonicalSurface?: string;
    explainForOperator?: string;
    productIfApplicable?: {
      isSingleSkuDetail?: boolean;
      isCategoryListing?: boolean;
      isStoreOrBrandHub?: boolean;
    } | null;
  } | undefined;
  const primary = decision?.primaryAsset;
  const fallbackLine =
    primary != null
      ? `建议优先按「${primaryAssetPlainZh[primary] ?? primary}」规划你的主落地页；辅助可考虑：${(decision?.supportAssets ?? []).join("、") || "无"}。`
      : null;

  return (
    <div className="space-y-6">
      {(directive?.headline || directive?.doThis || primary) && (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80">结论 · 你要做什么内容形态</div>
          <div className="mt-2 text-base font-bold leading-snug text-emerald-950">
            {directive?.headline ?? (primary ? `你要做的内容形态：${primaryAssetPlainZh[primary] ?? primary}` : "内容形态结论")}
          </div>
          {(directive?.doThis || fallbackLine) && (
            <p className="mt-3 text-sm leading-relaxed text-emerald-950/95 whitespace-pre-wrap">{directive?.doThis ?? fallbackLine}</p>
          )}
          {directive?.notThisFirst && (
            <p className="mt-3 text-sm text-amber-900/95 border-t border-emerald-200/80 pt-3"><span className="font-semibold text-amber-950">暂不要优先做：</span>{directive.notThisFirst}</p>
          )}
          {directive?.pairWith && directive.pairWith.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
              {directive.pairWith.map((x, i) => (
                <li key={i}><span className="font-semibold">可搭配：</span>{x}</li>
              ))}
            </ul>
          )}
          {primary && (
            <div className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs text-emerald-900/90">
              系统枚举：<code className="rounded bg-emerald-100/80 px-1.5 py-0.5">{primary}</code>
              {decision?.primaryScore != null ? <> · 适配分 <strong>{decision.primaryScore}</strong>/100</> : null}
            </div>
          )}
          {(routing?.canonicalSurface || routing?.contentShapeBucket) && (
            <div className="mt-3 rounded-lg border border-emerald-200/90 bg-white px-3 py-2 text-xs text-emerald-950">
              <div className="font-semibold text-emerald-900">程序化路由 · 细分落地形态</div>
              <div className="mt-1">
                <code className="rounded bg-zinc-100 px-1.5 py-0.5">{routing?.canonicalSurface ?? "—"}</code>
                <span className="ml-2 text-emerald-900/90">
                  {canonicalSurfaceZh[routing?.canonicalSurface ?? ""] ?? routing?.canonicalSurface ?? ""}
                </span>
              </div>
              {routing?.contentShapeBucket && (
                <div className="mt-1 text-emerald-800/90">
                  粗桶 <code className="rounded bg-zinc-100 px-1">{routing.contentShapeBucket}</code>
                  {routing.flags && (
                    <span className="ml-2">
                      PLP倾向 {routing.flags.preferPlpLayout ? "是" : "否"} · PDP倾向 {routing.flags.preferPdpLayout ? "是" : "否"}
                      · 店铺馆 {routing.flags.preferStoreHubLayout ? "是" : "否"}
                    </span>
                  )}
                </div>
              )}
              {(routing?.operatorHint || granularity?.explainForOperator) && (
                <p className="mt-2 text-emerald-900/95">{routing?.operatorHint ?? granularity?.explainForOperator}</p>
              )}
              {granularity?.productIfApplicable && primary === "Product Page" && (
                <p className="mt-1 text-zinc-600">
                  模型标注：单品商详 {granularity.productIfApplicable.isSingleSkuDetail ? "是" : "否"}
                  {" · "}类目列表 {granularity.productIfApplicable.isCategoryListing ? "是" : "否"}
                  {" · "}店铺馆 {granularity.productIfApplicable.isStoreOrBrandHub ? "是" : "否"}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {sys3?.overview && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <div className="text-sm font-semibold text-zinc-900">AI 系统性解读（第 3 步）</div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-800">{sys3.overview}</p>
          {alignment?.alignmentNote && (
            <p className="mt-2 text-sm text-indigo-900/90"><span className="font-semibold">对齐说明：</span>{alignment.alignmentNote}</p>
          )}
          {sys3.whyPrimary && sys3.whyPrimary.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-indigo-800">为何选该主形态</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-800">{sys3.whyPrimary.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {sys3.whenToPivot && sys3.whenToPivot.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-amber-800">何时应考虑换形态</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900/90">{sys3.whenToPivot.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3">
        <div className="text-sm font-semibold text-indigo-900">关键发现</div>
        <div className="mt-1 text-sm text-indigo-800 space-y-1">
          {decision && (
            <>
              <div>推荐主要资产: <strong>{decision.primaryAsset}</strong>（适配分 {decision.primaryScore}/100）</div>
              {decision.supportAssets.length > 0 && <div>推荐辅助资产: {decision.supportAssets.join("、")}</div>}
            </>
          )}
          {alignment && <div>与 SERP 主导类型「{alignment.dominantSerppageType || "Unknown"}」{alignment.aligned ? "对齐" : "不对齐"}</div>}
        </div>
      </div>
      <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
        <div className="text-sm font-semibold text-amber-900">对下一步的影响</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
          {decision?.primaryAsset === "Collection / Bestlist" && <li>下一步会按「清单/合集」生成章节结构与对比表思路</li>}
          {decision?.primaryAsset === "Article / Guide" && <li>下一步会按「教程/长文」生成章节结构与必写点</li>}
          {decision?.primaryAsset === "Product Page" && <li>下一步会按「产品详情」生成卖点、规格与信任模块思路</li>}
          {decision?.primaryAsset === "Comparison Page" && <li>下一步会按「对比页」生成对照维度与结论框架</li>}
          {decision?.primaryAsset === "QA / FAQ Page" && <li>下一步会按「问答页」生成短答结构与 FAQ 控制点</li>}
          {alignment?.aligned === false && <li>推荐资产与 SERP 类型不对齐，需要人工确认</li>}
        </ul>
      </div>
      <div className="rounded-xl border-l-4 border-green-500 bg-green-50 px-4 py-3">
        <div className="text-sm font-semibold text-green-900">建议</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-800">
          {decision && decision.primaryScore >= 80 && <li>适配分 ≥ 80，强烈推荐</li>}
          {decision && decision.primaryScore >= 60 && decision.primaryScore < 80 && <li>适配分中等，可以做但需注意差异化</li>}
          {decision && decision.primaryScore < 60 && <li>适配分偏低，建议重新评估关键词</li>}
          {alignment?.aligned === false && <li>建议确认：是否真的想用 {decision?.primaryAsset}？</li>}
        </ul>
      </div>
      {scoring && scoring.length > 0 && (
        <details className="rounded-xl border border-zinc-200 bg-zinc-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-700">全部资产适配打分</summary>
          <div className="px-4 pb-3 space-y-2">
            {scoring.map((s) => (
              <div key={s.asset} className="flex items-center gap-3">
                <span className="w-36 text-xs text-zinc-600">{s.asset}</span>
                <div className="flex-1 rounded-full bg-zinc-200">
                  <div className={`rounded-full py-1 text-center text-xs font-semibold text-white ${s.score >= 80 ? "bg-green-500" : s.score >= 60 ? "bg-indigo-500" : "bg-zinc-400"}`}
                    style={{ width: `${Math.max(s.score, 8)}%` }}>{s.score}</div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

type Playbook = {
  angle?: string;
  tactics?: string[];
  competitorGaps?: string[];
  problemsOrRisks?: string[];
  yourActions?: string[];
};

function Layer4Report({ data }: { data: Record<string, unknown> }) {
  const strategist = data.primaryStrategist as { asset: string; mustCover?: string[]; structure?: string[]; seoSignals?: string[]; targetWordCount?: number; h1?: string } | undefined;
  const playbook = data.playbook as Playbook | undefined;
  const sys4 = data.systematicAnalysis as SystematicBlock | undefined;
  if (!strategist) return <div className="text-sm text-zinc-400">暂无策略数据</div>;

  return (
    <div className="space-y-6">
      {(sys4?.executiveSummary || (sys4?.contentBattlePlan && sys4.contentBattlePlan.length > 0)) && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <div className="text-sm font-semibold text-zinc-900">AI 系统性解读（第 4 步）</div>
          {sys4.executiveSummary && <p className="mt-2 text-sm leading-relaxed text-zinc-800">{sys4.executiveSummary}</p>}
          {sys4.contentBattlePlan && sys4.contentBattlePlan.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-800">{sys4.contentBattlePlan.map((x, i) => <li key={i}>{x}</li>)}</ul>
          )}
        </div>
      )}
      {playbook && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
          <div className="text-sm font-semibold text-emerald-950">可执行打法（Playbook）</div>
          {playbook.angle && <p className="mt-2 text-sm font-medium text-emerald-900">{playbook.angle}</p>}
          {playbook.tactics && playbook.tactics.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">推荐打法</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-emerald-900">{playbook.tactics.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {playbook.competitorGaps && playbook.competitorGaps.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">他们现在缺什么</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-emerald-900">{playbook.competitorGaps.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {playbook.problemsOrRisks && playbook.problemsOrRisks.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">分析看到的问题 / 风险</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">{playbook.problemsOrRisks.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {playbook.yourActions && playbook.yourActions.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">你可以立刻做什么</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-emerald-950">{playbook.yourActions.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3">
        <div className="text-sm font-semibold text-indigo-900">关键发现</div>
        <div className="mt-1 text-sm text-indigo-800 space-y-1">
          <div>系统为当前词匹配的内容形态: <strong>{strategist.asset}</strong></div>
          {strategist.h1 && <div>推荐 H1: {strategist.h1}</div>}
          {strategist.targetWordCount && <div>目标字数: ~{strategist.targetWordCount} 词</div>}
          {strategist.mustCover && <div>必须覆盖 {strategist.mustCover.length} 个内容点</div>}
          {strategist.structure && <div>内容结构 {strategist.structure.length} 个模块</div>}
        </div>
      </div>
      <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
        <div className="text-sm font-semibold text-amber-900">对下一步的影响</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
          {strategist.mustCover && strategist.mustCover.length > 0 && <li>最后一步会把「必写点」固化成 mustWrite 等控制字段，给 AI 写稿当硬约束</li>}
          {strategist.structure && strategist.structure.length > 0 && <li>章节结构会进入最终 JSON，减少写稿跑偏</li>}
          {strategist.seoSignals && strategist.seoSignals.length > 0 && <li>SEO 要点会进入 seoControls，避免只写正文忘记技术信号</li>}
        </ul>
      </div>
      <div className="rounded-xl border-l-4 border-green-500 bg-green-50 px-4 py-3">
        <div className="text-sm font-semibold text-green-900">建议</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-800">
          {strategist.mustCover && strategist.mustCover.length > 0 && <li>检查必写项列表，确认是否都与业务相关</li>}
          <li>继续最后一步：一键复制「SERP 总结 + 打法 + 控制指令」完整 JSON</li>
        </ul>
      </div>
      {strategist.mustCover && strategist.mustCover.length > 0 && (
        <details className="rounded-xl border border-red-200 bg-red-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-red-800">必写项（{strategist.mustCover.length}个）</summary>
          <ul className="px-4 pb-3 list-disc space-y-1 pl-8 text-sm text-red-700">
            {strategist.mustCover.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </details>
      )}
      {strategist.structure && strategist.structure.length > 0 && (
        <details className="rounded-xl border border-zinc-200 bg-zinc-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-700">内容结构（{strategist.structure.length}个模块）</summary>
          <ol className="px-4 pb-3 list-decimal space-y-1 pl-8 text-sm text-zinc-700">
            {strategist.structure.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </details>
      )}
    </div>
  );
}

function Layer5Report({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState<string | null>(null);
  const finalStrategy = data.finalStrategy as {
    pageType?: string; entryPoint?: string; mustWrite?: string[];
    gaps?: string[]; misconceptions?: string[]; titleSuggestions?: string[];
    contentStructure?: string[] | Record<string, unknown>; seoControls?: string[]; _source?: string;
  } | undefined;
  const viabilityGate = data.viabilityGate as { canProceed: boolean; score: number } | undefined;
  const playbook = data.playbook as Playbook | undefined;
  const serpSummary = data.serpSummary as SerpSummaryBlock | undefined;
  const finalBundleJson = typeof data.finalBundleJson === "string" ? data.finalBundleJson : "";
  const finalBundle = data.finalBundle as { unified_engine?: Record<string, unknown> } | undefined;
  const ue = finalBundle?.unified_engine as {
    unified_routing?: { primary_unified?: string; surface?: string };
    viability_engine?: { action?: string; score?: number };
  } | undefined;

  async function copyFinal() {
    if (!finalBundleJson) return;
    setCopyErr(null);
    try {
      await navigator.clipboard.writeText(finalBundleJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyErr("复制失败：请改用右上角「JSON」全选复制");
    }
  }

  return (
    <div className="space-y-6">
      {finalBundleJson && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-sky-950">最终交付：完整 JSON</div>
              <div className="mt-1 text-xs text-sky-800">已包含：SERP 总结、特色板块、`contentFormDirective`、`contentGranularity`（PDP/PLP 等细分）、`contentFormRouting`、打法手册、controlSignals、<strong className="text-sky-900">unified_engine</strong>（规则引擎拼装：可行性 / 竞品抽样 / 关键词桶 / 分资产控制面）等</div>
            </div>
            <button type="button" onClick={copyFinal}
              className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-sky-700">
              {copied ? "已复制" : "复制完整 JSON"}
            </button>
          </div>
          {copyErr && <div className="mt-2 text-xs text-red-600">{copyErr}</div>}
        </div>
      )}
      {ue && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <div className="font-semibold">统一引擎（unified_engine）快照</div>
          <div className="mt-1 text-xs text-emerald-900/95">
            统一资产 <strong>{ue.unified_routing?.primary_unified ?? "—"}</strong>
            {" · "}
            surface {ue.unified_routing?.surface ?? "—"}
            {" · "}
            可行性 <strong>{ue.viability_engine?.action ?? "—"}</strong>
            {typeof ue.viability_engine?.score === "number" ? `（${ue.viability_engine.score} 分）` : ""}
          </div>
        </div>
      )}
      {(serpSummary?.headline || playbook?.angle) && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {serpSummary?.headline && <div><span className="font-semibold text-zinc-900">SERP：</span>{serpSummary.headline}</div>}
          {playbook?.angle && <div className="mt-1"><span className="font-semibold text-zinc-900">打法：</span>{playbook.angle}</div>}
        </div>
      )}
      <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3">
        <div className="text-sm font-semibold text-indigo-900">关键发现</div>
        <div className="mt-1 text-sm text-indigo-800 space-y-1">
          {finalStrategy && (
            <>
              <div>生成来源: <strong>{finalStrategy._source ?? "Unknown"}</strong></div>
              <div>页面类型: <strong>{finalStrategy.pageType ?? "-"}</strong></div>
              <div>切入点: {finalStrategy.entryPoint ?? "-"}</div>
              {finalStrategy.mustWrite && <div>必写项 {finalStrategy.mustWrite.length} 条</div>}
              {finalStrategy.gaps && finalStrategy.gaps.length > 0 && <div>SERP 缺口 {finalStrategy.gaps.length} 个</div>}
              {finalStrategy.titleSuggestions && <div>标题建议 {finalStrategy.titleSuggestions.length} 个</div>}
            </>
          )}
          {viabilityGate && <div>可行性评分: <strong className={viabilityGate.canProceed ? "text-green-700" : "text-red-700"}>{viabilityGate.score}/100</strong></div>}
        </div>
      </div>
      <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
        <div className="text-sm font-semibold text-amber-900">对下一步的影响</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
          <li>完整 JSON 把「SERP 层结论」和「控制指令」绑在一起，下游生成不容易丢上下文</li>
          <li>mustWrite → 生成模型必须包含这些内容点</li>
          <li>gaps → 优先覆盖竞争对手缺失的内容</li>
          {finalStrategy?.misconceptions && finalStrategy.misconceptions.length > 0 && <li>misconceptions → 需要纠正这些误区</li>}
          <li>也可点右上角「JSON」查看原始分层数据</li>
        </ul>
      </div>
      <div className="rounded-xl border-l-4 border-green-500 bg-green-50 px-4 py-3">
        <div className="text-sm font-semibold text-green-900">建议</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-800">
          {viabilityGate?.canProceed === false && <li className="text-red-700">可行性过低，建议先优化关键词</li>}
          {viabilityGate?.canProceed && <li>可行性通过，可以继续生成内容</li>}
          <li>优先使用上方「复制完整 JSON」粘贴到内容生成流程</li>
        </ul>
      </div>
      {finalStrategy?.mustWrite && finalStrategy.mustWrite.length > 0 && (
        <details className="rounded-xl border border-red-200 bg-red-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-red-800">必写项（{finalStrategy.mustWrite.length}个）</summary>
          <ul className="px-4 pb-3 list-disc space-y-1 pl-8 text-sm text-red-700">
            {finalStrategy.mustWrite.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </details>
      )}
      {finalStrategy?.gaps && finalStrategy.gaps.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-800">SERP 缺口项（{finalStrategy.gaps.length}个）</summary>
          <ul className="px-4 pb-3 list-disc space-y-1 pl-8 text-sm text-amber-700">
            {finalStrategy.gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </details>
      )}
      {finalStrategy?.misconceptions && finalStrategy.misconceptions.length > 0 && (
        <details className="rounded-xl border border-orange-200 bg-orange-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-orange-800">误区纠正项（{finalStrategy.misconceptions.length}个）</summary>
          <ul className="px-4 pb-3 list-disc space-y-1 pl-8 text-sm text-orange-700">
            {finalStrategy.misconceptions.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </details>
      )}
      {finalStrategy?.titleSuggestions && finalStrategy.titleSuggestions.length > 0 && (
        <details className="rounded-xl border border-indigo-200 bg-indigo-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-indigo-800">标题建议（{finalStrategy.titleSuggestions.length}个）</summary>
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {finalStrategy.titleSuggestions.map((t, i) => (
              <span key={i} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 border border-indigo-100">{t}</span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

const layerReportMap: Record<string, React.ComponentType<{ data: Record<string, unknown> }>> = {
  layer1: Layer1Report,
  layer2: Layer2Report,
  layer3: Layer3Report,
  layer4: Layer4Report,
  layer5: Layer5Report,
};

export function StrategyV2Client() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("2156");
  const [language, setLanguage] = useState("zh-cn");
  const [consumerProfile, setConsumerProfile] = useState<"smart_content" | "dhgate_commerce">("smart_content");
  const [loading, setLoading] = useState(false);
  const [layers, setLayers] = useState<AnalysisLayer[]>([
    { id: "layer1", name: "第1步 · 抓取事实 + AI 读懂 SERP", description: "程序只负责拉 SERP 与落地页结构数据；本步结论（总结、特色块解读、竞品写法）由大模型生成。", status: "pending", data: {} },
    { id: "layer2", name: "第2步 · AI 判断意图与可行性", description: "页面类型分布、查询模式、意图是否分裂、可行性评分与警示，均由大模型基于上一步事实输出。", status: "pending", data: {} },
    { id: "layer3", name: "第3步 · AI 选择主内容形态", description: "各资产形态适配分、主推/辅助形态、与 SERP 是否对齐，由大模型解释并给出结构化结果。", status: "pending", data: {} },
    { id: "layer4", name: "第4步 · AI 产出打法与大纲", description: "必写点、章节结构、SEO 要点、Playbook（打法/缺口/风险/行动）由大模型统一生成。", status: "pending", data: {} },
    { id: "layer5", name: "第5步 · AI 生成写稿控制信号", description: "mustWrite、gaps、标题建议等下游控制字段由大模型综合前四层输出；可一键复制 JSON。", status: "pending", data: {} },
  ]);
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [showJson, setShowJson] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingSec, setLoadingSec] = useState(0);

  useEffect(() => {
    if (!loading) {
      setLoadingSec(0);
      return;
    }
    setLoadingSec(0);
    const id = setInterval(() => setLoadingSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const locationOptions = [
    { value: "2156", label: "中国" }, { value: "2840", label: "美国" },
    { value: "2826", label: "英国" }, { value: "2392", label: "日本" },
  ];
  const languageOptions = [
    { value: "zh-cn", label: "中文" }, { value: "en", label: "English" }, { value: "ja", label: "日本語" },
  ];
  function toggleLayer(id: string) { setExpandedLayers((p) => ({ ...p, [id]: !p[id] })); }
  function toggleJson(id: string) { setShowJson((p) => ({ ...p, [id]: !p[id] })); }

  async function onAnalyze() {
    if (!keyword.trim()) return;
    const kw = keyword.trim();
    const layerIds = ["layer1", "layer2", "layer3", "layer4", "layer5"] as const;

    type LayerId = (typeof layerIds)[number];
    const acc: Partial<Record<LayerId, Record<string, unknown>>> = {};

    function packData(id: LayerId, bundle: Partial<Record<LayerId, Record<string, unknown>>>) {
      const raw = bundle[id] ?? {};
      return id === "layer1" ? { ...raw, _keyword: kw } : raw;
    }

    setLoading(true);
    setError(null);
    setExpandedLayers({});
    setShowJson({});
    setLayers((p) =>
      p.map((l, i) => ({
        ...l,
        status: (i === 0 ? "active" : "pending") as AnalysisLayer["status"],
        data: {},
      })),
    );

    try {
      for (let i = 0; i < layerIds.length; i++) {
        const stepId = layerIds[i];
        setLayers((prev) =>
          prev.map((l, idx) => {
            if (idx < i) return { ...l, status: "completed", data: packData(layerIds[idx], acc) };
            if (idx === i) return { ...l, status: "active", data: {} };
            return { ...l, status: "pending", data: {} };
          }),
        );

        const previousLayers =
          i === 0
            ? undefined
            : {
                ...(acc.layer1 ? { layer1: acc.layer1 } : {}),
                ...(acc.layer2 ? { layer2: acc.layer2 } : {}),
                ...(acc.layer3 ? { layer3: acc.layer3 } : {}),
                ...(acc.layer4 ? { layer4: acc.layer4 } : {}),
              };

        const res = await fetch("/api/strategy-v2/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            keyword: kw,
            location,
            language,
            consumer_profile: consumerProfile,
            layer: stepId,
            ...(previousLayers && Object.keys(previousLayers).length > 0 ? { previousLayers } : {}),
          }),
          signal: AbortSignal.timeout(240_000),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || `第 ${i + 1} 步失败`);
        }
        const json = (await res.json()) as { data?: Record<string, unknown> };
        if (!json.data) throw new Error(`第 ${i + 1} 步返回数据为空`);
        acc[stepId] = json.data;

        setLayers((prev) =>
          prev.map((l, idx) => {
            if (idx <= i) return { ...l, status: "completed", data: packData(layerIds[idx], acc) };
            if (idx === i + 1 && i + 1 < layerIds.length) return { ...l, status: "active", data: {} };
            return { ...l, status: "pending", data: {} };
          }),
        );
      }

      setExpandedLayers(Object.fromEntries(layerIds.map((id) => [id, true])));
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.name === "TimeoutError" || e.message.includes("aborted")
            ? "单步请求超时（已超过 4 分钟）。可换关键词/市场后重试。"
            : e.message
          : "未知错误";
      setError(msg);
      setLayers((p) => p.map((l) => (l.status === "active" ? { ...l, status: "error" as const, data: {} } : l)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 p-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">分层策略分析（给写稿流水线用）</div>
        <div className="mt-1 text-xs text-zinc-500">从「看懂 SERP」到「可复制 JSON」五步走完。<strong className="text-zinc-700">当前为五步串行请求</strong>：每步接口返回后，该步会<strong className="text-zinc-700">立刻打勾并展示结果</strong>，再进入下一步；前几步结论会通过 <code className="rounded bg-zinc-100 px-1">previousLayers</code> 传给服务器，<strong className="text-zinc-700">不会重复拉 SERP / 重复抓落地页</strong>。整段仍可能需 1～3 分钟。每层都有：关键发现 → 对下一步的影响 → 建议</div>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm text-zinc-700">关键词</label>
            <input type="text" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="输入关键词" value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onAnalyze(); }} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-700">目标市场</label>
            <select className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={location} onChange={(e) => setLocation(e.target.value)}>
              {locationOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-700">目标语言</label>
            <select className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={language} onChange={(e) => setLanguage(e.target.value)}>
              {languageOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-2 md:min-w-[11rem]">
            <label className="text-sm text-zinc-700">消费画像</label>
            <select className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={consumerProfile} onChange={(e) => setConsumerProfile(e.target.value as "smart_content" | "dhgate_commerce")}>
              <option value="smart_content">通用内容站</option>
              <option value="dhgate_commerce">DHgate 电商</option>
            </select>
            <div className="text-[11px] leading-snug text-zinc-500">仅影响最后一步 JSON 里的 <code className="rounded bg-zinc-100 px-0.5">unified_engine</code> 路由与分支默认值。</div>
          </div>
          <Button onClick={onAnalyze} disabled={!keyword.trim() || loading}>{loading ? "分析中..." : "开始分析"}</Button>
        </div>
        {loading && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
            <span className="font-semibold">正在逐步分析</span>
            ：每步完成后会马上更新对应卡片。
            <span className="ml-1 tabular-nums text-amber-900">已进行约 {loadingSec} 秒</span>
          </div>
        )}
      </section>
      {error && (
        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="text-sm font-semibold text-red-700">分析失败</div>
          <div className="mt-2 text-sm text-red-600">{error}</div>
        </section>
      )}
      <div className="mt-6 space-y-4">
        {layers.map((layer) => {
          const ReportComponent = layerReportMap[layer.id];
          const hasData = Object.keys(layer.data).length > 0;
          return (
            <section key={layer.id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="flex w-full items-stretch">
                <button type="button" onClick={() => toggleLayer(layer.id)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors">
                  <div className="flex min-w-0 items-center gap-3">
                    {layer.status === "completed" ? (
                      <svg className="h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : layer.status === "active" ? (
                      <svg className="h-5 w-5 shrink-0 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : layer.status === "error" ? (
                      <svg className="h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <div className="h-5 w-5 shrink-0 rounded-full border-2 border-zinc-300" />
                    )}
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${layer.status === "completed" ? "text-zinc-900" : layer.status === "active" ? "text-indigo-600" : layer.status === "error" ? "text-red-600" : "text-zinc-400"}`}>{layer.name}</div>
                      <div className="text-xs text-zinc-500">{layer.description}</div>
                    </div>
                  </div>
                  <svg className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${expandedLayers[layer.id] ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {hasData && (
                  <div className="flex shrink-0 items-center border-l border-zinc-100 bg-white px-2">
                    <button type="button" onClick={() => toggleJson(layer.id)}
                      className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50">
                      {showJson[layer.id] ? "报告" : "JSON"}
                    </button>
                  </div>
                )}
              </div>
              {expandedLayers[layer.id] && (
                <div className="border-t border-zinc-200 px-5 py-4">
                  {hasData ? (
                    showJson[layer.id] ? (
                      <pre className="max-h-96 overflow-auto rounded-xl bg-zinc-50 p-4 text-xs text-zinc-700">{JSON.stringify(layer.data, null, 2)}</pre>
                    ) : ReportComponent ? (
                      <ReportComponent data={layer.data} />
                    ) : <div className="text-sm text-zinc-400">暂无报告</div>
                  ) : <div className="text-sm text-zinc-400">等待分析...</div>}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
