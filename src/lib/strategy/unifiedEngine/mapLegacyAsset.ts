import type { ConsumerProfile, UnifiedAsset } from "./types";

/** 将 strategy-v2 的 legacy primary + 细分 surface 映射为统一资产 ID */
export function mapLegacyToUnifiedAsset(params: {
  legacyPrimary: string;
  canonicalSurface?: string;
  consumerProfile: ConsumerProfile;
}): { primary_unified: UnifiedAsset; surface: string } {
  const lp = (params.legacyPrimary ?? "").trim();
  const cs = (params.canonicalSurface ?? "").trim();
  const cp = params.consumerProfile;

  if (lp === "QA / FAQ Page") return { primary_unified: "qa_page", surface: cs || "qa_faq_hub" };
  if (lp === "Comparison Page") return { primary_unified: "comparison_page", surface: cs || "comparison_page" };
  if (lp === "Article / Guide") {
    if (cs === "article_longform" || !cs) return { primary_unified: "article", surface: cs || "article_longform" };
    return { primary_unified: "article", surface: cs };
  }
  if (lp === "Tool / Calculator") {
    return { primary_unified: cp === "dhgate_commerce" ? "support_article" : "article", surface: cs || "tool_interactive" };
  }

  if (lp === "Collection / Bestlist") {
    if (cp === "dhgate_commerce") return { primary_unified: "collection_page", surface: cs || "listicle_collection" };
    return { primary_unified: "bestlist", surface: cs || "listicle_collection" };
  }

  if (lp === "Product Page") {
    if (cs === "pdp_single_sku") return { primary_unified: "product_page", surface: "pdp_single_sku" };
    if (cs === "plp_category_or_search") return { primary_unified: "category_page", surface: "plp_category_or_search" };
    if (cs === "store_brand_hub") return { primary_unified: "collection_page", surface: "store_brand_hub" };
    if (cp === "dhgate_commerce")
      return { primary_unified: "category_page", surface: cs || "plp_category_or_search" };
    return { primary_unified: "product_page", surface: cs || "unspecified" };
  }

  return { primary_unified: "article", surface: "unspecified" };
}
