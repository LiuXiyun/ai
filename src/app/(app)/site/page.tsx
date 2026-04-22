import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";

export default async function SitePage() {
  const posts = await prisma.post.findMany({
    where: { platform: "site", status: "published" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <Topbar title="Site (Independent)" />
      <main className="flex-1 p-6">
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-4">
            <div className="text-sm font-semibold text-zinc-900">
              Published pages
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              这里展示“一键发布到独立站”的内容（本应用内置的 demo 独立站）。
            </div>
          </div>

          <div className="divide-y divide-zinc-200">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/site/${p.id}`}
                className="block px-5 py-4 hover:bg-zinc-50"
              >
                <div className="text-sm font-semibold text-zinc-900">
                  Site post · {p.id.slice(0, 8)}
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-zinc-600">
                  {p.contentSnapshot ?? "(no snapshot)"}
                </div>
              </Link>
            ))}
            {posts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">
                还没有 site 发布内容。去 Publish 选择 “Publish All” 或选择平台
                “Site” 发布一条试试。
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}

