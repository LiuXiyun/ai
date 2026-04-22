import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    productId?: string;
    contentId?: string;
    platform?: "twitter" | "reddit" | "blog" | "site" | "all";
  };

  if (!body.productId || !body.platform) {
    return NextResponse.json(
      { error: "productId and platform are required" },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
  });
  if (!product) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  const content = body.contentId
    ? await prisma.content.findUnique({ where: { id: body.contentId } })
    : null;

  const platforms =
    body.platform === "all"
      ? (["twitter", "reddit", "blog", "site"] as const)
      : ([body.platform] as const);

  const posts = await prisma.$transaction(
    platforms.map((p) =>
      prisma.post.create({
        data: {
          productId: product.id,
          platform: p,
          contentId: body.contentId ?? null,
          contentSnapshot: content?.content ?? null,
          imageUrl: content?.imageUrl ?? null,
          status: "published",
        },
      }),
    ),
  );

  // MVP: 模拟“发布后带来 AI 曝光增长”
  const bump = {
    chatgpt: randInt(0, 2),
    perplexity: randInt(0, 2),
    gemini: randInt(0, 2),
  };

  // MVP: 模拟“曝光 -> 访问 -> 成交”
  const uvBump = randInt(5, 60);
  const basePrice = typeof product.price === "number" ? product.price : 20;
  const orders = randInt(0, Math.max(0, Math.floor(uvBump / 30)));
  const gmvBump = Number((orders * basePrice * randFloat(0.9, 1.2)).toFixed(2));

  await prisma.$transaction([
    prisma.product.update({
      where: { id: product.id },
      data: {
        uv: { increment: uvBump },
        gmv: { increment: gmvBump },
      },
    }),
    prisma.mention.upsert({
      where: { productId_aiSource: { productId: product.id, aiSource: "chatgpt" } },
      create: { productId: product.id, aiSource: "chatgpt", count: bump.chatgpt },
      update: { count: { increment: bump.chatgpt } },
    }),
    prisma.mention.upsert({
      where: {
        productId_aiSource: { productId: product.id, aiSource: "perplexity" },
      },
      create: {
        productId: product.id,
        aiSource: "perplexity",
        count: bump.perplexity,
      },
      update: { count: { increment: bump.perplexity } },
    }),
    prisma.mention.upsert({
      where: { productId_aiSource: { productId: product.id, aiSource: "gemini" } },
      create: { productId: product.id, aiSource: "gemini", count: bump.gemini },
      update: { count: { increment: bump.gemini } },
    }),
  ]);

  return NextResponse.json({
    status: "published",
    posts,
    publishedPlatforms: platforms,
    kpiBump: { exposure: bump, uv: uvBump, gmv: gmvBump },
  });
}

