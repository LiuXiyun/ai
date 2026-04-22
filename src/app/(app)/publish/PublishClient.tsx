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
};
type Post = {
  id: string;
  platform: "twitter" | "reddit" | "blog" | "site";
  status: "published" | "failed" | "queued";
  createdAt?: string;
};

const platformLabels: Record<Post["platform"], string> = {
  twitter: "Twitter",
  reddit: "Reddit",
  blog: "Blog",
  site: "Site",
};

export function PublishClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedContentId, setSelectedContentId] = useState("");
  const [platform, setPlatform] = useState<Post["platform"]>("twitter");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedContent = useMemo(
    () => contents.find((c) => c.id === selectedContentId) ?? null,
    [contents, selectedContentId],
  );

  async function loadProducts() {
    const res = await fetch("/api/products", { cache: "no-store" });
    const json = (await res.json()) as { items: Product[] };
    setProducts(json.items ?? []);
    if (!selectedProductId && json.items?.[0]?.id) {
      setSelectedProductId(json.items[0].id);
    }
  }

  async function loadContents(productId: string) {
    if (!productId) {
      setContents([]);
      setSelectedContentId("");
      return;
    }
    const res = await fetch(`/api/contents?productId=${productId}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as { items: Content[] };
    setContents(json.items ?? []);
    if (!selectedContentId && json.items?.[0]?.id) {
      setSelectedContentId(json.items[0].id);
    }
  }

  async function loadPosts(productId: string) {
    if (!productId) {
      setPosts([]);
      return;
    }
    const res = await fetch(`/api/posts?productId=${productId}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as { items: Post[] };
    setPosts(json.items ?? []);
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadContents(selectedProductId);
    loadPosts(selectedProductId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  async function onPublish() {
    if (!selectedProductId || !selectedContentId) return;
    setLoading(true);
    try {
      await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          contentId: selectedContentId,
          platform,
        }),
      });
      await loadPosts(selectedProductId);
    } finally {
      setLoading(false);
    }
  }

  async function onPublishAll() {
    if (!selectedProductId || !selectedContentId) return;
    setLoading(true);
    try {
      await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          contentId: selectedContentId,
          platform: "all",
        }),
      });
      await loadPosts(selectedProductId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <div className="text-xs font-medium text-zinc-700">Product</div>
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
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
          </label>

          <label className="space-y-1">
            <div className="text-xs font-medium text-zinc-700">Platform</div>
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Post["platform"])}
            >
              <option value="twitter">Twitter</option>
              <option value="reddit">Reddit</option>
              <option value="blog">Blog</option>
              <option value="site">Site</option>
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <div className="text-xs font-medium text-zinc-700">Content</div>
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={selectedContentId}
              onChange={(e) => setSelectedContentId(e.target.value)}
              disabled={contents.length === 0}
            >
              {contents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type} · {c.title ?? c.content.slice(0, 42)}
                </option>
              ))}
              {contents.length === 0 ? (
                <option value="">
                  还没有生成内容，请先去 Generator 生成
                </option>
              ) : null}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-500">
            MVP 发布是“记录发布动作 + 状态”，并支持一键发布到所有渠道。
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={onPublishAll}
              disabled={!selectedProductId || !selectedContentId || loading}
            >
              {loading ? "Publishing..." : "Publish All"}
            </Button>
            <Button
              onClick={onPublish}
              disabled={!selectedProductId || !selectedContentId || loading}
            >
              {loading
                ? "Publishing..."
                : `Publish to ${platformLabels[platform]}`}
            </Button>
          </div>
        </div>

        {selectedContent ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-500">Preview</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
              {selectedContent.content}
            </div>
            {selectedContent.imageUrl ? (
              <img
                src={selectedContent.imageUrl}
                alt={selectedContent.imageAlt ?? "Generated image"}
                className="mt-4 w-full rounded-xl border border-zinc-200 bg-white object-cover"
              />
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="text-sm font-semibold text-zinc-900">
            Publish history
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            当前商品发布记录：{posts.length} 条
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-5 py-3 text-left">Platform</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-900">
                    {platformLabels[p.platform]}
                  </td>
                  <td className="px-5 py-3 text-zinc-700">{p.status}</td>
                </tr>
              ))}
              {posts.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-zinc-500"
                    colSpan={2}
                  >
                    暂无发布记录。选择内容并点击 Publish 试试。
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

