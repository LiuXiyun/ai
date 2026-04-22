import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SitePostPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post || post.platform !== "site") notFound();

  // MVP: 访问独立站落地页视为一次产品 UV
  await prisma.product.update({
    where: { id: post.productId },
    data: { uv: { increment: 1 } },
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/site"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          ← Back to Site
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-900">
          Independent Site Post
        </h1>
        <div className="mt-2 text-sm text-zinc-500">
          id: {post.id} · created: {post.createdAt.toISOString()}
        </div>

        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt="Hero"
            className="mt-8 w-full rounded-2xl border border-zinc-200 object-cover"
          />
        ) : null}

        <article className="prose prose-zinc mt-8 max-w-none">
          <p style={{ whiteSpace: "pre-wrap" }}>
            {post.contentSnapshot ?? ""}
          </p>
        </article>
      </div>
    </div>
  );
}

