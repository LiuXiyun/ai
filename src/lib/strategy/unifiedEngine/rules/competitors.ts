import type { OrganicInput } from "../types";

export type CompetitorSelection = {
  strategy: string;
  n: number;
  selected_ranks: number[];
  filters_applied: string[];
  groups: Array<{ id: string; member_ranks: number[]; pattern: string }>;
};

function urlPattern(url: string): string {
  const u = url.toLowerCase();
  if (/\/item\/|\/p\/|\/product\/|\.html\?|sku=|spu=/i.test(u)) return "pdp_like";
  if (/\/c\/|\/category\/|\/cat\/|\/list\/|search|s\?k=/i.test(u)) return "plp_like";
  if (/shop\.|store\.|flagship|旗舰店/i.test(u)) return "store_like";
  return "editorial_like";
}

/** TopN + 同域上限 + 优先抓取成功 */
export function selectCompetitors(organic: OrganicInput[], n = 5): CompetitorSelection {
  const sorted = [...organic].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const filters: string[] = ["TOP_N_ORDERED"];
  const selected: OrganicInput[] = [];
  const domainCount = new Map<string, number>();

  for (const row of sorted) {
    if (selected.length >= n) break;
    const d = row.domain || "";
    const c = domainCount.get(d) ?? 0;
    const ok = row.contentSummary && !row.contentFetchError;
    if (c >= 2) continue;
    if (!ok && selected.filter((s) => s.contentSummary).length < 2) {
      selected.push(row);
      domainCount.set(d, c + 1);
      continue;
    }
    if (ok || selected.length < n) {
      selected.push(row);
      domainCount.set(d, c + 1);
    }
  }

  if (selected.filter((s) => s.contentSummary).length < 3) filters.push("RELAX_FETCH_FILTER");

  const selected_ranks = selected.map((s) => s.rank);
  const patternMap = new Map<string, number[]>();
  for (const row of selected) {
    const p = urlPattern(row.url);
    const arr = patternMap.get(p) ?? [];
    arr.push(row.rank);
    patternMap.set(p, arr);
  }
  const groups = [...patternMap.entries()].map(([pattern, ranks], i) => ({
    id: `g_${pattern}_${i}`,
    member_ranks: ranks.sort((a, b) => a - b),
    pattern,
  }));

  return {
    strategy: "top_n_with_fetch_ok_and_domain_cap",
    n,
    selected_ranks,
    filters_applied: filters,
    groups,
  };
}
