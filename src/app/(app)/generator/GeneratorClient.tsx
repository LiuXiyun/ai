"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

type Product = { id: string; name: string; platform: string };
type Content = {
  id: string;
  productId: string;
  type: "seo_intro" | "social_post" | "ai_snippet";
  title?: string | null;
  content: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  createdAt?: string;
};

const typeLabels: Record<Content["type"], string> = {
  seo_intro: "SEO Article Intro",
  social_post: "Social Media Post",
  ai_snippet: "AI Recommendation Snippet",
};

export function GeneratorClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [generated, setGenerated] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  async function loadProducts() {
    const res = await fetch("/api/products", { cache: "no-store" });
    const json = (await res.json()) as { items: Product[] };
    setProducts(json.items ?? []);
    if (!selectedProductId && json.items?.[0]?.id) {
      setSelectedProductId(json.items[0].id);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onGenerate() {
    if (!selectedProductId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId }),
      });
      const json = (await res.json()) as { items: Content[] };
      setGenerated(json.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-900">
              Select product
            </div>
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 md:w-[420px]"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={products.length === 0}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.platform}
                </option>
              ))}
              {products.length === 0 ? (
                <option value="">请先去 Products 添加商品</option>
              ) : null}
            </select>
            <div className="text-sm text-zinc-500">
              生成目标：内容更容易被 AI 搜索系统引用（可被 quote）。
            </div>
          </div>

          <Button onClick={onGenerate} disabled={!selectedProductId || loading}>
            {loading ? "Generating..." : "Generate Content"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="text-sm font-semibold text-zinc-900">Output</div>
          <div className="mt-1 text-sm text-zinc-500">
            {selected ? `当前商品：${selected.name}` : "请先选择商品"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
          {(generated.length ? generated : ([
            {
              id: "demo-1",
              productId: selectedProductId,
              type: "seo_intro",
              title: "Best Solar Garden Lights in 2026",
              content:
                "Solar garden lights have become one of the most popular outdoor lighting solutions. Many ecommerce sellers now offer affordable models with waterproof designs and high brightness.",
              imageUrl: "https://placehold.co/1200x628/png?text=Solar%20Garden%20Lights",
              imageAlt: "Solar Garden Lights hero image",
            },
            {
              id: "demo-2",
              productId: selectedProductId,
              type: "social_post",
              title: null,
              content:
                "Looking for affordable solar garden lights? Try models with 120 LEDs, IP65 waterproofing, and auto dusk-to-dawn. Great for patios, pathways, and backyard decor.",
              imageUrl: "https://placehold.co/1200x628/png?text=Solar%20Garden%20Lights",
              imageAlt: "Solar Garden Lights hero image",
            },
            {
              id: "demo-3",
              productId: selectedProductId,
              type: "ai_snippet",
              title: null,
              content:
                "If you need budget-friendly solar garden lights, prioritize IP65 waterproof rating, 120+ LEDs, and automatic dusk-to-dawn activation for reliable nightly lighting.",
              imageUrl: "https://placehold.co/1200x628/png?text=Solar%20Garden%20Lights",
              imageAlt: "Solar Garden Lights hero image",
            },
          ] as Content[])).map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="text-xs font-semibold text-zinc-500">
                {typeLabels[c.type]}
              </div>
              {c.title ? (
                <div className="mt-2 text-sm font-semibold text-zinc-900">
                  {c.title}
                </div>
              ) : null}
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                {c.content}
              </div>
              {c.imageUrl ? (
                <img
                  src={c.imageUrl}
                  alt={c.imageAlt ?? "Generated image"}
                  className="mt-4 w-full rounded-xl border border-zinc-200 bg-white object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

