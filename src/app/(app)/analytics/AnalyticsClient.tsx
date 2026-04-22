"use client";

import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; platform: string };
type Mentions = {
  chatgpt: number;
  perplexity: number;
  gemini: number;
};

export function AnalyticsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [mentions, setMentions] = useState<Mentions>({
    chatgpt: 4,
    perplexity: 3,
    gemini: 2,
  });

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

  async function loadMentions(productId: string) {
    if (!productId) return;
    const res = await fetch(`/api/mentions?productId=${productId}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as Mentions;
    setMentions(json);
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMentions(selectedProductId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Product</div>
        <div className="mt-2">
          <select
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 md:w-[520px]"
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
        </div>
        <div className="mt-2 text-sm text-zinc-500">
          {selected ? `当前商品：${selected.name}` : "请选择商品"}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">
          GEO Exposure (AI mentions)
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-500">ChatGPT</div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900">
              {mentions.chatgpt}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-500">Perplexity</div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900">
              {mentions.perplexity}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-500">Gemini</div>
            <div className="mt-2 text-3xl font-semibold text-zinc-900">
              {mentions.gemini}
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-zinc-500">
          MVP 阶段使用模拟数据；后续可接真实 GEO 监控（抓取/查询/引用追踪）。
        </div>
      </section>
    </div>
  );
}

