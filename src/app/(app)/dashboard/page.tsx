import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [productCount, contents, posts, mentionSum, uvSum, gmvSum, products] =
    await Promise.all([
      prisma.product.count(),
      prisma.content.count(),
      prisma.post.count(),
      prisma.mention.aggregate({ _sum: { count: true } }),
      prisma.product.aggregate({ _sum: { uv: true } }),
      prisma.product.aggregate({ _sum: { gmv: true } }),
      prisma.product.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, name: true, platform: true, uv: true, gmv: true },
      }),
    ]);

  const totalExposure = mentionSum._sum.count ?? 0;
  const totalUv = uvSum._sum.uv ?? 0;
  const totalGmv = gmvSum._sum.gmv ?? 0;

  const exposureByProduct = await prisma.mention.groupBy({
    by: ["productId"],
    _sum: { count: true },
  });
  const exposureMap = new Map(
    exposureByProduct.map((r) => [r.productId, r._sum.count ?? 0]),
  );

  const stats = [
    { label: "GEO Exposure", value: totalExposure, subtext: "AI mentions 总和" },
    { label: "Total UV", value: totalUv, subtext: "产品累计 UV" },
    {
      label: "Total GMV",
      value: `$${totalGmv.toFixed(2)}`,
      subtext: "产品累计 GMV",
    },
    { label: "Total Products", value: productCount, subtext: "当前商品数量" },
  ] as const;

  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              subtext={s.subtext}
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="text-sm font-semibold text-zinc-900">
              Product GEO performance
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              曝光（Exposure）= AI mentions 总和；UV/GMV 为 MVP 演示口径（可替换为真实数据源）。
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Exposure</th>
                    <th className="px-4 py-3 text-left">UV</th>
                    <th className="px-4 py-3 text-left">GMV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {products.map((p) => {
                    const exposure = exposureMap.get(p.id) ?? 0;
                    return (
                      <tr key={p.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-900">
                            {p.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {p.platform}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-900">
                          {exposure}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">{p.uv}</td>
                        <td className="px-4 py-3 text-zinc-700">
                          ${p.gmv.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-zinc-500"
                        colSpan={4}
                      >
                        还没有商品。先去 Products 添加一个商品，再生成并发布。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">
              Demo tips (3 minutes)
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
              <li>Products：添加一个商品</li>
              <li>Generator：一键生成文案 + 图片</li>
              <li>Publish：点击 Publish All</li>
              <li>Site：打开任意落地页（UV 会增加）</li>
              <li>Dashboard：看 Exposure / UV / GMV 变化</li>
            </ol>
            <div className="mt-4 text-sm text-zinc-500">
              说明：MVP 阶段 UV/GMV 为模拟增长，用于验证流程与看板形态。
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

