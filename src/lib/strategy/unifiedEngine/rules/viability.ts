import type { ViabilityAction } from "../types";

const STRONG = [
  "wikipedia.org",
  "amazon.com",
  "zhihu.com",
  "baidu.com",
  "quora.com",
  "reddit.com",
  "medium.com",
  "nih.gov",
  "healthline.com",
  "forbes.com",
  "nytimes.com",
  "google.com",
  "walmart.com",
  "ebay.com",
  "aliexpress.com",
  "dhgate.com",
];

export function countStrongDomains(domains: string[]): number {
  return domains.filter((d) => STRONG.some((s) => d.includes(s))).length;
}

export function computeViabilityEngine(input: {
  legacyCanProceed: boolean;
  legacyScore: number;
  strongDomainHits: number;
  intentSplit: boolean;
  fetchOkRatio: number;
}): {
  action: ViabilityAction;
  score: number;
  reason_codes: string[];
  gates: Array<{ id: string; pass: boolean; detail: Record<string, unknown> }>;
} {
  const gates: Array<{ id: string; pass: boolean; detail: Record<string, unknown> }> = [];
  const reason_codes: string[] = [];

  const authPass = input.strongDomainHits < 7;
  gates.push({
    id: "authority_saturation",
    pass: authPass,
    detail: { strong_domain_hits: input.strongDomainHits },
  });
  if (!authPass) reason_codes.push("AUTHORITY_SATURATION");

  const fetchPass = input.fetchOkRatio >= 0.35;
  gates.push({
    id: "evidence_density",
    pass: fetchPass,
    detail: { fetch_ok_ratio: Math.round(input.fetchOkRatio * 100) / 100 },
  });
  if (!fetchPass) reason_codes.push("FETCH_SPARSE");

  const intentPass = !input.intentSplit || input.legacyScore >= 55;
  gates.push({
    id: "intent_coherence",
    pass: intentPass,
    detail: { intent_split: input.intentSplit },
  });
  if (input.intentSplit) reason_codes.push("INTENT_SPLIT_PRESENT");

  let action: ViabilityAction = "proceed";
  if (!input.legacyCanProceed || input.strongDomainHits >= 8) {
    action = "skip";
    reason_codes.push("LEGACY_BLOCK_OR_HARD_AUTHORITY");
  } else if (!fetchPass) {
    action = "proceed_with_low_evidence";
    reason_codes.push("LOW_EVIDENCE_MODE");
  } else if (input.intentSplit && input.legacyScore < 70) {
    action = "expand";
    reason_codes.push("INTENT_SPLIT_EXPAND_KEYWORDS");
  }

  return {
    action,
    score: Math.max(0, Math.min(100, input.legacyScore)),
    reason_codes: [...new Set(reason_codes)],
    gates,
  };
}
