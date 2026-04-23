import type { UnifiedAsset } from "./types";

function toMustBlocksFromStrings(ids: string[], strings: string[]) {
  return strings.filter(Boolean).map((text, i) => ({
    id: ids[i] ?? `block_${i}`,
    intent_tag: "cover",
    min_words: 80,
    max_words: 400,
    required_entities: [] as string[],
    text_seed: text,
  }));
}

/** 将 GPT controlSignals + strategist 压成「程序可执行」must_blocks / 规则字段 */
export function buildBranchPayload(params: {
  asset: UnifiedAsset;
  keyword: string;
  strategist: Record<string, unknown> | null | undefined;
  controlSignals: Record<string, unknown> | null | undefined;
}): Record<string, unknown> {
  const kw = params.keyword;
  const st = params.strategist ?? {};
  const cs = params.controlSignals ?? {};
  const mustWrite = (cs.mustWrite as string[] | undefined) ?? [];
  const mustCover = (st.mustCover as string[] | undefined) ?? [];
  const structure = (st.structure as string[] | undefined) ?? [];
  const gaps = (cs.gaps as string[] | undefined) ?? [];
  const seoControls = (cs.seoControls as string[] | undefined) ?? (st.seoSignals as string[] | undefined) ?? [];

  const baseReason = (cs as { reason_codes?: string[] }).reason_codes ?? ["MERGED_FROM_L4_L5"];

  const mergeMust = [
    ...toMustBlocksFromStrings(
      mustCover.map((_, i) => `must_cover_${i}`),
      mustCover,
    ),
    ...toMustBlocksFromStrings(
      mustWrite.map((_, i) => `must_write_${i}`),
      mustWrite,
    ),
  ];

  const commonSeo = {
    title_pattern_id: "TPL_FROM_CONTROL",
    meta_must_terms: [kw],
    schema_org: [] as string[],
    internal_link_slots: 4,
    raw_seo_controls: seoControls,
  };

  const commonConversion = {
    conversion_blocks: [
      { id: "primary_soft_cta", type: "related_hub", position: "end", max_count: 1 },
    ] as Array<Record<string, unknown>>,
    friction_points: gaps.slice(0, 3).map((g, i) => ({
      id: `gap_${i}`,
      mitigation_block: "address_in_section",
      signal: g,
    })),
  };

  switch (params.asset) {
    case "article":
    case "guide":
      return {
        page_goal: "inform",
        primary_job_to_be_done: "JTBD_EXPLAIN_TOPIC",
        must_blocks: mergeMust.length ? mergeMust : [{ id: "body", intent_tag: "explain", min_words: 400, max_words: 2500, required_entities: [kw], text_seed: kw }],
        layout_control: {
          document_subtype: params.asset === "guide" ? "guide" : "explainer",
          section_order: ["intro", "problem", "framework", "steps", "mistakes", "faq"],
          max_h2: 9,
          fold_depth_target: 2,
          tool_first: params.asset === "article" && structure.some((s) => /tool|calculator/i.test(s)),
        },
        intro_rule: { type: "direct_answer_first", first_screen_chars_max: 360, must_contain_keyword: true },
        faq_targets: [],
        seo: { ...commonSeo, schema_org: ["Article", "FAQPage"] },
        ...commonConversion,
        reason_codes: baseReason,
        field_roles: {
          content: ["must_blocks[].text_seed", "primary_job_to_be_done"],
          structure: ["layout_control", "intro_rule", "must_blocks[].min_words"],
          seo: ["seo"],
          conversion: ["conversion_blocks", "friction_points"],
        },
      };

    case "qa_page":
      return {
        page_goal: "answer_paa_cluster",
        must_blocks: mergeMust,
        layout_control: { format: "accordion", max_qa_pairs: 12, snippet_first: true },
        intro_rule: { type: "none", first_screen_chars_max: 0, must_contain_keyword: true },
        faq_targets: mustWrite.slice(0, 10).map((q, i) => ({
          question_id: `Q_GEN_${i}`,
          source: "control",
          answer_min_words: 45,
          answer_max_words: 95,
          link_out_allowed: false,
          question_text: q,
        })),
        seo: { ...commonSeo, schema_org: ["FAQPage"], capture_featured_snippet: true },
        ...commonConversion,
        reason_codes: baseReason,
        field_roles: {
          content: ["faq_targets", "must_blocks"],
          structure: ["layout_control"],
          seo: ["seo"],
          conversion: ["conversion_blocks"],
        },
      };

    case "bestlist":
    case "collection_page":
      return {
        page_goal: "compare_options",
        must_blocks: mergeMust,
        layout_control: {
          list_subtype: params.asset === "collection_page" ? "category_grid" : "ranked_grid",
          min_items: 8,
          verdict_block: "required",
          section_order: ["hook", "methodology", "items", "verdict_table", "faq"],
        },
        comparison_dimensions: ["价格带", "适用场景", "优缺点", "适合人群"],
        intro_rule: { type: "promise_outcome_first", first_screen_chars_max: 280, must_contain_keyword: true },
        faq_targets: [],
        seo: { ...commonSeo, schema_org: ["ItemList", "FAQPage"] },
        conversion_blocks: [
          { id: "grid_primary_cta", type: "view_collection", position: "sticky_bar", max_count: 1 },
        ],
        friction_points: commonConversion.friction_points,
        reason_codes: baseReason,
        field_roles: {
          content: ["must_blocks", "comparison_dimensions"],
          structure: ["layout_control"],
          seo: ["seo"],
          conversion: ["conversion_blocks", "friction_points"],
        },
      };

    case "comparison_page":
      return {
        page_goal: "decide_between_options",
        must_blocks: mergeMust,
        layout_control: {
          matrix_shape: "rows=options_cols=dimensions",
          max_options: 5,
          verdict_block: "required",
        },
        comparison_dimensions: ["维度A", "维度B", "维度C", "售后/风险"],
        intro_rule: { type: "verdict_teaser_first", first_screen_chars_max: 220, must_contain_keyword: true },
        faq_targets: [],
        seo: { ...commonSeo, schema_org: ["FAQPage"] },
        conversion_blocks: [{ id: "option_row_cta", type: "sku_or_collection", per_row: true, max_per_row: 1 }],
        friction_points: commonConversion.friction_points,
        reason_codes: baseReason,
        field_roles: {
          content: ["must_blocks", "comparison_dimensions"],
          structure: ["layout_control"],
          seo: ["seo"],
          conversion: ["conversion_blocks", "friction_points"],
        },
      };

    case "product_page":
      return {
        page_goal: "convert_sku",
        must_blocks: mergeMust,
        layout_control: {
          above_fold_blocks: ["gallery", "title_price", "trust_row", "sku_selector", "primary_cta"],
          sticky: ["cta"],
        },
        intro_rule: { type: "sku_first", first_screen_chars_max: 200, must_contain_keyword: true },
        faq_targets: [],
        seo: { ...commonSeo, schema_org: ["Product", "Offer", "FAQPage"] },
        conversion_blocks: [{ id: "primary_buy", type: "add_to_cart", position: "above_fold", count: 1 }],
        friction_points: commonConversion.friction_points,
        reason_codes: baseReason,
        field_roles: {
          content: ["must_blocks"],
          structure: ["layout_control", "intro_rule"],
          seo: ["seo"],
          conversion: ["conversion_blocks", "friction_points"],
        },
      };

    case "category_page":
      return {
        page_goal: "browse_and_filter",
        must_blocks: mergeMust,
        layout_control: {
          facets_required: true,
          grid_min_items: 12,
          breadcrumb_depth_min: 2,
          sort_controls: ["price", "sales", "rating"],
        },
        intro_rule: { type: "category_context", first_screen_chars_max: 240, must_contain_keyword: true },
        faq_targets: [],
        seo: { ...commonSeo, schema_org: ["CollectionPage", "BreadcrumbList"] },
        conversion_blocks: [{ id: "plp_primary", type: "filter_apply", position: "sidebar", max_count: 1 }],
        friction_points: commonConversion.friction_points,
        reason_codes: baseReason,
        field_roles: {
          content: ["must_blocks"],
          structure: ["layout_control"],
          seo: ["seo"],
          conversion: ["conversion_blocks"],
        },
      };

    case "support_article":
      return {
        page_goal: "trust_and_education",
        must_blocks: mergeMust,
        layout_control: { document_subtype: "support_longform", max_h2: 6 },
        intro_rule: { type: "problem_led", first_screen_chars_max: 300, must_contain_keyword: true },
        faq_targets: [],
        seo: { ...commonSeo, schema_org: ["Article"] },
        ...commonConversion,
        reason_codes: baseReason,
        field_roles: {
          content: ["must_blocks"],
          structure: ["layout_control", "intro_rule"],
          seo: ["seo"],
          conversion: ["conversion_blocks"],
        },
      };

    default:
      return {
        page_goal: "inform",
        must_blocks: mergeMust,
        layout_control: { document_subtype: "generic", max_h2: 8 },
        intro_rule: { type: "direct_answer_first", first_screen_chars_max: 320, must_contain_keyword: true },
        faq_targets: [],
        seo: commonSeo,
        ...commonConversion,
        reason_codes: [...baseReason, "FALLBACK_ASSET_BRANCH"],
        field_roles: { content: ["must_blocks"], structure: ["layout_control"], seo: ["seo"], conversion: ["conversion_blocks"] },
      };
  }
}
