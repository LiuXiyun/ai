export type KeywordBuckets = {
  same_page_must: string[];
  same_page_optional: string[];
  support_page: string[];
  exclude: string[];
};

/** PAA → must；相关词 → optional；过长/无关 → exclude 占位规则 */
export function buildKeywordBuckets(input: {
  keyword: string;
  paaQuestions: string[];
  relatedKeywords: string[];
}): KeywordBuckets {
  const kw = input.keyword.trim();
  const must = (input.paaQuestions ?? []).slice(0, 5).filter(Boolean);
  const related = (input.relatedKeywords ?? [])
    .filter((k) => k && k !== kw && !must.includes(k))
    .slice(0, 8);
  const optional = related.slice(0, 5);
  const support = related.slice(5, 8);
  const exclude: string[] = [];
  if (kw.length < 2) exclude.push("__invalid_kw__");
  return {
    same_page_must: must,
    same_page_optional: optional,
    support_page: support,
    exclude,
  };
}
