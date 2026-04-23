/** 统一引擎对外资产枚举（同时服务 smart 与 DHgate 映射） */
export type UnifiedAsset =
  | "article"
  | "guide"
  | "qa_page"
  | "bestlist"
  | "comparison_page"
  | "product_page"
  | "category_page"
  | "collection_page"
  | "support_article";

export type ViabilityAction = "proceed" | "expand" | "skip" | "proceed_with_low_evidence";

export type OrganicInput = {
  rank: number;
  url: string;
  domain: string;
  title: string;
  description?: string;
  contentSummary?: { wordCount?: number; hasFAQ?: boolean; hasTable?: boolean };
  contentFetchError?: string;
};
