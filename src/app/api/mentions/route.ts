import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json(
      { error: "productId is required" },
      { status: 400 },
    );
  }

  const rows = await prisma.mention.findMany({ where: { productId } });

  const bySource = new Map(rows.map((r) => [r.aiSource, r.count]));

  const chatgpt = bySource.get("chatgpt") ?? 4;
  const perplexity = bySource.get("perplexity") ?? 3;
  const gemini = bySource.get("gemini") ?? 2;

  return NextResponse.json({ chatgpt, perplexity, gemini });
}

