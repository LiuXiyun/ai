import { mapLegacyToUnifiedAsset } from "./mapLegacyAsset";
import { countStrongDomains, computeViabilityEngine } from "./rules/viability";
import { selectCompetitors } from "./rules/competitors";
import { buildKeywordBuckets } from "./rules/keywordBuckets";
import { buildBranchPayload } from "./branchPayloads";

/** 在 Layer5 完成后组装：统一路由 + 规则引擎 + 分资产生成指令（供下游严格 JSON 消费） */
export function buildUnifiedEngineOutput(params: {
  keyword: string;
  layer1: Record<string, unknown>;
  layer2: Record<string, unknown>;
  layer3: Record<string, unknown>;
  layer4: Record<string, unknown>;
  controlSignals: Record<string, unknown>;
}): Record<string, unknown> {
  const keyword = params.keyword.trim();
  const primaryAsset =
    (params.layer3?.decision as { primaryAsset?: string } | undefined)?.primaryAsset ?? "Article / Guide";
  const gran = params.layer3?.contentGranularity as { canonicalSurface?: string } | undefined;
  const canonicalSurface = (gran?.canonicalSurface ?? "").trim();
  const mapped = mapLegacyToUnifiedAsset({
    legacyPrimary: primaryAsset,
    canonicalSurface,
  });

  const organicRows =
    (params.layer1?.organicResults as Array<{
      rank: number;
      url: string;
      domain: string;
      title: string;
      description?: string;
      contentSummary?: { wordCount?: number; hasFAQ?: boolean; hasTable?: boolean };
      contentFetchError?: string;
    }>) ?? [];

  const domains = organicRows.map((r) => (r.domain ?? "").toLowerCase()).filter(Boolean);
  const strongHits = countStrongDomains(domains);
  const withSummary = organicRows.filter((r) => r.contentSummary && !r.contentFetchError);
  const fetchOkRatio = organicRows.length ? withSummary.length / organicRows.length : 0;

  const vg = params.layer2?.viabilityGate as { canProceed?: boolean; score?: number } | undefined;
  const intentSplitObj = params.layer2?.intentSplit as { isSplit?: boolean } | undefined;
  const intentSplit = Boolean(intentSplitObj?.isSplit);

  const viability = computeViabilityEngine({
    legacyCanProceed: vg?.canProceed !== false,
    legacyScore: typeof vg?.score === "number" ? vg.score : 50,
    strongDomainHits: strongHits,
    intentSplit,
    fetchOkRatio,
  });

  const organicInput = organicRows.map((r) => ({
    rank: r.rank,
    url: r.url,
    domain: r.domain,
    title: r.title,
    description: r.description,
    contentSummary: r.contentSummary,
    contentFetchError: r.contentFetchError,
  }));

  const competitorSelection = selectCompetitors(organicInput, 5);
  const paa = (params.layer1?.paaQuestions as string[]) ?? [];
  const related = (params.layer1?.relatedKeywords as string[]) ?? [];
  const keywordBuckets = buildKeywordBuckets({ keyword, paaQuestions: paa, relatedKeywords: related });

  const strategist = params.layer4?.primaryStrategist as Record<string, unknown> | undefined;
  const branchPayload = buildBranchPayload({
    asset: mapped.primary_unified,
    keyword,
    strategist,
    controlSignals: params.controlSignals,
  });

  const routing =
    (params.layer3?.contentFormRouting as Record<string, unknown> | undefined) ?? {};

  return {
    schema_version: "2026-04-23",
    keyword,
    legacy: { primary_asset: primaryAsset, canonical_surface: canonicalSurface || null },
    unified_routing: {
      primary_unified: mapped.primary_unified,
      surface: mapped.surface,
      content_form_routing_snapshot: routing,
    },
    viability_engine: {
      ...viability,
      legacy_viability_gate: params.layer2?.viabilityGate ?? null,
    },
    competitor_engine: competitorSelection,
    keyword_buckets: keywordBuckets,
    branch_payload: branchPayload,
    meta: {
      generated_by: "unified_competition_engine",
      notes:
        "程序确定性合并 Layer1–5 与 controlSignals；branch_payload.field_roles 标注各块应由内容/结构/SEO/转化哪类生成器消费。",
    },
  };
}
