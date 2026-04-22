"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type AnalysisResult = {
  id: string;
  keyword: string;
  searchIntent: string;
  pageTypeDistribution: Array<{ type: string; label: string; count: number; percentage: number }>;
  serpFeatures: string[];
  competitors: Array<{
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
  }>;
  competitionLevel: string;
  recommendedStrategy: {
    pageType: string;
    entryPoint: string;
    mustWrite?: string[];
    gaps?: string[];
    misconceptions?: string[];
    differentiation?: string[];
    titleSuggestions: string[];
    contentStructure: object | string[];
    seoControls?: string[];
    seoOptimization?: string[];
    actionSteps?: string[];
  };
  relatedKeywords: string[];
  jsonOutput: string;
};

type HistoryItem = {
  id: string;
  keyword: string;
  status: string;
  createdAt: string;
};

type AnalysisStep = {
  id: string;
  label: string;
  description: string;
  status: "pending" | "active" | "completed" | "error";
  subSteps?: Array<{ label: string; status: "pending" | "active" | "completed" | "error"; domain?: string }>;
};

const initialSteps: AnalysisStep[] = [
  {
    id: "connect",
    label: "连接 Google 数据",
    description: "正在调用 DataForSEO API 获取 SERP 搜索结果",
    status: "pending",
  },
  {
    id: "fetch",
    label: "获取搜索结果",
    description: "正在解析 TOP 10 自然搜索结果",
    status: "pending",
  },
  {
    id: "classify",
    label: "页面类型分类",
    description: "正在分析每个结果属于什么页面类型",
    status: "pending",
  },
  {
    id: "crawl",
    label: "抓取竞争对手页面内容",
    description: "正在抓取 TOP 5 竞争对手页面进行分析",
    status: "pending",
    subSteps: [],
  },
  {
    id: "keywords",
    label: "关键词扩展",
    description: "正在获取相关关键词和长尾词",
    status: "pending",
  },
  {
    id: "analyze",
    label: "竞争分析",
    description: "正在评估竞争强度和搜索意图",
    status: "pending",
  },
  {
    id: "strategy",
    label: "AI 生成策略建议",
    description: "正在使用 GPT-4.1 mini 生成页面类型推荐和差异化策略",
    status: "pending",
  },
];

export function StrategyClient() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("2156");
  const [language, setLanguage] = useState("zh-cn");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>(initialSteps);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [competitorsCollapsed, setCompetitorsCollapsed] = useState(false);

  const locationOptions = [
    { value: "2156", label: "中国" },
    { value: "2840", label: "美国" },
    { value: "2826", label: "英国" },
    { value: "2392", label: "日本" },
  ];

  const languageOptions = [
    { value: "zh-cn", label: "中文" },
    { value: "en", label: "English" },
    { value: "ja", label: "日本語" },
  ];

  function updateStepStatus(stepId: string, status: AnalysisStep["status"]) {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status } : s)),
    );
  }

  async function runAnalysis() {
    // Simulate step-by-step progress
    updateStepStatus("connect", "active");
    await sleep(800);
    updateStepStatus("connect", "completed");

    updateStepStatus("fetch", "active");
    await sleep(1200);
    updateStepStatus("fetch", "completed");

    updateStepStatus("classify", "active");
    await sleep(1000);
    updateStepStatus("classify", "completed");

    // Crawl step - will be populated with real URLs after API returns
    updateStepStatus("crawl", "active");
    await sleep(500);

    updateStepStatus("keywords", "active");
    await sleep(1000);
    updateStepStatus("keywords", "completed");

    updateStepStatus("analyze", "active");
    await sleep(800);
    updateStepStatus("analyze", "completed");

    updateStepStatus("strategy", "active");
    await sleep(600);
  }

  /**
   * Build crawl sub-steps from real competitor data
   */
  function buildCrawlSubSteps(competitors: typeof result.competitors): Array<{ label: string; status: "pending" | "active" | "completed" | "error"; domain: string }> {
    const crawled = competitors.filter((c) => c.contentSummary);
    const notCrawled = competitors.filter((c) => !c.contentSummary);
    const subSteps: Array<{ label: string; status: "pending" | "active" | "completed" | "error"; domain: string }> = [];

    for (const c of crawled) {
      subSteps.push({
        label: c.domain,
        status: "completed",
        domain: c.domain,
      });
    }
    for (const c of notCrawled) {
      subSteps.push({
        label: c.domain,
        status: "pending",
        domain: c.domain,
      });
    }

    return subSteps;
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function onAnalyze() {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setElapsedTime(0);
    setSteps(
      initialSteps.map((s) => ({ ...s, status: "pending" as const })),
    );

    const timer = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);

    try {
      // Run step-by-step visualization
      await runAnalysis();

      // Now fetch the real data
      const res = await fetch("/api/strategy/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), location, language }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "分析失败");
      }

      const json = (await res.json()) as { data: AnalysisResult };
      setResult(json.data);
      loadHistory();

      // Update crawl step with real URLs
      if (json.data.competitors.length > 0) {
        const crawlSubSteps = buildCrawlSubSteps(json.data.competitors);
        setSteps((prev) =>
          prev.map((s) =>
            s.id === "crawl"
              ? {
                  ...s,
                  status: "completed" as const,
                  subSteps: crawlSubSteps,
                }
              : s,
          ),
        );
      }

      // Mark remaining steps as completed
      setSteps((prev) =>
        prev.map((s) => ({ ...s, status: "completed" as const })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "active" ? { ...s, status: "error" as const } : s,
        ),
      );
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch("/api/strategy/history");
      const json = (await res.json()) as { items: HistoryItem[] };
      setHistory(json.items ?? []);
    } catch {
      // ignore
    }
  }

  function getStepIcon(step: AnalysisStep) {
    if (step.status === "completed") {
      return (
        <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    if (step.status === "active") {
      return (
        <div className="h-5 w-5">
          <svg className="h-5 w-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      );
    }
    if (step.status === "error") {
      return (
        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <div className="h-5 w-5 rounded-full border-2 border-zinc-300" />
    );
  }

  return (
    <main className="flex-1 p-6">
      {/* 输入区域 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">关键词分析</div>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm text-zinc-700">关键词</label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="输入关键词，例如：best solar garden lights"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAnalyze();
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-700">目标市场</label>
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {locationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-700">目标语言</label>
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={onAnalyze} disabled={!keyword.trim() || loading}>
            {loading ? "分析中..." : "开始分析"}
          </Button>
        </div>
      </section>

      {/* 分析过程可视化 */}
      {loading && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-900">正在分析关键词</div>
            <div className="text-sm text-zinc-500">
              已用时：{elapsedTime}s
            </div>
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            关键词：{keyword}
          </div>

          {/* Progress steps */}
          <div className="mt-6 space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  {getStepIcon(step)}
                  {index < steps.length - 1 && (
                    <div
                      className={`mt-2 h-6 w-0.5 ${
                        step.status === "completed"
                          ? "bg-green-300"
                          : "bg-zinc-200"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div
                    className={`text-sm font-semibold ${
                      step.status === "completed"
                        ? "text-zinc-900"
                        : step.status === "active"
                        ? "text-indigo-600"
                        : step.status === "error"
                        ? "text-red-600"
                        : "text-zinc-400"
                    }`}
                  >
                    {step.label}
                  </div>
                  {step.status === "active" && (
                    <div className="mt-1 text-xs text-zinc-500">
                      {step.description}
                    </div>
                  )}
                  {step.status === "completed" && (
                    <div className="mt-1 text-xs text-green-600">已完成</div>
                  )}

                  {/* 子步骤（用于抓取页面） */}
                  {step.subSteps && step.subSteps.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3">
                      {step.subSteps.map((sub, subIdx) => {
                        const domain = "domain" in sub ? (sub as any).domain : "";
                        const faviconUrl = domain
                          ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
                          : "";

                        return (
                          <div key={subIdx} className="flex items-center gap-2 text-xs">
                            {sub.status === "completed" ? (
                              <svg className="h-4 w-4 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : sub.status === "active" ? (
                              <svg className="h-4 w-4 shrink-0 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <div className="h-4 w-4 shrink-0 rounded-full border border-zinc-300" />
                            )}

                            {/* Favicon */}
                            {faviconUrl && (
                              <img
                                src={faviconUrl}
                                alt=""
                                className="h-4 w-4 shrink-0 rounded-sm"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            )}

                            <span
                              className={
                                sub.status === "completed"
                                  ? "text-green-700"
                                  : sub.status === "active"
                                  ? "text-indigo-600 font-medium"
                                  : "text-zinc-400"
                              }
                            >
                              {sub.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-4 rounded-full bg-zinc-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500"
              style={{
                width: `${
                  (steps.filter((s) => s.status === "completed").length /
                    steps.length) *
                  100
                }%`,
              }}
            />
          </div>
        </section>
      )}

      {/* 错误提示 */}
      {error && (
        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="text-sm font-semibold text-red-700">分析失败</div>
          <div className="mt-2 text-sm text-red-600">{error}</div>
        </section>
      )}

      {/* 结果展示 */}
      {result && (
        <div className="mt-6 space-y-6">
          {/* 搜索意图 */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">搜索意图判断</div>
            <div className="mt-2 text-sm text-zinc-700">{result.searchIntent}</div>
          </section>

          {/* 页面类型分布 */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">SERP 页面类型分布</div>
            <div className="mt-4 space-y-3">
              {result.pageTypeDistribution.map((item) => (
                <div key={item.type} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-zinc-700">{item.label}</div>
                  <div className="flex-1 rounded-full bg-zinc-100">
                    <div
                      className="rounded-full bg-indigo-500 py-2 text-center text-xs font-semibold text-white"
                      style={{ width: `${item.percentage}%` }}
                    >
                      {item.count} ({item.percentage}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 竞争对手列表 */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-900">TOP 10 竞争对手</div>
                <div className="mt-1 text-xs text-zinc-500">（TOP 5 已抓取页面内容进行分析）</div>
              </div>
              <button
                type="button"
                onClick={() => setCompetitorsCollapsed((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                {competitorsCollapsed ? "展开" : "折叠"}
                <svg
                  className={`h-4 w-4 transition-transform ${competitorsCollapsed ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {!competitorsCollapsed && (
              <div className="mt-4 space-y-4">
              {result.competitors.map((c) => (
                <div key={c.rank} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          #{c.rank}
                        </span>
                        <span className="font-medium text-zinc-900">{c.title}</span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{c.url}</div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          {c.pageType}
                        </span>
                        <span className="text-xs text-zinc-500">{c.domain}</span>
                      </div>
                    </div>
                  </div>

                  {/* 页面内容分析摘要 */}
                  {c.contentSummary && (
                    <div className="mt-3 border-t border-zinc-200 pt-3">
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-zinc-700">字数：</span>
                          <span className="text-zinc-600">~{c.contentSummary.wordCount} 词</span>
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-700">图片：</span>
                          <span className="text-zinc-600">{c.contentSummary.imageCount} 张</span>
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-700">FAQ：</span>
                          <span className={c.contentSummary.hasFAQ ? "text-green-600" : "text-zinc-400"}>
                            {c.contentSummary.hasFAQ ? "有" : "无"}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-700">表格：</span>
                          <span className={c.contentSummary.hasTable ? "text-green-600" : "text-zinc-400"}>
                            {c.contentSummary.hasTable ? "有" : "无"}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-700">视频：</span>
                          <span className={c.contentSummary.hasVideo ? "text-green-600" : "text-zinc-400"}>
                            {c.contentSummary.hasVideo ? "有" : "无"}
                          </span>
                        </div>
                      </div>

                      {/* 页面大纲 */}
                      {c.contentSummary.headings.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-zinc-700">页面大纲（H1-H3）：</div>
                          <div className="mt-1 flex flex-wrap gap-1 text-xs text-zinc-500">
                            {c.contentSummary.headings.slice(0, 8).map((h, i) => (
                              <span key={i} className="rounded bg-white px-2 py-0.5">
                                {h.length > 40 ? h.slice(0, 40) + "..." : h}
                              </span>
                            ))}
                            {c.contentSummary.headings.length > 8 && (
                              <span className="text-zinc-400">+{c.contentSummary.headings.length - 8} more</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Meta Description */}
                      {c.contentSummary.metaDescription && (
                        <div className="mt-2 text-xs text-zinc-500">
                          <span className="font-semibold text-zinc-700">Meta Description：</span>
                          {c.contentSummary.metaDescription}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </section>

          {/* SERP 特色区块 */}
          {result.serpFeatures.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">SERP 特色区块</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.serpFeatures.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 竞争强度 */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">竞争强度</div>
            <div className="mt-2">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  result.competitionLevel === "极强" || result.competitionLevel === "强"
                    ? "bg-red-100 text-red-700"
                    : result.competitionLevel === "中等"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {result.competitionLevel}
              </span>
            </div>
          </section>

          {/* 推荐策略（生成控制信号） */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-900">生成控制信号（AI 生成）</div>
                <div className="mt-1 text-xs text-zinc-500">基于 SERP 缺口分析，输出可直接用于内容生成的控制信号</div>
              </div>
              <div className="text-xs text-zinc-500">GPT-4.1 mini</div>
            </div>
            <div className="mt-4 space-y-6">
              {/* 页面类型 + 切入点 */}
              <div className="flex gap-4">
                <div className="flex-1 rounded-xl bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-500">页面类型</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900">
                    {result.recommendedStrategy.pageType}
                  </div>
                </div>
                <div className="flex-1 rounded-xl bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-500">切入点</div>
                  <div className="mt-1 text-sm text-zinc-900">
                    {result.recommendedStrategy.entryPoint}
                  </div>
                </div>
              </div>

              {/* 必写项 */}
              {(result.recommendedStrategy.mustWrite?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <div className="text-sm font-semibold text-red-800">必写项（MUST WRITE）</div>
                  </div>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-red-700">
                    {result.recommendedStrategy.mustWrite?.map((d, i) => (
                      <li key={i}>{typeof d === "string" ? d : JSON.stringify(d)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 缺口项 */}
              {(result.recommendedStrategy.gaps?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <div className="text-sm font-semibold text-amber-800">SERP 缺口项（GAPS）</div>
                  </div>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-700">
                    {result.recommendedStrategy.gaps?.map((g, i) => (
                      <li key={i}>{typeof g === "string" ? g : JSON.stringify(g)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 误区项 */}
              {(result.recommendedStrategy.misconceptions?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <div className="text-sm font-semibold text-orange-800">误区纠正项（MISCONCEPTIONS）</div>
                  </div>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-orange-700">
                    {result.recommendedStrategy.misconceptions?.map((m, i) => (
                      <li key={i}>{typeof m === "string" ? m : JSON.stringify(m)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 标题建议 */}
              {result.recommendedStrategy.titleSuggestions?.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-zinc-700">标题建议</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.recommendedStrategy.titleSuggestions.map((t, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 内容结构 */}
              {result.recommendedStrategy.contentStructure && (
                <div>
                  <div className="text-sm font-semibold text-zinc-700">内容结构</div>
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    {/* H1 */}
                    {typeof result.recommendedStrategy.contentStructure === "object" && !Array.isArray(result.recommendedStrategy.contentStructure) && (
                      <div>
                        {"h1" in result.recommendedStrategy.contentStructure && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-zinc-500">H1</div>
                            <div className="mt-1 text-sm font-semibold text-zinc-900">
                              {typeof result.recommendedStrategy.contentStructure.h1 === "string"
                                ? result.recommendedStrategy.contentStructure.h1
                                : JSON.stringify(result.recommendedStrategy.contentStructure.h1)}
                            </div>
                          </div>
                        )}

                        {/* Intro */}
                        {"intro" in result.recommendedStrategy.contentStructure && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-zinc-500">首段控制信号</div>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-zinc-700">
                              {Array.isArray(result.recommendedStrategy.contentStructure.intro)
                                ? result.recommendedStrategy.contentStructure.intro.map((item, i) => (
                                    <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                                  ))
                                : null}
                            </ul>
                          </div>
                        )}

                        {/* Sections */}
                        {"sections" in result.recommendedStrategy.contentStructure && Array.isArray(result.recommendedStrategy.contentStructure.sections) && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-zinc-500">章节结构</div>
                            <div className="mt-2 space-y-3">
                              {result.recommendedStrategy.contentStructure.sections.map((sec: any, i: number) => (
                                <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3">
                                  <div className="text-sm font-semibold text-zinc-900">
                                    H2: {typeof sec.h2 === "string" ? sec.h2 : JSON.stringify(sec.h2)}
                                  </div>
                                  {sec.mustCover?.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs font-semibold text-green-600">必须覆盖：</div>
                                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-zinc-600">
                                        {sec.mustCover.map((m: string, j: number) => (
                                          <li key={j}>{m}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {sec.avoid?.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs font-semibold text-red-600">避免：</div>
                                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-zinc-600">
                                        {sec.avoid.map((a: string, j: number) => (
                                          <li key={j}>{a}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* FAQ */}
                        {"faq" in result.recommendedStrategy.contentStructure && Array.isArray(result.recommendedStrategy.contentStructure.faq) && (
                          <div>
                            <div className="text-xs font-semibold text-zinc-500">FAQ 控制信号</div>
                            <div className="mt-2 space-y-2">
                              {result.recommendedStrategy.contentStructure.faq.map((faq: any, i: number) => (
                                <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3">
                                  <div className="text-xs font-semibold text-zinc-900">Q: {faq.q}</div>
                                  <div className="mt-1 text-xs text-zinc-600">A: {faq.a}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fallback for legacy array format */}
                    {Array.isArray(result.recommendedStrategy.contentStructure) && result.recommendedStrategy.contentStructure.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
                        {result.recommendedStrategy.contentStructure.map((s, i) => (
                          <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* SEO 控制信号 */}
              {(result.recommendedStrategy.seoControls?.length ?? 0) > 0 && (
                <div>
                  <div className="text-sm font-semibold text-zinc-700">SEO 控制信号</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                    {result.recommendedStrategy.seoControls?.map((s, i) => (
                      <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* JSON 输出（用于内容生成） */}
          {result.jsonOutput && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">JSON 策略输出</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    复制后可用于内容生成模块的输入参数
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result.jsonOutput);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      setCopyError(true);
                      setTimeout(() => setCopyError(false), 2000);
                    }
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  {copied ? "✅ 已复制" : copyError ? "❌ 失败" : "📋 复制 JSON"}
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <pre className="max-h-80 overflow-auto text-xs text-zinc-700">
                  {result.jsonOutput}
                </pre>
              </div>
            </section>
          )}

          {/* 相关关键词 */}
          {result.relatedKeywords.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">相关关键词机会</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.relatedKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* 历史记录 */}
      {history.length > 0 && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">历史分析记录</div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">关键词</th>
                  <th className="px-4 py-3 text-left">状态</th>
                  <th className="px-4 py-3 text-left">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{h.keyword}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          h.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : h.status === "running"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
