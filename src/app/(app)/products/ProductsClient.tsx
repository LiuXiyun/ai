"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

type Product = {
  id: string;
  name: string;
  platform: string;
  url?: string | null;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  createdAt?: string;
};

export function ProductsClient() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    platform: "DHgate",
    url: "",
    description: "",
    category: "",
    price: "",
  });

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const json = (await res.json()) as { items: Product[] };
      setItems(json.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          platform: form.platform,
          url: form.url || undefined,
          description: form.description || undefined,
          category: form.category || undefined,
          price: form.price ? Number(form.price) : undefined,
        }),
      });
      setForm({
        name: "",
        platform: "DHgate",
        url: "",
        description: "",
        category: "",
        price: "",
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Add Product
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              MVP 先支持手动填写；URL 自动抓取后续再加。
            </div>
          </div>
          <Button onClick={onSubmit} disabled={!canSubmit || loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <div className="text-xs font-medium text-zinc-700">
              Product Name *
            </div>
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Solar Garden Lights"
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs font-medium text-zinc-700">Platform</div>
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={form.platform}
              onChange={(e) =>
                setForm((p) => ({ ...p, platform: e.target.value }))
              }
            >
              <option value="DHgate">DHgate</option>
              <option value="Amazon">Amazon</option>
              <option value="Alibaba">Alibaba</option>
              <option value="Independent">Independent</option>
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <div className="text-xs font-medium text-zinc-700">Product URL</div>
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://dhgate.com/product/xxxx"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <div className="text-xs font-medium text-zinc-700">
              Product Description
            </div>
            <textarea
              className="min-h-[90px] w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Waterproof, 120 LEDs, dusk-to-dawn activation..."
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs font-medium text-zinc-700">Category</div>
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
              placeholder="Outdoor Lighting"
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs font-medium text-zinc-700">Price</div>
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={form.price}
              onChange={(e) =>
                setForm((p) => ({ ...p, price: e.target.value }))
              }
              placeholder="19.99"
              inputMode="decimal"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="text-sm font-semibold text-zinc-900">Products</div>
          <div className="mt-1 text-sm text-zinc-500">
            当前共有 {items.length} 个商品
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Platform</th>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-left">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-900">
                    {p.name}
                  </td>
                  <td className="px-5 py-3 text-zinc-700">{p.platform}</td>
                  <td className="px-5 py-3 text-zinc-700">
                    {p.category ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-zinc-700">
                    {typeof p.price === "number" ? `$${p.price}` : "-"}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-zinc-500"
                    colSpan={4}
                  >
                    还没有商品。先在上面填写并保存一个商品吧。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

