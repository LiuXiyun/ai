/**
 * 拉取落地页 HTML，抽取用于竞品对比的结构化信号（非全文存档）。
 * 与 `/strategy`、`/strategy-v2` 共用。
 */
export type PageContentSummary = {
  wordCount: number;
  headings: string[];
  metaDescription: string;
  imageCount: number;
  hasFAQ: boolean;
  hasTable: boolean;
  hasVideo: boolean;
};

export async function fetchPageContentSummary(url: string): Promise<PageContentSummary> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  const metaDescMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
  );
  const metaDescription = metaDescMatch?.[1] ?? "";

  const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
  const headings: string[] = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, "").trim();
    if (text) headings.push(text);
  }

  const imageMatches = html.match(/<img[^>]*>/gi);
  const imageCount = imageMatches?.length ?? 0;

  const hasFAQ = /faq|frequently asked question|常见问题|常见问题解答/i.test(html);
  const hasTable = /<table/i.test(html);
  const hasVideo =
    /<iframe[^>]*(youtube|vimeo)|<video|<source[^>]*type=["']video/i.test(html);

  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = textContent.split(/\s+/).filter((w) => w.length > 0).length;

  return {
    wordCount,
    headings: headings.slice(0, 20),
    metaDescription,
    imageCount,
    hasFAQ,
    hasTable,
    hasVideo,
  };
}
