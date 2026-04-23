/**
 * 将 Layer3 的 primaryAsset（英文枚举）映射为流水线可用的稳定桶与布尔旗标。
 * 另提供 canonicalSurface：比 primaryAsset 更细，尤其区分「商品页」下的 PLP / PDP / 店铺馆等。
 */

export const PRIMARY_ASSETS = [
  "Article / Guide",
  "Product Page",
  "Collection / Bestlist",
  "Comparison Page",
  "QA / FAQ Page",
  "Tool / Calculator",
] as const;

export type PrimaryAsset = (typeof PRIMARY_ASSETS)[number];

/** 粗桶：与生成器大类路由 */
export type ContentShapeBucket =
  | "article_longform"
  | "list_ranking"
  | "comparison_matrix"
  | "product_sku"
  | "qa_snippets"
  | "tool_interactive"
  | "unknown";

/** 细粒度落地形态（程序化优先读这个） */
export type CanonicalContentSurface =
  | "article_longform"
  | "listicle_collection"
  | "comparison_page"
  | "pdp_single_sku"
  | "plp_category_or_search"
  | "store_brand_hub"
  | "qa_faq_hub"
  | "tool_interactive"
  | "unspecified";

const CANONICAL_SET = new Set<string>([
  "article_longform",
  "listicle_collection",
  "comparison_page",
  "pdp_single_sku",
  "plp_category_or_search",
  "store_brand_hub",
  "qa_faq_hub",
  "tool_interactive",
  "unspecified",
]);

export function primaryAssetToBucket(asset: string | null | undefined): ContentShapeBucket {
  switch ((asset ?? "").trim()) {
    case "Article / Guide":
      return "article_longform";
    case "Collection / Bestlist":
      return "list_ranking";
    case "Comparison Page":
      return "comparison_matrix";
    case "Product Page":
      return "product_sku";
    case "QA / FAQ Page":
      return "qa_snippets";
    case "Tool / Calculator":
      return "tool_interactive";
    default:
      return "unknown";
  }
}

/** 无模型细分类时，按主资产给一个保守默认（宁可 unspecified 也不要瞎猜 PDP） */
export function defaultCanonicalForPrimary(primaryAsset: string): CanonicalContentSurface {
  switch ((primaryAsset ?? "").trim()) {
    case "Article / Guide":
      return "article_longform";
    case "Collection / Bestlist":
      return "listicle_collection";
    case "Comparison Page":
      return "comparison_page";
    case "Product Page":
      return "unspecified";
    case "QA / FAQ Page":
      return "qa_faq_hub";
    case "Tool / Calculator":
      return "tool_interactive";
    default:
      return "unspecified";
  }
}

export function normalizeCanonicalSurface(
  raw: string | null | undefined,
  primaryAsset: string,
): CanonicalContentSurface {
  const v = (raw ?? "").trim();
  if (v && CANONICAL_SET.has(v)) return v as CanonicalContentSurface;
  return defaultCanonicalForPrimary(primaryAsset);
}

export type ContentFormRoutingFlags = {
  preferListBlocks: boolean;
  preferLongNarrative: boolean;
  preferSkuModules: boolean;
  preferFaqShortAnswer: boolean;
  preferEmbeddedTool: boolean;
  /** 类目/搜索式多商品列表：筛选、宫格、进详情 */
  preferPlpLayout: boolean;
  /** 单品商详：主图、SKU、参数、评价、加购 */
  preferPdpLayout: boolean;
  /** 店铺/品牌聚合页 */
  preferStoreHubLayout: boolean;
};

export function routingFlags(
  bucket: ContentShapeBucket,
  canonical: CanonicalContentSurface,
): ContentFormRoutingFlags {
  const base = {
    preferListBlocks: bucket === "list_ranking" || bucket === "comparison_matrix",
    preferLongNarrative: bucket === "article_longform",
    preferSkuModules: bucket === "product_sku",
    preferFaqShortAnswer: bucket === "qa_snippets",
    preferEmbeddedTool: bucket === "tool_interactive",
    preferPlpLayout:
      canonical === "plp_category_or_search" ||
      canonical === "listicle_collection" ||
      canonical === "comparison_page",
    preferPdpLayout: canonical === "pdp_single_sku",
    preferStoreHubLayout: canonical === "store_brand_hub",
  };
  return base;
}

export type ContentGranularityInput = {
  canonicalSurface?: string;
  explainForOperator?: string;
  productIfApplicable?: {
    isSingleSkuDetail?: boolean;
    isCategoryListing?: boolean;
    isStoreOrBrandHub?: boolean;
  };
};

function canonicalFromGranularity(
  primaryAsset: string,
  g: ContentGranularityInput | null | undefined,
): CanonicalContentSurface {
  if (g?.canonicalSurface) {
    return normalizeCanonicalSurface(g.canonicalSurface, primaryAsset);
  }
  const p = g?.productIfApplicable;
  if ((primaryAsset ?? "").trim() === "Product Page" && p) {
    if (p.isSingleSkuDetail) return "pdp_single_sku";
    if (p.isCategoryListing) return "plp_category_or_search";
    if (p.isStoreOrBrandHub) return "store_brand_hub";
  }
  return normalizeCanonicalSurface(undefined, primaryAsset);
}

export type ContentFormRouting = {
  primaryAsset: string;
  contentShapeBucket: ContentShapeBucket;
  canonicalSurface: CanonicalContentSurface;
  flags: ContentFormRoutingFlags;
  /** 模型对「到底是哪种落地页」的一句说明；可能为空 */
  operatorHint?: string;
};

export function buildContentFormRouting(
  primaryAsset: string | null | undefined,
  granularity?: ContentGranularityInput | null,
): ContentFormRouting {
  const pa = (primaryAsset ?? "").trim() || "Article / Guide";
  const bucket = primaryAssetToBucket(pa);
  const canonical = canonicalFromGranularity(pa, granularity ?? undefined);
  return {
    primaryAsset: pa,
    contentShapeBucket: bucket,
    canonicalSurface: canonical,
    flags: routingFlags(bucket, canonical),
    operatorHint: granularity?.explainForOperator?.trim() || undefined,
  };
}
