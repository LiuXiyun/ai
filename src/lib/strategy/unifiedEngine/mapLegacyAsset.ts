import type { UnifiedAsset } from "./types";

/** 将 strategy-v2 的 legacy primary + 细分 surface 映射为统一资产 ID */
export function mapLegacyToUnifiedAsset(params: {
  legacyPrimary: string;
  canonicalSurface?: string;
}): { primary_unified: UnifiedAsset; surface: string } {
  const lp = (params.legacyPrimary ?? "").trim();
  const cs = (params.canonicalSurface ?? "").trim();

  if (lp === "QA / FAQ Page") return { primary_unified: "qa_page", surface: cs || "qa_faq_hub" };
  if (lp === "Comparison Page") return { primary_unified: "comparison_page", surface: cs || "comparison_page" };
  if (lp === "Article / Guide") {
    if (cs === "article_longform" || !cs) return { primary_unified: "article", surface: cs || "article_longform" };
    return { primary_unified: "article", surface: cs };
  }
  if (lp === "Tool / Calculator") {
    return { primary_unified: "article", surface: cs || "tool_interactive" };
  }

  if (lp === "Collection / Bestlist") {
    return { primary_unified: "bestlist", surface: cs || "listicle_collection" };
  }

  if (lp === "Product Page") {
    if (cs === "pdp_single_sku") return { primary_unified: "product_page", surface: "pdp_single_sku" };
    // 口径统一：Product Page 仅映射为单品详情；列表/店铺应由 Collection / Bestlist 承接
    return { primary_unified: "product_page", surface: "pdp_single_sku" };
  }

  return { primary_unified: "article", surface: "unspecified" };
}
